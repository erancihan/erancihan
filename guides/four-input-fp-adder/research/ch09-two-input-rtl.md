# Chapter 9 research — Building the 2-input FP adder in Verilog, module by module

<!-- sections complete: 12/12 -->

Research notes for the first RTL chapter: decomposing chapter 8's
`fp32_add_alg.v` (one combinational module, ten named steps, proven against
exact arithmetic on 1,004,425 pairs) into separately verifiable modules wired
into a top-level 2-input adder. Everything below was built and measured in the
session scratchpad against Icarus Verilog 13.0 (`iverilog -g2012 -Wall`,
`vvp`), python3 3.11. Claims carry captured output; where a statement is
documentation rather than measurement, it says so in place.

## 1. Method and artifacts

Everything was prototyped in the session scratchpad (`ch09/` subdirectory);
nothing was written into `guide/` except this file. The prototype set:

- `fp32_add2_mods.v` — the decomposed adder: seven modules plus the top
  (`fp32_unpack`, `fp32_screen`, `fp32_swap`, `fp32_align`, `fp32_addsub`,
  `fp32_normalize`, `fp32_round_pack`, `fp32_add2`), compiling with **zero
  iverilog output** at `-g2012 -Wall` together with the three inherited
  deliverables it instantiates: ch07's `fp32_fields.v` and `fp32_class.v`,
  ch02's `align_sticky.v`.
- `tb_equiv.v` — the central verification move: golden `fp32_add_alg` and the
  split `fp32_add2` instantiated side by side, same operands, compared with
  `!==` on `{result, invalid, overflow, inexact}` — 36 bits, bit-exact, NaN
  sign included (both sides are deterministic RTL computing the same
  function, so full equality is the correct standard here, unlike against a
  simulator-generated NaN).
- Unit testbenches `tb_align_u.v`, `tb_addsub_u.v`, `tb_normround_u.v` plus a
  mutation campaign against each (section 6).
- A ported corner library `tb_corners_split.v` re-aiming ch08's hierarchical
  coverage bins into the submodules (section 10).
- ~20 small probe files for the boundary-hygiene, latch, X-propagation and
  multi-driver measurements.

Compile command throughout: `iverilog -g2012 -Wall` (zero-output rule for
run targets), simulate with `vvp`. Elaboration-only compile of the whole
split design (`-t null`): **0.014 s** — elaboration cost is a non-issue and
says nothing about synthesis (section 11).

Experiment count for this file: **13 numbered experiments** (several with
multiple probes), **41 compiled-and-run Verilog files** in the scratchpad,
one python3 exhaustive ordering proof, and well over 2 million operand-pair
evaluations across all the sweeps (the headline result is the
200,092-check bit-identity of section 4; every other sweep is 100k–200k).

## 2. The decomposition: what the golden algorithm's structure dictates

`fp32_add_alg.v` already names its step blocks, and the split falls out of
them almost mechanically. The one design decision that is NOT mechanical is
where to put the boundaries relative to chapter 11's pipeline cuts, and the
notes below justify each choice.

**The split that was built and proven** (golden step numbers in brackets):

| Module | Golden steps | Owns | Instantiates |
|---|---|---|---|
| `fp32_unpack` | 1 | field decode ×2, effective exponent, hidden bit | `fp32_fields` ×2 (ch07) |
| `fp32_screen` | 2 | special-case result + `invalid` | `fp32_class` ×2 (ch07) |
| `fp32_swap` | 3 | magnitude compare, operand ordering, `eff_sub` | — |
| `fp32_align` | 4 | exponent difference, 5-bit clamp at 26, G/R/S capture | `align_sticky #(W=24,SHW=5)` (ch02) |
| `fp32_addsub` | 5 | 27-bit add/sub, sticky borrow, `exact_zero` | — |
| `fp32_normalize` | 6–7 | right-1 / none / left-N, LZC, subnormal stop | — |
| `fp32_round_pack` | 8–9 | RNE decision, rounding-carry renormalize, pack, `ovf` | — |
| `fp32_add2` (top) | 10 | screen mux, flag gating — *wiring plus three assigns, nothing else* | all of the above |

Decisions, with reasons a chapter can defend:

- **Screen is a sibling of the datapath, not a stage of it.** It takes the
  raw operands and produces `screen`/`screen_res`/`invalid` independently;
  the top's final mux (`result = screen ? screen_res : dp_res`) is golden
  step 10 verbatim. This mirrors the golden module's control/arithmetic
  split and gives chapter 11 a screen path that can be pipelined as a thin
  side channel.
- **Unpack and screen both take the packed words.** They decode
  independently (fields vs classes); neither depends on the other. The ch07
  deliverables are instantiated, not re-derived — the classifier's one-hot
  contract supplies `is_snan`/`is_inf` for `invalid` exactly as designed.
- **The swap module takes BOTH the packed words and the unpacked fields.**
  The golden compare runs on packed magnitudes `b[30:0] > a[30:0]`; the
  cleanest-looking interface (unpacked fields only) needs the compare
  rewritten as `{eb, sigb} > {ea, siga}`. **Both were built and both are
  bit-identical to the golden module over the full sweep** (section 4 ran
  the packed variant; the `{e,sig}` variant separately passed the identical
  92-corner + 200,000-random sweep, PASS line captured). The equivalence is
  also provable: python3 checked that the map
  `{E,F} → {max(E,1), |E, F}` is strictly monotone over all 2048 (E,F)
  pairs at a 3-bit fraction (`strictly monotone over all 2048 (E,F): True`),
  and the fraction width does not affect the argument since F enters both
  keys identically. The chapter should ship the packed compare (it matches
  the golden text line-for-line and needs no lemma) and can mention the
  variant as a measured aside.
- **Align and addsub are separate modules even though chapter 11 will
  probably register them as one stage.** Two reasons, one of them measured:
  (a) the align wrapper is where the 8-bit exponent difference is clamped
  into the 5-bit shift count — ch02's full-width-localparam lesson — and it
  deserves its own unit tests; (b) the module boundary between them is where
  the G/R bit-packing convention (`sml27 = {1'b0, aligned, g, r}`) lives,
  and section 7 measures exactly this convention being violated with both
  unit suites green. A boundary that can host that bug should be a named,
  documented boundary.
- **Sticky passes AROUND addsub, not through the adder bits.** `s` enters
  `fp32_addsub` only to feed the borrow (`- {26'd0, s}` on effective
  subtract) and continues to `fp32_normalize` as `s_in` unchanged. The
  invariant (ch08): on an effective subtract with sticky set, the truncated
  difference is one too big and still inexact, so sticky both borrows and
  survives.
