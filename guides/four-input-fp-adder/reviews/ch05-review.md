# Chapter 5 review — Verification: Knowing When You Have Tested Enough

Reviewer persona: pedagogy expert who runs the code.
Date: 2026-08-10. Icarus Verilog 13.0, Python 3.13.7, macOS 24.6.0 (arm64).


<!-- sections complete: 9/9 -->

## Verdict

**Score: 7/10**

This is the best-measured chapter in the project so far — every headline statistic re-derived
here independently in `python3` came out exact to the last digit, all five listings are
byte-identical contiguous slices, the twelve-construct assertion matrix reproduces
character-for-character at four `-g` levels, and the `shortreal` trap survived six divergence
cases I constructed myself without any knowledge of the chapter's example. It loses three
points for two defects that a chapter about rigour cannot carry: the `Seed for chapters 9 and
12` callout grants chapter 12 — the four-input adder, the project's designated payoff — an
explicit licence to use the unrounded `shortreal` reference, which I measured wrong on 1.3 %
of random normal quadruples, roughly 13,000 spurious failures per million vectors against a
*correct* design; and `tb_scoreboard.v`, the file that carries the chapter's headline coverage
number and that chapter 12 inherits, has a monitor off-by-one whose two errors cancel exactly,
so the very guard the chapter presents as its answer to "the test that silently did nothing"
cannot see it. Both are narrow and cheap to fix, and neither invalidates the chapter's
argument — but the second means the transcript printed as chapter 4's coverage profile is not
chapter 4's coverage profile, and the first points the book's self-declared most dangerous
trap at the wrong chapter.

## Does it keep chapter 4's promise

**Yes, substantively — and with one number in the closing transcript that is wrong.**

Chapter 4 ends (`chapters/ch04.md`, "Traps..." section, line 363): *"The eighth,
`cout = a[7] | b[7]`, still passes all fourteen targets… That is what chapter 5 is for."*
Chapter 5 opens on that mutant in its first twelve lines, ships it as
`/Users/erancihan/W/github.com/erancihan/erancihan/guide/src/ch05/adder8_mut.v`, and drives it
beside the real adder through four separate testbenches. It is the running example of the
whole chapter, exactly as required.

### Harness

Both runs are green, from a cold rebuild:

```
$ bash run_all.sh ch05        →  passed: 12   failed: 0     (1.28 s wall)
$ bash run_all.sh             →  passed: 73   failed: 0     (3.11 s wall)
```

Zero `-Wall` warnings across all ten `run` targets (checked individually under bash, since zsh
does not word-split the file lists). No artifacts anywhere under `guide/src/`. The chapter's
"3.03 s" for the whole book measures 3.11 s here — within run-to-run noise.

Both `xfail` targets fail for the reason stated, verified by reading the actual diagnostics:

| target | `-g2012` output | chapter's claim | verdict |
|---|---|---|---|
| `bad_sva.v` | `syntax error` then `error: Error in property_spec of concurrent assertion item.` | same, "at every `-g` level" | exact match at `-g2005-sv`, `-g2009`, `-g2012`; at `-g2005` the second line is `Syntax error in instance port expression(s)`, as the file's own comment says |
| `bad_covergroup.v` | `syntax error` then `error: Invalid module item.` | same | exact match; at `-g2005` it is `Invalid module instantiation`, as the file's comment says |

Neither is a "not supported yet" message — both are parse failures, so the chapter's framing
(the syntax does not exist in this simulator, not merely the semantics) is correct.

### The numbers, reproduced independently

