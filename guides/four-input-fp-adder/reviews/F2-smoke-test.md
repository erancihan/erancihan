# F2 — Final smoke test

<!-- sections complete: 15/15 -->

Adversarial verification that the shipped code in `guide/src/` is exactly what
`guide/guide.md` says it is. Nothing below is taken on the word of a chapter.

## 1. Scope, method, environment, and baseline integrity

**Date:** 2026-08-21. **Agent:** F2 (final smoke test). **Posture:** adversarial —
no claim in `guide.md`, `STATE.md` or any `src/chNN/README.md` was accepted
without an independent run.

### Environment, measured not assumed

```
$ iverilog -V | head -1
Icarus Verilog version 13.0 (stable) (v13_0-dirty)
$ python3 -V
Python 3.11.15
$ bash --version | head -1
GNU bash, version 5.2.21(1)-release (x86_64-pc-linux-gnu)
$ nproc
4
```

The 13.0 requirement is real and load-bearing: `STATE.md` records that Ubuntu's
packaged 12.0 lacks `$shortrealtobits`/`$bitstoshortreal` and fails six targets.
This machine has 13.0, so that hazard is not in play here. The `-dirty` suffix is
a build-tree marker from the source build, not a modified simulator.

### Baseline: proving nothing under `guide/` was disturbed

Before any work, SHA-256 baselines were taken of the entire tree:

```sh
cd /home/user/erancihan/guide/src && find . -type f | LC_ALL=C sort | xargs sha256sum > $SP/baseline-src.sha256
cd /home/user/erancihan/guide     && find . -type f | LC_ALL=C sort | xargs sha256sum > $SP/baseline-guide.sha256
```

- `guide/src`: **217 files**, manifest digest
  `e6e6575cba3ab2dc17aca0cddead097f18408f17db008fe89e43946838716b3a`
- `guide/` overall: 273 files.

All destructive work (mutations, regeneration, contract tests) was done on
**copies in the scratchpad**, never in the tree. Section 13 proves restoration.

### What "PASS" means in this report

A battery item is PASS only if a command was run and its output was read. Where
the guide states a number, this report either reproduces that number or records
the number it actually got.

**Verdict: PASS** (environment is the one the guide specifies; baselines taken).

## 2. Item 1 — Cold full regression, run twice

```sh
cd /home/user/erancihan/guide/src && SIM_TIMEOUT=120 bash run_all.sh
```

| run | result | exit | wall clock |
|---|---|---|---|
| 1 (cold) | **passed: 123, failed: 0** | 0 | **216.29 s** |
| 2 (immediately after) | **passed: 123, failed: 0** | 0 | **218.04 s** |

`diff` of the two logs (WALL line excluded) is empty — the two runs are
byte-for-byte identical in every PASS line and in target order.

### Per-chapter breakdown

Measured with an instrumented mirror of `run_all.sh` (same contracts, same
`perl`/`alarm` shim, per-target timing added) so the harness's own verdict was
never the source of the timing numbers:

| chapter | targets | compile (s) | simulate (s) | total (s) |
|---|---|---|---|---|
| ch02 | 27 | 0.27 | 0.31 | 0.58 |
| ch03 | 20 | 0.20 | 0.19 | 0.39 |
| ch04 | 14 | 0.14 | 0.14 | 0.28 |
| ch05 | 12 | 0.12 | 1.36 | 1.48 |
| ch06 | 5 | 0.05 | 0.54 | 0.59 |
| ch07 | 4 | 0.04 | 0.07 | 0.11 |
| ch08 | 4 | 0.04 | 0.86 | 0.90 |
| ch09 | 6 | 0.07 | 23.01 | 23.08 |
| ch10 | 3 | 0.07 | 38.70 | 38.77 |
| ch11 | 8 | 0.13 | 67.98 | 68.11 |
| ch12 | 5 | 0.12 | 53.43 | 53.55 |
| ch13 | 14 | 0.16 | 23.65 | 23.81 |
| ch14 | 1 | 0.02 | 5.05 | 5.07 |
| **all** | **123** | **1.43** | **215.29** | **216.72** |

Row types across the 123: **102 `run`, 10 `warn`, 11 `xfail`**. Compilation is
essentially free — Icarus builds the 14-file `tb_cov4` target in 21 ms — so the
regression is 99.3 % simulation, concentrated in chapters 9-13.

### Determinism, tested harder than the harness tests it

`run_all.sh` prints only verdicts, so identical harness logs prove very little.
The instrumented mirror was therefore run **twice more**, capturing every
target's full stdout (49,271 bytes across 123 files), and the two captures were
compared file by file:

```
targets whose simulation output differed between runs: 0 / 123
```

Every `$random`/`$urandom` stream, every mismatch census, every bin count and
every seed echo is byte-identical across independent runs. The guide's
determinism claim holds at the strongest level available.

Also checked: **all 112 `run`/`warn` targets emit an affirmative `PASS` token.**
The only 11 targets with empty stdout are exactly the 11 `xfail` rows, which
never simulate. So no green verdict in this suite rests solely on the absence of
the string `FAIL`.

**Verdict: PASS.** 123/123, exit 0, twice, with byte-identical simulation output.

## 3. Item 2 — Harness audit and contract tests

Every chapter's green verdict rests on `run_all.sh`, so the harness was read line
by line and then **tested with deliberately-wrong targets** in a scratch chapter
directory (`$SP/contract/ch99`, with a copy of `run_all.sh` beside it, so the
real tree was never involved).

### What the code actually does

- `run`: compile must succeed **and** produce a zero-byte log (`elif [ -s
  "$clog" ]` → FAIL). Then `vvp` under a `perl`/`alarm` shim; rc 124 → timeout
  FAIL; rc ≠ 0 → FAIL; rc 0 with `grep -qE '(^|[^A-Za-z])FAIL'` matching → FAIL.
- `warn`: identical, except the compile log must be **non-empty**
  (`if [ ! -s "$clog" ]` → FAIL). The simulation checks still apply.
- `xfail`: compile must fail; the target never simulates.
- Build products go to `mktemp -d`, removed by an `EXIT` trap. `vvp` runs with
  cwd = the chapter directory, so a testbench that wrote a file *would* dirty the
  tree — section 5 shows none does.

### Contract tests (each row is one run of the real harness)

| # | manifest row | must be | observed | harness message |
|---|---|---|---|---|
| A | `run   : warny.v tb_warny.v` (warning-emitting) | FAIL | **FAIL** | `compile warnings:` |
| B | `warn  : ok.v tb_ok.v` (silent module) | FAIL | **FAIL** | `expected compile warnings, compiled silently:` |
| C | `xfail : ok.v tb_ok.v` (compiles fine) | FAIL | **FAIL** | `compiled but should NOT have:` |
| D | `run   : ok.v tb_ok.v` (control) | PASS | **PASS** | — |
| E | `warn  : warny.v tb_warny.v` (control) | PASS | **PASS** | — |
| F | `xfail : broken.v` (control) | PASS | **PASS** | `(xfail as expected)` |
| G | `run   : hang.v` (never terminates) | FAIL | **FAIL** | `simulation hung (killed after 8s):` |
| H | `run   : tb_saysfail.v` (prints FAIL, exits 0) | FAIL | **FAIL** | `testbench reported a failure:` |
| I | `run   : broken.v` (does not compile) | FAIL | **FAIL** | `compile error:` |
| J | `warn  : warny.v tb_warnfail.v` (warns **and** prints FAIL) | FAIL | **FAIL** | `testbench reported a failure:` |

**All ten contracts hold.** Exit status was also checked directly: a failing
target gives `exit=1`, a clean one `exit=0`. Row J matters most — it proves a
`warn` row is not a blanket exemption; it still runs the full simulation gate.

### Three real weaknesses in the harness (none exploited — see section 4)

These are not defects in the shipped guide; they are places where the harness
would not notice a future mistake. All were demonstrated, not reasoned about.

- **H1 — an `xfail` row naming a file that does not exist PASSES.**
  `xfail : no_such_file.v` → `PASS (xfail as expected)`, `passed: 1 failed: 0`,
  exit 0. The harness cannot distinguish "failed to compile for the intended
  reason" from "the file is gone". *Mitigation as shipped:* section 4 proves all
  11 `xfail` rows name files that exist, and section 3's own error capture shows
  each fails for its stated reason.
- **H2 — a chapter with no `targets.txt` is silently skipped and the suite still
  exits 0.** `SKIP ch99 (no targets.txt)` … `passed: 0 failed: 0`, exit 0. There
  is **no expected-total assertion anywhere**: deleting `ch12/targets.txt` would
  turn 123/123 into a green 118/118. The count 123 lives only in prose.
