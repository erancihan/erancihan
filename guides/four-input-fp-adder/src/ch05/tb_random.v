`timescale 1ns/1ps
`default_nettype none

// Random stimulus kills the mutant that fourteen hand-written vectors could
// not, and it does it in about four vectors - without anyone knowing what the
// bug was.
//
// Phase 1 runs 200 pairs from the bare $random stream, which in Icarus is a
// fixed sequence: the values below are reproducible on any machine, and the
// first kill lands on vector 0.
// Phase 2 cuts that same stream into 2000 consecutive trials and counts how
// many vectors each needed before its first kill. The mean is compared against
// the theoretical 1/p = 3.969, with p = 16512/65536 measured exhaustively in
// tb_exhaustive.v.
//
// Phase 2 draws from ONE continuing stream rather than re-seeding per trial.
// Re-seeding with 1, 2, 3, ... makes the first draw of each trial a near
// linear function of the seed - see tb_seed.v - and biased this measurement
// from 4.1 down to 3.0 when it was first written that way.
module tb_random;

  localparam integer N      = 200;          // vectors in the fixed-stream phase
  localparam integer TRIALS = 2000;         // consecutive trials in phase 2
  localparam integer CAP    = 1000;         // give up on a trial after this many

  reg  [7:0] a, b;
  wire [7:0] sum,  sum_m;
  wire       cout, cout_m;

  integer i, t, n;
  integer applied  = 0;
  integer errors   = 0;
  integer kills    = 0;
  integer first    = -1;
  integer total    = 0;                     // summed vectors-to-first-kill
  integer capped   = 0;
  reg     dead;
  real    mean;

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
    #100000000;
    $display("FAIL tb_random: timeout at %0t", $time);
    $fatal(1, "timeout");
  end

  initial begin : run
    reg [8:0] want;

    // Phase 1: the fixed stream. Every value here is reproducible.
    for (i = 0; i < N; i = i + 1) begin
      a = $random;
      b = $random;
      #1;
      applied = applied + 1;
      want    = ref_add(a, b);
      if ({cout, sum} !== want) begin
        errors = errors + 1;
        $display("FAIL tb_random: a=%02h b=%02h exp=%b_%02h got=%b_%02h",
                 a, b, want[8], want[7:0], cout, sum);
      end
      if (cout_m !== cout) begin
        kills = kills + 1;
        if (first < 0) begin
          first = i;
          $display("  first kill on vector %0d: a=%0d(%08b) b=%0d(%08b) sum=%0d true=%b mutant=%b",
                   i, a, a, b, b, a + b, cout, cout_m);
        end
      end
      #1;
    end
    $display("  phase 1: %0d vectors, %0d kills, first at %0d", applied, kills, first);

    // Phase 2: how many vectors does it take? 2000 consecutive trials.
    for (t = 0; t < TRIALS; t = t + 1) begin
      n    = 0;
      dead = 1'b0;
      while (!dead && n < CAP) begin
        a = $random;
        b = $random;
        n = n + 1;
        #1;
        if (cout_m !== cout) dead = 1'b1;
      end
      total = total + n;
      if (!dead) capped = capped + 1;
    end
    mean = total * 1.0 / TRIALS;
    $display("  phase 2: %0d trials, mean vectors to first kill = %0.4f (theory 1/p = 3.9690)",
             TRIALS, mean);

    if (applied !== N) begin
      $display("FAIL tb_random: applied %0d vectors, expected %0d", applied, N);
      errors = errors + 1;
    end
    if (kills == 0) begin
      $display("FAIL tb_random: %0d random vectors killed nothing", N);
      errors = errors + 1;
    end
    if (capped != 0) begin
      $display("FAIL tb_random: %0d trials hit the %0d-vector cap", capped, CAP);
      errors = errors + 1;
    end
    // A band, not a point: this is a sample mean, and the honest claim is that
    // it sits where the geometric distribution says it should.
    if (mean < 3.5 || mean > 4.5) begin
      $display("FAIL tb_random: mean %0.4f is outside [3.5, 4.5]", mean);
      errors = errors + 1;
    end

    if (errors == 0)
      $display("PASS tb_random (%0d/%0d fixed-stream kills, mean %0.4f vectors to first kill)",
               kills, N, mean);
    else
      $fatal(1, "%0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
