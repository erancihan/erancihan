// systolic.v — an N x N weight-stationary systolic array: the heart of a TPU.
//
// Computes C = A x W for N x N int8 matrices, W preloaded, A streamed in.
//
//        w_col[0]   w_col[1]  ...          (weights enter here, load phase)
//           |          |
//   a_row[0]-> [PE00]->[PE01]-> ...        PE(r,c) holds W[r][c]
//           |          |
//   a_row[1]-> [PE10]->[PE11]-> ...
//           |          |
//           v          v
//        c_col[0]   c_col[1]               (results drip out the bottom)
//
// Row r of the activations is fed SKEWED by r cycles (the testbench does
// this); each result C[i][c] then appears at the bottom of column c at
// cycle i + c + N. No control logic, no addressing — data marches in
// lockstep and the answers fall out. That is the whole trick, and it is
// why matmul hardware can be so dense: N*N multipliers, zero routing
// decisions per cycle.
//
// Ports are flattened because Verilog-2005 does not allow array ports;
// lane s uses bits [8*s +: 8] (or [32*s +: 32] for sums).
module systolic #(
    parameter N = 4
) (
    input  wire              clk,
    input  wire              rst,
    input  wire              load_w,               // shift weight rows in
    input  wire [8*N-1:0]    w_col,                // weights, one per column
    input  wire [8*N-1:0]    a_row,                // activations, one per row
    output wire [32*N-1:0]   c_col                 // partial-sum outputs, bottom
);

    // internal meshes: [row][col] wiring between PEs
    wire signed [7:0]  a_wire    [0:N-1][0:N];     // horizontal (west->east)
    wire signed [7:0]  w_wire    [0:N][0:N-1];     // vertical, load phase
    wire signed [31:0] psum_wire [0:N][0:N-1];     // vertical (north->south)

    genvar r, c;
    generate
        for (r = 0; r < N; r = r + 1) begin : g_row
            // west edge: feed activations in
            assign a_wire[r][0] = a_row[8*r +: 8];
        end
        for (c = 0; c < N; c = c + 1) begin : g_col
            // north edge: weights in (load phase), zero partial sums
            assign w_wire[0][c]    = w_col[8*c +: 8];
            assign psum_wire[0][c] = 32'sd0;
            // south edge: results out
            assign c_col[32*c +: 32] = psum_wire[N][c];
        end

        for (r = 0; r < N; r = r + 1) begin : g_r
            for (c = 0; c < N; c = c + 1) begin : g_c
                pe u_pe (
                    .clk     (clk),
                    .rst     (rst),
                    .load_w  (load_w),
                    .a_in    (a_wire[r][c]),
                    .w_in    (w_wire[r][c]),
                    .psum_in (psum_wire[r][c]),
                    .a_out   (a_wire[r][c+1]),
                    .w_out   (w_wire[r+1][c]),
                    .psum_out(psum_wire[r+1][c])
                );
            end
        end
    endgenerate

endmodule
