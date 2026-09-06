# Chapter 10 research — Extending to four inputs: tree vs sequential, associativity, accuracy

<!-- sections complete: 15/15 -->

Research notes for the chapter that composes ch09's verified `fp32_add2` into
four-input structures. Method: build both structures, verify each against an
order-faithful reference, measure accuracy against the correctly rounded
four-input sum, and demonstrate every seeded corner case with concrete vectors.

## 1. Scope, method, and artifacts

Chapter 10 composes ch09's verified `fp32_add2` into two four-input structures —
tree `(a+b)+(c+d)` and sequential `((a+b)+c)+d` — and answers, by measurement:
what does composition do to correctness (nothing, when the reference honors the
composition order), what does it do to accuracy against the ideal single-rounding
sum (up to a third of clustered-exponent quadruples move, but rarely far), and
which structure should chapter 12 build (tree, for latency; accuracy does not
decide it — neither structure is systematically closer to the correctly rounded
answer). Everything below was built and run this session; no claim rests on the
literature except section 13, which says so.

**Method.** Prototypes in the session scratchpad (`ch10/`), nothing under
`guide/` but these notes. All Verilog compiled `iverilog -g2012 -Wall` with
zero compiler output and run under `vvp` (Icarus 13.0, `/usr/local/bin`).
Python ground truth reuses ch08's validated `fp32lab.py` (`rne_bits` — the
from-scratch RNE encoder, `exact_add` — exact rational one-add, `val`,
`classify`), extended by a ch10 lab (`f4.py`) that is itself cross-validated
before use (section 3). Random campaigns seed **once** per run and, in Verilog,
discard the first draw (the ch05 `$urandom(seed)` linearity rule; the seed is
passed through an `integer` variable because a literal seed is a `vvp`
load-time error — ch04's finding, re-confirmed here when the first compile of
`tb_equiv4.v` died at load with `$urandom's seed must be an integer/time
variable or a register`).

**Artifacts (scratchpad `ch10/` unless noted):**

| file | what it is |
|---|---|
| `../fp32_add4_tree.v` | 3 × `fp32_add2`, two levels, flags OR-accumulated |
| `../fp32_add4_seq.v` | 3 × `fp32_add2` chained, flags OR-accumulated |
| `ref_add4.v` | `ref_add4_tree` / `ref_add4_seq`: 3 × ch08 `fp32_add_alg` in the same orders |
| `f4.py` | fast struct-based binary32 add + `cr4` single-rounding oracle + generators; self-validating |
| `tb_equiv4.v` | 240,000-quadruple equivalence sweep, 2 structures × 2 reference styles |
| `sweep4.py` | 1.2 M-quadruple accuracy sweep vs the correctly rounded sum |
| `corners.py` | exact per-stage expectations for every directed corner |
| `tb_corners4.v` | 28 directed checks, both structures, python3-pinned expectations |
| `reach.py` / `tb_reach4.v` | ch08's four renormalize reachers rebuilt from composed inputs |
| `naiveref.py` | cost of the un-round-tripped reference, per regime |

**Experiment count:** 9 numbered experiments (E1 compile/structure, E2
reference cross-validation, E3 Verilog equivalence sweep + 3-mutation kill
check, E4 accuracy sweep with flag-divergence and order-agreement
follow-ups, E5 overflow-cancel corners, E6 NaN/signed-zero corners, E7
inter-pair cancellation + wild-example mining, E8 reacher composition, E9
naive-reference cost), ~2.7 M operand-quadruple evaluations plus 620,400
pair-level validation checks.

## 2. The two structures, built and compiled

**E1.** Both four-input adders are pure composition — three `fp32_add2`
instances and three OR gates each; no new datapath logic anywhere:

```verilog
// fp32_add4_tree: (a+b)+(c+d), two levels
fp32_add2 u_add_ab (.a(a),      .b(b),      .result(sum_ab), ...);
fp32_add2 u_add_cd (.a(c),      .b(d),      .result(sum_cd), ...);
fp32_add2 u_add_r  (.a(sum_ab), .b(sum_cd), .result(result), ...);

// fp32_add4_seq: ((a+b)+c)+d, three chained
fp32_add2 u_add1 (.a(a),       .b(b), .result(sum_ab),  ...);
fp32_add2 u_add2 (.a(sum_ab),  .b(c), .result(sum_abc), ...);
fp32_add2 u_add3 (.a(sum_abc), .b(d), .result(result),  ...);
```

Both compile with **zero `iverilog -g2012 -Wall` output** against the full
ch09 source set (which pulls in ch07's `fp32_fields`/`fp32_class` and ch02's
`align_sticky` — the chapter should note the cross-chapter file list, because
`fp32_add2` alone does not elaborate).

**Flag composition is a design decision, made explicit.** Each wrapper ORs
`invalid`/`overflow`/`inexact` across its three instances. That is the IEEE
754 "computed as three separate additions" reading: each operation raises its
own exceptions and the status flags accumulate (union). The corner runs in
sections 7–8 confirm the OR carries stage-1 events to the output even when
the final stage's own flags are clean (Q1: `overflow` from level 1 survives
alongside `invalid` from level 2), and that it does NOT invent flags (N4: a
quiet-NaN operand propagates with all three flags low in both structures).
An alternative semantics — flags of the final operation only — would lose the
overflow in Q1 and is *not* what three discrete IEEE additions do. Chapter 12
should state the OR rule in the design document, not leave it implicit in the
wrapper.

**What the structures are *not*.** Neither wrapper rounds fewer than three
times. Every intermediate is a finished binary32 value; the composition
inherits `fp32_add2`'s per-operation correctness and therefore *cannot* be
"more accurate than IEEE" anywhere. Architectures that defer rounding are
real but different hardware (section 13).

## 3. Two reference styles, measured to agree

A four-input DUT admits two order-faithful reference styles, and chapter 12
will want both, so their agreement had to be established before either was
trusted (E2).

**Style A — chained golden algorithm:** three ch08 `fp32_add_alg` instances
wired in the DUT's own order (`ref_add4_tree` / `ref_add4_seq` in
`ref_add4.v`), flags ORed the same way. This is structure-level: since ch09
proved `fp32_add2` bit-identical to `fp32_add_alg` (result and all three
flags, NaN sign included, 200,092 checks), the chained reference should match
the DUT *exactly*, NaN bits included.

