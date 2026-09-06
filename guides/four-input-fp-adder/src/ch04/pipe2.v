`timescale 1ns/1ps
`default_nettype none

// Two flip-flops in series: a two-stage pipeline with a latency of exactly two
// clock edges, and a module that contains instances rather than logic. It is
// here to give the waveform examples a hierarchy worth navigating - tb_dump,
// then u_pipe, then u_a and u_b - and to give chapter 11 a latency you can
// count with a cursor.
module pipe2
  (input  wire       clk,
   input  wire [7:0] d,
   output wire [7:0] q);

  wire [7:0] mid;

  dff u_a (.clk(clk), .d(d),   .q(mid));
  dff u_b (.clk(clk), .d(mid), .q(q));

endmodule

`default_nettype wire
