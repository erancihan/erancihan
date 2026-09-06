# A Verilog Guide: Building a Four-Input IEEE 754 Floating Point Adder

<!-- front matter sections complete: 8/8 -->

## What This Guide Is

This is a single-subject Verilog guide. It starts at the transistor's shadow — gates, boolean algebra, propagation delay — and ends with a complete, specified, pipelined, four-input IEEE 754 binary32 floating point adder, together with the verification kit that establishes it does what its specification says. Fourteen chapters, about 173,000 words, and 123 build targets that a reader can run.

The subject is narrow on purpose. There are many good general Verilog books, and this one does not compete with them; it takes one hard arithmetic problem and follows it all the way down, because that is where the parts of the language that matter — width rules, sticky bits, non-blocking assignment, pipeline registers, coverage, mutation testing — stop being style advice and start being the difference between a right answer and a wrong one that looks right.

The other thing that makes it unusual is epistemic. Every behavioural claim about the simulator here was produced by compiling and running something; every worked floating point example was recomputed in `python3` before it was written down; and where a claim could not be measured in this environment — synthesis area, clock frequency, the interior of a waveform viewer — it is flagged in place as documentation rather than measurement. That discipline cost the guide claims it would have liked to make. It is the reason to trust the ones that survived.

## Who It Is For

The intended reader is a working programmer or engineer who can read code, is comfortable with binary and hexadecimal, and has never described hardware. No prior Verilog is assumed — chapter 2 starts from `module` — and no prior digital logic is assumed either, though a reader who already knows what a mux and a flip-flop are can skim chapter 1 and take only the two things it seeds: the combinational toolbox the adder is built out of, and the timing inequality chapter 11 cashes. Floating point background helps but is not required; chapters 6 and 7 build binary32 from nothing.

What the guide does assume is a willingness to run the code. The chapters are written to be read next to a terminal, and a reader who breaks the designs deliberately, as the closing checklists invite, will learn considerably more than one who does not — most of the guide's hardest-won lessons came from exactly that.

## What It Builds

The deliverable is `fp32_add4`: a four-input IEEE 754 binary32 adder, written in synthesisable Verilog-2001-style RTL, pipelined to a latency of four cycles with one quadruple per cycle of throughput, and specified in writing before a line of its RTL appears.

It is assembled rather than invented. Chapter 8 derives the ten-step addition algorithm and proves a 28-bit significand datapath budget. Chapter 9 splits that algorithm into seven modules — unpack, screen, swap, align, add/sub, normalize, round-and-pack — and proves the split bit-identical to the monolithic version. Chapter 10 composes two-input adders into four-input structures and measures what association order costs. Chapter 11 cuts the combinational tree into register banks. Chapter 12 writes the specification, assembles the flagship, and verifies it. By the time the flagship module appears it contributes **zero new arithmetic lines**; it is instantiation and one flag delay line, which is what a finished design process is supposed to look like.

The specification is the guide's centre of gravity, and three of its clauses set the tone. The association `(a+b)+(c+d)` and the port-to-operand mapping are *normative*: the multiset {+max, +max, −max, −max} returns a qNaN with three flags delivered as `(max, max, −max, −max)`, and +0 with no flags interleaved, so an implementation that permutes ports implements a different function. Rounding is roundTiesToEven applied **three times**, once per internal addition — deliberately not the correctly rounded four-input sum, and the specification prices the difference rather than hiding it. The `underflow` flag is omitted with a proof that a binary32 adder can never raise it, not with a shrug.

## The Method: Measure It or Do Not Claim It

Three rules governed every chapter, and they are worth stating before you start because they explain the shape of what follows.

**Measure it or do not claim it.** Every statement of the form "Icarus does X" here is a compile-and-run result, and every floating point number was recomputed in `python3` first. The rule was expensive in a way that turned out to be the point: it repeatedly falsified things the guide's own notes believed. An invariant claiming that massive cancellation kills the guard, round and sticky bits alike died to a million-pair sweep that found the guard bit still live. A mutation row asserting zero order violations, for a mutant that provably reverses order, became 11,744 errors when it was actually re-run. The folklore that adder trees are more accurate than sequential chains died under a 1.2-million-quadruple sweep. Where a claim cannot be measured here, it says so on the spot.

