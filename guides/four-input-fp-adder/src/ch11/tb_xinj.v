`timescale 1ns/1ps
`default_nettype none

// Chapter 11: single-bit X injection INTO a pipe register, mid-stream.
// Every 16th transaction, the registered alignment sticky (p1_s_al) is
// hierarchically deposited to x for exactly one stage-2 evaluation (the
// next bank-1 capture overwrites it). Clean slots are checked against
// the combinational reference throughout; injected slots are CLASSIFIED:
//
//   absorbed_correct -- output fully defined AND bit-correct: the X
//     landed where RNE had already decided (round_up = ng & (nr|ns|lbit)
//     did not need the sticky) and vanished without trace;
//   visible_x        -- some x reached an output bit;
//   absorbed_wrong   -- output fully defined but WRONG: never observed
//     on this bit, and a guarded failure if it ever appears.
//
// The measured headline (chapter 11, "X in the Pipe, Quantified"): a
// majority of single-bit X events on the registered sticky are absorbed
// into fully defined, bit-correct outputs. An output X-guard is
// therefore a real but PARTIAL X detector -- blind to the absorbed
// class -- so X-discipline must be enforced at injection points (reset
// strategy, valid gating), not detected at outputs.
module tb_xinj;
  localparam [31:0] SEED = 32'd7171;
  localparam integer LAT = 2;
  localparam integer N   = 20000;    // within-30 random pairs
  localparam integer INJ = 16;       // inject every 16th slot

  reg         clk, rst_n, in_valid;
  reg  [31:0] a, b;
  wire [31:0] r_p, r_c;
  wire        inv_p, ovf_p, inx_p, ov;
  wire        inv_c, ovf_c, inx_c;

  fp32_add2_p2 dut (.clk(clk), .rst_n(rst_n), .in_valid(in_valid),
                    .a(a), .b(b), .result(r_p), .invalid(inv_p),
                    .overflow(ovf_p), .inexact(inx_p), .out_valid(ov));

  fp32_add2 refc (.a(a), .b(b), .result(r_c),
                  .invalid(inv_c), .overflow(ovf_c), .inexact(inx_c));

  reg [34:0] eq [0:LAT-1];
  reg        vq [0:LAT-1];
  reg        xq [0:LAT-1];           // marks slots whose sticky got the X

  integer cyc, idx, i;
  integer injected, absorbed_correct, absorbed_wrong, visible_x;
  integer clean_mismatch, n_checked;
  integer seed, dummy, e1, e2;
  reg [31:0] ra, rb;
  reg        inj_arm;

  always #5 clk = ~clk;

  initial begin : watchdog
    #10_000_000;
    $display("FAIL tb_xinj: timeout");
    $fatal(1, "timeout");
  end

  // The injection: one cycle after the armed capture, while stage 2 is
  // evaluating that transaction, its registered sticky goes x.
  always @(posedge clk)
    if (inj_arm) begin
      #1 dut.p1_s_al = 1'bx;
    end

  task slot(input valid, input inject, input [31:0] wa, input [31:0] wb);
    begin
      @(negedge clk);
      idx = cyc % LAT;
      if (cyc >= LAT) begin
        if (vq[idx]) begin
          if (xq[idx]) begin
            injected = injected + 1;
            if (ov !== 1'b1) begin
              absorbed_wrong = absorbed_wrong + 1;   // valid must survive
              $display("FAIL tb_xinj cyc %0d: out_valid=%b on injected slot", cyc, ov);
            end else if ((^{r_p, inv_p, ovf_p, inx_p}) === 1'bx)
              visible_x = visible_x + 1;
            else if ({r_p, inv_p, ovf_p, inx_p} === eq[idx])
              absorbed_correct = absorbed_correct + 1;
            else begin
              absorbed_wrong = absorbed_wrong + 1;
              $display("FAIL tb_xinj cyc %0d: DEFINED WRONG output %h/%b%b%b under X",
                       cyc, r_p, inv_p, ovf_p, inx_p);
            end
          end else begin
            if (ov !== 1'b1 || (^{r_p, inv_p, ovf_p, inx_p}) === 1'bx ||
                {r_p, inv_p, ovf_p, inx_p} !== eq[idx]) begin
              clean_mismatch = clean_mismatch + 1;
              if (clean_mismatch <= 10)
                $display("FAIL tb_xinj cyc %0d: clean slot wrong: %h/%b%b%b",
                         cyc, r_p, inv_p, ovf_p, inx_p);
            end
          end
          n_checked = n_checked + 1;
        end
      end
      in_valid = valid;
      a = wa; b = wb;
      inj_arm = inject;
      #1;
      vq[idx] = valid;
      xq[idx] = inject;
      if (valid) eq[idx] = {r_c, inv_c, ovf_c, inx_c};
      cyc = cyc + 1;
    end
  endtask

  function [31:0] mkfp(input [31:0] sgn, input integer e, input [22:0] frac);
    mkfp = {sgn[0], e[7:0], frac};
  endfunction

  initial begin
    $display("SEED=%0d", SEED);
    seed = SEED; dummy = $urandom(seed);
    clk = 1'b0; rst_n = 1'b0; in_valid = 1'b0; inj_arm = 1'b0;
    a = 32'hx; b = 32'hx;
    cyc = 0; injected = 0; absorbed_correct = 0; absorbed_wrong = 0;
    visible_x = 0; clean_mismatch = 0; n_checked = 0;
    for (i = 0; i < LAT; i = i + 1) begin
      vq[i] = 1'b0; xq[i] = 1'b0; eq[i] = 35'd0;
    end
    repeat (2) @(posedge clk);
    @(negedge clk) rst_n = 1'b1;

    // within-30 exponent-difference pairs: the regime where the
    // alignment sticky is most often live
    for (i = 0; i < N; i = i + 1) begin
      e1 = 1 + ($urandom % 254); e2 = e1 + ($urandom % 61) - 30;
      if (e2 < 1) e2 = 1; if (e2 > 254) e2 = 254;
      ra = mkfp($urandom, e1, $urandom); rb = mkfp($urandom, e2, $urandom);
      slot(1'b1, (i % INJ) == 0, ra, rb);
    end
    repeat (LAT + 2) slot(1'b0, 1'b0, 32'hx, 32'hx);   // drain

    if (n_checked !== N) begin
      $display("FAIL tb_xinj: checked %0d slots, expected %0d", n_checked, N);
      $fatal(1, "check count");
    end
    if (injected !== N / INJ) begin
      $display("FAIL tb_xinj: %0d injections classified, expected %0d",
               injected, N / INJ);
      $fatal(1, "inject count");
    end
    if (absorbed_correct + visible_x !== injected || absorbed_wrong !== 0) begin
      $display("FAIL tb_xinj: classes do not add up (%0d + %0d + %0d != %0d)",
               absorbed_correct, visible_x, absorbed_wrong, injected);
      $fatal(1, "classification");
    end
    if (clean_mismatch !== 0)
      $fatal(1, "FAIL tb_xinj: %0d clean-slot mismatches", clean_mismatch);
    if (absorbed_correct == 0 || visible_x == 0) begin
      $display("FAIL tb_xinj: degenerate split (%0d absorbed, %0d visible)",
               absorbed_correct, visible_x);
      $fatal(1, "degenerate");
    end
    $display("PASS tb_xinj: injected=%0d absorbed_correct=%0d absorbed_WRONG=%0d visible_x=%0d clean_mismatch=%0d",
             injected, absorbed_correct, absorbed_wrong, visible_x, clean_mismatch);
    $finish;
  end
endmodule

`default_nettype wire
