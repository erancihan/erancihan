# Chapter 10 — Testing your implementation

> The workbench in [`src/`](../src/) exists so you always know whether you're
> right. This chapter shows how to drive your build with the test harness: the two
> kinds of check it runs, why a *correct* codec can still fail the stricter one,
> what each corpus file is trying to break, and how to debug when something's red.

## What you'll learn

- How to run the harness and read its output.
- The difference between **round-trip** and **conformance**, and why it matters.
- What each input in the corpus is designed to catch.
- A debugging playbook for when decode returns garbage.

---

## Running it

From the [`src/`](../src/) directory, one target per language:

```console
$ make test-python        # round-trip: decode(encode(x)) == x
$ make test-c
$ make test-java
$ make test-rust
$ make test               # all four, best-effort (keeps going on failure)
```

Each run drives *your* compiled program through its `encode`/`decode` CLI over the
whole corpus and prints a line per input:

```
round-trip  —  decode(encode(x)) must equal x
  PASS  ascii-text          2700 ->    1776 bytes
  PASS  binary-random      20000 ->   20268 bytes
  FAIL  single-byte
          encode: <your error here>
  ...
  9 passed, 1 failed
  SOME TESTS FAILED
```

The harness never reads your source — it only calls the CLI — so the same script
checks all four languages identically. That's also why it works no matter what
internal design you chose.

---

## The two kinds of check

### Round-trip — the one that matters while you build

Round-trip asserts only that **`decode(encode(x)) == x`**. It says nothing about
*how* you store things. Any correct codec passes it, whatever header or bit order
or tie-break you invented. This is your primary signal: get every corpus file to
`PASS` here and you have a working compressor.

### Conformance — the optional stretch goal

```console
$ make conformance-python   # also require encode(x) == the golden HUF1 bytes
```

Conformance additionally demands that your `encode` output is **byte-for-byte
identical** to the reference files in `tests/golden/`. It only passes if you
implemented the exact `HUF1` format from [Chapter 08](08-the-file-format.md),
including the deterministic tie-break and canonical, MSB-first codes. Passing it
means your four tools are mutually compatible — your Python-compressed file opens
in your Rust tool.

---

## Why a *correct* codec can fail conformance

This surprises people, so it's worth stating plainly:

> **Round-trip green + conformance red does not mean you have a bug.** It means
> your codec is correct but made different (equally valid) format choices than the
> reference.

Recall from Chapters [03](03-the-algorithm.md) and [04](04-why-it-is-optimal.md)
that Huffman codes are **optimal but not unique**. If your priority queue breaks
frequency ties differently, you'll get different — still optimal — code *lengths*,
hence different bytes. If you label right-child `0` instead of left, or pack
LSB-first, or lay your header out differently, you round-trip perfectly and match
no golden vector. All legitimate; none conforming.

To *reach* conformance, align on the four determinism rules from
[Chapter 08](08-the-file-format.md): byte alphabet, the `(frequency, order)`
tie-break, the length-1 rule, and canonical + MSB-first packing. Until you care
about interop, you can ignore conformance entirely — round-trip is the real test of
correctness.

---

## What each corpus file is trying to break

The round-trip corpus is small on purpose — every file targets a specific failure
mode. If one fails, the *name* tells you where to look.

| Input | Size | What it stresses |
| --- | --- | --- |
| `empty` | 0 B | The `N = 0` guard. Reading a bit from an empty payload crashes here. |
| `single-byte` | 1 B | One distinct symbol → the length-1 rule. Skip it and decode loops forever. |
| `repeated` | 1 KB | Same, at scale: 1000 identical bytes must pack to ~125 payload bytes. |
| `two-symbols` | 1 KB | The smallest *branching* tree; catches off-by-one in code assignment. |
| `ascii-text` | ~2.7 KB | The happy path — real skew, real compression (expect ~65%). |
| `all-256` | 256 B | Every byte value once → a *flat* distribution and **unsigned-byte** handling. All codes length 8; no compression. |
| `all-256-x40` | 10 KB | Flat distribution with counts; exercises multi-byte frequencies. |
| `skewed` | ~9.5 KB | Heavy skew → short codes, strong compression (expect ~18%). |
| `binary-random` | 20 KB | No redundancy → output ≈ input + header. Proves you don't *expand* incompressible data (beyond the fixed header). |
| `high-bytes` | ~10 KB | Bytes `0x80–0xFF` → the **signed-byte** trap in Java/C. |

