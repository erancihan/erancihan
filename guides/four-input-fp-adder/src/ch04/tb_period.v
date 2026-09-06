`timescale 1ns/1ps

// The same clock generator compiled under two timescales. The source asks for
// a 5 ns period both times. Only one of them gets it.
module clk_fine (output reg clk);
  localparam real PERIOD = 5.0;
  initial clk = 1'b0;
  always #(PERIOD/2.0) clk = ~clk;
endmodule

`timescale 1ns/1ns

module clk_coarse (output reg clk);
  localparam real PERIOD = 5.0;
  initial clk = 1'b0;
  always #(PERIOD/2.0) clk = ~clk;      // #2.5 rounded to the 1 ns precision
endmodule

`timescale 1ns/1ps
`default_nettype none

module tb_period;

  wire fine, coarse;
  real rise_f, rise_c, period_f, period_c;
  integer errors = 0;

  clk_fine   u_f (.clk(fine));
  clk_coarse u_c (.clk(coarse));

  always @(posedge fine)   begin period_f = $realtime - rise_f; rise_f = $realtime; end
  always @(posedge coarse) begin period_c = $realtime - rise_c; rise_c = $realtime; end

  initial begin
    #40;
    $display("  1ns/1ps: asked for 5.00 ns, measured %0.2f ns", period_f);
    $display("  1ns/1ns: asked for 5.00 ns, measured %0.2f ns", period_c);

    if (period_f != 5.0) begin
      errors = errors + 1;
      $display("FAIL tb_period: the 1ps clock is not 5 ns");
    end
    if (period_c == 5.0) begin
      errors = errors + 1;
      $display("FAIL tb_period: the 1ns clock is no longer rounded");
    end

    if (errors == 0)
      $display("PASS tb_period (precision decides what your period really is)");
    else
      $fatal(1, "%0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
