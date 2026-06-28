# Swarm — Investigation & Implementation Plan

_Last updated: 2026-06-28_

This document captures (1) what we learned about Google Antigravity and its plugin/API
surfaces, (2) the precise intent behind "a plugin to run multiple agent chats in
parallel," and (3) a phased plan to build it.

---

## 1. Investigation

### 1.1 What Google Antigravity actually is

- An **agent-first development platform**. As of the 2.0 launch it's an ecosystem, not
  just one app:
  - **Antigravity IDE** — a **fork of open-source VS Code** whose UX is reorganized
    around managing agents rather than editing text. Ships with the **Agent Manager**,
    **Artifacts**, and codebase understanding.
  - **Antigravity (standalone app)** — macOS/Linux/Windows "command center" to manage
    multiple **local** agents in parallel and run scheduled tasks.
- **Agent Manager** is the higher-level view: multiple **workspaces**, multiple agents
  running **asynchronously/in parallel**, ideally **one agent per workspace** to avoid
  conflicts (multiple agents per workspace is possible but conflict-prone).
- **Artifacts** are tangible deliverables agents produce (task lists, plans, screenshots,
  browser recordings) that you can comment on inline; the agent incorporates feedback
  without stopping.

**Takeaway:** parallel agents already exist natively. Our value is *orchestration &
batch management on top*, not re-implementing the runtime.

### 1.2 The two programmable surfaces

There are two distinct ways a "plugin" could plug in. We evaluated both.

#### A. The Antigravity Agent API (Gemini **Managed Agents**) — _our foundation_

- The Antigravity agent is exposed as a **general-purpose managed agent on the Gemini
  API**. One API call returns an agent that reasons, executes code, manages files, and
  browses the web inside **its own secure Linux sandbox hosted by Google**.
- **Endpoint:** `POST https://generativelanguage.googleapis.com/v1beta/interactions`
  - Headers: `Content-Type: application/json`, `x-goog-api-key: <API_KEY>`
  - Body (minimal):
    ```json
    {
      "agent": "antigravity-preview-05-2026",
      "input": [{ "type": "text", "text": "Your task here" }],
      "environment": "remote"
    }
    ```
- **Sessions are resumable.** Each interaction creates/receives an **environment**;
  pass that environment handle back on follow-up calls to resume with files + state
  intact. Files persist across interactions in the sandbox.
- **Customization is filesystem-native:** mount `AGENTS.md` (instructions) and skills
  under `.agents/skills/`, or pass them **inline** at interaction time via the
  `environment` parameter (inline sources). You can iterate inline, then "save as" a
  managed agent.

  > ⚠️ Exact field names/shapes (input parts, environment inline-source schema,
  > streaming vs. polling, how a result/diff/artifact is returned) must be confirmed
  > against the live docs at build time — see Open Questions. Treat the snippet above as
  > directionally correct, not final.

- **Why this is the right substrate:** it is headless, scriptable, gives true sandbox
  isolation per agent (one sandbox per task = the "one agent per workspace" guidance,
  enforced), and is testable without the GUI.

#### B. The Antigravity IDE extension surface (VS Code fork)

- Antigravity is a VS Code fork, so **most VS Code extensions work out of the box**;
  exceptions are extensions that conflict with the agent layer (disabled/warned).
- Extension distribution uses the **OpenVSX** registry by default (not the MS
  Marketplace). You can install via Antigravity's bundled CLI
  (`<antigravity-cli> --install-extension <id|path.vsix>`), or repoint Settings →
  Antigravity Settings → Editor at the VS Code Marketplace, or sideload `.vsix`.
- Prior art exists: the **"Antigravity Automation"** extension on OpenVSX exposes a
  **REST API + WebSocket** to start chats and pull data, plus a webview UI — proof that
  externally orchestrating Antigravity chats is a viable, accepted pattern.
- **Limitation:** the standard VS Code extension API does **not** give us a documented
  hook into the native Agent Manager's agent runtime. So an extension can provide UI and
  can drive agents — but the *engine* underneath should be the Agent API (A), not a
  reverse-engineered private API.

### 1.3 The confirmed user need

