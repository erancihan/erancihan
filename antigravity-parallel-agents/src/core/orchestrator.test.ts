import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run, output } from './exec.js';
import { createIsolationProvider } from './factory.js';
import { Orchestrator } from './orchestrator.js';
import type { LaneRunner, RunnerInput, RunnerUpdate } from './runner.js';
import type { Task, SwarmEvent } from './types.js';

async function makeRepo(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'swarm-orch-'));
  await run('git', ['init', '-q', '-b', 'main'], { cwd: dir });
  await run('git', ['config', 'user.email', 't@s.dev'], { cwd: dir });
  await run('git', ['config', 'user.name', 'T'], { cwd: dir });
  await writeFile(join(dir, 'app.txt'), 'original\n');
  await run('git', ['add', '.'], { cwd: dir });
  await run('git', ['commit', '-q', '-m', 'init'], { cwd: dir });
  return dir;
}

/** A runner that "does work" by editing+committing inside the lane's worktree. */
class FakeRunner implements LaneRunner {
  active = 0;
  peak = 0;
  constructor(private readonly costPerLane = 0) {}
  async *run(input: RunnerInput): AsyncIterable<RunnerUpdate> {
    this.active++;
    this.peak = Math.max(this.peak, this.active);
    try {
      yield { lastAction: 'thinking', done: false };
      await new Promise((r) => setTimeout(r, 10));
      await writeFile(join(input.isolation.worktree, 'app.txt'), `done: ${input.prompt}\n`);
      await run('git', ['commit', '-aqm', 'work'], { cwd: input.isolation.worktree });
      yield {
        lastAction: 'committed',
        chunk: `result for ${input.prompt}`,
        done: true,
        result: { text: `ok: ${input.prompt}`, usage: { costUsd: this.costPerLane } },
      };
    } finally {
      this.active--;
    }
  }
}

const tasks = (prompts: string[]): Task[] =>
  prompts.map((p, i) => ({ id: `lane-${i}`, prompt: p }));

describe('Orchestrator', () => {
  let repo: string;
  beforeEach(async () => { repo = await makeRepo(); });
  afterEach(async () => { await rm(repo, { recursive: true, force: true }); });

  it('runs all lanes in parallel, isolated, and keeps base tree untouched', async () => {
    const isolation = await createIsolationProvider();
    const runner = new FakeRunner();
    const orch = new Orchestrator({ isolation, runner, repoRoot: repo });

    const events: SwarmEvent[] = [];
    orch.on((e) => events.push(e));

    const summary = await orch.run(tasks(['A', 'B', 'C', 'D', 'E']), { concurrency: 3 });

    expect(summary.lanes).toHaveLength(5);
    expect(summary.lanes.every((l) => l.status === 'done')).toBe(true);
    expect(summary.lanes.every((l) => l.result?.text?.startsWith('ok:'))).toBe(true);

    // Concurrency was actually used but capped.
    expect(runner.peak).toBeGreaterThan(1);
    expect(runner.peak).toBeLessThanOrEqual(3);

    // Base working tree never changed.
    expect(await readFile(join(repo, 'app.txt'), 'utf8')).toBe('original\n');

    // Each lane's work was preserved on its own branch for merge-back.
    const branches = await output('git', ['branch', '--list', 'swarm/*'], { cwd: repo });
    expect(branches).toContain('swarm/lane-0');
    expect(branches).toContain('swarm/lane-4');

    // Event stream shape.
    expect(events[0]).toMatchObject({ type: 'run:start', lanes: 5 });
    expect(events.at(-1)).toMatchObject({ type: 'run:done' });
    expect(events.some((e) => e.type === 'lane:output')).toBe(true);
  });

  it('isolates failures: one bad lane does not abort the run', async () => {
    const isolation = await createIsolationProvider();
    const runner: LaneRunner = {
      async *run(input: RunnerInput): AsyncIterable<RunnerUpdate> {
        if (input.prompt === 'BOOM') throw new Error('lane exploded');
        yield { done: true, result: { text: `ok: ${input.prompt}` } };
      },
    };
    const orch = new Orchestrator({ isolation, runner, repoRoot: repo });

    const summary = await orch.run(tasks(['A', 'BOOM', 'C']), { concurrency: 2 });
    const byPrompt = (p: string) => summary.lanes.find((l) => l.task.prompt === p)!;

    expect(byPrompt('A').status).toBe('done');
    expect(byPrompt('C').status).toBe('done');
    expect(byPrompt('BOOM').status).toBe('failed');
    expect(byPrompt('BOOM').error).toContain('lane exploded');
    // Failed lane's worktree/branch are cleaned up (not kept).
    const branches = await output('git', ['branch', '--list', 'swarm/lane-1'], { cwd: repo });
    expect(branches).toBe('');
  });

  it('stops scheduling new lanes once the cost budget is exceeded', async () => {
    const isolation = await createIsolationProvider();
    const runner = new FakeRunner(1.0); // $1 per lane
    const orch = new Orchestrator({ isolation, runner, repoRoot: repo });

    // Budget $2 with concurrency 1 → ~2 lanes run, the rest are cancelled.
    const summary = await orch.run(tasks(['A', 'B', 'C', 'D', 'E']), {
      concurrency: 1,
      budgetUsd: 2.0,
    });

    const done = summary.lanes.filter((l) => l.status === 'done').length;
    const cancelled = summary.lanes.filter((l) => l.status === 'cancelled').length;
    expect(done).toBeGreaterThanOrEqual(2);
    expect(cancelled).toBeGreaterThan(0);
    expect(done + cancelled).toBe(5);
    expect(summary.totalCostUsd).toBeGreaterThanOrEqual(2.0);
  });
});
