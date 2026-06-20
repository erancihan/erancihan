# tradebot

A lean, **paper-trading-first** equities trading bot in Python, built on
[Alpaca](https://alpaca.markets/). It backtests, paper-trades, and (when you
explicitly opt in) live-trades US stocks & ETFs using pluggable strategies and
hard risk limits.

**Cost model:** free to build and run. Alpaca offers commission-free US equity
trading, a $0 minimum, free IEX market data, and a paper-trading sandbox that
mirrors the live API. The only money at risk is capital *you* choose to deploy
in live mode. Everything else — the SDK, the data, this code — is free and open.

> ⚠️ **Not financial advice.** Automated trading can lose money fast. The
> defaults here are conservative and the bot runs in **paper mode** unless you
> jump through deliberate hoops to enable live trading. Understand the code and
> backtest thoroughly before risking a cent.

---

## Why it's built this way

A trading bot is ~20% strategy and ~80% plumbing that stops you losing money by
accident. The design reflects that:

- **Paper by default.** Live trading needs `mode: live` *and* an environment
  latch (`TRADEBOT_LIVE_CONFIRM=I_UNDERSTAND`). You can't risk real money by
  fat-fingering a config.
- **Risk lives in one place.** A `RiskManager` sizes every position (max % of
  equity per symbol), caps total gross exposure, and trips a daily-loss circuit
  breaker that flattens and halts. Strategies can't bypass it.
- **Backtest == live.** The backtester runs the *same* `Strategy` and
  `RiskManager` objects the live engine uses, so what you test is what you run.
- **No look-ahead.** Signals decided on bar *t*'s close are executed on bar
  *t+1*, with configurable slippage and commission.
- **Auditable.** Every order and periodic equity snapshot is written to SQLite.
- **Offline-friendly.** The strategy/backtest core depends only on
  pandas + numpy; the Alpaca SDK is imported lazily, so you can develop, test,
  and backtest with no credentials and no network.

## Architecture

```
                 ┌──────────────┐
   market data → │   Strategy   │ → target ∈ {-1, 0, +1}   (pure, stateless)
                 └──────────────┘
                        │
                        ▼
                 ┌──────────────┐   sizing + caps + daily-loss breaker
                 │ RiskManager  │ → signed share quantity
                 └──────────────┘
                        │
          ┌─────────────┴──────────────┐
          ▼                            ▼
   ┌─────────────┐              ┌─────────────┐
   │  Backtester │              │   Engine    │ → Broker (Alpaca paper/live)
   │ (simulated) │              │ (paper/live)│ → Storage (SQLite audit log)
   └─────────────┘              └─────────────┘
```

| Module | Responsibility |
|---|---|
| `tradebot/indicators.py` | SMA, EMA, RSI, crossover helpers (pure pandas) |
| `tradebot/strategies/` | `Strategy` interface + `SmaCrossover`, `RsiReversion` |
| `tradebot/risk.py` | Position sizing, exposure cap, daily-loss breaker |
| `tradebot/portfolio.py` | Cost-basis & realised-P&L accounting (backtest) |
| `tradebot/backtest.py` | Event-driven backtester + performance metrics |
| `tradebot/broker/` | `Broker` interface + Alpaca adapter (lazy SDK import) |
| `tradebot/data/` | Alpaca history, synthetic generator, CSV loader |
| `tradebot/engine.py` | Live/paper rebalance loop |
| `tradebot/storage.py` | SQLite persistence of orders + equity |
| `tradebot/config.py` | YAML config + env secrets + live-trading gate |
| `tradebot/cli.py` | `demo` / `backtest` / `run` / `status` commands |

## Quickstart

### 1. Try it with zero setup (offline)

```bash
make install          # venv + core deps (pandas, numpy, pytest)
make test             # run the suite
make demo             # backtest both strategies on synthetic data
```

`demo` needs no API keys and no network — it generates synthetic price data and
backtests `SmaCrossover` and `RsiReversion` against it.

### 2. Backtest a real symbol

Backtest from a local CSV (columns: `timestamp,open,high,low,close,volume`):

```bash
cp config.example.yaml config.yaml
make install
.venv/bin/python -m tradebot.cli backtest --config config.yaml --csv data/SPY.csv --symbol SPY
```

…or pull history straight from Alpaca (needs free keys, see below):

