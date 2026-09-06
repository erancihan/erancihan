# Chapter 6 review — round 2 (persona: IEEE 754 / computer-arithmetic specialist)

<!-- sections complete: 8/8 -->

## Verdict

**Score: 9/10 — fit to ship. All eight r1 items verified genuinely closed by
this review's own runs; no regression found in the chapter, the code, or the
repo-wide harness change; what remains is four prose nits in supporting
documents, none in the chapter itself.**

Every r1 prescription was re-executed rather than trusted: the +128 teaser and
its resolving section title, the 2^−14 ≈ 6.1e−5 bound in both chapter and
dated research-note correction, the magnitude-bits qualifier with both hex
patterns re-derived via `struct` (and the repaired claim itself verified over
3,000+ patterns including subnormals), the trap-table 0.1 row at +1.49e−8
relative/high, the `fixmul44.v` header bound shown to be the *exact* range
[−1016, +1024] of all three requantizers, and the STATE.md file count. The
README's two new notes were re-proven empirically: `p_even = cvg >> 4`
survives the shipped sweep (output-equivalence confirmed), and a ties-to-odd
mutant passes the bias ledger exactly while the per-pair check kills it with
8,192 errors. The harness overclaim was closed the strong way — the gate is
real, self-tested in all four directions plus the warn-with-failing-sim case,
and a cold `bash run_all.sh` reproduces **78/78** with all seven converted
`warn` rows still warning individually. Chapters 2–5's prose survives the
manifest change with nothing falsified. All 6 listings remain byte-identical
contiguous slices and all 10 transcripts reproduce line-for-line from fresh
captures.

Not a 10, and the point-in-hand names the project's recurring defect class one
more time: the fix round's own report writes "9775 words" where `wc -w` says
9,600 (D2), and the round that corrected one inherited research-note error
left the *other* false research-note claim — whole-float lexical compare —
standing uncorrected for chapters 7/8 to inherit (D1). Plus two manifest/
STATE wording nits (D3, D4). All four are orchestrator-inline material under
the ch02/ch03/ch05 precedent: prose only, no code path. Recommend: close D1–D4
inline, mark chapter 6 **reviewed**, proceed to chapter 7 research.

## R1 items verified

All eight, each against its r1 prescription, each by my own run or derivation
(script `verify_r2.py`, session scratchpad — every check listed below executed
fresh this session).

