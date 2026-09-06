`timescale 1ns/1ps
`default_nettype none

// One 8-bit D flip-flop, and nothing else. Its only job in this chapter is to
// have an output that changes in the non-blocking update region, so that
// $display and $strobe visibly disagree about it at the same rising edge.
module dff
  (input  wire       clk,
   input  wire [7:0] d,
   output reg  [7:0] q);

  always @(posedge clk)
    q <= d;

endmodule

`default_nettype wire
