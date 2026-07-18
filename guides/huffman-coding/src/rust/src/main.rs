// huffman — YOUR Huffman codec (starter skeleton).
//
// Argument parsing and file I/O are wired up so the test harness can drive your
// program. The compression itself — encode() and decode() — is yours to write.
//
// Follow the guide:
//   ../../docs/03-the-algorithm.md        frequencies -> Huffman tree
//   ../../docs/05-encoding-and-bit-io.md   pack codes into a bitstream (MSB-first)
//   ../../docs/06-decoding.md              turn the bitstream back into bytes
//   ../../docs/07-canonical-huffman.md     (recommended) canonical codes
//   ../../docs/08-the-file-format.md       the exact HUF1 header + payload layout
//
// Check your progress from the src/ directory:
//   make test-rust          round-trip correctness (works with any format)
//   make conformance-rust   optional: match the reference HUF1 bytes exactly
//
// Build:  rustc -O src/main.rs -o huffman     (no dependencies)
//     or: cargo build --release
// Use:    huffman encode <input> <output.huff>
//         huffman decode <input.huff> <output>

use std::process::exit;

/// Compress `data` into your .huff byte vector.
///
///   1. count how often each byte value appears
///   2. build a Huffman tree and read off each byte's code
///   3. write a header describing the codes, then the packed bitstream
fn encode(data: &[u8]) -> Vec<u8> {
    let _ = data;
    unimplemented!("encode() is not implemented yet — see docs/03, 05, 07, 08");
}

/// Decompress a .huff byte slice back into the original bytes.
///
///   1. read the header and rebuild the same codes the encoder used
///   2. read the bitstream one bit at a time until a code matches
///   3. stop once you have produced the original number of bytes
fn decode(blob: &[u8]) -> Vec<u8> {
    let _ = blob;
    unimplemented!("decode() is not implemented yet — see docs/06, 07, 08");
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.len() != 4 || (args[1] != "encode" && args[1] != "decode") {
        eprintln!("usage:");
        eprintln!("  huffman encode <input> <output.huff>");
        eprintln!("  huffman decode <input.huff> <output>");
        exit(2);
    }
    let input = std::fs::read(&args[2]).unwrap_or_else(|e| {
        eprintln!("{}: {}", args[2], e);
        exit(1);
    });
    let output = if args[1] == "encode" {
        encode(&input)
    } else {
        decode(&input)
    };
    std::fs::write(&args[3], &output).unwrap_or_else(|e| {
        eprintln!("{}: {}", args[3], e);
        exit(1);
    });
}
