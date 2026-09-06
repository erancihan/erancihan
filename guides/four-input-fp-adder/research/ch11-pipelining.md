# Chapter 11 research — Pipelining, timing concepts, synthesis considerations

<!-- sections complete: 14/14 -->

Research for the chapter that registers the proven combinational datapath.
Everything measurable was measured under Icarus Verilog 13.0
(`iverilog -g2012 -Wall` + `vvp`, the project's standard flow); everything
about physical timing is documentation behind the epistemic wall stated in
section 11 — **no synthesis tool exists in this environment**.

## 1. What was built, and the experiment inventory

Built and proven this session, all in the scratchpad, all from the
UNMODIFIED ch09/ch10 modules:

- **`fp32_add2_p2`** — 2-stage pipelined `fp32_add2` (cut at the 73-bit
  addsub seam + registered outputs; 110 state bits; latency 2).
- **`fp32_add2_p4`** — 4-stage version (100/73/72-bit seams + outputs;
  284 state bits; latency 4).
- **`fp32_add4_tree_p`** — the pipelined four-input tree: three
  `fp32_add2_p2` in ch10's tree shape, latency 4, plus the level-1
  flag-delay line that is the composition's one new design obligation.
- **`tb_stream` / `tb_stream4`** — the continuous-streaming equivalence
  harnesses (new operands EVERY cycle, LAT-deep shared-index scoreboard,
  `!==`+X-guard, per-cycle `===` valid checks, count guards), each proven
  against the corner library + 100k five-regime random + bubble/drain
  adversaries, and each mutation-tested.
- Deliberate mutants: `_skew` (one unregistered cut signal), `_blk1` /
  `_blk2` (blocking in an interior / the output bank), `_undrv` (an
  undriven pipe register), `_rstall` (full datapath reset), `NOFD` (flag
  delay omitted), `DIRECTF1` (flag OR read directly), plus four harness
  mutations.

Inventory: **9 numbered experiments** (streaming equivalence x2 depths;
skew; blocking + 3 scheduling probes; cold-start x5 configurations;
single-bit X injection; the pipelined tree + the 3-way composition
matrix; VCD latency parse x2 depths; `$display`/`$strobe` at a bank;
same-edge driving x2 styles x2 shapes) plus the harness-mutation
campaign — **30 Verilog files written, 42 compiled configurations run,
well over 1,000,000 streamed transaction checks** across the twelve full
101k-slot sweeps, every one compiled `-g2012 -Wall` with zero output
except where a diagnostic was the point. Headline results: both pipeline
depths and the pipelined tree are **bit-identical to their combinational
parents over every check ever run**; five distinct pipeline-specific bug
classes were built and measured (skew, flag mis-alignment, blocking
banks, illegal reset state, valid/data tearing), and each one PASSES a
plausible weaker harness while the streaming harness kills it — that
asymmetry is the chapter.

## 2. The cuts: two pipeline depths, justified from chapter 9's seams

Chapter 9 priced every seam (its research notes, section 3, machine-counted
from the shipped port lists — screen side channel of 34 bits included in
every cut): **100** bits after unpack/screen/swap, **95** after align,
**73** after addsub, **72** after normalize. Two pipelined versions of
`fp32_add2` were built from the UNMODIFIED ch09 modules — not one line of
datapath logic was rewritten; pipelining is pure wiring plus register
banks, which is itself the chapter's first lesson (the ch09 decomposition
is what makes this chapter cheap):

**`fp32_add2_p2` — 2 stages, latency 2.**
Stage 1 = unpack + screen + swap + align + addsub; **bank 1 = the 73-bit
addsub cut** (the cheapest interior seam, sitting right after the deepest
front-half logic — the 26-bit alignment shift and the 27-bit subtract —
exactly the "cheap cut after deep logic" coincidence ch09 flagged);
stage 2 = normalize + round_pack + the screen mux; **bank 2 = the 35-bit
output cut** (`result` + 3 flags). Registered outputs are part of the
design: an unregistered final mux would hang the whole round/normalize
cloud on the output port and re-expose it to whatever the consumer does.

**`fp32_add2_p4` — 4 stages, latency 4.**
Bank A = the 100-bit swap cut, bank B = the 73-bit addsub cut, bank C =
the 72-bit normalize cut, bank D = the 35-bit output cut. Stage logic:
S1 = unpack+screen+swap, S2 = align+addsub, S3 = normalize,
S4 = round_pack+mux. The **95-bit align seam is deliberately the one seam
NOT registered**: ch09's research notes predicted this verbatim ("align
and addsub are separate modules even though chapter 11 will probably
register them as one stage"), it is the most expensive of the three
interior seams, and fusing align+addsub keeps the G/R packing convention
(`sml27 = {1'b0, aligned, g, r}` — the boundary that hosted ch09's
only-integration-visible bug) inside a single stage.

Register-bit totals (counts of the built banks, not estimates):
`fp32_add2_p2` = 73 + 35 + 2 (valid pipe) = **110 state bits**;
`fp32_add2_p4` = 100 + 73 + 72 + 35 + 4 = **284 state bits**. Depth 4
costs 2.6x the flops of depth 2 for the same function — the concrete
area-for-frequency trade the timing section can only describe.

**The interface change is part of the specification.** Both modules add
`clk`, `rst_n`, `in_valid` and `out_valid` to ch09's pure-function port
list. The valid bit is a 1-bit shift register running beside the data —
one bit per stage, no decoding — and it is **the only reset domain in the
design** (measured consequences in section 7). The screen side channel
(`screen`, `screen_res[31:0]`, `invalid`) rides through every bank exactly
as ch09's cut table budgeted; the screen is computed once in the first
stage and its RESULT is pipelined, not recomputed.

Both compile with zero output under `iverilog -g2012 -Wall` together with
the ten untouched ch02/ch07/ch09 dependency files.

**The 2-stage source, verbatim** (the scratchpad dies with the session;
the writer rebuilds from here — the 4-stage version repeats the same bank
pattern at the A/B/C/D cuts with `a_`/`b_`/`c_`/`d_` prefixes and a
4-bit valid pipe):

