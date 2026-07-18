# Chapter 09 — Implementing it

> The algorithm is the same in every language; only the idioms change. This
> chapter is a translation guide: which standard-library pieces to reach for in
> **Python, Java, C, and Rust**, the language-specific traps that will bite you,
> and a milestone checklist to build against. The snippets here show *mechanics*
> (how to get a min-heap, how to read an unsigned byte) — not the codec. The codec
> is yours; the pseudocode is back in Chapters [03](03-the-algorithm.md),
> [05](05-encoding-and-bit-io.md), [06](06-decoding.md), and
> [07](07-canonical-huffman.md).

## What you'll learn

- The one milestone path that gets you from "empty file reads" to "round-trip
  passes" without a big-bang debug session.
- For each language: the right data structures, and the specific gotcha that
  language will throw at you.
- The handful of bugs that show up across all four.

---

## The milestone path (do these in order)

Resist writing the whole thing and running it once. Build it in stages you can
check:

1. **Plumbing already works.** The skeleton reads the input file, calls
   `encode`/`decode`, and writes the output. Confirm it compiles/runs and prints
   the "not implemented" message.
2. **Frequencies.** Count bytes into a 256-slot table. (Print it for a known input
   and eyeball it.)
3. **Tree → lengths.** Build the tree with the deterministic `(frequency, order)`
   tie-break ([Chapter 08](08-the-file-format.md), rule 2), then walk it to get a
   code length per symbol. Sanity check: on `ABRACADABRA` you should get
   `A=1, B=C=D=R=3`.
4. **Canonical codes.** Run the `bl_count`/`next_code` construction
   ([Chapter 07](07-canonical-huffman.md)). Check `A=0, B=100, C=101, D=110, R=111`.
5. **Header.** Write magic + big-endian `N` + the 256 length bytes. Hexdump it and
   compare against [Chapter 08](08-the-file-format.md).
6. **Encode payload.** `BitWriter`, MSB-first. For `ABRACADABRA` the payload must
   be `4E AC 9C`. Now `encode` is done.
7. **Decode.** Parse the header, rebuild the canonical decode arrays, run the
   bit-at-a-time loop `N` times.
8. **Round-trip.** `make test-<lang>`. Fix the edge cases it flags (empty,
   single-byte, all-256).
9. **(Optional) Conformance.** `make conformance-<lang>` — byte-for-byte against
   the golden vectors.

Stages 3, 6, and 7 are where the bugs live. The intermediate checks (the tree
lengths, the header hexdump, the `4E AC 9C` payload) let you localize a failure to
one stage instead of hunting through the whole pipeline.

---

## Python

**Reach for:** `heapq` (a binary min-heap over a list), `struct` for the
big-endian length, `bytearray` for building output. Ints are arbitrary-precision,
so you never worry about code/accumulator overflow — a genuine simplification over
the other three.

**Min-heap with a tie-break.** `heapq` compares elements with `<`. The clean way to
get `(frequency, order)` ordering is a small class with `__lt__`, or just push
tuples `(freq, order, payload)` and let tuple comparison do it:

```python
import heapq
heap = []
heapq.heappush(heap, (freq, order, node))   # ordered by freq, then order
smallest = heapq.heappop(heap)
```

Because your `order` values are unique, the third tuple element (`node`) is never
reached by the comparison — no "unorderable types" error even if `node` is a custom
object.

**Big-endian length:** `struct.pack(">Q", n)` gives the 8 bytes;
`struct.unpack(">Q", blob[4:12])[0]` reads them back.

**Gotcha:** iterating `bytes` yields `int`s already (`for b in data: freq[b] += 1`
just works). Don't accidentally index with a 1-char `bytes` slice.

---

## Java

**Reach for:** `java.util.PriorityQueue` with a comparator,
`java.io.ByteArrayOutputStream` for output, `int` for the bit accumulator and code
values.

**The signed-byte trap — this *will* get you.** Java's `byte` is signed
(`-128..127`). To use a byte as a `0..255` frequency index or symbol value, mask it:

```java
int symbol = data[i] & 0xFF;   // ALWAYS do this when treating a byte as a value
freq[symbol]++;
```

Forget the `& 0xFF` and high bytes (0x80–0xFF) become negative indices → an
`ArrayIndexOutOfBoundsException`, or subtly wrong counts. The `all-256` and
`high-bytes` corpus tests exist precisely to catch a missing mask.

**Min-heap with a tie-break:**

```java
PriorityQueue<Node> pq = new PriorityQueue<>((a, b) ->
    a.freq != b.freq ? Long.compare(a.freq, b.freq)
                     : Long.compare(a.order, b.order));
```

**Big-endian length:** write the 8 bytes yourself
(`out.write((int)(n >>> (i*8)) & 0xFF)` for `i` from 7 down to 0), or use
`ByteBuffer.allocate(8).putLong(n)`.

**Gotcha:** when you OR bits into the accumulator and later write it, mask to a byte
(`out.write(cur & 0xFF)`), and shift `code` with `>>>` (unsigned) not `>>`.

