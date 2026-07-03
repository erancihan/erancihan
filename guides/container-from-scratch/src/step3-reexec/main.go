//go:build linux

// Step 3 — The re-exec trick: running our own code *inside* the namespace.
//
// In Step 2 the child became `/bin/sh` immediately, so we couldn't configure the
// namespace first. We want to, for example, set the hostname *before* the shell
// starts. The classic way to do that in Go is the "re-exec" pattern:
//
//	parent:  run   -> exec /proc/self/exe child <cmd...>   (with clone flags)
//	child:   child -> configure namespace, then exec <cmd...>
//
// Why re-exec instead of a bare fork()? Go programs are multi-threaded (the
// scheduler, GC, and netpoller all run on OS threads). A raw fork() copies only
// the calling thread, leaving the Go runtime in a broken, half-initialized state
// in the child. Re-execing `/proc/self/exe` (a magic symlink to our own binary)
// starts a *fresh* Go runtime that is already inside the new namespaces, because
// the clone flags were applied by the exec that launched it.
//
//	go build -o ../bin/step3-reexec .
//	sudo ./step3-reexec run /bin/sh
//	# inside: `hostname` now prints "container" — we set it, from our own code,
//	# inside the new UTS namespace, before the shell ever ran.
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
		// Called by the user. Sets up namespaces and re-execs ourselves.
		run(os.Args[2:])
	case "child":
		// Called by us (via /proc/self/exe). Runs INSIDE the new namespace.
		child(os.Args[2:])
	default:
		usage()
	}
}

// run re-executes this same binary as `<self> child <cmd...>`, asking the kernel
// to place that new process in a fresh UTS namespace.
func run(args []string) {
	if len(args) == 0 {
		fmt.Fprintln(os.Stderr, "run: need a command to execute")
		os.Exit(1)
	}
	fmt.Printf("[step3] parent pid=%d — re-execing self as 'child' in a new UTS namespace\n", os.Getpid())

	// "/proc/self/exe" always points at the currently-running executable, so we
	// don't need to know our own path. We prepend "child" as the sub-command.
	cmd := exec.Command("/proc/self/exe", append([]string{"child"}, args...)...)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.SysProcAttr = &syscall.SysProcAttr{
		Cloneflags: syscall.CLONE_NEWUTS,
	}

	if err := cmd.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "[step3] child exited with error: %v\n", err)
		os.Exit(1)
	}
}

// child runs inside the new namespace. Now we can configure the environment
// before handing control to the user's command.
func child(args []string) {
	fmt.Printf("[step3] child pid=%d — inside new UTS namespace, setting hostname\n", os.Getpid())

	// This changes the hostname of OUR UTS namespace only. The host is untouched.
	must(syscall.Sethostname([]byte("container")))

	// Replace this process image with the user's command. syscall.Exec does not
	// return on success — the child *becomes* /bin/sh, inheriting our namespace,
	// hostname, and stdio. This is the same execve(2) a shell uses.
	must(syscall.Exec(args[0], args, os.Environ()))
}

func must(err error) {
	if err != nil {
		fmt.Fprintf(os.Stderr, "[step3] error: %v\n", err)
		os.Exit(1)
	}
}

func usage() {
	fmt.Fprintf(os.Stderr, "usage: %s run <command> [args...]\n", os.Args[0])
	os.Exit(1)
}
