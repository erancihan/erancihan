`timescale 1ns/1ps
`default_nettype none

// Chapter 9: golden step 2 as a module -- the special-case screen, a
// SIBLING of the datapath, not a stage of it. It takes the raw packed
// operands and decides NaN/infinity/zero results independently; the top
// module's final mux (result = screen ? screen_res : dp_res) is golden
// step 10 verbatim.
//
// The classes come from chapter 7's fp32_class, instantiated twice -- its
// one-hot contract supplies is_snan and is_inf for `invalid` exactly as
// that chapter designed it to.
//
// Invariant out: screen is high iff any operand is NaN, infinite or zero,
// and when it is high screen_res IS the final result. NaN beats infinity
// (they share E = 255); inf + (-inf) invents 7FC00000 and raises invalid;
// unlike-signed zeros give +0 under round-to-nearest-even.
module fp32_screen
  (input  wire [31:0] a,
   input  wire [31:0] b,
   output wire        screen,       // a special case decided the result
   output wire [31:0] screen_res,
   output wire        invalid);

  wire sa, sb;
  wire a_zero, a_sub, a_norm, a_inf, a_nan, a_qnan, a_snan;
  wire b_zero, b_sub, b_norm, b_inf, b_nan, b_qnan, b_snan;

  fp32_class u_ca (.w(a), .sign(sa), .is_zero(a_zero), .is_sub(a_sub),
                   .is_norm(a_norm), .is_inf(a_inf), .is_nan(a_nan),
                   .is_qnan(a_qnan), .is_snan(a_snan));
  fp32_class u_cb (.w(b), .sign(sb), .is_zero(b_zero), .is_sub(b_sub),
                   .is_norm(b_norm), .is_inf(b_inf), .is_nan(b_nan),
                   .is_qnan(b_qnan), .is_snan(b_snan));

  wire [31:0] nan_src = a_nan ? a : b;      // propagate a payload, quieted
  assign screen  = a_nan | b_nan | a_inf | b_inf | a_zero | b_zero;
  assign screen_res =
      (a_nan | b_nan)              ? {nan_src[31], 8'd255, 1'b1, nan_src[21:0]} :
      (a_inf & b_inf & (sa ^ sb))  ? 32'h7FC00000 :
      a_inf                        ? a :
      b_inf                        ? b :
      (a_zero & b_zero)            ? ((sa == sb) ? a : 32'h00000000) :
      a_zero                       ? b : a;
  assign invalid = a_snan | b_snan | (a_inf & b_inf & (sa ^ sb));

endmodule

`default_nettype wire
