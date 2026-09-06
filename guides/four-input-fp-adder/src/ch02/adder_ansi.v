`timescale 1ns/1ps
`default_nettype none

// Parameterised unsigned adder, ANSI-2001 port list.
// The {cout, sum} concatenation on the left is the whole trick: the target is
// W+1 bits wide, so the addition is evaluated at W+1 bits and the carry-out
// survives.
module adder_ansi #(parameter W = 8)
  (input  wire [W-1:0] a,
   input  wire [W-1:0] b,
   input  wire         cin,
   output wire [W-1:0] sum,
   output wire         cout);

  assign {cout, sum} = a + b + cin;

endmodule

`default_nettype wire
