# Chapter 1 Review — Round 2 (post-fix re-review)

**Reviewer persona:** RTL veteran (20 yr datapath design/verification, internal new-hire digital design course)
**Target:** `guide/chapters/ch01.md` (782 lines, 11 sections) after fix round 1
**Round-1 verdict:** `guide/reviews/ch01-review.md` — 7/10, two blocking defects
**Date:** 2026-08-09

<!-- sections complete: 7/7 -->

## Verdict

**Score: 8/10**

Both round-1 blocking defects are genuinely closed: I column-extracted the new full-adder
drawing and it is a correct two-half-adders-plus-OR circuit with closed boxes and no shared
nets, and the CMOS paragraph now says "never conduct at the same time" in agreement with the
paragraph two above it, with no surviving contradiction anywhere in the file. I re-derived
every equation and number in the chapter from scratch — full adder over all 8 rows, both K-map
covers with an independent prime-implicant solve, carry-lookahead against a ripple reference
over all 512 cases, carry-save over 32,768 exhaustive plus 20,000 random triples, all four
IEEE 754 encodings via `struct`, the whole timing budget, both MTBF figures, the rewritten
hazard trace at 1 ps resolution — and found zero wrong values, including in everything the fix
round touched. One real defect survives and it is in new text: the magnitude-comparator
paragraph now says strict `A > B` is the carry-out "ANDed with the zero-detect from the
equality comparator", which computes `A = B`, not `A > B` (32,896 wrong results out of 65,536
at 8 bits), and it ships with a new "(Verified exhaustively at 4, 5 and 8 bits.)" that is false
for the sentence as printed — one clause away from a 9.

## Status of round-1 defects

All line numbers below are the **current** `chapters/ch01.md` (782 lines). The chapter is not
under git (`guide/` is untracked), so I could not diff against the pre-fix text; every status
below is evidence from the current file plus the round-1 report's quoted originals.

### Blocking

| # | Round-1 defect | Status | Evidence |
|---|---|---|---|
| **B1** | Full-adder gate diagram shorts A/B/Cin, shorts `A·B` onto the XOR1 node, and shorts `A·B` past the OR to Cout | **CLOSED** | The gate schematic is gone. Lines 268-283 are a two-half-adders-plus-OR block diagram; lines 287-291 are the netlist. Column audit below: both HA boxes closed (cols 9-24 and 35-50, rows 272-276), OR box closed (cols 25-34, rows 278-280), `Cin` enters HA2's **top** border at col 40, `p` leaves HA1's right wall and enters HA2's left wall, `g` leaves HA1's bottom at col 16 and enters the OR's left wall, `t` leaves HA2's bottom at col 44 and enters the OR's right wall, `Cout` leaves the OR's bottom at col 29. No column carries two nets. The drawn circuit was simulated over all 8 rows against `A+B+Cin`: 0 mismatches. |
| **B2** | "both conduct on the same input condition" is false and contradicts line 59 | **CLOSED** | Line 61 now reads "...they are built to recognize the *same* input condition, but they act on it oppositely and **never conduct at the same time**". I grepped every occurrence of "conduct" in the chapter (lines 33, 35, 45, 51, 57, 61) — all six are mutually consistent and consistent with line 59's "Both networks are never on at once". The research note `research/ch01-digital-logic.md` §1 bullet 3 is also fixed, and carries a dated correction line naming the old wording. Both halves of the round-1 instruction were done. |

### Non-blocking

