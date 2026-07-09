# 10 — Build a TPU: the systolic array

> A TPU is what you build when one operation eats 90% of your cycles and you
> decide to stop pretending it's general-purpose. Wire the multiply-adds into
> a grid, march the data through, and let control logic evaporate.

This chapter needs chapters [03](03-verilog-crash-course.md)–[07](07-building-blocks.md):
the language, testbenches, memory, and the multiply-accumulate block. It does
*not* need [chapter 08](08-build-a-cpu.md) or [chapter 09](09-build-a-gpu.md)
— the CPU/GPU/TPU trio is order-free. But it rhymes with the GPU chapter's
last table: a **tensor core** is a small systolic-flavored matmul unit bolted
inside a SIMT machine. Here we build that idea at full size, as its own chip.
It is the punchline of the whole guide.

## Deep learning is one operation wearing a trench coat

Look at what a neural network actually spends its time on. Strip away the
names and nearly everything reduces to **GEMM** — general matrix multiply,
`C = A × B`:

- A **fully-connected / MLP layer** is `y = Wx` — a matrix times a vector,
  batched into a matrix times a matrix.
- **Transformer attention** is a stack of matmuls: `Q Kᵀ`, softmax, then
  `× V`, and the projections around them. The "attention is all you need"
  machine is, arithmetically, "matmul is most of what you need".
- A **convolution** becomes a matmul after **im2col**: unfold each sliding
  window into a column, and the whole convolution is one big `A × B`.
- Even **embeddings** are a matmul against a one-hot vector (a gather, if
  you're clever, but the layers downstream are GEMM again).

Profile a training or inference run and the histogram is lopsided: the
overwhelming majority of the work is inside a matrix multiply. That is the
engineer's cue. If one operation dominates the cycle budget, you don't
optimize the general machine — you **hardwire the operation**. The CPU
refuses to specialize; the GPU specializes a little (tensor cores); the TPU
is what specialization looks like when you commit.

## The real cost is moving the data, not the math

Here's the counterintuitive part. A multiplier is *cheap*: on a modern
process an 8-bit MAC costs a rounding-error amount of energy. What's
expensive is **fetching the operands**. Reading a word from off-chip DRAM
costs — the figure depends on the process — on the order of hundreds to
thousands of times the energy of the arithmetic you'll do with it (the
canonical numbers are Mark Horowitz's: a DRAM access dwarfs an on-chip add by
three or four orders of magnitude). So the score that matters is not "how
many multiplies" but "how many times did each operand cross an expensive
wire".

Naive matmul is terrible at this. For `C = A × B` with `N × N` matrices, the
triple loop touches memory `O(N³)` times to do `O(N³)` multiplies — one fetch
per multiply. Every operand is dragged in, used **once**, thrown away.

The number that captures this is **arithmetic intensity**: FLOPs per byte
moved. Plot achievable performance against it and you get the **roofline**:
at low intensity you're memory-bound under a slanted ceiling set by
bandwidth; past a "ridge point" you're compute-bound under a flat ceiling set
by your ALUs. Naive matmul sits far down the memory-bound slope. To climb
toward the compute roof you must **reuse each fetched value many times before
evicting it**. That one sentence is the entire design brief for a matmul
accelerator — and the systolic array is the most elegant answer anyone has
found.

## The systolic idea: data pulses through

