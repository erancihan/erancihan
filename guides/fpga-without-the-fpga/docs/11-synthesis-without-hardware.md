# 11 — Synthesis without hardware: real area, real timing, zero dollars

> Simulation tells you *is it correct?* Synthesis and place-and-route tell
> you *how big?* and *how fast?* — and you can get both without owning the
> chip.

Everything so far has answered one question: does the design do the right
thing? Your testbenches say yes. But two questions are still open, and they
are the ones a hardware engineer gets paid to answer. **How much of the chip
does this consume?** — measured in look-up tables, flip-flops, block RAMs,
DSP slices. And **how fast can you clock it?** — the honest maximum
frequency after real wires with real delays have been routed between your
registers.

You do not need a board to answer either. The open-source flow runs the
same two steps a commercial tool runs, targeting a *real, documented* FPGA
part:

- **[Yosys](https://yosyshq.net/yosys/)** does *synthesis*: it reads your
  Verilog and lowers it to a netlist of that part's actual primitives —
  LUTs, flip-flops, carry cells, block RAMs, DSP blocks. Out comes an area
  report.
- **[nextpnr](https://github.com/YosysHQ/nextpnr)** does *place-and-route*:
  it assigns each primitive to a physical spot on the die, routes the wires,
  then runs *static timing analysis* over the result. Out comes an honest
  Fmax.

The only step you skip is flashing a bitstream onto silicon you don't own.
Everything up to that — the numbers that drive design decisions — is free and
runs in seconds. This chapter runs the guide's own designs through the flow
and reads the reports out loud, then closes with a taste of formal
verification, which proves properties simulation can only sample.

## Install: one tarball, one family

On Linux, `yosys` and `nextpnr-ice40` are in most package managers
(`apt-get install yosys nextpnr-ice40`). On macOS, Homebrew has `yosys` but
**not** nextpnr, so the path of least resistance is the all-in-one
**[OSS CAD Suite](https://github.com/YosysHQ/oss-cad-suite-build)**: one
download, unpack, add its `bin/` to your `PATH`, and you have Yosys, nextpnr,
the iCE40/ECP5 chip databases, simulators and formal tools together (also the
easiest route on Windows via WSL2). Chapter [02](02-the-toolbox.md) mentioned
it; this is the chapter that cashes it in.

The runs below were produced with **Yosys 0.33** and **nextpnr 0.6**. Exact
cell counts and Fmax shift a little between tool versions, and nextpnr's
placement is seeded, so **your numbers will differ by a few percent** — the
shapes and ratios are what matter, not the last digit.

We target the **Lattice iCE40** family throughout, because it is the part
the open flow documents best: Claire Wolf's
**[Project IceStorm](https://github.com/YosysHQ/icestorm)** reverse-engineered
its bitstream completely, which is what made a bitstream-to-silicon open
toolchain possible in the first place. The bigger **ECP5** (`synth_ecp5`)
works the same way when you outgrow the iCE40; the vocabulary transfers
directly. We use the **HX8K** part in the CT256 package — 7680 logic cells,
enough to hold the whole CPU.

## What synthesis does, walked on the counter

Start with the smallest thing in the repo, the counter from
[`../src/01-counter/counter.v`](../src/01-counter/counter.v):

```console
$ yosys -p "read_verilog counter.v; synth_ice40 -top counter; stat"
```

`synth_ice40` is a *script* — a pipeline of passes. It reads your RTL,
flattens the hierarchy, optimizes constant and dead logic away, infers
memories and arithmetic, then runs **techmap**: the step that replaces
generic gates and adders with the iCE40's named primitives. The tail of the
run is the `stat` report:

```console
=== counter ===

   Number of cells:                 23
     SB_CARRY                        6
     SB_DFFESR                       8
     SB_LUT4                         9
```

Read it primitive by primitive — this *is* an iCE40, described in its own
parts:

- **`SB_LUT4`** — a 4-input look-up table, the fabric's unit of
  combinational logic. Nine of them compute `count + 1`.
- **`SB_DFFESR`** — a D flip-flop with clock **E**nable, **S**et and
  **R**eset. Eight of them, one per bit of `count` — exactly the state
  [chapter 05](05-sequential-logic-and-fsms.md) said lives in flip-flops. The
  `E` is your `en`, the `R` your synchronous `rst`: the synthesizer read your
  `always` block and picked the flop flavor that matches.
- **`SB_CARRY`** — a dedicated fast-carry cell. This is
  [chapter 07](07-building-blocks.md)'s promise made visible: your `+ 1`
  didn't become a pile of LUTs, it landed on the hardwired carry chain that
  threads the increment up the byte.

That is the whole game. You wrote behavior; Yosys handed you the physical
cells an iCE40 would spend on it. On a module this small you can even *see*
the schematic: appending `show` to the command opens a graphviz drawing of
the netlist (you need `graphviz` installed) — a wonderful way to build
intuition on tiny modules and completely useless on the CPU, which brings us
to the interesting cases.

## The pattern-matching magic: RAM and DSP

Synthesis is not just gate-shredding. Certain *coding patterns* get promoted
to hard blocks — and this is where two earlier chapters' claims get proven.

[Chapter 06](06-memory.md) told you that
[`../src/04-memory/ram_sync.v`](../src/04-memory/ram_sync.v) — a `reg`
array with a **registered read** — is "the pattern FPGA tools map onto block
RAM." Run it and watch it happen:

```console
$ yosys -p "read_verilog ram_sync.v; synth_ice40 -top ram_sync; stat"
=== ram_sync ===

   Number of cells:                115
     SB_DFF                         74
     SB_LUT4                        39
     SB_RAM40_4K                     2
```

There it is: **`SB_RAM40_4K`** — a 4-Kbit iCE40 block RAM, and *two* of
them. The default `ram_sync` is 256 words × 32 bits = 8192 bits; each block
holds 4 Kbit as 256×16, so a 32-bit word spans two side by side. The 8 Kbit
of storage cost **zero** LUTs — it went into dedicated memory silicon, which
is the whole point of writing the BRAM pattern instead of a giant register
array. (The 74 flip-flops and 39 LUTs are fabric glue: the registered read
port and enable logic.) Make the read *combinational* instead, and this same
`stat` would show the storage collapse back into thousands of LUTs and flops.
The one-cycle read latency you grumbled about in chapter 06 is the price of
admission to that hard block.

Now the multiplier. [Chapter 07](07-building-blocks.md) claimed the systolic
PE's `psum_in + a_in * w` "*is* a DSP slice" on real hardware. `synth_ice40`
only reaches for DSP blocks when you ask with `-dsp`:

```console
$ yosys -p "read_verilog pe.v; synth_ice40 -dsp -top pe; stat"
=== pe ===

   Number of cells:                113
     SB_CARRY                       31
     SB_DFFESR                       8
     SB_DFFSR                       40
     SB_LUT4                        33
     SB_MAC16                        1
```

**`SB_MAC16`** — the iCE40's hard 16×16 multiply-accumulate block —
absorbed the 8×8 multiply. One line of Verilog, one DSP slice, exactly as
advertised. (The 31 `SB_CARRY` cells are the `+ psum_in` accumulate: it
arrives on a port, so the 32-bit add rides the fabric rather than folding
into the MAC's own accumulator.)

To feel *why* the hard block matters, drop the flag:

```console
$ yosys -p "read_verilog pe.v; synth_ice40 -top pe; stat"    # no -dsp
     SB_LUT4                       407
```

Without `-dsp`, the same multiply is paved out of the fabric: **407 LUTs**
versus 33 LUTs plus one MAC block. That 12× blow-up is chapter 07's "a 32×32
multiplier built from plain LUTs is a monster" shrunk to 8×8 and measured —
one flag, the difference between renting purpose-built silicon and paving it
with general-purpose logic.

## The CPU under the knife

Now the main event: the whole single-cycle RV32I core from
[`../src/05-cpu-rv32i/cpu.v`](../src/05-cpu-rv32i/cpu.v).

```console
$ yosys -p "read_verilog cpu.v; synth_ice40 -top cpu; stat"
=== cpu ===

   Number of cells:               4090
     SB_CARRY                      359
     SB_DFFE                       993
     SB_DFFESR                      31
     SB_DFFSR                        1
     SB_LUT4                      2706
```

Roughly **2706 LUTs and 1025 flip-flops** (993 + 31 + 1). The flip-flops are
easy to account for: the state of an RV32I core is the program counter (32
bits), the `halted` bit, and the **register file** — 32 × 32 bits, except
`x0` is hardwired zero and never written, so synthesis drops it, leaving
31 × 32 = 992. That's 992 + 32 + 1 ≈ the 1025 you see — and the register file
is the single biggest lump of state, which is why chapter 06 spent a whole
section on it.

The 2706 LUTs are the *combinational* datapath, and the big spenders are the
ones [chapter 07](07-building-blocks.md) named:

- The **barrel shifter** — SLL/SRL/SRA by a runtime amount — is one of the
  largest single pieces: five layers of 32 muxes, times three shift flavors
  that only partly share.
- The **load/store byte muxes** (`cpu.v` lines 137–183): every load selects
  and sign-extends a byte or halfword; every store replicates data across
  lanes and computes strobes. Those `case`-on-`mem_addr[1:0]` blocks are wide
  muxes.
- The **ALU** proper — adder, subtractor, two comparators, logic ops — mostly
  shared onto one carry-chain-backed structure (the 359 `SB_CARRY` cells).

Put the designs side by side and the scale sinks in:

| Design (source) | LUT4 | Flip-flops | Carry | BRAM | DSP |
| --- | ---: | ---: | ---: | ---: | ---: |
| `counter.v` (8-bit) | 9 | 8 | 6 | – | – |
| `pe.v` (`-dsp`) | 33 | 48 | 31 | – | 1 × `SB_MAC16` |
| `pe.v` (no `-dsp`) | 407 | 48 | 26 | – | – |
| `ram_sync.v` (256×32) | 39 | 74 | – | 2 × `SB_RAM40_4K` | – |
| `cpu.v` (RV32I) | 2706 | 1025 | 359 | – | – |

A whole RISC-V CPU is about **300× the counter** in LUTs, yet still fills
only half a modest HX8K — a *computer* in a few dollars of 2010-era FPGA.
Numbers like these are how you answer "will it fit?" before buying the part.

## Place-and-route and the honest Fmax

Synthesis tells you *what* cells you need, not how fast they run — it doesn't
yet know where the cells sit or how long the wires between them are, and on
an FPGA **wire delay dominates**. That is nextpnr's job: place every
primitive on the die, route the connections, then trace the longest
register-to-register path and report the frequency at which a clock edge
still arrives after the signal settles.

Feed it the synthesized netlist as JSON. First the counter, for calibration:

```console
$ yosys -p "read_verilog counter.v; synth_ice40 -top counter -json counter.json"
$ nextpnr-ice40 --hx8k --package ct256 --json counter.json \
                --pcf-allow-unconstrained --freq 100
Info:          ICESTORM_LC:    12/ 7680     0%
Info: Max frequency for clock 'clk': 365.23 MHz (PASS at 100.00 MHz)
```

**365 MHz.** Twelve logic cells, almost no wire between them, so the clock
can fly. (`--pcf-allow-unconstrained` means "I didn't pin the I/O to package
balls" — fine when you want timing, not a real bitstream.)

Now the CPU:

```console
$ yosys -p "read_verilog cpu.v; synth_ice40 -top cpu -json cpu.json"
$ nextpnr-ice40 --hx8k --package ct256 --json cpu.json \
                --pcf-allow-unconstrained --freq 50
Info:          ICESTORM_LC:  3764/ 7680    49%
Info: Max frequency for clock 'clk': 39.66 MHz (FAIL at 50.00 MHz)
```

**~40 MHz** — nearly ten times slower than the counter, from the same
fabric, filling 49% of the part. (The "FAIL at 50 MHz" only means it missed
the *target* you asked for; 39.66 MHz is the real answer. Ask for `--freq 30`
and the identical design "passes" — the constraint is a line you draw, the
Fmax is physics.) Why so slow? Because in a *single-cycle* CPU one clock
period must contain the entire journey from one edge to the next: fetch →
decode → register read → ALU → memory → write-back, all combinational.
nextpnr shows you that path if you ask — here is the critical one, trimmed:

```console
Info: Critical path report for clock 'clk' (posedge -> posedge):
Info:  0.5  0.5  Source regs[31]_...DFF.O           <- register-file read
...
Info:  ...        Sink dmem_wdata_...LC.I1           (cpu.v:137  store-data mux)
...
Info:  ...        Sink ...alu_b...CARRY.I1           (cpu.v:88   operand mux)
Info:  ...        Sink ...SB_CARRY...                (cpu.v:107  SLT compare)
Info: Max frequency for clock 'clk': 39.66 MHz
```

Read a static-timing path top to bottom: it starts at a **source** register
(here `regs[31]`, a register-file output), then lists alternating **Net**
(wire delay) and **Source** (cell delay) hops, accumulating nanoseconds in
the right-hand column until it lands on the **sink** — the input of the
flop that must capture the result. The `cpu.v:NN` annotations tie each hop
back to your source: line 88 is the `alu_b` operand mux, line 107 is the
signed-less-than comparison, line 137 is the store-data path. In plain
terms, this critical path is a register read feeding the ALU's comparator
carry chain on its way to write-back — which is *precisely the datapath
[chapter 08](08-build-a-cpu.md) drew*. The picture and the picoseconds agree:
the single-cycle design's promise ("everything in one cycle") is also its
speed limit ("everything in one cycle").

**One honest caveat.** Synthesized alone, `cpu.v` treats `imem`/`dmem` as
module *ports*, so nextpnr times the path only up to the pins. The real
system — CPU plus instruction and data memory — has an even longer path,
because a load's address has to reach the RAM and its data come *all the way
back* within the same cycle. The 40 MHz is an *optimistic* ceiling for the
core in isolation; wire the memories in and it drops further.

### The vocabulary, and the ladder of fixes

Three words you now own concretely:

- **Fmax** — the maximum clock frequency, `1 / (longest register-to-register
  delay)`. 39.66 MHz here.
- **Slack** — target period minus actual path delay. Positive slack: you met
  timing with room to spare. Negative: the path is too slow, and its
  magnitude tells you by how much.
- **Timing closure** — the iterate-until-all-slack-is-non-negative grind
  that fills real engineers' calendars.

When a path is too slow, you climb a ladder of fixes, cheapest first:

1. **Re-seed.** Placement is heuristic; `--seed N` sometimes buys a few MHz
   for free.
2. **Pipeline it** ([chapter 07](07-building-blocks.md)). Drop a register
   into the long path to cut it in two. For the CPU, that means becoming a
   *pipelined* core — split fetch/decode/execute into stages, as every real
   CPU does and chapter 08 explains: higher clock, at the cost of latency and
   new hazards.
3. **Retime.** Let the tool slide existing registers to balance stages
   (`abc` does some of this automatically).
4. **Restructure the RTL.** Sometimes the logic itself is the problem — a
   giant priority mux, a needlessly wide comparator — and you rewrite it.

You do not have to guess which rung you are on: the critical-path report
names the offending logic, so you go fix *that* path and re-run.

## The no-hardware iteration loop

Put it together and you have a tight feedback loop that never touches a
board, running in seconds to a couple of minutes on a laptop:

```console
edit RTL  ->  make            # does it still pass? (iverilog, chapter 04)
          ->  yosys ... stat   # how big now?        (area)
          ->  nextpnr ...       # how fast now?       (Fmax)
```

Change a line, and within a minute you know whether you broke correctness,
grew the area, or moved the clock. That is the entire inner loop of RTL
design — the same one professionals run, minus the license server. A board
only earns its place when you need to prove the design survives *real* I/O
timing, analog, and peripherals — or you just want the blinking lights;
[chapter 13](13-hardware-and-beyond.md) is about that day.

## A taste of formal verification

Simulation *samples* behavior: you try inputs and hope the breaking ones are
among them. **Formal verification** *proves* behavior: a solver searches
*all* reachable states for a counterexample to a property you assert. Find
one, it hands you the exact trace; find none, the property holds for real.

The open tool is **SymbiYosys** (`sby`), a front-end over Yosys that drives
SAT/SMT engines. The natural first target here is the FIFO from
[`../src/04-memory/fifo_sync.v`](../src/04-memory/fifo_sync.v), because its
correctness is all *invariants* — statements that must hold every cycle.
Its pointers carry one extra wrap bit (chapter 06's trick); the properties
worth proving are exactly the ones a stray edit would break:

```verilog
// Illustrative sketch — properties to add inside fifo_sync (adapt names).
// The fill level is the pointer difference; it must never exceed DEPTH.
wire [DEPTH_LOG2:0] level = wptr - rptr;

always @(posedge clk) if (!rst) begin
    assert (level <= DEPTH);        // never overflow past capacity
    assert (!(full && empty));      // the two flags are mutually exclusive
    assert (empty == (level == 0)); // flag definitions agree with the count
    assert (full  == (level == DEPTH));
end
```

You drive it with a small `.sby` control file:

```
[options]
mode bmc            # bounded model check: any bug in the first N cycles?
depth 20

[engines]
smtbmc

[script]
read -formal fifo_sync.v
prep -top fifo_sync

[files]
fifo_sync.v
```

and run `sby -f fifo.sby`. (SymbiYosys is not installed in the environment
these examples were run in, so treat the invocation above as the *shape* of
the flow, not a captured transcript — install it from OSS CAD Suite and
point it at your own FIFO.) Two modes matter:

- **BMC** (bounded model check) explores every input for the first *N*
  cycles. Fast, catches most real bugs — but "no bug in 20 cycles" isn't "no
  bug ever."
- **k-induction** proves the property holds *forever* (if true for *k*
  consecutive cycles it stays true) — a real proof, provided your invariants
  are strong enough to be inductive.

Formal is spectacular for exactly the components in this guide — FIFOs,
arbiters, handshakes, small state machines — where the state space is too
large to simulate exhaustively but small enough for a solver. Start with the
[SymbiYosys docs](https://symbiyosys.readthedocs.io/) and Dan Gisselquist's
**[ZipCPU blog](https://zipcpu.com/)**, the best practical formal writing on
the open web.

## Exercises

1. **Build the area table.** Run `synth_ice40 ... stat` on every design in
   `src/` (alu, uart_tx, regfile, fifo, the GPU lane, the full systolic
   array) and assemble your own version of the table above. Which module is
   the LUT hog? Which one surprises you?
2. **ALU alone vs. CPU.** Synthesize and place-and-route
   [`../src/02-alu/alu.v`](../src/02-alu/alu.v) by itself, and compare its
   Fmax to the CPU's. The ALU is a big chunk of the CPU's critical path —
   how much of the slowdown is *just* the ALU, and how much is the muxes and
   register file around it?
3. **One pipeline register.** Register the ALU output in `cpu.v` (you'll
   have to make it multi-cycle to stay correct — or, easier, do it on a
   throwaway copy just to see the timing move). Re-run nextpnr and measure
   the Fmax change. Did the critical path jump somewhere else? It always
   does — chasing it is what timing closure *is*.
4. **Cross-family.** Run `synth_ecp5` instead of `synth_ice40` on the CPU
   and compare the cell names (`TRELLIS_FF`, `LUT4`, `MULT18X18`,
   `DP16KD`…). The concepts map one-to-one; only the spelling changes. Does
   the bigger ECP5 fabric change where the area goes?
5. **Write the FIFO properties.** Add the assertions above to `fifo_sync.v`,
   write the `.sby`, install SymbiYosys, run it in BMC mode. Then break the
   `full` logic (drop the wrap-bit check) and watch formal hand you a
   concrete counterexample trace — for a bug simulation might never have hit.
   That is the whole pitch.

## Further reading

- **[Yosys documentation](https://yosyshq.net/yosys/)** — the `synth_ice40`
  / `synth_ecp5` scripts, the pass library, and what each stage actually
  does.
- **[nextpnr](https://github.com/YosysHQ/nextpnr)** — place-and-route
  internals, timing-analysis options, and the full CLI for every supported
  family.
- **[OSS CAD Suite](https://github.com/YosysHQ/oss-cad-suite-build)** — the
  one-tarball install of this entire toolchain, updated nightly.
- **[Project IceStorm](https://github.com/YosysHQ/icestorm)** — the
  reverse-engineered iCE40 bitstream that made the open flow possible; the
  `icetime`/`icepack` tools take you the last step to a real bitstream.
- **[SymbiYosys docs](https://symbiyosys.readthedocs.io/)** and the
  **[ZipCPU blog](https://zipcpu.com/)** — the on-ramp to formal
  verification, from `assert` basics to fully proving a CPU.

---

*Next: [Chapter 12 — The VHDL track](12-the-vhdl-track.md)*