---

## C

**Reach for:** nothing — you'll hand-roll the heap and the growable buffer, which
is exactly why C is the most instructive of the four. Two facts keep it bounded and
safe:

- **The node pool is small and fixed.** 256 leaves + at most 255 internal nodes =
  **511 nodes**, ever. A `Node pool[512]` and an index-based heap of the same size
  need no `malloc` at all.
- **Use `unsigned char` / `uint8_t` for data**, so byte values are `0..255` with no
  sign surprises (C's plain `char` may be signed).

**A tiny array-based min-heap** (store node indices; compare by `(freq, order)`):

```c
/* sift-up on push, sift-down on pop; compare two pool entries: */
static int less(int i, int j) {
    if (pool[i].freq != pool[j].freq) return pool[i].freq < pool[j].freq;
    return pool[i].order < pool[j].order;
}
```

**Growable output buffer:** a `{ uint8_t *data; size_t len, cap; }` with a
`push(byte)` that doubles `cap` via `realloc` when full. Use it for both the input
read (if you support stdin) and the packed payload.

**Reading the whole file:** `fseek(f, 0, SEEK_END)` / `ftell` / `fseek(...SEEK_SET)`
to size it, then one `fread`. (The starter skeleton already gives you `read_all` and
`write_all` — the plumbing, not the Huffman.)

**Big-endian length:** write it a byte at a time,
`for (int i = 7; i >= 0; i--) push(out, (uint8_t)(n >> (i*8)));`.

**Gotcha:** in the decode inner loop, compare the accumulated code against
`first_code[length]` as **unsigned** and guard `acc >= first_code[length]` before
subtracting, so you never underflow a `uint32_t` (see the note in
[Chapter 06](06-decoding.md)).

---

## Rust

**Reach for:** `std::collections::BinaryHeap` with `std::cmp::Reverse`, `Vec<u8>`
for output, `u64::to_be_bytes()` for the length. No external crates needed — it
builds with plain `rustc`.

**`BinaryHeap` is a *max*-heap;** wrap items in `Reverse` to get min-first. A tuple
`(freq, order, index)` gives you the `(frequency, order)` ordering for free:

```rust
use std::cmp::Reverse;
use std::collections::BinaryHeap;
let mut heap: BinaryHeap<Reverse<(u64, u64, usize)>> = BinaryHeap::new();
heap.push(Reverse((freq, order, idx)));
let Reverse((_, _, idx)) = heap.pop().unwrap();   // smallest (freq, order)
```

Because `order` is unique, ties never fall through to `index`, so the pop order is
fully determined.

**Byte values:** `b as usize` to index, `x as u8` to store; `to_be_bytes()` /
`from_be_bytes()` for the length. The borrow checker mostly stays out of your way
if you store the tree as a flat `Vec<Node>` and refer to children by index
(`i32`/`usize`) rather than `Box`/`Rc` — an arena, same shape as the C pool.

**Gotcha:** `unimplemented!()` in the skeleton returns `!`, so it type-checks
anywhere; replace it with real returns of `Vec<u8>`. Watch that shifts on `u8`
don't overflow — accumulate codes in a `u32`, narrow to `u8` only when you push a
finished byte.

---

## Bugs that show up in every language

You've seen most of these in earlier chapters; here they are in one place, because
they're what `make test-<lang>` will actually flag:

| Bug | Which test catches it | Fix |
| --- | --- | --- |
| High bytes counted wrong / crash | `all-256`, `high-bytes` | unsigned bytes (`& 0xFF`, `uint8_t`, `as usize`) |
| Single-symbol input loops forever | `single-byte`, `repeated` | length-1 rule ([Ch 03](03-the-algorithm.md)/[08](08-the-file-format.md)) |
| Empty input crashes | `empty` | guard `N == 0` in both encode and decode |
| One extra trailing symbol | most text inputs | store and honor `N`; ignore padding |
| Scrambled output | everything | writer/reader bit order must match (MSB-first) |
| Round-trip ok, conformance fails | `conformance-*` | wrong tie-break, non-canonical codes, or LSB-first packing |

That last row is the important distinction: a codec can be *correct* (round-trip
green) yet *non-conforming* (golden red). [Chapter 10](10-testing-your-implementation.md)
explains why, and how to use the tests to drive the whole build.

---

## Key takeaways

- One algorithm, four idioms. Build in **stages** and check the intermediate values
  (tree lengths, header hexdump, the `4E AC 9C` payload) so a bug is local.
- **Python:** `heapq` + unbounded ints — least friction. **Java:** `PriorityQueue`
  + *always* `& 0xFF`. **C:** a fixed 512-node pool and a hand-rolled heap; unsigned
  everywhere. **Rust:** `BinaryHeap<Reverse<…>>` + a flat `Vec<Node>` arena.
- The cross-language bugs are few and known; the corpus is arranged to surface each
  one.

Next: the test harness in detail, and how to let it lead your build.

---

*Next → [Chapter 10: Testing your implementation](10-testing-your-implementation.md)*
