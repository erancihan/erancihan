"""Server-rendered full pages."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse

from ..dependencies import get_arena_repo, get_trading_repo, templates
from ..repository import ArenaRepository, TradingRepository
from ..services import account_service, metrics_service

router = APIRouter()


@router.get("/", response_class=HTMLResponse)
def dashboard(request: Request, repo: TradingRepository = Depends(get_trading_repo)):
    equity = repo.equity_series(limit=2000)
    context = {
        "metrics": metrics_service.summarize(equity),
        "account": account_service.snapshot(repo),
        "orders": repo.recent_orders(limit=25),
        "modes": repo.modes(),
        "active": "dashboard",
    }
    return templates.TemplateResponse(request, "pages/dashboard.html", context)


@router.get("/arena", response_class=HTMLResponse)
def arena(request: Request, repo: ArenaRepository = Depends(get_arena_repo)):
    runs = repo.list_runs()
    latest = runs[0]["id"] if runs else None
    return _render_arena(request, repo, runs, latest)


@router.get("/arena/{run_id}", response_class=HTMLResponse)
def arena_run(
    run_id: int, request: Request, repo: ArenaRepository = Depends(get_arena_repo)
):
    runs = repo.list_runs()
    return _render_arena(request, repo, runs, run_id)


def _render_arena(request, repo, runs, run_id):
    detail = repo.get_run(run_id) if run_id is not None else None
    context = {
        "runs": runs,
        "run": detail["run"] if detail else None,
        "entries": detail["results"] if detail else [],
        "run_id": run_id,
        "active": "arena",
    }
    return templates.TemplateResponse(request, "pages/arena.html", context)
