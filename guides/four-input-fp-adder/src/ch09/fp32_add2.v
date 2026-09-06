`timescale 1ns/1ps
`default_nettype none

// Chapter 9: the 2-input binary32 adder, composed. Golden step 10 lives
// here and nowhere else: the screen mux and the flag gating are the ONLY
// logic this module owns -- three assigns plus a pass-through. Everything
// else is wiring between the seven modules, whose boundaries are the
// golden algorithm's own step boundaries and chapter 11's register cuts
// (100 / 95 / 73 / 72 bits, counted from these port lists).
//
// Proven bit-identical to chapter 8's fp32_add_alg -- result AND all three
// flags, NaN sign included -- over the 46-pair corner library in both
// orders plus a five-regime random campaign (tb_equiv.v; 200,092 checks
// in the chapter's headline run).
module fp32_add2
  (input  wire [31:0] a,
   input  wire [31:0] b,
   output wire [31:0] result,
   output wire        invalid,
   output wire        overflow,
   output wire        inexact);

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
  wire [23:0] nsig;
  wire        ng, nr, ns;
  wire [8:0]  e_norm;
  wire [31:0] dp_res;
  wire        ovf, inx_dp;

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
  fp32_normalize u_norm   (.eff_sub(eff_sub), .sum27(sum27), .s_in(s_al),
                           .e_big(e_big), .nsig(nsig), .ng(ng), .nr(nr),
                           .ns(ns), .e_norm(e_norm));
  fp32_round_pack u_round (.sign(sign_big), .exact_zero(exact_zero),
                           .nsig(nsig), .ng(ng), .nr(nr), .ns(ns),
                           .e_norm(e_norm), .dp_res(dp_res), .ovf(ovf),
                           .inexact_dp(inx_dp));

  assign result   = screen ? screen_res : dp_res;
  assign invalid  = inv_scr;
  assign overflow = ~screen & ovf;
  assign inexact  = ~screen & inx_dp;

endmodule

`default_nettype wire
