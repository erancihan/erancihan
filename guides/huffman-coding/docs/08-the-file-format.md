# Chapter 08 — The file format

> Everything so far has been algorithm. This chapter is the **contract**: the
> precise bytes a `.huff` file contains. It's what the conformance tests check
> against, and it's what makes a file written by your Python tool readable by your
> Rust tool. Implement to this spec exactly and cross-language interop falls out
> for free. Deviate (a different header, a different tie-break) and your codec can
> still be perfectly correct — it just won't be *compatible*.

## What you'll learn

- The `HUF1` container layout, field by field.
- A **byte-by-byte** dissection of a real file (`ABRACADABRA`).
- Exactly how the two edge cases (empty input, single symbol) look on disk.
- The **determinism rules** that make all four languages emit identical bytes.
- The format's deliberate trade-offs, and how real formats do better.

---

## The `HUF1` layout

A `.huff` file is a fixed **268-byte header** followed by the packed bitstream.

```
┌──────────────────────────────────────────────────────────────────────┐
│ offset  size   field                                                   │
├──────────────────────────────────────────────────────────────────────┤
│   0      4     magic:  the ASCII bytes  H U F 1   (0x48 0x55 0x46 0x31) │
│   4      8     original length N: number of decoded bytes,             │
│                unsigned 64-bit, BIG-ENDIAN                             │
│  12    256     code-length table: one byte per symbol value 0..255;    │
│                table[b] = canonical code length of byte b, or 0 if b   │
│                does not occur in the input                            │
│ 268    ...     payload: the N codes, packed MSB-first; the final byte  │
│                is zero-padded in its low bits                         │
└──────────────────────────────────────────────────────────────────────┘
```

Four design choices, each earning its place:

- **Magic `HUF1`** — a 4-byte signature so a decoder can reject files that aren't
  ours (and so we could bump to `HUF2` later). Cheap insurance.
- **8-byte big-endian length `N`** — the star of [Chapter 05](05-encoding-and-bit-io.md):
  it tells the decoder exactly how many symbols to emit, so the padding bits in the
  last byte are ignored. Big-endian ("network byte order") is stored
  most-significant-byte-first, so the raw bytes read left-to-right in the natural
  order. Eight bytes handles files up to 16 exabytes — overkill, and pleasantly
  future-proof.
- **256-byte length table** — canonical Huffman ([Chapter 07](07-canonical-huffman.md))
  means the lengths are all the decoder needs. One byte per possible symbol value,
  fixed size, trivial to parse. A `0` marks an absent symbol. (One byte per length
  is always enough: a byte alphabet's codes never exceed length 255.)
- **Payload** — the bitstream from the `BitWriter`, MSB-first, last byte padded low.

Nothing here is variable-length-to-parse except the payload itself, which you walk
by decoding, not by measuring. That's what makes the format easy to get right.

---

## Byte-by-byte: `ABRACADABRA`

Here's the entire 271-byte `abracadabra.huff` (the golden vector
`src/tests/golden/abracadabra.huff`), region by region:

```
offset 0   :  48 55 46 31                          "HUF1"        (magic)
offset 4   :  00 00 00 00 00 00 00 0B              N = 11        (big-endian u64)
offset 12  :  256 bytes, almost all 00, except:
                 index 65 ('A') = 01
                 index 66 ('B') = 03
                 index 67 ('C') = 03
                 index 68 ('D') = 03
                 index 82 ('R') = 03
offset 268 :  4E AC 9C                              payload       (3 bytes)
```

- **Magic:** `48 55 46 31` is `H U F 1` in ASCII.
- **Length:** `00 00 00 00 00 00 00 0B` is `0x0B = 11` — the eleven characters of
  `ABRACADABRA`. Big-endian: the significant byte `0B` comes last.
- **Length table:** 256 bytes, zero everywhere except the five symbols that occur.
  `'A'` is byte value 65, and `table[65] = 1` says A's canonical code is 1 bit.
  `B, C, D, R` (66, 67, 68, 82) each get `3`. From these five numbers the decoder
  rebuilds the canonical codes `A=0, B=100, C=101, D=110, R=111` — no tree, no bit
  patterns transmitted.
- **Payload:** `4E AC 9C` = `78 172 156` = the bits
  `01001110 10101100 10011100`, which is `ABRACADABRA` (23 bits) plus one `0` pad
  bit, exactly as packed in [Chapter 05](05-encoding-and-bit-io.md).

Total: `4 + 8 + 256 + 3 = 271` bytes. (Yes — *larger* than the 11-byte input. The
256-byte table dwarfs everything for tiny files; see the trade-offs below.)

---

## The two edge cases on disk

**Empty input (`N = 0`).** No symbols means an all-zero length table and no
payload. The file is exactly the **268-byte header** and nothing else:

```
48 55 46 31                    "HUF1"
00 00 00 00 00 00 00 00        N = 0
00 × 256                       length table, all absent
                               (no payload)
```

