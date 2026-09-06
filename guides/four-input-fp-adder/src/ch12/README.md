# Chapter 12 source — Complete four-input adder: full source, testbench, corner case suite

<!-- sections complete: 6/6 -->


## Files

Every file was compiled and run under **Icarus Verilog 13.0** (built from tag
`v13_0`) on Linux x86-64 with `iverilog -g2012 -Wall`, zero compiler output on
every target. The flagship instantiates chapter 9's seven stage modules inside
chapter 11's `fp32_add2_p2` register banks inside chapter 10's tree shape --
ZERO datapath lines in this chapter are new, and the manifest compiles those
chapters' exact files next to these to keep that claim regression-guarded.

### Design module

| File | Is | Owns |
|---|---|---|
| `fp32_add4.v` | the flagship: pipelined four-input binary32 adder, latency 4, one quad/cycle | three `fp32_add2_p2` in the tree `(a+b)+(c+d)`, valid chained level to level, plus the 2-cycle level-1 flag delay line (6 flops) -- 336 state bits total. `rst_n` clears only the valid pipes (control-only reset, ch11's measured rule). Body restates ch11's `fp32_add4_tree_p` under the flagship name; the header credits it. |

### Self-checking testbenches

| File | Demonstrates |
|---|---|
| `tb_corners12.v` | **The corner suite**: 321 directed quads (`corner_list.vh`), every expectation pinned by the python models, run one quad at a time with the latency-4 protocol asserted per vector (`out_valid` low exactly 3 cycles, high exactly 1, low again). NaN rows compare class + quiet + payload[21:0] (mode 1) or class + quiet (mode 2), never the sign. Count-guarded against the generated `corner_count.vh`. |
| `tb_d9wit.v` | **The D9 witness**: 17 vectors (all 16 signed-zero quads + one cancellation-born-zero quad) into the combinational tree, asserting `exact_zero -> eff_sub` on the DUT's own wires in all three `fp32_add2` instances. Armed-guarded (fails if the invariant is never in a position to fail) and count-guarded. Kills the B-M2 mutant class that no black-box bench at any composition depth can see. |
| `tb_cov4.v` | **The coverage model**: 105 bins sampled from the pipelined DUT's own wires under ch11's stage-correct qualification, 58-quad directed floor + 3 random regimes (18,058 quads). Every bin definition is implemented a SECOND time in python and the directed phase's per-bin counts compared against `cov_pins.vh` with `!==` -- the M18 guard that makes bin definitions falsifiable. Partition invariants, the armed D9 never-bin, empty-bin `$fatal`. `-DALL_POSITIVE` and `-DNO_DIRECTED` are the shipped closure demonstrations (both must FAIL). |
| `tb_add4_stream.v` | Streaming equivalence, flagship vs ch10's combinational `fp32_add4_tree`: ch11's mutation-tested harness retargeted at LAT=4, seed 9090. 16 directed quads (flaggy adjacent to benign) + 5 regimes x `NPR` + valid/bubble mix, X-data bubbles, drain under X, count guards, 60,992 valid quads at the shipped `NPR=12000`. |
| `tb_add4_gold.v` | The same harness aimed at the ORDER-FAITHFUL golden chain (`ref_add4_tree` = three ch08 `fp32_add_alg` in tree order), fresh seed 777214, full-32-bit result compare (NaN payloads included) plus flags. 61,037 valid quads at the shipped size. The only bench in the repo checking the pipelined flagship against the golden chain directly. |

### Generators and pinned libraries (convention extension, stated deliberately)

This directory also ships four `.py` files and five generated `.vh` files.
That extends the repo's recorded artifact rule (chapter directories hold
`.v`, `.md`, `targets.txt`) and the extension is intentional, not sloppy:

- The `.vh` files are **compiled sources** -- `tb_corners12.v` and `tb_cov4.v`
  `` `include `` them, and the runner compiles in place so they resolve. They
  are checked in, byte-stable, and diffable.
- The `.py` files are the **independent second implementation** that pins
  them: every corner expectation and every coverage-bin definition exists
  once in Verilog and once in python, and the pinned counts are the bridge
  that makes a silent divergence between the two a loud failure (the M18
  guard). They are sources, not build artifacts; the harness never runs
  python; deleting them would leave the `.vh` files unauditable.

STATE.md's harness section and the F2 artifact check must carry this
extension for `src/ch12/` (`.py` generators + `.vh` includes).

| File | Is |
|---|---|
| `hwmodel.py` | algorithm-level event model of the golden steps (written from the documented algorithm, not the RTL), exposing per-stage events for bin prediction; proven equal to `oracle.py` and to RTL transcripts on 2,000,320 vectors |
| `oracle.py` | spec-level exact model (`fractions.Fraction` + hand RNE): design-semantics `fp32_add2`, the composed tree, and the correctly-rounded single-rounding four-input oracle |
| `corner_gen.py` | parses ch08's 46-pair library and ch10's composition quads out of their shipped testbenches, assembles the 321-quad library, pins every expectation via `hwmodel.py` → `corner_list.vh` + `corner_count.vh` |
| `cov_gen.py` | the 58-quad directed coverage library and its 105 pinned per-bin counts via `hwmodel.py` → `cov_dirlist.vh` + `cov_pins.vh` + `cov_names.vh` |

## Runs and reproduction

```sh
cd .. && bash run_all.sh ch12     # 5 targets, all green (76 s here)
```

PASS lines this session, with single-run wall-clock on this container:

```
PASS tb_corners12 (321 directed quads, python-pinned, latency protocol per vector)   0.1 s
PASS tb_d9wit (17 vectors, invariant armed 27 times across 3 instances)              0.0 s
PASS tb_cov4 (18058 quads, 105/105 bins, pins matched, D9 never-bin armed 27124 and empty)  3.8 s
PASS tb_add4_stream (60992 valid quads incl 16 directed, 1027 bubbles, 1 result/cycle, latency 4)  34.5 s
PASS tb_add4_gold (61037 valid quads incl 16 directed, 982 bubbles, 1 result/cycle, latency 4)     36.2 s
```

**Why the streaming targets ship at 60k quads, not the 101k headline size:**
ch11's shipped `tb_stream4` -- the same 101k workload -- measured 36.7 s when
recorded and 56.0 s on this same machine during this chapter's research
session. Same sources, same simulator; only the container's day differed. A
target sized to 93% of the 60 s `SIM_TIMEOUT` on one machine-day is a coin
flip on another; the 60k versions run at 55-60% of it. All wall-clock figures
in this file are session observations, not contracts. The 101k headline runs
reproduce out of harness:

```sh
iverilog -g2012 -Wall -DNPR=20000 -o /tmp/sim ../ch02/align_sticky.v \
  ../ch07/fp32_fields.v ../ch07/fp32_class.v ../ch09/fp32_unpack.v \
  ../ch09/fp32_screen.v ../ch09/fp32_swap.v ../ch09/fp32_align.v \
  ../ch09/fp32_addsub.v ../ch09/fp32_normalize.v ../ch09/fp32_round_pack.v \
  ../ch09/fp32_add2.v ../ch10/fp32_add4_tree.v ../ch11/fp32_add2_p2.v \
  fp32_add4.v tb_add4_stream.v && vvp /tmp/sim
