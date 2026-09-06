# Chapter 13 review — round 1

<!-- sections complete: 11/11 -->

Reviewer persona: pedagogy expert who runs the code. Every claim below that says
"measured" was re-executed in this session on the same machine.

## Verdict

**7 / 10 — blocking.** Two of the four named blocking triggers are present: an
unreproducible ledger claim (`priority case` does *not* emit a `sorry`; measured,
its compile log is zero bytes) and an overclaimed climax (an unbounded "in any
language", an unsupportable "invented here", and a false "the partition
invariants all come free as bins and crosses"). Added to those: the chapter's own
epistemic-wall paragraph states a harness count that is wrong — it says "thirteen
targets" and "121/121" when the shipped manifest has fourteen and the repo runs
**122/122** — and a quotation attributed to chapter 5 three separate times does
not exist in chapter 5, and is used to stage a correction of a position chapter 5
never held.

That is the whole of the bad news, and it is entirely in what the chapter
*claims*. **The engineering underneath is the strongest in the guide so far.**
Everything I could execute, executed. `run_all.sh ch13` is 14/14 and the full
repo 122/122 cold. All thirteen listings are byte-identical to their shipped
files and every quoted line number is right. I re-probed roughly forty-five of
the fifty-two matrix rows myself at multiple `-g` levels and every diagnostic
came back byte-identical. I wrote my own probes — not the shipped ones — for
both `always_comb` differences, the absent latch warning, the four-way assertion
grid, immediate `cover`'s inertness and the seed correlation, and all five
reproduced. I ran my own equivalence sweeps (300,000 packed-struct vectors,
300,424 normalize vectors, `!==` with X-guards) and found zero mismatches. Nine
mutations of my own design were all killed, one of them at compile time by the
very single-driver rule the chapter documents. Every number in the 28-run
mutation record reproduced *exactly*, down to "first at cycle 21,923".

And the chapter's boldest testbench claim is not just true, it is
demonstrable in a way the chapter does not even claim: I deepened the DUT from
latency 2 to latency 3 and `tb_q_stream.sv` passed **unedited**, reporting
`max queue depth 4 = measured latency + 1`, while chapter 11's `LAT`-based
scoreboard went red on the same correct DUT. "A testbench that measures a
property instead of asserting it cannot disagree with the design about that
property" is a sentence this chapter has earned.

Credit where the brief expected trouble: the covergroup climax **does not**
commit the overclaim it was warned against. It never says covergroups cannot do
bin-pinning in any simulator. It says the opposite, in as many words — "Could you
build chapter 12's guard around a covergroup? In a tool with a coverage database,
yes" — and it flags the clause-19 paragraph as documentation-not-measurement
before writing it. The overclaims that remain are three phrases in the final
paragraph, and each is a one-line fix.

Every defect below is cheap. None requires new code except one optional
strengthening. This is a 9 after an afternoon of edits.

## Measured claims re-run

Environment: Icarus Verilog 13.0 / `vvp` 13.0 at `/usr/local/bin`, python3
3.11, Linux x86-64. Every probe below is mine, written for this review, not the
shipped file — except where a shipped target is named.

### The harness numbers (defect)

| Claim (chapter line 22) | Measured |
|---|---|
| "chapter 13 adds **thirteen** targets" | `targets.txt` holds **14** (5 run / 3 warn / 6 xfail) |
| "the full-repo regression stands at **121/121**" | `SIM_TIMEOUT=120 bash run_all.sh` → **122/122**, EXIT=0 |
| `bash run_all.sh ch13` | **14/14**, EXIT=0, cold |

The chapter's counts are the pre-`cg_cov4` figures. `STATE.md`'s own latest
block already records 14 targets and 122/122; only the chapter went unpatched.
It sits in the paragraph that asks the reader to trust every other number in the
chapter, which is why I rank it first.

### The construct × `-g` ledgers

I re-probed ~45 of the README's 52 rows. **Every row I checked reproduced, with
byte-identical diagnostics.** A representative selection, all at `-g2005`,
`-g2005-sv`, `-g2009`, `-g2012`:

| Row | Construct | My result |
|---|---|---|
| 1 | `logic` + continuous drive | `-g2005`: `error: Variable 'a' cannot be driven by a continuous assignment/module.` / `: This is allowed when SystemVerilog is enabled.`; SV levels clean ✓ |
| 6 | blocking `=` in `always_ff` | compiles clean, **0-byte** log, runs ✓ ACCEPTED-SILENT |
| 7 | two `always_ff` writing one var | **0-byte** log ✓ |
| 8 | `always_comb` var also written by `initial` | **0-byte** log; the `initial` write sticks ✓ |
| 9 | incomplete `if` in `always_comb` | **0-byte** log; `y` held `1` when `en=0,d=0` — it really latches ✓ |
| 10 | same under `always_latch` | compile log and run output **byte-identical** to row 9 ✓ |
| 11 | non-edge sensitivity in `always_ff` | `warning: Synthesis requires the sensitivity list of an always_ff process to only be edge sensitive. a is missing a pos/negedge.` ✓ |
| 13 | `q <= #1 d` in `always_ff` | clean ✓ |
| 15 | unpacked struct | `sorry: Unpacked structs not supported.` ✓ |
| 21 | `parameter type` + override | clean, `po=5a` ✓ |
| 24 | `unique case` overlap | silent, first match wins (`h2=1`) ✓ |
| 25 | `unique0`, no match | silent ✓ |
| 28 | `unique if` | `syntax error` at every level ✓ |
| 34/35 | queue / queue of packed struct | clean / ``Sorry: Queue of type `11netstruct_t` is not yet supported.`` ✓ |
| 36 | dynamic array `new[5]`, `new[8](d)` | clean, resize preserved `d[4]=9` ✓ |
| 37 | associative array | `error: Type names are not valid expressions here.` + `internal error: I do not know how to elaborate this expression.` ✓ |
| 40 | `string.toupper()` | `error: Method toupper is not a string method.` ✓ |
| 41 | `$urandom_range` at `-g2005` | **clean**; 1,000 draws all in [10,20]; `$urandom_range(20,10)` → 14 ✓ |
| 43 | `.*` port connections | clean ✓ |
| 45 | `inside` | `sorry: "inside" expressions not supported yet.` ✓ |
| 46 | `==?` at `-g2005` | **clean** ✓ |
| 48/49 | positional / named assignment pattern | clean / `syntax error` ✓ |
| 50 | `task expect` | clean at `-g2005`, `syntax error` at `-g2012` ✓ |
| 51 | `fclass_e'(code).name()` | `syntax error` / `error: Malformed statement` ✓ |
| 52 | constant select in `always_comb` | one `sorry` per select; **same select in `always @*` and in `always_ff` is silent** ✓ |

`$bits(fp32_t)` measures **32**; `32'h40490fdb` decodes to `sign=0`,
`e_raw=80`, `frac=490fdb` — exactly the values in the prose.

**One ledger claim does not reproduce (defect).** The chapter says, twice —
body: "Every `unique`/`priority case` adds a `sorry` to the compile log"; Tier 2:
"each case statement costs a `sorry` in the compile log". Measured on isolated
probes:

```
u_prio.sv  (priority case)  COMPILE LOG: 0 bytes   <-- no sorry at all
u_uniq.sv  (unique case)    COMPILE LOG: 155 bytes
   u_uniq.sv:2: vvp.tgt sorry: Case unique/unique0 qualities are ignored.
```

Both still produce the runtime `WARNING: ... value is unhandled for priority or
unique case statement`. The message itself is scoped `unique/unique0`; `priority`
never triggers it. README row 26 is correctly worded — only the chapter
overstates. This matters practically, because the chapter uses the sorry-cost as
one of the two reasons to file `unique`/`priority` under Tier 2.

### The two `always_comb` differences — my own probes

**Time-zero self-start.** My probe (`logic [3:0] src = 4'd5;` feeding three
process forms) printed `star=xxxx comb=0110 at=xxxx`. `always @(*)` and
`always @(src)` both stayed `x`; `always_comb` computed `5+1=6` at time zero.
Reproduces. The shipped `tb_selfstart.sv` prints `y_star=x y_comb=0` and its
PASS line verbatim.

**Function-body sensitivity.** My probe used a function reading a module-level
global rather than an argument, called from both process forms, then moved only
the global:

```
t1: star=x comb=0
t2: star=x comb=25    <-- only the global moved; always_comb re-evaluated
t3: star=25 comb=25   <-- @* catches up only when the ARGUMENT changes
```

Reproduces. (My `t1` shows `x` rather than the chapter's `0` because my probe
never gives `@*` a first event at all — the substance, that `always_comb`
follows dependencies into function bodies and `@*` does not, is identical.)

**Framing accuracy — one defect.** The chapter attributes the no-self-start trap
to chapter 3's **"Sensitivity Lists, and What `@(*)` Really Covers"**. That
section is `ch03.md` lines 364–438 and contains **zero** occurrences of the
trap. It lives in chapter 3's "How a Simulator Actually Runs Your Code"
(line 212), and chapter 3's own traps table (line 837) attributes it there
explicitly. The misattribution appears three times: chapter body, checklist
item 4, and `tb_selfstart.sv`'s header comment. The chapter 9 attribution
("Normalize, Round, and the Latch Simulation Cannot See") *is* correct —
ch09 line 251 falls inside that section.

### The still-absent latch warning

Rebuilt as my own module (`always_comb` whose right-1 branch omits `ns`), at
`-g2012 -Wall`:

```
n_latch.sv:8: sorry: constant selects in always_* processes are not fully supported
              (the process will be sensitive to all bits in 'sum27[26:0]').
```

That is the entire log — **zero latch-related diagnostics**. And the latch is
real: `t1 else-path ns=0`, then `t2 right1 ns=0` where the correct value is `1`.
Swapping `always_comb` → `always_latch` gave a **byte-identical** compile log and
a byte-identical run. Confirms the chapter's three-bullet conclusion exactly.

### The assertion-flag grid

I wrote a failing immediate assertion of my own and ran all four flag settings.
The chapter's grid reproduces **cell for cell**:

| | default | `-gassertions` | `-gsupported-assertions` | `-gno-assertions` |
|---|---|---|---|---|
| immediate `assert` | fires (pass=1 fail=1) | fires | **fires** | **pass=0 fail=0 — deleted, clean run** |
| `assert property (@(posedge clk) req);` | compile FAIL, the `sorry` | same | compiles; discarded; **immediate still runs (=1)** | compiles; discarded; **immediate deleted (=0)** |
| `assert property (… \|-> …)` | `syntax error` + `Error in property_spec of concurrent assertion item.` | same | same | same |
| immediate `cover` | inert | same | same | same |

So **`-gsupported-assertions` is verifiably the only setting where working
immediate assertions and a parseable-concurrent file coexist** — the chapter's
central assertion finding, confirmed. The compiler's own recommendation text
reproduces verbatim: `sorry: concurrent_assertion_item not supported. Try
-gno-assertions or -gsupported-assertions to turn this message off.`

The shipped target behaves as advertised in both directions:

```
$ iverilog -g2012 -Wall … tb_assert_live.sv && vvp …
ERROR: tb_assert_live.sv:55: deliberate: q=9 exceeds 3
       Time: 5000  Scope: tb_assert_live
PASS tb_assert_live (4 pass statements, 1 deliberate failure reported)

$ iverilog -g2012 -gno-assertions -Wall … && vvp …
FAIL tb_assert_live: pass statement ran 0 times, expected 4 -- assertions were compiled out
```

Byte-identical to the chapter. Line 55 really is the deliberate `$error`.

**Attribution defect (three occurrences).** The chapter writes: *chapter 5 says
the three flags "only control whether the `sorry` prints; they enable nothing"*,
then corrects the second half. **That sentence is not in chapter 5.** Chapter 5
(line 373) says: "They are worse than useless: they enable nothing, and where
the parser *can* read the syntax they **silence the diagnostic and discard the
property**." Chapter 5 already said the property is discarded. The chapter
invents a weaker chapter-5 position in order to correct it. The same
misattribution recurs in Sources item 1 ("chapter 5's 'it only controls the
diagnostic' reading was folklore") and in `src/ch13/README.md` §7. The chapter's
*genuine* new finding — that `-gno-assertions` deletes **immediate** assertions,
which chapter 5 never tested — is real, reproduced, and needs no fabricated foil.
(The other chapter-5 quotation, "a flag that turns a failing check into a silent
pass", is verbatim at ch05 line 382. ✓)

### `unique`/`priority` runtime warning vs the "qualities ignored" sorry

Reproduced in full on my own probe: `unique case` no-match →
`WARNING: …: value is unhandled for priority or unique case statement`;
`unique0` no-match → silent (correct LRM semantics); `unique casez` with two
matching items → **silent, first match wins**. On the shipped target the compile
log is exactly **165 bytes** (two sorries: `fp32_class_flags_sv.sv:39` and
`tb_unique_case.sv:43`) and the runtime line is
`WARNING: fp32_class_flags_sv.sv:39: … Time: 11000  Scope: tb_unique_case.dut`
— byte-identical to the chapter. Line 39 really is the `unique case`.

### Immediate `cover`'s inertness

`cover pass-statement ran 0 time(s); assert pass-statement ran 1 time(s)` —
byte-identical, on my own two-statement program, with the covered expression
true. Inert under all four assertion flags.

Note for fairness: chapter 5 line 398 already states "immediate `cover` produces
nothing at all, because there is no database to write to". The chapter's framing
("Chapter 5's matrix ticks immediate `cover`; the tick means 'accepted', not
'functional'") reads as a correction of chapter 5 when it is really a sharpening
of the *mechanism* (the pass statement specifically never executes). Worth one
clause of acknowledgement.

### The seed-correlation sharpening

Byte-identical, including the derived numbers:

```
seed 1: first=00010e00  second=1c598438      $urandom_range(0,9999) after 1 discard: 1107
seed 2: first=00021c00  second=38b1fc71                                              2214
seed 3: first=00032a00  second=550a72aa                                              3321
seed 4: first=00043800  second=7162e8e2                                              4429
```

Second-draw ratios against seed 1: **1.000, 2.000, 3.000, 4.000**. The
sharpening is correct and well made.

One wording nit: the chapter puts chapter 5's rule in quotation marks as "seed
once per run **and discard the first draw**". Chapter 5 actually writes "**Seed
once per run, print the seed, throw the first draw away.**" Paraphrase inside
quote marks, and "print the seed" is dropped.

### Chapter-5 matrix size (defect)

The chapter says chapter 5 "did that for **fifteen** assertion-related
constructs" and "drew this boundary from a **15-construct** matrix". Chapter 5's
own text says "**Ten** constructs, four language levels, measured here." Fifteen
is the research-note figure in `STATE.md`, not the chapter of record's. Both
occurrences are attached to a quoted chapter-5 section title, so a reader who
follows the reference finds a contradiction.

## Rewrites and equivalence

**All four equivalence claims hold.** Nothing here is blocking. This is the
strongest part of the chapter.

### In-harness, cold

Every target run from a clean tree, PASS lines compared byte-for-byte against
the chapter's quoted transcripts:

```
PASS tb_fields_equiv (1003072 vectors, bit-identical)                     ✓ identical
PASS tb_norm_equiv (250420 vectors, bit-identical)                        ✓ identical
PASS tb_if_stream (52541 retired results, interface-wired == wire-wired)  ✓ identical
PASS tb_q_stream (52570 pairs, max queue depth 3 = measured latency + 1)  ✓ identical
PASS tb_fields_comb (203072 vectors, always_comb form bit-identical)      ✓ identical
```

`tb_if_stream` compiles with a **zero-byte** log and simulates in **5.294 s** —
the chapter says "Zero-output compile, 5.2 seconds". ✓

### 1. Packed struct vs `src/ch07/fp32_fields.v` — verified independently

I wrote my own sweep rather than trusting `tb_fields_equiv.sv`: ten directed
patterns (both zeros, both infinities, qNaN, min subnormal, max subnormal, min
normal, max normal, 1.0) plus 299,990 random 32-bit words, comparing the full
output concatenation `{sign,e_raw,frac,hidden,sig,e_eff}` with `!==` and an
independent `^… === 1'bx` X-guard on **both** sides.

```
REVIEWER rv_fields: 300000 vectors, 0 mismatches, 0 X-guard hits
```

The rewrite is a renaming and is now proven to be one twice over. The chapter's
supporting claims also check out: `$bits(fp32_t)` is 32, a plain 32-bit vector
drives the `fp32_t` port with no ceremony, and the six `always_comb`-form
diagnostics are exactly six with exactly five carrying the mangled `:0:` (the
sixth, `fp32_fields_svc.sv:37`, is the `sig = {hidden, w.frac};` line — precisely
as README §7 correction 5 states).

### 2. `always_comb` normalize vs `src/ch09/fp32_normalize.v` — verified independently

My own sweep: all 26 single-bit frames × carry × `eff_sub` × `s_in` × exponent
corners (1,664 directed), the all-zero frame in both carry states, then 300,000
random `{sum27, eff_sub, s_in, e_big}` vectors, `!==` plus X-guards on both
sides.

```
REVIEWER rv_norm: 300424 vectors, 0 mismatches, 0 X-guard hits   (19.5 s)
```

The ten `sorry` lines reproduce and — importantly — **their breakdown reproduces
exactly as the chapter claims**: six naming `sum27[26:0]` (lines 57, 59, 66, 67,
68, 69), three naming `framel[25:0]` (66, 67, 68), one naming `shl8[7:0]` (63),
and **none from the function's loop variable**. That is README §7 correction 1,
independently confirmed. The quoted transcript line `fp32_normalize_sv.sv:57` is
the right line.

My 19.5 s at 300,424 vectors brackets README correction 2's numbers (15.7 s at
250,420; 32.3 s at 500,420) proportionally. The decision to ship the smaller
sweep rather than the research's 500,420 is chapter 12's timing-drift rule
applied correctly.

### 3. Interface bundles vs chapter 11's wiring

The shipped target compares an interface-wired `fp32_add2_p2` against a
conventionally-wired twin cycle by cycle over 60,000 cycles with `!==`. It
passes, and it is falsifiable — see Mutations below, where a one-cycle handshake
skew of my own design produces failures from cycle 2.

The chapter's structural claims all reproduce: interfaces work as instantiated
bundles at every SV level; all three **port** forms fail with
`bad_if_port.sv:35: syntax error` / `bad_if_port.sv:1: Errors in port
declarations.`; and the single-driver protection is real — my cross-wiring
mutation was rejected at elaboration with `error: Variable 'invalid' cannot have
multiple drivers.` That is the "one protection that exists", caught firing on a
bug it was never advertised against.

### 4. The queue scoreboard's latency-free property — **the strongest result in the chapter**

The chapter claims the queue version "never mentions the latency" and that
`max queue depth 3` is a measurement rather than an assumption. I tested this the
only way that settles it: I mutated the DUT's latency.

I copied the whole module tree to scratch, added a **third** output register
stage to `fp32_add2_p2` and deepened `vpipe` to `[2:0]` — a correct pipeline,
one cycle deeper. Then I ran `tb_q_stream.sv` **completely unedited**:

```
PASS tb_q_stream (52570 pairs, max queue depth 4 = measured latency + 1)
```

The testbench tracked the deeper DUT with zero changes and reported the new
depth. Nobody typed 3, and nobody typed 4. `grep -n 'LAT'` over
`tb_q_stream.sv` returns hits only in the header comment; the executable code
contains no latency constant, no modulo, no depth.

For contrast I ran chapter 11's `LAT`-based `tb_stream.v` against the *same*
correct DUT:

```
SEED=9090 LAT=2
FAIL tb_stream cyc 2: 00000000+00000000 retired out_valid=0, expected 1
FAIL tb_stream cyc 4: 80000000+80000000 pipe 00000000/000 ref 80000000/000
… (and on)
```

The old harness disagrees with a correct design about its latency; the queue
harness cannot. The chapter asserts this; it is worth noting that the chapter
does **not** show this experiment, and it is the single most persuasive piece of
evidence it has. Recommend adding it as a README reproduction line (see Required
changes, item 9 — a nice-to-have, not a defect).

### Composition walls

Both reproduce. ``Sorry: Queue of type `11netstruct_t` is not yet supported.``
byte-identical; named assignment patterns `'{r:…, s:…}` are a `syntax error`
while the positional form `'{8'h12, 8'h34}` compiles and prints `1234`. The
derived rule — "Icarus's SystemVerilog features frequently work alone and fail
combined … Compile the composite" — is correct and is the chapter's most
transferable sentence.

## Manifest rows: xfail and warn

### All six xfails fail for the stated reason

I read the actual diagnostic, not the comment, for each. Every one matches its
file header and the chapter's prose.

| Target | Measured diagnostic (first line) | Matches stated reason? |
|---|---|---|
| `bad_if_port.sv` | `:35: syntax error` + `:1: Errors in port declarations.` | ✓ — and line 35 really is the modport-typed port |
| `bad_enum_cast.sv` | `:30: error: This assignment requires an explicit cast.` (×2, 2 errors) | ✓ |
| `bad_assoc.sv` | `:26: error: Type names are not valid expressions here.` + `internal error: I do not know how to elaborate this expression.` | ✓ |
| `bad_qstruct.sv` | ``:36: Sorry: Queue of type `11netstruct_t` is not yet supported.`` | ✓ |
| `bad_comb_delay.sv` | `:31: error: a blocking delay is not allowed in an always_comb, always_ff or always_latch process.` + `:30: error: there must be no event controls or blocking delays in an always_comb process.` | ✓ — both quoted lines present, in that order |
| `cg_cov4.sv` | `:16: syntax error` + `:16: error: Invalid module item.` … `:32: syntax error` / `I give up.` | ✓ — see below |

### `cg_cov4.sv` — the orchestrator's fix, verified

Everything about the repaired listing checks out:

- **Line 16 is `  covergroup cg @(posedge clk);`** ✓ (and the chapter's 17-line
  listing matches the file byte-for-byte starting at line 16).
- **The full run is 30 lines** at `-g2012` ✓, ending `I give up.` ✓.
- **First pair** `cg_cov4.sv:16: syntax error` / `cg_cov4.sv:16: error: Invalid
  module item.` ✓ byte-identical.
- **Last two lines** `cg_cov4.sv:32: syntax error` / `I give up.` ✓
  byte-identical.
- **"byte-identical at `-g2005-sv` and `-g2009`"** ✓ — all three SV levels give
  the same 30-line output.
- **The corrected `-g2005` claim** ✓ — at `-g2005` the second line really does
  become `cg_cov4.sv:16: error: Invalid module instantiation`, same line 16.
  (For completeness: the `-g2005` run is 27 lines, not 30, and ends at line 33.
  The chapter only claims the *first pair* differs, so this is not an error —
  but it is why the "same rejection at the same line, differently named" phrasing
  is the right one.)
- **"The diagnostic never contains the word 'covergroup'"** ✓ — confirmed by
  grep over all four levels.

**Nit — abridgement arithmetic.** The marker reads `...  (28 further lines, one
pair per construct inside)` and is placed between the first pair and the final
two lines. Total output is 30 lines; the first two and last two are shown, so
the ellipsis stands for **26**, not 28. Also, the output is not cleanly "one
pair per construct": lines 20→23 and 25→27 break the pairing. Fix: "(26 further
lines; the parser reports the covergroup body line by line before giving up)".

### The three warn rows all warn

| Target | Compile log | Run |
|---|---|---|
| `tb_fields_comb.sv` | 6 `sorry` lines (5 mangled to `:0:`) | `PASS tb_fields_comb (203072 vectors, …)` |
| `tb_norm_equiv.sv` | 10 `sorry` lines (6 `sum27` / 3 `framel` / 1 `shl8`) | `PASS tb_norm_equiv (250420 vectors, bit-identical)` |
| `tb_unique_case.sv` | **165 bytes**, two `sorry` lines | `PASS tb_unique_case (…)` + the runtime `WARNING` |

The harness's `warn` contract (must compile, must produce output) is genuinely
load-bearing on all three: each would go red if Icarus stopped emitting.

### Do the five new xfails duplicate chapter 5's?

**Not the five, no.** `bad_if_port`, `bad_enum_cast`, `bad_assoc`, `bad_qstruct`
and `bad_comb_delay` pin constructs chapter 5 never touched, and the chapter
cross-references `bad_sva.v` and `bad_covergroup.v` by name rather than
re-teaching them. Chapter 5's `bad_sva.v` remains the pinned SVA record and the
chapter says so.

**But `cg_cov4.sv` is a sixth xfail that *is* a second covergroup wall**, and two
sentences no longer sit right with it:

- "the third SystemVerilog parse wall this guide pins, after chapter 5's
  `bad_sva.v` and `bad_covergroup.v`, **which stay where they are and are
  cross-referenced rather than duplicated**" — half true now. `bad_sva.v` is
  cross-referenced. `bad_covergroup.v` is cross-referenced *and* effectively
  re-shipped at chapter-12 scale.
- "Chapter 5's `bad_covergroup.v` `xfail` target reproduces this exactly and
  **remains the pinned record**" — written one paragraph after the chapter
  introduces its own covergroup xfail.

This is defensible on the merits: I compared the files and they are genuinely
different artifacts. `ch05/bad_covergroup.v` is a minimal two-bin coverpoint;
`ch13/cg_cov4.sv` is chapter 12's real three-coverpoint-plus-cross model, and it
exists because the chapter's listing must have a file behind it. The chapter just
needs one clause saying so instead of implying no covergroup file was added.

## Mutations

I designed my own battery before reading the README's, working from the brief:
break each rewrite's equivalence subtly, corrupt a queue push/pop, mistime an
interface handshake. All work in the scratchpad on copies; nothing in
`guide/src/` was edited.

### My battery — 9 designed, 9 killed

| # | Mutation | Target | Result |
|---|---|---|---|
| R-M1 | `e_eff = hidden ? w.e_raw : 8'd0` | `tb_fields_equiv` | **KILLED**, first vector: `w=00000000 ref=…01 sv=…00` |
| R-M2 | `fp32_pkg`: `e_raw` declared before `sign` — a silent bit reinterpretation, no width change | `tb_fields_equiv` | **KILLED**: `w=80000000 ref={1 00 …} sv={0 80 …}` |
| R-M3 | normalize: `ns = right1 ? (s_in **&** sum27[0]) : s_in` (OR→AND) | `tb_norm_equiv` | **KILLED**: `sum=6000000 s=1 ref=…001… sv=…000…` |
| R-M4 | `lzc26` initialised to `5'd25` instead of `5'd26` — off by one, only visible on the all-zero frame | `tb_norm_equiv` | **KILLED**: `ref=800000_…_002 sv=000000_…_001` |
| R-M5 | `q.push_back` → `q.push_front` | `tb_q_stream` | **KILLED** from cycle 2 |
| R-M6 | `q.pop_front` → `q.pop_back` | `tb_q_stream` | **KILLED** from cycle 2 |
| R-M7 | interface DUT's `in_valid` registered one cycle late — a mistimed handshake | `tb_if_stream` | **KILLED** from cycle 2, and the X-bubble skew shows at cycle 4 |
| R-M8 | interface member cross-wired: DUT A's `overflow` port reads `bo.invalid` | `tb_if_stream` | **KILLED AT COMPILE**: `error: Variable 'invalid' cannot have multiple drivers.` |
| R-M9 | shared **stage** module `fp32_normalize` sticky OR→AND | both `tb_if_stream` and `tb_q_stream` | **SURVIVED both** — see below |

R-M8 is worth a note back to the chapter: the mutation I invented to test the
interface bundle was caught by the single-driver rule the chapter documents as
"the one protection that exists". That protection is real and it fires on a
class of bug the chapter does not claim for it.

R-M2 is the one I most expected to survive, since a packed-struct field reorder
is invisible to `$bits`, produces no width warning and compiles silently. It
died on the second directed vector. The equivalence sweep is doing real work.

### Reconciliation with the README's 28 rows

Counted: **28 mutation rows, 24 killed, 4 survivors (S1–S4)** — the arithmetic
is right. I re-ran the five most load-bearing numbers and every one reproduced
*exactly*:

| README row | Claimed | My re-run |
|---|---|---|
| I1 operands swapped | 3 errors in 52,541, first at cycle 21,923 | **3 errors, first at cycle 21,923** ✓ |
| Q1 `p1_s_al <= 1'b0` | 24,246 errors | **24,246** ✓ |
| Q2 `out_valid = vpipe[0]` | 52,570 errors | **52,570** ✓ |
| Q3 `out_valid = 1'b0` | `52570 expectation(s) never retired` / `driven 52570, retired 0` | **byte-identical** ✓ |
| Q4 `out_valid = vpipe[1]\|vpipe[0]` | 59,133 errors, empty-queue guard from cycle 17 | **59,133, first empty-queue at cycle 17** ✓ |

I1 deserves the chapter's praise: three vectors in fifty-two thousand, all NaN
payload-propagation cases, is exactly the kind of kill that a weaker harness
misses.

### Scrutiny of the four survivors

**S1 (interface bench, shared `fp32_add2_p2`) — honestly labeled.** The claim
"this target proves interface wiring is transparent" is stated at exactly the
strength of the evidence, and the survivor is named in the chapter body, not
buried in the README.

**S2 (queue bench, shared *stage* module) — honestly labeled, and yes, this is
chapter 9's masking recurring.** My R-M9 reproduces it: mutating
`fp32_normalize`'s sticky OR changes the pipelined DUT and the combinational
oracle together and cancels. The chapter names the mechanism correctly and cites
chapter 9's "Masking, Measured in Both Directions" for it, and the queue section
states the boundary plainly: "This target checks the pipeline wrapper; the stage
arithmetic is checked by chapter 9's unit suites." That is the right call. Not a
defect.

*One loose forward reference, though.* The interface section says arithmetic is
proven "by the queue scoreboard next door, **where the mutants die**". My R-M9
shows a shared-stage mutant survives the queue bench too. True for the *wrapper*
class of mutant (Q1–Q4 all die), false for the *stage* class. The two sections
are consistent when read together; the forward reference on its own is
over-cheerful and invites the reader to think the queue bench closes the
interface bench's hole entirely. One clause fixes it.

**S3 (`e_lim` differing only at `e_big = 0`) — legitimate.** Out of contract;
the honest restatement offered ("identical on the specified domain, not
identical") is the correct one.

**S4 (`unique` deleted, "killed by the manifest") — the claim is stronger than
its measurement. This is a defect.**

I reproduced the README's variant first: delete `unique` from **both** case
statements, the compile log drops 165 → **0 bytes**, the `warn` row goes red.
That much is true.

Then I ran the mutation a real regression would actually see — `unique` deleted
from the **shipped DUT module alone**, leaving the testbench's own `unique casez`
untouched:

```
R-S4b: unique deleted from fp32_class_flags_sv.sv only
  compile log: 80 bytes   ->  warn row PASSES (mutant survives)
    tb_unique_case.sv:43: vvp.tgt sorry: Case unique/unique0 qualities are ignored.
  testbench:   PASS tb_unique_case (5 labelled codes one-hot, …)
```

**The mutant survives the testbench *and* the manifest.** The 165 bytes are two
separate `sorry` lines from two separate files, and the `warn` contract pins only
"the log is non-empty" — so either keyword alone keeps the row green. The
README's S4 row picks the one variant of the mutation its check catches, and the
chapter generalises from it: "What goes red is the *manifest* … **The
classification is the check.**" That sentence is true only for simultaneous
deletion at both sites.

Is it a bookkeeping trick? Not dishonest — the row states exactly what was done.
But it is presented as a *general* property of the `warn` classification, and it
is not one. The `warn` row detects wholesale removal of every diagnostic-producing
construct in the target; it does not detect per-site removal. Given that this is
the chapter's own example of "the classification is the check", the limit needs
stating. A concrete fix is in Required changes, item 4 — and there is a cheap
code-side strengthening available if the writer wants a real pin.

## Pedagogy

### Does it teach a transition or catalogue a language?

**A transition, decisively.** This is the chapter's best structural decision and
it is made in the second paragraph: "this chapter is not a SystemVerilog
tutorial. It is an **audit**", with one question — take a file this guide
shipped, rewrite it, compile both on the same simulator, measure what changed.
Everything downstream obeys that frame. There is no `class`/`randomize`/UVM
tour, no feature parade. Constructs appear only when a shipped artifact needs
them, and they arrive with a price tag.

The test I apply is: **could this chapter have been written without the previous
twelve?** No. `fp32_fields_sv.sv` is meaningless without chapter 7's field
decode; the queue scoreboard is meaningless without chapter 11's `LAT`-deep
circular buffer to replace; the climax is meaningless without chapter 12's
bin-pinning guard. That is the opposite of a catalogue.

### Is every topic anchored to a shipped artifact the reader has already met?

Near-perfectly. I checked each of the fourteen sections:

| Section | Anchor | Met before? |
|---|---|---|
| Three ledgers | `src/ch07/fp32_fields.v` vs `fp32_pkg.sv` migration wall | ✓ ch7 |
| `logic`/`always_comb` | ch9's normalize stage | ✓ ch9 |
| Two differences | ch3's trap, ch9's function rule | ✓ |
| Packed struct | ch7's decode, ch6's field diagram | ✓ |
| Interfaces | ch11's `fp32_add2_p2` valid pipe | ✓ |
| Queue scoreboard | ch11's circular buffer | ✓ |
| Small conveniences | ch12's `tb_cov4.v`, `cov_names.vh`, ch9's width casts | ✓ |
| `$urandom_range` | ch5's seed rule | ✓ |
| Two-state trap | ch9's `!==`, ch11's X quantification | ✓ |
| Assertions | ch5's `tb_assert.v` | ✓ |
| `unique`/`priority` | ch12's five operand classes | ✓ |
| Coverage | ch12's 105 bins | ✓ |
| Three tiers | all of the above | ✓ |

The one weak anchor is **the small-conveniences bullet list** (`foreach`,
`string`, `.name()`, casts, `++`/`+=`, dynamic arrays). Each names a shipped file
it would improve, which is the right instinct, but none is *demonstrated* on
that file — they are the only claims in the chapter that are told rather than
shown. Given that this is the one place the chapter reads like a feature list, a
single compiled six-line before/after (say `foreach` over `tb_cov4.v`'s bin loop)
would close the gap. Not a defect; the honest thing to note is that the chapter's
own standard is higher than what this section meets.

### Is the ordering right for a reader who has finished chapter 12?

Yes, and the ordering is doing pedagogical work rather than following the LRM's
table of contents. The sequence is: **what the tool actually supports** (the
three ledgers, so the reader knows the terrain) → **the cheap real wins in the
description layer** (`logic`, `always_comb`, packed structs) → **the partial
wins** (interfaces) → **the large wins in the testbench layer** (queues,
assertions) → **the walls** (SVA, covergroups) → **judgement** (three tiers).

Two things about this deserve credit. First, the **three-ledger taxonomy is
introduced before any construct**, and the middle ledger — "accepted and
silently gutted" — is flagged as the dangerous one immediately. That is the
correct thing to burn into a reader's memory and it is placed where it will be.
Second, the chapter **ends the design-layer sections with a recommendation to
leave the RTL alone** and start in the testbench, which is where its own evidence
points. A weaker chapter would have led with `logic` because it is the easiest
thing to teach.

The one ordering question I'd raise: the migration-cost asymmetry (SV files die
below `-g2005-sv`; 2001 sources run everywhere) is stated three times — once at
the end of the ledger section, once in "What to adopt first", once in the traps.
The first statement is the load-bearing one and it lands well. The third is
redundant.

### The covergroup climax, audited word by word

**What the chapter gets right, and it is the hard part.** The brief warned about
a specific overclaim — that covergroups "cannot" do bin-pinning in any
simulator. **The chapter does not make it.** It does three things correctly:

1. It flags the boundary *before* crossing it: "This next paragraph is
   **documentation, not measurement** — no simulator in this environment runs a
   covergroup, so nothing here was executed — but the reading is checkable by
   anyone with the standard." That is exemplary epistemic hygiene.
2. It **concedes the counterfactual**: "Could you build chapter 12's guard around
   a covergroup? In a tool with a coverage database, yes: run the directed
   phase, read every bin's count back through the coverage API, compare against
   the independent model." The claim is thereby narrowed from "impossible" to
   "not a feature; a methodology you build around one" — which is defensible and
   true.
3. It **names the nearest construct honestly**: `illegal_bins` is correctly
   identified as the single definitional check clause 19 offers, correctly mapped
   onto chapter 12's D9 never-bin, and correctly priced ("this bin must stay
   empty" is weaker than "exactly four entries under this stimulus, computed by
   an independent implementation").

**Three phrases in the final paragraph then overclaim, and they undo some of
that care.**

> "the 105-element array, the index arithmetic, **the partition invariants all
> come free as bins and crosses**"

**False, and it is an own-goal.** Chapter 12's partition invariants are
cross-coverpoint count identities — "right1 + none + leftN must equal the
stage-2 sample count per instance; result classes sum to retirements,
retirements to drives". No `bins`, `cross`, `binsof` or `intersect` construct
checks that counts across different coverpoints and sample points sum correctly;
clause 19 counts, it does not reconcile. The partition invariants belong on the
*pinning* side of the chapter's own dividing line, not the counting side.
Conceding them to covergroups weakens the very contrast the paragraph exists to
draw.

> "Verifying bin definitions against an independent model was never a language
> feature **in any language**"

An unbounded universal claim supported by a reading of one clause of one
standard. The chapter has surveyed IEEE 1800 clause 19. It has not surveyed
"any language". This is precisely the claims-stronger-than-measurement pattern
the project keeps catching. Scope it.

> "the one piece of this guide's methodology that no SystemVerilog construct
> replaces is the piece **that was invented here**"

An originality claim the chapter cannot support and does not need. Independent
re-implementation of a model as a cross-check is not novel practice; what is
genuinely notable is that this guide *had to build it* because nothing in the
toolchain supplies it, and then mutation-tested the guard itself. That is a
stronger and safer claim than priority of invention.

> "That is a modest claim stated at full strength: it is documentation about what
> clause 19 offers, plus measurement about what Icarus runs, **and it does not
> depend on either**."

Incoherent as written. The claim manifestly *does* depend on the clause-19
reading — that is the first half of the same sentence. I take the intent to be
"and it does not depend on any simulator upgrading", but as printed the clause
contradicts its own predicate and undercuts the careful sentence in front of it.

Everything else in the climax is well made, including the two-survivors story,
which I verified against chapter 12's "Pinning the Bins: The Last Unpaid Debt" —
m4's mistimed stage qualification, m5's unstraddled boundary, and the reviewer's
third (the `d ≤ 2` → `d ≤ 3` widening) are all accurately reported.

### Is the recommendation section actionable and honest?

**Actionable: yes, unusually so.** The three tiers are each grounded in a number
from this chapter's own runs, and the single-sentence takeaway — "start in the
testbench, start with queues and immediate assertions, and leave the RTL alone
until you have a reason" — is a decision a reader can act on Monday morning. The
"migration cost curve" subsection gives the one fact that decides the RTL
question (one-way door per file) and the one mitigation (convert files you are
already touching, keep the equivalence sweep next to each).

**Honest about what is untestable here: yes, three times.** `which verilator`
returning nothing is stated in the ground rules (line 22), again in Tier 3 with
Vivado/Questa/VCS named, and again in the closing environment note: "no statement
in this chapter about Verilator, Vivado, Questa or VCS is a measurement, and
each is flagged where it appears." I checked every mention and each is flagged
in place. This is exactly right and I have no complaint.

Tier 2's `unique`/`priority` bullet inherits the `priority`-sorry error from the
body (see Measured claims). Otherwise the tiers are accurate.

### The closing checklist, item by item

Twelve items, checked against the body:

| # | Item | Verdict |
|---|---|---|
| 1 | Name the three ledgers, one construct each | ✓ answerable |
| 2 | Why `-g2005-sv`/`2009`/`2012` interchangeable | ✓ |
| 3 | Run `tb_norm_equiv`, account for **both** parts of its output, say which the harness pins | ✓ **best item in the chapter** — it forces the reader to hold "noisy" and "proven" simultaneously, which is the chapter's thesis |
| 4 | Reproduce the self-start probe, explain from ch3's "Sensitivity Lists…" | ✗ **the cited section does not contain the trap** (it is in ch3's "How a Simulator Actually Runs Your Code"). A reader who follows this will not find the explanation |
| 5 | What `always_comb` does not buy, backed by a compile log | ✓ |
| 6 | Why `fp32_fields_sv` uses `assign` and `_svc` uses `always_comb` | ✓ |
| 7 | Draw the interface boundary | ✓ |
| 8 | Point at the latency line in `tb_q_stream.sv` — "and, having failed…" | ✓ **excellent** — verified: the executable code contains no latency constant |
| 9 | Rebuild `tb_assert_live.sv` with `-gno-assertions` and predict | ✓ verified reproducible |
| 10 | What a covergroup replaces/does not; name the closest clause-19 construct | ✓ `illegal_bins` is named in the body |
| 11 | Recount the mutation record: runs, kills, four survivors' reasons | ✓ 28/24/4 all present in README |
| 12 | Describe **the three commands** that settle whether you can use a construct | ✗ **the body never gives three commands.** The closing paragraph gives three *steps* ("write the smallest file, compile it at every level, run it if it compiles"), and "compile the composite" is a fourth thing not among them |

Ten of twelve are clean, and items 3 and 8 are genuinely excellent — both make
the reader do something that can fail. Items 4 and 12 need one-line repairs.

### Could a reader start migrating? What could they not do?

**Yes, and with unusual confidence** — because the chapter gives them a method,
not a list. A reader who absorbed only this chapter could: pick `-g2012` and stop
thinking about levels; convert a testbench scoreboard to a queue and know why the
latency constant disappears; write immediate `assert … else` and know which flag
would silently delete it; rewrite a bit-field module as a packed struct in a
package and know to sweep it against the original before believing it; recognise
the three ledgers and specifically fear the middle one; and — most transferably —
settle any new construct themselves in ninety seconds by compiling it, including
compiling the *composite*.

**What they could not do:** anything in the verification-methodology layer that
this toolchain forbids. No SVA, no covergroups, no constrained-random
`randomize()` with constraint blocks, no class-based testbenches, no UVM, no
virtual interfaces, no clocking blocks, no coverage database. The chapter is
explicit that these are Tier 3 and unmeasurable here, which is honest — but a
reader migrating to a *commercial* simulator will find that this chapter has
taught them the Icarus-shaped subset and given them no working knowledge of the
half of SystemVerilog that motivates most industrial migrations. That is a
correct scoping decision for this guide (it ships only what it can run), and the
chapter says so plainly. Worth one sentence in the bridge acknowledging that the
reader's next simulator will unlock a layer this chapter could only describe —
the Tier 3 paragraph gets close but frames it as absence rather than as a
signpost.

The other genuine gap: **nothing here teaches migration of an existing
multi-file project.** The chapter proves per-file conversion is a one-way door
and recommends converting files you are already touching, but a reader with a
mixed `.v`/`.sv` tree gets no guidance on build organisation, on whether a
Verilog-2001 module can instantiate a SystemVerilog one (it can, and the shipped
targets demonstrate it — `../ch07/fp32_fields.v` compiles beside `fp32_pkg.sv`
in the same `iverilog` invocation), or on package-import scoping across files.
That last point is *demonstrated by every target in the manifest* and never
stated. One sentence would convert an unremarked fact into a transferable rule.

## Craft

### Listings — 13/13 byte-identical ✓

Mechanically checked: I extracted every fenced block tagged `systemverilog`
(there are exactly 13) and searched every `.sv` file in `src/ch13/` for an exact
consecutive-line match.

| Chapter line | Lines | Resolves to | Start line |
|---|---|---|---|
| 72 | 45 | `fp32_normalize_sv.sv` | 29 |
| 149 | 7 | `tb_selfstart.sv` | 16 |
| 214 | 7 | `fp32_pkg.sv` | **25** ✓ ("Line 25 is the `package` keyword") |
| 230 | 17 | `fp32_fields_sv.sv` | 17 |
| 262 | 7 | `fp32_fields_svc.sv` | 32 |
| 291 | 14 | `fp_bundles.sv` | 18 |
| 318 | 1 | `bad_if_port.sv` | **35** ✓ ("Line 35 is this") |
| 326 | 17 | `tb_if_stream.sv` | 25 |
| 381 | 2 | `tb_q_stream.sv` | 52 |
| 386 | 26 | `tb_q_stream.sv` | 79 |
| 498 | 5 | `tb_assert_live.sv` | 44 |
| 506 | 5 | `tb_assert_live.sv` | **51–55** ✓ (`:55` is the deliberate `$error`) |
| 591 | 17 | `cg_cov4.sv` | **16** ✓ ("Line 16 is the `covergroup` keyword") |

Every quoted line number in the prose is correct. So are
`fp32_normalize_sv.sv:57` (the `carry = sum27[26];` line) and
`fp32_class_flags_sv.sv:39` (the `unique case`).

**Nit.** The normalize listing is introduced as "complete from the module header
to `endmodule`, with only the file's header comment omitted". It stops at `end`;
neither `endmodule` nor the trailing `` `default_nettype wire `` appears. The
same elision applies to the `fp32_fields_sv` listing, so it is a consistent house
convention — but the sentence describes something the listing does not do. Fix:
"complete from the module header to the end of the `always_comb`, with only the
file's header comment and the closing `endmodule` omitted".

### Transcripts — all re-captured, abridgements declared

Every quoted simulator transcript I attempted reproduced byte-for-byte: the
`logic` continuous-drive error, the ten normalize sorries, the six struct-decode
sorries with five `:0:`, the self-start two-value line, the delay hard errors,
the interface port errors, the multiple-driver error, the queue-of-struct Sorry,
the four seed lines, the assert-live pair in both flag settings, the
`concurrent_assertion_item` sorry, the cover/assert side-by-side line, the
`unique` sorry, the runtime WARNING with its Time and Scope, and all four PASS
lines. **One abridgement is declared** (cg_cov4's 30-line output) and its
declaration is explicit and in the right place — but its arithmetic is off by
two (see Manifest rows).

### Cross-references — 20 by quoted title, all resolving ✓

I extracted every quoted string from the prose and matched against the header
index of all thirteen chapters. **Exactly 20 distinct external section titles**,
every one resolving to a real `##`/`###` header:

ch02 — "Wires, Variables, and the Lie in the Name `reg`", "Width and Signedness:
The Rules That Will Break Your Adder", "The Toolchain: Directives, System Tasks,
and What Icarus Really Supports". ch03 — "Describing Combinational Logic Three
Ways", "What the Simulator Will and Will Not Tell You", "Sensitivity Lists, and
What `@(*)` Really Covers", "The Accidental Latch", "Blocking and Non-Blocking,
Derived From the Queue". ch05 — "Assertions, and What You Can Actually Run Here".
ch09 — "Composition, and the Golden-Equivalence Sweep", "Normalize, Round, and
the Latch Simulation Cannot See", "Masking, Measured in Both Directions",
"X-Propagation: The Wrong Answer That Looks Right". ch11 — "The Stage Bank:
Chapter 3's Rule, Finally Measured", "The Streaming-Equivalence Harness", "Skew,
and the Other Four: Bugs That Pass a Weaker Harness", "X in the Pipe,
Quantified". ch12 — "Seeds for Chapters 13 and 14", "The Coverage Model: 105 Bins
on the DUT's Own Wires", "Pinning the Bins: The Last Unpaid Debt".

The chapter's claim of 20 is exactly right.

**Backward direction — one fails.** A title resolving is not the same as the
claim being in it. I spot-checked six attributions:

| Attribution | Backward check |
|---|---|
| ch03 "Sensitivity Lists…" ⟶ `@(*)` does not self-start | ✗ **zero occurrences** in that section; the trap is in ch03's "How a Simulator Actually Runs Your Code" (line 212), and ch03's own traps table says so |
| ch09 "Normalize, Round, and the Latch…" ⟶ function-argument rule | ✓ ch09 line 251, inside that section |
| ch12 "Pinning the Bins…" ⟶ boundary 25→60 closed 34/34 silently | ✓ verbatim |
| ch05 "Assertions…" ⟶ the flag semantics | ✗ see Measured claims — the quoted sentence is not in ch05 |
| ch05 "Assertions…" ⟶ 15-construct matrix | ✗ ch05 says "**Ten** constructs" |
| ch02 "The Toolchain…" ⟶ Icarus gates syntax, not system functions | ✓ |

### Positional references — two found

The chapter is 99 % clean, but:

- line 178: "the constant-select `sorry` of **the previous section**" — replace
  with the quoted title, "`logic` and `always_comb`: A Chapter 9 Stage, Rewritten
  and Swept".
- line 441 (mutation table): "**SURVIVED** — see below" — intra-subsection, and
  the paragraph really is immediately below; borderline, and I would leave it.

### Word count

`wc -w guide/chapters/ch13.md` → **11,002**. The record in `STATE.md` and the
review brief both say 10,921 — the figure from before the orchestrator's
`cg_cov4` paragraph was added (+81 words). The chapter does not state its own
word count, so this is a bookkeeping fix in `STATE.md` rather than a chapter
defect, but the number of record should be corrected on close.

### Sources — honest

Five sources, four `[title-only]` per the citation rule, one with a URL that was
re-fetched this session. The framing sentence — "no load-bearing number above
rests on any of them" — is true as far as I can check: every number in the
chapter traces to `src/ch13/` or an earlier chapter's shipped record. The
Icarus-docs quotation is the one external claim doing work, and it is quoted
verbatim and correctly ("When disabled, assertion statements are parsed but
ignored. The supported-assertions option only enables assertions that are
currently supported by the compiler.") — and, importantly, the chapter's
measurement *goes beyond* the documentation rather than merely repeating it,
since the docs do not say that immediate assertions are among those discarded.
Source 1's final clause repeats the chapter-5 misattribution and should be
reworded with it.

Probe counts are internally consistent: "about fifty" in three places against a
52-row shipped matrix. Conservative relative to the research's 66 probe files,
which is the right direction to err.

**Nit.** "about fifty constructs, **each** a compiled-and-run probe at `-g2005`,
`-g2005-sv`, `-g2009` and `-g2012`" — 14 of the 52 rows carry `—` in the
`-g2005` column, i.e. they were not probed there (mostly because the construct
does not exist at that level). "each … at every level the tool offers" is the
claim; "at the levels where the construct exists" is the fact.

**Nit.** Ledger 2 is headed "parse error or `sorry`" and lists associative
arrays, which produce neither — they give `error:` plus `internal error:`. Tier 3
gets this right ("an *internal error*, not even a `sorry`"), so the two passages
disagree slightly. The ledger's substantive point (fails loudly at compile time;
costs features, not correctness) holds either way.

### The `.sv` convention

Documented in three places and consistent across all of them: `targets.txt`'s
header block ("CONVENTION EXTENSION, stated once (precedent: chapter 12's
`.py`/`.vh` note)"), `README.md`'s "What is in this directory", and `STATE.md`'s
harness section (lines 56–61: "`.sv` files in `ch13/` ONLY … The F2 artifact
check must allow `.py`/`.vh` under `ch12/` and `.sv` under `ch13/`, and nowhere
else"). The justification is measured, not asserted — I confirmed independently
that `iverilog -g2005 fp32_pkg.sv` fails exactly as the same text in a `.v` file
does, so the suffix really is documentation for humans. Chapter 5's two SV xfails
correctly stay named `.v`. No complaints.

## Research-note audit

### The writer's five corrections — all five verified genuine

The chapter's writer claims to have corrected five research-note claims by
re-measurement (`src/ch13/README.md` §7). I checked each against
`research/ch13-systemverilog.md` (does the note really say that?) and against the
toolchain (is the correction right?).

**1. The ten `always_comb` sorries include no loop-variable one.** ✓ **Both
halves confirmed.** The notes really do say it, at lines 202–203: "even the loop
variable's implicit `i[31:0]` in the function triggers one, with a mangled
`+i[31:0]` name". My own compile of the shipped `fp32_normalize_sv.sv` gives
exactly ten, breaking down **6 `sum27[26:0]` / 3 `framel[25:0]` / 1
`shl8[7:0]`** — none from the function. The README's explanation (the notes'
`p57` probe used a non-`automatic` function with an `integer` loop variable;
declaring it `automatic` with `for (int i …)` removes it) is a plausible and
correctly-scoped account of the difference. Correction valid.

**2. 500,420 vectors takes 32.3 s here, not the notes' 20.5 s.** ✓ Confirmed by
proportion: my own 300,424-vector sweep of the same two modules took **19.5 s**,
which scales to ~32 s at 500,420 and ~16 s at 250,420 — bracketing both of the
README's figures. The consequent decision (ship 250,420, put the larger sweep in
the README as a reproduction line) is chapter 12's timing-drift rule applied
correctly, and it is the right call for a 60 s `SIM_TIMEOUT`.

**3. "The first post-seed draw" needed disambiguating.** ✓ **Both halves
confirmed.** The notes (line 537) list `1c598438, 38b1fc71, 550a72aa,
7162e8e2 …` as the post-seed draws. My measurement shows `$urandom(seed)` itself
*returns* `00010e00` for seed 1 — the near-linear value chapter 5 recorded — and
`1c598438` is the **next** call. The disambiguation is real and matters, because
it is what turns "discard the first draw" from a fix into a non-fix.

**4. The interface-port diagnostic's second line points at line 1.** ✓ Confirmed:
`bad_if_port.sv:35: syntax error` / `bad_if_port.sv:1: Errors in port
declarations.` The notes (lines 82, 262, 695) quote the two message texts without
positions, so this is a sharpening rather than a contradiction — correctly
described as such.

**5. Five of the six struct-decode sorries carry a mangled `:0:`.** ✓ Confirmed
exactly: six sorries, five printed as `:0:`, and the sixth is
`fp32_fields_svc.sv:37` — which is the `sig = {hidden, w.frac};` line, precisely
as the README says. The notes (line 162) say only "mangled `:0:` file
positions", so "the research says 'some'; measured, it is consistently five" is
a fair characterisation.

**The one "new finding not in the notes"** — a cast's result cannot take a
method — also checks out: `fclass_e'(code).name()` gives `syntax error` /
`error: Malformed statement` at every SV level, and assigning to a typed variable
first works. It is correctly filed as matrix row 51 and correctly generalised
into the chapter's composition rule.

Verdict on the corrections: **five for five, honestly reported, none of them
cosmetic.** This is the part of the writer's process that worked best.

### Six further note claims, spot-checked

| Note claim | My measurement |
|---|---|
| "In every one of the ~40 probes, `-g2005-sv`, `-g2009` and `-g2012` behaved identically" (line 59) | ✓ held across every probe I ran — same exit status, byte-identical text |
| `$urandom_range` works at `-g2005`, bounds respected, reversed args swap | ✓ 1,000 draws all in [10,20]; `$urandom_range(20,10)` → 14 |
| Interface as a module port fails in all three forms | ✓ modport-typed, plain and generic all give `syntax error` / `Errors in port declarations.` |
| Queue of a packed struct is unsupported | ✓ ``Sorry: Queue of type `11netstruct_t` is not yet supported.``, byte-identical |
| Two-state types are genuinely two-state | ✓ `32'hxxxx_xxxx` into `bit [31:0]` reads back `00000000`, silently |
| `always_comb` implements function-body sensitivity | ✓ my own global-reading-function probe: `comb` re-evaluates, `@*` goes stale |

No discrepancies.

### Chapter sharpenings vs the dated notes in ch03/ch05/ch09

`STATE.md`'s chapter-9 block carries the dated propagation note (2026-08-21) and
lists three sharpenings: `always_comb`'s second measured difference (time-zero
self-start, fixing ch03's no-self-start trap); `-gno-assertions` deleting even
fully-supported immediate assertions, "worse than ch05's concurrent-only record";
and `-gsupported-assertions` being the only setting where immediate stays live
while parseable concurrent is discarded.

**All three match the chapter's versions, and all three reproduce.** The chapter
does not overstate any of them relative to the note. The note's parenthetical
caveat — "(ch03's measured claims — no latch warning, silent blocking-in-
`always_ff` — remain true)" — is also honoured: the chapter re-measures both and
confirms them rather than quietly revising chapter 3.

**Two mismatches between the chapter and the chapters of record**, both already
detailed above and both on the chapter-5 side:

- The chapter attributes to ch05 a position ("the flags only control whether the
  `sorry` prints") that ch05 does not hold — ch05 already says the flags "silence
  the diagnostic and discard the property". The *sharpening* recorded in
  `STATE.md` is correctly scoped ("worse than ch05's **concurrent-only** record"),
  so the note is right and the chapter's prose drifted off it.
- The chapter says ch05's matrix was 15 constructs; ch05's text says ten.
  `STATE.md`'s ch05 research block says 15. The chapter cites the research figure
  under the chapter's section title.

Both are chapter-prose defects, not note defects. The research notes and the
dated `STATE.md` propagations are in good order throughout.

## Required changes for a 9+

Blocking first. Items 1–5 must be fixed; 6–8 should be; 9–14 are nits I would
take but would not hold the chapter for. Nothing here requires touching a
shipped `.sv` file except the optional item 4b.

### Blocking

**1. Correct the harness counts in the epistemic-wall paragraph.**
`chapters/ch13.md` line 22. Replace "chapter 13 adds **thirteen** targets and the
full-repo regression stands at **121/121**" with "chapter 13 adds **fourteen**
targets and the full-repo regression stands at **122/122**". Measured this
session: `targets.txt` has 14 rows (5 run / 3 warn / 6 xfail);
`bash run_all.sh ch13` → 14/14; `SIM_TIMEOUT=120 bash run_all.sh` → 122/122,
EXIT=0. `STATE.md` already carries the right figures — only the chapter is stale.
*Rank 1 because it is a false measured number inside the paragraph that asks the
reader to trust every other measured number.*

**2. Remove the fabricated chapter-5 quotation (three sites).**
The sentence *"only control whether the `sorry` prints; they enable nothing"* is
not in chapter 5. Chapter 5 (line 373) says: "They are worse than useless: they
enable nothing, and where the parser *can* read the syntax they **silence the
diagnostic and discard the property**."

- `chapters/ch13.md` "The four-way grid…", first consequence. Rewrite as:
  *"**First**, chapter 5 already measured that these flags 'silence the
  diagnostic and discard the property' for concurrent assertions, and that
  'enable nothing' is right — no flag makes SVA work. What chapter 5 did not
  test is what they do to the assertions Icarus **does** support, and there the
  three flags differ: `-gsupported-assertions` keeps immediate assertions alive
  while letting a file containing parseable concurrent text compile, by
  discarding those items in silence. It is the only setting under which
  chapter 5-style immediate assertions and an SVA-bearing file coexist…"*
- `chapters/ch13.md` Sources item 1: delete "chapter 5's 'it only controls the
  diagnostic' reading was folklore, and this chapter's measurement is the
  correction"; replace with "the documentation therefore corroborates chapter 5's
  measured discard, and this chapter's addition is that immediate assertions are
  discarded too — which the documentation does not say."
- `src/ch13/README.md` §7, final paragraph: same replacement.

The substantive finding survives intact and is *stronger* stated this way,
because the new result is genuinely new rather than a correction of a
straw position.

**3. Fix the `priority case` sorry claim (two sites).**
Measured: an isolated `priority case` compiles with a **zero-byte** log; only
`unique`/`unique0` emit `vvp.tgt sorry: Case unique/unique0 qualities are
ignored.` Both still produce the runtime warning.

- Body, "`unique` and `priority`: half a feature": change "Every
  `unique`/`priority case` adds a `sorry` to the compile log" to "Every
  `unique`/`unique0 case` adds a `sorry` to the compile log — `priority case`
  does not, though it produces the same runtime warning".
- Tier 2 bullet: change "each case statement costs a `sorry` in the compile log"
  to "each `unique` case statement costs a `sorry` in the compile log;
  `priority` is free of it".

(README row 26 is already correct and needs no change.)

**4. State the limit of the S4 "the classification is the check" claim.**
Measured: deleting `unique` from **the DUT module alone** leaves the compile log
at **80 bytes** — the testbench's own `unique casez` sorry still fires — so the
`warn` row stays green *and* the testbench passes. The mutant survives
everything. The README's S4 row and the chapter's sentence both silently depend
on deleting both keywords at once.

- 4a (required, prose): in the body, after "The classification is the check.",
  add: *"With a caveat the mutation record makes explicit: the `warn` contract
  pins only that the log is **non-empty**, and this target's 165 bytes are two
  sorries from two files. Delete `unique` from the module alone and the
  testbench's own sorry keeps the row green — measured. The classification
  catches wholesale removal, not per-site removal."* Mirror this in
  `src/ch13/README.md`'s S4 paragraph.
- 4b (optional, code): if a real per-site pin is wanted, split the target — move
  the overlap probe's `unique casez` into its own file so the module's sorry is
  the only diagnostic on the `fp32_class_flags_sv` row. Then a single-site
  deletion does drop the log to zero. Cheap, and it converts a caveat into a
  guard.

**5. Repair the climax's four overclaiming phrases** (`chapters/ch13.md`, "So the
honest summary…" paragraph). The surrounding argument is sound and well-flagged;
these are word-level fixes.

- "the 105-element array, the index arithmetic, **the partition invariants all
  come free as bins and crosses**" → **delete the partition invariants from this
  list.** They are cross-coverpoint count identities; no clause-19 construct
  reconciles counts across coverpoints. Suggested: "…would shrink the
  **counting** substantially — the 105-element array and the index arithmetic
  come free as bins and crosses. It would not touch the **pinning**, and it would
  not touch the partition invariants either, which are count identities across
  coverpoints rather than bins."
- "was never a language feature **in any language**" → "is not a feature of
  clause 19, and this chapter has not found it offered as one anywhere it has
  looked".
- "the piece **that was invented here**" → "the piece this guide had to build for
  itself".
- "and **it does not depend on either**" → either delete the clause or make the
  intent explicit: "and neither half would change if a simulator here started
  running covergroups tomorrow".

Also propagate the scoping to the chapter's opening summary (line 20), which
says the climax "was never a language feature to begin with".

### Should fix

**6. Re-attribute the `@(*)` no-self-start trap to the right chapter-3 section
(three sites).** Measured: ch03's "Sensitivity Lists, and What `@(*)` Really
Covers" (lines 364–438) contains zero occurrences of the trap; it is in ch03's
**"How a Simulator Actually Runs Your Code"** (line 212), and ch03's own traps
table (line 837) attributes it there. Fix in: the chapter body ("Difference one"),
checklist item 4, and `src/ch13/tb_selfstart.sv`'s header comment.

**7. Correct chapter 5's matrix size (two sites).** Chapter 5's text says "Ten
constructs, four language levels". Change "It did that for fifteen
assertion-related constructs" and "drew this boundary from a 15-construct matrix"
to **ten**. (Fifteen is the research figure in `STATE.md`; the chapter of record
says ten, and the cross-reference points at the chapter.)

**8. Reconcile the two covergroup-xfail sentences with `cg_cov4.sv`'s
existence.** The chapter now ships its own covergroup xfail, so "cross-referenced
rather than duplicated" and "chapter 5's `bad_covergroup.v` … remains the pinned
record" need a clause. Suggested, in the coverage section: *"Chapter 5's
`bad_covergroup.v` pins the minimal case and remains the record for it; this
chapter ships `cg_cov4.sv` because the listing above must have a file behind it,
and because a three-coverpoint model with a `cross` is what chapter 12 would
actually need. Both are `xfail` targets, so either one going green tells the
regression the parser has changed."* And amend "the third SystemVerilog parse
wall" accordingly.

### Nits

**9.** Add the latency-mutation experiment as a README reproduction line. I ran
it and it is the single most persuasive evidence the chapter has: deepen
`fp32_add2_p2` to three stages, run `tb_q_stream.sv` **unedited**, get `PASS …
max queue depth 4 = measured latency + 1`; run ch11's `tb_stream.v` on the same
DUT and get `FAIL tb_stream cyc 2: … retired out_valid=0, expected 1`. Currently
the "measures rather than asserts" claim is argued; this makes it demonstrated.

**10.** cg_cov4 abridgement arithmetic: "(28 further lines…)" should be
**26** (30 total, four shown). Also drop "one pair per construct inside" — lines
20→23 and 25→27 break the pairing. Suggested: "(26 further lines; the parser
reports the covergroup body line by line before giving up)".

**11.** The normalize listing is introduced as "complete from the module header
to `endmodule`" but stops at `end`. Reword to "…to the end of the `always_comb`,
with the header comment and the closing `endmodule` omitted".

**12.** Positional reference at line 178: "the constant-select `sorry` of **the
previous section**" → name it by quoted title, "`logic` and `always_comb`: A
Chapter 9 Stage, Rewritten and Swept".

**13.** Two small precision fixes: (a) "about fifty constructs, **each** a
compiled-and-run probe at `-g2005`, `-g2005-sv`, `-g2009` and `-g2012`" — 14 of
the 52 rows carry `—` at `-g2005`; say "at every level where the construct
exists". (b) Ledger 2 is headed "parse error or `sorry`" but lists associative
arrays, which give `error:` + `internal error:` — Tier 3 says so correctly;
widen the ledger heading to "rejected at compile time, loudly".

**14.** Two attribution softenings, both one clause: (a) chapter 5's seed rule is
quoted as "seed once per run **and discard the first draw**"; ch05 writes "Seed
once per run, print the seed, throw the first draw away" — quote it or drop the
quote marks. (b) "Chapter 5's matrix ticks immediate `cover`" reads as a
correction; ch05 line 398 already says immediate `cover` "produces nothing at
all". Add "as chapter 5 already noted" and keep the genuinely new part — that the
*pass statement* specifically never executes.

**15.** Checklist item 12 asks for "the three commands"; the body gives three
*steps* and a fourth idea (compile the composite). Either enumerate three actual
commands in the closing paragraph, or reword the item to "the three steps … and
say why compiling the *composite* is a necessary fourth".

**16.** Interface section: "the queue scoreboard next door, **where the mutants
die**" — measured, a shared-*stage* mutant survives the queue bench too (that is
S2). True for the wrapper class. Add "where the wrapper mutants die".

