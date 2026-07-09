# 12 — The VHDL track

> Same gates, different accent. Everything you learned about hardware is
> language-independent; VHDL just spells it with more ceremony and a type
> system that catches you before the simulator does.

You have built a CPU, a GPU and a TPU in Verilog. None of that knowledge is
Verilog-specific — clock edges, flip-flops, FSMs, golden-model testbenches
and the "it's a circuit, not a program" mindset are properties of *hardware*,
not of syntax. This chapter proves it by re-deriving the guide's first design,
the [chapter 03](03-verilog-crash-course.md) counter, in the other mainstream
HDL, and hands you a phrasebook so you can read VHDL on sight. Skip it and you
lose nothing structural; read it and you become bilingual, which is worth more
on a résumé than it should be. The working code lives in
[`src/08-vhdl-counter/`](../src/08-vhdl-counter/) — one entity, one
architecture, one testbench, all passing under
[GHDL](https://ghdl.github.io/ghdl/).

## Two languages, one gate array

There are two HDLs in industrial use, and they exist for historical rather
than technical reasons.

**VHDL** (VHSIC Hardware Description Language) came out of a US Department of
Defense program in the early 1980s and borrows its grammar from **Ada**:
strongly typed, verbose, explicit, allergic to ambiguity. Everything is
declared and named, and the compiler would rather reject your code than guess.
The verbosity is not an accident — it is the safety philosophy showing through.
**Verilog** arrived a few years later from the commercial simulation world and
wears its **C** heritage openly: terse, expression-heavy, permissive. It lets
you write a lot of circuit in a few characters and — as
[chapter 03](03-verilog-crash-course.md)'s trap tour showed — a few bugs in a
few characters too. SystemVerilog (IEEE 1800) is its modern superset.

Which one people reach for is, as of the mid-2020s, more geography and
industry than merit — treat what follows as tendencies, not laws:

- **VHDL** skews toward European industry, and toward
  defense/aerospace/rail everywhere — domains that value auditability and
  strong typing, and whose codebases are decades old.
- **Verilog/SystemVerilog** dominates the commercial silicon industry: most
  US semiconductor companies, most ASIC flows, and essentially all of the
  UVM verification world.

Neither is "better hardware." Both feed the same synthesis tools and compile
down to **identical LUTs and flip-flops** — a synthesized VHDL counter and a
synthesized Verilog counter are the same netlist. The practical truth: working
engineers *read* both and *write* one. This chapter gets you the first half.

## GHDL: the free VHDL simulator

Verilog had Icarus and Verilator; VHDL has
**[GHDL](https://ghdl.github.io/ghdl/)**, an open-source simulator that is just
as free and just as scriptable (`brew install ghdl`, or `apt install ghdl`).
Its one quirk versus Icarus is a **three-step flow**, mirroring a compiled
language: **analyze** (`ghdl -a` — parse and type-check each source into a work
library), **elaborate** (`ghdl -e top` — link the hierarchy into a runnable
model), then **run** (`ghdl -r top`). For the counter, the whole cycle — the
exact recipe the [`src/Makefile`](../src/Makefile) uses for step 08 — is:

```console
$ cd src/08-vhdl-counter
$ ghdl -a --std=08 counter.vhd tb_counter.vhd
$ ghdl -e --std=08 tb_counter
$ ghdl -r --std=08 tb_counter
tb_counter.vhd:65:9:@156ns:(report note): ALL TESTS PASSED
```

`--std=08` selects **VHDL-2008**, the revision this chapter uses. That last
line is GHDL printing a `report` statement as a *note*, tagged with source
location and simulation time — more structured than Verilog's bare `$display`,
and the reason the testbench can be terse.

Waveforms work like the Verilog side, with a different flag: pass `--wave` on
the **run** step and open the result in the same
[GTKWave](https://gtkwave.sourceforge.net/) or Surfer you've used all guide.

```console
$ ghdl -r --std=08 tb_counter --wave=counter.ghw
$ gtkwave counter.ghw
```

(GHDL writes GHW natively, or VCD with `--vcd=counter.vcd`.) And synthesis is
not off-limits: the **ghdl-yosys-plugin** lets
[Yosys](https://yosyshq.net/yosys/) read VHDL through GHDL, so the
[chapter 11](11-synthesis-without-hardware.md) LUT-and-timing flow applies to
VHDL too. It ships in the OSS CAD Suite bundle; if your Yosys lacks it, that's
the piece to add — worth checking the plugin's docs for your version.

## The counter, side by side

Here is the design you already know, [`counter.v`](../src/01-counter/counter.v):

```verilog
module counter #(
    parameter WIDTH = 8
) (
    input  wire             clk,
    input  wire             rst,   // synchronous, active-high
    input  wire             en,
    output reg [WIDTH-1:0]  count
);

    always @(posedge clk) begin
        if (rst)
            count <= {WIDTH{1'b0}};
        else if (en)
            count <= count + 1'b1;
    end

endmodule
```

And the same circuit in [`counter.vhd`](../src/08-vhdl-counter/counter.vhd):

```vhdl
library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;          -- unsigned/signed types + arithmetic

entity counter is
    generic (
        WIDTH : positive := 8
    );
    port (
        clk   : in  std_logic;
        rst   : in  std_logic;     -- synchronous, active-high
        en    : in  std_logic;
        count : out std_logic_vector(WIDTH - 1 downto 0)
    );
end entity;

architecture rtl of counter is
    signal cnt : unsigned(WIDTH - 1 downto 0) := (others => '0');
begin

    process (clk)
    begin
        if rising_edge(clk) then
            if rst = '1' then
                cnt <= (others => '0');
            elsif en = '1' then
                cnt <= cnt + 1;
            end if;
        end if;
    end process;

    count <= std_logic_vector(cnt);

end architecture;
```

Same flip-flops, and once you learn the accent, a near-line-by-line
translation. The differences worth naming:

- **The preamble.** VHDL declares nothing implicitly. `library ieee; use
  ...std_logic_1164.all;` imports the four-state logic type; `numeric_std`
  imports `unsigned`/`signed` and their arithmetic. Verilog bakes those in;
  VHDL makes you ask — you'll type this three-line header atop every file.
- **Interface vs implementation are split.** Verilog's `module` bundles ports
  and body together. VHDL separates the **`entity`** (the pin-out, the public
  contract) from the **`architecture`** (one implementation of it — you can
  write several; the counter has one, named `rtl`).
- **`generic` is `parameter`.** Same compile-time knob, different keyword. Note
  the type — `WIDTH : positive` won't even let the width be zero or negative.
- **Ports are typed.** `std_logic` is one wire; `std_logic_vector(WIDTH-1
  downto 0)` is a bus. `downto` isn't decoration — it makes bit direction
  explicit, giving the `[MSB:LSB]` ordering this guide uses. Directions are
  words: `in`, `out`.
- **The typed count.** The big one. `count` is a `std_logic_vector` — a bag of
  bits with *no arithmetic meaning*; you cannot add `1` to it. So the design
  keeps an internal `signal cnt : unsigned(...)`, adds on that, and converts
  back with an explicit `std_logic_vector(cnt)` on the way out. Verilog's
  `count + 1'b1` "just works" because every net is silently a number; VHDL
  forces you to declare *what kind* — the same discipline that prevents the
  signedness ambush from [chapter 08](08-build-a-cpu.md) (more below).
- **`rising_edge(clk)` inside `process(clk)`** is the flip-flop, replacing
  `always @(posedge clk)`. And `count <= ...` uses `<=`, which — pleasingly —
  means the same scheduled, "all flops update together" thing it does in
  Verilog.

## The testbench, side by side

The Verilog testbench counted errors in an `integer`. VHDL replaces that manual
bookkeeping with the built-in **`assert`**, seen here in
[`tb_counter.vhd`](../src/08-vhdl-counter/tb_counter.vhd):

```vhdl
        -- count ten ticks
        en <= '1';
        for i in 1 to 10 loop
            wait until rising_edge(clk);
        end loop;
        wait for 1 ns;
        assert unsigned(count) = 10
            report "count /= 10 after ten enabled cycles" severity failure;
```

Read `assert COND report MSG severity LEVEL` as: *if `COND` is false, print
`MSG` at severity `LEVEL`.* The severity is the trick — `severity failure`
tells GHDL to **abort with a non-zero exit code**, so a broken assertion fails
the shell command and the Makefile catches it, exactly like the Verilog grep
contract. On success the testbench falls through to:

```vhdl
        report "ALL TESTS PASSED";   -- GHDL prints this as a note
        done <= true;
        wait;
```

and the [`src/Makefile`](../src/Makefile) closes the loop the same way it does
for every Verilog step — run, tee the log, grep for the banner:

```make
08-vhdl-counter:
	cd $@ && $(GHDL) -a --std=08 counter.vhd tb_counter.vhd \
		&& $(GHDL) -e --std=08 tb_counter \
		&& $(GHDL) -r --std=08 tb_counter | tee sim.log \
		&& grep -q "ALL TESTS PASSED" sim.log
```

Two more idioms earn their keep. First, the **self-stopping clock**. Verilog's
`always #5 clk = ~clk;` runs forever and needs `$finish`; VHDL has no
`$finish`, so the clock gates itself on a `done` flag:

```vhdl
    -- 100 MHz clock that stops when the test is done
    clk <= not clk after 5 ns when not done else '0';
```

When `done` goes true the clock stops toggling, no events remain scheduled,
and GHDL exits on its own. Second, **`wait`** is how a process spends time:
`wait until rising_edge(clk)` blocks until the next edge (Verilog's
`@(posedge clk)`), and `wait for 1 ns` advances physical time — the direct
analog of the guide's `#1` settle delay, sampling the output a hair after the
edge once it has settled.

## The phrasebook

The section to bookmark. Almost everything in the guide's Verilog has a
mechanical VHDL translation:

| Concept | Verilog | VHDL |
| --- | --- | --- |
| Design unit | `module ... endmodule` | `entity` (interface) + `architecture` (body) |
| Compile-time knob | `parameter WIDTH = 8` | `generic (WIDTH : positive := 8)` |
| A wire / a driven net | `wire` | `signal` |
| A signal assigned in a block | `reg` | `signal` (or `variable`, inside a process) |
| Single bit | `wire x;` | `signal x : std_logic;` |
| Bus | `wire [7:0] x;` | `signal x : std_logic_vector(7 downto 0);` |
| Flip-flops | `always @(posedge clk)` | `process(clk)` + `if rising_edge(clk)` |
| Combinational block | `always @*` | `process(all)` *(VHDL-2008)* |
| Continuous assign | `assign y = a & b;` | `y <= a and b;` (concurrent) |
| Scheduled assign (in a process) | `<=` (non-blocking) | `<=` (signal) |
| Immediate assign (in a process) | `=` (blocking) | `:=` (variable) |
| Multiplexer | `case ... endcase` | `case ... when ... end case;` |
| State encodings | `localparam S0=2'd0, ...` | `type state_t is (S0, S1, ...);` |
| Print a message | `$display("...")` | `report "..."` |
| Self-check | `if (x !== y) errors=...` | `assert x = y report "..." severity failure;` |
| Load a hex file | `$readmemh("f.hex", mem)` | `textio` (see below — more friction) |
| Structural repetition | `generate` | `generate` (same keyword) |
| Concatenation | `{a, b}` | `a & b` |
| Logical AND | `a & b` | `a and b` |
| Numeric add on a bus | `a + b` (implicitly) | `unsigned(a) + unsigned(b)` (explicitly) |

Three rows deserve a closer look, because they trip up crossers.

**Concatenation vs AND — the `&` trap.** In Verilog, `&` is bitwise-AND and
`{a,b}` is concatenation. In VHDL it's the reverse: `&` is **concatenation**
and `and` is the logical operator. So Verilog's `{hi, lo}` becomes `hi & lo`,
and `a & b` becomes `a and b`. Read a VHDL `x & y` as "glue these together,"
never "AND these" — getting it backwards produces a width mismatch the compiler
(helpfully) rejects.

**Blocking/non-blocking maps onto variables/signals — carefully.** The deepest
correspondence. In [chapter 03](03-verilog-crash-course.md), `<=` (non-blocking)
sampled all right-hand sides *before* any update; `=` (blocking) updated
immediately, in sequence. VHDL splits the same idea across two *kinds of object*:

- A **`signal`** updates on a scheduled delay (the delta cycle) — its new value
  is invisible to later statements in the same process pass. Precisely Verilog's
  non-blocking `<=`. Use signals for state.
- A **`variable`** (declared inside a process, assigned with `:=`) updates
  **immediately**, and later statements see the new value — precisely Verilog's
  blocking `=`. Use variables for scratch arithmetic within one process pass.

The mental swap: instead of picking an *operator* per block, VHDL picks an
*object kind*. The counter uses a signal (`cnt <= cnt + 1`) — state that updates
on the edge; a running loop accumulator would be a variable. Same
two-phase-vs-immediate distinction, relocated from `=`/`<=` to
`variable`/`signal`.

**Enumerated state types beat `localparam`.** Verilog encodes FSM states as
integer constants: `localparam S0 = 2'd0, S1 = 2'd1;`. It works, but nothing
stops you assigning `state <= 2'd7` to a 2-bit state, the waveform shows
inscrutable `2'b01`, and widening the machine means re-hand-numbering. VHDL
gives states a **type**:

```vhdl
type state_t is (IDLE, START, DATA, STOP);
signal state : state_t := IDLE;
...
case state is
    when IDLE  => if start = '1' then state <= START; end if;
    when START => state <= DATA;
    when DATA  => if last  = '1' then state <= STOP;  end if;
    when STOP  => state <= IDLE;
end case;
```

The compiler assigns the bit encoding (synthesis can pick one-hot or gray),
out-of-range assignments **won't compile**, and the waveform shows `DATA`, not
`2'b10`. A `case` on an enum must cover every value — the completeness rule from
[chapter 03](03-verilog-crash-course.md), enforced instead of merely advised.

One row hides real friction: **`$readmemh` has no clean equivalent.** Loading a
hex file into a memory — the trick the CPU and TPU use to preload programs and
weights — is a one-liner in Verilog. In VHDL it means the `std.textio` packages:
open a file, loop, `readline`, `hread` each value. Fifteen lines instead of one,
and the single most annoying part of porting the guide's later designs.

## What VHDL does better (and worse)

Honest scorecard. VHDL genuinely wins in a few places:

- **Strong typing catches width and type bugs at compile time.** Assign a
  10-bit vector to an 8-bit signal and Verilog truncates in silence
  ([chapter 03](03-verilog-crash-course.md)'s trap #3); VHDL refuses to compile.
- **No signedness ambush.** `integer`, `unsigned` and `signed` are *distinct
  types* you convert between explicitly. The [chapter 08](08-build-a-cpu.md) war
  story — where an explicit `$signed()` cast was silently overruled by an
  unsigned operand elsewhere in the expression, turning an arithmetic shift into
  a logical one — **cannot happen in VHDL.** Mixing `unsigned` and `signed` is a
  type error the compiler rejects, not a subtle wrong answer the testbench has
  to catch.
- **Enumerated types and records.** Enums you just saw. A **record** bundles
  related signals into one named aggregate — a control word, say:

  ```vhdl
  type ctrl_t is record
      reg_write : std_logic;
      mem_read  : std_logic;
      alu_op    : std_logic_vector(3 downto 0);
  end record;
  ```

  One `ctrl` carries the whole word; `ctrl.alu_op` names a field. Threading a
  decoder's output through a datapath as one typed record beats a dozen loose
  wires you must keep in order at every port map. Verilog needs SystemVerilog's
  `struct` to match this.
- **Physical time units are first-class.** `after 5 ns`, `wait for 1 ns` — time
  carries units the type system checks.

And where VHDL is worse — the flip side of the same coin:

- **Ceremony and verbosity.** The library header, the entity/architecture split,
  `end process; end architecture;` — more typing to say the same thing.
- **Conversions everywhere.** `std_logic_vector(cnt)`, `unsigned(count) = 10` —
  the type safety comes billed in casts on every boundary between "bits" and
  "numbers." What Verilog does implicitly, you do by hand.
- **Slower to prototype.** For throwaway experiments, Verilog's permissiveness
  is a feature, not a bug.

Both languages narrowed the gap from their own ends. **SystemVerilog** gave
Verilog `logic`, `enum`, `struct`, and `always_ff`/`always_comb` blocks that
*enforce* the two golden rules — importing much of VHDL's safety. **VHDL-2008**
gave VHDL `process(all)` (no more hand-written combinational sensitivity lists)
and other quality-of-life fixes. The 2020s versions are closer than their 1990s
reputations suggest.

## Do you need VHDL?

If you learned hardware the way this guide teaches it — concepts first, syntax
second — then VHDL is an **accent, not a new language**. You already know what
a synchronous process, an enumerated FSM, a golden-model testbench and a
valid/ready handshake *are*; this chapter and the phrasebook are enough to
read them in VHDL, and a week of writing makes you productive.

So the decision is not intellectual, it's logistical. Pick by the world you're
entering:

- **Job market / employer.** If the postings in your region or field say
  VHDL — European industry, defense, aerospace, rail — learn to write it.
- **Team and codebase.** You write what the repository is written in. A
  million lines of VHDL don't get rewritten because you prefer braces.
- **Otherwise, default to SystemVerilog.** It's the larger share of the
  commercial silicon world and the whole UVM verification ecosystem.

There is also **neutral ground**: [cocotb](https://www.cocotb.org/), the
Python-testbench framework from [chapter 04](04-simulation-and-testbenches.md),
drives **either** HDL. The *same* Python coroutine that clocks and checks a
Verilog `counter.v` will clock and check the VHDL `counter.vhd` under GHDL —
the DUT's language is just a Makefile variable. And when your VHDL projects
outgrow bare `assert`, the framework to know is **[OSVVM](https://osvvm.org/)**
(Open Source VHDL Verification Methodology), VHDL's answer to UVM. Build your
understanding once, in whichever HDL is in front of you, and rent the syntax as
the job requires.

## Exercises

1. **Translate the ALU.** Port [`src/02-alu/alu.v`](../src/02-alu/alu.v) to
   `alu.vhd`: the ten operations become a `case` on `op`, with arithmetic on
   `signed`/`unsigned` views converted back to `std_logic_vector`. Then port
   `tb_alu.v`'s golden-model loop — drive random `a`, `b`, `op` and `assert`
   the output equals a VHDL-computed reference, `severity failure` on mismatch.
   Note which bugs the *compiler* catches that Verilog left for the testbench.
2. **Translate the FIFO.** Port [`src/04-memory/fifo_sync.v`](../src/04-memory/fifo_sync.v).
   The one-extra-bit pointer trick needs `unsigned` pointers and explicit
   slicing; the memory is an `array` of `std_logic_vector`. The full/empty
   comparisons mix a wrap bit with an address slice — VHDL makes you be
   explicit about both.
3. **An enumerated-state UART.** Redo the [chapter 05](05-sequential-logic-and-fsms.md)
   UART transmitter FSM with `type state_t is (IDLE, START, DATA, STOP)`
   instead of encoded constants. Compare the waveform — named states vs raw
   bit patterns — and try assigning an out-of-range state to watch it fail to
   compile.
4. **One testbench, two DUTs.** Write a single [cocotb](https://www.cocotb.org/)
   test (the [chapter 04](04-simulation-and-testbenches.md) counter test is a
   fine start) and run it against **both** `counter.v` (under Icarus) and
   `counter.vhd` (under GHDL), changing only the simulator/language variables.
   Same Python, same pass — the point of the exercise.
5. **Synthesize it.** If your Yosys has the ghdl-yosys-plugin, synthesize the
   VHDL counter and compare its LUT/FF count to the Verilog counter from
   [chapter 11](11-synthesis-without-hardware.md). They should match — same
   gates. (Hedge: the exact invocation depends on your plugin build; check its
   docs.)

## Further reading

- [The GHDL documentation](https://ghdl.github.io/ghdl/) — the analyze /
  elaborate / run flow, the `--std` versions, waveform and synthesis options.
- [cocotb](https://www.cocotb.org/) — the Python testbench framework that
  makes your verification HDL-agnostic; the quickest way to keep one test and
  swap the DUT's language.
- [OSVVM](https://osvvm.org/) — the standard open-source VHDL verification
  methodology, for when your VHDL projects outgrow bare `assert`.
- Peter Ashenden, *The Designer's Guide to VHDL* — the thorough print
  reference, the VHDL counterpart to Harris & Harris's HDL chapters.
- [HDLBits](https://hdlbits.01xz.net/) is Verilog-only, but its problem set
  translates cleanly — solving a few in VHDL on your own is the fastest way to
  build the finger memory this chapter can only describe.

---

*Next: [Chapter 13 — Hardware at last](13-hardware-and-beyond.md)*
