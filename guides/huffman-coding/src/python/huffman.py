#!/usr/bin/env python3
"""
huffman.py — YOUR Huffman codec (starter skeleton).

The boring parts (argument parsing, reading the input file, writing the output
file) are wired up so the test harness can drive your program. The interesting
part — the actual compression — is yours to write.

Implement encode() and decode() by following the guide:

  ../../docs/03-the-algorithm.md        frequencies -> Huffman tree
  ../../docs/05-encoding-and-bit-io.md   pack codes into a bitstream (MSB-first)
  ../../docs/06-decoding.md              turn the bitstream back into bytes
  ../../docs/07-canonical-huffman.md     (recommended) canonical codes
  ../../docs/08-the-file-format.md       the exact HUF1 header + payload layout

Check your progress from the src/ directory:

    make test-python          round-trip correctness (works with any format)
    make conformance-python   optional: match the reference HUF1 bytes exactly

Usage:
  python3 huffman.py encode <input> <output.huff>
  python3 huffman.py decode <input.huff> <output>
"""
import sys


def encode(data: bytes) -> bytes:
    """Compress `data` into your .huff byte string.

    A working plan (see the docs above):
      1. count how often each byte value appears
      2. build a Huffman tree and read off each byte's code
      3. write a header describing the codes, then the packed bitstream
    """
    raise NotImplementedError(
        "encode() is not implemented yet — see docs/03, 05, 07, 08")


def decode(blob: bytes) -> bytes:
    """Decompress a .huff byte string back into the original bytes.

      1. read the header and rebuild the same codes the encoder used
      2. read the bitstream one bit at a time until a code matches
      3. stop once you have produced the original number of bytes
    """
    raise NotImplementedError(
        "decode() is not implemented yet — see docs/06, 07, 08")


def main(argv: list[str]) -> int:
    if len(argv) != 4 or argv[1] not in ("encode", "decode"):
        sys.stderr.write(
            "usage:\n"
            "  huffman.py encode <input> <output.huff>\n"
            "  huffman.py decode <input.huff> <output>\n")
        return 2
    with open(argv[2], "rb") as f:
        data = f.read()
    result = encode(data) if argv[1] == "encode" else decode(data)
    with open(argv[3], "wb") as f:
        f.write(result)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
