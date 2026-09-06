# Chapter 4 review, round 2 — Simulation, Testbenches and Waveforms

Reviewer persona: RTL veteran. Round 1 scored this chapter 6/10 with four blocking
defects. A fix round has run. Everything below was re-run on this machine
(Icarus Verilog 13.0, macOS 24.6.0 arm64). Nothing the fix round claims was taken on
trust; every number here was produced by a command I typed.

<!-- sections complete: 8/8 -->

## Verdict

**Score: 7/10**

The fix round did real, verifiable work — B1, B2 and B4 are fully closed, eleven of the
twelve non-blocking items are closed, all seven listings are still byte-identical to disk,
every transcript still reproduces, the depth table is now exact on all four rows, three of
the four FST byte counts are byte-exact against the chapter's own command, and the Makefile
is correct across seventeen invocations including the gate demonstration performed in the
order the prose gives it. But B3 is only partially closed and the fix round wrote a false
measurement into the sentence that certifies it: `pipe2` with **a flip-flop on the wrong
clock edge** — the exact mutation line 353 claims fails — passes, as does a `pipe2` rebuilt
as a **single negative-edge flip-flop**, which prints `PASS tb_dump (latency 2, q=17)` and
sails through all fourteen targets, one character away from the defect round 1 found. Two
further testbench holes survived the "all 14 audited" claim — `adder8`'s carry-out is read
by no testbench in the chapter, so tying it to 0 or 1 gives a clean 14/14, and `tb_dump`'s
cycle-counted watchdog cannot fire when the clock is what died, hanging forever on the
chapter's own documented `reg clk;` trap — which puts this above the one-real-defect band
and squarely where a reader following the chapter's own closing checklist would be actively
misled.

## Status of round-1 defects

### B1 — the `$dumpvars` depth table is stale — **CLOSED**

Re-measured against the shipped `tb_dump.v` by counting `^\$var` lines in four dumps:

| invocation | chapter now says | measured |
|---|---|---|
| `$dumpvars;` and `$dumpvars(0, tb_dump);` | 19 | **19** ✔ (both forms; `+depth=0` also gives 19) |
| `$dumpvars(1, tb_dump);` | 6 | **6** ✔ |
| `$dumpvars(2, tb_dump);` | 13 | **13** ✔ |
| `$dumpvars(0, tb_dump.u_pipe);` | 10 | **10** ✔ |

The lead-in's second-order fix is right too. It now says the design "holds six scopes — the
module `tb_dump`, the instances `u_pipe` and its `u_a`/`u_b`, and the named blocks `dumpctl`
and `watchdog`", and the VCD contains exactly those six `$scope` lines and no others. The
invocation is stated, so a reader can reproduce it. Fully closed.

### B2 — the Makefile passes a broken DUT, and the gate demo is a no-op — **CLOSED**

Seventeen commands, full table in *Makefile audit*. The headline results: warm `make` runs
all 14 tests with **0** recompiles; warm `make -k PLUSARGS=+break` **exits 2** in the order
the prose gives it, with no `make clean` in front; a broken `adder8.v` on a warm tree stops
at `FAIL tb_stimulus` with **exit 2**, and `make -k` catches `tb_vectors` too. Round 1's
`make: Nothing to be done for 'all'.` is gone in both scenarios. The quoted transcript
reproduces line for line including the new `make: *** [run-tb_vectors] Error 1`.

### B3 — `tb_dump.v` asserts a latency it does not test — **PARTIALLY CLOSED**

The check did move inside the stimulus loop and it is a real improvement: the exact mutant
round 1 used (one `posedge` flip-flop) is now caught, along with 13 of the 19 `pipe2`
mutants I threw at it, including several the fix round never tried. The drain check was
correctly kept and independently kills a mutant the in-loop check cannot see. The `ncyc < 3`
precondition is correct — see *New defects* for the boundary analysis.

**But the defect's family is not closed.** A `pipe2` built from a **single flip-flop on the
negative edge** — latency half a cycle, one flop — still prints `PASS tb_dump (latency 2,
q=17)`, exit 0, and still passes the full 14-target harness. So does moving *either* one of
the two flip-flops to the negative edge. And the chapter's own sentence certifying the fix
("with a flip-flop on the wrong clock edge, fails it four times out of four") does not
reproduce. Details and traces in *Mutation testing*.

### B4 — the `$dumpfile` extension claim is false — **CLOSED**

Re-measured in both directions, one clean directory per case, format identified from the
file's magic bytes rather than its name:

| `$dumpfile` argument | flag | file produced | first bytes | actual format |
|---|---|---|---|---|
| `"tb"` | *(none)* | `tb.vcd` | `24 64 61 74 65` (`$date`) | VCD text |
| `"tb"` | `-fst` | `tb.fst` | `00 00 00 00 00 00 00 01` | FST binary |
| `"tb.vcd"` | `-fst` | **`tb.vcd`** | `00 00 00 00 00 00 00 01` | **FST binary** |
| `"tb.fst"` | *(none)* | `tb.fst` | `24 64 61 74 65` (`$date`) | **VCD text** |

`tb.vcd.fst` is never produced. The chapter's replacement text — "`-fst` with `"tb.vcd"`
writes FST into `tb.vcd`, and `"tb.fst"` with no flag writes VCD text into `tb.fst`, so the
extension lies in both directions" — is exactly what the bytes say. Research note correction
6 records the same thing. Fully closed.

### The twelve non-blocking items — eleven closed, one partial

