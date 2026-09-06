`timescale 1ns/1ps
`default_nettype none

// Chapter 9: unit testbench for fp32_addsub. Six directed vectors from the
// contract: a plain add; carry-out at maximal operands; a subtract with G
// live; the sticky borrow (the truncated difference is one too big when
// sticky is set -- the expected 0FFFFFC is one LESS than big27 - sml27);
// an exact zero; and a zero-operand ADD, where exact_zero must stay 0
// (dropping that eff_sub gate is the chapter's worked example of a latent
// interface bug: this vector kills it, 200,092 end-to-end checks cannot).
// Expected values from an independent python3 model, pasted as constants.
//
// What this bench deliberately does NOT do: drive eff_sub = 1 with
// sum27[26] destined to be 1. That input violates the upstream swap
// invariant, and the contract has no expected output there -- a unit test
// tests the contract, not the input type's full cross product.
module tb_addsub_u;
  reg         eff_sub;
  reg  [23:0] big, alg;
  reg         g, r, s;
  wire [26:0] sum27;
  wire        ez;
  integer errors, checks;
  fp32_addsub dut (.eff_sub(eff_sub), .sig_big(big), .aligned(alg),
                   .g(g), .r(r), .s(s), .sum27(sum27), .exact_zero(ez));
  initial begin : watchdog
    #100000;
    $display("FAIL tb_addsub_u: timeout");
    $fatal(1, "timeout");
  end
  task chk(input es_i, input [23:0] b_i, input [23:0] a_i,
           input gi, input ri, input si, input [26:0] esum, input eez);
    begin
      eff_sub = es_i; big = b_i; alg = a_i; g = gi; r = ri; s = si; #1;
      if ({sum27, ez} !== {esum, eez}) begin
        errors = errors + 1;
        $display("FAIL tb_addsub_u es=%b big=%h al=%h grs=%b%b%b: got %h/%b want %h/%b",
                 es_i, b_i, a_i, gi, ri, si, sum27, ez, esum, eez);
      end
      checks = checks + 1;
    end
  endtask
  initial begin
    errors = 0; checks = 0;
    chk(0, 24'h800000, 24'h400000, 0, 0, 0, 27'h3000000, 0); // add, plain
    chk(0, 24'hFFFFFF, 24'hFFFFFF, 1, 1, 1, 27'h7FFFFFB, 0); // add, carry out
    chk(1, 24'h800000, 24'h7FFFFF, 1, 0, 0, 27'h0000002, 0); // sub, G live
    chk(1, 24'h800000, 24'h400000, 1, 1, 1, 27'h0FFFFFC, 0); // sticky borrow
    chk(1, 24'hC90FDB, 24'hC90FDB, 0, 0, 0, 27'h0000000, 1); // exact zero
    chk(0, 24'h000000, 24'h000000, 0, 0, 0, 27'h0000000, 0); // zero ADD: ez=0
    if (checks !== 6)
      $fatal(1, "FAIL tb_addsub_u: %0d checks ran, expected 6", checks);
    if (errors !== 0)
      $fatal(1, "FAIL tb_addsub_u: %0d error(s)", errors);
    $display("PASS tb_addsub_u (6 directed)");
    $finish;
  end
endmodule

`default_nettype wire
