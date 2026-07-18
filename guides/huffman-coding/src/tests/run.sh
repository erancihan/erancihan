#!/usr/bin/env bash
#
# run.sh — verify *your* Huffman implementation, in any language.
#
# It never looks at your source. It only drives your compiled program through
# its command-line interface, so the same harness checks the Python, Java, C and
# Rust versions identically.
#
#   bash tests/run.sh "<encode cmd>" "<decode cmd>"
#   bash tests/run.sh --golden "<encode cmd>" "<decode cmd>"
#
# <encode cmd> / <decode cmd> are whatever runs your tool, minus the two file
# arguments the harness appends. Examples (run from the src/ directory):
#
#   bash tests/run.sh "python3 python/huffman.py encode" \
#                     "python3 python/huffman.py decode"
#   bash tests/run.sh "c/huffman encode" "c/huffman decode"
#
# Two kinds of checks:
#   round-trip  decode(encode(x)) == x   — MUST pass for any correct codec,
#               whatever header/format you invent.
#   --golden    encode(x) is byte-for-byte equal to the reference HUF1 files in
#               tests/golden/ — only passes if you implement the exact canonical
#               format from docs/08. Optional; it's what makes cross-language
#               interop work. See docs/10 for why a correct codec can still fail
#               this.
#
# The Makefile wires these up as `make test-python`, `make conformance-rust`, etc.

set -u

GOLDEN=0
if [ "${1:-}" = "--golden" ]; then GOLDEN=1; shift; fi
ENCODE="${1:-}"
DECODE="${2:-}"
if [ -z "$ENCODE" ] || [ -z "$DECODE" ]; then
  echo "usage: run.sh [--golden] \"<encode cmd>\" \"<decode cmd>\"" >&2
  exit 2
fi

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CORPUS="$HERE/corpus"
GOLD="$HERE/golden"
WORK="$HERE/.work"
mkdir -p "$WORK"

# Split the command strings into words (our commands have no spaces in paths).
read -ra ENC <<< "$ENCODE"
read -ra DEC <<< "$DECODE"

pass=0
fail=0

echo "round-trip  —  decode(encode(x)) must equal x"
for f in "$CORPUS"/*.bin; do
  name=$(basename "$f" .bin)
  "${ENC[@]}" "$f" "$WORK/$name.huff" 2>"$WORK/$name.enc.err"; rc1=$?
  "${DEC[@]}" "$WORK/$name.huff" "$WORK/$name.out" 2>"$WORK/$name.dec.err"; rc2=$?
  in_sz=$(wc -c < "$f")
  if [ $rc1 -eq 0 ] && [ $rc2 -eq 0 ] && cmp -s "$f" "$WORK/$name.out"; then
    out_sz=$(wc -c < "$WORK/$name.huff")
    printf '  PASS  %-16s %7d -> %7d bytes\n' "$name" "$in_sz" "$out_sz"
    pass=$((pass + 1))
  else
    printf '  FAIL  %-16s\n' "$name"
    [ -s "$WORK/$name.enc.err" ] && sed 's/^/          encode: /' "$WORK/$name.enc.err"
    [ -s "$WORK/$name.dec.err" ] && sed 's/^/          decode: /' "$WORK/$name.dec.err"
    [ $rc1 -eq 0 ] && [ $rc2 -eq 0 ] && echo "          (output differs from input)"
    fail=$((fail + 1))
  fi
done

if [ $GOLDEN -eq 1 ]; then
  echo
  echo "golden  —  encode(x) must match the reference canonical HUF1 bytes"
  for f in "$GOLD"/*.in; do
    name=$(basename "$f" .in)
    "${ENC[@]}" "$f" "$WORK/$name.golden.huff" 2>/dev/null
    if cmp -s "$GOLD/$name.huff" "$WORK/$name.golden.huff"; then
      printf '  PASS  %-16s\n' "$name"
      pass=$((pass + 1))
    else
      printf '  FAIL  %-16s  (bytes differ from reference — see docs/08 & docs/10)\n' "$name"
      fail=$((fail + 1))
    fi
  done
fi

echo
echo "-----------------------------------------------"
printf "  %d passed, %d failed\n" "$pass" "$fail"
if [ $fail -eq 0 ]; then
  echo "  ALL TESTS PASSED"
  echo "-----------------------------------------------"
  exit 0
else
  echo "  SOME TESTS FAILED"
  echo "-----------------------------------------------"
  exit 1
fi
