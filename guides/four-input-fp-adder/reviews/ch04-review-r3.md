# Chapter 4 — Simulation, Testbenches and Waveforms — review round 3

<!-- sections complete: 8/8 -->

Reviewer: RTL veteran, third and final pass. Round 1 scored 6/10, round 2 scored 7/10.
Everything below was run on this machine with Icarus Verilog 13.0 (stable, `v13_0`),
macOS 24.6.0 arm64, GNU Make 3.81. The shipped tree was left byte-identical; the whole
mutation campaign ran on copies in a scratch directory.

## Verdict

**Score: 7/10**

Fix round 2 closed every one of round 2's seven remaining defects and both of its
fix-round defects, and the verification underneath this chapter is now the strongest in the
project — four FST byte counts that reproduce to the byte, a `$dumpvars` depth table that
reproduces exactly, seven listings byte-identical to disk, every transcript re-running
unchanged, four watchdogs that all fire on a dead clock, and fifty-three independent
mutations in which not one golden value proved dead. Against that, the paragraph the fix
round wrote to certify its own headline fix contains a false claim: the thirteenth `pipe2`
mutant is presented as provably undetectable and as "an equivalent mutant, not a hole", and
it is neither — I killed it from the port alone, with no hierarchical reference, simply by
moving the stimulus into the high phase, which drops its observable latency from two cycles
to one. Two smaller measured statements are also wrong — plain `make` recompiles eight
binaries after a broken `adder8`, not fourteen, and the `bad_dumparray.v:29` transcript is
stale at `:32` because the fix round added three comment lines to that file and did not
re-run it — so this is three real defects, one of which teaches a wrong lesson about
mutation testing in the chapter that bridges to the coverage chapter.

## Status of round-2 defects

Round 2 left seven remaining defects (R1–R7) and named two of its own (D1, D2). All nine
are closed. Evidence below; every command was re-run rather than taken on the fix round's
word.

### R1 (blocking) — `tb_dump` blind by half a cycle — **CLOSED**

`tb_dump.v` gained a concurrent `always @(q)` that requires `clk === 1'b1` at every change
of `q`. I rebuilt `pipe2` fourteen ways and the whole R1 family now dies:

| rebuild of `pipe2` | round 2 | now |
|---|---|---|
| second flop alone on `negedge` | PASS | **FAIL** |
| both flops on `negedge` | PASS | **FAIL** |
| single `negedge` flop | PASS | **FAIL** |
| dual-edge flops (`posedge or negedge`) | PASS | **FAIL** |
| stage 2 a real transparent latch (`@(clk or mid)`) | — | **FAIL** |
| stage 1 a low-transparent latch | — | **FAIL** |
| three stages, `neg`/`pos`/`neg` | — | **FAIL** |

