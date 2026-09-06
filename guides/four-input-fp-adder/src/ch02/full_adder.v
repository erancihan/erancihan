`timescale 1ns/1ps
`default_nettype none

// Chapter 1's full adder, written structurally out of gate primitives.
// Gate primitives take the OUTPUT as their first port.
//   sum  = a XOR b XOR cin
//   cout = a.b + (a XOR b).cin
module full_adder
  (input  wire a,
   input  wire b,
   input  wire cin,
   output wire sum,
   output wire cout);

  wire ab, ab_cin, a_and_b;

  xor g_ab   (ab,      a,  b);
  xor g_sum  (sum,     ab, cin);
  and g_maj1 (a_and_b, a,  b);
  and g_maj2 (ab_cin,  ab, cin);
  or  g_cout (cout,    a_and_b, ab_cin);

endmodule

`default_nettype wire
