# Chapter 3 Review — Combinational and Sequential Logic


<!-- sections complete: 8/8 -->

Reviewer: RTL design and verification, 20 years datapath/control, new-hire course.
Verified against Icarus Verilog 13.0 (`/opt/homebrew/bin/iverilog`) on macOS 24.6.0, arm64.
Every claim below marked "measured" was re-run by me in this session, not taken from the text.

## Verdict

**Score: 7/10**

This is the best-researched chapter in the guide so far — 19/19 harness green, all 23 listings byte-identical to files on disk, all 21 transcripts reproducing line-for-line, and a scheduling section that gets the stratified event queue substantially right where most textbooks get it wrong. It loses three points for one measured falsehood and one self-contradicting table entry, both sitting inside the exact machinery the chapter stakes its authority on: the chapter promises that switching to `always_comb`/`always_ff` turns several of its silent bugs into compile errors, and on Icarus 13.0 it demonstrably does not — `always_comb` with an incomplete `if` and `always_ff` with a blocking assignment both compile silent, exit 0, latch behaviour intact. A reader who follows that advice to get latch safety today gets silence and believes it means safety, which is precisely the failure mode the chapter spends 844 words demolishing everywhere else.

## Code verification

### Harness

`bash run_all.sh ch03` from `guide/src/`: **19 passed, 0 failed**. Confirmed. All 18 `run`
targets compile clean and self-check; the one `xfail` fails as required.

Exactly one warning is emitted across the whole chapter, and it is the intended one:

```
bad_arraysens.v:25: warning: @* is sensitive to all 4 words in array 'mem'.
```

### The `xfail`, read rather than assumed

`iverilog -g2012 -Wall -o sim bad_zerodelay.v` produces, verbatim:

```
bad_zerodelay.v:16: error: always process does not have any delay.
bad_zerodelay.v:16:      : A runtime infinite loop will occur.
Elaboration failed
```

Chapter line 781 quotes this as `error: always process does not have any delay. : A runtime
infinite loop will occur.` — that is the two-line message joined, which is how Icarus renders
it in a single logical diagnostic. Fair. It fails for the stated reason: an `always` block
with no event control and no delay, rejected at elaboration, not at runtime. Correct.

### Listings versus files — mechanical check

I extracted all 45 fenced blocks from `ch03.md` (23 tagged `verilog`, 22 untagged), stripped
blockquote prefixes, and tested each `verilog` block for exact substring containment in the
`.v` files of `src/ch03/`.

**23 of 23 matched byte-for-byte. Zero divergences.** Including the two long complete listings
(`sel_mux.v`, 27 lines; `reset_sync.v`, 23 lines) and the 35-line `fsm_two_block` extract, with
comments, indentation and blank lines intact. The writer's claim is true as stated.

One note, not a defect: the four-line testbench-clock idiom at chapter line 718 matches ten
different files, because it is the house idiom repeated everywhere. That is a strength.

### Transcript freshness — every one re-run

