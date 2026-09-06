`timescale 1ns/1ps
`default_nettype none

// Chapter 13: is an interface bundle wiring-transparent on the real
// pipelined adder? Two copies of chapter 11's fp32_add2_p2 -- with its
// whole chapter 7 / chapter 9 module tree underneath -- run from the same
// stimulus. DUT A reaches every port through an interface member; DUT B is
// wired conventionally. The outputs are compared with !== EVERY cycle, not
// only on retirement, so a bundle that mangled the fill window or the
// bubbles would be caught too.
//
// Icarus accepts a module OUTPUT port driving an interface member: the port
// becomes the single continuous driver of that `logic`. Measured cost of
// that acceptance (probe p60 in the research notes): a procedural write to
// the same member is then a hard elaboration error, which is real -- if
// narrow -- double-drive protection on the output bundle.
//
// What makes it able to fail: the cycle-by-cycle !== compare, the X-data
// bubbles (chapter 11's discipline), and the retired-count floor -- a run
// that retired nothing would otherwise pass in silence.
module tb_if_stream;

  logic clk = 1'b0, rst_n = 1'b0;

  fp_in_if  bi ();
  fp_out_if bo ();

  // DUT A: every port reached through an interface member.
  fp32_add2_p2 duta (.clk(clk), .rst_n(rst_n),
                     .in_valid(bi.valid), .a(bi.a), .b(bi.b),
                     .result(bo.result), .invalid(bo.invalid),
                     .overflow(bo.overflow), .inexact(bo.inexact),
                     .out_valid(bo.valid));

  // DUT B: plain wires, chapter 11 style.
  wire [31:0] r_b;
  wire        iv_b, ov_b, ix_b, val_b;
  fp32_add2_p2 dutb (.clk(clk), .rst_n(rst_n),
                     .in_valid(bi.valid), .a(bi.a), .b(bi.b),
                     .result(r_b), .invalid(iv_b), .overflow(ov_b),
                     .inexact(ix_b), .out_valid(val_b));

  integer errors, n, i, seed, dummy;

  always #5 clk = ~clk;

  // Time-based watchdog, never edge-counted (the harness rule from
  // chapter 4's review: an edge-counted watchdog cannot fire if the clock
  // dies, and a hang stalls the whole regression).
  initial begin : watchdog
    #4_000_000;
    $display("FAIL tb_if_stream: timeout");
    $fatal(1, "timeout");
  end

  initial begin
    errors = 0; n = 0;
    seed = 77; dummy = $urandom(seed);      // seed once, discard first draw
    bi.valid = 1'b0; bi.a = 32'hx; bi.b = 32'hx;
    repeat (2) @(negedge clk);
    rst_n = 1'b1;

    for (i = 0; i < 60000; i = i + 1) begin
      @(negedge clk);                        // drive only at the negedge
      if (($urandom % 8) == 0) begin
        bi.valid = 1'b0; bi.a = 32'hx; bi.b = 32'hx;   // X-data bubble
      end else begin
        bi.valid = 1'b1; bi.a = $urandom;    bi.b = $urandom;
      end
      #1;
      if ({bo.valid, bo.result, bo.invalid, bo.overflow, bo.inexact}
          !== {val_b, r_b, iv_b, ov_b, ix_b}) begin
        errors = errors + 1;
        if (errors <= 5)
          $display("FAIL cyc %0d: if={%b %h %b%b%b} wire={%b %h %b%b%b}",
                   i, bo.valid, bo.result, bo.invalid, bo.overflow, bo.inexact,
                   val_b, r_b, iv_b, ov_b, ix_b);
      end
      if (bo.valid === 1'b1) n = n + 1;
    end

    if (n < 40000) begin
      errors = errors + 1;
      $display("FAIL tb_if_stream: only %0d results retired", n);
    end
    if (errors == 0)
      $display("PASS tb_if_stream (%0d retired results, interface-wired == wire-wired)", n);
    else
      $display("FAIL tb_if_stream: %0d error(s)", errors);
    $finish;
  end
endmodule

`default_nettype wire
