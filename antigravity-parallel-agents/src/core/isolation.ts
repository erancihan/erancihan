/**
 * Per-lane isolation: every parallel chat lane gets its own sandbox so agents never
 * touch each other's files or the user's working tree.
 *
 *   full isolation = git worktree (files + branch)  ⨯  OS sandbox (process/network/host)
 *
 * Both halves are pluggable so we can degrade gracefully (e.g. worktree-only on a host
 * without nsjail) and unit-test the orchestrator with fakes. See docs/PLAN.md §3.3 / §6.
 */

import type { LaneIsolation } from './types.js';

export interface IsolationRequest {
  laneId: string;
  /** Repo root the worktree branches from. */
  repoRoot: string;
  /** Base ref to branch the lane from (default: current HEAD). */
  baseRef?: string;
}

/** Manages git worktrees — one per lane (`git worktree add … -b swarm/<laneId>`). */
export interface WorktreeProvider {
  create(req: IsolationRequest): Promise<{ worktree: string; branch: string }>;
  /** Remove the worktree; `keepBranch` to preserve work for merge-back. */
  remove(worktree: string, opts?: { keepBranch?: boolean }): Promise<void>;
}

/**
 * Wraps a command so it runs inside an OS sandbox.
 * Linux → nsjail; Windows → AppContainer; otherwise `'none'` (with a loud warning).
 */
export interface SandboxProvider {
  readonly kind: LaneIsolation['sandbox'];
  /** Rewrite (argv) into the sandboxed equivalent, confined to `cwd`. */
  wrap(cmd: string, args: string[], cwd: string): { cmd: string; args: string[] };
}

/** Composes worktree ⨯ sandbox into a single per-lane isolation context. */
export class IsolationProvider {
  constructor(
    private readonly worktrees: WorktreeProvider,
    private readonly sandbox: SandboxProvider,
  ) {}

  async acquire(req: IsolationRequest): Promise<LaneIsolation> {
    const { worktree, branch } = await this.worktrees.create(req);
    return { worktree, branch, sandbox: this.sandbox.kind };
  }

  async release(iso: LaneIsolation, opts?: { keepBranch?: boolean }): Promise<void> {
    await this.worktrees.remove(iso.worktree, opts);
  }

  /** Sandbox-wrap a command to run inside a lane's worktree. */
  confine(iso: LaneIsolation, cmd: string, args: string[]) {
    return this.sandbox.wrap(cmd, args, iso.worktree);
  }
}
