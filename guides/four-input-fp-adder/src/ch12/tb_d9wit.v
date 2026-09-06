`timescale 1ns/1ps
`default_nettype none
// The D9 witness: a white-box invariant check on the DUT's OWN wires.
// fp32_addsub's contract says exact_zero is gated on eff_sub; the gate's
// deciding case (effective add of two zeros) is screened at every
// composition depth, so no black-box campaign can see it (ch10 D9).
// But the WIRE is not screened: the datapath still computes on screened
// operands, so the gate's output is observable hierarchically. This bench
// drives the both-zero quads directly and asserts the invariant
// exact_zero -> eff_sub inside all three fp32_add2 instances, on every
// vector. The B-M2 mutant fails on every armed vector (27 checks across
// the 17); the shipped design
// passes. Count-guarded; fire-guarded (the invariant must be EXERCISED:
// at least one vector must produce sum27==0 with eff_sub==0 at some
// instance, or the check never had the chance to fail -- ch10's T7
// lesson applied to an invariant).
module tb_d9wit;
  reg  [31:0] a, b, c, d;
  wire [31:0] res;
  wire inv, ovf, inx;
  integer errors = 0;
  integer checks = 0;
  integer armed  = 0;   // vectors where some instance saw eff_add with sum27==0

  fp32_add4_tree dut (.a(a), .b(b), .c(c), .d(d), .result(res),
                      .invalid(inv), .overflow(ovf), .inexact(inx));

  task chk_inv;   // the invariant, sampled on the DUT's own wires
    begin
      checks = checks + 1;
      if (dut.u_add_ab.u_addsub.sum27 == 27'd0 &&
          dut.u_add_ab.u_swap.eff_sub === 1'b0) armed = armed + 1;
      if (dut.u_add_cd.u_addsub.sum27 == 27'd0 &&
          dut.u_add_cd.u_swap.eff_sub === 1'b0) armed = armed + 1;
      if (dut.u_add_r.u_addsub.sum27 == 27'd0 &&
          dut.u_add_r.u_swap.eff_sub === 1'b0) armed = armed + 1;
      if (dut.u_add_ab.u_addsub.exact_zero === 1'b1 &&
          dut.u_add_ab.u_swap.eff_sub !== 1'b1) begin
        $display("FAIL tb_d9wit %h %h %h %h: u_add_ab exact_zero on an effective add", a, b, c, d);
        errors = errors + 1;
      end
      if (dut.u_add_cd.u_addsub.exact_zero === 1'b1 &&
          dut.u_add_cd.u_swap.eff_sub !== 1'b1) begin
        $display("FAIL tb_d9wit %h %h %h %h: u_add_cd exact_zero on an effective add", a, b, c, d);
        errors = errors + 1;
      end
      if (dut.u_add_r.u_addsub.exact_zero === 1'b1 &&
          dut.u_add_r.u_swap.eff_sub !== 1'b1) begin
        $display("FAIL tb_d9wit %h %h %h %h: u_add_r exact_zero on an effective add", a, b, c, d);
        errors = errors + 1;
      end
    end
  endtask

  reg [31:0] z [0:1];
  integer i0, i1, i2, i3;
  initial begin : run
    z[0] = 32'h00000000; z[1] = 32'h80000000;
    // all 16 signed-zero quads: every fp32_add2 sees two zeros; the
    // matching-sign combinations are the eff_add cases the gate owns
    for (i0 = 0; i0 < 2; i0 = i0 + 1)
      for (i1 = 0; i1 < 2; i1 = i1 + 1)
        for (i2 = 0; i2 < 2; i2 = i2 + 1)
          for (i3 = 0; i3 < 2; i3 = i3 + 1) begin
            a = z[i0]; b = z[i1]; c = z[i2]; d = z[i3];
            #1; chk_inv;
          end
    // cancellation-born zeros: stage 2 receives (+0)+(+0) as an
    // effective ADD with both operands born, not driven
    a = 32'h42f6e979; b = 32'hc2f6e979; c = 32'h3f800000; d = 32'hbf800000;
    #1; chk_inv;
    if (checks !== 17) begin
      $display("FAIL tb_d9wit: %0d checks ran, expected 17", checks);
      errors = errors + 1;
    end
    if (armed == 0) begin
      $display("FAIL tb_d9wit: invariant never armed (no eff_add with sum27==0 reached any instance)");
      errors = errors + 1;
    end
    if (errors == 0)
      $display("PASS tb_d9wit (17 vectors, invariant armed %0d times across 3 instances)", armed);
    else
      $fatal(1, "FAIL tb_d9wit: %0d error(s)", errors);
    $finish;
  end
endmodule
`default_nettype wire
