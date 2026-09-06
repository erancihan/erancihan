`timescale 1ns/1ps
`default_nettype none

// Comparing floating point results with a tolerance is right for numerical
// analysis and wrong for verifying an adder. A deliberately wrong teaching
// example: PASS means the trap still reproduces.
//
// Case 1: a genuine one-ulp rounding bug near 2^24. The relative error is
//         1.19e-7, so the textbook "within 1e-6 relative" test accepts it -
//         and a suite that accepts one-ulp errors is not verifying a rounder.
// Case 2: an absolute tolerance near zero. A result eight million ulps wrong
//         differs from the truth by 1.18e-38, so any epsilon a human would
//         write accepts it.
//
// The rule: compare bit patterns with ===, always. NaN is the only exception,
// and it is compared by class.
module bad_tolerance;

  localparam [31:0] E1 = 32'h4b800000;      // 16777216.0, the correct answer
  localparam [31:0] G1 = 32'h4b800001;      // 16777218.0, one ulp out
  localparam [31:0] E2 = 32'h00000001;      // smallest subnormal
  localparam [31:0] G2 = 32'h007fffff;      // largest subnormal - 8388606 ulps out

  localparam real REL_TOL = 1.0e-6;
  localparam real ABS_TOL = 1.0e-30;

  real    e, g, adiff, rdiff;
  integer errors = 0;

  function real fabs;
    input real v;
    begin
      fabs = (v < 0.0) ? -v : v;
    end
  endfunction

  initial begin : watchdog
    #100000;
    $display("FAIL bad_tolerance: timeout at %0t", $time);
    $fatal(1, "timeout");
  end

  initial begin
    // Case 1 -------------------------------------------------------------
    e     = $bitstoshortreal(E1);
    g     = $bitstoshortreal(G1);
    adiff = fabs(g - e);
    rdiff = adiff / fabs(e);
    $display("  case 1: exp=%08h got=%08h   |diff|=%0.1f  relative=%0.3e",
             E1, G1, adiff, rdiff);
    $display("          relative tolerance %0.0e says %0s;  === on the bits says %0s",
             REL_TOL, (rdiff < REL_TOL) ? "PASS" : "FAIL-ok",
             (G1 === E1) ? "PASS" : "caught it");
    if (!(rdiff < REL_TOL)) begin
      $display("FAIL bad_tolerance: case 1 no longer slips through the tolerance");
      errors = errors + 1;
    end
    if (G1 === E1) begin
      $display("FAIL bad_tolerance: case 1 is supposed to be a real bit difference");
      errors = errors + 1;
    end

    // Case 2 -------------------------------------------------------------
    e     = $bitstoshortreal(E2);
    g     = $bitstoshortreal(G2);
    adiff = fabs(g - e);
    $display("  case 2: exp=%08h got=%08h   |diff|=%0.3e  ulps apart=%0d",
             E2, G2, adiff, 32'h007fffff - 32'h00000001);
    $display("          absolute tolerance %0.0e says %0s;  === on the bits says %0s",
             ABS_TOL, (adiff < ABS_TOL) ? "PASS" : "FAIL-ok",
             (G2 === E2) ? "PASS" : "caught it");
    if (!(adiff < ABS_TOL)) begin
      $display("FAIL bad_tolerance: case 2 no longer slips through the tolerance");
      errors = errors + 1;
    end
    if (G2 === E2) begin
      $display("FAIL bad_tolerance: case 2 is supposed to be a real bit difference");
      errors = errors + 1;
    end

    if (errors == 0)
      $display("PASS bad_tolerance (both tolerances accept a wrong result; === rejects both)");
    else
      $fatal(1, "%0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
