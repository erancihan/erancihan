# F3 — Final Report

**Project:** Verilog Learning Guide — Four-Input IEEE 754 Single-Precision Floating Point Adder
**Report date:** 2026-08-21
**Author:** F3, the closing pass
**Status of the work reported on:** all fourteen chapters closed; F1 (assembly) done; F2 (smoke test) PASS.

<!-- sections complete: 9/9 -->

## 1. What Was Built

Two things: a guide, and a working design with its verification kit. Both live under
`/home/user/erancihan/guide/`.

### The guide

| Artifact | Location | Size |
|---|---|---|
| Assembled guide | `guide/guide.md` | **176,154 words**, 1,109,974 bytes, 9,930 lines |
| Chapter sources | `guide/chapters/ch01.md` … `ch14.md` | 171,536 words across 14 files |
| Introduction | `guide/front-matter.md` | 3,027 words |
| Assembler | `guide/assemble.py` | re-runnable; rebuilds `guide.md` from the two above |

`guide.md` carries 15 `#` headings (the guide title plus fourteen chapters), 225 `##`
sections, 399 fenced blocks, and a generated two-level table of contents of 224 section
links. All fourteen chapter bodies are byte-exact substrings of it, in order — I checked
this session, not by trusting the record.

**On the word count.** The project's figure of record has been 173,116 (F1) and this file
now measures 173,152 under `wc -w` in the POSIX locale. That count is 3,002 words low, and
I found out why: in the POSIX locale GNU `wc -w` does not count a token made entirely of
non-ASCII bytes. The guide contains exactly 3,002 such standalone tokens — 2,491 em dashes,
plus `−`, `→`, `×`, `≥`, `│`, `≤`, `≈`, `≠`, `…`. Under `LC_ALL=C.UTF-8`, `wc -w` and
Python's `str.split()` both return **176,154**, and the arithmetic reconciles exactly:
171,536 (chapters) + 3,027 (front matter) − 77 (build markers) − 3 (`<!-- TOC -->`)
+ 1,656 (generated TOC) = 176,154. Both numbers describe the same bytes. I quote the
locale-independent one and give the POSIX one beside it, because the project's own record
mixes the two and that mixing caused at least three bookkeeping corrections along the way
(chapters 6, 10 and 13 each had a word count re-reconciled). The guide's own introduction
says "about 173,000 words"; that is the POSIX figure, hedged, so the two do not conflict —
but it is ~3,000 low against the locale-independent count, and anyone quoting either number
should say which tool produced it.

The guide is 14 chapters long. It goes from gates and boolean algebra (chapter 1) to a
specified, proven, pipelined four-input IEEE 754 binary32 adder (chapter 12), then to
SystemVerilog (13) and the research frontier with an 87-entry annotated bibliography (14).

### The code

`guide/src/` holds **217 files** in 13 chapter directories (`ch02`–`ch14`; chapter 1 ships
no code):

- **158 `.v`** and **20 `.sv`** source files — 178 sources, every one reachable from a manifest
- 13 `targets.txt` manifests, 13 `README.md` files
- 5 `.vh` generated coverage libraries and 4 `.py` generators (chapter 12 only)
- 2 `.hex` vector files and 1 `Makefile` (chapter 4), 1 `run_all.sh`

Nothing else. No build artifacts, ever: `run_all.sh` builds into a `mktemp -d` and removes
it on exit. I re-checked the file inventory after two full regression runs — still 217
files, still no `.py`/`.vh` outside `ch12/`, no `.sv` outside `ch13/`, and `git status` on
`guide/` clean.

**123 targets** across the 13 manifests: **102 `run`** (must compile with zero `iverilog`
output and simulate without printing `FAIL`), **10 `warn`** (must compile *with* a
diagnostic — deliberate warning demonstrations whose presence is pinned), **11 `xfail`**
(must fail to compile — deliberate teaching examples).

### The design

Chapter 12's `fp32_add4` is the deliverable: a **pipelined four-input IEEE 754 binary32
adder**, tree-structured as `(a+b)+(c+d)`, latency 4, 336 register bits, control-only reset.
It is assembled by instantiating the modules the earlier chapters build — chapter 2's
`align_sticky`, chapter 7's `fp32_fields`/`fp32_class`, chapter 9's seven-module
`fp32_add2` decomposition, chapter 11's `fp32_add2_p2` pipeline — so the book's listings
and the shipped design are the same code, not parallel copies.

It has a written specification (S1–S10) in which every clause cites the measurement that
settled it: the tree shape and the port-to-operand mapping are both **normative**, because
the operand multiset {max, max, −max, −max} returns qNaN, +inf or +0 depending on structure
*and* port order; rounding is per-stage roundTiesToEven, three roundings, priced honestly
(it equals the correctly rounded four-input sum on 98.3 % of full-range quadruples);
flags are the composition's OR, with `inexact` one-directionally over-reporting by 7.095 %
on the win2 regime; underflow is omitted with a proof rather than a shrug; `−0` results iff
all four inputs are `−0`; NaN payload priority is a > b > c > d as measured.

### How to run it

```
cd /home/user/erancihan/guide/src && SIM_TIMEOUT=120 bash run_all.sh
```

A subset takes arguments: `bash run_all.sh ch02 ch09`. Everything compiles with one command
and no other flags: `iverilog -g2012 -Wall -o <out> <sources> && vvp <out>`.

**Icarus Verilog 13.0 is a hard requirement, not a preference.** Chapters 5, 9, 12 and 13
use `$shortrealtobits` / `$bitstoshortreal` to get an IEEE 754 binary32 golden model inside
the simulator. Those system functions do not exist in Icarus **12.0**, which is what
Ubuntu's `apt` installs today. Under 12.0 the regression fails six targets — both chapter 5
`shortreal` testbenches, two chapter 5 tolerance targets, two chapter 2 targets — with
`$bitstoshortreal() is not defined` at `vvp` **load** time, after a clean compile. That
failure mode is nasty precisely because compilation succeeds. Build tag `v13_0` from
`github.com/steveicarus/iverilog`. The version in use here is
`Icarus Verilog version 13.0 (stable) (v13_0-dirty)` at `/usr/local/bin/iverilog`, with
python3 3.11.

Raise `SIM_TIMEOUT` for full runs. The default is 60 s; the two longest targets measured
**37.4 s** (`ch10/tb_equiv4`) and **39.9 s** (`ch11/tb_stream4`) on an idle machine in this
session, and F2 measured them at 46.5 s and 49.1 s under 4× load — 77 % and 82 % of the
default. They are correct and they are close enough to flake.

To rebuild the assembled guide after editing a chapter:

```
cd /home/user/erancihan/guide && python3 assemble.py
```

I ran it this session against the committed `guide.md` and the output was **byte-identical**
(SHA-256 unchanged). The merge is mechanical: it drops the `<!-- sections complete: N/N -->`
build markers, substitutes a generated TOC for the `<!-- TOC -->` placeholder, and copies
chapter bodies byte for byte. Nothing is reflowed.

## 2. Chapter-by-Chapter Record

Word counts are `wc -w` measured this session on the current chapter files, in both
locales (see §1 and §9). **These differ from the per-chapter figures in `STATE.md`'s
checklist table**, for two reasons I verified: that table mixes the two tokenizers, and it
records counts taken at chapter close, before F1's assembly edits (17 positional
cross-references converted to named titles, 8 quotation repairs, 27 `this book` → `this
guide`) and before two later corrections into chapters 5 and 12. The chapter-file total,
171,536 words, reconciles exactly with `guide.md` (§1), so nothing is missing — only the
per-chapter bookkeeping drifted.

