`timescale 1ns/1ps
`default_nettype none

// Chapter 11: the 4-stage pipelined fp32_add2. Latency 4, one result per
// cycle, same bank pattern as fp32_add2_p2 repeated at chapter 9's other
// priced seams: bank A = the 100-bit swap cut, bank B = the 73-bit addsub
// cut, bank C = the 72-bit normalize cut, bank D = the 35-bit output cut,
// plus a 4-bit valid pipe. 100 + 73 + 72 + 35 + 4 = 284 state bits --
// 2.6x the flops of the 2-stage version for the same function.
//
// The 95-bit align seam is deliberately the one seam NOT registered:
// it is the most expensive of the three interior seams, and fusing
// align+addsub into stage 2 keeps the G/R packing convention (sml27 =
// {1'b0, aligned, g, r} -- the boundary that hosted chapter 9's
// only-integration-visible bug) inside a single stage.
//
// Stage logic: S1 = unpack+screen+swap, S2 = align+addsub,
// S3 = normalize, S4 = round_pack + the screen mux. As in the 2-stage
// version, the valid pipe is the only reset domain and no datapath logic
// is new -- pipelining is wiring plus register banks.
module fp32_add2_p4
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

  // ---- stage 1 combinational: unpack + screen + swap ----
  wire        sa, sb;
  wire [7:0]  ea, eb;
  wire [23:0] siga, sigb;
  wire        screen, inv_scr;
  wire [31:0] screen_res;
  wire        sign_big, eff_sub;
  wire [7:0]  e_big, e_sml;
  wire [23:0] sig_big, sig_sml;

  fp32_unpack    u_unpack (.a(a), .b(b), .sa(sa), .sb(sb), .ea(ea), .eb(eb),
                           .siga(siga), .sigb(sigb));
  fp32_screen    u_screen (.a(a), .b(b), .screen(screen),
                           .screen_res(screen_res), .invalid(inv_scr));
  fp32_swap      u_swap   (.a(a), .b(b), .sa(sa), .sb(sb), .ea(ea), .eb(eb),
                           .siga(siga), .sigb(sigb),
                           .sign_big(sign_big), .e_big(e_big), .e_sml(e_sml),
                           .sig_big(sig_big), .sig_sml(sig_sml),
                           .eff_sub(eff_sub));

  // ---- bank A: the 100-bit swap cut (66 datapath + 34 screen) ----
  reg        a_sign_big, a_eff_sub;
  reg [7:0]  a_e_big, a_e_sml;
  reg [23:0] a_sig_big, a_sig_sml;
  reg        a_screen, a_invalid;
  reg [31:0] a_screen_res;
  always @(posedge clk) begin
    a_sign_big   <= sign_big;
    a_eff_sub    <= eff_sub;
    a_e_big      <= e_big;
    a_e_sml      <= e_sml;
    a_sig_big    <= sig_big;
    a_sig_sml    <= sig_sml;
    a_screen     <= screen;
    a_invalid    <= inv_scr;
    a_screen_res <= screen_res;
  end

  // ---- stage 2 combinational: align + addsub, fused ----
  wire [23:0] aligned;
  wire        g_al, r_al, s_al;
  wire [26:0] sum27;
  wire        exact_zero;

  fp32_align     u_align  (.e_big(a_e_big), .e_sml(a_e_sml),
                           .sig_sml(a_sig_sml), .aligned(aligned),
                           .g(g_al), .r(r_al), .s(s_al));
  fp32_addsub    u_addsub (.eff_sub(a_eff_sub), .sig_big(a_sig_big),
                           .aligned(aligned), .g(g_al), .r(r_al), .s(s_al),
                           .sum27(sum27), .exact_zero(exact_zero));

  // ---- bank B: the 73-bit addsub cut (39 datapath + 34 screen) ----
  reg        b_sign_big, b_eff_sub, b_s_al, b_exact_zero;
  reg [7:0]  b_e_big;
  reg [26:0] b_sum27;
  reg        b_screen, b_invalid;
  reg [31:0] b_screen_res;
  always @(posedge clk) begin
    b_sign_big   <= a_sign_big;
    b_eff_sub    <= a_eff_sub;
    b_s_al       <= s_al;
    b_exact_zero <= exact_zero;
    b_e_big      <= a_e_big;
    b_sum27      <= sum27;
    b_screen     <= a_screen;
    b_invalid    <= a_invalid;
    b_screen_res <= a_screen_res;
  end

  // ---- stage 3 combinational: normalize ----
  wire [23:0] nsig;
  wire        ng, nr, ns;
  wire [8:0]  e_norm;

  fp32_normalize u_norm   (.eff_sub(b_eff_sub), .sum27(b_sum27),
                           .s_in(b_s_al), .e_big(b_e_big), .nsig(nsig),
                           .ng(ng), .nr(nr), .ns(ns), .e_norm(e_norm));

  // ---- bank C: the 72-bit normalize cut (38 datapath + 34 screen) ----
  reg        c_sign, c_exact_zero;
  reg [23:0] c_nsig;
  reg        c_ng, c_nr, c_ns;
  reg [8:0]  c_e_norm;
  reg        c_screen, c_invalid;
  reg [31:0] c_screen_res;
  always @(posedge clk) begin
    c_sign       <= b_sign_big;
    c_exact_zero <= b_exact_zero;
    c_nsig       <= nsig;
    c_ng         <= ng;
    c_nr         <= nr;
    c_ns         <= ns;
    c_e_norm     <= e_norm;
    c_screen     <= b_screen;
    c_invalid    <= b_invalid;
    c_screen_res <= b_screen_res;
  end

  // ---- stage 4 combinational: round_pack ----
  wire [31:0] dp_res;
  wire        ovf, inx_dp;

  fp32_round_pack u_round (.sign(c_sign), .exact_zero(c_exact_zero),
                           .nsig(c_nsig), .ng(c_ng), .nr(c_nr), .ns(c_ns),
                           .e_norm(c_e_norm), .dp_res(dp_res), .ovf(ovf),
                           .inexact_dp(inx_dp));

  // ---- bank D: the 35-bit output cut ----
  reg [31:0] d_result;
  reg        d_invalid, d_overflow, d_inexact;
  always @(posedge clk) begin
    d_result   <= c_screen ? c_screen_res : dp_res;
    d_invalid  <= c_invalid;
    d_overflow <= ~c_screen & ovf;
    d_inexact  <= ~c_screen & inx_dp;
  end

  assign result   = d_result;
  assign invalid  = d_invalid;
  assign overflow = d_overflow;
  assign inexact  = d_inexact;

  // ---- valid pipe: the only reset domain ----
  reg [3:0] vpipe;
  always @(posedge clk)
    if (!rst_n) vpipe <= 4'b0000;
    else        vpipe <= {vpipe[2:0], in_valid};
  assign out_valid = vpipe[3];

endmodule

`default_nettype wire
