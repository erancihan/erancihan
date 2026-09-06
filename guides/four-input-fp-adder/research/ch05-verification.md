# Chapter 5 — Verification Methodology: Source Notes

<!-- sections complete: 9/9 -->

## 1. What verification actually is

**Three words.** *Testing* = running it and looking. *Verification* = establishing the implementation matches its **specification** ("did we build the thing right?"). *Validation* = establishing the specification was right ("did we build the right thing?"). Chapter 4 taught testing; this chapter is verification. Validation appears once: choosing IEEE 754-2019 binary32 as chapter 12's spec, rather than "an adder that seems to work".

**"It ran" vs "it is right."** A simulation that completes without error has proved nothing. The beginner's failure mode is the **silent pass** — no checker, values printed, human glances, design declared working. Chapter 4 fixed that. Chapter 5 asks the next question: *the checker passed, but could it ever have failed?*
- Useful split: a testbench has **stimulus** (did we reach the interesting state?) and **checking** (would we have noticed?). Both fail independently. Coverage (§5) measures the first; mutation testing (§3) measures the second.

**Why hardware verification is disproportionately expensive.**
- **No patches after tapeout.** A mask set costs millions and weeks. The Pentium FDIV bug (1994) — a lookup-table error in FP division, found by an outside mathematician doing number theory, not by Intel's suite — cost Intel a ~$475M charge. Note the *kind* of bug: rare, data-dependent, corner-case arithmetic. Exactly what chapter 12 must survive.
- **Concurrency**: every register updates at once; the state space is not walked but exploded into. **Observability**: in silicon you have only the pins and scan chains you added before fabrication.
- Folklore figure, direction not in dispute: verification is **~60-70% of ASIC project effort**. Cite the Wilson Research/Siemens functional verification survey rather than a remembered percentage.

**The verification gap.** Design capacity grows with Moore's law; verification capacity does not, because state space grows exponentially in state bits. Consequence for the reader: you cannot verify a 32-bit FP adder by trying harder. You need abstraction (reference models), reduction (smaller float widths), and measurement (coverage).

**What "done" means.** No completeness theorem exists for simulation. Exhaustive is a proof; everything else is evidence — and for binary32 addition exhaustive is 2^64 vectors (§4), so the reader will never have the proof. "Done" is therefore *written exit criteria agreed in advance*, so they cannot be quietly relaxed at deadline. For chapter 12:
1. every §8 corner case has a directed test, and each test has been *seen to fail* (mutation-checked);
2. functional coverage reports 100% of bins hit;
3. N million constrained-random vectors match the reference model exactly;
4. exhaustive pass over a reduced-width float of the same structure;
5. the whole regression is green from a clean checkout, on one command.

Item 5 matters most: "done" that nobody else can re-establish on demand is not done.

**The verification plan.** A short document written **before the RTL** — because once you have written the implementation, your idea of what could go wrong is contaminated by what you happened to build. Contents: features extracted from the spec (not the code); for each, how it is stimulated, how it is checked, which coverage bin proves it was reached; the exit criteria; and an explicit **out-of-scope** list (a deliverable, not an omission). These notes *are* the verification plan for chapter 12 — the chapter can say so.

## 2. The reference model

**The single most valuable idea in the chapter.** A golden model is an independent implementation of the specification whose only job is to say what the answer should be. Drive the same stimulus into DUT and model, compare. This turns an unbounded question ("is this right?") into a bounded one ("do these disagree?").

**Why it changes everything.** Directed tests scale with human effort — each vector needs a hand-computed expected value. With a model, expected values are free, so *stimulus* becomes the only cost and random and exhaustive testing become possible at all. Chapter 4's vector file was a model evaluated by hand once and frozen; it does not scale past a few dozen vectors, which is exactly where the `a[7] | b[7]` mutant hides.

**Decorrelation — write the model in a *different* way from the RTL.** Same person, same misunderstanding, same style ⇒ same bug ⇒ the comparison passes. Rules that buy real independence: **different abstraction level** (RTL does align/add/normalise/round in stages; the model says `z = x + y`); **different language or engine** (a Python model and a Verilog DUT cannot share a typo); **written from the spec, before the RTL** — if you open the RTL to decide what the model returns, the shared-assumption failure is happening in real time. Smell tests for chapter 12: a model calling the DUT's own rounding function leaves rounding unverified; NaN rules read off the DUT's comments leave NaN handling unverified.

**Where the model lives.**

| Where | Pros | Cons |
|---|---|---|
| Verilog `function` in the TB | no build machinery, inline | same language as DUT — weakest decorrelation; IEEE 754 is verbose |
| Separate behavioural module | swappable, monitored like the DUT | still Verilog, still same-author risk |
| `shortreal` in the simulator | the simulator's *own* IEEE 754 — total decorrelation, free | precision trap below |
| External Python + `$readmemh` | strongest decorrelation, reusable golden files, git-diffable | two-step build; stale files; risk of a golden file made by the DUT (§9) |

**Measured: Icarus 13.0 has `shortreal`, and it is bit-exact for a single add.** Requires `-g2005-sv` or later (`-g2005` gives a syntax error on the keyword).

```verilog
shortreal x, y, z;
initial begin
  x = $bitstoshortreal(32'h4b7fffff); y = $bitstoshortreal(32'h3f800000); // 16777215.0 + 1.0
  $display("16777215 + 1 = %h", $shortrealtobits(x + y));
  x = $bitstoshortreal(32'h7f800000); y = $bitstoshortreal(32'hff800000); // +inf + -inf
  $display("inf + -inf   = %h", $shortrealtobits(x + y));
  x = $bitstoshortreal(32'h80000000); y = $bitstoshortreal(32'h00000000);
  $display("(-0) + (+0)  = %h", $shortrealtobits(x + y));
  x = $bitstoshortreal(32'h80000000); y = $bitstoshortreal(32'h80000000);
  $display("(-0) + (-0)  = %h", $shortrealtobits(x + y));
end
```
```
16777215 + 1 = 4b800000      inf + -inf  = 7fc00000
(-0) + (+0)  = 00000000      (-0) + (-0) = 80000000
```
Identical to `python3 struct`. It gets the two hardest sign rules right for free: `(-0)+(+0) = +0`, `(-0)+(-0) = -0`.

**Differential test, 20,000 pairs, zero mismatches.** Operand pool loaded with corner cases (both zeros, min/max subnormal, min/max normal, both infinities, quiet and signalling NaN, 2^24 and 2^24−1) plus uniform-random and subnormal-biased patterns; Icarus wrote `a b result` triples, Python recomputed with `struct`:
```
compared 20000  bit-exact mismatches 0  (NaN-class agreements 175)
```

**The `shortreal` precision trap — a real hazard, record it.** Icarus stores `shortreal` internally as a C `double`; arithmetic happens in double precision and is rounded to binary32 only at `$shortrealtobits`.
```
x = 2^24 (4b800000), y = 1.0
z = x + y;   w = z + y;        // binary32 truth: z = w = 4b800000
CHAIN:     z=4b800000  w=4b800001      <-- w is WRONG for binary32
ROUNDTRIP: z=4b800000  w=4b800000      <-- correct
```
- **Rule: round-trip through the bit functions after every operation** — `z = $bitstoshortreal($shortrealtobits(x + y));`
- A *single* add is safe without it, and not by luck: double rounding binary32→binary64→binary32 is provably innocuous for `+` because 53 ≥ 2·24 + 2 = 50. The 20,000-pair test confirms it empirically. Chapter 12 does one add per transaction, so the simple form is legitimate — but say *why*, or readers will generalise it to a chain.
- Also: `$display("%f", z)` prints the internal double. `16777216 + 1` displayed as `16777217.000000` while `$shortrealtobits` correctly gave `4b800000`. **Compare and print bits, never `%f`.**

**Python `struct` + `$readmemh`.**
```python
import struct
bits = lambda f: struct.unpack('>I', struct.pack('>f', f))[0]
val  = lambda h: struct.unpack('>f', struct.pack('>I', h))[0]
print("%08x" % bits(val(a) + val(b)), file=expected_hex)
```
Python floats are binary64, so every intermediate must be forced back through `pack('>f')/unpack` or you are checking against the wrong precision. `struct.pack('>f', x)` raises `OverflowError` instead of returning infinity (measured), so overflow needs explicit handling. `$readmemh` silently leaves unwritten array entries as `x` if the file is short — check a sentinel.

