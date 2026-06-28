/**
 * Builds an Orchestrator wired for the IDE: real worktree+sandbox isolation (one shared
 * sandbox), a journal under the workspace's `.swarm/`, and a configurable agent command.
 *
 * The lane command defaults to the Antigravity CLI (provisional flags, docs/PLAN.md §6 Q2)
 * but is overridable via the `swarm.command` / `swarm.args` settings, so it works today
 * with any agent CLI. See docs/PLAN.md §1.4.
 */

import { buildSwarm, type Orchestrator } from '../src/core/index.js';

export interface BuildOptions {
  repoRoot: string;
  command?: string;
  args?: string[];
  noSandbox?: boolean;
}

export async function buildOrchestrator(opts: BuildOptions): Promise<Orchestrator> {
  const { orchestrator } = await buildSwarm({
    repoRoot: opts.repoRoot,
    command: opts.command,
    args: opts.args,
    noSandbox: opts.noSandbox,
  });
  return orchestrator;
}
