`timescale 1ns/1ps
`default_nettype none

// Chapter 1's half adder, written down.
// sum   = a XOR b
// carry = a AND b
module half_adder
  (input  wire a,
   input  wire b,
   output wire sum,
   output wire carry);

  assign sum   = a ^ b;
  assign carry = a & b;

endmodule

`default_nettype wire
