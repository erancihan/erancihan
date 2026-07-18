/*
 * Huffman.java — YOUR Huffman codec (starter skeleton).
 *
 * Argument parsing and file I/O are wired up so the test harness can drive your
 * program. The compression itself — encode() and decode() — is yours to write.
 *
 * Follow the guide:
 *   ../../docs/03-the-algorithm.md        frequencies -> Huffman tree
 *   ../../docs/05-encoding-and-bit-io.md   pack codes into a bitstream (MSB-first)
 *   ../../docs/06-decoding.md              turn the bitstream back into bytes
 *   ../../docs/07-canonical-huffman.md     (recommended) canonical codes
 *   ../../docs/08-the-file-format.md       the exact HUF1 header + payload layout
 *
 * Check your progress from the src/ directory:
 *   make test-java          round-trip correctness (works with any format)
 *   make conformance-java   optional: match the reference HUF1 bytes exactly
 *
 * Java tip: a byte is signed. To use a byte value as a 0..255 index or count,
 * write `b & 0xFF`.
 *
 * Build:  javac Huffman.java
 * Use:    java Huffman encode <input> <output.huff>
 *         java Huffman decode <input.huff> <output>
 */
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

public final class Huffman {

    /** Compress `data` into your .huff byte array. */
    static byte[] encode(byte[] data) {
        // 1. count how often each byte value appears
        // 2. build a Huffman tree and read off each byte's code
        // 3. write a header describing the codes, then the packed bitstream
        throw new UnsupportedOperationException(
                "encode() is not implemented yet — see docs/03, 05, 07, 08");
    }

    /** Decompress a .huff byte array back into the original bytes. */
    static byte[] decode(byte[] blob) {
        // 1. read the header and rebuild the same codes the encoder used
        // 2. read the bitstream one bit at a time until a code matches
        // 3. stop once you have produced the original number of bytes
        throw new UnsupportedOperationException(
                "decode() is not implemented yet — see docs/06, 07, 08");
    }

    public static void main(String[] args) throws IOException {
        if (args.length != 3 || (!args[0].equals("encode") && !args[0].equals("decode"))) {
            System.err.println("usage:");
            System.err.println("  java Huffman encode <input> <output.huff>");
            System.err.println("  java Huffman decode <input.huff> <output>");
            System.exit(2);
        }
        byte[] in = Files.readAllBytes(Path.of(args[1]));
        byte[] out = args[0].equals("encode") ? encode(in) : decode(in);
        Files.write(Path.of(args[2]), out);
    }
}
