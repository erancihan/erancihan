# Chapter 8 review — round 1

<!-- sections complete: 10/10 -->

Reviewer persona: IEEE 754 specialist; every number re-verified against an independently built exact reference (`fractions.Fraction` + from-scratch RNE), all code re-run.

## Verdict

**Score: 8 — the arithmetic is airtight; a handful of prose-level numeric claims are looser than their measurements.**

The core survives everything I threw at it. I built my own exact reference from scratch (Fraction + hand RNE, validated 0/100,000 against `struct`), swept **1,004,425 operand pairs through the actual `fp32_add_alg.v`** (841 class-cross + 3,584 directed tie/alignment-family + 1,000,000 five-regime random) — **zero mismatches, bits and all three flags**. A second million-pair sweep of a bit-faithful python transcription, with a *different seed*, also matched exactly, reproduced the headline claims (rounding-carry renormalize **0 in my 10⁶**; tiny results 53,436, **all exact**; G live in 18.9 % of massive cancellations vs the chapter's 19.2 %), and never fired the `shl ≥ 2 ⟹ R = S = 0` invariant. An **exhaustive** run of the same ten-step algorithm at p = 5 (all 50,176 signed pairs of a toy format) found zero mismatches — I could not construct the "29th bit" pair, and the small-width exhaustion is structural evidence none exists. Every worked example checks digit-by-digit, all six listings are byte-identical contiguous slices, 11 of 12 transcripts re-captured verbatim (one abridged without the promised declaration), and the 27/23/4 mutation record reconciles completely — I re-ran 17 datapath mutants and 7 testbench-side mutants and got the README's first-failure messages *verbatim*, confirmed M18's equivalence proof, T3b's legitimate survival, and both relaxation survivors.

What keeps it at 8: four numeric claims stated stronger than their measurements — (1) "81.6 % … the small operand vanishes below R entirely" pairs the d ≥ 25 percentage with the d ≥ 26 property (at d = 25 the MSB sits *in* R; below-R-entirely is 80.9 %); (2) the associativity table's "exponents anywhere: 3.33 % differ" is not reproducible under its natural reading (I measure 0.6 %; the notes' own figure for the same row is 8σ away while the other two rows reproduce within noise); (3) the M18 equivalence argument's "under an eighth of the big one" is falsifiable by construction (the true tight bound is a quarter); (4) the width-budget's "at most a quarter of the big one's frame value" reads as wrong (the value-relative bound is half, as the notes correctly said). None changes a conclusion; all four are exactly this project's recurring defect class, in the chapter most about numbers.

## Algorithm and numbers

Method: I wrote my own exact reference before re-reading any derivation — `decode` → `Fraction` sum → from-scratch RNE encoder (normal and subnormal ranges, tie-to-even, overflow-to-inf), validated against `struct`'s double→binary32 on 100,000 random doubles spanning 2^−160…2^139: **0 mismatches**. Scripts in the session scratchpad (`reflab.py`, `dp.py`, `sweep.py`, `variants.py`).

**Worked examples, digit by digit — all confirmed.** Every intermediate the twelve traces print (swap, d, aligned|G R|s, the 27-bit sum, normalize outcome, L/G/R/S, round_up, E/F, flags) matches my independent model; every final constant and flag triple in both `tb_walk.v` and `tb_corners.v` matches my exact reference **in both operand orders** (114 directed expectations, 0 discrepancies). Spot re-derivations: W2's exact sum 29360127/8388608 is half an ulp below 3.5 and L odd forces up ✓; W7's sum is exactly (2 − 2⁻²⁴)·2¹²⁷, the ch07 overflow threshold ✓; the 0.1 + 0.2 opener (d = 1, carry, G = R = 1, `3E99999A`) re-executes exactly as narrated ✓; X2's frame holds only the G bit and needs the left-24 shift ✓.

**The 28-bit width budget — attacked, held.** Three independent attacks: (a) 1,000,000 five-regime random pairs through my bit-faithful 28-bit-state model vs the exact reference, *my* seed (424242): 0 mismatches; the `shl ≥ 2 ⟹ R = 0 ∧ S = 0` assertion never fired. (b) 1,004,425 pairs through the shipped Verilog (below). (c) **Exhaustive at small width**: the identical ten-step algorithm re-parameterized at p = 5 (3-bit exponent, subnormals, G/R/S + carry — the same budget shape) against exact RNE on *all* 50,176 signed finite pairs: **0 mismatches**. No 29th bit is needed; I could not construct a pair that wants one, and the exhaustive toy says the shape has none. The normalize-range bound 0…24 is real and reached only by the lone-G family (my LZC-capped-at-23 mutant died *only* on X2 and its corner twin). The exponent-side budget (8-bit d spanning 0…253, 5-bit shift counts, 9-bit exponent arithmetic) is respected in the declarations — I checked the one suspicious narrowing, `shl = shl8[4:0]`: the clamped value is provably ≤ 26 in every reachable case (lz ≤ 26; the e_lim arm is selected only when e_lim < lz ≤ 26), so the truncation is safe.

