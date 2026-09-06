`timescale 1ns/1ps
`default_nettype none

// Chapter 9: golden steps 8-9 as a module -- the RNE decision, the
// rounding-carry renormalize, the pack, and the datapath's flag bits.
//
// This module owns the second renormalize (rsig[24]) -- the path chapter
// 8 measured firing 0 times in 1,000,000 random pairs. At module level it
// is trivially reachable (nsig = FFFFFF, G and R set -- you just write it
// down); tb_normround_u does, and tb_corners_split's coverage gate proves
// the composed design still reaches it through the four directed vectors.
//
// e_rnd is 9-bit arithmetic on the 9-bit e_norm: the renormalize can push
// 255 to 256, and overflow detection (e_rnd > 254) must see that value,
// not its 8-bit wrap. inexact_dp = ovf | G | R | S: an overflowed result
// (infinity) is never the exact sum, so exact-sum overflow still raises
// inexact. exact_zero wins the pack outright: +0 by rule, not by datapath.
module fp32_round_pack
  (input  wire        sign,
   input  wire        exact_zero,
   input  wire [23:0] nsig,
   input  wire        ng,
   input  wire        nr,
   input  wire        ns,
   input  wire [8:0]  e_norm,
   output wire [31:0] dp_res,
   output wire        ovf,
   output wire        inexact_dp);

  wire        lbit         = nsig[0];
  wire        round_up     = ng & (nr | ns | lbit);
  wire [24:0] rsig         = {1'b0, nsig} + {24'd0, round_up};
  wire        round_renorm = rsig[24];
  wire [23:0] fsig         = round_renorm ? 24'h800000 : rsig[23:0];
  wire [8:0]  e_rnd        = e_norm + {8'd0, round_renorm};

  assign ovf = (e_rnd > 9'd254);
  assign dp_res =
      exact_zero ? 32'h00000000 :
      ovf        ? {sign, 8'd255, 23'd0} :
      fsig[23]   ? {sign, e_rnd[7:0], fsig[22:0]} :
                   {sign, 8'd0,       fsig[22:0]};
  assign inexact_dp = ovf | ng | nr | ns;

endmodule

`default_nettype wire
