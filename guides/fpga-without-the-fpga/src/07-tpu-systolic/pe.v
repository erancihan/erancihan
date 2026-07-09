// pe.v — one processing element (PE) of a weight-stationary systolic array.
//
// The entire "TPU" idea fits in this one tiny module:
//   * it HOLDS one weight (stationary — loaded once, reused every cycle),
//   * activations flow THROUGH it, west -> east (a_in -> a_out),
//   * partial sums flow THROUGH it, north -> south, picking up
//     `a_in * w` on the way (multiply-accumulate).
//
// int8 operands with an int32 accumulator — the same choice the original
// Google TPU made, and why quantization exists (chapter 10).
//
// During weight loading (`load_w`), the weight registers of a column form
// a vertical shift register: weights enter at the top and shift down one
// row per cycle.
module pe (
    input  wire               clk,
    input  wire               rst,
    input  wire               load_w,   // 1: shift weights down; 0: compute
    input  wire signed [7:0]  a_in,     // activation from the west
    input  wire signed [7:0]  w_in,     // weight from the north (load phase)
    input  wire signed [31:0] psum_in,  // partial sum from the north
    output reg  signed [7:0]  a_out,    // to the east neighbour
    output wire signed [7:0]  w_out,    // to the south neighbour (load phase)
    output reg  signed [31:0] psum_out  // to the south neighbour
);

    reg signed [7:0] w;                 // the stationary weight
    assign w_out = w;

    always @(posedge clk) begin
        if (rst) begin
            w        <= 8'sd0;
            a_out    <= 8'sd0;
            psum_out <= 32'sd0;
        end else begin
            if (load_w)
                w <= w_in;              // column-wise weight shift
            a_out    <= a_in;           // forward the activation east
            psum_out <= psum_in + a_in * w;   // MAC, forward south
        end
    end

endmodule
