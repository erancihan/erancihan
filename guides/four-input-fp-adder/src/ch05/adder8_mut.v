`timescale 1ns/1ps
`default_nettype none

// The mutant chapter 4 could not kill. Same ports as adder8, correct sum, and
// a carry-out written from the belief that "a big operand means a carry".
//
// It is wrong on exactly one class of input: exactly one operand has its top
// bit set, and the sum does not actually overflow. That is 16,512 of the
// 65,536 operand pairs - 25.195 % - and every vector in chapter 4 misses it.
// tb_exhaustive.v counts them; tb_directed.v shows why a hand-written carry
// test walks straight past them.
module adder8_mut
  (input  wire [7:0] a,
   input  wire [7:0] b,
   output wire [7:0] sum,
   output wire       cout);

  assign sum  = a + b;
  assign cout = a[7] | b[7];          // WRONG. Deliberately.

endmodule

`default_nettype wire