**One wrong constant in the d ≤ 1 argument's prose.** "with d ≥ 2 the aligned small operand is at most **a quarter** of the big one's frame value" — relative to the big *operand* the tight bound is **half** (sig_sml→2²⁴·w, big ≥ 2²⁵·w; the notes correctly said "at most half the big one"). The sentence is salvageable only if "frame value" means the 2²⁶ frame capacity, which no reader will assume. The displayed inequality `big − small ≥ 2²⁵·w − 2²⁴·w = 2²⁴·w` is correct and is what the conclusion actually uses.

**Sticky borrow.** The identity `big − (kept + f) = (big − kept − 1) + (1 − f)` is algebraically exact; my borrow-omission variant broke **5,281 of 200,000 (2.64 %)** on my generator vs the chapter's 5,310 (2.66 %) ✓, and both directed pairs behave exactly as claimed (`40000000+B3800001` → mutant `40000000`, truth `3FFFFFFF`; `3F800001+B3800001` → mutant `3F800001`, truth `3F800000`).

**Shortcut ratios.** My degraded variants (my generator/seed): GR 2.634 %, GS 0.506 %, G 6.345 %, none 21.763 % — same ballpark as the chapter's 2.674/0.475/7.590/26.413, and the taught *ordering* (G loss worst, sticky next, R rarest) holds. The chapter's honest framing of the 11×-vs-6× ratio as stimulus-dependent is correct and is the right way to inherit STATE's "11×" bullet. All four hand counterexamples verified exactly, including the subtle GS one: with the borrow landing at G weight (the 25-bit frame the chapter describes) I reproduce `3F3FFFFF` against the true tie `3F400000` by hand-executing that datapath; the exact difference 0.75 − 2⁻²⁵ is indeed half an ulp below 0.75.

**Sterbenz.** Reproduced *exactly*: toy p = 5, e ∈ [−2, 3] with subnormals → 111 positive values, **3,151 in-condition ordered pairs, 3,151 exact, 0 violations; 932 (29.6 %) with nonzero subnormal exact difference**. 200,000 conforming random binary32 pairs: 0 inexact differences. Boundary pair `(2−2⁻²³) − (1−2⁻²⁴)` = `3F7FFFFF` exact (x = 2y precisely); `2 − (1−2⁻²⁴)` needs 25 bits and rounds, inexact ✓.

**Counterexample section.** G-only add-side (`3F800000+33800001` → even kept, truth `3F800001`) ✓; G-only subtract-side (`BE800003` → `3F3FFFFF`, truth `3F3FFFFE`, an exact tie at 25165821/2²⁵) ✓; dropped sticky flips the same deep pair ✓; pre-rounding deletes the operand in `3F800001+33800000` (tie → 0) and broke **10.02 %** of my 200k (chapter: 9.96 %) ✓; double rounding via a 25-bit intermediate broke **5.43 %** of mine (chapter: 5.31 %), 0 via 53 bits, and the directed pair `3F800001+33040000` double-rounds up to `3F800002` exactly as worked (the value sits 2⁻³⁰ past the 25-bit half-step) ✓.

**The headline kill, re-derived.** `3FFFFFFF + 3E800009`: exact sum 75497477·2⁻²⁵ = 2.25 + 5·2⁻²⁵; half-ulp above 2.25 is 4·2⁻²⁵, so the sum is strictly past the tie by 2⁻²⁵ → `40100001` ✓. In the datapath: d = 2 puts a live bit in R (sig_sml = 0x800009, R = bit 0), the add carries out, and after the right-1 shift the only witness above zero is `S′ = S | old R` — drop the fold and round_up collapses to 0 → `40100000`. Confirmed by running the M16 mutant: `tb_corners` fails at exactly this vector with exactly those two values.

**Renormalize-unreachable, re-run with my seed.** My million-pair five-regime sweep: rounding-carry renormalize fired **0 times**; `tb_random`'s 10,000: 0. The three directed reachers all verified analytically and by the bin count (renorm bin = 6 = 3 pairs × 2 orders); the subtract-side reacher `4B800000+B3800000` does go through the borrow-created all-ones significand and back up to 2²⁴ exactly as described.

**The one numeric mispairing.** "81.6 % of uniform-random normal pairs have exponents at least 25 apart — the small operand vanishes below R entirely." The percentage is right for d ≥ 25 (I compute 81.64 %), but at d = 25 the small operand's MSB lands **in R**, not below it (it enters the adder through `sml27`, not through sticky); vanishes-below-R-entirely is d ≥ 26, which is **80.9 %**. Chapter 5's row E ("shifts past guard and round", ≥ 25 apart) has the same boundary blur; chapter 8 hardened it into a statement that is false at exactly d = 25. Small, but this chapter's brand is that its numbers are exact.

