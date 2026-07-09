// uart_tx.v — a UART transmitter, the classic first "real" FSM.
//
// Serial frame (8N1): line idles high, then
//   start bit (0) -> 8 data bits, LSB first -> stop bit (1).
// Each bit lasts CLKS_PER_BIT clock cycles.
//
// This module shows the standard FSM recipe used all through the guide:
//   * one always block holds the state register and datapath registers,
//   * a `case (state)` describes transitions,
//   * counters (baud tick, bit index) live alongside the state.
module uart_tx #(
    parameter CLKS_PER_BIT = 10   // clk_freq / baud_rate; tiny here for fast sim
) (
    input  wire       clk,
    input  wire       rst,        // synchronous, active-high
    input  wire       start,      // pulse high for one cycle with `data` valid
    input  wire [7:0] data,
    output reg        tx,         // the serial line
    output wire       busy
);

    localparam [1:0]
        S_IDLE  = 2'd0,
        S_START = 2'd1,
        S_DATA  = 2'd2,
        S_STOP  = 2'd3;

    reg [1:0]  state;
    reg [15:0] clk_cnt;   // counts clocks within one bit period
    reg [2:0]  bit_idx;   // which of the 8 data bits we are sending
    reg [7:0]  shreg;     // latched copy of `data`

    assign busy = (state != S_IDLE);

    wire bit_done = (clk_cnt == CLKS_PER_BIT - 1);

    always @(posedge clk) begin
        if (rst) begin
            state   <= S_IDLE;
            tx      <= 1'b1;      // idle high
            clk_cnt <= 0;
            bit_idx <= 0;
            shreg   <= 0;
        end else begin
            case (state)
                S_IDLE: begin
                    tx      <= 1'b1;
                    clk_cnt <= 0;
                    bit_idx <= 0;
                    if (start) begin
                        shreg <= data;   // latch NOW; caller may change `data` later
                        state <= S_START;
                    end
                end

                S_START: begin
                    tx <= 1'b0;          // start bit
                    if (bit_done) begin
                        clk_cnt <= 0;
                        state   <= S_DATA;
                    end else
                        clk_cnt <= clk_cnt + 1;
                end

                S_DATA: begin
                    tx <= shreg[bit_idx];  // LSB first
                    if (bit_done) begin
                        clk_cnt <= 0;
                        if (bit_idx == 3'd7) begin
                            bit_idx <= 0;
                            state   <= S_STOP;
                        end else
                            bit_idx <= bit_idx + 1;
                    end else
                        clk_cnt <= clk_cnt + 1;
                end

                S_STOP: begin
                    tx <= 1'b1;          // stop bit
                    if (bit_done) begin
                        clk_cnt <= 0;
                        state   <= S_IDLE;
                    end else
                        clk_cnt <= clk_cnt + 1;
                end

                default: state <= S_IDLE;
            endcase
        end
    end

endmodule
