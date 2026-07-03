//go:build linux

// Step 1 — "A container is just a process."
//
// Before we isolate anything, let's establish the thing we're going to isolate:
// a child process. This program does the bare minimum a container runtime does —
// it runs a command with its standard input/output/error wired up to ours — with
// NO isolation at all. Everything it can see (PIDs, hostname, filesystem, network)
// is exactly what the host sees.
//
// The whole rest of the guide is about progressively narrowing that view.
//
//	go build -o ../bin/step1-exec .
//	./step1-exec run /bin/sh
//	# inside: `hostname`, `ps aux`, `ls /` — all identical to the host.
package main

import (
	"fmt"
	"os"
	"os/exec"
)

func main() {
	// A tiny sub-command dispatcher. We only understand "run".
	if len(os.Args) < 2 {
		usage()
	}

	switch os.Args[1] {
	case "run":
		run(os.Args[2:])
	default:
		usage()
	}
}

// run executes args[0] with args[1:] as arguments.
func run(args []string) {
	if len(args) == 0 {
		fmt.Fprintln(os.Stderr, "run: need a command to execute")
		os.Exit(1)
	}
	fmt.Printf("[step1] running %v as a plain child process (no isolation)\n", args)

	// exec.Command builds the child; we forward our own stdio so the program
	// behaves like a normal shell would when launching a subprocess.
	cmd := exec.Command(args[0], args[1:]...)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	// Run blocks until the child exits. There is no fork/exec magic here yet —
	// this is exactly what your shell does when you type a command.
	if err := cmd.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "[step1] child exited with error: %v\n", err)
		os.Exit(1)
	}
}

func usage() {
	fmt.Fprintf(os.Stderr, "usage: %s run <command> [args...]\n", os.Args[0])
	os.Exit(1)
}