- **The LZC stays inside `fp32_normalize`** as the same `lzc26` function.
  Making it a module is defensible for reuse but adds nothing to a 2-input
  adder; the chapter can flag it as the piece a wider datapath would
  extract.
- **The top level owns exactly three assigns** (screen mux, `overflow`
  gating, `inexact` gating) — the ideal shape for the chapter's "a top
  module is wiring" discipline. `invalid` is a pass-through from the screen.

## 3. Port contracts, invariants, and the 28-bit budget at each boundary

Full port lists as built (all `wire`, all unsigned — deliberately; section 5
measures why signed ports are a trap here). Widths trace to ch08's proved
28-bit budget: 24-bit significand + G + R + carry = the 27-bit adder, with
the 1-bit sticky alongside.

**`fp32_unpack`** — in `a[31:0]`, `b[31:0]`; out `sa`, `sb`, `ea[7:0]`,
`eb[7:0]` (effective exponents, `max(E,1)`), `siga[23:0]`, `sigb[23:0]`
(`{hidden, F}`). Invariant: every finite operand is now
`(-1)^s · sig · 2^(e-127-23)` with no subnormal special case anywhere
downstream.

**`fp32_screen`** — in `a`, `b`; out `screen`, `screen_res[31:0]`,
`invalid`. Invariant: `screen` is high iff any operand is NaN/inf/zero, and
when it is high `screen_res` is the final result — the datapath's output is
garbage-but-ignored on those patterns (this "don't care under screen" is
load-bearing for the X-propagation story, section 9).

**`fp32_swap`** — in packed + unpacked operands; out `sign_big`,
`e_big[7:0]`, `e_sml[7:0]`, `sig_big[23:0]`, `sig_sml[23:0]`, `eff_sub`.
Invariant: `{e_big, sig_big}` is the larger magnitude, so the alignment
shift is always rightward, the subtract never borrows past the top, and the
result sign is `sign_big` — the swap is what makes every downstream width
unsigned-safe.

**`fp32_align`** — in `e_big`, `e_sml`, `sig_sml[23:0]`; out
`aligned[23:0]`, `g`, `r`, `s`. Internals: `d[7:0] = e_big - e_sml`
(0..253, never negative — the swap invariant), clamp
`shamt = d > 26 ? 26 : d[4:0]`, then ch02's `align_sticky` verbatim.
Invariant: `{aligned,g,r}` plus the sticky bit is the small operand exactly,
in round-bit units — nothing lost, only summarized.

**`fp32_addsub`** — in `eff_sub`, `sig_big[23:0]`, `aligned[23:0]`, `g`,
`r`, `s`; out `sum27[26:0]`, `exact_zero`. The 27-bit adder IS the budget:
`big27 = {1'b0, sig_big, 2'b00}`, `sml27 = {1'b0, aligned, g, r}`, sticky
enters only as the borrow. Invariant out: `exact_zero` implies G, R, S all
zero (ch08's proof: sticky needs d ≥ 3, and then the aligned operand is
under a quarter of the big one, so the difference cannot be zero).

**`fp32_normalize`** — in `eff_sub`, `sum27[26:0]`, `s_in`, `e_big[7:0]`;
out `nsig[23:0]`, `ng`, `nr`, `ns`, `e_norm[8:0]`. **The 9-bit exponent is
the one width in the design that grows across a boundary**: `e_big + 1` on
right-1 can reach 255 and must stay distinguishable from overflow arithmetic
later, so `e_norm` carries a 9th bit. Section 5 measures what happens when a
reader wires it to an 8-bit net. Invariant: either `nsig[23]` is set or
`e_norm == 1` (the subnormal stop) — the still-unnormalized case is exactly
the gradual-underflow encoding.

**`fp32_round_pack`** — in `sign`, `exact_zero`, `nsig[23:0]`, `ng`, `nr`,
`ns`, `e_norm[8:0]`; out `dp_res[31:0]`, `ovf`, `inexact_dp`. Owns the
second renormalize (`rsig[24]`) — the path random never reaches
(section 10).

**Chapter 11 cut-point budgets.** What the pipeline chapter will register is
the set of wires crossing each boundary; counting them now tells it what a
stage register costs (screen side channel — `screen` + `screen_res[31:0]` +
`invalid` = 34 bits — included in every cut since it must travel with the
data):

| Cut (after) | Datapath wires crossing | Bits | + screen side | Total |
|---|---|---|---|---|
| unpack/screen/swap | `sign_big`,`e_big`,`e_sml`,`sig_big`,`sig_sml`,`eff_sub` | 1+8+8+24+24+1 = 66 | 34 | **100** |
| align | `sign_big`,`e_big`,`eff_sub`,`sig_big`,`aligned`,`g`,`r`,`s` | 1+8+1+24+24+3 = 61 | 34 | **95** |
| addsub | `sign_big`,`e_big`,`eff_sub`,`sum27`,`s_al`,`exact_zero` | 1+8+1+27+1+1 = 39 | 34 | **73** |
| normalize | `sign_big`,`exact_zero`,`nsig`,`ng`,`nr`,`ns`,`e_norm` | 1+1+24+3+9 = 38 | 34 | **72** |

(Simple sums, hand-checked twice; they are counts of the built design's
ports, not estimates.) Two observations for chapter 11: the widest cut is
the first one (both significands still alive, 100 bits), and the cheapest
cuts are after addsub/normalize — which is also where the deepest logic
(27-bit subtract; LZC + left shift) ends, a happy coincidence the pipeline
chapter can use. `e_sml` dies at the align boundary and `sig_sml` dies with
it; `eff_sub` dies after normalize; `e_big` dies after normalize (folded
into `e_norm`).

## 4. The equivalence sweep: the split adder is bit-identical to fp32_add_alg

**Experiment 1 — the chapter's central verification move.** `tb_equiv.v`
instantiates both adders on the same operands and compares
`{result, invalid, overflow, inexact}` with `!==` (36 bits, X-safe). Stimulus
is (a) ch08's full 46-pair corner library, both orders — 92 checks, guarded
by a literal-count check (`total !== 92 → $fatal`) so a truncated vector
list cannot pass vacuously — then (b) ch08's five-regime random generator
(uniform bits with specials, |Δexp| ≤ 1, |Δexp| ≤ 30, subnormal-heavy,
near-overflow) at 40,000 pairs per regime, seeded once per the ch05 rule
with the first draw discarded, seed echoed. Captured:

```
SEED=9090
PASS tb_equiv (92 corner checks + 200000 random, split == golden bit-for-bit incl. flags)
real    0m41.914s
```

