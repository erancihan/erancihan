# Chapter 10 source — Extending to four inputs: tree vs sequential, associativity, accuracy

<!-- sections complete: 5/5 -->

## Files

Every file was compiled and run under **Icarus Verilog 13.0** (built from tag
`v13_0`) on Linux x86-64 with `iverilog -g2012 -Wall`, zero compiler output on
every target. Expected constants in the corner and reacher testbenches come
from the exact per-stage python3 model (chapter 8's validated `exact_add` /
`rne_bits`, extended by this chapter's single-rounding oracle; the extension
itself cross-validated on 620,400 checks, zero mismatches, before use).

### Design modules (pure composition -- no new datapath logic)

| File | Computes | Owns |
|---|---|---|
| `fp32_add4_tree.v` | `(a+b)+(c+d)` | 3 x ch09 `fp32_add2` in two levels; flags OR-accumulated across the three operations |
| `fp32_add4_seq.v` | `((a+b)+c)+d` | 3 x `fp32_add2` chained; same flag rule |
| `ref_add4.v` | both orders | `ref_add4_tree` / `ref_add4_seq`: 3 x ch08 `fp32_add_alg` wired in the SAME order as each DUT -- the chained-golden reference (style A), bit-exact including flags and NaN bits |

The association order AND the port-to-operand mapping are part of each
module's arithmetic specification (the chapter's Q1/Q3 pair: one multiset,
three result classes). Chapter 12 inherits the tree, with both pinned.

### Self-checking testbenches

| File | Demonstrates |
|---|---|
| `tb_equiv4.v` | **The order-faithful equivalence sweep**: both structures against both reference styles at once -- chained golden (`!==` on result AND all three ORed flags, NaN bits included) and chained `$shortrealtobits` round-trip (`!==` on result, NaN by class; sNaN operands delivered as bits). Four regimes (full / win10 / win2 / special-mix with a 14-entry special table), `$urandom` seeded once through an integer variable, first draw discarded. X-guarded; count guard with a nonzero precondition. Ships at 6,000 quadruples/regime (34.5 s here, inside the 60 s harness timeout); the chapter's headline is the same source at `-DNQ=60000`: **240,000 quadruples x 2 structures x 2 references, zero mismatches** (5 m 47 s this session). |
| `tb_corners4.v` | 28 directed checks against both structures at once: intermediate overflow that cancels (Q1-Q3), NaN born at every stage plus qNaN/sNaN operands (N1-N5), all 16 signed-zero combinations plus cancellation-generated zero (Z, Z1), inter-pair cancellation both directions (S1, S2), a subnormal crossing a composition boundary (SB). Ten **intermediate-event coverage bins** sampled hierarchically (stage-1 overflow, invalid born stage-1 vs final, final-stage exact_zero with finite nonzero operands, subnormal stage-1 result -- each per structure), with an empty-bin gate that fails the run. Count-guarded. |
| `tb_reach4.v` | ch08's four rounding-carry renormalize reachers rebuilt as composed quadruples (halving/quarter splits, every intermediate a genuine computed sum); white-box bins on `dut_t.u_add_r.u_round.round_renorm` and `dut_s.u_add3.u_round.round_renorm` must fire 4/4 in both structures; plain-quadruple negative control; count guard. |

## Runs and reproduction

```sh
cd .. && bash run_all.sh ch10     # 3 targets, all green
```

or by hand from this directory, e.g. the equivalence sweep at its headline size:

```sh
iverilog -g2012 -Wall -DNQ=60000 -o /tmp/sim ../ch02/align_sticky.v \
  ../ch07/fp32_fields.v ../ch07/fp32_class.v ../ch08/fp32_add_alg.v \
  ../ch09/fp32_unpack.v ../ch09/fp32_screen.v ../ch09/fp32_swap.v \
  ../ch09/fp32_align.v ../ch09/fp32_addsub.v ../ch09/fp32_normalize.v \
  ../ch09/fp32_round_pack.v ../ch09/fp32_add2.v \
  fp32_add4_tree.v fp32_add4_seq.v ref_add4.v tb_equiv4.v && vvp /tmp/sim
```

