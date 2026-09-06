# Chapter 1 Review — Digital Logic Foundations

**Reviewer persona:** RTL veteran (20 yr datapath design/verification, internal new-hire digital design course)
**Target:** `guide/chapters/ch01.md` (10549 w, 11 sections)
**Date:** 2026-08-09

<!-- sections complete: 6/6 -->

## Verdict

**Score: 7/10**

The arithmetic in this chapter is immaculate — I re-derived every equation, every K-map cover, every hex encoding and every timing number independently, and found not one wrong value; the writer even beat the research notes on the two K-map literal counts. But the full-adder gate diagram is a genuinely wrong circuit: read column by column it shorts A, B and Cin onto a single net, shorts the `A·B` AND output onto the XOR1 output, and shorts that same AND output straight to Cout past the OR gate — and it is introduced with the words "As a picture:" for the one block the reader will build more of than anything else in the book. Compounding it, the paragraph that carries the chapter's central structural argument states that the pull-up and pull-down networks "both conduct on the same input condition," which is false and flatly contradicts the correct sentence two paragraphs above it; a beginner cannot tell which of the two to believe, so a reader is actively misled in two places and the chapter lands below the one-defect line.

## Blocking defects

### B1 — The full-adder gate diagram is not a full adder (lines 264-272)

```
   A ---+--[XOR]--+--[XOR]--- S
        |    |    |    |
   B ---+----+    |   Cin
        |         |
        +--[AND]--+--------+
        |          \       |
   Cin -+---[AND]---[OR]--- Cout
```

I extracted the raw character columns rather than eyeballing it. In ASCII schematic
convention a `+` sitting on a horizontal wire with vertical continuity above or below
it is a junction, not a crossing — crossings are drawn by breaking a line. Every `+`
here sits on a horizontal wire. Column occupancy:

| line | col 8 | col 18 | col 27 |
|---|---|---|---|
| 265 (`A ... S`) | `+` on A's wire | `+` on the XOR1→XOR2 wire | — |
| 266 | `\|` | `\|` | — |
| 267 (`B ... Cin`) | `+` on B's wire | `\|` | — |
| 268 | `\|` | `\|` | — |
| 269 (`+--[AND]--+---+`) | `+` = AND1 input | `+` = AND1 output | `+` |
| 270 | `\|` | — | `\|` |
| 271 (`Cin -+---[AND]---[OR]--- Cout`) | `+` on Cin's wire | — | lands on the Cout net |

Four independent errors follow:

1. **Column 8 shorts A, B and Cin into one net.** It is a continuous vertical from
   line 265 to line 271 with a `+` on each of the three input wires. Three primary
   inputs tied together.
2. **Column 18 shorts the `A·B` AND output to the XOR1 output** (which is also XOR2's
   input, i.e. the `A XOR B` node). Two gate outputs driving one node.
3. **Column 27 shorts the `A·B` AND output directly to Cout**, bypassing the OR gate
   entirely. Column 27 on line 271 is the gap between the `---` of the OR output and
   the word `Cout`, so the stub lands on the Cout net.
4. **The second AND has only one drawn input** (Cin, via the col-8 short). Its other
   input, `A XOR B`, is never routed to it. And the `\` at col 19 line 270 drops the
   AND1 output onto the *wire between AND2 and the OR*, merging two gate outputs
   instead of entering a distinct OR input.

Correct version — the standard two-half-adders-plus-an-OR construction, which is
exactly the chapter's own `Cout = A·B + (A XOR B)·Cin` and has no ambiguous
junctions at all:

```
          half adder 1                half adder 2
      ┌────────────────┐          ┌────────────────┐
 A ──▶│                │  p       │                │
      │   XOR ─────────┼─────────▶│   XOR ─────────┼──▶ S
 B ──▶│                │          │                │
      │   AND ──┐      │   Cin ──▶│   AND ──┐      │
      └─────────┼──────┘          └─────────┼──────┘
              g │                         t │
                └───────────┐   ┌───────────┘
                            ▼   ▼
                          ┌───────┐
                          │  OR   ├──▶ Cout
                          └───────┘

      p = A XOR B     g = A·B     t = p·Cin
      S = p XOR Cin   Cout = g + t = A·B + (A XOR B)·Cin
```

This has the pedagogical bonus of showing the reader that a full adder *is* two half
adders, which the chapter mentions ("The half adder ... Useful only at the LSB") but
never draws. If a clean ASCII drawing is not wanted, delete the picture and keep the
equations — the brief's own standard is that a wrong diagram in chapter 1 is worse
than no diagram. A netlist listing would also do:

```
   p    = XOR(A, B)          g    = AND(A, B)
   S    = XOR(p, Cin)        t    = AND(p, Cin)
                             Cout = OR(g, t)
