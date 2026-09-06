# Chapter 5 — Fix round 1

Fix agent, 2026-08-16. Icarus Verilog 13.0 (stable, /usr/local/bin), Python
3.11.15, Linux x86-64. Work list: "Required changes for a 9+" in
`ch05-review.md`.

<!-- sections complete: 8/8 -->

## Summary

Both blocking items and all of items 3–7 are closed, except that every numeric
claim was re-measured here rather than copied from the review (two figures came
out slightly different from the review's and the chapter quotes mine). Files
changed: `chapters/ch05.md`, `src/ch05/tb_scoreboard.v`, `tb_exhaustive.v`,
`tb_fpref.v`, `tb_covfp.v`, `tb_assert.v`, `src/ch05/README.md`. No manifest
changes; still 12 targets in ch05. Final state: `run_all.sh ch05` 12/12,
`run_all.sh` 73/73, all run targets `-Wall`-clean (including the `-DBREAK_WRAP`
and `-DALL_POSITIVE` variants), all five chapter listings byte-identical
contiguous slices (verified mechanically), every transcript block re-verified
against fresh output captured this session on this machine.

## B1 — the shortreal exemption re-aimed

The `Seed for chapters 9 and 12` callout in "The Reference Model" now grants
the one-add form to **chapter 9's two-input adder** and requires chapters 10
and 12 (three chained adds) to round-trip every intermediate.

Re-derived the cost before embedding, per the brief: `struct.pack('>f')`
rounding validated against a hand-rolled Fraction-based round-to-nearest-even
binary32 (20,000/20,000 agreement including overflow handling), then 200,000
random normal binary32 quadruples (sign uniform, exponent uniform 1..254,
mantissa uniform), comparing round32(all-binary64 association) against the
per-step-rounded true binary32 result. Measured here: tree `(a+b)+(c+d)`
disagrees on **2,595/200,000 = 1.298 %**, sequential `((a+b)+c)+d` on
**2,590/200,000 = 1.295 %** — about 1 in 77, ~13,000 per million. The review
measured 1.310 %/1.336 % with its own RNG; same phenomenon, so the chapter
quotes my numbers (1.298 %, 2,595 of 200,000; 1.295 %; "one transaction in
77"; "roughly 13,000 false failures per million").

## B2 — the scoreboard monitor off-by-one

`tb_scoreboard.v`:

- (a) `active` is no longer raised at t=0. It is raised inside the **driver**,
  on the same negedge as the first real vector — so no posedge ever samples
  with the gate open and no data applied, and the gate only ever changes on
  the driver's edge, never the monitor's. This goes beyond "after an initial
  `@(negedge clk)` in the run block", which would still leave one open-gate
  posedge before the first drive lands.
- (b) The trailing sequence is now `@(posedge clk); #1; active = 1'b0;` — the
  monitor scores the last vector at that posedge and the gate closes strictly
  after it, independent of same-edge scheduling order (review finding 4).
- (c) New end-of-test assertion `if (checks !== driven)` with its own FAIL
  message, plus — because the review's M13 mutant (last vector changed to an
  innocuous `00+01`) changes no *totals* — the ch04 replay mode now pins the
  exact per-bin profile (`expect_cov`: 4 in {000}, 1 in {101}, 3 in {111}),
  computed independently in python3 before embedding.
- (d) Re-captured `+mode=ch04`: per-bin counts are now **4 / 1 / 3**, checks 8,
  `PASS tb_scoreboard (8 checks, 3 holes, 0 mutant exposures)`. Chapter block
  replaced (now including the previously omitted `transactions 8, ...` line so
  the slice is contiguous). Random mode now scores the true last transaction:
  "64 of which expose the mutant" became **65** in the chapter. The
  cout-tied-to-zero FAIL transcript shifted (phantom gone): `check=2/check=3`
  became `check=1/check=2` at t=15000/25000 — re-captured with a scratch
  mutant and updated in chapter and README.
- (e) Mutation-proved in the scratchpad against the fixed file: last replayed
  vector `ff+fe` → `00+01` now **FAILS** (`bin {000} counted 5, python3 says
  4` and `bin {111} counted 2, python3 says 3`, exit 1); deleting the trailing
  `@(posedge clk); #1;` now **FAILS** (`saw 7 transactions but the driver
  applied 8`, exit 1). Both recorded in the README mutation record.

## Item 3 — the -DBREAK_WRAP transcript

Re-captured the real output (which also changed because `tb_assert.v` gained
the reset-synchronicity check — see item 7): the run interleaves **fifteen**
`FAIL tb_assert: after N enabled cycles ...` lines from the plain-`if`
value-sequence check with **four** `ERROR:` blocks from the assertion, 19
failures total, 27 clocked checks, FATAL at tb_assert.v:152, Time 300000. The
chapter now declares the abridgement in the lead-in ("the full run interleaves
fifteen FAIL lines ... with four ERROR blocks; here are the first six lines
and the last four") and quotes exactly those two contiguous slices — verified
mechanically that they are the literal first six and last four lines of the
capture. The surrounding prose now makes the honest two-sided point the review
suggested: the assertion carries file/line/time/scope for free, the plain `if`
localises the divergence.

## Item 4 — the coverage knife turned on tb_covfp

`tb_covfp.v` gained an `ifdef`-gated branch mirroring `-DBREAK_WRAP`:
`-DALL_POSITIVE` forces `sg = 1'b0` in `gen_biased` (default build unchanged
byte-for-byte in behaviour — verified the default run still closes 34/34 on
seeds 1, 2, 3, 99 and 12345). Captured the `-DALL_POSITIVE` run: **34/34,
coverage closed, PASS** with every operand positive — no effective subtraction
anywhere. The chapter adds the demonstration right after the 34/34 run (last
two report lines quoted, declared as such) with four sentences naming what was
never exercised (rows F and I, leading-zero counter, left shifter, sign of an
exact-zero sum). The `Seed for chapter 12` callout now leads with the missing
*dimensions* — sign/effective-operation bins, and rounding-event bins (tie
occurred, guard set, sticky set, round carried out) — before the mechanical
extensions it already listed. The README documents the flag both in the files
table and in the record ("shipped as a flag rather than recorded as a
survivor"), alongside the fx−fy note.

## Items 5 and 6 — taxonomy gaps and the no-DUT sentence

Item 5, in "Verifying Floating Point Specifically" ("Two cross-cutting notes"
became four): (a) an exception-flags note — invalid/overflow/underflow/inexact
per Clause 7, phrased as a specification decision chapter 12 must make in
writing, with exclusion handled "exactly like flush-to-zero" (STATE.md's ch12
row does not settle whether flags exist, so the conditional phrasing is the
honest one); (b) a roundTiesToEven note, naming row A's `(+0)+(-0)` flip to
`-0` under roundTowardNegative as the one rule that moves; (c) row F corrected
to ≈ **0.59 %** with the derivation in the row (1.178 % near-equal exponents ×
½ opposite signs). Re-derived before embedding: exact 760/64516 = 1.1780 %,
halved = 0.5890 %, and a 2,000,000-pair Monte Carlo gave 0.590 %.

Item 6: one passage where `tb_covfp.v` is introduced ("The hand-rolled model")
now says it contains **no design under test**, that `fx − fy` leaves the
target green, and that it is a coverage instrument that tests stimulus, not
addition.

## Item 7 — the one-liners

- `tb_exhaustive.v` line 4: re-timed on this machine — three `vvp` runs at
  1.40/1.46/1.40 s — comment now reads "in about 1.4 s as last timed". The
  chapter's own 0.91 s prose is the original machine's measurement and was not
  touched, per the standing timing rule.
- "chapter 4 finished at 87.5 %": dropped the number; the sentence now warns
  that the comparison requires comparable mutant sets (eight carry functions
  vs forty-two mixed mutations).
- "`tb_scoreboard.v` is 200 lines": recounted after all edits — **286** — and
  the chapter and the file's header comment ("under 300 lines") both updated.
- `adder8 mismatches=%0d` in `tb_exhaustive.v` and `tb_scoreboard.v` now
  prints a dedicated `mismatch`/`mismatches` counter that excludes run-level
  guard failures; passing output is unchanged ("mismatches=0"), so no
  transcript moved.
- `tb_fpref.v`: added the all-28-pairs-distinct guard; mutation-proved
  (tie-up row duplicated over the tie-down row → `FAIL tb_fpref: rows 21 and
  22 are the same pair a=4b800001 b=3f800000`, exit 1); recorded in README.
- "Choosing Stimulus" cross-reference now uses the full title (one instance,
  in the coverage section).
- `tb_covfp.v` `expdbin`: six-line comment on the context-determined widening
  (why the unsigned part-select subtraction lands in `integer d` as −16 rather
  than wrapping), addressed to chapter 12 which will copy the function.
- E4M3: parenthesis added — IEEE-shaped with infinities, unlike the OCP FP8
  E4M3 which has none.
- shortreal trap callout: hedged — "you cannot yet *verify* any of these bit
  patterns — binary32 encoding is chapter 7's subject — so until then, take
  the pattern and the reason on trust."
- Mutation-campaign mechanics: one sentence in the mutation-testing paragraph
  (scratch copy, same one command, score on FAIL or rc != 0, restore and
  verify), hooked to chapter 4's "Automating the Build"; checklist item 8 is
  now executable from the body.
- Tolerance argument: a full paragraph after the traps table (1e-6 relative ≈
  8.4 ulps at binary32 — verified 1e-6 / 2^-23 = 8.389 — accepts the exact bug
  class this book targets; no principled eps exists; compare bits). Checklist
  item 3 left as is, now backed.
- `counter6` async-reset survivor (review M6): **closed, not recorded.**
  `tb_assert.v` now raises `rst` strictly between edges (`negedge` + #2),
  checks `q` holds until the next posedge, then checks `q==0` after it.
  Mutation-proved: `always @(posedge clk or posedge rst)` in a scratch copy →
  `FAIL tb_assert: q moved from 4 to 0 when rst rose between clock edges`,
  exit 1. Recorded in README (counter6 now 6 mutants, all caught).
- `tb_seed` prose: the chapter now reads "0.4720 that way, where one
  continuing stream measures 0.2465 against the theoretical 0.2520" — theory
  and measurement no longer conflated (re-ran `tb_seed.v` to confirm both
  numbers).

## Process notes, word count, and what was declined

- **Transcripts.** Every block my edits could touch was re-captured this
  session; a mechanical script then verified all fifteen non-verilog blocks in
  the chapter against fresh captures (contiguous where undeclared, declared
  slices where abridged). Three latent honesty defects surfaced and were
  fixed: the `tb_exhaustive` block silently omitted the excluded-bins line
  (now included — the slice is contiguous); the `+gen=uniform` block silently
  omitted the report's dash-separator line (now included); and the `tb_fpref`
  excerpt's D2 line does not reproduce on this host — x86-64 computes
  `inf+(-inf)` as `ffc00000` (sign-bit-set NaN) where the arm64 original
  printed `7fc00000`. The line now shows this machine's `ffc00000` with a
  lead-in clause turning the platform artifact into the NaN-comparison lesson.
  The two three-line `tb_covfp` excerpts now declare themselves ("three lines
  of the report").
- **Mutation record.** README updated to 42 applied / 38 killed / 4 survivors
  (four new proof mutations, all killed: scoreboard last-vector, scoreboard
  trailing-wait deletion, fpref duplicate row, counter6 async reset). Chapter
  and Sources updated to match. Survivor list unchanged at four.
- **Environment honesty.** README header and chapter Sources bullet 1 now name
  the fix-round environment (Icarus 13.0, python3 3.11.15, Linux x86-64); the
  chapter opening's python version pin was generalised since two environments
  now stand behind the numbers. README harness timing re-measured (1.8 s here).
- **Word count: 11,415**, up from 10,492 — above the ~11k the brief prefers,
  and accepted deliberately: the additions the review demands (a second
  demonstration with transcript, a longer honest BREAK_WRAP block, a full
  tolerance argument, four taxonomy notes) are mostly measurement and
  transcript, which the brief forbids cutting to make a number. ~200 words of
  prose were trimmed from my own additions and from three genuine duplications
  (X-check bullet, backwards-counter third telling, order-dependence example);
  cutting further meant cutting teaching the review asked for.
- **Declined:** nothing from the work list. Two review numbers were replaced
  by this session's own measurements rather than copied (B1: 1.298 %/1.295 %
  against the review's 1.310 %/1.336 %; both are the same ~1.3 % phenomenon
  under different RNG streams). No new manifest target was added for
  `-DALL_POSITIVE`, matching the manifest's stated policy that `-D` variants
  live in README — so the book stays at 73 targets.
- **Final gates:** `run_all.sh ch05` 12/12; `run_all.sh` 73/73; listings 5/5
  byte-identical; `find src -type f` artifact check clean; all builds
  `-Wall`-silent.
