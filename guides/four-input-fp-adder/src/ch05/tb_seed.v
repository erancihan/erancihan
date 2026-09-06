`timescale 1ns/1ps
`default_nettype none

// Seeds, and the two ways they betray you.
//
//   vvp sim                 seed defaults to 1
//   vvp sim +seed=12345     a different stream - but only for the SEEDED calls
//
// Fact 1: bare $random and $urandom ignore the plusarg completely. Their
//         streams are fixed, so "run it again with more vectors" explores
//         nothing new. The exact first values are asserted below.
// Fact 2: the first draw after seeding is a near linear function of the seed.
//         Seeding once per trial with 1, 2, 3, ... therefore correlates the
//         first vector of every trial, and here it nearly doubles the measured
//         probability of a killing pair - 0.47 against a true 0.25.
module tb_seed;

  localparam integer TRIALS = 2000;

  integer seed;
  integer s1, s2;
  integer i;
  integer errors  = 0;
  integer k_reseed = 0;                     // killers among first-after-reseed
  integer k_stream = 0;                     // killers along one stream
  reg [31:0] r_bare, u_bare;
  reg [31:0] d [0:3];
  reg  [7:0] a, b;
  real       f_reseed, f_stream;

  initial begin : watchdog
    #1000000;
    $display("FAIL tb_seed: timeout at %0t", $time);
    $fatal(1, "timeout");
  end

  task expect32;
    input [8*24-1:0] what;
    input [31:0]     got;
    input [31:0]     want;
    begin
      if (got !== want) begin
        errors = errors + 1;
        $display("FAIL tb_seed: %0s = %08h, expected %08h", what, got, want);
      end
    end
  endtask

  initial begin
    if (!$value$plusargs("seed=%d", seed)) seed = 1;
    $display("  SEED=%0d      <-- always echo it: this line is the reproducer", seed);

    // Fact 1. These do not move, whatever you pass on the command line.
    r_bare = $random;
    u_bare = $urandom;
    $display("  $random  (no seed) = %08h", r_bare);
    $display("  $urandom (no seed) = %08h", u_bare);
    expect32("bare $random",  r_bare, 32'h12153524);
    expect32("bare $urandom", u_bare, 32'h92153524);

    // Fact 2. Four fresh seeds, four first draws.
    for (i = 0; i < 4; i = i + 1) begin
      s1   = i + 1;
      d[i] = $urandom(s1);
    end
    $display("  first $urandom(seed) for seeds 1..4: %08h %08h %08h %08h",
             d[0], d[1], d[2], d[3]);
    expect32("$urandom(1) first draw", d[0], 32'h00010e00);
    expect32("$urandom(2) first draw", d[1], 32'h00021c00);
    expect32("$urandom(3) first draw", d[2], 32'h00032a00);
    expect32("$urandom(4) first draw", d[3], 32'h00043800);

    // What that does to a measurement. The killing class for adder8_mut is
    // "exactly one operand >= 128 and a + b <= 255", which is 25.195 % of all
    // pairs (tb_exhaustive.v proves it).
    for (i = 0; i < TRIALS; i = i + 1) begin
      s2 = i + 1;                           // re-seed every trial: WRONG
      a  = $urandom(s2);
      b  = $urandom(s2);
      if ((a[7] ^ b[7]) && ((a + b) <= 255)) k_reseed = k_reseed + 1;
    end
    s2 = 1;                                 // seed once, then keep drawing
    for (i = 0; i < TRIALS; i = i + 1) begin
      a = $urandom(s2);
      b = $urandom(s2);
      if ((a[7] ^ b[7]) && ((a + b) <= 255)) k_stream = k_stream + 1;
    end
    f_reseed = k_reseed * 1.0 / TRIALS;
    f_stream = k_stream * 1.0 / TRIALS;
    $display("  killing pairs, re-seeded every trial : %4d / %0d = %0.4f",
             k_reseed, TRIALS, f_reseed);
    $display("  killing pairs, one continuing stream : %4d / %0d = %0.4f  (truth 0.2520)",
             k_stream, TRIALS, f_stream);

    if (f_reseed < 0.40) begin
      $display("FAIL tb_seed: re-seeded fraction %0.4f is not the biased value this file is about",
               f_reseed);
      errors = errors + 1;
    end
    if (f_stream < 0.22 || f_stream > 0.28) begin
      $display("FAIL tb_seed: streamed fraction %0.4f is outside [0.22, 0.28]", f_stream);
      errors = errors + 1;
    end

    if (errors == 0)
      $display("PASS tb_seed (bare streams fixed; re-seeding biases %0.4f against %0.4f)",
               f_reseed, f_stream);
    else
      $fatal(1, "%0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
