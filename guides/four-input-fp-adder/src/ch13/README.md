# Chapter 13 source — the SystemVerilog transition

<!-- sections complete: 7/7 -->

## What is in this directory

Every file here is SystemVerilog, and every one of them is anchored to a file
this guide already shipped. Nothing in this chapter is taught in the abstract:
each rewrite is compiled *beside* the original it replaces, driven from one
stimulus, and compared bit for bit.

| File | What it is | Anchored to |
|---|---|---|
| `fp32_pkg.sv` | package: the `fp32_t` packed struct, the two exponent constants, the `fclass_e` enum | chapter 6's field diagram; chapter 12's scattered `localparam`s and `fclass()` codes |
| `fp32_fields_sv.sv` | the binary32 decode with a packed-struct port, continuous-assign form | `../ch07/fp32_fields.v` |
| `fp32_fields_svc.sv` | the same decode as one `always_comb` block — the diagnostic demo | `../ch07/fp32_fields.v` |
| `fp32_normalize_sv.sv` | the normalize stage in full SV style: `logic`, one `always_comb`, an `automatic function` | `../ch09/fp32_normalize.v` |
| `fp32_class_flags_sv.sv` | the five operand classes decoded with `unique case` over a typed enum | `../ch07/fp32_class.v`, `../ch12/tb_cov4.v`'s `fclass()` |
| `fp_bundles.sv` | the two travelling bundles as `interface`s with `modport`s | `../ch11/fp32_add2_p2.v`'s port groups |
| `tb_fields_equiv.sv` | 1,003,072-vector equivalence sweep, struct decode vs shipped | chapter 9's `!==`-plus-X-guard discipline |
| `tb_fields_comb.sv` | 203,072-vector sweep of the `always_comb` decode | same |
| `tb_norm_equiv.sv` | 250,420-vector equivalence sweep, SV normalize vs shipped | same |
| `tb_if_stream.sv` | interface-wired vs wire-wired `fp32_add2_p2`, compared every cycle | chapter 11's streaming harness |
| `tb_q_stream.sv` | the streaming scoreboard rewritten as a queue — no latency constant | chapter 11's `LAT`-deep circular buffer |
| `tb_assert_live.sv` | a self-checking test that immediate assertions are alive in this build | chapter 5's assertion pattern |
| `tb_selfstart.sv` | pins `always @(*)`'s no-self-start trap against `always_comb`'s time-zero execution | chapter 3's "Sensitivity Lists, and What `@(*)` Really Covers" |
| `tb_unique_case.sv` | what `unique case` does and does not check, made falsifiable | chapter 3's state-machine defaults |
| `bad_if_port.sv` | xfail: an interface as a module port | the honest half of `fp_bundles.sv` |
| `bad_enum_cast.sv` | xfail: raw constant into an enum variable — the one place Icarus is strict | chapter 3's "State Machines" |
| `bad_assoc.sv` | xfail: associative array — an *internal error*, not a `sorry` | chapter 12's dense bin array |
| `bad_qstruct.sv` | xfail: a queue of a packed struct — the composition wall | `tb_q_stream.sv`'s workaround |
| `bad_comb_delay.sv` | xfail: a delay inside `always_comb` — the one enforced promise | chapter 3's "The Accidental Latch" |
| `cg_cov4.sv` | xfail: three of chapter 12's 105 dimensions written as an IEEE 1800 clause 19 covergroup — 30 diagnostics ending `I give up.` | chapter 12's `tb_cov4.v`; added during the writing round so the chapter's covergroup listing and transcript are both reproducible, and so a future Icarus that parses covergroups fails this target loudly |

**Convention extension, stated once.** This directory uses the `.sv` suffix.
Icarus does **not** switch language level on the extension — measured: the
identical package text compiles at `-g2012` and dies at `-g2005` whether it is
called `fp32_pkg.sv` or `fp32_pkg.v` — so the suffix is documentation for
humans and for other tools, not a compiler switch. It is used here because
every file in this directory is SystemVerilog by intent. **The F2 artifact
check must allow `.sv` under `ch13/`** (precedent: chapter 12's `.py`/`.vh`
note). Chapter 5's two SystemVerilog `xfail` targets, `bad_sva.v` and
`bad_covergroup.v`, predate the convention and keep their names; this chapter
cross-references them rather than duplicating them.

## Building and running

From `guides/four-input-fp-adder/src`:

```
bash run_all.sh ch13          # 13 targets, ~34 s here
SIM_TIMEOUT=120 bash run_all.sh   # the whole guide
```