```verilog
module fp32_add2_p2
  (input  wire        clk,
   input  wire        rst_n,
   input  wire        in_valid,
   input  wire [31:0] a,
   input  wire [31:0] b,
   output wire [31:0] result,
   output wire        invalid,
   output wire        overflow,
   output wire        inexact,
   output wire        out_valid);

  // ---- stage 1 combinational: golden steps 1-5 ----
  //   fp32_unpack / fp32_screen / fp32_swap / fp32_align / fp32_addsub,
  //   instantiated EXACTLY as in ch09's fp32_add2 (same wires: sa..sum27,
  //   exact_zero, screen, inv_scr, screen_res)

  // ---- bank 1: the 73-bit addsub cut ----
  reg        p1_sign_big, p1_eff_sub, p1_s_al, p1_exact_zero;
  reg [7:0]  p1_e_big;
  reg [26:0] p1_sum27;
  reg        p1_screen, p1_invalid;
  reg [31:0] p1_screen_res;
  always @(posedge clk) begin
    p1_sign_big   <= sign_big;
    p1_eff_sub    <= eff_sub;
    p1_s_al       <= s_al;
    p1_exact_zero <= exact_zero;
    p1_e_big      <= e_big;
    p1_sum27      <= sum27;
    p1_screen     <= screen;
    p1_invalid    <= inv_scr;
    p1_screen_res <= screen_res;
  end

  // ---- stage 2 combinational: golden steps 6-9 + step 10 mux ----
  //   fp32_normalize(.eff_sub(p1_eff_sub), .sum27(p1_sum27),
  //                  .s_in(p1_s_al), .e_big(p1_e_big), ...)
  //   fp32_round_pack(.sign(p1_sign_big), .exact_zero(p1_exact_zero), ...)

  // ---- bank 2: the 35-bit output cut ----
  reg [31:0] p2_result;
  reg        p2_invalid, p2_overflow, p2_inexact;
  always @(posedge clk) begin
    p2_result   <= p1_screen ? p1_screen_res : dp_res;
    p2_invalid  <= p1_invalid;
    p2_overflow <= ~p1_screen & ovf;
    p2_inexact  <= ~p1_screen & inx_dp;
  end

  assign result   = p2_result;
  assign invalid  = p2_invalid;
  assign overflow = p2_overflow;
  assign inexact  = p2_inexact;

  // ---- valid pipe: the only reset domain ----
  reg [1:0] vpipe;
  always @(posedge clk)
    if (!rst_n) vpipe <= 2'b00;
    else        vpipe <= {vpipe[0], in_valid};
  assign out_valid = vpipe[1];

endmodule
```

(The two elided comment blocks are ch09 instantiations copied verbatim
from `fp32_add2.v` with only the bank-register renames shown in the port
hints; every experiment in these notes ran against the full files.)
Note also what the top-level mux became: ch09's `result = screen ?
screen_res : dp_res` moved INTO bank 2's non-blocking assignment — the
"a top module is wiring" discipline survives, with the wiring now
clocked.

## 3. The streaming-equivalence harness — the chapter's central verification move

Chapter 9's central move was the golden-equivalence sweep; this chapter's
is the same sweep **under continuous streaming**: a NEW operand pair every
cycle, results compared LAT cycles later. Section 5 measures why the
streaming is not optional. The harness (`tb_stream.v`, one source
compiled twice with `-DDUT=fp32_add2_p2 -DLAT=2` and `-DDUT=fp32_add2_p4
-DLAT=4`) has this shape, every piece of which earned its place:

- **Oracle: the combinational `fp32_add2` itself, in the same simulation.**
  The pipelined DUT's specification is "bit-identical to ch09's adder,
  LAT cycles late" — so the reference IS that adder, fed the same operands
  in the same slot. The equivalence chain to chapter 8's golden model and
  to exact arithmetic is inherited, not re-proven.
- **Expectation scoreboard: a LAT-deep circular queue, one slot per
  cycle.** At each negedge, slot index `cyc % LAT`: FIRST check the DUT's
  output against the expectation stored LAT cycles ago in that slot, THEN
  overwrite it with this cycle's new expectation (drive inputs, `#1` for
  the combinational reference to settle, store). Check-before-overwrite is
  the load-bearing ordering, and **one shared index computation serves
  both the check and the store**. That shape was mutation-tested both
  ways, with a surprise: shifting the shared index by one
  (`idx = (cyc+1) % LAT` everywhere) is a measured **no-op** — 101,139
  checks still pass, because a circular queue read and written through the
  same index is invariant under a constant rotation. The ch05-style
  scoreboard off-by-one only becomes expressible when the read index is
  computed SEPARATELY from the write index; that split variant, measured,
  fails against the fully CORRECT pipeline on the first adjacent differing
  pair (cyc 3 of the corner stream). Two lessons: the shared-index shape
  makes a whole class of off-by-ones structurally impossible, and a
  scoreboard skew bug announces itself loudly (fails a correct DUT) rather
  than silently blessing a broken one — provided results actually differ
  cycle to cycle, which the back-to-back corner stream guarantees from its
  third slot.
- **Bubbles are first-class.** A parallel `vq[]` queue records each slot's
  `in_valid`; bubble slots drive **all-X operands** (adversarial on
  purpose) and require `out_valid === 0` at retirement; valid slots
  require `out_valid === 1`. `out_valid` is checked with `===` on EVERY
  cycle including the LAT fill cycles (`ov !== 1'b0` before fill is a
  failure) — this per-cycle valid check IS the latency measurement, not a
  separate test.
- **`!==` + X-guard on data** — ch09's rule carried forward: any x/z in
  `{result, invalid, overflow, inexact}` on a valid retirement is a
  failure in its own right, before the value comparison.
- **Count guards:** checked-valid must equal driven-valid (a truncated
  drain fails), driven-valid must reach the literal expected total, and
  `out_valid` cycle count must equal driven-valid count — the last one is
  the throughput measurement (section 8).
- **Seeding:** seeded once (`SEED=9090`, echoed), first draw discarded —
  the ch05 rule, unchanged.

Stimulus, all back-to-back at one pair per cycle: (1) ch08's 46-pair
corner library in both orders — 92 slots with **no idle cycles between
corner cases**, which makes the library itself an adjacency test;
(1b) a directed adversarial-adjacency block (section 8); a bubble flush;
(2) the five-regime random generator, 100,000 pairs, one per cycle;
(3) 2,000 slots of random valid/bubble mix with X data on bubbles;
(4) drain with X inputs while the last transactions retire.

