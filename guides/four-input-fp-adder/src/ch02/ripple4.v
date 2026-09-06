`timescale 1ns/1ps
`default_nettype none

// Chapter 1's ripple-carry adder: four full adders, carry chained.
// The topology IS the point here, which is why this one is structural.
// `c' holds the internal carries; c[0] is the incoming carry and c[4] is
// the carry-out.
module ripple4
  (input  wire [3:0] a,
   input  wire [3:0] b,
   input  wire       cin,
   output wire [3:0] sum,
   output wire       cout);

  wire [4:0] c;

  assign c[0] = cin;
  assign cout = c[4];

  full_adder fa0 (.a(a[0]), .b(b[0]), .cin(c[0]), .sum(sum[0]), .cout(c[1]));
  full_adder fa1 (.a(a[1]), .b(b[1]), .cin(c[1]), .sum(sum[1]), .cout(c[2]));
  full_adder fa2 (.a(a[2]), .b(b[2]), .cin(c[2]), .sum(sum[2]), .cout(c[3]));
  full_adder fa3 (.a(a[3]), .b(b[3]), .cin(c[3]), .sum(sum[3]), .cout(c[4]));

endmodule

`default_nettype wire
