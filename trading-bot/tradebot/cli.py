"""Command-line entrypoint.

    tradebot backtest --config config.yaml [--plot out.csv]
    tradebot demo                         # offline backtest on synthetic data
    tradebot run --config config.yaml     # paper/live loop (needs Alpaca creds)
    tradebot status --config config.yaml  # account snapshot from the broker

Live trading additionally requires TRADEBOT_LIVE_CONFIRM=I_UNDERSTAND (see config).
"""

from __future__ import annotations

import argparse
import logging
import sys

from . import __version__


def _setup_logging(verbose: bool) -> None:
    logging.basicConfig(
        level=logging.DEBUG if verbose else logging.INFO,
        format="%(asctime)s %(levelname)-7s %(name)s: %(message)s",
    )


def _print_summary(summary: dict) -> None:
    print("\n=== Backtest summary ===")
    for k, v in summary.items():
        print(f"  {k:>14}: {v}")
    print()


def cmd_demo(args: argparse.Namespace) -> int:
    """Self-contained offline backtest — no creds, no network."""
    from .backtest import Backtester
    from .data.synthetic import synthetic_ohlcv
    from .risk import RiskConfig, RiskManager
    from .strategies import build_strategy

    df = synthetic_ohlcv(periods=750, drift=0.0005, volatility=0.012, seed=args.seed)
    strategy = build_strategy(
        args.strategy,
        {"fast": 20, "slow": 50} if args.strategy == "sma_crossover" else {},
    )
    bt = Backtester(strategy, RiskManager(RiskConfig(max_position_pct=0.95)), initial_cash=10_000.0)
    result = bt.run(df, symbol="DEMO")
    _print_summary(result.summary())
    print(f"(synthetic data, strategy={args.strategy}) — buy & hold for reference:")
    bh = df["close"].iloc[-1] / df["open"].iloc[0] - 1
    print(f"  buy & hold return: {round(bh, 4)}\n")
    return 0


def cmd_backtest(args: argparse.Namespace) -> int:
    from .backtest import Backtester
    from .config import Settings
    from .data.synthetic import load_csv
    from .risk import RiskManager
    from .strategies import build_strategy

    settings = Settings.from_yaml(args.config)
    strategy = build_strategy(settings.strategy_name, settings.strategy_params)
    risk = RiskManager(settings.risk)
    bt = Backtester(
        strategy, risk,
        initial_cash=settings.initial_cash,
        commission=settings.commission,
        slippage_bps=settings.slippage_bps,
    )

    if args.csv:
        data = {args.symbol or settings.symbols[0]: load_csv(args.csv)}
    else:
        # Pull history from Alpaca for each configured symbol.
        from .config import AlpacaCredentials
        from .data import get_alpaca_data

        creds = AlpacaCredentials.from_env()
        if creds is None:
            print("No Alpaca credentials found and no --csv given. "
                  "Set ALPACA_API_KEY/ALPACA_API_SECRET or pass --csv.", file=sys.stderr)
            return 2
        ds = get_alpaca_data(creds.api_key, creds.api_secret, feed=creds.feed)
        data = {s: ds.history(s, timeframe=settings.timeframe, lookback=args.lookback)
                for s in settings.symbols}

    result = bt.run(data)
    _print_summary(result.summary())
    if args.out:
        result.equity_curve.to_csv(args.out)
        print(f"Equity curve written to {args.out}")
    return 0


def _build_live_components(settings):
    from .config import AlpacaCredentials
    from .broker import get_broker
    from .data import get_alpaca_data
    from .risk import RiskManager
    from .storage import Storage
    from .strategies import build_strategy

    creds = AlpacaCredentials.from_env()
    if creds is None:
        raise SystemExit("Missing ALPACA_API_KEY / ALPACA_API_SECRET in environment/.env")
    broker = get_broker(creds.api_key, creds.api_secret, paper=settings.broker_is_paper)
    data = get_alpaca_data(creds.api_key, creds.api_secret, feed=creds.feed)
    strategy = build_strategy(settings.strategy_name, settings.strategy_params)
    risk = RiskManager(settings.risk)
    storage = Storage(settings.db_path)
    return broker, data, strategy, risk, storage