**17.** Bookkeeping, not a chapter edit: `STATE.md`'s word count of record for
ch13 is 10,921; `wc -w` now gives **11,002** after the `cg_cov4` paragraph.

**18.** Two one-sentence pedagogical additions I would take (see Pedagogy): state
that a Verilog-2001 module and a SystemVerilog package compile in the same
`iverilog` invocation — every target in the manifest demonstrates it and the
chapter never says it, though it is the fact that makes incremental migration
possible; and add a clause to the bridge acknowledging that a commercial
simulator unlocks the Tier-3 layer this chapter could only describe.

## Tree restoration proof

All mutation and probe work was done on copies inside the session scratchpad
(`…/scratchpad/w/`, `…/scratchpad/w/mut/`, `…/scratchpad/w/lat3/`). Nothing in
`guide/src/` was edited at any point; the mutation workspace was populated by
`cp` from the source tree and every in-place `sed`/python edit inside it operated
on those copies, each with a `.bak` restored immediately afterwards.

**Baseline, taken before any work:**

```
$ cd /home/user/erancihan/guide/src && find . -type f | sort | xargs sha256sum > src-baseline.sha256
$ wc -l src-baseline.sha256
214 src-baseline.sha256
$ sha256sum src-baseline.sha256
732f346960bfa93c8dea81c9a295059a190bfce9b13477eebde3f6f04389d1ca  src-baseline.sha256
```

