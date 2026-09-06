`timescale 1ns/1ps
`default_nettype none

// A PASS here means the race still reproduces on this simulator: two modules
// containing identical statements in opposite source order give different
// answers, and the same-edge execution order is not even constant within one
// run.
module tb_race;

  localparam CLK_HALF = 5;

  reg clk = 1'b0;
  always #CLK_HALF clk = ~clk;

  reg d = 1'b1;
  wire a_ab, b_ab, a_ba, b_ba;

  integer errors = 0;

  race_ab     u_ab (.clk(clk), .d(d), .a(a_ab), .b(b_ab));
  race_ba     u_ba (.clk(clk), .d(d), .a(a_ba), .b(b_ba));
  order_probe u_op (.clk(clk));

  initial begin
    #7;
    $display("  after one rising edge, d=1:");
    $display("    race_ab (a=d first in the source) : a=%b b=%b", a_ab, b_ab);
    $display("    race_ba (b=a first in the source) : a=%b b=%b", a_ba, b_ba);

    if (a_ab !== 1'b1 || a_ba !== 1'b1) begin
      errors = errors + 1;
      $display("FAIL both modules should end with a=1");
    end
    if (b_ab === b_ba) begin
      errors = errors + 1;
      $display("FAIL the race no longer reproduces: both gave b=%b", b_ab);
    end

    #40;
    if (errors == 0) $display("PASS tb_race (source order still decides the answer)");
    else             $fatal(1, "tb_race: %0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
