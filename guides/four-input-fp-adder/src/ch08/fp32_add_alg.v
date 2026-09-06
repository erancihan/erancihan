`timescale 1ns/1ps
`default_nettype none

// Chapter 8: the complete binary32 addition algorithm as one combinational
// module -- the ten-step procedure of the chapter, executable. Chapter 9
// splits this into pipeline-ready modules; here every step is a named block
// of wires so a testbench can watch the algorithm run (tb_walk.v prints the
// intermediates by hierarchical reference).
//
// Datapath state: 24-bit significand + guard + round + carry = a 27-bit
// adder, with the 1-bit sticky flag alongside -- 28 bits, the chapter's
// width budget. Step 4 is chapter 2's align_sticky, instantiated verbatim
// at W = 24.
//
// Flags: invalid, overflow, inexact. There is deliberately NO underflow
// output: a tiny (sub-min-normal) sum of two binary32 values is always
// exact, so default underflow (tiny AND inexact) can provably never fire
// for addition -- chapter 7, "The Flags an Adder Can Actually Raise".
module fp32_add_alg
  (input  wire [31:0] a,
   input  wire [31:0] b,
   output wire [31:0] result,
   output wire        invalid,
   output wire        overflow,
   output wire        inexact);

  // ---- step 1: unpack. Chapter 7's three-line decode: the effective
  // exponent max(E,1) makes stored exponents 0 and 1 the same scale, which
  // is the entire subnormal story in this datapath.
  wire        sa = a[31],     sb = b[31];
  wire [7:0]  Ea = a[30:23],  Eb = b[30:23];
  wire [22:0] Fa = a[22:0],   Fb = b[22:0];
  wire [7:0]  ea = (Ea == 8'd0) ? 8'd1 : Ea;
  wire [7:0]  eb = (Eb == 8'd0) ? 8'd1 : Eb;
  wire [23:0] siga = {|Ea, Fa};
  wire [23:0] sigb = {|Eb, Fb};

  // ---- step 2: special-case screen -- pure control, decided before any
  // arithmetic. NaN beats infinity; inf + (-inf) is the one addition that
  // invents a NaN; unlike-signed zeros give +0 under round-to-nearest-even.
  wire a_nan  = (Ea == 8'd255) && (Fa != 23'd0);
  wire b_nan  = (Eb == 8'd255) && (Fb != 23'd0);
  wire a_snan = a_nan && !Fa[22];
  wire b_snan = b_nan && !Fb[22];
  wire a_inf  = (Ea == 8'd255) && (Fa == 23'd0);
  wire b_inf  = (Eb == 8'd255) && (Fb == 23'd0);
  wire a_zero = (Ea == 8'd0)   && (Fa == 23'd0);
  wire b_zero = (Eb == 8'd0)   && (Fb == 23'd0);

  wire        screen  = a_nan | b_nan | a_inf | b_inf | a_zero | b_zero;
  wire [31:0] nan_src = a_nan ? a : b;      // propagate a payload, quieted
  wire [31:0] screen_res =
      (a_nan | b_nan)              ? {nan_src[31], 8'd255, 1'b1, nan_src[21:0]} :
      (a_inf & b_inf & (sa ^ sb))  ? 32'h7FC00000 :
      a_inf                        ? a :
      b_inf                        ? b :
      (a_zero & b_zero)            ? ((sa == sb) ? a : 32'h00000000) :
      a_zero                       ? b : a;

  // ---- step 3: compare and swap. One unsigned compare of the magnitude
  // bits w[30:0] is valid across zero/subnormal/normal/infinity (chapter 7's
  // encoded-order property). The bigger operand leads: the alignment shift
  // is always rightward, the difference never negative, the result's sign
  // simply the bigger operand's.
  wire        swap     = (b[30:0] > a[30:0]);
  wire        sign_big = swap ? sb   : sa;
  wire [7:0]  e_big    = swap ? eb   : ea;
  wire [7:0]  e_sml    = swap ? ea   : eb;
  wire [23:0] sig_big  = swap ? sigb : siga;
  wire [23:0] sig_sml  = swap ? siga : sigb;
  wire        eff_sub  = sa ^ sb;

  // ---- step 4: alignment with G/R/S capture -- chapter 2's align_sticky
  // at W = 24, saturation at W+2 = 26 (a shift of 26 already puts the whole
  // significand below the round position). The exponent difference is 8
  // bits (0..253); the shifter count is 5 bits with an explicit clamp --
  // chapter 2's full-width-localparam lesson, applied.
  wire [7:0]  d     = e_big - e_sml;
  wire [4:0]  shamt = (d > 8'd26) ? 5'd26 : d[4:0];
  wire [23:0] aligned;
  wire        g_al, r_al, s_al;
  align_sticky #(.W(24), .SHW(5)) u_align
    (.mant(sig_sml), .shamt(shamt),
     .aligned(aligned), .guard(g_al), .round(r_al), .sticky(s_al));

  // ---- step 5: effective operation. Add the two 26-bit quantities into a
  // 27-bit sum; on an effective subtract, inject sticky as a BORROW: the
  // true small operand is (kept + f) with 0 < f < 1 in round-bit units
  // whenever sticky is set, so the true difference is one less than the
  // truncated difference -- and still inexact, so sticky stays set.
  wire [26:0] big27 = {1'b0, sig_big, 2'b00};
  wire [26:0] sml27 = {1'b0, aligned, g_al, r_al};
  wire [26:0] sum27 = eff_sub ? (big27 - sml27 - {26'd0, s_al})
                              : (big27 + sml27);

  // An effective subtract that comes out exactly zero has no sign of its
  // own: the result is +0 by rule (IEEE 754-2019 6.3), not by datapath.
  // (sum27 == 0 with sticky set cannot happen: sticky needs d >= 3, and
  // then the aligned operand is under a quarter of the big one.)
  wire exact_zero = eff_sub & (sum27 == 27'd0);

  // ---- steps 6-7: normalize. Three mutually exclusive outcomes:
  //   right-1 (add carried out): fold old R into sticky, old G becomes R,
  //     the shifted-off significand LSB becomes G, exponent + 1;
  //   none: leading 1 already at bit 23;
  //   left-N (subtract cancelled): count leading zeros, shift left by
  //     min(LZC, eff_e - 1) -- the clamp STOPS at effective exponent 1,
  //     where a still-unnormalized result is a subnormal, E field 0.
  wire        carry = sum27[26];
  wire        right1 = ~eff_sub & carry;
  wire [25:0] frame = sum27[25:0];

  function [4:0] lzc26(input [25:0] v);
    integer i;
    begin
      lzc26 = 5'd26;
      for (i = 0; i <= 25; i = i + 1)
        if (v[25 - i] == 1'b1 && lzc26 == 5'd26)
          lzc26 = i[4:0];
    end
  endfunction

  wire [4:0]  lz    = lzc26(frame);
  wire [7:0]  e_lim = e_big - 8'd1;
  wire [7:0]  shl8  = ({3'b000, lz} > e_lim) ? e_lim : {3'b000, lz};
  wire [4:0]  shl   = shl8[4:0];            // min(lz, e_big-1) <= 26: lossless
  wire [25:0] framel = frame << shl;        // zeros shift in: exact, because a
                                            // left shift of 2+ implies d <= 1,
                                            // where R and sticky are 0
  wire [23:0] nsig = right1 ? sum27[26:3]         : framel[25:2];
  wire        ng   = right1 ? sum27[2]            : framel[1];
  wire        nr   = right1 ? sum27[1]            : framel[0];
  wire        ns   = right1 ? (s_al | sum27[0])   : s_al;
  wire [8:0]  e_norm = right1 ? ({1'b0, e_big} + 9'd1)
                              : ({1'b0, e_big} - {4'b0000, shl});

  // ---- step 8: round to nearest, ties to even: chapter 7's one-gate
  // decision, G & (R | S | L). If the increment carries out of bit 23
  // (twenty-four ones round up to 2^24), renormalize a SECOND time: the
  // rounding-carry renormalize, reachable by directed vectors only.
  wire        lbit     = nsig[0];
  wire        round_up = ng & (nr | ns | lbit);
  wire [24:0] rsig     = {1'b0, nsig} + {24'd0, round_up};
  wire        round_renorm = rsig[24];
  wire [23:0] fsig     = round_renorm ? 24'h800000 : rsig[23:0];
  wire [8:0]  e_rnd    = e_norm + {8'd0, round_renorm};

  // ---- step 9: pack. Exponent past 254 is overflow: +/-infinity under
  // round-to-nearest-even. A significand with bit 23 clear can only be at
  // effective exponent 1: encode E = 0 (subnormal or zero) -- gradual
  // underflow is doing nothing at all.
  wire        ovf = (e_rnd > 9'd254);
  wire [31:0] dp_res =
      exact_zero ? 32'h00000000 :
      ovf        ? {sign_big, 8'd255, 23'd0} :
      fsig[23]   ? {sign_big, e_rnd[7:0], fsig[22:0]} :
                   {sign_big, 8'd0,       fsig[22:0]};

  // ---- step 10: flags. inexact = something nonzero below the kept bits
  // (or an overflow, whose infinity is never the exact sum). An exact
  // cancellation needs no carve-out: sum27 == 0 forces frame, G, R and
  // sticky all zero, so the OR below is already 0 there. No underflow
  // wire exists -- see the module header.
  assign result   = screen ? screen_res : dp_res;
  assign invalid  = a_snan | b_snan | (a_inf & b_inf & (sa ^ sb));
  assign overflow = ~screen & ovf;
  assign inexact  = ~screen & (ovf | ng | nr | ns);

endmodule

`default_nettype wire