In the late 1970s H.T. Kung and Charles Leiserson described **systolic
arrays**: a regular grid of tiny processing elements, each doing one
multiply-accumulate, with data **pulsing** through the mesh in lockstep —
"systolic" borrowed from the heart, blood pushed rhythmically through
vessels. ([Wikipedia has the lineage](https://en.wikipedia.org/wiki/Systolic_array).)

The trick is where the reuse comes from. Operands enter only at the
**edges**, march inward one PE per clock, and at **every** PE they pass
through they get used in a MAC. Fetch a value from on-chip SRAM once; it then
feeds `N` multipliers on `N` consecutive cycles as it walks across (or down)
the array. Arithmetic intensity goes up by a factor of `N`, free, purely from
the wiring.

And notice what is *absent*: no instruction fetch, no decode, no addresses,
no branch, no program counter — no control at all once data is flowing. The
**schedule is the wiring**, fixed by physical position at design time. This
is the three-machines thesis of the guide landing:

- The **CPU** ([ch 08](08-build-a-cpu.md)) is *almost all control* — the
  datapath is a footnote to the fetch/decode/branch machinery.
- The **GPU** ([ch 09](09-build-a-gpu.md)) *shares one control stream
  across many parallel datapaths* — pay for control once, amortize it over
  lanes.
- The **TPU** makes control **evaporate**. In the inner loop there is none:
  data marches through a fixed grid and the answers fall out the bottom.
  That's why matmul silicon is so absurdly dense — a `256 × 256` array is
  65,536 multipliers and *zero* routing decisions per cycle.

## Dataflow choices: what stays still?

A systolic array has three operand streams — activations, weights, partial
sums — and you pick which one sits still in the PEs while the others flow.
That choice defines the machine:

| Dataflow | Parked in the PE | Streams | Used by |
| --- | --- | --- | --- |
| **Weight-stationary** | the weight `W[k][c]` | activations, sums | the original Google TPU (and us) |
| **Output-stationary** | the accumulator `C[i][c]` | activations, weights | many accelerators |
| **Row-stationary** | a tuned mix of all three | rows of each | MIT's Eyeriss |

We build **weight-stationary**: load a tile of weights into the grid, then
stream activations across it. Weights load once and get reused for every
activation row in the batch — ideal when you multiply one weight matrix by
thousands of inputs, which is exactly inference.

## The processing element: the whole TPU, times N²

The entire idea fits in one tiny module. Here is
[`pe.v`](../src/07-tpu-systolic/pe.v) almost whole — an 8-bit weight, an
8-bit activation flowing west-to-east, a 32-bit partial sum flowing
north-to-south:

```verilog
module pe (
    input  wire               clk,
    input  wire               rst,
    input  wire               load_w,   // 1: shift weights down; 0: compute
    input  wire signed [7:0]  a_in,     // activation from the west
    input  wire signed [7:0]  w_in,     // weight from the north (load phase)
    input  wire signed [31:0] psum_in,  // partial sum from the north
    output reg  signed [7:0]  a_out,    // to the east neighbour
    output wire signed [7:0]  w_out,    // to the south neighbour (load phase)
    output reg  signed [31:0] psum_out  // to the south neighbour
);

    reg signed [7:0] w;                 // the stationary weight
    assign w_out = w;

    always @(posedge clk) begin
        if (rst) begin
            w        <= 8'sd0;
            a_out    <= 8'sd0;
            psum_out <= 32'sd0;
        end else begin
            if (load_w)
                w <= w_in;              // column-wise weight shift
            a_out    <= a_in;           // forward the activation east
            psum_out <= psum_in + a_in * w;   // MAC, forward south
        end
    end

endmodule
```

Three lines of behavior carry everything:

- `psum_out <= psum_in + a_in * w;` — the **multiply-accumulate**: take the
  sum from above, add this PE's `a_in * w`, hand it down. The
  [chapter 07](07-building-blocks.md) MAC, sitting still.
- `a_out <= a_in;` — forward the activation east, so the next PE gets it one
  cycle later. This is how each activation is reused across the whole row.
- `w <= w_in;` under `load_w` — in load mode the weight registers of a
  column form a **vertical shift register**: weights enter at the top and
  shuffle down one row per cycle. In compute mode `w` holds still.

The "TPU" is this module instantiated `N × N` times — not a simplification,
the *actual* structure. Google's Matrix Unit is this cell, wider.

## The array: a mesh you generate

[`systolic.v`](../src/07-tpu-systolic/systolic.v) wires the grid. Its
header comment is the whole architecture in ASCII:

```
//        w_col[0]   w_col[1]  ...          (weights enter here, load phase)
//           |          |
//   a_row[0]-> [PE00]->[PE01]-> ...        PE(r,c) holds W[r][c]
//           |          |
//   a_row[1]-> [PE10]->[PE11]-> ...
//           |          |
//           v          v
//        c_col[0]   c_col[1]               (results drip out the bottom)
```

There are **three meshes** overlaid on the same grid: activations west→east
(`a_wire`), weights north→south during loading (`w_wire`), partial sums
north→south during compute (`psum_wire`). The body is a doubly-nested
`generate` loop — [chapter 03](03-verilog-crash-course.md)'s "this is
elaboration, not a runtime loop" mindset, building 16 PEs:

```verilog
    genvar r, c;
    generate
        for (r = 0; r < N; r = r + 1) begin : g_r
            for (c = 0; c < N; c = c + 1) begin : g_c
                pe u_pe (
                    .clk (clk), .rst (rst), .load_w (load_w),
                    .a_in    (a_wire[r][c]),
                    .w_in    (w_wire[r][c]),
                    .psum_in (psum_wire[r][c]),
                    .a_out   (a_wire[r][c+1]),
                    .w_out   (w_wire[r+1][c]),
                    .psum_out(psum_wire[r+1][c])
                );
            end
        end
    endgenerate
```

Each PE's outputs are literally the next PE's inputs — `a_out` of column `c`
is `a_in` of column `c+1` — while the edges are tied off separately: west
takes `a_row`, north takes `w_col` plus a zero partial sum, south exports
`c_col`. One Verilog-2005 wrinkle, recurring throughout this repo: the ports
are **flattened** bit vectors, because Verilog-2005 won't pass an unpacked
array through a port. So column `c`'s weight byte lives at `w_col[8*c +: 8]`
and its sum at `[32*c +: 32]` — the `+:` part-select from
[chapter 03](03-verilog-crash-course.md).

## The choreography: the array is oblivious

Here is the part that surprises people: the array has **no idea** any
algorithm is happening — no counter, no notion of "which output am I
computing". All the timing (loading weights in order, skewing the inputs,
sampling outputs on the right cycle) is done *outside*, by
[`tb_systolic.v`](../src/07-tpu-systolic/tb_systolic.v). The testbench
conducts; the array just plays the note in front of it.

### Phase 1 — load the weights, bottom row first

We want PE row `r` to end up holding `W[r]`. Because weights shift **down**,
you feed them **bottom-row-first**, so the last row you push in (row 0) lands
on top. The loop counts `t` from `N-1` down to `0`:

```verilog
            load_w = 1'b1;
            for (t = N - 1; t >= 0; t = t - 1) begin
                for (c = 0; c < N; c = c + 1)
                    w_col[8*c +: 8] = W[t][c];   // truncates to 8 bits
                @(posedge clk); #1;
            end
            load_w = 1'b0;
```

Trace where each weight row sits after each clock (for `N = 4`):

```
                PE row 0   PE row 1   PE row 2   PE row 3
 after cycle 1    W[3]        0          0          0
 after cycle 2    W[2]       W[3]        0          0
 after cycle 3    W[1]       W[2]       W[3]        0
 after cycle 4    W[0]       W[1]       W[2]       W[3]     <- loaded
```

Four cycles, and `PE(r,c)` holds `W[r][c]` — exactly what
`C[i][c] = Σ_k A[i][k]·W[k][c]` needs.

### Phase 2 — skew the inputs into a parallelogram

Now stream activations with `load_w = 0`. If you fed all four rows at once,
their contributions would arrive at the accumulators out of step. The fix is
the classic systolic **skew**: delay row `r` by `r` cycles. Row 0 starts at
cycle 0, row 1 at cycle 1, and so on — the input matrix enters tilted, as a
parallelogram:

```verilog
            for (t = 0; t < 3*N; t = t + 1) begin
                for (r = 0; r < N; r = r + 1)
                    if (t >= r && t - r < N)
                        a_row[8*r +: 8] = A[t-r][r];   // truncates to 8 bits
                    else
                        a_row[8*r +: 8] = 8'd0;
                @(posedge clk); #1;
                ...
```

At cycle `t`, row `r` injects `A[t-r][r]` (when `0 ≤ t-r < N`, else zero).
Drawn out, that is the marching wavefront — each row lagging one cycle
behind the one above:

```
 cycle t  row 0(k=0)  row 1(k=1)  row 2(k=2)  row 3(k=3)
   0       A[0][0]        .           .           .
   1       A[1][0]     A[0][1]        .           .
   2       A[2][0]     A[1][1]     A[0][2]        .
   3       A[3][0]     A[2][1]     A[1][2]     A[0][3]
   4          .        A[3][1]     A[2][2]     A[1][3]
   5          .           .        A[3][2]     A[2][3]
   6          .           .           .        A[3][3]
```

Read a column top-to-bottom and you see an anti-diagonal of `A` entering the
grid. The skew guarantees that `A[i][k]` reaches `PE(k,c)` on the exact cycle
the partial sum for output row `i` passes through it — nobody computed that
alignment at runtime; it's a property of the delays.

### Phase 3 — catch the outputs as they drip out

Each result `C[i][c]` emerges from the bottom of column `c` at elapsed cycle
`i + c + N`. The last term `A[i][N-1]·W[N-1][c]` enters row `N-1` at cycle
`i + (N-1)`, walks east `c` columns to `PE(N-1,c)`, and one more edge
registers the MAC out the bottom: `i + N - 1 + c + 1`. So the outputs drip
out **skewed too**, a mirror of the input parallelogram:

```
 elapsed cycle:   4     5     6     7     8     9    10
   col 0:       C0,0  C1,0  C2,0  C3,0    -     -     -
   col 1:         -   C0,1  C1,1  C2,1  C3,1    -     -
   col 2:         -     -   C0,2  C1,2  C2,2  C3,2    -
   col 3:         -     -     -   C0,3  C1,3  C2,3  C3,3
```

The testbench samples with exactly that formula, right after each edge:

```verilog
                for (c = 0; c < N; c = c + 1)
                    if (t + 1 - c - N >= 0 && t + 1 - c - N < N)
                        C_hw[t + 1 - c - N][c] = $signed(c_col[32*c +: 32]);
```

`t + 1 - c - N` is just `i` solved from `i + c + N = elapsed`. The `$signed`
cast matters — `c_col` is a flat unsigned bus, and we want the int32 value
back.

## Quantization: int8 in, int32 out

Why int8 operands but a 32-bit accumulator? Do the arithmetic. Each product
`a * w` with `a, w ∈ [-128, 127]` peaks at `-128 × -128 = 16384 = 2¹⁴`.
Summing `N` of them can reach `N × 2¹⁴`:

- `N = 4`: magnitude up to `4 × 16384 = 65,536 ≈ 2¹⁶`.
- `N = 256`: magnitude up to `256 × 16384 = 4,194,304 ≈ 2²²`.

A signed int32 ranges over ±2³¹, so it swallows both with enormous headroom
— you'd need `N` past ~`131,072` before a worst-case column could overflow.
So `int8 × int8 → int32` is the free-lunch accumulator width: narrow cheap
operands into the mesh, a wide sum that cannot lie.

Why is int8 *enough* for the operands? Because inference tolerates it.
Trained weights and activations occupy a limited dynamic range, so you map
float→int with a per-tensor **scale factor** `s` (`x_float ≈ s · x_int8`),
run the whole matmul in integers, and multiply the scales back out with one
cheap rescale on the int32 result. Networks trained to expect this lose very
little accuracy. **Training** is fussier — gradients need more dynamic range,
so training hardware leans on wider formats like bf16 (trade-offs vary and
are still an active area). This mirrors the original TPU exactly: int8
multiplies, int32 accumulation, a `256 × 256` Matrix Unit — **65,536 MACs**
in one grid, as reported in the ISCA'17 paper (Jouppi et al.).

## Run it, and check it against honest arithmetic

The only way to trust a streamed, skewed, pipeline-delayed matmul is to
compare it against one you *can't* get wrong. The testbench computes a golden
result with the plainest triple loop imaginable:

```verilog
            // ---- golden model --------------------------------------
            for (r = 0; r < N; r = r + 1)
                for (c = 0; c < N; c = c + 1) begin
                    C_gold[r][c] = 0;
                    for (k = 0; k < N; k = k + 1)
                        C_gold[r][c] = C_gold[r][c] + A[r][k] * W[k][c];
                end
```

Then it runs seven test matrices and asserts `C_hw === C_gold` cell by cell.
Two are nasty on purpose. **Identity**: set `W = I`, so `C = A × I = A` and
the output must equal the input verbatim — a smoke test that shakes out
weight-load ordering and skew bugs instantly. **int8 extremes**: fill `A` and
`W` with `-128` and `127`, driving every product to its magnitude limit — if
the int32 sum or any sign-extension were off, this one screams. The other
five are random signed int8 matrices via `$random`. Run the lot:

```console
$ cd src && make 07-tpu-systolic
==== 07-tpu-systolic ====
VCD info: dumpfile systolic.vcd opened for output.
ALL TESTS PASSED
```

Then go **waveform touring**. Open `systolic.vcd` and watch the `psum_wire`
signals: a diagonal wavefront of nonzero partial sums sweeps down and to the
right through the grid as each activation parallelogram passes — the
algorithm made visible. The array never "knew" it was multiplying matrices;
you're watching a schedule that lives entirely in the geometry.

## How fast is this, really?

Once the pipe is full, a weight-stationary array sustains **N² MACs every
cycle** — one per PE, forever. Our toy does 16/cycle; scale the same wiring
to `256 × 256` and you get 65,536/cycle. Clock that at the TPU's reported
~700 MHz and the peak lands on the order of `65,536 × 2 × 700×10⁶ ≈ 90`
**TOPS** (int8, a MAC counted as two ops) — right around the ~92 TOPS
headline the ISCA'17 paper quotes for the first-generation TPU. (Every one
of those numbers is order-of-magnitude; real chips vary.)

