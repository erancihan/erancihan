# Antigravity Parallel Agents (codename: **Swarm**)

> An **Antigravity IDE extension** that makes the built-in chats run **in parallel** —
> with **every chat pinned to its own sandbox** (git worktree + OS sandbox) for full
> isolation, so agents never step on each other or your working tree.

**Status:** 🟢 **MVP reached.** The end-to-end loop runs today via the `swarm` CLI; the
Antigravity extension compiles and bundles for in-IDE use. 21 passing tests. Going live
with AI agents is a one-line config change (point `swarm.command` at an agent CLI). See
[`docs/PLAN.md`](docs/PLAN.md) for the full design and roadmap.

## Run it today (CLI)

```bash
npm install && npm run build

# Fan three tasks into parallel, isolated lanes. Each runs your agent command
# (`--command`/`--arg`) inside its own git worktree, then commits its work.
swarm run "add tests for auth" "fix the lint errors" "write the changelog" \
  --concurrency 2 \
  --command antigravity --arg agent --arg run \
  --arg --cwd --arg '${worktree}' --arg --prompt --arg '${prompt}'

swarm merge lane-1 --delete    # review each lane's branch, then merge clean
swarm resume <runId>           # pick up a crashed run where it left off
```

`${worktree}`, `${prompt}`, and `${agentsMdPath}` are substituted per lane. Any agent CLI
works — the Antigravity CLI is just the default.

---

## The problem

Antigravity's built-in **chat** is serial: one active conversation at a time. The
**Manager View** can dispatch a handful of parallel agents, but the everyday chat
experience can't fan a backlog of tasks into many concurrent, isolated conversations.

And when you *do* run multiple agents on one repo, they collide — two agents editing the
same files corrupt each other's work.

## The idea

Bake parallel, sandboxed chats **into the IDE**. Each chat becomes a **lane**, and each
lane runs in **full isolation**:

- **File isolation** → its own **git worktree** (separate working dir + branch).
- **Process/host isolation** → its own **OS sandbox** (nsjail on Linux, AppContainer on
  Windows — the same layer Antigravity's CLI already uses).

Run as many lanes as you want, watch them all in one panel, then review each lane's diff
and **merge clean** — because every lane was a separate branch the whole time.

## What's native vs. what Swarm adds

Antigravity already ships the building blocks; Swarm composes them into a parallel chat UX.

| Capability | Native Antigravity | Swarm adds |
|---|---|---|
| Worktree per conversation | ✅ "Worktree Mode" / auto-worktree for subagents | Automatic worktree **per chat lane**, lifecycle-managed |
| OS sandbox | ✅ nsjail / AppContainer via CLI | Wraps **every lane** in a sandbox by default |
| Parallel agents | ⚠️ Manager View, ~5, GUI-driven | **N parallel chat lanes** from one panel, batch fan-out |
| Built-in chat | ❌ serial, single conversation | Many concurrent, isolated chats inside the IDE |

## How it plugs in

Antigravity is a VS Code fork, so the extension uses the standard hooks:

- **Chat Participant API** — a `@swarm` participant + slash commands (`/fork`, `/run`) so
  you can spin a sandboxed lane straight from the native chat.
- **Custom webview sidebar** (`viewsContainers` + `registerWebviewViewProvider`) — the
  **Lanes panel**: add tasks, set concurrency, watch streamed output per lane, review
  diffs, merge/discard.
- Packaged as a `.vsix`, published to **OpenVSX**, installed via the Antigravity CLI.

```
┌──────────────────────────────────────────────────────────────┐
│  Antigravity IDE                                               │
│  ┌───────────────┐   ┌──────────────────────────────────────┐ │
│  │ native chat   │   │  Swarm — Lanes panel (webview)        │ │
│  │  @swarm /fork │──▶│  lane#1  lane#2  lane#3   [+ add]      │ │
│  └───────────────┘   └───────────────────┬──────────────────┘ │
│                                          │ @swarm/core         │
│                          ┌───────────────▼─────────────────┐  │
│                          │ Orchestrator: fan-out, concurrency│  │
│                          └───────────────┬─────────────────┘  │
│              per lane ┌───────────────────▼──────────────────┐ │
│                       │ Isolation: git worktree + OS sandbox │ │
│                       │ Runner: Antigravity CLI agent (local)│ │
│                       │         or Managed Agents API (cloud)│ │
│                       └──────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

## Repo layout (planned)

| Path | What |
|------|------|
| `extension/` | Antigravity/VS Code extension: chat participant + Lanes panel |
| `src/core/`  | Headless engine: orchestrator, isolation, lane runners |
| `docs/`      | Investigation + implementation plan |

See [`docs/PLAN.md`](docs/PLAN.md) for the phased build plan and open questions.