Community feature request: **"Conversation Management & Multi-Agent Workspace Lanes."**
Users want better management of many simultaneous agent conversations — lanes, batch
control, overview — which the native single-conversation flow doesn't provide well.
This is precisely what Swarm targets.

---

## 2. Intent (problem statement)

> As a developer using Antigravity, I have a backlog of independent tasks. I want to
> launch them all as parallel agents from one place, control how many run at once, give
> them a shared playbook (`AGENTS.md` + skills), watch their progress in a single view,
> and collect their deliverables when done — without babysitting each chat in the GUI.

Non-goals (v1):
- Re-implementing Antigravity's agent runtime or sandbox.
- Cross-agent coordination / dependency graphs (agents are independent in v1).
- Merging/conflict-resolution of overlapping edits (we enforce isolation instead).

---

## 3. Architecture

Three layers (see README diagram). The **core engine is the product**; CLI and
extension are thin surfaces over it.

### 3.1 `@swarm/core` (headless TypeScript library)

Responsibilities:
- **Client**: typed wrapper over the Interactions API (create, resume, stream/poll,
  cancel). Auth via `GEMINI_API_KEY`/`x-goog-api-key`.
- **Orchestrator**: takes a batch of tasks → spawns interactions with a **concurrency
  limit** (queue + worker pool) → tracks each as a **Lane** (state machine).
- **Lane state machine**: `queued → starting → running → (awaiting-input) → done | failed | cancelled`.
- **Shared config injection**: apply one `AGENTS.md` + skill set to every lane (inline
  source) so the whole swarm follows the same playbook.
- **Resilience**: retries with backoff on transient/network errors; idempotent resume
  via stored environment handles; persistent run journal so a crashed run can resume.
- **Aggregation**: collect per-lane outputs (final text, diffs/patches, artifacts) into
  a single run report.
- **Events**: emit a typed event stream (`lane:update`, `lane:output`, `run:done`) that
  any surface subscribes to — this is what keeps CLI and extension in sync.

Key types (sketch — see `src/core/types.ts`):
```ts
type LaneStatus = 'queued'|'starting'|'running'|'awaiting-input'|'done'|'failed'|'cancelled';
interface Task { id: string; prompt: string; agentsMd?: string; skills?: Skill[]; }
interface Lane { id: string; task: Task; status: LaneStatus; environment?: string; ... }
interface RunOptions { concurrency: number; agentsMd?: string; skills?: Skill[]; }
```

### 3.2 CLI + TUI (`swarm`)

- `swarm run <tasks.yaml> [--concurrency N] [--agents-md path] [--json]`
- `swarm ls` / `swarm logs <laneId>` / `swarm resume <runId>` / `swarm cancel <runId|laneId>`
- Live **TUI dashboard**: one row per lane (status, elapsed, last action, token/cost),
  driven by the core event stream. `--json` for CI/non-interactive use.

### 3.3 Antigravity / VS Code extension (`extension/`)

- A **webview panel** showing parallel **lanes** (the UX the feature request asked for):
  add tasks, set concurrency, start/stop, watch streamed output per lane, open
  deliverables.
- Uses `@swarm/core` directly in the extension host; webview ↔ host over the standard
  message channel.
- Packaged as `.vsix`; published to **OpenVSX**; installable via the Antigravity CLI.
- Commands contributed: `Swarm: New Run`, `Swarm: Add Task`, `Swarm: Open Dashboard`.

---

## 4. Tech stack

- **Language:** TypeScript (Node ≥ 20) — matches the VS Code/Antigravity extension model
  and keeps one codebase across core/CLI/extension.
- **Packaging:** pnpm workspaces — `packages/core`, `packages/cli`, `packages/extension`
  (current scaffold uses a single package; promote to a monorepo at Phase 3).
- **HTTP:** native `fetch` (Node 20+); thin retry wrapper.
- **CLI/TUI:** `commander` + `ink` (or `blessed`) for the dashboard; `yaml` for task files.
- **Extension:** `@types/vscode`, `esbuild` bundle, `@vscode/vsce`/`ovsx` to publish.
- **Tests:** `vitest`; the API client is mocked behind an interface so the orchestrator,
  concurrency, retry, and resume logic are all testable offline.