**Recommendation.** Use `shortreal` as the primary in-simulator reference and Python as a second independent check on the corner-case suite. Two models disagreeing is a gift: exactly one is wrong, and you now know to look.

## 3. Self-checking testbench architecture

**The conceptual split, no UVM ceremony.** Four roles, named so they stop tangling. Here they are `task`s and `always` blocks, not classes.
- **Stimulus/generator** — decides *what* to test; knows nothing about pins; produces transactions.
- **Driver** — turns a transaction into pin wiggles with correct timing.
- **Monitor** — watches pins and reconstructs transactions. Passive; never drives. Its independence from the driver is what catches driver bugs.
- **Scoreboard/checker** — holds the reference model, compares, counts errors.

The split earns its keep because you can change *what* you test without touching *how* it is applied: chapter 12 swaps a directed generator for a random one and then an exhaustive one — three generators, one driver, one scoreboard. UVM (Accellera / IEEE 1800.2) formalises exactly this with classes, factories, sequences and phases; it needs SystemVerilog class support Icarus lacks. Name it, say it is out of reach here, and note that the *ideas* transfer entirely.

**Check-on-every-transaction vs end-of-test.** Per-transaction checking reports the failure in context, lets the run stop immediately (small legible waveform), and stores nothing — make it the default. End-of-test comparison (diff output against a golden file) suits out-of-order or long-latency designs and is git-diffable, but decouples failure from cause. **Hybrid for chapter 12**: check every transaction *and* log it. Third pattern worth naming: **end-of-test assertions about the run itself** — did we apply N vectors, did the checker ever run, did every coverage bin fill — which catch the bug where the test silently did nothing.

**Error counting and the exit code — a measured Icarus gotcha.** Count with one `integer errs`; do not `$finish` on the first mismatch by default, because failures cluster and the pattern is the diagnosis (offer `+stop_on_first` for bisecting).

**Measured on Icarus 13.0: `$error` prints a message and leaves the exit code at 0. So does a failing `assert ... else $error(...)`. Only `$fatal` returns non-zero.**
```
$ vvp ex3.vvp ; echo "exit=$?"          $ vvp ex2.vvp ; echo "exit=$?"
ERROR: ex3.v:1: failed assert           FAILED 3
       Time: 0  Scope: tb               FATAL: ex2.v:1:
continues                                      Time: 0  Scope: tb
exit=0   <-- failing assert = SUCCESS   exit=1
```
So a `make`-driven regression reports green while assertions fail, unless every testbench ends:
```verilog
if (errs != 0) begin
  $display("=== FAILED: %0d errors in %0d checks ===", errs, checks);
  $fatal(1);
end
$display("=== PASSED: %0d checks ===", checks); $finish;
```
One line, large payoff; it belongs in the chapter verbatim.

**Failure messages that help.** `$display("FAIL")` tells you a bug exists and nothing else. Instead:
```verilog
$display("[%0t] FAIL test=%0d %s: a=%08h b=%08h  exp=%08h got=%08h  xor=%08h",
         $time, test_id, test_name, a, b, expected, actual, expected ^ actual);
```
Each field earns its place: `$time` positions the GTKWave cursor; `test_id` says which of 40,000 tests; **the inputs are the reproducer**; `exp`/`got` in the same radix and width (`%08h`, never `%d` — for FP the bit pattern is the truth); and `exp ^ actual`, a cheap masterstroke — `00000001` is a last-place rounding bug, `00800000` an exponent off-by-one, a top-bit difference a sign bug. **The xor names the category of bug before you open a waveform.** For FP, also decode sign/exp/mantissa and the operand classes.

**Test IDs and order independence.** Give every test a stable ID — insertion-ordered numbering renumbers everything below it and invalidates every historical log. Order independence means each test sets up the state it needs and leaves none behind: assert reset if you depend on it, do not rely on a drained pipeline, do not accumulate into shared variables. Test it mechanically — run the suite in reverse and each test alone; both must match. Order-dependence is also how a suite loses power: test 40 passes only because test 39 left the right value in a register, so test 40 checks nothing.

**"A test you have never seen fail is not a test."** A checker with a typo (`if (got == got)`), a monitor sampling the wrong edge, a comparison against a value taken from the DUT, a stimulus loop that runs zero times — all pass forever, silently. Chapter 4 established **mutation testing** as standing practice; this chapter uses it and extends it two ways:
1. **Mutation score as a metric**: killed/total. Chapter 4's 7 of 8 wrong carry-out functions is 87.5%. A number turns "we tested it" into something chartable across chapters.
2. **A surviving mutant is a work item.** Every survivor is either a real gap in the suite (fix it) or an *equivalent mutant* that changes code but not behaviour (argue it and document it). `cout = a[7] | b[7]` is emphatically the former — §4 gives 16,512 counterexamples.

Mutation testing measures *checking* power; coverage measures *stimulus* reach. They are orthogonal: 100% coverage with a broken checker is 0% verification, and a perfect checker never reached is also 0%.

## 4. Choosing stimulus

### 4.0 THE RUNNING EXAMPLE: killing `cout = a[7] | b[7]`

Chapter 4 ends with 7 of 8 wrong carry-out mutants dead and this one alive. Everything below is measured.

**The exact distinguishing input classes.** True carry-out is `(a[7] & b[7]) | ((a[7] ^ b[7]) & c7)`, where `c7` is the carry out of the low seven bits, i.e. `c7 = 1` iff `a[6:0] + b[6:0] ≥ 128`.

| `a[7]` | `b[7]` | true `cout` | mutant | agree? |
|---|---|---|---|---|
| 0 | 0 | 0 always (max 127+127=254) | 0 | always |
| 1 | 1 | 1 always (min 128+128=256) | 1 | always |
| 0 | 1 | `c7` | 1 | **only when `c7`=1** |
| 1 | 0 | `c7` | 1 | **only when `c7`=1** |

The mutant is wrong on exactly one class, and it has a plain-English name:

> **Exactly one operand has its top bit set, and the sum does not actually overflow** — exactly one of `a`, `b` is ≥ 128, and `a + b ≤ 255`.

(Exact equivalence: with `a[7] ^ b[7] = 1`, `a + b = 128 + (a[6:0] + b[6:0])`, so `a + b < 256` ⟺ `a[6:0] + b[6:0] < 128`.)

**Counted exhaustively** (`python3` over all 65,536 pairs, and independently in Icarus):
```
total pairs 65536 agree 49024 disagree 16512 disagree frac 0.251953125
a[7]=0 b[7]=0  n=16384  true_cout=1 in     0   disagree=    0
a[7]=0 b[7]=1  n=16384  true_cout=1 in  8128   disagree= 8256
a[7]=1 b[7]=0  n=16384  true_cout=1 in  8128   disagree= 8256
a[7]=1 b[7]=1  n=16384  true_cout=1 in 16384   disagree=    0
```
- Closed form: `2 × Σ(s=0..127)(s+1) = 2 × 8256 = 16512`. **16512 / 65536 = 0.251953125 — just over one pair in four.**
- Smallest killers by `a+b`: `(0,128)`, `(128,0)`, `(0,129)`, `(1,128)`. Simplest is `a=128, b=0`: true 0, mutant 1.

**Why directed vectors missed it — the part a beginner must feel.** Humans write carry tests with a symmetry that looks complete and is not: test *"no carry"* with **small** numbers (`0+0`, `15+1`, `127+1`), test *"carry"* with **big** ones (`255+1`, `255+255`, `128+128`). Both halves are blind to **big operand, no carry**. Verified — this 14-vector set, which looks like a thorough carry test, leaves the mutant alive:
```
carry-focused directed set: 14 vectors, mutant survives = True
   a=  0 b=  0 sum=  0 true=0 mut=0      a=255 b=  1 sum=256 true=1 mut=1
   a= 15 b=  1 sum= 16 true=0 mut=0      a=255 b=255 sum=510 true=1 mut=1
   a=127 b=  1 sum=128 true=0 mut=0      a=128 b=128 sum=256 true=1 mut=1
   a=127 b=127 sum=254 true=0 mut=0      a=240 b= 32 sum=272 true=1 mut=1
   (+ 0+0, 2+3, 63+1)                    (+ 192+128, 129+127, 255+128)
```
- Every "no carry" vector has both MSBs clear; every "carry" vector really carries. The mutant is right on all 14.
- **The sentence the chapter should land: directed tests are written from the same mental model as the design.** The author who wrote `cout = a[7] | b[7]` believed "a big operand means a carry"; the author of the vector file believed the same, so the vectors and the bug agree. Directed testing cannot find a bug living in your own assumption — you must bring in something that does not share it. Randomness and exhaustion do not share it.
- Second-order lesson: the survival is *fragile* — add `0xAA + 0x55` (170+85=255) and it dies instantly. Say that out loud. The mutant survived chapter 4 by an accident of vector selection, and your suite's power should not depend on luck.