**After all review work:**

```
$ cd /home/user/erancihan/guide/src && find . -type f | sort | xargs sha256sum > src-after.sha256
$ diff src-baseline.sha256 src-after.sha256
(no output)
$ sha256sum src-after.sha256
732f346960bfa93c8dea81c9a295059a190bfce9b13477eebde3f6f04389d1ca  src-after.sha256
```

**214 files, 0 differing.** The two manifests hash identically, which proves the
whole tree is byte-for-byte as it was found.

**Regression on the restored tree:**

```
$ SIM_TIMEOUT=120 bash run_all.sh
  passed: 122
  failed: 0
EXIT=0
```

**Working tree:**

```
$ git status --porcelain
?? guide/reviews/ch13-review.md
```

The only change to the repository is this review file. No modified or deleted
paths, no stray build artifacts in `guide/src/`, and `guide/chapters/ch13.md`,
`guide/research/ch13-systemverilog.md` and `guide/STATE.md` are all untouched —
the required changes above are recommendations for the writer, not edits I made.

---

## Post-fix verification — 2026-08-21

The coordinator applied all five blocking items, all three should-fixes and
nits 9–18. I re-verified every one at its site, re-ran the mechanical checks and
re-ran the regression. **Nothing was taken on trust.**

### Final score: **9 / 10 — fit to ship, nits only.**

