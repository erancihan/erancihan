`timescale 1ns/1ps
`default_nettype none

// Chapter 11: the streaming-equivalence harness -- this chapter's central
// verification move. Chapter 9's move was the golden-equivalence sweep;
// this is the same sweep UNDER CONTINUOUS STREAMING: a NEW operand pair
// every cycle, results compared LAT cycles later. The held-transaction
// schedule (tb_single.v, shipped as the deliberate foil) passes five
// distinct pipeline bug classes that this schedule kills -- see the
// README's mutation record.
//
// Oracle: the combinational fp32_add2 itself, in the same simulation --
// the pipelined DUT's specification is "bit-identical to chapter 9's
// adder, LAT cycles late", so the reference IS that adder, fed the same
// operands in the same slot. The equivalence chain back to chapter 8's
// golden model and to exact arithmetic is inherited, not re-proven.
//
// Expectation scoreboard: a LAT-deep circular queue, one slot per cycle.
// At each negedge, slot cyc % LAT: FIRST check the DUT's output against
// the expectation stored LAT cycles ago in that slot, THEN overwrite it
// with this cycle's new expectation. ONE shared index computation serves
// both the check and the store -- mutation-measured: a shared-index shift
// is a no-op (a circular queue read and written through one index is
// invariant under constant rotation), while a SPLIT read index fails the
// CORRECT pipeline on the first adjacent differing pair. Chapter 5's
// scoreboard off-by-one, made structurally impossible.
//
// Bubbles are first-class: bubble slots drive ALL-X operands on purpose
// and must retire out_valid === 0; valid slots must retire === 1;
// out_valid is checked with === on EVERY cycle including fill. Data is
// checked !== behind an X-guard (chapter 9's rule: `!=` without the
// guard false-passes an undriven-register pipeline -- reproduced in
// streaming form as harness mutation T2).
//
// One source, two depths: compile with stream_cfg_p4.v ahead of this
// file for the 4-stage DUT (`DUT/`LAT/`RSCREEN default to the 2-stage).
`ifndef DUT
 `define DUT fp32_add2_p2
`endif
`ifndef LAT
 `define LAT 2
`endif
`ifndef RSCREEN
 `define RSCREEN p1_screen
`endif
`ifndef NPR
 `define NPR 20000
`endif

