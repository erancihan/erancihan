# Chapter 3 source — combinational and sequential logic

Every file here was compiled and run under **Icarus Verilog 13.0** on macOS
(arm64, Homebrew). Every complete listing in chapter 3 is a verbatim copy of a
file in this directory; the shorter listings are verbatim excerpts, with any
elision marked `// ...`. Every block of simulator output in the chapter is real
captured stdout from running these files.

## The two lines you will type a thousand times

```sh
iverilog -g2012 -Wall -o /tmp/sim <files...>
vvp /tmp/sim
```

Put the build output somewhere outside this directory; nothing here is a build
artifact.

Every testbench self-checks: it counts errors and ends in `$fatal(1, ...)`, so a
failure changes the process exit code. Files named `bad_*.v` are **deliberately
wrong teaching examples**. They also self-check, but they assert the *wrong*
answer, so `PASS` from a `bad_*` file means "the trap still reproduces on your
simulator". One file is meant not to compile at all: `bad_zerodelay.v`.

Run the whole chapter with `cd .. && ./run_all.sh ch03`. It is 20 targets.

## Files

### Design modules

| File | Demonstrates |
|---|---|
| `sel_mux.v` | The combinational template: `always @(*)`, unconditional default assignment, `case` with `default:`. |
| `flop_templates.v` | The four clocked templates: plain D, synchronous reset, asynchronous reset, clock enable. |
| `shift3.v` | Three-stage shift register with non-blocking assignment. |
| `fsm.v` | The same state machine in one-, two- and three-block style, plus a combinational Mealy output against the same term registered. |
| `reset_sync.v` | The two-flop reset synchroniser: assert asynchronously, de-assert synchronously. |

### Self-checking testbenches

| File | Build and run | Demonstrates |
|---|---|---|
| `tb_latch.v` | `iverilog -g2012 -Wall -o /tmp/sim sel_mux.v bad_latch.v tb_latch.v && vvp /tmp/sim` | A latch holding its value, against a clean mux, from one set of stimulus. |
| `tb_flop_templates.v` | `iverilog -g2012 -Wall -o /tmp/sim flop_templates.v tb_flop_templates.v && vvp /tmp/sim` | A reset pulse between two clock edges: the async flop sees it, the sync flop never does. |
| `tb_shift3.v` | `iverilog -g2012 -Wall -o /tmp/sim shift3.v bad_shift3.v tb_shift3.v && vvp /tmp/sim` | `<=` shifts; `=` collapses; `=` reversed accidentally works. |
| `tb_swap.v` | `iverilog -g2012 -Wall -o /tmp/sim tb_swap.v && vvp /tmp/sim` | `a<=b; b<=a` is a swap; `a=b; b=a` is a copy that destroys a value. |
| `tb_regions.v` | `iverilog -g2012 -Wall -o /tmp/sim tb_regions.v && vvp /tmp/sim` | The stratified event queue: `$display`, a second same-edge block, `#0` and `$strobe`. |
| `tb_delta.v` | `iverilog -g2012 -Wall -o /tmp/sim tb_delta.v && vvp /tmp/sim` | `always @(*)` does not self-start; a three-deep cascade settles before the first `#0`. |
| `tb_race.v` | `iverilog -g2012 -Wall -o /tmp/sim bad_race.v tb_race.v && vvp /tmp/sim` | Source order of two `always` blocks decides the answer; Icarus alternates the order per time step. |
| `tb_sens.v` | `iverilog -g2012 -Wall -o /tmp/sim bad_sens.v tb_sens.v && vvp /tmp/sim` | An incomplete sensitivity list going stale, and `@(*)` not seeing inside a function. |
| `tb_fsm.v` | `iverilog -g2012 -Wall -o /tmp/sim fsm.v tb_fsm.v && vvp /tmp/sim` | Three FSM styles agreeing exactly; a Mealy output moving with no clock edge. |
| `tb_reset_sync.v` | `iverilog -g2012 -Wall -o /tmp/sim flop_templates.v reset_sync.v tb_reset_sync.v && vvp /tmp/sim` | Raw async reset release versus a synchronised release. |
| `tb_regwire.v` | `iverilog -g2012 -Wall -o /tmp/sim tb_regwire.v && vvp /tmp/sim` | `wire`, combinational `reg` and flopped `reg`: only the third is a register. |
| `tb_xprop.v` | `iverilog -g2012 -Wall -o /tmp/sim tb_xprop.v && vvp /tmp/sim` | A reset-less counter is `x` forever, and poisons `+` and the sticky-bit `\|`. |