---

## 5. Phased roadmap

| Phase | Goal | Deliverable | Exit criteria |
|------:|------|-------------|---------------|
| **0** | Scaffold | folder, README, this plan, package skeleton | repo builds, types compile |
| **1** | Single-agent round-trip | `core` client: create interaction → get result | one task runs end-to-end against the live API |
| **2** | Parallel engine | orchestrator: fan-out, concurrency cap, lane state machine, resume, event stream | N tasks run with `--concurrency`, survive a restart |
| **3** | CLI + TUI | `swarm run` + live dashboard + `--json` | batch from `tasks.yaml` with live monitoring |
| **4** | Extension | webview lanes UI over `core`; `.vsix` | installs in Antigravity, runs a batch from the panel |
| **5** | Playbooks + aggregation | shared `AGENTS.md`/skills, run report, artifact collection | one playbook applied to all lanes; consolidated report |
| **6** | Polish | docs, cost/token display, error UX, OpenVSX publish | published extension + tagged release |

Each phase is independently shippable; Phase 1–2 deliver value via CLI before the
extension exists.

---

## 6. Risks & open questions

1. **API availability & access.** "antigravity-preview-05-2026" is preview; confirm the
   account has access, quotas, and pricing. _Mitigation:_ core hides the client behind an
   interface + a fake/record-replay client so all higher layers develop offline.
2. **Exact API schema.** Field names for `input` parts, the **inline `environment`
   source** shape (how `AGENTS.md`/skills are passed), and **streaming vs. polling** must
   be verified against live docs/SDK before Phase 1. The README JSON is directional.
3. **How results/diffs/artifacts come back.** Need to confirm whether the sandbox returns
   a patch, a file tree, or artifact handles — drives the aggregation design (Phase 5).
4. **Remote sandbox ≠ local repo.** Remote agents work in Google-hosted sandboxes. For
   "operate on *my* repo" we need to clone/push (git URL + token) or use local-environment
   mode if/when available. _Decision for v1:_ document remote-first; support a git
   source/sink for real-repo workflows.
5. **Extension ↔ native Agent Manager.** No documented hook into the native runtime; we
   intentionally drive the **API**, not the GUI. (The "Antigravity Automation" REST/WS
   approach is a possible fallback for GUI-driving if a use case demands it.)
6. **Cost.** Parallel sandboxed agents can get expensive fast — concurrency caps,
   per-run budget limits, and visible token/cost accounting are first-class, not optional.

---

## 7. Immediate next steps (Phase 0 → 1)

1. Verify Gemini Managed Agents API access + read the live `interactions` reference;
   lock down the request/response schema (resolves Q2/Q3).
2. Implement `src/core/client.ts` against that schema behind the `AgentClient` interface.
3. Add a record/replay fake client + a single integration test that runs one task.
4. Build the orchestrator (concurrency + lanes) with unit tests on the fake client.

## Sources

- Build with Google Antigravity — https://developers.googleblog.com/build-with-google-antigravity-our-new-agentic-development-platform/
- Antigravity Agent (Gemini API) — https://ai.google.dev/gemini-api/docs/antigravity-agent
- Managed Agents quickstart / building — https://ai.google.dev/gemini-api/docs/managed-agents-quickstart · https://ai.google.dev/gemini-api/docs/custom-agents
- Introducing Managed Agents in the Gemini API — https://blog.google/innovation-and-ai/technology/developers-tools/managed-agents-gemini-api/
- Agent Manager docs — https://antigravity.google/docs/agent-manager
- Parallel agents in Antigravity (Mete Atamel) — https://medium.com/google-cloud/parallel-agents-in-antigravity-64237120161d
- Feature request: Multi-Agent Workspace Lanes — https://discuss.ai.google.dev/t/feature-request-conversation-management-multi-agent-workspace-lanes/127212
- Installing VS Code Marketplace extensions in Antigravity — https://medium.com/@agurindapalli/how-to-install-vs-code-marketplace-extensions-in-googles-antigravity-ide-example-deepblue-theme-689cdcd735eb
- Antigravity Automation (OpenVSX) — https://open-vsx.org/extension/joecodecreations/antigravity-automation