All five blocking defects are genuinely repaired, not papered over. Three
copy-edit slips introduced by the fix pass remain (listed below); each is a
doubled or dangling clause, none is a false claim or an unreproducible
measurement, and all three are one-line sweeps. A 10 wants them swept and one
half-applied nit finished.

### Blocking items — all five verified fixed

| # | Site | Verified |
|---|---|---|
| 1 | ch13.md:22 | "chapter 13 adds **fourteen** targets and the full-repo regression stands at **122/122**" ✓ — matches my re-run exactly (14/14 and 122/122, EXIT=0) |
| 2 | ch13.md:556 | The fabricated quotation is gone. Now: *"chapter 5 already measured that these flags 'silence the diagnostic and discard the property' for concurrent assertions, and that they 'enable nothing' — no flag makes SVA work. What chapter 5 did not test is what they do to the assertions Icarus **does** support…"* ✓ Both quoted fragments are verbatim in ch05 line 373. The new finding is now framed as new, which is what it is |
| 2 | README §7 | Reworded cleanly, no residue ✓ |
| 2 | ch13.md Sources 1 | Reworded — **but a doubling was left in**, see below |
| 3 | ch13.md:585 | "Every `unique`/`unique0 case` adds a `sorry` … `priority case` does not, though it produces the same runtime warning" ✓ matches my measurement (priority = 0-byte log, unique = 155/165 bytes) |
| 3 | ch13.md:668 | Tier 2 bullet: "each `unique` case statement costs a `sorry` … and `priority` is free of it" ✓ |
| 4a | ch13.md:585 + README:450 | The caveat is stated in both places with my measured number: "Delete `unique` from the module alone and the testbench's own sorry keeps the row green **at 80 bytes** — measured. The classification catches wholesale removal, not per-site removal." ✓ |
| 5 | ch13.md:647 | All four climax phrases repaired **exactly as prescribed** ✓ — partition invariants moved off the "come free" list and correctly reassigned as "count identities *across* coverpoints rather than bins"; "in any language" → "is not a feature of clause 19, and this chapter has not found it offered as one anywhere it has looked"; "invented here" → "the piece this guide had to build for itself"; "does not depend on either" → "neither half would change if a simulator here started running covergroups tomorrow" |
| 5 | ch13.md:20 | Opening summary rescoped to "because clause 19 does not offer it" ✓ |

