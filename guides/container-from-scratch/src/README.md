# `src/` — the working code

Seven small Go programs, each a self-contained `package main`, that build a
container runtime one primitive at a time. Read them alongside the guide (start at
[`../docs/05-building-a-container-in-go.md`](../docs/05-building-a-container-in-go.md)).

> ⚠️ **Linux + root only.** These programs call `clone`, `pivot_root`, `mount`, and
> friends. They **do not compile or run on macOS or Windows** (that's one of the
> guide's lessons). Creating namespaces and cgroups needs `sudo`, except where noted.
> Run them in a throwaway VM/container, not your daily machine.

## Build

```console
$ make            # builds every step into ./bin
$ make vet        # go vet ./...
$ make clean
```

Or build one step directly:

```console
$ go build -o bin/step3-reexec ./step3-reexec
```

## The steps

**Core path (1–7)** — build up to the capstone, one primitive per step:

| Binary | Adds | Needs root? | Needs a rootfs? |
| --- | --- | :---: | :---: |
| `step1-exec` | just runs a process (no isolation) | no | no |
| `step2-uts-namespace` | `CLONE_NEWUTS` (private hostname) | yes | no |
| `step3-reexec` | the `/proc/self/exe` re-exec trick + `sethostname` | yes | no |
| `step4-pid-and-proc` | `CLONE_NEWPID` + `CLONE_NEWNS` + mounts its own `/proc` | yes | no |
| `step5-rootfs-pivot-root` | `pivot_root` into an image | yes | **yes** |
| `step6-cgroups` | cgroup v2 memory + PID limits | yes | no |
| `mini-docker` (step7) | all of the above combined | yes | **yes** |

**Going further (8–10)** — the "what to build next" features from
[chapter 13](../docs/13-comparison-and-further-reading.md), as runnable code:

| Binary | Adds | Needs root? | Needs a rootfs? |
| --- | --- | :---: | :---: |
| `step8-rootless` | `CLONE_NEWUSER` + UID/GID maps — a container with **no sudo** | **no** | no |
| `step9-overlayfs` | image layers + copy-on-write via OverlayFS | yes | **yes** (as the base layer) |
| `step10-hardening` | `no_new_privs` + drop every capability (`prctl`/`capset`) | yes | no |

Each `main.go` starts with a comment block explaining exactly what it demonstrates
and how to try it. Networking (veth/bridge/NAT) and an OCI image puller are left as
exercises — their design is covered in [chapter 07](../docs/07-networking.md) and
[chapter 09](../docs/09-how-docker-really-works.md).

## Getting a root filesystem (steps 5 and 7)

The pivot-root steps need a directory containing a Linux userland. Alpine's mini
rootfs is ~3 MB:

```console
$ make rootfs     # downloads Alpine to /tmp/alpine
# ...or manually:
$ mkdir -p /tmp/alpine
$ curl -sSL https://dl-cdn.alpinelinux.org/alpine/v3.20/releases/x86_64/alpine-minirootfs-3.20.3-x86_64.tar.gz \
    | sudo tar -xz -C /tmp/alpine
```

Then:

```console
$ sudo ROOTFS=/tmp/alpine ./bin/mini-docker run /bin/sh
```

You can also point `ROOTFS` at any unpacked container image — e.g.
`docker export $(docker create alpine) | tar -x -C /tmp/alpine`.

## Quick tour

```console
$ make
$ sudo ./bin/step2-uts-namespace run /bin/sh      # feel one namespace
$ sudo ./bin/step4-pid-and-proc run /bin/sh       # own PID 1 + /proc
$ make rootfs
$ sudo ROOTFS=/tmp/alpine ./bin/step5-rootfs-pivot-root run /bin/sh
$ sudo ./bin/step6-cgroups run /bin/sh            # try a fork bomb; it's capped
$ sudo ROOTFS=/tmp/alpine ./bin/mini-docker run /bin/sh   # the whole thing

# going further:
$ ./bin/step8-rootless run /bin/sh                # NO sudo — user namespace; `id` says root
$ sudo ROOTFS=/tmp/alpine ./bin/step9-overlayfs run /bin/sh -c 'echo hi > /x; ls /'
$ sudo ./bin/step10-hardening run /bin/sh -c 'grep -E "^Cap|^NoNewPrivs" /proc/self/status'
```

> **step8 (rootless)** needs unprivileged user namespaces enabled — the default on
> most modern kernels. Check `cat /proc/sys/user/max_user_namespaces` is non-zero
> (and on Debian/Ubuntu, `sysctl kernel.unprivileged_userns_clone`).

## Environment knobs (step 7)

| Variable | Default | Meaning |
| --- | --- | --- |
| `ROOTFS` | *(required)* | directory to `pivot_root` into |
| `MINI_HOSTNAME` | `container` | hostname set inside the UTS namespace |
| `MEM_MAX` | `104857600` (100 MB) | `memory.max` for the cgroup |
| `PIDS_MAX` | `64` | `pids.max` for the cgroup |