| # | item | status |
|---|---|---|
| N1 | `iverilog` exit-code mapping | **PARTIAL** — see *Remaining defects* R5 |
| N2 | undeclared `tb_strobe` transcript | **CLOSED** — the full 17-line run is shown and is identical to a fresh capture, line for line; all four disagreeing edges are visible on the page |
| N3 | `tb_random.v` "a literal is a compile error" comment | **CLOSED** — now "accepted by iverilog and rejected by vvp at load time" |
| N4 | FST table has no reproduction command | **CLOSED** — the `+dump=/tmp/w.vcd +cycles=100000` command is stated, and it is what reproduces the byte counts |
| N5 | `$monitor` claim has no transcript | **CLOSED** — the six `B:` lines are printed and match exactly |
| N6 | `make lint` lints one file | **CLOSED** — verified by injecting a syntax error into `tb_vectors.v` and then `tb_plusargs.v`; `lint` exits 2 for both |
| N7 | `s_rmf.v` quoted but not shipped | **CLOSED** — declared in the prose as "written for this measurement and not shipped in `src/ch04/`" |
| N8 | README seed-error block missing `file:line:` | **CLOSED** — now `ERROR: seedguard.v:6: …` |
| N9 | `x` region drawn as a valid `00` | **CLOSED** — `q`'s first segment now reads `<   x    >` |
| N10 | "horizontal distance … two cycles" ambiguity | **CLOSED** — now "count the rising edges between the two and you get two" |
| N11 | `surfer` quoting slips | **CLOSED** — body now quotes `surfer: stable 0.7.0 (bottled), HEAD` and reconciles GHW/FTR |
| N12 | `tb_anatomy.v` dumps a 2048-bit string | **CLOSED** — `dumpfile` moved into the `dumpctl` named block; the listing grew from 78 to 81 lines and is still byte-identical to disk |

## Mutation testing

**63 distinct mutants, 91 mutant-versus-testbench runs, 13 of the 14 testbenches attacked.**
Every mutation was applied to a copy of the tree in the scratchpad, compiled with the same
`iverilog -g2012 -Wall -y .` the harness uses, and scored CAUGHT (`rc != 0` or `FAIL` in the
output) or MISSED. The pristine file was restored after every single run. **I found a
testbench that still cannot fail for a whole family of mutations, and a claim in the
chapter about that testbench that does not reproduce.**

### `pipe2` versus `tb_dump` — the round-1 defect, re-attacked

The fix round's four mutations do all fail, as claimed:

| mutant | result | first failure |
|---|---|---|
| one flip-flop (`u_b` deleted, `assign q = mid`) | **CAUGHT** | `cyc=2 q=11, expected 10` |
| three flip-flops | **CAUGHT** | `cyc=2 q=00, expected 10` |
| zero flip-flops (`assign q = d`) | **CAUGHT** | `cyc=2 q=11, expected 10` |
| both flip-flops on `negedge` | **CAUGHT** | `cyc=2 q=00, expected 10` |
| `+cycles=2` on the real `pipe2` | **CAUGHT** | `+cycles=2 is too few to see a latency of 2` |

Nine further mutations the fix round did not try, all caught:

| mutant | result |
|---|---|
| `u_b` fed from `d` instead of `mid` (parallel taps, latency 1) | CAUGHT `cyc=2 q=11` |
| `+1` inserted between the stages (right latency, wrong value) | CAUGHT `cyc=2 q=11` |
| output rotated one bit (`{qi[6:0], qi[7]}`) | CAUGHT `cyc=2 q=20` |
| top nibble tied low | CAUGHT `cyc=2 q=00` |
| output stuck at its reset value | CAUGHT `cyc=2 q=00` |
| combinational `q = d - 1` — **satisfies the in-loop formula exactly** | CAUGHT, **by the drain check only** (`q=16 at the end, expected 17`) |
| four flip-flops | CAUGHT `cyc=2 q=xx` |
| both flops using blocking `=` (the classic NBA bug) | CAUGHT `cyc=3 q=12` |
| 2.5-cycle latency (three flops, last on `negedge`) | CAUGHT `cyc=2 q=00` |

The `q = d - 1` result is worth recording because it vindicates the fix round's decision to
**keep** the drain check. At the in-loop sample point `d` still holds its pre-NBA value, so
a zero-latency `d - 1` produces precisely the expected number and slips past the new check;
only the drain check kills it. The two checks are complementary, not redundant.

### The family that survives: anything whose output moves on the falling edge

| mutant | latency | `q` changes at | result |
|---|---|---|---|
| real `pipe2` (two `posedge` flops) | 2 cycles | t=15, 25, 35 … | — |
| `u_a` on `negedge`, `u_b` on `posedge` | 2 cycles | t=15, 25, 35 … | MISSED — *equivalent at the port* |
| **`u_b` on `negedge`** (one flop on the wrong edge) | 1.5 cycles | **t=10, 20, 30 …** | ***MISSED*** |
| **`u_a` on `negedge`** (one flop on the wrong edge) | 1.5 cycles | **t=10, 20, 30 …** | ***MISSED*** |
| **one flop total, on `negedge`** | **0.5 cycles** | **t=10, 20, 30 …** | ***MISSED*** |
| dual-edge flops (`posedge clk or negedge clk`) | 1 cycle | **t=10, 20, 30 …** | ***MISSED*** |

The `negedge`/`posedge` mixed pair is a fair equivalent mutant — I traced `q` on all
variants and its transitions are bit-for-bit identical to the real design, so no testbench
could distinguish it. **The other four are not.** Their `q` moves half a cycle early, on the
*falling* edge, and one of them is a **single flip-flop** — the exact shape of the round-1
defect. All four print:

```
PASS tb_dump (latency 2, q=17)
```

The cause is structural and survives `+cycles=3`, so it is not an artifact of the cycle
count. `tb_dump`'s in-loop check reads `q` in the active region at a `negedge`, so it sees
`q`'s *pre-negedge* value; any design whose output changes exactly on that edge is sampled
half a cycle early and lands on the expected number by construction. The check pins *what
value `q` holds at one instant per cycle* and never pins *when `q` changes* — which is the
property the chapter's ASCII figure draws, the property the reader is told to count with a
finger, and the payload of the chapter-11 seed.

