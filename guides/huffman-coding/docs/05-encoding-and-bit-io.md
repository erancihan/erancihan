# Chapter 05 — Encoding & bit I/O

> You have a code table. Now you have to emit `0`s and `1`s — but computers write
> *bytes*, eight bits at a time, and Huffman codes are 1, 3, 7, 12… bits long.
> Bridging that gap is the single fiddliest part of the whole project. Get the bit
> order and the final-byte padding right and everything downstream just works;
> get them subtly wrong and you'll pass some tests and fail others in ways that
> are maddening to debug. This chapter slows down and does it carefully.

## What you'll learn

- Why encoding is a **bit-packing** problem, not a byte problem.
- The **MSB-first** convention this guide uses, and why it pairs naturally with
  the codes.
- A **`BitWriter`** that accumulates bits into bytes, and a **`BitReader`** that
  takes them back apart.
- The **padding trap** — the last byte is rarely full — and the standard fix:
  store how many symbols the stream holds.

---

## The mismatch

Encoding the message is conceptually trivial: for each symbol, look up its code
and append those bits.

```
for each byte b in the input:
    (code, length) = table[b]
    append the `length` bits of `code` to the output
```

The catch is "append bits." Memory and files are addressed in **bytes**. There is
no `append one bit` instruction. So you keep a one-byte **accumulator** and a
count of how many bits are in it; you shove bits in one at a time; and every time
the accumulator fills to 8 bits, you emit it as a byte and start a fresh one.

Everything hard about encoding is bookkeeping around that accumulator.

---

## Pick a bit order and never waver: MSB-first

When you pack bits into a byte, you must decide which end fills first. Two
conventions exist:

- **MSB-first (big-endian bits):** the first bit you write becomes the *most*
  significant bit (value 128) of the byte, then 64, 32, … This guide uses this
  one. It's what JPEG and PNG use, and it makes a byte read left-to-right match
  the order you wrote the bits.
- **LSB-first (little-endian bits):** the first bit becomes the *least*
  significant bit. DEFLATE uses this for its Huffman streams (though it packs its
  *code values* MSB-first — DEFLATE is genuinely confusing about this).

Neither is more correct. What matters is that **your writer and your reader agree,
byte for byte.** Mixing them is the #1 source of "encode works, decode returns
garbage" bugs. We pick MSB-first and use it everywhere.

Why MSB-first pairs nicely with our codes: the canonical codes from
[Chapter 07](07-canonical-huffman.md) are numbers whose *most significant bit is
the first bit of the codeword*. So "write the code MSB-first" means "write bit
`length-1`, then `length-2`, …, down to bit `0`," which is a clean loop.

---

## The `BitWriter`

Here's the accumulator made concrete, in pseudocode:

```
BitWriter:
    out   = empty byte buffer
    cur   = 0        # the byte being filled (0..255)
    nbits = 0        # how many bits are currently in `cur` (0..7)

    write_bits(code, length):
        # emit the low `length` bits of `code`, most-significant first
        for i from length-1 down to 0:
            bit = (code >> i) & 1
            cur = (cur << 1) | bit      # make room, drop the new bit in at the bottom
            nbits += 1
            if nbits == 8:
                out.append(cur)
                cur = 0
                nbits = 0

    finish():
        # flush a partial final byte, if any, padded with zero bits on the RIGHT
        if nbits > 0:
            out.append(cur << (8 - nbits))
            cur = 0; nbits = 0
        return out
```

Trace `write_bits` on a single 3-bit code, say `B = 110` (`code = 6`,
`length = 3`). The loop runs `i = 2, 1, 0`, pulling bits `1`, `1`, `0`:

```
start:  cur = xxxxx (5 bits already there), nbits = 5
i=2 bit=1:  cur = (cur<<1)|1,  nbits=6
i=1 bit=1:  cur = (cur<<1)|1,  nbits=7
i=0 bit=0:  cur = (cur<<1)|0,  nbits=8  → emit byte, reset
```

The `cur = (cur << 1) | bit` idiom is the whole trick: shift everything left to
open a slot at the bottom, then OR the new bit into that slot. After eight of
those, `cur` holds exactly the eight bits in the order you wrote them, MSB-first.

---

## The padding trap (and why we store a length)

The message is `23` bits long for `ABRACADABRA`. But files hold whole bytes, and
`23` isn't a multiple of 8 — it rounds up to `24` bits = `3` bytes. So the writer
pads the final byte with one extra `0` bit on the right.

Now put yourself in the decoder's shoes. It reads 3 bytes = 24 bits. It happily
decodes symbols… and after the 23rd real bit, there's a stray `0`. Depending on
the code table, that trailing `0` might *look* like the start of a valid code — or
even a whole valid code (`A` is just `0`!) — and the decoder emits one phantom
symbol. `ABRACADABRA` decodes to `ABRACADABRAA`. Silent corruption.

