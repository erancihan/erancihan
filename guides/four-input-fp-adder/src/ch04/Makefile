# Chapter 4 regression. Artifacts go to $(BUILD), never next to the source.
#   make / make -k / make lint / make clean
#   make BUILD=/tmp/x        put the artifacts somewhere else
#   make PLUSARGS=+break     prove the failure gate actually fires
# Adding a test is adding a file: the list is discovered, not maintained.
# The pattern rule requires that file tb_foo.v contains module tb_foo.

IVERILOG ?= iverilog
VVP      ?= vvp
IVFLAGS  ?= -g2012 -Wall -y .
BUILD    ?= /tmp/ch04-build
PLUSARGS ?=

# -y . resolves the DUT at compile time, which make cannot see, so every .v is
# a prerequisite of every build. Coarse; iverilog -M writes exact depfiles.
SRCS := $(wildcard *.v)
DATA := $(wildcard *.hex)

# bad_adder8.v is a module, not a testbench: -y . pulls it in for tb_check.
TESTS := $(filter-out bad_adder8, \
           $(notdir $(basename $(wildcard tb_*.v) $(wildcard bad_*.v))))

all: test
test: $(addprefix run-,$(TESTS))

$(BUILD):
	@mkdir -p $(BUILD)

$(BUILD)/%.vvp: %.v $(SRCS) | $(BUILD)
	$(IVERILOG) $(IVFLAGS) -s $* -o $@ $<

# Compiling is cached, running is not: a result make calls up to date is a test
# that has quietly stopped running, and no PLUSARGS would reach it. FORCE keeps
# every run-% out of date. vvp runs in the source directory, because $readmemh
# resolves relative paths against the working directory; nothing is written
# there, since the log goes to $(BUILD) and dumping is behind a plusarg.
run-%: $(BUILD)/%.vvp $(DATA) FORCE
	@log=$(BUILD)/$*.log; \
	 $(VVP) $< $(PLUSARGS) > $$log 2>&1; \
	 rc=$$?; \
	 if [ $$rc -ne 0 ] || grep -qE '(^|[^A-Za-z])FAIL' $$log; then \
	   echo "FAIL $*  (rc=$$rc)"; sed 's/^/    /' $$log; exit 1; \
	 else echo "ok   $*"; fi

# Elaborate every testbench and emit nothing: a whole-suite syntax gate.
lint:
	@for t in $(TESTS); do \
	   $(IVERILOG) $(IVFLAGS) -t null -s $$t $$t.v || exit 1; \
	 done

clean:
	rm -rf $(BUILD)

FORCE:

.PHONY: all test lint clean FORCE
.PRECIOUS: $(BUILD)/%.vvp
