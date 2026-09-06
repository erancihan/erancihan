# Chapter 13 research — Advanced topics and the SystemVerilog transition

<!-- sections complete: 11/11 + appendix -->
<!-- status: COMPLETE. All sections and Appendix A filled; no TODOs remain. -->

Research notes for chapter 13. Charter: what SystemVerilog would change about THIS
project's shipped code — every topic anchored to a shipped artifact, nothing taught in
the abstract. All measurements against Icarus Verilog 13.0 (`/usr/local/bin/iverilog`,
`vvp` 13.0), Linux x86-64, 2026-08-21.

## 1. Charter, inherited measurements, and method

**Charter (from the ch12 seeds and the STATE.md RESUME block).** Chapter 13 is a
*transition* chapter, not a SystemVerilog tutorial: every topic must be anchored to a
shipped artifact of this guide and answer "what would SV change about THIS file". The
anchors, planted by name across the guide: ch03's "What the Simulator Will and Will Not
Tell You" (no latch warning, no enforcement) and ch09's "Normalize, Round, and the Latch
Simulation Cannot See" plus its measured `always_comb` function-body sensitivity — the
one behavioral SV difference Icarus implements; ch07's `fp32_fields.v` (the field decode
that a packed struct names); ch11's valid pipe in `fp32_add2_p2.v` (the bundle an
interface names); ch05's "Assertions, and What You Can Actually Run Here" (the measured
15-construct × 4-level matrix); ch12's `tb_cov4.v` (105 hand-rolled bins, python-pinned
— what a covergroup replaces and what it cannot); and the `$urandom(seed)` rules
measured in ch05 (seed once per run, discard the first draw, first draw near-linear in
the seed).

**Method.** Same as ch02/ch03/ch05: compile-and-run probes against the local toolchain,
quoting captured output, never the LRM, for any "Icarus does X" claim. This session:
**66 probe files** (33 in batch 1, the rest follow-ups isolating what batch 1
surfaced), each compiled at `-g2005`, `-g2005-sv`, `-g2009` and `-g2012`, run under
`vvp` where they compiled; **four rewrites of shipped artifacts** — two module
rewrites (fields, normalize) swept for bit-identity against the originals, one
wiring rewrite (interface bundles) proven streaming-equivalent on the real pipelined
DUT, one testbench rewrite (queue scoreboard) run against the real DUT and killed by
both DUT mutants. Everything ran in the session scratchpad under `.../scratchpad/ch13/`
(`probes/`, `rw/`); nothing was added to `guide/src/`. Environment: Icarus Verilog 13.0
(stable, `v13_0`) at `/usr/local/bin/{iverilog,vvp}`, Linux x86-64, 2026-08-21.
**Verilator is NOT installed here** (`which verilator` → nothing), so every Verilator
claim in this chapter remains documentation, exactly as ch03's four-simulator
enforcement story was — the chapter must say so.