**The associativity table's first row does not reproduce.** "exponents anywhere: 3.33 % differ" — with sign/fraction uniform and exponents uniform over the full range I measure **0.65 %**; with uniform 32-bit patterns (specials included) 0.62 %. The rate is ferociously sensitive to exponent span (half range → 2.26 %, span 50 → 11.4 %), and the notes' figure for the same row (2.90 %) is **8σ** from the chapter's 3.33 % at n = 100,000 — while the other two rows agree between notes, chapter, and my runs to within ~1σ (mine: 21.79 %, 32.33 %). Whatever generator produced 2.90/3.33, it is not "exponents anywhere" in the natural sense, and it was not stable between the two sessions. The load-bearing teaching row ("within 2 ≈ a third") is solid.

## fp32_add_alg audit

**Code vs numbered procedure: exact correspondence.** Step 1 is the `max(E,1)`/`{|E, F}` decode verbatim. Step 2's screen implements every row of the special-case table in the stated priority (NaN → inf∓inf → inf → zeros), with `invalid = sNaN | inf∓inf` and NaN propagation as first-NaN-payload-quieted, matching the prose contract. Step 3's swap is the single unsigned `w[30:0]` compare. Step 4 instantiates `../ch02/align_sticky.v` at W = 24, SHW = 5 (2⁵ = 32 > 26 satisfies the module's elaboration guard) with the 8-bit d and explicit 26-clamp. Step 5's borrow, step 7's three-outcome normalize with `min(LZC, e_big−1)` clamp and the exact bit-routing the width-budget table specifies (right-1: G′=LSB, R′=G, S′=S∨R; left-1: G′=old R), step 8's `G & (R|S|L)` with the second renormalize, step 9's three-way pack, step 10's flags including `inexact = ovf | G | R | S` — all match the prose, same order, same widths, same conditions.

**Width declarations.** No silent truncation found: `d` 8 bits (0…253), `shamt` 5 bits behind an 8-bit-domain clamp, the adder 27 bits, `e_norm`/`e_rnd`/`ovf` all 9-bit, `rsig` 25 bits. The only narrowing (`shl8[4:0]`) is proven safe (see Algorithm section). The `lzc26 = 26` sentinel on a zero frame is harmless: a zero frame implies `exact_zero` (screened zeros aside), and that arm overrides the pack.

**Corner soundness checks I did on the code itself:** an effective subtract can never wrap (swap guarantees `big27 ≥ sml27 + s_al` — for sticky set, the true small operand is strictly between `sml27` and `sml27+1`, and `big ≥ small` forces `big27 ≥ sml27 + 1`); a subnormal-range result is always exact (bit-23-clear at the pack implies e_norm = 1, and d ≤ 1 there kills G/R/S — consistent with the no-underflow wire); a subnormal that rounds up to `00800000` packs correctly through the `fsig[23]` arm.

**Sweeps against my exact reference (bits AND flags):**

| set | pairs | mismatches |
|---|---|---|
| class-cross (29 representatives × 29: zeros, sub min/max, min/max normal, ±1, 2²⁴, thresholds, inf, qNaN, sNaN) | 841 | 0 |
| directed tie/alignment family (d = 0…27 × 8 boundary significand patterns², add and subtract) | 3,584 | 0 |
| five-regime random, seed 20260819 | 300,000 | 0 |
| five-regime random, seed 1618033 | 700,000 | 0 |

Total **1,004,425 pairs through the compiled `fp32_add_alg.v` + ch02 `align_sticky.v`, zero mismatches**, NaN rows compared by class (sign never compared). The ch05 taxonomy rows E–I are embedded in the corner list (re-verified) and in the family sweep. Nothing blocking; I found no input on which the module and exact IEEE 754 RNE addition disagree.

**One latent-bound note for chapter 9:** the module comment at `exact_zero` ("the aligned operand is under an eighth of the big one") repeats the wrong constant discussed under Testbenches/M18 — the code is right, the comment's bound is not.

## Testbenches and mutations

Harness: `run_all.sh ch08` **4/4 green**, full repo **86/86**; all four targets compile with **zero** iverilog output, verified individually. Watchdogs are time-based (`#1000000` / `#10000000`); the run-length guards compare against literals (12, 90, 10000), not the parameters they derive from — `tb_random` even comments why. NaN sign is never compared anywhere (walk/refmodel/random by class, corners by class + quiet bit + payload with bit 31 explicitly excluded).

**My own mutation battery first (7 mutants, written before reconciling with the README):** all killed.

| mine | result | note |
|---|---|---|
| alignment saturation clamp 26→25 (condition untouched, so diverges at d ≥ 27) | KILLED — but **only** by the `sticky_sat` coverage bin | see below; result-visible bug, no result check catches it |
| sticky tied low | KILLED (walk W3 flags; random on bits) | = README M1, message verbatim |
| G-only rounding | KILLED (corners `3f800000+33800001`) | = M3 verbatim; walk survives it |
| renormalize deleted | KILLED (walk W7 `00000000`; corners `4b800000+b3800000`); **random survived** | = M4; confirms "killed by the directed set alone" |
| swap comparator inverted | KILLED by all four TBs | ≈ M5 |
| LZC capped at 23 | KILLED only by X2 + corner twin; random survived | = M6; "only this vector killed it" confirmed |
| normalize clamp deleted | KILLED (W6 `007ffffe`; corners `00000001+00000001` → `7f800000`) | = M8, both trap-table numbers verbatim |

**README reconciliation — 27/23/4 fully confirmed.** I additionally ran M2, M7, M9, M10, M11, M12, M13, M14, M15, M16, M17, M18 and the testbench-side T2, T3b, T3c, T4, T5, T6, T7. Every kill reproduced with the README's quoted first-failure message *verbatim* (e.g. M15's `4b800080`, M16's `40100000 expected 40100001`, M17's `b4800000`). The four survivors:

