#!/usr/bin/env python3
"""asm.py — a tiny two-pass RV32I assembler (subset), zero dependencies.

Usage:  python3 asm.py test.s program.hex

Supports the instructions the guide's CPU implements, labels, `#` and `;`
comments, decimal/hex immediates, and the register names x0..x31 plus the
standard ABI names (zero, ra, sp, t0, a0, ...). Output is one 32-bit hex
word per line, ready for Verilog's $readmemh.

This is a teaching tool, not a real assembler: errors are blunt and there
are no relocations, sections, or pseudo-instruction expansions beyond
`nop`, `li` (12-bit range), `mv`, `j`, and `ret`.
"""

import re
import sys

ABI = {
    "zero": 0, "ra": 1, "sp": 2, "gp": 3, "tp": 4,
    "t0": 5, "t1": 6, "t2": 7, "s0": 8, "fp": 8, "s1": 9,
    "a0": 10, "a1": 11, "a2": 12, "a3": 13, "a4": 14, "a5": 15,
    "a6": 16, "a7": 17, "s2": 18, "s3": 19, "s4": 20, "s5": 21,
    "s6": 22, "s7": 23, "s8": 24, "s9": 25, "s10": 26, "s11": 27,
    "t3": 28, "t4": 29, "t5": 30, "t6": 31,
}

R_TYPE = {  # name: (funct7, funct3)
    "add": (0b0000000, 0b000), "sub": (0b0100000, 0b000),
    "sll": (0b0000000, 0b001), "slt": (0b0000000, 0b010),
    "sltu": (0b0000000, 0b011), "xor": (0b0000000, 0b100),
    "srl": (0b0000000, 0b101), "sra": (0b0100000, 0b101),
    "or": (0b0000000, 0b110), "and": (0b0000000, 0b111),
}
I_ARITH = {  # name: funct3
    "addi": 0b000, "slti": 0b010, "sltiu": 0b011,
    "xori": 0b100, "ori": 0b110, "andi": 0b111,
}
I_SHIFT = {  # name: (funct7, funct3)
    "slli": (0b0000000, 0b001),
    "srli": (0b0000000, 0b101),
    "srai": (0b0100000, 0b101),
}
LOADS = {"lb": 0b000, "lh": 0b001, "lw": 0b010, "lbu": 0b100, "lhu": 0b101}
STORES = {"sb": 0b000, "sh": 0b001, "sw": 0b010}
BRANCHES = {"beq": 0b000, "bne": 0b001, "blt": 0b100,
            "bge": 0b101, "bltu": 0b110, "bgeu": 0b111}


def reg(tok):
    tok = tok.strip().lower()
    if tok in ABI:
        return ABI[tok]
    if tok.startswith("x") and tok[1:].isdigit() and 0 <= int(tok[1:]) < 32:
        return int(tok[1:])
    raise ValueError(f"bad register: {tok!r}")


def imm(tok, labels=None, pc=None):
    tok = tok.strip()
    if labels is not None and tok in labels:
        return labels[tok] - (pc if pc is not None else 0)
    return int(tok, 0)  # handles 10, -3, 0x1F


def fit(value, bits, signed=True):
    lo = -(1 << (bits - 1)) if signed else 0
    hi = (1 << (bits - 1)) - 1 if signed else (1 << bits) - 1
    if not lo <= value <= hi:
        raise ValueError(f"immediate {value} does not fit in {bits} bits")
    return value & ((1 << bits) - 1)


def enc_r(f7, rs2, rs1, f3, rd, opc):
    return (f7 << 25) | (rs2 << 20) | (rs1 << 15) | (f3 << 12) | (rd << 7) | opc


def enc_i(v, rs1, f3, rd, opc):
    return (fit(v, 12) << 20) | (rs1 << 15) | (f3 << 12) | (rd << 7) | opc


def enc_s(v, rs2, rs1, f3, opc):
    v = fit(v, 12)
    return ((v >> 5) << 25) | (rs2 << 20) | (rs1 << 15) | (f3 << 12) | \
           ((v & 0x1F) << 7) | opc


def enc_b(v, rs2, rs1, f3, opc):
    v = fit(v, 13)
    return (((v >> 12) & 1) << 31) | (((v >> 5) & 0x3F) << 25) | \
           (rs2 << 20) | (rs1 << 15) | (f3 << 12) | \
           (((v >> 1) & 0xF) << 8) | (((v >> 11) & 1) << 7) | opc


def enc_u(v, rd, opc):
    return ((v & 0xFFFFF) << 12) | (rd << 7) | opc


