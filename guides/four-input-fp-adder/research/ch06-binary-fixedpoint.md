# Chapter 6 — Binary Number Systems and Fixed Point: source notes

<!-- sections complete: 9/9 -->

Research date: 2026-08-16. All numeric claims in these notes were produced in this
session by `python3` (3.x, `/usr/local/bin/python3`) or by compiling and running
throwaway Verilog modules under the local Icarus Verilog 13.0
(`iverilog -g2012 -Wall`, `/usr/local/bin/iverilog`). Quoted outputs are captured
verbatim. Scratch modules live outside `guide/` and are not part of the build.

## 1. Positional notation and radix conversion

### 1.1 The positional principle

A numeral in radix r assigns each digit position a weight that is a power of r; the
radix point separates non-negative powers from negative ones. For a string
`d_{m-1} … d_1 d_0 . d_{-1} d_{-2} … d_{-n}` the value is
`sum(d_i * r^i)` for `i` from `-n` to `m-1`. Everything else in this chapter —
two's complement, bias, Q-format — is a *reinterpretation of the weights* on the
same bit string; the bits themselves never know which system they are in. That
framing ("the bits are just bits; the number system is a contract about weights")
is worth making the chapter's spine, because it is exactly how Verilog behaves:
`8'b11111111` is 255 or −1 depending only on the declared signedness of what reads
it (measured in section 9).

Worked example, verified:

```
$ python3 s1_radix.py   (excerpt)
1011.101_2 = 11.625
```

so `1011.101₂ = 8+2+1+0.5+0.125 = 11.625₁₀`.

### 1.2 Integer conversion: repeated division

Decimal→binary for integers is repeated division by 2, collecting remainders
least-significant first. Verified for 217:

```
217 = 2*108 + 1
108 = 2*54 + 0
54 = 2*27 + 0
27 = 2*13 + 1
13 = 2*6 + 1
6 = 2*3 + 0
3 = 2*1 + 1
1 = 2*0 + 1
217 = 11011001  check bin(): 0b11011001
```

Reading the remainders bottom-up gives 11011001. Why remainders and why reversed: each division step strips the lowest bit, because `n mod 2` *is* the
lowest bit and `n div 2` is the number shifted right by one. This is the same
observation that makes `x % 2` and `x >> 1` hardware-free operations, and it is
worth stating in the chapter because it demystifies the algorithm.

### 1.3 Octal and hex are grouping shortcuts

Because 16 = 2⁴ and 8 = 2³, hex and octal digits are 4- and 3-bit groups read off
the binary string from the radix point outward. Verified on the same value:

```
217 hex: 0xd9 oct: 0o331
11011001 grouped 4: 1101 1001 -> D9 ; grouped 3: 011 011 001 -> 331
```

Chapter hook: this is why `$display("%h")` and Verilog `'h` literals dominate in
practice — hex is a *view* of the bits with no arithmetic involved, unlike decimal
which needs real division to produce. Chapter 2 already taught the literal syntax;
chapter 6 should explain *why* the groupings work (radix a power of the base).

### 1.4 Fractional conversion: repeated multiplication

Decimal→binary for fractions is repeated multiplication by 2, collecting integer
parts most-significant first (the mirror image of 1.2: doubling shifts the radix
point right, so the bit that crosses it is the next fraction bit). Verified:

```
0.375 binary fraction digits: [0, 1, 1]
```

so 0.375₁₀ = 0.011₂ (= 1/4 + 1/8), terminating in 3 steps.

### 1.5 Why 0.1 has no finite binary expansion — the repeating pattern, computed

Running the same algorithm on 1/10 with exact rationals (`fractions.Fraction`, so
there is no float noise in the demonstration):

```
step 1: 2 * 1/10 = 1/5  -> bit 0, remainder 1/5
step 2: 2 * 1/5 = 2/5  -> bit 0, remainder 2/5
step 3: 2 * 2/5 = 4/5  -> bit 0, remainder 4/5
step 4: 2 * 4/5 = 8/5  -> bit 1, remainder 3/5
step 5: 2 * 3/5 = 6/5  -> bit 1, remainder 1/5
step 6: 2 * 1/5 = 2/5  -> bit 0, remainder 2/5
...
```

The remainder after step 5 equals the remainder after step 1 (both 1/5), so the
process cycles with **period 4**: `0.1₁₀ = 0.0(0011)₂ repeating` — i.e.
`0.000110011001100110011…₂`. The cycle-detection run confirmed:

```
remainder repeats: state at step 5 == state at step 1 -> period 4
0.1 first bits: 00011
```

