# Swarm — Investigation & Implementation Plan

_Last updated: 2026-06-28_

**Goal:** bake **parallel, fully-isolated chats into the Antigravity IDE**. The native
chat is serial; Swarm turns each chat into a **lane** running in its own **sandbox**
(git worktree + OS sandbox) so many agents work at once without colliding.

---

## 1. Investigation

### 1.1 Antigravity already ships the isolation primitives

This reframes the project: we **compose** native building blocks rather than invent them.

- **Worktree Mode.** Antigravity can create a **new git worktree per conversation**
  ("best for complex tasks, keeps your active working folder untouched"). The 2.0 desktop
  app ships **auto-provisioned git worktrees for subagents**, so parallel agents become
  "a graph of independent file states that merge cleanly at the end."
- **OS sandbox layer.** The Antigravity **CLI** has a native OS sandbox: **nsjail**
  namespace isolation on Linux, **AppContainer** on Windows (see `docs/sandbox-mode`).
- **Manager View.** Dispatches **up to ~5 parallel agents** across workspaces — GUI-driven.
- **Built-in chat.** A chat sidebar (Gemini 3.1 default; Claude/GPT alternatives).
- **Plugins** install **skills**; the IDE is a VS Code fork, so most VS Code extensions
  work (those conflicting with the agent layer are disabled/warned).

### 1.2 The actual gap

The pieces exist but aren't wired into the *everyday chat* experience:

- The **built-in chat is serial** — one active conversation; you can't fan a backlog into
  many concurrent isolated chats.
- Parallelism lives in the Manager View (capped, GUI-only), **not** in chat.
- Worktree/sandbox are **opt-in modes**, not "every chat, always isolated, by default."

> **Swarm = parallel chat lanes, each isolated by default, baked into the IDE.**

### 1.3 The extension surface (how we bake it in)

Antigravity is a VS Code fork, so we use the standard, documented hooks:

- **Chat Participant API** (`vscode.chat.createChatParticipant`): register `@swarm` with
  slash commands (`/fork`, `/run`, `/lanes`). Lets a user spin a sandboxed lane from the
  native chat. _Caveat:_ a participant handler is request/response within the native chat
  view — good for entry points, **not** for showing N live lanes at once.
- **Custom webview sidebar** (`viewsContainers` + `registerWebviewViewProvider`): the
  **Lanes panel** — full control to render many concurrent lanes, stream each, show
  per-lane diffs, and offer merge/discard. **This is the primary parallel UI.**
- Distribution: `.vsix` → **OpenVSX** → install via the Antigravity CLI
  (`<antigravity-cli> --install-extension`). Prior art (the "Antigravity Automation"
  OpenVSX extension with REST/WS control) shows externally driving chats is accepted.

### 1.4 The per-lane execution engine

Each lane needs an agent doing the work inside its isolation context. Two backends, behind
one interface (`LaneRunner`):

1. **Local — Antigravity CLI agent (default).** Spawn a headless agent in the lane's
   **worktree**, wrapped in the CLI's **nsjail/AppContainer sandbox**. Matches "baked into
   the IDE," uses the IDE's own models/credentials, keeps everything local.
2. **Cloud — Gemini Managed Agents API** (`POST /v1beta/interactions`, agent
   `antigravity-preview-05-2026`, `environment: remote`). Each lane gets a Google-hosted
   sandbox; strongest isolation, no local resource pressure, but remote (needs git
   source/sink to touch your repo).

Default to local; offer cloud as an isolation/scale option.

---

## 2. Intent (problem statement)

> As an Antigravity user I want my chats to run in parallel, each in its own sandbox, so I
> can hand several independent tasks to several agents at once, watch them all from inside
> the IDE, and merge each one's work back cleanly — with zero risk of agents clobbering my
> working tree or each other.

Non-goals (v1):
- Re-implementing the agent runtime, sandbox, or worktree mechanics (we drive the native
  ones).
- Cross-lane coordination / dependency graphs (lanes are independent).
- Automatic conflict resolution between lanes (isolation prevents conflicts; merge-back is
  user-reviewed).

---

## 3. Architecture

Three layers; the **isolation + orchestration core is the product**, the extension is the
surface that makes it feel native.

### 3.1 `@swarm/core` (headless TypeScript engine)

