`timescale 1ns/1ps
`default_nettype none

// Chapter 9: golden step 5 as a module -- the 27-bit effective operation
// with the sticky borrow. The 27-bit adder IS chapter 8's width budget:
// 24-bit significand + G + R + carry, with the 1-bit sticky alongside.
//
// Sticky passes AROUND this module, not through the adder bits: s enters
// only to feed the borrow (on an effective subtract with sticky set, the
// truncated difference is one too big and still inexact -- so sticky both
// borrows and survives, unchanged, to fp32_normalize).
//
// Invariants out: on eff_sub, sum27 <= big27 (the swap guarantees it);
// and exact_zero implies g == r == s == 0 (chapter 8's proof: sticky
// needs d >= 3, and then the aligned operand is under a quarter of the
// big one, so the difference cannot be zero). exact_zero is gated on
// eff_sub because a zero SUM on an effective add means both operands were
// zero -- a screened case whose +0/-0 sign rule the screen already owns.
module fp32_addsub
  (input  wire        eff_sub,
   input  wire [23:0] sig_big,
   input  wire [23:0] aligned,
   input  wire        g,
   input  wire        r,
   input  wire        s,
   output wire [26:0] sum27,
   output wire        exact_zero);

  wire [26:0] big27 = {1'b0, sig_big, 2'b00};
  wire [26:0] sml27 = {1'b0, aligned, g, r};
  assign sum27 = eff_sub ? (big27 - sml27 - {26'd0, s})
                         : (big27 + sml27);
  assign exact_zero = eff_sub & (sum27 == 27'd0);

endmodule

`default_nettype wire