The catch is "as long as you keep feeding it". Peak assumes the array never
starves, and **utilization** is the whole game: partially-filled tiles, the
drain between matmuls, and — above all — whether the memory system delivers
activations fast enough all pull you back down toward the memory-bound slope
from the second section. The MXU is easy; feeding it is the engineering,
which is why the real TPU is mostly *not* the multiplier grid.

## From toy to Google's TPU

The ISCA'17 TPU is our 16-PE array plus the scaffolding that keeps it fed —
each block a sentence:

- **Matrix Unit (MXU)** — the `256 × 256` systolic grid; the part you just
  built, at scale.
- **Unified Buffer** — a large on-chip SRAM (reported in the low megabytes)
  holding activations, so the MXU reads operands from SRAM, not DRAM.
- **Weight FIFO** — streams weight tiles in ahead of when they're needed,
  hiding the load latency.
- **Accumulators** — a bank of 32-bit sums catching the output columns (our
  `c_col`, widened and buffered).
- **Activation unit** — ReLU, pooling, and the requantize back to int8
  before results head to the next layer.

Zoom back out to the family tree. A **tensor core** ([chapter 09](09-build-a-gpu.md))
is this same matmul primitive shrunk down and embedded inside a GPU's SIMT
core — the industry decided matmul was too important to leave to general
lanes. Beyond Google, the dataflow instinct is everywhere: **Eyeriss**
(row-stationary, energy-optimized), **Cerebras** (a wafer-scale mesh),
**Groq** (a deterministic tensor-streaming machine) — all variations on
"stop moving data, move it *through*".

