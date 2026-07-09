// regfile.v — a RISC-V style register file: 32 registers of 32 bits,
// two combinational ("asynchronous") read ports, one synchronous write port.
//
// x0 is hardwired to zero, exactly as RV32I requires — we simply never
// write it and force its reads to 0.
//
// On an FPGA this maps to LUT-RAM / distributed RAM (or plain flip-flops),
// NOT block RAM, because block RAM cannot do combinational reads.
// Chapter 06 explains that trade-off.
module regfile (
    input  wire        clk,
    input  wire        we,
    input  wire [4:0]  waddr,
    input  wire [31:0] wdata,
    input  wire [4:0]  raddr1,
    output wire [31:0] rdata1,
    input  wire [4:0]  raddr2,
    output wire [31:0] rdata2
);

    reg [31:0] regs [0:31];

    assign rdata1 = (raddr1 == 5'd0) ? 32'd0 : regs[raddr1];
    assign rdata2 = (raddr2 == 5'd0) ? 32'd0 : regs[raddr2];

    always @(posedge clk)
        if (we && waddr != 5'd0)
            regs[waddr] <= wdata;

    // Simulation nicety: start from a known state instead of X.
    // (FPGAs honour initial values too; ASICs need an explicit reset.)
    integer i;
    initial for (i = 0; i < 32; i = i + 1) regs[i] = 32'd0;

endmodule
