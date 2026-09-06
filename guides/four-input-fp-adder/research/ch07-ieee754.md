# Chapter 7 research — IEEE 754 single precision in depth

<!-- sections complete: 12/12 -->

Research notes for the chapter that defines the binary32 format exhaustively:
fields, classes, populations, worked encodings, subnormals, NaN anatomy,
rounding, special-value addition tables, exponent-field hardware arithmetic,
Icarus `shortreal` behaviour, and comparative format context. Every numeric
claim below was verified in-session with python3 (`struct` is ground truth);
every simulator claim was measured in-session against Icarus Verilog 13.0
(`iverilog -g2012 -Wall`, Linux x86-64). Predecessors read: chapter 6's biased
encoding section including its dated correction (the whole-float-compares
claim is FALSE for opposite-sign pairs and is not restated here), chapter 5's
FP corner-case taxonomy rows A–I, and STATE.md's toolchain findings
(shortreal-is-a-double, the NaN-sign portability finding, $urandom(seed) bias).

## 1. The format bit-for-bit: three fields and one convention

Binary32 is one sign bit, eight exponent bits, twenty-three fraction bits,
packed MSB-first:

```
bit:   31 | 30 ......... 23 | 22 ................. 0
       S  | E (8 bits)      | F (23 bits)
```

Field extraction is pure wiring — in Verilog `s = w[31]`, `e = w[30:23]`,
`f = w[22:0]`; in python `s = (b>>31)&1`, `e = (b>>23)&0xFF`, `f = b&0x7FFFFF`.
Verified (`a_layout.py`, struct as ground truth):

```
     1.0 bits 3f800000  sign 0  exp 127 (0b01111111)  frac 0x000000
    -2.0 bits c0000000  sign 1  exp 128 (0b10000000)  frac 0x000000
     0.5 bits 3f000000  sign 0  exp 126 (0b01111110)  frac 0x000000
    6.25 bits 40c80000  sign 0  exp 129 (0b10000001)  frac 0x480000
```

The whole format is then two lookups on the exponent field:

| E field | F field | class | value |
|---|---|---|---|
| 0 | 0 | signed zero | ±0 |
| 0 | ≠0 | subnormal | ±(0.F)₂ × 2^−126 |
| 1…254 | any | normal | ±(1.F)₂ × 2^(E−127) |
| 255 | 0 | infinity | ±∞ |
| 255 | ≠0 | NaN | no value; F bit 22 = quiet bit, rest = payload |

The **one convention** that makes the format work: a normalized binary
significand always starts `1.` — in base 2 the leading digit of a normalized
number can only be 1 — so that bit is not stored. Normals get 24 bits of
significand for a 23-bit field. The stored `F` is only the fraction; the
"hidden" or "implicit" bit is prepended by the decoder: significand =
`{1'b1, F}` when `E != 0`, `{1'b0, F}` when `E == 0`. Section 5 covers why the
`E == 0` row *cannot* have the hidden 1, and section 9 gives the one-line
hardware decode that unifies both rows.

Terminology the chapter should fix early and use consistently:
**significand** = the full 24-bit `1.F`/`0.F` quantity (the standard's term);
**fraction** or **trailing significand field** = the stored 23 bits;
"mantissa" is the folk word for either — fine in speech, ambiguous in a spec.
Anchors worth memorizing: `1.0 = 0x3F80_0000` (stored exponent 127 ↔ actual 0),
`2.0 = 0x4000_0000`, `-2.0 = 0xC000_0000` (sign bit only difference from 2.0
requires no arithmetic — the format is sign-magnitude, chapter 6's "obsolete"
system returned).

## 2. Bias 127, not 128 — what the offset buys

The exponent field is excess-127: stored = actual + 127. Chapter 6 taught
excess-8 at 4 bits, whose "natural" bias is 2^(N−1) = 8; IEEE's bias is
2^(N−1) − 1 = 127, one less, and the standard fixes it by rule: emax =
2^(w−1) − 1 and emin = 1 − emax (754-2019 Table 3.5 [title-only]). With the
two end patterns reserved — stored 0 for zero/subnormals, stored 255 for
inf/NaN — the normal exponent range is:

```
stored 1..254  ->  actual -126..+127        (a_layout.py, verified)
```

**Where the asymmetry lands.** |emin| = 126 < emax = 127: the extra binade is
at the *top*. Consequences, all struct-verified:

```
max normal    = (2-2^-23)*2^127 = 3.4028234663852886e+38  bits 7f7fffff
min normal    = 2^-126          = 1.1754943508222875e-38  bits 00800000
min subnormal = 2^-149          = 1.401298464324817e-45   bits 00000001
1/min_normal  = 2^126 -> bits 7e800000  (exact, a normal — no overflow)
1/max_normal  = 2.938736e-39   -> bits 00200000  (subnormal, NOT zero)
1/min_subnormal = 2^149 -> overflows (python struct raises OverflowError
                           rather than returning +inf — an encoder built on
                           struct must special-case the overflow row)
```

So the reciprocal of every *normal* is representable and nonzero: 1/minnormal
lands inside the normals, 1/maxnormal lands in the subnormals thanks to
gradual underflow. A defensible way to state the design logic (rationale, not
standard text): underflow has a cushion — subnormals extend reach to 2^−149 —
while overflow is a cliff, so the spare binade goes to the cliff side. Under
the bias-128 alternative (stored 1..254 → −127..+126) the top of the range
halves to (2−2^−23)·2^126 while the bottom gains one binade it barely needed.
Also worth quoting: minnormal × maxnormal = (2−2^−23)·2 = 4 − 2^−22 ≈ 4, so
the normal range is geometrically centered near 2, not 1.

**The encoded-order property** (the reason bias beats two's complement here,
continuing chapter 6 §3.4): with the fields packed exponent-above-fraction and
the exponent biased, the 31 magnitude bits of a float compare like an unsigned
integer. Verified two ways (`a_layout.py`):

```
all 255 exponent-boundary crossings monotone: True     (0x007FFFFF<0x00800000, ..., 0x7F7FFFFF<0x7F800000)
10^6 random adjacent sign-0 pairs monotone: True
```

The map bits→value is strictly increasing across the entire sign-0, non-NaN
range **including the subnormal/normal boundary and the normal/infinity
boundary** — no special cases. The chapter 6 dated correction stands and must
be carried: this is a *magnitude* property. Whole floats do not compare
lexically across signs:

```
-1.0 bits bf800000  2.0 bits 40000000  lexical order says -1.0 > 2.0: True
```

Negative floats sort in *reversed* bit order (sign-magnitude, not two's
complement), and −0/+0 compare equal numerically while differing in bit 31.
One tie-back worth a sentence: chapter 6's MSB-flip identity (excess-2^(N−1)
= two's complement with the top bit flipped) does *not* quite hold for IEEE's
exponent, because 127 is 2^(N−1) − 1 — the off-by-one that buys the reserved
endpoints is also what breaks the tidy identity. Bias here is chosen for the
lexical-order property and the reserved patterns, not for two's-complement
compatibility.

**Dynamic range, closing chapter 6's account.** Chapter 6 measured Q16.16 at
2^47 ≈ 14.15 decades. Binary32 (verified, `python3 math.log2/log10`):
maxnormal/minnormal = 2^254 ≈ **76.46 decades**, and with subnormals
maxnormal/minsubnormal = 2^277 ≈ **83.39 decades** — nearly six times the
decades of Q16.16 in the same 32 bits, bought by spending 8 bits on a scale
field and paying with 24-bit (not 31-bit) precision. That is the fixed-vs-
float trade in one line, and the chapter should close the loop chapter 6
opened with exactly these numbers.

Hardware consequences for chapters 8–9: magnitude comparison of two operands
is one 31-bit unsigned compare of `w[30:0]`; the alignment question "whose
exponent is bigger, by how much" is one 8-bit unsigned subtract of raw
exponent fields — the biases cancel in the difference, so no un-biasing
hardware exists anywhere in an FP adder.

## 3. The five operand classes and their exact populations

Re-derived independently of chapter 5 (`a_layout.py`); every count checks
against 2^32:

| class | condition | count | formula | share of 2^32 |
|---|---|---|---|---|
| zeros | E=0, F=0 | 2 | 2 | 0.00000005% |
| subnormals | E=0, F≠0 | 16,777,214 | 2·(2^23−1) | 0.390625% |
| normals | 1≤E≤254 | 4,261,412,864 | 2·254·2^23 | 99.218750% |
| infinities | E=255, F=0 | 2 | 2 | 0.00000005% |
| NaNs | E=255, F≠0 | 16,777,214 | 2·(2^23−1) | 0.390625% |
| **total** | | **4,294,967,296** | = 2^32 ✓ | 100% |

The NaNs split on fraction bit 22 (the quiet bit, section 6):

```
qNaN (bit 22 = 1):        2 * 2^22     = 8,388,608
sNaN (bit 22 = 0, F != 0): 2 * (2^22-1) = 8,388,606   (F=0 would be infinity)
```

Numbers a chapter writer will want verbatim:

- P(uniform random 32-bit pattern is subnormal) = P(NaN) = 16,777,214/2^32 =
  **0.390625%** (they differ by nothing: same count, different end of the
  exponent scale). Exactly 0.390625% would be 2^−8; the true value is a hair
  under (2·(2^23−1) = 2^24 − 2, not 2^24). Printed at 6 places both round to
  0.390625%.
- P(a random *pair* contains at least one subnormal) = 1 − (1 − p)^2 =
  **0.779724%** — chapter 5's "0.78%" re-derived. ✓
- 99.22% of all patterns are normals: uniform-random bit patterns almost never
  exercise the special classes, which is chapter 5's argument that FP corner
  cases must be directed.

**The classification procedure to teach** (decode any pattern in four
questions, no arithmetic):

1. Split 1/8/23. (Hex habit: first hex digit and a bit — sign is bit 31;
   E = bits 30:23 straddles the first two hex digits, so read E as
   `(b >> 23) & 0xFF`, do not eyeball hex digits.)
2. E = 0? → F = 0 ? signed zero : subnormal.
3. E = 255? → F = 0 ? infinity : NaN (then bit 22: quiet or signalling).
4. Otherwise normal: value = (1 + F/2^23) × 2^(E−127), sign from bit 31.

This matches chapter 5's operand-class vocabulary (zero, subnormal, normal,
infinity, NaN — the classes its taxonomy rows A–D cross), so the chapter can
reuse taxonomy language without translation.

