import json
import os

import pytest

from tradebot.arena.contestant import Contestant
from tradebot.arena.interfaces import Action, Algo
from tradebot.arena.runner import SubprocessRunner, default_runner, fork_available
from tradebot.arena.scoring import get_scorer
from tradebot.arena.simulation import SimConfig
from tradebot.data.synthetic import synthetic_ohlcv
from tradebot.risk import RiskConfig, RiskManager

needs_fork = pytest.mark.skipif(not fork_available(), reason="requires fork")


# --- direct hardening checks (in a forked child) -----------------------------

@needs_fork
def test_apply_hardening_blocks_disk_writes(tmp_path):
    target = str(tmp_path / "evil.txt")
    pid = os.fork()
    if pid == 0:  # child
        from tradebot.arena.sandbox import apply_hardening
        apply_hardening()
        try:
            with open(target, "w") as f:
                f.write("x" * 1000)
                f.flush()
            os._exit(0)        # write succeeded -> NOT blocked
        except OSError:
            os._exit(42)       # blocked
    _, status = os.waitpid(pid, 0)
    code = os.waitstatus_to_exitcode(status)
    assert code in (42, -25)   # OSError, or killed by SIGXFSZ(25)


@needs_fork
def test_apply_hardening_isolates_network(tmp_path):
    r, w = os.pipe()
    pid = os.fork()
    if pid == 0:  # child
        os.close(r)
        import socket

        from tradebot.arena.sandbox import apply_hardening
        report = apply_hardening()
        ifaces = [name for _, name in socket.if_nameindex()]
        os.write(w, json.dumps({"net": report.get("network"), "ifaces": ifaces}).encode())
        os._exit(0)
    os.close(w)
    data = os.read(r, 4096)
    os.waitpid(pid, 0)
    result = json.loads(data)
    if result["net"]:                       # network isolation was enforced
        assert set(result["ifaces"]) <= {"lo"}   # only (down) loopback remains


# --- runner integration ------------------------------------------------------

def _run(factory, harden):
    df = synthetic_ohlcv(periods=40, seed=1)
    runner = SubprocessRunner(time_budget_s=5.0, harden=harden)
    contestant = Contestant(name="x", factory=factory, kind="event")
    return runner.run(contestant, {"DEMO": df}, RiskManager(RiskConfig()),
                      SimConfig(), get_scorer("total_return"))


class _FlatAlgo(Algo):
    def on_bar(self, bar, ctx):
        return Action.flat()


@needs_fork
def test_hardened_runner_still_runs_a_normal_contestant():
    # Sandboxing must not break a compute-only algo (result returns via the pipe).
    assert _run(_FlatAlgo, harden=True).status == "ok"


@needs_fork
def test_hardened_runner_blocks_a_disk_writing_contestant(tmp_path):
    target = str(tmp_path / "out.txt")

    class _Writer(Algo):
        def on_bar(self, bar, ctx):
            with open(target, "w") as f:
                f.write("x" * 1000)
                f.flush()
            return Action.flat()

    assert _run(_Writer, harden=True).status != "ok"      # write blocked -> not ok
    assert _run(_Writer, harden=False).status == "ok"     # allowed when not hardened


@needs_fork
def test_default_runner_passes_harden_through():
    runner = default_runner(isolation="process", harden=True)
    assert isinstance(runner, SubprocessRunner) and runner.harden is True
