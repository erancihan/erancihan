"""Orchestrates a tournament: discover -> run each contestant -> rank."""

from __future__ import annotations

from dataclasses import dataclass

from ..risk import RiskManager
from .loader import LoadError, discover
from .result import Leaderboard
from .runner import InProcessRunner, Runner
from .scenario import Scenario
from .scoring import get_scorer
from .simulation import SimConfig


@dataclass
class TournamentOutcome:
    leaderboard: Leaderboard
    load_errors: list[LoadError]


def run_tournament(
    paths,
    scenario: Scenario | None = None,
    metric: str = "sharpe",
    runner: Runner | None = None,
    time_budget_s: float = 10.0,
) -> TournamentOutcome:
    """Load contestants from ``paths`` and rank them over ``scenario``."""
    scenario = scenario or Scenario.default()
    scorer = get_scorer(metric)  # validate metric early (raises on typo)
    runner = runner or InProcessRunner(time_budget_s)

    contestants, load_errors = discover(paths)
    frames = scenario.build_frames()
    risk = RiskManager(scenario.risk)
    config = SimConfig(
        initial_cash=scenario.initial_cash,
        commission=scenario.commission,
        slippage_bps=scenario.slippage_bps,
    )

    results = [runner.run(c, frames, risk, config, scorer) for c in contestants]
    return TournamentOutcome(
        leaderboard=Leaderboard.build(metric, results),
        load_errors=load_errors,
    )