**This makes a sentence in the chapter false.** Line 353:

> `pipe2` rebuilt with one, three and zero flip-flops, and with a flip-flop on the wrong
> clock edge, fails it four times out of four.

"A flip-flop on the wrong clock edge" is exactly the mutation in rows 3 and 4 above, and it
**passes**. The claim is true only under the reading "*both* flip-flops on the wrong edge",
which is not what the sentence says, and which is the less natural reading of "a flip-flop".

### `dff` versus `tb_strobe` — 5 of 7 caught

| mutant | result |
|---|---|
| blocking `q = d` | CAUGHT — `2 edges disagreed, expected 4` (the chapter predicts exactly 2) |
| `negedge` flop | CAUGHT — `0 edges disagreed` |
| stuck at `8'h00` | CAUGHT — `1 edges disagreed` |
| transparent latch `always @(*)` | CAUGHT — `0 edges disagreed` |
| `#1` transport delay | CAUGHT — `0 edges disagreed` |
| `q <= d + 1` | MISSED by `tb_strobe`; **CAUGHT by `tb_dump`** |
| `q <= ~d` (inverting flop) | MISSED by `tb_strobe`, **MISSED by `tb_dump`** (two stages cancel), **MISSED by the whole suite** |

`tb_strobe` missing a functional break is fine and honest — it counts region disagreements
and its verdict says only that. The fix round's change from "more than zero" to exactly four
is a real improvement and I confirmed it discriminates: 2, 1 and 0 disagreements all fail.
But **an inverting flip-flop passes all fourteen targets**, because `pipe2`'s two stages
cancel the inversion and nothing else checks `dff` in isolation.

### `counter4` versus `tb_anatomy` — 8 of 10 caught

CAUGHT: count-by-2, no reset, inverted reset polarity, enable ignored, `negedge` clock,
count down, 3-bit wrap, reset value 1. MISSED: **asynchronous reset** and **blocking `q = q + 1`**
— both genuinely unobservable under this stimulus (reset is asserted at t=0 and released on
a `negedge`; there is one clocked process and no second reader of `q`). Fair equivalent
mutants; `tb_anatomy` is a solid test.

### `adder8` versus its three testbenches — a hole the fix round missed

Eight mutants against `tb_vectors`, `tb_stimulus` and `tb_check` (24 runs):

| mutant | tb_vectors | tb_stimulus | tb_check |
|---|---|---|---|
| `a - b` | CAUGHT | CAUGHT | MISSED |
| `a + b + 1` | CAUGHT | CAUGHT | CAUGHT |
| `a \| b` | CAUGHT | CAUGHT | CAUGHT |
| LSB of `a` dropped | CAUGHT | CAUGHT | MISSED |
| `a + b + (a[7] & b[7])` | CAUGHT | MISSED | CAUGHT |
| `b + a` (commutative) | MISSED | MISSED | MISSED — equivalent mutant |
| **`cout` tied to `1'b0`** | ***MISSED*** | ***MISSED*** | ***MISSED*** |
| **`cout` tied to `1'b1`** | ***MISSED*** | ***MISSED*** | ***MISSED*** |

**`adder8`'s carry-out is verified by nothing in the chapter.** All three testbenches
declare a `cout` wire and connect it to the DUT; `grep` confirms not one of them ever reads
it. I tied `cout` to `0` in the real tree and ran the real harness:

```
$ bash run_all.sh ch04     # adder8 with `assign sum = a + b; assign cout = 1'b0;`
  passed: 14
  failed: 0
```

Same for the inverting `dff`, and same for the single-`negedge`-flop `pipe2`:

| DUT broken in the real tree | `run_all.sh ch04` |
|---|---|
| `adder8` carry-out tied to `1'b0` | **14 passed, 0 failed** |
| `dff` inverting (`q <= ~d`) | **14 passed, 0 failed** |
| `pipe2` as one `negedge` flop (latency 0.5) | **14 passed, 0 failed** |

The tree was restored and byte-compared against a pristine backup after each run.

### The four testbenches the fix round refused to strengthen

| file | can it detect the trap it narrates? | is the refusal justified? | does the file say so? |
|---|---|---|---|
| `bad_severity.v` | No — checks nothing at all. Replacing `$error` with `$display` is MISSED | **Yes.** The file exists to be reported PASS *while* printing `ERROR:`; a check would defeat it | **Yes** — "Nothing here checks anything. That is the point." |
| `bad_monitor.v` | No — deleting the first `$monitor` entirely, or renaming it, is MISSED | **Yes.** A testbench genuinely cannot observe monitor-slot count | **Yes** — "The PASS line here checks the stimulus, not the monitor … The evidence for the trap is the transcript", and the chapter now prints that transcript |
| `bad_dumparray.v` | No — deleting the per-word `$dumpvars` is MISSED | **Yes** for the load-time error; **arguably not** for array absence, which is greppable from the VCD it already writes | **Partly** — it states the trap as fact but carries no "this file does not check that" sentence, unlike the two above |
| `tb_check.v` | Catches mutations to `bad_adder8` (xor → `2 mismatches, expected 3`; made correct → `0 mismatches`) but not to `adder8` | **Yes for `sum`**, which `tb_vectors` and `tb_stimulus` cover; **no for `cout`**, which nothing covers | Its header explains the MISMATCH-not-FAIL convention but does not say it never tests `adder8` |

Their stimulus checks all work — `bad_monitor` caught `repeat(3)→repeat(2)`, `bad_dumparray`
caught changed memory contents, `bad_severity` caught `$error`→`$fatal`. Three of the four
refusals are correct and honestly documented. Only `bad_dumparray` lacks the explicit
disclaimer sentence its two siblings carry.