**Style B — chained `shortreal` round-trip:** in-testbench, each add computed
in the simulator's double arithmetic and forced through `$shortrealtobits` —
the only rounding point that exists (ch07: `shortreal` assignment does not
round) — with every intermediate re-expanded by `$bitstoshortreal`:

```verilog
function [31:0] rt_add(input [31:0] x, input [31:0] y);
  shortreal sx, sy;
  begin
    sx = $bitstoshortreal(x);  sy = $bitstoshortreal(y);
    rt_add = $shortrealtobits(sx + sy);
  end
endfunction
// tree: rt_add(rt_add(a,b), rt_add(c,d));  seq: rt_add(rt_add(rt_add(a,b),c),d)
```

This is a *true* binary32 one-add oracle because the innocuous-double-
rounding condition holds (binary64's p = 53 ≥ 2·24 + 2; ch08 §8's safe
harbor): rounding the exact sum of two binary32 values to binary64 and then
to binary32 equals rounding it directly to binary32. Chaining does not
stretch that argument — each `rt_add` is one two-operand add, rounded once.

**The python twin (E2) was validated first.** `f4.py`'s `fadd` mirrors style
B on the host (double add + one `struct.pack('<f')` rounding, `OverflowError`
→ ±inf, NaN → class): checked against ch08's exact rational `exact_add` on
400 directed boundary pairs (zeros, subnormal min/max, ±max, ±inf, tie
patterns, the reacher operands) **plus 600,000 random pairs across the three
regimes, plus 20,000 `cr4`-vs-`exact_add` pair checks: 620,400 checks, zero
mismatches** (`validate: 620400 checks, fadd mismatches=0, cr4-vs-exact_add
mismatches=0`). So the fast sweep adder and the single-rounding oracle both
agree with the exact rational model before any four-input number was taken.

**Styles A and B agree on every swept vector — transitively.** In section
4's run, each DUT matched style A with `!==` on result and flags *and*
matched style B with `!==` on result (NaN by class) on all 240,000 quadruples
— 480,000 structure-reference comparisons. Two references that both equal
the DUT bit-for-bit equal each other; there is no vector in the campaign on
which the golden-algorithm chain and the round-tripped `shortreal` chain
diverge. The one systematic reservation: on NaN results the comparison is
class-level, because a generated NaN's sign is architecture-dependent (this
host produces `ffc00000` from `inf + (−inf)` via shortreal; STATE.md
2026-08-16) and payload propagation through style B is the simulator's
choice, not the RTL's. sNaN operands can only be delivered as bits — a
`shortreal` round-trip quiets them with no arithmetic (ch07) — which the
special-mix generator does.

## 4. Equivalence: each structure is bit-identical to its order-faithful reference

**E3, the chapter's central verification.** `tb_equiv4.v` instantiates both
DUTs and both style-A references, computes both style-B references per
vector, and drives four regimes × 60,000 quadruples — the three generators of
section 5 (rebuilt on the `$urandom` stream: exponent draws by modulo, bias
< 2⁻²⁴, stated not hidden) plus a **special-mix** regime in which each
operand is, with probability 1/4, drawn from a 14-entry table (±0, ±inf,
qNaN `7FC00000`, sNaN `7FA00000` by bits, ±maxnormal, ±minimum subnormal,
`007FFFFF`, `00800000`, ±1.0) and otherwise a full-range normal. Every check
uses `!==` with an explicit X-guard (`^result === 1'bx` fails), per ch09's
vacuous-`!=` finding. The count guard fails the bench if fewer than 240,000
quadruples were actually checked.

```
tree!=seq per regime (of 60000 each): full=402 win10=14403 win2=18003 specialmix=342
PASS tb_equiv4 (240000 quadruples x 2 structures x 2 references)
```

Zero mismatches anywhere: for every one of 240,000 quadruples, in both
structures, the RTL result and all three ORed flags equal the chained-golden
reference **exactly** (NaN bit patterns included — composition preserves
ch09's bit-level equivalence, as it must, since identical modules see
identical stage inputs), and the result equals the chained `shortreal`
round-trip reference (NaN by class). Throughput, measured on the 10,000-
quadruple probe: 14.7 s ≈ **680 quadruples/s** with 2 DUTs + 2 golden
references + 6 `shortreal` conversions per vector (the full run,
backgrounded, is ~6 minutes at that rate) — a data point for sizing chapter
12's regression: ch05's bare-reference throughput of ~288 k transactions/s
does not survive this much instantiated RTL.

**What this run proves, precisely:** each four-input structure is a correct
implementation of *its own composition order* — three correctly rounded
IEEE additions in the declared association. **What it deliberately does not
prove:** that either structure computes the correctly rounded four-operand
sum. It does not (sections 5–6 quantify the gap). Correct-per-composition
and correctly-rounded-as-one-operation are different specifications, and the
chapter's design document must say which one it is promising. The special-
mix regime also retires a real risk: 60,000 quadruples salted with signed
zeros, infinities, quiet and signalling NaNs produced no case where the
structures mishandled a special value relative to either reference — the
screen logic composes.

The in-TB tree-vs-seq census (both-NaN counted equal): full 402/60,000 =
0.67 %, win10 24.01 %, win2 30.01 %, special-mix 0.57 % — the independent
RNG confirmation of section 5's python rates.

**Mutation check (standing practice: what would have to break for these
benches to FAIL?).** Three mutations, all killed, run at 2,500
quadruples/regime:

- **A — wiring slip:** tree rewired as `(a+c)+(b+d)`. `tb_equiv4` reports
  **4,135 tree-side errors** in the 10,000-quadruple run — the swap is a
  different (equally valid!) association, so it is caught exactly where the
  associations differ, mostly in the clustered regimes. A full-range-only
  sweep would have been much weaker against this bug class.
- **B — flag OR dropped** (final-stage flags only). `tb_corners4` fails on
  Q1 (`100` for `111`), Q2 (`000` for `011`), N1/N2/N5 (`000` for `100`),
  S1... The N1 row is the teaching moment: with final-only flags a stage-1
  `inf+(−inf)` delivers its poisoned qNaN with **invalid = 0**, because the
  final stage only *propagates* an operand NaN and propagation is not
  invalid. The OR in section 2 is load-bearing, and only directed corner
  checks see it — mutation B survives every result-bits-only comparison.