Two of these are really *not-a-bug* checks. `binary-random` coming out *slightly
larger* than the input is correct — there's no entropy to remove and you still pay
the 268-byte header (see the entropy floor, [Chapter 02](02-prefix-codes-and-entropy.md)).
`all-256` producing zero compression is likewise correct: a uniform distribution has
entropy 8 bits/byte, exactly the input size.

---

## Reading the compression numbers

The harness prints `in -> out` bytes so you can watch the ratio. Rough
expectations for a correct codec on this corpus:

- **Skewed / repeated inputs:** big wins (`skewed` ≈ 0.18, `repeated` ≈ 0.39).
- **Typical text:** solid (`ascii-text` ≈ 0.66).
- **Flat / random inputs:** ≈ 1.0, plus the fixed 268-byte header — which makes
  *small* files come out larger. The header is a flat tax
  ([Chapter 08](08-the-file-format.md)); it's amortized away on anything sizable.

If your ratios are wildly off (e.g. text barely compressing), suspect your **code
lengths** — you may be assigning near-uniform lengths, which means the tree build
or the frequency count is wrong.

---

## Debugging playbook

When decode returns garbage or a test fails, work the pipeline in stages — the same
stages as the [Chapter 09](09-implementing-it.md) milestones — and check the value
you *know* at each:

1. **Frequencies.** Print the non-zero entries for `ABRACADABRA`. Must be
   `A:5 B:2 R:2 C:1 D:1`. Wrong here → an indexing/sign bug; everything downstream
   is doomed.
2. **Code lengths.** For `ABRACADABRA`, `A=1, B=C=D=R=3`. Wrong → tree build or the
   depth walk. Check your tie-break.
3. **Canonical codes.** `A=0, B=100, C=101, D=110, R=111`. Wrong → the
   `bl_count`/`next_code` construction ([Chapter 07](07-canonical-huffman.md)).
4. **Header bytes.** Hexdump the first 12 bytes: `48 55 46 31` then the big-endian
   `N`. Wrong → magic or endianness.
5. **Payload.** For `ABRACADABRA` it must be `4E AC 9C`. Wrong → your `BitWriter`
   (bit order, padding side, missing flush).
6. **Decode.** If encode is proven correct (payload matches) but decode is wrong,
   the bug is isolated to your reader/decode loop. Check you read **MSB-first** and
   stop after exactly `N` symbols.

Two more high-leverage tactics:

- **Decode the golden vector.** `your-tool decode tests/golden/abracadabra.huff -`
  should print `ABRACADABRA`. This tests your decoder against *known-good* bytes,
  independent of your encoder — invaluable for splitting "is it encode or decode?"
- **Hexdump and diff.** When conformance fails, dump your output and the golden
  side by side. If the header matches but the payload diverges, it's bit packing;
  if the length *table* differs, it's the tree/tie-break; if the counts differ,
  it's frequencies.

```console
$ your-tool encode tests/golden/abracadabra.in mine.huff
$ od -An -tx1 mine.huff | head
$ od -An -tx1 tests/golden/abracadabra.huff | head
```

---

## Test-driven, by construction

The most pleasant way to build this is red-to-green, one milestone at a time:

1. Implement `encode` far enough to emit *something*; run `make test-<lang>` and
   watch it fail on decode.
2. Implement `decode`; watch `ascii-text` and `repeated` go green first.
3. Chase the edge cases the corpus names: `empty`, `single-byte`, `all-256`,
   `high-bytes`. Each failure points at one specific rule from
   [Chapter 08](08-the-file-format.md).
4. Once round-trip is all green, *optionally* turn on `conformance-<lang>` and align
   to the reference bytes.
5. Do it again in another language and compare notes — the tests are the same, so
   your understanding transfers directly.

---

## Key takeaways

- **Round-trip** (`make test-<lang>`) is the real correctness check and passes for
  any valid design. **Conformance** (`make conformance-<lang>`) is stricter — exact
  `HUF1` bytes — and optional.
- Round-trip-green + conformance-red is **not a bug**; it's the non-uniqueness of
  Huffman codes showing through.
- Each corpus file targets a **named failure mode** — read the name when one fails.
- Debug by **staging the pipeline** and checking the values you already know
  (`A:5…`, `A=1…`, `A=0…`, `4E AC 9C`); decode the golden vector to isolate
  encode-vs-decode.

Next: where Huffman's one weakness leads, and the coders that surpass it.

---

*Next → [Chapter 11: Beyond Huffman](11-beyond-huffman.md)*
