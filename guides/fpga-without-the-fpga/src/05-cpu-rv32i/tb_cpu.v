// tb_cpu.v — a tiny "SoC" around the CPU: instruction ROM + data RAM,
// both with combinational reads (see cpu.v for why), plus the checks.
//
// Flow: load program.hex into the instruction memory, release reset, let
// the CPU run until it raises `halted` (EBREAK), then compare the result
// words the program wrote against the values test.s promises.
`timescale 1ns/1ps

module tb_cpu;

    reg clk = 1'b0;
    reg rst = 1'b1;
    always #5 clk = ~clk;

    wire [31:0] imem_addr, dmem_addr, dmem_wdata;
    wire [3:0]  dmem_wstrb;
    wire        halted;

    // 16 KiB each, word-organised
    reg [31:0] imem [0:4095];
    reg [31:0] dmem [0:4095];

    wire [31:0] imem_rdata = imem[imem_addr[13:2]];
    wire [31:0] dmem_rdata = dmem[dmem_addr[13:2]];

    // byte-lane writes, exactly what dmem_wstrb encodes
    always @(posedge clk) begin
        if (dmem_wstrb[0]) dmem[dmem_addr[13:2]][7:0]   <= dmem_wdata[7:0];
        if (dmem_wstrb[1]) dmem[dmem_addr[13:2]][15:8]  <= dmem_wdata[15:8];
        if (dmem_wstrb[2]) dmem[dmem_addr[13:2]][23:16] <= dmem_wdata[23:16];
        if (dmem_wstrb[3]) dmem[dmem_addr[13:2]][31:24] <= dmem_wdata[31:24];
    end

    cpu dut (
        .clk(clk), .rst(rst),
        .imem_addr(imem_addr), .imem_rdata(imem_rdata),
        .dmem_addr(dmem_addr), .dmem_wdata(dmem_wdata),
        .dmem_wstrb(dmem_wstrb), .dmem_rdata(dmem_rdata),
        .halted(halted)
    );

    integer errors = 0;

    task check_word(input [31:0] byte_addr, input [31:0] expected);
        begin
            if (dmem[byte_addr[13:2]] !== expected) begin
                $display("FAIL: mem[0x%03h] = 0x%08h, expected 0x%08h",
                         byte_addr, dmem[byte_addr[13:2]], expected);
                errors = errors + 1;
            end else
                $display("  ok: mem[0x%03h] = 0x%08h", byte_addr, expected);
        end
    endtask

    integer i, cycles;

    initial begin
        $dumpfile("cpu.vcd");
        $dumpvars(0, tb_cpu);

        for (i = 0; i < 4096; i = i + 1) begin
            imem[i] = 32'd0;
            dmem[i] = 32'd0;
        end
        $readmemh("program.hex", imem);

        repeat (2) @(posedge clk); #1;
        rst = 1'b0;

        // run until EBREAK, with a watchdog so a broken CPU can't hang us
        cycles = 0;
        while (!halted && cycles < 10000) begin
            @(posedge clk); #1;
            cycles = cycles + 1;
        end

        if (!halted) begin
            $display("FAIL: CPU did not halt within %0d cycles", cycles);
            errors = errors + 1;
        end else
            $display("CPU halted after %0d cycles", cycles);

        // the contract written at the top of test.s
        check_word(32'h100, 32'd55);        // fib(10)
        check_word(32'h104, 32'h0000007A);  // sb
        check_word(32'h108, 32'h0000FFFE);  // sh
        check_word(32'h10C, 32'h00000078);  // lbu + lh
        check_word(32'h110, 32'd99);        // jal/jalr call
        check_word(32'h114, 32'd32);        // slti + sll
        check_word(32'h118, 32'hFFFFFFFC);  // srai
        check_word(32'h11C, 32'h000ABCDE);  // lui + srli
        check_word(32'h120, 32'd1);         // branch gauntlet

        if (errors == 0) $display("ALL TESTS PASSED");
        else             $display("TEST FAILED: %0d errors", errors);
        $finish;
    end

endmodule