| # | Title | Words (UTF-8 / POSIX) | Targets | Score | Reviewer persona | Reviews / fix rounds | What the review found |
|---|---|---|---|---|---|---|---|
| 1 | Digital Logic Foundations | 11,854 / 11,635 | — | 7 → 8 → **9** | RTL veteran | 3 / 2 | Every equation survived re-derivation; three of thirteen ASCII schematics were **electrically wrong** (shared character columns are shorts), and fix round 1 introduced a comparator regression shipped with a false "verified exhaustively". |
| 2 | The Verilog Language | 18,714 / 18,511 | 27 (20/5/2) | 7 → 8 → 8 | Pedagogy expert | 3 / 2 + inline | Code immaculate, transcripts reproduced character-for-character; the **sticky-bit definition contradicted the shipped module**, which could not support round-to-nearest-even — the chapter's designated FP payload. Two later defects were a false rationale for a guard and four positional cross-references orphaned by a section move. |
| 3 | Combinational and Sequential Logic | 15,490 / 15,353 | 20 (17/2/1) | 7 → 8 | RTL veteran | 2 / 1 + inline | All 23 listings byte-identical; the chapter claimed `always_comb`/`always_ff` turn its silent bugs into compile errors — **measured false on Icarus 13.0**, inside its own "Icarus reality" callout. The detection table then grew from 10 to 14 audited rows. |
| 4 | Simulation, Testbenches and Waveforms | 9,990 / 9,880 | 14 (14/0/0) | 6 → 7 → 7 | RTL veteran | 3 / **3** | The lowest score and the only chapter to use all three fix rounds. The reviewer **broke the DUT and checked whether the test noticed**: `tb_dump.v` printed PASS against a `pipe2` rebuilt with one flip-flop. Review 2 found three more tests that could not fail; review 3 found none, but caught the fix round certifying a survivor as "provably equivalent" and killed it from the port alone. |
| 5 | Verification: Knowing When You Have Tested Enough | 11,897 / 11,722 | 12 (10/0/2) | 7 → 8 | Pedagogy expert | 2 / 1 + inline | 32 of 34 statistics re-derived exactly; 34 fresh mutations found **three tests that cannot fail at what they appear to test**, plus a `shortreal` exemption defect. Round 2's two residuals were both claims-stronger-than-measurement: a provably false guard rationale and a mutation ledger (42/38) that did not reconcile with its own 41-row table. |
| 6 | Binary Number Systems and Fixed Point | 9,777 / 9,600 | 5 (5/0/0) | 7 → **9** | IEEE 754 specialist | 2 / 1 | 112 of 115 re-derived numbers exact. Four claim defects: `8'b11111111` glossed as exponent −112 (it is +128), a Q3.13 step bound inherited wrong from the research notes, "the whole float compares like an integer" (false for opposite signs), and a claim that warning-silence was re-measured every harness run when **the harness demonstrably swallowed compile warnings**. That last one was closed by making it true. |
| 7 | IEEE 754 Single Precision in Depth | 9,890 / 9,640 | 4 (4/0/0) | 8 → **9** | IEEE 754 specialist | 1 / 1 | No blocking defects. Every hex constant, all 40 rounding-table cells and the never-underflow proof survived the reviewer's own 448k-pair exact search; the classifier survived a 67.1M-pattern sweep. Defects were all claim-level, including an **impossible measurement method** stated for one table row and a silent contradiction of chapter 5's flags enumeration. |
| 8 | Floating Point Addition: Align, Add, Normalize, Round | 11,407 / 11,090 | 4 (4/0/0) | 8 → **9** | IEEE 754 specialist | 1 / 1 + ripple | The reviewer built its own exact reference and drove **1,004,425 pairs** through the shipped algorithm with zero mismatches on bits and all three flags, plus an exhaustive small-width proof of the 28-bit budget. All defects were claims: an unreproducible associativity rate (3.33 % printed; 0.64 % measured), a `d ≥ 25` figure paired with a `d ≥ 26` property, two wrong ratio bounds. Fixing one of them triggered the project's signature **bookkeeping ripple** — see §6. |
| 9 | Building a 2-Input FP Adder in Verilog | 10,062 / 9,857 | 6 (6/0/0) | **9** | RTL veteran | 1 / 0 + inline | The first chapter to score 9 on review 1. A 141,936-check three-way sweep (RTL vs golden vs exact Python, adversarial tie and clamp families) found zero mismatches; 24 of 33 mutation rows reproduced, several byte-identically. Three nits only, including the chapter's single positional cross-reference, which also mis-resolved. |
| 10 | Extending to Four Inputs | 9,784 / 9,575 | 3 (3/0/0) | 8.5 → **9** | IEEE 754 specialist | 1 / 1 | The reviewer rebuilt the exact single-rounding oracle from scratch and reproduced every headline with its own seeds, including a 900k-evaluation adversarial hunt confirming the `inexact` over-report is one-directional. The notable defect was in **`STATE.md` itself**: a "statistically indistinguishable" overclaim where the measured win2 gap is >13σ. Also: the corner suite printed but did not assert the NaN payloads its own table listed. |
| 11 | Pipelining, Timing, Synthesis Considerations | 10,033 / 9,836 | 8 (8/0/0) | 8 → **9** | RTL veteran | 1 / 1 | All 26 mutation rows reproduced to the unit; the reset `+inf` trap re-derived from source; **zero timing claims crossed the epistemic wall**. The headline defect was a shipped testbench *comment* asserting a stale measured value (10 where the shipped stimulus measures 9) — the cardinal defect class, hiding in a comment. |
| 12 | Complete Four-Input Adder | 11,688 / 11,436 | 5 (5/0/0) | 8 → **9** | RTL veteran | 1 / 1 | The payoff chapter. All ten spec clauses reproduced under the reviewer's own measurements; the D9 five-step proof checked line-by-line against the RTL plus an independent 604,096-vector diff. Two real defects: a straddle-discipline claim falsified by an unstraddled `d ≤ 3` boundary, and the 7.095 % figure quoted without its regime conditioning. Fixing the first grew the directed library 57 → 58 quads, which is how F2 later found a stale count. |
| 13 | Advanced Topics and the SystemVerilog Transition | 11,527 / 11,376 | 14 (5/3/6) | 7 → **9** | Pedagogy expert | 1 / 1 | The reviewer called the engineering the strongest in the guide and independently re-verified all four SystemVerilog rewrites (300,000 and 300,424 vectors, zero mismatches). Five blocking prose defects, including a **fabricated chapter-5 quotation** used to stage a correction of a position chapter 5 never held, and a `priority case` "sorry" claim that does not reproduce. The fix pass then introduced three copy-edit slips, which the reviewer also caught. |
| 14 | Research Frontier and Annotated Bibliography | 19,423 / 19,091 | 1 (1/0/0) | 8 → **9** | Citation checker | 1 / 1 | 88 URLs re-fetched with status, content-type, effective URL and saved bodies; 73 quoted strings substring-tested — 50 exact, 16 exact after PDF-artifact normalisation, 1 marked elision, 6 with an added terminal period, **zero fabricated**; no invented URL, no unresolved DOI. Two blocking defects: a mutation row recording **0 order violations for a mutant that provably reverses order** (re-run: 11,744 errors), and a paraphrase presented as a quotation of chapter 5. |

**Totals.** Fourteen chapters, **23 review passes** in 23 review documents (plus one
separate fix-round record for chapter 5, and F2's smoke test — 25 files in
`guide/reviews/`). Final scores: **ten 9s, three 8s** (chapters 2, 3, 5) and **one 7**
(chapter 4). Mean **8.64**. Every chapter was signed off as fit to ship by its reviewer.

Two things in that table are worth reading twice. First, **not one blocking defect in the
whole project was a defect in the shipped Verilog.** Every blocker was a claim, a count, a
diagram, a quotation, or a testbench that could not fail. Second, **the score trend is
real**: chapters 1–5 averaged 8.0 after up to three fix rounds each; chapters 6–14 *all*
closed at 9, each with one fix round, and chapter 9 needed none. What changed was not the
writers — it was that by chapter 6 the project had a warning-gated harness, a mutation
discipline, and a written rule about the epistemic wall.

**One correction to the record, found while writing this report.** `STATE.md`'s run log
records chapter 12's mutation ledger as "23 runs". The shipped `src/ch12/README.md`
recounts it as **24** — "6 design-mutant runs + 15 bench/library/coverage-model mutation
runs + 2 shipped closure demonstrations = 24 recorded runs this session: 20 killed or
guard-fired, 2 REQUIRED survivals, 2 required-FAIL closure demonstrations." I counted the
README's mutation tables independently and got 24 data rows, agreeing with the README. The
README is right and `STATE.md` is stale — and the reason it is stale is the same fix (the
`m10` straddle vector) that F2 later caught staling a different count. That makes it a
fourth instance of the project's most frequent defect class; see §6.

## 3. Verification Status: What Was Proved, and How

F2's verdict was **PASS — fit to ship**, recorded in `guide/reviews/F2-smoke-test.md`
(15 sections, 9,977 words). I re-ran the load-bearing parts of it this session rather than
citing it.

### Reproduced this session