- **M18 (`& ~s_al` on `exact_zero`): survived all four TBs, and the equivalence proof is valid** — sticky requires shamt ≥ 3, hence d ≥ 3, hence a normal big with `big27 ≥ 2²⁵` while `sml27 < 2²³`, so `big27 − sml27 − 1 > 0` and `sum27 == 0 ∧ s_al` is unsatisfiable. Genuinely equivalent, not a gap. One correction: the written reason's "the aligned operand is under an eighth of the big one" is **false as stated** — with d = 3, sig_sml = `FFFFFF`, sig_big = `800000`, the ratio is 0.24999…; the provable bound is *under a quarter* (2²³/2²⁵), which still closes the proof. The wrong constant appears in the README, the module comment, and the chapter prose.
- **T3b: survival is legitimate as written** — deleting the two named renorm vectors and updating the count to 86 still passes with 8/8 bins because `4B800000+B3800000` covers the renorm bin; I verified the bin count drops 6 → 2, not 0. T3c (all three deleted) dies at the coverage gate ✓ — the gate is executable.
- **T6/T7: survive as the deleted-check relaxation class**, exactly as documented; the PASS banners still print. Correctly filed under known blind spots.

**Finding worth a vector (testbench robustness, not a kill gap):** the alignment-saturation *off-by-one* — clamping to `5'd25` with the `(d > 8'd26)` condition left alone, so the datapath diverges at d ≥ 27 — is a **result-visible** bug: `4B000000 + BDFFFFFF` (effective subtract, d = 27) returns `4AFFFFFF` against the true `4B000000`, one ulp low, because the small operand's leading bit is parked in R instead of sticky and the borrow lands at the wrong weight. Yet no directed vector, no walk trace, and none of `tb_random`'s 10,000 pairs catches it on result bits. It dies only through the `sticky_sat` bin (`s_al && shamt == 5'd26`) going empty — the library's only saturating pairs are `4B800000 ± 33800000` at d = 48, which the mutant maps to shamt 25, and both are result-equivalent under either clamp because their small significand is `800000`. The mutant *is* killed, so nothing is unkillable — but the kill is a side effect of that bin's wiring, and a chapter-9 restructuring that samples saturation differently would silently lose it. One directed subtract past the saturation point with a busy small significand pins the boundary at result level; I validated the fix end to end (required change 6).

**Corner library content checks:** 45 pairs × 2 = 90 confirmed by count; three renorm reachers present and reaching (bin = 6); both tie directions; both overflow paths + near miss; the M16 campaign vector present with its origin comment; group C NaN rows check class/quiet/payload and flags, never sign. Bins sampled from DUT wires, not vector intent ✓ (T4 — sample call deleted — dies with every bin empty).

## Transcripts and listings

All four testbenches re-run this session; outputs diffed mechanically against the chapter's fenced blocks.

