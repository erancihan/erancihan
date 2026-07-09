// tb_counter.v — a self-checking testbench for counter.v.
//
// The testbench is NOT hardware. It is a simulation-only program that
// generates a clock, wiggles the DUT's inputs, and checks its outputs.
// Convention used throughout this guide:
//   * drive inputs a little after the rising edge (#1),
//   * check outputs a little after the following rising edge,
//   * count errors and print "ALL TESTS PASSED" only if there were none.
`timescale 1ns/1ps

module tb_counter;

    reg        clk = 1'b0;
    reg        rst = 1'b1;
    reg        en  = 1'b0;
    wire [7:0] count;

    // device under test
    counter dut (
        .clk  (clk),
        .rst  (rst),
        .en   (en),
        .count(count)
    );

    // 100 MHz clock: 10 ns period
    always #5 clk = ~clk;

    integer errors = 0;

    task check(input [7:0] expected);
        begin
            if (count !== expected) begin
                $display("FAIL @%0t: count = %0d, expected %0d",
                         $time, count, expected);
                errors = errors + 1;
            end
        end
    endtask

    initial begin
        // dump every signal for the waveform viewer (GTKWave / Surfer)
        $dumpfile("counter.vcd");
        $dumpvars(0, tb_counter);

        // two cycles of reset
        @(posedge clk); #1;
        @(posedge clk); #1;
        rst = 1'b0;

        // enable low: counter must hold at 0
        @(posedge clk); #1 check(8'd0);

        // count 10 ticks
        en = 1'b1;
        @(posedge clk); #1 check(8'd1);
        repeat (9) @(posedge clk);
        #1 check(8'd10);

        // pause: value must hold
        en = 1'b0;
        repeat (3) @(posedge clk);
        #1 check(8'd10);

        // wrap-around: preload near the top by counting there
        en = 1'b1;
        repeat (246) @(posedge clk);
        #1 check(8'd0);   // 10 + 246 = 256 -> wraps to 0

        // synchronous reset while counting
        repeat (5) @(posedge clk);
        #1 check(8'd5);
        rst = 1'b1;
        @(posedge clk); #1 check(8'd0);
        rst = 1'b0;

        if (errors == 0) $display("ALL TESTS PASSED");
        else             $display("TEST FAILED: %0d errors", errors);
        $finish;
    end

endmodule
