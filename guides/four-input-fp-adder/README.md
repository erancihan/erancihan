# A Four-Input IEEE 754 Adder, Built and Proved in Verilog

> A guide to floating point arithmetic in RTL that ends with a working
> artifact: a **pipelined four-input IEEE 754 binary32 adder**, written in
> Verilog, specified in writing, and verified against exact-arithmetic
> reference models — every listing compiled, every testbench shown able to
> fail, every number in the prose measured rather than recalled.

<p align="center">
  <em>"A test you have never seen fail is not a test."</em>
</p>

---

## What this is

Fourteen chapters, ~176,000 words, and a source tree of **123 build targets**
that all pass from a cold checkout. It starts at logic gates and ends at the
research frontier, but the spine is one engineering problem carried the whole
way: how do you add four floating point numbers in hardware, and how do you
*know* the answer is right?

The design is real. `src/ch12/` holds `fp32_add4` — a four-input binary32
adder built as a pipelined tree of verified two-input adders, with a written
ten-clause specification, a 105-bin functional coverage model whose bin
definitions are themselves falsifiable, and a corner-case suite organised by
a nine-row taxonomy of the ways floating point addition goes wrong.

## The method

Three rules governed every chapter, and the guide states plainly where each
one stopped:

1. **Every listing compiles.** Each Verilog listing existed as a real file
   under `src/chNN/` and passed `iverilog -g2012 -Wall` with zero output
   before it appeared in the prose. Chapter listings are byte-identical
   slices of those files.
2. **Every testbench must be shown able to fail.** Mutation testing is a
   standing requirement, adopted in chapter 4 after a shipped testbench was
   caught printing `PASS` against a design rebuilt with a missing flip-flop.
3. **No claim stronger than its measurement.** Where a fact came from a
   manual rather than a run, the text says so in place. Where no tool
   existed to check something — there is no synthesizer in the environment
   this was built in — the guide says that too, and does not estimate.

## Reading it

`guide.md` is the whole guide in one file, assembled from `chapters/` by the
re-runnable `assemble.py`. Read chapters in order if floating point is new to
you; chapters 1–5 are foundations and verification method, 6–8 are number
systems and the addition algorithm, 9–12 build and pipeline the hardware,
13–14 survey SystemVerilog and the research frontier.

## Running the code

```sh
cd src && bash run_all.sh              # one chapter at a time: ./run_all.sh ch09
cd src && SIM_TIMEOUT=120 bash run_all.sh   # the full 123-target regression
```

**Icarus Verilog 13.0 is required.** The 12.0 that `apt` installs lacks
`$shortrealtobits` / `$bitstoshortreal` and fails six targets; build tag
`v13_0` from source. The full suite takes about 216 s on a quiet machine.

## Honest limits

The adder is **binary32-specific and unparameterised** — retargeting to
bfloat16 or FP8 is a rewrite, not an instantiation, and chapter 5 carries a
dated correction saying so. Every timing, area and Fmax statement is
documentation, because no synthesis tool was available. The design is
verified against reference models and exhaustive sweeps where exhaustive was
affordable; it is not *proved* correct.

`FINAL-REPORT.md` is the closing account: chapter-by-chapter scores, what was
verified and how, the open concerns, and an analysis of the seven defect
classes this project actually produced — six of which were caught by an
independent re-run rather than by review.
