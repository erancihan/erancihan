# `src/ch14/` — the one measurement chapter 14 makes for itself

Chapter 14 is the guide's last chapter and its subject is other people's work:
multi-operand adder architectures, IEEE 754-2019 clause 9.5, bfloat16 / FP16 /
TF32 / FP8 / posits, tensor cores, and an annotated bibliography of 87 sources.
None of that can be measured here. The chapter's discipline is therefore
citation hygiene, not mutation testing — every URL carries a fetch status and a
date, and every unfetchable source is tagged `[title-only]` with the reason.

One question is the exception, and it is why this directory exists.

## The question

Fasi, Higham, Mikaitis and Pranesh, *Numerical Behavior of NVIDIA Tensor Cores*
(MIMS EPrint 2020.10, `https://eprints.maths.manchester.ac.uk/2774/1/fhmp20.pdf`,
HTTP 200 on 2026-08-21), reverse-engineered a V100 tensor core's five-term
accumulator and reported, verbatim:

> "We can show that the lack of normalization causes the dot product in tensor
> cores—and most likely in any other similar architectures in which partial sums
> are not normalized …—to behave non-monotonically."

Mikaitis, *Monotonicity of Multi-Term Floating-Point Adders* (arXiv:2304.01407,
HTTP 200 on 2026-08-21) generalizes it: multi-term addition with **n ≥ 4** and
no normalization of intermediate quantities "can result in non-monotonicity --
increasing one of the addends x_i decreases the sum s_n."

Chapter 12's `fp32_add4` is n = 4 and every intermediate **is** a normalized,
correctly rounded binary32 value, because the design is three real binary32
additions. So it should be monotonic. Chapter 14's research pass flagged that
"should" as an inference and refused to let the chapter state it as a result.
`tb_mono4.v` turns it into one.

## What ships

| file | what it is |
|---|---|
| `tb_mono4.v` | the monotonicity sweep. No new RTL — the DUT is chapter 10's `fp32_add4_tree`. |
| `targets.txt` | one `run` row. |

**No new RTL anywhere in this chapter.** The DUT is `../ch10/fp32_add4_tree.v`,
which chapter 12's `tb_add4_stream` proves bit-identical to the shipped
pipelined `fp32_add4` over 60,000 quadruples (101,000 in the headline run). The
monotonicity result transfers to the shipped adder along that proven
equivalence, not by assumption.

**The format-census python is not here on purpose.** The bfloat16 / FP16 / TF32 /
FP8 / posit tables in the chapter come from three short `python3` models that
compute each format's census from `(ew, mw)` alone. They are printed in the
chapter text and labelled illustrative, not shipped as targets: there is no
Verilog in them, chapter 12's documented `.py` extension is scoped to `ch12/`
only, and a generator with nothing to generate would be a decorative artifact.
They are reproducible by copy-paste and are validated in the chapter against
three independent published tables.

## The property, precisely

For non-NaN operands and a non-NaN result, replacing any one addend by the next
binary32 value strictly above it must not decrease the result in the
real-number ordering.

Ordering uses the sign-magnitude-to-unsigned key `key(w) = w[31] ? ~w : (w |
32'h8000_0000)` after canonicalizing `-0` to `+0`, so `-0` and `+0` compare
**equal**. NaN is unordered, so a NaN base is skipped and counted.

A base that is **not** NaN whose bumped result **is** NaN is counted separately
(`n_nanborn`) and is **not** scored as a violation. It is real and directed
vector D2 pins one: with `c+d` overflowing to `-inf` and `a+b` finite, the sum
is `-inf`; one ulp on `a` overflows `a+b` to `+inf` and the sum becomes qNaN.
That is the intermediate-overflow discontinuity chapter 12's S3 documents, seen
from the order side.

## Results, this session (2026-08-21, Icarus 13.0, Linux x86-64)

Shipped size `NT=2500` per regime — 10,000 trials, ~7 s:

```
tb_mono4 census: 39605 ordered comparisons (11737 strictly up, 27868 unchanged),
23 NaN-born, 26 NaN-base trials skipped, 268 ports unbumpable, 6 directed
PASS tb_mono4 (39605 one-ulp increases, 0 non-monotonic)
```

Headline run, same binary at `-DNT=25000` — 100,000 trials, 68 s:

```
tb_mono4 census: 396225 ordered comparisons (117382 strictly up, 278843 unchanged),
203 NaN-born, 255 NaN-base trials skipped, 2552 ports unbumpable, 6 directed
PASS tb_mono4 (396225 one-ulp increases, 0 non-monotonic)
```

**396,225 one-ulp increases, zero decreases.** Note the shape of the census as
well as the headline: **70.4 %** of one-ulp increases on an addend do not move
the four-input sum at all. That is the composition absorbing the perturbation,
and it is why the property is weak — see the mutation record.

## Mutation record — 9 mutants, 9 kills; 3 required failures, 3 observed

