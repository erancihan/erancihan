# Chapter 2 Review, Round 2 — The Verilog Language

**Reviewer persona:** pedagogy expert (HDL course designer, technically literate, recompiles and re-runs everything)
**Reviewed:** 2026-08-09
**Toolchain:** Icarus Verilog 13.0 (stable) `v13_0`, macOS 24.6.0 arm64, Homebrew; Python 3.13.7
**Previous round:** `reviews/ch02-review.md` — 7/10, four blocking defects, twelve non-blocking items

<!-- sections complete: 7/7 -->

## Verdict

**Score: 8/10**

The fix round did the hard part properly: all four blocking defects and all eleven actionable
non-blocking items are closed, the harness is green at 27/0, every one of the 27 Verilog listings
still matches its file on disk, every one of the 52 quoted transcripts reproduces character-for-
character on a fresh run, and `align_sticky.v` is now genuinely correct — I re-derived its four
outputs from the definition in `python3` and compared 59,392 vectors (all 256 mantissas × all 32
shift amounts at `W=8`, plus 400 random mantissas × the full 64-shift range at each of `W=24` and
`W=32`) with **zero mismatches**, and an exact tie, a just-above tie and a below-tie are cleanly
separable from the outputs. It is held back by two defects the fix round introduced, both in the new
material and both one-line repairs: the headline guard/round/sticky worked example prints its two
mantissas in **unlabelled hex** while asking the reader to index bits `[4]`, `[3]` and `[2:0]`, so
under the natural binary reading of `000010` every printed answer in the callout is wrong; and the
new elaboration guard's stated rationale — "the saturation constant truncates and the shifter
silently stops shifting" — is false of the code as shipped, which I proved by deleting the guard and
finding `W=32, SHW=5` and `W=30, SHW=5` produce fully correct results on every representable shift
amount. Neither defect propagates wrong hardware into chapter 9 and both are cheap to fix; with them
closed this is a 9.

## Status of round-1 defects

### Blocking

---

**B1 — the chapter defined the sticky bit correctly and shipped a module that computed something
else. CLOSED.**

Not just closed textually — closed correctly, and I verified the logic myself rather than taking the
testbench's word for it (details in *Code verification*). `align_sticky.v` now shifts into a
`2W+2`-bit vector and brings out four ports:

```verilog
  assign aligned = shifted[2*W+1 -: W];
  assign guard   = shifted[W+1];
  assign round   = shifted[W];
  assign sticky  = |shifted[W-1:0];
```

Working the indices by hand: `ext[i] = mant[i-(W+2)]` for `i` in `[W+2, 2W+1]`, so
`shifted[i] = ext[i+sh]` gives `aligned[j] = mant[j+sh]` when `j+sh < W`, `guard = mant[sh-1]`,
`round = mant[sh-2]`, and `sticky = OR mant[sh-3 : 0]`. That is exactly the standard
guard/round/sticky split, with guard and round **excluded** from sticky. The definition in the
callout at line 700, the module header comment, the module body, the transcript, the trap table and
checklist items 1534–1536 now all say the same thing.

The chapter's tie-breaking rule (line 702) is correct as written: `G=0` → below a tie, round down;
`G=1` with `R|S=1` → above a tie, round up; `G=1, R=0, S=0` → exact tie, increment only when the
kept LSB is 1 so the stored result ends even. `round_ne.v` implements it as
`round_up = G&(R|S) | (G&~(R|S)&lsb)`, and `tb_round_ne.v` checks all 16 combinations against a
genuinely different formulation (`{G,R,S}` as a 3-bit magnitude compared with `3'b100`). Both
correct.

The choice of `2W+2` rather than the `2W` the round-1 review suggested is not padding, and the
chapter's justification at line 800 is right. I checked the alternative: with a `2W`-bit vector,
`sticky = |shifted[W-3:0]` misses `mant[0]` at `sh = W+1` and misses `mant[1:0]` at `sh = W+2`. The
extra two bits are load-bearing.

---

**B2 — `align_sticky.v` silently degraded to a pass-through whenever `W >= 2**SHW`. CLOSED, but the
remedy is over-built and its stated reason is false.**

The actual round-1 bug was `localparam [SHW-1:0] SH_MAX = W[SHW-1:0];` — a saturation constant
truncated to the shift-amount width. That is fixed, and fixed by the right change: `SH_MAX` is now
`localparam [31:0]`, so the comparison `shamt > SH_MAX` happens at 32 bits and cannot be truncated.
The silent degradation is gone. Marking B2 **CLOSED**.

But the fix round also added a module-level generate-`if` that `$fatal`s at elaboration when
`2**SHW <= W+2`, and justified it — in three separate places — with a claim I can disprove in one
command. See **N2** below. The boundary itself is *not* off by one relative to the precondition as
stated; see *Code verification*.

---

**B3 — "an unrecognised system task is a compile-time error". CLOSED.**

Re-verified from scratch, not read:

```
$ iverilog -g2012 -Wall -o one.vvp one.v ; echo $?
0
$ vvp one.vvp
one.v:4: Error: System task/function $nosuchtask() is not defined by any module.
one.vvp: Program not runnable, 1 errors.
$ echo $?
1
$ iverilog -g2012 -Wall -t null one.v ; echo $?
0
```

The function form `$nosuchfunc(3)` behaves identically (`iverilog` 0, `vvp` 1). The chapter's
callout at line 1444 now states the phase correctly and quotes exactly this transcript, and the
consequence has been propagated to the `-t null` recommendation at line 1466: "run it on a file that
calls `$nosuchtask()` and it exits 0 … Such a job reports green on a design `vvp` refuses to load."
That is the sharp half of the round-1 finding and it is now in the text.

---

**B4 — "without `automatic` that same recursive function returns garbage". CLOSED, and closed to the
chapter's own standard.**

