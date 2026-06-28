/**
 * Core domain types for Swarm.
 *
 * These describe the orchestration layer and are intentionally decoupled from the exact
 * wire format of the Antigravity Agent API (see `client.ts`). The wire schema is still
 * being confirmed against the live Gemini Managed Agents docs (see docs/PLAN.md §6 Q2),
 * so the orchestrator talks to the abstract `AgentClient` interface, not raw HTTP.
 */

/** Lifecycle of a single parallel agent conversation ("lane"). */
export type LaneStatus =
  | 'queued'
  | 'starting'
  | 'running'
  | 'awaiting-input'
  | 'done'
  | 'failed'
  | 'cancelled';

/** A skill mounted into the agent sandbox under `.agents/skills/<name>/SKILL.md`. */
export interface Skill {
  name: string;
  /** Contents of SKILL.md (and, later, supporting files). */
  body: string;
}

/** One unit of work that becomes one parallel agent. */
export interface Task {
  id: string;
  prompt: string;
  /** Optional per-task override of the shared playbook. */
  agentsMd?: string;
  skills?: Skill[];
}

/** A running (or finished) agent conversation, bound to its own sandbox. */
export interface Lane {
  id: string;
  task: Task;
  status: LaneStatus;
  /** Isolation context for this lane (worktree + sandbox). */
  isolation?: LaneIsolation;
  /** Opaque environment/session handle (cloud runner); used to resume. */
  environment?: string;
  startedAt?: number;
  endedAt?: number;
  /** Latest human-readable status line (last action the agent took). */
  lastAction?: string;
  /** Final aggregated output once status is `done`. */
  result?: LaneResult;
  error?: string;
}

/** Where a lane's isolated work lives. */
export interface LaneIsolation {
  /** Absolute path to the lane's git worktree. */
  worktree: string;
  /** Branch created for this lane (e.g. `swarm/lane-3`). */
  branch: string;
  /** Sandbox backend actually applied to this lane's processes. */
  sandbox: 'nsjail' | 'appcontainer' | 'none';
}

/** What a finished lane produced. Shape will firm up once we confirm how the */
/** sandbox returns diffs/artifacts (docs/PLAN.md §6 Q3). */
export interface LaneResult {
  text?: string;
  /** Unified diff / patch if the agent edited files. */
  patch?: string;
  /** Artifact handles (task lists, screenshots, recordings, …). */
  artifacts?: Array<{ kind: string; ref: string }>;
  usage?: { inputTokens?: number; outputTokens?: number; costUsd?: number };
}

/** Options for a whole fan-out run. */
export interface RunOptions {
  /** Stable id for this run (for journaling/resume); generated if omitted. */
  runId?: string;
  /** Max lanes running at once. */
  concurrency: number;
  /** Shared playbook applied to every lane unless the task overrides it. */
  agentsMd?: string;
  skills?: Skill[];
  /** Abort the run if cumulative cost exceeds this (USD). */
  budgetUsd?: number;
}

/** Typed events emitted by the orchestrator; every surface subscribes to these. */
export type SwarmEvent =
  | { type: 'run:start'; runId: string; lanes: number }
  | { type: 'lane:update'; lane: Lane }
  | { type: 'lane:output'; laneId: string; chunk: string }
  | { type: 'run:done'; runId: string; lanes: Lane[] };