**200,092 checks, zero mismatches, result bits AND all three flags.** Note
the standard: full bit equality *including NaN sign*, which is correct
RTL-vs-RTL — both sides are deterministic logic computing the same NaN
propagation rule — and exactly what is *forbidden* against a
simulator-generated NaN (ch07). The chapter should make that contrast
explicit; it is the cleanest illustration of why the golden-equivalence
reference is cheaper than the value-domain one.

**The harness can fail (mandatory self-check).** Mutating the split's
addsub to drop the sticky borrow (`big27 - sml27 - {26'd0, s}` →
`big27 - sml27`) produced first kills *inside the corner phase*:

```
FAIL tb_equiv 3f800001+b3800001: split 3f800001/001 golden 3f800000/001
FAIL tb_equiv 40000000+b3800001: split 40000000/001 golden 3fffffff/001
FAIL tb_equiv 463d648c+c0d5cd81: split 463d49d3/001 golden 463d49d2/001
```

(abridged: the reversed-order duplicates of the two corner kills are elided
between these lines; the third line shown is the first random-phase kill.
The corner library catches the mutant first, on the group-X shortcut
counterexamples, which is what those vectors exist for.)

**Timing note for the writer.** 200k pairs with BOTH adders elaborated and a
`#1` per vector took 41.9 s wall — this container is slower than the ch08
arm64 numbers, and two DUTs double the event load. A shipped `tb_equiv` at
200k pushes against the harness's default 60 s `SIM_TIMEOUT`; the corner
phase carries the rare paths anyway, so the shipped testbench should use a
smaller random count (100k measured comfortably inside the limit — section
8's timing table) and the chapter can quote this session's 200k run in
prose.

## 5. Interface hygiene at module boundaries, measured

**Experiment 2 — the port-width warning at this design's own boundaries is
ungated, and it is the only witness for two very different outcomes.**
Wiring the 9-bit `e_norm` output to an 8-bit top-level net produces, with
and without `-Wall`, byte-identical output and exit 0 (ch02's "ungated"
claim confirmed at a boundary this design actually has):

```
probe_width.v:9: warning: Port 9 (e_norm) of module fp32_normalize expects 9 bit(s), given 8.
probe_width.v:9:        : Padding 1 high bits of the port.
```

(Note Icarus says "Padding" even when the connection *truncates* an output —
the message describes the port-expression coercion, not the data direction.
Quote it as-is; do not paraphrase it into sense.)

Then the two outcomes, both swept through the full 200k equivalence harness:

- **Narrowing `e_norm` to `[7:0]` in the top: two warnings, sweep PASSES**
  (200,092/200,092). The truncation is value-preserving because `e_norm`
  never exceeds 255 (`e_big ≤ 254` plus at most one right-1 increment); the
  ninth bit exists for the `+ round_renorm` headroom *inside*
  `fp32_round_pack`, where `e_rnd` can reach 256, not for the crossing. A
  warning that is not (yet) a bug.
- **Narrowing `sum27` to `[25:0]`: the SAME warning class, catastrophic.**
  The carry bit is dropped and the sweep fails immediately:
  `4b7fffff+3f800000: split 00000000/000 golden 4b800000/000` — 16,777,215
  + 1 comes out zero, flags wrong too.

The teaching point writes itself: the diagnostic text cannot tell the benign
narrowing from the killer, so the only sane policy is the harness's
existing rule — a `run` target with ANY compile output fails. That rule was
adopted for ch06 reasons; this measures why it earns its keep in an RTL
chapter.

**Experiment 3 — the misspelled 1-bit net, three ways.** `.s_in(s_al)`
typo'd to `.s_in(s_a1)` in the top (a one-bit port, so the width warning
can never fire):

| Configuration | Compile result |
|---|---|
| no `-Wall`, default nettype `wire` | **total silence, exit 0** |
| `-Wall`, default nettype `wire` | `warning: implicit definition of wire 's_a1'.`, exit 0 |
| `` `default_nettype none `` | `error: Unable to bind wire/reg/memory 's_a1' in 'fp32_add2'` + `Failed to elaborate input port 's_in' expression (s_a1) in instance fp32_add2.u_norm`, **exit 2** |

This confirms ch02's finding that the `implicit` warning class is
`-Wall`-gated, and answers the chapter's `` `default_nettype none ``
question with a measurement: at these interfaces it converts the one
silent-without-flags wiring bug into an elaboration error that names the
instance and port. Every module in the prototype carries the directive; the
whole build stays zero-output.

**What the typo does at runtime — and the one-character testbench trap.**
The undriven implicit wire reads `z`; through the normalize logic it becomes
`x` in `ns`, `round_up`, and the flags. The `!==` equivalence sweep fails on
corner vector 6: `3fc00000+bfc00000: split 00000000/00x golden 00000000/000`.
The same testbench with `!=` instead of `!==` — one character —
**printed PASS across all 200,092 checks against the broken design**
(captured both ways). `X != X` evaluates to `x`, the `if` does not take, and
every mismatch this bug can produce is X-contaminated, so the weak
comparison misses all of them. The chapter's testbenches must use `!==`
everywhere, and this is the measured reason.

**Experiment 4 — signedness at a boundary, eight known-answer probes.** The
shipped design is all-unsigned by construction (swap-first makes every
difference non-negative — that is *why* production adders swap first). The
probes measure what happens to the reader who instead builds the
software-natural signed-exponent-difference front end. All eight compile
**with zero diagnostics at `-g2012 -Wall`** — every one of these traps is
compile-time silent. Captured verbatim:

```
A bits: sd_signed=110011100 sd_plain=110011100 (same bits: 1)
B interp: sd_signed=-100  sd_plain=412
C  (sd_signed < 0) = 1   correct
D  (sd_plain  < 0) = 0   parent dropped 'signed': never true
E  (sd_signed[8:0] < 0) = 0   full-width part-select kills signedness
F  (sd_signed < lz) = 0   one unsigned operand poisons the compare
G  (sd_signed < $signed({4'b0,lz})) = 1  both signed: correct
H  $signed(ea)-$signed(eb) at ea=200 eb=100: -156 (true diff +100)
```

The boundary-specific findings, in chapter order of importance:

1. **Signedness does not travel through a port** (A, B, D). The submodule
   declares `output signed [8:0] sd`; a parent that redeclares the receiving
   net as plain `wire [8:0]` gets the same *bits* (`===` confirms) but
   `sd < 0` is unsigned there and never true. Each end of a connection
   interprets independently; the port copies bits only.
2. **The ch06 part-select trap bites at exactly this boundary** (E): even
   with the parent net correctly `signed`, writing `sd[8:0] < 0` — a
   full-width part-select, visually a no-op — is unsigned and kills the
   comparison.
