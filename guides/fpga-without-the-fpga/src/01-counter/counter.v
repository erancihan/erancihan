// counter.v — the "hello, world" of hardware.
//
// A WIDTH-bit counter with a synchronous, active-high reset and an enable.
// Everything interesting about sequential logic is already here:
//   * state lives in flip-flops (the `count` register),
//   * state only changes on the rising edge of `clk`,
//   * `<=` (non-blocking assignment) describes "all flops update together".
module counter #(
    parameter WIDTH = 8
) (
    input  wire             clk,
    input  wire             rst,   // synchronous, active-high
    input  wire             en,
    output reg [WIDTH-1:0]  count
);

    always @(posedge clk) begin
        if (rst)
            count <= {WIDTH{1'b0}};
        else if (en)
            count <= count + 1'b1;
    end

endmodule