The clean way to see *why* it can never terminate: a reduced fraction p/q has a
terminating base-2 expansion iff q is a power of 2 (each emitted bit multiplies
the denominator's factor of 2 away; an odd factor can never be removed). Verified
on six fractions:

```
1/2: reduced denom odd part = 1 -> terminates
3/8: reduced denom odd part = 1 -> terminates
1/10: reduced denom odd part = 5 -> repeats
1/3: reduced denom odd part = 3 -> repeats
7/16: reduced denom odd part = 1 -> terminates
1/5: reduced denom odd part = 5 -> repeats
```

Closed-form check that the repeating pattern really sums to 1/10: the pattern
contributes `sum over groups g>=1 of (2^-4g + 2^-(4g+1)) = (3/2) * sum 16^-g
= (3/2)(1/15)`:

```
closed form 1.5 * 1/15 = 1/10
```

### 1.6 What stored 0.1 actually is — the bridge fact for chapter 7

Because the expansion is infinite, any finite register truncates or rounds it.
Verified with `decimal`/`struct`:

```
Decimal(0.1) = 0.1000000000000000055511151231257827021181583404541015625
0.1 as float64 bits: 0x3fb999999999999a
0.1 as float32 bits: 0x3dcccccd
float32 0.1 exact value: 0.100000001490116119384765625
```

The `…99999a` / `…ccccd` tails are the `0011`-repeating pattern (hex `9 = 1001`,
`c = 1100` — the same four bits phase-shifted), with the last digit bumped by
round-to-nearest. A 20-fraction-bit *truncation* instead gives

```
0.1 truncated to 20 fraction bits = 104857/1048576 = 0.09999942779541016
error = 5.7220458984375e-07
```

Chapter use: this single example carries the whole motivation chain — repeating
expansion → finite storage must round → rounding rules matter (section 6) → IEEE
754 stores exactly this kind of rounded value (chapter 7). The float32 line
(`0x3dcccccd`, exact value 0.100000001490116119384765625) should reappear
verbatim in chapter 7 when the reader can finally decode it field by field.

## 2. Unsigned binary arithmetic, wraparound, and mod 2^N

### 2.1 The register is a mod-2^N world

An N-bit register holds residues mod 2^N, and the adder computes exactly
`(a + b) mod 2^N` with the discarded quotient bit appearing as carry-out.
Verified at N=4 (`s2_unsigned.py`):

```
9 + 8 = 17 ; mod 16 -> 1 ; carry-out = True ; bits: 1001+1000=0001 cout=1
15 + 1 = 16 ; mod 16 -> 0 ; carry-out = True ; bits: 1111+0001=0000 cout=1
7 + 7 = 14 ; mod 16 -> 14 ; carry-out = False ; bits: 0111+0111=1110 cout=0
exhaustive 4-bit: sum&15 == (a+b) mod 16 and cout==bit4, all 256 pairs: True
```

The `15 + 1 = 0` line is wraparound in its purest form and is worth showing as
the odometer image: the counter rolls over, and the carry-out is the only record
that it did. Chapter framing to keep: **wraparound is not an error condition in
the hardware** — the adder is doing exact modular arithmetic. "Overflow" only
exists relative to a claim that the register was supposed to hold an ordinary
integer. That distinction sets up section 4 (flags) and, later, why saturation
(section 7) is a *policy* layered on top.

### 2.2 Subtraction via complement — the trick that makes one adder do both jobs

`a − b ≡ a + (~b) + 1 (mod 2^N)`, because `~b = (2^N − 1) − b`, so
`a + ~b + 1 = a − b + 2^N`. Worked cases, verified:

```
13 - 6: ~6&15= 9, +1=10; 13+10=23 -> result 7 (0111), carry-out=1 ; true diff mod 16 = 7
6 - 13: ~13&15= 2, +1= 3; 6+3=9 -> result 9 (1001), carry-out=0 ; true diff mod 16 = 9
8 - 8: ~8&15= 7, +1= 8; 8+8=16 -> result 0 (0000), carry-out=1 ; true diff mod 16 = 0
```

Two teaching points fall out of the worked cases:

- **`6 − 13 = 9 (mod 16)`** — the "wrong" answer is the mathematically right
  residue; it is `−7 + 16`. This is the first place the reader meets a bit
  pattern whose meaning depends on interpretation, one section before two's
  complement makes that official.
- **Carry-out doubles as the not-borrow flag.** Exhaustively at 4 bits:

```
exhaustive 4-bit: cout of a+~b+1 == (a>=b), all 256 pairs: True
```

  `cout=1` means no borrow (a ≥ b); `cout=0` means the subtraction wrapped.
  (This is the ARM/borrow convention; x86's CF inverts it — flag conventions are
  ISA lore, not arithmetic, and the chapter need only mention that both exist.)

### 2.3 Run on chapter 1's actual adder (Icarus experiment)

The point that the *same* ripple-carry hardware subtracts was verified on the
guide's own `ripple4` (`guide/src/ch02/ripple4.v`, the structural four-full-adder
chain built in chapter 1's story), by wiring `b` through inverters and tying
`cin = 1`:

```verilog
ripple4 dut (.a(a), .b(~b), .cin(1'b1), .sum(diff), .cout(cout));
```

```
$ iverilog -g2012 -Wall -o e_sub4.vvp e_sub4.v ripple4.v full_adder.v && vvp e_sub4.vvp
subtract-via-complement on ripple4: 0 errors in 256 cases
example: 13-6: a=1101 b=0110 ~b=1001 diff=0111 (7) cout=1
```

All 256 (a, b) pairs match `(a − b) mod 16`, and `cout` matched `a >= b` in all
256 cases. Hardware cost of turning an adder into an adder-subtractor: one XOR
per bit (conditional invert) plus routing the mode bit into `cin` — chapter 1's
comparator discussion already hinted at this; chapter 6 closes the loop.
Forward link: the FP adder of chapters 8-9 uses exactly this adder-subtractor on
aligned mantissas when signs differ.

## 3. Signed representations

### 3.1 One table, five meanings

The strongest single exhibit for the chapter is the all-16-patterns table
(generated by `s3_signed.py`) — the same column of bits under five contracts:

```
pattern | unsigned | two's c | ones' c | sign-mag | excess-8
0000    |        0 |       0 |       0 |        0 |       -8
0001    |        1 |       1 |       1 |        1 |       -7
0010    |        2 |       2 |       2 |        2 |       -6
0011    |        3 |       3 |       3 |        3 |       -5
0100    |        4 |       4 |       4 |        4 |       -4
0101    |        5 |       5 |       5 |        5 |       -3
0110    |        6 |       6 |       6 |        6 |       -2
0111    |        7 |       7 |       7 |        7 |       -1
1000    |        8 |      -8 |      -7 |        0 |        0
1001    |        9 |      -7 |      -6 |       -1 |        1
1010    |       10 |      -6 |      -5 |       -2 |        2
1011    |       11 |      -5 |      -4 |       -3 |        3
1100    |       12 |      -4 |      -3 |       -4 |        4
1101    |       13 |      -3 |      -2 |       -5 |        5
1110    |       14 |      -2 |      -1 |       -6 |        6
1111    |       15 |      -1 |       0 |       -7 |        7
```

Reading the anomalies straight off the table: ones' complement and sign-magnitude
each have two zeros (`0000`/`1111` and `0000`/`1000` respectively); two's
complement has one zero and the orphan value −8 with no positive partner;
excess-8 is the unsigned column shifted down by 8, so its patterns sort in value
order. Every claim in the rest of this section is one of these observations made
precise.

### 3.2 Two's complement in depth

**The definition that explains everything:** an N-bit two's-complement word is
positional notation in which the MSB's weight is *negative*:
`value = −2^(N−1)·b_{N−1} + sum(2^i·b_i, i<N−1)`. Verified exhaustively:

```
two's comp == positional with MSB weight -2^(N-1), all 16: True
```

This one identity yields all the classic facts as corollaries, and the chapter
should derive them in this order rather than presenting them as separate lore:

- **Range asymmetry.** Max = `0111…1 = 2^(N−1)−1`; min = `1000…0 = −2^(N−1)`.
  One more negative value than positive because the single zero pattern sits in
  the "positive" half.
- **Single zero.** Only `0000` sums to 0 (the negative weight can only be
  cancelled by all lower bits, which sums to −1, not 0).
- **Negation is `~x + 1`.** Since `x + ~x = 2^N − 1` (all ones), `~x + 1 = 2^N − x
  ≡ −x (mod 2^N)`. Verified, including the two fixed points:

```
-(3): pattern 0011 -> ~+1 = 1101 = -3
-(-3): pattern 1101 -> ~+1 = 0011 = 3
-(0): pattern 0000 -> ~+1 = 0000 = 0
-(-8): pattern 1000 -> ~+1 = 1000 = -8
```

  `−(−8) = −8` is the negation overflow — the one input where "negate" silently
  fails — and is a corner case chapter 5's taxonomy style should flag for any
  datapath that computes absolute values (the FP adder's magnitude-subtract path
  in chapter 8 will need exactly `|a − b|`).
- **Why the same adder works.** Two's complement *is* the residue system of
  section 2 with the residues `[2^(N−1), 2^N)` relabeled as negatives. Addition
  of representatives mod 2^N therefore computes the true sum whenever that sum is
  representable. Verified exhaustively at 4 bits:

```
same-adder theorem, 4 bits: 192/256 pairs representable; adder pattern correct on all of them: True
```

  192/256 pairs have representable sums; on every one of them the plain unsigned
  `ripple4`-style sum pattern, reinterpreted, is the correct signed sum. The other
  64 are overflows — section 4's subject. This measured number (64/256 = 25% of
  random 4-bit pairs overflow) is also a nice concrete argument for *why*
  overflow detection matters.
- **Sign extension.** Widening must replicate the MSB, because the old MSB's
  weight −2^(N−1) must be re-expressed as `−2^(M−1) + 2^(M−2) + … + 2^(N−1)`
  (all-ones above). Verified: replication preserves value on all 16 patterns;
  zero-extension corrupts negatives:

```
sign-extension by MSB replication preserves value, all 16 patterns: True
zero-extending 1101 (-3): 00001101 = 13  (wrong); sign-extending: 11111101 = -3
```

  This is *the* number-system fact behind the Verilog part-select trap measured
  in section 9 (E5): a part-select is unsigned, so it zero-extends, and −3
  becomes 13.
- **Ordering trap.** Unsigned pattern comparison does not match signed value
  order (`1000 = −8` is the unsigned largest-half): measured
  `two's comp: unsigned pattern compare == value compare?: False` in the same
  run. This resurfaces twice: Verilog's comparison rules (section 9, E6) and the
  contrast with bias encoding just below.

### 3.3 Ones' complement and sign-magnitude, briefly

Ones' complement negates by bitwise NOT alone; the table shows the price — two
zeros — and addition needs the **end-around carry** (wrap the carry-out back into
bit 0). Verified that with end-around carry the 4-bit ones'-complement adder is
correct on all representable sums:

```
ones' comp end-around-carry adder correct on representable sums (excluding -0+-0): True fails: []
```

The chapter needs perhaps one paragraph: it existed (CDC 6600-era machines), it
lost to two's complement precisely because of the double zero and the extra
carry path, and its NOT-based negation survives as step one of `~x + 1`.

