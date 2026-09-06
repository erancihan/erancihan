`timescale 1ns/1ps
`default_nettype none

// Chapter 9: the golden-equivalence sweep -- the chapter's central
// verification move. Chapter 8's fp32_add_alg (proven against exact
// arithmetic on a million-plus pairs) and this chapter's split fp32_add2
// run side by side on the same operands, compared BIT-EXACTLY on
// {result, invalid, overflow, inexact} -- 36 bits, NaN sign included.
// Both sides are deterministic RTL computing the same function, so full
// equality is the correct standard here (the OPPOSITE of comparing
// against a simulator-generated NaN, where the sign is never comparable).
//
// The comparison is `!==` behind an explicit X-guard, and both are
// load-bearing, measured: a `!=` variant of this file printed PASS across
// every check against an undriven-net design (every real mismatch was
// X-contaminated, and X != X evaluates to x, so the if never took) and
// again against a double-driven design. The guard makes ANY x/z in either
// side's outputs a failure in its own right, so weakening `!==` back to
// `!=` cannot make the sweep vacuous a third time.
//
// Stimulus: chapter 8's 46-pair corner library, both orders (92 checks,
// literal-count guarded), then the five-regime random generator at
// 20,000 pairs per regime. Seeded once, first draw discarded, seed
// echoed -- the chapter 5 rule.
module tb_equiv;
  localparam [31:0] SEED = 32'd9090;
  localparam integer N_PER_REGIME = 20000;   // x5 regimes = 100,000 random

  reg  [31:0] a, b;
  wire [31:0] r_g, r_s;
  wire        inv_g, ovf_g, inx_g, inv_s, ovf_s, inx_s;
  integer     seed, dummy, regime, i, total, mismatches;
  integer     e1, e2;

  fp32_add_alg gold (.a(a), .b(b), .result(r_g),
                     .invalid(inv_g), .overflow(ovf_g), .inexact(inx_g));
  fp32_add2    dut  (.a(a), .b(b), .result(r_s),
                     .invalid(inv_s), .overflow(ovf_s), .inexact(inx_s));

  initial begin : watchdog
    #100000000;
    $display("FAIL tb_equiv: timeout");
    $fatal(1, "timeout");
  end

  task cmp;
    begin
      #1;
      // X-guard first: a fully-driven combinational design fed defined
      // operands has NO excuse for an x or z anywhere in its outputs.
      if ((^{r_s, inv_s, ovf_s, inx_s}) === 1'bx ||
          (^{r_g, inv_g, ovf_g, inx_g}) === 1'bx) begin
        mismatches = mismatches + 1;
        if (mismatches <= 10)
          $display("FAIL tb_equiv %h+%h: X in outputs: split %h/%b%b%b golden %h/%b%b%b",
                   a, b, r_s, inv_s, ovf_s, inx_s, r_g, inv_g, ovf_g, inx_g);
      end else if ({r_s, inv_s, ovf_s, inx_s} !== {r_g, inv_g, ovf_g, inx_g}) begin
        mismatches = mismatches + 1;
        if (mismatches <= 10)
          $display("FAIL tb_equiv %h+%h: split %h/%b%b%b golden %h/%b%b%b",
                   a, b, r_s, inv_s, ovf_s, inx_s, r_g, inv_g, ovf_g, inx_g);
      end
      total = total + 1;
    end
  endtask

  task pair(input [31:0] wa, input [31:0] wb);
    begin
      a = wa; b = wb; cmp;
      a = wb; b = wa; cmp;
    end
  endtask

  function [31:0] mkfp(input [31:0] sgn, input integer e, input [22:0] frac);
    mkfp = {sgn[0], e[7:0], frac};
  endfunction

  initial begin
    $display("SEED=%0d", SEED);
    seed = SEED; dummy = $urandom(seed);   // seed once, discard first draw
    total = 0; mismatches = 0;

    // --- the ch08 corner library's 46 pairs, both orders (92 checks) ---
    pair(32'h00000000, 32'h00000000); pair(32'h80000000, 32'h80000000);
    pair(32'h00000000, 32'h80000000); pair(32'h00000000, 32'h3F800000);
    pair(32'h80000000, 32'hC0000000); pair(32'h3FC00000, 32'hBFC00000);
    pair(32'h00000001, 32'h3F800000); pair(32'h00000001, 32'h00000001);
    pair(32'h00800000, 32'h80000001); pair(32'h007FFFFF, 32'h00000001);
    pair(32'h00000001, 32'h80000002); pair(32'h00400000, 32'h00800000);
    pair(32'h7F800000, 32'h7F800000); pair(32'hFF800000, 32'hC0000000);
    pair(32'h7F800000, 32'h00000000); pair(32'h7F800000, 32'h7F7FFFFF);
    pair(32'h4B800000, 32'h33800000); pair(32'h4B800000, 32'hB3800000);
    pair(32'h3F800000, 32'h33800001); pair(32'h4B000000, 32'hBDFFFFFF);
    pair(32'h3F800000, 32'hBF800000); pair(32'h40000001, 32'hC0000000);
    pair(32'h3F800000, 32'hBF7FFFFF); pair(32'h4B800000, 32'h3F800000);
    pair(32'h4B800001, 32'h3F800000); pair(32'h4B7FFFFF, 32'h3F800000);
    pair(32'h3FFFFFFF, 32'h33800000); pair(32'h3FFFFFFF, 32'h3FC00000);
    pair(32'h3F800001, 32'h33800000); pair(32'h3FFFFFFF, 32'h3E800009);
    pair(32'h7F7FFFFF, 32'h7F7FFFFF); pair(32'h7F7FFFFF, 32'h73000000);
    pair(32'h7F7FFFFF, 32'h72FFFFFF); pair(32'hFF7FFFFF, 32'hFF7FFFFF);
    pair(32'h3F800000, 32'h3F800000); pair(32'h3F800000, 32'h3E800000);
    pair(32'h3F800000, 32'hBE800003); pair(32'h3F800000, 32'hBE800001);
    pair(32'h3F800001, 32'h33040000); pair(32'h3F800001, 32'hB3800001);
    pair(32'h40000000, 32'hB3800001);
    pair(32'h7FC00055, 32'h3F800000); pair(32'h7FA00000, 32'h3F800000);
    pair(32'hFFC00001, 32'h7F800000); pair(32'h7F800001, 32'h00000000);
    pair(32'h7F800000, 32'hFF800000);
    if (total !== 92) begin
      $display("FAIL tb_equiv: corner phase ran %0d checks, expected 92", total);
      $fatal(1, "corner count");
    end

    // --- ch08's five-regime random generator, 100,000 pairs ---
    for (regime = 0; regime < 5; regime = regime + 1)
      for (i = 0; i < N_PER_REGIME; i = i + 1) begin
        case (regime)
          0: begin a = $urandom; b = $urandom; end
          1: begin
            e1 = 1 + ($urandom % 254); e2 = e1 + ($urandom % 3) - 1;
            if (e2 < 1) e2 = 1; if (e2 > 254) e2 = 254;
            a = mkfp($urandom, e1, $urandom); b = mkfp($urandom, e2, $urandom);
          end
          2: begin
            e1 = 1 + ($urandom % 254); e2 = e1 + ($urandom % 61) - 30;
            if (e2 < 1) e2 = 1; if (e2 > 254) e2 = 254;
            a = mkfp($urandom, e1, $urandom); b = mkfp($urandom, e2, $urandom);
          end
          3: begin
            a = mkfp($urandom, $urandom % 3, $urandom);
            b = mkfp($urandom, $urandom % 3, $urandom);
          end
          default: begin
            a = mkfp($urandom, 250 + ($urandom % 5), $urandom);
            b = mkfp($urandom, 250 + ($urandom % 5), $urandom);
          end
        endcase
        cmp;
      end

    if (total !== 100092) begin
      $display("FAIL tb_equiv: %0d checks ran, expected 100092", total);
      $fatal(1, "check count");
    end
    if (mismatches !== 0)
      $fatal(1, "FAIL tb_equiv: %0d mismatches", mismatches);
    $display("PASS tb_equiv (92 corner checks + 100000 random, split == golden bit-for-bit incl. flags)");
    $finish;
  end
endmodule

`default_nettype wire
