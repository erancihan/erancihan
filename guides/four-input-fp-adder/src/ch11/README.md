# Chapter 11 source — Pipelining, timing concepts, synthesis considerations

<!-- sections complete: 5/5 -->

## Files

Every file was compiled and run under **Icarus Verilog 13.0** (built from tag
`v13_0`) on Linux x86-64 with `iverilog -g2012 -Wall`, zero compiler output on
every target. All pipeline datapath logic is chapter 9's, instantiated
UNMODIFIED -- pipelining in this chapter is wiring plus register banks, and
the manifest compiles ch09's exact files next to these to keep that claim
regression-guarded.

### Design modules

| File | Is | Owns |
|---|---|---|
| `fp32_add2_p2.v` | 2-stage pipelined `fp32_add2`, latency 2 | bank 1 at ch09's 73-bit addsub cut, bank 2 at the 35-bit output cut, 2-bit valid pipe (the only reset domain). 110 state bits. |
| `fp32_add2_p4.v` | 4-stage version, latency 4 | banks at the 100/73/72/35-bit cuts, 4-bit valid pipe; the 95-bit align seam deliberately NOT registered (align+addsub fused in stage 2). 284 state bits. |
| `fp32_add4_tree_p.v` | pipelined four-input tree, latency 4 | three `fp32_add2_p2` in ch10's tree shape, valid chained level to level, plus the 2-cycle level-1 flag delay line (6 flops) -- the composition's ONE new design obligation. 336 state bits. |
| `stream_cfg_p4.v` | compile-order configuration | three `` `define``s that retarget `tb_stream.v`/`tb_reset.v` at the 4-stage pipeline when listed ahead of them (macros carry across files in command-line order). |

### Self-checking testbenches

| File | Demonstrates |
|---|---|
| `tb_stream.v` | **The streaming-equivalence harness -- the chapter's central verification move.** A NEW operand pair EVERY cycle; oracle = the combinational `fp32_add2` in the same simulation; LAT-deep shared-index circular scoreboard (check-before-overwrite, ONE index for both); `!==` behind an X-guard; `out_valid` checked `===` on every cycle including fill; X-data bubbles and an X drain; count guards (drive floor, drain equality, out_valid-cycles == valid-driven). Stage-qualified renorm coverage pinned to `=== 12`. Ships at full headline size: 101,111 valid pairs/run, ~10 s. One source, both depths. |
| `tb_stream4.v` | The same harness shape for the pipelined tree at LAT=4, oracle = ch10's combinational `fp32_add4_tree`; 16 directed quads put flaggy traffic adjacent to benign on purpose; mismatches classified result-changed / flag-only / X. 101,019 valid quads/run, ~37 s. |
| `tb_single.v` | **The deliberate foil**: the held-transaction schedule (pulse valid, HOLD operands, wait, check, idle). Honest, X-guarded, count-guarded, able to fail -- and structurally blind to five pipeline bug classes the streaming schedule kills (see the mutation record). 20,092 held transactions, ~2 s. |
| `tb_reset.v` | The three reset strategies measured from cold start on three instances at once: valid-pipe-only reset (hard-0 fill, X data, first flagged output bit-correct), no reset (`out_valid` starts `x`), and full-zero datapath reset via hierarchical deposit (a DEFINED +inf/overflow/inexact manufactured from the illegal all-zeros state, asserted at its exact cycle). Runs at both depths via `stream_cfg_p4.v`. |
| `tb_xinj.v` | Single-bit X injected into the registered sticky (`p1_s_al`) every 16th slot, 1,250 injections over 20,000 within-30 pairs, classified: 767 absorbed bit-correct / 483 visible x / 0 defined-wrong / 0 clean-slot misses. Degenerate splits and any defined-wrong output are failures. |
| `tb_wave.v` | Both depths on one bus; a pi+pi marker in a 1.0+1.0 carrier stream; the marker's retirement slots (drive+2, drive+4) asserted, seen-exactly-once counted. VCD behind `+dump=<path>` (ch04's convention -- nothing is written into the source tree). The chapter's python parse measures the same two edges from the dump. |

## Runs and reproduction

```sh
cd .. && bash run_all.sh ch11     # 8 targets, all green (62.5 s here)
```

or by hand from this directory, e.g. the 4-stage streaming sweep:

```sh
iverilog -g2012 -Wall -o /tmp/sim ../ch02/align_sticky.v \
  ../ch07/fp32_fields.v ../ch07/fp32_class.v ../ch09/fp32_unpack.v \
  ../ch09/fp32_screen.v ../ch09/fp32_swap.v ../ch09/fp32_align.v \
  ../ch09/fp32_addsub.v ../ch09/fp32_normalize.v ../ch09/fp32_round_pack.v \
  ../ch09/fp32_add2.v stream_cfg_p4.v fp32_add2_p4.v tb_stream.v && vvp /tmp/sim
