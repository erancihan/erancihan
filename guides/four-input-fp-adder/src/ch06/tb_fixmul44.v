`timescale 1ns/1ps
`default_nettype none

// Chapter 6: exhaustive check of fixmul44, all 65,536 pairs, plus a measured
// bias account for each rounding mode.
//
// The reference requantizers are arithmetic, not structural: the true
// remainder is ((raw % 16) + 16) % 16, the floor is (raw - rem) / 16 (exact
// division, so toward-zero and floor agree), and half-up / half-even are
// if-statements on rem - deliberately nothing like the DUT's shift-and-add.
//
// Bias is accounted in sixteenths of one output LSB: e16 = 16*rounded - raw,
// summed over all pairs. The totals are asserted against values computed
// independently in python3:
//   floor  -425984 (mean -0.40625 LSB)   half-up  +65536 (mean +0.0625 LSB)
//   half-even  0 exactly                 ties (rem == 8): 8192 pairs
module tb_fixmul44;

  reg  signed  [7:0] a, b;
  wire signed [15:0] p_full;
  wire signed [11:0] p_trunc, p_halfup, p_even;

  fixmul44 dut (.a(a), .b(b), .p_full(p_full),
                .p_trunc(p_trunc), .p_halfup(p_halfup), .p_even(p_even));

  integer ia, ib, errors, pairs, ties;
  integer raw, rem, qf, qh, qe;
  integer sum_floor, sum_halfup, sum_even;

  initial begin : watchdog
    #10000000;
    $display("FAIL tb_fixmul44: timeout at %0t, the sweep never finished",
             $time);
    $fatal(1, "timeout");
  end

  task tie(input signed [7:0] va, input signed [7:0] vb);
    begin
      a = va; b = vb; #1;
      $display("  %6.3f * %4.2f = raw %0d (%0.1f output LSBs): trunc %0d  halfup %0d  halfeven %0d",
               va / 16.0, vb / 16.0, p_full, p_full / 16.0,
               p_trunc, p_halfup, p_even);
    end
  endtask

  initial begin
    errors = 0; pairs = 0; ties = 0;
    sum_floor = 0; sum_halfup = 0; sum_even = 0;

    for (ia = -128; ia < 128; ia = ia + 1) begin
      for (ib = -128; ib < 128; ib = ib + 1) begin
        a = ia[7:0]; b = ib[7:0]; #1;
        raw = ia * ib;
        rem = ((raw % 16) + 16) % 16;      // true remainder, 0..15
        qf  = (raw - rem) / 16;            // exact division: this IS floor
        qh  = (rem >= 8) ? qf + 1 : qf;
        qe  = (rem > 8 || (rem == 8 && (qf % 2 != 0))) ? qf + 1 : qf;
        if (rem == 8) ties = ties + 1;

        if (p_full !== raw[15:0] || p_trunc !== qf[11:0] ||
            p_halfup !== qh[11:0] || p_even !== qe[11:0]) begin
          errors = errors + 1;
          if (errors <= 5)
            $display("FAIL tb_fixmul44: %0d*%0d raw=%0d got t=%0d h=%0d e=%0d want %0d %0d %0d",
                     ia, ib, p_full, p_trunc, p_halfup, p_even, qf, qh, qe);
        end

        sum_floor  = sum_floor  + (16 * p_trunc  - raw);
        sum_halfup = sum_halfup + (16 * p_halfup - raw);
        sum_even   = sum_even   + (16 * p_even   - raw);
        pairs = pairs + 1;
      end
    end

    if (pairs !== 65536) begin
      $display("FAIL tb_fixmul44: swept %0d pairs, expected 65536", pairs);
      $fatal(1, "incomplete sweep");
    end
    if (errors !== 0)
      $fatal(1, "FAIL tb_fixmul44: %0d error(s)", errors);
    if (sum_floor !== -425984 || sum_halfup !== 65536 || sum_even !== 0 ||
        ties !== 8192) begin
      $display("FAIL tb_fixmul44: bias floor=%0d halfup=%0d halfeven=%0d ties=%0d",
               sum_floor, sum_halfup, sum_even, ties);
      $fatal(1, "bias totals do not match python3");
    end

    $display("fixmul44: 0 errors in 65536 pairs (exact product + 3 requantizers)");
    $display("bias, sixteenths of an output LSB over all pairs:");
    $display("  floor %0d (mean %8.5f LSB)  half-up +%0d (mean +%7.5f LSB)  half-even %0d",
             sum_floor, sum_floor / 65536.0 / 16.0,
             sum_halfup, sum_halfup / 65536.0 / 16.0, sum_even);
    $display("  ties: %0d of 65536 pairs end in ...1000", ties);
    tie(8'sd6, 8'sd4);        //  0.375 * 0.25: raw  24 = +1.5 LSB, tie
    tie(8'sd10, 8'sd4);       //  0.625 * 0.25: raw  40 = +2.5 LSB, tie
    tie(-8'sd10, 8'sd4);      // -0.625 * 0.25: raw -40 = -2.5 LSB, tie
    $display("PASS tb_fixmul44 (half-even is the only mode that sums to zero)");
    $finish;
  end

endmodule

`default_nettype wire