| # | Round-1 issue | Status | Evidence |
|---|---|---|---|
| **N1** | Hazard trace ignores the OR gate's own delay | **CLOSED** | Lines 434-437 add `t = 2 ns F falls to 0` and `t = 3 ns F returns to 1`, and line 440 explains the displacement. My 1 ps event sim with 1 ns/gate: `A·B` falls at 1.000, `A'` rises at 1.000, `A'·C` rises at 2.000, **F falls at 2.000 and returns at 3.000**, width 1.000 ns. The chapter's trace is now exactly the simulation. |
| **N2** | Half the body sections carry no inline citation | **CLOSED** | Inline citation sites went from 11 to 21. All five sections named in round 1 are now cited at the point of use: toolbox (193, 211, 223), 24T mirror adder (295, Weste & Harris Ch. 11), hazards (418, Wakerly Ch. 4), setup/hold/skew (476, Harris & Harris Ch. 3), metastability/MTBF (532, Harris & Harris Ch. 3 + Weste & Harris Ch. 10), integer encodings (579, Patterson & Hennessy RISC-V Ch. 2). See the attribution check in *Remaining defects* for one over-broad claim at line 193. |
| **N3** | `CV²f` "per transition" confuses energy with power | **CLOSED** | Line 59: "roughly `CV²` of energy per charge/discharge cycle, so `α·C·V²·f` of average power, where `α` is how often the node actually toggles." Dimensionally correct (J vs W) and the activity factor is now named. |
| **N4** | `0.5·R·C·L²` needs per-unit-length symbols | **CLOSED** | Line 400: "`0.5·r·c·L²`, with `r` and `c` the resistance and capacitance **per unit length**", plus the parenthetical "(Write it with the wire's *total* R and C and the length term disappears: `0.5·R·C`.)". That aside is correct and is a better fix than the one round 1 asked for. |
| **N5** | `d = g·h + p` dropped with `g` and `p` undefined; also `AOI/OAI`, `recovery/removal` | **CLOSED** | Line 406 defines electrical effort, logical effort (with values 1, 4/3, 5/3) and parasitic delay. Line 71 expands AOI/OAI to "and-or-invert and or-and-invert ... computing something like `(A·B + C·D)'` in one complementary transistor network". Line 448 defines recovery/removal (see *Remaining defects* for a wording nit on "removal"). |
| **N6** | "`A > B` falls out of the carry-out" is off by the equality case | **PARTIALLY CLOSED** | The `A ≥ B` half is now correct and I verified it exhaustively (0/256, 0/1024, 0/65536 mismatches at 4, 5, 8 bits). The replacement clause for strict `>` is **wrong in a new way** — see *New defects introduced by the fix round*. |
| **N7** | Hold/CDC sentence points at the wrong hazard | **CLOSED** | Line 524 now says "meet it on a phase-shifted or divided clock off the same PLL, or on a source-synchronous interface", and adds "(Between genuinely unrelated clocks the tool does not check hold across the boundary at all; that boundary has a different problem, and it is the next subsection.)" Exactly right. |
| **N8** | Associativity example is a rounding tie, not truncation | **CLOSED** | Line 706 now says "hits an exact **tie** twice — `2^-24` is precisely half an ULP of 1.0 ... round-to-nearest-**even** breaks both ties downward, because 1.0's last significand bit is 0". Verified: `2^-24` is exactly half the gap `0x3F800001 − 0x3F800000`; low significand bit of 1.0 is 0, of the neighbour is 1. |
| **N9** | Decoder / encoder subsections open with a definition, not intuition | **CLOSED** | Line 215 "The decoder turns a **number into a place**"; line 219 "The encoder runs the decoder backwards — it turns a **place back into a number** — and the priority encoder additionally **settles arguments**". |
| **N10** | Brief says no Verilog, six fragments appear; `guide/src/` empty | **STILL OPEN** | All six fragments are still present (lines 71, 315, 472, 585, 634, 690), `guide/src/` is still empty, and STATE.md's rule ("Every Verilog listing embedded in a chapter must first exist as a real file in `guide/src/`") is unchanged. This is the bookkeeping decision round 1 flagged; nobody made it. |
| **N11a** | "Every static CMOS gate is inverting" needs "single-stage" | **CLOSED** | Line 61: "Every single-stage static CMOS gate is inverting." |
| **N11b** | "Gate-composition versions land nearer 28" | **CLOSED** | Line 295: "Complex-gate versions land nearer 28; building it out of discrete XOR, AND and OR cells as drawn above costs considerably more than either." The discrete-cell cost is 2×12 + 2×6 + 6 = **42 T**, so "considerably more than either" is right. |
| **N11c** | Two-flop synchronizer boxes have no top border | **CLOSED** | Line 550 supplies `┌──────┐` over both flops; both boxes are closed on all four sides (cols 14-21 and 32-39, rows 550-554). The clock line lands exactly on both `▲` arrows (cols 17 and 35). |
| **N11d** | Priority encoder "Verified against all 16 input patterns" needs qualifying | **CLOSED** | Line 231 now separates the 15 asserted patterns from the all-zero pattern and says explicitly that `Y` is a don't-care there, gated by `valid`. |

## New defects introduced by the fix round

### R1 — The new strict-`A > B` clause computes equality, not greater-than (line 237)

> ...for unsigned operands `A ≥ B` falls straight out of the carry-out of `A − B` — that is, of
> `A + ~B + 1`. Note the boundary: the carry-out is 1 on equality too, so strict `A > B` is that
> carry-out **ANDed with the zero-detect** from the equality comparator you just built.
> (Verified exhaustively at 4, 5 and 8 bits.)

The equality comparator built two sentences earlier is "XOR the bits pairwise, then NOR the
results" — its output is **1 when A = B**. So the circuit the sentence describes is

```
cout AND EQ  =  (A ≥ B) AND (A = B)  =  (A = B)
```

which is an equality comparator, not a greater-than. The correct expression is `cout AND NOT
EQ` (equivalently, carry-out AND "the difference is nonzero"). Exhaustive check:

| width | `cout == (A ≥ B)` | `cout AND EQ == (A > B)` | `cout AND NOT EQ == (A > B)` |
|---|---|---|---|
| 4 bit | 0 / 256 mismatches | **136 / 256 mismatches** | 0 / 256 |
| 5 bit | 0 / 1024 | **528 / 1024** | 0 / 1024 |
| 8 bit | 0 / 65536 | **32896 / 65536** | 0 / 65536 |

Two things make this worse than a typo. First, the sentence immediately before it correctly
warns "the carry-out is 1 on equality too", so the reader has been primed to expect the
equality case to be *removed* and is then handed the operation that keeps only that case — the
wrong polarity is exactly the trap being warned about. Second, the fix round attached a **new**
verification claim, "(Verified exhaustively at 4, 5 and 8 bits)", to a paragraph containing a
statement that fails at all three widths. That sentence did not exist before the fix round, and
in a book whose closing line is "Every numeric and bit-level claim above was checked
programmatically", a false verification assertion costs more than the error it decorates.

