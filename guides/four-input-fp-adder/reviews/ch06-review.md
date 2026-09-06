# Chapter 6 review — round 1 (persona: IEEE 754 / computer-arithmetic specialist)

<!-- sections complete: 10/10 -->

## Verdict

**Score: 7/10 — two wrong numbers and one false-as-stated claim; everything
executable is airtight.**

The measurable core of this chapter is the best-verified in the project so far:
cold harness 5/5 and 78/78; all 6 listings byte-identical contiguous regions of
their files; all 10 simulator transcripts reproduced line-for-line (contiguously,
with every abridgement declared accurately); `-Wall` genuinely silent per target;
112 of 115 independently re-derived numeric claims exact to the digit — including
the C/V rules over all 512 operand/carry combinations, the full bias ledger
(−425984/+65536/0, ties 8192), the seed-42 drift triple, and both dynamic-range
dB figures with their definitions stated. The mutation record's 25/22/3 ledger
reconciles, and both survivor claims I could re-run (M16, M25) reproduce.

What keeps it from 8+: three claims outrun their measurements, and two of them
are flatly wrong numbers — the intro's "`8'b11111111` … 'the exponent −112'"
(it is +128 under excess-127; −112 belongs to `0x0F`), and the π-in-Q3.13
"step/2 bound of 3.05e−5" (true step/2 is 6.10e−5; the wrong number is inherited
from the research notes). Third, "the whole float compares like an integer:
a larger-magnitude float has the lexically larger bit pattern" is false whenever
signs differ (−1.0 vs 2.0), and needs its sign-bit-aside qualifier. A fourth,
softer overclaim: the zero-warning finding is said to be "re-measured on every
harness run," but `run_all.sh` demonstrably swallows compile warnings on
successful compiles. Five-for-five on the project's recurring defect pattern:
every review so far has found a claim stronger than its measurement, and this
round found the numeric variety. All fixes are local; none touches code.

## Numbers reverified

Every numeric claim was re-derived from scratch in `python3` 3.11 (script:
`verify_numbers.py` in the session scratchpad, 115 checks), without consulting the
chapter's derivations first. **112 chapter-side claims verified exactly; two are
wrong; one is false as literally stated.** The verified set, compressed:

- **Radix / 0.1.** `1011.101₂ = 11.625`; 217 → `11011001` → `0xD9`/`0o331`; 0.375 →
  `[0,1,1]`. The 0.1 expansion in exact rationals: remainder state at step 5 equals
  step 1, period 4, first 13 bits `0001100110011`; terminates iff the reduced
  denominator's odd part is 1 (all six test fractions agree); geometric sum
  (3/2)·(1/15) = 1/10 exactly. `Decimal(0.1)`, `0x3fb999999999999a`, `0x3dcccccd`,
  and float32-exact `0.100000001490116119384765625` all reproduce via `struct`/
  `decimal`. Field split of `0x3dcccccd`: sign 0, exponent `01111011`, fraction
  `10011001100110011001101` — the chapter-7 seed is exact. 20-bit truncation:
  104857/1048576 = 0.09999942779541016, error exactly 3/5242880 ≈ 5.722e−7. All ✓.
- **Odometer / complement.** All three worked additions, the exhaustive 256-pair
  mod-16 + carry identity, all three subtraction rows including `~6&15=9`,
  `~13&15=2`, `~8&15=7`, and `cout == (a ≥ b)` over all 256 pairs. All ✓.
- **Five-contract table.** All 16 rows × 5 columns regenerated independently —
  byte-for-byte agreement. MSB-weight −2^(N−1) definition, negation fixed points
  exactly {0, −8}, 192/256 representable sums with the reinterpreted unsigned sum
  correct on every one, MSB-replication sign extension, zero-extend `1101` → 13,
  pattern order ≠ value order, ones'-complement end-around-carry adder correct on
  representable sums, excess-8 monotone over all 256 pairs, excess-8 = two's
  complement with MSB flipped. All ✓.
- **C/V.** All three V rules checked against ground truth over **all 512
  operand/carry-in combinations** at 4 bits (not just the 256 cin=0 pairs): zero
  mismatches, including rule 2 with carry-in. Census 108/84/28/36 reproduced; all
  four quadrant examples bit-exact; rule 1 at 8 bits over all 65,536 pairs: zero
  mismatches; subtraction V via `a+~b+1` over 256 pairs: zero mismatches. All ✓.
- **Q-format.** All six range/step rows exact (`==` on floats, not approx). The
  0x50 → 80.0/5.0/0.625 triple. π in Q2.14: raw 51472, wraps to −14064 →
  −0.8583984375 exactly; Q3.13: 25736 → 3.1416015625, error 8.9e−6. Alignment:
  raws 109/81, naive 190 → 2.96875/11.875 vs true 6.765625, aligned 433/64 exact;
  Q5.6 bound (max |sum| = 10 needs 5 integer bits) ✓. 4×4 products span
  [−56, +64] with (−8)·(−8) the unique top ✓. Q1.15: (−1)·(−1) raw = 2^30,
  <<1 = 2147483648 > int32 max, next-largest 1073709056 = (−32767)·(−32768),
  fits after <<1 (2147418112) ✓.
- **Rounding.** Uniform k=2 table: floor −0.375/0.75, toward-zero 0/0.75, half-up
  +0.125/0.5, half-even 0/0.5 — exact; closed forms −(2^k−1)/2^(k+1) and 2^−(k+1)
  ✓. Tie table (raws 2, 6, −2, −6, 10) ✓. Drift with `random.seed(42)`,
  `randint(-2048, 2047)`, 100k samples, k=4: sums **−45667 / 4188 / 1027**, exact/16
  = 1147.50, drifts −46814.50 / +3040.50 / −120.50 — reproduced to the digit.
  L/R/S: `inc = R&(S|L)` ≡ arithmetic half-even and `inc = R` ≡ half-up over
  [−4096, 4096), zero mismatches ✓. fixmul ledger recomputed independently:
  floor **−425984** (mean −0.40625 LSB), half-up **+65536** (+0.0625), half-even
  **exactly 0**, ties **8192** = 1/8 (uniform would be 1/16) — all four ✓. The
  `{L,~L~L~L}` addend ≡ RNE on fixmul's raw range ✓. Tie examples 24/40/−40 ✓.
  satq44 overflow census 16384 = 25% ✓; both example rows ✓.
- **Dynamic range.** 20·log₁₀(2^N−1) = 48.13 / 96.33 / 144.49 / 192.66 dB and the
  6.02N thumbs as printed ✓. Q16.16 at 0.001: raw 66, rel err 0.00708 vs float32
  4.75e−8 ✓; at 1e−5: raw 1, rel err 0.526 vs 2.53e−8 ✓; 40000 does not fit ✓.
  Relative-step swing 1.5e−2 → 1.5e−8, float32 2^−23 ≈ 1.19e−7 ✓. Float32 span:
  normal 1529.2 dB, with subnormals 1667.7 dB, and log₂(max/min-subnormal) =
  277.00 → 277 magnitude bits, 278 with sign ✓. The chapter states which
  definition each figure uses (max/min-normal vs max/min-subnormal) — good.
- **Bias anchors.** All five float32 rows (1.0, 2.0, 0.5, min normal, max normal)
  bit-exact via `struct`, stored−127 = actual on every row, 127 = 2^7−1, extremes
  −126/+127 ✓.

**The two wrong numbers:**

1. **"The exponent −112"** (section "The Bits Never Know", ¶2): `8'b11111111` under
   excess-127 is 255 − 127 = **+128** (a stored value IEEE reserves), and under no
   encoding taught anywhere in the chapter does `0xFF` read as −112. The pattern
   whose excess-127 reading is −112 is `8'b00001111` (15 − 127). Three of the
   sentence's four readings check (255, −1, −0.0078125 as Q1.7); the fourth is
   simply wrong.
