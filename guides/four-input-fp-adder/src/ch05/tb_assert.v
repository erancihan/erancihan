`timescale 1ns/1ps
`default_nettype none

// Everything Icarus Verilog 13.0 will actually run of SystemVerilog's assertion
// machinery, and the pattern to use in its place.
//
// Supported from -g2005-sv upward: immediate assert, assert ... else, assume,
// immediate cover. Not supported at any language level: concurrent assertions,
// property, sequence, deferred assertions, covergroups. bad_sva.v and
// bad_covergroup.v are the compile failures.
//
//   vvp sim              every assertion holds
//   iverilog -DBREAK_WRAP ...   the counter wraps at 8; the assertions fire
//
// Two habits are baked in below and both matter. The error counter next to
// every $error, because $error alone leaves the exit status at 0 and a make
// driven regression reports success while assertions fail. And the
// if (!rst) guard, which is a hand-rolled disable iff: without it every
// assertion fires during reset, when the design is not claiming anything.
module tb_assert;

  localparam real PERIOD = 10.0;

  reg        clk = 1'b0;
  reg        rst = 1'b1;
  reg        en  = 1'b0;
  wire [2:0] q;

  integer errs      = 0;
  integer checks    = 0;
  integer seen_five = 0;                    // a hand-rolled cover point
  integer i;

  counter6 dut (.clk(clk), .rst(rst), .en(en), .q(q));

  always #(PERIOD/2.0) clk = ~clk;

  initial begin : watchdog
    #10000;
    $display("FAIL tb_assert: timeout at %0t", $time);
    $fatal(1, "timeout");
  end

  // Immediate assertions, evaluated where control reaches them. Icarus has no
  // concurrent assertions, so a clocked property becomes an immediate assertion
  // inside always @(posedge clk) - which covers every single-cycle invariant
  // and, with a counter or a flag, simple multi-cycle ones too. Anything with
  // real temporal structure needs a simulator this one is not.
  always @(posedge clk) if (!rst) begin
    checks = checks + 1;

    // The cheapest high-value assertion in hardware: no output may be unknown.
    // It catches uninitialised registers, incomplete case statements and
    // inferred latches at the moment they happen rather than ten stages later.
    assert (^q !== 1'bx)
      else begin errs = errs + 1; $error("q is X"); end

    // An invariant from the SPECIFICATION - "a modulo-6 counter" - not from the
    // implementation. assert (q == q) would be a tautology that can never fire.
    assert (q <= 3'd5)
      else begin errs = errs + 1; $error("q=%0d exceeds 5", q); end

    // assume constrains the environment rather than the design. Icarus treats a
    // violated assume exactly like a violated assert: an ERROR line, and the
    // simulation carries on.
    assume (en === 1'b0 || en === 1'b1);

    // Immediate cover compiles and runs. It also reports nothing whatsoever -
    // Icarus has no coverage database - so count it yourself if you want an
    // answer. tb_covfp.v is what "count it yourself" grows into.
    cover (q == 3'd5);
    if (q == 3'd5) seen_five = seen_five + 1;
  end

  initial begin : stimulus
    reg [2:0] q_hold;
    reg [2:0] exp_q;
    repeat (2) @(posedge clk);
    @(negedge clk) rst = 1'b0;
    en = 1'b1;

    // Assertions state invariants; they do not state the answer. "q is never
    // more than 5" is true of a counter running backwards, so the value
    // sequence still has to be checked the ordinary way.
    exp_q = 3'd0;
    for (i = 0; i < 20; i = i + 1) begin
      @(negedge clk);
      exp_q = (exp_q == 3'd5) ? 3'd0 : exp_q + 3'd1;
      if (q !== exp_q) begin
        $display("FAIL tb_assert: after %0d enabled cycles q=%0d, expected %0d",
                 i + 1, q, exp_q);
        errs = errs + 1;
      end
    end

    // The enable, checked from the stimulus rather than from a clocked block,
    // because the property spans three cycles and Icarus has no way to say so.
    en     = 1'b0;
    q_hold = q;
    repeat (3) @(negedge clk);
    if (q !== q_hold) begin
      $display("FAIL tb_assert: q moved from %0d to %0d across three cycles with en low",
               q_hold, q);
      errs = errs + 1;
    end
    en = 1'b1;
    repeat (2) @(negedge clk);

    // Reset synchronicity, checked away from every clock edge. The spec says
    // the reset is synchronous, so q must NOT respond to rst until the next
    // posedge - an asynchronous-reset rewrite (always @(posedge clk or posedge
    // rst)) clears q the instant rst rises and fails here. This mutant
    // survived every target until this check existed.
    while (q === 3'd0) @(negedge clk);      // a reset of 0 proves nothing
    q_hold = q;
    #2;                                     // strictly between edges now
    rst = 1'b1;
    #1;
    if (q !== q_hold) begin
      $display("FAIL tb_assert: q moved from %0d to %0d when rst rose between clock edges - the reset is not synchronous",
               q_hold, q);
      errs = errs + 1;
    end
    @(posedge clk);
    #1;
    if (q !== 3'd0) begin
      $display("FAIL tb_assert: q=%0d one posedge after rst rose, expected 0", q);
      errs = errs + 1;
    end
    @(negedge clk) rst = 1'b0;
    repeat (2) @(negedge clk);

    // End-of-test assertions about the RUN. A clocked assertion that never ran
    // is a comment, and an unreached cover point means the stimulus never got
    // to the interesting state - the assertion above proves nothing about q=5
    // if q never reached 5.
    if (checks < 20) begin
      $display("FAIL tb_assert: only %0d clocked checks ran", checks);
      errs = errs + 1;
    end
    if (seen_five == 0) begin
      $display("FAIL tb_assert: the cover point q==5 was never reached, so the q<=5 assertion proves nothing about the wrap");
      errs = errs + 1;
    end

    $display("  %0d clocked checks, q reached 5 %0d times, %0d assertion failures",
             checks, seen_five, errs);
    if (errs == 0)
      $display("PASS tb_assert (%0d checks, 0 failures)", checks);
    else begin
      $display("FAIL tb_assert: %0d assertion failure(s)", errs);
      $fatal(1, "%0d error(s)", errs);
    end
    $finish;
  end

endmodule

`default_nettype wire
