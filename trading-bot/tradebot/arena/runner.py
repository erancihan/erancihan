"""Runners execute one contestant and capture the outcome.

``InProcessRunner`` runs the simulation directly but wrapped so that a crash or
an over-long run becomes a recorded status (ERROR / TIMEOUT) instead of taking
down the tournament. The ``Runner`` protocol is the seam where a future
``SubprocessRunner`` (hard resource limits for untrusted code) drops in without
touching scoring or orchestration.

Timeouts here are **soft**: the contestant runs on a daemon thread and we
``join(timeout)``. On expiry we mark it TIMEOUT and move on immediately — the
orphaned thread keeps running in the background until it finishes (Python threads
can't be force-killed), but being a daemon it never blocks process exit. This is
a fair guard for the *trusted* case; hard CPU/memory/wall-clock limits (kill on
timeout) are the job of the subprocess runner.

NB: do not wrap the worker in a ``ThreadPoolExecutor`` context manager — its
``__exit__`` calls ``shutdown(wait=True)`` and blocks until the (uninterruptible)
task ends, which silently defeats the timeout.
"""

from __future__ import annotations

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


class InProcessRunner:
    def __init__(self, time_budget_s: float = 10.0) -> None:
        self.time_budget_s = time_budget_s

    def run(
        self,
        contestant: Contestant,
        frames: dict[str, pd.DataFrame],
        risk: RiskManager,
        config: SimConfig,
        scorer: Scorer,
    ) -> ContestantResult:
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
            # Budget exceeded: abandon the (daemon) thread and move on.
            return ContestantResult(
                contestant, status=TIMEOUT,
                error=f"exceeded {self.time_budget_s:g}s",
                duration_s=duration,
            )
        if "error" in box:
            exc = box["error"]
            return ContestantResult(
                contestant, status=ERROR,
                error=f"{type(exc).__name__}: {exc}",
                duration_s=duration,
            )

        result = box["result"]
        return ContestantResult(
            contestant, status=OK,
            score=float(scorer(result)),
            result=result,
            duration_s=duration,
        )
