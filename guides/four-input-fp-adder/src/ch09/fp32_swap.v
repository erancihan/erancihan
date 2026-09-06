`timescale 1ns/1ps
`default_nettype none

// Chapter 9: golden step 3 as a module -- magnitude compare and operand
// ordering. The compare runs on the PACKED magnitude bits b[30:0] > a[30:0]
// (chapter 7's encoded-order property), so the packed words come in
// alongside the unpacked fields; that keeps this module line-for-line the
// golden text. (An unpacked-only variant comparing {e, sig} is bit-identical
// -- measured over the full equivalence sweep, and the ordering map is
// provably monotone -- but needs that lemma; this one doesn't.)
//
// Invariant out: {e_big, sig_big} is the larger magnitude. That single fact
// is what makes every downstream width unsigned-safe: the alignment shift
// is always rightward, the subtract never borrows past the top, and the
// result's sign is simply sign_big.
module fp32_swap
  (input  wire [31:0] a,
   input  wire [31:0] b,
   input  wire        sa,
   input  wire        sb,
   input  wire [7:0]  ea,
   input  wire [7:0]  eb,
   input  wire [23:0] siga,
   input  wire [23:0] sigb,
   output wire        sign_big,
   output wire [7:0]  e_big,
   output wire [7:0]  e_sml,
   output wire [23:0] sig_big,
   output wire [23:0] sig_sml,
   output wire        eff_sub);

  wire swap = (b[30:0] > a[30:0]);
  assign sign_big = swap ? sb   : sa;
  assign e_big    = swap ? eb   : ea;
  assign e_sml    = swap ? ea   : eb;
  assign sig_big  = swap ? sigb : siga;
  assign sig_sml  = swap ? siga : sigb;
  assign eff_sub  = sa ^ sb;

endmodule

`default_nettype wire
