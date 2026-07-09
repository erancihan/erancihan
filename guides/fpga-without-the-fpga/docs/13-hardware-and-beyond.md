# 13 — Hardware at last, and where to go next

> Twelve chapters ago you were promised you didn't need an FPGA board. That
> was true, and it still is. This chapter is for the day you decide to buy
> one anyway — and for the ASIC-shaped plot twist waiting just past it.

Look at what you're carrying. A counter, an ALU, a UART, a register file, a
RAM, a FIFO — each with a self-checking testbench that passes
([chapters 04](04-simulation-and-testbenches.md)–[07](07-building-blocks.md)).
A RISC-V CPU that executes real machine code
([chapter 08](08-build-a-cpu.md)). A SIMT core running a genuine
grid-stride kernel ([chapter 09](09-build-a-gpu.md)). A systolic array
doing int8 matmuls against a golden model
([chapter 10](10-build-a-tpu.md)). And thanks to
[chapter 11](11-synthesis-without-hardware.md), you know what each one
costs in LUTs and flip-flops and how fast it can be clocked on a real part
you've never touched.

That is not "ready to start learning FPGAs." That is a working portfolio
plus synthesis reports. If you now buy a board, you won't be a beginner
with hardware — you'll be a designer collecting the last 10%.

## What a board actually buys you

Be clear-eyed about what changes, because it's less than the marketing
implies and more fun than the simulator crowd admits:

- **Real I/O.** Buttons that bounce, LEDs that glow, a USB cable carrying
  your UART bytes into a terminal, HDMI pixels on an actual monitor.
  Simulation can model all of it; it cannot make your desk blink.
- **Real clocks, real discipline.** In simulation the clock was as fast as
  you said it was. On a board there is one oscillator at one frequency,
  PLLs to make others, and a timing report that is no longer advisory
  ([chapter 11](11-synthesis-without-hardware.md)'s Fmax numbers become
  law).
- **The dopamine of physics.** A counter passing its testbench is
  satisfying. The same counter blinking an LED is, for reasons neuroscience
  can probably explain, *thrilling*. Do not underestimate this as fuel.

And one honest subtraction: **a board gives you less visibility, not
more.** In GTKWave you could see every signal on every cycle. On hardware
you can see the pins — that's it. When something misbehaves on the board,
the professional move is to reproduce it in the simulator, where you can
actually look. You will find yourself running back to `iverilog`
constantly. That instinct is not a crutch; it's exactly how working
engineers operate, and this guide's whole premise was teaching you the 90%
of the job that happens there.

## Choosing a board

The single most important criterion this guide can offer: **prefer boards
with mature open-toolchain support.** Everything you learned in
[chapter 11](11-synthesis-without-hardware.md) — Yosys, nextpnr, the whole
`make`-driven flow — carries straight over to these boards with no new
tools, no license servers, no 100 GB installers. Prices below are hedged on
purpose; check before ordering.