Sign-magnitude — sign bit plus unsigned magnitude — also has two zeros
(`0000`/`1000` → +0/−0) and needs a comparator before its adder can even decide
whether to add or subtract magnitudes. That sounds disqualifying, and for
integers it was. The essential forward reference for this guide: **IEEE 754 is
sign-magnitude** (sign bit + magnitude fields), which is why floats have ±0
(chapter 5's corner-case taxonomy already met signed zero) and why chapter 8's
adder must contain exactly the compare-then-add-or-subtract machinery that
sign-magnitude integers would have needed. The "obsolete" system returns as the
substrate of the guide's whole target. This is the chapter's best narrative hook
and should be stated explicitly, not left as trivia.

### 3.4 Biased (excess) encoding in depth — the exponent's format

Excess-B stores `value + B` as an unsigned number; excess-8 at 4 bits is the
table's last column. Two measured properties define its character:

```
excess-8: unsigned pattern compare == encoded value compare, all 256 pairs: True
excess-8 pattern = two's-complement pattern with MSB flipped, all 16: True
```

- **Monotonicity** is the selling point: patterns sort in value order under a
  plain unsigned comparator. Two's complement fails this (measured above);
  excess encoding fixes it by construction, since `x ↦ x + B` is monotonic.
- **The MSB-flip identity** (excess-2^(N−1) pattern = two's-complement pattern
  XOR MSB) is worth teaching because it demolishes the idea that bias is exotic:
  it is two's complement with the pattern order rotated so that the most negative
  value maps to all-zeros.

Why IEEE 754 chose it (motivation to state in the chapter, format details
deferred to chapter 7): with sign, exponent and fraction laid out MSB-first and
the exponent biased, *the float's magnitude bits — everything below the sign —
compare like an integer*: of two floats, the larger magnitude has the lexically
larger exponent-and-fraction field, so magnitude comparison needs only chapter
1's unsigned comparator. (Corrected 2026-08-16 by the chapter 6 review: this
note originally said *the whole float* compares like an integer, which is false
for opposite-sign pairs — −1.0 = `0xBF800000` sorts lexically above 2.0 =
`0x40000000`. The sign bit must be handled aside. Chapter 7 must not restate
the original claim.) Chapter 8's alignment step ("which operand has the bigger
exponent, and by how much?") becomes an unsigned compare and subtract of raw
exponent fields; no signed hardware needed.

Concrete anchor, verified against real float bits (`struct`):

```
1.0                          bits 0x3f800000 sign 0 exp 127 (0b01111111) frac 0x000000
2.0                          bits 0x40000000 sign 0 exp 128 (0b10000000) frac 0x000000
0.5                          bits 0x3f000000 sign 0 exp 126 (0b01111110) frac 0x000000
1.1754943508222875e-38       bits 0x00800000 sign 0 exp   1 (0b00000001) frac 0x000000
3.4028234663852886e+38       bits 0x7f7fffff sign 0 exp 254 (0b11111110) frac 0x7fffff
```

and the decode rule at bias 127:

```
1.0f exponent: stored 127 (0b01111111) - bias 127 = actual 0
2.0f exponent: stored 128 (0b10000000) - bias 127 = actual 1
min normal: stored 1 (0b00000001) - bias 127 = actual -126
max normal: stored 254 (0b11111110) - bias 127 = actual 127
```

Note for chapter 7 handoff: binary32's bias is 127 = 2^(8−1)−1, *not* the
"natural" 2^(N−1) = 128 of the excess-8 toy — IEEE deliberately offsets by one
and reserves stored 0 and 255, which is why actual exponents run −126…+127
rather than −128…+127. Chapter 6 should present excess-B generally and flag that
IEEE's B is 2^(N−1)−1; chapter 7 explains the reserved endpoints (subnormals,
Inf/NaN).

## 4. Overflow detection: carry vs overflow

### 4.1 Two different questions

Carry-out (C) answers "did the *unsigned* sum exceed 2^N − 1?"; the overflow
flag (V) answers "is the *signed* result wrong?". They are logically independent
— all four combinations occur. Measured census over all 256 4-bit pairs
(`s4_overflow.py`, which models the adder bit-by-bit and captures every internal
carry):

```
checked 256 pairs: rule mismatches = 0
V and C independence: neither=108 C-only=84 V-only=28 both=36
```

The four canonical examples, one per quadrant (captured output; these should go
in the chapter verbatim as a 2×2 table):

```
5+4 (signed ovf, no carry) : 0101(5) + 0100(4) = 1001(signed -7, unsigned 9) C=0 V=1
-7+-6 (signed ovf, carry)  : 1001(-7) + 1010(-6) = 0011(signed 3, unsigned 3) C=1 V=1
-1+1  (carry, no signed ovf): 1111(-1) + 0001(1) = 0000(signed 0, unsigned 0) C=1 V=0
3+2   (neither)             : 0011(3) + 0010(2) = 0101(signed 5, unsigned 5) C=0 V=0
```

`−1 + 1` is the case that kills the folk belief "carry means something went
wrong": the carry is routine (the mod-2^N representative of 0 is reached by
wrapping), and the signed answer is exactly right.

### 4.2 The two-MSB-carries rule, and its equivalents

Three formulations were tested against ground truth (sum outside
[−2^(N−1), 2^(N−1)−1]):

1. **V = carry-into-MSB XOR carry-out-of-MSB** (the hardware rule — both signals
   already exist inside the last full adder of chapter 1's ripple chain; V costs
   one XOR gate).
2. **V = (operands same sign) AND (result sign differs)** — the sign-based rule,
   `V = ~(sa^sb) & (ss^sa)`.
3. **Widen-by-one:** sign-extend both operands to N+1 bits, add; V = XOR of the
   top two result bits. This is the *RTL-idiomatic* version — no access to
   internal carries needed when you write `+` behaviorally.

Results:

```
checked 256 pairs: rule mismatches = 0                     (rules 1 and 2, 4-bit)
8-bit exhaustive (65536 pairs): two-MSB-carries rule mismatches = 0
widen-by-one method: V = s[N]^s[N-1] of (N+1)-bit sum, 256 pairs, mismatches: 0
```

All three agree with ground truth on every pair at 4 bits, and rule 1 also on
all 65536 pairs at 8 bits. Intuition to teach for rule 1: the MSB position is
where the negative weight lives; a *disagreement* between the carry entering it
and the carry leaving it means the true sum needed a weight the register does
not have. Equivalently (rule 2): adding numbers of opposite sign can never
overflow — the result magnitude only shrinks — so overflow is exactly
"same signs in, that sign not out."

Subtraction uses the same machinery on `a + ~b + 1`:

```
subtraction: V = cin_msb^cout of a+~b+1, 256 pairs, mismatches: 0
```

### 4.3 What the chapter should do with this

- Connect back: chapter 1's `ripple4` already produces `c[3]` and `c[4]`
  internally (its carry vector `wire [4:0] c`); V is `c[3] ^ c[4]` — one added
  gate on the existing schematic. This makes overflow detection literally a
  one-line extension of hardware the reader has already built.
- Recommend the widen-by-one formulation for behavioral Verilog, since internal
  carries of `+` are not visible; this also previews the standing width
  discipline (STATE.md: Icarus `-Wall` will never warn when the extra bit is
  accidentally dropped — measured again in section 9, E9).
- Forward link: unsigned C reappears in chapter 8 as the mantissa-sum
  carry-out that triggers the normalize-right-by-one step; signed V never
  appears in the FP datapath, because IEEE 754 is sign-magnitude — mantissa
  arithmetic there is all unsigned. Worth saying: the reader is learning V for
  general RTL literacy, and C because the FP adder depends on it.

## 5. Fixed point: Q-format, range, resolution, alignment

### 5.1 The idea, and the notation hazard

Fixed point is nothing new mechanically: an N-bit integer plus an *agreement*
that its value is `integer × 2^−n`. No hardware changes; the binary point exists
only in the designer's head (and comments). This continues the section-1 spine:
the same `+` computes fixed-point addition because scaling by a constant 2^−n
commutes with addition.