2. **"inside the step/2 bound of 3.05e−5"** (π in Q3.13, "Fixed Point: The Binary
   Point Is a Comment"): Q3.13's step is 2^−13, so step/2 = 2^−14 =
   **6.10e−5**. 3.05e−5 is 2^−15 — step/4, or Q1.15's full step pulled from the
   adjacent table row. The containment claim itself survives (8.9e−6 is inside
   either bound), but the printed bound is the wrong power of two. The same wrong
   number appears in the research notes §5.3, so this is an inherited miscomputation,
   not a transcription slip — and notes §5.3's own Q4.4 line computes step/2
   correctly, which is how it escaped notice.

**One claim false as stated:** "*the whole float compares like an integer*: a
larger-magnitude float has the lexically larger bit pattern" ("Biased Encoding:
The Exponent's Format"). Counterexample, measured: −1.0 is `0xBF800000`, 2.0 is
`0x40000000`; the −1.0 pattern is lexically larger while its magnitude is smaller.
The claim is true only with the sign bit masked (compare bits [30:0] — verified on
a sample including subnormals) or among same-sign floats. The sentence's own
conclusion ("magnitude comparison needs only the unsigned comparator") is right,
but the premise as printed is false for any pair of opposite-sign floats; one
qualifying clause fixes it.

Two minor numeric notes, not defects: `fixmul44.v`'s header bound "[−1016, +1025]"
is a true containment but the measured maximum is 1024 (the bound looks computed
rather than measured; stating the exact [−1016, +1024] would match the file's own
"measured" style); and the trap-table row "every decimal fraction off by ~1e−8
(float32)" overclaims — 0.5 and 0.25 store exactly (the body's iff-power-of-2
statement is correct), and 0.1's float32 error is 1.49e−9 absolute / 1.49e−8
relative, so the ~1e−8 needs the word "relative" to be right.

