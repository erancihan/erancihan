# Chapter 7 review — round 1

Reviewer persona: IEEE 754 specialist; every number re-derived independently (python3 struct/fractions), all code re-run, classifier mutation-tested independently before reading the README.

<!-- sections complete: 9/9 -->

## Verdict

**Score: 8 — real defects, none blocking; the numbers themselves are impeccable.**

This is the most numerically watertight chapter of the seven. Every hex constant, every exact decimal (to the last of 59 digits), every boundary in the classification table, all 40 cells of the five-attribute rounding table, the census, the gap structure, the epsilon probes, and the accumulation drift were re-derived independently before reading the chapter's versions, and **every single one matched**. The never-underflow proof is rigorous and survived my own 448,672-pair exact-arithmetic counterexample hunt. The classifier survived a 67.1-million-pattern exhaustive sweep at the critical exponents, 100k random patterns against an independent reference, and five reviewer-devised mutations; the mutation record's 19 kills and 2 survivors reproduce exactly as written, including the equivalence proof for M9. Transcripts are byte-exact; listings are contiguous slices; the history section's six load-bearing quotes verify against the live source.

What keeps it at 8 is precisely this project's recurring disease, twice, plus one inter-chapter inconsistency: (1) the spacing-table lead-in claims a measurement method (value(bits+1)−value(bits)) that is *impossible* for its maxnorm row — the research notes measured that row honestly and the chapter dropped the qualifier in transcription; (2) the chapter silently contradicts ch05's claim that binary32 addition raises underflow, without the dated-correction treatment the project gave ch06's corrected claim; (3) the 400k-pair underflow experiment reports 29,971 tiny sums in the chapter vs 15,550 in the notes with no acknowledgment that the generator changed. All are one-sentence fixes; none affects a taught number. With items 1–3 of the required changes applied, this is a 9.

## Encodings and numbers

Every number was re-derived independently in python3 (`struct`, `Fraction`, 70-digit `Decimal`) **before** reading the chapter's derivations, then compared. Results:

**Worked encodings — all correct.** 1.0→`3F800000`, 0.5→`3F000000`, −2.0→`C0000000`, 6.25→`40C80000` (E=129, F=0x480000, 0.5625·2²³=4,718,592 ✓), 0.1→`3DCCCCCD` with the G/R/S derivation checked bit by bit (kept 23 bits `0x4CCCCC`, G=1, R=1, S=1 → +1 ✓; my exact scaling gives 13421772.8 → 13421773 = 0xCCCCCD ✓), 2²⁴+1→`4B800000` (tie down) and 16,777,219→`4B800002` (tie up) ✓, 2⁻¹⁴⁰→`00000200` with the F·2⁻¹⁴⁹ / (0.F)·2⁻¹²⁶ cross-check ✓, min/max normal ✓. The **exact decimals are exact to the last digit**: 0.100000001490116119384765625 ✓ (and the 0.2-ulp error claim: 1/671088640 ÷ 2⁻²⁷ = 0.2 exactly ✓), −3.1415927410125732421875 ✓, the 59-digit min-normal decimal ✓ digit for digit, max normal = 340282346638528859811704183484516925440 = 2¹²⁸−2¹⁰⁴ ✓, 2⁻¹⁴⁰ = 7.174648137343063e−43 ✓.

**Hex-range table — every boundary confirmed** against my own classifier: 0x00000000 zero / 0x00000001 sub / 0x007FFFFF sub / 0x00800000 normal / 0x7F7FFFFF normal / 0x7F800000 inf / 0x7F800001 sNaN / 0x7FBFFFFF sNaN / 0x7FC00000 qNaN / 0x7FFFFFFF qNaN, and all ten negatives. ✓