Notation: **Qm.n** here means m integer bits (sign included) and n fraction
bits, N = m + n total, signed two's complement; **UQm.n** is the unsigned
variant. The chapter must flag that Q-notation is *not standardized*. Verified
against Wikipedia's "Q (number format)" article (fetched this session): in the
**TI convention** the sign bit "is not counted in the m parameter", so total
width is 1 + m + n and a 16-bit full-fraction value is Q15; in the **ARM
convention** "the m number also counts the sign bit", so the same layout is
Q16.0 / Q1.15-style. These notes and the chapter use the ARM-style count
(m includes sign, N = m + n) because it makes the width arithmetic
(`Qa.b × Qc.d → Q(a+c).(b+d)`) come out without +1 corrections. The only safe
habit in the wild is to state total width and fraction bits explicitly.

### 5.2 Range and resolution — formulas, verified

Signed Qm.n: values `raw × 2^−n` for raw in `[−2^(N−1), 2^(N−1)−1]`, so range
`[−2^(m−1), 2^(m−1) − 2^−n]`, step `2^−n`. Unsigned: `[0, 2^m − 2^−n]`.
Computed (`s5_qformat.py`):

```
Q4.4 (8 bits): range [-8.0, 7.9375] = [-8, 127/16], step 1/16 = 0.0625
Q2.6 (8 bits): range [-2.0, 1.984375] = [-2, 127/64], step 1/64 = 0.015625
Q1.15 (16 bits): range [-1.0, 0.999969482421875] = [-1, 32767/32768], step 1/32768 = 3.0517578125e-05
Q16.16 (32 bits): range [-32768.0, 32767.99998474121] = [-32768, 2147483647/65536], step 1/65536 = 1.52587890625e-05
UQ4.4 (8 bits): range [0, 255/16 = 15.9375], step 0.0625
UQ0.8 (8 bits): range [0, 255/256 = 0.99609375], step 0.00390625
```

The tradeoff to spell out: at fixed N, every bit moved from integer to fraction
halves the range and halves the step. **Resolution is uniform across the whole
range** — the absolute error of representing an arbitrary real is at most
step/2 everywhere. That uniformity is fixed point's signature, and its curse:
the *relative* error explodes near zero (representing 0.001 in Q4.4 gives 0 —
100% relative error). Floating point exists to make relative error uniform
instead; that is section 8's argument, planted here.

Same-bits-different-Q exhibit (the "contract" point again, now with fractions):

```
pattern 01010000 as Q8.0: 80.0
pattern 01010000 as Q4.4: 5.0
pattern 01010000 as Q1.7: 0.625
```

### 5.3 Encoding a real number — and an honest overflow

Encode is `raw = round(x · 2^n)` with a range check. Verified for pi:

```
pi in Q2.14: ideal raw=51472, fits=False; 16-bit register holds 51472 -> signed -14064 -> value -0.8583984375
pi in Q3.13: ideal raw=25736, fits=True; 16-bit register holds 25736 -> signed 25736 -> value 3.1416015625
```

The Q2.14 line is a deliberate keeper: pi does not fit in [−2, 2), and the
16-bit register wraps the encode to **−0.858…** with no error signal anywhere.
(First drafts of this very research script printed a plausible-looking
"pi in Q2.14 = 3.1416" because the check was missing — the bug class teaches
itself.) Error of the good encode: |3.1416015625 − pi| ≈ 8.9e−6, within Q3.13's
step/2 = 2^−14 ≈ 6.1e−5 bound (corrected 2026-08-16 by the chapter 6 review:
this note originally said 3.05e−5, which is 2^−15 — half the true bound; the
good encode is Q3.13, whose step is 2^−13); also computed at lower precision:

```
pi in Q4.4: raw=50 (0x32) value=3.125 error=1.659e-02  (step/2 = 3.125e-02)
```

### 5.4 Alignment for addition — the ancestor of chapter 8

Raw integers may be added **only when their binary points agree** (same n).
Otherwise the sum is meaningless in every format. Demonstrated with
`a = 1.703125` (Q2.6) and `b = 5.0625` (Q4.4):

```
a = 1.703125 = Q2.6 raw 109 (01101101); b = 5.0625 = Q4.4 raw 81 (01010001)
naive raw add: 109+81 = 190; as Q2.6 -> 2.96875 ; as Q4.4 -> 11.875 ; true sum = 6.765625
aligned: b<<2 = 324 (Q4.6); sum raw 433 as Q?.6 -> 6.765625 == true 6.765625: True
```

The naive sum is wrong under *both* candidate interpretations. The fix shifts
the coarser operand left by the difference in fraction bits (Q4.4 → Q4.6),
after which integer addition is exact. Width bookkeeping, verified in the same
run: an overflow-proof Q2.6 + Q4.4 sum needs Q5.6 — max |sum| = 2 + 8 = 10, so
5 integer bits including sign — i.e. **add one integer bit per addition** in
general (`max + max = 2·max` needs exactly one more bit).

Chapter-8 bridge, to be made explicit: this left-shift-to-common-scale is the
*same operation* as FP mantissa alignment, with one inversion. Fixed point
shifts the coarser operand **left** (its scale is static and the designer
provisions the wider intermediate); floating point shifts the smaller operand's
mantissa **right** (the register width is fixed at 24+G/R/S bits, so the scale
must move instead of the width). Chapter 2's `align_sticky.v` already built the
right-shift version with guard/round/sticky capture; chapter 6 supplies the
missing "why": both are instances of "equalize exponents of 2 before adding raw
integers."

### 5.5 Width growth in multiplication

A signed N×N multiply needs 2N result bits, and the sole pair that needs the
very top bit is (−2^(N−1))·(−2^(N−1)). Verified at 4×4:

```
4-bit x 4-bit signed: product range [-56, 64]
bits needed for that range: 8
does 7 bits suffice? range of 7-bit: -64 63 -> 64 = 64 needs 8: True
cases hitting max: [(-8, -8)]
```

Q-format bookkeeping: fraction bits add, integer bits add — Qa.b × Qc.d =
Q(a+c).(b+d), and the raw product read at scale 2^−(b+d) is *exact* (no
rounding happens in the multiply itself; verified for all 256 Q2.2 pairs:
`Q2.2*Q2.2 raw product read as Q4.4 is exact, all 256 pairs: True`). Rounding
only enters when the product is squeezed back to the working format — section 6.

The famous DSP corner, computed: Q1.15 × Q1.15 gives Q2.30, whose top two bits
are redundant copies of the sign for every input pair except one:

```
Q1.15: (-1)*(-1) raw product = 1073741824 = 2^30; Q2.30 max pos raw = 2147483647 ok;
but as Q1.31 (<<1 to drop redundant sign bit): 1073741824 << 1 = 2147483648 vs 32-bit signed max 2147483647 -> overflows: True
next largest product: 1073709056 from -32767 * -32768
fits in Q1.31 after <<1: True ( 2147418112 <= 2147483647 )
```

So the standard "shift left one to drop the redundant sign bit" (the fractional
DSP multiply) overflows on exactly `(−1)·(−1)`, and on nothing else. Real DSPs
handle this in hardware by saturating that one case (e.g. the TI C64x `SMPY`
behavior [title-only]); an RTL designer must either saturate or keep Q2.30.
This is the cleanest possible motivation for section 7's saturation logic, and
a preview of a chapter-5 lesson recurring: the corner case is a *single point*
in a 2^32 input space — directed tests or bust.

## 6. Rounding in fixed point: truncation bias, round-half-up, round-half-even

### 6.1 The setting

Every fixed-point datapath repeatedly shortens results: a Q4.8 product must go
back into a Q4.4 register, an accumulator must feed a 12-bit DAC. Dropping k
fraction bits is division by 2^k plus a *policy* for the lost remainder. The
policies differ only in tiny per-sample errors — and in what those errors sum
to. Exhaustive measurement over all raws in [−256, 256), dropping k = 2 bits
(`s6_round.py`; errors in units of one output LSB):

```
floor (>> k, plain truncation of bits)       mean error -0.375000 LSB, max |error| 0.750 LSB
toward zero (C-style)                        mean error +0.000000 LSB, max |error| 0.750 LSB
round-half-up (add 0.5 LSB then floor)       mean error +0.125000 LSB, max |error| 0.500 LSB
round-half-even (convergent)                 mean error +0.000000 LSB, max |error| 0.500 LSB
```

