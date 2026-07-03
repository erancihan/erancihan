//go:build linux

// Step 4 — Its own process tree (PID namespace) and its own /proc.
//
// We add two more clone flags:
//
//	CLONE_NEWPID  the child becomes PID 1 and can only see processes it starts.
//	CLONE_NEWNS   the child gets its own mount namespace (a private copy of the
//	              host's mount table) so the mounts we make don't leak to the host.
//
// A PID namespace on its own is invisible to tools like `ps`, because `ps` reads
// /proc — and /proc still shows the host. So inside the child we mount a *fresh*
// procfs over /proc. Because procfs reports the PID namespace of whoever mounts
// it, that new /proc shows ONLY the container's processes, with the shell as PID 1.
//
// The mount namespace is what makes this safe: our `mount("/proc")` happens in a
// private copy of the mount table, so the host's /proc is untouched, and when the
// container exits the namespace (and its mounts) simply evaporate — no cleanup.
//
//	go build -o ../bin/step4-pid-and-proc .
//	sudo ./step4-pid-and-proc run /bin/sh
//	# inside:
//	#   echo $$      -> 1        (the shell is PID 1 in its namespace)
//	#   ps aux       -> only the shell and ps; the host's processes are gone
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
	case "child":
		child(os.Args[2:])
	default:
		usage()
	}
}

func run(args []string) {
	if len(args) == 0 {
		fmt.Fprintln(os.Stderr, "run: need a command to execute")
		os.Exit(1)
	}
	fmt.Printf("[step4] parent pid=%d — new UTS + PID + mount namespaces\n", os.Getpid())

	cmd := exec.Command("/proc/self/exe", append([]string{"child"}, args...)...)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.SysProcAttr = &syscall.SysProcAttr{
		// UTS: private hostname. PID: private process tree. NS: private mounts.
		Cloneflags: syscall.CLONE_NEWUTS |
			syscall.CLONE_NEWPID |
			syscall.CLONE_NEWNS,
	}

	if err := cmd.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "[step4] child exited with error: %v\n", err)
		os.Exit(1)
	}
}

func child(args []string) {
	fmt.Printf("[step4] child pid=%d (PID 1 in its namespace)\n", os.Getpid())

	must(syscall.Sethostname([]byte("container")))

	// Step 1: stop our mounts from propagating back to the host. New mount
	// namespaces inherit "shared" propagation by default on modern distros; we
	// flip our whole tree to "private" so mount/umount events stay local.
	must(syscall.Mount("", "/", "", syscall.MS_PRIVATE|syscall.MS_REC, ""))

	// Step 2: mount a fresh procfs over /proc. Because we're in a new PID
	// namespace, this /proc shows only our processes. The flags mirror what
	// Docker uses to keep /proc from being an attack surface.
	const procFlags = syscall.MS_NOEXEC | syscall.MS_NOSUID | syscall.MS_NODEV
	must(syscall.Mount("proc", "/proc", "proc", procFlags, ""))

	// Hand off to the user's command; it becomes PID 1's program image.
	must(syscall.Exec(args[0], args, os.Environ()))
}

func must(err error) {
	if err != nil {
		fmt.Fprintf(os.Stderr, "[step4] error: %v\n", err)
		os.Exit(1)
	}
}

func usage() {
	fmt.Fprintf(os.Stderr, "usage: %s run <command> [args...]\n", os.Args[0])
	os.Exit(1)
}
