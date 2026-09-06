`timescale 1ns/1ps
`default_nettype none

// Chapter 10's directed corner suite: the intermediate-event families no
// pair library can reach, run against BOTH structures at once. Every
// expected value and flag triple was python3-verified first (exact_add per
// stage for the composition, cr4 for the single-rounding sum) -- see the
// chapter's worked ledgers. NaN expectations are by CLASS + quiet bit,
// never by bits (generated-NaN sign is architecture-dependent, STATE.md);
// the sNaN operand is delivered as bits.
//
// Families: Q (intermediate overflow that later cancels -- the one
// multiset {max,max,-max,-max} that returns qNaN, +inf or +0 depending on
// structure and port order), N (NaN born at every stage; qNaN/sNaN
// operands), Z (all 16 signed-zero combinations + cancellation-generated
// zero), S (inter-pair cancellation, one direction each way), SB (a
// subnormal crossing a composition boundary).
//
// Coverage bins for INTERMEDIATE events -- values that exist only on the
// wires between instances -- are sampled hierarchically (ch09's route: a
// stale path is an elaboration error, so refactors fail loudly), and the
// run FAILS if any bin is empty. KIND argument: 0 = exact bits expected;
// 1 = NaN expected (class + quiet bit checked; a nonzero exp also asserts
// the fraction bits -- propagated-operand NaN rows only; sign never compared).
module tb_corners4;
  reg [31:0] a, b, c, d;
  wire [31:0] t_res, s_res;
  wire t_inv, t_ovf, t_inx, s_inv, s_ovf, s_inx;
  fp32_add4_tree dut_t (.a(a), .b(b), .c(c), .d(d), .result(t_res),
                        .invalid(t_inv), .overflow(t_ovf), .inexact(t_inx));
  fp32_add4_seq  dut_s (.a(a), .b(b), .c(c), .d(d), .result(s_res),
                        .invalid(s_inv), .overflow(s_ovf), .inexact(s_inx));

  integer errors, checks;

  function isqnan(input [31:0] w);
    isqnan = (w[30:23] == 8'hFF) && w[22];
  endfunction
  function issub(input [31:0] w);
    issub = (w[30:23] == 8'd0) && (w[22:0] != 23'd0);
  endfunction
  // finite and nonzero: the guard that keeps the inter-pair-cancellation
  // bins honest (screened-zero and infinity operands do not count)
  function isfinnz(input [31:0] w);
    isfinnz = (w[30:23] != 8'hFF) && (w[30:0] != 31'd0);
  endfunction

  // ---- coverage bins for intermediate events (hierarchical sampling) ----
  integer bin_ovf_s1_tree,  bin_ovf_s1_seq;    // level-1/stage-1 overflow
  integer bin_nan_s1_tree,  bin_nan_s1_seq;    // invalid born in stage 1
  integer bin_nan_late_tree, bin_nan_late_seq; // invalid born in the FINAL instance
  integer bin_cancel_tree,  bin_cancel_seq;    // final-stage exact_zero, finite nonzero ops
  integer bin_sub_s1_tree,  bin_sub_s1_seq;    // subnormal stage-1 result

  task sample_bins;
    begin
      if (dut_t.u_add_ab.overflow === 1'b1 || dut_t.u_add_cd.overflow === 1'b1)
        bin_ovf_s1_tree = bin_ovf_s1_tree + 1;
      if (dut_s.u_add1.overflow === 1'b1)
        bin_ovf_s1_seq = bin_ovf_s1_seq + 1;
      if (dut_t.u_add_ab.invalid === 1'b1 || dut_t.u_add_cd.invalid === 1'b1)
        bin_nan_s1_tree = bin_nan_s1_tree + 1;
      if (dut_t.u_add_r.invalid === 1'b1)
        bin_nan_late_tree = bin_nan_late_tree + 1;
      if (dut_s.u_add1.invalid === 1'b1)
        bin_nan_s1_seq = bin_nan_s1_seq + 1;
      if (dut_s.u_add3.invalid === 1'b1)
        bin_nan_late_seq = bin_nan_late_seq + 1;
      if (dut_t.u_add_r.exact_zero === 1'b1 &&
          isfinnz(dut_t.sum_ab) && isfinnz(dut_t.sum_cd))
        bin_cancel_tree = bin_cancel_tree + 1;
      if (dut_s.u_add3.exact_zero === 1'b1 &&
          isfinnz(dut_s.sum_abc) && isfinnz(d))
        bin_cancel_seq = bin_cancel_seq + 1;
      if (issub(dut_t.sum_ab) || issub(dut_t.sum_cd))
        bin_sub_s1_tree = bin_sub_s1_tree + 1;
      if (issub(dut_s.sum_ab))
        bin_sub_s1_seq = bin_sub_s1_seq + 1;
    end
  endtask

  task chk(input [79:0] name,
           input kind_t, input [31:0] exp_t, input [2:0] flags_t,
           input kind_s, input [31:0] exp_s, input [2:0] flags_s);
    begin
      #1;
      checks = checks + 1;
      sample_bins;
      if (^t_res === 1'bx || ^s_res === 1'bx) begin
        errors = errors + 1;
        $display("FAIL %0s: X in result", name);
      end
      // For NaN rows (kind=1), a nonzero exp asserts the PAYLOAD too: these are
      // propagated-operand NaNs, deterministic in fraction (sign never compared;
      // generated-NaN rows pass exp = 0 and stay class+quiet only).
      if (kind_t ? (!isqnan(t_res) || (exp_t != 0 && t_res[22:0] !== exp_t[22:0]))
                 : (t_res !== exp_t)) begin
        errors = errors + 1;
        $display("FAIL %0s tree: %h %h %h %h -> %h expected %s%h",
                 name, a, b, c, d, t_res, kind_t ? "qNaN, got " : "", kind_t ? t_res : exp_t);
      end
      if ({t_inv, t_ovf, t_inx} !== flags_t) begin
        errors = errors + 1;
        $display("FAIL %0s tree flags: inv/ovf/inx = %b expected %b",
                 name, {t_inv, t_ovf, t_inx}, flags_t);
      end
      if (kind_s ? (!isqnan(s_res) || (exp_s != 0 && s_res[22:0] !== exp_s[22:0]))
                 : (s_res !== exp_s)) begin
        errors = errors + 1;
        $display("FAIL %0s seq: %h %h %h %h -> %h expected %s%h",
                 name, a, b, c, d, s_res, kind_s ? "qNaN, got " : "", kind_s ? s_res : exp_s);
      end
      if ({s_inv, s_ovf, s_inx} !== flags_s) begin
        errors = errors + 1;
        $display("FAIL %0s seq flags: inv/ovf/inx = %b expected %b",
                 name, {s_inv, s_ovf, s_inx}, flags_s);
      end
      $display("%0s: tree=%h inv/ovf/inx=%b | seq=%h inv/ovf/inx=%b",
               name, t_res, {t_inv,t_ovf,t_inx}, s_res, {s_inv,s_ovf,s_inx});
    end
  endtask

  integer k;
  initial begin
    errors = 0; checks = 0;
    bin_ovf_s1_tree = 0;  bin_ovf_s1_seq = 0;
    bin_nan_s1_tree = 0;  bin_nan_s1_seq = 0;
    bin_nan_late_tree = 0; bin_nan_late_seq = 0;
    bin_cancel_tree = 0;  bin_cancel_seq = 0;
    bin_sub_s1_tree = 0;  bin_sub_s1_seq = 0;
    // -- overflow that cancels ------------------------------------------
    a=32'h7F7FFFFF; b=32'h7F7FFFFF; c=32'hFF7FFFFF; d=32'hFF7FFFFF;
    chk("Q1", 1, 32'h0, 3'b111, 0, 32'h7F800000, 3'b011);   // true sum: +0
    a=32'h7F7FFFFF; b=32'h7F7FFFFF; c=32'hFF7FFFFF; d=32'h00000000;
    chk("Q2", 0, 32'h7F800000, 3'b011, 0, 32'h7F800000, 3'b011); // true: max
    a=32'h7F7FFFFF; b=32'hFF7FFFFF; c=32'h7F7FFFFF; d=32'hFF7FFFFF;
    chk("Q3", 0, 32'h00000000, 3'b000, 0, 32'h00000000, 3'b000); // true: +0
    // -- intermediate NaN poisons, from every position -------------------
    a=32'h7F800000; b=32'hFF800000; c=32'h3F800000; d=32'h3F800000;
    chk("N1", 1, 32'h0, 3'b100, 1, 32'h0, 3'b100);
    a=32'h3F800000; b=32'h3F800000; c=32'h7F800000; d=32'hFF800000;
    chk("N2", 1, 32'h0, 3'b100, 1, 32'h0, 3'b100);
    a=32'h7F800000; b=32'h3F800000; c=32'h40000000; d=32'hFF800000;
    chk("N3", 1, 32'h0, 3'b100, 1, 32'h0, 3'b100);
    a=32'h7FC00001; b=32'h3F800000; c=32'h3F800000; d=32'h3F800000;
    chk("N4", 1, 32'h7FC00001, 3'b000, 1, 32'h7FC00001, 3'b000);   // qNaN in: payload intact, invalid MUST stay 0
    a=32'h7FA00000; b=32'h3F800000; c=32'h3F800000; d=32'h3F800000;
    chk("N5", 1, 32'h7FE00000, 3'b100, 1, 32'h7FE00000, 3'b100);   // sNaN in (by bits): quieted payload, invalid
    // -- signed zero: all 16 combinations --------------------------------
    for (k = 0; k < 16; k = k + 1) begin
      a = k[0] ? 32'h80000000 : 32'h00000000;
      b = k[1] ? 32'h80000000 : 32'h00000000;
      c = k[2] ? 32'h80000000 : 32'h00000000;
      d = k[3] ? 32'h80000000 : 32'h00000000;
      #1;
      checks = checks + 1;
      if (t_res !== ((k == 15) ? 32'h80000000 : 32'h00000000) ||
          s_res !== ((k == 15) ? 32'h80000000 : 32'h00000000) ||
          {t_inv,t_ovf,t_inx,s_inv,s_ovf,s_inx} !== 6'b0) begin
        errors = errors + 1;
        $display("FAIL Z k=%b: tree=%h seq=%h", k[3:0], t_res, s_res);
      end
    end
    $display("Z: all 16 zero-sign combinations: -0 iff all four -0, else +0 (both structures)");
    a=32'h3F800000; b=32'hBF800000; c=32'h80000000; d=32'h80000000;
    chk("Z1", 0, 32'h00000000, 3'b000, 0, 32'h00000000, 3'b000);
    // -- inter-pair cancellation, both directions ------------------------
    a=32'h4C000000; b=32'h3F800000; c=32'hCC000000; d=32'h3F800000;
    chk("S1", 0, 32'h00000000, 3'b001, 0, 32'h3F800000, 3'b001);  // CR=40000000
    a=32'h4B800000; b=32'h3F800000; c=32'h3F800000; d=32'h3F800000;
    chk("S2", 0, 32'h4B800001, 3'b001, 0, 32'h4B800000, 3'b001);  // CR=4B800002
    // -- subnormal crossing a composition boundary -----------------------
    a=32'h00800000; b=32'h80400000; c=32'h00400000; d=32'h00400000;
    chk("SB", 0, 32'h00C00000, 3'b000, 0, 32'h00C00000, 3'b000);  // stage 1: 00400000
    // -- gates ------------------------------------------------------------
    if (checks !== 28) begin errors = errors + 1;
      $display("FAIL tb_corners4: check count %0d != 28", checks); end
    $display("bins: ovf_s1 t=%0d s=%0d  nan_s1 t=%0d s=%0d  nan_late t=%0d s=%0d  cancel t=%0d s=%0d  sub_s1 t=%0d s=%0d",
             bin_ovf_s1_tree, bin_ovf_s1_seq, bin_nan_s1_tree, bin_nan_s1_seq,
             bin_nan_late_tree, bin_nan_late_seq, bin_cancel_tree, bin_cancel_seq,
             bin_sub_s1_tree, bin_sub_s1_seq);
    if (bin_ovf_s1_tree == 0 || bin_ovf_s1_seq == 0 ||
        bin_nan_s1_tree == 0 || bin_nan_s1_seq == 0 ||
        bin_nan_late_tree == 0 || bin_nan_late_seq == 0 ||
        bin_cancel_tree == 0 || bin_cancel_seq == 0 ||
        bin_sub_s1_tree == 0 || bin_sub_s1_seq == 0) begin
      errors = errors + 1;
      $display("FAIL tb_corners4: a required intermediate-event coverage bin is empty");
    end
    if (errors == 0)
      $display("PASS tb_corners4 (28 directed checks, 10/10 intermediate-event bins hit)");
    $finish;
  end
  initial begin #1_000_000; $display("FAIL tb_corners4: watchdog"); $fatal(1); end
endmodule
`default_nettype wire
