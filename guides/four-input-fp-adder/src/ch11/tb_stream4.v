`timescale 1ns/1ps
`default_nettype none

// Chapter 11: streaming equivalence for the pipelined four-input tree.
// Same scoreboard shape as tb_stream.v -- shared-index LAT-deep circular
// queue, `!==` behind an X-guard, out_valid checked with === on every
// cycle, X-data bubbles, drain under X, count guards -- with LAT = 4 and
// the oracle now chapter 10's COMBINATIONAL fp32_add4_tree in the same
// simulation, so the equivalence chain runs pipelined tree -> tree ->
// (chapter 10's sweeps) -> golden model -> exact arithmetic.
//
// The directed quads put flaggy traffic IMMEDIATELY adjacent to benign
// traffic on purpose: a flag mis-alignment bug (the NOFD mutant -- the
// level-1 flag OR taken combinationally, chapter 10's rule pasted in
// without its new latency clause) corrupts NOTHING that result-bit
// checking sees; it retires a neighbor's flags, and only neighbors with
// DIFFERENT flags expose it. Mismatches are classified result-changed /
// flag-only / X so that record shows up in the kill counts.
module tb_stream4;
  localparam [31:0] SEED = 32'd9090;
  localparam integer LAT  = 4;
  localparam integer NPR  = 20000;   // random quads per regime, x5 regimes
  localparam integer NMIX = 2000;    // random valid/bubble mix slots

  reg         clk, rst_n, in_valid;
  reg  [31:0] a, b, c, d;
  wire [31:0] r_p, r_c;
  wire        inv_p, ovf_p, inx_p, ov;
  wire        inv_c, ovf_c, inx_c;

  fp32_add4_tree_p dut (.clk(clk), .rst_n(rst_n), .in_valid(in_valid),
                        .a(a), .b(b), .c(c), .d(d), .result(r_p),
                        .invalid(inv_p), .overflow(ovf_p),
                        .inexact(inx_p), .out_valid(ov));

  fp32_add4_tree refc (.a(a), .b(b), .c(c), .d(d), .result(r_c),
                       .invalid(inv_c), .overflow(ovf_c), .inexact(inx_c));

  reg [34:0] eq [0:LAT-1];
  reg        vq [0:LAT-1];

  integer cyc, idx;
  integer n_valid_driven, n_checked_valid, n_checked_bubble, mix_valid;
  integer mismatches, xfails, mm_res, mm_flag, ov_cycles;
  integer seed, dummy, regime, i;

  always #5 clk = ~clk;

  initial begin : watchdog
    #60_000_000;
    $display("FAIL tb_stream4: timeout");
    $fatal(1, "timeout");
  end

  always @(negedge clk)
    if (ov === 1'b1) ov_cycles = ov_cycles + 1;

  task slot(input valid, input [31:0] wa, input [31:0] wb,
            input [31:0] wc, input [31:0] wd);
    begin
      @(negedge clk);
      idx = cyc % LAT;                    // ONE index for check AND store
      if (cyc >= LAT) begin
        if (vq[idx]) begin
          if (ov !== 1'b1) begin
            mismatches = mismatches + 1;
            if (mismatches <= 10)
              $display("FAIL tb_stream4 cyc %0d: retired out_valid=%b, expected 1",
                       cyc, ov);
          end else if ((^{r_p, inv_p, ovf_p, inx_p}) === 1'bx) begin
            xfails = xfails + 1; mismatches = mismatches + 1;
            if (mismatches <= 10)
              $display("FAIL tb_stream4 cyc %0d: X in outputs: %h/%b%b%b",
                       cyc, r_p, inv_p, ovf_p, inx_p);
          end else if ({r_p, inv_p, ovf_p, inx_p} !== eq[idx]) begin
            mismatches = mismatches + 1;
            if (r_p !== eq[idx][34:3]) mm_res = mm_res + 1;
            else                       mm_flag = mm_flag + 1;
            if (mismatches <= 10)
              $display("FAIL tb_stream4 cyc %0d: pipe %h/%b%b%b tree %h/%b%b%b",
                       cyc, r_p, inv_p, ovf_p, inx_p,
                       eq[idx][34:3], eq[idx][2], eq[idx][1], eq[idx][0]);
          end
          n_checked_valid = n_checked_valid + 1;
        end else begin
          if (ov !== 1'b0) begin
            mismatches = mismatches + 1;
            if (mismatches <= 10)
              $display("FAIL tb_stream4 cyc %0d: bubble retired out_valid=%b",
                       cyc, ov);
          end
          n_checked_bubble = n_checked_bubble + 1;
        end
      end else begin
        if (ov !== 1'b0) begin
          mismatches = mismatches + 1;
          $display("FAIL tb_stream4 cyc %0d: out_valid=%b during fill", cyc, ov);
        end
      end
      in_valid = valid;
      a = wa; b = wb; c = wc; d = wd;
      #1;                                 // combinational tree settles
      vq[idx] = valid;
      if (valid) begin
        eq[idx] = {r_c, inv_c, ovf_c, inx_c};
        n_valid_driven = n_valid_driven + 1;
      end
      cyc = cyc + 1;
    end
  endtask

  task bubble;                            // X data, first-class
    slot(1'b0, 32'hx, 32'hx, 32'hx, 32'hx);
  endtask

  function [31:0] mkfp(input [31:0] sgn, input integer e, input [22:0] frac);
    mkfp = {sgn[0], e[7:0], frac};
  endfunction

  // ch10's operand regimes, one draw per operand
  function [31:0] rnd_op(input integer regime);
    case (regime)
      0: rnd_op = $urandom;                                       // raw bits
      1: rnd_op = mkfp($urandom, 120 + ($urandom % 9), $urandom); // clustered
      2: rnd_op = mkfp($urandom, 1 + ($urandom % 254), $urandom); // wide
      3: rnd_op = mkfp($urandom, $urandom % 3, $urandom);         // tiny
      default:
         rnd_op = mkfp($urandom, 250 + ($urandom % 5), $urandom); // huge
    endcase
  endfunction

  initial begin
    $display("SEED=%0d LAT=%0d", SEED, LAT);
    seed = SEED; dummy = $urandom(seed);   // seed once, discard first draw
    clk = 1'b0; rst_n = 1'b0; in_valid = 1'b0;
    a = 32'hx; b = 32'hx; c = 32'hx; d = 32'hx;
    cyc = 0; n_valid_driven = 0; n_checked_valid = 0; n_checked_bubble = 0;
    mix_valid = 0; mismatches = 0; xfails = 0; mm_res = 0; mm_flag = 0;
    ov_cycles = 0;
    for (i = 0; i < LAT; i = i + 1) begin
      vq[i] = 1'b0; eq[i] = 35'd0;
    end
    repeat (2) @(posedge clk);
    @(negedge clk) rst_n = 1'b1;

    // --- directed quads, back-to-back: flaggy adjacent to benign ---
    slot(1, 32'h3F800000, 32'h40000000, 32'h40400000, 32'h40800000); // 1+2+3+4
    slot(1, 32'h7F7FFFFF, 32'h7F7FFFFF, 32'hFF800000, 32'h3F800000); // L1 overflow, then inf+(-inf): invalid
    slot(1, 32'h3F800000, 32'h3F800000, 32'h3F800000, 32'h3F800000); // benign
    slot(1, 32'h7F7FFFFF, 32'h7F7FFFFF, 32'hFF7FFFFF, 32'hFF7FFFFF); // ch10 multiset, tree order: qNaN
    slot(1, 32'h3F800000, 32'hBF800000, 32'h3F800000, 32'hBF800000); // exact zero
    slot(1, 32'h7F7FFFFF, 32'hFF7FFFFF, 32'h7F7FFFFF, 32'hFF7FFFFF); // interleaved multiset: +0
    slot(1, 32'h7FC00055, 32'h3F800000, 32'h40000000, 32'h40400000); // qNaN payload ride-through
    slot(1, 32'h3F800000, 32'h33800000, 32'hB3800000, 32'hBF800000); // cancel + tiny
    slot(1, 32'h7FA00000, 32'h00000000, 32'h00000000, 32'h00000000); // sNaN: invalid
    slot(1, 32'h00000001, 32'h00000001, 32'h80000001, 32'h80000002); // subnormals
    slot(1, 32'h4B800000, 32'hB3800000, 32'h3FFFFFFF, 32'h33800000); // renorm reachers in BOTH L1 adders
    slot(1, 32'h3F800000, 32'h40000000, 32'h40400000, 32'h40800000); // benign again
    slot(1, 32'h7F800000, 32'h3F800000, 32'h40000000, 32'h40400000); // inf absorbs
    slot(1, 32'h00000000, 32'h80000000, 32'h80000000, 32'h00000000); // signed zeros
    slot(1, 32'h7F7FFFFF, 32'h73000000, 32'h3F800000, 32'hBF800000); // reacher + exact cancel
    slot(1, 32'h3F800000, 32'h3F800001, 32'hBF800000, 32'hBF800001); // near-cancel
    if (n_valid_driven !== 16) begin
      $display("FAIL tb_stream4: directed phase drove %0d quads, expected 16",
               n_valid_driven);
      $fatal(1, "directed count");
    end

    // --- 100,000 random quads, one NEW quad EVERY cycle ---
    for (regime = 0; regime < 5; regime = regime + 1)
      for (i = 0; i < NPR; i = i + 1)
        slot(1, rnd_op(regime), rnd_op(regime), rnd_op(regime), rnd_op(regime));

    // --- random valid/bubble mix, X data on every bubble ---
    for (i = 0; i < NMIX; i = i + 1)
      if (($urandom % 2) == 1) begin
        slot(1, rnd_op(1), rnd_op(1), rnd_op(1), rnd_op(1));
        mix_valid = mix_valid + 1;
      end else
        bubble;

    // --- drain under X ---
    repeat (LAT + 3) bubble;

    repeat (3) begin
      @(negedge clk);
      if (ov !== 1'b0) begin
        mismatches = mismatches + 1;
        $display("FAIL tb_stream4: out_valid=%b after drain", ov);
      end
    end

    // --- count guards ---
    if (n_checked_valid !== n_valid_driven) begin
      $display("FAIL tb_stream4: %0d valid quads driven but %0d checked (truncated drain)",
               n_valid_driven, n_checked_valid);
      $fatal(1, "drain count");
    end
    if (ov_cycles !== n_valid_driven) begin
      $display("FAIL tb_stream4: %0d out_valid cycles for %0d valid quads",
               ov_cycles, n_valid_driven);
      $fatal(1, "throughput count");
    end
    if (n_valid_driven !== 16 + 5*NPR + mix_valid) begin
      $display("FAIL tb_stream4: drove %0d valid quads, expected %0d",
               n_valid_driven, 16 + 5*NPR + mix_valid);
      $fatal(1, "drive count");
    end
    if (n_valid_driven < 100017) begin
      $display("FAIL tb_stream4: only %0d valid quads driven (full run needs >= 100017)",
               n_valid_driven);
      $fatal(1, "drive floor");
    end
    if (mismatches !== 0) begin
      $display("classes: result-changed=%0d flag-only=%0d X=%0d",
               mm_res, mm_flag, xfails);
      $fatal(1, "FAIL tb_stream4: %0d mismatches", mismatches);
    end
    $display("PASS tb_stream4 (%0d valid quads incl 16 directed, %0d bubbles, 1 result/cycle, latency 4)",
             n_valid_driven, n_checked_bubble);
    $finish;
  end
endmodule

`default_nettype wire
