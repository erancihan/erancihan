# Chapter 2 Review, Round 3 — The Verilog Language

**Reviewer persona:** pedagogy expert (HDL course designer; recompiles, re-runs and independently re-derives everything)
**Reviewed:** 2026-08-09
**Toolchain:** Icarus Verilog 13.0 (stable) `v13_0`, macOS 24.6.0 arm64, Homebrew; Python 3.13.7
**Previous rounds:** `reviews/ch02-review.md` — 7/10, four blocking defects; `reviews/ch02-review-r2.md` — 8/10, two new fix-round defects plus one latent

<!-- sections complete: 8/8 -->

## Verdict

**Score: 8/10**

Fix round 2 closed everything round 2 asked for and closed it properly: I reproduced the round-2
reviewer's disproof, then re-ran it against the new code, and the rewritten rationale is now true in
both directions — deleting the generate-`if` gives **zero** mismatches at all six parameter pairs it
rejects, while narrowing `SH_MAX` back to `[SHW-1:0]` breaks 1,160 of 1,280 vectors at `W=32, SHW=5`
and reproduces the chapter's "a significand that needed moving twenty places moves two" sentence
verbatim, so the credit for correctness is now assigned to the right line of code. The module itself
is the most thoroughly checked thing in the guide: my own reference, written a third way from exact
rational arithmetic on the discarded fraction rather than from bit indices, agrees with the DUT on
**79,104 vectors with zero mismatches** across six parameter pairs including two exhaustive ones and
binary64; the harness is 27/0, all 27 listings are byte-identical or exact substrings of their files,
and all 54 transcripts reproduce. It is held at 8 by two real defects that are not the round-2 ones:
the section move left **four positional cross-references pointing at the wrong section** — three
consecutive "the next section" pointers in "Writing Numbers Down" that now skip two `##` sections
instead of one — and the `-Wall` paragraph, which fix round 2 edited, is **still empirically wrong**:
it attributes the port-width warning to the `portbind` class and places `@* found no sensitivities`
inside the `-Wall` set, when `-Wno-portbind` fails to suppress the first and both appear with no `-W`
switch at all, so there are four ungated warnings among those quoted, not the two the chapter now
claims. Both are one-line repairs and neither propagates wrong hardware into chapter 9; with them
closed this is a 9.

## Status of round-2 defects

### N1 — unlabelled hex in the guard/round/sticky worked example. **CLOSED.**

`src/ch02/tb_operators.v` lines 102–103 and 108–109 now read:

```verilog
    $display("   sticky_src = 24'h%h   bits [7:0] = 8'b%b", sticky_src,
             sticky_src[7:0]);
```

so the fix round took the *better* of the two options round 2 offered rather than the cheaper one —
it labels the base **and** prints the indexed field in binary. The regenerated transcript at chapter
lines 796–806 reproduces character-for-character on a fresh run:

```
-- guard, round and sticky for a right-shift of 5
   sticky_src = 24'h000010   bits [7:0] = 8'b00010000
  1  sticky_src[4]     guard
  0  sticky_src[3]     round
  0  |sticky_src[2:0]  sticky
   sticky_src = 24'h000011   bits [7:0] = 8'b00010001
```

I read it as a beginner would and worked every index by hand. `8'b00010000` read right-to-left from
bit 0 puts the `1` at position 4, so `guard = 1`; position 3 is `0`, so `round = 0`; positions 2–0
are `000`, so `sticky = 0`. `8'b00010001` differs only at bit 0, so `sticky = 1`. **All six printed
answers now agree with the reader's own arithmetic**, which is exactly what round 2 said they must.
The callout sentence at line 808 — "Read the binary field right to left, counting from bit 0. In both
values the guard bit at position 4 is the `1`, and the round bit at position 3 is the `0` immediately
to its right" — is correct for both values, including the second one where two `1`s are present.

Round 2's aggravating detail is also gone: there is no longer any bit pattern in the chapter printed
without its base.

### N2 — the elaboration guard's rationale was false, and it over-rejected. **CLOSED, and closed to a standard I could not fault.**

The fix round claims it reproduced the reviewer's disproof before rewriting. I did the same thing
independently, and then went further and tested the *counterfactual the new text asserts*, which is
the part that could still have been wrong.

**Half one — is the guard really design-intent only?** I built a copy of `align_sticky.v` with the two
guard lines deleted and ran it against my own model at every parameter pair the shipped guard rejects:

| Parameter pair | Vectors | Mismatches with guard **removed** |
|---|---|---|
| `W=32, SHW=5` (the `bad_align_shw.v` pair) | 1,280 | **0** |
| `W=30, SHW=5` (round 2's second pair) | 1,280 | **0** |
| `W=6, SHW=3` | 320 | **0** |
| `W=14, SHW=4` | 640 | **0** |
| `W=53, SHW=5` | 1,280 | **0** |
| `W=62, SHW=6` | 2,560 | **0** |

The module is correct for every parameter pair, including all six the guard refuses. The rewritten
text says exactly that, in all three places round 2 named:

- `align_sticky.v` lines 29–37: "This is a DESIGN-INTENT check, not a correctness patch. The
  arithmetic below is right for every parameter pair, including the ones the check rejects."
- `bad_align_shw.v` lines 10–17: "`align_sticky.v` would still compute correct outputs for all 32
  shift amounts a 5-bit port can express -- this pair is refused on DESIGN INTENT, not on arithmetic."
  The `32'd34 & 5'h1F = 5'd2` narration of a bug that never shipped is **gone**.
- Chapter line 911: "The `if` is the other thing, and it enforces a **design contract** rather than a
  correctness property. Be clear about which, because a check defended by the wrong reason is a check
  somebody deletes later."

That last clause is the sentence that turns a correction into a lesson, and it is the right one.

**Half two — is the credit now assigned to the right line?** The chapter (line 909) and the module
comment both now claim the correctness comes from `localparam [31:0] SH_MAX`, and both offer a
specific, checkable counterfactual: narrow it to `[SHW-1:0]` and at `W=32, SHW=5` "every shift of
three or more silently saturates to two, so a significand that needed moving twenty places moves two."

I built exactly that variant — `SH_MAX` narrowed, **generate-`if` left in place**, which is what a
reader following the text would do — and it compiles and misbehaves precisely as described:

```
sh=2  aligned=37ab6fbb g=1 r=1 s=0
sh=3  aligned=37ab6fbb g=1 r=1 s=0
...
sh=20 aligned=37ab6fbb g=1 r=1 s=0      <- correct answer is aligned=00000dea g=1 r=1 s=1
all shifts 3..31 identical to shift 2 ? True
```

1,160 of 1,280 vectors wrong. Note the mechanism the fix round got right without saying so: narrowing
`SH_MAX` also makes the guard condition `(32'd1 << 5) <= 2` false, so the guard does **not** fire and
the broken module elaborates. The counterexample is therefore reachable exactly as the chapter
instructs, which is what makes the claim honest rather than merely plausible.

**One structural observation the chapter does not make.** The two mechanisms are mutually redundant
with respect to correctness: the guard accepts a pair only when `W+2` fits in `SHW` bits, and whenever
it fits, narrowing `SH_MAX` is a no-op — so *given the guard*, the `[31:0]` width is not load-bearing
either. The chapter's framing ("one is about correctness, one is about design intent") is defensible
because it is evaluated one change at a time, and the counterexample it gives is genuinely reachable.
I am not calling this a defect. It is worth one sentence if anyone touches the passage again.

### N3 — `1 << SHW` wraps at `SHW >= 32`, firing the guard spuriously. **CLOSED.**

The condition is now `if (SHW < 32 && (32'd1 << SHW) <= SH_MAX)` (`align_sticky.v` line 51). I probed
sixteen parameter pairs, comparing the observed elaboration result against the stated precondition
`2**SHW > W+2`:

| W | SHW | 2\*\*SHW | W+2 | result | expected |
|---|---|---|---|---|---|
| 24 | **31** | 2147483648 | 26 | elaborates | elaborates |
| 24 | **32** | 4294967296 | 26 | elaborates | elaborates |
| 24 | **33** | 8589934592 | 26 | elaborates | elaborates |
| 24 | 5 | 32 | 26 | elaborates | elaborates |
| 29 | 5 | 32 | 31 | elaborates | elaborates |
| 30 | 5 | 32 | 32 | FATAL | FATAL |
| 13 | 4 | 16 | 15 | elaborates | elaborates |
| 14 | 4 | 16 | 16 | FATAL | FATAL |
| 5 | 3 | 8 | 7 | elaborates | elaborates |
| 6 | 3 | 8 | 8 | FATAL | FATAL |
| 61 | 6 | 64 | 63 | elaborates | elaborates |
| 62 | 6 | 64 | 64 | FATAL | FATAL |
| 32 | 6 | 64 | 34 | elaborates | elaborates |
| 32 | 5 | 32 | 34 | FATAL | FATAL |
| 53 | 5 | 32 | 55 | FATAL | FATAL |
| 53 | 6 | 64 | 55 | elaborates | elaborates |

**Sixteen of sixteen agree; zero disagreements.** `SHW = 31, 32, 33` all elaborate, which is the
specific boundary round 2 flagged. Every rejection carries the intended message, not an incidental
syntax error.

### Round-2 small item 3 — `shortreal` seed aimed at chapter 14. **CLOSED.**

Chapter line 513 now reads "**Seed for chapter 12.**" and ends "That is how the final testbench of
chapter 12 will build its golden model". This matches STATE.md, both the chapter-12 row ("Complete
four-input adder: full source, testbench, corner case suite") and the toolchain-findings note that
names chapters 5, 9 and 12.

### Round-2 small item 4 — "the one exception" `-Wall` undercount. **STILL OPEN, and the corrected count is also wrong.**

The fix round did change "The one exception" to "There are two exceptions" (chapter line 1493). The
count is still wrong, and two class attributions in the same sentence are wrong. Full evidence in
*New defects* below, since fix round 2 touched this sentence and left it false.

### Round-2 small item 5 — `README.md` line 4 overclaim. **CLOSED (partially superseded).**

`README.md` now reads: "Every complete listing in chapter 2 is a verbatim copy of a file in this
directory; the shorter listings are verbatim excerpts from those files, with any elision marked
`// ...`. A handful of short illustrative fragments in the chapter — a declaration, an expression, a
pair of contrasting lines — have no backing file." That borrows the chapter's own wording and is
accurate against my mechanical count (9 whole files, 8 exact substrings, 10 fragments). However
`README.md`'s "Expected warnings" section still says "`bad_positional.v` — two `portbind` warnings",
which is the same misattribution as the chapter; see *New defects*.

### Round-2 small item 6 / structural item 4 — promote the section, add the skip-ahead lead-in, define ULP. **DONE.**

`## Reduction Operators and the Sticky Bit` is now a top-level section at chapter line 755, sitting
between "The Operators" (614) and "Width and Signedness" (921), exactly as prescribed. The lead-in at
line 757 is present. ULP is defined in exercise 1 (line 1525): "one ULP being the weight of the last
significand bit you kept, so half an ULP is exactly the guard position" — which is better than the
six-word parenthetical round 2 suggested, because it ties the definition to the guard bit.

The four internal cross-references the fix round claims to have repaired all resolve (lines 469, 909,
1151 and the trap-table row at 1517). It repaired the *quoted-heading* references and missed the
*positional* ones; see *Cross-reference audit*.

### The declined rename. **DECLINED — judged in *Pedagogical assessment*.**

## New defects introduced by fix round 2

Two. One is a direct consequence of the section move; the other is a sentence the fix round edited
and left false.

---

### D1. The section move orphaned four positional cross-references, and all four now point two or three sections wide

**Locations:** chapter lines 558, 581, 605 (three consecutive "the next section" pointers) and line
1027 ("the previous section").

The fix round repaired every cross-reference of the form `"Quoted Heading" below` — I checked all 34
quoted-heading references in the chapter and **all 34 resolve**, including the four the fix round
names. It did not check the references that name a section by *position* rather than by title, and
those are precisely the ones a section move breaks.

The chapter's `##` order is now:

```
L515  ## Writing Numbers Down
L614  ## The Operators
L755  ## Reduction Operators and the Sticky Bit      <-- inserted here
L921  ## Width and Signedness: The Rules That Will Break Your Adder
```

Three sentences inside "Writing Numbers Down" say "the next section" and every one of them means
"Width and Signedness", which is now **two sections away**:

| Line | Text | Means | "the next section" actually is |
|---|---|---|---|
| 558 | "…why the width rules in **the next section** have a 32 lurking in them" | Width and Signedness (L921) | The Operators (L614) |
| 581 | "it is the width algorithm poking through, and it is the subject of **the next section**" | The two-pass width algorithm (L932) | The Operators (L614) |
| 605 | "Remember that, because **the next section** shows you a much more dangerous truncation that produces no message at all" | The silent truncation (L1019) | The Operators (L614) |

and one sentence inside "Width and Signedness" points backwards the same way:

| Line | Text | Means | "the previous section" actually is |
|---|---|---|---|
| 1027 | "Compare that with the too-wide *literal* from **the previous section**, which produced `warning: Numeric constant truncated to 4 bits`" | Writing Numbers Down (L597–605) | Reduction Operators and the Sticky Bit (L755) |

**Honesty about provenance.** All four were already imprecise before the move — at round 2 the
distance was one section forward and two back. Neither round 1 nor round 2 caught them, because both
audited the quoted-heading form only. Fix round 2 did not create them, but it made all four
measurably worse and had the file open for exactly this reason. Line 605 is the sharpest instance:
it is a deliberate setup — "Remember that, because the next section shows you a much more dangerous
truncation" — and a reader who does what the sentence tells them lands in the operator precedence
table and finds no truncation at all. Three consecutive misdirections in one section is enough for a
careful reader to stop trusting the chapter's own navigation.

**Fix.** Four word-level edits, replacing the positional phrase with the title the chapter already
uses everywhere else:

- L558 → "…why the width rules in \"Width and Signedness\" below have a 32 lurking in them"
- L581 → "…and it is the subject of \"Width and Signedness\" below"
- L605 → "…because \"The silent truncation\" below shows you a much more dangerous truncation…"
- L1027 → "…the too-wide *literal* from \"Writing Numbers Down\" above…"

Note that line 909 — "That is the lesson of the next section arriving early", written by fix round 2
inside the newly promoted section — **is correct**, because Width and Signedness genuinely is the next
section from there. The fix round got the reference it wrote right and missed the four it inherited.

---

### D2. The `-Wall` membership paragraph is empirically false, and the fix round's correction to it is still short

**Location:** chapter line 1493; echoed in `src/ch02/README.md`, "Expected warnings".

Round 2 asked for "the one exception" to become two. It is now "There are two exceptions". The
sentence as it stands reads:

> Every warning you have seen in this chapter came from that set: `implicit definition of wire 'godo'`
> (the `implicit` class), `Port 2 (b) of module adder_ansi expects 8 bit(s), given 1` (`portbind`),
> `Part select [35:32] is selecting after the vector v[31:0]` (`select-range`), and `@* found no
> sensitivities so it will never trigger`. There are two exceptions, both ungated by `-Wall`: …

I tested every one of those warnings with and without `-Wall`, and with targeted `-Wno-` suppression:

| Warning quoted in the chapter | no `-W` at all | `-Wall` | `-Wall -Wno-portbind` | genuinely `-Wall`-gated? |
|---|---|---|---|---|
| `implicit definition of wire 'godo'` | absent | present | — | **yes** (`implicit`) |
| `Part select [35:32] is selecting after the vector` | absent | present (×4) | — | **yes** (`select-range`) |
| `Port 2 (b) … expects 8 bit(s), given 1` | **present** | present | **still present** | **no** |
| `@* found no sensitivities so it will never trigger` | **present** | present | — | **no** |
| `Numeric constant truncated to 4 bits` | present | present | — | no (chapter correct) |
| `Using SystemVerilog 'N bit vector` | n/a (`-g2005` only) | — | — | no (chapter correct) |

Three separate errors in one sentence:

1. **The port-width warning is not the `portbind` class.** `-Wno-portbind` does not suppress it, and
   it appears with no `-W` switch at all. Per `man iverilog`, `portbind` warns about "ports of module
   instantiations that are not connected but probably should be. Dangling input ports, for example" —
   a different diagnostic entirely. The chapter's parenthetical attribution is wrong.
2. **`@* found no sensitivities` is not in the `-Wall` set.** It is emitted unconditionally; I could
   not suppress it with any `-W` combination I tried. The sentence's structure places it inside "that
   set" by listing it alongside three warnings that are attributed to classes.
3. **Therefore "two exceptions" is wrong.** Of the six warnings the chapter quotes, **four** are
   ungated: numeric-constant-truncated, SystemVerilog-`'N`-bit-vector, the port-width mismatch, and
   `@*`-no-sensitivities. Only two — `implicit` and `select-range` — actually need `-Wall`.

**Why this is a real defect and not a nit.** This paragraph exists solely to tell the reader exactly
what `-Wall` does and does not cover, in a chapter whose closing meta-lesson is "Distrust the absence
of warnings" and whose authority rests on "every behavioural claim was run". It is also the one
paragraph in the chapter that invites counting, and round 2 already caught it miscounting once. A
reader who believes `-Wall` gates the port-width warning has a wrong model of their own toolchain —
harmless in this book, which always passes `-Wall`, but wrong.

**Fix.** Rewrite the sentence to match the measurement, for example: "Two of the warnings you have
seen came from that set — `implicit definition of wire 'godo'` (the `implicit` class) and
`Part select [35:32] is selecting after the vector v[31:0]` (`select-range`). The rest are ungated and
appear whether or not you pass `-Wall`: `Port 2 (b) … expects 8 bit(s), given 1`, `@* found no
sensitivities so it will never trigger`, `Numeric constant truncated to 4 bits`, and — at `-g2005`
only — `Using SystemVerilog 'N bit vector`." Then change `README.md`'s "two `portbind` warnings about
padded and pruned ports" to "two ungated port-width warnings about padded and pruned ports".

## Cross-reference audit

The section move is the highest-risk edit in this fix round, so I enumerated every internal reference
mechanically rather than by eye: every quoted string of 5–70 characters, every positional phrase
(`the next/previous/last/following section`, `later/earlier in this chapter`, `above`, `below`), every
`chapter N` mention, every row of the trap table's Section column, and the chapter-1 heading
references. Both chapters' `##`/`###` heading lists were extracted and used as the resolution target.

**There is no table of contents in `ch02.md`**, so nothing there could go stale.

### Quoted-heading references — 34 distinct, 34 resolve

Every one checked against the real heading list of `ch02.md` and `ch01.md`:

| Reference | Resolves to | Status |
|---|---|---|
| `"The four equality operators"` below (L162) | ch02 L667 | OK |
| `"` `function` and `task` `"` near the end (L158) | ch02 L1359 | OK |
| `"Width and Signedness"` (L194, 509, 707, 730, 747) | ch02 L921 | OK ×5 |
| `"A First Look at Procedural Blocks"` below (L416) | ch02 L1239 | OK |
| **`"Reduction Operators and the Sticky Bit"` below (L469)** | **ch02 L755** | **OK — repointed by the move** |
| `"Writing Numbers Down"` (L1493) | ch02 L515 | OK |
| chapter 1's `"Half adder and full adder"` (L55, L1193) | ch01 L245 | OK ×2 |
| Chapter 1's `"Unsigned binary"` (L194) | ch01 L585 | OK |
| chapter 1, `"The magnitude comparator"` (L416) | ch01 L239 | OK |
| chapter 1's `"The barrel shifter"` (L469, L790) | ch01 L374 | OK ×2 |
| chapter 1's `"The contrast that matters: IEEE 754 is sign-magnitude"` (L545) | ch01 L653 | OK |
| chapter 1's `"Two's complement"` (L745, L1141) | ch01 L591 | OK ×2 |
| chapter 1's `"Ripple-carry, and why it is not enough"` (L1193) | ch01 L301 | OK |
| chapter 1's `"Taming Time With a Clock"` (L1279) | ch01 L454 | OK |
| chapter 1's `"The encoder, and the priority encoder"` (L1353) | ch01 L221 | OK |

### Positional references — 18 checked, **4 wrong**

| Line | Phrase | Verdict |
|---|---|---|
| 45 | "later in this chapter" (structural ripple-carry) | OK → L1159 |
| 80 | "the next section" (`` `default_nettype none `` earned the hard way) | OK → L168/L273 |
| 156 | "the next section shows you why with a real mis-wire" | OK → L168/L237 |
| 158 | "near the end of this chapter" | OK → L1359 |
| 225 | "the reasoning waits for the next section" | OK → L309 |
| 416 | "below" | OK |
| 418 | "at `-g2005-sv` and above" | not a cross-reference (version level) |
| 469 | "below" | OK |
| 509 | "below" | OK |
| **558** | **"the width rules in the next section"** | **WRONG — skips a section, see D1** |
| **581** | **"it is the subject of the next section"** | **WRONG — skips a section, see D1** |
| **605** | **"the next section shows you a much more dangerous truncation"** | **WRONG — skips a section, see D1** |
| 707, 730, 747 | "`Width and Signedness` below" | OK |
| 732 | "which you saw in `tb_mux2.v` above" | OK → L340 |
| **909** | **"the lesson of the next section arriving early"** | **OK — written by fix round 2, correct** |
| **1027** | **"the too-wide literal from the previous section"** | **WRONG — three sections back, see D1** |
| 1149 | "every width bug in the previous section" | OK → L921 |
| 1151 | "introduced alongside `align_sticky.v` above" | OK → L812 |
| 1255 | "as `Width and Signedness` showed" | OK (backward) |

### Trap table Section column (lines 1501–1519) — 17 rows, all resolve

Every entry checked against the heading list. `"`reg` does not mean register"` → L381;
`"Describing a Machine"`/`"Procedural Blocks"` → L5/L1239; `"The implicit wire"` → L273;
`"The silent truncation"` → L1019; `"The two-pass width algorithm"` → L932;
`"The folklore about `1 << 40`"` → L1004; `"Signedness contaminates"` → L1088;
`"Arithmetic, shifts"` → L705; `"never `casex`"` → L1275; `"equality operators"`/
`"The four equality operators"` → L667; `"`for` loops are unrolled hardware"`/`"`for` loops"` → L1296;
`"Modules, Ports, and Instantiation"`/`"Modules, Ports"` → L168; `"`begin`/`end`"` → L1257;
`"Nets and variables"` → L350; `"`function` and `task`"` → L1516 → L1359;
`"System tasks and functions"` → L1403; `"The Toolchain"` → L1390.

**Row 1517 was correctly updated by the move**: "Folding guard and round into sticky makes rounding
impossible | \"Reduction Operators and the Sticky Bit\" | `align_sticky.v`, `round_ne.v`" — the section
name matches the new `##` exactly, and both files exist and still reproduce their behaviour.

### Chapter-N seeds — 8 checked against STATE.md, all correct

| Line | Seed | Target chapter per STATE.md | Verdict |
|---|---|---|---|
| 469 | Seed for chapter 9 (barrel shifter) | 09 Building a 2-input FP adder | OK |
| **513** | **Seed for chapter 12 (`shortreal` golden model)** | 12 Complete four-input adder: full source, testbench | **OK — re-aimed correctly from 14** |
| 757 | "chapter 8 is where the rounding gets taught properly" | 08 FP addition algorithm (align, add, normalize, round) | OK |
| 790 | Seed for chapter 8 (guard/round/sticky) | 08 | OK |
| 1086 | Seed for chapter 9 (width bug in the datapath) | 09 | OK |
| 1353 | Seed for chapter 9 (leading-zero count) | 09 | OK |
| 1388 | Seed for chapter 3 (blocking vs non-blocking) | 03 Combinational vs sequential | OK |
| 1443, 1485 | deferred to chapter 4 (`$dumpfile`, flag surface) | 04 Simulation and testbenches; waveforms | OK |

STATE.md's toolchain note says the `shortreal` result is for chapters 5, 9 and 12; the seed naming
chapter 12 is consistent with it and with the chapter-12 row.

### One further mis-aimed reference, pre-existing and minor

Line 703: "and it will matter when we get to `casex` in **the traps section**." `casex` is actually
taught in `### `if`, `case`, `casez`, and never `casex`` (L1275), inside "A First Look at Procedural
Blocks". "Traps Beginners Fall Into" (L1497) is an index table that carries a `casex` row pointing
back at L1275. A reader following the pointer therefore lands on an index entry that redirects them
correctly, so this is recoverable rather than broken. Not introduced by the move; missed by both prior
rounds. Cheapest fix: "when we get to `casex` below".

### Clean

No dangling reference to a heading that no longer exists; no reference to "The Operators" that should
now name the new section; no duplicated sentences over 60 characters; 166 fence markers, balanced;
every markdown table's rows match its header's unescaped-pipe count; `<=` appears 7 times in the
chapter and 9 times across the 40 source files, **every one of them relational** — the chapter-3
boundary is intact.

## Code verification

### Harness — 27 passed, 0 failed

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

`targets.txt` covers all 40 `.v` files in `src/ch02/`, matching the chapter's "You have 40 working
files and a harness" (line 1523).

### Both `xfail` targets fail for their stated reason

Compiled by hand and read the diagnostic rather than the exit status:

```
$ iverilog -g2012 -Wall -o /tmp/x1 align_sticky.v bad_align_shw.v
FATAL: align_sticky.v:52: align_sticky: SHW is too narrow to express W+2; need 2**SHW > W+2
       During elaboration  Scope: genblk1
1 error(s) during elaboration.            (exit 1)

$ iverilog -g2012 -Wall -o /tmp/x2 bad_nettype_none.v
bad_nettype_none.v:13: error: Net godo is not defined in this context.
1 error(s) during elaboration.            (exit 1)
```

Both fail during **elaboration**, which is the phase the chapter claims (line 919), and neither fails
incidentally on a syntax error or missing module. Note the line number: the fix round's comment
rewrite moved the `$fatal` from line 41 to line 52, and the chapter's transcript at line 914 says
`align_sticky.v:52`. **The transcript was correctly regenerated**; had it not been, it would read 41.

### Independent verification of the sticky-bit module — my own model, third formulation

Round 2 modelled the shift as a quotient-and-remainder split; the testbench models it by index
arithmetic ("which mantissa bit lands here"). I deliberately used neither. My reference derives G, R
and S from the **arithmetic value of the discarded fraction**, using exact `Fraction` rationals — which
is the definition an FP rounder actually needs, expressed in value terms rather than bit terms, so a
shared index-level misconception could not survive in all three:

```python
def ref(M, n, W):
    n_eff = min(n, W + 2)                 # the module's stated saturation
    V = F(M, 1 << n_eff)                  # exact value of the shifted significand
    aligned = int(V) & ((1 << W) - 1)     # integer part, kept to W bits
    frac = V - int(V)                     # the discarded remainder, in [0,1)
    guard = 1 if frac >= F(1, 2) else 0   # is what was lost at least half an ULP?
    frac -= F(guard, 2)
    round_ = 1 if frac >= F(1, 4) else 0  # ...and a quarter ULP of the rest?
    frac -= F(round_, 4)
    sticky = 1 if frac > 0 else 0         # anything at all left?
    return aligned, guard, round_, sticky
```

I drove the real `align_sticky.v` from a driver of my own (`$readmemh` vector file; not
`tb_align_sticky.v`) and diffed all four outputs:

| Instance | Coverage | Vectors | Mismatches |
|---|---|---|---|
| `W=8, SHW=5` | **exhaustive** — all 256 mantissas × all 32 shifts (max shift 31 ≫ sat 10) | 8,192 | **0** |
| `W=6, SHW=4` | **exhaustive** — all 64 mantissas × all 16 shifts (max 15 ≫ sat 8) | 1,024 | **0** |
| `W=24, SHW=6` | 20 edge + 300 random mantissas × all 64 shifts | 20,480 | **0** |
| `W=32, SHW=6` | 6 edge + 300 random mantissas × all 64 shifts | 19,584 | **0** |
| `W=53, SHW=6` | binary64 significand; 6 edge + 200 random × all 64 shifts | 13,184 | **0** |
| `W=24, SHW=5` | the chapter's defaults; 20 edge + 500 random × all 32 shifts | 16,640 | **0** |

**79,104 vectors, zero mismatches.** All eight `(g, r, s)` combinations were observed at every
parameter pair. In every pair the maximum shift exceeds the saturation threshold `W+2`, so saturation
and beyond are exercised, not just approached: at `W=24, SHW=5` shifts 26–31 all sit past saturation,
and at `W=6, SHW=4` shifts 8–15 do. Shift amounts 0, 1 and 2 — the cases where guard and round have no
source bit and must read as 0 — are exercised exhaustively at two widths.

I also checked the module header's saturation claim independently: at `n = W+2`, `aligned`, `guard`
and `round` are all zero and `sticky = |mant`, so no further shift can change anything. True by
construction and confirmed in the data.

### The elaboration guard boundary

Sixteen parameter pairs probed; **sixteen of sixteen agree with the stated precondition `2**SHW >
W+2`, zero disagreements**. The full table is in *Status of round-2 defects* → N3. The three pairs
this review was specifically asked about — `SHW = 31, 32, 33` — all elaborate, closing round 2's N3.
Round 2's own twelve-pair table reproduces exactly, with its one wrong row (`W=24, SHW=32`) now
correct. `W=53, SHW=5` FATALs and `W=53, SHW=6` elaborates, so exercise 3's answer is still 6 and is
still derivable from the stated rule.

### The guard is design-intent only; the width is what carries correctness

Both halves measured, not argued. Guard deleted → 0 mismatches over 7,360 vectors at the six pairs it
rejects. `SH_MAX` narrowed to `[SHW-1:0]` with the guard left in place → the module elaborates
(because the narrowed constant also falsifies the guard condition) and produces 1,160 wrong results
out of 1,280 at `W=32, SHW=5`, with every shift from 3 to 31 returning the shift-2 answer. The
chapter's sentence "a significand that needed moving twenty places moves two" is literally true of the
capture. Detail in *Status of round-2 defects* → N2.

For completeness: the narrowed variant is **correct** at `W=24, SHW=5` and `W=29, SHW=5` (0 mismatches
of 1,280 each), which is consistent — narrowing only bites at pairs where `W+2` does not fit in `SHW`
bits, i.e. exactly the pairs the guard rejects.

### Listing-versus-file comparison — 27 blocks, no divergence

All 83 fenced blocks extracted mechanically (27 `verilog`, 2 `sh`, 54 untagged output) and every
`verilog` block diffed against `src/ch02/`:

| Result | Count | Files |
|---|---|---|
| **byte-identical whole file** | 9 | `half_adder.v`, `tb_half_adder.v`, `adder_ansi.v`, `comb_max.v`, `byte_select.v`, **`align_sticky.v`**, `full_adder.v`, `ripple4.v`, `lzc8.v` |
| **exact contiguous substring** | 8 | `adder_1995.v`, `bad_positional.v`, `mux2.v`, `adder_ansi.v` (the one-line `{cout,sum}`), `mant_add.v`, `bad_mant_add.v`, `bad_carry_always.v`, `bad_begin_end.v` |
| illustrative fragment, no backing file | 10 | opening 3-line hook, `localparam` FP sketch, three instantiation styles, `bad_implicit.v` excerpt (elided `// ...`), array declaration, `signed` declarations, `a && b`/`a & b`, `r8 = a + b`/`r8 = {a + b}`, wide-intermediate fix, net declaration assignment |

**No staleness and no divergence anywhere.** The `align_sticky.v` listing at chapter lines 814–887 is
byte-identical to the file *including its rewritten 34-line header comment* — this is the listing most
at risk after fix round 2 rewrote the rationale in the source, and it was correctly re-copied. The
`tb_operators.v` change is not quoted as a listing, only as a transcript, and that transcript is fresh
(below).

### Transcript freshness — 54 of 54 reproduce

I recompiled and re-ran all 27 targets from scratch into a clean scratch directory, capturing compile
and run output separately, and matched all 54 untagged blocks against the captures:

- **49** match a single capture verbatim.
- **3** (`bad_positional`, `bad_implicit`, `bad_carry_always`) match once compile warnings and run
  output are concatenated — which is what a reader sees typing the two commands in sequence, and how
  the chapter presents them. I confirmed each is an exact in-order concatenation, not a loose match.
- **2** (`tb_partsel` out-of-range selects at L473, `tb_literals` constant truncation at L599) carry
  the chapter's own `...` elision marker; both halves of each match exactly.
- **1** (the `$nosuchtask` session at L1467) is not a tree file. I rebuilt it from my own `one.v` and
  reproduced it character-for-character, including `iverilog exit: 0`, the `vvp` load-time error text,
  `vvp exit: 1`, and the `-t null` exit of 0. The `$nosuchfunc(3)` form behaves identically as claimed.

The two blocks fix round 2 claims to have regenerated both check out: the guard/round/sticky callout
at L796–806 (new `24'h%h` + `8'b%b` format) and the `bad_align_shw` elaboration error at L913–917
(new line number 52). **Nothing is stale and nothing is fabricated.**

### Exercise claims re-verified

| Exercise | Claim | Result |
|---|---|---|
| 2 | change `\|shifted[W-1:0]` to `\|shifted[W+1:0]`, run `tb_align_sticky.v` unchanged: "It reports twenty failures" | **exactly 20** per-vector `FAIL` lines (the 21st `FAIL` string is the `$fatal` summary, "20 error(s)") |
| 2 | "the one to look at is `mant=000010 shamt=5`, where an exact tie is misreported as a value above a tie" | present verbatim: `FAIL W=24 mant=000010 shamt=5 : got aligned=000000 g=1 r=0 s=1, want aligned=000000 g=1 r=0 s=0` |
| 3 | at `W=53`, derive the smallest legal `SHW` | `SHW=4` FATAL, `SHW=5` FATAL, `SHW=6` elaborates — answer 6, derivable from `2**SHW > 55` |
| 1 | `round_ne.v` / `tb_round_ne.v` worked answer | harness green; 16 exhaustive cases against the independent `{g,r,s}` vs `3'b100` formulation |

### Other machine checks

| Check | Result |
|---|---|
| `iverilog -V` | `Icarus Verilog version 13.0 (stable) (v13_0)` — matches chapter L49 |
| `-Wall` class membership per `man iverilog` | `anachronisms, implicit, macro-replacement, portbind, select-range, timescale, sensitivity-entire-array` — the chapter's list at L1491 is verbatim correct; the *attribution* sentence that follows is not (see D2) |
| word count | 18,316 total (15,040 prose + 3,276 code and captured output), up from 17,879 at round 2 |
| markdown fences | 166 markers, balanced |
| markdown tables | every table's rows match its header's unescaped-pipe count |
| duplicated sentences >60 chars | none |
| checklist items | 22 |
| `<=` used as an assignment | zero, in the chapter and in all 40 source files |
| `.v` file count vs "40 working files" | exactly 40 |

## Pedagogical assessment

### Does "Reduction Operators and the Sticky Bit" belong where it now sits?

**Yes.** Round 2 prescribed the position; having read the chapter straight through in the new order, I
would have prescribed the same one, and for a reason round 2 did not give.

The section now *ends* on the `SH_MAX` width lesson, explicitly labelled "That is the lesson of the
next section arriving early" (L909), and then hands straight over to "Width and Signedness". That is
a genuine ramp rather than a join: the reader meets a real width bug in a module they have just built
and run, is told it is an instance of a rule they are about to learn, and turns the page into the
rule. The densest 1,900 words in the chapter now open with the reader already holding a concrete
example of what they are for. Neither round 1 nor round 2 asked for that; it fell out of the move, and
it is the single best structural thing in the chapter.

The three arguments round 2 gave for keeping G/R/S in chapter 2 at all still hold: chapter 1 laid the
vocabulary (I re-confirmed its headings exist and are referenced correctly), a reduction OR needs a
motivating use and "the OR of everything below the round bit" is the best one in the language, and
everything in the callout is testable with what the reader already knows.

### Does the chapter still flow?

Yes. The `##` order reads: framing → first module → modules and ports → data types → literals →
operators → reduction and sticky → width and signedness → `assign` → procedural blocks → toolchain →
traps → exercises → checklist → bridge. Nothing is stranded and nothing is used before it is
introduced, with two qualifications:

1. **"The Operators" now has no reduction subsection and no signpost saying so.** Its opening still
   says the operator set is "close to C's, with reduction operators bolted on at the top", and the
   precedence table's row 1 lists all six of them — but the four subsections that follow are logical
   vs bitwise, equality, arithmetic/shifts/conditional, and concatenation. A reader scanning that
   section as the operator reference will not find reduction operators explained in it. One clause at
   the end of "Concatenation and replication" — "the sixth family, the reduction operators, gets the
   next section to itself, because the best example of one is a floating point sticky bit" — closes
   the gap for about twenty words and doubles as a hook.
2. **The four orphaned positional cross-references (D1)** are a flow defect as well as a factual one:
   three of them fire in a row inside "Writing Numbers Down" and all three now point past the new
   section.

### Is the skip-ahead lead-in honest about what a non-IEEE-754 reader can take?

Mostly, and it is the right instinct. Line 757: "This is the one place in the chapter where the
floating point payload arrives early. If the rounding rule in the callout below does not land on first
reading, take the reduction OR and the module that follows it and move on — chapter 8 is where the
rounding gets taught properly."

That is honest about the *rounding*: it promises nothing, names where the real treatment lives, and
matches STATE.md's chapter-8 scope. It is also consistent with the module comment ("the shape chapter
8 needs") and the callout label ("Seed for chapter 8"), so the reader is told three times that they
are being handed a shape rather than a theory.

Two things it gets slightly wrong for the reader it is written for:

- **"Move on" points past material that is not floating point at all.** The last 15 lines of the
  section (L905–919) are the `localparam [31:0]` width lesson and the generate-`if`/elaboration-phase
  lesson. Both are core Verilog, both are cross-referenced later, and a reader who takes the lead-in
  literally skips them. The lead-in should say "…take the reduction OR and the module, and read to the
  end of the section anyway — the last two pages are about widths and elaboration phases, not about
  floating point."
- **It names chapter 8 but not chapter 7.** A reader who has genuinely not met IEEE 754 needs chapter
  7 (*IEEE 754 single precision in depth*) before chapter 8 will help them. Chapter 1 did lay enough
  groundwork that this is not disorienting, but "chapters 7 and 8" costs two characters.

### Is the worked example now genuinely readable by a beginner?

**Yes, and this is the clearest single improvement in the round.** I worked every printed index by
hand against the printed values, which is the test round 2's N1 failed. `24'h000010   bits [7:0] =
8'b00010000` gives the reader both the width-and-base of the whole register and a binary field they
can count on their fingers; the guard bit is visibly one position left of the round bit, and the two
mantissas visibly differ only at bit 0. That is the thing round 2 said would be "better teaching" than
the minimum fix, and the fix round chose it.

The one residual ambiguity is small: in the second value, `8'b00010001`, the sentence "the guard bit at
position 4 is the `1`" is technically fine but there are two `1`s on the line. "the `1` at position 4"
would remove the last flicker of doubt. Not worth a fix round on its own.

The four `>> 5` rows in the `align_sticky` transcript remain the strongest argument in the section —
all four produce `aligned=000000`, all four lost a `1`, and all four demand different rounding — and
the prose at L903 states that argument cleanly. Exercise 2 (break sticky on purpose, predict twenty
failures, find the one that matters) is still verified working and is worth more than another page of
prose.

### Judging the declined rename

The fix round declined to rename `align_sticky` to `align_grs`, judging the churn a worse bet than the
leftover name. **I think declining was defensible for this round and wrong in the long run, and there
is a third option neither round considered.**

*The case that the name is a real problem.* The module has four outputs. The section's entire thesis is
that sticky is one of three quantities and is **not** sufficient alone — "a module that reported only
'did anything fall off' would emit the identical answer for every one of them". A module named after
the one insufficient signal quietly argues against the lesson it exists to teach, and it is the name
chapters 8, 9 and 12 will inherit. The price of the rename rises with every chapter written.

*The case for declining.* The rename is not one `sed`. It touches `align_sticky.v`, `tb_align_sticky.v`,
`bad_align_shw.v`, `targets.txt`, three `README.md` rows, about a dozen chapter mentions, and — the
expensive part — **four captured transcripts that embed the name**, including the `FATAL:
align_sticky.v:52: align_sticky: …` elaboration error whose *line number* also depends on the file, the
`PASS tb_align_sticky (…)` line, and exercise 2's quoted `FAIL` line. Regenerating transcripts is
exactly the activity that has introduced a fresh defect in each of the two previous fix rounds. Against
a chapter that is otherwise one sentence and four pointers away from shipping, that is a poor trade.

*The option nobody proposed.* Keep the name and spend fifteen words admitting it. One parenthetical at
line 812 — "(the name is a leftover from an earlier version: it produces four outputs, and sticky is
only one of them)" — removes the confusion entirely, costs no churn, touches no transcript, and is
strictly better than either renaming now or saying nothing. **That is what I would do.** If the rename
happens instead, it should be the last change made before sign-off, done mechanically, with the full
harness and a transcript diff re-run afterwards.

Either way, STATE.md should record the decision, so chapters 8, 9 and 12 inherit a settled name rather
than re-litigating it.

### Does a beginner survive the chapter?

Yes, and more comfortably than at round 2. Time to first green run is unchanged and excellent — two
commands at line 135 of 1,606, about 8% in, with a complete runnable pair above them and real output
ending in `PASS` below. The chapter ends on four exercises with three verified worked answers rather
than on a third summary. The one place a reader is now actively misdirected is the three consecutive
"the next section" pointers of D1, and the one place they are told something false about their tools is
the `-Wall` paragraph of D2.

## Remaining defects

Two real, three small. Nothing from round 1 or round 2 is still open.

**Real — these are the gap between 8 and 9**

1. **D1 — four positional cross-references point at the wrong section** (chapter lines 558, 581, 605,
   1027). Three consecutive "the next section" pointers in "Writing Numbers Down" now skip two `##`
   sections; "the previous section" at 1027 now reaches back three. Aggravated by the section move and
   not repaired. **Fix: four word-level edits**, replacing the positional phrase with the section title
   the chapter already uses everywhere else. Exact replacements given in *New defects* → D1.

2. **D2 — the `-Wall` membership paragraph is empirically false** (chapter line 1493, echoed in
   `src/ch02/README.md` under "Expected warnings"). It attributes the port-width warning to the
   `portbind` class (`-Wno-portbind` does not suppress it; it appears with no `-W` at all), places
   `@* found no sensitivities` inside the `-Wall` set (it is ungated), and therefore counts two
   ungated exceptions where there are four. **Fix: one sentence in the chapter and one bullet in the
   README**; replacement wording given in *New defects* → D2.

**Small — these separate a 9 from a 10**

3. **"The Operators" has no reduction subsection and no handoff.** After the promotion, that section
   covers five operator families and silently omits the sixth, whose treatment is now the next `##`.
   One clause at the end of "Concatenation and replication" fixes it and doubles as a hook into the new
   section.

4. **The skip-ahead lead-in over-permits skipping** (line 757). "Take the reduction OR and the module
   that follows it and move on" points a reader past L905–919, which is the `localparam` width lesson
   and the elaboration-phase lesson — core Verilog, not floating point, and both cross-referenced
   later. Add "…and read to the end of the section anyway; the last two pages are about widths and
   elaboration, not floating point." Naming chapter 7 alongside chapter 8 in the same sentence would
   also help a reader who has genuinely not met IEEE 754.

5. **`casex` reference points at the index instead of the treatment** (line 703): "when we get to
   `casex` in the traps section". `casex` is taught at L1275; the traps section is a table that
   redirects there. Pre-existing, missed by rounds 1 and 2, recoverable by the reader. Change to
   "when we get to `casex` below".

**Considered and explicitly not raised as defects**

- The `align_sticky` name. A judgement call, argued in *Pedagogical assessment*; my recommendation is
  a fifteen-word parenthetical rather than either a rename or silence.
- The mutual redundancy of the generate-`if` and the `[31:0]` `SH_MAX` with respect to correctness. The
  chapter's one-change-at-a-time framing is defensible and its counterexample is genuinely reachable;
  I verified both.
- "You have 40 working files" (line 1523) when two of the 40 deliberately do not compile. The
  surrounding text and the README both explain the two `xfail` files clearly.

**Explicitly checked and clean**

Harness 27/0. Both `xfail` targets fail during elaboration for their stated reasons. All 27 Verilog
listings byte-identical or exact substrings of their files, including the rewritten `align_sticky.v`
header. All 54 transcripts reproduce, with the two regenerated ones confirmed regenerated (new format
string, new line number 52). 79,104 vectors against an independently formulated model, zero
mismatches. Guard boundary correct at 16 of 16 parameter pairs including `SHW = 31, 32, 33`. All 34
quoted-heading cross-references resolve; all 17 trap-table section entries resolve; all 8 chapter-N
seeds match STATE.md. No duplicated sentences, balanced fences, consistent tables, no `<=` leakage into
a chapter that says it contains none.

## Sign-off

**Not yet fit to ship as chapter 2 — but it is two edits away, and neither needs a fix-round agent.**

The substance is done. The code is the most heavily verified artefact in this guide: 27/0 on the
harness, both `xfail` targets failing in the right phase for the right reason, every listing identical
to its file, every transcript reproducing, and the chapter-8/9/12 seed module agreeing with an
independently formulated reference over 79,104 vectors with zero mismatches at six parameter pairs
including two exhaustive ones and binary64. All three round-2 defects are closed, and N2 is closed to a
higher standard than round 2 asked for — the rewritten rationale is not merely more cautious, it is
**measurably true in both directions**, which I confirmed by rebuilding both counterfactuals. The
section move was the right structural call and produced an unlooked-for pedagogical gain: the chapter
now walks the reader from a concrete width bug in a module they just ran straight into the section that
explains it.

What stands between this and shipping is not a rewrite. It is:

1. **Four word-level edits** at chapter lines 558, 581, 605 and 1027, replacing "the next section" and
   "the previous section" with the section titles the chapter already uses everywhere else. Exact
   replacements are in *New defects* → D1.
2. **One sentence** at chapter line 1493 and **one bullet** in `src/ch02/README.md`, restating `-Wall`
   membership to match what the tool actually does. Replacement wording is in *New defects* → D2.

That is the shortest path. Both are mechanical, both are contained in prose, and — this matters, given
that the two previous fix rounds each closed defects and opened fresh ones — **neither touches a source
file, a listing, or a transcript**, so neither can regress the code or the captured output. The three
small items (a handoff clause at the end of "The Operators", a clause in the skip-ahead lead-in, and
"in the traps section" → "below" at line 703) are optional polish and can be folded into the same pass
at no additional risk.

A recommendation for the orchestrator rather than for the chapter: these two edits are cheaper to apply
inline than to commission, exactly as chapter 1's leftovers were. If they are applied inline, re-run
`bash run_all.sh ch02` once to confirm 27/0 and ship at 9/10. If a rename of `align_sticky` is ever
done, do it before chapter 8 is written and record the decision in STATE.md; my recommendation is not
to rename, but to add the fifteen-word parenthetical described in *Pedagogical assessment*.

One process note worth carrying to chapter 3 and beyond, in the same spirit as chapter 1's
"column-audit every diagram" lesson: **when a section is moved, the quoted-heading references are the
easy half.** Both fix round 2 and the two reviews before it audited `"Heading" below` and found
everything clean, while four references that name a section by position sat wrong in plain text. Any
agent that relocates a section must grep for `next section`, `previous section`, `later in this
chapter`, `earlier`, `above` and `below` as well as for quoted titles, and must resolve each one against
the post-move heading list.
