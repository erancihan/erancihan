/**
 * Builds an Orchestrator wired for the IDE: real worktree+sandbox isolation, a journal
 * under the workspace's `.swarm/`, and a lane runner.
 *
 * The default runner is the local Antigravity CLI runner (Phase 2 — still a stub until
 * the CLI's headless invocation is confirmed). Swap in `ManagedAgentsLaneRunner` to run
 * lanes in cloud sandboxes instead. See docs/PLAN.md §1.4.
 */

import { join } from 'node:path';
import {
  Orchestrator,
  createIsolationProvider,
  FileJournalStore,
  CliLaneRunner,
  type LaneRunner,
} from '../src/core/index.js';

export interface BuildOptions {
  repoRoot: string;
  runner?: LaneRunner;
  noSandbox?: boolean;
}

export async function buildOrchestrator(opts: BuildOptions): Promise<Orchestrator> {
  const isolation = await createIsolationProvider({ noSandbox: opts.noSandbox });
  const journal = new FileJournalStore(join(opts.repoRoot, '.swarm', 'journal'));
  const runner = opts.runner ?? new CliLaneRunner();
  return new Orchestrator({ isolation, runner, repoRoot: opts.repoRoot, journal });
}
