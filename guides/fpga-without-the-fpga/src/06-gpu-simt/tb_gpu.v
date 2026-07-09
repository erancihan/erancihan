// tb_gpu.v — plays the role of the HOST, exactly like a CUDA program:
//
//   1. copy inputs to device memory   (cudaMemcpy host->device)
//   2. launch the kernel              (<<<1, 4>>> ... start pulse)
//   3. wait for completion            (cudaDeviceSynchronize ... done)
//   4. copy results back and check    (cudaMemcpy device->host)
`timescale 1ns/1ps

module tb_gpu;

    localparam N = 16;   // elements; the kernel hard-codes this too

    reg clk = 1'b0;
    reg rst = 1'b1;
    always #5 clk = ~clk;

    reg         start = 1'b0;
    wire        done;
    reg         host_we = 1'b0;
    reg  [31:0] host_addr = 0, host_wdata = 0;
    wire [31:0] host_rdata;

    gpu #(.LANES(4), .MEM_WORDS(256)) dut (
        .clk(clk), .rst(rst),
        .start(start), .done(done),
        .host_we(host_we), .host_addr(host_addr),
        .host_wdata(host_wdata), .host_rdata(host_rdata)
    );

    integer errors = 0;

    task host_write(input [31:0] addr, input [31:0] value);
        begin
            @(posedge clk); #1;
            host_we = 1'b1; host_addr = addr; host_wdata = value;
            @(posedge clk); #1;
            host_we = 1'b0;
        end
    endtask

    task host_check(input [31:0] addr, input [31:0] expected);
        begin
            @(posedge clk); #1;
            host_addr = addr; #1;
            if (host_rdata !== expected) begin
                $display("FAIL: mem[%0d] = %0d, expected %0d",
                         addr, host_rdata, expected);
                errors = errors + 1;
            end
        end
    endtask

    integer i, cycles;
    reg [31:0] a_arr [0:N-1];
    reg [31:0] b_arr [0:N-1];

    initial begin
        $dumpfile("gpu.vcd");
        $dumpvars(0, tb_gpu);

        repeat (2) @(posedge clk); #1;
        rst = 1'b0;

        // 1. host -> device: A at words 0..15, B at words 16..31
        for (i = 0; i < N; i = i + 1) begin
            a_arr[i] = 3 * i + 1;
            b_arr[i] = 1000 - 7 * i;
            host_write(i,      a_arr[i]);
            host_write(N + i,  b_arr[i]);
        end

        // 2. launch
        @(posedge clk); #1;
        start = 1'b1;
        @(posedge clk); #1;
        start = 1'b0;

        // 3. wait for the kernel, with a watchdog
        cycles = 0;
        while (!done && cycles < 1000) begin
            @(posedge clk);
            cycles = cycles + 1;
        end
        if (!done) begin
            $display("FAIL: kernel did not finish");
            errors = errors + 1;
        end else
            $display("kernel finished in %0d cycles (16 adds on 4 lanes)", cycles);

        // 4. device -> host: C at words 32..47
        for (i = 0; i < N; i = i + 1)
            host_check(32 + i, a_arr[i] + b_arr[i]);

        if (errors == 0) $display("ALL TESTS PASSED");
        else             $display("TEST FAILED: %0d errors", errors);
        $finish;
    end

endmodule
