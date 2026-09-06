`timescale 1ns/1ps
`default_nettype none

// Chapter 8: the reference-model verdict for chapter 9, pinned as checks.
//
// The one-add shortreal path -- $bitstoshortreal each operand, ONE +, one
// $shortrealtobits -- is a trustworthy binary32 reference: Icarus stores
// shortreal as a double, assignment does not round (chapter 7), so the sum
// is computed once in 53-bit arithmetic and rounded once to binary32, and
// 53 >= 2*24 + 2 makes that double rounding innocuous (Figueroa). This
// testbench probes the path exactly where it is most suspect: subnormal
// results, both tie directions, both overflow paths, signed zeros, deep
// sticky, the double-rounding trap pair. Expected constants are from the
// python3 exact rational model.
//
// It then pins the three exclusions:
//   1. NaN results compare by CLASS; the sign is printed, never asserted.
//   2. An sNaN cannot be delivered through the value domain at all -- a
//      pure round-trip quiets it (host-FPU behaviour, chapter 7).
//   3. One add is licensed; a CHAIN is not. The naive double chain computes
//      a more accurate answer than a real binary32 adder chain can produce,
//      and would flag a CORRECT serial DUT as wrong. The discipline:
//      round-trip through the bits functions after every add.
module tb_refmodel;

  reg  [31:0] a, b;
  wire [31:0] r;
  wire        inv, ovf, inx;
  integer     errors, checks;
  real        ra, rb, rc, t;
  reg  [31:0] naive, disc, r1, r2, w;

  fp32_add_alg dut
    (.a(a), .b(b), .result(r), .invalid(inv), .overflow(ovf), .inexact(inx));

  initial begin : watchdog
    #1000000;
    $display("FAIL tb_refmodel: timeout at %0t", $time);
    $fatal(1, "timeout");
  end

  task one_add(input [31:0] wa, input [31:0] wb, input [31:0] expct);
    reg [31:0] refbits;
    begin
      refbits = $shortrealtobits($bitstoshortreal(wa) + $bitstoshortreal(wb));
      if (refbits !== expct) begin
        errors = errors + 1;
        $display("FAIL tb_refmodel %h+%h: shortreal ref %h, python says %h",
                 wa, wb, refbits, expct);
      end
      checks = checks + 1;
    end
  endtask

  initial begin
    errors = 0; checks = 0;

    // 1. the one-add path at its most suspect boundaries
    one_add(32'h00800000, 32'h80000001, 32'h007FFFFF);  // subnormal result
    one_add(32'h00000001, 32'h00000001, 32'h00000002);  // both subnormal
    one_add(32'h00000001, 32'h80000002, 32'h80000001);  // subnormal cancel
    one_add(32'h4B800000, 32'h3F800000, 32'h4B800000);  // tie -> even, down
    one_add(32'h4B800001, 32'h3F800000, 32'h4B800002);  // tie -> even, up
    one_add(32'h7F7FFFFF, 32'h7F7FFFFF, 32'h7F800000);  // magnitude overflow
    one_add(32'h7F7FFFFF, 32'h73000000, 32'h7F800000);  // rounding overflow
    one_add(32'h7F7FFFFF, 32'h72FFFFFF, 32'h7F7FFFFF);  // just below threshold
    one_add(32'h00000000, 32'h80000000, 32'h00000000);  // (+0)+(-0) = +0
    one_add(32'h80000000, 32'h80000000, 32'h80000000);  // (-0)+(-0) = -0
    one_add(32'h3FC00000, 32'hBFC00000, 32'h00000000);  // x+(-x) = +0
    one_add(32'h3F800000, 32'h33800001, 32'h3F800001);  // deep sticky
    one_add(32'h3F800001, 32'h33040000, 32'h3F800001);  // double-round trap

    // 2. NaN results: class only. Print the sign; never assert it -- this
    // simulator has produced BOTH signs for one expression (chapter 7).
    w = $shortrealtobits($bitstoshortreal(32'h7F800000)
                         + $bitstoshortreal(32'hFF800000));
    if (!(w[30:23] == 8'd255 && w[22:0] != 23'd0)) begin
      errors = errors + 1;
      $display("FAIL tb_refmodel: inf+(-inf) gave %h, expected a NaN", w);
    end
    $display("  inf + (-inf) via shortreal = %h (class NaN; sign not asserted)", w);
    checks = checks + 1;

    // 3. sNaN dies in transit: a pure round-trip quiets it, no arithmetic
    w = $shortrealtobits($bitstoshortreal(32'h7FA00000));
    if (w !== 32'h7FE00000) begin
      errors = errors + 1;
      $display("FAIL tb_refmodel: sNaN round-trip gave %h, expected 7fe00000", w);
    end
    $display("  sNaN 7fa00000 pure round-trip = %h (quieted, payload kept)", w);
    checks = checks + 1;

    // 4. the chain: serial DUT vs naive double chain vs the discipline
    ra = $bitstoshortreal(32'h3F800000);       // 1.0
    rb = $bitstoshortreal(32'h33000001);       // 2^-25 + 2^-48
    rc = rb;
    naive = $shortrealtobits(ra + rb + rc);    // rounds ONCE: too accurate
    t     = $bitstoshortreal($shortrealtobits(ra + rb));
    disc  = $shortrealtobits(t + rc);          // rounds after every add
    a = 32'h3F800000; b = 32'h33000001; #1; r1 = r;
    a = r1;           b = 32'h33000001; #1; r2 = r;
    $display("  serial DUT chain  = %h", r2);
    $display("  naive double chain= %h", naive);
    $display("  disciplined chain = %h", disc);
    if (r2 !== 32'h3F800000 || disc !== r2 || naive !== 32'h3F800001) begin
      errors = errors + 1;
      $display("FAIL tb_refmodel: chain discipline broken (dut %h disc %h naive %h)",
               r2, disc, naive);
    end
    checks = checks + 1;

    if (checks !== 16) begin
      $display("FAIL tb_refmodel: %0d checks ran, expected 16", checks);
      $fatal(1, "check count");
    end
    if (errors !== 0)
      $fatal(1, "FAIL tb_refmodel: %0d error(s)", errors);
    $display("PASS tb_refmodel (13 boundary one-adds, NaN class, sNaN, chain)");
    $finish;
  end

endmodule

`default_nettype wire
