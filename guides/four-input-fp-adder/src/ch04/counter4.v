`timescale 1ns/1ps
`default_nettype none

// A 4-bit counter with synchronous active-low reset and a clock enable -
// chapter 3's template. It is the device under test for tb_anatomy.v because
// it needs a clock, a reset and an input, which is the whole shape a testbench
// has to produce.
module counter4
  (input  wire       clk,
   input  wire       rst_n,
   input  wire       en,
   output reg  [3:0] q);

  always @(posedge clk)
    if (!rst_n)  q <= 4'd0;
    else if (en) q <= q + 4'd1;

endmodule

`default_nettype wire