The manifest reaches into four earlier chapters on purpose: ch07's
classifier/field modules and ch02's aligner are instantiated by ch09's
`fp32_add2`, which both four-input structures instantiate three times, and
ch08's `fp32_add_alg.v` is the chained-golden reference -- the order-faithful
equivalence claim is only real while the regression compiles that exact file
next to these. All three `run` targets compile with **zero** iverilog output
under the warning-gated harness. Timing on this container: `tb_equiv4` at
24,000 quadruples, 34.5 s (~700 quadruples/s with 2 DUTs + 2 golden chains +
6 shortreal conversions per vector); the 10,000-quadruple probe used by the
mutation record, 14.3 s; the 240,000-quadruple headline, 5 m 47 s.
Full-repo regression after adding this chapter: **95/95**.

The chapter's python measurements (association census, 1.2 M-quadruple
accuracy sweep vs the single-rounding oracle, order-agreement-vs-CR, inexact
flag divergence, naive-reference cost) live in the chapter text with their
seeds and generators stated; all were re-run this session against chapter 8's
validated exact model.

## Mutation record: design mutations

Standing practice: every testbench must be shown able to fail, and the
composition-specific failure modes get mutations of their own. Each mutation
was applied to a **copy** of the named file in the session scratchpad,
rebuilt against the shipped testbenches, and run this session.
**18 mutation runs: 16 killed or gate-fired as required, 1 genuine survivor
with a structural proof, 1 recorded FALSE PASS (the false-oracle
demonstration, deliberate).** Counts recounted from the tables below.
Equivalence-sweep counts are out of the 10,000-quadruple probe (`-DNQ=2500`)
unless stated.

Nine design mutations (**8 killed, 1 survivor**):

