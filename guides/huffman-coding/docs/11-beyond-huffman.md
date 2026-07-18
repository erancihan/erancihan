# Chapter 11 — Beyond Huffman

> Huffman is optimal — but only within a box it can't step outside: **one whole
> number of bits per symbol.** That box is usually fine and occasionally
> disastrous, and escaping it is the story of modern entropy coding. This closing
> chapter names Huffman's one weakness, the coders that fix it (arithmetic coding,
> range coding, ANS), the adaptive variants that need no header, and how all of
> them slot into the real codecs you use. Then: where to read next.

## What you'll learn

- The precise nature of Huffman's inefficiency, and when it actually hurts.
- **Adaptive Huffman** — one pass, no transmitted table.
- **Arithmetic / range coding** and **ANS** — how they beat the one-bit floor.
- How production codecs (DEFLATE, zstd, JPEG, Brotli) combine a model with an
  entropy coder.
- A curated reading list of primary sources.

---

## The weakness: whole bits

Chapter 02 gave Huffman's guarantee: expected length $L$ satisfies
$H \le L < H + 1$. The "+1" is real, and it comes from a single fact — **every
codeword is at least 1 bit long, and always a whole number of bits.**

Usually that rounding is cheap. But consider a source where one symbol is very
likely, say $p = 0.9$. Its ideal cost is $-\log_2 0.9 \approx 0.15$ bits. Huffman
*must* spend at least a full bit on it — nearly **7× the ideal**. On a skewed
*binary* source (two symbols, one dominant), Huffman is helpless: it can only ever
assign `0` and `1`, i.e. exactly 1 bit/symbol, no matter how lopsided the
probabilities. A fax page that's 99% white pixels has entropy well under 0.1
bits/pixel; Huffman on raw pixels would spend 1.0. That gap is why fax and JBIG use
arithmetic coding, and why Huffman is always paired with a model (like run-length)
that reshapes the distribution *before* it reaches the coder.

Two classic ways to shrink the "+1" while staying with Huffman:

- **Extend the alphabet (blocking).** Code *pairs* or *triples* of symbols as one
  unit. The per-*symbol* rounding error is amortized over the block, so it shrinks
  toward zero as blocks grow. The cost: the table grows exponentially in block
  size ($256^k$ entries for $k$-byte blocks), so this only goes so far.
- **Model first.** Turn the skew into something Huffman codes well. Run-length
  encoding collapses the 99%-white run into a short "count" symbol; LZ77 turns
  repetition into match tokens. This is what every real Huffman-based format does.

But to truly close the gap you have to leave whole-bit codes behind.

---

## Adaptive (dynamic) Huffman

Our codec is **static two-pass**: read the whole input to count frequencies, build
the tree, then encode. That means (a) two passes over the data and (b) shipping the
code table in the header.

**Adaptive Huffman** does it in **one pass with no transmitted table.** Encoder and
decoder both start from a trivial tree and update it *identically* after every
symbol, using the frequencies seen *so far*. Because both sides apply the same
update rule to the same history, the decoder always has the same tree the encoder
had — so nothing about the table needs to be sent.

The algorithms are a small classic literature: **Faller (1973)**, **Gallager
(1978)**, and **Knuth (1985)** give the **FGK** algorithm; **Vitter (1987)**
improved it (algorithm Λ/V) to provably stay within one bit of the two-pass optimum.
The machinery is the *sibling property* — keeping the tree's nodes orderable by
weight so a single symbol update is a cheap local rearrangement. Adaptive Huffman
shows up where you can't afford two passes or a header: streaming links, old modems,
and Unix `compact`.

It still spends whole bits per symbol, though. For the fractional-bit win, you need
a different coder entirely.

---

## Arithmetic coding: fractional bits

**Arithmetic coding** drops the "one codeword per symbol" idea completely. Instead,
it represents the *entire message* as a single number in the interval $[0, 1)$.

The mental model: start with the whole interval $[0, 1)$. Each symbol subdivides the
current interval into pieces sized by the symbols' probabilities, and you recurse
into the piece for the symbol you actually saw. Frequent symbols own big
sub-intervals (cheap — they barely narrow the range); rare symbols own tiny ones
(expensive). After the whole message, you emit just enough bits to name a point
inside the final, very narrow interval. A symbol of probability 0.9 narrows the
range by only ~0.15 bits' worth — and arithmetic coding can *spend* 0.15 bits on it,
because the message's cost is fractional and shared. It reaches within a tiny
fraction of the entropy $H$, beating Huffman's "+1" essentially completely.

The cost is more arithmetic per symbol (multiplies/divides, carry handling) and a
patent history that shaped the field: IBM held key arithmetic-coding patents (the
Q-coder/MQ-coder, used in JPEG 2000 and JBIG2) through the 1990s–2000s, which pushed
many formats toward Huffman for years. **Range coding** (Martin, 1979) is a
practically-equivalent reformulation that sidestepped some of those patents and
became popular in its own right (e.g. in LZMA). The foundational practical reference
is **Witten, Neal & Cleary (1987)**, *"Arithmetic Coding for Data Compression."*

---

## ANS: arithmetic-coding ratios at Huffman speed

