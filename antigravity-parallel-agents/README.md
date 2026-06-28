# Antigravity Parallel Agents (codename: **Swarm**)

> A plugin/toolkit for [Google Antigravity](https://antigravity.google/) that lets you
> **fan out a batch of tasks across many agent conversations at once**, watch them run
> in parallel, and collect the results — instead of driving each chat by hand in the GUI.

**Status:** 🟡 Greenfield — investigation done, implementation planned. See
[`docs/PLAN.md`](docs/PLAN.md) for the full design and roadmap.

---

## Why this exists (the intent)

Antigravity is an agent-first IDE (a VS Code fork) whose **Agent Manager** can already
show several agents working in parallel across workspaces. So why a plugin?

Because the native experience is **GUI-bound and one-at-a-time to set up**: you open a
conversation, type a task, open another, type another. There is no first-class way to:

- take a *list* of N tasks and spawn N agents in one shot,
- cap concurrency / queue work,
- apply a shared system prompt (`AGENTS.md`) and skills to every agent,
- monitor all lanes from one compact dashboard, and
- aggregate the deliverables (diffs, artifacts, summaries) when they finish.

This is exactly the gap the community has been asking for (see the
"Multi-Agent Workspace Lanes" feature request linked in the plan). **Swarm** fills it.

## How it's buildable

Google now exposes the **Antigravity Agent** through the Gemini **Managed Agents API**
(`POST https://generativelanguage.googleapis.com/v1beta/interactions`). One call gives you
a fully managed agent that reasons, runs code, edits files, and browses — inside its own
remote Linux sandbox. Sessions are resumable, and you can mount `AGENTS.md` + skills.

That API is the programmable substrate. Swarm is an **orchestration layer** on top of it:

```
                ┌───────────────────────────────────────────┐
                │   Surfaces                                  │
                │   • CLI + live TUI dashboard                │
                │   • Antigravity / VS Code extension (lanes) │
                └───────────────────────┬─────────────────────┘
                                        │ uses
                ┌───────────────────────▼─────────────────────┐
                │   @swarm/core  (headless engine)             │
                │   fan-out · concurrency · session resume ·   │
                │   streaming · retries · result aggregation   │
                └───────────────────────┬─────────────────────┘
                                        │ wraps
                ┌───────────────────────▼─────────────────────┐
                │   Antigravity Agent API (Gemini Managed      │
                │   Agents) — /v1beta/interactions, sandboxes  │
                └──────────────────────────────────────────────┘
```

## Repo layout (planned)

| Path | What |
|------|------|
| `src/core/` | Headless orchestration engine (the real product) |
| `src/cli/`  | `swarm` command-line + TUI dashboard |
| `extension/`| Antigravity/VS Code extension (webview "lanes" UI) |
| `docs/`     | Investigation + implementation plan |

## Quick taste (target UX)

```bash
# tasks.yaml lists prompts; each becomes its own parallel agent
swarm run tasks.yaml --concurrency 4 --agents-md ./AGENTS.md
```

```yaml
# tasks.yaml
concurrency: 4
tasks:
  - "Add pagination to the /users endpoint and write tests"
  - "Migrate the build from webpack to vite"
  - "Audit the repo for unhandled promise rejections"
```

See [`docs/PLAN.md`](docs/PLAN.md) for the phased build plan and open questions.