## Harness and listings

- **Cold runs, this session:** `bash run_all.sh ch06` → **5/5 PASS**; full
  `bash run_all.sh` → **78/78 PASS**. The two manifest rows that compile
  `../ch02/ripple4.v` + `../ch02/full_adder.v` in place resolve and run green from
  the runner's per-chapter working directory, as the manifest comment promises.
- **-Wall silence, per target, compiled individually:** all five targets compiled
  one at a time with `iverilog -g2012 -Wall`, stderr+stdout captured: **0 bytes of
  diagnostics, exit 0, on every target** — including `tb_signtraps.v` with all
  five deliberately buggy continuous assignments. The chapter's headline
  zero-warning finding is real and reproduced.
- **One overclaim about the harness, demonstrated false:** the "Icarus reality"
  box says the silence is "re-measured on every harness run, since a warning
  would appear in the compile log." It would not appear anywhere anyone looks.
  `run_all.sh` sends compile output to a temp log that is read **only when the
  compile fails** and is deleted on exit. Demonstration (scratch tree): a file
  producing two genuine `-Wall` warning lines (out-of-range constant part-select)
  compiles rc=0 and the harness prints a bare `PASS` — warnings surfaced nowhere.
  The zero-warning property is re-established only by compiling targets
  individually with captured output, which is what this review (and presumably
  the writing session) actually did. The parenthetical claims a measurement the
  harness does not perform — the project's recurring defect class.
- **Listings:** all **6 fenced `verilog` blocks** in the chapter checked
  mechanically: each is a **byte-identical contiguous region** of its source file
  (`tb_sub4.v`, `tb_ovf4.v`, `tb_signtraps.v`, `fixmul44.v` ×2, `satq44.v`),
  including internal blank lines and comments.
- README file inventory claims check: `tb_signtraps.v` really contains **49**
  known-answer checks (counted from its output); no target writes a file
  (no `$dumpfile`/`$readmemh` anywhere in `src/ch06/` — confirmed by grep);
  watchdogs are time-based.

## Transcripts

All five testbenches were re-run this session and their stdout captured. Every
one of the chapter's **10 simulator-transcript blocks** was diffed against the
captures: **each block matches line-for-line and is a contiguous slice of the
real output** — even the `tb_signtraps` excerpts, which the lead-in only promises
as "grouped to follow the prose," turn out to be contiguous runs. Abridgement
declarations audited one by one:

- `tb_sub4`: "``$finish`` trailer aside" — accurate; the omitted line is the
  `$finish called at 257000` trailer.
- `tb_ovf4`: chapter quotes the quadrant examples and the summary separately and
  says "the quadrant examples above and the verdict follow them" — matches the
  real output order (summary lines 1–3, quadrants 4–7, verdict 8).
