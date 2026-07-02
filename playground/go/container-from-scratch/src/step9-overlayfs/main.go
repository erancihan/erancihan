//go:build linux

// Step 9 — Image layers with OverlayFS (copy-on-write).
//
// Real images aren't one big folder — they're a stack of read-only layers with a
// thin writable layer on top, unified by OverlayFS. Reads fall through the stack;
// writes copy the file up into the writable layer ("copy-up"). That's why 50
// containers from the same image share one on-disk copy, and why `docker run` is
// instant: only the tiny upper layer is per-container.
//
// This step builds a two-layer "image" over a base rootfs, mounts the union, and
// pivots into it — then, after the container exits, shows that everything the
// container wrote landed in the UPPER dir while the base stayed untouched.
//
//	overlay layout:
//	    lowerdir = app-layer : ROOTFS      (read-only, app-layer wins on conflicts)
//	    upperdir = upper                   (writable; all changes land here)
//	    workdir  = work                    (overlayfs scratch space)
//	    merged   = merged                  (the unified view the container sees)
//
// Prepare a base rootfs (see step5's header), then:
//
//	go build -o ../bin/step9-overlayfs .
//	sudo ROOTFS=/tmp/alpine ./step9-overlayfs run /bin/sh -c 'ls /; cat /layer-note.txt; echo hi > /scratch.txt'
//	# afterwards the tool prints the upper dir: it contains scratch.txt (copied up),
//	# proving the write never touched the read-only base image.
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
	base := os.Getenv("ROOTFS")
	if base == "" {
		fmt.Fprintln(os.Stderr, "run: set ROOTFS to a base root filesystem (see file header)")
		os.Exit(1)
	}

	// Build the overlay scaffolding under a work directory.
	work := envOr("OVERLAY_DIR", "/tmp/overlay-demo")
	appLayer := filepath.Join(work, "app-layer")
	upper := filepath.Join(work, "upper")
	workdir := filepath.Join(work, "work")
	merged := filepath.Join(work, "merged")
	for _, d := range []string{appLayer, upper, workdir, merged} {
		must(os.MkdirAll(d, 0755))
	}
	// A synthetic "application layer" that adds one file on top of the base image.
	// In a real image this would be the diff a Dockerfile RUN/COPY step produced.
	must(os.WriteFile(filepath.Join(appLayer, "layer-note.txt"),
		[]byte("this file comes from a stacked read-only image layer\n"), 0644))

	// Mount the union. lowerdir is colon-separated, leftmost = highest priority.
	opts := fmt.Sprintf("lowerdir=%s:%s,upperdir=%s,workdir=%s", appLayer, base, upper, workdir)
	fmt.Printf("[step9] mounting overlay at %s\n         %s\n", merged, opts)
	must(syscall.Mount("overlay", merged, "overlay", 0, opts))
	defer func() {
		if err := syscall.Unmount(merged, 0); err != nil {
			fmt.Fprintf(os.Stderr, "[step9] warning: unmount overlay: %v\n", err)
		}
	}()

	// Hand the merged view to the child as its rootfs.
	cmd := exec.Command("/proc/self/exe", append([]string{"child"}, args...)...)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Env = append(os.Environ(), "MERGED="+merged)
	cmd.SysProcAttr = &syscall.SysProcAttr{
		Cloneflags: syscall.CLONE_NEWUTS | syscall.CLONE_NEWPID | syscall.CLONE_NEWNS,
	}
	if err := cmd.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "[step9] child exited with error: %v\n", err)
	}

	// Prove copy-on-write: whatever the container created/changed is now in upper,
	// while the base image is byte-for-byte unchanged.
	fmt.Printf("[step9] contents of the writable UPPER layer after the run (%s):\n", upper)
	entries, _ := os.ReadDir(upper)
	if len(entries) == 0 {
		fmt.Println("         (empty — the container wrote nothing)")
	}
	for _, e := range entries {
		fmt.Printf("         + %s\n", e.Name())
	}
}

func child(args []string) {
	merged := os.Getenv("MERGED")
	fmt.Printf("[step9] child: pivoting into the merged overlay view\n")

	must(syscall.Mount("", "/", "", syscall.MS_PRIVATE|syscall.MS_REC, ""))
	// pivot_root needs new_root to be a mount point.
	must(syscall.Mount(merged, merged, "", syscall.MS_BIND|syscall.MS_REC, ""))
	oldRoot := filepath.Join(merged, ".oldroot")
	must(os.MkdirAll(oldRoot, 0700))
	must(syscall.PivotRoot(merged, oldRoot))
	must(syscall.Chdir("/"))

	const procFlags = syscall.MS_NOEXEC | syscall.MS_NOSUID | syscall.MS_NODEV
	if err := syscall.Mount("proc", "/proc", "proc", procFlags, ""); err != nil {
		fmt.Fprintf(os.Stderr, "[step9] warning: mount /proc: %v\n", err)
	}
	must(syscall.Unmount("/.oldroot", syscall.MNT_DETACH))
	_ = os.Remove("/.oldroot")

	must(syscall.Exec(args[0], args, os.Environ()))
}

func envOr(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func must(err error) {
	if err != nil {
		fmt.Fprintf(os.Stderr, "[step9] error: %v\n", err)
		os.Exit(1)
	}
}

func usage() {
	fmt.Fprintf(os.Stderr, "usage: ROOTFS=<dir> %s run <command> [args...]\n", os.Args[0])
	os.Exit(1)
}
