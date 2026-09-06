# Chapter 12 research — Complete four-input adder: full source, testbench, corner case suite

<!-- sections complete: 14/14 -->

Research date: 2026-08-21. Toolchain: Icarus Verilog 13.0 (tag `v13_0`) at
`/usr/local/bin`, `iverilog -g2012 -Wall`, zero-output compiles; python 3.11
(`fractions.Fraction` + hand RNE as the exact oracle). All throwaway work in
the session scratchpad; nothing below `guide/` was touched except this file.

## 1. What chapter 12 is, and what it inherits

Chapter 12 is the payoff chapter: the complete, specified, pipelined
four-input adder with its full verification kit. The research finding that
should shape the writing: **there is almost nothing left to invent, and that
is the chapter's thesis, not its weakness.** Eleven chapters built the
parts; chapter 12's job is a written specification (which did not exist),
one disposition (D9), one genuinely new verification artifact (the
falsifiable coverage model), and the assembly proofs. The design itself is
ch11's pipelined tree with the flagship name.

The inheritance map, all of it exercised this session:

| Inherited | From | Used here as |
|---|---|---|
| `fp32_add2` and its seven stage modules | ch09 | the only datapath, instantiated verbatim |
| `fp32_add2_p2` + `fp32_add4_tree_p` (tree shape, flag delay line, valid pipe) | ch11 | `fp32_add4`'s body |
| `fp32_add4_tree` (combinational) + `ref_add4_tree` (golden chain) | ch10 | the two streaming oracles |
| the streaming-equivalence harness | ch11 | both assembly proofs (retargeted verbatim) |
| the 46-pair corner library | ch08 | parsed and lifted to 276 quadruples at all three tree positions |
| Q/N/Z/S/SB composition corners | ch10 | re-pinned for the tree, 28 rows |
| the 34-bin coverage model + its two recorded blind spots | ch05 | extended to 105 bins; both blind spots closed with measurements |
| the exact-oracle discipline, seed-once, `!==`+X-guard, sNaN-from-bits, round-trip rule | ch05/07/09/10 | everywhere |
| D9 / B-M2 | ch09/ch10 | settled, sections 3-6 |

New python artifacts built and validated this session (in the scratchpad,
for the writer to reproduce or ship as the chapter decides): `oracle.py`
(spec-level exact model of the design semantics + the correctly-rounded
four-input oracle) and `hwmodel.py` (algorithm-level event model), proven
equal to each other and to the RTL on 1,000,064 pairs + 1,000,256 quads
including flags; `cov_gen.py` and `corner_gen.py`, the pin/library
generators. Section 13 discusses how these fit the repo's "listings are
files" conventions.

## 2. The specification, drafted in full

The written specification the chapters have been demanding since ch10's "one
multiset, three answers". Drafted here for the writer to embed (lightly
edited) at the head of chapter 12. Every clause cites the measurement or
proof that backs it; a clause with no citation would be this project's
recurring defect and there is none.

---

**Specification: `fp32_add4` — four-input IEEE 754 binary32 adder**

**S1. Operation.** `fp32_add4` computes the sum of four binary32 operands as
**three binary32 additions in the fixed tree association `(a+b)+(c+d)`**:
level 1 computes `a+b` and `c+d`, level 2 adds the two level-1 results. The
association order AND the port-to-operand mapping are normative, not
implementation detail: the operand multiset {+max, +max, −max, −max}
delivered as `(a,b,c,d) = (max, max, −max, −max)` returns qNaN with flags
`invalid+overflow+inexact`, while the same multiset interleaved
`(max, −max, max, −max)` returns +0 with no flags — measured this session
across all 6 distinct port orders through the tree: 2 orders give qNaN/111,
4 give +0/000 (and the sequential association would give +inf: ch10's
census). An implementation that reassociates or permutes ports implements a
*different function*. Each of the three additions is a complete IEEE 754
`addition` operation on binary32 (ch09's `fp32_add2`, proven against exact
rational arithmetic through ch08's chain and this session's independent
model, section 7.2).

*Why a tree and not a sequential chain* — and honestly not for accuracy:
ch10's 1.2M-quadruple sweep found no systematic accuracy winner (per-regime
gaps are real but their direction flips between regimes), killing the
"trees are more accurate" folklore. The tree is chosen because at equal
throughput it is 2 dependent additions deep instead of 3, and pipelined it
costs latency 4 and 336 state bits against the sequential chain's latency 6
and 540 bits (ch11, counted from the shipped RTL).

**S2. Formats.** All four operands and the result are binary32. Subnormal
operands and subnormal results are handled exactly (gradual underflow; the
normalize stop at effective exponent 1 — ch09; taxonomy rows B1-B4 directed
in the suite). There is no flush-to-zero in either direction (S10).

