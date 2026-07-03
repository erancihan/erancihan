//go:build linux

// Step 7 — mini-docker: the capstone.
//
// Everything from steps 1–6 in one small runtime:
//
//	namespaces   UTS + PID + mount + IPC + network  (what it can SEE)
//	rootfs       pivot_root into an image directory  (what it RUNS from)
//	/proc /dev   a working, isolated device + proc set
//	cgroups v2   memory + pids caps                  (what it can USE)
//	hostname     its own identity
//
// This is, in miniature, what `runc` does when Docker/containerd tell it to start
// a container. What's intentionally left out — and where to add it — is called out
// in comments: networking wiring (docs/07), capability drop + seccomp (docs/08),
// and overlayfs layering (docs/06).
//
// Prepare a rootfs (see step5's header for the Alpine one-liner), then:
//
//	go build -o ../bin/mini-docker .
//	sudo ROOTFS=/tmp/alpine ./mini-docker run /bin/sh
//	# inside:
//	#   hostname            -> container
//	#   echo $$             -> 1
//	#   cat /etc/os-release -> Alpine
//	#   ps aux              -> just your shell
//	#   ip addr             -> only a (down) loopback; see docs/07 to wire networking
//
// Environment knobs: ROOTFS (required), MINI_HOSTNAME, MEM_MAX (bytes), PIDS_MAX.
package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"syscall"
)

const cgroupBase = "/sys/fs/cgroup"

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
		fmt.Fprintln(os.Stderr, "run: set ROOTFS to a prepared root filesystem (see step5 header)")
		os.Exit(1)
	}
	fmt.Printf("[mini-docker] parent pid=%d — starting container\n", os.Getpid())

	cgPath := filepath.Join(cgroupBase, "mini-docker")
	cleanup := setupCgroup(cgPath)
	defer cleanup()

	cmd := exec.Command("/proc/self/exe", append([]string{"child"}, args...)...)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Env = os.Environ()
	cmd.SysProcAttr = &syscall.SysProcAttr{
		Cloneflags: syscall.CLONE_NEWUTS | // hostname
			syscall.CLONE_NEWPID | // process tree
			syscall.CLONE_NEWNS | // mounts
			syscall.CLONE_NEWIPC | // System V IPC / POSIX message queues
			syscall.CLONE_NEWNET, // network stack (starts empty; see docs/07)
		// To go rootless, add CLONE_NEWUSER plus UidMappings/GidMappings here
		// (see docs/08). That's how Docker/Podman run without real root.
	}

	if err := cmd.Start(); err != nil {
		fmt.Fprintf(os.Stderr, "[mini-docker] start failed: %v\n", err)
		os.Exit(1)
	}

	procs := filepath.Join(cgPath, "cgroup.procs")
	if err := os.WriteFile(procs, []byte(strconv.Itoa(cmd.Process.Pid)), 0644); err != nil {
		fmt.Fprintf(os.Stderr, "[mini-docker] warning: cgroup add failed: %v\n", err)
	}

	if err := cmd.Wait(); err != nil {
		fmt.Fprintf(os.Stderr, "[mini-docker] container exited: %v\n", err)
	}
}

func child(args []string) {
	rootfs := os.Getenv("ROOTFS")
	hostname := envOr("MINI_HOSTNAME", "container")
	fmt.Printf("[mini-docker] child pid=%d — configuring container\n", os.Getpid())

	must(syscall.Sethostname([]byte(hostname)))

	// All mount changes stay inside this namespace.
	must(syscall.Mount("", "/", "", syscall.MS_PRIVATE|syscall.MS_REC, ""))

	// --- pivot into the image's root filesystem ---
	must(syscall.Mount(rootfs, rootfs, "", syscall.MS_BIND|syscall.MS_REC, ""))
	oldRoot := filepath.Join(rootfs, ".oldroot")
	must(os.MkdirAll(oldRoot, 0700))
	must(syscall.PivotRoot(rootfs, oldRoot))
	must(syscall.Chdir("/"))

	// --- pseudo-filesystems ---
	const noExec = syscall.MS_NOEXEC | syscall.MS_NOSUID | syscall.MS_NODEV
	must(syscall.Mount("proc", "/proc", "proc", noExec, ""))
	// A tmpfs /dev with just the standard character devices, so tools that open
	// /dev/null, /dev/urandom, etc. work without exposing the host's devices.
	must(syscall.Mount("tmpfs", "/dev", "tmpfs", syscall.MS_NOSUID, "mode=0755"))
	setupDevices()

	// Detach the old root: no path back to the host filesystem.
	must(syscall.Unmount("/.oldroot", syscall.MNT_DETACH))
	_ = os.Remove("/.oldroot")

	// This is the point where a hardened runtime would drop capabilities, set
	// no_new_privs, and install a seccomp filter (docs/08) — right before exec.

	must(syscall.Exec(args[0], args, os.Environ()))
}

// setupDevices creates the minimal set of character devices Alpine/BusyBox expect.
// major/minor numbers are the Linux standard ones. Best-effort: warns on failure.
func setupDevices() {
	type dev struct {
		path         string
		major, minor uint32
	}
	nodes := []dev{
		{"/dev/null", 1, 3},
		{"/dev/zero", 1, 5},
		{"/dev/full", 1, 7},
		{"/dev/random", 1, 8},
		{"/dev/urandom", 1, 9},
		{"/dev/tty", 5, 0},
	}
	for _, n := range nodes {
		// dev_t = (major << 8) | minor for these small standard numbers.
		devNo := int(n.major<<8 | n.minor)
		if err := syscall.Mknod(n.path, syscall.S_IFCHR|0666, devNo); err != nil {
			fmt.Fprintf(os.Stderr, "[mini-docker] warning: mknod %s: %v\n", n.path, err)
		}
	}
}

func setupCgroup(cgPath string) func() {
	tryWrite(filepath.Join(cgroupBase, "cgroup.subtree_control"), "+memory +pids")
	if err := os.Mkdir(cgPath, 0755); err != nil && !os.IsExist(err) {
		fmt.Fprintf(os.Stderr, "[mini-docker] warning: mkdir cgroup: %v\n", err)
	}
	tryWrite(filepath.Join(cgPath, "memory.max"), envOr("MEM_MAX", "104857600")) // 100 MB
	tryWrite(filepath.Join(cgPath, "pids.max"), envOr("PIDS_MAX", "64"))
	return func() {
		if err := os.Remove(cgPath); err != nil {
			fmt.Fprintf(os.Stderr, "[mini-docker] warning: remove cgroup: %v\n", err)
		}
	}
}

func tryWrite(path, value string) {
	if err := os.WriteFile(path, []byte(value), 0644); err != nil {
		fmt.Fprintf(os.Stderr, "[mini-docker] warning: write %s=%q: %v\n", path, value, err)
	}
}

func envOr(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func must(err error) {
	if err != nil {
		fmt.Fprintf(os.Stderr, "[mini-docker] fatal: %v\n", err)
		os.Exit(1)
	}
}

func usage() {
	fmt.Fprintf(os.Stderr, "usage: ROOTFS=<dir> %s run <command> [args...]\n", os.Args[0])
	os.Exit(1)
}
