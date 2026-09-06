`timescale 1ns/1ps
`default_nettype none

// fp32_add4 -- the guide's flagship: a pipelined four-input IEEE 754
// binary32 adder. The body is chapter 11's fp32_add4_tree_p restated
// under the flagship name: three fp32_add2_p2 instances in chapter 10's
// tree shape (a+b)+(c+d), valid chained level to level
// (u_add_r.in_valid = u_add_ab.out_valid). Two levels x latency 2 =
// latency 4, one quadruple per cycle, and ZERO datapath logic is new:
// every arithmetic wire below is chapter 9's seven stage modules inside
// chapter 11's register banks inside chapter 10's tree.
//
// The composition's ONE design obligation of its own is FLAG ALIGNMENT:
// in the combinational tree the three flags are an OR across the three
// operations, but here level-1 flags for quad n retire at n+2 while
// level-2 flags retire at n+4 -- so the level-1 OR must ride a 2-cycle
// delay line (6 flops) to meet its own transaction at the output.
// Pasting chapter 10's OR in verbatim is the four-input skew bug: 16.0%
// of streamed quads retire wearing a NEIGHBOR's flags while every data
// word stays correct (chapter 11's D6; this chapter's NOFD mutant).
//
// Register cost of the shape, counted from the shipped RTL: 3 x 110 + 6
// = 336 state bits at latency 4. The pipelined sequential chain costs
// latency 6 and 540 bits at the same one-per-cycle throughput (chapter
// 11's count) -- the tree's pipeline advantage is latency AND registers,
// never accuracy (chapter 10 killed that folklore).
//
// rst_n resets CONTROL ONLY (each unit's valid pipe). The datapath
// free-runs: chapter 11 measured that a full datapath reset manufactures
// a defined-looking +inf/overflow out of the illegal all-zeros state
// during fill. Outputs in any cycle where out_valid is low -- the whole
// fill window included -- are unspecified and must be ignored.
module fp32_add4
  (input  wire        clk,
   input  wire        rst_n,
   input  wire        in_valid,
   input  wire [31:0] a, b, c, d,
   output wire [31:0] result,
   output wire        invalid,
   output wire        overflow,
   output wire        inexact,
   output wire        out_valid);

  wire [31:0] sum_ab, sum_cd;
  wire        inv_ab, ovf_ab, inx_ab, v_ab;
  wire        inv_cd, ovf_cd, inx_cd, v_cd;
  wire        inv_r,  ovf_r,  inx_r;

  fp32_add2_p2 u_add_ab (.clk(clk), .rst_n(rst_n), .in_valid(in_valid),
                         .a(a), .b(b), .result(sum_ab), .invalid(inv_ab),
                         .overflow(ovf_ab), .inexact(inx_ab),
                         .out_valid(v_ab));
  fp32_add2_p2 u_add_cd (.clk(clk), .rst_n(rst_n), .in_valid(in_valid),
                         .a(c), .b(d), .result(sum_cd), .invalid(inv_cd),
                         .overflow(ovf_cd), .inexact(inx_cd),
                         .out_valid(v_cd));
  fp32_add2_p2 u_add_r  (.clk(clk), .rst_n(rst_n), .in_valid(v_ab),
                         .a(sum_ab), .b(sum_cd), .result(result),
                         .invalid(inv_r), .overflow(ovf_r),
                         .inexact(inx_r), .out_valid(out_valid));

  // Flags are data with a latency: delay the level-1 OR by u_add_r's
  // 2-cycle latency so it retires with its own transaction.
  wire [2:0] f1 = {inv_ab | inv_cd, ovf_ab | ovf_cd, inx_ab | inx_cd};
  reg  [2:0] f1_d1, f1_d2;
  always @(posedge clk) begin
    f1_d1 <= f1;
    f1_d2 <= f1_d1;
  end
  assign invalid  = f1_d2[2] | inv_r;
  assign overflow = f1_d2[1] | ovf_r;
  assign inexact  = f1_d2[0] | inx_r;

endmodule

`default_nettype wire
