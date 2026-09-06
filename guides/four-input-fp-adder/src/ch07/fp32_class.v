`timescale 1ns/1ps
`default_nettype none

// Chapter 7: a pure-combinational IEEE 754 binary32 operand classifier.
//
// One 32-bit pattern in, one-hot class flags out. The five classes partition
// all 2^32 patterns (zeros 2, subnormals 16,777,214, normals 4,261,412,864,
// infinities 2, NaNs 16,777,214), and the NaNs split on fraction bit 22, the
// quiet bit. Exactly one of {is_zero, is_sub, is_norm, is_inf, is_nan} is
// high for every input, and is_qnan | is_snan == is_nan.
//
// This module is a deliverable, not a demo: chapters 9 and 12 instantiate it
// on the adder's operand and result paths (NaN must be screened before the
// magnitude compare, and the flag unit needs is_snan and is_inf). The sign
// is reported for every class, NaN included -- what a NaN's sign MEANS is the
// caller's problem; IEEE 754-2019 6.3 leaves a generated NaN's sign
// unspecified, and this host demonstrably produces both.
module fp32_class
  (input  wire [31:0] w,        // packed binary32 pattern
   output wire        sign,     // bit 31, whatever the class
   output wire        is_zero,  // E = 0,   F = 0
   output wire        is_sub,   // E = 0,   F != 0
   output wire        is_norm,  // 1 <= E <= 254
   output wire        is_inf,   // E = 255, F = 0
   output wire        is_nan,   // E = 255, F != 0
   output wire        is_qnan,  // NaN with the quiet bit (F[22]) set
   output wire        is_snan); // NaN with the quiet bit clear

  wire [7:0]  e = w[30:23];     // stored exponent field
  wire [22:0] f = w[22:0];      // trailing significand field

  wire e_zero = (e == 8'd0);    // bottom reserved exponent
  wire e_ones = (e == 8'd255);  // top reserved exponent
  wire f_zero = (f == 23'd0);

  assign sign    = w[31];
  assign is_zero =  e_zero &  f_zero;
  assign is_sub  =  e_zero & ~f_zero;
  assign is_norm = ~e_zero & ~e_ones;
  assign is_inf  =  e_ones &  f_zero;
  assign is_nan  =  e_ones & ~f_zero;
  assign is_qnan = is_nan  &  f[22];
  assign is_snan = is_nan  & ~f[22];

endmodule

`default_nettype wire