The most important recent development is **Asymmetric Numeral Systems (ANS)**,
introduced by **Jarosław (Jarek) Duda** (~2007–2013). ANS achieves compression as
close to entropy as arithmetic coding, but with the *speed* of Huffman — it replaces
the per-symbol multiply-and-renormalize with table lookups and a single state
variable. It comes in two flavors: **rANS** (range-like, good for large/dynamic
alphabets) and **tANS** (table-driven, the basis of **FSE**, "Finite State Entropy").

ANS spread fast because it removed the old trade-off ("Huffman is fast but leaves
bits on the table; arithmetic is tight but slow"):

- **zstd** (Facebook, 2016) uses **FSE (tANS)** for most streams and **Huffman** for
  literals — a telling detail: Huffman is still worth using where its speed wins and
  its rounding barely matters.
- **Apple LZFSE** is named for it (LZ + FSE).
- **JPEG XL** and several genomics formats (CRAM) use ANS.

If you enjoyed this guide, implementing rANS is the natural sequel — it's about as
much code as Huffman and it will make the "fractional bits" idea concrete.

---

## Coders live inside models

Step back and the whole landscape organizes around the **modeling vs. coding** split
from [Chapter 01](01-what-is-huffman.md). An entropy coder (Huffman, arithmetic,
ANS) only ever cashes in a probability distribution. Almost all the compression in a
real system comes from the **model** that produces a *skewed* distribution for the
coder to exploit:

| Format | Model (makes the skew) | Coder (cashes it in) |
| --- | --- | --- |
| **DEFLATE** (gzip, PNG, ZIP) | LZ77 (repetition → match tokens) | Huffman |
| **zstd** | LZ + huge windows + dictionaries | FSE (tANS) + Huffman |
| **Brotli** | LZ77 + static dictionary + context modeling | Huffman |
| **JPEG** (baseline) | DCT + quantization + run-length of zeros | Huffman |
| **JPEG 2000 / JBIG2** | wavelet / bitplane context model | arithmetic (MQ-coder) |
| **JPEG XL** | context modeling | ANS |
| **PPM / PAQ / cmix** | high-order context / mixing models | arithmetic |

Two lessons fall out. First, **Huffman is not obsolete** — it's still in DEFLATE,
Brotli, JPEG, and zstd's literals, because "fast, simple, patent-free, within a bit
of optimal" is exactly right for most jobs. Second, if you want *dramatically*
better compression, the lever is almost always a **better model**, not a better
coder. The state of the art (PAQ, cmix) wins by mixing many context models and
feeding an arithmetic coder — the coder is the humble part.

---

## Where to read next

**The primary sources**

- **D. A. Huffman (1952),** *"A Method for the Construction of Minimum-Redundancy
  Codes,"* Proceedings of the IRE, 40(9). The original three pages — very readable.
- **C. E. Shannon (1948),** *"A Mathematical Theory of Communication,"* Bell System
  Technical Journal. Where entropy and the source-coding theorem come from.
- **Witten, Neal & Cleary (1987),** *"Arithmetic Coding for Data Compression,"*
  Communications of the ACM, 30(6). The paper that made arithmetic coding practical.
- **J. Duda (2013),** *"Asymmetric numeral systems,"* arXiv:1311.2540. The ANS
  reference.
- **[RFC 1951](https://www.rfc-editor.org/rfc/rfc1951)** — the DEFLATE spec;
  §3.2.2 is the canonical-code construction you implemented.

**Books**

- **Cover & Thomas,** *Elements of Information Theory.* The rigorous treatment of
  entropy, Kraft–McMillan, and optimal codes (Chapter 5).
- **Khalid Sayood,** *Introduction to Data Compression.* The friendliest end-to-end
  compression textbook; excellent Huffman and arithmetic-coding chapters.
- **David Salomon,** *Data Compression: The Complete Reference.* Encyclopedic.
- **David MacKay,** *Information Theory, Inference, and Learning Algorithms.* Free
  online, wonderful on the intuition behind entropy and coding.

**Online**

- **Matt Mahoney,** *Data Compression Explained* (mattmahoney.net/dc/dce.html) — a
  free, modern, practical tour from Huffman through context mixing.
- The **zstd** and **FiniteStateEntropy** repositories (Yann Collet) — well-commented
  production ANS/Huffman.

---

## Key takeaways

- Huffman's only flaw is **whole-bit codes**: it wastes up to ~1 bit/symbol, which
  is catastrophic only for very skewed (especially binary) sources — where a model
  like run-length rescues it.
- **Adaptive Huffman** removes the header and the second pass, still whole-bit.
- **Arithmetic/range coding** and **ANS** spend *fractional* bits and reach the
  entropy floor; ANS does it at Huffman-like speed and now powers zstd, LZFSE, and
  JPEG XL.
- Entropy coders live inside **models**; the model creates the skew, the coder cashes
  it in — and big compression gains come from better models.
- **Huffman is still everywhere.** You just built the coder at the heart of the most
  widely deployed compression formats in history — in four languages.

---

*Back to the [guide overview](../README.md) · or revisit
[Chapter 01](01-what-is-huffman.md).*

**You've reached the end.** If you've got `make test-<lang>` green in even one
language, you've implemented a real, optimal entropy coder from first principles.
Do it in a second language to make the ideas stick — the algorithm is identical, and
watching it fall out of a different set of idioms is where the understanding
crystallizes.
