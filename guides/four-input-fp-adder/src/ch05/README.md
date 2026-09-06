# Chapter 5 source — verification methodology

Every file here was compiled and run under **Icarus Verilog 13.0** on macOS
(arm64, Homebrew) with `python3` 3.13.7 as the second reference; fix round 1
(2026-08-16) re-verified every target and added its checks under Icarus Verilog
13.0 and `python3` 3.11.15 on Linux (x86-64). Every complete listing in chapter
5 is a verbatim copy of a file in this directory; the shorter listings are
verbatim excerpts. Every block of output in the chapter is real captured stdout
from running these files.

```sh
iverilog -g2012 -Wall -o /tmp/sim <files...>
vvp /tmp/sim
```

Run the whole chapter through the guide's runner with
`cd .. && bash run_all.sh ch05`. It is **12 targets** and takes about 1.8 s
as last measured.

**Nothing here writes a file.** No testbench opens a `$dumpfile`, and nothing
uses `$readmemh`, so a regression run leaves the tree clean.

## Files

### Design modules

| File | Demonstrates |
|---|---|
| `adder8.v` | Chapter 4's device under test, unchanged. |
| `adder8_mut.v` | The same ports with `cout = a[7] \| b[7]` — the mutant chapter 4 could not kill. A separate module, so both can be driven from one testbench. |
| `counter6.v` | A modulo-6 counter, so the assertion examples have an invariant worth stating. `-DBREAK_WRAP` makes it wrap at 8. |

### Self-checking testbenches

| File | Files needed | Demonstrates |
|---|---|---|
| `tb_directed.v` | `adder8.v adder8_mut.v tb_directed.v` | Fourteen plausible carry-focused vectors, all of which the mutant survives; one more (`aa+55`) kills it. Asserts the survival, the kill, the vector count, and that the set really is half carrying. |
| `tb_random.v` | `adder8.v adder8_mut.v tb_random.v` | 200 vectors from the fixed `$random` stream (first kill on vector 0), then 2000 consecutive trials measuring the mean vectors-to-first-kill against the geometric 1/p = 3.969. |
| `tb_exhaustive.v` | `adder8.v adder8_mut.v tb_exhaustive.v` | All 65,536 pairs (1.4 s measured here): `adder8` proven correct, 16,512 mutant disagreements, first at pair 128, and the two excluded coverage bins proven unreachable. |
| `tb_scoreboard.v` | `adder8.v adder8_mut.v tb_scoreboard.v` | Generator / driver / monitor / scoreboard, a decorrelated reference model, an `exp ^ got` failure message, hand-rolled coverage over `{a[7], b[7], cout}` with two excluded bins, and end-of-test checks on the run itself — including `checks` against `driven`, so a phantom sample and a dropped sample cannot cancel. `+mode=ch04` replays chapter 4's eight vectors, reports 3 holes and 0 mutant exposures, and asserts the exact per-bin profile (4/1/3) computed independently in `python3`. |
| `tb_seed.v` | `tb_seed.v` | Bare `$random`/`$urandom` ignore `+seed=`; the seeded forms do not. And the first draw after seeding is a near linear function of the seed, which biases a re-seeded measurement from 0.25 to 0.47. |
| `tb_fpref.v` | `tb_fpref.v` | Twenty-eight binary32 corner cases, `shortreal` against a table computed in `python3` with `struct`. Bit comparison with `===`; NaN by class plus the quiet bit. Guards: no unfilled row, no duplicated `(a,b)` pair. |
| `tb_covfp.v` | `tb_covfp.v` | Thirty-four-bin functional coverage model in plain Verilog, three stimulus regimes, and `$fatal(1)` on an empty bin. `-DALL_POSITIVE` forces every operand positive and still closes 34/34 — the chapter's demonstration that closure measures stimulus, not correctness. |
| `tb_assert.v` | `counter6.v tb_assert.v` | Every assertion construct Icarus will run: immediate `assert`, `assert … else`, `assume`, immediate `cover`, inside `always @(posedge clk)` with an `if (!rst)` guard. Plus the value-sequence check assertions do not replace. |

### Deliberately broken examples

| File | Expect | The trap |
|---|---|---|
| `bad_srchain.v` | `run` | A `shortreal` chain computes in double precision and marks a correct design wrong. PASS means the trap reproduces. |
| `bad_tolerance.v` | `run` | A relative tolerance of 1e-6 accepts a real 1-ulp bug; an absolute tolerance of 1e-30 accepts a result 8,388,606 ulps wrong. |
| `bad_sva.v` | `xfail` | `assert property (@(posedge clk) req \|-> ##[1:3] ack);` — a syntax error at every `-g` level. |
| `bad_covergroup.v` | `xfail` | `covergroup` / `coverpoint` / `bins` — a syntax error at every `-g` level. |

