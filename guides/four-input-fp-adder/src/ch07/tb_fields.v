`timescale 1ns/1ps
`default_nettype none

// Chapter 7: proof of the unified decode over every finite class.
//
// fp32_fields claims value = (-1)^sign * sig * 2^(e_eff - 150) for every
// finite pattern -- normals, subnormals and zeros under ONE formula, with
// e_eff = max(E, 1) doing the whole subnormal reconciliation. The reference
// is the simulator's own decoder, $bitstoshortreal: both sides are exact
// doubles (sig <= 2^24 - 1 and the scale is a power of two well inside
// binary64's range), so the comparison is exact equality, no tolerance.
// A DUT that used the encoded E instead of max(E, 1) would decode every
// subnormal at exactly half its value -- the factor-of-two fingerprint this
// testbench also demonstrates directly on 2^-140.
module tb_fields;

  reg  [31:0] w;
  wire        sign, hidden;
  wire [7:0]  e_raw, e_eff;
  wire [22:0] frac;
  wire [23:0] sig;

  fp32_fields dut
    (.w(w), .sign(sign), .e_raw(e_raw), .frac(frac), .hidden(hidden),
     .sig(sig), .e_eff(e_eff));

  integer     errors, checks;
  integer     si, ei, fi, ee;
  reg [22:0]  fset [0:5];
  real        v, want, right, wrong;

  initial begin : watchdog
    #1000000;
    $display("FAIL tb_fields: timeout at %0t, the sweep never finished",
             $time);
    $fatal(1, "timeout");
  end

  initial begin
    errors = 0; checks = 0;

    fset[0] = 23'h000000;   // zero (E = 0) or a power of two (E > 0)
    fset[1] = 23'h000001;   // one LSB above each binade floor
    fset[2] = 23'h2AAAAA;   // alternating bits
    fset[3] = 23'h400000;   // fraction MSB alone
    fset[4] = 23'h4CCCCD;   // 0.1's fraction
    fset[5] = 23'h7FFFFF;   // binade ceiling

    // Both signs x every FINITE exponent field x the six fractions.
    // E = 255 is excluded: infinities and NaNs have no significand value,
    // which is fp32_class's business, not this module's.
    for (si = 0; si <= 1; si = si + 1)
      for (ei = 0; ei <= 254; ei = ei + 1)
        for (fi = 0; fi <= 5; fi = fi + 1) begin
          w = {si[0], ei[7:0], fset[fi]}; #1;

          ee     = e_eff;                       // into a SIGNED context
          want   = sig * (2.0 ** (ee - 150));   // sig * 2^(e_eff - 127 - 23)
          if (sign) want = -want;
          v = $bitstoshortreal(w);

          if (v != want || sign !== w[31]) begin
            errors = errors + 1;
            if (errors <= 5)
              $display("FAIL tb_fields %h: decode %e, simulator %e", w,
                       want, v);
          end
          checks = checks + 1;
        end

    if (checks !== 3060) begin
      $display("FAIL tb_fields: %0d checks, expected 3060", checks);
      $fatal(1, "sweep incomplete");
    end

    // The factor-of-two fingerprint, pinned on 2^-140: reading E = 0 through
    // the normal formula's 2^(E - 127) gives exactly HALF the true value,
    // because stored exponents 0 and 1 share the scale 2^-126.
    w = 32'h00000200; #1;
    ee    = e_eff;
    right = sig * (2.0 ** (ee - 150));          // e_eff = 1  -> 2^-149 per LSB
    wrong = sig * (2.0 ** (0 - 150));           // E = 0 read -> 2^-150 per LSB
    if (right != $bitstoshortreal(w) || right != 2.0 * wrong) begin
      errors = errors + 1;
      $display("FAIL tb_fields fingerprint: right %e wrong %e sim %e", right,
               wrong, $bitstoshortreal(w));
    end
    $display("2^-140 decoded via max(E,1): %e; via E-127: %e (exactly half)",
             right, wrong);

    if (errors !== 0)
      $fatal(1, "FAIL tb_fields: %0d error(s)", errors);
    $display("PASS tb_fields (%0d finite patterns, one formula, no tolerance)",
             checks);
    $finish;
  end

endmodule

`default_nettype wire