**Census — correct**: 2 / 16,777,214 / 4,261,412,864 / 2 / 16,777,214, total exactly 2³²; qNaN 8,388,608, sNaN 8,388,606 (the two missing patterns are ±∞ — the chapter's observation is right). Shares round correctly at the printed precision (16,777,214/2³² = 0.39062495…% → 0.390625%; 99.21875019% → 99.218750%; 2/2³² = 4.66e−8% → 0.00000005%). The 0.78%-per-pair figure: 1−(1−p)² = 0.7797% ✓.

**Bias section**: 1/2⁻¹²⁶ = 2¹²⁶ → `7E800000` ✓; 1/maxnormal rounds to 2⁻¹²⁸ = `00200000` ✓ (I checked the rounding: the excess 2⁻¹⁵² is far below the half-ulp 2⁻¹⁵⁰); minnormal·maxnormal = 4−2⁻²² exactly ✓; all 255 exponent-boundary crossings monotone ✓ (re-measured); −1.0 `BF800000` lexically above `40000000` ✓; decades 254·log₁₀2 = 76.46, 277·log₁₀2 = 83.39, Q16.16 at 14.15 ✓ ("nearly six times" = 5.89× ✓).

**−126/−149 and gaps**: reconciliation identity exact (2⁻²³·2⁻¹²⁶ = 2⁻¹⁴⁹ ✓); the wrong-read fingerprint is exactly 2× (2⁻¹⁴¹ vs 2⁻¹⁴⁰ ✓); gap ratio 2²³ = 8,388,608 ✓; adjacent-normal difference `00800001`−`00800000` = 2⁻¹⁴⁹ = bits `00000001` ✓; promotion vectors `00400000+00400000`, `007FFFFF+00000001`, `00200000+00600000` all = `00800000` ✓ (recomputed in exact rationals); FTZ half-ulp bound 2⁻¹⁵⁰ ✓.

**ULP/epsilon**: every spacing-table row's *value* confirmed (1000→`447A0000`, 10⁶→`49742400` included; ulp/x ratios all match; subnormal row 2⁻⁹ = 1.95e−3 ✓); integers exact to 16,777,216 sharp, 16,777,217 first loss ✓; ε=2⁻²³ vs u=2⁻²⁴ conventions correctly attributed; the three epsilon probes at 1.0 reproduce exactly (tie to even at u, bump past the tie) ✓; the 0.1×10 accumulation lands at `3F800001` with **exactly the first two adds exact and eight inexact** — I recomputed the per-step exactness in exact rationals and the chapter's parenthetical is precisely right; double sum 0.9999999999999999 ✓.

**Rounding attributes**: I built my own five-attribute rounder from scratch over exact rationals; **all 40 cells of the chapter's table match**, including the sign-asymmetric −(1+2⁻²⁴) row and both overflow rows. Overflow threshold (2−2⁻²⁴)·2¹²⁷ = maxnormal + ulp/2 ✓, RNE at the threshold → inf, just below → `7F7FFFFF` ✓, §7.4 per-attribute defaults ✓. The (+0)+(−0) rule as stated matches 754-2019 §6.3 (unlike signs → +0 except roundTowardNegative; like signs keep the sign; x+(−x) → +0) ✓. `round_up = G & (R|S|L)` is the correct RNE decision ✓.

**The never-underflow claim — independently validated.** The chapter's proof (every binary32 is k·2⁻¹⁴⁹; a tiny exact sum has |k| < 2²³ and is therefore representable) is rigorous and correct, and correctly notes independence from the before/after-rounding tininess choice. I ran my own exact-rational counterexample search — 448,672 directed and random pairs (near-subnormal cancellations at the 0x00800000 edge, cancellations from binades 1–24, subnormal±subnormal, 400k random cancelling/mixed pairs) — **zero tiny-and-inexact results**, with the detector proven live on multiplication (which does produce tiny+inexact). divideByZero-never and the invalid/inexact rules match 754-2019 §7.2/7.3/7.6; both overflow paths (magnitude, rounding-induced at maxnormal+2¹⁰³) verified.

**One confirmed overclaim (the project's recurring defect class).** The spacing-table lead-in says "every row measured this session as value(bits+1) − value(bits)". For the maxnorm row that measurement is *impossible*: value(`7F7FFFFF`+1) is +∞, so value(bits+1)−value(bits) = ∞, not 2¹⁰⁴. The research notes carried the honest parenthetical "(via 7F7FFFFE..7F7FFFFF)" on exactly that row; the chapter dropped it and thereby claims a measurement that cannot have been made as described. The *number* (2¹⁰⁴, ulp/x ≈ 6e−8) is correct — measured downward.

**Minor wording**: the multiplication parenthetical "raw fields add to E_A + E_B − 127, so one bias must be re-subtracted" is garbled shorthand — raw fields add to E_A+E_B (= e_a+e_b+254); the *target* stored exponent is E_A+E_B−127. The intended fact is right; the sentence reads as if the sum itself were E_A+E_B−127.

## The classifier

`fp32_class.v` audited bit by bit and attacked before reconciling with the record.

**Boundary audit**: `e_zero=(e==0)`, `e_ones=(e==255)`, `f_zero=(f==0)` place every edge correctly — 0x00800000 normal, 0x007FFFFF subnormal, 0x7FBFFFFF signalling, 0x7FC00000 quiet, both signs (sign is a pure `w[31]` passthrough, classes are sign-blind, as the format requires). **One-hot holds for all 2³² patterns by construction**: {e==0, e==255, neither} is a three-way partition of the exponent field; the two reserved rows each split on `f_zero` (a two-way partition of the fraction), the middle row is a single class — so exactly one of the five outputs is high for every input, and `is_qnan`/`is_snan` partition `is_nan` on f[22]. The argument is airtight; no sweep is needed for the contract, but I swept anyway:

- **Reviewer's exhaustive sweep, 67,108,864 patterns**: every fraction value at exponent fields {0, 1, 254, 255}, both signs, against an independently written priority-if reference (integer compares, a third formulation distinct from both the DUT's field equalities and tb_class's range model), plus the one-hot invariant on every pattern. **Zero errors** — this covers the *entire* NaN population (all 16,777,214 patterns individually), every subnormal, and the full bottom/top normal binades. (Timing measured first as instructed: 834k patterns/s → a full 2³² sweep is ≈86 minutes; not attempted, and unnecessary given the by-construction argument plus this sweep — exponents 2..253 are structurally identical to 254.)
- **Reviewer's vector check, 100,060 patterns**: all ten battery boundaries ±1 ulp, both signs, plus 100,000 uniform-random patterns, expected outputs computed by an independent python classifier, fed via `$readmemh`. **Zero mismatches.**
- **Reviewer's own mutations, five, none taken from the README**: wrong quiet-bit position in `is_snan` (f[21]), `f_zero` ignoring the fraction LSB, `sign=w[30]`, `e_ones=(e>=254)`, wrong quiet-bit position in `is_qnan`. **All five killed** by the shipped `tb_class.v`, each with a correct first-failure location (e.g. the f[21] mutants die at `7fbfffff`, exactly where fset[2]=0x3FFFFF discriminates bit 21 from bit 22).

**README record reconciled** (see next section for the reproduction): the 3,072-pattern sweep genuinely forces every class boundary — fset was well chosen (0x3FFFFF/0x400000 pin the quiet bit; 0x000000/0x000001 pin f_zero; 256 exponents pin both reserved rows). The **M9 survivor's equivalence proof is correct**: f[22]=1 ⇒ F≠0 ⇒ `e_ones & f[22] ≡ is_nan & f[22]` for every pattern — a genuine equivalent mutant, one line, no testbench can kill it. `fp32_fields.v`'s `e_eff = max(E,1)` decode is correct (stored exponents 0 and 1 share the 2⁻¹⁴⁹ LSB scale — verified in exact arithmetic), and its header honestly scopes E=255 as meaningless-but-driven.

## Testbenches and mutations

**Harness**: `run_all.sh ch07` → 4/4; full regression → **82/82**, both re-run here. All four targets compile with literally zero iverilog output (compile logs captured individually: 0 bytes each), matching the manifest's `run` contract.

**Can each fail?** Yes — demonstrated, not assumed. I reproduced ten mutations from the README's record plus five of my own; every kill produced the recorded first-failure message:

- M1, M3, M8 (classifier boundary/field mutants) — killed at the recorded patterns.
- **M9 — survived, as recorded**, and the equivalence proof holds (above).
- M10 (`e_eff = e_raw`) — killed with **exactly the transcript the chapter quotes**: `FAIL tb_fields 00000001: decode 7.006492e-46, simulator 1.401298e-45` (7.006e−46 = 2⁻¹⁵⁰, precisely half of 2⁻¹⁴⁹ — the fingerprint claim is real).
- M14 (sweep truncated) — killed by the count guard `3060 sweep checks, expected 3072`. M16 (golden constant bent) — killed at the 0.1 check. M17 (loop zero times) — killed by the loop guard. M18 (one chk deleted) — killed by `35 checks ran, expected 36`.
- **M21 — survived, as recorded**: with the whole value-domain reference deleted, tb_class still prints `PASS ... x 3 references` — the README's honest framing of this (a deletion is invisible to a run; the banner lies) is accurate and the right lesson.

**Structural review of the four TBs**: all have time-based watchdogs (#1000000 + `$fatal`), and the harness adds a 60 s wall-clock kill — double protection. Loop bounds are guarded by postcondition counts (3072, 3060, 20 directed, i==10, 36 checks), which M14/M17/M18/M19 prove are live. **sNaN vectors are built from bits** everywhere (`32'h7FA00000`, `32'h7F800001` as `reg` literals) — the chapter's own rule is followed; no sNaN ever originates from a value-domain round-trip. The `chk` task uses `!== 1'b1`, so an X result fails rather than passing. tb_fields' known blind spots (sign of zero vacuous in the value compare; E=255 unchecked) are correctly disclosed in the README rather than papered over.

**Two small record nits**: (1) M1's gloss "(min normal read as subnormal)" is wrong about the class — the `e<=1` mutant reads 0x00800000 (F=0) as *zero*, not subnormal; the kill location is right. (2) In tb_lab's "sNaN + 1.0" check, the sNaN is quieted by `$bitstoshortreal` *before* the add ever sees it (trap 2 proves conversion alone quiets); the NaN-anatomy section's sentence "propagation and quieting behave as recommended … an sNaN comes out with the quiet bit set" presents this conversion+add pipeline as if the *operation's* §6.2.3 quieting were observed. The end-to-end measurement is real; the attribution is one notch stronger than what the lab can distinguish — Icarus's value domain cannot deliver an sNaN to an operation at all.

## Transcripts and listings

All four testbenches were rebuilt and re-run in this review session; every quoted transcript compared against fresh output:

- `tb_class` PASS line — **byte-exact**. `tb_fields` two lines — **byte-exact** (including `7.174648e-43` / `3.587324e-43`).
- `tb_encode` — the chapter's nine-line block is a **verbatim prefix** of the real 17-line output, and its lead-in says "transcript abridged to this section's examples" — abridgement declared ✓. The `0.1 x 10` line quoted later is byte-exact.
- `tb_lab` — trap 1 line, the seven-line trap 2 block, both trap 3 lines, and the trap 4 line: all **byte-exact**, including the architecture-dependent `ffc00000`/`7fc00000` values, which both the chapter and the src README flag as x86-64-specific by design.
- The quoted mutation kill message (`FAIL tb_fields 00000001: …`) reproduced exactly by re-applying M10.

**Listings**: mechanically checked — the chapter's two Verilog blocks (558 bytes of `fp32_class.v`, 101 bytes of `fp32_fields.v`) are each a **byte-identical contiguous slice** of the shipped file. The python-derived blocks (anchors, endpoints, monotonicity, gaps, promotion, signed zeros, rounding table, spacing table, epsilon probes) were not diffed against stored scripts — none ship — but every number in them was independently re-derived here and matched, including the full-precision decimals. The one transcript-adjacent defect is the spacing-table lead-in's impossible measurement claim, recorded under "Encodings and numbers".

## Craft

**Cross-references** — every quoted title resolves: ch02 "Reduction Operators and the Sticky Bit" ✓; ch05 "Choosing Stimulus: Directed, Exhaustive, Random" and "Verifying Floating Point Specifically" ✓; ch06 "The Bits Never Know", "One Pattern, Five Numbers", "Biased Encoding: The Exponent's Format", "Radix, and the Fraction That Never Terminates", "The Register Is an Odometer" (via bridge), "Where Fixed Point Runs Out" ✓. Internal forward/backward references all quote real ch07 section titles. Zero positional cross-references found. Both ch06 seeds are delivered (the 0x3dcccccd decode; the bias off-by-one), and ch06's **corrected** magnitude-compare claim is carried correctly — the chapter states the 31-bit magnitude property, immediately fences it with the −1.0-vs-2.0 lexical counterexample, and never restates the false whole-float form. Taxonomy hooks (rows A, B, C, G, H) match what ch05 actually says, row for row.

**One real inter-chapter defect**: ch05's cross-cutting note states "binary32 addition raises invalid …, overflow, **underflow** and inexact per IEEE 754-2019 Clause 7". Chapter 7 now *proves* addition never raises underflow — and says nothing about contradicting ch05. The ch12 seed even cites ch05's demand for a written decision without noting that ch05's own flag enumeration is the thing being corrected. This project has a convention for exactly this (ch06's dated correction, which ch07 handles properly); the underflow correction deserves the same treatment, otherwise a reader holding both chapters has two authoritative sentences that disagree.

**Checklist** — audited item by item: all 13 bullets are supported by body sections ("seven worked encodings" counts correctly: 1.0, 6.25, 0.1, 2²⁴+1, 2⁻¹⁴⁰, min and max normal; the flags bullet claims exactly what the flags section proves; nothing is claimed that wasn't done). **Word count honest**: `wc -w` = 9,496, exactly as STATE.md records. Section count 16 ✓.

**Sources** — honest. The two fetch-claimed sources are real and say what the chapter says: I re-fetched the Severance/Kahan interview and verified all six load-bearing quotes verbatim ("a mass market", Palmer's disclosure of "precisions, exponent ranges, special values", 40,000 transistors, "at least a victim per month per machine", Stewart commissioned by DEC and reporting at 1981 Boston that gradual underflow "was the right thing to do" ("substantial setback on their home turf"), de facto standard a year before 754-1985). The anecdote is correctly flagged as anecdote, not measurement. Goldberg attribution (property (10), ε=(β/2)β^−p) matches the paper. Title-only citations are consistently marked, including the 1800 precedence claim ("behaviour measured this session" — and it is, in tb_encode).

**Epistemic wall** — maintained. Standard-text claims are flagged in place (§4.3, §6.2 shall/should, §6.3, §7.2–7.6, Table citation); measured claims name their instrument and file; the two rationale passages (why the spare binade sits at the top; NaN-boxing colour) are explicitly labeled "rationale, not standard text" and "folklore, title-only". The NaN-sign material is exemplary: both signs printed, never asserted, portability stated as measured fact per host.

## Research-note audit

Six-plus note claims spot-checked directly, plus a full chapter-vs-notes diff of shared numbers:

1. **Census and format-zoo populations** (§3, §11): binary32 counts ✓ (mine agree); binary16 2/2046/61440/2/2046 ✓, bfloat16 2/254/65024/2/254 ✓, binary64 subnormals 2·(2⁵²−1)=9,007,199,254,740,990 ✓, E4M3 2/14/224/2/14 ✓ — all re-derived, all correct, and the E4M3 row matches ch05's.
2. **Five-attribute table** (§7): all 40 cells reproduced by my independent rounder ✓.
3. **Promotion vectors and the 2⁻¹⁴⁹ shared-scale identity** (§5): exact ✓.
4. **G&(R|S|L) over 1,024 combinations** (§7): the arithmetic size is right (64 six-bit significands × 16 dropped-bit patterns) and the equation is the correct RNE decision ✓.
5. **History sourcing** (§12): all six interview facts fetch-verified this session, including "G.W. (Pete) Stewart III … commissioned by DEC" — the notes' claims are quotes, not paraphrase drift ✓.
6. **The E-field-23/24 subnormal-ulp boundary** (§5, not used by the chapter): checked — ulp at E=23 is 2⁻¹²⁷ (subnormal), at E=24 is 2⁻¹²⁶ (first normal ulp) ✓.

**Chapter-vs-notes inconsistencies found (both minor, neither silently wrong, both worth one clause):**

- **Tiny-sum count**: notes say the 400,000-pair underflow hammer produced **15,550** tiny sums; the chapter says **29,971**. Both say zero inexact. The chapter's "re-run this session" covers it formally, but a ~2× shift in the tiny rate means the pair *generator* changed between research and writing, and neither document says so or records a seed. A reader diffing them sees an unexplained discrepancy in a headline experiment. (Same pattern, smaller: u-bound worst case 5.947e−8 in notes vs 5.9504e−8 in chapter.)
- **The maxnorm ulp row**: the notes' spacing table carries "(via 7F7FFFFE..7F7FFFFF)" on the maxnorm row; the chapter dropped the parenthetical *and* added the blanket claim "every row measured … as value(bits+1) − value(bits)" — the chapter made the notes' honest measurement dishonest in transcription. This is the round's clearest instance of the project's recurring defect.

Nothing in the notes was inherited uncritically that is wrong — the chapter tightened most claims (e.g. "theorem 10" in the notes correctly became "property (10)"), carried the ch06 correction, and correctly excluded the notes' python-only content (struct OverflowError at 2¹⁴⁹). No silent contradiction of the notes beyond the two items above.

## Required changes for a 9+

None blocking. In priority order:

1. **Fix the spacing-table measurement claim** ("ULP, Epsilon, and Where the Integers End"). Replace "every row measured this session as value(bits+1) − value(bits)" with a formulation that is true for the maxnorm row — e.g. "each row is the measured gap to the adjacent representable value (downward at maxnormal, whose upward neighbour is +∞)" — or restore the notes' "(via 7F7FFFFE..7F7FFFFF)" parenthetical on that row. The number is right; the stated method cannot produce it.
2. **Flag the ch05 underflow correction** ("The Flags an Adder Can Actually Raise" or its ch12 seed). One sentence: chapter 5's cross-cutting note listed underflow among the flags binary32 addition raises per Clause 7; this section proves that enumeration wrong for addition. Add the project's dated-correction note to ch05 (or STATE.md) per the ch06 precedent, so the two chapters do not disagree in print.
3. **Reconcile the tiny-sum counts** (same section). Either update the sentence to note the writing-session re-run used a different generator than the research pass (29,971 vs the notes' 15,550 tiny sums), or add the correction to the research notes' corrections section as chapters 4–5 did. As it stands the two documents describe "the same" 400k-pair experiment with a 2× different tiny rate.
4. **Hedge the sNaN-propagation attribution** ("Zeros, Infinities, and the Anatomy of NaN"). The measured path is conversion-then-add, and trap 2 proves conversion alone already quiets; say "through the conversion+add path" (or cite trap 2 in the sentence) rather than presenting it as an observation of the operation's §6.2.3 behaviour. One clause.
5. **Nits**: (a) README M1 gloss — 0x00800000 under the `e<=1` mutant is read as *zero*, not subnormal; fix the parenthetical. (b) Reword "raw fields add to E_A + E_B − 127" → "raw fields add to E_A + E_B, and the correct stored result is E_A + E_B − 127, so one bias must be re-subtracted" (the notes have the same shorthand).

## Tree restoration proof

- Baseline: SHA-256 of all 132 files under `guide/src/` recorded to the session scratchpad **before any review work**.
- All mutation and sweep work was done exclusively on **copies** in the scratchpad (`…/scratchpad/mywork/`); no file under `guide/src/` was ever edited.
- End-of-review verification: `sha256sum -c` reports **132/132 OK, zero mismatches**; both harness runs (`ch07` 4/4 and full 82/82) were executed against the pristine tree.
- `git status --short` shows only `guide/reviews/ch07-review.md` (this file; its skeleton was checkpoint-committed mid-review by the project's checkpoint runner as `823f84f`). No other tracked or untracked changes exist.

## Post-fix verification — 2026-08-17

The orchestrator applied all five required changes (commit `1b357cb`). Each verified at its site against the prescription, plus a regression pass:

1. **Spacing-table lead-in** (`ch07.md`, "ULP, Epsilon, and Where the Integers End") — now reads "upward, as value(bits+1) − value(bits), for every row except max normal, whose upward neighbour is +∞; that row's gap is measured downward, via `7F7FFFFE`..`7F7FFFFF`". Every clause of that sentence is now *true* (I had already re-measured both directions), the table's numbers are unchanged, and the notes' honesty is restored in the chapter. **Verified.**
2. **ch05 dated correction** (`ch05.md`, cross-cutting flags note) — underflow removed from the raisable enumeration; the correction is dated 2026-08-16, states the tiny-⇒-exact reason, cross-references ch07's "The Flags an Adder Can Actually Raise" by exact quoted title (heading confirmed present), and admits the note originally listed underflow. The sentence still flows into the flag-column clause and the flush-to-zero note; no code block in ch05 was touched (fenced-block count unchanged, fix commit diff is 1 prose line). ch07's flags section now states in place that it corrects ch05. **Verified, no regression.**
3. **Tiny-sum reconciliation** — ch07 carries the 15,550-vs-29,971 parenthetical attributing the difference to the generator's exponent distribution with zero-inexact under both; the research notes carry a dated (2026-08-16) reconciliation that also cites this review's independent 448k-pair search. Both documents now tell one story. **Verified.**
4. **sNaN attribution** (`ch07.md`, NaN anatomy) — now "through the conversion-plus-add path", with an explicit caveat that conversion alone already quiets, "a measurement of the path, not of the add operation's §6.2.3 behaviour in isolation". Substantively exactly what was prescribed. **One residual nit introduced**: the caveat cites "trap 2 of 'Traps Beginners Fall Into'", but the *numbered* Trap 2 lives in "shortreal: The Bit-Level Laboratory"; the traps table has no trap numbers (its sNaN row does state the fact, so the pointer lands near the claim, just under the wrong title). One-title fix.
5. **README M1 gloss** — now correctly says min normal is read as *zero* via the `e_zero` selector (matches my measured mutant behaviour). **Multiplication parenthetical** — now "raw fields add to E_A + E_B, twice-biased, and the correct stored result is E_A + E_B − 127". Both **verified**.

**Regression**: full harness re-run by me post-fix — **82/82**; all `.v` sources bit-identical to my pre-review baseline (fix commit touched only two prose files, the notes, and the README); both chapter listings re-checked mechanically — still byte-identical contiguous slices; transcripts unaffected.

**Two residual bookkeeping items** (nits, for the next housekeeping pass): (a) the trap-2 cross-reference title above; (b) `wc -w` on the fixed chapter is **9,639** — the fix-round summary's figure of 9,887 matches nothing measured, and STATE.md still records 9,496 in three places (lines 127, 359, 943). The chapter itself makes no internal word-count claim, so nothing in the shipped text is false — but STATE's record should be refreshed to 9,639.

**Final score: 9 — fit to ship, nits only.** All three substantive defects are properly repaired and independently re-verified; what remains is one misdirected cross-reference title and stale STATE bookkeeping, neither of which touches a taught number, a measurement, or a proof.