- **Transcripts (12): 10 verbatim-contiguous, 2 abridged.** W1, W2, W3, W4, W6, W7, X2 traces, the `tb_corners` bins/PASS block, the `tb_random` census block, and the `tb_refmodel` block are byte-identical contiguous slices of this session's captured stdout. The W5a/W5b block is abridged (distinctive lines only) **and its lead-in declares it** ("The distinctive lines (full traces in the `tb_walk` output)") ✓. The **W8b block is also abridged** (its A/B/swap/big/small/round lines are dropped) **and its lead-in does not say so** — a violation of the chapter's own rule stated in the section opener and repeated in Sources ("abridged transcripts say so in their lead-ins"). Every abridged line that *is* shown appears verbatim in the capture; nothing is fabricated.
- **Listings (6): all byte-identical contiguous slices**, verified mechanically — five from `fp32_add_alg.v` (steps 3–4, step 5, normalize, round, pack) and the `one_add` task head from `tb_refmodel.v`.
- The `SEED=8377` line, the census numbers (right1=2083, left≥2=694, sticky_saturated=1892, rounding_renorm=0), and the bins line reproduce exactly on re-run (deterministic seeding, as ch04's `$random`/`$urandom` findings predict).

## Craft

- **Cross-references resolve, both directions, all by quoted title.** ch02 "Reduction Operators and the Sticky Bit"; ch05 "Verifying Floating Point Specifically", "Coverage, and Building One by Hand"; ch06 "Fixed Point: The Binary Point Is a Comment", "Shortening a Result: Rounding and Its Bias", "Carry Is Not Overflow"; ch07 "Bias 127, and What the Missing One Buys", "The Hidden Bit and the Subnormal Ramp", "The Classifier in Verilog", "Rounding: Five Attributes, One Default", "The Flags an Adder Can Actually Raise", "shortreal: The Bit-Level Laboratory" — every one exists as an `## ` header in its chapter. Internal self-references ("Twelve Additions…", "Why the Shortcuts Fail", "The Reference Model Verdict for Chapter 9") match ch08's own headers. Zero positional cross-references (the only `§` uses cite the IEEE standard, which is proper). Reverse direction: ch07's bridge promises `0x3DCCCCCD` as the first number chapter 8 adds — kept (the 0.1 + 0.1 opener); ch08's bridge hands chapter 9 `3FC00000 + 40100000`, which is W1 ✓.
- **The G-liveness correction is told honestly** and matches the notes' account: first-draft invariant, falsified in seconds, corrected form re-asserted over the full sweep. My independent census (18.9 % of massive cancellations enter the left shift with G set, over 1M pairs) corroborates the chapter's 19.2 %-of-200k.
- **Epistemic wall intact**: "How Production Adders Rearrange It" opens by declaring itself documentation, keeps close/far and LZA at title-only/search-confirmed strength, and the census-calibration paragraph's numbers (19 %, 7 %, 21 %) match the `tb_random` census actually printed (18.9 %, 6.9 %, 20.8 %).
- **Seeds accurate**: chapter 9's register-width seed matches the shipped declarations exactly; the three renorm vectors are named and present; T1/T2 for chapter 10 re-verified through my reference (16,777,216 vs 16,777,218; +inf vs maxnormal); the chain discipline for ch9/10 is pinned and measured.
- **Closing checklist audited item by item**: each claim maps to verified chapter content; the two embedded numbers (19.2 % G-live, the d ≤ 1 argument) check out (modulo the quarter/half wording above).
- **Sources**: consistent with the notes' verification ledger — Goldberg fetched with URL and the quoted sentence matching the notes' fetched text; Seidel & Even and Schmookler & Nowka explicitly "existence confirmed via search only"; IEEE 754/Sterbenz/Figueroa/Muller/Ercegovac/Koren title-only, no invented URLs. The added §6.2.3 pin for the NaN-propagation *should* is correct 754-2019 clause numbering.
- **Word count honest**: `wc -w` = 11,000.
- The two tie-direction, both-orders, and flags-on-every-vector disciplines the chapter preaches are actually practiced by its own testbenches (checked in code, not prose).

## Research-note audit

Ten spot-checks against `research/ch08-fp-addition.md`; the chapter is generally *more* rigorous than its notes, and where it re-measured it improved on them. Two problems found, one in each direction.

| # | note claim | audit |
|---|---|---|
| 1 | §7 Sterbenz: 3,151 in-range pairs, 3,151 exact; 932 (29.6 %) subnormal differences | **Reproduced exactly** — my independent toy enumeration gives 111 values, 3,151, 3,151, 932. Chapter inherits correctly. |
| 2 | §3 sweep: 1,000,054 pairs, 0 mismatches, `round_renorm: 0`, `subnormal_result: 53532`, all exact | **Reproduced in shape**: my 1M-pair sweep gives 0 mismatches, 0 renormalizes, 53,436 tiny results, 0 inexact among them. Chapter's 1,000,058 (29 directed × 2 + 1M) is the notes' 54-directed set grown by the campaign — internally consistent, not a contradiction. |
| 3 | §6 variant rates 3.87/0.35/9.51/28.64 % | Chapter re-measured (2.67/0.48/7.59/26.41) and **explicitly declares the divergence** and that only the ordering is stable — exactly the right handling. Mine (2.63/0.51/6.35/21.76) sits with the chapter's. The "11× vs about six times" arithmetic checks in both directions. |
| 4 | §8 double rounding 7.78 % via 25 bits; §8 pre-rounding 8.44 % | Chapter re-measured to 5.31 % and 9.96 %; mine 5.43 % and 10.02 % — the **chapter's** numbers are the reproducible ones. Silent divergence from the notes, but in the safe direction (re-measured, not inherited). |
| 5 | §9 chain trap: naive `3f800001` vs serial `3f800000` | Reproduced live in `tb_refmodel` this session ✓. |
| 6 | §5 W7: exact sum equals the ch07 overflow threshold (2 − 2⁻²⁴)·2¹²⁷ | Verified exactly ✓. |
| 7 | §3 "normalize shifter range is 0…24, bound reached by the lone G bit" | Verified; my LZC-capped-at-23 mutant dies **only** on that family ✓. |
| 8 | §12 calibration census (19 % / 5 % / 17 %) | Chapter re-sources these to the simulator campaign (19 % / 7 % / 21 %) and they match `tb_random`'s printed census (18.9 / 6.9 / 20.8) ✓. My python sweep: 19.0 / 6.7 / 20.5. Both sets are honestly labelled as stimulus properties. |
| 9 | §10 associativity 2.90 / 22.24 / 31.45 % | **Problem — see below.** |
| 10 | §3 width-budget table, right-1 row: "`G'=LSB, S'=S∨R∨G` after shift" | **The note is wrong**, and the chapter silently corrected it. |

**Finding A — the notes' §3 table contradicts the notes' own §7 and the hardware.** §3's right-1 row says `S' = S ∨ R ∨ G`; §7's step-7 text says `S' = S | R`, `R' = G`, `G' = old LSB`, which is what `fp32_add_alg.v` implements (`ns = s_al | sum27[0]`, `nr = sum27[1]`, `ng = sum27[2]`) and what the chapter's table prints. Folding G into sticky *and* into R would double-count the guard bit and destroy the R′ = G routing that the whole right-1 story rests on. The chapter took the correct version, but the notes are what chapters 9–12 will re-read, so the stale row should be fixed at source.

**Finding B — the associativity "anywhere" row is unstable across the project's own two runs and does not reproduce for me.** Notes 2.90 %, chapter 3.33 %, my measurement **0.63 % ± 0.02** at n = 200,000 (uniform normals *and* uniform 32-bit patterns both give 0.63 %). The other two rows reproduce as a phenomenon (mine 21.83 % and 32.45 % against the chapter's 22.35 % and 31.22 % — generator-sensitive but the same story). A row whose value moved 15 % between two runs of the "same" experiment and sits 5× above an independent re-measurement is inherited-number risk, and it is printed inside a fenced block that reads as machine output.