Fix (one word): "...so strict `A > B` is that carry-out ANDed with the **complement** of the
zero-detect from the equality comparator you just built." Or, avoiding the polarity question
entirely: "...is that carry-out AND `A ≠ B`."

### R2 — The toolbox source line over-claims its two sources (line 193)

> Every block here has a standard textbook treatment: MIT 6.004 *Computation Structures*, Ch. 4
> *Combinational Logic*, and Mano & Ciletti, *Digital Design*, 6th ed., Ch. 4, **which are the
> sources for the equations given**.

The mux, decoder, encoder, priority encoder, comparator and half/full adder equations do belong
to those two chapters — that attribution is sound, and the research notes independently name
Mano Ch. 4 as the source of the priority-encoder equations. But the section also contains the
carry-save 3:2 equations, the `X + Y + Z = S + 2C` invariant, the block-`(G, P)` construction
and the barrel-shifter sizing, none of which are in MIT 6.004 Ch. 4 or Mano Ch. 4; the chapter's
own research notes attribute those to Weste & Harris Ch. 10-11 and to Wallace/Dadda. The
blanket "which are the sources for the equations given" therefore attributes material to two
sources that do not contain it. Narrow it to "which are the sources for the selector and adder
equations below", and the sentence is fine.

**Nothing else regressed.** Specifically checked and clean: no `[title-only]` source acquired a
URL (the chapter still contains exactly four URLs — lines 472, 653, 755-758 — all four
pointing at the research notes' `[verified]` sources: IEEE 754-2019, MIT 6.004 c4, MIT 6.004
c5, Vivado UG901); no duplicated prose (I diffed every sentence over 40 characters outside code
fences — the only repeat is the shared prefix of source-list items 2 and 3, which is correct);
markdown is intact (76 fences = 38 balanced blocks, no unbalanced `**`, three well-formed
tables, no `_TODO_` left, section marker `11/11` matches the 11 `##` headings); no orphaned
sentence refers to a diagram that no longer looks like that (line 295's "as drawn above" and
line 285's "so the whole thing is five gates" both match the new drawing — XOR, AND, XOR, AND,
OR is five gates); and every "Seed for chapter N" callout still points at a chapter STATE.md
says will cover it.

## Remaining defects

Ordered by how much damage a reader takes.

1. **Strict `A > B` is described as `cout AND zero-detect` (line 237).** Real defect; carried
   over from the fix round. Full evidence under **R1** above. This is the only item in the
   chapter that would make a reader build the wrong circuit.

2. **Over-broad source attribution at line 193.** See **R2**. A citation attached to equations
   its source does not contain is the failure mode this project's own citation policy exists to
   prevent.

3. **"the last section told you why that is unbuildable" (line 339) points nowhere useful.**
   The fan-in argument ("The practical limit is about four") is at line 404, in the *next*
   major section, `Nothing Is Instantaneous`. The nearest thing that does support the claim is
   line 83, "stacks deeper than three or four inputs are avoided", two sections back. As
   printed the reader is sent to `The Algebra of True and False`, which says nothing about
   fan-in. Round 1 did not flag this, and I cannot prove whether the fix round moved anything
   here, so I record it as origin-unknown. Fix: "and the transistor section told you why".

4. **"removal" is defined only half-correctly (line 448).** "**recovery** and **removal** are
   setup and hold for an asynchronous reset, the minimum times its *release* must clear the
   next clock edge by". That is a correct description of recovery; removal is the minimum time
   the release must be held *after* the edge, not "clear the next edge by". One clause: "the
   minimum times its *release* must precede, and then follow, a clock edge."

5. **N10 is still open, and STATE.md was not updated by the fix round.** Six Verilog fragments
   remain (lines 71, 315, 472, 585, 634, 690), `guide/src/` is empty, and STATE.md still shows
   chapter 01 as `Review score 7 (r1)` / `Status fix-round-1` / "2 blocking defects", with a run
   log whose last entry predates the fix. Somebody has to either restate the rule as "no
   Verilog *listings*" or delete the fragments, and the run log needs the fix round recorded.
   Bookkeeping, not a technical fault in the prose.

6. **Cosmetic: the 4-bit `5 − 3` worked addition is one column out of alignment (lines
   608-612).** Operand digits occupy columns 3-6; the result digits `0010` occupy columns 4-7,
   because the space in `1 0010` that separates the discarded carry-out pushes the four sum
   bits right. A reader adding the columns by eye finds the LSBs do not line up. Either drop
   the separating space and label the carry with an arrow, or indent the operands by one.

**Explicitly re-checked and clean** (these were the plausible places for a fix-round
regression, and none of them regressed): the CMOS energy/power sentence; the Elmore wire-delay
expression and its total-R-C aside; the logical-effort trio 1 / 4⁄3 / 5⁄3 and the "about 3 to
4" stage effort; the rewritten hazard trace; the `A ≥ B` carry-out claim; the round-to-even
associativity example; every hex constant; the whole timing budget and both MTBF figures; all
nine drawings.