**What kills it, measured four ways.**

| Method | Result | Cost |
|---|---|---|
| Directed, carry-focused (14 vectors) | **survives** | human effort per vector |
| One targeted vector `a=0x80, b=0x00` | **dies** — *if you think of it* | trivial, but needs to know the bug |
| Random (`$random`), default seed | **dies on vector 0** | 1 vector, this seed |
| Random, expected case | **dies after ~4 vectors** | negligible |
| Exhaustive, 2^16 pairs | **dies at vector 128**, 16512 kills | 65,536 vectors, 0.09 s |

```
PHASE1 directed:  n=16 kills=3 first_kill=8
PHASE2 $random first kill at vector 0: a=36(00100100) b=129(10000001) sum=165 good_cout=0 mut_cout=1
PHASE2 $random: n=10000 kills=2584 (0.2584) first_kill=0
PHASE3 exhaustive first kill at vector 128: a=0 b=128
PHASE3 exhaustive: n=65536 kills=16512 frac=0.251953
```

**How many random vectors does it take? (The number the chapter promised.)**
- p = 16512/65536 = **0.251953125** per uniformly random pair.
- Expected vectors until first kill (geometric) = **1/p = 3.969**. Monte Carlo over 200,000 independent trials in `python3`: **mean 3.9571** — matches theory.
- `P(survive 1) = 0.748`, `P(survive 5) = 0.234`, `P(survive 10) = 0.0549`, `P(survive 20) = 0.00301`, `P(survive 50) = 4.97e-7`. **48 random vectors drive survival below 1 in a million.** Fifty lines of loop beats fourteen lines of carefully chosen table.
- Icarus's `$random` killed it on the **first** vector with the default seed — luck, and say so; the honest headline is "expected 4, essentially certain by 50".

**Which methodology is the answer?** All four work; rank them by what they teach.
1. **Exhaustive over a reduced input space** is definitive for an 8-bit adder: 2^17 = 131,072 vectors with carry-in, a fraction of a second, and it is a **proof**. When the space fits, take the proof. §8 scales this to reduced-width floats.
2. **Random** is the transferable answer: it found the bug in ~4 vectors without anyone knowing what the bug was. It still works in chapter 12 where exhaustive is impossible.
3. **A reference model** enables both — neither 65,536 nor 10,000 vectors is affordable without free expected values.
4. **Coverage-driven closure** proves the campaign visited the class. A bin for "exactly one MSB set, no carry-out" would read `0` after chapter 4's suite, making the hole visible *before* anyone thought to mutate. That is §5's whole argument, on a case the reader already cares about.

Suggested framing: run all four in that narrative order and end on the coverage bin — it is the one that would have *prevented* the situation rather than diagnosed it.

### 4.1 Directed tests
- **Right when**: the case is named in the spec (`inf + (-inf) = NaN`); reproducing a specific bug (every fix gets a permanent directed test, §7); the case is astronomically unlikely under random (exact cancellation, §4.3); first bring-up vectors that prove the DUT is alive.
- **Wrong when** used as the *only* method: they test what you thought of, so their coverage is the shape of your imagination — the same shape as your bugs. The §8 corner-case library is a floor, not a ceiling.

### 4.2 Exhaustive testing — do the arithmetic out loud
- 8-bit adder: 2^8 × 2^8 × 2^1 (carry-in) = **2^17 = 131,072**. Measured: a 65,536-pair sweep ran in **0.09 s**. If your input space is this size there is no excuse for anything less.
- Two-input binary32: 2^32 × 2^32 = **2^64 = 18,446,744,073,709,551,616**. At 10^7 vectors/s: **58,561 years**. At 10^9/s: **586 years**. Ratio to the 8-bit adder: 2^47 ≈ 1.4 × 10^14.
- **Four-input** binary32 (ch. 10/12): 2^128 ≈ 3.4 × 10^38. Not a bigger number of the same kind — a different universe.
- Lesson: not "exhaustive is useless" but **reduce the space until exhaustive fits** (§8). Exhaustive over a slice is still a proof about that slice.

### 4.3 Random, and why *unconstrained* random is nearly useless for FP

A uniformly random 32-bit pattern read as binary32 — exact counts from `python3`:

| class | patterns | probability | ≈ 1 in |
|---|---:|---:|---:|
| **normal** | 4,261,412,864 | 0.9921875 | 1.008 |
| subnormal | 16,777,214 | 0.0039062495 | 256 |
| NaN (total) | 16,777,214 | 0.0039062495 | 256 |
| — quiet NaN | 8,388,608 | 0.0019531250 | 512 |
| — signalling NaN | 8,388,606 | 0.0019531245 | 512 |
| zero (±0) | 2 | 4.66e-10 | 2,147,483,648 |
| infinity (±inf) | 2 | 4.66e-10 | 2,147,483,648 |

With **two** independent random operands: P(at least one subnormal) = 0.00780 (~1 in 128); P(both subnormal) = 1.53e-5; **P(at least one zero) = 9.31e-10 (~1 in 1.07 billion)**; P(at least one infinity) = 9.31e-10.

The magnitude distribution is worse than the class distribution suggests:
- P(|x| ≥ 2) = 0.496; **P(|x| ≥ 2^64) = 0.254**; P(exponent field ≥ 200) = 0.215.
- Measured over 10^6 random *normal* pairs: **P(|exponent difference| ≥ 25) = 0.804.** In four of five transactions the smaller operand is entirely below the larger's ulp — the answer is just the bigger operand and the only live logic is the sticky bit.
- **P(|exponent difference| ≤ 1) = 0.0116.** The alignment/normalisation/cancellation logic — the leading-zero counter and the variable left shift, the hard part — is exercised in about **1 transaction in 86**.
- Exact cancellation `a + (-a)`: probability ≈ 2.3e-10; zero occurrences in 10^6 trials. It will never happen by accident.

**State it bluntly: throwing random 32-bit patterns at an FP adder mostly tests "return the larger operand."** A million such vectors is ~800,000 repetitions of the same easy case, ~116,000 tries at something interesting, and zero infinities.

### 4.4 Constrained random and biased generators

Do not randomise 32 bits; randomise the **fields**, with a weighted menu over the exponent:
```verilog
function [31:0] gen_biased;
  integer pick; reg [7:0] e; reg [22:0] m; reg sg;
  begin
    pick = $urandom(seed) % 100;
    m    = $urandom(seed);
    if      (pick < 10) e = 8'h00;                         // zero or subnormal
    else if (pick < 14) e = 8'hff;                         // inf or NaN
    else if (pick < 20) begin e = 8'h00; m = 23'h0; end    // exact zero
    else if (pick < 24) begin e = 8'hff; m = 23'h0; end    // exact infinity
    else if (pick < 62) e = 8'h40 + ($urandom(seed) % 16); // clustered: near exponents
    else                e = 8'h01 + ($urandom(seed) % 254);// full range: far exponents
    sg = $urandom(seed);
    gen_biased = {sg, e, m};
  end
endfunction
```
- The **clustered** branch is the important and least obvious one: it puts both operands in a narrow exponent window, the only region where cancellation, leading-zero counting and normalisation actually happen. Without it §4.3's 1-in-86 problem persists.
- Other biases: generate `b` **as a function of** `a` (`b = -a`, `b = a ^ small_perturbation`, `b` one exponent step from `a`). This manufactures near-cancellation and tie cases that independent sampling never produces.
- **Corner-case library**: a fixed array of §8 patterns, sampled with elevated probability or swept once per run. Cheap, and it guarantees a floor under the random campaign.
- **How do you know the constraints are right?** You measure. §5's coverage report caught a real hole in the generator above — the first version clustered *all* normals into a 16-wide exponent window, so `|exp diff| ≥ 25` was unreachable. That is the coverage-driven loop working on the chapter's own code.

## 5. Coverage

Coverage answers "**did my stimulus ever get there?**" — never "is the design correct?". It is a property of the test suite, measured against the design. It can prove a hole; it can never prove correctness.

### 5.1 Code coverage — the kinds