```bash
make install-live
.venv/bin/python -m tradebot.cli backtest --config config.yaml --out equity.csv
```

### 3. Dry-run forward-test

A **dry-run** runs the *exact* real-time trading loop — data → strategy → risk →
order — but fills orders against a **local virtual account** (seeded from
`initial_cash`) instead of sending them anywhere. No money, no broker account,
no order ever leaves the process. Positions and P&L evolve over time, so it's a
true forward-test: the dress rehearsal between backtesting and paper trading.

Fully offline (replays synthetic data — **no credentials, no network**):

```bash
make install
.venv/bin/python -m tradebot.cli run --config config.yaml --replay --replay-periods 300
# or replay your own history:
.venv/bin/python -m tradebot.cli run --config config.yaml --replay-csv data/SPY.csv
```

Against **live** market data (needs a free Alpaca *data* key — still no trading
account is used):

```bash
make install-live
.venv/bin/python -m tradebot.cli run --config config.yaml --dry-run
```

`--dry-run` overlays whatever `mode` your config has (even `mode: live`) and
simply suppresses real submits, so it never trips the live-money gate. On exit it
prints a forward-test summary, and every simulated order + equity snapshot is
written to the SQLite log tagged `dry_run`.

> **What it does *not* model:** real fills (it uses last price ± fixed slippage,
> instant and full), order rejects/partials, buying-power/PDT/settlement rules.
> For realistic execution, graduate to `mode: paper`. The realism ladder is:
> **backtest → dry-run → paper → live**.

### 4. Paper trade

1. Create a free Alpaca account, open **Paper Trading**, and generate API keys.
2. `cp .env.example .env` and paste your **paper** key/secret.
3. Set `mode: paper` in `config.yaml` (the default).

```bash
make install-live
.venv/bin/python -m tradebot.cli status --config config.yaml   # sanity-check connection
.venv/bin/python -m tradebot.cli run --config config.yaml --once   # one rebalance pass
.venv/bin/python -m tradebot.cli run --config config.yaml           # continuous loop
```

### 5. Go live (only when you're sure)

Live trading is intentionally awkward to enable:

1. Set `mode: live` in `config.yaml`.
2. Put **live** (not paper) API keys in `.env`.
3. Export the safety latch: `export TRADEBOT_LIVE_CONFIRM=I_UNDERSTAND`.

Without all three the bot refuses to place live orders.

## Configuration

Strategy and risk knobs live in `config.yaml` (safe to commit — no secrets).
Secrets live in `.env` / environment only. See `config.example.yaml` for the
full annotated set. Key risk controls:

```yaml
risk:
  max_position_pct: 0.10     # ≤10% of equity per symbol
  max_gross_exposure: 1.0    # ≤100% of equity deployed at once
  max_daily_loss_pct: 0.03   # flatten + halt after a 3% daily drawdown
```

## Strategies

- **`sma_crossover`** — trend-following. Long when the fast MA is above the slow
  MA, flat (or short) otherwise. SMA or EMA selectable.
- **`rsi_reversion`** — mean-reversion. Long when RSI is oversold, exit when it
  normalises; optional short side.

Add your own by subclassing `Strategy` and implementing
`target_positions(bars) -> Series` (values in `{-1, 0, +1}`), then register it in
`tradebot/strategies/registry.py`. Because strategies are pure functions of
price data, they're trivial to unit-test (see `tests/test_strategies.py`).

## Running it for free, continuously

For a $0 deployment, run the loop on any always-on machine you already have
(a Raspberry Pi, a home server) under `cron`/`systemd`/`tmux`, or schedule
`run --once` with `cron`. Paper trading and IEX data stay within Alpaca's free
tier.

## Testing

```bash
make test     # 35 tests, fully offline
```

## Roadmap / ideas

- More strategies (Bollinger bands, MACD, momentum) and a walk-forward optimiser
- Bracket / stop-loss / take-profit order types
- Telegram or email notifications on fills and circuit-breaker trips
- Streaming data via Alpaca websockets instead of polling
- A small Streamlit/Flask dashboard reading the SQLite log

## Disclaimer

This software is for educational purposes and provided "as is", without warranty
of any kind. Trading involves substantial risk of loss. You are solely
responsible for any orders it places and any money you lose. Test in paper mode
first, and never deploy capital you can't afford to lose.
