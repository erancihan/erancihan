`timescale 1ns/1ps
`default_nettype none

// Why a careful hand-written carry test misses cout = a[7] | b[7].
//
// Phase 1 applies fourteen vectors of the kind a human writes when asked to
// test carry propagation: "no carry" with small operands, "carry" with big
// ones. The real adder passes. So does the mutant - all fourteen.
// Phase 2 applies one more vector, aa + 55, and the mutant dies immediately.
//
// The testbench asserts both facts, so it fails if either stops being true.
module tb_directed;

  localparam N1 = 14;                       // the plausible carry-focused set
  localparam N2 = 1;                        // the one vector nobody writes

  reg  [7:0] a, b;
  wire [7:0] sum,  sum_m;
  wire       cout, cout_m;

  reg  [7:0] va [0:N1+N2-1];
  reg  [7:0] vb [0:N1+N2-1];

  integer i;
  integer errors     = 0;                   // real adder wrong: always a bug
  integer applied    = 0;                   // guard against a loop that no-ops
  integer agree1     = 0;                   // mutant agreements in phase 1
  integer ncarry     = 0;                   // phase-1 vectors that really carry
  integer kills2     = 0;                   // mutant disagreements in phase 2

  adder8     dut (.a(a), .b(b), .sum(sum),   .cout(cout));
  adder8_mut mut (.a(a), .b(b), .sum(sum_m), .cout(cout_m));

  // Reference model. Deliberately not "a + b": a ripple of full adders written
  // from the definition of binary addition, so a typo in the DUT's expression
  // cannot also be a typo here.
  function [8:0] ref_add;
    input [7:0] x;
    input [7:0] y;
    integer k;
    reg     c;
    reg [7:0] s;
    begin
      c = 1'b0;
      for (k = 0; k < 8; k = k + 1) begin
        s[k] = x[k] ^ y[k] ^ c;
        c    = (x[k] & y[k]) | (x[k] & c) | (y[k] & c);
      end
      ref_add = {c, s};
    end
  endfunction

  task apply;
    input [7:0] x;
    input [7:0] y;
    reg [8:0] want;
    begin
      a = x; b = y;
      #1;
      applied = applied + 1;
      want    = ref_add(x, y);
      if ({cout, sum} !== want) begin
        errors = errors + 1;
        $display("FAIL tb_directed: a=%02h b=%02h exp=%b_%02h got=%b_%02h",
                 x, y, want[8], want[7:0], cout, sum);
      end
      #1;
    end
  endtask

  initial begin : watchdog
    #100000;
    $display("FAIL tb_directed: timeout at %0t", $time);
    $fatal(1, "timeout");
  end

  initial begin
    // Seven "no carry" vectors, all with small operands...
    va[0]  = 8'd0;   vb[0]  = 8'd0;
    va[1]  = 8'd2;   vb[1]  = 8'd3;
    va[2]  = 8'd15;  vb[2]  = 8'd1;
    va[3]  = 8'd63;  vb[3]  = 8'd1;
    va[4]  = 8'd100; vb[4]  = 8'd27;
    va[5]  = 8'd127; vb[5]  = 8'd1;
    va[6]  = 8'd127; vb[6]  = 8'd127;
    // ...and seven "carry" vectors, all with big ones.
    va[7]  = 8'd255; vb[7]  = 8'd1;
    va[8]  = 8'd255; vb[8]  = 8'd255;
    va[9]  = 8'd128; vb[9]  = 8'd128;
    va[10] = 8'd240; vb[10] = 8'd32;
    va[11] = 8'd192; vb[11] = 8'd128;
    va[12] = 8'd129; vb[12] = 8'd127;
    va[13] = 8'd255; vb[13] = 8'd128;
    // The vector the symmetry hides: a big operand that does NOT carry.
    va[14] = 8'haa;  vb[14] = 8'h55;

    for (i = 0; i < N1; i = i + 1) begin
      apply(va[i], vb[i]);
      if (cout_m === cout) agree1 = agree1 + 1;
      if (cout === 1'b1)   ncarry = ncarry + 1;
    end

    for (i = N1; i < N1 + N2; i = i + 1) begin
      apply(va[i], vb[i]);
      if (cout_m !== cout) begin
        kills2 = kills2 + 1;
        $display("  killed by a=%02h b=%02h (sum=%0d): true cout=%b, mutant cout=%b",
                 va[i], vb[i], va[i] + vb[i], cout, cout_m);
      end
    end

    // A check that never ran is not a check. Pin the counts first.
    if (applied !== N1 + N2) begin
      $display("FAIL tb_directed: applied %0d vectors, expected %0d",
               applied, N1 + N2);
      errors = errors + 1;
    end
    // ...and pin the shape of the set, or the demonstration is empty: a set
    // that is not really half carrying and half not is not the set a human
    // writes, and its failure to kill the mutant would prove nothing.
    if (ncarry < 5 || (N1 - ncarry) < 5) begin
      $display("FAIL tb_directed: %0d of %0d vectors carry - this is supposed to be a balanced carry test",
               ncarry, N1);
      errors = errors + 1;
    end
    if (agree1 !== N1) begin
      $display("FAIL tb_directed: the carry-focused set killed the mutant on %0d of %0d vectors - the point of this file is that it kills none",
               N1 - agree1, N1);
      errors = errors + 1;
    end
    if (kills2 !== N2) begin
      $display("FAIL tb_directed: aa+55 failed to kill the mutant");
      errors = errors + 1;
    end

    if (errors == 0)
      $display("PASS tb_directed (%0d carry-focused vectors, %0d of them carrying, mutant survives all %0d; 1 more kills it)",
               N1, ncarry, agree1);
    else
      $fatal(1, "%0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
