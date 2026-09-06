# Chapter 1 Review — Round 3 (post-fix-round-2 re-review)

**Reviewer persona:** RTL veteran (20 yr datapath design/verification, internal new-hire digital design course)
**Target:** `guide/chapters/ch01.md` (786 lines, 11 sections, 38 fenced blocks) after fix round 2
**Round-1 verdict:** `guide/reviews/ch01-review.md` — 7/10, two blocking defects
**Round-2 verdict:** `guide/reviews/ch01-review-r2.md` — 8/10, one fix-round regression
**Date:** 2026-08-09

<!-- sections complete: 7/7 -->

## Verdict

**Score: 9/10**

The comparator regression is genuinely and completely closed: I re-derived all five relations
myself, exhaustively at 4, 5 and 8 bits against Python's own operators, and the paragraph as
printed — carry-out equals `A ≥ B`, strict `A > B` is that carry-out ANDed with the *complement*
of the zero-detect, `A < B` is the inverted carry-out, `A ≤ B` is that inverted carry-out OR the
zero-detect — is correct at every width with zero mismatches, and its restated verification note
even gets the operand-pair counts right (256, 1,024, 65,536). I re-derived every remaining number
and equation in the chapter from scratch and re-extracted every drawing to character columns
without trusting a single prior audit: full adder, both K-map covers with an independent
prime-implicant solve, carry-lookahead against a ripple reference over all 512 cases, block G/P,
carry-save, priority encoder, two's complement including INT_MIN and the overflow rule, every
IEEE 754 hex via `struct`, the whole timing budget, both MTBF figures, logical effort, the
`CV²`/`α·C·V²·f`/`0.5·r·c·L²` expressions and the hazard trace at 1 ps resolution — zero wrong
values, and the realigned `5 − 3` block now puts operand and sum LSBs in the same column 7 as
claimed. What keeps it off 10 is small and entirely in fix-round text: the replacement source line
at 197 re-points carry-save, block-lookahead and barrel-shifter material at "Weste & Harris
Ch. 10-11" when Ch. 10 is *Sequential Circuit Design* and contains none of it — a one-chapter-wide
repeat of the very over-attribution it was written to fix — and the new Verilog callout at line 33
presents six fragments as the chapter's inventory of Verilog when thirteen distinct notations
actually appear, and mis-describes one of its own six items.

## Status of round-2 defects

Line numbers below are the **current** `chapters/ch01.md` (786 lines; it was 782 at round 2, so
every round-2 line number has drifted by up to +4). `guide/` is still untracked in git, so there
is again no pre-fix revision to diff against and every status is evidence from the current file
plus the round-2 report's quoted originals.

| # | Round-2 defect | Status | Evidence |
|---|---|---|---|
| **1** | Strict `A > B` described as `cout AND zero-detect`, which computes `A = B`; shipped with a false "(Verified exhaustively at 4, 5 and 8 bits.)" | **CLOSED** | Line 241 now reads "Strict `A > B` is that carry-out ANDed with the **complement** of the zero-detect from the equality comparator you just built — carry-out set *and* the difference nonzero", and adds "`A < B` is the carry-out inverted, and `A ≤ B` is that inverted carry-out OR the zero-detect". I built the zero-detect the way the chapter builds it (pairwise XOR then NOR, so 1 on equality) and checked all five relations against Python's `>=`, `>`, `<`, `<=` and `==`: **0 mismatches at 4 bits (256 pairs), 0 at 5 bits (1,024), 0 at 8 bits (65,536)**. For contrast I re-ran the round-2 wording: 136/256, 528/1024, 32896/65536 wrong — so the regression was real and is now gone. The chapter's own glosses are mutually consistent too: "complement of the zero-detect" and "the difference nonzero" are the same signal, and substituting `(s & mask) != 0` for `NOT eq` also gives 0 mismatches at all three widths. |
| **2** | Toolbox source line over-claimed its two sources ("which are the sources for the equations given") | **CLOSED, with a new smaller defect inside the replacement** | Line 197 now scopes the two sources to "the selector equations and the half- and full-adder equations below" — defensible: MIT 6.004 Ch. 4 covers muxes/decoders, Mano & Ciletti Ch. 4 covers decoders, encoders, priority encoders, muxes, adders and comparators, and the priority-encoder equations already carry their own inline Mano citation at line 227. The over-claim is gone. But the replacement clause that re-points the rest introduces **N1** below. |
| **3** | "the last section told you why that is unbuildable" pointed at *The Algebra of True and False* | **CLOSED** | Line 343 now reads "and \"From Transistors to Gates\" told you why that is unbuildable — series stacks deeper than three or four inputs are already avoided." The named section is at line 35 and its line 87 says "hence stacks deeper than three or four inputs are avoided". The reference and the argument it points at now match exactly. |
| **4** | "removal" defined only half-correctly | **CLOSED** | Line 452: "recovery is the minimum time its *release* must **precede** the next clock edge, removal the minimum time that release must **follow** the previous one". Both halves are now right — recovery is release-to-next-edge, removal is edge-to-release (the reset must stay asserted past the edge by at least that much). The surrounding claim, that a release inside either window leaves the flop metastable exactly as a late data input would, is also correct. |
| **5** | N10 still open: six Verilog fragments vs STATE.md's "every Verilog listing must exist in `guide/src/`"; STATE.md not updated | **PARTIALLY CLOSED** | Chapter side is closed the right way: the new callout at line 33 states outright that the chapter "contains no Verilog listing — nothing here is to be typed, compiled or simulated", which I confirmed by extracting all 38 fenced blocks — not one is Verilog. With no listings, STATE.md's rule is not violated and needs no rewrite. Bookkeeping side is **still open**: `guide/src/` is still empty (fine), but STATE.md's chapter-01 row still carries "r2 found a fix-round regression: strict `A > B` described as carry-out AND zero-detect ... must be AND NOT zero-detect" as an *open* concern when it is now fixed, and the run log's last entry is still "Chapter 1 written" — no entry for review r1, fix round 1, review r2 or fix round 2. |
| **6** | Worked `5 − 3` addition one column out of alignment | **CLOSED** | Column-extracted block at lines 612-616: `0101` at cols 4-7, `1100` at cols 4-7, the `+1` carry-in at col 7, the rule at cols 1-7, and the sum `0010` at **cols 4-7**. Operand and sum LSBs now share column 7 exactly as the fix round claims. The discarded carry-out sits at col 2 with a deliberate blank at col 3, which is the standard way to set it apart and does not disturb the four aligned bit columns. |

