`timescale 1ns/1ps
`default_nettype none

// Chapter 7: the chapter's worked encodings, proved in the simulator.
//
// $shortrealtobits on this Icarus is a correctly rounding binary32 encoder
// (round-to-nearest-even), measured against an exact python3 rounder in this
// chapter's research. Each check below applies it ONCE to a value the double
// side represents exactly or -- for 0.1 -- to the double nearest the decimal,
// which is the one situation where rounding double-then-single provably
// equals rounding once (53 >= 2*24 + 2). Every expected constant was derived
// by hand in the chapter and verified with python3 struct this session.
module tb_encode;

  integer    errors, i;
  real       s, tenth;
  reg [31:0] got;

  initial begin : watchdog
    #1000000;
    $display("FAIL tb_encode: timeout at %0t", $time);
    $fatal(1, "timeout");
  end

  task enc(input real x, input [31:0] expct, input [8*28:1] name);
    begin
      got = $shortrealtobits(x);
      if (got !== expct) begin
        errors = errors + 1;
        $display("FAIL tb_encode %0s: got %h expected %h", name, got, expct);
      end else
        $display("  %h  %0s", got, name);
    end
  endtask

  initial begin
    errors = 0;

    // The seven worked encodings of the chapter, in chapter order.
    enc(1.0,                       32'h3F800000, "1.0");
    enc(6.25,                      32'h40C80000, "6.25 (no rounding)");
    enc(0.1,                       32'h3DCCCCCD, "0.1 (G=1, R|S=1: up)");
    enc(16777217.0,                32'h4B800000, "2^24+1 (tie -> even, down)");
    enc(16777219.0,                32'h4B800002, "2^24+3 (tie -> even, up)");
    enc(2.0**-140,                 32'h00000200, "2^-140 (subnormal)");
    enc(2.0**-126,                 32'h00800000, "min normal");
    enc((2.0-2.0**-23)*2.0**127,   32'h7F7FFFFF, "max normal");

    // The two escapes of the encode algorithm.
    enc(2.0**128,                  32'h7F800000, "overflow -> +inf");
    enc((2.0-2.0**-24)*2.0**127,   32'h7F800000, "exact overflow threshold");
    enc(-(2.0**128),               32'hFF800000, "-(2^128) -> -inf");

    // The precedence trap: unary minus binds TIGHTER than ** in Verilog,
    // so -2.0**128 is (-2.0)^128 = +2^128 -- the opposite of python.
    enc(-2.0**128,                 32'h7F800000, "-2.0**128 is (+2)^128 here");

    // Epsilon at 1.0: the tie at u = 2^-24 goes to the even side (1.0), and
    // anything past the tie already bumps the last bit.
    enc(1.0 + 2.0**-23,            32'h3F800001, "1 + eps");
    enc(1.0 + 2.0**-24,            32'h3F800000, "1 + u (tie -> 1.0)");
    enc(1.0 + (2.0**-24+2.0**-30), 32'h3F800001, "1 + u + 2^-30 (past tie)");

    // Ties-to-even working inside the subnormal range.
    enc(2.0**-150,                 32'h00000000, "2^-150 (tie -> even, 0)");
    enc(3.0*2.0**-150,             32'h00000002, "1.5*2^-149 (tie -> even)");

    // 0.1 accumulated ten times in true binary32: round after EVERY add by
    // round-tripping through the bits functions (assignment does not round;
    // see tb_lab.v). Lands one ulp ABOVE 1.0.
    tenth = $bitstoshortreal(32'h3DCCCCCD);
    s = 0.0;
    for (i = 0; i < 10; i = i + 1)
      s = $bitstoshortreal($shortrealtobits(s + tenth));
    if (i !== 10) begin
      $display("FAIL tb_encode: accumulation loop ran %0d times", i);
      $fatal(1, "loop incomplete");
    end
    got = $shortrealtobits(s);
    if (got !== 32'h3F800001) begin
      errors = errors + 1;
      $display("FAIL tb_encode: 0.1 x 10 gave %h, expected 3f800001", got);
    end
    $display("  0.1 x 10 in binary32 = %h = %.10f", got, s);

    if (errors !== 0)
      $fatal(1, "FAIL tb_encode: %0d error(s)", errors);
    $display("PASS tb_encode (17 encodings + the accumulation drift)");
    $finish;
  end

endmodule

`default_nettype wire