def cmd_run(args: argparse.Namespace) -> int:
    from .config import Settings
    from .engine import Engine

    settings = Settings.from_yaml(args.config)

    # Replaying data only makes sense as a (offline) dry-run; imply the flag.
    if getattr(args, "replay", False) or getattr(args, "replay_csv", None):
        args.dry_run = True
    if args.dry_run:
        return _run_dry(settings, args)

    broker, data, strategy, risk, storage = _build_live_components(settings)
    engine = Engine(settings, broker, data, strategy, risk, storage)

    mode = "LIVE (real money)" if settings.is_live else "paper"
    print(f"Running in {mode} mode on {settings.symbols} with {strategy.name}.")
    if args.once:
        for action in engine.rebalance():
            print(f"  {action.symbol}: target={action.target} order_qty={action.order_qty}")
    else:
        engine.run_forever(max_iterations=args.iterations)
    return 0


def _run_dry(settings, args: argparse.Namespace) -> int:
    """Forward-test: the real-time loop with simulated fills, no orders sent."""
    from .broker.dryrun import DryRunBroker
    from .engine import Engine
    from .risk import RiskManager
    from .storage import Storage
    from .strategies import build_strategy

    strategy = build_strategy(settings.strategy_name, settings.strategy_params)
    risk = RiskManager(settings.risk)
    storage = Storage(settings.db_path)

    replay = bool(args.replay or args.replay_csv)
    if replay:
        data = _build_replay_data(settings, strategy, args)
    else:
        from .config import AlpacaCredentials
        from .data import get_alpaca_data

        creds = AlpacaCredentials.from_env()
        if creds is None:
            print(
                "Dry-run needs market data. Either pass --replay for a fully "
                "offline forward-test, or set ALPACA_API_KEY/ALPACA_API_SECRET "
                "(a free, data-only key — no trading account is used).",
                file=sys.stderr,
            )
            return 2
        data = get_alpaca_data(creds.api_key, creds.api_secret, feed=creds.feed)

    broker = DryRunBroker(
        data,
        timeframe=settings.timeframe,
        initial_cash=settings.initial_cash,
        slippage_bps=settings.slippage_bps,
        commission=settings.commission,
    )
    engine = Engine(
        settings, broker, data, strategy, risk, storage,
        mode_label="dry_run", enforce_live_ack=False,
    )

    src = "replay" if replay else "live data"
    print(
        f"[DRY-RUN] Forward-test ({src}) on {settings.symbols} with "
        f"{strategy.name}; virtual ${settings.initial_cash:,.0f}, no orders sent."
    )
    try:
        if replay:
            _drive_replay(engine, data, args)
        elif args.once:
            engine.rebalance()
        else:
            engine.run_forever(max_iterations=args.iterations)
    except KeyboardInterrupt:
        print("\n[DRY-RUN] Interrupted.")
    finally:
        _print_dryrun_summary(broker)
        storage.close()
    return 0


def _build_replay_data(settings, strategy, args):
    from .data.replay import ReplayData
    from .data.synthetic import load_csv, synthetic_ohlcv

    warmup = strategy.required_history + 2
    if args.replay_csv:
        frames = {settings.symbols[0]: load_csv(args.replay_csv)}
    else:
        frames = {
            sym: synthetic_ohlcv(periods=args.replay_periods, seed=42 + i)
            for i, sym in enumerate(settings.symbols)
        }
    return ReplayData(frames, warmup=warmup)


def _drive_replay(engine, data, args) -> None:
    import time

    steps = 0
    while True:
        engine.rebalance()
        steps += 1
        if args.iterations and steps >= args.iterations:
            break
        if not data.has_next():
            break
        data.advance()
        if args.speed:
            time.sleep(args.speed)


def _print_dryrun_summary(broker) -> None:
    print("\n=== Dry-run forward-test summary ===")
    for k, v in broker.summary().items():
        print(f"  {k:>16}: {v}")
    print()


