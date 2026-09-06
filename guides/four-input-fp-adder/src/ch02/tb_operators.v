`timescale 1ns/1ps
`default_nettype none

// Reduction operators, logical vs bitwise, the four equality operators,
// concatenation and replication. Everything here is checked, including the
// cases whose correct answer is x.
module tb_operators;

  reg [7:0]  a, b;
  reg [23:0] sticky_src;
  reg        took_else;

  integer errors = 0;

  task expect1;
    input [8*48-1:0] label;
    input            got;
    input            want;
    begin
      if (got !== want) begin
        errors = errors + 1;
        $display("FAIL %0s : got %b want %b", label, got, want);
      end else $display("  %b  %0s", got, label);
    end
  endtask

  task expect8;
    input [8*48-1:0] label;
    input [7:0]      got;
    input [7:0]      want;
    begin
      if (got !== want) begin
        errors = errors + 1;
        $display("FAIL %0s : got %b want %b", label, got, want);
      end else $display("  %b  %0s", got, label);
    end
  endtask

  initial begin
    a = 8'b1011_0010;
    $display("-- reduction operators on a = %b", a);
    expect1("&a   (all ones?)",       &a,  1'b0);
    expect1("|a   (any one?)",        |a,  1'b1);
    expect1("^a   (odd parity?)",     ^a,  1'b0);
    expect1("~&a",                    ~&a, 1'b1);
    expect1("~|a  (is a zero?)",      ~|a, 1'b0);
    expect1("~^a",                    ~^a, 1'b1);

    a = 8'h00;
    $display("-- zero detect on a = %b", a);
    expect1("|a  on all-zeros",  |a,  1'b0);
    expect1("~|a on all-zeros",  ~|a, 1'b1);

    $display("-- x propagates through reductions selectively");
    a = 8'b1011_001x;
    expect1("|a  with one x, but a 1 elsewhere", |a, 1'b1);
    expect1("&a  with one x, but a 0 elsewhere", &a, 1'b0);
    expect1("^a  with one x  (parity cannot resolve)", ^a, 1'bx);
    a = 8'b0000_000x;
    expect1("|a  when the x is the only candidate", |a, 1'bx);

    $display("-- logical vs bitwise: a = 8'b0000_0010, b = 8'b0000_0100");
    a = 8'b0000_0010;
    b = 8'b0000_0100;
    expect1("a && b", a && b, 1'b1);
    expect8("a &  b", a &  b, 8'b0000_0000);
    expect1("a || b", a || b, 1'b1);
    expect8("a |  b", a |  b, 8'b0000_0110);
    expect1("!a",     !a,     1'b0);
    expect8("~a",     ~a,     8'b1111_1101);

    $display("-- equality: a = 8'b1010_101x, b = 8'b1010_1010");
    a = 8'b1010_101x;
    b = 8'b1010_1010;
    expect1("a ==  b", a ==  b, 1'bx);
    expect1("a === b", a === b, 1'b0);
    expect1("a !== b", a !== b, 1'b1);
    expect1("8'bx === 8'bx", 8'bx === 8'bx, 1'b1);
    expect1("8'bx ==  8'bx", 8'bx ==  8'bx, 1'bx);

    took_else = 1'b0;
    if (a == b) took_else = 1'b0; else took_else = 1'b1;
    expect1("if (a == b) took the ELSE branch", took_else, 1'b1);

    $display("-- wildcard equality: wildcards allowed only on the RIGHT");
    expect1("4'b1010 ==? 4'b10zz", 4'b1010 ==? 4'b10zz, 1'b1);
    expect1("4'b1010 ==? 4'b11zz", 4'b1010 ==? 4'b11zz, 1'b0);
    expect1("4'b1010 !=? 4'b10zz", 4'b1010 !=? 4'b10zz, 1'b0);

    $display("-- concatenation and replication");
    expect8("{4'hA, 4'h5}",  {4'hA, 4'h5},  8'hA5);
    expect8("{2{4'b0010}}",  {2{4'b0010}},  8'h22);
    if ({3{2'b10}} !== 6'b101010) begin
      errors = errors + 1; $display("FAIL {3{2'b10}}");
    end else $display("  101010  {3{2'b10}}");

    // A right-shift of 5 discards sticky_src[4:0]. The top discarded bit is
    // the guard, the next one down is the round, and the STICKY bit is the
    // reduction OR of what is left below them -- not of all five.
    $display("-- guard, round and sticky for a right-shift of 5");
    sticky_src = 24'h000010;
    $display("   sticky_src = 24'h%h   bits [7:0] = 8'b%b", sticky_src,
             sticky_src[7:0]);
    expect1("sticky_src[4]     guard",  sticky_src[4],     1'b1);
    expect1("sticky_src[3]     round",  sticky_src[3],     1'b0);
    expect1("|sticky_src[2:0]  sticky", |sticky_src[2:0],  1'b0);
    sticky_src = 24'h000011;
    $display("   sticky_src = 24'h%h   bits [7:0] = 8'b%b", sticky_src,
             sticky_src[7:0]);
    expect1("sticky_src[4]     guard",  sticky_src[4],     1'b1);
    expect1("sticky_src[3]     round",  sticky_src[3],     1'b0);
    expect1("|sticky_src[2:0]  sticky", |sticky_src[2:0],  1'b1);

    if (errors == 0) $display("PASS tb_operators");
    else             $fatal(1, "FAIL tb_operators: %0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
