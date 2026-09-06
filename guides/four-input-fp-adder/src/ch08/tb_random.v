`timescale 1ns/1ps
`default_nettype none

// Chapter 8: the composed algorithm against the one-add shortreal reference
// on 10,000 random pairs from a five-regime mixed generator (uniform bits
// including specials, exponent-close, |dexp| <= 30, subnormal-heavy,
// near-overflow). Result bits compare exactly except when both sides are
// NaN, which compares by class -- the sign and payload of a NaN generated
// by the simulator are not portable (chapter 7).
//
// Seeding follows the chapter 5 rule: seed $urandom ONCE per simulation and
// DISCARD the first draw (the first draw is close to a linear function of
// the seed). The seed is echoed so any failure is reproducible.
//
// The census at the end is the chapter's coverage argument printed by a
// machine: watch how many of the 10,000 random pairs exercised the
// rounding-carry renormalize. (The count is printed, not asserted -- the
// directed library tb_corners.v is what guarantees the path runs.)
module tb_random;

  localparam [31:0] SEED = 32'd8377;
  localparam integer N_PER_REGIME = 2000;

  reg  [31:0] a, b;
  wire [31:0] r;
  wire        inv, ovf, inx;
  integer     seed, dummy, regime, i, total, mismatches;
  integer     c_right1, c_left2, c_renorm, c_stickysat;
  reg  [31:0] refbits;
  integer     e1, e2;

  fp32_add_alg dut
    (.a(a), .b(b), .result(r), .invalid(inv), .overflow(ovf), .inexact(inx));

  initial begin : watchdog
    #10000000;
    $display("FAIL tb_random: timeout at %0t", $time);
    $fatal(1, "timeout");
  end

  function is_nan_bits(input [31:0] w);
    is_nan_bits = (w[30:23] == 8'd255) && (w[22:0] != 23'd0);
  endfunction

  function [31:0] mkfp(input [31:0] sgn, input integer e, input [22:0] frac);
    mkfp = {sgn[0], e[7:0], frac};
  endfunction

  initial begin
    $display("SEED=%0d", SEED);
    seed  = SEED;
    dummy = $urandom(seed);          // seed once...
    total = 0; mismatches = 0;
    c_right1 = 0; c_left2 = 0; c_renorm = 0; c_stickysat = 0;

    for (regime = 0; regime < 5; regime = regime + 1) begin
      for (i = 0; i < N_PER_REGIME; i = i + 1) begin
        case (regime)
          0: begin                              // uniform bits, specials included
            a = $urandom;
            b = $urandom;
          end
          1: begin                              // exponent-close: |dexp| <= 1
            e1 = 1 + ($urandom % 254);
            e2 = e1 + ($urandom % 3) - 1;
            if (e2 < 1) e2 = 1;
            if (e2 > 254) e2 = 254;
            a = mkfp($urandom, e1, $urandom);
            b = mkfp($urandom, e2, $urandom);
          end
          2: begin                              // |dexp| <= 30
            e1 = 1 + ($urandom % 254);
            e2 = e1 + ($urandom % 61) - 30;
            if (e2 < 1) e2 = 1;
            if (e2 > 254) e2 = 254;
            a = mkfp($urandom, e1, $urandom);
            b = mkfp($urandom, e2, $urandom);
          end
          3: begin                              // subnormal-heavy: E in 0..2
            a = mkfp($urandom, $urandom % 3, $urandom);
            b = mkfp($urandom, $urandom % 3, $urandom);
          end
          default: begin                        // near-overflow: E in 250..254
            a = mkfp($urandom, 250 + ($urandom % 5), $urandom);
            b = mkfp($urandom, 250 + ($urandom % 5), $urandom);
          end
        endcase
        #1;
        refbits = $shortrealtobits($bitstoshortreal(a) + $bitstoshortreal(b));
        if (is_nan_bits(refbits) || is_nan_bits(r)) begin
          if (!(is_nan_bits(refbits) && is_nan_bits(r))) begin
            mismatches = mismatches + 1;
            $display("FAIL tb_random %h+%h: dut %h ref %h (NaN class)",
                     a, b, r, refbits);
          end
        end else if (r !== refbits) begin
          mismatches = mismatches + 1;
          if (mismatches <= 5)
            $display("FAIL tb_random %h+%h: dut %h ref %h", a, b, r, refbits);
        end
        if (!dut.screen) begin
          if (dut.right1)                     c_right1 = c_right1 + 1;
          if (!dut.right1 && dut.shl >= 5'd2) c_left2  = c_left2  + 1;
          if (dut.round_renorm)               c_renorm = c_renorm + 1;
          if (dut.s_al && dut.shamt == 5'd26) c_stickysat = c_stickysat + 1;
        end
        total = total + 1;
      end
    end

    // the literal, not 5*N_PER_REGIME: a guard computed from the same
    // constant that broke would pass vacuously
    if (total !== 10000) begin
      $display("FAIL tb_random: %0d pairs ran, expected 10000", total);
      $fatal(1, "pair count");
    end
    $display("census over %0d random pairs: right1=%0d left>=2=%0d",
             total, c_right1, c_left2);
    $display("  sticky_saturated=%0d  rounding_renorm=%0d   <- random never gets there",
             c_stickysat, c_renorm);
    if (mismatches !== 0)
      $fatal(1, "FAIL tb_random: %0d mismatches", mismatches);
    $display("PASS tb_random (%0d pairs, 5 regimes, dut == shortreal one-add)",
             total);
    $finish;
  end

endmodule

`default_nettype wire