| Board | FPGA family | Why you'd pick it | Rough price (as of 2025) |
| --- | --- | --- | --- |
| [iCEBreaker](https://1bitsquared.com/) | Lattice iCE40 UP5K | *The* open-flow reference board — designed around the IceStorm toolchain, great PMOD ecosystem, big community. If this guide had a default answer, this is it. | roughly $70–80 |
| iCEstick | Lattice iCE40 HX1K | Tiny USB-stick starter. 1280 LUTs is cramped (your CPU won't fit) but blinky, UART and small FSMs live happily. | roughly $30–50 |
| TinyFPGA BX | Lattice iCE40 LP8K | Breadboard-friendly, minimalist, USB bootloader. Availability comes and goes. | roughly $40 |
| Fomu | Lattice iCE40 UP5K | Fits *inside* a USB port — the whole board disappears into the socket. Programs over DFU, no cables, pure fun. | roughly $50 |
| [ULX3S](https://github.com/emard/ulx3s) | Lattice ECP5 (12F–85F) | The do-everything board: SDRAM, HDMI, buttons, an ESP32 for WiFi. The 85F variant runs Linux-capable RISC-V SoCs. If you want one board for the entire project ladder below, it's this. | roughly $115–250 by variant |
| OrangeCrab | Lattice ECP5 (25F/85F) | ECP5 plus DDR3 in the compact Feather form factor — a serious part in a small footprint. | roughly $100–130 |
| Tang Nano 9K / 20K | Gowin GW1NR-9 / GW2AR-18 | Astonishingly cheap for the logic you get, with HDMI and PSRAM/SDRAM on board. Open flow exists (see below) but is younger than the Lattice ones. | roughly $15–30 |

Then there's the vendor-tool track. Digilent's **Arty A7** and **Basys 3**
(Xilinx Artix-7, roughly $150–330 by variant as of 2025) are the
university standards: bigger parts, polished documentation, and Vivado's
free tier with its mountain of mature IP blocks. The honest trade-offs:
Vivado is a tens-of-gigabytes install, runs on Linux and Windows only (no
native macOS — awkward given this guide's premise), and the flow is
closed, so the tooling knowledge is vendor-specific rather than portable.
If your university course or job uses Xilinx, get one and it will serve
you well. If you're choosing freely, the table above keeps you in the
toolchain you already know.

A note on those open flows, family by family: **IceStorm** (iCE40) is the
original bitstream reverse-engineering project and is essentially complete
— the iCE40 is arguably the best-documented FPGA on earth, vendor
included. **Project Trellis** (ECP5) is similarly solid and is how the
ULX3S and OrangeCrab communities work day to day. **Project Apicula**
(Gowin, for the Tang boards) is usable and improving but younger — expect
occasional rough edges. For Xilinx parts, reverse-engineering efforts
exist (Project X-Ray and the F4PGA project grew from them) but are
considerably less turn-key as of 2025; on a Xilinx board, plan on Vivado.

## Porting this guide's designs

Here is the bring-up ladder. Each rung is a design you already have,
plus the one new ingredient the physical world demands. Board specifics
below use the iCEBreaker; other boards change pin numbers and clock
frequencies, not ideas.

### Rung 1: the counter becomes a blinker

[Chapter 05](05-sequential-logic-and-fsms.md) promised that its
counter-plus-compare metronome would be the first thing you ever ported.
Time to pay that off. The [`counter.v`](../src/01-counter/counter.v) you
wrote in step 01 works unmodified — but wired straight to an LED at
12 MHz it would "blink" six million times a second, which to human eyes is
just *on*. So the first piece of real-hardware engineering is the
chapter 05 trick, sized for the real clock (illustrative):

```verilog
// Illustrative: blinky.v — chapter 05's metronome aimed at a real pin.
module blinky (
    input  wire clk,   // 12 MHz oscillator on the iCEBreaker
    output reg  led
);
    reg [22:0] cnt;
    always @(posedge clk) begin
        if (cnt == 6_000_000 - 1) begin
            cnt <= 0;
            led <= ~led;        // toggle every 0.5 s = 1 Hz blink
        end else
            cnt <= cnt + 1;
    end
endmodule
```

The second new ingredient is the **pin constraint file** — the contract
between your port names and the physical pins the board designer wired.
For iCE40 tools it's a PCF file, and it is refreshingly small
(illustrative; the numbers come from your board's schematic):

```text
# icebreaker.pcf — which port goes to which physical pin
set_io clk 35    # 12 MHz oscillator
set_io led 37    # user LED
set_io btn 10    # user button
```

Then the flow — the same Yosys front half you ran in
[chapter 11](11-synthesis-without-hardware.md), now carried through to a
bitstream and pushed over USB (illustrative):

```console
$ yosys -p 'synth_ice40 -top blinky -json blinky.json' blinky.v
$ nextpnr-ice40 --up5k --package sg48 --pcf icebreaker.pcf \
                --json blinky.json --asc blinky.asc
$ icepack blinky.asc blinky.bin
$ iceprog blinky.bin
```

Seconds later, a blinking LED. Enjoy it properly; you did chapters of work
for this moment. (A classic first hardware surprise: on many boards the
LEDs are wired *active-low*, so your blinker works perfectly but spends
its time off when you expect on. The schematic, not the simulator, is the
authority now.)

### Rung 2: the UART meets a real cable

[`uart_tx.v`](../src/03-uart-tx/uart_tx.v) is next, and it needs exactly
one change: `CLKS_PER_BIT` was 10 in simulation to keep tests fast, but a
real receiver holds you to the contract. At 12 MHz and 115200 baud:

```text
CLKS_PER_BIT = 12_000_000 / 115_200 ≈ 104
```

Most hobby boards' USB connector already includes a USB-to-UART bridge, so
there's no extra cable — route `tx` to the pin the schematic marks as the
FTDI/bridge RX, instantiate `uart_tx #(.CLKS_PER_BIT(104))`, and have a
little FSM send `"hello\n"` on loop. On your laptop:

```console
$ screen /dev/ttyUSB1 115200      # macOS: /dev/tty.usbserial-…
hello
hello
```

Bytes you understand down to the individual start bit, crossing a real
cable. The testbench that pretended to be the far end of the wire in
[chapter 05](05-sequential-logic-and-fsms.md) has been replaced by an
actual far end — and it agrees with your testbench.

### Rung 3: the CPU becomes an SoC

Now the jump that turns a board into a computer: put the
[chapter 08](08-build-a-cpu.md) CPU on the fabric, give it a block RAM
preloaded with a program (`$readmemh` at synthesis time — the
[chapter 06](06-memory.md) BRAM pattern carries over directly), and
**memory-map the UART**: decode some address range so that a store to,
say, `0x8000_0000` drops the byte into `uart_tx`'s `data` and pulses
`start`, and a load from `0x8000_0004` reads `busy` so software can poll
before sending. That's maybe thirty lines of address-decode glue, and the
result is a system-on-chip: your CPU, running your assembler's output,
printing to your terminal through your UART.

This is precisely the arc of Bruno Levy's
[learn-fpga "From Blinker to RISC-V"](https://github.com/BrunoLevy/learn-fpga),
which walks the same ladder on real boards in loving detail — the single
best companion for this chapter. Where this guide taught you to build the
CPU, learn-fpga is the field manual for making it breathe on hardware.

### What changes on real hardware

The checklist of things simulation let you ignore:

- **Initial values and resets.** In simulation, uninitialized registers
  are a visible `x`. On most FPGAs, flip-flops wake up in a state baked
  into the bitstream (which is why the blinker above gets away without a
  reset) — but that's a fabric favor, not a law of nature, and ASIC flows
  won't extend it. Keep the explicit reset ladder from
  [chapter 05](05-sequential-logic-and-fsms.md); wire reset to a button or
  a power-on counter.
- **Clocks come from PLLs.** Your board has one oscillator frequency; when
  a design needs a different one you instantiate the FPGA's PLL primitive
  to synthesize it (the iCE40 tools even ship a helper, `icepll`, that
  computes the settings). Dividing a clock with a counter is fine for
  *enables*; generating new clock domains by hand is how CDC bugs are
  born.
- **The outside world is asynchronous.** Buttons and an incoming UART line
  do not respect your clock edges. Pass every external input through a
  **two-flop synchronizer** before any logic looks at it — this is the
  metastability warning from the end of
  [chapter 05](05-sequential-logic-and-fsms.md), now live ammunition. And
  buttons bounce; chapter 05's exercise 1 debouncer stops being a toy.
- **Timing constraints are now enforced.** In [chapter 11](11-synthesis-without-hardware.md)
  a missed Fmax was an interesting number. On hardware, a path that
  doesn't meet timing fails *intermittently*, varying with temperature and
  voltage — the least fun bug class in the field. Constrain the clock,
  read the report, respect it.
- **Pins have voltage standards.** FPGA I/O banks speak 3.3 V (or lower).
  Wiring a 5 V peripheral straight in can kill the pin or the part. Read
  the schematic before you read the datasheet before you touch the wire.
- **Visibility collapses.** No more free waveforms of everything. Your
  debug tools are now LEDs, UART prints, and — overwhelmingly — going back
  to the simulator to reproduce the bug where you can see it.

## The plot twist: skip the FPGA, make a chip

Here is the ending this guide has been quietly walking toward. You spent
twelve chapters learning hardware design without hardware, on the argument
that RTL and verification are the real discipline and the FPGA is just one
way to run the result. Follow that argument one step further and it
arrives somewhere remarkable: **you can skip the FPGA entirely and put
your Verilog on an actual silicon wafer.**

[Tiny Tapeout](https://tinytapeout.com/) aggregates hundreds of small
designs onto shared ASIC shuttle runs on open 130 nm-class processes. You
submit Verilog; it flows through a fully open ASIC toolchain (the
OpenLane/LibreLane lineage — Yosys does the synthesis, so
[chapter 11](11-synthesis-without-hardware.md) already showed you the
front half); months later a real chip carrying your design arrives, with a
dev board to run it on. As of 2025 a tile costs on the order of $100–300 —
comparable to a mid-range FPGA board.

A tile holds roughly a thousand gates, give or take by shuttle — small,
but look back at your synthesis reports: the step 01 counter is a rounding
error, the [`uart_tx.v`](../src/03-uart-tx/uart_tx.v) FSM fits with room
to spare, and even a small systolic processing element from
[chapter 10](10-build-a-tpu.md) can squeeze in. Every skill transfers
unchanged: the testbench discipline of [chapter 04](04-simulation-and-testbenches.md)
matters *more* for an ASIC, because there is no reprogramming a wafer.

Sit with the shape of that arc for a second. You learned digital design
with zero hardware, on a laptop, for free — and the road onward doesn't
merely lead back to the FPGA board you skipped; it leads past it, to real
silicon with your name in the die art. Simulation-first wasn't the budget
option. It was the direct route.

## The project ladder

Where to go next, roughly in order of difficulty. Each rung is one line
here, and weeks of honest fun in practice:

1. **UART receiver + echo** — [chapter 05](05-sequential-logic-and-fsms.md)'s
   exercise 5, then loop RX to TX on a board and talk to your own fabric.
2. **PS/2 keyboard or rotary encoder** — a real external protocol, your
   two-flop synchronizers earning their keep.
3. **VGA/HDMI test pattern, then a framebuffer text mode** — timing
   generators and BRAM as pixel memory; [Project F](https://projectf.io/)
   is the definitive guide.
4. **An SDRAM controller** — [chapter 06](06-memory.md)'s promised boss
   fight: banks, refresh, and latency, on a ULX3S with real chips.
5. **Add a cache to the CPU** — [chapter 06](06-memory.md)'s theory meets
   [chapter 08](08-build-a-cpu.md)'s datapath.
6. **Pipeline the CPU properly** — the [chapter 08](08-build-a-cpu.md)
   capstone: five stages, hazards, forwarding.
7. **Interrupts + a timer + compiled C** — cross-compile with gcc for
   RV32I and run a real program on your own CPU.
8. **Read a [MiSTer](https://misterfpga.org/) core as literature** — the
   FPGA retro-computing project's cores are production-quality RTL
   recreating whole classic machines; reading one is a masterclass.
9. **Scale the TPU** — [chapter 10](10-build-a-tpu.md)'s exercise 6: BRAM
   operand buffers feeding a bigger array, the real memory-bandwidth
   lesson.
10. **Read [SERV](https://github.com/olofk/serv)** — the award-winning
    bit-serial RISC-V CPU, a full RV32I in a few hundred LUTs by computing
    one bit per cycle. It will bend your mind in the best way.
11. **Build an SoC with [LiteX](https://github.com/enjoy-digital/litex)** —
    a Python-driven SoC builder that composes CPUs, DRAM controllers, and
    Ethernet into working systems; the industrial-strength version of
    rung 3's hand-rolled SoC.
12. **A Tiny Tapeout submission** — see above. The counter you wrote in
    week one, in silicon.

## Beyond Verilog and VHDL

Verilog ([chapter 03](03-verilog-crash-course.md)) and VHDL
([chapter 12](12-the-vhdl-track.md)) are the incumbents, but a generation
of HDLs embedded in real programming languages is worth your attention:

- **[Amaranth](https://github.com/amaranth-lang/amaranth)** — Python-embedded
  HDL with excellent simulation and build tooling, tightly integrated with
  the Yosys world you already live in. The most natural next step from
  this guide.
- **[Chisel](https://github.com/chipsalliance/chisel)** — Scala-embedded;
  powers serious silicon, including the Rocket and BOOM RISC-V cores.
- **SpinalHDL** — also Scala; home of VexRiscv, one of the most
  widely-deployed soft RISC-V cores (and LiteX's usual CPU).
- **Clash** — Haskell as a hardware description language; circuits as pure
  functions.

None of them obsolete what you've learned, because they all *generate the
same hardware*: flip-flops, LUTs, block RAMs, the timing model of
[chapter 05](05-sequential-logic-and-fsms.md). An Amaranth design is still
"state in registers, combinational settling between edges, testbench or it
didn't happen." The concepts were always the asset; the syntax was just
the container.

## The bookshelf

| Resource | What it is | Why it earns the slot |
| --- | --- | --- |
| Harris & Harris, *Digital Design and Computer Architecture, RISC-V Edition* | Textbook | *The* book companion to chapters [03](03-verilog-crash-course.md)–[08](08-build-a-cpu.md): gates to a pipelined RISC-V, with HDL throughout. If you buy one book, this one. |
| Patterson & Hennessy, *Computer Organization and Design, RISC-V Edition* | Textbook | The CPU from the software boundary down; the classic undergrad architecture text. |
| Hennessy & Patterson, *Computer Architecture: A Quantitative Approach* | Textbook | The graduate-level depth behind chapters [09](09-build-a-gpu.md)–[10](10-build-a-tpu.md): memory hierarchy, GPUs, and domain-specific architectures. |
| [HDLBits](https://hdlbits.01xz.net/) | Exercise site | Hundreds of small Verilog drills with instant checking — the muscle-memory gym. |
| [ZipCPU blog](https://zipcpu.com/) | Blog | Verification and formal methods, opinionated and excellent; the strongest voice on "testbench or it didn't happen." |
| [Nandland](https://nandland.com/) | Tutorials | Beginner-friendly Verilog and FPGA walkthroughs (its UART pairs well with chapter [05](05-sequential-logic-and-fsms.md)). |
| [fpga4fun](https://www.fpga4fun.com/) | Project site | A grab-bag of small, fun FPGA projects — good raw material for the ladder above. |
| [Project F](https://projectf.io/) | Blog/tutorials | FPGA graphics done properly: VGA/HDMI timing, framebuffers, racing the beam. |
| [learn-fpga](https://github.com/BrunoLevy/learn-fpga) | Repo/tutorial | Bruno Levy's blinker-to-RISC-V episodes on real boards — this guide's field-work twin. |
| [tiny-gpu](https://github.com/adam-maj/tiny-gpu) | Repo | The annotated minimal GPU that inspired [chapter 09](09-build-a-gpu.md)'s approach — read it next to your own SIMT core. |
| Jouppi et al., "In-Datacenter Performance Analysis of a Tensor Processing Unit" (ISCA 2017) | Paper | The TPU paper: [chapter 10](10-build-a-tpu.md)'s systolic array at datacenter scale, with real measurements. |

For communities: **r/FPGA** on Reddit is active and beginner-tolerant;
various Discord servers exist around the YosysHQ and Amaranth projects
(they move — search for current invites), and IRC old-timers report
`##fpga` on Libera.Chat still answers questions. Lurk anywhere people post
timing reports.

## The map is yours

Trace the road back. Bits and LUTs
([chapter 01](01-what-is-an-fpga.md)). A toolbox that cost nothing
([02](02-the-toolbox.md)). A language that describes circuits, not
programs ([03](03-verilog-crash-course.md)). Testbenches as the real work
([04](04-simulation-and-testbenches.md)). State machines
([05](05-sequential-logic-and-fsms.md)), memories
([06](06-memory.md)), datapaths ([07](07-building-blocks.md)). Then the
three great machines — the latency machine, the throughput machine, the
dataflow machine ([08](08-build-a-cpu.md), [09](09-build-a-gpu.md),
[10](10-build-a-tpu.md)) — synthesized to honest LUT counts
([11](11-synthesis-without-hardware.md)), echoed in the other HDL
([12](12-the-vhdl-track.md)), and now pointed at real boards and real
silicon.

Sitting in [`src/`](../src/) on your laptop are running, tested
implementations of the three dominant compute architectures of our era.
You built them. You can open any signal in any of them and explain what it
does on every clock edge. Whatever the job titles say, hardware design is
now a thing you *do*, not a thing you're learning about.

So: buy a board or don't. Tape out a tile or don't. But keep the habit
that got you here — `make`, watch it pass, open the waveform, and then
flip a `<=` to an `=` just to watch the testbench catch it. Go break
something. You know how to fix it now.

And if you ever forget how far the road goes, it's all still there,
starting from a [single blinking counter](01-what-is-an-fpga.md) — [the
map is one page long](../README.md), and you've walked all of it.
