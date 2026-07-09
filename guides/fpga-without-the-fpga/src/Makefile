# Runs every step's self-checking testbench.
#
#   make            run everything (needs iverilog; step 08 also needs ghdl)
#   make 01-counter run a single step
#   make clean      remove simulation build products (keeps the .vcd-less tree)
#
# Every testbench prints "ALL TESTS PASSED" on success; the grep turns that
# into a real exit code so this Makefile works in CI too.

IVERILOG ?= iverilog -g2012
VVP      ?= vvp
GHDL     ?= ghdl
PYTHON   ?= python3

VERILOG_STEPS = 01-counter 02-alu 03-uart-tx 04-memory 05-cpu-rv32i \
                06-gpu-simt 07-tpu-systolic

.PHONY: all clean $(VERILOG_STEPS) 08-vhdl-counter

all: $(VERILOG_STEPS) 08-vhdl-counter
	@echo ""
	@echo "==== every step passed ===="

define run_step
	@echo ""
	@echo "==== $(1) ===="
	cd $(1) && $(IVERILOG) -o sim.vvp $(2) && $(VVP) sim.vvp | tee sim.log \
		&& grep -q "ALL TESTS PASSED" sim.log
endef

01-counter:
	$(call run_step,$@,tb_counter.v counter.v)

02-alu:
	$(call run_step,$@,tb_alu.v alu.v)

03-uart-tx:
	$(call run_step,$@,tb_uart_tx.v uart_tx.v)

04-memory:
	$(call run_step,$@,tb_memory.v regfile.v ram_sync.v fifo_sync.v)

05-cpu-rv32i:
	cd $@ && $(PYTHON) asm.py test.s program.hex
	$(call run_step,$@,tb_cpu.v cpu.v)

06-gpu-simt:
	$(call run_step,$@,tb_gpu.v gpu.v)

07-tpu-systolic:
	$(call run_step,$@,tb_systolic.v systolic.v pe.v)

08-vhdl-counter:
	@echo ""
	@echo "==== $@ (GHDL) ===="
	cd $@ && $(GHDL) -a --std=08 counter.vhd tb_counter.vhd \
		&& $(GHDL) -e --std=08 tb_counter \
		&& $(GHDL) -r --std=08 tb_counter | tee sim.log \
		&& grep -q "ALL TESTS PASSED" sim.log

clean:
	rm -f */sim.vvp */sim.log */*.vcd */*.ghw */work-obj*.cf */tb_counter