- **C — order-unfaithful reference:** the seq structure's `shortreal`
  reference computed in tree order. `tb_equiv4` reports **1,369
  seq-vs-shortreal errors — exactly the probe's tree≠seq census
  (17+607+731+14)**: an order-mismatched reference fails a correct DUT on
  precisely the quadruples where the two orders differ, no more, no fewer.
  This is section 11's rule 2 demonstrated as a testbench failure mode, with
  its false-failure rate predicted by section 5's table.

## 5. How often the structures disagree: tree vs sequential by regime

**E4 (python leg), 400,000 quadruples per regime, `random.Random(20261020)`
seeded once.** Generators, stated exactly (all operands: sign = 1 uniform
bit, fraction = 23 uniform bits):

- `G_full`: exponent uniform on [1, 254] per operand (normals only);
- `G_win10`: per-quadruple base e₀ uniform on [11, 244], each exponent
  uniform on [e₀−10, e₀+10];
- `G_win2`: base e₀ uniform on [3, 252], each exponent uniform on [e₀−2, e₀+2].

Adds performed by the validated fast adder (section 3); `tree ≠ seq` compares
final bit patterns:

```
regime   tree != seq            (ch08 triples, for shape)
full     2,617 / 400,000 =  0.65 %      0.64 %
win10   95,972 / 400,000 = 23.99 %     21.79 %
win2   120,457 / 400,000 = 30.11 %     32.41 %
```

The four-input rates land within about two points of ch08's *triple* regime
table (0.64 / 21.79 / 32.41) — the shape carries over intact: spread the
exponents and grouping almost never matters; cluster them (the accumulator
case) and **roughly one random quadruple in four to three changes its bit
pattern when you change the association**. The independent Verilog census
inside `tb_equiv4.v` (different RNG, different draw counts — `$urandom`
stream vs python `Random`) agrees: 0.68 % / 24.3 % / 29.2 % on its own 2,500-
quadruple-per-regime probe, and the 60,000-per-regime run in section 4 pins
it tighter.

Two readings the chapter must keep apart:

1. **This is not an error rate.** Neither structure is wrong on any of these
   quadruples; each is exactly the value its own three-add composition
   specifies. The number measures how underdetermined "the sum of four
   numbers" is until the design document fixes the order.
2. **The rate is a property of the stimulus generator**, exactly as ch08
   warned about its census numbers. Quote it with the generator attached,
   never as "FP addition disagrees with itself 30 % of the time".

## 6. Accuracy against the correctly rounded four-input sum

**E4 (main leg), same 1.2 M quadruples.** The yardstick `cr4(a,b,c,d)` is the
"as if infinitely precise, rounded once" answer: each finite operand is taken
to its exact scaled-integer form M·2^q, the four integers are aligned and
summed exactly, and the exact total is rounded **once** by ch08's validated
`rne_bits` (exact zero → +0 under RNE). `cr4` was itself checked against
`exact_add` on 20,000 pairs padded with zeros before use (section 3). Error
is measured in **representable-step distance**: map each finite bit pattern
to the signed lattice index (negative patterns → −magnitude), subtract. One
step = one representable binary32 value; adjacent-value error = 1.
Quadruples whose structure result or CR overflowed are excluded from the
distance statistics and counted (`nonfinite`): 79 / 50 / 453 per regime.

```
regime  structure  !=CR      steps: 0 / 1 / 2 / >=3          mean     max
full    tree       1.63 %    393390 / 6360 /  80 /  91       0.0231   1288
full    seq        1.63 %    393383 / 6370 /  82 /  86       0.0231   1288
win10   tree      28.05 %    287746 /103555 / 3665 / 4984    0.5272   5162
win10   seq       27.99 %    287997 /102428 / 4481 / 5044    0.5312   4096
win2    tree      31.74 %    272749 / 97020 /14945 /14833    1.9664   196608
win2    seq       33.09 %    267331 /100684 /16859 /14673    1.6214   196608
```

Strictly-closer counts (both finite, unequal distances): full — tree 1,305 vs
seq 1,299; win10 — tree 46,965 vs **seq 47,750**; win2 — **tree 59,799** vs
seq 56,480. The winner *flips between regimes*, and within win2 the mean
favors seq while the strictly-closer count and the ≠CR rate favor tree.

**The honest headline: neither structure is systematically more accurate at
n = 4.** The differences are fractions of the between-regime differences, the
direction is not stable, and the means are dominated by rare massive-
cancellation outliers — the win2 maximum (196,608 steps) is hit by *both*
structures on the *same* quadruple (`FB284946 FB17B457 7AC276BF 7B5EC2A8`,
two large negatives against two large positives; the surviving value is tiny
relative to the operands, so the cancelled leading bits make the absolute
step distance huge while every individual add was correctly rounded). This is
consistent with the summation theory: pairwise summation's worst-case bound
grows O(ε log n) against sequential's O(ε n) [Higham 1993, via the pairwise-
summation article — fetch-verified], but at n = 4 that is a critical-chain
length of 2 roundings vs 3 — a bound ratio of 1.5, invisible under random
stimulus. **The tree's accuracy advantage is an asymptotic story; chapter 10
must not sell it as a measurable n = 4 effect, because it is not one.**

What IS measurable: (a) with full-range exponents both structures return the
*exactly rounded* four-operand sum on 98.37 % of quadruples, and 99.96 % land
within 1 step of it; (b) clustering the exponents moves ~28–33 % of results
off the correctly rounded value, but 96–99 % stay within 2 steps (98.7 %
win10, 96.3 % win2); (c) the
tail is where composition genuinely hurts — inter-pair cancellation can cost
thousands of steps (section 9 works directed examples), and no choice of
order fixes it; only deferred rounding (section 13) does.

