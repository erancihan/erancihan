`timescale 1ns/1ps
`default_nettype none

// DELIBERATELY WRONG. The procedural spelling of the same width bug.
// `carry' is one bit, so (a + b) >> 8 is evaluated in a 1-bit context. Icarus
// constant-folds the whole expression, discovers the block reads nothing, and
// warns that the always block can never trigger — so `carry' stays x forever.
// PASS here means the trap reproduced.
module bad_carry_always;

  reg [7:0] a, b;
  reg [7:0] sum;
  reg       carry;

  integer errors = 0;

  always @(*) sum   = a + b;
  always @(*) carry = (a + b) >> 8;

  initial begin
    a = 8'd200; b = 8'd100;
    #1;
    $display("a=%0d b=%0d -> sum=%0d carry=%b", a, b, sum, carry);
    if (sum !== 8'd44) begin
      errors = errors + 1;
      $display("FAIL expected the truncated sum 44");
    end
    if (carry !== 1'bx) begin
      errors = errors + 1;
      $display("FAIL expected carry to be stuck at x");
    end

    if (errors == 0)
      $display("PASS bad_carry_always: trap reproduced, carry never evaluated");
    else
      $fatal(1, "FAIL bad_carry_always: %0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
