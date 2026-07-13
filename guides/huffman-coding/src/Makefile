# Build and test YOUR Huffman implementations.
#
# The four programs under python/, java/, c/ and rust/ are starter skeletons:
# the CLI and file I/O are done, but encode()/decode() are yours to write. The
# targets below build them and run the test harness against them.
#
#   make                 build the C, Java and Rust skeletons (Python needs none)
#
#   make test-python     round-trip test one language (works with ANY format
#   make test-c          you choose — this is the check that matters while you
#   make test-java       are building it up)
#   make test-rust
#   make test            round-trip test all four (best effort, keeps going)
#
#   make conformance-python   also require byte-for-byte equality with the
#   make conformance-c        reference canonical HUF1 files in tests/golden/.
#   make conformance-java     Optional stretch goal; needs the exact format from
#   make conformance-rust     docs/08. See docs/10 for why round-trip can pass
#                             while conformance fails.
#
#   make clean           remove build products and scratch test files

CC      ?= cc
CFLAGS  ?= -O2 -Wall -Wextra
JAVAC   ?= javac
RUSTC   ?= rustc

# How to invoke each tool (the harness appends the two file arguments).
PY_ENC = python3 python/huffman.py encode
PY_DEC = python3 python/huffman.py decode
C_ENC  = c/huffman encode
C_DEC  = c/huffman decode
J_ENC  = java -cp java Huffman encode
J_DEC  = java -cp java Huffman decode
R_ENC  = rust/huffman encode
R_DEC  = rust/huffman decode

.PHONY: all test clean \
        test-python test-c test-java test-rust \
        conformance-python conformance-c conformance-java conformance-rust

all: c/huffman java/Huffman.class rust/huffman
	@echo ""
	@echo "built C, Java and Rust skeletons. Python needs no build."
	@echo "Implement encode()/decode(), then: make test-python (etc.)"

c/huffman: c/huffman.c
	$(CC) $(CFLAGS) -o $@ $<

java/Huffman.class: java/Huffman.java
	$(JAVAC) -d java java/Huffman.java

rust/huffman: rust/src/main.rs
	$(RUSTC) -O rust/src/main.rs -o rust/huffman

# ---- round-trip tests (the everyday check) --------------------------------
test-python:
	@bash tests/run.sh "$(PY_ENC)" "$(PY_DEC)"
test-c: c/huffman
	@bash tests/run.sh "$(C_ENC)" "$(C_DEC)"
test-java: java/Huffman.class
	@bash tests/run.sh "$(J_ENC)" "$(J_DEC)"
test-rust: rust/huffman
	@bash tests/run.sh "$(R_ENC)" "$(R_DEC)"

test:
	-@$(MAKE) --no-print-directory test-python
	-@$(MAKE) --no-print-directory test-c
	-@$(MAKE) --no-print-directory test-java
	-@$(MAKE) --no-print-directory test-rust

# ---- conformance tests (optional: match the canonical format exactly) -----
conformance-python:
	@bash tests/run.sh --golden "$(PY_ENC)" "$(PY_DEC)"
conformance-c: c/huffman
	@bash tests/run.sh --golden "$(C_ENC)" "$(C_DEC)"
conformance-java: java/Huffman.class
	@bash tests/run.sh --golden "$(J_ENC)" "$(J_DEC)"
conformance-rust: rust/huffman
	@bash tests/run.sh --golden "$(R_ENC)" "$(R_DEC)"

clean:
	rm -f c/huffman java/*.class rust/huffman
	rm -rf tests/.work rust/target
