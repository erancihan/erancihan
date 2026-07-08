// tb_alu.v — directed + randomized self-checking testbench for alu.v.
//
// Two layers of testing:
//   1. directed vectors: the corner cases you can name (overflow, sign
//      boundaries, shift by 0 / by 31, INT_MIN, ...);
//   2. random vectors: 2000 draws checked against a golden model written
//      in the testbench.
`timescale 1ns/1ps

module tb_alu;

    reg  [3:0]  op;
    reg  [31:0] a, b;
    wire [31:0] y;
    wire        zero;

    alu dut (.op(op), .a(a), .b(b), .y(y), .zero(zero));

    localparam [3:0]
        ALU_ADD = 0, ALU_SUB = 1, ALU_AND = 2, ALU_OR  = 3, ALU_XOR  = 4,
        ALU_SLL = 5, ALU_SRL = 6, ALU_SRA = 7, ALU_SLT = 8, ALU_SLTU = 9;

    integer errors = 0;

    // golden model: what the ALU *should* compute
    function [31:0] golden(input [3:0] fop, input [31:0] fa, fb);
        begin
            case (fop)
                ALU_ADD:  golden = fa + fb;
                ALU_SUB:  golden = fa - fb;
                ALU_AND:  golden = fa & fb;
                ALU_OR:   golden = fa | fb;
                ALU_XOR:  golden = fa ^ fb;
                ALU_SLL:  golden = fa << fb[4:0];
                ALU_SRL:  golden = fa >> fb[4:0];
                ALU_SRA:  golden = $signed(fa) >>> fb[4:0];
                ALU_SLT:  golden = ($signed(fa) < $signed(fb)) ? 1 : 0;
                ALU_SLTU: golden = (fa < fb) ? 1 : 0;
                default:  golden = 0;
            endcase
        end
    endfunction

    task check(input [3:0] top, input [31:0] ta, tb);
        reg [31:0] exp;
        begin
            op = top; a = ta; b = tb;
            #1;                       // let combinational logic settle
            exp = golden(top, ta, tb);
            if (y !== exp) begin
                $display("FAIL: op=%0d a=%h b=%h -> y=%h, expected %h",
                         top, ta, tb, y, exp);
                errors = errors + 1;
            end
            if (zero !== (exp == 0)) begin
                $display("FAIL: zero flag wrong for op=%0d a=%h b=%h", top, ta, tb);
                errors = errors + 1;
            end
        end
    endtask

    integer i;
    reg [31:0] ra, rb;

    initial begin
        $dumpfile("alu.vcd");
        $dumpvars(0, tb_alu);

        // ---- directed corner cases -------------------------------------
        check(ALU_ADD,  32'hFFFF_FFFF, 32'd1);          // unsigned wrap
        check(ALU_ADD,  32'h7FFF_FFFF, 32'd1);          // signed overflow
        check(ALU_SUB,  32'd0,         32'd1);          // borrow
        check(ALU_SUB,  32'h8000_0000, 32'd1);          // INT_MIN - 1
        check(ALU_SLT,  32'h8000_0000, 32'd0);          // INT_MIN < 0 (signed)
        check(ALU_SLTU, 32'h8000_0000, 32'd0);          // but not unsigned
        check(ALU_SLT,  32'd5,         32'd5);          // equal -> 0
        check(ALU_SLTU, 32'd0,         32'hFFFF_FFFF);  // 0 < UINT_MAX
        check(ALU_SRA,  32'h8000_0000, 32'd31);         // all sign bits
        check(ALU_SRL,  32'h8000_0000, 32'd31);         // just one bit left
        check(ALU_SLL,  32'd1,         32'd31);         // into the sign bit
        check(ALU_SLL,  32'hDEAD_BEEF, 32'd0);          // shift by zero
        check(ALU_XOR,  32'hAAAA_AAAA, 32'h5555_5555);
        check(ALU_AND,  32'hF0F0_F0F0, 32'h0FF0_0FF0);
        check(ALU_OR,   32'h0000_0000, 32'h0000_0000);  // zero flag

        // ---- randomized -------------------------------------------------
        for (i = 0; i < 2000; i = i + 1) begin
            ra = $random;
            rb = $random;
            check(i % 10, ra, rb);
        end

        if (errors == 0) $display("ALL TESTS PASSED");
        else             $display("TEST FAILED: %0d errors", errors);
        $finish;
    end

endmodule