| Kind | Measures | Tells you | Does **not** tell you |
|---|---|---|---|
| Line / statement | each line executed | dead code, unreached `case` arms | whether the value was wrong, or ever checked |
| Branch / decision | each `if`/`else`, each `case` arm | untested control paths | anything about the data |
| Toggle | each bit went 0→1 and 1→0 | stuck bits, unused bus lanes | anything about combinations |
| FSM state | each state entered | unreachable states | how you got there |
| FSM transition (arc) | each legal state→state edge | the untested transitions, where FSM bugs live | illegal transitions you never modelled |
| Expression / condition | each sub-term independently determined the result | that `a && b` was tested with each term deciding, not just `1&&1`/`0&&0` | whether it is the *right* expression |

- Expression coverage would notice something about the running example: `a[7] | b[7]` is a two-term OR, and a suite exercising only `0|0` and `1|1` covers it poorly. But that is the *mutant's* expression — it only helps if you already wrote the buggy line.
- **Universal limitation: code coverage measures execution, not observation.** A line can execute, produce garbage, and never reach a checker. On a purely combinational adder every `assign` executes on the *first* vector, so line coverage is 100% immediately — the cleanest possible demonstration that code coverage is nearly worthless for datapath.

### 5.2 Functional coverage — the one that matters

**A model you write by hand**, listing the situations *the specification* says are interesting, and counting whether each occurred. It is not derived from the code — which is exactly why it can find a hole where there is no code. SystemVerilog names the reader will meet elsewhere: **covergroup** (a sampled collection), **coverpoint** (one expression observed), **bins** (buckets, with `illegal_bins` and `ignore_bins`), **cross coverage** (the Cartesian product — where functional coverage earns its money: "we tested subnormals" and "we tested infinities" is far weaker than "we tested subnormal + infinity").

**The coverage-driven loop:** write the model from the spec → run random stimulus → read the report → for each empty bin ask *why*: (a) constraints cannot reach it, fix the generator; (b) it needs a directed test, write one; (c) genuinely unreachable, prove it and remove the bin with written justification → re-run to 100% → **then** keep running random for volume, since closure is necessary, not sufficient. The loop's real product is step (a)/(b)/(c): every empty bin forces a conversation about the design.

### 5.3 The trap: 100% code coverage on a broken design

`assign cout = a[7] | b[7];` — one line, always executed. **Line, statement and toggle coverage all reach 100%** after a handful of vectors that move every bit both ways. The design is wrong on 25% of all inputs. Functional coverage with a bin for *"exactly one MSB set, and no carry-out"* reports **0 hits** against chapter 4's suite, and the hole is visible before anyone mutates anything. Print both numbers side by side — it is the most compact possible argument for the section.

Same family: a design with a perfect coverage report and a `$display`-only testbench reports 100% and verifies nothing. Coverage and mutation testing are complementary halves.

### 5.4 What can Icarus actually do? — investigated honestly

**Nothing. Icarus Verilog 13.0 has no coverage instrumentation of any kind.** Measured:
- `iverilog -t <target>` selects a backend; the installed set is `blif null pcb sizer stub vhdl vlog95 vvp`. There is no coverage target — `iverilog -t coverage` fails with `ERROR: Unable to read config file: .../lib/ivl/coverage.conf`, the same error as `-t bogus`, i.e. the name does not exist.
- `iverilog -h` has no `-cover*`/`-toggle`/`-profile` option. `vvp -h` has only `-h -i -l -M -m -n -N -q -s -v -V`. The official Icarus vvp flags page lists the same set and mentions no coverage, seeds or assertions.
- Covergroup syntax does not compile at **any** language level (`-g2005`, `-g2005-sv`, `-g2009`, `-g2012` all give `syntax error / Invalid module item`).

**Elsewhere in the open-source flow, for honesty:**
- **Verilator** has real coverage: `--coverage` is an alias for `--coverage-line --coverage-toggle --coverage-expr --coverage-fsm --coverage-user`, plus `--coverage-per-instance`, `--coverage-underscore`, `--trace-coverage`; results go to a `.dat` file processed by the separate `verilator_coverage` binary, and `--coverage-user` supports covergroups. But Verilator is a cycle-accurate 2-state compiler, not an event simulator — porting a chapter-4 testbench is a change of model, not a flag.
- **Covered** (covered.sourceforge.net) supports line, toggle, memory, combinational-logic, FSM state/transition and assertion coverage, and integrates with Icarus by post-processing VCD/LXT2 or as a VPI module (`configure --with-iv=<path>`). The obvious fit for this flow — but the site's copyright reads 2010, it is not in Homebrew, and it is not installed here. Optional appendix, not a dependency.

### 5.5 The chapter's practical answer: hand-rolled functional coverage in plain Verilog

**This works, and it teaches the concept better than a tool would**, because the reader must write the bins — the part that matters. Model: a 5×5 cross of operand classes, 4 bins of `|exponent difference|` for normal×normal, 5 result-class bins. **34 bins.**

```verilog
  localparam C_ZERO=0, C_SUB=1, C_NORM=2, C_INF=3, C_NAN=4, NCLS=5;
  localparam NCROSS = NCLS*NCLS, NEXPD = 4, NRES = 5;
  localparam NBINS  = NCROSS + NEXPD + NRES;      // 34
  integer cov [0:NBINS-1];

  function integer fclass;                 // IEEE 754 binary32 class
    input [31:0] f; reg [7:0] e; reg [22:0] m;
    begin
      e = f[30:23]; m = f[22:0];
      if      (e==8'h00) fclass = (m==0) ? C_ZERO : C_SUB;
      else if (e==8'hff) fclass = (m==0) ? C_INF  : C_NAN;
      else               fclass = C_NORM;
    end
  endfunction

  function integer expdbin;                // |exponent difference| bucket
    input [31:0] a; input [31:0] b; integer d;
    begin
      d = a[30:23] - b[30:23]; if (d<0) d = -d;
      if      (d==0)  expdbin = 0;         // equal exponents: cancellation region
      else if (d<=2)  expdbin = 1;         // near: normalisation shift of 1-2
      else if (d<25)  expdbin = 2;         // shifted, guard/round still live
      else            expdbin = 3;         // >=25: only the sticky bit survives
    end
  endfunction

  task cov_sample;                         // call once per transaction
    input [31:0] a; input [31:0] b; input [31:0] r; integer ca, cb;
    begin
      ca = fclass(a); cb = fclass(b);
      cov[ca*NCLS + cb] = cov[ca*NCLS + cb] + 1;
      if (ca==C_NORM && cb==C_NORM)
        cov[NCROSS + expdbin(a,b)] = cov[NCROSS + expdbin(a,b)] + 1;
      cov[NCROSS + NEXPD + fclass(r)] = cov[NCROSS + NEXPD + fclass(r)] + 1;
    end
  endtask
```
The report walks the array, marks empty bins, and **fails the run**:
```verilog
  if (holes != 0) begin
    $display("*** COVERAGE FAILURE: %0d empty bins ***", holes);
    $fatal(1);              // non-zero exit -> make goes red (see §3)
  end
```

**Run A — 2000 unconstrained random 32-bit patterns:**
```
   ZERO     x ZERO/SUBNORM/NORMAL/INF/NAN      all 0 <-- 5 HOLES
   INF      x ZERO/SUBNORM/NORMAL/INF/NAN      all 0 <-- 5 HOLES
   NAN      x ZERO/SUBNORM/INF/NAN             all 0 <-- 4 HOLES      NAN x NORMAL      12
   SUBNORM  x ZERO/SUBNORM/INF/NAN             all 0 <-- 4 HOLES      SUBNORM x NORMAL  11
   NORMAL   x ZERO  0 <-- HOLE    x INF  0 <-- HOLE    x SUBNORM 6    x NAN  5
   NORMAL   x NORMAL   1966
 normal x normal, |exp diff|:  ==0: 9   1..2: 39   3..24: 338   >=25 sticky: 1580
 result class: ZERO 0 <-- HOLE  SUBNORM 0 <-- HOLE  NORMAL 1983  INF 0 <-- HOLE  NAN 17
 -------------------------------------------------
 bins hit 11 / 34  =  32%   holes = 23
*** COVERAGE FAILURE: 23 empty bins ***      exit=1
```
§4.3's argument made visible: 2000 random vectors, **1966 of them the same easy case**, 23 of 34 bins never touched. No zeros, no infinities, no subnormal+subnormal.

**Run B — constrained generator (2000) + 34 directed corner cases.** 33/34 bins:
```
   expdiff >= 25 sticky      0 <-- HOLE
 bins hit 33 / 34  =  97%   holes = 1
```
**This hole was a bug in the generator, found by the coverage model, not by me** — the first version clustered every normal exponent into `8'h40 + (rand % 16)`, a 16-wide window, so `|exp diff| ≥ 25` was unreachable by construction. The CDV loop, live.

