// ram_sync.v — a single-port RAM with a SYNCHRONOUS read.
//
// This exact coding pattern is what FPGA synthesis tools recognise and map
// onto block RAM (BRAM). The defining feature is that `rdata` comes out of
// a register: you present an address on one clock edge and get the data
// after the NEXT edge. That one-cycle read latency is the price of dense,
// fast on-chip memory — and it is why our single-cycle CPU in step 05
// deliberately uses combinational-read memory instead.
//
// This is "read-first" (or "read-old-data") behaviour: when you read and
// write the same address in the same cycle, you get the OLD value.
module ram_sync #(
    parameter ADDR_W = 8,
    parameter DATA_W = 32
) (
    input  wire              clk,
    input  wire              we,
    input  wire [ADDR_W-1:0] addr,
    input  wire [DATA_W-1:0] wdata,
    output reg  [DATA_W-1:0] rdata
);

    reg [DATA_W-1:0] mem [0:(1 << ADDR_W) - 1];

    always @(posedge clk) begin
        if (we)
            mem[addr] <= wdata;
        rdata <= mem[addr];
    end

endmodule