3. **One unsigned operand poisons the whole comparison** (F vs G): the
   5-bit unsigned LZC count in `sd < lz` drags the signed side to unsigned;
   −100 compares as 412. The fix is to widen-and-`$signed` the unsigned
   side.
4. **`$signed()` on a raw exponent field misreads half the format** (H):
   `$signed(ea)` reinterprets E ≥ 128 — every operand with magnitude ≥ 2 —
   as negative; the measured difference for E=200,100 is −156 instead of
   +100. The correct form is `$signed({1'b0, ea}) - $signed({1'b0, eb})`,
   or the design's actual choice: subtract only after the swap guarantees
   the sign, and stay unsigned everywhere.

The chapter's recommendation, backed by these measurements: **an all-unsigned
datapath is not a style preference in this design; it is the removal of four
silent bug classes at once.** The swap-first structure is what buys it.

## 6. Per-module verification: three testbenches, mutation-tested

**Experiment 5.** Three unit testbenches were written against the module
contracts (all expected values computed by an independent python3 model
first, then pasted as constants — never read off the DUT):

- `tb_align_u` — 9 directed vectors on `fp32_align`: shifts d = 0,1,2,3
  (G/R/S fill in sequence), d = 25 (the leading bit parks in R — ch08's
  clamp-boundary lesson), d = 26/27/200 (saturation), and a
  sticky-from-bit-0-only pattern. `PASS tb_align_u (9 directed)`.
- `tb_addsub_u` — 6 directed vectors on `fp32_addsub`: plain add, carry-out
  at max operands, subtract with G live, the sticky borrow
  (`0FFFFFC`, one less than the truncated difference), exact zero, and
  zero-operand ADD (`exact_zero` must stay 0 — see B-M2 below).
  `PASS tb_addsub_u (6 directed)`.
- `tb_normround_u` — 7 normalize + 9 round_pack vectors: right-1 with the
  old-LSB sticky fold isolated (`s_in = 0`, `sum27[0] = 1`), right-1 into
  the overflow exponent range, no-shift, left-8, the subnormal stop
  (lz = 8 but e_big = 5 → shift stops at 4, `e_norm = 1`), left-1 with
  sticky alive; then exact/up/tie-up/tie-down, **the rounding-carry
  renormalize** (`nsig = FFFFFF, G&R → E4800000`), renormalize INTO
  overflow, exact-sum overflow (`inexact` must still fire), subnormal pack,
  and `exact_zero` priority. `PASS tb_normround_u (7 normalize + 9
  round_pack directed)`.

Every check task counts checks and the initial block `$fatal`s on a wrong
literal count — the ch05 vacuous-pass guard, kept.

**The mutation campaign: 17 mutants, 15 killed, 2 survivors, both survivals
explained and *measured* as equivalences** (full transcript captured; one
line per mutant):

| Mutant | Change | Unit result |
|---|---|---|
| A-M1 | clamp threshold 26 → 24 | KILLED (d=25: S gets bits that belong in R) |
| A-M2 | clamp deleted (`d[4:0]` raw) | KILLED (d=200 wraps to shift 8: `got 00c90f/111`) |
| A-M3 | `d = e_sml - e_big` | KILLED (d=1 vector) |
| A-M4 | `.guard`/`.round` connections swapped | KILLED (d=1: `6487ed/010` vs `/100`) |
| A-M5 | clamp value 26 → 27 | **SURVIVED** — see section 7 |
| B-M1 | sticky borrow dropped | KILLED (borrow vector: `0fffffd` vs `0fffffc`) |
| B-M2 | `exact_zero` loses the `eff_sub` gate | KILLED (zero-ADD vector) — **but see section 7** |
| B-M3 | small operand packed `{aligned, r, g}` | KILLED (G-live subtract) |
| B-M4 | big operand packed `{2'b00, sig_big, 1'b0}` | KILLED (plain add) |
| N-M1 | right-1 sticky fold dropped (`ns = s_in`) | KILLED (the isolated-fold vector) |
| N-M2 | subnormal stop dropped (`shl = lz`) | KILLED (`e_norm` 509 vs 1 — exponent underflowed past zero) |
| N-M3 | LZC scan starts at bit 24 | KILLED (no-shift vector normalizes twice) |
| N-M4 | `right1 = carry` (eff_sub ignored) | **SURVIVED** — see section 7 |
| R-M1 | `round_up = ng & (nr\|ns)` (lbit dropped) | KILLED (tie-lbit=1 vector rounds down) |
| R-M2 | rounding-carry renormalize deleted | KILLED (`80000000` — sign with all-zero significand) |
| R-M3 | overflow threshold 254 → 255 | KILLED (flag-only kill: `ovf` 0 vs 1, result bits identical) |
| R-M4 | `inexact` loses the `ovf` term | KILLED (exact-sum overflow vector, flag-only) |

Notes the chapter can use directly:

- **Two kills are flag-only on their killing vectors** (R-M3:
  `got 7f800000/0/1 want 7f800000/1/1` — the rounded-up significand is
  2^23 there, so packing `e_rnd[7:0] = 255` with a zero fraction happens to
  encode infinity anyway and only `ovf` differs; R-M4's kill likewise
  differs only in `inexact`). A unit testbench that checked result bits only
  would have passed both vectors. R-M3 is *not* result-equivalent in
  general — probed separately with `nsig = C00000` exact at `e_norm = 255`,
  it packs **`7fc00000`, a fabricated qNaN**, with both flags low
  (measured). Flags are ports; test them like ports.
- **The unit kills are one-vector kills.** Every killed mutant died on a
  directed vector chosen from the module's contract, with the offending
  field named in the failure message. Compare ch08, where the equivalent of
  N-M1 (the R-fold mutant M16) survived the whole first-draft *end-to-end*
  directed library and needed random stimulus: at module level the same bug
  class is one deliberate vector. That asymmetry is the chapter's core
  argument for unit testbenches.
- **The rounding-carry renormalize is trivially reachable at module level**
  (`nsig = 24'hFFFFFF, ng = 1, nr = 1` — you just write it down), while
  end-to-end it fired 0 times in 10⁶ random pairs (ch08). Unit testing
  turns the hardest coverage problem in the design into a one-liner.
  Section 10 has the composed-design gate.

## 7. Module-level vs end-to-end visibility: masking in both directions

**Experiment 6.** The interesting mutants from section 6 were re-run through
the full 200,092-check equivalence sweep, and one deliberate two-author
scenario was constructed. Results, all captured:

**(a) A unit-killed bug the end-to-end sweep can NEVER see.** B-M2
(`exact_zero = (sum27 == 27'd0)` without the `eff_sub` gate) is killed by
`tb_addsub_u` in one vector — and **passes the entire 200k end-to-end
equivalence sweep** (`PASS tb_equiv ... bit-for-bit incl. flags`). The mask
is structural: `eff_sub = 0` with `sum27 = 0` requires both significands
zero, which only zero operands produce, and zero operands are screened
before the datapath's result can matter. So the composed design is provably
immune *today* — and the module is still wrong against its own contract. The
chapter should present this as the definition of a **latent interface bug**:
invisible to any black-box campaign of any size, one refactor away from
live. (Chapter 10 reuses these modules in a wider datapath; that is exactly
when such latencies surface.)

**(b) Two survivors that are genuine equivalences, each teaching a
different lesson.**

- A-M5 (align clamp 26 → 27) survives the unit testbench AND the 200k
  sweep. It is output-equivalent because ch02's `align_sticky` saturates
  internally at W+2 = 26 — the wrapper's clamp and the core's saturation
  overlap by one. The lesson: **the wrapper thinks it owns an invariant
  (`shamt ≤ 26`) that only an internal assertion could pin**; a mutant
  that violates the spec without violating any output is a spec-vs-output
  gap, and the honest fixes are either an elaboration-time/simulation
  assertion or a comment stating which module's clamp is load-bearing.
- N-M4 (`right1 = carry`, ignoring `eff_sub`) survives both because on an
  effective subtract the 27-bit difference can never set bit 26 (ch08's
  invariant). The unit testbench *deliberately* does not drive
  `eff_sub = 1` with `sum27[26] = 1`: that input violates the upstream
  invariant, and a contract has no expected output there. **A unit
  testbench that drives the full input cross would have to invent expected
  values for impossible inputs — and would then fail correct
  implementations.** Unit tests test the contract, not the type signature.

**(c) Both unit suites green, integration red — the convention bug.**
Constructed: an `fp32_addsub` whose author believes the port named `g`
carries the *second* bit shifted out and `r` the first, so the module packs
`sml27 = {1'b0, aligned, r, g}` — and that author's own unit testbench,
which drives and expects values under the same reading. Measured:

```
PASS tb_addsub_wrong (6 directed, author convention)   <- addsub author's TB
PASS tb_align_u (9 directed)                           <- align author's TB
FAIL tb_equiv 3f800000+33800001: split 3f800000/001 golden 3f800001/001
FAIL tb_equiv 3f800000+bf7fffff: split 33c00000/000 golden 33800000/000
```

Both unit suites pass — each is self-consistent — and the composition is
wrong wherever G ≠ R matters (first corner kill: the deep-sticky group-E
vector). This is the measured answer to "why keep the equivalence sweep if
every module has a unit testbench": **unit tests verify each author's
reading of the interface; only an integration reference verifies that the
readings agree.** Naming conventions in the port list (`g` = "first bit
shifted out", in the source, at both ends) is cheap insurance; the sweep is
the enforcement.

Summary table for the chapter:

| Bug | Unit TB | 200k end-to-end | Verdict |
|---|---|---|---|
| B-M2 (`exact_zero` gate) | kills | passes | latent — only unit-visible |
| A-M5 (clamp 27) | survives | passes | equivalent; spec/output gap |
| N-M4 (`right1 = carry`) | survives | passes | equivalent under invariant |
| B-M3-as-convention (both authors consistent) | passes ×2 | kills | only integration-visible |
| N-M1 / ch08's M16 class (R-fold) | kills in 1 vector | ch08: survived directed, needed random | unit-cheap, e2e-expensive |

## 8. The reference-model strategy: golden equivalence vs shortreal one-add

**Experiment 7.** Chapter 9 has two references available and they are not
interchangeable; both were run and their blind spots measured.

**The shortreal one-add on the split adder** (`tb_short`, ch08's licensed
form: `$bitstoshortreal` each operand, ONE `+`, one `$shortrealtobits`;
NaN-vs-NaN compared by class): **100,000 five-regime pairs, zero
mismatches, 10.9 s.** The exclusions reconfirmed at the *top* level of the
new design, captured:

```
  sNaN+1.0: dut=7fe00055 inv=1 (payload kept, quieted; sign not asserted)
  sNaN+1.0 via shortreal ref = 7fe00055 (host quiets; class NaN)
  sNaN pure round-trip = 7fe00000 (expect 7fe00000: quieted with NO arithmetic)
```

The sNaN vector is constructed from bits (`32'h7FA00055`), never sent
through the value domain — the pure round-trip line re-measures ch07's
quieting on this host. On this container the host FPU happened to return
the same quieted payload with the same sign as the DUT, but the testbench
must not be tightened to that: NaN sign remains never-comparable (ch05
measured the two hosts of this project disagreeing).

**The measured division of labor:**

| Property | Golden equivalence (`tb_equiv`) | shortreal one-add (`tb_short`) |
|---|---|---|
| result bits | bit-exact, NaN sign included | exact except NaN-vs-NaN (class only) |
| `invalid`/`overflow`/`inexact` | **checked, bit-exact** | **unverifiable — the reference has no flags** |
| NaN payload propagation | checked | not checked (class compare) |
| independent of ch08's correctness | **no — inherits any golden bug** | yes |
| speed (this container) | 100k in 19.9 s (two DUTs) | 100k in 10.9 s |

**Common-mode blindness, measured (the table's fourth row made concrete).**
The same bug — RNE's `lbit` term dropped, turning ties-to-even into
ties-down — was planted in BOTH `fp32_add_alg.v` and the split. Captured:

```
PASS tb_equiv (92 corner checks + 200000 random, split == golden bit-for-bit incl. flags)
FAIL tb_short 196ad232+98baf931: dut 190d5599 ref 190d559a
...
FATAL: FAIL tb_short: 6890 mismatches
```

**The equivalence sweep certified a wrong adder across 200,092 checks; the
shortreal reference killed it 6,890 times in 100,000 pairs (6.9 %).** An
equivalence check proves "same as chapter 8", not "correct" — chapter 8's
own million-pair exact-arithmetic campaign is what grounds the chain, and
the chapter must say the two testbenches discharge different obligations:
`tb_equiv` proves the *refactoring* preserved the function (including
flags and NaN details the shortreal path cannot see); `tb_short` re-proves
the *function* against an independent oracle (value domain only). Ship
both. The corner library rides with `tb_equiv` (it carries expected values
from the exact python model, so it is independent of both).

**Timing guidance for the shipped chapter** (all measured this session, this
container): `tb_equiv` 200k = 41.9 s (tight against the 60 s harness
timeout), 100k = 19.9 s; `tb_short` 100k = 10.9 s. Recommendation: ship
`tb_equiv` at 100k and `tb_short` at 100k; quote the 200k session run in
prose.

## 9. Combinational discipline in this design, measured

The prototype is 100 % continuous assignments plus two `function`s — no
`always` blocks at all — and the experiments below are why the chapter
should present that as a deliberate choice for this datapath, not a
stylistic accident. (ch03's `always @(*)`-does-not-self-start trap is also
structurally impossible in an all-`assign` design; not re-measured here.)

**Experiment 8 — the latch in this design's own shape, and it is worse than
ch03 said.** `fp32_normalize` was rewritten procedurally (`always @*`, `reg`
outputs, if/else-if) with the realistic missing arm: no branch for
`frame == 0`, on the reasoning "exact_zero handles that downstream".
Measured:

- **Icarus reports nothing.** `-g2012 -Wall`, exit 0, zero output — ch03's
  eight-of-nine finding confirmed at this design's exact shape.
- **Module level, the latch is visible as history dependence:** the same
  input (`frame = 0`) produced `nsig=800000 grs=000 e=92` after one
  predecessor and `nsig=ffffff grs=101 e=99` after another (captured
  four-step trace).
- **End-to-end, it fails only 4 of 100,092 equivalence checks — all
  flag-only, all exact-cancellation corners, 0 kills in 100,000 random
  pairs:** `3fc00000+bfc00000: split 00000000/001 golden 00000000/000`.
  The result bits are rescued by the `exact_zero` mux; only `inexact`
  betrays the latch. A results-only testbench passes; a flags-blind
  regression certifies a latch.
- **The latched value is a delta-cycle GLITCH, not the previous vector's
  settled state.** Instrumented trace: every settled evaluation before the
  failing cancel had `grs=000`, yet the latch held `grs=110` — a snapshot
  of the cascade mid-settle (`framel[1:0]` momentarily `11` while
  `sum27`/`shl` were still propagating). And reversing the order of the
  two blocking assignments in the driver task (`b` before `a`) latched a
  *different* state (`grs=000, e_norm=125`) — whose `inexact` happens to
  be correct, so **that stimulus ordering hides the bug entirely**:

```
settled prev : grs=000 e_norm=128
settled mid  : grs=000 e_norm=127  (a=1.5, b=-0)
after cancel : grs=110 e_norm=127  <- latched  (corresponds to NO settled input)
b-first mid  : grs=000 e_norm=128  (a=-3.0, b=-1.5)
b-first final: grs=000 e_norm=125  <- latched (different!)
```

  A latch turns a combinational vector list into a *sequence*, and
  PASS/FAIL can hinge on the order of two blocking assignments inside the
  testbench's driver task. That is strictly nastier than the ch03 story
  and is measured in this design.

**Experiment 9 — `@*` and functions: two silent sensitivity holes.** The
design's `lzc26` takes its operand as an argument. The probes show why that
is a rule, not a preference:

- A function reading a module-level variable with only a *constant*
  argument: Icarus emits `warning: @* found no sensitivities so it will
  never trigger.` and the block never runs — output stays `x` forever.
  (One of the few warnings Icarus gives; it is the ch02-measured ungated
  class.)
- The realistic variant — a function with one live argument that *also*
  reads a global (`clamp(lz)` reading `e_lim`): **zero diagnostics**, and
  the output goes stale when only the global changes, then silently
  catches up on the next argument change (captured: `shl=4 (want 2)` at
  t2, correct again at t3). Icarus's `@*` does not see through function
  bodies to non-argument reads. Rule for the chapter: **everything a
  datapath function reads arrives as an argument.**
- This is not an Icarus bug: the `@*`/`always_comb` split is exactly the
  language's own line — "always_comb is sensitive to changes within the
  contents of a function, whereas always @* is only sensitive to changes
  to the arguments of a function" (fetch-verified: Jason Yu, verilogpro.com;
  normative source IEEE 1800 §9.2.2.2, [title-only]). And measured here:
  **Icarus 13.0's `always_comb` really implements the stronger rule** —
  the identical stale-global probe with `always_comb` in place of
  `always @*` re-evaluates on the global's change (`t2: shl=2 (want 2)`,
  correct where `@*` was stale). See section 12: this sharpens ch03's
  "documentation value without enforcement" verdict on `always_comb`.

