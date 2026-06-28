# Swarm extension (Antigravity / VS Code)

The IDE surface. Wired up in Phases 4–6 (see [`../docs/PLAN.md`](../docs/PLAN.md)).

Planned contents:
- `extension.ts` — activation; registers the `@swarm` chat participant and commands.
- `lanesPanel.ts` — `registerWebviewViewProvider` for the **Lanes** sidebar.
- `webview/` — the multi-lane UI (add tasks, live per-lane stream, diff + merge/discard).
- `media/` — icons (`swarm.svg`).

All real work lives in [`../src/core`](../src/core) (orchestrator, isolation, runners);
this layer is a thin host that renders lanes and forwards user actions to the core.
