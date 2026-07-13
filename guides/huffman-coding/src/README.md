# `src/` — your workbench

This directory is where **you** build the codec. It deliberately does **not**
contain a finished Huffman implementation — that's the part you're here to
learn. What it gives you instead is everything *around* the code so you can move
fast and know immediately when you're right:

- **starter skeletons** in four languages — the command-line interface and file
  I/O are written; `encode()` and `decode()` are stubs marked `TODO`,
- a **test harness** that drives your program and checks it,
- **golden vectors** so you can (optionally) verify byte-for-byte that your
  output matches the canonical format the guide describes.

```
src/
├── Makefile                 build + test targets for all four languages
├── python/huffman.py        skeleton — implement encode()/decode()
├── java/Huffman.java        skeleton
├── c/huffman.c              skeleton
├── rust/                    skeleton (Cargo project; also builds with rustc)
│   ├── Cargo.toml
│   └── src/main.rs
└── tests/
    ├── run.sh               language-agnostic test driver
    ├── corpus/              inputs for round-trip testing (edge + typical)
    └── golden/              inputs + expected HUF1 bytes for conformance
```

## The CLI contract

Every implementation — yours included — is a program that speaks the same two
commands. The harness relies only on this; it never reads your source.

```
<program> encode <input-file>  <output.huff>
<program> decode <input.huff>  <output-file>
```

## The two kinds of test

**Round-trip** is the check that matters while you build. It asserts only that
`decode(encode(x)) == x` for a batch of inputs — the empty file, a single byte,
a run of one repeated byte, all 256 byte values, random binary, skewed text.
Any *correct* codec passes it, **no matter what header or format you invent**.

```console
$ make test-python        # or test-c / test-java / test-rust
round-trip  —  decode(encode(x)) must equal x
  PASS  all-256              256 ->     524 bytes
  PASS  ascii-text          2700 ->    1776 bytes
  ...
  ALL TESTS PASSED
```

**Conformance** (`make conformance-<lang>`) is an optional stretch goal. It
additionally requires your `encode` output to be **byte-identical** to the
reference files in `tests/golden/`. That only happens if you implement the exact
canonical `HUF1` format from [`../docs/08-the-file-format.md`](../docs/08-the-file-format.md),
down to the deterministic tie-breaking rule. Passing it means your Python tool
can decode your Rust tool's files and vice-versa. A perfectly correct codec that
made different (equally valid) format choices will *fail* conformance while
*passing* round-trip — [`../docs/10-testing-your-implementation.md`](../docs/10-testing-your-implementation.md)
explains why.

## Suggested order

1. Read [`../docs/03-the-algorithm.md`](../docs/03-the-algorithm.md) and build
   the tree + codes in your language of choice.
2. Get `make test-<lang>` to pass round-trip. Start with `repeated` and
   `ascii-text`; leave `empty`, `single-byte` and `all-256` for last — those are
   the edge cases that expose bugs.
3. (Optional) Switch to the canonical format from
   [`../docs/07`](../docs/07-canonical-huffman.md)–[`08`](../docs/08-the-file-format.md)
   and get `make conformance-<lang>` to pass.
4. Do it again in another language. The algorithm is identical; only the idioms
   change (see [`../docs/09-implementing-it.md`](../docs/09-implementing-it.md)).

## Requirements

`make` plus whichever toolchains you use: `python3`, a C compiler (`cc`/`gcc`),
a JDK (`javac`/`java`), and Rust (`rustc`; `cargo` optional). `bash` runs the
test harness.