**Experiment 10 — multi-driver at composition is compile-time silent and
94 %+ run-time invisible.** A plausible integration accident — the screen
mux plus a leftover bring-up assign (`assign result = dp_res;`) driving the
same net — compiles with **zero diagnostics** at `-Wall` (ch03's table
said Icarus reports nothing for multi-driven nets; confirmed here at the
top-level composition). At run time the two drivers agree on every
unscreened vector, so the conflict surfaces only where `screen_res ≠
dp_res`: **168 of 100,092 equivalence checks failed (0.17 %), every one a
screened vector, every one partially-X** (`7fc00055+3f800000: split
7fX000XX` — per-bit wire resolution: bits where the drivers agree stay
defined). The weak-`!=` testbench variant **passes this design at
100,092/100,092** (measured), because every real mismatch is
X-contaminated — the second measured false-pass for `!=`, after section
5's. Verilator's MULTIDRIVEN check (ch03) is the static answer;
`!==`-comparison against the golden module is the dynamic one.

**Experiment 11 — X-propagation is asymmetric across the stages**
(hierarchically probed at each boundary; captured table):

| Injected X | swap | sum27 | result | flags |
|---|---|---|---|---|
| none (clean 2.0 + 1.0000001) | 0 | `3000002` | `40400000` | `001` |
| one X in b's fraction LSB | **x** | all-x | `Xxxxxxxx` | `0xx` |
| X in b's exponent MSB | x | all-x | `Xxxxxxxx` | `xxx` |
| X in b's SIGN only | 0 | `XxxxxxX` | **`34000000` — defined-looking garbage** | **`000`** |
| a = qNaN `7FC00055`, b = all-X | x | all-x | **`7fc00055` — perfectly clean** | `x00` |
| a = +inf, b = all-X | x | all-x | `XfXxxxxx` | `x00` |

Four findings worth the chapter's space:

1. **The magnitude compare is the design's X chokepoint**: one X in the
   fraction LSB makes `b[30:0] > a[30:0]` return `x` even though the
   comparison's outcome is independent of that bit, and the swap muxes
   spread it everywhere (X-pessimism).