And the FPGA reality check, since this guide's premise is *without* the FPGA:
your array is only as wide as your multiplier budget, and on an FPGA that
budget is the **DSP-slice count** — the hard MAC blocks from
[chapter 07](07-building-blocks.md). A small iCE40 has a handful, a mid-size
part hundreds; you don't get 65,536. [Chapter 11](11-synthesis-without-hardware.md)
runs the synthesizer and *measures* exactly how many PEs fit and how fast
they clock — honest area-and-timing feedback without owning the silicon.

## Exercises

1. **N = 8 (warm-up).** Instantiate `systolic #(.N(8))` and set the
   testbench's `localparam N = 8`. Every choreography formula (`i + c + N`,
   the skew, the bottom-first load) is written in terms of `N`, so it should
   just work. Predict the new output-emergence cycles before you run.

2. **Back-to-back matmuls (medium).** Each `run_one_matmul` reloads weights
   and drains fully. Stream a second activation matrix through the *same*
   loaded weights with no reload, starting it before the first drains. Where
   do the two parallelograms collide, and how much overlap can you steal?

3. **ReLU + requantize (medium).** Add a thin output stage at the column
   exits: clamp negatives to zero (ReLU) and arithmetic-shift-right the int32
   to requantize toward int8. That's the TPU's "activation unit" in miniature.