`bad_recursion.v` now ships, is in `targets.txt`, and is exercised by the harness. It writes the
factorial four ways and asserts the observed behaviour, so `PASS` means the hazard reproduced. Fresh
run:

```
-- recursion without `automatic' is evaluation-order dependent
  static    fact = n * fact(n-1) : fact(5) = 120
  static    fact = fact(n-1) * n : fact(5) = 1
  automatic fact = n * fact(n-1) : fact(5) = 120
  automatic fact = fact(n-1) * n : fact(5) = 120
```

The prose at line 1353 attributes the clobber to the shared static **return variable** as well as
the arguments, states that neither ordering is guaranteed, and closes with "do not reason about
which spelling survives". No overclaim survives. This is the best-repaired of the four.

### Non-blocking items 1–12

| # | Round-1 item | Status | Evidence |
|---|---|---|---|
| 1 | "this is the whole output" was not the whole output (`bad_positional.v`) | **CLOSED** | Line 244 now reads "Build and run it, and this is what it prints", and all eight lines are present including `PASS bad_positional…` and the `$finish` line. Matches a fresh capture exactly. |
| 2 | `bad_implicit.v` excerpt was verbatim from a different file | **CLOSED** | Line 278 now carries `// ...` where `integer errors = 0;` was elided, and the closing sentence at line 1584 documents the convention ("with any elision marked `// ...`"). |
| 3 | `exp <= '1;` leaked `<=` before chapter 3 | **CLOSED** | Now `exp = '1;` (line 593). I re-scanned the whole chapter and all 40 source files: the only `<=` anywhere is the relational in `align_sticky.v`'s guard and in `if (n <= 1)`. The chapter-3 boundary is intact. |
| 4 | `task … endtask` unexplained in the first testbench | **CLOSED** | "Three things" became "Four things" (line 154) and line 158 gives `task` a full paragraph with an explicit forward pointer. |
| 5 | `!==` flagged then dropped | **CLOSED** | Line 162: "why, in 'The four equality operators' below". |
| 6 | `always @(*)` used ~770 lines before it is defined | **CLOSED** | Line 416 defines it inline and forward-points. |
| 7 | net declaration assignment used before introduced | **CLOSED** | Moved to line 720, immediately before `align_sticky.v`; line 1130 correctly back-references "introduced alongside `align_sticky.v` above". |
| 8 | self/context table omitted unary `~` | **CLOSED** | Line 924 now reads "the operand of **unary** `+ - ~`" against "the operand of **unary** `!`". Line 961's `r8 = ~(a + b)` → `11101111` is the demonstration. |
| 9 | "unrolled at elaboration" conflated synthesis with simulation | **CLOSED** | Line 1277 rewritten: "In simulation the loop really does loop — Icarus simulates, it does not synthesise — but it does so in **zero simulated time**." Exactly right. |
| 10 | no exercises; 18 of 21 checklist items were recall | **CLOSED** | Four exercises added (line 1500). I ran all four — every claim in them holds; see *Code verification*. Checklist is now 22 items. |
| 11 | `README.md` undercounted `tb_partsel.v` warnings | **CLOSED** | Now "four `select-range` warnings … (lines 38, 39 and two from line 40)". A fresh build emits exactly four, from lines 38, 39, 40, 40. |
| 12 | IEEE URL 403s to bots (orchestrator note) | n/a | Not a chapter defect. |

### The cut list from round 1

| # | Proposed cut | Status |
|---|---|---|
| 1 | "Traps Beginners Fall Into" → table | **DONE.** 793 words of bullets → a 17-row table; the section is now 379 prose words. |
| 2 | history / standards lineage | **DECLINED** — but partly done anyway: it is now one paragraph of 205 words (line 47) plus the `-ghelp` callout. See *Judging the declined cuts*. |
| 3 | exotic net types, switch-level | **DONE.** Line 357 is one sentence ("recognise the names and move on"); line 1216 is one sentence. |
| 4 | "The command line, in full" | **DONE.** Line 1464 names the deferred flags in one clause and hands them to chapter 4, keeping only the `-t null` warning and the `-Wall` membership list. |
| 5 | Verilog-1995 non-ANSI listing / `adder_1995.v` | **DECLINED** — but the listing was cut to the 11-line header (lines 211–221) rather than the full file. |
| 6 | `$readmemh` / `$dumpfile` | **DONE.** One sentence at line 1422 handing all four to chapter 4. |
| 7 | `defparam` | **PARTIAL.** Still a 56-word paragraph at line 271. Acceptable. |
| 8 | "Arrays are not vectors" | **DONE.** Down to one listing line plus the mnemonic (lines 481–489). |
| 9 | string type / `%s` padding | **DONE.** Folded into one clause at line 511. |

## New defects introduced by the fix round

Two real ones and one latent edge case. Both real ones are in material the fix round wrote.

---

### N1. The guard/round/sticky worked example prints its mantissas in unlabelled hex while asking the reader to index individual bits

**Location:** chapter lines 704–718, inside the "Seed for chapter 8" callout — the first and most
load-bearing concrete instance of the chapter's new headline concept.

The callout says "A right-shift of five discards `sticky_src[4:0]`, and that is where the split
falls", and then shows:

```
-- guard, round and sticky for a right-shift of 5
   sticky_src = 000010
  1  sticky_src[4]     guard
  0  sticky_src[3]     round
  0  |sticky_src[2:0]  sticky
   sticky_src = 000011
  1  sticky_src[4]     guard
  0  sticky_src[3]     round
  1  |sticky_src[2:0]  sticky
```

The transcript is real — it reproduces exactly — and the values are correct. `sticky_src` is a
24-bit `reg` printed with `%h`, so `000010` is `24'h000010`, i.e. bit 4 set. Nothing in the chapter
says so.