The climax now says exactly what its evidence supports, and it still says it at
full strength. That paragraph is the best-calibrated passage in the chapter.

### Should-fixes — all three verified

- **6.** The `@(*)` no-self-start trap is re-attributed to chapter 3's **"How a
  Simulator Actually Runs Your Code"** at all three sites (ch13.md:149,
  ch13.md:710 checklist item 4, and `src/ch13/tb_selfstart.sv`:6) ✓. Zero
  residual references to "Sensitivity Lists…" remain, and I confirmed the trap
  really is in the newly-cited section (ch03 line 212, corroborated by ch03's own
  traps table at line 837).
- **7.** ch05's matrix size is **ten** at both sites (ch13.md:26 and :487) ✓ —
  matching ch05's own text.
- **8.** Both covergroup-xfail sentences reconciled with `cg_cov4.sv` ✓.
  ch13.md:324 now reads "one of the SystemVerilog parse walls this guide pins,
  alongside chapter 5's `bad_sva.v` and `bad_covergroup.v` … and this chapter's
  own `cg_cov4.sv`", and :631 carries the prescribed wording ending "either one
  going green tells the regression the parser has changed."

### Nits 9–18

Applied and verified: **9** (latency-mutation reproduction block at README:200,
correctly credited and matching my measured outputs), **10** (26 further lines,
pairing claim dropped), **12** (zero positional references remain — I re-scanned),
**13a** ("at every level where the construct exists"), **13b** (Ledger 2 now
"rejected at compile time, loudly"), **14a** (the ch05 seed rule is now
paraphrased without quote marks and correctly includes "printing the seed"),
**15** (checklist item 12 now asks for three *steps* plus "a necessary fourth"),
**16** ("where the **wrapper** mutants die"), **18** (both additions — the
mixed-language compile fact is now ch13.md:28 and is well placed, and the
bridge at :728 carries the commercial-simulator caveat).

