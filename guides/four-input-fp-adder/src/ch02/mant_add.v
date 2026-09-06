`timescale 1ns/1ps
`default_nettype none

// The correct way to add two mantissas and keep the carry.
// The left-hand side {carry, sum} is W+1 bits wide, so the addition is
// evaluated at W+1 bits and the overflow bit has somewhere to live.
module mant_add #(parameter W = 24)
  (input  wire [W-1:0] a,
   input  wire [W-1:0] b,
   output wire [W-1:0] sum,
   output wire         carry);

  assign {carry, sum} = a + b;

endmodule

`default_nettype wire
