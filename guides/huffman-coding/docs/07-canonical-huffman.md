# Chapter 07 — Canonical Huffman

> The decoder needs the same codes the encoder used — so the encoder has to *ship*
> them somehow. Shipping the whole tree, or a code for every symbol, is bulky and
> fiddly. Canonical Huffman is the elegant escape: agree on a fixed rule for
> turning **code lengths** into **code bits**, and then the lengths alone are
> enough. The header becomes a flat little array of lengths, and — as a bonus —
> every implementation that follows the rule produces byte-identical output.

## What you'll learn

- Why "the codes aren't unique" ([Chapter 03](03-the-algorithm.md)) is exactly the
  freedom that canonical coding exploits.
- The **canonical assignment rule**, and the `bl_count` / `next_code` construction
  from [RFC 1951 §3.2.2](https://www.rfc-editor.org/rfc/rfc1951#section-3.2.2).
- A full worked example, contrasting the "tree" codes with the canonical ones.
- **Length-limiting** (why DEFLATE caps codes at 15 bits) and the **determinism**
  you need for cross-language interop.

---

## The problem canonical coding solves

To decode, both sides must share the code table. The naïve ways to transmit it are
all unpleasant:

- **Serialize the tree** (a bit per node plus the leaf symbols): compact-ish, but
  the parsing is stateful and error-prone.
- **Store every symbol's code** as (length, bits): straightforward, but you're
  shipping the bit patterns you just computed, and the lengths *and* the bits.
- **Store the frequencies** and have the decoder rebuild the tree: this works only
  if the decoder rebuilds the *exact same* tree — which, thanks to tie-breaking,
  isn't guaranteed.

Canonical Huffman replaces all of them with: **store only the code length of each
symbol.** For a byte alphabet that's a fixed 256-byte table (one length per
possible byte, `0` meaning "absent"). Tiny, flat, trivial to parse — no tree, no
bit patterns.

The catch, of course, is that lengths alone *don't* pin down the bits… unless both
sides agree on a rule for choosing them. That rule is the canonical assignment.

---

## The freedom that makes it possible