### Everything else attacked

- **Data files.** `vectors_bad.hex` repacked one-per-line → CAUGHT; emptied → CAUGHT.
  `vectors.hex` with one expected sum corrupted → CAUGHT; emptied → CAUGHT by the load
  guard; truncated to 4 of 8 vectors → CAUGHT by the load guard. The `$readmemh` guard is
  as good as round 1 said.
- **`tb_period`** — both clocks moved to `1ns/1ps` → CAUGHT. Hard-coding the coarse
  generator to `#3.0` → MISSED, correctly: it produces the identical 6 ns clock, so it is an
  equivalent mutant.
- **`tb_print`** — 3 of 3 caught. Removing the `x` from `partly_unknown`, changing
  `$timeformat`'s arguments, and changing `v` from 90 to 10 all fail. The new `$sformat`
  assertions are real.
- **`tb_random`** — 2 of 2 caught. One extra `$random` call before the sampled four shifts
  the whole stream and fails; seed 7 → 8 fails. It pins the stream exactly, as it claims.
- **`tb_plusargs`** — default `10` → `11` CAUGHT. I also re-ran all four invocations its
  header documents; `+count=7` gives `ok=1 count=7`, `+VERBOSE` correctly does not match
  `verbose`, and the absent-argument defaults survive. Correct.
- **`tb_stimulus`** — swapping `#10 a = …` to `a = …; #10` is CAUGHT. Replacing the
  intra-assignment `a = #10 8'h20;` with an ordinary `#10 a = 8'h20;` is **MISSED**, and
  cannot be otherwise: the right-hand side is a literal, so the two forms are indistinguishable
  by construction. The file demonstrates a distinction it cannot test.
- **`tb_strobe`** — moving stimulus onto the sampling edge with a blocking assignment →
  CAUGHT (`2 edges disagreed`).
- **Watchdogs.** I killed the clock the way the chapter's own traps table does it — `reg clk;`
  with no initialiser, so `~x` is `x` and no edge ever occurs:

  | testbench | watchdog style | result |
  |---|---|---|
  | `tb_anatomy` | `#10000` wall-clock | **fires in ~1 s**: `FAIL tb_anatomy: timeout at 10000000` |
  | `tb_dump` | `repeat (limit + 20) @(posedge clk)` | ***never fires*** — killed after 15 s |

  A watchdog counted in clock edges cannot fire when the clock is what died, which is the
  commonest cause of a hung simulation and a trap this chapter documents itself. Neither
  `run_all.sh` nor the Makefile imposes a timeout, so this hangs a regression forever.
  Round 1 praised this watchdog as "better practice" than `tb_anatomy`'s; it is worse in
  precisely the case a watchdog exists for.

## Makefile audit

Every command below was run in `guide/src/ch04` with `BUILD=/tmp/ch04-audit` (the default
`/tmp/ch04-build` behaves identically; the override was used so the audit could not collide
with a stale tree). **The `FORCE`-gated redesign works, and B2 is genuinely closed.**

| # | command | tree state | EXIT | ok | FAIL | `iverilog` invocations |
|---|---|---|---|---|---|---|
| 1 | `make` | cold | **0** | 14 | 0 | 14 |
| 2 | `make` | warm | **0** | 14 | 0 | **0** |
| 3 | `make -k PLUSARGS=+break` | warm | **2** | 13 | 1 | 0 |
| 4 | `make PLUSARGS=+break` (no `-k`) | warm | **2** | 9 | 1 | 0 |
| 5 | `make -j8` | cold | **0** | 14 | 0 | 14 |
| 6 | `make -j8 -k PLUSARGS=+break` | warm | **2** | 13 | 1 | 0 |
| 7 | `touch tb_dump.v; make` | warm | 0 | 14 | 0 | **14** |
| 8 | `touch adder8.v; make` | warm | 0 | 14 | 0 | **14** |
| 9 | `touch vectors.hex; make` | warm | 0 | 14 | 0 | **0** |
| 10 | `make -n` | warm | 0 | — | — | 0 printed, 14 `vvp` printed |
| 11 | `make -n` | cold | 0 | — | — | 14 printed, nothing created |
| 12 | `make lint` | any | **0** | — | — | 14 elaborations |
| 13 | `adder8.v` → `a - b`; `make` | warm | **2** | 7 | 1 (`FAIL tb_stimulus`) | 8 |
| 14 | same tree, `make -k` | warm | **2** | 12 | 2 (`tb_stimulus`, `tb_vectors`) | 0 |
| 15 | restore `adder8.v`; `make` | warm | **0** | 14 | 0 | 14 |
| 16 | `make clean` | — | 0 | — | — | build dir removed |
| 17 | `make BUILD=/tmp/ch04-elsewhere` | cold | 0 | 14 | 0 | 14 |

**Row 2 is the one that mattered and it is right.** A warm `make` runs all fourteen tests
and recompiles nothing — compiles cache, runs do not. Row 3 is the chapter's centrepiece
performed *in the order the prose gives it* (`make`, then `make -k PLUSARGS=+break`, no
`make clean` between), and it now exits 2. Round 1's `make: Nothing to be done for 'all'.`
is gone.

**The chapter's quoted `-k PLUSARGS=+break` transcript reproduces exactly**, including the
updated target name in the make error line:

```
ok   tb_strobe
FAIL tb_vectors  (rc=1)
    FAIL tb_vectors: t=5000 a=ff b=01 got=00 want=aa
    FAIL tb_vectors: 1 of 8 vectors wrong
    FATAL: tb_vectors.v:61: 1 error(s)
           Time: 16000  Scope: tb_vectors
make: *** [run-tb_vectors] Error 1
ok   bad_dumparray
```