**Run C — one branch added (`else e = 8'h01 + (rand % 254);`):**
```
   expdiff == 0            26      expdiff 3..24         359
   expdiff 1..2            87      expdiff >= 25 sticky  715
 bins hit 34 / 34  =  100%   holes = 0        *** COVERAGE CLOSED ***
```
Stable at `+seed=1,2,3,99`. Seed-stability is itself worth checking: a model that closes on only one seed has not closed.

**Notes.** ~60 lines, a few integer increments per transaction. `$fatal(1)` on holes makes **coverage a test** that turns `make` red — better than most commercial flows manage by default, where the coverage report is a document nobody reads. Extensions: `illegal_bins` → `if (bad) $fatal(1)`; per-bin minimum hit counts, to catch bins reached once by accident; dump the array to a file to *merge* coverage across a regression. For the running example the equivalent model is `{a[7], b[7]}` crossed with `cout`, or one bin `a[7]^b[7] && (a+b) <= 255` — empty after chapter 4's suite, full after 50 random vectors.

## 6. Assertions

An assertion is an executable statement of something that must always be true. It moves a check from the testbench boundary to where the property lives, and fires at the moment of violation rather than when the corruption reaches an output.

**Two families.** **Immediate** — procedural, evaluated when control reaches it: `assert (cond) pass; else fail;`. **Concurrent** — a temporal property on a clock: `assert property (@(posedge clk) req |-> ##[1:3] ack);`. That is SVA (IEEE 1800), whose operators `|->`, `|=>`, `##n`, `[*n]`, `throughout`, `within`, `disable iff` make protocol checking concise. Formal-adjacent: `assume` (constrains the environment) and `cover` (records that a scenario happened).

### 6.1 What Icarus Verilog 13.0 actually supports — measured

Each row compiled with `iverilog -g<level> -o out f.v`, and run under `vvp` where it compiled.

| # | Construct | `-g2005` | `-g2005-sv` | `-g2009` | `-g2012` |
|---|---|---|---|---|---|
| 1 | `assert (expr);` | ✗ `unknown task ``assert''` | **✓** | **✓** | **✓** |
| 2 | `assert (expr) pass; else $error(...);` | ✗ syntax error | **✓** | **✓** | **✓** |
| 3 | `assert final (expr);` | ✗ | ✗ `sorry: Deferred assertions are not supported` | ✗ | ✗ |
| 4 | `assume (expr);` | ✗ unknown task | **✓** | **✓** | **✓** |
| 5 | `cover (expr);` (immediate) | ✗ unknown task | **✓** | **✓** | **✓** |
| 6 | `LABEL: assert (expr) else $fatal(0,...);` | ✗ | **✓** | **✓** | **✓** |
| 7 | `assert property (@(posedge clk) req \|-> ack);` | ✗ | ✗ `Error in property_spec of concurrent assertion item` | ✗ | ✗ |
| 8 | `sequence` / `property` / `endproperty` | ✗ | ✗ `Invalid module item` | ✗ | ✗ |
| 9 | `cover property (...)` | ✗ | ✗ `sorry: concurrent_assertion_item not supported` | ✗ | ✗ |
| 10 | `always_comb` containing `assert` | ✗ | **✓** (warning only) | **✓** | **✓** |
| 11 | `assert #0 (expr);` (deferred) | ✗ | ✗ `sorry: Deferred assertions are not supported` | ✗ | ✗ |
| 12 | `$info` / `$warning` / `$error` / `$fatal` | **✓** | **✓** | **✓** | **✓** |
| 13 | plain `if (x !== exp) begin ... end` | **✓** | **✓** | **✓** | **✓** |
| 14 | `disable iff` in a concurrent assertion | ✗ | ✗ syntax error | ✗ | ✗ |
| 15 | `covergroup` / `coverpoint` / `bins` | ✗ | ✗ syntax error | ✗ | ✗ |

**In one sentence: Icarus 13.0 supports immediate assertions (including `assume` and immediate `cover`) from `-g2005-sv` upward, and supports no concurrent assertions, no SVA sequences or properties, no deferred assertions, and no covergroups, at any language level.**

- `-g2005-sv` is the threshold; nothing changes between `-g2005-sv`, `-g2009` and `-g2012` for any construct tested. Standardise on `-g2012` and stop thinking about it.
- The advertised `-gassertions | -gsupported-assertions | -gno-assertions` flags only control whether the "sorry" diagnostic prints; they enable nothing. Measured: `-gno-assertions` on the concurrent-assertion file still gives `syntax error`, because the parser cannot read the syntax at all.

  > **Sharpened 2026-08-21 by chapter 13's research (66 probes; see
  > `research/ch13-systemverilog.md` §7 and §9):** four of this file's assertion
  > and randomness claims are now more precisely measured. (1) `-gno-assertions`
  > ALSO silently deletes fully-supported IMMEDIATE assertions — a failing
  > `assert…else $error` compiles clean and never fires — so "the flag that turns
  > a failing check into a silent pass" covers every assertion in a design, not
  > only concurrent ones. (2) `-gsupported-assertions` DOES change build
  > semantics, not just the diagnostic: immediate assertions stay live while
  > parseable concurrent items are silently discarded — the "enable nothing"
  > clause above stands, the "only control the diagnostic" clause does not.
  > (3) Immediate `cover` is accepted but has NO observable effect (its pass
  > statement never executes; nothing is counted anywhere) — this file's ✓
  > overstates it. (4) `$urandom(seed)`'s SECOND draw is also near-linear in the
  > seed and `$urandom_range` inherits the correlation; the operative rule is
  > "seed once per simulation" — one discarded draw does not decorrelate nearby
  > seeds. Chapters 9/10/12's shipped testbenches already comply.
- Row 10's message is a *synthesis* warning (`System task ($error) cannot be synthesized in an always_comb process`); it compiles and runs.

**Runtime behaviour of a failing immediate assertion:** `ERROR: a02.v:2: a02: x=5` / `Time: 0  Scope: tb`. The message carries **file, line, simulation time and scope** automatically — real value over a hand-rolled `if` + `$display`, and the strongest argument for using `assert` even where a plain `if` would do. `$info`/`$warning`/`$error` continue; `$fatal` stops. **Exit codes (§3): `$error` leaves the exit code at 0; only `$fatal` returns non-zero.**

### 6.2 The practical Icarus pattern

No concurrent assertions, so write clocked immediate assertions inside `always @(posedge clk)`:
```verilog
always @(posedge clk) if (!rst) begin
  assert (cnt !== 8'hxx) else begin errs = errs+1; $error("cnt is X at %0t", $time); end
  assert (cnt < 8'd6)    else begin errs = errs+1; $error("cnt=%0d exceeded 5 at %0t", cnt, $time); end
end
```
```
ERROR: p1.v:8: cnt=6 exceeded 5 at 75
ERROR: p1.v:8: cnt=7 exceeded 5 at 85   ...   errs=4
FATAL: p1.v:12:                               exit=1
```
Two habits baked in: `errs = errs+1` alongside `$error` so the run can `$fatal(1)` and go red, and `if (!rst)` as a hand-rolled `disable iff`. Multi-cycle properties (`req |-> ##[1:3] ack`) need a small counter/flag FSM — fine for one or two, genuinely painful past that. Say so and stop rather than building a toy SVA library.

### 6.3 Where assertions belong, and what makes a good one

- **Inside the DUT — invariants** the module must always satisfy: the normalised significand's leading bit is 1 unless the result is zero or subnormal; the exponent never exceeds 254 without the overflow flag; the aligner's shift amount is in range; one-hot control is one-hot; every `case` has `default: $error(...)`. Wrap in `` `ifndef SYNTHESIS `` so the synthesisable body stays clean.
- **In the testbench — protocol and boundary checks**: handshake legality, no `x` on a valid output, result matches the reference model.
- **A good assertion** states something from the **specification**, not the implementation (`assert (sum == a + b)` next to `assign sum = a + b;` is a tautology that can never fire); is **local**, so a failure names the guilty module; fails **early**, near the cause; carries values in its message; and is **reachable** (an assertion under a condition that never occurs is a comment — `cover` the condition to prove otherwise). Use `!==`/`===` so `x` and `z` are caught.
- **Assertion density**: folklore says one assertion per 10-20 lines of RTL. The useful non-numeric version: every non-trivial `case`, every FIFO, every one-hot vector, every shift amount and every state machine deserves at least one.
- **X-checking is the cheapest high-value assertion here** and needs no SVA: `assert (^result !== 1'bx)` on every output every cycle catches uninitialised registers, incomplete `case` statements and inferred latches (chapter 3's material) at the moment they occur.