## Diagram audit

**Method.** I did not trust the fix agent's audit and did not eyeball anything. A script split
`ch01.md` into its 38 fenced blocks (`extract_blocks.py`, 76 fences → 38 balanced blocks) and
wrote each to `scratchpad/blocks/bNN.txt`; a second script (`colaudit.py`) printed, for every
character column of every block, the list of `(row, character)` pairs that occupy it. A net is
"electrically joined" to another when a continuous run of drawing characters shares a column
across consecutive rows. Every drawing below was audited that way, plus the two column-aligned
numeric layouts and the bit-field listing, which have the same failure mode.

| # | Location | Depicts | Verdict |
|---|---|---|---|
| 1 | 42-54 | CMOS inverter, 2 transistors | **PASS** — a single continuous spine at col 13 runs V_DD(42) → `+`(44) → PMOS(45) → `+`(46) → output node `+`(48) → `+`(50) → NMOS(51) → `+`(52) → GND(54); no second net touches col 13. Gate terminals are separate stubs ending at col 10 on rows 45 and 51; the PMOS stub carries the inversion bubble `o` at col 9 and the NMOS stub does not, matching "PMOS conducts when A = 0". Output `Y = A'` leaves the shared node at col 13 row 48 through cols 14-17. |
| 2 | 133-137 | 4-variable K-map, Gray order | **PASS** — five `|` separators at cols 9/15/21/27/33 on all four rows, cell glyphs at cols 12/18/24/30 on all four rows, column headers at 10/18/24/30. Every cell sits under its own header. Contents verified cell-by-cell against Σm(0,1,2,5,6,7,8,9,10,14) — see verification log. |
| 3 | 174-178 | Same map with `d(3, 11)` | **PASS** — identical column geometry; the two `d` glyphs land at col 24 in rows AB=00 and AB=10, i.e. cells m3 and m11. Correct. |
| 4 | 200-206 | 2:1 multiplexer | **PASS** — box closed on all four sides (`┌`col14-`┐`col22 at row 200, walls at cols 14 and 22 rows 201-203, `└`-`┘` at row 204). D0 and D1 arrive on separate rows (201, 203) at col 13 and never share a column. Y leaves the right wall on row 202 only. The select stub is a single `┬`(204,col18) → `│`(205) → `S`(206) with nothing else in col 18 below the box. Round 1 called this diagram PASS; the redraw is cleaner and is still correct. |
| 5 | 269-282 | Full adder = 2 half adders + OR **(the round-1 blocking defect)** | **PASS** — HA1 box cols 9-24 rows 272-276 closed; HA2 box cols 35-50 rows 272-276 closed; OR box cols 25-34 rows 278-280 closed. Nets: A(row 273) and B(row 275) enter HA1's left wall on different rows; `p` leaves HA1's right wall (row 274) and enters HA2's left wall, label `p` sitting on the wire at col 28; `Cin` descends col 40 rows 270-271 into HA2's **top** border; `g` leaves HA1's bottom at col 16, runs down rows 277-278 and right along row 279 into the OR's left wall; `t` leaves HA2's bottom at col 44, runs down and left along row 279 into the OR's right wall; `Cout` leaves the OR's bottom at col 29. **No column carries two different nets**, and the two vertical drops (cols 16 and 44) miss the OR box's column span (25-34) entirely. Simulated over all 8 input rows: matches `A+B+Cin`. |
| 6 | 288-290 | Full-adder netlist | **PASS** — `p = XOR(A,B)`, `g = AND(A,B)`, `S = XOR(p,Cin)`, `t = AND(p,Cin)`, `Cout = OR(g,t)`; five gates, matching the drawing and the text's "five gates". Verified over 8 rows. |
| 7 | 302-308 | 4-bit ripple-carry adder | **PASS** — four `+---+` boxes at cols 2-6, 13-17, 24-28, 35-39, each closed top and bottom with `|` walls. Operand drops land on the top border (a_i at cols 3/14/25/36, b_i at 5/16/27/38), sum drops leave the bottom border (cols 4/15/26/37). Carry wires run right-to-left between the right wall of FA_{i+1} and the left wall of FA_i, and the labels sit over the correct wire: `c1` (cols 30-31) labels the wire from FA0 to FA1, `c2` FA1→FA2, `c3` FA2→FA3 — i.e. FA_i emits c_{i+1}, which is right. `c0` enters FA0's right wall at col 39. |
| 8 | 375-380 | 32-bit barrel shifter, amount = 5 | **PASS** — stage brackets occupy cols 9-28, 34-53, 59-78; the three annotation pairs occupy cols 14-27, 38-51, 62-75, each wholly inside its own stage's span, so no caption straddles two stages. Content correct: 5 = 0b101 → stage 0 shifts 1, stage 1 passes, stage 2 shifts 4, total 5, and "total: 5" (cols 62-69) sits under the last stage. |
| 9 | 427-437 | Static-1 hazard timing trace | **PASS** — this is the fix-round rewrite. Every event matches my 1 ps simulation exactly (see verification log). |
| 10 | 461-467 | Master-slave flip-flop | **PASS** — both latch boxes closed (cols 8-20 and 29-41, rows 461-464). D enters M's left wall at row 462, M's output leaves its right wall on row 462 and enters S's left wall, Q leaves S's right wall. Enables `en = clk'` and `en = clk` are inside their own boxes and share no column with a wire. The prose's clk-low / clk-high table matches. |
| 11 | 550-558 | Two-flop synchronizer **(fix-round redraw)** | **PASS** — both boxes now closed on all four sides (cols 14-21 and 32-39, rows 550-554); round 1's missing top border is supplied. The clock net is one connected run: `┬`(556,col26) → `│`(557) → `dest_clk`, with horizontals reaching `└`(556,col17) and `┘`(556,col35), and cols 17 and 35 rise through row 555 to the `▲` clock arrows at row 554 — **both arrows are hit exactly, no off-by-one**. The data path FF1→FF2 occupies row 551 only; the "no logic here!" caption sits in rows 552-553 and touches no wire column. |
| 12 | 608-612 | 4-bit `5 − 3` worked addition | **PASS electrically, FAIL on alignment** — the operands `0101`, `1100` and the `+1` carry-in all sit in cols 3-6 (LSB col 6), but the result `0010` sits in cols 4-7 (LSB col 7) because the space in `1 0010` that isolates the discarded carry-out shifts the sum right by one. The arithmetic is right; the columns of a columnar addition do not line up. Cosmetic, listed as remaining defect 6. |
| 13 | 658-662 | IEEE 754 binary32 bit fields | **PASS** — all four sign/exponent/fraction strings match `struct` output character for character (1 + 8 + 23 = 32 bits, fields separated by single spaces, all four rows using identical column offsets). |

