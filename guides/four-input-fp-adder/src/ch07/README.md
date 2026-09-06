# Chapter 7 source — IEEE 754 single precision in depth

<!-- sections complete: 4/4 -->

## Files

Every file was compiled and run under **Icarus Verilog 13.0** (built from tag
`v13_0`) on Linux x86-64 with `iverilog -g2012 -Wall`, zero compiler output on
every target, with `python3` 3.11 (`struct`, `fractions`, `decimal`) as the
independent reference for every numeric constant. Every complete listing in
chapter 7 is a verbatim copy of a file here; the shorter listings are verbatim
excerpts, checked mechanically. Every block of output in the chapter is
captured stdout from these files or from the chapter's `python3` sessions,
re-run in the writing session.

### Design modules

| File | Demonstrates |
|---|---|
| `fp32_class.v` | Pure-combinational binary32 classifier: one-hot `{is_zero, is_sub, is_norm, is_inf, is_nan}` plus the `is_qnan`/`is_snan` split on fraction bit 22 and the sign. **A deliverable, not a demo**: chapters 9 and 12 instantiate it on the adder's operand and result paths. |
| `fp32_fields.v` | The unified field decode: `hidden = \|E`, `sig = {hidden, F}`, `e_eff = max(E, 1)` — the whole subnormal story in three assignments, and the vaccine against the halve-every-subnormal bug (chapter 5's row B). |

### Self-checking testbenches

| File | Files needed | Demonstrates |
|---|---|---|
| `tb_class.v` | `fp32_class.v` | 3,072-pattern boundary sweep (2 signs × all 256 exponent fields × 6 class-boundary fractions — every class transition forced by construction) against **three independent references**: the hex-range model on the magnitude bits, a one-hot/coverage invariant, and the simulator's own value-domain decoder via `$bitstoshortreal` (which cannot see the quiet/signalling split, because conversion quiets an sNaN — so that split is pinned by 20 directed vectors whose expected outputs were computed with python3). Sweep-count and directed-count guards. |
| `tb_fields.v` | `fp32_fields.v` | 3,060 finite patterns proved against `$bitstoshortreal` under ONE formula, value = (−1)^sign · sig · 2^(e_eff−150), exact equality with no tolerance (both sides are exact doubles). Plus the factor-of-two fingerprint of the wrong decode, pinned on 2^−140. Sweep-count guard. |
| `tb_encode.v` | — | The chapter's seven worked encodings plus the two escapes (overflow, exact threshold), the `-2.0**128` precedence trap, the epsilon probes at 1.0, two subnormal-range ties, and the 0.1×10 accumulation drift to `3f800001` — 17 `$shortrealtobits` known-answer checks + the accumulation, each constant python3-verified. Loop guard on the accumulation. |
| `tb_lab.v` | — | The four toolchain traps, 36 known-answer checks: assignment-does-not-round; sNaN quieted by a pure round-trip (payload kept) while qNaN payloads survive; generated-NaN class checks with the sign **printed, never asserted** (this host produces `ffc00000` at runtime and `7fc00000` from constant folding); infinity/overflow/zero-sum addition facts; and the rendering traps (`%f` hides subnormals and even the min normal, `%h` of a shortreal is a rounded integer, `$rtoi` truncates) pinned via `$sformatf` string compares. Check-count guard. |

There is no `warn` or `xfail` target: every trap this chapter teaches compiles
silently and misbehaves only at runtime, which is why each is pinned by a
known-answer check instead (see the header of `targets.txt`).

## Runs and reproduction

```sh
cd .. && bash run_all.sh ch07     # 4 targets, all green
```

or by hand from this directory:

```sh
iverilog -g2012 -Wall -o /tmp/sim fp32_class.v tb_class.v && vvp /tmp/sim
```

All four `run` targets compile with **zero** iverilog output under the
warning-gated harness. No target writes a file; build artifacts go to the
session scratchpad. Full-repo regression after adding this chapter: **82/82**.

Two transcripts in this directory's testbenches are architecture-dependent by
design and are flagged as such in the chapter: the *signs* of the generated
NaNs in `tb_lab.v` (`ffc00000` runtime / `7fc00000` constant-folded on this
x86-64 host; arm64 has been observed to differ) are printed but never
asserted. Every assertion on a generated NaN is class + quiet bit only.

## Mutation record

Standing practice: every testbench must be shown able to fail. Each mutation
was applied to a **copy** of the named file in the session scratchpad, rebuilt
with the shipped testbench(s), and run. **21 mutations: 19 killed, 2
survivors, both with written reasons.** Counts recounted from the table below,
not carried by arithmetic.

### `fp32_class.v` under `tb_class.v` (10 mutations, 9 killed)

| # | Mutation | Result | First failure |
|---|---|---|---|
| M1 | subnormal/normal edge off by one: `e_zero = (e <= 1)` | KILLED | range model at `00800000` (min normal read as *zero* — `e_zero` is the zero/subnormal selector, so the mutant routes it to the zero class, not the subnormal one) |
| M2 | quiet-bit test inverted: `is_qnan = is_nan & ~f[22]` | KILLED | range model at `7f800001` |
| M3 | infinity exponent check wrong: `e_ones = (e == 254)` | KILLED | range model at `7f000000` |
| M4 | `is_nan` misses sNaN: `is_nan = e_ones & f[22]` | KILLED | range model at `7f800001` (one-hot also fails) |
| M5 | `is_zero` ignores the fraction: `is_zero = e_zero` | KILLED | range model at `00000001` (zero and subnormal both high) |
| M6 | sign tied low: `sign = 1'b0` | KILLED | range model at `80000000` |
| M7 | exponent field misaligned: `e = w[31:24]` | KILLED | range model at `00800000` |
| M8 | fraction-zero test drops bit 22: `f_zero = (f[21:0] == 0)` | KILLED | range model at `00400000` |
| M9 | `is_qnan = e_ones & f[22]` (drops the `~f_zero` implied by `is_nan`) | **SURVIVED** | provably output-equivalent: `f[22] = 1` implies `f != 0`, so `e_ones & f[22] == is_nan & f[22]` for every pattern. An equivalent mutant, not a testbench gap. |
| M20 | `is_inf = e_ones` (accepts NaNs as infinity) | KILLED | range model at `7f800001` (one-hot also fails) |

### `fp32_fields.v` under `tb_fields.v` (4 mutations, 4 killed)

| # | Mutation | Result | First failure |
|---|---|---|---|
| M10 | `e_eff = e_raw` (the classic subnormal bug: no `max(E,1)`) | KILLED | `00000001` decodes to 7.006492e-46 vs 1.401298e-45 — the testbench's own kill message displays the factor-of-two fingerprint |
| M11 | `hidden = 1'b1` always | KILLED | `00000000` decodes nonzero |
| M12 | `sig = {1'b0, frac}` | KILLED | `00800000` decodes to zero |
| M13 | ternary swapped: `e_eff = hidden ? 1 : e_raw` | KILLED | `00000001` (subnormals half; normals also wrong) |

### Testbench-side mutations (7 mutations, 6 killed)

What would have to break for each PASS to be a lie — loop guards and check
executability, per the standing practice.

| # | Mutation | Result | First failure |
|---|---|---|---|
| M14 | `tb_class.v` sweep stops at `ei <= 254` | KILLED | sweep-count guard: `3060 sweep checks, expected 3072` |
| M15 | `tb_class.v` directed expectation wrong (qNaN vector marked sNaN) | KILLED | directed check at `7fc00055` — proves the directed comparisons execute |
| M16 | `tb_encode.v` golden constant off by one ulp (`3DCCCCCC`) | KILLED | the 0.1 check |
| M17 | `tb_encode.v` accumulation loop runs zero times | KILLED | loop guard: `accumulation loop ran 0 times` |
| M18 | `tb_lab.v` one `chk` call deleted | KILLED | check-count guard: `35 checks ran, expected 36` |
| M19 | `tb_fields.v` sweep starts at `ei = 1` (skips E = 0) | KILLED | sweep-count guard: `3048 checks, expected 3060` |
| M21 | `tb_class.v` entire value-domain reference (reference 2) deleted | **SURVIVED** | a check *deletion* is a relaxation and is invisible to a run — the other two references still pass everything, and the PASS banner still (falsely) says "x 3 references". Same survivor class chapter 6 recorded: only mutation analysis itself, or a reviewer, catches a deleted check. |

### Reading the record

The hex-range reference caught every classifier mutation before the value
model or the one-hot check got a turn (they report later in the same run); the
kill messages above quote the first line printed. The two survivors are the
two honest limits of the method: M9 is equivalence (no testbench can kill it,
and the proof is one line), M21 is relaxation (no run can notice its own
missing check).

## Known blind spots

Recorded for chapters 9 and 12, which instantiate `fp32_class`:

- **The quiet/signalling split rests on the directed vectors alone.** The
  value-domain reference cannot see it (conversion quiets an sNaN — measured,
  `tb_lab.v`), and the hex-range reference for the split shares this
  directory's origin with the DUT even though it is a different formulation.
  The 20 directed expectations were computed by an independent python3 script
  this session; if the split's definition is ever in doubt, re-derive those
  constants first.
- **`tb_fields.v` proves values, not field semantics, for E = 255.** `sig`
  and `e_eff` are driven but meaningless for infinities and NaNs, and no
  check touches them there — by design; the module header says to screen with
  `fp32_class` first. A chapter 9 datapath that consumes `sig` for an
  unscreened NaN is outside anything verified here.
- **The sign of zero passes `tb_fields.v` vacuously** (`-0.0 == 0.0` in the
  real domain), so the zero rows check magnitude only; the sign bit itself is
  checked separately against `w[31]` and in `tb_class.v`.
- **M21's lesson applies to every testbench here**: a deleted or weakened
  check cannot fail a run. The check-count guards pin the number of checks
  that ran, not their strength.
