# Chapter 8 source — Floating point addition: align, add, normalize, round

<!-- sections complete: 5/5 -->

## Files

Every file was compiled and run under **Icarus Verilog 13.0** (built from tag
`v13_0`) on Linux x86-64 with `iverilog -g2012 -Wall`, zero compiler output on
every target. The independent reference for every expected constant is
`python3` 3.11: an exact rational adder (`fractions.Fraction`, summed exactly,
rounded once by a from-scratch round-to-nearest-even encoder validated against
`struct` on 100,000 random doubles with zero mismatches) plus a 28-bit-state
datapath model that matched that reference on 1,000,058 pairs (58 directed
both-orders + 1,000,000 mixed random) with zero mismatches this session.

### Design module

| File | Demonstrates |
|---|---|
| `fp32_add_alg.v` | The complete ten-step binary32 addition algorithm as one combinational module: unpack (ch07's `max(E,1)` decode), special-case screen, magnitude compare-and-swap on `w[30:0]`, alignment with G/R/S via **chapter 2's `align_sticky` instantiated at `W = 24`**, the 27-bit add / subtract-with-sticky-borrow, three-outcome normalize with the `min(LZC, eff_e−1)` clamp, `G & (R \| S \| L)` rounding with the rounding-carry renormalize, pack with overflow-to-infinity, and the three flags (no underflow wire — provably never raised, ch07). Chapter 9 splits this file into pipeline modules; every step is a named block of wires so the testbenches can watch it run. |

### Self-checking testbenches

| File | Files needed | Demonstrates |
|---|---|---|
| `tb_walk.v` | `../ch02/align_sticky.v`, `fp32_add_alg.v` | The algorithm tracer: 12 directed pairs (the chapter's worked examples W1–W8b plus the in-range rounding-carry renormalize and the lone-G left-24 case), every intermediate printed **by hierarchical reference into the DUT's wires**, each result checked against a python-verified constant AND the one-add shortreal reference. Walk-count guard. |
| `tb_corners.v` | same | The directed corner library: 46 pairs × both orders = 92 checks, result bits **and all three flags**, ch05 taxonomy groups A–I plus the counterexample pairs of the shortcut section. Eight coverage bins sampled from the DUT's own wires; the gate **fails the run if any required bin — including the rounding-carry renormalize — is empty**. NaN rows check class + quiet bit + payload, never the sign. Check-count guard. |
| `tb_refmodel.v` | same | The chapter 9 reference-model verdict, pinned: 13 boundary one-adds through the shortreal path (subnormal results, both tie directions, both overflow paths, signed zeros, deep sticky, the double-rounding trap pair); `inf + (−inf)` checked by class with the sign printed, never asserted; the sNaN pure round-trip quieting; and the chain trap — naive double chain `3f800001` vs serial DUT `3f800000` vs disciplined round-trip-per-add `3f800000`, all three asserted. Check-count guard. |
| `tb_random.v` | same | 10,000 random pairs from a five-regime mixed generator (uniform bits with specials, exponent-close, \|Δexp\| ≤ 30, subnormal-heavy, near-overflow) against the one-add shortreal reference; NaN by class only. `$urandom` seeded **once**, first draw discarded, seed echoed. Census printed: the rounding-carry renormalize fired 0 times in all 10,000 — the chapter's coverage lesson, printed by the machine. Pair-count guard against the literal 10000, not the parameter it is derived from. |

## Runs and reproduction

```sh
cd .. && bash run_all.sh ch08     # 4 targets, all green
```

or by hand from this directory:

```sh
iverilog -g2012 -Wall -o /tmp/sim ../ch02/align_sticky.v fp32_add_alg.v tb_walk.v && vvp /tmp/sim
```

Every target deliberately reaches into `../ch02`: step 4 of the algorithm IS
chapter 2's `align_sticky` at `W = 24`, and the regression compiles that exact
file into this datapath (precedent: chapter 6's manifest does the same for
`ripple4`/`full_adder`). All four `run` targets compile with **zero** iverilog
output under the warning-gated harness. No target writes a file; build
artifacts go to the session scratchpad. Full-repo regression after adding this
chapter: **86/86**.

One transcript in this directory is architecture-dependent by design and says
so in place: `tb_refmodel.v` prints the sign of the runtime `inf + (−inf)` NaN
(`ffc00000` on this x86-64 host) but asserts only its class — chapter 7
measured both signs from this one simulator.

## Mutation record

Standing practice: every testbench must be shown able to fail. Each mutation
was applied to a **copy** of the named file in the session scratchpad, rebuilt
with the shipped testbenches (all four targets per mutant), and run.
**27 mutations: 23 killed, 4 survivors, each with a written reason.** Counts
recounted from the tables below, not carried by arithmetic. "First failure"
quotes the first FAIL line of the first testbench that killed.

### Datapath mutations (18: 17 killed, 1 equivalent survivor)

Every mutation is one of the chapter's taught bugs; the kill messages print
the trap table's wrong answers verbatim.

| # | Mutation | Result | First failure |
|---|---|---|---|
| M1 | `align_sticky`: sticky tied low (the dropped-sticky datapath) | KILLED | `tb_walk` W3: flags `000` expected `001`; `tb_random` kills on result bits too |
| M2 | `align_sticky`: sticky sees only the first lost bit (early-discarding shifter) | KILLED | `tb_corners` `00000001+3f800000` flags; deep-sticky row `3f800000+33800001` kills on bits |
| M3 | G-only rounding: `round_up = ng & lbit` | KILLED | `tb_corners` `3f800000+33800001`: got `3f800000` expected `3f800001` |
| M4 | rounding-carry renormalize deleted | KILLED | `tb_walk` W7: result `00000000` expected `7f800000`; **killed by the directed set** — `tb_random`'s 10,000 pairs never reached the path (0 hits), exactly the chapter's coverage lesson |
| M5 | swap deleted: operand `a` always leads | KILLED | `tb_walk` W1: result `3fc00000` expected `40700000` |
| M6 | LZC capped at 23 "because the significand has 24 bits" | KILLED | `tb_walk` X2: result `00400000` expected `33800000` — the lone-G left-24 case is the only reacher |
| M7 | sticky borrow omitted from the effective subtract | KILLED | `tb_corners` `3f800001+b3800001`: got `3f800001` expected `3f800000` |
| M8 | normalizer clamp deleted: chases the leading 1 below eff_e = 1 | KILLED | `tb_walk` W6: result `007ffffe` expected `007fffff`; `tb_corners` `00000001+00000001` → `7f800000` (exponent wrap) |
| M9 | right-1 renormalize discards the shifted-off bit instead of making it G | KILLED | `tb_walk` W2: result `405fffff` expected `40600000` — the trap table's number |
| M10 | alignment distance from raw E fields (the E−127 subnormal bug) | KILLED | `tb_walk` W6: result `00800000` expected `007fffff` |
| M11 | screen priority inverted: infinity beats NaN | KILLED | `tb_corners` `7f800000+ffc00001`: got `7f800000`, expected a NaN — only the reversed-order run sees it |
| M12 | unlike-signed zeros return the first operand instead of +0 | KILLED | `tb_corners` `80000000+00000000`: got `80000000` expected `00000000` — again the reversed order |
| M13 | exact cancellation keeps the bigger operand's sign instead of +0 | KILLED | `tb_corners` `bfc00000+3fc00000`: got `80000000` expected `00000000` |
| M14 | inexact flag ignores sticky | KILLED | `tb_walk` W3 flags — only a testbench that checks flags can see this one |
| M15 | alignment clamp deleted: the 8-bit distance wraps mod 32 into the shifter | KILLED | `tb_walk` W3: result `4b800080` expected `4b800000` (d = 48 wrapped to 16) |
| M16 | right-1 renormalize drops old R instead of folding it into sticky | KILLED (after a campaign fix — see below) | first run: survived `tb_walk` AND `tb_corners`, killed only by `tb_random`; after adding the directed pair `3fffffff+3e800009`: `tb_corners` got `40100000` expected `40100001` |
| M17 | result sign taken from the smaller operand | KILLED | `tb_walk` W4: result `b4800000` expected `34800000` |
| M18 | redundant `& ~s_al` added to `exact_zero` | **SURVIVED** | provably output-equivalent: `sum27 == 0` on an effective subtract forces sticky clear (sticky needs d ≥ 3, and then the aligned operand is under a quarter of the big one, so the difference cannot be zero). An equivalent mutant, not a testbench gap. |

### Testbench-side mutations (9: 6 killed, 3 survivors)

What would have to break for each PASS to be a lie — guards and check
executability, per the standing practice.

| # | Mutation | Result | First failure |
|---|---|---|---|
| T1 | `tb_walk` golden constant bent one ulp low (`405FFFFF`, the discard-G wrong answer) | KILLED | W2 check — proves the python constants are load-bearing |
| T2 | `tb_walk` one walk deleted | KILLED | walk-count guard: `11 walks ran, expected 12` |
| T3 | `tb_corners` in-range renormalize vector deleted | KILLED | check-count guard: `90 checks ran, expected 92` |
| T3b | BOTH `40000000`-renorm and W7-renorm vectors deleted AND the check count dutifully updated to 88 | **SURVIVED — legitimately** | the coverage gate did not fire because a **third** pair, `4b800000+b3800000` (2²⁴ − 2⁻²⁴, the sticky-borrow row), also reaches the rounding-carry renormalize — verified with the python model. The run was still a true PASS: the bin was still genuinely covered. Recorded because it sharpens what the gate proves: the path ran, not that any particular vector ran. |
| T3c | ALL FOUR renormalize-reaching vectors deleted, count updated to 84 | KILLED | coverage gate: `a required coverage bin is empty` — the gate itself demonstrated executable |
| T4 | `tb_corners` `sample_bins` call deleted from `chk1` | KILLED | coverage gate: every bin empty |
| T5 | `tb_random` loop never executes (`N_PER_REGIME = 0`) | KILLED | pair-count guard against the literal: `0 pairs ran, expected 10000` |
| T6 | `tb_random` non-NaN comparison deleted | **SURVIVED** | a check *deletion* is a relaxation and is invisible to a run — the same survivor class as ch07's M21. Only mutation analysis itself, or a reviewer, catches a deleted check. |
| T7 | `tb_refmodel` naive-chain expectation dropped from the assert | **SURVIVED** | same relaxation class: the remaining conjuncts still pass, and the PASS banner still (falsely) implies the naive chain was pinned. |

## What the campaign changed

M16 is the record's headline. A mutant that breaks the right-1 renormalize's
sticky fold (`S' = S | old R` degraded to `S' = S`) survived the entire
directed library on its first run and died only under random stimulus — a
mutant that survives your stimulus is not an equivalent mutant, it is a gap in
your stimulus (chapter 4's lesson, recurring). The gap was closed by adding
the directed pair `3FFFFFFF + 3E800009 → 40100001` to `tb_corners.v` (d = 2
puts a live bit in R, the add carries out, and the folded sticky is the only
witness that the result is past the tie), after a python search over simple
d = 2 carry-out pairs found sixteen killers and this was the smallest-looking.
M16 is now killed by the directed set; the vector carries a comment naming
this origin.

T3b's survival is the campaign's second finding: the corner library reaches
the rounding-carry renormalize through **four** distinct pairs (add-side
in-range `3FFFFFFF+33800000`, subtract-side-with-borrow `4B800000+B3800000`,
overflow-side `7F7FFFFF+73000000`, and the alignment-saturation boundary
`4B000000+BDFFFFFF` added during the chapter 8 review), so deleting two of
them left the coverage gate honestly satisfied. The gate proves the path ran, not that any
particular vector ran — which is exactly what a coverage bin is for.

## Known blind spots

Recorded for chapters 9 and 12, which grow this module into RTL:

- **The deleted-check survivor class (T6, T7) applies to every testbench
  here.** The count guards pin how many checks ran, not their strength.
- **`tb_random`'s reference cannot check flags.** The shortreal path yields
  result bits only; invalid/overflow/inexact are checked exclusively by the
  directed library's python-computed expectations. A flag bug reachable only
  outside the directed vectors would slip through this chapter's harness.
- **The NaN payload-propagation choice (first-NaN-operand, quieted) is this
  module's own contract**, checked against itself. IEEE 754-2019 makes
  propagation a *should*; a chapter 9 implementation that returns a canonical
  qNaN instead would fail `tb_corners`' payload checks and would need those
  rows re-specified, not "fixed".
- **`fp32_add_alg` is combinational and single-add.** Nothing here verifies
  chained operation, registered timing, or reuse of the datapath across
  cycles — chapter 9's testbenches must re-establish all of that; the chain
  discipline they will need is pinned in `tb_refmodel.v`.