**Inherited measurements this chapter builds on (and must not contradict):** the ch05
assertion matrix (immediate `assert` from `-g2005-sv` up; `assert property` a parse
error at every level; covergroups a parse error; `-gno-assertions` discards a concurrent
assertion it can parse); ch03's verdict that Icarus enforces none of the `always_comb`
promises (no latch warning); ch09's measured function-body sensitivity (the stale-global
probe updates under `always_comb`, stays stale under `@*`); ch02's `expect`-is-reserved
finding at `-g2012`; the ch05 seed rules. Each was re-verified in a fresh probe this
session before being extended — results in §2, §6, §7. Where this session *sharpened*
one of them (three cases: `-gno-assertions` also discards immediate assertions; the
`unique`/`priority` runtime no-match warning exists despite a compile-time "ignored"
sorry; seed near-linearity persists into the second draw's high bits), the sharpening is
flagged in §9 for propagation to the earlier chapters' research files.

## 2. The measured SV subset of Icarus 13.0 — construct × `-g` matrix

Every row below is a compiled-and-run probe from `scratchpad/ch13/probes/` (file named
in the row). Method as ch05 §6.1, extended from 15 constructs to the full transition
list. **In every one of the ~40 probes, `-g2005-sv`, `-g2009` and `-g2012` behaved
identically** — ch05's "the threshold is `-g2005-sv`; nothing changes above it" verdict
extends to the whole language subset, so the table shows two columns. Verdicts:
**SUPPORTED** (compiles silently, runs with LRM semantics), **PARSE ERROR**,
**SORRY** (explicit "sorry: … not supported"), **ACCEPTED-SILENT** (compiles and runs,
but the SV semantics are partly or wholly absent — the dangerous class).

| Construct (probe) | `-g2005` | `-g2005-sv` … `-g2012` | Verdict |
|---|---|---|---|
| `logic` var, continuous + procedural drive (p01) | ✗ `Variable 'a' cannot be driven by a continuous assignment` … `This is allowed when SystemVerilog is enabled.` | ✓ | SUPPORTED |
| `bit`, and 2-state `byte`/`shortint`/`int`/`longint` (p02, p03) | ✗ syntax error | ✓ — genuinely two-state: `b = 1'bx` reads back `0`; `16'sh7fff + 1` wraps to `-32768` | SUPPORTED (see X-blindness, §8) |
| `always_comb` (p04) | ✗ syntax error | ✓ — and implements function-body sensitivity (§4) | SUPPORTED |
| `always_ff @(posedge clk or negedge rst_n)` (p05) | ✗ | ✓ | SUPPORTED |
| `always_latch` (p06) | ✗ | ✓ — really latches: `q` holds after `en` falls | SUPPORTED |
| blocking `=` inside `always_ff` (p25) | — | compiles CLEAN, runs; zero diagnostics | ACCEPTED-SILENT |
| two `always_ff` writing one variable (p33) | — | compiles clean, runs; LRM forbids it; zero diagnostics | ACCEPTED-SILENT |
| non-edge sensitivity in `always_ff` (p26) | — | warning: `Synthesis requires the sensitivity list of an always_ff process to only be edge sensitive. a is missing a pos/negedge.` — still runs | warning only |
| `#1` inside `always_comb` (p27) | — | ✗ HARD ERROR: `a blocking delay is not allowed in an always_comb, always_ff or always_latch process.` | enforced |
| `q <= #1 d` inside `always_ff` (p48) | — | ✓ (intra-assignment delay is LRM-legal) | SUPPORTED |
| packed `struct` + `typedef`, incl. through a port (p07, p08) | ✗ | ✓ — `$bits` = 32, bit-transparent to a 32-bit assign both ways | SUPPORTED (but see §3 harness note) |
| unpacked `struct` (p09) | ✗ | ✗ `sorry: Unpacked structs not supported.` | SORRY |
| `typedef enum logic [1:0]` + `.name()` (p10) | ✗ | ✓ — `.name()` prints the label; assignment WITHOUT a cast (raw constant or `st + 1`) is an elaboration error `This assignment requires an explicit cast.` (p64); `state_t'()` casts run, unlabeled values give `.name()` = empty (p64b) | SUPPORTED, strongly typed |
| `interface` instantiated in a TB, hierarchical member access, `modport` decl inside (p45) | ✗ | ✓ | SUPPORTED (bundle only) |
| interface as a module PORT — modport-typed, plain, or generic `interface` (p11, p44, p50) | ✗ | ✗ `syntax error` / `Errors in port declarations.` for all three forms | PARSE ERROR |
| `parameter type T` + override (p12) | ✗ | ✓ | SUPPORTED |
| `package` / `import pkg::*` / `pkg::name` (p15, p46) | ✗ `syntax error … I give up.` | ✓ | SUPPORTED |
| `unique case` (p13, p38) | ✗ | compile: `vvp.tgt sorry: Case unique/unique0 qualities are ignored.` — but a runtime NO-MATCH check fires (§6); OVERLAP is never detected | half-implemented (§6) |
| `unique0 case` (p40) | ✗ | same sorry; no-match correctly silent | consistent |
| `priority case` (p14) | ✗ | runtime no-match warning fires | half-implemented (§6) |
| `unique if` (p41) | ✗ | ✗ syntax error | PARSE ERROR |
| immediate `assert` / `assert … else` (p22; ch05 rows 1-6 re-verified) | ✗ | ✓ — failure prints `ERROR: file:line: … Time: … Scope: …`; pass-statement executes | SUPPORTED |
| immediate `cover (expr) stmt` (p49, p52) | ✗ | compiles, runs — but the pass statement NEVER executes and no count is ever reported: measurably a no-op | ACCEPTED-SILENT (sharpens ch05 row 5) |
| `assert property (@(posedge clk) req);` — no temporal operator (p23b) | ✗ | ✗ compile FAIL: `sorry: concurrent_assertion_item not supported. Try -gno-assertions or -gsupported-assertions to turn this message off.` | SORRY (flags: §7) |
| `assert property (… \|-> …)` (p23) | ✗ | ✗ `syntax error` + `error: Error in property_spec of concurrent assertion item.` at every level, every assertion flag | PARSE ERROR |
| `covergroup`/`coverpoint`/`bins`/`cross` (cg_cov4.sv, §7) | ✗ | ✗ `syntax error` / `error: Invalid module item.` — the diagnostic never names the construct | PARSE ERROR |
| queue `logic [31:0] q[$]`, `push_back`/`pop_front`/`size` (p17) | ✗ `Queue declaration requires SystemVerilog.` | ✓ | SUPPORTED |
| dynamic array `int d[]`, `new[5]`, resize-copy `new[8](d)` (p18) | ✗ `Dynamic array declaration requires SystemVerilog.` | ✓ | SUPPORTED |
| associative array `int a[string]` or `[integer]` (p19, p43) | ✗ | ✗ `error: Type names are not valid expressions here.` + `internal error: I do not know how to elaborate this expression.` | NOT SUPPORTED (internal error) |
| `foreach` over fixed/dynamic/queue (p20, p17, p18) | ✗ | ✓ | SUPPORTED |
| `string` type: `len`/concat/`substr`/`==`/`itoa` (p42) | ✗ | ✓ | SUPPORTED |
| `string.toupper()` (p21) | — | ✗ `error: Method toupper is not a string method.` | partial method set |
| `$urandom_range(lo,hi)` (p16, p53) | ✓ (!) | ✓ — bounds respected over 1000 draws; reversed args swap per LRM (`$urandom_range(20,10)` in [10,20]) | SUPPORTED at EVERY level |
| size/type/sign casts `24'(x)`, `int'(3.7)`→4, `signed'()` (p28) | ✗ | ✓ | SUPPORTED |
| `.*` and `.name` port connections (p29) | ✗ | ✓ | SUPPORTED |
| `++`, `+=`, `do…while` (p30) | ✗ | ✓ | SUPPORTED |
| `inside` (p31) | ✗ | ✗ `sorry: "inside" expressions not supported yet.` | SORRY |
| `==?` wildcard equality (p37) | ✓ (!) | ✓ | SUPPORTED at every level |
| `void` function, `return`, default arguments (p32) | ✗ | ✓ | SUPPORTED |
| `task expect(…)` (p47; ch02 re-verified) | ✓ | ✗ syntax error — `expect` is reserved | reserved word cost |

Notes on the two `(!)` rows: `$urandom_range` and `==?` work even at `-g2005`,
consistent with ch02's finding that Icarus gates *syntax*, not system functions — and
apparently `==?` slipped under the syntax gate too. The shipped guide sources are the
mirror image: `fp32_fields.v` compiles clean at every level from `-g1995` to `-g2012`
(measured). Migration is a one-way door: SV sources die loudly below `-g2005-sv` (the
package file's first error is `syntax error / I give up.` at the `package` keyword),
while the guide's 2001-style code runs everywhere.

**One-sentence verdict for the chapter:** Icarus 13.0's `-g2012` accepts a genuinely
useful SV subset — `logic`, 2-state types, all three `always_*` forms, packed
structs/typedefs/enums/packages, queues and dynamic arrays, `foreach`, strings, casts,
`$urandom_range`, immediate assertions — and rejects or silently guts exactly the
verification-methodology layer (SVA, covergroups, associative arrays, `inside`,
unpacked structs, interface ports, `unique`'s overlap check, immediate `cover`'s
counting), which is why this guide's hand-rolled equivalents were never optional.

## 3. Rewrite 1: `fp32_fields.v` as a packed struct + typedef

**The anchor.** `src/ch07/fp32_fields.v` is the guide's binary32 decode: six `assign`s
slicing `w[31]`, `w[30:23]`, `w[22:0]`. What SV names here is the slicing itself:

```systemverilog
package fp32_pkg;
  typedef struct packed {
    logic        sign;   // bit 31
    logic [7:0]  e_raw;  // bits 30:23
    logic [22:0] frac;   // bits 22:0
  } fp32_t;
endpackage
```

A packed struct is a bit-vector with field names: `$bits(fp32_t)` measured **32**, and
`x = 32'h40490fdb` followed by `$display` of `x.s/x.e/x.f` gives `0 / 80 / 490fdb`
(probe p07) — the declaration order maps MSB-first, so the typedef IS the format
diagram from ch07, readable as one. Structs pass through ports (p08), so
`fp32_fields_sv` takes `input fp32_t w` and the magic numbers 31/30:23/22:0 appear
exactly once in the whole design, in the typedef, instead of once per module
(`fp32_unpack`, `fp32_screen`, `fp32_round_pack` all re-slice them today).

**Measured bit-identity.** `rw/fp32_fields_sv.sv` (the struct version) was swept
against the shipped `fp32_fields.v` instantiated side by side, `!==` on the
concatenation of all six outputs, X-guard on the input (ch09 discipline): all 256
exponents × 6 boundary fractions {0, 1, 400000, 7fffff, 2aaaaa, 555555} × both signs
(3,072 directed) plus 1,000,000 `$urandom` patterns, seeded once with the first draw
discarded. Result: **`PASS tb_fields_equiv (1003072 vectors, bit-identical)`**, 3.5 s
wall clock. The rewrite is a pure renaming — which is precisely the argument for it:
zero arithmetic risk, all the readability.

**The harness trap, measured — always_comb form vs assign form.** The first draft used
`always_comb` with `sign = w.sign; …` inside. It compiles and passes the sweep, but
emits SIX copies of
`sorry: constant selects in always_* processes are not fully supported (the process
will be sensitive to all bits in 'w[31:0]').` — one per member read, some with
mangled `:0:` file positions. Harmless semantically (the process just becomes
sensitive to the whole struct, which is what a decode wants anyway), but the project
harness fails any `run` target with non-empty compile output, so **the always_comb
struct decode cannot ship as a `run` target; the continuous-assign form
(`assign sign = w.sign;` …, file `fp32_fields_sv2.sv`) compiles with zero output under
`iverilog -g2012 -Wall` and passes the same 1,003,072-vector sweep bit-identically.**
If the writer ships a struct decode in `src/ch13/`, it must be the assign form (or the
always_comb form as a `warn` row quoting the sorry).

**Migration cost curve, measured.** The struct file at `-g2005`:
`fp32_fields_sv.sv:5: syntax error` / `I give up.` — line 5 is the `package` keyword;
the parser does not recover. The shipped `fp32_fields.v` compiles silently at every
level `-g1995` through `-g2012`. That asymmetry is the honest price tag: the guide's
2001-style sources run on any Icarus since 1995 syntax; the SV rewrite requires
`-g2005-sv`+ *and* dies on tools (or `apt`-era Icarus configured differently) below
it, with an unhelpful first diagnostic.

**What the struct does NOT buy.** It does not validate anything (`fp32_t` happily
holds `e_raw = 255, frac != 0` — NaN classification still belongs to `fp32_class`);
it does not remove the `hidden`/`sig`/`e_eff` derivation logic (the actual content of
ch07's module); and Icarus will not take the next SV step — a tagged union of
{normal, subnormal, special} is unpacked-struct territory, `sorry`-ed out (§2).

## 4. Rewrite 2: a ch09 stage under `always_comb` + `logic`

**The rewrite.** `rw/fp32_normalize_sv.sv` re-expresses `src/ch09/fp32_normalize.v` in
full SV style: `logic` ports, every intermediate (`carry`, `right1`, `frame`, `lz`,
`shl`, `framel`…) a block-local variable inside ONE `always_comb`, the LZC as a
`function automatic logic [4:0]` with `for (int i …)`, `5'(i)` size-cast and `return`.
Same algorithm, same widths (`e_norm` keeps its ninth bit). Swept against the shipped
module side by side, `!==` on `{nsig, ng, nr, ns, e_norm}` with an all-x guard:
26 single-bit frames × carry × eff_sub × s_in × e_big∈{1,2,254,255} directed (416),
the all-zero frame (4), plus 500,000 random vectors (`e_big` constrained ≥ 1, in
contract). Result: **`PASS tb_norm_equiv (500420 vectors, bit-identical)`**, 20.5 s.
SV style is again pure syntax here — the simulator computes the same bits.

**The constant-select sorry, isolated (new, general finding).** The rewrite compiles
`rc=0` but with **ten** diagnostics of the form
`fp32_normalize_sv.sv:30: sorry: constant selects in always_* processes are not fully
supported (the process will be sensitive to all bits in 'sum27[26:0]').` — one per
constant bit/part-select read inside the `always_comb` (even the loop variable's
implicit `i[31:0]` in the function triggers one, with a mangled `+i[31:0]` name).
Isolating probes: the same select in a plain `always @*` (p55) — **zero output**; in an
`always_ff` (p56) — **zero output**. The sorry is exclusively an artifact of
`always_comb`/`always_latch`'s own sensitivity-inference engine, and its text states
the fallback: the process becomes sensitive to the whole vector. For combinational
logic that is semantically benign (extra evaluations, same settled values — the 500k
sweep proves it), but it means **any nontrivial always_comb datapath block fails the
project harness's zero-compile-output rule for `run` targets**. This, not semantics, is
why the guide's continuous-assign style remains the shippable form on this toolchain;
an `always_comb` listing in ch13 must be a `warn` target quoting the sorry.

**ch09's function-body sensitivity finding, re-confirmed in this design's shape**
(p57). `lzc26` was altered to read the frame through a module-scope global instead of
its argument, called from both `always @*` and `always_comb`, and only the global was
then changed:

```
t1: star=0 comb=0 (both 0)
t2: star=0 comb=25 (comb 25, star STALE if 0)
t3: star=25 comb=25 (star catches up)
```

`always_comb` re-evaluated on the hidden dependency; `@*` sat stale until the argument
finally moved. Exactly ch09's measurement, reproduced 2026-08-21 in the normalize
stage's own function. The sorry messages above are the same engine's limitation — the
one real behavioral difference Icarus implements comes with its own diagnosed edge.

**The accidental latch under `always_comb` — still invisible** (p58b). The ch09 latch
shape (right1 branch forgets `ns`) rewritten under `always_comb`, compiled
`-g2012 -Wall`: **zero latch-related diagnostics** (rc=0; the only output is the
unrelated select sorry), and the stale hold is real — after entering the right1 path
with `s_in|sum27[0] = 1`, `ns` reads back the latched `0` from the previous else-path
evaluation. Under `always_latch` (p59): byte-for-byte the same behavior and the same
silence. So on Icarus the `always_comb`/`always_latch` distinction is **pure intent
documentation** for the latch question — ch03's verdict stands unmodified; the four-
simulator enforcement claim (Vivado/Questa/VCS/Verilator would reject the p58b module
in `always_comb`) remains documentation, and Verilator is not installed here to
upgrade it.

**A scheduler footnote worth one sentence (p58, first version).** With `s_in` and
`sum27` changed by consecutive blocking assignments in the SAME time step, the
`always_comb` process observably evaluated BETWEEN the two assignments (it took the
else path with the new `s_in` but the old `sum27`, assigning `ns` on the way through
— the settled result then differed from the one-change-per-timestep run). Settled
values are unaffected for complete combinational logic, but it is one more member of
ch03's "simulation artifacts" family: mid-block evaluation of a triggered process is
real in Icarus, and an incomplete always_comb turns it into visible state.

## 5. Rewrite 3: the ch11 valid pipe as an interface with modports

**The anchor.** `src/ch11/fp32_add2_p2.v` carries the pattern SV interfaces exist to
name: `{in_valid, a, b}` travels together into the pipe, `{out_valid, result, flags}`
travels together out, and ch11's streaming harness plumbs those two bundles through
every testbench. In full SV the bundle is an `interface` with two `modport`s (driver
and DUT views), and a stage's port list collapses to one name.

**Measured boundary: interface ports do not parse; interface bundles work.** All three
port forms fail identically at `-g2012` (§2): modport-typed `stream_if.down s`, plain
`stream_if s`, and generic `interface s` each give
`syntax error` / `Errors in port declarations.` (p11, p44, p50). What DOES work
(p45): declaring the interface with modports inside, instantiating it (`stream_if
bus();`), and reading/writing `bus.member` hierarchically — the modport declarations
parse and elaborate; they are simply unconsumable.

**The rewrite that runs** (`rw/tb_if_stream.sv`): two interfaces, `fp_in_if
{valid, a, b}` (with `drv`/`dut` modports declared, unused) and `fp_out_if
{valid, result, invalid, overflow, inexact}`, instantiated in the testbench; ch11's
real `fp32_add2_p2` (with its full ch07/ch09 module tree underneath) wired **entirely
through interface members** — inputs `.in_valid(bi.valid)` etc., and the module's
OUTPUTS driving interface members (`.result(bo.result)`), which Icarus accepts as the
single continuous driver of each `logic` member. A second, conventionally-wired
`fp32_add2_p2` ran beside it from the same stimulus: 60,000 streamed cycles, a new
random pair every non-bubble cycle, 1-in-8 X-data bubbles, seeded once, `!==` compare
of `{out_valid, result, flags}` every cycle. Result:
**`PASS tb_if_stream (52541 retired results, interface-wired == wire-wired)`** —
compile under `-g2012 -Wall` with **zero output** (harness-compatible), 3.4 s. The
bundle is wiring-transparent on the real pipelined DUT.

**What the interface does NOT buy here — and the one check that exists.** Direction
checking is the point of modports, and with modport ports unparseable there is none:
nothing distinguishes the `drv` from the `dut` view of `bi`. The one protection that
DOES fire is SV's single-driver rule on variables, measured (p60): a TB procedural
write to a member already driven by a DUT output port is a hard elaboration error —
`error: Cannot perform procedural assignment to variable 'b.r' because it is also
continuously assigned.` So a reader gets accidental-double-drive protection on the
output bundle, but a testbench that drives `bi.valid` from two initial blocks, or
reads a member it was supposed to only write, sails through. Honest summary for the
chapter: on Icarus today, an interface is a *namespace* (a typed, instantiable wiring
harness that keeps ch11's bundles together and makes the TB read like the protocol),
not a *contract*. The contract half — modport enforcement, `clocking` blocks, virtual
interfaces into class-based drivers — is documentation, flagged as such.

## 6. The enforcement story, honestly

ch03 measured that Icarus enforces essentially none of the classic promises; the
four-simulator claim (Vivado/Questa/VCS/Verilator would check `always_comb`
completeness) stayed documentation. This section re-measures the whole enforcement
surface of the SV `always_*` forms and `unique`/`priority` on this toolchain, and
keeps the two ledgers separate.

**What Icarus 13.0 actually enforces (measured, complete list from this session):**

- `#delay` (and event controls) inside `always_comb`: hard error, quoted in §2 —
  `a blocking delay is not allowed in an always_comb, always_ff or always_latch
  process.` / `there must be no event controls or blocking delays in an always_comb
  process.` (p27). The no-timing-controls rule is the ONE `always_comb` promise this
  simulator enforces.
- Non-edge sensitivity in `always_ff`: a *warning* (`Synthesis requires the
  sensitivity list of an always_ff process to only be edge sensitive. a is missing a
  pos/negedge.`), still compiles and runs (p26).
- A variable with a continuous driver (including a module output port landing on a
  `logic`) also written procedurally: hard elaboration error (p60) — the SV
  single-driver rule for *continuous* drivers is real.
- **Enum strong typing** (p64) — the one place Icarus is genuinely strict: both
  `st = 2'd1;` and `st = st + 1;` on an enum variable are elaboration errors
  (`error: This assignment requires an explicit cast.`); `state_t'(…)` casts compile
  and run, an unlabeled value round-trips (`.name()` returns the empty string for
  it, p64b). An FSM state type in this project's style would get real protection
  against the raw-constant assignment ch03 warns about.

**What Icarus accepts in silence (each one an LRM violation or a classic bug):**

- Blocking `=` inside `always_ff` — zero diagnostics (p25). ch03's "silent
  blocking-in-always_ff" verdict re-confirmed on 13.0 at `-g2012 -Wall`.
- Two `always_ff` processes writing the same variable — silent (p33).
- An `always_comb` LHS variable also written by an `initial` process — silent (p62),
  despite LRM 9.2.2.2's explicit prohibition. Contrast with p60: the single-driver
  rule exists only for continuous drivers, not between procedural processes.
- The accidental latch (incomplete if) under `always_comb` — silent, and really
  latches (§4, p58b); identical under `always_latch` (p59). No warning
  distinguishes a correct `always_latch` from an accidental one, or an incomplete
  `always_comb` from a complete one.

**`unique` / `priority`, measured precisely (p13, p14, p38, p39, p40, p41).** The
compile emits `vvp.tgt sorry: Case unique/unique0 qualities are ignored.` — and then
the runtime implements HALF the semantics anyway:

- `unique case` with no matching item: **runtime warning fires** —
  `WARNING: p13_unique_case.v:5: value is unhandled for priority or unique case
  statement / Time: 1 Scope: t`. The result variable keeps its pre-case default.
- `priority case` with no match: the same runtime warning.
- `unique casez` with TWO simultaneously matching items (the overlap that `unique`
  exists to catch): **silent** — first match wins, no violation report (p38).
- `unique0 case` no-match: silent — which is CORRECT unique0 semantics (p40), so the
  no-match check genuinely distinguishes `unique` from `unique0` despite the
  "ignored" sorry.
- Plain `case` no-match: silent (p39, the control).
- `unique if`: does not parse at all (p41).

So the honest teaching line: on Icarus, `unique`/`priority case` buy you the
*no-match* runtime check (a real, measured improvement over plain `case` — ch09's
`fp32_screen` priority chain and any decoded-select would get it) and nothing else;
the compile-time "ignored" sorry is itself inaccurate about the runtime, in the
reader's favor. The overlap check, the violation-on-multiple-match, and `unique if`
remain other-simulator territory.

**Two real behavioral differences of `always_comb` vs `@(*)` — one inherited, one
NEW.** ch09 measured function-body sensitivity and STATE.md calls it "the one real
difference this simulator implements". This session re-confirmed it in the normalize
stage's own shape (§4, p57) — and found a **second**: `always_comb` executes once at
time zero, `@(*)` does not. Probe p61, with the trap exactly as ch03 measured it
(`reg a = 1'b1;` initialized at declaration, so no event ever fires):

```
y_star=x y_comb=0
```

`always @(*) y_star = ~a;` stays `x` forever — ch03's "does not self-start" trap,
reproduced verbatim on 13.0 — while `always_comb y_comb = ~a;` computes at t0 per
LRM 9.2.2.2.2. So the SV form measurably FIXES a trap ch03 taught, on this very
simulator. This sharpens ch03's and ch09's "one behavioral difference" phrasing to
"two" (propagation note, §9).

**Where enforcement actually lives.** `which verilator` → not installed; nothing
about Vivado/Questa/VCS is measurable here. The four-simulator always_comb
enforcement story carries forward from ch03 as documentation, clearly flagged. What
this session adds to it honestly: even on a simulator with zero latch enforcement,
`always_comb`/`always_ff`/`always_latch` still pay their way three measured ways —
the t0 self-start fix, function-body sensitivity, and the no-timing-controls hard
error — plus the intent documentation that makes the OTHER tools' checks possible
the day the code meets one.

## 7. Assertions and coverage — the honest tool story

### 7.1 The assertion-flag matrix — ch05's rows re-run, and a worse discard

Four probe files × four flag settings, all at `-g2012` (full grid captured in the run
log; files: p22 = failing immediate `assert…else $error`, p23b = concurrent
`assert property (@(posedge clk) req);` with no temporal operator, p23 = concurrent
with `|->`, p49 = immediate `cover` with a pass statement):

| | default | `-gassertions` | `-gsupported-assertions` | `-gno-assertions` |
|---|---|---|---|---|
| immediate `assert` (p22) | compiles; **ERROR fires at runtime** | same | same — **still fires** | compiles; **assertion GONE — no ERROR, clean run** |
| simple concurrent (p23b) | COMPILE FAIL: `sorry: concurrent_assertion_item not supported. Try -gno-assertions or -gsupported-assertions to turn this message off.` | same | compiles; runs; property **silently discarded** (req low at every edge, nothing reported) | compiles; runs; **silently discarded** |
| SVA with `\|->` (p23) | syntax error + `Error in property_spec of concurrent assertion item.` | same | same syntax error | same syntax error |
| immediate `cover` (p49) | compiles; inert | same | same | same |

Three consequences, in order of importance:

1. **`-gno-assertions` deletes IMMEDIATE assertions too** — the ones Icarus fully
   supports. A failing `assert … else $error` compiles clean and reports nothing.
   ch05 measured the concurrent-discard ("a flag that turns a failing check into a
   silent pass"); this is strictly worse: the flag removes every working check in the
   design. NEW — propagate to ch05 (§9).
2. **`-gsupported-assertions` is the correct flag for mixed code, and ch05's
   description of it needs sharpening.** ch05 said the three flags "only control
   whether the sorry prints; they enable nothing". Measured: `-gsupported-assertions`
   keeps immediate assertions ALIVE while allowing files containing the parseable
   concurrent form to compile — by silently discarding those items. It is the only
   setting under which ch05-style immediate assertions and an SVA-bearing file
   coexist. The remaining honesty cost: the discarded concurrent properties report
   nothing, ever — a reader must know they are decoration on this simulator.
3. The default's sorry message itself recommends `-gno-assertions` — the compiler
   points users at the flag that silently deletes their working checks. Worth
   quoting in the chapter verbatim.

The `|->` form is a parse error under every flag — no flag rescues real SVA; ch05's
sharpened two-line diagnostic reproduces exactly.

**Immediate `cover` is inert, not just unreported** (p49, p52): with the covered
expression TRUE, the pass statement never executes (`assert`'s pass statement does —
measured in the same probe), and no count appears anywhere at end of simulation
(consistent with ch05's "zero coverage instrumentation"). ch05's matrix row 5 marks
immediate `cover` ✓; the ✓ means "accepted", not "functional". Sharpening for ch05
(§9). The practical consequence: the guide's hand-rolled coverage counters are not
just the covergroup replacement — they are also the immediate-cover replacement.

### 7.2 The covergroup that tb_cov4 would become — and the parse wall

`probes/cg_cov4.sv` translates three real dimensions of ch12's 105-bin model into
LRM covergroup syntax: `cp_class_a` (operand-class bins zero/subn/norm/inf/nan —
bins 0-4 of the a×b cross), `cp_expd` (the exponent-distance buckets d0/d≤2/d<25/
d≥25 — bins 50-53), `cp_round` (`{ng,nr,ns,round_up}` with `tie_up`/`tie_down` bins
and a `wildcard bins` for round-up — the bins-73-78 family), plus
`x_class_expd: cross cp_class_a, cp_expd;` sampled `@(posedge clk)` — one line where
tb_cov4 needs its stage-qualified `sample_all` task. Compile results:

- `-g2005-sv`, `-g2009`, `-g2012`: `cg_cov4.sv:16: syntax error` /
  `error: Invalid module item.` (line 16 is the `covergroup` keyword), then cascading
  syntax errors. **The diagnostic never contains the word "covergroup"** — the
  construct is absent from the parser, not stubbed with a sorry.
- `-g2005`: dies earlier, on the SV function syntax.

ch05's row 15 verdict reproduces unchanged; there is nothing to enable and no flag to
try.

### 7.3 What the hand-rolled model does that covergroups do not — the bin-pinning guard

This is the chapter's climax and it is a language-level claim, checkable against
IEEE 1800 clause 19 (documentation, flagged as such — no simulator here runs
covergroups): a covergroup gives you *bins, crosses, `illegal_bins`, `ignore_bins`,
`option.at_least`, `get_coverage()`* — machinery for asking "did each interesting
thing happen at least N times?". Nothing in clause 19 verifies that a bin's
DEFINITION means what the verification plan meant. ch12's M18 guard does exactly
that: the 57-quad directed phase is deterministic, an independent python event model
(`cov_gen.py`) computes the expected count of every one of the 105 bins for that
exact stimulus, and `tb_cov4` compares `cov[i] !== exp_dir[i]` bin-for-bin — a
two-implementation cross-check of the bin definitions themselves. The ch12 research
proved this guard is load-bearing twice over: two bin mutations initially SURVIVED it
(a mistimed stage qualification, an unstraddled boundary) and were killed only by
fixing the directed library — a coverage model is a testbench and gets mutation
discipline. In covergroup terms the guard would be: run the directed phase, read
back every bin's count via the coverage API, and compare against the independent
model — possible in tools with a coverage database, but it is a methodology you build
AROUND the covergroup, not a feature IN it. `option.at_least` is a floor, not a pin;
`illegal_bins` is the only definitional check the language offers (a bin that must
stay empty — ch12's D9 never-bin maps to it, paired with an arming `cover` the same
way ch12 pairs the witness assertion with its armed-count guard). Honest summary:
migrating tb_cov4 to a covergroup would shrink the *counting* (the 105-element array,
the partition invariants come free as bins+crosses) and would not replace the
*pinning* — the guide's own contribution survives the language transition intact
because it was never a language feature.

Also carried over unchanged: tb_cov4's samples come from the DUT's own wires with
stage-correct qualification (`vpipe[0]`, `p1_screen`) — in SV that is
`sample()`-on-demand or a clocking expression with `iff` guards; either way the
stage-timing analysis ch12 did by hand still has to be done by the person writing
the `iff`.

## 8. Testbench-side gains: queues, dynamic arrays, `foreach`, strings, `$urandom_range`

**The queue scoreboard — the transition's biggest measured win**
(`rw/tb_q_stream.sv`). ch11's streaming scoreboard is a LAT-deep circular buffer
(`eq/vq/aq/bq` arrays, `idx = cyc % LAT`, the one-index check-before-overwrite trick
that makes the off-by-one "structurally impossible"). The SV rewrite replaces all of
it with `logic [98:0] q[$];` — push an expectation record when a pair is driven, pop
when `out_valid` retires one. The load-bearing observation: **the queue version never
mentions the latency.** No `LAT` parameter, no modulo, no depth to get wrong; the
latency becomes a *measured output* instead of a wired-in constant. Run against the
real `fp32_add2_p2` (full ch07/ch09 tree), 60,000 streamed cycles, 1-in-8 X bubbles,
X-guard and `!==` on `{result, flags}`, drain, empty-queue and driven==retired
count guards:

```
PASS tb_q_stream (52570 pairs, max queue depth 3 = measured latency)
```

(max depth 3 = pipe latency 2 + the just-pushed expectation, since the sample point
pushes before it pops — the number is the latency plus one by construction, and
would move if the pipe deepened.) Per the project's standing mutation practice, two
DUT mutants were run against it: dropping the pipelined sticky bit
(`p1_s_al <= 1'b0`) → **FAIL, 24,246 errors**; retiring one cycle early
(`out_valid = vpipe[0]`) → **FAIL, 52,570 errors**, first failures at cycle 1-2 (X
in outputs, then every result one transaction stale — the queue's ordering makes the
skew legible in the messages). The testbench can fail, both ways that matter.

**Two composition walls, measured while building it.** The natural SV record —
`typedef struct packed {…} exp_t;` with `exp_t q[$];` — elaborates to
``Sorry: Queue of type `11netstruct_t` is not yet supported.`` Queues take plain
vectors; the workable pattern is a `logic [98:0]` queue with the packed struct used
to unpack popped entries (`e = q.pop_front();` then `e.a`, `e.r` — packed structs
assign freely from vectors). Likewise assignment patterns: positional
`'{8'h12, 8'h34}` works; **named** `'{hi: …, lo: …}` is a syntax error in any
context (p63/p63b), so records are built by concatenation. Icarus's SV features
frequently work alone and fail composed; every composite in a chapter listing must
be compile-tested, not assumed from the §2 matrix.

**One more scheduler lesson re-learned (own-bug report).** The first draft of the
queue TB deasserted `in_valid` immediately after the last sample, mid-cycle — the
final pair was withdrawn before any posedge captured it, and the end-of-run guard
caught it: exactly one expectation never retired, zero data mismatches. The fix is
ch11's drive discipline (change inputs only at the negedge), and the incident is a
free advertisement for the count guards: a scoreboard without the driven==retired
and empty-at-end checks would have printed PASS.

**`$urandom_range`, connected to the ch05 seed rules** (p16, p53, p54/p54b).
`$urandom_range(10, 20)` respected its bounds over 1,000 draws (lo=10, hi=20);
the one-argument form works; reversed bounds swap per LRM (`$urandom_range(20,10)`
lands in [10,20]). It draws from the same per-thread generator that `$urandom(seed)`
seeds: after `dummy = $urandom(s)`, the `$urandom_range` stream is a deterministic
function of `s` (same seed → identical sequence, run to run). **The ch05 seed rules
therefore transfer verbatim** — seed once per simulation, never per trial. And the
near-linearity is one draw DEEPER than ch05 recorded: with seeds 1-6, the first
post-seed `$urandom` draws are `1c598438, 38b1fc71, 550a72aa, 7162e8e2, 8dbb5f1b,
aa13d554` — high bits almost exactly seed × 0x1C58xxxx — and the first
`$urandom_range(0,9999)` after a one-draw discard came out 1107 (seed 1) vs 2214
(seed 2), an exact doubling. Discarding ONE draw does not decorrelate nearby seeds;
"seed once per run" is the rule that actually protects (§9 propagation note for
ch05's phrasing).

**Two-state types vs the guide's X-discipline** (p51) — the transition's measured
trap. `bit`/`int` really are two-state (§2): assigning `32'hxxxx_xxxx` into them
reads back `32'h00000000`, silently. ch09's central verification move is `!==` plus
X-guards; ch11 measured that X-injection must be checked at injection points because
59 % of Xs are absorbed. A scoreboard or expected-value store declared `bit`/`int`
**cannot hold an X to guard against** — the X becomes a plausible zero at the moment
of storage, exactly the "defined-looking wrong value" failure shape ch09 measured.
Honest rule for the chapter: two-state types are for counters and loop indices;
anything that touches DUT data stays 4-state (`logic`), and the X-guards stay.

**Small conveniences, all measured working** and each anchored to a shipped file:
`foreach` over the coverage arrays (tb_cov4's five `for (i = 0; i < NBINS; …)`
loops); `string` with `len`/concat/`substr`/`==`/`itoa` for `bname()`-style bin
naming (`cov_names.vh`) — but no `toupper`; enum `.name()` for FSM/state and
class-code display (the fclass 0-4 codes in tb_cov4 messages could print as names);
`++`/`+=`/`do…while` shrinking loop boilerplate; `24'(expr)` size casts making
ch09's width-discipline conversions explicit and self-documenting where the shipped
code uses part-selects like `shl8[4:0]`. None changes behavior; all are compile-cost
free at `-g2012` in the testbench layer. Dynamic arrays (`new[N]`, resize-copy
`new[2N](d)`) also work and would fit ch12's generated corner library if it were
sized at runtime — a marginal gain given `` `include``d `.vh` generation already
ships.

## 9. Sharpenings and contradictions to propagate to earlier chapters

Nothing measured this session *contradicts* a shipped chapter's claim outright; five
measurements sharpen earlier wording. Per project practice each needs a dated note in
the earlier chapter's research file (listed here for the orchestrator; ch13's text
carries the measurements either way):

1. **ch05 (`research/ch05-verification.md`), `-gno-assertions`.** Recorded: discards
   a concurrent assertion it can parse. Measured now: it ALSO discards fully-supported
   IMMEDIATE assertions — a failing `assert…else $error` compiles clean and never
   fires (p22 under `-gno-assertions`). The "flag that turns a failing check into a
   silent pass" applies to every assertion in the design, not just concurrent ones.
2. **ch05, the three assertion flags.** Recorded: they "only control whether the
   sorry prints; they enable nothing." Measured: `-gsupported-assertions` changes
   build semantics — immediate assertions stay live while parseable concurrent items
   compile and are silently discarded; it is the only setting where both coexist
   (§7.1 grid). The "enable nothing" clause is true; the "only control the
   diagnostic" clause is not.
3. **ch05, matrix row 5 (immediate `cover`).** Recorded ✓. Measured: accepted but
   inert — the pass statement never executes even when the expression is true (while
   `assert`'s pass statement does), and no count is reported anywhere (p49, p52).
   The ✓ should read "accepted, no observable effect".
4. **ch05, `$urandom(seed)` near-linearity.** Recorded: the FIRST draw is
   near-linear in the seed; rule "seed once per run and discard the first draw."
   Measured: the second draw's high bits are also near-linear (seeds 1-6 →
   `1c59…, 38b1…, 550a…, 7162…, 8dbb…, aa13…`), and `$urandom_range` inherits the
   correlation through the shared thread RNG (first post-discard
   `$urandom_range(0,9999)`: 1107 for seed 1, 2214 for seed 2). The operative rule
   is "seed once per simulation"; one discarded draw does not decorrelate nearby
   seeds. Chapters 9/10/12 already comply (single seed per run), so no shipped
   testbench is affected.
5. **ch03 (`research/ch03-comb-seq.md`) and ch09
   (`research/ch09-two-input-rtl.md`), "the one behavioral difference".** ch09
   measured function-body sensitivity as the one real `always_comb` difference in
   Icarus; STATE.md repeats "the one real difference this simulator implements."
   Measured now (p61): a SECOND difference — `always_comb` executes at time zero;
   `@(*)` does not, and ch03's "does not self-start when the input was initialised
   at declaration" trap reproduces on 13.0 while the `always_comb` twin computes
   correctly. ch03's trap therefore has a measured in-simulator SV fix, and "one
   difference" should read "two" in both research files (ch03's shipped claims —
   no latch warning, silent blocking-in-always_ff — re-verified intact this
   session, p58b/p25).

One digest-level nuance for the writer (no file change needed): STATE.md's RESUME
block compresses ch05 as "`assert property` is a PARSE error at every level." True
for every *temporal* form (`|->` etc., re-verified under every flag). The
non-temporal form `assert property (@(posedge clk) expr);` is a different failure
class: a "sorry"-type compile ERROR by default whose text recommends the flags, and
compilable-but-discarded under `-gsupported-assertions`/`-gno-assertions` (§7.1) —
which is exactly how ch05's discard finding was possible. The chapter should keep
the two classes distinct.

## 10. The honest recommendation — what is real on Icarus today vs aspirational

The chapter's closing judgment, grounded in the §2 matrix and the three rewrites.
Three tiers, each anchored to what was actually run:

**Tier 1 — real on Icarus 13.0 today, adopt with measured benefit.** In the
*testbench* layer: queues (the scoreboard rewrite deletes the latency constant and
its off-by-one class — §8, mutation-proven), `foreach`, `string`, enum `.name()`,
`$urandom_range` (under the ch05 seed discipline), immediate `assert…else` (real
file/line/time/scope diagnostics, ch05's pattern), `++`/`+=`, casts, `void`
functions. In the *design* layer: `logic` everywhere a `wire`/`reg` split used to be
reasoned about; packed structs + typedefs in packages for the binary32 fields
(bit-identical over 1,003,072 vectors, zero-output compile in the assign form);
packages for the constants ch12 scatters as `localparam`s; `.name`/`.*`
instantiation. `always_ff`/`always_comb` as intent markers — with the two measured
behavioral improvements (t0 self-start, function-body sensitivity) and one measured
cost (the constant-select sorry floods the compile log of any nontrivial
always_comb datapath, §4, which under THIS project's zero-output harness rule keeps
the shipped style at continuous assigns).

**Tier 2 — partially real; adopt with eyes open.** `unique`/`priority case`: the
runtime no-match check is real and free; the overlap check does not exist; the
compile log gains a sorry per case (a `warn`-row cost under the harness).
Interfaces: real as instantiated bundles (streaming-transparent on the actual
pipelined adder, 52,541 results), absent as ports/modports — a namespace, not a
contract. Two-state types: real, but they dissolve the guide's X-discipline at the
moment of storage (p51); confine them to counters. `-gsupported-assertions`: the
right flag if any concurrent-assertion text ever enters the codebase — knowing it
silently discards those items.

**Tier 3 — aspirational on this toolchain; teach as documentation, flagged.** SVA
(`|->`, sequences, `disable iff`) — parse errors under every flag; covergroups —
parse errors whose diagnostics never name the construct; associative arrays
(internal error); `inside`; unpacked structs; named assignment patterns; queue-of-
struct; `unique if`; class-based testbenches/UVM (unmeasurable here and pointless
without the above); the four-simulator enforcement story (Verilator not installed
— `which verilator` empty — Vivado/Questa/VCS absent). For every Tier-3 feature the
guide already ships the hand-rolled equivalent, measured and mutation-tested: the
if/`$fatal` assertion pattern (ch05), the 105-bin counter model with python-pinned
definitions (ch12) — and §7.3's conclusion stands as the chapter's climax: the one
piece of the guide's methodology that NO language feature replaces, in any
simulator, is the bin-pinning two-key guard, because verifying bin *definitions*
against an independent model was never a language feature to begin with.

**The migration cost curve, stated once** (measured in §3): the shipped 2001-style
sources compile from `-g1995` through `-g2012`; every SV rewrite dies below
`-g2005-sv`, usually with an unhelpful first diagnostic (`syntax error / I give
up.` at a `package` keyword). On this simulator the transition is all-or-nothing
per file, and `-g2005-sv`/`-g2009`/`-g2012` are indistinguishable across all ~40
probes — so the guide's standing "-g2012 and stop thinking about it" advice
survives the transition unchanged.

## Appendix A. Probe inventory, captured diagnostics, and the writer's harness ledger

### A.1 Inventory

66 probe files under `scratchpad/ch13/probes/` (p01-p64b plus the covergroup
translation `cg_cov4.sv` and scratch outputs) and 11 files under
`scratchpad/ch13/rw/` (the three rewrites, their sweeps, the queue/interface
testbenches, two DUT mutants, debug variants). Every probe was compiled at all four
`-g` levels; every rewrite ran under `-g2012 -Wall` with its compile log captured to
a file and byte-counted, because the harness's zero-output rule makes the log's
*emptiness* part of the measurement.

### A.2 Diagnostics of record (verbatim, for quoting in the chapter)

The chapter should quote these exactly; each is the first line(s) of captured
stderr/stdout from the named probe.

- `logic` with a continuous driver at `-g2005` (p01) — the friendliest error Icarus
  owns, it names the fix:
  `error: Variable 'a' cannot be driven by a continuous assignment/module.` /
  `: This is allowed when SystemVerilog is enabled.`
- `package` at `-g2005` (p15/fp32_fields_sv): `syntax error` / `I give up.`
- Unpacked struct (p09): `sorry: Unpacked structs not supported.`
- Interface as a module port, all three forms (p11/p44/p50): `syntax error` /
  `Errors in port declarations.`
- Associative array (p19/p43): `error: Type names are not valid expressions here.` /
  `internal error: I do not know how to elaborate this expression.` /
  `: Expression is: <type>`
- `inside` (p31): `sorry: "inside" expressions not supported yet.`
- `unique case`, compile (p13): `vvp.tgt sorry: Case unique/unique0 qualities are
  ignored.` — and then, runtime, at the no-match:
  `WARNING: p13_unique_case.v:5: value is unhandled for priority or unique case
  statement` / `Time: 1  Scope: t`
- `always_ff` non-edge sensitivity (p26): `warning: Synthesis requires the
  sensitivity list of an always_ff process to only be edge sensitive. a is missing
  a pos/negedge.`
- Delay inside `always_comb` (p27): `error: a blocking delay is not allowed in an
  always_comb, always_ff or always_latch process.` / `error: there must be no event
  controls or blocking delays in an always_comb process.`
- The constant-select sorry (§4, one per select): `sorry: constant selects in
  always_* processes are not fully supported (the process will be sensitive to all
  bits in 'sum27[26:0]').`
- Concurrent assertion, default flags (p23b): `sorry: concurrent_assertion_item not
  supported. Try -gno-assertions or -gsupported-assertions to turn this message
  off.`
- SVA with `|->` (p23): `syntax error` / `error: Error in property_spec of
  concurrent assertion item.`
- `covergroup` (cg_cov4.sv): `syntax error` / `error: Invalid module item.`
- Queue of a packed struct (tb_q_stream draft): ``Sorry: Queue of type
  `11netstruct_t` is not yet supported.``
- Named assignment pattern (p63): `syntax error` / `error: Malformed statement`
- `string.toupper()` (p21): `error: Method toupper is not a string method.` /
  `error: Object t.s has no method "toupper(...)".`
- Enum assignment without cast (p64): `error: This assignment requires an explicit
  cast.`
- Mixed continuous + procedural drive on an interface member (p60): `error: Cannot
  perform procedural assignment to variable 'b.r' because it is also continuously
  assigned.`
- A failing immediate assertion's runtime format (p22):
  `ERROR: p22_assert_imm.v:3: x=5` / `       Time: 1  Scope: t` — file, line, time
  and scope for free, ch05's strongest argument for `assert` over `if`+`$display`.

### A.3 Scale and timing of the equivalence evidence

| Experiment | Scale | Wall clock | Result |
|---|---|---|---|
| `tb_fields_equiv` (struct decode vs shipped) | 1,003,072 vectors (3,072 directed + 1M random) | 3.5 s | PASS, bit-identical |
| `tb_norm_equiv` (SV normalize vs shipped) | 500,420 vectors (420 directed + 500k random) | 20.5 s | PASS, bit-identical |
| `tb_if_stream` (interface-wired vs wire-wired `fp32_add2_p2`) | 60,000 streamed cycles, 52,541 retired | 3.4 s | PASS, bit-identical every cycle |
| `tb_q_stream` (queue scoreboard vs `shortreal`-free `fp32_add2` golden) | 52,570 pairs, X bubbles, drain | 4.5 s | PASS; max queue depth 3 |
| `tb_q_stream` vs mutant 1 (sticky pipe dropped) | same stimulus | ~4.5 s | FAIL, 24,246 errors |
| `tb_q_stream` vs mutant 2 (`out_valid` one cycle early) | same stimulus | ~4.5 s | FAIL, 52,570 errors — every retire skewed, first at cycle 1 |

All four PASS runs compiled under `iverilog -g2012 -Wall` with **zero bytes** of
compile output (logs captured and `wc -c`'d), so all four are eligible as `run`
targets under the project harness if the writer ships them.

### A.4 The writer's harness ledger — what can be a `run` target

- **Can ship as `run` (zero-output compiles, measured):** the assign-form struct
  decode `fp32_fields_sv2.sv` + its sweep; `tb_if_stream.sv`; `tb_q_stream.sv`;
  any `always_ff` listing without part-selects; packages/enums/queues/`foreach`/
  `string`/`$urandom_range` testbench listings.
- **Must be `warn` rows (deliberate-diagnostic listings, non-empty compile log):**
  ANY nontrivial `always_comb` datapath block (constant-select sorries — the
  `fp32_normalize_sv.sv` rewrite emits ten); `unique`/`priority case` listings (the
  "qualities are ignored" sorry); `always_ff` non-edge demo (p26). Note the runtime
  no-match WARNING of `unique case` appears in *simulation* output, not compile
  output — a `run`-target self-checking TB that deliberately triggers it would trip
  the harness's FAIL-string grep only if the warning text contained "FAIL" (it does
  not), but the compile-time sorry already forces `warn` classification anyway.
- **Must be `xfail` rows:** SVA (`|->`), covergroup, associative array, unpacked
  struct, `inside`, named patterns, interface-port, enum-without-cast, queue-of-
  struct, `#1`-in-`always_comb`, mixed-drive p60 — each with its A.2 diagnostic as
  the taught text.
- **Must NOT ship at all:** anything under `-gno-assertions` (it deletes working
  checks, §7.1); a `run` target relying on immediate `cover` (inert, §7.1).

Primary evidence for every "Icarus does X" claim in these notes is the session's own
compile-and-run record: 54 probe files and 5 rewrite/testbench files under
`.../scratchpad/ch13/{probes,rw}/`, all against iverilog/vvp 13.0 (v13_0),
2026-08-21. External sources, per the ≤5-URL budget:

1. **Icarus Verilog documentation, "Command Line Flags"** —
   https://steveicarus.github.io/iverilog/usage/command_line_flags.html
   (fetch-verified 2026-08-21). Confirms the measured assertion-flag semantics in the
   project's own words: "When disabled, assertion statements are parsed but ignored.
   The supported-assertions option only enables assertions that are currently
   supported by the compiler." — i.e., the docs DO say `-gno-assertions` discards
   parsed assertions; ch05's "only controls the sorry" reading was the folklore.
   Also documents `-g2009`/`-g2012` as "includes SystemVerilog" (and does not list
   `-g2005-sv` on this page, though the compiler accepts it — usage line measured in
   `iverilog -h`).
2. **IEEE Std 1800-2017**, *IEEE Standard for SystemVerilog*. Clauses relied on for
   "what the LRM promises" contrasts: 9.2.2.2 (always_comb: implicit sensitivity
   incl. function bodies, time-zero execution, no other process may write its
   variables), 9.2.2.4 (always_ff), 9.4.2 (event control), 12.5 (unique/priority
   violation checks — no-match AND multiple-match), 16 (immediate/deferred/
   concurrent assertions), 19 (covergroups; `option.at_least`, `illegal_bins`),
   18.13.2-3 (`$urandom`, `$urandom_range` incl. reversed-argument behavior, matched
   by p16), 7.10 (queues). `[title-only]`
3. Stuart Sutherland and Don Mills, **"Standard Gotchas: Subtleties in the Verilog
   and SystemVerilog Standards That Every Engineer Should Know"**, SNUG Boston 2006.
   Two-state pitfalls and always_comb/@(*) sensitivity differences taught here were
   individually re-measured in §4/§6/§8 rather than quoted. `[title-only]` (per the
   ch03 citation hazard: sunburst-design.com is login-walled; Cummings/Sutherland
   SNUG papers cited by title only.)
4. Stuart Sutherland, **"I'm Still In Love With My X! (but, do I want my X to be an
   optimist, a pessimist, or eliminated?)"**, DVCon 2013. The standard treatment of
   X-propagation vs two-state types; this project's stance (4-state storage for DUT
   data, X-guards at injection points) is the ch09/ch11 measured version of its
   argument. `[title-only]`
5. Chris Spear and Greg Tumbush, **SystemVerilog for Verification**, 3rd ed.,
   Springer, 2012. Ch. 8 (functional coverage) for what covergroups provide —
   read against §7.3's claim of what they do not (bin-definition verification);
   Ch. 2/5 (queues, two-state types). Already the ch05 reference of record for
   this material. `[title-only]`

Method note: two further fetches of the Icarus docs site (quirks page, command-files
page) confirmed no page documents the SV construct-support matrix — §2's table has
no documentation counterpart to check against, which is why it was measured.
