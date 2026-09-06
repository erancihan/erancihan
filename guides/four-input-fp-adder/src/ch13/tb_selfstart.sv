`timescale 1ns/1ps

// Chapter 13: the second measured behavioural difference between
// `always_comb` and `always @(*)`, pinned as a regression target.
//
// Chapter 3's "How a Simulator Actually Runs Your Code" measured
// that `always @(*)` DOES NOT SELF-START: if its only input was initialised
// at its declaration, no event ever fires, the block never executes, and the
// output sits at x through the whole first time step. IEEE 1800 requires
// `always_comb` to execute once at time zero regardless. So the SystemVerilog
// form measurably FIXES a trap this guide taught -- on this very simulator.
//
// This is a self-checking target rather than a remembered fact: if a future
// Icarus makes `@(*)` self-start, or stops running `always_comb` at time
// zero, the run goes red and the chapter learns its transcript is stale.
module tb_selfstart;

  reg a = 1'b1;           // initialised AT DECLARATION: no event ever fires
  reg y_star, y_comb;

  always @(*)  y_star = ~a;
  always_comb  y_comb = ~a;

  initial begin
    #1;
    $display("y_star=%b y_comb=%b", y_star, y_comb);
    if (y_star !== 1'bx)
      $display("FAIL tb_selfstart: always @(*) self-started (y_star=%b, expected x)", y_star);
    else if (y_comb !== 1'b0)
      $display("FAIL tb_selfstart: always_comb did not run at time zero (y_comb=%b, expected 0)", y_comb);
    else
      $display("PASS tb_selfstart (@(*) stayed x, always_comb computed at time zero)");
    $finish;
  end

endmodule
