`timescale 1ns/1ps
`default_nettype none

// Chapter 6: a Q4.4 saturating adder.
//
// The format is a comment: a and b are 8-bit two's-complement integers that
// the DESIGNER reads as value = raw / 16, range [-8.0, +7.9375], step 0.0625.
// The hardware below never knows that. It widens by one bit so no information
// is lost, detects signed overflow with the top-two-bits rule, and then
// chooses a policy: y_wrap is what the bare adder gives (mod 2^8), y_sat
// clamps to the nearest representable extreme.
module satq44
  (input  wire signed [7:0] a,       // Q4.4
   input  wire signed [7:0] b,       // Q4.4
   output wire signed [7:0] y_wrap,  // Q4.4, wraparound policy
   output wire signed [7:0] y_sat,   // Q4.4, saturation policy
   output wire              ovf);    // the overflow that y_wrap hides

  wire signed [8:0] full = a + b;    // widen by one: no information lost

  assign y_wrap = full[7:0];         // wraparound = just drop the top bit
  assign ovf    = full[8] ^ full[7]; // top-two-bits rule ("Carry Is Not
                                     // Overflow"): sign bit vs the bit above
  assign y_sat  = !ovf    ? full[7:0] :
                  full[8] ? 8'h80 :  // negative overflow -> -8.0
                            8'h7f;   // positive overflow -> +7.9375

endmodule

`default_nettype wire