**Harness mutations, all run** (the ch04 standing practice): (T1a) shared
index shifted — no-op, see above; (T1b) split read index — kills a correct
DUT at cyc 3; (T2) `!==` weakened to `!=` AND the X-guard deleted, run
against a DUT whose `p1_s_al` bank register is never assigned (an
undriven pipe register, permanently X): **FALSE PASS across all 101,139
checks** — ch09's `!=`-vacuity finding reproduced in streaming form, while
the unweakened harness kills the same DUT immediately (first X-guard hits
at cyc 12–15, `00000000/00x`); (T3) `NPR = 0` — the drive-count guard
fires (`only 1110 valid pairs driven`). The bin gate also caught a real
mis-expectation during development (section 4's re-timing finding) before
any DUT bug did.

Runtime: the full 101,139-valid-pair run is **~10.2 s per depth** under
`vvp` (both depths measured; ~102k clock cycles plus the combinational
reference per slot). A 100k streaming equivalence fits the harness's 60 s
timeout with 6x margin — unlike ch10's 240k-quadruple headline run, this
chapter's headline sweep can ship as a manifest `run` target at full size.

**The slot task, verbatim** (the harness's load-bearing 40 lines — the
writer rebuilds the rest from the shape description above; `DUT`, `LAT`
and `RSCREEN` arrive via `-D`):

```verilog
  task slot(input valid, input [31:0] wa, input [31:0] wb);
    begin
      @(negedge clk);
      idx = cyc % LAT;                    // ONE index for check AND store
      if (cyc >= LAT) begin
        if (vq[idx]) begin
          if (ov !== 1'b1) begin
            mismatches = mismatches + 1;  // valid slot must retire valid
          end else if ((^{r_p, inv_p, ovf_p, inx_p}) === 1'bx) begin
            xfails = xfails + 1; mismatches = mismatches + 1;
          end else if ({r_p, inv_p, ovf_p, inx_p} !== eq[idx]) begin
            mismatches = mismatches + 1;
          end
          n_checked_valid = n_checked_valid + 1;
        end else begin
          if (ov !== 1'b0) mismatches = mismatches + 1;   // bubble stays bubble
          n_checked_bubble = n_checked_bubble + 1;
        end
      end else begin
        if (ov !== 1'b0) mismatches = mismatches + 1;     // hard 0 before fill
      end
      in_valid = valid;
      a = wa; b = wb;
      #1;                                 // combinational reference settles
      vq[idx] = valid;
      if (valid) begin
        eq[idx] = {r_c, inv_c, ovf_c, inx_c};
        n_valid_driven = n_valid_driven + 1;
      end
      cyc = cyc + 1;
    end
  endtask
```

(Failure `$display`s elided here for width; the real task prints operand
and both sides on the first 10 mismatches, ch05's message discipline.)
The stage-qualified coverage counter rides in a parallel process:

```verilog
  always @(posedge clk)
    if (dut.vpipe[LAT-2] === 1'b1 && dut.`RSCREEN === 1'b0 &&
        dut.u_round.round_renorm === 1'b1)
      rr_count = rr_count + 1;
```

with `RSCREEN = p1_screen` (p2) / `c_screen` (p4) — the re-timed screen
qualifier section 4 measures the wrong versions of.

## 4. Streaming equivalence, measured: both depths bit-identical to fp32_add2

**Experiment 1 (headline).** Both pipelines, full harness, PASS lines
captured verbatim:

```
SEED=9090 LAT=2
PASS tb_stream LAT=2 (101139 valid pairs incl 92 corners, 968 bubbles, 1 result/cycle, renorm corner=12 random=0)
SEED=9090 LAT=4
PASS tb_stream LAT=4 (101139 valid pairs incl 92 corners, 970 bubbles, 1 result/cycle, renorm corner=12 random=0)
```

101,139 valid pairs each = 92 corner checks (both orders, back-to-back)
+ 10 directed-adjacency slots + 100,000 five-regime random + 1,037 valid
slots inside the random valid/bubble phase; ~968–970 bubble slots with
all-X operands interleaved and checked for `out_valid === 0`. Zero
mismatches, zero X-guard hits, `out_valid` count equal to the driven-valid
count, on both depths. Each run ~10.2 s.

**The coverage-bin re-timing finding (new, measured).** ch09's regression
counts a `round_renorm` coverage bin gated on `!dut.screen`, and its notes
predicted "the coverage bins will need re-timing when the boundaries
acquire registers." Measured, that re-timing has TWO separate parts, and
each was gotten wrong once before the correct number appeared:

1. *Validity qualification.* Counting `u_round.round_renorm` whenever the
   round-stage transaction is pipeline-valid gives **14** firings over the
   corner+adjacency stream, not the expected 12. The two extras are the
   `7F800000 + 7F7FFFFF` pair (both orders): a SCREENED case whose
   don't-care datapath garbage happens to fire the second renormalize.
   ch09's `!screen` qualifier is not optional bookkeeping — without it,
   don't-care garbage inflates coverage.
2. *Stage-correct qualification.* Re-using the qualifier naively as the
   top-level `screen` WIRE (the input-side, stage-1 signal — one to three
   transactions younger than the one in the round stage) gives **10** on
   the 2-stage pipe (measured under the PRE-adjacency stimulus; the shipped
   `tb_stream.v` stimulus, which adds the adjacency block, measures **9** —
   corrected 2026-08-21 by the ch11 review; the chapter and README carry the
   shipped value) and **11** on the 4-stage pipe — wrong in a
   depth-dependent way, because it applies the wrong transaction's screen
   bit to each firing. The correct qualifier is the PIPELINED copy of
   screen at the round stage (`p1_screen` / `c_screen`), which gives
   exactly **12** on both depths: the four renormalize reachers x both
   orders (8) from the corner library plus the four single-order reachers
   in the adjacency block.

The general rule this measures: **when a datapath acquires stages, every
coverage qualifier must travel to the stage where its bin samples.** A bin
qualified by an input-side signal in a pipelined design is counting an
unrelated transaction — and the error is invisible without an expected
count, because 10, 11 and 14 are all plausible-looking nonzero numbers
that would sail through ch09's `!= 0` empty-bin gate. The directed
expected-count check (`=== 12`) is what caught it here.

**Random never reaches the second renormalize, re-confirmed under
streaming:** `renorm random=0` in both PASS lines — 100k five-regime
random pairs plus 1,037 mixed-phase pairs fired the rounding-carry
renormalize zero times, consistent with ch08's 0-in-1M measurement. The
directed reachers remain the only source; a pipelined regression must
carry them and count them at the right stage.

## 5. The skew bug: the pipeline bug single-transaction testing cannot see

**Experiment 2 — the chapter's core argument for streaming.** The
characteristic NEW bug class a pipeline introduces is **skew**: one signal
crosses a cut without its register, so a stage mixes two transactions.
The mutant is a one-token diff of `fp32_add2_p2`: `u_norm`'s `s_in` wired
to the stage-1 combinational `s_al` instead of the registered `p1_s_al` —
the single easiest register to forget, because sticky is 1 bit, travels
"around" the adder, and the design still compiles with zero output and
still has a working pipeline everywhere else.

Two harnesses, same corner library, same five-regime generator, same
`!==`+X-guard+count-guard discipline. The ONLY difference is the schedule:

- **`tb_single` — the beginner shape** (drive one pair with a one-cycle
  `in_valid` pulse, HOLD the operands, wait for `out_valid`, check, idle
  one cycle, next): **PASS, 20,092/20,092 checks — on the broken design.**
  (It also passes the correct design; and it passes the skew mutant's 92
  corner checks specifically.) The mutant is invisible because holding the
  operands makes the current transaction's `s_al` and the previous
  transaction's `p1_s_al` the same value at every check.
- **`tb_stream` — a new pair every cycle: 5,312 mismatches in 101,139**
  (5.25%), classified: **3,926 flag-only, 1,169 result-changed (rounding
  flipped by the neighbor's sticky), 217 X-guard hits** (bubble-slot X
  operands leaking through the unregistered path into a *valid* neighbor's
  outputs — inter-transaction X contamination, measured). First kill at
  stream cycle 13, inside the corner phase: the exact-cancellation pair
  `BFC00000+3FC00000` retired with `inexact=1` stolen from its neighbor
  `00000001+3F800000` (whose alignment sticky is live); two cycles later
  the mirror-image kill, `3F800000+00000001` retiring with its own sticky
  LOST (`/000` for `/001`).

The measured moral, stated carefully: a pipeline's new bug class is not
wrong arithmetic but wrong PAIRING of data with transaction, and every
check that holds inputs stable across the latency window is structurally
blind to it. Streaming with per-cycle-changing operands is to pipelines
what ch09's integration sweep was to module seams: the only level of
testing that observes the composition property itself. The corner library
already kills this mutant *when streamed back-to-back* (cycle 13); the
same library applied one-held-pair-at-a-time proves nothing about skew.

Note for the chapter: `-Wall` says nothing about the missing register
(there is nothing wrong locally — reading a wire from another stage is
legal Verilog), no simulator warning exists, and the module's own unit
tests cannot express the bug because it lives in the top-level wiring.
This is ch09's "composition is where the new bugs live" thesis, one level
up.

## 6. Blocking assignment in a stage bank, measured under streaming

ch03 derived why sequential logic uses `<=` from the event queue; ch11 is
where it finally bites a real datapath. Two mutants of `fp32_add2_p2`,
each changing ONE bank's `<=` to `=`, measured under the full streaming
harness and under focused probes. The results are much stranger — and
more dangerous — than "blocking breaks pipelines":

**Mutant blk1 (bank 1 blocking): 427 mismatches in 101,139, 255 of them
X-class.** Not the ~50,000 a naive "half the transactions corrupt" model
predicts. Three probe measurements explain the number:

1. *Screened passthrough traffic* (`b = 0`, so `result` flows through the
   two direct reg-to-reg hops `p1_screen_res -> p2_result`): per-cycle
   delivered latency, classified over 1,998 cycles, is a strict
   alternation **2,1,2,1,... — 999 cycles at latency 2, 999 at latency 1,
   1,998 runs of length one**. This is ch03's "Icarus alternates same-edge
   process ordering between time steps" made visible as a pipeline whose
   LATENCY alternates every cycle: when bank 1's blocking writes execute
   first, bank 2 reads the freshly-written register values and the
   transaction skips a stage. (Adding two extra posedge processes to
   mimic the full harness's process population did not change the
   pattern — the alternation is not an artifact of process count.)
2. *Unscreened datapath traffic* (ordinary finite operands, so `p2_result`
   samples `dp_res`, which passes through the normalize/round
   combinational cloud): **1,998 of 1,998 cycles at latency 2 — the
   blocking bug is measurably invisible on this path.** Even on the
   cycles where bank 1 wins the race, bank 2 still samples the OLD
   stage-2 outputs. The inference consistent with ch03's queue model
   (flagged as inference: the scheduler's internals are not directly
   observable): bank 2's process is already in the active queue when
   bank 1's blocking writes schedule the continuous-assignment updates,
   so the cloud has not recomputed by the time bank 2 samples it. What is
   certain is the measurement: reg-to-comb-to-reg paths delivered
   latency 2 on every cycle; reg-to-reg paths alternated.
3. The full-stream kill count follows: mismatches cluster where the
   REG-TO-REG side channel disagrees between neighbors — screened corner
   traffic (first kills at stream cycles 3,5,7,9: the zero/sign pairs at
   the head of the corner library, delivered one cycle early) and
   bubble-X adjacency (the 255 X-class kills) — while the entire
   100k random phase of ordinary arithmetic passes straight through the
   broken register bank.

**Mutant blk2 (output bank blocking): PASS — all 101,139 streaming checks,
both phases, zero mismatches.** Nothing inside the DUT reads bank 2 on
the same edge, and the testbench samples at the negedge, so the
half-cycle-early update is invisible to every observer in the system.
Section 9 composes this same mutant into the four-input tree, where a
downstream stage DOES read it on the same edge — and measures a surprise
about which readers a blocking-written register can and cannot corrupt.

**And blk1 passes `tb_single` (20,092 checks).** A held transaction
cannot expose a latency alternation.

The teaching payload, all measured: blocking in a stage register is not
"broken" in the way folklore says — it is *conditionally, alternately,
path-dependently* broken, worst exactly where tests look least (control
side channels, X-adjacency), completely silent on the arithmetic your
random campaign hammers, and invisible to single-transaction tests and to
last-stage-only observers. The `<=` discipline is cheap; the failure mode
of violating it is a 0.4%-of-cycles heisenbug. ch03's detection-table
verdict stands in this design: no compiler diagnostic, no runtime
warning — `iverilog -g2012 -Wall` compiles both mutants with zero output.

## 7. Reset strategy and X in the pipe, measured from cold start

**Experiment 3 — three reset strategies, same cold-start probe.** Valid
operands stream from the first post-reset cycle; the probe prints
`out_valid`, `result` and the flags on every early cycle. Run on both
depths, with both zero-idle and X-idle (undriven-bus model) inputs.

| Strategy | out_valid during fill | data outputs during fill |
|---|---|---|
| A. valid-pipe-only reset (the built design) | hard `0` for exactly LAT cycles, then `1` with the first correct result (cycle 2 on p2, cycle 4 on p4 — measured on both) | whatever the idle inputs bake: all-X when the bus idles at X; defined `+0`-shaped garbage when the TB idles the bus at `0` |
| B. no reset at all | **`x` on the first observed cycle**, then 0, then correct | all-X first, then as A |
| C. every datapath register reset to 0 | hard `0` for LAT cycles (same as A) | **`7F800000` with flags `011` on the first post-release cycle** — +infinity, overflow AND inexact raised, fully defined |

Row C is the section's surprise and the measured centerpiece. The
all-zeros reset state is an ILLEGAL datapath state: `e_big = 0` cannot
occur in live traffic (the effective exponent is `max(E,1)` by ch07's
contract), and stage 2 faithfully decodes the impossible state —
`e_lim = 0 - 1` wraps to 255, the exponent arithmetic underflows to
`e_norm = 486`, `ovf` fires, and out comes a defined-looking
**+inf/overflow/inexact** that no operand pair produced. Full reset does
not make the fill window "safe"; it *manufactures confident-looking
nonsense* — strictly worse than an honest X for anyone eyeballing a
waveform or logging ungated outputs, and it costs a reset fanout to all
~110/284 datapath flops that the free-running design simply does not have
(the physical cost claim is documentation — no synthesis tool here; the
functional claim is measured). This cashes ch09's "defined-looking wrong
result" X lesson in a new form: THE RESET VALUE ITSELF is the X that
looks fine.

Row B measures why the valid pipe, and only the valid pipe, needs reset:
with nothing reset, `out_valid` is `x` during fill, and a consumer's
`if (out_valid)` skips it only because Verilog treats `x` as false —
luck, not design (`if (out_valid !== 0)`, or handing `out_valid` to
arithmetic, takes the garbage). One flop per stage of reset buys a hard
`0`; the 73–100-bit data banks need none, because gating — not data
cleanliness — is what makes fill outputs ignorable. Measured on row A/B
with X-idle inputs: fill-window data outputs are all-X on every cycle of
the fill, on both depths, and the FIRST valid-flagged output is already
bit-correct (no partially-flushed transition cycle was ever observed with
continuous valid input from cycle 0).

**Experiment 4 — single-bit X injected INTO a pipe register mid-stream**
(deposited hierarchically into `p1_s_al` for exactly one stage-2
evaluation, every 16th slot, 1,250 injections over 20,000 within-30
random pairs, clean slots checked against the reference throughout):

```
xinj: injected=1250 absorbed_correct=741 absorbed_WRONG=0 visible_x=509 clean_mismatch=0
```

**59.3% of single-bit X events on the registered sticky are absorbed into
fully defined, bit-CORRECT outputs** — the X lands where RNE did not need
the sticky (`round_up = ng & (nr | ns | lbit)` already decided) and
vanishes without trace. 40.7% reach an output bit as visible x; zero
produced a defined-but-wrong output on this bit. Two consequences, stated
at measurement strength: an output X-guard is a real but PARTIAL X
detector (blind to the 59% absorbed class — here harmless, but the
blindness is structural, not a guarantee of harmlessness); and ch09's
sign-bit-X "defined-looking wrong result" class was NOT reproduced
through this control bit — X-pessimism made the influential cases
visibly x. The ch09 finding lives in *comparison/mux-select* logic
(the swap's magnitude compare), which in the pipelined design still sits
in stage-1 combinational logic operating on registered-or-primary inputs;
registering the seams neither fixed nor worsened it.

## 8. Throughput, latency, fill/drain, and adversarial adjacency

All functional — the only timing this environment can measure is counted
in cycles, and all of it was counted.

- **Throughput = 1 result per cycle after fill, measured as an equality,
  not a slogan:** a free-running counter increments on every cycle with
  `out_valid === 1`; at end of run it must equal the number of valid
  pairs driven. `101,139 === 101,139` on both depths, with the 100,000
  random pairs driven on 100,000 CONSECUTIVE cycles (no bubbles in
  phase 2). Total simulated cycles ~102,1xx: the overhead over one-per-
  pair is exactly the fill, the two deliberate bubble stretches and the
  drain.
- **Latency = stage count, measured three independent ways:** (a) the
  streaming harness checks `out_valid === 0` on every fill cycle and
  `out_valid === vq[slot]` on every later cycle — a one-cycle latency
  error anywhere in 102k cycles fails; (b) the one-pulse probe: a single
  valid transaction into an idle pipe yields **exactly one** `out_valid`
  cycle, at cycle 2 (p2) / cycle 4 (p4), carrying the correct result
  (`3F800000+40000000 -> 40400000`); (c) the cold-start probes (section 7)
  show the first valid output at cycle LAT on both depths.
- **Fill:** LAT cycles of hard-0 `out_valid` from reset release, then the
  first result — no partially-processed transition cycle ever observed.
- **Drain:** the stream ends with `in_valid` low and **all-X operands**
  while the last LAT transactions retire; every one of them retired
  bit-correct (the check/drive equality guard would fail otherwise). The
  in-flight transactions are fully isolated from the input bus by their
  banks — measured, not assumed, because the drain Xs would poison any
  unregistered path (this is exactly how the skew mutant's 217 X-class
  kills arose in section 5).
- **Bubbles:** ~970 random mid-stream bubbles (in_valid low, X data)
  interleaved with valid traffic; every bubble retired as `out_valid===0`
  exactly LAT cycles later, every neighboring valid slot retired
  bit-correct. The valid-bit shift register is all the flow control a
  no-stall pipeline needs; nothing else in the design knows bubbles
  exist.
- **Adversarial adjacency, directed:** the four rounding-carry
  renormalize reachers were each streamed IMMEDIATELY adjacent to
  screen-path traffic — a qNaN payload case, the `inf + (-inf)` invalid
  case, signed-zero cases, an sNaN case, an exact-cancellation tie and a
  subnormal cancellation, all back-to-back with no idle cycles (stream
  slots 92–101). All retire bit-identical to the combinational reference
  on both depths, and the stage-qualified coverage counter proves all
  four reachers actually fired their renormalize in the pipe (section 4's
  12-count). No inter-transaction contamination was observed anywhere in
  either full run: with every seam registered, a NaN in slot n and a tie
  in slot n+1 cannot see each other — and section 5 shows precisely what
  it looks like when one forgotten register makes that false.

Sim-speed note for the writer: the full 101k-pair streaming run is
~10.2 s per depth; `tb_single`'s 20,092 held transactions take 2.1 s.
That is ~9.9k vs ~9.6k checks per wall-clock second — essentially THE
SAME cost per check (the static-input cycles are nearly free), so
streaming's advantage is coverage class, not simulation economy: it is
the only schedule that can see skew, at no extra price.

## 9. Pipelining the four-input structures

**Experiment 5 — the pipelined tree, built and proven.**
`fp32_add4_tree_p` = three `fp32_add2_p2` instances in ch10's tree shape:
2 levels x latency 2 = **latency 4**, valid chained level to level
(`u_r.in_valid = u_ab.out_valid`), zero new datapath logic. Streaming
harness `tb_stream4` (same scoreboard shape, LAT=4, oracle = ch10's
COMBINATIONAL `fp32_add4_tree` in the same simulation):

```
PASS tb_stream4 (101019 valid quads incl 16 directed, 999 bubbles, 1 result/cycle, latency 4)
```

101,019 valid quads = 16 directed (the ch10 multiset `{max,max,-max,-max}`
in tree port order and interleaved, L1-overflow-then-inf-absorption, sNaN,
qNaN payload, subnormal cancels, renormalize reachers in BOTH level-1
adders at once, signed zeros — flaggy quads deliberately adjacent to
benign ones) + 100,000 five-regime random + 1,003 mixed, ~999 X-data
bubbles, drain under X. Bit-identical including all three flags; 1 result
per cycle; 37 s (fits the 60 s harness budget at full size).

**The genuinely new design obligation is FLAG ALIGNMENT.** ch10's flag
rule is a combinational OR of the three component operations' flags; in
the pipeline, level-1 flags for quad n retire at n+2 and level-2 flags at
n+4, so the level-1 OR must ride a 2-cycle delay line (6 flops). The
whole module, minus ports, is this (verbatim; valid chains level to
level, and this is ALL the new logic four-input pipelining needs):

```verilog
  fp32_add2_p2 u_add_ab (.clk(clk), .rst_n(rst_n), .in_valid(in_valid),
                         .a(a), .b(b), .result(sum_ab), ..., .out_valid(v_ab));
  fp32_add2_p2 u_add_cd (.clk(clk), .rst_n(rst_n), .in_valid(in_valid),
                         .a(c), .b(d), .result(sum_cd), ..., .out_valid(v_cd));
  fp32_add2_p2 u_add_r  (.clk(clk), .rst_n(rst_n), .in_valid(v_ab),
                         .a(sum_ab), .b(sum_cd), .result(result),
                         ..., .out_valid(out_valid));

  wire [2:0] f1 = {inv_ab | inv_cd, ovf_ab | ovf_cd, inx_ab | inx_cd};
  reg  [2:0] f1_d1, f1_d2;
  always @(posedge clk) begin
    f1_d1 <= f1;                 // 2-cycle flag delay = u_add_r's latency
    f1_d2 <= f1_d1;
  end
  assign invalid  = f1_d2[2] | inv_r;
  assign overflow = f1_d2[1] | ovf_r;
  assign inexact  = f1_d2[0] | inx_r;
```
 Pasting
ch10's OR in verbatim — the `NOFD` mutant — is the four-input skew bug:

- streaming: **16,162 mismatches in 101,019 (16.0%), every single data
  word CORRECT** — 15,662 flag-only + 500 X-class, result-changed = 0.
  First kill at cyc 7; e.g. the reacher quad retires `7FE00000/000`
  where `/100` (its own invalid) was due, having donated its invalid two
  cycles early to a benign neighbor (`41200000/011` at cyc 16-pattern).
- held-single-transaction harness (`tb_single4`, 16 directed + 5,000
  random): **PASS on the broken design** — with held inputs the level-1
  flag registers still hold the same transaction's flags at retirement.

A flag-alignment bug is thus WORSE than the data-skew bug of section 5:
it corrupts nothing random result-checking looks at, fires only under
streaming, and only when neighbors differ in flags. ch12's pipelined
composition must treat flags as data with a latency, not as status lines.

**Experiment 6 — the composition surprise (measured, three-way).** The
section-6 output-bank-blocking mutant (`blk2`), which passed 101k
standalone, was composed as both level-1 adders of the tree. Prediction
was detonation (a downstream bank now reads `sum_ab` on the same edge).
Measured: **PASS — all 101,019 streamed quads** — the prediction was
WRONG, and the reason is section 6's comb-cloud lag: every consumer of
the blocking-written registers (the level-2 stage-1 cloud, and the `f1`
flag OR) reads them through at least one continuous assignment, which in
Icarus does not re-propagate before the same-edge consumers sample. The
controlled contrast that completes the matrix: compute the SAME flag OR
directly inside the delay-line always block instead of through the wire
(`DIRECTF1` — one wire indirection removed, identical logical function):
**7,973 mismatches (7,693 flag-only + 280 X, result-changed 0)** from
stream cycle 4 on; and `DIRECTF1` with correct non-blocking level-1
adders passes everything (the direct read is innocent; only a
blocking-written source makes it a race). Measured rule for Icarus 13.0:
a blocking-written stage register corrupts exactly those readers that
name it directly inside a same-edge always block; readers behind a
continuous-assign hop never saw a corruption in ~400k streamed
transactions across these runs. Per the LRM BOTH orders are legal — so
the passing configurations are legal races that happen to fall the lucky
way in this simulator, which is the strongest form of the chapter's
point: **simulation, at any stimulus volume, cannot certify
blocking-assignment discipline; only the `<=` rule can.**

**The sequential structure, priced but not built** (arithmetic from the
built pieces, not measurement): pipelining `fp32_add4_seq` with the same
p2 units gives latency 3x2 = **6**, and — ch10's forecast, now with
concrete numbers — operands `c` and `d` need delay-matching shift
registers of 2 and 4 cycles x 32 bits = **192 flops of pure delay**, plus
flag alignment (add1's flags delayed 4, add2's delayed 2: 18 more), where
the tree needs 0 data-delay flops and 6 flag flops. Totals: tree
3x110+6 = **336** state bits at latency 4; sequential 3x110+210 = **540**
at latency 6. Same throughput (1/cycle) either way. With p4 units: tree
latency 8, sequential latency 12 and 384 delay-matching flops. The
tree's pipeline advantage is thus latency AND registers, not accuracy
(ch10 killed the accuracy folklore) — and the delay-matching cost is why
"sequential = accumulator" designs get rebuilt as trees when pipelined.
Not measured here: any physical area/frequency figure (no synthesis
tool); the flop counts are counts of registers the RTL would declare.

## 10. The waveform story: latency as horizontal distance, parsed from a real VCD

ch04 seeded "pipeline latency read as horizontal distance in a waveform";
this cashes it with a measurement. **Experiment 7:** `tb_wave` streams a
quiet carrier (1.0+1.0, result 2.0, every cycle) with ONE marker pair
(pi + pi) embedded, dumps behind the `+dump=` plusarg (ch04's convention,
verbatim), on both depths. The two VCDs were then parsed with a ~40-line
python3 VCD reader (scope tracking, `$var` id table, `b...` value
changes), locating the first time `a` becomes `40490FDB` (pi) and the
first time the result becomes `40C90FDB` (2pi):

```
wave_p2.vcd: a->pi at #130000  r_p->2pi at #145000  delta = 15 ns
wave_p4.vcd: a->pi at #130000  r_p->2pi at #165000  delta = 35 ns
```

The honest number is **LAT·T − T/2, not LAT·T** (15 ns, not 20; 35 ns,
not 40): the input edge sits at a negedge (the drive edge) and the result
edge at a posedge (the capture edge), so raw time subtraction
under-reads the latency by half a period. What IS exactly LAT is the
count of **capturing posedges strictly between the two edges**: 2 and 4,
machine-counted from the parsed edge times against the known 10 ns clock
phase. The chapter should teach reading latency by counting clock rises
between the input change and the output change — the subtraction trap is
measurable and will bite anyone eyeballing cursor deltas in a viewer.

Mechanics worth recording for the writer (all observed in these dumps):
- `$dumpvars(0, tb_wave)` on the 2-stage DUT gives a ~15.5 KB VCD for a
  24-cycle run; the 4-stage's is ~17 KB. Full-hierarchy dumping of this
  design is cheap.
- **ch04's partial-aliasing finding reappears**: `clk`, `rst_n`,
  `in_valid` share one id between testbench and DUT scopes, but
  `tb_wave.r_p` and `dut.result` — the same net — get DIFFERENT ids, so
  a naive parser keyed on one name misses the other's changes (this
  cost one debug round here: the checker first looked for
  `tb_wave.result`, which does not exist; parse the `$var` table, never
  guess names).
- Parameters are dumped (`$var parameter 32 & LAT`), and the
  `lzc26` FUNCTION inside `fp32_normalize` appears as a `$scope
  function` — both consistent with ch04's measurements, now seen in the
  FP design itself.
- For the streaming harness, a waveform of the SKEW mutant's first
  corner-phase kill is the chapter's money picture: the neighbor's
  sticky visibly arriving one column early. The VCD route above is how
  the writer can generate it deterministically (the kill cycles are
  reproducible: `$random`/`$urandom` are seed-stable per ch04).

What cannot be shown, unchanged from ch04: no batch waveform rendering
exists (GTKWave uninstallable here, Surfer has no headless render), so
the chapter can ship VCD-parsing assertions but only DESCRIBE the viewer
picture.

## 11. Timing concepts and synthesis considerations — documentation, honestly flagged

**Epistemic wall, stated first: NO synthesis or static timing tool exists
in this environment.** Everything in this section is documentation from
standard texts and reasoning from the built RTL's structure; NOTHING in
it is a measurement, and the chapter must flag it in place exactly as
ch03/ch09 flagged their walls. Icarus Verilog is a simulator; a
zero-output `-Wall` compile says nothing about whether the design meets
any clock. Delta cycles are not nanoseconds: the entire 101k-pair
streaming proof would pass unchanged if every stage's logic were a
thousand times deeper.

Concepts the chapter owes the reader, in this design's terms:

- **Critical path and Fmax.** In synchronous logic the clock period must
  cover the longest register-to-register combinational path plus flop
  clock-to-Q and setup: `T >= t_clkq + t_comb(max) + t_setup`, and
  Fmax = 1/T_min. The combinational `fp32_add2` is one long path —
  roughly compare + 26-position right shift + 27-bit subtract + 26-input
  LZC + 26-position left shift + 25-bit increment + pack in series;
  registering at the seams replaces "the sum of all of it" by "the worst
  single stage."
- **Which stage is plausibly the longest — reasoning, NOT measurement.**
  In `fp32_add2_p4`: stage 2 (align+addsub) chains an 8-bit exponent
  subtract, a 5-level 24-bit barrel shifter and the 27-bit carry chain;
  stage 3 (normalize) chains the 26-input priority LZC, another 5-level
  barrel shifter and a 9-bit exponent subtract. Those two are the
  plausible contenders, consistent with FP-adder literature putting the
  alignment shifter, significand adder and LZC/normalize shifter on the
  critical path (Muller et al.; Ercegovac & Lang). Stage 1 (field
  decode + a 31-bit compare + muxes) and stage 4 (25-bit increment +
  pack) are plausibly shorter. For `fp32_add2_p2` the front stage
  chains compare+shift+subtract and is plausibly the longer half — one
  reason the single interior cut went at the 73-bit addsub seam. A real
  tool could prove or embarrass every sentence above; without one they
  are structural arguments, and the chapter must say so.
- **Balance is the whole game.** Fmax after pipelining is set by the
  WORST stage, so an unbalanced cut buys latency without buying clock.
  The measurable part of balance here is register cost (110 vs 284
  bits, section 2); the unmeasurable part is per-stage delay.
  Speedup < depth, always: k stages cut the comb path to ~1/k of the
  total but add per-stage register overhead (t_clkq + t_setup) that k
  multiplies, and stage imbalance eats the remainder.
- **Setup and hold.** Setup: data must settle before the capturing edge —
  violated by too-long stages, fixed by slowing the clock or cutting
  deeper. Hold: data must stay stable AFTER the edge — a same-edge race
  in silicon, independent of clock speed, NOT fixable by slowing down.
  The simulation analogue of a hold discussion is exactly section 12's
  same-edge-driving measurements: the negedge-drive rule is the
  testbench's way of buying half a period of both margins.
- **Retiming.** Moving registers across combinational logic without
  changing function (Leiserson & Saxe). This chapter already did one
  retiming BY HAND: the p4 design deliberately does not register the
  95-bit align seam, fusing align+addsub — a depth-vs-balance decision a
  synthesis tool's register-retiming pass automates. The coverage-bin
  finding of section 4 is retiming's verification shadow: move a
  register, and every stage-qualified observation must move with it.
- **What a synthesis tool would report that cannot be known here:**
  achieved Fmax and per-stage slack; whether the LZC infers a priority
  chain or a parallel-prefix structure; carry-chain mapping of the
  27-bit adder; LUT/FF/cell area and the real cost of the 34-bit screen
  side channel riding every bank; whether the valid-only reset survives
  optimization; hold fixing, clock skew, false paths. The honest sentence
  for the chapter: this environment can prove the pipeline COMPUTES the
  right function at some clock; it cannot name the clock.

One measured fact does belong in this section: pipelining changed no
result bits anywhere (sections 4/9) — the transform is exactly "same
function, later" — so all timing gains, whatever a tool would report,
come at zero arithmetic cost. That separation (function proved by
simulation, speed promised by synthesis) is the chapter's closing frame.

## 12. Testbench pitfalls at stage boundaries, re-measured in this design

**Experiment 8 — `$display` vs `$strobe` at a bank boundary.** ch04
measured the region split on a toy; re-measured here on the pipeline's
own stage register, mid-stream, with counting operands so every value
names its transaction (`b = 0` screened passthrough, `p1_screen_res`
carries the transaction index):

```
posedge t=55000: $display sees bank1=1  (inputs hold txn 2)
posedge t=55000: $strobe  sees bank1=2
```

Same edge, same expression: `$display` shows the transaction LEAVING the
bank (pre-NBA), `$strobe` the one ARRIVING (post-NBA). In a pipeline
debug log this is a one-transaction disagreement at every stage
boundary — a reader instrumenting stages with `$display` will
systematically mis-attribute values one stage downstream. The chapter
should print both lines once and never let the reader debug a pipeline
with un-labeled `$display` again.

**Experiment 9 — driving on the sampling edge.** ch04's rule is "drive on
the opposite edge"; the pipeline gives it teeth. The same streaming
probes, but driven at the POSEDGE:

- *Blocking drive, continuous stream:* delivered latency is a clean,
  deterministic **3** (1,997/1,997 cycles; same with NBA drive) — no
  corruption, no alternation, the pipe is just one cycle longer than
  designed. For the NBA drive that is defined semantics (the DUT samples
  before the testbench's NBA lands); for the blocking drive it is a
  legal race that Icarus happens to resolve through the same
  comb-cloud lag as section 6. A wait-for-out_valid harness passes this
  configuration with the WRONG latency — everything is self-consistently
  one cycle late — which is precisely why `tb_stream` checks latency
  against the SPEC (`out_valid === 0` on fill cycle counts), not against
  the DUT's own behavior.
- *Blocking drive, one-pulse test:* the quiet failure becomes a loud
  one, and it is the section's key measurement. `in_valid` is read
  DIRECTLY by the valid pipe (no combinational cloud in between), so it
  is captured one cycle earlier than the data, which lags through
  stage-1 logic. Measured, both depths: **`out_valid` fires TWICE — at
  cycle LAT certifying `xxxxxxxx` as a valid result, then at LAT+1 with
  the real one:**

  ```
  cyc 2: out_valid=1 result=xxxxxxxx flags=xxx
  cyc 3: out_valid=1 result=40400000 flags=000
  ```

  Same-edge driving did not "race" in the folklore sense anywhere in
  these runs; what it measurably did is TEAR VALID FROM DATA, because
  the two take different-depth paths to their first registers — the
  direct-read vs comb-hop asymmetry of section 6, now on the testbench
  boundary. The negedge rule is not superstition; it is what keeps
  control and data in the same slot.

Both findings close the loop on ch03/ch04: the event-region material and
the negedge convention were taught on toys, and the pipeline is where
each one, mis-applied, produces a wrong-looking-right artifact — an
off-by-one debug log, a valid flag on garbage — rather than an obvious
crash.

## 13. Contradictions, sharpenings, and hand-offs to chapter 12

**No earlier measured claim was contradicted.** Several were sharpened,
one prediction of this session's own was falsified by its own
measurement, and the following must reach chapters 12/13 and F1:

- **ch03 sharpened (blocking/NBA):** "blocking in sequential logic
  accidentally works when statement order cooperates" becomes, measured
  in a real pipeline: blocking in a stage bank corrupts ONLY direct
  reg-to-reg readers, ONLY on alternate cycles (strict 2,1,2,1
  alternation, 999/999 over 2k cycles), while every reader behind a
  continuous-assign hop measurably survived ~400k streamed transactions.
  ch03's "races are reproducible in Icarus" held everywhere it was
  tested: the three headline failing sweeps were each re-run and
  reproduced their mismatch counts to the unit (skew 5,312/217-X;
  blk1 427/255-X; DIRECTF1 7,973/280-X).
- **ch04 sharpened (negedge rule, regions):** same-edge driving in this
  design did not corrupt data — it deterministically ADDED a latency
  cycle (both drive styles), and in the one-pulse case **tore valid from
  data** (`out_valid=1` certifying `xxxxxxxx`), because control takes a
  direct-read path and data a comb-cloud path. `$display`-vs-`$strobe`
  re-measured at a stage bank: one-transaction disagreement at the same
  edge. The waveform seed is cashed: latency measured from a parsed VCD
  is LAT·T − T/2 by cursor subtraction and exactly LAT by
  capturing-edge count.
- **ch05 sharpened (scoreboard):** the shared-index circular scoreboard
  is IMMUNE by construction to symmetric off-by-ones (measured no-op
  mutation) and fails loudly — against a correct DUT — on split-index
  skew. The `!=`-without-X-guard vacuity reproduces under streaming
  (101,139-check false PASS on an undriven-register pipeline).
- **ch08 confirmed:** the rounding-carry renormalize fired 0 times in
  100k+ streamed random pairs; the four directed reachers remain the
  only source and fired exactly on schedule inside the pipe (12 with
  stage-correct counting).
- **ch09 sharpened (coverage + X):** hierarchical coverage bins DO NOT
  survive pipelining unqualified — validity- and stage-correct screen
  qualification measured as 14 / 10 / 11 vs the true 12, so **every ch09
  bin ch12 re-uses must be re-timed to its stage and pinned to an
  expected count, not just non-zero**. X-in-the-pipe nuance: 59.3% of
  single-bit X injections on the registered sticky were absorbed into
  defined, bit-correct outputs — an output X-guard is a partial detector
  (nothing wrong was produced here, but the guard's blindness is now a
  number). ch09's D9/B-M2 latent `exact_zero` concern **rides through
  unchanged**: `fp32_addsub` is instantiated verbatim, and streaming
  equivalence inherits the same structural mask (both sides compute the
  same masked function), so ch12 must still resolve or formally accept
  it — pipelining neither exposed nor retired it.
- **ch10 extended:** the flag-OR composition rule acquires a latency
  clause — in a pipelined tree the level-1 OR must be delayed by the
  level-2 latency or 16.0% of streamed quads retire with a neighbor's
  flags (result bits: 100% correct — the nastiest possible signature).
  Tree-vs-sequential is now priced in registers: 336 vs 540 state bits
  and latency 4 vs 6 at p2 units (192 flops of pure delay-matching for
  the sequential shape). Port-order/multiset spec re-verified streamed.
- **For ch12 specifically:** (a) the valid-pipe-only reset pattern is
  the recommended shape, with the measured warning that a full datapath
  reset manufactures a defined-looking +inf/overflow from the ILLEGAL
  all-zeros state — if ch12 resets data, it must reset to a LEGAL
  don't-care and still gate by valid; (b) the streaming harness is the
  regression shape for any registered top: full-size 100k runs fit the
  60 s timeout (10.2 s / 37 s measured); (c) `tb_single`'s shape is
  worth shipping as the deliberate foil — five bug classes pass it;
  (d) if ch12 adds an enable/stall, the expectation queue needs a
  valid-qualified push, which `tb_stream`'s `vq[]` already prototypes;
  (e) flags are data with a latency — compose them through delay lines,
  never fresh wires.
- **For ch13/F1:** the comb-cloud-lag observations are Icarus-scheduler
  behavior consistent with ch03's queue model, stated here as measured
  Icarus 13.0 facts, not LRM semantics — F1 should keep that framing
  intact if it quotes them; both passing-race configurations
  (`blk2`-standalone, `blk2`-in-tree-behind-wire) are the strongest
  evidence yet for ch03's thesis that simulation cannot certify
  assignment discipline.

## 14. Sources

Primary evidence for every claim in sections 1–10 and 12 is the local
measurement record above (Icarus Verilog 13.0, `iverilog -g2012 -Wall` +
`vvp`, Linux x86-64, this session); the ch02–ch10 research notes and
STATE.md carry the inherited findings cited inline.

Fetch-verified this session (2 URLs, both retrieved 2026-08-20):

1. Icarus Verilog documentation index, https://steveicarus.github.io/iverilog/ —
   confirms the documentation is organized around simulation usage and
   the VVP engine; no timing-analysis or synthesis-flow documentation is
   offered on the landing page.
2. Icarus Verilog README (steveicarus/iverilog, master),
   https://raw.githubusercontent.com/steveicarus/iverilog/master/README.md —
   "Icarus Verilog is intended to compile ALL of the Verilog HDL, as
   described in the IEEE 1364 standard"; describes the tool as a
   compiler feeding back-end code generators, with no synthesis/timing
   claims — supporting section 11's epistemic wall.

`[title-only]` (no URL invented, per project rule):

3. J.-M. Muller et al., *Handbook of Floating-Point Arithmetic*, 2nd
   ed., Birkhäuser, 2018 — FP-adder pipeline structure; alignment
   shifter / significand adder / LZC-normalize as the canonical long
   paths (backing section 11's flagged reasoning; same source ch09
   cited for cut conventions). `[title-only]`
4. M. D. Ercegovac, T. Lang, *Digital Arithmetic*, Morgan Kaufmann,
   2004 — FP addition datapath stages and delay discussion.
   `[title-only]`
5. C. E. Leiserson, J. B. Saxe, "Retiming Synchronous Circuitry,"
   *Algorithmica* 6(1), 1991 — the retiming concept named in
   section 11. `[title-only]`
6. D. Harris, S. Harris, *Digital Design and Computer Architecture* —
   pipelining, latency/throughput, setup/hold and Fmax definitions at
   textbook level. `[title-only]`
7. C. E. Cummings, "Nonblocking Assignments in Verilog Synthesis, Coding
   Styles That Kill!" (SNUG paper; cited by title per the ch03 rule —
   sunburst-design.com URLs are login-walled). `[title-only]`
8. IEEE Std 1364-2005 / IEEE Std 1800-2023 — event regions and the
   legality of both orderings in a same-edge race (the reason
   section 6/9's passing configurations are luck, not semantics).
   `[title-only]`