| # | File / mutation | Result | Evidence |
|---|---|---|---|
| D1 | `fp32_add4_tree`: cross-wired as `(a+c)+(b+d)` | KILLED | `tb_equiv4`: **4,135 tree-side errors**, 0 seq-side -- a different (equally valid) association, caught exactly where the associations differ, mostly in the clustered regimes. A full-range-only sweep would be far weaker against this bug class. |
| D2 | `fp32_add4_seq`: wired `((a+b)+d)+c` | KILLED | `tb_equiv4`: **2,703 seq-side errors**, 0 tree-side; first kill `bd8fd94f 8a7b5ad6 c460b7b2 ca46b8c2 dut=ca46c6cd/001 ref=ca46c6ce/001` |
| D3 | flag OR dropped in BOTH wrappers (final-stage flags only) | KILLED | `tb_corners4`: 12 flag-only fails -- Q1 tree `100` for `111`, Q1 seq `000` for `011`, N1 `000` for `100` (a stage-1 `inf+(-inf)` delivers its qNaN with invalid=0: propagation is not invalid), Q2/N2-tree/N5/S1/S2. `tb_equiv4` also kills 3,935 times via the golden chain's FLAG comparison -- and **0 times via the shortreal reference**, which has no flags: the mutant survives every result-bits-only comparison, exactly as the chapter claims. |
| D4 | `u_add_ab`'s `.invalid`/`.inexact` port connections swapped | KILLED | `tb_corners4`: 5 flag fails {Q2, N1, N5, S1, S2}, first Q2 tree `110` for `011` -- invalid arriving on the inexact wire |
| D5 | stage-1 result truncated: `sum_ab` declared `[30:0]` | KILLED | 2 compile warnings ("Padding 1 high bits" -- the harness zero-output rule fails the target before simulation); functionally, `tb_equiv4` kills 7,788 times (first: `dut=7bc6d0a8` for `fbc6d0a8` -- the stage-1 SIGN lost) and `tb_corners4` kills on Z k=1111 (`-0` became `+0`) |
| D6 | common-mode: RNE `lbit` dropped in the SHARED `fp32_round_pack` (all six `fp32_add2` instances of both DUTs) | KILLED | `tb_equiv4`: 3,152 kills -- 785 tree + 791 seq via the golden chain AND the same counts again via the shortreal round-trip: two independent reference styles converge. The same mutant FALSE-PASSes the tree-vs-seq cross-check bench -- see X1 below. |
| D7 | common-mode: rounding-carry renormalize deleted in the shared `fp32_round_pack` | KILLED | `tb_reach4`: 9 fails -- all 8 reacher results wrong (`00000000` for `4b800000`: sign with an all-zero significand, ch09's R-M2 signature) plus the 4/4 fire-count guard |
| D8 | `fp32_add4_tree`: final instance operands swapped, `u_add_r(.a(sum_cd), .b(sum_ab))` | KILLED | `tb_equiv4` golden chain only: 8 kills in the probe (20 at the shipped 24,000), **every one a special-mix quadruple where both level-1 sums are NaN with different payloads** (`dut=7fc00000 ref=7fe00000` and mirror) -- value-commutative, NaN-payload-order sensitive. The class-only shortreal reference sees nothing (0 kills): the special-mix regime and the bit-exact style-A reference are both load-bearing. |
| D9 | ch09's B-M2: `exact_zero` gate dropped in the SHARED `fp32_addsub` -- the latent bug ch09's bridge told this chapter to watch | **SURVIVED** | Passes the 10,000-quadruple probe, the shipped 24,000-quadruple sweep, all 28 corners (16 zero combinations and every cancellation vector included), and the reachers. Structural reason, provable at any campaign size: the mutant differs only when `eff_sub=0` with `sum27=0`, which requires both significands zero, i.e. both operands of that instance zero -- and a zero operand is screened INSIDE every `fp32_add2`, so the wrong `exact_zero` is multiplexed into oblivion at whatever depth the instance sits. Composition changed the operand distribution, not the mask. ch09's `tb_addsub_u` remains this bug's only witness; the unit suites ride into ch12 unretired. |

## Mutation record: reference and testbench mutations

Eight mutations of the shipped testbenches (**8 killed** -- each either
fails loudly against the correct design, proving the discipline it breaks
load-bearing, or trips the guard it attacks):

| # | Mutation | Result | Evidence |
|---|---|---|---|
| T1 | `tb_equiv4`: seq's shortreal reference computed in TREE order | KILLED | against the CORRECT design: **1,369 false failures in 10,000 -- exactly the probe's tree!=seq census (17+607+731+14)**. An order-unfaithful reference fails a correct DUT on precisely the quadruples where the two orders differ, at the rate the census table predicts. |
| T2 | `tb_equiv4`: round-trips dropped from the tree reference (all four operands summed in shortreal doubles, tree-shaped `(a+b)+(c+d)` association, one rounding) | KILLED | against the correct design: **1,562 false failures in 10,000**, concentrated in the clustered regimes -- the Verilog twin of the measured naive-reference cost (1.27 % full / 28.1 % win10 / 31.6 % win2) |
| T3 | `tb_equiv4`: `-DNQ=0` (random loops never run) | KILLED | count-guard precondition: `FAIL tb_equiv4: check count 0 (expected 0, nonzero)` -- `checks !== 4*NQ` alone is satisfied by NQ=0, which is why the shipped guard also demands nonzero |
| T4 | `tb_corners4`: Q1 and Q2 deleted, count guard dutifully adjusted 28 -> 26 | KILLED | empty-bin gate: `bins: ovf_s1 t=0 s=0 ...` then `FAIL tb_corners4: a required intermediate-event coverage bin is empty` -- those vectors are the only stage-1-overflow reachers, and the gate provably executes |
| T5 | `tb_corners4`: `sample_bins` call deleted | KILLED | every bin zero; same gate |
| T6 | `tb_corners4`: S2's tree constant bent one ulp (`4B800001` -> `4B800000`) | KILLED | `FAIL S2 tree: ... -> 4b800001 expected 4b800000` -- the python-pinned constants are load-bearing |
| T7 | `tb_reach4`: tree bin re-aimed at a STAGE-1 rounder (`u_add_ab` instead of `u_add_r`) -- an existing wire, so it elaborates | KILLED | fire-count guard: `FAIL tb_reach4: fires tree=0 seq=4, expected 4/4`. A wrong-but-existing hierarchical path reads zero forever; only the count guard sees it. |
| T8 | `tb_reach4`: stale hierarchical path (nonexistent wire name) | KILLED | elaboration error naming the path: ``error: Unable to bind wire/reg/memory `dut_t.u_add_r.u_round.round_renorm_q'`` -- exit 2, the build fails, the good direction (ch09's re-aiming rule, reconfirmed at composition depth) |

**Added in the review fix round (2026-08-20): N4/N5 payload assertions.** The
corner table always listed exact result bits for the two propagated-operand NaN
rows (`7FC00001`, `7FE00000`) but the bench asserted class+quiet only. The `chk`
task now asserts `res[22:0]` against a nonzero NaN-row expectation (sign still
never compared; generated-NaN rows pass 0 and stay class-only, per the
portability rule). Mutation-proved both ways in a scratch copy: corrupting the
N4 expectation to `7FC00002` fails both structures ("FAIL N4 tree/seq"), and
the shipped bench passes 3/3.

## The false-oracle demonstration, and what the record proves

| # | Demonstration | Result | Evidence |
|---|---|---|---|
| X1 | `tb_cross4.v` (scratch-only, deliberately not shipped): drives the three-regime campaign and trusts every `tree === seq` quadruple as "cross-checked" -- no golden model, no oracle. Not trivially vacuous: X-guarded, count-guarded, fails if full-range agreement drops below 95 % (measured ~99.3 %). Run against mutant D6 (RNE tie-break broken in all six shared rounders). | **FALSE PASS -- the recorded trap** | correct design: `PASS tb_cross4 (7500 quadruples, 6145 cross-checked by tree==seq agreement)`; D6 mutant: `PASS tb_cross4 (7500 quadruples, 6159 cross-checked ...)` -- the broken design agreed with itself on 14 MORE quadruples than the correct one. `tb_equiv4` kills the same mutant 3,152 times. The python twin of the lesson: 20.46 % (win10) / 21.51 % (win2) of order-agreeing quadruples differ from the correctly rounded sum even in a CORRECT design -- agreement measures sameness, not rightness. |

### What the record proves

The composition-specific failure modes all have a witness, and each witness
was shown able to fail: the wiring of the association (D1/D2, killed at the
census-predicted rate), the flag union (D3/D4, flag-only kills invisible to
result-bits comparisons), the interface widths (D5, plus the harness's
zero-output rule), the shared-rounder common mode (D6, killed by both
independent reference styles, false-passed only by the cross-check
non-oracle), the rare-path plumbing (D7/T7/T8, result checks + fire counts +
elaboration), and NaN payload ordering (D8, killed only by the bit-exact
golden chain on special-mix vectors). The reference discipline is
load-bearing in both measured directions: breaking order-faithfulness or the
round-trip makes the bench fail CORRECT hardware (T1/T2), which is exactly
as dangerous as passing broken hardware. Recounted totals: 9 design + 8
testbench + 1 demonstration = **18 runs: 16 killed/gate-fired, 1 survivor
(D9 -- structurally masked at any depth; ch09's unit bench remains its only
witness), 1 recorded false pass (X1 -- the deliberate demonstration that
"both orders agree" is not an oracle; the shipped `tb_equiv4` closes it).**
