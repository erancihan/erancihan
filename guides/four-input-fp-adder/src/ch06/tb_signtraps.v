`timescale 1ns/1ps
`default_nettype none

// Chapter 6: the Verilog signedness traps, asserted.
//
// Every value below is a measured behavior of Icarus Verilog 13.0 at
// -g2012 -Wall, and compiling this file produces no warning of any kind -
// which is itself the chapter's point. Each trap is computed into a
// variable of the width the trap needs (widths matter: several of these
// change answer in a wider context), then asserted with a known-answer
// check. A testbench, not the compiler, is what catches this bug family.
module tb_signtraps;

  // One pattern, two contracts.
  reg        [7:0] u;                  // unsigned by default
  reg signed [7:0] s;                  // same bits, signed reading

  // Poisoning: sa, sb signed; u2 unsigned; r9 is 9 bits so the sum has room.
  reg signed [7:0] sa, sb;
  reg        [7:0] u2;
  reg signed [8:0] r9;
  reg        [7:0] r8u;
  reg signed [7:0] r8s;

  // Shifts.
  reg signed [7:0] s12, s13;
  reg        [7:0] u12;

  // Widening.
  reg signed [3:0] s4;
  reg        [3:0] u4;
  reg signed [7:0] w8s;
  reg        [7:0] w8u;

  // Part-selects and literals.
  reg        [15:0] w16;
  reg signed [15:0] w16s;

  // Multiplication width growth.
  reg signed [7:0]  m8;
  reg signed [15:0] pw;
  reg signed [7:0]  pn;

  // Loop counters.
  reg [3:0] i4;
  integer   i, n;

  // %d rendering.
  reg [8*4-1:0] str4;

  // Five bug classes in five continuous assignments. Compiled with
  // iverilog -g2012 -Wall: not one word about any line below.
  reg signed [7:0] es;                  // -3
  reg        [7:0] eu;                  // 2
  wire [7:0] mix    = es + eu;          // poisoned: es read as 253
  wire [7:0] prodl  = es * es;          // product computed at 8 bits
  wire [3:0] narrow = es + es;          // 8-bit sum truncated to 4
  wire       cmp    = es < eu;          // unsigned compare: -3 < 2 is 0
  wire [7:0] shft   = (es + eu) >>> 1;  // >>> degraded: the sum is unsigned

  integer errors;

  task chk(input [8*48-1:0] name, input [31:0] got, input [31:0] want);
    begin
      if (got !== want) begin
        errors = errors + 1;
        $display("FAIL tb_signtraps: %0s = %0d (%h), expected %0d (%h)",
                 name, $signed(got), got, $signed(want), want);
      end else
        $display("  ok %0s = %0d", name, $signed(got));
    end
  endtask

  initial begin : watchdog
    #100000;
    $display("FAIL tb_signtraps: timeout at %0t", $time);
    $fatal(1, "timeout");
  end

  initial begin
    errors = 0;

    // --- The declaration decides the reading, not the storage ------------
    u = 8'hfd;  s = -8'sd3;             // the same pattern, 11111101
    chk("u == s (comparison is on bits)",       u == s,        1);
    chk("$signed(u)  (cast, zero cost)",        $signed(u),   -3);
    chk("$unsigned(s)",                         $unsigned(s), 253);

    // --- One unsigned operand poisons the whole expression ---------------
    sa = -8'sd3;  sb = 8'sd2;  u2 = 8'd2;
    r9  = sa + sb;          chk("signed + signed into 9 bits",   r9,  -1);
    r9  = sa + u2;          chk("signed + UNSIGNED into 9 bits", r9, 255);
    r9  = sa + $signed(u2); chk("signed + $signed(u) (repaired)", r9, -1);
    chk("sa < sb (signed compare)",             sa < sb,       1);
    chk("sa < u  (POISONED: 253 < 2)",          sa < u2,       0);
    r8s = sa / sb;          chk("sa / sb",                    r8s,  -1);
    r8s = sa / u2;          chk("sa / u (poisoned: 253/2)",   r8s, 126);
    r8u = u2 * (-8'sd1);    chk("u * -8'sd1 (poisons a signed literal)",
                                r8u, 254);
    chk("200 > -8'sd1 (-1 became 255)",         8'd200 > -8'sd1, 0);

    // --- Shifts: only >>> is arithmetic, and only in a signed context ----
    s12 = -8'sd12;  u12 = s12;          // both hold 11110100
    r8s = s12 >>> 2;           chk("signed  >>> 2 (sign fills)",   r8s,  -3);
    r8s = s12 >> 2;            chk("signed  >>  2 (always logical)", r8s, 61);
    r8u = u12 >>> 2;           chk("unsigned >>> 2 (degrades)",    r8u,  61);
    r8s = $signed(u12) >>> 2;  chk("$signed(u) >>> 2 (repaired)",  r8s,  -3);
    r8s = (s12 + u12*0) >>> 2; chk("(s + u*0) >>> 2 (u*0 poisons)", r8s, 61);
    s13 = -8'sd13;
    r8s = s13 >>> 2;           chk("-13 >>> 2 (floor)",            r8s,  -4);
    r8s = s13 / 4;             chk("-13 /   4 (toward zero)",      r8s,  -3);

    // --- Widening extends by the RHS's signedness, not the LHS's ---------
    s4 = 4'b1101;  u4 = 4'b1101;        // -3 and 13
    w8s = s4;          chk("signed  -> signed  wide",           w8s,  -3);
    w8u = s4;          chk("signed  -> UNSIGNED wide (sign-extends anyway)",
                           w8u, 253);
    w8s = u4;          chk("unsigned -> signed wide (zero-extends)", w8s, 13);
    w8s = u4 + 4'sd0;  chk("u4 + 4'sd0 (folk repair fails)",    w8s,  13);
    w8s = $signed(u4); chk("$signed(u4) first, THEN widen",     w8s,  -3);

    // --- Part-selects and concatenations are always unsigned -------------
    w16 = s;         chk("whole vector into 16 bits",   w16, 16'hfffd);
    w16 = s[7:0];    chk("s[7:0] full-width part-select", w16, 16'h00fd);
    w16 = {s};       chk("{s} concatenation",           w16, 16'h00fd);
    r8u = s[7:0] >>> 2;  chk("s[7:0] >>> 2 (arithmetic shift killed)",
                             r8u, 63);

    // --- Unsigned comparisons against zero --------------------------------
    u = 5 - 10;      chk("u = 5 - 10", u, 251);
    chk("u < 0 (unsigned: constant false)",     u < 0,   0);
    chk("s < 0 (signed, s = -3)",               s < 0,   1);
    n = 0;
    for (i4 = 4'd10; i4 >= 0 && n < 40; i4 = i4 - 1) n = n + 1;
    chk("unsigned countdown iterations (abort at 40)", n, 40);
    n = 0;
    for (i = 10; i >= 0; i = i - 1) n = n + 1;
    chk("integer countdown iterations",         n, 11);

    // --- Product width is context-determined ------------------------------
    m8 = 8'sh80;                        // -128
    pw = m8 * m8;    chk("(-128)*(-128) into 16 bits",  pw, 16384);
    pn = m8 * m8;    chk("(-128)*(-128) into  8 bits",  pn,     0);
    m8 = 8'sd100;
    pw = m8 * m8;    chk("100*100 into 16 bits",        pw, 10000);
    pn = m8 * m8;    chk("100*100 into  8 bits",        pn,    16);
    chk("m8*m8 > 16'sd9999 (literal widened it)", (m8 * m8) > 16'sd9999, 1);

    // --- Based literals are unsigned: -8'd3 is not minus three ------------
    w16s = -8'd3;       chk("w16s = -8'd3 (happens to work)",  w16s,  -3);
    r9   = sa + (-8'sd3); chk("sa + (-8'sd3) into 9 bits",     r9,    -6);
    r9   = sa + (-8'd3);  chk("sa + (-8'd3)  into 9 bits (poisoned)",
                              r9, 250);
    chk("sa == -8'd3 (bit patterns match)",     sa == -8'd3,  1);

    // --- %d follows the expression's signedness ---------------------------
    $sformat(str4, "%d", s);
    chk("%d of signed 8-bit -3 renders '  -3'",  str4 === "  -3", 1);
    $sformat(str4, "%d", u2);
    chk("%d of unsigned 8-bit 2 renders '  2'",  str4 === "  2", 1);

    // --- The five silent continuous assignments ---------------------------
    es = -8'sd3;  eu = 8'd2;  #1;
    chk("mix    = es + eu",          mix,    255);
    chk("prodl  = es * es",          prodl,    9);
    chk("narrow = es + es (4 bits)", narrow,  10);
    chk("cmp    = es < eu",          cmp,      0);
    chk("shft   = (es+eu) >>> 1",    shft,   127);

    if (errors == 0)
      $display("PASS tb_signtraps (every trap present, every trap silent at compile time)");
    else
      $fatal(1, "%0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
