`timescale 1ns/1ps
`default_nettype none

// The stratified event queue, made visible. One clocked block writes r with a
// non-blocking assignment and then tries to read it back four ways: straight
// away, from a second block on the same edge, after a #0, and with $strobe.
//
// The clocked block below is an instrument, not a design. Nothing ever runs
// "in the inactive region": #0 defers the continuation into it, and when the
// active region empties those events are promoted back INTO the active region
// and execute there. That is what the label on the third line says. And #0
// never belongs in RTL, for the reason Cummings' Guideline #8 gives.
module tb_regions;

  localparam CLK_HALF = 5;

  reg clk = 1'b0;
  always #CLK_HALF clk = ~clk;

  reg [3:0] r = 4'd0;
  reg [3:0] d = 4'd7;

  reg [3:0] seen_after_nba, seen_by_other, seen_after_zero;
  integer errors = 0;

  always @(posedge clk) begin
    $display("  [active    region] $display before 'r <= d'  : r=%0d", r);
    r <= d;
    $display("  [active    region] $display after  'r <= d'  : r=%0d   (unchanged)", r);
    seen_after_nba  = r;
    #0;
    $display("  [active, after #0] $display after  '#0'      : r=%0d", r);
    seen_after_zero = r;
    $strobe ("  [postponed region] $strobe  end of time slot : r=%0d", r);
  end

  always @(posedge clk) begin
    $display("  [active    region] a second clocked block reads r=%0d", r);
    seen_by_other = r;
  end

  initial $monitor("  [monitor   region] $monitor                  : t=%0d r=%0d",
                   $time, r);

  task check;
    input [3:0] got;
    input [3:0] exp;
    input [80*8:1] what;
    begin
      if (got !== exp) begin
        errors = errors + 1;
        $display("FAIL %0s: got %0d, expected %0d", what, got, exp);
      end
    end
  endtask

  initial begin
    #12;
    check(seen_after_nba,  4'd0, "same block, straight after the NBA");
    check(seen_by_other,   4'd0, "a second block on the same edge");
    check(seen_after_zero, 4'd0, "the same block after a #0");
    check(r,               4'd7, "the next time slot");

    if (errors == 0) $display("PASS tb_regions");
    else             $fatal(1, "tb_regions: %0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
