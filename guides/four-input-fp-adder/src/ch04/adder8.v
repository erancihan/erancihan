`timescale 1ns/1ps
`default_nettype none

// An 8-bit adder with carry out. Chapter 2 built this; it is here so that
// chapter 4's source directory stands on its own, and because a combinational
// device under test keeps the testbench examples about the testbench.
module adder8
  (input  wire [7:0] a,
   input  wire [7:0] b,
   output wire [7:0] sum,
   output wire       cout);

  assign {cout, sum} = a + b;

endmodule

`default_nettype wire