- **H3 — a `run` row with no testbench passes silently.** `run : ok.v`
  elaborates a DUT with no stimulus, prints nothing, exits 0 → `PASS`. The
  harness gates on *absence of FAIL*, not on presence of a verdict. *Mitigation
  as shipped:* all 112 simulating targets print `PASS` (section 2).

An empty manifest likewise yields `passed: 0 failed: 0`, exit 0.

### The 11 `xfail` targets fail for their stated reasons

The harness accepts any compile failure, so each was compiled by hand and its
first diagnostic read:

| target | first diagnostic |
|---|---|
| `ch02 align_sticky.v bad_align_shw.v` | `FATAL: align_sticky.v:52: … SHW is too narrow to express W+2` (elaboration-time guard) |
| `ch02 bad_nettype_none.v` | `error: Net godo is not defined in this context.` |
| `ch03 bad_zerodelay.v` | `error: always process does not have any delay.` |
| `ch05 bad_sva.v` | `syntax error` + `Error in property_spec of concurrent assertion item.` |
| `ch05 bad_covergroup.v` | `syntax error` + `Invalid module item.` |
| `ch13 bad_if_port.sv` | `syntax error` + `Errors in port declarations.` |
| `ch13 bad_enum_cast.sv` | `error: This assignment requires an explicit cast.` |
| `ch13 bad_assoc.sv` | `error: Type names are not valid expressions here.` |
| `ch13 bad_qstruct.sv` | `Sorry: Queue of type …netstruct_t is not yet supported.` |
| `ch13 bad_comb_delay.sv` | `error: a blocking delay is not allowed in an always_comb …` |
| `ch13 cg_cov4.sv` | `syntax error` + `Invalid module item.` (no covergroup support) |

Every one matches the teaching point its filename advertises.

**Verdict: PASS.** All three manifest contracts hold under adversarial test.
Three non-blocking harness weaknesses recorded (H1-H3), none of them reachable
from the shipped tree.

## 4. Item 3 — Manifest reachability: no orphans, no missing files

A python checker (`$SP/reach.py`) parsed all 13 manifests with the *same* field
splitting `run_all.sh` uses (`expect = ${line%%:*}`, `files = ${line#*:}`), then
cross-checked both directions against the filesystem.

```
total manifest rows: 123
by expect: run 102, xfail 11, warn 10
per chapter: ch02 27, ch03 20, ch04 14, ch05 12, ch06 5, ch07 4, ch08 4,
             ch09 6, ch10 3, ch11 8, ch12 5, ch13 14, ch14 1

MISSING from disk but in a manifest:            NONE
ON DISK but not in any manifest row (.v/.sv):   0
non-file tokens in manifests (stray flags):     none
```

- **178 compilable sources** (158 `.v` + 20 `.sv`) exist on disk; **every one is
  named by at least one manifest row.** There are no orphaned files claiming to
  be shipped code.
- **Every path named in a manifest exists**, including the cross-chapter
  `../chNN/…` references (ch06→ch02, ch08→ch02, ch09→ch02/07/08, ch10→ch02/07/09,
  ch11→ch02/07/09/10, ch12→ch02/07/08/09/10/11, ch13→ch02/07/09/11,
  ch14→ch02/07/09/10). This closes harness weakness **H1** for the shipped tree:
  no `xfail` row is passing because its file vanished.
- The five `.vh` files are not manifest rows because they are `` `include ``d;
  each was traced to its includer:

  | `.vh` | included by |
  |---|---|
  | `corner_count.vh`, `corner_list.vh` | `ch12/tb_corners12.v` |
  | `cov_dirlist.vh`, `cov_names.vh`, `cov_pins.vh` | `ch12/tb_cov4.v` |

- The four `.py` files are documented in `ch12/README.md` as sources, not build
  products; `corner_gen.py` and `cov_gen.py` are exercised in section 6, and
  `hwmodel.py`/`oracle.py` are exercised in section 9.
- No duplicate manifest rows anywhere; every manifest ends with a newline
  (`0a`), so the `while read` loop cannot drop its last target.
- The chapter row counts reconcile with the total exactly: 27+20+14+12+5+4+4+6+3
  +8+5+14+1 = **123**.

**Verdict: PASS.** No orphans, no missing files, counts reconcile.

## 5. Item 4 — The artifact rule

```sh
find /home/user/erancihan/guide/src -type f
```

**217 files, and every one is permitted:**

| extension | count | where | allowed? |
|---|---|---|---|
| `.v` | 158 | ch02-ch12, ch14 | yes |
| `.sv` | 20 | **`ch13/` only** | yes (documented ch13 extension) |
| `targets.txt` | 13 | one per chapter | yes |
| `README.md` | 13 | one per chapter | yes |
| `.vh` | 5 | **`ch12/` only** | yes (documented ch12 extension) |
| `.py` | 4 | **`ch12/` only** | yes (documented ch12 extension) |
| `.hex` | 2 | `ch04/` (`vectors.hex`, `vectors_bad.hex`) | yes |
| `Makefile` | 1 | `ch04/` | yes |
| `run_all.sh` | 1 | `src/` root | yes |

**Zero violations.** All 13 `.txt` files are `targets.txt`; all 13 `.md` files
are `README.md`. The scoping holds exactly as `STATE.md` requires: no `.sv`
outside `ch13/`, no `.py` or `.vh` outside `ch12/`. `ch13/` contains **no** `.v`
files at all and `ch12/` contains six.

### No build artifacts, after five full builds of the tree

The tree was re-hashed after two `SIM_TIMEOUT=120` regressions, two instrumented
passes, one `SIM_TIMEOUT=60` regression, the contract tests, the by-hand `xfail`
compiles, the mutation battery and the regeneration:

```sh
cd guide/src && find . -type f | LC_ALL=C sort | xargs sha256sum | diff - $SP/baseline-src.sha256
```

→ **empty diff. `guide/src` is byte-identical to its pre-work baseline.**

Directory listing is also unchanged (13 chapter directories, no `__pycache__`,
no `build/`, no `obj_dir/`). A scan for `*.vvp`, `*.vcd`, `*.fst`, `*.out`,
`a.out`, `*.log` and `__pycache__` anywhere under `guide/` returns nothing. Two
mechanisms make this hold: the harness builds into `mktemp -d` under an `EXIT`
trap, and every waveform-capable testbench gates `$dumpfile` behind a `+dump=`
plusarg that the regression never passes. The generators additionally set
`sys.dont_write_bytecode = True`, which is why running them leaves no
`__pycache__` (verified in section 6).

**Verdict: PASS.** Artifact rule clean; tree left byte-identical.

## 6. Item 5 — Regeneration integrity (`ch12/` generators)

`ch12/README.md` documents the two generators; both write into the current
directory and parse `../ch08` and `../ch10` sources, so they must run from
`src/ch12/`. To keep the shipped tree untouched, the whole of `guide/src` was
copied to `$SP/f2mut` (copy verified byte-identical by SHA-256 manifest digest
`e6e6575c…`) and the generators were run there:

```sh
cp -a /home/user/erancihan/guide/src/. $SP/f2mut/
cd $SP/f2mut/ch12 && python3 cov_gen.py && python3 corner_gen.py
```

Generator output:

```
directed quads: 58; floor closure 105/105
wrote cov_dirlist.vh cov_pins.vh cov_names.vh
NDIR = 58

census by family:
  ADJ 6   D9-born 1   J-ch10 12   MULTI 6   P-ab 92
  P-cd 92 P-r 92      TIE-r 4     Z16 16
  TOTAL    321
NCHK = 321
```

`diff` against the five shipped files:

| file | result |
|---|---|
| `cov_dirlist.vh` | **IDENTICAL** |
| `cov_pins.vh` | **IDENTICAL** |
| `cov_names.vh` | **IDENTICAL** |
| `corner_list.vh` | **IDENTICAL** |
| `corner_count.vh` | **IDENTICAL** |

Byte-stability holds. The regenerated numbers also match the chapter's prose
exactly: 58 directed quads floor-closing 105/105, and a 321-quad corner library
(`NCHK_EXPECTED 321`, the count guard `tb_corners12` asserts).

**No collateral either:** after both generators ran, a full SHA-256 manifest of
the scratch tree was byte-identical to the copy taken before them — so the
generators emit exactly those five files and leave no `__pycache__`.

The shipped tree was never the working directory; `guide/src/ch12` is untouched
(section 13).

**Verdict: PASS.** Regeneration is byte-stable in both generators.

## 7. Item 6 — Listing integrity, guide-wide

### Method (checker written from scratch for this pass)

`$SP/listings.py` walks `guide/guide.md` line by line, tracking fence opens and
closes (both `` ``` `` and `~~~`, any fence length, closing fence must be bare),
and extracts every fenced block with its info string, line span and preceding
prose. `$SP/match.py` then loads all 217 files under `guide/src/**` and tests
each block body as an **exact contiguous substring** of at least one of them.
Substring equality is the whole test — a listing that has been re-indented,
line-wrapped, or had a comment "tidied" fails it.

