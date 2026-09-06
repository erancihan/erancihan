# Chapter 12 review — round 1 (RTL veteran)

<!-- sections complete: 12/12 (post-fix verification appended 2026-08-21) -->

## Verdict

**8/10 — real defects, none blocking; one fix round should close.**

Method: I recompiled and re-ran every shipped target (5/5 in harness, full repo
**108/108 cold** under `SIM_TIMEOUT=120`), then attacked the chapter with my own
instruments before reconciling with its record: a 120,026-quad transcript from the
*pipelined* flagship at my own seed checked against two models — the shipped
`oracle.py` and **my own from-spec reference built on a different mechanism**
(host-FPU binary64 + struct round-trip, Fraction only for the inexact test) — zero
mismatches on 724,122 vectors total; my own 604,096-vector shipped-vs-B-M2
transcript diff (4,096 exhaustive over an 8-value special alphabet plus 600,000
aimed cancellation-born-zero rounds, seed 424271) — **zero divergence**; a 1M-quad
census at 200k/regime with my seed that reproduces the S3 pricing under BOTH the
chapter's and the notes' regime constructions; hand re-derivation of the S1 port
census, the 27-count arming arithmetic, the 336-bit register count, and all five
D9 proof steps against the shipped RTL; five design/library mutations of my own
(port-map swap, flag-OR drop, valid-bit lag, corrupted expectation, hand-edited
`.vh`) — all killed or caught; three coverage-guard attacks of my own — two killed,
**one survived** (the first real defect); and byte-stability regeneration of all
five `.vh` libraries — clean.

What keeps this at 8 rather than 9 is the project's own recurring defect class,
twice, in the chapter's two flagship artifacts:

1. **The coverage guard's straddle discipline is claimed complete and is not.**
   Widening the `|expdiff| <= 2` bucket boundary to `<= 3` in `tb_cov4.v` alone —
   a one-character m5-class silent edit — **passes the entire shipped run** (pins
   MATCH, 105/105, PASS), because the directed library carries a d=2 vector but
   nothing between d=3 and d=24. `tb_cov4.v`'s header says the library "straddles
   every bin boundary adjacently"; the chapter's closure statement says "its
   boundaries are straddled". Both are measurably false for this boundary.
2. **S4 quotes ch10's 7.095 % inexact over-report without its conditioning.**
   Ch10's figure is win2-clustered, bit-agreeing quadruples only (its own text:
   0 % full, 0.362 % win10, 7.095 % win2). I measured the rate at 0.000 % on
   200k full-range quads (and ~2.4 %/~10.1 % under my win10/win2 constructions).
   S4 and the ch14 seed state 7.095 % unconditioned — a claim stronger than its
   measurement, in the specification of record.

