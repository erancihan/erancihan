`timescale 1ns/1ps
`default_nettype none

// Chapter 7: the unified binary32 field decode -- the whole subnormal story
// in three assignments.
//
//   hidden = |E   : the implicit significand bit exists unless E == 0
//   sig    = {hidden, F} : the full 24-bit significand, both classes
//   e_eff  = max(E, 1)   : stored exponents 0 and 1 share the scale 2^-126,
//                          so E = 0 decodes as "exponent field 1, hidden 0"
//
// value = (-1)^sign * sig * 2^(e_eff - 127 - 23) for every finite pattern,
// zero and subnormals included, with no other special case. The classic bug
// this module vaccinates against is using E - 127 = -127 as the subnormal
// exponent, which halves every subnormal (chapter 5's row B calls it the
// commonest subnormal bug). For E = 255 patterns (infinity, NaN) sig and
// e_eff are still driven but mean nothing; screen with fp32_class first.
module fp32_fields
  (input  wire [31:0] w,       // packed binary32 pattern
   output wire        sign,    // bit 31
   output wire [7:0]  e_raw,   // stored exponent field, bits 30:23
   output wire [22:0] frac,    // trailing significand field, bits 22:0
   output wire        hidden,  // the implicit bit the format does not store
   output wire [23:0] sig,     // {hidden, frac}
   output wire [7:0]  e_eff);  // max(e_raw, 1)

  assign sign   = w[31];
  assign e_raw  = w[30:23];
  assign frac   = w[22:0];
  assign hidden = |e_raw;
  assign sig    = {hidden, frac};
  assign e_eff  = hidden ? e_raw : 8'd1;

endmodule

`default_nettype wire
