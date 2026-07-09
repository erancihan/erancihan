// tb_systolic.v — streams matrices through the systolic array and checks
// C = A x W against a golden matmul computed in plain procedural code.
//
// The testbench owns all the choreography the array itself doesn't have:
//   * weight loading: W's rows are shifted in bottom-row-first, so that
//     after N cycles row r's weights have landed in PE row r;
//   * input skew: activation row r starts flowing r cycles after row 0
//     (the classic systolic "parallelogram" data shape);
//   * output timing: C[i][c] appears at the bottom of column c exactly
//     at cycle i + c + N after streaming starts.
//
// Runs several random test matrices, including signed int8 extremes.
`timescale 1ns/1ps

module tb_systolic;

    localparam N = 4;

    reg clk = 1'b0;
    reg rst = 1'b1;
    always #5 clk = ~clk;

    reg               load_w = 1'b0;
    reg  [8*N-1:0]    w_col = 0;
    reg  [8*N-1:0]    a_row = 0;
    wire [32*N-1:0]   c_col;

    systolic #(.N(N)) dut (
        .clk(clk), .rst(rst),
        .load_w(load_w), .w_col(w_col),
        .a_row(a_row), .c_col(c_col)
    );

    integer errors = 0;

    // test matrices and golden result (plain 2-D arrays of integers)
    integer A [0:N-1][0:N-1];
    integer W [0:N-1][0:N-1];
    integer C_gold [0:N-1][0:N-1];
    integer C_hw [0:N-1][0:N-1];

    integer r, c, k, t, test;

    // sign-extend an integer to 8 bits worth of value (-128..127)
    function integer to_int8(input integer v);
        begin
            to_int8 = v & 32'hFF;
            if (to_int8 >= 128) to_int8 = to_int8 - 256;
        end
    endfunction

    task run_one_matmul;
        begin
            // ---- golden model --------------------------------------
            for (r = 0; r < N; r = r + 1)
                for (c = 0; c < N; c = c + 1) begin
                    C_gold[r][c] = 0;
                    for (k = 0; k < N; k = k + 1)
                        C_gold[r][c] = C_gold[r][c] + A[r][k] * W[k][c];
                end

            // ---- phase 1: load weights, bottom row first ------------
            load_w = 1'b1;
            for (t = N - 1; t >= 0; t = t - 1) begin
                for (c = 0; c < N; c = c + 1)
                    w_col[8*c +: 8] = W[t][c];   // truncates to 8 bits
                @(posedge clk); #1;
            end
            load_w = 1'b0;

            // ---- phase 2: stream activations skewed, collect results
            // cycle t (from 0): row r input is A[t-r][r] while 0 <= t-r < N.
            // C[i][c] appears on c_col[c] at cycle i + c + N, sampled
            // just after that edge.
            for (t = 0; t < 3*N; t = t + 1) begin
                for (r = 0; r < N; r = r + 1)
                    if (t >= r && t - r < N)
                        a_row[8*r +: 8] = A[t-r][r];   // truncates to 8 bits
                    else
                        a_row[8*r +: 8] = 8'd0;
                @(posedge clk); #1;
                // t is now "cycles elapsed since streaming began" - 1;
                // sample outputs scheduled for elapsed = t+1... simpler:
                // check inside the same loop using the formula below.
                for (c = 0; c < N; c = c + 1)
                    if (t + 1 - c - N >= 0 && t + 1 - c - N < N)
                        C_hw[t + 1 - c - N][c] = $signed(c_col[32*c +: 32]);
            end
            a_row = 0;

            // ---- compare -------------------------------------------
            for (r = 0; r < N; r = r + 1)
                for (c = 0; c < N; c = c + 1)
                    if (C_hw[r][c] !== C_gold[r][c]) begin
                        $display("FAIL: C[%0d][%0d] = %0d, expected %0d",
                                 r, c, C_hw[r][c], C_gold[r][c]);
                        errors = errors + 1;
                    end
        end
    endtask

    initial begin
        $dumpfile("systolic.vcd");
        $dumpvars(0, tb_systolic);

        repeat (2) @(posedge clk); #1;
        rst = 1'b0;
        @(posedge clk); #1;

        // ---- test 1: identity — C must equal A ----------------------
        for (r = 0; r < N; r = r + 1)
            for (c = 0; c < N; c = c + 1) begin
                A[r][c] = to_int8(11 * r + 3 * c - 20);
                W[r][c] = (r == c) ? 1 : 0;
            end
        run_one_matmul;

        // ---- test 2: int8 extremes ----------------------------------
        for (r = 0; r < N; r = r + 1)
            for (c = 0; c < N; c = c + 1) begin
                A[r][c] = ((r + c) % 2 == 0) ? -128 : 127;
                W[r][c] = ((r * c) % 3 == 0) ? 127 : -128;
            end
        run_one_matmul;

        // ---- tests 3..7: random signed int8 matrices ----------------
        for (test = 0; test < 5; test = test + 1) begin
            for (r = 0; r < N; r = r + 1)
                for (c = 0; c < N; c = c + 1) begin
                    A[r][c] = to_int8($random);
                    W[r][c] = to_int8($random);
                end
            run_one_matmul;
        end

        if (errors == 0) $display("ALL TESTS PASSED");
        else             $display("TEST FAILED: %0d errors", errors);
        $finish;
    end

endmodule