**Honesty note the chapter must include:** this is the weakest part of the open-source flow. SVA is one of the great ideas in hardware verification and the reader cannot practise it here. Show one SVA property as a picture of where they are going, show the counter-based Icarus equivalent, and be explicit that a commercial simulator or Verilator (which supports an SVA subset) is the next step.

## 7. Regression, bug tracking, and the verification loop

A regression suite is the set of tests you run to prove you did not break anything — run because of a *change*, not because of a suspicion.

**Speed is a correctness property of the suite.** An hour-long suite runs once a day and finds each bug tangled with twenty other changes; a five-second suite runs after every edit and finds it within one diff. **Measured throughput** (Icarus 13.0, `shortreal` reference, one add per transaction):

| work | time |
|---|---|
| `iverilog -g2012` compile of a small testbench | 0.013 s |
| 100,000 transactions | 0.32 s |
| 1,000,000 transactions | 3.10 s |
| exhaustive 65,536-pair 8-bit sweep | 0.09 s |

≈ **320,000 transactions/second** — a real number to plan against: a one-million-vector campaign is a 3-second test. Tiering once the suite outgrows seconds: **smoke** (corner library + 1,000 random, <1 s, every save); **regression** (full directed + 100k random + coverage closure + exhaustive minifloat, <30 s, every commit); **soak** (10^8 random, many seeds, nightly). For a project this size, "run everything, it takes 3 seconds" beats any test-selection cleverness — premature selection machinery is a real trap.

**The find-a-bug loop**, and the order is the lesson:
1. **Reproduce** deterministically; record the exact command *including the seed*.
2. **Minimise** — fewest vectors, smallest operands. A one-vector reproducer running in 10 ms beats an hour staring at a 100k-vector waveform. Automatable: print the failing transaction's inputs (§3) and re-run just those.
3. **Write a test that fails — before fixing.** The step everyone skips and the one carrying all the value: it proves you understood the bug, proves the test can detect it, and becomes the permanent guard. TDD applies verbatim to hardware.
4. **Fix.** 5. **Confirm** the new test passes *and* the whole regression still does. 6. **Keep the test forever**, with an ID and a comment naming the bug.

Step 3 is the mutation-testing insight arriving from the other direction: you have *seen* this test fail, so you know it is real.

**Why the regression only grows.** Every bug found is a permanent test; deleting one deletes the evidence that a specific bug is gone. Legitimate removals: the feature was removed, the test is a strict duplicate, the test was wrong. "It is slow" is not one — move it to a slower tier. "It has never failed" is *especially* not one; that is what a working guard looks like. So §8's corner-case library is not a one-time exercise but the permanent core of chapter 12's regression, in a file that only gets longer.

**Bisecting.** `git bisect run make test` binary-searches for the breaking commit — 10 runs over 1000 commits. Its prerequisites are exactly this chapter's arguments: the test must be **deterministic**, must **exit non-zero on failure** (`$fatal(1)`, §3/§6), and must be **fast**. Bisection is where a sloppy exit code finally bites. Keep commits small and each one green.

