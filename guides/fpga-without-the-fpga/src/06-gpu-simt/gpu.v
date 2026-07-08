// gpu.v — a minimal SIMT ("single instruction, multiple threads") core:
// the essence of a GPU in ~150 lines.
//
// What makes it a GPU rather than a small CPU:
//   * ONE instruction stream (one PC, one fetch/decode),
//   * MANY execution lanes (LANES of them), each with its own register
//     file, all executing the SAME instruction on DIFFERENT data,
//   * a LANE ID register so each lane can compute "which element is mine",
//   * a grid-stride loop in the kernel so 4 lanes can cover N elements.
//
// This is exactly the CUDA mental model: `threadIdx` -> LDID, and the
// kernel below is `for (i = tid; i < N; i += nthreads) c[i] = a[i] + b[i]`.
//
// Deliberate simplifications (each is a real GPU topic — see chapter 09):
//   * branches must be UNIFORM (all lanes agree). Real GPUs let lanes
//     diverge and handle it with execution masks + a reconvergence stack.
//   * data memory has a port per lane. Real GPUs coalesce neighbouring
//     addresses into wide transactions and serialise conflicts.
//   * one instruction per cycle, no pipelining, no multiple warps hiding
//     memory latency behind each other.
//
// Host model (mirrors CUDA): the host writes input arrays into device
// memory through the host port, pulses `start`, waits for `done`, reads
// results back. cudaMemcpy / kernel launch / cudaMemcpy.
//
// ISA: 32-bit words, fields {op[31:24], a[23:16], b[15:8], c[7:0]}.
//   NOP                      LDID Ra        (Ra = lane id)
//   LDI  Ra, imm8            ADD/SUB/MUL Ra, Rb, Rc
//   LD   Ra, Rb              (Ra = mem[Rb])
//   ST   Ra, Rb              (mem[Rb] = Ra)
//   SLT  Ra, Rb, Rc          (Ra = Rb < Rc, unsigned)
//   BNZ  Ra, target          (if Ra != 0: pc = target; must be uniform)
//   HALT
module gpu #(
    parameter LANES     = 4,
    parameter MEM_WORDS = 256
) (
    input  wire        clk,
    input  wire        rst,        // synchronous, active-high

    // kernel launch handshake
    input  wire        start,      // pulse to launch at pc = 0
    output reg         done,

    // host port into device memory (use while the kernel is not running)
    input  wire        host_we,
    input  wire [31:0] host_addr,  // word address
    input  wire [31:0] host_wdata,
    output wire [31:0] host_rdata
);

    localparam [7:0]
        OP_NOP  = 8'd0,
        OP_LDID = 8'd1,
        OP_LDI  = 8'd2,
        OP_ADD  = 8'd3,
        OP_SUB  = 8'd4,
        OP_MUL  = 8'd5,
        OP_LD   = 8'd6,
        OP_ST   = 8'd7,
        OP_SLT  = 8'd8,
        OP_BNZ  = 8'd9,
        OP_HALT = 8'd255;

    // ------------------------------------------------ instruction memory
    reg [31:0] prog [0:255];
    initial $readmemh("kernel.hex", prog);

    reg  [7:0]  pc;
    wire [31:0] instr = prog[pc];
    wire [7:0]  op = instr[31:24];
    wire [2:0]  fa = instr[18:16];   // destination / store-data register
    wire [2:0]  fb = instr[10:8];    // first source register
    wire [7:0]  fc = instr[7:0];     // second source register, imm8, or target

    // ------------------------------------------------------ device memory
    reg [31:0] mem [0:MEM_WORDS-1];
    assign host_rdata = mem[host_addr];
    always @(posedge clk)
        if (host_we) mem[host_addr] <= host_wdata;

    // ------------------------------------- per-lane architectural state
    // 8 registers per lane. rf[lane][reg].
    reg [31:0] rf [0:LANES-1][0:7];

    reg running;

    // branch decision comes from lane 0; simulation-only check below
    // verifies the other lanes agree (the "uniform branch" rule)
    wire branch_taken = (rf[0][fa] != 32'd0);

    integer l;
    always @(posedge clk) begin
        if (rst) begin
            running <= 1'b0;
            done    <= 1'b0;
            pc      <= 8'd0;
        end else if (!running) begin
            if (start) begin
                running <= 1'b1;
                done    <= 1'b0;
                pc      <= 8'd0;
            end
        end else begin
            case (op)
                OP_HALT: begin
                    running <= 1'b0;
                    done    <= 1'b1;
                end

                OP_BNZ: pc <= branch_taken ? fc : pc + 8'd1;

                default: begin
                    // the SIMT heart: every lane executes this instruction
                    for (l = 0; l < LANES; l = l + 1) begin
                        case (op)
                            OP_LDID: rf[l][fa] <= l;
                            OP_LDI:  rf[l][fa] <= {24'd0, fc};
                            OP_ADD:  rf[l][fa] <= rf[l][fb] + rf[l][fc[2:0]];
                            OP_SUB:  rf[l][fa] <= rf[l][fb] - rf[l][fc[2:0]];
                            OP_MUL:  rf[l][fa] <= rf[l][fb] * rf[l][fc[2:0]];
                            OP_SLT:  rf[l][fa] <= (rf[l][fb] < rf[l][fc[2:0]])
                                                  ? 32'd1 : 32'd0;
                            OP_LD:   rf[l][fa] <= mem[rf[l][fb]];
                            // on a write conflict the highest lane wins;
                            // real GPUs serialise these (chapter 09)
                            OP_ST:   mem[rf[l][fb]] <= rf[l][fa];
                            default: ;
                        endcase
                    end
                    pc <= pc + 8'd1;
                end
            endcase
        end
    end

    // ------------------------------------------- simulation-only checks
    // The uniform-branch rule: this core has ONE pc, so a branch where
    // lanes disagree is a programming error here. Real GPUs mask lanes
    // off and run both paths instead.
    always @(posedge clk) begin
        if (running && op == OP_BNZ)
            for (l = 1; l < LANES; l = l + 1)
                if ((rf[l][fa] != 32'd0) != branch_taken)
                    $display("WARNING @%0t: divergent branch at pc=%0d (lane %0d disagrees with lane 0)",
                             $time, pc, l);
    end

endmodule
