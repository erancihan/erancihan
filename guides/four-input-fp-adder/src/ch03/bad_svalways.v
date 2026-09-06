`timescale 1ns/1ps
`default_nettype none

// Do SystemVerilog's `always_comb` and `always_ff` turn this chapter's silent
// bugs into compile errors? Measured on Icarus 13.0: no.
//
// This file re-spells two bugs the chapter has already demonstrated using the
// intent keywords, adds the one always_* rule Icarus does enforce, and adds
// the one always_comb property that does work here. Build it and read the
// compile log:
//
//   iverilog -g2012 -Wall -o sim bad_svalways.v
//
// The only diagnostic is the edge-sensitivity warning from sv_ff_level, and it
// is a warning: the file compiles, exit 0, and both bugs still reproduce at
// run time. The conclusion is not that the keywords are useless - the checks
// are real in Vivado, Questa, VCS and Verilator, and the inferred sensitivity
// list is real here. The conclusion is that this simulator enforces nothing.

// bad_latch.v's incomplete `if`, with `always @(*)` written as `always_comb`.
// Still a latch. No diagnostic.
module sv_latch_comb
  (input  wire [1:0] sel,
   input  wire [3:0] a,
   input  wire [3:0] b,
   input  wire [3:0] c,
   output reg  [3:0] y);

  always_comb
    if      (sel == 2'b00) y = a;
    else if (sel == 2'b01) y = b;
    else if (sel == 2'b10) y = c;

endmodule

// bad_shift3.v's blocking assignment in a clocked block, with
// `always @(posedge clk)` written as `always_ff`. Still collapses. No
// diagnostic.
module sv_shift_ff
  (input  wire clk,
   input  wire din,
   output reg  q1,
   output reg  q2,
   output reg  q3);

  always_ff @(posedge clk) begin
    q1 = din;
    q2 = q1;
    q3 = q2;
  end

endmodule

// The half that DOES work here. bad_sens.v's func_sens reads q only inside a
// called function, so @(*) never sees it. IEEE 1800-2017 section 9.2.2.2 puts
// variables read by called functions into always_comb's inferred list, and
// Icarus implements that: this block responds to q on its own. The inferred
// list is computed, not checked, which is why this one costs the tool nothing.
module sv_comb_fn
  (input  wire [3:0] p,
   input  wire [3:0] q,
   output reg  [3:0] y);

  function [3:0] f_hidden;
    input [3:0] x;
    begin
      f_hidden = x + q;
    end
  endfunction

  always_comb y = f_hidden(p);

endmodule

// The one always_* rule Icarus 13.0 does enforce: an always_ff sensitivity
// list must be edge-only. `lvl` is a level, so this warns. It is a warning,
// not an error, and the file still builds.
module sv_ff_level
  (input  wire clk,
   input  wire lvl,
   input  wire d,
   output reg  q);

  always_ff @(posedge clk or lvl)
    q <= d;

endmodule

module bad_svalways;

  reg  [1:0] sel;
  reg  [3:0] a, b, c;
  wire [3:0] y_comb;

  reg  clk = 1'b0;
  reg  din = 1'b0;
  wire q1, q2, q3;

  reg  [3:0] p, q;
  wire [3:0] y_fn;

  integer errors = 0;

  sv_latch_comb u_comb (.sel(sel), .a(a), .b(b), .c(c), .y(y_comb));
  sv_shift_ff   u_ff   (.clk(clk), .din(din), .q1(q1), .q2(q2), .q3(q3));
  sv_comb_fn    u_fn   (.p(p), .q(q), .y(y_fn));

  always #5 clk = ~clk;

  initial begin
    a = 4'h1; b = 4'h5; c = 4'h9;
    p = 4'd1; q = 4'd0;

    // Hold sel on the value the `if` chain does not cover, then change an
    // input the output should depend on. A combinational block would follow.
    sel = 2'b01; #1;
    sel = 2'b11; #1;
    $display("  always_comb, sel=11 : y=%h", y_comb);
    b = 4'ha; #1;
    $display("  always_comb, b 5->a : y=%h  (held: still a latch)", y_comb);
    if (y_comb !== 4'h5) begin
      errors = errors + 1;
      $display("FAIL the always_comb latch no longer reproduces");
    end

    // One-cycle pulse into the always_ff shift register.
    @(negedge clk); din = 1'b1;
    @(negedge clk); din = 1'b0;
    $display("  always_ff with '=' : q1=%b q2=%b q3=%b  (collapsed to one stage)",
             q1, q2, q3);
    if ({q1, q2, q3} !== 3'b111) begin
      errors = errors + 1;
      $display("FAIL the always_ff collapse no longer reproduces");
    end

    // The half that does work: an inferred list that reaches inside a function.
    q = 4'd5; #1;
    $display("  always_comb, q 0->5 : y=%0d  (function read: the list saw it)", y_fn);
    if (y_fn !== 4'd6) begin
      errors = errors + 1;
      $display("FAIL always_comb did not pick up a signal read inside a function");
    end

    if (errors == 0) $display("PASS bad_svalways (checks absent, inferred list present)");
    else             $fatal(1, "bad_svalways: %0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