Readings, with the formulas they confirm:

- **Truncation of bits (`>> k`) is floor**, and floor is biased by
  −(2^k − 1)/2^(k+1) LSB — here −3/8 = −0.375. It is also the *cheapest*
  policy (zero gates: just don't wire the low bits), which is why the bias
  argument has to be made — the default is the biased one. Note for two's
  complement: bit truncation is floor (toward −∞), **not** toward zero;
  −1.25 truncates to −2, not −1. This surprises C programmers, whose integer
  division truncates toward zero.
- **Toward-zero shows mean 0 here only because the input range is symmetric.**
  Its error is anti-correlated with sign (always shrinks magnitude), so it
  distorts signals even when the DC average cancels. The chapter should not
  present it as "unbiased" — the measured 0 is an artifact of averaging over a
  sign-symmetric set. (Weaker true statement, per project rule.)
- **Round-half-up carries a small positive bias**, +2^−(k+1) LSB (+1/8 here),
  entirely from ties: remainder = exactly half occurs for 1/2^k of inputs and
  is always pushed up.
- **Round-half-even removes the tie bias** by sending ties to the even
  neighbor — half go up, half go down. Mean 0 over the exhaustive set, same
  0.5 LSB worst case as half-up.

Tie table (captured) for the chapter:

```
 raw +2 (1/2): floor->0 halfup->1 halfeven->0
 raw +6 (3/2): floor->1 halfup->2 halfeven->2
 raw -2 (-1/2): floor->-1 halfup->0 halfeven->0
 raw -6 (-3/2): floor->-2 halfup->-1 halfeven->-2
 raw +10 (5/2): floor->2 halfup->3 halfeven->2
```

### 6.2 The bias, made visceral: DC drift over 100k samples

The per-sample numbers look negligible (fractions of one LSB). Accumulated,
they are not. 100000 zero-mean random 12-bit samples, each requantized by 4
bits (k = 4) then summed (`s6b_drift.py`, seed 42):

```
floor/truncate: sum of rounded =  -45667.0, exact/16 =     1147.50, drift = -46814.50 output LSBs over 100000 samples (-0.46814/sample)
half-up       : sum of rounded =    4188.0, exact/16 =     1147.50, drift =  +3040.50 output LSBs over 100000 samples (+0.03041/sample)
half-even     : sum of rounded =    1027.0, exact/16 =     1147.50, drift =   -120.50 output LSBs over 100000 samples (-0.00120/sample)
predicted per-sample: floor -0.46875, half-up +0.03125, half-even ~0
```

Measured drifts match the closed-form predictions (−(2^k−1)/2^(k+1) = −15/32 ≈
−0.469 and +1/32 ≈ +0.031) to three decimal places. The story for the chapter:
truncation injects a DC offset ~15× larger than half-up's, and half-even's
residual is another ~25× smaller (and shrinks with more samples, since it is
noise, not bias). In a feedback loop (IIR filter, PLL, AGC) a rounding DC
offset does not just sit there — it integrates, which is why hardware DSP
convergent rounding exists (section 7 sources).

### 6.3 The bridge to G/R/S: rounding needs only three summary bits

The arithmetic definition of round-half-even seems to need all k dropped bits.
It does not — it needs the kept LSB (L), the most significant dropped bit
(R, the "round bit"), and the OR of all remaining dropped bits (S, "sticky").
Verified exhaustively for k = 4 over raw ∈ [−4096, 4096) (`s6c_grs.py`):

```
increment = R & (S|L) vs arithmetic half-even, raw in [-4096,4096), mismatches: 0
half-up increment = R alone, mismatches: 0
```

So: `RNE increment = R & (S | L)` — round up iff the round bit is set AND
(there is something below it, i.e. not a tie, OR the tie-break target is odd).
And half-up is just `increment = R`. Two remarks the chapter should make:

- This is why chapter 2's `align_sticky.v` exposes exactly `guard`, `round`,
  `sticky` as separate ports: G/R/S is the FP version of L/R/S where an extra
  guard bit G is kept because *normalization can shift the result left by one
  afterward*, promoting G to a real mantissa bit and R to the new round bit.
  In pure fixed-point requantization there is no post-round shift, so two
  summary bits (R, S) plus the kept LSB suffice. Chapter 8 will need the full
  three-bit version; chapter 6 can derive the two-bit one honestly.
- The sticky bit's OR-of-everything-below is what makes the rule correct for
  *any* k — the formula verified here at k = 4 has no k in it. That is the
  whole reason a 24-bit-plus-GRS datapath can round as if it had kept all 48+
  bits of an aligned addend (chapter 8's claim; the fixed-point version is
  provable by the reader now).

Note on two's complement negatives: the verification above ran `q = r >> k`
with floor semantics and `dropped = r & (2^k − 1)` — i.e. on two's-complement
raws, the dropped field is read as an *unsigned* remainder above the floor.
With that convention the L/R/S rule works unchanged for negative numbers; no
special-casing of sign. (IEEE FP rounds sign-magnitude instead, so its rounding
logic also never sees a negative — another quiet payoff of sign-magnitude,
worth one sentence in the chapter.)

## 7. Saturation vs wraparound, and how real RTL does it

### 7.1 Two policies for the same overflow

Wraparound is what the adder does for free (section 2); saturation clamps to
the nearest representable extreme and must be built. Why signal-processing
hardware pays for it: a wrapped overflow is maximally wrong — a large positive
result becomes a large *negative* one. Wikipedia's saturation-arithmetic
article (fetch-verified) uses exactly the 8-bit audio case: true answer 130 →
saturated 127 (slightly flat) vs wrapped −126 (a full-scale click), and quotes
the standard characterization that wraparound causes "a catastrophic loss in
signal-to-noise ratio". Saturating instructions are mainstream, not exotic:
Intel MMX/SSE2/AVX2 and ARM NEON all provide them (same source).

### 7.2 A saturating adder in Verilog, verified exhaustively (Icarus)

The idiomatic RTL structure — widen by one bit so no information is lost,
detect overflow with section 4's top-two-bits rule, then mux — compiled and
run under the local toolchain (`e_sat4.v`):

```verilog
wire signed [4:0] full = a + b;           // widen by one: no info lost
assign y_wrap = full[3:0];                // wraparound = just drop the bit
assign ovf    = full[4] ^ full[3];        // top-two-bits rule (sec 4)
assign y_sat  = !ovf     ? full[3:0] :
                full[4]  ? 4'b1000 :      // negative overflow -> -8
                           4'b0111;       // positive overflow -> +7
```

```
$ iverilog -g2012 -Wall -o e_sat4.vvp e_sat4.v && vvp e_sat4.vvp
sat_add4: 0 errors in 256 cases; overflow cases: 64
5+4: wrap=-7 sat=7 ovf=1
-7+-6: wrap=3 sat=-8 ovf=1
```

Notes that earn their place in the chapter:

- The 64 overflow cases agree with section 4's Python census (V-only 28 + both
  36 = 64) — two independent routes to the same count, which is the chapter-5
  cross-check habit applied to the chapter's own material.
- The sign of the *widened* sum (`full[4]`) picks the clamp direction; the
  wrapped sign bit `full[3]` is exactly the bit you cannot trust.
- `-Wall` said nothing, as always. If the `signed [4:0]` widening is forgotten
  (`wire signed [3:0] full = a + b;`) the tool still says nothing and `ovf`
  becomes garbage — the STATE.md truncation warning applies verbatim here.

### 7.3 Convergent rounding as real RTL does it — the ZipCPU idiom, verified

Source (fetch-verified): Dan Gisselquist, "Rounding numbers", zipcpu.com/dsp/
2017/07/22/rounding.html. The article covers truncation, round-half-up,
round-towards-zero and convergent rounding for DSP pipelines; on truncation it
reports that "dropping bits in this fashion biases the result by about a half
of a bit in the negative direction", which caused visible DC artifacts in the
author's FFT work, and that round-half-up "still leaves a bias within the data
values" — both statements match this session's measured −0.469 and +0.031
LSB/sample (section 6.2). Its recommended convergent-rounding idiom is a single
add of a data-dependent correction constant:

```verilog
assign w_convergent = i_data[(IWID-1):0]
      + { {(OWID){1'b0}},
          i_data[K],                    // the kept LSB
          {(K-1){!i_data[K]}} };        // !LSB replicated below
assign o_data = w_convergent[(IWID-1):K];
```

i.e. add `0…0 L ~L~L~L` below the kept part, then truncate. Compiled here with
IWID=12, OWID=8 (K=4 dropped bits) and compared against the arithmetic
round-half-even reference for every 12-bit signed value (`e_cvg.v`):

```
$ iverilog -g2012 -Wall -o e_cvg.vvp e_cvg.v && vvp e_cvg.vvp
convergent-rounding idiom vs half-even reference: 0 errors in 4096 cases
raw +24 (1.5 ulp): -> 2
raw +40 (2.5 ulp): -> 2
raw -24 (-1.5 ulp): -> -2
```

Why the trick works (worth deriving in the chapter, since it looks like magic):
adding `L~L~L~L + dropped` carries into the kept part exactly when
`dropped > half`, or when `dropped == half` and L=1 — which is precisely
`R & (S | L)` from section 6.3, folded into one adder. Ties land on evens in
both directions (+1.5 → 2, +2.5 → 2, −1.5 → −2, captured above). One adder, no
compare tree; this is why the pattern survives in production DSP RTL, and FPGA
hard DSP blocks bake the same options in (AMD/Xilinx DSP48E1 supports
symmetric and convergent rounding via its C-input/carry machinery — UG479
[title-only]).

### 7.4 The DC-bias argument as practitioners state it

The practitioner logic chain, assembled from the verified sources plus this
session's measurements: (1) truncation is free, so it is everyone's default;
(2) its ~−0.5 LSB bias becomes a DC offset that later stages amplify
(measured: −46814 LSBs over 100k samples, section 6.2); (3) round-half-up
costs one adder and cuts the bias to +2^−(k+1) LSB but not to zero (measured
+3040 LSBs); (4) convergent rounding costs the same one adder plus the
L-dependent constant and removes the systematic component (measured residual
−120 LSBs, consistent with zero-mean noise); (5) therefore the standard
practice is: truncate freely at *internal* points where a later stage will
re-round anyway, and spend the convergent round once, at the *output* format
boundary. Point (5) is practice-lore rather than a measurement; the chapter
should present it as the standard recommendation (it is ZipCPU's, and matches
DSP-block hardware support) — not as a theorem.

## 8. The limits of fixed point: dynamic range and the case for floating point

### 8.1 Dynamic range: the 6 dB/bit law, computed

Dynamic range = ratio of the largest representable magnitude to the smallest
nonzero one; in dB, `20·log10(2^N − 1) ≈ 6.02·N`. Computed exactly
(`s8_dynrange.py`):

```
8-bit fixed: max/min = 2^8-1 =          255 ->    48.1 dB  (rule of thumb 48.2 dB)
16-bit fixed: max/min = 2^16-1 =        65535 ->    96.3 dB  (rule of thumb 96.3 dB)
24-bit fixed: max/min = 2^24-1 =     16777215 ->   144.5 dB  (rule of thumb 144.5 dB)
32-bit fixed: max/min = 2^32-1 =   4294967295 ->   192.7 dB  (rule of thumb 192.6 dB)
```

The audio anchors make the numbers tangible: 16-bit ≈ 96.3 dB is CD audio's
figure; 24-bit ≈ 144.5 dB already exceeds the ~120 dB span from hearing
threshold to pain. So for signals whose scale is *known and roughly constant*,
fixed point is not merely adequate — it is the better tool (exact addition,
uniform error, cheap hardware). The chapter should say this plainly; the honest
case for floating point is not "fixed point is bad" but "fixed point requires
knowing the scale in advance".

### 8.2 Where fixed point dies: unknown or wide-ranging scale

The same run computed float32's span for contrast:

```
float32 max normal = 3.4028235e+38; min normal = 1.1754944e-38; min subnormal = 1.4012985e-45
float32 normal-range dynamic range: 1529 dB
float32 incl subnormals: 1668 dB
fixed-point bits needed to span float32's value set at min-subnormal resolution: 277 -> 278 bits with sign
```

A 32-bit float spans 1529 dB (1668 dB with subnormals) versus 192.7 dB for a
32-bit fixed word: to cover the same span at constant resolution a fixed
register would need **278 bits**. What the float gives up in exchange is
*uniform absolute* resolution — its 2^24 significand values are spent per
octave, not per interval.

The failure mode is relative error at small magnitudes, measured on Q16.16
(range ±32768, step 2^−16 ≈ 1.5e−5 — a perfectly reasonable general-purpose
format):

```
 x=   0.001: Q16.16 rel err 7.08e-03 ; float32 rel err 4.75e-08
x = 1e-5: Q16.16 raw = 1 -> 1.525879e-05, rel err 52.6% ; float32 -> 1.000000e-05, rel err 2.53e-08
Q16.16 max = 32767.99998474121 => 40000.0 fits? False
```

At x = 0.001 the fixed format carries 0.7% error where float32 carries 5e−8;
at x = 1e−5 the fixed value is wrong by **52.6%** — the format is down to one
significant bit — while float32 still delivers 2.5e−8. And the same Q16.16
word cannot hold 40000 at all. Float32's relative step is 2^−23 ≈ 1.19e−7
*everywhere in the normal range* (computed in the same run); Q16.16's relative
step swings from 1.5e−2 at x = 0.001 to 1.5e−8 at x = 1000. Fixed point has
uniform absolute error and wildly varying relative error; floating point is
the opposite trade.

### 8.3 The closing bridge to chapter 7

The chapter should end by *constructing* floating point out of the pieces just
taught, so chapter 7 opens with nothing new:

- A float is a fixed-point significand (UQ1.23 in binary32 normal form — an
  unsigned fixed-point number in [1, 2) with a constant hidden integer bit)
  **plus a signed scale factor stored in excess encoding** (section 3.4) **under
  a sign-magnitude sign** (section 3.3). Every ingredient is now on the table.
- Scaling by 2^e is exactly the shift-alignment of section 5.4, performed by
  hardware at runtime instead of by the designer at design time. "Floating
  point is fixed point plus a hardware-managed exponent" is the one-sentence
  version.