Every target is listed in `targets.txt` with the reason for its
classification. The counts, measured on Icarus Verilog 13.0
(`/usr/local/bin/iverilog`, `vvp` 13.0) on Linux x86-64:

| Class | Count | What the class pins |
|---|---|---|
| `run` | 5 | compiles with a **zero-byte** compile log and simulates with no `FAIL` |
| `warn` | 3 | compiles successfully but **with** output — a diagnostic this chapter quotes |
| `xfail` | 5 | must **fail** to compile — a construct Icarus does not have |

The `warn` class is doing real work in this chapter and it is worth being
explicit about why. Three of the constructs taught here are *usable but
noisy*: an `always_comb` datapath block (ten "constant selects" sorries), an
`always_comb` struct decode (six), and `unique case` (one per case
statement). Under the project rule that a `run` target's compile log must be
empty, none of them can ship as `run` — so they ship as `warn`, where the
manifest pins the *presence* of the diagnostic. If a future Icarus stops
emitting it, the target goes red and the chapter learns that its quoted
transcript is stale.

Wall-clock, measured this session, longest first: `tb_norm_equiv` 15.7 s,
`tb_q_stream` 6.9 s, `tb_if_stream` 5.2 s, `tb_fields_equiv` 4.9 s,
`tb_fields_comb` 1.1 s, the rest under a second. Chapter 12's timing-drift
lesson applies: these are session observations, not contracts, which is why
`tb_norm_equiv` ships at 250,420 vectors rather than the 500,420 the research
ran (32.3 s here — over half the default 60 s `SIM_TIMEOUT`).

## The four rewrites and their measured equivalence

All four ran this session. The transcripts below are the shipped targets'
own output, copied from the run.

| Rewrite | Scale | Wall clock | Result |
|---|---|---|---|
| packed-struct decode vs `../ch07/fp32_fields.v` | 1,003,072 vectors (3,072 directed + 1,000,000 random) | 4.9 s | PASS, bit-identical |
| the same decode as `always_comb` | 203,072 vectors | 1.1 s | PASS, bit-identical, six sorries |
| SV normalize vs `../ch09/fp32_normalize.v` | 250,420 vectors (420 directed + 250,000 random) | 15.7 s | PASS, bit-identical, ten sorries |
| interface-wired vs wire-wired `fp32_add2_p2` | 60,000 streamed cycles, 52,541 retired | 5.2 s | PASS, identical every cycle |
| queue scoreboard vs `fp32_add2_p2` | 60,000 cycles, 52,570 pairs, X bubbles, drain | 6.9 s | PASS, max queue depth 3 |

```
PASS tb_selfstart (@(*) stayed x, always_comb computed at time zero)
PASS tb_fields_equiv (1003072 vectors, bit-identical)
PASS tb_fields_comb (203072 vectors, always_comb form bit-identical)
PASS tb_norm_equiv (250420 vectors, bit-identical)
PASS tb_if_stream (52541 retired results, interface-wired == wire-wired)
PASS tb_q_stream (52570 pairs, max queue depth 3 = measured latency + 1)
PASS tb_assert_live (4 pass statements, 1 deliberate failure reported)
PASS tb_unique_case (5 labelled codes one-hot, no-match default held, overlap undetected)
```

Two numbers in that list are worth reading twice. **`max queue depth 3`** is
not a constant anybody typed: the pipeline's latency is 2, the sample point
pushes before it pops, and the scoreboard therefore *measures* 3. Change the
pipeline depth and the number moves — which is the whole argument for the
queue over chapter 11's `LAT`-deep circular buffer. And **52,541 of 60,000**
cycles retired a result: the missing 7,459 are the 1-in-8 X-data bubbles plus
the fill window, exactly as chapter 11's throughput accounting predicts.

## The construct x `-g` matrix, in full

The chapter abridges this table; here it is complete. Each row is a
compiled-and-run probe, re-run this session against Icarus Verilog 13.0.
**In every probe, `-g2005-sv`, `-g2009` and `-g2012` behaved identically** —
same exit status, byte-identical diagnostics — so the table shows two columns
rather than four. Chapter 5's "the threshold is `-g2005-sv`, and nothing
changes above it" extends from its 15 assertion constructs to the whole
transition list.

