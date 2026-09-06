`timescale 1ns/1ps
`default_nettype none

// Round-to-nearest-even, the IEEE 754 default rounding mode, expressed as the
// one-bit decision "add 1 to the kept significand?".
//
// This is the module that shows why `align_sticky.v' must expose guard, round
// and sticky separately. The whole rule reads off the three bits:
//
//   guard = 0                  below a tie      -> round down (no increment)
//   guard = 1, round|sticky=1  above a tie      -> round up   (increment)
//   guard = 1, round|sticky=0  an EXACT tie     -> break to even: increment
//                                                 only if the kept LSB is 1
//
// Collapse guard, round and sticky into a single "something was lost" flag and
// the middle and bottom rows become indistinguishable, which is precisely the
// bug this module exists to rule out.
module round_ne
  (input  wire lsb,        // least significant bit of the kept significand
   input  wire guard,
   input  wire round,
   input  wire sticky,
   output wire round_up);

  wire above_tie = guard & (round | sticky);
  wire exact_tie = guard & ~(round | sticky);

  assign round_up = above_tie | (exact_tie & lsb);

endmodule

`default_nettype wire
