`timescale 1ns/1ps
`default_nettype none

// Chapter 6: Q4.4 x Q4.4 fixed-point multiply with three requantizers.
//
// The multiply itself is exact: Qa.b x Qc.d = Q(a+c).(b+d), so the full
// 16-bit product is Q8.8 with no rounding anywhere. Rounding only enters
// when the product is squeezed back toward the working format - here to
// Q8.4 by dropping the low 4 fraction bits, three different ways.
//
// Width proof for the 12-bit outputs: the raw product spans [-16256, +16384]
// (only (-8.0)*(-8.0) reaches the top), so every rounded Q8.4 result lies in
// [-1016, +1024], well inside a 12-bit signed range of [-2048, +2047].
module fixmul44
  (input  wire signed  [7:0] a,         // Q4.4
   input  wire signed  [7:0] b,         // Q4.4
   output wire signed [15:0] p_full,    // Q8.8: the exact product
   output wire signed [11:0] p_trunc,   // Q8.4: >>> 4, floor, biased
   output wire signed [11:0] p_halfup,  // Q8.4: round half up
   output wire signed [11:0] p_even);   // Q8.4: round half to even

  assign p_full = a * b;                // context widens to 16 bits: exact

  assign p_trunc  = p_full >>> 4;              // drop the bits: free, biased
  assign p_halfup = (p_full + 16'sd8) >>> 4;   // add half an output LSB

  // Round-half-even as a single add (the ZipCPU convergent-rounding idiom):
  // add { L, ~L~L~L } just below the kept part, then truncate. The addend
  // is 7 when the kept LSB L is 0 and 8 when L is 1, so the carry into the
  // kept part fires exactly when R & (S | L) says round up. The concat is
  // unsigned and poisons the +, which is harmless here: addition produces
  // the same bit pattern either way (mod 2^16), and cvg's own declaration
  // restores the signed reading before the >>> that does care.
  wire signed [15:0] cvg = p_full + {12'b0, p_full[4], {3{!p_full[4]}}};
  assign p_even = cvg >>> 4;

endmodule

`default_nettype wire
