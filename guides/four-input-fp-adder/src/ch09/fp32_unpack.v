`timescale 1ns/1ps
`default_nettype none

// Chapter 9: golden step 1 as a module -- the field decode for both
// operands, by instantiating chapter 7's fp32_fields twice rather than
// re-deriving its three assignments.
//
// Invariant out: every finite operand is now (-1)^s * sig * 2^(e-127-23)
// with NO subnormal special case anywhere downstream -- e is the effective
// exponent max(E,1), sig is {hidden, F}. For E = 255 patterns the fields
// are driven but meaningless; fp32_screen decides those results and the
// datapath's output is ignored ("don't care under screen").
module fp32_unpack
  (input  wire [31:0] a,
   input  wire [31:0] b,
   output wire        sa,
   output wire        sb,
   output wire [7:0]  ea,      // effective exponent max(E,1)
   output wire [7:0]  eb,
   output wire [23:0] siga,    // {hidden, F}
   output wire [23:0] sigb);

  wire [7:0]  e_raw_a, e_raw_b;
  wire [22:0] fr_a, fr_b;
  wire        hid_a, hid_b;

  fp32_fields u_fa (.w(a), .sign(sa), .e_raw(e_raw_a), .frac(fr_a),
                    .hidden(hid_a), .sig(siga), .e_eff(ea));
  fp32_fields u_fb (.w(b), .sign(sb), .e_raw(e_raw_b), .frac(fr_b),
                    .hidden(hid_b), .sig(sigb), .e_eff(eb));

endmodule

`default_nettype wire
