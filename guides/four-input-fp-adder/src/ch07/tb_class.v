`timescale 1ns/1ps
`default_nettype none

// Chapter 7: verification of fp32_class against three independent references.
//
// 1. A boundary sweep, exhaustive by construction: both signs x all 256
//    exponent fields x six fraction values chosen to sit on every class
//    boundary the format has (zero fraction, minimal nonzero, largest with
//    the quiet bit clear, smallest with it set, a payload-carrying value,
//    all ones). Every class transition the classifier can make is forced.
// 2. The reference for the sweep is the HEX-RANGE model: because the encoding
//    is monotone in the magnitude bits, each class is a contiguous unsigned
//    range of w[30:0]. That is a different formulation from the DUT's field
//    equalities, so a shared misreading of the format has to be made twice.
// 3. A value-domain cross-check through $bitstoshortreal: NaN by v != v,
//    zero by v == 0, infinity and subnormals by magnitude against the class
//    endpoints. This checks the DUT against the simulator's own decoder. It
//    cannot see the quiet/signalling split -- conversion QUIETS an sNaN on
//    this host (measured, tb_lab.v) -- so that split is pinned instead by
//    directed vectors whose expected outputs were computed with python3.
module tb_class;

  reg  [31:0] w;
  wire        sign, is_zero, is_sub, is_norm, is_inf, is_nan, is_qnan, is_snan;

  fp32_class dut
    (.w(w), .sign(sign), .is_zero(is_zero), .is_sub(is_sub),
     .is_norm(is_norm), .is_inf(is_inf), .is_nan(is_nan),
     .is_qnan(is_qnan), .is_snan(is_snan));

  integer     errors, checks, directed;
  integer     si, ei, fi;
  reg [22:0]  fset [0:5];
  reg [30:0]  m;
  reg         r_zero, r_sub, r_norm, r_inf, r_nan, r_qnan, r_snan;
  real        v, minn, maxn;
  reg         vc_zero, vc_sub, vc_norm, vc_inf, vc_nan;

  initial begin : watchdog
    #1000000;
    $display("FAIL tb_class: timeout at %0t, the sweep never finished", $time);
    $fatal(1, "timeout");
  end

  // Directed check: expected outputs packed {sign, zero,sub,norm,inf,nan, q,s},
  // every constant computed and verified with python3 this session.
  task dir(input [31:0] pat, input [7:0] exp8);
    begin
      w = pat; #1;
      if ({sign, is_zero, is_sub, is_norm, is_inf, is_nan, is_qnan, is_snan}
          !== exp8) begin
        errors = errors + 1;
        $display("FAIL tb_class directed %h: got %b expected %b", pat,
                 {sign, is_zero, is_sub, is_norm, is_inf, is_nan,
                  is_qnan, is_snan}, exp8);
      end
      directed = directed + 1;
    end
  endtask

  initial begin
    errors = 0; checks = 0; directed = 0;
    minn = $bitstoshortreal(32'h00800000);   // 2^-126
    maxn = $bitstoshortreal(32'h7F7FFFFF);   // (2 - 2^-23) * 2^127

    fset[0] = 23'h000000;   // zero fraction: zero or infinity
    fset[1] = 23'h000001;   // minimal nonzero: subnormal or sNaN
    fset[2] = 23'h3FFFFF;   // largest with the quiet bit clear
    fset[3] = 23'h400000;   // smallest with the quiet bit set
    fset[4] = 23'h400055;   // quiet bit set, payload 85
    fset[5] = 23'h7FFFFF;   // all ones

    for (si = 0; si <= 1; si = si + 1)
      for (ei = 0; ei <= 255; ei = ei + 1)
        for (fi = 0; fi <= 5; fi = fi + 1) begin
          w = {si[0], ei[7:0], fset[fi]}; #1;

          // Reference 1: the hex-range model on the magnitude bits.
          m      = w[30:0];
          r_zero = (m == 31'h00000000);
          r_sub  = (m >= 31'h00000001) && (m <= 31'h007FFFFF);
          r_norm = (m >= 31'h00800000) && (m <= 31'h7F7FFFFF);
          r_inf  = (m == 31'h7F800000);
          r_snan = (m >= 31'h7F800001) && (m <= 31'h7FBFFFFF);
          r_qnan = (m >= 31'h7FC00000) && (m <= 31'h7FFFFFFF);
          r_nan  = r_snan || r_qnan;
          if ({sign, is_zero, is_sub, is_norm, is_inf, is_nan, is_qnan,
               is_snan} !==
              {w[31], r_zero, r_sub, r_norm, r_inf, r_nan, r_qnan, r_snan})
          begin
            errors = errors + 1;
            if (errors <= 5)
              $display("FAIL tb_class range model %h: got %b expected %b", w,
                       {sign, is_zero, is_sub, is_norm, is_inf, is_nan,
                        is_qnan, is_snan},
                       {w[31], r_zero, r_sub, r_norm, r_inf, r_nan, r_qnan,
                        r_snan});
          end

          // Exactly one class flag, and the NaN split must cover is_nan.
          if (is_zero + is_sub + is_norm + is_inf + is_nan !== 1 ||
              (is_qnan | is_snan) !== is_nan || (is_qnan & is_snan) !== 1'b0)
          begin
            errors = errors + 1;
            $display("FAIL tb_class one-hot %h: %b%b%b%b%b q%b s%b", w,
                     is_zero, is_sub, is_norm, is_inf, is_nan, is_qnan,
                     is_snan);
          end

          // Reference 2: the simulator's own value-domain decoder.
          v       = $bitstoshortreal(w);
          vc_nan  = (v != v);
          vc_zero = !vc_nan && (v == 0.0);
          vc_inf  = !vc_nan && ((v > maxn) || (v < -maxn));
          vc_sub  = !vc_nan && (v != 0.0) && (v < minn) && (v > -minn);
          vc_norm = !(vc_nan || vc_zero || vc_inf || vc_sub);
          if ({is_zero, is_sub, is_norm, is_inf, is_nan} !==
              {vc_zero, vc_sub, vc_norm, vc_inf, vc_nan}) begin
            errors = errors + 1;
            if (errors <= 5)
              $display("FAIL tb_class value model %h: got %b%b%b%b%b", w,
                       is_zero, is_sub, is_norm, is_inf, is_nan);
          end

          checks = checks + 1;
        end

    // Precondition guard: a sweep that did not run is a failure, not a pass.
    if (checks !== 3072) begin
      $display("FAIL tb_class: %0d sweep checks, expected 3072", checks);
      $fatal(1, "sweep incomplete");
    end

    dir(32'h00000000, 8'b0_10000_00);  // +0
    dir(32'h80000000, 8'b1_10000_00);  // -0
    dir(32'h00000001, 8'b0_01000_00);  // min subnormal
    dir(32'h807FFFFF, 8'b1_01000_00);  // -max subnormal
    dir(32'h00000200, 8'b0_01000_00);  // 2^-140
    dir(32'h00800000, 8'b0_00100_00);  // min normal
    dir(32'h3DCCCCCD, 8'b0_00100_00);  // 0.1 rounded
    dir(32'h3F800000, 8'b0_00100_00);  // 1.0
    dir(32'hC0490FDB, 8'b1_00100_00);  // -pi rounded
    dir(32'h7F7FFFFF, 8'b0_00100_00);  // max normal
    dir(32'hFF7FFFFF, 8'b1_00100_00);  // -max normal
    dir(32'h7F800000, 8'b0_00010_00);  // +inf
    dir(32'hFF800000, 8'b1_00010_00);  // -inf
    dir(32'h7F800001, 8'b0_00001_01);  // min sNaN
    dir(32'h7FBFFFFF, 8'b0_00001_01);  // max sNaN
    dir(32'h7F800055, 8'b0_00001_01);  // sNaN, payload 85
    dir(32'h7FC00000, 8'b0_00001_10);  // canonical qNaN
    dir(32'h7FC00055, 8'b0_00001_10);  // qNaN, payload 85
    dir(32'hFFC00000, 8'b1_00001_10);  // -qNaN (this host's runtime NaN)
    dir(32'hFFFFFFFF, 8'b1_00001_10);  // all ones

    if (directed !== 20) begin
      $display("FAIL tb_class: %0d directed checks, expected 20", directed);
      $fatal(1, "directed set incomplete");
    end

    if (errors !== 0)
      $fatal(1, "FAIL tb_class: %0d error(s)", errors);
    $display("PASS tb_class (3072 sweep patterns x 3 references, %0d directed)",
             directed);
    $finish;
  end

endmodule

`default_nettype wire
