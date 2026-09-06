`timescale 1ns/1ps
`default_nettype none

// Chapter 7: shortreal as a binary32 laboratory -- and its four traps.
//
// Everything here is a measurement of Icarus Verilog 13.0 on this x86-64
// host, asserted so the regression notices if the toolchain's behaviour
// moves. The four traps: (1) assigning to a shortreal variable does NOT
// round -- the variable keeps the full double, and only $shortrealtobits
// rounds, at the call; (2) a pure bits -> value -> bits round-trip QUIETS a
// signalling NaN, no arithmetic needed, so sNaN test vectors must live at
// the bit level; (3) a generated NaN's sign is unspecified and this host
// produces BOTH signs (constant folding vs runtime), so NaN results are
// checked by class + quiet bit, never by full bit equality; (4) %h of a
// shortreal prints a rounded integer, not the encoding, and %f prints every
// subnormal -- and even the min NORMAL -- as 0.000000.
module tb_lab;

  integer    errors, nchecks;
  shortreal  s;
  real       r, one, x, za, zb, pz, nz, inf_p, inf_n, big;
  reg [31:0] b, brun;
  string     str;

  localparam real CNAN = 0.0 / 0.0;   // constant expression: folded by the
                                      // COMPILER, not computed by the host FPU

  initial begin : watchdog
    #1000000;
    $display("FAIL tb_lab: timeout at %0t", $time);
    $fatal(1, "timeout");
  end

  task chk(input cond, input [8*44:1] name);
    begin
      nchecks = nchecks + 1;
      if (cond !== 1'b1) begin
        errors = errors + 1;
        $display("FAIL tb_lab: %0s", name);
      end
    end
  endtask

  // NaN classification the portable way: exponent field all ones, fraction
  // nonzero, then the quiet bit. Never the sign, never the whole pattern.
  function is_qnan_class(input [31:0] v);
    is_qnan_class = (v[30:23] == 8'hFF) && (v[22:0] != 23'd0) && v[22];
  endfunction

  // Round-trip check: bits -> shortreal -> bits, no arithmetic between.
  task rt(input [31:0] in, input [31:0] expct);
    begin
      b = $shortrealtobits($bitstoshortreal(in));
      chk(b === expct, "round-trip");
      $display("  %h -> %h%0s", in, b, (b === in) ? "" : "   CHANGED");
    end
  endtask

  initial begin
    errors = 0; nchecks = 0;
    one = 1.0;

    // (1) Assignment does not round.
    r = 1.0 + 2.0**-24;
    s = r;                                    // "to shortreal" -- allegedly
    chk($shortrealtobits(s) === 32'h3F800000, "srtobits rounds at the call");
    chk(s > 1.0,                              "the stored value is a double");
    chk(s - 1.0 == 2.0**-24,                  "the whole 2^-24 is still there");
    $display("(1) s = 1 + 2^-24: $shortrealtobits(s) = %h, yet s - 1.0 = %e",
             $shortrealtobits(s), s - 1.0);

    // (2) Round-trips at the NaN boundary: conversion alone quiets an sNaN
    // (payload kept, bit 22 set); quiet NaNs, payloads and all, and every
    // finite boundary value come back bit-exact.
    $display("(2) pure $bitstoshortreal -> $shortrealtobits round-trips:");
    rt(32'h7FA00000, 32'h7FE00000);   // sNaN -> quieted, payload kept
    rt(32'h7F800001, 32'h7FC00001);   // minimal sNaN -> quieted
    rt(32'h7FC00055, 32'h7FC00055);   // qNaN payload 85 -> intact
    rt(32'hFFC00055, 32'hFFC00055);   // negative qNaN with payload -> intact
    rt(32'h00000001, 32'h00000001);   // min subnormal -> intact
    rt(32'h80000000, 32'h80000000);   // -0 -> intact
    rt(32'h7F800000, 32'h7F800000);   // +inf -> intact

    // Arithmetic propagates an injected payload (measured on this host).
    // Injected NaNs may be payload-compared; the sign is still left alone.
    b = $shortrealtobits($bitstoshortreal(32'h7FC00055) + one);
    chk(is_qnan_class(b) && (b[21:0] == 22'h000055), "qNaN + 1.0 payload");
    $display("    qNaN(payload 55) + 1.0 = %h", b);
    b = $shortrealtobits($bitstoshortreal(32'h7FA00000) + one);
    chk(is_qnan_class(b) && (b[21:0] == 22'h200000), "sNaN + 1.0 quieted");
    $display("    sNaN 7fa00000  + 1.0 = %h  (quiet bit set, payload kept)",
             b);

    // (3) Generated NaNs: class is checkable, the SIGN is not. This host's
    // constant folder and its FPU disagree about it -- printed, not asserted.
    za = 0.0; zb = 0.0;
    brun = $shortrealtobits(za / zb);
    chk(is_qnan_class(brun),                  "runtime 0/0 is a quiet NaN");
    b = $shortrealtobits(CNAN);
    chk(is_qnan_class(b),                     "folded 0.0/0.0 is a quiet NaN");
    $display("(3) runtime 0/0 = %h, constant-folded 0.0/0.0 = %h", brun, b);
    inf_p = $bitstoshortreal(32'h7F800000);
    inf_n = $bitstoshortreal(32'hFF800000);
    b = $shortrealtobits(inf_p + inf_n);
    chk(is_qnan_class(b),                     "inf + (-inf) is a quiet NaN");
    $display("    inf + (-inf)  = %h  (the one addition that invents a NaN)",
             b);

    // Infinity arithmetic in addition, and real division by zero: silent.
    chk($shortrealtobits(inf_p + one)   === 32'h7F800000, "inf + 1");
    chk($shortrealtobits(inf_n + one)   === 32'hFF800000, "-inf + 1");
    chk($shortrealtobits(inf_p + inf_p) === 32'h7F800000, "inf + inf");
    chk($shortrealtobits(one  / za)     === 32'h7F800000, "1/0 -> +inf");
    chk($shortrealtobits(-one / za)     === 32'hFF800000, "-1/0 -> -inf");
    big = $bitstoshortreal(32'h7F7FFFFF);
    chk($shortrealtobits(big + big)      === 32'h7F800000, "magnitude ovf");
    chk($shortrealtobits(big + 2.0**103) === 32'h7F800000, "rounding ovf");

    // Zero sums under the default attribute (roundTiesToEven).
    pz = $bitstoshortreal(32'h00000000);
    nz = $bitstoshortreal(32'h80000000);
    chk($shortrealtobits(pz + pz) === 32'h00000000, "(+0)+(+0) = +0");
    chk($shortrealtobits(nz + nz) === 32'h80000000, "(-0)+(-0) = -0");
    chk($shortrealtobits(pz + nz) === 32'h00000000, "(+0)+(-0) = +0");
    chk($shortrealtobits(nz + pz) === 32'h00000000, "(-0)+(+0) = +0");
    x = 1.5;
    chk($shortrealtobits(x + (-x)) === 32'h00000000, "x + (-x) = +0");
    chk($shortrealtobits((-x) + x) === 32'h00000000, "(-x) + x = +0");

    // (4) Rendering. %f hides subnormals AND the min normal; -0 is visible;
    // %h of a shortreal is a rounded INTEGER (ties away from zero), while
    // $rtoi truncates -- three real-to-integer behaviours in one testbench.
    str = $sformatf("%f", nz);
    chk(str == "-0.000000",    "%f shows -0");
    str = $sformatf("%f", $bitstoshortreal(32'h00000001));
    chk(str == "0.000000",     "%f hides the min subnormal");
    str = $sformatf("%f", $bitstoshortreal(32'h00800000));
    chk(str == "0.000000",     "%f hides even the min NORMAL");
    str = $sformatf("%e", $bitstoshortreal(32'h00000001));
    chk(str == "1.401298e-45", "%e shows it");
    s = 2.5;
    str = $sformatf("%h", s);
    chk(str == "3",            "%h of 2.5 prints 3 (rounded, ties away)");
    chk($rtoi(s) === 2,        "$rtoi(2.5) = 2 (truncated)");
    s = -1.5;
    str = $sformatf("%h", s);
    chk(str == "fffffffffffffffe", "%h of -1.5 prints -2 in 64 bits");
    chk($rtoi(s) === -1,       "$rtoi(-1.5) = -1 (truncated)");
    $display("(4) %%f of 2^-149 prints %f; %%e prints %e; %%h of 2.5 is %h",
             $bitstoshortreal(32'h00000001),
             $bitstoshortreal(32'h00000001), 2.5);

    if (nchecks !== 36) begin
      $display("FAIL tb_lab: %0d checks ran, expected 36", nchecks);
      $fatal(1, "check count");
    end
    if (errors !== 0)
      $fatal(1, "FAIL tb_lab: %0d error(s)", errors);
    $display("PASS tb_lab (36 checks: 4 traps, all pinned)");
    $finish;
  end

endmodule

`default_nettype wire
