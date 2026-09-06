`timescale 1ns/1ps
`default_nettype none

// Alignment right-shift with guard, round and sticky — the shape chapter 8 needs.
//
// The mantissa goes in the TOP W bits of a (2W+2)-bit vector and is shifted
// right. Whatever leaves the top W bits lands in the fields below it instead
// of vanishing:
//
//   shifted[2W+1 : W+2]  aligned   the significand we keep
//   shifted[W+1]         guard     the FIRST bit shifted out
//   shifted[W]           round     the SECOND bit shifted out
//   shifted[W-1 : 0]     every bit shifted out BELOW the round bit
//
// `sticky' is the reduction OR of that last field ONLY. Guard and round are
// deliberately NOT folded into it, because round-to-nearest-even has to tell
// an exact tie (g=1, r=0, s=0 — break it on the LSB of `aligned') from a value
// just above a tie (g=1, r|s=1 — round up) from a value below a tie (g=0 —
// round down). A single "something was lost" flag cannot make that
// distinction, and a rounder built on one is wrong.
//
// Shift amounts at or beyond W+2 saturate to W+2. That is not a shortcut:
// once the whole mantissa has passed below the round position, shifting
// further leaves `aligned', `guard' and `round' all zero and `sticky' at
// |mant, so nothing can change again.
//
// PRECONDITION: SHW must be wide enough to express W+2, i.e. 2**SHW > W+2.
//
// This is a DESIGN-INTENT check, not a correctness patch. The arithmetic below
// is right for every parameter pair, including the ones the check rejects: a
// too-narrow `shamt' cannot reach the saturation threshold in the first place,
// so the saturating arm is simply unreachable and the plain shift is already
// correct. What a too-narrow SHW does mean is that NO value of `shamt' can
// command the full W+2 alignment shift -- so whatever computes the exponent
// difference upstream is too narrow too, and will wrap before it ever gets
// here. The generate-if below turns that into an ELABORATION error, which is
// the cheapest place to find it.
module align_sticky #(parameter W = 24, parameter SHW = 5)
  (input  wire [W-1:0]   mant,
   input  wire [SHW-1:0] shamt,
   output wire [W-1:0]   aligned,
   output wire           guard,
   output wire           round,
   output wire           sticky);

  localparam [31:0] SH_MAX = W + 2;

  // Write the width of the 1 down too: an unsized `1' is 32 bits, so `1 << SHW'
  // wraps to 0 at SHW >= 32 and would fire this check on a perfectly good
  // parameter pair. SHW >= 32 is excluded first so the shift is never that wide.
  if (SHW < 32 && (32'd1 << SHW) <= SH_MAX)
    $fatal(1, "align_sticky: SHW is too narrow to express W+2; need 2**SHW > W+2");

  // SH_MAX is a full 32-bit localparam, so `shamt > SH_MAX' is compared at 32
  // bits and the saturation constant cannot be truncated by the comparison.
  // THAT is what makes the saturation correct; narrow SH_MAX to [SHW-1:0] and
  // at W=32, SHW=5 it becomes 32'd34 & 5'h1F = 5'd2 and every shift saturates
  // to 2. The one narrowing left, SH_MAX[SHW-1:0], is written down on purpose
  // and is a no-op: that arm is reachable only when 2**SHW-1 > W+2, and then
  // SH_MAX already fits in SHW bits.
  wire [SHW-1:0]   sh      = (shamt > SH_MAX) ? SH_MAX[SHW-1:0] : shamt;
  wire [2*W+1:0]   ext     = {mant, {(W+2){1'b0}}};
  wire [2*W+1:0]   shifted = ext >> sh;

  assign aligned = shifted[2*W+1 -: W];
  assign guard   = shifted[W+1];
  assign round   = shifted[W];
  assign sticky  = |shifted[W-1:0];

endmodule

`default_nettype wire
