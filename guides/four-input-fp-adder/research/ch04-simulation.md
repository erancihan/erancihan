# Chapter 4 — Simulation, Testbenches and Waveforms: source notes

<!-- sections complete: 9/9 -->

All code in these notes was compiled with **Icarus Verilog 13.0 (stable) (v13_0)** and run with the
matching `vvp` runtime on macOS 15 / arm64. Output blocks are verbatim.

## 1. What a testbench is

**The split.** A design has two halves that live under different rules:

- **DUT** (device under test) — synthesisable RTL. Every construct must map to gates or flip-flops.
- **Testbench** — a Verilog program whose only job is to *drive* and *observe* the DUT. Nothing in
  it needs to be synthesisable, and that is the point: the testbench may use `#delay`, `initial`,
  `$display`, `while`, `real`, files, and unbounded integers. It is the escape hatch where the
  language stops pretending to be hardware and becomes an ordinary imperative program.

Frame it as: *the DUT is the thing you are building; the testbench is the jig you build to hold it.*
Chapter 3 established that `always @(posedge clk)` describes a flip-flop; in a testbench the same
construct describes nothing physical — it is just "run this every rising edge".

**Anatomy**, in order: declarations (`reg` for what the testbench drives, `wire` for what it
observes — the ch 2 rule still binds); DUT instantiation with named ports; clock generation; reset
sequencing; stimulus, checking and termination.

**Module with no ports.** `module tb;` — no port list, nothing above it to connect to. Icarus
accepts `module tb;` and `module tb();` equally, and picks the root automatically when exactly one
module is never instantiated. **Corrected while fixing chapter 4:** with *two or more* uninstantiated
modules Icarus does not complain — it exits 0 and elaborates **all** of them as roots, which then run
concurrently, and whichever `$finish` fires first ends the whole simulation. Measured: compiling
`adder8.v tb_vectors.v tb_check.v bad_adder8.v` with no `-s` exits 0, elaborates both `tb_check` and
`tb_vectors` as roots, and prints one `PASS` line instead of two. `-s tb` names the root explicitly
and is mandatory, not merely worth doing, once a project has more than one testbench.

**`initial` vs `always`.** `initial` starts at time 0 and runs once — a *test scenario*, a sequence
of events with delays. `always` restarts forever — *background processes*: the clock, a per-cycle
monitor, a scoreboard. Multiple `initial` blocks all start at time 0 and interleave, which is the
idiom for separating concerns (one for the dump setup, one for stimulus, one for a watchdog). An
`always` with no delay and no event control is an infinite zero-delay loop: time never advances and
`vvp` spins. `-Winfloop` warns, and is *not* in `-Wall` (measured, section 8).

**`$finish` and what happens without it.** `$finish` ends the simulation and returns control to the
shell. Measured, with a free-running clock and no `$finish`:

```verilog
module tb; reg clk = 0; always #5 clk = ~clk;
initial $display("started, never finishes"); endmodule
```

had to be killed after 4 s (`EXIT=137`). The clock generator schedules an event every 5 units
forever, so the queue is never empty and `vvp` never returns — the commonest way a beginner's first
testbench "breaks the terminal". Without a free-running `always`, the simulation ends by itself when
the queue drains (`t=20000 last statement, no $finish` / `EXIT=0`).

So the rule is not "always call `$finish`" but "**a testbench with a clock generator must call
`$finish`**". Two patterns: `#N $finish;` in its own `initial`, plus a watchdog (section 4).

**Simulation time vs real time.** Simulation time is an integer counter the scheduler advances only
when nothing is left to do at the current time. It has no relation to wall-clock time — `#1000000`
may take microseconds of CPU, and a zero-delay loop may burn a CPU-minute at time 0.
`` `timescale 1ns/1ps `` sets *unit* and *precision*: `#5` means 5 ns, and `$time` counts in the
**precision** unit, so a `$display` at 5 ns printed `t=5000` (measured). This surprises everybody
once; show it early.

## 2. Clock and reset generation

**The two idioms.**

```verilog
// A: one line, requires an initial value on the declaration
reg clk = 1'b0;
always #5 clk = ~clk;

// B: two statements, works even if the declaration has no initialiser
reg clk;
initial clk = 1'b0;
always #(P/2) clk = ~clk;
```

**Failure mode of A without the initialiser.** `reg clk;` starts at `x`, and `~x` is `x`. The clock
toggles `x` to `x` forever, no `posedge` occurs, every flop stays `x`, and the testbench prints a
screen of `xxxx`. The number-one cause of "all-x output" (section 7), and Icarus reports nothing —
it is a legal simulation.

**Parameterised period.** Name the period, not the half-period:

```verilog
`timescale 1ns/1ps
localparam real PERIOD = 10.0;          // ns
reg clk = 1'b0;
always #(PERIOD/2.0) clk = ~clk;
```

With `1ns/1ps`, `#(PERIOD/2.0)` = `#5.0` rounds cleanly. With `` `timescale 1ns/1ns `` and an odd
period the half-period is rounded and the duty cycle drifts — a real trap.

**Duty cycle.** `always #5 clk = ~clk;` gives 50 %. A non-50 % clock needs explicit halves
(`always begin clk = 1'b1; #3; clk = 1'b0; #7; end`). Almost never needed for synchronous RTL.

**Drive stimulus on the opposite edge from the one the DUT samples** — the central hygiene rule
here, and directly the event-queue material from chapter 3. Measured: two identical flops, one fed
by a **blocking** assignment on the *same* edge the DUT samples, one by a non-blocking assignment:

```verilog
always @(posedge clk) d_blk = d_blk + 1;   // BAD: blocking, same edge
always @(posedge clk) d_nba <= d_nba + 1;  // defined, but reads one cycle late
```

Sampled on the following negedge:

```
  t     clk d_blk q_blk | d_nba q_nba
10000   0   1     1   |   1     0
20000   0   2     1   |   2     1
30000   0   3     3   |   3     2
40000   0   4     3   |   4     3
```

`q_nba` is a clean one-cycle lag. `q_blk` is *not consistent*: at 10000 the flop captured the new
value (1), at 20000 the old (1 while d was 2), at 30000 the new again — with no warning from Icarus.
The blocking write and the flop's read are both in the active region of the same time step with no
ordering guarantee: a textbook race that visibly changes the answer edge to edge. The fix that makes
waveforms readable:

```verilog
always @(negedge clk) d <= d + 1;                       // stimulus on the far edge
always @(posedge clk) $strobe("%5t d=%0d q=%0d", $time, d, q);
```

```
 5000 posedge: d=0 q=0
15000 posedge: d=1 q=1
25000 posedge: d=2 q=2
```

Data is stable at every sampling edge with half a period of margin on both sides. Tie back to
chapter 1: the opposite-edge rule is the simulation equivalent of centring data in the eye.

**Reset sequencing.** Hold reset across *several* edges, release it away from an edge, and never
release it in the same delta as a clock edge:

```verilog
reg rst_n;
initial begin
  rst_n = 1'b0;            // asserted at time 0, before the first edge
  repeat (3) @(posedge clk);
  @(negedge clk) rst_n = 1'b1;   // release on the far edge
end
```

Points: asserting at time 0 matters, or the first edge sees `x`; `repeat (n) @(posedge clk)` beats a
hand-counted `#35` and survives a period change; releasing on `negedge` gives every flop a clean
deassertion. Chapter 3 already chose the reset *strategy* (sync vs async, active-low) — this section
only sequences it.

**Race between clock generator and DUT.** The clock generator is itself a process, so
`@(posedge clk) something = 1;` races every `always @(posedge clk)` in the DUT. Safe habits: use
`<=` for anything a clocked DUT reads, or move to the opposite edge. Industry also skews stimulus
slightly after the edge (`@(posedge clk) #1 d = ...;`) — readable, but it bakes in a timescale
assumption, so prefer the opposite edge for teaching.

## 3. Applying stimulus

**Directed vectors** — the workhorse for chapter 5's FP adder, and the only style needed at this
stage. Write the inputs and the expected output side by side.