2. **An X sign produces a fully-defined-looking wrong answer with clean
   flags** (`34000000/000`): the add/sub ternary bit-merges the two arms
   (agreeing bits stay defined), and the LZC's `if (v[i] == 1'b1)` treats
   `x` as false (X-optimism in `if`). X does not always look like X — the
   dangerous direction ch03's material does not cover, measured here.
3. **The screen's mux priority determines X immunity of specials**: qNaN
   in the first mux arm gives a clean result against an all-X partner
   (`a_nan = 1` dominates the ORs), while +inf — sitting behind two
   x-valued conditions in the chain — comes out contaminated. If chapter
   12 ever cares about X-robust special handling, priority order is the
   knob.
4. **Flags contaminate before results do** (`invalid = x` while the result
   is clean in the qNaN row) — one more reason the flag ports are
   first-class citizens of every check.

## 10. Coverage carry-forward: the four renormalize reachers in a split design

**Experiment 12.** ch08's `tb_corners.v` — 46 pairs both orders, expected
values from exact rational arithmetic, eight required coverage bins sampled
from the DUT's own wires — ports to the split design mechanically. What
changes and what does not:

- **The DUT instantiation** becomes `fp32_add2`.
- **Six of the thirteen hierarchical bin references must be re-aimed into
  submodule instances**: `dut.right1` → `dut.u_norm.right1`, `dut.shl` →
  `dut.u_norm.shl`, `dut.round_renorm` → `dut.u_round.round_renorm`,
  `dut.shamt` → `dut.u_align.shamt`, `dut.round_up` →
  `dut.u_round.round_up`, `dut.fsig` → `dut.u_round.fsig`. The other seven
  (`dut.screen`, `dut.s_al`, `dut.ng/nr/ns`, `dut.ovf`, `dut.exact_zero`)
  survive unchanged because those signals are top-level wires in the split.
- **Expected values and the check-count guard do not change at all** — the
  ported bench runs 92/92 with all bins hit:

```
bins: right1=12 left>=2=8 round_renorm=8 sticky_sat=8
      tie_up=12 tie_down=4 subnormal_res=6 overflow_res=6
PASS tb_corners_split (46 pairs x both orders, 8/8 coverage bins hit)
```

  `round_renorm = 8` is the four directed reachers × both orders —
  consistent with ch08's record, now observed on `u_round`'s wire.

- **The T3c discipline re-verified on the split** (measure, don't guess —
  the ch08 lesson): deleting exactly the four named reachers
  (`4B800000+B3800000`, `4B000000+BDFFFFFF`, `3FFFFFFF+33800000`,
  `7F7FFFFF+73000000`, count guard adjusted 92 → 84) zeroes the bin and
  fires the gate:

```
bins: right1=12 left>=2=8 round_renorm=0 sticky_sat=4
FAIL tb_corners_split: a required coverage bin is empty
```

  So in the split design too, those four vectors are the *only* renormalize
  reachers in the library, and the empty-bin gate provably executes. The
  standing ch08 warning carries forward verbatim: the rounding-carry
  renormalize fired **0 times in 10⁶ random pairs**, so the ch09 regression
  must carry the four vectors and the gate — random will never replace
  them. (This session's sweep testbenches do not sample that wire at all —
  ch08's 0-in-10⁶ census is the standing measurement; the corner gate is
  the guarantee.)

- **A stale hierarchical reference fails loudly, not silently.** Compiling
  the unported ch08 bench against the split top produces elaboration
  errors naming every missing wire (`error: Unable to bind wire/reg/memory
  'dut.right1' in 'tb_corners.sample_bins'`, etc.). Hierarchical
  references cannot become implicit nets, so a refactor cannot silently
  disconnect the coverage gate — the worst case is a build failure, which
  is the good direction. Worth one sentence in the chapter: white-box
  coverage sampling is refactor-brittle *by construction*, and that
  brittleness is a feature (it forces the bins to be re-aimed
  deliberately, as was just done).

- **Design guidance this suggests**: signals the coverage gate needs
  (`right1`, `shl`, `round_renorm`, `shamt`) could alternatively be
  exported as debug/observation ports to make the bins boundary-visible
  rather than white-box. The prototype deliberately did NOT do this — the
  hierarchical route works, keeps the synthesizable interface minimal, and
  chapter 11 will register the boundaries anyway (a pipelined design will
  need the bins re-timed regardless). The chapter should present the
  hierarchical re-aim as the normal maintenance cost of a decomposition.

## 11. Sizing and synthesis-adjacent notes (honestly flagged)

No synthesizer exists in this environment, so nothing here is area or
timing truth; the epistemic wall stands. What WAS measured, plus what it
cannot mean:

**Experiment 13 — Icarus's `-t sizer` target actually runs on this design**
(a ch05 finding said the target list exists; this is the first chapter to
try it on real datapath RTL). Two honest surprises:

- It errors (`SIZER: The root scope $unit must be a module.` + "Code
  generation had 1 error(s)") **and still writes a complete per-scope
  report** — quote both or the transcript looks impossible.
- Per-module elaborated-structure counts (abridged):

```
u_screen: 528 gates, MUX[2]:256          u_round: 332 gates, ADDER[9]+ADDER[25], MUX[2]:120
u_swap:   193 gates, MAGNITUDE[31], MUX[2]:65
u_addsub: 163 gates, ADDER[27], EQUALITY[27], MUX[2]:27
u_norm:   125 gates, ADDER[9], MAGNITUDE[8], MUX[2]:44   u_norm.lzc26: 0 gates (!)
u_align:  26+98 gates (wrapper + align_sticky core), MAGNITUDE[8]+[32]
TOTALS:   1761 gates, 0 FFs, MUX[2]:570, LPM[6/7/8/14]: 8 unaccounted
```

- **The tool cannot account exactly the structures that dominate real
  area**: the barrel shifters and the LZC function appear as
  `LPM[n]: unaccounted` and `lzc26: Logic Gates: 0`. So the numbers are an
  elaboration inventory (which operators exist at what width), NOT an area
  estimate — useful to the chapter only as a map of where the big
  operators live, and it must be flagged exactly that way.
- Comparison point: the monolithic golden elaborates to 1995 gates with the
  *identical* ADDER/MAGNITUDE/MUX inventory; the split's lower EQUALITY
  count (4×8-bit + 2×23-bit vs 8 + 6) is `fp32_class` sharing its
  `e_zero`/`e_ones`/`f_zero` compares where the golden's inline decode
  re-derives them per class. A real observation about logic sharing — at
  elaboration level only.
- `-t blif` fails outright on this design:
  `sorry: ivl_lpm_type(net)==14 not implemented.` (the shifter LPM). So no
  netlist-level route exists here either.

**What can honestly be said about hardware shape (documentation, not
measurement):** the critical path of this adder is the textbook chain
compare → swap → align shift → 27-bit subtract → LZC → left shift → 24-bit
increment → pack; production adders attack it with dual paths (ch08's "How
Production Adders Rearrange It" section owns that story). The gate-level
intuition per module — the 27-bit adder is ~27 full-adder cells, the two
shifters are 5-level 26-bit mux trees (~130 mux2 each), the LZC a 26-input
priority encoder — is consistent with the sizer's operator inventory but
**cannot be converted into LUTs or nanoseconds without a synthesizer**;
chapter 11 must either import a tool or keep the wall.

**Simulation-cost measurements this session** (real, on this container):
elaboration of the full split design 0.014 s; `.vvp` "assembly" 724 lines
for the split vs 500 for the golden (a build-artifact size, not a hardware
metric); per-vector event cost roughly 0.2 ms for two DUTs + `#1`
(41.9 s / 200k) and 0.11 ms for one DUT + shortreal ref (10.9 s / 100k).