No diagram in the chapter fails an electrical audit. That is a change from round 1, where the
full adder failed on four counts.

## Verification log

Every result below was re-derived with `python3` 3.13.7 **from the chapter's stated premises
only**. I did not reuse round 1's answers, the research notes' answers, or the chapter's own
claimed results as inputs. Scripts in the session scratchpad: `extract_blocks.py`,
`colaudit.py`, `dup.py`, `v1_fa_kmap.py`, `v2_cla.py`, `v3_num.py`, `v4_timing.py`,
`v5_hazard.py`.

### Full adder (lines 245-293)

| check | result |
|---|---|
| chapter's 8 truth-table rows vs `A+B+Cin` | 0 mismatches / 8 |
| `S = A XOR B XOR Cin` | 0 / 8 |
| `Cout = A·B + A·Cin + B·Cin` | 0 / 8 |
| `Cout = A·B + (A XOR B)·Cin` | 0 / 8 |
| `Cout = A·B + (A + B)·Cin` | 0 / 8 |
| the three Cout forms mutually equal | identical on all 8 |
| netlist `p=XOR(A,B)`, `g=AND(A,B)`, `S=XOR(p,Cin)`, `t=AND(p,Cin)`, `Cout=OR(g,t)` | 0 / 8 vs `A+B+Cin` |
| line 266's claim "`g` and `t` cannot be 1 at once" | true on all 8 rows; OR and XOR of the two carries are therefore identical |
| line 285's "the whole thing is five gates" | XOR, AND, XOR, AND, OR = 5 |
| half adder `S = A XOR B`, `Cout = A·B` | 0 / 4 |
| line 295 "discrete cells cost considerably more than 24T/28T" | 2×XOR(12) + 2×AND(6) + OR(6) = **42 T** — claim holds |

### K-map, no don't-cares (lines 110-165)

- `Σm(0,1,2,5,6,7,8,9,10,14)` ∪ `ΠM(3,4,11,12,13,15)` = {0..15}, disjoint — **PASS**.
- Chapter truth table (lines 119-128) reproduces exactly that minterm set — **PASS**.
- Chapter K-map grid (133-137) correct cell by cell in Gray order: AB=00 `1 1 0 1`, AB=01
  `0 1 1 1`, AB=11 `0 0 0 1`, AB=10 `1 1 0 1` — **PASS**.
- Independent Quine-McCluskey PI enumeration: exactly six primes — `A'BC{6,7}`, `A'BD{5,7}`,
  `A'C'D{1,5}`, `B'C'{0,1,8,9}`, `B'D'{0,2,8,10}`, `CD'{2,6,10,14}` — identical to the
  chapter's list at lines 145-150, same cover sets. **PASS**.
- Essential PIs: exactly `{B'C', CD'}` (m9 only in `B'C'`, m14 only in `CD'`) — **PASS**;
  `B'D'` is prime and non-essential, confirming line 161. Essentials cover
  {0,1,2,6,8,9,10,14}, leaving {5,7}, covered by `A'BD` — matches line 153 exactly.
- Exhaustive minimum-cover search over all subsets of the six primes: **one** 3-term solution,
  `A'BD + B'C' + CD'`, **7 literals**; no 2-term cover exists. Chapter's `F = B'C' + CD' + A'BD`,
  "3 terms, 7 literals" — **PASS**.
- Canonical SOP = 10 minterms × 4 literals = **40 literals** — **PASS** (line 159).

### K-map with `d(3, 11)` (lines 171-187)