**The `inexact` flag diverges from the single-rounding model even when the
bits agree — measured, one-way.** 100,000 quadruples per regime (seed
20261011), tree order, per-stage exact model: among quadruples whose
composed result is **bit-equal to CR**, the composition's ORed `inexact`
differs from the single-rounding model's on **0 (full), 0.362 % (win10),
7.095 % (win2)** — and every one of those is composed-inexact-set /
CR-exact; the reverse direction occurred **0 times in 300,000**. The reverse
is in fact impossible, and the chapter can prove it in two lines: if all
three stages are exact, the composed result *is* the exact four-operand sum,
so the sum is representable and CR's inexact is 0 too. The forward direction
is real and common under clustering: intermediate roundings can cancel in
*value* while the flag records that they happened. Concrete swept example:
`464F7804 47B381F1 466DF600 C6A45DF6` — stages round (inexact pattern
1,0,1), yet the final `47C21834` equals CR and the true sum is exact. So the
composed `inexact` is the honest flag *for the composition* but overstates
inexactness relative to the compound-sum reading — one more place where the
two specifications part company, and a direct instruction for chapter 12:
**predict flags from the chained reference, never from the single-rounding
model.**

**Order-agreement is not correct rounding — measured.** 50,000 quadruples
per regime, seed 20261010: among quadruples where tree and seq *agree*, the
common value still differs from CR on **1.32 %** (full), **20.46 %** (win10),
**21.51 %** (win2). So "both orders gave the same answer" certifies almost
nothing in the clustered regimes — a fifth of the agreeing results are still
not the correctly rounded sum, because both orders made the *same* rounding
sacrifice. The chapter should kill the tempting inference explicitly: cross-
checking two association orders is not an oracle for the single-rounding
answer.

## 7. Corner case: intermediate overflow that later cancels

**E5 — ch05's seed, worked exactly and run on the RTL** (`corners.py` for the
per-stage exact expectations, `tb_corners4.v` for the hardware; the RTL
matched the exact model on every vector and flag below).

**Q1: `a=b=maxnormal, c=d=−maxnormal` (`7F7FFFFF ×2, FF7FFFFF ×2`). True sum
= 0.** Captured, both structures:

```
Q1: tree=7fc00000 inv/ovf/inx=111 | seq=7f800000 inv/ovf/inx=011
```

Ledger, tree: level 1 computes `max+max` → exact sum 2·maxnormal = 2¹²⁹·(1−2⁻²⁴),
far beyond the format, which rounds under RNE to **+inf, overflow+inexact**; the other pair gives **−inf** the same way; level 2 then
faces `(+inf) + (−inf)` — the one case where infinity arithmetic has no
answer — and produces **qNaN, invalid**. Final: NaN with all three flags up,
each flag earned at a different point in the tree. Ledger, seq: `max+max` →
+inf; +inf + (−max) = +inf *exactly* (infinity is absorbing through the
screen; no new flag); +inf + (−max) again = +inf. Final: **+inf,
overflow+inexact, no invalid** — the second infinity operand never meets a
−inf, so no invalid ever fires.

**The honest IEEE answer: both structures are RIGHT.** Computed as three
separate binary32 additions in the declared order, +inf (seq) and qNaN
(tree) are *the correctly rounded results of those operation sequences* —
every single add above is exactly what IEEE 754 specifies for its operands.
The finite true sum (0, or maxnormal in Q2) is the answer to a *different
question* — the single-rounding compound sum `cr4` — which no composition of
correctly rounded two-input adds is obliged to produce, and which once an
intermediate saturates *cannot* be produced: infinity is absorbing (ch08 T2),
and NaN is absorbing through infinity. There is no bug to fix here; there is
a specification to choose.

**Q2: `max, max, −max, +0`. True sum = maxnormal.** Both structures return
`7F800000` with `ovf,inx` — tree's level-2 `(+inf)+(−max)` and seq's chain
both absorb. The correctly rounded answer `7F7FFFFF` is finite; both
compositions lose it to the intermediate range, not to rounding error. This
is the sharpest demonstration that **binary32's range, not just its
precision, is part of what composition sacrifices.**

**Q3: same multiset as Q1, interleaved `max, −max, max, −max`. Both
structures: `+0`, no flags** — every stage cancels exactly (Sterbenz-clean),
matching CR. So from **one multiset of four operands**, the delivered answer
across structures and operand orders is **qNaN, +inf, or +0** — and only the
last equals the single-rounding sum. Operand *order at the ports*, not just
tree shape, is part of the arithmetic specification: `fp32_add4_tree` applied
to a permutation of its own inputs changes class, not just value. Chapter 12's
design document must therefore pin BOTH the association structure AND the
port-order convention, and its verification plan must treat permutations of
the same values as distinct vectors.

The random campaigns brush this too: the full-range sweep produced 79
quadruples (of 400,000) whose structure result or CR was nonfinite, and
win2 produced 453 — intermediate overflow is rare under random stimulus but
not negligible, and only directed vectors pin the three-way outcome split.

## 8. Corner cases: intermediate NaN poisoning; signed-zero composition

**E6, all captured from `tb_corners4.v` and pinned by `corners.py`.**

**NaN poisons from every position, in both structures** — five directed
vectors, RTL output:

```
N1: tree=7fc00000 inv/ovf/inx=100 | seq=7fc00000 inv/ovf/inx=100
N2: tree=7fc00000 inv/ovf/inx=100 | seq=7fc00000 inv/ovf/inx=100
N3: tree=7fc00000 inv/ovf/inx=100 | seq=7fc00000 inv/ovf/inx=100
N4: tree=7fc00001 inv/ovf/inx=000 | seq=7fc00001 inv/ovf/inx=000
N5: tree=7fe00000 inv/ovf/inx=100 | seq=7fe00000 inv/ovf/inx=100
```

- **N1** `(+inf, −inf, 1, 1)`: the NaN is born in stage 1 (tree pair 1 / seq
  stage 1) and survives two subsequent adds in seq, one in tree. `invalid`
  raised at birth, carried by the OR.
- **N2** `(1, 1, +inf, −inf)`: tree births the NaN in pair 2; seq *never
  computes `inf+(−inf)`* — its chain is `2 + inf = inf`, then `inf + (−inf)`
  = NaN at stage **3**. Same final class+flag, different birth site.
- **N3** `(+inf, 1, 2, −inf)`: constructed so the NaN is born only at the
  **last** level in *both* structures (tree level 2 sees `+inf` vs `−inf`
  from its two pairs; seq stage 3 sees `+inf` vs `−inf`). This is the vector
  that proves the final stage's invalid path is reachable from composed
  inputs — a distinct coverage bin from N1/N2 (section 12).
