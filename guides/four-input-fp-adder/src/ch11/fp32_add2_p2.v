`timescale 1ns/1ps
`default_nettype none

// Chapter 11: the 2-stage pipelined fp32_add2. Latency 2, one result per
// cycle. NOT ONE LINE of datapath logic is new: stage 1 instantiates
// chapter 9's unpack/screen/swap/align/addsub exactly as fp32_add2 does,
// stage 2 instantiates normalize/round_pack the same way, and the only
// additions are two register banks at chapter 9's priced seams plus a
// 2-bit valid pipe. Bank 1 is the 73-bit addsub cut (the cheapest
// interior seam, sitting right after the deepest front-half logic); bank
// 2 is the 35-bit output cut -- an unregistered final mux would hang the
// whole normalize/round cloud on the output port. 73 + 35 + 2 = 110
// state bits.
//
// The valid pipe is the ONLY reset domain. The data banks free-run: what
// makes fill-window outputs ignorable is the out_valid gate, not data
// cleanliness -- a full datapath reset manufactures a defined-looking
// +inf/overflow out of the illegal all-zeros state (chapter 11, "Reset
// the Control, Not the Datapath", measured in tb_reset.v).
//
// Proven bit-identical to the combinational fp32_add2 -- result and all
// three flags -- over 100k+ streamed pairs per run of tb_stream.v, a new
// pair EVERY cycle with X-data bubbles and an X drain.
module fp32_add2_p2
  (input  wire        clk,
   input  wire        rst_n,
   input  wire        in_valid,
   input  wire [31:0] a,
   input  wire [31:0] b,
   output wire [31:0] result,
   output wire        invalid,
   output wire        overflow,
   output wire        inexact,
   output wire        out_valid);

  // ---- stage 1 combinational: golden steps 1-5, chapter 9's modules ----
  wire        sa, sb;
  wire [7:0]  ea, eb;
  wire [23:0] siga, sigb;
  wire        screen, inv_scr;
  wire [31:0] screen_res;
  wire        sign_big, eff_sub;
  wire [7:0]  e_big, e_sml;
  wire [23:0] sig_big, sig_sml;
  wire [23:0] aligned;
  wire        g_al, r_al, s_al;
  wire [26:0] sum27;
  wire        exact_zero;

  fp32_unpack    u_unpack (.a(a), .b(b), .sa(sa), .sb(sb), .ea(ea), .eb(eb),
                           .siga(siga), .sigb(sigb));
  fp32_screen    u_screen (.a(a), .b(b), .screen(screen),
                           .screen_res(screen_res), .invalid(inv_scr));
  fp32_swap      u_swap   (.a(a), .b(b), .sa(sa), .sb(sb), .ea(ea), .eb(eb),
                           .siga(siga), .sigb(sigb),
                           .sign_big(sign_big), .e_big(e_big), .e_sml(e_sml),
                           .sig_big(sig_big), .sig_sml(sig_sml),
                           .eff_sub(eff_sub));
  fp32_align     u_align  (.e_big(e_big), .e_sml(e_sml), .sig_sml(sig_sml),
                           .aligned(aligned), .g(g_al), .r(r_al), .s(s_al));
  fp32_addsub    u_addsub (.eff_sub(eff_sub), .sig_big(sig_big),
                           .aligned(aligned), .g(g_al), .r(r_al), .s(s_al),
                           .sum27(sum27), .exact_zero(exact_zero));

  // ---- bank 1: the 73-bit addsub cut ----
  // 39 datapath bits + the 34-bit screen side channel. The screen is
  // computed ONCE, in stage 1; its RESULT is pipelined, never recomputed.
  reg        p1_sign_big, p1_eff_sub, p1_s_al, p1_exact_zero;
  reg [7:0]  p1_e_big;
  reg [26:0] p1_sum27;
  reg        p1_screen, p1_invalid;
  reg [31:0] p1_screen_res;
  always @(posedge clk) begin
    p1_sign_big   <= sign_big;
    p1_eff_sub    <= eff_sub;
    p1_s_al       <= s_al;
    p1_exact_zero <= exact_zero;
    p1_e_big      <= e_big;
    p1_sum27      <= sum27;
    p1_screen     <= screen;
    p1_invalid    <= inv_scr;
    p1_screen_res <= screen_res;
  end

  // ---- stage 2 combinational: golden steps 6-9 ----
  wire [23:0] nsig;
  wire        ng, nr, ns;
  wire [8:0]  e_norm;
  wire [31:0] dp_res;
  wire        ovf, inx_dp;

  fp32_normalize  u_norm  (.eff_sub(p1_eff_sub), .sum27(p1_sum27),
                           .s_in(p1_s_al), .e_big(p1_e_big), .nsig(nsig),
                           .ng(ng), .nr(nr), .ns(ns), .e_norm(e_norm));
  fp32_round_pack u_round (.sign(p1_sign_big), .exact_zero(p1_exact_zero),
                           .nsig(nsig), .ng(ng), .nr(nr), .ns(ns),
                           .e_norm(e_norm), .dp_res(dp_res), .ovf(ovf),
                           .inexact_dp(inx_dp));

  // ---- bank 2: the 35-bit output cut ----
  // Chapter 9's step-10 mux (result = screen ? screen_res : dp_res) moved
  // INTO this bank's non-blocking assignment: "a top module is wiring"
  // survives, with the wiring now clocked.
  reg [31:0] p2_result;
  reg        p2_invalid, p2_overflow, p2_inexact;
  always @(posedge clk) begin
    p2_result   <= p1_screen ? p1_screen_res : dp_res;
    p2_invalid  <= p1_invalid;
    p2_overflow <= ~p1_screen & ovf;
    p2_inexact  <= ~p1_screen & inx_dp;
  end

  assign result   = p2_result;
  assign invalid  = p2_invalid;
  assign overflow = p2_overflow;
  assign inexact  = p2_inexact;

  // ---- valid pipe: the only reset domain ----
  reg [1:0] vpipe;
  always @(posedge clk)
    if (!rst_n) vpipe <= 2'b00;
    else        vpipe <= {vpipe[0], in_valid};
  assign out_valid = vpipe[1];

endmodule

`default_nettype wire