The padding bits are indistinguishable from data. You **cannot** recover the true
end of the message from the bitstream alone. You must record it out of band. Two
equivalent options:

1. **Store the number of symbols** the stream encodes (we store this — an 8-byte
   count in the header). The decoder emits exactly that many symbols and ignores
   whatever bits remain.
2. **Store the number of valid bits** (or equivalently, how many padding bits were
   added). Same effect.

We use option 1. It's simple, and it also gives the decoder its loop bound "for
free": *decode until you've produced N symbols, then stop.* The padding is never
even looked at.

> This is why [Chapter 08](08-the-file-format.md)'s header begins with an 8-byte
> original length. It's not decoration — it's the thing that makes decoding
> unambiguous.

---

## The `BitReader`

Decoding needs the mirror image: pull bits back out, MSB-first, in the same order.

```
BitReader(data):
    data  = the payload bytes
    pos   = 0        # index of the byte we're reading
    nbits = 0        # how many bits we've already consumed from data[pos] (0..7)

    read_bit():
        bit = (data[pos] >> (7 - nbits)) & 1   # MSB-first: bit 7 first, then 6, …
        nbits += 1
        if nbits == 8:
            nbits = 0
            pos += 1
        return bit
```

`(data[pos] >> (7 - nbits)) & 1` reads bit position `7` first (the MSB), then `6`,
and so on — the exact reverse of how the writer stuffed them in. Writer and reader
are now symmetric, which is the property you're always checking when a bitstream
misbehaves.

The decoder loop (fleshed out in [Chapter 06](06-decoding.md)) will call
`read_bit()` repeatedly, feeding bits into either a tree walk or a table lookup,
and it will call it exactly as many times as the codes require — never running
into the padding, because it stops after `N` symbols.

---

## Worked example: `ABRACADABRA` → 3 bytes

Using the canonical codes `A=0, B=100, C=101, D=110, R=111`, encode
`A B R A C A D A B R A`:

```
symbol:  A   B    R    A   C    A   D    A   B    R    A
code:    0   100  111  0   101  0   110  0   100  111  0
```

Concatenate, then slice into bytes (MSB-first). The 23 payload bits, plus one
`0` pad bit to fill the last byte:

```
bit index:  0        8        16       23↓ pad
bits:       01001110 10101100 10011100
            └─ 78 ─┘ └─ 172 ─┘ └─ 156 ┘
```

So the payload is the three bytes `[78, 172, 156]` (`0x4E 0xAC 0x9C`). That's
exactly what the reference produces and what [Chapter 08](08-the-file-format.md)
dissects byte-by-byte. If your encoder emits these three bytes for this input,
your `BitWriter` is correct.

To *verify by hand*, resplit `01001110 10101100 10011100` back into codes,
greedily matching the prefix-free table:

```
0          → A
100        → B
111        → R
0          → A
101        → C
0          → A
110        → D
0          → A
100        → B
111        → R
0          → A
[trailing 0 → ignored: we already have 11 symbols]
```

Eleven symbols, `ABRACADABRA`, and the final pad bit is discarded because the
length counter said "stop at 11." The round trip closes.

---

## The bugs this chapter exists to prevent

Almost every bit-I/O bug is one of these five. When decode returns garbage, check
them in order:

| Symptom | Likely cause |
| --- | --- |
| Decoded output is bit-scrambled nonsense | Writer and reader disagree on **bit order** (one MSB-first, one LSB-first). |
| Output has **one or two extra** trailing symbols | You didn't store/enforce the **symbol count**; padding bits are being decoded. |
| Last few bits wrong; everything else fine | **Padding on the wrong side** — pad the final byte on the right (low bits), i.e. `cur << (8 - nbits)`. |
| Everything shifted by some bits | Forgot to **flush** the partial final byte, or flushed it twice. |
| A specific symbol always wrong | Writing the code **LSB-first** instead of MSB-first (`i` looping the wrong way). |

Every one of these passes a "compress a big text file" smoke test some of the
time and fails the edge cases in the corpus. That's what the tests are for.

---

## Key takeaways

- Encoding is **bit packing**: keep a byte accumulator and flush it every 8 bits.
- Commit to **one bit order** (this guide: MSB-first) and use it in both the
  writer and the reader.
- The final byte is almost always **padded**; padding bits are indistinguishable
  from data, so **store the symbol count** and stop decoding when you reach it.
- `cur = (cur << 1) | bit` to write, `(byte >> (7 - nbits)) & 1` to read — memorize
  the pair; they're the heartbeat of the codec.

Next: turning that bitstream back into symbols — two different ways.

---

*Next → [Chapter 06: Decoding](06-decoding.md)*
