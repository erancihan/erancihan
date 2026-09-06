`timescale 1ns/1ps
// NOTE: no `default_nettype none here. That omission is the bug.

// DELIBERATELY WRONG. `good' is declared 4 bits wide and never driven,
// because the continuous assignment below has a typo in the target name.
// Verilog creates `godo' silently as a 1-bit wire.
// This program asserts the WRONG values, so PASS means the trap reproduced.
module bad_implicit;

  reg  [3:0] a, b;
  wire [3:0] good;

  integer errors = 0;

  assign godo = a & b;      // typo: meant `good'

  initial begin
    a = 4'b1100;
    b = 4'b1010;
    #1;
    $display("good = %b   ($bits = %0d)", good, $bits(good));
    $display("godo = %b   ($bits = %0d)", godo, $bits(godo));

    if (good !== 4'bzzzz) begin
      errors = errors + 1;
      $display("FAIL expected `good' to be undriven (zzzz)");
    end
    if ($bits(godo) !== 1) begin
      errors = errors + 1;
      $display("FAIL expected the implicit net `godo' to be 1 bit wide");
    end

    if (errors == 0)
      $display("PASS bad_implicit: trap reproduced, 4-bit result landed in a 1-bit implicit wire");
    else
      $fatal(1, "FAIL bad_implicit: %0d error(s)", errors);
    $finish;
  end

endmodule
