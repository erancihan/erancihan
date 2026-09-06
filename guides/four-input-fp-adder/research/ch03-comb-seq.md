# Chapter 3 Research Notes — Combinational vs Sequential Logic, `always` Blocks, Blocking vs Non-Blocking

<!-- sections complete: 9/9 + citations - COMPLETE -->

Source notes for the chapter writer. Not chapter prose. All Icarus output recorded verbatim from
`iverilog -g2012 -Wall -o sim x.v && vvp sim` with Icarus Verilog 13.0.

## 1. The two kinds of logic, and how Verilog expresses each

### The distinction

- **Combinational**: output is a pure function of the *current* inputs. No memory. Given the same input
  vector you always get the same output vector, once the gate delays have settled. Ch1's mux, decoder,
  priority encoder, ripple-carry adder and barrel shifter are all combinational.
- **Sequential**: output depends on stored state as well as current inputs. The circuit has memory —
  flip-flops or latches. Same inputs, different outputs, depending on history.
- The dividing question for the reader: *"can I draw this as a truth table with no notion of 'before'?"*
  If yes, combinational. If the answer needs the word "previously", it is sequential.
- A useful reframing for a software reader: combinational logic is a **pure expression** that is
  continuously re-evaluated forever; sequential logic is that expression plus a **latched checkpoint**
  that only moves on a clock edge.

### "Inferring" hardware — the single most important idea in this chapter

- Verilog is not executed by the FPGA. Verilog is (a) executed by a *simulator*, and (b) pattern-matched
  by a *synthesis tool*.
- Synthesis tools recognise a small, fixed set of **templates**. `always @(posedge clk) q <= d;` is not a
  command meaning "on the clock edge, copy d to q". It is a **pattern the tool has been taught means
  D flip-flop**. The tool then emits a flip-flop from its library.
- Consequences the reader must internalise:
  - Code outside the recognised templates either fails to synthesise or synthesises to something you did
    not intend (latches being the classic case — §5).
  - The simulator will happily run non-synthesisable code. Simulation passing is *not* evidence that the
    code describes hardware.
  - Two different-looking code fragments can infer the *same* hardware; two similar-looking fragments can
    infer *different* hardware. `q <= d` versus `q = d` inside a clocked block look almost identical and
    mean different things (§3).
- The set of code that synthesis tools accept is called the **synthesisable subset**. It is far smaller
  than the language. Chapter 2 taught the language; this chapter teaches the subset that matters.
- Terminology to use consistently: we *infer* a flip-flop, we do not "create" or "declare" one. There is
  no `flipflop` keyword in Verilog. (SystemVerilog adds `always_ff`/`always_comb`/`always_latch`, which
  make the intent explicit and let the tool *check* it — see the note at the end of this section.)

### The three idioms

| Idiom | Hardware | Use when |
|---|---|---|
| `assign y = <expr>;` | combinational | the logic fits in one expression |
| `always @(*) begin ... end` | combinational | you need `if`/`case`/loops/temporaries |
| `always @(posedge clk) ... <= ...` | flip-flops | you need state |

- `assign` and `always @(*)` infer *identical* hardware for identical logic. The choice is stylistic:
  `assign` for one-liners, `always @(*)` when procedural control flow makes the intent clearer.
  `align_sticky.v` from ch2 is a good example of `assign`-style combinational code.
- The target of an `assign` must be a `wire` (net). The target of any `always` block must be a `reg`
  (variable). This is a *language* rule about assignment mechanics, **not** a statement about hardware —
  see the "reg that is really a wire" hazard in §9.

### Synthesisable-subset templates

Combinational logic, expression form:

```verilog
assign sum = a + b;
assign y   = sel ? b : a;
```

Combinational logic, procedural form — note the **default assignment first**, which is the latch cure
of §5:

```verilog
always @(*) begin
    y = 4'b0000;              // default: every path assigns y
    case (sel)
        2'b00: y = a;
        2'b01: y = b;
        2'b10: y = c;
        2'b11: y = d;
    endcase
end
```

D flip-flop, no reset:

```verilog
always @(posedge clk)
    q <= d;
```

D flip-flop, **synchronous** reset — `rst_n` is *not* in the sensitivity list:

```verilog
always @(posedge clk)
    if (!rst_n) q <= 1'b0;
    else        q <= d;
```

D flip-flop, **asynchronous** reset — `negedge rst_n` *is* in the sensitivity list, and the reset test
must be the first branch:

```verilog
always @(posedge clk or negedge rst_n)
    if (!rst_n) q <= 1'b0;
    else        q <= d;
```

D flip-flop with **clock enable** — note the enable is an `else if`, *not* an extra sensitivity term.
`always @(posedge clk or posedge en)` would infer a second clock, which is not what you want:

```verilog
always @(posedge clk)
    if (!rst_n)     q <= 1'b0;
    else if (en)    q <= d;
    // no else: q holds. This is NOT a latch - it is a flip-flop with an enable,
    // because we are in a clocked block. See section 5.
```

Register file write port (synchronous write, asynchronous read) — the shape ch12's architectural
registers will use:

```verilog
reg [31:0] mem [0:15];

always @(posedge clk)
    if (we) mem[waddr] <= wdata;

assign rdata = mem[raddr];        // async read, combinational
```

Register file write port with synchronous read (maps to FPGA block RAM):

```verilog
always @(posedge clk) begin
    if (we) mem[waddr] <= wdata;
    rdata_r <= mem[raddr];
end
```

### Verified: the "hold with no else" case really is a flip-flop, not a latch

`e18b_reset.v`, clock-enable counter `q_en`, enable dropped at t=24:

```
t=0 rst_n=1 en=1 | q_sync=9 q_async=9 q_en=9
t=5 rst_n=1 en=1 | q_sync=a q_async=1 q_en=a
t=15 rst_n=1 en=1 | q_sync=b q_async=2 q_en=b
t=24 rst_n=1 en=0 | q_sync=b q_async=2 q_en=b
t=25 rst_n=1 en=0 | q_sync=c q_async=3 q_en=b
t=35 rst_n=1 en=0 | q_sync=d q_async=4 q_en=b
```

`q_en` freezes at `b` and stops counting while the unconditioned counters continue. Holding state is the
*normal* behaviour of a clocked block; it is only in a **combinational** block that "sometimes hold"
means a latch.

### SystemVerilog note (Icarus `-g2012` supports these)

- `always_comb` — same as `always @(*)` but the block *declares* it is combinational, and its
  inferred sensitivity list additionally includes variables read inside called functions (see §4, where
  plain `@(*)` is shown *not* to do this). The inferred-sensitivity part is a semantic guarantee; the
  checking part is not (see the correction below).
- `always_ff @(posedge clk)` — asserts "this is a flip-flop".
- `always_latch` — asserts "I meant this latch".
- This guide stays with `always @(*)` / `always @(posedge clk)` because that is what the reader will meet
  in every existing codebase.

> **CORRECTED 2026-08-09 — do not reuse the original claim.** An earlier draft of these notes said
> `always_comb`/`always_ff` "turn several of §9's hazards into compile errors" and that a tool is
> "required to check". Both are false as written, and the chapter was fixed accordingly.
> - IEEE 1800-2017 §9.2.2.2 and §9.2.2.4 say a tool ***should*** check, not ***shall***. A tool that
>   reports nothing is still conforming.
> - **Measured on Icarus 13.0 at `-g2012 -Wall`:** `always_comb` around an incomplete `if`, and
>   `always_ff` around a blocking assignment, both compile silent and exit 0, with both bugs still
>   reproducing at run time. The latch survives. See `src/ch03/bad_svalways.v`.
> - The only `always_*` rule Icarus enforces is that an `always_ff` sensitivity list be edge-only,
>   and that is a warning, not an error.
> - The keywords are still worth adopting: they state intent where a reviewer and a diff can see it,
>   and the checks are real in tools that implement them (Vivado, Questa, VCS, Verilator — none
>   installed here, so that is documentation, not measurement). The honest summary is
>   **documentation value without enforcement for an Icarus-only reader.**
> Chapters 9, 11, 12 and especially 13 must not restate the original claim.

## 2. The Verilog scheduling semantics — the event queue

Normative source: **IEEE Std 1364-2005, Clause 11 "Scheduling semantics"** — §11.3 *The stratified event
queue*, §11.4 *The Verilog simulation reference model*, §11.5 *Race conditions*. SystemVerilog restates
and extends this in **IEEE Std 1800-2017 Clause 4 "Scheduling semantics"**.

### Time slots and simulation time

- Simulation time advances in discrete steps. Everything that happens at one value of `$time` is a
  **time slot**.
- A time slot is *not* one pass through the code. It contains an arbitrary number of iterations over a
  set of ordered **regions**. Simulation time does not advance until every region in the current slot is
  empty.
- The reader's mental model must be: *simulated time is not wall-clock time and is not "one step per
  statement"*. A whole cascade of combinational logic settles at a single value of `$time`.

### The stratified event queue (IEEE 1364-2005 §11.3)

Regions within one time slot, in execution order:

1. **Active events** — blocking assignments; evaluation of RHS of non-blocking assignments; continuous
   assignment (`assign`) updates; `$display`; primitive evaluation; procedural statements generally.
   Events in this region may be executed **in any order** — this is where races live.
2. **Inactive events** — events explicitly deferred with `#0`. Processed only after the active region is
   completely drained.
3. **Non-blocking assign update events** — the *left-hand side updates* of non-blocking assignments whose
   RHS was evaluated earlier in this slot. This is the region that makes `<=` behave like a flip-flop.
4. **Monitor events** — `$monitor` and `$strobe`. Run after all value updates for the slot are complete,
   which is why `$strobe` sees post-NBA values. (IEEE 1800 renames this the **Postponed** region and
   inserts Observed / Reactive / Re-Inactive / Re-NBA regions for assertions and program blocks — not
   relevant to this guide, but the reader will see the names.)
5. **Future events** — everything scheduled for a *later* time slot (future inactive events, future NBA
   update events). These are what make time advance.

Critical scheduling rule: **completing region 1 can put new events back into region 1.** The active
region is drained to exhaustion before the simulator looks at region 2. Executing region 2 or 3 can also
push new events into region 1, in which case the simulator returns to region 1. So the loop is
"if there is anything active, do it; else promote the earliest non-empty region and go back to the top".

### Delta cycles

- A **delta cycle** is one iteration of that loop within a single time slot. It costs zero simulation
  time.
- A chain of combinational blocks resolves over several delta cycles at the same `$time`.

**Verified** — `e20_delta.v`, three chained inverters `b=~a`, `c=~b`, `d=~c`, each in its own
`always @(*)`:

```
t=1 a=0 b=x c=x d=x   evals: 0 0 0
  same slot, 0 deltas : b=x c=x d=x
  after one #0       : b=0 c=1 d=0
  after two #0       : b=0 c=1 d=0
  after three #0     : b=0 c=1 d=0
t=2 a=1 b=0 c=1 d=0   evals: 1 1 1
```

Two things to read off this:

- The `$display` executed **immediately** after `a = 1'b1;` still shows `b=x`. The assignment to `a`
  *scheduled* the `always @(*)` blocks; it did not run them. The writing process keeps the CPU until it
  blocks.
- By the time the initial block resumes after a single `#0`, the **entire three-block cascade has already
  settled** (`b=0 c=1 d=0`, each block evaluated exactly once). Extra `#0`s change nothing. This is
  region 1 being drained to exhaustion before region 2 is touched.
- Note also `evals: 0 0 0` at t=1: the blocks had never run at all. See §4 and §9 — `always @(*)` does not
  self-start; it waits for an *event*.

### Blocking assignment (`=`)

- Executes entirely in the **active** region. RHS is evaluated and the LHS is updated **before the
  simulator moves to the next statement in that process**.
- Semantically it *blocks* the process: nothing else in this process can happen until the update is done.
- Consequence: statement order within a `begin...end` is load-bearing, exactly like a C program.

