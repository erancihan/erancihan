`timescale 1ns/1ps
`default_nettype none

// A deliberately broken adder: it subtracts. Same ports as adder8, so one
// testbench can drive both and compare them vector by vector. Used by
// tb_check.v to show what a mismatch report looks like - and to show one
// vector on which a subtractor and an adder agree by accident.
module bad_adder8
  (input  wire [7:0] a,
   input  wire [7:0] b,
   output wire [7:0] sum,
   output wire       cout);

  assign {cout, sum} = a - b;

endmodule

`default_nettype wire
