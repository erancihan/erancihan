# Chapter 2 source — the Verilog language

Every file here was compiled and run under **Icarus Verilog 13.0** on macOS
(arm64, Homebrew). Every complete listing in chapter 2 is a verbatim copy of a
file in this directory; the shorter listings are verbatim excerpts from those
files, with any elision marked `// ...`. A handful of short illustrative
fragments in the chapter — a declaration, an expression, a pair of contrasting
lines — have no backing file. Every block of simulator output in the chapter is
real captured stdout from running these files.

## The two lines you will type a thousand times

```sh
iverilog -g2012 -Wall -o /tmp/sim <files...>
vvp /tmp/sim
```

`-g2012` selects the language generation (needed for `'0`/`'1` fill literals,
size casts, `shortreal`). `-Wall` turns on the warning classes
`anachronisms, implicit, macro-replacement, portbind, select-range, timescale,
sensitivity-entire-array`. Put the build output somewhere outside this
directory; nothing here is a build artifact.

Every `tb_*.v` self-checks: it prints `PASS <name>` on success, or calls
`$fatal(1, ...)` so the process exits non-zero. Files named `bad_*.v` are
**deliberately wrong teaching examples**. They also self-check, but they assert
the *wrong* answer, so `PASS` from a `bad_*` file means "the trap still
reproduces on your simulator". Two files are meant not to compile at all:
`bad_nettype_none.v` and `bad_align_shw.v`.

## Files

### Design modules

| File | Demonstrates |
|---|---|
| `half_adder.v` | The smallest complete module: ANSI ports, two `assign` statements. |
| `adder_ansi.v` | Parameterised adder, ANSI-2001 port list, the `{cout, sum}` idiom. |
| `adder_1995.v` | The same adder in Verilog-1995 non-ANSI style. Read-only reference. |
| `full_adder.v` | Chapter 1's full adder built from `xor`/`and`/`or` gate primitives. |
| `ripple4.v` | Four `full_adder` instances chained: structural composition. |
| `mux2.v` | The 2:1 multiplexer as one conditional operator. |
| `comb_max.v` | `output reg` driven from `always @(*)` — combinational, no flip-flops. |
| `align_sticky.v` | Alignment right-shift exposing guard, round and sticky separately. Chapter 8 seed. |
| `round_ne.v` | Round-to-nearest-even decision from guard/round/sticky and the LSB. Chapter 8 seed. |
| `byte_select.v` | Indexed part-selects `[base +: 8]` and `[base -: 8]`. Chapter 9 seed. |
| `lzc8.v` | Leading-zero count as a `function` with an unrolled `for` loop. |
| `mant_add.v` | Mantissa add that keeps its carry, via a concatenated target. |

### Self-checking testbenches

