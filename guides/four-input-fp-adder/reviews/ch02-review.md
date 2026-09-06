# Chapter 2 Review — The Verilog Language

**Reviewer persona:** pedagogy expert (HDL course designer, technically literate, runs the code)
**Reviewed:** 2026-08-09
**Toolchain:** Icarus Verilog 13.0 (stable) `v13_0`, macOS 24.6.0 arm64, Homebrew

<!-- sections complete: 7/7 -->

## Verdict

**Score: 7/10**

This is the most rigorously verified first-contact chapter I have reviewed: `run_all.sh ch02` is green at 24/24, ten full listings are byte-identical to their files on disk, and every one of the twenty-odd captured simulator outputs reproduces exactly, character for character, on a fresh run — there is no fabricated output anywhere in it, and the teaching order, the intuition-first discipline and the chapter 3 boundary are all close to exemplary. It is held back by four defects, of which one is serious: the chapter defines the FP sticky bit correctly ("the OR of everything beyond" guard and round) and then, ten lines later, ships `align_sticky.v` as "the alignment shifter with its sticky bit attached" when that module ORs the guard and round positions *into* sticky and exposes neither, so a reader who carries it into chapter 9 builds a datapath that cannot round to nearest-even. The other three are a wrong toolchain-phase claim, a "verified" behavioural claim that is false on Icarus 13.0, and a silent parameterisation failure in that same `align_sticky.v` — all four are small, local fixes, and with them closed this is a 9.

## Code verification

### Harness

```
$ cd guide/src && bash run_all.sh ch02
=== ch02 ===
  PASS  half_adder.v tb_half_adder.v
  ... (24 targets)
  PASS  (xfail as expected)  bad_nettype_none.v
================================
  passed: 24
  failed: 0
================================
```

**Green, 24/24.** The one `xfail` target (`bad_nettype_none.v`) fails to compile exactly as the
manifest requires. `targets.txt` covers all 36 `.v` files.

### Listing-versus-file comparison

I extracted every fenced ` ```verilog ` block from `chapters/ch02.md` mechanically (28 blocks) and
diffed each against `src/ch02/`. Result:

| Chapter line | File | Result |
|---|---|---|
| 60 | `half_adder.v` | **byte-identical, whole file** |
| 93 | `tb_half_adder.v` | **byte-identical, whole file** |
| 173 | `adder_ansi.v` | **byte-identical, whole file** |
| 212 | `adder_1995.v` | **byte-identical, whole file** |
| 397 | `comb_max.v` | **byte-identical, whole file** |
| 447 | `byte_select.v` | **byte-identical, whole file** |
| 737 | `align_sticky.v` | **byte-identical, whole file** |
| 1104 | `full_adder.v` | **byte-identical, whole file** |
| 1134 | `ripple4.v` | **byte-identical, whole file** |
| 1241 | `lzc8.v` | **byte-identical, whole file** |
| 252 | `bad_positional.v` | exact contiguous substring |
| 335 | `mux2.v` | exact contiguous substring |
| 861 | `adder_ansi.v` | exact contiguous substring |
| 972 | `mant_add.v` | exact contiguous substring |
| 986 | `bad_mant_add.v` | exact contiguous substring |
| 1006 | `bad_carry_always.v` | exact contiguous substring |
| 1200 | `bad_begin_end.v` | exact contiguous substring |
| 288 | claimed `bad_implicit.v` | **not a contiguous substring of the named file** — see non-blocking #2 |

The remaining ten blocks are illustrative fragments with no backing file (the opening three-line
hook, the `localparam` FP sketch, the three instantiation styles, the array and `signed`
declarations, `a && b` / `a & b`, `r8 = a + b` / `r8 = {a + b}`, the wide-intermediate fix, the
net declaration assignment, and the `$dumpfile` pair). All ten are syntactically and semantically
correct; I compiled the non-trivial ones.

**No drift.** This is unusually clean — I expected to find at least one stale listing and found none.

### Captured simulator output

I recompiled and re-ran all 24 targets from scratch into a scratch directory and diffed the real
stdout/stderr against every output block quoted in the chapter. **Every block reproduces exactly.**
Spot-list of the ones that matter most:

| Chapter line | Claim | Re-run result |
|---|---|---|
| 145 | `tb_half_adder` four rows + `PASS` + `$finish called at 4000 (1ps)` | identical, including the `tb_half_adder.v:34` line number |
| 258 | `bad_positional` two `portbind` warnings, `sum=45` / `sum=201` | identical |
| 296 | `bad_implicit` `good = zzzz ($bits = 4)`, `godo = 0 ($bits = 1)` | identical |
| 308 | `bad_nettype_none.v:13: error: Net godo is not defined in this context.` | identical |
| 348 | `tb_mux2` five rows including `sel=x -> y=ax` | identical |
| 377 | `tb_drivers` wire/wand/wor resolution + `{vdd,gnd,vdd,gnd} = 1010` | identical |
| 469 | `byte_select` all four `idx` rows | identical |
| 553–627 | every `tb_literals` block (bases, `x`/`z` fill, signed, `-4'd7`, fill literals, `4'd31` warning, the binary32 constant) | identical |
| 679–730 | every `tb_operators` block (logical vs bitwise, all six reductions, `x` propagation, four equalities, wildcard, concat, sticky) | identical |
| 899–962 | every `tb_widths` block, including `1 << 40` all four cases and `r4 = 8'hFF` with no diagnostic | identical |
| 1034–1072 | every `tb_signedness` block (`sa / ua2 = 124`, `s4 * 4'd2 = 28`, `(-8'sd1 < 8'd0) = 0`, extension rules, concat unsigned) | identical |
| 994 | `tb_mant_add` correct vs broken carry | identical |
| 1010 | `bad_carry_always` `@* found no sensitivities` + `carry=x` | identical |
| 1223 | `bad_casex` all four selectors, including `sel=x000 : casex -> 1xxx casez -> default` | identical |
| 1272–1286 | `tb_lzc8` and `tb_procedural` (t=0.000 to t=0.000, three delayed iterations) | identical |
| 1333–1391 | every `tb_systasks` block including the six `$random % 16` draws and the `INFO`/`WARNING`/`ERROR` triple | identical |

