`timescale 1ns/1ps
`default_nettype none

// One single-cycle pulse on din, through three three-stage shift registers:
// non-blocking, blocking in natural order, blocking in reversed order.
module tb_shift3;

  localparam CLK_HALF = 5;

  reg clk = 1'b0;
  always #CLK_HALF clk = ~clk;

  reg din = 1'b0;
  wire [2:0] q_nb, q_bl, q_rev;

  integer errors = 0;
  integer cyc;

  shift3             u_nb  (.clk(clk), .din(din), .q(q_nb));
  shift3_blocking    u_bl  (.clk(clk), .din(din), .q(q_bl));
  shift3_blocking_rev u_rev(.clk(clk), .din(din), .q(q_rev));

  task check;
    input [2:0] e_nb;
    input [2:0] e_bl;
    input [2:0] e_rev;
    begin
      $display("  cyc %0d |  nba %b  |  blocking %b  |  blocking reversed %b",
               cyc, q_nb, q_bl, q_rev);
      if (q_nb !== e_nb || q_bl !== e_bl || q_rev !== e_rev) begin
        errors = errors + 1;
        $display("FAIL cyc %0d: got %b/%b/%b, expected %b/%b/%b",
                 cyc, q_nb, q_bl, q_rev, e_nb, e_bl, e_rev);
      end
    end
  endtask

  initial begin
    // Stimulus is driven on the falling edge, half a clock away from the edge
    // the design samples on. bad_tbedge.v shows what happens otherwise.
    @(negedge clk);              // two idle cycles to flush x out of the flops,
    @(negedge clk);              // which have no reset

    @(negedge clk) din = 1'b1;
    @(negedge clk) din = 1'b0;   // the rising edge between the two has sampled it

    cyc = 0;                 check(3'b100, 3'b111, 3'b100);
    cyc = 1; @(negedge clk)  check(3'b010, 3'b000, 3'b010);
    cyc = 2; @(negedge clk)  check(3'b001, 3'b000, 3'b001);
    cyc = 3; @(negedge clk)  check(3'b000, 3'b000, 3'b000);
    cyc = 4; @(negedge clk)  check(3'b000, 3'b000, 3'b000);

    if (errors == 0) $display("PASS tb_shift3 (collapse reproduced, reversal accidentally works)");
    else             $fatal(1, "tb_shift3: %0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
