#!make

.PHONY: run

compile:
	rustc hello.rs --out-dir ./make-build-dev/

run: compile
	@echo "> run"
	./make-build-dev/hello
