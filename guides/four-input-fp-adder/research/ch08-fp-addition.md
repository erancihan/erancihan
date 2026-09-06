# Chapter 8 research — Floating point addition: align, add, normalize, round

<!-- sections complete: 13/13 -->

Research notes for the guide's pivotal algorithm chapter. Everything numeric here is
verified with exact rational arithmetic (`fractions.Fraction`) against a from-scratch
round-to-nearest-even rounder, cross-checked with `struct` where a double path is
provably sound, and — where simulator-facing — measured under Icarus Verilog 13.0.
Scripts live in the session scratchpad; every quotable claim carries its verification
inline.

## 1. Scope, upstream contracts, and method

**What chapter 8 is.** The complete binary32 addition algorithm —
unpack, screen, swap, align, add/subtract, normalize, round, pack — taught so the
reader can execute it *by hand on any operand pair*, every step justified. No RTL;
chapter 9 turns each step into a module. The chapter's spine is the ten-step
procedure of section 2, the 28-bit width budget of section 3, and ten worked
examples (sections 4–5), each verified three independent ways.

**Upstream artifacts this chapter must build on, by name:**

- **Chapter 2, `align_sticky.v`** (`guide/src/ch02/align_sticky.v`) — already *is*
  step 4 of the algorithm at `W=24`: `aligned[23:0]`, `guard`, `round`, `sticky`,
  with sticky = OR of every bit strictly below the round bit and saturation at
  `W+2 = 26`. Re-verified this session against an exact model: 256 directed
  vectors, 0 mismatches (experiment E1, section 11). The chapter should present the
  algorithm as "the machine `align_sticky` was always going to be part of."
- **Chapter 5, taxonomy rows E–I** — each row is a step of this algorithm: E = the
  sticky region (step 4), F = cancellation and the LZC (step 7), G = G/R/S ties
  (step 8), H = both overflow paths (steps 8–9), I = the three shifter behaviours
  (step 7). The chapter should teach each row as that step's hard case, reusing the
  row's exact vectors (all appear in the worked examples below).
- **Chapter 6** — binary-point alignment and round-half-even at fixed point are the
  same two mechanisms; this chapter adds only the *floating* exponent and the
  normalize step.
- **Chapter 7** — the classifier port contract; the three-line effective-exponent
  decode (`hidden = |e`, `sig = {hidden,f}`, `eff_e = hidden ? e : 8'd1`), which is
  this chapter's step 1 verbatim; the RNE decision equation `round_up = G&(R|S|L)`
  (already verified over all 1024 six-bit cases); the never-underflow proof; the
  rounding-attribute table; and the five ch07 toolchain findings (round-trip rule,
  sNaN-from-bits, NaN-sign portability, one-add-via-double safety, `-2.0**128`
  precedence trap).

**Ground truth for these notes.** Three independent layers, cross-validated before
use: (a) `round_frac_rne` — a from-scratch RNE rounder over `Fraction`s, rebuilt in
the style ch07 validated, checked against `struct`'s double→binary32 conversion on
100,000 random doubles spanning 2^−160…2^139: **0 mismatches** (script `p1`);
(b) `round_grid_rne` — a fast exact path exploiting the fact that every finite
binary32 is an integer multiple of 2^−149 (`n = sig << (eff_e − 1)`), checked
against (a) on 200,000 random grid integers up to 280 bits: **0 mismatches**;
(c) `hw_add` — a datapath-faithful model using *only* the widths the hardware will
have (24-bit significand + G + R + sticky flag), plus degradable variants for the
counterexample hunts of section 6. All Icarus work uses `iverilog -g2012 -Wall`
(13.0) with zero-output compiles.

Scripts (session scratchpad, throwaway): `fp32lab.py` (models), `p1_validate.py`,
`p2_sweep.py`, `p3_variants.py`, `p5_sterbenz.py`, `p6_dblround.py`, `p7_assoc.py`,
`p8_examples.py`; Icarus: `tb_e1_align.v` + `e1_check.py`, `tb_e2_shortreal.v` +
`e2_check.py`, `tb_e3_chain.v`.

## 2. The algorithm end to end: a ten-step procedure

The numbered procedure, exactly as the reader will execute it by hand and exactly as
the model `hw_add` implements it. Every step carries its justification; the model
matched the exact-arithmetic reference on **1,000,054 operand pairs with zero
mismatches** (section 3), so the procedure below is measured, not asserted.

**Step 1 — unpack.** For each operand, split `{s, E[7:0], F[22:0]}` and form the
*effective* exponent and 24-bit significand: `eff_e = max(E,1)`,
`sig = {(E>0), F}`. This is ch07 §9's three-line decode, and it is the entire
subnormal story in the datapath: stored exponents 0 and 1 share the scale 2^−126,
so E=0 is "E=1 with a zero hidden bit" and *no other subnormal case exists* in
alignment or addition. Using `E − 127` for a subnormal (effective exponent −127
instead of −126) is ch05 row B's "commonest subnormal bug" — worked example W8
shows it producing a wrong answer on the very first subnormal pair.

**Step 2 — special-case screen.** Handled before any arithmetic, as pure control:

- either operand NaN → NaN out (sNaN additionally raises invalid; result is a
  *quiet* NaN). Both operand orders matter — ch05 row C.
- inf + inf, same sign → that inf; **inf + (−inf) → qNaN + invalid** — the one
  addition that invents a NaN (ch07 §8, verified `ffc00000` in Icarus at runtime).
