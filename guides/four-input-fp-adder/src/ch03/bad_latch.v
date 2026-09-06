`timescale 1ns/1ps
`default_nettype none

// Two spellings of the same bug: a combinational block with an execution path
// on which the output is not assigned. Both compile clean under
// `iverilog -g2012 -Wall`. Neither produces any diagnostic at all.
//
// Both modules have the same port list as sel_mux, so a testbench can drive
// all three from one set of stimulus and compare.

// An `if` chain with no final `else`. When sel is 2'b11 the block assigns
// nothing, so y keeps whatever it had: that held value is the latch.
module latch_if
  (input  wire [1:0] sel,
   input  wire [3:0] a,
   input  wire [3:0] b,
   input  wire [3:0] c,
   output reg  [3:0] y);

  always @(*)
    if      (sel == 2'b00) y = a;
    else if (sel == 2'b01) y = b;
    else if (sel == 2'b10) y = c;

endmodule

// A `case` with three of the four selector values covered and no `default:`.
// Same bug, different syntax.
module latch_case
  (input  wire [1:0] sel,
   input  wire [3:0] a,
   input  wire [3:0] b,
   input  wire [3:0] c,
   output reg  [3:0] y);

  always @(*)
    case (sel)
      2'b00: y = a;
      2'b01: y = b;
      2'b10: y = c;
    endcase

endmodule

`default_nettype wire
