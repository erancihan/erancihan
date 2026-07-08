// alu.v — a 32-bit ALU with the ten operations RV32I needs.
//
// Pure combinational logic: no clock, no state. `always @*` plus a full
// `case` (with default) is the standard recipe — cover every path or the
// synthesizer will infer a latch you did not want.
//
// The op encoding is our own local choice here; chapter 08 shows how the
// RISC-V funct3/funct7 fields map onto it.
module alu (
    input  wire [3:0]  op,
    input  wire [31:0] a,
    input  wire [31:0] b,
    output reg  [31:0] y,
    output wire        zero
);

    localparam [3:0]
        ALU_ADD  = 4'd0,   // a + b
        ALU_SUB  = 4'd1,   // a - b
        ALU_AND  = 4'd2,
        ALU_OR   = 4'd3,
        ALU_XOR  = 4'd4,
        ALU_SLL  = 4'd5,   // shift left logical, by b[4:0]
        ALU_SRL  = 4'd6,   // shift right logical
        ALU_SRA  = 4'd7,   // shift right arithmetic (sign-extending)
        ALU_SLT  = 4'd8,   // set if a < b, signed
        ALU_SLTU = 4'd9;   // set if a < b, unsigned

    wire [4:0] shamt = b[4:0];

    always @* begin
        case (op)
            ALU_ADD:  y = a + b;
            ALU_SUB:  y = a - b;
            ALU_AND:  y = a & b;
            ALU_OR:   y = a | b;
            ALU_XOR:  y = a ^ b;
            ALU_SLL:  y = a << shamt;
            ALU_SRL:  y = a >> shamt;
            ALU_SRA:  y = $signed(a) >>> shamt;
            ALU_SLT:  y = ($signed(a) < $signed(b)) ? 32'd1 : 32'd0;
            ALU_SLTU: y = (a < b) ? 32'd1 : 32'd0;
            default:  y = 32'd0;
        endcase
    end

    assign zero = (y == 32'd0);

endmodule