The false sentence round 2 flagged as D1 ("with a flip-flop on the wrong clock edge, fails
it four times out of four") is gone, replaced by the thirteen-mutant list. The check itself
is sound and produces no false failures — see *Watchdog and timeout verification*. The
replacement paragraph, however, carries a new false claim; see **N1**.

### R2 (blocking) — `adder8`'s carry-out verified by nothing — **CLOSED**

`tb_stimulus.v`'s `drive` task now takes `input expected_cout`, and three vectors exist only
for the carry (`ff+01`, `80+80`, `7f+01`). Re-measured independently:

```
A1  cout tied 1'b0        pass=13 fail=1   killed by tb_stimulus
A2  cout tied 1'b1        pass=13 fail=1   killed by tb_stimulus
A3  cout inverted         pass=13 fail=1   killed by tb_stimulus
```

All three were 14/14 green before. The related note ("an inverting `dff` also passes all
14") is closed too: `tb_strobe` now pins `settled_q` against `d`, and `q <= ~d` fails it.
Nulling that one comparison puts the inverting flop back to 14/14 green, which confirms it
is the sole tester. Residual coverage gap, not a false claim — see *Remaining defects*.

### R3 (blocking) — `tb_dump`'s watchdog cannot fire on a dead clock — **CLOSED**

The edge-counted watchdog became an independent `initial` with an absolute
`#((limit + 20) * 10)`. Both halves of the round-2 claim reproduce exactly:

```
old form, reg clk;  -> rc=137, wall=8.0s, stdout=[]          (had to be killed, printed nothing)
new form, reg clk;  -> FAIL tb_dump: timeout at 280000, the test never finished
                       FATAL: tb_dump.v:61: timeout   rc=1, wall=0.03s
```

The scaling is right as well: `+cycles=100000` with a dead clock times out at `1000200000`
and with a live clock finishes at `1000020000` — 18 cycles of headroom, positive at every
run length because both sides are linear in `+cycles`. `tb_strobe`, which round 2 correctly
noted had a clock and no watchdog at all, now has a `#200` one; `tb_anatomy` was already
time-based. All four clocked testbenches verified in the next section.

### R4 (minor) — `$(DATA)` described as load-bearing — **CLOSED**

Chapter line 591 now reads: "(`$(DATA)` on the run rule is belt and braces: `FORCE` already
makes every run out of date, and a data file never enters a compile at all.)" That is
accurate, and the Makefile comment at lines 32–36 says the same. D2 is the same item and is
closed with it.

### R5 (minor) — the `iverilog` exit-code sentence — **CLOSED**

Chapter line 612 now says *either* for an unknown identifier and explains the split.
Re-measured, all seven rows:

```
syntax error                  2      bad port name                 1
unknown module type           2      unreadable file               1
duplicate module              2      -t null, good source          0
unknown id, continuous assign 2      -t null, syntax error         2
unknown id, procedural        1
```

Matches the chapter exactly, including its conclusion "do not read a category out of the
number". `$fatal(0)`, `$fatal(1)` and `$fatal(2)` all exit 1, as claimed.

### R6 (minor) — `tb_stimulus` demonstrated a distinction it could not test — **CLOSED**

The intra-assignment right-hand side is now the variable `src`, which changes to `8'h99` at
t=25 in the middle of the delay. Swapping the two delay forms is now caught:

```
FAIL tb_stimulus: change 3 was {30, 99}, expected {30, 20}
```

### R7 (cosmetic) — `bad_dumparray.v` lacked its siblings' disclaimer — **CLOSED**

The file now carries "The PASS checks the contents and nothing else: delete the per-word
`$dumpvars` above and this file still passes. The evidence for the invisibility is the VCD".
That is exactly the missing sentence. It is also the direct cause of **N3** — the three added
comment lines moved the `$dumpvars` call from line 29 to line 32 and the quoted transcript
was not re-run.

### D1 / D2 — **CLOSED**

D1's false sentence is gone (see R1). D2 is R4.

## Independent mutation campaign

Method: a pristine copy of `src/ch04` plus a copy of `run_all.sh` in a scratch directory.
Each mutation overwrites exactly one file in a fresh copy, then runs all fourteen manifest
targets and is scored on `rc != 0` or `FAIL` in the output. I did not reuse the fix round's
list; where a mutation coincides with one of theirs it is marked *(repro)*.

**60 suite runs — 53 mutations, 5 baselines, 2 deliberate equivalence controls — 840 target
runs.** Every baseline and both equivalence controls came back 14/0, so the scoring
mechanism itself is sound.

### `adder8` — 9 mutations, 7 caught, 2 survive

```
A0  baseline                                   pass=14 fail=0  SURVIVED (control)
A1  cout tied 1'b0                    (repro)  pass=13 fail=1  tb_stimulus
A2  cout tied 1'b1                    (repro)  pass=13 fail=1  tb_stimulus
A3  cout inverted                     (repro)  pass=13 fail=1  tb_stimulus
A4  cout = a[7] | b[7]                  *NEW*  pass=14 fail=0  ***SURVIVED***
A5  cout = a[7] & b[7]                  *NEW*  pass=13 fail=1  tb_stimulus
A6  cout = a[7] ^ b[7]                  *NEW*  pass=13 fail=1  tb_stimulus
A7  cout = carry into bit 7             *NEW*  pass=13 fail=1  tb_stimulus
A8  cout = ~sum[7] & (a[7] | b[7])      *NEW*  pass=14 fail=0  ***SURVIVED***
A9  {cout,sum} = a - b                (repro)  pass=12 fail=2  tb_stimulus, tb_vectors
```

Two carry functions survive the whole regression after the fix round's three carry vectors.
Both are non-equivalent, and both are the shapes a beginner actually writes:

- **A4** is wrong on any pair with one top bit set and no wrap — `a=80, b=00` gives
  `cout=1` where the truth is 0. The six vectors in `tb_stimulus` are
  `01+02, 02+02, 03+02, ff+01, 80+80, 7f+01`; on every one of them `a[7]|b[7]` happens to
  agree with the real carry.
- **A8** is wrong only when both top bits are set *and* there is a carry into bit 7 —
  `ff+ff` or `c0+c0`. The chapter's "two set top bits" vector is `80+80`, whose lower halves
  are zero, so no carry reaches bit 7 and the mutant agrees.

The sting: `ff+ff` is already vector 8 of `vectors.hex`, and `tb_vectors.v` connects `cout`
and never reads it. `tb_check.v` declares `good_cout` and `bad_cout` and never reads either.
So the chapter's own line — "An output that nothing reads is an output that nothing tests" —
still applies to two of the three testbenches that instantiate `adder8`.

### `pipe2` — 14 mutations + 2 equivalence controls, 11 caught, 3 survive

```
P0  baseline                                   pass=14 fail=0  SURVIVED (control)
P1  u_a NEGedge, u_b posedge          (repro)  pass=14 fail=0  ***SURVIVED***
P2  u_b NEGedge only                  (repro)  pass=13 fail=1  tb_dump
P3  stage 2 clk-to-Q  q <= #1 mid       *NEW*  pass=14 fail=0  ***SURVIVED***
P4  stage 2 clk-to-Q  q <= #4 mid       *NEW*  pass=14 fail=0  ***SURVIVED***
P5  stage 2 clk-to-Q  q <= #6 mid       *NEW*  pass=13 fail=1  tb_dump
P6  P1 written with blocking mid        *NEW*  pass=14 fail=0  ***SURVIVED*** (= P1)
P7  stage 2 @(clk) if (clk) qr = mid    *NEW*  pass=14 fail=0  SURVIVED (equivalent, see below)
P9  q bit 0 stuck at 0                  *NEW*  pass=13 fail=1  tb_dump
P10 q bits rotated                      *NEW*  pass=13 fail=1  tb_dump
P11 stage 2 REAL transparent latch      *NEW*  pass=13 fail=1  tb_dump
P12 stage 1 low-transparent latch       *NEW*  pass=13 fail=1  tb_dump
P13 both stages negedge               (repro)  pass=13 fail=1  tb_dump
P14 three stages neg/pos/neg            *NEW*  pass=13 fail=1  tb_dump
P15 assign q = qi ^ 8'h00               ctrl   pass=14 fail=0  SURVIVED (truly equivalent)
P16 identity-guarded ternary            ctrl   pass=14 fail=0  SURVIVED (truly equivalent)
P17 one wrong value, 0x13 -> 0x99       *NEW*  pass=13 fail=1  tb_dump
```

P7 is equivalent by accident of my own writing — `@(clk)` without `mid` in the sensitivity
list samples `mid` in the active region at the posedge, which is what an NBA flop does. P11
is the real latch and it dies. P15 and P16 are deliberate no-ops and correctly survive.

**P3 and P4 are a genuine new hole.** `q <= #4 mid` moves `q` four nanoseconds after the
rising edge, in the middle of the 5 ns high phase. The concurrent check asks whether `clk`
is *high*, not whether the change happened *at* the edge, so anything in the 1–4 ns window
passes; `#6` lands after the falling edge and dies. This matters because chapter line 495
states the property as "`q` … changes … *only* on rising edges, which is the property
`tb_dump.v`'s second check pins". The check pins the weaker property. Within strict
zero-delay RTL this cannot arise, and the file's own comment reasons from exactly that
assumption — but the chapter's sentence does not carry the assumption.

### The claimed-undetectable mutant (P1) — the claim is false

The chapter, line 360:

> The thirteenth cannot fail and should not — moving the *first* flop to the falling edge
> leaves `q`'s transitions bit-identical to the real design, and a testbench sees only the port.

and `src/ch04/README.md`, line 115:

> Its `q` transitions are bit-identical to the real design's — verified by comparing VCD
> transition times — so it is **an equivalent mutant, not a hole**.

The transition times *are* bit-identical, and I reproduced that: with `tb_dump.v`'s stimulus
(`@(negedge clk) d <= …`, non-blocking) both designs move `q` at 15 ns, 25 ns, 35 ns …
That part of the measurement is honest. The **generalisation from it is wrong**, in two
independent ways.

**1. It is killable from the port alone.** Nothing about the port is limiting; the limiting
thing is that this file only ever moves `d` on the falling edge. Drive `d` two nanoseconds
after the rising edge instead — a legitimate black-box probe of *which* edge the DUT
samples — and the two designs separate immediately. Same DUT ports, same clock, `q`
observed and nothing else:

```
=== real pipe2 ===            === mutant (u_a on negedge) ===
  q -> 00 at t=15000            q -> a0 at t=15000
  q -> a0 at t=25000            q -> a1 at t=25000
  q -> a1 at t=35000            q -> a2 at t=35000
  ...                           ...
```

The real design shows a latency of two rising edges; the mutant shows one. That is exactly
the property the chapter's own ASCII figure draws and the chapter-11 seed depends on, and it
is visible on `q` with no hierarchical reference of any kind. An equivalent mutant is one no
input can distinguish. This one is distinguished by a change of stimulus phase, so it is not
equivalent — it is a hole in this file's stimulus, which is a different and much more
teachable thing.

**2. "A testbench sees only the port" is not true of Verilog**, and this chapter is the one
that shows why: it writes `$dumpvars(0, tb_dump.u_pipe)` and prints a VCD containing `mid`.
Keeping the shipped stimulus untouched and adding one hierarchical `always` block kills the
mutant on the spot:

```verilog
  always @(u_pipe.mid)
    if (clk !== 1'b1) begin
      errors = errors + 1;
      $display("FAIL tb_dump: mid moved at t=%0t with clk=%b", $time, clk);
    end
```

```
[REAL pipe2]           PASS tb_dump (latency 2, q=17)
[MUTANT u_a negedge]   FAIL tb_dump: mid moved at t=10000 with clk=0
                       FAIL tb_dump: mid moved at t=20000 with clk=0
```

There is also an engineering objection to "and should not". `u_a` on `negedge` feeding `u_b`
on `posedge` is a **half-cycle path** — a real design bug that costs timing closure in
silicon. Telling a reader a testbench *should not* catch it is bad advice independent of
whether this one does.

This is recorded as **N1**.

### `dff` — 8 mutations, 8 caught

```
D1  q <= ~d                (repro)  pass=13 fail=1  tb_strobe
D2  q = d  (blocking)      (repro)  pass=12 fail=2  tb_strobe, tb_dump
D3  negedge                (repro)  pass=12 fail=2  tb_strobe, tb_dump
D4  q <= d + 1               *NEW*  pass=12 fail=2  tb_strobe, tb_dump
D5  q <= #1 d                *NEW*  pass=13 fail=1  tb_strobe
D6  q <= {d[6:0], d[7]}      *NEW*  pass=12 fail=2  tb_strobe, tb_dump
D7  q <= d & 8'hfe           *NEW*  pass=12 fail=2  tb_strobe, tb_dump
D8  posedge or negedge       *NEW*  pass=13 fail=1  tb_dump
```

Clean sweep. Note D5 (`q <= #1 d`) dies in `tb_strobe` — `$strobe` at the posedge no longer
sees a changed `q`, so the disagreement count falls to 0 — even though the same delay
survives inside `pipe2` (P3). The two files cover different halves.

### `counter4` — 7 mutations, 5 caught, 2 survive

```
C1  q <= q + 2               *NEW*  pass=13 fail=1  tb_anatomy
C2  ignores en               *NEW*  pass=13 fail=1  tb_anatomy
C3  reset to 4'd1            *NEW*  pass=13 fail=1  tb_anatomy
C4  ASYNCHRONOUS reset       *NEW*  pass=14 fail=0  SURVIVED
C5  negedge counter          *NEW*  pass=13 fail=1  tb_anatomy
C6  en given priority over reset *NEW*  pass=14 fail=0  ***SURVIVED***
C7  counts down              *NEW*  pass=13 fail=1  tb_anatomy
```

**C6** is a real bug that survives: `if (en) q <= q + 1; else if (!rst_n) q <= 0;` inverts
reset priority. `tb_anatomy.v` never asserts reset while `en` is high (`en` is set to 0
alongside `rst_n`), so the case is never exercised. **C4** (async instead of the synchronous
reset chapter 3 chose) also survives, because reset is released on a falling edge where the
two behave identically. Neither is a false claim in the chapter — `tb_anatomy` is presented
as a shape, not as a complete test of `counter4` — but both are worth knowing.

### Testbench golden values — 11 mutations, 11 caught

This is the check the task asked for specifically: a comparison that agrees with a wrong
expected value. **Not one dead golden value in the chapter.**

```
T1  tb_dump loop expects cyc-1 not cyc-2   killed   T7  tb_period expects 6 ns from the 1ps clock  killed
T2  tb_dump drain expects ncyc-2           killed   T8  tb_random wrong asserted $random[0]        killed
T3  tb_strobe expects 3 disagreements      killed   T9  tb_print wrong %d padding expectation      killed
T4  tb_check expects 2 mismatches          killed   T10 tb_anatomy expects q=6 after 5 cycles      killed
T5  tb_stimulus wrong cout on ff+01        killed   T11 bad_readmem expects a correct load         killed
T6  tb_stimulus wrong sum on 7f+01         killed
```

Every one produced a `FAIL` line and `rc=1` from the file that owns the value. `T5` in
particular confirms the new carry expectations are live rather than decorative.

### Vacuous-check probes — 4, all confirm sole ownership

Nulling each new check to a tautology and re-running shows nothing else in the chapter
covers the same ground, which is what the chapter claims:

```
V1  tb_strobe settled-value check nulled   pass=14 fail=0   (the inverting dff returns to green)
V2  tb_dump always@(q) clk check nulled    pass=14 fail=0
V3  tb_dump in-loop value check nulled     pass=14 fail=0
V4  tb_stimulus cout comparison removed    pass=14 fail=0
```

### Data files — 6 mutations, 3 caught, 3 survive

```
H1  vectors.hex: one wrong expected sum       killed by tb_vectors
H2  vectors.hex: truncated to 7 vectors       ***SURVIVED***
H3  vectors.hex: comments only, empty load    killed by the load guard
H4  vectors.hex: a 9th vector appended        SURVIVED (a WARNING, not a FAIL)
H5  vectors_bad.hex perturbed past word 4     SURVIVED (correct: bad_readmem checks words 0-3)
H6  bad_adder8 changed to a + b               killed by tb_check
```

**H2 is the interesting one.** A truncated file prints a warning the runner ignores and then
a green verdict that names a count it did not test:

```
WARNING: tb_vectors.v:43: $readmemh(vectors.hex): Not enough words in the file for the requested range [0:7].
PASS tb_vectors (8 vectors, 0 errors)
```

`vec[7]` stays `24'hxxxxxx`, so `{a,b}` is `x`, `sum` is `x`, `want` is `x`, and
`(x !== x)` is **false** — the untouched slot passes silently. The chapter's own wording is
precise ("it must check that it got **any**") and the guard does check that, but the seed
for chapters 9 and 12 ("a silent empty load in a 10,000-vector regression looks exactly like
a clean pass") sells the guard as covering more than it does: it catches *none loaded*, not
*not all loaded*, which is the failure a growing vector file actually produces. Listed under
*Remaining defects* as a gap, not a false claim.

### Restoration

The shipped tree was never mutated — the whole campaign ran on copies. Confirmed at the end:
`shasum -a 256 ch04/* run_all.sh` over all **25 files** is byte-identical to the manifest
taken before any work started, and `find` shows no build artifact anywhere under
`guide/src`.

## Watchdog and timeout verification

### Per testbench, clock actually killed

Four of the fourteen targets have a clock. For each I replaced `reg clk = 1'b0;` with
`reg clk;` in a scratch copy — the chapter's own trap, row 5 of its traps table — and ran
under an external 10 s alarm. **All four fail with a diagnostic; none hangs.**

| testbench | watchdog | result with a dead clock | wall |
|---|---|---|---|
| `tb_anatomy` | `#10000` in its own `initial` | `FAIL tb_anatomy: timeout at 10000000, the test never finished` / `FATAL` / **rc=1** | 0.03 s |
| `tb_strobe` | `#200` in its own `initial` (**new**) | `FAIL tb_strobe: timeout at 200000, the test never finished` / `FATAL` / **rc=1** | 0.03 s |
| `tb_dump` | `#((limit+20)*10)` (**new**) | `FAIL tb_dump: timeout at 280000, the test never finished` / `FATAL` / **rc=1** | 0.03 s |
| `tb_period` | none needed — the `initial` is `#40` then `$finish` | `FAIL tb_period: the 1ps clock is not 5 ns` / `FATAL` / **rc=1** | 0.03 s |

`tb_period` deserves a note: it has two clock generators inside submodules and no watchdog,
but it cannot hang because its scenario waits on time, not on edges. With both `initial clk
= 1'b0;` lines deleted it reports a measured period of 0.00 ns and fails properly. That is
the correct design and the chapter does not claim otherwise.

The other ten targets have no clock and no `@(...)` wait on a DUT signal, so there is nothing
for a watchdog to protect.

### Second hang mode: live clock, condition that never arrives

A watchdog that only survives a dead clock is half a watchdog. I injected
`wait (q === 8'hDE);` — a condition `tb_dump` never reaches — with the clock running
normally:

```
FAIL tb_dump: timeout at 280000, the test never finished
FATAL: tb_dump.v.hang:61: timeout       rc=1
```

Fires correctly. The absolute `#delay` form covers both modes; the old edge-counted form
covered only this one.

### The old form, for the record

The chapter (line 125) claims the edge-counted watchdog "never fired: killed at eight
seconds with nothing on stdout". Reconstructed and re-measured:

```
rc=137   wall=8.0s   stdout=[]
```

Exact. So is the companion claim about a clock generator with no `$finish` (chapter lines
118–121): `EXIT=137` after 4 s.

### Watchdog margins

Checked that none of the new watchdogs is set so tight that a legitimate run trips it:

- `tb_strobe` finishes at 37 ns against a 200 ns limit — 5.4×.
- `tb_anatomy` finishes at 150 ns against 10 000 ns — 66×.
- `tb_dump` scales: at `+cycles=8` it finishes at 100 ns against 280 ns; at
  `+cycles=100000` it finishes at 1 000 020 ns against 1 000 200 ns. The margin is a fixed
  20 periods rather than a ratio, but both sides are linear in `+cycles`, so it never
  inverts. Verified green at `+cycles=3, 4, 8, 17, 100000`.

### `SIM_TIMEOUT` in `run_all.sh`

The orchestrator's `perl`/`alarm` shim works and does not interfere with normal runs.

**It fires.** A target whose testbench has a free-running clock and no `$finish`:

```
=== hangtest ===
  FAIL  simulation hung (killed after 3s):  tb_hang.v
  failing targets:
    - hangtest: tb_hang.v (timeout after 3s)
runner rc=1
```

Wall time 3.04 s against `SIM_TIMEOUT=3` — the alarm, not a fixed cost.

**It kills cleanly.** `pgrep -x vvp` after a timeout run returns nothing: the shim's
`kill "KILL", $pid` reaches `vvp` directly, because `perl` `exec`s it as the direct child
rather than through a shell. No orphans.

**Exit statuses pass through faithfully.** This is the part most timeout wrappers get wrong,
and it matters because `run_all.sh` branches on `rc -eq 124`, `rc -eq 0` and everything else:

```
exit 0   -> 0      exit 42          -> 42
exit 1   -> 1      killed by SIGKILL-> 137   (128 + signal)
exit 2   -> 2      exec of a missing binary -> 127
```

`$fatal` still surfaces as 1, which is what the runner needs. stdout and stderr both pass
through unchanged, so the `grep -qE '(^|[^A-Za-z])FAIL'` gate is unaffected.

**It does not slow anything.** `bash run_all.sh ch04` runs in 0.44 s with the guard in place
(0.43 s was the pre-guard figure I measured first), `ch02 ch03` in 1.39 s, the whole repo in
1.72 s. The shim costs one `fork` per simulation.

**Two small notes, neither a defect.** `SIM_TIMEOUT=0` disables the timeout entirely rather
than expiring immediately, because Perl's `alarm 0` cancels the alarm — a sensible "off"
switch, just undocumented in the comment. And the shim kills the direct child only, not a
process group; that is exactly right for `vvp`, which does not fork, and would need
revisiting only if a target ever ran through a wrapper script.

## New defects introduced by fix round 2

Three. The project's pattern — every fix round closes defects and opens new ones — holds a
third time, and once again the newly-written prose is where the damage is. All three are in
text the fix round added or invalidated; none is in the code.

### N1 (significant). The paragraph certifying the B1/R1 fix asserts an equivalence that is false

Chapter line 360 and `src/ch04/README.md` line 115. Full evidence in *Independent mutation
campaign*; the short form:

- **What is true and was measured:** with `tb_dump.v`'s stimulus, the `u_a`-on-negedge
  mutant produces `q` transitions bit-identical to the real design. I reproduced this.
- **What is claimed and is false:** that it therefore "cannot fail and should not", that
  "a testbench sees only the port", and (README) that it is "an equivalent mutant, not a
  hole".
- **Disproof, black-box, `q` observed and nothing else:** move the stimulus from the falling
  edge into the high phase and the mutant's latency drops from two rising edges to one. Real
  design: `a0` reaches `q` at t=25000. Mutant: t=15000.
- **Disproof, one line, stimulus untouched:** `always @(u_pipe.mid) if (clk !== 1'b1) …`
  fires at 10000, 20000, 30000 … on the mutant and never on the real design. The chapter
  itself uses hierarchical references (`$dumpvars(0, tb_dump.u_pipe)`), so the premise that a
  testbench cannot see inside is contradicted three sections later.

Why it matters more than its size. This is the sentence that certifies the chapter's own
cautionary example is finally fixed, in the chapter whose stated differentiator is that its
measurements are real, immediately before the bridge to the coverage chapter. A reader who
accepts it learns to file unkilled mutants under "equivalent" — the single most common way
mutation-testing discipline decays in practice. And the mutant in question is a half-cycle
path, a real bug you want caught.

This is structurally the same failure as round 2's D1: the fix is measured correctly and the
sentence describing it over-reaches. Round 2 wrote "fails it four times out of four" when it
was two; round 3 finds "cannot fail" when it can.

**Fix (one sentence, no new research):** say what was actually measured — that no stimulus in
*this file* can distinguish it, because `tb_dump.v` only ever moves `d` on the falling edge,
and that a testbench which moved `d` inside the high phase, or which watched `mid`, would
catch it. That turns a wrong claim into the chapter's best illustration of the difference
between an equivalent mutant and a gap in stimulus — which is precisely chapter 5's subject.

### N2 (minor). "All fourteen binaries recompile" is eight

Chapter line 606:

> Second, change `adder8.v` from `a + b` to `a - b` and type `make`: all fourteen binaries
> recompile, the run stops at `FAIL tb_stimulus` with exit **2** …

Measured on a warm tree with the edit two seconds after the build, so no timestamp
ambiguity:

```
iverilog invocations in this run = 8
  tb_anatomy, tb_check, tb_dump, tb_period, tb_plusargs, tb_print, tb_random, tb_stimulus
FAIL tb_stimulus  (rc=1)
make: *** [run-tb_stimulus] Error 1        exit status = 2
```

`make` builds and runs each target in turn and aborts at the first failure, which is
`tb_stimulus`, the eighth in order — so the six after it are never recompiled in that
invocation. Fourteen is the `make -k` number; I measured that too, and it is exactly 14. The
rest of the sentence (`FAIL tb_stimulus`, exit 2, `make -k` catching `tb_vectors` as well)
is correct. Everything the sentence is *for* — that every `.v` is a prerequisite of every
compile, that the gate fires — is intact; only the count is wrong.

**Fix:** "every binary is out of date and the ones `make` reaches are rebuilt; the run stops
at `FAIL tb_stimulus` with exit 2, and `make -k` rebuilds all fourteen and catches
`tb_vectors` too."

### N3 (minor). A transcript went stale under the R7 fix

Chapter line 383 and `src/ch04/README.md` line 145 both quote:

```
ERROR: bad_dumparray.v:29: $dumpvars cannot dump a vpiMemory.
```

Measured now:

```
ERROR: bad_dumparray.v:32: $dumpvars cannot dump a vpiMemory.
```

Cause: closing R7 added three lines to that file's header comment, moving
`$dumpvars(0, bad_dumparray.mem);` from line 29 to line 32. Nobody re-ran the transcript.
Everything else about the trap reproduces exactly — `iverilog -DDUMPMEM` exits 0, `vvp`
refuses at load and exits 1, the two `VCD warning: array word …` lines are verbatim, and the
escaped-identifier `$var` line matches character for character.

I checked every other `file:line` the chapter quotes and the rest are current:
`tb_anatomy.v:76` ✔, `bad_readmem.v:20` ✔, `tb_vectors.v:61` ✔ (twice). Only `s_rmf.v:5` is
uncheckable, and the chapter says why — that file is a throwaway and is not shipped.

## Code verification

### Harness

```
bash run_all.sh ch04   ->  passed: 14   failed: 0   rc=0   (0.44 s)
bash run_all.sh        ->  passed: 61   failed: 0   rc=0   (1.72 s)
```

Both claims hold. All fourteen ch04 manifest lines are `run`; no `xfail`, and `targets.txt`
explains why. `make` on `src/ch04` is green, `make lint` exits 0, `make clean && make`
performs exactly 14 compiles and leaves 14 `.vvp` binaries, matching "fourteen build
targets" in the sources list. The `+break` gate fires (exit 2) and the broken-DUT gate fires
(exit 2, `make -k` finding both `tb_stimulus` and `tb_vectors`).

### Listings versus files on disk

I extracted all 23 fenced blocks from `ch04.md` and matched every `verilog` and `make` block
against the files as an exact line-sequence search. **All seven are byte-identical**, no
near-misses:

| chapter line | lang | lines | source |
|---|---|---|---|
| 20 | verilog | 81 | `tb_anatomy.v:1` (whole file) |
| 136 | verilog | 5 | `tb_period.v:13` |
| 156 | verilog | 4 | `tb_anatomy.v:56` |
| 175 | verilog | 8 | `tb_stimulus.v:71` |
| 219 | verilog | 9 | `tb_vectors.v:40` |
| 256 | verilog | 5 | `tb_strobe.v:29` |
| 532 | make | 57 | `Makefile:1` (whole file) |

### Transcripts

Every quoted block re-run. All reproduce character-for-character except N3.

| transcript | chapter | result |
|---|---|---|
| `tb_anatomy` run + `$finish` trailer | 104 | exact, incl. `tb_anatomy.v:76` |
| no-`$finish` clock, `EXIT=137` | 119 | exact |
| `tb_period` measured 5.00 / 6.00 ns | 146 | exact |
| `bad_readmem` incl. the `Too many words` warning | 201 | exact |
| `$readmemh` on a missing file, exit 0 | 212 | reproduced (throwaway file, line no. differs by construction) |
| `tb_random` three streams + seed `-1368524349` | 237 | exact |
| `tb_strobe` full 16-line run | 266 | exact, all 16 lines |
| `bad_monitor` six `B:` lines, zero `A:` | 292 | exact |
| `tb_print` five asserted lines | 306 | exact |
| `tb_check` 3-of-4 mismatches | 318 | exact |
| severity table, seven rows | 331 | exact, incl. `$stop` continuing and `vvp -N` → 1 |
| `tb_vectors +break`, exit 1 | 348 | exact |
| VCD header from `+sub` | 399 | exact but for the `$date` stamp |
| `brew info gtkwave` | 469 | exact, still disabled 2025-10-29 |
| `make -k PLUSARGS=+break` | 596 | exact, incl. the `ok tb_strobe` / `ok bad_dumparray` neighbours and exit 2 |
| `$dumpvars` on a memory | 383 | **stale line number — N3** |

Spot-checks beyond the quoted blocks, all confirming the surrounding prose: `$random` is
byte-identical across two runs of one binary and one run of a freshly compiled binary (three
identical SHA-256s); `$fatal(0/1/2)` all exit 1; the `$dumpfile` extension matrix behaves in
all four combinations as described; `$dumpoff` writes every dumped signal to `x`;
`$urandom` with a literal seed is rejected at load with the exact quoted message; a
`tb_anatomy` dump contains `$scope task check` and `$var real 1 " PERIOD $end`.

### FST / VCD byte counts

Re-measured from scratch with the exact commands and paths the chapter gives. **All four
match to the byte.**

| dumper | chapter | measured | ratio measured |
|---|---|---|---|
| VCD (default), `/tmp/w.vcd` | 14 654 851 | 14 654 851 | 1.0× |
| `-lxt2`, `/tmp/w.lxt2` | 872 834 | 872 834 | 16.8× |
| `-fst`, `/tmp/w.fst` | 218 067 | 218 067 | 67× |
| `-fst-space`, `/tmp/w.fst` | 6 654 | 6 654 | 2202× |

The path-dependence caveat is real and I confirmed it matters most exactly where the chapter
warns: writing the `-fst-space` file to `/tmp/w2.fst` instead of `/tmp/w.fst` — one extra
character — gives **6655**, and a path 63 characters longer gives 6709. On the VCD the same
63 characters cost 440 bytes out of 14.6 MB.

Is the chapter clear enough that a reader who gets a different number is not confused? **Yes.**
The lead-in names each output path explicitly, and the sentence immediately under the table —
"Use those exact names to reproduce them: the `+dump=` string is itself a dumped variable, so
a longer path makes the file bigger" — states the mechanism, not just the fact. A reader who
uses a different path and gets 6660 has been told why. The one thing it does not say is that
the effect is roughly one byte per character, which would let a reader confirm their own
number rather than merely excuse it; that is an improvement, not a defect.

### Dump depths

Re-measured on `tb_dump.v` as shipped. Table and scope count both exact:

```
$dumpvars;  /  $dumpvars(0, tb_dump);   19 $var
$dumpvars(1, tb_dump);                   6 $var
$dumpvars(2, tb_dump);                  13 $var
$dumpvars(0, tb_dump.u_pipe);           10 $var
```

Six scopes, exactly as the prose enumerates: `tb_dump`, `u_pipe`, `u_a`, `u_b`, and the
named blocks `dumpctl` and `watchdog`. The R3 fix turned the watchdog into a named `initial`
and so preserved the sixth scope — the depth table would have gone stale otherwise, and it
did not. The hedge "Those are counts of one revision of one testbench … re-run the command
rather than trust the table" is the right calibration and is still accurate.

### Timing figure

The ASCII drawing at chapter line 488 is column-checked against the real simulation. Mapping
its column 8 to t=5 ns (the first rising edge), every transition lands: `d` changes at column
13 = t=10 ns (the falling edge), `mid` takes `10` at column 18 = t=15 ns, `q` leaves `x` for
`00` at column 18 and takes `10` at column 28 = t=25 ns. Two rising edges between a value on
`d` and the same value on `q`, as the text says. It is correctly labelled a drawing, and the
"Icarus reality" box that separates measurement from documentation is intact.

### Tree cleanliness

- `shasum -a 256` over all 25 files in `src/ch04` plus `run_all.sh`: **byte-identical**
  before and after the campaign.
- `find guide/src -type f` outside `*.v`, `*.hex`, `*.md`, `Makefile`, `targets.txt`,
  `run_all.sh`: **empty**. No `.vcd`, `.vvp`, `.fst` or log anywhere in the tree.
- Every testbench keeps dumping behind `+dump=`; the two harnesses write only to `$(BUILD)`
  and to `mktemp -d` respectively.

### Cross-references, citations, word count

- **Word count 9 918** (`wc -w`), under the 10 000 limit — but by 82 words. Prose only, with
  fenced blocks removed, is 8 372.
- **Every named cross-reference resolves.** Chapter 3's "Simulation Artifacts That Will Cost
  You an Evening", "How a Simulator Actually Runs Your Code" and "Reset Strategy" all exist
  as headings in `ch03.md`; `src/ch03/bad_clkinit.v` and `src/ch03/bad_tbedge.v` both exist.
  The three self-references ("Automating the Build", "Debugging Methodically", "Viewing
  Waveforms in 2026") all exist in `ch04.md`.
- **No positional cross-references.** The 14 occurrences of "above"/"below" are all local
  prose ("the watchdog above", "the five lines below") plus one "the figure below" pointing
  at a figure three lines away. No numbered section or page references anywhere.
- **Forward references** are to chapters 5, 9, 11 and 12, all clearly flagged as seeds; only
  chapters 1–4 exist so far, which is expected.
- **Citations spot-checked.** `brew info gtkwave` still returns the quoted cask block
  verbatim including the 2025-10-29 disable date; `brew info surfer` still returns
  `stable 0.7.0 (bottled), HEAD`. IEEE clause numbers are cited by title with no link
  asserted, consistent with the stated policy. The closing disclaimer paragraph accurately
  lists its two flagged exceptions.

## Remaining defects

Ordered by how badly a reader is misled. The three blocking items from round 2 are gone;
what is left is N1 plus a short tail.

### R1' (blocking). The equivalent-mutant claim — see **N1**

The only item that would actively teach a reader something false. One sentence in `ch04.md`
line 360 and one in `src/ch04/README.md` line 115. Replacement measured and given in N1.

### R2' (minor). "All fourteen binaries recompile" — see **N2**

### R3' (minor). `bad_dumparray.v:29` should be `:32` — see **N3**

### R4' (minor). The `always @(q)` check pins a weaker property than the prose claims

Chapter line 495: "`q` one cycle behind `mid`, and *only* on rising edges, which is the
property `tb_dump.v`'s second check pins." The check asks whether `clk` is **high** when `q`
moves, which is not the same as "on the rising edge". `pipe2` rebuilt with a stage-2
clock-to-Q delay of `#1` or `#4` moves `q` in the middle of the high phase and survives all
fourteen targets; `#6` crosses the falling edge and dies. Within zero-delay RTL the two
properties coincide, and the file's own comment reasons from exactly that — but the chapter
sentence does not carry the assumption. Either soften it to "only while the clock is high,
which in zero-delay RTL means only at a rising edge", or make the check exact by latching
`$time` at the posedge and comparing.

### R5' (minor). `adder8`'s carry is checked by six vectors, and two wrong carry functions survive

Not a false claim — the chapter says precisely which three mutants fail, and they do. But
`cout = a[7] | b[7]` and `cout = ~sum[7] & (a[7] | b[7])` are 14/14 green, and `tb_vectors.v`
and `tb_check.v` still connect `cout` and never read it, which is the exact condition the
chapter names one paragraph earlier. Cheapest fix with the best teaching value: have
`tb_vectors.v` read `cout` too — `vectors.hex` already contains `ff+ff`, which kills the
second mutant, and the packed-word format has eight spare bits per line. That would also let
the chapter say "and two more carry functions I tried survive even this, which is what
chapter 5 is for" — an honest strengthening rather than a claim.

### R6' (minor). The `$readmemh` load guard catches "none", not "not all"

Truncating `vectors.hex` to seven vectors produces a warning the runner ignores and then
`PASS tb_vectors (8 vectors, 0 errors)` — because `vec[7]` stays `x`, the DUT output is `x`,
and `x !== x` is false. The chapter's own wording ("check that it got **any**") is exact and
the guard implements it, but the seed for chapters 9 and 12 — "a silent empty load in a
10,000-vector regression looks exactly like a clean pass" — implies the guard covers the
growing-file case, which is the one that will actually bite there. Two extra characters fix
it: guard `^vec[N-1]` as well as `^vec[0]`. Appending a ninth vector is likewise only a
warning, never a `FAIL`.

### R7' (minor, pre-existing). The auto-root-module sentence describes the wrong failure

Chapter line 112: "Icarus picks the root automatically only while exactly one module is never
instantiated." Measured: with two or three uninstantiated modules `iverilog` exits 0 and
elaborates **all** of them as roots, and they all run concurrently — whichever `$finish`
fires first ends the whole simulation. Compiling `adder8.v tb_vectors.v tb_check.v
bad_adder8.v` with no `-s` produces one `PASS` line instead of two. The practical advice
(use `-s`) is right and the Makefile does it; only the described failure mode is wrong, and
the real one is nastier and worth a clause.

### Observations, not defects

- **`counter4` reset priority and reset synchronicity are untested.** `en` given priority
  over `rst_n`, and an asynchronous reset, both survive `tb_anatomy`. The chapter presents
  `tb_anatomy` as a shape rather than a complete test, so nothing is claimed falsely — but
  a reader following the closing checklist item ("break the *DUT* instead") could pick either
  and get green.
- **GNU Make 3.81's one-second timestamp window.** Editing `adder8.v` inside the same second
  as the previous build makes `make` miss the change entirely and report 14 green. This is a
  `make` property, not a chapter error, and `run_all.sh` is immune because it always compiles
  into a fresh `mktemp -d`. Worth knowing only because the chapter tells the reader to run
  this exact experiment.
- **82 words of headroom** on the 10 000 limit. The N1 fix is a rewrite of one sentence into
  roughly two; N2 and N3 are shorter than what they replace. It fits, but not by much.

## Sign-off

**Not yet fit to ship as chapter 4 — but it is three sentence edits away, and no further
research or code work is needed.**

The engineering underneath this chapter is now sound and I could not find a testbench that
cannot fail. Every one of the fourteen targets has at least one mutation that turns it red;
every expected value in every testbench is live (eleven for eleven); the four clocked
testbenches all fail with a diagnostic when the clock dies; the concurrent `always @(q)`
check fires exactly once per real transition of `q` and produced not one false failure across
fourteen plusarg configurations, at initialisation, through `x`, through the `$dumpoff`
window and through the drain; and the new `SIM_TIMEOUT` shim fires on a real hang, kills the
child cleanly, passes exit statuses through faithfully and costs nothing. The measurements
are exceptionally good — four FST byte counts and a four-row `$dumpvars` depth table that
reproduce exactly, seven listings byte-identical to disk, and every transcript re-running
unchanged but one.

What stops it is that the prose still over-reaches where the code does not, and this round it
does so in the one paragraph a reader will treat as the chapter's methodological punchline.
Telling a reader that a surviving mutant is provably equivalent, when a change of stimulus
phase kills it from the port, is the wrong lesson at the wrong moment — immediately before
the chapter that teaches coverage.

**Shortest path to publishable (9/10):**

1. **`ch04.md` line 360 and `README.md` line 115 — rewrite the equivalence claim.** State what
   was measured: no stimulus *in this file* can distinguish the mutant, because `tb_dump.v`
   only ever moves `d` on the falling edge. Then state what that means: it is a gap in
   stimulus, not an equivalent mutant, and either moving `d` inside the high phase or
   watching `u_pipe.mid` catches it. Both replacements are measured and quoted in N1. Delete
   "and a testbench sees only the port".
2. **`ch04.md` line 606 — change "all fourteen binaries recompile" to eight**, or attribute
   the fourteen to `make -k`. Wording given in N2.
3. **`ch04.md` line 383 and `README.md` line 145 — change `bad_dumparray.v:29` to `:32`.**

Optional and cheap, worth taking while the file is open: soften "only on rising edges" at
line 495 (R4'), guard `^vec[N-1]` alongside `^vec[0]` in `tb_vectors.v` (R6'), and fix the
auto-root sentence at line 112 (R7'). Item 1 is the only one that changes what a reader
believes; 2 and 3 are corrections of fact.

**What must not be disturbed:** the `always @(q)` check in `tb_dump.v` and its comment; the
three absolute-`#delay` watchdogs; `tb_strobe`'s `settled_q !== d` comparison, which is the
only thing in the chapter that tests `dff`; the `expected_cout` argument and the three carry
vectors in `tb_stimulus.v`; the `src` variable behind the intra-assignment delay; the
`ncyc < 3` precondition; the `$(DATA)` "belt and braces" parenthesis; and the `SIM_TIMEOUT`
shim exactly as written. All were re-verified this round and all are correct.