- **N4** qNaN operand `7FC00001`: propagates **with payload intact through
  both compositions** (`7fc00001` out — the RTL's screen forwards the NaN
  operand's bits, and every later stage forwards them again), and `invalid`
  stays **0**: a quiet NaN in is not an invalid operation. A testbench that
  asserts `invalid` on every NaN result dies here.
- **N5** sNaN operand `7FA00000` (delivered as bits — never through a
  `shortreal`): result `7fe00000` — payload kept, quiet bit set — `invalid`
  raised. Composition preserves ch09's quieting behavior; the quieted NaN
  then rides the same propagation as N4.

The chapter should state the general fact plainly: **NaN and infinity are
absorbing through every later stage, so a stage-1 special event is never
"diluted" by three more operands** — but the *flags* tell you where it
happened only because the OR accumulates them; the result alone does not
distinguish N1 from N3.

**Signed zero composes — all 16 combinations, measured:**

```
Z: all 16 zero-sign combinations: -0 iff all four -0, else +0 (both structures)
```

The two-input rule (`(+0)+(−0) = +0` under RNE; like signs keep their sign)
composes to exactly the clean generalization: **the four-input result is −0
iff every operand is −0, else +0** — in both structures, all flags low, RTL
matching the exact model on all 16 × 2 checks. Induction sketch the chapter
can use: any +0 appearing anywhere forces the running/pair result to +0, and
+0 meeting −0 stays +0. Also `Z1` `(1, −1, −0, −0)`: the +0 *generated by
cancellation* (a different producer path than a zero operand — ch05's F1
distinction) meets the −0 chain and correctly yields +0 in both structures.
The signed-zero specification survives composition with no new cases —
worth one sentence and one table in the chapter, mostly to retire the worry.

## 9. Inter-pair cancellation: measured examples in both directions

**E7.** Cancellation between *pairs* — where what one operand should cancel
sits in a different subtree/stage than the operand itself — is where the two
structures genuinely part company. Both directions exist and were both
demonstrated on the RTL (directed) and found in the wild (random sweep).

**Directed, sequential wins — S1: `(2²⁵, 1, −2²⁵, 1)`
(`4C000000 3F800000 CC000000 3F800000`). True sum = 2.**

```
S1: tree=00000000 inv/ovf/inx=001 | seq=3f800000 inv/ovf/inx=001
```

Tree pairs the small operands with the big ones: `2²⁵+1` rounds down to
`2²⁵` (ulp at 2²⁵ is 4; the added 1 is a quarter-ulp, below the rounding
threshold, so RNE truncates)
and `−2²⁵+1` — whose exact value −(2²⁵−1) needs 25 bits — rounds *away* to
`−2²⁵` by the tie-to-even, so level 2 computes `2²⁵ − 2²⁵ = +0`: **both units
of true sum are gone, result +0 where truth is 2.** Sequential recovers half:
`(2²⁵+1) → 2²⁵`, `+(−2²⁵)` cancels exactly to +0, `+1` survives → **1.0**.
CR = `40000000` (2.0). Neither is right; seq is strictly closer (and note the
absolute error is small — 1 or 2 — while the *step* distance from +0 to 2.0
is enormous; both metrics belong in the chapter, each labelled).

**Directed, tree wins — S2: `(2²⁴, 1, 1, 1)` (`4B800000` + three `3F800000`).
True sum = 2²⁴+3.**

```
S2: tree=4b800001 inv/ovf/inx=001 | seq=4b800000 inv/ovf/inx=001
```

Sequential is ch08's T1 fired twice more: each `2²⁴ + 1` is the exact tie,
RNE rounds down, and the increment is lost **three separate times** — result
`2²⁴`. Tree first gathers the small operands: `1+1 = 2` exactly, then
`2²⁴+2` is representable — `4B800001`. CR: exact 2²⁴+3 ties between
`4B800001` and `4B800002`, even mantissa wins → `4B800002`. Tree is 1 step
off, seq 2 steps off. **This is the accumulator lesson in one vector: the
sequential chain re-loses a sub-ulp addend at every stage, the tree lets
small operands reinforce each other before meeting the big one.** (Extended
to n inputs this is why pairwise summation's error bound is O(log n) vs
O(n) — the directed pair makes the mechanism visible at n = 4.)

**Found in the wild (win2 sweep, seed 20261020, first 200,000 quadruples),
one each way, both 4,096 steps:**

```
tree exact, seq off 4096: DC44714B 5C3955A1 DBF86B93 5C0749DD
                          tree=D5F2D000=CR    seq=D5F2E000
seq exact, tree off 4096: 7C8D49C8 7D4A751E FD655607 FC2F3DA8
                          tree=F736E000       seq=F736F000=CR
```

Both are two-large-positives-vs-two-large-negatives quadruples whose sum
cancels ~12 binary orders of magnitude; the structure whose intermediate
happens to align with the surviving bits lands exactly on CR, the other is
4,096 representable values away. The symmetry is the point: **the chapter
cannot present either structure as the safe one against cancellation —
the sweep found mirror-image failures within the same generator.**

## 10. Cost and latency structure; what chapter 11 inherits

Everything countable here was counted from the structures themselves; no
synthesis exists in this environment, so **nothing below is a timing or area
measurement** — the ch09 §11 epistemic wall stands (its `-t sizer` inventory
of one `fp32_add2` — 1,761 elaborated gates with the barrel shifters and LZC
*unaccounted* — triples with the instance count but stays an elaboration
inventory, not area).

**The counts.**

| | adders | combinational depth (adder-delays) | balancing registers when pipelined |
|---|---|---|---|
| tree `(a+b)+(c+d)` | 3 | **2** | none — all four operands enter at t₀, both level-1 results arrive together |
| seq `((a+b)+c)+d` | 3 | **3** | `c` must wait 1 adder-latency, `d` must wait 2 |

The n = 4 surprise the chapter should lead with: **the tree does not cost
more adders.** Any association of n operands uses exactly n−1 two-input
adds; tree and chain are both 3 instances. What the shape buys is depth —
⌈log₂ n⌉ versus n−1 levels (2 vs 3 at n = 4) — and what it costs is nothing
at all in adder count. The real structural asymmetry appears under
pipelining, and it *favors* the tree twice over:

- **Pipelined tree** (each `fp32_add2` cut into S stages at ch09's declared
  cut points — 100/95/73/72 bits of state per boundary): latency 2S cycles,
  one result per cycle, and no input-side balancing — the two level-1 adders
  are the same depth by construction.
- **Pipelined seq:** latency 3S cycles, and operands `c` and `d` need
  delay-matching pipes of S and 2S cycles × 32 bits to meet their partial
  sums — 3S × 32 bits of registers doing nothing but waiting. That is a
  countable register overhead the tree simply does not have.

**The third option chapter 11 must name:** a single `fp32_add2` with an
accumulator register and 4-beat operand multiplexing — 1 adder, 4+ cycles
per result, 1/4 throughput. Its association order is sequential *by
construction*, so everything measured about `((a+b)+c)+d` in these notes —
including S2's triple-loss accumulator pathology — is *its* arithmetic too.
The three designs are three points on a cost/latency curve that all compute
**different specifications** when the same operands arrive (sections 5–7);
the chapter's table should carry the arithmetic column right next to the
cost columns, because that is the chapter's thesis in one row.

**Decision for chapter 12, and its honest basis:** build the **tree**.
Grounds: shallower composition (2 vs 3 adder-delays), no balancing
registers under ch11's pipelining, a NaN/overflow event is at most one
stage from the output, and the verification structure is more symmetric
(two interchangeable level-1 bins). Accuracy is explicitly NOT a ground —
section 6 measured no systematic advantage either way at n = 4. Port-order
convention must be pinned alongside (section 7's Q1/Q3: permuting operands
changes the result class).

## 11. The reference-model discipline for chapter 12, and the measured cost of skipping it

**The discipline, nailed down as four rules** (each carries a measurement
from this session or a cited one):

1. **Round-trip every intermediate.** In Verilog: every partial sum goes
   through `$shortrealtobits` and comes back through `$bitstoshortreal`
   before the next add (section 3's `rt_add` does both per call). In python:
   every partial sum goes through `struct.pack('<f')`. There is no other
   rounding mechanism — ch07 proved `shortreal` assignment does not round.
2. **Sum in exactly the hardware's order.** The reference for
   `fp32_add4_tree` is `rt(rt(a+b) + rt(c+d))`, never `rt(rt(rt(a+b)+c)+d)`
   — section 5 measured the two orders differing on up to 30 % of clustered
   quadruples; an order-mismatched reference "fails" a correct DUT at that
   rate.
3. **Compare NaN by class (+ quiet bit), never by bits; deliver sNaN
   operands as bits.** Generated-NaN sign is architecture-dependent
   (`ffc00000` here, `7fc00000` on the arm64 session — STATE.md), and a
   `shortreal` round-trip quiets an sNaN with no arithmetic (ch07). The RTL
   *is* bit-deterministic about NaN (section 8: payload `7fc00001` rides
   through both structures) — but only the style-A chained-golden reference
   may assert those bits; the style-B value-domain reference may not.
4. **Use `!==` plus an explicit X-guard.** ch09's finding: `!=` makes the
   whole equivalence sweep vacuous against an undriven or double-driven net.
   `tb_equiv4.v` fails on `^result === 1'bx` before comparing.

**E9 — the measured cost of breaking rule 1** (`naiveref.py`; generator =
section 5's, `random.Random(20261005)`, 200,000 quadruples per regime; the
naive model sums all four operands in host doubles and rounds once at the
end — precisely the "shortreal accumulator without round-trips" ch05
warned about):

```
full : naive disagrees with chained binary32   tree 1.268 %   seq 1.262 %
win10:                                         tree 28.131 %  seq 28.000 %
win2 :                                         tree 31.613 %  seq 33.020 %
```

The full-range row reproduces ch05's fix-round figure (~1.3 %: 1.298 %/
1.295 % there, different RNG) with this session's own generator. The
clustered rows are the sharpening chapter 12 must hear: **the un-round-
tripped reference is wrong on more than a quarter of accumulator-style
vectors.** A testbench built on it would report thousands of false failures
against a perfect DUT — or worse, be "fixed" by breaking the DUT. Note the
mechanism: the naive model is not noisy, it is *more accurate* than binary32
(it never rounds intermediates), which is exactly why it is the wrong
oracle for hardware that must round three times.

**Where the reference cannot be trusted at all, enumerated:** (a) NaN sign
and payload through the value domain (rule 3 — class only); (b) sNaN
transport (bits only); (c) nothing else — with rules 1–4 applied, style B
agreed with the DUT and with the exact rational model on every one of
240,000 swept quadruples and 620,400 validation pairs. The reference-model
story at four inputs is fully closed by the four rules; there is no residual
"tolerance" or "close enough" anywhere in it.

**For chapter 12's regression specifically:** keep style A (chained
`fp32_add_alg`) as the bit-exact anchor including flags and NaN bits, and
style B (chained round-tripped `shortreal`) as the independent-implementation
check. They earn different trust: A shares no code with `fp32_add2` but
shares the algorithm; B shares nothing but IEEE 754 itself.

