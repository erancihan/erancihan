# Chapter 4 review — Simulation, Testbenches and Waveforms

Reviewer persona: RTL veteran. Everything below was re-run on this machine
(Icarus Verilog 13.0, macOS 24.6.0 arm64). Nothing was taken on trust.

<!-- sections complete: 7/7 -->

## Verdict

**Score: 6/10**

The sourcing and the prose are excellent — all seven listings are byte-identical to disk,
every quoted transcript reproduces (the 48-line VCD header matches on 47 of 48 lines, tabs
included), the GTKWave and Surfer research checks out to the exact commit date and release
object, the ASCII timing figure is correct to the nanosecond against a real VCD, and all
five research-note corrections held under my own independent measurement. But four
reproducibly false claims survive in a chapter whose entire differentiator is that its
measurements are real: the `$dumpvars` depth table was taken against an earlier revision of
`tb_dump.v` and is wrong on three of four rows against the shipped file (17/5/11/10 stated,
19/6/13/10 measured); the Makefile presented as the book's regression harness caches its
results and has no edge from a testbench to its DUT, so a deliberately broken `adder8.v`
yields `make: Nothing to be done for 'all'.` and exit 0; `$dumpfile("tb.vcd")` under `-fst`
produces `tb.vcd`, not the `tb.vcd.fst` the chapter states; and `tb_dump.v` prints
`PASS tb_dump (latency 2, …)` against a pipeline I rebuilt with a single flip-flop. Three
of the four need re-measurement or code changes rather than a word change, which is what
keeps this below the one-real-defect band.

## Code verification

### Harness