| File | Build and run | Demonstrates |
|---|---|---|
| `tb_half_adder.v` | `iverilog -g2012 -Wall -o /tmp/sim half_adder.v tb_half_adder.v && vvp /tmp/sim` | All four input combinations. |
| `tb_adder_ansi.v` | `iverilog -g2012 -Wall -o /tmp/sim adder_ansi.v tb_adder_ansi.v && vvp /tmp/sim` | 512 exhaustive cases at `W=4`, plus a parameter override. |
| `tb_port_styles.v` | `iverilog -g2012 -Wall -o /tmp/sim adder_ansi.v adder_1995.v tb_port_styles.v && vvp /tmp/sim` | ANSI vs 1995, named vs positional, hierarchical names. |
| `tb_ripple4.v` | `iverilog -g2012 -Wall -o /tmp/sim full_adder.v ripple4.v adder_ansi.v tb_ripple4.v && vvp /tmp/sim` | Structural adder equals dataflow adder over all 512 cases. |
| `tb_mux2.v` | `iverilog -g2012 -Wall -o /tmp/sim mux2.v tb_mux2.v && vvp /tmp/sim` | `?:`, including the bitwise merge on an `x` selector. |
| `tb_comb_max.v` | `iverilog -g2012 -Wall -o /tmp/sim comb_max.v tb_comb_max.v && vvp /tmp/sim` | `reg` is not a register. |
| `tb_drivers.v` | `iverilog -g2012 -Wall -o /tmp/sim tb_drivers.v && vvp /tmp/sim` | Multiple drivers resolving to `x`, `wand`/`wor`, `supply0`/`supply1`. |
| `tb_align_sticky.v` | `iverilog -g2012 -Wall -o /tmp/sim align_sticky.v tb_align_sticky.v && vvp /tmp/sim` | Guard/round/sticky against an independent model, at two parameter pairs. |
| `tb_round_ne.v` | `iverilog -g2012 -Wall -o /tmp/sim round_ne.v tb_round_ne.v && vvp /tmp/sim` | All 16 guard/round/sticky/LSB combinations against the IEEE 754 rule. |
| `tb_byte_select.v` | `iverilog -g2012 -Wall -o /tmp/sim byte_select.v tb_byte_select.v && vvp /tmp/sim` | Variable-base part-select, 804 cases. |
| `tb_lzc8.v` | `iverilog -g2012 -Wall -o /tmp/sim lzc8.v tb_lzc8.v && vvp /tmp/sim` | All 256 inputs against a golden model. |
| `tb_mant_add.v` | `iverilog -g2012 -Wall -o /tmp/sim mant_add.v bad_mant_add.v tb_mant_add.v && vvp /tmp/sim` | Correct and broken mantissa adders side by side. |
| `tb_widths.v` | `iverilog -g2012 -Wall -o /tmp/sim tb_widths.v && vvp /tmp/sim` | Self-determined vs context-determined operands; silent truncation. |
| `tb_signedness.v` | `iverilog -g2012 -Wall -o /tmp/sim tb_signedness.v && vvp /tmp/sim` | Signed/unsigned contamination in `/`, `*`, `<`, `>>>`. |
| `tb_literals.v` | `iverilog -g2012 -Wall -o /tmp/sim tb_literals.v && vvp /tmp/sim` | Sizing, bases, `x`/`z` fill, signed literals, `'0`/`'1`/`'x`/`'z`. |
| `tb_operators.v` | `iverilog -g2012 -Wall -o /tmp/sim tb_operators.v && vvp /tmp/sim` | Reduction, logical vs bitwise, the four equality operators, `==?`. |
| `tb_partsel.v` | `iverilog -g2012 -Wall -o /tmp/sim tb_partsel.v && vvp /tmp/sim` | Part-selects, `+:`/`-:`, arrays, out-of-range selects. |
| `tb_systasks.v` | `iverilog -g2012 -Wall -o /tmp/sim tb_systasks.v && vvp /tmp/sim` | Format specifiers, `$clog2`, `$random` vs `$urandom`, `$shortrealtobits`, severity tasks. |
| `tb_procedural.v` | `iverilog -g2012 -Wall -o /tmp/sim tb_procedural.v && vvp /tmp/sim` | Unrolled `for` vs delayed `for`, `function` vs `task`, `automatic` recursion. |

### Deliberately broken examples

| File | Build and run | The trap |
|---|---|---|
| `bad_positional.v` | `iverilog -g2012 -Wall -o /tmp/sim adder_ansi.v bad_positional.v && vvp /tmp/sim` | Positional port connection silently mis-wires `b` and `cin`. |
| `bad_implicit.v` | `iverilog -g2012 -Wall -o /tmp/sim bad_implicit.v && vvp /tmp/sim` | A typo on the LHS of an `assign` creates a 1-bit implicit wire. |
| `bad_nettype_none.v` | `iverilog -g2012 -Wall -o /tmp/sim bad_nettype_none.v` | **Must not compile.** The same typo under `` `default_nettype none ``. |
| `bad_mant_add.v` | built by `tb_mant_add.v` above | `assign carry = (a+b) >> W;` evaluates the add at one bit. |
| `bad_carry_always.v` | `iverilog -g2012 -Wall -o /tmp/sim bad_carry_always.v && vvp /tmp/sim` | The same width bug procedurally: `@* found no sensitivities`. |
| `bad_begin_end.v` | `iverilog -g2012 -Wall -o /tmp/sim bad_begin_end.v && vvp /tmp/sim` | Indentation is not syntax; the second statement runs unconditionally. |
| `bad_casex.v` | `iverilog -g2012 -Wall -o /tmp/sim bad_casex.v && vvp /tmp/sim` | One `x` in a `casex` selector matches the first item. |
| `bad_recursion.v` | `iverilog -g2012 -Wall -o /tmp/sim bad_recursion.v && vvp /tmp/sim` | Recursion without `automatic` is evaluation-order dependent. |
| `bad_align_shw.v` | `iverilog -g2012 -Wall -o /tmp/sim align_sticky.v bad_align_shw.v` | **Must not compile.** `W=32, SHW=5` violates `align_sticky`'s precondition. |

## Expected warnings

Some files emit warnings **on purpose**. These are correct, not defects:

- `bad_positional.v` — two ungated port-width warnings about padded and pruned ports.
  Despite appearances these are not the `portbind` class; `-Wno-portbind` does not
  suppress them, and they appear with no `-W` switch at all.
- `bad_implicit.v` — `implicit definition of wire 'godo'`.
- `bad_carry_always.v` — `@* found no sensitivities so it will never trigger`.
- `tb_literals.v` — `Numeric constant truncated to 4 bits` (from `4'd31`).
- `tb_partsel.v` — four `select-range` warnings from the out-of-range selects
  (lines 38, 39 and two from line 40).

Everything else compiles silent under `-Wall`.