**S3. Rounding.** Rounding attribute: **roundTiesToEven only**, applied
**per addition — the result is rounded three times**, once at each internal
binary32 boundary. This is deliberately NOT the single-rounding
(correctly-rounded four-input) function: measured this session against the
exact single-rounding oracle, the composed result equals the correctly
rounded sum on 98.29 % of full-range quadruples but only 73.12 % (win2) /
69.49 % (win10) of clustered-exponent quadruples (50k/regime, seed 20260821;
consistent with ch10's conditioned 20.46/21.51 % figures). The specification
therefore defines the correct answer AS the three-rounding composition —
the golden reference must follow the wiring (ch10's T1: an order-unfaithful
reference fails a correct DUT exactly 1,369 times in 10,000, the tree≠seq
census rate).

**S4. Flags.** Three output flags: `invalid`, `overflow`, `inexact`. Each is
defined as **the OR of that exception over the three component additions**
(the IEEE "computed as three separate operations" reading; flags accumulate
as status). Consequences, all measured:
  - A level-1 overflow whose infinity is later absorbed or cancelled still
    reports `overflow` (ch10 Q1-Q3; final-stage-only flags lose it — mutant
    D3, 12 corner kills).
  - `inexact` **over-reports relative to the single-rounding ideal, in one
    direction only**: on 7.095 % of quadruples whose composed result bits
    happen to equal the correctly rounded sum, the composition still raises
    inexact (a stage rounded, even though the final bits landed exact).
    Provably one-directional — the composition can never MISS a truly
    inexact sum (ch10's proof plus its reviewer's 900k-vector adversarial
    hunt, no counterexample). The flag means "some stage rounded or
    overflowed", not "the delivered bits are not the exact sum".
  - **`underflow` is omitted, with a proof, not a shrug** (ch07): in any
    binary32 addition a result below the normal range is always exact
    (Sterbenz-style cancellation argument; 0 inexact in 400,000 cancelling
    pairs measured), and IEEE's default underflow signals only when tiny AND
    inexact — so an adder-only datapath can never raise it. This lifts to
    the composition: each stage is an addition.
  - `invalid` is raised only by an sNaN operand at any stage or an
    `inf + (−inf)` at any stage (D2 taxonomy row; screen RTL). NaN
    *propagation* is not invalid (ch10 N1).

**S5. NaN policy.** Any NaN among the operands (or born at any stage) yields
a quiet NaN. Outputs are specified by **class and quiet bit, plus measured
payload propagation**: each `fp32_add2` propagates `a`'s NaN over `b`'s
(`nan_src = a_nan ? a : b`) with the quiet bit forced and payload bits
[21:0] preserved, so the composed priority is **a > b > c > d** (measured:
four distinct qNaN operands return `a`'s payload; c-and-d NaNs return `c`'s;
an sNaN `7FA00077` in `d` returns `7FE00077` + invalid). The payload rule is
a *measured behavior of this implementation*, stated so the golden chain can
be bit-exact (ch10's D8: payload order visible only to the bit-exact
reference); IEEE 754 does not mandate it and ports of this design must not
rely on it. **The sign of a NaN result is never specified and never
compared** (ch07: the same simulator emits differently-signed NaNs at
elaboration vs runtime; the suite compares NaN class + quiet + payload,
never sign).

**S6. Specials and intermediate-event semantics.**
  - **Signed zero.** Per stage: `(+0)+(−0) = +0` in either order; same-signed
    zero pairs keep the sign; exact cancellation of nonzero operands gives
    +0 (RNE rule). Composed and measured over all 16 all-zero-operand
    quadruples: **the result is −0 iff all four operands are −0**; the other
    15 give +0; flags all zero (this session's exhaustive census, and the
    16-combination Z block of ch10's suite).
  - **Infinity.** An infinite operand propagates through its level;
    like-signed infinities add to the same infinity; `inf + (−inf)` at any
    stage yields qNaN + invalid.
  - **Intermediate events poison per the composition, and the spec owns
    this.** A level-1 overflow manufactures a genuine ±inf which then
    participates in level 2 as a true infinity. Worked, measured example:
    `(max + max) + (−max + (−1.0))` → level 1: +inf (overflow) and ≈−max;
    level 2: `+inf + (−max)` = **+inf**, flags 011 — although the exact
    four-input sum (≈ max − 1) is finite and representable. Likewise
    `(max+max) + (−max + −max)` → `+inf + (−inf)` = qNaN, invalid — NaN
    born two levels deep from finite operands (ch10 Q1/N-rows; corner suite
    section 10). Callers who need the single-rounding answer need a
    different design (S10).
  - **`exact_zero` contract clause** (the D9 disposition, section 6): inside
    each `fp32_add2`, `fp32_addsub.exact_zero` is significant only under
    `eff_sub`; its gate's effective-add case is unreachable-except-screened,
    proven in section 5.1 and witnessed on the wire by the shipped suite.

**S7. Pipeline and interface.** Latency **4 clock cycles**, throughput one
quadruple per cycle, fully streaming, no stall or backpressure. Handshake:
`in_valid` qualifies the operand ports each cycle; `out_valid` (the 4-deep
valid pipe's tail, AND-chained through the levels) qualifies the outputs.
**Outputs in cycles where `out_valid = 0` — including the entire fill window
— are unspecified and must be ignored**: ch11 measured that fill-window
garbage can look like a defined +inf with flags, so "looks plausible" is not
"valid". Bubbles (in_valid low, X on data) are first-class and were streamed
through every proof run (section 7.2).

**S8. Reset.** `rst_n` resets **control only** — the valid pipes. The
datapath registers free-run and are never cleared: ch11 measured that a full
datapath reset manufactures a defined-looking +inf/overflow out of the
illegal all-zeros state during fill (`tb_reset`'s cycle-pinned trap), so the
datapath-reset "safety" is the bug. Recovery from reset is `out_valid`
gating, nothing else.

**S9. Verification obligations bound to this spec** (what "conforms" means
for chapter 12): streaming equivalence to the combinational tree AND to the
order-faithful golden chain (both ≥100k quads, section 7.2); the corner
suite of section 10 including the D9 witness; the coverage model of section
8 closed with its pinned counts; the regression targets of section 11.

**S10. Out of scope, stated so nobody reads silence as a promise:** the four
other IEEE rounding-direction attributes; flush-to-zero / DAZ; the
single-rounding (correctly-rounded) four-input sum and any accuracy claim
beyond S3's measured table; the underflow flag (omitted WITH proof, S4);
division-of-labor exceptions (traps, alternate exception handling — flags
only); NaN payload portability guarantees beyond S5's measured behavior;
operand isolation/power gating; backpressure. Timing/Fmax is documentation
only — no synthesis tool exists in this environment (ch11's epistemic wall,
maintained).

---

Everything above is assembled from prior chapters' measurements plus this
session's; the writer should keep the citations inline — the spec's
authority is precisely that every clause has a number behind it.

## 3. D9: the reproduction

First, the facts, re-established this session before touching anything. D9 is
chapter 10's mutation-record name for chapter 9's B-M2: `fp32_addsub`'s
`exact_zero` output losing its `eff_sub` gate,

```verilog
// shipped (correct):
assign exact_zero = eff_sub & (sum27 == 27'd0);
// B-M2 / D9 mutant:
assign exact_zero = (sum27 == 27'd0);
```

One point of framing matters more than anything else in this section, because
the STATE.md shorthand ("ch09's latent `exact_zero` **bug** in `fp32_addsub`")
invites a misreading: **the shipped module is correct against its own contract
and the shipped composition is correct, full stop.** What rides into chapter 12
is not a wrong function. It is a *mutant class with no composition-level
witness*: if anyone ever introduces B-M2 — a refactor, a rewrite, a copy into
another project — no black-box test of `fp32_add2`, `fp32_add4_tree`, or the
pipelines can catch it. The debt is a verification hole, not a design defect.
Every measurement below confirms that reading.

Reproduction, this session:

- **Unit kill.** `tb_addsub_u` against the B-M2 mutant:
  `FAIL tb_addsub_u es=0 big=000000 al=000000 grs=000: got 0000000/1 want
  0000000/0` — the zero-operand-ADD vector, exactly one kill in six directed
  checks. The shipped module passes 6/6.
- **Composed survival.** The same mutant inside the full `fp32_add2` against
  `tb_equiv`'s golden sweep: `PASS tb_equiv (92 corner checks + 100000 random,
  split == golden bit-for-bit incl. flags)` — all 100,092 checks, 20.3 s.
  Chapter 10's record adds the 24,000-quadruple sweep, all 28 corners, and the
  reachers (all survived); chapter 11 adds the streaming harnesses (rides
  through unchanged).

Why the mask exists, from the RTL as shipped: `exact_zero`'s entire fanout is
one term in `fp32_round_pack.dp_res` (it touches neither `ovf` nor
`inexact_dp`), `dp_res` reaches the outside world only through
`result = screen ? screen_res : dp_res`, and the two functions differ only
when `eff_sub = 0` with `sum27 = 0` — which, section 5 proves, forces both
operands to be zeros, which forces `screen = 1`. The gate protects a region
of its input space that the screen never lets speak.

## 4. D9 option (a): the design-change routes, measured

The mandate's option (a) is "fix `fp32_addsub`". There are exactly two design
changes on the table, and this session built and measured both. The results
are opposite in kind, and neither is what the mandate's wording assumed.

### 4.1 Route a1 — the minimal fix *to fp32_addsub*: measured, and it is not a fix

The only way to change `fp32_addsub` itself is to ungate `exact_zero`
(`assign exact_zero = (sum27 == 27'd0);` — the mutant becomes the design) and
move the sign decision into the consumer: `fp32_round_pack` gains an
`eff_sub` input (which already crosses chapter 11's 73-bit cut as
`p1_eff_sub`, so the pipeline register budget does not change) and packs

```verilog
exact_zero ? {(eff_sub ? 1'b0 : sign), 31'd0} :
```

Measured, three results:

1. **Bit-identical at the composition boundary**: the a1 build passes the full
   100,092-check golden sweep, `split == golden bit-for-bit incl. flags`.
2. **It breaks the unit contract**: `tb_addsub_u` FAILS on its zero-ADD vector
   against the a1 `fp32_addsub` (`got 0000000/1 want 0000000/0`) — the module's
   own specification changed, so "ch09 unit stays green" is violated and the
   unit bench would have to be rewritten to bless the new contract.
3. **The latency does not die; it relocates.** Mutating the *relocated* gate
   (dropping the `eff_sub` term from the new pack mux, so exact zeros always
   emit +0) again passes the entire 100,092-check sweep. Same mask, new
   address.

Result 3 is the section's finding, and it generalizes: *some* logic in any
correct design must decide the sign of a zero result, that logic's deciding
case for the effective-add direction is "both operands zero", and both-zero
operands are screened. The latent region is a property of the
**screen/datapath redundancy** — a don't-care region the screen creates — not
of where the gate happens to live. No rewrite of `fp32_addsub` can remove it;
it can only move it. Option (a1) as the mandate imagined it does not exist.

### 4.2 Route a2 — remove the redundancy: unscreen zeros. Clean on every wire

If the latent region is the screen's shadow over zero operands, the root fix
is to shrink the screen: zeros stop being specials and flow through the
datapath, which — as it happens — already computes every zero case correctly
*because* the gate is there. The change is four lines in `fp32_screen.v` and
touches nothing else:

```verilog
assign screen  = a_nan | b_nan | a_inf | b_inf;          // zeros removed
assign screen_res =
    (a_nan | b_nan)              ? {nan_src[31], 8'd255, 1'b1, nan_src[21:0]} :
    (a_inf & b_inf & (sa ^ sb))  ? 32'h7FC00000 :
    a_inf                        ? a :
                                   b;                    // zero rows deleted
```

(Why the datapath gets zeros right, from the shipped RTL: a zero operand
unpacks to `sig = 0`, `e_eff = 1`; the swap makes the nonzero operand big;
`x + 0` aligns to `aligned = g = r = s = 0` and `sum27 = big27`, which
normalizes and packs back to `x` exactly, subnormals included, since the
subnormal stop holds `e_norm = 1` when `e_big = 1`. Both-zero effective adds
pack `{sign_big, 31'd0}` through the normal path — which is why the gate must
*stay*: ungated, `(-0)+(-0)` would be forced to `+0`.)

Measured, the full downstream battery, every run this session:

| Sweep | Result |
|---|---|
| ch09 harness, all 6 targets (unit benches, `tb_equiv` 100,092, `tb_corners_split` + coverage gate, `tb_short` 100k shortreal) | **6/6 PASS**, 31.0 s |
| ch10 harness, 3 targets (`tb_equiv4` 24k×2×2, `tb_corners4` 28 + bins, `tb_reach4`) | **3/3 PASS** |
| ch11 harness, 8 targets (streaming both depths, tree streaming, single, reset ×2, xinj, wave) | **8/8 PASS** (ch10+ch11 together 2 m 27 s) |
| ch10 headline `tb_equiv4 -DNQ=60000`: **240,000 quadruples × 2 structures × 2 references** | **PASS**, 8 m 50 s |

Because `tb_equiv` and `tb_equiv4` compare against the *unchanged* golden
`fp32_add_alg` chain bit-for-bit including flags, these passes establish that
the a2 design equals the shipped design's function exactly — green
bit-for-bit in the mandate's sense, at 100,092 + 240,000×2×2 checks plus the
corner libraries.

And the payoff: **under a2, D9 dies in the ordinary suites.** The B-M2 mutant
applied on top of a2 is killed by `tb_equiv`'s corner phase and by
`tb_corners_split`, twice each, on exactly the predicted vector:
`FAIL tb_equiv 80000000+80000000: split 00000000/000 golden 80000000/000`
(both orders) — `(-0)+(-0)` must be `-0`; the ungated mutant forces `+0`.
The chapter-10 mutation record's one genuine survivor becomes a two-bench,
four-kill mutant with no new tests written.

**What a2 costs — and the mandate did not price this:** it is not a fix to
`fp32_addsub` (that file is untouched); it re-decides a *taught* design
decision in a shipped, reviewed chapter. `src/ch09/fp32_screen.v` is embedded
in chapter 9 as a byte-identical listing; its header invariant ("screen is
high iff any operand is NaN, infinite or zero"), chapter 9's prose (the screen
"owns the +0/−0 sign rule"), chapter 10's D9 structural-proof paragraph and
README row, and chapter 11's bridge all state the zeros-are-screened design.
Choosing a2 means editing one module and re-opening the prose of three closed
chapters (9, 10, 11) plus ch10's mutation record — mechanical, but every one
of those chapters is signed off at 9/10 and F1 would have to chase the
cross-references. The sweeps cost 12 minutes; the churn is the real price.

## 5. D9 option (b): the acceptance proof, formalized and attacked

### 5.1 The proof, written out

**Claim.** Over all 2^64 two-state operand pairs, the shipped `fp32_add2` and
the B-M2-mutated `fp32_add2` compute identical `{result, invalid, overflow,
inexact}`.

**Proof.** The two builds differ only in `exact_zero`, and only on inputs
where `eff_sub = 0` and `sum27 = 0` (on every other input the two expressions
agree). Suppose `eff_sub = 0` and `sum27 = 0`.

1. With `eff_sub = 0`, `sum27 = big27 + sml27` computed in 27 bits with **no
   wrap**: `big27 = {1'b0, sig_big, 2'b00} ≤ (2^24−1)·4 < 2^26` and
   `sml27 = {1'b0, aligned, g, r} < 2^26`, so the true sum is `< 2^27` and
   fits. Hence `sum27 = 0` iff `big27 = 0` **and** `sml27 = 0`.
2. `big27 = 0` iff `sig_big = 0`. `sig_big = {hidden, F}` of the operand with
   the larger packed magnitude, and `{hidden,F} = 0` iff `E = 0, F = 0`
   (ch07's `fp32_fields`: `hidden = (E != 0)`), i.e. the bigger operand is a
   signed zero.
3. The swap invariant (`swap = b[30:0] > a[30:0]`, encoded-order compare)
   makes the big operand the one with the larger magnitude; if it is a zero,
   the other operand's magnitude is `≤ 0`, i.e. **both operands are zeros**.
4. Both operands zero implies `a_zero & b_zero`, so `screen = 1`
   (`fp32_screen`: `screen = ... | a_zero | b_zero`).
5. `exact_zero`'s complete fanout is one mux term of `fp32_round_pack.dp_res`;
   it appears in neither `ovf` nor `inexact_dp` (read off the shipped RTL,
   quoted in section 3). Under `screen = 1`: `result = screen_res`
   (independent of `dp_res`), `invalid = inv_scr` (never a function of
   `exact_zero`), `overflow = ~screen & ovf = 0`, `inexact = ~screen & inx_dp
   = 0`. Every output is independent of `exact_zero`. ∎

The proof uses four facts, each anchored: the 27-bit no-wrap bound is chapter
8's width budget (attacked three ways there and held); the `hidden = (E != 0)`
decode is ch07's `fp32_fields` contract (67.1M-pattern classifier sweep); the
swap invariant is ch09's `fp32_swap` contract; the fanout claim is three lines
of shipped RTL. Note what the proof does **not** need: it never reasons about
alignment, sticky, or the small operand at all — step 1 kills the tempting
loophole "a nonzero small operand fully shifted out (`aligned=g=r=0, s=1`)
with a zero big operand", because that would violate step 3 (a zero cannot be
the *larger* magnitude of a pair containing a nonzero).

**Composition lifts the proof unchanged.** In `fp32_add4_tree` /
`fp32_add4_seq` every `fp32_addsub` sits inside a complete `fp32_add2`
carrying its own screen, so the argument applies instance-by-instance to
whatever operands arrive — driven or born (a stage-1 exact cancellation
delivers `+0`, a *zero*, to stage 2, and stage 2's own screen masks stage 2's
own gate). In the pipelines (`fp32_add2_p2/p4`, `fp32_add4_tree_p`) the same
modules are instantiated verbatim with registers between them;
`p1_exact_zero` and `p1_screen` ride the same bank, and per transaction the
registered cone computes the identical function (ch11 measured exactly this:
D9 "rides through unchanged... both sides compute the same masked function").

**One honest caveat: the proof is a two-state proof.** With X on the operand
inputs, `sum27 == 27'd0` can evaluate X and the two expressions could
X-propagate differently. No claim is made for X-contaminated operands — but
none is made for the shipped design either; both functions are equally
unspecified there, and ch11's X-discipline (enforce at injection points)
covers the pipe.

### 5.2 The adversarial search: 2,000,320 targeted vectors, zero divergence

The proof was then attacked as if it were wrong, with generators aimed at its
assumptions (equal magnitudes at the swap boundary, subnormal/zero edges,
27-bit-full significands, and above all zeros — driven and born). Method:
one build of the shipped design, one of the B-M2 build, identical stimulus,
every `{operands, result, invalid, overflow, inexact}` line printed and the
transcripts diffed — any divergence anywhere becomes a diff line.

- **Pair level** (`tb_d9adv.v`, seed 90210): 64 exhaustive pairs over
  {±0, ±min-subnormal, ±1.0, ±max-normal}, then 1,000,000 pairs with 40 %
  zero operands, 10 % subnormals, 10 % ramp-edge tiny normals, and every
  fourth pair forced to exact cancellation `x, −x`. **1,000,064 pairs,
  transcripts byte-identical (0 diff lines).** 80 s per build.
- **Quad level** (`tb_d9adv4.v`, seed 60606, through `fp32_add4_tree`): all
  256 quads over {+0, −0, +1, −1} (every cancellation-born-zero pattern at
  stage 2), then 250,000 rounds × 4 attack patterns — `(x,−x,y,−y)` so stage
  2 receives two *born* zeros as an effective add; `(x,−x,z,z')` mixing born
  and driven zeros; zero-heavy random; three signed zeros plus one live
  value. **1,000,256 quads, transcripts byte-identical (0 diff lines).**
  3 m 39 s per build.

The search found no violation, and the proof says none exists to find. Both
statements are needed: the proof is the claim over 2^64; the 2M-vector diff
is the check that the proof is about the RTL that actually ships rather than
the RTL its author remembered.

**The pipeline is closed empirically too, not just structurally.** A B-M2
build of the *entire* section-7 streaming proof (mutant `fp32_addsub` under
both the pipelined `fp32_add4` and its combinational oracle) passes 60,992
streamed quads bit-for-bit (33.9 s). Chained with the quad-level diff above
(mutant-comb ≡ shipped-comb, 1,000,256 quads) and section 7's shipped
streaming proof (shipped-pipe ≡ shipped-comb, 101,019 quads), this gives
mutant-pipe ≡ shipped-pipe by three measured links — ch11's "rides through
unchanged" upgraded from a structural argument to a closed empirical chain.

### 5.3 The witness: making B-M2 killable without touching the design

Acceptance-in-writing alone would leave the mutant class unwitnessed — the
"paragraph of excuse forever". It does not have to. The screen masks the
datapath's *result*, not its *wires*: on a screened both-zero input the
datapath still computes, and the gate's output is observable hierarchically.
`tb_d9wit.v` (prototyped this session, 17 vectors) drives all 16 signed-zero
quads plus one cancellation-born-zero quad into `fp32_add4_tree` and asserts
the contract invariant **on the DUT's own wires**, per instance:

```verilog
if (dut.u_add_ab.u_addsub.exact_zero === 1'b1 &&
    dut.u_add_ab.u_swap.eff_sub !== 1'b1)  -> FAIL   // and u_add_cd, u_add_r
```

with two guards so the check itself is falsifiable (ch10's T7 lesson applied
to an invariant): a 17-check count guard, and an **armed counter** — the run
fails unless at least one instance actually reached `eff_sub = 0` with
`sum27 = 0`, i.e. unless the invariant was ever in a position to fail.

Measured: shipped design — `PASS tb_d9wit (17 vectors, invariant armed 27
times across 3 instances)`. B-M2 build — **27 FAIL lines**, the first on the
all-`+0` quad at all three instances, including `u_add_r` armed purely by
*born* zeros. Chapter 10's one genuine mutation-record survivor is killable
after all — by observing the wire the screen cannot mask.

The witness was then mutation-tested itself (standing practice): disabling
the arming counter makes the run FAIL (`invariant never armed`) — a witness
that lost its stimulus, or was re-aimed somewhere the condition cannot
occur, announces its own vacuity rather than passing; and deleting the
check calls trips the count guard (`0 checks ran, expected 17`). Both
guards fire on the correct design, so neither can be lost silently.

## 6. D9: the recommendation

**Recommendation: option (b) plus the witness.** Accept the shipped design in
writing — the section 5.1 proof and the 2,000,320-vector zero-divergence
search are the acceptance document — and ship the D9 witness inside chapter
12's corner suite (the invariant check plus the 16 signed-zero quads and the
cancellation-born-zero quad, count- and armed-guarded), so the mutant class
has a standing composition-level killer from chapter 12 forward. Fold the
same invariant into the coverage model as a never-bin (section 8). Do not
change any shipped module.

Why not (a), despite the mandate's stated preference for a clean fix:

1. **The preference's premise is measurably false.** "A latent bug carried
   into the flagship design needs a paragraph of excuse forever" — but no bug
   is carried: the shipped function is *proven equal* to the specified
   function at every observable boundary (section 5), and with the witness the
   class is no longer even unwitnessed. What would ship under (b)+witness is
   a proof and a live check, not an excuse. This project's standing rule is to
   write the weaker true statement; the true statement here is "correct
   design, formerly unwitnessable contract clause, now witnessed".
2. **(a) as literally mandated does not exist.** The only fix *to
   `fp32_addsub`* (a1) breaks ch09's unit bench — so "all downstream stays
   green" is unsatisfiable by it — and measurably relocates the latent region
   into `fp32_round_pack` rather than removing it (section 4.1).
3. **The fix that IS clean (a2) is a different, bigger decision.** Unscreening
   zeros passed every downstream sweep bit-for-bit (100,092 + 240k×2×2 +
   17/17 harness targets) and makes B-M2 die in the existing suites — the
   measurements are all in section 4.2 and the writer can adopt a2 with
   confidence *if the orchestrator wants it*. But it edits a taught module in
   a chapter closed at 9/10 and falsifies stated invariants in the prose of
   chapters 9, 10, and 11. That is a curriculum change purchased to close a
   verification hole that a 17-vector white-box bench closes for free. The
   sweep is cheap; the churn is not; and the pedagogical loss is real — the
   zeros-in-the-screen design is the textbook treatment the guide teaches.
4. **The witness is chapter-12-shaped.** Ch12's brief already includes
   coverage sampled from the DUT's own wires (ch11's rule) and the corner
   suite carrying "D9's witness vector (whichever disposition)". A white-box
   invariant with an armed-guard is exactly the technique the chapter exists
   to teach: black-box campaigns measured powerless at any size (ch10),
   hierarchy as the instrument that isn't (T7/T8 discipline).

What the chapter should say, in one honest sentence: *the four-input adder
carries a module whose contract includes one clause no output can witness;
chapter 12 proves the clause can never matter (proof + 2M adversarial
vectors), and then witnesses it anyway, on the wire, in the shipped suite.*

If the orchestrator overrides toward a2, the complete change is the four
`fp32_screen.v` lines quoted in 4.2, and the re-verification bill measured
this session is ~12 minutes of sweeps plus prose edits in ch09 (screen
listing, header invariant, step-10 prose), ch10 (README D9 row, structural
proof paragraph, chapter section "NaN Birth Sites and Signed Zero, Composed"),
ch11 (bridge), and STATE.md. `tb_addsub_u`, `tb_equiv`, `tb_corners_split`,
and every other shipped bench pass unmodified.

## 7. The complete design: fp32_add4, assembled and proven

### 7.1 What the top is

`fp32_add4` was assembled in the scratchpad and is deliberately anticlimactic
— that is the chapter's thesis. It is chapter 11's `fp32_add4_tree_p` body
with the flagship name: three `fp32_add2_p2` instances in chapter 10's tree
shape `(a+b)+(c+d)`, valid chained level to level, plus the 2-cycle level-1
flag delay line (6 flops). Every datapath line is a shipped module
instantiated verbatim — ch09's seven stages inside ch11's register banks
inside ch10's tree — and under the section 6 disposition **no shipped module
changes**. Ports: `clk, rst_n, in_valid, a, b, c, d` in; `result, invalid,
overflow, inexact, out_valid` out. Latency 4, one quad per cycle, 336 state
bits, `rst_n` clears only the valid pipes.

Depth, chosen from ch11's priced cuts: **three p2 units, latency 4, 336
bits.** The alternatives price out as: combinational tree (latency 0, 0
bits, the whole two-level cloud in one cycle); p2-tree 336 bits / latency 4;
p4-per-unit tree 3×284 + 12 = 864 bits / latency 8; pipelined *sequential*
chain 540 bits / latency 6 (ch11's counted figure) — all at the same
one-per-cycle throughput. With no synthesis tool in the environment, no
depth can claim an Fmax number (the epistemic wall ch11 held), so the choice
maximizes what IS measurable: the p2 cut sits at ch09's cheapest priced seams
(73/35 bits), costs the fewest registers of any pipelined option, and the p4
upgrade is documented as the option a reader with a synthesis target
evaluates — exactly the framing ch11's review endorsed for this chapter.

### 7.2 The proof chain, all run this session

| Link | Instrument | Result |
|---|---|---|
| `fp32_add4` == combinational `fp32_add4_tree`, streamed | `tb_add4_stream.v` — ch11's mutation-tested harness retargeted (LAT=4 scoreboard, `!==` + X-guard, X-data bubbles, drain-under-X, count guards, seed 9090 once, first draw discarded) | **PASS: 101,019 valid quads** (16 directed + 100,000 five-regime random + 1,003 mix) + 1,000 bubbles, 0 mismatches, 55.8 s |
| `fp32_add4` == the order-faithful golden chain `ref_add4_tree` (3 × ch08 `fp32_add_alg` in tree order), streamed | `tb_add4_gold.v` — same harness, oracle swapped, fresh seed 777214 | **PASS: 101,013 valid quads** + 1,006 bubbles, 0 mismatches — full-32-bit result compare, so NaN payloads included, plus all three flags — 59.6 s |
| Combinational tree == an **independent exact model** | `oracle.py`: per-stage exact `Fraction` arithmetic + hand RNE, design-semantics screen (a-priority NaN payload, quiet-bit force, signed-zero rules, +0 cancellation), flags per stage, OR-composed | **1,000,256 quads and 1,000,064 pairs from the section 5 transcripts re-verified: 0 mismatches, results AND flags** (16.7 s + 56.2 s of python) |

The chain closes: pipelined flagship → combinational tree → golden chain →
(ch08's record) → exact rational arithmetic — and independently, flagship →
golden chain directly, and tree → fresh exact model directly. The fresh
model matters: it was written this session from the spec, not from the RTL,
so agreement is two implementations meeting, not one implementation quoted
twice (ch09's I-7 lesson: an equivalence sweep proves "same as", not
"correct"; the second reference discharges the other obligation).

### 7.3 Accuracy against the single-rounding oracle, re-measured

`oracle.py` also carries the correctly-rounded four-input oracle (one exact
sum, one RNE rounding). Fresh census, 50,000 quads per regime, seed 20260821,
uniform significands with exponents drawn per regime:

| Regime | composed == correctly rounded | differs |
|---|---|---|
| win2 (exponents in a 2-wide window) | 73.12 % | 26.88 % |
| win10 | 69.49 % | 30.51 % |
| full range | 98.29 % | 1.71 % |
| section 5's zero-heavy adversarial stream (996,804 all-finite quads) | 99.336 % | 0.664 % |

Consistent with ch10's measurements (its 20.46/21.51 % figures condition on
tree/seq agreement; these are unconditional), and the spec cites both: the
design rounds three times and is NOT a correctly-rounded four-input sum on a
fifth to a third of clustered-exponent traffic. No stronger claim survives
measurement, so the spec makes none.

## 8. The coverage model, extended

### 8.1 What was built

`tb_cov4.v` (prototyped, 105 bins) extends ch05's 34-bin model with every
never-cashed dimension, sampled from **the pipelined DUT's own wires** under
ch11's stage-correct qualification rule — each bin reads a wire in the stage
where its transaction lives, qualified by that instance's own valid
(`in_valid` / `dut.v_ab` for stage-1 wires, `dut.u_add_X.vpipe[0]` plus
`~p1_screen` for stage-2 wires, `out_valid` at retire):

| Dimension | Bins | Never-cashed seed it pays |
|---|---|---|
| operand class cross, per level-1 pair | 25 × 2 | ch05's cross, now at both tree positions |
| \|exponent difference\| buckets, per pair | 4 × 2 | ch05, incl. the widening subtlety |
| **sign / effective operation**, per instance | 2 × 3 | ch05's ALL_POSITIVE blind spot |
| **normalize partition** right-1 / none / left-N, per instance | 3 × 3 | ch08 I-rows as white-box bins per stage |
| **rounding events** — guard set, sticky set, tie-up taken, tie-down taken, round-up, **rounding-carry renormalize** — per instance | 6 × 3 | ch05/ch08's rounding-event seed; the reachers get a bin at every stage |
| **intermediate events** — stage-1 overflow ×2, stage-1 NaN born ×2, stage-1 subnormal result ×2, inter-pair cancellation shallow (shl 1-7) / deep (shl ≥ 8), stage-2 exact cancellation | 9 | ch10's composition events |
| result class at retire | 5 | ch05 |
| **D9 never-bin**: `exact_zero` with `eff_sub` low, all three instances | (must be 0, must be armed) | section 5.3's invariant as coverage |

Total: **105 counted bins + the armed never-bin**, with a 57-quad
deterministic directed phase and three random regimes (ch05's
biased menu, raw fields, clustered win2; `$urandom` seeded once, first draw
discarded; 18,057 quads, 3.8 s; 329 lines of Verilog plus three generated
include files).

### 8.2 The measured closure story

- **Full run**: `PASS tb_cov4 (18057 quads, 105/105 bins, pins matched, D9
  never-bin armed 27121 and empty)`. The directed phase alone closes 105/105
  (a designed floor, ch05's corner-library principle); the pins (section 9)
  hold.
- **Random-only, signs free, 18,000 quads**: **98/105 — FAIL, 7 holes**, and
  the hole list is ch08's lesson recurring at composition scale: all three
  `round_renorm` bins (the rounding-carry renormalize — 0 hits in 18k
  random, exactly as ch08 measured 0 in 1M), both stage-1 overflow bins,
  stage-2 exact cancellation, and result-class ZERO. These are the
  directed-only bins, now *named by measurement*.
- **ALL_POSITIVE random-only (the ch05 demonstration, re-run against the
  extended model)**: **91/105 — FAIL, 14 holes.** The 7 above plus
  `effop[sub]` at all three instances, `norm[leftN]` at all three, and both
  inter-pair-cancellation bins. (Corrected 2026-08-21 by the ch12 review:
  that enumeration adds to 15, not 14 — one of the "7 above", a stage-1
  overflow bin, is NOT a hole in this run because all-positive traffic
  reaches stage-1 overflow by luck; the chapter's s1_ovf_ab note has it
  right and 91/105 = 14 holes is the measured truth.) **The ch05 debt is cashed**: the stimulus
  that closed the old 34-bin model 34/34 while never performing one
  effective subtraction now fails loudly, with the missing dimension
  spelled out bin by bin. (Under the extension the old demonstration
  reverses: closure now DOES measure the sign dimension — the honest
  statement is that closure measures whatever the bins encode, no more,
  which is why section 9 exists.)

The honest closure statement for the chapter: *directed closes everything by
construction; 18k of well-shaped random closes 98/105 and can never close
the last seven; all-positive stimulus is now detected instead of certified.
Closure still measures stimulus against the model — but the model itself is
now falsifiable (section 9), which is what makes the number worth
reporting.*

## 9. Mutation-testing the bins themselves (the M18 debt)

Ch05's recorded blind spot: "the bin *definitions* in `tb_covfp.v` are
themselves unverified. Moving the `expdbin` sticky boundary from 25 to 60
still closes 34/34 silently." This is the project's last unpaid verification
debt, and this section pays it with a mechanism, then attacks the mechanism
until it holds.

### 9.1 The guard: every bin definition implemented twice, counts pinned

The design: the 57-quad directed phase is deterministic, so every bin's
count over it is a *predictable number*. `cov_gen.py` implements **every bin
definition a second time, independently, in python** on top of the
algorithm-level event model (`hwmodel.py` — ch08's golden steps re-written
from the documented algorithm, validated three-way against the spec-level
model AND the RTL transcripts on 1,000,064 pairs, 0 mismatches), runs the
directed list through it, and emits the 105 expected counts as
`cov_pins.vh`. After the directed phase drains, the bench compares **every
counter against its pin with `!==`**, printing the bin's name on divergence.
A bin definition edited in the bench alone now breaks against python; edited
in python alone breaks against the bench; edited in both is a reviewable
spec change. On top of the pins: partition invariants over the whole run
(right1+none+leftN == stage-2 samples per instance; eff-add+eff-sub ==
stage-1 datapath samples; tie-up+tie-dn == ties; renorm ≤ round-up;
result-class sum == retired == driven), and the armed D9 never-bin.

### 9.2 The battery: nine bin-definition mutations, and what the first round taught

Each mutation edits the *coverage model*, not the DUT; the correct design
runs underneath every time. First round: 7 killed, **2 survivors — both
genuine holes in the guard as first built**, both fixed by changing the
directed library, both re-killed:

| # | Bin-definition mutation | Result | Killed by |
|---|---|---|---|
| m1 | `expdbin` sticky boundary 25 → 60 (ch05's exact recorded silent edit) | **KILLED** | pins: `bin 52 expd_ab[d<25] = 7, python model pins 4` — the library carries d = 24/25/26/27 straddling the boundary |
| m2 | tie redefined `ng & ~nr` (sticky dropped from the tie test) | KILLED | pins: `rev_ab[tie_up] = 3, pins 1` |
| m3 | renormalize bin re-aimed at the WRONG instance's rounder (existing wire — elaborates clean; ch10's T7 class) | KILLED | pins: `rev_r[round_renorm] = 2, pins 1` |
| m4 | stage-2 qualification mistimed: `vpipe[0]` → `vpipe[1]` | **survived round 1, KILLED after the fix** | pins: `norm_ab[none] = 11, pins 15` |
| m5 | inter-pair-cancel deep boundary 8 → 16 | **survived round 1, KILLED after the fix** | pins: `cancel_r_shallow = 3, pins 2` |
| m6 | `sample_all` call deleted | KILLED | pins (every bin 0 vs its pin) — note ch05's version of this died only via the hole gate; pins catch it per-bin |
| m7 | `~screen` qualification dropped from an eff-op bin | KILLED | pins: `effop_ab[add] = 51, pins 18` — screened traffic bumping a datapath bin |
| m8 | D9 never-bin condition inverted | KILLED | `exact_zero fired on an effective add 59 times` |
| m9 | the PIN TABLE itself corrupted (one count ±1) | KILLED | pins, other direction — the guard is two-sided |

**The two round-1 survivals are the section's real findings, because each is
a way the pinned-count guard itself can silently not-guard:**

1. **m4 (mistimed qualification) survived because the pinned phase was
   back-to-back traffic whose first quad was screened.** Under back-to-back
   valids, the stage-2 wires always show the `vpipe[0]` transaction, so a
   one-cycle-late qualifier samples the same stream shifted — losing ONLY
   the first quad's events — and the original library's first quad (all
   +0s) had no stage-2 datapath events to lose; the trailing mistimed
   sample self-cancels because the bubble's `p1_screen` is X. Fix, measured:
   make the FIRST directed quad a live-datapath quad and put bubbles
   *inside* the pinned phase (one every 7 quads) so valid/invalid
   alternation distinguishes `vpipe[0]` from `vpipe[1]`. Ch11's rule
   sharpened: **a stage-qualification bug is invisible to a pinned phase
   that never breaks the valid stream.**
2. **m5 (boundary moved 8 → 16) survived because the directed library's
   cancel vectors sat at shl = 1 and shl = 23 — both sides of BOTH
   boundaries.** A pinned count makes a boundary falsifiable only if the
   library **straddles it adjacently**: vectors at shl = 7 and shl = 8 were
   added, and the mutation dies. Ch08's adjacency principle, promoted from
   result checking to bin-definition checking.

Final battery: **9/9 killed** against the fixed 57-quad library, control
still `PASS ... pins matched`. The M18 class now has a standing witness, and
the two guard weaknesses it took to get there are chapter material.

## 10. The corner suite, organized by the chapter 5 taxonomy

### 10.1 Assembly and census

`tb_corners12.v` + `corner_list.vh` (generated by `corner_gen.py`, every
expectation pinned by the session-validated python models): **321 directed
quadruples**, run against the *pipelined* `fp32_add4` one at a time with the
full latency protocol asserted per vector — `out_valid` low for exactly 3
cycles after the drive, high for exactly 1 carrying the result, low again.
**321/321 PASS in 0.14 s.**

| Family | Quads | Content |
|---|---|---|
| P-ab / P-cd / P-r | 92 + 92 + 92 | **ch08's complete 46-pair library, parsed from `tb_corners.v` and lifted to quadruples** at all three tree positions, both operand orders. The lift uses screened zeros as pass-throughs: `(x,y,+0,+0)` computes the pair at level-1 ab, `(+0,+0,x,y)` at cd, `(x,+0,y,−0)` at the FINAL adder — so every taxonomy row A-I now executes at every position in the tree, including the four rounding-carry reachers and the campaign-added M16 kill pair. (At-r lifts of NaN rows deliver level-1-quieted NaNs — a composition scenario of its own; the model pins it exactly.) |
| J-ch10 | 12 | ch10's composition rows re-pinned for the tree: Q1-Q3 (intermediate overflow that cancels), N1-N5 (NaN born at every stage; payload/quieting rows), Z1, S1/S2 (inter-pair cancellation both directions), SB (subnormal crossing a boundary) |
| Z16 | 16 | all 16 signed-zero quads — the measured −0-iff-all-−0 rule, and the D9 witness values |
| D9-born | 1 | the cancellation-born-zero quad that arms the stage-2 gate |
| ADJ | 6 | the adjacency block: d = 24/25/26/27 across the sticky/clamp boundaries, and inter-pair cancel at shl = 7 and shl = 8 |
| MULTI | 6 | {max, max, −max, −max} through **all 6 distinct port orders** — 2 orders → qNaN/111, 4 → +0/000, the spec's S1 census executed |
| TIE-r | 4 | stage-2 ties both directions, by both routes (zero-fed and computed level-1 sums) |
| **Total** | **321** | |

Taxonomy accounting against ch05's rows A-I: A (zeros) rows ride in P-lifts
of ch08 group A plus Z16; B (subnormals) in P-lifts of group B plus SB; C
(NaN) in P-lifts of group C plus N1-N5; D (infinities) in P-lifts of group D
plus Q1-Q3; E (sticky region) in P-lifts of group E plus ADJ; F
(cancellation) in P-lifts of group F plus S1/S2/D9-born; G (rounding, ties,
renormalize) in P-lifts of group G plus TIE-r; H (overflow) in P-lifts of
group H plus Q1-Q3/MULTI; I (shifter paths) in P-lifts of group I plus the
coverage model's per-stage partition bins; J (four-input specifics) is
J-ch10 + MULTI + ADJ + Z16 wholesale. Every row of the taxonomy has at
least one vector at every tree position where it is expressible.

NaN rows follow the project rule: class + quiet bit compared always, payload
[21:0] compared when the expectation is a propagated payload (mode 1),
generated NaNs class+quiet only (mode 2), **sign never**.

### 10.2 The suite can fail (standing practice)

| Mutation | Result |
|---|---|
| c1: one python-pinned constant bent 1 ulp (`4B800002` for `4B800001` on the S2 row) | KILLED: `got 4b800001/001 expected 4b800002/001` |
| c2: one row deleted | KILLED: `319 checks ran, expected 321` (count guard vs the generated total) |
| c3: **B-M2 through all 321 quads** | **SURVIVES — as section 5's proof requires.** The suite includes all 16 signed-zero quads and the born-zero quad, and no OUTPUT differs; this is the measured demonstration that the corner suite alone cannot witness D9 and `tb_d9wit`'s wire check is load-bearing, not decorative. |
| c4: ch11's NOFD skew mutant (level-1 flag OR taken combinationally in `fp32_add4`) | KILLED 322 lines — under the serial protocol the combinational OR reads the bubble's X-data flags at retire time, and the X-guard catches every vector: `X in outputs 00000000/xxx` |

One protocol note worth a paragraph in the chapter: the corner suite's
one-quad-at-a-time protocol and the streaming harness catch the SAME skew
bug by different mechanisms — streaming catches NOFD because flaggy traffic
sits adjacent to benign traffic (ch11's design), while the serial protocol
catches it because the neighbors are X-data bubbles and the mis-timed OR
drags X onto defined outputs. Neither protocol subsumes the other: serial
would miss a skew bug between two *valid* transactions (there are none in
its stream), and streaming's scoreboard would absorb a latency-protocol
bug that the serial bench pins cycle-by-cycle (`out_valid` low 3, high
exactly 1). The kit ships both because they discharge different clauses of
spec S7.

## 11. Regression economics

Everything timed on this container, this session, single runs.

**The chapter's kit as prototyped:**

| Bench | Checks | Time | Ship in targets.txt? |
|---|---|---|---|
| `tb_corners12` (321-quad python-pinned library, latency protocol per vector) | 321 | **0.14 s** | yes |
| `tb_d9wit` (white-box invariant, armed 27×) | 17 | **0.01 s** | yes |
| `tb_cov4` (105 bins, pins + partitions + never-bin, 18,057 quads) | 18,057 | **3.8 s** | yes |
| `tb_add4_stream` vs combinational tree, at 101,019 quads | 101k | 56.0 s | **no — resize to 60k** |
| — same at 60,992 quads (`NPR = 12000`) | 61k | **34.1 s** | yes |
| `tb_add4_gold` vs order-faithful golden chain, at 101,013 quads | 101k | 59.7 s | **no — resize to 60k** |
| — same at 61,037 quads | 61k | **36.1 s** | yes |

Shipped-kit total at the recommended sizes: **~74 s for five targets**, all
individually inside the 60 s `SIM_TIMEOUT` with ≥ 40 % margin. The 100k+
streaming runs stay in the chapter's prose as the headline numbers, re-run
out of harness (ch10's precedent with its 240k sweep). The timeout margin is
not paranoia: **the shipped ch11 `tb_stream4` — same 101k workload — measured
56.0 s on this container today against 36.7 s in ch11's record.** Same
sources, same simulator version; only the container differs. A target sized
to 60 % of the timeout on one machine is a coin-flip on another; sized to
55-60 % of the *slowest measured* machine it survives. (Also flagged in
section 12 — ch11's manifest comment "fit the 60 s SIM_TIMEOUT with margin"
is now a thin claim.)

**The documented long soak** (run before shipping the chapter, quoted in
prose, not in targets.txt):

| Soak | Size | Time |
|---|---|---|
| ch10's `tb_equiv4 -DNQ=60000` (240k × 2 × 2) | 960k checks | 8 m 50 s |
| D9 adversarial pair diff (2 builds + diff) | 2 × 1,000,064 | 2 × 1 m 20 s |
| D9 adversarial quad diff (2 builds + diff) | 2 × 1,000,256 | 2 × 3 m 39 s |
| python oracle re-verification of both transcripts | 2.0 M vectors | 73 s |
| CR-agreement census (3 regimes × 50k, pure python) | 150k quads | ~3 m |
| **Soak total** | ~5.3 M checks | **~25 min** |

Full-repo context: the repo regression is 103 targets before ch12; the five
recommended ch12 targets bring it to 108 and add ~74 s. The whole downstream
re-verification bill for a design change (the a2 measurement of section 4.2)
is ~12 minutes — worth stating in the chapter as the price of a one-module
edit at the bottom of an 11-chapter dependency tree.

## 12. Contradictions and sharpenings for earlier chapters

Nothing measured this session contradicts a shipped chapter's claims. Six
sharpenings, each with its measurement:

1. **STATE.md's D9 shorthand overstates.** The RESUME HERE block says
   "ch09's latent `exact_zero` **bug** in `fp32_addsub`". Measured (sections
   3-5): the shipped module and composition are correct; the latent object
   is a *mutant class without a composition-level witness*. The run-log
   entries for ch10 use the same shorthand. Recommend a dated correction
   when ch12 closes — the distinction is exactly the kind this project
   polices.
2. **Ch10's structural proof, extended by a1's measurement.** Ch10 proved
   the screen masks the gate *where it is*. Section 4.1 adds: the mask is a
   property of the screen/datapath redundancy, so relocating the gate
   relocates the latency (measured: the relocated-gate mutant passes the
   same 100,092 checks). Worth one sentence in ch12 and a cross-reference
   from ch10's README row if it is ever touched again.
3. **Ch11's SIM_TIMEOUT margin claim has aged.** Ch11's manifest comment:
   the streaming sweeps "fit the 60 s SIM_TIMEOUT with margin". Measured
   today on this container: the shipped `tb_stream4` runs **56.0 s** against
   ch11's recorded 36.7 s — same sources, same Icarus 13.0, different
   container day. The target still passes, but the margin is 7 %. Ch12
   should size its own streaming targets to ~60 % of the timeout (its 60k
   versions run 34-36 s) and the F1/F2 passes should know the ch11 target is
   the regression's tightest timing.
4. **Ch05's two recorded blind spots are both closed, with numbers.** The
   ALL_POSITIVE demonstration (closure without one effective subtraction)
   now FAILS the extended model with 14 named holes; the unverified-bin
   debt (expdbin 25→60 silently green) is now a pin kill (`expd_ab[d<25] =
   7, pins 4`). Ch05's README pointers can be marked cashed when ch12
   ships.
5. **Ch08's "random never reaches the rounding-carry renormalize" holds at
   composition scale, again**: 0 hits in 18,000 well-shaped random quads
   across all three instances (and 0 in 1M in ch08's record); only directed
   vectors fill those bins. Also reconfirmed: the four reachers still reach
   — now at all three tree positions via the P-r lifts.
6. **Fresh unconditional CR-agreement numbers complement ch10's
   conditioned ones** (section 7.3): composed-vs-correctly-rounded
   disagreement is 26.9 % (win2), 30.5 % (win10), 1.71 % (full range)
   unconditionally — note win10 is *worse* than win2 on this measure while
   ch10's order-agreeing-conditioned measure ordered them the other way.
   Regime direction-flips again; neither chapter should claim a monotone
   "more clustered = worse" law.

## 13. Open questions for the writer

1. **The D9 disposition needs the orchestrator's sign-off.** The
   recommendation (section 6) is (b) + witness, against the mandate's
   stated preference for a fix — because the preference's premise measured
   false and the literal fix (a1) fails its own cleanliness bar. If the
   orchestrator wants a design change anyway, a2 is fully measured and its
   bill itemized (section 4.2/6). Do not split the difference: either the
   shipped modules stay verbatim (recommended) or a2 lands with all its
   prose edits in one unit.
2. **Naming.** The prototype `fp32_add4` is `fp32_add4_tree_p` renamed. The
   chapter can (i) ship `fp32_add4.v` as a new file whose body instantiates
   the three `fp32_add2_p2`s directly (what the prototype does), or (ii)
   make `fp32_add4` a one-instance wrapper around `fp32_add4_tree_p`.
   (i) reads better as "the complete source" and duplicates ~40 lines;
   (ii) is honest about provenance but makes the flagship a shim. The
   research leans (i) with a header crediting ch11 — the chapter IS
   allowed to restate its own final design.
3. **Generated include files vs the repo conventions.** `cov_pins.vh`,
   `cov_names.vh`, `cov_dirlist.vh`, `corner_list.vh` are emitted by python
   generators. The repo rule is that chapter directories hold `.v`, `.md`,
   `targets.txt` and every listing is a real compiled file. Options:
   (i) check in the generated `.vh` files (they ARE text sources; the
   generators become chapter listings quoted in prose, with a "regenerate
   and diff" instruction — recommended, keeps `run_all.sh` python-free);
   (ii) inline the generated content into the benches (loses the two-
   implementation independence argument's visibility). If (i), `run_all.sh`
   needs `.vh` files to ride along silently — verify the runner copies the
   whole chapter directory (it rebuilds from scratch in a temp dir; check
   it takes non-`.v` files too).
4. **Target sizes**: ship the 60k streaming benches (34-36 s), keep 101k as
   prose headlines. Consider whether `tb_add4_gold` earns its target slot
   or lives as a soak — the research says ship it: it is the only
   *shipped* bench anywhere that checks the pipelined flagship against the
   golden chain directly, and 36 s is affordable.
5. **The spec's home**: the numbered spec (section 2) belongs at the head of
   the chapter, before any RTL, so the corner suite reads as clause
   discharge. Suggest cross-reference tags (S1..S10) from each corner
   family to the clause it tests — the census table in 10.1 already maps.
6. **Word-count risk is low**: the chapter assembles rather than derives.
   The heavy derivations (proof, adversarial method, guard design) are in
   this document; the chapter needs their conclusions and the numbers.
7. **Transcripts worth quoting verbatim in the chapter** (all captured this
   session, all reproducible): the B-M2 unit kill line and the composed
   `PASS tb_equiv` beneath it (the masking pair, side by side); `PASS
   tb_d9wit (17 vectors, invariant armed 27 times across 3 instances)`
   against its 27-FAIL mutant twin; the coverage control line `PASS tb_cov4
   (18057 quads, 105/105 bins, pins matched, D9 never-bin armed 27121 and
   empty)`; the ALL_POSITIVE 14-hole failure with its hole list (the ch05
   payoff); one pin-kill line (`bin 52 expd_ab[d<25] = 7, python model pins
   4` — the M18 debt paying off in one line); the two streaming PASS lines;
   and the `(-0)+(-0)` kill from the a2 measurement if the chapter tells
   that story. The `FAIL` strings in mutant transcripts must be quoted as
   indented text, never echoed by a shipped testbench (the harness greps
   for the literal).
8. **Reviewer ammunition (persona: RTL veteran)**: the likely challenges
   are (i) "why is the witness not a design fix?" — sections 4-6 are the
   prepared answer, lead with the a1 relocation measurement; (ii) "is the
   hierarchical witness robust to renaming?" — T8's precedent: a stale
   path is an elaboration error, and the armed guard catches a re-aim to a
   valid-but-impossible site; (iii) "does the serial corner protocol
   under-test streaming behavior?" — 10.2's protocol note plus the shipped
   streaming benches; (iv) re-derivation of the 105 pins — `cov_gen.py`
   reruns in under a second and the reviewer should be invited to move a
   boundary and watch it fail.

## 14. Sources

This chapter's authority is almost entirely measurement — its own (all runs
above, reproducible from the scratchpad artifacts and the shipped repo) and
the prior chapters' research documents, which carry their own source lists.
External sources consulted for framing only, no URLs fetched this session
(none needed; nothing below is load-bearing for a number in this document):

1. IEEE Std 754-2019, *IEEE Standard for Floating-Point Arithmetic* —
   Clause 4 (roundTiesToEven), Clause 5 (addition; the sign of exact-zero
   sums, per ch05/ch07's verified readings), Clause 6 (NaN propagation left
   implementation-defined — the basis for S5's "measured behavior, not a
   guarantee"),
   Clause 7 (default exception handling; underflow's tininess-and-inexact
   condition — the basis, with ch07's measurement, for omitting the flag).
   `[title-only]`
2. J.-M. Muller et al., *Handbook of Floating-Point Arithmetic*, 2nd ed.,
   Birkhäuser, 2018 — the single-rounding vs per-operation-rounding
   distinction for sums of several operands; background for S3/S10's
   correctly-rounded-sum exclusion. `[title-only]`
3. P. H. Sterbenz, *Floating-Point Computation*, Prentice-Hall, 1974 — the
   exact-subtraction lemma behind the underflow-omission proof (ch07
   measured the consequence; ch08 verified the lemma exhaustively in a toy
   format). `[title-only]`
4. J. R. Hauser, *Berkeley TestFloat* — the differential-testing
   architecture the guide's oracle discipline mirrors; already cited with
   details in ch05's research. `[title-only]`

Every number in this document was produced this session by the commands and
files described in place; the scratchpad artifacts (`oracle.py`,
`hwmodel.py`, `cov_gen.py`, `corner_gen.py`, `tb_d9adv*.v`, `tb_d9wit.v`,
`tb_cov4.v`, `tb_corners12.v`, `tb_add4_stream.v`, `tb_add4_gold.v`,
`fp32_add4.v`, the a2 tree, and the transcript logs) were left in the
session scratchpad for the writer.