```

Unlike ch10's 240k-quadruple headline, both streaming sweeps ship in the
manifest at FULL headline size: the whole chapter-11 headline evidence is
regression-guarded, not a one-time claim. PASS lines this session:

```
PASS tb_stream LAT=2 (101111 valid pairs incl 92 corners + 10 adjacency, 998 bubbles, 1 result/cycle, renorm corner=12 random=0)
PASS tb_stream LAT=4 (101111 valid pairs incl 92 corners + 10 adjacency, 1000 bubbles, 1 result/cycle, renorm corner=12 random=0)
PASS tb_stream4 (101019 valid quads incl 16 directed, 1000 bubbles, 1 result/cycle, latency 4)
```

Timing on this container: `tb_stream` 10.0 s (p2) / 10.2 s (p4);
`tb_stream4` 36.7 s; `tb_single` 2.1 s; `tb_xinj` 2.1 s; `tb_reset` and
`tb_wave` < 1 s. Streaming and held schedules cost nearly the same per
check (~10.1k vs ~9.7k checks/s) -- streaming's advantage is coverage
class, not simulation economy. Full-repo regression after adding this
chapter: **103/103**.

The chapter's VCD measurement reproduces as:

```sh
vvp /tmp/sim_wave +dump=/tmp/wave_ch11.vcd    # the tb_wave target
python3 parse_vcd.py /tmp/wave_ch11.vcd       # parse_vcd.py does not ship:
                                              # save the chapter's VCD-section
                                              # listing under that name first
```

yielding `a->pi at #130000, r_p2->2pi at #145000 (15 ns, 2 capturing
posedges), r_p4->2pi at #165000 (35 ns, 4 capturing posedges)` -- the
LAT.T - T/2 cursor-subtraction trap, measured.

## Mutation record: design mutations

Standing practice: every testbench must be shown able to fail, and this
chapter's five pipeline-specific bug classes each get a recorded mutant.
Every mutation was applied to a **copy** of the named shipped file in the
session scratchpad, compiled against the untouched dependencies (all with
**zero** compiler output -- that silence is part of the record), and run
this session at FULL stream size. `tb_single`/`tb_single4` rows are the
foil evidence: a false PASS there is the measured cost of the held-input
schedule, recorded deliberately.

Thirteen design-mutant runs (**6 killed, 3 recorded FALSE PASSes on the
foils, 3 genuine survivors with structural reasons, 1 passing control**):

