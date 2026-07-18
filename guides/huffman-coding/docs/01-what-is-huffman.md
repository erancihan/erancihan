# Chapter 01 — What is Huffman coding?

> Huffman coding is the answer to a very old, very concrete question: if some
> symbols appear more often than others, how short can you make the message?
> It's a *greedy* algorithm that builds a *provably optimal* set of
> variable-length codes, and it has been quietly running inside ZIP, gzip, PNG,
> JPEG, MP3 and HTTP/2 for decades.

## What you'll learn

- The one-sentence problem Huffman solves, and the "aha" that makes it possible.
- Where Huffman coding actually runs in software you use every day.
- The origin story — a graduate term paper that beat its own professor.
- The crucial split between **modeling** and **coding**, and which side Huffman
  is on (so you know what it *won't* do for you).

---

## The problem, in one example

Suppose you want to store this 11-character string:

```
ABRACADABRA
```

The obvious encoding gives every character the same number of bits. There are
five distinct letters here (`A B C D R`), so 3 bits each would do
(`2³ = 8 ≥ 5`). That's `11 × 3 = 33` bits. ASCII would spend 8 bits each — `88`
bits — but even the "tight" fixed-width scheme needs 33.

Now count how often each letter appears:

| Letter | A | B | R | C | D |
| --- | --- | --- | --- | --- | --- |
| Count | 5 | 2 | 2 | 1 | 1 |

`A` alone is nearly half the string. Spending the *same* 3 bits on `A` as on `D`
is wasteful — `A` happens five times as often. What if the code for `A` were
just **1 bit**, and the rare letters paid a little more?

That's exactly what Huffman does. The codes it produces for this string are:

| Letter | Code | Bits |
| --- | --- | --- |
| A | `0` | 1 |
| B | `100` | 3 |
| C | `101` | 3 |
| D | `110` | 3 |
| R | `111` | 3 |

Encoding `ABRACADABRA` now costs:

```
A  B    R    A  C    A  D    A  B    R    A
0  100  111  0  101  0  110  0  100  111  0     = 23 bits
```

**23 bits instead of 33** — a 30% saving, and we haven't lost a thing; the
original decodes back exactly. Scale that from an 11-character toy to a
megabyte of English text, and the savings are the difference between a download
that fits and one that doesn't.

The core insight is worth stating plainly:

> **Give the most frequent symbols the shortest codes.** Huffman is the specific,
> optimal way to do that.

---

## But wait — how do you decode `0100111…`?

There's a subtlety hiding in that bitstream. The codes have *different lengths*,
and there are no spaces or commas between them. When the decoder reads
`0100111...`, how does it know that the first symbol is `A` (`0`) and not the
start of some longer code?

The answer is the property that makes the whole scheme work: **no code is a
prefix of any other code**. `0` is a complete code (`A`), so nothing else may
*start* with `0`. Reading left to right, the moment the bits you've collected
match a code, you know that's the symbol — unambiguously. That "prefix-free"
property, and the binary tree that guarantees it, is the subject of
[Chapter 02](02-prefix-codes-and-entropy.md).

---

## Where Huffman coding lives

This isn't a museum piece. Huffman codes are in the hot path of formats you
touch constantly:

| System | How Huffman is used |
| --- | --- |
| **DEFLATE** (ZIP, gzip, zlib, PNG) | LZ77 finds repeated strings; Huffman codes the resulting literals and match-lengths. This is *the* workhorse — see [RFC 1951](https://www.rfc-editor.org/rfc/rfc1951). |
| **JPEG** (baseline) | The quantized DCT coefficients are run-length encoded, then Huffman coded. (Arithmetic coding is an optional, rarely used mode.) |
| **MP3 / AAC** | Quantized frequency coefficients are packed with Huffman tables built into the standard. |
| **HTTP/2 HPACK** | Header strings are compressed with a fixed, standardized Huffman code. |
| **PDF, PKZIP, PNG, …** | All lean on DEFLATE, so all lean on Huffman. |

Even where newer coders have taken over the very top of the compression-ratio
charts (see [Chapter 11](11-beyond-huffman.md)), Huffman remains the default when
you want *fast, simple, patent-free, and good enough* — which is most of the
time.

---

## A term paper that beat the professor

In 1951, **David A. Huffman** was a graduate student at MIT in Robert Fano's
information theory course. Fano offered the class a choice: sit the final exam,
or write a term paper. One of the proposed paper topics was an open problem —
find the most efficient binary code for a set of symbols with known frequencies.

Fano and Claude Shannon themselves had a method (now called **Shannon–Fano
coding**) that built codes *top-down*, splitting the symbol set into halves of
roughly equal probability. It was good, but not provably optimal. Huffman
struggled with the top-down approach for months, and was about to give up and
study for the exam — when he realized the trick was to build the tree the *other
way*: **bottom-up**, starting from the two least frequent symbols and merging
upward. That inversion is what makes it optimal.

His 1952 paper, *"A Method for the Construction of Minimum-Redundancy Codes,"*
is barely three pages long. It's one of the most cited results in computer
science, and the algorithm hasn't needed a correction in seventy years.

The lesson embedded in the story is a good one for this guide: the *greedy,
bottom-up* direction is not the obvious one, and it's why the proof of
optimality in [Chapter 04](04-why-it-is-optimal.md) is worth reading carefully.

---

## The one distinction that prevents confusion: modeling vs. coding

Compression is really two jobs, and Huffman only does one of them.

1. **Modeling** — deciding *what the symbols are* and *estimating their
   probabilities*. Is your symbol a byte? A word? A pixel difference? An LZ77
   match token? The model is where most of the cleverness (and most of the
   compression) in a real codec lives.
2. **Coding** — given a model's probabilities, emitting the *shortest bitstream*.
   This is Huffman's job (and arithmetic coding's, and ANS's).

Huffman is an **entropy coder**: hand it a set of symbols and their frequencies,
and it produces optimal *integer-length* codes. It has nothing to say about
*where those symbols came from*. That's why gzip pairs it with LZ77 (a model that
turns repetition into short tokens) and JPEG pairs it with the DCT + quantization
(a model that turns images into mostly-zero coefficients). The model creates a
skewed distribution; Huffman cashes that skew in for bits.

Keep this split in mind. When this guide's codec compresses English text well but
random bytes not at all ([Chapter 10](10-testing-your-implementation.md)), that's
not a bug — it's Huffman faithfully coding a model (raw bytes) that happens to
have no skew to exploit.

---

## What we'll build

By the end you'll have a working `encode`/`decode` command-line tool — in as many
of Python, Java, C, and Rust as you like — that:

- counts byte frequencies,
- builds the optimal Huffman tree,
- assigns **canonical** codes ([Chapter 07](07-canonical-huffman.md)) so the
  header is tiny and reproducible,
- packs the bitstream and writes a real binary file format
  ([Chapter 08](08-the-file-format.md)),
- and reverses all of it exactly.

We'll treat the **byte** (values 0–255) as our symbol throughout. It's the
natural unit for a general-purpose file compressor, it keeps the alphabet a
fixed, comfortable size, and it sidesteps the modeling question entirely so we
can focus on the coding.

---

## Key takeaways

- Huffman coding assigns **short codes to frequent symbols** and long codes to
  rare ones, minimizing total bits.
- It works because the codes are **prefix-free**: a variable-length bitstream
  decodes with no separators.
- It is **optimal** among codes that use a whole number of bits per symbol — a
  fact we'll prove, not just assert.
- It is a **coder**, not a **modeler**: it needs a skewed distribution to exploit,
  and something else has to produce that skew.

Next: *why* variable-length codes can be decoded at all, and exactly how good
they can get.

---

*Next → [Chapter 02: Prefix codes & entropy](02-prefix-codes-and-entropy.md)*
