`timescale 1ns/1ps
`default_nettype none

// Chapter 10: the four-input adder, SEQUENTIAL order ((a+b)+c)+d.
//
// The same three fp32_add2 instances as the tree -- any association of n
// operands uses exactly n-1 two-input adds -- but chained: combinational
// depth 3 adder-delays instead of 2, and under chapter 11's pipelining the
// operands c and d need delay-matching registers (S and 2S cycles x 32
// bits) that the tree does not. This is also the association an
// accumulator-plus-multiplexer design computes by construction.
//
// Neither structure is systematically closer to the correctly rounded
// four-operand sum (chapter 10 measures this on 1.2M quadruples); the
// tree/seq choice is a latency/area/pipelining decision, not an accuracy
// decision. Flags are OR-accumulated across the three operations, same
// rule and same reasoning as fp32_add4_tree.
module fp32_add4_seq
  (input  wire [31:0] a, b, c, d,
   output wire [31:0] result,
   output wire        invalid,
   output wire        overflow,
   output wire        inexact);

  wire [31:0] sum_ab, sum_abc;
  wire inv1, ovf1, inx1;
  wire inv2, ovf2, inx2;
  wire inv3, ovf3, inx3;

  fp32_add2 u_add1 (.a(a), .b(b), .result(sum_ab),
                    .invalid(inv1), .overflow(ovf1), .inexact(inx1));
  fp32_add2 u_add2 (.a(sum_ab), .b(c), .result(sum_abc),
                    .invalid(inv2), .overflow(ovf2), .inexact(inx2));
  fp32_add2 u_add3 (.a(sum_abc), .b(d), .result(result),
                    .invalid(inv3), .overflow(ovf3), .inexact(inx3));

  assign invalid  = inv1 | inv2 | inv3;
  assign overflow = ovf1 | ovf2 | ovf3;
  assign inexact  = inx1 | inx2 | inx3;

endmodule

`default_nettype wire