**14b is half applied.** The acknowledgement that chapter 5's text already says
immediate `cover` "produces nothing at all" is present at ch13.md:43 (the
Ledger-3 bullet, the more prominent site) but not at :560, where the "Third"
consequence still opens "chapter 5's matrix ticks immediate `cover`" with no such
clause. Worth one clause for symmetry; not worth holding the chapter.

### Three copy-edit slips introduced by the fix pass

None is a false claim. All three are doubled or dangling clauses where new text
was inserted without deleting the old.

1. **ch13.md, Sources item 1 — doubled clause.** Currently: *"The documentation
   therefore *does* say that `-gno-assertions` discards parsed assertions; **the
   documentation therefore corroborates** chapter 5's measured discard, and this
   chapter's addition is that immediate assertions are discarded too…"* The
   first clause is the old text and should be deleted, leaving: *"The
   documentation therefore corroborates chapter 5's measured discard, and this
   chapter's addition is that immediate assertions are discarded too — which the
   documentation does not say."* (The README's version of this same sentence is
   already clean, and can be copied.)
2. **ch13.md:72 — doubled clause.** Currently: *"complete from the module header
   to the end of the `always_comb`, **with the closing `endmodule` omitted, with
   only the file's header comment omitted**"*. Merge to: *"…to the end of the
   `always_comb`, with only the file's header comment and the closing
   `endmodule` omitted"*.
