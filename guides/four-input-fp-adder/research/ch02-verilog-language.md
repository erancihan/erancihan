# Chapter 2 Research Notes — The Verilog Language (First Contact)

<!-- sections complete: 9/9 -->

Source notes for the chapter author. Notes, not prose — this runs long on purpose so the
writer can cut rather than research. Every `E<n>.<m>` / `X<n>.<m>` tag quoted below is real
captured stdout from a file compiled with `iverilog -g2012 -Wall` and run under `vvp` on
**Icarus Verilog 13.0**; nothing behavioural here is quoted from an LRM without being run.
Deviations between the standard and what Icarus actually does are called out inline.

## 1. What Verilog is and is not

**HDL vs programming language**
- Verilog *describes hardware structure and behaviour*; it does not describe a sequence of machine instructions. The output of the flow is a circuit, not a binary.
- Software mental model to discard: "the program runs top to bottom". A Verilog module is a **set of concurrent things that all exist at once**. Order of `assign` statements, `always` blocks, and module instances in the file is irrelevant to the hardware.
- Where sequencing exists (inside a `begin`/`end` in a procedural block) it is sequencing *within one process*, and even there the semantics are event-scheduling semantics, not CPU semantics.
- The language is really two languages fused: a **description language** (the part that becomes gates) and a **simulation control language** (`initial`, `$display`, `#delay`, file I/O). Chapter 2 must keep those visibly separate for the reader.

**Description vs execution**
- A simulator *executes an event-driven model of* the description. `iverilog` compiles `.v` into a vvp program; `vvp` runs the event scheduler.
- Nothing in the language forces the simulated behaviour and the synthesised behaviour to agree. That gap is the source of most "it simulated fine" bugs, and it is why a synthesisable subset exists.

**Three abstraction levels** (a module may mix all three)
| Level | Constructs | Example |
|---|---|---|
| Behavioural | `always`, `initial`, `if`, `case`, `for`, `function`, `task`, delays | `always @(*) if (a>b) y = a; else y = b;` |
| RTL / dataflow | `assign`, operators, concatenation | `assign {cout,sum} = a + b + cin;` |
| Structural / gate | module instances, gate primitives `and`/`or`/`xor`/`not`/`buf` | `xor g1 (s, a, b);` |
- For this guide: chapter 1's gate-level adders map to *structural*; the FP adder body will be mostly *dataflow + behavioural RTL*.

**Synthesisable subset vs full language, and why the gap exists**
- The full language must model *existing* silicon and testbenches: delays (`#5`), `initial`, file I/O, `force`/`release`, `$random`, strengths, UDPs, four-state `x`/`z` propagation.
- A synthesis tool must map a description to a finite library of gates and flip-flops. It cannot map: absolute delays, `initial` blocks (mostly), unbounded `while`, `real`, dynamic memory allocation, `===`/`!==`, `$display`.
- The subset is standardised separately: **IEEE 1364.1-2002** (Verilog RTL synthesis) — historically the canonical reference, itself now withdrawn; in practice vendor guides (AMD/Xilinx UG901, Intel Quartus HDL style guide) are what people follow.
- **Icarus Verilog does not synthesise.** It simulates only. Nothing in this guide will be checked by a synthesis tool, so the chapter must teach the reader to *self-police* the subset. Say this explicitly — it is the single most important framing sentence in the chapter.

**Elaboration vs simulation vs synthesis** — three distinct phases, readers conflate them
1. **Parse / preprocess** — `` `define ``/`` `include `` expanded, tokens checked. Errors here are syntax errors.
2. **Elaboration** — the module hierarchy is built: parameters resolved, instances created, array/vector sizes fixed, generate blocks unrolled, port connections bound, implicit nets created. Everything about the design's *shape* is frozen here. Icarus reports these as `N error(s) during elaboration.`
3. **Simulation** — the event scheduler runs; time advances; `initial`/`always` processes execute.
4. **Synthesis** (a separate tool, not Icarus) — elaborated RTL is mapped to a gate/LUT netlist.
- Useful teaching point: a `parameter` is resolved at elaboration, so it can size a vector; a `reg` value is a simulation-time thing and cannot.

**History — accurate version**
- Verilog was created at **Automated Integrated Design Systems** (renamed **Gateway Design Automation** in 1985) by **Prabhu Goel, Phil Moorby and Chi-Lai Huang**, "between late 1983 and early 1984". [verified: Wikipedia]
- **Cadence Design Systems purchased Gateway in 1990.** (The commonly repeated "1989" is the year of the Gateway/Cadence deal being announced in some accounts; Wikipedia states 1990 — prefer 1990 or write "1989-1990".) [verified]
- Facing VHDL competition, Cadence put the language in the public domain in **1990** under **Open Verilog International (OVI)**; OVI later merged into **Accellera**.
- **IEEE 1364-1995** ("Verilog-95") — first IEEE standard.
- **IEEE 1364-2001** ("Verilog-2001") — the big one: ANSI port lists, `generate`, `signed` arithmetic, `localparam`, indexed part-select `+:`/`-:`, `**`, `` `default_nettype ``, multi-dimensional arrays, `automatic`, `$clog2` came slightly later (2005).
- **IEEE 1364-2005** — maintenance revision; adds `$clog2`, `uwire`, minor fixes. **This is the baseline for this guide.**
- **IEEE 1364-2005 was merged into SystemVerilog in 2009, producing IEEE 1800-2009.** [verified]
- **Current status of 1364-2005: "Superseded Standard"** on the IEEE standards site, superseded by IEEE 1800-2009. [verified: https://standards.ieee.org/ieee/1364/3641/]
- Correct phrasing for the chapter: *there is no longer a separate Verilog standard.* "Verilog" today means "the Verilog-compatible subset of IEEE 1800 SystemVerilog" (current revision IEEE 1800-2023). Do not write "IEEE 1364 is the current Verilog standard".
- Icarus's own `-g` flags still name the old standards (`-g1995 -g2001 -g2005 -g2005-sv -g2009 -g2012`), which is a convenient hook for explaining the lineage.

**What Icarus is**
- Icarus Verilog (Stephen Williams, 2000–2026) is a compiler + `vvp` runtime. Version reported by the installed toolchain: `Icarus Verilog version 13.0 (stable) (v13_0)`.
- Supports 1364-1995/2001/2005 well, plus a **partial** IEEE 1800 subset. Many SystemVerilog behavioural features (classes, most assertions, `logic`-only flows in places, constrained randomisation) are missing or incomplete.
- **Observed deviation:** the online docs list `-g2017` and `-g2023`; the installed 13.0 binary's `-ghelp` lists only up to `2012`. Write the guide against `-g2012`.

## 2. Modules and ports

**The module is the only unit of design.** No functions-at-top-level, no globals. `module name (...); ... endmodule`. Modules do not nest textually (no `module` inside `module`); hierarchy is built by *instantiation*.

**ANSI-style port list (Verilog-2001+, use this)** — tested, compiles clean under `-g2012 -Wall`:
```verilog
module adder_ansi #(parameter W = 8)
  (input  wire [W-1:0] a,
   input  wire [W-1:0] b,
   input  wire         cin,
   output wire [W-1:0] sum,
   output wire         cout);
  assign {cout, sum} = a + b + cin;
endmodule
```

**Non-ANSI / Verilog-1995 style** — show once so the reader can read old code, then never use again:
```verilog
module adder_1995 (a, b, cin, sum, cout);
  parameter W = 8;
  input  [W-1:0] a;
  input  [W-1:0] b;
  input          cin;
  output [W-1:0] sum;
  output         cout;
  wire   [W-1:0] sum;   // redundant: outputs default to wire
  reg            cout;  // output declared reg -> must be driven procedurally
  always @(*) cout = (a + b + cin) >> W;
  assign sum = a + b + cin;
endmodule
```
- Non-ANSI needs the name **three times** (header list, direction declaration, optional type declaration). ANSI needs it once. That redundancy is the entire argument.
- Parameters in non-ANSI style are declared in the body; in ANSI style in `#( ... )`.

