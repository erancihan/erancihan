`timescale 1ns/1ps
`default_nettype none

// `output reg' does not mean a register. This module has no clock, no
// storage, and no flip-flops: it is a comparator feeding a multiplexer.
// The keyword only says "y is assigned from inside a procedural block".
module comb_max
  (input  wire [7:0] a,
   input  wire [7:0] b,
   output reg  [7:0] y);

  always @(*) begin
    if (a > b) y = a;
    else       y = b;
  end

endmodule

`default_nettype wire