Everything else in the notes that the chapter quotes — the ten-step procedure, the borrow derivation, the 28-bit budget, the corrected G-liveness invariant, the four exclusions, the epistemic wall on close/far and LZA, the source ledger and its fetched/title-only/search-only distinctions — is consistent in both directions, with no uncritical inheritance found.

## Required changes for a 9+

None is blocking (no wrong intermediate, no DUT mismatch, no unkillable testbench). All six are claims stronger than their measurements — this project's recurring defect — in the chapter that can least afford them. Ordered by severity.

**1. The associativity table's first row is not reproducible; replace the number or the row.** `chapters/ch08.md`, the fenced block after "How common is grouping-dependence?". I measure **0.63 % ± 0.02 at n = 200,000** for "exponents anywhere" under both natural readings (exponents uniform over 1…254, and uniform 32-bit patterns with specials) — 5× below the printed 3.33 %, which itself moved from the notes' 2.90 % between two runs of the same experiment. The other two rows reproduce as a phenomenon. Since the block reads as machine output, it must either be re-measured with the generator stated, or the unreproducible row dropped. Preferred fix — re-measure and label the generator, replacing the block and its lead-in with:

> How common is grouping-dependence? Measured this session, 200,000 random triples per regime — sign and fraction uniform, exponents drawn as stated — `(a+b)+c` versus `a+(b+c)`:
>
> ```
> exponents uniform over the full normal range :  0.63 % differ
> exponents within 10                          : 21.83 % differ
> exponents within 2                           : 32.45 % differ
> ```

and adjust the following sentence's opening to "Not a corner-case curiosity: **spread the exponents and grouping almost never matters, but** for operands of similar magnitude — the accumulator case — nearly a third of random triples change value with association." (That reading is *stronger* teaching than the current one: it is the contrast that motivates fixing the tree.) If the original generator can be recovered and it really produced 3.33 %, then state it in the lead-in ("exponents drawn from …") — an unlabelled generator is what makes the row unreproducible.

**2. Split the 81.6 % from the "below R entirely" property.** `chapters/ch08.md`, "This region is where random stimulus lives." The percentage is right for d ≥ 25 (exactly 26335/32258 = 81.639 %), but at d = 25 the small operand's leading bit lands **in R**, not below it — `align_sticky` puts the first bit out in G (d = 24), the second in R (d = 25), and only from d = 26 is everything below R. It is result-visible, not just flag-visible: `4B000000 + BEFFFFFF` (d = 25, effective subtract) is `4AFFFFFF`, not `4B000000`. Vanishing below R entirely is d ≥ 26 = **80.929 %**. Replace the first clause with:

> Chapter 5's row E computed it exactly: 81.6 % of uniform-random normal pairs have exponents at least 25 apart, and 80.9 % are at least 26 apart — the distance at which the small operand vanishes below R entirely, influencing only sticky and the inexact flag. (At exactly d = 25 its leading bit still lands *in* R, where the effective-subtract borrow can move the result: `4B000000 + BEFFFFFF` = `4AFFFFFF`.)

**3. Fix the M18 equivalence bound: "an eighth" is false, "a quarter" is true and still closes the proof.** Three copies of the same wrong constant — `src/ch08/fp32_add_alg.v` line 99, its byte-identical quotation in `chapters/ch08.md` (the step-5 listing), and the M18 row of `src/ch08/README.md`. Worst case, exactly: shift = 3, `sig_sml = FFFFFF`, `sig_big = 800000` → `sml27 = 0x7FFFFF`, `big27 = 0x2000000`, ratio **0.24999997** — under a quarter, nowhere near under an eighth. The proof survives unchanged (`big27 − sml27 − 1 ≥ 2²⁵ − 2²³ − 1 > 0`). In the module and the quoted listing, replace the comment line

> `  // then the aligned operand is under an eighth of the big one.)`

with

> `  // then the aligned operand is under a quarter of the big one.)`

