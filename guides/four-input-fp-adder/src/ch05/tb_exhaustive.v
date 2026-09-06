`timescale 1ns/1ps
`default_nettype none

// Exhaustive proof over all 2^16 operand pairs, in about 1.4 s as last timed.
//
// Two results at once:
//   * adder8 agrees with an independently written reference on every pair.
//     That is not evidence, it is a proof about this input space.
//   * the mutant disagrees on exactly 16512 of them - 25.195 % - and the very
//     first disagreement is the 129th pair applied, a=00 b=80.
//
// It also proves the two coverage bins tb_scoreboard.v excludes really are
// unreachable: no pair with both top bits clear ever carries out, and no pair
// with both top bits set ever fails to.
module tb_exhaustive;

  localparam integer NPAIRS = 65536;
  localparam integer EXPECT_DISAGREE = 16512;
  localparam integer EXPECT_FIRST    = 128;

  reg  [7:0] a, b;
  wire [7:0] sum,  sum_m;
  wire       cout, cout_m;

  integer ia, ib;
  integer applied   = 0;
  integer errors    = 0;
  integer mismatch  = 0;                    // adder8-vs-reference only, so the
                                            // report line cannot blame the
                                            // adder for a run-level guard
  integer disagree  = 0;
  integer first_dis = -1;
  integer imposs_00 = 0;                    // a[7]=0,b[7]=0 yet cout=1
  integer imposs_11 = 0;                    // a[7]=1,b[7]=1 yet cout=0

  adder8     dut (.a(a), .b(b), .sum(sum),   .cout(cout));
  adder8_mut mut (.a(a), .b(b), .sum(sum_m), .cout(cout_m));

  function [8:0] ref_add;
    input [7:0] x;
    input [7:0] y;
    integer k;
    reg     c;
    reg [7:0] s;
    begin
      c = 1'b0;
      for (k = 0; k < 8; k = k + 1) begin
        s[k] = x[k] ^ y[k] ^ c;
        c    = (x[k] & y[k]) | (x[k] & c) | (y[k] & c);
      end
      ref_add = {c, s};
    end
  endfunction

  initial begin : watchdog
    #10000000;
    $display("FAIL tb_exhaustive: timeout at %0t", $time);
    $fatal(1, "timeout");
  end

  initial begin : sweep
    reg [8:0] want;
    for (ia = 0; ia < 256; ia = ia + 1)
      for (ib = 0; ib < 256; ib = ib + 1) begin
        a = ia[7:0];
        b = ib[7:0];
        #1;
        want    = ref_add(a, b);
        applied = applied + 1;

        if ({cout, sum} !== want) begin
          errors   = errors + 1;
          mismatch = mismatch + 1;
          if (errors <= 5)
            $display("FAIL tb_exhaustive: a=%02h b=%02h exp=%b_%02h got=%b_%02h",
                     a, b, want[8], want[7:0], cout, sum);
        end

        if (cout_m !== cout) begin
          if (first_dis < 0) begin
            first_dis = applied - 1;
            $display("  first mutant disagreement at pair %0d: a=%02h b=%02h sum=%0d true cout=%b mutant cout=%b",
                     first_dis, a, b, a + b, cout, cout_m);
          end
          disagree = disagree + 1;
        end

        if (!a[7] && !b[7] && cout) imposs_00 = imposs_00 + 1;
        if ( a[7] &&  b[7] && !cout) imposs_11 = imposs_11 + 1;
      end

    if (applied !== NPAIRS) begin
      $display("FAIL tb_exhaustive: applied %0d pairs, expected %0d", applied, NPAIRS);
      errors = errors + 1;
    end
    if (disagree !== EXPECT_DISAGREE) begin
      $display("FAIL tb_exhaustive: mutant disagreed on %0d pairs, expected %0d",
               disagree, EXPECT_DISAGREE);
      errors = errors + 1;
    end
    if (first_dis !== EXPECT_FIRST) begin
      $display("FAIL tb_exhaustive: first disagreement at pair %0d, expected %0d",
               first_dis, EXPECT_FIRST);
      errors = errors + 1;
    end
    if (imposs_00 != 0 || imposs_11 != 0) begin
      $display("FAIL tb_exhaustive: an excluded coverage bin was reachable after all (%0d, %0d)",
               imposs_00, imposs_11);
      errors = errors + 1;
    end

    $display("  pairs=%0d  adder8 mismatches=%0d  mutant disagreements=%0d (%0d.%03d %%)",
             applied, mismatch, disagree,
             (disagree * 100) / applied,
             (((disagree * 100000) / applied) % 1000));
    $display("  excluded bins proven empty: cout=1 with both MSBs clear: %0d;  cout=0 with both MSBs set: %0d",
             imposs_00, imposs_11);

    if (errors == 0)
      $display("PASS tb_exhaustive (%0d pairs, 0 mismatches, %0d mutant kills)",
               applied, disagree);
    else
      $fatal(1, "%0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
