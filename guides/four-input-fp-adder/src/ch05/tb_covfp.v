`timescale 1ns/1ps
`default_nettype none

// Functional coverage for binary32 addition, written by hand because Icarus
// has no coverage instrumentation of any kind and no covergroup syntax at any
// language level. Sixty lines, three integer increments per transaction, and
// it does the part that matters: it makes you write down what "interesting"
// means before you run anything.
//
// Thirty-four bins:
//    25  the cross of operand classes, {zero, subnormal, normal, inf, NaN}^2
//     4  |exponent difference| buckets, for normal + normal only
//     5  the class of the result
//
//   vvp sim                  constrained generator + corner library: 34/34
//   vvp sim +gen=uniform     2000 uniform random 32-bit patterns:    11/34
//   vvp sim +gen=narrow      the generator with its first bug back:  33/34
//   vvp sim +seed=<n>
//
// An empty bin is a FAILURE, not a footnote: the run calls $fatal(1) and the
// regression goes red. That is more than most commercial flows do by default,
// where the coverage report is a document nobody opens.
module tb_covfp;

  localparam integer NTRANS = 2000;

  localparam integer C_ZERO = 0, C_SUB = 1, C_NORM = 2, C_INF = 3, C_NAN = 4;
  localparam integer NCLS   = 5;
  localparam integer NCROSS = NCLS * NCLS;          // 25
  localparam integer NEXPD  = 4;
  localparam integer NRES   = 5;
  localparam integer NBINS  = NCROSS + NEXPD + NRES; // 34

  integer cov [0:NBINS-1];
  integer seed;
  integer i, j, k;
  integer holes    = 0;
  integer sampled  = 0;
  integer errors   = 0;
  reg [8*8-1:0] gen;

  reg [31:0] corner [0:NCLS-1];

  initial begin : watchdog
    #10000000;
    $display("FAIL tb_covfp: timeout at %0t", $time);
    $fatal(1, "timeout");
  end

  // ------------------------------------------------------- the reference model
  function [31:0] fp_add;
    input [31:0] x;
    input [31:0] y;
    shortreal fx, fy;
    begin
      fx     = $bitstoshortreal(x);
      fy     = $bitstoshortreal(y);
      fp_add = $shortrealtobits(fx + fy);
    end
  endfunction

  // ------------------------------------------------------- the coverage model
  function integer fclass;
    input [31:0] f;
    reg [7:0]  e;
    reg [22:0] m;
    begin
      e = f[30:23];
      m = f[22:0];
      if      (e == 8'h00) fclass = (m == 0) ? C_ZERO : C_SUB;
      else if (e == 8'hff) fclass = (m == 0) ? C_INF  : C_NAN;
      else                 fclass = C_NORM;
    end
  endfunction

  function integer expdbin;
    input [31:0] x;
    input [31:0] y;
    integer d;
    begin
      // Width subtlety chapter 12 must not lose when it copies this: both
      // part-selects are UNSIGNED, and the subtraction only produces a usable
      // negative because the assignment to the 32-bit integer d widens the
      // whole expression to 32 bits BEFORE subtracting, so 64 - 80 lands in d
      // as -16. Evaluated at 8 bits - or assigned to a reg [31:0] - every
      // x_exp < y_exp pair would wrap to a huge positive and bin as ">= 25".
      d = x[30:23] - y[30:23];
      if (d < 0) d = -d;
      if      (d == 0) expdbin = 0;    // equal exponents: the cancellation region
      else if (d <= 2) expdbin = 1;    // near: a normalisation shift of 1 or 2
      else if (d < 25) expdbin = 2;    // shifted, guard and round still live
      else             expdbin = 3;    // >= 25: only the sticky bit survives
    end
  endfunction

  task cov_sample;                     // called once per transaction
    input [31:0] x;
    input [31:0] y;
    input [31:0] r;
    integer ca, cb;
    begin
      ca = fclass(x);
      cb = fclass(y);
      cov[ca*NCLS + cb] = cov[ca*NCLS + cb] + 1;
      if (ca == C_NORM && cb == C_NORM)
        cov[NCROSS + expdbin(x, y)] = cov[NCROSS + expdbin(x, y)] + 1;
      cov[NCROSS + NEXPD + fclass(r)] = cov[NCROSS + NEXPD + fclass(r)] + 1;
      sampled = sampled + 1;
    end
  endtask

  function [8*8-1:0] cname;
    input integer c;
    begin
      case (c)
        C_ZERO:  cname = "ZERO";
        C_SUB:   cname = "SUBNORM";
        C_NORM:  cname = "NORMAL";
        C_INF:   cname = "INF";
        default: cname = "NAN";
      endcase
    end
  endfunction

  // ----------------------------------------------------------- the generators
  // Do not randomise 32 bits. Randomise the FIELDS, with a weighted menu over
  // the exponent - the clustered branch is the one nobody thinks of, and the
  // full-range branch is the one this file's first version left out.
  function [31:0] gen_biased;
    input integer wide;                // 0 reproduces the original bug
    integer    pick;
    reg [7:0]  e;
    reg [22:0] m;
    reg        sg;
    begin
      pick = $urandom(seed) % 100;
      m    = $urandom(seed);
      if      (pick < 10) e = 8'h00;                          // subnormal
      else if (pick < 14) e = 8'hff;                          // NaN
      else if (pick < 20) begin e = 8'h00; m = 23'h0; end     // exact zero
      else if (pick < 24) begin e = 8'hff; m = 23'h0; end     // exact infinity
      else if (pick < 62) e = 8'h40 + ($urandom(seed) % 16);  // clustered
      else if (wide)      e = 8'h01 + ($urandom(seed) % 254); // full range
      else                e = 8'h40 + ($urandom(seed) % 16);  // the bug
`ifdef ALL_POSITIVE
      // -DALL_POSITIVE: every operand positive, so no transaction anywhere in
      // the run performs an effective subtraction - and the model still closes
      // 34/34. The demonstration that closure measures stimulus, not the model.
      sg = 1'b0;
`else
      sg = $urandom(seed);
`endif
      gen_biased = {sg, e, m};
    end
  endfunction

  // --------------------------------------------------------------- the report
  task report;
    integer b;
    begin
      $display("  operand class cross:");
      for (i = 0; i < NCLS; i = i + 1) begin
        $write("    %-8s", cname(i));
        for (j = 0; j < NCLS; j = j + 1) begin
          b = cov[i*NCLS + j];
          if (b == 0) begin
            holes = holes + 1;
            $write("  %8s:%6s", cname(j), "HOLE");
          end else
            $write("  %8s:%6d", cname(j), b);
        end
        $write("\n");
      end
      $display("  normal+normal, |exponent difference|:");
      for (i = 0; i < NEXPD; i = i + 1) begin
        b = cov[NCROSS + i];
        if (b == 0) holes = holes + 1;
        case (i)
          0:       $write("    ==0 (cancellation)  :");
          1:       $write("    1..2 (renormalise)  :");
          2:       $write("    3..24 (guard/round) :");
          default: $write("    >=25 (sticky only)  :");
        endcase
        $write("%8d%0s\n", b, (b == 0) ? "   <-- HOLE" : "");
      end
      $display("  result class:");
      for (i = 0; i < NRES; i = i + 1) begin
        b = cov[NCROSS + NEXPD + i];
        if (b == 0) holes = holes + 1;
        $display("    %-8s : %8d%0s", cname(i), b, (b == 0) ? "   <-- HOLE" : "");
      end
      $display("  ---------------------------------------------");
      $display("  bins hit %0d / %0d = %0d %%   holes = %0d",
               NBINS - holes, NBINS, ((NBINS - holes) * 100) / NBINS, holes);
    end
  endtask

  // ------------------------------------------------------------------ the run
  initial begin : run
    reg [31:0] x, y, r;

    for (i = 0; i < NBINS; i = i + 1) cov[i] = 0;
    if (!$value$plusargs("seed=%d", seed)) seed = 1;
    if (!$value$plusargs("gen=%s", gen))   gen = "full";
    $display("  gen=%0s seed=%0d transactions=%0d", gen, seed, NTRANS);
    x = $urandom(seed);                    // discard the first draw after seeding
    y = $urandom(seed);

    // One representative of each class, so the 25-way cross has a guaranteed
    // floor rather than a probabilistic one. A corner-case library is cheap and
    // it is the difference between "we usually reach that bin" and "we do".
    corner[C_ZERO] = 32'h00000000;
    corner[C_SUB]  = 32'h00000001;
    corner[C_NORM] = 32'h3f800000;
    corner[C_INF]  = 32'h7f800000;
    corner[C_NAN]  = 32'h7fc00000;

    if (gen != "uniform")
      for (i = 0; i < NCLS; i = i + 1)
        for (j = 0; j < NCLS; j = j + 1) begin
          x = corner[i];
          y = corner[j];
          r = fp_add(x, y);
          cov_sample(x, y, r);
          #1;
        end

    for (k = 0; k < NTRANS; k = k + 1) begin
      if (gen == "uniform") begin
        x = $urandom(seed);
        y = $urandom(seed);
      end else if (gen == "narrow") begin
        x = gen_biased(0);
        y = gen_biased(0);
      end else begin
        x = gen_biased(1);
        y = gen_biased(1);
      end
      r = fp_add(x, y);
      cov_sample(x, y, r);
      #1;
    end

    report;

    if (sampled == 0) begin
      $display("FAIL tb_covfp: the coverage model was never sampled");
      errors = errors + 1;
    end
    if (holes != 0) begin
      $display("*** COVERAGE FAILURE: %0d empty bins ***", holes);
      errors = errors + 1;
    end

    if (errors == 0)
      $display("PASS tb_covfp (%0d transactions, %0d/%0d bins, coverage closed)",
               sampled, NBINS - holes, NBINS);
    else
      $fatal(1, "%0d empty bin(s)", holes);
    $finish;
  end

endmodule

`default_nettype wire
