`timescale 1ns/1ps
`default_nettype none

// Chapter 9: the split adder against the ONE-ADD shortreal reference --
// chapter 8's reference-model verdict, applied to the new top level.
// $bitstoshortreal each operand, ONE +, one $shortrealtobits: any second
// operation in the real domain double-rounds. Result bits compare exactly
// except NaN-vs-NaN, which compares by class -- the sign and payload of a
// simulator-generated NaN are not portable (chapter 7).
//
// This bench discharges a DIFFERENT obligation from tb_equiv: tb_equiv
// proves the refactoring preserved chapter 8's function (flags included,
// which this reference cannot see -- it has no flag outputs); this bench
// re-proves the function against an oracle independent of chapter 8's
// correctness. The chapter measures the difference: a rounding bug planted
// in BOTH adders sails through tb_equiv and dies here 6,890 times in
// 100,000. Ship both; neither implies the other.
//
// Seeded once, first draw discarded, seed echoed. The sNaN exclusion
// vectors are constructed from bits, never sent through the value domain
// (a shortreal round-trip quiets an sNaN with no arithmetic -- re-measured
// at the end of this bench, and asserted).
module tb_short;
  localparam [31:0] SEED = 32'd777;
  localparam integer NPR = 20000;   // x5 regimes = 100,000
  reg  [31:0] a, b;
  wire [31:0] r;
  wire        inv, ovf, inx;
  integer     seed, dummy, regime, i, total, mismatches;
  reg  [31:0] refbits, w;
  integer     e1, e2;
  fp32_add2 dut (.a(a), .b(b), .result(r),
                 .invalid(inv), .overflow(ovf), .inexact(inx));
  initial begin : watchdog
    #100000000;
    $display("FAIL tb_short: timeout");
    $fatal(1, "timeout");
  end
  function is_nan_bits(input [31:0] v);
    is_nan_bits = (v[30:23] == 8'd255) && (v[22:0] != 23'd0);
  endfunction
  function [31:0] mkfp(input [31:0] sgn, input integer e, input [22:0] frac);
    mkfp = {sgn[0], e[7:0], frac};
  endfunction
  initial begin
    $display("SEED=%0d", SEED);
    seed = SEED; dummy = $urandom(seed);   // seed once, discard first draw
    total = 0; mismatches = 0;
    for (regime = 0; regime < 5; regime = regime + 1)
      for (i = 0; i < NPR; i = i + 1) begin
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
        #1;
        refbits = $shortrealtobits($bitstoshortreal(a) + $bitstoshortreal(b));
        if (is_nan_bits(refbits) || is_nan_bits(r)) begin
          if (!(is_nan_bits(refbits) && is_nan_bits(r))) begin
            mismatches = mismatches + 1;
            if (mismatches <= 5)   // same cap as the value branch
              $display("FAIL tb_short %h+%h: dut %h ref %h (NaN class)", a, b, r, refbits);
          end
        end else if (r !== refbits) begin
          mismatches = mismatches + 1;
          if (mismatches <= 5)
            $display("FAIL tb_short %h+%h: dut %h ref %h", a, b, r, refbits);
        end
        total = total + 1;
      end
    // exclusion reconfirmations at the TOP level
    a = 32'h7FA00055; b = 32'h3F800000; #1;   // sNaN operand into the DUT
    $display("  sNaN+1.0: dut=%h inv=%b (payload kept, quieted; sign not asserted)", r, inv);
    if (!(r[30:23] == 8'd255 && r[22:0] === 23'h600055 && inv === 1'b1)) begin
      mismatches = mismatches + 1;
      $display("FAIL tb_short: sNaN handling broken");
    end
    w = $shortrealtobits($bitstoshortreal(32'h7FA00055) + $bitstoshortreal(32'h3F800000));
    $display("  sNaN+1.0 via shortreal ref = %h (host quiets; class NaN)", w);
    w = $shortrealtobits($bitstoshortreal(32'h7FA00000));
    $display("  sNaN pure round-trip = %h (expect 7fe00000: quieted with NO arithmetic)", w);
    if (w !== 32'h7FE00000) begin
      mismatches = mismatches + 1;
      $display("FAIL tb_short: sNaN round-trip changed behaviour");
    end
    if (total !== 100000) begin
      $display("FAIL tb_short: %0d pairs ran, expected 100000", total);
      $fatal(1, "pair count");
    end
    if (mismatches !== 0)
      $fatal(1, "FAIL tb_short: %0d mismatches", mismatches);
    $display("PASS tb_short (100000 pairs, dut == shortreal one-add; exclusions pinned)");
    $finish;
  end
endmodule

`default_nettype wire
