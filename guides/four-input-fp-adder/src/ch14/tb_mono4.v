`timescale 1ns/1ps
`default_nettype none

// Chapter 14: is the guide's four-input adder MONOTONIC?
//
// Fasi, Higham, Mikaitis & Pranesh (MIMS EPrint 2020.10) measured that an
// NVIDIA V100 tensor core's five-term accumulator "behave[s]
// non-monotonically" because it does not normalize partial sums; Mikaitis
// (arXiv:2304.01407) generalizes the effect to n >= 4. Chapter 12's
// fp32_add4 is n = 4 and every intermediate IS a normalized, correctly
// rounded binary32 value, so the property SHOULD hold. Chapter 14's
// research pass flagged that as an inference, not a measurement. This
// testbench measures it.
//
// DUT is chapter 10's combinational tree, which chapter 12's tb_add4_stream
// proves bit-identical to the shipped pipelined fp32_add4; the monotonicity
// result transfers along that equivalence, not by assumption.
//
// The property, stated precisely. For non-NaN operands and a non-NaN
// result, replacing any one addend x_i by the next binary32 value strictly
// above it must not decrease the result in the real-number ordering. NaN is
// unordered, so a NaN base is skipped -- but a base that is NOT NaN and a
// bumped result that IS is recorded separately (n_nanborn) and is NOT
// counted as a violation: it is the intermediate-overflow discontinuity
// chapter 12's S3 documents, and directed vector D2 pins one.
//
// Ordering uses the standard sign-magnitude-to-unsigned key
//   key(w) = w[31] ? ~w : (w | 32'h8000_0000)
// after canonicalizing -0 to +0, so that -0 and +0 compare EQUAL. The key
// function is itself checked against a pinned twelve-entry ladder before
// any DUT vector runs (task keyladder): a checker whose comparator is wrong
// certifies anything.
//
// Shipped default is NT=2500 trials per regime (10,000 trials, up to 40,000
// ordered comparisons). The chapter's headline run is the same binary at
// -DNT=25000.
`ifndef NT
`define NT 2500
`endif
module tb_mono4;

  reg  [31:0] a, b, c, d;
  wire [31:0] res;
  wire        inv, ovf, inx;

  fp32_add4_tree dut (.a(a), .b(b), .c(c), .d(d), .result(res),
                      .invalid(inv), .overflow(ovf), .inexact(inx));

  // ---- helpers -----------------------------------------------------------

  function isnan(input [31:0] w);
    isnan = (w[30:23] == 8'hFF) && (w[22:0] != 23'd0);
  endfunction

  function isposinf(input [31:0] w);
    isposinf = (w == 32'h7F80_0000);
  endfunction

  // next binary32 value strictly above w (finite or -inf input).
  // -0 -> smallest positive subnormal; negatives walk toward zero;
  // non-negatives walk up, with maxnormal + 1 ulp landing on +inf.
  function [31:0] nextup(input [31:0] w);
    begin
      if (w == 32'h8000_0000)      nextup = 32'h0000_0001;
      else if (w[31])              nextup = w - 32'd1;
      else                         nextup = w + 32'd1;
    end
  endfunction

  // total order on non-NaN binary32, with -0 == +0
  function [31:0] ordkey(input [31:0] w);
    reg [31:0] v;
    begin
      v = (w == 32'h8000_0000) ? 32'h0000_0000 : w;
      ordkey = v[31] ? ~v : (v | 32'h8000_0000);
    end
  endfunction

  // ---- counters ----------------------------------------------------------

  integer errors;
  integer n_cmp;        // ordered comparisons actually made
  integer n_viol;       // key(bumped) < key(base): the failure this hunts
  integer n_nanborn;    // non-NaN base, NaN after a one-ulp increase
  integer n_nanbase;    // trials skipped: base result already NaN
  integer n_nobump;     // positions skipped: operand is +inf or NaN
  integer n_strict;     // comparisons where the result strictly increased
  integer n_equal;      // comparisons where the result did not move
  integer n_directed;   // directed vectors executed
  integer ladder_done;

  integer regime, trial, pos, seed;
  reg [7:0] e0;
  reg [31:0] base, bumped, save;
  reg first;

  // ---- the checker's own checker ----------------------------------------
  // Twelve pinned values in strictly increasing real-number order, except
  // the -0/+0 pair which must compare EQUAL. If ordkey disagrees with this
  // ladder the bench fails before it touches the DUT.
  task keyladder;
    reg [31:0] lad [0:11];
    integer k;
    begin
      lad[0]  = 32'hFF80_0000;  // -inf
      lad[1]  = 32'hFF7F_FFFF;  // -maxnormal
      lad[2]  = 32'hBF80_0000;  // -1.0
      lad[3]  = 32'h8080_0000;  // -minnormal
      lad[4]  = 32'h8000_0001;  // -minsubnormal
      lad[5]  = 32'h8000_0000;  // -0
      lad[6]  = 32'h0000_0000;  // +0
      lad[7]  = 32'h0000_0001;  // +minsubnormal
      lad[8]  = 32'h0080_0000;  // +minnormal
      lad[9]  = 32'h3F80_0000;  // +1.0
      lad[10] = 32'h7F7F_FFFF;  // +maxnormal
      lad[11] = 32'h7F80_0000;  // +inf
      for (k = 0; k < 11; k = k + 1) begin
        if (k == 5) begin
          if (ordkey(lad[5]) !== ordkey(lad[6])) begin
            errors = errors + 1;
            $display("FAIL tb_mono4 keyladder: -0 and +0 do not compare equal");
          end
        end else if (!(ordkey(lad[k]) < ordkey(lad[k+1]))) begin
          errors = errors + 1;
          $display("FAIL tb_mono4 keyladder: %h !< %h", lad[k], lad[k+1]);
        end
      end
      // and nextup must move UP the ladder wherever it is defined
      if (!(ordkey(nextup(32'h8000_0000)) > ordkey(32'h8000_0000))) begin
        errors = errors + 1;
        $display("FAIL tb_mono4 keyladder: nextup(-0) did not increase");
      end
      if (nextup(32'h7F7F_FFFF) !== 32'h7F80_0000) begin
        errors = errors + 1;
        $display("FAIL tb_mono4 keyladder: nextup(maxnormal) is not +inf");
      end
      if (nextup(32'hFF80_0000) !== 32'hFF7F_FFFF) begin
        errors = errors + 1;
        $display("FAIL tb_mono4 keyladder: nextup(-inf) is not -maxnormal");
      end
      ladder_done = 1;
    end
  endtask

  // ---- evaluate the DUT once --------------------------------------------
  task eval(output [31:0] r);
    begin
      #1;
      if (^res === 1'bx) begin
        errors = errors + 1;
        $display("FAIL tb_mono4: X in result a=%h b=%h c=%h d=%h", a, b, c, d);
      end
      r = res;
    end
  endtask

  // ---- one trial: base, then one-ulp bump on each of the four ports ------
  task bump_all;
    begin
      eval(base);
      if (isnan(base)) begin
        n_nanbase = n_nanbase + 1;
      end else begin
        for (pos = 0; pos < 4; pos = pos + 1) begin
          save = (pos == 0) ? a : (pos == 1) ? b : (pos == 2) ? c : d;
          if (isnan(save) || isposinf(save)) begin
            n_nobump = n_nobump + 1;
          end else begin
            case (pos)
              0: a = nextup(save);
              1: b = nextup(save);
              2: c = nextup(save);
              default: d = nextup(save);
            endcase
            eval(bumped);
            if (isnan(bumped)) begin
              n_nanborn = n_nanborn + 1;
            end else begin
              n_cmp = n_cmp + 1;
              if (ordkey(bumped) < ordkey(base)) begin
                n_viol = n_viol + 1;
                errors = errors + 1;
                $display("FAIL tb_mono4 non-monotonic: port %0d a=%h b=%h c=%h d=%h base=%h bumped=%h",
                         pos, a, b, c, d, base, bumped);
              end else if (ordkey(bumped) > ordkey(base)) n_strict = n_strict + 1;
              else                                        n_equal  = n_equal + 1;
            end
            case (pos)                       // restore
              0: a = save;
              1: b = save;
              2: c = save;
              default: d = save;
            endcase
          end
        end
      end
    end
  endtask

  // ---- directed vectors --------------------------------------------------
  // Each pins BOTH results by exact bits, so it fails on any drift, not
  // only on an order inversion.
  task directed(input [31:0] va, vb, vc, vd,
                input integer port,
                input [31:0] exp_base, exp_bumped,
                input [8*24:1] name);
    begin
      a = va; b = vb; c = vc; d = vd;
      eval(base);
      case (port)
        0: a = nextup(va);
        1: b = nextup(vb);
        2: c = nextup(vc);
        default: d = nextup(vd);
      endcase
      eval(bumped);
      n_directed = n_directed + 1;
      if (base !== exp_base || bumped !== exp_bumped) begin
        errors = errors + 1;
        $display("FAIL tb_mono4 directed %0s: base=%h (exp %h) bumped=%h (exp %h)",
                 name, base, exp_base, bumped, exp_bumped);
      end
    end
  endtask

  // ---- stimulus ----------------------------------------------------------

  function [31:0] mknorm(input [7:0] e);
    mknorm = ($urandom & 32'h8000_0000) | ({24'd0, e} << 23) | ($urandom & 32'h007F_FFFF);
  endfunction

  // NaN-free special table: NaN operands make the property undefined, but
  // infinities and signed zeros must be in the stream -- they are where the
  // discontinuities live.
  function [31:0] special(input [31:0] r);
    case (r % 12)
      0:  special = 32'h0000_0000;  1:  special = 32'h8000_0000;
      2:  special = 32'h7F80_0000;  3:  special = 32'hFF80_0000;
      4:  special = 32'h7F7F_FFFF;  5:  special = 32'hFF7F_FFFF;
      6:  special = 32'h0000_0001;  7:  special = 32'h8000_0001;
      8:  special = 32'h007F_FFFF;  9:  special = 32'h0080_0000;
      10: special = 32'h3F80_0000;  default: special = 32'hBF80_0000;
    endcase
  endfunction

  function [31:0] gen(input integer rg, input [7:0] eb);
    begin
      case (rg)
        0: gen = mknorm(8'd1 + ($urandom % 254));
        1: gen = mknorm((eb - 8'd10) + ($urandom % 21));
        2: gen = mknorm((eb - 8'd2) + ($urandom % 5));
        default:
          if (($urandom % 3) == 0) gen = special($urandom);
          else                     gen = mknorm(8'd1 + ($urandom % 254));
      endcase
    end
  endfunction

  initial begin
    errors = 0; n_cmp = 0; n_viol = 0; n_nanborn = 0; n_nanbase = 0;
    n_nobump = 0; n_strict = 0; n_equal = 0; n_directed = 0; ladder_done = 0;

    keyladder;

    // D1 -- Fasi et al.'s counterexample shape, at n = 4.
    // (1 - 2^-24) + 2^-24 + 2^-24 + 2^-24 = 1 + 2^-23; raising the first
    // addend to exactly 1 gives 1 + 2^-23 again (the level-1 tie rounds to
    // even). The five-term unit they measured DECREASED here.
    directed(32'h3F7F_FFFF, 32'h3380_0000, 32'h3380_0000, 32'h3380_0000,
             0, 32'h3F80_0001, 32'h3F80_0001, "D1 fasi-shape");

    // D2 -- the discontinuity that IS real: c+d overflows to -inf, a+b is
    // finite, so the result is -inf; one ulp on a overflows a+b to +inf and
    // the sum becomes NaN. Not an order violation -- NaN is unordered --
    // but it is the S3 intermediate-overflow pathology, pinned.
    directed(32'h7F7F_FFFF, 32'h0000_0000, 32'hFF7F_FFFF, 32'hFF7F_FFFF,
             0, 32'hFF80_0000, 32'h7FC0_0000, "D2 nan-born");

    // D3 -- a rounding boundary crossed by one ulp of an addend:
    // 2^24 + 1.0 ties to even and stays 2^24; 2^24 + nextup(1.0) rounds up.
    directed(32'h4B80_0000, 32'h3F80_0000, 32'h0000_0000, 32'h0000_0000,
             1, 32'h4B80_0000, 32'h4B80_0001, "D3 tie-then-up");

    // D4 -- both level-1 sums are zeros of opposite sign; one ulp on d
    // turns the -0 into the smallest subnormal.
    directed(32'h3F80_0000, 32'hBF80_0000, 32'h8000_0000, 32'h8000_0000,
             3, 32'h0000_0000, 32'h0000_0001, "D4 zero-pair");

    // D5 -- all four -0: result -0, and one ulp on a lifts it off zero.
    directed(32'h8000_0000, 32'h8000_0000, 32'h8000_0000, 32'h8000_0000,
             0, 32'h8000_0000, 32'h0000_0001, "D5 all-minus-zero");

    // D6 -- massive cancellation: the level-2 add is exact by Sterbenz and
    // one ulp on b must move the sum by exactly one ulp of the result.
    directed(32'h3F80_0000, 32'hBF7F_FFFF, 32'h0000_0000, 32'h0000_0000,
             1, 32'h3380_0000, 32'h3400_0000, "D6 cancellation");

    // ---- random regimes --------------------------------------------------
    seed = 32'd20260821;
    first = $urandom(seed);              // seed once; discard the first draw
    for (regime = 0; regime < 4; regime = regime + 1) begin
      for (trial = 0; trial < `NT; trial = trial + 1) begin
        case (regime)
          1: e0 = 8'd11 + ($urandom % 234);
          2: e0 = 8'd3 + ($urandom % 250);
          default: e0 = 8'd0;
        endcase
        a = gen(regime, e0); b = gen(regime, e0);
        c = gen(regime, e0); d = gen(regime, e0);
        bump_all;
      end
    end

    $display("tb_mono4 census: %0d ordered comparisons (%0d strictly up, %0d unchanged), %0d NaN-born, %0d NaN-base trials skipped, %0d ports unbumpable, %0d directed",
             n_cmp, n_strict, n_equal, n_nanborn, n_nanbase, n_nobump, n_directed);

    // Arming guards: a bench that compared nothing must FAIL, not pass.
    if (ladder_done !== 1) begin
      errors = errors + 1;
      $display("FAIL tb_mono4: key ladder never ran");
    end
    if (n_directed !== 6) begin
      errors = errors + 1;
      $display("FAIL tb_mono4: %0d directed vectors ran, expected 6", n_directed);
    end
    // Precondition FIRST: `NT*4 is satisfied by NT=0, so an absolute floor
    // has to come before the relative one (chapter 12's targets.txt records
    // the same trap for tb_equiv4's `NQ).
    if (`NT < 100) begin
      errors = errors + 1;
      $display("FAIL tb_mono4: NT=%0d is too small to certify anything", `NT);
    end
    if (n_cmp < (`NT * 4)) begin
      errors = errors + 1;
      $display("FAIL tb_mono4: only %0d ordered comparisons (expected at least %0d)",
               n_cmp, `NT * 4);
    end
    // The NaN-born path and the strict-increase path must BOTH have fired,
    // or the census is reporting a stimulus hole as a clean result.
    if (n_nanborn == 0) begin
      errors = errors + 1;
      $display("FAIL tb_mono4: the NaN-born path never fired");
    end
    if (n_strict == 0) begin
      errors = errors + 1;
      $display("FAIL tb_mono4: no comparison ever increased -- stimulus is inert");
    end

    if (errors == 0)
      $display("PASS tb_mono4 (%0d one-ulp increases, %0d non-monotonic)", n_cmp, n_viol);
    else
      $display("tb_mono4: %0d errors", errors);
    $finish;
  end

  initial begin #600_000_000; $display("FAIL tb_mono4: watchdog"); $fatal(1); end

endmodule

`default_nettype wire