Verdicts: **SUPPORTED** (compiles silently, runs with LRM semantics),
**PARSE ERROR**, **SORRY** (an explicit "sorry: ... not supported"),
**ACCEPTED-SILENT** (compiles and runs, but the SystemVerilog semantics are
partly or wholly absent — the dangerous class), **WARN/HALF** (something
happens, but not all of it).

| # | Construct | `-g2005` | `-g2005-sv` / `-g2009` / `-g2012` | Verdict |
|---|---|---|---|---|
| 1 | `logic` variable, continuous + procedural drive | rejected: `Variable 'a' cannot be driven by a continuous assignment` ... `This is allowed when SystemVerilog is enabled.` | clean | SUPPORTED |
| 2 | `bit`, `byte`, `shortint`, `int`, `longint` | rejected | clean, and genuinely two-state: `16'sh7fff + 1` wraps to `-32768` | SUPPORTED (see row 40) |
| 3 | `always_comb` | rejected | clean; implements function-body sensitivity and time-zero execution | SUPPORTED |
| 4 | `always_ff @(posedge ...)` | rejected | clean | SUPPORTED |
| 5 | `always_latch` | rejected | clean; really latches | SUPPORTED |
| 6 | blocking `=` inside `always_ff` | — | compiles clean, runs; zero diagnostics | ACCEPTED-SILENT |
| 7 | two `always_ff` writing one variable | — | clean; LRM forbids it | ACCEPTED-SILENT |
| 8 | `always_comb` variable also written by an `initial` block | — | clean; LRM 9.2.2.2 forbids it | ACCEPTED-SILENT |
| 9 | incomplete `if` in `always_comb` (the accidental latch) | — | clean; the value really latches | ACCEPTED-SILENT |
| 10 | incomplete `if` in `always_latch` | — | byte-identical to row 9 — no diagnostic distinguishes them | ACCEPTED-SILENT |
| 11 | non-edge sensitivity in `always_ff` | — | `warning: Synthesis requires the sensitivity list of an always_ff process to only be edge sensitive. a is missing a pos/negedge.` — still runs | WARN/HALF |
| 12 | `#1` inside `always_comb` | — | **hard error**: `a blocking delay is not allowed in an always_comb, always_ff or always_latch process.` | enforced (`bad_comb_delay.sv`) |
| 13 | `q <= #1 d` inside `always_ff` (intra-assignment) | — | clean — LRM-legal | SUPPORTED |
| 14 | packed `struct` + `typedef`, including through a port | rejected | clean; `$bits` = 32, bit-transparent both ways | SUPPORTED |
| 15 | unpacked `struct` | rejected | `sorry: Unpacked structs not supported.` | SORRY |
| 16 | `typedef enum` + `.name()` | rejected | clean; `.name()` prints the label | SUPPORTED |
| 17 | enum assignment without a cast | rejected | **elaboration error**: `This assignment requires an explicit cast.` | enforced (`bad_enum_cast.sv`) |
| 18 | `interface` declared, instantiated, members read/written; `modport` declared inside | rejected | clean | SUPPORTED (bundle only) |
| 19 | interface as a module PORT — modport-typed, plain, or generic | rejected | `syntax error` / `Errors in port declarations.` for all three forms | PARSE ERROR (`bad_if_port.sv`) |
| 20 | procedural write to an interface member already continuously driven | — | **elaboration error**: `Cannot perform procedural assignment to variable 'b.r' because it is also continuously assigned.` | enforced |
| 21 | `parameter type T` + override | rejected | clean | SUPPORTED |
| 22 | `package` / `import pkg::*` / `pkg::name` | rejected: `syntax error` / `I give up.` | clean | SUPPORTED |
| 23 | `unique case` | rejected | `vvp.tgt sorry: Case unique/unique0 qualities are ignored.` — but a runtime no-match warning **does** fire | WARN/HALF |
| 24 | `unique case` with two matching items (overlap) | rejected | silent; first match wins | ACCEPTED-SILENT |
| 25 | `unique0 case`, no match | rejected | silent — which is *correct* `unique0` semantics | WARN/HALF |
| 26 | `priority case`, no match | rejected | the same runtime warning as row 23 | WARN/HALF |
| 27 | plain `case`, no match (the control) | clean | clean, silent | — |
| 28 | `unique if` | rejected | `syntax error` | PARSE ERROR |
| 29 | immediate `assert` / `assert ... else` | rejected | clean; a failure prints `ERROR: file:line: ...` / `Time: ... Scope: ...`, and the pass statement executes | SUPPORTED |
| 30 | immediate `cover (expr) stmt` | rejected | compiles and runs — but the pass statement **never** executes and no count is ever reported | ACCEPTED-SILENT |
| 31 | `assert property (@(posedge clk) req);` (no temporal operator) | rejected | compile FAIL: `sorry: concurrent_assertion_item not supported. Try -gno-assertions or -gsupported-assertions to turn this message off.` | SORRY |
| 32 | `assert property (... \|-> ...)` | rejected | `syntax error` + `Error in property_spec of concurrent assertion item.` under **every** assertion flag | PARSE ERROR (ch05 `bad_sva.v`) |
| 33 | `covergroup` / `coverpoint` / `bins` / `cross` | rejected | `syntax error` / `error: Invalid module item.` — the diagnostic never names the construct | PARSE ERROR (ch05 `bad_covergroup.v`) |
| 34 | queue `logic [31:0] q[$]`, `push_back` / `pop_front` / `size` | rejected: `Queue declaration requires SystemVerilog.` | clean | SUPPORTED |
| 35 | queue OF a packed struct | rejected | ``Sorry: Queue of type `11netstruct_t` is not yet supported.`` | SORRY (`bad_qstruct.sv`) |
| 36 | dynamic array `int d[]`, `new[5]`, resize-copy `new[8](d)` | rejected: `Dynamic array declaration requires SystemVerilog.` | clean | SUPPORTED |
| 37 | associative array `int a[string]` or `[integer]` | rejected | `error: Type names are not valid expressions here.` + `internal error: I do not know how to elaborate this expression.` | NOT SUPPORTED (`bad_assoc.sv`) |
| 38 | `foreach` over fixed / dynamic / queue | rejected | clean | SUPPORTED |
| 39 | `string` type: `len` / concat / `substr` / `==` / `itoa` | rejected | clean | SUPPORTED |
| 40 | `string.toupper()` | — | `error: Method toupper is not a string method.` | partial method set |
| 41 | `$urandom_range(lo, hi)` | **clean** | clean; bounds respected over 1,000 draws; reversed arguments swap per LRM | SUPPORTED at every level |
| 42 | size / type / sign casts `24'(x)`, `int'(3.7)`, `signed'()` | rejected | clean | SUPPORTED |
| 43 | `.*` and `.name` port connections | rejected | clean | SUPPORTED |
| 44 | `++`, `+=`, `do ... while` | rejected | clean | SUPPORTED |
| 45 | `inside` | rejected | `sorry: "inside" expressions not supported yet.` | SORRY |
| 46 | `==?` wildcard equality | **clean** | clean | SUPPORTED at every level |
| 47 | `void` function, `return`, default arguments | rejected | clean | SUPPORTED |
| 48 | positional assignment pattern `'{8'h12, 8'h34}` | rejected | clean | SUPPORTED |
| 49 | **named** assignment pattern `'{hi: ..., lo: ...}` | rejected | `syntax error` / `error: Malformed statement` | PARSE ERROR |
| 50 | `task expect(...)` | clean | `syntax error` — `expect` became a reserved word | reserved-word cost |
| 51 | a cast's result taking a method: `fclass_e'(code).name()` | rejected | `syntax error` / `Malformed statement` — assign to a typed variable first | PARSE ERROR |
| 52 | constant bit/part-select inside `always_comb` | — | `sorry: constant selects in always_* processes are not fully supported (the process will be sensitive to all bits in '...').` — one per select; the same select in `always @*` or `always_ff` is silent | WARN/HALF |

Rows 41 and 46 are the two surprises: they work at `-g2005` too. That is
consistent with chapter 2's finding that Icarus gates *syntax*, not system
functions — and `==?` seems to have slipped under the syntax gate as well.
The shipped guide sources are the mirror image: `../ch07/fp32_fields.v`
compiles silently at every level from `-g1995` to `-g2012` (measured), while
every file in this directory dies below `-g2005-sv`.

## Reproductions the manifest cannot express

A `targets.txt` line carries one expectation and one file list. It cannot say
"build this again with a different `-g` level" or "build this again with an
assertion flag and expect the opposite verdict". Chapter 4 hit the same wall
with `$dumpvars` on a memory array and put the reproduction in its README;
same here. Run these from `guides/four-input-fp-adder/src/ch13`.

**The queue scoreboard tracks a latency it was never told (the chapter's
strongest single claim, demonstrated).** Copy `../ch11/fp32_add2_p2.v` to the
scratchpad, deepen it to three stages, and run BOTH harnesses against the same
correct design:

```sh
# tb_q_stream.sv, UNEDITED, against the 3-stage DUT:
#   PASS tb_q_stream (... max queue depth 4 = measured latency + 1)
# ch11's LAT-based tb_stream.v, same DUT:
#   FAIL tb_stream cyc 2: ... retired out_valid=0, expected 1
```

Verified by the chapter 13 review, which built the mutant itself. This is the
difference between a scoreboard that *measures* latency and one that is *told*
it: the queue bench needed no edit, the constant-based bench needed a new
constant.

**The migration cost curve — SystemVerilog files die below `-g2005-sv`.**

```
$ iverilog -g2005 -o /tmp/x.vvp fp32_pkg.sv
fp32_pkg.sv:25: syntax error
I give up.
$ iverilog -g1995 -Wall -o /tmp/x.vvp ../ch07/fp32_fields.v ; echo "rc=$?"
rc=0
```

Line 25 is the `package` keyword. The shipped 2001-style module compiles from
`-g1995` up; the rewrite needs `-g2005-sv` and says nothing useful when it
does not get it. Migration on this simulator is all-or-nothing per file.

**The `.sv` suffix does not enable anything.**

```
$ cp fp32_pkg.sv /tmp/pkgcopy.v
$ iverilog -g2005 -o /tmp/x.vvp /tmp/pkgcopy.v
/tmp/pkgcopy.v:19: syntax error
I give up.
```

Same failure, same line offset, different extension. Icarus keys the language
level off `-g` alone.

**`-gno-assertions` deletes working immediate assertions.** `tb_assert_live.sv`
is a `run` target precisely so this can be shown as a colour change rather
than asserted:

```
$ iverilog -g2012 -Wall -o /tmp/a.vvp tb_assert_live.sv && vvp /tmp/a.vvp
ERROR: tb_assert_live.sv:55: deliberate: q=9 exceeds 3
       Time: 5000  Scope: tb_assert_live
