# Runnable designs, one directory per milestone

Every step is a small, self-contained design plus a **self-checking
testbench** — run it and it prints `ALL TESTS PASSED` (or tells you exactly
what broke). No FPGA board is used anywhere; everything runs in a simulator
on your laptop.

## Prerequisites

```console
# macOS
$ brew install icarus-verilog          # steps 01-07
$ brew install ghdl                    # step 08 only (VHDL)

# Debian/Ubuntu
$ sudo apt install iverilog ghdl
```

Python 3 (preinstalled on macOS) is used by step 05's mini-assembler.

## Running

```console
$ make              # run every step's tests
$ make 05-cpu-rv32i # run one step
$ make clean        # remove build products
```

Each testbench also writes a `.vcd` waveform file next to itself — open it
with [GTKWave](https://gtkwave.sourceforge.net/) or
[Surfer](https://surfer-project.org/) and watch your hardware run
(chapter 04 of the guide shows how).

> `$readmemh: Not enough words in the file` warnings from steps 05/06 are
> expected — the program is (much) shorter than the memory it loads into.

## The steps

| Step | What it is | Guide chapter |
| --- | --- | --- |
| [01-counter](01-counter/) | The "hello, world" of hardware: a counter and the testbench conventions used everywhere else | [03](../docs/03-verilog-crash-course.md), [04](../docs/04-simulation-and-testbenches.md) |
| [02-alu](02-alu/) | 32-bit ALU (the ten RV32I operations) with directed + randomized tests against a golden model | [07](../docs/07-building-blocks.md) |
| [03-uart-tx](03-uart-tx/) | UART transmitter — the classic first finite-state machine; the testbench acts as the receiving device | [05](../docs/05-sequential-logic-and-fsms.md) |
| [04-memory](04-memory/) | Register file, BRAM-style synchronous RAM, and a FIFO with a randomized golden-model test | [06](../docs/06-memory.md) |
| [05-cpu-rv32i](05-cpu-rv32i/) | A complete single-cycle RV32I CPU, a ~200-line Python assembler, and a test program it executes | [08](../docs/08-build-a-cpu.md) |
| [06-gpu-simt](06-gpu-simt/) | A 4-lane SIMT core — one instruction stream, four execution lanes — running a CUDA-style grid-stride vector-add kernel | [09](../docs/09-build-a-gpu.md) |
| [07-tpu-systolic](07-tpu-systolic/) | A 4×4 weight-stationary systolic array (int8 × int8 → int32) computing matrix multiplications, checked against a golden matmul | [10](../docs/10-build-a-tpu.md) |
| [08-vhdl-counter](08-vhdl-counter/) | Step 01 rewritten in VHDL and simulated with GHDL | [12](../docs/12-the-vhdl-track.md) |

## Suggested play

1. Run a step's test, open the `.vcd` in a waveform viewer, and find the
   moment things happen (the FIFO filling up, the CPU's PC jumping on a
   branch, the systolic array's diagonal wavefront).
2. Break the design on purpose — flip a `<=` to `=`, drop a case arm, make
   a branch unconditional — and watch the testbench catch it.
3. Do the chapter exercises: each build chapter ends with modifications
   (extend the ALU, add a UART receiver, pipeline the CPU, add MUL to the
   GPU, grow the systolic array to 8×8).