## 12. Corrections and sharpenings to earlier chapters; sources

Nothing measured this session *contradicts* an earlier chapter's claim.
Five findings sharpen or extend one:

1. **ch03's `always_comb` verdict is incomplete and chapter 13 should not
   inherit it as-is.** ch03 (correctly) measured that Icarus's
   `always_comb` adds no latch/blocking-assignment *checking* and called
   its value documentation-only. Measured here: Icarus 13.0's
   `always_comb` DOES implement the SystemVerilog *sensitivity* upgrade —
   a function reading a non-argument global re-evaluates under
   `always_comb` where `always @*` goes stale (probe pair
   `probe_funcsens2.v`/`probe_funcsens3.v`, captured in section 9). So on
   Icarus the keyword buys real simulation semantics in exactly one
   dimension (function-body sensitivity), still zero diagnostics.
   (Sharpened 2026-08-21 by chapter 13's research: a SECOND dimension was
   measured — `always_comb` executes at time zero where `@(*)` does not,
   fixing ch03's no-self-start trap in-simulator. "Exactly one" should read
   "two"; the zero-diagnostics half stands, re-verified.) The `@*`
   behavior is standard-conformant, not a Icarus deviation — the split is
   the language's own (`always_comb` "sensitive to changes within the
   contents of a function", fetch-verified secondary source below).
2. **ch03's latch story extends measurably**: an inferred latch in this
   datapath captured a *delta-cycle glitch state* corresponding to no
   settled input vector, and its end-to-end visibility (4 flag-only
   failures in 100,092; 0 in 100k random) depended on the order of two
   blocking assignments in the driver task (section 9). "Latch = remembers
   the previous vector" is the weaker true statement; "latch = remembers
   whatever the cascade was mid-settle" is the measured one.
3. **ch02's ungated port-width warning: confirmed at this design's real
   boundaries**, with the sharpening that the identical diagnostic text
   covers both a provably-benign narrowing (`e_norm` → 8 bits, sweep
   passes) and a catastrophic one (`sum27` → 26 bits, adder output zeroed)
   — section 5. The `implicit` warning's `-Wall` gating also confirmed;
   `` `default_nettype none `` upgrades the misspelled-net case to a
   binding error that names the instance and port.
4. **New toolchain facts** (none previously recorded in STATE.md):
   `iverilog -t sizer` runs on real datapath RTL, errors on `$unit` yet
   still writes a complete per-module report, and cannot account shifter
   LPMs or function logic — usable as an operator inventory only;
   `-t blif` hard-fails on this design (`ivl_lpm_type(net)==14 not
   implemented`). Section 11.
5. **The `!==`-only rule now has two quantified false-pass
   demonstrations**: the `!=` variant of the equivalence testbench passed
   100–200k checks against (a) an undriven-net design (60,980 X-contaminated
   real mismatches missed) and (b) a double-driven-net design (168 missed) —
   both compile-silent bugs. (Corrected 2026-08-19 by the ch09 review: the
   two counts were transposed here; the chapter and README always had them
   right — 60,980 belongs to the undriven net, 168 to the double-driven.) ch04/ch05 teach `!==` by rule; chapter 9 can now
   teach it by body count.

Also reconfirmed without change: the shortreal one-add remains exact-safe
at the new top level (100k pairs, 0 mismatches); sNaN quiets on a pure
round-trip (`7fa00000 → 7fe00000`) and must be built from bits; NaN results
compare by class + quiet bit + payload, never sign (this container's host
FPU happened to agree with the DUT's sign — do not let that tempt anyone
into asserting it); `$urandom` seeded once per simulation with the first
draw discarded, seed echoed, in every sweep here.

**Handoffs for the writer:**

- Ship the split as section-per-module with the port tables of section 3;
  the equivalence sweep (`tb_equiv`, 100k + corner phase) is the chapter's
  spine, `tb_short` (100k) its independent oracle, `tb_corners_split` the
  coverage gate carrier, and the three unit benches the new material.
- The mutation ledger to reproduce: 17 tried / 15 killed / 2 survivors
  (both measured-equivalent, reasons in section 6/7), plus the
  five section-7 masking measurements — these are the chapter's argument
  structure, not an appendix.
- Watch the harness timeout: 200k two-DUT sweeps run 41.9 s here; ship
  100k.
- Chapter 10 note: B-M2 (the `exact_zero` gate) is the worked example of
  a latent contract bug that a datapath reuse can surface — remember it
  when the 4-input tree reuses `fp32_addsub`.

## Sources

**Fetch-verified this session:**

- Jason Yu, "SystemVerilog always_comb, always_ff. New and Improved.",
  verilogpro.com (https://www.verilogpro.com/systemverilog-always_comb-always_ff/)
  — fetched 2026-08-20; confirms verbatim: "always_comb is sensitive to
  changes within the contents of a function, whereas always @* is only
  sensitive to changes to the arguments of a function." (Page does not cite
  a specific LRM clause; the normative statement is in IEEE 1800.)

**[title-only] (not fetched or fetch failed; cite by title only):**

- IEEE Std 1800-2017, *SystemVerilog*, §9.2.2.2 (`always_comb`
  sensitivity, including contents of called functions). The full 1364-2005
  PDF mirror at staff.ustc.edu.cn returned HTTP 503 this session.
- IEEE Std 1364-2005, *Verilog HDL*, §9.7.5 (implicit
  `event_expression`, `@*`).
- M. D. Ercegovac and T. Lang, *Digital Arithmetic*, Morgan Kaufmann,
  2004 — ch. 8, floating-point addition: the standard
  unpack/align/add/normalize/round decomposition and dual-path variants.
- J.-M. Muller et al., *Handbook of Floating-Point Arithmetic*, 2nd ed.,
  Birkhäuser, 2018 — hardware FP adder structure and pipeline cut
  conventions.

Everything else in this file is a local measurement against Icarus Verilog
13.0 (`v13_0-dirty` per `iverilog -V`) and python3 3.11 on this Linux
x86-64 container, with commands and captured output quoted in place.
