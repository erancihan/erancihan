`timescale 1ns/1ps
`default_nettype none

// Number literals: sizing, bases, underscores, x/z fill, signed forms,
// and the SystemVerilog fill literals. Compiling this file emits exactly one
// warning, on the deliberately over-full 4'd31 near the bottom.
module tb_literals;

  reg [3:0]  q;
  reg [7:0]  w8;
  reg [11:0] f;

  integer errors = 0;

  task expect4;
    input [8*32-1:0] label;
    input [3:0]      got;
    input [3:0]      want;
    begin
      if (got !== want) begin
        errors = errors + 1;
        $display("FAIL %0s : got %b want %b", label, got, want);
      end else $display("  %b  %0s", got, label);
    end
  endtask

  initial begin
    $display("-- bases, all four spellings of the same nibble");
    q = 4'hA;         expect4("4'hA", q, 4'b1010);
    q = 4'o7;         expect4("4'o7", q, 4'b0111);
    q = 4'd9;         expect4("4'd9", q, 4'b1001);
    q = 4'b1010;      expect4("4'b1010", q, 4'b1010);

    $display("-- underscores are cosmetic");
    w8 = 8'b1010_0101;
    if (w8 !== 8'hA5) begin errors = errors + 1; $display("FAIL underscores"); end
    else $display("  %b  8'b1010_0101", w8);

    $display("-- left extension copies the LEFTMOST SPECIFIED digit's kind");
    q = 4'b10;        expect4("4'b10   (0 extends with 0)", q, 4'b0010);
    q = 4'bx1;        expect4("4'bx1   (x extends with x)", q, 4'bxxx1);
    q = 4'bz1;        expect4("4'bz1   (z extends with z)", q, 4'bzzz1);

    $display("-- unsized literals are 32 bits");
    $display("  'h1F = %0d, $bits('h1F) = %0d", 'h1F, $bits('h1F));
    if ('h1F !== 31 || $bits('h1F) !== 32) begin
      errors = errors + 1; $display("FAIL unsized literal");
    end

    $display("-- signed literals");
    if (4'sb1001 !== -4'sd7) begin
      errors = errors + 1; $display("FAIL 4'sb1001 is not -7");
    end else $display("  -7  4'sb1001 read as a signed value");
    if ('sd5 !== 5 || -'sd5 !== -5) begin
      errors = errors + 1; $display("FAIL 'sd5");
    end else $display("  5 / -5  'sd5 and -'sd5");

    $display("-- unary minus happens AFTER the operand grows to the context width");
    w8 = -4'd7;
    if (w8 !== 8'b1111_1001) begin
      errors = errors + 1; $display("FAIL w8 = -4'd7 gave %b", w8);
    end else $display("  %b  w8 = -4'd7   (widened to 8 bits, then negated)", w8);
    q = -4'd1;
    if (q !== 4'b1111) begin
      errors = errors + 1; $display("FAIL q = -4'd1 gave %b", q);
    end else $display("  %b  q  = -4'd1   (stays 4 bits: an unsigned bit pattern)", q);

    $display("-- fill literals (SystemVerilog; need -g2005-sv or later)");
    f = '0; if (f !== 12'b0000_0000_0000) begin errors = errors + 1; $display("FAIL '0"); end
            else $display("  %b  f = '0", f);
    f = '1; if (f !== 12'b1111_1111_1111) begin errors = errors + 1; $display("FAIL '1"); end
            else $display("  %b  f = '1", f);
    f = 'x; if (f !== 12'bxxxx_xxxx_xxxx) begin errors = errors + 1; $display("FAIL 'x"); end
            else $display("  %b  f = 'x", f);
    f = 'z; if (f !== 12'bzzzz_zzzz_zzzz) begin errors = errors + 1; $display("FAIL 'z"); end
            else $display("  %b  f = 'z", f);

    $display("-- a literal too big for its size is truncated (this one DOES warn)");
    q = 4'd31;
    if (q !== 4'b1111) begin errors = errors + 1; $display("FAIL 4'd31"); end
    else $display("  %b  4'd31", q);

    $display("-- the readable way to write an IEEE-754 binary32 constant");
    $display("  32'b0_10000000_00000000000000000000000 = %h (that is 2.0)",
             32'b0_10000000_00000000000000000000000);
    if (32'b0_10000000_00000000000000000000000 !== 32'h4000_0000) begin
      errors = errors + 1; $display("FAIL binary32 2.0 pattern");
    end

    if (errors == 0) $display("PASS tb_literals");
    else             $fatal(1, "FAIL tb_literals: %0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