- The costs transfer too: adding two floats requires equalizing scales first
  (section 5.4's rule), the significand adder wraps/carries exactly as in
  section 2, its carry-out forces a renormalize (section 4's C flag), and the
  squeeze back to 24 bits rounds with R/S logic (section 6.3, widened to
  G/R/S). Chapter 8 is, in this precise sense, sections 2-6 replayed inside
  one datapath.
- Left as chapter 7's problems: what to do when the exponent itself overflows
  (Inf), what fills the gap between 0 and the smallest normal (subnormals —
  note the min-subnormal figures above), and what 0/0 stores (NaN) — the
  corner cases chapter 5's taxonomy already named from the verification side.

## 9. Verilog signedness experiments under Icarus 13.0

All experiments below were compiled with `iverilog -g2012 -Wall -o <x>.vvp <file>.v`
and run with `vvp` on the local Icarus Verilog 13.0. **No experiment in this
section produced a single compiler warning** — every output shown is complete.
These are observed behaviors, not LRM paraphrase. (The subtraction-on-`ripple4`
run in section 2.3, the saturating adder in 7.2 and the convergent-rounding
idiom in 7.3 are Icarus experiments of this batch too; counting them, the
section's evidence base is 13 compiled-and-run modules.)

### E1 — `signed` declarations and `$signed`/`$unsigned` casts

`e1_signed_basics.v`. One pattern, 0xFD, through both declaration types and
both casts:

```
same pattern 0xFD:
  unsigned reg      : %d -> 253
  signed reg        : %d ->   -3
  $signed(u)        : %d -> -3
  $unsigned(s)      : %d -> 253
  u == s            : 1
  arithmetic: s+1 =          -2, u+1 =        254 (patterns 11111111111111111111111111111110 00000000000000000000000011111110)
```

Findings: the declaration decides
interpretation, not storage — `u == s` is true because comparison is on bits.
The casts are zero-cost reinterpretations: `$signed`/`$unsigned` change the
type of the *expression*, never the bits. The `s+1`/`u+1` line shows context
widening to 32 bits (the integer literal's size): `s` was sign-extended, `u`
zero-extended — extension policy follows the operand's own signedness, measured
directly in E4.

### E2 — one unsigned operand poisons the whole expression

`e2_poison.v`. `sa = −3` (signed), `sb = 2` (signed), `u = 2` (unsigned),
result variable 9-bit signed:

```
signed + signed  : -3 + 2 =   -1  (correct)
signed + UNSIGNED: -3 + 2 =  255  (poisoned)
signed + $signed(u): -3 + 2 =   -1  (repaired)
sa < sb : 1   (signed compare, -3 < 2)
sa < u  : 0   (POISONED: both as unsigned, 253 < 2)
sa / sb      =   -1
sa / u       = 126  (poisoned: 253/2)
u * (-8'sd1) = 254  (unsigned u poisons even a signed literal)
```

The rule, as measured: **if any operand of an arithmetic/comparison operator is
unsigned, every operand is treated as unsigned** — addition, comparison, and
division all flipped. The last line is the important asymmetry: signedness is
not "the strongest operand wins"; one unsigned operand outvotes any number of
signed ones, including signed literals. The repair is `$signed()` on the
unsigned operand — and only that; note in E4 that adding a signed zero does
*not* repair it (the poison rule evaluates the whole expression).

Also captured en passant: Verilog signed `/` truncates toward zero
(`-3/2 = -1`), unlike `>>>` which floors (E3) — the two "divide by 2^k"
spellings disagree on negative odd values, which is section 6.1's
floor-vs-toward-zero distinction appearing inside one language.

### E3 — `>>>` is arithmetic only in a signed context

`e3_shift.v`. `s = −12` (pattern 11110100), `u` = same pattern:

```
s =  -12 (11110100)
signed  >>> 2 : 11111101 =   -3  (arithmetic: sign fills)
signed  >>  2 : 00111101 =   61  (>> is ALWAYS logical, even on signed)
unsigned>>> 2 : 00111101 =   61  (TRAP: >>> acts logical on unsigned)
$signed(u)>>>2: 11111101 =   -3  (repaired)
(s + u*0)>>>2 : 00111101 =   61  (u*0 poisons: shift went logical)
-12 >>> 2 =   -3   but -12/4 =          -3   (-13: >>>   -4, /          -3)
```

Three traps, all measured: (1) `>>` on a signed variable is still logical —
the *operator* does not care what you declared, only `>>>` does; (2) `>>>` on
an unsigned operand silently degrades to a logical shift — no warning; (3) the
nastiest: `(s + u*0) >>> 2` shifts logically because the *left operand
expression* got poisoned by `u`, even though the shift itself is `>>>` and `s`
is signed. The shift amount (right operand) is excluded from the poisoning
rule's scope — it is self-determined — but the shifted expression is not.
Last line: `−13 >>> 2 = −4` (floor) vs `−13 / 4 = −3` (toward zero).

### E4 — widening assignment extends by RHS signedness, not LHS

`e4_extend.v`. 4-bit pattern 1101 into 8-bit targets:

```
signed  -> signed  wide: 11111101 =   -3 (sign-extended)
signed  -> UNSIGNED wide: 11111101 = 253 (still sign-extended! LHS type is irrelevant)
unsigned-> signed  wide: 00001101 =   13 (zero-extended: RHS was unsigned)
u4 + 4'sd0 -> signed: 00001101 =   13 (poison rule again: still zero-extended)
$signed(u4) -> wide: 11111101 =   -3 (cast first, THEN extended)
```

The extension decision belongs entirely to the RHS expression's signedness:
a signed value sign-extends even into an unsigned target (row 2), an unsigned
value zero-extends even into a signed target (row 3). Row 4 kills the folk
repair "add a signed 0": the sum `u4 + 4'sd0` is unsigned by the poison rule,
so it zero-extends. Row 5 is the correct repair and shows the order of
operations: cast to signed *first*, then the widening sees a signed RHS.

### E5 — part-selects and concatenations are always unsigned

`e5_partsel.v`. `s = −3` (8-bit signed):

```
whole vector  -> 16 bits: 1111111111111101 =     -3
s[7:0] (full-width part-select!) -> 0000000011111101 =    253  (unsigned: zero-extended)
s[6:0]                          -> 0000000001111101 =    125
{s} concat                      -> 0000000011111101 =    253  (concat is unsigned too)
s[7:0] >>> 2 -> 00111111 =   63  (part-select killed the arithmetic shift)
```

The measured headline: **`s[7:0]` is not `s`** even when the range covers every
bit — a part-select is an unsigned expression by definition, so it
zero-extends (row 2 vs row 1) and it disables `>>>` (row 5, the E3 trap
triggered by a syntactically invisible cause). Concatenation likewise. This is
the number-system fact of section 3.2 (sign extension must replicate the MSB)
surfacing as a language rule; and it matters for chapter 9, where FP field
extraction (`x[30:23]`, `x[22:0]`) is all part-selects — *correctly* unsigned
there, since IEEE fields are magnitudes, which is worth a remark when the
chapter gets there.

### E6 — comparison traps with unsigned operands

`e6_cmp.v`:

```
u = 5 - 10 -> 251 (11111011)
u < 0: NOT taken (u is unsigned: never < 0)
s < 0: taken (s=  -5)
for (i=10; i>=0; i=i-1) with 4-bit unsigned i: aborted by watchdog after 40 iterations (11 expected; i>=0 is constant true)
200 > -8'sd1 is FALSE: -1 became 255 (poison rule in a comparison)
```

`if (u < 0)` on an unsigned `u` is not a runtime bug — it is a
statically-constant-false branch, compiled without comment by `-Wall`. The
countdown-loop version is the form that ships in real code: with an unsigned
index, `i >= 0` never fails and the loop runs until a watchdog (here) or the
simulator's patience ends. The last line combines E2 and E6: comparing an
unsigned variable against a negative signed literal converts the literal to
its pattern value (−1 → 255), making `200 > −1` false.

### E7 — signed multiply width growth is context-determined

`e7_mult.v`. The section 5.5 corner (−128·−128 = +16384, needing the full 16th
bit) run through 16-bit and 8-bit destinations:

```
(-128)*(-128) into 16-bit:  16384 (0x4000)  -- full product kept
(-128)*(-128) into  8-bit:    0 (0x00)  -- silently truncated to 0
100*100 into 16-bit:  10000 ; into 8-bit:   16 (10000 mod 256 = 16)
100*100 > 9999 : TRUE (context widened the multiply)
```

Findings: with a 16-bit LHS, Icarus widens the operands *before* multiplying —
the full signed product appears (this is the context-determined-width behavior
STATE.md recorded against the `1 << 40` folklore, now confirmed for signed
`*`). With an 8-bit LHS the product is computed and truncated with **no
warning**: −128·−128 yields 0, an error of 16384 that `-Wall` has nothing to
say about. The comparison row shows context width coming from a *literal's*
size (`16'sd9999`), not only from assignment targets. RTL discipline that
follows: declare the product target `signed [2N-1:0]` always; in the FP
datapath, mantissa products (chapter 10+) get 48 bits before any squeeze.

### E8 — `%d` vs `%0d` on signed values

`e8_display.v`:

```
[  -3] [-3]  <- signed 8-bit -3 : %d pads to widest decimal for the width
[253] [253]  <- unsigned 8-bit 253
[         -3] [-3]  <- signed 32-bit -3
%h of -3 8-bit: [fd]   %b: [11111101]
```

`%d` right-pads to the widest decimal the operand's width could produce (4
characters for signed 8-bit, 11 for signed 32-bit), which is why testbench
columns jump in width when a variable changes size; `%0d` suppresses padding.
Both render negatives correctly *iff the expression is signed* — the E1 table
showed the same pattern printing 253 via an unsigned variable. `%h`/`%b`
always print raw bits (`fd`, `11111101` for −3): useful and honest, and the
reason chapter 5's FP testbenches compare `%h` patterns, not `%d` values.

### E9 — what `-Wall` says about all of it: nothing

`e9_wall.v` packs the whole section into one module — signed+unsigned mix,
16→8 product truncation, 8→4 sum truncation, signed-vs-unsigned compare,
poisoned `>>>` :

```verilog
assign mix    = s + u;
assign prodl  = s * s;
assign narrow = s + s;
assign cmp    = s < u;
assign shft   = (s + u) >>> 1;
```

```
=== compile: iverilog -g2012 -Wall e9_wall.v ===
=== exit status: 0 ; stdout+stderr above (nothing printed = nothing said) ===
```

Zero diagnostics, exit 0. This extends STATE.md's standing truncation finding
to the full signedness family: under this toolchain, **every bug class in this
section is silent at compile time**. The chapter should say what chapter 3
learned to say: name the tool that catches each trap — here, none; only
testbenches with known-answer checks (chapter 5) do.

### E10 — literal signedness: `-8'd3` is not minus three

`e10_literals.v`. Plain decimal literals are signed; **based literals
(`8'd3`, `8'hfd`) are unsigned** unless the base carries `s` (`8'sd3`); and a
leading minus is an operator applied afterwards, not part of the literal:

```
-3 (plain)        ->     -3
-8'd3  into 16 bit ->     -3
s + (-8'd3)    ->    250  (unsigned literal poisons: -3 + -3 != -6?)
s + (-8'sd3)  ->     -6
s == -8'd3 : equal (bit patterns match)
(-8'd3) alone in %d: 253 ; 8'hFD as signed? 253
```

Rows 1-2 look safe — and that is the trap: `w = -8'd3` *happens* to store −3
because negation runs at the context width (16) and the wrapped pattern reads
back as −3. The damage appears when the literal joins an expression (row 3):
`-8'd3` is unsigned, poisons the sum (E2), `s` zero-extends to 253, the
negated literal becomes 65533, and −3 + −3 prints 250. Marking the literal
`'sd` fixes it (row 4). Equality (row 5) is pattern-based and hides the
difference. House rule this measures out to: **negative constants in signed
arithmetic must be written `-8'sd3` (or plain `-3`), never `-8'd3`** — the
unmarked based literal is the only spelling that is wrong silently.

### Summary table for the chapter

| Trap | Symptom | Repair | Warned? |
|---|---|---|---|
| unsigned operand in signed expr (E2) | whole expr unsigned | `$signed()` the operand | no |
| `>>` on signed (E3) | logical shift | use `>>>` *and* keep expr signed | no |
| `>>>` on unsigned/poisoned expr (E3) | logical shift | `$signed()` first | no |
| widening unsigned RHS (E4) | zero-extension | `$signed()` before assign | no |
| part-select / concat (E5) | always unsigned | `$signed(s[..])` if needed | no |
| `u < 0`, `i >= 0` unsigned (E6) | constant branch / infinite loop | signed index or restructure | no |
| product truncation (E7) | silent mod 2^N | `[2N-1:0]` target | no |
| `-8'd3` style literals (E10) | unsigned constant | `-8'sd3` or plain `-3` | no |

The "Warned?" column is a measurement (E9), not an opinion.

## Sources

### Fetch-verified this session (2026-08-16)

- Dan Gisselquist, "Rounding numbers", ZipCPU blog —
  https://zipcpu.com/dsp/2017/07/22/rounding.html. Verified content: covers
  truncation, round-half-up, round-towards-zero, convergent rounding; states
  truncation "biases the result by about a half of a bit in the negative
  direction"; supplies the `w_convergent` correction-constant idiom reproduced
  and exhaustively verified in section 7.3.
- Wikipedia, "Q (number format)" —
  https://en.wikipedia.org/wiki/Q_(number_format). Verified content: TI
  convention (sign bit not counted in m, width 1+m+n) vs ARM convention (m
  counts the sign bit); resolution always 2^−n.
- Wikipedia, "Saturation arithmetic" —
  https://en.wikipedia.org/wiki/Saturation_arithmetic. Verified content: the
  130 → 127 vs −126 8-bit example; "catastrophic loss in signal-to-noise
  ratio" characterization of wraparound; saturating support in MMX, SSE2/AVX2,
  ARM NEON; saturation harder to implement than modular arithmetic.

### Fetch attempted, unavailable this session

- Randy Yates, "Fixed-Point Arithmetic: An Introduction", Digital Signal Labs
  — digitalsignallabs.com returned HTTP 503 on both known URLs and the archive
  mirror was unreachable; treat as [title-only]. Standard free reference for
  A(a,b)/Q notation and wordlength growth; nothing in these notes depends on
  it beyond corroboration.

### [title-only] citations (not fetch-verified; every dependent claim was independently measured in this session)

- IEEE Std 1364-2005, §5.4.1 (expression bit lengths) and §5.5.1 (expression
  signedness) — the rules E1-E10 measure. The measured behavior of Icarus 13.0
  is what these notes assert; the standard is cited as the rules' origin only.
- Stuart Sutherland and Don Mills, "Standard Gotchas: Subtleties in the Verilog
  and SystemVerilog Standards That Every Engineer Should Know", SNUG Boston
  2006 — the practitioner catalogue of the signedness traps family.
- Clifford E. Cummings, SNUG papers on Verilog coding practice (sunburst-design
  .com now sits behind a login wall; per project citation policy, by title
  only).
- Texas Instruments, "TMS320C64x+ DSP Library Programmer's Reference"
  (SPRUEB8) — TI Q-notation convention; TI C6x `SMPY`-family saturation of the
  (−1)×(−1) fractional multiply corner.
- AMD/Xilinx, UG479 "7 Series DSP48E1 Slice User Guide" — hardware support for
  symmetric/convergent rounding in the DSP slice.
- M. Morris Mano and Michael D. Ciletti, *Digital Design*, 6th ed., ch. 1 —
  number systems and complements at textbook level (already a chapter 1
  source).
- Israel Koren, *Computer Arithmetic Algorithms*, 2nd ed., A K Peters, 2002 —
  signed number systems, bias encoding, rounding schemes.
- Behrooz Parhami, *Computer Arithmetic: Algorithms and Hardware Designs*,
  2nd ed., Oxford, 2010 — fixed-point and redundant representations context.
- David Goldberg, "What Every Computer Scientist Should Know About
  Floating-Point Arithmetic", ACM Computing Surveys 23(1), 1991 — the
  canonical relative-error / motivation treatment behind section 8's argument
  (all figures in section 8 computed locally, not taken from the paper).

### Session experiment inventory

Python scripts (all in the session scratchpad, outputs quoted inline):
`s1_radix.py`, `s1b_radix.py`, `s2_unsigned.py`, `s3_signed.py`,
`s3b_signed.py`, `s4_overflow.py`, `s4b_overflow.py`, `s5_qformat.py`,
`s5b_qformat.py`, `s5c_mult.py`, `s6_round.py`, `s6b_drift.py`, `s6c_grs.py`,
`s8_dynrange.py`, plus three inline one-liners (float bit fields, Q1.15 corner
candidates, Q16.16 small-value error).

Icarus modules (all compiled `iverilog -g2012 -Wall`, zero warnings
throughout): `e_sub4.v` (+ chapter 2's `ripple4.v`/`full_adder.v` unmodified),
`e_sat4.v`, `e_cvg.v`, `e1_signed_basics.v`, `e2_poison.v`, `e3_shift.v`,
`e4_extend.v`, `e5_partsel.v`, `e6_cmp.v`, `e7_mult.v`, `e8_display.v`,
`e9_wall.v`, `e10_literals.v` — 13 modules, 13 clean compiles, all runs
captured verbatim.
