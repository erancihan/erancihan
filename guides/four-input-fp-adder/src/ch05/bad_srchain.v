`timescale 1ns/1ps
`default_nettype none

// The most dangerous trap in this book, and it looks like nothing.
//
// Icarus stores a shortreal internally as a C double. Arithmetic therefore
// happens in binary64 and is rounded to binary32 only when you ask for the
// bits. One add is safe - double rounding binary32 -> binary64 -> binary32 is
// provably harmless for a single +, because 53 >= 2*24 + 2. A CHAIN of adds is
// not: the intermediate keeps precision that binary32 does not have, and the
// reference model quietly becomes more accurate than the specification.
//
// A reference model that is more accurate than binary32 marks a CORRECT design
// wrong, on exactly the rounding cases this book is about. This file is a
// deliberately wrong teaching example: PASS means the trap still reproduces.
//
// The fix is one line - round-trip through the bit functions after every
// operation:  z = $bitstoshortreal($shortrealtobits(x + y));
module bad_srchain;

  localparam [31:0] X = 32'h4b800000;       // 2^24 = 16777216.0
  localparam [31:0] Y = 32'h3f800000;       // 1.0
  localparam [31:0] TRUTH = 32'h4b800000;   // binary32: both adds round back

  shortreal x, y, z, w;
  reg [31:0] z_chain, w_chain, z_trip, w_trip;
  reg [31:0] dut_result;
  integer    errors = 0;

  initial begin : watchdog
    #100000;
    $display("FAIL bad_srchain: timeout at %0t", $time);
    $fatal(1, "timeout");
  end

  initial begin
    x = $bitstoshortreal(X);
    y = $bitstoshortreal(Y);

    // The natural way to write it, and the wrong one.
    z       = x + y;
    w       = z + y;
    z_chain = $shortrealtobits(z);
    w_chain = $shortrealtobits(w);

    // The same arithmetic with every intermediate forced back to binary32.
    z      = $bitstoshortreal($shortrealtobits(x + y));
    w      = $bitstoshortreal($shortrealtobits(z + y));
    z_trip = $shortrealtobits(z);
    w_trip = $shortrealtobits(w);

    $display("  x = %08h (2^24), y = %08h (1.0)", X, Y);
    $display("  CHAIN      z=%08h  w=%08h", z_chain, w_chain);
    $display("  ROUND-TRIP z=%08h  w=%08h", z_trip,  w_trip);
    $display("  binary32 truth for both:  %08h", TRUTH);

    // Notice that z agrees either way. The damage is invisible for one
    // operation and appears at the second.
    if (z_chain !== TRUTH) begin
      $display("FAIL bad_srchain: a single add should already be exact");
      errors = errors + 1;
    end
    if (w_chain === TRUTH) begin
      $display("FAIL bad_srchain: the chained form gave the right answer - this file exists because it does not");
      errors = errors + 1;
    end
    if (w_trip !== TRUTH) begin
      $display("FAIL bad_srchain: the round-tripped form is wrong, and it is the fix");
      errors = errors + 1;
    end

    // What that costs. A design that returns the correct binary32 answer is
    // marked wrong by the chained reference, and right by the round-tripped one.
    dut_result = TRUTH;
    $display("  a CORRECT dut result of %08h against the chained reference: %0s",
             dut_result, (dut_result === w_chain) ? "PASS" : "reported as WRONG");
    $display("  the same result against the round-tripped reference:        %0s",
             (dut_result === w_trip) ? "PASS" : "reported as WRONG");

    // And a third way to lose: %f prints the internal double, not the binary32.
    $display("  $display(\"%%f\", x + y) prints %f while the bits say %08h",
             x + y, $shortrealtobits(x + y));

    if (errors == 0)
      $display("PASS bad_srchain (the chained reference is off by one ulp; the trap reproduces)");
    else
      $fatal(1, "%0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
