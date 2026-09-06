# Chapter 3 Review, Round 2 — Combinational and Sequential Logic

Reviewer: RTL veteran. Re-review after fix round 1.
Environment: Icarus Verilog 13.0 (stable, `v13_0`), macOS 24.6.0 arm64, Homebrew.
Verilator, Yosys, Vivado, Quartus: **not installed** (`which` returns nothing for `verilator` and `yosys`).

<!-- sections complete: 7/7 -->

## Verdict

**Score: 8/10**

Both blocking defects are genuinely closed, and I closed them the hard way — I re-measured BD-1 from scratch with my own minimal files rather than rebuilding the chapter's, and the rewritten callout is true as written, including the `should`-not-`shall` modality that round 1 flagged. The code is again immaculate: harness 20 passed / 0 failed, the `xfail` fails for exactly its stated reason, all 23 Verilog listings are byte-identical contiguous substrings of files on disk, and all 23 output blocks reproduce from a fresh compile-and-run. What holds it at 8 is one real defect the fix round introduced by omission — adding `bad_svalways.v` gave Icarus a *second* `-Wall` diagnostic, which falsifies two surviving sentences that call the array warning Icarus's "only diagnostic anywhere in this chapter", one of them in the detection table itself — compounded by round-1 required change #1 being only half-performed: the chapter text was corrected but `research/ch03-comb-seq.md` still carries the original false claim verbatim, and the fix round's new "Seed for chapter 13" now aims a future chapter straight at it.

## Status of round-1 defects

### BD-1 — the `always_comb` / `always_ff` checking promise — **CLOSED (chapter), STILL OPEN (research notes)**

I did not take the fix round's measurement on trust. I wrote my own file, `m1.v`, containing five
modules and no testbench scaffolding: `always_comb` around an incomplete `if`, `always_comb` around
an incomplete `case`, `always_ff @(posedge clk)` with `q1 = d; q2 = q1;`, an `always_latch`, and a
plain `always_comb`. All five are instantiated under a top module so they genuinely elaborate.

```
$ iverilog -g2012 -Wall -o m1.out m1.v
compile_exit=0
$ vvp m1.out
elaborated y1=1 y2=1
run_exit=0
```

**Zero diagnostics.** Not one character on stderr. This is a stronger measurement than the
chapter's own, because `bad_svalways.v` contains the deliberate `sv_ff_level` module and therefore
always emits one warning; my file contains no such provocation and Icarus still says nothing about
two `always_comb` latches, a blocking `always_ff`, or an `always_latch`. The chapter's claim is
correct and, if anything, understated.

Re-running the chapter's own file reproduces its transcript byte-for-byte:

```
bad_svalways.v:84 warning: Synthesis requires the sensitivity list of an always_ff process to only be edge sensitive. sv_ff_level.lvl is missing a pos/negedge.
  always_comb, sel=11 : y=5
  always_comb, b 5->a : y=5  (held: still a latch)
  always_ff with '=' : q1=1 q2=1 q3=1  (collapsed to one stage)
  always_comb, q 0->5 : y=6  (function read: the list saw it)
PASS bad_svalways (checks absent, inferred list present)
```

compile exit 0, run exit 0. Every element the fix round claims is present: the only warning is the
edge-sensitivity one, the latch survives (`y` holds 5 across `b` 5→a), the `always_ff` shift
register collapses to `q1=q2=q3=1`, and `y=6` proves the inferred list reached inside `f_hidden`.

**Is the rewritten callout true as written?** Line by line, yes:

- "IEEE 1800-2017 §9.2.2.2 and §9.2.2.4 say a software tool *should* check that intent" — correct
  modality. Both clauses use "Software tools should perform additional checks". The chapter's own
  Sources section labels IEEE 1800 "By title (no link asserted)" and tells the reader to "confirm
  section numbers against a copy before quoting", so the epistemic framing is honest. I have no
  copy of 1800-2017 here and say so; the section numbers match my recollection and the assignment
  of `always_comb` to §9.2.2.2, `always_latch` to §9.2.2.3 and `always_ff` to §9.2.2.4 is right.
- "*Should*, not *shall*; a tool that reports nothing is still conforming, and this one reports
  nothing" — correct, and it is the precise correction round 1 asked for.
- "The only `always_*` rule this simulator enforces is that an `always_ff` sensitivity list be
  edge-only, and that is a warning, not an error" — measured true, exit 0.
- "so a reader working only in Icarus gets the documentation and none of the enforcement" — a fair
  and well-phrased summary.
- The one surviving true claim, that `always_comb`'s inferred list includes variables read by
  called functions and that Icarus **does** implement it, is preserved at line 425 and measured.
  The chapter's explanation for the asymmetry — "an inferred list is *computed*, not *checked*" —
  is the right mechanism and is the best sentence added this round.

**The tool claim I cannot verify.** "the checks are real in the tools that implement them, which
includes Vivado, Questa, VCS and Verilator." None of the four is installed (`which verilator` →
not found). I believe the claim is true for all four. **Is the chapter entitled to assert it?**
Mostly, but not in the form it uses — see the Remaining defects section: the chapter maintains an
explicit wall between "measured here" and "read in a manual", enumerates exactly two categories of
unmeasured claims in its closing note, and this is a third category that is not enumerated.
Questa and VCS are never disclosed anywhere as tools absent from this environment.