**Flaky tests and determinism.** Event-driven simulation on a fixed netlist is deterministic: same source and command line, byte-identical output. The classic software flakiness sources are absent — a genuine advantage. What remains: uninitialised registers whose `x` resolves differently after an unrelated edit; races between blocking assignments in different `always` blocks (Verilog's scheduler may pick an order); `$time`-dependent stimulus meeting a changed clock period; files whose contents change.

**The seed surprise.** Chapter 4 found `$random` byte-identical across runs. Made precise:
```
$ vvp seed +seed=1        $ vvp seed +seed=2        $ vvp seed +seed=12345
$random(seed) : 80010e00    $random(seed) : 80021c00   $random(seed) : b2d28465
$random()     : 12153524    $random()     : 12153524   $random()     : 12153524
$urandom()    : 92153524    $urandom()    : 92153524   $urandom()    : 92153524
$urandom(seed): e3cc97c7    $urandom(seed): e07625c0   $urandom(seed): f3be9be7
```
- **`$random` and `$urandom` with no argument ignore the plusarg entirely** and produce the same fixed sequence every run. Only the seeded forms vary. (The argument is an inout, so it must be a `reg`/`integer` variable, not a literal.)
- So "random testing" with bare `$random` is a **fixed 10,000-vector directed suite you never read**. Repeatable — excellent for regression — but it explores nothing new however many times you run it.

The fix is three lines plus a Makefile rule:
```verilog
if (!$value$plusargs("seed=%d", seed)) seed = 1;
$display("SEED=%0d", seed);          // always echo it: this is the reproducer
a = $urandom(seed);
```
```makefile
SEED ?= 1
test: ; vvp sim +seed=$(SEED)
soak: ; for s in $$(seq 1 200); do vvp sim +seed=$$s || exit 1; done
```
- **Always print the seed** — a failure report without it is not reproducible, and this is the one place a hardware regression can be as flaky as a software one.
- Best of both: the nightly soak varies the seed and explores; the commit regression pins `SEED=1` so `git bisect` stays usable.
- Ordering hazard: `$urandom_range` and bare `$urandom` share global generator state, so inserting one call shifts every later value — measured. Keep the seeded generator separate from bare calls or an unrelated edit will look like flakiness.

**Reporting.** One line per test, and a summary a human reads in two seconds: `PASS 214/214 tests, 1,000,000 vectors, 34/34 coverage bins, seed=1, 3.4s`. Everything else goes to log files. If the summary needs scrolling nobody reads it, and an unread green run is the same as no run (§9).

## 8. Verifying floating point specifically

Chapter 12's checklist. Each entry says **why it is a distinct case in the hardware** — the test to write and the logic it aims at.

### 8.1 The corner-case taxonomy for binary32 addition

Chapter 12's checklist. The third column is the point: each row is a *separate piece of logic*, not just a separate line of the standard.

| # | Case | Test vectors | Why it is a distinct case **in the hardware** |
|---|---|---|---|
| A1 | `(+0)+(+0)`, `(-0)+(-0)` | `00000000+00000000`, `80000000+80000000` → `+0`, `-0` | zero is *not* a normalised significand; any logic that unconditionally prepends the implicit `1.` breaks when `exp==0` |
| A2 | **`(+0)+(-0)` = `+0`** (both orders) | `00000000+80000000`, `80000000+00000000` | falls out of *no* natural datapath — a hard-coded special case in RN. Must be directed, in both orders |
| A3 | `(+0) + x` = `x` | `00000000 + 3f800000` | zero-operand bypass; `x`'s sign and payload must survive untouched |
| B1 | one operand subnormal | `00000001 + 3f800000` | the aligner must use effective exponent **−126**, not the encoded 0. This off-by-one is the most common subnormal bug |
| B2 | **both** subnormal | `00000001 + 00000001` | no implicit 1 anywhere — a plain integer add of fractions |
| B3 | normal+normal → **subnormal** (gradual underflow) | `00800000 + 80000001` → `007fffff` | the normaliser must *stop* at exponent 1 leaving a denormalised significand, not shift on to a leading 1 |
| B4 | subnormal+subnormal → **normal** | `007fffff + 00000001` → `00800000` | carry out of the fraction add promotes exponent 0→1 with **no shift** — the exact class boundary in one vector |
| C1 | `NaN + number`, `number + NaN` | `7fc00000 + 3f800000` and reverse | NaN is a pure control-path override: the datapath result is discarded. Asymmetric propagation is a real bug — test both orders |
| C2 | sNaN input ⇒ **quiet** NaN out + invalid flag | `7fa00000 + 3f800000` | quieting is separate logic from propagation |
| C3 | `NaN + inf`, `NaN + NaN` | `7fc00000 + 7f800000` | tests the **priority**: NaN must beat infinity, which beats everything else |
| D1 | `inf+inf`, `inf+finite`, `inf+0` | `7f800000 + 7f800000` etc. | infinity shares the `exp==255` encoding with NaN, so the class decoder must split on the mantissa |
| D2 | **`inf + (-inf)` = NaN** + invalid | `7f800000 + ff800000` → `7fc00000` | the one place a *finite* datapath computes something that must be overridden |
| E | `\|exp diff\| ≥ 25` — the sticky region | a value on a rounding tie + a tiny same-signed value | the smaller operand shifts past significand+guard+round, but must still set the **sticky bit** = reduction OR of everything shifted out. Implementations lose it by saturating the shift amount. **80.4% of random normal pairs land here** (§4.3) |
| F1 | **exact cancellation** `a + (-a)` = `+0` | `3f800000 + bf800000` | result zero produced by full cancellation — a different path from a zero *operand*. P ≈ 2.3e-10 under random: **must be directed** |
| F2 | catastrophic cancellation | equal exponents, significands differing in the last few bits | the only case exercising the **leading-zero counter** and **variable left shifter** at full range, and the only one where the exponent falls far in one op (possibly into subnormal range → B3). Only **1.16%** of random normal pairs (§4.3) |
| G1 | tie → **down** (LSB 0) and tie → **up** (LSB 1) | `4b800000 + 3f800000` → `4b800000` | a suite with only one tie direction passes a DUT that always rounds ties up |
| G2 | guard=1/sticky=1 ⇒ up; guard=0 ⇒ down | `4b7fffff + 3f800000` → `4b800000` | the four guard/round/sticky/LSB combinations are four separate decisions |
| G3 | rounding **carries out** of the significand | `1.11…1` + 1 ulp → `10.00…0` | needs a post-rounding renormalise (shift right 1, increment exponent) — a second, rarely-taken normalisation path |
| H1 | overflow → `±inf` + overflow/inexact | `7f7fffff + 7f7fffff` → `7f800000` | verified: Icarus `shortreal` is right here; Python `struct.pack('>f')` raises `OverflowError` and needs handling |
| H2 | **rounding-induced** overflow | just below max-normal, rounds up to inf | a different path from arithmetic overflow |
| H3 | underflow to subnormal, and to zero | see B3; and below the smallest subnormal | plus the boundary where rounding *up* a subnormal yields the smallest normal |
| I1 | same-signed add **carries out** of the significand | `3f800000 + 3f800000` | shift right 1, increment exponent |
| I2 | same-signed add, **no** carry | `3f800000 + 3e800000` | no shift — a distinct shifter behaviour |
| I3 | opposite-signed ⇒ subtract ⇒ **left shift 0..24** | near-cancellation pairs | three distinct shifter behaviours (right-1 / none / left-N), each needing a hit |

Two cross-cutting notes:
- **Flush-to-zero is a different specification.** If chapter 12 implements FTZ its reference model must too, or thousands of "failures" are really a spec mismatch.
- **Row I is where §4's lesson recurs at full scale**: the carry-out of a significand adder is exactly the kind of signal a plausible-looking wrong expression computes correctly on every vector you thought of.

**J. Four-input specifics (ch. 10, 12).** FP addition is **not associative**: `(a+b)+(c+d) ≠ ((a+b)+c)+d` in general, so the reference model must sum in *exactly the hardware's order* or every third vector "fails". Settle this explicitly — it is a first-class hazard. New corner cases: intermediate overflow that cancels (`big + big − big − big`), an intermediate NaN from `inf + (-inf)` that must poison the final result, and cancellation between *pairs* rather than operands.

### 8.2 Differential testing against a trusted implementation

Python's `float` is the host binary64 FPU and `struct.pack('>f'/'>I')` is an exact binary32 encoder — a legitimate IEEE 754 reference, with the two caveats already measured (force intermediates back through `pack/unpack`; handle `OverflowError`).

**Berkeley SoftFloat and TestFloat (John R. Hauser, U.C. Berkeley) are the real thing and should be named.**
- *SoftFloat*: "a free, high-quality software implementation of binary floating-point that conforms to the IEEE Standard for Floating-Point Arithmetic" — 16/32/64/80/128-bit formats, all required rounding modes, exception flags, special values and FMA. Release 3e (Jan 2018), U.C. Berkeley open-source license.
- *TestFloat*: "a small collection of programs for testing whether an implementation of binary floating-point conforms to the IEEE Standard," which "works by comparing the behavior of the floating-point under test with that of the Berkeley SoftFloat software implementation," across all modes and special cases.
- Why it matters pedagogically: a dedicated, decades-maintained test-vector generator for *one arithmetic operation* is the most persuasive available evidence that FP verification needs methodology. Its architecture is §2's — an independent software model, differentially compared, with cases concentrated near boundaries rather than sampled uniformly. Caveat: it is a C toolchain, so wiring it to Icarus means generating vector files offline and loading them with `$readmemh` — a good optional exercise, not the baseline.

### 8.3 Exhaustive testing over a reduced-width float

**The technique.** Build a float with the *same structure* — sign / biased exponent / implicit leading one / `exp==0` subnormals / `exp==all-ones` inf and NaN — but fewer bits, and verify **every operand pair**. Structural bugs are width-independent, so a bug in subnormal handling, NaN priority, sticky reduction or tie-breaking shows up at 8 bits exactly as at 32.

**The arithmetic.** For 1 sign + E exponent + M mantissa, W = 1+E+M, there are 2^W values and **2^(2W) ordered operand pairs**:

| format | E | M | W | values | **operand pairs** | feasible at 10^7/s? |
|---|---|---|---|---|---|---|
| E4M3 minifloat | 4 | 3 | 8 | 256 | **65,536 = 2^16** | 0.007 s — yes |
| E5M2 | 5 | 2 | 8 | 256 | 65,536 | yes |
| binary16 (half) | 5 | 10 | 16 | 65,536 | **4,294,967,296 = 2^32** | 429 s — yes |
| bfloat16 | 8 | 7 | 16 | 65,536 | 4,294,967,296 | yes |
| **binary32** | 8 | 23 | 32 | 4.29e9 | **1.8447e19 = 2^64** | **58,561 years — no** |

Four-input versions are 2^(4W): E4M3 → **2^32 = 4.29e9** (hours, tractable); binary16 → 2^64 (no); binary32 → 2^128 ≈ 3.4e38 (no).

**Measured feasibility**: a full 65,536-pair 8-bit sweep ran in `vvp` in **0.09 s** — exhaustive minifloat verification is faster than compiling the testbench.

**What it buys, quantified.** E4M3's 256 patterns are 2 zeros, 14 subnormals, 224 normals, 2 infinities, 14 NaNs. Over all 65,536 pairs: **10.6%** involve at least one subnormal (vs 0.78% for random binary32); **all 25** class-cross combinations occur, the rarest (`zero × zero`) exactly 4 times — *guaranteed*, not probabilistic; `inf × inf` occurs 4 times, where random binary32 would need ~**4.6 × 10^18** vectors to see one. Every rounding tie, sticky case, cancellation, overflow and underflow occurs, because "every" is what exhaustive means. **The §8.1 taxonomy does not need enumerating — it is covered by construction.**

**How to use it.** Parameterise the adder on `EXP_W`/`MANT_W`. Verify exhaustively at E4M3, then at binary16. *Then* instantiate at E8M23 and verify with corner cases + constrained random + coverage. The parameterisation is the whole trick and is good design practice anyway.

**Its limits, honestly.** Reduced-width exhaustive does **not** catch width-dependent bugs: a shifter one bit too narrow at 24 bits but fine at 4, a carry chain that breaks above 16 bits, a hard-coded `8'd127` right for binary32 and wrong for E4M3, a leading-zero counter with the wrong ceiling. It complements full-width random testing; it does not replace it. Chapter 12 needs both.

## 9. Pedagogical hazards

Each is a place a reader will lose weeks.

1. **Confusing code coverage with correctness.** 100% line, statement and toggle coverage on `assign cout = a[7] | b[7];` — wrong on 25% of inputs. Coverage measures whether stimulus arrived, never whether the answer was right.
2. **A reference model that shares the DUT's bug.** Same person, same misreading, written after reading the RTL — the comparison then passes forever. Write it from the *spec*, in a different language, ideally before the RTL. Smell test: if you opened the RTL to decide what the model returns, it is contaminated.
3. **Testing what you implemented rather than what was specified.** Derive the test list from the specification, not from a walk through your code — anything you forgot to implement will also be forgotten in the tests, and the suite will be green about a feature that does not exist.
4. **Checking the value but not the timing.** The result is right but a cycle late, or `valid` asserts a cycle early, or the monitor samples the wrong edge and catches the right value anyway. Assert that outputs are stable while `valid` is low, that `valid` is one cycle wide, that back-to-back transactions do not merge.
5. **Forgetting to test reset.** The one state the design must reach from anywhere, and the one nobody tests: reset at time zero; mid-transaction; released on both clock phases; twice in a row; every output known (not `x`) immediately after.
6. **Assuming random covers corners.** Measured: two random binary32 operands include a zero with probability 9.3e-10 and an infinity with the same; exact cancellation ≈ 2.3e-10. A billion-vector campaign expects *one* zero. Corners need directed tests and biased constraints — both.
7. **A golden file generated by the DUT.** The most seductive trap here: you run the design, the output "looks right", you save it as `expected.hex`, and the suite now verifies that the design still has that day's bug. **A golden file must come from something that is not the DUT**, and its provenance (which program, version, command) belongs in a comment at the top of the file.
8. **Tests that pass because they never ran.** A loop bounded at zero; stimulus behind an `if` that is never true; a task defined and never called; a `$readmemh` on a missing file (Icarus warns, but a warning in a 4,000-line log is invisible). **Countermeasure: count.** `if (checks < EXPECTED) $fatal(1, "only %0d checks ran", checks);` — one line that kills a whole family of silent no-ops.
9. **Comparing floats with `==` in the testbench's own reference computation.** Two forms. *Wrong precision*: computing the reference in `real` (binary64) and comparing to a binary32 DUT — measured, it reports PASS for `4b800000` here but produces a flood of false alarms whenever the double is more accurate, training the reader to ignore failures. *Tolerance comparison*: `if (abs(got-exp) < epsilon)` is the numerical-analysis habit and is **wrong for verifying an adder** — measured, `4b800001` vs `4b800000` differs by 1.0 in value, so any tolerance ≥ 1 accepts a real 1-ulp rounding bug. **Rule: compare bit patterns with `===`, always.** Only NaN is exempt, compared by class.
10. **Not testing the boundary between representation classes.** Bugs live on boundaries: largest subnormal → smallest normal (`007fffff + 00000001 = 00800000`); largest normal → infinity; smallest normal → subnormal; exponent 254 → 255. Each needs a test *on*, *below* and *above*. Class coverage bins are not enough — a bin can be full of interior points and empty of boundary points.
11. **Declaring victory on a green run.** Green means nothing until you know the tests *can* fail (mutation testing, §3), the stimulus reached the interesting states (coverage, §5), the checker actually ran (hazard 8), and the exit code is honest (measured: `$error` alone returns 0 and `make` reports success while assertions fail). Green is the beginning of the argument, not the end.
12. **Believing `$random` is random.** Bare `$random`/`$urandom` produce the same fixed sequence every run regardless of plusargs (measured, §7). Running your "random" test a thousand times runs the same test a thousand times.

## Citations

**Verified with WebFetch (URL loaded and content confirmed) — 5**

1. John R. Hauser, **Berkeley TestFloat**, Release 3e (January 2018). U.C. Berkeley. Overview page — definition, supported formats (16/32/64/80/128-bit), method ("works by comparing the behavior of the floating-point under test with that of the Berkeley SoftFloat software implementation"), and stated limitations re division/sqrt rounding and SRT division. http://www.jhauser.us/arithmetic/TestFloat.html `[verified]`
2. John R. Hauser, **Berkeley SoftFloat**, Release 3e (January 2018). U.C. Berkeley open-source license. Overview page — formats, rounding modes, exception flags, FMA, relationship to TestFloat. http://www.jhauser.us/arithmetic/SoftFloat.html `[verified]`
3. **Verilator manual**, "Verilator Arguments" (latest). Coverage options: `--coverage` (alias for `--coverage-line --coverage-toggle --coverage-expr --coverage-fsm --coverage-user`), `--coverage-per-instance`, `--coverage-underscore`, `--trace-coverage`; `verilator_coverage` post-processor and `.dat` output. https://verilator.org/guide/latest/exe_verilator.html `[verified]`
4. **Icarus Verilog documentation**, "VVP Command Line Flags". Complete runtime flag list (`-i -l -M -m -n -N -q -s -v -V`); extended `+` arguments reserved for user plusargs; **no** coverage, seed or assertion facilities documented. https://steveicarus.github.io/iverilog/usage/vvp_flags.html `[verified]`
5. **Covered — Verilog Code Coverage Analyzer** project page. Metrics: line, toggle, memory, combinational logic, FSM state and state-transition, assertion (functional) coverage. Site copyright 2010. https://covered.sourceforge.net/ `[verified]`

**Title-only (named but URL not fetched — do not invent links) — 9**

6. **IEEE Std 1800-2023** (or 1800-2017), *IEEE Standard for SystemVerilog — Unified Hardware Design, Specification, and Verification Language*. Clause 16 "Assertions" (immediate, deferred, concurrent; `assert`/`assume`/`cover`/`restrict`; sequences, properties, `|->`, `|=>`, `##n`, `disable iff`); Clause 19 "Functional coverage" (covergroup, coverpoint, bins, cross, `illegal_bins`, `ignore_bins`); Clause 18 "Constrained random value generation" (`rand`, `constraint`, `randomize()`, `$urandom`, `$urandom_range`). `[title-only]`
7. **IEEE Std 754-2019**, *IEEE Standard for Floating-Point Arithmetic*. Clause 3 (formats, binary32 encoding, subnormals), Clause 4 (rounding-direction attributes, roundTiesToEven), Clause 5 (operations; sign of exact-zero sums), Clause 6 (infinity, NaN, sign bit rules), Clause 7 (exceptions: invalid, overflow, underflow, inexact). The normative source for the §8 taxonomy. `[title-only]`
8. **IEEE Std 1800.2-2020**, *Universal Verification Methodology (UVM) Language Reference Manual*, Accellera Systems Initiative / IEEE. Source for the agent/driver/monitor/sequencer/scoreboard decomposition referenced in §3. `[title-only]`
9. Janick Bergeron, **Writing Testbenches: Functional Verification of HDL Models**, 2nd ed., Kluwer, 2003. Ch. 1 (what verification is; the cost argument), Ch. 4 (reference models), Ch. 5-6 (stimulus, self-checking testbenches, transaction-level architecture). Canonical for §1-§3. `[title-only]`
10. Chris Spear and Greg Tumbush, **SystemVerilog for Verification**, 3rd ed., Springer, 2012. Ch. 6 (randomization and constraints), Ch. 8 (functional coverage: covergroups, bins, cross coverage, the coverage-driven loop), Ch. 12 (a complete layered testbench). Primary for §4.4 and §5.2. `[title-only]`
11. Andrew Piziali, **Functional Verification Coverage Measurement and Analysis**, Kluwer, 2004. The book-length treatment of the code-coverage-vs-functional-coverage distinction, coverage model design, and coverage closure. Source for §5.1's taxonomy. `[title-only]`
12. Harry Foster, Adam Krolnik and David Lacey, **Assertion-Based Design**, 2nd ed., Kluwer, 2004. Assertion taxonomy, where assertions belong, assertion density guidance. Source for §6.3. `[title-only]`
13. Michael Keating and Pierre Bricaud, **Reuse Methodology Manual for System-on-a-Chip Designs**, 3rd ed., Springer, 2002. The origin of much of the "verification is 60-70% of effort" folklore and of the verification-plan-before-RTL discipline (§1). Cite as folklore, not as measurement. `[title-only]`
14. **Wilson Research Group / Siemens EDA Functional Verification Study** (biennial; Harry Foster, author of the published analyses). The only regularly-updated public source of numbers for verification effort share, verification-engineer-to-designer ratios, and adoption rates for assertions, constrained random and coverage. Use this rather than a remembered percentage in §1. `[title-only]`

**Primary evidence: experiments run for these notes**

All experiments ran locally on Icarus Verilog 13.0 (stable) (v13_0) and Python 3.13.7 (macOS/arm64); sources are in the session scratchpad under `.../scratchpad/ch05/`. Every number, compile result and program output quoted in §2-§9 comes from these runs, not from documentation: `mutant.py`, `survive.py`, `mutant_tb.v` (mutant analysis, kill probability, Monte Carlo, Icarus kill measurement); `sr.v`, `sr2.v`, `srdiff.v` (shortreal support, the double-storage trap, 20,000-pair differential test); `asrt/a01..a15.v`, `asrt/ex1..ex3.v`, `asrt/p1.v` (assertion syntax matrix across four `-g` levels, exit codes, clocked assertion pattern); `cov.v` (hand-rolled coverage, runs A/B/C, seed sweep); `seed.v` (plusarg seeding); `minifloat.v`, `perf.v` (reduced-width counts, throughput); `hazard.v` (float-comparison hazards).