- **Orchestrator** — batch of tasks → lanes with a **concurrency cap** (worker pool) →
  per-lane state machine → typed event stream (`lane:update`, `lane:output`, `run:done`).
- **IsolationProvider** — per-lane sandbox lifecycle:
  - `WorktreeProvider`: `git worktree add .swarm/lanes/<id> -b swarm/<id>` from the base
    ref; tears down + prunes on completion.
  - `SandboxProvider`: wraps lane commands in nsjail (Linux) / AppContainer (Windows);
    no-op fallback with a loud warning if unavailable.
  - Composed: **worktree ⨯ sandbox = full isolation** per lane.
- **LaneRunner** (interface) — drives one agent to completion inside a lane:
  `CliLaneRunner` (local Antigravity CLI) and `ManagedAgentsLaneRunner` (cloud API).
- **Merge-back** — each lane is a branch; core surfaces the diff and supports
  merge/rebase/discard. Aggregated run report at the end.
- **Resilience** — retries/backoff; a run **journal** in `.swarm/` so a crashed IDE can
  resume lanes (worktrees + environment handles are persisted).
- **Budget/limits** — concurrency cap + optional cost ceiling with visible token/cost.

Key types: see `src/core/types.ts` (`Lane`, `Task`, `RunOptions`, `SwarmEvent`),
`src/core/isolation.ts` (`IsolationProvider`), `src/core/runner.ts` (`LaneRunner`).

### 3.2 Extension (`extension/`)

- **Lanes panel** (webview sidebar): add tasks, set concurrency, start/stop, live per-lane
  stream, per-lane diff + merge/discard buttons. Subscribes to the core event stream.
- **`@swarm` chat participant**: `/fork` (turn the current chat into a sandboxed lane),
  `/run <task>` (new lane), `/lanes` (open panel).
- **Commands**: `Swarm: New Run`, `Swarm: Add Lane`, `Swarm: Open Lanes Panel`,
  `Swarm: Merge Lane`, `Swarm: Discard Lane`.
- Runs `@swarm/core` in the extension host; webview ↔ host over the message channel.

### 3.3 Isolation model (the heart of the request)

```
base repo (clean, untouched)
   │  git worktree add  (per lane)
   ├── .swarm/lanes/lane-1  ── branch swarm/lane-1 ── nsjail/AppContainer ── agent
   ├── .swarm/lanes/lane-2  ── branch swarm/lane-2 ── nsjail/AppContainer ── agent
   └── .swarm/lanes/lane-3  ── branch swarm/lane-3 ── nsjail/AppContainer ── agent
                                            review diff ▶ merge / discard ▶ base repo
```

Every lane: separate **files** (worktree), separate **process/network/host** (sandbox),
separate **history** (branch). Nothing shared, nothing to collide.

---

## 4. Tech stack

- **TypeScript / Node ≥ 20** — one codebase for core + extension.
- **Extension:** `@types/vscode`, `esbuild` bundle, `@vscode/vsce` + `ovsx` to publish.
- **Isolation:** `git worktree` (via `simple-git` or raw `git`), nsjail/AppContainer via
  the Antigravity CLI; `child_process` for spawning.
- **Webview UI:** lightweight (preact/lit or plain TS) — keep the bundle small.
- **Tests:** `vitest`; `LaneRunner` and `IsolationProvider` are interfaces, so the
  orchestrator (concurrency, state machine, merge-back) is testable with fakes offline.

---

## 5. Phased roadmap