**Every listing compiles.** Each Verilog listing first existed as a real file under `guides/four-input-fp-adder/src/chNN/`, compiled clean under `iverilog -g2012 -Wall`, and passed its testbench; every block of simulator output is real captured stdout. A per-chapter `targets.txt` manifest says what each target must do — `run` (compile with *zero* compiler output and simulate without failing), `warn` (compile successfully but *with* a diagnostic, for deliberate warning demonstrations whose text a chapter quotes), `xfail` (must fail to compile, for deliberate teaching mistakes) — and one script rebuilds all of them from scratch.

**Every testbench must be shown able to fail.** This rule was adopted mid-guide, after a review found a shipped testbench printing `PASS tb_dump (latency 2, …)` against a design rebuilt with a single flip-flop: it narrated a property it never checked, in the chapter that teaches testbench writing. From then on each testbench had to answer *what would have to break for this to print FAIL?* — and answer by mutation: copy the design, break it several distinct ways, confirm the test fails on each, record the mutations in the chapter directory's `README.md`. Hundreds were run. Survivors are written down too, because a survivor measures the suite's reach. The discipline was eventually turned on the coverage model itself, which was broken ten ways and caught ten times.

A fourth habit follows from the three: **write the weaker true statement.** Where a strong claim and a weak one were both consistent with the evidence, the chapters take the weak one. That is why some passages read as anticlimactic — they are as strong as the measurements allow, and no stronger.

## How to Read This Guide

The chapters are cumulative and are meant to be read in order; each one is built on measurements the previous ones made, and the cross-references are dense enough that skipping leaves holes. The map:

- **Chapter 1 — Digital Logic Foundations.** Gates, minimisation, the combinational toolbox, propagation delay, the clock. No code of its own; it seeds the toolbox and the timing inequality.
- **Chapter 2 — The Verilog Language.** Modules, ports, nets and variables, operators, and the width and signedness rules that break arithmetic silently.
- **Chapter 3 — Combinational and Sequential Logic.** `always` blocks, blocking versus non-blocking derived from the event queue, sensitivity lists, the accidental latch, reset, state machines — and which of these traps a tool actually detects. Mostly none.
- **Chapter 4 — Simulation, Testbenches and Waveforms.** Testbench anatomy, clock and reset without racing your own design, stimulus, checking, VCD and FST dumping, viewers in 2026, a Makefile build.
- **Chapter 5 — Verification.** Four stimulus methods compared on one bug; assertions and what Icarus really supports; hand-rolled coverage; and the guide's most dangerous trap — a reference model *more accurate than the specification*.
- **Chapter 6 — Binary Number Systems and Fixed Point.** Two's complement, Q formats, fixed point rounding and saturation, and where fixed point runs out.
- **Chapter 7 — IEEE 754 Single Precision in Depth.** Fields, classes, the hidden bit and subnormal ramp, ulps, rounding attributes, flags, the `shortreal` laboratory.
- **Chapter 8 — Floating Point Addition.** The ten-step algorithm, the 28-bit width budget proved three ways, the sticky bit, the renormalize random never finds, twelve additions traced through real wires.
- **Chapter 9 — Building a 2-Input FP Adder, Module by Module.** The seven-module split with an invariant per module; unit-versus-integration masking measured both ways; X-propagation that produces confident wrong answers.
- **Chapter 10 — Extending to Four Inputs.** Tree versus sequential, association order as part of the specification, why "both orders agree" is a false oracle, and what composition does to the flags.
- **Chapter 11 — Pipelining and Timing.** Where to cut, register banks, the streaming-equivalence harness, reset the control and not the datapath — and the epistemic wall around every timing number.
- **Chapter 12 — The Complete Four-Input Adder.** The specification, the assembly, two streaming equivalence proofs, a 321-quadruple corner suite, a 105-bin coverage model with pinned counts, and the last verification debt retired.
- **Chapter 13 — SystemVerilog Transition.** What SystemVerilog buys in this toolchain, construct by construct; four of the guide's own modules rewritten and re-proved equivalent.
- **Chapter 14 — Research Frontier.** FP accelerators, bfloat16, FP8 and posits, exact accumulators, what retargeting this design would cost, and an annotated bibliography of 87 entries.