```
fenced blocks found: 399
info strings: (none) 282, verilog 98, systemverilog 13, python 3, sh 2, make 1
src files loaded: 217
```

399 fences matches the count `STATE.md` records for the assembled guide.

### Results

| population | blocks | byte-identical slice of a shipped file |
|---|---|---|
| code-tagged (`verilog`/`systemverilog`/`python`/`make`/`sh`) | 117 | **101 (86.3 %)** |
| untagged (transcripts, tables, command output) | 282 | 23 |
| **total** | **399** | **124** |

The untagged population is simulator output, not listings; the 23 that match are
the ones that happen to be quoted verbatim from a `README.md` or a manifest.
A dedicated scan of every *unmatched* untagged block whose preceding prose names
a file (46 of them) confirmed all are `$display` transcripts — e.g. the block
after "`tb_lzc8.v` checks all 256 inputs …" begins `lzc8(00110110) = 2`.
None claims to be source.

**Attribution was also checked, not just existence.** For every matched block
whose preceding prose names a specific `.v`/`.sv`/`.py` file, the matched file
was compared with the named one. Three apparent mismatches, all false alarms of
the heuristic: prose naming `tb_mux2.v` above a listing of the DUT `mux2.v`;
prose naming `bad_dumparray.v` above the block introduced as "Here is
`src/ch04/Makefile` in full" (which matches `ch04/Makefile`); and prose naming
`fp32_fields.v` above the packed-struct listing that matches `ch13/fp32_pkg.sv`.
**No block is attributed to a file it does not come from.**

### Adjudication of all 16 code-tagged misses

Every one was read in full with six lines of context on each side.

| # | line | tag | size | what it is | defect? |
|---|---|---|---|---|---|
| 1 | 1182 | verilog | 3 | three `assign` lines used rhetorically ("what happens if you swap the first and the last line?") — a fragment, no module wrapper | no |
| 2 | 1307 | sh | 2 | the `iverilog`/`vvp` command pair | no |
| 3 | 1374 | verilog | 3 | `module fp #(…) ( ... );` — literally contains `...` | no |
| 4 | 1402 | verilog | 3 | three instantiation styles quoted inline | no |
| 5 | 1450 | verilog | 6 | implicit-wire demo with `// ...` elision | no |
| 6 | 1658 | verilog | 1 | `reg [7:0] mem [0:255];` | no |
| 7 | 1668 | verilog | 2 | `reg signed [7:0] s;` etc. | no |
| 8 | 1791 | verilog | 2 | `a && b` / `a & b` | no |
| 9 | 2100 | verilog | 2 | `r8 = a + b;` / `r8 = {a + b};` | no |
| 10 | 2256 | verilog | 2 | the "make it wide enough first" fix pattern | no |
| 11 | 2328 | verilog | 1 | net-declaration-assignment one-liner | no |
| 12 | 2655 | sh | 2 | `iverilog … design.v tb.v` / `vvp sim` | no |
| 13 | 7778 | python | 44 | ch11's VCD parser. Prose: "The dump was then parsed with the same python discipline chapter 4 used". Never called a shipped file; `.py` is scoped to `ch12/` by rule | no (see nit N3) |
| 14 | 8093 | verilog | 4 | ch12's shipped-vs-mutant comparison — the very next line reads "(A labeled comparison, not a listing: the first `assign` is quoted from the shipped `src/ch09/fp32_addsub.v`, the second from the scratch mutant build …)". **Verified**: that first `assign` *is* a byte-exact substring of `ch09/fp32_addsub.v` | no |
| 15 | 9233 | python | 14 | ch14 format-census model, introduced by a "Method note" and labelled illustrative | no |
| 16 | 9361 | python | 18 | ch14 posit decoder, "Like the census model it is **illustrative**" | no |

**Every miss is a labelled fragment, a shell command, or an explicitly
illustrative model. Not one block claims to be shipped code and fails to be it.**

