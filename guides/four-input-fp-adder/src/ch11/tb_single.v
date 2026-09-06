`timescale 1ns/1ps
`default_nettype none

// Chapter 11: the held-transaction harness -- shipped as the DELIBERATE
// FOIL. This is the shape a beginner writes first: drive one pair with a
// one-cycle in_valid pulse, HOLD the operands, wait for out_valid, check
// against the combinational reference, idle a cycle, next pair. Same
// corner library, same five-regime generator, same `!==`+X-guard and
// count guards as tb_stream.v. It is honest about what it checks, it can
// fail (the undriven-register mutant kills it through the X-guard), and
// it PASSES five distinct pipeline bug classes that tb_stream kills:
// data skew, flag mis-alignment, blocking stage banks, the illegal reset
// state, and valid/data tearing -- because holding the operands makes
// this transaction's wires and the previous transaction's registers
// carry the SAME values at every check. See the README's mutation
// record; the chapter's rule: a pipeline's new bug class is wrong
// PAIRING of data with transaction, and a held-input schedule is
// structurally blind to it.
`ifndef DUT
 `define DUT fp32_add2_p2
`endif
`ifndef LAT
 `define LAT 2
`endif
`ifndef NPR
 `define NPR 4000
`endif

module tb_single;
  localparam [31:0] SEED = 32'd9090;
  localparam integer LAT = `LAT;
  localparam integer NPR = `NPR;     // random pairs per regime, x5 regimes

  reg         clk, rst_n, in_valid;
  reg  [31:0] a, b;
  wire [31:0] r_p, r_c;
  wire        inv_p, ovf_p, inx_p, ov;
  wire        inv_c, ovf_c, inx_c;
  reg  [34:0] exp;

  integer total, mismatches, waitn;
  integer seed, dummy, regime, i;
  integer e1, e2;
  reg [31:0] ra, rb;

  `DUT dut (.clk(clk), .rst_n(rst_n), .in_valid(in_valid), .a(a), .b(b),
            .result(r_p), .invalid(inv_p), .overflow(ovf_p),
            .inexact(inx_p), .out_valid(ov));

  fp32_add2 refc (.a(a), .b(b), .result(r_c),
                  .invalid(inv_c), .overflow(ovf_c), .inexact(inx_c));

  always #5 clk = ~clk;

  initial begin : watchdog
    #20_000_000;
    $display("FAIL tb_single: timeout");
    $fatal(1, "timeout");
  end

  // One held transaction: pulse valid for one cycle, keep the operands
  // on the bus, wait (bounded) for out_valid, check, idle one cycle.
  task one(input [31:0] wa, input [31:0] wb);
    begin
      @(negedge clk);
      a = wa; b = wb; in_valid = 1'b1;
      #1 exp = {r_c, inv_c, ovf_c, inx_c};
      @(negedge clk);
      in_valid = 1'b0;                   // operands stay HELD
      waitn = 0;
      while (ov !== 1'b1 && waitn < LAT + 2) begin
        @(negedge clk); waitn = waitn + 1;
      end
      if (ov !== 1'b1) begin
        mismatches = mismatches + 1;
        if (mismatches <= 10)
          $display("FAIL tb_single %h+%h: out_valid never rose", wa, wb);
      end else if ((^{r_p, inv_p, ovf_p, inx_p}) === 1'bx) begin
        mismatches = mismatches + 1;
        if (mismatches <= 10)
          $display("FAIL tb_single %h+%h: X in outputs: %h/%b%b%b",
                   wa, wb, r_p, inv_p, ovf_p, inx_p);
      end else if ({r_p, inv_p, ovf_p, inx_p} !== exp) begin
        mismatches = mismatches + 1;
        if (mismatches <= 10)
          $display("FAIL tb_single %h+%h: pipe %h/%b%b%b ref %h/%b%b%b",
                   wa, wb, r_p, inv_p, ovf_p, inx_p,
                   exp[34:3], exp[2], exp[1], exp[0]);
      end
      total = total + 1;
      @(negedge clk);                    // one idle cycle between pairs
    end
  endtask

  task pair(input [31:0] wa, input [31:0] wb);
    begin
      one(wa, wb);
      one(wb, wa);
    end
  endtask

  function [31:0] mkfp(input [31:0] sgn, input integer e, input [22:0] frac);
    mkfp = {sgn[0], e[7:0], frac};
  endfunction

  initial begin
    $display("SEED=%0d LAT=%0d (held-transaction schedule)", SEED, LAT);
    seed = SEED; dummy = $urandom(seed);
    clk = 1'b0; rst_n = 1'b0; in_valid = 1'b0;
    a = 32'hx; b = 32'hx;
    total = 0; mismatches = 0;
    repeat (2) @(posedge clk);
    @(negedge clk) rst_n = 1'b1;

    // the ch08 corner library, both orders (92 held transactions)
    pair(32'h00000000, 32'h00000000); pair(32'h80000000, 32'h80000000);
    pair(32'h00000000, 32'h80000000); pair(32'h00000000, 32'h3F800000);
    pair(32'h80000000, 32'hC0000000); pair(32'h3FC00000, 32'hBFC00000);
    pair(32'h00000001, 32'h3F800000); pair(32'h00000001, 32'h00000001);
    pair(32'h00800000, 32'h80000001); pair(32'h007FFFFF, 32'h00000001);
    pair(32'h00000001, 32'h80000002); pair(32'h00400000, 32'h00800000);
    pair(32'h7F800000, 32'h7F800000); pair(32'hFF800000, 32'hC0000000);
    pair(32'h7F800000, 32'h00000000); pair(32'h7F800000, 32'h7F7FFFFF);
    pair(32'h4B800000, 32'h33800000); pair(32'h4B800000, 32'hB3800000);
    pair(32'h3F800000, 32'h33800001); pair(32'h4B000000, 32'hBDFFFFFF);
    pair(32'h3F800000, 32'hBF800000); pair(32'h40000001, 32'hC0000000);
    pair(32'h3F800000, 32'hBF7FFFFF); pair(32'h4B800000, 32'h3F800000);
    pair(32'h4B800001, 32'h3F800000); pair(32'h4B7FFFFF, 32'h3F800000);
    pair(32'h3FFFFFFF, 32'h33800000); pair(32'h3FFFFFFF, 32'h3FC00000);
    pair(32'h3F800001, 32'h33800000); pair(32'h3FFFFFFF, 32'h3E800009);
    pair(32'h7F7FFFFF, 32'h7F7FFFFF); pair(32'h7F7FFFFF, 32'h73000000);
    pair(32'h7F7FFFFF, 32'h72FFFFFF); pair(32'hFF7FFFFF, 32'hFF7FFFFF);
    pair(32'h3F800000, 32'h3F800000); pair(32'h3F800000, 32'h3E800000);
    pair(32'h3F800000, 32'hBE800003); pair(32'h3F800000, 32'hBE800001);
    pair(32'h3F800001, 32'h33040000); pair(32'h3F800001, 32'hB3800001);
    pair(32'h40000000, 32'hB3800001);
    pair(32'h7FC00055, 32'h3F800000); pair(32'h7FA00000, 32'h3F800000);
    pair(32'hFFC00001, 32'h7F800000); pair(32'h7F800001, 32'h00000000);
    pair(32'h7F800000, 32'hFF800000);
    if (total !== 92) begin
      $display("FAIL tb_single: corner phase ran %0d checks, expected 92", total);
      $fatal(1, "corner count");
    end

    // the five-regime generator, one HELD transaction per pair
    for (regime = 0; regime < 5; regime = regime + 1)
      for (i = 0; i < NPR; i = i + 1) begin
        case (regime)
          0: begin ra = $urandom; rb = $urandom; end
          1: begin
            e1 = 1 + ($urandom % 254); e2 = e1 + ($urandom % 3) - 1;
            if (e2 < 1) e2 = 1; if (e2 > 254) e2 = 254;
            ra = mkfp($urandom, e1, $urandom); rb = mkfp($urandom, e2, $urandom);
          end
          2: begin
            e1 = 1 + ($urandom % 254); e2 = e1 + ($urandom % 61) - 30;
            if (e2 < 1) e2 = 1; if (e2 > 254) e2 = 254;
            ra = mkfp($urandom, e1, $urandom); rb = mkfp($urandom, e2, $urandom);
          end
          3: begin
            ra = mkfp($urandom, $urandom % 3, $urandom);
            rb = mkfp($urandom, $urandom % 3, $urandom);
          end
          default: begin
            ra = mkfp($urandom, 250 + ($urandom % 5), $urandom);
            rb = mkfp($urandom, 250 + ($urandom % 5), $urandom);
          end
        endcase
        one(ra, rb);
      end

    if (total !== 92 + 5*NPR) begin
      $display("FAIL tb_single: %0d checks ran, expected %0d", total, 92 + 5*NPR);
      $fatal(1, "check count");
    end
    if (mismatches !== 0)
      $fatal(1, "FAIL tb_single: %0d mismatches", mismatches);
    $display("PASS tb_single LAT=%0d (%0d HELD transactions -- this schedule proves per-transaction correctness only; it is structurally blind to skew, see tb_stream)",
             LAT, total);
    $finish;
  end
endmodule

`default_nettype wire
