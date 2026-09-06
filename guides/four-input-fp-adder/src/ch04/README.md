# Chapter 4 source — simulation, testbenches and waveforms

Every file here was compiled and run under **Icarus Verilog 13.0** on macOS
(arm64, Homebrew). Every complete listing in chapter 4 is a verbatim copy of a
file in this directory; the shorter listings are verbatim excerpts. Every block
of simulator output in the chapter is real captured stdout from running these
files.

## The two lines you will type a thousand times

```sh
iverilog -g2012 -Wall -o /tmp/sim <files...>
vvp /tmp/sim
```

Or use the `Makefile`, which discovers every `tb_*.v` and `bad_*.v`, builds it,
runs it, and applies the failure gate:

```sh
make                  # build and run everything; artifacts to /tmp/ch04-build
make -k               # keep going after the first failure
make PLUSARGS=+break  # prove the failure gate actually fires
make lint             # elaborate every testbench, no simulation
make clean
```

Compiling is cached; **running is not**. Every `make` re-runs all fourteen tests, and
every `.v` in this directory is a prerequisite of every build, so breaking a DUT
such as `adder8.v` makes `make` fail with a non-zero exit status without a
`make clean` first. That is the property a regression harness is for. (`$(DATA)`
on the `run-%` rule is belt and braces: `FORCE` already makes every run out of
date, and a `.hex` never enters a compile.)

**GNU Make 3.81, which macOS ships, compares timestamps to the whole second.**
Edit a `.v` inside the same second as the previous build and `make` misses the
change: measured here, a broken `adder8.v` gave fourteen green targets. Wait a
second or `touch` the file. `run_all.sh` is immune — it always compiles into a
fresh `mktemp -d`.

Run the whole chapter through the guide's own runner with
`cd .. && ./run_all.sh ch04`. It is 14 targets.

**Nothing here writes a file.** Waveform dumping is behind a `+dump=<path>`
plusarg in every testbench that supports it, because `$dumpfile` resolves
relative paths against the working directory of `vvp` — which for both the
Makefile and `run_all.sh` is this directory. Ask for a dump explicitly and put
it somewhere outside the source tree:

```sh
iverilog -g2012 -Wall -o /tmp/sim dff.v pipe2.v tb_dump.v
vvp /tmp/sim +dump=/tmp/w.vcd          # VCD
vvp /tmp/sim +dump=/tmp/w.fst -fst     # FST, far smaller
surfer /tmp/w.vcd                      # look at it
```

Every testbench self-checks: it counts errors and ends in `$fatal(1, ...)`, so
a failure changes the process exit code. Files named `bad_*.v` are
**deliberately wrong teaching examples**; they self-check too, so `PASS` from a
`bad_*` file means "the trap still reproduces on your simulator".

## Files

### Design modules

| File | Demonstrates |
|---|---|
| `adder8.v` | The combinational device under test: 8-bit sum with carry out. |
| `bad_adder8.v` | The same ports, subtracting instead of adding. Driven alongside `adder8` by `tb_check.v`. Not a build target of its own. |
| `dff.v` | One 8-bit flip-flop, so `$display` and `$strobe` have something to disagree about. |
| `counter4.v` | Chapter 3's counter with synchronous reset and enable — the DUT for `tb_anatomy.v`. |
| `pipe2.v` | Two `dff` instances in series: three levels of hierarchy for the `$dumpvars` depth measurements, and a latency of two you can count in a waveform. |

### Self-checking testbenches

Build each with `iverilog -g2012 -Wall -o /tmp/sim <files>` and run `vvp /tmp/sim`.

| File | Files needed | Demonstrates |
|---|---|---|
| `tb_anatomy.v` | `counter4.v tb_anatomy.v` | The whole testbench skeleton: clock, reset sequencing, optional dump, watchdog, checker, verdict. |
| `tb_period.v` | `tb_period.v` | The same 5 ns clock generator under `1ns/1ps` and `1ns/1ns`. One of them is a 6 ns clock. |
| `tb_stimulus.v` | `adder8.v tb_stimulus.v` | Cumulative delays, the intra-assignment delay (with a right-hand side that changes during it, so the two forms are distinguishable), a reusable `automatic` task, and the only check of `adder8`'s carry out. |
| `tb_vectors.v` | `adder8.v tb_vectors.v` | File-driven vectors via `$readmemh`, a load guard on both ends of the array, `sum` **and** `cout` checked, and `$fatal` on a non-zero error count. `+break` forces a failure. |
| `tb_random.v` | `tb_random.v` | `$random` is a fixed stream: the exact values are asserted. Signedness, the inout seed, `$urandom_range`. |
| `tb_print.v` | `tb_print.v` | Every format specifier, with `$sformat` assertions for the padding and unknown-value rules. |
| `tb_strobe.v` | `dff.v tb_strobe.v` | `$display` sees pre-NBA values at a posedge; `$strobe` and `$monitor` see post-NBA. Asserted, not eyeballed. Also the only check of what `dff` computes. |
| `tb_check.v` | `adder8.v bad_adder8.v tb_check.v` | Comparison with `!==`, an error counter, and one vector that passes by accident. |
| `tb_dump.v` | `dff.v pipe2.v tb_dump.v` | `$dumpfile`/`$dumpvars` with every depth variant, `$dumpoff`/`$dumpon`, FST, and a latency of two checked *while the pipe is full* — a drain-only check passes a one-stage pipe — plus a concurrent check that `q` only ever moves on a rising edge, which a once-per-cycle sample cannot see. |
| `tb_plusargs.v` | `tb_plusargs.v` | `$test$plusargs`, `$value$plusargs`, defaults surviving an absent argument, case sensitivity. |

### Deliberately broken examples