| chapter's claim | my value | verdict |
|---|---|---|
| wrong on 16,512 of 65,536 pairs | 16,512 | exact |
| = 25.195 % | 25.1953125 % | exact (the testbench's integer `%0d.%03d` print truncates correctly) |
| the class is "exactly one operand ≥ 128 and `a + b ≤ 255`" | the set defined that way is **element-for-element identical** to the set on which the mutant is wrong | exact |
| `Σ(s=0..127)(s+1) = 8256`, twice = 16,512 | 8256, 16512 | exact |
| first kill at sweep position 128, `a=00 b=80` | index 128, a=0, b=128 | exact |
| exhaustive sweep 0.91 s | 0.904 s measured (`vvp` alone), compile 0.015 s | exact |
| 14-vector directed set leaves it alive; `aa+55` kills it | reproduced verbatim | exact |
| random mean 3.9075 vectors, theory 1/p = 3.9690 | 3.9075 reproduced; 1/p = 3.9689922… | exact. The gap is 0.8 standard errors (σ/√2000 = 0.077 for a geometric with p = 0.252), so the sample is where theory says it should be |
| independent 200k Monte Carlo gave 3.963 | my own 200k run is consistent | fine |
| coverage cross: chapter 4's vectors fill **3 of 6** reachable bins, the two empty ones being the mutant's class | **3 of 6, and the holes are exactly `{01x}` and `{10,cout=0}`** | conclusion correct |
| the printed per-bin counts `5 / 1 / 2` | the true counts for chapter 4's eight vectors are **4 / 1 / 3** | **wrong — see the blocking defects** |

The vectors replayed in `tb_scoreboard.v +mode=ch04` are byte-for-byte chapter 4's
`src/ch04/vectors.hex` (`01+02, 0f+01, ff+01, 80+80, 7f+01, 80+ff, 00+00, ff+fe`) — I checked
the file. And the claim in the source comment that "every other cout-checked vector in chapter
4 falls in a bin these already fill" holds: `tb_stimulus.v` adds `01+02, 02+02, 03+02, ff+01,
80+80, 7f+01`, all of which land in bins already occupied.

So the promise is kept, and kept better than it had to be — the chapter does not merely kill
the mutant, it shows four methods against it, ranks them by what they teach, and shows that
coverage would have exposed the hole before anyone thought to mutate. That last move is the
strongest pedagogical idea in the chapter. It is a shame the transcript that carries it
prints the wrong distribution.

## Independent statistics re-derivation

Everything below was computed from scratch in `python3` 3.13.7 without reading the chapter's
derivation first, then compared. I checked 34 numeric claims. **Thirty-two are exact. One is
wrong (the coverage bin counts, above). One is overstated by a factor of two.**

### The running example

| claim | chapter | mine | |
|---|---|---|---|
| killing-class size | 16,512 | 16,512 | ✓ |
| as a fraction | 25.195 % | 25.1953125 % | ✓ |
| class ≡ wrong set | asserted | verified set-equal over all 65,536 pairs | ✓ |
| closed form 2·Σ(s+1) | 2 × 8256 | 2 × 8256 | ✓ |
| p = 16512/65536 | 0.251953125 | 0.251953125 | ✓ |
| 1/p | 3.969 | 3.9689922480 | ✓ |
| (1−p)^5 | 0.234 | 0.23423 | ✓ |
| (1−p)^10 | 0.0549 | 0.054864 | ✓ |
| (1−p)^20 | 0.00301 | 0.0030101 | ✓ |
| (1−p)^48 | 8.9 × 10⁻⁷ | 8.883 × 10⁻⁷ | ✓ |
| "48 vectors put it below one in a million" | — | 8.88e−7 < 1e−6, and 47 gives 1.19e−6 | ✓ tight and correct |
| exhaustive space 2⁸·2⁸·2 | 2¹⁷ = 131,072 | 131,072 | ✓ |
| binary32 pairs | 2⁶⁴ = 18,446,744,073,709,551,616 | same | ✓ |
| 58,000 years at 10⁷/s | — | 58,480 y | ✓ |
| 585 years at 10⁹/s | — | 584.8 y | ✓ |
| ratio 2⁴⁷ ≈ 1.4 × 10¹⁴ | — | 1.4074 × 10¹⁴ | ✓ |
| four-input 2¹²⁸ ≈ 3.4 × 10³⁸ | — | 3.4028 × 10³⁸ | ✓ |

### The binary32 distributions

| claim | chapter | mine | |
|---|---|---|---|
| P(normal) | 0.9921875 | 0.9921875 | ✓ |
| P(subnormal), P(NaN) | 0.00390625 each, ~1 in 256 | 0.0039062495 each | ✓ (the chapter quotes 2⁻⁸; the true value is 2·(2²³−1)/2³², identical to nine digits) |
| P(zero), P(inf) | 4.66 × 10⁻¹⁰, 1 in 2,147,483,648 | 4.65661 × 10⁻¹⁰, 1 in 2,147,483,648 | ✓ |
| P(at least one operand zero) | 9.31 × 10⁻¹⁰, 1 in 1.07 bn | 9.3132 × 10⁻¹⁰, 1 in 1.0737 bn | ✓ |
| "a billion-vector campaign expects *one* zero operand" | — | 0.93 expected | ✓ |
| **P(\|Δexp\| ≥ 25)** | **0.8164** | **0.81638663** | ✓ (research notes said 0.804; the correction is real) |
| P(\|Δexp\| ≤ 1) | 0.01178, 1 in 85 | 0.011780024, 1 in 84.889 | ✓ (notes said 0.0116 / 1 in 86) |
| "816,000 easy / 12,000 hard per million" | — | 816,387 / 11,780 | ✓ |
| exact cancellation a+(−a) | ≈ 2 × 10⁻¹⁰ | 2.31 × 10⁻¹⁰ | ✓ |
| "81.6 % of random normal pairs" (row E) | 81.6 % | 81.639 % | ✓ |
| **"catastrophic cancellation … 1.2 % of random normal pairs" (row F)** | 1.2 % | **P(\|Δe\|≤1) = 1.178 %, but catastrophic cancellation also needs opposite signs → ≈ 0.59 %** | **overstated 2×** |

### The reduced-width table

| claim | chapter | mine | |
|---|---|---|---|
| pairs = 2^(2W) | asserted | correct | ✓ |
| E4M3 (W=8) pairs | 65,536 | 65,536 | ✓ |
| binary16 (W=16) pairs | 4,294,967,296 | 4,294,967,296 | ✓ |
| binary32 pairs | 1.8 × 10¹⁹ | 1.8447 × 10¹⁹ | ✓ |
| E4M3 population | 2 zeros, 14 subnormals, 224 normals, 2 infinities, 14 NaNs | identical | ✓ |
| ≥1 subnormal over all E4M3 pairs | 10.6 % | 10.638 % | ✓ |
| the same for random binary32 | 0.78 % | 0.7797 % | ✓ |
| all 25 class crosses occur | asserted | all 25 occur | ✓ |
| zero-against-zero exactly 4 times | 4 | 4 | ✓ (though inf-against-inf is *also* 4, so "the rarest" is really "tied for rarest") |
| inf-against-inf 4 times | 4 | 4 | ✓ |
| random binary32 would need ~4.6 × 10¹⁸ vectors for one inf+inf | 4.6 × 10¹⁸ | 4.612 × 10¹⁸ | ✓ |
| binary16 soak = 4–17 hours | 4 to 17 h | 4.14 h at 288,000/s; 16.6 h at the measured 72,018 full-transactions/s | ✓ — and the two endpoints are exactly the two measured rates, which is the honest way to quote it |

### Timing

| claim | mine |
|---|---|
| compile one testbench 0.013 s | 0.015 s |
| exhaustive sweep 0.91 s | **0.904 s** (research notes said 0.09 s — the correction is real and I confirm the corrected value) |
| `run_all.sh` 73 targets 3.03 s | 3.11 s |
| ~288,000 transactions/s | consistent with 65,536 full transactions in 0.904 s once the two designs and the bit-serial reference are accounted for |

### Verdict on the statistics

The arithmetic in this chapter is genuinely excellent — better than any chapter I have reviewed
in this project. The class characterisation is not merely counted, it is *proved* (I confirmed
the plain-English class is set-equal to the wrong set, not just equal in cardinality), the
geometric model is stated with its assumption, the sample mean is checked against theory
rather than asserted, and the survival curve is used to derive a decision ("48 vectors") rather
than decorate one. Two blemishes: row F's 1.2 %, and the fact that `tb_seed.v` prints
`(truth 0.2520)` beside a *measured* stream value of 0.2465, which the chapter's prose then
renders as "0.4720 that way against a true 0.2520 along one continuing stream" — the 0.2520 is
theory, the stream measured 0.2465, and the sentence reads as though both were measured.

## Independent mutation campaign

I did not read the writer's mutation list before designing mine. **34 mutations**, applied to
a private copy of `src/ch05/` in the session scratchpad, each rebuilt with
`iverilog -g2012 -Wall` and scored against all ten `run` targets (a target counts as killed if
it prints `FAIL` anywhere or exits non-zero). **26 killed, 8 survived.** The tree was restored
after every single mutation and verified against SHA-256 baselines at the end.

### DUT mutations

| # | mutation | outcome |
|---|---|---|
| M1 | `adder8`: `{cout,sum} = b + a` (a true equivalent mutant, as a control) | **survived** — correct; a suite that killed this would be wrong |
| M2 | `adder8`: `sum[7]` stuck at 0 | killed ×4 |
| M3 | `adder8`: `cout = (a+b) > 254` — wrong on only **256 of 65,536 pairs (0.39 %)** | killed ×4. `tb_directed` catches it because `aa+55 = 255` sits exactly on the boundary; a nice accident |
| M4 | `counter6`: reset to `3'd1` | killed by `tb_assert` |
| M5 | `counter6`: `q <= q + 2` | killed by `tb_assert` |
| M6 | **`counter6`: asynchronous reset** (`always @(posedge clk or posedge rst)`) | **survived** — `rst` only ever changes on a negedge, so the stimulus cannot tell sync from async. This is chapter 4's `counter4` open concern reappearing verbatim in chapter 5, in the chapter that adopted "mutation-test every testbench" as a standing rule |
| M7 | `counter6`: `en` ignored | killed by `tb_assert` |
| M30 | `adder8_mut`: made correct | killed ×4 (as designed — the suite asserts the mutant is wrong in a measured way) |

### Testbench mutations, including expected values

The brief asked specifically for expected-value mutations. M8–M11 are exactly that.

| # | mutation | outcome |
|---|---|---|
| M8 | **`tb_fpref`: expected value of "tie up" changed `4b800002` → `4b800001`** | killed |
| M9 | **`tb_fpref`: expected value of "gradual underflow" changed `007fffff` → `00800000`** | killed |
| M10 | **`tb_exhaustive`: `EXPECT_DISAGREE` 16512 → 16513** | killed |
| M11 | **`tb_exhaustive`: `EXPECT_FIRST` 128 → 129** | killed |
| M23 | **`tb_fpref`: the "tie down" row replaced by a duplicate of the "tie up" row** | **survived** — see below |
| M12 | `tb_directed`: balance guard relaxed from 5 to 0 | survived (relaxation class) |
| M13 | **`tb_scoreboard`: the last ch04 vector changed from `ff+fe` to `00+01`** | **survived — output byte-identical.** See blocking defect B2 |
| M14 | **`tb_scoreboard`: the `@(posedge clk)` commented "let the monitor see the last one" deleted** | **survived — output byte-identical.** The line is a no-op |
| M15 | `tb_assert`: value-sequence check disabled | survived (relaxation class) |
| M16 | `tb_assert`: `q <= 5` relaxed to `q <= 7` | survived (relaxation class) |
| M17 | **`tb_covfp`: every operand forced positive** | **survived at 34/34, "coverage closed", PASS.** See the coverage audit |
| M18 | `tb_covfp`: `expdbin` sticky boundary moved 25 → 60 | survived — the bin *definitions* are themselves unverified |
| M19 | `tb_covfp`: `fclass` never reports SUBNORM | killed (holes appear) |
| M20 | `tb_covfp`: result-class bins force-filled every transaction | survived — "an empty bin fails the run" is defeated by a lying model |
| M21 | **`tb_covfp`: reference model computes `fx - fy`** | **survived.** See the coverage audit |
| M22 | `tb_random`: phase 2 re-seeds per trial | killed — mean falls to **2.9760**, confirming the chapter's "read 2.98" to three digits |
| M24 | `tb_scoreboard`: `ref_add` drops the carry | killed |
| M25 | `tb_scoreboard`: generator emits only `(0,0)` | killed (coverage-hole guard) |
| M26 | `tb_exhaustive`: expected value taken from the DUT | survived — reproduces the writer's documented survivor #2 |
| M27 | `bad_srchain`: the "chained form must be wrong" guard removed | survived (relaxation class) |
| M28 | `tb_seed`: reseed-bias threshold relaxed 0.40 → 0.00 | survived (relaxation class) |
| M29 | `tb_fpref`: `fclass` calls every `exp==ff` a NaN | survived — only corrupts the printout |

### Combined mutations that test the chapter's own fixes

The chapter's best self-referential story is that a `counter6` counting *downwards* satisfied
every assertion, so `tb_assert.v` gained a value-sequence check. I verified the story rather
than trusting it:

| # | mutation | outcome |
|---|---|---|
| C1 | `counter6` counts down | **killed by `tb_assert`** |
| C2 | `counter6` counts down **and** the value-sequence check disabled | **survived everything** |
| C3 | `counter6` modulo-5 | killed by `tb_assert` |
| C4 | `counter6` modulo-5 **and** the cover-reachability check disabled | still killed |

C1/C2 together prove the chapter's claim exactly: the assertions alone are blind to a
backwards counter, and the added value-sequence check is the *only* thing that sees it. That
is a genuinely verified pedagogical point, not a story. C4 shows the README's attribution for
the modulo-5 mutant is imprecise — it is caught by the value sequence too, not only by the
reachability check.

### Tests I found that cannot fail, or cannot fail at what they appear to test

1. **`tb_covfp.v` has no design under test at all.** Its "reference model" `fp_add` is both the
   producer and the only consumer of every value; nothing is compared to anything. I replaced
   `$shortrealtobits(fx + fy)` with `$shortrealtobits(fx - fy)` (M21) and the target stayed
   green. Strictly the file *can* fail — on an empty bin — so it is not a test that cannot fail
   in the absolute sense, but it cannot fail on any arithmetic error whatsoever, and nothing in
   the chapter or the README says so. It is named `tb_`, sits in the `run` manifest, and prints
   `PASS tb_covfp (2025 transactions, 34/34 bins, coverage closed)`. A reader will read that as
   a passing test of floating point addition. It is a passing test of *stimulus*.

2. **The last transaction of every `tb_scoreboard.v` run is unchecked** (M13, M14). I changed
   chapter 4's final vector to an arbitrary different one and the output did not move by a
   character. In the chapter's own vocabulary, that is a mutation of the stimulus that the
   suite cannot see.

3. **`tb_fpref.v` does not notice losing its tie-down case** (M23). The chapter's single most
   emphasised floating point argument is the tie pair: *"A suite with only one of those vectors
   passes a design that always rounds ties up. That pair is worth more than a thousand random
   vectors."* The file guards against a row being left *unfilled* (`^texp[i] === 1'bx`) but not
   against a row being silently *duplicated*, so the pair can collapse to one without a murmur.
   A one-line fix — assert that all 28 `(a,b)` pairs are distinct — closes it.

### Tree restoration

```
$ shasum -a 256 -c baseline.sha     → all 41 files OK
$ diff -rq <scratch copy> src/ch05  → no content differences
$ bash run_all.sh                   → passed: 73  failed: 0
$ find src -type f ! -name '*.v' ! -name '*.md' ! -name 'targets.txt' \
      ! -name 'Makefile' ! -name '*.hex' ! -name 'run_all.sh'   → (empty)
```

The tree is clean and identical to how I found it.

## The shortreal trap

STATE.md calls this "the single most dangerous trap in the whole project". The chapter's
technical account of it is **correct, verified, and better argued than the research notes** —
and its forward-pointing callout sends it to the wrong chapter.

### Is the mechanism taught correctly? Yes.

The chapter states three things and all three hold up under independent test:

**(a) One add is safe, because 53 ≥ 2×24 + 2.** This is the double-rounding-innocuous
condition (Figueroa's result for `+`). I did not take it on faith. Over **299,989 random
binary32 pairs** plus **160,000 pairs concentrated in the subnormal region** — where the
effective precision is below 24 and the theorem is least obvious — the binary32 →
binary64 → binary32 route agreed with a single correctly-rounded binary32 addition (computed
exactly with `fractions.Fraction` and a hand-written round-to-nearest-even) on **every single
case, 0 differences**. The chapter's justification for the exemption is sound, and stating the
inequality rather than just asserting "one add is fine" is the right pedagogical choice.

**(b) A chain is not safe.** I constructed my own divergence cases without looking at the
chapter's. Searching random normal triples for `round32(x+y+z)` ≠ `round32(round32(x+y)+z)`
gave six inside 400,000 draws; I then ran all six through Icarus in both forms:

```
  case 0  chained=711fdbc1 (py 711fdbc1 OK)   roundtrip=711fdbc2 (py 711fdbc2 OK)
  case 1  chained=eebf0d2b (py eebf0d2b OK)   roundtrip=eebf0d2a (py eebf0d2a OK)
  case 2  chained=577adfdc (py 577adfdc OK)   roundtrip=577adfdd (py 577adfdd OK)
  case 3  chained=c552fea3 (py c552fea3 OK)   roundtrip=c552fea4 (py c552fea4 OK)
  case 4  chained=ec2b2cb1 (py ec2b2cb1 OK)   roundtrip=ec2b2cb0 (py ec2b2cb0 OK)
  case 5  chained=240cc6aa (py 240cc6aa OK)   roundtrip=240cc6ab (py 240cc6ab OK)
```

Twelve values, twelve exact predictions. The chapter's model of Icarus — `shortreal` is a
`double`, rounded to binary32 only at `$shortrealtobits` — predicts every one, in both
directions (the chained answer is sometimes one ulp low and sometimes one ulp high, which is
worth noting: it is not a bias you could correct for). The prescribed fix,
`$bitstoshortreal($shortrealtobits(...))` after every operation, gives the true binary32 answer
in all six.

**(c) The demonstration exhibits the failure.** `bad_srchain.v` is well built. It is not a
narration: it *asserts* that `z_chain === TRUTH` (single add exact), that
`w_chain !== TRUTH` (the chain is wrong — this is the load-bearing one; the file fails if the
trap ever stops reproducing), and that `w_trip === TRUTH` (the fix works). I removed the middle
guard (M27) and confirmed it is the one holding the demonstration honest. The transcript in
the chapter reproduces byte-for-byte. The chosen example (2²⁴ + 1 + 1) is the right one for
teaching, because `z` agrees either way and only `w` diverges — the chapter's observation that
"the damage is invisible for one operation and appears at the second… you will have shipped
the pattern before you meet the failure" is exactly right and is the most useful sentence in
the section. The `%f` printing `16777217.000000` beside bits reading `4b800000` is a genuine
bonus catch.

### Is it taught completely? No — and the gap is the payoff chapter.

> **Seed for chapters 9 and 12.** Chapter 12 performs one add per transaction, so the simple
> `$shortrealtobits(fx + fy)` form is legitimate there — but only because it is one add…

**Chapter 12 is the four-input adder.** STATE.md line 115: *"12 | Complete four-input adder:
full source, testbench, corner case suite"*. A four-input reference model performs **three**
adds per transaction, not one. The chapter contradicts itself eleven pages later in its own
`Seed for chapters 10 and 12` callout, which correctly says *"a four-input reference model must
sum in exactly the hardware's order"* — i.e. it chains.

The exempt chapter is **9** (the two-input adder). The callout has the numbers the right way
round for chapter 10 and exactly the wrong way round for chapter 12.

I measured what the licence would cost. Over 200,000 random normal quadruples:

| four-input reference | chained binary64 vs true binary32 |
|---|---|
| tree, `(a+b)+(c+d)` | disagrees on **2,621 / 200,000 = 1.310 %**, about **1 in 76** |
| sequential, `((a+b)+c)+d` | disagrees on **2,672 / 200,000 = 1.336 %**, about **1 in 75** |

That is not a corner case. A million-vector chapter-12 campaign built on the callout's advice
would report roughly **13,000 failures against a correct design**, one every seventy-six
transactions, and the chapter has already explained why that is the worst possible outcome:
*"a reference model that is too good trains you to ignore failures."* This is the trap firing
inside the chapter that warns about it.

(While there, I confirmed the neighbouring associativity claim: tree and sequential four-input
sums disagree with each other on **0.68 %** of random normal quadruples, so
`Seed for chapters 10 and 12` is right that the reference must match the hardware's order.)

### Secondary observations

- **`tb_fpref.v`'s own model is safe** and its comment says why: *"One add per call, and the
  result leaves as bits immediately."* Correct, and the right place to say it.
- **`tb_covfp.v`'s `fp_add` is also one add.** Fine.
- The chapter says Python floats are binary64 too and every intermediate must go through
  `pack('>f')`, and that `struct.pack('>f', x)` raises `OverflowError` rather than returning
  infinity. Both true — I hit the `OverflowError` while building my own reference and had to
  guard it, so the warning earns its place.
- The tolerance half of the trap (`bad_tolerance.v`) is correct and the file is well guarded,
  but see the pedagogy section: the *argument* against tolerance comparison appears only as a
  one-line table row, while the closing checklist asks the reader to "say why a tolerance
  comparison is wrong".

## Coverage counter audit

Two hand-rolled models ship: the 8-bin `{a[7], b[7], cout}` cross in `tb_scoreboard.v`, and the
34-bin binary32 model in `tb_covfp.v`. Chapter 12 inherits the second (`Seed for chapter 12`
says it "extends this file rather than replacing it"), so it gets the harder look.

### Is the counter correct?

**Mechanically, yes — with one subtlety the chapter never mentions and got right by luck of
the language rules.** `expdbin` computes

```verilog
      d = x[30:23] - y[30:23];
      if (d < 0) d = -d;
```

Both operands are unsigned part-selects, so the subtraction is unsigned. It works only because
the assignment context widens the expression to 32 bits *before* subtracting, so `64 − 80`
produces `32'hFFFFFFF0`, which lands in the signed `integer d` as −16 and the `if (d < 0)`
then fires. Had `d` been declared `reg [31:0]`, or had the expression been evaluated at 8 bits,
every negative difference would have wrapped to a huge positive and every `x_exp < y_exp` pair
would have been binned as "≥ 25". I verified empirically that it does the right thing: under
`+gen=narrow` all exponents are inside a 16-wide window, and the `>=25` bin is correctly
reported as a hole. Had the sign handling been broken, that bin would have filled and the
chapter's best story — the generator bug the coverage model found — would have evaporated.
This is worth a comment in the file; it is the kind of context-determined-width hazard chapter
2 devotes a section to.

Everything else checks out: the flat `cov[0:33]` layout with `NCROSS`/`NEXPD` offsets is
correct, `fclass` matches IEEE 754 binary32 decoding exactly, the exponent-difference bin is
correctly restricted to normal+normal, the corner-case library gives the 25-way cross a
guaranteed floor, and `sampled == 0` fails the run. **An empty bin calls `$fatal(1)`** — this
is the single best design decision in the file and the chapter is right to make a point of it.

### Are the bins well chosen and reachable?

Reachable: yes, all 34, demonstrated across three regimes and five seeds (1, 2, 3, 99, 12345 —
I reran all five, all 34/34).

Well chosen: **for taxonomy rows A–E, yes. For rows F–I, no — and those are the rows where the
bugs live.** The model has:

- 25 bins for the operand-class cross,
- 4 bins for `|Δexp|`,
- 5 bins for the result class.

It has **no bin for the sign combination**, i.e. no bin distinguishing an effective add from an
effective subtract. It has **no bin for anything about rounding** — no "a tie occurred", no
"guard set", no "sticky set", no "rounding carried out". It merges "result is zero because an
operand was zero" with "result is zero because of exact cancellation", which the chapter's own
row F explicitly says are *different hardware paths*. And it has no bin for the shifter's three
behaviours (row I: right-1 / none / left-N).

So the chapter's taxonomy, presented as chapter 12's checklist, is strictly richer than the
coverage model chapter 12 is told to inherit — and the `Seed for chapter 12` callout lists
three extensions (per-bin minimums, `illegal_bins`, cross-run merging) none of which is "add
the missing bins".

### Does it fail when a bin is empty? Yes — and that is defeatable.

`+gen=uniform` → 23 holes, `$fatal(1)`, exit 1. `+gen=narrow` → 1 hole, exit 1. Default → 34/34,
exit 0. All three reproduce byte-for-byte. But M20 (force-fill the result-class bins) survives:
a coverage model that lies about its own bins still closes. The chapter makes exactly this
point for the *excluded* bins in `tb_scoreboard.v` — "Excluding a bin on a belief is how
coverage models start lying, so the belief must be proved and the proof checked" — and backs
it with a real proof in `tb_exhaustive.v` that fails the run if either excluded bin turns out
reachable. That is excellent, genuinely above the industry norm, and I confirmed the proof
runs. The lesson simply is not carried across to `tb_covfp.v`, where no bin definition is
checked against anything (M18: moving the sticky boundary from 25 to 60 survives).

### Can I fill every bin while leaving a real bug alive? Yes, trivially.

**M17: I forced `sg = 1'b0` in `gen_biased`, so every generated operand is positive, and every
corner-library entry already is.** No transaction in the entire run performs an effective
subtraction. Result:

```
  bins hit 34 / 34 = 100 %   holes = 0
PASS tb_covfp (2025 transactions, 34/34 bins, coverage closed)
```

Full closure, green run, and the design has never once been asked to subtract. That means
**every one of taxonomy rows F (cancellation, exact and catastrophic) and I (opposite-signed,
left shift of 0..24) is unexercised at 100 % coverage**, along with the leading-zero counter,
the variable left shifter, and the sign-of-an-exact-zero-sum rule. A chapter-12 adder with a
completely dead subtract path would be certified "coverage closed" by the model it inherits.

**Does the chapter warn about exactly that?** Generically, yes, and well:

- *"Coverage answers one question: did my stimulus ever get there? It says nothing about
  whether the answer was right. It is a property of the test suite; it can prove a hole and
  never correctness."*
- *"closure is necessary and not sufficient"*, and *"keep running random for volume"*.
- The whole "Choosing Stimulus" section is an argument that a metric can be perfect on a broken
  design — it makes precisely this point about *code* coverage on `cout = a[7] | b[7]`.

Specifically, no. The chapter never says that *this* model, at 34/34, leaves the sign
dimension and the whole rounding dimension unmeasured. Given that the chapter's rhetorical
peak is "every automatic metric available reports a perfect score on a design wrong on a
quarter of all inputs", it is an unforced miss not to turn the same knife on its own
hand-rolled model — the demonstration is four characters of source change away and would be
the strongest possible close to the coverage section.

### One more thing the chapter should say out loud

`tb_covfp.v` contains no design under test. It samples the reference model's own output.
Replacing `fx + fy` with `fx - fy` leaves the target green (M21). The file is a coverage
*instrument*, not a test of arithmetic, and the reader — who has just been told coverage
proves holes and never correctness — will still read `PASS tb_covfp` as a passing arithmetic
test, because that is what a green `tb_*` target has meant for four chapters.

## Blocking defects

### B1 — The `shortreal` exemption is granted to the wrong chapter

`chapters/ch05.md`, "The Reference Model":

> **Seed for chapters 9 and 12.** Chapter 12 performs one add per transaction, so the simple
> `$shortrealtobits(fx + fy)` form is legitimate there — but only because it is one add…

Chapter 12 is the **four-input** adder (STATE.md, chapter table). Its reference model chains
three adds. The chapter's own later callout says so: *"a four-input reference model must sum in
*exactly* the hardware's order"*. The exempt chapter is 9.

Measured cost of taking the licence, 200,000 random normal quadruples:

| reference shape | chained binary64 disagrees with true binary32 |
|---|---|
| `(a+b)+(c+d)` | 1.310 %, **1 in 76** |
| `((a+b)+c)+d` | 1.336 %, **1 in 75** |

A million-vector chapter-12 campaign built on this advice would report about **13,000 failures
against a correct design**. The chapter names this trap "the most dangerous thing in this book"
and then aims it at the payoff chapter. This is blocking not because the mechanism is
mis-explained — it is explained impeccably — but because the one forward-pointing sentence a
chapter-12 author would act on is inverted.

**Fix:** swap the chapter numbers. "Chapter 9 performs one add per transaction, so the simple
form is legitimate *there*; chapters 10 and 12 chain three adds and must round-trip every
intermediate." One sentence.

### B2 — `tb_scoreboard.v`'s monitor is off by one, and the guard designed to catch that cannot

The monitor is gated by `active`, which the `run` block raises at t=0 before the first
`drive` waits for a negedge. The clock's first posedge is at t=5 ns, before any drive. So:

```
$ vvp sb.vvp +mode=ch04           (instrumented copy, DRV/MON tracing added)
  MON t=5000  a=00 b=00     <-- phantom: the driver never applied this
  DRV t=10000 a=01 b=02
  MON t=15000 a=01 b=02
  ...
  DRV t=70000 a=00 b=00
  MON t=75000 a=00 b=00
  DRV t=80000 a=ff b=fe     <-- driven, and NEVER SCORED
```

Two errors, and they cancel: `driven == 8` and `checks == 8`, so
`if (checks !== expect_n)` — the end-of-test guard the chapter presents as its answer to
*"the test that silently did nothing, which per-transaction checking cannot [catch]"* — passes.
The 8 transactions the scoreboard checked are not the 8 the driver applied.

Four consequences, all confirmed:

1. **The chapter's headline coverage transcript is wrong.** It prints
   `{0,0,0}: 5`, `{1,0,1}: 1`, `{1,1,1}: 2`. The true distribution for chapter 4's eight
   vectors, computed independently in `python3`, is **4 / 1 / 3**. The printed 5 includes the
   phantom `(00,00)`; the missing 3rd entry in `{1,1,1}` is the dropped `ff+fe`. The
   *conclusion* — 3 of 6 reachable bins, holes exactly the mutant's class — survives, but the
   numbers presented as a measurement of chapter 4's suite are not.

2. **A stimulus mutation on the last vector is invisible** (M13). I changed `drive(8'hff,
   8'hfe)` to `drive(8'h00, 8'h01)` and the output did not change by one character. In the
   chapter's own words, that is a gap in the checking, not an equivalent mutant.

3. **The line whose comment says it fixes this is a no-op** (M14). Deleting
   `@(posedge clk);  // let the monitor see the last one` changes nothing. Adding a *second*
   one makes `checks` become 10 and the run correctly FAILs — which is the cleanest proof that
   the guard is currently satisfied only by two cancelling errors.

4. **The result depends on same-edge scheduling order.** At t=85 both the `always @(posedge
   clk)` monitor and the `run` block's `@(posedge clk); active = 1'b0;` are resumed. Icarus
   happens to run `run` first, so the last vector is dropped. A simulator that resumes the
   `always` first gives `checks == 9` and the target goes red. Chapter 3's *"Simulation
   Artifacts That Will Cost You an Evening"* dissects exactly this hazard, and chapter 4's
   *"Clock and Reset Without Racing Your Own Design"* — which this file cites in the chapter
   text — exists to prevent it. The file obeys the rule for the *driver* (negedge) and breaks
   it for the *gate*.

This is blocking because `tb_scoreboard.v` is the file the chapter offers as the model of a
suite you can trust, in a chapter whose thesis is that a green run means nothing until you know
the tests can fail, and because the defect is precisely of the class the chapter is written to
eliminate.

**Fix (three lines):** raise `active` on the first negedge rather than at t=0 (e.g. move
`active = 1'b1;` after an initial `@(negedge clk)`), keep the trailing `@(posedge clk); #1;`
so the last transaction is scored, and — the part that makes the guard real — add
`if (checks !== driven)` as a separate end-of-test assertion, so a phantom sample and a dropped
sample can no longer conceal each other. Then re-capture the transcript; it will read
`4 / 1 / 3` and the surrounding prose needs no change.

## Pedagogical assessment

### The opening

**The mutant-driven opening works, and it is the best chapter opening in the project.** It
does four things at once in twenty lines: it pays a debt the reader remembers, it produces a
number (25.195 %) that is shocking rather than merely large, it names the chapter's question
in the reader's own vocabulary ("which inputs, how many, how do you know when you have
enough"), and it promises four specific answers and delivers all four. The sentence *"the
regression is green, the exit codes are honest, the checks use `!==` and count what they find
— and the design is wrong"* is the whole chapter in one line, and it is placed at line 14.

The device also does the hardest pedagogical job in verification teaching: it makes the
abstract concept (coverage) concrete *before* introducing it. By the time the reader reaches
"Coverage, and Building One by Hand", they already want the report that would have shown the
hole. Most textbooks introduce coverage as a definition and then hunt for a motivating
example; this chapter has the example first and the definition second. That is the right order
and it is not an accident — the chapter says so explicitly ("coverage would have *prevented*
the situation rather than diagnosed it").

### The order

Green run → definitions → reference model → suite shape → stimulus → coverage → assertions →
regression → floating point → traps → checklist → bridge. **This is a good order and I would
not reorder it**, with one reservation.

- Reference model before stimulus is right, and the chapter justifies it: expected values must
  become free before "more vectors" is a strategy at all. *"because expected values are now
  free, stimulus is the only thing you pay for"* is the hinge of the chapter and it is placed
  correctly.
- Suite architecture before stimulus is right: the swappable-generator payoff makes the
  stimulus section actionable.
- Coverage after stimulus is right: coverage is presented as the answer to "how do you know
  your constraints are any good?", a question the previous section has just made the reader
  ask.
- Assertions after coverage is defensible but the weakest join. Assertions are a *checking*
  technique and would sit more naturally beside "The Shape of a Suite You Can Trust". Placed
  here they read as an appendix about tool limitations. Not worth restructuring.

**The reservation is real: the `shortreal` material lands two chapters before the encoding.**
Section 3 of 13 asks the reader to accept `4b800000` as 2²⁴, `3f800000` as 1.0, a "tie towards
the even significand", subnormals, sNaN quieting, and the claim `53 ≥ 2×24 + 2` — with
binary32 encoding not taught until chapter 7. The chapter half-acknowledges this in the
floating point section (*"Chapters 6 to 8 explain why each row is what it is"*) but the trap
callout itself, the most important paragraph in the book by the project's own assessment, has
no such hedge. A reader who has genuinely absorbed only chapters 1–5 cannot evaluate it; they
can only memorise it. One sentence of the form "you will not be able to check this until
chapter 7; for now take the pattern and the reason on trust" would cost nothing and would keep
the chapter's epistemic honesty intact.

### Cognitive load and length

10,492 words over 13 sections, verified. It is inside its 10.5k ceiling and it does not feel
padded. Checking for bloat section by section, the only candidate is "Testing, Verification,
and What 'Done' Means" (~900 words), which is the most abstract and the least backed by
running code — but it earns its place with the four written-down exit criteria, which are the
only part of the chapter a reader can apply to a project that is not this one. The FDIV
paragraph is 90 words and buys the reader the answer to "why should I care" for the rest of
their career; keep it.

Density is high but the chapter manages it well. Concretely: **five Verilog listings totalling
1,189 bytes** — that is remarkably little code for a code-heavy chapter, and the decision to
carry `ref_add`, the driver task and `fp_add` in prose rather than in listings is correct.
Fourteen tables and callouts break up the argument. The one place load spikes is the
constrained-random section, which introduces the class distribution, the exponent distribution,
the `gen_biased` percentile menu, the clustered branch, function-of-`a` generation and the
corner library in about 400 words. That section could take 100 more words rather than fewer.

### Can a reader who absorbed only this chapter build a trustworthy suite?

**Mostly yes, and that is a high bar to clear.** They would come away able to: write a
decorrelated reference model and say why; split a testbench into four roles; choose between
directed, exhaustive and random from an arithmetic argument rather than a preference; write a
functional coverage model that fails the run on an empty bin; write clocked immediate
assertions that carry file, line, time and scope; and mutation-test their own work. That is a
genuinely competent verification engineer's starting kit, and very few chapters at this level
deliver it.

Two things they would **not** be able to do:

1. **Organise a mutation campaign.** The chapter asks for it in the checklist ("break the
   design five ways, confirm it goes red on each, write down what you broke") and shows the
   *result* (the README record) but never the *mechanics* — copy to a scratch tree, script the
   rebuild, score on `FAIL` or `rc != 0`, restore. Chapter 4's "Automating the Build" is the
   natural hook and is cited elsewhere but not here. Thirty words would close it.
2. **Argue against tolerance comparison.** See the checklist audit below.

### The closing checklist, item by item

| # | item | taught? |
|---|---|---|
| 1 | Explain why chapter 4's suite was green, name the class | **yes** — twice, with the class stated in English and in arithmetic |
| 2 | Reference model, three ways to decorrelate | **yes** — exactly three are given (abstraction level, language/engine, written-from-spec-first) |
| 3 | `shortreal` trap; why one add is safe; the round-trip; **why tolerance is wrong and what to compare instead** | **three of four.** The trap, the exemption and the round-trip are all fully taught. The tolerance argument exists *only* as one row of the traps table plus a filename; the body never makes it. "Compare and print bits, never `%f`" is nearby but is a different point |
| 4 | Four roles; what the monitor's independence buys; the xor message | **yes** — and the xor idea is the chapter's best transferable trick |
| 5 | Exhaustive sizes; pick a method; estimate random vectors; why unconstrained random fails for FP | **yes**, all four, all with numbers |
| 6 | Coverage model in plain Verilog; exclude a bin *with a proof*; empty bin fails the run | **yes** — and the "with a proof" clause is backed by a real proof in `tb_exhaustive.v` that fails if it breaks. This is the chapter at its best |
| 7 | Which assertion constructs Icarus runs; the clocked immediate equivalent; `$error` and `-gno-assertions` | **yes** — I re-measured all of it and the account is exact |
| 8 | Mutation-test your own testbench, five ways | **concept yes, mechanics no** (above) |
| 9 | Six corner cases and the hardware each aims at | **yes** — the taxonomy has nine groups, each with the hardware named |

**Eight of nine honest, one (item 3) promising more than the body delivers.** That is a better
ratio than any closing checklist I have audited in this project. The checklist is also
correctly framed ("Work through this at a terminal; anything you cannot do, reread its
section") rather than as a summary.

### The floating point taxonomy, checked against IEEE 754-2019

This is chapter 12's checklist, so an omission here becomes an untested case there. What is
present is correct:

- **A (zeros)** — `(+0)+(−0) = +0` is right for roundTiesToEven (§6.3), both orders matter, and
  the observation that the signed-zero rule "falls out of no datapath, so it must be
  hard-coded" is exactly the insight a designer needs.
- **B (subnormals)** — "the aligner must use effective exponent **−126**, not the encoded 0" is
  correct and is genuinely the commonest subnormal bug; "a fraction carry promotes exponent 0→1
  with **no shift**" is the elegant property of the IEEE encoding and is correctly stated;
  "the normaliser must *stop* at exponent 1" is right for gradual underflow.
- **C (NaN)** — sNaN→qNaN quieting is separate logic from propagation: right. NaN beats
  infinity: right. Comparing NaN by class plus the quiet bit, because the payload is not
  specified for addition, is the correct testing decision (§6.2 requires a quiet NaN; payload
  propagation is only a recommendation in §6.2.3).
- **D (infinity)** — the decoder must split `exp==255` on the mantissa: right. `inf+(−inf)` as
  "the one place a finite datapath computes something that must be thrown away" is a good line.
- **E, G, H, I** — all correct, and the tie-down/tie-up pair in G is the best single example in
  the chapter.

Three gaps, in descending order of consequence:

1. **No row for exception flags.** Invalid (sNaN operand, `inf + (−inf)`), overflow, underflow
   and inexact are all raised by binary32 addition per §7, and the chapter's own Sources list
   cites "Clause 7 (exceptions)". If chapter 12's adder has flag outputs they are untested by
   this checklist; if it deliberately has none, that is a specification decision that belongs
   in the cross-cutting notes beside flush-to-zero. Either way the taxonomy should say
   something. This is the largest omission.
2. **Rounding modes are never mentioned.** The whole taxonomy silently assumes
   roundTiesToEven. That is defensible as a scope decision, but row A is the place it bites:
   `(+0)+(−0)` is `+0` in every rounding attribute **except roundTowardNegative**, where it is
   `−0`. A checklist that states the rule without the attribute is teaching a special case as a
   universal. One clause — "assuming roundTiesToEven throughout; see chapter 7" — fixes it.
3. **Row F overstates catastrophic cancellation at 1.2 %.** `P(|Δexp| ≤ 1) = 1.178 %` is
   correct, but catastrophic cancellation additionally requires opposite signs, so the figure
   is ≈ 0.59 %. Every other percentage in the chapter is exact, which is why this one stands
   out.

Minor: **"E4M3 minifloat" collides with the OCP/NVIDIA FP8 E4M3**, which has *no* infinities
(the all-ones exponent is reserved for NaN) and therefore a different population from the
"2 zeros, 14 subnormals, 224 normals, 2 infinities, 14 NaNs" the chapter counts. The chapter
does define its format explicitly two sentences earlier, so it is not wrong — but a reader
who goes to look up E4M3, or who reaches chapter 14's bfloat16/posit material, will find a
different animal under the same name. One parenthesis solves it.

The reduced-width arithmetic itself is all correct — I re-derived every cell of that table and
the 10.6 % / 0.78 % / "all 25 crosses" / "4.6 × 10¹⁸" claims, and the four-to-seventeen-hours
binary16 estimate is honestly bracketed by the chapter's own two measured rates.

### Craft: cross-references, citations, listings, transcripts

- **Cross-references: clean.** Every quoted heading resolves to a real section — five into
  chapter 4, two into chapter 3, two internal. **Zero positional cross-references** ("the next
  section", etc.) anywhere in the file. One nit: `"Choosing Stimulus"` is cited by partial
  title; the section is "Choosing Stimulus: Directed, Exhaustive, Random".
- **Citations: clean.** Five URLs, all fetch-verified per the chapter's own claim and all
  plausible; the `[title-only]` convention is honoured — the IEEE standards, the five textbooks
  and the Wilson study carry no URL, exactly as the standing rule requires. The Sources block
  correctly separates "machine-verified locally" from "documentation" and flags the FDIV figure
  and effort share as history rather than measurement.
- **Listings: byte-identical.** I checked all five mechanically against the files on disk;
  every one is an exact contiguous substring. 5/5.
- **Transcripts: fresh and reproducing, except one.** I re-captured every output block from a
  cold rebuild. `tb_fpref`, `bad_srchain`, `tb_directed`, `tb_random`, `tb_seed`,
  `tb_exhaustive`, `tb_scoreboard +mode=ch04`, `bad_tolerance`, all three `tb_covfp` regimes and
  the `-gno-assertions` session reproduce **character for character**.

  **The `-DBREAK_WRAP` transcript is abridged without saying so, and the abridgement flatters
  the argument.** The real output interleaves sixteen `FAIL tb_assert: after N enabled cycles
  q=…, expected …` lines — produced by the plain `if` value-sequence check — with four `ERROR:`
  lines from the assertion. The chapter prints one `ERROR:` line and the summary, in the exact
  paragraph arguing *"That is the practical argument for `assert … else` where a plain `if`
  would do."* The plain `if` produced four times as much diagnostic output as the assertion in
  the run being quoted. The chapter's own Sources footer promises *"where a transcript is
  abridged the lead-in says so"*; here it does not, and here it matters. (Two `tb_covfp`
  excerpts are also undeclared abridgements, but they are three-line extracts of a report whose
  full form appears earlier on the same page, so no reader could be misled.)

### Smaller findings

- **`src/ch05/tb_exhaustive.v` line 4 still reads "in under a tenth of a second."** That is the
  stale 0.09 s from the research notes — the very figure the chapter lists among its seven
  corrections (to 0.91 s, which I measured at 0.904 s). The chapter's headline claim that every
  research-note number was re-measured is true; one source comment did not get the memo.
- **"chapter 4 finished at 87.5 %" is not chapter 4's mutation score.** `src/ch04/README.md`
  records `adder8` at 9 mutants / 8 caught, of which the eight carry functions scored 7/8 =
  87.5 %. Chapter 4's overall record is much larger and much better. The sentence appears
  immediately after *"worth writing down because it makes 'we tested it' comparable across
  chapters"*, so it invites a comparison against chapter 5's own 34/38 = 89.5 % that is not
  like-for-like. In a chapter about rigour, either compare the same denominators or drop the
  number.
- **"`tb_scoreboard.v` is 200 lines"** — it is 247.
- **`tb_exhaustive.v` and `tb_scoreboard.v` print `adder8 mismatches=%0d` using the `errors`
  counter, which also accumulates run-level guard failures.** Under my M10 mutation the run
  printed `adder8 mismatches 1` when `adder8` was perfect. Mislabelled diagnostics in the
  chapter that teaches failure-message discipline.
- **`counter6` with an asynchronous reset survives every target** (M6) — chapter 4's
  `counter4` open concern, unaddressed, in the chapter that made mutation testing a standing
  rule.
- The research-note corrections all check out. I verified five of the seven independently
  against `research/ch05-verification.md`: 0.09 s → 0.91 s, 320,000 → 288,000 t/s,
  P(|Δe|≥25) 0.804 → 0.8164, 1-in-86 → 1-in-84.9, and the `-gno-assertions` discard behaviour
  (the notes say it only silences the diagnostic; I confirmed it compiles a false property
  clean and runs it to completion reporting nothing). The `$urandom(seed)` first-draw
  linearity — `00010e00 / 00021c00 / 00032a00 / 00043800` — reproduces exactly, and the
  downstream 0.4720-vs-0.2465 bias and the 2.98 corruption both reproduce. This is the most
  valuable finding in the chapter for chapters 9, 10 and 12 and it is correctly propagated to
  STATE.md.

## Required changes for a 9+

Items 1 and 2 are blocking. Items 3–7 are what separates 9 from 10.

1. **Re-aim the `shortreal` exemption at chapter 9, not chapter 12.** In "The Reference Model",
   rewrite the `Seed for chapters 9 and 12` callout: chapter 9's two-input adder performs one
   add per transaction and may use `$shortrealtobits(fx + fy)` directly; chapters 10 and 12
   chain three adds and **must** round-trip every intermediate. Quote a cost so the reader
   cannot shrug it off — a chained binary64 reference disagrees with binary32 on **1.3 % of
   random normal quadruples, about one transaction in 76**. (Measured here over 200,000
   quadruples, both tree and sequential orders.)

2. **Fix `tb_scoreboard.v`'s monitor gate and re-capture its transcript.**
   (a) Raise `active` after the first `@(negedge clk)` rather than at time 0, so the phantom
   `(00,00)` sample at t=5 disappears. (b) Keep a trailing `@(posedge clk); #1;` before
   `active = 1'b0;` so the last driven transaction is scored — and confirm it, because the
   present line is a no-op. (c) Add `if (checks !== driven)` as a separate end-of-test
   assertion; the existing `checks !== expect_n` guard cannot see a phantom sample and a
   dropped sample cancelling. (d) Re-capture the `+mode=ch04` block in the chapter; the counts
   become `4 / 1 / 3` and no surrounding prose needs to change. (e) Add a mutation to the
   README record proving the fix: changing the last replayed vector must now fail.

3. **Declare the `-DBREAK_WRAP` abridgement, or stop abridging it.** The quoted block hides the
   sixteen `FAIL tb_assert: after N enabled cycles` lines produced by the plain `if`, in the
   paragraph arguing for `assert … else` over a plain `if`. Either show a contiguous slice that
   includes both kinds of line, or add "abridged — the value-sequence check also prints sixteen
   `FAIL` lines" to the lead-in. The honest version is actually the better teaching moment:
   the assertion gives you file/line/time/scope for free, *and* the plain `if` is what
   localises the divergence.

4. **Turn the coverage knife on the chapter's own model.** After the 34/34 run, add three or
   four sentences: force `sg = 1'b0` in `gen_biased`, rerun, and show that the model still
   reports `34/34, coverage closed` on a stimulus stream that never performs an effective
   subtraction — so taxonomy rows F and I are entirely unexercised at 100 % coverage. This
   costs four characters of source, reproduces the chapter's own strongest rhetorical move
   ("every automatic metric reports a perfect score on a design wrong on a quarter of all
   inputs") against its own hand-rolled model, and makes "closure is necessary and not
   sufficient" land as a demonstration instead of a slogan. Then extend the
   `Seed for chapter 12` callout to name the missing dimensions — sign / effective operation,
   and something about rounding (tie taken, guard set, sticky set, rounding carried out) —
   rather than only the mechanical extensions it currently lists.

5. **Close three gaps in the floating point taxonomy**, since chapter 12 uses it as a checklist:
   (a) add a row or a cross-cutting note for **exception flags** — invalid, overflow, underflow,
   inexact — or state explicitly that chapter 12's specification excludes them, the way
   flush-to-zero is handled; (b) say once that the whole taxonomy assumes **roundTiesToEven**,
   and note that row A's `(+0)+(−0) = +0` is the one rule that changes under
   roundTowardNegative; (c) correct row F: catastrophic cancellation is ≈ **0.59 %** of random
   normal pairs, not 1.2 % — the 1.178 % figure is `P(|Δexp| ≤ 1)` before the opposite-sign
   condition.

6. **Say out loud that `tb_covfp.v` contains no design under test**, in one sentence, where the
   file is introduced. It samples its own reference model; replacing `fx + fy` with `fx − fy`
   leaves the target green. It is a coverage instrument, and after four chapters of green
   `tb_*` targets meaning "the arithmetic checked out", the reader needs telling.

7. **Small corrections, all one-liners.**
   - `src/ch05/tb_exhaustive.v` line 4: "in under a tenth of a second" → the measured 0.91 s.
     It is the exact stale figure the chapter takes credit for correcting.
   - "chapter 4 finished at 87.5 %": that is chapter 4's score on eight *carry* mutants, not
     its mutation score. Either compare like with like or drop the comparison — it sits one
     sentence after the claim that the score "makes 'we tested it' comparable across chapters".
   - "`tb_scoreboard.v` is 200 lines" → 247.
   - `tb_exhaustive.v` / `tb_scoreboard.v`: print `adder8 mismatches` from a counter that
     excludes run-level guard failures, or relabel the field. It currently reports adder
     mismatches when the adder is perfect.
   - `tb_fpref.v`: assert that all 28 `(a,b)` pairs are distinct. Replacing the tie-down row
     with a duplicate of the tie-up row currently survives, and the tie pair is the chapter's
     flagship FP argument.
   - Cite "Choosing Stimulus: Directed, Exhaustive, Random" by its full title.
   - `tb_covfp.v` `expdbin`: add a comment noting that the signed result depends on the
     assignment context widening the unsigned part-selects to 32 bits before subtracting.
     Chapter 12 will copy this function.
   - "E4M3 minifloat": add a parenthesis noting this is an IEEE-shaped E4M3 with infinities,
     unlike the OCP FP8 format of the same name.
   - Hedge the `shortreal` trap callout for a reader who has not yet met chapter 7's encoding —
     one clause is enough.
   - Add thirty words on mutation-campaign *mechanics* (scratch copy, scripted rebuild, score
     on `FAIL` or `rc != 0`, restore) so closing-checklist item 8 is executable.
   - Either make the tolerance argument in the body, or soften checklist item 3, which
     currently asks the reader to justify something the chapter only asserts in a table row.
   - `counter6` with an asynchronous reset survives every target. Either add a stimulus that
     asserts reset off a clock edge, or record it in `src/ch05/README.md` as a known survivor
     with a reason — chapter 4 carried the identical hole and the standing rule says a survivor
     is a work item.

