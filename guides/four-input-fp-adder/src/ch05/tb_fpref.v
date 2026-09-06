`timescale 1ns/1ps
`default_nettype none

// The corner-case suite chapter 12 will inherit, with the reference model in
// the place the design under test will eventually occupy.
//
// Two independent IEEE 754 binary32 implementations are compared here: Icarus's
// own shortreal arithmetic, and a table of expected bit patterns computed in
// python3 with struct.pack('>f') and pasted in. Neither knows about the other,
// which is the whole point of a differential test - when they agree on twenty
// eight corner cases, both are probably right, and when they disagree exactly
// one of them is wrong and you now know to look.
//
// Every comparison is on BIT PATTERNS with ===, never on values and never with
// a tolerance. bad_tolerance.v shows what a tolerance costs you.
// NaN is the one exception: its payload is not specified for addition, so NaN
// results are compared by class, plus the requirement that the NaN be quiet.
module tb_fpref;

  localparam integer N = 28;

  localparam [2:0] C_ZERO = 3'd0, C_SUB = 3'd1, C_NORM = 3'd2,
                   C_INF  = 3'd3, C_NAN = 3'd4;

  reg [31:0]     ta   [0:N-1];
  reg [31:0]     tb   [0:N-1];
  reg [31:0]     texp [0:N-1];
  reg            tnan [0:N-1];              // 1 = expect a quiet NaN, any payload
  reg [8*24-1:0] tname[0:N-1];

  integer i, j;
  integer errors = 0;
  integer checks = 0;

  // ------------------------------------------------------- the reference model
  // One add per call, and the result leaves as bits immediately. That is what
  // makes the missing round-trip safe here - see bad_srchain.v for what happens
  // when a shortreal value is carried from one operation into the next.
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

  function [2:0] fclass;
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

  function [8*8-1:0] cname;
    input [2:0] c;
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

  initial begin : watchdog
    #100000;
    $display("FAIL tb_fpref: timeout at %0t", $time);
    $fatal(1, "timeout");
  end

  task put;
    input integer     k;
    input [8*24-1:0]  nm;
    input [31:0]      x;
    input [31:0]      y;
    input [31:0]      e;
    input             isnan;
    begin
      tname[k] = nm; ta[k] = x; tb[k] = y; texp[k] = e; tnan[k] = isnan;
    end
  endtask

  initial begin : run
    reg [31:0] got;

    for (i = 0; i < N; i = i + 1) texp[i] = 32'hxxxxxxxx;

    //   #  name                     a          b          expected   NaN?
    put( 0, "A1 (+0)+(+0)",          32'h00000000, 32'h00000000, 32'h00000000, 1'b0);
    put( 1, "A1 (-0)+(-0)",          32'h80000000, 32'h80000000, 32'h80000000, 1'b0);
    put( 2, "A2 (+0)+(-0)",          32'h00000000, 32'h80000000, 32'h00000000, 1'b0);
    put( 3, "A2 (-0)+(+0)",          32'h80000000, 32'h00000000, 32'h00000000, 1'b0);
    put( 4, "A3 (+0)+1.0",           32'h00000000, 32'h3f800000, 32'h3f800000, 1'b0);
    put( 5, "B1 minsub+1.0",         32'h00000001, 32'h3f800000, 32'h3f800000, 1'b0);
    put( 6, "B2 minsub+minsub",      32'h00000001, 32'h00000001, 32'h00000002, 1'b0);
    put( 7, "B3 gradual underflow",  32'h00800000, 32'h80000001, 32'h007fffff, 1'b0);
    put( 8, "B4 subnorm->normal",    32'h007fffff, 32'h00000001, 32'h00800000, 1'b0);
    put( 9, "C1 qNaN+1.0",           32'h7fc00000, 32'h3f800000, 32'h7fc00000, 1'b1);
    put(10, "C1 1.0+qNaN",           32'h3f800000, 32'h7fc00000, 32'h7fc00000, 1'b1);
    put(11, "C2 sNaN+1.0 -> quiet",  32'h7fa00000, 32'h3f800000, 32'h7fe00000, 1'b1);
    put(12, "C3 qNaN+inf",           32'h7fc00000, 32'h7f800000, 32'h7fc00000, 1'b1);
    put(13, "D1 inf+inf",            32'h7f800000, 32'h7f800000, 32'h7f800000, 1'b0);
    put(14, "D1 inf+1.0",            32'h7f800000, 32'h3f800000, 32'h7f800000, 1'b0);
    put(15, "D1 inf+(+0)",           32'h7f800000, 32'h00000000, 32'h7f800000, 1'b0);
    put(16, "D2 inf+(-inf) -> NaN",  32'h7f800000, 32'hff800000, 32'h7fc00000, 1'b1);
    put(17, "E  sticky region",      32'h4b800000, 32'h33800000, 32'h4b800000, 1'b0);
    put(18, "F1 1.0+(-1.0) -> +0",   32'h3f800000, 32'hbf800000, 32'h00000000, 1'b0);
    put(19, "F1 subnorm cancel",     32'h00000001, 32'h80000001, 32'h00000000, 1'b0);
    put(20, "F2 catastrophic cancel",32'h40000001, 32'hc0000000, 32'h34800000, 1'b0);
    put(21, "G1 tie down (lsb 0)",   32'h4b800000, 32'h3f800000, 32'h4b800000, 1'b0);
    put(22, "G1 tie up   (lsb 1)",   32'h4b800001, 32'h3f800000, 32'h4b800002, 1'b0);
    put(23, "G2 guard+sticky -> up", 32'h4b7fffff, 32'h3f800000, 32'h4b800000, 1'b0);
    put(24, "G3 round carries out",  32'h3fffffff, 32'h33800000, 32'h40000000, 1'b0);
    put(25, "H1 overflow -> inf",    32'h7f7fffff, 32'h7f7fffff, 32'h7f800000, 1'b0);
    put(26, "I1 1.0+1.0 carries",    32'h3f800000, 32'h3f800000, 32'h40000000, 1'b0);
    put(27, "I2 1.0+0.25 no carry",  32'h3f800000, 32'h3e800000, 32'h3fa00000, 1'b0);

    // A table with an unfilled row is a test that silently does not exist.
    for (i = 0; i < N; i = i + 1)
      if (^texp[i] === 1'bx) begin
        $display("FAIL tb_fpref: table row %0d was never filled in", i);
        errors = errors + 1;
      end

    // And a table with a DUPLICATED row is a test that silently replaced
    // another - the tie-down/tie-up pair collapses to one vector without a
    // murmur. All 28 (a,b) pairs must be distinct.
    for (i = 0; i < N; i = i + 1)
      for (j = i + 1; j < N; j = j + 1)
        if (ta[i] === ta[j] && tb[i] === tb[j]) begin
          $display("FAIL tb_fpref: rows %0d and %0d are the same pair a=%08h b=%08h",
                   i, j, ta[i], tb[i]);
          errors = errors + 1;
        end

    for (i = 0; i < N; i = i + 1) begin
      got    = fp_add(ta[i], tb[i]);
      checks = checks + 1;
      if (tnan[i]) begin
        // Payload is not specified; class is, and so is quietness.
        if (fclass(got) !== C_NAN || got[22] !== 1'b1) begin
          errors = errors + 1;
          $display("FAIL tb_fpref: %0s a=%08h b=%08h got=%08h (%0s) - expected a quiet NaN",
                   tname[i], ta[i], tb[i], got, cname(fclass(got)));
        end
      end else if (got !== texp[i]) begin
        errors = errors + 1;
        $display("FAIL tb_fpref: %0s a=%08h b=%08h exp=%08h got=%08h xor=%08h (%0s vs %0s)",
                 tname[i], ta[i], tb[i], texp[i], got, texp[i] ^ got,
                 cname(fclass(texp[i])), cname(fclass(got)));
      end
      $display("  %-24s %08h + %08h = %08h  %0s+%0s->%0s",
               tname[i], ta[i], tb[i], got,
               cname(fclass(ta[i])), cname(fclass(tb[i])), cname(fclass(got)));
    end

    if (checks !== N) begin
      $display("FAIL tb_fpref: ran %0d checks, expected %0d", checks, N);
      errors = errors + 1;
    end

    if (errors == 0)
      $display("PASS tb_fpref (%0d corner cases, shortreal agrees with python3 on every one)",
               checks);
    else
      $fatal(1, "%0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
