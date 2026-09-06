#!/usr/bin/env python3
# Exact per-stage model of the guide's fp32_add2 (design semantics: RNE only,
# screen NaN/inf/zero rules, a-priority NaN payload propagation, flags
# {invalid, overflow, inexact}), composed into the (a+b)+(c+d) tree with
# flag OR -- plus the correctly-rounded single-rounding oracle.
# All finite arithmetic in fractions.Fraction; rounding is hand RNE.
from fractions import Fraction
import sys

EMIN, BIAS = -126, 127

def classify(w):
    s = (w >> 31) & 1
    e = (w >> 23) & 0xFF
    m = w & 0x7FFFFF
    if e == 0:
        return ('zero' if m == 0 else 'sub'), s, e, m
    if e == 0xFF:
        if m == 0:
            return 'inf', s, e, m
        return ('snan' if (m >> 22) == 0 else 'qnan'), s, e, m
    return 'norm', s, e, m

def value(w):
    c, s, e, m = classify(w)
    if c == 'zero':
        return Fraction(0)
    if c == 'sub':
        v = Fraction(m, 1 << 23) * Fraction(2) ** EMIN
    else:
        v = Fraction((1 << 23) + m, 1 << 23) * Fraction(2) ** (e - BIAS)
    return -v if s else v

def floor_log2(fr):
    p, q = fr.numerator, fr.denominator
    e = p.bit_length() - q.bit_length()
    if fr < Fraction(2) ** e:
        e -= 1
    if fr >= Fraction(2) ** (e + 1):
        e += 1
    return e

def rne_int(fr):
    """round Fraction to nearest integer, ties to even"""
    k = fr.numerator // fr.denominator
    rem = fr - k
    if rem > Fraction(1, 2):
        k += 1
    elif rem == Fraction(1, 2):
        k += (k & 1)
    return k

def round_rne(S):
    """exact Fraction -> (bits, overflow, inexact). S != 0, finite."""
    sign = 1 if S < 0 else 0
    m = -S if S < 0 else S
    if m < Fraction(2) ** EMIN:                       # subnormal domain
        n = m / (Fraction(2) ** (EMIN - 23))          # ulp = 2^-149
        k = rne_int(n)
        inexact = (k != n)
        if k == 0:
            return (sign << 31), 0, inexact           # rounds to zero (keeps sign)
        if k == (1 << 23):                            # rounds up into min normal
            return (sign << 31) | (1 << 23), 0, inexact
        return (sign << 31) | k, 0, inexact
    E = floor_log2(m)
    ulp = Fraction(2) ** (E - 23)
    n = m / ulp                                       # in [2^23, 2^24)
    k = rne_int(n)
    inexact = (k != n)
    if k == (1 << 24):
        E += 1
        k = 1 << 23
    if E > 127:
        return (sign << 31) | 0x7F800000, 1, 1        # overflow -> inf
    return (sign << 31) | ((E + BIAS) << 23) | (k - (1 << 23)), 0, inexact

def add2(a, b):
    """design-exact model of fp32_add2: returns (res, invalid, overflow, inexact)"""
    ca, sa, _, ma = classify(a)
    cb, sb, _, mb = classify(b)
    a_nan = ca in ('qnan', 'snan'); b_nan = cb in ('qnan', 'snan')
    invalid = (ca == 'snan') or (cb == 'snan')
    if a_nan or b_nan:
        src = a if a_nan else b
        res = (src & 0x80000000) | 0x7F800000 | (1 << 22) | (src & 0x3FFFFF)
        return res, int(invalid), 0, 0
    if ca == 'inf' and cb == 'inf' and sa != sb:
        return 0x7FC00000, 1, 0, 0
    if ca == 'inf':
        return a, 0, 0, 0
    if cb == 'inf':
        return b, 0, 0, 0
    if ca == 'zero' and cb == 'zero':
        return (a if sa == sb else 0x00000000), 0, 0, 0
    if ca == 'zero':
        return b, 0, 0, 0
    if cb == 'zero':
        return a, 0, 0, 0
    S = value(a) + value(b)
    if S == 0:
        return 0x00000000, 0, 0, 0                    # exact cancellation -> +0
    res, ovf, inx = round_rne(S)
    return res, 0, ovf, int(inx or ovf)

def add4_tree(a, b, c, d):
    r1 = add2(a, b); r2 = add2(c, d)
    r = add2(r1[0], r2[0])
    return (r[0], r1[1] | r2[1] | r[1], r1[2] | r2[2] | r[2], r1[3] | r2[3] | r[3])

def cr_add4(a, b, c, d):
    """single-rounding oracle: None if any special is involved"""
    for w in (a, b, c, d):
        if classify(w)[0] in ('inf', 'qnan', 'snan'):
            return None
    S = value(a) + value(b) + value(c) + value(d)
    if S == 0:
        return 0x00000000
    return round_rne(S)[0]

if __name__ == '__main__':
    mode, path, limit = sys.argv[1], sys.argv[2], int(sys.argv[3])
    n = bad = 0
    cr_n = cr_agree = 0
    with open(path) as f:
        for line in f:
            parts = line.split()
            if len(parts) != 3 or parts[0].startswith('DONE'):
                continue
            ops, res, flags = parts
            res = int(res, 16)
            fl = (int(flags[0]), int(flags[1]), int(flags[2]))
            if mode == 'pair':
                a = int(ops[0:8], 16); b = int(ops[8:16], 16)
                m = add2(a, b)
            else:
                a = int(ops[0:8], 16); b = int(ops[8:16], 16)
                c = int(ops[16:24], 16); d = int(ops[24:32], 16)
                m = add4_tree(a, b, c, d)
                cr = cr_add4(a, b, c, d)
                if cr is not None:
                    cr_n += 1
                    cr_agree += (cr == m[0])
            n += 1
            if (m[0], m[1], m[2], m[3]) != (res, fl[0], fl[1], fl[2]):
                bad += 1
                if bad <= 5:
                    print(f"MISMATCH {ops}: rtl {res:08x}/{fl} model "
                          f"{m[0]:08x}/{m[1]}{m[2]}{m[3]}")
            if n >= limit:
                break
    print(f"{mode}: {n} vectors checked, {bad} mismatches")
    if cr_n:
        print(f"CR census (all-finite-operand quads): {cr_agree}/{cr_n} "
              f"= {100*cr_agree/cr_n:.3f}% equal the correctly rounded sum")
