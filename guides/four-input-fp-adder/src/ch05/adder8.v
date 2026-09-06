`timescale 1ns/1ps
`default_nettype none

// Chapter 4's device under test, unchanged, so this directory stands alone.
// Chapter 5 never modifies it: the wrong carry-out lives in adder8_mut.v, as a
// separate module, so both can be instantiated in one testbench and compared.
module adder8
  (input  wire [7:0] a,
   input  wire [7:0] b,
   output wire [7:0] sum,
   output wire       cout);

  assign {cout, sum} = a + b;

endmodule

`default_nettype wire
