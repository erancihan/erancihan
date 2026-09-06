`timescale 1ns/1ps
`default_nettype none

// Synchronous reset, asynchronous reset and clock enable, on one clock.
// The reset pulse at t=42 is deliberately shorter than a clock period and
// falls entirely between two rising edges.
module tb_flop_templates;

  localparam CLK_HALF = 5;

  reg clk = 1'b0;
  always #CLK_HALF clk = ~clk;

  reg rst_n, en;
  wire [3:0] q_sync, q_async, q_en;

  integer errors = 0;

  cnt_sync_rst  u_sync  (.clk(clk), .rst_n(rst_n),             .q(q_sync));
  cnt_async_rst u_async (.clk(clk), .rst_n(rst_n),             .q(q_async));
  cnt_en        u_en    (.clk(clk), .rst_n(rst_n), .en(en),    .q(q_en));

  task show;
    begin
      $display("  t=%0d rst_n=%b en=%b | q_sync=%h q_async=%h q_en=%h",
               $time, rst_n, en, q_sync, q_async, q_en);
    end
  endtask

  task check;
    input [3:0] e_sync;
    input [3:0] e_async;
    input [3:0] e_en;
    begin
      if (q_sync !== e_sync || q_async !== e_async || q_en !== e_en) begin
        errors = errors + 1;
        $display("FAIL t=%0d: got %h/%h/%h, expected %h/%h/%h",
                 $time, q_sync, q_async, q_en, e_sync, e_async, e_en);
      end
    end
  endtask

  initial begin
    rst_n = 1'b0;
    en    = 1'b1;

    #7  rst_n = 1'b1;          // released after the rising edge at t=5
    #1  show; check(4'd0, 4'd0, 4'd0);

    #8  show; check(4'd1, 4'd1, 4'd1);   // the t=15 edge has happened
    #10 show; check(4'd2, 4'd2, 4'd2);
    #10 show; check(4'd3, 4'd3, 4'd3);

    // A two-nanosecond reset pulse, entirely between the edges at t=35 and t=45.
    #6  rst_n = 1'b0;          // t=42
    #1  show; check(4'd3, 4'd0, 4'd3);   // async already cleared, and no edge yet
    #1  rst_n = 1'b1;          // t=44
    #2  show; check(4'd4, 4'd1, 4'd4);   // t=45 edge: sync never saw the pulse

    #6  en = 1'b0;             // t=52
    #4  show; check(4'd5, 4'd2, 4'd4);   // t=55 edge: q_en frozen
    #10 show; check(4'd6, 4'd3, 4'd4);

    if (errors == 0) $display("PASS tb_flop_templates");
    else             $fatal(1, "tb_flop_templates: %0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
