`timescale 1ns/1ps
`default_nettype none

// The same three flops with blocking assignment, in the two statement orders.
// One of them is broken and one of them accidentally works, which is exactly
// why the rule against `=` in a clocked block has to be absolute.

// Natural order. q1 is updated before q2 reads it, so the pulse reaches all
// three outputs in a single cycle and the register depth vanishes.
module shift3_blocking
  (input  wire       clk,
   input  wire       din,
   output wire [2:0] q);

  reg q1, q2, q3;

  always @(posedge clk) begin
    q1 = din;
    q2 = q1;
    q3 = q2;
  end

  assign q = {q1, q2, q3};

endmodule

// Reversed order. Every read now happens before the corresponding write, so
// this one really is a three-stage shift register. It is correct by accident.
module shift3_blocking_rev
  (input  wire       clk,
   input  wire       din,
   output wire [2:0] q);

  reg q1, q2, q3;

  always @(posedge clk) begin
    q3 = q2;
    q2 = q1;
    q1 = din;
  end

  assign q = {q1, q2, q3};

endmodule

`default_nettype wire