The decoder reads `N = 0` and returns an empty output *without touching the
payload region* (there isn't one). Guard this at the top of both `encode` and
`decode`. This is the golden vector `empty.huff`.

**Single distinct symbol (`"AAAAAAAAAA"`, ten A's).** There's one symbol, so the
tree is a lone leaf — and we apply the length-1 convention from
[Chapter 03](03-the-algorithm.md). On disk:

```
48 55 46 31                    "HUF1"
00 00 00 00 00 00 00 0A        N = 10
... table[65] = 01, rest 00    A has a 1-bit code
00                             payload: ten '0' bits = 0x00, padded to one byte
```

Ten `0` bits is a single `0x00` payload byte (8 bits used, 2 padding). The decoder
reads `count[1] = 1`, `first_code[1] = 0`, then reads one `0` bit per symbol, ten
times. Total file: `268 + 1 = 269` bytes. This is the golden vector `single.huff`,
and it's the input the `single-byte`/`repeated` corpus tests are built to catch.

---

## The determinism rules (read these before you chase conformance)

Round-trip correctness needs none of this — your decoder just has to match your
encoder. But to produce **byte-identical files across languages** (so
`make conformance-<lang>` passes and tools interoperate), every implementation
must make the same choices. There are exactly four:

1. **Symbol = byte.** The alphabet is the 256 values `0..255`. Frequencies are
   raw byte counts. (In languages with signed bytes, mask with `& 0xFF`.)

2. **Deterministic tie-break in the tree.** Build the tree with a min-priority-queue
   keyed by `(frequency, order)`, where `order` is a **unique** id per node:
   - a **leaf**'s order is its symbol value (`0..255`);
   - each **internal** node's order is `256, 257, 258, …`, assigned in the order
     the nodes are created.
   Pop the two minimum nodes; the first pop becomes the **left** child, the second
   the **right**. Because every `order` is unique, "the two smallest" is never
   ambiguous, so all implementations build the identical tree and thus identical
   code lengths. (Left/right doesn't affect *lengths*, but fixing it keeps things
   tidy.)

3. **Length-1 rule for a single symbol.** If exactly one distinct byte occurs, its
   code length is `1` (not `0`).

4. **Canonical codes, MSB-first.** Assign bits with the canonical construction of
   [Chapter 07](07-canonical-huffman.md) (sort by `(length, value)`; `bl_count` /
   `next_code`). Pack the payload most-significant-bit-first; pad the final byte's
   low bits with `0`.

Follow all four and your `encode` output will match the golden vectors to the byte.
The `order`-based tie-break in rule 2 is the subtle one — it's the difference
between "an optimal code" and "*the* reproducible optimal code."

---

## The trade-offs (and how real formats do better)

This format is optimized for *learning*, not for bytes. Two deliberate costs:

- **The 256-byte length table is a flat tax.** Every file pays 268 header bytes,
  so anything under ~1 KB with real skew may come out *larger* than the input
  (`ABRACADABRA` → 271 bytes). The payload compresses; the header doesn't. For big
  files it's noise; for tiny ones it dominates. [Chapter 10](10-testing-your-implementation.md)
  measures exactly where the crossover is.
- **We store all 256 slots even when few symbols occur.** A file using 5 distinct
  bytes still ships 256 length bytes, 251 of them zero.

Real formats squeeze the header itself. **DEFLATE** ([RFC 1951](https://www.rfc-editor.org/rfc/rfc1951))
run-length-encodes the sequence of code lengths (long runs of zeros and repeats are
common) and then *Huffman-codes the code lengths* with a second, small Huffman code
— compression all the way down. **JPEG** stores compact `BITS`/`HUFFVAL` tables
(counts-per-length plus the symbol list) rather than a slot per possible value. You
could bolt either idea onto `HUF1` as an exercise once the basic version passes;
the payload logic wouldn't change at all, only the header serialization.

We keep the flat table because you can *see* it — dump 256 bytes and read off every
symbol's length at a glance, which is worth a lot while you're learning and
debugging.

---

## Key takeaways

- `HUF1` = **4-byte magic** + **8-byte big-endian length** + **256-byte code-length
  table** + **MSB-first payload**. A fixed 268-byte header, then the bitstream.
- The stored **length `N`** is what makes decoding unambiguous; the **256 lengths**
  are all canonical decoding needs.
- **Empty** = header only (268 bytes); **single symbol** = length-1 code, one
  payload byte.
- Byte-identical cross-language output requires four agreements: byte alphabet, the
  `(frequency, order)` **tie-break**, the **length-1** rule, and **canonical +
  MSB-first** packing.
- The flat header is a learning-friendly choice; real formats compress the header
  too, without touching the payload.

Next: how to actually build this in each of the four languages.

---

*Next → [Chapter 09: Implementing it](09-implementing-it.md)*
