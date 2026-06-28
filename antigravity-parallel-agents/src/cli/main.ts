#!/usr/bin/env node
/**
 * `swarm` CLI entrypoint — minimal, dependency-free arg parsing.
 *
 *   swarm run "task a" "task b"           run tasks in parallel lanes
 *   swarm run --file tasks.txt            one task per non-empty/non-# line
 *   swarm run ... --concurrency 4 --command node --arg -e --arg script.js
 *   swarm merge <laneId> [--squash] [--delete]
 *   swarm resume <runId>
 *
 * Lanes default to the Antigravity CLI agent (`--command`/`--arg` to override).
 */

import { readFile } from 'node:fs/promises';
import { cwd } from 'node:process';
import { runBatch, formatSummary } from './run.js';
import { mergeLane, buildSwarm } from '../core/index.js';

interface Parsed {
  _: string[];
  flags: Record<string, string | boolean>;
  args: string[]; // repeated --arg values, in order
}

function parse(argv: string[]): Parsed {
  const out: Parsed = { _: [], flags: {}, args: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--arg') { out.args.push(argv[++i]); continue; }
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) out.flags[key] = true;
      else { out.flags[key] = next; i++; }
      continue;
    }
    out._.push(a);
  }
  return out;
}

async function main(argv: string[]): Promise<number> {
  const p = parse(argv);
  const sub = p._[0];
  const repoRoot = (p.flags.repo as string) ?? cwd();

  if (sub === 'run') {
    let prompts = p._.slice(1);
    if (p.flags.file) {
      const text = await readFile(p.flags.file as string, 'utf8');
      prompts = text.split('\n').map((s) => s.trim()).filter((s) => s && !s.startsWith('#'));
    }
    if (prompts.length === 0) { console.error('swarm run: no tasks given'); return 2; }
    const summary = await runBatch({
      repoRoot,
      prompts,
      concurrency: p.flags.concurrency ? Number(p.flags.concurrency) : undefined,
      command: p.flags.command as string | undefined,
      args: p.args.length ? p.args : undefined,
      agentsMdPath: p.flags['agents-md'] as string | undefined,
      budgetUsd: p.flags.budget ? Number(p.flags.budget) : undefined,
      noSandbox: p.flags['no-sandbox'] === true,
      runId: p.flags['run-id'] as string | undefined,
    });
    return summary.lanes.some((l) => l.status === 'failed') ? 1 : 0;
  }

  if (sub === 'merge') {
    const laneId = p._[1];
    if (!laneId) { console.error('swarm merge: need a lane id'); return 2; }
    const res = await mergeLane(repoRoot, `swarm/${laneId}`, {
      strategy: p.flags.squash ? 'squash' : 'merge',
      deleteBranch: p.flags.delete === true,
    });
    console.log(res.message);
    return res.ok ? 0 : 1;
  }

  if (sub === 'resume') {
    const runId = p._[1];
    if (!runId) { console.error('swarm resume: need a run id'); return 2; }
    const { orchestrator } = await buildSwarm({ repoRoot, command: p.flags.command as string | undefined });
    const summary = await orchestrator.resume(runId);
    console.log(formatSummary(summary));
    return summary.lanes.some((l) => l.status === 'failed') ? 1 : 0;
  }

  console.error('usage: swarm <run|merge|resume> ...');
  return 2;
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (err) => { console.error(err); process.exit(1); },
);