**`initial` + `#delay`.** The delays in an `initial` block are *cumulative*, not absolute:

```verilog
initial begin
  a = 8'h01; b = 8'h02;   // at t=0
  #10;                    // t=10
  a = 8'h0f;              // still t=10
  #10 a = 8'hff;          // t=20
end
```

`#10 a = ...;` means "wait 10, then assign". `a = #10 ...;` is an *intra-assignment* delay — RHS
evaluated now, assigned in 10 units. Show it once; the second form is rare but appears in older
textbooks.

**`reg` from `initial` vs from `always`.** A `reg` is driven procedurally and should have exactly one
driver. Two blocks writing the same `reg` is legal Verilog, undiagnosed by Icarus, and the last
writer in the time step wins arbitrarily. **One driver per signal, always.** `initial` for a one-shot
scenario, `always` for a per-cycle background driver, never both on one signal.

**Loops.** `for` over a vector table; `repeat (n) @(posedge clk);` and `forever @(posedge clk)` for
clock-relative waits; `while (!done) @(posedge clk);` for a condition. `wait (expr);` is
*level*-sensitive — if `expr` is already true it does not block, a subtle and useful difference
from `@`.

**Tasks for reusable stimulus.** A task is the testbench's function call, and unlike a `function` it
may contain delays.

```verilog
task automatic drive(input [7:0] va, input [7:0] vb);
  begin
    @(negedge clk);
    a <= va; b <= vb;
  end
endtask
```

Note `automatic`: without it a task's locals are static and shared, so two concurrent invocations
corrupt each other. Icarus accepts it under `-g2012`. Irrelevant to a purely sequential testbench,
but a free good habit.

**A whole test-vector table** — two ways. *Inline array, initialised in the testbench:*

```verilog
reg [23:0] vecs [0:3];
initial begin
  vecs[0] = 24'h010203; vecs[1] = 24'h0f0110; /* ... */
  for (i = 0; i < 4; i = i + 1) begin
    {a, b, exp} = vecs[i];
    #1 check(s, exp);
    #1;
  end
end
```

*From a file with `$readmemh`* — and here is a measured gotcha that must be in the notes.
`$readmemh` reads **one memory word per whitespace-separated token**, regardless of how the tokens
are laid out on the line. A file written as three columns:

```
// addend pairs: a b expected_sum  (8-bit hex)
01 02 03
0f 01 10
```

loaded into `reg [23:0] vecs [0:3]` produced:

```
WARNING: chk_tb.v:26: $readmemh(vec.hex): Too many words in the file for the requested range [0:3].
FAIL  t=1000 a=00 b=00 got=00 want=01
```

Each of `01`, `02`, `03` became a separate 24-bit word. The fix is one packed word per line:

```
// a b expected, packed as one 24-bit word per line
010203
0f0110
ff0100
808000
```

```
ok    t=1000 a=01 b=02 got=03
ok    t=3000 a=0f b=01 got=10
PASS: 4 vectors, 0 errors
```

Other measured `$readmemh`/`$readmemb` facts:
- `//` line comments and `/* */` are accepted in the data file.
- `@2` on its own line sets the load address; verified — a file `@2 / 11110000 / 10101010` left
  `m[0]`,`m[1]` untouched and loaded from index 2.
- A **missing file is not fatal**: `ERROR: rmf.v:2: $readmemh: Unable to open nope.hex for
  reading.` was printed, the simulation continued, and `vvp` exited **0**. A testbench that reads
  its vectors from a file must therefore check that it actually got any.
- `$readmemh` resolves relative paths against the *current working directory of `vvp`*, not the
  source file. This bites the moment a Makefile runs the simulation from a `build/` directory.

**`$random` and `$urandom`.** Both exist in Icarus 13.0. Measured, three consecutive runs of the
same and of a freshly recompiled binary produced byte-identical output:

```
$random default   : 12153524 c0895e81 8484d609 b1f05663
$random(seed=7)   : 80076200 466c4b8c 2d57715a 2e6dfb5c
  seed variable after 4 calls = -1368524349
$urandom default  : 92153524 40895e81 0484d609 31f05663
$urandom(useed=7) : 00076200 c66c4b8c ad57715a ae6dfb5c
$urandom_range(0,99): 24 81 37 0
```

- The default stream is **fixed** — no time-of-day seeding. Reruns are reproducible, which is what
  regressions need and *not* what a software programmer expects from `rand()`.
- `$random(seed)` takes an **inout**: the seed must be an `integer`/`reg` lvalue and is updated in
  place (7 → −1368524349 after four calls). A literal is a compile error:
  `ERROR: $urandom's seed must be an integer/time variable or a register.`
- `$random` returns a **signed** 32-bit value, so `a = $random % 256;` produces negative numbers.
  Assign into a sized `reg`, or use `$urandom_range(0, 255)`.
- Determinism is per-stream: one extra `$random` call anywhere shifts every later value. Randomised
  stimulus belongs to chapter 5; establish the mechanics and the reproducibility fact here.

## 4. Checking results

**`$display` format specifiers.** Measured output, one program, verbatim:

```
%b   |01011010|
%d   | 90|
%0d  |90|
%h   |abc|
%0h  |abc|
%o   |132|
%c   |A|
%s   |hello|
%t   |            12345000|
%0t  |12345000|
%m   |tb|
%5d  |   90| %-5d |90   |
%8b  |    10x1|
x in dec | X| in hex |X|
%e |3.141590e+00| %f |3.141590| %g |3.14159|
inside %m -> |tb_sub.hello|
```

Read off from that:

| spec | meaning | default width |
|---|---|---|
| `%b` | binary | exactly the signal's bit width |
| `%d` | decimal | widest decimal the type can hold (8-bit → 3 chars, right-justified) |
| `%h` | hex | ceil(width/4) digits |
| `%o` | octal | ceil(width/3) digits |
| `%c` | one ASCII char from the low 8 bits | 1 |
| `%s` | string from a packed `reg` vector | width/8 |
| `%t` | simulation time, in **precision** units | 20, right-justified |
| `%m` | hierarchical name of the enclosing scope | — |
| `%e %f %g` | `real` | C-like |

- **`%0` means "no padding"** on every numeric spec: `%0d`, `%0h`, `%0b`, `%0t`. Use it everywhere;
  default `%d` padding makes tables look broken.
- Numeric width (`%5d`) pads; negative width (`%-5d`) left-justifies.
- **`%d`/`%h` collapse a partially-unknown value to a single `X`.** `4'b10x1` printed as `X` in
  decimal and hex but `10x1` in binary. Chasing an `x`? Print binary.
- `%m` inside a task reports `tb_sub.hello` — scope *plus* task name; excellent for a shared
  `check` task called from several places.
- `$displayb`/`$displayh`/`$displayo` change the *default* radix.
- `%v` (strength) exists but Icarus rejected it on a constant (`WARNING: incompatible value for
  $display<%v>.`). Not worth teaching.
- `$timeformat(-9, 2, " ns", 10)` reformats every subsequent `%t`: measured, simulation time 1 ns
  printed as `   1.00 ns`.
- **`$write`** is `$display` without the newline, for building a line incrementally.

**`$monitor` and its one-per-simulation rule.** `$monitor` registers a *standing* format string;
the runtime prints it once at the end of every time step in which any argument changed. There is
**one** monitor slot for the whole simulation. Measured:

```verilog
$monitor("A: a=%0d", a);
$monitor("B: a=%0d", a);   // silently replaces A
```

```
B: a=0
B: a=1
B: a=2
B: a=3
mon2_tb.v:10: $finish called at 4000 (1ps)
B: a=4
```

Only `B` ever prints; the first call is discarded with no diagnostic. `$monitoroff`/`$monitoron`
suspend and resume, and `$monitoron` immediately prints current values (the `B: a=3` line). Note the
last line printing *after* the `$finish` message: the monitor region runs at the end of the time
step, after the active region where `$finish` executed.

**`$strobe` is the right tool at a clock edge.** Chapter 3 introduced the regions; this is the
measured consequence. One flop `q <= d`, stimulus on the negedge, all three tasks called from
`always @(posedge clk)`:

```
  $monitor t=0 clk=0 d=0 q=0
  $display t=5000 clk=1 d=0 q=0
  $monitor t=5000 clk=1 d=0 q=0
  $strobe  t=5000 clk=1 d=0 q=0
  $monitor t=10000 clk=0 d=1 q=0
  $display t=15000 clk=1 d=1 q=0     <-- q is the OLD value
  $monitor t=15000 clk=1 d=1 q=1
  $strobe  t=15000 clk=1 d=1 q=1     <-- q is the NEW value
  $monitor t=20000 clk=0 d=2 q=1
  $display t=25000 clk=1 d=2 q=1     <-- old
  $strobe  t=25000 clk=1 d=2 q=2     <-- new
```

- `$display` runs in the **active** region, before non-blocking updates land: at a posedge it shows
  the *pre-edge* value of every flop output.
- `$strobe` runs in the **monitor** region, after all NBAs for that step: the *post-edge* value, the
  value a scope would show. `$monitor` is in the same region and agrees with it.
- Rule: **check and print at a clock edge with `$strobe`, or sample on the opposite edge.**
  `$display` at a posedge shows last cycle's state and will make you chase a phantom
  off-by-one-cycle bug.

**Comparing against expected, and an error counter.** Use `!==`, not `!=`: `!=` returns `x` when
either side has an `x`, and `if (x)` is false, so an all-`x` DUT output silently "passes". `!==` is
the 4-state comparison and never returns `x`.

```verilog
integer errors = 0;
task check(input [7:0] got, input [7:0] want);
  if (got !== want) begin
    errors = errors + 1;
    $display("FAIL  t=%0t a=%02h b=%02h got=%02h want=%02h", $time, a, b, got, want);
  end else
    $display("ok    t=%0t a=%02h b=%02h got=%02h", $time, a, b, got);
endtask
```

Verified on a deliberately broken adder (`s = a - b`):

```
FAIL  t=1000 a=01 b=02 got=ff want=03
FAIL  t=3000 a=0f b=01 got=0e want=10
FAIL  t=5000 a=ff b=01 got=fe want=00
ok    t=7000 a=80 b=80 got=00
FAIL: 3 errors
```

Note the fourth vector passing by accident — in 8 bits `0x80 - 0x80 == 0x80 + 0x80`. Good material
for "a passing vector proves nothing on its own", which chapter 5 develops.

**Severity tasks — the measured exit-status truth.** Every case below was compiled and run with
`echo $?` captured:

| call | stdout/stderr | exit status | continues? |
|---|---|---|---|
| `$info("fyi %0d", 7)` | `INFO: f.v:5: fyi 7` + `Time: 0  Scope: tb` | **0** | yes |
| `$warning(...)` | `WARNING: ...` + Time/Scope | **0** | yes |
| `$error("mismatch")` | `ERROR: ...` + Time/Scope | **0** | yes |
| `$fatal(0\|1\|2, ...)` | `FATAL: ...` + Time/Scope | **1** | no, ends immediately |
| `$finish` | `f.v:5: $finish called at 0 (1s)` | **0** | no |
| `$finish(0)` | *(silent)* | **0** | no |
| `$finish(2)` | `$finish(2) called at 0 (1s)` | **0** | no |
| `$stop` | `** VVP Stop(0) **` then an interactive prompt | **0** | **yes**, on EOF |

The headline: **`$error` does not change the exit status.** A testbench that reports every failure
with `$error` and nothing else exits 0, and `make` says the build succeeded. Chapter 2 flagged this;
chapter 4 is where the reader must act on it.

`$fatal`'s first argument is a *finish number* (0/1/2, controlling end-of-run diagnostics) — **not**
an exit code. All three values gave exit 1.

`$stop` is a debugger breakpoint, not a stopper. With stdin at `/dev/null` it printed
`** Continue **` and ran to completion, exit 0; in a terminal it drops into the `vvp` interactive
prompt and hangs a CI job. `vvp -n` makes `$stop` behave as `$finish` (exit 0); `vvp -N` does the
same but **exits 1**:

```
vvp -n sev/s_stop.vvp   ->  EXIT=0
vvp -N sev/s_stop.vvp   ->  EXIT=1
vvp -N sev/s_finish.vvp ->  EXIT=0   (-N only affects $stop)
```

**How to make a testbench fail so a build script notices.** Two mechanisms; the project uses both.

1. **Exit status** — end with `$fatal` when the error counter is non-zero. Verified:

```verilog
if (errors != 0) begin
  $display("FAIL: %0d errors", errors);
  $fatal(1, "%0d errors", errors);
end
$display("PASS"); $finish;
```

```
FAIL: 3 errors
FATAL: fatal_end.v:6: 3 errors
       Time: 0  Scope: tb
EXIT=1
```

2. **The `FAIL` string convention.** *Project convention:* the harness greps simulation output for
   the literal string `FAIL` and treats a hit as a failure. It exists **precisely because `$error`
   does not change the exit code**. Corollary rules: every failure message must contain `FAIL`, and
   no *passing* message may contain it (`"no FAILures"` in a summary breaks the harness). The
   belt-and-braces gate is `rc != 0 || grep -q FAIL log`, verified in section 8.

A watchdog covers the third failure mode, hanging:

```verilog
initial begin : watchdog
  #1000;
  $display("FAIL: timeout at %0t, testbench never completed", $time);
  $fatal(1, "timeout");
end
```

```
FAIL: timeout at 1000000, testbench never completed
FATAL: wd.v:12: timeout
EXIT=1
```

## 5. VCD dumping and the waveform file formats

**The two calls.** `$dumpfile("name.vcd");` names the output, `$dumpvars(...)` selects contents.
Both go in an `initial`, `$dumpfile` first. Icarus **appends the extension itself** if omitted:
`$dumpfile("big")` produced `big.vcd` by default and `big.fst` under `-fst`. Naming it `"tb.vcd"`
and running `-fst` gives `tb.vcd.fst` — so either always give the extension or never.
**Corrected 2026-08-10 — see correction 6 below: `-fst` with `"tb.vcd"` produces `tb.vcd`, not
`tb.vcd.fst`.**

**What `$dumpvars` actually captures — measured.** Design: `tb` holds `clk`, `a`, wire `y`, an
`integer k`, a `real rv`, an array `tbmem`, and instantiates `dut` (holding `mid`, `integer i`,
array `mem`, and instance `leaf` holding `deep`). Each variant was run and the VCD parsed with a
15-line Python `$scope`/`$var` walker.

| invocation | vars | what appeared |
|---|---|---|
| `$dumpvars;` | 14 | **everything, all levels** — `tb.*`, `tb.u_dut.*`, `tb.u_dut.u_leaf.*` |
| `$dumpvars(0, tb);` | 14 | identical to the above |
| `$dumpvars(1, tb);` | 5 | `tb.y tb.a tb.clk tb.k tb.rv` — this scope only |
| `$dumpvars(2, tb);` | 10 | `tb` + `tb.u_dut` — two levels |

So the first argument is a **depth**: `0` = unlimited, `1` = this scope only, `n` = n levels. With
no arguments at all it dumps every variable in every scope of every top-level module. Later
arguments are scopes or individual signals; `$dumpvars(0, tb.u_dut, tb.clk)` is legal.

Also observed: `integer` and `real` **are** dumped (`$var integer 32`, `$var real 1`). Parameters
are not; Icarus writes a `$comment Show the parameter values. $end` marker instead.

**Arrays: the classic gotcha, measured.** `reg [7:0] mem [0:3]` **never appeared** in any of the
four dumps — not at depth 0, not with no arguments, in neither the testbench nor the DUT. Two
further measurements:

1. Asking for the whole array by name is a **hard runtime error**; `vvp` exits 1:

```verilog
$dumpvars(0, tb.mem);
```

```
ERROR: arr_tb.v:11: $dumpvars cannot dump a vpiMemory.
exit=1
```

2. Individual **words** can be dumped, explicitly, one at a time:

```verilog
$dumpvars(0, tb.tbmem[0], tb.u_dut.mem[1]);
```

```
VCD warning: array word tb.tbmem[0] will conflict with an escaped identifier.
VCD warning: array word tb.u_dut.mem[1] will conflict with an escaped identifier.
```

and they appear in the VCD as escaped identifiers:

```
tb.\tbmem[0] [7:0]
tb.u_dut.\mem[1] [7:0]
```

**Statement for the chapter: Icarus Verilog 13.0 does not dump memory arrays.** No flag changes it.
To see memory contents, name each word (`$dumpvars(0, m[0], m[1], ...)`, generate-loopable) or print
them with `$display`. Warn the reader here — a beginner's first instinct on "my register file is
wrong" is to look for it in the viewer and conclude the tool is broken.

**Dump control**, measured on a counter:

- `$dumpoff;` — suspends recording, writing a `$dumpoff` section that sets **every** dumped signal
  to `x`, so the viewer shows a visibly dead region rather than a frozen one.
- `$dumpon;` — resumes, writing a `$dumpon` section restating every current value.

```
#30
$dumpoff
x"
bx !
$end
#70
$dumpon
1"
b111 !
$end
```

- `$dumpflush;` — flush to disk without stopping. Useful when a simulation might be killed.
- `$dumplimit(N);` — cap the file at N bytes. Measured with `$dumplimit(2000)` on a run that would
  otherwise produce ~8 MB:

```
WARNING: Dump file limit (2000 bytes) exceeded.
dlim.vcd size = 2071 bytes
```

  and the file ends with `$comment Dump file limit (2000 bytes) exceeded. $end`. It overshoots
  slightly (2071 for a 2000 limit) — the limit is checked, not enforced mid-record.
- `$dumpall;` — a full snapshot of all dumped values at the current time.

The idiomatic "dump only the interesting window":

```verilog
initial begin $dumpfile("tb.vcd"); $dumpvars(0, tb); $dumpoff; end
initial begin @(negedge rst_n); repeat (900) @(posedge clk); $dumpon;
              repeat (200) @(posedge clk); $dumpoff; end
```

**The VCD format itself** — a complete real file, one D flip-flop, `` `timescale 1ns/100ps ``,
453 bytes:

```
$date
	Sun Aug  9 22:33:18 2026
$end
$version
	Icarus Verilog
$end
$timescale
	100ps
$end
$scope module tb $end
$var wire 1 ! q $end
$var reg 1 " clk $end
$var reg 1 # d $end
$scope module u $end
$var wire 1 " clk $end
$var wire 1 # d $end
$var reg 1 ! q $end
$upscope $end
$upscope $end
$enddefinitions $end
$comment Show the parameter values. $end
$dumpall
$end
#0
$dumpvars
0#
0"
x!
$end
#50
0!
1"
#100
0"
1#
#150
1!
1"
```

Everything the reader needs is visible in that:

- **Header**: `$date`, `$version`, `$timescale`. The timescale written is the **precision**
  (`100ps`), not the unit — so `#10` in the source appears as `#100` in the file.
- **`$scope module <name>` / `$upscope`** build the hierarchy tree in the viewer's sidebar.
- **`$var <type> <width> <id> <name> $end`** declares a signal. `<id>` is a short printable-ASCII
  code, and *aliased nets share an id*: `tb.q` and `tb.u.q` are both `!` because they are the same
  net. Explaining this pre-empts "why does the viewer show the same wiggle twice".
- **`$enddefinitions $end`** closes the header; everything after is value changes.
- **Value changes**: `#<time>` opens a time step, then one line per changed signal. Scalars are
  `<value><id>` with no space (`0!`, `x!`); vectors are `b<bits> <id>` with a space (`b1011 !`);
  reals are `r<number> <id>`. Only changes are recorded — VCD is already a delta format.
- Plain ASCII and line-oriented: a 15-line Python loop over `$scope`/`$upscope`/`$var` lists every
  signal, which is how the measurements above were made.

**VCD vs FST.** VCD's problem is size: text, and every change costs bytes. FST (Fast Signal Trace,
from GTKWave) is binary, block-compressed and written incrementally. Measured on the same 200 000 ns
run of a 32-bit LFSR plus an 8-deep shift register:

| dumper | file | bytes | ratio |
|---|---|---|---|
| VCD (default) | `big.vcd` | 8 236 379 | 1.00× |
| `-fst` | `big.fst` | 945 335 | **8.7× smaller** |
| `-fst-space` | `big.fst` | 927 164 | 8.9× smaller |
| `-fst-speed` | `big.fst` | 1 100 898 | 7.5× smaller |
| `-lxt2` | `big.lx2` | 528 331 | 15.6× smaller |

**Icarus can emit FST directly** — verified. It is a *runtime* choice, passed as an extended
argument to `vvp` after the design file:

```sh
vvp sim.vvp -fst            # FST instead of VCD
vvp sim.vvp -fst-space      # repack on close, smallest file
vvp sim.vvp -none           # suppress waveform output entirely
IVERILOG_DUMPER=fst vvp sim.vvp   # same, via environment
```

Confirmed messages: `FST info: dumpfile big.fst opened for output.` and, for `-none`,
`VCD info: dumping is suppressed.` with no file created. The full set per `vvp(1)`: `-vcd`,
`-lxt`/`-lxt2`/`-lx2` (± `-speed`/`-space`), `-fst` (± `-speed`/`-space`/`-space-speed`), and
`-none`, which may also be appended to any dumper name. FST and LXT2 are written **incrementally**,
so a killed or crashed simulation still leaves a usable trace — a real advantage when debugging a
hang.

**Controlling size in practice**, most effective first: dump a subtree (`$dumpvars(1, tb.u_dut)`);
window with `$dumpoff`/`$dumpon`; switch to `-fst`; cap with `$dumplimit`. For this guide's
four-input FP adder a full VCD is a few hundred kilobytes and none of it matters — say so, so the
reader knows the machinery exists without over-applying it.

## 6. Viewing waveforms in 2026

**Do not tell the reader to `brew install gtkwave`.** Measured on this machine:

```
$ brew info gtkwave
==> gtkwave (GTKWave): 3.3.107
GTK+ based wave viewer
https://gtkwave.sourceforge.net/
Deprecated because it is discontinued upstream! It was disabled on 2025-10-29.
Not installed
From: https://github.com/Homebrew/homebrew-cask/blob/HEAD/Casks/g/gtkwave.rb
```

There is no `gtkwave` formula in homebrew-core; `brew info gtkwave` resolves to the **cask**, which
prints the identical notice. Disabled 2025-10-29, reason "discontinued upstream", and a disabled
cask cannot be installed. Twenty years of tutorials say otherwise; say this plainly and early.

**But GTKWave is not dead — the honest picture.** Via the GitHub API, 2026-08-09:
`github.com/gtkwave/gtkwave` is `"archived": false`, GPL-2.0, last commit **2026-04-18**, last push
**2026-07-23**, latest tag **v3.3.116** — past the 3.3.107 Homebrew froze at. The only GitHub
*release* object is a rolling `nightly` pre-release: **there are no versioned binary releases.**
That, not abandonment, is what "discontinued upstream" records — the packaged, downloadable GTKWave
stopped being produced, and the old SourceForge macOS `.app` predates Apple silicon. Upstream's own
macOS page now points at a community tap (`randomplum/homebrew-gtkwave`) or a source build of
**GTKWave 4** via meson/ninja after `brew install desktop-file-utils shared-mime-types
gobject-introspection gtk-mac-integration meson ninja pkg-config gtk+3 gtk4 json-glib`.

So: still obtainable (source build, community tap, Debian/Ubuntu `gtkwave`, most CI containers),
but not a one-command macOS install, and not something to put in a book's setup instructions.

**Surfer — the alternative that is actually installed here.**

```
$ brew info surfer
==> surfer: stable 0.7.0 (bottled), HEAD
Waveform viewer, supporting VCD, FST, or GHW format
https://surfer-project.org/
License: EUPL-1.2
$ surfer --version
surfer 0.7.0 (git: v0.7.0)
```

