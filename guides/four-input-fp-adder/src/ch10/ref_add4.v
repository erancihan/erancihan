`timescale 1ns/1ps
`default_nettype none

// Chapter 10: order-faithful chained-golden references -- reference style A.
//
// Three ch08 fp32_add_alg instances wired in EXACTLY the composition order
// of the structure under test, flags ORed the same way. Since chapter 9
// proved fp32_add2 bit-identical to fp32_add_alg (result and all three
// flags, NaN sign included, 200,092 checks), each chained reference must
// match its DUT exactly -- NaN bit patterns included -- and tb_equiv4.v
// holds it to that.
//
// The one thing these references must never do is sum in any OTHER order:
// chapter 10 measures the two associations differing on up to 30 % of
// clustered-exponent quadruples, so an order-unfaithful reference "fails"
// a correct DUT at exactly that rate (mutation C in the README).
module ref_add4_tree
  (input  wire [31:0] a, b, c, d,
   output wire [31:0] result,
   output wire invalid, overflow, inexact);
  wire [31:0] s1, s2;
  wire i1,o1,x1, i2,o2,x2, i3,o3,x3;
  fp32_add_alg r_ab (.a(a), .b(b), .result(s1), .invalid(i1), .overflow(o1), .inexact(x1));
  fp32_add_alg r_cd (.a(c), .b(d), .result(s2), .invalid(i2), .overflow(o2), .inexact(x2));
  fp32_add_alg r_r  (.a(s1), .b(s2), .result(result), .invalid(i3), .overflow(o3), .inexact(x3));
  assign invalid = i1|i2|i3; assign overflow = o1|o2|o3; assign inexact = x1|x2|x3;
endmodule

module ref_add4_seq
  (input  wire [31:0] a, b, c, d,
   output wire [31:0] result,
   output wire invalid, overflow, inexact);
  wire [31:0] s1, s2;
  wire i1,o1,x1, i2,o2,x2, i3,o3,x3;
  fp32_add_alg r1 (.a(a), .b(b), .result(s1), .invalid(i1), .overflow(o1), .inexact(x1));
  fp32_add_alg r2 (.a(s1), .b(c), .result(s2), .invalid(i2), .overflow(o2), .inexact(x2));
  fp32_add_alg r3 (.a(s2), .b(d), .result(result), .invalid(i3), .overflow(o3), .inexact(x3));
  assign invalid = i1|i2|i3; assign overflow = o1|o2|o3; assign inexact = x1|x2|x3;
endmodule

`default_nettype wire
