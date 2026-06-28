/**
 * A LaneRunner drives a single agent to completion inside an already-isolated lane.
 *
 * Two backends sit behind this interface (docs/PLAN.md §1.4):
 *   - CliLaneRunner            — local Antigravity CLI agent in the lane's worktree,
 *                                wrapped by the OS sandbox (default; "baked into the IDE").
 *   - ManagedAgentsLaneRunner  — Gemini Managed Agents API; each lane = a remote
 *                                Google-hosted sandbox (see client.ts).
 *
 * The orchestrator depends only on this interface, so it stays testable with a fake.
 */

import type { LaneIsolation, LaneResult } from './types.js';

export interface RunnerInput {
  prompt: string;
  isolation: LaneIsolation;
  agentsMd?: string;
  skills?: Array<{ name: string; body: string }>;
  signal?: AbortSignal;
}

export interface RunnerUpdate {
  lastAction?: string;
  chunk?: string;
  done: boolean;
  result?: LaneResult;
}

export interface LaneRunner {
  /** Stream updates until the agent finishes (or is aborted). */
  run(input: RunnerInput): AsyncIterable<RunnerUpdate>;
}

/**
 * Local runner — Phase 2. Spawns the Antigravity CLI agent headlessly in the lane's
 * worktree, sandbox-wrapped. The exact CLI invocation is still to be confirmed
 * (docs/PLAN.md §6 Q2); left unimplemented so the build stays green.
 */
export class CliLaneRunner implements LaneRunner {
  constructor(private readonly cliPath: string = 'antigravity') {}

  run(_input: RunnerInput): AsyncIterable<RunnerUpdate> {
    throw new Error('CliLaneRunner.run not implemented yet — see docs/PLAN.md Phase 2');
  }
}
