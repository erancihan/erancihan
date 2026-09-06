`timescale 1ns/1ps
`default_nettype none

// Two identical D flip-flops, two stimulus blocks asked to produce the same
// one-cycle pulse. One drives on the edge the design samples on, which is a
// race with the design itself; the other drives half a clock away.
// A PASS here means the same-edge stimulus still loses the pulse entirely.
module bad_tbedge;

  localparam CLK_HALF = 5;

  reg clk = 1'b0;
  always #CLK_HALF clk = ~clk;

  reg d_same = 1'b0;
  reg d_opp  = 1'b0;
  wire q_same, q_opp;

  integer cyc_same = 0;
  integer cyc_opp  = 0;
  reg saw_same = 1'b0;
  reg saw_opp  = 1'b0;
  integer errors = 0;

  dff u_same (.clk(clk), .d(d_same), .q(q_same));
  dff u_opp  (.clk(clk), .d(d_opp),  .q(q_opp));

  // Stimulus on the same edge the design samples on.
  always @(posedge clk) begin
    cyc_same = cyc_same + 1;
    d_same   = (cyc_same == 2);
  end

  // The same stimulus, half a clock period earlier.
  always @(negedge clk) begin
    cyc_opp = cyc_opp + 1;
    d_opp   = (cyc_opp == 2);
  end

  always @(negedge clk) begin
    if (q_same === 1'b1) saw_same = 1'b1;
    if (q_opp  === 1'b1) saw_opp  = 1'b1;
    $display("  t=%0d | d_same=%b q_same=%b | d_opp=%b q_opp=%b",
             $time, d_same, q_same, d_opp, q_opp);
  end

  initial begin
    #65;
    if (saw_same !== 1'b0) begin
      errors = errors + 1;
      $display("FAIL the same-edge pulse got through this time");
    end
    if (saw_opp !== 1'b1) begin
      errors = errors + 1;
      $display("FAIL the opposite-edge pulse should have been captured");
    end

    if (errors == 0) $display("PASS bad_tbedge (same-edge stimulus swallowed the pulse)");
    else             $fatal(1, "bad_tbedge: %0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
