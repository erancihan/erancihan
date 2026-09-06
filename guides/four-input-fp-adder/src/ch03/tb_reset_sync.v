`timescale 1ns/1ps
`default_nettype none

// Two identical counters with asynchronous reset. One is fed the raw reset,
// released at t=13, two nanoseconds before the rising edge at t=15. The other
// is fed the same reset through a two-flop synchroniser.
module tb_reset_sync;

  localparam CLK_HALF = 5;

  reg clk = 1'b0;
  always #CLK_HALF clk = ~clk;

  reg arst_n = 1'b0;
  wire rst_n_sync;
  wire [3:0] q_raw, q_sync;

  integer errors = 0;

  reset_sync    u_rs   (.clk(clk), .arst_n(arst_n), .rst_n_sync(rst_n_sync));
  cnt_async_rst u_raw  (.clk(clk), .rst_n(arst_n),     .q(q_raw));
  cnt_async_rst u_sync (.clk(clk), .rst_n(rst_n_sync), .q(q_sync));

  task show;
    begin
      $display("  t=%0d arst_n=%b rst_n_sync=%b | q_raw=%0d q_sync=%0d",
               $time, arst_n, rst_n_sync, q_raw, q_sync);
    end
  endtask

  task check;
    input [3:0] e_raw;
    input [3:0] e_sync;
    begin
      if (q_raw !== e_raw || q_sync !== e_sync) begin
        errors = errors + 1;
        $display("FAIL t=%0d: got %0d/%0d, expected %0d/%0d",
                 $time, q_raw, q_sync, e_raw, e_sync);
      end
    end
  endtask

  initial begin
    #6  show; check(4'd0, 4'd0);
    #7  arst_n = 1'b1;                  // t=13, two ns before the t=15 edge
    #3  show; check(4'd1, 4'd0);        // t=16
    #10 show; check(4'd2, 4'd0);        // t=26: rst_n_sync has just risen
    #10 show; check(4'd3, 4'd1);        // t=36: the synchronised counter starts
    #10 show; check(4'd4, 4'd2);

    if (errors == 0) $display("PASS tb_reset_sync");
    else             $fatal(1, "tb_reset_sync: %0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