- inf + finite → that inf.
- both operands zero: like signs → that sign; unlike signs → **+0** (RNE rule,
  ch07 §8's zero-sign table).
- one operand zero → return the other operand unchanged (including a subnormal,
  including −0's sign when both are zero — covered above).

Everything else falls through to the datapath. One rule the datapath itself cannot
produce: an *exact cancellation* (x + (−x)) must return **+0** under RNE, because a
magnitude subtraction that yields zero has no sign of its own (ch05 row A). That is
a hard-coded rule at step 5, not a screen case.

**Step 3 — compare and swap: the bigger operand leads.** Compare `(eff_e, sig)`
lexicographically — equivalently, ch07 §9's single unsigned compare of `w[30:0]`,
valid across zero/subnormal/normal/infinity without carve-outs — and swap so operand
A is the larger magnitude. Three things this buys, all load-bearing: (a) the
alignment shift is always a **right** shift of the smaller operand by
`d = eff_eA − eff_eB ≥ 0`, so one shifter direction suffices; (b) the significand
difference in step 5 is never negative, so no end-around-carry or result
recomplement is needed; (c) the result's sign is simply the bigger operand's sign.
When the two magnitudes are equal the "swap" is a no-op and the subtract case falls
into the exact-zero rule.

**Step 4 — alignment with G/R/S capture.** Shift the smaller significand right by
`d`, saturated at 26. The first bit shifted out is **G** (guard, weight ½ ulp of
the 24-bit frame), the second is **R** (round, weight ¼ ulp), and **S** (sticky) is
the OR of *every* bit below R. This is `align_sticky` with `W=24` verbatim
(E1: 256 vectors, 0 mismatches against the exact model). Saturating at
`W+2 = 26` is correct because a shift of 26 already puts the entire significand
below the R position: `aligned = G = R = 0` and `sticky = |sig`, and no larger
shift can change anything (measured across the saturation boundary in E1).
Section 6 shows what goes wrong if sticky misses even one contributor.

**Step 5 — effective operation.** `eff_sub = sA ^ sB`. For an effective **add**,
add the 26-bit quantities `{sigA, 2'b00} + {aligned, G, R}` into a 27-bit sum.
For an effective **subtract**, compute
`{sigA, 2'b00} − {aligned, G, R} − sticky`: the sticky bit is injected as a
**borrow**. Why: the true small operand is `kept + f` where `0 < f < 1` in units
of the R bit whenever sticky is set, so the true difference is
`(big − kept − 1) + (1 − f)` — one less than the truncated difference, with a
*positive* residue `(1−f)` that is nonzero exactly when sticky was set. The
datapath therefore subtracts the extra 1 and *keeps sticky set*, and the kept
result is again a truncation of the true result. Omitting this borrow is a real
implementation bug; it changes rounding decisions (the GS counterexample in
section 6 turns exactly on this position).

**Step 6 — the significand adder width.** 24 significand bits + G + R + carry =
a 27-bit adder, with the 1-bit sticky flag alongside: **28 bits of datapath
state**. Section 3 derives and proves this number — it is THE number chapter 9
builds registers around.

**Step 7 — normalize.** Three mutually exclusive outcomes (ch05 row I's "three
shifter behaviours"):

- *Carry out (effective add only):* shift right 1, increment the exponent, and
  fold the bit falling off the bottom (old R) into sticky: `S' = S | R`,
  `R' = G`, `G' = old LSB`. Worked example W2.
- *No shift:* leading 1 already at bit 23. The common case.
- *Leading zeros (effective subtract only):* count leading zeros (LZC), shift left
  by `min(LZC, eff_eA − 1)`, decrement the exponent by the shift. Two hard rules:
  the shift **stops at effective exponent 1** — a result still unnormalized there
  is a subnormal, E field 0, and chasing the leading 1 further is ch05 row B's
  bug (worked example W6); and zeros are shifted in from the right, which is
  *correct* because a left shift of 2 or more can only happen when `d ≤ 1`, where
  R and sticky are provably 0 (nothing was lost). That claim is not folklore
  here: `hw_add` **asserts** `shl ≥ 2 ⟹ R = 0 ∧ S = 0` and the assertion
  survived all 1,000,054 pairs. (First drafted as `G = R = S = 0`; the sweep
  itself falsified that within seconds — at `d = 1` the guard bit can hold a
  live bit of the small operand which shifts back in, exactly. The corrected
  invariant is the true one. A useful lesson in claims-vs-measurements.)
  A left shift of exactly 1 with `d ≥ 2` does occur, and is why R exists: the
  old R becomes the new G (section 3).

**Step 8 — round to nearest, ties to even.** With L = LSB of the kept 24-bit
significand after normalization: `round_up = G & (R | S | L)` — ch07 §7's
equation, already verified exhaustively at small width, and here embedded in the
full datapath across the million-pair sweep. If the increment carries out of bit
23 (significand 24 ones rounds to 2^24), shift right 1 and increment the
exponent: the **rounding-carry renormalize**, a second, rarely-taken normalize.
Measured rarity: it fired **0 times in 1,000,000 random pairs** and twice in the
54 directed vectors — a number chapter 9's testbench discussion should quote,
because it means random stimulus alone will likely never exercise this wire
(ch05's directed-test argument, now with a sharper example).

**Step 9 — pack.** If the (biased effective) exponent exceeds 254 → **overflow**:
under RNE the result is ±infinity (ch07 §7's mode table). If the significand's
bit 23 is 0, the exponent must be 1 → encode E = 0 (subnormal or zero). Otherwise
E = the effective exponent, F = the low 23 bits.

**Step 10 — flags (for chapter 12's spec).** invalid: sNaN operand or
inf + (−inf). overflow: step 9's exponent check (both paths — magnitude and
rounding-induced; worked example W7). inexact: `G | R | S` after normalization
(equivalently: rounded ≠ exact). underflow: **constant 0** — ch07's
never-underflow proof; the sweep's independent re-measurement found 53,532
subnormal/zero results among the million pairs, every one exact.

**Trap inventory for the chapter's closing section.** Every entry measured in
these notes; none is folklore. The chapter's traps section can be assembled
from this table alone:

| trap | wrong answer, measured | where |
|---|---|---|
| subnormal aligned by `E−127` instead of `eff_e` | `00400000+00800000` → `00A00000` (truth `00C00000`) | W8 |
| normalizer chases the leading 1 below eff_e = 1 | halves every subnormal result | W6 |
| right-1 renormalize discards the bottom bit instead of making it G | `3FFFFFFF+3FC00000` → `405FFFFF` (truth `40600000`) | W2 |
| sticky OR misses deep bits (early-discarding shifter) | `3F800000+33800001` → `3F800000` (truth `3F800001`) | §6 |
| no sticky borrow into the effective subtract | GS-class failures, 0.347 % of random pairs | §6 |
| R folded into S (can't survive the left-1 normalize) | `3F800000+BE800001` → `3F3FFFFF` (truth `3F400000`) | §6 |
| aligned operand pre-rounded before the add | 8.44 % of random pairs wrong; can delete an operand outright | §8 |
| exact cancellation returns the subtrahend's sign | `1.5+(−1.5)` must be `00000000` (+0) under RNE | E2 |
| only one tie direction tested | a rounds-up-always adder passes W5a's mirror | W5a/W5b |
| rounding-carry renormalize never exercised | 0 hits in 10^6 random pairs — directed vectors only | §3 |
| narrow exponent/shift registers wrap silently | `-Wall` warns on none of it (ch02 finding) | §3 |

## 3. The width budget: 28 bits, derived and proved

**The number chapter 9 builds registers around: 24 + G + R + S + carry = 28.**
Concretely:

```
bit:   26   25 ........ 2   1   0     + 1 sticky flag alongside
       cy   [ 24-bit sig ]  G   R
       └─ 27-bit adder result ─┘          total datapath state: 28 bits
```

The aligned small operand and the big operand each occupy 26 bits
(`{sig[23:0], G, R}`); their sum needs one carry bit → a **27-bit adder**; the
sticky flag rides alongside and never enters the adder except as the effective-
subtract borrow-in. (Whether one draws S as "bit −1 of a 28-bit vector" or as a
flag beside a 27-bit vector is layout taste; the state count is 28 either way,
and ch02's `align_sticky` already chose the flag form.)

**Why exactly these bits — the role of each, derived.** Let w = the weight of the
R bit = 2^(e_big − 25). After alignment the kept small operand is a truncation:
true value = kept + f·w with 0 ≤ f < 1, sticky ⇔ f ≠ 0. Three normalization
outcomes, and what the final rounding needs in each:

| outcome | final ulp | rounding needs | supplied by |
|---|---|---|---|
| right-1 (add carry) | 8w | half = old LSB; below = old G,R,S | `G'=LSB, R'=G, S'=S∨R` after shift (corrected 2026-08-19 by the ch08 review: this cell read `S'=S∨R∨G`, contradicting §7 and the hardware — folding G into sticky here destroys the new round bit) |
| no shift | 4w | half = G; below = R∨S | G, R∨S |
| left-1 (subtract, d ≥ 2) | 2w | half = old R; below = S | **R becomes the new G**; S |
| left ≥ 2 (subtract, d ≤ 1 only) | ≤ w | nothing — result exact | R = S = 0, G shifts back in |

- **G** exists for the no-shift case: it is the half-ulp bit of the common case.
- **R** exists *solely* to survive the left-1 normalize: after a one-bit left
  shift the old R is the new half-ulp bit. Fold R into S and that information is
  gone — the GS counterexample of section 6 is exactly this loss.
- **S** exists because "closer to the upper neighbour" vs "exact tie" differs by
  *any* nonzero residue, no matter how far down: one OR-tree bit represents it.
- The left-≥2 row explains why nothing *more* than R is ever needed: massive
  cancellation forces `d ≤ 1` (with `d ≥ 2` the aligned small operand is at most
  half the big one, so the difference keeps its leading 1 within one position —
  `big − small ≥ 2^25·w − 2^24·w = 2^24·w` in frame units), and at `d ≤ 1` at
  most one bit (G) ever left the significand, so the long left shift pulls in
  zeros over an exact value. This is the measured invariant of step 7.

The effective-subtract borrow rule completes the proof obligation: with the
sticky borrow, the post-subtract vector is again a truncation of the true result
with residue (1−f)·w ∈ (0, w), still flagged by the same sticky bit — so the
table above applies unchanged to subtraction.

**Proof by measurement.** `p2_sweep.py` ran the 28-bit-state model against the
exact rational reference:

```
directed (both orders): 54 pairs, 0 mismatches, tiny-inexact 0,
  {'d_ge_26': 4, 'left_ge_2': 4, 'right1': 10, 'round_renorm': 2,
   'subnormal_result': 16, 'inf_result': 4}
random mixed-generator: 1000000 pairs, 0 mismatches, tiny-inexact 0,
  {'d_ge_26': 190262, 'left_ge_2': 52407, 'right1': 170020, 'round_renorm': 0,
   'subnormal_result': 53532, 'inf_result': 6158}
total mismatches 0, 10.2s
```

The generator deliberately mixes five regimes (uniform bit patterns including
NaN/inf, exponent-close pairs, |Δexp| ≤ 30, subnormal-heavy, near-overflow), so
the census is meaningful: 190k saturated-shift events, 52k massive cancellations,
170k carry renormalizes, 53k subnormal results — and **zero** rounding-carry
renormalizes in a million random pairs (only directed vectors reached it). The
weaker true statement, for the chapter to print: *28 bits of state is sufficient
on every pair we measured — a million-pair mixed sweep plus every taxonomy
vector — and the step-7 exactness invariant that the sufficiency argument leans
on was asserted on every one of those pairs, never firing.*

**Exponent-side widths, for completeness (ch07 §9 carries the details):** the
exponent difference `d = eff_eA − eff_eB` needs 8 bits unsigned (0…253) — 9 bits
if computed before the swap as a signed value; the shift amount into the aligner
needs to express the saturation point 26, so 5 bits with explicit clamping —
ch02's `SH_MAX` full-width-localparam lesson applies here with force. Result
exponent arithmetic wants one guard bit (9 bits) so 254 + 1 and 1 − 1 cannot
wrap. And `-Wall` will warn about **none** of these truncations (ch02 finding);
only the testbench catches them.

**The normalize shifter's range is 0…24, so its count is 5 bits too.** Upper
bound derived and hit: the smallest nonzero difference the 26-bit frame can
hold is a lone G bit (value 2 in frame units, from a d = 1 subtract), which
sits 24 positions below bit 25. Measured at the extreme:
`3F800000 + BF7FFFFF` — 1.0 − (1 − 2^−24) — leaves exactly the G bit, the
model reports `renorm = ('left', 24)`, and the result `33800000` = 2^−24 is
exact (Sterbenz range, as it must be). A shifter or counter sized for 0…23
"because the significand has 24 bits" is off by one: the G position
participates. This is the concrete content of "the effective-subtract path
needs the extra normalization range" — the *add* path never left-shifts at
all, so the whole 0…24 left range plus the stop-at-eff_e-1 clamp exists for
subtraction alone.

## 4. Worked examples 1–4: plain add, carry renormalize, sticky-only, cancellation

Ten worked examples across sections 4–5 (eight required cases plus two bonus
subnormal vectors), generated digit-by-digit by `p8_examples.py`. **Every one is
verified three independent ways**: the 28-bit datapath trace, the exact `Fraction`
sum rounded once by the validated rounder, and `struct`'s double-add path (sound
for a single add — section 8); each also reproduced bit-identically under Icarus's
shortreal path (E2, section 11). The traces below are the script's output,
lightly trimmed; the notation `sig | G R  s=…` shows the 26-bit kept vector and
the sticky flag.

**W1 — plain same-sign add: 1.5 + 2.25 (`3FC00000 + 40100000`).**

```
A = 3FC00000  eff_e=127  sig=1.10000000000000000000000   val 3/2
B = 40100000  eff_e=128  sig=1.00100000000000000000000   val 9/4
swap: B leads.  d = 128-127 = 1.  effective ADD, sign 0
big   : 100100000000000000000000 | 0 0
small : 011000000000000000000000 | 0 0  s=0   (shift 1)
sum   : 0 111100000000000000000000 | 0 0     (no carry)
round : L=0 G=0 R=0 S=0 -> no round.  pack: E=128, sig=1111...
exact sum = 15/4 = 3.75            RESULT 40700000  (exact)
```

The everyday case: one swap, a 1-bit alignment that loses nothing, no
normalization, no rounding. Worth showing first so the reader sees the machinery
idle before seeing it work.

**W2 — carry out, right-1 renormalize, tie created in G: (2 − 2^−23) + 1.5
(`3FFFFFFF + 3FC00000`).**

```
A = 3FFFFFFF  eff_e=127  sig=1.11111111111111111111111   val 16777215/8388608
B = 3FC00000  eff_e=127  sig=1.10000000000000000000000   val 3/2
d = 0.  effective ADD
big   : 111111111111111111111111 | 0 0
small : 110000000000000000000000 | 0 0  s=0
sum   : 1 101111111111111111111111 | 0 0    <- CARRY OUT (27th bit)
right-1: 110111111111111111111111 | 1 0  s=0   e=128
round : L=1 G=1 R=0 S=0 -> tie! round_up = G&(R|S|L) = 1 (L odd)
pack  : sig 111000000000000000000000, E=128
exact sum = 29360127/8388608 = 3.4999998807907104   (tie: half an ulp below 3.5)
RESULT 40600000 = 3.5  (inexact)
```

The carry-out pushes a *live* bit into G, manufacturing an exact tie that the
alignment never created; ties-to-even resolves it upward here because the kept
LSB is odd. A reader who forgets that the right-1 renormalize must preserve the
shifted-off bit as the new G computes 3.4999998 → 0x405FFFFF and is one ulp low.

**W3 — alignment beyond everything, sticky-only: 2^24 + 2^−24
(`4B800000 + 33800000`, ch05 row E's vector).**

```
A = 4B800000  eff_e=151  sig=1.000...0    val 16777216
B = 33800000  eff_e=103  sig=1.000...0    val 1/16777216
d = 48 -> saturates to 26
big   : 100000000000000000000000 | 0 0
small : 000000000000000000000000 | 0 0  s=1   (all 24 bits below R)
sum   : unchanged big.  round: L=0 G=0 R=0 S=1 -> no round
exact sum = 16777216.00000006          RESULT 4B800000  (inexact)
```

The small operand influences nothing but the inexact flag — yet the sticky bit
must still be computed, because in the *effective subtract* direction the same
alignment distance drives a borrow (step 5) that changes the answer. 81.6 % of
uniform-random normal pairs live in this regime (ch05's exact computation), which
is why random testing overweights it and underweights everything else.

**W4 — near-total cancellation, LZC and a 23-bit left shift: (2 + 2^−22) − 2
(`40000001 + C0000000`, ch05 row F's vector).**

```
A = 40000001  eff_e=128  sig=1.00000000000000000000001   val 8388609/4194304
B = C0000000  eff_e=128  sig=1.00000000000000000000000   val -2
d = 0.  effective SUBTRACT, sign 0
big   : 100000000000000000000001 | 0 0
small : 100000000000000000000000 | 0 0  s=0
diff  : 000000000000000000000001 | 0 0      <- 23 leading zeros
LZC=23, shift limit e-1 = 127 -> left shift 23, e = 128-23 = 105
norm  : 100000000000000000000000 | 0 0  s=0
round : all zero -> exact.  pack: E=105
exact sum = 1/4194304 = 2^-22          RESULT 34800000  (exact)
```

The full-range LZC case: 23 of the 24 significand bits cancel, the normalizer
shifts the surviving 1 all the way up, and the exponent absorbs the shift. The
result is **exact** — no bits existed below the difference to lose. Section 7
proves this is not luck: every close-subtraction (Sterbenz range) is exact, which
is why the "catastrophic" in catastrophic cancellation refers to *relative* error
inherited from earlier roundings of the operands, never to error created by this
subtraction. At random this path needs |Δexp| ≤ 1 *and* opposite signs
(≈ 0.59 % of pairs, ch05 row F) — a directed-test obligation.

## 5. Worked examples 5–8: ties both ways, gradual underflow, rounding overflow, subnormal operand

**W5a — exact tie, rounded DOWN to even: 2^24 + 1 (`4B800000 + 3F800000`,
ch05 row G).**

```
A = 4B800000  eff_e=151  sig=1.000...0   val 16777216
B = 3F800000  eff_e=127  sig=1.000...0   val 1
d = 24: B's leading 1 lands exactly in G
big   : 100000000000000000000000 | 0 0
small : 000000000000000000000000 | 1 0  s=0
sum   : 100000000000000000000000 | 1 0     (no carry)
round : L=0 G=1 R=0 S=0 -> exact tie; L even -> round_up = 0
exact sum = 16777217  (the first integer binary32 cannot hold, ch07)
RESULT 4B800000 = 16777216  (inexact)
```

**W5b — exact tie, rounded UP to even: (2^24 + 2) + 1 (`4B800001 + 3F800000`).**

```
A = 4B800001  sig=1.000...01   val 16777218      B = 1, d = 24 as above
sum   : 100000000000000000000001 | 1 0  s=0
round : L=1 G=1 R=0 S=0 -> exact tie; L odd -> round_up = 1
pack  : sig 100000000000000000000010, E=151
exact sum = 16777219        RESULT 4B800002 = 16777220  (inexact)
```

The pair is ch05's "one tie direction alone passes a design that always rounds
up" — identical alignment, identical G/R/S, opposite decisions, driven purely by
the parity of L. Both directions must appear in any test list.

**W6 — gradual underflow, the normalizer's stop: minnormal − minsubnormal
(`00800000 + 80000001`, ch05 row B).**

```
A = 00800000  E=1  eff_e=1  sig=1.000...0     val 2^-126
B = 80000001  E=0  eff_e=1  sig=0.000...01    val -2^-149
d = 1 - 1 = 0.  effective SUBTRACT
big   : 100000000000000000000000 | 0 0
small : 000000000000000000000001 | 0 0  s=0
diff  : 011111111111111111111111 | 0 0      <- one leading zero
LZC = 1, but shift limit eff_e - 1 = 0 -> NO shift, e stays 1
round : L=1 G=0 R=0 S=0 -> exact
sig24 = 0111...1 with e=1 and no leading 1: SUBNORMAL, E field = 0
exact sum = 8388607 * 2^-149          RESULT 007FFFFF  (exact)
```

The one place the normalizer's `min(LZC, eff_e−1)` clamp matters: chasing the
leading 1 here (shifting left and decrementing past e=1) would fabricate an
exponent the format cannot encode and halve the value. Gradual underflow is
*doing nothing*: leave the leading zeros in place and encode E=0. The result is
exact — as every tiny result is (never-underflow, re-confirmed across the
sweep's 53,532 tiny results).

**W7 — rounding-induced overflow: maxnormal + 2^103 (`7F7FFFFF + 73000000`,
ch05 row H's second path).**

```
A = 7F7FFFFF  eff_e=254  sig=1.111...1    val (2-2^-23)*2^127
B = 73000000  eff_e=230  sig=1.000...0    val 2^103 = half an ulp of A
d = 24: B's leading 1 lands in G
sum   : 111111111111111111111111 | 1 0  s=0    (no carry)
round : L=1 G=1 R=0 S=0 -> exact tie; L odd -> round_up = 1
rounding carry! 24 ones + 1 = 2^24 -> right-1, e = 255
e = 255 > 254: OVERFLOW -> +infinity  (RNE default)
exact sum = 340282356779733661637539395458142568448 < 2^128 (finite!)
RESULT 7F800000  (inexact, overflow)
```

Every step of the machinery fires at once: alignment puts the half-ulp exactly
in G, the tie breaks upward against the all-ones (odd) significand, the rounding
increment carries out, the renormalize pushes the exponent to 255, and the pack
stage converts that into infinity. The exact sum is *finite* — this overflow is
manufactured entirely by the rounder, which is why ch05 row H calls it a
different hardware path from `max + max`. (The exact sum here equals the §7.4
overflow threshold (2 − 2^−24)·2^127 precisely; its "even" neighbour at
unbounded exponent is 2^128, which is why RNE goes up and over. One ulp less in
B — `7F7FFFFF + 72FFFFFF` — stays at `7F7FFFFF`, measured in E2.)

**W8 — a subnormal operand, effective exponent −126: 2^−127 + 2^−126
(`00400000 + 00800000`).**

```
A = 00400000  E=0 -> eff_e=1, sig=0.100...0   val 2^-127 (subnormal)
B = 00800000  E=1 -> eff_e=1, sig=1.000...0   val 2^-126 (min normal)
swap: B leads.  d = 1 - 1 = 0   <- effective exponents EQUAL
sum   : 110000000000000000000000 | 0 0  s=0   (no carry)
round : exact.  pack: sig 1.100...0, E=1
exact sum = 3 * 2^-127        RESULT 00C00000 = 1.5 * 2^-126  (exact)
```

The vaccine demonstration for ch05 row B's commonest subnormal bug: decode the
subnormal's exponent as `E − 127 = −127` instead of `eff_e = max(E,1)` and you
compute `d = 1`, align the subnormal one bit too far right, and get `00A00000`
(1.25·2^−126) — wrong by 2^−128. With `eff_e` the stored exponents 0 and 1 are
the *same scale* and d = 0.

**W8b — subnormal + subnormal promoting to normal, carry with no shift:
`007FFFFF + 00000001` (ch05 row B's fourth vector).**

```
A = 007FFFFF  eff_e=1  sig=0.111...1    (max subnormal)
B = 00000001  eff_e=1  sig=0.000...01   (min subnormal)
d = 0.  sum: 100000000000000000000000 | 0 0   (bit 23 now set - no carry-out)
round : exact.  sig24 has its bit 23 set with e=1 -> E field = 1
exact sum = 2^-126        RESULT 00800000 = minnormal  (exact)
```

Promotion across the subnormal boundary is an *encoding* property, not logic:
the fraction addition sets bit 23, and packing a bit-23-set significand at
e=1 is simply E=1. No shift, no special case — the payoff of step 1's `eff_e`
convention (ch07 §9 said this; here it is executed).

All ten examples reproduced bit-identically under Icarus's shortreal one-add
path (E2, 25/25), so a reader can re-check any of them inside the simulator.

## 6. Counterexamples: what each missing bit costs

The width budget's negative space: four degraded datapaths, each identical to
`hw_add` except for the bits it keeps, each run against the exact reference on
the same 200,000-pair mixed random set (`p3_variants.py`, re-run and re-captured
this session):

```
bulk failure rates over 200k random mixed pairs:
  GR   : 7733 wrong of 200000  (3.866 %)    <- sticky dropped
  GS   : 695 wrong of 200000   (0.347 %)    <- R dropped
  G    : 19018 wrong of 200000 (9.509 %)    <- G only
  none : 57272 wrong of 200000 (28.636 %)   <- truncate everything
```

Every failure observed was a final result off by exactly one ulp (or the flag
side of a tie) — these are not catastrophic bugs, they are the *worst kind*:
rare, small, and invisible to any "close enough" testbench. One hand-verified
counterexample per variant, all with deliberately simple operands:

**No extra bits at all (`none`): `3F800001 + 33800000`** — (1 + 2^−23) + 2^−24.
Exact sum = 1 + 2^−23 + 2^−24: exactly half an ulp above an odd significand →
RNE rounds up to `3F800002`. Truncation returns `3F800001`. Verified: variant
`3F800001`, exact `3F800002`.

**G only, add side: `3F800000 + 33800001`** — 1 + (2^−24 + 2^−47). The small
operand is 1.000…001 × 2^−24; alignment by d = 24 puts its leading 1 in G and
its trailing 1 twenty-three positions *below* R. Exact sum − 1 = 2^−24 + 2^−47
= 8388609/2^47 > half-ulp = 2^−24, so RNE must round up: `3F800001`. With only
G the datapath sees G=1 and nothing else — indistinguishable from an exact tie —
and ties-to-even keeps the even `3F800000`. One lost bit at position 47 flips
the rounding. **This same pair is the "sticky must OR *all* shifted-out bits"
demonstration:** the full-G/R/S path gets it right *only* because sticky's OR
reaches all the way down; a sticky computed over a truncated field (or a shifter
that saturates early and discards instead of ORing) reproduces exactly this
failure. It is also the GR variant's counterexample (same mechanism: R=0 there,
the deep bit was sticky's alone to catch): GR returns `3F800000`, exact
`3F800001`.

**G only, subtract side: `3F800000 + BE800003`** — 1 − 0.25·(1 + 3·2^−23), d = 2.
Exact difference = 25165821/2^25 = 0.75 − 1.5·2^−24: an exact tie between
`3F3FFFFE` (even f) and `3F3FFFFF` (odd) at the result's exponent → RNE takes
the even `3F3FFFFE`. The 2-bit alignment shifts two live bits out but G keeps
only one; losing the second makes the subtrahend *smaller*, the computed
difference *larger* — the variant lands on `3F3FFFFF` with clean extra bits and
never rounds. Off by one ulp on the wrong side of a tie.

**R dropped (`GS`): `3F800000 + BE800001`** — 1 − 0.25·(1 + 2^−23), d = 2,
the left-1-normalize case. Exact difference = 25165823/2^25 = 0.75 − 2^−25:
exactly half an ulp below 0.75 → tie → even → `3F400000` (f = 0x400000, even).
Trace of the failure (from the model's log, re-captured): the GS aligner keeps
`sig+G` only; the lost low bit sets sticky, the sticky borrow fires at **G
granularity** (the only position it has), over-subtracting; after the left-1
normalize the datapath believes the value is strictly below the tie and returns
`3F3FFFFF`. With R present, the borrow lands at R weight, the left shift
promotes R's information into the new G, and the tie is seen: `3F400000`.
This is the concrete meaning of "R exists to survive the one-bit normalize" —
and at 0.347 % it is the *rarest* failure class of the four, the one a casual
random regression is most likely to miss, needing effective-subtract with
d ≥ 2, cancellation of exactly one bit, and a live rounding boundary at once.

**Why the guard budget stops at two-plus-sticky.** Goldberg (fetch-verified,
Sources): "By introducing a second guard digit and a third *sticky* bit,
differences can be computed at only a little more cost than with a single guard
digit, but the result is the same as if the difference were computed exactly and
then rounded." That is the classical statement; the P2 sweep is this project's
measured version of it, and the four variants above are the measured converse.

**A ranking worth teaching** (from the bulk rates): losing sticky (3.9 %) hurts
eleven times more often than losing R (0.35 %), and losing G (9.5 %) more than
either — the bits are not equals. A testbench diagnosing a wrong-by-one-ulp
adder can use the *pattern* of failures to name the missing bit: wrong only on
ties-that-should-not-be-ties → sticky; wrong only after cancellation by exactly
one bit → R; wrong everywhere half the time near halfway cases → G.

## 7. Sterbenz's lemma: why close cancellation is exact

**Statement (Sterbenz, 1974).** If x and y are floating-point values of the same
format with `y/2 ≤ x ≤ 2y`, then `x − y` is exactly representable in that
format — the subtraction commits no rounding error at all. (Requires gradual
underflow; see the FTZ caveat below.)

**Why, in this chapter's terms.** The condition forces the exponents within 1 of
each other (`d ≤ 1`), so both operands sit on a common grid of spacing at most
one ulp of the smaller; their difference is on that same grid; and the
magnitude bound `|x − y| ≤ min(x, y)` (from x ≤ 2y ⟹ x − y ≤ y, and
y ≤ 2x ⟹ y − x ≤ x) means the difference needs no more significant bits than
the operands had. On-grid and small enough ⟹ representable. In the datapath
this is precisely the step-7 invariant: at d ≤ 1 nothing passes R, the
subtraction is exact in the 26-bit frame, and the long left shift pulls in
zeros under an exact value. Sterbenz's lemma and "massive cancellation is
exact" are the same fact stated by a mathematician and by a shifter.

**Verified three ways (`p5_sterbenz.py`, re-run and re-captured):**

```
toy p=5, e in [-2,3]: 111 values, 3151 in-range pairs, 3151 exact (0 violations)
  in-range pairs with subnormal (nonzero) exact difference: 932  <- lost under FTZ
  tightest OUT-of-range inexact pair: ratio 2.0645  x=31/64 y=1  x-y=-33/64
binary32: 200000 random pairs with y/2<=x<=2y: 0 inexact subtractions
```

- *Exhaustive*, in a toy format small enough to enumerate (5-bit significand,
  exponents −2…3, with subnormals): all 3,151 pairs satisfying the condition
  subtract exactly. Zero violations, by enumeration, not sampling.
- *Sharpness*: the nearest inexact pair outside the condition sits at ratio
  64/31 ≈ 2.0645 in the toy format (y = 1, x = 31/64: y/x just past 2;
  y − x = −33/64 needs 6 significant bits where the format has 5). In binary32
  the boundary is sharper still, probed directly: x = 2 − 2^−23,
  y = 1 − 2^−24 is *exactly* x = 2y → difference 1 − 2^−24 = `3F7FFFFF`,
  exact; but x = 2, y = 1 − 2^−24 (ratio a hair above 2) → exact difference
  1 + 2^−24, which needs 25 bits → rounds to `3F800000`, **inexact**. One ulp
  of operand change across the 2:1 line switches the guarantee off.
- *In-format scale*: 200,000 random binary32 pairs inside the condition, every
  difference exact (exactness checked against the integer-grid model).

**The flush-to-zero caveat, quantified.** 932 of the 3,151 exhaustive in-range
pairs (29.6 %) have a nonzero exact difference that is *subnormal*. Under a
flush-to-zero implementation those differences become 0 — Sterbenz's lemma
fails, and `x == y` becomes indistinguishable from `x` *near* `y`. This is the
strongest single argument for the guide's decision to implement gradual
underflow (ch05 flagged FTZ as a specification decision; this is the number
that decision protects).

**What "catastrophic cancellation" actually means, for the chapter to say
precisely:** the subtraction of close operands is exact (proved above); the
catastrophe is that it *amplifies pre-existing relative error*: if x and y each
arrived carrying up to half an ulp of rounding from earlier operations, the
difference's few surviving bits inherit that absolute error at a hugely larger
relative scale. Goldberg's benign/catastrophic distinction (fetch-verified)
says the same: cancellation is catastrophic when the operands are themselves
rounded, benign when they are exact. The adder's job is only to not add insult:
Sterbenz says it doesn't.

## 8. Double rounding: the hazard and the safe harbor

**The hazard.** Round the exact result to some intermediate precision, then round
that to binary32, and the composition is *not* rounding-once: the first rounding
can move a value that was just below a tie exactly *onto* the tie, and the
second rounding's even-rule then steps over the correct answer. Measured
(`p6_dblround.py`, re-run and re-captured):

```
P6a/b over 299519 finite random pairs:
  via 25-bit intermediate: 23314 wrong (7.7838 %)
  via 53-bit intermediate: 0 wrong
  directed: 3F800001+33040000: one-step 3F800001, 25-bit two-step 3F800002
```

**The counterexample, worked exactly.** A = `3F800001` = 1 + 2^−23,
B = `33040000` = 2^−25·(1 + 2^−5) = 2^−25 + 2^−30.

- Exact sum = 1 + 2^−23 + 2^−25 + 2^−30. The part below the final ulp grid,
  2^−25 + 2^−30, is *less* than half an ulp (2^−24). Rounding once: down.
  Correct answer `3F800001`.
- Two-step via 25 bits (i.e. keep G and round into it — "round early"): the
  intermediate grid for values in [1,2) is multiples of 2^−24, half-step
  2^−25. The value sits 2^−25 + 2^−30 above the grid point 1 + 2^−23 —
  *more* than the half-step by the tiny 2^−30 — so the first rounding goes UP
  to 1 + 2^−23 + 2^−24. That is
  now an *exact tie* at binary32; ties-to-even sees LSB odd (1 + 2^−23) and
  rounds up again: `3F800002` — one ulp high, each rounding individually
  correct.

**The safe harbor, and why the reference model is legal.** The same experiment
through a 53-bit intermediate: **0 wrong in 299,519 pairs.** This is Figueroa's
theorem (title-only, Sources): double rounding (RNE then RNE) is innocuous for
the sum of two p-bit values whenever the intermediate precision is at least
2p + 2. For binary32, 2p + 2 = 50 ≤ 53 — a double holds the intermediate with
room to spare. This is the exact license behind two standing tools: python
`float` arithmetic + one `struct.pack('f')` per add, and Icarus `shortreal`
(stored as double, ch05) + one `$shortrealtobits` per add. One add each — the
license says nothing about chains (section 9). Note the intermediate the double
provides is 53 bits, not exactness: the exact sum of two binary32 values can
span up to 277 bits (2^127-scale down to 2^−149-scale); the double add itself
rounds, and the theorem is what makes that harmless.

**The in-adder version of the hazard — round early, round often.** A naive
implementation that RNE-rounds the *aligned small operand* to the big operand's
24-bit grid before adding (instead of keeping G/R/S) fails on **25,267 of
299,519 pairs (8.44 %)**. The cleanest measured failure: `3F800001 + 33800000`
= (1 + 2^−23) + 2^−24. Pre-rounding 2^−24 to the grid of 1.0 is an exact
half-step tie; ties-to-even rounds it to **zero** — the entire operand
evaporates before the add — giving `3F800001`. The true sum is half an ulp
above an odd significand: `3F800002`. One rounding, placed early, deletes an
operand; G/R/S exist precisely so that the one legal rounding happens once, at
the end, with the tie/not-tie evidence intact. (Same-shaped failure, opposite
direction, at `13DB5105 + 136C3461`: naive `1428B59A`, correct `1428B59B` —
from the random sweep's first hits.)

## 9. The reference model for chapter 9's testbench

The verdict chapter 9 needs, with the evidence behind each clause.

**The shortreal one-add path is trustworthy, re-verified at every boundary.**
The path is:

```verilog
a = $bitstoshortreal(bits_a);   // exact: assignment does not round (ch07)
b = $bitstoshortreal(bits_b);
r = $shortrealtobits(a + b);    // add in double; the ONLY binary32 rounding
```

Why it is sound: Icarus stores shortreal as a double (ch05), assignment does not
round (ch07's sharpened round-trip rule), so the `+` is one double-precision
add and the trailing `$shortrealtobits` is one binary32 rounding — a 53-bit
intermediate, inside Figueroa's 2p + 2 = 50 bound (section 8, measured 0/299,519
in python). Exponent range is never a worry: binary32 sums live in
[2^−149, 2^129), far inside double's normal range, so no double-subnormal or
double-overflow effect can intrude. Re-measured in the simulator itself this
session (E2): **25 directed adds, 0 mismatches against the exact rational
model**, including the cases where a shortreal reference is most suspect —
subnormal results (`00800000+80000001 → 007FFFFF`, `00000001+00000001 →
00000002`, subnormal cancellation `00000001+80000002 → 80000001`), both tie
directions (W5a/W5b bit-exact), both overflow paths (`max+max → 7F800000`,
`7F7FFFFF+73000000 → 7F800000`) and the just-below-threshold neighbour
(`7F7FFFFF+72FFFFFF → 7F7FFFFF`), signed zeros (`(+0)+(−0) → 00000000`,
`(−0)+(−0) → 80000000`, `1.5+(−1.5) → 00000000`), the deep-sticky pair, and
the section-8 double-rounding trap pair.

**Where it is NOT trustworthy, and what the testbench must do instead:**

1. **NaN sign and payload.** E2's `inf + (−inf)` returned `FFC00000` — a
   *negative* qNaN — on this host at runtime, while ch07 measured a *positive*
   one from constant folding of the same expression. IEEE 754 leaves the sign
   unspecified. The testbench must compare NaN results **by class, not by
   bits**: `is_nan(dut_out) && is_nan(ref_out)` passes, any bit comparison is
   nonportable. (E2's checker does exactly this and says so per row.)
2. **sNaN operands.** A signalling NaN cannot be delivered through the
   shortreal path at all: re-measured, `$shortrealtobits($bitstoshortreal
   (32'h7fa00000))` = `7fe00000` — quieted in transit, no arithmetic involved.
   sNaN test vectors must be **constructed as bit patterns in Verilog** and
   driven straight into the DUT; the expected *output* (a quiet NaN, invalid
   flag) likewise comes from python-generated expectation bits, not from any
   shortreal computation.
3. **Chains.** One add is licensed; a chain is not. E3, measured in Icarus: with
   a = 1.0 and b = c = `33000001` (2^−25 + 2^−48), the naive
   `$shortrealtobits(a + b + c)` = `3f800001`, but a serial binary32 adder
   produces `3f800000` — the testbench would flag a *correct* DUT wrong. The
   discipline: round-trip after **every** add
   (`t = $bitstoshortreal($shortrealtobits(a + b))`), which E3 confirms matches
   the serial result. The naive chain isn't "wrong arithmetic" — it equals the
   exact triple sum rounded once (verified with Fraction: exact =
   140737496743937/2^47 → RNE → `3F800001`) — it is a *more accurate* answer
   than a real binary32 adder chain can produce, which is precisely ch05's
   "reference more accurate than the DUT" trap with a measured instance.
4. **Flags.** The shortreal path yields result bits only. Expected
   invalid/overflow/inexact flags come from the python exact model (`exact_add`
   returns inexact for free; overflow = result inf with finite operands;
   invalid = sNaN or inf−inf), delivered as expectation vectors alongside the
   result bits.

**Stimulus notes to carry forward** (from STATE, restated because ch9 will build
this): seed `$urandom` once per simulation and discard the first draw (the
first-draw-linear-in-seed bias); random operand pairs leave the close-exponent
and tie regimes nearly untouched (81.6 % of uniform pairs are sticky-region;
the rounding-carry renormalize appeared 0 times in 10^6 random pairs), so the
directed list — the ten worked examples plus section 6's counterexample pairs —
is not optional garnish but the only coverage of several wires.

## 10. Order of operations: seeds for chapter 10

Chapter 10 extends to four inputs; its central fact is that binary32 addition is
**not associative**, so "the sum of four numbers" is undefined until the design
document fixes an association order — and the reference model must fix the
*same* one. Groundwork, each add below individually verified through the exact
model (`p7_assoc.py`, re-run and re-captured this session):

**T1 — the canonical triple: a = 2^24, b = c = 1.**

- `(a+b)+c`: a+b = 16777217 → W5a's exact tie → `4B800000` (16777216); +1 →
  the same tie again → `4B800000`. **Result 16777216.**
- `a+(b+c)`: b+c = 2 (exact, `40000000`); a+2 = 16777218, representable (ulp at
  2^24 is 2) → `4B800001`. **Result 16777218.**
- Exact sum = 16777218 → the right-association answer is the exactly rounded
  one; the left association lost both units to back-to-back ties. Every ledger
  line above is one of this chapter's own worked cases — non-associativity is
  nothing new, just W5a fired twice from a particular order.

**T2 — intermediate overflow that cancels (the case ch05's seed named):
a = b = maxnormal, c = −maxnormal.**

- `(a+b)+c`: a+b overflows → `7F800000` (+inf); inf + (−max) = inf (step 2's
  screen). **Result +infinity.**
- `a+(b+c)`: b+c = 0 exactly (`00000000`); a+0 = a. **Result `7F7FFFFF` =
  maxnormal**, which equals the exactly rounded true sum.
- The exact sum (340282346638528859811704183484516925440 = maxnormal) is
  finite; one grouping produces it, the other produces infinity — and once an
  intermediate is infinite, no later operand can repair it: infinity is
  *absorbing* through step 2. For a four-input adder this is the sharpest
  possible statement that tree shape is part of the arithmetic specification,
  not an implementation detail.

**T3 — how common is grouping-dependence?** 100,000 random triples per regime,
`(a+b)+c` vs `a+(b+c)`:

```
exponents anywhere      :  2.90 % differ
exponents within 10     : 22.24 % differ
exponents within 2      : 31.45 % differ
```

Not a corner-case curiosity: for operands of similar magnitude (the accumulator
case!) nearly a third of random triples change value with association. Chapter
10's tree-vs-sequential discussion should quote these; its testbench
implication is section 9's rule squared — the reference must replicate the
DUT's association order add by add, round-tripping between every one.

## 11. Icarus experiments

All under Icarus Verilog 13.0 (`/usr/local/bin/iverilog`), `-g2012 -Wall`,
zero-output compiles, re-run from cold recompiles in this session; outputs below
are captured, not recalled. Sources in the scratchpad (`tb_e1_align.v`,
`e1_check.py`, `tb_e2_shortreal.v`, `e2_check.py`, `tb_e3_chain.v`).

**E1 — ch02's `align_sticky` is step 4 of the algorithm, re-verified.**

```
iverilog -g2012 -Wall -o e1.vvp tb_e1_align.v guide/src/ch02/align_sticky.v
vvp e1.vvp | python3 e1_check.py
E1: 256 vectors checked, 0 mismatches
```

Eight directed 24-bit mantissas (min-normal `800000`, all-ones `FFFFFF`, the
deep-sticky pattern `800001`, a subnormal-style `000001`, and four mixed
patterns) crossed with all 32 shift amounts, checked against an independent
fixed-point model of "aligned = floor, G/R = next two bits, sticky = OR of the
rest, saturation at 26". The module's convention is exactly the chapter's:
saturated shifts leave `aligned = G = R = 0`, `sticky = |mant` — measured
across the saturation boundary (shifts 24…31 on every pattern).

**E2 — the shortreal one-add reference probed at 25 boundary cases.** Compile
and run as above (`tb_e2_shortreal.v`); checker compares each result against
the exact rational model, NaN rows by class only:

```
E2: 25 adds checked, 0 mismatches
  (all ten worked examples bit-exact; subnormal results, subnormal
   cancellation, both overflow paths and the just-below-threshold pair,
   signed zeros, deep-sticky pair, double-rounding trap pair: all exact;
   inf+(-inf) -> FFC00000: NaN, sign not checked)
  sNaN 7FA00000 pure round-trip -> 7fe00000  (quieted, payload kept)
```

Two rows deserve the chapter's attention: the runtime `inf + (−inf)` NaN came
out *negative* (`FFC00000`) on this host — same simulator that constant-folds a
*positive* one (ch07) — a live instance of the NaN-sign portability rule; and
the sNaN round-trip quieting reconfirms that sNaN vectors must be built from
bits (section 9).

**E3 — one add via double is safe, a chain is not (measured, not argued).**

```
iverilog -g2012 -Wall -o e3.vvp tb_e3_chain.v && vvp e3.vvp
a+b rounded        = 3f800000
naive double chain = 3f800001
disciplined chain  = 3f800000
E3 CONFIRMED: chain differs, discipline matches serial binary32
```

Operands a = `3F800000`, b = c = `33000001` (2^−25 + 2^−48), chosen so both
partial sums are exact in double (49 and 48 significant bits — under 53) and
the discrepancy is *purely* the missing intermediate rounding, not double
round-off: the naive chain equals the exact triple sum rounded once
(`3F800001`, Fraction-verified), while real binary32 hardware rounds twice and
gets `3F800000`. The python cross-check of the same three paths agrees on all
values.

Supporting python measurement runs, for the record (all re-run this session):
P1 rounder validation (100k doubles + 200k grid integers, 0 mismatches, plus
the ten directed boundary probes matching ch07's table), P2 million-pair
datapath sweep (section 3), P3 degraded variants (section 6), P5 Sterbenz
(section 7), P6 double rounding (section 8), P7 associativity (section 10),
P8 worked-example traces (sections 4–5). Counting the three Icarus runs, that
is 10 numbered experiments over roughly 2.1 million verified operand pairs.

## 12. How real adders organize it: close/far paths and LZA (documentation, not measurement)

**Everything in this section is documentation from the literature, not something
measured here** — the same epistemic wall chapters 3 and 4 maintain. It exists
to seed chapter 11's pipelining discussion; chapter 9's single-cycle design
does not need it.

**The two-path (close/far) organization.** The step-7 dichotomy this chapter
*measured* — massive cancellation only at d ≤ 1, at most a one-position shift
everywhere else — is exploited by production adders as two parallel datapaths
(Ercegovac & Lang ch. 8; Koren; Muller et al. Handbook ch. on addition; Seidel &
Even 2004 — all title-only):

- the **far path** (d ≥ 2, plus all effective additions): a big alignment
  shifter with G/R/S capture, the wide add, at most a ±1 normalize, full
  rounding — steps 4–8 as taught here;
- the **close path** (d ≤ 1, effective subtraction): no big right shifter
  (alignment is 0 or 1), but a leading-zero problem and a big *left* shifter;
  rounding is degenerate because — as this chapter proved and measured — the
  d ≤ 1 difference is exact apart from the single G bit.

Each path drops the other's expensive block, the selection needs only the
exponent difference and the sign XOR, and the two paths balance better across
pipeline stages than the single serial chain. Latency, not correctness, is the
motive: the one-path algorithm of this chapter is complete and exact.

**LZC vs LZA.** This chapter's normalizer *counts* leading zeros after the
subtraction completes (LZC) — a serial dependency: subtract, count, shift. A
leading-zero *anticipator* (LZA) predicts the count from the operands in
parallel with the subtraction itself, from a bit-pair propagate/generate/kill
pattern, at the cost of a possible off-by-one that a final 1-bit correction
shift absorbs (Schmookler & Nowka 2001, the standard survey/comparison —
title-only; the existence and role of these papers was confirmed by web search,
but none was fetched, so no claim beyond their titles is made here). For this
guide: chapter 9 should use the honest LZC (a priority encoder over the 26-bit
difference); chapter 11 can present LZA as the timing optimization whose
correctness argument is precisely the step-7 invariant plus one correction
shift.

**A calibration for the reader**: the census numbers from P2 (19 % saturated
alignments, 5 % massive cancellations, 17 % carry renormalizes on the mixed
generator) are properties of *that stimulus*, not of workloads; the two-path
frequency argument in the literature is about critical paths, not case
frequencies. The chapter should not blend the two.

## 13. Sources

**Fetch-verified this session:**

- David Goldberg, *What Every Computer Scientist Should Know About
  Floating-Point Arithmetic* (ACM Computing Surveys, March 1991), as the edited
  reprint in Appendix D of the Sun/Oracle Numerical Computation Guide —
  https://docs.oracle.com/cd/E19957-01/806-3568/ncg_goldberg.html — fetched;
  source of the quoted second-guard-digit-plus-sticky sentence (§6), the
  guard-digit theorems, and the benign/catastrophic cancellation distinction
  (§7). Note the page's Theorem numbers: the guard-digit relative-error result
  is its Theorem 2.

**Cited [title-only] — no URL invented, not fetched:**

- IEEE Std 754-2019, *IEEE Standard for Floating-Point Arithmetic* — §4.3
  (roundTiesToEven), §6.3 (sign of an exact zero sum), clause 7 (exceptions).
  The normative anchor for steps 2, 8, 10.
- Pat H. Sterbenz, *Floating-Point Computation*, Prentice-Hall, 1974 — the
  lemma of §7 (Goldberg's fetched page confirms the book's existence and
  out-of-print status).
- Samuel A. Figueroa, "When is double rounding innocuous?", ACM SIGNUM
  Bulletin 30(3), 1995 — the p' ≥ 2p + 2 result measured in §8.
- J.-M. Muller et al., *Handbook of Floating-Point Arithmetic*, Birkhäuser —
  general reference for §§3, 7, 8, 12; also "On the definition of ulp(x)"
  (already title-only in ch07).
- M. D. Ercegovac and T. Lang, *Digital Arithmetic*, Morgan Kaufmann, 2004 —
  ch. 8, floating-point addition; two-path organization (§12).
- I. Koren, *Computer Arithmetic Algorithms*, 2nd ed., A K Peters — FP
  addition and rounding implementation (§12).
- P.-M. Seidel and G. Even, "Delay-optimized implementation of IEEE
  floating-point addition", IEEE Transactions on Computers 53(2), 2004 — the
  dual-path adder (§12); existence confirmed via web search results only.
- M. S. Schmookler and K. J. Nowka, "Leading zero anticipation and detection —
  a comparison of methods", Proc. IEEE ARITH-15, 2001 — LZA vs LZC (§12);
  existence confirmed via web search results only.

**Guide-internal sources** (all verified artifacts, not citations):
`guide/src/ch02/align_sticky.v` (re-verified E1); ch05 §"Verifying Floating
Point Specifically" taxonomy rows A–I (vectors reused throughout §§4–5);
ch06 §"Shortening a Result: Rounding and Its Bias"; ch07 research §§7–9
(rounding attributes, special-value addition, exponent-field arithmetic) and
the five ch07 toolchain findings in STATE.md.

Web usage total: one fetch (Goldberg, verified above) + one search (§12
existence check); well under the 8-URL budget. Everything else in these notes
is measured locally.