Two positive spot-checks worth recording: chapter 13's covergroup listing does
ship, as `ch13/cg_cov4.sv` (and is an `xfail` target — Icarus rejects it, which
is the chapter's point), and it **matches**. So does `ch04/Makefile` in full.

**Verdict: PASS.** 101/101 of the blocks that claim to be shipped code are
byte-identical contiguous slices of the file they claim to come from.

## 8. Item 7 — Mutation records, spot-checked adversarially

Six mutations were selected across `guide/src/*/README.md`, deliberately biased
toward rows reporting a **zero** — the class where `STATE.md` records that this
project once shipped reasoning in place of a measurement (ch14's M1/M2). Because
several rows describe the *same* mutation observed by different benches, the six
mutations adjudicate **twelve recorded rows**.

All mutations were applied to `$SP/f2mut` (the verified copy), compiled against
untouched dependencies, and reverted immediately. Compiler output was zero on
every mutant build except where noted.

### S1 — ch14 M3: `fp32_normalize` sticky forced to 0

`assign ns = right1 ? (s_in | sum27[0]) : s_in;` → `assign ns = 1'b0;`

Recorded: KILLED, killed by **directed D3**, **0 order violations**.

```
FAIL tb_mono4 directed D3 tie-then-up: base=4b800000 (exp 4b800000) bumped=4b800000 (exp 4b800001)
tb_mono4 census: 39605 ordered comparisons (11153 strictly up, 28452 unchanged), 23 NaN-born, …
tb_mono4: 1 errors
```

**REPRODUCES exactly.** One error, and it is D3; the monotonicity checker found
nothing, so the recorded zero is a real measurement.

### S2 — ch14 M8: result mantissa bit 22 inverted at the tree's result port

Recorded: KILLED, killed by **directed D1**, **0 order violations**.

```
FAIL tb_mono4 directed D1 fasi-shape … D2 nan-born … D3 tie-then-up …
                        D4 zero-pair … D5 all-minus-zero … D6 cancellation
tb_mono4 census: 37507 ordered comparisons (11328 strictly up, 26179 unchanged) …
tb_mono4: 6 errors
```

**The zero REPRODUCES** — zero order violations, exactly as recorded, and it is
the load-bearing column. The "killed by" column is looser than the measurement:
**all six** directed vectors fire, not only D1. Recorded as nit N1.

### S3 — B-M2 / D9: `fp32_addsub` loses the `eff_sub` gate on `exact_zero`

`assign exact_zero = eff_sub & (sum27 == 27'd0);` → `assign exact_zero = (sum27 == 27'd0);`

This one mutation adjudicates **nine** recorded rows across three chapters.

| README row | recorded | measured | agrees? |
|---|---|---|---|
| ch09 B-M2 (`tb_addsub_u`) | KILLED, `got 0000000/1 want 0000000/0` | `FAIL tb_addsub_u es=0 big=000000 al=000000 grs=000: got 0000000/1 want 0000000/0` | **yes, verbatim** |
| ch09 B-M2 (`tb_equiv`) | passes the entire 100,092-check sweep | `PASS tb_equiv (92 corner checks + 100000 random, split == golden bit-for-bit incl. flags)`; `$finish` at 100092000 ps | **yes** |
| ch10 D9 (`tb_equiv4`) | SURVIVED | `PASS tb_equiv4 (24000 quadruples x 2 structures x 2 references)` | **yes** |
| ch10 D9 (`tb_corners4`) | SURVIVED, all 28 corners | `PASS tb_corners4 (28 directed checks, 10/10 intermediate-event bins hit)` | **yes** |
| ch10 D9 (`tb_reach4`) | SURVIVED | `PASS tb_reach4 (4 reachers …)` | **yes** |
| ch12 DM1 (`tb_d9wit`) | **KILLED, 27×**, last kill `FAIL tb_d9wit 42f6e979 c2f6e979 3f800000 bf800000: u_add_r exact_zero on an effective add` | 27 errors; first two on the all-`+0` quad at `u_add_ab`/`u_add_cd`; last is that **exact line, character for character** | **yes, verbatim** |
| ch12 DM2 (`tb_corners12`) | SURVIVED (required) | `PASS tb_corners12 (321 directed quads, python-pinned, latency protocol per vector)` | **yes** |
| ch12 DM3 (`tb_add4_stream`) | SURVIVED (required) | `PASS tb_add4_stream (60992 valid quads incl 16 directed, 1027 bubbles, 1 result/cycle, latency 4)` | **yes** |
| ch12 DM4 (`tb_cov4`) | KILLED; `exact_zero fired on an effective add **38** times`; 105 pins still MATCH | KILLED; `… fired on an effective add **39** times`; `directed phase: 105/105 bins hit, pins MATCH` | **no — off by one** (finding **F1**) |

The 38-vs-39 discrepancy is stable (re-run twice, and section 2 proves the suite
is deterministic), so it is not noise. **Root cause found by experiment:** the
`ch12` review's `mx1` fix grew the directed coverage library from 57 to 58 quads
(the `d = 3` straddle quad `4B000000 + 49800000`, added at `cov_gen.py:104`).
Deleting that one line, regenerating, and re-running the same mutant gives:

```
FAIL tb_cov4: directed phase drove 57 quads, expected 58
  directed phase: 105/105 bins hit, pins MISMATCH
FAIL tb_cov4: exact_zero fired on an effective add 38 times
```

So the DM4 row — and the two prose copies of its transcript line — were measured
against the **pre-fix** library and never re-run after the library grew. It is
the project's own recorded hazard ("a mutation row is a measurement, not a
deduction") in its mildest form. The *qualitative* claim the row carries — the
never-bin kills B-M2 while all 105 screen-qualified pins still match — reproduces
exactly. Side benefit: the run above shows `tb_cov4`'s directed-quad count guard
firing correctly.

### S4 — ch11 D3: `fp32_add2_p2` bank 2 non-blocking → blocking

Recorded: **SURVIVED**, "PASS, all 101,111".

```
PASS tb_stream LAT=2 (101111 valid pairs incl 92 corners + 10 adjacency, 998 bubbles,
                      1 result/cycle, renorm corner=12 random=0)
```

**REPRODUCES exactly**, count included. A legal race falling the lucky way, as
the row says.

### S5 — ch12 NOFD: level-1 flag delay line bypassed in `fp32_add4`

`f1_d2[2:0]` → `f1[2:0]` in the three output assigns.

| row | recorded | measured |
|---|---|---|
| DM5 (`tb_corners12`) | KILLED, 321 of 321, `FAIL tb_corners12 00000000 00000000 00000000 00000000: X in outputs 00000000/xxx` | `FATAL … FAIL tb_corners12: 321 error(s)`, first lines **verbatim** |
| DM6 (`tb_add4_stream`) | KILLED, **9,929 mismatches / 60,992 (16.3 %): result-changed = 0**, 9,424 flag-only, 505 X-class, first kill cyc 7 `7fc00000/100` where `/111` due | `classes: result-changed=0 flag-only=9424 X=505`; `FAIL tb_add4_stream: 9929 mismatches`; first kill `cyc 7: pipe 7fc00000/100 tree 7fc00000/111` |

**REPRODUCES exactly, including the embedded zero.**

### S6 — ch10 T7: `tb_reach4` tree bin re-aimed at `u_add_ab`

Recorded: KILLED, `FAIL tb_reach4: fires tree=0 seq=4, expected 4/4`.

```
FAIL tb_reach4: fires tree=0 seq=4, expected 4/4     (process exit code 0)
```

**REPRODUCES verbatim.** Note the exit code: this target fails with rc 0, so the
harness's `FAIL`-string rule is what catches it — the mechanism `STATE.md`
justifies is load-bearing on a real shipped bench, not just in theory.

### Summary

| # | mutation | rows adjudicated | outcome |
|---|---|---|---|
| S1 | ch14 M3 | 1 | reproduces exactly |
| S2 | ch14 M8 | 1 | zero reproduces; attribution column understates (nit N1) |
| S3 | B-M2 / D9 | 9 | 8 reproduce exactly; DM4's count is 38 vs measured 39 (**F1**) |
| S4 | ch11 D3 | 1 | reproduces exactly |
| S5 | ch12 NOFD | 2 | reproduce exactly |
| S6 | ch10 T7 | 1 | reproduces verbatim |

**15 of 15 rows reproduce qualitatively; 14 of 15 reproduce numerically.**

**Verdict: PASS with one finding (F1).** The mutation records are measurements,
not deductions — with one stale count that the guide's own fix round outdated.

## 9. Item 8 — The headline claims, re-run

Each claim was traced to the specific target that carries it, and that target's
own stdout from the cold regression was compared with the sentence in
`guide.md`. Where a claim asserts that a check *can fail*, the check was made to
fail.

### C1 — The four-input adder is equivalent to its golden model

**Carrier:** `ch12` target 5, `tb_add4_gold.v` — the pipelined flagship
`fp32_add4` against `ref_add4_tree`, three chapter-8 `fp32_add_alg` instances in
tree order, full 32-bit compare including NaN payloads, plus flags.

```
PASS tb_add4_gold (61037 valid quads incl 16 directed, 982 bubbles, 1 result/cycle, latency 4)
```

`guide.md`'s table gives `tb_add4_gold — flagship vs golden chain | 61,037`.
**Matches to the quad.** The companion target `tb_add4_stream` (flagship vs
chapter 10's combinational tree) likewise gives `60992`, matching the table's
`60,992`. Chapter 10's own structural sweep also stands: `PASS tb_equiv4 (24000
quadruples x 2 structures x 2 references)`.

That the golden comparison is not vacuous is shown by `ch12`'s recorded g1 row
and reproduced here at the pipeline level: with the flag delay line bypassed
(section 8, S5) the same harness reports **9,929 mismatches**, so the oracle
comparison does fire.

### C2 — The coverage model closes 105/105 with pins matched

**Carrier:** `ch12` target 3, `tb_cov4.v`.

```
PASS tb_cov4 (18058 quads, 105/105 bins, pins matched, D9 never-bin armed 27124 and empty)
```

`guide.md` line 8247 quotes that line verbatim; **it reproduces character for
character.** "Pins matched" means every one of the 105 bin counts from the
directed phase equalled a count computed independently in python
(`cov_pins.vh`, regenerated byte-identically in section 6).

The claim that closure is falsifiable was tested by running both shipped
demonstrations, which the guide says must fail:

```
$ iverilog -g2012 -Wall -DALL_POSITIVE … && vvp …
  after regime 2: 91/105 bins hit
  FAIL tb_cov4: 14 empty bins                 (rc=1)

$ iverilog -g2012 -Wall -DNO_DIRECTED … && vvp …
  after regime 2: 98/105 bins hit
  FAIL tb_cov4: 7 empty bins                  (rc=1)
```

Both fail, with exactly the recorded hole counts (14 and 7). And section 8's
S3/DM4 shows a third failure mode firing on the correct-pins/wrong-wire case.

### C3 — The D9 witness kills its mutant

**Carrier:** `ch12` target 2, `tb_d9wit.v`.

Clean run: `PASS tb_d9wit (17 vectors, invariant armed 27 times across 3
instances)` — matching `guide.md` line 8174 verbatim.

Under the B-M2 mutant (section 8, S3) it dies **27 times**, first on the
all-`+0` quad at `u_add_ab` and `u_add_cd`, last on the cancellation-born-zero
quad at `u_add_r`:

```
FAIL tb_d9wit 42f6e979 c2f6e979 3f800000 bf800000: u_add_r exact_zero on an effective add
FATAL: tb_d9wit.v:83: FAIL tb_d9wit: 27 error(s)
```

Byte-identical to the message `ch12/README.md` records. And the *required
survivals* also hold: the same mutant passes `tb_corners12`, `tb_add4_stream`,
and all three of chapter 10's benches — so the guide's claim that no
output-level bench can witness this class is measured, not asserted.

### C4 — The streaming harness's latency property

**Carriers:** `ch11/tb_stream.v` (LAT=2 and LAT=4 configs), `ch11/tb_stream4.v`,
`ch12/tb_add4_stream.v`, `ch12/tb_corners12.v`.

Clean runs:

```
PASS tb_stream LAT=2 (101111 valid pairs incl 92 corners + 10 adjacency, 998 bubbles,
                      1 result/cycle, renorm corner=12 random=0)
PASS tb_stream4 (101019 valid quads incl 16 directed, 1000 bubbles, 1 result/cycle, latency 4)
PASS tb_add4_stream (60992 valid quads incl 16 directed, 1027 bubbles, 1 result/cycle, latency 4)
PASS tb_corners12 (321 directed quads, python-pinned, latency protocol per vector)
```

The property is pinned to the **specification**, not to the DUT's own behaviour.
Proved by rebuilding the shipped `tb_stream.v` against the 2-stage DUT with the
latency constant lied about:

```sh
iverilog -g2012 -Wall -DLAT=3 … fp32_add2_p2.v tb_stream.v && vvp …
```
```
FAIL tb_stream cyc 2: out_valid=1 during fill, expected 0
classes: result-changed=100496 flag-only=0 X=0
FATAL: tb_stream.v:332: FAIL tb_stream: 101500 mismatches (0 X-class)
```

**101,500 mismatches** — exactly the number `ch11/README.md`'s T4 row records.
A self-consistently-late pipeline cannot pass this harness.

### C5 — extra: the two python models that pin everything really agree

`ch12/README.md` claims `hwmodel.py` and `oracle.py` were proven equal on
2,000,320 vectors. Independently re-run here on all **321 corner-library quads
parsed out of the shipped `corner_list.vh`** plus 20,000 random quads biased
toward specials and clustered exponents:

```
corner-library quads parsed: 321
quads compared: 20321  divergences: 0
```

**Verdict: PASS.** All four headline claims reproduce from their own targets,
and each one's failure mode was made to fire.

## 10. Item 9 — Timing reality

Every target's wall clock was recorded (section 12 has all 123). 106 of the 123
run in under one second. The 17 that take a second or more:

| # | chapter | target | sim (s) | % of the 60 s default | band |
|---|---|---|---|---|---|
| 098 | ch11 | `tb_stream4.v` | **40.72** | **67.9 %** | **watch** |
| 093 | ch10 | `tb_equiv4.v` | **38.65** | **64.4 %** | **watch** |
| 108 | ch12 | `tb_add4_gold.v` | 26.12 | 43.5 % | ok |
| 107 | ch12 | `tb_add4_stream.v` | 24.48 | 40.8 % | ok |
| 090 | ch09 | `tb_equiv.v` | 15.01 | 25.0 % | ok |
| 097 | ch11 | `tb_stream.v` (p4) | 11.49 | 19.1 % | ok |
| 115 | ch13 | `tb_norm_equiv.sv` | 11.42 | 19.0 % | ok |
| 096 | ch11 | `tb_stream.v` (p2) | 11.08 | 18.5 % | ok |
| 092 | ch09 | `tb_short.v` | 7.96 | 13.3 % | ok |
| 123 | ch14 | `tb_mono4.v` | 5.05 | 8.4 % | ok |
| 111 | ch13 | `tb_q_stream.sv` | 4.92 | 8.2 % | ok |
| 110 | ch13 | `tb_if_stream.sv` | 3.73 | 6.2 % | ok |
| 109 | ch13 | `tb_fields_equiv.sv` | 2.83 | 4.7 % | ok |
| 106 | ch12 | `tb_cov4.v` | 2.72 | 4.5 % | ok |
| 102 | ch11 | `tb_xinj.v` | 2.32 | 3.9 % | ok |
| 099 | ch11 | `tb_single.v` | 2.31 | 3.9 % | ok |
| 064 | ch05 | `tb_exhaustive.v` | 1.20 | 2.0 % | ok |

**On an idle machine, no target is within 25 % of `SIM_TIMEOUT=60`** (the
threshold is 45 s; the worst is 40.72 s). Run-to-run variance is small: the
largest A-vs-B delta over 123 targets was 0.98 s (2.5 %), and totals were
215.29 s vs 213.64 s.

### The interesting number is what happens under load

`STATE.md` flags exactly this hazard (`tb_stream4` recorded at 36.7 s and later
56.0 s on the same host). It was reproduced rather than taken on trust: the two
slowest targets were re-timed with four competing busy loops on this 4-core box.

| target | idle | under 4× load | ratio | % of 60 s, loaded |
|---|---|---|---|---|
| `ch11/tb_stream4.v` | 41.30 s | **49.11 s** | 1.19× | **81.9 %** |
| `ch10/tb_equiv4.v` | 38.65 s | **46.45 s** | 1.20× | **77.4 %** |

Both cross the 45 s line under quite ordinary contention, so **both are flake
risks at the default timeout** and are flagged. Both still produced their
correct PASS lines — the risk is the harness killing a correct target, not a
wrong answer.

The full suite was also run once at the reader's default:

```sh
cd guide/src && SIM_TIMEOUT=60 bash run_all.sh   →  passed: 123, failed: 0, exit 0, 206.87 s
```

So the default works on a quiet machine — which is exactly why the hazard is
worth stating rather than discovering.

### Does the guide say so?

Yes, and in the right place. `guide.md`'s front matter carries the raised-timeout
command and a paragraph naming the mechanism, the 36.7 s / 56.0 s observation,
and the rule that "every wall-clock figure in these chapters is a session
observation, not a contract". `ch12/README.md` repeats it with the sizing
rationale. **That covers the substance of this item.**

Two calibration nits against measurements taken here (both nits, not defects):

- The front-matter sentence says the streaming targets are "sized at 55-60 % of
  that budget on a quiet machine". Measured here, ch12's two are 40.8 % and
  43.5 % (comfortably better than stated) but ch11's `tb_stream4` is **67.9 %**
  (worse than stated). Recorded as nit **N2**.
- That sentence names "chapters 11 and 12". The **second**-riskiest target in the
  repo is `ch10/tb_equiv4.v` at 64.4 % idle and 77.4 % loaded, and chapter 10 is
  not named. `ch10/README.md` does describe it locally as "34.5 s here, inside
  the 60 s harness timeout". Recorded as nit **N4**.

Recorded-versus-measured drift, for the record: `tb_stream4` 36.7 s recorded →
41.3 s here (+12 %); `tb_add4_stream` 34.5 s recorded → 24.5 s here (−29 %);
`tb_add4_gold` 36.2 s → 26.1 s (−28 %); `tb_equiv4` 34.5 s → 38.7 s (+12 %);
`tb_cov4` 3.8 s → 2.7 s. Drift in **both** directions, up to ~30 % — which is
precisely the guide's own stated position on wall-clock figures.

**Verdict: PASS.** No target is within 25 % of the default timeout on an idle
machine; two cross it under load, and the guide already tells readers to raise
the limit. Two calibration nits (N2, N4).

## 11. Findings register

Nothing here blocks the ship. One defect, three harness weaknesses, four nits.

### Defects

**F1 — a quoted mutation transcript reads 38 where the shipped kit produces 39.**
*Severity: minor, non-blocking. Class: stale measurement after a later fix.*

- **Where:** `guide/src/ch12/README.md` line 129 (row DM4); `guide/guide.md`
  line 8183; `guide/chapters/ch12.md` line 232. All three quote
  `` `exact_zero fired on an effective add 38 times` `` as a transcript line.
- **Measured:** applying the documented B-M2 mutant
  (`assign exact_zero = (sum27 == 27'd0);` in `ch09/fp32_addsub.v`) and running
  the shipped `tb_cov4` target gives
  `FAIL tb_cov4: exact_zero fired on an effective add 39 times`. Reproduced
  twice; section 2 proves the suite is deterministic, so this is not noise.
- **Root cause, proved by experiment:** the ch12 review's `mx1` fix added a
  58th directed quad (`cov_gen.py:104`, the `d = 3` straddle
  `4B000000 + 49800000`). Deleting that line, regenerating, and re-running the
  same mutant restores the recorded **38**. The DM4 row was measured against the
  pre-fix 57-quad library and not re-run after the library grew.
- **Impact:** the row's substantive claim — the D9 never-bin kills B-M2 while all
  105 screen-qualified pins still match — reproduces exactly. Only the count is
  stale.
- **Suggested fix for F3:** change `38` to `39` in the three places above. No
  code change; nothing else in the DM4 row or its surrounding prose moves.

### Harness weaknesses (see section 3; none reachable from the shipped tree)

- **H1** — an `xfail` row naming a missing file PASSES. Not exploited: section 4
  proves every manifest-named path exists, and section 3 shows each `xfail`
  fails for its stated reason.
- **H2** — a chapter with no `targets.txt` is silently `SKIP`ped and the suite
  still exits 0. **There is no expected-total assertion anywhere**, so a deleted
  manifest turns 123/123 into a green 118/118. The number 123 lives only in
  prose. Cheapest fix: `[ "$pass" -eq "${EXPECT_TOTAL:-$pass}" ]` or a committed
  count file.
- **H3** — a `run` row with no testbench passes silently (the gate is *absence of
  FAIL*, not *presence of a verdict*). Not exploited: all 112 simulating targets
  print `PASS`.

### Nits

- **N1** — `ch14/README.md` M8 says "killed by directed **D1**"; measured, all
  six directed vectors (D1-D6) fire. The row's load-bearing column (0 order
  violations) is correct.
- **N2** — `guide.md` front matter says the streaming targets are "sized at
  55-60 % of that budget on a quiet machine". Measured here: ch12's two are 40.8 %
  and 43.5 %; ch11's `tb_stream4` is 67.9 %.
- **N3** — chapter 11's 44-line VCD-parsing python listing (guide.md line 7778)
  is inline-only and correctly not shipped (`.py` is scoped to `ch12/`), but
  unlike chapter 14's two python listings it is not explicitly labelled
  illustrative. A reader could look for a file. One clause would close it.
- **N4** — the front-matter timeout warning names "chapters 11 and 12"; the
  second-riskiest target in the repo is `ch10/tb_equiv4.v` (64.4 % idle, 77.4 %
  under load). Worth naming chapter 10 too.

### Explicitly checked and clean

`STATE.md`'s recorded hazards for this pass were each tested, not assumed:
the 12.0-vs-13.0 toolchain split (13.0 present, section 1); the three manifest
row types (all contracts hold, section 3); the `.py`/`.vh`-in-ch12 and
`.sv`-in-ch13 artifact extensions (exactly scoped, section 5); the timing-drift
hazard (measured idle and loaded, section 10); and the mutation-row-zeros hazard
(six mutations, twelve rows, section 8 — which is how F1 was found).

## 12. Target-by-target summary (all 123 targets)

Times are from instrumented pass A on an idle 4-core machine; verdicts were
identical in pass B and in all three `run_all.sh` runs. "deps" is the number of
additional source files compiled alongside the named target (cross-chapter
reuse — chapter 12's flagship targets compile 13 other chapters' files).

| # | ch | target (last file in row) | row | verdict | compile s | sim s | deps |
|---|---|---|---|---|---|---|---|
| 001 | ch02 | `tb_half_adder.v` | run | PASS | 0.01 | 0.01 | 1 |
| 002 | ch02 | `tb_adder_ansi.v` | run | PASS | 0.01 | 0.01 | 1 |
| 003 | ch02 | `tb_port_styles.v` | run | PASS | 0.01 | 0.01 | 2 |
| 004 | ch02 | `tb_ripple4.v` | run | PASS | 0.01 | 0.01 | 3 |
| 005 | ch02 | `tb_mux2.v` | run | PASS | 0.01 | 0.01 | 1 |
| 006 | ch02 | `tb_comb_max.v` | run | PASS | 0.01 | 0.01 | 1 |
| 007 | ch02 | `tb_drivers.v` | run | PASS | 0.01 | 0.01 | 0 |
| 008 | ch02 | `tb_align_sticky.v` | run | PASS | 0.01 | 0.07 | 1 |
| 009 | ch02 | `bad_align_shw.v` | xfail | PASS | 0.01 | 0.00 | 1 |
| 010 | ch02 | `tb_round_ne.v` | run | PASS | 0.01 | 0.01 | 1 |
| 011 | ch02 | `tb_byte_select.v` | run | PASS | 0.01 | 0.01 | 1 |
| 012 | ch02 | `tb_lzc8.v` | run | PASS | 0.01 | 0.01 | 1 |
| 013 | ch02 | `tb_mant_add.v` | run | PASS | 0.01 | 0.01 | 2 |
| 014 | ch02 | `tb_widths.v` | run | PASS | 0.01 | 0.01 | 0 |
| 015 | ch02 | `tb_signedness.v` | run | PASS | 0.01 | 0.01 | 0 |
| 016 | ch02 | `tb_literals.v` | warn | PASS | 0.01 | 0.01 | 0 |
| 017 | ch02 | `tb_operators.v` | run | PASS | 0.01 | 0.01 | 0 |
| 018 | ch02 | `tb_partsel.v` | warn | PASS | 0.01 | 0.01 | 0 |
| 019 | ch02 | `tb_systasks.v` | run | PASS | 0.01 | 0.01 | 0 |
| 020 | ch02 | `tb_procedural.v` | run | PASS | 0.01 | 0.01 | 0 |
| 021 | ch02 | `bad_positional.v` | warn | PASS | 0.01 | 0.01 | 1 |
| 022 | ch02 | `bad_implicit.v` | warn | PASS | 0.01 | 0.01 | 0 |
| 023 | ch02 | `bad_nettype_none.v` | xfail | PASS | 0.01 | 0.00 | 0 |
| 024 | ch02 | `bad_carry_always.v` | warn | PASS | 0.01 | 0.01 | 0 |
| 025 | ch02 | `bad_begin_end.v` | run | PASS | 0.01 | 0.01 | 0 |
| 026 | ch02 | `bad_casex.v` | run | PASS | 0.01 | 0.01 | 0 |
| 027 | ch02 | `bad_recursion.v` | run | PASS | 0.01 | 0.01 | 0 |
| 028 | ch03 | `tb_latch.v` | run | PASS | 0.01 | 0.01 | 2 |
| 029 | ch03 | `tb_flop_templates.v` | run | PASS | 0.01 | 0.01 | 1 |
| 030 | ch03 | `tb_shift3.v` | run | PASS | 0.01 | 0.01 | 2 |
| 031 | ch03 | `tb_swap.v` | run | PASS | 0.01 | 0.01 | 0 |
| 032 | ch03 | `tb_regions.v` | run | PASS | 0.01 | 0.01 | 0 |
| 033 | ch03 | `tb_delta.v` | run | PASS | 0.01 | 0.01 | 0 |
| 034 | ch03 | `tb_race.v` | run | PASS | 0.01 | 0.01 | 1 |
| 035 | ch03 | `tb_sens.v` | run | PASS | 0.01 | 0.01 | 1 |
| 036 | ch03 | `tb_fsm.v` | run | PASS | 0.01 | 0.01 | 1 |
| 037 | ch03 | `tb_reset_sync.v` | run | PASS | 0.01 | 0.01 | 2 |
| 038 | ch03 | `tb_regwire.v` | run | PASS | 0.01 | 0.01 | 0 |
| 039 | ch03 | `tb_xprop.v` | run | PASS | 0.01 | 0.01 | 0 |
| 040 | ch03 | `bad_clkinit.v` | run | PASS | 0.01 | 0.01 | 0 |
| 041 | ch03 | `bad_tbedge.v` | run | PASS | 0.01 | 0.01 | 1 |
| 042 | ch03 | `bad_combdelay.v` | run | PASS | 0.01 | 0.01 | 0 |
| 043 | ch03 | `bad_multidrive.v` | run | PASS | 0.01 | 0.01 | 0 |
| 044 | ch03 | `bad_arraysens.v` | warn | PASS | 0.01 | 0.01 | 0 |
| 045 | ch03 | `bad_edge.v` | run | PASS | 0.01 | 0.01 | 0 |
| 046 | ch03 | `bad_svalways.v` | warn | PASS | 0.01 | 0.01 | 0 |
| 047 | ch03 | `bad_zerodelay.v` | xfail | PASS | 0.01 | 0.00 | 0 |
| 048 | ch04 | `tb_anatomy.v` | run | PASS | 0.01 | 0.01 | 1 |
| 049 | ch04 | `tb_period.v` | run | PASS | 0.01 | 0.01 | 0 |
| 050 | ch04 | `tb_stimulus.v` | run | PASS | 0.01 | 0.01 | 1 |
| 051 | ch04 | `tb_vectors.v` | run | PASS | 0.01 | 0.01 | 1 |
| 052 | ch04 | `bad_readmem.v` | run | PASS | 0.01 | 0.01 | 0 |
| 053 | ch04 | `tb_random.v` | run | PASS | 0.01 | 0.01 | 0 |
| 054 | ch04 | `tb_print.v` | run | PASS | 0.01 | 0.01 | 0 |
| 055 | ch04 | `tb_strobe.v` | run | PASS | 0.01 | 0.01 | 1 |
| 056 | ch04 | `bad_monitor.v` | run | PASS | 0.01 | 0.01 | 0 |
| 057 | ch04 | `bad_severity.v` | run | PASS | 0.01 | 0.01 | 0 |
| 058 | ch04 | `tb_check.v` | run | PASS | 0.01 | 0.01 | 2 |
| 059 | ch04 | `tb_dump.v` | run | PASS | 0.01 | 0.01 | 2 |
| 060 | ch04 | `bad_dumparray.v` | run | PASS | 0.01 | 0.01 | 0 |
| 061 | ch04 | `tb_plusargs.v` | run | PASS | 0.01 | 0.01 | 0 |
| 062 | ch05 | `tb_directed.v` | run | PASS | 0.01 | 0.01 | 2 |
| 063 | ch05 | `tb_random.v` | run | PASS | 0.01 | 0.03 | 2 |
| 064 | ch05 | `tb_exhaustive.v` | run | PASS | 0.01 | 1.20 | 2 |
| 065 | ch05 | `tb_scoreboard.v` | run | PASS | 0.01 | 0.01 | 2 |
| 066 | ch05 | `tb_seed.v` | run | PASS | 0.01 | 0.02 | 0 |
| 067 | ch05 | `tb_fpref.v` | run | PASS | 0.01 | 0.01 | 0 |
| 068 | ch05 | `tb_covfp.v` | run | PASS | 0.01 | 0.05 | 0 |
| 069 | ch05 | `tb_assert.v` | run | PASS | 0.01 | 0.01 | 1 |
| 070 | ch05 | `bad_srchain.v` | run | PASS | 0.01 | 0.01 | 0 |
| 071 | ch05 | `bad_tolerance.v` | run | PASS | 0.01 | 0.01 | 0 |
| 072 | ch05 | `bad_sva.v` | xfail | PASS | 0.01 | 0.00 | 0 |
| 073 | ch05 | `bad_covergroup.v` | xfail | PASS | 0.01 | 0.00 | 0 |
| 074 | ch06 | `tb_sub4.v` | run | PASS | 0.01 | 0.01 | 2 |
| 075 | ch06 | `tb_ovf4.v` | run | PASS | 0.01 | 0.01 | 2 |
| 076 | ch06 | `tb_satq44.v` | run | PASS | 0.01 | 0.17 | 1 |
| 077 | ch06 | `tb_fixmul44.v` | run | PASS | 0.01 | 0.34 | 1 |
| 078 | ch06 | `tb_signtraps.v` | run | PASS | 0.01 | 0.01 | 0 |
| 079 | ch07 | `tb_class.v` | run | PASS | 0.01 | 0.03 | 1 |
| 080 | ch07 | `tb_fields.v` | run | PASS | 0.01 | 0.02 | 1 |
| 081 | ch07 | `tb_encode.v` | run | PASS | 0.01 | 0.01 | 0 |
| 082 | ch07 | `tb_lab.v` | run | PASS | 0.01 | 0.01 | 0 |
| 083 | ch08 | `tb_walk.v` | run | PASS | 0.01 | 0.01 | 2 |
| 084 | ch08 | `tb_corners.v` | run | PASS | 0.01 | 0.02 | 2 |
| 085 | ch08 | `tb_refmodel.v` | run | PASS | 0.01 | 0.01 | 2 |
| 086 | ch08 | `tb_random.v` | run | PASS | 0.01 | 0.82 | 2 |
| 087 | ch09 | `tb_align_u.v` | run | PASS | 0.01 | 0.01 | 2 |
| 088 | ch09 | `tb_addsub_u.v` | run | PASS | 0.01 | 0.01 | 1 |
| 089 | ch09 | `tb_normround_u.v` | run | PASS | 0.01 | 0.01 | 2 |
| 090 | ch09 | `tb_equiv.v` | run | PASS | 0.02 | 15.01 | 12 |
| 091 | ch09 | `tb_corners_split.v` | run | PASS | 0.01 | 0.01 | 11 |
| 092 | ch09 | `tb_short.v` | run | PASS | 0.01 | 7.96 | 11 |
| 093 | ch10 | `tb_equiv4.v` | run | PASS | 0.03 | 38.65 | 15 |
| 094 | ch10 | `tb_corners4.v` | run | PASS | 0.02 | 0.03 | 13 |
| 095 | ch10 | `tb_reach4.v` | run | PASS | 0.02 | 0.02 | 13 |
| 096 | ch11 | `tb_stream.v` | run | PASS | 0.01 | 11.08 | 12 |
| 097 | ch11 | `tb_stream.v` | run | PASS | 0.02 | 11.49 | 13 |
| 098 | ch11 | `tb_stream4.v` | run | PASS | 0.02 | 40.72 | 14 |
| 099 | ch11 | `tb_single.v` | run | PASS | 0.01 | 2.31 | 12 |
| 100 | ch11 | `tb_reset.v` | run | PASS | 0.02 | 0.02 | 12 |
| 101 | ch11 | `tb_reset.v` | run | PASS | 0.02 | 0.02 | 13 |
| 102 | ch11 | `tb_xinj.v` | run | PASS | 0.01 | 2.32 | 12 |
| 103 | ch11 | `tb_wave.v` | run | PASS | 0.02 | 0.02 | 13 |
| 104 | ch12 | `tb_corners12.v` | run | PASS | 0.03 | 0.10 | 13 |
| 105 | ch12 | `tb_d9wit.v` | run | PASS | 0.01 | 0.01 | 12 |
| 106 | ch12 | `tb_cov4.v` | run | PASS | 0.02 | 2.72 | 13 |
| 107 | ch12 | `tb_add4_stream.v` | run | PASS | 0.03 | 24.48 | 14 |
| 108 | ch12 | `tb_add4_gold.v` | run | PASS | 0.03 | 26.12 | 15 |
| 109 | ch13 | `tb_fields_equiv.sv` | run | PASS | 0.01 | 2.83 | 3 |
| 110 | ch13 | `tb_if_stream.sv` | run | PASS | 0.02 | 3.73 | 13 |
| 111 | ch13 | `tb_q_stream.sv` | run | PASS | 0.02 | 4.92 | 12 |
| 112 | ch13 | `tb_assert_live.sv` | run | PASS | 0.01 | 0.01 | 0 |
| 113 | ch13 | `tb_selfstart.sv` | run | PASS | 0.01 | 0.01 | 0 |
| 114 | ch13 | `tb_fields_comb.sv` | warn | PASS | 0.01 | 0.72 | 3 |
| 115 | ch13 | `tb_norm_equiv.sv` | warn | PASS | 0.01 | 11.42 | 2 |
| 116 | ch13 | `tb_unique_case.sv` | warn | PASS | 0.01 | 0.01 | 2 |
| 117 | ch13 | `bad_if_port.sv` | xfail | PASS | 0.01 | 0.00 | 0 |
| 118 | ch13 | `bad_enum_cast.sv` | xfail | PASS | 0.01 | 0.00 | 0 |
| 119 | ch13 | `bad_assoc.sv` | xfail | PASS | 0.01 | 0.00 | 0 |
| 120 | ch13 | `bad_qstruct.sv` | xfail | PASS | 0.01 | 0.00 | 0 |
| 121 | ch13 | `bad_comb_delay.sv` | xfail | PASS | 0.01 | 0.00 | 0 |
| 122 | ch13 | `cg_cov4.sv` | xfail | PASS | 0.01 | 0.00 | 0 |
| 123 | ch14 | `tb_mono4.v` | run | PASS | 0.02 | 5.05 | 12 |

**123 targets, 123 PASS, 0 FAIL.** Row types: 102 `run`, 10 `warn`, 11 `xfail`.


## 13. Restoration proof

All destructive work happened on copies. Everything the tree saw was read-only
plus three full harness runs, whose only writes go to a `mktemp -d` under an
`EXIT` trap.

### `guide/src` — byte-identical, start to finish

```sh
cd /home/user/erancihan/guide/src && find . -type f | LC_ALL=C sort | xargs sha256sum \
  | diff - $SP/baseline-src.sha256
```
→ empty. The digest of the whole 217-file manifest is unchanged:

```
baseline: e6e6575cba3ab2dc17aca0cddead097f18408f17db008fe89e43946838716b3a
final:    e6e6575cba3ab2dc17aca0cddead097f18408f17db008fe89e43946838716b3a
```

That digest was re-confirmed after: two `SIM_TIMEOUT=120` regressions, two
instrumented passes, one `SIM_TIMEOUT=60` regression, the by-hand `xfail`
compiles, the load-test builds, the closure demonstrations and the whole
mutation battery.

### `guide/` — one new file, nothing altered

```sh
cd /home/user/erancihan/guide && find . -type f | LC_ALL=C sort | xargs sha256sum \
  | diff $SP/baseline-guide.sha256 -
```
```
32a33
> c9f1b30d…  ./reviews/F2-smoke-test.md
```

**The only difference in the entire `guide/` tree is this report.** 273 files
before, 274 after. `guide.md`, `STATE.md`, `assemble.py`, `front-matter.md`, all
14 chapters, all research notes and all prior reviews are untouched.

### The scratch mutation tree was also restored

The working copy at `$SP/f2mut` was re-hashed after every mutation was reverted
and matched its own pre-mutation manifest exactly — so no mutant leaked into any
later measurement in this report.

**Verdict: PASS.**

## 14. Overall verdict

| # | battery item | verdict |
|---|---|---|
| 1 | Cold full regression, twice, determinism | **PASS** |
| 2 | Harness audit + contract tests | **PASS** (3 weaknesses recorded, none reachable) |
| 3 | Manifest reachability: no orphans, no missing | **PASS** |
| 4 | Artifact rule + no build artifacts | **PASS** |
| 5 | `ch12` regeneration integrity | **PASS** |
| 6 | Listing integrity, guide-wide | **PASS** |
| 7 | Mutation records, adversarial spot-check | **PASS with one finding (F1)** |
| 8 | The four headline claims | **PASS** |
| 9 | Timing reality | **PASS** (2 nits) |

### Overall: **PASS — fit to ship.**

The shipped code is what the guide says it is. 123 of 123 targets build and run
green from scratch, three times, at both the default and the raised timeout, and
the simulation output is byte-identical across independent runs — 0 of 123 files
differed. Every `.v` and `.sv` on disk is reachable from a manifest and every
manifest path exists. The artifact rule is clean to the file, with the two
documented extensions scoped exactly as recorded. The generators are byte-stable.
Every fenced block in `guide.md` that claims to be shipped code is a
byte-identical contiguous slice of the file it names, and all 16 non-matching
code blocks are labelled fragments, shell commands or explicitly illustrative
models.

Most importantly, the harness that produces every chapter's green verdict was
not trusted: all three manifest contracts were tested with deliberately-wrong
targets and all three hold, including the subtle ones (a warning under `run`
fails; a silent module under `warn` fails; a compiling module under `xfail`
fails; a `warn` row still runs the full simulation gate; an exit-0 testbench that
prints `FAIL` fails; a hang is killed and reported).

**One defect (F1)** — a three-times-quoted mutation transcript reading 38 where
the shipped kit produces 39, root-caused to a coverage library that grew from 57
to 58 quads in a later fix round. It is a one-character documentation edit, and
the claim the row carries reproduces exactly. **Nothing found here blocks the
final report.**

Three harness weaknesses (H1-H3) and four nits (N1-N4) are recorded for F3 and
for anyone maintaining the kit. The most consequential is **H2**: the total
`123` is asserted only in prose, so a lost manifest would produce a smaller
green number rather than a failure.

## 15. Exact commands, for repetition

`$SP` is a scratch directory outside the repo. Nothing below writes into
`guide/` except the last line of the baseline step, which writes outside it.

```sh
export SP=/tmp/f2-scratch && mkdir -p "$SP"
REPO=/home/user/erancihan

# --- 0. baselines (do this first) -------------------------------------------
cd $REPO/guide/src && find . -type f | LC_ALL=C sort | xargs sha256sum > $SP/baseline-src.sha256
cd $REPO/guide     && find . -type f | LC_ALL=C sort | xargs sha256sum > $SP/baseline-guide.sha256

# --- 1. the regression, twice, and at the reader's default -------------------
cd $REPO/guide/src && time SIM_TIMEOUT=120 bash run_all.sh | tee $SP/run1.log
cd $REPO/guide/src && time SIM_TIMEOUT=120 bash run_all.sh | tee $SP/run2.log
diff $SP/run1.log $SP/run2.log            # expect: empty
cd $REPO/guide/src && time SIM_TIMEOUT=60  bash run_all.sh   # expect: 123/123, exit 0

# --- 2. harness contract tests (scratch chapter, real harness) ---------------
mkdir -p $SP/contract/ch99 && cp $REPO/guide/src/run_all.sh $SP/contract/
#   put ok.v/tb_ok.v (silent), warny.v/tb_warny.v (port-width warning),
#   broken.v (undeclared net), hang.v (clock, no $finish),
#   tb_saysfail.v ($display("FAIL …")) in $SP/contract/ch99, then for each row:
cd $SP/contract && printf 'run   : warny.v tb_warny.v\n' > ch99/targets.txt \
  && SIM_TIMEOUT=8 bash run_all.sh ch99          # must FAIL: "compile warnings"
cd $SP/contract && printf 'warn  : ok.v tb_ok.v\n'      > ch99/targets.txt \
  && SIM_TIMEOUT=8 bash run_all.sh ch99          # must FAIL: "compiled silently"
cd $SP/contract && printf 'xfail : ok.v tb_ok.v\n'      > ch99/targets.txt \
  && SIM_TIMEOUT=8 bash run_all.sh ch99          # must FAIL: "compiled but should NOT have"

# --- 3/4. reachability and the artifact rule ---------------------------------
find $REPO/guide/src -type f | sed 's/.*\///' | sed -E 's/.*(\.[A-Za-z0-9]+)$/\1/' | sort | uniq -c
python3 $SP/reach.py        # parses all 13 manifests; orphans + missing files, both directions

# --- 5. regeneration (on a COPY — the generators write into cwd) -------------
cp -a $REPO/guide/src/. $SP/f2mut/
cd $SP/f2mut/ch12 && python3 cov_gen.py && python3 corner_gen.py
for f in cov_dirlist.vh cov_pins.vh cov_names.vh corner_list.vh corner_count.vh; do
  diff "$f" "$REPO/guide/src/ch12/$f" && echo "IDENTICAL $f"; done

# --- 6. listing integrity ----------------------------------------------------
python3 $SP/listings.py && python3 $SP/match.py && python3 $SP/miss.py

# --- 7. the mutations (all on $SP/f2mut, reverted after each) ----------------
# S3 / B-M2 / D9:
sed -i "s|assign exact_zero = eff_sub & (sum27 == 27'd0);|assign exact_zero = (sum27 == 27'd0);|" \
  $SP/f2mut/ch09/fp32_addsub.v
cd $SP/f2mut/ch09 && iverilog -g2012 -Wall -o /tmp/m.vvp fp32_addsub.v tb_addsub_u.v && vvp /tmp/m.vvp
cd $SP/f2mut/ch12 && iverilog -g2012 -Wall -o /tmp/m.vvp \
  ../ch02/align_sticky.v ../ch07/fp32_fields.v ../ch07/fp32_class.v \
  ../ch09/fp32_unpack.v ../ch09/fp32_screen.v ../ch09/fp32_swap.v ../ch09/fp32_align.v \
  ../ch09/fp32_addsub.v ../ch09/fp32_normalize.v ../ch09/fp32_round_pack.v \
  ../ch09/fp32_add2.v ../ch11/fp32_add2_p2.v fp32_add4.v tb_cov4.v && vvp /tmp/m.vvp
#   → "exact_zero fired on an effective add 39 times"   (README says 38 — finding F1)
# F1 root cause: delete cov_gen.py's d=3 straddle line, regenerate, re-run → 38.
sed -i '/d=3 at ab: straddles the d<=2 bucket boundary/d' $SP/f2pre/ch12/cov_gen.py

# S5 / NOFD:  sed -i 's/f1_d2\[2\]/f1[2]/; s/f1_d2\[1\]/f1[1]/; s/f1_d2\[0\]/f1[0]/' ch12/fp32_add4.v
# S6 / T7:    sed -i 's/dut_t\.u_add_r\./dut_t.u_add_ab./g' ch10/tb_reach4.v
# S4 / D3:    change bank-2 `<=` to `=` in ch11/fp32_add2_p2.v (lines 107-110)
# S1 / M3:    ch09/fp32_normalize.v  `assign ns = 1'b0;`
# S2 / M8:    ch10/fp32_add4_tree.v  route u_add_r through r_raw, invert bit 22

# --- 8. headline claims ------------------------------------------------------
cd $REPO/guide/src && SIM_TIMEOUT=120 bash run_all.sh ch10 ch11 ch12 ch14
# the two closure demonstrations, which MUST fail:
cd $REPO/guide/src/ch12 && iverilog -g2012 -Wall -DALL_POSITIVE -o /tmp/ap.vvp <ch12 target 3 files> && vvp /tmp/ap.vvp
cd $REPO/guide/src/ch12 && iverilog -g2012 -Wall -DNO_DIRECTED  -o /tmp/nd.vvp <ch12 target 3 files> && vvp /tmp/nd.vvp
# the latency property, made to fail:
cd $REPO/guide/src/ch11 && iverilog -g2012 -Wall -DLAT=3 -o /tmp/l3.vvp <ch11 target 1 files> && vvp /tmp/l3.vvp

# --- 9. timing under load ----------------------------------------------------
for i in 1 2 3 4; do (while :; do :; done) & done
time vvp /path/to/tb_stream4.vvp ; kill %1 %2 %3 %4

# --- 13. restoration ---------------------------------------------------------
cd $REPO/guide/src && find . -type f | LC_ALL=C sort | xargs sha256sum | diff - $SP/baseline-src.sha256
cd $REPO/guide     && find . -type f | LC_ALL=C sort | xargs sha256sum | diff $SP/baseline-guide.sha256 -
```

Helper scripts written for this pass and left in the scratchpad:
`instrument.sh` (timing/stdout-capturing mirror of `run_all.sh`), `reach.py`
(manifest reachability), `listings.py` / `match.py` / `match2.py` / `miss.py`
(fenced-block extraction and adjudication), `mutrun.sh` (build-and-classify one
mutant), `xmodel.py` (`hwmodel.py` vs `oracle.py` cross-check).