## 12. Verification structure for chapter 12: corner library, reachers under composition, coverage bins

**What the four-input corner library must contain beyond ch08's 46 pairs.**
The pair library exercises every path *of one adder*; what it cannot
exercise is **intermediate events** — values that exist only on internal
nets. The quadruple vectors below are all python3-verified this session
(`corners.py`) and all ran against the RTL (`tb_corners4.v`, 28 checks;
`tb_reach4.v`, 9 checks — PASS on both structures):

| vector (a, b, c, d) | tree expects | seq expects |
|---|---|---|
| Q1 `7F7FFFFF 7F7FFFFF FF7FFFFF FF7FFFFF` | qNaN, inv+ovf+inx | `7F800000`, ovf+inx |
| Q2 `7F7FFFFF 7F7FFFFF FF7FFFFF 00000000` | `7F800000`, ovf+inx | same |
| Q3 `7F7FFFFF FF7FFFFF 7F7FFFFF FF7FFFFF` | `00000000`, no flags | same |
| N1 `7F800000 FF800000 3F800000 3F800000` | qNaN, inv | same |
| N2 `3F800000 3F800000 7F800000 FF800000` | qNaN, inv (born level 1) | qNaN, inv (born stage 3) |
| N3 `7F800000 3F800000 40000000 FF800000` | qNaN, inv born at LAST level | same, born stage 3 |
| N4 `7FC00001 3F800000 3F800000 3F800000` | `7FC00001`, **no flags** | same |
| N5 `7FA00000 3F800000 3F800000 3F800000` | `7FE00000`, inv | same |
| Z 16 × `{±0,±0,±0,±0}` | −0 iff all −0, else +0 | same |
| Z1 `3F800000 BF800000 80000000 80000000` | `00000000` | same |
| S1 `4C000000 3F800000 CC000000 3F800000` | `00000000`, inx | `3F800000`, inx |
| S2 `4B800000 3F800000 3F800000 3F800000` | `4B800001`, inx | `4B800000`, inx |
| SB `00800000 80400000 00400000 00400000` | `00C00000`, no flags (stage-1 result subnormal `00400000`) | same |
| R0–R3 reacher quads (below) | ch08 pair results | same |