Standing project rule since chapter 4: a testbench that has never been seen to
fail is not yet a test. Mutants were applied to scratchpad copies of the RTL,
never to `guides/four-input-fp-adder/src/`.

| # | mutation | verdict | killed by | order violations |
|---|---|---|---|---|
| M1 | sign bit of the tree result inverted (applied at the tree's `result` port: `assign result = {~r_raw[31], r_raw[30:0]};`) | **KILLED** | **the monotonicity check** *and* directed | **11,744 errors; census shows `0 strictly up`, so the inert-stimulus guard fires too** |
| M2 | result mantissa bits 22 and 23 swapped (at the tree's `result` port: `{r_raw[31:24], r_raw[22], r_raw[23], r_raw[21:0]}`) | **KILLED** | **the monotonicity check** *and* directed | **29 errors, including genuine non-monotonic pairs** |
| M3 | `fp32_normalize` sticky forced to 0 | **KILLED** | directed D3 | 0 |
| M4 | `fp32_normalize` sticky forced to 1 | **KILLED** | directed D1 | 0 |
| M5 | `fp32_round_pack` `round_up` forced to 1 | **KILLED** | directed D1 | 0 |
| M6 | `fp32_round_pack` `round_up` forced to 0 (truncate) | **KILLED** | directed D3 | 0 |
| M7 | level-2 add fed `sum_ab` twice — `c`, `d` dropped | **KILLED** | directed D1 | 0 |
| M8 | result mantissa bit 22 inverted | **KILLED** | directed D1 | 0 |
| M9 | result bit 1 inverted **only** when the result exponent is in [200, 220] | **KILLED** | **the monotonicity check itself** | **358** |

**The interesting column is the last one.** *Six* of nine mutants (M3-M8) were
caught ONLY by the six *pinned directed vectors*, not by the order property —
every one is a wrong-value bug that is still perfectly monotonic. M9,
deliberately localized so the directed vectors never touch it, is caught by
monotonicity alone and needed 358 violations out of 39,605 comparisons to show
up. M1 and M2 are caught by both.

**Corrected 2026-08-21 by the chapter 14 review, which re-ran the mutants.**
This table first recorded M1 and M2 at *0* order violations and the paragraph
claimed eight-of-nine monotone. That was wrong and is worth recording as a
failure of this project's own standing rule: a mutation row is a measurement
and must be re-run, not reasoned about. Inverting the sign bit *reverses* the
order wherever the sum strictly increases — it cannot be monotone — and the
bit-swap perturbs it too. The mutation specifications above are now precise
enough (module, signal, bit indices) to re-run exactly.

That is the honest characterisation of this measurement: **monotonicity is a
weak property.** It is worth measuring because the literature poses it about
real deployed hardware and because a Class IV accumulator genuinely fails it —
but it does not begin to replace chapters 9-12's equivalence sweeps, and this
directory would be misleading without saying so.

Required failures — checks that must fire when the bench is undermined:

| # | undermining | expected | observed |
|---|---|---|---|
| R1 | `-DNT=0` | FAIL, not a vacuous pass | 3 guards fired: the `NT < 100` floor, the NaN-born path, the strict-increase path |
| R2 | one directed vector deleted | FAIL on the count | `FAIL tb_mono4: 5 directed vectors ran, expected 6` |
| R3 | `ordkey`'s negative branch broken (`~v` → `v`) | FAIL before any DUT vector runs | 5 key-ladder failures |

R1 is worth reading twice. The relative guard `n_cmp < NT*4` is **satisfied by
NT = 0** — the exact vacuity trap chapter 12's `targets.txt` records for
`tb_equiv4`'s `NQ`. The absolute floor (`NT < 100`) had to be added in front of
it, and the two behavioural guards (the NaN-born path fired; at least one
comparison strictly increased) catch an inert stimulus generator independently.

R3 is the checker's own checker: `task keyladder` walks twelve pinned values
from `-inf` to `+inf`, requires `-0` and `+0` to compare **equal**, and requires
`nextup` to move up the ladder — all before the DUT sees a vector. A
monotonicity bench with a broken comparator certifies anything.

## Reproducing

```
cd guides/four-input-fp-adder/src && bash run_all.sh ch14          # shipped size, ~7 s
```

Headline run, out of harness:

```
iverilog -g2012 -Wall -DNT=25000 -o /tmp/mono.vvp \
  ../ch02/align_sticky.v ../ch07/fp32_fields.v ../ch07/fp32_class.v \
  ../ch09/fp32_unpack.v ../ch09/fp32_screen.v ../ch09/fp32_swap.v \
  ../ch09/fp32_align.v ../ch09/fp32_addsub.v ../ch09/fp32_normalize.v \
  ../ch09/fp32_round_pack.v ../ch09/fp32_add2.v ../ch10/fp32_add4_tree.v \
  tb_mono4.v && vvp /tmp/mono.vvp
```

Wall-clock figures above are this session's observations on a loaded shared
container, not contracts — chapter 12's timing-drift note applies.