- PI set becomes four: `B'{0,1,2,3,8,9,10,11}`, `CD'{2,6,10,14}`, `A'D{1,3,5,7}`,
  `A'C{2,3,6,7}` — confirms line 181's claim that the `B'` half-map becomes legal and that
  `A'BD{5,7}` grows to `A'D{1,3,5,7}`.
- Exhaustive minimum cover: one 3-term solution, `A'D + B' + CD'`, **5 literals**. Chapter's
  `F = B' + CD' + A'D`, "3 terms, 5 literals" — **PASS**.
- Evaluated against the original F on the **14** care combinations: 0 mismatches (line 187's
  "all fourteen" = 16 − 2 — **PASS**). Both don't-care cells are driven to 1.

### Carry-lookahead (lines 321-347) — exhaustive over all 512 cases

Reference: an independently written 4-bit ripple chain, itself cross-checked against Python
integer `a + b + c0` (0 mismatches / 512).

| check | mismatches / 512 |
|---|---|
| `c1 = g0 + p0·c0` … `c4 = g3 + p3·g2 + p3·p2·g1 + p3·p2·p1·g0 + p3·p2·p1·p0·c0` | **0** |
| same four equations with `p_i = a_i OR b_i` (line 337's "either works") | **0** |
| `s_i = p_i XOR c_i` reproduces the true sum bits | **0** |
| `G = g3 + p3·g2 + p3·p2·g1 + p3·p2·p1·g0`, `P = p3·p2·p1·p0`, `c4 = G + P·c0` | **0** |

Fan-in claim (line 339): flat 32-bit `c32` expands to **33** product terms → a 33-input OR, and
the widest AND term `p31…p0·c0` has **33** inputs. **PASS**.

### Carry-save / 3:2 compressor (lines 355-366)

`S_i = X_i^Y_i^Z_i`, `C_i = maj(X_i,Y_i,Z_i)`, invariant `X + Y + Z = S + 2C`:
**exhaustive over all 32,768 5-bit triples — 0 mismatches**; 20,000 random 8-bit triples
(seed 1) — **0 mismatches**. These are bit-for-bit the full-adder equations verified above, so
line 366's "n full adders side by side" is exact.

### Priority encoder (lines 225-231)

`valid = D3+D2+D1+D0`, `Y1 = D3+D2`, `Y0 = D3 + D2'·D1` vs "index of the highest set bit" over
all 16 patterns: **0 mismatches on the 15 asserted patterns**; all-zero gives `Y = 00`,
`valid = 0`. Matches the chapter's now-qualified sentence exactly. **PASS**.

### Magnitude comparator (line 237) — the one failure

| claim as printed | 4-bit | 5-bit | 8-bit |
|---|---|---|---|
| carry-out of `A + ~B + 1` equals `A ≥ B` | **0 / 256** | **0 / 1024** | **0 / 65536** |
| "strict `A > B` is that carry-out **ANDed with the zero-detect**" | **136 / 256 wrong** | **528 / 1024 wrong** | **32896 / 65536 wrong** |
| carry-out AND **NOT** zero-detect equals `A > B` | 0 / 256 | 0 / 1024 | 0 / 65536 |

The `≥` half of the fix is correct at every width; the strict-`>` clause is wrong at every
width. See **R1**.

### Two's complement (lines 587-634)

| check | result |
|---|---|
| `+5 = 00000101` → `~` → `11111010` → `+1` → `11111011` = −5 | **PASS** |
| weight expansion `−128+64+32+16+8+2+1 = −5` (set bits 7,6,5,4,3,1,0) | **PASS** |
| 4-bit `5 − 3`: `~3 = 1100`, `0101 + 1100 + 1 = 1 0010`, low nibble `0010` = 2 | **PASS** |
| overflow = (carry into MSB) XOR (carry out of MSB), **all 256 4-bit pairs × both carry-ins** vs true signed arithmetic | **0 mismatches** |
| equivalent form "same-signed operands → opposite-signed result", all 256 pairs | **0 mismatches** |
| INT_MIN `10000000` → `~` → `01111111` → `+1` → `10000000` (unchanged) | **PASS** |
| ranges: 4-bit −8..+7, 8-bit −128..+127 | **PASS** |
| sign extension `1011` → `11111011` = −5; zero-extend → `00001011` = **+11** | **PASS** |
| sign-magnitude `+5 = 0x05`, `−5 = 0x85`, two zeros, range −127..+127 | **PASS** |
| Hamming distance +5 vs −5: two's complement **7**, sign-magnitude **1** | **PASS** (lines 645, 669-672) |

### IEEE 754 binary32 via `struct` (lines 653-682, 701-706)

| value | computed | chapter | bit string |
|---|---|---|---|
| `+5.0` | `0x40A00000` | `0x40A00000` | `0 10000001 01000000000000000000000` — exact match |
| `−5.0` | `0xC0A00000` | `0xC0A00000` | exact match |
| `+0.15625` | `0x3E200000` | `0x3E200000` | exact match |
| `−0.15625` | `0xBE200000` | `0xBE200000` | exact match |

Decode of `+5.0`: biased exponent **129**, real exponent **2**, fraction `0x200000` = 2097152,
significand `1 + 2097152/2²³` = **1.25**, `1.25 × 2² = 5.0` — every number in line 665 **PASS**.
Each ± pair differs in exactly **1** bit. Unsigned ordering: 6000 distinct positive binary32
values sorted by float value are also sorted as unsigned ints — **True**; the same test on 2500
negative values — **False**, as the chapter says. Non-associativity:
`(1.0 + 2^-24) + 2^-24 = 1.0 = 0x3F800000`; `1.0 + (2^-24 + 2^-24) = 0x3F800001`, printing as
`1.00000012`. The tie claim: `2^-24` is *exactly* half the gap between `0x3F800000` and
`0x3F800001` — **True**; last significand bit of 1.0 is **0**, of the neighbour **1**, so
ties-to-even rounds down twice. Line 706's rewritten explanation is correct.

### Timing (lines 480-524)

| check | computed | chapter |
|---|---|---|
| `0.15 + 2.10 + 0.09 + 0.12` | 2.4600 ns | 2.46 ns **PASS** |
| `f_max = 1/2.46 ns` | 406.5041 MHz | 406.5 MHz **PASS** |
| slack at T=2.00 / 2.50 / 3.00 ns | −0.4600 / +0.0400 / +0.5400 ns | −0.46 / +0.04 / +0.54 **PASS** |
| flop + skew overhead | 0.3600 ns | 0.36 **PASS** |
| 3 stages: `0.15+0.70+0.09+0.12` | 1.0600 ns | 1.06 **PASS** |
| pipelined f_max | 943.3962 MHz | 943 MHz **PASS** |
| speedup `2.46/1.06` | 2.32075× | 2.32× **PASS** |
| pipelined latency `3 × 1.06` | 3.1800 ns | 3.18 ns **PASS** |
| hold: LHS `0.06+0.00`, RHS `0.04+0.12`, slack | 0.06 / 0.16 / **−0.10 ns** | same **PASS** |
| `T_clk` absent from the hold inequality | confirmed by inspection of line 511 | **PASS** |
| 24-bit RCA, 2 gate delays/stage, 50 ps/gate | 48 delays, 2.4 ns | 48, 2.4 ns **PASS** |
| 32-bit barrel shifter `log₂32 × 32` | 5 × 32 = 160 | 160, depth 5 **PASS** |
| 8:1 mux depth; 6-LUT = 64:1 mux | 3; 2⁶ = 64 | **PASS** |

### MTBF (lines 534-547)

τ = 100 ps, T_w = 50 ps, f_clk = 500 MHz (T_clk = 2.00 ns), f_data = 10 MHz, t_setup = 0.10 ns,
`MTBF = e^(t_r/τ) / (T_w·f_clk·f_data)`:

| synchronizer | t_r | computed | chapter |
|---|---|---|---|
| two-flop, `T_clk − t_setup` | 1.90 ns | **713.9 s = 11.9 min** | ~7.1e2 s, "12 minutes" **PASS** |
| three-flop, `2·T_clk − t_setup` | 3.90 ns | **3.464e11 s = 10,980 yr** | ~3.5e11 s, "~11,000 years" **PASS** |
| ratio | — | **4.852e8** | "about 5×10⁸" **PASS** |
| per-stage multiplier `e^(T_clk/τ)` | — | **4.852e8** | "roughly e^(T_clk/τ)" **PASS** |

"halving `f_data` buys a factor of 2" — correct, MTBF ∝ 1/f_data.

### Hazard trace (lines 426-440) — the fix-round rewrite, re-simulated

Event sim from t = −2 ns to +6 ns at 1 ps resolution, every gate 1 ns, `F = A·B + A'·C`,
B = C = 1, A falls at t = 0:

```
   t = 0.000  A    1 -> 0
   t = 1.000  A'   0 -> 1
   t = 1.000  A·B  1 -> 0
   t = 2.000  A'·C 0 -> 1
   t = 2.000  F    1 -> 0
   t = 3.000  F    0 -> 1
   both AND outputs low over [1.000, 2.000] ns ; F low over [2.000, 3.000] ns, width 1.000 ns
```

Every line of the chapter's trace, including the two lines the fix round added and line 440's
"the glitch you would actually see on F is over [2, 3] ns", matches this exactly. With the
consensus term `B·C` added: **no transitions on F at all** — line 442's fix works as claimed.

### Formulas the fix round touched

| expression | verdict |
|---|---|
| `CV²` energy per charge/discharge cycle | correct — the supply delivers CV² over a full 0→1→0 cycle |
| `α·C·V²·f` average power, `α` = toggle activity | correct and dimensionally consistent (J vs W); the round-1 energy/power confusion is gone |
| Elmore `0.5·r·c·L²` with `r`, `c` per unit length | correct — `R_tot·C_tot/2 = (rL)(cL)/2` |
| the aside "with totals it is `0.5·R·C` and the `L²` disappears" | correct |
| logical effort: inverter **1**, NAND2 **4/3**, NOR2 **5/3** | correct — from the standard 2:1 P:N inverter template, NAND2 presents 4 units per input and NOR2 5 units, against the inverter's 3 |
| "optimal per-stage effort of about 3 to 4" | correct (e ≈ 2.72 with zero parasitics, ≈ 3.6-4 in practice) |
| `d = g·h + p`, `h = C_out/C_in` | correct, and all three symbols are now defined |

### Citations and structure

- **21 inline citation sites** in the body (round 1 counted 11), so ~10 were added. Attribution
  spot-checked against the research notes and standard record: MIT 6.004 Ch. 4 §Multiplexers →
  mux tree depth (the notes' verified fetch confirms that section exists); Mano & Ciletti Ch. 4
  → priority-encoder equations (the notes name it as exactly that source); Weste & Harris Ch. 11
  → 24T mirror adder (notes: Ch. 10-11); Wakerly Ch. 4 → hazard taxonomy and consensus-term cure
  (notes: Ch. 4 is hazards); Harris & Harris Ch. 3 → setup/hold/aperture/t_pcq/t_ccq and MTBF
  (notes: Ch. 3 is exactly this); Weste & Harris Ch. 10 → metastability (notes: Ch. 10-11);
  Patterson & Hennessy RISC-V Ch. 2 → two's complement, overflow, sign extension (notes: Ch. 2 is
  exactly this). All plausible **except** the blanket clause at line 193 — see **R2**.
- **No `[title-only]` source acquired a URL.** `grep http` returns exactly four URLs (lines 472,
  653, 755-758) and all four are the research notes' `[verified]` sources: IEEE 754-2019, MIT
  6.004 c4, MIT 6.004 c5, Vivado UG901. The source list still segregates items 5-22 under "By
  title (no link asserted)". **PASS** — this was the run's known failure mode and it held.
- **Structure:** 76 code fences → 38 balanced blocks; 11 `##` sections matching the `11/11`
  marker; no unbalanced `**`; three well-formed tables; no `_TODO_` residue; no trailing
  whitespace. Sentence-level duplicate scan over all non-fenced text >40 characters: the only
  repeat is the shared prefix of source-list items 2 and 3, which is correct.
- **Process note:** `guide/` is untracked in git, so there is no pre-fix revision to diff
  against; and `STATE.md` still records chapter 01 as `7 (r1)` / `fix-round-1` / "2 blocking
  defects", with no run-log entry for the fix round.

## Required changes for a 9+

Item 1 is mandatory and is the whole distance between 8 and 9. Items 2-3 are what I would want
before calling it publishable-after-trivial-edits. Items 4-6 are polish and bookkeeping.

1. **Fix the strict `A > B` clause (line 237).** Change "ANDed with the zero-detect from the
   equality comparator you just built" to "ANDed with the **complement** of the zero-detect from
   the equality comparator you just built" — or, cleaner, "is that carry-out AND `A ≠ B`". Then
   re-run the check behind "(Verified exhaustively at 4, 5 and 8 bits.)" so that sentence is
   true: as printed the claim fails on 136/256, 528/1024 and 32896/65536 operand pairs. Chapter 8
   needs the `≥` form for the operand swap and will need `>` somewhere too, so this cannot be
   left to be discovered later.

2. **Narrow the toolbox attribution (line 193).** "which are the sources for the equations
   given" is too wide: MIT 6.004 Ch. 4 and Mano & Ciletti Ch. 4 do not contain the carry-save
   3:2 equations, the `X + Y + Z = S + 2C` invariant, the block-`(G, P)` construction or the
   barrel-shifter sizing. Either scope the clause ("...for the selector and adder equations
   below") or add Weste & Harris Ch. 10-11 alongside, which is what the research notes actually
   support.

3. **Repair the cross-reference at line 339.** "the last section told you why that is
   unbuildable" points at `The Algebra of True and False`, which says nothing about fan-in; the
   fan-in limit is at line 404, in the section *after* this one, and the supporting stack-depth
   argument is at line 83, two sections back. Write "the transistor section told you why" and
   the forward/backward references line up.

4. **Finish the removal definition (line 448).** "the minimum times its *release* must clear the
   next clock edge by" describes recovery only. Say "the minimum times its *release* must
   precede, and then follow, a clock edge."

5. **Align the worked `5 − 3` addition (lines 608-612).** Operand LSBs are in column 6, the
   result's LSB in column 7. Indent the three operand rows by one column, or drop the space in
   `1 0010` and mark the carry-out with an arrow instead.

6. **Close the bookkeeping.** (a) Settle round-1's N10: either restate STATE.md's rule as "every
   Verilog *listing*" — the six inline fragments at lines 71, 315, 472, 585, 634, 690 are good
   teaching and I would keep them — or remove them; as it stands the rule reads as violated by a
   chapter that ships no compilable code and an empty `guide/src/`. (b) Update STATE.md: chapter
   01 still shows `Review score 7 (r1)`, `Status fix-round-1` and "2 blocking defects", and the
   run log has no entry for the fix round at all. (c) Consider putting `guide/` under version
   control — with no revision history, a re-reviewer cannot diff a fix round and has to re-audit
   the entire chapter to find collateral damage, which is most of the cost of this review.

With item 1 alone this is a 9. The material, the structure, the diagrams and the arithmetic are
all there; what is left is one inverted signal polarity.
