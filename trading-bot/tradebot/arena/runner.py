"""Runners execute one contestant and capture the outcome.

Two implementations behind one ``Runner`` protocol:

- ``SubprocessRunner`` (default on POSIX) — runs each contestant in its own
  forked process with a **hard** wall-clock timeout (the process is killed on
  expiry) plus optional CPU/memory ``rlimit``s. Real isolation: a runaway or
  hostile algorithm cannot stall the tournament or exhaust the host.
- ``InProcessRunner`` — runs on a daemon thread with a **soft** ``join(timeout)``.
  Portable and fast, but Python threads can't be force-killed, so a runaway
  algo's thread keeps consuming CPU in the background (it's a daemon, so it never
  blocks process exit). Use where fork isn't available, or for trusted code.

``default_runner`` picks the subprocess runner when fork is available and falls
back to the thread runner otherwise.
"""

from __future__ import annotations

import math
import multiprocessing as mp
import queue as queue_mod
import threading
import time
from typing import Protocol

import pandas as pd

from ..risk import RiskManager
from .adapters import policy_for
from .contestant import Contestant
from .result import ERROR, OK, TIMEOUT, ContestantResult
from .scoring import Scorer
from .simulation import SimConfig, simulate


class Runner(Protocol):
    def run(
        self,
        contestant: Contestant,
        frames: dict[str, pd.DataFrame],
        risk: RiskManager,
        config: SimConfig,
        scorer: Scorer,
    ) -> ContestantResult: ...


# --------------------------------------------------------------------------- #
# In-process (thread) runner — soft timeout, portable.
# --------------------------------------------------------------------------- #
class InProcessRunner:
    def __init__(self, time_budget_s: float = 10.0) -> None:
        self.time_budget_s = time_budget_s

    def run(self, contestant, frames, risk, config, scorer) -> ContestantResult:
        start = time.perf_counter()
        box: dict[str, object] = {}

        def work() -> None:
            try:
                box["result"] = simulate(policy_for(contestant), frames, risk, config)
            except Exception as exc:  # noqa: BLE001 - reported via box, isolated
                box["error"] = exc

        thread = threading.Thread(target=work, name=f"arena-{contestant.name}", daemon=True)
        thread.start()
        thread.join(self.time_budget_s)
        duration = time.perf_counter() - start

        if thread.is_alive():
            return ContestantResult(contestant, status=TIMEOUT,
                                    error=f"exceeded {self.time_budget_s:g}s (soft)",
                                    duration_s=duration)
        if "error" in box:
            exc = box["error"]
            return ContestantResult(contestant, status=ERROR,
                                    error=f"{type(exc).__name__}: {exc}", duration_s=duration)
        result = box["result"]
        return ContestantResult(contestant, status=OK, score=float(scorer(result)),
                                result=result, duration_s=duration)


# --------------------------------------------------------------------------- #
# Subprocess runner — hard timeout + resource limits (POSIX/fork).
# --------------------------------------------------------------------------- #
def fork_available() -> bool:
    return "fork" in mp.get_all_start_methods()


def _apply_limits(cpu_seconds: int | None, memory_mb: int | None) -> None:
    try:
        import resource
    except ImportError:  # non-POSIX
        return
    try:
        if cpu_seconds:
            resource.setrlimit(resource.RLIMIT_CPU, (int(cpu_seconds), int(cpu_seconds)))
        if memory_mb:
            nbytes = int(memory_mb) * 1024 * 1024
            resource.setrlimit(resource.RLIMIT_AS, (nbytes, nbytes))
    except (ValueError, OSError):
        pass


def _subprocess_work(contestant, frames, risk_config, config, result_queue,
                     cpu_seconds, memory_mb) -> None:
    """Child entrypoint: apply limits, simulate, ship the result back."""
    _apply_limits(cpu_seconds, memory_mb)
    try:
        result = simulate(policy_for(contestant), frames, RiskManager(risk_config), config)
        result_queue.put(("ok", result))
    except BaseException as exc:  # noqa: BLE001 - incl. MemoryError; isolate
        result_queue.put(("error", f"{type(exc).__name__}: {exc}"))


class SubprocessRunner:
    def __init__(self, time_budget_s: float = 10.0,
                 cpu_seconds: int | None = None, memory_mb: int | None = None) -> None:
        if not fork_available():
            raise RuntimeError("SubprocessRunner requires the 'fork' start method (POSIX).")
        self.time_budget_s = time_budget_s
        # Default a CPU cap derived from the wall budget so a busy-loop is also
        # stopped by SIGXCPU even before the wall-clock kill.
        self.cpu_seconds = cpu_seconds if cpu_seconds is not None else int(math.ceil(time_budget_s)) + 1
        self.memory_mb = memory_mb
        self._ctx = mp.get_context("fork")

    def run(self, contestant, frames, risk, config, scorer) -> ContestantResult:
        start = time.perf_counter()
        result_queue = self._ctx.Queue()
        proc = self._ctx.Process(
            target=_subprocess_work,
            args=(contestant, frames, risk.config, config, result_queue,
                  self.cpu_seconds, self.memory_mb),
            name=f"arena-{contestant.name}", daemon=True,
        )
        proc.start()

        # Consume the result with the budget; consuming avoids the classic
        # "process won't exit until its queue is drained" deadlock.
        try:
            message = result_queue.get(timeout=self.time_budget_s)
        except queue_mod.Empty:
            message = None
        duration = time.perf_counter() - start

        if message is None:
            self._kill(proc)
            reason = self._death_reason(proc.exitcode)
            return ContestantResult(contestant, status=TIMEOUT,
                                    error=f"exceeded {self.time_budget_s:g}s{reason}",
                                    duration_s=duration)

        proc.join(1.0)
        if proc.is_alive():
            self._kill(proc)

        status, payload = message
        if status == "ok":
            return ContestantResult(contestant, status=OK, score=float(scorer(payload)),
                                    result=payload, duration_s=duration)
        return ContestantResult(contestant, status=ERROR, error=str(payload), duration_s=duration)

    @staticmethod
    def _kill(proc) -> None:
        if proc.is_alive():
            proc.terminate()
            proc.join(1.0)
        if proc.is_alive():
            proc.kill()
            proc.join(1.0)

    @staticmethod
    def _death_reason(exitcode: int | None) -> str:
        if exitcode is None or exitcode >= 0:
            return ""
        import signal
        try:
            name = signal.Signals(-exitcode).name
        except ValueError:
            name = f"signal {-exitcode}"
        return f" (worker killed by {name})"


def default_runner(time_budget_s: float = 10.0, isolation: str = "process",
                   cpu_seconds: int | None = None, memory_mb: int | None = None) -> Runner:
    """Pick a runner. ``isolation='process'`` uses real subprocess isolation when
    fork is available, else falls back to the in-process thread runner."""
    if isolation == "process" and fork_available():
        return SubprocessRunner(time_budget_s, cpu_seconds, memory_mb)
    return InProcessRunner(time_budget_s)
