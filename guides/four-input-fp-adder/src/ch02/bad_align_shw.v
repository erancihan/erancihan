`timescale 1ns/1ps
`default_nettype none

// DELIBERATELY WRONG, AND IT DOES NOT COMPILE — that is the point.
//
// W=32 with SHW=5 is a plausible-looking padded significand, but 2**5 = 32 is
// not greater than W+2 = 34, so the largest shift this port can ask for is 31
// and the full alignment shift of 34 is unreachable.
//
// Be clear about what is and is not wrong here. `align_sticky.v' would still
// compute correct outputs for all 32 shift amounts a 5-bit port can express --
// this pair is refused on DESIGN INTENT, not on arithmetic. An instance that
// can never fully align a 32-bit significand is being fed by exponent-
// difference logic that is too narrow, and that bug lives upstream where
// align_sticky.v cannot see it. The generate-if there turns this pair into an
// ELABORATION error so it surfaces at build time, which is why targets.txt
// lists this file as `xfail'.
module bad_align_shw
  (input  wire [31:0] mant,
   input  wire [4:0]  shamt,
   output wire [31:0] aligned,
   output wire        guard,
   output wire        round,
   output wire        sticky);

  align_sticky #(.W(32), .SHW(5)) u_bad
    (.mant(mant), .shamt(shamt), .aligned(aligned),
     .guard(guard), .round(round), .sticky(sticky));

endmodule

`default_nettype wire