`bash run_all.sh ch04` from a cold tree: **14 passed, 0 failed, exit 0.** All fourteen
manifest lines are `run`; there is no `xfail`, and `targets.txt` explains why in a comment
(both of the chapter's hard errors are `vvp` load-time rejections, which fit neither row).
That reasoning is correct — I confirmed both rejections happen at load time, below.

Whole repo: `bash run_all.sh` → **61 passed, 0 failed.** Matches the claim.

### File inventory

Claimed 21 `.v` + Makefile + `targets.txt` + README + two `.hex`. Counted on disk:
**21 `.v`**, `Makefile`, `targets.txt`, `README.md`, `vectors.hex`, `vectors_bad.hex`.
Exact.

### Makefile behaviour

| run | result |
|---|---|
| cold `make` | 14 × `ok`, exit **0** |
| `make -j8` from clean | 14 × `ok`, exit 0 — parallel-safe |
| clean + `make -k PLUSARGS=+break` | `FAIL tb_vectors (rc=1)`, exit **2** |
| clean + `make -j8 -k PLUSARGS=+break` | exit **2** |
| `make lint` | exit 0 |

The failure gate does fire, and exit 2 is right. The transcript in the chapter reproduces
**line for line** from a warm build (`.vvp` files present, logs removed) — the `.log`
recipe is `@`-prefixed while the `.vvp` recipe is not, which is why the chapter's block
carries no `iverilog` echo lines. That is real captured output, not an edited one.

Parallel build is genuinely safe: the `| $(BUILD)` order-only prerequisite is honoured,
`.PRECIOUS` keeps the `.vvp` files, and no test writes into the source directory, so
fourteen concurrent `vvp` processes sharing a working directory cannot collide.

**But the dependency graph is incomplete, and the result cache makes it worse.** Two
measured failures:

1. `$(BUILD)/%.vvp: %.v` names only the testbench. The DUT is resolved by `-y .` at
   compile time, so `make` has no edge from `tb_check.vvp` to `adder8.v`. I replaced
   `assign {cout, sum} = a + b;` with `a - b;` in `adder8.v` and ran `make`:

   ```
   make: Nothing to be done for `all'.
   EXIT=0
   ```

   From clean, the same tree gives `FAIL tb_stimulus (rc=1)` and exit 2; `run_all.sh`
   gives 12 passed / 2 failed. So the guide's own runner is sound and the Makefile is not.

2. Because `$(BUILD)/%.log` is a real file target, a second `make` runs **no tests at
   all**, and `make PLUSARGS=+break` after a plain `make` is a silent no-op:

   ```
   $ make                       # 14 ok
   $ make -k PLUSARGS=+break
   make: Nothing to be done for `all'.
   EXIT=0
   ```

   That is the exact sequence the chapter's prose puts the reader through — "Run it and
   all fourteen tests go green … `make -k PLUSARGS=+break`". As written, the gate
   demonstration proves nothing unless `make clean` happens first, which the chapter
   never says.

### Artifact cleanliness

Clean. After `run_all.sh`, the full `make` matrix and every ad-hoc experiment, a scan of
`guide/src/` for anything that is not `.v`, `.md`, `.hex`, `targets.txt`, `Makefile` or
`run_all.sh` returns **nothing**. No `.vcd`, `.fst`, `.vvp`, `.log` or `a.out` anywhere.
The `+dump=` plusarg discipline works exactly as advertised, and the reason given for it
(`$dumpfile` and `$readmemh` resolve against `vvp`'s working directory, which is the
source directory for both runners) is correct.

### Listings versus files on disk

Mechanically diffed, all seven:

| chapter line | file | result |
|---|---|---|
| 20 (78 ln) | `tb_anatomy.v` | **whole file, byte-identical** |
| 131 (5 ln) | `tb_period.v` | verbatim excerpt, lines 13–17 |
| 151 (4 ln) | `tb_anatomy.v` | verbatim excerpt, lines 53–56 |
| 170 (7 ln) | `tb_stimulus.v` | verbatim excerpt, lines 56–62 |
| 213 (9 ln) | `tb_vectors.v` | verbatim excerpt, lines 40–48 |
| 250 (5 ln) | `tb_strobe.v` | verbatim excerpt, lines 29–33 |
| 500 (45 ln) | `Makefile` | **whole file, byte-identical** |

Zero divergence. Every excerpt is a contiguous run of lines from its file.

### Transcript freshness

Re-captured every one. All reproduce:

- `tb_anatomy`, `tb_period`, `bad_readmem`, `tb_check`, `tb_print`, `tb_random`,
  `tb_vectors +break` (exit **1**) — exact.
- The no-`$finish` hang: killed after 4 s, **exit 137**. Exact.
- `$readmemh` on a missing file: I rebuilt the throwaway `s_rmf.v` from scratch and got
  `ERROR: s_rmf.v:5: $readmemh: Unable to open nope.hex for reading.` / `m[0]=xx`,
  **exit 0**. Byte-identical, line number included.
- `bad_dumparray` VCD warnings and the escaped-identifier `$var` line
  (`$var reg 8 % \mem[0] [7:0] $end`) — exact.
- The 48-line VCD header: **47 of 48 lines byte-identical**, tabs included; the only
  difference is the `$date` stamp, which is inherent to the capture.
- `brew info gtkwave` — first six lines exact.
- `make -k PLUSARGS=+break` — exact, contiguous, from a warm build.

**Non-contiguous selections: there are three, not two.** `tb_random` ("three lines of its
run, plus the verdict") and `tb_print` ("Five lines out of its run") are declared and the
counts are accurate. The third, `tb_strobe`, is not declared: the shown block is real
output lines 5–12 followed by the verdict, silently dropping lines 13–16 (the `t=30000`
and `t=35000` group). Consequence — the verdict reads `PASS tb_strobe (4 edges where
$display saw the old q)` while only **two** such edges are visible. Details in
*Non-blocking issues*.

### Other measured tables

The severity table re-measured, every row: `$info`/`$warning`/`$error` → **0**;
`$fatal(1, …)` → **1**; `$finish` → 0; `$finish(0)` → silent, 0; `$stop` → prints
`** VVP Stop(0) **`, **continues** (my probe printed its post-`$stop` line), exit **0**;
`$stop` under `vvp -N` → exit **1**. The parenthetical that `$fatal`'s first argument is a
finish number, not an exit code, also checks out: `$fatal(0)`, `$fatal(1)` and `$fatal(2)`
all exit 1. This table is flawless.

The `$dumpvars` depth table is **not**. See *Blocking defects*.

## Re-verification of the five research corrections

**All five hold.** The writer was right to change the notes on the strength of them, and
in one case my first attempt at reproduction was wrong and the writer's method was better.

### 1. `$dumpvars` on a memory array is a `vvp` load-time rejection — CONFIRMED

```
$ iverilog -g2012 -Wall -DDUMPMEM -o dm.vvp bad_dumparray.v   → exit 0
$ vvp dm.vvp                                                   (NO +dump plusarg)
ERROR: bad_dumparray.v:29: $dumpvars cannot dump a vpiMemory.  → exit 1
```

The decisive part is the second line: with no `+dump=` plusarg the enclosing
`if ($value$plusargs(...))` is false, so the `$dumpvars` call is **never executed** — and
the error still fires. That is load time, not run time. I reproduced it independently with
a fresh `dumpguard.v` using a `$test$plusargs` guard, same result. So the claim that it can
only be hidden behind an `` `ifdef ``, and fits neither `run` nor `xfail`, is exactly right,
and `bad_dumparray.v`'s use of `` `ifdef DUMPMEM `` is the correct construction.

Corollary claim also confirmed: the array is genuinely absent from the VCD
(`grep -c '$var .* mem $end'` → **0**), while individual words appear as
`$var reg 8 % \mem[0] [7:0] $end` with one `VCD warning: array word … will conflict with
an escaped identifier.` per word.

### 2. Parameters, named blocks and tasks ARE dumped — CONFIRMED

Dumping `tb_anatomy` produced, verbatim:

```
$var real 1 " PERIOD $end
$scope begin watchdog $end
$scope task check $end
$comment Show the parameter values. $end
$dumpall
r10 "
$end
```

Every element the chapter and the notes claim: the `localparam real PERIOD = 10.0`
appears as `$var real`, its value `r10` lands in a `$dumpall` immediately after the
`$comment Show the parameter values. $end` marker, the named block `watchdog` becomes a
`$scope begin`, and the task `check` becomes a `$scope task` carrying its arguments.
The chapter's inline quotation is character-exact.

### 3. A literal `$random`/`$urandom` seed is a load-time error, not a compile error — CONFIRMED

```
$ iverilog -g2012 -Wall -o seedguard.vvp seedguard.v          → exit 0
$ vvp seedguard.vvp                                            (NO +doit plusarg)
ERROR: seedguard.v:8: $urandom's seed must be an integer/time variable or a register.
                                                               → exit 1
```

Worth recording the methodology, because I got this wrong first. My initial probe put the
seeded call behind `if (0)`, saw `vvp` exit 0, and briefly concluded the rejection was
*run*-time — which would have falsified the chapter. It did not: `iverilog` constant-folds
`if (0)` and the statement never reaches the compiled program. Re-running with a
`$test$plusargs` guard, which cannot be folded, the error fires with the plusarg absent.
Load time, confirmed, and the README's stronger claim — "checked before time starts, so no
plusarg can hide them and no `run` target can carry them" — is true for both errors.

### 4. A coarse timescale changes the period, not the duty cycle — CONFIRMED

`tb_period.v`, re-run:

```
  1ns/1ps: asked for 5.00 ns, measured 5.00 ns
  1ns/1ns: asked for 5.00 ns, measured 6.00 ns
```

A 5 ns request becomes a **6 ns** clock — `#2.5` rounds to `#3`, so the period is 6 and the
frequency error is 20 %, exactly as the chapter says.

The duty-cycle half of the claim is not checked by the shipped testbench, so I measured it
separately with a purpose-built `tb_duty`: over 100 ns of the coarse clock, **48.0 ns high,
48.0 ns low, 16 high pulses, duty cycle 50.0 %.** The chapter's "the duty cycle stays at
fifty per cent, which is why the symptom is easy to miss" is correct and now independently
backed.

### 5. VCD-to-FST ratio is design-dependent; 67× and 2168×, not 8.7× — CONFIRMED

Re-measured on the same design and run the chapter used (`dff.v pipe2.v tb_dump.v`,
`+cycles=100000`):

| dumper | my bytes | my ratio | chapter |
|---|---|---|---|
| VCD (default) | 14,655,787 | 1.0× | 14 655 819 / 1.0× |
| `-lxt2` | 874,822 | 16.8× | 874 898 / 16.7× |
| `-fst` | 218,158 | **67.2×** | 218 160 / 67× |
| `-fst-space` | 6,756 | **2169.3×** | 6 759 / 2168× |

Byte counts differ by 32 bytes on the VCD and 2–76 bytes on the others — entirely the
`$date` header string and equivalent metadata. Ratios reproduce.

**On the "a ratio is meaningless without the design" point:** the chapter does discharge
this. The sentence immediately under the table reads "these signals are a counter and its
delayed copies, about as compressible as data gets, and a design carrying random-looking
values compresses far less", and it downgrades the headline to "smaller than VCD by one to
three orders of magnitude". That is the honest framing. The only gap is that the table
never names the command that produced it, so a reader cannot re-run it without inferring
`+cycles=100000` from a comment inside `tb_dump.v`. Listed as non-blocking.

## Testbench craft audit

I have written and reviewed a lot of these. Most of what ships here is what I would want a
new hire to copy.

### What is right

**Clock idiom.** `reg clk = 1'b0;` plus `always #(PERIOD/2.0) clk = ~clk;` with the period
named rather than the half period. The initialiser-on-declaration is the correct fix for
the `~x` problem and the chapter explains *why* it is load-bearing rather than presenting
it as a ritual. `localparam real PERIOD` with `/2.0` is the right way to avoid the integer
division trap, and the chapter then shows the one remaining hazard (precision rounding)
with a measurement rather than a warning.

**Reset idiom.** Assert at time 0 before any edge exists; hold with `repeat (3) @(posedge
clk)` rather than a hand-counted `#35`; release on `@(negedge clk)`. All three rules are
correct, and the `repeat`-over-`#delay` justification (survives a period change) is the
real reason, not a rationalisation.

**Edge separation is correct AND consistently applied.** I checked this mechanically
rather than by eye, because it is the single most common way a shipped testbench lies.
Every DUT clocked process is `always @(posedge clk)` (`dff.v`, `counter4.v`). Every drive
of a DUT input in every testbench is on the *negative* edge:

- `tb_strobe.v:25` — `always @(negedge clk) d <= d + 8'd1;`
- `tb_dump.v:66` — `@(negedge clk) d <= 8'h10 + cyc[7:0];`
- `tb_anatomy.v:56,60,64,68` — reset release and all `en` changes on `@(negedge clk)`

The `@(posedge clk)` occurrences that remain are waits and observers only (reset hold,
the print block, the `$dumpoff` window, the watchdog) — none of them writes a DUT input.
**No shipped testbench samples or drives on the edge the DUT uses.** The chapter preaches
the rule and the code obeys it, which is more than most production repos manage.

**Error counting.** The pattern is sound and uniform: an `integer errors = 0;`, every check
incrementing it and printing a line containing `FAIL`, and a terminal
`if (errors == 0) $display("PASS …"); else $fatal(1, …);`. `$fatal` is the only severity
task that moves the exit status, which the chapter measures, so the exit code is not a lie.
The two-signal gate (exit status **and** the `FAIL` string) is the right belt-and-braces
design, and the corollary — no passing message may contain the word `FAIL` — is not only
stated but enforced in `tb_check.v`, which deliberately prints `MISMATCH` instead. That is
a genuinely sophisticated point and I have seen real regression suites broken by exactly
it.

**Watchdogs.** Present in `tb_anatomy.v` and `tb_dump.v`, each in its own `initial` block,
each printing `FAIL` with a reason before `$fatal`. `tb_dump.v`'s watchdog is counted in
clock cycles (`repeat (limit + 20) @(posedge clk)`) rather than nanoseconds, so it survives
a period change and a `+cycles` change — better practice than the fixed `#10000` in
`tb_anatomy.v`, and the comment says why.

**`task automatic`.** Used in `tb_stimulus.v` with the correct justification (static shared
locals corrupt concurrent invocations). Right, and the reasoning is the real one.

**Load guard.** `tb_vectors.v` pre-fills with `24'hxxxxxx`, calls `$readmemh`, then tests
`^vec[0] === 1'bx` and `$fatal`s. This is the single most valuable idiom in the chapter,
because the failure it prevents — `$readmemh` on a missing file prints `ERROR:`, continues,
and exits 0 — is one I have personally watched cost a team two days.

### Would any of these pass while the DUT was broken? Yes — one does.

I tried to break each. Two results worth reporting.

**`tb_dump.v` asserts a latency it does not measure.** Its only check is
`if (q !== 8'h10 + (ncyc[7:0] - 8'd1))`, run *after* the stimulus loop has finished and two
further negedges have drained the pipe. That is a settled-value check, not a latency check:
once `d` stops changing, any pipeline of latency ≤ 2 settles to the same final value. I
rebuilt `pipe2` with a single flip-flop (`u_b` deleted, `assign q = mid;`), same ports, and
ran the shipped `tb_dump.v` unmodified:

```
PASS tb_dump (latency 2, q=17)
EXIT=0
```

A one-stage pipeline passes a test whose verdict string claims latency 2. A three-stage
version is caught (`FAIL tb_dump: q=16 at the end, expected 17`), so the check is
one-sided: it detects latency that is too *long* and is blind to latency that is too
*short*.

This matters more than a normal weak check, because `pipe2`'s latency is not incidental —
it is the subject of the chapter's ASCII waveform figure, the thing the reader is told to
count with a finger, and the payload of the `> **Seed for chapter 11.**` callout. Nothing
else in the chapter verifies it. And it lands in the one chapter whose thesis is that a
testbench which does not compare the right thing is a demonstration, not an experiment.

A verified fix is four lines — check *during* the stream instead of after it:

```verilog
      @(negedge clk) d <= 8'h10 + cyc[7:0];
      if (cyc >= 2 && q !== 8'h10 + (cyc[7:0] - 8'd2)) begin
        errors = errors + 1;
        $display("FAIL tb_dump: cyc=%0d q=%02h expected %02h",
                 cyc, q, 8'h10 + (cyc[7:0] - 8'd2));
      end
```

I ran this against all three pipelines: latency 1 → caught (6 errors), latency 3 → caught
(6 errors), the real latency-2 `pipe2` → `PASS`. It is strictly better than the shipped
check and costs nothing.

**`tb_check.v` does not test `adder8` at all.** Every `compare()` call passes `bad_sum`; the
only reference to `good_sum` is the final `if (good_sum !== bad_sum)` on the `80 + 80`
vector, where a broken `adder8` would also produce `00`. So `tb_check.v` would pass with
`adder8` arbitrarily broken. I am **not** logging this as a defect: `tb_check.v`'s job is to
demonstrate mismatch reporting and the accidental-pass vector, and `adder8` is genuinely
covered elsewhere — breaking it made `tb_stimulus` and `tb_vectors` both fail under
`run_all.sh` (12 passed / 2 failed). The suite as a whole is sound. It is worth knowing
which file proves what, though.

**Everything else resisted.** `tb_anatomy`'s four checks pin the counter's reset, enable,
hold and resume behaviour and I could not find a broken `counter4` that slips through.
`tb_vectors` is properly self-checking with a load guard and `+break` proves its own failure
path. `tb_period` asserts both the good and the rounded clock. `tb_random` pins exact
values, so a stream change fails loudly — the right call given the determinism finding.
`tb_plusargs` checks the survive-the-default property that actually bites.

### Honest self-limiting files

`bad_severity.v` checks nothing, and its comment says "Nothing here checks anything. That
is the point" — correct, since the file exists to be reported PASS while printing `ERROR:`.
`bad_monitor.v` admits in its own comment that a testbench cannot observe monitor-slot
count and that "the evidence for the trap is the transcript". Both are honest about what
they prove. I verified the monitor claim myself: **0 `A:` lines, 6 `B:` lines**, no
diagnostic. True — though the chapter never shows that transcript (see non-blocking).

### Minor craft notes

- `tb_anatomy.v` declares `reg [8*256-1:0] dumpfile;` at module scope, so `$dumpvars(0,
  tb_anatomy)` dumps a 2048-bit register into the waveform. `tb_dump.v` and
  `bad_dumparray.v` put the same variable inside a named block, which is tidier. Worth
  making uniform, and it interacts with the depth-table defect below.
- `tb_period.v` compares reals with `!=` while the chapter preaches `!==`. This is
  *correct* — case equality is not defined for reals and a real cannot be `x` — but a sharp
  reader will notice the apparent contradiction and no note explains it.
- `tb_strobe.v`'s `always @(posedge clk) #1 begin … end` sampler is safe at a 10 ns period,
  but it is a delay-based sampler in a chapter that (rightly) teaches edge-based
  synchronisation. A one-line comment saying the `#1` is a deliberate mid-cycle probe would
  stop it being copied into a design context.

## Blocking defects

### B1. The `$dumpvars` depth table is stale and does not reproduce against the shipped file

Chapter, "Dumping Waveforms": the table is introduced as "measured here over a design three
scopes deep — `tb_dump`, `u_pipe`, and `u_a`/`u_b` — by walking each file's `$scope`/`$var`
lines". A reader who does exactly that gets different numbers.

| invocation | chapter says | **measured on the shipped `tb_dump.v`** |
|---|---|---|
| `$dumpvars;` / `$dumpvars(0, tb_dump);` | 17 | **19** |
| `$dumpvars(1, tb_dump);` | 5 | **6** |
| `$dumpvars(2, tb_dump);` | 11 | **13** |
| `$dumpvars(0, tb_dump.u_pipe);` | 10 | 10 ✔ |

Three of four rows are wrong. I established the cause rather than guessing at it. The extra
variables are `tb_dump.ncyc` (module scope) and `tb_dump.watchdog.limit` (a named-block
local). Removing exactly those two from a copy of `tb_dump.v` reproduces the chapter's table
**exactly**:

```
args='none     ' -> 17 vars
args='+depth=1 ' ->  5 vars
args='+depth=2 ' -> 11 vars
args='+sub     ' -> 10 vars
chapter claims:     17 / 5 / 11 / 10
```

So the table was measured before `tb_dump.v` gained the `+cycles` plusarg (`ncyc`) and the
named `watchdog` block, and was never re-measured. This directly contradicts the claim that
every transcript was re-captured from a cold rebuild, and it is the same failure mode the
chapter 3 review already logged once — fixing or extending a file invalidates a counting
claim elsewhere.

It is blocking because the numbers are presented as a measurement of a file the reader has
in front of them, with the counting method spelled out. A reader who follows the
instructions and gets 19 where the book says 17 will conclude they did it wrong, or that
their Icarus differs. The *lesson* (0 = unlimited, 1 = this scope, n = n levels, and a
subtree selection) is unaffected and correct.

There is a second-order inconsistency worth fixing at the same time: the table's lead-in
describes the design as three scopes deep and names only `tb_dump`, `u_pipe`, `u_a`, `u_b`,
while the prose two paragraphs later correctly says named blocks become scopes. The
`dumpctl` and `watchdog` scopes are the reason the count moved, so the description should
name them.

**Fix:** re-run the four invocations against the current `tb_dump.v`, replace the four
counts with 19 / 6 / 13 / 10, and extend the lead-in to mention the `dumpctl` and
`watchdog` named-block scopes. Add the invocation used (`vvp sim +dump=… +depth=N`) so the
measurement is reproducible.

### B2. The Makefile passes a broken DUT, and the chapter's own gate demonstration is a no-op as sequenced

Two coupled faults in a Makefile the chapter presents as the regression the rest of the book
will be built on ("This Makefile, `targets.txt` and `run_all.sh` are the regression the
adder will be developed against").

**B2a — missing prerequisite.** `$(BUILD)/%.vvp: %.v | $(BUILD)` lists only the testbench.
The DUT arrives through `-y .`, which `make` cannot see. Measured: I changed `adder8.v` from
`a + b` to `a - b` — breaking the device under test that `tb_stimulus`, `tb_vectors` and
`tb_check` all instantiate — and ran `make`:

```
make: Nothing to be done for `all'.
EXIT=0
```

The same tree from clean gives exit 2, and `run_all.sh` gives 12 passed / 2 failed. A
regression harness that reports success on a broken DUT is the precise failure the chapter
is written to prevent.

**B2b — cached results.** `$(BUILD)/%.log` is a file target, so once it exists and is newer
than its `.vvp`, the test does not run again. `make; make` executes **zero** tests the
second time. Worse, `PLUSARGS` is not part of any prerequisite, so the chapter's
centrepiece demonstration fails when performed in the order the prose gives it:

```
$ make                       # "Run it and all fourteen tests go green"
$ make -k PLUSARGS=+break    # "prove the failure gate actually fires"
make: Nothing to be done for `all'.
EXIT=0
```

From a clean tree it works correctly (exit 2, transcript reproduces exactly), but the
chapter never tells the reader to clean first. The section ends "a gate that has never
fired is one you trust on faith" — and as written, the reader's gate never fires.

**Fix (all three parts):**

1. Add the DUT sources as prerequisites. Simplest correct form, given `-y .`:
   ```make
   SRCS := $(wildcard *.v)
   $(BUILD)/%.vvp: %.v $(SRCS) | $(BUILD)
   ```
   Coarse but honest — any `.v` change rebuilds everything, which for fourteen
   two-second tests is free. `iverilog -M` depfile generation is the precise alternative if
   the chapter wants to teach it.
2. Make the run depend on the plusargs, so changing them re-runs. Either add
   `PLUSARGS` to a `.log` prerequisite via a stamp file, or make the `%.log` rule
   `.PHONY`-equivalent by having `test` depend on order-only-free phony run targets.
3. If results are to stay cached, say so in the prose and put `make clean` in front of the
   `PLUSARGS=+break` instruction. Whichever route is taken, the paragraph claiming the gate
   fires must match a command sequence that actually fires it.

### B3. `tb_dump.v` asserts a latency it does not test

Full evidence in *Testbench craft audit*. Summary: the shipped `tb_dump.v` prints
`PASS tb_dump (latency 2, q=17)` against a `pipe2` I rebuilt with a single flip-flop,
because its only check runs after the stimulus has drained and therefore cannot distinguish
latency 1 from latency 2. The four-line in-stream check given in that section catches
latency 1 and latency 3 and passes the real design; I ran all three cases.

Blocking because the asserted property is the one the chapter's waveform figure, its
finger-counting exercise and its chapter-11 seed all rest on, nothing else verifies it, and
the chapter's own standard is that a check must compare the thing it claims.

### B4. The `$dumpfile` extension claim is false

Chapter, opening of "Dumping Waveforms":

> Icarus appends the extension itself if you omit it, so `$dumpfile("tb.vcd")` under
> `-fst` produces `tb.vcd.fst` — either always give the extension or never.

Measured, one clean directory per case:

| `$dumpfile` argument | dumper flag | file actually produced |
|---|---|---|
| `"tb.vcd"` | *(default)* | `tb.vcd` |
| `"tb.vcd"` | `-fst` | **`tb.vcd`** |
| `"tb"` | *(default)* | `tb.vcd` |
| `"tb"` | `-fst` | `tb.fst` |
| `"tb.fst"` | `-fst` | `tb.fst` |

`tb.vcd.fst` is never produced. The first clause is right — Icarus does append an extension
when the name has none — but the conclusion drawn from it is wrong, because `"tb.vcd"` does
not omit an extension. The writer conflated *omitting* an extension with *giving the wrong
one*.

The real behaviour is a nastier trap than the one described, which is why this is worth
correcting rather than deleting: `$dumpfile("tb.vcd")` under `-fst` gives you a file in FST
format wearing a `.vcd` name. Nothing warns you, and any tool or human that trusts the
extension is now wrong about the file's contents. The chapter's advice — "either always give
the extension or never" — survives intact and is if anything better motivated by the true
behaviour.

**Fix:** replace the sentence with the measured rule (Icarus appends an extension only when
the name has none; a name that already carries an extension is used verbatim, so `-fst`
with `"tb.vcd"` writes FST content into `tb.vcd`) and keep the closing advice.

## Non-blocking issues

**N1. The `iverilog` exit-code mapping is wrong for the commonest elaboration errors.**
Chapter, "Automating the Build": "`iverilog` gives 0 on success, 1 on elaboration errors and
**2 on syntax errors**". Measured:

| condition | exit |
|---|---|
| success | 0 |
| syntax error | 2 |
| unknown module type | **2** |
| unknown identifier in an expression | **2** |
| duplicate module definition | **2** |
| unknown port name in a connection | 1 |
| missing / unreadable source file | 1 |

So exit 1 is real, but the stated split does not hold: the two canonical elaboration errors
give 2, exactly like a syntax error. The `vvp` half of the same sentence is entirely correct
(0 normal/`$finish`, 1 for `$fatal`, 1 for the memory-dump load error, 1 for `$stop` under
`-N`) and I verified every one. *Fix:* say that `iverilog` returns 0 on success and non-zero
on any error, with 2 for syntax and most elaboration errors and 1 for a bad port connection
or an unreadable file — or drop the breakdown and keep only the `vvp` codes, which is what
the build gate actually depends on. Nothing in the Makefile or `run_all.sh` distinguishes 1
from 2, so no code is affected.

**N2. A third non-contiguous transcript is undeclared.** The `tb_strobe` block shows real
output lines 5–12 and then the verdict, dropping lines 13–16 (`t=30000` and `t=35000`) with
no marker, while the lead-in promises nothing about selection. The visible consequence is
that the verdict reads `PASS tb_strobe (4 edges where $display saw the old q)` while only
**two** disagreeing edges are on the page; the other two are at `t=5000` (`q=x` against
`q=0`) and `t=35000`. This is the same defect the chapter 3 review round 2 caught ("restored
a `t=60` row silently dropped at a transcript join"). *Fix:* either show the full 17-line run
— it is short — or declare the selection in the lead-in the way `tb_random` and `tb_print`
do, and say where the other two disagreements are so the "4" is checkable.

**N3. `tb_random.v` still carries the pre-correction claim in a comment.** Lines 50–51:

```verilog
    // The seed argument is an inout: it must be a variable, and it is updated
    // in place. A literal is a compile error.
```

Research correction 3 — which the chapter and the README both state correctly — is that a
literal seed is *not* a compile error: `iverilog` exits 0 and `vvp` rejects it at load time.
The shipped source contradicts the chapter it ships with. Given that this run has twice
made a point of propagating corrections back into the research notes so later chapters do
not re-seed the error, leaving it in the source file is a miss. *Fix:* change the comment to
"a literal is accepted by `iverilog` and rejected by `vvp` at load time."

**N4. The FST size table gives no reproduction command.** The four-row table is correct and
the design *is* characterised in the following sentence ("a counter and its delayed
copies"), which discharges the main "a ratio is meaningless without the design" objection.
But the run is never named, so reproducing it requires inferring `+cycles=100000` from a
comment inside `tb_dump.v`. *Fix:* add the command
(`vvp sim.vvp +dump=/tmp/w.vcd +cycles=100000`, then the same with `-lxt2`, `-fst`,
`-fst-space`) as a lead-in line.

**N5. The `$monitor` single-slot claim has no transcript.** The chapter states that
`bad_monitor.v` prints only `B:` lines "with no diagnostic whatsoever" but shows no output,
which makes it the only trap in the chapter asserted without visible evidence. I verified it
— **0 `A:` lines, 6 `B:` lines**, no diagnostic — so the claim is true. *Fix:* add the
two-line transcript; it costs almost nothing and this is one of the more surprising claims
in the chapter.

**N6. `make lint` lints one file, but the README implies the suite.** The target is
`iverilog … -t null -s tb_anatomy tb_anatomy.v`, while `README.md` documents it as
`make lint  # elaborate only, no simulation`. *Fix:* either loop the target over `$(TESTS)`
or retitle it in the README as a demonstration of `-t null` on a single file.

**N7. `s_rmf.v` is quoted but not shipped.** The missing-file `$readmemh` transcript comes
from a throwaway module that is not in `src/ch04/`, so it is outside the harness and a
reader cannot re-run it. It does reproduce — I rebuilt the file from the chapter's
description and got byte-identical output, line number included — but the chapter's closing
note says every listing is a file in `src/ch04/`. *Fix:* either ship it as a target or note
in the lead-in that it is a throwaway.

**N8. The README's seed-error block omits the real `file:line:` prefix.** It shows
`ERROR: $urandom's seed must be an integer/time variable or a register.` as a fenced
transcript; the actual line is `ERROR: <file>:<line>: $urandom's seed must be …`. Trivial,
but the guide's standing rule is that fenced output blocks are verbatim.

**N9. The `x` region in the timing figure is drawn identically to a valid `00`.** In the `q`
row the first segment (`t=5..15`) is genuinely `x` and the second (`t=15..25`) is `00`, and
both render as blank. The transition between them *is* drawn, so the figure is not wrong.
But the section three paragraphs later tells the reader "check the very beginning: before
reset releases `x` is legitimate, afterwards it is not" — the figure is the natural place to
show what an `x` region looks like. *Fix:* put `x` in the first segment.

**N10. "Horizontal distance … two cycles" is exact only if you count cycle labels.** The raw
column distance from `d`'s `10` (cols 5–14) to `q`'s `10` (cols 20–29) is 15 columns = 1.5
clock periods, because `d` is driven on the negedge, half a period before the edge that
captures it. Counting the cycle ruler, or counting posedges crossed, gives 2 — which is what
the figure's ruler invites, so the sentence is defensible. *Fix (optional):* say "count the
rising edges between the value on `d` and the same value on `q`: two" to remove the
ambiguity.

**N11. Minor source-quoting slips.** The body quotes `surfer: stable 0.7.0 (bottled)` where
`brew info` prints `==> surfer: stable 0.7.0 (bottled), HEAD`; and the body says Surfer reads
"VCD, FST and GHW" (matching `surfer --help`) while its own citation 7 says "VCD, FST, GHW
and FTR". Both are inline prose, neither is a fenced transcript, and the `--help` figure is
the right one to quote — worth one pass for consistency only.

**N12. `tb_anatomy.v` dumps a 2048-bit string into its own waveform.** `reg [8*256-1:0]
dumpfile;` sits at module scope, so `$dumpvars(0, tb_anatomy)` records it. `tb_dump.v` and
`bad_dumparray.v` put the same variable inside a named block. Moving it into a named block
makes the three files consistent, and it interacts directly with B1's depth counts.

### Things I checked that are correct and worth keeping

These were on my list to attack and survived; recording them so a fix round does not
disturb them.

- **Chapter 5 boundary: clean, and unusually disciplined.** `constrained` appears 0 times.
  `coverage` (3), `assertion` (1), `scoreboard` (2) and `corner case` (1) occur only inside
  `> **Seed for …**` callouts, the opening paragraph that explicitly defers methodology, and
  the Bridge. The chapter twice names a technique and then refuses to teach it — "That is a
  *mechanic*, not a methodology; turning it into a scoreboard … is chapter 5's job". No leak.
- **Cross-references: zero positional.** A scan for "the next/previous/following section",
  "as we saw", and the rest returns nothing. Every reference is by quoted section title, and
  all three chapter-3 titles resolve to real `##` headings in `ch03.md`
  (`Simulation Artifacts That Will Cost You an Evening`, `Reset Strategy`, `How a Simulator
  Actually Runs Your Code`), as do both intra-chapter ones. `bad_clkinit.v` and
  `bad_tbedge.v` both exist in `src/ch03/`.
- **Citations: no invented or upgraded URLs.** Seven URLs, all either fetched-and-verified or
  quoted inside captured `brew` output. Unlinked sources sit under an explicit "By title (no
  link asserted)" heading — the literal `[title-only]` tag appears in none of chapters 2, 3
  or 4, so this is house practice, not a deviation.
- **The GTKWave section is precise in both directions**, which was the hardest thing in the
  chapter to get right. I re-queried the GitHub API: `archived: false`, `disabled: false`,
  `GPL-2.0`, last commit **2026-04-18** ("Fix build on Hurd (#510)"), last push
  **2026-07-23**, highest tag **v3.3.116**, and exactly one release object — tag `nightly`,
  `prerelease: true`. Every figure in the chapter matches. `brew info --formula gtkwave`
  confirms there is no core formula ("Found a cask named gtkwave instead"). The chapter
  neither declares the project dead nor tells the reader to run a command that fails.
- **Every GUI claim is flagged.** The `> **Icarus reality.**` callout states plainly that no
  scriptable viewer exists here and that everything following about clicking, zooming,
  colours or menus is documentation. I verified the specifics: `surfer server --help` lists
  exactly `--port`, `--bind-address`, `--token`, `--file`; `surfer --help` has no render or
  batch mode; and `--command-file`'s own help says "This feature is not permanent". The
  figure is explicitly labelled a drawing, not a screenshot.
- **The timing figure is correct.** Column-audited mechanically against a real VCD, as
  STATE.md requires. Every segment boundary lands on the right nanosecond: `d`=10 over
  t=10–20, `mid`=10 over t=15–25, `q`=10 over t=25–35, clock high t=5–10. Label fields are a
  uniform 8 characters. No drawing error.
- **Duplication with chapters 2 and 3: building, not repeating.** `iverilog`/`vvp` options
  are introduced as "four options **beyond** chapter 2's `-g2012 -Wall -o`"; format
  specifiers explicitly defer to chapter 2 and the chapter adds only the two that mislead,
  asserted with `$sformat`; the event regions are credited to chapter 3 by title. The one
  genuine overlap is the `$display`/`$strobe` region distinction, which chapter 3 already
  states and demonstrates — but chapter 4's version uses a different DUT, *asserts* the
  disagreement rather than illustrating it, and adds the `$monitor` single-slot trap, so it
  earns its place. Worth a tightening pass at F1, not a fix round.
- Word count **9000 exactly**, 13 `##` sections, both as claimed. Callouts use the mandated
  forms (3 `Trap`, 1 `Icarus reality`, 6 `Seed for`).

## Required changes for a 9+

Ordered by cost of getting it wrong. Items 1–4 close the blocking defects; 5–7 are the
non-blocking items whose absence would still cost a careful reader time.

1. **Re-measure the `$dumpvars` depth table against the shipped `tb_dump.v`.** Replace
   17/5/11/10 with **19/6/13/10**. Extend the table's lead-in to name the `dumpctl` and
   `watchdog` named-block scopes alongside `tb_dump`/`u_pipe`/`u_a`/`u_b`, since those are
   what the counts moved on, and state the invocation used
   (`vvp sim.vvp +dump=/tmp/w.vcd +depth=N`) so a reader can reproduce it. Verify by counting
   `^\$var` lines in each of the four dumps.

2. **Fix the Makefile's dependency graph, then fix the prose that depends on it.** Three
   parts, all required:
   - Add the DUT sources as prerequisites so a broken DUT rebuilds and fails. With `-y .` in
     play the honest form is `SRCS := $(wildcard *.v)` and
     `$(BUILD)/%.vvp: %.v $(SRCS) | $(BUILD)`; `iverilog -M` depfiles are the precise
     alternative if the chapter wants to teach dependency generation.
   - Make a `PLUSARGS` change re-run the tests, or the gate demonstration stays a no-op on a
     warm tree.
   - Change the prose so the command sequence it gives actually fires the gate — either put
     `make clean` in front of `make -k PLUSARGS=+break`, or note that results are cached.
     Re-verify with the exact sequence the chapter prints: `make`, then
     `make -k PLUSARGS=+break`, and confirm exit 2.
   Regression-test the fix by reverting `adder8.v` to `a - b` and confirming `make` now
   fails without a `make clean`.

3. **Correct the `$dumpfile` extension claim.** Icarus appends an extension only when the
   name has none; a name that already has one is used verbatim, so `$dumpfile("tb.vcd")`
   under `-fst` writes **FST content into a file called `tb.vcd`** — which is a better
   motivation for the existing "always give the extension or never" advice than the current
   wrong example. Keep the advice, replace the mechanism and the example.

4. **Make `tb_dump.v` actually test the latency it prints.** Move the check inside the
   stimulus loop so it runs while the pipe is full:
   ```verilog
         @(negedge clk) d <= 8'h10 + cyc[7:0];
         if (cyc >= 2 && q !== 8'h10 + (cyc[7:0] - 8'd2)) begin
           errors = errors + 1;
           $display("FAIL tb_dump: cyc=%0d q=%02h expected %02h",
                    cyc, q, 8'h10 + (cyc[7:0] - 8'd2));
         end
   ```
   Verified: catches a one-stage and a three-stage `pipe2`, passes the real one. Keep the
   existing drain check as well. Then re-capture any transcript that quotes `tb_dump`, and
   note that this changes nothing in the depth table, which counts variables, not behaviour.

5. **Declare or complete the `tb_strobe` transcript** so the "4 edges" verdict is checkable
   from what is on the page — show the full 17-line run, or declare the selection in the
   lead-in as `tb_random` and `tb_print` already do.

6. **Correct the `iverilog` exit-code sentence.** The commonest elaboration errors return 2,
   not 1; exit 1 belongs to a bad port connection and an unreadable source file. Simplest
   safe rewrite: 0 on success, non-zero on any error, with the `vvp` codes — which are all
   correct as printed — kept as the memorisable set, since those are what the build gate
   uses.

7. **Propagate correction 3 into `tb_random.v`.** The comment "A literal is a compile error"
   contradicts the chapter, the README and the measurement. While in that file, add the
   two-line `bad_monitor` transcript (N5) and the FST reproduction command (N4), which are
   the two other places a reader is asked to take a claim on trust.

Nothing in this list requires new research, and none of it threatens the parts of the
chapter that are already strong — the listings, the GTKWave and Surfer sourcing, the timing
figure, the severity table, the edge discipline and the chapter-5 handoff all stand as
written.