3. **ch13.md:585 — dangling relative pronoun.** *"Every `unique`/`unique0 case`
   adds a `sorry` to the compile log — `priority case` does not, though it
   produces the same runtime warning, **which makes it a `warn` row** under this
   project's rules."* The "which" now attaches to the runtime warning or to
   `priority case` rather than to the sorry. Suggested: *"Every
   `unique`/`unique0 case` adds a `sorry` to the compile log, which makes any
   target containing one a `warn` row under this project's rules; `priority case`
   does not emit the sorry, though it produces the same runtime warning."*

### Item 4b — decline accepted

The coordinator declined splitting the `tb_unique_case` target and cited ch12's
D9 acceptance as precedent for documenting a measured limit rather than
restructuring green, reviewed code late in a chapter's life. **I agree, and I
withdraw the suggestion.** Two reasons beyond the precedent. First, the caveat is
now stated twice with the measured 80-byte number, which converts an unstated
hole into a documented limit — the thing that made S4 a defect was the silence,
not the hole. Second, the property a per-site pin would protect is *authorial
intent* (that `unique` is still written in the DUT), not a correctness property
of the design; nothing about the hardware changes when the keyword goes. That is
a much weaker case for a hard regression pin than, say, the equivalence sweeps,
and it does not justify perturbing a passing target. Keep the target as it is.