Plus both-orders discipline where it applies (the library should also run
each quadruple's operand-reversed image, as ch08 ran pairs both ways).

**E8 — the renormalize reachers survive composition.** ch08's warning: the
rounding-carry renormalize fired 0 times in 10⁶ random pairs; only four
directed pairs reach it. The four-input question — does it still fire when
*composed* stage outputs feed the adder that must take it — is yes, proven
constructively: each reacher operand X was split into a genuine add
(halving: a = b = X with exponent−1, sum exact; for seq a quarter-split
chain `((X/4+X/4)+X/2)+Y`), so every intermediate is a real computed sum,
and the white-box bins fired 4/4 in both structures:

```
tree level-2 round_renorm FIRED: (3f7fffff+3f7fffff)+(33000000+33000000) = 40000000
seq stage-3 round_renorm FIRED: ((3effffff+3effffff)+3f7fffff)+33800000 = 40000000
PASS tb_reach4 (4 reachers fire the last-stage round_renorm in BOTH structures, from composed inputs)
```

(plus the `4B800000`, `4B000000`, and `7F7FFFFF`-overflow reachers, same
pattern; a plain quadruple negative-control confirms the sampled wire sits
at 0 otherwise.) The eight quadruples, ready for ch12's library (expected
results are the ch08 pair results, verified again here by `reach.py` /
`tb_reach4.v`; R3 is the rounding-induced-overflow reacher):

| | tree quadruple (a, b, c, d) | seq quadruple (a, b, c, d) | expect |
|---|---|---|---|
| R0 | `4B000000 4B000000 B3000000 B3000000` | `4A800000 4A800000 4B000000 B3800000` | `4B800000` |
| R1 | `4A800000 4A800000 BD7FFFFF BD7FFFFF` | `4A000000 4A000000 4A800000 BDFFFFFF` | `4B000000` |
| R2 | `3F7FFFFF 3F7FFFFF 33000000 33000000` | `3EFFFFFF 3EFFFFFF 3F7FFFFF 33800000` | `40000000` |
| R3 | `7EFFFFFF 7EFFFFFF 72800000 72800000` | `7E7FFFFF 7E7FFFFF 7EFFFFFF 73000000` | `7F800000`, ovf+inx (exact-model-verified) |

Chapter 12 must carry these quadruples: **a random
four-input campaign inherits ch08's 0-in-10⁶ blindness at every one of its
three adders**, and the last adder's rare paths are reachable only through
vectors engineered backwards from its operands.

**Coverage bins for intermediate events** (all sampled hierarchically, the
ch09 §10 route — re-aimed per instance; a stale path is an elaboration
error, so refactors fail loudly):

- `ovf_stage1` — any level-1/stage-1 `overflow` (Q1/Q2 hit it);
- `nan_born_s1` / `nan_born_late` — invalid raised in a first-level instance
  vs in the *final* instance (N1 vs N3; distinguishable only at the
  per-instance flag, not at the ORed output);
- `interpair_cancel` — final-stage `exact_zero` with nonzero DUT inputs
  (Q3, S1-tree hit it; sampled at `u_add_r.exact_zero` / `u_add3.exact_zero`);
- `round_renorm_last` — the E8 bins, one per structure, with ch08's
  empty-bin gate;
