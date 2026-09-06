# Chapter 5 review — round 2 (after fix round 1)

Reviewer persona: pedagogy expert who runs the code.
Date: 2026-08-16. Icarus Verilog 13.0 (stable), Python 3.11.15, Linux x86-64.

<!-- sections complete: 9/9 -->

## Verdict

**Score: 8/10**

Both round-1 blockers are genuinely closed, and closed the hard way: I traced the rebuilt
scoreboard monitor cycle by cycle (no phantom, last vector scored), re-derived the 4/1/3
profile from chapter 4's `vectors.hex` myself, resurrected the original phantom+drop defect
as a mutation and watched the new pinned profile kill it, and re-measured the chained-
reference cost with my own RNG and my own Fraction-validated rounder (1.290 % against the
chapter's 1.298 % — 0.3 sigma apart at N=200,000). All seven work items are closed, every
transcript block in the chapter now reproduces on this machine with every abridgement
declared and mechanically checked (the `-DBREAK_WRAP` block is the literal first six and
last four lines of the real 27-line capture), all five listings are byte-identical
contiguous slices, and the harness is 12/12 and 73/73 from cold with `-Wall` silent on all
twelve build variants. This is the fix round done right, and unlike chapters 1 and 2 it did
not break the code.

It loses the ninth point because it did ship the project's recurring defect in miniature —
two claims stronger than their measurements, both introduced or propagated by this fix
round. First, the new `checks !== driven` guard carries a provably false rationale: the
source comment says tying checks to driven "means a phantom and a drop must both be zero,
not merely equal," and the chapter repeats it — but I reintroduced the exact original
defect (phantom sample plus dropped sample) and `checks == driven == 8` held; the cancelling
pair is caught only by the pinned replay profile, and in random mode, which has no profile
pin, the resurrected original defect **passes green, rc=0**. Second, the README's headline
mutation record — 42 applied / 38 killed, quoted in the chapter body and Sources as the
chapter's own mutation score — does not reconcile with its own table, which enumerates 41
mutations (the "26 applied, 22 caught" testbench section lists 25 rows), an off-by-one
inherited from round 0 and arithmetically propagated instead of recounted. Both are
one-to-three-line fixes; neither invalidates any mechanism, transcript, or number in the
chapter. Real defects, narrow ones: 8.

## Round-1 required changes, verified one by one

**B1 — shortreal exemption re-aimed: CLOSED, and the number reproduces.** The `Seed for
chapters 9 and 12` callout in "The Reference Model" now grants the one-add form to chapter
9's two-input adder "and only there," and requires chapters 10 and 12 (three chained adds)
to round-trip every intermediate. I checked the chapter numbers against STATE.md's table:
9 = two-input FP adder, 10 = extending to four inputs, 12 = complete four-input adder —
the mapping is now right. The quoted cost was re-measured here from scratch: my own
generator (sign uniform, exponent uniform 1..254, mantissa uniform, `random.Random(20260816)`
— not the fix agent's stream), my own per-step rounder (`struct.pack('>f')`, sanity-checked
against a hand-written Fraction-based round-to-nearest-even on 5,000 pairs, 0 differences —
which also independently re-confirms the 53 ≥ 2×24+2 double-rounding exemption). Over
200,000 quadruples: tree `(a+b)+(c+d)` disagrees on 2,581 = **1.290 %**, sequential on
2,579 = **1.290 %**, one in 77.5, 12,905 per million. The chapter quotes 1.298 % / 1.295 % /
"one transaction in 77" / "roughly 13,000 per million". Sampling sigma at this N is 0.025
percentage points; the chapter's figure is 0.3 sigma from mine. Same phenomenon, honestly
quoted from a real measurement.

**B2 — scoreboard monitor off-by-one: CLOSED mechanically, with one false sentence left on
top (see Remaining defects).** A DRV/MON-instrumented scratch copy shows the fix is real:

```
  DRV t=10000 a=01 b=02          <- first drive; no MON at t=5000 (phantom gone)
  MON t=15000 a=01 b=02
  ...
  DRV t=80000 a=ff b=fe
  MON t=85000 a=ff b=fe          <- the last driven vector IS scored
```

The gate now opens inside the driver on the first real negedge and closes `#1` after the
final posedge. The printed profile is 4 / 1 / 3, which I re-derived independently in
python3 from `src/ch04/vectors.hex` (bins {000}:4, {101}:1, {111}:3 — exact). Mutations,
all on scratch copies: last replayed vector `ff+fe` → `00+01` **fails** (`bin {000} counted
5, python3 says 4` / `bin {111} counted 2, python3 says 3`, rc=1); deleting the trailing
`@(posedge clk); #1;` **fails** three ways (`saw 7 transactions, expected 8`, checks-vs-
driven, and the profile); corrupting the pinned profile itself (`expect_cov[000]=5`) fails,
so the pin is live, not decorative. Scheduling-order independence (round-1 consequence 4):
I moved the monitor `always` block to the end of the module, reversing process creation
order, and the output is behaviourally identical in both modes (only the `$finish`
diagnostic's line number moves, because I moved a line). The forced phantom+drop pair —
the original defect resurrected — is caught in replay mode **by the pinned profile alone**;
the new `checks !== driven` guard does not see it, contrary to its own comment. That
finding is D1 below.

**Item 3 — the -DBREAK_WRAP transcript: CLOSED.** Recompiled and re-captured here: the real
run is 27 lines — **15** `FAIL tb_assert: after N enabled cycles...` lines interleaved with
**4** `ERROR:` blocks, summary `27 clocked checks, q reached 5 3 times, 19 assertion
failures`, FATAL at tb_assert.v:152, Time 300000. The chapter's lead-in declares exactly
that ("the full run interleaves fifteen FAIL lines ... with four ERROR blocks; here are the
first six lines and the last four") and I verified mechanically that the quoted block is
the literal first six plus last four lines of the capture. The surrounding prose now makes
the two-sided point (assertion carries file/line/time/scope; the plain `if` localises the
wrap), which is the honest version and the better lesson.

**Item 4 — the coverage knife turned on tb_covfp: CLOSED and genuine.** `-DALL_POSITIVE`
compiles `-Wall`-clean and runs 34/34, `PASS`, rc=0. I instrumented a scratch copy to count
what the chapter claims: **0 sign-differing operand pairs and 0 negative operands across
all 2,025 transactions** (the default build has 978 sign-differing pairs), so "not one
transaction performed an effective subtraction" is measured, not asserted. The default
build still closes 34/34 on seeds 1, 2, 3, 99 and 12345. The `Seed for chapter 12` callout
now leads with the missing dimensions (sign/effective-operation bins, rounding-event bins)
before the mechanical extensions. The README documents the flag and the reason it is a
demonstration rather than a survivor.

**Item 5 — taxonomy gaps: CLOSED.** The cross-cutting notes now carry (a) the
exception-flags note phrased as a specification decision chapter 12 must make in writing,
Clause 7 named, exclusion handled "exactly like flush-to-zero"; (b) roundTiesToEven stated
as the standing assumption with row A's `(+0)+(-0)` → `-0` under roundTowardNegative named
as the one rule that moves; (c) row F corrected to ≈ 0.59 % with the derivation in the row.
My derivation: P(|Δexp| ≤ 1) = (254 + 2·253)/254² = 760/64516 = **1.1780 %**, halved for
opposite signs = **0.5890 %**; a 2,000,000-trial Monte Carlo with signs gave 0.5905 %. The
chapter's 1.178 % and 0.59 % are exact.

**Item 6 — the no-DUT sentence: CLOSED.** Where the file is introduced: "**`tb_covfp.v`
contains no design under test** — it samples its own reference model, and replacing
`fx + fy` with `fx - fy` leaves the target green." I re-applied the `fx - fy` mutation and
confirmed the target stays green (rc=0), so the sentence is a measured claim.

**Item 7 — the thirteen one-liners: ALL CLOSED**, each checked directly:
- `tb_exhaustive.v` line 4 now reads "in about 1.4 s as last timed" — I measured 1.399 s
  here. (But the chapter prose still says 0.91 s "here"; nit D3.)
- 87.5 % comparison dropped; replaced by the comparable-denominators warning.
- "286 lines" — `wc -l` says exactly 286; header comment says "under 300 lines".
- `mismatch`/`mismatches` counters are now separate from `errors` in both files (verified
  in source; passing output unchanged).
- fpref distinct-pairs guard present and killing: duplicating the tie-up row over the
  tie-down row fails with `rows 21 and 22 are the same pair a=4b800001 b=3f800000`, rc=1.
- "Choosing Stimulus: Directed, Exhaustive, Random" cited by full title (the one reference).
- `expdbin` carries the six-line context-determined-widening comment, addressed to ch12.
- E4M3 parenthesis present (IEEE-shaped, with infinities; OCP FP8 has none).
- The trap callout carries the chapter-7 hedge ("take the pattern and the reason on trust").
- Mutation-campaign mechanics sentence present (scratch copy, same command, score on FAIL
  or rc != 0, restore, verify) — checklist item 8 is now executable.
- Tolerance argument in full after the traps table; 1e-6/2⁻²³ = 8.389 ("about 8.4 ulps" —
  exact), and the 8,388,606-ulp case reproduces in `bad_tolerance.v` output.
- counter6 async reset: **killed.** I rewrote `counter6` with `always @(posedge clk or
  posedge rst)` and `tb_assert` fails with `q moved from 4 to 0 when rst rose between clock
  edges - the reset is not synchronous`, rc=1. Chapter 4's open concern is closed, not
  narrated.
- tb_seed prose: theory and measurement separated; I re-ran it — 0.4720 re-seeded, 0.2465
  continuing stream, `(truth 0.2520)` — all three match the new sentence exactly.

## Harness, -Wall, and listings

Cold runs, this session, this machine:

```
$ bash run_all.sh ch05     →  passed: 12   failed: 0    (1.81 s wall)
$ bash run_all.sh          →  passed: 73   failed: 0    (3.30 s wall)
```

Every `run` target compiled individually with `iverilog -g2012 -Wall`: **zero warnings on
all ten**, and zero on both `-D` variants (`-DBREAK_WRAP counter6.v tb_assert.v`,
`-DALL_POSITIVE tb_covfp.v`). The README's "about 1.8 s" harness figure matches. The
artifact check is clean — no files under `guide/src/` other than `.v`, `.md`, `targets.txt`,
`Makefile`, `.hex`, `run_all.sh` — and the final 73/73 was re-confirmed after all mutation
work.

All five chapter listings checked mechanically (python substring test, not eyeball), each
against its named file: the `adder8_mut.v` two-liner, the `tb_scoreboard.v` `$display`,
the `tb_directed.v` vector block, the `tb_covfp.v` `cov_sample` increments, and the
`tb_assert.v` assertion pair. **5/5 byte-identical contiguous slices.**

Two spot-checks of standing Icarus-reality claims the fix round did not touch, since fix
rounds regress: `iverilog -t coverage` still fails with `Unable to read config file:
.../lib/ivl/coverage.conf` and the installed `.conf` set is exactly
blif/null/pcb/sizer/stub/vhdl/vlog95/vvp; a deferred assertion still gives `sorry: Deferred
assertions are not supported.` Both as the chapter states.

## Transcripts

Every one of the chapter's 20 fenced blocks was re-captured or re-derived this session and
compared mechanically (script extracting each block and testing it against the fresh
capture). Verdicts:

| block | comparison | verdict |
|---|---|---|
| `tb_fpref` six lines + PASS | declared "Six lines of that run"; every line verbatim, order preserved | honest |
| `bad_srchain` | contiguous, character-identical | exact |
| scoreboard FAIL pair (cout tied to 0) | rebuilt the scratch mutant: `check=1` at 15000 and `check=2` at 25000 are the first two FAIL lines, contiguous — the round-1 phantom shift is gone | exact |
| `tb_directed` run | contiguous | exact |
| `tb_exhaustive` report | contiguous | exact |
| `tb_random` | contiguous | exact |
| `tb_scoreboard +mode=ch04` | contiguous, 15 lines, counts 4/1/3, `transactions 8` line included | exact |
| excluded-bins line | contiguous | exact |
| `tb_covfp +gen=uniform` | the 5-line exponent-difference section is condensed to `[ exponent difference: 9 / 39 / 338 / 1580 ]` — declared in the lead-in ("reduced to its four counts") and the four counts are the real ones; everything else including the dash separator is character-identical | honest |
| `tb_covfp` narrow / full three-liners | declared "three lines of the report"; lines verbatim, order preserved, 717 confirmed | honest |
| `-DALL_POSITIVE` last two lines | declared; contiguous tail of the real report | honest |
| `-gno-assertions` session | rebuilt the property file; `rc=0` and `ran to the end` reproduce | exact |
| `-DBREAK_WRAP` | declared abridgement; quoted block == literal first 6 + last 4 lines of the 27-line capture; 15 FAIL + 4 ERROR = 19, 27 checks — all counts in the lead-in are the measured ones | honest |
| `SEED=1` line | matches `tb_seed` output | exact |

**Architecture-dependent NaN handled honestly.** The one transcript that could not have
reproduced from the arm64 originals — `tb_fpref`'s D2 `inf+(-inf)` — now prints this
host's `ffc00000`, and the lead-in turns the platform artifact into the lesson ("this
host's NaN arrives with its sign bit set, which is legal ... which is why the suite
compares NaN by class and quietness, never by bits"). That matches IEEE 754's
unspecified-sign rule and matches what this machine actually prints. `bad_srchain`'s
transcript contains no generated NaN, so nothing else is architecture-bound.

Convention note, not a defect: trailing `$finish called` / `FATAL:` runner lines are
omitted from quoted blocks throughout, as in every previous chapter, with the exit status
always stated in prose ("It exits 1").

## Independent measurements

Fourteen numeric claims in the changed material, each re-derived or re-measured here
without reading the fix agent's derivation first:

| claim (chapter/README) | my value | verdict |
|---|---|---|
| chained 4-input reference wrong on 1.298 % (tree) / 1.295 % (seq) | 1.290 % / 1.290 % under my own RNG, N=200,000; sigma = 0.025 pp | consistent, 0.3 sigma |
| "one transaction in 77", "~13,000 per million" | 77.5, 12,905 | consistent |
| one binary32 add safe through binary64 (the exemption's premise) | 5,000-pair Fraction-RNE cross-check of my rounder, 0 diffs | holds |
| ch04 replay profile 4/1/3 | derived from `src/ch04/vectors.hex`: {000}=4, {101}=1, {111}=3 | exact |
| replay-mode "65 of which expose the mutant" | fresh run: 65 | exact |
| row F: P(\|Δexp\| ≤ 1) = 1.178 % | 760/64516 = 1.1780 % | exact |
| row F: catastrophic ≈ 0.59 % | 0.5890 % closed-form; 0.5905 % Monte Carlo (2M trials, with signs) | exact |
| tolerance ≈ 8.4 ulps at 1e-6 relative | 1e-6/2⁻²³ = 8.3886 | exact |
| 8,388,606 ulps accepted at 1e-30 absolute | reproduces in `bad_tolerance.v` output | exact |
| BREAK_WRAP counts: 15 FAIL, 4 ERROR, 19 failures, 27 checks | counted from my capture: 15/4/19/27 | exact |
| tb_seed: 0.4720 / 0.2465 / truth 0.2520 | fresh run: 944/2000, 493/2000, 16512/65536 | exact |
| tb_random: 58 kills, mean 3.9075, theory 3.9690 | fresh run + 1/p | exact |
| `tb_scoreboard.v` "286 lines" | `wc -l` = 286 | exact |
| ALL_POSITIVE: "not one transaction performed an effective subtraction" | instrumented: 0 sign-differing pairs, 0 negative operands in 2,025 transactions (default build: 978) | exact |

Timing, re-measured on this machine: `tb_exhaustive` `vvp` runs in **1.399 s** (the file's
new "about 1.4 s as last timed" is honest); one-testbench compile 0.010 s (chapter says
0.013 s — fine); full harness 3.30 s (chapter's 3.03 s is the original machine, within the
two-environment statement in Sources). The one wrinkle: the chapter body still says the
exhaustive sweep runs "in **0.91 s** here" and "This machine ran 65,536 full transactions
in 0.91 s" while the shipped source header now says 1.4 s — two published figures for the
same run with no reconciling clause (nit D3 below).

Word count: `wc -w` = **11,415**, exactly as the fix log states (up from 10,350 pre-fix by
the same measure).

## Mutation campaign

Twelve runs against the changed code paths, designed before consulting the README's
record, all on scratch copies, all restored and SHA-verified afterwards.

**New scoreboard gating:**

| # | mutation | outcome |
|---|---|---|
| S1 | last replayed ch04 vector `ff+fe` → `00+01` (round-1 M13) | **KILLED** — pinned profile fires twice, rc=1. Round-1's byte-identical survivor is dead |
| S2 | trailing `@(posedge clk); #1;` deleted (round-1 M14) | **KILLED** — three guards fire, rc=1. The trailing wait is no longer a no-op |
| S3 | phantom + drop pair reintroduced together (`active=1` at t=0 **and** trailing wait deleted — the original round-1 defect, exactly) | **replay mode: KILLED, but by the pinned profile alone** — `checks == driven == 8`, the `checks !== driven` guard passes. **Random mode: SURVIVES, rc=0, `PASS tb_scoreboard (200 checks, ...)`** — no profile pin there. See D1 |
| P1 | pinned profile itself corrupted (`expect_cov[000] = 5`) | KILLED — the pin is a live check, not decoration |
| P2 | monitor `always` moved after the run block (process creation order reversed) | output behaviourally identical in both modes — the fix does not depend on same-edge scheduling order |

**Other changed paths:**

| # | mutation | outcome |
|---|---|---|
| A1 | `counter6` rewritten `always @(posedge clk or posedge rst)` (round-1 M6, the chapter-4 open concern) | **KILLED** — `q moved from 4 to 0 when rst rose between clock edges`, rc=1 |
| F1 | tie-down row replaced by duplicate of tie-up row (round-1 M23) | **KILLED** — `rows 21 and 22 are the same pair`, rc=1 |
| AP | `-DALL_POSITIVE` + instrumentation counting sign-differing pairs | 0 effective subtractions, 34/34, PASS — the demonstration is genuine |

**Round-1 survivors re-run:** M1 (`{cout,sum} = b + a` equivalent control) still survives
all four adder targets — correct, a suite that killed it would be wrong. M26
(`tb_exhaustive` expected value taken from the DUT) still survives — documented survivor
#2, correctly reasoned. M21 (`tb_covfp` computes `fx - fy`) still survives — but the
chapter now says so in place and the README explains it, which converts a trap into a
lesson. M18 (`expdbin` sticky boundary 25 → 60) **still survives and is still
undocumented** — the bin definitions of the coverage model remain unverified against
anything; round 1 did not require this, so it is a leftover, not a regression (nit D5).

**README record accuracy (42/38/4): DOES NOT RECONCILE — D2.** The table under "Testbench
mutations — 26 applied, 22 caught" contains **25 rows** (21 killed, 4 survived; counted
mechanically). Group totals: adder8 7 + adder8_mut 3 + counter6 6 + testbench 25 = **41
enumerable mutations, 37 killed, 4 survived** — against a headline of 42/38/4 repeated in
the chapter body ("mutated forty-two times, thirty-eight kills"), Sources bullet 2, and
STATE.md. Git history shows the off-by-one predates this fix round — the round-0 README
said "23 applied, 19 caught" over a 22-row table — and fix round 1 propagated it
arithmetically (+3 table rows, 23+3=26) instead of recounting. Either a 26th testbench
mutation was applied and never listed, or the count is inflated; as published, the
chapter's own mutation score is a claim its ledger cannot support.

The three new proof mutations recorded in the README (scoreboard last-vector, scoreboard
trailing-wait, fpref duplicate-row) plus the counter6 async-reset entry all reproduce
exactly as recorded, including their failure messages.

## Pedagogy of the changed material

**The ALL_POSITIVE demonstration lands, and it is now the strongest close in the coverage
section.** It sits exactly where it should — immediately after the triumphant 34/34 run and
the seed-stability line, before the coverage-loop summary — so the reader experiences the
same whiplash the chapter engineered for code coverage ("every automatic metric reports a
perfect score...") turned on the chapter's own hand-rolled model. The closing sentence, "a
coverage model is silent about every dimension it does not name," is the transferable
lesson stated in one line, and because the flag ships in the file and the README gives the
command, a reader can reproduce the whole argument in thirty seconds. This is the round-1
review's requested move executed better than requested: it is measured (I confirmed zero
effective subtractions), reproducible, and honestly framed as a demonstration rather than
a survivor.

**The re-aimed Seed callout is unambiguous for a chapter-12 author.** It names chapter 9 as
the only legitimate user of the bare form ("and only there"), names the operation count
that makes the difference (one add vs three chained), states the mechanical fix
(round-trip every intermediate), and prices the mistake (1.298 %, one in 77, ~13,000 per
million). A chapter-12 author acting on this callout cannot reproduce round 1's inversion.
The interplay with the later `Seed for chapters 10 and 12` callout (sum in exactly the
hardware's order) is now consistent rather than contradictory.

**Pacing at 11,415 words: survives, with one specific casualty.** The growth is
concentrated where the review demanded measurement, and most of it reads as evidence
rather than prose. Two observations. First, the four cross-cutting notes after the
taxonomy are now a single ~200-word paragraph carrying four separate load-bearing
specification decisions (rounding attribute, exception flags, flush-to-zero, row I's
significand carry); as chapter 12's checklist material it would serve better as a short
list — this is the one place the added weight makes the chapter harder to *use*, not just
longer. Second, the scoreboard-roles paragraph ("It reads `a` and `b` from the pins...")
now does three jobs — monitor independence, driver edge rule, gate discipline — and is
dense, but each sentence carries a distinct measured fact, so I would not cut it. Nothing
else in the changed material drags; the BREAK_WRAP "colleagues, not rivals" framing is a
genuine improvement over the round-1 version because the honest transcript teaches more
than the flattering one did.

**Is anything NEW claiming more than its measurement?** Yes, twice — D1 (the
checks-vs-driven rationale, demonstrated false by mutation) and D2 (the 42/38 record,
which its own ledger cannot support). Everything else added in this round that makes a
claim carries a measurement that I reproduced: the 4/1/3 pin, the interleave counts, the
zero-subtraction closure, the 0.59 % row, the async-reset kill, the distinct-pairs kill,
the 1.3 % cost. That is a far better ratio than fix rounds in this project have managed
before, but the two exceptions are in exactly the chapter that cannot afford them.

## Remaining defects and required fixes

D1 and D2 are what hold the chapter at 8. Both are small; neither requires re-capturing
any transcript.

### D1 — The `checks !== driven` guard's stated rationale is provably false

`src/ch05/tb_scoreboard.v`, the comment above the guard:

> checks == expect_n is not enough on its own: a phantom sample before the first vector
> and a dropped sample after the last CANCEL, leaving the count right while the set of
> scored transactions is wrong. **Tying checks to driven means a phantom and a drop must
> both be zero, not merely equal.**

The bolded sentence is wrong, and the chapter repeats it ("The Shape of a Suite You Can
Trust": "`checks` against `driven`, because a phantom sample before the first vector and a
dropped sample after the last *cancel* in the totals"). `driven` counts driver
applications; a phantom adds one to `checks` and a drop removes one, so the pair cancels
in `checks` vs `driven` exactly as it cancels in `checks` vs `expect_n`. Measured: I
reintroduced the original defect verbatim (gate raised at t=0, trailing wait deleted) —
replay mode gives `checks == driven == 8`, the guard passes, and only the pinned per-bin
profile fails the run; **random mode, which has no profile pin, passes green end to end,
rc=0**. (The guard is also logically redundant as a detector: if `driven == expect_n` and
`checks == expect_n` both hold, `checks == driven` follows. Its real value is attribution
when something else has already failed.) What actually defeats the cancelling pair is the
mechanical fix plus the pinned profile — which the fix agent evidently understood, since
the profile exists precisely because the M13 mutant "changes no totals," and the README's
S1 row credits the profile, not this guard. The false sentence is the one thing standing
between this fix round and a clean bill.

**Fix (two sentences):** in both the source comment and the chapter clause, credit the
pinned replay profile as the guard that sees a cancelling phantom+drop pair ("each moves a
bin the other does not" — the neighbouring comment already says this correctly), and state
`checks !== driven`'s honest job: attributing an unpaired phantom or drop to the
monitor/gate rather than the driver. Optionally note that random mode relies on the
mechanical gate discipline, having no pinned profile.

### D2 — The mutation record 42/38/4 does not reconcile with its own ledger

`src/ch05/README.md` enumerates 41 mutations (7 + 3 + 6 + a 25-row testbench table), 37
killed, 4 survived — under headlines of "Forty-two applied", "Thirty-eight killed", and
"Testbench mutations — 26 applied, 22 caught". The off-by-one is inherited from round 0
(header 23/19 over a 22-row table) and was propagated by arithmetic instead of recount.
The chapter body and Sources bullet 2 quote 42/38 as the chapter's mutation score; STATE.md
repeats it.

**Fix:** recount and publish the enumerable numbers (41/37/4 and 25/21 — or find and list
the missing 26th mutation if it really ran), in README, chapter body, Sources, and
STATE.md. The chapter's own sentence "worth writing down because it makes 'we tested it'
comparable across chapters" is the reason this cannot stay.

### Nits (would separate 9 from 10; none blocks)

- **D3** — The chapter says the exhaustive sweep runs "in **0.91 s** here" and "This
  machine ran 65,536 full transactions in 0.91 s", while the shipped `tb_exhaustive.v`
  header now says "about 1.4 s as last timed" (I measure 1.399 s). Two published figures
  for the same run, one of them attributed to "this machine" on a machine where it is not
  true. One clause reconciles it ("0.91 s on the original arm64 session, 1.4 s on the
  Linux container that re-verified everything").
- **D4** — Chapter prose says `tb_scoreboard.v` "ends with five" end-of-test assertions
  about the run; the end-of-run block actually carries seven checks (the five named plus
  the two mode-dependent `kills` guards). Defensible if the `kills` guards are counted as
  design-facing, but a chapter this precise should not make the reader do that argument.
- **D5** — `tb_covfp`'s bin *definitions* remain unverified: moving the sticky boundary
  from 25 to 60 still closes 34/34 silently (round-1 M18, re-confirmed). Round 1 did not
  require this; it remains worth one README line as a known blind spot, since chapter 12
  inherits the file.

## Tree restoration proof

All mutation, instrumentation and capture work was done on copies in the session
scratchpad; nothing was ever written into `guide/src/`. SHA-256 baselines of all 115 files
under `guide/src/` were taken before any work and verified at the end:

```
$ sha256sum -c baseline.sha256      → 115 OK, 0 mismatches
$ find src -type f ! -name '*.v' ! -name '*.md' ! -name 'targets.txt' \
      ! -name 'Makefile' ! -name '*.hex' ! -name 'run_all.sh'   → (empty)
$ bash run_all.sh                   → passed: 73  failed: 0   (re-run after all work)
$ git status --short                → only guide/reviews/ch05-review-r2.md (this review)
```

The tree is byte-identical to how I found it; the only modification this session
introduced is this review file.
