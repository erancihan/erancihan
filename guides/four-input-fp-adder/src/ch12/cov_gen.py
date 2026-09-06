#!/usr/bin/env python3
# Generates the ch12 coverage prototype's directed list and the PINNED
# expected per-bin counts for that list, computed by the algorithm-level
# event model (hwmodel.py) -- the independent implementation of every bin
# definition. Emits: cov_dirlist.vh (slot calls), cov_pins.vh (expected
# counts), cov_names.vh (bin name function).
import sys
sys.dont_write_bytecode = True   # keep __pycache__ out of the source tree
from hwmodel import add4_tree_events, cls

NBINS = 105
CLS = {'zero': 0, 'sub': 1, 'norm': 2, 'inf': 3, 'qnan': 4, 'snan': 4}

def expdbin(x, y):
    d = ((x >> 23) & 0xFF) - ((y >> 23) & 0xFF)
    d = abs(d)
    if d == 0: return 0
    if d <= 2: return 1
    if d < 25: return 2
    return 3

NAMES = []
def build_names():
    cn = ['ZERO', 'SUB', 'NORM', 'INF', 'NAN']
    for i in range(5):
        for j in range(5):
            NAMES.append(f"cross_ab[{cn[i]}x{cn[j]}]")
    for i in range(5):
        for j in range(5):
            NAMES.append(f"cross_cd[{cn[i]}x{cn[j]}]")
    for p in ('ab', 'cd'):
        for k in ('d==0', 'd<=2', 'd<25', 'd>=25'):
            NAMES.append(f"expd_{p}[{k}]")
    for inst in ('ab', 'cd', 'r'):
        NAMES.append(f"effop_{inst}[add]")
        NAMES.append(f"effop_{inst}[sub]")
    for inst in ('ab', 'cd', 'r'):
        for k in ('right1', 'none', 'leftN'):
            NAMES.append(f"norm_{inst}[{k}]")
    for inst in ('ab', 'cd', 'r'):
        for k in ('g_set', 's_set', 'tie_up', 'tie_dn', 'round_up', 'round_renorm'):
            NAMES.append(f"rev_{inst}[{k}]")
    NAMES.extend(['s1_ovf_ab', 's1_ovf_cd', 'nan_l1_ab', 'nan_l1_cd',
                  'sub_l1_ab', 'sub_l1_cd', 'cancel_r_shallow',
                  'cancel_r_deep', 's2_exact_zero'])
    for k in ('ZERO', 'SUB', 'NORM', 'INF', 'NAN'):
        NAMES.append(f"resclass[{k}]")
    assert len(NAMES) == NBINS, len(NAMES)
build_names()

def sample(cov, q):
    a, b, c, d = q
    res, (e1, e2, er), (r1, r2, rr) = add4_tree_events(a, b, c, d)
    cov[CLS[cls(a)] * 5 + CLS[cls(b)]] += 1
    cov[25 + CLS[cls(c)] * 5 + CLS[cls(d)]] += 1
    if cls(a) == 'norm' and cls(b) == 'norm':
        cov[50 + expdbin(a, b)] += 1
    if cls(c) == 'norm' and cls(d) == 'norm':
        cov[54 + expdbin(c, d)] += 1
    for k, (ev, rt) in enumerate(((e1, r1), (e2, r2), (er, rr))):
        if ev['screen']:
            continue
        cov[58 + k * 2 + ev['eff_sub']] += 1
        cov[64 + k * 3 + (0 if ev['right1'] else (1 if ev['norm_none'] else 2))] += 1
        base = 73 + k * 6
        if ev['ng']: cov[base + 0] += 1
        if ev['ns']: cov[base + 1] += 1
        if ev['tie_up']: cov[base + 2] += 1
        if ev['tie_dn']: cov[base + 3] += 1
        if ev['round_up']: cov[base + 4] += 1
        if ev['round_renorm']: cov[base + 5] += 1
    if r1[2]: cov[91] += 1                      # s1 overflow flags (post-gate)
    if r2[2]: cov[92] += 1
    if cls(r1[0]) in ('qnan', 'snan'): cov[93] += 1
    if cls(r2[0]) in ('qnan', 'snan'): cov[94] += 1
    if cls(r1[0]) == 'sub': cov[95] += 1
    if cls(r2[0]) == 'sub': cov[96] += 1
    if not er['screen'] and er['eff_sub']:
        if 1 <= er['shl'] <= 7: cov[97] += 1
        elif er['shl'] >= 8:    cov[98] += 1
    if not er['screen'] and er['exact_zero']: cov[99] += 1
    cov[100 + CLS[cls(res[0])]] += 1
    return res