- `subnormal_intermediate` — a stage-1 result in [1, 0x007FFFFF] (gradual
  underflow crossing a composition boundary; the win2 generator with low e₀
  reaches it, a directed pair from ch08's B3/B4 rows pins it);
- the ch08 eight-bin set, re-instantiated **per adder instance** — the
  last adder sees a derived operand distribution (sums, not uniform draws),
  so its bins close on a different schedule than stage 1's; treating the
  three instances as one coverage space would hide exactly that.

**The masking warning, restated for composition:** random stimulus at the
four ports exercises the final adder only through the *derived* distribution
of partial sums — nobody chooses its operands. ch09 measured masking in both
directions at module level; the composition version is structural: every
final-adder corner needs either a backwards-engineered directed vector (E8's
method) or a per-instance bin proving chance actually delivered it. Chapter
12 should treat "bin empty on the last adder" as the expected default, not
a surprise.

## 13. Fused and compound alternatives (documentation, not measurement)

Everything in this section is from the literature — nothing here was built
or measured, and the chapter must flag it exactly so. It exists because
sections 6–9 measured what per-stage rounding costs, and the natural student
question is "why round three times at all?"

**The architecture family.** Multi-operand floating-point adders that keep
the intermediate sum wider than the format and **round once at the end**
are established practice: three-input (and generally multi-term) fused
adders align all significands to a common exponent, sum them in a wide
carry-save datapath, normalize once and round once. Representative
literature, [title-only]: the textbook treatment in Ercegovac & Lang,
*Digital Arithmetic* (multi-operand addition chapters); Y. Tao, G. Deyuan,
F. Xiaoya, R. Xianglong, "Three-operand floating-point adder" (IEEE CIT,
2012);
J. Sohn & E. E. Swartzlander, "A fused floating-point three-term adder"
(IEEE Trans. Circuits and Systems I, 2014); A. F. Tenca, "Multi-operand
floating-point addition" (ARITH-19, 2009). The limiting case is Kulisch's
exact long accumulator — a fixed-point register wide enough (for binary32,
on the order of 640 bits) that *any* number of products/operands accumulates
exactly, rounded once at readout: U. Kulisch, *Computer Arithmetic and
Validity* (De Gruyter), [title-only]. What such a unit would change in these
notes' measurements is precise: sections 5–6's order-dependence (0.65–30 %)
drops to zero by construction, Q1/Q2's intermediate overflow disappears
because ±2¹²⁸-scale partials fit the wide accumulator, and S1/S2's lost
units are all recovered — at the price of a wider datapath and a
normalization/round stage that sees the full accumulated width. The cost
side is the literature's subject, not this project's measurement.

**What IEEE 754-2019 actually standardizes here** (fetch-verified via the
Wikipedia IEEE 754 article): the 2019 revision adds **augmented arithmetic
operations** — `augmentedAddition`, `augmentedSubtraction`,
`augmentedMultiplication` — which "produce a pair of values consisting of a
result correctly rounded to nearest in the format and the error term, which
is representable exactly in the format." They are **recommended, not
required** ("None are required in order to conform to the standard"), and at
publication "no hardware implementations are known, but very similar
operations were already implemented in software using well-known algorithms
(e.g. 2Sum)." That is the standardized face of the error-free-transformation
idea: `augmentedAddition(a,b)` returns the rounded sum *and* the exact
residue, so a four-input sum can carry its own rounding error forward and
re-inject it — the software route to a correctly rounded multi-operand sum
on top of two-input hardware (2Sum/Fast2Sum; Muller et al., *Handbook of
Floating-Point Arithmetic*, EFT chapters, [title-only]). Separately, IEEE
754-2019 §9 recommends reduction operations (`sum`, `dot` etc.) that
permit — but do not require — higher intermediate precision; they are
correctly-rounded only in the 2019 recommended-operations sense and are
likewise optional. [This last sentence is from the standard's well-known
structure; the fetched article confirms only the augmented operations —
the chapter should cite the standard itself: "IEEE Std 754-2019, IEEE
Standard for Floating-Point Arithmetic", title-only.]

**The seam for chapter 14:** the measured gap in these notes (correct
compositions that are not the correctly rounded sum on up to a third of
clustered inputs) is exactly the gap the fused/compound literature exists to
close. Chapter 14 can pick up: fused multi-term adders, the Kulisch
accumulator, 2Sum-based software compensation (with the measured S1/S2
vectors as worked examples), and augmentedAddition as the standard's
blessing of the error-term interface.

## 14. Corrections and sharpenings to earlier chapters

Nothing measured this session *contradicts* an earlier chapter's claim. Five
sharpenings, each with its measurement:

1. **ch05's ~1.3 % naive-reference figure is a best case, not the cost.**
   The figure (re-measured here: 1.268 %/1.262 %, section 11) is specific to
   full-range exponents. Under clustered exponents — the very regime where a
   four-input adder is interesting — the un-round-tripped reference is wrong
   on **28–33 %** of quadruples. ch05/STATE should not be quoted as "the
   round-trip rule costs you 1.3 % if ignored"; the honest statement is
   "1.3 % under full-range stimulus, a quarter to a third under
   accumulator-style stimulus" (E9, generators stated in section 5).
2. **ch08's triple regime table generalizes to quadruples nearly
   unchanged** — 0.65 / 23.99 / 30.11 vs 0.64 / 21.79 / 32.41 (section 5,
   two independent RNGs). The chapter can say the association-sensitivity
   rate is a property of the operand-magnitude regime, roughly stable in
   the operand count at these sizes — measured only up to n = 4; no claim
   beyond that.
3. **ch08's T2 (intermediate overflow absorbing) has a sharper four-input
   form**: with four operands the same multiset reaches **three** result
   classes (qNaN / +inf / +0) across structure and port order, and the tree
   can convert two overflows into an `invalid` — an outcome no triple shows
   (Q1/Q3, section 7). ch12's design document needs the port-order
   convention pinned, not just the tree shape.
4. **ch09's masking lesson gains a structural case**: the final adder of a
   composition is exercised only through the derived distribution of partial
   sums, so its rare paths are unreachable by port-level random by
   construction, not merely by improbability (E8: the reachers DO fire from
   composed inputs when engineered backwards; ch08's census says random
   never finds them at any one adder).
5. **A useful non-finding for ch05/ch12 verification folklore:**
   "two association orders agreed" is weak evidence of the correctly rounded
   sum — 20.5 %/21.5 % of order-agreeing clustered quadruples still differ
   from CR (section 6). Cross-checking orders is not an oracle; only the
   exact model is.

Also re-confirmed in passing: ch04's literal-`$urandom`-seed load-time error
(hit live, section 1); ch07's sNaN-quieting and no-invalid-for-qNaN behavior
now verified **through two levels of composition** (N4/N5, section 8).

## 15. Sources

**Fetch-verified this session (2 URLs, 2 web calls):**

- Wikipedia, "IEEE 754" — https://en.wikipedia.org/wiki/IEEE_754 — for the
  754-2019 augmented arithmetic operations: definition (correctly rounded
  result + exactly representable error term), recommended-not-required
  status, and the no-known-hardware / 2Sum-in-software context quoted in
  section 13.
- Wikipedia, "Pairwise summation" —
  https://en.wikipedia.org/wiki/Pairwise_summation — for the O(ε log n)
  pairwise vs O(ε n) sequential worst-case error growth and the Higham
  citation used in sections 6 and 9.

**[title-only] (not fetched; cited by author/title/venue only):**

- N. J. Higham, "The accuracy of floating point summation," *SIAM J. Sci.
  Comput.* 14(4):783–799, 1993.
- IEEE Std 754-2019, *IEEE Standard for Floating-Point Arithmetic*.
- J.-M. Muller et al., *Handbook of Floating-Point Arithmetic* (2Sum/
  Fast2Sum, error-free transformations).
- M. Ercegovac & T. Lang, *Digital Arithmetic* (multi-operand addition).
- J. Sohn, E. E. Swartzlander, "A fused floating-point three-term adder,"
  IEEE Trans. Circuits and Systems I, 2014.
- A. F. Tenca, "Multi-operand floating-point addition," ARITH-19, 2009.
- Y. Tao, G. Deyuan, F. Xiaoya, R. Xianglong, "Three-operand floating-point
  adder," IEEE CIT 2012.
- U. Kulisch, *Computer Arithmetic and Validity: Theory, Implementation,
  and Applications* (De Gruyter) — the exact long accumulator.

Everything else in these notes is this session's own measurement (Icarus
Verilog 13.0 + python 3.11 on Linux x86-64) or an explicit citation into
earlier chapters' research notes and STATE.md.