- `tb_satq44` "verdict trailer omitted", `tb_fixmul44` "verdict trailer aside" —
  both accurate (PASS line + `$finish` line omitted, nothing else).
- The claimed measured values in prose (mix 255, prodl 9, narrow 10, cmp 0,
  shft 127; 253/−3 from `8'hFD`; countdown 40 vs 11; `(-128)*(-128)` → 16384/0;
  `-13 >>> 2` = −4 vs `-13/4` = −3; `sa+(-8'd3)` = 250; `%d` pad widths) all
  appear verbatim in the fresh capture.

The chapter's python3 output blocks cannot be diffed against the writer's scripts
(scratchpad is gone), but every number they print was re-derived independently —
see "Numbers reverified"; all reproduce except the two defects listed there.

## Mutation campaign

Honesty note: the README's mutation record was part of this review's assigned
reading, so my campaign was designed *after* seeing it; the set below was chosen
to probe what the README's rows do not, plus to independently confirm its three
survivor claims. Fifteen runs in a scratch copy (ch06 + the two ch02 adder
files); nothing in `guide/` touched.

| # | Mutation | Result |
|---|---|---|
| R1 | `satq44`: positive clamp `8'h7f` → `8'h7e` (boundary, not in README) | **killed** (first fail: 1+127 sat=126/127) |
| R2 | `satq44`: clamp directions swapped (≈M9) | **killed** |
| R3 | `satq44`: `ovf = full[8]^full[6]` (not in README) | **killed** (−128+−64 ovf=0/1) |
| R4 | `satq44`: widening forgotten (≈M10) | **killed** (sat=x, caught by `!==`) |
| R5 | `fixmul44`: half-up adds 9 (tie off-by-one **above**, not in README) | **killed** |
| R6 | `fixmul44`: half-up adds 7 (≈M15) | **killed** |
| R7 | `fixmul44`: convergent addend keyed on `p_full[3]` (bit-position off-by-one, not in README) | **killed** |
| R8 | `fixmul44`: `p_even = cvg >> 4` (logical) | **SURVIVED — output-equivalent, same class as M16 but a row the README does not list** |
| R8b | `fixmul44`: `p_trunc = p_full >> 4` (= M16) | **SURVIVED**, confirming the README's survivor claim |
| R9 | `fixmul44`: convergent addend inverted to `{!L, LLL}` = **round ties to odd** | **killed** — by the per-pair reference check |
| R9b | R9's DUT + TB per-pair check on `p_even` deleted, **bias ledger left intact** | **SURVIVED** — ties-to-odd is direction-symmetric, so `sum_even` is still exactly 0 and `ties` is unchanged; the ledger assertions alone cannot see it |
| R10 | `tb_ovf4`: folk rule `v = cout` | **killed** (disagrees on 112/256; first fail 1+7) |
| R11 | `tb_ovf4`: ground truth `>= 7` (near-miss agreeing on 240/256) | **killed** — the exhaustive sweep catches a rule wrong on only 16 vectors |
| R12 | `tb_sub4`: not-borrow check `>` for `>=` (agrees on 240/256) | **killed** (0−0 first) |
| R13 | `tb_signtraps`: expected `shft` 127 → 63 | **killed** — the assertions are load-bearing, not narrative; if Icarus's behaviour changed, this file fails |
| R14 | `tb_satq44`: reference `wrapv = y_wrap` (= M25) | **SURVIVED**, confirming the README's golden-file-hazard claim |

Findings:

1. **The README's 25/22/3 ledger reconciles.** 25 rows counted by hand; survivors
   are exactly {M16, M23, M25} = 3; killed = 22; "twenty-seven runs" = 25 + the
   two adder-chain mutations run against both testbenches. No ch05-style
   miscount.
2. **M16's output-equivalence argument is sound and is confirmed empirically.**
   `>>` and `>>>` of the 16-bit product differ only in bits [15:12]; `p_trunc`
   keeps [11:0]; and the sweep that fails to kill it *is* an exhaustive
   equivalence proof, because every pair is compared against an independent
   arithmetic floor. R8b reproduces the survival. The reasoning is the one case
   where "survived" ≠ "stimulus gap," exactly as the README argues.