**Is the chapter honest that Verilator is not installed?** Yes, four separate times, and this is
handled well: line 489 ("none of the three tools is installed in this guide's environment, which is
true of Verilator as well"), line 514 (a latch-finder "you can install today"), line 814 ("Verilator
is not installed in this environment, so … those class names come from its documentation rather
than from a run here"), and line 891 in Sources. No complaint.

**Still open:** round-1 required change #1 ended with "Also fix `research/ch03-comb-seq.md:158` and
`:754`, which are the source of the error, so it does not propagate into chapter 13." That was not
done. The notes still read, verbatim:

- `:158` — "`always_comb` — same as `always @(*)` but the tool *checks* that the block is combinational"
- `:161` — "`always_ff @(posedge clk)` … tools error if the body is not a legal flop template"
- `:165` — "the chapter should mention that `always_comb`/`always_ff` turn several of §9's hazards into compile errors"
- `:526` — "SystemVerilog `always_comb` is `@(*)` plus checking plus one semantic difference"
- `:754` — "**Cure 4 (SystemVerilog) — `always_comb`.** The tool is required to check the block is combinational and must report a latch. … This turns a silent bug into a compile error and is the single strongest argument for using the SystemVerilog block keywords."

The chapter is now right and its source document is still wrong, which is the worst arrangement of
the two. It is made worse, not better, by the fix round's new `> **Seed for chapter 13.**`, which
points chapter 13 at exactly this question ("which tools implement IEEE 1800's *should*-check
rules"). Chapter 13 will be drafted from these notes. STATE.md records the correction in its
narrative log, which is not the same as fixing the artefact a future draft will read.

### BD-2 — detection table contradicting the chapter's conclusion — **CLOSED**

The "nothing at all" cell is gone. Line 803 now reads:

> a linter — `BLKSEQ` again, because the construct is identical and statement order is irrelevant
> to it; code review. **No test can distinguish it**, because it is functionally correct.

That is exactly right, and it keeps the genuinely valuable half of the original claim. The
construct-identity argument ("statement order is irrelevant to it") is the correct reason and is
the one round 1 asked for.

The conclusion at line 822 was reworded and now agrees:

> And then there is the class where **no simulation can help at all**, however good the testbench:
> the accidentally correct blocking assignment again, the vector in an edge expression, the race
> currently giving you the answer you wanted. … **For the first, run the linter.** For the other
> two the detector is **a careful reader following coding rules**.

"no *simulation* can help" replaces "the only detector is a careful reader", and the explicit
"For the first, run the linter" carve-out resolves the contradiction completely. I searched the
whole chapter for any surviving statement that nothing detects the accidentally-correct blocking
assignment and found none. The `MULTIDRIVEN` credit round 1 asked for (NB-6) is present at line 804.

### The twelve smaller round-1 items

| # | Round-1 item | Status | Evidence |
|---|---|---|---|
| 3 | `default:` advice + annotate `fsm.v`'s empty default | **CLOSED** | Line 485: "every `case` **that assigns every variable the block writes** — the qualifier is the whole rule, because `default: ;` is a latch with a comment on it". `fsm.v:124-129` carries an inline four-line comment, quoted verbatim at chapter line 655, plus prose at line 667. |
| 4 | Reset justification | **CLOSED** | Line 577 now says active-low is "not because it matches the fabric — AMD (Xilinx) 7-series and later flip-flop control inputs are active-**High**, so an active-low reset costs an inverter there — but because it is the near-universal convention". Line 573 replaces the recovery/removal guarantee with "turns an unconstrained asynchronous question into an ordinary timing closure problem. It does not answer it." `ASYNC_REG` is named in `reset_sync.v:541` and flagged as out of scope. |
| 5 | §11.5 citation in three places | **CLOSED** | Chapter line 214 attributes the guarantees to §11.4.1 *Determinism* and the implementation licence to §11.4.2 *Nondeterminism*; line 247 keeps §11.5 *Race conditions* only as "the short consequence section". `bad_race.v:5-7` matches. §11.5 genuinely is *Race conditions* in 1364-2005. |
| 6 | Delta cycle + `[inactive region]` label | **CLOSED** | See Code verification. Defined once at line 164, label corrected in the file and the transcript regenerated. |
| 7 | `moore_y` rename | **CLOSED** | `grep -rn "moore_y" chapters/ src/ research/` returns nothing. `reg_y` appears consistently in `fsm.v` (6 sites), `tb_fsm.v` (10 sites) and the chapter (6 sites). Line 696 explains why it is a registered Mealy and not Moore. |
| 8 | Rule 3 rewording | **CLOSED** | Line 357: "Never mix `=` and `<=` in one block." Matches Cummings Guideline #5 as quoted at line 343, and no longer reads as a prohibition on the one-block FSM, which uses `<=` exclusively. |
| 9 | RTL x-optimism example | **CLOSED** | Line 762: "`if (sel) y = a; else y = b;` with `sel === 1'bx` silently takes the `else` branch and reports a confident `y = b`", set against the gate-level pessimism example. The closing "x propagation is a heuristic, not a sound approximation in either direction" is a better summary than round 1 asked for. |
| 10 | Complete the latch-inference cases | **CLOSED, over-delivered** | Line 447 gives four, not three: partial vector assignment, `for` loop not covering every index, read-before-write of a block-local temporary, and the empty `default: ;`. All four are correct. |
| 11 | Say what `parallel_case` asserts | **CLOSED** | Line 518: "that the case items are mutually exclusive, so the tool may build a flat multiplexer instead of a priority chain. If the items do overlap in reality, RTL simulation takes the first match and the netlist takes whatever the flattened logic gives". Correct. |
| 12 | Attribute the three synthesis-log strings | **CLOSED** | Line 489: "Those three strings were **read in vendor documentation, not captured here**", plus the environment disclosure and "Every other block of output in this chapter is real stdout." |
| 13 | Retitle the line-698 seed to chapter 11 only | **CLOSED** | Line 704 is `> **Seed for chapter 11.**` and states "This guide does not build the multi-cycle version: chapter 11 goes straight to the pipeline". |
| 14 | Cut ~2,000 words | **NOT DONE** — see Length judgement below | Net **+2,069** words. |

Latch-on-FPGA folklore (round 1's "family-specific folklore stated as general") is also correctly
scoped now, at line 481: "on some families the latch is built in a lookup table with combinational
feedback, on others the slice's storage element can simply be configured as a latch instead of a
flop", followed by the family-independent objection. That is the right fix.

## New defects introduced by the fix round

### ND-1 — adding `bad_svalways.v` falsified two surviving sentences about Icarus's "only diagnostic" — **REAL DEFECT**

This is the collateral damage. Before the fix round, `bad_arraysens.v` produced the only `-Wall`
warning in the chapter, and two sentences said so. The fix round added `bad_svalways.v`, which
emits a second `-Wall` warning — and the chapter quotes that warning in its own transcript at line
504 — but only one of the two sentences was updated.

Icarus emits, across the whole of `src/ch03/`, exactly these diagnostics (all measured):

| Where | Diagnostic | Flags needed |
|---|---|---|
| `bad_arraysens.v:25` | `warning: @* is sensitive to all 4 words in array 'mem'.` | `-Wall` |
| `bad_svalways.v:84` | `warning: Synthesis requires the sensitivity list of an always_ff process to only be edge sensitive.` | `-Wall` |
| `bad_arraysens.v:26` | `warning: @* is sensitive to all bits in 'v[3:0]'.` | `-Wsensitivity-entire-vector` |
| `bad_zerodelay.v:16` | `error: always process does not have any delay.` | any |

Two sentences are now false:

1. **Line 808, the detection table itself**, third column of the whole-array row: "Icarus — **its
   only diagnostic anywhere in this chapter**". There are two `-Wall` warnings and one error.

2. **Line 390, worse**: "`bad_arraysens.v` reads `mem[idx]` and `v[idx]` in one `@(*)` block, and
   the array half is **the single diagnostic Icarus offers about sensitivity lists anywhere in this
   chapter**". This one is sharper than a counting error, because the `bad_svalways.v` warning is
   *literally about a sensitivity list* — its text is "Synthesis requires **the sensitivity list**
   of an always_ff process to only be edge sensitive". So the narrowing qualifier "about
   sensitivity lists", which presumably felt like the safe hedge, is the exact category in which
   the new warning also falls.

The chapter half-notices this. Line 812 says "`bad_svalways.v` does emit a second `-Wall` warning,
but it is not about any row here". That sentence rescues the *count* in the summary line
("Fourteen bugs; one warning at `-Wall`") — which is correct, exactly one of the fourteen rows
warns — but it flatly contradicts the two sentences above, both of which say "anywhere in this
chapter" rather than "among these fourteen rows". A reader who compiles both files sees two
warnings and one sentence telling them there is one.

Severity: this is a precision failure in the one section whose entire purpose is to count
diagnostics accurately, and it is a defect the fix round created. It will not produce bad RTL, so
it does not put the chapter below 8 — but it is a real defect and it is the single thing standing
between this chapter and a 9.

The fix is two small edits, both scope corrections rather than rewrites: line 808 → "Icarus — the
only one of these fourteen it reports"; line 390 → "the array half is the one diagnostic `-Wall`
volunteers about an `@(*)` list" (or simply drop "anywhere in this chapter" from both).

### ND-2 — no other regressions found

I checked every text the fix round is claimed to have touched, and everything else landed cleanly:

- **The `reg_y` rename** propagated completely. No stale `moore_y` in `chapters/`, `src/` or
  `research/`. `fsm.v`'s own header comment was updated too (`fsm.v:149-153`), which is the kind of
  place a rename usually rots.
- **Rule 3's rewording** did not break the one-block FSM discussion; the one-block style at chapter
  line 632 uses `<=` throughout and so is not touched by "never mix".
- **The §11.5 → §11.4.1/§11.4.2 change** is consistent across chapter line 214, chapter line 247,
  `bad_race.v:5-7` and the Sources entry at line 896. No orphaned §11.5 attribution survives.
- **The retitled seed** (chapter 11 only) left no dangling reference to chapter 12 in that
  paragraph; the chapter-12 seed at line 87 is separate and intact.
- **All eight intra-chapter cross-references resolve** to real `##` headers, checked
  programmatically against the header set. **Zero positional cross-references**: a grep for "the
  next section", "the previous section", "section above/below", "see section N" and "earlier in
  this chapter" returns nothing. Every reference is a quoted section title plus "above"/"below",
  which is the house convention and the thing STATE.md records as having broken in an earlier
  chapter.
- **Cross-chapter references resolve**: chapter 1's "Taming Time With a Clock" (ch01:454),
  "Metastability" (ch01:530), "The setup constraint, and where f_max comes from" (ch01:482);
  chapter 2's "Reduction Operators and the Sticky Bit" (ch02:757) and "`reg` does not mean
  register" (ch02:381).
- **The 22-row Traps table** is fully consistent: every section title in column 2 resolves to a
  real header, and every filename in column 3 exists in `src/ch03/`. The two new rows
  (`bad_svalways.v`, and the `full_case` clause on the latch row) are correct.

## Detection table audit

Fourteen rows, audited cell by cell. For each I asked three questions: is the bug real and
demonstrated by a file in `src/ch03/`, is the Icarus column what Icarus actually does, and is the
detector column drawing the simulator / synthesis / linter / testbench / nothing distinction
correctly. The Icarus column is measured for all fourteen — I compiled every file myself.

**Named linter identifiers: all real, none invented.** The table names exactly three Verilator
warning classes — `LATCH`, `BLKSEQ` and `MULTIDRIVEN` — and all three are genuine Verilator
warnings (latch inference, blocking assignment in a sequential block, and a signal with multiple
driving blocks, respectively). No fabricated check codes anywhere. The vendor strings elsewhere in
the chapter are also real identifiers: Vivado `[Synth 8-327]`, Quartus `Warning (10240)`, Yosys
`$dlatch`, Vivado's `FSM_SAFE_STATE` attribute.

**The self-audit of "four cells name a Verilator warning class" (line 814) is exactly right.** I
counted: rows 2, 5, 7 and 8 name a class; rows 3, 6 and 4 refer back or name tools only. Four.

| # | Row | Bug real? | Icarus column | Detector column | Verdict |
|---|---|---|---|---|---|
| 1 | Incomplete sensitivity list | Yes — `bad_sens.v`, transcript row 3 shows `y_bad` stale at `sel`=1 | **silent** — verified, `bad_sens.v tb_sens.v` compiles with no output | `always_comb` (list computed, not typed — and Icarus *does* implement that, measured); a testbench toggling every input independently. Explicitly **not** synthesis: "it builds the real cone and says nothing" | **Correct.** The `always_comb` credit here is prevention rather than detection and the cell says so ("whose list is computed rather than typed"). Removing the false synthesis credit was a round-1 requirement and it is done. |
| 2 | Inferred latch, incomplete `if` | Yes — `bad_latch.v`, `tb_latch.v` rows 2–3 | **silent** — verified, exit 0, no output | synthesis log; a linter (`LATCH`); a behavioural hold test, "which is what `tb_latch.v` is" | **Correct.** All three detectors are real and correctly typed. |
| 3 | Inferred latch, incomplete `case` | Yes — same file | **silent** — verified | "the same three" | **Correct.** Back-reference is unambiguous. |
| 4 | Either latch, rewritten under `always_comb` | Yes | **silent** — I verified independently with my own `m1.v`, which contains both an incomplete-`if` and an incomplete-`case` under `always_comb` and produces **zero** diagnostics | "a tool that implements IEEE 1800's recommended check — Vivado, Questa, VCS, Verilator. Measured here: **not Icarus** (`bad_svalways.v`)" | **Correct**, and the framing "a tool that implements the recommended check" then naming candidates is the right shape. The four tool names are unverifiable here — see Remaining defects RD-2. |
| 5 | Blocking assignment in a clocked block | Yes — `bad_shift3.v`, collapse visible as `111` in cycle 0 | **silent** — verified | linter (`BLKSEQ`); code review; a test that checks a signal takes N cycles. **Not** synthesis: "it infers one flop and two wires and reports nothing" | **Correct**, and consistent with line 333's claim about what synthesis builds. |
| 6 | Blocking assignment inside `always_ff` | Yes — `bad_svalways.v`, `q1=q2=q3=1` | **silent** — verified twice (chapter's file and my `m1.v`) | "the same three. Measured: the keyword changes nothing on this simulator" | **Correct.** One mild asymmetry: row 4 credits "a tool that implements IEEE 1800's recommended check" for the `always_comb` case but row 6 does not credit the analogous §9.2.2.4 `always_ff` check. Defensible — the standard's `always_ff` recommendation is about the block representing sequential logic rather than about the assignment operator specifically — but the two rows are framed inconsistently. Not a defect. |
| 7 | Blocking assignment that works by luck of statement order | Yes — `bad_shift3.v`'s reversed module produces a *correct* `100/010/001` | **silent** — verified | "a linter — `BLKSEQ` again, because the construct is identical and statement order is irrelevant to it; code review. **No test can distinguish it**, because it is functionally correct." | **Correct — this is the BD-2 fix and it lands.** The construct-identity reasoning is right, `BLKSEQ` genuinely does fire on it, and "no test can distinguish it" is true and is the valuable part of the original claim. Agrees with line 822. |
| 8 | Two `always` blocks writing one `reg` | Yes — `bad_multidrive.v`, last-writer-wins | **silent** — verified | synthesis, as a multiple-driver error; a linter (`MULTIDRIVEN`); code review | **Correct.** The NB-6 understatement from round 1 is fixed. |
| 9 | `#3` delay inside `always @(*)` | Yes — `bad_combdelay.v`, 3 transitions vs 1 | **silent** — verified | "a lint rule banning `#` in a synthesisable file. Nothing else reports it: synthesis silently ignores the delay, and RTL and netlist then disagree" | **Correct.** Synthesis does ignore `#` delays; the "and then disagree" consequence is the right one to draw. |
| 10 | Race between two same-edge blocks | Yes — `bad_race.v`, `b`=0 vs `b`=1 on source order alone | **silent** — verified | the coding rule that makes it unwritable; reordering the source and diffing; a second simulator. "**Not** re-running — measured byte-identical here" | **Correct, and I re-measured the byte-identity claim**: 10 consecutive `vvp` runs produced one distinct MD5, and three independent recompile-and-run cycles produced the same MD5 again. `bad_tbedge.v` likewise: 10 runs, one MD5. The claim is solid. |
| 11 | `posedge` on a multi-bit signal | Yes — `bad_edge.v`, `0000`→`1110` gives no edge | **silent** — verified | code review, and a coding rule banning any vector in an edge expression. "Nothing in this flow reports it" | **Correct**, and "in this flow" is the right scoping — it does not overclaim that no linter anywhere would flag it. |
| 12 | `@*` sensitised to a whole array | Yes | **warns** — verified, `bad_arraysens.v:25` at plain `-Wall` | "Icarus — its only diagnostic anywhere in this chapter" | **Bug and Icarus column correct; detector cell is the ND-1 defect.** There is a second `-Wall` diagnostic in this chapter and the chapter quotes it 300 lines earlier. |
| 13 | `@*` sensitised to a whole vector | Yes | **silent** — verified silent under `-Wall`, and verified that `-Wsensitivity-entire-vector` produces `bad_arraysens.v:26: warning: @* is sensitive to all bits in 'v[3:0]'.` | "Icarus, but only with `-Wsensitivity-entire-vector`, which `-Wall` does not include" | **Correct**, and the `-Wall` membership claim behind it is verified from `man iverilog` (see Code verification). Splitting this from row 12 was a good call. |
| 14 | `always` with no event control and no delay | Yes — `bad_zerodelay.v` | **compile error** — verified, exit 1, `Elaboration failed` | "Icarus, at elaboration — the chapter's only `xfail` target" | **Correct.** |

**Internal arithmetic.** Line 812 says "Fourteen bugs; one warning at `-Wall`; one further warning
available only if you name a class `-Wall` leaves out; one compile error." Rows 1–11 silent (11),
row 12 warns (1), row 13 needs a named class (1), row 14 errors (1). 11+1+1+1 = 14. The arithmetic
is right and the table has exactly 14 data rows.

**Table-versus-prose consistency.** I checked every prose claim in "What the Simulator Will and
Will Not Tell You" against the table and found one contradiction (ND-1, row 12) and no others. In
particular the two claims that were contradictory in round 1 now agree: the table's row 7 and the
prose's line 822 both say a linter catches the accidentally-correct blocking assignment and no test
does. The closing four-detector paragraph (synthesis tool / linter / self-checking testbench / no
simulation at all) maps cleanly onto the table's detector column with no row left unaccounted for.

**Verdict on the table as a whole: trustworthy.** Thirteen of fourteen rows are correct in all
three columns; the fourteenth is correct about the bug and about Icarus and wrong only in a
parenthetical scope claim in its detector cell. Every named linter identifier is real. The
simulator/synthesis/linter/testbench/nothing distinction is drawn accurately throughout, including
the two places where the fix round had to *remove* false credit from synthesis (rows 1 and 5),
which is the kind of correction that is easy to skip and was not skipped.

## Code verification

### Harness — 20 passed / 0 failed, confirmed

```
$ bash run_all.sh ch03
=== ch03 ===
  PASS  sel_mux.v bad_latch.v tb_latch.v
  ... 18 more ...
  PASS  bad_svalways.v
  PASS  (xfail as expected)  bad_zerodelay.v
================================
  passed: 20
  failed: 0
================================
```

Nineteen `run` targets plus one `xfail`. The new `bad_svalways.v` target is genuinely wired into
`targets.txt` and genuinely runs.

Worth noting how the harness treats `bad_*` files, because it is easy to mistake for a weakness and
is not one: `targets.txt` documents that "Files named `bad_*.v` are deliberately wrong. They still
self-check, but they assert the WRONG answer, so PASS from a `bad_*` target means 'the trap still
reproduces on this simulator'." `bad_svalways.v` follows that convention exactly — it `$fatal`s if
the latch stops holding, if the shift register stops collapsing, or if `always_comb` stops seeing
the function read. So the harness would go red if Icarus were ever upgraded to check `always_comb`,
which is precisely the regression the chapter's claim depends on. That is the right way to make a
negative result durable.

### The `xfail` fails for its stated reason — confirmed

The chapter (line 787) and `bad_zerodelay.v`'s own header both predict:

> `error: always process does not have any delay. : A runtime infinite loop will occur.`

Actual:

```
$ iverilog -g2012 -Wall -o /tmp/zd.out bad_zerodelay.v
bad_zerodelay.v:16: error: always process does not have any delay.
bad_zerodelay.v:16:      : A runtime infinite loop will occur.
Elaboration failed
exit=1
```

Same message, same cause, and it is an elaboration failure rather than a parse failure, which is
what "at elaboration" in table row 14 claims. The `xfail` is not passing for an incidental reason
such as a syntax error or a missing file.

### Listings versus files — 23/23 byte-identical

I extracted all 46 fenced blocks from `ch03.md` programmatically, took the 23 tagged `verilog`, and
tested each as an exact contiguous substring of some file in `src/ch03/`. **All 23 matched
exactly** — no whitespace normalisation, no indentation-only tolerance needed:

| Chapter line | File |
|---|---|
| 29 | `tb_regwire.v` |
| 53 | `sel_mux.v` (complete module) |
| 95, 102, 110, 118 | `flop_templates.v` (four templates) |
| 168 | `tb_regions.v` |
| 216, 221 | `bad_race.v` |
| 261, 270 | `tb_swap.v` |
| 294 | `shift3.v` |
| 304, 314 | `bad_shift3.v` |
| 368, 407 | `bad_sens.v` |
| 451, 460 | `bad_latch.v` |
| 532 | `reset_sync.v` (complete module) |
| 589, 631, 655 | `fsm.v` (three styles) |
| 724 | clock idiom — matches 10 testbenches |

The three listings the fix round says it changed are the ones I checked hardest:
`tb_regions.v`'s excerpt (chapter 168 ↔ file 26–35, including the corrected label),
`fsm.v`'s three-block output decode (chapter 655 ↔ file 123–131, including the new four-line
annotation), and `fsm.v`'s two-block module (chapter 589 ↔ file 52–86). All three are exact. The
`reg_y` rename is reflected in both the file and every quotation of it.

### Transcripts versus a fresh run — 23/23 reproduce

I recompiled and re-ran every one of the 19 `run` targets from a clean build directory and compared
each of the chapter's 23 non-Verilog blocks against the captured stdout, line by line and in order.
**All 23 reproduce.** Twenty matched automatically; the remaining three are blockquote-indented or
require non-default flags, and I verified those by hand:

- **Chapter line 401** (`bad_arraysens.v:26: warning: @* is sensitive to all bits in 'v[3:0]'.`) —
  reproduced with `-Wall -Wsensitivity-entire-vector`. Correct that `-Wall` alone does not produce it.
- **Chapter line 493** (the `-Wall` / `-Wextra` compile pair inside the latch callout) — reproduced
  exactly: `sel_mux.v bad_latch.v tb_latch.v` at `-g2012 -Wall` gives no output and exit 0; adding
  `-Wextra` gives `Ignoring unknown warning class extra` and exit 0.
- **Chapter line 503** (the `bad_svalways.v` transcript) — I stripped the `> ` quote prefix and
  diffed against my own compile-plus-run capture. **Byte-identical**, all six lines.

The four transcripts the fix round says it regenerated (`tb_regions`, `tb_fsm`, `bad_svalways`, and
the compile pair) all reproduce. Nothing else drifted: `tb_regwire`, `tb_flop_templates`,
`tb_delta`, `tb_race`, `tb_swap`, `tb_shift3`, `tb_sens` (both halves), `tb_latch`, `tb_reset_sync`,
`bad_clkinit`, `bad_tbedge`, `tb_xprop`, `bad_combdelay`, `bad_multidrive`, `bad_arraysens` and
`bad_edge` all match line for line.

**One small fidelity slip.** The `tb_fsm` transcript is quoted as two blocks (chapter lines 671–677
and 683–692). The real run emits one more row, `t=60 go=0 | one-block 0 0 0 | two-block 0 0 0 |
three-block 0 0 0`, between them, and it is dropped with no ellipsis. The chapter's closing note
promises "Every block of simulator output is real captured stdout". It is real, just silently
truncated at a join. Minor, but the chapter holds itself to a byte-identity standard everywhere
else.

### My own BD-1 measurement

Described in full under Status of round-1 defects. In summary: my own five-module `m1.v`, written
from scratch and containing an `always_comb` incomplete `if`, an `always_comb` incomplete `case`, an
`always_ff` with blocking assignments, an `always_latch` and a plain `always_comb`, compiles at
`-g2012 -Wall` with **zero diagnostics and exit 0**, and the latches are live at run time
(`y1=1 y2=1` held). Icarus 13.0 performs none of IEEE 1800's recommended `always_*` checks. The
chapter's claim is correct.

### Other tool claims I re-measured

- **`-Wall` membership.** `man iverilog` documents `-Wall` as enabling exactly `anachronisms`,
  `implicit`, `macro-replacement`, `portbind`, `select-range`, `timescale` and
  `sensitivity-entire-array` — seven classes, matching chapter line 816 exactly.
- **`sensitivity-entire-vector` and `infloop` exist outside `-Wall`.** Both are documented in the
  man page, and `infloop`'s entry states it "is not included in -Wall". Chapter correct.
- **`infloop` does not fire on the textbook case.** Chapter line 816 claims a three-line module
  containing `always @(*) y = y + a;` compiles silently both with `-Wall` and `-Wall -Winfloop`. I
  wrote that module. Both invocations: exit 0, no output. Claim verified, including the warning not
  to trust the flag.
- **`-Wextra` does not exist.** Verified: `Ignoring unknown warning class extra`, exit 0.
- **Race reproducibility.** Verified as described in detection-table row 10.
- **`unique`/`priority case` checking (chapter line 518: "the simulator checks those").** I tested
  this because it is an unmeasured tool claim in a chapter that measures everything. It is **true**
  on Icarus: a `unique case` and a `priority case` with an unmatched selector both produce
  `WARNING: value is unhandled for priority or unique case statement` at run time. Worth knowing
  that the check is partial — Icarus also prints `vvp.tgt sorry: Case unique/unique0 qualities are
  ignored.`, so the *overlap* half of `unique` is not checked, only the unhandled-value half. The
  chapter's sentence is broad but lands on the right side of true.
- **The `<=` cascade delta cost (chapter line 208).** This is asserted, not measured: "a cascade of
  `=` blocks settles inside **one** promote-and-drain pass however deep it is, while the same
  cascade written with `<=` costs one delta cycle per stage". The `=` half is measured by
  `tb_delta.v`. I tried to measure the `<=` half with successive `#0`s and **could not** — and the
  reason is itself a confirmation of the chapter: the `<=` cascade stays `x` after five `#0`s,
  because each `#0` re-enters the inactive region and the NBA region is scheduled *after* it, so an
  `initial` block spinning on `#0` never lets the NBA region run at all. That is exactly chapter
  line 196's claim ("`#0` … has reached for a queue that runs too early"), demonstrated harder than
  the chapter demonstrates it. Letting time advance instead, the `<=` cascade settles to the same
  `101`. The per-stage claim follows correctly from the chapter's own definition of a delta cycle,
  so it is sound reasoning from measured mechanism rather than an unsupported assertion.

### Scheduling material, re-checked

- **The corrected `tb_regions.v` label is correct, not merely different.** The line now reads
  `[active, after #0]`. Under IEEE 1364-2005 §11.3, `#0` schedules the process continuation into
  the **inactive** region; when the active region empties, inactive events are promoted **into the
  active region** and execute there. So the `$display` after the `#0` genuinely executes in the
  active region, after the `#0`. The label is right, the file and the chapter agree, and the
  regenerated transcript matches. The accompanying prose at line 181 states the mechanism
  explicitly — "The inactive region is a holding pen, not an execution context" — which is the
  correct and rarely-stated formulation. This is a real fix, not a relabel.
- **The delta cycle is defined once**, at line 164: "One **promote-and-drain pass** over those
  queues at a fixed value of `$time` is what everyone calls a **delta cycle**: it advances no
  simulation time." It then notes IEEE 1364 never uses the term, that it is borrowed from VHDL, and
  that the chapter always means the promote-and-drain pass. That is the disambiguation round 1
  asked for, and the term is used consistently at lines 208 and 337 thereafter. No competing
  definition survives anywhere in the chapter.
- **The five regions** are listed correctly and in order (active, inactive, NBA update, monitor,
  future), with the correct note that IEEE 1800 renames monitor to Postponed.
- **The determinism split** is now correct: §11.4.1 for what is guaranteed, §11.4.2 for what is left
  to the implementation, §11.5 as the consequence section. `bad_race.v`'s header comment agrees.

## Remaining defects

### RD-1 — "its only diagnostic anywhere in this chapter" is false in two places — **real defect**

Full treatment as ND-1 above. Chapter line 808 (detection table, whole-array row) and chapter line
390 (prose in the sensitivity section). Line 390 is the more serious of the two because the
`bad_svalways.v` warning it overlooks is itself a sensitivity-list warning. Two-edit fix.

### RD-2 — an unmeasured tool claim asserted without the chapter's own documentation flag

The claim that Vivado, Questa, VCS and Verilator implement IEEE 1800's recommended `always_comb` /
`always_ff` checks appears three times — chapter line 146 (inside an `> **Icarus reality.**`
callout), line 485, and detection-table row 4 — and is never flagged as documentation-derived.

I believe the claim is true. That is not the problem. The problem is that this chapter's entire
selling point is a maintained wall between "measured on this machine" and "read in a manual", and
its closing note (line 901) enumerates **exactly two** exceptions: the three synthesis-log strings,
and the Verilator warning-class names. This is a third category and it is not in the list. The
Sources note at line 891 names the absent tools as "Vivado, Quartus, Yosys and Verilator" —
**Questa and VCS are never disclosed anywhere as tools this environment does not have**, so a
reader has no way to know that half the named enforcement tools were never run.

This matters more than it would in another chapter because it is the *same failure mode as BD-1*, at
lower amplitude: an unmeasured claim about what other people's tools do, placed inside the callout
whose brand is measurement. The fix round replaced a false version with a probably-true version but
did not put it behind the chapter's own epistemic marker.

Fix: one clause at line 146 ("— none of which is installed here; that claim is from their
documentation, not from a run"), and add Questa and VCS to the absent-tools list in Sources.

### RD-3 — `tb_fsm` transcript silently drops a row at the join

Chapter lines 671–677 and 683–692 are two excerpts of one transcript; the `t=60` row between them
is omitted with no ellipsis. Minor, but the chapter promises byte-identity and delivers it
everywhere else. Fix: add the `t=60` row, or an explicit `...` marker.

### Judgement on the three declines

**Decline 1 — moving ~950 words of simulation artifacts to chapter 4: RIGHT, and clearly right.**
Chapter 4 does not exist. You cannot move content into a file that has not been written; the
material would either be lost or would leave chapter 3 with forward references to sections nobody
has drafted. A fix round's remit is closing defects in the artefact under review, and a
cross-chapter restructure is not that. STATE.md already schedules an assembly pass (F1) that merges
chapters and fixes cross-references, which is the correct home for this move. The decline is
recorded in STATE.md with its reason, so it is deferred rather than dropped. My only note is that
it should be an explicit F1 checklist item, not just a line in the narrative log — deferred work
that lives only in prose tends to evaporate.

**Decline 2 — merging the trap and detection tables: RIGHT, and my round-1 recommendation is now
obsolete.** I proposed that merge against a 10-row detection table. The table is now 14 rows and
the trap table is 22, and crucially they are no longer the same information sliced two ways. The
trap table indexes *concepts* — "`reg` does not mean register", "statements in a `<=` block are not
sequential in time", "`always @(*)` does not self-start", "a synchronous reset misses a narrow
pulse" — many of which are not bugs that any tool could detect, and would therefore produce empty
cells in the merged Icarus and detector columns. The detection table is now an argument, not an
index. Merging would have blunted both. The fix round was right and I was wrong.

**Decline 3 — cutting the third FSM style: RIGHT OUTCOME, WEAK REASONING.** The justification given
is that the three-block style "now carries the `default: ;` lesson". That is partly circular: the
fix round put the lesson there in response to required change #3, then used its presence to justify
keeping the section. And the lesson is not unique to that site — line 447 already teaches that "an
**empty `default: ;` arm** is a `default:` arm that assigns nothing and therefore cures nothing" in
"The Accidental Latch". So the section is not the only possible host. I still land on keep, for a
better reason than the one offered: decoding `s_next` to get outputs that are both registered and
in the right cycle is a genuine technique the reader will meet in real code, and chapter 11's
pipeline needs registered outputs. Cutting 350 words from a 15,400-word chapter is not where the
problem is anyway.

### Length judgement — the growth is earned, but the instruction to cut was not followed

13,328 → 15,397 words, **+2,069**, under an explicit instruction to cut ~2,000. Measured per section
against my round-1 counts:

| Round 1 | Round 2 | Δ | Section |
|---|---|---|---|
| 675 | 587 | **−88** | Two Kinds of Logic, and One Language for Both |
| 691 | 692 | +1 | Describing Combinational Logic Three Ways |
| 744 | 936 | +192 | Remembering Things: the Flip-Flop and Its Templates |
| 1369 | 1564 | +195 | How a Simulator Actually Runs Your Code |
| 1300 | 1303 | +3 | Blocking and Non-Blocking, Derived From the Queue |
| 1017 | 1008 | −9 | Sensitivity Lists, and What `@(*)` Really Covers |
| 1169 | 1852 | **+683** | The Accidental Latch |
| 1117 | 1284 | +167 | Reset Strategy |
| 1337 | 1584 | +247 | State Machines |
| 1271 | 1352 | +81 | Simulation Artifacts That Will Cost You an Evening |
| 844 | 1297 | **+453** | What the Simulator Will and Will Not Tell You |
| 526 | 546 | +20 | Traps Beginners Fall Into |
| 465 | 468 | +3 | What You Should Be Able to Do Now |
| 183 | 183 | 0 | Bridge to Chapter 4 |
| 506 | 627 | +121 | Sources for This Chapter |

**The growth is earned.** Every one of the large increases traces directly to a round-1 required
change, and I can account for essentially all 2,069 words: The Accidental Latch (+683) absorbed the
BD-1 callout rewrite, the four extra latch shapes, the `parallel_case` definition, the corrected
`default:` rule and the vendor-string attribution — five separate required changes. What the
Simulator Will and Will Not Tell You (+453) absorbed the table going 10→14 rows, the Verilator
non-installation disclosure and the `infloop` measurement. State Machines (+247) absorbed the
`fsm.v` annotation, the `reg_y` correction and the `default:`-assigning-`x` clause. Remembering
Things (+192) absorbed the rewritten callout and the chapter-13 seed. None of it is padding, and
none of it is the fix round taking the opportunity to say more than it was asked to.

**But the cut was not attempted.** Setting aside the three declines, round-1 item 14 also asked for
four trims that were *not* declined: the opening section (−200 asked), State Machines (−200),
the checklist (−150), and `bad_arraysens` (−150) — about 700 words. Delivered: −88, +247, +3, −9.
Net **−94 against −700**. The opening trim is the only one genuinely performed. State Machines went
the other way, and while that is defensible — required changes #3 and #7 both land in that section
— nothing was cut to offset them.

So: not sprawling, but not disciplined either. The chapter is dense rather than padded; there is no
section I can point to and call filler, and the two queue sections that dominate the word count are
the ones chapters 9 and 11 are built on. I would not block on length. I would say the fix round
chose correctness over concision at every fork, which is the right priority order for a technical
book, and that the length problem is now entirely a structural one that only the chapter-4 move can
solve. That move should be F1's first job.

## Required changes for a 9+

Items 1 and 2 are the difference between 8 and 9. Items 1–4 are the difference between 8 and a
clean 9. Nothing here is a rewrite; the largest is a two-sentence edit.

1. **Fix the "only diagnostic" contradiction (RD-1 / ND-1).** Two edits, both scope corrections.
   (a) Chapter line 808, detection table, whole-array row, third column: change "Icarus — its only
   diagnostic anywhere in this chapter" to "Icarus — the only one of these fourteen it reports".
   (b) Chapter line 390: change "the array half is the single diagnostic Icarus offers about
   sensitivity lists anywhere in this chapter" to "the array half is the one thing `-Wall`
   volunteers about an `@(*)` list". Both must stop claiming chapter-wide uniqueness, because
   `bad_svalways.v:84` is a second `-Wall` warning and is itself about a sensitivity list. Line 812
   already states the true position and needs no change.

2. **Fix `research/ch03-comb-seq.md` (round-1 required change #1, not performed).** Lines 158, 161,
   165–166, 526 and 754–756 still assert that tools are *required* to check `always_comb` /
   `always_ff` and that the keywords "turn several of §9's hazards into compile errors". Replace
   with the measured position now in the chapter: IEEE 1800-2017 §9.2.2.2 and §9.2.2.4 say tools
   *should* check; Icarus 13.0 at `-g2012 -Wall` performs none of those checks; its only `always_*`
   diagnostic is the `always_ff` edge-only sensitivity-list warning. This is not cosmetic — the
   chapter's new `> **Seed for chapter 13.**` points chapter 13 at exactly this question, and
   chapter 13 will be drafted from these notes. Fixing the chapter and leaving its source document
   wrong is the one arrangement that guarantees the error comes back.

3. **Flag the Vivado/Questa/VCS/Verilator enforcement claim as documentation (RD-2).** Add a clause
   at chapter line 146 marking it as not measured here, and add Questa and VCS to the absent-tools
   list in Sources (line 891), which currently names only Vivado, Quartus, Yosys and Verilator. The
   chapter's two-exception closing note (line 901) should become three.

4. **Restore the dropped `t=60` row in the `tb_fsm` transcript (RD-3)**, or mark the join with an
   ellipsis, so the byte-identity promise holds without exception.

5. *(Optional, for consistency rather than correctness.)* Detection-table row 6 credits "the same
   three" for a blocking assignment inside `always_ff`, while row 4 credits "a tool that implements
   IEEE 1800's recommended check" for the `always_comb` latch. Consider naming the §9.2.2.4 check
   in row 6 as well, or explaining why the two are asymmetric.

6. *(Optional.)* Chapter line 208's claim that a `<=` cascade "costs one delta cycle per stage" is
   sound reasoning from the measured mechanism but is the only load-bearing scheduling claim in the
   chapter that is not directly demonstrated. `tb_delta.v` could grow a non-blocking cascade
   alongside its blocking one. Doing so would also let the chapter show the striking result I hit
   while checking it: a `<=` cascade probed with `#0` never settles at all, because a process
   spinning on `#0` re-enters the inactive region forever and the NBA region never gets promoted.
   That is the strongest possible demonstration of the chapter's own `#0` argument.

### Carry-forward for the assembly pass

Not defects, but they should not be lost: the chapter-4 move (~950 words of testbench-shaped
material in "Simulation Artifacts That Will Cost You an Evening") remains outstanding and correctly
deferred. It should be an explicit F1 checklist item rather than a line in STATE.md's narrative,
along with a re-check that the four moved items' forward hooks — the `$strobe`/`$display` pointer
and the `tb_xprop.v` sticky-bit seed into chapter 9 — survive the move.

### Closing note

The engineering underneath this chapter is exceptional and got better this round: 20 green targets,
23 listings byte-identical to disk, 23 transcripts reproducing from a cold build, a deliberately
failing target that fails for the documented reason, and a new negative-result target that will go
red if the negative result ever stops being true. Both blocking defects are properly closed, and
BD-1 was closed by measurement rather than by hedging. The remaining defect is a scope word in two
sentences, and the remaining process failure is a research note nobody went back to. Fix those and
this is a 9.