Everything else I attacked held, usually to the digit: the port-mapping census,
the signed-zero rule, NaN payload priority, the underflow-omission proof (my own
300k-pair check: 0 inexact among 14,470 tiny results), the D9 proof and both
required survivals, the 27× and 38× kills, the m1-m9 battery rows I re-ran
(m1, m4, m7 — kill lines byte-identical), g1 (10,790/61,037, first kill cyc 7,
same line), DM5/DM6 (16.3 %, result-changed = 0, 9,424/505), both closure demos
(hole lists identical down to the s1_ovf_ab luck note), the 101k headline PASS
line (byte-identical), and first/last-transaction scoring (I corrupted exactly
retire #0 and exactly retire #60,991; the scoreboard caught each as 1 mismatch).

## Specification audit (S1-S10)

Every citation resolves and every load-bearing clause reproduced under my own
measurement. Citations first: all 21 quoted section titles used by ch12 exist as
headers in the named chapters (ch05 ×3, ch07 ×1, ch08 ×2, ch09 ×2, ch10 ×7,
ch11 ×6 — grep-verified). Reverse direction: ch05 really says "it is chapter 12's
checklist" and "a specification decision chapter 12 must make in writing"
(verbatim), and the M18 quote traces verbatim to `src/ch05/README.md:158-159`.

**S1 (port mapping, worked by hand then measured).** From the spec alone: the two
+max operands land in the same level-1 adder in exactly C(2,2)-type arrangements
(+,+,−,−) and (−,−,+,+) → both level-1 sums overflow to ±inf → `inf + (−inf)` →
qNaN with invalid+overflow+inexact = 111; the other four arrangements pair one
+max with one −max per adder → two exact cancellations → +0/000. Measured on the
pipelined RTL through my own probe (all 6 orders at the head of my 120k
transcript): rows 1 and 6 give `7fc00000 111`, rows 2-5 give `00000000 000` —
**2 → qNaN/111, 4 → +0/000, exactly as S1 says, and exactly the two orders my
hand derivation names.** My e1 mutant (interleaved port map, forbidden by S1)
dies in `tb_corners12` on 9 vectors, the first being the MULTI rows — the clause
is regression-guarded, not narrated.

**S3 (three roundings, honestly priced).** Re-measured at 200,000 quads/regime,
my seed (20260821555), via the shipped exact oracle: full-range **98.37 %**
(chapter: 98.35; notes: 98.29), ±2 window **68.25 %** (chapter: 67.96), ±10
window **72.09 %** (chapter: 72.10), 2-wide window **73.31 %** (notes: 73.12),
10-wide window **69.32 %** (notes: 69.49). So BOTH the chapter's numbers and the
research notes' numbers reproduce — they are different window *constructions*
(±2/±10 vs 2-wide/10-wide), and the chapter's warning that the worse-window
direction flips between constructions is itself confirmed by my run (win2 > win10
under one construction, pm2 < pm10 under the other). The operative spec claim —
clustered traffic misses the correctly rounded sum on a fifth to a third of
quadruples — holds under every construction tried (misses 26.7-31.8 %). One
prose defect noted in Craft: the chapter quotes seed 20260821 with numbers that
differ from the notes' same-seed table without saying the window construction
changed. The S2 worked example (`4B800000 + 3×1.0` → composed `4B800001`/001 vs
CR `4B800002`) re-derived by hand: exact sum 16,777,219 ties to 16,777,220; the
level-1 tie rounds to even at 2^24, losing the 1.0. Both confirmed on RTL (c1's
kill line shows the suite pinning 4b800001/001).

**S4 (flags).** Composition-OR verified structurally (three ORs in the RTL; my
e2 drop-level-1-invalid mutant dies on 19 corner vectors). **Underflow omission
re-proven with my own experiment**: 300,000 cancelling pairs biased to exponents
1-30, 14,470 produced subnormal/zero results, **0 raised inexact** — tiny sums
are exact, so tiny-AND-inexact never fires; the ch07 citation ("The Flags an
Adder Can Actually Raise") resolves and its 0-in-400k record is consistent.
**One-directionality of inexact**: I searched 1,000,000 quads across five
regimes for a case with `inexact = 0` and result ≠ exact sum — **zero found**,
matching the two-line theorem. **Defect (required change 2):** the 7.095 %
over-report figure is quoted without ch10's conditioning. Ch10.md:247 states the
rate as 0 (full) / 0.362 % (win10) / 7.095 % (win2), over *bit-agreeing* quads;
my own measurement of that statistic: **0.000 % on 200k full-range** bit-equal
quads, ~2.4 % win10, ~10.1 % win2 (my constructions). S4's sentence — "on
7.095 % of quadruples whose composed result bits happen to equal the correctly
rounded sum" — presents a win2-only figure as unconditional. Same defect in the
ch14 seed paragraph.

**S5 (NaN policy).** Measured on the pipelined RTL, my probes: four distinct
qNaN operands → `a`'s payload (`7fc00011`), flags 000 (propagation is not
invalid); NaNs in c and d only → `c`'s (`7fc00033`); sNaN `7FA00077` in d →
`7FE00077` + invalid; qNaN in a vs sNaN in b → a's payload `7fc00099` WITH
invalid — priority a > b > c > d confirmed, quiet bit forced, payload [21:0]
preserved. The corner suite's NaN modes (1: class+quiet+payload, 2: class+quiet)
never compare sign — read from `tb_corners12.v` lines 67-69.

**S6 (signed zero).** All 16 signed-zero quads exhausted on the pipelined RTL:
15 give `00000000`, only the all-`−0` quad gives `80000000`, flags all 000 —
**−0 iff all four −0, exactly**.

**S7/S8 (latency 4, control-only reset).** Latency 4 verified three independent
ways: the shipped corner protocol (out_valid low exactly 3, high exactly 1 —
642 FAIL lines the moment my e3 mutant added one cycle of lag), my own
back-to-back dump bench (retire index = drive index − 4, count-guarded), and the
first/last-retire corruption probes (caught at cyc 4 and cyc 62,019). Reset
audited in the RTL: `vpipe` is the only reset domain in `fp32_add2_p2`; the
flag delay line and all data banks free-run; post-reset staleness is masked by
the out_valid gate per S7's own wording.

**S9/S10.** The verification obligations all exist as shipped runs (both
streaming proofs, the 321-quad suite, the 105-bin model, five targets); the
out-of-scope list matches what the kit actually does not test. The 336-bit
figure recounted from port lists: bank1 = 1+1+1+1+8+27+1+1+32 = 73, bank2 = 35,
vpipe = 2 → 110/unit; ×3 + 6 flag flops = **336** ✓.

## Design audit (fp32_add4)

**No drifted copies.** `fp32_add4`'s module body is character-identical to
ch11's `fp32_add4_tree_p` modulo the module name (mechanical diff with the name
normalized: zero differences). The manifest compiles the actual `../chNN` files
— `align_sticky` (ch02), `fp32_fields`/`fp32_class` (ch07), the seven ch09
stages, `fp32_add2`, `fp32_add2_p2` (ch11), plus the ch10 oracles — no local
copies of any datapath module exist in `src/ch12/`. "Zero new arithmetic lines"
is literally true: the chapter's only owned logic is the f1 delay line and three
ORs, and `fp32_align` really does instantiate ch02's `align_sticky` verbatim
(read at `src/ch09/fp32_align.v:32`).

**The chapter listing is byte-identical to the shipped file** (fence 1 vs
`fp32_add4.v` module body: exact match, verified programmatically).

**My own three-way proof, disjoint from the chapter's.** I drove the *pipelined*
flagship back-to-back at seed 555001 through six regimes of my own (raw bits,
clustered, zero-heavy, subnormal, huge, forced-cancellation `(x,−x,y,·)`) plus
26 directed spec probes, dumped 120,026 retire transcripts, and checked every
line against (a) the shipped `oracle.py` and (b) **my own model written from the
chapter's spec text on a different mechanism** — binary64 host-FPU addition with
a struct round-trip (correct single rounding for binary32 by the 2p+2 ≤ 53
argument, self-tested at the 2^128 − 2^103 overflow boundary), specials
special-cased per S5/S6, `inexact` decided by exact `Fraction` comparison.
Results **and all three flags: 0 mismatches, 0 NaN-sign-only differences,
120,026/120,026**. The same two models then replayed my 604,096-vector D9
adversarial stream: 0 mismatches. Total: 724,122 my-seed RTL vectors, two
independent models, zero disagreement. The equivalence chain the chapter claims
(pipe ≡ comb ≡ golden chain ≡ exact model) closes under stimulus it never saw.