```

### B2 — "both conduct on the same input condition" is false (line 61)

> **The complementary structure forces inversion.** The two networks are duals —
> series in one is parallel in the other — and **both conduct on the same input
> condition**, one pulling to 1 and one to 0.

Two paragraphs earlier the chapter says the opposite, correctly:

> Both networks are never on at once, so there is no steady-state path from V_DD to
> ground. (line 59)

If the PUN and PDN both conducted on the same input condition the gate would be a
crowbar from V_DD to GND on that condition — which is precisely the failure mode
line 59 says static CMOS avoids. A beginner has no way to decide which sentence to
keep, and this paragraph is load-bearing: it is the argument for "every static CMOS
gate is inverting," which is the argument for "NAND and NOR are the primitives,"
which is one of the chapter's headline results.

Correct version:

> **The complementary structure forces inversion.** The two networks are duals —
> series in one is parallel in the other — and they are built to recognize the *same*
> input condition, but they act on it oppositely and never conduct at the same time:
> when the condition holds the pull-down network connects the output to ground; when
> it does not, the pull-up network connects it to V_DD. So the output is always the
> complement of the condition the networks recognize.

(The same wording, "Both conduct on the asserted condition," appears in the research
notes at `research/ch01-digital-logic.md` §1 and should be fixed there too.)

## Non-blocking issues

### N1 — The static-1 hazard trace ignores the OR gate's own delay (lines 403-415)

The chapter says "give **every** gate 1 ns of delay," then lists events only as far as
the AND outputs and concludes "between t = 1 ns and t = 2 ns → both AND outputs are
0 → F dips to 0 for ~1 ns." I simulated it at 10 ps resolution with a 1 ns OR: the
AND outputs are indeed both 0 over [1, 2] ns, but **F itself dips over [2, 3] ns**.
The glitch *width* the chapter gives is right; the *time* is one gate delay late.
A reader doing the checklist exercise ("Trace the static-1 glitch...") by hand gets a
different answer from the book.

Fix — add two lines to the trace:

```
   t = 2 ns    F falls to 0             (OR delay after A·B fell)
   t = 3 ns    F returns to 1           (OR delay after A'·C rose)

   -> F is 0 for ~1 ns, one OR delay behind the AND crossover
```

### N2 — Roughly half the body sections carry no inline citation

The brief says every factual claim carries a citation. There are 11 inline citations
in the body, and they cluster: the transistor section, K-map/Quine-McCluskey,
interconnect, logical effort, CDC, and the FP seed callouts. Sections making
checkable factual claims with **zero** inline attribution:

- **"Hazards and glitches"** (lines 395-423) — the whole static-0/static-1/dynamic
  taxonomy, the "three or more unequal paths" claim, and the fatal-glitch list
  including the recovery/removal claim. Wakerly 5th ed. Ch. 4 is already in the
  source list and described there as "the most careful standard treatment of
  hazards" — cite it at line 401.
- **"The three parameters" / setup / hold / skew and jitter** (lines 449-545) — both
  inequalities, the aperture window, t_pcq/t_ccq. Cite Harris & Harris Ch. 3.
- **Metastability** (lines 501-537) — the `e^(−t/τ)` resolution law and the MTBF
  equation. Source-list item 19 addresses provenance but nothing is cited at the
  point of use. Cite Harris & Harris Ch. 3 / Weste & Harris Ch. 10 inline.
- **"How Hardware Writes Numbers Down"** two's complement and sign-magnitude
  subsections (lines 551-617) — negation, overflow detection, sign extension, range
  asymmetry. Cite Patterson & Hennessy RISC-V Ch. 2.
- **The combinational toolbox** blocks themselves (mux, decoder, encoder, comparator)
  — MIT 6.004 Ch. 4 is in the source list as covering multiplexers but is never cited
  in the body; Mano & Ciletti Ch. 4 is the source of the priority-encoder equations
  per the research notes.
- **Line 274, "the classic static CMOS mirror adder is 24 transistors"** — a specific,
  checkable number from a specific source (Weste & Harris Ch. 11 per the research
  notes) with no citation attached.

None of these claims is wrong. The issue is purely that a load-bearing factual claim
is asserted without attribution, against an explicit brief requirement.

### N3 — "roughly CV²f per transition" confuses energy with power (line 59)

`CV²f` is a power (watts). The energy per full charge/discharge cycle is `CV²`;
average dynamic power is `α·C·V²·f`. As written the sentence attaches a power to a
single transition. Fix: "power is burned when nodes *change* — roughly `CV²` of
energy per charge/discharge cycle, so `α·C·V²·f` of average power, where `α` is how
often the node actually toggles."

### N4 — `0.5·R·C·L²` needs per-unit-length symbols (line 379)

If `R` and `C` are the wire's total resistance and capacitance, the Elmore delay of a
uniform line is `0.5·R·C` with no `L²`; the `L²` only appears when `r` and `c` are
per unit length. Fix: write `0.5·r·c·L²` and say "with `r` and `c` the resistance and
capacitance **per unit length**." As printed a careful reader will think the formula
is dimensionally broken.

### N5 — `d = g·h + p` is dropped with two of three symbols undefined (line 385)

`h = C_out/C_in` is defined; `g` (logical effort) and `p` (parasitic delay) are not.
This is a chapter for a reader with zero hardware background. Either name the two
terms in half a sentence — "`g` the gate's logical effort, `p` its parasitic delay" —
or cut the formula and keep the citation as a pointer. The same applies to `AOI/OAI`
(line 71) and `recovery/removal timing` (line 423), both used as if already known.

### N6 — "`A > B` falls straight out of the carry-out of `A − B`" is off by the equality case (line 235)

For unsigned operands the carry-out of `A + ~B + 1` is 1 iff **A ≥ B**, not A > B.
Getting strict greater-than needs the carry-out ANDed with "result nonzero" (or the
equality comparator the same paragraph just built). Fix: "`A ≥ B` falls straight out
of the carry-out of `A − B`, and strict `A > B` is that carry-out with the
zero-detect from the equality comparator." The chapter's real point — compare and
subtract are the same hardware — is untouched, and the `≥` form is the one chapter 8
actually needs for the operand swap.

### N7 — The hold/CDC sentence points the reader at the wrong hazard (line 499)

> FPGA routers usually fix hold automatically, which is why beginners rarely meet it
> — and then get blindsided the first time they cross a clock domain.

The blindside at an asynchronous clock-domain crossing is **metastability**, which is
the subject of the very next subsection — not a hold violation. For genuinely
unrelated clocks, STA does not check hold across the boundary at all. Hold problems
on FPGAs do show up on *related* clocks (same PLL, different phase or divide) and on
source-synchronous I/O. Fix: "...and then meet it on a phase-shifted or divided clock
from the same PLL, or on a source-synchronous interface, where the router cannot fix
it for you." Leave the CDC blindside to the metastability section, where it belongs.

### N8 — The associativity example is a rounding *tie*, not a magnitude truncation (line 676)

> The first grouping rounds the tiny addend away twice

`2^-24` is exactly half an ULP of 1.0, so `1.0 + 2^-24` is an exact tie and
round-to-nearest-**even** selects 1.0 because 1.0's last significand bit is 0. Under
round-half-away it would give `0x3F800001` and the example would not work. Since
chapter 8 has to teach ties-to-even carefully, saying "rounds away" here plants the
wrong mechanism. Fix: "The first grouping hits an exact tie twice — `2^-24` is half
an ULP of 1.0 — and round-to-nearest-even breaks both ties down to 1.0."
(The hex values and the printed `1.00000012` are all correct as given.)

### N9 — Two toolbox subsections open with a definition, not intuition

The stated style is intuition first. "The decoder" (line 215) opens "An n-to-2ⁿ
decoder asserts exactly one output..."; "The encoder, and the priority encoder"
(line 219) opens "A plain encoder maps a one-hot input to its index...". Compare the
mux ("The mux answers 'pick one of these'") and carry-save ("what if you don't do
it?"), which are excellent. One clause each would fix it — e.g. the decoder "turns a
number into a place", the priority encoder "turns a place back into a number, and
settles arguments".

### N10 — The brief says chapter 1 contains no Verilog; six fragments appear

`assign y = a & b;` (71), `assign sum = a + b;` (294), `always @(*)` (447),
`{cout, sum} = a + b;` (555), `$signed()` / `{{4{x[3]}}, x}` (604),
`always @(posedge clk)` (660). None is a compilable listing, all are used as
forward-pointing traps, and they earn their place — but `guide/src/` is empty and
STATE.md's own rule is that every Verilog listing in a chapter must exist as a
compiled file first. Either restate the brief as "no Verilog *listings*" in STATE.md
or drop the fragments. This is a bookkeeping decision, not a technical fault.

### N11 — Minor wording

- Line 61, "Every static CMOS gate is inverting" — true of every *single-stage
  complementary* gate; the AND2 the chapter describes two lines later (NAND+INV) is a
  static CMOS gate and is not inverting. Add "single-stage".
- Line 274, "Gate-composition versions land nearer 28" — the canonical 28T static
  full adder is built from complementary *complex* gates, not from discrete
  XOR/AND/OR cells (that composition costs 40+). Say "complex-gate versions".
- Lines 525-527, the two-flop synchronizer boxes have no top border (`│D  Q│` with no
  `┌───┐` above). Purely cosmetic, but it is the only unclosed box in the chapter.
- Line 229, "Verified against all 16 input patterns" — the equations define an index
  for the 15 valid patterns; for the all-zero pattern `Y` is don't-care and `valid`
  is 0. Worth one clause, since the reader is being taught that a plain encoder's
  all-zero ambiguity is exactly what `valid` exists to resolve.

## Verification log

Everything below was re-derived with `python3` 3.13.7 from the chapter's stated
premises only — I did not use the chapter's or the research notes' answers as inputs.
Scripts are in the session scratchpad (`v1_fulladder.py` … `v11_hazard.py`).

### Full adder (line 243-260)

| check | result |
|---|---|
| chapter truth table's 8 rows vs `A+B+Cin` | **PASS**, all 8 rows |
| `S = A XOR B XOR Cin` | **PASS**, all 8 |
| `Cout = A·B + A·Cin + B·Cin` | **PASS**, all 8 |
| `Cout = A·B + (A XOR B)·Cin` | **PASS**, all 8 |
| `Cout = A·B + (A + B)·Cin` | **PASS**, all 8 |
| all three Cout forms mutually equal | **PASS** |
| half adder `S = A XOR B`, `Cout = A·B` | **PASS**, all 4 |

### K-map, no don't-cares (lines 110-165)

Independent Quine-McCluskey PI enumeration plus exhaustive minimum-cover search over
all subsets of primes.

- `Σm(0,1,2,5,6,7,8,9,10,14)` and `ΠM(3,4,11,12,13,15)` are complementary index sets
  over 0-15 — **PASS**.
- The chapter's truth table (lines 119-128) reproduces exactly that minterm set —
  **PASS**.
- The chapter's K-map grid (lines 133-137) is correct cell by cell in Gray order:
  AB=00 → `1 1 0 1`, AB=01 → `0 1 1 1`, AB=11 → `0 0 0 1`, AB=10 → `1 1 0 1`
  — **PASS**.
- **Complete PI set, machine-enumerated:** `B'C'`{0,1,8,9}, `B'D'`{0,2,8,10},
  `CD'`{2,6,10,14}, `A'BC`{6,7}, `A'BD`{5,7}, `A'C'D`{1,5} — exactly six, exactly the
  chapter's list at lines 145-150, same cover sets. **PASS**.
- **Essential PIs:** `{B'C', CD'}` only — `B'C'` uniquely covers m9, `CD'` uniquely
  covers m14. **PASS**, matches the chapter.
- `B'D'` is prime and non-essential — **PASS**, confirming the chapter's pedagogical
  point at line 161.
- **Exact minimum cover:** search over all 3-term combinations of the 6 primes yields
  **exactly one** minimum solution: `B'C' + CD' + A'BD`, **3 terms / 7 literals**.
  No 2-term cover exists. **PASS** — the chapter's answer *and* its literal count are
  right, and the writer's correction of the research notes' "8 literals" is correct.
- `F = B'C' + CD' + A'BD` evaluated on all 16 inputs: **0 mismatches**.
- Canonical SOP = 10 minterms × 4 literals = **40 literals** — **PASS** (line 159).

### K-map with `d(3, 11)` (lines 171-187)

- PI set changes to `B'`{0,1,2,8,9,10 + d3,d11}, `CD'`{2,6,10,14}, `A'D`{1,5,7 + d3},
  `A'C`{2,6,7 + d3} — four primes.
- **Exact minimum cover:** `B' + CD' + A'D`, **3 terms / 5 literals**, unique at that
  term count. The notes' `B' + CD' + A'BD` is valid but 6 literals. **PASS** — the
  chapter took the true minimum and the run-log correction is right.
- `A'BD` = {5,7} does grow to `A'D` = {1,3,5,7}, and `B'` is the half-map
  {0,1,2,3,8,9,10,11} — **PASS** (line 181).
- `B' + CD' + A'D` vs original F on the 14 care combinations: **0 mismatches**;
  the two don't-care cells are both driven to 1. "all fourteen care combinations"
  (line 187) — **PASS**, 16 − 2 = 14.

### Carry-lookahead (lines 300-328) — exhaustive over all 512 cases

Reference model: an independently built 4-bit ripple-carry chain, itself cross-checked
against Python integer `a + b + c0`.

| check | mismatches / 512 |
|---|---|
| `c1 = g0 + p0·c0` … `c4 = g3 + p3·g2 + p3·p2·g1 + p3·p2·p1·g0 + p3·p2·p1·p0·c0` | **0** |
| same equations with `p_i = a_i OR b_i` (line 316's claim that either works) | **0** |
| `s_i = p_i XOR c_i` reproduces the true sum bits | **0** |
| `G = g3 + p3·g2 + p3·p2·g1 + p3·p2·p1·g0`, `P = p3·p2·p1·p0`, `c4 = G + P·c0` | **0** |

Fan-in claim (line 318): a flat 32-bit `c32` expands to 33 product terms, so a
33-input OR, and the widest AND term is `p31…p0·c0` = 33 inputs. **PASS**.

### Carry-save / 3:2 compressor (lines 334-345)

- `X + Y + Z = S + 2C` with `S_i = X_i^Y_i^Z_i` and `C_i = maj(X_i,Y_i,Z_i)`:
  **exhaustive over all 32768 5-bit triples — 0 mismatches**; plus 20000 random
  8-bit triples (seed 1) — **0 mismatches**. **PASS**.
- These are bit-for-bit the full-adder equations verified above, so "a carry-save
  adder is n full adders side by side" (line 345) is exact, not analogy.

### Priority encoder (lines 224-229)

`valid = D3+D2+D1+D0`, `Y1 = D3+D2`, `Y0 = D3 + D2'·D1`, checked against
"index of the highest set bit" over all 16 patterns: **0 mismatches on the 15 valid
patterns**; for the all-zero pattern the equations give `Y = 00, valid = 0`
(index undefined, correctly gated by `valid`). **PASS**.

### Two's complement and sign-magnitude (lines 557-617)

| check | result |
|---|---|
| `+5 = 00000101` → `~` → `11111010` → `+1` → `11111011` = −5 | **PASS** |
| weight expansion `−128+64+32+16+8+2+1 = −5` (set bits 7,6,5,4,3,1,0) | **PASS** |
| 4-bit `5 − 3`: `0101 + 1100 + 1 = 1 0010`, `~3 = 1100`, low nibble = 2 | **PASS** |
| signed overflow = (carry-in to MSB) XOR (carry-out of MSB), **all 256 4-bit operand pairs × both carry-ins** vs true signed arithmetic | **0 mismatches** |
| equivalent form "two same-signed operands → opposite-signed result", all 256 pairs | **0 mismatches** |
| INT_MIN: `10000000` → `~` → `01111111` → `+1` → `10000000` (unchanged) | **PASS** |
| sign extension `1011` (−5) → `11111011` (−5); zero-extend → `00001011` = **+11** | **PASS** |
| range `−2^(n−1) … +2^(n−1)−1`: 4-bit −8..+7, 8-bit −128..+127 | **PASS** |
| sign-magnitude `+5 = 0x05`, `−5 = 0x85`; two zeros; range −127..+127 | **PASS** |
| Hamming distance +5 vs −5: two's complement **7 bits**, sign-magnitude **1 bit** | **PASS** (lines 615, 639-642) |

### IEEE 754 binary32 via `struct` (lines 628-654)

| value | computed | chapter | bit field string |
|---|---|---|---|
| `+5.0` | `0x40A00000` | `0x40A00000` | match |
| `-5.0` | `0xC0A00000` | `0xC0A00000` | match |
| `+0.15625` | `0x3E200000` | `0x3E200000` | match |
| `-0.15625` | `0xBE200000` | `0xBE200000` | match |

All four sign/exponent/fraction splits match the chapter's spaced bit strings
character for character. Decode of `+5.0`: biased exponent **129**, real exponent
`129 − 127 = 2`, fraction `0x200000` = 2097152, significand `1 + 2097152/2²³` =
**1.25**, `1.25 × 2² = 5.0` — every number in line 635 **PASS**.

- Unsigned-integer ordering (line 652): 5000 distinct positive binary32 values sorted
  by float value are also sorted as unsigned ints — **PASS**; the same test on 2000
  negative values — **fails**, as the chapter says. **PASS**.
- Non-associativity (lines 671-674): `(1.0 + 2^-24) + 2^-24 = 0x3F800000`;
  `1.0 + (2^-24 + 2^-24) = 0x3F800001`, printing as `1.00000012`. **PASS**, all
  three values exact. `2^-23` is representable as the last bit of 1.0 — **PASS**.
  (Mechanism is a round-to-even tie, not truncation — see N8.)

### Timing arithmetic (lines 456-522)

| check | computed | chapter | result |
|---|---|---|---|
| `0.15 + 2.10 + 0.09 + 0.12` | 2.46 ns | 2.46 ns | **PASS** |
| `f_max = 1/2.46 ns` | 406.504 MHz | 406.5 MHz | **PASS** |
| slack at T=2.00 (500 MHz) | −0.46 ns | −0.46 | **PASS** |
| slack at T=2.50 (400 MHz) | +0.04 ns | +0.04 | **PASS** |
| slack at T=3.00 (333 MHz) | +0.54 ns | +0.54 | **PASS** |
| flop+skew overhead | 0.36 ns | 0.36 | **PASS** |
| 3 stages: `0.15+0.70+0.09+0.12` | 1.06 ns | 1.06 | **PASS** |
| pipelined f_max | 943.40 MHz | 943 MHz | **PASS** |
| speedup `2.46/1.06` | 2.3208× | 2.32× | **PASS** |
| pipelined latency `3 × 1.06` | 3.18 ns | 3.18 ns | **PASS** |
| hold: LHS `0.06 + 0.00`, RHS `0.04 + 0.12`, slack | 0.06 / 0.16 / −0.10 ns | same | **PASS** |
| 24-bit RCA at 2 gate delays/stage, 50 ps/gate | 48 delays, 2.4 ns | 48, 2.4 ns | **PASS** |
| 32-bit barrel shifter: `log₂32` stages × 32 muxes | 5 × 32 = 160 | 160, depth 5 | **PASS** |

### MTBF (lines 510-522)

τ = 100 ps, T_w = 50 ps, f_clk = 500 MHz, f_data = 10 MHz, t_setup = 0.10 ns,
`MTBF = e^(t_r/τ) / (T_w·f_clk·f_data)`:

| synchronizer | t_r | computed MTBF | chapter | result |
|---|---|---|---|---|
| two-flop, `T_clk − t_setup` | 1.90 ns | 7.139e2 s (11.8 min) | ~7.1e2 s, "12 minutes" | **PASS** |
| three-flop, `2·T_clk − t_setup` | 3.90 ns | 3.464e11 s (11 090 yr) | ~3.5e11 s, "~11,000 years" | **PASS** |
| ratio | — | 4.85e8 | "about 5×10⁸" | **PASS** |
| per-stage multiplier `e^(T_clk/τ)` | — | 4.852e8 | "roughly e^(T_clk/τ)" | **PASS** |

"halving `f_data` buys a factor of 2" — correct, MTBF ∝ 1/f_data. (The research
notes said "halving f_data barely helps"; the chapter's version is the accurate one.)

### Hazard trace (lines 403-415) — event-driven sim, 10 ps resolution, 1 ns/gate

`F = A·B + A'·C`, B = C = 1, A falls at t = 0:

- `A·B` falls at **t = 1.0 ns** — matches chapter.
- `A'` rises at t = 1.0, `A'·C` rises at **t = 2.0 ns** — matches chapter.
- **`F` falls at t = 2.0 ns and returns at t = 3.0 ns** — glitch width 1.0 ns, but
  displaced one OR delay from the chapter's implied [1, 2] window. See N1.
- With the consensus term `B·C` added: **no transitions on F at all** — the fix works
  exactly as claimed (line 417). **PASS**.

### Diagrams — character-column extraction, not eyeballing

| diagram | lines | result |
|---|---|---|
| CMOS inverter | 41-55 | **PASS** — PMOS carries the bubble and sits to V_DD, NMOS bare to GND, output node between them at col 13, conduction annotations correct |
| 2:1 mux | 199-207 | **PASS** (crude trapezoid, D0 top / D1 bottom / S from below / Y right; the `\|mux\|` pipes clash with the slashes but nothing is miswired) |
| **full adder** | 264-272 | **FAIL** — see B1 |
| ripple-carry | 280-288 | **PASS** — FA boxes at cols 2-6 / 13-17 / 24-28 / 35-39, operands drop in at the right columns, sums drop out, carries flow right-to-left, and `c3`/`c2`/`c1`/`c0` label the correct wires (FA_i emits c_{i+1}) |
| barrel shifter | 353-360 | **PASS** — 5 = 0b101 → stage 0 shifts 1, stage 1 passes, stage 2 shifts 4, total 5 |
| master-slave flip-flop | 435-443 | **PASS** — M enabled on `clk'`, S on `clk`; clk low → M transparent / S holding; clk high → the reverse; no transparent D→Q path; correct positive-edge behaviour |
| two-flop synchronizer | 524-529 | **PASS** electrically (both flops on `dest_clk`, nothing between them); boxes have no top border — cosmetic only |

### Citations

- **No `[title-only]` source is given a URL.** Only four URLs appear in the whole
  chapter (lines 447, 623, 725-728) and all four are the research notes' `[verified]`
  sources: IEEE 754-2019, MIT 6.004 c4, MIT 6.004 c5, Vivado UG901. **PASS** — this
  is the constraint the run log flagged as a past failure mode, and it is honoured.
- Source list items 5-22 are correctly segregated under "By title (no link
  asserted)" with a header stating exactly that. **PASS**.
- Intel WP-01082 (403 in research) and Microchip AC474 (unextractable) are handled
  correctly: item 19 appears without a URL and explicitly disclaims that the MTBF
  form used is the textbook one; AC474 is dropped entirely, matching the research
  note that "nothing is attributed to it". **PASS**.
- Bibliographic details spot-checked against the research notes and standard record:
  McCluskey BSTJ 35(6):1417-1444 1956; Quine AMM 59(8):521-531 1952; Kogge & Stone
  IEEE TC C-22(8):786-793 1973; Brent & Kung C-31(3):260-264 1982; Wallace IEEE TEC
  EC-13(1):14-17 1964; Dadda Alta Frequenza 34:349-356 1965; Goldberg ACM CSUR
  23(1) 1991. All consistent, all attached to claims that genuinely follow from them.
  **PASS**.
- Attribution plausibility: the signed-zero-by-rounding-mode rule → Muller et al.
  Ch. 3 (correct — that is where the IEEE 754 §6.3 exact-zero-sign rule is treated,
  and the chapter states the rule correctly: +0 in every mode except
  roundTowardNegative); LZA → Ercegovac & Lang Ch. 8 (correct); Espresso → Brayton
  et al. 1984 (correct); logical effort stage effort 3-4 → Sutherland/Sproull/Harris
  (correct). **PASS**.
- **Gap:** see N2 — 11 inline citations for 11 sections, with several
  claim-dense sections carrying none.

### Hardware claims a beginner could not check

| claim | verdict |
|---|---|
| INV 2T, NAND2 4T, NOR2 4T, AND2 6T, OR2 6T, NAND-k/NOR-k 2k | correct |
| NAND2 = NMOS series + PMOS parallel; NOR2 = the reverse | correct |
| XOR ≈ 12T static complementary, 6-8T transmission-gate, "memorize the ranking not the number" | correct and properly hedged; this is the right way to teach a style-dependent number |
| every full adder contains two XORs | correct |
| mirror adder 24T, Cin→Cout crossing one inverting stage | correct (uncited, see N2) |
| "gate-composition versions land nearer 28" | the 28T figure is right but it is the complementary complex-gate adder, not a composition of discrete XOR/AND/OR cells (that is 40T+); see N11 |
| NAND functionally complete via the three given identities | correct — `NAND(A,A)=A'`, `NAND(NAND(A,B),NAND(A,B))=A·B`, `NAND(A',B')=A+B` all verified |
| {AND, OR} not complete because monotone | correct |
| hole mobility 2-3× below electron mobility; PMOS needs 2-3× width | correct |
| series stacking → resistance adds + internal node capacitance → worse-than-linear delay | correct |
| NAND puts the series stack in the strong network — hence NAND-dominant libraries | correct, and the *reason* is stated rather than asserted |
| stacks deeper than 3-4 avoided; practical fan-in limit ~4 | correct |
| no steady-state V_DD→GND path in static CMOS | correct at line 59, **contradicted at line 61** — see B2 |
| wire delay ∝ L², repeater insertion restores linearity | correct (notation nit, N4) |
| interconnect dominating global-net delay since ~250-180 nm | correct |
| FPGA routing delay often the majority of a path; never count LUT levels | correct and important |
| fan-out delay ≈ linear; buffer trees; dedicated FPGA global nets | correct |
| static-1 / static-0 / dynamic hazard taxonomy; dynamic needs ≥3 unequal paths and is a multi-level phenomenon | correct |
| minimization creates hazards; consensus term removes them; synthesis strips it back out | correct, and the irony is worth stating |
| glitches fatal on async logic, async reset, clock nets, latch enables, edge detectors | correct; "never build a clock or an async reset out of combinational logic" is the right absolute rule |
| latch level-sensitive/transparent vs flip-flop edge-triggered; master-slave construction | correct |
| latch inference from incomplete `if`/`case`; fixes; read the synthesis log | correct, and correctly attributed to UG901 |
| latch ≈ half the area, permits time borrowing | correct |
| `t_cd ≤ t_pd`; both are PVT/transition extremes; slow corner for setup, fast for hold | correct |
| hold violations survive any clock slowdown because `T_clk` is absent from the inequality; broken at 1 Hz | correct, and the best-argued page in the chapter |
| skew hurts setup when capture clock is early, hold when late; useful skew trades one for the other | correct |
| jitter random, folded with skew as clock uncertainty | correct |
| metastability unavoidable — no bounded-time sampler for a truly async signal | correct |
| `e^(−t/τ)` resolution; two-flop synchronizer; no logic between stages; single-bit only; third stage at high f | correct, and the multi-bit-bus prohibition is stated as a rule rather than a suggestion |
| biased exponent above a sign-magnitude significand → unsigned compare works for positives | correct, verified |
| `E_a − E_b` is bias-free | correct |
| CV²f "per transition" | dimensionally muddled — see N3 |

### Seed-callout accuracy vs the brief and STATE.md

All six required seeds are present and each names a chapter consistent with the
STATE.md chapter list: carry-lookahead → ch. 9 mantissa adder (line 292); priority
encoder → ch. 9 leading-zero count (line 231); barrel shifter → ch. 8-9 alignment and
normalization (line 364); carry-save → ch. 10 multi-operand (line 347); setup/hold →
ch. 11 pipelining (lines 393, 481); sign-magnitude vs two's complement → ch. 8-9
effective subtraction (line 644). The `always_comb` forward reference to chapter 13
matches STATE.md's "SystemVerilog transition". **PASS** — no seed points at a chapter
that will not cover it.

## What the chapter does well

- **The numbers are right.** I tried to break them and could not. Every equation over
  its full input space, every hex encoding, every timing figure, both K-map covers
  including the exact literal counts. The claim at line 751 that "every numeric and
  bit-level claim above was checked programmatically" is true, which in my experience
  is not what that sentence usually means.
- **It corrected its own source.** The research notes say the minimized SOP has 8
  literals and give a non-minimal don't-care answer; the chapter has 7 and the true
  minimum. Independently confirmed both ways. A writer who re-derives instead of
  transcribing is worth keeping.
- **The K-map example is unusually well chosen.** `B'D'` — a satisfying-looking
  four-corner group that is prime, non-essential and does nothing — is the cleanest
  prime-vs-essential illustration I have seen on a four-variable map, and the chapter
  spends a paragraph on why it earns its place rather than just listing it.
- **Line 165 tells the truth about synthesis.** "Learn K-maps to understand what
  minimization *is*, not to simulate your tool" is exactly the framing the brief's
  persona note demands, and it appears immediately after teaching the technique
  rather than being buried in an appendix.
- **The hold-constraint section is the best page in the chapter.** "Look at what is
  missing: `T_clk` does not appear" followed by "broken at every frequency, including
  1 Hz" is how that should be taught, and it is followed by an actual worked slack
  number rather than an assertion.
- **The pipelining example gives the price, not just the win.** 2.32× not 3×, with the
  arithmetic showing why, and latency going from 2.46 ns to 3.18 ns in the same code
  block. Most texts show the throughput gain and quietly skip the latency cost.
- **`p_i` XOR vs OR is answered rather than asserted.** "Either works — verified, the
  carries come out identical... XOR is chosen because the same signal is reused for
  the sum." I confirmed both variants over all 512 cases. That is the answer a
  student actually asks and rarely gets.
- **The sign-magnitude contrast is set up properly.** Line 621, "Everything you just
  learned about two's complement is about to become actively misleading," followed by
  the 7-bits-vs-1-bit table, is the single most useful paragraph in the chapter for
  where this book is going.
- **Citation hygiene where it matters.** No invented URLs, `[title-only]` sources kept
  link-free under an explicit header, and the two unfetchable vendor sources handled
  honestly — item 19 states outright that the textbook MTBF form was used instead of
  vendor notation.
- **The glitch trap (line 423) refuses the easy simplification.** "'Glitches don't
  matter' is a statement about a *correctly constructed synchronous design*, not a
  property of logic," with five concrete places it is false. That is un-teaching
  avoided rather than deferred.

## Required changes for a 9+

Items 1-2 are mandatory (they are the blocking defects). Items 3-6 are what stands
between "corrected" and "publishable after trivial edits". Items 7-11 are polish.

1. **Replace or delete the full-adder gate diagram** (lines 264-272). It shorts A, B
   and Cin together, shorts `A·B` onto the `A XOR B` node, and shorts `A·B` to Cout
   past the OR. Use the two-half-adders-plus-OR drawing in B1, or drop the picture and
   keep the equations plus the four-line netlist. Do not ship it as is.
2. **Rewrite line 61's "both conduct on the same input condition."** It is false and
   contradicts line 59. Replacement wording is in B2. Fix the same sentence in
   `research/ch01-digital-logic.md` §1 so it does not propagate to another chapter.
3. **Add the two missing lines to the hazard trace** (N1): `t = 2 ns  F falls to 0`
   and `t = 3 ns  F returns to 1`. As printed, the chapter's own "every gate 1 ns"
   premise does not produce the trace it shows, and the checklist at line 709 sends
   the reader to do the trace by hand.
4. **Add inline citations to the five uncited claim-dense sections** (N2): hazards →
   Wakerly Ch. 4; setup/hold/skew/jitter and metastability/MTBF → Harris & Harris
   Ch. 3; two's complement and sign-magnitude → Patterson & Hennessy RISC-V Ch. 2;
   the toolbox blocks → MIT 6.004 Ch. 4 and Mano & Ciletti Ch. 4; the 24T mirror
   adder → Weste & Harris Ch. 11. All five are already in the source list; they just
   need to appear at the point of use. The brief requires it and it is a ten-minute
   edit.
5. **Fix `A > B` to `A ≥ B`** (N6, line 235) and note that strict greater-than needs
   the zero-detect. Chapter 8's operand swap wants the `≥` form anyway, so leaving
   this will cost a correction later.
6. **Fix `CV²f per transition`** (N3, line 59) and **`0.5·R·C·L²` → `0.5·r·c·L²` with
   "per unit length"** (N4, line 379). Both are dimensional errors in one-line claims.
7. Define `g` and `p` in `d = g·h + p`, or cut the formula (N5, line 385). Same for
   `AOI/OAI` (line 71) and `recovery/removal` (line 423) — one clause each.
8. Rewrite the hold/CDC sentence (N7, line 499) so it does not imply hold violations
   are the clock-domain-crossing hazard; that is metastability, which is the next
   subsection.
9. Say the associativity example is a round-to-nearest-**even** tie, not a truncation
   (N8, line 676). Chapter 8 has to teach ties-to-even and this plants the wrong
   mechanism.
10. Give the decoder and encoder subsections an intuition opener (N9), matching the
    mux and carry-save ones.
11. Minor (N11): add "single-stage" to "Every static CMOS gate is inverting"; change
    "gate-composition versions" to "complex-gate versions" at line 274; close the
    two-flop synchronizer boxes; qualify "all 16 input patterns" for the priority
    encoder.

Also settle the bookkeeping question in N10 — either restate the brief in STATE.md as
"no Verilog *listings*" or remove the six inline fragments. The fragments are good
teaching and I would keep them, but STATE.md's rule that every listing must exist and
compile in `guide/src/` currently reads as violated by a chapter that ships no
compilable code at all.

With 1-6 done I would put this at 9. The material, structure and verification
discipline are already there; what is missing is one correct picture, one correct
sentence about CMOS, and citations where the brief asks for them.