**Zero fabricated or stale output.** The chapter's central claim — "every block of simulator output
is real captured stdout from running it" — holds.

### Independent re-derivation of load-bearing claims

I did not take the chapter's word for the width, signedness and toolchain rules; I wrote fresh
probes.

| Claim | Chapter line | Probe result |
|---|---|---|
| `-ghelp` lists exactly `1995 2001 2005 2005-sv 2009 2012` | 51 | **confirmed verbatim** |
| default generation is `-g2005` | 51 | **confirmed** — `assign` to a `reg` is rejected with no `-g` and at `-g2005`, accepted at `-g2012` |
| `-Wall` = exactly 7 classes, excludes `infloop` / `sensitivity-entire-vector` | 1415 | **confirmed verbatim from `man iverilog`** |
| fill literals at `-g2005` warn rather than error | 619 | **confirmed**, warning text matches character for character |
| `$bits(integer)` = 32, `$bits(time)` = 64 | 371–372 | **confirmed** |
| `a & MASK == 0` parses as `a & (MASK == 0)` | 668 | **confirmed** — gives 0 where `(a & MASK) == 0` gives 1 |
| `**` is left-associative | 652 (prec. table) | **confirmed** — `2**3**2` = 64, not 512 |
| `?:` selector is self-determined | 891 | **confirmed** — `(4'hF+4'h1) ? 1 : 2` returns 2 |
| reduction and `&&` operands are self-determined | 893 | **confirmed** — `\|(4'hF+4'h1)` = 0 |
| `defparam` produces no anachronism warning under `-Wall` | 281 | **confirmed** — silent, and `P` really becomes 99 |
| `$error` exits 0, `$fatal(1,…)` exits 1 | 1380–1381 | **confirmed** |
| `'w' is not a valid l-value for a procedural assignment` | 1191 | **confirmed verbatim** |
| `always process does not have any delay. : A runtime infinite loop will occur.` | 1193 | **confirmed verbatim** |
| `genvar is missing for generate "loop" variable 'i'` | 1295 | **confirmed verbatim** |
| variable-both-bounds part-select is illegal | 476 | **confirmed** — `Part select expressions must be constant integral values.` |
| unsized literal illegal inside `{}` | 858 | **confirmed** — `Concatenation operand "'d31" has indefinite width.` |
| `$stop` with stdin closed prints `** Continue **` and runs on | 1382 | **confirmed verbatim** |
| unrecognised system task is a **compile-time** error | 1396 | **REFUTED — see blocking defect 2** |
| non-`automatic` recursion "returns garbage" | 1310 | **REFUTED — see blocking defect 3** |

### Citations

All four URL-bearing sources resolve and say what the chapter says they say. I fetched
`https://standards.ieee.org/ieee/1364/3641/` and confirmed the status field reads **"Superseded
Standard"**, superseded by IEEE Std 1800-2009, exactly as claimed at line 49. (Note for the
orchestrator: that URL returns 403 to `curl`/bots but fetches fine with a browser user agent — it
is a live citation, not a dead one.) The Wikipedia and both Icarus documentation pages return 200.

**No `[title-only]` source has been given an invented URL.** Sources 8–19 are cited by author,
title, edition and clause with no link asserted, which is exactly the convention STATE.md
established in chapter 1. Load-bearing claims are attributed properly: the width and signedness
rules point at IEEE 1364-2005 Clause 4, the `casex` ban at Mills & Cummings SNUG 1999, and every
behavioural claim at the local machine-verified toolchain (sources 5–7). The one gap is that the
two claims I refuted below are stated in the same "verified" voice as the ones that are true, with
no distinguishing hedge.

## Blocking defects

Four. The first is the one that matters: it is on a topic the brief flagged as load-bearing, and it
propagates into chapter 9.

---

### 1. The chapter defines the sticky bit correctly, then ships a module that computes something else and calls it the sticky bit

**Location:** lines 724–776 (the "Seed for chapter 8" callout, `align_sticky.v`, and the prose
around it); reinforced by the checklist item at line 1472.

**What the chapter says.** Line 724, defining the term:

