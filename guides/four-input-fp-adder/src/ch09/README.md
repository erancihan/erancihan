# Chapter 9 source — Building a 2-input FP adder in Verilog, module by module

<!-- sections complete: 6/6 -->

## Files

Every file was compiled and run under **Icarus Verilog 13.0** (built from tag
`v13_0`) on Linux x86-64 with `iverilog -g2012 -Wall`, zero compiler output on
every target. Expected constants in the unit testbenches come from an
independent python3 model written first; the corner library's constants are
chapter 8's, from exact rational arithmetic. The golden reference for the
equivalence sweep is `../ch08/fp32_add_alg.v`, itself proven against exact
arithmetic on 1,000,058 pairs in chapter 8's record.

### Design modules (chapter 8's algorithm, cut at its own step boundaries)

| File | Golden steps | Owns |
|---|---|---|
| `fp32_unpack.v` | 1 | field decode x2 via **ch07's `fp32_fields`** (instantiated, not re-derived): effective exponent `max(E,1)`, significand `{hidden, F}` |
| `fp32_screen.v` | 2 | the special-case result and `invalid`, via **ch07's `fp32_class`** x2 — a sibling of the datapath, not a stage of it |
| `fp32_swap.v` | 3 | magnitude compare on the packed bits `b[30:0] > a[30:0]`, operand ordering, `eff_sub` |
| `fp32_align.v` | 4 | exponent difference, the 5-bit clamp at 26, G/R/S capture via **ch02's `align_sticky`** at `W = 24` |
| `fp32_addsub.v` | 5 | the 27-bit add/subtract (chapter 8's width budget), sticky borrow, `exact_zero` |
| `fp32_normalize.v` | 6–7 | right-1 / none / left-N, the LZC, the subnormal stop; drives the 9-bit `e_norm` |
| `fp32_round_pack.v` | 8–9 | RNE decision, the rounding-carry renormalize, pack, `ovf`, `inexact_dp` |
| `fp32_add2.v` | 10 | the top: screen mux, flag gating — three assigns plus wiring, nothing else |

### Self-checking testbenches

| File | Files needed | Demonstrates |
|---|---|---|
| `tb_align_u.v` | `../ch02/align_sticky.v`, `fp32_align.v` | 9 directed vectors: G/R/S fill at d = 0..3, the clamp boundary d = 25 (leading bit parks in R), saturation at 26/27/200, sticky-from-bit-0. Check-count guard. |
| `tb_addsub_u.v` | `fp32_addsub.v` | 6 directed vectors: plain add, carry-out, G-live subtract, the sticky borrow, exact zero, and zero-operand ADD (`exact_zero` must stay 0 — the latent-bug vector). Check-count guard. |
| `tb_normround_u.v` | `fp32_normalize.v`, `fp32_round_pack.v` | 7 normalize + 9 round_pack vectors, including the isolated right-1 sticky fold, the subnormal stop, the rounding-carry renormalize (trivially reachable at module level), renormalize INTO overflow, and exact-sum overflow. Check-count guard. |
| `tb_equiv.v` | all 8 design files + `../ch02/align_sticky.v`, `../ch07/fp32_fields.v`, `../ch07/fp32_class.v`, `../ch08/fp32_add_alg.v` | **The golden-equivalence sweep**: both adders on the same operands, `{result, invalid, overflow, inexact}` compared with `!==` behind an explicit X-guard (both measured load-bearing — see the testbench mutations). 92 corner checks (count-guarded) + 100,000 five-regime random. Seed echoed, seeded once, first draw discarded. |
| `tb_corners_split.v` | design files + ch02/ch07 deps | Chapter 8's 46-pair corner library carried forward: same vectors, same expected values, same 92-check guard; six of thirteen coverage-bin references re-aimed into submodule instances. The empty-bin gate still fails the run if the four renormalize reachers stop reaching. |
| `tb_short.v` | design files + ch02/ch07 deps | 100,000 five-regime pairs against the one-add shortreal reference (NaN by class only), plus the sNaN exclusion vectors pinned at top level. Independent of chapter 8's correctness — the common-mode measurement below is why it ships alongside `tb_equiv`. |

## Runs and reproduction

```sh
cd .. && bash run_all.sh ch09     # 6 targets, all green (31 s on this container)
```

or by hand from this directory, e.g. the equivalence sweep:

```sh
iverilog -g2012 -Wall -o /tmp/sim ../ch02/align_sticky.v ../ch07/fp32_fields.v \
  ../ch07/fp32_class.v ../ch08/fp32_add_alg.v fp32_unpack.v fp32_screen.v \
  fp32_swap.v fp32_align.v fp32_addsub.v fp32_normalize.v fp32_round_pack.v \
  fp32_add2.v tb_equiv.v && vvp /tmp/sim
```

The manifest reaches into three earlier chapters on purpose: ch07's
classifier/field modules and ch02's aligner are *instantiated* by this
design, and ch08's `fp32_add_alg.v` is the golden reference `tb_equiv`
compares against — the equivalence claim is only real while the regression
compiles that exact file next to this one. All six `run` targets compile
with **zero** iverilog output under the warning-gated harness. Timing on
this container: `tb_equiv` at 100,092 checks, 20.6 s; `tb_short` at
100,000 pairs, 10.6 s; a 200,092-check `tb_equiv` variant ran 40.8 s —
quoted in the chapter's prose but not shipped, because it pushes against
the harness's 60 s `SIM_TIMEOUT`. Full-repo regression after adding this
chapter: **92/92**.

One transcript line is architecture-dependent by design and says so in
place: `tb_short` prints the host-quieted sNaN payload (`7fe00055` on this
x86-64 container) but asserts the DUT's own quieting and the pure
round-trip only, never a reference NaN's sign.

## Mutation record

Standing practice: every testbench must be shown able to fail. Each
mutation was applied to a **copy** of the named file in the session
scratchpad, rebuilt against the shipped testbenches, and run.
**33 mutations: 29 killed, 4 survivors, each survivor with a written,
measured reason.** Counts recounted from the tables below. "First
failure" quotes the first FAIL line of the first testbench that killed.

## Mutation record: design mutations, unit campaign

Seventeen mutants against the three unit testbenches (**15 killed, 2
survivors, both survivals measured as genuine equivalences**). Every kill
is a one-vector kill on a directed vector chosen from the module's
contract, with the offending field named in the message.

| # | File / mutation | Result | First failure |
|---|---|---|---|
| A-M1 | `fp32_align`: clamp threshold and value 26 → 24 | KILLED | d=25: `got 000000/111 want 000000/011` — bits that belong in R land in S and G |
| A-M2 | clamp deleted (`shamt = d[4:0]` raw) | KILLED | d=200 wraps to shift 8: `got 00c90f/111 want 000000/001` |
| A-M3 | `d = e_sml - e_big` | KILLED | d=1: `got 000000/001 want 6487ed/100` |
| A-M4 | `.guard`/`.round` connections swapped | KILLED | d=1: `got 6487ed/010 want 6487ed/100` |
| A-M5 | clamp value 26 → 27 (threshold kept) | **SURVIVED** | output-equivalent: ch02's `align_sticky` saturates internally at W+2 = 26, so the wrapper's clamp and the core's saturation overlap by one. Confirmed equivalent over the full 100,092-check sweep. A spec-vs-output gap: the wrapper *believes* it owns `shamt <= 26` but only the core's saturation enforces the behaviour. |
| B-M1 | `fp32_addsub`: sticky borrow dropped | KILLED | borrow vector: `got 0fffffd/0 want 0fffffc/0` |
| B-M2 | `exact_zero` loses the `eff_sub` gate | KILLED | zero-ADD vector: `got 0000000/1 want 0000000/0` — **and passes the entire 100,092-check end-to-end sweep**; see the masking matrix |
| B-M3 | small operand packed `{aligned, r, g}` | KILLED | G-live subtract: `got 0000003/0 want 0000002/0` |
| B-M4 | big operand packed `{2'b00, sig_big, 1'b0}` | KILLED | plain add: `got 2000000/0 want 3000000/0` |
| N-M1 | `fp32_normalize`: right-1 sticky fold dropped (`ns = s_in`) | KILLED | the isolated-fold vector: `got 800000/000/101 want 800000/001/101` |
| N-M2 | subnormal stop dropped (`shl = lz`) | KILLED | `got 800000/000/509 want 080000/000/1` — the exponent underflowed past zero |
| N-M3 | LZC scan starts at bit 24 | KILLED | no-shift vector: `got 91a55e/000/99 want c8d2af/000/100` |
| N-M4 | `right1 = carry` (`eff_sub` ignored) | **SURVIVED** | equivalent under the upstream invariant: an effective subtract can never set `sum27[26]` (chapter 8). The unit bench deliberately does not drive that impossible input — a contract has no expected output there. Confirmed equivalent over the full sweep. |
| R-M1 | `fp32_round_pack`: `round_up = ng & (nr\|ns)` (lbit dropped) | KILLED | tie-lbit=1 vector: `got 49c90fdb/0/1 want 49c90fdc/0/1` |
| R-M2 | rounding-carry renormalize deleted | KILLED | `got 80000000/0/1 want e4800000/0/1` — sign with an all-zero significand |
| R-M3 | overflow threshold 254 → 255 | KILLED | **flag-only kill**: `got 7f800000/0/1 want 7f800000/1/1` — the renormalized significand packs as infinity anyway; only `ovf` betrays it. Probed separately: at `nsig = C00000` exact, `e_norm = 255`, this mutant packs `7fc00000` — a fabricated qNaN — with both flags low. Flags are ports; test them like ports. |
| R-M4 | `inexact_dp` loses the `ovf` term | KILLED | exact-sum overflow vector, flag-only: `got 7f800000/1/0 want 7f800000/1/1` |

## Mutation record: design mutations at composition

Seven mutants of the composed design against `tb_equiv` (and, for the
last, `tb_short`): **6 killed, 1 survivor**. Mismatch counts are out of
100,092 checks.

| # | Mutation | Result | Evidence |
|---|---|---|---|
| I-1 | sticky borrow dropped (B-M1 in the full design) | KILLED | first kills inside the **corner phase**: `3f800001+b3800001: split 3f800001/001 golden 3f800000/001`; 2,689 mismatches total |
| I-2 | top narrows `sum27` to `[25:0]` | KILLED | compile warns twice ("Padding 1 high bits"), then the carry bit is gone: `4b7fffff+3f800000: split 00000000/000 golden 4b800000/000`; 20,573 mismatches. The harness's zero-output rule would already fail this as a target — the sweep shows what the warning was worth. |
| I-3 | top narrows `e_norm` to `[7:0]` | **SURVIVED the sweep** | the SAME two-warning diagnostic class, and 100,092/100,092 PASS: `e_norm` never exceeds 255 (`e_big <= 254` plus at most one right-1 increment), so the truncation is value-preserving — the ninth bit exists for the `+ round_renorm` headroom *inside* `fp32_round_pack`. A warning that is not (yet) a bug; the zero-output rule still fails it as a manifest target, which is the correct resolution of an undecidable diagnostic. |
| I-4 | `.s_in(s_al)` typo'd to `.s_in(s_a1)` in a `default_nettype wire` top | KILLED | X-guard: `3fc00000+bfc00000: X in outputs: split 00000000/00x golden 00000000/000`; 60,980 X-contaminated mismatches. Compile-time: silent without `-Wall`; `warning: implicit definition of wire 's_a1'` with it; an elaboration **error naming the instance and port** under `` `default_nettype none `` (the shipped modules all carry the directive). |
| I-5 | leftover bring-up driver: `assign result = dp_res;` added to the top | KILLED | compiles in total silence at `-Wall`; X-guard kills 168 mismatches — **every one a screened vector, every one partially-X** (`7fc00055+3f800000: split 7fX000XX/000`): the two drivers agree wherever `screen_res == dp_res`, so wire resolution only exposes the conflict on specials. |
| I-6 | `fp32_normalize` rewritten procedurally with the missing `frame == 0` arm (inferred latch) | KILLED | **4 flag-only mismatches, all exact-cancellation corners, 0 in 100,000 random**: `3fc00000+bfc00000: split 00000000/001 golden 00000000/000`. Icarus reports nothing at compile time. The latched state is a delta-cycle glitch (see the chapter); reversing two assignments in a driver task latches a state whose `inexact` is *correct*, hiding the bug entirely. |
| I-7 | RNE `lbit` term dropped in **BOTH** the golden copy and the split (common-mode) | KILLED — by `tb_short` only | `tb_equiv` **passed all 100,092 checks against the doubly-wrong pair**; `tb_short` killed it 6,890 times in 100,000 (6.9 %), first kill `196ad232+98baf931: dut 190d5599 ref 190d559a`. An equivalence sweep proves "same as chapter 8", not "correct". |

## The masking matrix

The record's headline: masking measured in both directions, so **neither
the unit suites nor the integration sweep is optional**. All rows run this
session.

| Bug | Unit TB | 100k end-to-end | Verdict |
|---|---|---|---|
| B-M2 (`exact_zero` gate dropped) | kills, 1 vector | `tb_equiv` passes 100,092/100,092 | **latent interface bug** — only unit-visible; the mask is structural (`eff_sub = 0` with `sum27 = 0` needs both operands zero, which the screen owns), so no black-box campaign of any size can see it. One refactor away from live; chapter 10 reuses this module. |
| A-M5 (clamp 27) | survives | passes | genuine equivalence; the spec/output gap belongs to the wrapper-vs-core saturation overlap |
| N-M4 (`right1 = carry`) | survives | passes | genuine equivalence under the swap invariant |
| G/R convention bug (author packs `{aligned, r, g}` AND that author's own unit TB expects it) | **passes x2** — `tb_addsub_wrong` 6/6, `tb_align_u` 9/9, each self-consistent | `tb_equiv` kills: first corner kill `3f800000+33800001: split 3f800000/001 golden 3f800001/001`; 19,795 mismatches | **only integration-visible** — unit tests verify each author's reading of an interface; only the composed reference verifies the readings agree |
| I-7 common-mode `lbit` (in both adders) | — | `tb_equiv` passes; `tb_short` kills 6,890/100,000 | the two references discharge different obligations; ship both |

## Mutation record: testbench-side mutations

Nine mutations of the shipped testbenches (**8 killed, 1 recorded
false-pass demonstration**) — what would have to break for each PASS to be
a lie, per the standing practice.

| # | Mutation | Result | Evidence |
|---|---|---|---|
| T-E1 | `tb_equiv`: `!==` weakened to `!=` AND the X-guard deleted, run against the I-4 typo design | **FALSE PASS — the recorded trap** | printed `PASS tb_equiv (92 corner checks + 100000 random, ...)` against a design with an undriven net. Every mismatch the bug produces is X-contaminated, and `X != X` evaluates to `x`, so the `if` never takes. The same weakened bench also false-passes the I-5 double-driven design. This is the measured reason the shipped file carries BOTH defences. |
| T-E2 | `tb_equiv`: `!==` weakened to `!=` but the X-guard KEPT, against the typo design | KILLED | the guard alone catches it: `3fc00000+bfc00000: X in outputs: ...` — weakening the comparison can no longer make the sweep vacuous |
| T-E3 | one corner pair deleted | KILLED | corner-count guard: `corner phase ran 90 checks, expected 92` |
| T-E4 | `N_PER_REGIME = 0` (random loop never runs) | KILLED | total-count guard against the literal: `92 checks ran, expected 100092` |
| T-C1 | `tb_corners_split`: ALL FOUR renormalize reachers deleted, count guard dutifully updated to 84 (ch08's T3c, re-verified on the split) | KILLED | coverage gate: `bins: ... round_renorm=0 sticky_sat=4` then `FAIL tb_corners_split: a required coverage bin is empty` — those four vectors are still the library's only reachers, and the gate provably executes |
| T-C2 | `sample_bins` calls deleted | KILLED | every bin empty; same gate |
| T-U1 | `tb_normround_u`: golden constant bent one ulp (`49C90FDC` → `49C90FDB` on the tie-up row) | KILLED | `got 49c90fdc/0/1 want 49c90fdb/0/1` — the python constants are load-bearing |
| T-U2 | `tb_addsub_u`: one check deleted | KILLED | check-count guard: `5 checks ran, expected 6` |
| T-S1 | `tb_short`: `NPR = 0` | KILLED | pair-count guard: `0 pairs ran, expected 100000` |

### What the record proves

The three levels back each other up, and each catches a class the others
provably miss: the unit suites kill the latent `exact_zero` bug that
100,092 end-to-end checks cannot see (B-M2), the equivalence sweep kills
the convention bug that leaves both unit suites green, and the shortreal
oracle kills the common-mode bug the equivalence sweep certifies. The
count guards and the coverage gate were each shown to fire; the `!==`
plus X-guard pairing has a recorded false pass (T-E1) standing behind it.
Recounted totals: 17 + 7 + 9 = **33 mutations, 29 killed, 4 survivors**
(A-M5, N-M4, I-3, T-E1), every survivor either measured equivalent,
resolved by the harness's zero-output rule, or preserved deliberately as
the demonstration of the trap the shipped testbench closes.