| Phase | Goal | Exit criteria |
|------:|------|---------------|
| **0** | Scaffold + plan | repo builds, types compile (✅) |
| **1** | Isolation core | `WorktreeProvider` + `SandboxProvider` create/tear down a real isolated lane (✅ — `GitWorktreeProvider`, nsjail/AppContainer/no-op `SandboxProvider`, `IsolationProvider` composer, 6 passing tests) |
| **2** | Lane runner | `CliLaneRunner` runs one agent to completion inside a lane; streamed updates _(blocked on confirming the Antigravity CLI headless invocation; interface + fake runner done)_ |
| **3** | Parallel orchestrator | ✅ N lanes, concurrency cap, lane state machine, typed event stream, per-lane failure isolation, cost budget, merge-back branch retention, **crash journal + resume** (`FileJournalStore`/`MemoryJournalStore`, stale-worktree recovery). 12 passing tests total |
| **4** | Lanes panel | 🟢 webview `LanesViewProvider` renders live lanes + per-lane output, subscribes to the event stream, starts a run from the IDE. Extension typechecks + bundles (esbuild → CJS). Pending: run inside Antigravity |
| **5** | Merge-back | ✅ core `mergeLane`/`laneDiff`/`discardLane` — merge (no-ff/ff-only/squash), conflict detection + clean abort, diff, branch delete; wired into the panel's merge/discard handlers (3 passing tests) |
| **6** | Chat participant | 🟢 `@swarm` participant + `/lanes`, launches lanes from native chat (`extension.ts`). Pending: `/fork` of the current chat |
| **7** | Cloud runner + polish | `ManagedAgentsLaneRunner`, cost/budget UI, OpenVSX publish, release |

Each phase is shippable; Phases 1–3 deliver the engine, 4–6 make it native, 7 scales it.

---

## 6. Risks & open questions

1. **Can an extension reach the native chat runtime?** No documented hook into the
   built-in agent. _Decision:_ we don't try — lanes run via the **Antigravity CLI** or
   **Managed Agents API**, presented in our own panel/participant. The native chat is an
   entry point, not the engine.
2. **Antigravity CLI surface for headless agents.** Need to confirm the exact CLI command
   to run an agent non-interactively against a directory, capture streamed output, and how
   to invoke its sandbox per process. (`docs/sandbox-mode` + CLI reference.)
3. **Worktree mechanics in a fork.** Confirm whether to reuse Antigravity's "Worktree
   Mode" programmatically or manage `git worktree` ourselves (likely the latter for
   control). Handle submodules, untracked files, LFS, and base-ref selection.
4. **Sandbox availability.** nsjail needs Linux + privileges; macOS lacks nsjail
   (sandbox-exec? container?). _Decision:_ `SandboxProvider` is pluggable; degrade to
   worktree-only with a visible warning where OS sandboxing isn't available.
5. **Resource cost of N local sandboxes.** Each lane = a process tree + worktree (disk).
   Concurrency cap + disk/cleanup are first-class; offer the cloud runner to offload.
6. **Managed Agents API schema** (for the cloud runner) — inline `AGENTS.md`/skills shape,
   streaming, result/diff format — still to confirm against live docs.
7. **Merge conflicts at merge-back.** Lanes are isolated during work, but two lanes
   touching the same files still conflict *when merging*. v1: surface conflicts, let the
   user resolve (or hand a follow-up lane the conflict). No auto-merge of overlaps.

---

## 7. Immediate next steps (Phase 1)

1. Implement `WorktreeProvider` (`git worktree add/remove/prune`, branch per lane) with
   tests against a temp repo.
2. Implement `SandboxProvider` for Linux/nsjail; confirm the Antigravity CLI sandbox
   invocation; add the no-op fallback + warning.
3. Wire `IsolationProvider = worktree ⨯ sandbox`; create + destroy one real lane end to
   end and assert the base working tree is untouched.

## Sources

- Build with Google Antigravity — https://developers.googleblog.com/build-with-google-antigravity-our-new-agentic-development-platform/
- Running multiple agents on one repo — worktree isolation — https://antigravitylab.net/en/articles/agents/antigravity-worktree-parallel-agent-isolation-design
- Antigravity CLI: sandbox, plugins, subagents — https://www.explainx.ai/blog/antigravity-cli-features-sandbox-plugins-subagents-2026
- Antigravity sandbox mode docs — https://antigravity.google/docs/sandbox-mode
- Agent Manager docs — https://antigravity.google/docs/agent-manager
- Antigravity 2.0 (4-surface) overview — https://mcp.directory/blog/antigravity-2-launch-google-io-2026
- VS Code Chat Participant API — https://code.visualstudio.com/api/extension-guides/ai/chat
- VS Code Webview API — https://code.visualstudio.com/api/extension-guides/webview
- Antigravity Agent API (Gemini Managed Agents) — https://ai.google.dev/gemini-api/docs/antigravity-agent
- Antigravity Automation (OpenVSX) — https://open-vsx.org/extension/joecodecreations/antigravity-automation