### Runs that are supposed to be red

These are not regression targets. They are the transcripts the chapter quotes,
and each exits non-zero:

```sh
vvp sim +gen=uniform                       # tb_covfp: 11/34 bins, 23 holes
vvp sim +gen=narrow                        # tb_covfp: 33/34 bins, 1 hole
iverilog -g2012 -Wall -DBREAK_WRAP -o sim counter6.v tb_assert.v && vvp sim
```

And one run that is supposed to be green, which is the point being made:

```sh
iverilog -g2012 -Wall -DALL_POSITIVE -o sim tb_covfp.v && vvp sim
```

closes 34/34 and passes while no transaction in the run performs an effective
subtraction — taxonomy rows F and I never exercised at 100 % coverage.

## Mutation record

The guide's standing practice is that a testbench is not a test until it has
been seen to fail. **Forty-one mutations were applied** (thirty-seven in the
writing round, four more proving fix round 1's new checks), each to a copy of
this directory in a scratch tree, each rebuilt with the same
`iverilog -g2012 -Wall` and scored on `rc != 0` or `FAIL` in the output.
**Thirty-seven were killed; four survived and are explained below.** Nothing
was written into this directory. (These totals are recounts of the ledger
below. An earlier header said 42/38 — carried forward by arithmetic from a
miscounted first-round header instead of recounted, which is exactly the
failure mode this file exists to prevent.)

**`adder8` — 7 mutants, all caught**, each by all four adder targets
(`tb_directed`, `tb_random`, `tb_exhaustive`, `tb_scoreboard`): `a - b`;
`a + b + 1`; `a | b`; `cout` tied to `0`; `cout` tied to `1`;
`cout = a[7] & b[7]`; sum bit 3 stuck at zero. With `cout` tied to `0` every
failure line reads `xor=100` — the xor field naming the carry-out as the guilty
bit before anyone opens a waveform:

```
FAIL tb_scoreboard: [15000] check=1 a=5c b=ce exp=12a got=02a xor=100
```

**`adder8_mut` — 3 mutants, all caught.** Making it correct
(`cout = ((a + b) > 255)`) fails all four adder targets, because they assert
that it is wrong in a specific measured way. `a[7] & b[7]` and `a[7] ^ b[7]`
change the disagreement count away from 16,512 and are caught too.

**`counter6` — 6 mutants, all caught by `tb_assert`.** Wrap at 8
(`-DBREAK_WRAP`): the `q <= 5` assertion fires and the value sequence diverges.
Ignore `en`: the three-cycle hold check fires. No reset: `q` is `x` and the
X-check assertion fires. Count down: caught only by the value sequence — the
invariant `q <= 5` is true of a counter running backwards, which is why the
sequence check was added after the first mutation round let this one through.
Modulo 5: the cover point `q == 5` is never reached and the end-of-test
reachability check fires. Asynchronous reset
(`always @(posedge clk or posedge rst)`): `q` clears the instant `rst` rises
between edges instead of waiting for the posedge, and the between-edges reset
check fires — this mutant survived every target until fix round 1 added that
check, which closes chapter 4's `counter4` open concern for this chapter.

**Testbench mutations — 25 applied, 21 caught.**

| Mutation | Result |
|---|---|
| `tb_directed`: phase-1 loop bounded at zero | killed (applied-count guard) |
| `tb_directed`: a killing vector put into the directed set | killed (the survival assertion) |
| `tb_directed`: `ref_add` drops the carry | killed |
| `tb_directed`: replace the last carry vector with `0+0` | **survived** |
| `tb_exhaustive`: sweep only half the space | killed (pair-count guard) |
| `tb_exhaustive`: `ref_add` drops the carry | killed |
| `tb_exhaustive`: expected value taken from the DUT | **survived** |
| `tb_scoreboard`: monitor watches the mutant's pins | killed |
| `tb_scoreboard`: monitor never enabled | killed (checks-count guard) |
| `tb_scoreboard`: driver applies `a` twice, ignoring `b` | killed |
| `tb_scoreboard`: generator drops the one-MSB constraint | **survived** |
| `tb_scoreboard`: the last replayed ch04 vector changed to `00+01` | killed (pinned replay profile) — survived byte-identically before fix round 1's monitor-gate fix |
| `tb_scoreboard`: the trailing `@(posedge clk); #1;` before the gate closes deleted | killed (checks-vs-driven and profile guards) — the old trailing edge-wait was a no-op and this survived |
| `tb_fpref`: one expected value corrupted | killed |
| `tb_fpref`: reference subtracts instead of adding | killed |
| `tb_fpref`: a table row deleted | killed (unfilled-row guard) |
| `tb_fpref`: the tie-down row replaced by a duplicate of the tie-up row | killed (distinct-pairs guard) — survived before fix round 1 added it |
| `tb_fpref`: NaN quiet-bit requirement removed | **survived** |
| `tb_covfp`: generator loses its full-range exponent branch | killed (1 hole) |
| `tb_covfp`: corner-case library removed | killed |
| `tb_covfp`: `fclass` calls every `exp==ff` an infinity | killed |
| `tb_random`: phase 2 re-seeds per trial | killed (mean falls to 2.98) |
| `bad_srchain`: the round-trip removed | killed |
| `bad_tolerance`: the 1-ulp difference removed | killed |
| `tb_seed`: an asserted constant corrupted | killed |

**Every testbench in this directory fails on at least one mutation.**

One deliberate non-mutation is shipped as a flag rather than recorded as a
survivor: `tb_covfp.v` compiled with `-DALL_POSITIVE` forces every generated
operand positive and still closes 34/34 and passes. That is not a gap being
tolerated, it is the chapter's demonstration that this coverage model has no
sign/effective-operation dimension — `tb_covfp.v` contains no design under
test, so no mutation of arithmetic can fail it (replacing `fx + fy` with
`fx - fy` survives, by design of the file, and the chapter says so in place).

A second known blind spot, recorded for chapter 12, which inherits this file:
the bin *definitions* in `tb_covfp.v` are themselves unverified. Moving the
`expdbin` sticky boundary from 25 to 60 still closes 34/34 silently — a bin
edited wrong does not announce itself. Nothing checks a bin boundary against
anything the way `tb_exhaustive.v` checks the excluded scoreboard bins.

### The four survivors, and why

1. **`tb_directed`, replacing `255+128` with `0+0`.** The file asserts that the
   set is balanced (at least five carrying and five not) and that the mutant
   survives all of it. Six carrying vectors remain, so both claims still hold.
   The file does not claim to contain any particular vector, and should not.
2. **`tb_exhaustive`, expected value taken from the DUT.** No check inside a
   testbench can catch a reference model that *is* the design — the comparison
   becomes `x !== x` and passes forever. This is the golden-file hazard in its
   purest form, and the only defences are review and provenance. It is worth
   knowing that mutation testing has this blind spot.
3. **`tb_scoreboard`, generator drops the one-MSB constraint.** Every reachable
   bin has probability at least 0.124 under uniform 8-bit pairs, so 200
   transactions close the model either way. The constraint is the *pattern*,
   not a requirement at this scale — and the coverage model is what proves that,
   which is the argument for having one.
4. **`tb_fpref`, NaN quiet-bit requirement removed.** Relaxing a check can never
   fail a passing test. Every NaN result here is already quiet, so the weaker
   comparison agrees with the stronger one on this table. The check earns its
   place against a future design that propagates a signalling NaN.

## Reproducing the numbers

| Claim | How it was checked |
|---|---|
| 16,512 / 65,536 = 25.195 % | `tb_exhaustive.v` in Icarus, and an independent exhaustive loop in `python3` |
| first mutant kill at pair 128, `a=00 b=80` | `tb_exhaustive.v` |
| mean 3.9075 vectors to first kill | `tb_random.v`, 2000 trials; theory 1/p = 3.9690 |
| chapter 4's vectors fill 3 of 6 reachable bins, profile 4/1/3 | `tb_scoreboard.v +mode=ch04`, and an independent loop in `python3` |
| 28 binary32 corner cases | `tb_fpref.v` against `python3` `struct` |
| 11/34 → 33/34 → 34/34 | `tb_covfp.v` with `+gen=uniform`, `+gen=narrow`, default |
| coverage closure is seed-stable | `tb_covfp.v +seed=` 1, 2, 3, 99, 12345 — all 34/34 |
| 34/34 with every operand positive | `tb_covfp.v` compiled `-DALL_POSITIVE` |
| chained binary64 four-input reference wrong on 1.298 % (tree) / 1.295 % (sequential) of random normal quadruples | `python3`, 200,000 quadruples, per-step round-to-nearest-even binary32 vs one final rounding |
| catastrophic cancellation ≈ 0.59 % of random normal pairs | `python3`: exact P(\|Δexp\| ≤ 1) = 760/64516 = 1.178 %, halved for opposite signs, and a 2,000,000-pair Monte Carlo (0.590 %) |
| ~288,000 transactions/s | 1,000,000 `shortreal` adds in 3.47 s |
