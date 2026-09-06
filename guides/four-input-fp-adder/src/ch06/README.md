# Chapter 6 source — binary number systems and fixed point

<!-- sections complete: 4/4 -->

## Files

Every file was compiled and run under **Icarus Verilog 13.0** (built from tag
`v13_0`) on Linux x86-64 with `iverilog -g2012 -Wall`, and `python3` 3.11 as
the independent reference. Every complete listing in chapter 6 is a verbatim
copy of a file here; the shorter listings are verbatim excerpts, checked
mechanically (substring match of every fenced block against the files). Every
block of output in the chapter is captured stdout from these files or from the
research-derived `python3` scripts re-run in the writing session.

**Zero compile warnings across all targets is a chapter finding, not just
hygiene**: `tb_signtraps.v` deliberately contains every signedness/width bug
class the chapter teaches, and `-Wall` says nothing about any of them.

### Design modules

| File | Demonstrates |
|---|---|
| `satq44.v` | Q4.4 saturating adder: widen by one, top-two-bits overflow rule, clamp mux. Exposes `y_wrap`, `y_sat` and `ovf` so both policies are visible at once. |
| `fixmul44.v` | Q4.4 x Q4.4 exact multiply (Q8.8) plus three Q8.4 requantizers: floor (`>>>`), round-half-up, and round-half-even via the ZipCPU convergent-rounding add. |

There is no local adder module: the first two targets deliberately compile
chapter 2's `../ch02/ripple4.v` and `../ch02/full_adder.v`, unmodified, to
prove the chapter's claims on hardware the reader has already built.

### Self-checking testbenches

| File | Files needed | Demonstrates |
|---|---|---|
| `tb_sub4.v` | `../ch02/ripple4.v ../ch02/full_adder.v` | `a - b = a + ~b + 1` on the real ripple adder, all 256 pairs, plus `cout == (a >= b)` (carry-out as not-borrow). Zero-iteration guard on the sweep. |
| `tb_ovf4.v` | `../ch02/ripple4.v ../ch02/full_adder.v` | The three signed-overflow rules (two-MSB-carries with `c3` recovered from the ports as `s[3]^a[3]^b[3]`, sign rule, widen-by-one) against ground truth on all 256 add pairs; the C/V census 108/84/28/36 asserted; subtraction V via `a+~b+1` on all 256 pairs. |
| `tb_satq44.v` | `satq44.v` | Exhaustive 65,536 pairs against an integer reference model; overflow census asserted at exactly 16,384 (computed independently in python3); sweep-completeness guard. |
| `tb_fixmul44.v` | `fixmul44.v` | Exhaustive 65,536 pairs against an arithmetic reference (`%`-based, nothing like the DUT's shift-and-add); bias ledger asserted against python3 totals: floor -425984 sixteenths, half-up +65536, half-even exactly 0, ties 8192. |
| `tb_signtraps.v` | — | 49 known-answer checks pinning the measured signedness behaviors: poisoning (incl. `u*0` and literal forms), `>>`/`>>>`, widening by RHS signedness, part-select unsignedness, `u < 0`, product widths, `-8'd3` literals, `%d` pad widths, and the five silent continuous assignments. |

## Runs and reproduction

```sh
cd .. && bash run_all.sh ch06     # 5 targets, all green
```

or by hand from this directory:

```sh
iverilog -g2012 -Wall -o /tmp/sim ../ch02/ripple4.v ../ch02/full_adder.v tb_sub4.v && vvp /tmp/sim
```

**Nothing here writes a file.** No testbench opens a `$dumpfile` and nothing
uses `$readmemh`, so a regression run leaves the tree clean. All watchdogs are
time-based per the standing rule.

The chapter's `python3` numbers (0.1's expansion, the five-meanings table, the
C/V census, Q-format tables, rounding-bias table, the 100k-sample drift with
`random.seed(42)` / `randint(-2048, 2047)`, the L/R/S identity, dynamic-range
dB figures, and the fixmul bias totals) were computed by scripts in the
session scratchpad and re-derived from scratch in the writing session; the
testbenches assert the Verilog-facing subset of them.

## Mutation record

The guide's standing practice: a testbench is not a test until it has been
seen to fail. **Twenty-five distinct mutations were applied** in the writing
session (twenty-seven runs — the two adder-chain mutations were run against
both ripple4 testbenches), each to a copy of this directory plus chapter 2's
two adder files in a scratch tree, each rebuilt with `iverilog -g2012 -Wall`
and scored on `rc != 0` or `FAIL` in the output. **Twenty-two were killed;
three survived and are explained below.** Nothing was written into this
directory. Every testbench here fails on at least one mutation.

