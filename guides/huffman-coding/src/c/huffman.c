/*
 * huffman.c — YOUR Huffman codec (starter skeleton).
 *
 * File reading/writing and argument parsing are provided so the test harness can
 * drive your program. The compression itself — encode() and decode() — is yours
 * to write.
 *
 * Follow the guide:
 *   ../../docs/03-the-algorithm.md        frequencies -> Huffman tree
 *   ../../docs/05-encoding-and-bit-io.md   pack codes into a bitstream (MSB-first)
 *   ../../docs/06-decoding.md              turn the bitstream back into bytes
 *   ../../docs/07-canonical-huffman.md     (recommended) canonical codes
 *   ../../docs/08-the-file-format.md       the exact HUF1 header + payload layout
 *
 * Check your progress from the src/ directory:
 *   make test-c          round-trip correctness (works with any format)
 *   make conformance-c   optional: match the reference HUF1 bytes exactly
 *
 * Build:  cc -O2 -Wall -Wextra -o huffman huffman.c
 * Use:    ./huffman encode <input> <output.huff>
 *         ./huffman decode <input.huff> <output>
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

/* Compress `data` (length `len`) into a freshly malloc'd buffer.
 * Set *out_len to the number of bytes produced and return the buffer.
 *
 *   1. count how often each byte value appears
 *   2. build a Huffman tree and read off each byte's code
 *   3. write a header describing the codes, then the packed bitstream
 */
static uint8_t *encode(const uint8_t *data, size_t len, size_t *out_len) {
    (void)data; (void)len; (void)out_len;
    fprintf(stderr, "encode() is not implemented yet — see docs/03, 05, 07, 08\n");
    exit(1);
    return NULL; /* unreachable */
}

/* Decompress `blob` (length `blob_len`) back into the original bytes.
 *
 *   1. read the header and rebuild the same codes the encoder used
 *   2. read the bitstream one bit at a time until a code matches
 *   3. stop once you have produced the original number of bytes
 */
static uint8_t *decode(const uint8_t *blob, size_t blob_len, size_t *out_len) {
    (void)blob; (void)blob_len; (void)out_len;
    fprintf(stderr, "decode() is not implemented yet — see docs/06, 07, 08\n");
    exit(1);
    return NULL; /* unreachable */
}

/* ---- plumbing: whole-file read/write (nothing Huffman-specific below) ---- */

static uint8_t *read_all(const char *path, size_t *len) {
    FILE *f = fopen(path, "rb");
    if (!f) { perror(path); exit(1); }
    fseek(f, 0, SEEK_END);
    long n = ftell(f);
    fseek(f, 0, SEEK_SET);
    uint8_t *buf = malloc(n > 0 ? (size_t)n : 1);
    if (!buf) { perror("malloc"); exit(1); }
    if (n > 0 && fread(buf, 1, (size_t)n, f) != (size_t)n) { perror("fread"); exit(1); }
    fclose(f);
    *len = (size_t)n;
    return buf;
}

static void write_all(const char *path, const uint8_t *data, size_t len) {
    FILE *f = fopen(path, "wb");
    if (!f) { perror(path); exit(1); }
    if (len) fwrite(data, 1, len, f);
    fclose(f);
}

int main(int argc, char **argv) {
    if (argc != 4 || (strcmp(argv[1], "encode") != 0 && strcmp(argv[1], "decode") != 0)) {
        fprintf(stderr,
            "usage:\n"
            "  huffman encode <input> <output.huff>\n"
            "  huffman decode <input.huff> <output>\n");
        return 2;
    }
    size_t in_len = 0, out_len = 0;
    uint8_t *in = read_all(argv[2], &in_len);
    uint8_t *out = (strcmp(argv[1], "encode") == 0)
                   ? encode(in, in_len, &out_len)
                   : decode(in, in_len, &out_len);
    write_all(argv[3], out, out_len);
    free(in);
    free(out);
    return 0;
}