```

yielding, this session (38.1 s and 38.7 s on today's unloaded container --
the same workload the research session clocked at 56-60 s; the drift is the
point of the sizing rule above):

```
PASS tb_add4_stream (101019 valid quads incl 16 directed, 1000 bubbles, 1 result/cycle, latency 4)
PASS tb_add4_gold (101013 valid quads incl 16 directed, 1006 bubbles, 1 result/cycle, latency 4)
```

(tb_add4_gold's line from the same command shape with `../ch08/fp32_add_alg.v
../ch10/ref_add4.v` in place of `../ch10/fp32_add4_tree.v`.)

Full-repo regression after adding this chapter: **108/108** (run with
`SIM_TIMEOUT=120` so a loaded container cannot flake the two 34-36 s
streaming targets or ch11's 56 s one; every target individually fits the
default 60 s on an unloaded machine).

## Mutation record: design mutants

Standing practice: every testbench must be shown able to fail. Every mutation
below was applied to a **copy** of the named shipped file in the session
scratchpad, compiled against the untouched dependencies with **zero**
compiler output (that silence is part of the record), and run this session.

Two mutants, six runs. **B-M2** is chapter 9's `exact_zero` gate dropped in
`fp32_addsub` (`assign exact_zero = (sum27 == 27'd0);`) -- chapter 10's D9,
the mutant class this chapter retires. **NOFD** is the level-1 flag delay
line bypassed in `fp32_add4` (`f1[...]` read combinationally instead of
`f1_d2[...]`) -- chapter 11's D6 bug class at the flagship. The two rows
marked SURVIVED are **required** survivals: the chapter's D9 proof says no
output-level bench can kill B-M2, and these runs are that statement measured
on the shipped suite.

| # | Mutant | Bench | Result | Evidence |
|---|---|---|---|---|
| DM1 | B-M2 | `tb_d9wit` | **KILLED, 27x** | 27 FAIL lines -- one per armed instance-vector, first on the all-`+0` quad at all three instances, last on the cancellation-born-zero quad at `u_add_r` (armed purely by BORN zeros): `FAIL tb_d9wit 42f6e979 c2f6e979 3f800000 bf800000: u_add_r exact_zero on an effective add`. The white-box witness is the mutant class's only output-independent killer, and it kills. |
| DM2 | B-M2 | `tb_corners12` | **SURVIVED (required)** | `PASS tb_corners12 (321 directed quads, ...)` -- all 16 signed-zero quads and the born-zero quad are IN the library and no output differs. The measured demonstration that the corner suite alone cannot witness D9; `tb_d9wit`'s wire check is load-bearing, not decorative. |
| DM3 | B-M2 | `tb_add4_stream` | **SURVIVED (required)** | `PASS ... (60992 valid quads ...)` with the mutant under BOTH the pipelined flagship and its combinational oracle -- the pipeline-level link in the chapter's closed empirical chain (mutant-pipe == mutant-comb == shipped-comb == shipped-pipe). |
| DM4 | B-M2 | `tb_cov4` | **KILLED** | `FAIL tb_cov4: exact_zero fired on an effective add 39 times` -- the D9 never-bin (deliberately NOT screen-qualified, unlike every counted bin) sees the wire the screen masks. Note the 105 pins still MATCH under the mutant: every counted datapath bin is screen-qualified, so the mutant's extra firings are invisible to them -- consistent with the proof, and the reason the never-bin exists. |
| DM5 | NOFD | `tb_corners12` | KILLED | 321 of 321 vectors fail, all through the X-guard: `FAIL tb_corners12 00000000 00000000 00000000 00000000: X in outputs 00000000/xxx`. Under the serial protocol the combinational OR reads the X-data bubble's flags at retire time -- the neighbor is X, so the theft is X. |
| DM6 | NOFD | `tb_add4_stream` | KILLED | **9,929 mismatches / 60,992 (16.3%): result-changed = 0**, 9,424 flag-only, 505 X-class. First kill cyc 7: the L1-overflow quad retired `7fc00000/100` where `/111` was due. Streaming catches the same bug by a different mechanism -- flaggy traffic adjacent to benign traffic donates and steals flags between VALID neighbors. |

DM5 vs DM6 is a protocol note the chapter spells out: the serial corner
protocol and the streaming harness kill the SAME skew bug by different
mechanisms, and neither subsumes the other -- serial would miss a skew
between two valid transactions (its stream has none adjacent), streaming's
scoreboard would absorb a latency-protocol bug that the serial bench pins
cycle by cycle. The kit ships both because they discharge different clauses
of spec S7.

## Mutation record: testbench, library, and coverage-model mutations

Seventeen runs: fifteen mutations of the shipped benches and their pinned
libraries (all killed or guard-fired), plus the two shipped closure
demonstrations (both must FAIL, and do). "Killed" for a bench mutation means
the discipline it breaks is load-bearing: the mutant fails loudly against
the CORRECT design or trips the guard it attacks.

The ten coverage-model mutations (m1-m10) are the chapter's payment of
ch05's recorded M18 debt ("the bin definitions are themselves unverified").
Each edits the coverage MODEL, not the DUT; the correct design runs
underneath every time. During the research pass, m4 and m5 initially
SURVIVED -- two genuine holes in the guard as first built -- and were killed
by fixing the directed LIBRARY (a live-datapath first quad + bubbles inside
the pinned phase for m4; boundary-adjacent cancel vectors at shl=7/8 for
m5). The shipped library is the fixed one; the record below is the full
battery re-run against it this session.

| # | Mutation | Result | Evidence |
|---|---|---|---|
| c1 | `corner_list.vh`: one pinned expectation bent 1 ulp (`4B800002` for `4B800001` on ch10's S2 row -- the bent value is the single-rounding oracle's answer) | KILLED | `FAIL tb_corners12 4b800000 3f800000 3f800000 3f800000: got 4b800001/001 expected 4b800002/001` -- the suite distinguishes the specified three-rounding composition from the correctly rounded sum on this vector. |
| c2 | `corner_list.vh`: the duplicated multiset row deleted at both occurrences | KILLED | `FAIL tb_corners12: 319 checks ran, expected 321` -- the generated count guard, so a shrunken library cannot pass silently. |
| w1 | `tb_d9wit`: arming counter disabled (`&& 0`) | KILLED | `FAIL tb_d9wit: invariant never armed (no eff_add with sum27==0 reached any instance)` on the CORRECT design -- a witness that lost its stimulus, or was re-aimed somewhere the condition cannot occur, announces its own vacuity. |
| w2 | `tb_d9wit`: all `chk_inv` calls deleted | KILLED | `FAIL tb_d9wit: 0 checks ran, expected 17` plus the armed guard -- both count guards fire on the correct design. |
| m1 | `expdbin` sticky boundary 25 -> 60 (ch05's exact recorded silent edit) | KILLED | `FAIL tb_cov4 pin: bin 52 expd_ab[d<25] = 7, python model pins 4` (+3 more pins) -- the library straddles the boundary at d = 24/25/26/27. |
| m2 | tie redefined `ng & ~nr` (sticky dropped from the tie test) | KILLED | `bin 75 rev_ab[tie_up] = 3, python model pins 1`. |
| m3 | renorm bin re-aimed at the WRONG instance's rounder (existing wire -- elaborates clean, ch10's T7 class) | KILLED | `bin 90 rev_r[round_renorm] = 2, python model pins 1`. |
| m4 | stage-2 qualification mistimed: `u_add_ab.vpipe[0]` -> `vpipe[1]` | KILLED | `bin 65 norm_ab[none] = 11, python model pins 15` (+6 more pins) -- visible ONLY because the pinned phase breaks the valid stream (bubbles every 7 quads) and opens on a live-datapath quad. |
| m5 | inter-pair-cancel deep boundary 8 -> 16 | KILLED | `bin 97 cancel_r_shallow = 3, python model pins 2` and `bin 98 cancel_r_deep = 3, pins 4` -- the shl=7/shl=8 adjacency pair moves both counters. |
| m6 | `sample_all` call deleted | KILLED | 108 errors: all 105 pins fail per-bin (`bin 0 cross_ab[ZEROxZERO] = 0, pins 5`, ...) plus the retired-vs-driven, never-armed, and empty-bin gates -- ch05's version of this mutant died only through the hole gate; the pins catch it bin by bin. |
| m7 | `~screen` qualification dropped from the ab eff-op bin | KILLED | `bin 58 effop_ab[add] = 51, python model pins 18` -- screened traffic bumping a datapath bin, ch11's C1 class caught by pin instead of by luck. |
| m8 | D9 never-bin condition inverted | KILLED | `FAIL tb_cov4: exact_zero fired on an effective add 59 times` on the CORRECT design -- the never-bin's own definition is falsifiable. |
| m9 | the PIN TABLE itself corrupted (`exp_dir[90]` 1 -> 2) | KILLED | `bin 90 rev_r[round_renorm] = 1, python model pins 2` -- the guard is two-sided: a wrong pin fails exactly like a wrong bin. |
| m10 | the `d <= 2` exponent bucket widened to `d <= 3` (the ch12 review's mx1) | KILLED (after a library fix) | first run: SURVIVED the entire shipped tb_cov4 -- the library had no vector between d=3 and d=24, so the boundary was unstraddled and both implementations moved together. The d=3 straddle quad `4B000000+49800000` was added (57 -> 58 quads, pins regenerated); the mutant now dies on two pins at once: `bin 51 expd_ab[d<=2] = 4, python model pins 3` and `bin 52 expd_ab[d<25] = 4, python model pins 5`. Third instalment of the straddle lesson, found by review rather than by the battery. |
| s1 | `tb_add4_stream` at `-DNPR=0` (random phases empty) | KILLED | `FAIL tb_add4_stream: only 1007 valid quads driven (this target needs >= 60017)`, `$fatal` before any PASS -- the drive floor. |
| g1 | `tb_add4_gold`: reference swapped to the order-UNFAITHFUL `ref_add4_seq` (ch10's T1 at the flagship) | KILLED | fails the CORRECT design **10,790 times in 61,037 quads (17.7%)**, first at cyc 7 on the multiset: `pipe 7fc00000/111 tree 7f800000/011` -- tree-qNaN vs chain-+inf, ch10's "one multiset, three answers" census landing in a live harness. An order-unfaithful reference is not a weaker check; it is a wrong one. |
| AP | `-DALL_POSITIVE`: random-only stimulus, signs forced positive -- ch05's closure demonstration re-run against the extended model | **FAILS as required** | `91/105 bins, 14 empty`: `effop_*[sub]` x3, `norm_*[leftN]` x3, `rev_*[round_renorm]` x3, `s1_ovf_cd`, `cancel_r_shallow`, `cancel_r_deep`, `s2_exact_zero`, `resclass[ZERO]`. The stimulus that closed ch05's 34-bin model 34/34 without one effective subtraction now fails loudly with the missing dimension named bin by bin -- the ch05 debt, cashed. |
| ND | `-DNO_DIRECTED`: the three random regimes alone, signs free (18,000 quads) | **FAILS as required** | `98/105 bins, 7 empty`: all three `round_renorm` bins (0 hits in 18k random -- ch08's finding at composition scale), both `s1_ovf` bins, `s2_exact_zero`, `resclass[ZERO]`. These are the directed-only bins, named by measurement. |

## What the record proves

1. **D9 is retired, not excused.** The mutant class that survived chapter
   10's entire composition campaign and rode through chapter 11 unchanged
   now has a standing killer (DM1, 27 kills on the wire) and a coverage
   never-bin (DM4) -- while DM2/DM3 measure, on the shipped suite, exactly
   what the chapter's five-step proof says: no output-level bench can see
   this class. Both facts are in the record on purpose; either alone would
   be misleading.
2. **The bin definitions are no longer trusted text.** All nine ways of
   silently bending the coverage model -- boundaries moved (m1, m5),
   event definitions weakened (m2), sampling re-aimed (m3) or mistimed
   (m4), qualification dropped (m7), sampling deleted (m6), the never-bin
   inverted (m8), the pin table itself corrupted (m9) -- die against the
   python pins. Ch05's recorded blind spot ("moving the expdbin boundary
   from 25 to 60 still closes 34/34 silently") is now a one-line kill.
3. **Closure is measured, honestly.** The model closes 105/105 under the
   shipped stimulus, and the same model FAILS its own random-only (7
   holes) and all-positive (14 holes) demonstrations -- closure measures
   whatever the bins encode, and these bins now encode the dimensions
   ch05 named as missing.
4. **The reference discipline still binds at the flagship.** g1: an
   order-unfaithful golden chain fails the correct design 10,790 times --
   ch10's T1 finding, now regression-adjacent to the shipped gold target.
5. **Every guard fires.** Count guards (c2, w2, s1), arming guards (w1),
   pinned constants (c1), and the X-guards (DM5's 321 kills) were each
   made to fire this session; no check in the kit passes vacuously.

Recounted totals: 6 design-mutant runs + 15 bench/library/coverage-model
mutation runs + 2 shipped closure demonstrations = **24 recorded runs this
session: 20 killed or guard-fired, 2 REQUIRED survivals (DM2, DM3 -- the
D9 proof measured on the shipped suite, each backed by the written proof
and the 2,000,320-vector adversarial diff), 2 required-FAIL closure
demonstrations (AP, ND).** Every mutant compiled with zero output under
`iverilog -g2012 -Wall`: no compiler diagnostic exists for any bug class
in this record.

## Regenerating the pinned libraries

The five `.vh` files are generated, checked in, and byte-stable. To audit
them (or after deliberately changing a bin definition in BOTH
implementations -- which is a reviewable spec change, the only kind the
guard permits):

```sh
cd src/ch12
python3 corner_gen.py     # corner_list.vh + corner_count.vh; prints the census
python3 cov_gen.py        # cov_dirlist.vh + cov_pins.vh + cov_names.vh
git diff --stat           # must be empty if nothing was meant to change
```

Both generators re-derive every expectation from `hwmodel.py` in under a
second. The reviewer move the chapter invites: move a boundary in ONE
implementation and watch the pin fail -- that failure is the M18 guard
working, and rows m1-m10 above are ten recorded instances of it.

Verification pedigree of the models themselves, re-run this session:
`hwmodel.py` == `oracle.py` == the shipped RTL on 1,000,064 adversarial
pairs and `oracle.py` == RTL on 1,000,256 adversarial quads (results AND
flags; transcripts from the D9 diff builds), zero mismatches -- so the
"independent second implementation" behind the pins is itself pinned to
the design at the two-million-vector level, by a model written from the
spec rather than from the RTL.