| # | Mutation | Result |
|---|---|---|
| M1 | `full_adder`: `cout` OR gate replaced by AND | killed by `tb_sub4` AND by `tb_ovf4` |
| M2 | `ripple4`: `cout = c[3]` instead of `c[4]` | killed by `tb_sub4` AND by `tb_ovf4` |
| M3 | `tb_sub4`: `cin` tied 0 instead of 1 | killed (every difference off by one) |
| M4 | `tb_sub4`: `.b(b)` — inverters forgotten | killed |
| M5 | `tb_sub4`: zero-iteration sweep (`ia < 0`) | killed (sweep-completeness guard) |
| M6 | `tb_ovf4`: ground-truth range `> 8` instead of `> 7` | killed |
| M7 | `tb_ovf4`: `c3` recovered as `a[3]^b[3]`, dropping `s[3]` | killed |
| M8 | `satq44`: `ovf = full[8] & full[7]` | killed by `tb_satq44` |
| M9 | `satq44`: clamp directions swapped | killed |
| M10 | `satq44`: widening forgotten (`full` declared `[7:0]`) | killed — the trap the chapter names, proven caught |
| M11 | `satq44`: `y_wrap = full[8:1]` | killed |
| M12 | `tb_satq44`: half sweep (`ia < 0`) | killed (pairs-count guard) |
| M13 | `tb_satq44`: reference `ovfv` tied 0 | killed |
| M14 | `fixmul44`: convergent addend `{L, LLL}` instead of `{L, ~L~L~L}` | killed by `tb_fixmul44` (ties break) |
| M15 | `fixmul44`: half-up adds 7 instead of 8 | killed |
| M16 | `fixmul44`: `p_trunc = p_full >> 4` (logical shift) | **survived** — see below |
| M17 | `fixmul44`: product computed as `$unsigned(a) * $unsigned(b)` | killed |
| M18 | `tb_fixmul44`: reference rounds ties to odd | killed (DUT-vs-reference mismatch on every tie) |
| M19 | `tb_fixmul44`: asserted floor total off by one | killed (bias assertions are live) |
| M20 | `tb_fixmul44`: inner sweep short by one (`ib < 127`) | killed (pairs-count guard) |
| M21 | `tb_signtraps`: poisoned-add check asserts the naive −1 | killed (the file pins measured behavior, not intent) |
| M22 | `tb_signtraps`: `(s12 + u12*0)` replaced by `(s12 + 0)` | killed (the `u*0` poison line is load-bearing) |
| M23 | `tb_signtraps`: one repair check deleted outright | **survived** — see below |
| M24 | `tb_signtraps`: `es` initialised to +3 | killed (the five wire assertions notice) |
| M25 | `tb_satq44`: reference `wrapv` taken from the DUT's own `y_wrap` | **survived** — see below |

## The three survivors, and why

1. **M16, `>>` for `>>>` in `p_trunc` — output-equivalent, and the exhaustive
   sweep is the proof.** The logical and arithmetic shifts of the 16-bit
   product differ only in bits [15:12], and `p_trunc` keeps only bits [11:0],
   so the two spellings produce identical outputs on **all** 65,536 inputs —
   the sweep that failed to kill the mutant is itself the exhaustive
   demonstration of equivalence, which is the one situation where "survived"
   does not mean "gap in the stimulus" (chapter 4's rule needs an exhaustive
   sweep before it flips). The chapter's `>>`-vs-`>>>` trap is real when the
   result width equals the operand width; here the discarded top bits are
   where the difference lives. A 16-bit `p_trunc` port would kill this mutant
   on every negative odd product. The same equivalence covers all three
   requantizer outputs — `p_even = cvg >> 4` survives identically (verified
   by the chapter 6 review) — so a reader re-running this menu should not
   read those as unrecorded gaps.
2. **M23, deleting a check — relaxing a test can never fail a passing run.**
   Same class as chapter 5's survivor 4: no run detects the absence of a
   check, only review does. Recorded as the standing reason mutation lists
   must name what they *tried*, not just what failed.
3. **M25, reference model taken from the DUT — the golden-file hazard.** Same
   class as chapter 5's survivor 2: a comparison of a value against itself
   passes forever, and nothing inside the testbench can detect it. The
   defences are provenance and review; here the shipped references are
   integer/`%`-arithmetic models deliberately unlike the DUT structures.
   (Only `wrapv` was mutated this way; `satv`, `ovfv` and the census guard
   remained independent, and the run still passed, which is exactly the
   point — a partial self-reference is just as silent.)

A known limit of the bias ledger, found by the chapter 6 review: the ledger
assertions alone cannot catch a *direction-symmetric* tie error. A ties-to-odd
mutant passes `sum_even == 0` and `ties == 8192` exactly — odd-rounding is as
balanced as even-rounding, and the tie count does not depend on the direction
taken. Only the per-pair check against the Python-derived expected value kills
it. The per-pair check is load-bearing; the ledger is a summary, not a guard.