3. **The survivor class is wider than the README's one row**: `p_even = cvg >> 4`
   (R8) survives for the identical reason, and `p_halfup` would too. Not a
   defect — but the README's "menu" should say the `>>`-for-`>>>` equivalence
   applies to all three requantizer outputs, or a reader who tries R8 will
   think they found an unrecorded gap.
4. **New result (R9/R9b): the bias ledger is corroboration, not defense.** A
   rounds-ties-to-odd DUT — a real bug class, one bit inverted in the idiom —
   passes `sum_even == 0` and `ties == 8192` *exactly*, by sign symmetry. Only
   the per-pair reference comparison kills it. Worth one sentence in the README
   so nobody later "simplifies" the testbench down to the ledger.
5. Near-miss rules that agree on 240 of 256 vectors (R11, R12) are killed —
   the exhaustive sweeps genuinely earn their cost.

## Signedness traps re-measured

Every E-series claim re-measured on this machine's Icarus 13.0 this session:

- **The compile-silence claim**: `iverilog -g2012 -Wall tb_signtraps.v` produced
  zero bytes of output, exit 0 — with all five bug-class continuous assignments
  present. Re-confirmed for the other four targets individually.
- **The 49 known-answer checks all pass** and every value the chapter quotes was
  re-observed: one-unsigned-operand poisoning (`sa+u2` = 255 in 9 bits;
  `sa < u2` = 0; `sa/u2` = 126), poisoning of signed *literals*
  (`u2 * -8'sd1` = 254; `200 > -8'sd1` = 0), the **`u*0` form**
  (`(s12 + u12*0) >>> 2` = 61 — value laundered, type not), `>>>` degradation on
  unsigned (61) and its `$signed()` repair (−3), `>>` always logical on signed
  (61), the floor/toward-zero split (`-13 >>> 2` = −4, `-13/4` = −3),
  RHS-signedness widening (253/13/13/−3 rows, the folk `+ 4'sd0` repair failing),
  **`s[7:0]` part-select unsignedness** (253, and `s[7:0] >>> 2` = 63 vs whole-s
  65533 into 16 bits), `{s}` = 253, **`u < 0` constant-false** plus the unsigned
  countdown hitting the 40-iteration abort guard (signed gives 11), product
  context width (16384/0, 10000/16, literal-widened compare), `-8'd3` literal
  poisoning (−6 vs 250, equality still true), and `%d` pad widths (4 chars
  signed 8-bit, 3 unsigned).
- **The epistemic wall holds** in the section and in the closing note: everything
  is framed as measured Icarus 13.0 behaviour, not LRM truth; the
  documentation-derived claims (DSP48E1 rounding support, TI `SMPY`, MMX/NEON
  instruction lists) are flagged in place and in the sources. R13 (above)
  verifies the testbench would actually *fail* if the simulator's behaviour
  drifted — the assertions are the measurement, not decoration.
- The one signedness-adjacent overclaim found is the harness parenthetical
  already recorded under "Harness and listings."

## Pedagogy

- **The arc lands for an IEEE-754-bound reader.** Contract-over-bits → mod 2^N →
  the four signed readings with sign-magnitude and bias promoted to load-bearing →
  C/V → measured language traps → fixed point → rounding-as-policy → saturation →
  dynamic range → a bridge that reassembles a binary32 out of parts the reader has
  now used. The two best structural decisions: teaching bias as "two's complement
  with the MSB flipped" (which makes chapter 7's 127-vs-128 note land), and
  measuring rounding bias twice — uniform inputs, then the real product
  distribution — so the reader sees bias is a property of the *data*, not the
  rule. That second measurement is new beyond the research notes and is the
  chapter's strongest single exhibit.
- **Seeds are accurate promises against STATE.md's plan.** Ch7 = "IEEE 754 single
  precision in depth": the `0x3dcccccd` decode seed and the bias-127/reserved-
  endpoints seed are exactly ch7 material (and the field split is correct — see
  Numbers). Ch8 = "FP addition algorithm (align, add, normalize, round)": the
  −(−8) magnitude-path seed, the alignment-direction inversion seed, the L/R/S →
  G/R/S seed, and the C-triggers-normalize seed all name real ch8 obligations.
  The bridge's "UQ1.23 significand in [1,2)" is consistent with the chapter's own
  ARM-style Q-notation.
