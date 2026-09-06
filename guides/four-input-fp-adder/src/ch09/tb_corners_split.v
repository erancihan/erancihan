`timescale 1ns/1ps
`default_nettype none

// Chapter 9: chapter 8's directed corner library, carried forward to the
// split adder. The 46 pairs, both orders, the expected values (python3
// exact rational arithmetic -- independent of BOTH adders) and the
// check-count guard are UNCHANGED; what changed is the DUT instantiation
// and six of the thirteen hierarchical bin references, re-aimed into the
// submodule instances the refactor moved those wires into (dut.right1 ->
// dut.u_norm.right1 and so on). The other seven bins sample top-level
// wires and survive verbatim. A stale reference fails loudly at
// elaboration -- hierarchical references cannot become implicit nets --
// so a refactor cannot silently disconnect this gate; re-aiming the bins
// is the normal maintenance cost of a decomposition.
//
// The gate's reason is chapter 8's standing measurement: the rounding-
// carry renormalize fired ZERO times in 1,000,000 random pairs. The four
// directed reachers (4B800000+B3800000, 4B000000+BDFFFFFF,
// 3FFFFFFF+33800000, 7F7FFFFF+73000000) are the only vectors here that
// exercise it; delete them and the empty-bin gate fails the run --
// demonstrated, not assumed, in this chapter's mutation record.
//
// NaN rows are checked by class, quiet bit and payload, NEVER by sign: the
// sign of a generated NaN is unspecified (IEEE 754-2019 6.3) and this very
// simulator has produced both signs from one expression (chapter 7).
module tb_corners_split;

  reg  [31:0] a, b;
  wire [31:0] r;
  wire        inv, ovf, inx;
  integer     errors, checks;
  integer     bin_right1, bin_left2, bin_renorm, bin_stickysat;
  integer     bin_tie_up, bin_tie_dn, bin_subres, bin_ovfres;

  fp32_add2 dut
    (.a(a), .b(b), .result(r), .invalid(inv), .overflow(ovf), .inexact(inx));

  initial begin : watchdog
    #1000000;
    $display("FAIL tb_corners_split: timeout at %0t", $time);
    $fatal(1, "timeout");
  end

  // sample the coverage bins from the DUT's own wires -- what actually
  // happened in the datapath, not what the vector list intended
  task sample_bins;
    begin
      if (!dut.screen) begin
        if (dut.u_norm.right1)                bin_right1 = bin_right1 + 1;
        if (!dut.u_norm.right1 && dut.u_norm.shl >= 5'd2)
                                              bin_left2  = bin_left2  + 1;
        if (dut.u_round.round_renorm)         bin_renorm = bin_renorm + 1;
        if (dut.s_al && dut.u_align.shamt == 5'd26)
                                              bin_stickysat = bin_stickysat + 1;
        if (dut.ng && !dut.nr && !dut.ns)     // an exact tie reached the rounder
          if (dut.u_round.round_up) bin_tie_up = bin_tie_up + 1;
          else                      bin_tie_dn = bin_tie_dn + 1;
        if (dut.ovf)                          bin_ovfres = bin_ovfres + 1;
        if (!dut.ovf && !dut.exact_zero && !dut.u_round.fsig[23])
                                              bin_subres = bin_subres + 1;
      end
    end
  endtask

  task chk1(input [31:0] wa, input [31:0] wb, input [31:0] expct,
            input exp_inv, input exp_ovf, input exp_inx);
    begin
      a = wa; b = wb; #1;
      sample_bins;
      if (r !== expct) begin
        errors = errors + 1;
        $display("FAIL tb_corners_split %h+%h: got %h expected %h", wa, wb, r, expct);
      end
      if ({inv, ovf, inx} !== {exp_inv, exp_ovf, exp_inx}) begin
        errors = errors + 1;
        $display("FAIL tb_corners_split %h+%h: flags i/o/x=%b%b%b expected %b%b%b",
                 wa, wb, inv, ovf, inx, exp_inv, exp_ovf, exp_inx);
      end
      checks = checks + 1;
    end
  endtask

  task chk(input [31:0] wa, input [31:0] wb, input [31:0] expct,
           input exp_inv, input exp_ovf, input exp_inx);
    begin                        // addition commutes: both orders, same bits
      chk1(wa, wb, expct, exp_inv, exp_ovf, exp_inx);
      chk1(wb, wa, expct, exp_inv, exp_ovf, exp_inx);
    end
  endtask

  task chk_nan1(input [31:0] wa, input [31:0] wb, input exp_inv,
                input [22:0] exp_frac);
    begin
      a = wa; b = wb; #1;
      sample_bins;
      if (!(r[30:23] == 8'd255 && r[22:0] != 23'd0)) begin
        errors = errors + 1;
        $display("FAIL tb_corners_split %h+%h: got %h, expected a NaN", wa, wb, r);
      end else if (r[22:0] !== exp_frac) begin
        errors = errors + 1;      // quiet bit + payload; bit 31 never compared
        $display("FAIL tb_corners_split %h+%h: NaN frac %h expected %h",
                 wa, wb, r[22:0], exp_frac);
      end
      if ({inv, ovf, inx} !== {exp_inv, 2'b00}) begin
        errors = errors + 1;
        $display("FAIL tb_corners_split %h+%h: flags i/o/x=%b%b%b expected %b00",
                 wa, wb, inv, ovf, inx, exp_inv);
      end
      checks = checks + 1;
    end
  endtask

  task chk_nan(input [31:0] wa, input [31:0] wb, input exp_inv,
               input [22:0] exp_frac);
    begin
      chk_nan1(wa, wb, exp_inv, exp_frac);
      chk_nan1(wb, wa, exp_inv, exp_frac);
    end
  endtask

  initial begin
    errors = 0; checks = 0;
    bin_right1 = 0; bin_left2 = 0; bin_renorm = 0; bin_stickysat = 0;
    bin_tie_up = 0; bin_tie_dn = 0; bin_subres = 0; bin_ovfres = 0;

    // group A  zeros (the signed-zero rule is hard-coded, not computed)
    chk(32'h00000000, 32'h00000000, 32'h00000000, 1'b0, 1'b0, 1'b0);
    chk(32'h80000000, 32'h80000000, 32'h80000000, 1'b0, 1'b0, 1'b0);
    chk(32'h00000000, 32'h80000000, 32'h00000000, 1'b0, 1'b0, 1'b0);
    chk(32'h00000000, 32'h3F800000, 32'h3F800000, 1'b0, 1'b0, 1'b0);
    chk(32'h80000000, 32'hC0000000, 32'hC0000000, 1'b0, 1'b0, 1'b0);
    chk(32'h3FC00000, 32'hBFC00000, 32'h00000000, 1'b0, 1'b0, 1'b0);

    // group B  subnormals (eff_e = max(E,1); promotion; the normalizer stop)
    chk(32'h00000001, 32'h3F800000, 32'h3F800000, 1'b0, 1'b0, 1'b1);
    chk(32'h00000001, 32'h00000001, 32'h00000002, 1'b0, 1'b0, 1'b0);
    chk(32'h00800000, 32'h80000001, 32'h007FFFFF, 1'b0, 1'b0, 1'b0);
    chk(32'h007FFFFF, 32'h00000001, 32'h00800000, 1'b0, 1'b0, 1'b0);
    chk(32'h00000001, 32'h80000002, 32'h80000001, 1'b0, 1'b0, 1'b0);
    chk(32'h00400000, 32'h00800000, 32'h00C00000, 1'b0, 1'b0, 1'b0);

    // group D  infinities (NaN beats infinity; inf absorbs)
    chk(32'h7F800000, 32'h7F800000, 32'h7F800000, 1'b0, 1'b0, 1'b0);
    chk(32'hFF800000, 32'hC0000000, 32'hFF800000, 1'b0, 1'b0, 1'b0);
    chk(32'h7F800000, 32'h00000000, 32'h7F800000, 1'b0, 1'b0, 1'b0);
    chk(32'h7F800000, 32'h7F7FFFFF, 32'h7F800000, 1'b0, 1'b0, 1'b0);

    // group E  the sticky region (d saturates; sticky must still be computed)
    chk(32'h4B800000, 32'h33800000, 32'h4B800000, 1'b0, 1'b0, 1'b1);
    chk(32'h4B800000, 32'hB3800000, 32'h4B800000, 1'b0, 1'b0, 1'b1);
    chk(32'h3F800000, 32'h33800001, 32'h3F800001, 1'b0, 1'b0, 1'b1);
    // the saturation boundary at RESULT level, not just via the bin: a
    // clamp one short (25) parks the small operand's leading bit in R
    // instead of sticky, and this subtract comes out one ulp low
    chk(32'h4B000000, 32'hBDFFFFFF, 32'h4B000000, 1'b0, 1'b0, 1'b1);

    // group F  cancellation (exact zero; LZC at full range)
    chk(32'h3F800000, 32'hBF800000, 32'h00000000, 1'b0, 1'b0, 1'b0);
    chk(32'h40000001, 32'hC0000000, 32'h34800000, 1'b0, 1'b0, 1'b0);
    chk(32'h3F800000, 32'hBF7FFFFF, 32'h33800000, 1'b0, 1'b0, 1'b0);

    // group G  rounding (both tie directions; the rounding-carry renormalize)
    chk(32'h4B800000, 32'h3F800000, 32'h4B800000, 1'b0, 1'b0, 1'b1);
    chk(32'h4B800001, 32'h3F800000, 32'h4B800002, 1'b0, 1'b0, 1'b1);
    chk(32'h4B7FFFFF, 32'h3F800000, 32'h4B800000, 1'b0, 1'b0, 1'b0);
    chk(32'h3FFFFFFF, 32'h33800000, 32'h40000000, 1'b0, 1'b0, 1'b1);
    chk(32'h3FFFFFFF, 32'h3FC00000, 32'h40600000, 1'b0, 1'b0, 1'b1);
    chk(32'h3F800001, 32'h33800000, 32'h3F800002, 1'b0, 1'b0, 1'b1);
    // added by the mutation campaign: a mutant that dropped old R from the
    // right-1 sticky fold survived every directed vector above and died only
    // under random stimulus -- this pair is the directed kill that closed
    // the gap (d = 2 puts a live bit in R; the add carries; the fold's
    // sticky is the only witness that the result is past the tie)
    chk(32'h3FFFFFFF, 32'h3E800009, 32'h40100001, 1'b0, 1'b0, 1'b1);

    // group H  overflow, both paths, and the near miss
    chk(32'h7F7FFFFF, 32'h7F7FFFFF, 32'h7F800000, 1'b0, 1'b1, 1'b1);
    chk(32'h7F7FFFFF, 32'h73000000, 32'h7F800000, 1'b0, 1'b1, 1'b1);
    chk(32'h7F7FFFFF, 32'h72FFFFFF, 32'h7F7FFFFF, 1'b0, 1'b0, 1'b1);
    chk(32'hFF7FFFFF, 32'hFF7FFFFF, 32'hFF800000, 1'b0, 1'b1, 1'b1);

    // group I  the shifter (right-1 / none / left-N)
    chk(32'h3F800000, 32'h3F800000, 32'h40000000, 1'b0, 1'b0, 1'b0);
    chk(32'h3F800000, 32'h3E800000, 32'h3FA00000, 1'b0, 1'b0, 1'b0);

    // group X  the counterexample pairs of the shortcut section
    chk(32'h3F800000, 32'hBE800003, 32'h3F3FFFFE, 1'b0, 1'b0, 1'b1);
    chk(32'h3F800000, 32'hBE800001, 32'h3F400000, 1'b0, 1'b0, 1'b1);
    chk(32'h3F800001, 32'h33040000, 32'h3F800001, 1'b0, 1'b0, 1'b1);
    chk(32'h3F800001, 32'hB3800001, 32'h3F800000, 1'b0, 1'b0, 1'b1);
    chk(32'h40000000, 32'hB3800001, 32'h3FFFFFFF, 1'b0, 1'b0, 1'b1);

    // group C  NaN (class + quiet bit + payload; never the sign)
    chk_nan(32'h7FC00055, 32'h3F800000, 1'b0, 23'h400055);
    chk_nan(32'h7FA00000, 32'h3F800000, 1'b1, 23'h600000);
    chk_nan(32'hFFC00001, 32'h7F800000, 1'b0, 23'h400001);
    chk_nan(32'h7F800001, 32'h00000000, 1'b1, 23'h400001);
    chk_nan(32'h7F800000, 32'hFF800000, 1'b1, 23'h400000);

    if (checks !== 92) begin
      $display("FAIL tb_corners_split: %0d checks ran, expected 92", checks);
      $fatal(1, "check count");
    end

    // the coverage gate: the rare paths MUST have executed
    $display("bins: right1=%0d left>=2=%0d round_renorm=%0d sticky_sat=%0d",
             bin_right1, bin_left2, bin_renorm, bin_stickysat);
    $display("      tie_up=%0d tie_down=%0d subnormal_res=%0d overflow_res=%0d",
             bin_tie_up, bin_tie_dn, bin_subres, bin_ovfres);
    if (bin_right1 == 0 || bin_left2 == 0 || bin_renorm == 0 ||
        bin_stickysat == 0 || bin_tie_up == 0 || bin_tie_dn == 0 ||
        bin_subres == 0 || bin_ovfres == 0) begin
      $display("FAIL tb_corners_split: a required coverage bin is empty");
      $fatal(1, "coverage");
    end

    if (errors !== 0)
      $fatal(1, "FAIL tb_corners_split: %0d error(s)", errors);
    $display("PASS tb_corners_split (46 pairs x both orders, 8/8 coverage bins hit)");
    $finish;
  end

endmodule

`default_nettype wire