### Non-blocking assignment (`<=`)

Two-phase:

1. In the **active** region, the RHS is evaluated and the value is captured. The LHS is *not* touched.
   An NBA update event is placed in region 3.
2. In the **NBA update** region, the captured value is written to the LHS.

- Between phases 1 and 2, every read of the LHS still returns the **old** value.
- The process does **not** block. `q <= d;` completes for scheduling purposes instantly and the next
  statement runs immediately, still in the active region.

**Verified** — `e07_regions.v`, a `posedge` block that reads `r`, does `r <= d` (`d=7`), and reads `r`
again, with a second block on the same edge, a `#0` block, a `$strobe` and a `$monitor`:

```
  [monitor  region] $monitor            : t=0 r=0
  [active   region] other block reads r=0
  [active   region] $display  before NBA update: r=0
  [active   region] $display  after  'r <= d'  : r=0  (unchanged!)
  [inactive region] after #0            : r=0
  [postpone region] $strobe   end of time slot : r=7
  [monitor  region] $monitor            : t=5 r=7
  [next time slot]  t=6 r=7
```

Every claim in the region table is visible here:

- The `$display` *after* `r <= d` prints `r=0`. The NBA has not updated anything yet.
- A different `always` block on the same edge also sees `r=0`. **This is exactly why `<=` works**: every
  clocked block on that edge reads the pre-edge state.
- **`#0` does not help.** After the inactive region, `r` is *still* `0`. The NBA region comes *after* the
  inactive region. A beginner who reaches for `#0` to "let the value settle" is reaching for a region
  that is scheduled too early — one reason `#0` is a smell (§8).
- `$strobe` prints `r=7`, because monitor events run after the NBA region.

### Why `a <= b; b <= a;` is a swap

- Statement 1: evaluate `b` (old value), schedule `a ← old_b`.
- Statement 2: evaluate `a` — still the **old** `a`, because statement 1's update has not landed —
  schedule `b ← old_a`.
- NBA region: both updates land. Values exchanged. No temporary needed.
- With `=` it is a **copy**, not a swap: statement 1 overwrites `a`, statement 2 reads the new `a`.

**Verified** — `e01_swap.v`, `a=0x11`, `b=0x22`, both idioms on the same clock:

```
time  a_nb b_nb | a_bl b_bl
   1   11   22  |  11   22  (before any edge)
  10   22   11  |  22   22  (after 1st posedge)
  20   11   22  |  22   22  (after 2nd posedge)
```

`a_nb`/`b_nb` swap and swap back on each edge. `a_bl`/`b_bl` both become `22` on the first edge and never
change again — the value `11` is destroyed. This is the single clearest two-line demonstration in the
chapter.

### Determinism: what the standard guarantees and what it does not

Guaranteed by IEEE 1364-2005:

- Statements within a single `begin...end` in a single process execute in source order.
- An NBA's RHS is sampled before any NBA update in the same slot lands.
- Region ordering (active → inactive → NBA → monitor) is fixed.
- Continuous assignments and primitive evaluations are *not* required to happen at any particular point
  relative to each other within the active region, only that they eventually settle.

**Explicitly left to the implementation** (§11.5 *Race conditions*):

- The order in which multiple processes in the active region are executed. If two `always @(posedge clk)`
  blocks are both ready to run, the simulator may run them in either order.
- Whether a process, once it starts, runs to completion before another process starts, or is interleaved
  at any point where it would block.

So: **two standards-compliant simulators can produce different answers for the same code, and both are
correct.** The design rule that follows is that you must not *write* code whose answer depends on that
order. That is the real justification for the `<=` rule in §3.

**Verified — and this is where the honest story is more interesting than the textbook one.**
`e06_race.v` has two blocks on the same edge, `always @(posedge clk) a = d;` and
`always @(posedge clk) b = a;`, with `d=1`:

```
after 1 posedge: a=1 b=0   p=1 q=0
```

Run eight more times, identical every time:

```
after 1 posedge: a=1 b=0   p=1 q=0
after 1 posedge: a=1 b=0   p=1 q=0
after 1 posedge: a=1 b=0   p=1 q=0
after 1 posedge: a=1 b=0   p=1 q=0
after 1 posedge: a=1 b=0   p=1 q=0
after 1 posedge: a=1 b=0   p=1 q=0
after 1 posedge: a=1 b=0   p=1 q=0
after 1 posedge: a=1 b=0   p=1 q=0
```

**Icarus is stable across runs. Re-running a simulation will never reveal this race.** But swap the two
`always` blocks in the source and nothing else — `e09_raceorder.v`:

```
e09 (reversed source order): a=1 b=1
```

`b` flips from `0` to `1`. The *textual order of two independent always blocks* changed the answer.
That is the race, made visible without a second simulator.

And it gets worse. `e13_order.v` prints which of two same-edge blocks actually runs first, at each edge:

```
t=5  BLOCK-B runs (reads d=0)
t=5  BLOCK-A runs (writes d)
t=15  BLOCK-A runs (writes d)
t=15  BLOCK-B runs (reads d=0)
t=25  BLOCK-B runs (reads d=0)
t=25  BLOCK-A runs (writes d)
t=35  BLOCK-A runs (writes d)
t=35  BLOCK-B runs (reads d=0)
```

**Icarus alternates the order between time steps: B,A then A,B then B,A then A,B.** The same simulator,
the same run, gives you both orderings. Repeating the run produces the identical alternating pattern
(checked 3×), so it is deterministic — but it is not *stable within a run*. Teaching point for the
chapter: a race does not announce itself as randomness. It shows up as a result that changes when you
edit something apparently unrelated.

## 3. Blocking vs non-blocking — the rules and the reasons

### The canonical guidelines, quoted

From **Clifford E. Cummings, "Nonblocking Assignments in Verilog Synthesis, Coding Styles That Kill!",
SNUG-2000 San Jose, Sunburst Design Inc. (Voted Best Paper, 1st Place), Rev 1.2.** The paper states eight
numbered guidelines. Extracted verbatim from the PDF (whitespace normalised):

> **Guideline #1:** When modeling sequential logic, use nonblocking assignments.
> **Guideline #2:** When modeling latches, use nonblocking assignments.
> **Guideline #3:** When modeling combinational logic with an always block, use blocking assignments.
> **Guideline #4:** When modeling both sequential and combinational logic within the same always block,
> use nonblocking assignments.
> **Guideline #5:** Do not mix blocking and nonblocking assignments in the same always block.
> **Guideline #6:** Do not make assignments to the same variable from more than one always block.
> **Guideline #7:** Use `$strobe` to display values that have been assigned using nonblocking assignments.
> **Guideline #8:** Do not make assignments using `#0` delays.

The paper's own conclusion, verbatim:

> "Following the above guidelines will accurately model synthesizable hardware while eliminating 90-100%
> of the most common Verilog simulation race conditions."

The paper opens by quoting the two guidelines everybody already knows and then asking the question this
chapter is built around:

> "Guideline: Use blocking assignments in always blocks that are written to generate combinational logic.
> Guideline: Use nonblocking assignments in always blocks that are written to generate sequential logic.
> **But why?** In general, the answer is simulation related. Ignoring the above guidelines can still infer
> the correct synthesized logic, but the pre-synthesis simulation might not match the behavior of the
> synthesized circuit."

That last sentence is the whole point and should be quoted in the chapter. The rules are **not** about
getting different gates. They are about the *simulation* of your RTL agreeing with the *hardware* the
synthesiser builds from it. Break the rules and you can ship a chip that works in the lab and not in
simulation, or vice versa — the worst possible failure mode, because your regression suite lies to you.

### Why `<=` in clocked blocks — the event-queue argument

Real flip-flops on a common clock all sample their D inputs at (approximately) the same instant, then all
change their Q outputs slightly later. Every flop reads the *pre-edge* state of the machine. Nothing reads
another flop's *post-edge* value on the same edge — that would need the new value to travel through the
combinational logic and arrive before the edge that produced it, i.e. negative time.

Non-blocking assignment encodes exactly that:

- All RHS evaluations happen in the active region ⇒ every clocked block reads pre-edge state.
- All LHS updates happen in the NBA region ⇒ every flop changes "simultaneously", after all reads.
- Because reads all happen before all writes, **the order in which the blocks run cannot matter**. The
  race in §2 is eliminated by construction, not by luck.

This "read-before-write" property is the single sentence to remember: *a `<=` block reads the old state
and writes the new state; there is no moment at which a block can see a half-updated machine.*

### Why statement order inside a `<=` block does not matter

**Verified** — `e03_reorder.v`. Four three-stage shift registers on the same clock: NBA in natural order
(`n1<=din; n2<=n1; n3<=n2`), NBA in **reversed** order (`r3<=r2; r2<=r1; r1<=din`), blocking in natural
order, blocking in reversed order. A single-cycle pulse is injected on `din`:

```
cyc | nba-fwd nba-rev | blk-fwd blk-rev
 0  |  100     100     |  111     100
 1  |  010     010     |  000     010
 2  |  001     001     |  000     001
 3  |  000     000     |  000     000
 4  |  000     000     |  000     000
```

Read the columns:

- `nba-fwd` and `nba-rev` are **identical**. Reordering the statements in a `<=` block changed nothing.
  The block is a *description of parallel hardware*; the semicolons are punctuation, not sequencing.
- `blk-fwd` shows `111` in cycle 0 — the pulse appeared at all three stages **in the same cycle**. The
  three-stage shift register collapsed into a wire. This is the classic failure.
- `blk-rev` shows `100`, `010`, `001` — it **works**. Writing the blocking assignments in reverse order
  happens to preserve read-before-write, and infers a correct shift register.

