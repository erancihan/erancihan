/**
 * Convenience wiring: build an IsolationProvider from the real worktree provider and the
 * best OS sandbox available on this host. Kept separate from isolation.ts so that module
 * stays free of concrete imports (and free of import cycles).
 */

import { join } from 'node:path';
import { IsolationProvider, type SandboxProvider } from './isolation.js';
import { GitWorktreeProvider, type GitWorktreeOptions } from './worktree.js';
import { detectSandbox, NoopSandboxProvider } from './sandbox.js';
import { ProcessLaneRunner, type LaneRunner } from './runner.js';
import { FileJournalStore } from './journal.js';
import { Orchestrator } from './orchestrator.js';

export interface CreateIsolationOptions {
  worktree?: GitWorktreeOptions;
  /** Force worktree-only isolation (skip OS sandbox detection). */
  noSandbox?: boolean;
}

export async function createIsolationProvider(
  opts: CreateIsolationOptions = {},
): Promise<IsolationProvider> {
  const worktrees = new GitWorktreeProvider(opts.worktree);
  const sandbox = opts.noSandbox
    ? new NoopSandboxProvider('disabled by config')
    : await detectSandbox();
  return new IsolationProvider(worktrees, sandbox);
}

export interface SwarmConfig {
  repoRoot: string;
  /** Agent command + arg template (see ProcessLaneRunner). Omit to inject a custom runner. */
  command?: string;
  args?: string[];
  /** Provide a runner directly (e.g. a cloud runner); overrides command/args. */
  runner?: LaneRunner;
  noSandbox?: boolean;
  worktree?: GitWorktreeOptions;
  /** Persist a journal here for resume; defaults to `<repoRoot>/.swarm/journal`. */
  journalDir?: string;
  env?: NodeJS.ProcessEnv;
  /** Flat per-lane cost estimate (USD) so `budgetUsd` can enforce for process runners. */
  estimatedCostUsd?: number;
}

/**
 * One-call wiring of the whole engine for a surface (CLI / extension): a single detected
 * sandbox is shared by BOTH the isolation layer and the process runner, so file isolation
 * (worktree) and process isolation (sandbox) stay consistent.
 */
export async function buildSwarm(cfg: SwarmConfig): Promise<{
  orchestrator: Orchestrator;
  runner: LaneRunner;
  sandbox: SandboxProvider;
}> {
  const sandbox = cfg.noSandbox ? new NoopSandboxProvider('disabled by config') : await detectSandbox();
  const isolation = new IsolationProvider(new GitWorktreeProvider(cfg.worktree), sandbox);
  const runner =
    cfg.runner ??
    new ProcessLaneRunner({
      command: cfg.command ?? 'antigravity',
      args: cfg.args ?? ['agent', 'run', '--cwd', '${worktree}', '--prompt', '${prompt}'],
      sandbox,
      env: cfg.env,
      estimatedCostUsd: cfg.estimatedCostUsd,
    });
  const journal = new FileJournalStore(cfg.journalDir ?? join(cfg.repoRoot, '.swarm', 'journal'));
  const orchestrator = new Orchestrator({ isolation, runner, repoRoot: cfg.repoRoot, journal });
  return { orchestrator, runner, sandbox };
}