**What the reader sees.** A six-character string composed entirely of `0` and `1`, immediately below
a sentence about which *bits* are discarded, immediately above three lines that index bits `[4]`,
`[3]` and `[2:0]`. Every cue says "read this as binary". Read as binary, `000010` has bit 1 set, so:

| | printed | binary reading |
|---|---|---|
| `sticky_src[4]` guard | 1 | **0** |
| `sticky_src[3]` round | 0 | 0 |
| `\|sticky_src[2:0]` sticky | 0 | **1** |

Four of the six printed answers across the two examples contradict the reader's own arithmetic, and
the prose that follows ("The first is an exact tie; the second is above one") contradicts it too.
The reader is not silently mis-taught — the labels name the correct bit positions — but they are
handed a flat contradiction at the exact moment the chapter is introducing the idea that chapters 8,
9 and 12 are built on. In a chapter whose credibility rests on "we ran it and this is what
happened", making the reader doubt a correct transcript is expensive.

It is also self-inflicted: the chapter's own style rule at line 610 is "**Never write a decimal
literal for a bit pattern.** Use `'b` or `'h`", and this is the one place a bit pattern is shown
without its base.

**Note the aggravating detail.** Neither of the two chosen values contains a hex digit above 1, so
there is no in-band clue. The later `align_sticky` transcript at line 792 gets away with the same
`%h` formatting only because one of its rows is `mant=00000f`, and the `f` gives the game away.

**Fix (one line in `tb_operators.v`, then regenerate).** Either print `%b` — `sticky_src = 24'b…0001_0000` makes the whole point visible — or change the `$display` format string to
`"   sticky_src = 24'h%h"`. The second is cheaper; the first is better teaching, because the reader
can then *see* the guard bit sitting above the round bit.

---

### N2. The new elaboration guard is justified by a failure mode that the other half of the same fix already eliminated, and it rejects parameter pairs that work

**Locations:** `src/ch02/align_sticky.v` lines 27–29 and 751–753 as quoted; `src/ch02/bad_align_shw.v`
lines 5–14; chapter line 802.

All three say some version of: without this check, "the saturation constant truncates and the
shifter silently stops shifting". `bad_align_shw.v` is most specific:

> Before `align_sticky.v` checked its precondition, this pair elaborated silently and produced a
> shifter that did nothing at all: SH_MAX truncated to `32'd34 & 5'h1F = 5'd2`, so every shift
> saturated to 2.

**This is false of the shipped code, and it was not true of the round-1 code either.**

*False of the shipped code.* With `localparam [31:0] SH_MAX = W + 2;`, the only narrowing is
`SH_MAX[SHW-1:0]`, and it sits on the **true** arm of `(shamt > SH_MAX) ? SH_MAX[SHW-1:0] : shamt`.
That arm is reachable only when `2**SHW - 1 > W+2`, and whenever it is reachable `SH_MAX` already
fits in `SHW` bits, so the narrowing is a no-op. When `2**SHW <= W+2` — exactly the condition the
guard fires on — the maximum value `shamt` can hold is below `SH_MAX`, the comparison is never true,
and the truncation is dead code. The module is correct for **every** parameter pair.

I did not argue this from the source; I removed the guard and measured. Compiling a copy of
`align_sticky.v` with the two guard lines commented out and instantiating it at `W=32, SHW=5` and
`W=30, SHW=5` — both of which the shipped guard rejects — gives **96 vectors, 0 mismatches** against
my independent Python model.

*Not true of the round-1 code either.* Round 1 quoted the old line as
`localparam [SHW-1:0] SH_MAX = W[SHW-1:0];`, which at `W=32, SHW=5` gives `SH_MAX = 32 & 31 = 0`,
not 2. The `32'd34 & 5'h1F = 5'd2` arithmetic in the new comment describes a third variant that
never shipped.

**Why this matters more than it looks.** The chapter's authority is that every behavioural claim was
run. This one was not, and it is checkable in about sixty seconds. It also inverts the lesson: the
change that actually killed the bug is the widening of `SH_MAX` to `[31:0]` — the chapter's own
"write the width of every signal down on purpose" lesson, applied — and the chapter credits the
generate-`if` instead, which is the part that does nothing for correctness.

**The guard also over-rejects.** `W=30, SHW=5` and `W=32, SHW=5` are refused at elaboration although
they produce correct outputs on every shift amount the port can express. There *is* a defensible
design contract here — "the shift-amount port must be able to command the full saturating shift" —
but that is a different and weaker claim than the one the chapter makes.

**Fix.** Keep the guard if you want the contract; restate the reason. Something like: "`SH_MAX` is a
full-width `localparam`, so it can no longer be truncated by the comparison. The generate-`if` is
belt and braces of a different kind: it refuses a parameter pair in which `shamt` is too narrow ever
to command the full `W+2` shift, so an instance that silently cannot align a whole significand
becomes a build failure rather than a wrong answer three chapters later." Then correct
`bad_align_shw.v`'s comment, which currently narrates a bug that never existed in this form.

---

### N3 (latent, low impact). `1 << SHW` is evaluated at 32 bits, so the guard misfires for `SHW >= 32`

`if ((1 << SHW) <= SH_MAX)` uses an unsized `1`, which is a 32-bit integer. At `SHW = 32` the shift
produces 0, so the guard fires at `W=24, SHW=32` even though `2**32` is comfortably greater than 26.
Verified: `rc=1`, with the precondition `$fatal` message.

No realistic design uses a 32-bit shift amount, so this is a curiosity rather than a hazard. It is
worth one line of thought only because it is a width bug in the module the chapter holds up as the
example of writing widths down on purpose, three lines below a comment that explains why the *other*
width in the same expression is safe. `if (SHW >= 32 || (32'd1 << SHW) <= SH_MAX)` or a `$clog2`
formulation removes it.

## Code verification

### Harness

