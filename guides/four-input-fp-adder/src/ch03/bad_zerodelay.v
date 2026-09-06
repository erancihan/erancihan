`timescale 1ns/1ps
`default_nettype none

// An always block with no event control and no delay. People write this
// expecting "y is always ~a"; it is a zero-delay infinite loop, and it is one
// of the very few mistakes in this chapter that Icarus refuses outright:
//
//   error: always process does not have any delay.
//   : A runtime infinite loop will occur.
//
// This file is a build target that must FAIL to compile.
module bad_zerodelay
  (input  wire a,
   output reg  y);

  always
    y = ~a;

endmodule

`default_nettype wire