### Deliberately broken examples

| File | Build and run | The trap |
|---|---|---|
| `bad_latch.v` | built by `tb_latch.v` above | An `if` with no `else` and a `case` with no `default:` both infer a latch. Icarus is silent. |
| `bad_shift3.v` | built by `tb_shift3.v` above | Blocking assignment in a clocked block, in both statement orders. |
| `bad_sens.v` | built by `tb_sens.v` above | `always @(a)` on a three-input mux, and a function reading a signal `@(*)` cannot see. |
| `bad_race.v` | built by `tb_race.v` above | Two same-edge blocks, one reading what the other writes. |
| `bad_clkinit.v` | `iverilog -g2012 -Wall -o /tmp/sim bad_clkinit.v && vvp /tmp/sim` | `always #5 clk = ~clk;` with no initial value: zero edges, forever. |
| `bad_tbedge.v` | `iverilog -g2012 -Wall -o /tmp/sim flop_templates.v bad_tbedge.v && vvp /tmp/sim` | Testbench stimulus on the sampling edge silently swallows a pulse. |
| `bad_combdelay.v` | `iverilog -g2012 -Wall -o /tmp/sim bad_combdelay.v && vvp /tmp/sim` | `#3` inside `always @(*)`: unsynthesisable, and deaf to inputs while it waits. |
| `bad_multidrive.v` | `iverilog -g2012 -Wall -o /tmp/sim bad_multidrive.v && vvp /tmp/sim` | Two `always` blocks writing one `reg`: last writer wins, no diagnostic. |
| `bad_arraysens.v` | `iverilog -g2012 -Wall -o /tmp/sim bad_arraysens.v && vvp /tmp/sim` | Indexing sensitises the block to the whole array. |
| `bad_edge.v` | `iverilog -g2012 -Wall -o /tmp/sim bad_edge.v && vvp /tmp/sim` | `posedge` on a vector uses the LSB only; `0→x` and `x→1` both fire. |
| `bad_svalways.v` | `iverilog -g2012 -Wall -o /tmp/sim bad_svalways.v && vvp /tmp/sim` | `always_comb` around a latch and `always_ff` around a blocking assignment: both compile silent, both bugs still reproduce. |
| `bad_zerodelay.v` | `iverilog -g2012 -Wall -o /tmp/sim bad_zerodelay.v` | **Must not compile.** An `always` block with no event control and no delay. |

## Expected warnings

Exactly two files in this directory emit a warning, and both do so on purpose:

- `bad_arraysens.v` — `@* is sensitive to all 4 words in array 'mem'.`
- `bad_svalways.v` — `Synthesis requires the sensitivity list of an always_ff
  process to only be edge sensitive.` This is the **only** `always_*` check
  Icarus 13.0 performs, and it is a warning: the file compiles and runs.

Everything else compiles **silent** under `-Wall`, including every latch, every
race, every blocking assignment in a clocked block and every incomplete
sensitivity list — and including the latch written as `always_comb` and the
blocking assignment written inside `always_ff`. That silence is the subject of the chapter's section "What the
Simulator Will and Will Not Tell You".

Two flags worth knowing about, both measured on this machine:

- `-Wsensitivity-entire-vector` is **not** in `-Wall`. Adding it to
  `bad_arraysens.v` produces a second warning,
  `@* is sensitive to all bits in 'v[3:0]'.`
- `-Wextra` **does not exist**: `iverilog` answers
  `Ignoring unknown warning class extra` and carries on.