- In **homebrew-core** — not a tap, not a cask: `brew install surfer`. Verified installed at
  `/opt/homebrew/bin/surfer`, arm64 Mach-O.
- Rust, EUPL-1.2, developed at Linköping University by Frans Skarman and Oscar Gustafsson. Also
  prebuilt Linux/Windows binaries, a source build on all three platforms, and — useful for a reader
  who cannot install anything — a WebAssembly build at `app.surfer-project.org` that runs in the
  browser without uploading the file.
- Reads **VCD, FST and GHW** (GHDL's format), plus FTR transaction files.
- Usage is `surfer tb.vcd`. Signals come from the hierarchy sidebar; there is a command palette for
  keyboard-driven operation.

**Surfer's non-GUI story, measured exactly.** `surfer --help`:

```
Usage: surfer [OPTIONS] [WAVE_FILE] [COMMAND]

Commands:
  server  starts surfer in headless mode so that a user can connect to it

Arguments:
  [WAVE_FILE]  Waveform file in VCD, FST, or GHW format

Options:
  -c, --command-file <COMMAND_FILE>  Path to a file containing 'commands' to run after a waveform
                                     has been loaded... NOTE: This feature is not permanent, it
                                     will be removed once a solid scripting system is implemented
      --script <SCRIPT>              Alias for --command_file to support VUnit
  -s, --state-file <STATE_FILE>      Load previously saved state file
      --wcp-initiate <WCP_INITIATE>  Port for WCP to connect to
```

and `surfer server --help`:

```
starts surfer in headless mode so that a user can connect to it
Usage: surfer server [OPTIONS] --file <FILE>
Options: --port, --bind-address, --token, --file
```

**`surfer server` is not a batch renderer.** "Headless" here means it serves a waveform file over
the network to a Surfer *GUI client* elsewhere — simulation on a build machine, viewer on a laptop.
Surfer has **no mode that prints a waveform, exports an image, or queries a signal value from the
command line.** `--command-file` replays interactive commands into the GUI after load and its own
help text calls it temporary; `--wcp-initiate` is the Waveform Control Protocol port used by editor
extensions to drive the viewer.

Conclusion for the chapter: **there is no scriptable waveform viewer here.** A machine-checkable
answer about a signal comes from the testbench (`$display`, `$strobe`, an error counter) or from
parsing the VCD in Python. The viewer is for the human.

**VS Code extensions.**
- **VaporView** (`lramseyer.vaporview`) — v1.5.4, updated 2026-06-04. VCD/FST/GHW native, FSDB with
  external libraries; signal grouping and colours, two markers, value and variable search, terminal
  integration that makes a printed timestamp and instance path clickable, WaveDrom export, remote
  viewing over SSH or a Surfer server.
- **Surfer's own extension**, embedding the WASM build so `code filename.vcd` opens a waveform tab.
- WaveTrace is the other name in older posts. Do not make the book depend on any extension.

**Also worth a line each.** `vcdvcd` — Python VCD parser with a `vcdcat` CLI (not installed here,
unverified). **wavedrom** — not a viewer: it renders hand-written JSON timing diagrams to SVG for
*documentation*, exactly right for this book's own figures and wrong for debugging; VaporView can
export a selection to WaveDrom, bridging a real trace to a figure. And rolling your own: a 20-line
VCD parser (section 5) that prints one signal's transitions often beats opening a GUI.

**How to read a waveform** — a procedure, not a tour of the UI:

1. **Clock at the top.** Everything is read relative to its edges.
2. **Reset next**, then DUT inputs, outputs, internals — signal-flow order. Resist adding 200
   signals; you will not read them.
3. **Check the very beginning.** Before reset releases, `x` is legitimate. After, it is not.
4. **Spot an `x`.** Unknown vectors render as a distinct band (red in Surfer) with `XXXX` in the
   value column. Scan left to right for the *first* one.
5. **Find the bad cycle.** Marker on the first edge where an output is wrong, then walk *backwards*
   through that signal's inputs until inputs are right and output is wrong. That is the broken
   logic.
6. **Read the value column, not the wiggles**, for anything wider than 4 bits; set the radix to hex.

**The workflow this chapter is really selling.** The testbench, not the viewer, finds the bug:

```
FAIL  t=1000 a=01 b=02 got=ff want=03
```

Now open `tb.vcd`, jump the cursor to **t = 1000**, and look only at that time. The printed message
gives you the *when*; the waveform gives you the *why*. A reader who internalises "print the time
in every failure message, then go to that time in the viewer" has got the whole method. Never open
a waveform without a time to go to — that is how afternoons disappear.

## 7. Debugging methodically

**Read the first divergence, not the last.** A failing run prints dozens of `FAIL` lines and every
one after the first is probably a consequence. Fix the earliest failing time and re-run; the tail
often vanishes. Same inside a waveform: the leftmost wrong value is the bug, everything right of it
is symptom. The highest-leverage habit in the chapter.

**Bisect in time.** Failure at cycle 900, correct at cycle 10 — you have a bracket. Halve it: is the
state you can name still right at 450? A `$strobe` of one internal signal per cycle into a file,
plus `grep`, finds the first bad cycle in two or three runs. Because Icarus's `$random` stream is
deterministic (section 3), bisection is exactly repeatable.

**Bisect in structure.** Comment out the second half of the datapath and check the first half's
output. This guide's FP adder decomposes naturally — unpack → align → add → normalise → round →
pack — so test a stage boundary before testing the whole.

**Add `$display` at region boundaries.** When the printed value does not match the waveform, it is a
region problem, not a logic problem. Print the same expression from three places:

```verilog
always @(posedge clk) $display("active  %0t q=%b", $time, q);   // pre-NBA
always @(posedge clk) $strobe ("monitor %0t q=%b", $time, q);   // post-NBA
always @(negedge clk) $display("negedge %0t q=%b", $time, q);   // settled
```

Measured in section 4: at a posedge, `$display` showed `q=0` while `$strobe` showed `q=1` in the
same step. If the three disagree, the question is *when*, not *what*.

**Dump a golden reference alongside the DUT.** The strongest technique at this level: compute the
expected value in the testbench with unsynthesisable Verilog (or `real` arithmetic, or a file
generated by Python), assign it to a `reg`, and dump it. The viewer then shows `dut_result` and
`golden_result` on adjacent rows and the first cycle they part company is visible at a glance. A
mechanic, not a methodology — chapter 5 turns it into a scoreboard.

**Compare two runs.** VCD is line-oriented text, so `diff` works:

```sh
vvp sim.vvp && mv tb.vcd good.vcd
# change one line of RTL
vvp sim.vvp && mv tb.vcd new.vcd
diff good.vcd new.vcd | head -40
```

Caveats to state: `$date` in the header makes the first hunk noise, and signal *id codes* get
reassigned if the signal set changes — so diff only runs of the same design with different stimulus,
or designs with identical signal sets. Otherwise parse both files in Python and compare value-by-time
for one named signal.

**`x` propagation and finding the origin.** Measured behaviour of `x` through operators, with
`a = 4'b01x1`, `b = 4'b0011`:

```
a+b   = xxxx    one x poisons the whole arithmetic result
a&b   = 00x1    bitwise ops are per-bit: x&0 = 0, so good bits survive
a==b  = 0       == is x only when the KNOWN bits all match; here bit2 differs, so 0
a===b = 0       === is 4-state and is never x
x?a:b = 0xx1    the conditional merges bit-by-bit: agreeing bits survive
und   = xxxx -> und+b = xxxx     an undriven reg poisons everything downstream
```

Consequences to teach:

- `+` poisons all bits, so a single undriven bit becomes a fully unknown result many stages later.
  **Search upstream, never downstream.**
- `&`, `|`, `^` and `?:` are per-bit, so the *pattern* of surviving bits identifies the bad bit.
  Print with `%b` — `%h`/`%d` collapse the value to `X`.
- `==` returning `0` can mean "definitely differs in a known bit", not "not equal". Use `===` in
  checkers, always.

**What an all-`x` output usually means**, in descending likelihood, from bugs reproduced for these
notes:

1. **The clock never toggled** — `reg clk;` with no initial value, `~x == x`, no `posedge` ever.
2. **Reset never asserted**, or asserted after the first edge.
3. **A `reg` is never assigned** — typo'd name, missing `else`, `case` with no `default`. Measured
   above: undriven `und` propagates `xxxx` through everything.
4. **An unconnected port.** `-Wall` includes `portbind` and *does* catch dangling input ports — one
   of the few beginner bugs Icarus reports, so lean on it.
5. **Width mismatch** leaving an unassigned upper region.

Diagnose in that order; it beats reasoning.

**Reduce to a minimal case.** Take the exact inputs from the `FAIL` line; write a tiny testbench
that applies only that vector (no clock loop if the DUT is combinational); confirm it still fails
(if not, the bug is state-dependent — that is itself information); shrink the inputs field by field,
since each simplification that preserves the failure removes a suspect; then dump a VCD of *that*
run, which will have ten transitions instead of ten thousand. A minimal case is also what you paste
into a bug report, keep as a regression test, or print in the book.

## 8. Build automation

**`iverilog` options worth knowing** (`iverilog -h` and `iverilog(1)`, both consulted locally):

| option | meaning |
|---|---|
| `-o file` | output file (default `a.out`) |
| `-s topmodule` | name the root explicitly — required once several testbenches are in one command |
| `-g2012` | language generation. Established in ch 2; keep it everywhere |
| `-Wall` | warning bundle (see below) |
| `-I dir` | search path for `` `include `` |
| `-y dir` | **library** directory: for each still-unknown module `foo`, look for `dir/foo.v` |
| `-Y .sv` | extra suffix for `-y` search |
| `-D NAME[=v]` | define a preprocessor macro |
| `-t null` | run the front end and elaborate, emit **nothing** — a syntax/elaboration gate |
| `-c file` / `-f file` | read the file list (and options) from a command file |
| `-M depfile` | emit make-style dependencies |
| `-E` | preprocess only |

Verified end to end:

```sh
iverilog -g2012 -Wall -o t_ok.vvp -s tb_adder8 -I inc -y rtl tests/tb_adder8.v
```

found `adder8` in `rtl/adder8.v` without naming it, and `defs.vh` via `-I inc`. Renaming to
`adder8.sv` broke it (`error: Unknown module type: adder8`, `*** These modules were missing:`);
`-Y .sv` fixed it. `-DBROKEN` selected the `` `ifdef `` branch and the run failed as designed.

`-t null` verified as a fast syntax gate: on good source, **no output file**, exit **0**; on a
missing semicolon, `syntax error` / `I give up.` and exit **2**. Ideal for `make lint` or a save
hook.

**Warning classes** (`iverilog(1)`, WARNING TYPES). `-Wall` = `anachronisms`, `implicit`,
`macro-replacement`, `portbind`, `select-range`, `timescale`, `sensitivity-entire-array`; switch one
off with `-Wno-<class>`. Most useful: **`portbind`** (dangling instance ports — one of the very few
classic beginner bugs Icarus reports) and **`timescale`** (observed live: a DUT with no timescale
next to a testbench with one gave `warning: timescale for adder8 inherited from another file.`,
which matters because inherited timescales make delays depend on compilation order). Two classes are
**not** in `-Wall`: `-Winfloop` (zero-delay `always` paths, i.e. hangs — expect false positives, run
it when something hangs) and `-Wsensitivity-entire-vector`.

**`vvp` options** (`vvp -h`):

```
 -i             Interactive mode (unbuffered stdio).
 -l file        Logfile, '-' for <stderr>
 -M path        VPI module directory        -m module   Load vpi module.
 -n             Non-interactive ($stop = $finish).
 -N             Same as -n, but exit code is 1 instead of 0
 -q             Quiet mode (suppress output on MCD bit 0).
 -s             $stop right away.
 -v             Verbose progress messages.
```

For CI: **`vvp -N sim.vvp`** converts a stray `$stop` from "hang forever" into "fail the job"
(verified: `-N` on `$stop` → exit 1, on `$finish` → exit 0). `-l run.log` captures output without
shell redirection. Extended arguments — the dumpers (`-vcd`, `-fst`, `-lxt2`, `-none`) and anything
starting with `+` — go **after** the design file name.

**Plusargs, verified end to end.**

```verilog
if ($test$plusargs("verbose")) $display("verbose ON");
if ($value$plusargs("count=%d", n)) $display("count from cmdline = %0d", n);
ok = $value$plusargs("name=%s", name);
ok = $value$plusargs("hex=%h", seedv);
```

```
$ vvp pa.vvp
verbose off
count default      = 10
name ok=0 name=none
hex  ok=0 val=xxxxxxxx

$ vvp pa.vvp +verbose +count=7
verbose ON
count from cmdline = 7

$ vvp pa.vvp +name=alpha +hex=deadbeef
name ok=1 name=alpha
hex  ok=1 val=deadbeef

$ vvp pa.vvp +VERBOSE
verbose off
```

Measured rules: `$test$plusargs` returns 1/0 for presence; `$value$plusargs("key=%fmt", var)` returns
1 on match and **leaves the variable untouched on failure** (`n` kept 10, `name` kept `"none"`), so
*always* initialise the variable with the default first. Matching is **case-sensitive** (`+VERBOSE`
did not match `verbose`). `%d`, `%h`, `%s` all worked. Arguments not starting with `+` are invisible
to `$…plusargs`. This is how one compiled binary becomes many tests: `+seed=`, `+vectors=`,
`+dump`, `+cycles=`.

**A Makefile that works** — written and run for these notes, output verbatim below:

```make
IVERILOG ?= iverilog
VVP      ?= vvp
IVFLAGS  ?= -g2012 -Wall -y rtl -I inc
BUILD    ?= build
TESTS    := $(notdir $(basename $(wildcard tb/tb_*.v)))

all: test

$(BUILD):
	@mkdir -p $(BUILD)

$(BUILD)/%.vvp: tb/%.v | $(BUILD)
	$(IVERILOG) $(IVFLAGS) -s $* -o $@ $<

$(BUILD)/%.log: $(BUILD)/%.vvp
	@cd $(BUILD) && $(VVP) $(notdir $<) > $(notdir $@) 2>&1; \
	 rc=$$?; \
	 if [ $$rc -ne 0 ] || grep -q FAIL $(notdir $@); then \
	   echo "FAIL $*  (rc=$$rc)"; sed 's/^/    /' $(notdir $@); exit 1; \
	 else echo "PASS $*"; fi

test: $(addprefix $(BUILD)/,$(addsuffix .log,$(TESTS)))

lint:
	$(IVERILOG) $(IVFLAGS) -t null -s tb_pass tb/tb_pass.v

clean:
	rm -rf $(BUILD) *.vcd *.fst
.PHONY: all test lint clean
```

```
$ make -k test
iverilog -g2012 -Wall -y rtl -I inc -s tb_fail -o build/tb_fail.vvp tb/tb_fail.v
FAIL tb_fail  (rc=1)
    FAIL tb_fail: s=03 exp=04
    FATAL: tb/tb_fail.v:3: x
           Time: 1000  Scope: tb_fail
make: *** [build/tb_fail.log] Error 1
iverilog -g2012 -Wall -y rtl -I inc -s tb_pass -o build/tb_pass.vvp tb/tb_pass.v
PASS tb_pass
make: Target `test' not remade because of errors.
rc=2
```

Design notes, all load-bearing:

- **Tests are discovered**, not listed: `$(wildcard tb/tb_*.v)`. Adding a test is adding a file.
- **`-s $*`** requires the convention *file `tb/tb_foo.v` contains module `tb_foo`*. State it; it is
  what makes the pattern rule possible.
- The `.log` rule holds the **failure gate**, using **both** signals: `rc != 0` (catches `$fatal`
  and `vvp -N` on `$stop`) **or** `grep -q FAIL` (catches a testbench that reported with `$error`
  and exited 0). Section 4 explains why the second half is not redundant.
- `cd $(BUILD)` keeps VCDs out of the source tree — but `$readmemh` paths are then relative to that
  directory (section 3).
- `make -k` runs the whole regression instead of stopping at the first failure, and still exits
  non-zero overall, which is what CI reads.
- Intermediate `.vvp` files are auto-deleted unless declared `.PRECIOUS` — harmless, but it explains
  the `rm build/*.vvp` line make prints.
- `make lint` is a sub-second syntax check with no simulation.

**Exit codes, collected:** `iverilog` 0 on success, 1 on elaboration errors, **2 on syntax errors**.
`vvp` 0 for a normal end or `$finish`, **1 for `$fatal`**, 1 for a runtime error such as
`$dumpvars` on a memory, 1 for `$stop` under `-N`. Not 1 for `$error`, `$warning` or `$info` — which
is the whole reason the `FAIL`-string convention exists.

## 9. Pedagogical hazards

Continuing chapter 3's honesty theme: for most of these, **Icarus says nothing at all.** The
"detected by" column is the point of the table, not decoration.

| # | Trap | What the reader sees | Detected by Icarus? |
|---|---|---|---|
| 1 | No `$finish` with a free-running clock | terminal hangs forever; needs Ctrl-C | **No** — measured, killed at 4 s, exit 137 |
| 2 | No `$dumpvars` (or no `$dumpfile`) | no `.vcd` file, or a 0-byte one | **No** |
| 3 | `$monitor` called twice | only the last one ever prints | **No** — measured, silent replacement |
| 4 | `reg clk;` with no initial value | every signal `x` forever, no edges | **No** |
| 5 | Stimulus on the same edge the DUT samples | results shift by a cycle, inconsistently | **No** — measured race |
| 6 | Testbench prints but never compares | a wall of plausible numbers, always "passes" | **No** |
| 7 | "Simulation passed, so the hardware is right" | — | **No** |
| 8 | Assuming `$random` differs per run | reruns identical; "random" testing tests one case | **No** |
| 9 | Expecting `$error` to fail the build | red text, `make` reports success | **No** — measured exit 0 |
| 10 | Dumping an array and not finding it | array missing from the viewer | Partly — hard error only for `$dumpvars(0, mem)` |
| 11 | `#delay` deadlock | simulation "finishes" early or hangs | **No** |
| 12 | Hand-computed expected value is itself wrong | a "bug" that is not in the DUT | **No** |

Fixes, in the same order:

1. A dedicated `initial #SIM_END $finish;` **and** a watchdog that prints `FAIL` first. Teach Ctrl-C
   as recovery so the first hang is not frightening.
2. `$dumpfile` alone writes a header and nothing else. Both calls go in an `initial`, `$dumpfile`
   first.
3. One `$monitor` per simulation, anywhere; or use `$strobe` in an `always`, which composes.
4. `reg clk = 1'b0;`. Diagnosed in one second by looking at `clk` itself in the viewer.
5. Drive on the opposite edge, or with `<=`. Measured in section 2: the captured value alternated
   between old and new across consecutive edges.
6. An error counter and a final PASS/FAIL line. The tell is a testbench with no `if`, no counter and
   no `FAIL` string. This hazard is *the* bridge into chapter 5.
7. Three separate gaps: the testbench only tried the vectors you thought of; simulation forgives
   what synthesis does not (inferred latches, multiple drivers, `x` optimism); and zero-delay RTL
   simulation says nothing about meeting a clock period. Promise this is revisited; do not resolve
   it here.
8. Print the seed in every run's header, and vary it through a plusarg. Reruns explore no new space
   otherwise, and an unprinted seed makes a failure irreproducible.
9. `$fatal` on a non-zero error count, plus the `FAIL`-string grep — and no *passing* line may
   contain `FAIL`.
10. Name individual words, or print with `$display`. Pre-empt the reader's instinct that the viewer
    is broken.
11. Varieties: `wait (done)` where `done` never sets; `@(posedge x)` on a dead signal; a `forever`
    with no delay (Icarus *does* make the all-paths-zero-delay case fatal; `-Winfloop` warns about
    the rest); and the quiet one — the last `initial` statement runs off the end while the clock
    ticks on.
12. Derive expected values from an independent implementation (Python `struct` for FP), check the
    checker against a case you are certain of, and be suspicious when a DUT change makes exactly one
    vector pass. Section 4 measured an accidental pass: `0x80 + 0x80` and `0x80 - 0x80` both give
    `0x00`.

Two more if space allows: `$readmemh` continuing after a missing file (measured: prints `ERROR:`,
exits 0), and `%h`/`%d` printing a partially-unknown value as a bare `X`, so an `x` bug looks like a
value bug (measured).

## Corrections found while writing the chapter (2026-08-09)

Every experiment in these notes was re-run by the chapter writer. Six claims
above are wrong or imprecise as written. **Later chapters must use the corrected
version, not the original.** Correction 6 was added during chapter 4's first fix
round (2026-08-10), when the review caught the same error in the chapter itself.

1. **`$dumpvars(0, tb.mem)` is a LOAD-time error, not a run-time one.** `iverilog`
   accepts the file and exits 0; `vvp` refuses to load the program before time
   starts (`ERROR: ... $dumpvars cannot dump a vpiMemory.`, exit 1). It therefore
   fires even when the statement is never executed, so it cannot be hidden behind
   a plusarg — `src/ch04/bad_dumparray.v` puts it behind an `` `ifdef `` instead.
   It also fits neither `run` nor `xfail` in a `targets.txt` manifest.
2. **Parameters *are* dumped.** Section 5 says they are not, and that Icarus writes
   a `$comment Show the parameter values. $end` marker "instead". Measured: a
   `localparam real PERIOD = 10.0` appears as `$var real 1 " PERIOD $end` and its
   value is emitted in a `$dumpall` block immediately after that comment marker.
   The comment introduces the parameter dump; it does not replace it.
   Also newly measured: **named blocks and tasks become VCD scopes** —
   `$scope begin watchdog $end` and `$scope task check $end`, the latter carrying
   the task's arguments as variables.
3. **A literal seed is not a compile error.** Section 3 says `$urandom(7)` is a
   compile error. Measured: `iverilog -g2012 -Wall` exits **0**, and `vvp` rejects
   it at load time (`ERROR: $urandom's seed must be an integer/time variable or a
   register.`, exit 1) — the same split chapter 2 documented for an unrecognised
   system task.
4. **The odd-period timescale trap changes the period, not the duty cycle.**
   Section 2 says "the half-period is rounded and the duty cycle drifts". Both
   halves round identically, so the duty cycle stays at 50 % and the *frequency*
   is wrong: measured with `` `timescale 1ns/1ns ``, a `#(5.0/2.0)` generator
   produced a **6 ns** period against the 5 ns asked for. `src/ch04/tb_period.v`.
5. **The VCD/FST ratio is entirely design-dependent.** Section 5's 8.7x came from
   an LFSR. Re-measured on a counter and its delayed copies over 100 000 cycles:
   VCD 14 655 819 B, `-lxt2` 874 898 B (16.7x), `-fst` 218 160 B (67x),
   `-fst-space` 6 759 B (2168x). Quote a range, never a single figure.
   Re-measured 2026-08-10 on the shipped `dff.v pipe2.v tb_dump.v` with
   `vvp sim.vvp +dump=/tmp/w.vcd +cycles=100000`, and again with `-lxt2`,
   `-fst` and `-fst-space` writing `/tmp/w.lxt2` and `/tmp/w.fst`: VCD
   14 654 851 B, `-lxt2` **872 834** B (16.8x), `-fst` 218 067 B (67.2x),
   `-fst-space` **6 654** B (2202x). The earlier 872 810 / 6 653 figures in this
   note did not reproduce and are corrected here. The last digits move with the
   `$dumpfile` string, which is itself a dumped variable: the identical
   `-fst` run writing `/tmp/w.fst2` gives 218 068 B, one byte more for one more
   character of path. **Always state the output paths with the byte counts.**
6. **`$dumpfile` appends an extension only when the name has none.** Section 5
   says `$dumpfile("tb.vcd")` under `-fst` yields `tb.vcd.fst`. Measured, one
   clean directory per case: it yields **`tb.vcd` containing FST data**. A name
   that already carries an extension is used verbatim, and the reverse trap is
   real too — `$dumpfile("tb.fst")` with no dumper flag writes VCD text into
   `tb.fst`. The format comes from the `vvp` flag, never from the name, so the
   extension can lie in either direction with no warning. The original advice
   ("always give the extension or never") stands; the mechanism given for it did
   not.

Added 2026-08-10, from mutation-testing the shipped chapter-4 testbenches. All
three matter for chapters 9, 11 and 12.

7. **A watchdog counted in clock edges cannot fire on a dead clock.** Section 4
   shows the correct `#N` form, but `tb_dump.v` shipped with
   `repeat (limit + 20) @(posedge clk)`, justified as surviving a change of
   period. With `reg clk;` instead of `reg clk = 1'b0;` — this guide's own
   documented trap — that run had to be killed at eight seconds and printed
   nothing at all, while `tb_anatomy.v`'s `#10000` fired normally. **A watchdog
   must wait on time, never on a signal.** Both testbenches now use an absolute
   `#delay`, scaled from `+cycles` where the run length is configurable.
8. **A once-per-cycle value check cannot see a half-cycle shift.** Sampling a
   pipeline output at one instant per cycle pins *what* it holds and never
   *when* it changes, so any design whose output moves on the opposite edge is
   read before it moves and lands on the expected number by construction. A
   `pipe2` rebuilt as a single **negedge** flip-flop — half a cycle of latency,
   one flop — passed the in-loop check and printed `PASS tb_dump (latency 2)`.
   The cheap fix is a concurrent `always @(sig)` that requires `clk` to be at
   its active level whenever `sig` changes; four surviving mutants died to it.
9. **A DUT output that no testbench reads is untested and looks tested.**
   `adder8`'s `cout` was declared and port-connected in three testbenches and
   compared in none, so tying it to `1'b0` or `1'b1` gave a clean 14/14. Port
   connection is not coverage. When auditing a testbench, grep for every DUT
   output name and confirm each appears in a comparison, not just in a
   port map.

Two smaller ones. **VCD identifier aliasing is partial**: `clk` carried one
identifier across all four scopes, but the 8-bit ports each got their own code
even where they are the same net, so section 5's "aliased nets share an id" is
true only sometimes. And **`$time` cannot be part-selected** — `$time[15:0]` is a
syntax error; assign it to a `reg` first.

## Citations

**Primary — measured on this machine, 2026-08-09.** The authority for every "measured" claim above;
all experiments were compiled and run in the session scratchpad.

- Icarus Verilog 13.0 (stable) (v13_0), `iverilog -V` / `vvp -V`; © 2000–2026 Stephen Williams.
  macOS 15 / arm64. `[verified — local]`
- `iverilog(1)` man page, *OPTIONS* and *WARNING TYPES* (`-y`, `-Y`, `-t null`, `-s`, `-I`, `-D`,
  warning class list). `[verified — local]`
- `vvp(1)` man page, *OPTIONS* and *EXTENDED ARGUMENTS* (`-n`, `-N`, `-l`, `-q`; the `-vcd` /
  `-lxt` / `-lxt2` / `-lx2` / `-fst` / `-none` dumpers; `IVERILOG_DUMPER`). `[verified — local]`
- `vvp -h`, `iverilog -h`, `surfer --help`, `surfer server --help` — quoted verbatim in sections 6
  and 8. `[verified — local]`
- `brew info gtkwave` / `--cask gtkwave`: *"Deprecated because it is discontinued upstream! It was
  disabled on 2025-10-29."*, cask 3.3.107, `Homebrew/homebrew-cask/Casks/g/gtkwave.rb`.
  `[verified — local]`
- `brew info surfer`: `stable 0.7.0 (bottled)`, homebrew-core `Formula/s/surfer.rb`, EUPL-1.2;
  `surfer --version` → `surfer 0.7.0 (git: v0.7.0)`. `[verified — local]`

**Web sources.**

- https://github.com/gtkwave/gtkwave `[verified]` — fetched and queried via `gh api`:
  `archived: false`, `disabled: false`, GPL-2.0, last commit 2026-04-18, last push 2026-07-23,
  latest tag `v3.3.116`.
- https://github.com/gtkwave/gtkwave/releases `[verified]` — only a rolling `nightly` pre-release;
  no versioned binary releases.
- https://gtkwave.github.io/gtkwave/install/mac.html `[verified]` — recommends the community tap
  `github.com/randomplum/homebrew-gtkwave` or a GTKWave 4 source build via meson/ninja with the
  quoted `brew install` dependency line; no MacPorts.
- https://surfer-project.org/ `[verified]` — "An Extensible and Snappy Waveform Viewer"; Linköping
  University, Frans Skarman and Oscar Gustafsson; EUPL-1.2; Linux/Windows binaries, source build on
  all three platforms, browser build at `app.surfer-project.org`.
- https://gitlab.com/surfer-project/surfer/-/raw/main/README.md `[verified]` — VCD, FST, GHW and FTR
  loading; client-server mode via `surver`; VS Code extension using the WASM build.
- https://gitlab.com/surfer-project/surfer `[verified]` — fetched; metadata only, the README above
  carries the substance.
- https://marketplace.visualstudio.com/items?itemName=lramseyer.vaporview `[verified]` — VaporView
  1.5.4, updated 2026-06-04; VCD/FST/GHW native, FSDB via external libraries; grouping and colours,
  two markers, value/variable search, terminal timestamp-and-path links, WaveDrom export, remote
  viewing over SSH or a Surfer server.
- https://formulae.brew.sh/formula/gtkwave `[title-only]` — HTTP 404; gtkwave is a cask, not a
  formula. The local `brew info` output above is the verified substitute.
- vcdvcd (Python VCD parser, `vcdcat` CLI) — PyPI page failed to render; not installed here.
  `[title-only]`
- WaveDrom — JSON timing-diagram renderer for documentation. `[title-only]`
- WaveTrace VS Code extension. `[title-only]`
- `randomplum/homebrew-gtkwave` community tap — referenced by the verified GTKWave macOS page, not
  fetched itself. `[title-only]`

**Standards and books** (not fetched; cite by title/edition/section).

- IEEE Std 1364-2005, *Verilog Hardware Description Language* — §17.1 (`$display`, `$write`,
  `$strobe`, `$monitor`, format specifications), §17.1.2 (`$finish`, `$stop`), §17.2 (`$readmemh`,
  `$readmemb`), §17.9 (`$random`), §18.2 (VCD tasks), §18.2.1 (four-state VCD grammar).
  `[title-only]`
- IEEE Std 1800-2023, *SystemVerilog LRM* — §4.4 (stratified event regions), §20.6.1
  (`$test$plusargs`, `$value$plusargs`), §20.10 (severity tasks), §20.15 (`$urandom`,
  `$urandom_range`). `[title-only]`
- Stuart Sutherland, *Verilog HDL Quick Reference Guide* (IEEE 1364-2005 ed.) — system task and
  format-specifier tables. `[title-only]`
- Samir Palnitkar, *Verilog HDL*, 2nd ed. — ch. 9 (tasks and functions), ch. 10 (stimulus,
  `$monitor`, file I/O). `[title-only]`
- Clifford E. Cummings, "Nonblocking Assignments in Verilog Synthesis, Coding Styles That Kill!",
  SNUG 2000 — canonical on the testbench/DUT edge race of section 2. `[title-only]`
- Janick Bergeron, *Writing Testbenches*, 2nd ed. — ch. 3–4. Mostly chapter 5 material.
  `[title-only]`
- Icarus Verilog documentation site, https://steveicarus.github.io/iverilog/ — the VVP simulation
  page attempted returned HTTP 404, so nothing from the site is cited; the installed man pages were
  used instead. `[title-only]`