### Mechanical re-verification after the edits

| Check | Result |
|---|---|
| `bash run_all.sh ch13` | **14/14**, EXIT=0 |
| `SIM_TIMEOUT=120 bash run_all.sh` | **122/122**, EXIT=0, cold |
| Listings byte-identical | **13/13** ✓ (re-extracted and re-matched against `src/ch13/*.sv`) |
| Distinct external quoted cross-references | **20**, all resolving to real headers ✓ (the set changed — "Sensitivity Lists…" out, "How a Simulator Actually Runs Your Code" in — and the count is unchanged) |
| Positional references | **0** ✓ |
| `guide/src/` tree | 214 files, **0 differing** before/after my verification; SHA-256 manifests hash identically |
| `git status --porcelain` | clean |

### Word count of record — use **11,361**

The coordinator reports 11,510. **My measurement is 11,361**, and it is stable
three ways:

```
$ wc -w guide/chapters/ch13.md            11361
$ cat guide/chapters/ch13.md | wc -w      11361
$ git show HEAD:guide/chapters/ch13.md | wc -w   11361
```

The committed file at `HEAD` (8cdbd7a) is 11,361 words. Since I was asked to
supply the number of record, **11,361** is it, and `STATE.md` should record that
rather than 11,510 — the 149-word gap is presumably a count taken mid-edit.

### Closing

Chapter 13 goes from 7 to **9**. The five blocking defects were all defects of
*claim*, and all five are now stated at exactly the strength of their evidence —
which is the standard this project has been holding since chapter 2. The
engineering never needed touching and still does not: every measurement I made
in round 1 reproduced again after the edits, and the chapter's strongest result
(a scoreboard that measures the latency it was never told) is now demonstrated in
the README rather than merely argued. Sweep the three copy-edit doublings and
finish nit 14b and this is a 10.
