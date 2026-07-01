#!/usr/bin/env node
/**
 * `swarm` CLI entrypoint — minimal, dependency-free arg parsing.
 *
 *   swarm run "task a" "task b"           run tasks in parallel lanes
 *   swarm run --file tasks.txt            one task per non-empty/non-# line
 *   swarm run ... --concurrency 4 --command node --arg -e --arg script.js
 *   swarm run ... --budget 5 --cost-per-lane 1   stop scheduling past $5
 *   swarm merge <laneId> [--squash] [--delete]
 *   swarm resume <runId>
 *
 * Flags accept both `--flag value` and `--flag=value`. Lanes default to the Antigravity
 * CLI agent (`--command`/`--arg` to override).
 */

import { readFile } from 'node:fs/promises';
import { argv, cwd } from 'node:process';
import { pathToFileURL } from 'node:url';
import { runBatch, formatSummary } from './run.js';
import { mergeLane, buildSwarm } from '../core/index.js';

export interface Parsed {
  _: string[];
  flags: Record<string, string | boolean>;
  args: string[]; // repeated --arg values, in order
  errors: string[];
}

export function parse(argv: string[]): Parsed {
  const out: Parsed = { _: [], flags: {}, args: [], errors: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--arg') {
      const v = argv[++i];
      if (v === undefined) out.errors.push('--arg requires a value');
      else out.args.push(v);
      continue;
    }
    if (a.startsWith('--')) {
      const body = a.slice(2);
      // Support the `--key=value` form so values starting with '-' (e.g. an agent flag)
      // and the general convention both work.
      const eq = body.indexOf('=');
      if (eq > -1) { out.flags[body.slice(0, eq)] = body.slice(eq + 1); continue; }
      const key = body;
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) out.flags[key] = true;
      else { out.flags[key] = next; i++; }
      continue;
    }
    out._.push(a);
  }
  return out;
}

/** Parse a numeric flag; returns undefined if absent, or a message string if invalid. */
export function numericFlag(
  flags: Parsed['flags'],
  name: string,
  { min = -Infinity }: { min?: number } = {},
): number | undefined | { error: string } {
  const raw = flags[name];
  if (raw === undefined) return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min) return { error: `--${name} must be a number >= ${min}` };
  return n;
}

async function main(argv: string[]): Promise<number> {
  const p = parse(argv);
  if (p.errors.length) { console.error(p.errors.join('\n')); return 2; }
  const sub = p._[0];
  const repoRoot = (p.flags.repo as string) ?? cwd();

  if (sub === 'run') {
    let prompts = p._.slice(1);
    if (p.flags.file) {
      const text = await readFile(p.flags.file as string, 'utf8');
      // Tolerate CRLF line endings.
      prompts = text.split(/\r?\n/).map((s) => s.trim()).filter((s) => s && !s.startsWith('#'));
    }
    if (prompts.length === 0) { console.error('swarm run: no tasks given'); return 2; }

    const concurrency = numericFlag(p.flags, 'concurrency', { min: 1 });
    if (concurrency && typeof concurrency === 'object') { console.error(concurrency.error); return 2; }
    const budgetUsd = numericFlag(p.flags, 'budget', { min: 0 });
    if (budgetUsd && typeof budgetUsd === 'object') { console.error(budgetUsd.error); return 2; }
    const costPerLaneUsd = numericFlag(p.flags, 'cost-per-lane', { min: 0 });
    if (costPerLaneUsd && typeof costPerLaneUsd === 'object') { console.error(costPerLaneUsd.error); return 2; }

    const summary = await runBatch({
      repoRoot,
      prompts,
      concurrency,
      command: typeof p.flags.command === 'string' ? p.flags.command : undefined,
      args: p.args.length ? p.args : undefined,
      agentsMdPath: p.flags['agents-md'] as string | undefined,
      budgetUsd,
      costPerLaneUsd,
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
    const { orchestrator } = await buildSwarm({
      repoRoot,
      command: typeof p.flags.command === 'string' ? p.flags.command : undefined,
    });
    const summary = await orchestrator.resume(runId);
    console.log(formatSummary(summary));
    return summary.lanes.some((l) => l.status === 'failed') ? 1 : 0;
  }

  console.error('usage: swarm <run|merge|resume> ...');
  return 2;
}

// Only run when invoked as the CLI entrypoint — importing this module (e.g. in tests to
// exercise parse()) must NOT trigger execution or process.exit.
const isEntrypoint = argv[1] && import.meta.url === pathToFileURL(argv[1]).href;
if (isEntrypoint) {
  main(argv.slice(2)).then(
    (code) => process.exit(code),
    (err) => { console.error(err); process.exit(1); },
  );
}