**Round-1 defects re-spot-checked and still closed:** the full-adder drawing (re-audited from
scratch below, still a correct two-half-adders-plus-OR circuit), the CMOS "never conduct at the
same time" sentence at line 65 (all six occurrences of "conduct" in the chapter are mutually
consistent), the hazard trace, the `CV²`/`α·C·V²·f` split, `0.5·r·c·L²`, the logical-effort trio,
the two-flop synchronizer's top borders, and the priority-encoder qualification.

## New defects introduced by fix round 2

Three, all in text the fix round wrote, none of them capable of making a reader build wrong
hardware. Ordered by how much a copy editor at a technical press would care.

### N1 — The replacement attribution re-points datapath material at a sequential-circuits chapter (line 197)

> The carry-save, block-lookahead and barrel-shifter material later in the section is not in those
> two chapters; for that, see Weste & Harris, *CMOS VLSI Design*, 4th ed., **Ch. 10-11**, together
> with the primary papers cited at the point of use.

Carry-save adders, block generate/propagate and barrel/funnel shifters are all in **Ch. 11,
*Datapath Subsystems***. Ch. 10 is ***Sequential Circuit Design*** and contains none of that
material. The chapter itself demonstrates that it knows this: line 299 cites "Weste & Harris ...
Ch. 11" for the 24-transistor mirror adder (datapath), and line 536 cites "Weste & Harris ...
Ch. 10" for metastability and the resolution time constant (sequential). So the sentence written
to *cure* an over-broad attribution ships a smaller over-broad attribution of exactly the same
kind — half of the named range does not contain the material. The blanket range appears to have
been copied from the source-list entry at line 767 ("Ch. 1-2, 4, 6, 10-11"), which is a
whole-chapter coverage list and is correct as such; it just cannot be reused as a point-of-use
citation.

**Fix (one token):** "see Weste & Harris, *CMOS VLSI Design*, 4th ed., **Ch. 11**".

### N2 — The Verilog callout under-inventories the chapter and mis-describes one of its own six items (line 33)

> What does appear, a handful of times, is a one-line fragment used as a **teaser**:
> `assign y = a & b;`, `assign sum = a + b;`, `always @(*)`, `{cout, sum} = a + b;`, `$signed()`
> with `{{4{x[3]}}, x}`, `always @(posedge clk)`. ... Each marks a place where the notation quietly
> contradicts the hardware fact on that page.

Two problems, both in the new callout.

**(a) The list reads as an inventory and is not one.** I extracted every inline code span outside
the fenced blocks. The six named fragments are all present and land where the callout implies —
`assign y = a & b;` at 75, `assign sum = a + b;` at 319, `always @(*)` at 476 and 694,
`{cout, sum} = a + b;` at 589, `$signed()` and `{{4{x[3]}}, x}` at 638, `always @(posedge clk)` at
694 and 751. But the chapter also puts these Verilog notations in code spans, none of them listed:
`reg [7:0]` (638), `always_comb` (476), `if` / `else` / `case` / `default` (476, 698), `for` and
`<=` (694), `initial` and `#delay` (716), `x` as a value (193, 716), and bare `assign` (751).
Thirteen distinct notations, six advertised. A reader who takes the callout literally will hit
`reg [7:0]` and `initial` and conclude the promise was not kept.

**(b) The blanket claim is false for item 5.** At line 638 the notation that "quietly contradicts
the hardware fact on that page" is `reg [7:0]` being unsigned by default — and that is the item
*not* in the list. `$signed()` and `{{4{x[3]}}, x}`, the two that *are* listed, are introduced
there as "the two cures". So one of the six items is the remedy, not the contradiction, and the
sentence describing all six does not describe it.