| Check | Result |
|---|---|
| Full cold regression, `SIM_TIMEOUT=120` | **123/123 passed, 0 failed, exit 0** |
| Second full cold run, timed | **123/123, exit 0, 216 s** (F2 measured 216.3 s) |
| `guide/src` file inventory after both runs | 217 files, unchanged; no artifacts |
| Artifact-rule extensions | `.py`/`.vh` confined to `ch12/`, `.sv` confined to `ch13/` |
| `git status guide/` | clean |
| `python3 assemble.py` re-run | `guide.md` **byte-identical**, SHA-256 unchanged |
| All 14 chapter bodies inside `guide.md` | byte-exact substrings, in order |
| Manifest arithmetic | 102 `run` + 10 `warn` + 11 `xfail` = 123 |
| `ch10/tb_equiv4`, `ch11/tb_stream4` wall clock | 37.4 s, 39.9 s idle (62 %, 67 % of the 60 s default) |
| Citation spot-check, content-aware | 12 URLs; see §5 |

### What F2 proved, and how

- **Determinism, tested harder than the harness tests it.** The harness only checks
  pass/fail. F2 captured every target's *full stdout* across two instrumented passes and
  compared byte-for-byte: **0 of 123 files differed**. That matters because the guide
  quotes simulator transcripts as evidence; if the output were not deterministic, every
  quoted transcript would be a sample rather than a fact.
- **The harness's three contracts were tested with deliberately-wrong targets, not
  assumed.** A warning-emitting module under `run` fails; a silent module under `warn`
  fails; a compiling module under `xfail` fails; a `warn` row still runs the simulation
  gate; an exit-0 testbench that prints `FAIL` fails; a hang is killed and reported. **Ten
  contract cases, ten hold.** This is the right order of operations: audit the instrument
  before trusting its readings.
- **Manifest reachability.** All 178 sources are reachable from some manifest — no orphans,
  no manifest naming a file that does not exist.
- **The artifact rule is exact.** After five full builds of the tree, `guide/src` held
  exactly its 217 committed files.
- **Regeneration stability.** Both chapter 12 generators were re-run on a copy and produced
  **byte-stable** `.vh` libraries. The coverage library is generated code that the RTL
  compiles against; if regeneration drifted, the pinned bins would be fiction.
- **Listing integrity, guide-wide.** 101 of 101 shipped-code fences in `guide.md` are
  byte-identical to the files they claim to quote, with 16 code-tagged misses individually
  adjudicated (declared abridgements, illustrative-only listings, and transcripts).
- **Mutation records spot-checked adversarially.** Six mutations across twelve recorded
  rows were re-applied and re-run — 15 of 15 checked rows reproduced. This is how F2 found
  the one defect it found.
- **The headline claims re-run with their failure modes made to fire.** Four claims
  (golden-model equivalence, 105/105 coverage closure with pins matched, the D9 witness
  killing its mutant, the streaming latency property) were reproduced *and* deliberately
  broken to confirm the checks are not vacuous.

### The one defect F2 found

A quoted transcript line read `exact_zero fired on an effective add 38 times`. The shipped
kit produces **39**. Root cause, proved by experiment: the chapter 12 review's `mx1` fix
added a 58th directed quad to the coverage library, and the DM4 row was never re-run after
the library grew. F2 reproduced 39 twice, corrected all three sites
(`src/ch12/README.md`, `chapters/ch12.md`, `guide.md`) and re-assembled the guide. The
row's substantive claim reproduced exactly; only the count was stale.

### The strength of the arithmetic evidence

Across the chapters, the design and its models were checked against independent references
at scale. The largest campaigns, each recorded in its chapter with the seed and generator
stated: chapter 7's classifier through a **67.1M-pattern** sweep; chapter 8's algorithm
against an exact `Fraction`-based RNE reference on **1,004,425 pairs** with zero mismatches
on bits and all three flags, plus an **exhaustive** small-width (p = 5) run of the same
ten-step algorithm as structural evidence for the 28-bit budget; chapter 9's seven-module
decomposition proven bit-identical to chapter 8's algorithm over 200,092 checks and then
re-swept by its reviewer over 141,936 three-way checks; chapter 10's two four-input
structures proven bit-identical to order-faithful references over 240,000 quadruples × 2
structures × 2 reference styles; chapter 11's pipelines proven bit-identical to their
combinational parents over >1M streamed transactions; chapter 12's D9 acceptance proof
attacked with **2,000,320** targeted shipped-vs-mutant diff vectors with zero divergence;
chapter 13's four SystemVerilog rewrites re-verified by the reviewer on 300,000 and 300,424
vectors.

Three properties were proved **exhaustively**, not sampled: Sterbenz's lemma in a toy
format (3,151/3,151), chapter 6's `satq44` and `fixmul44` over all 65,536 operand pairs,
and chapter 5's `adder8` mutant over all 65,536 pairs (wrong on exactly 16,512 = 25.195 %,
agreed to the pair by an exhaustive Python loop and by `vvp`).

## 4. What Was Not Verified

The guide's own introduction carries a "Scope, and What This Guide Does Not Do" section.
This is the same inventory from the verification side, stated without softening.

**No synthesis tool existed in this environment.** Not Vivado, not Quartus, not Yosys; no
static timing analyser; no simulator other than Icarus. The design was **never synthesised,
never placed, never timed**. Therefore:

- Every statement in the guide about gate count, area, Fmax, critical path or clock period
  is **documentation, not measurement**. Chapter 11 is honest about this — its reviewer
  specifically confirmed that **zero timing claims crossed the epistemic wall** — and what
  chapter 11 actually does is *count registers* (336 bits for the four-input pipeline,
  3× the two-stage `fp32_add2`), which is arithmetic and is real. It does not tell you how
  fast the design runs, because nothing here could.
- The pipeline cut points were chosen from *bit-width* budgets at the module seams
  (100/95/73/72 bits), not from timing. Whether those are the right cuts for a real
  synthesis flow is unknown.
- No lint tool ran either. `which verilator` is empty on this machine, and the chapters say
  so. Every claim about what Verilator, Vivado, Questa or VCS would report is attributed as
  read, not measured — chapter 3 was corrected mid-project for letting one such claim
  cross that line unflagged.

**The design is binary32-specific and unparameterised.** There is not one `parameter`
declaration in the shipped RTL (`src/ch09`, `src/ch12`) — verified. Chapter 5 argues, well
and with numbers, for parameterising an FP datapath so it can be verified exhaustively at a
tiny width before instantiation at the real one, and **chapter 12 then does not do it**.
The cost is real and is stated in three places: retargeting to bfloat16 or FP8 is a rewrite
across nine files, not a parameter override, and the reduced-width exhaustive strategy
chapter 5 recommends was never exercised on the guide's own design.

**The kit is verified against reference models and sweeps, not proved correct.** This is
the most important sentence in this section. What exists is:

- bit-for-bit agreement with independently built exact references over large but *finite*
  vector sets, with the seeds and generators stated;
- exhaustive proof only where the space is small enough to afford it (§3);
- a five-step written proof for the D9 acceptance, attacked with 2,000,320 targeted
  vectors — but a proof written and checked by the project's own agents, not by a formal
  tool.

There is no formal equivalence check, no model checker, no property proof. A defect that
is invisible to every shipped testbench, every reviewer's independent sweep, and every
recorded mutation would ship silently. The project's own measurements show that this is not
hypothetical: chapter 8 found that the rounding-carry renormalize path fires **0 times in
1,000,000 random pairs** — a random campaign of any size will never reach it — and chapter
10's D9 mutant survives the entire four-input kit at the output level by construction.

**Other things not verified.** The four-input result is deliberately *not* the correctly
rounded four-input sum; it is the three-rounding composition, which equals the correctly
rounded sum on 98.3 % of full-range quadruples and as little as 67.96 % under clustered
exponents. NaN payload propagation is specified as *this implementation's measured
behaviour* and is explicitly not portable — the guide records that Icarus emits a positive
qNaN from constant folding and a negative one at runtime for the same expression on the
same host, and that the arm64 and x86-64 sessions disagreed on the sign of `inf + (-inf)`.
There is no stall, backpressure, FMA, multiply, divide, square root, flush-to-zero, or trap
handling. Waveform *generation* is machine-checked; nothing about a waveform *viewer* is,
because neither GTKWave nor Surfer has a headless render mode.

**And this report's own limit.** I re-ran the regression, the assembler, the file
inventory, the structural counts and a 12-URL citation spot check. I did **not** re-run
F2's full battery (the instrumented determinism capture, the ten harness contract cases,
the 101-fence listing check, the mutation spot-checks) or any chapter's verification
campaign. Where this report states such a result, it is F2's or a reviewer's measurement,
and it is attributed as such.

## 5. Open Concerns Carried Forward

Everything below is known, deliberate and recorded. None of it blocks the ship; each entry
says why.

