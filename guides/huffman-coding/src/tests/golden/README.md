# Golden vectors

Each `NAME.in` is an input file; `NAME.huff` is the exact canonical `HUF1`
output a conforming encoder must produce for it (see
[`../../../docs/08-the-file-format.md`](../../../docs/08-the-file-format.md)).

`make conformance-<lang>` compares your `encode` output against these byte-for-byte.
They are also handy for debugging a decoder: `<program> decode abracadabra.huff -`
should print `ABRACADABRA`.

| Vector | Why it's here |
|---|---|
| `abracadabra` | the worked example from [docs/03](../../../docs/03-the-algorithm.md); tiny enough to check by hand |
| `hello` | ordinary ASCII text |
| `single` | one distinct symbol (the length-0-code edge case) |
| `empty` | zero bytes (header only, no payload) |
| `all-256` | every byte value once — a flat distribution, worst case for Huffman |