def cmd_status(args: argparse.Namespace) -> int:
    from .config import AlpacaCredentials, Settings
    from .broker import get_broker

    settings = Settings.from_yaml(args.config)
    creds = AlpacaCredentials.from_env()
    if creds is None:
        print("Missing Alpaca credentials.", file=sys.stderr)
        return 2
    broker = get_broker(creds.api_key, creds.api_secret, paper=settings.broker_is_paper)
    acct = broker.account()
    print(f"Account ({'paper' if acct.is_paper else 'LIVE'}):")
    print(f"  equity      : {acct.equity:,.2f}")
    print(f"  cash        : {acct.cash:,.2f}")
    print(f"  buying_power: {acct.buying_power:,.2f}")
    print(f"  market open : {broker.is_market_open()}")
    positions = broker.positions()
    if positions:
        print("Positions:")
        for sym, p in positions.items():
            print(f"  {sym:<6} qty={p.qty:>10.4f} avg={p.avg_price:.2f}")
    else:
        print("No open positions.")
    return 0


def cmd_arena_list(args: argparse.Namespace) -> int:
    from .arena.loader import discover

    contestants, errors = discover(args.algos)
    if not contestants:
        print("No contestants found.", file=sys.stderr)
    else:
        print(f"{'name':<20} {'kind':<11} {'author':<12} tags")
        print("-" * 60)
        for c in contestants:
            print(f"{c.name:<20} {c.kind:<11} {c.author:<12} {', '.join(c.tags)}")
    for e in errors:
        print(f"  ! load error: {e.path}: {e.message}", file=sys.stderr)
    return 0


def cmd_arena_run(args: argparse.Namespace) -> int:
    from .arena.scenario import Scenario
    from .arena.tournament import run_tournament

    scenario = Scenario.from_yaml(args.scenario) if args.scenario else Scenario.default()
    outcome = run_tournament(
        args.algos, scenario, metric=args.score, time_budget_s=args.time_budget
    )
    print(outcome.leaderboard.table())
    for e in outcome.load_errors:
        print(f"  ! load error: {e.path}: {e.message}", file=sys.stderr)

    if args.out:
        import json

        payload = {
            "metric": outcome.leaderboard.metric,
            "scenario": scenario.name,
            "entries": [
                {
                    "rank": r.rank, "name": r.name, "author": r.author, "kind": r.kind,
                    "status": r.status, "score": r.score,
                    "total_return": None if r.result is None else r.total_return,
                    "sharpe": None if r.result is None else r.sharpe,
                    "max_drawdown": None if r.result is None else r.max_drawdown,
                    "num_trades": r.num_trades, "error": r.error,
                }
                for r in outcome.leaderboard.entries
            ],
        }
        with open(args.out, "w") as fh:
            json.dump(payload, fh, indent=2)
        print(f"Results written to {args.out}")
    return 0


def cmd_arena_validate(args: argparse.Namespace) -> int:
    """Import one algo file and smoke-test it on a tiny synthetic scenario."""
    from .arena.scenario import Scenario
    from .arena.tournament import run_tournament

    scenario = Scenario(name="validate", periods=120, seed=1)
    outcome = run_tournament([args.path], scenario, metric="total_return")
    if not outcome.leaderboard.entries and not outcome.load_errors:
        print(f"No contestants registered in {args.path}", file=sys.stderr)
        return 1
    ok = True
    for r in outcome.leaderboard.entries:
        if r.ok:
            print(f"  OK    {r.name}: return={r.total_return:.2%}, trades={r.num_trades}")
        else:
            ok = False
            print(f"  FAIL  {r.name}: {r.status} - {r.error}", file=sys.stderr)
    for e in outcome.load_errors:
        ok = False
        print(f"  FAIL  {e.path}: {e.message}", file=sys.stderr)
    return 0 if ok else 1