| # | Mutation (bug class) | Harness | Result | Evidence |
|---|---|---|---|---|
| D1 | `fp32_add2_p2`: `u_norm.s_in` wired to stage-1 `s_al` instead of `p1_s_al` -- one forgotten register (SKEW) | `tb_stream` | KILLED | **5,310 mismatches / 101,111 (5.25%)**: 1,152 result-changed, 3,909 flag-only, 249 X-class. First kill cyc 13: `bfc00000+3fc00000` retired `/001` for `/000` -- `inexact` STOLEN from its neighbor `00000001+3f800000`; cyc 15 the mirror: the neighbor's own sticky LOST (`/000` for `/001`); cyc 103 bubble-X leaked through the unregistered path into a valid neighbor (`007fffff/00x`). |
| D1b | same mutant | `tb_single` | **FALSE PASS** | 20,092/20,092 held transactions green on the broken design -- held operands make this transaction's wire and the previous transaction's register equal at every check. |
| D2 | `fp32_add2_p2`: bank 1 `<=` changed to `=` (BLOCKING BANK) | `tb_stream` | KILLED | **407 mismatches** (178 result-changed, 1 flag-only, 227 X-class, 1 coverage-count: renorm fired 13 not 12). First kills cyc 3,5,7,9 -- the zero/sign corner pairs delivered ONE CYCLE EARLY on the reg-to-reg screen path; the whole 100k random phase of ordinary arithmetic passes through the broken bank (probe evidence below). |
| D2b | same mutant | `tb_single` | **FALSE PASS** | a held transaction cannot expose a latency alternation. |
| D3 | `fp32_add2_p2`: bank 2 (output bank) `<=` changed to `=` | `tb_stream` | **SURVIVED** | PASS, all 101,111 -- nothing reads bank 2 on the same edge inside the DUT and the harness samples at the negedge, so the half-cycle-early update has no observer. A legal race falling the lucky way in Icarus 13.0 (both orders are LRM-legal), not a correct design. See D8/D9 for the composition matrix. |
| D4 | `fp32_add2_p2`: `p1_s_al <= s_al` line DELETED (undriven pipe register) | `tb_stream` | KILLED | 61,486 mismatches, ALL X-class; first X-guard hit cyc 12 (`00000000/00x`). The mutant T2 uses to reproduce ch09's `!=`-vacuity under streaming. |
| D4b | same mutant | `tb_single` | KILLED | 12,299 kills through the same X-guard -- the foil is weak, not vacuous. |
| D5 | `fp32_add2_p2`: full datapath reset added (every bank zeroed under `!rst_n`) | `tb_stream` | **SURVIVED** | PASS, all 101,111 -- under valid-gated checking the full reset is functionally equivalent after fill. The bug is what an UNGATED consumer sees during fill: the illegal all-zeros state decodes to a defined +inf/overflow/inexact, which the shipped `tb_reset` row C pins at its exact cycle (and T6/T6b prove that check can fail). Recorded as the measured argument for valid-only reset, not as a missed kill. |
| D6 | `fp32_add4_tree_p`: level-1 flag delay line bypassed -- ch10's combinational OR pasted verbatim (FLAG MIS-ALIGNMENT) | `tb_stream4` | KILLED | **16,162 mismatches / 101,019 (16.0%): result-changed = 0**, 15,662 flag-only, 500 X-class. First kill cyc 7: the L1-overflow quad retired `/100` where `/111` was due -- its own overflow+inexact donated two cycles early. The nastiest signature in the record: every data word correct. |
| D6b | same mutant | `tb_single4` (scratch foil) | **FALSE PASS** | 5,016 held quads green -- with held inputs the flag registers hold the same transaction's flags at retirement. |
| D7 | `fp32_add4_tree_p`: flag OR computed INSIDE the delay-line always block (direct read of the level-1 flag registers) with CORRECT non-blocking adders | `tb_stream4` | PASS (control) | The direct same-edge read is innocent by itself -- only a blocking-written source makes it a race. This run completes the three-way matrix with D8/D9. |
| D8 | D3's blocking output bank COMPOSED into the tree (all three `fp32_add2_p2` instances blocking-banked), shipped flag wiring | `tb_stream4` | **SURVIVED** | PASS, all 101,019 -- every consumer of the blocking-written registers (the level-2 stage-1 cloud through instance ports, the flag OR through the `f1` continuous assign) reads them behind at least one continuous-assignment hop, which in Icarus does not re-propagate before the same-edge readers sample. 202,130 streamed transactions across D3+D8 and no corruption through a wire hop. |
| D9 | D8 plus D7: the SAME flag OR moved one wire indirection closer (direct read of a blocking-written register) | `tb_stream4` | KILLED | **7,973 mismatches (7.9%)**: 7,693 flag-only, 280 X-class, result-changed = 0, from cyc 4 on. One wire indirection is the entire difference between D8's clean PASS and this -- the measured proof that "it simulated fine" cannot certify assignment discipline. |

## Mutation record: harness and testbench mutations

Twelve mutations of the shipped testbenches, thirteen runs -- C2 runs at
both depths (**11 killed or guard-fired as required, 1 measured no-op,
1 recorded FALSE PASS -- the `!=`-vacuity demonstration, deliberate**). "Killed" for a harness
mutation means the discipline it breaks is load-bearing: the mutant
either fails loudly against the CORRECT design or trips the guard it
attacks.

