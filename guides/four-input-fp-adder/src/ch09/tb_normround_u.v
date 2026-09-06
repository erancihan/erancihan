`timescale 1ns/1ps
`default_nettype none

// Chapter 9: unit testbench for fp32_normalize and fp32_round_pack --
// two DUTs, driven independently, because their boundary (nsig/ng/nr/ns/
// e_norm) is one of chapter 11's register cuts and each side must hold
// its own contract.
//
// Normalize, 7 vectors: right-1 with the old-LSB sticky fold ISOLATED
// (s_in = 0, sum27[0] = 1 -- the fold is the only sticky source); right-1
// into the overflow exponent range (e_norm = 255, legal here, the ninth
// bit's reason); no-shift; left-8; the subnormal stop (lz = 8 but
// e_big = 5, so the shift stops at 4 and e_norm = 1); left-1 with sticky
// alive. Round_pack, 9 vectors: exact / round-up / both tie directions,
// the ROUNDING-CARRY RENORMALIZE (nsig = FFFFFF with G and R -- trivially
// reachable at module level, 0-in-a-million end to end), the renormalize
// INTO overflow, exact-sum overflow (inexact must still fire), a
// subnormal pack, and exact_zero priority. Expected values from an
// independent python3 model, pasted as constants.
module tb_normround_u;
  // --- normalize under test ---
  reg         eff_sub;
  reg  [26:0] sum27;
  reg         s_in;
  reg  [7:0]  e_big;
  wire [23:0] nsig;
  wire        ng, nr, ns;
  wire [8:0]  e_norm;
  fp32_normalize u_n (.eff_sub(eff_sub), .sum27(sum27), .s_in(s_in),
                      .e_big(e_big), .nsig(nsig), .ng(ng), .nr(nr), .ns(ns),
                      .e_norm(e_norm));
  // --- round_pack under test ---
  reg         sign, ez;
  reg  [23:0] rn_sig;
  reg         rg, rr, rs;
  reg  [8:0]  re;
  wire [31:0] dp;
  wire        ovf, inx;
  fp32_round_pack u_r (.sign(sign), .exact_zero(ez), .nsig(rn_sig),
                       .ng(rg), .nr(rr), .ns(rs), .e_norm(re),
                       .dp_res(dp), .ovf(ovf), .inexact_dp(inx));
  integer errors, checks;
  initial begin : watchdog
    #100000;
    $display("FAIL tb_normround_u: timeout");
    $fatal(1, "timeout");
  end
  task chkn(input esub, input [26:0] sm, input si, input [7:0] eb,
            input [23:0] en_sig, input eg, input er, input es, input [8:0] ee);
    begin
      eff_sub = esub; sum27 = sm; s_in = si; e_big = eb; #1;
      if ({nsig, ng, nr, ns, e_norm} !== {en_sig, eg, er, es, ee}) begin
        errors = errors + 1;
        $display("FAIL tb_normround_u norm es=%b sum=%h s=%b eb=%0d: got %h/%b%b%b/%0d want %h/%b%b%b/%0d",
                 esub, sm, si, eb, nsig, ng, nr, ns, e_norm, en_sig, eg, er, es, ee);
      end
      checks = checks + 1;
    end
  endtask
  task chkr(input sg, input ezi, input [23:0] nsg, input gi, input ri,
            input si, input [8:0] en, input [31:0] edp, input eov, input einx);
    begin
      sign = sg; ez = ezi; rn_sig = nsg; rg = gi; rr = ri; rs = si; re = en; #1;
      if ({dp, ovf, inx} !== {edp, eov, einx}) begin
        errors = errors + 1;
        $display("FAIL tb_normround_u round nsig=%h grs=%b%b%b e=%0d: got %h/%b/%b want %h/%b/%b",
                 nsg, gi, ri, si, en, dp, ovf, inx, edp, eov, einx);
      end
      checks = checks + 1;
    end
  endtask
  initial begin
    errors = 0; checks = 0;
    // normalize: right-1, s_in=0 so the old-LSB fold is the only sticky source
    chkn(1'b0, 27'h4000001, 1'b0, 8'd100, 24'h800000, 0, 0, 1, 9'd101);
    chkn(1'b0, 27'h4243F6D, 1'b1, 8'd200, 24'h8487ED, 1, 0, 1, 9'd201);
    chkn(1'b0, 27'h4000005, 1'b0, 8'd254, 24'h800000, 1, 0, 1, 9'd255); // into ovf range
    chkn(1'b0, 27'h3234ABC, 1'b0, 8'd100, 24'hC8D2AF, 0, 0, 0, 9'd100); // none
    chkn(1'b1, 27'h0020000, 1'b0, 8'd100, 24'h800000, 0, 0, 0, 9'd92);  // left-8
    chkn(1'b1, 27'h0020000, 1'b0, 8'd5,   24'h080000, 0, 0, 0, 9'd1);   // subnormal stop
    chkn(1'b1, 27'h1FFFFFF, 1'b1, 8'd77,  24'hFFFFFF, 1, 0, 1, 9'd76);  // left-1, S alive
    // round_pack
    chkr(1'b0, 1'b0, 24'hC90FDB, 0, 0, 0, 9'd147, 32'h49C90FDB, 0, 0); // exact
    chkr(1'b0, 1'b0, 24'hC90FDB, 1, 1, 0, 9'd147, 32'h49C90FDC, 0, 1); // up (G&R)
    chkr(1'b0, 1'b0, 24'hC90FDB, 1, 0, 0, 9'd147, 32'h49C90FDC, 0, 1); // tie, lbit=1: up
    chkr(1'b0, 1'b0, 24'hC90FDA, 1, 0, 0, 9'd147, 32'h49C90FDA, 0, 1); // tie, lbit=0: stay
    chkr(1'b1, 1'b0, 24'hFFFFFF, 1, 1, 0, 9'd200, 32'hE4800000, 0, 1); // rounding-carry renorm
    chkr(1'b0, 1'b0, 24'hFFFFFF, 1, 1, 0, 9'd254, 32'h7F800000, 1, 1); // renorm INTO overflow
    chkr(1'b0, 1'b0, 24'h800000, 0, 0, 0, 9'd255, 32'h7F800000, 1, 1); // ovf, exact sum: inx=1
    chkr(1'b1, 1'b0, 24'h000123, 0, 0, 0, 9'd1,   32'h80000123, 0, 0); // subnormal pack
    chkr(1'b0, 1'b1, 24'hC90FDB, 1, 1, 1, 9'd100, 32'h00000000, 0, 1); // exact_zero wins
    if (checks !== 16)
      $fatal(1, "FAIL tb_normround_u: %0d checks ran, expected 16", checks);
    if (errors !== 0)
      $fatal(1, "FAIL tb_normround_u: %0d error(s)", errors);
    $display("PASS tb_normround_u (7 normalize + 9 round_pack directed)");
    $finish;
  end
endmodule

`default_nettype wire
