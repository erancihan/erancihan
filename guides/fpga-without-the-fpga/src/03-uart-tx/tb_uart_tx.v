// tb_uart_tx.v — receives what the transmitter sends and compares.
//
// The testbench plays the role of the *other* device on the serial cable:
// it waits for the falling edge of the start bit, then samples the line in
// the middle of each bit period — exactly what a real UART receiver does.
`timescale 1ns/1ps

module tb_uart_tx;

    localparam CLKS_PER_BIT = 10;
    localparam CLK_PERIOD   = 10;                       // ns
    localparam BIT_NS       = CLKS_PER_BIT * CLK_PERIOD;

    reg        clk = 1'b0;
    reg        rst = 1'b1;
    reg        start = 1'b0;
    reg  [7:0] data = 8'h00;
    wire       tx;
    wire       busy;

    uart_tx #(.CLKS_PER_BIT(CLKS_PER_BIT)) dut (
        .clk(clk), .rst(rst), .start(start), .data(data),
        .tx(tx), .busy(busy)
    );

    always #(CLK_PERIOD/2) clk = ~clk;

    integer errors = 0;

    // Act like a UART receiver: wait for start edge, sample mid-bit.
    task recv_and_check(input [7:0] expected);
        reg [7:0] rx;
        integer   i;
        begin
            @(negedge tx);            // falling edge = start bit begins
            #(BIT_NS / 2);            // middle of the start bit
            if (tx !== 1'b0) begin
                $display("FAIL: start bit not low");
                errors = errors + 1;
            end
            for (i = 0; i < 8; i = i + 1) begin
                #(BIT_NS);            // middle of data bit i
                rx[i] = tx;           // LSB first
            end
            #(BIT_NS);                // middle of the stop bit
            if (tx !== 1'b1) begin
                $display("FAIL: stop bit not high");
                errors = errors + 1;
            end
            if (rx !== expected) begin
                $display("FAIL: received %h, expected %h", rx, expected);
                errors = errors + 1;
            end
        end
    endtask

    // Drive one transmission.
    task send(input [7:0] value);
        begin
            @(posedge clk); #1;
            data  = value;
            start = 1'b1;
            @(posedge clk); #1;
            start = 1'b0;
        end
    endtask

    initial begin
        $dumpfile("uart_tx.vcd");
        $dumpvars(0, tb_uart_tx);

        repeat (2) @(posedge clk); #1;
        rst = 1'b0;

        if (tx !== 1'b1) begin
            $display("FAIL: line must idle high");
            errors = errors + 1;
        end

        // send three bytes; the receiver task checks each frame
        fork
            begin
                send(8'hA5);
                wait (!busy);
                send(8'h3C);
                wait (!busy);
                send(8'h00);   // all zeros: stop bit still must be 1
                wait (!busy);
            end
            begin
                recv_and_check(8'hA5);
                recv_and_check(8'h3C);
                recv_and_check(8'h00);
            end
        join

        repeat (5) @(posedge clk);
        if (busy !== 1'b0) begin
            $display("FAIL: busy stuck high after frames");
            errors = errors + 1;
        end

        if (errors == 0) $display("ALL TESTS PASSED");
        else             $display("TEST FAILED: %0d errors", errors);
        $finish;
    end

endmodule