### Harness weaknesses (three, found by F2, none exploited)

The harness is the instrument the whole project's evidence passes through, so its blind
spots matter more than their current impact.

| # | Weakness | Why it is acceptable today | What would close it |
|---|---|---|---|
| **H1** | An `xfail` row naming a **missing file** PASSES. | F2 proved every manifest-named path exists, and separately confirmed each of the 11 `xfail` targets fails for its *stated* reason, not incidentally. | Assert the file exists before expecting the compile to fail. |
| **H2** | A chapter with **no `targets.txt`** is silently `SKIP`ped and the suite still exits 0. **There is no expected-total assertion anywhere.** Delete a manifest and 123/123 becomes a green 118/118. | The number 123 lives only in prose — and in this report. The tree is committed and `git status` is clean, so a deletion would be visible. | `EXPECT_TOTAL` check, or a committed count file. One line. |
| **H3** | A `run` row with **no testbench** passes silently: the gate is *absence of `FAIL`*, not *presence of a verdict*. | All 112 simulating targets print `PASS`. | Require a `PASS` line, symmetrical to the `FAIL` grep. |

H2 is the one I would fix first. It is the cheapest, and it is the only one that can turn a
*shrinking* suite into a green light — which is exactly the failure mode the guide teaches
against in chapter 4 (a cached `make` result is "a test that has quietly stopped running").

### Two flake-risk targets

`ch11/tb_stream4` and `ch10/tb_equiv4` are sized close to the default 60 s `SIM_TIMEOUT`.
Measured this session on an idle machine: **39.9 s** and **37.4 s** (67 % and 62 %). F2
measured them under 4× load at **49.1 s** and **46.5 s** (82 % and 77 %). Both are correct;
both could time out on a loaded machine and report as failures. Mitigation shipped: the
front matter tells the reader to run full regressions with `SIM_TIMEOUT=120` and names
chapters 10, 11 and 12 with the measured figures. Accepted rather than fixed because
shrinking the campaigns would weaken the evidence they produce, and the guide's rule is
that recorded wall-clock figures are session observations, not contracts. Chapter 11's
`tb_stream4` was itself observed at 36.7 s and 56.0 s on the same host on different days.

### D9 — accepted by proof and witness, not patched

Chapter 9's latent `exact_zero` behaviour survives the entire four-input kit at the output
level. It was **formally accepted, not fixed**, and the reasoning inverted the project's own
earlier preference for a code change:

- the shipped `fp32_addsub` is *proven equal* to the specified function at every boundary
  (a written five-step proof, attacked with 2,000,320 targeted shipped-vs-mutant diff
  vectors including all cancellation-born-zero patterns — zero divergence);
- the literal fix measurably **breaks** the unit contract and merely relocates the latent
  region into `fp32_round_pack`;
- the clean fix is green everywhere but re-opens three already-reviewed chapters' prose for
  zero functional gain;
- instead, a 17-vector armed-and-count-guarded invariant on the DUT's own wires kills the
  mutant 27 times with no design edit.

This is the right call on the evidence, and it is also the entry a future maintainer is
most likely to misread. It should be read as: *the module is correct as specified; the
specification is narrower than a casual reader would assume; the witness testbench is what
holds that boundary.* If the specification is ever widened, D9 reopens.

### The unparameterised design

Covered in §4. It stays open because closing it is a rewrite, not a fix, and because the
guide states the gap in three places rather than hiding it. It is the first item on the
guide's own "what to do next" list.

### The `[title-only]` convention differs in form between chapters

Chapters 1–6 group their sources under headings ("Machine-verified locally", and a
separate unlinked group); chapters 7–14 tag entries inline with `[title-only]` — 60
occurrences, all in chapters 7, 8, 12, 13 and 14, zero in chapters 1–6. Verified this
session. Both notations state the same rule: *a source with no successful fetch gets no
URL, and the reason is given.* F1 decided not to churn six reviewed chapters over a
cosmetic difference and instead documented both notations in the introduction's
"Conventions" section. Correct call, still a difference a reader can notice.

### Chapter 4's `counter4`

