//go:build linux

// Step 10 — Hardening: no_new_privs + dropping every capability.
//
// Namespaces and cgroups isolate a container, but by default its PID 1 still runs
// as full root with all ~40 Linux capabilities — one kernel bug from owning the
// host. Real runtimes shed privilege right before exec. This step shows the
// least-privilege finish, using only the Go standard library (no libcap/libseccomp):
//
//  1. do the privileged setup while we still can (hostname, mount /proc),
//  2. prctl(PR_SET_NO_NEW_PRIVS) so a setuid binary can never regain privilege,
//  3. prctl(PR_CAPBSET_DROP) across every capability — empty the bounding set,
//  4. capset() to zero the effective/permitted/inheritable sets,
//  5. exec — the program starts life as capability-less root.
//
// A full seccomp syscall filter is the natural next layer; it needs a BPF program
// (typically via libseccomp or golang.org/x/sys/unix's Seccomp helpers) and is
// described in docs/08-security-and-hardening.md.
//
//	go build -o ../bin/step10-hardening .
//	sudo ./step10-hardening run /bin/sh -c 'grep -E "^Cap|^NoNewPrivs" /proc/self/status'
//	# inside you'll see:
//	#   CapInh: 0000000000000000
//	#   CapPrm: 0000000000000000
//	#   CapEff: 0000000000000000   <- no capabilities at all
//	#   CapBnd: 0000000000000000   <- and none can ever be regained
//	#   NoNewPrivs: 1
package main

import (
	"fmt"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"syscall"
	"unsafe"
)

// prctl option numbers (stable kernel ABI; not exported by the syscall package).
const (
	prSetNoNewPrivs = 38
	prCapbsetDrop   = 24
)

// _LINUX_CAPABILITY_VERSION_3 — the 64-bit capability ABI.
const capVersion3 = 0x20080522

type capHeader struct {
	version uint32
	pid     int32
}

// Two 32-bit words cover capabilities 0..63.
type capData struct {
	effective   uint32
	permitted   uint32
	inheritable uint32
}

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
	fmt.Printf("[step10] parent pid=%d — namespaced + privilege-dropped container\n", os.Getpid())

	cmd := exec.Command("/proc/self/exe", append([]string{"child"}, args...)...)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.SysProcAttr = &syscall.SysProcAttr{
		Cloneflags: syscall.CLONE_NEWUTS |
			syscall.CLONE_NEWPID |
			syscall.CLONE_NEWNS |
			syscall.CLONE_NEWIPC,
	}
	if err := cmd.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "[step10] child exited with error: %v\n", err)
	}
}

func child(args []string) {
	// --- privileged setup FIRST, while we still hold capabilities ---
	must(syscall.Sethostname([]byte("hardened")))
	must(syscall.Mount("", "/", "", syscall.MS_PRIVATE|syscall.MS_REC, ""))
	const procFlags = syscall.MS_NOEXEC | syscall.MS_NOSUID | syscall.MS_NODEV
	must(syscall.Mount("proc", "/proc", "proc", procFlags, ""))

	// --- now drop everything, in the order that matters ---

	// no_new_privs: after this, execve can never grant new privileges (e.g. via a
	// setuid-root binary). Once set it cannot be unset. seccomp requires it too.
	if err := prctl(prSetNoNewPrivs, 1); err != nil {
		fmt.Fprintf(os.Stderr, "[step10] warning: set no_new_privs: %v\n", err)
	}

	// Empty the capability bounding set so no capability can ever be added back to
	// this process or its children — even across an execve of a file with file caps.
	last := capLastCap()
	for i := 0; i <= last; i++ {
		if err := prctl(prCapbsetDrop, uintptr(i)); err != nil {
			fmt.Fprintf(os.Stderr, "[step10] warning: drop bounding cap %d: %v\n", i, err)
			break
		}
	}

	// Zero the effective/permitted/inheritable sets: give up the powers we hold
	// right now. Reducing your own capabilities is always permitted.
	if err := dropAllCaps(); err != nil {
		fmt.Fprintf(os.Stderr, "[step10] warning: capset drop: %v\n", err)
	}

	fmt.Printf("[step10] child pid=%d — dropped to capability-less root, exec %v\n", os.Getpid(), args)
	must(syscall.Exec(args[0], args, os.Environ()))
}

// prctl wraps the two-argument prctl calls we need.
func prctl(option int, arg2 uintptr) error {
	_, _, errno := syscall.Syscall(syscall.SYS_PRCTL, uintptr(option), arg2, 0)
	if errno != 0 {
		return errno
	}
	return nil
}

// dropAllCaps zeroes every capability set for this process via capset(2).
func dropAllCaps() error {
	hdr := capHeader{version: capVersion3, pid: 0} // pid 0 = self
	var data [2]capData                            // all-zero = no capabilities
	_, _, errno := syscall.Syscall(syscall.SYS_CAPSET,
		uintptr(unsafe.Pointer(&hdr)), uintptr(unsafe.Pointer(&data[0])), 0)
	if errno != 0 {
		return errno
	}
	return nil
}

// capLastCap reads the kernel's highest valid capability number.
func capLastCap() int {
	b, err := os.ReadFile("/proc/sys/kernel/cap_last_cap")
	if err != nil {
		return 40 // CAP_CHECKPOINT_RESTORE on Linux 5.9+; a safe modern default
	}
	n, err := strconv.Atoi(strings.TrimSpace(string(b)))
	if err != nil {
		return 40
	}
	return n
}

func must(err error) {
	if err != nil {
		fmt.Fprintf(os.Stderr, "[step10] error: %v\n", err)
		os.Exit(1)
	}
}

func usage() {
	fmt.Fprintf(os.Stderr, "usage: %s run <command> [args...]\n", os.Args[0])
	os.Exit(1)
}
