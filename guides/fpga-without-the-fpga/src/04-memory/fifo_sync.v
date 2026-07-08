// fifo_sync.v — a synchronous (single-clock) FIFO queue.
//
// FIFOs are the duct tape of digital design: they sit between any producer
// and consumer that don't run in lockstep (CPU <-> UART, pixel pipeline <->
// memory controller, ...).
//
// The classic implementation trick: read/write pointers carry ONE EXTRA
// bit. Pointers equal  -> empty. Pointers equal except for the extra
// (wrap-count) bit -> full. No separate element counter needed.
//
// This is a "first-word fall-through" FIFO: when non-empty, `rd_data`
// already shows the head element; `rd_en` just pops it.
module fifo_sync #(
    parameter WIDTH      = 8,
    parameter DEPTH_LOG2 = 4               // depth = 2**DEPTH_LOG2
) (
    input  wire             clk,
    input  wire             rst,           // synchronous, active-high
    input  wire             wr_en,
    input  wire [WIDTH-1:0] wr_data,
    input  wire             rd_en,
    output wire [WIDTH-1:0] rd_data,
    output wire             full,
    output wire             empty
);

    localparam DEPTH = 1 << DEPTH_LOG2;

    reg [WIDTH-1:0] mem [0:DEPTH-1];

    reg [DEPTH_LOG2:0] wptr;   // one extra bit on purpose
    reg [DEPTH_LOG2:0] rptr;

    assign empty = (wptr == rptr);
    assign full  = (wptr[DEPTH_LOG2]     != rptr[DEPTH_LOG2]) &&
                   (wptr[DEPTH_LOG2-1:0] == rptr[DEPTH_LOG2-1:0]);

    assign rd_data = mem[rptr[DEPTH_LOG2-1:0]];

    always @(posedge clk) begin
        if (rst) begin
            wptr <= 0;
            rptr <= 0;
        end else begin
            if (wr_en && !full) begin
                mem[wptr[DEPTH_LOG2-1:0]] <= wr_data;
                wptr <= wptr + 1;
            end
            if (rd_en && !empty)
                rptr <= rptr + 1;
        end
    end

endmodule