I rebuilt all 19 targets from scratch under `bash` (zsh does not word-split `$files`, per
STATE.md's own warning) and diffed each untagged block against captured stdout.

**19 of 22 blocks are exact substrings of freshly captured output.** The remaining three are
composites, and all three verify once their pieces are checked separately:

| Chapter line | Block | Status |
|---|---|---|
| 400 | `bad_arraysens` warning + run output | Line 1 from the compile log, lines 2–4 from stdout. Both re-measured, both exact. Legitimately composed. |
| 409 | two `-Wsensitivity-entire-vector` warnings | Not in the `-Wall` build. Re-ran `iverilog -g2012 -Wall -Wsensitivity-entire-vector bad_arraysens.v` and got both lines, exact, in that order. Verified. |
| 500 | the `-Wextra` shell session | Re-ran both commands: first exits 0 silent, second prints `Ignoring unknown warning class extra` and exits 0. Verified. |

Nothing stale. This part of the chapter's authority holds up completely.

### Other tool claims, independently re-measured

- `-Wall` membership. `man iverilog` → `WARNING TYPES` → `all` lists exactly
  `anachronisms, implicit, macro-replacement, portbind, select-range, timescale,
  sensitivity-entire-array`. Seven classes, exactly as chapter line 804 states. Verified.
- `infloop` does not fire. A three-line module containing `always @(*) y = y + a;` compiles
  silent under `-Wall` **and** under `-Wall -Winfloop`, exit 0 both times. Chapter line 804 is
  correct and this is a genuinely useful thing to have measured.
- Race reproducibility. `tb_race.v` gives byte-identical output on repeated runs, and the
  `BLOCK-B, BLOCK-A / BLOCK-A, BLOCK-B` alternation across time steps reproduces. Chapter line
  806's "a race here is a stable, reproducible, confident wrong answer" is measured, not
  asserted, and it is the most valuable single sentence in the chapter.
- `bad_tbedge.v` causal claim. I traced it: `d_same` is high only across (t=15, t=25). The
  transcript shows the DFF sampling 0 at t=15 (design ran before stimulus) and 0 at t=25
  (stimulus ran before design). The chapter's stated mechanism at line 739 is exactly right.

### Not verifiable in this environment — and not flagged as such

Three synthesis-log strings at chapter line 496 are quoted as if measured:
`WARNING: [Synth 8-327] inferring latch for variable 'y_reg'` (Vivado),
`Warning (10240): Inferred latch for "y"` (Quartus), and the Yosys `$dlatch`/`check` claim.
None of Vivado, Quartus, Yosys or Verilator is installed here (`which yosys slang svlint
verilator` → all absent). The Vivado string is plausibly sourced to UG901, which is cited;
the Quartus and Yosys strings are sourced to nothing. See Non-blocking issues.

## Blocking defects

### BD-1 — The `always_comb` / `always_ff` checking promise is false on the tool the book runs on

**Location.** Chapter line 156 (`> **Icarus reality.**` callout in "Remembering Things: the
Flip-Flop and Its Templates"); repeated at line 494 (latch cure #4); repeated in the detection
table at lines 792–793; implied by the checklist item at line 856.

**The text.** Line 156:

> Under `-g2012` Icarus also accepts SystemVerilog's `always_ff`, `always_comb` and
> `always_latch`. […] the difference is that a tool is *required* to check them: `always_ff`
> errors if the body is not a legal flop template, and `always_comb` errors if the block infers
> a latch. […] several of this chapter's silent bugs become compile errors the moment you switch.

Line 494:

> Or **use `always_comb`**, where a conforming tool must check the block is combinational and
> must report a latch, turning a silent bug into a compile error.

**The defect — measured.** I wrote a file containing the chapter's own `bad_latch.v` bodies with
`always @(*)` replaced by `always_comb`, plus an `always_ff @(posedge clk) q = d;`, instantiated
them all under a top module so they genuinely elaborate, and compiled with the chapter's own
command line:

```
$ iverilog -g2012 -Wall -o sv2.vvp sv2.v
compile exit=0
$ vvp sv2.vvp
always_comb latch: y1=1 y2=1 (held == latch)
```

No diagnostic. Not a warning, not a note. The latch is still there at runtime — `y` held 1 across
a change of `a` at `sel == 2'b11`, which is the same measurement `tb_latch.v` makes. Blocking
assignment inside `always_ff` is also accepted silently. The **only** `always_*` check Icarus 13.0
performs is on the sensitivity list:

```
warning: Synthesis requires the sensitivity list of an always_ff process to only be
edge sensitive. ff_worse.a is missing a pos/negedge.
```

— and that is a *warning*, exit 0, not an error.

So on Icarus 13.0, switching to `always_comb`:
- does **not** report the incomplete `if` latch,
- does **not** report the incomplete `case` latch,
- does **not** report a blocking assignment in `always_ff`.

Zero of this chapter's silent bugs become compile errors. The claim is not merely imprecise; it is
the inverse of what the tool does.

**Second, smaller error inside the same claim.** IEEE 1800-2017 §9.2.2.2 and §9.2.2.4 say software
tools *should* perform the additional checks. Not *shall*. "A tool is *required* to check them" and
"a conforming tool must check […] and must report a latch" overstate the standard. A tool that
reports nothing is still conforming. This matters because the chapter is teaching the reader to
reason about what is guaranteed versus what is customary, and here it hands them a false guarantee.

**Why this is blocking rather than a nit.** The `> **Icarus reality.**` callout is a brand. Its
entire function in this chapter is "forget the folklore, here is what your tool actually does",
and the chapter earns enormous credibility with it elsewhere — the latch callout at line 498 is
the best paragraph in the chapter. Putting an unmeasured, false, tool-specific promise inside that
callout spends that credibility on the one claim a beginner is most likely to act on. The failure
is silent and self-confirming: the reader writes `always_comb`, sees no error, and concludes their
block is latch-free. That is the chapter's own thesis being violated by the chapter.

**Root cause.** `research/ch03-comb-seq.md:754` says "Cure 4 (SystemVerilog) — `always_comb`. The
tool is required to check the block is combinational and must report a latch […] This turns a
silent bug into a compile error", and `:158` says "the tool *checks* that the block is
combinational." Neither research note records a measurement. Every other behavioural claim in this
chapter was measured; this one was inherited.

**Correction.**

1. Fix the standard's modality everywhere: "IEEE 1800-2017 §9.2.2.2 says tools *should* check that
   an `always_comb` block is combinational and warn if a latch is inferred."
2. Add the measurement to the `Icarus reality` callout, since that is what the callout is for:
   "Measured on Icarus 13.0: it does not. `always_comb` with an incomplete `if` and `always_ff`
   with a blocking assignment both compile silent at `-g2012 -Wall`. The only `always_*` check
   Icarus performs is that an `always_ff` sensitivity list is edge-only, and that is a warning.
   You get the checking from Vivado, Questa, VCS and Verilator, not from this simulator."
3. In the detection table, the two latch rows must not list bare `always_comb`. Write
   `always_comb` *under a tool that implements the check — not Icarus*.
4. Keep the one `always_comb` claim that **is** true and **is** measured: chapter line 434's
   statement that `always_comb`'s inferred sensitivity list includes variables read by called
   functions. I verified this on Icarus — the `always_comb y = f(p);` case where `f` reads
   module-level `q` did respond to `q` changing (`y4` went to 6). That row of the detection table
   ("Incomplete sensitivity list → `always_comb`") is correct and should stay.

### BD-2 — The detection table contradicts the chapter's own conclusion, and understates linting

**Location.** Chapter line 795, the "What the Simulator Will and Will Not Tell You" table.

**The text.**

| Bug | Icarus | What actually catches it |
|---|---|---|
| Blocking assignment in a clocked block | silent | code review; a test that checks a signal takes N cycles to arrive |
| Blocking assignment that works by luck of statement order | silent | **nothing at all — it passes every test you can write** |

**The defect.** Two problems, and they compound.

*First, it contradicts the chapter's own prose fifteen lines later.* Line 810 says: "for the rest —
**the accidentally-correct blocking assignment**, the vector in an edge expression, the race
currently giving you the answer you wanted — the only detector is **a careful reader following
coding rules**." So the chapter's conclusion says a careful reader catches it, and the chapter's
table says nothing catches it. The row directly above already credits code review for the
*identical construct*. A reviewer reading `always @(posedge clk) begin q3 = q2; q2 = q1; q1 = din;
end` sees `=` in an edge-triggered block and flags it — the statement order is irrelevant to that
judgement. The two rows cannot have different detectors; the construct is the same.

*Second, "nothing at all" is factually wrong about linters.* Blocking assignment inside an
edge-triggered `always` block is one of the oldest and most universally implemented lint rules
there is — Verilator has a dedicated `BLKSEQ` check ("blocking assignment in sequential block"),
and every commercial linter flags it. The chapter spends its closing argument recommending a linter
("a **linter** — Verilator in `--lint-only -Wall` mode is the cheapest to install next to Icarus")
and then, in the table that same section is built around, tells the reader that the single most
dangerous blocking-assignment case is beyond any tool. That is the chapter arguing against its own
remedy.

**Why blocking.** This table is the chapter's thesis rendered as data. The whole chapter exists to
answer "for every trap, what actually detects it", and this is the row where the answer is both
wrong and self-contradicting. A reader who believes it will not bother linting for the bug class
the chapter has just spent 1,300 words proving is the most dangerous in the language.

**Correction.** Replace the cell with: `a linter (Verilator's BLKSEQ class, and every commercial
equivalent); code review — but no test can distinguish it, because it is functionally correct.`
That keeps the genuinely important and genuinely true observation (no *test* finds it) while
removing the false universal. Then reword line 810 so it does not say "the only detector is a
careful reader" for a case a linter catches — say instead that these are the cases where no
*simulation* can help, which is the point being made.

## Scheduling semantics audit

This is the section I came to break, because it is the easiest thing in Verilog to explain
subtly wrongly and because chapters 9, 11 and 12 all rest on it. It largely survives. Point by
point against IEEE 1364-2005 Clause 11 as I know it, and against re-running the experiments.

### The five regions — correct

Chapter line 164 names Active, Inactive, NBA update, Monitor, Future, in that order. That is
1364-2005 §11.3's list, in the standard's own order and with the standard's own names. Correct.
Noting that IEEE 1800 renames Monitor to Postponed and inserts assertion and program regions is
a nice touch that most books omit, and it is right.

Region contents at line 166 — blocking assignments, RHS evaluation of NBAs, continuous-assignment
updates, `$display`, procedural statements — matches §11.3's enumeration of the active region.
Correct. "Events here may execute **in any order**" is correct.

### "A non-blocking assignment evaluates its RHS immediately but schedules the update" — correct and demonstrated

Chapter line 263 states it precisely: RHS evaluated and captured in the active region, update
event placed in the NBA region, LHS untouched, process does not block. That is §9.2.2 / §11.6.4.
The `tb_regions.v` transcript nails it: the `$display` *after* `r <= d` prints `r=0`. Re-measured,
reproduces exactly.

The one thing 1364-2005 also specifies and the chapter omits is that the LHS *index* expressions
are evaluated at statement-execution time too (so `mem[i] <= d;` captures `i` immediately, not at
update time). Not needed at this level; noting it only because it is the next thing a reader will
trip on in chapter 11 when they write a pipelined memory write.

### The `a <= b; b <= a;` swap — correct

`tb_swap.v`, re-run: `t=11 a_nb=22 b_nb=11`, and it swaps back at t=21. The blocking pair both
become `22` and stay there. The chapter's explanation ("statement one overwrote `a_bl`, statement
two read the new value, and `11` is gone") is right, and the follow-on sentence — "No temporary was
needed for the swap, and none could have saved the copy" — is the correct pedagogical point.

The hardware justification at line 294 is the best paragraph in the section and is exactly right:
*because every read precedes every write, the order in which the blocks run cannot matter.* That is
the real reason for the rule, stated as a construction rather than a convention, and it is what
chapter 11 needs.

### `#0` cannot expose NBA results — correct, for the right reason

Chapter line 202: "`#0` does not help, because the NBA region is scheduled *after* the inactive
region". Correct per §11.3's region order, and demonstrated: the `$display` after `#0` prints
`r=0`, then `$strobe` prints `r=7`. Re-measured, exact.

The chapter goes further than most and shows `#0` is also *unnecessary* for combinational settling
(`tb_delta.v`: a three-deep `always @(*)` cascade is fully settled after one `#0`, and a second `#0`
changes nothing). That is correct — the active region drains to exhaustion before the inactive
region is promoted — and it is a genuinely good experiment. Both halves together justify Cummings
Guideline #8 rather than merely quoting it.

### `$strobe` versus `$display` — correct

Line 202 and line 741. `$display` executes in the active region at the point of call; `$strobe` and
`$monitor` execute in the monitor region after all value updates for the slot. Both measured. The
mapping to Cummings Guideline #7 ("Use $strobe to display values that have been assigned using
nonblocking assignments") is accurate — that is genuinely #7 in the paper's numbering, and the five
guidelines quoted at lines 347–351 (#1, #3, #5, #6, #8) are quoted accurately.

Line 741's framing — "why is my log one cycle off from my waveform? […] neither is wrong. The log is
right about the active region and the waveform is right about the whole slot" — is the sentence I
would put on a poster in a new-hire room. Keep it.

### Determinism honesty — the substance is right, the citation is wrong

The substance at line 220 is correct and unusually honest. 1364-2005 does guarantee source order
within a `begin`/`end`, does guarantee NBA RHS sampling precedes NBA updates, and does fix the
region order; and it does leave inter-process ordering in the active region to the implementation,
including interleaving. "Two standards-compliant simulators can give different answers for the same
code and both be right" is the correct conclusion and is stated without hedging or drama.

**But the section number is wrong.** The chapter attributes the nondeterminism licence to §11.5
twice — line 220 ("What §11.5 explicitly **leaves to the implementation** is…") and line 253 ("The
alternation is not a bug — §11.5 permits it") — and `bad_race.v`'s file header repeats it a third
time. In IEEE 1364-2005 the normative statements live in **§11.4 The Verilog simulation reference
model**, split into §11.4.1 *Determinism* (source order within a block; NBA ordering) and §11.4.2
*Nondeterminism* (statements in behavioural blocks need not execute as one event; process
interleaving is permitted). §11.5 *Race conditions* is the short consequence section that points
back at it with an example. The chapter's own source list at line 886 already names §11.4 correctly
in its title list, so this is an internal inconsistency as well as a citation error.

I am reporting this from memory of the standard rather than from a copy, which is exactly the
situation the chapter's own preamble anticipates ("confirm section numbers against a copy before
quoting"). Check it against a copy; my confidence is high but this is the one finding in this
section I have not machine-verified. The fix is a three-character edit in three places, plus
splitting the sentence so the guarantees cite §11.4.1 and the licence cites §11.4.2.

### The two claims that are loose rather than wrong

**"One iteration of that loop is a delta cycle."** (line 172.) The loop the chapter has just
described is §11.3's: *if nothing is active, promote the earliest non-empty region; then execute
one active event.* Under a literal reading, one iteration is **one event execution**, which is not
a delta cycle by anybody's definition. The chapter almost certainly means one promote-and-drain
pass, but as written a reader completing the checklist item "explain what a delta cycle is" (line
850) will give the wrong answer.

Worse, the chapter's own two experiments then use the term in incompatible senses. `tb_delta.v`
shows a three-deep `=` cascade settling entirely *within* one active-region drain — zero
promotions. Line 343 then says `<=` in a combinational block "costs a delta cycle per assignment",
which is only true if a delta cycle means a *region promotion*. Both cannot be right.

Fix: define it once and consistently — "a **delta cycle** is one promote-and-drain pass over the
queues at a fixed simulation time; it advances no time. IEEE 1364 does not use the term (it is
borrowed from VHDL), which is why you will see it used loosely." Then line 343 becomes correct as
written and `tb_delta.v` becomes a demonstration that a chain of `=` blocks costs *zero* extra
delta cycles while the same chain with `<=` costs one each. That is a sharper lesson than the one
currently on the page, and it is the one chapter 11 needs.

**The `[inactive region]` label.** `tb_regions.v` prints
`[inactive  region] $display after  '#0'      : r=0`, and the chapter reproduces it as evidence.
Strictly, `#0` *defers the continuation into* the inactive region; when the active region empties,
inactive events are promoted **into the active region** and execute there. Nothing ever executes
"in the inactive region" — it is a holding pen, not an execution context. For a section whose whole
job is installing a correct mental model of the queue, printing "this line ran in the inactive
region" installs a wrong one. Relabel to `[after #0 — promoted from inactive]` or similar, in the
`.v` file and in the chapter's transcript together (they must stay byte-identical).

### One thing the chapter should say and does not

`tb_regions.v` puts a `#0` inside an `always @(posedge clk)` block. That is a fine *probe* and a
terrible *template*, and it is precisely what Guideline #8 — which the chapter quotes 150 lines
later — forbids. Beginners copy listings. One sentence: "this block is an instrument, not a design;
`#0` never belongs in RTL, for the reason Guideline #8 gives below."

### Verdict on this section

The mechanism is right, the experiments are well chosen and genuinely reproduce, and the derivation
of the `=`/`<=` rule from the queue rather than from authority is the correct pedagogy and is
executed well. The defects here are one mis-citation and two definitional looseness's — all
correctable without touching a single line of Verilog or a single transcript.

## Synthesis reality check

This is where a simulator-only book usually dies, and mostly this one does not. The templates are
the ones tools actually want, the "infer, not create" framing at line 13 is the correct mental
model and is installed early and repeated, and the reset philosophy at line 571–573 ("reset the
bits that decide, not the bits that carry") is what real teams actually do and what I would say in
the new-hire course. Below is where it would and would not survive contact with a flow.

### The latch section — what a simulator can and cannot show

This is handled better than in any textbook I would put on the shelf. Three things it gets right
that are routinely got wrong:

1. **Line 492: "This is not a simulation/synthesis mismatch."** RTL and gate simulation of an
   inferred latch agree; it is a design bug both stages reproduce honestly. Almost every treatment
   lumps latches in with sensitivity-list bugs as "mismatch" problems. This one separates them and
   explains why the cures differ in kind. Correct and valuable.
2. **Line 508: "a simulator cannot warn you about a latch. Only a synthesiser or a linter can."**
   With the reason: there is no latch object in `vvp`'s data structures to warn about. Exactly
   right, and it is the honest framing of why Icarus's silence is not a deficiency.
3. **"Read the synthesis log for the word 'latch' on every build."** That is the actual working
   practice. Good.

The nuance I would add, since the chapter invites precision: RTL and gate agreement holds at
zero-delay. A real transparent latch has a timing aperture — enable-to-Q, data-to-Q through the
transparent window, and glitch sensitivity on the enable — that the `always @(*)` model has no
representation for. So "the simulator is faithfully reproducing the hardware you asked for" is true
about *function* and false about *timing*, which is the half that actually kills you. One clause.

### When a latch is inferred — correct, but not complete

The rule at line 454 is stated exactly right: any execution path on which the variable is not
assigned. The three refinements (per variable, per path, `case` completeness and tools differing in
how hard they try to prove it) are correct.

Four cases that bite real people are missing, and one of them is contradicted by the chapter's own
listing:

- **A `default:` arm that assigns nothing.** Chapter line 494 lists as a cure: "**Put a `default:`
  arm on every `case`**, non-negotiable in a state machine." Taken literally that is false —
  `default: ;` is a `default:` arm and cures nothing. And the chapter *prints* exactly that
  spelling: `fsm.v`'s three-block output decode, reproduced at chapter line 658, contains
  `default:        ;`. It is safe there only because `busy_c`/`done_c` are unconditionally
  defaulted at the top of the block, and the chapter never says so. A reader who takes
  `default: ;` as the template and drops the top-of-block defaults gets a latch and believes they
  are protected. Fix: "put a `default:` arm on every `case` **that assigns every variable the block
  writes** — an empty `default: ;` is a latch with a comment on it."
- **Partial vector assignment.** `y[3:1] = ...` with `y[0]` never assigned on some path infers a
  latch on bit 0 only. Extremely common in shift/align logic, which is exactly what chapter 9 will
  be writing.
- **A `for` loop that does not cover every index.** Same failure, bit-granular, and invisible in a
  code review that only reads the loop bound.
- **Read-before-write of a block-local temporary.** `always @(*) begin if (c) t = a; y = t; end` —
  `t` is read on a path where it was never assigned, so `t` latches. The chapter mentions `y = y+1`
  under sensitivity lists but never connects self-reads to latch inference, and this is the version
  that appears in real alignment/rounding code.

The primary cure the chapter teaches (unconditional default for every written variable, at the top
of the block) covers all four, which is why the section is not wrong — but a reader who adopts the
*secondary* cures as equivalents will get bitten. Say that the top-of-block default is the only one
that scales, more firmly than "the habit to acquire because it scales".

### `full_case` / `parallel_case` — handled correctly, but only half explained

What is there is right: they are comments, so only the synthesiser reads them, which is a mechanism
whose purpose is to make simulation and synthesis disagree; they suppress the *report* rather than
the missing assignment; a `default:` arm is portable and shorter; `unique`/`priority` replaced them
and the simulator checks those. The Cummings *Evil Twins* citation is the right one and the quoted
phrases are accurate.

The gap: **the chapter never says what `parallel_case` asserts.** It defines `full_case` ("every
selector value is covered") and then discusses the pair as a unit. A reader finishes the paragraph
knowing what half the pragma means. `parallel_case` asserts the case items are mutually exclusive,
so the tool builds a flat mux instead of a priority chain — a *different* lie with a *different*
failure mode: if the items overlap in reality, RTL simulation takes the first match and the netlist
takes an undefined one, and the design works until an input combination you never tested arrives.
That is two sentences and the section is required by the brief to handle these correctly.

Second gap: the chapter says the pragmas "make simulation and synthesis disagree" but never spells
out the `full_case` mechanism — the simulator still holds the old value on an uncovered selector
while synthesis treats it as a don't-care and may emit anything. One sentence.

### Reset advice — sound philosophy, one wrong justification

**Sound and worth keeping:** synchronous versus asynchronous trade-offs; recovery and removal
defined properly and tied back to chapter 1's metastability; "assert asynchronously, de-assert
synchronously"; the two-flop synchroniser, one per clock domain; the observation at line 565 that
RTL simulation *cannot* show a recovery violation because it has no aperture, so the synchroniser's
entire value is invisible in this toolchain. That last one is exactly the kind of thing that gets a
design taped out broken, and the chapter names it.

**The wrong justification.** Line 567:

> For this guide's target the practical answer is simple: **use synchronous, active-low reset
> throughout.** It matches the FPGA fabric […]

Synchronous: defensible, and it is genuinely AMD/Xilinx's recommendation (async resets block SRL
inference and BRAM/DSP register packing). **Active-low: backwards for the fabric named.** The
control inputs on Xilinx 7-series and later flip-flops (CE, SR) are **active-High**; UG949's
control-set guidance is explicit that active-Low control signals require an inverter and cost logic
resources. Active-low reset is the *ASIC* convention — standard-cell libraries carry active-low
`RN`/`SN` pins, and a board-level reset that is safe when a driver is absent wants to be low-true.
So the recommendation is fine as a house convention and the reason given is wrong for the target.

Fix: keep the convention, change the justification. "Use synchronous, active-low reset throughout.
Synchronous because it keeps the design fully synchronous and does not block FPGA register packing;
active-low because it is the near-universal convention in existing RTL and in standard-cell
libraries, and consistency across a codebase is worth more than the single inverter it costs on an
FPGA whose control inputs are active-high." That is honest and still teaches one rule.

**Two smaller ones in the same section.**

- Line 552: the synchroniser's de-assertion "lands just after a clock edge, so every flop
  downstream is **guaranteed** to meet its recovery and removal times." Too strong, and the same
  word is in `reset_sync.v`'s header comment. The guarantee holds at the synchroniser's *output
  pin*. Across a real reset tree with thousands of loads and real skew, recovery/removal still has
  to be closed in STA, and large designs pipeline the reset tree to do it. Teaching "guaranteed"
  produces engineers who do not look at the reset timing report. Change to "so the release is
  aligned to a clock edge and the recovery/removal check becomes an ordinary timing closure problem
  instead of an unconstrained asynchronous one."
- `reset_sync.v` would not pass review at a real company without the synchroniser flops being
  marked so the tool does not merge, retime or spread them — `(* ASYNC_REG = "TRUE" *)` on Xilinx,
  the equivalent elsewhere — because `s1` genuinely can go metastable on reset release. The chapter
  is entitled to say attributes are out of scope; it should say so rather than be silent, since the
  module is presented as "the standard two-flop reset synchroniser".

### Latches on FPGAs — family-specific folklore stated as general

Line 490: a latch is "handled badly by FPGA flows, where the latch becomes a lookup table with
feedback that is slow, can glitch, and leaves the dedicated flip-flop beside it unused."

True for Intel/Altera ALMs, where latches are built in the LUT with combinational feedback. Not true
for Xilinx 7-series and later, where the storage element in the slice can be *configured* as either
an edge-triggered flip-flop or a level-sensitive latch (UG474), so the latch occupies the flop site
rather than a LUT. The real and family-independent objections are the ones the chapter already makes
better: timing analysis through a transparent latch is hard, and the output now depends on *when*
things changed. Cut the LUT-with-feedback sentence or scope it to "on some families".

### Everything else in the templates, checked

- Plain D, sync reset, async reset, clock enable: all four are the canonical recognised templates.
  The async form has the reset branch first, testing nothing but the reset, with the sensitivity-list
  polarity matching the test polarity. The trap at line 154 (`@(posedge clk or rst_n)` mixing an
  edge with a level; `if (!rst_n && en)` being "a puzzle for the synthesiser") is exactly the review
  comment I write. Correct.
- Clock enable as `else if` and never a sensitivity-list term, with the explicit note that
  `@(posedge clk or posedge en)` asks for a second clock: correct and the right thing to pre-empt.
- Line 339: "A synthesis tool reading that code typically infers one flip-flop and two wires, so
  netlist and RTL simulation agree; they are simply both wrong relative to what you meant."
  **This is the sophisticated and correct claim**, and most books get it wrong by asserting that
  blocking-in-clocked always causes a mismatch. It usually does not. Keep.
- Line 341: "it stops working the moment the stages live in different `always` blocks, where there
  is no defined order at all." Correct, and the right reason for making the rule absolute.
- Line 694: "**synthesis tools re-encode state machines by default**, so writing binary
  `localparam`s does not mean you get binary flops." True (Vivado FSM extraction defaults to auto,
  Quartus likewise) and almost never mentioned in teaching material. Excellent.
- Line 569: FPGA configuration initialises flops from the bitstream, so a declaration initialiser
  really does define the power-up value there and is a simulation-only fiction on an ASIC. Correct
  and precisely scoped.
- Line 779: two `always` blocks writing one `reg` is "legal Verilog, last-writer-wins, and
  **unsynthesisable**". Correct.

### Would anything here fail review at a real company?

Nothing in the templates. Three things in the prose: the `always_comb` promise (BD-1), the
active-low/fabric justification, and "guaranteed to meet its recovery and removal times". The
`default: ;` gap is the one that would actually produce broken RTL from a reader following the text.

## Non-blocking issues

### NB-1 — `moore_y` is not a Moore output

**Location.** Chapter lines 677–690, and `fsm.v` lines 150–169.

Line 677 gives the formal definition — "A **Moore** output is a function of state only; a **Mealy**
output is a function of state *and* the current inputs" — and then demonstrates it with
`assign mealy_y = st & x;` against `always @(posedge clk) moore_y <= st & x;`. The second is a
*registered Mealy* output: a function of the previous state **and the previous input**. It is not a
function of state alone, so by the definition given three lines earlier it is not a Moore output.

The property being demonstrated — a registered output is stable for a whole cycle and cannot follow
its inputs mid-cycle — is correct, is the point worth making, and the transcript shows it cleanly
(t=91→t=92, no clock edge, `mealy_y` follows `x`, `moore_y` does not). But the label teaches
"Moore = registered Mealy", which is wrong and which a reader will carry into chapter 11.

**Fix.** Either rename the signal and the prose to "registered output" and say explicitly that
registering a Mealy output buys you Moore's *stability* without making it a Moore output; or add a
genuine third output that is a function of `st` alone. The first is a rename in one `.v` file, one
transcript and three sentences; note the transcript must be regenerated so the chapter's
byte-identity property survives.

### NB-2 — the four-line summary's rule 3 is ambiguous and contradicts the one-block FSM

**Location.** Chapter lines 359–364.

> 1. Combinational `always` block: `always @(*)` and `=` everywhere.
> 2. Clocked `always` block: `always @(posedge clk)` and `<=` everywhere.
> 3. **Never both in one block.**
> 4. Never assign one variable from two blocks.

"Never both" *what*? Read against lines 1–2, the most natural parse is "never put combinational and
clocked logic in one block" — which the chapter then contradicts 260 lines later by teaching the
one-block FSM style, where next-state decode (combinational by nature) lives inside the clocked
block. Cummings' own Guideline #4 explicitly permits exactly that. The intended meaning is
Guideline #5, about operators.

**Fix.** "3. Never mix `=` and `<=` in one block." Four words, removes the ambiguity, and makes the
one-block FSM section consistent with the rule it is supposed to obey.

### NB-3 — the `x`-optimism example demonstrates the harmless direction

**Location.** Chapter line 756.

> It is **optimistic** elsewhere: `if (x) a = 1; else a = 1;` gives `a = 1` in RTL where gate-level
> `x`-pessimism might give `x`.

This is a correct illustration of **gate-level x-pessimism** — a netlist mux with an `x` select and
both data inputs at 1 gives `x` where RTL gives 1, and RTL is the one telling the truth. It is not
an illustration of the RTL x-optimism that actually hurts you, which is:

```verilog
if (sel) y = a; else y = b;    // sel === 1'bx
```

RTL silently takes the `else` branch and reports a confident `y = b`, hiding an unknown that in
silicon could be either. That is the case that lets a design with an unreset control bit pass a
regression and fail on the bench, and it is precisely the failure the chapter's own `tb_xprop.v`
narrative is building toward.

The chapter's conclusion — "`x` propagation is a heuristic, not a sound approximation in either
direction" — is right, and it deserves an example of each direction. Add the `if (sel)` case as the
optimism example and keep the current one as the pessimism example. About 40 words.

### NB-4 — §11.5 attribution

Covered in the scheduling audit. Three occurrences: chapter lines 220 and 253, and `bad_race.v`'s
header comment. The normative statements are in §11.4.1 (determinism) and §11.4.2 (nondeterminism);
§11.5 is the consequence section. Verify against a copy before editing; the chapter's own source
entry at line 886 already names §11.4 correctly, so the body text is inconsistent with the
bibliography as it stands.

### NB-5 — three synthesis-log strings are quoted without a source or a measurement

**Location.** Chapter line 496 (Vivado `[Synth 8-327]`, Quartus `Warning (10240)`, Yosys
`$dlatch`/`check`).

None of these tools is installed in this environment, so none was measured, and the chapter's
closing note at line 891 claims "Every block of simulator output in this chapter is real captured
stdout from running them." These three are not stdout from anything in `src/ch03/`. The Vivado
string can be attributed to UG901, which is already source #4. The Quartus and Yosys strings have
no source at all, and the Yosys claim is loose besides — Yosys reports latch inference from the
`proc`/`proc_dlatch` pass, not from `check`.

**Fix.** Either cite each one, or add a half-sentence marking them as reproduced from vendor
documentation rather than run here. The chapter is scrupulous about this distinction everywhere
else; this is the one place the wall between "measured" and "read" is not maintained.

### NB-6 — `bad_multidrive` detection is understated

Chapter line 796 gives "synthesis, as a multiple-driver error; code review". A linter catches it
too (Verilator `MULTIDRIVEN`), which matters because the chapter's whole argument lands on
"install a linter". Same class of understatement as BD-2, one row over.

### NB-7 — the chapter never states the intentional-latch case

Cummings Guideline #2 ("When modeling latches, use nonblocking assignments") is the one of the
eight that is skipped, and the chapter's latch section treats latches as universally accidental. A
reader will eventually meet a deliberate latch (`always_latch`, a clock-gating enable latch) and
have no framework for it. One sentence in the latch section is enough: a latch you meant is rare,
is documented with `always_latch`, and is written with `<=`; anything else is a bug.

### NB-8 — `default:` assigning `x` versus a defined value

Line 494's advice ("prefer the defined value") is right for a teaching guide, but the FSM case has
a dimension the chapter does not mention: assigning `x` in a state machine's `default:` licenses the
tool to optimise away the illegal-state recovery entirely, which is why safe-FSM extraction exists
as a separate synthesis option (Vivado `FSM_SAFE_STATE`, Quartus's safe state machine). Worth one
clause in the State Machines section since that is where illegal states actually matter.

---

## Chapter 2 handoff — fully delivered

I read chapter 2's deferrals and its bridge and checked each against chapter 3.

| Deferred by chapter 2 | Where chapter 3 delivers it | Status |
|---|---|---|
| blocking `=` versus non-blocking `<=` (ch02:1390) | "Blocking and Non-Blocking, Derived From the Queue" | delivered |
| why `<=` in clocked, `=` in combinational (ch02:1390, ch02:1577) | same section, lines 261–343, derived from the queue rather than asserted | delivered, and delivered the way ch02 promised ("rather than merely being conventions") |
| `always @(posedge clk)` and reset styles (ch02:1390) | "Remembering Things: the Flip-Flop and Its Templates" + "Reset Strategy" | delivered |
| latch inference **in full** — ch02 explicitly says it named only the `case`-without-`default` version (ch02:1390) | "The Accidental Latch" covers `if` and `case`, per-variable and per-path | delivered (though see the completeness gaps in Synthesis reality check) |
| the event-region scheduling model (ch02:1390, ch02:1577) | "How a Simulator Actually Runs Your Code" | delivered |
| two `always` blocks writing one variable, racing "in a way that no `x` will ever reveal" (ch02:1237, ch02:1577) | `bad_multidrive.v` at line 770, and the explicit contrast with two `assign`s to one wire resolving to `x` — which is the exact contrast ch02:1237 set up | delivered, and the callback is precise |
| storage comes from a clocked `always` block (ch02:416) | line 53, `tb_regwire.v` measurement that `reg` does not make a register | delivered |
| chapter 1's latch promise ("Taming Time With a Clock") | line 452 opens the latch section by naming it | delivered |

Nothing was dropped. The ch02→ch03 seam is the tightest in the guide so far: chapter 2 said "this
chapter has used only `always @(*)` with `=`, and `initial` in testbenches, on purpose", and
chapter 3's first three sections explain exactly why, in that order.

One duplication worth noting rather than fixing: ch02's Icarus-reality callout at line 1255 already
quotes the `always process does not have any delay` error, and ch03 line 781 quotes it again as its
"only `xfail`". The repeat is justified (ch03 makes it the punchline of the detection argument) but
ch03 should acknowledge the reader has met it, per house style elsewhere.

## Seeds for chapters 9, 11 and 12

- **Line 95, "Seed for chapters 9 and 12"** — accurate. The datapath list (exponent compare,
  alignment shift, mantissa add, LZC, normalisation shift, rounding decision, repacking) matches
  chapter 1's seeds at lines 237/243/372/389 and chapter 2's at 469/792/1355. The claim that
  `align_sticky.v` and `round_ne.v` already exist as the `assign` form is **true** — both are in
  `src/ch02/` with testbenches. Verified.
- **Line 368, "Seed for chapter 11"** — accurate and load-bearing. "A pipeline is nothing but a
  long shift register with logic between the stages" is exactly what chapter 11 needs, and pointing
  at the `blocking` column of `tb_shift3.v` as the concrete failure mode chapter 11 guards against
  is the strongest seed in the chapter.
- **Line 575, "Seed for chapter 11"** — accurate. "Datapath registers no reset, `valid` pipeline
  and stall/flush control reset" is correct practice and correctly scoped.
- **Line 698, "Seed for chapters 11 and 12"** — **the chapter-12 half is unsupported.** It promises
  that the FP adder "decomposes into almost exactly this machine, one state per step: idle, unpack,
  align, add or subtract, normalise, round, pack, done." STATE.md's plan has chapter 9 building a
  2-input adder module by module, chapter 10 extending to four inputs, chapter 11 pipelining, and
  chapter 12 delivering the complete four-input adder. Nothing in that plan builds a multi-cycle
  FSM adder, and the seed itself then says "Chapter 11 then replaces the machine with a pipeline" —
  i.e. the machine is a conceptual stepping stone that will never be built. Seeding chapter 12 with
  a design the guide does not produce leaves the reader waiting for it.

  **Fix.** Retitle to `> **Seed for chapter 11.**` and add one clause: "This guide does not build
  the multi-cycle version — chapter 11 goes straight to the pipeline — but the decomposition is the
  same, and it is the one to have in your head when you read someone else's FPU."

## Cross-references and citations — clean

- **Positional cross-references: none.** Every forward and backward reference is by section title in
  quotation marks plus `above`/`below`. All ten internal references resolve to real `##` headings in
  `ch03.md`. All three chapter-1 references ("Taming Time With a Clock", "The setup constraint, and
  where f_max comes from", "Metastability") resolve to real headings in `ch01.md`. Both chapter-2
  references ("Reduction Operators and the Sticky Bit", "`reg` does not mean register") resolve to
  real headings in `ch02.md`. Nothing broke.
- **`sunburst-design.com`: zero occurrences in the chapter.** The only hits in the repository are in
  `research/ch03-comb-seq.md`, which is the note *instructing* the writer not to print the domain.
  Correct handling. The two Cummings papers are cited via the MIT 6.375 mirrors, and the chapter
  even explains the `snug99` filename discrepancy against the SNUG-2000 title page — that is the
  right level of care.
- **`[title-only]` sources carry no URLs.** Sources 7–10 are under "By title (no link asserted)" and
  none has a link. Sources 1–4 have URLs and are marked Verified; 5–6 are the local machine
  verification. The one soft spot is source 4 (UG901), where the chapter is explicit that the
  reset-style advice is "this guide's recommendation, not a quotation from it" — good discipline,
  and it is exactly the sentence that should have prevented the active-low/fabric error.
- IEEE section numbers spot-checked: §9.7.5 (implicit event list) and §9.2 (procedural assignments)
  in 1364-2005 are right; 1800-2017 §9.2.2.2/.3/.4 and Clause 4 are right. Only §11.5 is misapplied
  (NB-4).

## What to cut

13,214 words by my count (body text, listings and transcripts excluded from the count would be
lower, but the target is presumably total). Against a 7,000–10,000 target that is 32% over the top
of the range. I will not defend the length as a whole — but I will defend most of it, and the
overrun is concentrated in three places rather than spread evenly.

Measured per-section:

| Words | Section | Verdict |
|---|---|---|
| 675 | Two Kinds of Logic, and One Language for Both | trim |
| 691 | Describing Combinational Logic Three Ways | keep |
| 744 | Remembering Things: the Flip-Flop and Its Templates | keep |
| 1369 | How a Simulator Actually Runs Your Code | **keep in full** |
| 1300 | Blocking and Non-Blocking, Derived From the Queue | **keep in full** |
| 1017 | Sensitivity Lists, and What `@(*)` Really Covers | trim |
| 1169 | The Accidental Latch | keep |
| 1117 | Reset Strategy | keep |
| 1337 | State Machines | trim |
| 1271 | Simulation Artifacts That Will Cost You an Evening | **move most of it to chapter 4** |
| 844 | What the Simulator Will and Will Not Tell You | keep prose, merge the table |
| 526 | Traps Beginners Fall Into | merge |
| 465 | What You Should Be Able to Do Now | trim |
| 183 | Bridge to Chapter 4 | keep |
| 506 | Sources for This Chapter | keep |

### The one structural move — worth ~950 words

**Move four of the six "Simulation Artifacts" to chapter 4.** Chapter 4 is literally "Simulation and
testbenches with Icarus Verilog". These four are testbench topics, not RTL topics:

- The clock that never starts (`bad_clkinit.v`) — ~180 w
- Stimulus on the wrong edge (`bad_tbedge.v`) — ~330 w
- Printing the wrong value (`$display` vs `$strobe`) — ~120 w
- `x` that never goes away (`tb_xprop.v`) — ~360 w

They are excellent material and they do not belong here. Chapter 4 opens with a reader who has
"written a dozen testbenches by accident already" (chapter 3's own bridge line) and needs exactly
these four failure shapes before writing one on purpose. Moving them improves both chapters.

Keep in chapter 3: **`#` inside logic** and **two blocks writing one variable** — those are RTL
bugs, and Guideline #6 and Guideline #8 are quoted in this chapter. Retitle the remaining section
"Two Things That Compile and Are Not Hardware" or fold both into "What the Simulator Will and Will
Not Tell You".

Cost: the `$strobe`/`$display` item and the `tb_xprop.v` sticky-bit seed both have forward hooks
here. Keep a two-line pointer for each rather than the full treatment. Net saving ~950 words.

### Three merges and trims — worth ~700 words

1. **Merge "Traps Beginners Fall Into" (526 w) with the detection table (part of 844 w).**
   The chapter currently ends with *three* overlapping indexes of itself: a 21-row trap table, a
   10-row detection table, and a 17-item checklist. The trap table and the detection table are the
   same information sliced two ways — trap/section/file versus bug/Icarus/detector. One table with
   five columns (Trap, Section, File, Icarus, What catches it) says everything both say. The trap
   table is house convention and must survive in some form; the detection table's rows can fold into
   it, and the detection section keeps its prose, which is the part that carries the argument.
   **Saving ~350 words.**
2. **"State Machines" (1337 w).** The three-block style needs its listing and its one-line trick
   (decode `s_next`, not `s_state`), not four paragraphs. The one-block style's discussion of when
   `busy` asserts is a paragraph too long for something the chapter tells you not to reach for by
   default. **Saving ~200 words.**
3. **"What You Should Be Able to Do Now" (465 w, 17 items).** Chapters 1 and 2 run 14–15. Seventeen
   items with several running to three clauses is a wall. Merge the four blocking/non-blocking items
   into two. **Saving ~150 words.**

### Two trims where the chapter is re-teaching

4. **"Two Kinds of Logic" (675 w).** The comb/seq distinction was already set up by chapter 1's
   "Taming Time With a Clock" and chapter 2's bridge; the trip-counter opening re-establishes it
   from scratch. The genuinely new and essential content is "Verilog is not executed by the FPGA"
   and the three-idiom table. Cut the first two paragraphs to one. **Saving ~200 words.**
5. **`bad_arraysens.v` (~300 w inside the sensitivity section).** Whole-array sensitisation is real
   but it is a performance-and-intent issue, not a bug that will ever produce a wrong FP result. It
   earns its place only because it is the one thing Icarus warns about — which is a one-paragraph
   point, not three. **Saving ~150 words.**

### Total and honest assessment

Move ~950 + trim ~1,050 = **~2,000 words**, landing at ~11,200. That is still over 10,000, and I
would stop there rather than cut further, because what remains is the two queue sections (2,669 w
combined), the latch section and the reset section — and those are the four that chapters 9, 11 and
12 are explicitly built on. Chapter 3 is carrying nine topics that chapter 2 deferred wholesale,
plus a load-bearing theme the brief mandated, plus 28 verified source files. 11,200 for that is
defensible in a way that 13,214 is not, and the specific 2,000 words above are the ones that are
either duplicated inside the chapter or better placed in chapter 4.

If the length must land inside 10,000, the next cut is the third FSM style (listing, prose and its
share of the transcript, ~350 w) with a forward pointer to chapter 11, since the three-block style
exists to buy registered outputs and chapter 11 is where registered outputs become the subject.

## Required changes for a 9+

Ordered by severity. Items 1 and 2 are the difference between 7 and 8. Items 1–6 are the difference
between 7 and 9.

1. **Fix the `always_comb`/`always_ff` claim (BD-1).** Three edits.
   (a) Chapter line 156: change "a tool is *required* to check them" to "IEEE 1800-2017 §9.2.2.2 and
   §9.2.2.4 say a tool *should* check them", and add the measurement to the `Icarus reality`
   callout: Icarus 13.0 at `-g2012 -Wall` compiles `always_comb` with an incomplete `if` and
   `always_ff` with a blocking assignment **silently**; its only `always_*` check is that an
   `always_ff` sensitivity list is edge-only, and that is a warning. Delete "several of this
   chapter's silent bugs become compile errors the moment you switch" — measurably false here.
   (b) Chapter line 494: change "a conforming tool must check […] and must report a latch, turning a
   silent bug into a compile error" to "a tool that implements the recommended check — Vivado,
   Questa, VCS, Verilator, but not Icarus — reports the latch".
   (c) Detection table lines 792–793: qualify `always_comb` as "under a tool that implements the
   check — not Icarus". Leave the sensitivity-list row alone; that one is true and I verified it.
   Also fix `research/ch03-comb-seq.md:158` and `:754`, which are the source of the error, so it
   does not propagate into chapter 13.

2. **Fix the "nothing at all" detection-table cell (BD-2).** Replace with "a linter (Verilator's
   `BLKSEQ` class, and every commercial equivalent); code review — but no test can distinguish it".
   Then reconcile line 810 so the chapter's conclusion and its table agree, and add
   `MULTIDRIVEN`-class linting to the two-blocks-one-`reg` row (NB-6).

3. **Fix the `default:` arm advice and annotate `fsm.v`'s empty default (Synthesis reality check).**
   Line 494's cure becomes "put a `default:` arm on every `case` **that assigns every variable the
   block writes** — `default: ;` is a latch with a comment on it". Add one clause where `fsm.v`'s
   three-block output decode is shown (chapter line 658) explaining that its `default: ;` is safe
   *only* because `busy_c`/`done_c` are unconditionally defaulted above it.

4. **Fix the reset justification (Synthesis reality check).** Keep "synchronous, active-low reset
   throughout"; delete "It matches the FPGA fabric" as the reason for the active-low half — Xilinx
   flip-flop control inputs are active-High and an active-low reset costs an inverter there.
   Justify active-low as codebase and standard-cell convention instead. In the same section, replace
   "guaranteed to meet its recovery and removal times" with a claim about the *release being aligned
   to a clock edge*, and add one sentence on `ASYNC_REG`-class attributes (or an explicit statement
   that synthesis attributes are out of scope).

5. **Fix the §11.5 citation in three places (NB-4)** — chapter lines 220 and 253 and `bad_race.v`'s
   header comment. The guarantees belong to §11.4.1, the implementation licence to §11.4.2. Confirm
   against a copy of 1364-2005 first.

6. **Fix the delta-cycle definition and the `[inactive region]` label (Scheduling audit).** Define a
   delta cycle once, as a promote-and-drain pass at fixed simulation time, and note that IEEE 1364
   does not use the term. Relabel `tb_regions.v`'s `#0` line so it does not claim a statement
   "ran in the inactive region"; regenerate the transcript so the chapter's byte-identity property
   holds.

7. **Rename `moore_y` or build a real Moore output (NB-1),** so the section does not define Moore as
   "function of state only" and then demonstrate it with a registered Mealy.

8. **Change rule 3 of the four-line summary to "Never mix `=` and `<=` in one block" (NB-2),** so it
   does not read as a prohibition on the one-block FSM style the chapter teaches later.

9. **Add the RTL x-optimism example (NB-3)** — `if (sel) y = a; else y = b;` with `sel === 1'bx` —
   alongside the existing gate-pessimism example.

10. **Complete the latch-inference cases (Synthesis reality check):** partial vector assignment,
    a `for` loop not covering every index, and read-before-write of a block-local temporary. Two
    sentences; all three appear in the alignment and rounding code chapter 9 will write.

11. **Say what `parallel_case` asserts (Synthesis reality check).** The section is required to
    handle the pragmas correctly and currently defines only half the pair.

12. **Attribute or scope the three synthesis-log strings (NB-5),** so the wall between "measured
    here" and "read in a vendor manual" — which the chapter maintains everywhere else — is not
    breached at line 496.

13. **Retitle the line 698 seed to chapter 11 only, and say the multi-cycle FSM adder will not be
    built (Seeds).**

14. **Cut ~2,000 words per "What to cut"** — move four simulation artifacts to chapter 4, merge the
    trap and detection tables, trim the opening section, the FSM section and the checklist.

Items 1–3 are the ones I would block a tapeout-adjacent document on. Everything else is polish on a
chapter that is, on the evidence of 19 green targets, 23 exact listings and 21 reproducing
transcripts, more rigorously built than most published material on this subject.