1. **[BLOCKING] +128 teaser — CLOSED.** The sentence now reads "…or 'the
   exponent +128' (a stored value the excess-127 contract of 'Biased Encoding:
   The Exponent's Format' will turn out to reserve)" — the exact prescribed
   fix, first option. Re-derived: 255 − 127 = **+128**; stored 255 really is
   reserved (max normal's stored exponent is 254, checked via `struct`); the
   quoted section title resolves against the literal `##` header. The
   sentence's other three readings re-verified: 255, −1, and −0.0078125
   (= −1/2⁷, the Q1.7 reading). No "−112" anywhere in chapter, src or notes.
2. **[BLOCKING] π-in-Q3.13 bound — CLOSED, both documents.** Chapter now says
   "inside Q3.13's step/2 bound of 2^−14 ≈ 6.1e−5"; 2^−14 =
   6.1035…e−5 and the encode error |3.1416015625 − π| = 8.909e−6 sits inside
   it. `research/ch06-binary-fixedpoint.md` §5.3 carries a **dated correction**
   ("corrected 2026-08-16 by the chapter 6 review: this note originally said
   3.05e−5, which is 2^−15 — half the true bound") — the inheritance path is
   cut. No "3.05e" remains outside that correction note.
3. **[BLOCKING] float-compare qualifier — CLOSED in the chapter.** The claim is
   now the prescribed magnitude-bits form, with the counterexample inline:
   "(The sign bit must be handled aside: with it included, −1.0's pattern
   `bf800000` is lexically *above* 2.0's `40000000`.)" Both hex values
   re-verified with `struct` (−1.0 → 0xBF800000, 2.0 → 0x40000000, and the
   former is indeed lexically larger). The **repaired** claim was itself
   verified: over 3,000+ random positive bit patterns including subnormals,
   ordering of bits[30:0] equals ordering of magnitudes, zero mismatches. The
   downstream sentences (unsigned comparator, chapter 8's exponent compare)
   use only the magnitude form, as r1 predicted. **But the research notes
   still carry the original false claim uncorrected** — see Remaining defects.
4. **Harness parenthetical — CLOSED by making it true.** The fix took r1's
   strongest option: `run_all.sh` now fails any `run` target with a non-empty
   compile log. The rewritten "Icarus reality" box ("enforced on every harness
   run, because `run_all.sh` fails any `run` target whose compile log is
   non-empty") is now a true statement — self-tested adversarially, see the
   harness section. `tb_signtraps.v` is a `run` target, so its zero-warning
   claim is genuinely regression-guarded.
5. **Trap-table 0.1 row — CLOSED.** Now "0.1 stores ~1.5e−8 high (relative) in
   float32; only fractions of the form p/2^k store exactly". Re-measured:
   float32(0.1) = 0.100000001490116…, relative error **+1.4901e−8**, high
   side. The "only" is the necessity direction and is exact (spot-checked:
   no non-p/2^k fraction round-trips); it no longer contradicts the body's
   iff, which is unchanged and correct.
6. **README additions — CLOSED, both re-verified empirically.** (a) The
   survivor-1 note now says the `>>`-for-`>>>` equivalence covers all three
   requantizer outputs; I rebuilt the `p_even = cvg >> 4` mutant against the
   shipped testbench: **survives**, full sweep green — and the sweep is the
   equivalence proof, since every pair is compared to the arithmetic
   reference. (b) The new ledger-limit paragraph re-verified both ways: the
   ties-to-odd DUT (addend inverted to `{!L, LLL}`) against the full testbench
   is **killed with exactly 8,192 errors** (one per tie); against a testbench
   with only the per-pair `p_even` clause deleted and the bias ledger intact,
   it **passes** — the tie examples visibly print odd neighbors (1, 3, −3) and
   the run still ends in PASS. "The per-pair check is load-bearing; the ledger
   is a summary, not a guard" is exactly right.
7. **`fixmul44.v` header — CLOSED, and the new bound is exact.** Header now
   says results lie in "[−1016, +1024]". Re-derived exhaustively over all
   65,536 pairs: raw product spans [−16256, +16384] as stated, and **each of
   the three requantizers** (floor, half-up, half-even) spans exactly
   [−1016, +1024] — the printed interval is the measured min and max, tight on
   both ends, for all three outputs. Well inside 12-bit signed.
8. **STATE.md .v count — CLOSED.** The run-log entry now reads "7 `.v` files
   (2 DUTs + 5 testbenches; 5 build targets)", which matches the directory
   (7 `.v` on disk, 5 manifest rows). No "5 `.v`" remnant greps anywhere in
   STATE.md.

## Harness change audit

This change touches all chapters, so it got the adversarial treatment.

**Logic read.** `run_all.sh` compiles each target with output captured to a
log; `xfail` is judged on compile success alone (unchanged); a `run` target
whose compile succeeded but whose log is **non-empty** now fails as
`(compile warnings)` with the first five log lines echoed; a `warn` target
whose log is **empty** fails as `(expected compile warnings)`; `warn` targets
then fall through to the identical simulation checks as `run` (timeout,
exit-code, FAIL-grep).

**Self-tested, all directions, in a scratch tree** (copy of `run_all.sh`, a
throwaway chapter dir, a two-warning out-of-range-part-select module and a
silent module):

| case | result |
|---|---|
| warning-emitting module under `run` | **FAIL "compile warnings"**, both warning lines echoed ✓ |
| same module under `warn` | **PASS** ✓ |
| silent module under `warn` | **FAIL "expected compile warnings"** ✓ |
| silent module under `run` | **PASS** ✓ |
| warning module under `warn` whose sim prints FAIL | **FAIL "testbench FAIL"** — warn targets really do keep the simulation checks ✓ |

**Cold full run, this session: `bash run_all.sh` → 78 passed, 0 failed**
(ch02 27, ch03 20, ch04 14, ch05 12, ch06 5). The seven converted rows are
exactly the seven named targets (ch02: `tb_literals`, `tb_partsel`,
`adder_ansi`+`bad_positional`, `bad_implicit`, `bad_carry_always`; ch03:
`bad_arraysens`, `bad_svalways`), and each, compiled individually with
captured stderr this session, still emits at least one warning — so all seven
`warn` rows are earning their keep, and every `run` row in the repo now
carries a machine-checked zero-output property (the 78/78 is the proof, since
one warning anywhere would have failed the run).

**Residual limits, stated so nobody oversells them later:** (a) the `warn`
gate checks *non-emptiness*, not the quoted text — an Icarus that changes its
wording (rather than going quiet) passes the gate while the chapter transcript
goes stale; the script header phrases this correctly ("stops warning → fails"),
but STATE.md's "pins their quoted diagnostics" reads one notch stronger than
the mechanism (nit, see Remaining defects). (b) An unrecognized `expect`
keyword (a typo like `wran`) silently falls through to the `run` branch —
pre-existing behavior, but with three row types the typo surface grew; a
one-line `else echo FAIL unknown row type` would close it (observation, not a
defect — no such typo exists today). (c) The ch02/ch03 manifest header
comments still document only `run`/`xfail` while the files now contain `warn`
rows — see Remaining defects.

## Cross-chapter prose audit

The question: does converting seven ch02/ch03 targets to `warn` rows falsify
anything those chapters *say*? Grepped both chapters (plus ch04/ch05) for
`-Wall`, warning counts, zero-warning claims, `targets.txt`, `run_all`,
manifest descriptions, and re-read every hit in context.

- **ch02.md — clean.** It never claims all its targets compile warning-free;
  it *quotes* the diagnostics of exactly the five converted targets, and all
  five quotes reproduce **verbatim** from individual compiles this session
  (`Numeric constant truncated to 4 bits`, the two-line part-select pair, the
  four-line positional port-width pair, `implicit definition of wire 'godo'`,
  `@* found no sensitivities so it will never trigger`). The `-Wall`
  membership paragraph ("Only two of the warnings you have seen in this
  chapter actually came from that set") is about warning classes, untouched by
  the manifest change, and its two named classes still behave as stated. The
  chapter's one `targets.txt` mention (closing exercise: add a `bad_*` file
  "and confirm `run_all.sh ch02` stays green") describes no row types and
  stays true — though it points the reader at a manifest whose header comment
  now under-documents itself (Remaining defects, D3).
- **ch03.md — clean, including the counting claims.** "One of only two
  sensitivity-list diagnostics Icarus offers anywhere in this chapter" — still
  exactly two (`bad_arraysens`'s array warning, `bad_svalways`'s `always_ff`
  edge complaint), both re-captured. The second `bad_arraysens` diagnostic
  (`all bits in 'v[3:0]'`) is quoted only behind "ask for the class by name",
  and indeed does not appear at plain `-Wall` — consistent. The detection
  table's "one warning at `-Wall`" accounting and the Sources' "Twenty build
  targets, all green" both hold under the new gate.
- **ch04.md — clean.** Its harness prose (`run_all.sh` "compiles into a fresh
  `mktemp -d` every run", the Makefile/`targets.txt` seed note) is unaffected;
  "Fourteen build targets, all green" reproduced cold. No zero-warning claim.
  Its `bad_*` `run` targets all compile silently (proven by the gated 78/78).
- **ch05.md — clean.** "`run_all.sh` — the whole book so far, 73 targets" is a
  chapters-1–5 statement and 27+20+14+12 = 73 still; ch05's 12 targets passing
  under the gate *upgrades* its warning-silence from claim to enforced
  property. No stale text found.
- **ch06.md** intro ("all five build targets run green through
  `run_all.sh ch06`") and the rewritten Icarus-reality box are both true under
  the new harness.

## Listings, transcripts and word count

- **All 6 fenced `verilog` blocks re-checked mechanically**: each is a
  **byte-identical contiguous region** of its file (`tb_sub4.v`, `tb_ovf4.v`,
  `tb_signtraps.v`, `fixmul44.v` ×2, `satq44.v`). The `fixmul44.v` header edit
  sits in lines 10–13 of the file, outside both quoted slices, exactly as
  STATE.md claims.
- **All 10 simulator-transcript blocks re-checked against fresh captures**:
  all five testbenches recompiled (each individually **silent** under
  `-g2012 -Wall`) and re-run this session; every transcript block is a
  contiguous line-for-line slice of the fresh output, abridgement declarations
  unchanged from r1 and still accurate. No transcript was affected by the fix
  round (the header edit is a comment; no output-bearing code changed).
- **Orphaned-logic sweep around each edit**: no sentence anywhere still leans
  on the old whole-float-compares claim (chapter grep clean; the two chapter-8
  hand-offs use the magnitude/exponent-field form); the corrected teaser's
  "reserves" forward-reference agrees with the chapter-7 seed's
  "reserves stored 0 and 255"; the trap-table row still matches its column
  register (two-clause symptom, resolvable section pointer); the pi paragraph's
  neighboring numbers (51472 → −14064 → −0.8583984375; 25736 → 3.1416015625)
  all re-verified. The old "re-measured on every harness run" phrasing appears
  nowhere; the replacement box text is measured true.
- **Word count: `wc -w` = 9,600 — NOT the 9,775 STATE.md claims twice.** r1's
  9,534 matched `wc -w` exactly, so the project's counting convention is not
  in doubt; the fix round added ~66 words and then reported 9,775, a number
  that reproduces under no counting I tried (chapter alone 9,600; chapter +
  README 11,004). Wrong-number nit in STATE.md, not in the chapter — but it is
  the project's signature defect class appearing in the fix round's own
  report. See Remaining defects, D2.

## Numbers spot-checked

Twelve r1-verified figures re-derived from scratch, confined to the changed
regions and their immediate neighbors (full script in the session scratchpad;
every one exact):

1. `8'b11111111` = 255 unsigned, −1 two's complement, −0.0078125 as Q1.7 ✓
2. 255 − 127 = +128; stored-255 reserved (max normal stores 254) ✓
3. `8'hFD` → 253 / −3 (the intro's `tb_signtraps` anchor) ✓
4. All five binary32 anchor rows adjacent to the edited sentence (1.0, 2.0,
   0.5, min normal, max normal) bit-exact via `struct`, stored−127 = actual on
   every row ✓
5. −1.0 → 0xBF800000, 2.0 → 0x40000000, lexical order inverted vs magnitude ✓
6. 2^−14 = 6.1035e−5; encode error 8.909e−6 < 2^−14 ✓
7. π·2^14 rounds to 51472; wraps to −14064 → −0.8583984375; π·2^13 → 25736 →
   3.1416015625 ✓
8. float32(0.1) relative error +1.4901e−8, high side ✓
9. Raw Q8.8 product range [−16256, +16384], top reached only by (−8)·(−8) ✓
10. Requantized range [−1016, +1024], exact for all three requantizer outputs ✓
11. Bias ledger: floor −425984 (mean −0.40625 LSB), half-up +65536 (+0.0625),
    half-even exactly 0, ties 8192 = 1/8 ✓ (the README's asserted totals)
12. Necessity of p/2^k for exact float storage (spot sample of non-dyadic
    fractions, none round-trips) ✓

## Remaining defects

None in the chapter, the code, or the harness. Four in supporting documents,
all prose, none able to regress code — orchestrator-inline material per the
ch02/ch03/ch05 precedent:

- **D1 (should fix before ch07 research):**
  `research/ch06-binary-fixedpoint.md` lines ~375–377 still state the
  **uncorrected** false claim — "*the whole float compares like an integer* —
  larger magnitude floats have lexically larger bit patterns" — with no
  sign-bit qualifier and no correction note. r1's item 3 prescribed only the
  chapter fix, so this is not a failed checklist item; but r1's item 2
  rationale ("so the next chapter doesn't inherit it back") applies with equal
  force, chapters 7 and 8 are the IEEE-754 chapters most likely to consult
  these notes, and an uncorrected note is exactly the inheritance path that
  produced the π-bound defect. One clause plus a dated correction marker, same
  pattern as §5.3.
- **D2 (nit):** STATE.md's word count for the fixed chapter — "9775 w after
  fixes" (chapter table) and "Chapter now 9775 words" (run log) — does not
  reproduce: `wc -w` = **9,600**. A claim recorded without re-measurement, in
  the entry describing a fix round whose r1 driver was exactly this defect
  class.
- **D3 (nit):** `src/ch02/targets.txt` and `src/ch03/targets.txt` header
  comments still document the format as two row types ("`<expect>` is run |
  xfail") while the files below them now contain `warn` rows. The runner's
  own header documents all three correctly; the chapter-local manifests —
  one of which ch02's closing exercise sends the reader to edit — no longer
  describe their own contents. Two comment-block touch-ups.
- **D4 (nit):** STATE.md says the warn conversion "pins their quoted
  diagnostics"; the gate actually pins *that a diagnostic exists* (non-empty
  compile log), not its text — a future Icarus that rewords a warning passes
  the gate with a stale transcript. The trailing clause of the same sentence
  states the true mechanism, and the `run_all.sh` header is accurate, so this
  is a wording nit; "pins that these targets still warn" would be exact.

Observation, no action required: an unknown `expect` keyword in a manifest
falls through to the `run` branch silently (pre-existing; surface slightly
larger now that there are three valid keywords).

## Tree restoration proof

- Baseline: SHA-256 of all **124** files under `guide/src` taken before any
  other action this session (`baseline.sha256`, session scratchpad).
- All mutation work (`p_even >> 4`, ties-to-odd DUT, ledger-only testbench)
  and all harness self-tests ran on copies in the scratchpad
  (`scratchpad/mut/`, `scratchpad/harness/`); every hand compile of real
  sources wrote its object to the scratchpad or `/dev/null`; `run_all.sh`
  builds in its own `mktemp -d`. Nothing under `guide/` was edited except this
  review file.
- Final check, after all runs: `sha256sum -c baseline.sha256` → **124/124 OK,
  0 mismatches**, file count still 124 (nothing added);
  `git -C /home/user/erancihan status --short` shows exactly one entry —
  `M guide/reviews/ch06-review-r2.md`, this file (its skeleton was committed
  by the orchestrator mid-review). The tree is clean of review-side changes.