def directed_list():
    q = [(0x3F800000, 0x40A00000, 0x40E00000, 0x41100000)]  # FIRST quad: live datapath in all three instances
    corner = [0x00000000, 0x00000001, 0x3F800000, 0x7F800000, 0x7FC00000]
    for i in range(5):                          # 25-cross floor, both pairs
        for j in range(5):
            q.append((corner[i], corner[j], corner[j], corner[i]))
    Z, NZ = 0x00000000, 0x80000000
    q += [
        (0x3F800000, 0x40000000, 0x40400000, 0x40800000),  # benign; right1 at r
        (0x3F800000, 0x3F800000, 0x3F800000, 0x3F800000),  # right1 all three
        (0x4B800000, 0x3F800000, Z, Z),                    # tie-down at ab
        (0x4B800001, 0x3F800000, Z, Z),                    # tie-up at ab
        (Z, Z, 0x4B800000, 0x3F800000),                    # tie-down at cd
        (Z, Z, 0x4B800001, 0x3F800000),                    # tie-up at cd
        (0x4B000000, 0x4B000000, 0x3F000000, 0x3F000000),  # tie-down at r
        (0x4B800001, Z, 0x3F000000, 0x3F000000),           # tie-up at r
        (0x4B800000, 0xB3800000, 0x3FFFFFFF, 0x33800000),  # renorm reachers ab+cd
        (0x4B000000, 0xBDFFFFFF, 0x7F7FFFFF, 0x73000000),  # remaining two reachers
        (0x3FFFFFFF, Z, 0x33800000, NZ),                   # renorm reacher AT r
        (0x4B000000, 0x49800000, Z, Z),                    # d=3 at ab: straddles the d<=2 bucket boundary (added after the ch12 review's mx1 survival)
        (0x4B000000, 0x3F000000, Z, Z),                    # d=24 at ab
        (0x4B000000, 0x3E800000, Z, Z),                    # d=25 at ab
        (Z, Z, 0x4B000000, 0x3E000000),                    # d=26 at cd
        (Z, Z, 0x4B000000, 0x37000000),                    # d=40 deep sticky at cd
        (0x40800000, Z, 0xC0000000, NZ),                   # shallow cancel at r
        (0x40800000, Z, 0xC0800001, NZ),                   # deep cancel at r (shl=23)
        (0x40800000, Z, 0xC07F0000, NZ),                   # cancel at r, shl=8 (deep side of the boundary)
        (0x40800000, Z, 0xC07E0000, NZ),                   # cancel at r, shl=7 (shallow side, adjacent)
        (0x40490FDB, Z, 0xC0490FDB, NZ),                   # exact cancel AT r: +0
        (0x3F800000, 0xBF800000, 0x40000000, 0xC0000000),  # exact cancel at ab AND cd
        (0x7F7FFFFF, 0x7F7FFFFF, 0xFF7FFFFF, 0x3F800000),  # s1 overflow ab
        (0xFF7FFFFF, 0xBF800000, 0xFF7FFFFF, 0xFF7FFFFF),  # s1 overflow cd (negative)
        (0x7F800000, 0xFF800000, 0x3F800000, 0x3F800000),  # NaN born at ab
        (0x40000000, 0x40000000, 0xFF800000, 0x7F800000),  # NaN born at cd
        (0x00000001, 0x00000001, 0x80000001, 0x80000002),  # subnormal results both
        (0x00800000, 0x80000001, 0x3F800000, 0x40000000),  # gradual underflow at ab
        (0x007FFFFF, 0x00000001, 0x40000000, 0x3F800000),  # sub+sub carries to normal
        (0x7FA00001, 0x3F800000, 0x40000000, 0x40400000),  # sNaN: invalid, quieting
        (0x3F800001, 0xB3800001, 0x40000000, 0xC0000000),  # sticky borrow at ab
        (0x36000000, 0x35800000, 0xB5800000, 0xB6000000),  # small clustered mix
    ]
    return q

if __name__ == '__main__':
    q = directed_list()
    cov = [0] * NBINS
    for quad in q:
        sample(cov, quad)
    holes = [NAMES[i] for i in range(NBINS) if cov[i] == 0]
    print(f"directed quads: {len(q)}; floor closure {NBINS-len(holes)}/{NBINS}")
    if holes:
        print("floor holes:", ", ".join(holes))
    with open('cov_dirlist.vh', 'w') as f:
        f.write(f"// GENERATED by cov_gen.py -- {len(q)} directed quads\n")
        for n, (a, b, c, d) in enumerate(q):
            f.write(f"    slot(1, 32'h{a:08X}, 32'h{b:08X}, 32'h{c:08X}, 32'h{d:08X});\n")
            if n % 7 == 6:
                f.write("    bubble;\n")
    with open('cov_pins.vh', 'w') as f:
        f.write(f"// GENERATED by cov_gen.py -- pinned per-bin counts for the\n")
        f.write(f"// {len(q)}-quad directed phase, computed by hwmodel.py\n")
        for i in range(NBINS):
            f.write(f"    exp_dir[{i}] = {cov[i]};  // {NAMES[i]}\n")
    with open('cov_names.vh', 'w') as f:
        f.write("// GENERATED by cov_gen.py -- bin names\n")
        f.write("  function [24*8-1:0] bname(input integer i);\n")
        f.write("    begin\n      case (i)\n")
        for i in range(NBINS):
            f.write(f"        {i}: bname = \"{NAMES[i]}\";\n")
        f.write("        default: bname = \"?\";\n      endcase\n    end\n  endfunction\n")
    print("wrote cov_dirlist.vh cov_pins.vh cov_names.vh")
    print("NDIR =", len(q))
