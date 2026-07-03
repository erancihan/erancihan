//go:build linux

// Step 2 — The first namespace (UTS).
//
// We ask the kernel to run the child in a *new UTS namespace*. UTS ("UNIX
// Time-sharing System") is the namespace that owns the hostname and NIS domain
// name. It's the simplest namespace and a perfect first taste of isolation.
//
// Notice we do NOT re-exec ourselves yet — we set the clone flag directly on the
// command. That means the child immediately becomes `/bin/sh`; we have no chance
// to run our own setup code (like changing the hostname) *inside* the new
// namespace before the shell starts. Fixing that is exactly what Step 3 does.
//
// So how do we observe isolation here? The new UTS namespace starts as a *copy*
// of ours, but it is independent and writable:
//
//	go build -o ../bin/step2-uts-namespace .
//	sudo ./step2-uts-namespace run /bin/sh
//	# inside the shell:
//	#   hostname                 -> same as host (it's a copy)
//	#   hostname isolated-box    -> change it
//	#   hostname                 -> isolated-box
//	# now in ANOTHER terminal on the host:
//	#   hostname                 -> UNCHANGED. The child's change was private.
//
// That private, writable copy is the essence of every namespace.
package main

import (
	"fmt"
	"os"
	"os/exec"
	"syscall"
)

func main() {
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

func run(args []string) {
	if len(args) == 0 {
		fmt.Fprintln(os.Stderr, "run: need a command to execute")
		os.Exit(1)
	}
	fmt.Printf("[step2] running %v in a new UTS namespace\n", args)

	cmd := exec.Command(args[0], args[1:]...)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	// The one new line compared to Step 1. SysProcAttr lets us reach the
	// low-level clone(2) flags Go uses to create the child. CLONE_NEWUTS puts
	// the child (and only the child) into a brand-new UTS namespace.
	//
	// Creating namespaces requires CAP_SYS_ADMIN, hence `sudo` — until Step 8,
	// where user namespaces let us do this rootless.
	cmd.SysProcAttr = &syscall.SysProcAttr{
		Cloneflags: syscall.CLONE_NEWUTS,
	}

	if err := cmd.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "[step2] child exited with error: %v\n", err)
		os.Exit(1)
	}
}

func usage() {
	fmt.Fprintf(os.Stderr, "usage: %s run <command> [args...]\n", os.Args[0])
	os.Exit(1)
}