def enc_j(v, rd, opc):
    v = fit(v, 21)
    return (((v >> 20) & 1) << 31) | (((v >> 1) & 0x3FF) << 21) | \
           (((v >> 11) & 1) << 20) | (((v >> 12) & 0xFF) << 12) | \
           (rd << 7) | opc


def split_mem_operand(tok):
    """'8(x5)' -> (8, 5)"""
    m = re.fullmatch(r"\s*(-?\w+)\s*\(\s*(\w+)\s*\)\s*", tok)
    if not m:
        raise ValueError(f"bad memory operand: {tok!r}")
    return imm(m.group(1)), reg(m.group(2))


def parse_lines(path):
    """First pass: strip comments, collect labels, list (pc, mnemonic, args)."""
    out, labels, pc = [], {}, 0
    for raw in open(path):
        line = re.split(r"[#;]", raw, 1)[0].strip()
        while True:  # labels, possibly several, possibly alone on a line
            m = re.match(r"^(\w+)\s*:\s*(.*)$", line)
            if not m:
                break
            labels[m.group(1)] = pc
            line = m.group(2).strip()
        if not line:
            continue
        parts = line.split(None, 1)
        mnem = parts[0].lower()
        args = [a.strip() for a in parts[1].split(",")] if len(parts) > 1 else []
        out.append((pc, mnem, args))
        pc += 4
    return out, labels


def assemble(path):
    prog, labels = parse_lines(path)
    words = []
    for pc, mnem, a in prog:
        if mnem in R_TYPE:
            f7, f3 = R_TYPE[mnem]
            w = enc_r(f7, reg(a[2]), reg(a[1]), f3, reg(a[0]), 0b0110011)
        elif mnem in I_ARITH:
            w = enc_i(imm(a[2]), reg(a[1]), I_ARITH[mnem], reg(a[0]), 0b0010011)
        elif mnem in I_SHIFT:
            f7, f3 = I_SHIFT[mnem]
            sh = imm(a[2])
            assert 0 <= sh < 32, "shift amount out of range"
            w = enc_r(f7, sh, reg(a[1]), f3, reg(a[0]), 0b0010011)
        elif mnem in LOADS:
            off, base = split_mem_operand(a[1])
            w = enc_i(off, base, LOADS[mnem], reg(a[0]), 0b0000011)
        elif mnem in STORES:
            off, base = split_mem_operand(a[1])
            w = enc_s(off, reg(a[0]), base, STORES[mnem], 0b0100011)
        elif mnem in BRANCHES:
            w = enc_b(imm(a[2], labels, pc), reg(a[1]), reg(a[0]),
                      BRANCHES[mnem], 0b1100011)
        elif mnem == "lui":
            w = enc_u(imm(a[1]), reg(a[0]), 0b0110111)
        elif mnem == "auipc":
            w = enc_u(imm(a[1]), reg(a[0]), 0b0010111)
        elif mnem == "jal":
            if len(a) == 1:            # jal label  (rd defaults to ra)
                a = ["ra", a[0]]
            w = enc_j(imm(a[1], labels, pc), reg(a[0]), 0b1101111)
        elif mnem == "jalr":
            if len(a) == 2:            # jalr rd, off(rs1)
                off, base = split_mem_operand(a[1])
            else:                      # jalr rd, rs1, off
                base, off = reg(a[1]), imm(a[2])
            w = enc_i(off, base, 0b000, reg(a[0]), 0b1100111)
        elif mnem == "ebreak":
            w = 0x00100073
        elif mnem == "ecall":
            w = 0x00000073
        # ---- a few pseudo-instructions --------------------------------
        elif mnem == "nop":
            w = enc_i(0, 0, 0, 0, 0b0010011)               # addi x0,x0,0
        elif mnem == "li":                                  # 12-bit range only
            w = enc_i(imm(a[1]), 0, 0b000, reg(a[0]), 0b0010011)
        elif mnem == "mv":
            w = enc_i(0, reg(a[1]), 0b000, reg(a[0]), 0b0010011)
        elif mnem == "j":
            w = enc_j(imm(a[0], labels, pc), 0, 0b1101111)
        elif mnem == "ret":
            w = enc_i(0, 1, 0b000, 0, 0b1100111)           # jalr x0, 0(ra)
        else:
            raise ValueError(f"unknown mnemonic at pc={pc:#x}: {mnem}")
        words.append(w)
    return words


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    words = assemble(sys.argv[1])
    with open(sys.argv[2], "w") as f:
        for w in words:
            f.write(f"{w:08x}\n")
    print(f"assembled {len(words)} instructions -> {sys.argv[2]}")


if __name__ == "__main__":
    main()
