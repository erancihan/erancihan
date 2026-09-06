#!/usr/bin/env python3
# Algorithm-level model of ch08's golden steps (unpack/screen/swap/align/
# addsub/normalize/round), written from the documented algorithm -- NOT from
# the RTL text -- and exposing the per-stage EVENTS the ch12 coverage model
# bins: screen, eff_sub, d, G/R/S at align, carry/right1/none/leftN, subnormal
# stop, post-normalize g/r/s, tie, round_up, round_renorm, exact_zero.
# Validated by equivalence to oracle.py's spec-level model AND to the RTL
# transcripts (results+flags), and by the pinned-count mechanism itself.

def fields(w):
    s = (w >> 31) & 1
    E = (w >> 23) & 0xFF
    F = w & 0x7FFFFF
    hidden = 1 if E != 0 else 0
    sig = (hidden << 23) | F
    e_eff = E if E != 0 else 1
    return s, E, F, sig, e_eff

def cls(w):
    s, E, F, _, _ = fields(w)
    if E == 0:    return 'zero' if F == 0 else 'sub'
    if E == 0xFF: return 'inf' if F == 0 else ('snan' if (F >> 22) == 0 else 'qnan')
    return 'norm'

def add2_events(a, b):
    """returns (res, invalid, overflow, inexact, ev) -- ev is a dict of the
    per-stage events for coverage prediction; ev['screen'] True means the
    datapath events are DON'T-SAMPLE (masked by screen qualification)."""
    ca, cb = cls(a), cls(b)
    sa, Ea, Fa, siga, ea = fields(a)
    sb, Eb, Fb, sigb, eb = fields(b)
    ev = {'screen': False, 'eff_sub': sa ^ sb}
    a_nan = ca in ('qnan', 'snan'); b_nan = cb in ('qnan', 'snan')
    invalid = int(ca == 'snan' or cb == 'snan')
    if a_nan or b_nan or ca == 'inf' or cb == 'inf' or ca == 'zero' or cb == 'zero':
        ev['screen'] = True
        if a_nan or b_nan:
            src = a if a_nan else b
            res = (src & 0x80000000) | 0x7F800000 | (1 << 22) | (src & 0x3FFFFF)
            return res, invalid, 0, 0, ev
        if ca == 'inf' and cb == 'inf' and sa != sb:
            return 0x7FC00000, 1, 0, 0, ev
        if ca == 'inf':  return a, 0, 0, 0, ev
        if cb == 'inf':  return b, 0, 0, 0, ev
        if ca == 'zero' and cb == 'zero':
            return (a if sa == sb else 0), 0, 0, 0, ev
        return (b if ca == 'zero' else a), 0, 0, 0, ev
    # ---- swap: bigger packed magnitude is "big" ----
    if (b & 0x7FFFFFFF) > (a & 0x7FFFFFFF):
        sign_big, e_big, sig_big = sb, eb, sigb
        e_sml, sig_sml = ea, siga
    else:
        sign_big, e_big, sig_big = sa, ea, siga
        e_sml, sig_sml = eb, sigb
    eff_sub = sa ^ sb
    # ---- align: shift right by d (clamped 26), capture G/R/S ----
    d = e_big - e_sml
    sh = min(d, 26)
    wide = sig_sml << 2                      # 26-bit frame: sig + G + R
    shifted = wide >> sh
    lost = wide - (shifted << sh)
    aligned = shifted >> 2
    g = (shifted >> 1) & 1
    r = shifted & 1
    s = int(lost != 0)
    ev.update(d=d, g=g, r=r, s=s)
    # ---- addsub: 27-bit effective op, sticky borrow ----
    big27 = sig_big << 2
    sml27 = (aligned << 2) | (g << 1) | r
    if eff_sub:
        sum27 = big27 - sml27 - s
    else:
        sum27 = big27 + sml27
    exact_zero = int(eff_sub and sum27 == 0)
    ev['exact_zero'] = exact_zero
    # ---- normalize: right-1 / none / left-N with the subnormal stop ----
    carry = (sum27 >> 26) & 1
    right1 = int((not eff_sub) and carry)
    frame = sum27 & ((1 << 26) - 1)
    lz = 26 - frame.bit_length() if frame != 0 else 26
    if right1:
        nsig = sum27 >> 3
        ng = (sum27 >> 2) & 1
        nr = (sum27 >> 1) & 1
        ns = s | (sum27 & 1)
        e_norm = e_big + 1
        shl = 0
    else:
        shl = min(lz, e_big - 1)
        framel = (frame << shl) & ((1 << 26) - 1)
        nsig = framel >> 2
        ng = (framel >> 1) & 1
        nr = framel & 1
        ns = s
        e_norm = e_big - shl
    ev.update(right1=right1, shl=shl, ng=ng, nr=nr, ns=ns,
              norm_none=int(right1 == 0 and shl == 0),
              norm_left=int(right1 == 0 and shl > 0),
              subnormal_stop=int(right1 == 0 and lz > e_big - 1))
    # ---- round: RNE, rounding-carry renormalize, pack ----
    lbit = nsig & 1
    round_up = ng & (nr | ns | lbit)
    tie = int(ng == 1 and nr == 0 and ns == 0)
    rsig = nsig + round_up
    round_renorm = (rsig >> 24) & 1
    if round_renorm:
        fsig = 1 << 23
        e_rnd = e_norm + 1
    else:
        fsig = rsig
        e_rnd = e_norm
    ovf = int(e_rnd > 254)
    inexact = ovf | ng | nr | ns
    ev.update(tie=tie, tie_up=int(tie and lbit == 1), tie_dn=int(tie and lbit == 0),
              round_up=int(round_up), round_renorm=int(round_renorm))
    if exact_zero:
        res = 0x00000000
    elif ovf:
        res = (sign_big << 31) | 0x7F800000
    elif fsig & (1 << 23):
        res = (sign_big << 31) | ((e_rnd & 0xFF) << 23) | (fsig & 0x7FFFFF)
    else:
        res = (sign_big << 31) | (fsig & 0x7FFFFF)
    return res, invalid, ovf, inexact, ev

def add4_tree_events(a, b, c, d):
    r1 = add2_events(a, b)
    r2 = add2_events(c, d)
    rr = add2_events(r1[0], r2[0])
    res = (rr[0], r1[1] | r2[1] | rr[1], r1[2] | r2[2] | rr[2], r1[3] | r2[3] | rr[3])
    return res, (r1[4], r2[4], rr[4]), (r1, r2, rr)

if __name__ == '__main__':
    import sys
    # self-check against oracle.py's spec-level model on the RTL transcript
    from oracle import add2 as spec_add2
    path, limit = sys.argv[1], int(sys.argv[2])
    n = bad = 0
    with open(path) as f:
        for line in f:
            parts = line.split()
            if len(parts) != 3:
                continue
            ops, res, flags = parts
            a = int(ops[0:8], 16); b = int(ops[8:16], 16)
            m = add2_events(a, b)
            sp = spec_add2(a, b)
            rtl = (int(res, 16), int(flags[0]), int(flags[1]), int(flags[2]))
            n += 1
            if m[:4] != sp or m[:4] != rtl:
                bad += 1
                if bad <= 5:
                    print(f"MISMATCH {ops}: hw {m[0]:08x}/{m[1]}{m[2]}{m[3]} "
                          f"spec {sp[0]:08x} rtl {rtl[0]:08x}")
            if n >= limit:
                break
    print(f"hwmodel vs spec vs rtl: {n} pairs, {bad} mismatches")