- **Cross-references resolve, both directions.** All nine internal
  quoted-section-title references match ch06's own headers; the five external
  ones resolve against real headers ("How Hardware Writes Numbers Down" and "The
  Combinational Toolbox" in ch01; "Writing Numbers Down", "Width and Signedness:
  The Rules That Will Break Your Adder", "Reduction Operators and the Sticky Bit"
  in ch02), and the *content* attributed to them is really there (ch01's
  complement trick, V rule and "IEEE 754 is sign-magnitude" section; ch02's `{x}`
  idiom, `1 << 40` correction, `align_sticky.v`; ch05's signed-zero corner row
  and compare-bits-print-hex doctrine — its testbenches use `%08h`). Ch05's
  "Bridge to Chapter 6" promises exactly what this chapter opens with.
  **Zero positional cross-references** ("next section" etc.) — grep clean.
- **Word count honest:** `wc -w` = 9,534, precisely as claimed. 15 `##` sections,
  marker 15/15.
- **Closing checklist audited item by item:** all 11 items are taught in the
  body — the two mirrored conversion algorithms; 6−13 with carry meaning; the
  five-column table anomalies; the three corollary derivations; the C/V quadrant
  examples and all three V forms (incl. widen-by-one); the four predict-then-run
  trap lines (all four appear in `tb_signtraps.v` with the measured answers);
  Q range/step formulas + the Q5.6 alignment answer; floor-vs-toward-zero, the
  per-k bias closed forms, and the L/R/S rule; the `{L,~L~L~L}` derivation with
  both tie directions; the README mutation menu for breaking `satq44`/`fixmul44`;
  and the 1529-vs-192.7 dB trade. No ch05-style promise beyond the body found.
- One trap-table row overclaims ("every decimal fraction off by ~1e−8"), recorded
  under Numbers. Minor: the Q1.15-multiply trap row cites the section "Fixed
  Point: The Binary Point Is a Comment" — the material is in its subsection
  "Multiplication grows, and once it grows too far"; pointing at the subsection
  would be kinder, but the reference resolves.

## Research-note audit

- **Where the chapter corrects the notes, the corrections are right.**
  (a) Notes §2.3 attributes `ripple4` to "chapter 1's actual adder"; the chapter
  correctly re-attributes the file to chapter 2 (`src/ch02/ripple4.v`) while
  crediting chapter 1 with the paper version. (b) Notes §8.2 says float32's
  "2^24 significand values are spent per octave"; the chapter's "2^23 fraction
  values per octave" is the correct count (2^23 distinct values per binade).
  (c) The chapter drops the notes' overreaching "toward-zero mean 0" framing
  exactly as notes §6.1 itself recommends, and keeps the practice-lore flag on
  the truncate-internally recommendation (§7.4 point 5). All good.
- **Where the chapter repeats the notes, spot-checked directly (beyond the full
  numeric re-derivation):** the C/V census 108/84/28/36 ✓; the seed-42 drift
  triple −45667/4188/1027 to the digit ✓; `0x3dcccccd` and its field split ✓;
  the Q1.15 corner triple (2^30, 1073709056, 2147418112) ✓; excess-8
  monotonicity + MSB-flip identities ✓.
