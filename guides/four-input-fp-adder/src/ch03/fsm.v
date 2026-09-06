`timescale 1ns/1ps
`default_nettype none

// One machine - wait for `go`, be busy for two cycles, pulse `done` - written
// in the three standard styles, plus a small Moore/Mealy comparison. All three
// styles produce identical state sequences and identical output waveforms.
// The choice is about readability and about where the outputs are registered.

// One block: state and outputs all assigned with <= in a single clocked block.
// Outputs are registered for free, but each one has to be written in the state
// BEFORE the state it belongs to, which is what makes this style hard to read.
module fsm_one_block
  (input  wire       clk,
   input  wire       rst_n,
   input  wire       go,
   output reg        busy,
   output reg        done,
   output wire [1:0] state);

  localparam [1:0] S_IDLE = 2'd0,
                   S_RUN1 = 2'd1,
                   S_RUN2 = 2'd2,
                   S_DONE = 2'd3;

  reg [1:0] s_state;

  always @(posedge clk)
    if (!rst_n) begin
      s_state <= S_IDLE;
      busy    <= 1'b0;
      done    <= 1'b0;
    end
    else begin
      busy <= 1'b0;                       // default: outputs deasserted
      done <= 1'b0;
      case (s_state)
        S_IDLE:  if (go) begin s_state <= S_RUN1; busy <= 1'b1; end
        S_RUN1:  begin s_state <= S_RUN2; busy <= 1'b1; end
        S_RUN2:  begin s_state <= S_DONE; done <= 1'b1; end
        S_DONE:  s_state <= S_IDLE;
        default: s_state <= S_IDLE;
      endcase
    end

  assign state = s_state;

endmodule

// Two blocks: a clocked state register and a combinational next-state and
// output decode. This is the default to reach for. It reads like the state
// diagram, and the outputs line up with the state they are named for.
module fsm_two_block
  (input  wire       clk,
   input  wire       rst_n,
   input  wire       go,
   output reg        busy,
   output reg        done,
   output wire [1:0] state);

  localparam [1:0] S_IDLE = 2'd0,
                   S_RUN1 = 2'd1,
                   S_RUN2 = 2'd2,
                   S_DONE = 2'd3;

  reg [1:0] s_state, s_next;

  always @(posedge clk)
    if (!rst_n) s_state <= S_IDLE;
    else        s_state <= s_next;

  always @(*) begin
    s_next = s_state;                     // default: hold state
    busy   = 1'b0;                        // default: outputs deasserted
    done   = 1'b0;
    case (s_state)
      S_IDLE:  if (go) s_next = S_RUN1;
      S_RUN1:  begin busy = 1'b1; s_next = S_RUN2; end
      S_RUN2:  begin busy = 1'b1; s_next = S_DONE; end
      S_DONE:  begin done = 1'b1; s_next = S_IDLE; end
      default: s_next = S_IDLE;
    endcase
  end

  assign state = s_state;

endmodule

// Three blocks: state register, next-state decode, and a separate output
// decode that is registered. Decoding s_next rather than s_state is what
// cancels the register's one-cycle delay, so the outputs are both glitch-free
// and in the right cycle.
module fsm_three_block
  (input  wire       clk,
   input  wire       rst_n,
   input  wire       go,
   output reg        busy,
   output reg        done,
   output wire [1:0] state);

  localparam [1:0] S_IDLE = 2'd0,
                   S_RUN1 = 2'd1,
                   S_RUN2 = 2'd2,
                   S_DONE = 2'd3;

  reg [1:0] s_state, s_next;
  reg       busy_c, done_c;

  always @(posedge clk)
    if (!rst_n) s_state <= S_IDLE;
    else        s_state <= s_next;

  always @(*) begin
    s_next = s_state;
    case (s_state)
      S_IDLE:  if (go) s_next = S_RUN1;
      S_RUN1:  s_next = S_RUN2;
      S_RUN2:  s_next = S_DONE;
      S_DONE:  s_next = S_IDLE;
      default: s_next = S_IDLE;
    endcase
  end

  always @(*) begin
    busy_c = 1'b0;                        // unconditional defaults: these two
    done_c = 1'b0;                        // lines are what make the empty
    case (s_next)                         // `default:` arm below safe. On its
      S_RUN1, S_RUN2: busy_c = 1'b1;      // own, `default: ;` assigns nothing
      S_DONE:         done_c = 1'b1;      // and cures no latch at all.
      default:        ;
    endcase
  end

  always @(posedge clk)
    if (!rst_n) begin
      busy <= 1'b0;
      done <= 1'b0;
    end
    else begin
      busy <= busy_c;
      done <= done_c;
    end

  assign state = s_state;

endmodule

// A combinational Mealy output against the same term registered. mealy_y is a
// function of state AND the current input, so it is a wire from x straight to
// the output. reg_y is that term through a flop, so it can only change just
// after a clock edge. Note what reg_y is NOT: a Moore output. A Moore output
// is a function of state alone, and reg_y is a function of the previous state
// and the previous input - a registered Mealy. It buys Moore's stability, not
// Moore's definition.
module mealy_registered
  (input  wire clk,
   input  wire rst_n,
   input  wire x,
   output wire mealy_y,
   output reg  reg_y);

  reg st;

  always @(posedge clk)
    if (!rst_n) st <= 1'b0;
    else        st <= st | x;

  assign mealy_y = st & x;

  always @(posedge clk)
    if (!rst_n) reg_y <= 1'b0;
    else        reg_y <= st & x;

endmodule

`default_nettype wire
