`timescale 1ns/1ps
`default_nettype none

// DELIBERATELY WRONG, AND DELIBERATELY DOES NOT COMPILE.
// This is bad_implicit.v with `default_nettype none turned on. The same typo
// is now a hard elaboration error instead of a silent 1-bit wire. Run it to
// see the error text; there is nothing to simulate.
module bad_nettype_none;

  reg  [3:0] a, b;
  wire [3:0] good;

  assign godo = a & b;      // typo: meant `good'

  initial begin
    a = 4'b1100;
    b = 4'b1010;
    #1 $display("good = %b", good);
    $finish;
  end

endmodule

`default_nettype wire
