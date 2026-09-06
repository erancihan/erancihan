`timescale 1ns/1ps
`default_nettype none

// Exhaustive over every representable shift amount, for mantissas chosen to
// exercise the guard/round/sticky split: zero, a single high bit, all-ones, a
// single low bit, an exact tie, a tie plus a round bit, a tie plus a sticky
// bit, and a value below the tie.
//
// Two instantiations at different parameter pairs (W=24/SHW=5 and W=32/SHW=6),
// because a module that is only ever built at one W is a module whose
// parameterisation is untested.
//
// The reference is computed by index arithmetic — "which mantissa bit lands in
// this position" — rather than by shifting, so it is an independent model and
// not a second copy of the module under test.
module tb_align_sticky;

  localparam W1 = 24, SHW1 = 5;    // the chapter's defaults
  localparam W2 = 32, SHW2 = 6;    // a padded significand

  reg  [W1-1:0]   mant1;
  reg  [SHW1-1:0] shamt1;
  wire [W1-1:0]   aligned1;
  wire            guard1, round1, sticky1;

  reg  [W2-1:0]   mant2;
  reg  [SHW2-1:0] shamt2;
  wire [W2-1:0]   aligned2;
  wire            guard2, round2, sticky2;

  integer errors = 0;
  integer s, t;

  reg [W1-1:0] vec1 [0:7];
  reg [W2-1:0] vec2 [0:3];

  reg [31:0] want_aligned;
  reg        want_guard, want_round, want_sticky;

  align_sticky #(.W(W1), .SHW(SHW1)) dut1
    (.mant(mant1), .shamt(shamt1), .aligned(aligned1),
     .guard(guard1), .round(round1), .sticky(sticky1));

  align_sticky #(.W(W2), .SHW(SHW2)) dut2
    (.mant(mant2), .shamt(shamt2), .aligned(aligned2),
     .guard(guard2), .round(round2), .sticky(sticky2));

  // ---- independent reference model -------------------------------------
  // `m' is the mantissa zero-extended to 32 bits, `sh' the shift amount and
  // `w' the mantissa width. Saturation at w+2 needs no special case here:
  // beyond it every formula below has already reached its final value.

  function [31:0] ref_aligned;
    input [31:0] m; input integer sh; input integer w;
    integer j;
    begin
      ref_aligned = 32'd0;
      for (j = 0; j < w; j = j + 1)
        if (j + sh < w) ref_aligned[j] = m[j + sh];
    end
  endfunction

  function ref_guard;                       // the first bit shifted out
    input [31:0] m; input integer sh; input integer w;
    begin
      ref_guard = (sh >= 1 && sh <= w) ? m[sh-1] : 1'b0;
    end
  endfunction

  function ref_round;                       // the second bit shifted out
    input [31:0] m; input integer sh; input integer w;
    begin
      ref_round = (sh >= 2 && sh <= w + 1) ? m[sh-2] : 1'b0;
    end
  endfunction

  function ref_sticky;                      // OR of everything BELOW round
    input [31:0] m; input integer sh; input integer w;
    integer j, hi;
    begin
      ref_sticky = 1'b0;
      hi = sh - 3;
      if (hi > w - 1) hi = w - 1;
      for (j = 0; j <= hi; j = j + 1)
        ref_sticky = ref_sticky | m[j];
    end
  endfunction

  task check1;
    begin
      want_aligned = ref_aligned({8'd0, mant1}, s, W1);
      want_guard   = ref_guard  ({8'd0, mant1}, s, W1);
      want_round   = ref_round  ({8'd0, mant1}, s, W1);
      want_sticky  = ref_sticky ({8'd0, mant1}, s, W1);
      if (aligned1 !== want_aligned[W1-1:0] || guard1 !== want_guard
       || round1   !== want_round           || sticky1 !== want_sticky) begin
        errors = errors + 1;
        $display("FAIL W=%0d mant=%h shamt=%0d : got aligned=%h g=%b r=%b s=%b, want aligned=%h g=%b r=%b s=%b",
                 W1, mant1, s, aligned1, guard1, round1, sticky1,
                 want_aligned[W1-1:0], want_guard, want_round, want_sticky);
      end
    end
  endtask

  task check2;
    begin
      want_aligned = ref_aligned(mant2, s, W2);
      want_guard   = ref_guard  (mant2, s, W2);
      want_round   = ref_round  (mant2, s, W2);
      want_sticky  = ref_sticky (mant2, s, W2);
      if (aligned2 !== want_aligned || guard2 !== want_guard
       || round2   !== want_round   || sticky2 !== want_sticky) begin
        errors = errors + 1;
        $display("FAIL W=%0d mant=%h shamt=%0d : got aligned=%h g=%b r=%b s=%b, want aligned=%h g=%b r=%b s=%b",
                 W2, mant2, s, aligned2, guard2, round2, sticky2,
                 want_aligned, want_guard, want_round, want_sticky);
      end
    end
  endtask

  task show1;                               // one printed row for the chapter
    input [W1-1:0]  m;
    input integer   sh;
    input [48*8:1]  note;
    begin
      mant1 = m; shamt1 = sh[SHW1-1:0]; #1;
      $display("  mant=%h >> %0d -> aligned=%h g=%b r=%b s=%b   %0s",
               mant1, sh, aligned1, guard1, round1, sticky1, note);
    end
  endtask

  initial begin
    vec1[0] = 24'h000000;
    vec1[1] = 24'h800000;
    vec1[2] = 24'hFFFFFF;
    vec1[3] = 24'h000001;
    vec1[4] = 24'h000010;   // exact tie at shamt=5
    vec1[5] = 24'h000018;   // tie + round bit
    vec1[6] = 24'h000011;   // tie + sticky bit
    vec1[7] = 24'h00000F;   // below the tie

    vec2[0] = 32'h00000000;
    vec2[1] = 32'hFFFFFFFF;
    vec2[2] = 32'h000000FF;
    vec2[3] = 32'hA5A5A5A5;

    for (t = 0; t < 8; t = t + 1)
      for (s = 0; s < (1 << SHW1); s = s + 1) begin
        mant1 = vec1[t]; shamt1 = s[SHW1-1:0]; #1; check1;
      end

    for (t = 0; t < 4; t = t + 1)
      for (s = 0; s < (1 << SHW2); s = s + 1) begin
        mant2 = vec2[t]; shamt2 = s[SHW2-1:0]; #1; check2;
      end

    // Printed cases for the chapter text. The first shows that a shift of zero
    // discards nothing. The next four all produce aligned=000000 and all four
    // lost at least one 1 -- a single combined flag would report exactly the
    // same thing for every one of them -- yet they demand three different
    // rounding decisions, and only separate g/r/s can tell them apart.
    $display("-- alignment right-shift: guard, round and sticky kept separate");
    show1(24'h000010, 0, "n=0: nothing shifted out");
    show1(24'h000010, 5, "exact tie     -> break on the LSB of aligned");
    show1(24'h000018, 5, "above the tie -> round up");
    show1(24'h000011, 5, "above the tie -> round up");
    show1(24'h00000F, 5, "below the tie -> round down");

    mant2 = 32'h000000FF; shamt2 = 6'd8; s = 8; #1; check2;
    $display("-- the second parameter pair, W=32 SHW=6");
    $display("  mant=%h >> %0d -> aligned=%h g=%b r=%b s=%b",
             mant2, shamt2, aligned2, guard2, round2, sticky2);

    if (errors == 0)
      $display("PASS tb_align_sticky (8 mantissas x 32 shifts at W=24, 4 x 64 at W=32)");
    else
      $fatal(1, "FAIL tb_align_sticky: %0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
