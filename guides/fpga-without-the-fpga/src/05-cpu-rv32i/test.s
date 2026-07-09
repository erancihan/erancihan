# test.s — the program our RV32I CPU runs in simulation.
#
# It exercises arithmetic, all load/store widths, branches (taken and
# not-taken), shifts, comparisons, LUI, and a JAL/JALR function call,
# then writes its results to memory starting at 0x100 and halts with
# EBREAK. The testbench checks every result word.
#
# Expected memory contents when the CPU halts:
#   0x100 = 55          (fib(10))
#   0x104 = 0x0000007A  (byte store)
#   0x108 = 0x0000FFFE  (halfword store)
#   0x10C = 0x00000078  (lbu + lh arithmetic)
#   0x110 = 99          (value set inside a called function)
#   0x114 = 32          (slti + sll)
#   0x118 = 0xFFFFFFFC  (arithmetic shift right of -64 by 4)
#   0x11C = 0x000ABCDE  (lui + srli)
#   0x120 = 1           (branch gauntlet survived)

    addi x5, x0, 0x100      # x5 = results base address

# ---- iterative Fibonacci: after the loop, x2 = fib(10) = 55 ----------
    addi x1, x0, 10         # n = 10
    addi x2, x0, 0          # a = fib(0)
    addi x3, x0, 1          # b = fib(1)
fib_loop:
    beq  x1, x0, fib_done
    add  x4, x2, x3         # t = a + b
    mv   x2, x3             # a = b
    mv   x3, x4             # b = t
    addi x1, x1, -1
    j    fib_loop
fib_done:
    sw   x2, 0(x5)          # mem[0x100] = 55

# ---- sub-word stores and sign/zero-extending loads --------------------
    addi x6, x0, 0x7A
    sb   x6, 4(x5)          # mem[0x104] = 0x0000007A (memory starts zeroed)
    addi x7, x0, -2         # 0xFFFFFFFE
    sh   x7, 8(x5)          # mem[0x108] = 0x0000FFFE
    lbu  x8, 4(x5)          # x8 = 0x7A          (zero-extended)
    lh   x9, 8(x5)          # x9 = 0xFFFFFFFE    (sign-extended)
    add  x10, x8, x9        # 0x7A + (-2) = 0x78
    sw   x10, 12(x5)        # mem[0x10C] = 0x78

# ---- function call via JAL / return via JALR ---------------------------
    jal  x1, set99          # call; x1 (ra) = return address
    sw   x14, 16(x5)        # mem[0x110] = 99

# ---- comparisons and shifts -------------------------------------------
    addi x11, x0, 5
    slti x12, x11, 6        # 5 < 6 (signed)  -> x12 = 1
    sll  x13, x12, x11      # 1 << 5          -> 32
    sw   x13, 20(x5)        # mem[0x114] = 32
    addi x15, x0, -64
    srai x16, x15, 4        # -64 >>> 4 = -4
    sw   x16, 24(x5)        # mem[0x118] = 0xFFFFFFFC
    lui  x18, 0xABCDE       # x18 = 0xABCDE000
    srli x19, x18, 12       # x19 = 0x000ABCDE
    sw   x19, 28(x5)        # mem[0x11C] = 0x000ABCDE

# ---- branch gauntlet: x21 must end up exactly 1 ------------------------
    addi x21, x0, 0
    addi x20, x0, -1        # 0xFFFFFFFF
    bltu x0, x20, g1        # unsigned: 0 < 0xFFFFFFFF, taken
    addi x21, x0, 111       # must be skipped
g1: blt  x20, x0, g2        # signed: -1 < 0, taken
    addi x21, x0, 222       # must be skipped
g2: bge  x0, x20, g3        # signed: 0 >= -1, taken
    addi x21, x0, 333       # must be skipped
g3: bgeu x0, x20, g4        # unsigned: 0 >= 0xFFFFFFFF is FALSE, not taken
    addi x21, x21, 1        # runs once (the fall-through is the right path)
g4: bne  x21, x0, g5        # x21 = 1 != 0, taken
    addi x21, x0, 444       # must be skipped
g5: sw   x21, 32(x5)        # mem[0x120] = 1

    ebreak                  # tell the testbench we are done

# ---- a leaf function ----------------------------------------------------
set99:
    addi x14, x0, 99
    ret                     # jalr x0, 0(x1)
