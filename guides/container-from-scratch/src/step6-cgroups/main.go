//go:build linux

// Step 6 — Resource limits with cgroups (v2).
//
// Namespaces control what a process can SEE. cgroups control how much it can USE.
// Here the parent creates a cgroup, writes limits into it (max 100 MB of memory,
// max 20 processes), and moves the container into it. Now the container physically
// cannot exceed those limits — the kernel enforces them.
//
// This step layers cgroups on the Step 4 base (namespaces + /proc, no custom
// rootfs) so it runs without downloading an image. The capstone (Step 7) combines
// cgroups with a real root filesystem.
//
// cgroup v2 is a single unified hierarchy mounted at /sys/fs/cgroup. A cgroup is
// just a directory; you configure it by writing to files inside it:
//
//	memory.max      -> hard memory cap (bytes, or "max")
//	pids.max        -> maximum number of processes/threads
//	cgroup.procs    -> write a PID here to move it into this cgroup
//	cpu.max         -> "<quota> <period>" microseconds, e.g. "50000 100000" = 50% CPU
//
//	go build -o ../bin/step6-cgroups .
//	sudo ./step6-cgroups run /bin/sh
//	# inside, watch the limits bite:
//	#   :(){ :|:& };:                 # fork bomb -> stopped by pids.max=20
//	#   cat /dev/zero | head -c 200m | tail   # ~200 MB -> OOM-killed by memory.max
//
// NOTE: on hosts running cgroup v1 (or hybrid), or where controllers aren't
// delegated to your user, writing the limit files may fail. This program warns
// and continues so the namespace demo still works; see docs/04-cgroups.md for the
// v1 layout and how to check which mode you're on (`stat -fc %T /sys/fs/cgroup`).
package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"syscall"
)

const cgroupBase = "/sys/fs/cgroup" // cgroup v2 unified mount point

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
	fmt.Printf("[step6] parent pid=%d — namespaces + cgroup limits\n", os.Getpid())

	// Create the cgroup and set limits BEFORE the child does any real work.
	cgPath := filepath.Join(cgroupBase, "mini-docker")
	cleanup := setupCgroup(cgPath)
	defer cleanup()

	cmd := exec.Command("/proc/self/exe", append([]string{"child"}, args...)...)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.SysProcAttr = &syscall.SysProcAttr{
		Cloneflags: syscall.CLONE_NEWUTS |
			syscall.CLONE_NEWPID |
			syscall.CLONE_NEWNS,
	}

	// Start (not Run) so we get the child's PID and can place it in the cgroup
	// before waiting for it to finish.
	if err := cmd.Start(); err != nil {
		fmt.Fprintf(os.Stderr, "[step6] failed to start child: %v\n", err)
		os.Exit(1)
	}

	// Move the child into the cgroup. Every process it forks inherits the cgroup,
	// so the whole container tree is capped.
	//
	// (Production runtimes avoid the tiny window between start and this write by
	// using clone3(CLONE_INTO_CGROUP); for learning, this is clear and correct
	// enough — the child is still starting up when we add it.)
	procs := filepath.Join(cgPath, "cgroup.procs")
	if err := os.WriteFile(procs, []byte(strconv.Itoa(cmd.Process.Pid)), 0644); err != nil {
		fmt.Fprintf(os.Stderr, "[step6] warning: could not add child to cgroup: %v\n", err)
	}

	if err := cmd.Wait(); err != nil {
		fmt.Fprintf(os.Stderr, "[step6] child exited with error: %v\n", err)
	}
}

// setupCgroup creates a v2 cgroup and writes resource limits. It is best-effort:
// on hosts where a control file can't be written it warns and keeps going.
func setupCgroup(cgPath string) func() {
	// Ask the parent cgroup to expose the controllers we need to children.
	// Harmless if already enabled; warns (not fatal) if not permitted here.
	tryWrite(filepath.Join(cgroupBase, "cgroup.subtree_control"), "+memory +pids +cpu")

	if err := os.Mkdir(cgPath, 0755); err != nil && !os.IsExist(err) {
		fmt.Fprintf(os.Stderr, "[step6] warning: mkdir cgroup: %v\n", err)
	}

	tryWrite(filepath.Join(cgPath, "memory.max"), "104857600") // 100 MB
	tryWrite(filepath.Join(cgPath, "pids.max"), "20")
	// Uncomment to also cap CPU to 20% of one core:
	// tryWrite(filepath.Join(cgPath, "cpu.max"), "20000 100000")

	return func() {
		// A cgroup can only be removed once empty; by cleanup time the container
		// has exited, so its processes are gone.
		if err := os.Remove(cgPath); err != nil {
			fmt.Fprintf(os.Stderr, "[step6] warning: could not remove cgroup: %v\n", err)
		}
	}
}

func tryWrite(path, value string) {
	if err := os.WriteFile(path, []byte(value), 0644); err != nil {
		fmt.Fprintf(os.Stderr, "[step6] warning: write %s=%q: %v\n", path, value, err)
	}
}

func child(args []string) {
	fmt.Printf("[step6] child pid=%d (PID 1), limited by cgroup\n", os.Getpid())

	must(syscall.Sethostname([]byte("container")))
	must(syscall.Mount("", "/", "", syscall.MS_PRIVATE|syscall.MS_REC, ""))

	const procFlags = syscall.MS_NOEXEC | syscall.MS_NOSUID | syscall.MS_NODEV
	must(syscall.Mount("proc", "/proc", "proc", procFlags, ""))

	must(syscall.Exec(args[0], args, os.Environ()))
}

func must(err error) {
	if err != nil {
		fmt.Fprintf(os.Stderr, "[step6] error: %v\n", err)
		os.Exit(1)
	}
}

func usage() {
	fmt.Fprintf(os.Stderr, "usage: %s run <command> [args...]\n", os.Args[0])
	os.Exit(1)
}
