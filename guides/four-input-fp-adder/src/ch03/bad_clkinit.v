`timescale 1ns/1ps
`default_nettype none

// `always #5 clk = ~clk;` has exactly one failure mode, and every beginner
// hits it: ~x is x, so a clock that starts at x stays at x forever and the
// design never sees an edge. A PASS here means the trap still reproduces.
module bad_clkinit;

  reg clk_bad;                    // never initialised
  reg clk_decl = 1'b0;            // initialised at its declaration
  reg clk_init;                   // initialised in an initial block

  integer n_bad  = 0;
  integer n_decl = 0;
  integer n_init = 0;
  integer errors = 0;

  initial clk_init = 1'b0;

  always #5 clk_bad  = ~clk_bad;
  always #5 clk_decl = ~clk_decl;
  always #5 clk_init = ~clk_init;

  always @(posedge clk_bad)  n_bad  = n_bad  + 1;
  always @(posedge clk_decl) n_decl = n_decl + 1;
  always @(posedge clk_init) n_init = n_init + 1;

  initial begin
    #1;
    repeat (5) begin
      $display("  t=%0d clk_bad=%b clk_decl=%b clk_init=%b",
               $time, clk_bad, clk_decl, clk_init);
      #5;
    end
    $display("  rising edges seen: clk_bad=%0d clk_decl=%0d clk_init=%0d",
             n_bad, n_decl, n_init);

    if (n_bad !== 0) begin
      errors = errors + 1;
      $display("FAIL the uninitialised clock no longer reproduces: %0d edges", n_bad);
    end
    if (n_decl !== 3 || n_init !== 3) begin
      errors = errors + 1;
      $display("FAIL both cures should have given 3 edges, got %0d and %0d", n_decl, n_init);
    end

    if (errors == 0) $display("PASS bad_clkinit (an x clock never starts)");
    else             $fatal(1, "bad_clkinit: %0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
