# Chapter 9 review — round 1

<!-- sections complete: 10/10 -->

Reviewer persona: RTL veteran who recompiles every listing. Environment: iverilog/vvp 13.0
at /usr/local/bin, Linux x86-64, python3 3.11. All mutation and scratch work in the
session scratchpad; guide/src SHA-256 baselined before any experiment and restored after.

## Verdict

**Score: 9/10 — fit to ship. Nits only; no blocking defect found.**

I recompiled every module, re-ran every shipped testbench cold (6/6, then the full
regression 92/92, both from scratch), and ran my own independent adversarial sweep:
141,936 checks with my own seed and my own vector families (44-word corner cross both
orders, plus seven random regimes including tie-shaped and clamp-boundary d = 23..28
families the chapter's benches do not use), comparing `fp32_add2` three ways — against
`fp32_add_alg`, and both against an exact `fractions.Fraction` + hand-RNE python model,
flags included. **Zero mismatches in all three directions.** The design is genuinely the
research's proven split, not a re-derivation.

I then re-ran the mutation record adversarially: 24 of the 33 recorded mutations
reproduced on my copies (every one I tried), several byte-identical to the recorded
first-failure lines and mismatch counts (60,980 / 168 / 20,573 / 19,795 / 2,689 / 6,890 /
exactly 4 flag-only latch kills). The common-mode story reproduces end to end and its
6,890/100,000 rate is arithmetically consistent with an independent incidence measurement
(6.913 % on my own seed). The two false-pass traps (T-E1 against the undriven-net design
AND against the double-driven design) reproduce exactly as claimed. Every transcript I
re-captured — the W1 trace, the corner bins, the sNaN exclusions, the sizer inventory
with its quirk lines, the blif failure, the warning texts, the signedness probes, the
X-propagation table — matched the chapter byte-for-byte or value-for-value.

This is the strongest chapter of the eight I have seen referenced in this project's
review history: for once, every claim I could operationalize was *under*-stated nowhere
and over-stated nowhere. The defects that remain are a mis-resolving positional
cross-reference, one stale number in ch08's bridge that this chapter silently corrects,
and a numbers-transposition inside the research notes. All are listed with fixes below;
none is in the shipped RTL, the testbenches, or the chapter's measured claims.

## RTL audit

**Compiles.** Every module compiled individually at `-g2012 -Wall`: zero output on all
eight (`fp32_unpack` + ch07 fields, `fp32_screen` + ch07 class, `fp32_swap`,
`fp32_align` + ch02 core, `fp32_addsub`, `fp32_normalize`, `fp32_round_pack`, and the
full `fp32_add2` elaboration). The cold harness run: `run_all.sh ch09` = 6/6 in 31.5 s
(README says 31 s — accurate); full repo = 92/92, exit 0.

**Width audit against the 28-bit budget — done by hand, all clean.**
- `fp32_align`: `d[7:0] = e_big - e_sml` is 0..253 under the swap invariant; the clamp
  `(d > 26) ? 26 : d[4:0]` narrows only values ≤ 26 — no silent truncation. `align_sticky
  #(24,5)` needs `2^SHW > W+2 = 26`; 32 > 26 holds, and the ch02 generate-`$fatal` would
  reject a violation at elaboration.
- `fp32_addsub`: `{1'b0, sig_big, 2'b00}` and `{1'b0, aligned, g, r}` are both exactly
  27 bits; the borrow term `{26'd0, s}` is 27 bits. No context-width surprises.
- `fp32_normalize`: `shl8 = min(lz, e_lim)` is ≤ 26 in every case (whichever mux arm wins
  is bounded by `lz` ≤ 26), so `shl8[4:0]` is a provably value-preserving narrowing — the
  one place a reviewer must stop and prove it, and it proves. `e_lim = e_big - 1` cannot
  wrap because `e_eff = max(E,1) ≥ 1`. `e_norm` 9-bit arithmetic: `e_big + 1 ≤ 255` on
  right-1 and `e_big - shl ≥ 1` on the left path — both in range.
- `fp32_round_pack`: `rsig` 25-bit, `e_rnd = e_norm + renorm ≤ 256` needs and gets 9
  bits; `ovf = e_rnd > 254` sees 255 and 256 undistorted. Subnormal round-up into
  `fsig = 800000` correctly packs E = 1 via the `fsig[23]` arm (min-normal), and the
  `fsig[23] == 0` arm packs E = 0 legitimately because rounding only increases and the
  normalize invariant pins `nsig[23] | (e_norm == 1)`.
- `fp32_screen`: the NaN result `{nan_src[31], 8'd255, 1'b1, nan_src[21:0]}` is exactly
  32 bits; I confirmed the 7FA00055 → frac 600055 path against tb_short's constant.

**Combinational discipline.** The seven modules plus top contain no `always` block at
all — the all-`assign` claim is literally true; the only procedural code is the `lzc26`
function, which reads nothing but its argument (audited; the chapter's own rule).
Ternary chains in screen and round_pack are full-cover (final `:` arm present
everywhere). No inferred latch exists to find; the deliberately-taught one (I-6) lives
only in the chapter's scratch probe, which I rebuilt myself — see the mutations section.

**Top wiring.** `fp32_add2` instance-by-instance against the port map: all seven
instantiations connect by name, every connection width-matched (checked against each
module's declaration), and the top owns exactly the screen mux, two flag gates, and the
`invalid` pass-through — the "three assigns plus a pass-through" claim is exact.

**Cut-width table re-derived independently**: 66/61/39/38 datapath bits + 34-bit screen
side channel (1+32+1) = **100 / 95 / 73 / 72** — all four totals confirmed from the
shipped port declarations, not the chapter's numbers.

**The design is the research's proven split.** My independent three-way sweep (details in
the next section) and the byte-identical reproduction of the recorded mutation kills both
say this is the prototype the notes measured, carried over intact. The swap-variant
claims also verify: the `{eb,sigb} > {ea,siga}` unpacked-compare variant passes the full
100,092-check sweep (rebuilt and run), and the 2,048-case monotonicity check reproduces
(`strictly monotone over all 2048 (E,F): True`, my own script).

One genuine-equivalence observation of my own, offered as color, not defect: mutating the
swap to `>=` (spurious swap on equal magnitudes) also survives the full sweep — correctly
so, since equal-magnitude unlike-sign pairs fall to the exact-zero +0 rule and
equal-magnitude like-sign pairs have equal signs. The chapter's swap invariant wording
("`{e_big, sig_big}` is the larger magnitude") stays true under it. No text change
needed; the record does not claim mutation-exhaustiveness.

## Equivalence verification

**Cold run.** `tb_equiv` compiled with zero output and passed:
`SEED=9090` / `PASS tb_equiv (92 corner checks + 100000 random, split == golden
bit-for-bit incl. flags)` — 20.3 s standalone (chapter says 20.6 s; consistent). The
corner-phase literal guard (92) and the total guard (100,092) are both present and both
fire when provoked (see mutations). The 46 `pair()` corners in tb_equiv are the identical
set to `tb_corners_split`'s and to ch08's `tb_corners.v` (diffed all three: identical).

**Testbench mutations, re-run by me on scratch copies:**
- `!==` → `!=` AND X-guard deleted, vs the `s_a1` undriven-net design: **false PASS
  across all 100,092 checks** — T-E1's recorded trap, reproduced verbatim.
- Same weakened bench vs the double-driven design (`assign result = dp_res;` added):
  **false PASS again** — the second recorded false pass, reproduced.
- `!=` but X-guard KEPT, vs the typo design: killed immediately
  (`3fc00000+bfc00000: X in outputs: split 00000000/00x`) — T-E2 confirmed; the guard
  alone closes the hole.
- Shipped bench vs typo design: first kill and count byte-identical to the record —
  **60,980** X-contaminated mismatches. Compile is totally silent without `-Wall`.
- Shipped bench vs double-driven design: compiles with **zero bytes of output at
  `-Wall`**, killed with exactly **168** mismatches, every displayed one a screened
  vector with partial-X (`split 7fX000XX`) — I-5 confirmed to the digit.
- One corner pair deleted → `corner phase ran 90 checks, expected 92` (T-E3);
  `N_PER_REGIME = 0` → `92 checks ran, expected 100092` (T-E4). Both guards live.

**My own independent sweep — the part no shipped artifact could fake.** Generator seeded
`random.Random(20250820)` (not the chapter's 9090/777): 1,936 curated corner pairs (44
adversarial words crossed both orders, including sNaN payloads, subnormal boundaries,
max-finite, and the four renormalize reachers' operands) + 140,000 random pairs across
seven regimes — the chapter's five plus two of my own aimed where this design would hide
a bug: tie-shaped vectors (low fraction bits zeroed, d = 22..28) and clamp-boundary
vectors (d ∈ {23..28} exactly). A dump testbench drove **both** adders; a python referee
using `fractions.Fraction` exact arithmetic with hand-rolled RNE (subnormals, overflow,
flag semantics modeled from the IEEE rules, NaN propagation modeled from the screen
spec) checked every line, plus an any-x/z scan. Result:

```
total: 141936  golden-vs-split mismatches: 0  split-vs-exact-model mismatches: 0
```

No three-way disagreement anywhere, result bits and all three flags. The 200,092-check
prose claim also verifies: I rebuilt the 40,000-per-regime variant and it passed the
200,092-count guard in 41.0 s (chapter says 40.8 s; README's reason for shipping 100k —
the 60 s SIM_TIMEOUT — is sound and honest).

**NaN-sign stance is correct both ways.** tb_equiv compares NaN sign RTL-vs-RTL
(deterministic propagation — legitimate, and the chapter defends the distinction
explicitly); tb_short and tb_corners never compare a generated NaN's sign. My python
referee reproduced the DUT's NaN bits exactly, confirming the propagation is
deterministic and the RTL-vs-RTL full-equality standard is safe.

## Common-mode story

Reproduced in full, on scratch copies of both files:

1. `round_up = ng & (nr | ns | lbit)` → `ng & (nr | ns)` applied to **both**
   `fp32_add_alg.v` and `fp32_round_pack.v`.
2. `tb_equiv` against the doubly-wrong pair: **PASS, all 100,092 checks** — the sweep
   cheerfully certifies the shared bug, exactly as claimed.
3. `tb_short` against the doubly-wrong split, shipped seed 777: killed with exactly
   **6,890 mismatches in 100,000**, first kill byte-identical to the record:
   `196ad232+98baf931: dut 190d5599 ref 190d559a`.

**Incidence sanity check — the 6.9 % number is real, not a coincidence of the seed.**
The mutant differs from RNE exactly when the exact sum lands on a tie (G=1, R=S=0) with
an odd keep-LSB. I measured that event's probability independently: an exact-arithmetic
python scan over 100,000 fresh pairs drawn from the same five regime shapes with my own
seed (424242) found the tie-and-odd condition **6,913 / 100,000 = 6.913 %** — within
0.03 points of the recorded 6,890 (binomial σ ≈ 0.08 %). The rate is dominated by the
close-exponent and subnormal regimes, where a d ≤ 1 alignment leaves R = S = 0 and G
live about half the time — structurally plausible and now measured twice.

The chapter's framing — "an equivalence sweep proves 'same as chapter 8', not
'correct'" — is exactly what these three runs show, and the division-of-labor table
(flags unverifiable through the shortreal reference; NaN payloads class-only) is
accurate: the shortreal path indeed has no flag outputs to check.

## Mutations and survivors

**My own campaign first** (all on scratch copies, before reconciling with the README):
swap comparator inverted → tb_equiv kill on the first subnormal corner; align clamp
25/25 → tb_align_u kills at d = 26/27/200; addsub borrow dropped → kill with the exact
recorded message (`got 0fffffd/0 want 0fffffc/0`); normalize clamp deleted → kill with
the exact recorded message (`e_norm` 509); round G-only → kill on the tie-lbit=0 row;
overflow threshold 255 → the recorded **flag-only** kill plus a second flag-only kill on
the renorm-into-overflow row; screen priority inverted (inf before NaN) → tb_corners
kill on `ffc00001+7f800000`. Seven for seven, every kill on a directed vector.

**Recorded rows re-run** (kills byte-identical where the README quotes a message):
I-1 (borrow, full design): first kill `3f800001+b3800001` inside the corner phase,
**2,689** mismatches. I-2 (`sum27` → 26 bits): two "Padding 1 high bits" warnings, then
`4b7fffff+3f800000: split 00000000/000`, **20,573** mismatches. I-4: 60,980. I-5: 168,
zero compile output. I-6 (latch — I rewrote the procedural normalize myself from the
chapter's description): zero compile output at `-Wall`, then **exactly 4 mismatches of
100,092, all flag-only (`00000000/001` vs `/000`), all exact-cancellation corners,
first kill identical to the record**. I-7: previous section. R-M3's fabricated-qNaN
probe: at `nsig = C00000` exact, `e_norm = 255`, the mutant packs `7fc00000` with both
flags low — measured, exactly as written.

**The masking pair, both directions, reproduced:**
- B-M2 (`exact_zero` gate dropped): killed by the zero-ADD unit vector; then placed in
  the full design and run through the complete 100,092-check sweep — **PASS**. The
  structural-mask argument (`eff_sub = 0` with `sum27 = 0` needs both operands zero,
  which the screen owns) is airtight; I also note big27 ≥ 4 for any unscreened operand,
  so a zero sum on an effective add is unreachable outright.
- G/R convention: I built the `{aligned, r, g}` addsub AND the author's self-consistent
  unit bench (vector 3 expectation 2 → 3; the other five vectors are G/R-symmetric, which
  is itself worth knowing): `PASS tb_addsub_wrong (6 directed, author convention)`,
  `PASS tb_align_u (9 directed)`, then tb_equiv kills — first kill
  `3f800000+33800001: split 3f800000/001 golden 3f800001/001`, **19,795** mismatches.
  Unit-only kill and integration-only kill both stand.

**The four survivors, scrutinized hard:**
- **A-M5 (clamp 27).** The written reason survives scrutiny and is actually *stronger*
  than "measured over the sweep": `align_sticky` saturates at `SH_MAX = W+2 = 26`
  internally, so shamt 27 and 26 are identical **for every input** — the equivalence is
  a theorem of the composed pair, input-class-independent; no sweep gap can exist. The
  README states the structural reason first and the sweep as confirmation, which is the
  right order. The "wrapper believes it owns `shamt ≤ 26`" spec-vs-output framing is
  fair, and the shipped comment names the overlap.
- **N-M4 (`right1 = carry`).** I verified the upstream invariant myself: on an effective
  subtract, s = 1 needs d ≥ 3, which forces the big operand normal and
  `sml27 < big27`, so `big27 - sml27 - s` can neither go negative nor set bit 26; for
  d < 3, s = 0 and `big27 ≥ sml27` by the swap. The survivor is genuinely equivalent,
  and the refusal to drive the impossible input in the unit bench is the correct call —
  the invariant is written at the `fp32_normalize` header as promised.
- **I-3 (e_norm narrowed).** Verified: warnings byte-identical with and without `-Wall`
  (the "ungated" claim), sweep passes 100,092/100,092. The "zero-output rule resolves
  it" reasoning is **not** a non-sequitur: the warning is unconditional, the harness
  fails any run target with any compile output, so the narrowing cannot ship through
  the manifest — I confirmed the rule is what the harness actually implements. The
  chapter is also honest that the truncation is only benign *today* (the ninth bit's
  consumer is inside `fp32_round_pack`).
- **T-E1.** Not a survivor in the design sense but the preserved false-pass
  demonstration; reproduced twice (undriven and double-driven). Counting it as the
  fourth "survivor" is slightly odd bookkeeping, but the README says exactly what it is.

**Ledger check:** 17 + 7 + 9 = 33; kills 15 + 6 + 8 = 29; survivors A-M5, N-M4, I-3,
T-E1. Recounted from the tables; arithmetic correct.

## Testbench honesty

- **Watchdogs**: all six benches carry time-based watchdogs (`#100000` on the unit
  benches, `#1000000` on tb_corners_split, `#100000000` on the two sweeps), each with a
  FAIL display plus `$fatal` — no clock-edge counting anywhere; consistent with the
  harness's grep-for-FAIL policy and its own 60 s wall clock.
- **Count guards vs literals**: 9 / 6 / 16 / 92 (corner phase) / 100,092 / 92 / 100,000
  — every one a literal, every one shown able to fire (T-E3, T-E4, T-U2, T-S1, and my
  own re-runs).
- **Seed discipline**: both random benches do `seed = SEED; dummy = $urandom(seed);` —
  seeded once, first draw discarded, seed echoed via `$display("SEED=%0d", SEED)`.
  Regime generators are line-for-line ch08's `tb_random` shapes (diffed against
  `ch08/tb_random.v`).
- **NaN handling**: tb_corners checks class + quiet bit + payload and never bit 31;
  tb_short compares NaN-vs-NaN by class only; the sNaN operand is built from bits; the
  pure-round-trip quieting assertion (`7fe00000`) is checked, the host-quieted payload
  line is displayed but **not** asserted, exactly as the chapter says.
- **Coverage gate, verified against DUT wires, not comments**: I drove the four named
  reachers (`4B800000+B3800000`, `4B000000+BDFFFFFF`, `3FFFFFFF+33800000`,
  `7F7FFFFF+73000000`) into `fp32_add2` in both orders while sampling
  `dut.u_round.round_renorm` directly: **renorm = 1 for all eight applications**,
  matching `round_renorm=8` in the bins line. Deleting the four (guard dutifully 84)
  zeroes the bin and the gate `$fatal`s (T-C1 reproduced: `round_renorm=0
  sticky_sat=4`); deleting the `sample_bins` calls empties every bin (T-C2 reproduced).
  The 13-reference claim checks out: exactly six submodule-aimed
  (`u_norm.right1`, `u_norm.shl`, `u_round.round_renorm`, `u_align.shamt`,
  `u_round.round_up`, `u_round.fsig`) and seven top-level, and ch08's tb_corners used
  the same 13 names un-prefixed (grepped both). A stale reference really is an
  elaboration error naming the wire (reproduced: `Unable to bind wire/reg/memory
  'dut.right1'`).
- **Unit constants**: T-U1 (one ulp bent) kills — the python-derived constants are
  load-bearing. I additionally re-derived the align and addsub expectations by hand
  (shift arithmetic and the borrow theorem) and via my exact model for the corner
  library: all agree.
- **tb_short's display cap**: value mismatches capped at 5, NaN-class mismatches
  uncapped — a latent flood risk if a NaN-class bug ever fires, but every NaN path is
  screened and corner-checked; cosmetic at most.

## Transcripts, listings, craft

**Listings**: all 9 fenced Verilog blocks extracted mechanically and matched — every one
is a byte-identical contiguous slice of its named shipped file (unpack 20 lines, screen
10, swap 7, align 6, addsub 5, normalize 12, round_pack 13, top 4, tb_equiv cmp core 9).

**Transcripts re-captured this session, all matching:**
- The opening W1 trace (`3FC00000 + 40100000`): rebuilt the boundary-printing bench;
  all seven lines byte-identical to the chapter.
- tb_corners bins lines: `right1=12 left>=2=8 round_renorm=8 sticky_sat=8` /
  `tie_up=12 tie_down=4 subnormal_res=6 overflow_res=6` — identical.
- tb_short exclusion lines: all three identical, including the honest note that
  `7fe00055` is architecture-dependent (the README flags it too).
- Both warning texts (`Port 9 (e_norm) ... expects 9 bit(s), given 8.` + `Padding 1 high
  bits of the port.`) and the three-configuration misspelled-net table, including both
  error lines and exit codes (0/0/2) — verified verbatim.
- Signedness probes: A–G reproduce exactly; H reproduces (`-156`) once the difference is
  taken in a ≥ 9-bit signed context, which is the probe the chapter describes (`sd` as a
  signed 9-bit port). All probes compile with zero diagnostics in that shape.
- X-propagation table: five of six rows re-driven (clean, sign-X, frac-LSB-X, qNaN+allX,
  inf+allX); every value matches including the headline `signX → 34000000 / flags 000`
  and `sum27 = XxxxxxX`.
- Sizer: quirk lines verbatim (`SIZER: The root scope $unit must be a module.` +
  `error: Code generation had 1 error(s).`) and the report still written; per-module
  gates 528/193/163/125/26+98/332, lzc26 = 0, totals 1761 gates 0 FFs, MUX[2] 570
  slices, LPM 8 unaccounted (1+1+5+1) — all confirmed; golden = 1995 gates confirmed;
  `-t blif` fails with the exact quoted `sorry: ivl_lpm_type(net)==14 not implemented.`
- always_comb sensitivity probe: rebuilt independently; `@*` stale at t2 (`shl=4`),
  `always_comb` correct (`shl=2`), recovery at t3 — the ch13 seed is real in this
  simulator.
- Timing claims: tb_equiv 20.3 s vs claimed 20.6; tb_short 10.6 vs 10.6; 200k variant
  41.0 s vs claimed 40.8; harness 31.5 s vs README's 31. All honest.
- Abridgements: declared where made ("Abridged from this session's run", "an event-count
  line ... is elided", "file-and-line prefixes trimmed"). Correct.

**Cross-references**: every quoted title resolves — ch02 "Reduction Operators and the
Sticky Bit" and "Width and Signedness: The Rules That Will Break Your Adder"; ch03 "The
Accidental Latch"; ch04 "The Anatomy of a Testbench" and "Checking, and Making Failure
Impossible to Miss"; ch06 "Signedness in Verilog: Silent, All of It"; ch07 "The Hidden
Bit and the Subnormal Ramp" (and the ch07 seed note naming chapters 9/12 exists); ch08
"The Width Budget: 28 Bits", "The Effective Operation and the Sticky Borrow", "How
Production Adders Rearrange It", "Order Is Part of the Answer", "The Reference Model
Verdict for Chapter 9", W1's pair, and M16 — all verified in the source chapters.
**One violation**: the masking-matrix row "only oracle-visible **(next section)**" is a
positional reference, and it resolves wrongly — the next section is "X-Propagation…";
the oracle story is two sections later in "The Regression: Corners Carried Forward,
Oracle Kept Independent". Nit-level but it is both a rule breach and factually off by
one.

**Seeds for later chapters**: cut budgets 100/95/73/72 restated correctly in the bridge
(re-summed from the ports); the ch10 `exact_zero` watch-item, ch11's re-timing note, and
the ch13 always_comb seed are all accurate. **Closing checklist** ("What You Should Be
Able to Do Now"): audited item by item — every skill named is actually taught and
measured in the chapter; no orphan claims. **Word count**: `wc -w` = 9,764, matching
STATE.md's entry. **Epistemic wall**: the synthesis section is scrupulous — sizer
output flagged as an elaboration inventory, the literature-derived path description
flagged as documentation, the 1,995-vs-1,761 sharing observation correctly bounded
("whether a synthesizer preserves it is exactly the kind of thing this environment
cannot say"). **Sources**: the one linked web source matches the fetched-quote in the
notes; IEEE/book references are by title with no link asserted — consistent with the
project's citation rule.

## Research-note audit

Spot-checked well beyond six claims across sections 2–12 of
`research/ch09-two-input-rtl.md`, both directions:

1. **Cut-width table** (notes §3): identical numbers to the chapter; independently
   re-summed — correct. Chapter upgrades "hand-checked twice" to "machine-checked this
   session"; my machine check agrees, so the stronger wording is covered.
2. **Equivalence sweep at 200k** (notes §4): 41.9 s there, 40.8 s in the chapter, 41.0 s
   here — consistent across sessions; the ship-100k reasoning carried into targets.txt.
3. **Masking measurements** (notes §7): B-M2, A-M5, N-M4, G/R scenario — all four
   reproduced this session; the notes' extra second kill line for the G/R scenario
   (`3f800000+bf7fffff`) is consistent with my run.
4. **Reference-strategy table and common-mode numbers** (notes §8): 6,890/100,000 and
   the first-kill line match my runs exactly; the flags-unverifiable claim is true.
5. **Latch experiment** (notes §9): reproduced to the digit (4 flag-only, 0-in-random,
   assignment-order dependence described identically in chapter and notes).
6. **Coverage carry-forward** (notes §10): 13 references, six re-aimed — verified against
   both testbench files; T3c re-verification reproduced.
7. **Sizer/blif** (notes §11): all numbers and quirks reproduced; chapter's elaboration
   time 0.012 s vs notes' 0.014 s — separate sessions, both sub-noise; fine.

**One real notes-side defect (chapter is correct, notes are wrong):** §12 item 5 says
the `!=` bench false-passed "(a) an undriven-net design (**168** X-contaminated real
mismatches missed) and (b) a double-driven-net design". The 168 belongs to the
double-driven design; the undriven-net design produces **60,980**. The chapter and the
src README both attribute the numbers correctly — the notes transposed them. Fix the
note so a future chapter quoting it does not inherit the swap.

**One inherited stale number in ch08 (not a ch09 defect):** ch08's "Bridge to Chapter 9"
says "the 45-pair corner library". The library is 46 pairs — ch08's own body text
(46 pairs × both orders = 92) and its shipped `tb_corners.v` agree, and ch09 correctly
says 46 everywhere. The 45 likely predates the M16 campaign fix that added
`3FFFFFFF+3E800009`. Belongs on ch08's erratum list; ch09 need not change.

## Required changes for a 9+

No blocking items. The score is 9 on the strength of my own runs; the items below are
the gap to a flawless round, in priority order.

1. **Fix the mis-resolving positional cross-reference** (chapter, masking-matrix table,
   row 5): "only oracle-visible (next section)" → "only oracle-visible (see 'The
   Regression: Corners Carried Forward, Oracle Kept Independent')". It is the chapter's
   only positional reference and it currently points at the wrong section (the next
   section is the X-propagation one).
2. **Fix the transposed mismatch counts in the research notes** (§12, item 5): the
   undriven-net false pass hid 60,980 X-contaminated mismatches; 168 belongs to the
   double-driven design. Chapter and README are correct; only the note is wrong.
3. **File the ch08 erratum**: ch08's bridge says "45-pair corner library"; the shipped
   library ch09 inherits is 46 pairs (ch08's own body says 46). One-word fix in ch08,
   noted here because ch09's "46, unchanged" claim is the correct side of the conflict.
4. *(Optional, one clause)* The swap section justifies why align gets the chapter's
   first unit testbench, but never states outright that `fp32_swap` (like unpack and
   screen) deliberately has none and what covers it — the corner library and the sweep
   kill swap mutants instantly (I measured the inverted compare dying on the first
   subnormal corner). One sentence naming that coverage would close the only contract
   left implicit.
5. *(Optional)* tb_short's NaN-class mismatch branch prints without the `<= 5` cap the
   value branch has; a NaN-class regression would flood the log. Harmless today (the
   path is screened and corner-gated); a one-line cap would make it symmetric.

## Tree restoration proof

- Baseline: SHA-256 of all 155 files under `guide/src` recorded to the session scratchpad
  **before** any experiment.
- All mutation and probe work (198 scratch files: mutants, weakened benches, probes, my
  sweep generator/referee) lived exclusively in the session scratchpad; no shipped file
  was ever edited — mutants were built from copies.
- Final verification: `sha256sum -c` over the baseline — **155/155 OK, 0 mismatches**.
- `git status --short` shows only `guide/reviews/ch09-review.md` (this deliverable; a
  project checkpoint process committed its 1/10-section skeleton as bb315e2 mid-review,
  so it appears as modified rather than untracked). No change to `guide/src`,
  `guide/chapters`, or `guide/research` from this review session.
- Final cold re-run after all experiments: `run_all.sh ch09` → 6/6 (re-confirmed on the
  untouched tree at review start; tree hash-identical since).