and in `README.md`'s M18 row replace "the aligned operand is under an eighth of the big one" with "the aligned operand is under a quarter of the big one". (Fix the module first, then re-quote the listing so the mechanical byte-identity check still passes.)

**4. Fix the width-budget's "a quarter of the big one's frame value" — the bound is a half.** `chapters/ch08.md`, "The last row explains why nothing *more* than R is ever needed…". At d ≥ 2 the aligned small operand is at most 2²⁴·w against a big of at least 2²⁵·w: worst case measured **0.49999997**, i.e. a half. The notes had this right ("at most half the big one"); the chapter tightened it incorrectly. The displayed inequality is correct and unaffected. Replace

> since with d ≥ 2 the aligned small operand is at most a quarter of the big one's frame value

with

> since with d ≥ 2 the aligned small operand is at most half the big one's frame value

**5. Declare the W8b abridgement.** `chapters/ch08.md`, the W8 / W8b lead-in. The W8b block prints 5 of the trace's 12 lines (A, B, swap, big, small, the post-normalize line and the round line are dropped) with no declaration, against the chapter's own rule stated twice ("Where a trace is trimmed to its distinctive lines, the lead-in says so"; "abridged transcripts say so in their lead-ins"). Every other transcript is verbatim-contiguous and W5a/W5b declares its trim correctly. Append to the lead-in's final clause, before the colon:

> …so `007FFFFF + 00000001 = 00800000` crosses into the normals as pure encoding — the distinctive lines, full trace in the `tb_walk` output:

**6. Add a result-level guard for the alignment saturation boundary.** `src/ch08/tb_corners.v`. A clamp one short (`5'd25`) is result-visible at d ≥ 27 — `4B000000 + BDFFFFFF` → `4AFFFFFF` against the true `4B000000` — yet no vector, trace, or random pair catches it on result bits; it dies only because the `sticky_sat` bin (keyed on `shamt == 5'd26`) empties, since the library's only saturating pairs sit at d = 48 with small significand `800000`, result-equivalent under either clamp. Add one row to group E, after the deep-sticky row:

> ```verilog
>     // the saturation boundary at RESULT level, not just via the bin: a
>     // clamp one short (25) parks the small operand's leading bit in R
>     // instead of sticky, and this subtract comes out one ulp low
>     chk(32'h4B000000, 32'hBDFFFFFF, 32'h4B000000, 1'b0, 1'b0, 1'b1);
> ```

and bump the check-count guard from 90 to 92, both "45 pairs" banner strings to "46 pairs", and the `tb_corners.v` header comment / README row counts to match. **Validated end to end this session**: expected value and flags confirmed against exact arithmetic in both operand orders; with the row added, the shipped module passes 92 checks with 8/8 bins, and the clamp-25 mutant now fails on result bits in *both* orders rather than only at the coverage gate.

**7. Fix the stale right-1 row in the research notes.** `research/ch08-fp-addition.md` §3's width-budget table says `S' = S∨R∨G`, contradicting the same document's §7 (`S' = S | R`, `R' = G`, `G' = old LSB`) and the hardware. The chapter is correct; the notes are what chapters 9–12 will re-read. Replace that cell's `S'=S∨R∨G` with `S'=S∨R`.

Nits, no action required: the "1,000,058 vs notes' 1,000,054" difference is the directed set growing by four pairs and is internally consistent; the double-rounding and pre-rounding rates diverge from the notes because the chapter re-measured, and its numbers are the ones that reproduce.

## Tree restoration proof

- **Baseline**: SHA-256 of all **139** files under `guide/src` taken before any work, stored at `scratchpad/baseline.sha256`.
- **Final verification**: `sha256sum -c` → **139/139 OK**, zero failures. No file under `guide/src` was modified.
- **All mutation and scratch work stayed outside the repo**: every mutant was built from *copies* in `scratchpad/mut/<name>/`, and every vector file, reference model, and sweep artifact lives in the session scratchpad. The reviewer's harness (`tb_sweep.v`) compiled the shipped `fp32_add_alg.v` and `../ch02/align_sticky.v` read-only from their repo paths.
- **`git status --short`** shows only ` M ../reviews/ch08-review.md` — this review file (checkpoint-committed by the coordinator mid-session), and nothing else. No stray artifacts, no build output in the tree.
- **Post-restoration harness re-run**: `run_all.sh ch08` → **4 passed, 0 failed**; earlier full-repo run **86/86**.

## Post-fix verification — 2026-08-19

All seven required changes verified at their sites; re-baselined the tree (139 files) after the coordinator's edits and confirmed **139/139 unchanged** by my own runs afterwards. `run_all.sh ch08` **4/4**, full repo **86/86**, all four targets still zero-output compiles, all **6 listings still byte-identical contiguous slices**.

