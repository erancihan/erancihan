`timescale 1ns/1ps
`default_nettype none

// A three-stage shift register. The three statements are not three steps:
// every right-hand side is sampled, then every left-hand side is updated.
// Reversing their order changes nothing at all.
module shift3
  (input  wire       clk,
   input  wire       din,
   output wire [2:0] q);

  reg q1, q2, q3;

  always @(posedge clk) begin
    q1 <= din;
    q2 <= q1;
    q3 <= q2;
  end

  assign q = {q1, q2, q3};

endmodule

`default_nettype wire