**The hex range table** — because the classes are contiguous unsigned ranges
(section 2's monotonicity), classification is also a plain range lookup, which
is both the fastest hand method and literally the comparator chain a Verilog
classifier compiles to. Sign-0 half (mirror with bit 31 set for negatives);
NaN split boundaries verified in `h_extra.py`:

```
0x00000000               +0
0x00000001 .. 0x007FFFFF +subnormal
0x00800000 .. 0x7F7FFFFF +normal
0x7F800000               +inf
0x7F800001 .. 0x7FBFFFFF sNaN   (sign-0 side; quiet bit clear)
0x7FC00000 .. 0x7FFFFFFF qNaN   (sign-0 side)
```

Quotable reading habit: anything strictly between 0x00800000 and 0x7F800000
is an ordinary positive number; the interesting patterns all cluster at the
two ends of each half.

## 4. Worked encodings, every one struct-verified

All from `b_worked.py`; the exact decimal values come from `Fraction`, the bit
patterns from `struct`. Each example is written as the hand procedure the
chapter must teach.

**Encode procedure:** (1) sign off, work with |x|; (2) normalize: find e with
2^e ≤ |x| < 2^(e+1); if e < −126, clamp e = −126 (subnormal path, no hidden
1); (3) compute the 23 fraction bits of |x|/2^e − 1 (normal) or the 23 bits of
|x|/2^−126 (subnormal), keeping guard/round/sticky; (4) round (RNE unless
stated); (5) assemble sign, e+127, fraction — with two escapes: a fraction
carry bumps the exponent, and e+127 > 254 means overflow to infinity.

**Example 1 — 1.0 (the anchor normal).** 1.0 = 1.0 × 2^0. Sign 0, stored
exponent 0 + 127 = 127 = 0b01111111, fraction 0. Bits
`0 01111111 00000000000000000000000` = **0x3F800000**. ✓ struct.

**Warm-up between 1 and 2 — 6.25, a terminating fraction (no rounding
step).** 6.25 = 110.01₂ = 1.1001₂ × 2^2. Sign 0; stored exponent 2 + 127 =
129 = 0b10000001; fraction = the bits after the point, left-aligned:
0.5625 × 2^23 = 4,718,592 = 0x480000 exactly. Assembled **0x40C80000** ✓
struct (`h_extra.py`). Terminating binary fractions are the only encodes with
no rounding decision; the chapter should sequence this *before* 0.1 so the
rounding machinery arrives as the new ingredient, not as noise.

**Example 2 — 0.1 (a repeating fraction that must round).**
0.1 = 1.6 × 2^−4, so stored exponent −4+127 = 123 = 0b01111011. The fraction
bits of 0.6 repeat with period 4:

```
first 28 fraction bits of 1.6: 1001100110011001100110011001...
kept 23: 10011001100110011001100   G=1 R=1 S=1 (tail repeats forever)
```

G=1 and (R|S)=1 → round up: 0x4CCCCC + 1 = 0x4CCCCD. Assembled:
**0x3DCCCCCD** ✓ struct — chapter 6's seeded constant, now derived. Stored
exact value **0.100000001490116119384765625**; error = 1.490116×10^−9 above
0.1, which is **0.200000 ulp** (verified ≤ 0.5 ulp). The chapter should print
that exact decimal in full: "0.1" does not exist in binary32 and the reader
should see precisely what does.

**Example 3 — 2^24 + 1 = 16777217, the first integer that does not fit.**
16777217 is 25 bits (`0b1000000000000000000000001`); normalized it is
1.000…001 × 2^24 with the trailing 1 in position 24 — the guard position.
G=1, R=0, S=0: an exact tie between 16777216 (F = 0x000000, LSB even) and
16777218 (F = 0x000001, LSB odd). Ties-to-even keeps the even:
`float(16777217) = 16777216.0` = **0x4B800000** ✓. Contrast tie-up:
16777219 sits between 16777218 (odd) and 16777220 (even) → **0x4B800002** =
16777220.0 ✓. One tie each way is chapter 5's row-G lesson.

**Example 4 — 2^−140, a subnormal.** 2^−140 < 2^−126, so E = 0 and the value
is F × 2^−149: F = 2^−140/2^−149 = 2^9 = 512 = 0x000200. Bits **0x00000200**
✓. Cross-check in the other convention: 0.F × 2^−126 with F/2^23 = 512/2^23 =
2^−14, and 2^−14 × 2^−126 = 2^−140 ✓. Exact value
7.174648137343063…×10^−43 (60-digit Decimal in `b_worked.py`).

**Example 5 — the normal-range endpoints.**

```
min normal  0x00800000 = 0 00000001 000...0  = 2^-126
            exact 1.17549435082228750796873653722224567781866555677208752150875e-38
max normal  0x7F7FFFFF = 0 11111110 111...1  = (2-2^-23)*2^127
            exact 340282346638528859811704183484516925440  (~3.4028235e38)
largest subnormal 0x007FFFFF = 1.1754942107e-38 = (1-2^-23) * min normal
```

Note the adjacency: 0x007FFFFF and 0x00800000 are one ulp apart and their
values differ by exactly 2^−149 — the encoding crosses the class boundary
without a seam (section 5).

**Example 6 — a NaN with payload.** 0x7FC00055: E = 255, F = 0x400055 ≠ 0 →
NaN. Fraction bit 22 = 1 → quiet; payload bits 21:0 = 0x000055 = 85.
0x7F800055 (bit 22 = 0, F ≠ 0) is the *signalling* NaN with the same payload.
0x7F800000 (F = 0) is +infinity — which is exactly why an sNaN's payload can
never be all zeros: that pattern is taken.

**Decode drill for the chapter — 0xC0490FDB:** sign 1, E = 128 → 2^1,
F = 0x490FDB → 1.5707963705… × 2 = **−3.1415927410125732421875** (−π rounded
to binary32) ✓ struct.

## 5. Subnormals in depth: gradual underflow and its price

**Why normals get a free 24th bit and subnormals cannot.** The hidden 1 exists
because normalization forces it: every nonzero number has a binary expansion
starting with a 1 somewhere, and sliding the exponent puts that 1 just left of
the point. But the exponent field bottoms out at stored 1 (actual −126). A
value below 2^−126 cannot slide far enough; its significand must start `0.`
and those leading zeros must be *stored*, eating precision. That is the
definition of a subnormal: fixed scale, variable precision — from 23
significant bits at 0x007FFFFF down to 1 at 0x00000001. (C names, for
cross-reference when readers meet them: `FLT_MIN` = min *normal* 2^−126,
`FLT_TRUE_MIN` = min subnormal 2^−149 — the naming itself preserves the
common confusion.)

**The −126 / −149 reconciliation** (both appear in the literature; confusing
them is a classic error). For E = 0:

```
value = (0.F)  * 2^-126      -- "effective exponent -126", fractional significand
      = F      * 2^-149      -- integer significand, scale of the LSB
```

Verified identical (`c_subnormal.py`): for 0x00000200 both give
7.174648e-43, `equal: True`. −126 is the *exponent*; −149 = −126 − 23 is the
*weight of the fraction LSB*. The wrong third reading — plugging E = 0 into
the normal formula's E−127 = −127 — was measured too: it decodes 0x00000200 to
3.587324e-43, **off by exactly 2×**. That factor-of-two error is the
fingerprint of the bug (chapter 5 row B calls it "the commonest subnormal
bug"): stored exponents 0 and 1 share scale 2^−126; the +1 step from E=0 to
E=1 is compensated by the hidden bit appearing, not by a scale change.

**The gap structure — what gradual underflow buys** (`c_subnormal.py`):

```
gap 0 -> min normal (if subnormals removed):  2^-126 = 1.175494e-38
gap min normal -> next normal:                2^-149 = 1.401298e-45
ratio: 2^23 = 8388608
```

Without subnormals the first gap above zero is **8,388,608 times wider** than
the gaps just above it. With them, 2^23 − 1 values fill (0, 2^−126) at uniform
spacing 2^−149 — measured: 0x00000001→0x00000002 spacing 1.401298e-45, and the
top subnormal to min normal exactly the same. The number line's spacing is
monotone all the way down; zero is approached by a ramp, not a cliff.

**The property that pays the rent** (Goldberg's theorem 10, fetched:
"x = y ⟺ x − y = 0" and his motivating fragment
`if (x ≠ y) then z = 1/(x-y)` failing by "a spurious division by zero"):

```
x=0x00800001, y=0x00800000:  x-y = 2^-149 = bits 0x00000001  (nonzero!)
```

Distinct floats always subtract to nonzero *because* the difference of two
normals closer than 2^−126 is subnormal and representable. Measured boundary:
with exponent field 23 an adjacent-pair difference is subnormal 0x00400000;
**exponent field 24 is the first whose ulp (2^−126) is itself normal** — below
that band FTZ tells lies. Related and worth one line: **Sterbenz's lemma** —
if y/2 ≤ x ≤ 2y then x − y is exact; verified over 200,000 conforming random
pairs, zero inexact differences (`g_misc.py`).

**The exponent-promotion property** chapter 6 seeded, verified in python and
re-verified in Icarus (section 10):

```
00400000 + 00400000 = 00800000     (0.5+0.5)*2^-126 -> min normal
007FFFFF + 00000001 = 00800000     ch5 row B's own vector
00200000 + 00600000 = 00800000     (0.25+0.75)*2^-126
```

Mechanism, exactly: subnormals and min-binade normals share scale 2^−149 per
LSB; a carry out of fraction bit 22 lands in bit 23, which *is* the hidden-1
position of stored exponent 1 at the same scale (verified:
1.0×2^−126 ≡ 2^23×2^−149). So the adder's raw sum `{E=0 carry, fraction}`
is already the correct `{E=1, fraction}` encoding — **exponent 0→1 with no
shift, no special case**. This is the single prettiest hardware consequence of
the encoding and chapter 9 gets it for free if the datapath uses
`eff_exp = max(E,1)` (section 9).

**Flush-to-zero, the hardware cop-out.** FTZ replaces subnormal results with
zero (DAZ additionally zeroes subnormal *inputs*); GPUs and DSPs and `-ffast-math`
do it because handling a denormalized significand needs the leading-zero
counter and shifter in paths that otherwise skip them. The measured cost:
every x in (0, 2^−126) maps to 0 — relative error 100% across the whole band,
where gradual underflow keeps absolute error ≤ 2^−150 and loses relative
accuracy only gradually (the last gap above zero). And the x−y property dies:
0x00800001 − 0x00800000 flushes to 0 while x ≠ y. Chapter 12 note (already
flagged by ch5's taxonomy): FTZ is a *specification*, not an optimization — if
the adder flushes, the reference model must flush identically or thousands of
"failures" are a spec mismatch.

## 6. NaN anatomy: quiet bits, payloads, propagation, the unspecified sign

**Encoding.** E = 255, F ≠ 0. Fraction bit 22 (the MSB of the trailing
significand field) is the **quiet bit**: 1 = quiet NaN, 0 = signalling NaN.
Bits 21:0 are the **payload** — 22 bits of freight the format carries but no
arithmetic reads. Populations: 8,388,608 qNaNs, 8,388,606 sNaNs (section 3);
the two missing sNaN patterns are ±infinity, which is why a signalling NaN's
payload must be nonzero.

**What 754-2019 §6.2 requires vs recommends** [title-only, clause numbers]:

- *Shall*: an operation that signals invalid and delivers a floating-point
  result delivers a **quiet** NaN (§6.2). Operations with quiet NaN inputs
  (and no sNaN) return a quiet NaN and signal nothing.
- *Should*: the quiet-bit-is-MSB **encoding itself is a recommendation**
  (§6.2.1), universal today (x86, ARM, RISC-V) but historically inverted on
  PA-RISC and pre-2008 MIPS — one reason cross-platform NaN bit-compares are
  a portability bug even between "IEEE machines".
- *Should*: payload **propagation** (§6.2.3) — the result of an operation with
  NaN inputs should be one of the input NaNs (quieted if it was signalling).
  Recommended, not required: hardware is free to return a canonical qNaN
  instead (some ARM configurations do exactly that, "default NaN" mode).

**Measured propagation and quieting on this machine** (Icarus 13.0, x86-64,
`tb1_roundtrip.v`):

```
qNaN(payload 0x55) + 1.0 = 7fc00055    payload propagated intact
sNaN 7fa00000     + 1.0  = 7fe00000    quiet bit SET, payload preserved
```

— re-confirming chapter 5's finding, now with a payload-carrying qNaN added.

**New finding: a pure round-trip also quiets, in both tools.** No arithmetic
at all — just convert to the working type and back:

```
Icarus:  $bitstoshortreal/$shortrealtobits:  7fa00000 -> 7fe00000  CHANGED
                                             7f800001 -> 7fc00001  CHANGED
python:  struct unpack/pack round-trip:      7FA00000 -> 7FE00000  CHANGED
```

Both go through the host's float32→float64 conversion, and x86's conversion
instruction quiets an sNaN (payload kept, bit 22 set). Consequence for every
later chapter: **an sNaN bit pattern cannot survive a trip through
`shortreal`/`real` or through python `float`** — sNaN test vectors must be
handled at the bit level (`Fraction`/integer decode in python, raw `reg [31:0]`
in Verilog), never passed through the value domain. Quiet NaNs, including
payloads, round-trip intact in both tools (12 of 14 boundary patterns
preserved; the two changed were the two sNaNs).

**The sign of a generated NaN is unspecified** (§6.3: the sign bit of a NaN
result is unspecified except for copy/negate/abs/copySign). STATE.md's
portability finding — x86-64 Icarus gives `ffc00000` for inf+(−inf) where
arm64 gave `7fc00000` — re-measured this session, plus a sharper wrinkle
(`tb4_followup.v`): **the sign differs between constant folding and runtime on
the same machine**:

```
const 0.0/0.0 (literals, compile-time folded) -> 7fc00000   positive qNaN
runtime 0/0 (variables)                       -> ffc00000   negative qNaN
runtime inf+(-inf)                            -> ffc00000
runtime inf*0                                 -> ffc00000
```

The x86 hardware default qNaN is negative (`ffc00000`, the "QNaN floating-point
indefinite"); Icarus's compile-time constant folder produces a positive one.
Same simulator, same host, both signs. The rule for every testbench from
chapter 8 on: **never compare a generated NaN's full bit pattern. Classify:
E == 255, F != 0, and check bit 22.** Payload/sign comparison is legitimate
only for NaNs the testbench itself injected.

**NaN behaviour worth stating for completeness:** any comparison with a NaN is
unordered — `x != x` is the standard self-test (verified via python `v != v:
True` for 0x7FC00055); NaN propagates through +, −, ×, ÷; and NaN beats
infinity (ch5 row C: control priority, NaN check before inf check in the
decode). One sentence of colour if the chapter wants it: the 2^23−1 NaN
patterns per sign are real estate — dynamic-language runtimes "NaN-box"
entire pointers into binary64 NaN payloads [title-only folklore; JavaScript
engines are the canonical example] — but for this guide's hardware the
payload is freight to preserve, never to invent.

## 7. Rounding: five attributes, G/R/S, ulp, and the error bounds

**The five attributes** (754-2019 §4.3: roundTiesToEven is the binary
default; roundTiesToAway is required only for decimal; toward-zero and the two
directed modes complete the set). A from-scratch 5-mode rounder over exact
rationals was built for these notes (`e_ulp_round.py`) and cross-checked
against struct's RNE on **100,000 random doubles with zero mismatches**; the
measured behaviour table, quotable verbatim:

```
           value      RNE      RNA      RTZ      RTP      RTN
          2^24+1 4B800000 4B800001 4B800000 4B800001 4B800000
          2^24+3 4B800002 4B800002 4B800001 4B800002 4B800001
         1+2^-24 3F800000 3F800001 3F800000 3F800001 3F800000
       1+3*2^-24 3F800002 3F800002 3F800001 3F800002 3F800001
      -(1+2^-24) BF800000 BF800001 BF800000 BF800000 BF800001
             0.1 3DCCCCCD 3DCCCCCD 3DCCCCCC 3DCCCCCD 3DCCCCCC
  maxn*(1+2^-25) 7F7FFFFF 7F7FFFFF 7F7FFFFF 7F800000 7F7FFFFF
           2^128 7F800000 7F800000 7F7FFFFF 7F800000 7F7FFFFF
```

Read off: RNE alone rounds ties by LSB parity (down at 2^24+1, up at 2^24+3);
RNA always away; RTZ truncates; the directed modes are asymmetric in sign (see
the −(1+2^−24) row: RTP truncates negatives). Overflow rows show the §7.4
defaults: RNE/RNA → ±inf; RTZ → ±maxfinite; RTP/RTN → inf only in their own
direction. The exact overflow threshold is **(2 − 2^−24)·2^127** = maxnormal +
half an ulp: just below → 7F7FFFFF, at the threshold (a tie whose "even"
neighbour is 2^128) → 7F800000. What each attribute does to (+0)+(−0) is a
*separate* rule, not a rounding: §6.3 makes an exact-zero sum +0 under every
attribute except roundTowardNegative, where it is −0 (standard text; ch5
already carries this).

**Machine epsilon has two conventions, one factor of 2 apart — state both.**
The C/`FLT_EPSILON`/numpy convention: ε = spacing of [1,2) = **2^−23** =
1.1920928955078125e-07 (verified: nextafter32(1.0) − 1.0). Goldberg's paper
(fetched) *defines* machine epsilon as the max relative rounding error
(β/2)β^−p = **2^−24** — what modern usage calls the **unit roundoff u**.
Reconciliation: ε_spacing = 2^−23, u = ε/2 = 2^−24; when quoting "machine
epsilon" say which. Measured bound: max relative error of double→binary32
rounding over 10^6 random normal-range values = **5.947e-08 < u =
5.9604644775e-08** ✓ — RNE's half-ulp guarantee in relative form.

The folk definition "epsilon is the smallest x with 1 + x ≠ 1" needs care
under RNE; measured (`h_extra.py`):

```
1.0 + 2^-23           -> 0x3F800001   (> 1: eps survives the add)
1.0 + 2^-24           -> 0x3F800000   (exact tie, even side is 1.0)
1.0 + (2^-24 + 2^-30) -> 0x3F800001   (a hair past the tie: up)
```

So values *below* 2^−23 can already bump 1.0 (anything past the tie), and
ε = 2^−23 is precisely the smallest power of two that does. The chapter
should also run the classic accumulation demo — chapter 6 promised 0.1 would
"reappear"; in a true binary32 chain (round after every add, section 10's
round-trip discipline):

```
0.1 summed 10 times in binary32 = 0x3F800001 = 1.0000001192...  (1 ulp ABOVE 1.0)
the same sum in double          = 0.9999999999999999            (just BELOW 1.0)
```

Each stored 0.1 is 0.2 ulp *above* one tenth (example 2), and 8 of the 10
adds are themselves inexact (measured — the first two are exact, then every
add rounds); the net lands 1 ulp high. The double sum errs low — same
phenomenon, different accumulation path. Neither equals 1.0, and `== 1.0` as
a loop condition is the canonical resulting bug.

**ulp(x), two definitions** (Goldberg's, fetched, is phrased per-representation:
d.d…d×β^e is in error by |d.d…d − z/β^e|·β^(p−1) ulps; Harrison's is the gap
between the two floats straddling x — cf. Muller, "On the definition of
ulp(x)" [title-only]). They differ only at binade edges, measured at 2.0:
gap below = 2^−23, gap above = 2^−22 — Goldberg-style ulp(2.0) = 2^−22 (2.0
owns binade [2,4)), Harrison ulp just below 2.0 = 2^−23. For the guide:
**ulp(x) = 2^(e−23)** for x in binade [2^e, 2^(e+1)) — and always say
"ulp *of the result*" when quoting adder error.

**The spacing table** (`e_ulp_round.py`, each row = value(bits+1) − value):

```
     x        bits         ulp(x)      as 2^k   ulp/x
   1.0    3F800000   1.192093e-07     2^-23   1.19e-07
   2.0    40000000   2.384186e-07     2^-22   1.19e-07
  10.0    41200000   9.536743e-07     2^-20   9.54e-08
  1000    447A0000   6.103516e-05     2^-14   6.10e-08
  10^6    49742400   6.250000e-02     2^-4    6.25e-08
  2^23    4B000000   1.000000e+00     2^0     1.19e-07
  2^24    4B800000   2.000000e+00     2^1     1.19e-07
  maxnorm 7F7FFFFF   2.028241e+31     2^104   ~6e-08   (via 7F7FFFFE..7F7FFFFF)
  2^-126  00800000   1.401298e-45     2^-149  1.19e-07
  2^-140  00000200   1.401298e-45     2^-149  1.95e-03  <- subnormal: rel. gap blows up
```

Constant *relative* spacing (within 2×) across 76 orders of magnitude, until
the subnormal band trades it away. Above 2^23 the ulp exceeds 1 — hence:
**every integer with |n| ≤ 2^24 is exact; 16777217 is the first that is not**
(swept exhaustively n = 1…2^24+1: first non-round-tripping integer =
16777217 ✓). 2^24 = 16,777,216 is the sharp boundary chapter writers should
quote, not "about 16 million".

**G/R/S mechanics, connecting chapter 2's `align_sticky`.** That module
exposes `aligned`, `guard`, `round`, `sticky` with sticky = OR of all bits
strictly below the round bit. With L = LSB of the kept significand, the RNE
decision is one gate expression:

```
round_up = G & (R | S | L)
```

verified exhaustively over all 1024 six-bit-mantissa × 4-dropped-bit
combinations against arithmetic rounding: 0 mismatches (`g_misc.py`). Reading:
G=1,(R|S)=1 → strictly past halfway, up; G=1,R=S=0 → exact tie, up only if L
odd; G=0 → down regardless. The other four attributes replace only this
equation (RTZ: never up; RTP/RTN: up iff any of G,R,S set and sign
agrees; RNA: up iff G). Chapter 8 owns the full align→add→normalize→round
pipeline; this chapter should stop at the decision table.

## 8. Special-value addition, exceptions, and flags (feeds chapters 8 and 12)

**Signed zeros — where the sign is observable** (all double-computed, exact,
`f_special.py`):

```
bits(+0.0) = 0x00000000   bits(-0.0) = 0x80000000    +0 == -0 numerically: True
1/+0 = +inf     1/-0 = -inf                          (divideByZero either way)
(-0.0)*5.0   = -0.0     (+0.0)*(-5.0) = -0.0         sign = XOR of signs, even at zero
sqrt(-0.0)   = -0.0
atan2(+0,-1) = +pi      atan2(-0,-1) = -pi           the branch-cut use case
copysign(1,-0.0) = -1.0                              the sign is really there
```

−0 exists because the format is sign-magnitude (2^31 patterns each side); the
standard makes it useful (branch cuts, 1/x sign, underflow from the negative
side) rather than papering over it. Note carefully: `==` cannot see it; only
bit inspection, copysign/signbit, or division can.

**Zero-sum sign rules for the adder** (verified under RNE; mode-dependence
from §6.3):

```
(+0)+(+0) = +0        (-0)+(-0) = -0        <- like signs: that sign, ALL modes
(+0)+(-0) = +0        (-0)+(+0) = +0        <- unlike signs, exact zero: +0...
x+(-x)    = +0  (x=1.5, both orders)        <- ...except roundTowardNegative: -0
```

The rule falls out of no datapath — magnitude subtraction produces zero with
no sign of its own — so the adder must hard-code it (ch5 row A said the same).

**Infinity arithmetic for addition:**

```
inf + inf = inf     inf + finite = inf     -inf + finite = -inf     inf + 0 = inf
inf + (-inf) = qNaN  +  INVALID            <- the one addition case that invents a NaN
```

Verified in Icarus (`tb1_roundtrip.v`): `inf + (-inf) = ffc00000` on this
x86-64 host (sign unspecified, section 6); `max + max = 7f800000` (overflow to
+inf).

**The five exceptions, specialized to ADDITION** — this is the table chapter
12's spec decision needs (754-2019 clause 7 [title-only]; all concrete
numbers verified in `f_special.py`):

| flag | raised by addition when | default result | notes |
|---|---|---|---|
| invalid (§7.2) | an operand is sNaN; or inf + (−inf) (magnitude subtraction of infinities) | qNaN | the only two triggers in add |
| divideByZero (§7.3) | **never** | — | defined only for an exact infinite result from *finite* operands; addition of finites is always finite before rounding |
| overflow (§7.4) | \|result rounded as if unbounded exponent\| > maxnormal | ±inf or ±maxfinite by mode (see §7 table) | always raises inexact too |
| underflow (§7.5) | tiny AND inexact (default handling) — **never for addition**, see below | the subnormal/zero result | |
| inexact (§7.6) | rounded result ≠ exact result | the rounded result | the everyday flag |

**Addition never raises underflow — the argument, then the hammer.** Every
binary32 value is an integer multiple of 2^−149. So the *exact* sum of two of
them is an integer multiple of 2^−149. If that sum is tiny (|sum| < 2^−126 =
2^23 · 2^−149), it is k·2^−149 with |k| < 2^23 — exactly a subnormal or zero.
A tiny addition result is therefore always exact, and default underflow
requires tiny AND inexact. Empirical hammer: 400,000 random cancelling pairs
produced 15,550 tiny sums, **inexact among them: 0**. (Reconciliation dated
2026-08-16, from the chapter 7 review: the writing pass re-ran this experiment
with its own generator and got 29,971 tiny sums from the same 400,000 pairs —
the tiny *rate* is a property of the generator's exponent distribution, not of
the claim. Inexact-among-tiny was 0 under both generators, and the reviewer's
independent 448k-pair exact-arithmetic search also found zero.) (This holds under either
tininess-detection choice, since exactness kills the flag both ways.) So a
binary32 *adder's* honest flag outputs are: invalid, overflow, inexact — plus
an underflow wire that is provably constant 0. Chapter 12 should either omit
it with this proof in the spec, or ship it tied low with a comment; either
way the decision must be written down (ch5's taxonomy already demands this).

**Overflow in addition has two distinct paths** (ch5 row H, now verified):
magnitude overflow (max + max = 6.8e38, over threshold) and **rounding-induced
overflow**: maxnormal + 2^103 has exact sum maxnormal + ulp/2 < 2^128, but the
significand tie against the odd 0xFFFFFF rounds *up* to 2^24, pushing the
exponent past 254 → infinity. The overflow flag can be raised by the rounder,
not the adder — the two paths exercise different hardware.

**Inexact examples for the testbench** (exactness checked with Fraction):

```
1.0 + 2^-24  -> 3F800000  inexact    1.0 + 1.0   -> 40000000  exact
2^24 + 1.0   -> 4B800000  inexact    0.5 + 0.25  -> 3F400000  exact
```

## 9. Exponent field arithmetic for the hardware designer

The bridge material between this chapter's encoding and chapter 8's
algorithm — every line here is a consequence already verified above,
restated as datapath fact.

**The unified decode, three lines of Verilog:**

```verilog
wire        hidden = |e;                    // 0 only for zero/subnormal
wire [23:0] sig    = {hidden, f};           // 24-bit significand, both classes
wire [7:0]  eff_e  = hidden ? e : 8'd1;     // effective exponent field: max(E,1)
```

This is the entire subnormal story in hardware: treat E = 0 as E = 1 with a
zero hidden bit, and *no other subnormal special case exists in the add/align
datapath*. Why it works: stored exponents 0 and 1 share the scale 2^−126
(section 5's promotion identity, 1.0·2^−126 ≡ 2^23·2^−149). The classic bug —
using E − 127 = −127 as the subnormal exponent, i.e. aligning by the encoded
field instead of `max(E,1)` — is a one-bit misalignment that halves every
subnormal (the measured 2× decode error, section 5). Chapter 5 row B calls
this "the commonest subnormal bug"; the `eff_e` line above is its vaccine.

**Alignment is raw-field unsigned arithmetic.** expdiff = eff_eA − eff_eB as
an 8/9-bit unsigned subtract: biases cancel in a difference, so actual
exponents never need materializing. The bigger-magnitude operand is found with
one 31-bit unsigned compare of `w[30:0]` (section 2's verified monotonicity —
valid across zero, subnormal, normal, and infinity encodings without carve-outs;
only NaN needs pre-screening).

**Promotion and demotion at the bottom come free.** With `eff_e`, a fraction
carry at the subnormal boundary produces `{E=1}` naturally (section 5's three
verified vectors), and a cancellation that lands below 2^−126 simply leaves
E = 0-scale bits with leading zeros — the normalizer must *stop shifting when
eff_e reaches 1* rather than chase the leading 1 (ch5 row B: "the normaliser
must stop at exponent 1"). Both behaviours are encoding properties, not added
logic.

**Renormalization ceilings:** post-round carry-out bumps E by 1; E reaching
255 by increment is overflow → apply the §7.4 mode table (for RNE: ±inf).
E arithmetic wants one guard bit of width (9 bits) so 254 + 1 and 1 − 1 don't
wrap silently — the chapter 2 truncation warning (`-Wall` will not catch a
narrow assignment) applies with full force here.

**For completeness, one line the adder does not need:** multiplication adds
actual exponents, so raw fields add to E_A + E_B − 127 (one bias must be
re-subtracted); division mirrors it. Addition's freedom from bias arithmetic
is an underappreciated simplification and worth saying out loud in the
chapter.

## 10. Icarus experiments: shortreal as a binary32 instrument

Five testbenches this session (`tb1_roundtrip.v` … `tb5_assign.v`), all
compiled `iverilog -g2012 -Wall`, zero warnings, Icarus 13.0, Linux x86-64.

**Round-trips at every class boundary** (`tb1`): all of ±0, min/2nd/max
subnormal, min normal ±1 ulp, max normal, ±inf, canonical qNaN, and a
negative payload qNaN round-trip through `$bitstoshortreal` →
`$shortrealtobits` bit-exactly — **12 of 14 preserved**. The two changed are
the two sNaN patterns (`7fa00000 -> 7fe00000`, `7f800001 -> 7fc00001`):
quieted with payload kept, matching python struct's behaviour exactly
(section 6). Chapter 5's boundary findings re-verified, one sharpening: the
quieting needs no arithmetic, conversion alone does it.

**Sharpened round-trip rule — where the rounding actually lives** (`tb5`,
new): assignment to a `shortreal` variable does **not** round the value;
`$shortrealtobits` rounds **at the call**:

```
r = 1+2^-24; s = r;                    // s is a shortreal variable
$shortrealtobits(s) = 3f800000        <- LOOKS rounded...
s > 1.0 evaluates 1                   <- ...but the stored value is still the double
s - 1.0 = 5.960464e-08
```

So a `shortreal` variable in Icarus is a `double` wearing a costume, and the
*only* place binary32 rounding happens is inside `$shortrealtobits` (with
`$bitstoshortreal` producing exactly-representable doubles). This is
STATE.md's shortreal-is-a-double rule made precise: comparisons, arithmetic,
and `%f` all see the double; chains must round-trip through the bits
functions to model binary32. A single add then one `$shortrealtobits` is
still trustworthy — double-rounding through binary64 is provably innocuous
for one binary32 operation because 53 ≥ 2·24+2 (Figueroa [title-only]),
re-verified here over ~992,000 random finite pairs with **zero mismatches**
against exact single rounding (`g_misc.py`).

**Conversion applies correct RNE everywhere** (`tb2`): all 17 probes match
the python rounder — integer ties (16777217→4b800000 down, 16777219→4b800002
up), ties at 1.0 (both directions), 0.1→3dcccccd, subnormal ties
(2^−150 → 00000000, 1.5·2^−149 → 00000002 — RNE ties-to-even working *inside
the subnormal range*), exact subnormal/normal boundary values, and overflow
(2^128 → 7f800000; the exact threshold (2−2^−24)·2^127 → 7f800000; max normal
exact → 7f7fffff). `$shortrealtobits` on a `real` is a correctly-rounding
binary32 encoder on this toolchain — usable as an in-simulator reference for
chapter 9, within the one-operation limit above.

**Generated NaNs** (`tb2`, `tb4`): runtime `0/0`, `inf+(−inf)`, `inf*0` all
give `ffc00000` on this host (STATE.md's x86-64 measurement re-confirmed);
compile-time-folded `0.0/0.0` gives `7fc00000` — both signs from one
simulator (section 6). `1.0/0.0 = 7f800000`, `-1.0/0.0 = ff800000`: real
division by zero yields infinities silently — no simulator diagnostic at all.

**Two traps found while measuring, both worth a chapter callout:**

1. **`-2.0**128` is +2^128 in Verilog.** Unary minus binds *tighter* than
   `**` (IEEE 1800 precedence), so `-2.0**128 = (-2.0)^128 = +2^128 →
   7f800000`; python has it the other way (`-2.0**128` = −(2^128)). Measured:
   `-2.0**2 = 4` in Icarus. Write `-(2.0**128)` (measured: `ff800000`).
2. **`%h` on a shortreal does not print bits.** It converts real→integer
   first: `%h` of 2.5 prints `3`, of 2.49 prints `2`, of −1.5 prints
   `fffffffffffffffe` (−2 in 64 bits). So the implicit conversion rounds
   ties-away (2.5→3, −1.5→−2, per IEEE 1800's real-to-integer rule), while
   `$rtoi(2.5) = 2` truncates. Three different real→int behaviours in one
   line of testbench; only `$shortrealtobits` shows encoding bits.

**Rendering of specials** (`tb3`): `%f/%e/%g` print `inf/-inf/nan/-nan`
(note the *sign* of the NaN leaks through `-nan` — a testbench log can
betray NaN sign nondeterminism); `-0` prints `-0.000000` under `%f`, so
signed zero IS visible in logs; **subnormals print as `0.000000` under
`%f`** (min subnormal, even min *normal*) — `%e`/`%g` are mandatory below
~1e-6, else real signal activity looks like zero. Bonus cross-check: `%f` of
max normal prints `340282346638528859811704183484516925440.000000` — exactly
the 39-digit integer python's Fraction decode produced in section 4.

## 11. Comparative context: binary16, bfloat16, binary64

Kept brief — chapter 14 owns the format-zoo discussion; this exists so the
chapter can show that *everything above is parameterized by (w, p)* and so
chapter 12's reduced-width verification strategy (seeded by ch5) rests on
re-derived numbers. All populations re-derived and checked against 2^width
(`g_misc.py`):

```
              bias   zeros  subnormals            normals  inf   NaNs
binary16        15     2         2046              61440    2    2046   = 2^16 ok
bfloat16       127     2          254              65024    2     254   = 2^16 ok
binary32       127     2     16777214         4261412864    2 16777214  = 2^32 ok
binary64      1023     2  9007199254740990  1.84e19         2  9.01e15  = 2^64 ok
E4M3 (IEEE-shaped) 7   2           14                224    2      14   = 2^8  ok
```

The E4M3 row re-derives chapter 5's 2/14/224/2/14 exactly ✓ (and keeps ch5's
caveat: the OCP FP8 E4M3 has no infinities, so its population differs).
Structure is identical everywhere: bias = 2^(w−1)−1, two reserved exponents,
hidden bit, quiet bit = fraction MSB. Anchors:

```
1.0 = 0x3C00 (binary16)  0x3F80 (bfloat16)  0x3F800000 (binary32)  0x3FF0000000000000 (binary64)
eps = 2^-10              2^-7               2^-23                  2^-52
```

Two facts worth one sentence each in the chapter: **bfloat16 is binary32's
top half** — same bias 127, same exponent range, so truncating a binary32 to
its high 16 bits is a (crude, RTZ-ish) bfloat16 conversion, which is why ML
hardware loves it; and **binary16's integers go exact only to 2^11 = 2048**,
the same 2^p cliff as binary32's 2^24, which makes it a fine miniature for
teaching. Chapter 12's plan (per ch5): parameterize the adder on
`EXP_W/MANT_W`, exhaust E4M3 in a second, soak binary16 overnight, spot-check
binary32.

## 12. History, and sources

**The narrative for the chapter, honestly sourced.** The primary fetched
source is Charles Severance's interview with William Kahan, "An Interview
with the Old Man of Floating-Point" (20 February 1998, hosted on Kahan's
Berkeley page). From it, fetch-verified: the format grew out of the
**K-C-S draft** (Kahan, his student Jerome Coonen, visiting professor Harold
Stone), written for "a mass market" of non-specialist programmers, with
Intel's John Palmer authorizing Kahan to disclose the planned i8087's
"precisions, exponent ranges, special values". The i8087 itself was Intel's
bid to put "one chip with MOST of the essentials of a math library" in every
PC — 40,000 transistors, which is why not everything fit. **Gradual underflow
was the fight**: the interview's figure is "at least a victim per month per
machine" falling into the underflow gap during the 1970s; DEC opposed K-C-S
(numerics lead Mary Payne), and DEC commissioned G.W. Stewart III — a
respected error-analysis authority — to make the case against gradual
underflow; at the 1981 Boston p754 meeting Stewart reported "he thought
Gradual Underflow was the right thing to do", a "substantial setback on their
home turf" that discouraged DEC's opposition. The standard was ratified as
**IEEE 754-1985**, having become "a de facto standard" a year before
canonization — the 8087 (1980) and its clones shipped it into the world
first. Revisions: 754-2008 (added FMA, decimal formats, formalized the
should-encoding of the quiet bit), 754-2019 (editorial + recommended-ops
refresh; the clause numbers used throughout these notes) [both title-only].
Two honesty notes for the writer: the "victim per month" figure is Kahan's
anecdote, quote it as such; and DEC's position was not stupid — VAX F/G
format hardware was fast and clean, and flush-to-zero remains the shipping
behaviour of many accelerators today (section 5), so teach it as an
engineering trade that IEEE decided *for* the naive programmer, not a
good-versus-evil story.

### Trap synthesis — the errors this chapter exists to prevent

Collected from the sections above for the writer's traps table; every row is
measured, none is folklore:

| trap | wrong belief | measured truth | where |
|---|---|---|---|
| subnormal exponent | E=0 means 2^(0−127) = 2^−127 | effective exponent is −126; the wrong read is off by exactly 2× | §5 |
| −149 as "the exponent" | value = 0.F × 2^−149 | −149 is the LSB weight; 0.F × 2^−126 = F × 2^−149 | §5 |
| whole-float integer compare | float bits compare like an int | only the 31 magnitude bits do; −1.0 sorts above 2.0 lexically | §2 (ch6 correction upheld) |
| epsilon | "the smallest x with 1+x ≠ 1" | 2^−24 + 2^−30 already bumps 1.0; ε = 2^−23 is the smallest *power of two* | §7 |
| machine epsilon value | one agreed number | FLT_EPSILON = 2^−23 vs Goldberg's ε = u = 2^−24 — factor of 2 by convention | §7 |
| generated NaN bits | deterministic, comparable | ffc00000 runtime vs 7fc00000 constant-folded, same simulator; arm64 differs again | §6, §10 |
| sNaN in a value type | test vectors survive conversion | pure round-trip quiets sNaN in both Icarus and python | §6, §10 |
| shortreal assignment | `s = r` rounds to binary32 | it does not; only `$shortrealtobits` rounds, at the call | §10 |
| `%h` of a shortreal | prints the encoding | prints the *rounded integer* (ties-away); `$rtoi` truncates — three conversions, three answers | §10 |
| `-2.0**128` | −(2^128) as in python | (−2)^128 = +2^128: unary minus binds tighter than `**` | §10 |
| `%f` near zero | small values visible | subnormals AND min normal print `0.000000`; use `%e` | §10 |
| addition underflow flag | tiny sum ⇒ underflow | tiny addition results are always exact ⇒ flag never raises | §8 |
| divideByZero in an adder | 1/±0-style events exist | never raised by addition, by definition | §8 |

---

## Sources

**Fetch-verified this session (2):**

1. Charles Severance, *An Interview with the Old Man of Floating-Point*
   (William Kahan), 20 Feb 1998 —
   <https://people.eecs.berkeley.edu/~wkahan/ieee754status/754story.html>.
   K-C-S draft, i8087 disclosure, DEC/Payne opposition, Stewart study, 1981
   Boston meeting, de-facto-standard-before-ratification.
2. David Goldberg, *What Every Computer Scientist Should Know About
   Floating-Point Arithmetic*, ACM Computing Surveys, March 1991 —
   <https://docs.oracle.com/cd/E19957-01/806-3568/ncg_goldberg.html> (Oracle
   reprint). Ulp definition, machine epsilon = (β/2)β^−p (his ε is 2^−24 for
   binary32 — the convention clash documented in section 7), Theorem 2 (guard
   digit), property (10) x=y ⟺ x−y=0 and the `1/(x-y)` motivation.

**[title-only] (no URL asserted):**

3. IEEE Std 754-2019, *IEEE Standard for Floating-Point Arithmetic* — §3.4
   (binary interchange encodings, Table 3.5: emax = 2^(w−1)−1), §4.3
   (rounding-direction attributes), §6.2/6.2.1/6.2.3 (NaN encoding, quiet
   bit *should*, payload propagation *should*), §6.3 (sign bit, exact-zero
   sums, NaN sign unspecified), §7.2–7.6 (exceptions and default results).
4. IEEE Std 754-2008 — prior revision; source of the 2008-era clause
   structure and the quiet-bit recommendation's history.
5. Jean-Michel Muller, *On the definition of ulp(x)*, INRIA research report
   RR-5504 (2005) — the Goldberg/Harrison/Kahan ulp-definition comparison.
6. Samuel A. Figueroa, *When is double rounding innocuous?*, ACM SIGNUM
   Bulletin 30(3), 1995 — the p2 ≥ 2p1+2 condition backing the
   double-then-single rounding argument (re-verified empirically here).
7. Pat H. Sterbenz, *Floating-Point Computation*, Prentice-Hall, 1974 — the
   exact-subtraction lemma (verified over 200k pairs here).
8. IEEE Std 1800-2023 — real/shortreal semantics, real-to-integer rounding
   in display conversions, operator precedence (unary minus above `**`).

**Machine-verified locally (the authority for every number above):** seven
python3 scripts (`a_layout.py`, `b_worked.py`, `c_subnormal.py`,
`e_ulp_round.py`, `f_special.py`, `g_misc.py`, `h_extra.py` —
struct/Fraction/Decimal ground truth, including a from-scratch 5-attribute
binary32 rounder cross-validated on 100k random doubles) and five Icarus 13.0
testbenches (`tb1_roundtrip.v`–`tb5_assign.v`, `iverilog -g2012 -Wall`,
x86-64 Linux), all in the session scratchpad. Nothing was written into
`guide/` except this file.