Two shortcuts, if you must: a reader who already knows Verilog can start at chapter 6 and refer back, and a reader who wants the design rather than the pedagogy can read chapter 12's specification first and follow its inline citations backwards — that is the order it was assembled in. Every chapter ends the same way: **Traps Beginners Fall Into**, **What You Should Be Able to Do Now** — a checklist meant to be executed rather than nodded at — and **Sources for This Chapter**.

## How to Run the Code

All of it runs with one command:

```
cd guides/four-input-fp-adder/src && bash run_all.sh
```

`run_all.sh` walks every chapter's `targets.txt`, rebuilds each target from scratch in a temporary directory, runs it, and checks it against what the manifest says it should do. It exits non-zero if anything misbehaves. A single chapter or a subset takes arguments: `bash run_all.sh ch02 ch09`. There is no `src/ch01` — chapter 1 ships no code.

**Run the whole regression with the timeout raised:**

```
cd guides/four-input-fp-adder/src && SIM_TIMEOUT=120 bash run_all.sh
```

The runner imposes a per-simulation wall-clock limit (`SIM_TIMEOUT`, default 60 seconds), because a testbench whose clock dies hangs forever instead of failing, and one hang used to stall the whole regression. The default is fine chapter by chapter, but chapters 10, 11 and 12 ship streaming targets sized at 55-70 % of that budget on a quiet machine, and one of them was observed at 36.7 s and 56.0 s on the same host on different days. The final smoke test measured the two longest under 4x load: `ch11/tb_stream4` at 49.1 s and `ch10/tb_equiv4` at 46.5 s, 82 % and 77 % of the default — both correct, both close enough to flake. Raise the limit for full runs so a loaded machine cannot flake a correct target; every wall-clock figure in these chapters is a session observation, not a contract.

**The toolchain, and one non-negotiable version requirement.**

| Tool | Version used |
|---|---|
| Icarus Verilog (`iverilog`, `vvp`) | **13.0**, built from source tag `v13_0` |
| `python3` | 3.11 |

The Icarus version is not a preference. Chapters 5, 9, 12 and 13 use `$shortrealtobits` and `$bitstoshortreal` to get an IEEE 754 binary32 golden model inside the simulator, and **those system functions do not exist in Icarus 12.0** — which is what Ubuntu's `apt` installs today. Under 12.0 the regression fails six targets (both chapter 5 `shortreal` testbenches, two chapter 5 tolerance targets, two chapter 2 targets) with `$bitstoshortreal() is not defined` at `vvp` load time, after a clean compile. Build tag `v13_0` from `github.com/steveicarus/iverilog` per the project's own instructions; with 13.0 in place all 123 targets pass.

Everything compiles with one command and no other flags:

```
iverilog -g2012 -Wall -o <output> <sources> && vvp <output>
```

Build artifacts never go next to the source: `run_all.sh` builds into a `mktemp -d` and removes it on exit, and chapter 4's `Makefile` takes a `BUILD=` directory.

**Waveforms.** Chapter 4 dumps VCD and FST, and their *generation* is checked — the dump files are parsed and asserted against in the regression. Viewing them is another matter. GTKWave's Homebrew formula and cask were both disabled in October 2025 as discontinued upstream, so `brew install gtkwave` fails, though the upstream repository is not archived and the tool is still buildable from source or installable from Linux distribution packages. Surfer 0.7.0 is the maintained alternative used here; it reads VCD, FST and GHW. Neither has a headless render mode, so no waveform image in this guide is machine-generated, and anything said about clicking, zooming or menus is documentation.

## Conventions

**Cross-references.** Sections are referred to by their quoted titles — chapter 8's "The Width Budget: 28 Bits" — rather than by page or number, so a reference survives editing and can be found with a search. Where a title is quoted without a chapter named, it belongs to the chapter you are reading.

