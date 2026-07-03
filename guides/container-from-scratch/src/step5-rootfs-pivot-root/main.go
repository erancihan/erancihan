//go:build linux

// Step 5 — Its own root filesystem (the "image") via pivot_root.
//
// So far the container shares the host's files. A real container runs from its
// own root filesystem — that's what a Docker *image* unpacks to. We give the
// child a new root with pivot_root(2), which swaps the process's "/" for a
// directory of our choosing and stashes the old root so we can unmount it.
//
// pivot_root is preferred over chroot(2) because chroot only changes "/" for
// path lookups and is famously escapable; pivot_root actually detaches the old
// root mount, leaving the container with no handle to the host filesystem.
//
// You need a root filesystem to point at. The easiest is Alpine's mini rootfs:
//
//	ROOTFS=/tmp/alpine
//	mkdir -p "$ROOTFS"
//	curl -sSL https://dl-cdn.alpinelinux.org/alpine/v3.20/releases/x86_64/alpine-minirootfs-3.20.3-x86_64.tar.gz \
//	  | sudo tar -xz -C "$ROOTFS"
//
//	go build -o ../bin/step5-rootfs-pivot-root .
//	sudo ROOTFS=/tmp/alpine ./step5-rootfs-pivot-root run /bin/sh
//	# inside:
//	#   ls /        -> Alpine's filesystem, not the host's
//	#   cat /etc/os-release -> Alpine Linux
//	#   ps aux      -> only the container's processes
package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
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
	if os.Getenv("ROOTFS") == "" {
		fmt.Fprintln(os.Stderr, "run: set ROOTFS to a prepared root filesystem (see file header)")
		os.Exit(1)
	}
	fmt.Printf("[step5] parent pid=%d — UTS + PID + mount ns, rootfs=%s\n", os.Getpid(), os.Getenv("ROOTFS"))

	cmd := exec.Command("/proc/self/exe", append([]string{"child"}, args...)...)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	// Pass ROOTFS through to the re-exec'd child via the environment.
	cmd.Env = os.Environ()
	cmd.SysProcAttr = &syscall.SysProcAttr{
		Cloneflags: syscall.CLONE_NEWUTS |
			syscall.CLONE_NEWPID |
			syscall.CLONE_NEWNS,
	}

	if err := cmd.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "[step5] child exited with error: %v\n", err)
		os.Exit(1)
	}
}

func child(args []string) {
	rootfs := os.Getenv("ROOTFS")
	fmt.Printf("[step5] child pid=%d — pivoting into %s\n", os.Getpid(), rootfs)

	must(syscall.Sethostname([]byte("container")))

	// Keep all our mount changes private to this namespace.
	must(syscall.Mount("", "/", "", syscall.MS_PRIVATE|syscall.MS_REC, ""))

	// pivot_root requires new_root to be a mount point, so bind-mount the rootfs
	// directory onto itself.
	must(syscall.Mount(rootfs, rootfs, "", syscall.MS_BIND|syscall.MS_REC, ""))

	// put_old must live inside new_root. We'll unmount and remove it afterwards.
	oldRoot := filepath.Join(rootfs, ".oldroot")
	must(os.MkdirAll(oldRoot, 0700))

	// Swap "/" for rootfs; the previous root is now reachable at /.oldroot.
	must(syscall.PivotRoot(rootfs, oldRoot))
	must(syscall.Chdir("/"))

	// Fresh procfs for the new root + PID namespace.
	const procFlags = syscall.MS_NOEXEC | syscall.MS_NOSUID | syscall.MS_NODEV
	must(syscall.Mount("proc", "/proc", "proc", procFlags, ""))

	// Detach the old root so the container has no path back to the host's files,
	// then remove the now-empty mount point.
	must(syscall.Unmount("/.oldroot", syscall.MNT_DETACH))
	must(os.Remove("/.oldroot"))

	must(syscall.Exec(args[0], args, os.Environ()))
}

func must(err error) {
	if err != nil {
		fmt.Fprintf(os.Stderr, "[step5] error: %v\n", err)
		os.Exit(1)
	}
}

func usage() {
	fmt.Fprintf(os.Stderr, "usage: ROOTFS=<dir> %s run <command> [args...]\n", os.Args[0])
	os.Exit(1)
}