4. **Output-stationary (medium-hard).** Rewrite the PE so the *accumulator*
   stays parked while activations and weights both stream through. Compare
   the choreography against weight-stationary — which needs less input skew?

5. **Identity activation (conceptual).** Feed `A = I` instead of `W = I`.
   Predict `C`, confirm it, and explain in one sentence why swapping which
   operand is the identity picks out rows vs columns.

6. **A real mini-TPU (hard).** Wrap the array in a controller: put operands
   in BRAM ([chapter 06](06-memory.md)), write an FSM that sequences load →
   skew-feed → collect with no host in the loop, and expose a `start`/`done`
   handshake like the [GPU chapter](09-build-a-gpu.md)'s. Now the
   choreography lives in *hardware* — the leap from array to accelerator.

## Further reading

- **[In-Datacenter Performance Analysis of a Tensor Processing Unit](https://arxiv.org/abs/1704.04760)**
  (Jouppi et al., ISCA 2017) — the paper behind every hedged number in this
  chapter: the `256 × 256` MXU, int8/int32, the roofline analysis of why the
  TPU is memory-bound on some workloads and compute-bound on others. The
  single best next read.
- **[Systolic array (Wikipedia)](https://en.wikipedia.org/wiki/Systolic_array)**
  — Kung & Leiserson's original idea, the taxonomy of dataflows, and where
  the "systolic" metaphor comes from.
- **[Google Cloud TPU documentation](https://cloud.google.com/tpu/docs/intro-to-tpu)**
  — the high-level view of what later TPU generations became and how you'd
  actually rent one, useful for grounding the toy in a product.
- **Eyeriss** (Chen, Emer, Sze) — the row-stationary dataflow and a
  rigorous energy accounting of *why* moving data, not multiplying, is the
  cost that matters. The academic complement to the TPU paper.

---

*Next: [Chapter 11 — Synthesis without hardware](11-synthesis-without-hardware.md)*
