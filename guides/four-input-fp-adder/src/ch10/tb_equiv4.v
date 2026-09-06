`timescale 1ns/1ps
`default_nettype none

// Chapter 10's central verification: each four-input structure is
// bit-identical to its OWN order-faithful reference, in two reference
// styles at once:
//
//   (1) chained golden: three ch08 fp32_add_alg instances wired in the
//       same association order as the DUT (ref_add4.v), compared on result
//       bits AND all three ORed flags, `!==`, X-guarded. Bit-exact,
//       NaN bits included: identical modules see identical stage inputs.
//   (2) chained shortreal round-trip: each partial sum forced through
//       $shortrealtobits -- the only rounding point that exists (ch07) --
//       and re-expanded with $bitstoshortreal before the next add, summed
//       in the SAME order. Result compared `!==`, NaN by class only
//       (generated-NaN sign is architecture-dependent, STATE.md), and
//       sNaN operands reach the DUTs as bits, never through a shortreal.
//
// Generator: $urandom seeded ONCE via an integer variable, first draw
// discarded (ch05's linearity rule; a literal seed is a vvp load-time
// error, ch04). Four regimes x `NQ quadruples: full [1,254] exponents;
// within +/-10 of a per-quadruple base; within +/-2; special-mix (each
// operand w.p. 1/4 from a 14-entry table incl. +/-0, +/-inf, qNaN, sNaN,
// +/-maxnormal, subnormal boundaries). Exponent draws use modulo (bias
// < 2^-24, stated not hidden).
//
// Shipped default is NQ=6000 per regime (24,000 quadruples, inside the
// harness's 60 s SIM_TIMEOUT); the chapter's headline run is the same
// binary at -DNQ=60000 -- 240,000 quadruples x 2 structures x 2
// references, zero mismatches, re-run this session.
`ifndef NQ
`define NQ 6000
`endif
module tb_equiv4;
  reg [31:0] a, b, c, d;
  wire [31:0] t_res, s_res, rt_res, rs_res;
  wire t_inv, t_ovf, t_inx, s_inv, s_ovf, s_inx;
  wire rt_inv, rt_ovf, rt_inx, rs_inv, rs_ovf, rs_inx;

  fp32_add4_tree dut_t (.a(a), .b(b), .c(c), .d(d), .result(t_res),
                        .invalid(t_inv), .overflow(t_ovf), .inexact(t_inx));
  fp32_add4_seq  dut_s (.a(a), .b(b), .c(c), .d(d), .result(s_res),
                        .invalid(s_inv), .overflow(s_ovf), .inexact(s_inx));
  ref_add4_tree  ref_t (.a(a), .b(b), .c(c), .d(d), .result(rt_res),
                        .invalid(rt_inv), .overflow(rt_ovf), .inexact(rt_inx));
  ref_add4_seq   ref_s (.a(a), .b(b), .c(c), .d(d), .result(rs_res),
                        .invalid(rs_inv), .overflow(rs_ovf), .inexact(rs_inx));

  // ONE two-operand add, rounded ONCE: the innocuous-double-rounding
  // safe harbor (binary64 p=53 >= 2*24+2, ch08) makes each call a true
  // binary32 one-add oracle. Chaining rt_add calls in the DUT's order --
  // never any other order -- is the whole reference-model discipline.
  function [31:0] rt_add(input [31:0] x, input [31:0] y);
    shortreal sx, sy;
    begin
      sx = $bitstoshortreal(x);
      sy = $bitstoshortreal(y);
      rt_add = $shortrealtobits(sx + sy);
    end
  endfunction

  function isnan(input [31:0] w);
    isnan = (w[30:23] == 8'hFF) && (w[22:0] != 23'd0);
  endfunction

  // special operand table (sNaN delivered by BITS -- never through shortreal)
  function [31:0] special(input [31:0] r);
    case (r % 14)
      0: special = 32'h00000000;  1: special = 32'h80000000;
      2: special = 32'h7F800000;  3: special = 32'hFF800000;
      4: special = 32'h7FC00000;  5: special = 32'h7FA00000;   // qNaN, sNaN
      6: special = 32'h7F7FFFFF;  7: special = 32'hFF7FFFFF;
      8: special = 32'h00000001;  9: special = 32'h80000001;
      10: special = 32'h007FFFFF; 11: special = 32'h00800000;
      12: special = 32'h3F800000; 13: special = 32'hBF800000;
    endcase
  endfunction

  function [31:0] mknorm(input [7:0] e);
    mknorm = {$urandom & 32'h8000_0000} | ({24'd0, e} << 23) | ($urandom & 32'h007FFFFF);
  endfunction

  function [31:0] gen(input integer regime, input [7:0] e0);
    begin
      case (regime)
        0: gen = mknorm(8'd1 + ($urandom % 254));
        1: gen = mknorm((e0 - 8'd10) + ($urandom % 21));
        2: gen = mknorm((e0 - 8'd2) + ($urandom % 5));
        default:
          if (($urandom % 4) == 0) gen = special($urandom);
          else                     gen = mknorm(8'd1 + ($urandom % 254));
      endcase
    end
  endfunction

  integer regime, i, errors;
  integer seed;
  integer checks;                          // total quadruples checked
  integer ne_ts [0:3];                     // tree != seq per regime
  reg [31:0] w_rt, w_rs;
  reg [7:0] e0;
  reg first;

  task check;
    begin
      #1;
      // X-guards: an X-ed result must FAIL, not vacuously pass (ch09 !== rule)
      if ((^t_res === 1'bx) || (^s_res === 1'bx)) begin
        errors = errors + 1;
        $display("FAIL tb_equiv4: X in a DUT result a=%h b=%h c=%h d=%h", a, b, c, d);
      end
      // (1) chained-golden equivalence: exact bits, flags included
      if (t_res !== rt_res || {t_inv,t_ovf,t_inx} !== {rt_inv,rt_ovf,rt_inx}) begin
        errors = errors + 1;
        $display("FAIL tb_equiv4 tree-vs-alg: %h %h %h %h dut=%h/%b ref=%h/%b",
                 a, b, c, d, t_res, {t_inv,t_ovf,t_inx}, rt_res, {rt_inv,rt_ovf,rt_inx});
      end
      if (s_res !== rs_res || {s_inv,s_ovf,s_inx} !== {rs_inv,rs_ovf,rs_inx}) begin
        errors = errors + 1;
        $display("FAIL tb_equiv4 seq-vs-alg: %h %h %h %h dut=%h/%b ref=%h/%b",
                 a, b, c, d, s_res, {s_inv,s_ovf,s_inx}, rs_res, {rs_inv,rs_ovf,rs_inx});
      end
      // (2) chained shortreal round-trip: same order, NaN by class
      w_rt = rt_add(rt_add(a, b), rt_add(c, d));
      w_rs = rt_add(rt_add(rt_add(a, b), c), d);
      if (!(isnan(t_res) && isnan(w_rt)) && (t_res !== w_rt)) begin
        errors = errors + 1;
        $display("FAIL tb_equiv4 tree-vs-shortreal: %h %h %h %h dut=%h ref=%h",
                 a, b, c, d, t_res, w_rt);
      end
      if (!(isnan(s_res) && isnan(w_rs)) && (s_res !== w_rs)) begin
        errors = errors + 1;
        $display("FAIL tb_equiv4 seq-vs-shortreal: %h %h %h %h dut=%h ref=%h",
                 a, b, c, d, s_res, w_rs);
      end
      // tree-vs-seq census (both-NaN counted equal)
      if (!(isnan(t_res) && isnan(s_res)) && (t_res !== s_res))
        ne_ts[regime] = ne_ts[regime] + 1;
      checks = checks + 1;
    end
  endtask

  initial begin
    errors = 0; checks = 0;
    seed = 32'd20261020;
    first = $urandom(seed);            // seed once; discard first draw
    for (regime = 0; regime < 4; regime = regime + 1) begin
      ne_ts[regime] = 0;
      for (i = 0; i < `NQ; i = i + 1) begin
        case (regime)
          1: e0 = 8'd11 + ($urandom % 234);
          2: e0 = 8'd3 + ($urandom % 250);
          default: e0 = 8'd0;
        endcase
        a = gen(regime, e0); b = gen(regime, e0);
        c = gen(regime, e0); d = gen(regime, e0);
        check;
      end
    end
    $display("tree!=seq per regime (of %0d each): full=%0d win10=%0d win2=%0d specialmix=%0d",
             `NQ, ne_ts[0], ne_ts[1], ne_ts[2], ne_ts[3]);
    // Precondition first: a bench that ran zero quadruples must FAIL, not
    // pass vacuously -- `checks !== 4*NQ` alone is satisfied by NQ=0.
    if (checks == 0 || checks !== 4 * `NQ) begin
      errors = errors + 1;
      $display("FAIL tb_equiv4: check count %0d (expected %0d, nonzero)", checks, 4 * `NQ);
    end
    if (errors == 0)
      $display("PASS tb_equiv4 (%0d quadruples x 2 structures x 2 references)", checks);
    else
      $display("tb_equiv4: %0d errors", errors);
    $finish;
  end

  initial begin #600_000_000; $display("FAIL tb_equiv4: watchdog"); $fatal(1); end
endmodule
`default_nettype wire
