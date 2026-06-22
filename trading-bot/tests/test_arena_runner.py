import time

from tradebot.arena.contestant import Contestant
from tradebot.arena.interfaces import Action, Algo
from tradebot.arena.runner import InProcessRunner
from tradebot.arena.scoring import get_scorer
from tradebot.arena.simulation import SimConfig
from tradebot.data.synthetic import synthetic_ohlcv
from tradebot.risk import RiskConfig, RiskManager


class _SlowAlgo(Algo):
    """Sleeps on every bar so a full run far exceeds a small time budget."""

    def on_bar(self, bar, ctx) -> Action:
        time.sleep(0.05)
        return Action.flat()


class _FlatAlgo(Algo):
    def on_bar(self, bar, ctx) -> Action:
        return Action.flat()


def _run(factory, budget):
    df = synthetic_ohlcv(periods=40, seed=1)
    runner = InProcessRunner(time_budget_s=budget)
    contestant = Contestant(name="x", factory=factory, kind="event")
    return runner.run(contestant, {"DEMO": df}, RiskManager(RiskConfig()),
                      SimConfig(), get_scorer("total_return"))


def test_timeout_is_enforced_without_blocking():
    # 40 bars * 0.05s ≈ 2s of work, but the budget is 0.1s. If the runner blocked
    # until the work finished, this would take ~2s; it must return promptly.
    start = time.perf_counter()
    result = _run(_SlowAlgo, budget=0.1)
    elapsed = time.perf_counter() - start

    assert result.status == "timeout"
    assert "exceeded" in result.error
    assert elapsed < 1.0          # did not wait for the ~2s of sleeps


def test_fast_contestant_completes_ok():
    result = _run(_FlatAlgo, budget=5.0)
    assert result.status == "ok"
    assert result.result is not None
    assert result.score is not None
