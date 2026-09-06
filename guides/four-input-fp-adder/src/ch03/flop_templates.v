`timescale 1ns/1ps
`default_nettype none

// The four clocked templates a synthesis tool recognises. Nothing here is a
// command; each one is a pattern the tool has been taught to map onto a
// flip-flop from its library.

// Plain D flip-flop. No reset: it powers up holding whatever the silicon
// settled on, and in simulation that is x until the first edge.
module dff
  (input  wire clk,
   input  wire d,
   output reg  q);

  always @(posedge clk)
    q <= d;

endmodule

// Synchronous reset. rst_n is ordinary data into the flop, so it is NOT in
// the sensitivity list, and it is only sampled at a clock edge.
module cnt_sync_rst
  (input  wire       clk,
   input  wire       rst_n,
   output reg  [3:0] q);

  always @(posedge clk)
    if (!rst_n) q <= 4'd0;
    else        q <= q + 4'd1;

endmodule

// Asynchronous reset. negedge rst_n IS in the sensitivity list, the polarity
// there must match the polarity of the test, and the reset must be the first
// branch of the if. Anything else falls outside the template.
module cnt_async_rst
  (input  wire       clk,
   input  wire       rst_n,
   output reg  [3:0] q);

  always @(posedge clk or negedge rst_n)
    if (!rst_n) q <= 4'd0;
    else        q <= q + 4'd1;

endmodule

// Clock enable. The enable is an `else if`, never an extra term in the
// sensitivity list: @(posedge clk or posedge en) would ask for a second clock.
// There is deliberately no final else, so q holds when en is low. In a clocked
// block that is a flip-flop with an enable, not a latch.
module cnt_en
  (input  wire       clk,
   input  wire       rst_n,
   input  wire       en,
   output reg  [3:0] q);

  always @(posedge clk)
    if (!rst_n)  q <= 4'd0;
    else if (en) q <= q + 4'd1;

endmodule

`default_nettype wire
