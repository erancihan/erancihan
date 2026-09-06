`timescale 1ns/1ps
`default_nettype none

// Chapter 13: equivalence sweep, the SystemVerilog normalize stage against
// the SHIPPED chapter 9 module, instantiated side by side from one stimulus.
// !== on the concatenation {nsig, ng, nr, ns, e_norm}, with an all-X guard
// on the reference so a wholly undriven design cannot pass (chapter 9's
// measured lesson: != passes an undriven net).
//
// Directed: 26 single-bit frames (lz = 0..25) x carry x eff_sub x s_in x
// e_big corners = 416, plus the all-zero frame x 4 = 420. Random: 250,000
// vectors with e_big >= 1 (the module's contract), seeded once.
module tb_norm_equiv;

  reg         eff_sub, s_in;
  reg  [26:0] sum27;
  reg  [7:0]  e_big;
  wire [23:0] nsig_a, nsig_b;
  wire        ng_a, ng_b, nr_a, nr_b, ns_a, ns_b;
  wire [8:0]  en_a, en_b;

  fp32_normalize    u_ref (.eff_sub(eff_sub), .sum27(sum27), .s_in(s_in),
                           .e_big(e_big), .nsig(nsig_a), .ng(ng_a), .nr(nr_a),
                           .ns(ns_a), .e_norm(en_a));
  fp32_normalize_sv u_sv  (.eff_sub(eff_sub), .sum27(sum27), .s_in(s_in),
                           .e_big(e_big), .nsig(nsig_b), .ng(ng_b), .nr(nr_b),
                           .ns(ns_b), .e_norm(en_b));

  integer errors, n, i, j, k, seed, dummy;

  task chk;
    begin
      #1;
      if ({nsig_a, ng_a, nr_a, ns_a, en_a} === 38'hx) begin
        errors = errors + 1; $display("FAIL: reference all-x");
      end
      if ({nsig_a, ng_a, nr_a, ns_a, en_a} !== {nsig_b, ng_b, nr_b, ns_b, en_b}) begin
        errors = errors + 1;
        if (errors <= 5)
          $display("FAIL es=%b sum=%h s=%b eb=%0d: ref=%h_%b%b%b_%h sv=%h_%b%b%b_%h",
                   eff_sub, sum27, s_in, e_big,
                   nsig_a, ng_a, nr_a, ns_a, en_a, nsig_b, ng_b, nr_b, ns_b, en_b);
      end
      n = n + 1;
    end
  endtask

  initial begin
    errors = 0; n = 0;

    for (i = 0; i <= 25; i = i + 1)
      for (j = 0; j < 2; j = j + 1)
        for (k = 0; k < 4; k = k + 1) begin
          eff_sub = j[0];
          s_in    = k[0];
          e_big   = (k[1] ? 8'd254 : 8'd1) + k[0];
          sum27   = {1'b0, 26'h1 << (25 - i)};   // no carry
          chk;
          sum27   = {1'b1, 26'h1 << (25 - i)};   // carry set: the right-1 path
          chk;
        end

    sum27 = 27'h0;
    for (j = 0; j < 2; j = j + 1)
      for (k = 0; k < 2; k = k + 1) begin
        eff_sub = j[0]; s_in = k[0]; e_big = 8'd77;
        chk;
      end

    seed = 909; dummy = $urandom(seed);
    for (i = 0; i < 250000; i = i + 1) begin
      {eff_sub, s_in} = $urandom;
      sum27           = $urandom;
      e_big           = 8'd1 + ($urandom % 255);
      chk;
    end

    if (n !== 26*2*4*2 + 4 + 250000) begin
      errors = errors + 1;
      $display("FAIL tb_norm_equiv: swept %0d vectors, expected %0d",
               n, 26*2*4*2 + 4 + 250000);
    end
    if (errors == 0)
      $display("PASS tb_norm_equiv (%0d vectors, bit-identical)", n);
    else
      $display("FAIL tb_norm_equiv: %0d error(s)", errors);
    $finish;
  end
endmodule

`default_nettype wire