| File | Files needed | The trap |
|---|---|---|
| `bad_readmem.v` | `bad_readmem.v` | `$readmemh` reads one word per token, so a data file in readable columns silently misloads. Reads `vectors_bad.hex`. |
| `bad_monitor.v` | `bad_monitor.v` | A second `$monitor` silently replaces the first. No diagnostic. |
| `bad_severity.v` | `bad_severity.v` | `$info`, `$warning` and `$error` all print and all exit 0. The runner reports this file PASS, which is the point. |
| `bad_dumparray.v` | `bad_dumparray.v` | Icarus does not dump memory arrays. Individual words dump as escaped identifiers with a warning. Compile with `-DDUMPMEM` to see `vvp` refuse the whole array at load time. |

### Data files

| File | Used by |
|---|---|
| `vectors.hex` | `tb_vectors.v` — one packed 32-bit word per line, `{a, b, sum, 7'b0, cout}`, the correct layout. |
| `vectors_bad.hex` | `bad_readmem.v` — the same values in columns, the wrong layout. |

## Mutation record

The guide's standing practice is that a testbench is not a test until it has been
seen to fail. Every mutation below was applied to a copy of this directory in a
scratch tree, compiled with the same `iverilog -g2012 -Wall -y .`, and scored on
`rc != 0` or `FAIL` in the output. Nothing here was written into this directory.

**`pipe2` versus `tb_dump.v` — 13 rebuilds, 12 caught.** Caught: one flip-flop
instead of two; three; four; none at all (`assign q = d`); both flops on
`negedge`; the *second* flop alone on `negedge`; a single `negedge` flop
(latency half a cycle); dual-edge flops; blocking `=` in both; the two flops fed
from `d` in parallel instead of in series; combinational `q = d - 1`; three
flops with the last on `negedge`. Not caught: the *first* flop on `negedge` with
the second on `posedge`. Its `q` transitions are bit-identical to the real
design's **under this file's stimulus**, which only ever drives `d` on the
falling edge — that is a gap in the stimulus, **not an equivalent mutant**. A
probe that drives `d` two nanoseconds after the rising edge separates them from
the port alone, with no hierarchical reference: the real design puts `a0` on `q`
at t=25000, the mutant at t=15000, a latency of two rising edges against one.
`+cycles=0/1/2` also fail, on the precondition; `+cycles=3` and up pass.

The `always @(q)` check asks whether `clk` is *high*, which in zero-delay RTL is
the same as "at a rising edge" and outside it is weaker: a stage-2 clock-to-Q
delay of `#1` or `#4` survives, `#6` crosses the falling edge and fails.

**`dff` — 3 mutants.** `q <= ~d`, `q = d` (blocking) and a `negedge` flop all
fail `tb_strobe`. Before `tb_strobe` pinned the settled value against `d`, the
inverting flop passed all fourteen targets, because `pipe2`'s two stages cancel
the inversion.

**`adder8` — 9 mutants, 8 caught.** `a - b` fails `tb_stimulus` and
`tb_vectors`. Of eight wrong carry functions, seven fail: `1'b0`, `1'b1`,
inverted, `a[7] & b[7]`, `a[7] ^ b[7]`, the carry into bit 7, and
`~sum[7] & (a[7] | b[7])` — the last only because `tb_vectors.v` now reads
`cout` and `vectors.hex` carries `ff+ff`. **`cout = a[7] | b[7]` still passes
all fourteen targets**: every vector in the chapter happens to agree with it.
That one is handed forward to chapter 5.

**`counter4` — 2 known survivors.** `tb_anatomy.v` never asserts reset while
`en` is high, so `if (en) q <= q + 1; else if (!rst_n) q <= 0;` (inverted reset
priority) and an asynchronous reset both pass 14/14. `tb_anatomy.v` is a shape,
not a complete test of `counter4`.

**`vectors.hex` — the load guard.** Truncating the file to seven of eight words
now fails (`FAIL tb_vectors: vectors.hex did not load 8 vectors`, exit 1);
before the `^vec[N-1]` half of the guard existed it printed
`PASS tb_vectors (8 vectors, 0 errors)`, because `vec[7]` stayed `x` and
`x !== x` is false. A *ninth* vector appended is still only a `$readmemh`
warning, never a `FAIL`.

**Watchdogs — the clock killed with `reg clk;`.** `tb_dump` and `tb_strobe` both
fail in milliseconds with a `FAIL … timeout` line and exit 1. With the previous
edge-counted watchdog in `tb_dump`, and with no watchdog at all in `tb_strobe`,
both had to be killed after several seconds and printed nothing.

**`tb_stimulus` delay forms.** Replacing `a = #10 src;` with `#10 a = src;`
fails `check_time(3, 30, 8'h20)` with `change 3 was {30, 99}`.

## Two errors that fit neither manifest row

`targets.txt` classifies a target as `run` (compiles and simulates cleanly) or
`xfail` (must fail to compile). Two of this chapter's errors are neither,
because `iverilog` accepts the file and `vvp` rejects it when it **loads** the
program — the same split chapter 2 documented for an unrecognised system task:

```
$ iverilog -g2012 -Wall -DDUMPMEM -o /tmp/sim bad_dumparray.v   # exit 0
$ vvp /tmp/sim
ERROR: bad_dumparray.v:32: $dumpvars cannot dump a vpiMemory.
```

and passing a literal where `$random` or `$urandom` wants a seed variable. From a
throwaway `seedguard.v` whose seeded call sits behind a `$test$plusargs` guard —
which cannot be constant-folded away — run with the plusarg absent:

```
ERROR: seedguard.v:6: $urandom's seed must be an integer/time variable or a register.
```

Both are checked before time starts, so no plusarg can hide them and no
`run` target can carry them.