**Latency/throughput/valid-pipe**: see S7/S8 in the specification audit — all
verified, including by mutation (e3). The 101k headline runs reproduce: my
re-run printed `PASS tb_add4_stream (101019 valid quads incl 16 directed, 1000
bubbles, 1 result/cycle, latency 4)` — byte-identical to the chapter's quoted
transcript. The priced-depth table's arithmetic checks out (336 vs 540 vs 864;
the counts re-derived from the shipped port lists), and the chapter correctly
claims no Fmax number anywhere.

## D9 adversarial

I treated the acceptance as the chapter's most attackable claim and went at it
four ways. It held on all four.

**1. The proof, step by step against the shipped RTL.** Step 1: `big27 =
{1'b0, sig_big, 2'b00}` and `sml27 = {1'b0, aligned, g, r}` both have bit 26
clear, so the effective-add sum is < 2^27 — no wrap; `sum27 == 0` iff both
addends are 0 (read from `fp32_addsub.v`). Step 2: `sig_big = {hidden, F}`,
`hidden = (E != 0)` — zero iff the big operand is a signed zero; a subnormal has
F ≠ 0 so cannot fake it (`fp32_fields` contract). Step 3: `swap = (b[30:0] >
a[30:0])` — strict compare; if the selected big operand has magnitude bits 0 the
other operand's magnitude is ≤ 0, both zeros (including the equal-magnitude
tie-break: swap = 0 selects `a`, and `b ≤ a = 0`). Step 4: `screen = … | a_zero
| b_zero` — both-zero forces screen (read from `fp32_screen.v`). Step 5:
`exact_zero`'s complete fanout is the first mux term of `dp_res` in
`fp32_round_pack.v`; it appears in neither `ovf` nor `inexact_dp`; under
`screen = 1` the four outputs are `screen_res` / `inv_scr` / `~screen & ovf = 0`
/ `~screen & inx_dp = 0` — all independent of `exact_zero` (read from
`fp32_add2.v`'s four assigns). The composition lift is sound: each `fp32_addsub`
sits inside a complete `fp32_add2` with its own screen, so born zeros at stage 2
are screened by stage 2's own screen. The two-state caveat is stated. **Every
step checks against the RTL as shipped. No gaps found.**

**2. My own violation hunt — 604,096 targeted vectors, zero divergence.** I
wrote my own diff harness (not the chapter's): exhaustive 8^4 = 4,096 quads over
{±0, ±min-subnormal, ±1, ±max}, then 100,000 rounds × 6 patterns aimed at the
proof's assumptions — `(x,−x,y,−y)` born-zero pairs meeting at stage 2 as an
effective add, born+driven zero mixes, zero-heavy free-for-all, equal-magnitude
quads at the swap tie (sign-varied), three-zeros-plus-live, and subnormal
cancellation ladders `x, −(x±ulp)` — seed 424271. Shipped build vs B-M2 build,
full `{result, invalid, overflow, inexact}` per line: **transcripts
byte-identical, 0 diff lines in 604,096.** The proof is about the RTL that
ships.

**3. The two REQUIRED survivals and the four kills — all reproduce.**
- DM2: B-M2 through `tb_corners12` → `PASS … (321 directed quads …)` —
  survives, as the proof demands (the 16 signed-zero quads and the born-zero
  quad are in the library; no output differs).
- DM3: B-M2 through `tb_add4_stream` → `PASS … (60992 valid quads …)` —
  survives with the mutant under BOTH the flagship and its combinational
  oracle.
- DM1: `tb_d9wit` vs B-M2 → **exactly 27 FAIL lines**, first on the all-`+0`
  quad at all three instances, last `FAIL tb_d9wit 42f6e979 c2f6e979 3f800000
  bf800000: u_add_r exact_zero on an effective add` — the born-zero arming,
  byte-identical to the record.
- DM4: `tb_cov4` vs B-M2 → `exact_zero fired on an effective add 38 times` with
  **all 105 pins still matching** (`pins MATCH` printed) — the never-bin is the
  only counter that sees it, exactly as the proof requires.
- The unit-kill masking pair reproduces verbatim: `FAIL tb_addsub_u es=0
  big=000000 al=000000 grs=000: got 0000000/1 want 0000000/0` against the
  mutant module.

**4. The witness cannot pass vacuously — attacked three ways.** (a) Arming
counter disabled (`&& 0`, the recorded w1): FAILs on the CORRECT design with
`invariant never armed`. (b) All check calls neutralized: `0 checks ran,
expected 17` plus the armed guard — 2 errors on the correct design. (c) My own
partial-stimulus attack: replacing the signed-zero alphabet with {1.0, 2.0}
(the witness "loses" all 16 zero quads) still PASSes — but honestly: the
born-zero quad remains, arms `u_add_r` once (`armed 1 times` printed), and that
one arming still kills B-M2, so the check is degraded, not vacuous. The armed
guard's threshold is ≥ 1, which is the correct semantics; the chapter's phrase
"a witness that lost its stimulus … announces its own vacuity" is true only for
total arming loss — worth one softening word, listed as a nit. The 27-count
arithmetic (8 + 8 + 10 + 1) re-derived by hand from the sign rules and
confirmed: every one of the 16 quads arms at least one instance (mixed pairs
always arm `u_add_r` through their born +0s), which is why the mutant fails on
all 17 vectors.

The a1/a2 route measurements were not re-run (the a2 tree is a scratchpad
artifact, correctly NOT shipped); the chapter's argument does not depend on
them for correctness of the shipped design, and the framing ("no bug is
carried; the debt is a verification hole") is the accurate reading of what I
measured.

## Coverage model and guard

**Bin count recounted**: 25+25 (crosses) + 4+4 (expd) + 6 (eff-op) + 9 (norm
partition) + 18 (rounding events) + 9 (intermediate events) + 5 (result class)
= **105**, matching `cov_names.vh` (105 named case arms + default) and the
chapter's dimension table. Stage qualification audited wire-by-wire against
`fp32_add2_p2`: stage-1 bins sample combinational `screen`/`eff_sub` under
`in_valid` (and `v_ab` for the r instance, whose transactions are the level-1
results); stage-2 bins sample `u_norm`/`u_round` wires under each instance's own
`vpipe[0]` and pipelined `p1_screen`; retire bins under `out_valid`; the D9
never-bin is deliberately unqualified by screen. All sampled paths exist in the
shipped RTL (they elaborate; I ran them).

**Recorded battery spot-reproduced**: m1 (`bin 52 expd_ab[d<25] = 7, python
model pins 4` + 3 more — byte-identical), m4 (`bin 65 norm_ab[none] = 11, pins
15` + more), m7 (`bin 58 effop_ab[add] = 51, pins 18`). Note m7's measured kill
is the **[add]** bin taking the screened traffic; the chapter's sentence says
"counts screened NaN traffic as datapath *subtracts*" — wording nit, the README
has it right.

**My own attacks — the guard must catch mine, not just its nine:**
- **mx2** (partition boundary the battery never moved: `norm[none]` widened from
  `shl == 0` to `shl <= 1`): KILLED, 4 pins (`norm_ab[none] = 17 vs 15`,
  `norm_r[none] = 12 vs 11`, …) — the library's shl = 1 vectors straddle it.
- **mx3** (a mistimed qualification the battery never tried: the r-instance's
  stage-1 qualifier moved one cycle early, `dut.v_ab` → `dut.u_add_ab.vpipe[0]`,
  an existing wire that elaborates clean): KILLED, 6 pins (`effop_r[add] = 13 vs
  17`, `nan_l1_ab = 10 vs 11`, …) — the in-phase bubbles do their job.
- **mx1** (boundary the battery never moved: `expdbin`'s near bucket `d <= 2`
  widened to `d <= 3`): **SURVIVED THE ENTIRE SHIPPED RUN** — `pins MATCH`,
  `105/105`, `PASS tb_cov4 (18057 quads, …)`. Cause, measured from the library:
  the directed list's |expdiff| histogram is {0:15, 1:7, 2:1, 24:8, 25:1, 26:1,
  27:1, 40:1, 48:1, 127:2} — **d = 2 is present, d = 3 is absent, and nothing
  exists between 3 and 23**, so any boundary move in [3, 23] on this bucket is
  invisible to the pins, the partitions, and the hole gate. This is exactly the
  m5 defect class, on the one numeric boundary the fix pass didn't straddle.
  It falsifies `tb_cov4.v`'s header claim ("straddles every bin boundary
  adjacently — both properties bought by surviving mutations") and the closure
  section's "its boundaries are straddled". **Required change 1.** The fix is
  one directed quad at d = 3 in `cov_gen.py` + regeneration + battery re-run;
  my mx1 then becomes the tenth recorded row if the author wants it.

**Closure demos reproduce exactly.** `-DALL_POSITIVE`: **91/105, 14 holes**,
and the named list matches the chapter bin-for-bin (`effop_*[sub]` ×3,
`norm_*[leftN]` ×3, `rev_*[round_renorm]` ×3, `s1_ovf_cd`, both cancel bins,
`s2_exact_zero`, `resclass[ZERO]`) — including the honesty note that
`s1_ovf_ab` was closed by the draw's luck (my run confirms bin 91 hit, bin 92
empty). `-DNO_DIRECTED`: **98/105, 7 holes** — the three `round_renorm` bins
(ch08's 0-in-1M finding at composition scale), both `s1_ovf` bins,
`s2_exact_zero`, `resclass[ZERO]`. The 14 include the sign/effective-op AND the
rounding-event bins — the two dimensions ch05's seed demanded — so the named
holes are the right holes.

**The .vh libraries are byte-stable.** I mirrored the generators plus their two
parsed inputs (`ch08/tb_corners.v`, `ch10/tb_corners4.v`) into the scratchpad,
regenerated, and diffed: **all five files byte-identical to the shipped ones**
(`corner_list.vh`, `corner_count.vh`, `cov_dirlist.vh`, `cov_pins.vh`,
`cov_names.vh`); the census prints 321 with the exact family split the chapter
tables. A hand-edited pin (`exp_dir[52] = 4 → 5`) is reverted by regeneration
and caught by the two-sided pin check (m9 class) — the artifact-rule extension
delivers its core promise.

## Mutation record

**My own mutations first (designed before reading the 23 rows), all applied to
scratch copies only:**

| Mine | What | Result |
|---|---|---|
| e1 | port-mapping swap S1 forbids (`u_add_ab` gets a,c; `u_add_cd` gets b,d) | KILLED — 9 corner vectors, first kills are the MULTI rows (`got 00000000/000 expected 7fc00000/111` on tree order and the mirror on interleaved) |
| e2 | flag-OR dropped (`invalid = inv_r`, level-1 term deleted) | KILLED — 19 corner vectors (sNaN-at-level-1 rows retire `7fe00000/000` where `/100` due) |
| e3 | valid-bit lag (one extra flop on `out_valid`) | KILLED twice — `tb_corners12` 642 FAIL lines (`out_valid=0 at latency 4` / `stuck` per vector); `tb_add4_stream` fill/bubble/retire checks from cyc 4 on |
| e4 | corner expectation corrupted (row 75 inf-row flags `000 → 001` in a scratch `corner_list.vh`) | KILLED — one line, `got 7f800000/000 expected 7f800000/001` |
| e5 | `.vh` hand-edited (a pin count ±1) | CAUGHT — regeneration reverts it (byte diff), and the run kills it m9-style |
| f-first / f-last | DUT corrupts ONLY retire #0 / ONLY retire #60,991 | KILLED — exactly 1 mismatch each, at cyc 4 and cyc 62,019: the scoreboard scores its first and its last transaction (ch05's history, closed) |
| mx1/mx2/mx3 | coverage-guard attacks | see previous section — 2 killed, **mx1 survived** |

**Reconciliation with the 23 recorded rows.** Sampled re-runs, all matching the
README byte-for-byte where a line is quoted: DM1 (27×, first/last lines exact),
DM2/DM3 (required survivals — reproduced), DM4 (38, pins still MATCH), DM5 (321
X-guard kills, first line exact), DM6 (**9,929/60,992 = 16.3 %, result-changed
= 0, 9,424 flag-only, 505 X-class, first kill cyc 7 `7fc00000/100` vs `/111`**
— all five numbers exact), g1 (**10,790/61,037 = 17.7 %, first at cyc 7, `pipe
7fc00000/111 tree 7f800000/011`** — exact), m1/m4/m7 (pin lines exact), w1
(`invariant never armed` on the correct design), w2-equivalent (count guard, 2
errors), c2's count-guard mechanism (`checks ran, expected` fires), and the
`c2` premise verified independently: the tree-order multiset row appears exactly
twice in `corner_list.vh`, so deleting both occurrences gives 319.

**The two required-FAIL closure demos are honestly framed.** AP and ND are
labeled demonstrations in both the chapter and the README ("both must FAIL, and
do"), counted separately from kills and survivals in the recount (19 + 2 + 2 =
23), and their hole lists are printed as evidence rather than spun as coverage
wins. The two required survivals (DM2/DM3) are labeled as proof-required, with
the killers (DM1/DM4) in adjacent rows — either alone would mislead; both are
present. The recounted totals check out.

## Testbench honesty

Audited all five shipped benches line by line, then instrumented where reading
was not enough:

- **`!==` + X-guards**: both streaming benches check `(^{r_p, inv_p, ovf_p,
  inx_p}) === 1'bx` before the `!==` compare; `tb_corners12` guards
  `^{result, invalid, overflow, inexact}`; `out_valid` is checked with `===` on
  every cycle including fill and drain. DM5's 321 X-guard kills prove the guard
  is live, not decorative.
- **Watchdogs are time-based** (`#10_000_000` corners, `#20_000_000` cov,
  `#60_000_000` streams), not edge-counted — a dead clock still fails.
- **Count guards / preconditioned loops**: NCHK from the generated
  `corner_count.vh` (a shrunken library fails, c2); NDIR = 57 drive check;
  `n_checked_valid === n_valid_driven` (truncated drain fails);
  `ov_cycles === n_valid_driven` (throughput); the ≥ 60,017 drive floor
  (`-DNPR=0` dies by `$fatal` before any PASS — the recorded s1); `n_driven == 0`
  fails `tb_cov4`; `checks !== 17` and `armed == 0` fail `tb_d9wit`.
- **First/last-transaction scoring**: instrumented, not assumed — my f-first
  and f-last DUT probes were each caught as exactly one mismatch (cyc 4 and cyc
  62,019). The shared-index queue plus drain-under-X leaves no unscored edge
  transaction.
- **Seed discipline**: both streams seed once (`$urandom(seed)`) and discard
  the first draw, then use the continuing stream; `tb_cov4` seeds once, discards
  the first draw, and continues through the inout-updated seed — none of the
  three re-seeds per trial, so ch05's near-linear-first-draw trap is avoided.
- **sNaN from bits**: every sNaN operand is a 32-bit literal (`7FA000xx`); no
  shortreal round-trips anywhere in the kit (grep: zero `$bitstoshortreal` in
  ch12).
- **NaN sign**: never compared by the python-pinned suite (modes 1/2 compare
  class/quiet/payload only). The streaming benches compare full 32 bits — sound
  here because both sides are deterministic RTL computing the same screen
  function, not simulator-generated NaN constants; consistent with the
  project rule as ch10 applied it.
- **No `$dumpvars` anywhere in the kit** (grep: 0), with the chapter explaining
  the ch04 memory-array trap as the reason the streaming scoreboards must not
  be dumped naively — accurate, including the vvp load-time detail.
- **The 60k sizing rationale is stated and true**: the manifest comment, README,
  and chapter all carry the 36.7 s / 56.0 s / 38 s history; my own session ran
  the 60k targets at 22-36 s and the 101k retarget at ~40 s — inside the stated
  band, and the drift story is consistent with what I observed on this
  container.

## Craft

- **Listings**: fence 1 (the flagship) byte-identical to `fp32_add4.v`'s module
  body. Fence 2 is the labeled shipped-vs-mutant comparison; its shipped line
  matches `src/ch09/fp32_addsub.v:33` exactly modulo the stripped two-space
  indent, and it is explicitly captioned "A labeled comparison, not a listing".
  Fence 3 (the witness excerpt) appears verbatim in `tb_d9wit.v`, and the
  "(and identically for `u_add_cd` and `u_add_r`)" claim is true.
- **Transcripts**: every quoted PASS/FAIL line I could re-run reproduced
  byte-for-byte — the five harness PASS lines, both 101k headline lines
  (`101019 … 1000 bubbles` re-captured this session), the B-M2 unit-kill line,
  the 27× witness lines, the never-bin 38 line, m1/m4/m7 pin lines, g1's and
  DM6's first-kill lines, and the AP hole excerpt (bins 59/61/63 are indeed the
  first three holes; the `...` abridgement is visible as such).
- **Cross-references**: all 21 quoted section titles resolve (both directions
  spot-checked into ch05); zero positional references (`grep 'section [0-9]'`
  is empty); the "67.1M-pattern classifier sweep" credit is real — it is ch07's
  review-round sweep, recorded in STATE.
- **Checklist audited item by item**: all ten items are executable against the
  shipped kit and none overclaims. The census arithmetic (46×2×3 = 276; six
  families totalling 45 = 12+16+1+6+6+4; total 321) checks; the arming
  derivation (8+8+10+1) checks; the two-key pin property is demonstrated
  (m9 + my e5); the regenerate-and-diff invitation works as printed. Note item
  10's "move one boundary in one implementation and watch the pin fail" is true
  for every boundary except the `d <= 2` one my mx1 exploits — fixing required
  change 1 makes the checklist item unconditionally true.
- **Word count honest**: `wc -w` = 11,150 exactly as STATE records. 19/19
  sections, no placeholders.
- **The arc section's claims about earlier chapters are accurate** (ch04's
  PASS-against-broken-pipe story, ch05's machinery, the 23-run receipt's
  4-way split matches the README recount).
