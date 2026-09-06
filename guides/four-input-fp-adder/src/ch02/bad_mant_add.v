`timescale 1ns/1ps
`default_nettype none

// DELIBERATELY WRONG. Two separate continuous assignments instead of one
// concatenated target.
//
//   sum   is W bits, so a+b is evaluated at W bits: the carry is truncated.
//   carry is 1 bit,  so (a+b)>>W is evaluated at ONE bit: a+b is computed at
//         width 1, the shift by W throws away everything, and the result is
//         permanently 0.
//
// Neither line produces a warning of any kind, at any -W level.
// tb_mant_add asserts these WRONG values, so a PASS means the trap survives.
module bad_mant_add #(parameter W = 24)
  (input  wire [W-1:0] a,
   input  wire [W-1:0] b,
   output wire [W-1:0] sum,
   output wire         carry);

  assign sum   = a + b;
  assign carry = (a + b) >> W;

endmodule

`default_nettype wire
