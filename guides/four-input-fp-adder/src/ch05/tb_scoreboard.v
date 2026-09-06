`timescale 1ns/1ps
`default_nettype none

// A suite you can trust, in four separated roles and under 300 lines:
//
//   generator   decides WHAT to test; knows nothing about pins
//   driver      turns a transaction into pin wiggles with the right timing
//   monitor     watches the pins and rebuilds the transaction; never drives
//   scoreboard  holds the reference model, compares, counts, and covers
//
// Two stimulus modes, one driver, one monitor, one scoreboard:
//   vvp sim                 200 constrained-random transactions (the default)
//   vvp sim +mode=ch04      chapter 4's eight cout-checked vectors, replayed
//   vvp sim +seed=<n>       vary the random stream
//
// The point of +mode=ch04 is the coverage report. Chapter 4's vectors fill
// three of the six reachable bins and leave three empty - and two of those
// three are exactly the class on which cout = a[7] | b[7] is wrong. The hole
// was visible before anyone thought to mutate anything.
module tb_scoreboard;

  localparam real    PERIOD  = 10.0;        // ns
  localparam integer NRAND   = 200;

  // Coverage model: the cross of {a[7], b[7]} with the observed carry out.
  // Two of the eight are unreachable and are excluded with a proof, not a
  // shrug: tb_exhaustive.v shows that over all 65536 pairs no pair with both
  // top bits clear ever carries out, and none with both set ever fails to.
  localparam integer NBINS    = 8;          // {a[7], b[7], cout}
  localparam integer BIN_001  = 1;          // a<128, b<128, carry   - impossible
  localparam integer BIN_110  = 6;          // a>=128, b>=128, no carry - impossible

  reg        clk = 1'b0;
  reg  [7:0] a = 8'd0, b = 8'd0;
  wire [7:0] sum,  sum_m;
  wire       cout, cout_m;

  integer    seed;
  integer    i;
  integer    errors  = 0;
  integer    mismatches = 0;                // adder8-vs-reference disagreements only
  integer    checks  = 0;                   // transactions the scoreboard saw
  integer    driven  = 0;                   // transactions the driver applied
  integer    kills   = 0;                   // transactions that expose the mutant
  integer    holes   = 0;
  integer    cov        [0:NBINS-1];
  integer    expect_cov [0:NBINS-1];        // pinned profile for replay mode
  reg        active  = 1'b0;                // monitor gate
  reg [8*8-1:0] mode;
  integer    expect_n;
  integer    expect_holes;

  adder8     dut (.a(a), .b(b), .sum(sum),   .cout(cout));
  adder8_mut mut (.a(a), .b(b), .sum(sum_m), .cout(cout_m));

  always #(PERIOD/2.0) clk = ~clk;

  initial begin : watchdog
    #100000;
    $display("FAIL tb_scoreboard: timeout at %0t", $time);
    $fatal(1, "timeout");
  end

  // ---------------------------------------------------------------- reference
  // Written from the definition of binary addition, not from the DUT's `a + b`.
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

  // --------------------------------------------------------------- scoreboard
  task score;
    input [7:0] ta;
    input [7:0] tb;
    input [7:0] tsum;
    input       tcout;
    reg [8:0] want;
    reg [8:0] got;
    begin
      checks = checks + 1;
      want   = ref_add(ta, tb);
      got    = {tcout, tsum};
      if (got !== want) begin
        errors     = errors + 1;
        mismatches = mismatches + 1;
        // Everything a human needs to reproduce and classify this, on one line.
        // The xor names the kind of bug before you open a waveform: 100 is a
        // carry-out fault, 001 a low-bit fault, 080 a sign-position fault.
        $display("FAIL tb_scoreboard: [%0t] check=%0d a=%02h b=%02h exp=%03h got=%03h xor=%03h",
                 $time, checks, ta, tb, want, got, want ^ got);
      end
      if (cout_m !== tcout) kills = kills + 1;
      cov[{ta[7], tb[7], tcout}] = cov[{ta[7], tb[7], tcout}] + 1;
    end
  endtask

  // ------------------------------------------------------------------ monitor
  // Passive, and deliberately not the driver: it reads the pins, so a driver
  // that applies something other than what the generator asked for is caught.
  always @(posedge clk) if (active) score(a, b, sum, cout);

  // ------------------------------------------------------------------- driver
  // The monitor gate opens HERE, on the same negedge as the first real vector,
  // never at time 0: a gate opened before any vector exists hands the monitor
  // a phantom (00,00) at the first posedge. And it opens on the driver's edge,
  // the opposite edge from the monitor, so the gate and the sample can never
  // race on the same edge.
  task drive;
    input [7:0] da;
    input [7:0] db;
    begin
      @(negedge clk);                       // opposite edge from the monitor
      a      = da;
      b      = db;
      active = 1'b1;
      driven = driven + 1;
    end
  endtask

  // ---------------------------------------------------------------- generator
  // Constrained, not uniform: a quarter of transactions force exactly one top
  // bit set, because that is the region the plain cross tells us matters.
  task gen_random;
    output [7:0] ga;
    output [7:0] gb;
    reg [7:0] pick;
    begin
      pick = $urandom(seed);
      ga   = $urandom(seed);
      gb   = $urandom(seed);
      if (pick < 8'd64) begin               // 25 %: exactly one operand >= 128
        ga[7] = 1'b0;
        gb[7] = 1'b1;
        if (pick[0]) begin ga[7] = 1'b1; gb[7] = 1'b0; end
      end
    end
  endtask

  // -------------------------------------------------------------------- report
  task report_coverage;
    integer k;
    begin
      $display("  coverage: {a[7], b[7], cout}");
      for (k = 0; k < NBINS; k = k + 1) begin
        if (k == BIN_001 || k == BIN_110)
          $display("    a[7]=%b b[7]=%b cout=%b : %6d   excluded (proven unreachable)",
                   k[2], k[1], k[0], cov[k]);
        else if (cov[k] == 0) begin
          holes = holes + 1;
          $display("    a[7]=%b b[7]=%b cout=%b : %6d   <-- HOLE",
                   k[2], k[1], k[0], cov[k]);
        end else
          $display("    a[7]=%b b[7]=%b cout=%b : %6d", k[2], k[1], k[0], cov[k]);
      end
      $display("  bins hit %0d / 6 reachable, holes = %0d", 6 - holes, holes);
    end
  endtask

  // ---------------------------------------------------------------------- run
  initial begin : run
    reg [7:0] ga, gb;

    for (i = 0; i < NBINS; i = i + 1) begin
      cov[i]        = 0;
      expect_cov[i] = 0;
    end
    if (!$value$plusargs("seed=%d", seed)) seed = 1;
    if (!$value$plusargs("mode=%s", mode))  mode = "random";
    $display("  mode=%0s seed=%0d", mode, seed);

    // The first draw after seeding is a near linear function of the seed
    // (tb_seed.v measures it), so throw two away before using the stream.
    ga = $urandom(seed);
    gb = $urandom(seed);

    if (mode == "ch04") begin
      // The eight vectors of chapter 4's vectors.hex. Every other cout-checked
      // vector in chapter 4 falls in a bin these already fill.
      expect_n     = 8;
      expect_holes = 3;
      // The exact profile of those eight vectors, computed independently in
      // python3: 4 in {000}, 1 in {101}, 3 in {111}. Pinning the counts, not
      // just the totals, means a phantom sample and a dropped sample cannot
      // cancel: each moves a bin the other does not.
      expect_cov[3'b000] = 4;
      expect_cov[3'b101] = 1;
      expect_cov[3'b111] = 3;
      drive(8'h01, 8'h02);
      drive(8'h0f, 8'h01);
      drive(8'hff, 8'h01);
      drive(8'h80, 8'h80);
      drive(8'h7f, 8'h01);
      drive(8'h80, 8'hff);
      drive(8'h00, 8'h00);
      drive(8'hff, 8'hfe);
    end else begin
      expect_n     = NRAND;
      expect_holes = 0;
      for (i = 0; i < NRAND; i = i + 1) begin
        gen_random(ga, gb);
        drive(ga, gb);
      end
    end

    // The last vector was applied at a negedge; the monitor scores it at the
    // posedge below. The #1 closes the gate strictly AFTER that edge, so the
    // last transaction is scored whatever order the simulator resumes the
    // monitor and this block in - never a same-edge race.
    @(posedge clk);
    #1;
    active = 1'b0;

    report_coverage;

    // End-of-test assertions about the RUN, not about the design. These catch
    // the bug where the test silently did nothing at all.
    if (driven !== expect_n) begin
      $display("FAIL tb_scoreboard: driver applied %0d transactions, expected %0d",
               driven, expect_n);
      errors = errors + 1;
    end
    if (checks !== expect_n) begin
      $display("FAIL tb_scoreboard: scoreboard saw %0d transactions, expected %0d",
               checks, expect_n);
      errors = errors + 1;
    end
    // A phantom sample before the first vector and a dropped sample after the
    // last CANCEL in this total exactly as they cancel in checks vs expect_n;
    // what catches that pair is the pinned replay profile above, because each
    // moves a bin the other does not. This guard's job is attribution: an
    // UNPAIRED phantom or drop points at the monitor or its gate rather than
    // the driver. Random mode has no pinned profile and relies on the gate
    // discipline above being right.
    if (checks !== driven) begin
      $display("FAIL tb_scoreboard: scoreboard saw %0d transactions but the driver applied %0d - a phantom or dropped sample",
               checks, driven);
      errors = errors + 1;
    end
    if (holes !== expect_holes) begin
      $display("FAIL tb_scoreboard: %0d coverage holes, expected %0d",
               holes, expect_holes);
      errors = errors + 1;
    end
    // Replay mode is a fixed set of eight vectors, so its coverage profile is
    // a known constant - assert it, and the transcript verifies itself.
    if (mode == "ch04")
      for (i = 0; i < NBINS; i = i + 1)
        if (cov[i] !== expect_cov[i]) begin
          $display("FAIL tb_scoreboard: bin {%b%b%b} counted %0d, python3 says %0d",
                   i[2], i[1], i[0], cov[i], expect_cov[i]);
          errors = errors + 1;
        end
    // The mutant is the reason the holes matter: an empty bin and a live bug
    // are the same fact seen twice.
    if (mode == "ch04" && kills != 0) begin
      $display("FAIL tb_scoreboard: chapter 4's vectors are supposed to miss the mutant, but hit it %0d times",
               kills);
      errors = errors + 1;
    end
    if (mode != "ch04" && kills == 0) begin
      $display("FAIL tb_scoreboard: %0d random transactions never exposed the mutant",
               checks);
      errors = errors + 1;
    end

    $display("  transactions %0d, adder8 mismatches %0d, transactions exposing the mutant %0d",
             checks, mismatches, kills);
    if (errors == 0)
      $display("PASS tb_scoreboard (%0d checks, %0d holes, %0d mutant exposures)",
               checks, holes, kills);
    else
      $fatal(1, "%0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