def cmd_data_pull(args: argparse.Namespace) -> int:
    """Pull bars from Alpaca into the local cache for offline/repeatable use."""
    from .data.cache import BarCache, build_default_fetcher

    fetcher = build_default_fetcher()
    if fetcher is None:
        print("Missing ALPACA_API_KEY / ALPACA_API_SECRET in environment/.env",
              file=sys.stderr)
        return 2
    cache = BarCache(args.cache_dir)
    for symbol in args.symbols:
        df = cache.get(symbol, args.timeframe, args.start, args.end, fetcher)
        print(f"  {symbol}: {len(df)} bars -> {cache.path(symbol, args.timeframe)}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="tradebot", description="Lean Alpaca trading bot.")
    p.add_argument("--version", action="version", version=f"tradebot {__version__}")
    p.add_argument("-v", "--verbose", action="store_true", help="debug logging")
    sub = p.add_subparsers(dest="command", required=True)

    d = sub.add_parser("demo", help="offline backtest on synthetic data (no creds)")
    d.add_argument("--strategy", default="sma_crossover",
                   choices=["sma_crossover", "rsi_reversion"])
    d.add_argument("--seed", type=int, default=42)
    d.set_defaults(func=cmd_demo)

    b = sub.add_parser("backtest", help="backtest a config against CSV or Alpaca data")
    b.add_argument("--config", required=True)
    b.add_argument("--csv", help="backtest a single symbol from a local OHLCV CSV")
    b.add_argument("--symbol", help="symbol label when using --csv")
    b.add_argument("--lookback", type=int, default=365, help="days of history (Alpaca)")
    b.add_argument("--out", help="write equity curve CSV here")
    b.set_defaults(func=cmd_backtest)

    r = sub.add_parser("run", help="run the paper/live/dry-run trading loop")
    r.add_argument("--config", required=True)
    r.add_argument("--once", action="store_true", help="single rebalance pass then exit")
    r.add_argument("--iterations", type=int, default=None, help="stop after N loops")
    r.add_argument(
        "--dry-run", dest="dry_run", action="store_true",
        help="forward-test: run the live loop with simulated fills against a "
             "virtual account; no orders are ever sent",
    )
    r.add_argument(
        "--replay", action="store_true",
        help="dry-run fully offline by replaying synthetic data (implies --dry-run, no creds)",
    )
    r.add_argument(
        "--replay-csv", dest="replay_csv",
        help="dry-run by replaying a local OHLCV CSV for the first symbol (implies --dry-run)",
    )
    r.add_argument(
        "--replay-periods", dest="replay_periods", type=int, default=500,
        help="number of synthetic bars to replay with --replay (default 500)",
    )
    r.add_argument(
        "--speed", type=float, default=0.0,
        help="seconds to sleep between replay steps (default 0 = as fast as possible)",
    )
    r.set_defaults(func=cmd_run)

    s = sub.add_parser("status", help="print broker account snapshot")
    s.add_argument("--config", required=True)
    s.set_defaults(func=cmd_status)

    arena = sub.add_parser("arena", help="run algorithm competitions")
    asub = arena.add_subparsers(dest="arena_command", required=True)

    al = asub.add_parser("list", help="discover & list contestants (no run)")
    al.add_argument("--algos", required=True, nargs="+", help="algo files and/or folders")
    al.set_defaults(func=cmd_arena_list)

    av = asub.add_parser("validate", help="smoke-test one algo file")
    av.add_argument("path", help="path to an algo .py file")
    av.set_defaults(func=cmd_arena_validate)

    ar = asub.add_parser("run", help="run a tournament and print a leaderboard")
    ar.add_argument("--algos", required=True, nargs="+", help="algo files and/or folders")
    ar.add_argument("--scenario", help="scenario YAML (default: built-in synthetic)")
    ar.add_argument("--score", default="sharpe",
                    help="ranking metric: sharpe|total_return|cagr|calmar (default sharpe)")
    ar.add_argument("--time-budget", dest="time_budget", type=float, default=10.0,
                    help="per-contestant wall-clock budget in seconds (default 10)")
    ar.add_argument("--out", help="write the leaderboard to this JSON file")
    ar.set_defaults(func=cmd_arena_run)

    data = sub.add_parser("data", help="market-data utilities")
    dsub = data.add_subparsers(dest="data_command", required=True)
    dp = dsub.add_parser("pull", help="download bars from Alpaca into the local cache")
    dp.add_argument("--symbols", required=True, nargs="+")
    dp.add_argument("--timeframe", default="1day")
    dp.add_argument("--start", help="ISO date, e.g. 2023-01-01")
    dp.add_argument("--end", help="ISO date, e.g. 2024-01-01")
    dp.add_argument("--cache-dir", dest="cache_dir", default="data/cache")
    dp.set_defaults(func=cmd_data_pull)
    return p


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    _setup_logging(getattr(args, "verbose", False))
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