- **ch13 seed accurate**: covergroup/coverpoint/assert-property/cover-property
  mapping is right, the "no stock feature verifies bin definitions" point is
  correct, and the Icarus support matrix it cites matches ch05's measured one.
  **ch14 seed accurate on the architecture side** (fused multi-operand adders,
  Kulisch-style accumulation via ch10; bfloat16/posits framing), and its
  1.65 % / 28-32 % figures match my census (1.63 % / 27.9-31.8 %) — but it
  repeats the unconditioned 7.095 % (required change 2 covers both sites).
- **Sources honest**: four external sources, all `[title-only]` per the
  citation rule, none load-bearing; the chapter's authority is its runs, and
  the runs check out.
- **The artifact-rule extension's README rationale is sound**: the `.vh` files
  are compiled sources (the runner compiles in place, verified by reading
  `run_all.sh` — it cds into the chapter dir, so `` `include `` resolves), the
  `.py` files are the independent second implementation, the harness never runs
  python, and the audit command works as printed. The F2 note ("STATE.md's
  harness section and the F2 artifact check must carry this extension") is
  present in the README.
- Nits: the m7 sentence says "subtracts" where the measured kill is the [add]
  bin; `tb_d9wit.v`'s header comment "The B-M2 mutant fails here in one vector"
  is wrong as written (the mutant fails on all 17 vectors, 27 armed checks —
  the chapter text has it right); the soak table's D9 diff and a2 rows rest on
  scratchpad harnesses a reader cannot re-run from the shipped tree (the method
  is described in prose and I reproduced the result independently, but one
  sentence saying "harnesses in the session scratchpad, method in this section"
  would make the reproducibility boundary explicit).

## Research-note audit

Six claims spot-checked in `research/ch12-complete-adder.md`, plus the
consistency sweep both directions:

1. **§7.3 CR census (73.12 / 69.49 / 98.29 at seed 20260821)** — reproduces at
   my seed and 4× the sample under the notes' 2-wide/10-wide constructions
   (73.31 / 69.32 / 98.37). ✓
2. **§5.1 proof text** — matches the chapter's proof and the shipped RTL step
   for step. ✓
3. **§5.3 witness** (17 vectors, armed 27, B-M2 27 FAILs, both guards fire on
   the correct design) — all reproduced. ✓
4. **§8.2 closure demos** — reproduce, BUT the notes' ALL_POSITIVE hole
   arithmetic is internally inconsistent: "14 holes. The 7 above plus
   `effop[sub]` ×3, `norm[leftN]` ×3, and both inter-pair-cancellation bins" —
   7 + 8 = 15. The chapter caught and corrected this (the AP draw closes
   `s1_ovf_ab` by luck, so only 14 remain, and says so); the notes were not
   updated. **Silent chapter-vs-notes contradiction; the chapter is right**
   (my run: bin 91 hit, 14 holes). Should be reconciled with a dated note.
5. **§9.2 battery table** — m1/m4/m7 kill lines match my re-runs; the
   m4/m5-survival-then-library-fix story is consistent with the shipped
   library's contents (first quad live-datapath, bubbles every 7, shl 7/8 and
   d 24/25 straddles present). ✓ — though the straddle fix stopped one
   boundary short (mx1, required change 1: the notes' "boundaries are
   straddled" inherits the same overclaim).
6. **§2 vs the chapter's S3 numbers** — the notes' spec draft prices S3 as
   73.12/69.49 (win2/win10); the chapter re-measured under new ±2/±10 windows
   and prints 67.96/72.10 while citing the same seed 20260821. Both sets
   reproduce (see Specification audit), so nothing is false, but the chapter
   silently changed the regime construction relative to the notes and STATE's
   decision record ("98.3/69.5-73.1 % full/clustered") no longer brackets the
   chapter's ±2 figure. One sentence in the chapter ("windows here are ±2/±10;
   the notes' 2-wide/10-wide construction gives 73.1/69.5") or a notes update
   would close the loop. **Recommended with required change 2.**

Also verified: §11's timing table is consistent with the README's (session
drift acknowledged in both); §12's six sharpenings are accurate as statements
about earlier chapters (I verified #4's two ch05 debts are now measured kills,
and #5's renormalize blindness reproduces in my ND run: 0 hits in 18k random).

## Required changes for a 9+

In priority order. Nothing here is blocking (no spec clause failed to
reproduce, no module drifted, no proof step failed, no unkillable bench, no
`.vh` drift); items 1 and 2 are real defects, the rest are accuracy debts.

1. **Straddle the `d <= 2` coverage boundary (defect, the mx1 survival).** Add
   one directed quad with |expdiff| = 3 on a norm-norm pair to
   `cov_gen.py`'s `directed_list()` (e.g. `(0x4B000000, 0x49800000, Z, Z)` —
   E = 150 vs 147), regenerate the `.vh` files, re-run the m1-m9 battery and
   confirm the shipped run still closes 105/105 with pins matched. Then either
   record the widened-`d<=3` mutation as a tenth battery row or at minimum
   correct the two overclaims it currently falsifies: `tb_cov4.v`'s header
   ("straddles every bin boundary adjacently") and the closure section's "its
   boundaries are straddled". Fix cost: one generator line, one regeneration,
   one battery re-run.
2. **Condition the 7.095 % over-report figure (defect, spec wording).** In S4
   and in the ch14 seed, restore ch10's conditioning: the 7.095 % is
   *win2-clustered, bit-agreeing* quadruples; ch10's own table is 0 % (full) /
   0.362 % (win10) / 7.095 % (win2), and my measurement confirms the full-range
   rate is 0.000 %. Suggested wording: "on up to ~7 % of clustered
   (win2) quadruples whose composed bits equal the correctly rounded sum —
   and 0 % of full-range ones (chapter 10's table)". The one-directionality
   sentence needs no change (I found 0 violations in 1M quads).
3. **Note the S3 window-construction change against the notes.** The chapter's
   ±2/±10 numbers (67.96/72.10) and the notes' 2-wide/10-wide numbers
   (73.12/69.49) both reproduce, but they share a quoted seed and differ in
   construction with no sentence saying so; STATE's decision band
   (69.5-73.1 %) no longer brackets the chapter's ±2 figure. One clause in S3
   (or a dated note in the research file) reconciles all three documents.
4. **Fix the notes' ALL_POSITIVE hole arithmetic** (15 listed vs 14 claimed in
   §8.2) with a dated correction pointing at the chapter's s1_ovf_ab luck
   note — the chapter is right, the notes lag.
5. **Two comment-level nits**: `tb_d9wit.v` header — "fails here in one vector"
   → "fails on every armed vector (27 checks across the 17)"; the m7 sentence
   in the chapter — "counts screened NaN traffic as datapath subtracts" → the
   measured kill lands in the [add] bin (`effop_ab[add] = 51 vs 18`).
6. **Optional (honesty polish)**: one sentence in the regression section noting
   that the D9 adversarial diff harnesses, the a2 battery, and the CR census
   script live in the session scratchpad, with the method (and the one-line
   B-M2 diff) in the chapter — so the soak table's reproducibility boundary is
   explicit; and soften "a witness that lost its stimulus announces its own
   vacuity" to name the actual guarantee (arming count ≥ 1: total arming loss
   announces itself; partial loss degrades but still kills).

## Tree restoration proof

- Before any work: `sha256sum` over all files under `guide/src` →
  `baseline.sha256` (192 files) in the session scratchpad.
- All mutation and instrumentation work (B-M2 build, e1-e5, f-probes, mx1-mx3,
  m1/m4/m7 re-runs, g1, NOFD, witness attacks, transcript dumpers, the
  regeneration mirror) was done exclusively on **copies in the scratchpad**;
  compile outputs went to the scratchpad; no shipped file was edited.
- One self-inflicted artifact was caught and removed: importing `oracle.py`
  from a scratch script created `guide/src/ch12/__pycache__/` (not present in
  the baseline listing); deleted.
- After all work: `sha256sum` re-run over `guide/src` → **zero differences
  against the baseline, all 192 files** (`diff` empty).
- `git status --short` shows exactly one entry: ` M guide/reviews/ch12-review.md`
  — this review (whose skeleton a checkpoint commit had captured mid-session).
  Nothing under `guide/src`, `guide/chapters`, or `guide/research` is touched.
- Post-restoration sanity: the full-repo regression had already been run cold
  from the untouched tree this session — **108/108** under `SIM_TIMEOUT=120` —
  and the ch12 harness 5/5.

## Post-fix verification — 2026-08-21, same reviewer

All six required changes verified at their sites (read in the fix commit's
diff, then re-run where runnable):

1. **mx1 straddle gap — FIXED and verified by re-run.** The d=3 quad
   `(0x4B000000, 0x49800000, Z, Z)` (E 150 vs 147, norm×norm) is in
   `cov_gen.py`'s `directed_list()` with a dated comment; NDIR 57 → 58. My
   re-runs, this session, against the fixed tree: the shipped `tb_cov4` prints
   `PASS tb_cov4 (18058 quads, 105/105 bins, pins matched, D9 never-bin armed
   27124 and empty)` with `pins MATCH` — byte-identical to the chapter's
   updated transcript — and **my mx1 mutant (`d<=2` → `d<=3`) now DIES on
   exactly the two recorded pins**: `bin 51 expd_ab[d<=2] = 4, python model
   pins 3` and `bin 52 expd_ab[d<25] = 4, python model pins 5`, matching the
   new m10 row byte-for-byte. The m10 row honestly records the
   survival-then-library-fix history; the chapter's m4/m5 story now names the
   third instalment; `tb_cov4.v`'s header dates the added straddle.
   **Two boundaries I had NOT previously tried also die** against the fixed
   library: the sticky boundary moved *down* (`d<25` → `d<24`, the direction
   m1 never tried) fails 4 pins (`expd_ab[d<25] = 1 vs 5`, `expd_ab[d>=25] =
   8 vs 4`, and the cd pair), and the cancel-shallow lower edge (`shl>=1` →
   `shl>=2`) fails `bin 97 cancel_r_shallow = 1 vs 2`. With d = 0/1/2/3 and
   24/25/26/27, shl 0/1 and 7/8 all present, I can no longer construct a
   single-boundary move on any numeric bin that the pins miss.
2. **S4 conditioning — FIXED.** S4 now reads "on up to ~7 % of *clustered*
   (win2) quadruples … 7.095 % in chapter 10's win2 regime, 0.362 % at win10,
   and 0.000 % on full-range traffic (chapter 10's table, the zero re-measured
   by this chapter's review)". The ch14 seed carries the same conditioning.
   Both match ch10.md:247 and my measurements.
3. **S3 window-construction clause — FIXED.** S3 now names both constructions
   with both number pairs (±2/±10 → 67.96/72.10; 2-wide/10-wide →
   73.12/69.49, same quoted seed) and says both reproduce — which they do, at
   my seed, at 4× the sample. STATE.md's decision band now reads "clustered
   67.96-73.12 % depending on window construction" with the caveat.
4. **Notes' ALL_POSITIVE arithmetic — FIXED** with a dated 2026-08-21
   correction reconciling 15-listed vs 14-measured via the s1_ovf_ab luck
   note, crediting the chapter's version as the measured truth.
5. **Both comment nits — FIXED.** `tb_d9wit.v` header now reads "fails on
   every armed vector (27 checks across the 17)" — matching my measurement —
   and the chapter's m7 sentence now says the kill lands in the [add] bin.
6. **Reproducibility boundary and witness-guarantee wording — FIXED.** The
   regression section states plainly that the D9 diff harnesses, a2 battery,
   and CR census are session-scratchpad instruments with the method in the
   chapter; the witness sentence now states the actual guarantee (arming count
   ≥ 1; total loss announces itself, partial loss degrades but still kills) —
   exactly what my partial-stimulus attack measured.

Re-runs beyond the requested four: `.vh` regeneration from the fixed
generators in a scratch mirror — **all five files byte-stable** (census 321,
directed 58, floor 105/105); ch12 harness re-run cold post-fix — **5/5**.
Only ch12-directory files plus prose changed in the fix commit, so the 5/5
covers the change surface; the coordinator's cold 108/108 is consistent with
mine from the pre-fix tree.

**Residual nits, none scoring** (recommend orchestrator sweep inline, per
ch01 precedent): (a) the record's summary numerals lag the m10 addition — the
README recount still says "15 bench/library/coverage-model mutation runs …
23 recorded runs … 19 killed" and "rows m1-m9 above are nine recorded
instances" two paragraphs after "The ten coverage-model mutations (m1-m10)",
and the chapter's arc sentence still says "The 23-run mutation record … 19
kills" — the true count is 24 runs / 20 kills (m10 killed-after-fix) / ten
instances; (b) STATE's RESUME block still carries the pre-fix 11,150 word
count — `wc -w` today is **11,406** (the fix message's 11,656 matches neither);
(c) `tb_cov4.v`'s header parenthetical now splits "every bin boundary …
adjacently" awkwardly mid-phrase. All three are single-line prose touches; no
code, measurement, or spec claim is affected.

**Final score: 9/10 — fit to ship.** Both real defects are fixed and verified
by my own re-runs (the guard now kills the mutation class that survived, on
boundaries I chose; the spec's one overclaim now states ch10's table
faithfully); the remaining items are bookkeeping nits. The specification
reproduces clause by clause under independent measurement, the D9 disposition
survived a hostile audit, and the coverage guard is now — measurably — as
falsifiable as the chapter claims.
