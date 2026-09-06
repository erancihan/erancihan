# STATE.md — Master checklist and run log

**Project:** Verilog Learning Guide — Four-Input IEEE 754 Single-Precision Floating Point Adder
**Root:** `guide/`
**Started:** 2026-08-09
**Status legend:** `todo` / `in-progress` / `done` / `reviewed`

---

## Resume protocol

On startup, read this file. Continue from the first item that is not `done`.
Do not redo completed work. Update this file immediately after every unit of
work, before starting the next one.

---

## Environment

| Tool | Version | Path | Verified |
|---|---|---|---|
| Icarus Verilog (`iverilog`) | 13.0 (stable), built from source tag `v13_0` | `/usr/local/bin/iverilog` (Linux container, session of 2026-08-16; earlier sessions used Homebrew 13.0 on macOS) | 2026-08-16 |
| `vvp` runtime | 13.0 (stable) | `/usr/local/bin/vvp` | 2026-08-16 |
| Python | 3.11.15 | `/usr/bin/python3` | 2026-08-16 |

> **Toolchain portability finding (2026-08-16, Linux session).** Ubuntu's packaged
> `iverilog` is **12.0**, and 12.0 does **not** provide `$shortrealtobits` /
> `$bitstoshortreal` — under it the repo regression fails 6 targets (both ch05
> `shortreal` testbenches, both ch05 `xfail`-adjacent tolerance targets, plus two
> ch02 targets). Building tag `v13_0` from `github.com/steveicarus/iverilog`
> restores 73/73. **The guide must state that `shortreal` bit-conversion system
> functions require Icarus 13.0**, not just "a recent Icarus" — a reader on a
> current Ubuntu gets 12.0 from `apt` and every `shortreal`-based testbench in
> chapters 5/9/12 dies at `vvp` load time (`$bitstoshortreal() is not defined`).
| GTKWave | **not installable** | — | Homebrew formula *and* cask both disabled 2025-10-29: "discontinued upstream". Chapter 4 must say this plainly rather than instruct the reader to `brew install gtkwave`, which fails. |
| Surfer | 0.7.0 | `/opt/homebrew/bin/surfer` | 2026-08-09. Installed this session as the maintained replacement for GTKWave. Reads VCD, FST and GHW. The sibling guide `guides/fpga-without-the-fpga/` already points at it, so the repo is consistent. |

**Chapter 4 waveform policy.** VCD *generation* is fully machine-verifiable — `$dumpfile`/
`$dumpvars` run under `vvp`, and the resulting file can be parsed and checked with `python3`.
Do that, and assert real facts about real files. What cannot be verified here is the
*interactive* experience of a GUI viewer; any statement about clicking, zooming or the
menu layout is documentation, not measurement, and must be flagged as such in place —
the same epistemic wall chapter 3 maintains.

Compile command used for all checks:

```
iverilog -g2012 -Wall -o <out> <sources> && vvp <out>
```

### Code layout and test harness (established during chapter 2 — all later chapters must follow)

- Chapter listings live in `guide/src/chNN/`. Build artifacts NEVER go there; they go to
  the session scratchpad. `guide/src/` contains only `.v`, `.md` and `targets.txt`
  (plus, per ch04, `Makefile` and `.hex` vector files; and per a deliberate,
  README-documented ch12 extension dated 2026-08-21: `.py` generator/model sources
  and their byte-stable generated `.vh` libraries, in `ch12/` ONLY; and per a
  documented ch13 extension dated 2026-08-21: `.sv` files in `ch13/` ONLY, since
  that chapter's subject IS SystemVerilog — Icarus gates language on `-g`, not on
  the suffix, measured. The F2 artifact check must allow `.py`/`.vh` under `ch12/`
  and `.sv` under `ch13/`, and nowhere else).
- Each chapter directory carries a **`targets.txt` manifest**, one target per line:
  ```
  run   : dut.v tb_dut.v      # must compile with ZERO iverilog output and simulate without FAIL
  warn  : bad_demo.v          # must compile successfully but WITH output; a deliberate
                              # warning demonstration whose diagnostic the chapter quotes
  xfail : bad_example.v       # must FAIL to compile; a deliberate teaching example
  ```
  The `warn` row type and the fail-on-any-compile-output rule for `run` targets were
  added 2026-08-16 after the chapter 6 review demonstrated that a green run silently
  swallowed compile warnings. Seven chapter 2/3 deliberate-warning targets are now
  `warn` rows, which pins the PRESENCE of a diagnostic (the gate checks for a non-empty compile log, not the specific text): if a future Icarus stops
  warning, the target fails and the chapter knows its transcript went stale.
- `guide/src/run_all.sh` walks every manifest and rebuilds everything from scratch in a
  temporary directory. `./run_all.sh` runs all chapters, `./run_all.sh ch02 ch09` runs a
  subset. It exits non-zero if any target misbehaves. This is the script task F2 uses.
- Testbenches must be **self-checking**: print a PASS/FAIL verdict and fail loudly. The
  runner treats the string `FAIL` anywhere in simulation output as a failure even when the
  process exits 0, because `$error` in Icarus does not change the exit status.
- **The runner enforces a per-simulation wall-clock timeout** (`SIM_TIMEOUT`, default 60s)
  via a small `perl`/`alarm` shim, because macOS ships neither `timeout(1)` nor
  `gtimeout`. Added after chapter 4 review 2 found two testbenches that **hung forever**
  instead of failing when their clock died — an edge-counted watchdog cannot fire if no
  edges arrive. A hang used to stall the entire regression; it is now reported as
  `(timeout after Ns)`. Self-tested against a deliberately non-terminating module.
  **Watchdogs in testbenches must be time-based** (`initial #N; $fatal;`), never
  edge-counted.

> **Shell note for the orchestrator:** this environment is **zsh**, which does not
> word-split unquoted parameter expansions the way bash does. `$files` passed to
> `iverilog` arrives as a single filename. Use `${=files}` in zsh, or run the harness
> under bash as `run_all.sh` does.

---

## Notes and constraints

- Sibling guide `guides/fpga-without-the-fpga/` already exists in this repo and
  covers general Verilog, testbenches, FSMs and memory. This guide is
  self-contained but should not contradict it. Writers may consult it for house
  style. This guide's target is narrow and deep: floating point arithmetic in RTL.
- Repo convention for guides is `guides/<name>/{docs,src}`. This guide was built at
  `guide/` per the run specification and **relocated to
  `guides/four-input-fp-adder/` on 2026-08-21 at the user's direction**, keeping
  the flat internal layout (`chapters/`, `src/`, `reviews/`, `research/`,
  `guide.md`) rather than splitting `docs/`+`src/` — the user chose the move
  without the split, and the flat form preserves the chapter↔directory
  correspondence F1's ch03/ch04 decision rests on. Verified after the move:
  full regression **123/123** cold from the new location, `assemble.py` re-run
  clean (176,154 w), all 14 chapter bodies byte-identical inside `guide.md`,
  listing integrity unchanged, and `audit.py` at 4/8/7 — **identical to the
  pre-move state**, so nothing broke. Path references were rewritten in the
  ACTIVE documents only (chapters, front matter, `assemble.py`, `src/**/README.md`);
  `reviews/` and `research/` deliberately keep their pre-relocation paths, because
  they quote commands and transcripts from dated sessions and rewriting them would
  falsify quotations — the project's own class-C hazard. Also added to match the
  convention: a guide `README.md` and a row in `guides/README.md`'s index.
- Every Verilog listing embedded in a chapter must first exist as a real file in
  `guide/src/`, compile clean under `iverilog -g2012 -Wall`, and pass its testbench.
- Every worked binary / floating point example must be verified with `python3`
  (`struct`, `math`, `decimal`) before being embedded.

---

## Task checklist

### Setup

| # | Task | Status | Notes |
|---|---|---|---|
| S1 | Check for salvage, create directory layout | done | No `salvage/` present. Fresh start. |
| S2 | Verify toolchain | done | iverilog 13.0 installed via Homebrew this session. |
| S3 | Create STATE.md | done | This file. |

### Chapters

Each chapter runs: (a) research → (b) write → (c) review (+ up to 3 fix rounds) → (d) mark done.

