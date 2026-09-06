`timescale 1ns/1ps
`default_nettype none

// The same adder in Verilog-1995 non-ANSI style. Shown once so you can read
// old code. Note that every port name appears three times: in the header
// list, in the direction declaration, and (optionally) in a type declaration.
module adder_1995 (a, b, cin, sum, cout);

  parameter W = 8;

  input  wire [W-1:0] a;
  input  wire [W-1:0] b;
  input  wire         cin;
  output wire [W-1:0] sum;
  output wire         cout;

  assign {cout, sum} = a + b + cin;

endmodule

`default_nettype wire