**Callouts.** Three recur. `> **Trap.**` marks a mistake that costs an evening and is easy to make. `> **Icarus reality.**` marks the gap between what a tool is commonly said to do and what this one measurably does — usually a warning that does not exist. `> **Seed for chapter N.**` marks material planted for a later chapter, and the later chapter cashes it by name.

**Code and transcripts.** Every Verilog listing is a copy of a file in `guides/four-input-fp-adder/src/`, or a marked excerpt with elisions shown as `// ...`; every block of simulator output is real captured stdout. Files named `bad_*.v` are deliberately wrong — they self-check, but they assert the *wrong* answer, so a `PASS` from a `bad_*` target means the trap still reproduces on this simulator. If a future Icarus fixes the behaviour, the target fails and the chapter learns its transcript has gone stale.

**The artifact rule.** `guides/four-input-fp-adder/src/` holds only sources and manifests — `.v` files, `targets.txt`, each chapter's `README.md` — never build products. Two narrow, deliberate extensions: chapter 12 keeps `.py` generator and model sources with the byte-stable `.vh` libraries they emit, in `ch12/` only, because a 321-row expectation table maintained by hand would be 321 chances to be wrong; chapter 13 keeps `.sv` files in `ch13/` only, because SystemVerilog is that chapter's subject and Icarus gates language level on `-g`, not on the file suffix — itself one of that chapter's measurements.

**Sources, and what a citation asserts.** A URL appears only where the source was fetched and its content read; otherwise the reference is by author, title, edition and section. Two equivalent notations express that rule — chapters 1 to 6 split their source lists under headings (*Verified*, *Machine-verified locally*, *By title (no link asserted)*), and chapters 7 onward tag entries inline with `` `[title-only]` ``. Chapter 14, whose subject is the literature, additionally date-stamps each fetch as `` `[verified 2026-08-21, HTTP 200]` `` — a precision it earned, having found that an HTTP 200 can hide a redirect to a search page, a cookie wall, or a bot interstitial serving HTML in place of a PDF.

**The epistemic wall.** Chapters 3 and 4 build it, chapter 11 names it in "Timing, Fmax, and the Epistemic Wall", and every later chapter honours it by that name: nothing here about area, frequency, critical path or another tool's warnings is a measurement, and each such statement is flagged in place and attributed.

## Scope, and What This Guide Does Not Do

A guide whose method is "measure it or do not claim it" owes the reader an inventory of what it could not measure. Here it is, in one place.

**No synthesis tool was available.** Not Vivado, not Quartus, not Yosys; no static timing analyser, and no simulator other than Icarus. The design was never synthesised, never placed, never timed, so every statement here about gate count, area, Fmax or critical path is documentation, attributed on the spot. Chapter 11 pipelines the adder and *counts registers*, which is arithmetic and is real; it does not tell you how fast the result runs, because nothing here can.

**The design is binary32-specific and unparameterised.** There is not one `parameter` declaration in the shipped RTL. The widths are the 28-bit budget proved for binary32; the corner library, the coverage bins and the golden references are all binary32 artifacts. Chapter 5 argues — well, and with numbers — for parameterising an FP datapath so it can be verified exhaustively at a tiny width before being instantiated at the real one, and chapter 12 then does not do it. The cost is real: retargeting this adder to bfloat16 or FP8 is a rewrite across nine files, not a parameter override. Chapter 5 says so in its own text, chapter 14 prices it, and it is the first item on the list of what to do next.

**The arithmetic is deliberately narrower than IEEE 754.** One operation, addition. One rounding attribute, roundTiesToEven. No FMA, multiply, divide or square root; no flush-to-zero; no traps — flags only. The four-input result is the three-rounding composition, not the correctly rounded four-input sum. The pipeline has no stall or backpressure. NaN payload propagation is specified as *this implementation's measured behaviour*, so the golden model can be bit-exact, and is explicitly not portable.

**Some gaps are recorded rather than closed.** Chapter 4's `counter4` has untested reset priority and reset synchronicity — either can be broken without turning its testbench red, and the closing checklist invites you to try. Chapter 14's body ran over its length target and says so rather than hiding behind its bibliography.

None of this is an apology. It is the guide's own rule applied to itself: say what was measured, say what was not, and let the reader tell the difference.

## Contents

<!-- TOC -->
