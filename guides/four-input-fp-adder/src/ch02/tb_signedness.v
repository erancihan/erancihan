`timescale 1ns/1ps
`default_nettype none

// Signed/unsigned contamination, in the four places it does damage:
// division, multiplication, comparison, and the arithmetic right shift.
// The law being demonstrated: an expression is signed only if EVERY operand
// is signed. One unsigned operand reinterprets the bits of all the others.
module tb_signedness;

  reg signed [7:0] sa, sb;
  reg        [7:0] ua2, uhi;

  reg signed [3:0] s4;
  reg        [3:0] u4;
  reg signed [3:0] s4b;

  reg signed [7:0] r8s;
  reg        [7:0] r8u;
  reg signed [7:0] s8;

  integer errors = 0;

  task expect_i;
    input [8*40-1:0] label;
    input integer    got;
    input integer    want;
    begin
      if (got !== want) begin
        errors = errors + 1;
        $display("FAIL %0s : got %0d want %0d", label, got, want);
      end else begin
        $display("  %0d\t%0s", got, label);
      end
    end
  endtask

  task expect_b;
    input [8*40-1:0] label;
    input [7:0]      got;
    input [7:0]      want;
    begin
      if (got !== want) begin
        errors = errors + 1;
        $display("FAIL %0s : got %b want %b", label, got, want);
      end else begin
        $display("  %b\t%0s", got, label);
      end
    end
  endtask

  initial begin
    sa  = -8'sd8;
    sb  =  8'sd3;
    ua2 =  8'd2;
    uhi =  8'b1000_0000;

    $display("-- division and remainder, sa = -8, sb = 3, ua2 = 2 (unsigned)");
    r8s = sa / sb;             expect_i("sa / sb",             r8s, -2);
    r8s = sa / ua2;            expect_i("sa / ua2",            r8s, 124);
    r8s = sa / $signed(ua2);   expect_i("sa / $signed(ua2)",   r8s, -4);
    r8s = sa % sb;             expect_i("sa % sb",             r8s, -2);
    r8s = 8'sd8 % -8'sd3;      expect_i("8 % -3",              r8s,  2);

    $display("-- multiplication, s4 = -2 (4-bit signed)");
    s4 = -4'sd2;
    r8s = s4 * 2;              expect_i("s4 * 2",              r8s, -4);
    r8s = s4 * 4'd2;           expect_i("s4 * 4'd2",           r8s, 28);
    r8s = s4 * $signed(4'd2);  expect_i("s4 * $signed(4'd2)",  r8s, -4);

    $display("-- comparison");
    if ((-8'sd1 < 8'd0) !== 1'b0) begin
      errors = errors + 1; $display("FAIL (-8'sd1 < 8'd0) was not 0");
    end else $display("  0\t(-8'sd1 < 8'd0)              one unsigned operand, so -1 reads as 255");
    if (($signed(8'hFF) < $signed(8'h00)) !== 1'b1) begin
      errors = errors + 1; $display("FAIL ($signed(8'hFF) < $signed(8'h00)) was not 1");
    end else $display("  1\t($signed(8'hFF) < $signed(8'h00))");

    $display("-- shifts, sa = -8 signed, uhi = 8'b1000_0000 unsigned");
    r8u = sa >> 1;             expect_b("sa >> 1",             r8u, 8'b0111_1100);
    r8u = sa >>> 1;            expect_b("sa >>> 1",            r8u, 8'b1111_1100);
    r8u = uhi >>> 1;           expect_b("uhi >>> 1",           r8u, 8'b0100_0000);
    r8u = $signed(uhi) >>> 1;  expect_b("$signed(uhi) >>> 1",  r8u, 8'b1100_0000);

    $display("-- extension is decided by the SOURCE's signedness, not the target's");
    u4  = 4'b1001;
    s4b = 4'b1001;
    r8u = u4;                  expect_b("unsigned 4'b1001 -> [7:0]",       r8u, 8'b0000_1001);
    s8  = s4b;                 expect_b("signed   4'b1001 -> signed [7:0]", s8,  8'b1111_1001);
    r8u = s4b;                 expect_b("signed   4'b1001 -> UNSIGNED [7:0]", r8u, 8'b1111_1001);

    $display("-- concatenation results are always unsigned");
    r8u = {s4};                expect_b("r8u = {s4}",          r8u, 8'b0000_1110);
    r8u = s4;                  expect_b("r8u = s4",            r8u, 8'b1111_1110);
    if (({s4} < 0) !== 1'b0 || (s4 < 0) !== 1'b1) begin
      errors = errors + 1; $display("FAIL concatenation did not strip signedness");
    end else $display("  0/1\t({s4} < 0) = 0 but (s4 < 0) = 1");

    if (errors == 0) $display("PASS tb_signedness");
    else             $fatal(1, "FAIL tb_signedness: %0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
