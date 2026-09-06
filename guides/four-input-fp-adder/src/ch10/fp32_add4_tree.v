`timescale 1ns/1ps
`default_nettype none

// Chapter 10: the four-input adder, TREE order (a+b)+(c+d).
//
// Pure composition: three chapter-9 fp32_add2 instances, two levels, and
// three OR gates -- no new datapath logic anywhere. Every intermediate is a
// finished binary32 value, so this structure rounds three times and cannot
// be more accurate than three IEEE additions in this association.
//
// The association order AND the port-to-operand mapping are both part of
// this module's arithmetic specification: the multiset {max, max, -max,
// -max} returns qNaN through these ports in this order, +0 when the same
// values arrive interleaved, and +inf through fp32_add4_seq (chapter 10,
// "One Multiset, Three Answers").
//
// Flag composition is a design decision, made explicit here: each of
// invalid/overflow/inexact is the OR across the three component
// operations -- the IEEE 754 "computed as three separate additions"
// reading, in which each operation raises its own exceptions and the
// status flags accumulate. Final-stage-only flags would lose a level-1
// overflow that a later infinity absorbs (Q1 in tb_corners4.v).
module fp32_add4_tree
  (input  wire [31:0] a, b, c, d,
   output wire [31:0] result,
   output wire        invalid,
   output wire        overflow,
   output wire        inexact);

  wire [31:0] sum_ab, sum_cd;
  wire inv_ab, ovf_ab, inx_ab;
  wire inv_cd, ovf_cd, inx_cd;
  wire inv_r,  ovf_r,  inx_r;

  fp32_add2 u_add_ab (.a(a), .b(b), .result(sum_ab),
                      .invalid(inv_ab), .overflow(ovf_ab), .inexact(inx_ab));
  fp32_add2 u_add_cd (.a(c), .b(d), .result(sum_cd),
                      .invalid(inv_cd), .overflow(ovf_cd), .inexact(inx_cd));
  fp32_add2 u_add_r  (.a(sum_ab), .b(sum_cd), .result(result),
                      .invalid(inv_r), .overflow(ovf_r), .inexact(inx_r));

  assign invalid  = inv_ab | inv_cd | inv_r;
  assign overflow = ovf_ab | ovf_cd | ovf_r;
  assign inexact  = inx_ab | inx_cd | inx_r;

endmodule

`default_nettype wire
