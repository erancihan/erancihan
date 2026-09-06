`timescale 1ns/1ps
`default_nettype none

// Chapter 13: chapter 11's streaming scoreboard, rewritten as a
// SystemVerilog queue.
//
// The shipped version ("The Streaming-Equivalence Harness") is a LAT-deep
// circular buffer: parallel arrays, idx = cyc % LAT, and the check-before-
// overwrite trick that makes the off-by-one structurally impossible. The
// queue version is push on drive, pop on retire -- and it NEVER MENTIONS
// THE LATENCY. No LAT parameter, no modulo, no depth to get wrong. The
// latency stops being a wired-in constant and becomes a measured output:
// the maximum queue depth, printed in the PASS line.
//
// Two composition walls, both measured, both visible in the code below:
//   * a queue OF a packed struct elaborates to
//       Sorry: Queue of type `11netstruct_t` is not yet supported.
//     so the queue holds plain [98:0] vectors and the struct is used to
//     UNPACK a popped entry (packed structs assign freely from vectors);
//   * named assignment patterns '{r: ..., inv: ...} are a syntax error in
//     any context, so records are built by concatenation.
// Icarus's SystemVerilog features frequently work alone and fail composed.
//
// What makes it able to fail (mutation-tested; see README.md): !== on
// result and flags, an X-guard on the outputs, the empty-queue guard for a
// spurious retire, the drain, the queue-empty-at-end check, and the
// driven == retired count guard. The last two are not decoration -- during
// development a mid-cycle deassert withdrew the final pair before any
// posedge captured it, and the count guard was the only check that noticed.
module tb_q_stream;

  // The expectation record. Used to UNPACK, not as the queue's element type.
  typedef struct packed {
    logic [31:0] r;
    logic        inv, ovf, inx;
    logic [31:0] a, b;          // carried for the failure message only
  } exp_t;

  logic        clk = 1'b0, rst_n = 1'b0, in_valid;
  logic [31:0] a, b;
  wire  [31:0] r_p;  wire inv_p, ovf_p, inx_p, ov;
  wire  [31:0] r_c;  wire inv_c, ovf_c, inx_c;

  // DUT: chapter 11's 2-stage pipeline. Oracle: chapter 9's combinational
  // fp32_add2, the same pairing chapter 11 uses.
  fp32_add2_p2 dut  (.clk(clk), .rst_n(rst_n), .in_valid(in_valid),
                     .a(a), .b(b), .result(r_p), .invalid(inv_p),
                     .overflow(ovf_p), .inexact(inx_p), .out_valid(ov));
  fp32_add2    refc (.a(a), .b(b), .result(r_c), .invalid(inv_c),
                     .overflow(ovf_c), .inexact(inx_c));

  logic [98:0] q[$];
  exp_t        e;
  integer      errors, n_driven, n_retired, maxq, i, seed, dummy;

  always #5 clk = ~clk;

  initial begin : watchdog
    #10_000_000;
    $display("FAIL tb_q_stream: timeout");
    $fatal(1, "timeout");
  end

  initial begin
    errors = 0; n_driven = 0; n_retired = 0; maxq = 0;
    seed = 3131; dummy = $urandom(seed);
    in_valid = 1'b0; a = 32'hx; b = 32'hx;
    repeat (2) @(negedge clk);
    rst_n = 1'b1;

    for (i = 0; i < 60000; i = i + 1) begin
      @(negedge clk);
      if (($urandom % 8) == 0) begin
        in_valid = 1'b0; a = 32'hx; b = 32'hx;      // X-data bubble
      end else begin
        in_valid = 1'b1; a = $urandom; b = $urandom;
      end
      #1;
      if (in_valid) begin
        q.push_back({r_c, inv_c, ovf_c, inx_c, a, b});
        n_driven = n_driven + 1;
      end
      if (q.size() > maxq) maxq = q.size();
      if (ov === 1'b1) begin
        if (q.size() == 0) begin
          errors = errors + 1;
          $display("FAIL cyc %0d: out_valid with an EMPTY queue (spurious retire)", i);
        end else begin
          e = q.pop_front();
          if ((^{r_p, inv_p, ovf_p, inx_p}) === 1'bx) begin
            errors = errors + 1;
            if (errors <= 10)
              $display("FAIL cyc %0d: %h+%h X in outputs", i, e.a, e.b);
          end else if ({r_p, inv_p, ovf_p, inx_p} !== {e.r, e.inv, e.ovf, e.inx}) begin
            errors = errors + 1;
            if (errors <= 10)
              $display("FAIL cyc %0d: %h+%h got %h/%b%b%b exp %h/%b%b%b",
                       i, e.a, e.b, r_p, inv_p, ovf_p, inx_p,
                       e.r, e.inv, e.ovf, e.inx);
          end
          n_retired = n_retired + 1;
        end
      end
    end

    // Drain. Deassert AT a negedge like every other drive: deasserting
    // mid-cycle withdraws the final pair before any posedge captures it.
    repeat (8) begin
      @(negedge clk);
      in_valid = 1'b0; a = 32'hx; b = 32'hx;
      #1;
      if (ov === 1'b1 && q.size() > 0) begin
        e = q.pop_front();
        if ({r_p, inv_p, ovf_p, inx_p} !== {e.r, e.inv, e.ovf, e.inx}) begin
          errors = errors + 1;
          $display("FAIL drain: %h+%h got %h exp %h", e.a, e.b, r_p, e.r);
        end
        n_retired = n_retired + 1;
      end else if (ov === 1'b1) begin
        errors = errors + 1;
        $display("FAIL drain: spurious retire with an empty queue");
      end
    end

    if (q.size() != 0) begin
      errors = errors + 1;
      $display("FAIL tb_q_stream: %0d expectation(s) never retired", q.size());
    end
    if (n_retired !== n_driven) begin
      errors = errors + 1;
      $display("FAIL tb_q_stream: driven %0d, retired %0d", n_driven, n_retired);
    end
    if (n_driven == 0) begin
      errors = errors + 1;
      $display("FAIL tb_q_stream: nothing was driven");
    end
    if (errors == 0)
      $display("PASS tb_q_stream (%0d pairs, max queue depth %0d = measured latency + 1)",
               n_driven, maxq);
    else
      $display("FAIL tb_q_stream: %0d error(s)", errors);
    $finish;
  end
endmodule

`default_nettype wire
