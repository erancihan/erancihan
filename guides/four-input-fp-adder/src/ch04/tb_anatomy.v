`timescale 1ns/1ps
`default_nettype none

// The shape every testbench in this book has, read top to bottom:
// declarations, DUT, clock, dump control, watchdog, checker, stimulus, verdict.
module tb_anatomy;

  localparam real PERIOD = 10.0;          // ns - name the period, not the half

  // Chapter 2's rule still binds: reg for what the testbench drives.
  reg        clk = 1'b0;
  reg        rst_n;
  reg        en;
  wire [3:0] q;

  integer    errors = 0;
  integer    i;

  counter4 dut (.clk(clk), .rst_n(rst_n), .en(en), .q(q));

  // The initialiser on the declaration above is what makes this line work:
  // ~x is x, and an x clock never produces an edge.
  always #(PERIOD/2.0) clk = ~clk;

  // Waveform dump on request only:  vvp sim +dump=/tmp/anatomy.vcd
  // The filename lives inside the block, not at module scope, so a 2048-bit
  // string does not end up in the waveform of the design being debugged.
  initial begin : dumpctl
    reg [8*256-1:0] dumpfile;
    if ($value$plusargs("dump=%s", dumpfile)) begin
      $dumpfile(dumpfile);
      $dumpvars(0, tb_anatomy);
    end
  end

  // Watchdog: its own initial block, and it prints FAIL before killing the run.
  initial begin : watchdog
    #10000;
    $display("FAIL tb_anatomy: timeout at %0t, the test never finished", $time);
    $fatal(1, "timeout");
  end

  task check(input [3:0] got, input [3:0] want, input [255:0] what);
    begin
      if (got !== want) begin
        errors = errors + 1;
        $display("FAIL tb_anatomy: t=%0t %0s: q=%0d expected %0d",
                 $time, what, got, want);
      end else
        $display("  ok t=%0t %0s: q=%0d", $time, what, got);
    end
  endtask

  initial begin
    // Reset is asserted at time 0, before any edge exists to be confused by.
    rst_n = 1'b0;
    en    = 1'b0;
    repeat (3) @(posedge clk);            // hold it across several edges
    @(negedge clk) rst_n = 1'b1;          // release it on the far edge
    check(q, 4'd0, "out of reset");

    en = 1'b1;                            // stimulus changes on negedge only
    repeat (5) @(negedge clk);
    check(q, 4'd5, "five enabled cycles");

    en = 1'b0;
    repeat (3) @(negedge clk);
    check(q, 4'd5, "three disabled cycles");

    en = 1'b1;
    for (i = 0; i < 4; i = i + 1) @(negedge clk);
    check(q, 4'd9, "four more enabled cycles");

    if (errors == 0) $display("PASS tb_anatomy");
    else             $fatal(1, "%0d error(s)", errors);
    $finish;
  end

endmodule

`default_nettype wire