- **The shared wrong number:** the π-in-Q3.13 "step/2 = 3.05e−5" bound is wrong
  in **both** documents (true step/2 = 2^−14 ≈ 6.10e−5); the chapter inherited
  the notes' miscomputation. This is the round's answer to "does either contain
  an unmeasured claim" — the bound was asserted, not computed, in a document
  whose neighbouring line (Q4.4's step/2 = 3.125e−2) computes the same quantity
  correctly.
- **Chapter-added claims not in the notes:** the "exponent −112" reading of
  `8'b11111111` (wrong — the notes' version of the same sentence says only
  "255 or −1"), and the trap-table "every decimal fraction" row (overclaim).
  Both defects are the writer's additions, not the researcher's.
- The notes' fetch-verified/[title-only] source discipline carries into the
  chapter's Sources section intact, including the Yates HTTP-503 disclosure and
  the sunburst-design citation hazard from STATE.md (Cummings appears nowhere in
  the chapter — no violation possible).

## Required changes for a 9+

Blocking first.

1. **[BLOCKING] Fix "the exponent −112"** ("The Bits Never Know", ¶2).
   `8'b11111111` under excess-127 is **+128**, a stored value IEEE reserves; no
   encoding in the chapter reads it as −112. Concrete fix, keeping the teaser:
   *"…or 'the exponent +128' (a value the excess-127 contract of 'Biased
   Encoding: The Exponent's Format' will turn out to reserve)."* Alternatively
   keep −112 and change the pattern to `8'b00001111`, but then the sentence loses
   its one-pattern punch — prefer the first fix.
2. **[BLOCKING] Fix the π-in-Q3.13 bound**: replace "the step/2 bound of
   3.05e−5" with **6.1e−5** (step/2 = 2^−14). Fix the same number in
   `research/ch06-binary-fixedpoint.md` §5.3 so the next chapter doesn't inherit
   it back.
3. **[BLOCKING] Qualify the float-integer-compare claim** ("Biased Encoding: The
   Exponent's Format"): as printed, "a larger-magnitude float has the lexically
   larger bit pattern" is false for opposite-sign pairs (−1.0 = `0xBF800000` >
   2.0 = `0x40000000` lexically). One clause repairs it: *"…the float's
   **magnitude bits** — everything below the sign — compare like an integer: of
   two floats, the larger magnitude has the lexically larger exponent-and-
   fraction field…"*. The downstream sentences (unsigned comparator, chapter 8's
   exponent compare) already only use the magnitude form and need no change.
4. **Weaken or make true the harness re-measurement parenthetical** ("Icarus
   reality" box): `run_all.sh` inspects the compile log only on compile
   *failure*, so a new warning would today be swallowed on a green run
   (demonstrated in this review). Either delete "(and re-measured on every
   harness run…)" / restate as "re-checked whenever the targets are compiled by
   hand with stderr visible", or — better, one line in `run_all.sh` — fail or
   report `run` targets whose compile log is non-empty, which would make the
   sentence true and turn the zero-warning finding into a regression-guarded
   property.
5. **Fix the trap-table row** "every decimal fraction off by ~1e−8 (float32)" →
   e.g. "0.1 stored ~1.5e−8 high (relative) in float32; only p/2^k fractions
   store exactly." The body already states the iff correctly; the table
   contradicts it.
6. **README, two one-line additions** (non-blocking): (a) note that the
   M16 `>>`-for-`>>>` output-equivalence applies to all three requantizer
   outputs (`p_even = cvg >> 4` survives identically — verified here), so a
   reader running the menu doesn't mistake it for an unrecorded gap; (b) note
   that the bias-ledger assertions alone cannot catch direction-symmetric tie
   errors (a ties-to-odd mutant passes `sum_even == 0` and `ties == 8192`
   exactly; only the per-pair check kills it — verified here).
7. **Nit**: `fixmul44.v` header — "[−1016, +1025]" is a bound, but the measured
   maximum is 1024; state [−1016, +1024] to match the file's measured style.
8. **Nit, STATE.md**: the resume note says `src/ch06/` has "5 `.v`"; it has
   **7** (2 DUTs + 5 testbenches; 5 build *targets*). Worth correcting before it
   is quoted forward.

## Tree restoration proof

- Baseline: SHA-256 of all 124 files under `guide/src` taken before any
  mutation work (`baseline.sha256` in the session scratchpad).
- All mutation and harness-demo work ran in scratchpad copies
  (`scratchpad/mut/`, `scratchpad/harnessdemo/`); every mutated file was
  restored from its `.bak` in the scratch copy itself and re-run green
  (sanity runs recorded above). Nothing under `guide/` was ever edited.
- Final check, this session: `sha256sum -c baseline.sha256` → **124/124 OK, 0
  mismatches**; `git -C /home/user/erancihan status --short` shows exactly one
  entry: `?? guide/reviews/ch06-review.md` (this file). The tree is clean of
  review-side changes.
