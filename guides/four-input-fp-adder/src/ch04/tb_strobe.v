`timescale 1ns/1ps
`default_nettype none

// $display, $strobe and $monitor called from the same rising edge, about the
// same flip-flop output. They do not agree, and the disagreement is not a bug:
// $display runs in the active region, before non-blocking updates land, and
// $strobe and $monitor run after them. The self-check asserts that they
// disagree - if they ever stop, this simulator's regions have changed.
module tb_strobe;

  reg        clk = 1'b0;
  reg  [7:0] d   = 8'h00;
  wire [7:0] q;

  reg  [7:0] active_q  = 8'h00;   // q sampled in the active region
  reg  [7:0] settled_q = 8'h00;   // q sampled after the same time step settled
  integer    disagreements = 0;
  integer    errors = 0;

  dff u_dff (.clk(clk), .d(d), .q(q));

  always #5 clk = ~clk;

  // Stimulus on the far edge, so d is stable either side of every posedge.
  always @(negedge clk) d <= d + 8'd1;

  initial $monitor("  $monitor t=%0t clk=%b d=%0d q=%0d", $time, clk, d, q);

  always @(posedge clk) begin
    $display("  $display t=%0t clk=%b d=%0d q=%0d", $time, clk, d, q);
    $strobe ("  $strobe  t=%0t clk=%b d=%0d q=%0d", $time, clk, d, q);
    active_q = q;
  end

  // The #1 is a deliberate mid-cycle probe of an output, not a way to talk to
  // a DUT: never drive a design input from a delay after the sampling edge.
  always @(posedge clk) #1 begin
    settled_q = q;
    if (active_q !== settled_q) disagreements = disagreements + 1;
    // Counting disagreements says nothing about what the flop computes - an
    // inverting dff disagrees just as reliably. Pin the value too, or nothing
    // in this chapter tests dff itself.
    if (settled_q !== d) begin
      errors = errors + 1;
      $display("FAIL tb_strobe: t=%0t q settled at %0d, expected d=%0d",
               $time, settled_q, d);
    end
  end

  // Time-based, not edge-counted: a watchdog that waits on the clock cannot
  // fire when the clock is what died.
  initial begin : watchdog
    #200;
    $display("FAIL tb_strobe: timeout at %0t, the test never finished", $time);
    $fatal(1, "timeout");
  end

  initial begin
    repeat (4) @(posedge clk);
    #2;
    // Four posedges were observed and $display saw the old q at every one.
    // Pinning the count, rather than testing it for "more than zero", is what
    // makes the number in the verdict a measurement instead of a decoration.
    if (disagreements !== 4) begin
      errors = errors + 1;
      $display("FAIL tb_strobe: %0d edges disagreed, expected 4",
               disagreements);
    end
    if (errors == 0)
      $display("PASS tb_strobe (%0d edges where $display saw the old q)",
               disagreements);
    else
      $fatal(1, "%0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