That last row is the trap worth dwelling on. Blocking assignment in a clocked block is not *always* wrong.
It is wrong *unpredictably*, depending on statement order, and it stops working the moment the stages live
in different `always` blocks (§2's `e09_raceorder.v`), because then there is no defined order at all. Code
that is correct only because you happened to type it in the right order is not code you can maintain, and
is not code a second simulator will agree with. This is why the rule is stated absolutely.

### The shift-register collapse, on its own

**Verified** — `e02_shift.v`, three flops, one pulse on `din`:

```
cyc | q1n q2n q3n | q1b q2b q3b
 0  |  1   0   0  |  1   1   1
 1  |  0   1   0  |  0   0   0
 2  |  0   0   1  |  0   0   0
 3  |  0   0   0  |  0   0   0
 4  |  0   0   0  |  0   0   0
```

The `<=` version propagates the pulse one stage per cycle. The `=` version passes it through all three
stages in one cycle, so the pulse arrives two cycles early and the register depth vanishes. A synthesis
tool reading the `=` version will typically infer **one** flip-flop and two wires, so the gate-level
netlist and the RTL simulation actually agree here — they are just both wrong relative to what you meant.

### Why `=` in combinational blocks

- A combinational block has no memory and no notion of an "edge". You want its internal temporaries to
  behave like local variables in a function: assign, then use the new value.
- Using `<=` inside `always @(*)` works but costs an extra delta cycle per assignment, and if the block
  reads a variable it also writes with `<=`, the block re-triggers itself on the NBA update — a
  self-oscillation risk and a guaranteed simulation/synthesis mismatch, since the synthesised gates have
  no delta cycles at all.
- **Verified** — `e17_combnba.v`, the same XOR written with `=` and with `<=`, sampled at increasing
  delta depth after an input change:

```
   same slot, before any delta: y_bl=x y_nb=x
   after one #0       : y_bl=1 y_nb=x
```

  After one `#0` the blocking version has already produced its answer; the non-blocking version has not,
  because its update is queued in the NBA region which is scheduled *after* the inactive region. Both
  settle by the next time step, but any code that samples in between sees a different answer for two
  descriptions of the same gate. That is the mismatch.

### Never mix them in one block

- `Guideline #5` above. Beyond simulator-specific weirdness, mixing makes the block unreadable: the reader
  cannot tell which assignments are "state" and which are "wire".
- Cummings' `Guideline #4` covers the legitimate case where you *do* want a bit of combinational logic
  inside a clocked block — the answer is to use `<=` for *everything* in that block, not to mix.
- `Guideline #6` — one variable, one `always` block — is the software equivalent of "no two threads write
  the same variable without a lock". Verified in §9 (`e15_multidrive.v`).

### The rule, as the chapter should state it

1. Combinational `always` block → `always @(*)` and `=` everywhere.
2. Clocked `always` block → `always @(posedge clk)` and `<=` everywhere.
3. Never both in one block.
4. Never assign one variable from two blocks.

And the reason, in one line: **`<=` makes your simulation match a real flip-flop; `=` makes your
simulation match a real wire.**

## 4. Sensitivity lists

### The four spellings

| Form | Meaning | Verdict |
|---|---|---|
| `always @(a or b)` | Verilog-1995 form. `or` is a **separator**, not a logical OR. | Legal, dated |
| `always @(a, b)` | Verilog-2001 comma form. Identical meaning. | Legal, clearer |
| `always @*` | Verilog-2001 implicit list | Preferred |
| `always @(*)` | Same thing with parentheses | Preferred |

- `@*` and `@(*)` are **exactly equivalent**. Choose one and be consistent; this guide uses `@(*)`.
- The `or` in `@(a or b)` confuses every newcomer. Point it out explicitly: it is punctuation.
- SystemVerilog `always_comb` is `@(*)` plus checking plus one semantic difference (below).

### What `@(*)` includes

Per IEEE 1364-2005 §9.7.5 (implicit event_expression list), `@*` is sensitive to every net and variable
**read** by any statement in the block, with these carve-outs the reader must know:

- Variables that appear **only on the left-hand side** of assignments in the block are *not* included.
  That is what stops `always @(*) y = y + 1;` from spinning forever on its own output... except that `y`
  there *is* read on the RHS, so it does spin. Be precise: "read" means read, wherever it appears.
- Indexing a vector or array adds **the whole vector/array**, not just the selected element. Prescribed by
  the standard, surprising in practice.
- **Signals read inside a called `function` or `task` are NOT added.** This is the big one.

### Verified: `@(*)` does not see through a function call

`e16_func.v`. `f_hidden(x)` returns `x + q`, where `q` is a module-level variable never named at the call
site. `f_clean(x, yy)` passes `q` explicitly:

```
p q | y_auto y_manual
1 0 |   1      1
1 5 |   1      6  <- only q changed
2 5 |   7      7
```

`y_auto` (the `f_hidden` version) **does not respond when `q` changes 0 → 5**. It stays at 1 while
`y_manual` correctly becomes 6. The block only wakes when `p` changes. A synthesiser, which reads the
function body and builds the real cone of logic, *will* wire `q` in — so the gates are right and the
simulation is wrong. Textbook simulation/synthesis mismatch.

- **Cure 1**: pass every input as a function argument. Then it appears at the call site and `@(*)` sees it.
- **Cure 2**: use `always_comb` (SystemVerilog, supported by `iverilog -g2012`). IEEE 1800 §9.2.2.2
  specifies that the inferred sensitivity list of `always_comb` **does** include variables read by called
  functions. This is a genuine language-level difference, not a style preference, and worth a callout box.

### Verified: `@(*)` warns on whole-array sensitisation

`e23_sensvec.v`, `always @(*) y2 = mem[idx];` where `mem` is `reg [7:0] mem [0:3]`:

```
$ iverilog -g2012 -Wall -o e23.sim e23_sensvec.v
e23_sensvec.v:11: warning: @* is sensitive to all 4 words in array 'mem'.
```

```
idx=0 v=00000010 y1=0 y2=00
idx=1 v=00000010 y1=1 y2=01
idx=1 v=00000010 y1=1 y2=aa  (mem[1] written by another process)
```

- Icarus's `-Wall` includes the `sensitivity-entire-array` warning class. It does **not** include
  `sensitivity-entire-vector` — the vector part-select `v[idx]` on line 10 produced no warning even
  though the same whole-object rule applies. `iverilog -g2012 -Wsensitivity-entire-vector` enables it.
- This is one of the very few places Icarus tells you something about your sensitivity list. Use it.

### Verified: an incomplete sensitivity list produces a stale output

`e04_sens.v`. The same 2:1 mux written three ways: `always @(a)` (bug — `b` and `sel` missing),
`always @(a or b or sel)`, `always @(*)`:

```
  a b sel | y_bad y_good y_star
  0 0  0  |   0     0      0
  1 0  0  |   1     1      1
  1 0  1  |   1     0      0  <-- sel changed, y_bad stale
  1 1  1  |   1     1      1  <-- b changed, y_bad still stale
  0 1  1  |   1     1      1  <-- a changed, y_bad finally catches up
```

- Row 3 is the money row: `sel` went to 1, so the correct output is `b` = 0, but `y_bad` is stuck at 1.
- Row 4 shows the nastiest property of this bug: `y_bad` is *coincidentally correct*. A stale output
  agrees with the right answer roughly half the time, so a short test can pass.
- Row 5: the block wakes only because `a` changed — an input that, at `sel=1`, does not even affect the
  result. The block's behaviour now depends on the history of an irrelevant signal.
- Synthesis builds the full mux regardless. **The gates are right; the simulation is wrong.** Same failure
  class as the function-call case.
- Some synthesis tools warn about incomplete sensitivity lists; some silently "fix" them. **Icarus says
  nothing at all** — see below.

### Verified: `always @(*)` does not self-start

> **Sharpened 2026-08-21 by chapter 13's research:** this trap now has a measured
> in-simulator SystemVerilog fix on Icarus 13.0 — `always_comb` DOES execute at
> time zero (the `@(*)` twin stays x, the `always_comb` twin computes), making
> time-zero execution the SECOND measured behavioral difference between the two
> (chapter 9 measured the first: function-body sensitivity). This file's claim
> stands for `@(*)`; chapters quoting "the one real difference" should read two.

`e19_time0.v`. Two identical combinational blocks; one reads a variable initialised at its *declaration*,
the other reads a variable assigned in an `initial` block:

```
t=1: ya=x (block ran 0 times)   yb=4 (block ran 1 times)
t=2: ya=5 (block ran 1 times)   yb=5 (block ran 2 times)
```

- The declaration initialiser `reg [3:0] a_decl = 4'h3;` generated **no event**, so the `always @(*)`
  block never ran and `ya` stayed `x` for the whole first time step.
- The `initial b_init = 4'h3;` version *did* generate an event and the block ran.
- An `always @(*)` block is not "a continuously true equation". It is a process asleep on an event list.
  It only ever produces a value in response to a change. In real designs this rarely bites because inputs
  come from other logic that does change — but in testbenches with declaration initialisers it bites
  immediately, and it explains the `x` values in several of the experiments in these notes.

### Edges

- `posedge` on a 1-bit signal: any of `0→1`, `0→x`, `0→z`, `x→1`, `z→1`. `negedge` symmetrically. Note
  `0→x` counts as a posedge — this is why an uninitialised reset can fire clocked blocks unexpectedly.
- On a **multi-bit** signal, `posedge`/`negedge` are evaluated on the **least significant bit only**.
  `always @(posedge bus)` compiles and does something almost certainly not intended. Never put a vector
  in an edge expression.
- Verilog-2001 adds an `edge` keyword? No — `edge` is a *timing check / specify block* construct, not a
  general event control in 1364. SystemVerilog (IEEE 1800) **does** add `edge` as an event control meaning
  "either edge". Icarus accepts `always @(edge sig)` under `-g2012`. Mention it, do not rely on it.
- Mixing edges and levels in one list (`always @(posedge clk or rst)`) is illegal in the synthesisable
  subset — every term must be an edge, or none of them. `always @(posedge clk or negedge rst_n)` is the
  legal asynchronous-reset form (§6).

### Why `always @(*)` with `<=` inside is a code smell

- It compiles, it usually works, and it advertises that the author does not know which of the two kinds of
  logic they are writing.
- Concretely (§3, `e17_combnba.v`): it delays the result by a delta cycle relative to the `=` version, so
  a chain of such blocks settles later than the equivalent `assign` chain, and anything sampling in
  between disagrees.
- If the block reads and writes the same variable, the NBA update re-triggers the block, giving an
  infinite loop at a single simulation time. Icarus documents a warning class for this —
  `iverilog -Winfloop`, deliberately excluded from `-Wall` because it produces many false positives.
  **Honest note:** on the obvious test case (`e30_infloop.v`, `always @(*) y = y + a;`) `-Winfloop`
  emitted nothing. Do not promise the reader this flag will catch their loop.
- Reviewer heuristic to teach: **the assignment operator tells you what kind of block you are in.** If the
  operator and the sensitivity list disagree, one of them is a bug.

## 5. Latch inference — the classic trap

### The rule, stated exactly

In a **combinational** block, a synthesis tool infers a level-sensitive latch for a variable if there
exists **any execution path through the block on which that variable is not assigned**. The tool has no
other way to honour your code: you wrote "under condition C, `y` keeps whatever it had", and the only
piece of hardware that keeps a value without a clock is a latch.

Precise consequences:

- The test is **per variable**, not per block. One block can produce three clean combinational outputs and
  one latch.
- The test is **per path**, not per statement. An `if` with an `else` that assigns a *different* variable
  still leaves a path where the first variable is unassigned.
- A `case` without a `default:` is incomplete unless the case items provably cover every value of the
  selector. `case (sel)` on a 2-bit `sel` with all four arms present is complete; on a 3-bit `sel` with
  four arms it is not. Tools differ on how hard they try to prove coverage — do not rely on it.
- In a **clocked** block the same "unassigned on some path" code is *correct and normal*: it infers a
  flip-flop with a clock enable (§1, `q_en` in `e18b_reset.v`). The trap is specific to combinational
  blocks.

### Why it is almost always a bug

- You wanted a mux and you got a mux **plus** a storage element, so the block now has memory you did not
  design and did not think about.
- Latches are transparent while their enable is high. Data flows *through* them, so the timing analyser
  has to reason about paths that begin and end mid-cycle. Static timing analysis of a latch-based design
  is materially harder than of a flop-based one, and most FPGA flows handle it badly.
- On FPGAs the latch is usually built out of a LUT with feedback, which is slow, does not use the
  dedicated flip-flop that is sitting there unused, and can glitch.
- The output now depends on *when* things changed, not only on what they are, so a functional test can
  pass and the real part fail.
- For this guide specifically: a latch in the FP adder's alignment or normalisation logic will produce a
  design that gives the right answer for a single vector and the wrong one when you stream vectors.

### Verified: what the latch actually does in simulation

`e05_latch.v`. Three versions of the same intent: an incomplete `if`, an incomplete `case`, and the
default-assignment cure:

```
sel d | y_latch y_case y_fixed
 01  5 |    5      5      5
 11  5 |    5      5      0   <- sel=11: latch HOLDS 5, case HOLDS
 11  a |    5      5      0   <- d changed, held value unchanged
 00  a |    5      0      0
```

- Rows 2 and 3: with `sel=2'b11` neither buggy block assigns its output, so both **hold** the previous
  value `5`, and go on holding it when `d` changes to `a`. That held value *is* the latch, visible in
  simulation.
- `y_fixed` correctly goes to `0` — its unconditional default ran.
- Row 4 shows the case block picking up `2'b00 → 0` while the `if` block still holds `5`.

The important nuance for the chapter: **the simulation is behaving exactly like the hardware here.** RTL
simulation of a latch and gate-level simulation of a latch agree. This is *not* a simulation/synthesis
mismatch — it is a design bug that both faithfully reproduce. That distinction matters, because the cures
below fix the design, not the simulation.

### The three cures

**Cure 1 — unconditional default assignment at the top of the block.** Best default habit; scales to any
number of outputs and any nesting depth.

```verilog
always @(*) begin
    y     = 4'b0000;      // every output gets an unconditional value
    valid = 1'b0;
    if (sel == 2'b01) begin
        y     = d;
        valid = 1'b1;
    end
end
```

**Cure 2 — complete `if/else`.** Fine for two-way logic, brittle when the block grows.

```verilog
always @(*)
    if (sel == 2'b01) y = d;
    else              y = 4'b0000;
```

**Cure 3 — `default:` arm on every `case`.** Non-negotiable for FSMs (§7).

```verilog
always @(*)
    case (sel)
        2'b00:   y = a;
        2'b01:   y = b;
        2'b10:   y = c;
        default: y = 4'bxxxx;   // or a safe value; see note
    endcase
```

Note on `default: y = 4'bxxxx;` versus a defined value: assigning `x` tells the synthesiser "don't care",
which lets it optimise, and makes the unreachable case *loudly* visible as `x` in simulation. Assigning a
defined value is safer against real `x` propagation and against a state machine falling into an illegal
state. For a teaching guide, prefer a defined value and say why the `x` idiom exists.

**Cure 4 (SystemVerilog) — `always_comb`.** IEEE 1800 says a tool *should* check the block is
combinational and report a latch; it does not say *shall*, and **Icarus 13.0 reports nothing** — see
the correction note in §1. `always_latch` documents an intentional one. So this is a real cure only in
a toolchain that implements the check; under Icarus alone it documents intent and catches nothing.
Treat it as a complement to cures 1-3, never a replacement for them.

### How to detect an accidental latch

**In synthesis** — this is where it is easy. Every tool reports it:

- Vivado: `WARNING: [Synth 8-327] inferring latch for variable 'y_reg'`
- Quartus: `Warning (10240): Inferred latch for "y"`
- Yosys: shows `$dlatch` cells; `check` and the synthesis log flag them.
- Practical rule for the reader: **read the synthesis log for the word "latch" every single build.** A
  latch you meant to infer is rare enough that any occurrence deserves inspection.

**In simulation** — much harder, and this is where beginners are misled.

- **Icarus reports nothing.** Verified: `e05_latch.v` compiles clean with `-Wall`, and `-Wextra` is not
  even a recognised class:

```
$ iverilog -g2012 -Wall -Wextra -o e05x.sim e05_latch.v
Ignoring unknown warning class extra
exit=0
```

  No warning, no note. This is expected and correct: **Icarus is a simulator, not a synthesiser.** It
  never asks "what gates would this be?". It executes the procedural code you wrote, and code that holds
  a value is perfectly ordinary procedural code. There is no latch object anywhere in `vvp`'s data
  structures to warn about. The same is true of Verilator's default mode versus `--lint-only -Wall`
  (which *does* have `LATCH`), and of ModelSim/Questa in simulation.
- Say this plainly in the chapter, because the internet is full of advice that implies simulation will
  catch it. **A simulator cannot warn you about a latch, only a synthesiser or a linter can.**
- What simulation *can* do is let you write a test that detects the *behaviour*. Verified,
  `e25_latchdetect.v` — hold the block in its unhandled input state, change a signal the output should
  depend on, and assert that the output moved:

```
LATCH DETECTED: with sel=11, y held 5 across a change of d
with sel=xx, y=5  (a true mux would give x, a latch holds)
checks failed = 1
```

  The second line is the other usable technique: **drive the unhandled selector to `x`.** Genuinely
  combinational logic propagates the `x` to its output; a latch keeps its stale defined value. An output
  that stays clean when its control input is `x` is holding state.
- If a linter is available, use it. `verilator --lint-only -Wall` on the same file is the cheapest
  latch-finder a reader can install, and it is worth a sidebar even though this guide's toolchain is
  Icarus.

### `full_case` and `parallel_case`

Source: **Clifford E. Cummings, "'full_case parallel_case', the Evil Twins of Verilog Synthesis",
SNUG-1999 Boston, Sunburst Design Inc. (Voted Best Paper, 1st Place), Rev 1.1.**

What they are: synthesis pragmas written as comments, e.g.
`case (sel) // synopsys full_case parallel_case`.

- `full_case` asserts "every value the selector can take is covered by a case item". The tool then treats
  uncovered values as don't-cares and **stops inferring the latch** — without changing what the code says.
- `parallel_case` asserts "no two case items can match at once". The tool then builds parallel decode
  logic instead of a priority chain.

Why modern practice avoids them, from the paper's abstract, verbatim:

> "The popular myth that exists surrounding 'full_case parallel_case' is that these Verilog directives
> always make designs smaller, faster and latch-free. This is false! Indeed, the 'full_case parallel_case'
> switches frequently make designs larger and slower and can obscure the fact that latches have been
> inferred. These switches can also change the functionality of a design causing a mismatch between
> pre-synthesis and post-synthesis simulation, which if not discovered during gate-level simulations will
> cause an ASIC to be taped out with design problems."

Its guidelines, verbatim:

> "Guideline: In general, do not use 'full_case parallel_case' directives with any Verilog case
> statements."
> "Guideline: There are exceptions to the above guideline but you better know what you're doing if you
> plan to add 'full_case parallel_case' directives to your Verilog code."
> "Guideline: only use full_case parallel_case to optimize one hot FSM designs."
> "Guideline: Educate (or fire) any employee or consultant that routinely adds 'full_case parallel_case'
> to all case statements in their Verilog code, especially if the project involves the design of medical
> diagnostic equipment..."
> "Guideline: Code all intentional priority encoders using if-else-if statements."

Three structural objections worth spelling out:

1. They are **comments**. The simulator ignores them completely; only the synthesiser reads them. So they
   are a mechanism whose entire purpose is to make simulation and synthesis disagree.
2. `full_case` fixes the *symptom* (the latch report) and not the *cause* (the missing assignment). You
   have silenced the warning and kept the bug.
3. They are tool-specific and vendor-prefixed. A `default:` arm is portable, standard, visible to every
   tool, and shorter.

SystemVerilog replaces both with real language keywords — `unique case` and `priority case` — which the
*simulator* also checks and can report violations at run time. That is the correct modern answer, and
the reason the pragmas are dead.

## 6. Reset strategy

### The two templates

**Synchronous reset** — `rst_n` is an ordinary data input to the flop. It is not in the sensitivity list.

```verilog
always @(posedge clk)
    if (!rst_n) q <= '0;
    else        q <= d;
```

**Asynchronous reset** — `negedge rst_n` is in the sensitivity list, and the reset test **must** be the
first branch of the `if`. Anything else is outside the recognised template.

```verilog
always @(posedge clk or negedge rst_n)
    if (!rst_n) q <= '0;
    else        q <= d;
```

Rules for the async form that the reader will get wrong:

- Every term in the list must be an edge. `always @(posedge clk or rst_n)` is illegal for synthesis.
- The polarity in the list must match the polarity of the test. `negedge rst_n` pairs with `if (!rst_n)`.
- The reset branch must not depend on anything but the reset. `if (!rst_n && en)` is not a template.
- Only one reset per flop. Two async terms (`or negedge rst_n or posedge set`) is a set/reset flop and
  only some libraries have one.

### Verified: what the two actually do

`e18b_reset.v` — counters preloaded to `9` so a wrap cannot be mistaken for a reset. Reset asserted at
t=2 and released at t=4, i.e. entirely **between** the clock edges at t=0 and t=5:

```
t=0 rst_n=1 en=1 | q_sync=9 q_async=9 q_en=9
t=2 rst_n=0 en=1 | q_sync=9 q_async=0 q_en=9
t=4 rst_n=1 en=1 | q_sync=9 q_async=0 q_en=9
t=5 rst_n=1 en=1 | q_sync=a q_async=1 q_en=a
t=15 rst_n=1 en=1 | q_sync=b q_async=2 q_en=b
t=24 rst_n=1 en=0 | q_sync=b q_async=2 q_en=b
t=25 rst_n=1 en=0 | q_sync=c q_async=3 q_en=b
t=35 rst_n=1 en=0 | q_sync=d q_async=4 q_en=b
```

- At **t=2** `q_async` goes to `0` immediately — no clock edge occurred. That is the whole meaning of
  "asynchronous".
- `q_sync` **never sees the reset at all**. It was `9` before and it counts `a, b, c, d` afterwards. The
  reset pulse was shorter than a clock period and the synchronous flop simply missed it.
- This is the single most important practical difference and it is the one beginners are never shown:
  a synchronous reset must be held **at least one full clock period**, and the clock must be running.

### Tradeoffs

**Synchronous reset**

- *For*: the reset is just data, so it is covered by ordinary setup/hold analysis — no special timing
  arcs. It cannot glitch a flop between edges, so a glitch on the reset net is filtered by the flop.
  It keeps the design entirely synchronous, which is easier to reason about and to formally verify.
  On ASICs it often costs no extra area because the reset merges into the existing input logic cone.
- *Against*: **it needs a running clock.** A design that must come up in a known state before its PLL
  locks cannot use it. It adds a term to the data path, so it can lengthen the critical path (ch1's
  `T_clk` inequality — the reset mux is in series with the logic). And the reset pulse must be wide
  enough to be captured, as `e18b_reset.v` shows.

**Asynchronous reset**

- *For*: works with no clock. Guarantees a known state at power-up. On most FPGAs and standard-cell
  libraries the flop has a **dedicated** asynchronous clear pin, so it costs nothing in the data path.
- *Against*: the *release* is the dangerous part, see below. It creates a timing arc (recovery/removal)
  that the tool must check. A glitch on the reset net resets the flop for real. And an asynchronous reset
  tree is, by definition, an asynchronous signal crossing into your clock domain.

### Reset recovery and removal timing

- **Recovery time**: the minimum time an asynchronous reset must be *de-asserted* **before** the active
  clock edge, for that edge to be captured reliably. It is the setup-time analogue for reset release.
- **Removal time**: the minimum time an asynchronous reset must stay asserted **after** the clock edge.
  The hold-time analogue.
- Violating either puts the flop into **metastability** (ch1) exactly as a setup/hold violation does. The
  flop may resolve to reset or not-reset, and different flops in the same register may resolve
  differently — so a 4-bit counter can come out of reset as, say, `0011`.
- Asserting an async reset is safe (nothing is being decided). **De-asserting it is the hazard.** The rule
  is therefore: *assert asynchronously, de-assert synchronously.*

### Reset synchroniser

The standard two-flop circuit. Its reset input is asynchronous; its output is guaranteed to change only
just after a clock edge, so downstream flops always meet recovery/removal.

```verilog
reg s1, s2;
always @(posedge clk or negedge arst_n)
    if (!arst_n) {s2, s1} <= 2'b00;
    else         {s2, s1} <= {s1, 1'b1};

wire rst_n_sync = s2;      // use THIS as the reset for the rest of the domain
```

- Note the `1'b1` shifting in: the flops are cleared asynchronously and then walk a `1` through on the
  clock. Assertion is instant; de-assertion takes two clocks and is edge-aligned.
- One synchroniser **per clock domain**. This matters for ch12 if the design ever has more than one clock.

**Verified** — `e26_resetrelease.v`, raw async reset released at t=13, two clock periods before it is
"needed", with a two-flop synchroniser alongside:

```
t=0 arst_raw=0 arst_sync=x | q_raw=x q_sync=x
t=5 arst_raw=0 arst_sync=0 | q_raw=0 q_sync=0
t=13 arst_raw=1 arst_sync=0 | q_raw=0 q_sync=0
t=15 arst_raw=1 arst_sync=0 | q_raw=1 q_sync=0
t=25 arst_raw=1 arst_sync=1 | q_raw=2 q_sync=0
t=35 arst_raw=1 arst_sync=1 | q_raw=3 q_sync=1
t=45 arst_raw=1 arst_sync=1 | q_raw=4 q_sync=2
```

- `arst_raw` goes high at t=13, an arbitrary 2 ns before the t=15 edge. `q_raw` starts counting at t=15 —
  in RTL simulation this is clean, but in **hardware** that 2 ns may be less than the recovery time and
  the flop's behaviour at t=15 is undefined.
- `arst_n_sync` does not rise until t=25, and it rises *aligned to a clock edge*. `q_sync` starts counting
  at t=35, safely.
- **Honest caveat for the chapter:** RTL simulation cannot show you the recovery violation. Both counters
  look fine above. The synchroniser's value is invisible in simulation and only appears in static timing
  analysis and in silicon. This is a place where "it simulated fine" is worth nothing.

### What an FPGA actually does

- Most FPGA flip-flops (AMD/Xilinx 7-series and later, Intel/Altera) have **one** dedicated
  set/reset input, and in modern families it is **synchronous-preferred**. Using an asynchronous reset can
  force the tool to spend fabric on it, block certain optimisations (shift-register-LUT / SRL inference,
  block-RAM output register packing, DSP register packing) and increase both area and delay.
- FPGA configuration already initialises every flop from the bitstream. This is the crucial point for a
  hobbyist reader: **on an FPGA, a flop's power-up value is whatever you gave it, with or without a
  reset.** The `reg [3:0] cnt = 4'h0;` declaration initialiser is honoured by the FPGA tools — it becomes
  part of the bitstream (see §9; it is a no-op on an ASIC).
- AMD's *Vivado Design Suite User Guide: Synthesis* (UG901) documents the recognised templates for
  flip-flops with synchronous and asynchronous reset, and for latches. Intel/Altera publish an equivalent
  "Recommended HDL Coding Styles" chapter. Both vendors' current guidance is: **prefer synchronous reset,
  and reset only what needs resetting.**
- Practical guidance for this guide's reader: use **synchronous, active-low reset** throughout.
  It matches the FPGA fabric, keeps the design fully synchronous, needs no synchroniser, and avoids every
  recovery/removal issue. Mention async reset so the reader can read other people's code.

### What to reset and what not to

The distinction that ch11 depends on:

- **Control state must be reset.** An FSM's state register, a valid/ready handshake bit, a counter that
  gates something, a "busy" flag. If the machine can come up in an illegal state it may never reach a
  legal one. This is a correctness requirement.
- **Datapath pipeline registers usually need no reset.** The mantissa, exponent and sign registers
  between the FP adder's pipeline stages hold garbage for the first few cycles after reset — and that is
  fine, because the **valid bit travelling alongside them is reset**, so nothing downstream acts on the
  garbage. Resetting them buys nothing.
- Why it matters, concretely:
  - Reset is a high-fanout net. Not resetting the datapath can remove thousands of loads from it, which
    makes it far easier to time.
  - On FPGAs, a reset on a datapath register can prevent it being absorbed into an SRL, a block RAM output
    register or a DSP block — a real area and speed cost.
  - It shortens the reset tree and reduces reset-domain crossing surface.
- The rule to teach: **reset the bits that decide, not the bits that carry.**
- Counter-case worth flagging: if `x` propagation in simulation is making your waveforms unreadable, reset
  the datapath anyway during bring-up, or initialise it in the testbench. `x`-cleanliness is a debugging
  convenience, not a hardware requirement (§8).
- Forward pointer: in ch11 the pipeline registers carrying the aligned mantissas and the shift amounts get
  no reset; the `valid` pipeline and any stall/flush control bits get one.

## 7. Finite state machines

An FSM is the first thing in this guide that *combines* the two kinds of logic: a state register (§1's
flop template) plus next-state and output decode (§1's combinational template). Everything in §§3–6 shows
up at once.

State encoding as parameters, not magic numbers:

```verilog
localparam [1:0] S_IDLE = 2'd0,
                 S_RUN1 = 2'd1,
                 S_RUN2 = 2'd2,
                 S_DONE = 2'd3;
```

### The three coding styles

All three were built and run as `e27_fsm.v` — the same machine (wait for `go`, be busy for two cycles,
pulse `done`) coded three ways in one file, sharing one clock:

```
 t  rst go | s1(st busy done) | s2(st busy moore mealy) | s3(st busyq)
 30  1  0  |  1   1    0     |  1   1    0     0    |  1   1
 40  1  0  |  2   1    0     |  2   1    0     0    |  2   1
 50  1  0  |  3   0    1     |  3   0    1     0    |  3   0
 60  1  0  |  0   0    0     |  0   0    0     0    |  0   0
```

All three styles produce **identical** state sequences and identical `busy` waveforms. The choice is about
readability and about where the outputs are registered, not about behaviour.

**One-block style** — state and outputs all assigned with `<=` in a single clocked block.

```verilog
always @(posedge clk)
    if (!rst_n) begin s_state <= S_IDLE; busy <= 1'b0; done <= 1'b0; end
    else begin
        busy <= 1'b0;  done <= 1'b0;              // default assignment
        case (s_state)
            S_IDLE: if (go) begin s_state <= S_RUN1; busy <= 1'b1; end
            S_RUN1: begin s_state <= S_RUN2; busy <= 1'b1; end
            S_RUN2: begin s_state <= S_DONE; done <= 1'b1; end
            S_DONE: s_state <= S_IDLE;
            default: s_state <= S_IDLE;
        endcase
    end
```

- *For*: compact; one block, one assignment operator, no chance of the blocking/non-blocking mistake; all
  outputs are automatically registered (glitch-free, good for timing).
- *Against*: outputs are one cycle **later** than the state they belong to, because you must assign them
  in the state *before*. Reading the code, "which cycle does `busy` go high?" is not obvious. Gets ugly
  for large machines.
- Note the `default:` arm and the default output assignments — §5 applies even in a clocked block, not for
  latch reasons but so that every output has a defined value on every path.

**Two-block style** — one clocked block for the state register, one combinational block for next state
*and* outputs. This is Cummings' recommended default.

```verilog
always @(posedge clk)
    if (!rst_n) s_state <= S_IDLE;
    else        s_state <= s_next;

always @(*) begin
    s_next = s_state;          // default: hold state
    busy   = 1'b0;             // default: outputs deasserted
    done   = 1'b0;
    case (s_state)
        S_IDLE:  if (go) s_next = S_RUN1;
        S_RUN1:  begin busy = 1'b1; s_next = S_RUN2; end
        S_RUN2:  begin busy = 1'b1; s_next = S_DONE; end
        S_DONE:  begin done = 1'b1; s_next = S_IDLE; end
        default: s_next = S_IDLE;
    endcase
end
```

- *For*: reads like the state diagram. Outputs line up with the state they are named for. Easiest to
  review against a spec.
- *Against*: outputs are **combinational**, so they can glitch during the cycle and add delay to whatever
  they drive. Two blocks means two chances to use the wrong assignment operator.
- `s_next = s_state;` as the first line is the FSM version of the default-assignment idiom. Without it, a
  `case` arm that does not assign `s_next` infers a latch on `s_next` (§5).

**Three-block style** — state register, next-state combinational, *plus* a third block that registers the
outputs.

```verilog
always @(posedge clk) ... s_state <= s_next; ...      // block 1: state register
always @(*) ... s_next = ... ;                        // block 2: next state
always @(*) begin                                     // block 3a: output decode of s_next
    busy_c = 1'b0;
    case (s_next)
        S_RUN1, S_RUN2: busy_c = 1'b1;
        default: ;
    endcase
end
always @(posedge clk) busy_q <= busy_c;               // block 3b: register it
```

- *For*: outputs are registered (clean, fast, no glitches) **and** still line up with the correct cycle,
  because block 3a decodes `s_next` rather than `s_state`. Best of both.
- *Against*: most code. Overkill for a four-state machine.
- Verified above: the `s3` column asserts `busyq` in exactly the same cycles as the other two styles, so
  decoding `s_next` really does cancel the register's one-cycle delay.

Recommendation for the guide: **teach the two-block style as the default**, show the three-block style as
the answer when a registered output is needed, mention one-block for tiny machines.

### Moore vs Mealy

- **Moore**: output is a function of state only. `out = f(state)`.
- **Mealy**: output is a function of state *and* current inputs. `out = f(state, in)`.
- Mealy machines usually need fewer states and respond one cycle earlier. Moore outputs are stable for a
  whole cycle and cannot glitch in response to input noise.

**Verified** — `e28_mealy.v`. Same machine, a Mealy output `mealy_y` (asserted in state B while `x` is
high) and the same signal registered to make it Moore-like:

```
  t  x | st mealy_y moore_reg
 20  1 |  0    0       0
 30  1 |  1    1       0
 40  1 |  1    1       1
 50  1 |  1    1       1
 60  1 |  1    1       1
--- glitch demo: toggling x with NO clock edge ---
t=71 x=1 st=1 mealy_y=1 moore_reg=1
t=72 x=0 st=1 mealy_y=0 moore_reg=1
```

- `mealy_y` asserts at t=30; the registered version asserts at t=40 — **one cycle earlier for Mealy**.
- The glitch demo is the important half. Between t=71 and t=72 there is **no clock edge**. `x` toggled and
  `mealy_y` followed it immediately, while `moore_reg` did not move. A Mealy output is a wire from your
  inputs to your outputs: it inherits their glitches, their timing and their asynchrony.
- Design rule to teach: **never feed a Mealy output directly into another module's clock or asynchronous
  reset**, and be careful feeding one into another FSM's input — you are building a combinational path
  between two state machines and it will show up on the critical path.

### State encoding

| Encoding | Bits for N states | Wins when |
|---|---|---|
| Binary | `ceil(log2(N))` | state register is expensive; many states; ASIC |
| Gray | `ceil(log2(N))` | state bits cross a clock domain; low-power counters |
| One-hot | `N` | FPGA; decode logic is the bottleneck; N small-to-medium |

- **Binary** — fewest flops, most decode logic. `case (state)` becomes a full decoder.
- **One-hot** — one flop per state, exactly one bit set. Next-state logic for each bit is a small OR of
  the transitions into that state, and output decode is a single bit test (`if (state[S_RUN1])`). On an
  **FPGA this is usually the winner**: flops are free (there is one next to every LUT whether you use it
  or not) and LUT depth is what costs you speed.
- **Gray** — exactly one bit changes per transition. Two real uses: crossing a clock domain (only one bit
  can be caught mid-flight, so the sampled value is always either the old or the new state, never a third
  one), and reducing switching power. Only valid if the state sequence is genuinely a ring.
- One-hot needs care with `default:`. With N flops there are `2^N` encodings and only N are legal; an
  upset can land you in an illegal state. Either decode with `casez`/`if` on individual bits and provide a
  recovery `default`, or accept the risk.
- Practical note: **synthesis tools re-encode FSMs by default.** Vivado's `FSM_ENCODING` and Quartus's
  equivalent will happily convert your binary parameters to one-hot. Writing binary `localparam`s does not
  mean you get binary flops. Say this — readers are surprised by it.
- For this guide's FP adder control (a handful of states), binary is fine and the tool will pick whatever
  it likes anyway.

### The default-assignment idiom for FSM outputs

Restating §5 in FSM terms, because this is where readers meet it for real:

```verilog
always @(*) begin
    // 1. every output and s_next gets an unconditional default
    s_next        = s_state;
    shift_en      = 1'b0;
    load_a        = 1'b0;
    result_valid  = 1'b0;
    // 2. then only the exceptions are written per state
    case (s_state)
        ...
    endcase
end
```

- Guarantees no latches, no matter how many states or outputs you add later.
- Makes each `case` arm read as "what is different about this state", which is how a state diagram reads.
- The alternative — writing every output in every arm — is correct but does not survive maintenance.

### Forward pointer: the FP adder's control FSM (chs 11–12)

A multi-cycle (non-pipelined) two-input FP adder decomposes into exactly the states this section's
example machine has:

```
S_IDLE     : wait for `start`. Latch operands A, B.
S_UNPACK   : split sign / exponent / mantissa, restore the hidden bit,
             detect zero / inf / NaN / subnormal.
S_ALIGN    : compare exponents, right-shift the smaller mantissa by the
             difference, accumulate guard/round/sticky  (this is ch2's align_sticky.v)
S_ADDSUB   : effective add or subtract of the aligned mantissas
S_NORM     : leading-zero count, left-shift, adjust exponent
             (or right-shift by 1 and increment exponent on carry-out)
S_ROUND    : round-to-nearest-even using G/R/S; may cause a second normalisation
S_PACK     : reassemble the 32-bit result, handle overflow to inf and underflow to zero
S_DONE     : assert `result_valid` for one cycle, return to S_IDLE
```

Points to make when the reader gets there:

- Each state's *datapath* is combinational (shifters, adders, LZC — all from ch1). The FSM only decides
  *which* one is active and *when* results are captured. The control/datapath split is the whole idea.
- The datapath registers between states hold garbage until they are written — they get no reset. The state
  register and `result_valid` get one (§6).
- `S_ROUND` can loop back to `S_NORM` once. That is why a state machine, and not just a counter, is
  needed for the multi-cycle version.
- The **four-input** adder of ch12 wraps this in an outer machine (or a tree of adders); the same three
  coding-style choices apply one level up.
- Ch11 replaces the FSM with a pipeline: the states become stages, the state register becomes the `valid`
  bit travelling down the pipe, and every stage boundary is a non-blocking assignment. The FSM section is
  the conceptual bridge to that chapter — same decomposition, different time axis.

## 8. Simulation artifacts the reader will actually hit

These are the things that will cost the reader an evening. Every one is verified below.

### The uninitialised clock generator

`always #5 clk = ~clk;` is the standard clock. It has one failure mode: **`~x` is `x`**, so if `clk`
starts at `x` it stays at `x` forever and the design never gets an edge.

**Verified** — `e08_clkinit.v`, three clocks: one never initialised, one initialised at its declaration,
one initialised in an `initial` block:

```
t=0 clk_bad=x clk_good=0 clk_init=0
t=5 clk_bad=x clk_good=1 clk_init=1
t=10 clk_bad=x clk_good=0 clk_init=0
t=15 clk_bad=x clk_good=1 clk_init=1
t=20 clk_bad=x clk_good=0 clk_init=0
t=25 clk_bad=x clk_good=1 clk_init=1
posedges seen: clk_bad=0  clk_good=3
```

- `clk_bad` never leaves `x`. **Zero** posedges in 26 time units. Every clocked block in the design
  simply never runs, and the whole DUT stays `x` — which the reader will misdiagnose as a reset problem
  or a connection problem for an hour.
- Both cures work identically in Icarus: `reg clk = 1'b0;` or `initial clk = 1'b0;`.
- Preferred idiom for the guide, because the intent is explicit and the half-period is named once:

```verilog
localparam CLK_HALF = 5;
reg clk = 1'b0;
always #CLK_HALF clk = ~clk;
```

- Watch out for the related bug `always #5 clk <= ~clk;` — with `<=` the RHS is sampled and the update
  scheduled, which still works, but mixing `#` delay with `<=` is a habit that breaks in subtler places.
  Use `=` in the clock generator; a testbench clock is not synthesisable code and the §3 rules do not
  apply to it.

### Drive stimulus on the opposite edge

If the testbench changes a DUT input at the same instant the DUT samples it, you have written a race —
exactly the §2 race, with the testbench as one of the two processes. There is no setup time in RTL
simulation, so the outcome depends on process ordering.

**Verified** — `e29_tbedge.v`. Two identical D flip-flops. One is fed by a testbench block that drives on
`posedge clk` (the edge the DUT samples); the other by a block that drives on `negedge clk`. Both are
asked to produce a one-cycle pulse in cycle 2:

```
  t | d_same q_same | d_opp q_opp
 11 |   0     0    |   0     0
 21 |   1     0    |   1     0
 31 |   0     0    |   0     1
 41 |   0     0    |   0     0
 51 |   0     0    |   0     0
 61 |   0     0    |   0     0
```

- `d_opp` pulses, and `q_opp` captures it one cycle later. Correct.
- `d_same` pulses — you can see the `1` at t=21 — and **`q_same` never goes high at all.** The pulse was
  silently dropped. The DUT is fine; the testbench is broken.
- Re-running the simulation three times gives byte-identical output (`md5` matched), so **this bug will
  not go away and will not look random.** It looks like a DUT bug.
- Mechanism: §2's `e13_order.v` showed Icarus alternating the execution order of same-edge blocks between
  time slots. At the edge that should have set up the pulse the DUT ran first (saw the old `0`); at the
  next edge the stimulus block ran first (clearing `d_same` to `0` before the DUT read it). The `1` was
  never visible to the DUT at a sampling instant.
- Rules for the reader's testbenches:
  1. Drive DUT inputs on `negedge clk` when the DUT samples on `posedge clk`. Half a clock of margin.
  2. Or drive them with `<=` from a `posedge` block — non-blocking stimulus is safe for the same reason
     non-blocking pipeline registers are safe.
  3. **Sample** DUT outputs on `negedge`, or with `$strobe`, or after an explicit small delay.
  4. Never mix: pick one convention per testbench.

### `#0` is a smell

- Cummings, Guideline #8: *"Do not make assignments using `#0` delays."*
- `#0` schedules into the **inactive** region, which is region 2 of 5. It is not "let everything settle";
  it is "go to the back of one particular queue".
- **Verified** — `e07_regions.v`, §2: after `r <= d` and a `#0`, `r` is *still* the old value, because the
  NBA region (3) has not run yet. `#0` cannot be used to observe non-blocking results.
- **Verified** — `e20_delta.v`, §2: a three-deep combinational cascade had **already fully settled** before
  the first `#0` returned, because the active region drains to exhaustion. `#0` was not needed either.
- So `#0` neither achieves what people use it for, nor is it necessary for what it appears to achieve. Its
  only real effect is to create a *new* race — now against every other process that also used `#0`.
- If you need "after everything has settled at this time", the tools are `$strobe`, or `@(negedge clk)`,
  or a small non-zero delay in a testbench. Not `#0`.

### `$display` vs `$strobe` vs `$monitor`

| Task | Region | Prints | Use for |
|---|---|---|---|
| `$display` | Active | Immediately, at the point of the call | Tracing execution order |
| `$write` | Active | As `$display` without the newline | Building a line piecewise |
| `$strobe` | Monitor / Postponed | Once, at the end of the time slot | Reading values assigned with `<=` |
| `$monitor` | Monitor / Postponed | Every time any argument changes | A running trace, one call per sim |

**Verified** — `e07_regions.v`, §2, all four in one time slot:

```
  [monitor  region] $monitor            : t=0 r=0
  [active   region] other block reads r=0
  [active   region] $display  before NBA update: r=0
  [active   region] $display  after  'r <= d'  : r=0  (unchanged!)
  [inactive region] after #0            : r=0
  [postpone region] $strobe   end of time slot : r=7
  [monitor  region] $monitor            : t=5 r=7
```

- `$display` after `r <= d` shows the **old** value. This is the single most common "why is my waveform
  one cycle off from my log?" confusion, and it is not a bug in either — the log is right about the active
  region and the waveform is right about the whole slot.
- `$strobe` shows the **new** value. Cummings' Guideline #7: *"Use `$strobe` to display values that have
  been assigned using nonblocking assignments."*
- `$monitor` also shows post-NBA values, and only prints when something changes. Only one `$monitor` is
  active at a time — a second call replaces the first. `$monitoron`/`$monitoroff` control it.
- Practical advice: use `$monitor` for a whole-simulation trace during bring-up, `$strobe` in
  self-checking loops, and `$display` only when you are specifically investigating *ordering* (as in
  `e13_order.v`).

### `x` propagation through a reset-less register

**Verified** — `e11_xprop.v`. One counter with no reset, one with a synchronous reset, plus an adder and a
reduction-OR fed from the reset-less one:

```
 t | no_rst with_rst sum_bad any_bad  (rst_n)
10 |   x      0       x      x       0
20 |   x      0       x      x       0
30 |   x      1       x      x       1
40 |   x      2       x      x       1
50 |   x      3       x      x       1
```

- `no_rst` is `x` at t=10 and **still `x` at t=50**, after five clock edges. `x + 1` is `x`, so a
  reset-less counter never escapes `x` on its own. It is not "random garbage that eventually settles" —
  it is a permanent `x`.
- `x` is contagious. `sum_bad` (an adder downstream) is `x`. `any_bad = |no_rst` — even the *reduction OR*
  of the vector is `x`, because `x | x` is `x`. Chapter 2 introduced `|x` as the FP sticky bit, so this
  matters directly: an unreset mantissa makes the sticky bit `x`, which makes the rounding decision `x`,
  which makes the whole result `x`.
- **What real hardware does is different, and the chapter must say so.** A real flip-flop with no reset
  powers up holding *some* definite value — 0 or 1, whichever way the silicon settled. It is unknown to
  you but it is **not a third state**. Hardware has garbage-but-defined; simulation has `x`.
- The asymmetry cuts both ways, and this is the nuance:
  - **Simulation is pessimistic**: it shows `x` where hardware would show a defined value, so you see
    failures that hardware would not have. This is *useful* — it is the simulator telling you your design
    depends on an initial value you never specified.
  - **Simulation is also optimistic**: `x` propagation through a mux or an `if` can be *optimistic* —
    `if (x) a = 1; else a = 1;` gives `a = 1` in simulation while gate-level `x`-pessimism might give `x`.
    So `x` in RTL simulation is neither a sound over- nor under-approximation. It is a heuristic.
- Practical rule: **treat any `x` in a waveform as a bug until proven otherwise**, and either reset the
  register or initialise it in the testbench. Do not "clean up" the `x` by adding resets everywhere —
  that puts a real cost in the hardware to fix a simulation artifact (§6).
- On an FPGA the question is partly moot: configuration sets every flop from the bitstream, so a
  declaration initialiser really does define the power-up value (§9).

### `#delay` inside logic

**Verified** — `e22_delay.v`, `always @(*) begin #3 y1 = ~a; end`:

```
t=13 a=1 y1=0 y2=0  (y1 should be ~a = 0)
```

- Compiles clean under `iverilog -g2012 -Wall`. No warning at all. Simulates. Gives a plausible answer.
- And it is **not synthesisable**. Synthesis tools ignore `#` delays outright (or error). The gate-level
  netlist has no `#3` in it, so RTL and gates disagree by construction.
- Worse: while the block is waiting at `#3` it is **not sensitive to its inputs**. Input changes arriving
  during the delay are silently lost. This turns a combinational block into a sampler with an
  undocumented aperture.
- Rule: `#` belongs in testbenches only. If it appears in a file that will be synthesised, it is a bug.

## 9. Pedagogical hazards

Each entry: the wrong mental model, the correct one, and where it is demonstrated.

**1. `always` is not a loop.**
Wrong: "`always` means repeat forever, like `while (1)`." Right: `always` is a **process that restarts
when its event control is satisfied**. `always @(posedge clk)` runs once per clock edge and then sleeps.
An `always` block with *no* event control (`always y = ~y;`) genuinely is an infinite zero-delay loop and
will hang the simulator — which is why the clock generator `always #5 clk = ~clk;` needs the `#5`.
Verified: `e14_loops.v`'s `always @(trig)` block executed exactly **2 times** for 2 events on `trig`.
Teaching phrase: *the event control is the loop condition, and it is at the top.*

**2. Statements in a `<=` block are not sequential in time.**
Wrong: "line 1 happens, then line 2 happens." Right: every RHS is evaluated, then every LHS is updated.
The statements describe **parallel flip-flops**, and the semicolons order the *text*, not the *hardware*.
Verified: `e03_reorder.v` (§3) — natural order and fully reversed order gave byte-identical waveforms.
Teaching phrase: *a `<=` block is a set of simultaneous equations, not a program.*

**3. A `for` loop is unrolled, not iterated over time.**
Wrong: "the loop runs once per clock." Right: synthesis **replicates the loop body** N times in space; in
simulation the whole loop completes within one delta cycle at one value of `$time`. Loop bounds must be
compile-time constants. Verified: `e14b_loops.v` — an 8-iteration population count and an 8-iteration bit
reverse both produced their final answers with no simulation time elapsed:

```
v=00001111 ones=4 rev=11110000  t=2
v=11111111 ones=8 rev=11111111  t=3
```

Corollary the reader needs for ch12: a `for` loop over 24 mantissa bits builds 24 copies of the hardware.
That is fine for a leading-zero counter and catastrophic if the body contains a multiplier.
Related: sharing one `integer i` between two `always` blocks is a genuine hazard (the standard permits a
process to be suspended mid-block). **Honest note:** Icarus ran each block to completion, so the shared
variable in `e14_loops.v` caused no corruption. Do not present a simulation-visible failure here; present
it as a rule with a standards justification.

**4. Blocking assignment in a clocked block.**
Verified: `e02_shift.v` (§3) — the three-stage shift register collapsed to one stage. `e01_swap.v` (§2) —
the swap became a copy and destroyed a value. Note that `e03_reorder.v` showed it can also *accidentally
work* when the statements happen to be in read-before-write order, which is why the rule must be
absolute rather than "be careful".

**5. Incomplete sensitivity list.**
Verified: `e04_sens.v` (§4) — output stale for two consecutive input changes, and *coincidentally correct*
for one of them. **Icarus emits no warning.** Cure: always write `always @(*)`, never an explicit
combinational list.

**6. Accidental latch.**
Verified: `e05_latch.v` (§5) — an incomplete `if` and an incomplete `case` both held their previous value
across an input change. **Icarus emits no warning even with `-Wall -Wextra`** (and `extra` is not even a
recognised class). Cures: default assignment at the top of the block, complete `if/else`, `default:` arm.
Detection: read the synthesis log, or use a linter, or write the behavioural check in `e25_latchdetect.v`.
The specific misconception to kill: *"my simulator would have told me."* It cannot. A simulator has no
concept of a latch.

**7. Multiple `always` blocks driving one signal.**
Cummings Guideline #6. Verified: `e15_multidrive.v` — two blocks assigning the same `reg`:

```
after a: r=a
after b: r=5
after a again: r=a  (whichever block ran last wins)
```

Legal Verilog, last-writer-wins, and **unsynthesisable** — there is no gate that does this. Contrast with
two `assign`s to one `wire`, which is a genuine multiple-driver contention resolved to `x`. Rule: one
signal, one driver, always.

**8. `reg` that is really a wire.**
Wrong: "`reg` means register." Right: `reg` means "a variable that holds its value between assignments in
procedural code". It is a **statement about assignment mechanics, not about hardware.** Whether a `reg`
becomes a flip-flop depends entirely on whether it is assigned in a clocked block.
Verified: `e31_regwire.v` — the same AND function as `assign` to a `wire`, as `always @(*)` to a `reg`,
and as `always @(posedge clk)` to a `reg`:

```
  t a b | y_assign y_always y_flop
  2 1 1 |    1        1       x
  6 1 1 |    1        1       1
  8 1 1 |    1        1       1
```

`y_assign` (a `wire`) and `y_always` (a `reg`) update at the same instant and infer **identical**
gates — zero flip-flops. Only `y_flop` is a register, and it is still `x` at t=2 because the first clock
edge has not arrived. The declaration keyword predicted nothing.
Naming convention worth teaching: suffix genuinely registered signals `_q` or `_r`, and combinational
ones `_c` or nothing. SystemVerilog's `logic` removes the `reg`/`wire` decision entirely.

**9. Reading and writing the same variable from two blocks.**
The §2 race in its most common disguise. Verified: `e06_race.v` gave `b=0` and `e09_raceorder.v` — the
identical design with the two `always` blocks in the opposite source order — gave `b=1`. **The behaviour
changed because of the order the blocks appear in the file.** Emphasise that this is not a simulator bug;
IEEE 1364-2005 §11.5 explicitly permits it. And note that re-running the simulation eight times gave the
same answer every time, so the reader cannot find this by repetition.

**10. `#delay` in synthesisable code.**
Verified: `e22_delay.v` (§8) — compiles clean with `-Wall`, simulates, and is ignored by every synthesiser.
Also makes an `always @(*)` block deaf to input changes while it waits. Rule: `#` in a testbench only.

**11. Initialising a `reg` at declaration and expecting it in hardware.**
Verified: `e21_regdecl.v` — `reg [3:0] cnt = 4'h0;` was honoured by Icarus (`cnt=0` at t=1, counting
normally afterwards). The nuance is that this is **true on an FPGA and false on an ASIC**: FPGA
configuration loads every flop from the bitstream, so vendors' tools do implement the initialiser; an
ASIC flop powers up in an arbitrary state and needs a real reset.
Second, sharper trap, verified in `e19_time0.v` (§4): a declaration initialiser generates **no event**, so
an `always @(*)` block reading that variable **never runs at time 0** and its output stays `x`:

```
t=1: ya=x (block ran 0 times)   yb=4 (block ran 1 times)
```

The same variable assigned from an `initial` block *did* wake the block. This catches people writing
combinational testbenches.

**12. Forgetting the reset.**
Verified: `e11_xprop.v` (§8) — a reset-less counter was `x` at every sample point for the whole run,
because `x + 1 == x`, and it poisoned a downstream adder and even a reduction-OR. Contrast with hardware,
where the flop powers up garbage-but-**defined**. Then the counterweight from §6: *do not* reset
everything. Reset the control state; leave datapath pipeline registers unreset and gate their results with
a reset `valid` bit.

**13. Using `casex`.**
Verified: `e12_casex.v` — `case`, `casez` and `casex` on the same selector:

```
   s   | case casez casex
0010 |  02    02    02
001x |  ee    02    01  <- x in bit0: casex matches ???1 anyway
xxxx |  ee    ee    01  <- all x: casex matches the FIRST arm
```

- `casex` treats `x` and `z` **in the selector** as don't-care, so an `x` arriving on a control signal
  silently matches the first arm rather than propagating. Your `x` debugging aid is disabled exactly where
  you need it. Row 3 is the horror case: a fully unknown selector confidently selects arm 1.
- `casez` treats only `z` as don't-care, and by convention you write `?` in the case items. `s = 4'bxxxx`
  correctly falls to `default`.
- Cummings, *Evil Twins*, verbatim: *"Guideline: Do not use casex for synthesizable code."* and
  *"Guideline: When coding a case statement with 'don't cares', use a casez statement and use '?'
  characters instead of 'z' characters in the case items to indicate 'don't care' bits."*
- Note the asymmetry the reader will miss: don't-cares in the **case items** are the point; don't-cares in
  the **selector** are the danger. `casez` limits the damage; plain `case` eliminates it.

**14. A sensitivity list that misses a signal read inside a called function.**
Verified: `e16_func.v` (§4) — `always @(*) y = f_hidden(p);` where `f_hidden` reads module-level `q`
internally. `y` did not respond to `q` changing 0 → 5. **`@(*)` does not look inside function bodies.**
Cures: pass every input as an argument, or use `always_comb`, whose inferred sensitivity list does include
function-internal reads (IEEE 1800-2017 §9.2.2.2).

**15. `posedge` on a multi-bit signal.**
Verified: `e24_edge.v` — edge detection uses the **least significant bit only**:

```
bus=1110 posedges on bus so far = 0
bus=0001 posedges on bus so far = 1
s=x   posedges on s   so far = 1  (0->x fired)
s=1   posedges on s   so far = 2  (x->1 fired)
```

`bus` going `0000 → 1110` (a large *increase*) produced **no** posedge; going `1110 → 0001` (a *decrease*)
produced one. Also note `0 → x` and `x → 1` both count as posedges on a scalar — which is why an
uninitialised reset or clock can fire clocked blocks at time 0 in ways nobody predicts.

**16. Assuming the simulator will catch it.**
The meta-hazard, and the one to close the chapter on. Summary of what Icarus 13.0 with `-g2012 -Wall`
actually reported across all 33 experiment files in these notes:

| Bug | Icarus `-Wall` |
| --- | --- |
| Incomplete sensitivity list | **silent** |
| Inferred latch (incomplete `if`) | **silent** |
| Inferred latch (incomplete `case`) | **silent** |
| Blocking assignment in a clocked block | **silent** |
| Two `always` blocks writing one `reg` | **silent** |
| `#3` delay inside `always @(*)` | **silent** |
| Race between same-edge `always` blocks | **silent** |
| `casex` matching on an `x` selector | **silent** |
| `@*` sensitised to a whole array | **warns** |

One warning out of nine. The tooling gap is the argument for the guidelines: **you cannot test your way
to correct RTL, so you follow coding rules that make the bugs impossible to write.**

## Citations

Tag meaning: `[verified]` = I fetched the source and read its actual content during this research.
`[title-only]` = I know the work and cite it by author/title/edition, but did **not** fetch or verify a
URL for it. No URL is given for `[title-only]` entries.

### Primary — verified

1. **Cummings, Clifford E. — "Nonblocking Assignments in Verilog Synthesis, Coding Styles That Kill!"**
   Sunburst Design, Inc. SNUG-2000 San Jose, CA. Voted Best Paper, 1st Place. Rev 1.2.
   Sections used: §1 Introduction (the two well-known guidelines and "But why?"), §2 Verilog race
   conditions, the stratified event queue figure, §11 Combinational logic, §12 Mixed sequential &
   combinational logic, §13 Other mixed blocking & nonblocking guidelines, §14 Multiple assignments to the
   same variable, §15 Common nonblocking myths ($display), and the Conclusion.
   All eight numbered Guidelines quoted verbatim in §3 of these notes.
   `[verified]` — https://csg.csail.mit.edu/6.375/6_375_2009_www/papers/cummings-nonblocking-snug99.pdf
   (MIT 6.375 course mirror; PDF fetched and text extracted. **Note:** despite the `snug99` filename, the
   document itself says SNUG-2000 San Jose. Cite the paper by its own title page, not the filename.)

2. **Cummings, Clifford E. — "'full_case parallel_case', the Evil Twins of Verilog Synthesis"**
   Sunburst Design, Inc. SNUG-1999 Boston, MA. Voted Best Paper, 1st Place. Rev 1.1.
   Sections used: Abstract, §1 Introduction, §2.8 Casex, §3 What is a "full" case statement,
   and the Guidelines/Conclusion. Abstract and five Guidelines quoted verbatim in §5 and §9 of these notes.
   `[verified]` — https://csg.csail.mit.edu/6.375/6_375_2006_www/papers/cummings-case-snug99.pdf
   (MIT 6.375 course mirror; PDF fetched and text extracted.)

3. **Mills, Don — "Yet Another Latch and Gotchas Paper"**
   Microchip Technology, Inc., Chandler, AZ. SNUG 2012.
   Abstract verified verbatim: covers `casex`, `casez`, `full_case`, `parallel_case`, SystemVerilog-2005
   `unique case` / `priority case`, an updated Async-Set/Reset-FlipFlop model, and clarification of the
   `logic` keyword per SystemVerilog-2009. Table of contents verified (§2.0 Combinational Case Coding,
   §2.1 The Plain Ole Case Statement, §2.2 SystemVerilog casex, §2.3 SystemVerilog casez).
   Good secondary source for §5 and §9; recommend the chapter cite it as further reading.
   `[verified]` — https://lcdm-eng.com/papers/snug12_Paper_final.pdf
   (PDF fetched; title, author, affiliation, abstract and TOC extracted. Body text not fully extracted.)

4. **AMD (formerly Xilinx) — "Vivado Design Suite User Guide: Synthesis", UG901.**
   Version 2026.1 English, dated 2026-07-08. Contains the sections "Flip-Flops, Registers, and Latches",
   "Flip-Flops and Registers Control Signals", "Flip-Flops and Registers Inference", "Latches", "Latches
   Reporting Example", and "Latch With Positive Gate and Asynchronous Reset" (Verilog and VHDL).
   `[verified]` — https://docs.amd.com/r/en-US/ug901-vivado-synthesis/RAM-HDL-Coding-Guidelines
   **Honest limitation:** the fetch confirmed the document's identity, version and the *existence* of
   those sections, but did **not** return their body text. The claim in §6 that AMD recommends synchronous
   reset is drawn from general vendor guidance, **not** from a verified quotation. Either verify it before
   the chapter states it as vendor advice, or state it as the author's recommendation.

5. **Icarus Verilog 13.0 (stable) (v13_0), `iverilog(1)` man page, sections "WARNING TYPES" and
   "TARGETS".** Verified locally on the machine used for these notes.
   Warning classes confirmed: `-Wall` enables `anachronisms`, `implicit`, `macro-replacement`, `portbind`,
   `select-range`, `timescale`, and `sensitivity-entire-array`. Separately available:
   `sensitivity-entire-vector`, `infloop` (documented as excluded from `-Wall` and as producing false
   positives), `macro-redefinition`. There is **no** latch warning and **no** sensitivity-list-completeness
   warning of any kind. `-Wextra` does not exist ("Ignoring unknown warning class extra").
   `[verified]` — local `man iverilog`, no URL.

### Primary — title-only

6. **IEEE Std 1364-2005, "IEEE Standard for Verilog Hardware Description Language".**
   Clause 11 "Scheduling semantics": §11.3 *The stratified event queue* (active / inactive / non-blocking
   assign update / monitor / future event regions), §11.4 *The Verilog simulation reference model*,
   §11.5 *Race conditions*. Also §9.7.5 (implicit `@*` event list) and §9.2 (procedural assignments).
   The normative source for all of §2 and §4 of these notes.
   `[title-only]` — paywalled; not fetched. Do not print a URL.

7. **IEEE Std 1800-2017, "IEEE Standard for SystemVerilog — Unified Hardware Design, Specification, and
   Verification Language".** Clause 4 "Scheduling semantics" (adds Preponed, Observed, Reactive,
   Re-Inactive, Re-NBA and Postponed regions to the 1364 model). §9.2.2 "Always procedures" —
   §9.2.2.2 `always_comb` (including the rule that variables read by called functions are in the inferred
   sensitivity list), §9.2.2.3 `always_latch`, §9.2.2.4 `always_ff`. §12.5 `unique`/`priority` case.
   `[title-only]` — paywalled; not fetched.

8. **Cummings, Clifford E. — "The Fundamentals of Efficient Synthesizable Finite State Machine Design
   using NC-Verilog and BuildGates".** International Cadence Usergroup Conference, Aix-en-Provence,
   France, 2–6 September 2002. The canonical reference for the one-/two-/three-block FSM styles and for
   the recommendation of the two-always-block style. `[title-only]` — the sunburst-design.com PDF URL now
   **301-redirects to paradigm-works.com, which requires a login**, and the alternative mirror
   (staff.ustc.edu.cn) refused the connection. I could not read it. Cite by title; do not print a URL.

9. **Cummings, Clifford E. — "State Machine Coding Styles for Synthesis".** Sunburst Design, Inc.,
   SNUG 1998 San Jose. Earlier companion to (8). `[title-only]`.

10. **Cummings, Clifford E. — "SystemVerilog's priority & unique — A Solution to Verilog's 'full_case' &
    'parallel_case' Evil Twins!"** Sunburst Design, Inc. The follow-up to (2), covering `unique case` /
    `priority case` as the modern replacement for the pragmas. `[title-only]`.

11. **Cummings, Clifford E. — "Verilog Nonblocking Assignments With Delays, Myths & Mysteries".**
    SNUG Boston 2002, Rev 1.4 (May 2003). Title and venue confirmed from the Paradigm Works technical
    library listing, but the paper body is behind a login. `[title-only]`.

12. **Sutherland, Stuart — Sutherland HDL, Inc. training material and "Verilog HDL Quick Reference
    Guide" / "RTL Modeling with SystemVerilog for Simulation and Synthesis".** Standard reference for the
    synthesisable subset and for `always_comb`/`always_ff` semantics. `[title-only]`.

13. **Intel/Altera — "Recommended HDL Coding Styles", chapter of the Quartus Prime Handbook / Design
    Recommendations.** Vendor counterpart to (4); source for FPGA reset-style and inference guidance.
    `[title-only]`.

14. **Palnitkar, Samir — "Verilog HDL: A Guide to Digital Design and Synthesis", 2nd edition,
    Prentice Hall, 2003.** Ch. 6 (dataflow modelling), Ch. 7 (behavioural modelling: blocking vs
    non-blocking, sensitivity lists), Ch. 14 (logic synthesis). `[title-only]`.

15. **Thomas, Donald E. and Moorby, Philip R. — "The Verilog Hardware Description Language",
    5th edition, Springer, 2002.** Ch. 3 (behavioural modelling) and Ch. 6 (the simulation reference
    model / event scheduling). Moorby is the original author of Verilog. `[title-only]`.

16. **Chu, Pong P. — "FPGA Prototyping by Verilog Examples", Wiley, 2008.** Ch. 3–5 for the combinational/
    sequential split, ch. 6 for FSM coding styles, from an FPGA-first perspective. `[title-only]`.

### Note for the chapter writer on URLs

`www.sunburst-design.com/papers/*.pdf` — the historically canonical home of the Cummings papers — now
issues a **301 redirect to www.paradigm-works.com**, whose technical library requires registration. Two
of the papers survive on the MIT 6.375 course mirror (entries 1 and 2 above) and those are the URLs to
print. **Do not print a `sunburst-design.com` URL in the chapter; it no longer serves the PDF.**

### Experiment index

All files in
`/private/tmp/claude-501/-Users-erancihan-W-github-com-erancihan-erancihan/40e83700-61f8-400a-9ac8-4c520de7be70/scratchpad/ch03/`,
each built with `iverilog -g2012 -Wall -o <name>.sim <name>.v` and run with `vvp <name>.sim` under
Icarus Verilog 13.0 (stable) on macOS/arm64. 33 source files, all compiled and run.

| File | Demonstrates | Notes § |
|---|---|---|
| `e01_swap.v` | `a<=b; b<=a` swap vs `a=b; b=a` copy | 2, 9 |
| `e02_shift.v` | shift register `<=` vs `=` collapse | 3, 9 |
| `e03_reorder.v` | statement reordering: no effect with `<=`, decisive with `=` | 3, 9 |
| `e04_sens.v` | incomplete sensitivity list → stale output | 4, 9 |
| `e05_latch.v` | incomplete `if` and `case` → latch behaviour; Icarus silent | 5, 9 |
| `e06_race.v` | two same-edge blocks racing; stable across 8 runs | 2, 9 |
| `e07_regions.v` | `$display`/`$strobe`/`$monitor`/`#0` region ordering; NBA read | 2, 8 |
| `e08_clkinit.v` | `always #5 clk = ~clk;` with no initial value → `x` forever | 8 |
| `e09_raceorder.v` | same race, blocks swapped in source → opposite answer | 2, 9 |
| `e10_tbrace.v` | testbench stimulus on same vs opposite edge (first cut) | 8 |
| `e11_xprop.v` | `x` through a reset-less register, poisoning `+` and `\|` | 8, 9 |
| `e12_casex.v` | `case` vs `casez` vs `casex` with `x` in the selector | 9 |
| `e13_order.v` | Icarus's actual block execution order — **alternates per time step** | 2, 8 |
| `e14_loops.v` | `always` is not a loop; `for` unrolled; shared loop variable | 9 |
| `e14b_loops.v` | `for` unrolling with per-block loop variables | 9 |
| `e15_multidrive.v` | two `always` blocks writing one `reg`; last writer wins | 9 |
| `e16_func.v` | `@(*)` does **not** see variables read inside a function | 4, 9 |
| `e17_combnba.v` | `<=` inside `always @(*)` costs a delta cycle | 3, 4 |
| `e18_reset.v` / `e18b_reset.v` | sync vs async reset; clock enable is not a latch | 1, 6 |
| `e19_time0.v` | declaration initialiser generates no event → `@(*)` never runs | 4, 9 |
| `e20_delta.v` | delta cycles; active region drains before inactive | 2, 8 |
| `e21_regdecl.v` | `reg` initialised at declaration | 9 |
| `e22_delay.v` | `#3` inside `always @(*)`: compiles, simulates, unsynthesisable | 8, 9 |
| `e23_sensvec.v` | `@*` sensitised to a whole array — the one Icarus warning | 4 |
| `e24_edge.v` | `posedge` uses the LSB only; `0→x` and `x→1` fire | 4, 9 |
| `e25_latchdetect.v` | behavioural latch detection, incl. `x`-injection | 5 |
| `e26_resetrelease.v` | async reset release; two-flop reset synchroniser | 6 |
| `e27_fsm.v` | one-, two- and three-block FSM styles side by side | 7 |
| `e28_mealy.v` | Moore vs Mealy; Mealy output moving with no clock edge | 7 |
| `e29_tbedge.v` | testbench same-edge race silently swallows a pulse | 8 |
| `e30_infloop.v` | `-Winfloop` does **not** fire on the obvious case | 4 |
| `e31_regwire.v` | `reg` ≠ register: `wire`, comb `reg`, flop `reg` compared | 9 |

### Places where Icarus's real behaviour differs from the textbook story

Flagged for the writer — these are the notes' most valuable findings and each contradicts something
commonly written about Verilog:

1. **A race is not random.** The textbook says two simulators may disagree. In practice Icarus is
   *perfectly reproducible across runs* (`e06_race.v`, 8/8 identical; `e29_tbedge.v`, 3/3 identical MD5).
   The reader cannot find a race by re-running. What *does* change the answer is editing the source order
   of two unrelated `always` blocks (`e09_raceorder.v`).
2. **But it is not stable within a run either.** `e13_order.v` shows Icarus **alternating** the execution
   order of two same-edge blocks from one time step to the next (B,A / A,B / B,A / A,B). Most descriptions
   imply a simulator picks one order and keeps it. This alternation is what makes `e29_tbedge.v`'s pulse
   disappear entirely rather than merely arrive late.
3. **`#0` cannot show you NBA results.** Commonly suggested as "let it settle". `e07_regions.v` proves
   the value is still old after `#0`, because the inactive region is scheduled *before* the NBA region.
4. **`#0` is also unnecessary for combinational settling.** `e20_delta.v` shows a three-deep cascade fully
   settled before the first `#0` returned — the active region drains to exhaustion first.
5. **Icarus reports nothing about latches or sensitivity lists**, with any flag. `-Wextra` does not exist.
   Nine common bugs, one warning (see the table in §9). Any chapter text implying "the simulator will warn
   you" is wrong, and this is the single most important honesty point in the chapter.
6. **`always @(*)` does not self-start.** `e19_time0.v`: a variable initialised at its *declaration*
   generates no event, so the block never executes and its output is `x` for the whole first time step.
   This is the real cause of several `x` values in these experiment outputs and is almost never mentioned.
7. **Blocking assignment in a clocked block sometimes works.** `e03_reorder.v`'s `blk-rev` column is a
   correct three-stage shift register built entirely with `=`. The rule is absolute *because* the failure
   is order-dependent, not because `=` always breaks.
8. **`-Winfloop` did not fire** on `always @(*) y = y + a;` (`e30_infloop.v`), despite being documented for
   exactly that class.
