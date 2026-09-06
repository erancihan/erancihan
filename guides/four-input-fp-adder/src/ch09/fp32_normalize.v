`timescale 1ns/1ps
`default_nettype none

// Chapter 9: golden steps 6-7 as a module -- right-1 / none / left-N with
// the subnormal stop at effective exponent 1. The LZC stays inside as the
// same lzc26 function (a wider datapath would extract it; a 2-input adder
// gains nothing). Everything the function reads arrives as an ARGUMENT --
// this chapter measures why that is a rule, not a preference.
//
// e_norm is the ONE width in the design that grows across a boundary:
// e_big + 1 on right-1 can reach 255 and must stay distinguishable from
// the overflow arithmetic in fp32_round_pack (where e_rnd can reach 256),
// so e_norm carries a ninth bit. Wire it to an 8-bit net and Icarus
// warns -- with the same diagnostic text it uses for a truncation that
// zeroes the adder (this chapter measures both).
//
// Invariant out: either nsig[23] is set or e_norm == 1 -- the
// still-unnormalized case is exactly the gradual-underflow encoding.
module fp32_normalize
  (input  wire        eff_sub,
   input  wire [26:0] sum27,
   input  wire        s_in,       // alignment sticky, passing through
   input  wire [7:0]  e_big,
   output wire [23:0] nsig,
   output wire        ng,
   output wire        nr,
   output wire        ns,
   output wire [8:0]  e_norm);

  wire        carry  = sum27[26];
  wire        right1 = ~eff_sub & carry;
  wire [25:0] frame  = sum27[25:0];

  function [4:0] lzc26(input [25:0] v);
    integer i;
    begin
      lzc26 = 5'd26;
      for (i = 0; i <= 25; i = i + 1)
        if (v[25 - i] == 1'b1 && lzc26 == 5'd26)
          lzc26 = i[4:0];
    end
  endfunction

  wire [4:0]  lz     = lzc26(frame);
  wire [7:0]  e_lim  = e_big - 8'd1;
  wire [7:0]  shl8   = ({3'b000, lz} > e_lim) ? e_lim : {3'b000, lz};
  wire [4:0]  shl    = shl8[4:0];
  wire [25:0] framel = frame << shl;

  assign nsig   = right1 ? sum27[26:3]       : framel[25:2];
  assign ng     = right1 ? sum27[2]          : framel[1];
  assign nr     = right1 ? sum27[1]          : framel[0];
  assign ns     = right1 ? (s_in | sum27[0]) : s_in;
  assign e_norm = right1 ? ({1'b0, e_big} + 9'd1)
                         : ({1'b0, e_big} - {4'b0000, shl});

endmodule

`default_nettype wire