Recall from Chapters 03–04 that many different codes are all equally optimal:
swapping left/right children, or breaking frequency ties differently, changes the
*bits* but not the *lengths* (and it's the lengths that determine the cost). So the
lengths are the "real" output of Huffman; the specific bits are an arbitrary choice
we're free to standardize.

Canonical Huffman makes that choice **once and for all**, deterministically, from
the lengths. Given the multiset of lengths (e.g. "one symbol of length 1, four of
length 3"), there is exactly *one* canonical code. Both encoder and decoder compute
it independently and get the same answer.

---

## The canonical rule

Two properties define the canonical code:

1. **Shorter codes come before longer codes** numerically.
2. **Within the same length, codes are assigned to symbols in increasing symbol
   order**, as consecutive integers.

Concretely, sort all present symbols by `(length, symbol_value)`. Hand out
codewords as consecutive binary numbers, and every time the length increases, shift
the running code left by the jump in length (append zeros). That's it.

The clean way to compute it is the RFC 1951 two-pass construction:

```
canonical_codes(lengths):            # lengths[s] = code length of symbol s (0 = absent)
    max_len = max(lengths)

    # Pass 1: how many codes of each length?
    bl_count[L] = number of symbols with length L, for L in 1..max_len

    # Pass 2: the smallest code of each length.
    code = 0
    next_code[0] = 0
    for L from 1 to max_len:
        code = (code + bl_count[L-1]) << 1
        next_code[L] = code

    # Pass 3: hand them out in symbol order.
    for s from 0 to 255:
        if lengths[s] != 0:
            codes[s] = next_code[lengths[s]]
            next_code[lengths[s]] += 1
```

The one line doing the real work is
`code = (code + bl_count[L-1]) << 1`. Read it as: "take the first code of the
previous length, advance past all the codes that *had* that length
(`+ bl_count[L-1]`), then add a bit (`<< 1`)." That advance-then-extend is what
guarantees property 1 — no shorter code is ever a prefix of a longer one, because
the longer ones start numerically *after* the shorter ones leave off.

---

## Worked example: `ABRACADABRA`

Huffman gave us these lengths (from [Chapter 03](03-the-algorithm.md)):

| Symbol | A | B | C | D | R |
| --- | --- | --- | --- | --- | --- |
| Length | 1 | 3 | 3 | 3 | 3 |

**Pass 1** — counts per length: `bl_count[1] = 1`, `bl_count[2] = 0`,
`bl_count[3] = 4`.

**Pass 2** — smallest code of each length:

```
code = 0
L=1:  code = (0 + bl_count[0]=0) << 1 = 0    → next_code[1] = 0
L=2:  code = (0 + bl_count[1]=1) << 1 = 2    → next_code[2] = 2   (unused, no length-2 syms)
L=3:  code = (2 + bl_count[2]=0) << 1 = 4    → next_code[3] = 4
```

**Pass 3** — assign in increasing symbol order (`A B C D R`):

| Symbol | Length | Canonical code | Bits |
| --- | --- | --- | --- |
| A | 1 | 0 | `0` |
| B | 3 | 4 | `100` |
| C | 3 | 5 | `101` |
| D | 3 | 6 | `110` |
| R | 3 | 7 | `111` |

Compare this with the codes we read straight off the greedy tree in Chapter 03,
where the leaf order put `C=100, D=101, B=110, R=111`. Same *lengths*, different
*assignment*: canonical reorders the length-3 codes so they go to `B, C, D, R` in
symbol order. Both are optimal; only the canonical one is reproducible from the
lengths alone. This is the table our file format stores — and it's why the golden
vector `abracadabra.huff` has the payload bytes `[78, 172, 156]` we dissected in
[Chapter 05](05-encoding-and-bit-io.md).

---

## Decoding is the same construction, run backwards

The decoder receives only the lengths, runs the identical Pass 1 / Pass 2, and
thereby knows `first_code[L] = next_code[L]` (the smallest code of each length)
and `count[L] = bl_count[L]`. Group the present symbols by `(length, value)` into
`sorted_syms`, remember where each length's group starts, and you have exactly the
arrays the table-driven decoder in [Chapter 06](06-decoding.md) needs. Encoder and
decoder share one construction; they just consume its output differently.

---

## Length-limiting: when codes get too long

Canonical coding needs to *store* a length per symbol. How big can a length get?
For an alphabet of $n$ symbols the deepest possible Huffman tree has depth $n-1$,
so lengths can in principle reach $n-1$. For our byte alphabet that's up to **255**
— which conveniently still fits in a single byte, so our 256-byte length table is
always big enough. (That's not luck; it's why one byte per length suffices, and a
nice thing to be able to prove.)

But "in principle" needs adversarial input. To *force* a code of length $L$ you
need frequencies that grow like the **Fibonacci sequence** (1, 1, 2, 3, 5, 8, …) —
each symbol at least as frequent as the sum of the two rarer ones — and that makes
the maximally-skewed tree. The total file size needed grows like $\varphi^L$
(golden ratio), so reaching even length 30 needs on the order of a million
symbols, and length 40 needs billions. Real files sit comfortably under ~20.

Production formats still refuse to gamble on it. **DEFLATE caps code lengths at 15
bits; JPEG at 16.** Capping keeps the decode lookup tables a bounded size and the
length fields a fixed width. When plain Huffman would exceed the cap, they use
**length-limited Huffman coding** — most famously the **package-merge algorithm**
(Larmore & Hirschberg, 1990), which finds the optimal code subject to a maximum
length, or cheaper heuristics that nudge over-long codes shorter and rebalance.

Our teaching format does **not** length-limit (one byte holds any real length, and
the corpus never approaches the limit), but it's important to know the escape hatch
exists and why real formats reach for it.

---

## Determinism: the last mile to cross-language interop

Canonical coding fixes the *bits* given the *lengths*. But two implementations only
produce identical files if they also agree on the **lengths** — and lengths come
from the tree, which depends on how frequency ties are broken
([Chapter 03](03-the-algorithm.md)). So for byte-identical output across Python,
Java, C, and Rust, we need one more agreement: a **deterministic tie-break** in the
priority queue.

The rule our format uses (spelled out in [Chapter 08](08-the-file-format.md)):
give every node a unique **order id** — leaves get their symbol value `0..255`,
internal nodes get `256, 257, …` in creation order — and break frequency ties by
that id. Because the ids are unique, the "two smallest" is never ambiguous, so
every correct priority queue pops the same sequence, builds the same tree, produces
the same lengths, and — via canonical assignment — the same bytes. That chain
(deterministic tie-break → identical lengths → canonical codes → identical file) is
what makes `make conformance-<lang>` pass in all four languages.

You don't *need* any of this for a working compressor — round-trip correctness only
requires that *your* decoder matches *your* encoder. Determinism is the extra
discipline that buys cross-tool compatibility.

---

## Key takeaways

- Store **only code lengths**; both sides reconstruct identical **canonical** codes
  from them. The header becomes a flat 256-byte table.
- The canonical rule: sort by `(length, symbol)`, hand out consecutive integers,
  shift left when the length grows — the `bl_count` / `next_code` construction.
- The **same** construction, run by the decoder, yields its lookup arrays — encoder
  and decoder share one routine.
- **Length-limiting** (DEFLATE 15, JPEG 16) tames pathological inputs; our format
  doesn't need it because one byte holds any length a byte alphabet can produce.
- Canonical fixes bits-from-lengths; a **deterministic tie-break** fixes
  lengths-from-frequencies. Both together give byte-identical cross-language files.

Next: the exact bytes on disk — the `HUF1` format you'll implement to.

---

*Next → [Chapter 08: The file format](08-the-file-format.md)*