**Directions**
- `input`, `output`, `inout`. Direction is mandatory in ANSI style.
- **Port direction default:** if a port is listed but its direction never declared, it is an error in ANSI style; in non-ANSI style a missing direction declaration is an error too. What *does* default is the **type**: a port with a direction but no type defaults to `wire` (governed by `` `default_nettype ``).
- Vector range on a port carries: `input wire [W-1:0] a`.

**`wire` vs `reg` on ports — the rule readers need**
- `input` ports: always a net inside the module. Cannot be a `reg`. (An input is driven from outside; a procedural block inside would be a second driver.)
- `output` ports: **`wire` if driven by `assign` or by an instance; `reg` if driven from inside an `always`/`initial` block.** That's the whole rule.
- ANSI shorthand: `output reg [7:0] y` is legal and common.
- `inout`: must be a net (`wire`/`tri`), driven with `assign ... = oe ? d : 1'bz;`. Never a `reg`.
- Tested `inout` (from `e18_types.v`), with `pullup (padw);` on the net:
  ```
  E18.10 inout with oe=0 (pullup) : pad=1 dout=1
  E18.11 inout with oe=1, drv=0   : pad=0 dout=0
  ```

**Icarus deviation — continuous assignment to a variable**
```verilog
module x5; reg r;
  assign r = 1'b1;
```
- `-g2005` / `-g1995`: `error: Variable 'r' cannot be driven by a continuous assignment/module.` plus the helpful note `: This is allowed when SystemVerilog is enabled.`
- `-g2012`: **accepted and runs** (`X5 r=1`). SystemVerilog permits continuous assignment to variables; classic Verilog does not.
- Teaching consequence: at `-g2012` Icarus will *not* catch the beginner's `assign` to a `reg`. Mention it as a self-discipline rule.

**Instantiation**
```verilog
adder_ansi          u1 (.a(a), .b(b), .cin(cin), .sum(s1), .cout(c1));  // named
adder_ansi          u2 (a, b, cin, s2, c2);                             // positional
adder_ansi #(.W(4)) u4 (.a(a[3:0]), .b(b[3:0]), .cin(cin), .sum(s4), .cout(c4));
```
- Instance name is mandatory for module instances (optional for gate primitives).

**Positional vs named — the demo that makes the case.** From `e8_ports.v`, `u3` deliberately swaps `b` and `cin` positionally:
```verilog
adder_ansi u3 (a, cin, b, s3, c3);   // b <- cin, cin <- b
```
Output with `a=200, b=100, cin=1`:
```
e8_ports.v:37: warning: Port 2 (b) of module adder_ansi expects 8 bit(s), given 1.
e8_ports.v:37:        : Padding 7 high bits of the port.
e8_ports.v:37: warning: Port 3 (cin) of module adder_ansi expects 1 bit(s), given 8.
e8_ports.v:37:        : Pruning 7 high bits of the expression.
E8.1 named      u1: sum=45 cout=1
E8.2 positional u2: sum=45 cout=1  (same as u1)
E8.3 MIS-WIRED  u3: sum=201 cout=0
```
- Note the mis-wire only produced a **warning**, not an error, and only because the widths happened to differ. Swap two same-width ports and Icarus says nothing at all. That is the argument for named connection: it is the only form the compiler can check.
- Those port-width warnings come from the `portbind` warning class, which `-Wall` enables. Always compile with `-Wall`.

**Parameters**
- `parameter` — overridable from outside (by `#()` or `defparam`). `localparam` — **not** overridable; use it for derived constants so a caller cannot break internal invariants.
```verilog
module fp #(parameter EXP_W = 8, parameter MAN_W = 23)
  (...);
  localparam WIDTH = 1 + EXP_W + MAN_W;   // derived: must not be overridden
  localparam BIAS  = (1 << (EXP_W-1)) - 1;
```
- Parameters are resolved at **elaboration**, so they can size vectors, bound `for` loops, and feed `generate`.
- Type of a parameter is inferred from its default value unless declared (`parameter integer N = 4;`, `parameter [7:0] MASK = 8'hF0;`). An untyped `parameter W = 8;` behaves as a 32-bit signed integer — relevant to width rules in §5.

**Override syntax**
- `#(.W(4))` — named override, preferred.
- `#(8)` — positional override; same fragility as positional ports. Tested working: `adder_1995 #(8) u5 (a, b, cin, s5, c5);`
- **`defparam s2.P = 99;`** — tested, **works in Icarus at `-g2005`, `-g2009`, `-g2012`, with no anachronism warning even under `-Wall`**:
  ```
  E16.4 sub.P = 1
  E16.4 sub.P = 99
  ```
  Deprecated in IEEE 1364-2005 Annex C and slated for removal in SystemVerilog; it breaks tool flows because the override lives *away* from the instance and the LRM leaves the ordering of multiple `defparam`s to the same parameter unspecified. **Rule for the guide: read it, never write it.**

**Hierarchical names**
- Dotted path from any module instance: `e8.u4.W`, `u1.a`. Tested:
  ```
  E8.6 hierarchical: e8.u4.W = 4 ; u1.a = 200 ; %m = e8
  ```
- Legal in testbenches for probing; **not synthesisable**. `%m` in a `$display` format prints the current scope.
- Generate blocks create scopes too: `e14.bitloop[3].<name>`.

**The implicit-wire hazard**
- Verilog's oldest wart: an undeclared identifier used where a net is expected is silently created as a **1-bit** wire.
- Tested (`e12_ctxwidth.v`), LHS typo `godo` instead of `good`:
```verilog
  wire [3:0] good;
  assign godo = a[3:0] & b[3:0];   // typo -> implicit 1-bit wire
```
```
e12_ctxwidth.v:19: warning: implicit definition of wire 'godo'.
E12.5 good = zzzz  (never driven, typo went to 'godo')
E12.6 godo = 0  ($bits=1)
```
- **Important observed nuance:** implicit nets are created only where the LRM says they can be — the **LHS of a continuous assignment** and **port connections**. A typo on the *right-hand side* is a hard error in Icarus:
  ```
  e10_typo.v:4: error: Unable to bind wire/reg/memory `tnp' in `e10.u'
  ```
  So the dangerous case is narrower than folklore suggests, but it is exactly the case that silently changes a 4-bit signal into a 1-bit one.
- **The defence:** put `` `default_nettype none `` at the top of every file, and `` `default_nettype wire `` at the bottom if the file is `` `include ``d into others.
  ```
  e9b.v:23: error: Unable to bind wire/reg/memory `never_declared' in `e9'
  e9b.v:23: error: Net dangling_out is not defined in this context.
  ```
- **Icarus deviation to flag:** under `` `default_nettype none ``, a bare ANSI port `input a` (no `wire` keyword) **is still accepted by Icarus** — tested, compiles clean. Other tools error. So `` `default_nettype none `` does not force the reader to write `input wire a` here; the guide should still insist on the explicit `wire`, for portability.

## 3. Data types and values

**The four-state value set** — every bit of every net and every `reg` holds one of four values:
| Value | Meaning in simulation | Physical reading |
|---|---|---|
| `0` | logic zero | driven low |
| `1` | logic one | driven high |
| `x` | *unknown* | simulator does not know: uninitialised, a driver conflict, or a value that depends on a race. **Not** "any value" and **not** a real voltage. |
| `z` | high impedance | no driver at all; the net floats. Reading a floating net gives whatever a pull-up/pull-down or a connected driver decides. |
- `x` is the simulator's way of saying "I refuse to guess". It is a *modelling* value; real silicon has no `x`. Synthesis treats `x` in a case item or `if` as a don't-care, which is exactly the sim/synth mismatch risk.
- Uninitialised `reg`s start at `x`; uninitialised nets sit at `z`. Tested: `E12.5 good = zzzz` (undriven wire), `E18.8 unwritten mem[0]=xx` (unwritten reg array word).

**Nets vs variables — the fundamental split**
- **Nets** model wires. A net has **drivers**; its value is the *resolution* of all drivers, recomputed continuously. Cannot be assigned procedurally.
  - `wire` — one driver expected, multiple drivers resolve to `x` on disagreement.
  - `tri` — same resolution as `wire`, name signals intent (three-state bus).
  - `wand` / `wor` — wired-AND / wired-OR resolution.
  - `supply0` / `supply1` — constant 0 / 1 with supply drive strength (ground/Vdd rails).
  - `uwire` (1364-2005) — unresolved wire, exactly one driver allowed.
  - `trireg`, `tri0`, `tri1` — exist; not needed for this guide.
- **Variables** model storage in the *simulator*, not necessarily in hardware.
  - `reg` — four-state, any width. Assigned only in procedural blocks (`always`/`initial`) or as a `function`/`task` output.
  - `integer` — four-state, **32-bit signed**. Verified: `$bits(integer)` = 32, `-1` prints as 32 ones, `(i < 0)` is `1`.
  - `real` — a C `double`. Two-state; no `x`/`z`. Not synthesisable.
  - `time` — 64-bit unsigned. Verified: `$bits(time)` = 64.
  - `realtime` — `real` alias for time values.
- Tested multi-driver resolution (`e15_struct.v`, `a=1, b=0`):
  ```
  E15.4 two drivers a=1 b=0 -> conflict=x  wand=0  wor=1
  E15.5 a=1 b=1        -> conflict=1  wand=1  wor=1
  E15.6 supply1/0 bus = 1010
  ```

**`reg` does not mean register.** Say this loudly and early.
- `reg` means "a variable that holds its value between procedural assignments". It is a *storage cell in the simulator's memory*.
- `always @(*) y = a + b;` with `output reg [7:0] y` synthesises to **pure combinational logic** — no flip-flops. Verified `m_ansi` and `m_nonansi` in `e11_star.v` both produce `y = 44` for 200+100 with no storage.
- A flip-flop appears only from a clocked `always @(posedge clk)`, which is chapter 3.
- SystemVerilog's `logic` was introduced precisely to kill this confusion. Icarus supports `logic` at `-g2005-sv` and above; the guide targets `-g2012`, so `logic` is available — **decide once and be consistent**. Recommendation: stay with `wire`/`reg` in chapter 2 because chapter 1 and most reference material use them, and note `logic` as the modern spelling.

**Vectors and `[msb:lsb]`**
- `reg [7:0] byte_var;` — 8 bits, bit 7 is the MSB. This "descending" / big-endian-index form is the near-universal convention.
- `reg [0:31] be;` — ascending form. Legal, and the *bit numbering reverses*, not the value. Tested:
  ```verilog
  reg [0:31] be;  be = 32'hDEAD_BEEF;
  ```
  ```
  E4.5  be[0:7]=de be[24:31]=ef   (reg [0:31])
  ```
  compared with the normal declaration `reg [31:0] v = 32'hDEAD_BEEF`:
  ```
  E4.1  v=deadbeef  v[15:8]=be  v[31:28]=d
  ```
- Rule for the guide: **always declare `[N-1:0]`**. Mixed conventions in one design are a reliable source of reversed-bit bugs.

**Part-selects**
- Constant part-select `v[15:8]` — the range direction must match the declaration direction.
- Bit-select `v[3]`.
- Out-of-range selects are **not errors**: they return `x`, with a warning under `-Wall` (`select-range` class):
  ```
  e4_partsel.v:33: warning: Part select [35:32] is selecting after the vector v[31:0].
  e4_partsel.v:33:        : Replacing the out of bound bits with 'bx.
  E4.8  v[35:32] = x
  ```

**Indexed part-select `[base +: width]` / `[base -: width]`** (Verilog-2001; the barrel-shifter workhorse)
- `v[base +: width]` selects `width` bits starting at `base` and going **up** in bit number: for a descending vector this is `v[base+width-1 : base]`.
- `v[base -: width]` selects `width` bits ending at `base` and going **down**: `v[base : base-width+1]`.
- **The width must be a constant; only the base may be a variable.** This is the entire point — plain `v[k*8+7 : k*8]` is illegal because both bounds vary; `v[k*8 +: 8]` is legal because the width is fixed. A fixed-width selector with a variable offset is exactly a multiplexer, which is why it synthesises.
- Tested (`e4_partsel.v`, `v = 32'hDEAD_BEEF`):
  ```verilog
  for (k = 0; k < 4; k = k + 1)
    $display("v[%0d*8 +: 8] = %h", k, v[k*8 +: 8]);
  ```
  ```
  E4.2  v[0*8 +: 8] = ef
  E4.2  v[1*8 +: 8] = be
  E4.2  v[2*8 +: 8] = ad
  E4.2  v[3*8 +: 8] = de
  E4.3  v[31 -: 8] = de   (8 bits ending at 31, descending)
  E4.4  variable base k=1 : v[k*8 +: 8] = be
  E4.9  v[40 +: 4] = x    (out of range indexed -> x, warning under -Wall)
  ```
- FP relevance: a normalising shifter can be written as a chain of `+:` selects, or (simpler for this guide) as `mant << shamt` with an explicit leading-zero count. Show both.

**Arrays vs vectors — different things**
- A **vector** is one multi-bit value: `reg [7:0] v;`  → `v` participates in arithmetic, can be part-selected, can be a port.
- An **array** is many separate values: `reg [7:0] mem [0:255];` → `mem` is 256 independent 8-bit words. `mem` as a whole is **not** an expression; only `mem[i]` is.
- Range *before* the name = vector width; range *after* the name = array depth. Memorable phrasing: **"width on the left, depth on the right."**
- Verilog-2001 allows a part-select of an array element: `mem[1][3:0]`. Tested: `E4.7 mem[1][3:0] = 2`.
- Arrays cannot be ports in classic Verilog, cannot be assigned whole, cannot be printed whole. `$bits(mem[0])` = 8 (tested); `$bits(mem)` is a SystemVerilog thing and best avoided in Icarus.
- Multi-dimensional: `reg [7:0] m2 [0:15][0:15];` legal from 1364-2001.

**Memories**
- `reg [7:0] mem [0:255];` is the canonical ROM/RAM model. Read `mem[addr]`, write `mem[addr] <= d;`.
- Initialise from a file with `$readmemh`/`$readmemb` (see §8) — tested working in Icarus.
- Unwritten words read as `x`. Tested: `E18.8 ... unwritten mem[0]=xx`.

**`signed`**
- `reg signed [7:0] s;` and `wire signed [7:0] ws;` (both Verilog-2001).
- `integer` is signed by default; `reg`/`wire` are unsigned by default.
- Signedness is a property of the *declaration*, and it changes: which of `>>` / `>>>` sign-extends, how `<`, `/`, `%` behave, and how the value extends when widened. Full treatment in §5.
- Tested sign-extension on assignment (`e1_width.v`):
  ```
  E1.5 u8 = 8'b00001001   (unsigned 4'b1001 zero-extended)
  E1.6 s8 = 8'b11111001 = -7 (signed reg sign-extended)
  E1.7 w8 = 8'b11111001   (signed 4-bit source assigned to UNSIGNED 8-bit target)
  ```
  **Key finding: extension is decided by the signedness of the *source expression*, not the target.** `E1.7` surprises people.
- Array elements keep the signedness: `reg signed [7:0] sm [0:3];` → `E18.9 sm[0] = -5`.

**`integer`**
- 32-bit, signed, four-state. Use for loop counters in testbenches and inside `function`s.
- Do **not** use as a `generate` loop variable — that requires `genvar` (see §9).

**`real`**
- IEEE double. Useful only in testbenches — e.g. computing the expected FP result in C-like arithmetic and comparing against the DUT.
- `real` → `integer` assignment **rounds** (ties away from zero); `$rtoi` **truncates**. Tested:
  ```
  E18.4 integer = 2.5 rounds to 3      // assignment rounds
  E18.5 integer = 3.5 rounds to 4
  E18.3 ... $rtoi(2.5) = 2             // $rtoi truncates
  ```
- Integer division on integers truncates: `1/2 = 0`, but `1.0/2.0 = 0.5`. Tested (`E18.6`).
- **Big win for this guide (tested, works):** Icarus 13.0 at `-g2012` supports `shortreal`, `$shortrealtobits` and `$bitstoshortreal`, i.e. a direct route between a host double/float and the exact IEEE-754 bit pattern. This is how the chapter-14 testbench should build its golden model.
  ```verilog
  shortreal sr; reg [31:0] b32;
  sr  = 1.5;   b32 = $shortrealtobits(sr);
  ```
  ```
  X8.1 $shortrealtobits(1.5) = 3fc00000
  X8.2 $bitstoshortreal(32'h40490fdb) = 3.141593
  X8.3 $realtobits(1.5) = 3ff8000000000000     // 64-bit double form
  ```
  `$realtobits`/`$bitstoreal` (64-bit) verified round-trip clean: `E5.19 ... ok=1`.

**Strings**
- Classic Verilog has no string type: a string literal is a sequence of 8-bit character codes packed into a vector, left-padded with zeros.
  ```verilog
  reg [8*12-1:0] str;  str = "hello";
  ```
  ```
  E18.1 str as %s = '       hello' ; as hex = 0000000000000068656c6c6f ; $bits=96
  E18.2 "A" == 8'h41 -> 1 ; "ab" = 6162
  ```
  Note the leading spaces in `%s` — the zero-padding prints as blanks. Mention it or the reader will think `$display` is broken.
- SystemVerilog's `string` type: Icarus has partial support; avoid in this guide.

**`parameter` typing**
- `parameter W = 8;` → untyped, takes the type/size of its value (32-bit signed here).
- `parameter [7:0] MASK = 8'hF0;` → explicitly 8 bits unsigned.
- `parameter integer N = 4;` / `parameter real K = 1.5;` → explicitly typed.
- An untyped parameter used to size something is fine; an untyped parameter used *in an expression* brings 32-bit signed semantics with it, which can flip an expression's signedness. Cross-reference §5.

## 4. Literals and number syntax

**Full form:** `<size>'<signed><base><value>`
- `<size>` — width **in bits**, a decimal number, no base prefix. `8'hFF` is eight bits, not eight hex digits.
- `'` — mandatory tick.
- `<signed>` — optional `s` or `S`, makes the literal a *signed* value.
- `<base>` — `b`/`B` binary, `o`/`O` octal, `d`/`D` decimal, `h`/`H` hex. Case-insensitive.
- `<value>` — digits legal for the base, plus `_` separators, plus `x`/`z`/`?` (not in decimal).

**Tested reference set** (`e7_fill.v`, `-g2012 -Wall`):
```
E7.5  underscores in literals: 8'b1010_0101 -> 10100101
E7.6  4'hA=1010  4'o7=0111  4'd9=1001  4'b1010=1010
E7.7  4'bx1 -> xxx1   (x left-extends with x)
E7.8  4'bz1 -> zzz1   (z left-extends with z)
E7.9  4'b10 -> 0010   (0 left-extends with 0)
E7.10 'h1F unsized = 31, width 32
E7.11 sized-too-small: 4'd31 -> 1111 (truncated)
E7.12 'sd5 signed unsized: 5 ; -'sd5 = -5
```

**Sized vs unsized**
- Sized: `8'd5`, `16'hBEEF`, `1'b0`.
- Unsized with base: `'h1F`, `'d42` → **32 bits** (the LRM says "at least 32"; Icarus gives exactly 32, verified by `$bits('h1F) = 32`).
- Bare decimal: `42` → also 32-bit, **signed**. This is why `-1` works as expected in an `integer` context and why `1 << 40` overflows.
- **The 32-bit unsized rule, demonstrated** (`e1_width.v`):
  ```verilog
  reg [63:0] big;
  big = 1 << 40;     // 1 is a 32-bit literal
  big = 64'd1 << 40; // explicitly 64-bit
  ```
  ```
  E1.3 (1<<40)     = 1099511627776
  E1.4 64'd1<<40   = 1099511627776
  ```
  **Correct the folklore here.** Both give the right 64-bit answer, because in `<<` the *left* operand is context-determined, so the assignment widens the `1` to 64 bits before shifting. The bare-literal shift only loses bits when the surrounding context is 32 bits or the expression is self-determined. Verified all four cases:
  ```
  X9.3 32-bit ctx  1<<40        = 00000000            <-- lost
  X9.5 64-bit ctx  1<<40        = 0000010000000000    <-- fine
  X9.6 64-bit ctx  1'b1<<40     = 0000010000000000    <-- fine (context widens 1'b1 too!)
  X9.7 self-det    {1'b1<<40}   = 0000000000000000    <-- lost, concatenation is self-determined
  X9.8 self-det    {32'd1<<40}  = 0000000000000000    <-- lost
  ```
  Also verified: an **unsized** literal cannot be a concatenation operand at all —
  `error: Concatenation operand "('sd1)<<('sd40)" has indefinite width.`

**Underscores**
- Legal anywhere except as the first character, in any base. Purely cosmetic. `32'b0_10000000_00000000000000000000000` is the readable way to write an IEEE-754 single-precision `2.0` and the chapter should adopt exactly this style.

**`x` and `z` in literals**
- One `x`/`z` digit sets **all bits of that digit position**: in hex, one `x` = 4 unknown bits; in octal, 3.
- `?` is a synonym for `z`, intended for `casez` items.
- **Left-extension rule:** when a sized literal is shorter than its size, the fill value is `0` if the leftmost specified digit is `0`/`1`, but `x` if it is `x`, and `z` if it is `z`. Verified above (E7.7/E7.8/E7.9). This is a real rule, not a quirk, and it bites when someone writes `8'bx` expecting one x bit — they get eight.
- `8'bx` → `xxxxxxxx`. Tested in E3.7 as `8'bxxxxxxxx === 8'bx` semantics.

**Fill literals `'0` `'1` `'x` `'z`** (SystemVerilog)
- Fill the target width with that value, whatever the width is. Tested, **all four work in Icarus at `-g2012`**:
  ```verilog
  reg [11:0] f;
  f = '0;  f = '1;  f = 'x;  f = 'z;
  ```
  ```
  E7.1  f = '0  -> 000000000000
  E7.2  f = '1  -> 111111111111
  E7.3  f = 'x  -> xxxxxxxxxxxx
  E7.4  f = 'z  -> zzzzzzzzzzzz
  ```
- **At `-g2005` Icarus warns rather than errors:**
  ```
  e7_fill.v:8: warning: Using SystemVerilog 'N bit vector. Use at least -g2005-sv to remove this warning.
  ```
- Caution: in a *self-determined* context, `'1` collapses. Tested: `$bits('1) = 1`. So `{'1, x}` is not "all ones then x". Use `'1` only as a whole right-hand side or a port connection where a width is imposed.
- `'0`/`'1` are excellent for FP work (`exp <= '1;` to make an infinity/NaN exponent) but the guide should mention they are a SystemVerilog import, so `-g2012` is required.

**Signed literals `'sd`, `'sh`, `'sb`**
- `4'sb1001` is the signed value **-7**, not 9. Tested:
  ```
  E1.8 w8 = 8'b11111001   (4'sb1001 assigned to unsigned 8-bit reg -> sign-extended)
  E1.9 w8 = 8'b11111001   (-4'sd7)
  ```
- Note that `-4'd7` and `4'sb1001` produce the same **bit pattern** in an 8-bit context but *not* the same signedness downstream. `-4'd7` is an unsigned 4-bit `1001` (tested: `E17.15 -4'd1 = 1111`, `$signed(-4'd1) = -1`).
- **`'sd` is not the same as `s` on the reg.** A signed literal makes *that operand* signed; a signed reg makes *that variable* signed. Both feed the same expression-signedness rule (§5).

**Sizing and extension rules — the careful version**
1. **A sized literal wider than its value is left-extended** by `0`/`x`/`z` per the rule above. The `s` flag does **not** cause sign-extension of the literal's own digits. Verified: `X9.1 8'sb1 -> 00000001`, `X9.2 8'sb1x -> 0000001x`.
2. **A sized literal narrower than its value is truncated from the left, silently, with only a warning** in Icarus:
   ```
   e7_fill.v:18: warning: Numeric constant truncated to 4 bits.
   E7.11 4'd31 -> 1111
   ```
   This warning appears **with or without `-Wall`** (verified: same message with plain `iverilog -g2012`).
3. **An unsized literal is 32 bits**, signed if bare decimal, unsigned if it has a base prefix without `s`.
4. **When an operand is narrower than the expression width, it is extended**:
   - **unsigned operand → zero-extend** (`E1.5`: `u8 = 4'b1001` gives `00001001`);
   - **signed operand → sign-extend** (`E1.6`: `s8 = s4` gives `11111001`).
   - The decision is made by the **source expression's signedness**, not the destination's. `E1.7` proves it: a signed 4-bit reg assigned to an *unsigned* 8-bit reg still sign-extends → `11111001`.
5. **Assignment to a narrower target truncates the high bits, silently.** `E1.10: sum4 = 8'hFF` → `1111`. Icarus emits **no warning at all** for this even under `-Wall` — verified separately as `X9.9 n4 = 8'hFF -> 1111 (no warning emitted)`. Only *constant expressions written directly as a literal* get the rule-2 warning. This is the single most dangerous silent behaviour in the language for FP mantissa work.
6. Real→integer assignment rounds; integer→real is exact up to 2^53.

**Style rules to hand the reader**
- Always size your literals. `8'd0` not `0`, except where a bare small integer is genuinely a count (loop bounds, replication counts, parameter defaults).
- Use `_` in anything over 8 bits.
- Never write a decimal literal for a bit pattern; use `'b` or `'h`.
- Reach for `'0`/`'1` for width-agnostic constants, and remember they need `-g2012`.

## 5. Operators

**Precedence table**, highest first. Verilog's table is close to C's, with the reduction operators bolted on at the top.

| Prec | Operators | Assoc | Notes |
|---|---|---|---|
| 1 (highest) | `+ - ! ~ & ~& \| ~\| ^ ~^ ^~` (all **unary**) | right | unary arithmetic, logical NOT, bitwise NOT, **reduction** |
| 2 | `**` | left | power (Verilog-2001) |
| 3 | `* / %` | left | |
| 4 | `+ -` (binary) | left | |
| 5 | `<< >> <<< >>>` | left | |
| 6 | `< <= > >=` | left | |
| 7 | `== != === !== ==? !=?` | left | `==?`/`!=?` are SystemVerilog wildcard equality |
| 8 | `&` (binary) | left | |
| 9 | `^ ~^ ^~` (binary) | left | |
| 10 | `\|` (binary) | left | |
| 11 | `&&` | left | |
| 12 | `\|\|` | left | |
| 13 | `?:` | right | |
| 14 (lowest) | `{}` `{{}}` | — | concatenation/replication are really primaries; listed last because they impose no precedence |
- Practical guidance: **parenthesise anything mixing `&`/`|`/`^` with `==`**. The bitwise-below-equality ordering is inherited from C and is the classic `if (a & MASK == 0)` bug.

**Arithmetic** `+ - * / % **`
- All operate on the **whole vector**, not bit-by-bit. Overflow wraps (no exception), truncated to the expression width.
- `/` and `%` on **unsigned**: plain magnitude division, remainder always non-negative.
- `/` and `%` on **signed**: truncates toward zero; **`%` takes the sign of the dividend**. Verified (`e2_signed.v`):
  ```
  E2.1  -8 / 3    = -2      (both signed)
  E2.4  -8 % 3    = -2      (sign of dividend)
  E2.5  8 % -3    =  2  ;  -8 % 3 = -2
  ```
- `/` and `%` by a variable are usually **not synthesisable** to anything cheap. Division by a power-of-two constant becomes a shift. The FP adder needs no divider.
- `**` exists but is only synthesisable with constant operands.

**The signed/unsigned contamination rule** — state it as a law:
> An expression is treated as **signed only if every operand is signed**. One unsigned operand makes the entire expression unsigned, and every operand is then re-interpreted as an unsigned bit pattern.

Verified, and the result is genuinely startling (`e2_signed.v`, `sa = -8`, `ua = 8'd2`):
```
E2.1 sa/sb  = -2    (both signed:  -8/3)
E2.2 sa/ua  = 124   (one unsigned: 248/2 -- the -8 became 248)
E2.3 sa/$signed(ua) = -4
```
And in a relational comparison (`sa = -1` as a signed 8-bit, `8'd0` unsigned):
```
E2.6 (-8'sd1 < 8'd0)                    = 0    <-- WRONG-looking, but correct per the rule
E2.7 ($signed(8'hFF) < $signed(8'h00))  = 1
```
- The fix is always `$signed()` / `$unsigned()` on the offending operand, or declaring the variable `signed`.
- `$signed(expr)` / `$unsigned(expr)` **reinterpret the bits; they do not convert the value and do not change the width.** Verified: `E5.8 $signed(8'hFF) = -1`, `$unsigned(-8'sd1) = 255`.
- Practical rule for this guide: FP mantissa and exponent paths should be **unsigned everywhere**, with the sign handled as an explicit separate bit, and the exponent difference computed in a deliberately widened signed value. Mixed signedness inside a mantissa datapath is a bug factory.

**Relational** `< <= > >=`
- Result is 1 bit: `1`, `0`, or `x` if either operand contains `x`/`z`.
- Operands are context-determined **against each other** (widened to the wider of the two), then compared. The 1-bit result does *not* narrow them.

**Equality — four operators, two families**
| Operator | Name | `x`/`z` handling | Result | Synthesisable |
|---|---|---|---|---|
| `==` | logical equality | any `x`/`z` in either operand ⇒ result `x` | 0/1/x | yes |
| `!=` | logical inequality | same | 0/1/x | yes |
| `===` | case equality | compares `x` and `z` **literally** | 0/1 only | **no** |
| `!==` | case inequality | same | 0/1 only | **no** |

Verified (`e3_ops.v`, `a = 8'b1010_101x`, `b = 8'b1010_1010`):
```
E3.5  a==b -> x   a===b -> 0   a!==b -> 1
E3.7  8'bx === 8'bx -> 1 ;  8'bx == 8'bx -> x
E3.6  reg assigned (a==b) = x ;  if (a==b) takes the ELSE branch
```
- Why `===` is simulation-only: there is no gate that can distinguish "unknown" from "one". `x` is a property of the *model*, not of silicon. A synthesis tool would have to invent a signal that does not exist. Use `===` only in testbench self-checking, e.g. `if (dut_out !== expected) $error(...)`.
- **`if (x)` is false.** An `x` condition takes the `else` branch (verified E3.6). This is why an `x` in a design can hide: it does not crash, it just silently picks a path.
- `==?` / `!=?` (SystemVerilog wildcard equality: `x`/`z`/`?` in the **right** operand are don't-cares, the left operand is matched exactly) — **verified working in Icarus 13.0 at `-g2012`**:
  ```
  X10.1 4'b1010 ==? 4'b10zz -> 1
  X10.2 4'b1010 ==? 4'b11zz -> 0
  X10.3 4'b1010 !=? 4'b10zz -> 0
  ```
  Because the wildcards are one-sided, this is the safe alternative to `casex` (§7/§9).

**Logical vs bitwise — the #1 novice confusion**
- **Logical** `&& || !`: reduce each operand to a single truth value (non-zero ⇒ true), return **1 bit**.
- **Bitwise** `& | ^ ~ ~^`: operate **per bit**, return a vector as wide as the expression.
Verified (`a = 8'b0000_0010`, `b = 8'b0000_0100`):
```
E3.9  a&&b = 1          a&b = 00000000
      a||b = 1          a|b = 00000110
      !a   = 0          ~a  = 11111101
```
- `a & b` here is **zero** while `a && b` is **one**. Show this exact pair in the chapter.
- Use `&&`/`||`/`!` in conditions, `&`/`|`/`^`/`~` in datapaths.

**Reduction operators — one operand, one-bit result**
`&a` `~&a` `|a` `~|a` `^a` `~^a` (`^~a` is a synonym for `~^a`).
- `&a` — 1 iff **all** bits are 1 (all-ones detect).
- `|a` — 1 iff **any** bit is 1 → **`|a == 0` is the zero-detect**, and `~|a` is "a is zero".
- `^a` — **parity** (odd number of ones).
- Verified (`a = 8'b1011_0010`):
  ```
  E3.1  &a=0  |a=1  ^a=0  ~&a=1  ~|a=0  ~^a=1
  E3.2  a=8'h00 : |a=0 , ~|a=1
  ```
- `x` propagation through reductions is *selective*, and this matters:
  ```
  E3.3  a=1011001x : |a=1  &a=0  ^a=x      <-- OR and AND resolve, XOR cannot
  E3.4  a=0000000x : |a=x                   <-- unknown could be 1, so OR is unknown
  ```
- **FP relevance — the sticky bit.** After right-shifting a mantissa by the exponent difference, the sticky bit is "did any 1 fall off the end", i.e. a reduction OR over the discarded bits:
  ```verilog
  wire sticky = |mant_shifted_out;      // or |src[shamt-1:0] with a mask
  ```
  Verified idiom:
  ```
  E3.14 sticky = |sticky_src[4:0] = 1 ; |sticky_src[3:0] = 0   (src = 24'h000010)
  ```
- **Parity** for error detection: `wire parity = ^data;`.
- Note the syntactic ambiguity: `a & b` is binary AND, `&b` alone is reduction AND. Context disambiguates, but `a & &b` needs the space.

**Shifts**
| Operator | Name | Fill |
|---|---|---|
| `<<` | logical left | zeros |
| `>>` | logical right | zeros |
| `<<<` | arithmetic left | zeros (identical to `<<` in effect) |
| `>>>` | arithmetic right | **sign bit, but only if the left operand is signed** |
- The signedness rule is the whole story, and Icarus follows it exactly (`e2_signed.v`, `sa = -8` signed, `ua = 8'b1000_0000` unsigned):
```
E2.10 sa>>1              = 01111100 (124)   logical right, zero fill
E2.11 sa>>>1             = 11111100  (-4)   arithmetic, sign fill (operand is signed)
E2.12 ua>>>1             = 01000000         >>> on an UNSIGNED operand still zero-fills
E2.13 $signed(ua)>>>1    = 11000000         cast makes it sign-fill
E2.14 r<<4 = 0010 ; r<<<4 = 0010            <<< and << identical
```
- **`>>>` on an unsigned operand is not an error and not a warning — it is simply a logical shift.** That is the trap.
- The **right** operand of a shift is always **self-determined** and always treated as **unsigned**. A negative shift count is therefore a huge positive one.
- The **left** operand of a shift is **context-determined** — see the width algorithm below; this is why `a << 1` in a same-width assignment loses the top bit.

**Conditional operator `? :`**
- `cond ? then_expr : else_expr`. This is a 2:1 multiplexer in hardware; nest it for priority mux chains.
- The selector is **self-determined** and reduced to a truth value. The two arms are **context-determined** together with the result.
- **`x` on the selector does not give `x` blindly** — it gives a bitwise merge: bits where both arms agree keep their value, bits that differ become `x`. Verified:
  ```
  E3.12 (1'bx ? 8'hAA : 8'hAA) = aa
  E3.13 (1'bx ? 8'hAA : 8'h55) = xx
  ```
  This is an excellent teaching moment for what `x` really means.

**Concatenation `{}` and replication `{n{expr}}`**
- `{a, b, c}` joins vectors left-to-right, MSB-first. Width = sum of operand widths.
- **All concatenation operands are self-determined**, so unsized literals are illegal inside `{}` (verified: `error: Concatenation operand "..." has indefinite width.`).
- `{n{expr}}` repeats `expr` n times; `n` must be a constant. `{{4{s}}, x}` is the idiomatic **sign extension**.
- Concatenation is a legal **left-hand side**: `assign {cout, sum} = a + b + cin;` is the standard carry-out idiom and the single most useful line in this whole chapter.
- Verified:
  ```
  E3.10 {4'ha,4'h5} = a5 ; {3{2'b10}} = 101010 ; {2{a[3:0]}} = 22
  ```

**Self-determined vs context-determined — treat as a first-class topic**

*The rule.* Verilog sizes an expression in two passes.
1. **Pass 1 (bottom-up): compute the expression's own width.** For most binary operators the width is `max(width(L), width(R))`; for an assignment the target's width joins the max; for a shift it is the left operand's width; for `{}` it is the sum.
2. **Pass 2 (top-down): propagate that width back into every context-determined operand**, extending each per its own signedness.

*Which operands are which:*
| Context-determined (grow to the expression width) | Self-determined (fixed at their own width) |
|---|---|
| operands of `+ - * / % & \| ^ ~^` | every operand of `{}` and `{n{}}` |
| both arms of `?:` | the selector of `?:` |
| the **left** operand of `<< >> <<< >>>` | the **right** operand of a shift |
| both operands of `== != === !== < <= > >=` **relative to each other** | the whole result of a comparison (1 bit) |
| the RHS of an assignment (joined with the LHS width) | operands of `&&`, `\|\|`, `!` and all reduction operators |

*The demonstrations.* From `e17_selfdet.v` with `a = 4'hF`, `b = 4'h1` (so a+b = 16, which needs 5 bits):
```
E17.1  r8 = a + b            = 00010000   8-bit context -> add done at 8 bits, correct
E17.2  r4 = a + b            = 0000       4-bit context -> carry lost
E17.3  r8 = {a + b}          = 00000000   concat operand is SELF-determined: 4-bit add
E17.4  r8 = {1'b0, a + b}    = 00000000   the leading 0 does not help
E17.5  r8 = {4'b0,a}+{4'b0,b}= 00010000   explicit widening: correct
E17.8  r8 = {2{a + b}}       = 00000000   replication operand also self-determined
E17.9  r8 = a ? (a+b) : 8'hFF= 00010000   ?: arms ARE context-determined
```
**E17.3 vs E17.1 is the money shot of this whole section**: the same subexpression, in one case 8 bits wide and in the other 4, decided entirely by whether it sits inside braces.

Shift-operand self-determination:
```
E17.6  r16 = 16'h0001 << (a + b);          -> 0001   (a+b evaluated at 4 bits = 0)
E17.7  r16 = 16'h0001 << (5'(a) + 5'(b));  -> 0000   (a+b = 16, shift past the top)
```

Comparison operands size against **each other**, not against the 1-bit result:
```
E17.10 ((a+b)      == 5'd16) = 1   <-- the 5-bit literal widened the add to 5 bits!
E17.11 (({1'b0,a}+{1'b0,b}) == 5'd16) = 1
```
This one is genuinely counter-intuitive and worth a callout: the *literal on the right* silently fixed the truncation on the left.

**The real-world consequence Icarus will show you.** In `e11_star.v`, this innocuous carry-out extraction:
```verilog
module m_shift (a, b, y);
  parameter W = 8;
  input  [W-1:0] a, b;
  output y;  reg y;
  always @(*) y = (a + b) >> W;   // y is 1 bit -> a+b is evaluated at 1 bit
endmodule
```
Icarus constant-folds the whole thing to zero and then tells you the block is dead:
```
e11_star.v:19: warning: @* found no sensitivities so it will never trigger.
E11 y1=44 y2=44 y3=x
```
`y3` stays `x` forever. The same shape appears in `e12_ctxwidth.v` as a continuous assignment:
```
E12.2 cout_bad  = 0   ((a+b)>>8 with 1-bit context)
E12.4 wide=300 cout_ok=1 sum=44   (assign wide = a+b; assign cout_ok = wide[8];)
```
**The fix is always the same: make the result wide enough first, then select from it.** `{cout,sum} = a + b + cin` or `wide[8]`.

**Signedness in operators — the rest of the rules**
- Unary `-` on an unsigned operand produces an unsigned two's-complement bit pattern: `E17.15 -4'd1 = 1111`, `$signed(-4'd1) = -1`, `-a` with `a = 4'hF` gives `0001`.
- Multiplication contaminates just like division:
  ```
  E17.12 s4 * 2          = -4    (bare 2 is a signed literal -> stays signed)
  E17.13 s4 * 4'd2       = 28    (4'd2 is unsigned -> whole expr unsigned)
  E17.14 s4 * $signed(4'd2) = -4
  ```
  `s4 = -4'sd2`, so the correct answer is `-4`. `E17.13` shows a *bare `4'd2` silently changing the sign of the result* — this is the trap in its purest form, and it is one keystroke away from correct code.
- Concatenation results are **always unsigned**, regardless of the operands. Verified with `s = -4'sd2`:
  ```
  X10.4 r = {s}  -> 00001110    (concat strips signedness: no sign extension)
  X10.5 r = s    -> 11111110    (plain assignment sign-extends)
  X10.6 ({s} < 0) = 0  ;  (s < 0) = 1
  ```
  So `{a}` is a cheap way to strip signedness, and `{1'b0, x}` is the idiomatic "widen and force unsigned".
- `$signed()` / `$unsigned()` are the surgical fix. They are **system functions, synthesisable**, and they change only the signedness attribute, not the width or the bits.

## 6. Continuous assignment and structural composition

**`assign` — the continuous assignment**
```verilog
assign sum = a ^ b ^ cin;
assign {cout, sum} = a + b + cin;
```
- Semantics: **whenever any operand on the right changes, the left side is recomputed and updated.** It is a permanent, always-active connection — a piece of combinational logic, not an event.
- Not a statement in a program. It has no position in time. Ten `assign`s in a module are ten pieces of logic that all exist simultaneously; reordering the lines changes nothing.
- LHS must be a **net** (or a concatenation/part-select of nets). In classic Verilog it may not be a `reg` — but see the Icarus `-g2012` deviation in §2 (Icarus accepts it under SystemVerilog rules).
- RHS may be any expression, including function calls.
- The RHS is context-determined against the LHS width — the source of the width bugs in §5.

**Net declaration assignment** (declaration and assignment in one)
```verilog
wire nda = a & b;      // exactly equivalent to: wire nda; assign nda = a & b;
```
- Verified working: `E15.6 ... net decl assign nda = 1`.
- Allowed **once per net** — you cannot re-declare. Good for short intermediate signals; it also keeps the declaration and the driver adjacent, which is a real readability win in a wide FP datapath.

**Implicit continuous assignment**
- A third form: connecting an expression to an `output` port at instantiation implicitly creates a continuous assignment. Related to the implicit-net rule in §2 — mentioning it once is enough.

**Drive strength (mention only)**
- `assign (strong1, weak0) y = a;` and the eight strength levels (`supply`, `strong`, `pull`, `weak`, `highz`, plus `large`/`medium`/`small` for `trireg`).
- Used only for analogue-ish bus modelling and switch-level work. **Ignore for this guide** beyond knowing `supply0`/`supply1` exist and that `pullup`/`pulldown` provide a weak default on a tri-state net (verified in `e18_types.v`: with `oe=0` a `pullup` made the pad read `1`).

**Multiple drivers**
- Two `assign`s to the same `wire` are two drivers. Where they agree the net takes that value; where they disagree it goes to **`x`**. Verified:
```verilog
assign conflict = a;
assign conflict = b;
```
```
E15.4 a=1 b=0 -> conflict=x   wand=0  wor=1
E15.5 a=1 b=1 -> conflict=1   wand=1  wor=1
```
- **Icarus does not warn about this by default.** A multi-driver net is almost always a mistake in RTL (in real hardware it is a short). The `x` is your only signal — teach the reader to treat any unexpected `x` as "look for two drivers or an uninitialised reg".
- `wand`/`wor` change the resolution function instead of producing `x` (`wand` = AND of drivers, `wor` = OR), which is how open-drain buses are modelled.
- A `reg` driven from two different `always` blocks is the same class of bug but *without* the `x` — it becomes a race, and the last write wins non-deterministically. Chapter 3 territory.

**Gate primitives**
- Built into the language, no library needed. **Output is always the first port**, inputs follow.
```verilog
and    g1 (y_and, a, b);      // and/nand/or/nor/xor/xnor: 1 output, N inputs
or     g2 (y_or,  a, b);
xor    g3 (y_xor, a, b);
not    g4 (y_not, a);          // not/buf: 1 input, N outputs (output first)
buf    g5 (y_buf, a);
bufif1 g6 (y_tri, a, en);      // 3-state: out, in, enable
```
- Verified (`e15_struct.v`, `a=1, b=0`):
  ```
  E15.1 and=0 or=1 xor=1 not=0 buf=1
  E15.2 bufif1 with en=0 -> y_tri=z
  E15.3 bufif1 with en=1 -> y_tri=1
  ```
- Full set: `and nand or nor xor xnor buf not bufif0 bufif1 notif0 notif1` plus the switch-level `nmos pmos cmos rnmos rpmos rcmos tran tranif0 tranif1 rtran...`.
- Instance names are **optional** for gate primitives (`and (y,a,b);` is legal). Name them anyway.
- Gates can take a delay: `and #3 g1 (y,a,b);` — simulation only.
- `bufif`/`notif` are the only clean way to model a three-state driver structurally; in RTL you write `assign pad = oe ? d : 1'bz;` instead.

**UDPs (mention only)**
- `primitive ... endprimitive` with a truth table. A relic used by ASIC library vendors to describe cells. Icarus supports them. **The reader will never write one.** One paragraph, no example.

**When structural style is still the right choice**
- When the *topology is the point*: a ripple-carry chain built from explicit full-adder instances teaches carry propagation in a way `assign sum = a + b;` cannot. Chapter 1 → chapter 2 continuity argument.
- When you are instantiating vendor primitives (DSP blocks, block RAM, clock buffers) that have no behavioural equivalent.
- When you need a regular array of identical blocks — combine with `generate` (§7):
  ```verilog
  genvar i;
  generate for (i = 0; i < 8; i = i + 1) begin : bitloop
    assign inv_bits[i] = ~v[i];
  end endgenerate
  ```
  Verified: `E14.4 generate-unrolled inv_bits = 11001001` for `v = 8'b0011_0110`.
- **When it is the wrong choice:** anything arithmetic. Writing a 24-bit adder as gate instances is a punishment, not a lesson. The FP adder is dataflow + behavioural.
- Good framing sentence for the chapter: *structural Verilog is for describing a plan you already have; dataflow Verilog is for asking the tool to produce one.*

## 7. A first look at procedural blocks

> **Scope discipline for the chapter.** This section exists so the reader can *read* code. Blocking (`=`) vs non-blocking (`<=`), the combinational-vs-sequential distinction, sensitivity-list rules for flip-flops, `posedge`/`negedge`, latch inference, and the event-scheduling model are **chapter 3's job**. Chapter 2 should use only `always @(*)` with `=`, and `initial` in testbenches, and say plainly: *"why it must be `=` here and `<=` there is the next chapter."* Do not pre-empt it.

**Two kinds of procedural block**
- `initial begin ... end` — runs **once**, starting at time 0. **Testbench only** (not synthesisable, apart from FPGA memory initialisation).
- `always <event-control> begin ... end` — an **infinite process**. It runs, reaches the end, and immediately waits for its event control again.
- Both are *concurrent with each other and with every `assign`*. Multiple `initial` blocks in one module all start at time 0.

**`always` is not a loop over time.** It is a piece of hardware that reacts. The `always` keyword is one of the worst naming decisions in the language; say so.
- `always @(*)` — the implicit sensitivity list (Verilog-2001). "Re-evaluate whenever anything read inside this block changes." That is exactly combinational logic.
- `always @(posedge clk)` — chapter 3.
- **An `always` with no event control and no delay is a zero-delay infinite loop.** Icarus catches it at compile time rather than hanging — a genuinely helpful deviation:
  ```verilog
  always c = c + 1;   // no timing control
  ```
  ```
  x4.v:3: error: always process does not have any delay.
  x4.v:3:      : A runtime infinite loop will occur.
  Elaboration failed
  ```
- Icarus also warns when `@(*)` finds nothing to be sensitive to (usually because the expression constant-folded — see §5):
  ```
  e11_star.v:19: warning: @* found no sensitivities so it will never trigger.
  ```
- Anything assigned inside an `always`/`initial` must be declared `reg` (or `integer`/`real`/`time`). Assigning a `wire` procedurally is an error:
  ```
  x1.v:3: error: 'w' is not a valid l-value for a procedural assignment.
  x1.v:1:      : 'w' is declared here as a wire.
  ```

**`begin`/`end`**
- Groups multiple statements into one. `if`, `else`, `for`, `case` items each take exactly **one** statement, so anything with two statements needs `begin`/`end`.
- Verilog has **no significant whitespace**. Indentation is a lie the compiler never reads. Verified:
  ```verilog
  if (a)
    b = 1;
    c = 1;    // NOT part of the if
  ```
  ```
  X3 a=0 b=x c=1
  ```
  `c` was assigned even though `a` was false, and `b` stayed `x`. This is the exact Verilog analogue of the "goto fail" bug.
- Recommendation for the guide: **always use `begin`/`end`**, even for one statement. Named blocks (`begin : name ... end`) create a scope and allow local declarations, and are required for `disable`.
- `fork`/`join` also group statements, but concurrently. Testbench-only. Mention, do not use.

**`if` / `else`**
- Standard C shape. The condition is reduced to a truth value: non-zero ⇒ true, zero ⇒ false, **`x` or `z` ⇒ false** (takes the `else`). Verified in `E3.6`.
- `if`/`else if` chains describe a **priority** structure. `case` describes a **parallel** one. That distinction becomes important for area/timing, and for the FP adder's special-case handling (NaN > Inf > zero > normal is naturally a priority chain).

**`case`**
```verilog
case (sel)
  4'b0001: y = a;
  4'b0010: y = b;
  default: y = 8'h00;
endcase
```
- Matching is **exact, four-state** (like `===`): an `x` in the selector matches only an `x` in the item. Verified:
  ```
  case : sel=0001 -> one
  case : sel=0010 -> default
  case : sel=001x -> matched the item 4'b001x exactly
  ```
- The selector and every item are context-determined **against each other** (widened to the widest). Watch that with mixed-width items.
- **Always write a `default`.** Without one, an unmatched selector leaves the variable unassigned, which in a combinational block infers a latch (chapter 3) and in simulation keeps the stale value.

**`casez`**
- `z` and `?` **in the case items** are don't-cares. `?` is the readable spelling.
```verilog
casez (sel)
  4'b1???: ...;   // matches anything with bit 3 = 1
  4'b01??: ...;
  default: ...;
endcase
```
- Verified:
  ```
  casez : sel=1000 -> 1xxx
  casez : sel=0100 -> 01xx
  casez : sel=0010 -> default
  casez : sel=x000 -> default    <-- x in the SELECTOR does not wildcard-match
  ```
- This is the correct tool for priority encoders and leading-one detection — exactly what the FP normaliser needs.

**`casex` and why it is dangerous**
- `casex` treats `x` **and** `z` as don't-cares **on both sides** — including in the selector.
- Verified, and the failure mode is stark:
  ```
  casex : sel=1000 -> 1xxx        (fine)
  casex : sel=0100 -> 01xx        (fine)
  casex : sel=x000 -> 1xxx        <-- a single unknown bit in the input silently
                                      matched the FIRST item
  ```
- One `x` anywhere in the selector — from an uninitialised reg, a reset glitch, an undriven net — makes `casex` pick a branch essentially at random, and the design *looks* like it is working. It also destroys `x`-propagation, which is the main early-bug detector you have.
- **Rule: never write `casex`.** Use `casez` when you need don't-cares in the items, or `==?` (§5) when you need a masked compare. Note that `casez` still lets a `z` in the *selector* wildcard-match, so `casez` is safer, not perfectly safe; in practice designs rarely have `z` on internal signals.

**`for` loops — unrolled hardware, not iteration in time**
- Inside a combinational `always @(*)` or a `function`, a `for` loop with constant bounds is **completely unrolled at elaboration**. The loop is a code-generation device. Ten iterations means ten copies of the logic, all evaluating simultaneously; **zero simulation time passes**.
- Corollary: the bounds must be compile-time constant, and a loop of 1000 iterations means 1000 copies of hardware.
- Verified via a population count and a leading-zero count, both written as loops and both producing a single-cycle combinational result:
```verilog
function [3:0] lzc8;
  input [7:0] x;
  integer j;
  begin
    lzc8 = 8;
    for (j = 7; j >= 0; j = j - 1)
      if (x[j] && lzc8 == 8) lzc8 = 7 - j;
  end
endfunction
```
```
E14.1 popcount8(00110110) = 4
E14.2 lzc8(00110110) = 2 ; lzc8(00000001) = 7 ; lzc8(00000000) = 8
```
- The **only** time a `for` loop takes simulation time is when its body contains a delay or event control, which only happens in testbenches:
  ```
  E14.6 loop iteration 0 at t=2
  E14.6 loop iteration 1 at t=3
  E14.6 loop iteration 2 at t=4
  ```
  (body was `#1 $display(...)`). Show both side by side — it is the cleanest way to make "unrolled, not iterated" land.
- `generate for` is the *structural* cousin: it replicates module instances and continuous assignments rather than statements, and it must use a **`genvar`**, not an `integer`:
  ```
  x2.v:2: error: genvar is missing for generate "loop" variable 'i'.
  ```
- `while`, `repeat`, `forever` exist. `repeat(n)` with constant `n` unrolls; `while`/`forever` are testbench constructs.

**`function` vs `task`**
| | `function` | `task` |
|---|---|---|
| Returns a value | yes, by assigning to its own name | no (use `output`/`inout` args) |
| Arguments | ≥1 input, no `output` (classic Verilog) | any mix of `input`/`output`/`inout`, or none |
| Timing controls (`#`, `@`, `wait`) | **forbidden** | allowed |
| Can call | other functions | tasks and functions |
| Executes in | zero simulation time | may consume time |
| Usable in an expression | yes | no — it is a statement |
| Synthesisable | yes (combinational logic) | only if it has no timing controls |
- A `function` is the right tool for reusable combinational blocks in the FP adder: leading-zero count, rounding decision, special-case classification. Declare the return width: `function [4:0] lzc24;`.
- Both are declared *inside* a module and share its scope by default.
- Tested `task` call: `print_it(v);` → `task saw 00110110`.

**`automatic`**
- `function automatic` / `task automatic` (Verilog-2001): arguments and locals are allocated per call on a stack, instead of being **static** (one shared copy for the whole module, the 1995 default).
- Needed for (a) **recursion** and (b) concurrent invocations from multiple processes.
- Verified recursion works in Icarus:
```verilog
function automatic integer fact;
  input integer n;
  begin if (n <= 1) fact = 1; else fact = n * fact(n-1); end
endfunction
```
```
E14.3 fact(5) = 120
```
- Without `automatic`, that same function silently returns garbage because the single static copy of `n` is clobbered by the recursive call.
- Static functions are fine (and typical) for simple combinational helpers called once per evaluation. Use `automatic` by default anyway; it costs nothing in synthesis of straight-line logic.

**Explicit hand-forward to chapter 3**
- `=` (blocking) vs `<=` (non-blocking): what they mean, why `<=` in clocked blocks and `=` in combinational ones, and the simulation regions that make the rule work.
- `always @(posedge clk)`, reset styles, latch inference, and why an incomplete `if` in a combinational block creates memory you did not ask for.
- Races between `always` blocks, and why "assume statements execute in order" fails across processes.

## 8. Compiler directives, system tasks, and the Icarus toolchain

Directives start with a **backtick** `` ` `` (not an apostrophe). They are handled by the preprocessor, **before** parsing, and their effect is **file-order global** — a `` `define `` in one file is visible in every file compiled after it on the same command line. That is different from C's per-translation-unit model and surprises people.

### Compiler directives

**`` `define `` / `` `undef ``**
```verilog
`define WIDTH 8
`define MAX(x,y) (((x)>(y))?(x):(y))
```
- Text substitution. Use with a leading backtick at the point of use: `` `WIDTH ``, `` `MAX(3,7) ``.
- Verified: `` E16.1 `WIDTH=8 r=00000101 ; `MAX(3,7)=7 `` (`r = `WIDTH'd5` works — a macro can supply the size of a literal).
- Parenthesise macro arguments and the whole body, exactly as in C.
- **Prefer `parameter`/`localparam` for anything numeric.** Macros are untyped, unscoped, and leak across files. Reserve `` `define `` for conditional-compilation switches.

**`` `include ``**
- `` `include "defs.vh" `` — textual inclusion. Search path via `-I dir`.
- Icarus's `-grelative-include` / `-gno-relative-include` controls whether the path is relative to the *including file* or to the working directory. Default in 13.0 is `relative-include`.
- No include guards in Verilog — write them yourself with `` `ifndef ``.

**`` `ifdef `` / `` `ifndef `` / `` `elsif `` / `` `else `` / `` `endif ``**
- Verified all working:
  ```
  E16.2 DEBUG is defined
  E16.3 NOPE is not defined
  ```
- Define from the command line with `iverilog -DDEBUG ...`.

**`` `timescale <unit>/<precision> ``**
- **Two arguments, two different jobs:**
  - **unit** — what a bare `#1` *means*. With `` `timescale 10ns/1ns ``, `#1` waits 10 ns, and `$time` in that module is reported in units of 10 ns.
  - **precision** — the granularity to which all delays are **rounded**, and the tick size of the underlying simulation clock. The simulator's global time resolution is the **smallest precision of any `` `timescale `` in the whole design**.
- Both must be `1`, `10`, or `100` followed by `s ms us ns ps fs`. Precision must not be coarser than the unit.
- Verified with `` `timescale 10ns/1ns ``:
  ```
  E16.5 after #1   : $realtime = 1.000000   ($time reported as 10 by %t at 1ns resolution)
  E16.6 after #0.15: $realtime = 1.200000   -- #0.15 = 1.5 ns, ROUNDED to 2 ns by the 1 ns precision
  ```
  The rounding in E16.6 is the point of the second argument, and it is the cleanest demonstration available.
- Icarus reports the end-of-run time in **precision units**: `$finish called at 32 (1ns)`.
- A design with **no** `` `timescale `` anywhere runs with a 1 s unit — you will see `$finish called at 3 (1s)`. Harmless but confusing; put a `` `timescale 1ns/1ps `` at the top of every file. `-Wall` includes the `timescale` warning class, which flags modules that inherit a timescale from another file.
- For this guide, `` `timescale 1ns/1ps `` everywhere is the right default.

**`` `default_nettype ``**
- `` `default_nettype none `` disables implicit net creation; `` `default_nettype wire `` restores it.
- Same global-scope caveat: it stays in effect until changed, across files. Convention: `none` at the top of each file, `wire` at the very bottom.
- See §2 for the tested behaviour and the Icarus deviation on bare ANSI ports.

**Others worth naming once:** `` `celldefine ``/`` `endcelldefine ``, `` `resetall ``, `` `line ``, `` `unconnected_drive ``. None needed here.

### System tasks and functions — Icarus 13.0 support matrix

All rows below were **compiled and run** under `iverilog -g2012 -Wall`.

**Key finding — correct a common assumption:** Icarus does **not** gate *system tasks and functions* by `-g` level. `$clog2`, `$bits`, `$error`, `$fatal`, `$urandom` and friends all compile and run identically at `-g1995`, `-g2005` and `-g2012` (verified by compiling the same file at each level and diffing the output). What `-g` gates is **syntax**: `'0`/`'1` fill literals, size casts `12'(5)`, `shortreal`, and `logic`. Verified boundary:
- `==?` / `!=?` — accepted at `-g2005` and above.
- `shortreal` — `syntax error` at `-g2005`; accepted from `-g2005-sv` upward.
- `'0`/`'1` — warning at `-g2005` (`Using SystemVerilog 'N bit vector`), clean from `-g2005-sv`.

Also useful: an unrecognised system task is a **compile-time error**, so you can probe support cheaply.
```
x13.v:1: Error: System task/function $nosuchtask() is not defined by any module.
```

| Task/function | Icarus 13.0 | Observed |
|---|---|---|
| `$display` | yes | adds a newline |
| `$write` | yes | no newline: `$write("a "); $write("b\n");` → `a b` |
| `$displayb/o/h`, `$writeb/o/h` | yes | default-radix variants |
| `$monitor`, `$monitoron`, `$monitoroff` | yes | prints once per time step in which any argument changed; **one active `$monitor` at a time** |
| `$strobe` | yes | end-of-timestep print |
| `$time` | yes | 64-bit, **rounded to the module's time unit** |
| `$realtime` | yes | `real`, exact |
| `$stime` | yes | 32-bit truncation of `$time` |
| `$timeformat` | yes | changes how `%t` prints |
| `$finish` | yes | exit code **0** |
| `$stop` | yes | drops to the interactive `vvp>` prompt; **with stdin closed it prints `** Continue **` and runs on** |
| `$fatal` | yes | prints `FATAL:` with file/line/time/scope, terminates, exit code **1** |
| `$error` | yes | prints `ERROR:` and **continues**; exit code stays 0 |
| `$warning` / `$info` | yes | print `WARNING:` / `INFO:`, continue |
| `$random` | yes | 32-bit **signed** |
| `$urandom`, `$urandom_range` | yes | 32-bit unsigned |
| `$dumpfile`, `$dumpvars` | yes | writes VCD; verified file created |
| `$dumpon/$dumpoff/$dumpall/$dumplimit` | yes | |
| `$readmemh`, `$readmemb` | yes | verified both |
| `$writememh`, `$writememb` | yes | |
| `$signed`, `$unsigned` | yes | |
| `$clog2` | yes | works at every `-g` level tested |
| `$bits` | yes | works at every `-g` level tested |
| `$sformatf` | yes | verified |
| `$fopen/$fdisplay/$fwrite/$fclose/$fgets/$fscanf` | yes | verified `$fopen`/`$fdisplay`/`$fclose` |
| `$rtoi`, `$itor`, `$realtobits`, `$bitstoreal` | yes | verified |
| `shortreal`, `$shortrealtobits`, `$bitstoshortreal` | **yes, from `-g2005-sv`** | **verified** — the FP golden-model route |
| `$test$plusargs`, `$value$plusargs` | yes | runtime `+arg` handling |
| `assert property` / SVA | partial | avoid in this guide |

**Format specifiers** (verified in one `$display`):
```
E5.1 dec=165 hex=a5 oct=245 bin=10100101 char=A str=hi
```
| Spec | Prints |
|---|---|
| `%d` `%0d` | decimal; `%0d` strips the leading padding — **use `%0d` almost always** |
| `%b` `%h` `%o` | binary / hex / octal, zero-padded to the operand width |
| `%c` | one character from the low 8 bits |
| `%s` | vector as characters — **note the zero padding prints as spaces** (`E18.1` gave `'       hello'` for a 96-bit reg) |
| `%t` | time, formatted by `$timeformat` |
| `%m` | current hierarchical scope name (no argument) |
| `%f` `%e` `%g` | `real` |
| `%v` | net strength |
| `%%` | literal `%` |
- `$display` with a mismatched argument count does **not** abort; Icarus warns and prints the raw spec:
  ```
  WARNING: e5_systasks.v:13: missing argument for $display<%0t>.
  ```

**`$time` vs `$realtime`, tested under `` `timescale 1ns/10ps ``**
```
E5.5 after #1.25 : $time=1   $realtime=1.250000
```
`$time` **rounds to the time unit** and returns an integer; `$realtime` keeps the fraction. In a self-checking testbench always print `$realtime` or use `%t`.

**`$timeformat(units_exp, precision_digits, suffix, min_width)`** — verified:
```verilog
$timeformat(-9, 2, " ns", 10);
#3.5 $display("%t", $time);
```
```
X11.2    4.00 ns          ($time had already rounded 3.5 -> 4)
X11.3 $realtime=3.500000
```

**`$clog2` — verified exactly**
```
E5.6 $clog2(1)=0  $clog2(2)=1  $clog2(3)=2  $clog2(8)=3  $clog2(9)=4  $clog2(0)=0
```
- It is **ceiling of log2**, i.e. "how many bits to index N things". `$clog2(8) = 3` and `$clog2(9) = 4`. `$clog2(0)` returns 0 (defined behaviour, not an error). Standard idiom: `localparam AW = $clog2(DEPTH);`.

**`$bits` — verified**
```
E5.7  $bits(8-bit reg)=8  $bits(array element)=8  $bits(32'h0)=32
E2.8  $bits(integer)=32
E18.7 $bits(time)=64
E7.15 $bits('1)=1        <-- fill literal is 1 bit when self-determined
```

**`$random` vs `$urandom` — and the signedness trap**
```
E5.9  $random -> 303379748 3230228097   (repeatable: same seed every run)
E5.10 $random % 16   = -7               <-- NEGATIVE
      {$random} % 16 =  3               <-- concatenation strips the sign
E5.11 $urandom -> 2450863396 ; $urandom_range(3,7) -> 4
```
- `$random` returns a **signed** 32-bit value, so `$random % N` is negative half the time. The classic fixes are `{$random} % N` (concatenation is unsigned, §5) or `$urandom_range(0, N-1)`.
- `$random` is seeded identically on every run, which is what you want for reproducible regressions. `$random(seed)` with an `integer` seed variable gives you a private stream.

**Severity tasks — exact observed output and exit codes**
```
INFO: e5_systasks.v:27: E5.12 this is $info
      Time: 125  Scope: e5
WARNING: e5_systasks.v:28: E5.13 this is $warning
         Time: 125  Scope: e5
ERROR: e5_systasks.v:29: E5.14 this is $error
       Time: 125  Scope: e5
```
- `$info`/`$warning`/`$error` **do not stop the simulation and do not change the exit code** (verified `EXIT=0`).
- `$fatal(code, "msg", args)` stops immediately, exit code **1**:
  ```
  FATAL: e6_fatal.v:16: E6.2 fatal message with code 1
         Time: 5  Scope: e6
  EXIT=1
  ```
- **Consequence for the guide's testbenches:** a CI check must either use `$fatal` on mismatch or count errors and call `$fatal` at the end. `$error` alone will let a broken build pass.

**`$monitor` — verified**
```verilog
$monitor("t=%0t clk=%b c=%h", $time, clk, c);
```
```
E6.mon t=0 clk=0 c=00
E6.mon t=1 clk=1 c=01
E6.mon t=2 clk=0 c=02
E6.mon t=4 clk=0 c=04        <-- t=3 suppressed by $monitoroff
```

**VCD dumping — the exact two lines**
```verilog
initial begin
  $dumpfile("wave.vcd");
  $dumpvars(0, tb);     // 0 = all levels below tb; omit args for everything
end
```
```
VCD info: dumpfile e5.vcd opened for output.
```
- View with GTKWave or Surfer. `$dumpvars(0, tb)` dumps the whole hierarchy under `tb`; `$dumpvars(1, tb)` only that level. **Arrays/memories are not dumped by default** in many tools — Icarus needs them named explicitly (`$dumpvars(0, tb.dut.mem[0])`) or `-gvcd-...` options; check before relying on it.

**`$readmemh` / `$readmemb` — verified**
```verilog
reg [7:0] rom [0:3];
initial $readmemh("rom.hex", rom);   // file: one value per line, no 0x, // comments allowed
```
```
E5.16 readmemh rom = 11 22 33 44
X11.1 readmemb: 00001111 11110000
```
- Optional address bounds: `$readmemh("f.hex", mem, start, finish)`. `@address` lines in the file jump the load pointer.

### The Icarus toolchain — exact commands

**The two lines the reader will type a thousand times:**
```sh
iverilog -g2012 -Wall -o sim design.v tb.v
vvp sim
```
- Every command in these notes was run in exactly this form; e.g. `iverilog -g2012 -Wall -o s17 e17_selfdet.v && vvp s17`.
- `-o sim` names the output; without it the default is `a.out`.
- `vvp` runs the compiled program. Exit code is 0 for `$finish`, 1 after `$fatal`.
- Order of source files does **not** matter for module resolution (elaboration binds by name), but it **does** matter for `` `define `` and `` `default_nettype `` visibility.
- `-s <topmodule>` forces the root module when Icarus picks the wrong one (it defaults to any module not instantiated by another).
- `-I <dir>` for `` `include `` paths, `-D<macro>` for command-line defines, `-y <dir>`/`-Y .v` for library search.
- `-c filelist.txt` reads source file names from a file, one per line — the right answer once the FP adder has a dozen files.
- `-E` runs the preprocessor only. `-t null` type-checks without generating code — a fast syntax gate for CI.

**`-g` levels available in the installed 13.0** (from `iverilog -ghelp`):
```
1995 2001 2005 2005-sv 2009 2012
```
plus feature flags: `assertions`, `specify`, `interconnect`, `verilog-ams`, `std-include`, `relative-include`, `xtypes`, `icarus-misc`, `io-range-error`, `strict-ca-eval`, **`strict-expr-width`**, `shared-loop-index` (each with a `no-` form).
- **`-gstrict-expr-width`** is worth knowing about: it makes Icarus follow the LRM's expression bit-length rules strictly instead of its historical relaxations. Try the FP design both ways.
- Default generation for 13.0 is `-g2005`. **This guide should always pass `-g2012`** because it needs `'0`/`'1` fill literals, size casts, `shortreal`, and `logic` if it chooses to use it. (`$bits`, `$clog2`, `$fatal`, `$error` would work without it — see the finding above.)
- **Deviation noted:** the online docs list `-g2017` and `-g2023`; the installed 13.0 binary does not offer them.

**What `-Wall` actually turns on** (installed 13.0 man page):
`anachronisms`, `implicit`, `macro-replacement`, `portbind`, `select-range`, `timescale`, `sensitivity-entire-array`.
- **Not** included: `infloop`, `sensitivity-entire-vector`. Add them explicitly if you want them: `-Wall -Winfloop`.
- (The online docs for the development branch list a longer set including `implicit-dimensions` and `declaration-after-use`; the installed build's list is the one above.)
- Warnings actually observed in these experiments:
  - `warning: implicit definition of wire 'godo'.` — the typo bug
  - `warning: Port 2 (b) of module adder_ansi expects 8 bit(s), given 1.` / `Padding` / `Pruning` — mis-wired instance
  - `warning: Part select [35:32] is selecting after the vector v[31:0].` — out-of-range select
  - `warning: @* found no sensitivities so it will never trigger.` — dead combinational block
  - `warning: Numeric constant truncated to 4 bits.` — **appears even without `-Wall`**
  - `warning: Using SystemVerilog 'N bit vector. Use at least -g2005-sv...` — at `-g2005`
- **What `-Wall` does NOT catch, and this is the important part:** silent truncation on assignment to a narrower variable (verified: `n4 = 8'hFF;` produced no message at all), signed/unsigned contamination, self-determined-width truncation inside a concatenation, multiple drivers on a net. Those are on the reader.

**Suggested project Makefile snippet for the guide**
```make
IVFLAGS = -g2012 -Wall -Winfloop
sim: $(SRCS) $(TB)
	iverilog $(IVFLAGS) -o $@ $^
run: sim
	vvp sim
wave: sim
	vvp sim && gtkwave wave.vcd
```

## 9. Pedagogical hazards and beginner traps specific to this chapter

Each entry: **the wrong belief** → **the correction** → **the demo to show**.

- **"`reg` means a register / a flip-flop."**
  It means "a variable that holds its value between procedural assignments" — a simulator storage cell. `always @(*) y = a + b;` with `output reg [7:0] y` is **pure combinational logic**, zero flip-flops. Storage comes from a *clocked* `always`, which is chapter 3. Demo: `e11_star.v` — two modules with `reg` outputs, both combinational, both giving `y = 44`. Say the word `logic` once so the reader knows SystemVerilog renamed it to end this exact confusion.

- **"`always` means loop."**
  `always` means "this process restarts whenever its event control fires". It describes a piece of hardware that reacts, not a `while(1)`. Demo: an `always` with no timing control at all is a hard compile error in Icarus —
  `error: always process does not have any delay. : A runtime infinite loop will occur.`
  Also `warning: @* found no sensitivities so it will never trigger.` for a block whose inputs constant-folded away.

- **"Statements execute in order."**
  Every `assign`, every `always`, every module instance is concurrent. File order is irrelevant. Ordering exists only *inside* one `begin`/`end`, and even there the scheduling semantics are not a CPU's. Do not let the reader carry the C model in. (The full event-region story is chapter 3.)

- **The implicit-wire typo bug.**
  An undeclared identifier on the **LHS of a continuous assignment** or in a **port connection** is silently created as a 1-bit `wire`. Demo (`e12_ctxwidth.v`): `assign godo = a[3:0] & b[3:0];` when you meant `good`.
  ```
  warning: implicit definition of wire 'godo'.
  E12.5 good = zzzz     (the real net is never driven)
  E12.6 godo = 0  ($bits=1)
  ```
  **Refinement most sources get wrong:** a typo on the *right-hand side* is a hard error in Icarus (`error: Unable to bind wire/reg/memory 'tnp'`), so only the LHS/port cases are silent.

- **Forgetting `` `default_nettype none ``.**
  It is the only mechanical defence against the previous item. Put it at the top of every file, `` `default_nettype wire `` at the bottom if the file gets `` `include ``d. With it, the same code becomes:
  ```
  error: Unable to bind wire/reg/memory `never_declared'
  error: Net dangling_out is not defined in this context.
  ```
  **Caveat to state:** it stays in effect across file boundaries on one `iverilog` command line, and Icarus still accepts a bare ANSI `input a` (no `wire`) under `none` — other tools do not, so write `input wire a` anyway.

- **Width-mismatch truncation.**
  Assigning a wide value to a narrow variable silently drops the high bits, with **no warning even under `-Wall`**. Verified: `n4 = 8'hFF;` → `1111`, zero diagnostics. In an FP mantissa path this is how a rounding bug is born. Teach the habit: write the width of every intermediate, and prefer `{cout, sum} = a + b + cin;` over `sum = a + b;` plus a separate carry expression.

- **The unsized-literal 32-bit rule.**
  `'h1F` and bare `42` are **32 bits** (verified `$bits('h1F) = 32`), bare decimals are signed. The folklore claim "`1 << 40` is always 0" is **wrong** — verified:
  ```
  1<<40 in a 32-bit context = 0
  1<<40 in a 64-bit context = 0x0000010000000000     (correct!)
  {1'b1<<40}                = 0                       (self-determined -> lost)
  ```
  Teach the real rule (context vs self-determined) rather than the folk rule. Also: an unsized literal cannot appear inside `{}` at all (`error: Concatenation operand ... has indefinite width.`).

- **Signed/unsigned contamination.**
  One unsigned operand makes the whole expression unsigned and reinterprets every operand's bits. Demos, all verified:
  ```
  -8 / 3          = -2     (both signed)
  -8 / 8'd2       = 124    (one unsigned -> 248/2)
  s4 * 2          = -4     (bare 2 is a signed literal)
  s4 * 4'd2       = 28     (4'd2 is unsigned -> whole expression unsigned)
  (-8'sd1 < 8'd0) = 0
  ```
  `s4 * 2` versus `s4 * 4'd2` is one keystroke apart and gives -4 versus 28. Show that pair. Fix with `$signed()`/`$unsigned()` or by declaring `signed`. Guide policy: **keep the FP datapath unsigned end to end** and handle the sign bit explicitly.

- **`>>>` on an unsigned operand.**
  Silently behaves as a logical shift; no error, no warning. Verified: `ua>>>1 = 01000000` vs `$signed(ua)>>>1 = 11000000`. Arithmetic-shift correctness depends on the *declaration*, not on the operator.

- **`casex` and don't-care matching.**
  `casex` treats `x`/`z` as wildcards **in the selector too**. One unknown bit from an uninitialised reg and the design silently takes the first branch. Verified:
  ```
  casex : sel=x000 -> matched 4'b1xxx
  casez : sel=x000 -> default
  ```
  Rule: **never write `casex`**. Use `casez` (wildcards only in the items) or SystemVerilog `==?` (wildcards only on the right operand, verified working at `-g2012`).

- **`==` returning `x`.**
  If either operand contains a single `x` or `z`, `==` yields `x`, not 0. And `if (x)` takes the **`else`** branch, so the bug does not announce itself. Verified:
  ```
  a==b -> x     a===b -> 0     if (a==b) took the ELSE branch
  8'bx == 8'bx  -> x            8'bx === 8'bx -> 1
  ```
  This is why an uninitialised signal produces a silently wrong path rather than a crash.

- **Using `===` in synthesisable code.**
  `===`/`!==` compare `x` and `z` literally. There is no gate that can distinguish "unknown" from "one" — `x` is a property of the model, not of silicon. Legal and useful in a testbench check (`if (dut !== golden) $fatal(1, ...)`), illegal in the design. Same for `!==`, `$display`, `initial`, `#delay`, `real`, `$random`, and hierarchical references. **Icarus will happily simulate all of them**, which is precisely why the reader must self-police the synthesisable subset — no tool in this guide's flow will complain.

- **Expecting `for` to take time.**
  A `for` loop in a combinational block or a `function` is **unrolled at elaboration** into parallel hardware; zero simulation time passes and every iteration's logic exists physically. Ten iterations = ten copies. Demo: the leading-zero-count function (`E14.2`) evaluates in one delta. Contrast with a testbench loop whose body contains `#1` (`E14.6` prints at t=2,3,4) — the delay, not the loop, is what makes time pass.

- **Positional port connections silently mis-wiring.**
  Verified with a deliberate swap of `b` and `cin`: `adder_ansi u3 (a, cin, b, s3, c3);` gave `sum=201` instead of `45`, with only width-mismatch *warnings* — and if the swapped ports had matched widths there would have been no diagnostic at all. **Always use named connection.** It is the only form the compiler can check.

- **The missing-`begin`/`end` bug.**
  Verilog ignores indentation. Verified:
  ```verilog
  if (a) b = 1;
         c = 1;    // executes unconditionally
  ```
  ```
  X3 a=0 b=x c=1
  ```
  Always brace. Same rule for `for`, `while`, and `case` items.

- **`integer` vs `genvar` in generate loops.**
  A `generate for` must use a `genvar` — it is an *elaboration-time* index, not a simulation variable. Verified error:
  ```
  x2.v:2: error: genvar is missing for generate "loop" variable 'i'.
  ```
  Use `integer` for procedural loops inside `always`/`initial`/`function`; `genvar` for `generate`. Also: name your generate block (`begin : bitloop`) so the instances get stable hierarchical names (`e14.bitloop[3].*`) you can reference in waveforms.

- **Two extra traps worth a line each**
  - **Multiple drivers.** Two `assign`s to one `wire` give `x` where they disagree, with no Icarus warning. Any unexpected `x` should send the reader looking for a second driver or an unwritten `reg`.
  - **`$random % N` is negative half the time** — `$random` is signed 32-bit. Verified `$random % 16 = -7`. Use `{$random} % N` or `$urandom_range(0, N-1)`.
  - **`$error` does not fail the build.** Exit code stays 0. A CI-visible testbench must end in `$fatal` or count errors and call `$fatal`.
  - **Missing `` `timescale ``.** Everything still runs, but time is in seconds and `%t` output looks nonsensical. `-Wall`'s `timescale` class catches inherited timescales.

## Citations

### Primary — verified online

- IEEE Standards Association, **"IEEE Std 1364-2005 — IEEE Standard for Verilog Hardware Description Language"**, standard record page. Status field reads verbatim **"Superseded Standard"**; superseded by IEEE Std 1800-2009. — https://standards.ieee.org/ieee/1364/3641/ **[verified]**
- Stephen Williams et al., **Icarus Verilog documentation — "Command Line Flags"** (`-g` generation flags, `-W` warning classes). Note: this page documents the development branch and lists `-g2017`/`-g2023` plus `-Wimplicit-dimensions`/`-Wdeclaration-after-use`, which the installed 13.0 release binary does **not** offer. — https://steveicarus.github.io/iverilog/usage/command_line_flags.html **[verified]**
- Stephen Williams et al., **Icarus Verilog documentation — "Getting Started"** (canonical `iverilog -o hello hello.v` then `vvp hello`; multi-file and `-c filelist` forms). — https://steveicarus.github.io/iverilog/usage/getting_started.html **[verified]**
- Wikipedia, **"Verilog"** — history section. Created by Prabhu Goel, Phil Moorby and Chi-Lai Huang "between late 1983 and early 1984" at Automated Integrated Design Systems (renamed Gateway Design Automation in 1985); "Gateway Design Automation was purchased by Cadence Design Systems in 1990"; public domain via Open Verilog International; IEEE 1364-1995 / 1364-2001 / 1364-2005; "In 2009, the Verilog standard (IEEE 1364-2005) was merged into the SystemVerilog standard, creating IEEE Standard 1800-2009." — https://en.wikipedia.org/wiki/Verilog **[verified]**

### Primary — machine-verified locally (the authority for every behavioural claim above)

- **Icarus Verilog 13.0 (stable), v13_0**, `iverilog` and `vvp` on macOS 24.6.0 (arm64, Homebrew). Banner: `Icarus Verilog version 13.0 (stable) (v13_0)`, `Copyright (c) 2000-2026 Stephen Williams`. **[verified — this build]**
- **`man iverilog`** as installed with 13.0 — the `WARNING TYPES` section is the source for the exact `-Wall` membership list (`anachronisms, implicit, macro-replacement, portbind, select-range, timescale, sensitivity-entire-array`) and for the notes that `infloop` and `sensitivity-entire-vector` are excluded from `-Wall`. **[verified — local man page]**
- **`iverilog -ghelp`** as installed with 13.0 — source for the generation list `1995 / 2001 / 2005 / 2005-sv / 2009 / 2012` and the feature flags including `strict-expr-width`. **[verified — local binary]**
- **Experiment files** (all under the session scratchpad `.../scratchpad/vtest/`, all compiled with `iverilog -g2012 -Wall` and run with `vvp`):
  `e1_width.v`, `e2_signed.v`, `e3_ops.v`, `e4_partsel.v`, `e5_systasks.v`, `e6_fatal.v`, `e7_fill.v`, `e8_ports.v`, `e9_implicit.v`, `e10_typo.v`, `e11_star.v`, `e12_ctxwidth.v`, `e13_case.v`, `e14_proc.v`, `e15_struct.v`, `e16_directives.v`, `e17_selfdet.v`, `e18_types.v`, plus probes `x1`–`x13`. Every `E<n>.<m>` and `X<n>.<m>` tag quoted in these notes is real captured stdout. **[verified — this session]**

### Standards documents — cited by title, not fetched

- IEEE Std 1364-2005, *IEEE Standard for Verilog Hardware Description Language*. Especially **Clause 4 "Expressions"** (§4.4 operator precedence, §4.5 expression bit lengths, §4.5.1 the context-determined/self-determined rules, §4.6 signed expressions), **Clause 3 "Data types"** (§3.2 nets/variables, §3.3 vectors, §3.11 parameters), **Clause 12 "Hierarchical structures"** (§12.2 module ports, §12.3.3 ANSI port declarations and `` `default_nettype ``), **Clause 17/19** (system tasks, compiler directives). **[title-only]**
- IEEE Std 1800-2023, *IEEE Standard for SystemVerilog — Unified Hardware Design, Specification, and Verification Language*. Current standard; the source of `'0`/`'1`, `==?`/`!=?`, `logic`, `shortreal`, `$fatal`/`$error`/`$warning`/`$info`, `$urandom`. **[title-only]**
- IEEE Std 1364.1-2002, *IEEE Standard for Verilog Register Transfer Level Synthesis*. The historical definition of the synthesisable subset; itself withdrawn. **[title-only]**

### Reference books and vendor guides — cited by title, not fetched

- Stuart Sutherland, ***Verilog-2001: A Guide to the New Features of the Verilog HDL*** (Kluwer, 2001). Chapters on ANSI port lists, signed arithmetic, indexed part-selects `+:`/`-:`, `generate`, `localparam`, `` `default_nettype ``. **[title-only]**
- Stuart Sutherland, ***Verilog HDL Quick Reference Guide* (IEEE 1364-2005 edition)** and the companion **SystemVerilog** quick-reference cards, Sutherland HDL Inc. The standard desk reference for the operator precedence table. **[title-only]**
- Stuart Sutherland and Don Mills, **"Standard Gotchas: Subtleties in the Verilog and SystemVerilog Standards That Every Engineer Should Know"**, SNUG/DVCon paper series (several editions, 2006 onward). The canonical treatment of expression width, signedness contamination, and `casex` hazards. **[title-only]**
- Don Mills and Clifford Cummings, **"RTL Coding Styles That Yield Simulation and Synthesis Mismatches"**, SNUG 1999. The classic source for the "never use `casex`" rule and for `x`-optimism/`x`-pessimism. **[title-only]**
- Clifford E. Cummings, **"full_case parallel_case, the Evil Twins of Verilog Synthesis"**, SNUG 1999, and **"Nonblocking Assignments in Verilog Synthesis, Coding Styles That Kill!"**, SNUG 2000. The latter is the reference to hand forward to chapter 3. **[title-only]**
- Samir Palnitkar, ***Verilog HDL: A Guide to Digital Design and Synthesis*, 2nd ed.** (Prentice Hall, 2003). Chapters 3–6 map almost exactly onto sections 2, 3, 5 and 6 of this chapter. **[title-only]**
- Donald E. Thomas and Philip R. Moorby, ***The Verilog Hardware Description Language*, 5th ed.** (Springer, 2002). Moorby is a co-creator; useful for historical framing. **[title-only]**
- Michael D. Ciletti, ***Advanced Digital Design with the Verilog HDL*, 2nd ed.** (Pearson, 2010). **[title-only]**
- AMD/Xilinx, **UG901, *Vivado Design Suite User Guide: Synthesis***, "HDL Coding Techniques" chapter — the practical definition of the synthesisable subset for FPGA flows. **[title-only]**
- Intel/Altera, **Quartus Prime Pro Edition User Guide: Design Recommendations** (HDL coding style chapter). **[title-only]**
- **ASIC-World Verilog tutorial** (asic-world.com/verilog/) and **ChipVerify Verilog tutorials** (chipverify.com/verilog/) — accurate, freely linkable beginner material; useful as "further reading" pointers for the chapter. **[title-only]**
- Icarus Verilog **GitHub wiki and issue tracker** (github.com/steveicarus/iverilog) — where the deviations noted in §2 (bare ANSI ports under `` `default_nettype none ``) and §8 (docs-vs-release `-g` level list) would be confirmed or filed. **[title-only]**