```
$ cd guide/src && bash run_all.sh ch02
=== ch02 ===
  PASS  half_adder.v tb_half_adder.v
  … 25 more …
  PASS  (xfail as expected)  align_sticky.v bad_align_shw.v
  PASS  (xfail as expected)  bad_nettype_none.v
================================
  passed: 27
  failed: 0
================================
```

**Green, 27/0, confirmed.** `targets.txt` covers all 40 `.v` files in `src/ch02/`.

### The two `xfail` targets fail for the stated reason

Compiled by hand and read the actual diagnostic, not just the exit status:

```
$ iverilog -g2012 -Wall -o /tmp/x1 align_sticky.v bad_align_shw.v
FATAL: align_sticky.v:41: align_sticky: SHW is too narrow to express W+2; need 2**SHW > W+2
       During elaboration  Scope: genblk1
1 error(s) during elaboration.   (exit 1)

$ iverilog -g2012 -Wall -o /tmp/x2 bad_nettype_none.v
bad_nettype_none.v:13: error: Net godo is not defined in this context.
1 error(s) during elaboration.   (exit 1)
```

Both fail for their intended reason, both during **elaboration** (which is the phase the chapter
claims at line 810), and both messages are quoted verbatim in the chapter. Neither is failing
incidentally on a syntax error or a missing module.

Note in passing that the `Scope: genblk1` line is quoted in the chapter too, and it is real — it is
Icarus naming the anonymous generate block that holds the `$fatal`.

### Independent verification of the sticky-bit logic

This is the module chapters 8, 9 and 12 inherit, so I built my own reference rather than re-reading
the testbench's. The testbench models the shift by index arithmetic ("which mantissa bit lands
here"); I deliberately modelled it a third way, from the *definition* of a right shift as a
quotient-and-remainder split, so a shared misconception in the index formulation could not hide:

```python
def ref(M, n, W):
    n = min(n, W + 2)                                  # saturation
    aligned = (M >> n) & ((1 << W) - 1)                # the quotient, truncated to W
    guard   = (M >> (n - 1)) & 1 if n >= 1 else 0      # MSB of the discarded field
    round_  = (M >> (n - 2)) & 1 if n >= 2 else 0      # the next one down
    sticky  = 1 if (n >= 3 and (M & ((1 << (n - 2))-1)) != 0) else 0   # OR of the rest
    return aligned, guard, round_, sticky
```

I drove `align_sticky.v` from a fresh dump harness of my own (not `tb_align_sticky.v`), instantiated
at three parameter pairs, and diffed all four outputs:

| Instance | Coverage | Vectors |
|---|---|---|
| `W=8, SHW=5` | **exhaustive** — all 256 mantissas × all 32 shift amounts | 8,192 |
| `W=24, SHW=6` | 400 random mantissas × all 64 shift amounts (`SHW=6` so shifts run well past saturation) | 25,600 |
| `W=32, SHW=6` | 400 random mantissas × all 64 shift amounts | 25,600 |

```
checked 59392 vectors, mismatches 0
shift-class coverage: {0: 1056, 1: 1056, 2: 1056, 3: 1056, 'mid': 20224,
                       'nearsat': 2112, 'sat': 32832}
distinct (g,r,s) combinations observed: [(0,0,0),(0,0,1),(0,1,0),(0,1,1),
                                         (1,0,0),(1,0,1),(1,1,0),(1,1,1)]
```

**Zero mismatches**, with `n = 0, 1, 2, 3` all separately exercised, the saturation point `W+2`
exercised, shifts beyond saturation exercised, and all eight `(g,r,s)` combinations observed. The
module is correct.

**Tie discrimination, specifically.** All three rounding classes are distinguishable from the ports,
and the chapter's four printed rows are the demonstration (fresh run, `W=24`):

| mantissa | shift | `aligned` | g | r | s | class | RNE decision |
|---|---|---|---|---|---|---|---|
| `24'h000010` | 5 | `000000` | 1 | 0 | 0 | **exact tie** | break on LSB of `aligned` |
| `24'h000018` | 5 | `000000` | 1 | 1 | 0 | above a tie | round up |
| `24'h000011` | 5 | `000000` | 1 | 0 | 1 | above a tie | round up |
| `24'h00000f` | 5 | `000000` | 0 | 1 | 1 | below a tie | round down |

All four have `aligned = 0` and all four lost a `1`, so a single "something fell off" flag reports
the same thing for every row — which is exactly the argument the chapter makes. The stated
tie-breaking rule (line 702) is correct: increment iff `G & (R|S)`, or `G & ~(R|S) & lsb`. That is
round-to-nearest-ties-to-even, and it leaves the stored LSB at 0 in both tie branches.

**Structural check on `2W+2`.** The chapter claims the vector must be `2W+2` rather than `2W`. I
tested the claim rather than accepting it: with a `2W`-bit vector and `sticky = |shifted[W-3:0]`,
`sticky` loses `mant[0]` at `sh = W+1` and `mant[1:0]` at `sh = W+2`. The chapter is right and its
one-sentence justification at line 800 is the correct one.

### The elaboration boundary

The stated precondition is `2**SHW > W+2`, i.e. the `SHW`-bit `shamt` port must be able to hold the
saturation value `W+2`. That requires `W+2 <= 2**SHW - 1`, which is `2**SHW > W+2`. The guard fires
on `(1 << SHW) <= SH_MAX`. **Relative to the stated precondition the boundary is exactly right —
there is no off-by-one.** Measured at fifteen parameter pairs:

| W | SHW | 2\*\*SHW | W+2 | max `shamt` | result | predicted |
|---|---|---|---|---|---|---|
| 24 | 5 | 32 | 26 | 31 | elaborates | ✓ (the chapter's defaults) |
| 29 | 5 | 32 | 31 | 31 | elaborates | ✓ (last accepting pair) |
| 30 | 5 | 32 | 32 | 31 | FATAL | ✓ (first rejecting pair) |
| 13 | 4 | 16 | 15 | 15 | elaborates | ✓ |
| 14 | 4 | 16 | 16 | 15 | FATAL | ✓ |
| 5 | 3 | 8 | 7 | 7 | elaborates | ✓ |
| 6 | 3 | 8 | 8 | 7 | FATAL | ✓ |
| 61 | 6 | 64 | 63 | 63 | elaborates | ✓ |
| 62 | 6 | 64 | 64 | 63 | FATAL | ✓ |
| 32 | 6 | 64 | 34 | 63 | elaborates | ✓ |
| 32 | 5 | 32 | 34 | 31 | FATAL | ✓ (`bad_align_shw.v`) |
| 24 | 32 | 2³² | 26 | 2³²−1 | **FATAL** | ✗ — see N3 |

It does **not** fire for the default parameters (`W=24, SHW=5`), confirmed both here and by the
harness. The one wrong result in the table is the `SHW = 32` overflow of N3.

Separately, and this is the substance of **N2**: the guard is *not necessary for correctness*. I
built a copy with the two guard lines commented out and ran the rejected pairs `W=32, SHW=5` and
`W=30, SHW=5` against my Python model — **96 vectors, 0 mismatches**. The guard enforces a design
contract, not a correctness property, and the chapter says otherwise.

### Exercise claims

The four new exercises make three checkable assertions. All three hold:

| Exercise | Claim | Result |
|---|---|---|
| 2 | change `\|shifted[W-1:0]` to `\|shifted[W+1:0]`, run `tb_align_sticky.v` unchanged: "It reports twenty failures" | **exactly 20**, verified by count |
| 2 | "the one to look at is `mant=000010 shamt=5`, where an exact tie is misreported as a value above a tie" | present verbatim: `FAIL W=24 mant=000010 shamt=5 : got … g=1 r=0 s=1, want … g=1 r=0 s=0` |
| 3 | at `W=53`, work out the smallest legal `SHW` from the precondition | `SHW=5` FATALs, `SHW=6` elaborates — the answer is 6, and the exercise is solvable from the stated rule |

Exercise 4 (write your own signedness-contamination `bad_*.v`) has no worked answer and is not
harness-checkable, which is fine — it is the one open-ended exercise.

### Listing-versus-file comparison

I extracted all 81 fenced blocks mechanically (27 `verilog`, 2 `sh`, 52 untagged output) and diffed
every `verilog` block against `src/ch02/`.

| Result | Count | Blocks |
|---|---|---|
| **byte-identical whole file** | 10 | `half_adder.v`, `tb_half_adder.v`, `adder_ansi.v`, `comb_max.v`, `byte_select.v`, **`align_sticky.v`**, `full_adder.v`, `ripple4.v`, `lzc8.v` (+`tb_half_adder.v`) |
| **exact contiguous substring** | 7 | `adder_1995.v`, `bad_positional.v`, `mux2.v`, `mant_add.v`, `bad_mant_add.v`, `bad_carry_always.v`, `bad_begin_end.v` |
| illustrative fragment, no backing file | 10 | the opening 3-line hook, the `localparam` FP sketch, the three instantiation styles, the `bad_implicit.v` excerpt (elided with `// ...`), the array declaration, the `signed` declarations, `a && b`/`a & b`, `r8 = a + b`/`r8 = {a + b}`, the wide-intermediate fix, the net declaration assignment |

**No divergence anywhere.** The rewritten `align_sticky.v` listing at chapter line 725 is
byte-identical to the file, including its 26-line header comment. The `bad_implicit.v` excerpt that
round 1 flagged is now correctly elided. The illustrative fragments are all syntactically and
semantically sound.

`round_ne.v` and `bad_recursion.v` — both new — are referenced by name and by transcript but are not
quoted as listings. That is a deliberate choice (they are exercise answers) and it is consistent
with the chapter's closing sentence.

### Transcript freshness

I recompiled and re-ran all 27 targets from scratch into a clean scratch directory, capturing
compile and run output separately, and matched every one of the 52 untagged fenced blocks against
the captures.

**52 of 52 reproduce.** Breakdown:

- 47 match a single capture directly.
- 3 (`bad_positional`, `bad_implicit`, `bad_carry_always`) match once compile-time warnings and
  run-time output are concatenated — which is what a reader sees typing the two commands in
  sequence, and how the chapter presents them.
- 2 (`tb_partsel` out-of-range selects at line 474, `tb_literals` constant truncation at line 600)
  contain the chapter's own `...` elision marker; both halves of each match exactly.

The blocks the fix round is claimed to have regenerated all check out: the `align_sticky` transcript
at line 787 (including the new `n=0` row and the `W=32 SHW=6` row), the `bad_align_shw` elaboration
error at line 805, the `bad_recursion` output at line 1356, the `round_ne` output at line 1507, and
the `$nosuchtask` transcript at line 1447 (which I reproduced with my own file, not theirs).
**Nothing is stale and nothing is fabricated.**

### Other machine checks

| Check | Result |
|---|---|
| `iverilog -V` | `Icarus Verilog version 13.0 (stable) (v13_0)` — matches line 49 |
| `-ghelp` generation list | `1995 2001 2005 2005-sv 2009 2012` — matches line 49 verbatim, six entries |
| `-Wall` membership per `man iverilog` | `anachronisms, implicit, macro-replacement, portbind, select-range, timescale, sensitivity-entire-array` — matches line 1470 exactly; `infloop` confirmed excluded |
| warnings emitted across all 27 targets | 7 distinct; all are `implicit`, `portbind`, `select-range`, or the un-gated `Numeric constant truncated` — consistent with line 1472 (with one small caveat, see *Remaining defects*) |
| `.v` file count vs "You have 40 working files" (line 1502) | exactly 40 |
| cross-references to chapter 1 headings | 8 distinct, **all 8 resolve** to real `##`/`###` headings in `ch01.md` |
| internal cross-references ("in *X* below/above") | 5 distinct, all resolve |
| markdown fences | 166 markers, balanced |
| markdown tables | every table's rows match its header's unescaped-pipe count |
| duplicated sentences (>60 chars) | none |
| `<=` as an assignment operator | **zero occurrences** in the chapter or in any of the 40 source files; the chapter-3 boundary is intact |

## Pedagogical assessment

### Shape of the chapter now

17,879 words total — 14,536 prose, 3,064 code and captured output, the rest headings and table
scaffolding. Up from 16,608 at round 1 despite roughly 700 words of real cuts, because closing B1
honestly cost a bigger module, a three-case rounding explanation, a second module (`round_ne.v`) and
four exercises. That is the right trade and I would make it again.

| Section | Prose | Code |
|---|---|---|
| Describing a Machine, Not a Procedure | 999 | 18 |
| Your First Module, Compiled and Run | 810 | 224 |
| Modules, Ports, and Instantiation | 1,094 | 321 |
| Wires, Variables, and the Lie in the Name `reg` | 1,532 | 433 |
| Writing Numbers Down | 692 | 152 |
| **The Operators** | **2,041** | **797** |
| Width and Signedness | 1,911 | 394 |
| Wiring Things Together with `assign` | 557 | 223 |
| A First Look at Procedural Blocks | 1,537 | 265 |
| The Toolchain | 1,174 | 178 |
| Traps Beginners Fall Into | 379 | 0 |
| Exercises | 341 | 59 |
| What You Should Be Able to Do Now | 558 | 0 |
| Bridge to Chapter 3 | 207 | 0 |

### Does the G/R/S material belong in chapter 2, before IEEE 754 is taught in chapter 7?

**Yes — the placement is defensible, and it is better defended than I expected.** I went looking for
a cognitive-load failure and did not find one. Four things carry it:

1. **Chapter 1 already did the groundwork.** This is the decisive fact and I checked it rather than
   assuming. `ch01.md` contains "IEEE 754" 8 times, "significand" 9 times, "tie" 13 times,
   "ties-to-even", "round-to-nearest-even", and "guard", "round" and "sticky" 3 times each — in
   "The contrast that matters: IEEE 754 is sign-magnitude" and in its own traps list ("Guard, round
   and sticky bits set the width of every upstream datapath element. Retrofitting them is a
   rewrite"). Chapter 1 even works the exact motivating example: `(1.0 + 2^-24) + 2^-24 = 1.0`,
   with "2^-24 is precisely half an ULP of 1.0" and an explanation of why ties-to-even breaks both
   ties downward. Chapter 2 is therefore not introducing rounding cold; it is giving a name and a
   Verilog spelling to a thing the reader has already met and been told matters.
2. **The Verilog is genuinely the point.** The subsection is "Reduction operators, and the sticky
   bit". A reduction OR needs a motivating use, and "the OR of everything below the round bit" is
   the best one in the whole language. Teaching `|v` with a toy example and then re-teaching it in
   chapter 8 would be worse.
3. **The chapter is honest about the boundary.** It never claims to teach rounding — the callout is
   labelled "Seed for chapter 8", the module comment says "the shape chapter 8 needs", and the
   exercise says "implementing the rule from the sticky-bit callout". The reader is being handed a
   *shape*, not a theory of floating point.
4. **It is testable at this point.** Everything in the callout can be checked with an eight-line
   testbench the reader can already write. That is not true of most chapter-7 material.

**The reservation.** "The Operators" is now 2,838 words, the largest unit in the chapter, and
roughly 900 of them are FP rounding rather than operators. A reader scanning for the operator
reference will not expect to find a rounding tutorial in the middle of it, and a reader who bounces
off the rounding material has no signposted way to skip it and come back. **Promote the G/R/S
material to its own `##` section** — "Reduction Operators and the Sticky Bit", sitting between
"The Operators" and "Width and Signedness" — and add one sentence at its head of the form "this is
the one place in the chapter where the floating point payload arrives early; if the rounding rule
does not land yet, take the module and the reduction OR and move on." That costs about thirty words
and removes the only structural objection.

One genuine vocabulary gap: "ULP" appears once in chapter 2, in exercise 1 ("round up when the
discarded part exceeds half an ULP"), and only once in chapter 1, where it is used rather than
defined. Six words in exercise 1 — "half an ULP (half the last significand bit)" — closes it.

### Is the three-way explanation actually clear to a beginner?

The *structure* is close to ideal, and it is a better piece of teaching than the round-1 chapter had.
The move is: name the three quantities → say why they cannot be merged → show two mantissas that
differ in one low bit and demand different decisions → give the module → show four rows that all
look identical under a single flag → state the reason for three ports. Consequence, rule,
consequence. That is the same pattern as "Width and Signedness", which round 1 correctly identified
as the best-executed section in the chapter.

Two specific things it gets right that most treatments get wrong:

- It states **why** guard and round are excluded from sticky, rather than asserting the definition.
  "Fold all three into a single 'something was lost' flag and the last two cases become the same
  bit, which is exactly why a rounder built on one flag cannot be written at all" is the sentence
  most textbooks omit.
- It gives the reader a **falsification exercise** (exercise 2: break it on purpose, watch twenty
  assertions fail, find the one that matters). Verified working. That is worth more than another
  page of prose.

The thing that spoils it is **N1** — the unlabelled hex — which lands on precisely the two lines the
whole explanation pivots on. Fix that one format string and this section is the strongest thing in
the chapter.

Secondary nit in the same area: the module is still called `align_sticky`, though it now produces
four outputs of which sticky is one. `align_grs` would say what it does. Not worth a rename if the
name is already referenced elsewhere, but worth knowing it reads as a leftover.

### Did the ~610 words of cuts damage anything?

**No.** I read every cut site against the round-1 text.

- **Exotic net types** (line 357) — `tri`/`wand`/`wor`/`uwire` reduced to "recognise the names and
  move on", with the multiple-driver→`x` lesson and `tb_drivers.v` retained in full. This was the
  right split: the debugging heuristic stayed, the bus-modelling trivia went.
- **The command line** (line 1464) — the deferred flags are still *named* in one clause, so a reader
  who needs `-D` knows it exists and where to look. Deferral without concealment.
- **`$readmemh`/`$dumpfile`** (line 1422) — one sentence, correctly pointed at chapter 4. Better than
  before, since STATE.md records GTKWave as unavailable in this environment and the chapter could
  not have demonstrated it anyway.
- **Arrays** (line 481) — the "width on the left, depth on the right" mnemonic survived along with
  the `x`-not-zero fact. Both are the parts that pay.
- **String type** (line 511) — folded into a clause. Nothing lost.

The one place I looked hardest for damage was the transition into "Width and Signedness", because
round 1 flagged 4,100 words of dense rule-learning back to back with no build-and-run break. That is
now *better* rather than worse: the new `align_sticky.v` and `round_ne.v` sit at the end of "The
Operators", so the reader does get a module to compile immediately before the width chapter starts.
The fix round solved a pacing problem it was not asked to solve.

### Does the trap table read as well as the bullets it replaced?

**Better, and for a reason worth recording.** 793 words of bullets became a 17-row
`trap → section → file` table (379 words for the whole section including its lead-in). The bullets
were a third ending; the table is an index, and the chapter says so explicitly: "this table is the
index, not a re-explanation."

The `File` column is the part that earns it. Twelve of the seventeen rows name a file in
`src/ch02/`, so the table converts from "things you were told" into "things you can go and run",
and every named file is real and still reproduces its trap — I checked all of them via the harness.
Five rows have `—` in the file column, and those are the five that genuinely cannot have a file
(execution order, non-synthesisable constructs, `defparam`). The honesty of the em-dash is worth
more than a padded entry.

Recapitulation load is down from 1,511 words to 1,163 (traps 384 + checklist 567 + bridge 212), and
— more importantly — 404 words of *exercises* now sit between the traps and the checklist, so the
chapter ends on something to do rather than three summaries in a row. The round-1 complaint about
"three endings" is closed.

### The checklist and exercises

22 items, up from 21, with two new sticky-bit items (1535, 1536). Both are now properly supported —
1535 asks the reader to name the guard and round positions and state the three RNE cases, which the
callout, the module, `round_ne.v` and the transcript all teach; 1536 asks *why* a single flag cannot
work, which is the callout's central argument. The round-1 unsupported item is closed.

The recall-versus-practice ratio is still tilted (four of 22 checklist items ask the reader to
produce something) but the four exercises rebalance the chapter as a whole, and they are good
exercises: one build, one deliberate-breakage with a predicted failure count, one parameter
derivation, one open-ended file to write. Exercises 1–3 all have verified worked answers in the
tree. This closes round-1 non-blocking item 10 properly rather than nominally.

### Judging the two declined cuts

**Declining the `adder_1995.v` deletion was right.** The round-1 objection was that "read non-ANSI,
write ANSI" cost a 20-line listing, a source file and a build target. The fix round kept the file
but cut the listing to the 11-line header (lines 211–221), which is the only part that carries the
lesson — the body is identical to `adder_ansi.v` and showing it again taught nothing. That is a
better answer than either "keep it all" or "delete it". The file also still earns its build target:
`tb_port_styles.v` runs ANSI, non-ANSI, named and positional instances against 64 random vectors and
proves they agree, which is the empirical backing for the "use named connection always" rule two
pages earlier. And checklist item 1528 ("Read a Verilog-1995 non-ANSI port list without confusion")
depends on it. **Verdict: correctly declined.**

**Declining the history cut was right, but the stated reason is not the good one.** The argument
offered was that cutting to two sentences would orphan two live citations (sources 1 and 2). That
argument is weak — citations follow the sentences that need them, and two sentences can carry two
footnotes perfectly well. The *real* justification is better and is already in the text: the
paragraph opens "because the version number on your command line is a fossil", and it exists to
explain why the reader types `-g2012` for a language whose standard is IEEE 1364. That is not
optional colour; it is the answer to a question every reader has in the first five minutes.

It also matters that the fix round quietly did most of the cut anyway. The section is now 205 words
in a single paragraph explicitly framed as "One paragraph of history" — down from the ~330 round 1
measured, and the standards-lineage detail (Cadence, OVI) is gone. What remains is Gateway, the
three creators, 1995/2001/2005, the 2009 merge, and the `-g2012` payoff. I would cut one more
clause (the list of what Verilog-2001 added, which is re-taught in situ throughout the chapter) and
otherwise leave it. **Verdict: correctly declined, on the wrong grounds.**

### Does a real beginner survive this chapter?

Yes, and more comfortably than at round 1. Time to first green run is unchanged and still excellent
— two commands at line 135 of 1,584, about 9% in, preceded by a complete runnable pair and followed
by real output ending in `PASS`. The three concept-before-introduction snags round 1 identified
(`task`, `always @(*)`, `!==`) are all closed with one sentence each, exactly as prescribed. The
recapitulation pile-up is gone. There is now something to *do* at the end.

The one place a beginner still stumbles is the hex/binary ambiguity of **N1**, and the stumble is
recoverable rather than fatal — the printed labels name the correct bit positions, so a reader who
cannot resolve the contradiction still learns the right structure, they just lose confidence in a
transcript that is in fact correct. In a chapter that has spent 700 lines earning the reader's trust
in its captured output, that is the wrong place to spend it.

## Remaining defects

Two real (both new this round, detailed above), plus four small ones. Nothing from round 1 is still
open.

**Real**

1. **N1 — unlabelled hex in the guard/round/sticky worked example** (chapter lines 704–718,
   `src/ch02/tb_operators.v` lines 100–110). Detailed above.
2. **N2 — the elaboration guard's stated rationale is false of the shipped code, and the guard
   rejects working parameter pairs** (`align_sticky.v` lines 27–29, `bad_align_shw.v` lines 5–14,
   chapter line 802). Detailed above.

**Small**

3. **The `shortreal` callout is aimed at the wrong chapter.** Chapter line 513 is labelled "Seed for
   chapter 14" and then says "That is how the final testbench will build its golden model: compute
   the expected sum in host floating point, convert to bits, compare against the DUT bit for bit."
   Per STATE.md, chapter 14 is "Research frontier: FP accelerators, bfloat16/posits, annotated
   bibliography" — no testbenches. STATE.md's own toolchain-findings note says this result is for
   **chapters 5, 9 and 12**. The seed should read "Seed for chapter 12" (or 5). This is the only
   cross-reference in the chapter that does not resolve to what it points at; the other thirteen all
   do.

4. **`-Wall` exception count is one short.** Line 1472: "Every warning you have seen in this chapter
   came from that set … The one exception is `Numeric constant truncated to 4 bits`." The chapter
   also quotes `warning: Using SystemVerilog 'N bit vector. Use at least -g2005-sv to remove this
   warning.` at line 595, which is likewise outside the seven `-Wall` classes. It only appears at
   `-g2005`, which the reader never builds at, so the sentence is defensible — but "the one
   exception" is a countable claim in a chapter that invites counting. Say "two exceptions", or
   qualify as "the one exception at `-g2012`".

5. **`README.md` overclaims relative to the chapter.** Line 4: "Every listing in chapter 2 is a
   verbatim copy of a file in this directory." Ten are whole files, seven are excerpts, and ten are
   illustrative fragments with no backing file at all. The chapter's own closing sentence (line
   1584) is precise about this; the README should borrow its wording.

6. **`align_sticky` is now a misleading module name** — it produces `aligned`, `guard`, `round` and
   `sticky`, and the chapter's whole argument is that sticky is one of three and not the point.
   Cosmetic; mentioned only because the name is quoted about a dozen times and will be inherited by
   chapters 8 and 9, so if it is going to change, now is cheap.

**Explicitly checked and clean**

No orphaned cross-references (all 8 chapter-1 heading references and all 5 internal ones resolve),
no contradictions with nearby text, no broken markdown (166 fence markers balanced, every table's
rows match its header), no duplicated sentences, no checklist item unsupported by the text, no
listing divergent from its file, no stale transcript, and no `<=` leakage into a chapter that says
it contains none.

## Required changes for a 9+

Items 1 and 2 are mandatory and are the whole gap between 8 and 9. Items 3–6 are what separate a 9
from a 10. All six are small; none needs a rewrite of anything.

1. **Label the base in the guard/round/sticky example.** In `src/ch02/tb_operators.v`, change the
   two `$display("   sticky_src = %h", sticky_src);` calls so the base is unambiguous. Preferred:
   print binary — `$display("   sticky_src = 24'b%b", sticky_src);` — so the reader can see the
   guard bit sitting above the round bit and the sticky field below it, which is the whole point of
   the example. Minimum acceptable: `"   sticky_src = 24'h%h"`. Then regenerate the transcript at
   chapter lines 706–716. *(Closes N1.)*

2. **Restate the reason for the elaboration guard, and correct `bad_align_shw.v`'s comment.** Delete
   the claim that without the guard "the saturation constant truncates and the shifter silently
   stops shifting" from all three places (`align_sticky.v` lines 27–29 and the identical text in the
   chapter listing, `bad_align_shw.v` lines 5–11, chapter line 802). Replace with the truth: the
   truncation was killed by making `SH_MAX` a full-width `localparam [31:0]`, and the generate-`if`
   enforces a *design contract* — that `shamt` must be wide enough to command the full `W+2`
   saturating shift, so an instance that can never fully align a significand fails the build instead
   of producing a quietly incomplete alignment. Give credit for the correctness fix where it belongs
   (writing the width down on purpose), because that is the chapter's own lesson. *(Closes N2. If
   you would rather keep the current narrative, the alternative is to make it true by reverting
   `SH_MAX` to `[SHW-1:0]` — but do not; the current code is better.)*