> The guard and round bits are the first two shifted-out positions; the **sticky** bit is the OR of
> everything beyond them, and it is what distinguishes an exact tie … from a value that is merely
> close to a tie.

That is the correct, standard definition. Ten lines later the chapter says "That idiom is small
enough to build right now" and presents `align_sticky.v` as "the alignment shifter with its sticky
bit attached" and "the shape chapter 8 needs". But the module computes:

```verilog
  assign aligned = shifted[2*W-1 -: W];
  assign sticky  = |shifted[W-1:0];
```

`shifted[W-1:0]` is **every** discarded bit, guard and round included. So the module's `sticky` is
`G | R | S`, not `S`. And because `aligned` keeps only the top `W` bits, the guard and round
positions are not exposed anywhere — they are absorbed into `sticky` and destroyed.

The slip is already visible inside the callout itself, which defines sticky as "the OR of everything
beyond [guard and round]" and then immediately says "One reduction OR over **the discarded bits**
computes it", demonstrating with `|sticky_src[4:0]` — an OR over all five discarded bits.

**Why it is blocking.** Round-to-nearest-even needs to distinguish "exactly half an ULP" from "more
than half an ULP". With only `G|R|S` folded into one bit that is impossible: a value that is exactly
a tie (`G=1, R=0, S=0`) and a value just above a tie (`G=1, R=1`) both present as `sticky=1` with no
guard bit available. A reader who takes `align_sticky.v` forward — and the chapter tells them twice
to, via "the shape chapter 8 needs" and the "Seed for chapter 9" barrel-shifter callout at line 478
— builds an aligner whose rounding logic cannot be written at all. This is exactly the class of
silent, plausible-on-easy-inputs bug the chapter's own "Seed for chapter 9" at line 1024 warns
about, committed in the chapter's own reference module.

I confirmed the module's behaviour directly: at `W=24`, `mant=24'h000010`, `shamt=5`, it reports
`aligned=000000 sticky=1` — correct as an inexactness flag, useless as a rounding input, because
the `1` that fell into the guard position is indistinguishable from a `1` that fell three places
below it.

**Correct version.** Either fix the prose or fix the module; fixing the module is better because it
is the artefact that travels.

```verilog
  assign aligned = shifted[2*W-1 -: W];
  assign guard   = shifted[W-1];          // first shifted-out position
  assign round   = shifted[W-2];          // second
  assign sticky  = |shifted[W-3:0];       // everything beyond them -- the real sticky bit
```

with the ports widened accordingly. If the writer prefers to keep the module minimal, the minimum
acceptable fix is one sentence immediately after the listing, saying plainly that this module's
`sticky` output is the coarser "did anything at all fall off" flag, that it is *not* the IEEE sticky
bit defined in the callout above, and that chapter 8 will split guard and round back out of it. As
it stands the same word means two different things eleven lines apart, and the code implements the
wrong one.

---

### 2. "An unrecognised system task is a compile-time error" is false — and it undercuts the CI advice given twelve lines earlier

**Location:** line 1396, in the closing "Icarus reality" callout of the toolchain section.

**What the chapter says:**

> Also useful: an unrecognised system task is a *compile-time* error
> (`System task/function $nosuchtask() is not defined by any module`), so you can probe support
> cheaply.

**What actually happens.** The quoted error text is verbatim correct, but the phase attribution is
wrong. `iverilog` compiles the file **successfully**:

```
$ iverilog -g2012 -Wall -o f.vvp f.v
$ echo $?
0
$ vvp f.vvp
f.v:2: Error: System task/function $nosuchtask() is not defined by any module.
f.vvp: Program not runnable, 1 errors.
$ echo $?
1
```

The diagnostic comes from `vvp` at program load, before time advances — not from the compiler.
Identical behaviour for the function form (`$nosuchfunc(3)`).

**Why it is blocking.** Two reasons, and the second is the sharp one.

First, the chapter's entire opening framing is a three-phase model — "The tool chain has three
distinct phases, and readers conflate them constantly" (line 25) — and this callout conflates two of
them. A chapter that makes phase discipline its opening lesson cannot misattribute a phase in its
own toolchain reference.

Second, twelve lines earlier at line 1410 the chapter recommends `-t null` as "a fast syntax gate
for CI". I ran that gate against a file using an undefined system task:

```
$ iverilog -g2012 -Wall -t null f.v
$ echo $?
0
```

The recommended CI gate passes clean on a design that cannot run. A reader who believes line 1396
will build a CI job that reports green for exactly the failure mode line 1396 told them it would
catch.

**Correct version:** "an unrecognised system task is not a compile error — `iverilog` accepts it,
and even `-t null` reports success. `vvp` refuses to load the program
(`System task/function $nosuchtask() is not defined by any module` … `Program not runnable`) and
exits 1. So you can probe support cheaply, but you must actually run `vvp` to do it: a `-t null`
syntax gate will not catch an unsupported system function."

---

### 3. "Without `automatic`, that same recursive function returns garbage" is false on Icarus 13.0

**Location:** line 1310.

**What the chapter says:**

> You need `automatic` for recursion — verified working, `fact(5) = 120` — and for concurrent
> invocation from multiple processes. **Without it, that same recursive function returns garbage,
> because the single static copy of `n` is clobbered by the recursive call.**

**What actually happens.** "That same recursive function" is `fact` in `tb_procedural.v`:

```verilog
  function automatic integer fact;
    input integer n;
    begin
      if (n <= 1) fact = 1;
      else        fact = n * fact(n - 1);
    end
  endfunction