| # | Mutation | Result | Evidence |
|---|---|---|---|
| T1a | `tb_stream`: shared scoreboard index shifted, `idx = (cyc+1) % LAT` everywhere | **measured NO-OP** | PASS, all 101,111, correct DUT -- a circular queue read and written through ONE index is invariant under constant rotation. The shared-index shape makes the symmetric off-by-one structurally impossible. |
| T1b | `tb_stream`: read index computed SEPARATELY from the write index (`ridx = (cyc+1) % LAT` in the check phase only) -- ch05's scoreboard off-by-one, made expressible | KILLED | fails the CORRECT pipeline at cyc 3, the first adjacent differing pair (`80000000+80000000` blamed for its neighbor's `00000000`), then the truncated-drain guard on top. A scoreboard skew bug announces itself against correct hardware instead of silently blessing broken hardware -- provided results differ cycle to cycle, which the back-to-back corner stream guarantees. |
| T2 | `tb_stream`: `!==` weakened to `!=` AND the X-guard deleted, run against D4's undriven-register pipeline | **FALSE PASS (recorded)** | `PASS ... 101111 valid pairs` on a design whose sticky register is permanently x -- ch09's `!=`-vacuity finding reproduced in streaming form. The unweakened harness kills the same DUT 61,486 times from cyc 12. |
| T3 | `tb_stream` at `-DNPR=0` (random phases empty) | KILLED | drive-floor guard: `only 1114 valid pairs driven (full run needs >= 100103)`, `$fatal` before any PASS. |
| T4 | `tb_stream` at `-DLAT=3` against the 2-stage DUT (latency miscount) | KILLED | `out_valid=1 during fill, expected 0` at cyc 2, then 101,500 mismatches -- the harness pins latency to the SPECIFICATION (fill-cycle count), not to the DUT's own behavior, so a self-consistently-late pipe cannot pass. |
| T5 | `tb_stream`: drain deleted | KILLED | `out_valid=1 after drain` plus the count guard: `101111 valid pairs driven but 101110 checked (truncated drain)`. |
| C1 | `tb_stream`: renorm coverage bin with NO screen qualifier | KILLED | `renorm fired 14 times over corners+adjacency, expected 12` -- the two extras are the SCREENED pair `7F800000+7F7FFFFF` (both orders), don't-care datapath garbage inflating coverage. |
| C2 | `tb_stream`: renorm bin qualified by the INPUT-side `screen` wire instead of the round stage's pipelined copy | KILLED | **9** on the 2-stage pipe, **11** on the 4-stage (separate run) -- wrong in a depth-dependent way, because the qualifier is one-to-three transactions younger than the firing it gates. 9, 11 and 14 are all plausible nonzero counts that would sail through a `!= 0` empty-bin gate; only the pinned `=== 12` catches them. |
| T6 | `tb_reset`: row C's trap constant bent (`7F800000` -> `7F000000`) | KILLED | `FAIL tb_reset: row C: expected manufactured 7F800000/011 at obs 0` -- the pinned constant is load-bearing. |
| T6b | `tb_reset`: the `zero_dutc` deposit deleted (demonstration removed, checks kept) | KILLED | row C's defined-garbage and trap checks both fail -- the demonstration is measured, not narrated. |
| T7 | `tb_xinj`: deposit `1'b0` instead of `1'bx` (defined wrong sticky) | KILLED | `DEFINED WRONG output ed7e62ed/000 under X` then the classification guard `$fatal`s -- and en passant a real measurement: a defined-wrong sticky DOES produce defined-wrong results, which is exactly the class X-pessimism was hiding. |
| T8 | `tb_wave`: p2 marker expectation moved one slot late | KILLED | `FAIL tb_wave slot 12/13: p2 result wrong` -- the latency-as-slot-distance assertion is real. |
## What the record proves

The five pipeline-specific bug classes each have a witness, each witness
was shown able to fail, and each bug class was shown to PASS a plausible
weaker harness -- that asymmetry is the chapter:

1. **Data skew** (D1): 5.25% of streamed pairs, first kill inside the
   corner phase -- invisible to 20,092 held transactions (D1b).
2. **Flag mis-alignment** (D6): 16.0% of streamed quads with every data
   word correct -- invisible to held quads (D6b) and to any
   result-bits-only comparison.
3. **Blocking stage banks** (D2/D3/D8/D9): kills concentrated on
   reg-to-reg side channels and X-adjacency while 100k of random
   arithmetic passes; visibility depends on the READER's wiring (one
   continuous-assign hop hides it -- 202,130 streamed transactions of
   measured luck), so only the `<=` discipline, not simulation volume,
   certifies a bank.
4. **Illegal reset state** (D5 + `tb_reset` row C, T6/T6b): a full
   datapath reset survives valid-gated streaming precisely because the
   damage is a defined-looking +inf during fill -- the witness is a
   cycle-pinned cold-start check, not an equivalence sweep.
5. **Valid/data tearing** (the same-edge probes in the chapter, plus T4):
   the harness pins latency to the specification, so a pipe that is
   self-consistently one cycle late -- the measured result of same-edge
   driving -- cannot pass.

The harness disciplines are load-bearing in both directions: breaking the
scoreboard's shared index fails CORRECT hardware at cyc 3 (T1b), the
weakened comparison false-passes an undriven-register pipeline (T2), and
every count guard, coverage pin, and demonstration constant was made to
fire (T3-T8, C1/C2). The one measured no-op (T1a) is itself the lesson
that the shared-index shape has no expressible off-by-one.

Recounted totals: 13 design-mutant runs + 13 harness-mutation runs =
**26 mutation runs this session: 17 killed/guard-fired, 4 recorded false
passes (3 deliberate foil demonstrations D1b/D2b/D6b + T2's vacuity
demonstration), 3 survivors with structural reasons (D3, D5, D8 -- all
three teach why simulation cannot close them), 1 measured no-op (T1a),
1 passing control (D7).** Every mutant compiled with zero output under
`iverilog -g2012 -Wall`: no compiler diagnostic exists for any bug class
in this record.