module tb_stream;
  localparam [31:0] SEED = 32'd9090;
  localparam integer LAT  = `LAT;
  localparam integer NPR  = `NPR;    // random pairs per regime, x5 regimes
  localparam integer NMIX = 2000;    // random valid/bubble mix slots

  reg         clk, rst_n, in_valid;
  reg  [31:0] a, b;
  wire [31:0] r_p, r_c;
  wire        inv_p, ovf_p, inx_p, ov;
  wire        inv_c, ovf_c, inx_c;

  `DUT dut (.clk(clk), .rst_n(rst_n), .in_valid(in_valid), .a(a), .b(b),
            .result(r_p), .invalid(inv_p), .overflow(ovf_p),
            .inexact(inx_p), .out_valid(ov));

  fp32_add2 refc (.a(a), .b(b), .result(r_c),
                  .invalid(inv_c), .overflow(ovf_c), .inexact(inx_c));

  // The scoreboard: expectation, valid bit, and operands (for messages),
  // one slot per in-flight cycle.
  reg [34:0] eq [0:LAT-1];
  reg        vq [0:LAT-1];
  reg [31:0] aq [0:LAT-1], bq [0:LAT-1];

  integer cyc, idx;
  integer n_valid_driven, n_checked_valid, n_checked_bubble, mix_valid;
  integer mismatches, xfails, mm_res, mm_flag, ov_cycles;
  integer rr_count, rr_corner;
  integer seed, dummy, regime, i;
  integer e1, e2;
  reg [31:0] ra, rb;

  always #5 clk = ~clk;

  initial begin : watchdog
    #20_000_000;
    $display("FAIL tb_stream: timeout");
    $fatal(1, "timeout");
  end

  // Throughput as an equality, not a slogan: count every cycle the DUT
  // claims a valid result; at end of run the count must EQUAL the number
  // of valid pairs driven.
  always @(negedge clk)
    if (ov === 1'b1) ov_cycles = ov_cycles + 1;

  // Stage-qualified coverage: the rounding-carry renormalize, counted at
  // the ROUND stage, qualified by the round stage's own valid bit and its
  // own PIPELINED screen bit. Qualifying with the input-side `screen`
  // wire counts an unrelated transaction (measured: 9 on the 2-stage
  // pipe under the shipped stimulus, 11 on the 4-stage, 14 with no screen
  // qualifier at all -- the true count is 12 on both depths).
  always @(posedge clk)
    if (dut.vpipe[LAT-2] === 1'b1 && dut.`RSCREEN === 1'b0 &&
        dut.u_round.round_renorm === 1'b1)
      rr_count = rr_count + 1;

  // One stream slot. Check-before-overwrite is the load-bearing ordering,
  // and ONE index serves both.
  task slot(input valid, input [31:0] wa, input [31:0] wb);
    begin
      @(negedge clk);
      idx = cyc % LAT;                    // ONE index for check AND store
      if (cyc >= LAT) begin
        if (vq[idx]) begin
          if (ov !== 1'b1) begin
            mismatches = mismatches + 1;  // valid slot must retire valid
            if (mismatches <= 10)
              $display("FAIL tb_stream cyc %0d: %h+%h retired out_valid=%b, expected 1",
                       cyc, aq[idx], bq[idx], ov);
          end else if ((^{r_p, inv_p, ovf_p, inx_p}) === 1'bx) begin
            xfails = xfails + 1; mismatches = mismatches + 1;
            if (mismatches <= 10)
              $display("FAIL tb_stream cyc %0d: %h+%h X in outputs: %h/%b%b%b",
                       cyc, aq[idx], bq[idx], r_p, inv_p, ovf_p, inx_p);
          end else if ({r_p, inv_p, ovf_p, inx_p} !== eq[idx]) begin
            mismatches = mismatches + 1;
            if (r_p !== eq[idx][34:3]) mm_res = mm_res + 1;
            else                       mm_flag = mm_flag + 1;
            if (mismatches <= 10)
              $display("FAIL tb_stream cyc %0d: %h+%h pipe %h/%b%b%b ref %h/%b%b%b",
                       cyc, aq[idx], bq[idx], r_p, inv_p, ovf_p, inx_p,
                       eq[idx][34:3], eq[idx][2], eq[idx][1], eq[idx][0]);
          end
          n_checked_valid = n_checked_valid + 1;
        end else begin
          if (ov !== 1'b0) begin          // bubble stays bubble
            mismatches = mismatches + 1;
            if (mismatches <= 10)
              $display("FAIL tb_stream cyc %0d: bubble retired out_valid=%b, expected 0",
                       cyc, ov);
          end
          n_checked_bubble = n_checked_bubble + 1;
        end
      end else begin
        if (ov !== 1'b0) begin            // hard 0 before fill
          mismatches = mismatches + 1;
          if (mismatches <= 10)
            $display("FAIL tb_stream cyc %0d: out_valid=%b during fill, expected 0",
                     cyc, ov);
        end
      end
      in_valid = valid;
      a = wa; b = wb;
      #1;                                 // combinational reference settles
      vq[idx] = valid;
      aq[idx] = wa; bq[idx] = wb;
      if (valid) begin
        eq[idx] = {r_c, inv_c, ovf_c, inx_c};
        n_valid_driven = n_valid_driven + 1;
      end
      cyc = cyc + 1;
    end
  endtask

  task pair(input [31:0] wa, input [31:0] wb);
    begin
      slot(1'b1, wa, wb);
      slot(1'b1, wb, wa);
    end
  endtask

  task bubble;                            // adversarial on purpose: X data
    slot(1'b0, 32'hx, 32'hx);
  endtask

  function [31:0] mkfp(input [31:0] sgn, input integer e, input [22:0] frac);
    mkfp = {sgn[0], e[7:0], frac};
  endfunction

  initial begin
    $display("SEED=%0d LAT=%0d", SEED, LAT);
    seed = SEED; dummy = $urandom(seed);   // seed once, discard first draw
    clk = 1'b0; rst_n = 1'b0; in_valid = 1'b0;
    a = 32'hx; b = 32'hx;
    cyc = 0; n_valid_driven = 0; n_checked_valid = 0; n_checked_bubble = 0;
    mix_valid = 0; mismatches = 0; xfails = 0; mm_res = 0; mm_flag = 0;
    ov_cycles = 0;
    rr_count = 0; rr_corner = 0;
    for (i = 0; i < LAT; i = i + 1) begin
      vq[i] = 1'b0; eq[i] = 35'd0; aq[i] = 32'd0; bq[i] = 32'd0;
    end
    repeat (2) @(posedge clk);
    @(negedge clk) rst_n = 1'b1;

    // --- phase 1: the ch08 corner library, both orders, back-to-back ---
    // 92 slots with NO idle cycles between corner cases: the library
    // itself becomes an adjacency test.
    pair(32'h00000000, 32'h00000000); pair(32'h80000000, 32'h80000000);
    pair(32'h00000000, 32'h80000000); pair(32'h00000000, 32'h3F800000);
    pair(32'h80000000, 32'hC0000000); pair(32'h3FC00000, 32'hBFC00000);
    pair(32'h00000001, 32'h3F800000); pair(32'h00000001, 32'h00000001);
    pair(32'h00800000, 32'h80000001); pair(32'h007FFFFF, 32'h00000001);
    pair(32'h00000001, 32'h80000002); pair(32'h00400000, 32'h00800000);
    pair(32'h7F800000, 32'h7F800000); pair(32'hFF800000, 32'hC0000000);
    pair(32'h7F800000, 32'h00000000); pair(32'h7F800000, 32'h7F7FFFFF);
    pair(32'h4B800000, 32'h33800000); pair(32'h4B800000, 32'hB3800000);
    pair(32'h3F800000, 32'h33800001); pair(32'h4B000000, 32'hBDFFFFFF);
    pair(32'h3F800000, 32'hBF800000); pair(32'h40000001, 32'hC0000000);
    pair(32'h3F800000, 32'hBF7FFFFF); pair(32'h4B800000, 32'h3F800000);
    pair(32'h4B800001, 32'h3F800000); pair(32'h4B7FFFFF, 32'h3F800000);
    pair(32'h3FFFFFFF, 32'h33800000); pair(32'h3FFFFFFF, 32'h3FC00000);
    pair(32'h3F800001, 32'h33800000); pair(32'h3FFFFFFF, 32'h3E800009);
    pair(32'h7F7FFFFF, 32'h7F7FFFFF); pair(32'h7F7FFFFF, 32'h73000000);
    pair(32'h7F7FFFFF, 32'h72FFFFFF); pair(32'hFF7FFFFF, 32'hFF7FFFFF);
    pair(32'h3F800000, 32'h3F800000); pair(32'h3F800000, 32'h3E800000);
    pair(32'h3F800000, 32'hBE800003); pair(32'h3F800000, 32'hBE800001);
    pair(32'h3F800001, 32'h33040000); pair(32'h3F800001, 32'hB3800001);
    pair(32'h40000000, 32'hB3800001);
    pair(32'h7FC00055, 32'h3F800000); pair(32'h7FA00000, 32'h3F800000);
    pair(32'hFFC00001, 32'h7F800000); pair(32'h7F800001, 32'h00000000);
    pair(32'h7F800000, 32'hFF800000);
    if (n_valid_driven !== 92) begin
      $display("FAIL tb_stream: corner phase drove %0d pairs, expected 92",
               n_valid_driven);
      $fatal(1, "corner count");
    end

    // --- phase 1b: directed adversarial adjacency, 10 slots ---
    // The four rounding-carry renormalize reachers, each IMMEDIATELY
    // adjacent to screen-path traffic -- no idle cycles. With every seam
    // registered, a NaN in slot n and a tie in slot n+1 cannot see each
    // other; one forgotten register makes that false (the skew mutant).
    slot(1'b1, 32'h4B800000, 32'hB3800000);   // renorm reacher 1
    slot(1'b1, 32'h7FC00055, 32'h3F800000);   // qNaN payload
    slot(1'b1, 32'h4B000000, 32'hBDFFFFFF);   // renorm reacher 2
    slot(1'b1, 32'h7F800000, 32'hFF800000);   // inf + (-inf): invalid
    slot(1'b1, 32'h3FFFFFFF, 32'h33800000);   // renorm reacher 3
    slot(1'b1, 32'h80000000, 32'h80000000);   // signed zero
    slot(1'b1, 32'h7F7FFFFF, 32'h73000000);   // renorm reacher 4 (overflow)
    slot(1'b1, 32'h7FA00000, 32'h3F800000);   // sNaN
    slot(1'b1, 32'h3FC00000, 32'hBFC00000);   // exact-cancellation tie
    slot(1'b1, 32'h00800000, 32'h80000001);   // subnormal cancellation
    if (n_valid_driven !== 102) begin
      $display("FAIL tb_stream: adjacency phase ended at %0d pairs, expected 102",
               n_valid_driven);
      $fatal(1, "adjacency count");
    end

    // Bubble flush: let the corner/adjacency traffic evaluate its round
    // stage, then pin the stage-qualified coverage count.
    repeat (LAT + 2) bubble;
    rr_corner = rr_count;
    if (rr_corner !== 12) begin
      $display("FAIL tb_stream: renorm fired %0d times over corners+adjacency, expected 12",
               rr_corner);
      mismatches = mismatches + 1;
    end

    // --- phase 2: five-regime random, one NEW pair EVERY cycle ---
    for (regime = 0; regime < 5; regime = regime + 1)
      for (i = 0; i < NPR; i = i + 1) begin
        case (regime)
          0: begin ra = $urandom; rb = $urandom; end
          1: begin
            e1 = 1 + ($urandom % 254); e2 = e1 + ($urandom % 3) - 1;
            if (e2 < 1) e2 = 1; if (e2 > 254) e2 = 254;
            ra = mkfp($urandom, e1, $urandom); rb = mkfp($urandom, e2, $urandom);
          end
          2: begin
            e1 = 1 + ($urandom % 254); e2 = e1 + ($urandom % 61) - 30;
            if (e2 < 1) e2 = 1; if (e2 > 254) e2 = 254;
            ra = mkfp($urandom, e1, $urandom); rb = mkfp($urandom, e2, $urandom);
          end
          3: begin
            ra = mkfp($urandom, $urandom % 3, $urandom);
            rb = mkfp($urandom, $urandom % 3, $urandom);
          end
          default: begin
            ra = mkfp($urandom, 250 + ($urandom % 5), $urandom);
            rb = mkfp($urandom, 250 + ($urandom % 5), $urandom);
          end
        endcase
        slot(1'b1, ra, rb);
      end

    // --- phase 3: random valid/bubble mix, X data on every bubble ---
    for (i = 0; i < NMIX; i = i + 1)
      if (($urandom % 2) == 1) begin
        ra = $urandom; rb = $urandom;
        slot(1'b1, ra, rb);
        mix_valid = mix_valid + 1;
      end else
        bubble;

    // --- phase 4: drain under X while the last transactions retire ---
    repeat (LAT + 3) bubble;

    // Trailing quiet: nothing in flight, out_valid must sit at hard 0.
    repeat (3) begin
      @(negedge clk);
      if (ov !== 1'b0) begin
        mismatches = mismatches + 1;
        $display("FAIL tb_stream: out_valid=%b after drain", ov);
      end
    end

    // --- count guards ---
    if (n_checked_valid !== n_valid_driven) begin
      $display("FAIL tb_stream: %0d valid pairs driven but %0d checked (truncated drain)",
               n_valid_driven, n_checked_valid);
      $fatal(1, "drain count");
    end
    if (ov_cycles !== n_valid_driven) begin
      $display("FAIL tb_stream: %0d out_valid cycles for %0d valid pairs (throughput != 1/cycle)",
               ov_cycles, n_valid_driven);
      $fatal(1, "throughput count");
    end
    if (n_valid_driven !== 102 + 5*NPR + mix_valid) begin
      $display("FAIL tb_stream: drove %0d valid pairs, expected %0d",
               n_valid_driven, 102 + 5*NPR + mix_valid);
      $fatal(1, "drive count");
    end
    if (n_valid_driven < 100103) begin
      $display("FAIL tb_stream: only %0d valid pairs driven (full run needs >= 100103)",
               n_valid_driven);
      $fatal(1, "drive floor");
    end
    if (mismatches !== 0) begin
      $display("classes: result-changed=%0d flag-only=%0d X=%0d",
               mm_res, mm_flag, xfails);
      $fatal(1, "FAIL tb_stream: %0d mismatches (%0d X-class)", mismatches, xfails);
    end
    $display("PASS tb_stream LAT=%0d (%0d valid pairs incl 92 corners + 10 adjacency, %0d bubbles, 1 result/cycle, renorm corner=%0d random=%0d)",
             LAT, n_valid_driven, n_checked_bubble, rr_corner, rr_count - rr_corner);
    $finish;
  end
endmodule

`default_nettype wire