PASS tb_assert_live (4 pass statements, 1 deliberate failure reported)

$ iverilog -g2012 -gno-assertions -Wall -o /tmp/a.vvp tb_assert_live.sv && vvp /tmp/a.vvp
FAIL tb_assert_live: pass statement ran 0 times, expected 4 -- assertions were compiled out
```

Both compile logs are zero bytes. The flag removes the whole statement — pass
branch and `else` branch alike. `-gassertions` and `-gsupported-assertions`
both reproduce the first transcript exactly, measured this session.

**The four-way assertion-flag grid.** Using chapter 5's `bad_sva.v` (the
`|->` form) and the research probe `p23b_prop_simple.v` (a concurrent
assertion with no temporal operator):

| | default | `-gassertions` | `-gsupported-assertions` | `-gno-assertions` |
|---|---|---|---|---|
| immediate `assert` | fires | fires | **fires** | **gone, clean run** |
| `assert property (@(posedge clk) req);` | compile FAIL (`sorry: concurrent_assertion_item not supported.`) | same | compiles; **silently discarded** | compiles; **silently discarded** |
| `assert property (... \|-> ...)` | `syntax error` | `syntax error` | `syntax error` | `syntax error` |

`-gsupported-assertions` is the only setting under which working immediate
assertions and a file containing parseable concurrent text can coexist. It
buys that by discarding the concurrent items in silence.

**The larger normalize sweep.** The shipped target runs 250,420 vectors; the
research ran 500,420. To reproduce the larger number, change the random loop
bound in `tb_norm_equiv.sv` to `500000` and adjust the count guard — it took
32.3 s here and still passed bit-identically.

**Immediate `cover` is inert, not merely unreported.**

```verilog
cover  (q == 4'd1) c_hits = c_hits + 1;
assert (q == 4'd1) a_hits = a_hits + 1;
```

prints `cover pass-statement ran 0 time(s); assert pass-statement ran 1
time(s)`. Chapter 5's matrix marks immediate `cover` supported; the tick means
"accepted", not "functional".

**Seed correlation, the sharpened rule.** Chapter 5 measured that
`$urandom(seed)`'s first draw is near-linear in the seed and prescribed "seed
once per run and discard the first draw". Measured this session, the *second*
draw is near-linear too, and `$urandom_range` inherits it:

```
seed 1: first=00010e00  second=1c598438
seed 2: first=00021c00  second=38b1fc71
seed 3: first=00032a00  second=550a72aa
seed 4: first=00043800  second=7162e8e2
seed 1: first $urandom_range(0,9999) after one discard = 1107
seed 2: first $urandom_range(0,9999) after one discard = 2214
seed 3: first $urandom_range(0,9999) after one discard = 3321
seed 4: first $urandom_range(0,9999) after one discard = 4429
```

The second-draw ratios against seed 1 are 1.000, 2.000, 3.000, 4.000 to three
decimals (python3-checked). One discarded draw does **not** decorrelate nearby
seeds. The operative rule is the first half: **seed once per simulation**.
Every testbench in this directory does exactly that.

## Mutation record

Standing practice since chapter 4: for every testbench, ask what would have to
break for it to print `FAIL`, then prove the answer by breaking it. Every
mutation below was applied to a **scratch copy** in the session scratchpad;
nothing in this directory was edited to run them.

**28 mutation runs: 24 killed, 4 survivors** — and each of the four survivors
is a real, named limit of the target it survived, not an oversight.

### tb_fields_equiv.sv (`run`)

| # | Mutation | Result |
|---|---|---|
| F1 | `fp32_fields_sv`: `e_eff = hidden ? w.e_raw : 8'd0` — chapter 5's row-B subnormal bug | **KILLED** — first failure on the first vector, `w=00000000 ref=...01 sv=...00` |
| F2 | `fp32_pkg`: `e_raw` declared *before* `sign` in the packed struct | **KILLED** — `w=80000000 ref={1 00 ...} sv={0 80 ...}`; field order is bit order |
| F3 | `fp32_fields_sv`: `sig = {1'b1, w.frac}` — hidden bit forced high | **KILLED** |
| F4 | the testbench's own random loop set to zero iterations | **KILLED** by the count guard: `swept 3072 vectors, expected 1003072` |

F4 is the check-that-can-execute rule: a sweep that swept nothing must go red,
not green.

### tb_fields_comb.sv (`warn`)

| # | Mutation | Result |
|---|---|---|
| C1 | `fp32_fields_svc`: the same `e_eff` subnormal bug inside `always_comb` | **KILLED** |
| C2 | `fp32_fields_svc`: `hidden = \|w.e_raw;` replaced by `if (\|w.e_raw) hidden = 1'b1;` — an incomplete `always_comb` | **KILLED** — `comb={0 00 000000 x X00000 0X}` |

C2 is worth its own sentence. The mutated file compiled with **six**
"constant selects" sorries and **zero** latch-related diagnostics of any kind:
Icarus said nothing whatever about the incomplete `always_comb`, exactly as
chapter 3's "What the Simulator Will and Will Not Tell You" predicts. What
caught it was the equivalence sweep, not the compiler.

### tb_norm_equiv.sv (`warn`)

| # | Mutation | Result |
|---|---|---|
| N1 | `ns = s_in` — the right-1 path drops its `sum27[0]` sticky OR | **KILLED** — `sum=4000001 ref=...001... sv=...000...` |
| N2 | `shl8 = {3'b000, lz}` — the subnormal shift clamp removed | **KILLED** |
| N3 | `nsig = ... : framel[24:1]` — the left-shift slice off by one | **KILLED** |
| S3 | `e_lim = (e_big == 0) ? 0 : e_big - 1` — differs from the original **only** at `e_big = 0` | **SURVIVED** |

**S3's reason:** `e_big = 0` is outside the module's contract (chapter 9's
`fp32_normalize` is only ever driven with `e_big >= 1`), and the testbench
constrains its random stimulus accordingly. A mutation that is invisible
inside the contract is not a testbench defect; it is the contract doing its
job. The honest statement of what this target proves is therefore "identical
on the specified domain", not "identical".

### tb_if_stream.sv (`run`)

| # | Mutation | Result |
|---|---|---|
| I1 | interface-wired DUT: `.a(bi.b), .b(bi.a)` — operands swapped | **KILLED** — but only **3 errors in 52,541 retired results**, first at cycle 21,923 |
| I2 | interface-wired DUT: `.in_valid(1'b1)` — valid tied high | **KILLED** — 7,458 errors, first at cycle 1 |
| I3 | stimulus forced to bubbles only — nothing is ever driven | **KILLED** by the retired-count floor: `only 0 results retired` |
| S1 | the shared `fp32_add2_p2` module mutated (sticky pipe dropped) | **SURVIVED** |

**I1 is the most instructive kill in the chapter.** Addition is commutative,
so swapping the operands changes the answer on essentially nothing — except
NaN payload propagation, where chapter 12's specification clause S5 fixes the
priority `a > b`. Three vectors in fifty-two thousand. A weaker harness — one
that checked only finite operands, or sampled every hundredth cycle — would
have called that mutant clean.

**S1's reason:** both DUTs in this testbench are the *same module*, so a
mutation to `fp32_add2_p2` changes both sides of the comparison and cancels.
That is not a hole to be plugged: this target's claim is that interface
wiring is transparent, and arithmetic is proven elsewhere (chapters 9 through
12, and `tb_q_stream.sv` next door). Stating the claim precisely is what keeps
the survivor from being a defect.

### tb_q_stream.sv (`run`)

| # | Mutation | Result |
|---|---|---|
| Q1 | `fp32_add2_p2`: `p1_s_al <= 1'b0` — the pipelined sticky bit dropped | **KILLED** — 24,246 errors |
| Q2 | `fp32_add2_p2`: `out_valid = vpipe[0]` — retire one cycle early | **KILLED** — 52,570 errors; every retire skewed, first at cycle 1 with an X |
| Q3 | `fp32_add2_p2`: `out_valid = 1'b0` — never retires | **KILLED** by the drain and count guards: `52570 expectation(s) never retired` / `driven 52570, retired 0` |
| Q4 | `fp32_add2_p2`: `out_valid = vpipe[1] \| vpipe[0]` — spurious retires during bubbles | **KILLED** — 59,133 errors, the empty-queue guard firing from cycle 17 |
| S2 | a shared **stage** module mutated (`fp32_normalize`'s sticky OR) | **SURVIVED** |

Q3 and Q4 are the two mutants that exist to justify the queue's bookkeeping
guards. A scoreboard with only a data comparison passes Q3 (it never gets a
transaction to compare) and mostly passes Q4 (a spurious retire has nothing to
compare against). The `q.size() == 0` check, the drain, the empty-at-end check
and `driven == retired` are what turn both into failures.

**S2's reason:** chapter 11's oracle for a pipelined `fp32_add2_p2` is the
combinational `fp32_add2`, and both are built from the *same* seven stage
modules. Mutating a stage changes DUT and oracle together — chapter 9's
"Masking, Measured in Both Directions", reproduced. This target checks the
pipeline wrapper (registers, valid pipe, ordering, latency), and the stage
arithmetic is checked by chapter 9's unit suites and equivalence sweep. Two
levels of testing, neither optional.

### tb_assert_live.sv (`run`)

| # | Mutation | Result |
|---|---|---|
| A1 | rebuild with `-gno-assertions` | **KILLED** — `pass statement ran 0 times, expected 4` |
| A2 | the deliberate failure made true (`q = 4'd2`) | **KILLED** — `the deliberate failure never reported (fired=0)` |
| A3 | the passing `assert` replaced with an immediate `cover` | **KILLED** — `pass statement ran 0 times`; immediate `cover`'s pass statement never executes |

A3 was not planned as a mutation; it started as a check of the research's
claim that immediate `cover` is inert, and it turned out to be a clean mutant
for this testbench.

### tb_selfstart.sv (`run`)

| # | Mutation | Result |
|---|---|---|
| SS1 | `always_comb y_comb = ~a;` reverted to `always @(*)` | **KILLED** — `always_comb did not run at time zero (y_comb=x, expected 0)` |
| SS2 | `a` declared undriven and assigned procedurally instead, so `@(*)` does fire | **KILLED** — `always @(*) self-started (y_star=0, expected x)` |

Both directions matter. SS1 is the future in which Icarus stops running
`always_comb` at time zero; SS2 is the one in which `@(*)` gains a self-start.
This target is red in either.

### tb_unique_case.sv (`warn`)

| # | Mutation | Result |
|---|---|---|
| U1 | `fp32_class_flags_sv`: the pre-case default assignments removed | **KILLED** — `code 0 (FC_ZERO): flags xxxx1, expected 00001`; the compile said nothing about the latch |
| U2 | `FC_INF` branch sets `is_nan` | **KILLED** — `code 3 (FC_INF): flags 10000, expected 01000` |
| U3 | the overlap probe's `casez` items swapped | **KILLED** — `hit=2, expected 1 (first match wins)` |
| S4 | `unique` deleted from **both** case statements | **SURVIVED the testbench; KILLED by the manifest** |

**S4's reason, and the limitation it exposes.** With `unique` removed the
testbench still passes — as it must, because everything it can observe from
inside the simulation (the one-hot decode, the surviving default, the
first-match-wins overlap) is behaviour plain `case` shares. What changes is
the *compile log*: it drops from 165 bytes to zero, and the `warn` row goes
red. So the classification is the check — for WHOLESALE removal. The `warn`
contract pins only that the log is non-empty, and these 165 bytes are two
sorries from two files: measured, deleting `unique` from the DUT module ALONE
leaves 80 bytes (the testbench's own `unique casez` sorry), so the row stays
green and that single-site mutant survives everything. Per-site pinning would
need the probe split into its own target. The one thing neither the testbench
nor the manifest pins is the runtime `WARNING: ... value is unhandled for
priority or unique case statement` line, which is written to the simulator's
own output and is not visible to Verilog code. That transcript is pinned only
by being quoted, in `tb_unique_case.sv`'s header and in the chapter.

## Corrections to the research notes, found while writing

Everything in `../../research/ch13-systemverilog.md` was re-run this session
before being used. Five things needed correcting or sharpening; none changes a
conclusion.

1. **The ten `always_comb` sorries do not include a loop-variable one.** The
   research reports that in the normalize rewrite "even the loop variable's
   implicit `i[31:0]` triggers one, with a mangled `+i[31:0]` name". Measured
   on the shipped `fp32_normalize_sv.sv`, the ten break down as **six naming
   `sum27[26:0]`, three naming `framel[25:0]`, one naming `shl8[7:0]`** — none
   from the function. The `+i[31:0]` sorry is real, but it belongs to the
   research's own `p57` probe, whose `lzc26g` is a plain (non-`automatic`)
   function with an `integer` loop variable. Declaring the function
   `automatic` with `for (int i ...)`, as the shipped rewrite does, removes
   it. Probe-specific, not general.

2. **`tb_norm_equiv` at 500,420 vectors takes 32.3 s here, not 20.5 s.** Same
   machine class, same simulator, different day — chapter 12's timing-drift
   finding again. The shipped target is resized to 250,420 vectors (15.7 s),
   and the larger run is a reproduction line above.

3. **"The first post-seed draw" needs disambiguating.** `$urandom(seed)`
   *returns* a draw of its own: for seed 1 that is `00010e00`, the near-linear
   value chapter 5 recorded. The value the research lists as the first draw
   for seeds 1-6 (`1c598438`, `38b1fc71`, ...) is the **next** call's result —
   i.e. the first draw *after* the discard chapter 5 prescribes. Both are
   near-linear, which is the point; the sharpened rule is that discarding one
   draw does not decorrelate nearby seeds.

4. **The interface-port diagnostic's second line points at the module header.**
   The research quotes `syntax error` / `Errors in port declarations.`, which
   reproduces exactly — but the file positions differ: the `syntax error` is on
   the port line, and `Errors in port declarations.` is reported against line 1,
   the `module` keyword. `bad_if_port.sv` quotes both correctly.

5. **The `always_comb` struct decode's six sorries: five of the six carry a
   mangled `:0:` position.** The research says "some"; measured, it is
   consistently five, with only the `sig = {hidden, w.frac};` line getting a
   real `file:line`.

One finding is **new** and not in the research notes at all: a cast's result
cannot take a method. `fclass_e'(code).name()` is `syntax error` /
`error: Malformed statement`; the value has to be assigned to a typed variable
first (`cls = fclass_e'(code); ... cls.name()`). It is row 51 of the matrix
above, and it is another instance of the chapter's composition rule — Icarus's
SystemVerilog features frequently work alone and fail combined, so every
composite in a listing has to be compiled, never inferred from a
single-feature support table.

**One external check, re-run this session.** The Icarus documentation page
"Command Line Flags"
(<https://steveicarus.github.io/iverilog/usage/command_line_flags.html>)
returned HTTP 200 and contains, verbatim: "When disabled, assertion statements
are parsed but ignored. The supported-assertions option only enables
assertions that are currently supported by the compiler." So the project's own
documentation does say that the flag discards parsed assertions. It therefore
corroborates chapter 5's measured discard; this chapter's addition is that
IMMEDIATE assertions are discarded too, which the documentation does not say.

**Environment of record for everything in this file:** Icarus Verilog 13.0
(stable, `v13_0`) at `/usr/local/bin/iverilog`, `vvp` 13.0, python3 3.11.15,
Linux x86-64, 2026-08-21. `which verilator` returns nothing — Verilator is
**not installed here**, so no claim in this chapter about Verilator, Vivado,
Questa or VCS is a measurement.