Rows 13 and 14 are the regression test round 1 asked for, and both match the chapter's
sentence word for word: warm `make` on a broken `adder8.v` "stops at `FAIL tb_stimulus`
with exit 2, and `make -k` carries on to catch `tb_vectors` too."

### Collateral damage from the `FORCE` redesign — checked, and clean

- **Caching still correct.** Row 2 shows zero recompiles on a warm tree; rows 7 and 8 show
  that touching *any* `.v` rebuilds all fourteen, which is the coarse-but-honest behaviour
  the comment promises. `.PRECIOUS: $(BUILD)/%.vvp` does its job: with `run-%` now a
  pattern rule, the `.vvp` files are intermediates and would otherwise be deleted after
  every build, which would silently destroy the caching the comment claims. It is
  load-bearing and it works.
- **Still parallel-safe.** Rows 5 and 6: `-j8` cold is 14/0 exit 0, and `-j8 -k` with a
  broken plusarg is exit 2. The order-only `| $(BUILD)` prerequisite still prevents the
  `mkdir` race, and no test writes into the source directory.
- **`make -n` is honest.** Rows 10 and 11: it prints the fourteen `vvp` lines it would run
  and creates nothing — not even `$(BUILD)`, whose `@mkdir -p` is correctly suppressed.
- **A failure stops the build at the right point.** Row 4: without `-k`, `make` halts after
  the first failing target (9 ok, then stop) and returns 2; with `-k` it runs the rest and
  still returns 2. Both are correct GNU make semantics and both are what the prose says.
- **`FORCE` is declared `.PHONY`**, which is the right call — it stops a stray file named
  `FORCE` from disabling every run in the suite. Round 1's `%.log` file target is gone.
- **`make lint` now covers the whole suite.** Round-1 item N6 is closed: I appended a
  syntax error to `tb_vectors.v` and then to `tb_plusargs.v` in a scratch copy and `lint`
  exited **2** both times, naming the right file and line. It lints all fourteen, matching
  what `README.md` documents, and leaves no artifacts.

### Two honest caveats, neither a defect

- **`$(DATA)` is inert.** `run-%: $(BUILD)/%.vvp $(DATA) FORCE` — `FORCE` already makes
  every `run-%` unconditionally out of date, so the `$(DATA)` prerequisite can never change
  a decision. Row 9 confirms it: touching `vectors.hex` causes zero recompiles and the same
  fourteen runs that would have happened anyway. Harmless, but the prose bundles it into a
  load-bearing claim — see *Remaining defects* R4.
- **GNU Make 3.81, second-granularity mtimes.** The `make` on this machine is Apple's
  bundled 3.81, which has no sub-second timestamp support. If a DUT edit lands in the same
  filesystem second as the previous build, `make` does not notice it: I forced
  `adder8.v`'s mtime equal to `tb_stimulus.vvp`'s, broke the adder, and got **14 ok, exit
  0**. With a normal ≥1 s separation (rows 13–15) everything is correct. This is inherent
  to make 3.81 rather than to this Makefile, no human edit-then-build cycle can hit it, and
  the chapter claims nothing to the contrary — recorded so a later fix round does not
  "discover" it as a regression.

## New defects introduced by the fix round

Two, one of them serious. This project's pattern of "each fix round closes defects and opens
new ones" holds again, though at lower amplitude than before.

### D1. The sentence certifying the B3 fix states a measurement that does not reproduce

Chapter line 353, written by the fix round to report its own mutation testing:

> The check now runs inside the stimulus loop while the pipe is still full, and `pipe2`
> rebuilt with one, three and zero flip-flops, and with a flip-flop on the wrong clock
> edge, fails it four times out of four.

I rebuilt `pipe2` with **a flip-flop on the wrong clock edge** — `u_b` changed to
`always @(negedge clk) q <= d;`, one flip-flop, one edge, everything else identical — and
got:

```
PASS tb_dump (latency 2, q=17)
EXIT=0
```

Moving `u_a` instead of `u_b` gives the same result. The claim holds only for *both* flops
moved, which is not what "a flip-flop" says. This is the worst kind of error for this
chapter: a false measurement in the one sentence that tells the reader the cautionary
example has been fixed, in a chapter whose stated differentiator is that its measurements
are real. It also directly undercuts the final checklist item, which instructs the reader to
"break the *DUT* instead, and confirm the testbench that claims to check it goes red" — a
reader who breaks it this way gets green.

### D2. `$(DATA)` is presented as load-bearing and is inert

The fix round added `DATA := $(wildcard *.hex)` and put `$(DATA)` on the `run-%` rule. The
prose then says:

> **Every `.v` and every `.hex` is a prerequisite**, because `make` cannot see the edge
> `-y .` creates — that is the whole reason the harness notices a broken DUT.

The `.v` half is true and load-bearing: `$(SRCS)` on the `$(BUILD)/%.vvp` rule is what makes
a broken `adder8.v` rebuild and fail. The `.hex` half is not. `run-%` already carries
`FORCE`, which makes every run unconditionally out of date, so `$(DATA)` can never change a
decision. Measured: `touch vectors.hex; make` → 0 recompiles and the same 14 runs that would
have happened anyway. Nor is a `.hex` change *why* the harness notices a broken DUT — data
files are read by `$readmemh` at run time and never enter a compile. Harmless in the
Makefile, wrong in the sentence.

### Checked for collateral damage and found clean

- **The `ncyc < 3` precondition is correct and rejects nothing legitimate.** Boundary
  measured on the real `pipe2`: `+cycles=0/1/2` fail with the precondition message,
  `+cycles=3/4/5/8/20` and the no-plusarg default all pass. Three is exactly the smallest
  value at which the `cyc >= 2` in-loop check can execute even once, so the guard is set at
  the right number, not a round one. I confirmed the check is still discriminating at that
  boundary: at `+cycles=3` the one-, three- and zero-flop mutants are all still caught.