| # | Chapter | Research | Written | Review score | Status | Open concerns |
|---|---|---|---|---|---|---|
| 01 | Digital logic foundations (gates, boolean algebra, timing) | done | done | 7 → 8 → **9** | **reviewed** | Fit to ship. 2 fix rounds. See run log for the defect history and the one open non-blocking item. |
| 02 | Verilog core language (modules, ports, data types, operators) | done | done | 7 → 8 → 8 (+ all r3 items closed) | **reviewed** | Fit to ship. 18692 w. Harness 27/27. Sticky-bit module verified against three independent models totalling ~155k vectors. |
| 03 | Combinational vs sequential, always blocks, blocking vs non-blocking, beginner traps | done | done | 7 → 8 (+ all r2 items closed) | **reviewed** | Fit to ship. 15479 w. Harness 20/20. Detection table audited row by row; all 14 rows and 3 linter check codes verified real. |
| 04 | Simulation and testbenches with Icarus Verilog; waveforms with GTKWave | done | done | 6 → 7 → 7 (+ all r3 items closed) | **reviewed** | Fit to ship. 9990 w (under its 10k ceiling). Harness 14/14. Three fix rounds — the maximum. ~116 mutations run across three reviews; no testbench that cannot fail. One surviving mutant recorded below and handed to chapter 5 by name. |
| 05 | Verification methodology (self-checking TBs, corner cases, assertions, coverage) | done | done | 7 → 8 (+ all r2 items closed) | **reviewed** | Fit to ship. ~11.5k w. Harness 12/12, repo 73/73. One fix round; r2 confirmed both blockers closed by independent runs. r2's two remaining defects (false guard rationale, 42/38→41/37 ledger recount) and three nits closed inline by the orchestrator, listings re-verified byte-identical. Known blind spot recorded in `src/ch05/README.md`: `tb_covfp.v` bin definitions unverified — ch12 must know. |
| 06 | Binary number systems and fixed point | done | done | 7 → **9** | **reviewed** | Fit to ship. 9600 w (wc -w). Repo 78/78 under the warning-gated harness. One fix round (orchestrator-applied, all 8 items verified closed by r2's own runs). r2's four supporting-doc nits closed inline. |
| 07 | IEEE 754 single precision in depth | done | done | 8 → **9** | **reviewed** | Fit to ship. 9639 w (wc -w). Repo 82/82. One fix round (orchestrator-applied, all 5 items verified at their sites by the reviewer's post-fix pass; two residual nits closed inline). `fp32_class.v`/`fp32_fields.v` are forward deliverables for ch9/12; classifier survived a 67.1M-pattern sweep. ch05's underflow enumeration corrected with a dated note. |
| 08 | Floating point addition algorithm (align, add, normalize, round) | done | done | 8 → **9** | **reviewed** | Fit to ship. 11066 w (wc -w). Repo 86/86. One fix round + a bookkeeping ripple round, all items verified by the reviewer's own runs. `fp32_add_alg.v` matched exact IEEE 754 RNE addition on **1,004,425 pairs** plus an exhaustive small-width proof — zero mismatches. 28-bit width budget attacked three ways and held. Mutations 27/23/4. |
| 09 | Building a 2-input FP adder in Verilog, module by module | done | done | **9** (r1) | **reviewed** | Fit to ship — the first chapter to score 9 on review 1. 10021 w (wc -w). Repo 92/92. Reviewer's own 141,936-check three-way sweep (RTL vs golden vs exact python) zero mismatches; all 5 review items closed inline by the orchestrator, verified. |
| 10 | Extending to four inputs: tree vs sequential, associativity, accuracy | done | done | 8.5 → **9** | **reviewed** | Fit to ship. 9575 w (wc -w). Repo 95/95. One fix round (8 items, orchestrator-applied, all verified at their sites by the resumed reviewer, who also independently re-proved the new N4/N5 payload assertions non-vacuous). Every headline number independently reproduced: false-oracle 20.46/21.51 %, one-directional inexact 7.095 % (900k adversarial hunt found no counterexample), 1,369-=-census identity, D9 survival with verified structural proof. |
| 11 | Pipelining, timing concepts, synthesis considerations | done | done | 8 → **9** | **reviewed** | Fit to ship. 9829 w (reviewer's wc -w, the count of record). Repo 103/103. One fix round (10 items, orchestrator-applied, all verified at their sites; C2 re-run confirms comment now matches measurement 9). All 26 mutation rows reproduced to the unit; zero timing claims crossed the epistemic wall. |
| 12 | Complete four-input adder: full source, testbench, corner case suite | done | done | 8 → **9** | **reviewed** | Fit to ship — the payoff chapter. 11,406 w (reviewer's wc -w of record). Repo 108/108 under SIM_TIMEOUT=120. One fix round (6 items incl. the m10 straddle gap — the reviewer's own two NEW boundary attacks also die post-fix; .vh regeneration byte-stable). Spec S1-S10 every clause reproduced; D9 retired by proof + witness; coverage model twice-implemented and ten-times-attacked. Three bookkeeping nits closed inline. |
| 13 | Advanced topics and SystemVerilog transition | done | done | 7 → **9** | **reviewed** | Fit to ship. **11,373 w** (wc -w, reconciled across three methods). Repo 122/122 under SIM_TIMEOUT=120. One fix round: 5 blocking prose defects + 3 should-fixes + nits 9-18, all reviewer-verified; 3 copy-edit slips the fix pass introduced were swept and 14b completed. Four SV rewrites independently re-verified equivalent by the reviewer (300k + 300,424 vectors, zero mismatches). 20 `.sv` files, 14 targets. Mutations 28/24/4. |
| 14 | Research frontier: FP accelerators, bfloat16/posits, annotated bibliography | done | done | 8 → **9** | **reviewed** | Fit to ship. 19,423 w — split measured by the reviewer as **body 14,174 / annotated bibliography 4,641** (over the 9-12k target; stated plainly, NOT absorbed by the bibliography exemption). 87 bibliography entries (1-87, no gaps). Repo 123/123. One fix round: 2 blocking + 7 defects + nits, all reviewer-verified; M1/M2 re-run and reproduced by both sides. |

### Reviewer persona rotation

Rotates across chapters so each chapter gets a different kind of scrutiny.

| Chapter | Persona |
|---|---|
| 01 | RTL veteran (recompiles every listing) |
| 02 | Pedagogy expert |
| 03 | RTL veteran |
| 04 | RTL veteran |
| 05 | Pedagogy expert |
| 06 | IEEE 754 specialist (reverifies every number) |
| 07 | IEEE 754 specialist |
| 08 | IEEE 754 specialist |
| 09 | RTL veteran |
| 10 | IEEE 754 specialist |
| 11 | RTL veteran |
| 12 | RTL veteran |
| 13 | Pedagogy expert |
| 14 | Citation checker |

### Final passes

| # | Task | Status | Notes |
|---|---|---|---|
| F1 | Assembly pass — merge chapters into `guide.md`, write intro, fix cross-refs, unify terminology | **done** | `guide.md` **176,154 w** (`LC_ALL=C.utf8`; 173,116 was the POSIX-locale figure quoted before F3 found the locale cause) (1.1 MB, 15 H1 / 225 H2 / 399 fences / 224-link TOC), built by re-runnable `assemble.py` from new `front-matter.md` (2,933 w intro). Orchestrator-verified: all 14 chapter bodies verbatim inside guide.md, re-run byte-identical (deterministic), counts reconcile. **Found 7 MORE instances of the ch14 quotation hazard**, all fixed verbatim. 17 positional refs → named titles (3 remain paired WITH their quoted title, the robust form). ch03/ch04 decided: material STAYS in ch03, five reasons recorded. |
| F2 | Final smoke test — compile every `.v` from scratch, run all testbenches | **done** | **PASS, fit to ship.** 123/123 exit 0 in 216.3 s, repeated identically; a third run at the reader's default SIM_TIMEOUT=60 also passed. Determinism proved harder than the harness proves it: full stdout captured across two instrumented passes, **0 of 123 files differed byte-for-byte**. All three manifest contracts tested with deliberately-wrong targets — ten contract cases, ten hold. 178 sources all manifest-reachable, no orphans; artifact rule exact (217 files); both ch12 generators byte-stable; 101/101 shipped-code fences byte-identical (16 misses adjudicated); four headline claims reproduced with their failure modes made to fire; 15/15 mutation rows reproduced. One defect found and fixed (see log). |
| F3 | Final report — chapter list, scores, open concerns, word count, location | **done** | `guide/FINAL-REPORT.md`, 11,656 w, 9/9 sections. Regression re-run twice cold: **123/123, exit 0, 216 s**. `assemble.py` re-run byte-identical; all 14 chapter bodies byte-exact in `guide.md`; 217 files, artifact rule clean. **Word count of record corrected: 176,154** (`LC_ALL=C.utf8 wc -w`) — the long-quoted 173,116/173,152 is a POSIX-locale `wc -w` that drops 3,002 standalone non-ASCII tokens (2,491 em dashes). Defect classes ranked with named instances; ch12's mutation ledger corrected 23 → 24 (see below). |

---

## Toolchain findings that affect later chapters

Established empirically against the local Icarus Verilog 13.0 during chapter 2 research
(33 throwaway modules compiled with `iverilog -g2012 -Wall` and run under `vvp`). These
are observed behaviour, not LRM quotation, and several contradict common folklore.

- **`shortreal` and `$shortrealtobits` / `$bitstoshortreal` work in Icarus 13.0.** This is
  a direct IEEE 754 binary32 golden-model route inside the simulator: a testbench can
  compute the reference result in real arithmetic and compare bit patterns without any
  external model. **Chapters 5, 9 and 12 should use this** for self-checking testbenches,
  cross-checked against `python3 struct` for the corner cases where a `shortreal`
  reference is itself suspect (subnormals, NaN payloads, signed zero).
- **Icarus does not gate system tasks by `-g` level.** Only syntax is gated — `'0`/`'1`
  fill literals, size casts, `shortreal`. So `-g2012` is safe to use throughout.
- **`-Wall` never warns about silent truncation** when a wide expression is assigned to a
  narrower variable. This is the highest-risk silent bug class in the FP datapath, where
  mantissa arithmetic routinely needs guard bits. Testbenches must catch it, because the
  compiler will not.
- **`assign` to a `reg` is accepted at `-g2012` but rejected at `-g2005`.** Pick one level
  and state it once; the guide standardises on `-g2012`.
- **The folklore "`1 << 40` is always 0" is wrong** under context-determined widths — the
  result width comes from the assignment context, not the literal.
- **A zero-delay `always` block is a hard compile error in Icarus**, not a simulation hang.

Established during chapter 3 research (33 further experiments). These contradict the
textbook story and several are actively mis-taught elsewhere:

- **Icarus reports nothing at all for eight of the nine classic beginner bugs.** No latch
  warning, no incomplete-sensitivity-list warning, and `-Wextra` does not exist. Beginners
  are routinely told the simulator will catch these. It will not. Every chapter that
  teaches a trap must say plainly which tool, if any, actually detects it.
- **Races in Icarus are perfectly reproducible** (8/8 and 3/3 identical across runs), so
  the standard advice "re-run and see if the answer changes" never reveals one. Worse,
  Icarus *alternates* same-edge block ordering between time steps within a single run.
- **`#0` cannot show NBA results** — the inactive region precedes the NBA region — and is
  simultaneously unnecessary, because the active region drains to exhaustion first.
- **`always @(*)` does not self-start** when its input was initialised at declaration, so
  outputs stay `x` for the whole first time step.
- **Blocking assignment in a clocked block accidentally works** when the statements happen
  to be in reverse order, which is why the bug survives testing.
- `-Winfloop` did not fire on the textbook infinite-loop case.
- **Citation hazard:** `sunburst-design.com` now 301-redirects to a login-walled Paradigm
  Works library. Cummings' SNUG papers must be cited by title, or via the MIT 6.375
  mirror that was actually fetched — never with a `sunburst-design.com` URL.

Established during chapter 4 research (24 further experiments):

- **Icarus 13.0 does not dump memory arrays to VCD.** `reg [7:0] mem [0:3]` appears under
  none of the `$dumpvars` variants, and `$dumpvars(0, tb.mem)` is a hard runtime error
  (`$dumpvars cannot dump a vpiMemory`, exit 1). Only individually named words such as
  `tb.mem[0]` can be dumped, and they appear as escaped identifiers with a warning.
  **This matters for chapter 12**, where a register file or vector memory in a testbench
  will simply be missing from the waveform with no explanation.
- **`$dumpvars` depth semantics, measured:** no arguments is equivalent to `(0, tb)` and
  captured 14 vars in the test design; `(1, tb)` captured 5; `(2, tb)` captured 10.
- **Exit statuses, measured:** `$fatal` → 1. `$error`, `$warning`, `$info`, `$finish` → 0.
  **`$stop` → 0 and the simulation continues.** This is why the project harness treats the
  literal string `FAIL` in output as a failure rather than trusting exit codes.
- **`$display` sees pre-NBA values at a posedge; `$strobe` and `$monitor` see post-NBA.**
- **FST works:** `vvp sim.vvp -fst` emitted a file 8.7x smaller than the VCD.
- **`$random` is byte-identical across runs and across recompiles**, so a "random" test in
  this guide is really a fixed pseudo-random vector set. Say so; do not let a reader
  believe repeated runs broaden coverage.
- **GTKWave, measured and researched:** the Homebrew cask is disabled ("discontinued
  upstream", pinned at 3.3.107), so `brew install gtkwave` fails here. But the upstream
  repository is **not** archived — last commit 2026-04-18, tag v3.3.116, GPL-2.0. What
  stopped is versioned binary releases. GTKWave is still obtainable from source, a
  community tap, or Linux distro packages. The chapter must say this precisely rather
  than declaring the project dead or telling readers to run a command that fails.
- **Surfer has no batch/headless render mode** — its `server` subcommand is a remote file
  server, not a renderer. So no chapter can show a machine-generated waveform image;
  anything about the GUI is documentation, not measurement.

Established during chapter 5 research (16 experiments). **Chapters 9, 10 and 12 depend on
these — read before writing any FP testbench:**

- **`shortreal` is stored internally as a `double` in Icarus.** A `shortreal` golden model
  therefore computes in *double* precision unless every intermediate is round-tripped
  through `$shortrealtobits` / `$bitstoshortreal`. Skipping the round-trip silently gives
  a reference that is more accurate than binary32, which will mark a *correct* DUT wrong
  on exactly the rounding cases the guide is about. **This is the single most dangerous
  trap in the whole project.**
- **Icarus assertion support is minimal and must not be overstated:** immediate `assert`,
  `assert … else`, `assume`, and immediate `cover` work from `-g2005-sv` upward. There are
  **no** concurrent assertions, **no** `property`/`sequence`, **no** deferred assertions,
  and **no** covergroups at any `-g` level. Established from a 15-construct x 4-level
  compile matrix.
- **Icarus has zero coverage instrumentation.** No coverage target exists among
  `blif/null/pcb/sizer/stub/vhdl/vlog95/vvp`, and nothing in `iverilog -h` or `vvp -h`.
  The practical answer for this guide is a **hand-rolled functional coverage counter in
  plain Verilog**, which was prototyped and measured: a 34-bin counter went 11/34 → 33/34
  → 34/34 across three stimulus regimes and **caught a real hole in the researcher's own
  constrained generator.** Chapter 12 should use this technique.
- **`$error` leaves the exit code at 0; only `$fatal` fails a `make`.** Consistent with
  chapter 4's finding and the reason the harness greps for `FAIL`.
Established during chapter 7 research (7 python3 scripts, 5 Icarus testbenches, ~40
probes). **Chapters 8, 9 and 12 depend on these:**

- **`shortreal` assignment does not round.** `shortreal s = <expr>;` keeps the double
  value; binary32 rounding happens ONLY inside `$shortrealtobits`, at the call. This
  sharpens the round-trip rule: there is no way to "keep a shortreal rounded" — the
  round-trip through `$shortrealtobits`/`$bitstoshortreal` is the only rounding
  mechanism that exists.
- **A pure sNaN round-trip quiets it with no arithmetic**, in both Icarus
  (`$bitstoshortreal` → `$shortrealtobits`) and python (`struct` unpack → pack) on
  this x86-64 host. A reference model therefore CANNOT ship an sNaN through a double
  round-trip; testbenches that need an sNaN operand must construct its bits directly.
- **Icarus emits a *positive* qNaN from constant folding but a *negative* one at
  runtime on the same host** (same expression, elaboration-time vs run-time). Adds to
  the NaN-sign portability rule: never compare a generated NaN's sign, even against
  the same simulator.
- **A binary32 adder can never raise the underflow flag**: a tiny (sub-min-normal)
  sum of two binary32 operands is always exact — measured 0 inexact in 400,000
  cancelling pairs, consistent with the Sterbenz-style argument. Chapter 12's flag
  specification can therefore omit underflow entirely, with a proof, not a shrug.
- **Verilog's unary minus binds tighter than `**`**: `-2.0**128` is (+2)^128 —
  the OPPOSITE of python, where `-2.0**128` is −(2^128). A reference model or
  worked example that transliterates between the two silently negates.

Established during chapter 8 research (10 experiments, ~2.1M exactly-verified operand
pairs; hardware-faithful python model matched exact rational arithmetic on all
1,000,054 sweep pairs). **Chapters 9, 10 and 12 depend on these:**

- **The significand datapath width budget is 28 bits** (24-bit significand + guard +
  round + sticky + carry), derived and proved in the notes. Chapter 9 builds its
  registers around this number.
- **The rounding-carry renormalize (round-up rippling into a new leading 1) fired 0
  times in 1,000,000 random pairs** — it is reachable only by directed vectors.
  A chapter 9/12 random campaign of any size will NEVER exercise this path; the
  corner library must carry it explicitly, and a coverage bin should prove it ran.
- **After massive cancellation, G can still be live; only R and sticky are provably
  zero.** The research's own first-draft invariant claimed all three dead and the
  million-pair sweep falsified it — recorded as a lesson in claims-vs-measurements.
- **Dropping sticky breaks 11× more pairs than dropping R** (3.87 % vs 0.35 % of a
  random sweep) — the priority order for teaching and for mutation testing.
- **Sterbenz's lemma verified exhaustively** (3,151/3,151 in a toy format): close
  effective-subtracts are exact; the cancellation path needs no rounding logic.

Established during chapter 9 research (13 experiments, 41 compiled files, >2M
operand-pair evaluations; the prototype seven-module split proven bit-identical to
`fp32_add_alg.v` over 200,092 checks). **Chapters 9-13 depend on these:**

- **A `!=` (not `!==`) equivalence check falsely PASSes an undriven-net design and a
  double-driven-net design** — X compares "not unequal" under `!=`. The golden-model
  equivalence sweep, the chapter's central verification move, is silently vacuous
  unless it uses `!==` and X-guards. Chapters 9/10/12 must use `!==` plus an
  `^result === 1'bx`-style guard.
- **An inferred latch in the normalize stage captured delta-cycle glitch state**
  matching no settled input; whether any testbench catches it FLIPS with the
  driver's assignment order (4 flag-only kills in 100k directed; 0 in random).
  Latch-shaped bugs in combinational FP stages are near-invisible to simulation —
  the discipline (complete if/else, default assignments) is the only real defence,
  and the chapter must say the simulator will not catch this class (ch03's finding,
  now measured in THIS design's shape).
- **An X in just the sign bit produces a defined-LOOKING wrong result with clean
  flags** — X-propagation through the datapath does not advertise itself. X-injection
  tests must check for the wrong defined value, not for visible X.
- **Icarus 13.0's `always_comb` measurably implements function-body sensitivity**
  (stale-global probe updates under `always_comb`, stays stale under `@*`) — the
  IEEE 1800 distinction is real in this simulator. (Sharpened 2026-08-21 by ch13:
  a SECOND measured difference — `always_comb` executes at time zero, `@(*)` does
  not, fixing ch03's no-self-start trap; and `-gno-assertions` deletes even
  fully-supported IMMEDIATE assertions, worse than ch05's concurrent-only record;
  `-gsupported-assertions` is the only setting where immediate stays live while
  parseable concurrent is discarded. See `research/ch13-systemverilog.md` §7/§9.) This SHARPENS chapter 3's
  "documentation value without enforcement" verdict: enforcement is still absent
  (no latch warning), but there IS one behavioral difference. **Chapter 13 must use
  this; F1 must audit chapter 3's exact wording against it** (ch03's measured claims
  — no latch warning, silent blocking-in-always_ff — remain true).
- **Masking is real in both directions, measured:** a unit-killed `exact_zero` bug
  passed 200k end-to-end checks (the unit suite is load-bearing), and a G/R
  convention mismatch between modules left BOTH unit suites green and was caught
  only by the integration sweep (the equivalence sweep is load-bearing). Neither
  level of testing is optional.

Established during chapter 10 research (9 experiments, ~2.7M quadruple evaluations;
both four-input structures built from real `fp32_add2` instances and proven
bit-identical to order-faithful references over 240,000 quadruples × 2 structures ×
2 reference styles). **Chapters 11-12 depend on these:**

- **Port order joins tree shape in the arithmetic specification.** The operand
  multiset {max, max, −max, −max} yields **qNaN, +inf, or +0** depending on
  structure AND the order operands hit the ports. Chapter 12's spec must pin both
  the tree shape and the port-to-operand mapping, or the corner-case suite is
  testing an under-specified design.
- **"Both orders agree" is a FALSE oracle**: 20-21 % of clustered-exponent
  quadruples where tree and sequential agree bit-for-bit still miss the correctly
  rounded four-input sum. Agreement between two wrong-in-the-same-way structures
  proves nothing about accuracy — only an exact single-rounding oracle measures it.
- **The composed `inexact` flag over-reports against the single-rounding model** on
  7.1 % of bit-agreeing results, provably one-directional (composition can raise
  inexact when the final bits happen exact; it can never miss a truly inexact sum).
  Chapter 12's flag spec must define inexact AS the composition's flag OR, not the
  single-rounding ideal's.
- **The chained-unrounded-reference cost reproduces at ~1.3 % uniform (1.268 %/
  1.262 %) and explodes to 28-33 % under clustered exponents.** A ch12 random
  campaign biased toward the interesting regimes (as it must be) makes the
  round-trip discipline ~25x more load-bearing, not less.
- **Tree vs sequential: no systematic accuracy winner at n = 4** (1.2M-quadruple
  sweep vs the exact oracle; per-regime differences are real but small and their
  *direction flips between regimes* — win10 favors sequential, win2 favors tree —
  so neither structure is systematically closer; corrected 2026-08-20 by the ch10
  review, which measured the win2 gap at >13σ, so "statistically
  indistinguishable" was an overclaim). The choice is a latency/area/pipelining
  decision (tree: 2 levels, 3 adders), NOT an accuracy decision — and the chapter
  kills the folklore that trees are "more accurate" at this width.
- Quadruple tree≠seq rates track ch08's triple table almost unchanged: 0.65 % full
  range / 23.99 % within-10 / 30.11 % within-2 (vs 0.64/21.79/32.41 for triples).

Established during chapter 11 research (9 experiments, 30 Verilog files, 42
compiled configurations, >1M streamed transaction checks; 2-stage and 4-stage
pipelined `fp32_add2` plus a pipelined four-input tree proven bit-identical to
their combinational parents under a mutation-tested streaming harness).
**Chapters 11-12 depend on these:**

- **Blocking assignment in a pipeline stage bank corrupts ONLY direct reg-to-reg
  readers** (measured: strict 2,1,2,1 latency alternation), while readers behind a
  continuous-assign hop survived ~400k streamed transactions — the output-bank
  blocking mutant PASSED even composed into the tree until one wire indirection
  was removed. Sharpens ch03's rule: the bug's visibility depends on the reader's
  wiring, so "it simulated fine" is even weaker evidence than ch03 taught.
- **A full datapath reset manufactures a defined-looking +inf/overflow** out of the
  illegal all-zeros state during fill. Reset the CONTROL (valid bits); do not
  blanket-reset the datapath, or mask the fill window — outputs during fill are
  arithmetic garbage that does not look like garbage.
- **59 % of single-bit X injections on the registered sticky bit were absorbed
  into bit-correct outputs** — quantifies X-guard blindness: an X entering the
  pipe usually does NOT reach the output as X. X-discipline must be enforced at
  injection points (resets, valid gating), not detected at outputs.
- The streaming-equivalence harness (new pair every cycle; expectations in a
  latency-deep scoreboard; X-data bubbles; drain checks; `!==`+X-guards; count
  guards) is the chapter's central verification move and killed five
  pipeline-specific bug classes that each pass a plausible weaker harness.

Established during chapter 12 research (the convergence pass; prototypes in the
scratchpad for the writer). **The writer and F2 depend on these:**

- **D9 disposition: formal acceptance with a white-box witness, NOT a design
  change.** The measurements inverted the RESUME-HERE preference for a fix: the
  shipped `fp32_addsub` is PROVEN equal to the specified function at every
  boundary (written 5-step proof; attacked with 2,000,320 targeted shipped-vs-
  mutant diff vectors including all cancellation-born-zero patterns, zero
  divergence; closed empirical chain through the pipeline). The literal fix (a1)
  measurably BREAKS the unit contract and merely relocates the latent region into
  `fp32_round_pack`; the clean fix (a2, unscreen zeros) is green everywhere
  (17/17 targets + 240k×2×2 bit-for-bit) but re-opens three reviewed chapters'
  prose for zero functional gain. Instead: a 17-vector armed-and-count-guarded
  invariant on the DUT's own wires kills the B-M2 mutant 27× with no design
  edit. The a2-patched tree stays in the scratchpad as evidence, not product.
- **The M18 bin-pinning guard works but had to be debugged by mutation:** 105
  bins, every definition implemented independently in python, pins matched
  bin-for-bin — and the guard initially let TWO bin mutations survive (a
  mistimed stage qualification hidden by back-to-back traffic; a boundary move
  the library did not straddle). Both killed after fixing the LIBRARY. A
  coverage guard is itself a testbench and gets the same mutation discipline.
- **Timing drift hazard for F2:** ch11's `tb_stream4` measured 36.7 s when
  recorded and 56.0 s during ch12 research on the same machine — only 7 % of
  the 60 s SIM_TIMEOUT margin. Wall-clock figures in prose are load-dependent;
  ch12's streaming targets ship at 60k quads (34-36 s), and F2 should run with
  SIM_TIMEOUT raised (e.g. 120) so a loaded machine cannot flake a correct
  target. Recorded timings in chapters are session observations, not contracts.
- Spec decisions of record (each clause cites its measurement in the notes):
  tree `(a+b)+(c+d)`, port mapping NORMATIVE (all 6 multiset port orders
  measured: 2 → qNaN/111, 4 → +0/000); per-stage RNE, three roundings, honestly
  priced (equals the correctly rounded sum on 98.3 % full-range; clustered 67.96-73.12 % depending on window construction — both constructions reproduce, see S3's note);
  flags = composition OR, inexact one-directional +7.095 %; underflow omitted
  (ch07 proof); NaN payload priority a>b>c>d as measured; −0 iff all four −0;
  latency 4; 336 register bits (3× p2); control-only reset.

Established during chapter 14 research (92 URL fetch attempts, 2026-08-21; the
guide's entire existing citation set re-verified). **F1, F2 and F3 depend on
these — they change how a link check must be done:**

- **HTTP 200 does not mean a citation resolves.** Three sources return 200 and
  are still failures: `sunburst-design.com` now 200s but redirects to a
  Paradigm Works *search page*; Springer's Kulisch article 200s to a
  cookie-error landing page. **A status-code-only link check passes all of
  them.** A THIRD mechanism was found by the ch14 writer:
  `posithub.org/docs/posit_standard-2.pdf` returns 200 with
  `content-type: text/html` — a bot interstitial; the real PDF arrives only on
  a cookie-carrying retry. Also transient: `en.wikipedia.org/wiki/IEEE_754`
  returned 429 on a sequential batch and 200 on retry. Any F3 citation audit
  must inspect content-type and content, not just status, and must retry
  before declaring a link dead.
- **The two fetch paths disagree, in both directions.** `github.com` is 403 to
  `curl` through this container's proxy but 200 via `WebFetch`; `hal.science`
  is 200 to `curl` but 403 via `WebFetch` (an Anubis challenge). **A
  single-tool re-verification produces false failures either way** — check
  disputed URLs both ways before declaring a link dead.
- **`digitalsignallabs.com` has degraded** from ch06's recorded HTTP 503 to a
  TLS connection reset with no status at all. ch06's `[title-only]` tag stands;
  the recorded reason needs updating.
- **ch04's GitHub field assertions** (GTKWave tag and commit dates) could not be
  re-verified in this environment and should be softened to name the observation
  date rather than assert current fact.
- **NVIDIA's E4M3/E5M2 passage: corrected 2026-08-21 by the ch14 writer's
  re-fetch.** The research pass recorded it as removed from the current
  Transformer Engine docs URL; the writer found the passage IS present there
  (page retitled "Using FP8 and FP4…"). Both observations are written down in
  the chapter and the citation still pins the 2.3.0 release URL, which cannot
  be retitled out from under it.
- **The shipped RTL has ZERO `parameter` declarations** (`src/ch09`, `src/ch12`).
  Chapter 5's "chapter 12's plan: parameterise the adder on `EXP_W`/`MANT_W`"
  was never carried out — corrected in ch05 with a dated callout on 2026-08-21
  stating what ch12 did instead and what it costs (every ch14 format retarget is
  a rewrite, and the reduced-width strategy ch05 argues for was never exercised
  on the guide's own design). **F1 must check no other chapter repeats the
  unkept promise.**

Corrected or added while **writing** chapter 5 (every ch05 experiment was re-run; these
supersede the bullets below where they conflict):

- **New, and not in the research notes: `$urandom(seed)`'s first draw is close to a linear
  function of the seed.** Measured, seeds 1-4 give `00010e00`, `00021c00`, `00032a00`,
  `00043800` — all with a **zero low byte**. Re-seeding once per trial with 1, 2, 3, …
  therefore correlates the first vector of every trial: the measured probability of a
  mutant-killing 8-bit pair came out **0.4720** that way against a true **0.2520** along
  one continuing stream, and the chapter's "about four vectors to first kill" read **2.98**
  instead of 3.91 until this was found. **Seed once per run and discard the first draw.**
  Chapters 9, 10 and 12 must not re-seed per transaction or per trial.
- The notes' literal `$urandom(seed)` values do not reproduce (they give `e3cc97c7` for
  seed 1; measured here `1c598438`). The seed is an **inout** mutated by every call, so
  exact values depend on call order. The *claims* reproduce exactly: bare `$random` and
  `$urandom` ignore a `+seed=` plusarg entirely; only the seeded forms respond.
- **`-gno-assertions` is worse than the notes say.** It does not merely silence the "sorry"
  diagnostic: where the parser *can* read the syntax it **discards the property**. Measured,
  `assert property (@(posedge clk) req);` with `req` low at every edge compiles clean under
  `-gno-assertions`, runs to completion and reports nothing. A flag that turns a failing
  check into a silent pass.
- **`assert property (... |-> ...)` is a plain `syntax error` at every level**, including
  `-g2005-sv`, followed by `error: Error in property_spec of concurrent assertion item.`
  The notes list only the second line.
- **Icarus's `shortreal` quiets a signalling NaN correctly**: `7fa00000 + 3f800000` gives
  `7fe00000` — payload preserved, quiet bit set. Not recorded in the notes.
- **Timing, re-measured on this machine**: an exhaustive 65,536-pair sweep driving two
  designs plus a bit-serial reference takes **0.91 s**, not the notes' 0.09 s; throughput
  for a bare `shortreal` reference loop is **~288,000 transactions/s** (1,000,000 in
  3.47 s), not 320,000. Compile of one testbench is 0.013 s as the notes say.
- **Exponent-difference probabilities, computed exactly** rather than sampled:
  `P(|expdiff| >= 25) = 0.8164` (notes: 0.804) and `P(|expdiff| <= 1) = 0.01178`, one in
  **84.9** (notes: 86).
- **`$urandom(seed)`'s first draw is near-linear in the seed** in Icarus 13.0: seeds 1-4
  give `00010e00`, `00021c00`, `00032a00`, `00043800` — note the zero low byte. **Re-seeding
  per trial therefore biases your results.** During chapter 5 this corrupted the chapter's
  own headline measurement: a per-trial reseed reported the killing-class probability as
  0.4720 against a true 0.2520, and the mean-vectors-to-kill as 2.98 instead of 3.97.
  **Seed once per simulation, never per trial.** Chapters 9, 10 and 12 will run random FP
  campaigns and must not repeat this.
- **`-gno-assertions` silently *discards* a concurrent assertion** rather than merely
  quieting the diagnostic. A reader who uses it to "turn off the noise" removes the check.
- **The `cout = a[7] | b[7]` mutant, resolved.** It is wrong on exactly one class —
  *exactly one operand ≥ 128 and `a + b ≤ 255`* — which is 16,512 of 65,536 pairs
  (25.195%). Uniform-random kills it in **3.97 vectors on average** (Monte Carlo over
  200,000 trials; 48 vectors put survival below 1 in a million; Icarus's default-seed
  `$random` killed it on vector 0). But a plausible 14-vector hand-written "carry-focused"
  directed set **leaves it alive**, because humans test *no-carry with small numbers* and
  *carry with big numbers*, and never *big operand with no carry*. This is the chapter's
  best argument for random stimulus and it is fully measured.

Corrected while **writing** chapter 4 (every ch04 experiment was re-run). The research
notes `research/ch04-simulation.md` now carry a "Corrections found while writing the
chapter" section with the measurements; these supersede the bullets above.

- **`$dumpvars` on a memory array is a `vvp` LOAD-time error, not a run-time one.**
  `iverilog` exits 0. The error fires even when the statement is never executed, so it
  cannot be hidden behind a plusarg — it needs an `` `ifdef `` — and it fits neither
  `run` nor `xfail` in a `targets.txt` manifest. **Chapter 12 must know this.**
- **Parameters ARE dumped to VCD**, as `$var real`/`$var integer`, with their values in a
  `$dumpall` immediately after the `$comment Show the parameter values. $end` marker.
  Named blocks and **tasks** also become VCD scopes, task arguments included.
- **A literal seed for `$random`/`$urandom` is not a compile error** — `iverilog` exits 0,
  `vvp` rejects it at load time. Same split as chapter 2's unknown-system-task finding.
- **An odd half-period under a coarse `timescale` changes the period, not the duty cycle**:
  measured, a 5 ns request became a **6 ns** clock at `1ns/1ns`, duty cycle still 50 %.
- **The VCD-to-FST ratio is design-dependent**, not 8.7x: measured 67x on a counter,
  2168x with `-fst-space`, 16.7x for `-lxt2`. Quote a range, never one figure.
- **VCD identifier aliasing is partial** — a scalar clock shared one id across four scopes
  while equal 8-bit ports each got their own.

## >>> RESUME HERE <<<

**ALL FOURTEEN CHAPTERS ARE CLOSED.** Scores: ch01 9, ch02 8, ch03 8, ch04 7,
ch05 8, ch06 9, ch07 9, ch08 9, ch09 9, ch10 9, ch11 9, ch12 9, ch13 9, ch14 9.
Repo regression **123/123** cold under `SIM_TIMEOUT=120`.

**THE PROJECT IS COMPLETE (2026-08-21). F1, F2 and F3 are all DONE. There is no next
action.** Final state: guide `guide/guide.md` **176,154 words** (`LC_ALL=C.utf8 wc -w`;
173,152 under POSIX `wc -w`, which drops 3,002 standalone non-ASCII tokens — always state
the locale), 123/123 regression green cold, final report at `guide/FINAL-REPORT.md`.
Open concerns and the ranked defect-class analysis are in that report; read it before
re-opening anything. The only optional relocation left is the one the brief parked:
moving `guide/` to `guides/four-input-fp-adder/`, a user decision.

**F1 is DONE (2026-08-21) — see the run log's F1 entry and "F1's ch03/ch04 decision".** Historical F1 brief follows.

**~~Next action: F1 — the assembly pass.~~** Merge the chapters into `guide/guide.md`
with an introduction, unified terminology, and working cross-references. Work two
chapters at a time (the original brief's method). F1's specific obligations, some
recorded across the whole project:
1. **Quotation integrity across chapters** — see the hazards block below; this is
   new and non-negotiable.
2. **Cross-references in BOTH forms** — quoted-heading AND positional. Positional
   phrases ("the next section") are invisible to a title grep and are exactly what
   assembly breaks. Recorded after ch02's r3 review.
3. **The parked ch03/ch04 question**: ch03 holds ~950 words of simulation-artifact
   material that arguably belongs in ch04; a fix round refused to move it while ch04
   was unwritten. Both exist now — decide.
4. **Consistency sweep**: terminology, the `[title-only]` convention, the epistemic
   wall's phrasing, and the artifact-rule extensions (.py/.vh in ch12, .sv in ch13).
5. **Check no chapter repeats the unkept parameterisation promise** (ch05 now
   carries the dated correction; verify nothing else states it).
Then **F2** (full smoke test from scratch — run with `SIM_TIMEOUT=120`; the
artifact check must allow `.py`/`.vh` under `ch12/` and `.sv` under `ch13/`), then
**F3** (final report: chapter list, scores, open concerns, word count, location;
its link audit must follow the citation-checking rules in the hazards block).

## Hazards F1 must handle (recorded 2026-08-21, from the ch14 cycle)

- **Editing a chapter can silently falsify another chapter's quotation of it.**
  Measured: the orchestrator corrected a sentence in ch05 (the parameterisation
  promise); ch14 had already quoted the old wording, and the quotation became a
  paraphrase-in-quote-marks — caught only because ch14's reviewer was a citation
  checker. **F1 must run a quotation-integrity check across the whole guide**:
  extract every quoted string attributed to another chapter and confirm it is a
  literal substring of that chapter's current text. Cross-reference titles are
  not enough.
- **A mutation row is a measurement, not a deduction.** ch14 shipped a mutation
  table asserting 0 order violations for a sign-inversion mutant that provably
  reverses order; re-running gave 11,744 errors. F1/F3 should spot-check any
  table row that reports a *zero* — zeros are where reasoning substitutes for
  running.
- **Citation checking needs content, not status codes.** Four live mechanisms
  now recorded: redirect-to-search-page, cookie wall, bot interstitial serving
  `text/html` for a PDF, and Anubis serving a challenge *only* to browser-like
  User-Agents. Plus transients (429) and curl-vs-WebFetch disagreement in both
  directions. F3's link audit must check content-type and content, retry, and
  try both fetch paths before calling anything dead.

## Open concerns carried forward

Recorded per the protocol's "record remaining concerns and move on" rule after the maximum
three fix rounds. None is a defect; each is a known, deliberate limitation.

- **Chapter 4, `adder8` carry function — CLOSED by chapter 5.** `cout = a[7] | b[7]` is
  wrong on exactly 16,512 of 65,536 operand pairs (25.195 %), measured twice and agreeing
  to the pair: an exhaustive `python3` loop, and `src/ch05/tb_exhaustive.v` under `vvp`
  (0.91 s). Chapter 5 uses it as its running example across four stimulus methods, ships
  it as `src/ch05/adder8_mut.v`, and shows that a coverage cross of `{a[7], b[7], cout}`
  reports chapter 4's eight cout-checked vectors filling only **3 of 6 reachable bins** —
  the two mutant-killing bins empty. Promise kept.
- **Chapter 4, `counter4`.** Reset priority and reset synchronicity are untested: giving
  `en` priority over `rst_n`, and making the reset asynchronous, both survive
  `tb_anatomy`. Nothing false is claimed — `tb_anatomy` is presented as a shape, not a
  complete test — but the closing checklist invites readers to break the DUT, and either
  of those choices gives a green run.
- **Chapter 1** was signed off at 9/10 with the leftovers closed inline; no open technical
  concern.

## Standing practice adopted from chapter 4: mutation-test every testbench

Chapter 4's review found a shipped testbench that printed
`PASS tb_dump (latency 2, …)` against a `pipe2` **rebuilt with a single flip-flop**. It
narrated a property it never checked. In the chapter that teaches testbench writing.

From here on, for every chapter with code:

1. For each testbench, ask: **what would have to break for this to print FAIL?** If the
   answer is "nothing", or "less than its PASS message claims", it is not yet a test.
2. Prove it by **mutation**: copy the DUT to the scratchpad, break it in several distinct
   ways, and confirm the testbench fails on each. Record the mutations tried.
3. A check that cannot execute must itself be a failure — guard loop-bound checks with a
   precondition, so a testbench that runs zero iterations fails instead of passing.

This matters more with every chapter. By chapter 12 the four-input adder's corner-case
suite is the only thing standing between the reader and a subtly wrong rounder, and a
suite that cannot fail would certify it as correct.

## Run log

Newest entries at the bottom.

- **2026-08-09** — Session 1 start. No `guide/` and no `salvage/` found: fresh start.
  `iverilog` was absent; installed `icarus-verilog 13.0` via Homebrew and verified
  `iverilog`/`vvp`. GTKWave unavailable through Homebrew (formula disabled
  2025-10-29, upstream discontinued) — recorded as an environment limitation for
  chapter 4. Created directory layout and this file.
- **2026-08-09** — Chapter 1 research. The first two subagent attempts both died with
  `API Error: Connection closed mid-response` after ~13 and ~20 minutes, having written
  nothing to disk, because each was holding the whole document for a single final
  `Write`. Fixed by adopting an **incremental write protocol**, now mandatory for every
  subagent in this run:
  1. First action is a `Write` that creates the file as a skeleton — title, a
     `<!-- sections complete: n/N -->` status marker, and every `##` header with a
     `_TODO_` placeholder body.
  2. Fill exactly one section per `Edit`, updating the status marker after each.
  3. Never hold a whole document in one tool call.
  4. On restart, read the status marker and resume at the first `_TODO_`.
  Also capped web verification at 8 URLs / ~10 tool calls per research agent; sources
  without a fetch-verified link are cited by author/title/edition/section and tagged
  `[title-only]` rather than given an invented URL.
  Third attempt succeeded: `research/ch01-digital-logic.md`, 6681 words, 7 sections plus
  citations, no placeholders left. Two intended vendor sources were unfetchable
  (Intel WP-01082 → HTTP 403; Microchip AC474 → binary) and are tagged `[title-only]`.
- **2026-08-09** — Chapter 1 written: `chapters/ch01.md`, 10549 words, 11 sections, no
  placeholders. Every numeric claim was python3-verified before embedding, including an
  exhaustive prime-implicant solve over all 16 minterms, the 4-bit carry-lookahead
  equations over all 512 operand/carry combinations, the carry-save invariant over 20000
  random triples, and all IEEE 754 encodings via `struct`.
  Two corrections to the research notes, both confirmed by python3:
  - The minimized SOP `F = B'C' + CD' + A'BD` has **7 literals**, not the 8 the notes claim.
  - The notes' don't-care result `F = B' + CD' + A'BD` is valid but not minimal: with `d(3)`
    available, `A'BD` also grows to `A'D`, so the true minimum is `F = B' + CD' + A'D`
    (3 terms, 5 literals). The chapter uses the correct minimum.
  **Length note:** chapters are running roughly 2x the nominal per-chapter target because
  the mandated inclusions (worked examples, truth tables, expanded equations, callouts)
  do not compress further. This is accepted — the brief asks for comprehensive,
  expert-grade material. Expect a final guide well over 100k words.
- **2026-08-09** — Chapter 1 review cycle complete. Three review passes, two fix rounds,
  final score **9/10**, signed off as fit to ship.
  - **Review 1 (RTL veteran) — 7/10, 2 blocking defects.** Every equation passed
    independent re-derivation, but the full-adder ASCII schematic was electrically wrong:
    a character-column extraction showed A, B and Cin shorted onto one net, `A·B` shorted
    onto the `A XOR B` node, and `A·B` shorted straight to Cout past the OR. Second defect:
    a false claim that the CMOS pull-up and pull-down networks "both conduct on the same
    input condition", contradicting a correct statement two paragraphs earlier.
  - **Fix round 1.** Full adder redrawn as two half adders plus an OR, with a netlist.
    CMOS sentence corrected. A self-directed column audit of all seven schematics found
    **two further wrong diagrams** the reviewer had missed — the 2:1 mux (unclosed
    trapezoid, D1 diagonal shorted to the select stub) and the two-flop synchronizer
    (unclosed boxes, clock landing one column off FF2's clock arrow). Both redrawn.
    Eleven non-blocking issues closed, inline citations raised from 11 to 20.
  - **Review 2 — 8/10.** Both round-1 blocking defects CLOSED, all 13 diagrams passed an
    independent column audit. But the fix round had **introduced a regression**: strict
    `A > B` was described as the subtractor carry-out ANDed with the zero-detect, which
    actually computes `A = B` (wrong on 32,896 of 65,536 pairs at 8 bits), and it shipped
    with a false "verified exhaustively" parenthetical.
  - **Fix round 2.** Comparator corrected to `A > B = cout AND NOT eq`, with `A < B` and
    `A <= B` added, all five relations re-verified exhaustively at 4, 5 and 8 bits against
    Python's own operators. Recovery/removal properly defined, `5 − 3` layout realigned,
    cross-reference re-aimed, and the stray Verilog fragments reframed as explicitly
    marked teasers since chapter 1 is meant to contain no Verilog.
  - **Review 3 — 9/10, fit to ship.** All numbers, equations, hex constants and timing
    figures re-derived from scratch with zero wrong values; all 13 diagrams and 8 numeric
    layouts pass an independent column audit.
  - **Leftovers closed inline by the orchestrator** (cheaper than a third fix agent):
    corrected the Weste & Harris attribution to Ch. 11 *Datapath Subsystems* (Ch. 10 is
    *Sequential Circuit Design* and contains none of that material); fixed the Verilog
    teaser callout, which claimed six fragments when about thirteen notations appear;
    and — most important for later chapters — propagated both corrections back into
    `research/ch01-digital-logic.md`, which still carried the wrong CMOS conduction claim
    and the wrong greater-than derivation. Chapters 8 and 9 will read those notes, so
    leaving the errors there would have re-seeded them downstream.
  - **Process lesson, applies to every remaining chapter:** ASCII circuit diagrams are the
    single largest source of silent error in this guide, because column alignment *is* the
    netlist — two runs sharing a character column are shorted whether or not the author
    meant it. Three of thirteen diagrams were wrong on first draft and prose review would
    not have caught any of them. **Every writer and reviewer agent from here on must
    column-audit diagrams mechanically with python3, not by eye.**
  - **Open non-blocking item:** `guide/` is not under version control. Worth a commit
    before the tree grows; deferred to the user.
- **2026-08-09** — Chapter 2 research: `research/ch02-verilog-language.md`, ~14k words,
  9 sections. Unusually strong because the agent compiled and ran **33 throwaway modules**
  under the local Icarus 13.0 and quoted captured stdout instead of the LRM. Key findings
  are recorded above under "Toolchain findings that affect later chapters"; the
  `shortreal` / `$shortrealtobits` result is the most consequential, since it gives
  chapters 5, 9 and 12 an in-simulator IEEE 754 golden model.
- **2026-08-09** — Chapter 2 written: `chapters/ch02.md`, 16608 words, 14 sections, plus
  36 `.v` files and a README in `src/ch02/`. The writer re-ran every research experiment
  and found three refinements: `$random % 16` is not negative on the *first* draw under
  Icarus's default seed (the notes' `-7` is the second); an out-of-range **indexed**
  part-select emits a shorter warning than the constant-part-select form the notes quote;
  and `expect` is a reserved word at `-g2012` (SystemVerilog `expect` property), so a task
  of that name is a hard syntax error — not mentioned in the notes at all.
  **Orchestrator independently verified all 24 build targets: 24 pass, 0 fail.** The one
  target that fails to compile, `bad_nettype_none.v`, is supposed to — it is the
  `` `default_nettype none `` demonstration, and the manifest marks it `xfail`.
  Built `src/run_all.sh` and the `targets.txt` manifest convention during this step; see
  the harness section above. This is now the standing requirement for every chapter with
  code, and is the script that task F2 will run.
- **2026-08-09** — Chapter 2 review 1 (pedagogy expert) — **7/10, 4 blocking defects**.
  The code held up completely: `run_all.sh ch02` green at 24/24, all ~20 captured
  simulator transcripts reproduced character-for-character, ten listings byte-identical to
  their files. The defects were in what the chapter *claimed*:
  1. **The sticky-bit definition contradicted the shipped `align_sticky.v`**, which folded
     guard and round into sticky and exposed neither. That module cannot support
     round-to-nearest-even, and it is the chapter's designated FP payload — a reader would
     have carried it into chapter 9 and built a datapath that cannot round correctly.
  2. `align_sticky.v` silently degraded to a pass-through whenever `W >= 2**SHW`.
  3. False claim that an unrecognised system task is a compile-time error. It is not —
     `iverilog` and `iverilog -t null` both exit 0; `vvp` rejects it at load time.
  4. False claim that a non-`automatic` recursive function "returns garbage". It does not,
     for the function shown.
- **2026-08-09** — Chapter 2 fix round 1. All four closed:
  - `align_sticky.v` rewritten to shift into a `2W+2`-bit vector and expose `aligned`,
    `guard`, `round` and `sticky` as four separate ports, with
    `sticky = |shifted[W-1:0]` covering only the bits strictly below the round bit.
    Prose, listing, transcript, seed callout and checklist all rewritten to teach the
    three-way G/R/S split and the correct tie-breaking rule.
  - The `SHW` precondition is now an **elaboration-time** `$fatal` in a generate-`if`
    rather than a run-time check, which makes a violation a build failure and is itself
    harness-coverable — new `xfail` target `bad_align_shw.v`.
  - B3 and B4 replaced with the behaviour actually reproduced this session. B4 turned out
    to be a genuine but different hazard: `n * fact(n-1)` returns 120 without `automatic`
    while `fact(n-1) * n` returns 1, so the real lesson is evaluation-order dependence of
    the shared static return variable. New `bad_recursion.v` demonstrates it.
  - ~610 words cut per the reviewer's list (the 745-word trap bullet list became a
    321-word `trap → section → file` table), but the chapter still grew to 17849 words
    because closing defect 1 honestly required a bigger module and a three-case rounding
    explanation. That is the right trade.
  **Orchestrator independently verified:** harness 27/27 green, and `align_sticky.v`'s
  G/R/S outputs re-derived in python3 against a from-scratch reference over 16320
  mantissa/shift combinations with **zero mismatches**. This module is the seed of the
  chapter 8-9 rounding path, so it was worth checking rather than trusting the report.
- **2026-08-09** — Chapter 2 review 2 — **8/10**. All four round-1 defects CLOSED and the
  sticky-bit module confirmed correct over 59392 vectors against a model derived from the
  quotient/remainder definition rather than bit indices. But fix round 1 introduced two
  new defects: the G/R/S worked example printed mantissas in unlabelled hex while asking
  the reader to index individual bits, and the new elaboration guard's stated rationale
  was **provably false** — the reviewer deleted the guard and showed the rejected
  parameter pairs compute correct results.
- **2026-08-09** — Chapter 2 fix round 2. Worked example now prints hex *and* the indexed
  field in labelled binary. The elaboration guard was kept but re-justified honestly as a
  **design-intent assertion**, not a correctness fix — the correctness actually comes from
  making `SH_MAX` a full-width `localparam [31:0]`, and the chapter now demonstrates that
  with a verified counterfactual (`localparam [SHW-1:0]` at `W=32, SHW=5` gives
  `32'd34 & 5'h1F = 5'd2`, saturating every shift of three or more at two). The G/R/S
  material was also promoted to its own `##` section.
- **2026-08-09** — Chapter 2 review 3 — **8/10**, two real defects, both prose-only:
  1. The section promotion orphaned four **positional** cross-references ("the next
     section", "the previous section"), which now pointed two or three sections wide.
     Earlier rounds had audited only the quoted-heading form, so these survived twice.
  2. The `-Wall` membership paragraph was empirically false. The reviewer measured every
     warning with and without `-Wall` and with targeted `-Wno-` suppression.
- **2026-08-09** — Chapter 2 closed. Because the r3 items were prose-only and could not
  regress the code, the orchestrator applied them inline rather than spending a third fix
  agent: four cross-references re-pointed at section titles, a `casex` reference re-aimed,
  the skip-ahead lead-in widened to name chapter 7 and to stop readers skipping the
  `localparam`/elaboration lesson, a handoff clause added at the end of "The Operators",
  and the `-Wall` paragraph rewritten.
  **The `-Wall` correction was independently re-measured before rewriting.** Confirmed on
  this machine: `implicit` and `select-range` are genuinely `-Wall`-gated; the port-width
  warning, `@* found no sensitivities`, `Numeric constant truncated`, and the `-g2005`
  `Using SystemVerilog 'N bit vector` are **ungated**. Notably `-Wno-portbind` does *not*
  suppress the port-width warning despite appearances — warning-class names are an index,
  not a contract. `src/ch02/README.md` corrected to match.
  All five surviving positional cross-references were then re-checked against the section
  table and are accurate. Final state: 18692 words, harness **27/27 green**.
  **Process lesson for later chapters:** when a section is moved, audit cross-references
  in *both* forms — quoted-heading references and positional ones. Positional phrases
  ("the next section") are invisible to a title-based grep and are exactly what a move
  breaks.
- **2026-08-09** — Chapter 3 research: `research/ch03-comb-seq.md`, ~15.5k words, backed by
  **33 compiled-and-run Icarus experiments** with verbatim output. Key findings recorded
  above under "Toolchain findings". The most consequential is that Icarus reports nothing
  at all for eight of the nine classic beginner bugs, which became a load-bearing theme of
  the chapter rather than a footnote.
- **2026-08-09** — Chapter 3 written: `chapters/ch03.md`, 13328 words, 15 sections, 28
  `.v` files. Harness 19/19 green, orchestrator-verified.
- **2026-08-09** — Chapter 3 review 1 (RTL veteran) — **7/10, 2 blocking defects**. Code
  immaculate: harness green, all 23 listings byte-identical to disk, all 21 transcripts
  reproducing line-for-line including three needing non-default flags. Both defects were
  claims:
  1. **The chapter said switching to `always_comb` / `always_ff` turns several of its
     silent bugs into compile errors. Measured false on Icarus 13.0** — an incomplete-`if`
     latch under `always_comb` and a blocking assignment inside `always_ff` both compile
     silently and exit 0, latch intact. Worst possible location: inside an
     `> **Icarus reality.**` callout, the chapter's one promise of measured truth about
     the reader's own tool.
  2. The detection table credited "nothing at all" to the accidentally-correct blocking
     assignment. Wrong — linters have a dedicated check — and contradicted by the
     chapter's own conclusion fifteen lines later.
- **2026-08-09** — Chapter 3 fix round 1. Both closed and now harness-backed by a new
  `bad_svalways.v` target. The rewritten callout states IEEE 1800's *should* (not *shall*),
  carries the actual measurement, and makes the honest distinction: `always_comb`/
  `always_ff` **are** checked by Vivado/Questa/VCS/Verilator but **not** by Icarus, so an
  Icarus-only reader gets documentation value without enforcement. Deliberately not
  overcorrected into "they are useless". A `> **Seed for chapter 13.**` hands the
  enforcement story to the SystemVerilog chapter.
  The detection table was re-audited cell by cell and grew from 10 to 14 rows, adding
  `MULTIDRIVEN`, removing false credit to synthesis for incomplete sensitivity lists and
  for blocking-in-clocked, and splitting the whole-array and whole-vector `@*` cases.
  About 400 words were cut but the chapter grew to 15397, because closing the defects
  honestly cost ~2400 words of new measured material concentrated exactly where the
  review demanded precision. That is the right trade.
  Three cuts were declined with reasons: moving four simulation artifacts to chapter 4
  (chapter 4 is unwritten; that is a two-chapter operation, not a fix round), merging the
  trap and detection tables (the fix required the detection table to become *more*
  precise), and cutting the third FSM style (it now carries the `default: ;` lesson).
  **Orchestrator independently confirmed** the `always_comb` finding: compiling
  `bad_svalways.v` produces no latch warning whatsoever — the only diagnostic is the
  unrelated `always_ff` edge-sensitivity one. Harness 20/20.
- **2026-08-09** — Chapter 3 review 2 — **8/10**. Both round-1 defects CLOSED. The whole
  14-row detection table was audited cell by cell, every Icarus column re-measured, and
  all three named linter identifiers (`LATCH`, `BLKSEQ`, `MULTIDRIVEN`) confirmed to be
  real Verilator checks with none invented. All 23 listings byte-identical, all 23 output
  blocks reproduce from a cold recompile. Three defects remained, and the shape of two of
  them is worth noting: **fixing a defect can invalidate a counting claim elsewhere.**
  Adding `bad_svalways.v` gave Icarus a second warning, which falsified two surviving
  sentences calling the array warning its "only diagnostic anywhere in this chapter".
- **2026-08-09** — Chapter 3 closed. The orchestrator applied the r2 items inline, since
  all were prose and none could regress the code:
  - Corrected both "only diagnostic" claims to "one of only two".
  - Put the Vivado/Questa/VCS/Verilator enforcement claim behind the chapter's own
    epistemic marker. This chapter maintains a strict wall between "measured on this
    machine" and "read in a manual", and that claim had crossed it unflagged — the same
    failure mode as the round-1 blocking defect, at lower amplitude. Questa and VCS were
    also missing from the absent-tools disclosure; both added, and the Sources note now
    lists three documentation-derived exceptions rather than two.
  - Restored a `t=60` row silently dropped at a transcript join.
  - **Propagated the correction upstream into `research/ch03-comb-seq.md`**, which still
    said a tool is "required to check" `always_comb` and that the keywords "turn several
    hazards into compile errors". Both replaced with a prominent corrected-on note giving
    the measurement and the *should*-not-*shall* distinction, and explicitly warning
    chapters 9, 11, 12 and 13 not to restate the original claim. Chapter 13 is the
    SystemVerilog transition chapter and was being aimed straight at this error.
  Final: 15479 words, harness **20/20**, zero positional cross-references.
- **2026-08-09/10** — Chapter 4. Research 8.5k words / 24 experiments — the first notes
  file disciplined enough not to need cutting. Chapter written at 9000 words, the first to
  land inside its target. Then the hardest review cycle in the project so far: **three fix
  rounds, the maximum**, final score 7/10, signed off as fit to ship.
  - **Review 1 — 6/10, four blocking defects**, the lowest score in the project. The
    reviewer did what none before it had: **it broke the DUT and checked whether the test
    noticed.** `tb_dump.v` printed `PASS tb_dump (latency 2, …)` against a `pipe2` rebuilt
    with a single flip-flop — a testbench narrating a property it never checked, in the
    chapter that teaches testbench writing. The Makefile had the same disease: no
    dependency edge from testbench to DUT and cached `.log` results, so a broken
    `adder8.v` produced `make: Nothing to be done for 'all'.` and exit 0.
  - **Fix round 1** rewrote the check, audited all 14 testbenches, and rebuilt the
    Makefile dependency graph with `FORCE`-gated `run-%` targets so compiles cache but
    runs never do.
  - **Review 2 — 7/10.** Ran **63 mutants in 91 runs** and still found tests that could
    not fail: a `pipe2` rebuilt as a single **negative-edge** flip-flop passed, because
    sampling only at posedge is blind to a half-cycle shift; `adder8`'s carry-out was read
    by no testbench at all, so tying it to a constant gave a clean 14/14; and
    `tb_dump`'s watchdog was **edge-counted**, so a dead clock hung the simulation forever
    instead of failing it.
  - **Fix round 2** added a concurrent `always @(q)` check, made `tb_stimulus.v` check the
    carry, and converted the watchdogs to absolute time.
  - **Review 3 — 7/10.** 53 further mutations in 60 suite runs found **no testbench that
    cannot fail**. What remained was the project's recurring failure mode: **claims
    stronger than measurements.** The fix round had certified its own headline fix by
    declaring a surviving mutant "provably equivalent"; the reviewer killed it from the
    port alone by moving the stimulus into the clock's high phase, dropping its latency
    from two cycles to one.
  - **Fix round 3** reproduced that kill first-hand, then rewrote the claim into the
    better lesson: **a mutant that survives your stimulus is not an equivalent mutant, it
    is a gap in your stimulus.** Also repacked `vectors.hex` to 32-bit words so
    `tb_vectors.v` checks `cout`, guarded `^vec[N-1]` as well as `^vec[0]` (a truncated
    vector file previously printed `PASS ... 0 errors` because `x !== x` is false), and
    corrected the auto-root-module claim — with two uninstantiated modules Icarus
    elaborates **both** as concurrent roots and the first `$finish` ends everything.
  - **Harness improvement by the orchestrator:** `run_all.sh` gained a per-simulation
    wall-clock timeout via a `perl`/`alarm` shim, since macOS ships neither `timeout(1)`
    nor `gtimeout`. Self-tested against a deliberately non-terminating module. Without it
    a single hung testbench would stall the whole F2 smoke test.
  - Final: 9990 words, harness 14/14, repo 61/61, zero artifacts under `guide/src/`.
- **2026-08-10** — Chapter 5 research: ~10.5k words, 16 experiments. It resolved chapter
  4's handed-forward mutant completely and mapped Icarus's real assertion and coverage
  support. Findings recorded above; the `shortreal`-is-a-`double` and
  `$urandom(seed)`-linearity results are the two that later chapters must not forget.
- **2026-08-10** — Chapter 5 written: 10492 words, 13 sections, 14 `.v` files, harness
  12/12, repo 73/73. 38 mutations applied, 34 killed. One survivor was a genuine gap the
  writer fixed on the spot: **a `counter6` counting *downwards* satisfied every assertion**,
  so `tb_assert.v` gained a value-sequence check.
  The writer also caught seven wrong claims in its own research notes, including the
  `$urandom(seed)` linearity that had corrupted the chapter's headline number from 3.97 to
  2.98 before it was found.
- **2026-08-10** — Chapter 5 review 1 (pedagogy expert) — **7/10**. Strong on arithmetic:
  **32 of 34 statistics re-derived exactly**, including 16,512/65,536 = 25.1953125% with
  the killing class proved set-equal to the wrong set, first kill at sweep position 128,
  1/p = 3.9690, P(|Δexp| ≥ 25) = 0.81639, and the full E4M3 population. Both `xfail`
  targets fail for exactly their stated reasons across a re-run 12-construct × 4-level
  assertion matrix. Tree verified byte-identical by SHA-256 across all 41 files after the
  reviewer's own mutation work.
  But it ran 34 fresh mutations (26 killed, 8 survived) and found **three tests that
  cannot fail at what they appear to test**, plus the `shortreal` exemption defect. Details
  and the fix priority are in the RESUME HERE section above.
  **The recurring lesson of this project, now five chapters deep:** the code is almost
  always right and the *claims about the code* are almost always where the defects are.
  Every review so far has found at least one statement stronger than its measurement.
- **2026-08-16** — Session resume in a fresh **Linux** cloud container (previous sessions
  were macOS). `iverilog` absent; `apt` installs **12.0**, which fails 6 regression
  targets because it lacks `$shortrealtobits`/`$bitstoshortreal` (see the portability
  finding in the Environment section). Built tag `v13_0` from source → `/usr/local/bin`,
  re-ran `run_all.sh`: **73/73 green**. Toolchain verified; resuming at chapter 5 fix
  round 1.
- **2026-08-16** — Chapter 5 fix round 1 complete (`reviews/ch05-fixes-r1.md`). Both
  blockers closed: the `shortreal` exemption re-aimed at chapter 9 with the chained-
  reference cost re-measured this session (tree 2,595/200,000 = 1.298 %, sequential
  1.295 % — same ~1.3 % phenomenon as the review, different RNG, chapter quotes the
  session's own numbers); `tb_scoreboard.v` monitor gating rebuilt (gate opens on the
  first real negedge, closes `#1` after the final posedge, new `checks !== driven`
  guard) and the replay profile is now the true **4/1/3**, python3-pinned. Also: honest
  interleaved `-DBREAK_WRAP` transcript; `-DALL_POSITIVE` demonstration that the
  34-bin model reports "coverage closed" on a stream that never subtracts, with the
  Seed-for-12 callout extended to name the missing sign/rounding bins; taxonomy fixes
  (exception-flags note, roundTiesToEven stated, row F corrected to **0.589 %** exact);
  no-DUT sentence for `tb_covfp.v`; all thirteen one-liners including a mutation-proved
  `tb_fpref` distinct-pairs guard and a between-edges reset check that **kills the
  counter6 async-reset survivor** (chapter 4's open concern class, now closed in ch05).
  README mutation record updated (headline later corrected to the recounted 41 tried /
  37 killed / 4 survivors — see the r2 close-out entry). Harness
  12/12, repo **73/73**, orchestrator-verified from a cold run. Chapter now 11,415 words
  (over the 10.5k soft ceiling; the growth is transcript and measurement demanded by the
  review, which the brief forbids cutting).
  **New platform finding for chapters 9/12:** on this x86-64 host Icarus prints
  `inf + (-inf)` as `ffc00000` — a *negative* quiet NaN — where the arm64 macOS session
  observed `7fc00000`. IEEE 754 leaves the sign of a generated NaN unspecified, so
  **NaN results must be compared by class plus quiet bit, never by full bit equality**;
  the chapter now says so in place. Any transcript containing a generated NaN is
  architecture-dependent.
- **2026-08-16** — Chapter 5 re-review (r2, pedagogy expert): **8/10**, written to
  `reviews/ch05-review-r2.md`. Both round-1 blockers and all seven work items confirmed
  genuinely closed by the reviewer's own runs: scoreboard gate traced clean (no phantom,
  last vector scored, 4/1/3 re-derived from ch04's `vectors.hex`), chained-reference
  cost reproduced at 1.290 % under an independent RNG, the `-DBREAK_WRAP` block verified
  as the literal first-6+last-4 lines of the real capture, `-DALL_POSITIVE` closes 34/34
  with an instrumented zero effective subtractions, async-reset and duplicate-row
  mutants killed, 73/73 cold, listings byte-identical, tree restored (115/115 SHA-256).
  Two remaining defects, both claims-stronger-than-measurement: (D1) the new
  `checks !== driven` guard's stated rationale was provably false — a cancelling
  phantom+drop pair passes it, and only the pinned replay profile catches the pair
  (random mode has no detector and relies on the gate discipline); (D2) the README's
  42/38/4 headline did not reconcile with its own 41-row ledger (25-row testbench table
  under a "26 applied" header — an off-by-one propagated by arithmetic instead of
  recount). Plus three nits: 0.91 s attributed to "this machine" where it measures
  1.4 s; "ends with five" vs seven end-of-run checks; `tb_covfp` bin definitions
  unverified (M18 survives).
- **2026-08-16** — Chapter 5 CLOSED at **8 (+ all r2 items closed)**, per the ch02/ch03
  precedent: all five r2 items were prose/comment-level and could not regress code, so
  the orchestrator applied them inline rather than spending fix round 2. D1: guard
  comment and chapter clause rewritten — the pinned profile is credited for the
  cancelling pair ("each moves a bin the other does not"), `checks !== driven`'s honest
  job stated as attribution of an *unpaired* phantom/drop, random mode's reliance on
  gate discipline named; "ends with five" corrected to seven (D4 folded in). D2: ledger
  recounted by the orchestrator (7+3+6+25 rows = 41 applied, 37 killed, 4 survivors;
  testbench table 25/21), README headline, chapter body, Sources bullet and this file
  all corrected, with a one-line honesty note in the README about the propagated
  miscount. D3: both timing attributions reconciled (0.91 s arm64 / 1.4 s this
  container). D5: `tb_covfp` bin-definition blind spot recorded in the README for
  chapter 12. Verified after the edits: `run_all.sh ch05` 12/12 and all five chapter
  listings still byte-identical contiguous slices (mechanical check). Chapter 5 is fit
  to ship. Next: chapter 6 research.
- **2026-08-16** — Chapter 6 research: `research/ch06-binary-fixedpoint.md`, 9485 words,
  9/9 sections. 17 python3 verification scripts and 13 compiled-and-run Icarus modules
  (`-g2012 -Wall`, zero warnings on all — every signedness bug class measured
  compile-time silent), 3 fetch-verified sources (ZipCPU convergent rounding, two
  Wikipedia; digitalsignallabs 503'd so Yates is [title-only]). Highlights for the
  writer: 0.1's period-4 repeating binary expansion computed; complement subtraction
  re-run on chapter 2's actual `ripple4`; C/V overflow rules verified exhaustively;
  truncation bias measured −0.469 LSB/sample vs half-even −0.001 over 100k samples,
  matching closed form; dynamic range 192.7 dB (32-bit fixed) vs 1529 dB (float32),
  278 fixed bits to match. Surprises, all measured: `(s + u*0) >>> 2` silently degrades
  to a logical shift (multiply-by-zero poisons signedness); a full-width part-select
  `s[7:0]` is NOT `s` (unsigned, kills `>>>`); Verilog `/` and `>>>` disagree on
  −13/4 (−3 toward-zero vs −4 floor) — the same distinction behind truncation bias.
- **2026-08-09** — Chapter 4 written: `chapters/ch04.md`, **9000 words** exactly, 13
  sections, plus 21 `.v` files, a `Makefile`, two `.hex` vector files, `targets.txt` and a
  README in `src/ch04/`. Harness **14/14 green**, verified from a cold `run_all.sh ch04`.
  All seven Verilog/Makefile listings mechanically confirmed byte-identical to files on
  disk (two whole files, five verbatim excerpts); every transcript re-captured from a cold
  rebuild in the session scratchpad. **Nothing was written into `guide/src/`** — waveform
  dumping in every testbench is behind a `+dump=<path>` plusarg precisely because
  `$dumpfile` and `$readmemh` resolve against `vvp`'s working directory, which for both
  the Makefile and `run_all.sh` is the source directory.
  **Length: the first chapter to land inside its target** (1-3 ran 11.9k / 18.7k / 15.5k
  against a 7-9k brief). It was drafted at 11.7k and cut by 23 % in ten passes; the cuts
  were prose only, no measurement or listing was dropped, and two transcripts that had
  become non-contiguous selections were re-flagged in their lead-ins rather than silently
  elided.
  **Five research-note claims were measured wrong and are corrected in both files** — see
  "Toolchain findings" above and the new corrections section in
  `research/ch04-simulation.md`. The consequential one for later chapters is that
  `$dumpvars` on a memory is a **load-time** rejection, so chapter 12 cannot gate it behind
  a plusarg. Also new: parameters, named blocks and tasks all appear in the VCD.
  Chapter 4 has **no `xfail` target**, and the manifest says why: both of its hard errors
  are `vvp` load-time rejections, which fit neither manifest row.
  Deliberate handoffs made rather than duplicated: the x-clock and same-edge-stimulus
  traps stay in chapter 3 and are cross-referenced by section title; `$display` format
  specifiers defer to chapter 2. Seeds planted for chapters 5 (determinism, the accidental
  pass, scoreboards), 9 and 12 (file-driven vectors, the regression command, the memory
  dump trap) and 11 (pipeline latency read as horizontal distance in a waveform).
  Zero positional cross-references.

- **2026-08-10** — Chapter 5 written: `chapters/ch05.md`, **10493 words**, 13 sections, plus
  **14 `.v` files**, `targets.txt` and a README in `src/ch05/`. Harness **12/12 green**
  (10 `run`, 2 `xfail` — the chapter's first `xfail` targets, `bad_sva.v` and
  `bad_covergroup.v`, which pin Icarus's SVA and covergroup boundary mechanically instead
  of by memory). Repo **73/73**. Zero compile warnings at `-g2012 -Wall`. Nothing written
  into `guide/src/`: no testbench opens a `$dumpfile` and none uses `$readmemh`.
  **Chapter 4's promise is kept.** `cout = a[7] | b[7]` is the running example through the
  whole chapter, shipped as `src/ch05/adder8_mut.v` and driven beside the real adder by
  four testbenches. Every number was re-derived here, twice where possible:
  - wrong on **16,512 of 65,536 pairs = 25.195 %**, from an exhaustive `python3` loop and
    from `tb_exhaustive.v` under `vvp`, agreeing to the pair; first disagreement at sweep
    position 128, `a=00 b=80`;
  - a plausible 14-vector carry-focused directed set leaves it **alive** (`tb_directed.v`
    asserts the survival, and asserts that the set really is half carrying, so the
    demonstration cannot rot into a vacuous one), and `aa+55` kills it;
  - uniform random kills it in **3.9075** vectors on average over 2000 consecutive trials
    (theory 1/p = 3.9690; an independent 200,000-trial `python3` Monte Carlo gave 3.963),
    and Icarus's default `$random` stream kills it on vector 0;
  - a `{a[7], b[7], cout}` coverage cross fed chapter 4's eight cout-checked vectors fills
    **3 of 6 reachable bins**, and the two empty ones are exactly the mutant's class —
    the hole is visible before anyone thinks to mutate. The two unreachable bins are
    **excluded with a proof**, and `tb_exhaustive.v` fails the run if the proof breaks.
  **Mutation record: 38 mutations, 34 killed, 4 survivors, all in `src/ch05/README.md`.**
  Every testbench fails on at least one. The four survivors have written reasons; the most
  interesting is a genuine blind spot — replacing a reference model with the design's own
  output cannot be caught from inside a testbench, because the comparison becomes a value
  against itself. One survivor was a real gap and was fixed during writing: `counter6`
  rewritten to count *downwards* satisfied every assertion in `tb_assert.v`, since
  "q is never more than 5" is just as true backwards, so the file gained an explicit
  value-sequence check. That is the chapter's own lesson applied to itself.
  **Seven research-note claims were measured wrong or incomplete and are corrected in
  "Toolchain findings" above** — the most consequential being the newly discovered
  `$urandom(seed)` first-draw bias, which silently corrupted this chapter's headline
  measurement until it was found.
  **Length:** drafted at 13.8k and cut by 24 % in eleven passes to 10493, inside the
  10.5k ceiling. No measurement, transcript or listing was dropped to make the number; the
  cuts were prose, four code listings that prose could carry (`ref_add`, the driver task,
  `fp_add`, the monitor line), and abridgements of four transcripts whose lead-ins now say
  so. All five remaining Verilog listings were mechanically confirmed to be byte-identical
  contiguous slices of files in `src/ch05/`, and every transcript line was re-matched
  against fresh output captured in this session.
  Zero positional cross-references; every cross-reference is a quoted section title.
- **2026-08-16** — Chapter 6 written: `chapters/ch06.md`, **9534 words**, 15 sections,
  plus 7 `.v` files (2 DUTs + 5 testbenches; 5 build targets), `targets.txt` and a README in `src/ch06/`. Harness **5/5 green**,
  repo **78/78**, zero compile warnings at `-g2012 -Wall` on every target — and the
  zero is quoted as a finding, since `tb_signtraps.v` packs every signedness/width
  bug class the chapter teaches into one warning-free compile with 49 known-answer
  checks pinning the measured behaviors. The manifest's first two rows compile
  `../ch02/ripple4.v`/`full_adder.v` unmodified: chapter 2's own adder subtracting
  via `a+~b+1` (256/256, `cout == (a>=b)`) and reporting V three equivalent ways
  (256/256 add + 256/256 subtract, census 108/84/28/36 asserted), with the carry
  into the MSB recovered from the ports as `s[3]^a[3]^b[3]`. Exhaustive proofs:
  `satq44` (65,536 pairs, 16,384 overflows asserted) and `fixmul44` (65,536 pairs,
  bias ledger asserted against python3: floor −425984 sixteenths, half-up +65536,
  half-even exactly 0, ties 8192 — the product-distribution biases differ from the
  uniform-input table and the chapter says why). Every worked number re-derived
  this session; the 100k-sample drift reproduces the research notes to the digit.
  All 35 fenced blocks mechanically verified byte-identical (6 listings, 29
  transcripts). Zero positional cross-references (three were caught and fixed in
  the writing pass). Mutation record: **25 tried, 22 killed, 3 survivors with
  written reasons** (`src/ch06/README.md`) — one proven output-equivalent *by* the
  exhaustive sweep, one check-deletion (relaxation is invisible to a run), one
  golden-file hazard (partial self-reference passes just as silently). Seeds
  planted for chapters 7 (0x3dcccccd, bias 127 vs 128, sign-magnitude) and 8
  (alignment shift inversion, L/R/S → G/R/S, C-flag renormalize, −(−8) magnitude
  corner). Next: review, persona IEEE 754 specialist.
  **Orchestrator independently verified before commit:** cold full `run_all.sh`
  **78/78**, artifact check empty, marker 15/15 with zero TODOs, and all six
  Verilog listings mechanically re-confirmed byte-identical (including the two
  that slice `ch02/ripple4.v`-adjacent testbenches compiled in place).
- **2026-08-16** — Chapter 6 review 1 (IEEE 754 specialist) — **7/10**, in
  `reviews/ch06-review.md`. The executable core was clean: cold 5/5 and 78/78, all six
  listings byte-identical, ten transcripts reproduced, -Wall silent per target, the
  25/22/3 ledger reconciled, and 112 of 115 independently re-derived numbers exact.
  Four real defects, all claims: `8'b11111111` glossed as "the exponent −112" (it is
  +128 under excess-127; −112 is 0x0F); the pi-in-Q3.13 step/2 bound quoted as 3.05e−5
  (2^−15) where Q3.13's is 2^−14 ≈ 6.1e−5 — inherited from the research notes; "the
  whole float compares like an integer" false for opposite-sign pairs without a
  sign-aside qualifier (−1.0 = 0xBF800000 sorts above 2.0 = 0x40000000); and the
  claim that warning-silence is "re-measured on every harness run" when `run_all.sh`
  demonstrably swallowed compile warnings on green runs. Also: the bias ledger alone
  cannot catch a ties-to-odd mutant (per-pair check is load-bearing) and `p_even`
  shares M16's proven output-equivalence.
- **2026-08-16** — Chapter 6 fix round 1, orchestrator-applied (every item a
  prescribed one-to-three-line fix; arithmetic independently re-verified with python3
  before editing: 255−127=+128, 2^−14=6.10e−5, the 0xBF800000/0x40000000 lexical
  counterexample, 0.1f rel. error +1.49e−8). All eight r1 items closed. The harness
  overclaim was closed by MAKING IT TRUE: `run_all.sh` now fails any `run` target with
  a non-empty compile log, and a new `warn` manifest row type (documented in the
  script header and the harness section above) requires deliberate warning demos to
  keep warning — seven ch02/ch03 targets converted after the gate correctly flagged
  them. Gate self-tested both directions (a truncation-warning module fails as
  `compile warnings`; a silent module passes). Full repo **78/78 under the gate**,
  ch06 listings re-verified byte-identical after the fixmul44.v header edit
  (header is outside both quoted slices). Chapter now 9600 words (wc -w; an earlier figure of 9775 came from a different tokenizer). Next: re-review.
- **2026-08-16** — Chapter 6 re-review (r2, IEEE 754 specialist) — **9/10, fit to
  ship**, in `reviews/ch06-review-r2.md`. All eight r1 items verified closed by the
  reviewer's own runs: the repaired magnitude-compare claim itself verified over
  3,000+ patterns; the fixmul44 header bound proven the exact range [−1016, +1024]
  for all three requantizers; both README notes reproduced empirically (p_even >> 4
  survives as an equivalent; a ties-to-odd mutant passes the ledger exactly and dies
  to the per-pair check with 8,192 errors); the harness gate self-tested in all four
  directions plus warn-with-failing-sim; cold 78/78 with all seven `warn` targets
  still warning individually; all 6 listings and 10 transcripts verified; chapters
  2-5 prose unfalsified by the harness change; tree restored 124/124.
- **2026-08-16** — Chapter 6 CLOSED at **9/10**. r2's four supporting-doc nits closed
  inline by the orchestrator: (1) the research notes' false "whole float compares
  like an integer" claim corrected with a dated note forbidding chapter 7 from
  restating it — the same notes-inheritance path that caused the pi-bound bug;
  (2) STATE.md word count corrected to the reproducible `wc -w` 9600; (3) ch02/ch03
  `targets.txt` headers now document the `warn` row type (ch04-06 headers tightened
  to "zero iverilog output" for consistency); (4) "pins their quoted diagnostics"
  softened to presence-of-a-diagnostic in both STATE.md places. Full regression
  78/78 after all edits. Next: chapter 7 research.
- **2026-08-16** — Chapter 7 research: `research/ch07-ieee754.md`, 7309 words, 12/12
  sections. 7 python3 scripts + 5 Icarus testbenches (~40 probes). Covers the layout
  with re-derived populations and a hex-range classification table, bias-127
  consequences with a million-point monotonicity check, seven fully worked encodings,
  the −126/−149 subnormal reconciliation, verified exponent promotion, NaN anatomy,
  a five-attribute rounding table validated on 100k doubles, ulp/epsilon convention
  clashes, addition-specific exception rules, and history (Kahan interview + Goldberg
  fetch-verified; six [title-only]). Five new toolchain findings recorded above —
  the sharpest: `shortreal` assignment does not round at all (only `$shortrealtobits`
  rounds, at the call), and a binary32 adder provably cannot raise underflow (tiny
  sums are exact; 0 inexact in 400k cancelling pairs).
- **2026-08-16** — Chapter 7 written: `chapters/ch07.md`, 9496 words at first write — 9639 after the r1 fix round (wc -w), 16
  sections; `src/ch07/` ships `fp32_class.v` (the binary32 classifier chapters 9/12
  will instantiate: five-class one-hot + quiet bit), `fp32_fields.v`, and three
  testbench targets (`tb_class`, `tb_fields`, `tb_encode`, `tb_lab`), all compiling
  with zero iverilog output. Harness 4/4; full repo **82/82** cold,
  orchestrator-verified. Both listings byte-identical (mechanically re-checked); 26
  transcript lines re-matched against fresh session captures. Mutation record: 21
  tried, 19 killed, 2 survivors with written reasons (one proven output-equivalent —
  `f[22]=1 ⇒ F≠0` — and one deleted-check relaxation, the ch06 survivor class).
  Next: review 1, IEEE 754 specialist.
- **2026-08-16** — Chapter 7 review 1 (IEEE 754 specialist) — **8/10, no blocking
  defects**, in `reviews/ch07-review.md`. Everything numerical held: every hex
  constant re-derived, all 40 rounding-table cells, the census, the never-underflow
  proof confirmed by the reviewer's own 448k-pair exact-arithmetic search, the
  classifier through a 67.1M-pattern exhaustive sweep at critical exponents plus
  100k random and five reviewer-devised mutations (zero failures), transcripts
  byte-exact, six Kahan-interview quotes fetch-verified. Five defects, all
  claim-level: an impossible measurement method stated for the spacing table's
  max-normal row; a silent contradiction of ch05's flags enumeration; a 2×
  generator-dependent tiny-sum count discrepancy between chapter and notes; an sNaN
  quieting attribution that ignored conversion quieting first; two small glosses.
- **2026-08-16** — Chapter 7 fix round 1, orchestrator-applied; all five items then
  **verified at their sites by the resumed reviewer** (post-fix section appended to
  the review). Final score **9/10, fit to ship**. The substantive fix: ch05's
  cross-cutting flags note now carries a dated correction removing underflow from
  binary32 addition's raisable flags, cross-referencing ch07's proof — the two
  chapters no longer disagree in print, and ch12 inherits the simpler proven
  enumeration. Two residual nits closed inline (Trap 2 citation re-aimed at
  "shortreal: The Bit-Level Laboratory"; word counts corrected to wc -w 9639).
  Full regression 82/82 after all edits. Chapter 7 CLOSED. Next: chapter 8 research.
- **2026-08-19** — Chapter 8 research complete: `research/ch08-fp-addition.md`, 8504
  words, 13/13 sections. The agent hit a session-usage cutoff at 3/13 on 2026-08-17;
  the incremental write protocol did its job — the partial file was checkpoint-
  committed, the agent resumed by message two days later with its context intact and
  re-ran every measurement it was no longer certain of. 10 numbered experiments
  (7 python3, 3 Icarus, ~2.1M exactly-verified pairs; the hardware-faithful model
  matched exact rational arithmetic on all 1,000,054 sweep pairs). Ten digit-by-digit
  worked examples verified three independent ways; hand-worked counterexamples for
  every degraded guard-bit variant; Sterbenz verified exhaustively; the shortreal
  reference verdict with NaN/sNaN/chain exclusions; non-associativity seeds for
  chapter 10. Five new toolchain findings recorded above — the sharpest for
  verification: the rounding-carry renormalize is unreachable by random stimulus
  (0 in 1M pairs), and the notes' own first-draft cancellation invariant was
  falsified by its sweep (G stays live; only R and S provably die).
- **2026-08-19** — Chapter 8 written: `chapters/ch08.md`, 11000 words (wc -w), 18
  sections; `src/ch08/` ships `fp32_add_alg.v` (the ten-step algorithm as executable
  Verilog, instantiating ch02's `align_sticky.v` — the G/R/S seed finally cashed) and
  four testbenches. Harness 4/4; repo **86/86** cold, orchestrator-verified. Six
  listings byte-identical (re-checked); twelve transcripts verbatim from vvp; every
  worked number re-verified against a Fraction exact model that matched the 28-bit
  datapath model on 1,000,058 pairs. Mutations 27/23/4, survivors reasoned. Headline
  campaign finding: R-fold mutant M16 survived the whole first-draft directed
  library and died only under random — the directed kill `3FFFFFFF+3E800009 →
  40100001` was added to `tb_corners`, the chapter's own coverage lesson applied to
  itself. The mandated renormalize-disabling mutant (M4) is killed by the directed
  set, and T3c proves the empty-bin gate itself executes. Next: review 1, IEEE 754
  specialist.
- **2026-08-19** — Chapter 8 review 1 (IEEE 754 specialist) — **8/10**, then **9 after
  two fix rounds**. The reviewer built its own exact reference (Fraction + from-scratch
  RNE, validated 0/100,000 against `struct`) and drove **1,004,425 pairs through the
  shipped `fp32_add_alg.v` with zero mismatches** on result bits and all three flags,
  plus an independent million-pair model sweep on its own seed and an **exhaustive
  50,176-pair run of the same ten-step algorithm at p = 5** — structural evidence that
  the 28-bit width budget needs no 29th bit. It reproduced the headline findings
  independently (renormalize 0 in its own 10⁶; G live in 18.9 % of massive
  cancellations vs the chapter's 19.2 %) and reconciled the whole 27/23/4 mutation
  record with verbatim first-failure messages. All defects were claims stronger than
  measurements: an unreproducible associativity row (printed 3.33 %; the orchestrator
  independently re-measured **0.64 %** with a stated generator, matching the reviewer's
  0.63 %), an 81.6 %/d≥25 figure paired with a d≥26 property (80.9 %, with a
  result-visible counterexample at d = 25), two wrong ratio bounds (an eighth → a
  quarter, a quarter → half; both re-derived here), and one undeclared abridgement.
- **2026-08-19** — Chapter 8 fix rounds, orchestrator-applied, reviewer-verified.
  Round 1 closed all seven items; the reviewer confirmed each at its site and
  re-verified that the added saturation vector makes the clamp-25 mutant die on
  **result bits in both orders** rather than only at the coverage gate. That fix then
  caused the project's known **bookkeeping ripple** — two coverage bins moved 6→8 and
  the check count 90→92, staling a quoted transcript and mutation-record rows. Round 2
  closed all six ripple items. Notably, the orchestrator's first attempt to re-verify
  T3c deleted the wrong vectors (guessed from the README's list); instrumenting the
  DUT wires showed the **actual** four reachers are `4B800000+B3800000`,
  `4B000000+BDFFFFFF`, `3FFFFFFF+33800000` and `7F7FFFFF+73000000` — deleting exactly
  those (count 84) fires the gate, which is what the record now says. Measure, do not
  guess, even about your own test suite. Chapter 8 CLOSED at 9. Next: chapter 9.
- **2026-08-19** — Chapter 9 research: `research/ch09-two-input-rtl.md`, 7489 words,
  12/12 sections, built-not-read: a seven-module decomposition of the two-input adder
  prototyped in the scratchpad and proven bit-identical to ch08's `fp32_add_alg.v`
  over a 200,092-check sweep (corner library + mixed random), with port tables,
  per-module invariants, and ch11 pipeline cut-point budgets (100/95/73/72 bits).
  13 numbered experiments, 41 compiled files, >2M pair evaluations, a 17-mutant
  campaign (15 killed, 2 measured-equivalent survivors), and masking demos in both
  directions. Five new toolchain findings recorded above; the sharpest are the
  `!=`-vacuous-equivalence-check trap and the measured `always_comb` function-body
  sensitivity, which sharpens ch03's verdict and is flagged for ch13 and F1.
- **2026-08-19** — Chapter 9 written: `chapters/ch09.md`, 9764 words (wc -w), 16
  sections; `src/ch09/` ships the seven-module decomposition (`fp32_unpack`,
  `fp32_screen`, `fp32_swap`, `fp32_align` wrapping ch02's `align_sticky`,
  `fp32_addsub`, `fp32_normalize`, `fp32_round_pack`) plus the `fp32_add2` top and
  six testbenches. Harness 6/6; repo **92/92** cold, orchestrator-verified; nine
  listings byte-identical (re-checked); eight transcripts verbatim (sizer block a
  declared abridgement). Mutations 33/29/4 with the research's masking pair recorded
  as proof both test levels are load-bearing, and the common-mode `lbit` bug shown
  passing the golden-equivalence sweep while the independent shortreal oracle kills
  it 6,890/100,000 — the chapter's reference-independence argument, measured.
  Next: review 1, RTL veteran.
- **2026-08-19** — Chapter 9 review 1 (RTL veteran) — **9/10, fit to ship on the
  first round**, a project first. The reviewer's own 141,936-check three-way sweep
  (own seed, adversarial tie/clamp-boundary families) found zero mismatches between
  `fp32_add2`, `fp32_add_alg` and exact python RNE arithmetic including flags; 24 of
  33 mutation rows reproduced (several byte-identical down to mismatch counts); the
  common-mode `lbit` story reproduced end-to-end with the 6,890/100,000 kill rate
  confirmed against an independent 6.913 % incidence measurement; all survivors'
  reasons verified sound; cut budgets re-summed from the ports. Three nits (the
  chapter's only positional cross-reference, which also mis-resolved; transposed
  mismatch counts in the research notes; ch08's bridge still saying "45-pair" for
  the 46-pair library) plus two optional improvements — all five applied inline by
  the orchestrator: cross-reference re-aimed at the quoted title, notes corrected
  with a dated transposition note, ch08 erratum fixed, the fp32_swap coverage
  contract stated out loud, and tb_short's NaN-class print branch given the same
  5-line cap as its value branch (no listing includes that region — verified).
  Harness 6/6 and full repo 92/92 after all edits; 9 listings byte-identical.
  Chapter 9 CLOSED at 9. Next: chapter 10 research.
- **2026-08-20** — Chapter 10 research: `research/ch10-four-input.md`, 7310 words,
  15/15 sections (cut off at 0/15 by a session limit, checkpoint-committed, resumed
  clean — the protocol's third save). 9 experiments, ~2.7M quadruple evaluations:
  both four-input structures built from real `fp32_add2` instances, proven
  bit-identical to order-faithful references (240k × 2 × 2, zero mismatches,
  `!==`+X-guarded); a 1.2M-quadruple accuracy sweep against an exact single-rounding
  oracle; all ch05-seeded corner families demonstrated on RTL with python-pinned
  expectations; the ch12 reference discipline nailed with the ~1.3 % figure
  reproduced and sharpened to 28-33 % under clustering; a fetch-verified
  fused/augmented-operations survey for ch14. Six new toolchain findings above —
  the headliner: {max, max, −max, −max} returns qNaN, +inf or +0 depending on
  structure AND port order, so port order is part of the arithmetic spec.
- **2026-08-20** — Chapter 10 written: `chapters/ch10.md`, 9534 words (wc -w), 18
  sections; `src/ch10/` ships both four-input structures, `ref_add4.v` (the
  order-faithful round-tripped reference — the chained-reference discipline as a
  shipped module), and three testbenches. Harness 3/3; repo **95/95** cold,
  orchestrator-verified; four listings byte-identical; every research number re-run
  (620,400 validation checks; the 240k×2×2 sweep zero mismatches; 1.2M no-winner
  sweep; 20.46/21.51 % false-oracle; 7.095 % one-directional inexact). Mutation
  record: 18 runs, 16 killed — cross-wired ports killed at census-predicted rates,
  an order-unfaithful reference failing a correct DUT on exactly the 1,369 tree≠seq
  census, a NaN-payload-order mutant visible only to the bit-exact golden chain —
  plus one genuine survivor (D9: ch09's latent `exact_zero` bug survives the whole
  four-input kit; structural proof that the screen mask travels with the module)
  and one recorded false-pass demonstration (X1: the tree-vs-seq cross-check bench
  passes a design with all six shared rounders broken, while `tb_equiv4` kills the
  same mutant 3,152 times — the false-oracle finding made mechanical). Next:
  review 1, IEEE 754 specialist.
- **2026-08-20** — Chapter 10 review 1 (IEEE 754 specialist) — **8.5/10 → 9 after
  the fix round**, in `reviews/ch10-review.md` with a dated post-fix section. The
  reviewer rebuilt the exact single-rounding oracle from scratch (380,576-check
  validation, zero mismatches), reproduced every headline number with its own
  seeds, confirmed the 7.095 % inexact over-report genuinely one-directional via a
  900k-evaluation adversarial hunt plus proof audit, reproduced X1's false pass
  and T1's exact 1,369-=-census identity, verified D9's structural proof against
  the actual screen/mux RTL, and ran a clean 200k three-way sweep. Eight fixes,
  none blocking, all orchestrator-applied and reviewer-verified: the notable one
  was STATE.md's own findings list carrying a "statistically indistinguishable"
  overclaim (win2 gap >13σ — the direction-flips formulation is the true claim);
  plus the N4/N5 payload assertions added to tb_corners4 and mutation-proved
  non-vacuous by BOTH the orchestrator and the reviewer independently. Two
  cosmetic residuals (stale header comment; word-count reconciliation to 9,575)
  closed inline. Chapter 10 CLOSED at 9. Open concern riding to ch12: D9 —
  ch09's latent `exact_zero` bug survives the four-input kit with a structural
  proof; ch12 must resolve or formally accept it. Next: chapter 11 research.
- **2026-08-20** — Chapter 11 research: `research/ch11-pipelining.md`, 8172 words,
  14/14 sections (cut off at 0/14 by a session limit, checkpoint-committed, resumed
  clean — the protocol's fourth save; all numbers re-verified against reruns after
  the gap). 9 experiments, 30 Verilog files, 42 compiled configurations, >1M
  streamed transaction checks: 2-stage and 4-stage `fp32_add2` pipelines cut at
  ch09's priced seams plus a pipelined four-input tree, all proven bit-identical to
  combinational parents under a mutation-tested streaming harness; registered-stage
  discipline measured (skew, blocking banks, three reset strategies, X injection,
  valid bits); throughput/latency/fill/drain counted; a python-parsed VCD latency
  measurement cashing ch04's seed. Four new toolchain findings above — the
  headliner: blocking-in-a-stage-bank is only visible to direct reg-to-reg readers,
  so one wire indirection hid the mutant for 400k transactions.
- **2026-08-20** — Chapter 11 written: `chapters/ch11.md`, 9780 words (wc -w), 16
  sections; `src/ch11/` ships both pipelined fp32_add2 depths, the pipelined
  four-input tree, and six testbenches including the streaming-equivalence
  harnesses at full headline size (101,111 pairs/depth ~10 s; 101,019 quads
  36.7 s; renormalize bins corner=12 random=0 — ch08's unreachability finding
  reconfirmed in the pipe). Writer survived a connection-loss cutoff mid-benches;
  the checkpoint-commit + resume protocol recovered it (fifth save). Harness 8/8;
  repo **103/103** cold, orchestrator-verified. Mutation record 26 runs: 17
  killed/guard-fired, 4 recorded false-pass demonstrations (three held-input foils
  + the `!=`-vacuity reproduction), 3 survivors with structural reasons (the
  wire-indirection blocking mutant both ways — 202,130 streamed transactions of
  measured luck — and the full-datapath-reset mutant witnessed by tb_reset's
  cycle-pinned +inf trap rather than the sweep), 1 measured no-op, 1 control.
  Next: review 1, RTL veteran.
- **2026-08-21** — Chapter 11 review 1 (RTL veteran) — **8/10 → 9 after the fix
  round**, in `reviews/ch11-review.md` with a dated post-fix section. Everything
  load-bearing held under the reviewer's own recompiles: all 26 mutation rows
  reproduced to the unit, the reset +inf trap re-derived from source (e_norm=486),
  the 2,1,2,1 alternation, the 61.4 % X absorption (properly hedged as
  seed-dependent), the verbatim VCD parse, an independent adversarial sweep (seed
  271828) passing both depths with the renorm bin landing on the predicted count,
  and ZERO timing claims crossing the epistemic wall. Ten defects, all small:
  the headline was a shipped testbench comment asserting a stale measured value
  (10 where the shipped stimulus measures 9 — the cardinal defect class, in a
  comment), plus an uncorrected research-note twin, a phantom repro script, an
  undeclared transcript truncation, two positional cross-references, a
  path-dependent byte count, and three hedging nits. All orchestrator-applied,
  all reviewer-verified (including a C2 re-run and a mechanical fence check).
  Word count of record: reviewer's wc -w = 9,829. The review also hit a session
  limit mid-battery (sixth interruption; skeleton checkpoint + resume, finding
  preserved). Chapter 11 CLOSED at 9. Next: chapter 12 research — see the RESUME
  HERE block for the converging spec requirements and the D9 disposition mandate.
- **2026-08-21** — Chapter 12 research: `research/ch12-complete-adder.md`, 9148
  words, 14/14 sections — the convergence pass. D9 settled by inverting the
  mandate's premise with evidence (see the new toolchain findings block): formal
  acceptance + white-box witness, the function proven equal to spec and the
  proof attacked with 2,000,320 targeted vectors. The full specification drafted
  with every clause measured; the coverage model extended to 105 bins with a
  bin-pinning guard that was itself debugged by mutation (two initially-surviving
  bin mutations, both killed after fixing the library); the complete design
  prototyped and proven three ways; regression economics measured, surfacing a
  timing-drift hazard (ch11's tb_stream4 at 56 s vs its recorded 36.7 s — F2
  must raise SIM_TIMEOUT). Next: chapter 12 write.
- **2026-08-21** — Chapter 12 written — the payoff chapter: `chapters/ch12.md`,
  11,150 words (wc -w), 19 sections, the S1-S10 specification with every clause
  citation-backed and session-measured; `src/ch12/` ships `fp32_add4` (pipelined
  tree, latency 4, assembled by instantiating shipped ../chNN modules), five
  testbenches (golden, streaming at 60k quads, taxonomy corner suite, 105-bin
  coverage with the bin-pinning guard, and the D9 white-box witness), plus a
  deliberate README-documented artifact-rule extension: four .py generator/model
  sources with five byte-stable generated .vh libraries (harness section updated;
  F2 must allow .py/.vh under ch12 only). Harness 5/5 (76 s); repo **108/108**
  cold under SIM_TIMEOUT=120, orchestrator-verified. Re-run this session: the
  101k headline runs, the 2,000,320-vector D9 adversarial diff (0 divergence),
  the 4.0M-replay python oracle re-verification, the CR census, the full
  route-a1/a2 evidence battery. Mutation record 23 runs [**corrected 2026-08-21 by F3
  to 24 runs, 20 killed/guard-fired.** `src/ch12/README.md` recounts it explicitly —
  6 design-mutant + 15 bench/library/coverage-model + 2 closure demonstrations = 24 —
  and an independent re-count of its tables agrees. This line was never updated after
  the `mx1` fix, the same fix that staled the DM4 count F2 found]: 19 killed/guard-fired,
  2 REQUIRED survivals (B-M2 vs tb_corners12 and vs tb_add4_stream, exactly as
  the five-step acceptance proof demands, while tb_d9wit kills it 27× and the
  coverage never-bin 38×), 2 required-FAIL closure demonstrations (ALL_POSITIVE
  91/105 with 14 named holes; random-only 98/105 with 7), bin-pinning battery
  m1-m9 at 9/9 against the fixed directed library. Writer survived a
  session-limit cutoff mid-battery (seventh save). Next: review 1, RTL veteran.
- **2026-08-21** — Chapter 12 review 1 (RTL veteran) — **8/10 → 9 after the fix
  round**, in `reviews/ch12-review.md` with a dated post-fix section. All ten
  spec clauses reproduced under the reviewer's own measurements (port census
  hand-derived, signed zeros exhausted, NaN priority measured, underflow
  re-proven on 300k pairs, accuracy pricing at 200k/regime under BOTH window
  constructions); the D9 five-step proof checked line-by-line against the RTL
  plus an independent 604,096-vector diff (zero divergence) and all four D9
  record rows byte-for-byte; the flagship drift-free vs ch11 and clean on 724k
  reviewer-seed vectors against an independent from-spec model; the .vh
  libraries byte-stable; both closure demos hole-for-hole. Two real defects:
  the straddle-discipline claim falsified by an unstraddled d≤2/d≤3 boundary
  (fixed with a d=3 directed quad — 57→58, pins regenerated, the count guard
  caught the library change first, the mutant now dies on two pins, recorded
  as m10; the reviewer's two further never-tried boundary attacks also die
  post-fix), and the 7.095 % inexact figure quoted without its win2
  conditioning (restored with ch10's full table; full-range re-measured 0.000 %).
  Plus construction/arithmetic/wording nits, all closed. Final word count of
  record 11,406 (reviewer's wc -w). Chapter 12 CLOSED at 9. The guide's core
  deliverable — a specified, proven, pipelined four-input IEEE 754 adder with a
  falsifiable verification kit — is shipped. Next: chapter 13 research.
- **2026-08-21** — Chapter 13 research: `research/ch13-systemverilog.md`, ~8.0k
  words, 11/11 + appendix. 66 compile-and-run probes + four measured rewrites of
  shipped modules, all proven equivalent to their originals (packed-struct
  fields 1,003,072 vectors; always_comb normalize 500,420; interface-bundle pipe
  52,541 streamed; queue scoreboard 52,570 with both DUT mutants killed). The
  ~40-row construct × -g matrix with verbatim diagnostics maps Icarus 13.0's
  real SV subset. Five sharpenings of ch03/ch05/ch09 claims propagated with
  dated notes (their files + STATE): the headliners are `always_comb`'s SECOND
  measured difference (time-zero self-start — ch03's trap has an in-simulator
  fix) and `-gno-assertions` deleting even immediate assertions. Next: ch13
  write, then Pedagogy-expert review.
- **2026-08-21** — Chapter 13 written: `chapters/ch13.md`, 10,921 words, 14 sections,
  no placeholders; `src/ch13/` with 19 `.sv` files, `targets.txt` and a 7-section
  `README.md`. **Convention extension: `src/ch13/` holds `.sv` files** (SystemVerilog
  by intent; measured that Icarus does NOT gate the language on the extension, only
  on `-g`). **The F2 artifact check must allow `.sv` under `ch13/`**, alongside the
  ch12 `.py`/`.vh` allowance. Chapter 5's two SV xfail targets stay named `.v`.
  Harness: **13 new targets — 5 `run`, 3 `warn`, 5 `xfail`** — all green
  (`bash run_all.sh ch13` 13/13, ~34 s); **full repo now 121/121** at
  `SIM_TIMEOUT=120`, EXIT=0.
  Four rewrites of shipped modules, each compiled beside its original and swept
  in-harness: packed-struct `fp32_fields` (1,003,072 vectors bit-identical, and
  203,072 more for the `always_comb` form); `always_comb`+`logic` `fp32_normalize`
  (250,420 bit-identical — resized down from the research's 500,420, which measured
  32.3 s here against the notes' 20.5 s, per ch12's timing-drift rule); interface
  bundles on the real `fp32_add2_p2` (52,541 retired results identical every cycle);
  queue scoreboard (52,570 pairs, max depth 3 = measured latency + 1).
  New teaching targets beyond the research plan: `tb_selfstart.sv` pins ch03's
  `@(*)` no-self-start trap against `always_comb`'s time-zero execution as a
  self-checking `run` row; `tb_assert_live.sv` makes "`-gno-assertions` deletes
  immediate assertions" a colour change rather than a remembered fact; five NEW
  xfails (`bad_if_port`, `bad_enum_cast`, `bad_assoc`, `bad_qstruct`,
  `bad_comb_delay`) — ch05's `bad_sva.v`/`bad_covergroup.v` cross-referenced, not
  duplicated.
  **Mutation record 28 runs: 24 killed, 4 survivors**, each survivor a named limit
  (out-of-contract `e_big=0`; the interface bench's two DUTs being one module; the
  queue bench sharing stage modules with its oracle; `unique` deleted survives the
  testbench but is killed by the `warn` classification, 165-byte log → 0).
  **Corrections to the research notes, all re-measured:** the ten always_comb
  sorries include NO loop-variable one (6 `sum27`, 3 `framel`, 1 `shl8`; the
  `+i[31:0]` sorry belongs to the notes' p57 probe, whose function is
  non-`automatic`); "first post-seed draw" needed disambiguating (`$urandom(seed)`
  returns `00010e00`, the near-linear value; `1c598438` is the NEXT call);
  the interface-port second diagnostic is reported against line 1; five of six
  struct-decode sorries carry a mangled `:0:`. NEW finding not in the notes: a
  cast's result cannot take a method (`fclass_e'(code).name()` is a syntax error).
  Icarus docs "Command Line Flags" re-fetched this session (HTTP 200, both quoted
  phrases present). `which verilator` still empty — stated plainly in the chapter.
  Next: chapter 13 review, persona **Pedagogy expert** per rotation.
- **2026-08-21** — Chapter 13 written: `chapters/ch13.md`, 10,921 words (wc -w),
  14 sections; `src/ch13/` ships 20 `.sv` files across 14 targets (5 run, 3 warn,
  6 xfail) — a documented convention extension now recorded in the harness
  section (F2 must allow `.sv` under `ch13/`). The four SV rewrites are
  equivalence-proven in-harness against their shipped originals (1,003,072 /
  250,420 vectors bit-identical; 52,541 streamed results; 52,570 queue pairs,
  max depth 3). Harness 14/14; repo **122/122** cold, orchestrator-verified.
  **Orchestrator caught and fixed one real defect before commit:** the chapter's
  covergroup listing had NO shipped file and its quoted transcript compiled a
  file that did not exist — `cg_cov4.sv` is now shipped as a 6th xfail target
  (built so the covergroup keyword lands on the quoted line 16), the transcript
  re-captured from the real 30-line output ending `I give up.` with its
  abridgement declared, and the chapter's `-g2005` claim corrected to the
  measured `Invalid module instantiation` (it does NOT die earlier on function
  syntax for this file). All 13 listings now byte-identical. Mutation record
  28 runs: 24 killed, 4 survivors each a named limit. Five research claims were
  corrected by the writer's re-measurement (README §7). Next: review 1,
  Pedagogy expert.
- **2026-08-21** — Chapter 13 review 1 (Pedagogy expert) — **7/10 → 9 after the
  fix round**, in `reviews/ch13-review.md` with a dated post-fix section. The
  reviewer called the engineering the strongest in the guide: 14/14 and 122/122
  cold, all four SV rewrites independently re-verified with its own sweeps
  (300,000 packed-struct and 300,424 normalize vectors, `!==` + X-guards, zero
  mismatches), ~45 of 52 matrix rows re-probed with byte-identical diagnostics,
  all nine of its designed mutations killed, and the queue scoreboard's headline
  property demonstrated by deepening the DUT to latency 3 — the queue bench
  passes UNEDITED at max depth 4 while ch11's LAT-based harness goes red on the
  same correct design (now a README reproduction block). Five blocking defects,
  all prose: stale target/regression counts (introduced by the orchestrator's own
  cg_cov4 fix — owned, not quietly corrected), a FABRICATED chapter-5 quotation
  used to stage a correction of a position ch05 never held, a `priority case`
  sorry claim that does not reproduce, an S4 survivor claim true only for
  simultaneous two-site deletion (single-site measured surviving at 80 bytes),
  and four overclaiming phrases in the covergroup climax. All fixed; the reviewer
  then found three copy-edit slips the fix pass itself introduced (doubled or
  dangling clauses) — swept, plus nit 14b completed. One optional code change
  (splitting the unique-case target for per-site pinning) was DECLINED with
  reason and the decline accepted by the reviewer: the property is authorial
  intent, not design correctness, and the hole is documented twice. Word count
  of record 11,373, reconciled across three methods after a discrepancy.
  Chapter 13 CLOSED at 9. Next: chapter 14 — the last chapter.
- **2026-08-21** — Chapter 14 research: `research/ch14-frontier.md`, ~20.9k words,
  12/12 + appendix — deliberately long because the annotated bibliography is the
  deliverable and the reviewer is a citation checker. **92 URL fetch attempts,
  all outcomes recorded** (77×200, 9×403, 2 TLS failures, 1×404, 1×418, 2×202),
  including a full re-fetch of all 33 URLs chapters 1-13 ship: **31 resolve and
  zero are dead.** Content: Mikaitis's four-class single-rounding taxonomy with
  the ~280-bit binary32 accumulator width derived here and cross-checked against
  Uguen & de Dinechin's published table; IEEE 754-2019 clause 9.5 augmented
  operations and the roundTiesToZero rationale; format census models in python3
  that reproduce ch05's E4M3 numbers and the posit standard's own Table 1;
  tensor-core accumulation from Fasi et al.; the per-format change list; the
  61+25-source annotated bibliography; and an honestly hedged "measured here"
  list. Six findings recorded above under toolchain findings — the three that
  matter most for F3 are that **HTTP 200 does not mean a citation resolves**
  (three sources 200 to a search page or cookie wall), that **the two fetch
  paths disagree in both directions** (so single-tool checking yields false
  failures), and that the shipped RTL has **zero parameters**, falsifying ch05's
  forward promise — now corrected in ch05 with a dated callout stating what
  chapter 12 did instead and what it costs.
- **2026-08-21** — Chapter 14 written — the guide's last chapter:
  `chapters/ch14.md`, 18,509 words (10,832 body + 7,983 annotated bibliography
  of 86 entries), 16/16 sections. The writer flagged the overrun honestly:
  three compression passes took it 23.0k→18.5k and it stopped rather than strip
  annotations or the ~40 verbatim quotations. **Code decision, made explicitly:**
  ship ONE target and no new RTL — `tb_mono4.v`, because the fetched literature
  (Fasi et al.; Mikaitis) poses a specific question about n≥4 multi-term adders
  going non-monotonic without intermediate normalisation, and this guide owns an
  n=4 adder that normalises every intermediate, so one testbench over ch10's
  tree converted the chapter's only inference into a measurement (396,225
  one-ulp increases, 0 non-monotonic; 9 mutants, 9 kills; 3 required failures
  observed). Honest headline stated in chapter and README: **8 of the 9 mutants
  were killed by the pinned directed vectors, not by monotonicity.** The three
  python format-census models stay in the text labelled illustrative and ship
  nothing. Repo **123/123** cold, orchestrator-verified; both listings
  byte-identical; artifact check clean. **97 URLs re-fetched today** (79×200,
  9×403, 4×202, 1×418, 1×429, 1×404, 2 TLS resets); all 33 chapter 1-13 URLs
  re-verified a second independent time — **zero dead**. Three status changes
  since the research pass, all recorded: a third "200 is not resolution"
  mechanism (posithub bot interstitial serving text/html for a PDF), a
  transient 429 on Wikipedia, and NVIDIA's E4M3 passage found PRESENT at the
  current URL, correcting the research pass (both observations written down;
  citation still pins the 2.3.0 URL). Next: review 1, Citation checker — the
  last chapter review.
- **2026-08-21** — Chapter 14 review 1 (Citation checker) — **8/10 → 9 after the
  fix round**. The reviewer re-fetched all 88 URLs with status + content-type +
  effective URL + saved bodies, cross-checked disputed ones through a second
  path, and substring-tested 73 quoted strings: **50 exact, 16 exact after
  PDF-artifact normalisation, 1 correctly-marked elision, 6 with an added
  terminal period, ZERO fabricated** — and found no invented URL, no unresolved
  DOI, and no entry resolving to something other than what it claims. Two
  blocking defects: (1) the mutation table recorded M1 (inverted result sign
  bit) at **0 order violations and "perfectly monotonic"** when it provably
  reverses order — re-run by both reviewer and orchestrator at **11,744 errors**
  with the census showing `0 strictly up`; M2 likewise at 29. The headline is
  now **six of nine** caught only by directed vectors, and the README records
  the failure as a breach of the project's own rule that a mutation row is a
  measurement. (2) A **paraphrase presented as a quotation** of ch05 — caused by
  the orchestrator's own earlier edit to ch05, which silently falsified ch14's
  already-written quotation of it. Both fixed and re-verified; seven further
  defects and eight nits swept. **Chapter 14 CLOSED at 9. All fourteen chapters
  are closed.** Next: F1.
- **2026-08-21** — **F1, the assembly pass — DONE.** `guide/guide.md` exists:
  173,116 words (`wc -w`, this shell's POSIX locale), 15 `#` headings (guide
  title + 14 chapters), 225 `##` sections (9 front matter + the 216 chapter
  sections), 399 fenced blocks, a generated two-level table of contents of 224
  section links. Built by `guide/assemble.py` from `guide/front-matter.md` +
  `chapters/ch01..ch14.md`; **the merge is a script and is re-runnable** — it
  drops the `<!-- sections complete: N/N -->` build markers, substitutes the
  generated TOC for the `<!-- TOC -->` placeholder, and copies chapter bodies
  byte for byte. Nothing is reflowed. Verified after assembly: all 14 chapter
  bodies are byte-exact substrings of `guide.md` in order, and all **396**
  chapter fenced blocks appear in it byte-identically, in order. Word count
  reconciles exactly: 168,602 (chapters) + 2,938 (front matter) − 77 (build
  markers) − 3 (`<!-- TOC -->`) + 1,656 (generated TOC) = **173,116**. The new
  writing is the front matter: **2,933 words** of introduction (what the guide
  is, who for, what it builds, the three method rules, the chapter map, how to
  run the code including the Icarus 13.0 requirement and `SIM_TIMEOUT=120`, the
  conventions, and an explicit scope-and-limits section). Slightly over the
  1,500-2,500 target and left there: every one of the brief's required topics is
  present and trimming further would have cut required content.
  - **Obligation 1, quotation integrity — done, and it found real defects.**
    `audit.py` went 8 BROKEN / 10 SUSPECT-title / 12 SUSPECT-quote → **4 / 8 /
    7**, and every remaining flag is an adjudicated heuristic artifact (a
    chapter quoting its own section title; a nested-quote heading the regex
    cannot parse; an external paper quoted near a "chapter N" mention). Eight
    quotations attributed to another chapter were **not literal substrings of
    it** — the exact ch14 failure mode, found seven more times: ch09 quoting a
    ch07 "promise" that ch07 never wrote; ch09's `"latch = remembers the
    previous vector"` and `"documentation value only"`, neither in ch03; ch11's
    `"Icarus alternates same-edge process ordering…"` against ch03's actual
    "alternates the order between time steps inside a single run"; ch13's
    `"the threshold is -g2005-sv…"` against ch05's actual sentence; ch13's
    `"defined-looking wrong value"` (×2) against ch09's "wrong answer"; ch08's
    `"reference more accurate than the DUT"` against ch05's "more accurate than
    the specification"; ch06/ch07 quoting a ch08 "alignment question" ch08 never
    phrases. All fixed by quoting the source verbatim or dropping the quote
    marks. Three house-convention fixes: ch08, ch11 (×2) quoted another
    chapter's section title without naming the chapter. Audit re-run after every
    edit; final state recorded above.
  - **Obligation 2, positional cross-references — all 17 resolved.** None
    crossed a chapter boundary (checked by script: enclosing section and its
    neighbours computed for every hit), so none was *broken* by the merge; all
    17 were nonetheless converted to named section titles, because "the next
    section" is a weaker reference in a 173k-word single document and because
    the next section move would break them silently. ch01 ×2, ch02 ×5, ch03 ×1,
    ch08 ×5, ch12 ×4.
  - **Obligation 3, the parked ch03/ch04 question — DECIDED: the material
    STAYS IN CHAPTER 3.** Recorded in full below.
  - **Obligation 4, consistency sweep — done.** `this book` → `this guide`
    everywhere in prose (27 replacements, ch01/02/04/05/08), fence-aware so the
    one occurrence inside a listing (`src/ch04/tb_anatomy.v` line 4) is
    untouched — the source tree is frozen and the listing must stay byte-exact.
    ch14's heading normalised to the house `# Chapter N — Title` form. Checked
    and found already consistent, no edit needed: the epistemic wall (ch03/ch04
    build it, ch11 names it "Timing, Fmax, and the Epistemic Wall", ch08/09/12/
    13/14 cite it by that name); format capitalisation (`binary32`, `bfloat16`,
    `E4M3` — the only capitalised variants are sentence-initial or inside cited
    work titles, correctly); the `.py`/`.vh` (ch12) and `.sv` (ch13) artifact-rule
    extensions. The `[title-only]` convention *does* diverge in form — ch01-06
    split their source lists under headings, ch07+ tag entries inline — but both
    state the same rule and neither is wrong, so rather than churn six reviewed
    chapters the introduction's "Conventions" section documents both notations
    and says they mean the same thing.
  - **Obligation 5, the unkept parameterisation promise — clear.** `EXP_W`/
    `MANT_W` appear in exactly three places: ch02 (a generic parameter-syntax
    example, unrelated), ch05:489 (the plan, immediately followed by its dated
    "What chapter 12 actually did" correction), and ch14 (which quotes ch05
    accurately — verified as a literal substring — and prices the cost). **No
    chapter states the promise as fact.**
  - Also verified against ch13's newer measurement: ch03's `always_comb` wording
    ("a reader working only in Icarus gets the documentation and none of the
    enforcement", plus the no-latch-warning claims) is still true — ch13's
    time-zero self-start finding *extends* it and quotes ch03's section title
    correctly. No ch03 edit needed.
  - Not touched, per the brief: `guide/src/` (frozen for F2), the review and
    research files. Nothing committed.

## F1's ch03/ch04 decision, recorded 2026-08-21

**Question (parked since the ch03 fix round):** chapter 3's section "Simulation
Artifacts That Will Cost You an Evening" (1,357 words by `wc -w`) is largely
testbench material and arguably belongs in chapter 4. A ch03 fix round refused
to move it while ch04 was unwritten. Both now exist.

**Decision: it stays in chapter 3.** Five reasons, in order of weight.

1. **The artifact rule forbids the move.** All six listings in that section —
   `bad_clkinit.v`, `bad_tbedge.v`, `tb_xprop.v`, `bad_combdelay.v`,
   `bad_multidrive.v`, `bad_zerodelay.v` — are targets in `src/ch03/targets.txt`
   and live in `src/ch03/`. Moving the prose without moving the files breaks the
   chapter↔directory correspondence the guide asserts in every chapter's
   Sources section; moving the files means editing frozen source directories and
   two manifests, which F1 is explicitly barred from doing and F2 is about to
   verify. This alone settles it.
2. **Only half of it is testbench material anyway.** The clock that never
   starts, stimulus on the wrong edge and printing the wrong value are testbench
   failures; `#` inside a combinational block, two `always` blocks writing one
   variable, and the zero-delay `always` compile error are RTL-design traps
   squarely inside chapter 3's remit (always blocks, blocking vs non-blocking,
   beginner traps). Splitting the section would separate six items that are
   taught as one recognisable family: *the simulator doing something correct
   that you did not ask for*.
3. **It is load-bearing where it sits.** The section leans on ch03's own
   "How a Simulator Actually Runs Your Code" (the region measurements from
   `tb_regions.v`) and on the block-ordering alternation measured earlier in the
   chapter; it carries chapter 3's only `xfail` target; and its `x`-contagion
   passage sets up chapter 9's sticky bit. In chapter 4 those would all become
   backward references.
4. **Chapter 4 has no room.** ch04 shipped at 9,880 words against a stated 10k
   ceiling; +1,357 words puts it 12 % over, in the one chapter whose reviews
   ran to the maximum three fix rounds.
5. **The chapter already handles the tension explicitly**, in the section's own
   second sentence: "The first four are testbench failures rather than RTL
   failures, and chapter 4 is where testbenches become the subject; they are
   here because you will hit them before you get there." That is the right
   pedagogical answer, it is already on the page, and chapter 4 cashes it
   ("Chapter 4 turns that from a warning into a testbench structure").

No cross-reference change was required by this decision. It is final; F2 and F3
should treat the question as closed.

### F1's adjudication of the 19 flags `audit.py` still reports (2026-08-21)

Final state: 4 BROKEN / 8 SUSPECT-title / 7 SUSPECT-quote, down from 8 / 10 / 12.
Every one is a known heuristic artifact of the script, not a defect. The script
attributes a quoted string to the last "chapter N" in the preceding 120
characters, which is very often a *different* reference in the same sentence,
and its `looks_like_title` test cannot tell a section title from a scare-quote.

**BROKEN (4)** — all four resolve; the heuristic mistook them for headings
because the preceding text ends in "chapter N's".
| flag | verdict |
|---|---|
| ch12 `"rides through unchanged"` | literal substring of ch11 ("One debt rides through unchanged"); correct. |
| ch12 `"Directed, the tree wins"` | literal substring of ch10:222; correct (F1 fixed its capitalisation). |
| ch12 `"'Both Orders Agree' Is Not an Oracle"` | a real ch10 `##` heading; the nested single quotes defeat the regex. |
| ch13 `"defined-looking wrong answer"` | literal substring of ch09 (F1's fix; it read "…wrong value" before). |

**SUSPECT title refs (8)** — six are a chapter quoting **its own** section title
(ch01 ×2, ch07 ×3, ch08, ch12, ch13); the "wrong" chapter number is a nearby
*other* reference, or in ch13's case a cited book's chapter 8. All correct.

**SUSPECT prose quotations (7)**
| flag | verdict |
|---|---|
| ch05 `"an adder that seems to work"` | rhetorical foil, not a quotation of ch12. |
| ch09 `"don't care under screen"` | ch09's own coinage; the ch11 in context is a different reference. |
| ch10 `"the two orders agreed"` | rhetorical foil, not a quotation of ch12. |
| ch14 Kim & Kim, posit paper, tensor-core paper (3) | quotations of **external** sources, attributed on the spot; the nearby "chapter N" is a different reference. |
| ch14 `"So the plan this argument recommends…"` | correctly attributed **to chapter 5** in the sentence and verified a literal substring of ch05:489; the regex latched onto the nearer "chapter 12". |

Verified by a second, tighter attributed-quote script (`chapter N['s] … "quote"`
within 60 characters, exact-substring or owned-title test): 18 hits before F1's
edits, **9 after**, and those 9 are the same artifacts listed above.
- **2026-08-21** — F2 final smoke test: **PASS**, report at `reviews/F2-smoke-test.md`
  (15/15 sections, ~9,900 words). Green cold at **123/123 in 216.3 s**, reproduced
  identically, and green again at the reader's default `SIM_TIMEOUT=60`. The agent
  proved determinism harder than the harness does — capturing every target's full
  stdout across two instrumented passes, **0 of 123 differed byte-for-byte** — and
  audited the harness before trusting it: a warning-emitting module under `run`
  fails, a silent module under `warn` fails, a compiling module under `xfail`
  fails, a `warn` row still runs the simulation gate, an exit-0 testbench printing
  `FAIL` fails, and a hang is killed and reported. Ten contract cases, ten hold.
  **One defect, found and fixed:** the transcript `exact_zero fired on an effective
  add 38 times` (quoted in `src/ch12/README.md` DM4, `chapters/ch12.md` and
  `guide.md`) actually produces **39** on the shipped kit. F2 root-caused it to the
  orchestrator's own ch12 `mx1` fix, which grew the directed coverage library from
  57 to 58 quads — the DM4 row was never re-run after the library grew. Reproduced
  independently here (39, stable), corrected at all three sites, guide re-assembled.
  **This is the third instance of one hazard**: a fix that changes a count
  invalidates every place that count is quoted. It is now the project's most
  frequently recurring defect class and F3 should say so.
  Also recorded: three unexploited harness weaknesses (an `xfail` row naming a
  missing file passes; a chapter with no `targets.txt` is silently skipped with no
  expected-total assertion; a `run` row with no testbench passes silently), and two
  genuine flake risks at the default timeout — `ch11/tb_stream4` at 49.1 s and
  `ch10/tb_equiv4` at 46.5 s under 4x load (82 % and 77 % of 60 s). The front
  matter's timing guidance was widened from "chapters 11 and 12" to include
  chapter 10, with both measured figures.
- **2026-08-21** — **F3, the final report — DONE.** `guide/FINAL-REPORT.md`, 11,656 words,
  9/9 sections, written under the incremental write protocol. **The project is complete:
  all fourteen chapters closed, F1 assembled, F2 passed, F3 reported.**
  - **Re-measured, not cited.** Full regression re-run cold **twice**: 123/123, exit 0,
    second run 216 s (F2 measured 216.3 s). `python3 assemble.py` re-run → `guide.md`
    byte-identical (SHA-256 unchanged). All 14 chapter bodies confirmed byte-exact
    substrings of `guide.md`, in order. 217 files under `src/`, artifact rule clean,
    `.py`/`.vh` confined to `ch12/` and `.sv` to `ch13/`, `git status guide/` clean.
    Manifest arithmetic 102 run + 10 warn + 11 xfail = 123. Structure re-counted
    fence-aware: 15 H1 / 225 H2 / 399 fenced blocks / 224 TOC links — F1's figures all
    confirmed (the 399th is a three-space-indented fence in ch11 that an unindented
    `grep` misses). ch14's bibliography re-counted: **87 entries, 1-87, no gaps.**
    `ch10/tb_equiv4` 37.4 s and `ch11/tb_stream4` 39.9 s idle (62 %/67 % of the 60 s
    default). 12-URL content-aware citation spot check: 12/12 as recorded, including the
    `sunburst-design.com` → paradigm-works search-page redirect and
    `digitalsignallabs.com`'s TLS reset with no status.
  - **WORD COUNT OF RECORD CORRECTED — read this before quoting any word count.**
    `guide.md` is **176,154 words** (`LC_ALL=C.utf8 wc -w`, and Python `str.split()`
    agrees exactly). The 173,116/173,152 figure this project has quoted since F1 is
    `wc -w` in the **POSIX locale**, which does not count a token made entirely of
    non-ASCII bytes; the guide contains exactly 3,002 such standalone tokens (2,491 em
    dashes, plus `−→×≥│≤≈≠…`). Both describe the same bytes. The arithmetic reconciles
    exactly either way: 171,536 + 3,027 − 77 − 3 + 1,656 = 176,154. **This is the root
    cause of every "different tokenizer" word-count reconciliation in this project
    (ch06, ch10, ch13) — always state the locale.** The per-chapter figures in the
    checklist table above mix the two methods and predate F1's edits; the chapter-file
    total reconciles exactly, so nothing is missing. `FINAL-REPORT.md` §2 carries both
    counts per chapter, measured 2026-08-21.
  - **One record defect found and corrected:** ch12's mutation ledger, recorded here as
    23 runs, is **24** in `src/ch12/README.md`, which recounts it explicitly. Corrected
    in place above. It is the **sixth** instance of the class-A hazard and comes from the
    same `mx1` fix as F2's DM4 count — proof of how hard that class is to suppress.
  - **The report's analysis.** Seven defect classes with named instances, ranked. Class B
    (a claim stronger than its measurement) is the most **frequent** — present in all 23
    review passes. Class A (a fix that changes a count invalidates every place the count
    is quoted) is the most **persistent** — six instances, the last two found by F2 and
    F3 long after the class was named here. Class C (editing a chapter silently falsifies
    another chapter's quotation) — eight instances, seven found by one ~15-line script.
    Added: class D (a test that cannot fail — the reason for mutation testing, ~12
    instances), class E (an error in the research notes re-seeds itself downstream, 5),
    class F (the fix round introduces the next defect, 4), class G (ASCII diagrams are
    netlists, 3 of 13 wrong on first draft). **Six of seven were caught by an independent
    re-run; the seventh by a script. None by reading carefully.**
  - **Process accounting.** 66 commits over 13 days; 335,570 words of unshipped working
    record (reviews 170,292 / research 145,434 / STATE 19,844) against 176,154 shipped —
    1.9× more process than product. Nine interruptions accounted for individually (two
    pre-protocol connection deaths that lost everything, seven numbered protocol saves
    that lost nothing) plus 16 checkpoint commits; a figure of exactly ten is not
    reconstructible from this log and the report says nine, with the accounting. Highest
    yield per unit cost: mutation testing, independent re-derivation, the ~15-line
    quotation script, the warning-gated harness. Most expensive per defect found:
    chapter 4's third fix round (zero marginal mutation yield) and the persona rotation
    (one attributable catch in fourteen — but a large one).
  - **Open concerns are unchanged and all documented** in `FINAL-REPORT.md` §5: harness
    weaknesses H1/H2/H3 (H2 — no expected-total assertion — is the one worth fixing, one
    line), the two flake-risk targets, the D9 formal acceptance, the unparameterised
    design, the `[title-only]` form split (60 inline tags, all in ch07-14, zero in
    ch01-06 — verified), chapter 4's `counter4`, and F2's two unfixed nits N1 and N3.
