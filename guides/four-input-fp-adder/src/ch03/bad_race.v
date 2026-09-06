`timescale 1ns/1ps
`default_nettype none

// Two same-edge always blocks, one reading what the other writes, with
// blocking assignment. IEEE 1364-2005 section 11.4.2 (Nondeterminism) leaves
// the order in which the two blocks run entirely to the implementation, and
// section 11.5 (Race conditions) is the consequence. These two modules contain
// exactly the same two statements in the opposite source order.
//
// The `initial` blocks stand in for a reset; they exist only so that the
// experiment starts from a defined value rather than from x.

module race_ab
  (input  wire clk,
   input  wire d,
   output reg  a,
   output reg  b);

  initial begin a = 1'b0; b = 1'b0; end

  always @(posedge clk) a = d;
  always @(posedge clk) b = a;

endmodule

module race_ba
  (input  wire clk,
   input  wire d,
   output reg  a,
   output reg  b);

  initial begin a = 1'b0; b = 1'b0; end

  always @(posedge clk) b = a;
  always @(posedge clk) a = d;

endmodule

// Reports which of two same-edge blocks Icarus actually runs first, at every
// edge. Nothing here is a design; it is a probe.
module order_probe
  (input wire clk);

  always @(posedge clk) $display("    t=%0d  BLOCK-A runs", $time);
  always @(posedge clk) $display("    t=%0d  BLOCK-B runs", $time);

endmodule

`default_nettype wire