**Fix:** either widen the sentence ("a one-line fragment or a bare keyword, used as a teaser —
`assign`, `always @(*)`, `always @(posedge clk)`, `reg [7:0]`, `$signed()`, `always_comb` and a few
others") or soften "Each marks" to "Most mark a place where the notation quietly contradicts the
hardware fact on that page; a couple show the cure."

### N3 — The new callout's "never as instructions to follow" is in tension with line 476 (minor)

The callout closes "Read them as previews of a trap you are being warned about, never as
instructions to follow." Line 476 then ends its latch trap with four imperative Verilog
instructions — "default-assign every output at the top of the block, always write `else` and
`default`, use `always_comb` (chapter 13), and **read the synthesis log**". The *fragment* there is
not an instruction, so the callout is not strictly contradicted, but a reader who has just been
told they are not expected to understand any of this yet is handed a coding rulebook eleven pages
later. One clause ("when you get to chapter 3, the fixes are ...") would remove the friction. I
record it as a nit rather than a defect.

**Everything else the fix round touched is clean.** Specifically re-checked and regression-free:
the comparator paragraph reads consistently with the equality comparator two sentences above it
and with "the comparator falls out of this same hardware" at line 619; the narrowed line-197
attribution does not orphan the priority-encoder citation at 227 or the mux citation at 215; the
line-343 cross-reference resolves forwards and backwards; the recovery/removal clause does not
contradict the setup/hold definitions at 480; the realigned `5 − 3` block still agrees with the
surrounding prose ("carry-out discarded -> 0010 = +2"); the Verilog callout does not contradict the
Bridge to Chapter 2 at 751. Markdown is intact — 76 fences forming 38 balanced blocks, 11 `##`
headings matching the `11/11` marker, 22 `###` headings, no unbalanced `**` or backticks outside
fences, three well-formed tables (31 rows), no `_TODO_` residue, no trailing whitespace. A
sentence-level duplicate scan over all non-fenced text longer than 40 characters found exactly one
repeat, the shared prefix of source-list items 2 and 3, which is correct. Exactly six URLs on six
lines, all pointing at the four `[verified]` sources (IEEE 754-2019, MIT 6.004 c4, MIT 6.004 c5,
Vivado UG901) — no `[title-only]` source acquired a link. All nine "Seed for chapter N" callouts
still name a chapter STATE.md says will cover the material.

## Remaining defects

Five, ordered by how much damage a reader takes. Nothing on this list would cause a reader to
build wrong hardware or write down a wrong number.

1. **Weste & Harris "Ch. 10-11" at line 197 should be Ch. 11.** New this round; full evidence
   under **N1**. This is the only item I would insist on before print, because it is a citation
   pointing at material its target does not contain, which is the failure mode this project's
   citation policy exists to prevent — and because it is a one-token edit.

2. **The Verilog callout at line 33 over-promises and mis-describes item 5.** New this round; full
   evidence under **N2**. Two-clause edit.

3. **The research notes still carry the original comparator error, and it will propagate.**
   `research/ch01-digital-logic.md` line 52 still reads "Greater-than looks serial ... and that
   recurrence *is* a carry chain: **A > B falls out of the carry-out of A - B**." That is the exact
   claim the chapter has now had corrected twice, in two separate fix rounds. The same file, line 8,
   also still says "dynamic power = CV²f", the energy/power conflation fixed in the chapter as
   round-1 N3. The notes are the durable artifact the chapter-8 and chapter-9 writers will read —
   chapter 8 needs the `≥` form for the operand swap and will need `>` for the equal-magnitude zero
   case. When round 1 required the CMOS sentence be fixed in the notes as well as the chapter it was
   done properly, with a dated correction line still visible at line 9; the same treatment is owed
   here. **This is the highest-value remaining action in the whole run** even though it is not a
   defect in the chapter.

4. **Line 694's "every `always @(posedge clk)` block samples the *old* values" is true only under
   the convention stated in the same sentence.** With blocking `=` in a clocked block, file order
   very much does matter. The clause immediately before it does establish "`<=` in clocked blocks,
   `=` in combinational ones, never mixed", so in context it is defensible, and it is pre-existing
   text that neither earlier round flagged. I record it as a wording nit, not a defect: "and with
   `<=`, every `always @(posedge clk)` block samples the *old* values" removes the ambiguity.

5. **STATE.md is still behind the work.** The chapter-01 row shows `7 (r1) → 8 (r2)` and status
   `fix-round-2`, but its Open concerns cell still describes the strict-`A > B` regression as
   outstanding when I have verified it closed, and the run log's newest entry is still "Chapter 1
   written" — no entry for review r1, fix round 1, review r2 or fix round 2. Also: `guide/` remains
   untracked in git, so this is the second consecutive re-review that had to re-audit the entire
   chapter from scratch to find collateral damage, because there is no revision to diff. Putting
   `guide/` under version control would cut the cost of every remaining chapter's review round.

**Explicitly re-checked this round and clean** — these were the plausible sites for fix-round-2
collateral damage, and none of them regressed: the CMOS energy/power sentence; the Elmore
expression and its total-R-C aside; the logical-effort trio and the "about 3 to 4" stage effort;
the hazard trace and its consensus-term cure; the K-map covers and both literal counts; every hex
constant; the ties-to-even associativity example; the whole timing budget; both MTBF figures; all
thirteen drawings; all seventeen inline verification notes.

## Diagram audit

**Method.** I trusted no prior audit and eyeballed nothing. `extract_blocks.py` split `ch01.md`
into its 38 fenced blocks (76 fences, balanced) and wrote each to `scratchpad/blocks/bNN.txt`;
`colaudit.py` then printed, for every character column of a block, every run of consecutive rows
occupying that column and the characters in it. A net is "electrically joined" to another when a
continuous run of drawing characters shares a column across consecutive rows. Thirteen drawings
plus eight column-aligned numeric layouts were audited that way.

| # | Location | Depicts | Verdict |
|---|---|---|---|
| 1 | 46-58 | CMOS inverter, 2 transistors | **PASS** — one continuous spine at col 13 from V_DD (46) through `+`(48), the PMOS body (49), `+`(50), the output node `+`(52), `+`(54), the NMOS body (55), `+`(56) to GND (58); no second net enters col 13. Gate stubs are separate, both ending at col 10; the PMOS stub carries the inversion bubble `o` at col 9 and the NMOS stub carries a plain `-`, matching the annotations "conducts when A = 0" and "conducts when A = 1". `Y = A'` leaves the shared node at row 52 through cols 14-17. |
| 2 | 137-141 | 4-variable K-map, Gray order | **PASS** — separators `\|` at cols 9/15/21/27/33 on all four data rows, cell glyphs at cols 12/18/24/30 on all four, each cell inside the field its header names. Contents verified cell by cell against Σm(0,1,2,5,6,7,8,9,10,14): AB=00 `1 1 0 1`, AB=01 `0 1 1 1`, AB=11 `0 0 0 1`, AB=10 `1 1 0 1`. The minterm annotations in cols 37-53 are one field per row and straddle nothing. |
| 3 | 178-182 | Same map with `d(3, 11)` | **PASS** — identical column geometry to #2; the two `d` glyphs land at col 24 in rows AB=00 and AB=10, which decode to m3 and m11. Correct. |
| 4 | 204-210 | 2:1 multiplexer | **PASS** — box closed on all four sides (cols 14-22, rows 204-208). D0 and D1 arrive on separate rows (205, 207), never sharing a column. Y leaves the right wall on row 206 only. The select stub is a single run `┬`(208, col 18) → `│`(209) → `S`(210), and nothing else occupies col 18 below the box. |
| 5 | 273-286 | Full adder = 2 half adders + OR (the round-1 blocking defect) | **PASS** — HA1 box cols 9-24 rows 276-280 closed; HA2 box cols 35-50 rows 276-280 closed; OR box cols 25-34 rows 282-284 closed. A (row 277) and B (row 279) enter HA1's left wall on different rows. `p` leaves HA1's right wall on row 278, runs cols 25-33 with its label at col 28, and enters HA2's left wall at col 35. `Cin` descends col 40 (rows 273-275) into HA2's **top** border. `g` leaves HA1's bottom at col 16, drops rows 281-282, turns at `└`(283, col 16) and runs right into the OR's left wall. `t` leaves HA2's bottom at col 44, drops, turns at `┘`(283, col 44) and runs left into the OR's right wall. `Cout` leaves the OR's bottom at col 29. **No column carries two different nets**, and both vertical drops (cols 16 and 44) sit outside the OR box's span (25-34). Simulated over all 8 input rows against `A+B+Cin`: 0 mismatches. |
| 6 | 292-294 | Full-adder netlist | **PASS** — `p=XOR(A,B)`, `g=AND(A,B)`, `S=XOR(p,Cin)`, `t=AND(p,Cin)`, `Cout=OR(g,t)`. Five gates, matching the drawing and the text's "five gates". Verified over all 8 rows; `g` and `t` are never both 1, so the OR is legitimate. |
| 7 | 306-312 | 4-bit ripple-carry adder | **PASS** — four boxes at cols 2-6, 13-17, 24-28, 35-39, each closed top and bottom with `\|` walls. `a_i` drops land on the top border at cols 3/14/25/36 and `b_i` at cols 5/16/27/38; sums leave the bottom at cols 4/15/26/37. Carries run right-to-left from FA_{i+1}'s left wall to FA_i's right wall, and each label sits over the correct wire: `c3` (cols 8-9) on the FA2→FA3 wire, `c2` (19-20) on FA1→FA2, `c1` (30-31) on FA0→FA1 — i.e. FA_i emits c_{i+1}. `c0` enters FA0's right wall at col 39. |
| 8 | 379-384 | 32-bit barrel shifter, amount = 5 | **PASS** — stage brackets at cols 9-28, 34-53, 59-78; the annotation pairs at cols 14-27, 38-51, 62-76, each wholly inside its own stage's span, so no caption straddles two stages. Content correct: 5 = 0b101 → stage 0 shifts 1, stage 1 passes, stage 2 shifts 4, and "total: 5" (cols 62-69) sits under the last stage. 1 + 4 = 5. |
| 9 | 431-441 | Static-1 hazard timing trace | **PASS** — reproduced exactly by my own 1 ps event simulation with every gate at 1 ns (see verification log). Both the AND-crossover window [1, 2] ns and the observed F glitch [2, 3] ns are right, and the two lines that carry the OR delay are present. |
| 10 | 465-471 | Master-slave flip-flop | **PASS** — both latch boxes closed (cols 8-20 and 29-41, rows 465-468). D enters M's left wall on row 466, M's output leaves its right wall on the same row and enters S's left wall, Q leaves S's right wall. The `en = clk'` / `en = clk` labels sit inside their own boxes and touch no wire column. The clk-low / clk-high prose below is consistent with the enable polarities drawn. |
| 11 | 554-562 | Two-flop synchronizer | **PASS** — both boxes closed on all four sides (cols 14-21 and 32-39, rows 554-558). The clock net is one connected run: `┬`(560, col 26) → `│`(561) → the `t` of `dest_clk`(562), with horizontals reaching `└`(560, col 17) and `┘`(560, col 35), and cols 17 and 35 rising through row 559 to the `▲` clock arrows on both bottom borders at row 558 — **both arrows hit exactly**. The FF1→FF2 data path occupies row 555 only; the "no logic here!" caption sits in rows 556-557 and touches no wire column. |
| 12 | 612-616 | 4-bit `5 − 3` worked addition **(the block the fix round moved)** | **PASS** — this is the round-2 alignment failure and it is fixed. `0101` at cols 4-7, `1100` at cols 4-7, the `+1` carry-in at col 7, the rule `───────` at cols 1-7, and the sum `0010` at **cols 4-7**. All four bit columns line up and both LSBs are in column 7. The discarded carry-out `1` sits at col 2 with a deliberate blank at col 3, which separates it from the sum without disturbing the aligned columns. Arithmetic re-derived: `~3 = 1100`, `0101 + 1100 + 1 = 1 0010`, low nibble `0010` = 2. |
| 13 | 662-666 | IEEE 754 binary32 bit fields | **PASS** — all four rows use identical offsets: sign at col 14, exponent at cols 16-23, fraction at cols 25-47, hex at cols 52-61. Every field matches `struct` output character for character (1 + 8 + 23 = 32 bits). |

**Column-aligned numeric layouts** (same failure mode, audited the same way): setup budget 491-496
— `=` at col 14 on all five value rows, rule 30 chars, **PASS**; latency/throughput 504-505 — `=`
at col 31 on both, **PASS**; hold slack 523-525 — `=` at cols 6 and 20 on both LHS/RHS rows,
**PASS**; MTBF 547-548 — `=` at cols 31 and 52 on both, **PASS**; 8-bit negation 602-604 — bit
strings at cols 9-16 on all three rows, **PASS**; INT_MIN 624-626 — cols 9-16 on all three,
**PASS**; sign extension 634-635 — both 8-bit results at cols 36-43 with their annotations at
col 46, **PASS**; sign-magnitude 645-646 — both magnitudes at cols 9-15, **PASS**.

**No diagram or numeric layout in the chapter fails, electrically or on alignment.** That is a
change from round 2, where the `5 − 3` block failed on alignment, and from round 1, where the full
adder failed on four electrical counts.

## Verification log

Everything below was re-derived with `python3` 3.13.7 **from the chapter's stated premises only**.
I did not reuse round 1's or round 2's answers, the research notes' answers, or the chapter's own
claimed results as inputs. Scripts in the session scratchpad: `extract_blocks.py`, `colaudit.py`,
`show.py`, `v_comparator.py`, `v_logic.py`, `v_arith.py`, `v_timing.py`, `v_struct.py`.

### Magnitude comparator (line 241) — the item under review

Zero-detect built the way the chapter builds it: pairwise XOR of A and B, then NOR, so the signal
is 1 on equality. Confirmed that construction equals `A == B` at every width (0 mismatches).
Carry-out taken from `A + ((~B) & mask) + 1`.

| relation, exactly as printed | 4-bit (256 pairs) | 5-bit (1,024) | 8-bit (65,536) |
|---|---|---|---|
| carry-out `== (A ≥ B)` | **0** | **0** | **0** |
| `cout AND NOT zero-detect == (A > B)` | **0** | **0** | **0** |
| `cout AND (difference ≠ 0) == (A > B)` (the chapter's second gloss) | **0** | **0** | **0** |
| `NOT cout == (A < B)` | **0** | **0** | **0** |
| `NOT cout OR zero-detect == (A ≤ B)` | **0** | **0** | **0** |
| *(control)* round-2's `cout AND zero-detect == (A > B)` | 136 wrong | 528 wrong | 32,896 wrong |

All five relations pass at all three widths. The chapter's parenthetical — "All five relations were
checked exhaustively against ordinary integer comparison at 4, 5 and 8 bits — 256, 1,024 and 65,536
operand pairs, zero mismatches" — is **accurate, not aspirational**, including the three operand-pair
counts, which are exactly (2⁴)², (2⁵)² and (2⁸)². Both of the chapter's glosses for the same signal
("complement of the zero-detect" and "the difference nonzero") were tested separately and are
equivalent.

### Full adder (lines 247-299)

| check | result |
|---|---|
| chapter's 8 truth-table rows vs `A+B+Cin` | 0 mismatches / 8 |
| `S = A XOR B XOR Cin` | 0 / 8 |
| `Cout = A·B + A·Cin + B·Cin` | 0 / 8 |
| `Cout = A·B + (A XOR B)·Cin` | 0 / 8 |
| `Cout = A·B + (A + B)·Cin` | 0 / 8 |
| netlist `p=XOR(A,B)`, `g=AND(A,B)`, `S=XOR(p,Cin)`, `t=AND(p,Cin)`, `Cout=OR(g,t)` vs `A+B+Cin` | 0 / 8 |
| line 270's "`g` and `t` cannot be 1 at once" | true on all 8 rows |
| half adder `S = A XOR B`, `Cout = A·B` | 0 / 4 |
| line 289's "the whole thing is five gates" | XOR, AND, XOR, AND, OR = 5 |
| line 299's "discrete cells cost considerably more than either" | 2×XOR(12) + 2×AND(6) + OR(6) = **42 T** vs 24 T / 28 T — holds |

### K-map, no don't-cares (lines 117-163)

- `Σm(0,1,2,5,6,7,8,9,10,14)` and `ΠM(3,4,11,12,13,15)` are disjoint and cover {0..15} — **PASS**.
- Chapter truth table (123-132) reproduces exactly that minterm set — **PASS**.
- Chapter K-map grid (137-141) correct cell by cell in Gray order — **PASS**.
- Independent prime-implicant enumeration (all 81 fixed/value implicant candidates, keep the
  maximal ones): exactly six — `A'BC{6,7}`, `A'BD{5,7}`, `A'C'D{1,5}`, `B'C'{0,1,8,9}`,
  `B'D'{0,2,8,10}`, `CD'{2,6,10,14}` — identical to lines 149-154 with identical cover sets.
- Essentials: exactly `{B'C', CD'}` (m9 only in `B'C'`, m14 only in `CD'`); `B'D'` is prime and
  non-essential, confirming line 165. Essentials cover {0,1,2,6,8,9,10,14}, leaving {5,7}.
- Exhaustive minimum-cover search over all subsets of the six primes: **one** 3-term solution,
  `A'BD + B'C' + CD'`, **7 literals**; no 2-term cover exists. Chapter's "3 terms, 7 literals" — **PASS**.
- `F = B'C' + CD' + A'BD` on all 16 inputs: 0 mismatches (line 163's "Verified against all 16 input
  combinations" — backed).
- Canonical SOP = 10 minterms × 4 literals = **40** — **PASS** (line 163).

### K-map with `d(3, 11)` (lines 175-191)

- PI set becomes four: `B'{0,1,2,3,8,9,10,11}`, `CD'{2,6,10,14}`, `A'D{1,3,5,7}`, `A'C{2,3,6,7}` —
  confirms line 185's claim that the `B'` half-map becomes legal and that `A'BD{5,7}` grows to
  `A'D{1,3,5,7}`.
- Exhaustive minimum cover: one 3-term solution, `B' + A'D + CD'`, **5 literals**. Chapter's
  "3 terms, 5 literals" — **PASS**.
- Evaluated against the original F on the **14** care combinations: 0 mismatches, so line 191's
  "all fourteen care combinations" (16 − 2) is backed. Both don't-care cells are driven to 1.

### Priority encoder (lines 230-235)

`valid = D3+D2+D1+D0`, `Y1 = D3+D2`, `Y0 = D3 + D2'·D1` vs "index of the highest set bit" over all
16 patterns: **0 mismatches on the 15 asserted patterns**; the all-zero pattern gives `Y = 00`,
`valid = 0`. Line 235's qualified sentence is exactly right — **PASS**.

### Carry-lookahead (lines 326-353) — exhaustive over all 512 cases

Reference: an independently written 4-bit ripple chain, itself cross-checked against Python integer
`a + b + c0` (0 mismatches / 512).

| check | mismatches / 512 |
|---|---|
| `c1 = g0 + p0·c0` … `c4 = g3 + p3·g2 + p3·p2·g1 + p3·p2·p1·g0 + p3·p2·p1·p0·c0` | **0** |
| the same four equations with `p_i = a_i OR b_i` (line 341's "either works") | **0** |
| `s_i = p_i XOR c_i` reproduces the true sum bits | **0** |
| `G = g3 + p3·g2 + p3·p2·g1 + p3·p2·p1·g0`, `P = p3·p2·p1·p0`, `c4 = G + P·c0` | **0** |

Fan-in claim (line 343): a flat 32-bit `c32` expands to **33** product terms, so a 33-input OR, and
the widest AND term `p31…p0·c0` has **33** inputs — **PASS**.

### Carry-save / 3:2 compressor (lines 360-370)

`S_i = X_i^Y_i^Z_i`, `C_i = maj(X_i,Y_i,Z_i)`, invariant `X + Y + Z = S + 2C`: **exhaustive over
all 32,768 5-bit triples — 0 mismatches**; **20,000 random 8-bit triples (seed 1) — 0 mismatches**,
which is precisely the check line 370 claims. These are bit-for-bit the full-adder equations above,
so "n full adders side by side" is exact rather than analogy.

### Two's complement (lines 596-649)

| check | result |
|---|---|
| `+5 = 00000101` → `~` → `11111010` → `+1` → `11111011` | **PASS** |
| weight expansion `−128+64+32+16+8+2+1 = −5` | **PASS** |
| 4-bit `5 − 3`: `~3 = 1100`, `0101 + 1100 + 1 = 1 0010`, low nibble = 2 | **PASS** |
| overflow = (carry into MSB) XOR (carry out of MSB), **all 256 4-bit pairs × both carry-ins** vs true signed arithmetic | **0 mismatches** |
| equivalent form "same-signed operands → opposite-signed result", all 256 pairs | **0 mismatches** |
| INT_MIN `10000000` → `~` → `01111111` → `+1` → `10000000` (unchanged) | **PASS** |
| ranges 4-bit −8..+7, 8-bit −128..+127 | **PASS** |
| sign extension `1011` → `11111011` = −5; zero-extend → `00001011` = **+11** | **PASS** |
| sign-magnitude `+5 = 0x05`, `−5 = 0x85`, two zeros, range −127..+127 | **PASS** |
| Hamming distance +5 vs −5: two's complement **7**, sign-magnitude **1** | **PASS** (lines 649, 673-676) |

### IEEE 754 binary32 via `struct` (lines 662-666, 686, 706-707)

| value | computed | chapter |
|---|---|---|
| `+5.0` | `0x40A00000` = `0 10000001 01000000000000000000000` | exact match |
| `−5.0` | `0xC0A00000` | exact match |
| `+0.15625` | `0x3E200000` = `0 01111100 01000000000000000000000` | exact match |
| `−0.15625` | `0xBE200000` | exact match |

Decode of `+5.0`: biased exponent **129**, real exponent **2**, fraction `0x200000` = **2097152**,
significand `1 + 2097152/2²³` = **1.25**, `1.25 × 2² = 5.0` — every number in line 669 **PASS**.
Each ± pair differs in exactly **1** bit. Unsigned ordering: 6000 distinct positive binary32 values
sorted by float value are also sorted as unsigned ints — **True** (line 686 claims 5000; the
property holds for all positive finite binary32, so the chapter's figure is a floor, not a
distortion); the same test on 2500 negative values — **False**, as the chapter says.
Non-associativity: `(1.0 + 2^-24) + 2^-24 = 1.0 = 0x3F800000`; `1.0 + (2^-24 + 2^-24) =
0x3F800001`, printing as `1.00000012` — both hex values and the printed decimal **PASS**. The tie
claim: the gap `0x3F800001 − 0x3F800000` is `1.1920928955078125e-07` and `2^-24` is
`5.960464477539063e-08`, **exactly half** — **PASS**; last significand bit of 1.0 is **0**, of the
neighbour **1**, so ties-to-even rounds down twice — line 710's explanation is correct. `2^-23` is
representable as the last bit of 1.0 — **PASS**.

### Timing (lines 485-528)

| check | computed | chapter |
|---|---|---|
| `0.15 + 2.10 + 0.09 + 0.12` | 2.4600 ns | 2.46 **PASS** |
| `f_max = 1/2.46 ns` | 406.5041 MHz | 406.5 **PASS** |
| slack at T = 2.00 / 2.50 / 3.00 ns | −0.4600 / +0.0400 / +0.5400 | −0.46 / +0.04 / +0.54 **PASS** |
| flop + skew overhead | 0.3600 ns | 0.36 **PASS** |
| 3 stages: `0.15 + 0.70 + 0.09 + 0.12` (and 2.10/3 = 0.70 exactly) | 1.0600 ns | 1.06 **PASS** |
| pipelined f_max | 943.3962 MHz | 943 **PASS** |
| speedup `2.46/1.06` | 2.32075× | 2.32× **PASS** |
| pipelined latency `3 × 1.06` | 3.1800 ns | 3.18 **PASS** |
| hold: LHS `0.06+0.00`, RHS `0.04+0.12`, slack | 0.06 / 0.16 / **−0.10 ns** | same **PASS** |
| "at least 0.10 ns of *added* delay" | 0.16 − 0.06 = 0.10 | **PASS** |
| `T_clk` absent from the hold inequality | confirmed by inspection of line 515 | **PASS** |
| 24-bit RCA, 2 gate delays/stage, 50 ps/gate | 48 delays, 2.4 ns | 48, 2.4 **PASS** |
| 32-bit barrel shifter `log₂32 × 32` | 5 × 32 = 160, depth 5 | **PASS** |
| 8:1 mux depth 3; 6-LUT = 2⁶ = 64:1 mux | 3; 64 | **PASS** |
| barrel-shifter example 5 = 0b101 → 1 + 4 | 5 | **PASS** |

### MTBF (lines 539-551)

τ = 100 ps, T_w = 50 ps, f_clk = 500 MHz (T_clk = 2.00 ns), f_data = 10 MHz, t_setup = 0.10 ns,
`MTBF = e^(t_r/τ) / (T_w·f_clk·f_data)`:

| synchronizer | t_r | computed | chapter |
|---|---|---|---|
| two-flop, `T_clk − t_setup` | 1.90 ns | **713.9 s = 11.9 min** | ~7.1e2 s, "12 minutes" **PASS** |
| three-flop, `2·T_clk − t_setup` | 3.90 ns | **3.464e11 s = 10,976 yr** | ~3.5e11 s, "~11,000 years" **PASS** |
| ratio | — | **4.852e8** | "about 5×10⁸" **PASS** |
| per-stage multiplier `e^(T_clk/τ)` | — | **4.852e8** | "roughly `e^(T_clk/τ)`" **PASS** |

"halving `f_data` buys a factor of 2" — correct, MTBF ∝ 1/f_data.

### Hazard trace (lines 431-441) — re-simulated at 1 ps

Event simulation from t = −2 ns to +6 ns, every gate 1 ns, `F = A·B + A'·C`, B = C = 1, A falls at
t = 0:

```
   t = 0.000  A     1 -> 0
   t = 1.000  A'    0 -> 1
   t = 1.000  A·B   1 -> 0
   t = 2.000  A'·C  0 -> 1
   t = 2.000  F     1 -> 0
   t = 3.000  F     0 -> 1
```

Every line of the chapter's trace matches, including line 436's "between t = 1 ns and t = 2 ns ->
both OR inputs are 0" and line 444's "the glitch you would actually see on F is over [2, 3] ns".
With the consensus term `B·C` added: **zero transitions on F** — line 446's cure works as claimed.

### Physics and effort expressions

| expression | verdict |
|---|---|
| `CV²` energy per charge/discharge cycle, `α·C·V²·f` average power | correct and dimensionally consistent (J vs W); activity factor named |
| Elmore `0.5·r·c·L²` with `r`, `c` per unit length | correct — `R_tot·C_tot/2 = (rL)(cL)/2`; the aside that totals give `0.5·R·C` with no `L²` is algebraically exact |
| logical effort: inverter **1**, NAND2 **4/3**, NOR2 **5/3** | correct from the 2:1 P:N inverter template — input cap 3, 4 and 5 units respectively, normalised by 3 |
| "optimal per-stage effort of about 3 to 4" | correct (e ≈ 2.718 with zero parasitics, ≈ 3.6-4 in practice) |
| `d = g·h + p`, `h = C_out/C_in` | correct, all three symbols defined at the point of use |
| transistor counts INV 2 / NAND2 4 / NOR2 4 / AND2 6 / OR2 6 / NAND-k 2k | internally consistent between lines 69-73 and the checklist at line 732 |

### Verification notes — every parenthetical audited

Seventeen inline verification claims appear in the chapter (lines 163, 191, 235, 241, 260, 297,
339, 341, 353, 370, 583, 599, 609, 619, 659, 686, 703) plus the closing assertion at line 785. Each
one is backed by a check reproduced above. Two deserve a note, and both survive it: line 370's
"Verified over 20,000 random 8-bit triples" is honestly labelled as a random check and I reproduced
it (0/20,000) plus an exhaustive 5-bit sweep the chapter does not claim; line 686's "verified over
5000 sorted positive values" is a sampling claim for a property that in fact holds for all positive
finite binary32, so it understates rather than overstates. **No verification note in the chapter is
unbacked or overstated**, and line 785's "Every numeric and bit-level claim above was checked
programmatically" is, as far as I can break it, true.

### Structure and citations

- 786 lines; 76 fences → **38 balanced blocks**; 11 `##` headings matching the `11/11` marker;
  22 `###` headings; no unbalanced `**` or backticks outside fences; three well-formed tables
  (31 rows); no `_TODO_` residue; no trailing whitespace.
- Sentence-level duplicate scan over all non-fenced text longer than 40 characters: one repeat, the
  shared prefix of source-list items 2 and 3 — correct.
- Six URLs on lines 476, 657, 759, 760, 761, 762, resolving to four distinct targets, all of them
  the research notes' `[verified]` sources. **No `[title-only]` source acquired a link.**
- Point-of-use citations spot-checked for plausibility: MIT 6.004 Ch. 4 §Multiplexers → mux tree
  depth; Mano & Ciletti Ch. 4 → priority-encoder equations; Weste & Harris Ch. 11 → 24T mirror
  adder; Weste & Harris Ch. 6 → interconnect; Weste & Harris Ch. 10 → metastability; Wakerly Ch. 4
  → hazard taxonomy; Harris & Harris Ch. 3 → setup/hold/aperture and MTBF; Patterson & Hennessy
  RISC-V Ch. 2 → integer encodings; Muller et al. Ch. 3 → signed-zero-by-rounding-mode. All sound
  **except** the Ch. 10-11 range at line 197 — see **N1**.
- Nine "Seed for chapter N" callouts, each naming a chapter STATE.md says will cover the material.
- Verilog inventory: 38 fenced blocks, **none of them Verilog** — the callout's "contains no
  Verilog listing" is true. Thirteen distinct Verilog notations appear as inline code spans; six
  are named in the callout — see **N2**.

## Sign-off

**This chapter is fit to ship as chapter 1 of the guide.** Every number, equation, bit pattern and
diagram in it is correct — I re-derived all of them from the chapter's own premises without reusing
any earlier round's answers, and found no wrong value and no miswired drawing. There is no longer
anything in the text that would cause a reader to build the wrong circuit, compute the wrong
number, or carry a false belief into chapter 8. The two blocking defects from round 1 remain
closed, the comparator regression from round 2 is closed and its verification note is now truthful,
and the six-item punch list from round 2 is five-and-a-half done.

**Shortest path to a clean 10**, in order, roughly ten minutes of editing:

1. **Line 197:** change "Weste & Harris, *CMOS VLSI Design*, 4th ed., Ch. 10-11" to
   "**Ch. 11**". Ch. 10 is *Sequential Circuit Design*; the carry-save, block-lookahead and
   barrel-shifter material is all in Ch. 11, *Datapath Subsystems*, which is the chapter the text
   already cites correctly at line 299. While there, consider "Most blocks here have a standard
   textbook treatment in ..." so the opening clause does not promise coverage the next sentence
   withdraws.
2. **Line 33:** stop the callout reading as a complete inventory. Either name the rest
   (`reg [7:0]`, `always_comb`, `if`/`else`/`case`/`default`, `for`, `<=`, `initial`, `#delay`,
   `x`) or say "a fragment or a bare keyword, a dozen or so times". And soften "Each marks a place
   where the notation quietly contradicts the hardware fact on that page" to "Most mark ...; one or
   two show the cure", because `$signed()` and `{{4{x[3]}}, x}` at line 638 are the cure, not the
   contradiction.

**Do not ship the run without item 3 of *Remaining defects*.** `research/ch01-digital-logic.md`
line 52 still asserts "A > B falls out of the carry-out of A - B" — the error this chapter has now
had corrected twice — and line 8 still says "dynamic power = CV²f". The notes, not the chapter, are
what the chapter-8 and chapter-9 writers will read. Fix both in place with a dated correction line,
the way the CMOS conduction bullet was fixed after round 1.

**Bookkeeping to close the chapter out:** update STATE.md's chapter-01 row to `9 (r3)` / `reviewed`,
clear the Open concerns cell (the regression it describes is fixed), and add run-log entries for
review r1, fix round 1, review r2, fix round 2 and this review — the log currently ends at "Chapter
1 written". Separately, put `guide/` under version control before chapter 2: this is the second
consecutive review that had to re-audit an entire chapter from scratch purely because there was no
revision to diff, and that re-audit is most of what a review round costs.
