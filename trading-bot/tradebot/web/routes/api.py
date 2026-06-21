"""JSON endpoints — the data contracts the ECharts components consume."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from ..dependencies import get_arena_repo, get_trading_repo
from ..repository import ArenaRepository, TradingRepository
from ..schemas import (
    ArenaCurve,
    ArenaRunDetail,
    EquityPoint,
    EquitySeries,
    LeaderboardEntry,
    RunSummary,
)

router = APIRouter(prefix="/api")


@router.get("/equity", response_model=EquitySeries)
def equity(mode: str | None = None, limit: int = 2000,
           repo: TradingRepository = Depends(get_trading_repo)):
    rows = repo.equity_series(mode=mode, limit=limit)
    points = [
        EquityPoint(ts=r["ts"], equity=float(r["equity"]),
                    cash=float(r["cash"]), mode=r["mode"])
        for r in rows
    ]
    return EquitySeries(mode=mode, points=points)


@router.get("/arena/runs", response_model=list[RunSummary])
def arena_runs(repo: ArenaRepository = Depends(get_arena_repo)):
    return [
        RunSummary(id=r["id"], ts=r["ts"], scenario=r["scenario"], metric=r["metric"],
                   num_contestants=r["num_contestants"], winner=r.get("winner"))
        for r in repo.list_runs()
    ]


@router.get("/arena/runs/{run_id}", response_model=ArenaRunDetail)
def arena_run(run_id: int, repo: ArenaRepository = Depends(get_arena_repo)):
    detail = repo.get_run(run_id)
    if detail is None:
        return ArenaRunDetail(id=run_id, scenario="", metric="", entries=[], curves=[])

    entries, curves = [], []
    for r in detail["results"]:
        entries.append(LeaderboardEntry(
            rank=r["rank"], name=r["name"], author=r["author"] or "", kind=r["kind"] or "",
            status=r["status"], score=r["score"], total_return=r["total_return"],
            sharpe=r["sharpe"], max_drawdown=r["max_drawdown"], num_trades=r["num_trades"] or 0,
        ))
        eq = ArenaRepository.parse_equity(r["equity_json"])
        if eq:
            curves.append(ArenaCurve(name=r["name"], index=eq["index"], equity=eq["equity"]))

    run = detail["run"]
    return ArenaRunDetail(id=run["id"], scenario=run["scenario"], metric=run["metric"],
                          entries=entries, curves=curves)
