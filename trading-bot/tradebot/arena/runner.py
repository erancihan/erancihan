"""Runners execute one contestant and capture the outcome.

``InProcessRunner`` runs the simulation directly but wrapped so that a crash or
an over-long run becomes a recorded status (ERROR / TIMEOUT) instead of taking
down the tournament. The ``Runner`` protocol is the seam where a future
``SubprocessRunner`` (hard resource limits for untrusted code) drops in without
touching scoring or orchestration.

The timeout uses a worker thread + ``future.result(timeout)``: on expiry we
abandon the (daemon) thread and move on. That is a real wall-clock guard for the
trusted case; hard CPU/memory isolation is a job for the subprocess runner.
"""

from __future__ import annotations

import concurrent.futures as futures
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

        def work():
            return simulate(policy_for(contestant), frames, risk, config)

        try:
            with futures.ThreadPoolExecutor(max_workers=1) as pool:
                result = pool.submit(work).result(timeout=self.time_budget_s)
        except futures.TimeoutError:
            return ContestantResult(
                contestant, status=TIMEOUT,
                error=f"exceeded {self.time_budget_s:g}s",
                duration_s=time.perf_counter() - start,
            )
        except Exception as exc:  # noqa: BLE001 - isolate contestant failures
            return ContestantResult(
                contestant, status=ERROR,
                error=f"{type(exc).__name__}: {exc}",
                duration_s=time.perf_counter() - start,
            )

        return ContestantResult(
            contestant, status=OK,
            score=float(scorer(result)),
            result=result,
            duration_s=time.perf_counter() - start,
        )
