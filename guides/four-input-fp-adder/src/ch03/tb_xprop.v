`timescale 1ns/1ps
`default_nettype none

// A counter with no reset never escapes x, because x + 1 is x. The damage
// spreads: an adder downstream of it is x, and so is the reduction OR that
// chapter 2 used as the floating point sticky bit.
module tb_xprop;

  localparam CLK_HALF = 5;

  reg clk = 1'b0;
  always #CLK_HALF clk = ~clk;

  reg rst_n = 1'b0;
  reg [3:0] no_rst, with_rst;

  wire [4:0] sum_bad = no_rst   + 4'd1;
  wire       any_bad = |no_rst;
  wire       any_ok  = |with_rst;

  integer errors = 0;

  always @(posedge clk) no_rst <= no_rst + 4'd1;

  always @(posedge clk)
    if (!rst_n) with_rst <= 4'd0;
    else        with_rst <= with_rst + 4'd1;

  task show;
    begin
      $display("  t=%0d rst_n=%b | no_rst=%b with_rst=%b sum_bad=%b any_bad=%b any_ok=%b",
               $time, rst_n, no_rst, with_rst, sum_bad, any_bad, any_ok);
    end
  endtask

  initial begin
    #10 show;
    #10 show;
    rst_n = 1'b1;                 // t=20
    #10 show;
    #10 show;
    #10 show;                     // t=50, five rising edges gone by

    if (no_rst !== 4'bxxxx) begin
      errors = errors + 1;
      $display("FAIL the unreset counter should still be all x, got %b", no_rst);
    end
    if (any_bad !== 1'bx) begin
      errors = errors + 1;
      $display("FAIL a reduction OR of x should be x, got %b", any_bad);
    end
    if (with_rst !== 4'd3 || any_ok !== 1'b1) begin
      errors = errors + 1;
      $display("FAIL the reset counter should be 3, got %b", with_rst);
    end

    if (errors == 0) $display("PASS tb_xprop (x is permanent and contagious)");
    else             $fatal(1, "tb_xprop: %0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
