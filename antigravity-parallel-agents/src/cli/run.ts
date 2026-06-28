/**
 * `swarm run` — fan a batch of tasks into parallel, isolated lanes and report progress.
 * Kept as a pure function (`runBatch`) so it's testable without spawning a process.
 */

import { readFile } from 'node:fs/promises';
import { buildSwarm } from '../core/index.js';
import type { RunSummary, SwarmEvent, Lane } from '../core/index.js';

export interface RunBatchOptions {
  repoRoot: string;
  prompts: string[];
  concurrency?: number;
  /** Agent command + arg template; defaults to the Antigravity CLI preset. */
  command?: string;
  args?: string[];
  agentsMdPath?: string;
  budgetUsd?: number;
  noSandbox?: boolean;
  runId?: string;
  /** Sink for human-readable progress (default: console.log). */
  log?: (line: string) => void;
}

export async function runBatch(opts: RunBatchOptions): Promise<RunSummary> {
  const log = opts.log ?? ((l: string) => console.log(l));
  const agentsMd = opts.agentsMdPath ? await readFile(opts.agentsMdPath, 'utf8') : undefined;

  const { orchestrator, sandbox } = await buildSwarm({
    repoRoot: opts.repoRoot,
    command: opts.command,
    args: opts.args,
    noSandbox: opts.noSandbox,
  });

  if (sandbox.kind === 'none') {
    log('⚠️  No OS sandbox active — lanes are isolated by git worktree only.');
  }
  orchestrator.on((e) => log(formatEvent(e)));

  const tasks = opts.prompts.map((prompt, i) => ({ id: `lane-${i + 1}`, prompt, agentsMd }));
  const summary = await orchestrator.run(tasks, {
    concurrency: opts.concurrency ?? 4,
    budgetUsd: opts.budgetUsd,
    runId: opts.runId,
  });

  log(formatSummary(summary));
  return summary;
}

function formatEvent(e: SwarmEvent): string {
  switch (e.type) {
    case 'run:start':
      return `▶ starting ${e.lanes} lane(s)`;
    case 'lane:update':
      return `  [${e.lane.id}] ${e.lane.status}${e.lane.lastAction ? ` — ${e.lane.lastAction}` : ''}`;
    case 'lane:output':
      return `  [${e.laneId}] » ${e.chunk.trimEnd()}`;
    case 'run:done':
      return `✓ run complete`;
  }
}

export function formatSummary(summary: RunSummary): string {
  const tally = (s: Lane['status']) => summary.lanes.filter((l) => l.status === s).length;
  const lines = [
    '',
    `Summary (${summary.runId}):`,
    `  done: ${tally('done')}  failed: ${tally('failed')}  cancelled: ${tally('cancelled')}`,
    summary.totalCostUsd > 0 ? `  cost: $${summary.totalCostUsd.toFixed(2)}` : '',
  ];
  for (const l of summary.lanes) {
    const branch = l.isolation?.branch ?? '(no branch)';
    const note = l.status === 'failed' ? ` — ${l.error ?? 'error'}` : l.result?.patch ? ` → ${branch}` : '';
    lines.push(`  • ${l.id} [${l.status}] ${l.task.prompt}${note}`);
  }
  return lines.filter((x) => x !== '').join('\n');
}