- **The `FORCE`/`run-%` redesign does not break caching, parallelism, `-n`, or the stop
  point.** Seventeen commands in *Makefile audit*; all correct.
- **`tb_strobe`'s new exact-four requirement discriminates properly** — 2, 1 and 0
  disagreements all fail it — and did not become brittle.
- **`tb_print`'s new `$sformat` assertions are real**, catching 3 of 3 targeted mutations.
- **No transcript drifted.** Every quoted block re-runs identically; see *Code verification*.

## Code verification

### Harness

- `bash run_all.sh ch04` → **14 passed, 0 failed, exit 0.** All fourteen manifest lines are
  `run`; no `xfail`.
- `bash run_all.sh` → **61 passed, 0 failed, exit 0.** Both claims hold.

### Listings versus files on disk

Mechanically diffed every fenced `verilog`/`make` block against every file in `src/ch04`.
**All seven are byte-identical; zero divergence.**

| ch04.md line | lines | file | result |
|---|---|---|---|
| 20 | 81 | `tb_anatomy.v` | **whole file, byte-identical** (grew from 78 with the N12 fix) |
| 134 | 5 | `tb_period.v` | verbatim excerpt, lines 13–17 |
| 154 | 4 | `tb_anatomy.v` | verbatim excerpt, lines 56–59 |
| 173 | 7 | `tb_stimulus.v` | verbatim excerpt, lines 56–62 |
| 216 | 9 | `tb_vectors.v` | verbatim excerpt, lines 40–48 |
| 253 | 5 | `tb_strobe.v` | verbatim excerpt, lines 29–33 |
| 521 | 57 | `Makefile` | **whole file, byte-identical** (grew from 45) |

Every excerpt is a contiguous run of lines from its file. Nothing drifted despite the fix
round editing five of the seven source files.

### Transcript freshness

Re-captured every one from a fresh compile. All reproduce:

| transcript | result |
|---|---|
| `tb_anatomy` | exact, including `tb_anatomy.v:76: $finish called at 150000 (1ps)` |
| `tb_period` | exact |
| `bad_readmem` incl. the `Too many words` warning | exact |
| `tb_random` (declared 3-line selection + verdict) | exact |
| **`tb_strobe` full 17-line run** | **identical line for line** — byte-compared programmatically |
| `bad_monitor` (new) | exact — 6 `B:` lines, 0 `A:` lines, no diagnostic |
| `tb_print` (declared 5-line selection) | exact |
| `tb_check` | exact |
| `tb_vectors +break` | exact, exit **1** |
| `s_rmf.v` missing-file `$readmemh` | exact — `ERROR: s_rmf.v:5: …` / `m[0]=xx`, exit **0** |
| `bad_dumparray` VCD warnings + `$var reg 8 % \mem[0] [7:0] $end` | exact; array absent from the VCD (0 hits); `-DDUMPMEM` → `ERROR: … cannot dump a vpiMemory.`, exit **1** |
| no-`$finish` hang | killed at 4 s, **exit 137** |
| `make -k PLUSARGS=+break` | exact, contiguous, warm tree |
| 48-line VCD header | **47 of 48 byte-identical**, tabs included; the only difference is the `$date` stamp, which is inherent to capture — the fix round's "all 48 lines" is an overclaim in its own report, not in the chapter |

**Severity table re-measured, every row, and it is still flawless:** `$info`/`$warning`/
`$error` → 0; `$fatal(1)` → 1; `$finish` → 0; `$finish(0)` → silent, 0; `$stop` → prints
`** VVP Stop(0) **`, then `** Continue **`, runs to the end, exit **0**; `$stop` under
`vvp -N` → exit **1**. `$fatal(0)`, `$fatal(1)` and `$fatal(2)` all exit 1, confirming the
"finish number, not exit code" parenthetical.

### Dump depths

19 / 6 / 13 / 10, exact on all four rows, and exactly six `$scope` lines matching the six
the lead-in names. **No other number in the chapter is stale.** I re-derived the counts that
depend on `tb_dump.v`'s contents (the depth table, the six-scope lead-in, the 48-line header
from `+sub`) and all three are consistent with the shipped file.

### FST / VCD claims

Re-measured with the chapter's own stated command
(`vvp sim.vvp +dump=/tmp/w.vcd +cycles=100000`, then `-lxt2`, `-fst`, `-fst-space` with
matching names):

| dumper | chapter | measured | delta | ratio |
|---|---|---|---|---|
| VCD (default) | 14 654 851 | **14 654 851** | **0** | 1.0× |
| `-lxt2` | 872 810 | 872 834 | +24 | 16.8× |
| `-fst` | 218 067 | **218 067** | **0** | 67.2× |
| `-fst-space` | 6 653 | **6 653** | **0** | 2202× |

Three of four are **byte-exact**; the `-lxt2` file is 24 bytes off, the same metadata-scale
variance round 1 documented. The stated ratios (16.8× / 67× / 2203×) all round correctly.

One measurement subtlety worth recording so a later round does not mis-diagnose it: these
byte counts are **path-dependent**. `tb_dump.v`'s `dumpctl` block holds
`reg [8*256-1:0] dumpfile`, which is itself dumped, and VCD strips leading zeros from vector
values — so a longer `+dump=` path makes the file larger. Running with a scratchpad path
instead of `/tmp/w.vcd` gave 14 655 819, 968 bytes high. The chapter states its command, so
the table is reproducible as printed; this is why round 1's independent figures differed
slightly from the chapter's.

### Timing figure

Column-audited against measured transitions. Label field a uniform 8 characters, all four
waveform rows 73 characters, origin at column 8 = t=5 ns (the first rising edge). Figure
segment boundaries versus the simulator:

| row | figure boundaries | measured transitions |
|---|---|---|
| `d` | t = 10, 20, 30 | `d → 10` at 10 ns, `11` at 20 ns, `12` at 30 ns ✔ |
| `mid` | t = 15, 25, 35 | `mid → 10` at 15 ns, `11` at 25 ns, `12` at 35 ns ✔ |
| `q` | t = 15, 25, 35 | `q → 00` at 15 ns, `10` at 25 ns, `11` at 35 ns ✔ |

No drawing error. N9's `x` is now present in `q`'s first segment.

### Tree cleanliness

After the full mutation campaign, seventeen `make` invocations, three real-tree DUT
mutations and every transcript recapture:

- A scan of `guide/src` for anything that is not `.v`, `.hex`, `.md`, `targets.txt`,
  `Makefile` or `run_all.sh` returns **nothing**.
- `diff -r` of the whole `guide/` tree against a pristine backup taken before any work
  reports only the new review file. **The tree is byte-identical to how I found it.**
- `make lint` and `make -n` leave no artifacts; `make clean` removes the build directory.

### Cross-references, citations, structure

- **Positional cross-references: zero.** A scan for "the next/previous/following/preceding
  section", "as we saw", "see above/below" and their variants returns nothing. Every
  reference is by quoted section title.
- **All quoted section titles resolve**: `Simulation Artifacts That Will Cost You an
  Evening`, `Reset Strategy` and `How a Simulator Actually Runs Your Code` are real `##`
  headings in `ch03.md`; `Automating the Build` and `Viewing Waveforms in 2026` in `ch04.md`.
  `src/ch03/bad_clkinit.v` and `src/ch03/bad_tbedge.v` both exist.
- **Citations: no invented or upgraded URLs.** Seven unique URLs, the same set round 1
  verified; the fix round added none. Unlinked sources remain under the explicit "By title
  (no link asserted)" heading.
- **Word count 9502** against a ~9,500 ceiling — on target, and the claimed ~420 words of
  prose cut to pay for the additions evidently happened. 13 `##` sections; callouts 3 `Trap`,
  6 `Seed for`, 1 `Icarus reality`, all mandated forms.
- **Chapter-5 boundary intact.** `constrained` 0, and `coverage` (3), `assertion` (1),
  `scoreboard` (2), `corner case` (1) occur only in `Seed for` callouts, the deferring
  opening paragraph, and the Bridge.

## Remaining defects

Ordered by how badly a reader is misled.

### R1 (blocking). `tb_dump` is blind by half a cycle, and the chapter says otherwise

Restatement of D1 plus its cause. `tb_dump`'s in-loop check reads `q` in the active region
at a `negedge`, so it pins the value `q` holds at one instant per cycle and never pins *when
`q` changes*. Every design whose output moves on the falling edge is sampled half a cycle
early and lands on the expected number by construction. Consequences:

- `pipe2` as **a single flip-flop on the negative edge** — one flop, latency half a cycle —
  prints `PASS tb_dump (latency 2, q=17)` and passes all 14 harness targets. This is the
  round-1 defect with one character changed.
- Either flip-flop moved to the negative edge passes, so the chapter's "with a flip-flop on
  the wrong clock edge, fails it four times out of four" is false as written.
- A dual-edge (`posedge clk or negedge clk`) pipeline of latency 1 also passes.

The property the chapter actually cares about — the one its ASCII figure draws and its
chapter-11 seed depends on — is that `q` changes **on rising edges**, two of them behind `d`.
Nothing tests that.

### R2 (blocking). `adder8`'s carry-out is verified by nothing in the chapter

Three testbenches instantiate `adder8` and connect `cout`; `grep` confirms none of them ever
reads it. Tying `cout` to `1'b0` or `1'b1` passes `tb_vectors`, `tb_stimulus`, `tb_check`
and the full `run_all.sh ch04` at **14 passed, 0 failed**. A reader who follows the
chapter's own closing checklist — "break the *DUT* instead, and confirm the testbench that
claims to check it goes red" — and picks the carry bit gets a green run and learns the
wrong lesson. This also falsifies the fix round's "all 14 testbenches audited" in substance
if not in letter: an audit under STATE.md's own standing practice asks "what would have to
break for this to print FAIL?", and for `cout` the answer is "nothing".

Related and cheaper to note than to fix: an **inverting `dff`** (`q <= ~d`) also passes all
14, because `pipe2`'s two stages cancel the inversion and nothing checks `dff` alone.

### R3 (blocking). `tb_dump`'s watchdog cannot fire on a dead clock

`repeat (limit + 20) @(posedge clk)` waits on the very signal whose absence is the
commonest cause of a hang. With `reg clk;` and no initialiser — the chapter's own trap,
row 4 of its traps table — `tb_anatomy`'s `#10000` watchdog fires in about a second and
prints `FAIL`, while `tb_dump` runs forever; I killed it at 15 seconds. Neither
`run_all.sh` nor the Makefile imposes a timeout, so this hangs the regression indefinitely
rather than failing it. The file's comment actively recommends the cycle-counted form
("survives a change of period, and a change of `+cycles`, without being re-tuned"), and
round 1 endorsed it as better practice, so a reader is being steered toward the version
that does not work. Both properties are obtainable at once — count cycles *and* bound the
wall-clock time in a second `initial` block.

### R4 (minor). `$(DATA)` described as load-bearing

See D2. The `.hex` prerequisite is inert given `FORCE`, and a data-file change is not why
the harness notices a broken DUT.

### R5 (minor). The `iverilog` exit-code sentence is still wrong on one item

The chapter now says exit **2** for "a syntax error and for the common elaboration errors
(unknown module type, unknown identifier, duplicate module)" and **1** for a bad port name
or an unreadable file. Measured:

| condition | exit |
|---|---|
| syntax error | 2 ✔ |
| unknown module type | 2 ✔ |
| duplicate module | 2 ✔ |
| bad port name | 1 ✔ |
| unreadable source file | 1 ✔ |
| **unknown identifier, in a continuous assignment** | **2** ✔ |
| **unknown identifier, in a procedural statement** | **1** ✗ |

The identical diagnostic — `error: Unable to bind wire/reg/memory 'zz'` — returns 2 from
`assign y = zz;` and 1 from `initial y = zz;` or `$display(zz)`. The sentence's own
conclusion ("so do not read a category out of the number") is exactly right and is
*strengthened* by this, but the parenthetical list should not promise 2 for unknown
identifiers. Nothing in the Makefile or `run_all.sh` depends on the distinction.

### R6 (minor). `tb_stimulus` demonstrates a distinction it cannot test

The chapter says confusing `#10 a = …` with `a = #10 …` "gives you a testbench that applies
the right values in the wrong order". In the shipped file the intra-assignment's right-hand
side is the literal `8'h20`, so the two forms are indistinguishable: replacing
`a = #10 8'h20;` with `#10 a = 8'h20;` passes every one of the four `check_time` assertions.
Swapping the *other* pair is caught. One extra step whose RHS is a variable that changes
during the delay would make the taught distinction actually checkable.

### R7 (cosmetic). `bad_dumparray.v` lacks the disclaimer its siblings carry

`bad_severity.v` says "Nothing here checks anything. That is the point." `bad_monitor.v`
says "The PASS line here checks the stimulus, not the monitor … The evidence for the trap
is the transcript." `bad_dumparray.v` asserts "the data is fine, it is only invisible to the
waveform viewer" as fact without saying that its own PASS does not verify the invisibility —
deleting the per-word `$dumpvars` leaves it green. One sentence fixes it. Unlike the other
two, this claim *is* mechanically checkable, since the file already writes a VCD a `grep`
could inspect.

## Required changes for a 9+

Items 1–3 close the blocking defects; 4–7 are the small ones. None needs new research and
none threatens what is already strong.

1. **Make `tb_dump` pin *when* `q` changes, not just what it holds — then re-do the mutation
   claim.** The cheapest correct fix is to sample on the edge the design uses. Add, inside
   the existing stimulus loop or as a separate `always` block, a check that runs at the
   *rising* edge with `$strobe`-region timing, e.g. record `q` at each `posedge` and require
   it to equal `8'h10 + (cyc - 2)` there; or count `q`'s transitions and require that all of
   them fall on rising edges. Verify against **all six** of my surviving mutants: `u_a` on
   `negedge`, `u_b` on `negedge`, one flop total on `negedge`, dual-edge flops, and confirm
   the two genuinely equivalent variants (the mixed `negedge`→`posedge` pair, whose `q` trace
   is bit-identical to the real design) still pass. Then **rewrite line 353** so the mutation
   list is literally true — either name the mutations precisely ("with *both* flip-flops on
   the wrong clock edge") or, better, extend the list to the ones the strengthened check now
   catches and state the count honestly.

2. **Check `adder8`'s carry-out somewhere.** `tb_vectors` is the natural home: `vectors.hex`
   is `{a, b, expected_sum}` in 24 bits, so either widen the record to 32 bits with the
   expected carry in the low byte, or — cheaper and requiring no data-file change — add two
   or three directed vectors in `tb_stimulus.v` that assert `cout` across the wrap
   (`ff + 01` → `cout=1`, `80 + 80` → `cout=1`, `01 + 02` → `cout=0`). Verify by tying
   `cout` to `1'b0` and then to `1'b1` and confirming both now go red under
   `run_all.sh ch04`. While there, consider one direct check of `dff` so an inverting flop
   cannot pass the suite.

3. **Give `tb_dump` a watchdog that survives a dead clock, and fix the comment that
   recommends the current one.** Keep the cycle counter for the "test ran too long" case and
   add a wall-clock bound in the same or a second `initial` block, so the timeout fires
   whether the clock stopped or the test merely overran. Verify with the chapter's own
   trap — change `reg clk = 1'b0;` to `reg clk;` and confirm the run now prints `FAIL` and
   exits 1 instead of hanging. Update the in-file comment so it no longer presents the
   edge-counted form as strictly better, and consider a timeout in `run_all.sh` so no
   future hang can wedge a regression.

4. **Correct the `$(DATA)` sentence.** Say that every `.v` is a prerequisite of every build
   because `make` cannot see the edge `-y .` creates — that part is true and load-bearing —
   and either drop the `.hex` from that claim or keep `$(DATA)` and note it is belt-and-braces
   that `FORCE` already covers.

5. **Correct the `iverilog` exit-code parenthetical.** Move "unknown identifier" out of the
   "always 2" list, or state the measured split: 2 from a continuous assignment, 1 from a
   procedural statement, same diagnostic either way — which makes the sentence's own
   conclusion ("do not read a category out of the number") land harder.

6. **Make `tb_stimulus`'s intra-assignment example testable.** Add one step whose right-hand
   side changes during the delay, so `a = #10 expr;` and `#10 a = expr;` produce different
   logged values and the existing `check_time` assertions can tell them apart.

7. **Add one sentence to `bad_dumparray.v`** saying that its PASS checks the memory contents
   only and that the array's absence from the waveform is shown by the transcript, matching
   the disclaimers `bad_severity.v` and `bad_monitor.v` already carry.

### What must not be disturbed

Recording these so a third fix round does not break them while addressing the above: the
seven byte-identical listings; the 19/6/13/10 depth table and its six-scope lead-in; the
byte-exact FST table and its stated command; the four-way `$dumpfile` extension result; the
severity table; the whole Makefile, which is now correct across seventeen invocations; the
17-line `tb_strobe` transcript and the 47-of-48 VCD header; the timing figure's column
arithmetic; the GTKWave and Surfer sourcing; and the load guard in `tb_vectors.v`.
