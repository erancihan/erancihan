`timescale 1ns/1ps
`default_nettype none

// Chapter 1's 2:1 multiplexer. In Verilog it is one conditional operator.
// Note what the ?: does with an unknown selector: it merges the two arms
// bitwise, so bits where a and b agree survive and only the differing bits
// go to x. That is the honest answer, and tb_mux2 checks it.
module mux2 #(parameter W = 8)
  (input  wire [W-1:0] d0,
   input  wire [W-1:0] d1,
   input  wire         sel,
   output wire [W-1:0] y);

  assign y = sel ? d1 : d0;

endmodule

`default_nettype wire