3. **Re-aim the `shortreal` seed** at line 513 from chapter 14 to chapter 12 (or 5), matching
   STATE.md. *(Closes remaining defect 3.)*

4. **Promote the sticky-bit material to its own `##` section** — "Reduction Operators and the Sticky
   Bit" — between "The Operators" and "Width and Signedness", and add one sentence at its head
   telling a reader who is not ready for rounding that they should take the module and the reduction
   OR and move on. About thirty words, and it removes the only structural objection to teaching
   G/R/S in chapter 2. While there, define ULP parenthetically in exercise 1.

5. **Fix the two countable overclaims**: "the one exception" at line 1472 (there are two, or qualify
   it with "at `-g2012`"), and `README.md` line 4 (ten listings are whole files, seven are excerpts,
   ten are fragments — borrow the chapter's own wording from line 1584).

6. **Harden the guard against its own width bug** (`align_sticky.v` line 40): `1 << SHW` is a 32-bit
   shift and wraps to 0 at `SHW >= 32`, so the guard fires spuriously at `W=24, SHW=32`. Write
   `if (SHW < 32 && (32'd1 << SHW) <= SH_MAX)` or reformulate with `$clog2`. Purely a matter of the
   module practising what the chapter preaches. *(Closes N3.)*

Not required, but worth considering while the file is open: rename `align_sticky` to something that
names all four outputs, before chapters 8, 9 and 12 inherit the name.