```

Delete `automatic` from that exact function and Icarus 13.0 returns **120 — the correct answer**:

```
static fact(5)=120  automatic fact(5)=120
```

The claim is only true for a different formulation. Writing the recursive call first,
`f1 = f1(n-1) * n`, returns 1; hoisting into a local temp also returns 1. So the outcome is
evaluation-order-dependent, and the ordering the chapter itself uses is the one that survives.

The stated *mechanism* is also wrong. What gets clobbered is not (only) the argument `n` — it is the
shared static return variable. In the `n * fact(n-1)` ordering Icarus reads `n` before the call and
consumes the return value immediately, so the clobber is harmless; in the `fact(n-1) * n` ordering
it is not.

**Why it is blocking.** It is a behavioural claim stated in the chapter's "verified" voice, with a
"verified" parenthetical attached to the adjacent true half of the sentence, in a chapter whose
closing line asserts that every behavioural claim rests on a local machine run. It is also the only
trap in the chapter with **no backing file** — every other trap has a `bad_*.v` that reproduces it
and is checked by `run_all.sh`. Had one existed, this would have been caught.

**Correct version:** "You need `automatic` for concurrent invocation from multiple processes, and
for recursion to be reliable. Without it there is one static copy of the arguments and of the return
variable, shared by every invocation, so whether a recursive function works depends on evaluation
order: verified on Icarus 13.0, `fact = n * fact(n-1)` happens to return the right answer while
`fact = fact(n-1) * n` returns 1. Do not rely on either — write `automatic`."

---

### 4. `align_sticky.v` silently degrades to a pass-through whenever `W >= 2**SHW`

**Location:** `src/ch02/align_sticky.v` line 755, quoted verbatim at chapter line 755.

```verilog
  localparam [SHW-1:0] SH_MAX = W[SHW-1:0];
