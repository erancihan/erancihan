// tb_memory.v — one testbench exercising all three memory primitives.
//
// The FIFO test uses the most important verification idea in this guide:
// a GOLDEN MODEL. The testbench keeps its own software queue (an array and
// two indices) and pushes/pops randomly on both, checking that the hardware
// FIFO always agrees with it.
`timescale 1ns/1ps

module tb_memory;

    reg clk = 1'b0;
    always #5 clk = ~clk;

    integer errors = 0;

    // ================================================================ regfile
    reg         rf_we;
    reg  [4:0]  rf_waddr, rf_raddr1, rf_raddr2;
    reg  [31:0] rf_wdata;
    wire [31:0] rf_rdata1, rf_rdata2;

    regfile u_regfile (
        .clk(clk), .we(rf_we), .waddr(rf_waddr), .wdata(rf_wdata),
        .raddr1(rf_raddr1), .rdata1(rf_rdata1),
        .raddr2(rf_raddr2), .rdata2(rf_rdata2)
    );

    // ================================================================ ram
    reg         ram_we;
    reg  [7:0]  ram_addr;
    reg  [31:0] ram_wdata;
    wire [31:0] ram_rdata;

    ram_sync u_ram (
        .clk(clk), .we(ram_we), .addr(ram_addr),
        .wdata(ram_wdata), .rdata(ram_rdata)
    );

    // ================================================================ fifo
    reg        f_wr, f_rd;
    reg  [7:0] f_wdata;
    wire [7:0] f_rdata;
    wire       f_full, f_empty;
    reg        f_rst;

    fifo_sync #(.WIDTH(8), .DEPTH_LOG2(4)) u_fifo (
        .clk(clk), .rst(f_rst),
        .wr_en(f_wr), .wr_data(f_wdata),
        .rd_en(f_rd), .rd_data(f_rdata),
        .full(f_full), .empty(f_empty)
    );

    task fail(input [255:0] msg);
        begin
            $display("FAIL @%0t: %0s", $time, msg);
            errors = errors + 1;
        end
    endtask

    // golden model for the FIFO
    reg [7:0] model_q [0:1023];
    integer   model_head, model_tail;
    integer   i, pushes, pops;

    initial begin
        $dumpfile("memory.vcd");
        $dumpvars(0, tb_memory);

        rf_we = 0; rf_waddr = 0; rf_wdata = 0; rf_raddr1 = 0; rf_raddr2 = 0;
        ram_we = 0; ram_addr = 0; ram_wdata = 0;
        f_wr = 0; f_rd = 0; f_wdata = 0; f_rst = 1;

        repeat (2) @(posedge clk); #1;
        f_rst = 0;

        // ---------- register file --------------------------------------
        // x0 stays zero even if written
        rf_we = 1; rf_waddr = 0; rf_wdata = 32'hDEAD_BEEF;
        @(posedge clk); #1;
        rf_raddr1 = 0; #1;
        if (rf_rdata1 !== 32'd0) fail("regfile: x0 not zero");

        // write all registers, read back on both ports
        for (i = 1; i < 32; i = i + 1) begin
            rf_waddr = i[4:0]; rf_wdata = 32'h1000_0000 + i;
            @(posedge clk); #1;
        end
        rf_we = 0;
        for (i = 1; i < 32; i = i + 1) begin
            rf_raddr1 = i[4:0];
            rf_raddr2 = i[4:0];
            #1;
            if (rf_rdata1 !== 32'h1000_0000 + i) fail("regfile: port1 mismatch");
            if (rf_rdata2 !== 32'h1000_0000 + i) fail("regfile: port2 mismatch");
        end

        // ---------- synchronous RAM ------------------------------------
        // write three locations
        ram_we = 1;
        ram_addr = 8'd7;   ram_wdata = 32'hCAFE_0007; @(posedge clk); #1;
        ram_addr = 8'd42;  ram_wdata = 32'hCAFE_002A; @(posedge clk); #1;
        ram_addr = 8'd255; ram_wdata = 32'hCAFE_00FF; @(posedge clk); #1;
        ram_we = 0;

        // reads have ONE CYCLE of latency: address now, data after next edge
        ram_addr = 8'd7;   @(posedge clk); #1;
        if (ram_rdata !== 32'hCAFE_0007) fail("ram: readback addr 7");
        ram_addr = 8'd42;  @(posedge clk); #1;
        if (ram_rdata !== 32'hCAFE_002A) fail("ram: readback addr 42");

        // read-during-write to the same address returns the OLD data
        ram_we = 1; ram_addr = 8'd42; ram_wdata = 32'h1234_5678;
        @(posedge clk); #1;
        ram_we = 0;
        if (ram_rdata !== 32'hCAFE_002A) fail("ram: expected read-first (old data)");
        @(posedge clk); #1;
        if (ram_rdata !== 32'h1234_5678) fail("ram: new data after second read");

        // ---------- FIFO: directed -------------------------------------
        if (f_empty !== 1'b1) fail("fifo: should start empty");

        // fill to full (depth 16)
        for (i = 0; i < 16; i = i + 1) begin
            f_wr = 1; f_wdata = 8'h20 + i[7:0];
            @(posedge clk); #1;
        end
        f_wr = 0;
        if (f_full !== 1'b1)  fail("fifo: should be full after 16 writes");
        if (f_empty !== 1'b0) fail("fifo: full and empty at once?");

        // a write while full must be ignored
        f_wr = 1; f_wdata = 8'hEE; @(posedge clk); #1; f_wr = 0;

        // drain and check order
        for (i = 0; i < 16; i = i + 1) begin
            if (f_rdata !== 8'h20 + i[7:0]) fail("fifo: pop order wrong");
            f_rd = 1; @(posedge clk); #1; f_rd = 0;
        end
        if (f_empty !== 1'b1) fail("fifo: should be empty after draining");

        // a read while empty must be ignored (pointers unchanged)
        f_rd = 1; @(posedge clk); #1; f_rd = 0;
        if (f_empty !== 1'b1) fail("fifo: underflow moved pointers");

        // ---------- FIFO: randomized against the golden model ----------
        model_head = 0; model_tail = 0;
        pushes = 0; pops = 0;
        for (i = 0; i < 2000; i = i + 1) begin
            // decide this cycle's actions
            f_wr    = $random;               // 50% push attempt
            f_rd    = $random;               // 50% pop attempt
            f_wdata = $random;

            // mirror into the golden model using the DUT's own full/empty
            #1;
            if (f_wr && !f_full) begin
                model_q[model_tail % 1024] = f_wdata;
                model_tail = model_tail + 1;
                pushes = pushes + 1;
            end
            if (f_rd && !f_empty) begin
                if (f_rdata !== model_q[model_head % 1024])
                    fail("fifo: data mismatch vs golden model");
                model_head = model_head + 1;
                pops = pops + 1;
            end
            @(posedge clk); #1;

            // occupancy implied by the model must match full/empty flags
            if ((model_tail - model_head == 0)  && !f_empty) fail("fifo: empty flag wrong");
            if ((model_tail - model_head == 16) && !f_full)  fail("fifo: full flag wrong");
        end
        f_wr = 0; f_rd = 0;
        $display("fifo random test: %0d pushes, %0d pops", pushes, pops);

        if (errors == 0) $display("ALL TESTS PASSED");
        else             $display("TEST FAILED: %0d errors", errors);
        $finish;
    end

endmodule
