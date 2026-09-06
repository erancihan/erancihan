`timescale 1ns/1ps
`default_nettype none

// Chapter 9: golden step 4 as a module -- the exponent difference, the
// 5-bit clamp, and chapter 2's align_sticky instantiated verbatim at
// W = 24. This wrapper is where the 8-bit difference (0..253, never
// negative -- the swap invariant) is clamped into the 5-bit shift count:
// chapter 2's full-width-localparam lesson, applied at a module boundary
// that now has its own unit testbench.
//
// Port naming is part of the interface: g is the FIRST bit shifted out
// (guard, weight 1/2 ulp of the kept frame), r the SECOND (round), s the
// OR of everything below r (sticky). fp32_addsub packs {aligned, g, r}
// in exactly that order -- the convention bug where two authors read
// g and r oppositely passes both unit suites and only the equivalence
// sweep catches it (this chapter measures that).
//
// Invariant out: {aligned, g, r} plus the sticky bit is the small operand
// EXACTLY, in round-bit units -- nothing lost, only summarized.
module fp32_align
  (input  wire [7:0]  e_big,
   input  wire [7:0]  e_sml,
   input  wire [23:0] sig_sml,
   output wire [23:0] aligned,
   output wire        g,
   output wire        r,
   output wire        s);

  wire [7:0] d     = e_big - e_sml;
  wire [4:0] shamt = (d > 8'd26) ? 5'd26 : d[4:0];

  align_sticky #(.W(24), .SHW(5)) u_core
    (.mant(sig_sml), .shamt(shamt),
     .aligned(aligned), .guard(g), .round(r), .sticky(s));

endmodule

`default_nettype wire
