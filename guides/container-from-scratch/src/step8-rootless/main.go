//go:build linux

// Step 8 — Rootless: a container with no sudo, via the user namespace.
//
// Everything up to now needed `sudo`, because creating namespaces needs
// CAP_SYS_ADMIN. The user namespace (CLONE_NEWUSER) changes that: an
// *unprivileged* user may create one, and inside it they are UID 0 with a full
// capability set — enough to create all the OTHER namespaces. So an ordinary user
// can build a container without ever being real root. This is how rootless Docker
// and Podman work.
//
// The trick is the UID/GID map: we tell the kernel "container UID 0 == my real
// host UID". Inside, `id` says uid=0(root); outside, every action is really done
// as your unprivileged self. A breakout lands as *you*, not as host root.
//
//	go build -o ../bin/step8-rootless .
//	# NOTE: no sudo!
//	./step8-rootless run /bin/sh -c 'id; echo ---; cat /proc/self/uid_map'
//	# inside:
//	#   uid=0(root) gid=0(root)
//	#   ---
//	#            0       1000          1     <- container 0 maps to your host UID
//
// Requires unprivileged user namespaces to be enabled (they are by default on
// most modern kernels; check `cat /proc/sys/user/max_user_namespaces` > 0, and on
// Debian/Ubuntu `sysctl kernel.unprivileged_userns_clone`).
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
	fmt.Printf("[step8] parent uid=%d gid=%d — creating a USER namespace (no root needed)\n",
		os.Getuid(), os.Getgid())

	cmd := exec.Command("/proc/self/exe", append([]string{"child"}, args...)...)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.SysProcAttr = &syscall.SysProcAttr{
		// CLONE_NEWUSER must be here; because we own the new user namespace, the
		// kernel lets us create the rest without being real root.
		Cloneflags: syscall.CLONE_NEWUSER |
			syscall.CLONE_NEWUTS |
			syscall.CLONE_NEWPID |
			syscall.CLONE_NEWNS |
			syscall.CLONE_NEWIPC,

		// Map container UID 0 -> our real host UID (a range of size 1). Go writes
		// this to /proc/<child>/uid_map for us, at exactly the right moment.
		UidMappings: []syscall.SysProcIDMap{
			{ContainerID: 0, HostID: os.Getuid(), Size: 1},
		},
		GidMappings: []syscall.SysProcIDMap{
			{ContainerID: 0, HostID: os.Getgid(), Size: 1},
		},
		// Leaving this false makes Go write "deny" to /proc/<child>/setgroups
		// before the gid_map — mandatory for an unprivileged user namespace.
		GidMappingsEnableSetgroups: false,
	}

	if err := cmd.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "[step8] child exited with error: %v\n", err)
		os.Exit(1)
	}
}

func child(args []string) {
	fmt.Printf("[step8] child: inside the user namespace I am uid=%d (container root)\n", os.Getuid())

	// Inside the user namespace we hold CAP_SYS_ADMIN, so these succeed even
	// though we started as an unprivileged user. They're best-effort: some
	// heavily locked-down kernels restrict mounts even here.
	if err := syscall.Sethostname([]byte("rootless")); err != nil {
		fmt.Fprintf(os.Stderr, "[step8] warning: sethostname: %v\n", err)
	}
	if err := syscall.Mount("", "/", "", syscall.MS_PRIVATE|syscall.MS_REC, ""); err != nil {
		fmt.Fprintf(os.Stderr, "[step8] warning: make-private: %v\n", err)
	}
	const procFlags = syscall.MS_NOEXEC | syscall.MS_NOSUID | syscall.MS_NODEV
	if err := syscall.Mount("proc", "/proc", "proc", procFlags, ""); err != nil {
		fmt.Fprintf(os.Stderr, "[step8] warning: mount /proc: %v\n", err)
	}

	if err := syscall.Exec(args[0], args, os.Environ()); err != nil {
		fmt.Fprintf(os.Stderr, "[step8] exec: %v\n", err)
		os.Exit(1)
	}
}

func usage() {
	fmt.Fprintf(os.Stderr, "usage: %s run <command> [args...]   (no sudo required)\n", os.Args[0])
	os.Exit(1)
}