| # | fix | verified |
|---|---|---|
| 1 | associativity block re-measured, generator stated, contrast sentence added | ✔ site reads 0.64 / 21.79 / 32.41 % — within noise of my independent 0.63 / 21.83 / 32.45 % at n = 200,000 |
| 2 | 81.6 % (d ≥ 25) split from 80.9 % (d ≥ 26) + `4B000000 + BEFFFFFF` counterexample | ✔ wording exact; P(d ≥ 26) = 26335→13053/16129 = 0.80929 re-confirmed |
| 3 | "an eighth" → "a quarter", module first then listing then README | ✔ all three sites; listing still byte-identical; worst case re-derived 0.24999997 |
| 4 | width-budget "a quarter of the big one's frame value" → "half" | ✔ site reads "at most half the big one"; re-derived 0.49999997 |
| 5 | W8b abridgement declared | ✔ lead-in ends "— the distinctive lines, full trace in the `tb_walk` output:" |
| 6 | saturation-boundary vector added, guards and counts 45/90 → 46/92 | ✔ vector present at group E; shipped module passes 92 checks, 8/8 bins |
| 7 | research notes' right-1 row corrected to `G'=LSB, R'=G, S'=S∨R` | ✔ with a dated correction note explaining the contradiction |

**Mutant re-run (the specific ask).** The clamp-to-25 mutant against the *updated* `tb_corners.v` now dies on **result bits, in both operand orders**, ahead of the coverage gate:

```
FAIL tb_corners 4b000000+bdffffff: got 4affffff expected 4b000000
FAIL tb_corners bdffffff+4b000000: got 4affffff expected 4b000000
FAIL tb_corners: a required coverage bin is empty
```

Previously it produced only the third line. The boundary is now pinned at result level, exactly as intended.

### Follow-up items — a bookkeeping ripple from change 6 (all validated, none arithmetic)

Adding the vector moved two coverage bins (`round_renorm` and `sticky_sat`, both 6 → 8) and the check count, which invalidated six downstream statements. **One is a transcript that no longer matches its testbench** — the defect class this chapter's own discipline forbids — and **one is a mutation-record entry that no longer reproduces**.

1. **Stale transcript (must fix).** `chapters/ch08.md`, the directed-library block: it prints `bins: right1=12 left>=2=8 round_renorm=6 sticky_sat=6`; the machine now prints `round_renorm=8 sticky_sat=8`. Replace that line with
   `bins: right1=12 left>=2=8 round_renorm=8 sticky_sat=8`
   (the second bins line and the PASS line are already correct).
2. **Stale prose count.** Same section, the sentence after the block: "— ninety checks, and a *proof* they visited every rare path" → "— ninety-two checks, and a *proof* they visited every rare path".
3. **T3c no longer reproduces (must fix).** `src/ch08/README.md` records T3c as KILLED by the coverage gate after deleting "ALL THREE renormalize-reaching vectors". My new vector is a **fourth** reacher, so deleting the three named ones now yields `round_renorm=2` and a clean **PASS**. Verified: deleting all four (count 92 → 84) does fire the gate (`round_renorm=0`, "a required coverage bin is empty"). Re-record the row as "ALL FOUR renormalize-reaching vectors deleted, count updated to 84".
4. **T3 quoted message.** README's T3 row quotes `88 checks ran, expected 90`; re-running it now yields `90 checks ran, expected 92`. Update the quote.
5. **T3b count.** README's T3b row says the count was "dutifully updated to 86"; against the 92-check library it is **88**. T3b still survives legitimately (`round_renorm=4`) — its finding is strengthened, not weakened.
6. **"Three distinct pairs" is now four**, in four places: `chapters/ch08.md` "The corner library carries three distinct pairs that reach it" (add the saturation-boundary pair), the "Seed for chapters 9 and 12" callout ("T3c deleted all three vectors" → "all four vectors"; "Carry the three renormalize vectors forward" → "four"), the four-testbenches bullet ("three distinct rounding-carry-renormalize vectors" → "four"), the checklist item "Name the three vectors that reach the rounding-carry renormalize" → "four", and `src/ch08/README.md`'s "reaches the rounding-carry renormalize through **three** distinct pairs" → **four**, listing `4B000000+BDFFFFFF` alongside the existing three.

Each of the six was reproduced on this machine; every renorm-reacher claim was re-checked directly against the DUT wires (all four pairs show `round_renorm = 1`).

**Nit:** `wc -w chapters/ch08.md` measures **11,066** words here, not the 11,383 reported — worth reconciling before any word-count claim is printed.

### Final score

**8.5 — the arithmetic is at 9; held back only by the six-item bookkeeping ripple above.**

Every substantive defect from round 1 is fixed and independently re-verified: the four loose numeric claims now reproduce against my own exact reference, the undeclared abridgement is declared, the saturation boundary is pinned at result level, and the notes' contradictory table cell is corrected with a dated note. Nothing arithmetic remains open — across this session the shipped module matched exact IEEE 754 RNE addition on **1,004,425 pairs** plus an exhaustive small-width proof, with zero mismatches, and it still does after the edits. What stops a clean 9 is that change 6 shifted two coverage bins and the check count, leaving a quoted transcript that is not what `tb_corners` prints and a mutation-record entry (T3c) whose recorded kill no longer reproduces — a false claim in the artifact record, small but exactly the class this chapter holds itself to. All six follow-ups are one-line edits, each validated here; **apply them and this is a 9**.
