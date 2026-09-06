`timescale 1ns/1ps
`default_nettype none

// Chapter 8: the algorithm tracer. Drives directed operand pairs through
// fp32_add_alg and prints every intermediate BY HIERARCHICAL REFERENCE into
// the DUT -- the printed trace is what the wires actually carry, not a
// narration. Each final result is checked two independent ways:
//   1. against a constant verified with python3 exact rational arithmetic
//      (fractions.Fraction summed exactly, rounded once by a validated
//      round-to-nearest-even encoder), and
//   2. against the in-simulator one-add shortreal reference
//      ($bitstoshortreal each operand, one +, one $shortrealtobits), which
//      is sound for a single add because 53 >= 2*24 + 2 (Figueroa).
// Every operand pair here is finite, so path 2 is licensed on every row.
module tb_walk;

  reg  [31:0] a, b;
  wire [31:0] r;
  wire        inv, ovf, inx;
  integer     errors, checks;

  fp32_add_alg dut
    (.a(a), .b(b), .result(r), .invalid(inv), .overflow(ovf), .inexact(inx));

  initial begin : watchdog
    #1000000;
    $display("FAIL tb_walk: timeout at %0t", $time);
    $fatal(1, "timeout");
  end

  task walk(input [31:0] wa, input [31:0] wb, input [31:0] expct,
            input exp_inv, input exp_ovf, input exp_inx,
            input [8*44:1] name);
    real ra, rb;
    reg [31:0] refbits;
    begin
      a = wa; b = wb; #1;
      $display("=== %0s: %h + %h", name, wa, wb);
      $display("  A: s=%b eff_e=%0d sig=%b", dut.sa, dut.ea, dut.siga);
      $display("  B: s=%b eff_e=%0d sig=%b", dut.sb, dut.eb, dut.sigb);
      $display("  swap=%b  d=%0d (shift %0d)  effective %0s",
               dut.swap, dut.d, dut.shamt, dut.eff_sub ? "SUB" : "ADD");
      $display("  big  : %b | 0 0", dut.sig_big);
      $display("  small: %b | %b %b  s=%b",
               dut.aligned, dut.g_al, dut.r_al, dut.s_al);
      $display("  sum  : %b %b | %b %b%0s", dut.sum27[26], dut.sum27[25:2],
               dut.sum27[1], dut.sum27[0],
               dut.carry ? "   <- CARRY OUT" : "");
      if (dut.right1)
        $display("  norm : right 1, e+1");
      else if (dut.shl != 5'd0)
        $display("  norm : %0d leading zeros, limit e-1=%0d -> left %0d",
                 dut.lz, dut.e_lim, dut.shl);
      else
        $display("  norm : none");
      $display("       : %b | %b %b  s=%b  e=%0d",
               dut.nsig, dut.ng, dut.nr, dut.ns, dut.e_norm);
      $display("  round: L=%b G=%b R=%b S=%b -> round_up=%b%0s",
               dut.lbit, dut.ng, dut.nr, dut.ns, dut.round_up,
               dut.round_renorm ? "  ROUNDING CARRY: right 1, e+1" : "");
      if (dut.ovf)
        $display("  pack : e=%0d > 254: OVERFLOW -> infinity", dut.e_rnd);
      else if (!dut.fsig[23])
        $display("  pack : bit 23 clear at e=%0d -> SUBNORMAL, E field 0",
                 dut.e_rnd);
      else
        $display("  pack : E=%0d  F=%h", dut.e_rnd, dut.fsig[22:0]);
      $display("  RESULT %h  invalid=%b overflow=%b inexact=%b", r, inv, ovf, inx);
      if (r !== expct) begin
        errors = errors + 1;
        $display("FAIL tb_walk %0s: result %h, python exact model says %h",
                 name, r, expct);
      end
      if ({inv, ovf, inx} !== {exp_inv, exp_ovf, exp_inx}) begin
        errors = errors + 1;
        $display("FAIL tb_walk %0s: flags i/o/x=%b%b%b expected %b%b%b",
                 name, inv, ovf, inx, exp_inv, exp_ovf, exp_inx);
      end
      ra = $bitstoshortreal(wa);
      rb = $bitstoshortreal(wb);
      refbits = $shortrealtobits(ra + rb);
      if (refbits !== expct) begin
        errors = errors + 1;
        $display("FAIL tb_walk %0s: shortreal one-add ref %h, expected %h",
                 name, refbits, expct);
      end
      checks = checks + 1;
      $display("");
    end
  endtask

  initial begin
    errors = 0;
    checks = 0;

    //    a            b            expect       inv ovf inx
    walk(32'h3FC00000, 32'h40100000, 32'h40700000, 1'b0, 1'b0, 1'b0,
         "W1  plain add: 1.5 + 2.25");
    walk(32'h3FFFFFFF, 32'h3FC00000, 32'h40600000, 1'b0, 1'b0, 1'b1,
         "W2  carry out, right-1 renormalize");
    walk(32'h4B800000, 32'h33800000, 32'h4B800000, 1'b0, 1'b0, 1'b1,
         "W3  sticky-only alignment: 2^24 + 2^-24");
    walk(32'h40000001, 32'hC0000000, 32'h34800000, 1'b0, 1'b0, 1'b0,
         "W4  cancellation, 23-bit left shift");
    walk(32'h4B800000, 32'h3F800000, 32'h4B800000, 1'b0, 1'b0, 1'b1,
         "W5a exact tie, L even: round DOWN");
    walk(32'h4B800001, 32'h3F800000, 32'h4B800002, 1'b0, 1'b0, 1'b1,
         "W5b exact tie, L odd: round UP");
    walk(32'h00800000, 32'h80000001, 32'h007FFFFF, 1'b0, 1'b0, 1'b0,
         "W6  gradual underflow: normalizer stops");
    walk(32'h7F7FFFFF, 32'h73000000, 32'h7F800000, 1'b0, 1'b1, 1'b1,
         "W7  rounding-induced overflow");
    walk(32'h00400000, 32'h00800000, 32'h00C00000, 1'b0, 1'b0, 1'b0,
         "W8  subnormal operand: eff_e makes d=0");
    walk(32'h007FFFFF, 32'h00000001, 32'h00800000, 1'b0, 1'b0, 1'b0,
         "W8b subnormal promotes to normal, no shift");
    walk(32'h3FFFFFFF, 32'h33800000, 32'h40000000, 1'b0, 1'b0, 1'b1,
         "X1  rounding-carry renormalize, in range");
    walk(32'h3F800000, 32'hBF7FFFFF, 32'h33800000, 1'b0, 1'b0, 1'b0,
         "X2  lone G bit: left shift of 24, exact");

    if (checks !== 12) begin
      $display("FAIL tb_walk: %0d walks ran, expected 12", checks);
      $fatal(1, "walk count");
    end
    if (errors !== 0)
      $fatal(1, "FAIL tb_walk: %0d error(s)", errors);
    $display("PASS tb_walk (12 traced additions, python + shortreal agree)");
    $finish;
  end

endmodule

`default_nettype wire
