"""Best-effort hardening applied *inside* a subprocess-isolated contestant.

Layered on top of the CPU/memory ``rlimit``s the ``SubprocessRunner`` already
sets, this removes two big capabilities a hostile algorithm would want:

- **No disk writes** — ``RLIMIT_FSIZE = 0`` so any attempt to write data fails
  (empty-file creation may still succeed; the *contents* can't be written).
- **No network** — ``unshare(CLONE_NEWNET)`` drops the process into a fresh,
  empty network namespace (only a down loopback), so it can't connect out.

Plus ``PR_SET_NO_NEW_PRIVS`` (block setuid escalation) and an open-fd cap. Each
mechanism is best-effort and guarded; ``apply_hardening`` returns a report of
what it could enforce.

Limits (be honest): this does NOT block arbitrary syscalls such as ``execve``
(that needs seccomp — ``libseccomp`` is present and is the natural next layer),
and it does not stop a contestant from *reading* files it already has access to
or from burning CPU within its limit. For truly adversarial code, OS-level
containment (containers / gVisor) is the right tool. Opt in via ``--harden``.
"""

from __future__ import annotations

import ctypes
import ctypes.util
import resource

_PR_SET_NO_NEW_PRIVS = 38
_CLONE_NEWNET = 0x40000000


def _libc() -> ctypes.CDLL:
    return ctypes.CDLL(ctypes.util.find_library("c") or "libc.so.6", use_errno=True)


def apply_hardening(no_write: bool = True, isolate_network: bool = True,
                    no_new_privs: bool = True, max_open_files: int = 256) -> dict:
    """Apply best-effort containment to the *current* process. Returns a report
    mapping each mechanism to whether it was enforced."""
    report: dict[str, bool] = {}
    libc = _libc()

    if no_new_privs:
        report["no_new_privs"] = libc.prctl(_PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0) == 0

    if no_write:
        try:
            resource.setrlimit(resource.RLIMIT_FSIZE, (0, 0))
            report["no_write"] = True
        except (ValueError, OSError):
            report["no_write"] = False

    if max_open_files:
        try:
            _, hard = resource.getrlimit(resource.RLIMIT_NOFILE)
            cap = max_open_files if hard <= 0 else min(max_open_files, hard)
            resource.setrlimit(resource.RLIMIT_NOFILE, (cap, hard))
            report["limited_fds"] = True
        except (ValueError, OSError):
            report["limited_fds"] = False

    if isolate_network:
        # rc == 0 -> we entered a fresh, empty network namespace (no network).
        report["network"] = libc.unshare(_CLONE_NEWNET) == 0

    return report
