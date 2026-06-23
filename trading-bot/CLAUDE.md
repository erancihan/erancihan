# CLAUDE.md — tradebot

Onboarding for an AI agent (or human) picking up this project. Read this first,
then skim `README.md` for the user-facing tour.

> **Keep this file updated.** Whenever you add a feature, change an invariant,
> learn a gotcha, or finish a roadmap item, update the relevant section below in
> the same change. Treat CLAUDE.md as part of the definition of done — a stale
> onboarding doc is worse than none. (There's a checklist at the bottom.)

---

## What this is

A **paper-trading-first** equities trading bot in Python, built on Alpaca
(commission-free, free paper trading + IEX data, $0 minimum). Greenfield, lives
entirely under `trading-bot/`. Four pillars:

1. **Trading core** — strategies, risk, backtester, broker/data adapters, CLI.
2. **Dry-run** — real-time loop with *simulated* fills against a virtual account.
3. **Arena** — load algorithms dynamically and rank them in competitions.
4. **Web dashboard** — FastAPI + TS/Tailwind/Alpine/ECharts; monitor + run sims.

Status: feature-complete for the core vision. **~90 tests, all offline & green**;
frontend has a strict `tsc` gate. Open PR: erancihan/erancihan #42 (base `master`).

## Agent skills

Project-scoped Claude Code skills live in `trading-bot/.claude/skills/`:
- **tradebot-dev** — orientation + the dev/test/build loop and the pre-commit
  checklist. Start here.
- **add-strategy** — add a pluggable trading strategy.
- **add-arena-algo** — write an arena contestant or extend the arena.

Keep these in sync when workflows or invariants change.

## Layout

```
trading-bot/
├── tradebot/                 # the Python package
│   ├── strategies/           # Strategy ABC + sma_crossover, rsi_reversion, registry
│   ├── indicators.py         # pure pandas: sma/ema/rsi/crossover
│   ├── risk.py               # RiskManager + RiskConfig (sizing, caps, daily-loss)
│   ├── portfolio.py          # cost-basis + realised-PnL accounting (sim)
│   ├── backtest.py           # Backtester + BacktestResult (metrics)
│   ├── models.py             # Order/Fill/Position/Trade/Side, BAR_COLUMNS, utcnow
│   ├── broker/               # Broker ABC, AlpacaBroker (lazy SDK), DryRunBroker
│   ├── data/                 # synthetic, csv loader, ReplayData, AlpacaData, BarCache
│   ├── engine.py             # live/paper/dry-run rebalance loop
│   ├── storage.py            # SQLite: orders + equity snapshots (tradebot.db)
│   ├── config.py             # Settings (YAML) + AlpacaCredentials (env) + live gate
│   ├── cli.py                # `tradebot` entrypoint (argparse)
│   ├── arena/                # competition system (see below)
│   └── web/                  # FastAPI dashboard (see below)
├── algos/                    # example arena contestants + how-to README
├── scenarios/                # arena scenario YAMLs
├── frontend/                 # TS + Tailwind + esbuild source for the dashboard
├── tests/                    # pytest (offline; web tests importorskip fastapi)
├── pyproject.toml            # deps + extras: [dev], [live], [web]; scripts
└── Makefile                  # install / test / demo / dryrun / arena / web
```

`tradebot/arena/`: `api.py` (@register), `loader.py` (importlib discovery),
`interfaces.py` (Algo/Action/Context), `adapters.py` (Policy), `simulation.py`
(stepped core), `scenario.py`, `runner.py`, `scoring.py`, `result.py`,
`tournament.py`, `store.py`.

`tradebot/web/`: `app.py` (factory), `repository.py` (read-only SQLite),
`services/` (metrics, account, jobs), `routes/` (pages, partials, api),
`schemas.py` (Pydantic), `templates/` (Jinja, componentised), `static/` (built,
gitignored).

## Invariants — do not break these

- **Paper by default.** Live trading requires `mode: live` *and* env
  `TRADEBOT_LIVE_CONFIRM=I_UNDERSTAND` (`config.Settings.require_live_ack`). Never
  weaken this gate or default anything to live.
- **No look-ahead.** Backtester shifts targets by one bar (decide on `t`, fill on
  `t+1`). The arena feeds a *growing window* so the future is physically invisible.
- **Risk is centralised.** All sizing/limits go through `RiskManager`; strategies
  only emit targets in `{-1, 0, +1}`. Don't let strategies size positions.
- **Backtest == live.** Backtester and live `Engine` share the same `Strategy` +
  `RiskManager`. The arena's stepped `simulation.simulate` must stay consistent
  with `Backtester` — guarded by `tests/test_arena_simulation.py`. If you touch
  either execution loop, keep that test green.
- **Import isolation.** The Alpaca SDK and `python-dotenv` are imported *lazily*
  (inside methods/functions), so the core works without them. The whole `web/`
  package must not be imported by the trading core. Keep these boundaries.
- **Offline-first.** Everything except the literal Alpaca network call runs and
  tests offline (synthetic data, fake fetchers). New features must keep a
  credential-free path and offline tests.
- **No inline JS in templates.** All browser behaviour is imported, type-checked
  TS bundled by esbuild. Templates only present data.

## Dev environment & commands

Python (works offline; no creds needed for tests/demos):
```bash
cd trading-bot
make install            # venv .venv + pip install -e ".[dev]"
make install-web        # adds [web] extra + npm install (for the dashboard)
make test               # pytest (web tests skip if fastapi absent)
make demo               # offline backtest on synthetic data
make dryrun             # offline forward-test (replay)
make arena              # run the example competition
make web                # build frontend + serve dashboard at :8000
```
CLI: `tradebot {backtest,run,status,demo,arena,data}` and `tradebot-web`.
`run --dry-run`/`--replay` = forward-test; `arena {list,run,validate,history,show}`.

Frontend (`trading-bot/frontend/`):
```bash
npm run typecheck       # strict tsc --noEmit (CI gate)
npm run build           # -> tradebot/web/static/{js,css} (minified, gitignored)
npm run watch:js        # dev rebuild on change
```
Stack: TypeScript, Alpine.js, Apache ECharts, Tailwind, esbuild. Built assets are
gitignored — reproduce with `npm run build`.

CI: `.github/workflows/trading-bot-ci.yml` runs pytest + (npm ci, typecheck,
build) on changes under `trading-bot/**`.

## Conventions

- Match the surrounding style; comments explain *why*, not *what*. Type hints
  throughout. `from __future__ import annotations` at the top of modules.
- Core logic (indicators/strategies/risk/backtest/arena) depends only on
  pandas+numpy. Adapters isolate Alpaca/FastAPI.
- Tests are offline and deterministic (seeded synthetic data, fake fetchers).
  Web/job tests `pytest.importorskip("fastapi")`.
- Web layering is strict: `routes → services → repository`. Partials are reused
  for both first paint and Alpine polling. JSON endpoints feed charts.
- Commits: clear messages; do not commit secrets, `*.db`, `data/cache/`,
  `node_modules/`, or `tradebot/web/static/` (all gitignored).

## Gotchas / lessons learned

- **Arena isolation & timeouts.** `arena/runner.py` has two runners behind the
  `Runner` protocol, chosen by `default_runner`:
  - `SubprocessRunner` (**default** on POSIX, `--isolation process`): each
    contestant runs in a forked process with a **hard** wall-clock timeout (the
    process is killed on expiry) + optional CPU/memory `rlimit`s
    (`--cpu-seconds` / `--memory-mb`). A runaway/hostile algo can't stall the
    tournament or keep burning CPU. Results return via a `Queue` (consume with
    the budget to avoid the queue-not-drained deadlock).
  - `InProcessRunner` (`--isolation thread`): portable **soft** runner — a
    daemon thread + `join(timeout)`; marks `TIMEOUT` but can't force-kill the
    thread (the daemon keeps running in the background; never blocks exit).
  Modes (`default_runner`): `process` (default) **raises** if fork is unavailable
  — it never silently downgrades hard→soft; `thread` is the explicit soft opt-in;
  `auto` prefers process and warns before falling back to soft.
  Lesson: never wrap a worker in a `ThreadPoolExecutor` context manager — its
  `__exit__` does `shutdown(wait=True)` and blocks until the (uninterruptible)
  task ends, silently defeating the timeout.
  Subprocess uses `fork` (args passed by inherited memory, so non-picklable
  contestant factories/frames are fine; only the result is pickled back).
- **Pydantic coercion:** typing a request field `dict[str, float]` coerces
  integer params (e.g. `fast`, `period`) to floats and breaks `rolling`/`.iloc`.
  `web/schemas.py JobRequest.params` is deliberately left untyped (`dict | None`).
- **Starlette TemplateResponse:** current Starlette requires the request-first
  signature `templates.TemplateResponse(request, name, context)`. The legacy
  `(name, context)` form mis-parses the context dict as the template name.
- **ReplayData cursor:** advance the replay cursor exactly once per loop step
  (the engine does many `history()` calls per pass); never auto-advance in
  `history()`. Keep `required_history`/warmup integers.
- **Equity-curve charts:** the arena/job equity is serialised as
  `{index: [...], equity: [...]}` JSON; persisted in arena_results, returned by
  job/arena APIs.

## Roadmap

Done: trading core · dry-run · arena (loading, both interfaces, Alpaca cache,
persistence, **hard subprocess isolation** w/ kill-on-timeout + CPU/mem limits,
**strict isolation modes** — process/thread/auto, no silent downgrade) ·
dashboard (equity+orders+positions+leaderboards, order markers, browser-run
backtests/dry-runs) · CI.

Next candidates (not started):
- Live wall-clock arena **league** (reuse scoring/result layer).
- Stronger sandboxing beyond `rlimit`s for truly hostile code (seccomp /
  containers / dropped filesystem+network) — builds on `SubprocessRunner`.
- Candlestick price chart with order markers (needs storing bar data).
- Live-account auto-refresh / websocket streaming.

## Definition of done (every change)

- [ ] Tests added/updated; `make test` green (and `npm run typecheck` if FE).
- [ ] Offline + credential-free path preserved.
- [ ] Invariants above respected (paper gate, no look-ahead, risk centralised,
      import isolation).
- [ ] **This CLAUDE.md updated** (status, roadmap, gotchas, layout as needed) and
      `README.md` if user-facing.