Reset priority and reset synchronicity are untested: giving `en` priority over `rst_n`, and
making the reset asynchronous, both survive `tb_anatomy`. Nothing false is claimed —
`tb_anatomy` is presented as a shape, not a complete test — but the closing checklist
invites readers to break the DUT, and either of those choices gives a green run. The
related chapter 4 concern (`adder8`'s carry function) was **closed** by chapter 5, which
ships the mutant and makes it the running example; and the `counter6` async-reset survivor
was killed by a chapter 5 fix-round check.

### Two unfixed F2 nits

- **N1** — `src/ch14/README.md`'s M8 row says "killed by directed **D1**"; measured, all
  six directed vectors fire. The row's load-bearing column (0 order violations) is correct.
  Still says D1 today.
- **N3** — chapter 11's 44-line VCD-parsing Python listing is inline-only and correctly not
  shipped (`.py` is scoped to `ch12/`), but unlike chapter 14's Python listings it is not
  explicitly labelled illustrative. A reader could go looking for a file. One clause would
  close it. Still unlabelled today.

(F2's other two nits, N2 and N4, **were** closed: the front matter now says the streaming
targets run at 55–70 % of the default budget and names chapter 10 alongside 11 and 12.)

### `STATE.md` bookkeeping drift

Three items, all found by measuring rather than reading:

1. The per-chapter word counts in the checklist table mix two tokenizers and predate F1's
   edits. The chapter-file total reconciles exactly with `guide.md`, so nothing is missing.
2. Chapter 12's mutation ledger is recorded as 23 runs in `STATE.md` and **24** in the
   shipped README, which recounts it explicitly. The README is right.
3. `STATE.md` is a 19,844-word working record, not a published document. These are
   bookkeeping slips in a log, not defects in the guide — but they are the same class of
   slip the project spent fourteen chapters hunting, which is itself the finding.

### Citation status

The last full audit was chapter 14's review on 2026-08-21: **88 URLs** re-fetched with
status, content-type, effective URL and saved bodies, disputed ones cross-checked through a
second fetch path, and 73 quoted strings substring-tested — zero fabricated, no invented
URL, no unresolved DOI. The guide today carries **74 unique URLs**: 33 across chapters 1–13
(exactly the 33 the record names), 66 in chapter 14's bibliography, 25 shared between them,
none in the front matter. Measured this session.

I did **not** repeat that audit. I ran a 12-URL content-aware spot check today, chosen to
include every hazard mechanism the project recorded:

| URL | Measured today |
|---|---|
| `en.wikipedia.org/wiki/IEEE_754` | 200, `text/html`, 523 KB — resolves (the 429 seen previously was transient) |
| `posithub.org/docs/posit_standard-2.pdf` | 200, **`application/pdf`**, 138 KB — the real PDF today; chapter 14 recorded a bot interstitial serving `text/html` here. **The hazard is intermittent**, which strengthens the rule rather than retiring it |
| `hal.science/hal-01488916` | 200, `text/html` to `curl` — as recorded (this host serves an Anubis challenge to browser-like agents) |
| `github.com/gtkwave/gtkwave` | **403** to `curl` through this proxy — as recorded; the guide's rule is to check the other fetch path before calling it dead |
| `www.digitalsignallabs.com/` | **TLS connection reset, no status at all** — exactly as chapter 14 recorded; the Yates `[title-only]` tag stands |
| `sunburst-design.com/…CummingsSNUG2000SJ_NBA.pdf` | **200 → `paradigm-works.com/technical-library?term=…`**, a search page on another company's site. The redirect-to-search hazard reproduced first-hand, on the exact effective URL the guide prints. The guide cites this URL **only** as the worked example of the hazard, never as a live citation — checked |
| `csg.csail.mit.edu/…cummings-nonblocking-snug99.pdf` | 200, `application/pdf`, 70 KB — the mirror the guide actually cites resolves |
| `steveicarus.github.io/…/command_line_flags.html`, `people.eecs.berkeley.edu/~wkahan/ieee754status/754story.html`, `zipcpu.com/dsp/2017/07/22/rounding.html`, `arxiv.org/abs/2209.05433`, `docs.oracle.com/…/ncg_goldberg.html` | all 200 with expected content types |

Twelve of twelve behaved as the record says, with one change (posithub) that makes the
hazard *less* consistent, not less real. **This is a spot check, not an audit.** Sixty-two
of the guide's 74 URLs were not re-fetched today.

## 6. The Defect Classes This Project Actually Produced

This is the part of the report that is worth something to someone doing similar work. What
follows is not a taxonomy invented for the write-up; it is what the run log actually
contains, with named instances. The classes are ranked by how often they recurred.

A note on ranking. F2 concluded that class A below is "the project's most frequently
recurring defect class". By raw instance count that is not quite right — class B appears in
**every one of the 23 review passes**, and no other class does. What is true, and is the
sharper observation, is that **class A is the most *persistent*: it kept recurring after it
had been named, diagnosed and written into the project's own rules — including once more in
this final report.** Frequency and persistence are different measures and both are worth
recording.

---

### Class B — a claim stronger than its measurement

**Most frequent. Present in all 23 review passes.**

**What it is.** A sentence that is *almost* what was measured: the right shape, a stronger
quantifier. "Verified exhaustively" where three widths were checked. "Provably equivalent"
where a mutant merely survived the stimulus that was tried. "Statistically
indistinguishable" where the gap is 13σ. "Perfectly monotonic" where the run was never
made. A number carried from a research note instead of re-derived.

**Named instances**, one per chapter, all from the run log:

| Chapter | The claim | What measurement said |
|---|---|---|
| 1 | The CMOS pull-up and pull-down networks "both conduct on the same input condition" | Contradicted by a correct statement two paragraphs earlier |
| 1 (fix round) | Strict `A > B` derivation shipped with a "verified exhaustively" parenthetical | The formula actually computes `A = B`; wrong on 32,896 of 65,536 pairs at 8 bits |
| 2 | "An unrecognised system task is a compile-time error" | `iverilog` exits 0; `vvp` rejects it at **load** time |
| 3 | "`always_comb`/`always_ff` turn several of these bugs into compile errors" | Measured false on Icarus 13.0 — and it sat inside the chapter's own "Icarus reality" callout |
| 4 (fix round 3) | A surviving mutant declared "provably equivalent" | The reviewer killed it from the port alone by moving stimulus into the clock's high phase |
| 5 | The new `checks !== driven` guard's stated rationale | Provably false: a cancelling phantom+drop pair passes it |
| 6 | Warning-silence is "re-measured on every harness run" | The harness demonstrably swallowed compile warnings on green runs |
| 7 | A measurement method stated for the spacing table's max-normal row | Impossible as described |
| 8 | An associativity rate printed as 3.33 % | Re-measured 0.64 % with a stated generator (reviewer: 0.63 %) |
| 9 | (only nits — the chapter's claims held) | — |
| 10 | `STATE.md`'s own "statistically indistinguishable" | Measured win2 gap >13σ; the true claim is "significant but direction-unstable" |
| 11 | A shipped testbench **comment** asserting a measured value of 10 | The shipped stimulus measures 9 |
| 12 | The straddle-discipline claim | Falsified by an unstraddled `d ≤ 3` boundary |
| 13 | "`priority case` emits a `sorry`" | Its compile log is zero bytes. Plus an unbounded "in any language" and an unsupportable "invented here" |
| 14 | A mutation row: **0 order violations, "perfectly monotonic"** for a mutant that inverts the result sign bit | Re-run: **11,744 errors**, `0 strictly up` |

**Why it recurs.** Writing is compression, and the strongest available phrasing is always
the most economical. The pressure is structural, not careless: the writer *did* the
measurement, and the sentence describing it drifts by one quantifier during editing. It is
also self-concealing — a claim one notch too strong reads *better* than the true one, so
prose review makes it more likely to survive, not less.

**What caught it.** Independent re-derivation, every time. Not proofreading. The reviewers
who caught the most were the ones who rebuilt the reference from scratch (chapter 8's
`Fraction`-based RNE model; chapter 10's exact single-rounding oracle, validated on 380,576
checks before it was used to judge anything) and then re-measured with **their own seeds
and their own generators**. Chapter 14's blocking defect is the purest example: the row
reported a zero, and a zero is where reasoning substitutes for running. The project turned
that into a standing rule — *spot-check any table row reporting a zero* — and F2 did
exactly that.

---

### Class A — a fix that changes a count invalidates every place that count is quoted

**Most persistent. Six instances, spread across the entire project, the last two found
after the project believed it had learned the lesson.**

**What it is.** A defect is fixed correctly by adding a vector, a bin, a target or a file.
That addition changes a *count*. The count is quoted in a chapter sentence, a transcript, a
README ledger, a manifest header, a bridge paragraph to another chapter, and the run log —
and every one of those becomes false at the moment the fix lands. The fix is right; the
record around it silently rots.

| # | When | The fix | What it staled |
|---|---|---|---|
| 1 | ch03 review 2 | Added `bad_svalways.v` to close a blocking defect | It gave Icarus a **second** warning, falsifying two surviving sentences calling the array warning "the only diagnostic anywhere in this chapter" |
| 2 | ch08 fix round 1 → **ripple round** | Added a saturation vector so a clamp mutant dies on result bits | Two coverage bins moved 6→8 and the check count 90→92, staling a quoted transcript and mutation-record rows. **Six ripple items**, and a whole extra fix round to close them |
| 3 | ch09 review 1 | (ch08's own added corner vector, one chapter earlier) | ch08's bridge paragraph still said "the 45-pair corner library"; the shipped library is 46 pairs, and ch08's own body text already said 46 |
| 4 | ch13 write | The orchestrator's own `cg_cov4.sv` fix added a 6th `xfail` | The chapter still said "thirteen targets" and "121/121"; the manifest had fourteen and the repo ran 122/122. Caught by the reviewer, owned rather than quietly corrected |
| 5 | **F2** | ch12's `mx1` fix grew the directed coverage library 57 → 58 quads | The DM4 mutation row's transcript `exact_zero fired on an effective add 38 times` produces **39**. Quoted in three files; never re-run after the library grew |
| 6 | **F3 (this report)** | the same `mx1` fix | `src/ch12/README.md` recounts its mutation ledger as **24 runs**; `STATE.md` still says 23 |

**Why it recurs.** Counts are derived data stored as literals. Nothing links the sentence
"38 times" to the library that produces it, so no tool can notice when the link breaks —
and the fix that breaks it is, by construction, a *good* fix being made under review
pressure, at the moment attention is furthest from bookkeeping. Instances 5 and 6 come from
the same one-line fix and were found by two different final passes, months of project-time
after the class was named in `STATE.md`. That is the honest measure of how hard it is to
suppress.

**What caught it.** An independent re-run, five times out of six. The exception is
instructive: instance 4 was caught because the reviewer ran `bash run_all.sh` and compared
the number on screen with the number in the prose. That is the whole technique. The
partial defence the project did build — chapter 12's coverage **count guard**, which fires
when the library changes size — worked exactly as designed: it "caught the library change
first" during the `mx1` fix. It just could not know about the three prose sites and the two
ledgers that quoted the old number.

**The cheap fix nobody built.** Every quoted count in this guide could be a generated
value, or at minimum a grep-able tagged literal checked by a script the way `audit.py`
checks quotations. That would have caught instances 2, 3, 5 and 6.

---

### Class C — editing a chapter silently falsifies another chapter's quotation of it

**Eight instances, seven of them found in a single mechanical sweep.**

**What it is.** Chapter N quotes chapter M verbatim and attributes it. Later, chapter M's
sentence is edited — correctly, for good reason. Chapter N's quotation marks now enclose a
paraphrase. Nothing is flagged: both chapters are individually correct, the cross-reference
still resolves, and the section titles still match.

**Named instances.** Found first by chapter 14's reviewer, a citation checker, and only
because it was a citation checker: the orchestrator had corrected chapter 5's
parameterisation sentence, and chapter 14 had already quoted the old wording. Then F1 ran a
guide-wide quotation-integrity audit (`audit.py`: extract every quoted string attributed to
another chapter, confirm it is a literal substring of that chapter's current text) and
found **seven more**:

- ch09 quoting a chapter 7 "promise" that chapter 7 never wrote
- ch09's `"latch = remembers the previous vector"` — not in chapter 3
- ch09's `"documentation value only"` — not in chapter 3
- ch11's `"Icarus alternates same-edge process ordering…"` against chapter 3's actual
  "alternates the order between time steps inside a single run"
- ch13's `"the threshold is -g2005-sv…"` against chapter 5's actual sentence
- ch13's `"defined-looking wrong value"` (twice) against chapter 9's "wrong answer"
- ch08's `"reference more accurate than the DUT"` against chapter 5's "more accurate than
  the specification" — a meaningful shift, not a typo
- ch06 and ch07 quoting a chapter 8 "alignment question" that chapter 8 never phrases

All fixed by quoting the source verbatim or dropping the quote marks. The audit went
8 BROKEN / 10 SUSPECT-title / 12 SUSPECT-quote → 4 / 8 / 7, and F1 adjudicated all 19
remaining flags individually as heuristic artifacts of the script, with a second tighter
script agreeing (18 hits before the edits, 9 after, the same nine).

**Why it recurs.** A quotation is a copy with a dependency that the file system does not
record. The dependency runs *backwards* in time relative to editing: the safe edit is the
one to the chapter nobody has quoted yet, and by chapter 13 almost everything had been
quoted by something.

**What caught it.** A script, and only a script. Seven of eight were invisible to fourteen
careful human-persona review passes, because each reviewer read one chapter. This is the
clearest case in the project where the mechanical check beat the expert check — and it is
worth noticing that the check is about fifteen lines of Python.

---

### Class D — a test that cannot fail, or that narrates a property it never checks

**Roughly a dozen instances; the reason the whole project adopted mutation testing.**

**What it is.** A green testbench that would stay green under the bug it claims to exclude.
The most dangerous variant is the one that *prints* the property: `PASS tb_dump (latency
2, …)` against a `pipe2` rebuilt with a **single flip-flop** — found by chapter 4's
reviewer, in the chapter that teaches testbench writing.

**Named instances.** Chapter 4 review 1: `tb_dump`'s latency narration, and a Makefile with
no dependency edge from testbench to DUT, so a broken `adder8.v` produced
`make: Nothing to be done for 'all'.` and exit 0. Review 2 (63 mutants, 91 runs): a `pipe2`
rebuilt as a **negative-edge** flip-flop passed, because sampling only at posedge is blind
to a half-cycle shift; `adder8`'s carry-out was read by no testbench at all; `tb_dump`'s
watchdog was **edge-counted**, so a dead clock hung the simulation forever instead of
failing it. Chapter 5's review found three more tests that cannot fail at what they appear
to test, and the chapter's own writing pass found a `counter6` counting *downwards* that
satisfied every assertion ("q is never more than 5" is just as true backwards). Chapter 9's
research found that a `!=` (not `!==`) equivalence check **falsely passes** an undriven-net
design — the chapter's central verification move, silently vacuous. Chapter 10 ships a
false-pass demonstration: the tree-vs-sequential cross-check passes a design with all six
shared rounders broken, while `tb_equiv4` kills the same mutant 3,152 times. Chapter 12's
bin-pinning guard — a testbench for a testbench — initially let **two** bin mutations
survive.

**Why it recurs.** A testbench is code that nobody tests. Its failure mode is silence, and
silence is what success also looks like.

**What caught it.** Mutation, always. The project's standing rule from chapter 4 onward:
*for each testbench, ask what would have to break for this to print FAIL; if the answer is
"nothing", it is not yet a test — then prove it by breaking the DUT.* The shipped chapter
READMEs record **277 mutation runs** by my count (ch04 25, ch05 41, ch06 25 distinct in 27
runs, ch07 21, ch08 27, ch09 33, ch10 18, ch11 26, ch12 24, ch13 28, ch14 9), and reviewers
ran their own campaigns on top — chapter 4's two later reviews alone applied 63 mutants in
91 runs and 53 in 60.

---

### Class E — an error in the research notes re-seeds itself downstream

**At least five instances; the reason the project made upstream propagation mandatory.**

**What it is.** A chapter is written from research notes. The chapter's error is caught and
fixed. The notes are not, and the next three chapters read the notes.

**Named instances.** Chapter 1's review corrected a false CMOS conduction claim and a wrong
greater-than derivation — and the orchestrator then propagated both **back into**
`research/ch01-digital-logic.md`, explicitly because chapters 8 and 9 would read those
notes. Chapter 3's notes still said a tool is "required to check" `always_comb` after the
chapter had been corrected; chapter 13, the SystemVerilog chapter, was being aimed straight
at it. Chapter 6's wrong Q3.13 step bound was **inherited from its research notes**, and
its review then found the notes also carried the false "the whole float compares like an
integer" claim that chapter 7 was about to restate. Chapter 5's writer caught seven wrong
claims in its own notes while writing, including the `$urandom(seed)` first-draw linearity
that had already corrupted the chapter's headline number from 3.97 to 2.98. Chapter 13
corrected five research claims by re-measurement.

**Why it recurs.** The notes are the cheapest thing to leave stale, because nobody ships
them.

**What caught it.** Writers re-running every experiment rather than transcribing, plus a
hard rule: when a review corrects a chapter, correct the notes too, with a dated
correction that names the chapters forbidden to restate the original.

---

### Class F — the fix round introduces the next defect

**Four instances.**

Chapter 1's fix round 2 introduced the comparator regression described above. Chapter 2's
fix round 1 introduced two new defects (an unlabelled-hex worked example and a provably
false rationale for a new guard). Chapter 13's fix pass introduced three copy-edit slips
(doubled and dangling clauses), which the same reviewer then caught. Chapter 13's `cg_cov4`
fix introduced class-A stale counts.

**Why it recurs.** A fix round edits under time pressure, in prose the reviewer has already
read and will not read as freshly again.

**What caught it.** Re-review. Every chapter that took a fix round got a re-review or a
reviewer post-fix pass, and three of the four were caught there. This is the single
strongest argument in the project's process record for *never* closing a chapter on the
strength of the fix round's own report.

---

### Class G — an ASCII diagram is a netlist, and column alignment is the wiring

**Three of thirteen diagrams wrong on first draft, in one chapter.**

Chapter 1's full-adder schematic shorted A, B and Cin onto one net, shorted `A·B` onto the
`A XOR B` node, and shorted `A·B` straight to Cout past the OR. A self-directed audit
during the fix round found two more the reviewer had missed: an unclosed mux trapezoid with
D1 shorted to the select stub, and a synchronizer whose clock landed one column off FF2's
clock arrow. **Prose review would not have caught any of them**, because a diagram reads
correctly to a reader who already knows what it should say.

**What caught it.** A mechanical column extraction in `python3`. The project made this a
standing rule for every writer and reviewer from chapter 1 onward, and no diagram defect
appeared again.

---

### The thesis

Six of these seven classes were caught by **an independent re-run** — a reviewer rebuilding
the reference from scratch, a mutation applied to a copy of the DUT, a script re-extracting
every quotation, a cold `run_all.sh` compared against a number in the prose. The seventh,
class C, was caught by a script alone.

Not one of them was caught by reading carefully.

That is the finding this project actually produced. The guide's method rule — *measure it
or do not claim it* — is usually read as advice about writing. The run log says it is
really advice about **re-execution**: the claim and the measurement must be separated by a
process boundary and an independent implementation, or the claim will drift toward what its
author expected and nobody will see it happen.

## 7. What the Process Cost, and What It Bought

### The bill

The project ran **2026-08-09 to 2026-08-21** — thirteen days — in **66 commits** touching
`guide/`. Every chapter went research → write → review → up to three fix rounds → close.

| Artifact | Words (UTF-8 `wc -w`) | Shipped? |
|---|---|---|
| `guide.md` | 176,154 | **yes** |
| `reviews/` (25 files) | 170,292 | no |
| `research/` (14 files) | 145,434 | no |
| `src/*/README.md` (13 files) | 28,222 | yes (with the code) |
| `STATE.md` | 19,844 | no |

**The unshipped working record is 335,570 words against 176,154 words of guide — 1.9× more
process than product**, and that excludes every scratchpad experiment, every mutation tree,
and every campaign that produced only a number. The review documents alone are 97 % of the
size of the book they were reviewing.

### Interruptions survived

The run log records **nine** interruptions I can account for individually: two
`API Error: Connection closed mid-response` deaths during chapter 1's research (after ~13
and ~20 minutes, each having written **nothing** to disk, because each agent was holding
the whole document for one final `Write`), and seven session-limit or connection cut-offs
afterwards, which the log numbers as "saves" up to the seventh — chapter 8's research at
3/13 sections, chapter 10's research at 0/15, chapter 11's research at 0/14, chapter 11's
writer mid-benches, chapter 11's review mid-battery, chapter 12's writer mid-battery. The
git history carries **16 checkpoint or in-progress commits**; the difference between 16 and
7 is precautionary checkpoints that were never needed.

I cannot reconstruct a figure of exactly ten from the record, so I am not going to state
one. What is verifiable: **after the incremental write protocol was adopted, no
interruption cost any completed work.** The two that did cost work are the two that
happened before it existed.

The protocol itself is four rules, invented in reaction to those first two failures and
mandatory thereafter: write the skeleton first (title, a `<!-- sections complete: n/N -->`
marker, every `##` header with a `_TODO_` body); fill exactly one section per edit,
updating the marker; never hold a whole document in one tool call; on restart, read the
marker and resume at the first `_TODO_`. Paired with checkpoint commits, it converted a
class of total-loss failure into a class of no-loss failure. **This report was written
under the same protocol.**

### What actually earned its keep

Ranked by defects-caught per unit of cost, from the run log rather than from intuition.

**1. Mutation testing — the highest-yield mechanism in the project, by a distance.** It is
the sole detector of class D, and class D contained the most alarming defect anyone found:
a shipped testbench printing `PASS tb_dump (latency 2, …)` against a pipeline rebuilt with
one flip-flop, in the chapter that teaches testbench writing. Cost: 277 recorded runs in
the shipped READMEs plus reviewers' own campaigns (chapter 4's two later reviews alone,
116 mutants in 151 runs). It also produced results no amount of reading could: chapter 9's
demonstration that a common-mode `lbit` bug passes the golden-equivalence sweep while an
independent `shortreal` oracle kills it 6,890 times in 100,000; chapter 11's finding that a
blocking-assignment mutant in a pipeline bank survived ~400k streamed transactions because
one wire indirection hid it.

**2. Independent re-derivation by the reviewer.** The only thing that caught class B, the
most frequent class, and it caught it in all 23 passes. The strongest reviews built their
own reference *and validated the reference before using it* — chapter 10's reviewer
validated its exact single-rounding oracle on 380,576 checks against a safe-harbour oracle
before letting it judge anything. Expensive: this is most of the 170,292 review words.
Worth it: without it, fourteen chapters of confident, slightly-too-strong numbers would
have shipped, and the guide's entire claim to authority rests on those numbers.

**3. The quotation-integrity script — the best value in the project.** Roughly fifteen
lines of Python found eight defects that fourteen expert-persona review passes had missed,
because each reviewer read one chapter and the defect lives *between* chapters. Cost:
one afternoon of F1's assembly pass, plus the adjudication of 19 heuristic false positives.

**4. The warning-gated harness.** Added at chapter 6 when a review showed `run_all.sh`
silently swallowing compile warnings on green runs — the fix was to *make the overclaim
true* rather than soften it. `run` rows now fail on any compiler output at all, and the new
`warn` row type pins the *presence* of a diagnostic for the ten deliberate warning
demonstrations, so if a future Icarus stops warning, the target goes red and the chapter
knows its transcript went stale. Cost: a gate in a shell script and the conversion of seven
chapter 2/3 targets. It has protected every chapter since.

**5. The per-simulation timeout.** Added after chapter 4's review found two testbenches
that **hung forever** instead of failing, because an edge-counted watchdog cannot fire if
no edges arrive. Without it a single hang would have stalled the whole F2 smoke test. Cost:
a `perl`/`alarm` shim, self-tested against a deliberately non-terminating module. It also
produced a rule the guide now teaches: watchdogs must be time-based, never edge-counted.

**6. The bin-pinning guard — earned its keep, but only because it was itself
mutation-tested.** Chapter 12's 105-bin coverage model with a count guard did its job: it
"caught the library change first" when the `mx1` fix grew the directed library. But the
guard initially let **two** bin mutations survive (a mistimed stage qualification hidden by
back-to-back traffic; a boundary the library did not straddle), and both were killed only
after the *library* was fixed. **A coverage guard is itself a testbench and gets the same
mutation discipline** — and an un-mutation-tested guard would have been worse than nothing,
because it radiates false assurance. That is the honest verdict: high value, conditional on
a discipline that most projects would skip.

### What was expensive relative to what it caught

**Chapter 4's third fix round.** The chapter used the maximum three fix rounds and still
closed at 7 — the lowest score in the guide. Reviews 2 and 3 ran 116 mutants in 151 runs;
review 3's yield was **"no testbench that cannot fail"**, i.e. the marginal mutation yield
had gone to zero, and what it actually found was one class-B overclaim in the previous fix
round's own summary. That is a real finding, but it cost a full review pass and a full fix
round to get one sentence. The measurable lesson is in the shape of the data: chapters
6–14 each took **one** review and one fix round and all closed at 9. The three-round
chapters are the early ones, before the harness and the disciplines existed. Extra rounds
did not substitute for better instruments.

**The reviewer persona rotation.** Fourteen rotations, and exactly **one** demonstrable,
attributable payoff: the citation checker on chapter 14 found the first instance of class C,
which no other persona had been looking for and which then turned out to be eight instances
guide-wide. Everything else the personas found looks like it would have been found by any
sufficiently adversarial reviewer with the same instruments. There is no counterfactual
here and I am not going to invent one — but "one attributable catch in fourteen" is the
honest number, and the catch was large enough that I would keep the rotation.

**`audit.py`'s precision.** Excellent recall, poor precision: after all fixes it still
reported 19 flags, every one a heuristic artifact requiring individual human adjudication
(a chapter quoting its own section title; a nested-quote heading the regex cannot parse; an
external paper quoted near a "chapter N" mention). A second, tighter script agreed on
exactly the same nine survivors. Cheap to run, moderately expensive to believe.

**The research phase, ambiguously.** The research notes are 145,434 words and they are the
direct cause of class E: five instances where a corrected chapter left an uncorrected note
aimed at the next three chapters. They also produced most of the toolchain findings that
make the guide worth reading — `shortreal` is stored as a `double`; `-Wall` never warns
about silent truncation; Icarus reports nothing at all for eight of the nine classic
beginner bugs. The right conclusion is not "skip the research" but **"a research note is a
draft claim, not a source"** — every writer who re-ran its notes' experiments found errors
in them, without exception.

## 8. What a Reader Can Do With This — and What They Cannot

### Can

- **Learn floating-point RTL from gates upward and end with a working design.** The path is
  continuous: chapter 2's `align_sticky` is the guard/round/sticky splitter that chapter 8's
  algorithm uses, that chapter 9's `fp32_align` wraps, that chapter 11 pipelines, that
  chapter 12 instantiates four times. There are no orphan examples and no code that exists
  only on the page.
- **Run every listing.** 123 targets, one command, exit 0. Every Verilog listing in the
  guide exists as a real file first; 101 of 101 shipped-code fences were verified
  byte-identical to their files by F2, and the 16 code-tagged exceptions are declared
  abridgements or explicitly illustrative.
- **Trust the simulator transcripts as facts, not samples.** The suite is deterministic:
  0 of 123 targets differed byte-for-byte in stdout across two instrumented passes.
- **Take the verification kit and use it on their own adder.** The golden-model sweep, the
  corner-case taxonomy, the streaming-equivalence scoreboard, the hand-rolled 105-bin
  coverage model with its bin-pinning guard, and the D9 white-box witness are all generic
  techniques with a worked, mutation-proved instance.
- **Trust the negative results, which are the rarest thing here.** Icarus reports *nothing*
  for eight of the nine classic beginner bugs. `-Wall` never warns about silent truncation
  — the highest-risk silent bug class in an FP datapath. `-gno-assertions` does not quiet a
  concurrent assertion, it **deletes** it. `$stop` exits 0 and continues. Races in Icarus
  are perfectly reproducible, so "re-run and see if it changes" never reveals one. Each of
  these is a thing a reader would otherwise learn the expensive way.
- **Rely on the citations.** 88 URLs checked with content, not status codes; 73 quoted
  strings substring-tested; zero fabricated; sources that could not be fetched are cited by
  author/title/venue and tagged `[title-only]` **with the reason stated**.
- **Reproduce the reasoning.** Every headline number in the guide names its generator and
  its seed, and the four largest were re-run by F2 with their failure modes deliberately
  made to fire.

### Cannot

- **Cannot put this on an FPGA and know what it will do.** Nothing here was synthesised,
  placed or timed. There is no Fmax, no area, no critical path. Chapter 11 counts registers
  (336 bits) — that is arithmetic, not timing. A reader who needs a clock target must do
  the synthesis work themselves, and the guide says so in its own introduction.
- **Cannot retarget it to bfloat16, FP8 or FP64 by changing a parameter.** There are zero
  `parameter` declarations in the shipped RTL. It is a rewrite across nine files. Chapter 5
  argues for exactly the parameterisation that chapter 12 did not do, and chapter 14 prices
  the omission.
- **Cannot treat the four-input result as correctly rounded.** It is the three-rounding
  composition. It equals the correctly rounded four-input sum on 98.3 % of full-range
  quadruples and as little as 67.96 % under clustered exponents, and `inexact`
  over-reports one-directionally. The specification says this; a reader who skips the
  specification will be surprised.
- **Cannot port the NaN behaviour.** Payload propagation is specified as *this
  implementation's measured behaviour* so that the golden model can be bit-exact. The
  guide's own measurements show the sign of a generated NaN differing between arm64 and
  x86-64 hosts, and between Icarus's constant folder and its runtime on the *same* host.
- **Cannot assume this design is correct — only that it has not been caught being wrong.**
  Verified against independent references over large finite vector sets, exhaustively only
  where the space was small, and formally only by hand-written proofs the project checked
  itself. No formal tool ran. Chapter 8's own measurement is the standing warning: the
  rounding-carry renormalize path fires **0 times in 1,000,000 random pairs**, so a random
  campaign of any size will never reach it. If a defect hides where no vector goes, nothing
  in this project would have found it.
- **Cannot use it as a general Verilog reference.** It is narrow and deep by design: one
  operation, one rounding mode, one format, one simulator. It has a sibling in this repo
  (`guides/fpga-without-the-fpga/`) for general Verilog, and it does not duplicate it.
- **Cannot expect the GUI waveform material to be verified.** VCD and FST *generation* is
  machine-checked. Anything about clicking, zooming or menus is documentation — neither
  GTKWave nor Surfer has a headless render mode, so no waveform image here is
  machine-generated.

### Where to start

- **Reading it:** `guide/guide.md`, which opens with a table of contents of 224 section
  links and a "Scope, and What This Guide Does Not Do" section that is worth reading before
  chapter 1 rather than after chapter 14.
- **Running it:** `cd guide/src && SIM_TIMEOUT=120 bash run_all.sh`.
- **Editing it:** edit `guide/chapters/chNN.md`, then `python3 guide/assemble.py`. Do not
  edit `guide.md` directly — it is generated, and the assembler will overwrite it.
- **Extending it:** the first item on the list is parameterising the datapath, and the
  second — my recommendation, not the guide's — is the `EXPECT_TOTAL` assertion in
  `run_all.sh` that would stop a deleted manifest from turning 123/123 into a green
  118/118.

## 9. Every Number in This Report, and How It Was Measured

The guide's rule applied to its own report. Everything below was produced in this session
unless the row says otherwise.

### Measured here

| Number | Command |
|---|---|
| `guide.md` 176,154 words / 173,152 POSIX | `LC_ALL=C.utf8 wc -w guide.md` / `wc -w guide.md` |
| Chapter words, both locales | same, over `chapters/ch01..14.md` |
| 3,002-word gap explained | Python: count tokens with `all(ord(c) > 127)` — exactly 3,002, of which 2,491 em dashes |
| Word arithmetic reconciles | 171,536 + 3,027 − 77 − 3 + 1,656 = 176,154 |
| 15 H1 / 225 H2 / 399 fences / 224 TOC links | fence-aware Python scanner + indented-fence check |
| 14 chapter bodies byte-exact in `guide.md`, in order | Python: strip build marker, `str.find` each body forward from the last |
| Re-assembly byte-identical | `sha256sum` before/after `python3 assemble.py` |
| 217 files in `src/`, 158 `.v` + 20 `.sv` | `find guide/src -type f`, grouped by extension |
| 123 targets = 102 `run` + 10 `warn` + 11 `xfail` | `grep -cE '^\s*(run\|warn\|xfail)\s*:' ch*/targets.txt` |
| **123/123 pass, exit 0** — twice | `SIM_TIMEOUT=120 bash run_all.sh`, two cold runs |
| 216 s wall clock | `date +%s` around the second run |
| `ch10/tb_equiv4` 37.4 s, `ch11/tb_stream4` 39.9 s | compiled and run standalone, `date +%s%N` around `vvp` |
| Artifact rule clean, extensions confined | `find` for disallowed extensions; `.py`/`.vh` outside `ch12/`, `.sv` outside `ch13/` — none |
| `git status guide/` clean | `git status --porcelain guide/` |
| 66 commits, 16 checkpoint commits | `git log --oneline -- guide/`, grep for `checkpoint\|in progress` |
| Review 170,292 w / research 145,434 w / READMEs 28,222 w / STATE 19,844 w | `LC_ALL=C.utf8 wc -w` per directory |
| 23 review passes, 25 files in `reviews/` | file listing plus per-file verdict lines |
| Scores; mean 8.64 | `## Verdict` blocks read in all 23 review files |
| 74 unique URLs (33 in ch1–13, 66 in ch14, 25 shared) | Python regex extraction with trailing punctuation and backticks stripped — a naive `grep \| sort -u` over-counts to 79 by keeping markup |
| 12-URL citation spot check | `curl -sS -L -w '%{http_code}\|%{content_type}\|%{size_download}\|%{url_effective}'` |
| 60 `[title-only]` tags, all in ch07–14 | `grep -c` per chapter |
| ch14's bibliography: **87 entries, 1–87, no gaps** | Python scan of both entry formats (table rows 2–61, bold-numbered paragraphs 1 and 62–87) |
| ch12 mutation ledger = 24, not 23 | counted the README's mutation tables; the README's own recount agrees |
| 277 recorded mutation runs | summed the per-chapter README ledger headlines |
| Icarus 13.0 present | `iverilog -V` → `13.0 (stable) (v13_0-dirty)` |

### Taken from the record, and attributed

F2's instrumented determinism result (0 of 123 stdout captures differed), its ten harness
contract cases, its 101/101 listing-integrity check, its 15/15 mutation-row spot checks,
its 46.5 s / 49.1 s under-load timings, and the ch12 generators' byte-stability: all from
`reviews/F2-smoke-test.md`. Every chapter-level campaign figure (1,004,425 pairs;
67.1M patterns; 2,000,320 vectors; 141,936 checks; 3,151/3,151; 16,512/65,536) is that
chapter's or its reviewer's measurement, cited from `STATE.md` and the review files. F1's
quotation-audit trajectory (8/10/12 → 4/8/7) and its 17 positional-reference conversions
are F1's. I did not re-run any of these.

### Discrepancies found while writing, and what I measured

1. **`guide.md` word count.** Record: 173,116. Measured: 173,152 POSIX / **176,154**
   UTF-8. The +36 is F2's front-matter timing edit after F1's count; the +3,002 is the
   POSIX-locale `wc -w` behaviour described in §1. Not a defect — but the project's figure
   of record is tokenizer-dependent and should be quoted with its locale.
2. **Per-chapter word counts in `STATE.md`'s table.** Mix two tokenizers and predate F1's
   edits. The total reconciles exactly, so nothing is missing. Table in §2 gives both
   counts, measured today.
3. **Chapter 12's mutation ledger.** `STATE.md`: 23 runs. `src/ch12/README.md`, which
   recounts explicitly: **24 runs** (6 design-mutant + 15 bench/library/coverage-model +
   2 closure demonstrations), 20 killed or guard-fired, 2 required survivals, 2 required
   failures. I counted the tables independently and got 24. The README is right; `STATE.md`
   is stale, from the same `mx1` fix that staled the DM4 count F2 found. Recorded in §6 as
   the sixth instance of class A.
4. **The "ten interruptions" figure.** The run log accounts for **nine** individually
   (two pre-protocol connection deaths, seven numbered protocol saves) and the git history
   holds 16 checkpoint commits. I could not reconstruct exactly ten and have said nine,
   with the accounting, rather than repeat a number I cannot show.
5. **One hazard has weakened.** `posithub.org/docs/posit_standard-2.pdf` served the real
   PDF (`application/pdf`, 138 KB) to `curl` today, where chapter 14 recorded a bot
   interstitial serving `text/html`. The mechanism is intermittent, not retired — which
   argues for the guide's rule (check content-type and content, retry, try both fetch
   paths) more strongly than a consistent failure would.
6. **Checked and found accurate**, against my own measurements: the 123-target count and
   its row-type split; the 217-file artifact rule; the 178-source figure; F1's 15/225/399/
   224 structural counts; F1's claim that all 14 chapter bodies are byte-exact in
   `guide.md`; the re-runnability and determinism of `assemble.py`; the two flake-risk
   targets and their proportions of the default timeout; the Icarus 12.0-vs-13.0 split; the
   `[title-only]` convention divergence between chapters 1–6 and 7–14; the `sunburst-design.com`
   redirect-to-search hazard and the fact that the guide cites that URL only as the worked
   example of the hazard; and `digitalsignallabs.com`'s TLS reset with no status at all.

---

*End of report. F3 complete; `STATE.md`'s final-pass checklist can be marked done.*
