`timescale 1ns/1ps
`default_nettype none

// Expression width: self-determined vs context-determined operands, and the
// silent truncations they cause. Every line below is checked against the
// value the LRM's two-pass width algorithm predicts; if your simulator
// disagrees with any of them, stop and find out why before writing an adder.
module tb_widths;

  reg [3:0]  a, b;
  reg [3:0]  r4;
  reg [7:0]  r8;
  reg [15:0] r16;
  reg [31:0] n32;
  reg [63:0] big;

  integer errors = 0;

  task check8;
    input [8*24-1:0] label;
    input [7:0]      got;
    input [7:0]      want;
    begin
      if (got !== want) begin
        errors = errors + 1;
        $display("FAIL %0s : got %b want %b", label, got, want);
      end else begin
        $display("  %b   %0s", got, label);
      end
    end
  endtask

  initial begin
    a = 4'hF;
    b = 4'h1;   // a + b = 16, which needs five bits

    $display("a = %h, b = %h, so a + b needs 5 bits", a, b);

    r8 = a + b;                     check8("r8 = a + b",              r8, 8'b0001_0000);
    r4 = a + b;    r8 = {4'b0, r4}; check8("r4 = a + b   (truncated)", r8, 8'b0000_0000);
    r8 = {a + b};                   check8("r8 = {a + b}",            r8, 8'b0000_0000);
    r8 = {1'b0, a + b};             check8("r8 = {1'b0, a + b}",      r8, 8'b0000_0000);
    r8 = {2{a + b}};                check8("r8 = {2{a + b}}",         r8, 8'b0000_0000);
    r8 = {4'b0, a} + {4'b0, b};     check8("r8 = {4'b0,a}+{4'b0,b}",  r8, 8'b0001_0000);
    r8 = a ? (a + b) : 8'hFF;       check8("r8 = a ? (a+b) : 8'hFF",  r8, 8'b0001_0000);

    // Unary ~ is context-determined too: its operand grows to the expression
    // width before it is inverted. If (a+b) had stayed 4 bits, ~4'b0000 would
    // be 4'b1111 and r8 would read 0000_1111.
    r8 = ~(a + b);                  check8("r8 = ~(a + b)",           r8, 8'b1110_1111);
    // Unary ! is the exception -- self-determined, and always one bit.
    r8 = {7'b0, !(a + b)};          check8("r8 = {7'b0, !(a + b)}",   r8, 8'b0000_0001);

    // The right operand of a shift is self-determined; the left one is not.
    r16 = 16'h0001 << (a + b);
    if (r16 !== 16'h0001) begin
      errors = errors + 1;
      $display("FAIL 16'h1 << (a+b) : got %h want 0001", r16);
    end else $display("  %h  r16 = 16'h0001 << (a + b)        (a+b evaluated at 4 bits = 0)", r16);

    r16 = 16'h0001 << ({1'b0, a} + {1'b0, b});
    if (r16 !== 16'h0000) begin
      errors = errors + 1;
      $display("FAIL 16'h1 << widened(a+b) : got %h want 0000", r16);
    end else $display("  %h  r16 = 16'h0001 << ({1'b0,a}+{1'b0,b})  (shift count really is 16)", r16);

    // Comparison operands size against each other, not against the 1-bit
    // result. The literal on the right rescued the addition on the left.
    if (((a + b) == 5'd16) !== 1'b1) begin
      errors = errors + 1;
      $display("FAIL ((a+b) == 5'd16) was not 1");
    end else $display("  1   ((a + b) == 5'd16)   -- the 5-bit literal widened the add");

    if (((a + b) == 4'd0) !== 1'b1) begin
      errors = errors + 1;
      $display("FAIL ((a+b) == 4'd0) was not 1");
    end else $display("  1   ((a + b) == 4'd0)    -- the 4-bit literal did not");

    // The unsized-literal shift, in three contexts.
    big = 1 << 40;
    if (big !== 64'h0000_0100_0000_0000) begin
      errors = errors + 1; $display("FAIL 64-bit ctx 1<<40 = %h", big);
    end else $display("  %h  big = 1 << 40            (64-bit context: correct)", big);

    n32 = 1 << 40;
    if (n32 !== 32'h0000_0000) begin
      errors = errors + 1; $display("FAIL 32-bit ctx 1<<40 = %h", n32);
    end else $display("  %h          n32 = 1 << 40            (32-bit context: lost)", n32);

    big = {1'b1 << 40};
    if (big !== 64'h0) begin
      errors = errors + 1; $display("FAIL {1'b1<<40} = %h", big);
    end else $display("  %h  big = {1'b1 << 40}       (self-determined: lost)", big);

    big = {32'd1 << 40};
    if (big !== 64'h0) begin
      errors = errors + 1; $display("FAIL {32'd1<<40} = %h", big);
    end else $display("  %h  big = {32'd1 << 40}      (self-determined: lost)", big);

    // Silent truncation on assignment. No warning is emitted for this, at any
    // -W setting. Compare with a too-wide literal, which does warn.
    r4 = 8'hFF;
    if (r4 !== 4'b1111) begin
      errors = errors + 1; $display("FAIL r4 = 8'hFF gave %b", r4);
    end else $display("  %b        r4 = 8'hFF               (silent: no diagnostic at all)", r4);

    // Widths of things, for reference.
    $display("$bits('h1F) = %0d, $bits(42) = %0d, $bits('1) = %0d",
             $bits('h1F), $bits(42), $bits('1));
    if ($bits('h1F) !== 32 || $bits(42) !== 32 || $bits('1) !== 1) begin
      errors = errors + 1;
      $display("FAIL unexpected literal widths");
    end

    if (errors == 0) $display("PASS tb_widths");
    else             $fatal(1, "FAIL tb_widths: %0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