```

**What is wrong.** `W[SHW-1:0]` truncates `W` to `SHW` bits. The module is a parameterised,
explicitly forward-seeded building block ("the shape chapter 8 needs"), so a reader *will* change
`W`. At `W = 32, SHW = 5` — an entirely plausible setting for a padded significand — `W[4:0]` is
`0`, so `SH_MAX` is 0 and **every** shift amount saturates to zero. Verified:

```
W=32,SHW=5: mant=000000ff >> 8 -> aligned=000000ff sticky=0  (expect aligned=00000000 sticky=1)
```

The aligner does nothing, the sticky bit is stuck at 0, and there is no warning of any kind at
compile time. `W=24, SHW=4` is broken the same way: `24[3:0]` is 8, so shifts of 9 to 15 are
wrongly clamped to 8.

**Why it is blocking.** This is a silent width truncation inside the chapter that teaches silent
width truncation — in the one module the chapter hands forward to the floating point chapters. The
existing testbench cannot catch it because it only exercises the single safe parameter pair
(`W=24, SHW=5`).

**Correct version:**

```verilog
  localparam [SHW-1:0] SH_MAX = (W >= (1 << SHW)) ? {SHW{1'b1}} : W[SHW-1:0];
```

and add a second instantiation at a different `W`/`SHW` to `tb_align_sticky.v` so the manifest
covers it. Better still, since the chapter is about writing widths down on purpose, make the failure
loud rather than silent — the honest fix is a comment stating the module's precondition
(`SHW` must satisfy `2**SHW > W`) alongside the guarded `localparam`.

## Pedagogical assessment

### Time to first green run: excellent

The two commands appear at line 137 of 1521 — **9% into the chapter, about 1,700 words in** — and
they are preceded by a complete, runnable, self-checking pair of files and followed immediately by
real output ending in `PASS`. For a first-contact language chapter this is close to the best case.
The reader is compiling before they have been asked to absorb a single width rule.

The framing section that precedes it (1,079 words) earns its place because it opens with three lines
of code and a question, not with a definition:

> The question: what happens if you swap the first and the last line?
> The answer is *nothing*.

That is the right hook and the right lesson, and it is the one thing a programmer must un-learn.
Line 19 — "**You are writing down a structure that exists all at once**" — is the sentence the whole
chapter hangs on, and it is delivered on page one.

### Intuition-first compliance: followed, consistently

Every one of the ten top-level sections opens with a concrete provocation rather than a definition.
I checked all of them:

| Section | Opening move |
|---|---|
| Describing a Machine | three lines of code + a question |
| Your First Module | "Enough framing. Open an editor and make a directory." |
| Modules, Ports | "A half adder with fixed one-bit ports is not much of a building block." |
| Wires, Variables | "Ask a simulator what value a wire has before anything drives it, and it will not say zero." |
| Writing Numbers Down | "How many bits is `8'hFF`?" |
| The Operators | "Two expressions, one keystroke apart" |
| Width and Signedness | "The first gives 16. The second gives 0." |
| `assign` | "You have been using `assign` since the first listing. Now the definition…" |
| Procedural Blocks | "Some hardware is awkward to write as one expression." |
| The Toolchain | "Two of the lines at the top of every listing in this chapter start with a backtick." |

The only section that opens with a definition is `assign`, and it does so explicitly *because* the
reader has been using the construct for a thousand lines — "You have been using `assign` since the
first listing" is formalism-after-intuition done deliberately, not a lapse. The subsection openings
are looser (`### Nets and variables are different kinds of thing` opens "A **net** models a wire.")
but the parent section has already supplied the hook in every case.

The best-executed section in the chapter is **Width and Signedness**. It opens with two lines that
differ by a pair of braces and produce 16 and 0, states the rule in a single table, and then walks
seven cases with real output, one paragraph each. That is exactly how to teach a rule that has no
intuitive content: consequence, rule, consequence again. It is 2,181 words and I would not cut one
of them.

### Concept-before-introduction: three real cases, all survivable

The chapter is mostly disciplined about this, and where it defers a rule it usually says so
explicitly and well — "`reg` for the driven signals and `wire` for the observed ones is a rule we
will make precise shortly" (line 160) is the right move. Three places break it:

1. **`task … endtask` at line 104**, in the very first testbench, roughly 1,200 lines before
   `function` and `task` are introduced at line 1297. The chapter then says "Three things in the
   testbench deserve immediate attention" and lists instantiation, `initial` and `!==` — the task is
   not among them. A reader with zero Verilog is looking at `task check; input exp_sum;` with no
   explanation of why the argument has no type and no parentheses. This is the most jarring
   unexplained construct in the chapter.

2. **`always @(*)` in `comb_max.v` at line 408**, about 770 lines before "A First Look at Procedural
   Blocks". This one is structurally forced — `comb_max.v` is the `output reg` demonstration and it
   has to live where `reg` is discussed — and the abstraction-level table at line 43 does preview
   the exact construct. But the semantics arrive much later, and the reader is asked at line 425 to
   accept "`reg` appears only because Verilog requires the target of a procedural assignment to be a
   variable" without knowing what a procedural assignment is.

3. **`!==` at line 162.** The chapter flags it ("the check uses `!==`, not `!=`") and then the trap
   callout that follows explains only the `$fatal` half of the sentence. The `!==` dangle is left
   open until line 778. Unlike the `wire`/`reg` case it is not explicitly deferred.

All three are fixable with one sentence each. None would make a reader give up.

### Cognitive load

16,608 words is very long, but the raw number overstates it: **13,808 words are prose and 2,632 are
code and captured output**. The chapter is also unusually well-chunked — 14 top-level sections and
22 subsections, so the median unit is under 400 words, and no single subsection exceeds 700. There
is no place where a beginner loses the thread inside a section.

Where the load genuinely bites is the **back third**. By the time the reader reaches "Traps
Beginners Fall Into" at line 1433 they have absorbed the width algorithm, signedness contamination,
structural composition, procedural blocks, `casex`, unrolled loops, functions and tasks, directives,
system tasks and the command line — and then they are given a 20-bullet recapitulation of the whole
chapter (793 words), followed by a 21-item checklist (511 words), followed by a bridge that
recapitulates again (207 words). That is **1,511 words — 9% of the chapter — of pure
recapitulation**, arriving at exactly the point of maximum fatigue. See "What to cut".

The other load problem is that the chapter front-loads its two hardest sections back to back:
"Width and Signedness" (2,181 w) immediately follows "The Operators" (1,916 w), so the reader gets
4,100 words of dense rule-learning with no build-and-run break between them. Both sections have real
output in them, but neither hands the reader a module to compile. A short "build this now" beat
between them would help.

### The chapter 3 boundary: the strongest thing in the chapter

This is handled better than I expected, and better than most published Verilog books manage.

- I grepped for leakage. **`<=` never appears as an assignment operator anywhere in the chapter body
  or in any of the 36 source files** (the only match in `src/ch02/` is `if (n <= 1)`, a relational).
  `posedge` appears exactly three times, and every occurrence is an explicit deferral.
- Line 1189 draws the line cleanly: "For this chapter you need exactly one form: `always @(*)` …
  The other form, `always @(posedge clk)`, builds flip-flops and belongs to chapter 3."
- The Seed callout at line 1312 is a model of how to hand a rule forward without half-teaching it:

  > This chapter has used only `always @(*)` with `=`, and `initial` in testbenches, on purpose.
  > **Why** it must be `=` here and `<=` there is the next chapter's first job.

  It names the rule's existence and withholds the rule. Nothing here will have to be un-taught.
- Line 1173 does the same for the sequential race case: "that is chapter 3's territory."
- The bridge at line 1486 makes the gap *felt* rather than merely announced — "Everything you have
  built so far has one thing in common — it forgets" — which is the right way to motivate a chapter
  on state.

One minor blemish: line 1217 states the latch-inference rule for a `case` without a `default`, while
line 1312 lists "latch inference from an incomplete `if`" as chapter 3's property. This is
duplication rather than a half-rule — what the chapter states is correct and will not need
retracting — but the two sentences should be reconciled so chapter 3 does not appear to be
re-teaching something already covered.

### The checklist

There are **no exercises**; the chapter ends with a 21-item "What You Should Be Able to Do Now"
checklist. I went through all 21 against what the chapter actually teaches. **Twenty are properly
supported** — each maps to a section that states the rule, and in most cases to captured output that
demonstrates it. Specifically I confirmed that a reader who absorbed only this chapter can do items
2 (three phases), 5 (`wire`/`reg` output rule, line 237), 9 (`4'bx1`, `4'sb1001`, `-4'd7`,
`$bits('1)` — all four appear with real output), 13 (the self/context table lists five
self-determined positions, so "list four" is answerable), 15 (`(a+b) >> W` and both fixes, lines
986–1022), 18 (the four `-Wall` blind spots are named twice, lines 967 and 1419) and 21 (the
non-synthesisable list at line 1448).

The one unsupported item is **line 1472: "Write the sticky-bit computation for an alignment shift"**
— unsupported because of blocking defect 1. A reader who absorbed this chapter would write
`|shifted[W-1:0]` and believe they had written the sticky bit.

The gap is not correctness but *modality*. Only three of the 21 items ("write a module from
scratch… and compile and run it", "write a self-checking testbench", "write a byte selector") ask
the reader to produce anything; the other eighteen are "say why", "state the rule", "predict the
value" — recall, not practice. For the reader's **first contact with a language**, that is the wrong
ratio. Chapter 1 could get away with a recall checklist because it had no tool; chapter 2 has a
compiler and 36 working files and should be exploiting them.

### Does a real beginner survive this chapter?

Yes. The pacing is good, the hook is right, the first success comes early, every claim is backed by
output they can reproduce, and the traps are demonstrated with running code rather than asserted.
The three things that would hurt a real beginner are, in order: the unexplained `task` in the first
testbench; the recapitulation pile-up at the end, which reads as three endings in a row; and the
absence of anything to *do* between "Width and Signedness" and the checklist. None of them is fatal.

The reader who finishes this chapter can write and run a parameterised module with a self-checking
testbench, can predict what `{a + b}` does to a carry, and knows not to trust `-Wall`. That is
precisely what chapter 9 will need from them — with the single exception of the sticky bit, which
they will have learned wrong.

## What to cut

The length is **partly** earned. I am not going to ask for a 20% haircut across the board, because
the sections that make this chapter valuable are the long ones and cutting them would be vandalism.
But roughly 1,900 words — 11% — can go without the floating point adder losing anything, and most of
the saving is concentrated in material that is either recapitulation or general-Verilog completeness
that this narrow-and-deep guide does not need.

### Defend these — do not touch them

- **Width and Signedness (2,181 w).** The single most valuable section in the chapter and the one
  that pays for chapter 9. Every worked case is distinct and every one has real output. Keep whole.
- **The Operators (1,916 w).** Reduction operators and the equality family are both load-bearing;
  the sticky-bit subsection is the FP payload. Keep, subject to the defect-1 fix.
- **Your First Module (957 w).** This is where the reader gets their first green run. Untouchable.

### Cut or move — concrete list

| # | What | Location | Saving | Rationale |
|---|---|---|---|---|
| 1 | **"Traps Beginners Fall Into" in full** | 1433–1456 | **~790 w** | Twenty bullets, every one already stated in situ, most of them already inside a `> **Trap.**` callout. It is the third ending in a row. Replace with a 12-row table of `trap → section → file`, ~180 w. Net saving ~610 w. |
| 2 | **The history and standards-lineage paragraphs** | 47–51 | **~330 w** | Goel/Moorby/Huang, Gateway, OVI, the 1364→1800 merge. Charming, cited, and of zero value to the FP adder — and it lands *before* the reader has compiled anything, which is the worst possible position for optional material. Move to an appendix or a boxed sidebar; keep only the two sentences that explain why the flag is spelled `-g2012`. |
| 3 | **Exotic net types and switch-level material** | 362–366, 1175 | **~230 w** | `tri`, `wand`, `wor`, `uwire`, drive strengths, `pullup`/`pulldown`, UDPs. The FP adder has exactly one driver per net and no three-state anything. Keep the multiple-driver→`x` lesson (it is a real debugging heuristic and `tb_drivers.v` demonstrates it); cut `wand`/`wor`/`uwire`/strengths/UDPs to a single "these exist, you will not need them" sentence. |
| 4 | **"The command line, in full"** | 1398–1431 | **~200 w** | Chapter 4 owns the toolchain. Keep the two-line invocation, the `-Wall` membership list and the four-things-`-Wall`-misses paragraph — those are load-bearing. Move `-s`, `-I`, `-D`, `-c`, `-E`, `-t null`, `-gstrict-expr-width` and the Makefile fragment to chapter 4. |
| 5 | **Verilog-1995 non-ANSI port list** | 209–235 | **~150 w** | "Read non-ANSI, write ANSI" is a fair point but it costs a full 20-line listing, a source file and a build target to make. Shrink to a 6-line inline fragment showing the header/direction split; drop `adder_1995.v` and fold `tb_port_styles.v` into `tb_adder_ansi.v`. |
| 6 | **`$readmemh` / `$readmemb` and `$dumpfile` / `$dumpvars`** | 1367–1376 | **~110 w** | Chapter 4 is "Simulation and testbenches … waveforms with GTKWave". This is chapter 4's material arriving a chapter early, and it cannot even be demonstrated here (STATE.md records GTKWave as unavailable in this environment). Move wholesale. |
| 7 | **`defparam`** | 281 | **~90 w** | Ends with "never write it." A construct the reader is told never to use does not need a paragraph explaining its ordering semantics. One line in the traps table. |
| 8 | **"Arrays are not vectors"** | 490–507 | **~120 w** | The FP adder has no memories. Genuinely useful general Verilog, genuinely not needed here. Move to chapter 13's SystemVerilog/advanced round-up, or keep the two-line "width on the left, depth on the right" mnemonic and cut the rest. |
| 9 | **The string type and `%s` padding** | 529–533 | **~70 w** | Testbench cosmetics. One sentence in the `$display` subsection is enough. |

**Total: ~1,900 words, landing the chapter around 14,700.**

### Reinvest some of it

Do not bank the whole saving. Spend roughly 300 words of it on the two things the chapter is
actually missing:

- **Three or four real exercises** at the end — "add a `cout` to `lzc8` … ", "modify
  `align_sticky.v` to expose guard and round separately and extend `tb_align_sticky.v` to check
  them", "write the `bad_*` file for a signedness contamination bug and make it self-check" — with
  the answers as new files in `src/ch02/`. This converts the chapter's greatest asset (36 working,
  harness-checked files) into practice rather than reading. It also directly closes blocking
  defect 1 by making the reader build the correct sticky path themselves.
- **One sentence each** for the three concept-before-introduction cases identified above.

Net effect: about 1,600 words shorter, meaningfully more practice, nothing lost that chapter 9 needs.

## Non-blocking issues

1. **"this is the whole output" is not the whole output.** Line 256 says of `bad_positional.v`:
   "Build and run it, and this is the whole output:" — but the real run emits two further lines the
   chapter omits: `PASS bad_positional: trap reproduced, mis-wire gives 201 not 301` and
   `bad_positional.v:38: $finish called at 1000 (1ps)`. Everywhere else the chapter either prints
   the complete capture or marks an elision with `...` (as it correctly does at line 485). *Fix:*
   change "this is the whole output" to "and this is what it prints", or include the two lines.

2. **The `bad_implicit.v` excerpt is verbatim from a different file.** The block at lines 288–291 is
   introduced as `bad_implicit.v` but is not a contiguous substring of it — the real file has
   `integer errors = 0;` between the `wire` declaration and the `assign`. The quoted text *is* an
   exact substring of `bad_nettype_none.v`. Given the chapter's closing assertion that "Every
   listing in this chapter is a verbatim copy of a file in `src/ch02/`", this should either carry an
   elision marker or be re-cut from the named file. *Fix:* insert `// ...` at the elision.

3. **`<=` appears before chapter 3, in a chapter that says it does not.** Line 617 writes
   `exp <= '1;` as an illustrative fragment. Line 1312 then claims "This chapter has used only
   `always @(*)` with `=`". Both cannot be true, and the token the chapter is most careful to
   withhold is the one that slipped through. *Fix:* rewrite as `exp = '1;` — the fill-literal point
   is unaffected by the assignment operator.

4. **`task … endtask` is unexplained in the first testbench.** Line 104, ~1,200 lines before the
   `function`/`task` subsection. The "three things … deserve immediate attention" list at line 156
   does not mention it. *Fix:* add a fourth bullet — one sentence saying a `task` is a named block
   of statements you can call, that its arguments are declared inside it, and that the full rules
   come later.

5. **`!==` is flagged and then dropped.** Line 162 raises it; the callout that follows explains only
   `$fatal`; the explanation does not arrive until line 778. *Fix:* append "— why, in 'The four
   equality operators' below" to line 162, matching the explicit deferral pattern used successfully
   at line 160.

6. **`always @(*)` is used ~770 lines before it is defined.** Line 408 (`comb_max.v`). Structurally
   hard to avoid. *Fix:* one forward-pointing clause at line 408 — "`always @(*)` means
   re-evaluate whenever an input changes; the full treatment is in 'A First Look at Procedural
   Blocks' below."

7. **The net declaration assignment is used before it is introduced.** `align_sticky.v` (line 757)
   uses `wire [SHW-1:0] sh = ...` three times; the construct is introduced at line 1089. The chapter
   even notes at 1095 that "`align_sticky.v` above uses it for all three intermediates" — so the
   author knows. *Fix:* move the two-sentence net-declaration-assignment note to just before
   `align_sticky.v`.

8. **The self/context-determined table omits unary `~`.** Line 889 lists context-determined operands
   as "operands of `+ - * / % & | ^ ~^`". Unary `~` is also context-determined — I verified it:
   `r8 = ~(4'hF + 4'h1)` gives `11101111`, proving the operand grew to eight bits. Since the table
   is billed as "the whole rule" (line 895) and readers are asked to reproduce it from memory
   (checklist item 13), the omission matters. *Fix:* add unary `+ - ~` to the context-determined
   column, and note that `!` is the exception that is self-determined.

9. **"Unrolled at elaboration" conflates synthesis with simulation.** Line 1236: "A `for` loop …
   is **completely unrolled at elaboration**. It is a code-generation device, not iteration." That
   is what a *synthesiser* does. Icarus does not synthesise — the chapter itself insists on this at
   line 33 — and at simulation it really does iterate, in zero time. The chapter's own evidence
   (`computed between t=0.000 and t=0.000`) demonstrates zero elapsed time, not unrolling. The
   mental model is the right one to teach; the wording overclaims. *Fix:* "…becomes, in hardware,
   N parallel copies of the logic — a code-generation device rather than iteration. In simulation it
   really does loop, but in zero simulated time."

10. **No exercises.** Covered under Pedagogical assessment and What to cut; recorded here so it is
    not lost. 18 of 21 checklist items are recall rather than practice, in a chapter that ships 36
    runnable files and a green harness.

11. **`src/ch02/README.md` undercounts the expected warnings.** It states `tb_partsel.v` emits "two
    `select-range` warnings"; the real build emits four distinct warning messages (from lines 38, 39,
    40 and 40). Since that section is titled "Expected warnings" and exists so a reader can tell a
    real problem from a deliberate one, the count should be right. *Fix:* say "four".

12. **A note for the orchestrator, not a chapter defect.** `https://standards.ieee.org/ieee/1364/3641/`
    returns HTTP 403 to `curl` and to plain bots, but fetches correctly with a browser user agent,
    and the page does read "Superseded Standard" as claimed. Chapter 1's convention demoted a
    403-ing URL to `[title-only]`; that would be the wrong call here. Worth recording in STATE.md so
    a later citation-checking pass does not incorrectly downgrade a sound citation.

## Required changes for a 9+

Ordered by importance. Items 1–4 close the blocking defects and are mandatory; 5–7 are what separate
a 9 from a 10.

1. **Fix the sticky bit.** Change `align_sticky.v` to expose `guard`, `round` and a true
   `sticky = |shifted[W-3:0]`, and extend `tb_align_sticky.v` to check all three against its golden
   model. If the module is to stay minimal instead, add an explicit sentence after the listing
   stating that its `sticky` output is the coarse "anything lost" flag and is **not** the IEEE
   sticky bit defined in the callout eleven lines above, and that chapter 8 will separate them.
   Either way, reconcile the callout at line 724, which defines sticky as the OR of everything
   *beyond* guard and round, with its own demonstration `|sticky_src[4:0]`, which ORs all five
   discarded bits. Also re-word checklist item at line 1472 to match whichever definition survives.
   *(Closes blocking defect 1.)*

2. **Fix the unrecognised-system-task claim at line 1396.** It is a `vvp` load-time error, not a
   compile-time error: `iverilog` exits 0 and `-t null` exits 0. Restate the phase correctly, and
   add the consequence to the `-t null` recommendation at line 1410 — a `-t null` CI gate will not
   catch an unsupported system function. *(Closes blocking defect 2.)*

3. **Fix or delete the "recursion without `automatic` returns garbage" claim at line 1310.** On
   Icarus 13.0 the exact function shown returns 120 without `automatic`; only the
   `fact(n-1) * n` ordering breaks. Restate as evaluation-order-dependent, correct the mechanism
   (the shared static *return variable*, not just `n`), and — to hold the chapter's own standard —
   add a `bad_recursion.v` to `src/ch02/` and `targets.txt` so the claim is harness-checked like
   every other trap. *(Closes blocking defect 3.)*

4. **Guard `SH_MAX` in `align_sticky.v`.** Replace `localparam [SHW-1:0] SH_MAX = W[SHW-1:0];` with
   a form that cannot truncate, e.g.
   `localparam [SHW-1:0] SH_MAX = (W >= (1 << SHW)) ? {SHW{1'b1}} : W[SHW-1:0];`, state the
   precondition in the header comment, and add a second instantiation at a different `W`/`SHW` pair
   to `tb_align_sticky.v` so the manifest covers the case. *(Closes blocking defect 4.)*

5. **Cut the recapitulation pile-up.** Replace "Traps Beginners Fall Into" with a compact
   `trap → section → file` table (~610 words saved) so the chapter ends with one summary and one
   checklist rather than three endings. Apply the rest of the cut list in "What to cut" for a total
   of roughly 1,900 words.

6. **Add three or four real exercises** using the existing `src/ch02/` files, with worked answers as
   new files in the manifest. Make one of them "expose guard and round from `align_sticky.v` and
   check them" — it closes defect 1 pedagogically as well as textually. Shift the checklist's
   balance away from 18-of-21 recall items.

7. **Close the seven small precision and ordering issues** — non-blocking items 1–9 and 11: the
   "whole output" wording, the mis-attributed `bad_implicit.v` excerpt, the stray `exp <= '1;`, the
   unexplained `task`, the dangling `!==`, the two forward references (`always @(*)` and the net
   declaration assignment), unary `~` missing from the context-determined column, the
   unrolled-at-elaboration overclaim, and the README warning count.
