// cpu.v — a complete single-cycle RV32I CPU in ~250 lines.
//
// Every instruction executes in exactly one clock cycle:
//
//   fetch -> decode -> register read -> ALU -> memory -> write-back
//
// all as one long combinational path, with the PC and the register file
// updated on the clock edge at the end. This is the "Patterson & Hennessy
// chapter 4" machine; chapter 08 of the guide walks through every block
// and then explains how pipelining carves this path into stages.
//
// Supported: full RV32I integer ISA except FENCE (no-op here) and
// CSR instructions. ECALL/EBREAK latch `halted`, which testbenches use
// as "program finished".
//
// Memory interfaces are combinational-read (data valid in the same cycle
// the address is presented). That is what makes single-cycle possible;
// real block RAM has registered reads — see chapters 06 and 08.
module cpu (
    input  wire        clk,
    input  wire        rst,          // synchronous, active-high

    // instruction memory
    output wire [31:0] imem_addr,
    input  wire [31:0] imem_rdata,

    // data memory (byte-addressed; word bus with byte strobes)
    output wire [31:0] dmem_addr,
    output wire [31:0] dmem_wdata,
    output wire [3:0]  dmem_wstrb,   // one bit per byte lane; 0000 = no write
    input  wire [31:0] dmem_rdata,

    output reg         halted        // set by ECALL/EBREAK, never cleared
);

    // ------------------------------------------------------------- fetch
    reg [31:0] pc;
    assign imem_addr = pc;
    wire [31:0] instr = imem_rdata;
    wire [31:0] pc_plus4 = pc + 32'd4;

    // ------------------------------------------------------------ decode
    wire [6:0] opcode = instr[6:0];
    wire [4:0] rd     = instr[11:7];
    wire [2:0] funct3 = instr[14:12];
    wire [4:0] rs1    = instr[19:15];
    wire [4:0] rs2    = instr[24:20];
    wire [6:0] funct7 = instr[31:25];

    // one immediate per instruction format, all sign-extended
    wire [31:0] imm_i = {{20{instr[31]}}, instr[31:20]};
    wire [31:0] imm_s = {{20{instr[31]}}, instr[31:25], instr[11:7]};
    wire [31:0] imm_b = {{19{instr[31]}}, instr[31], instr[7],
                         instr[30:25], instr[11:8], 1'b0};
    wire [31:0] imm_u = {instr[31:12], 12'b0};
    wire [31:0] imm_j = {{11{instr[31]}}, instr[31], instr[19:12],
                         instr[20], instr[30:21], 1'b0};

    localparam [6:0]
        OPC_LUI    = 7'b0110111,
        OPC_AUIPC  = 7'b0010111,
        OPC_JAL    = 7'b1101111,
        OPC_JALR   = 7'b1100111,
        OPC_BRANCH = 7'b1100011,
        OPC_LOAD   = 7'b0000011,
        OPC_STORE  = 7'b0100011,
        OPC_OPIMM  = 7'b0010011,
        OPC_OP     = 7'b0110011,
        OPC_FENCE  = 7'b0001111,
        OPC_SYSTEM = 7'b1110011;

    wire is_op    = (opcode == OPC_OP);
    wire is_store = (opcode == OPC_STORE);

    // ---------------------------------------------------- register file
    reg [31:0] regs [0:31];

    wire [31:0] rs1_val = (rs1 == 5'd0) ? 32'd0 : regs[rs1];
    wire [31:0] rs2_val = (rs2 == 5'd0) ? 32'd0 : regs[rs2];

    integer i;
    initial for (i = 0; i < 32; i = i + 1) regs[i] = 32'd0;

    // ---------------------------------------------------------------- ALU
    // Register-register ops use rs2, register-immediate ops use imm_i.
    wire [31:0] alu_a = rs1_val;
    wire [31:0] alu_b = is_op ? rs2_val : imm_i;
    wire [4:0]  shamt = alu_b[4:0];

    // instr[30] (funct7 bit 5) selects ADD/SUB and SRL/SRA. For OP-IMM
    // arithmetic (ADDI...) that bit is part of the immediate, so it must
    // only be honoured for OP, and for the shift instructions where the
    // spec reserves it.
    // Verilog gotcha: if $signed(alu_a) >>> shamt is written inline in the
    // ternary below, the unsigned other arm makes the WHOLE expression
    // unsigned and the shift silently becomes logical. Computing it on its
    // own signed wire sidesteps that. (Found by the testbench — see the
    // guide's chapter 08 war-story box.)
    wire signed [31:0] sra_result = $signed(alu_a) >>> shamt;

    reg [31:0] alu_out;
    always @* begin
        case (funct3)
            3'b000: alu_out = (is_op && funct7[5]) ? alu_a - alu_b
                                                   : alu_a + alu_b;
            3'b001: alu_out = alu_a << shamt;                          // SLL(I)
            3'b010: alu_out = ($signed(alu_a) < $signed(alu_b)) ? 32'd1 : 32'd0;
            3'b011: alu_out = (alu_a < alu_b) ? 32'd1 : 32'd0;         // SLTU
            3'b100: alu_out = alu_a ^ alu_b;
            3'b101: alu_out = funct7[5] ? sra_result                   // SRA(I)
                                        : (alu_a >> shamt);            // SRL(I)
            3'b110: alu_out = alu_a | alu_b;
            3'b111: alu_out = alu_a & alu_b;
        endcase
    end

    // ------------------------------------------------------- branch unit
    reg branch_taken;
    always @* begin
        case (funct3)
            3'b000:  branch_taken = (rs1_val == rs2_val);                        // BEQ
            3'b001:  branch_taken = (rs1_val != rs2_val);                        // BNE
            3'b100:  branch_taken = ($signed(rs1_val) <  $signed(rs2_val));      // BLT
            3'b101:  branch_taken = ($signed(rs1_val) >= $signed(rs2_val));      // BGE
            3'b110:  branch_taken = (rs1_val <  rs2_val);                        // BLTU
            3'b111:  branch_taken = (rs1_val >= rs2_val);                        // BGEU
            default: branch_taken = 1'b0;
        endcase
    end

    // ------------------------------------------------------- data memory
    wire [31:0] mem_addr = rs1_val + (is_store ? imm_s : imm_i);
    assign dmem_addr = mem_addr;

    // stores: replicate the data across the word so the right byte lanes
    // carry it, and raise only the strobes the address selects
    reg [31:0] st_data;
    reg [3:0]  st_strb;
    always @* begin
        case (funct3[1:0])
            2'b00: begin                                   // SB
                st_data = {4{rs2_val[7:0]}};
                st_strb = 4'b0001 << mem_addr[1:0];
            end
            2'b01: begin                                   // SH
                st_data = {2{rs2_val[15:0]}};
                st_strb = mem_addr[1] ? 4'b1100 : 4'b0011;
            end
            default: begin                                 // SW
                st_data = rs2_val;
                st_strb = 4'b1111;
            end
        endcase
    end
    assign dmem_wdata = st_data;
    assign dmem_wstrb = (is_store && !halted && !rst) ? st_strb : 4'b0000;

    // loads: pick the addressed byte/halfword out of the word, then
    // sign- or zero-extend according to funct3
    reg [31:0] load_val;
    always @* begin
        case (funct3)
            3'b000: case (mem_addr[1:0])                   // LB
                2'b00: load_val = {{24{dmem_rdata[7]}},  dmem_rdata[7:0]};
                2'b01: load_val = {{24{dmem_rdata[15]}}, dmem_rdata[15:8]};
                2'b10: load_val = {{24{dmem_rdata[23]}}, dmem_rdata[23:16]};
                2'b11: load_val = {{24{dmem_rdata[31]}}, dmem_rdata[31:24]};
            endcase
            3'b001: load_val = mem_addr[1]                 // LH
                ? {{16{dmem_rdata[31]}}, dmem_rdata[31:16]}
                : {{16{dmem_rdata[15]}}, dmem_rdata[15:0]};
            3'b100: case (mem_addr[1:0])                   // LBU
                2'b00: load_val = {24'b0, dmem_rdata[7:0]};
                2'b01: load_val = {24'b0, dmem_rdata[15:8]};
                2'b10: load_val = {24'b0, dmem_rdata[23:16]};
                2'b11: load_val = {24'b0, dmem_rdata[31:24]};
            endcase
            3'b101: load_val = mem_addr[1]                 // LHU
                ? {16'b0, dmem_rdata[31:16]}
                : {16'b0, dmem_rdata[15:0]};
            default: load_val = dmem_rdata;                // LW
        endcase
    end

    // ------------------------------------------- next PC and write-back
    reg [31:0] next_pc;
    reg [31:0] wb_val;
    reg        wb_en;
    always @* begin
        next_pc = pc_plus4;
        wb_val  = 32'd0;
        wb_en   = 1'b0;
        case (opcode)
            OPC_LUI:    begin wb_val = imm_u;         wb_en = 1'b1; end
            OPC_AUIPC:  begin wb_val = pc + imm_u;    wb_en = 1'b1; end
            OPC_JAL:    begin wb_val = pc_plus4;      wb_en = 1'b1;
                              next_pc = pc + imm_j;                 end
            OPC_JALR:   begin wb_val = pc_plus4;      wb_en = 1'b1;
                              next_pc = (rs1_val + imm_i) & ~32'd1; end
            OPC_BRANCH: if (branch_taken) next_pc = pc + imm_b;
            OPC_LOAD:   begin wb_val = load_val;      wb_en = 1'b1; end
            OPC_OPIMM,
            OPC_OP:     begin wb_val = alu_out;       wb_en = 1'b1; end
            OPC_FENCE:  ;                     // no-op on this machine
            default:    ;
        endcase
    end

    wire is_halt = (opcode == OPC_SYSTEM);    // ECALL / EBREAK

    // ------------------------------------------------- the state update
    // The ONLY things that change on a clock edge: pc, one register,
    // (and, over in the memory, the stored word).
    always @(posedge clk) begin
        if (rst) begin
            pc     <= 32'd0;
            halted <= 1'b0;
        end else if (!halted) begin
            if (is_halt)
                halted <= 1'b1;
            else begin
                pc <= next_pc;
                if (wb_en && rd != 5'd0)
                    regs[rd] <= wb_val;
            end
        end
    end

endmodule
