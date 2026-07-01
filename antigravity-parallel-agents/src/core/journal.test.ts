import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run, output } from './exec.js';
import { createIsolationProvider } from './factory.js';
import { Orchestrator } from './orchestrator.js';
import { MemoryJournalStore, FileJournalStore } from './journal.js';
import type { LaneRunner, RunnerInput, RunnerUpdate } from './runner.js';
import type { Task } from './types.js';

async function makeRepo(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'swarm-journal-'));
  await run('git', ['init', '-q', '-b', 'main'], { cwd: dir });
  await run('git', ['config', 'user.email', 't@s.dev'], { cwd: dir });
  await run('git', ['config', 'user.name', 'T'], { cwd: dir });
  await writeFile(join(dir, 'app.txt'), 'original\n');
  await run('git', ['add', '.'], { cwd: dir });
  await run('git', ['commit', '-q', '-m', 'init'], { cwd: dir });
  return dir;
}

const tasks = (prompts: string[]): Task[] => prompts.map((p, i) => ({ id: `lane-${i}`, prompt: p }));

/** Runner whose lanes succeed, except prompts in `failSet` (which throw) until "healed". */
class FlakyRunner implements LaneRunner {
  constructor(public failSet: Set<string>) {}
  async *run(input: RunnerInput): AsyncIterable<RunnerUpdate> {
    if (this.failSet.has(input.prompt)) throw new Error(`fail ${input.prompt}`);
    await writeFile(join(input.isolation.worktree, 'app.txt'), `done ${input.prompt}\n`);
    await run('git', ['commit', '-aqm', 'work'], { cwd: input.isolation.worktree });
    yield { done: true, result: { text: `ok ${input.prompt}`, usage: { costUsd: 0.5 } } };
  }
}

describe('journal + resume', () => {
  let repo: string;
  beforeEach(async () => { repo = await makeRepo(); });
  afterEach(async () => { await rm(repo, { recursive: true, force: true }); });

  it('persists run state to disk on every transition', async () => {
    const journalDir = join(repo, '.swarm', 'journal');
    const orch = new Orchestrator({
      isolation: await createIsolationProvider(),
      runner: new FlakyRunner(new Set()),
      repoRoot: repo,
      journal: new FileJournalStore(journalDir),
    });
    await orch.run(tasks(['A', 'B']), { concurrency: 2, runId: 'run-fixed' });

    const onDisk = JSON.parse(await readFile(join(journalDir, 'run-fixed.json'), 'utf8'));
    expect(onDisk.runId).toBe('run-fixed');
    expect(onDisk.lanes).toHaveLength(2);
    expect(onDisk.lanes.every((l: { status: string }) => l.status === 'done')).toBe(true);
  });

  it('resume re-runs only the non-completed lanes and keeps completed ones', async () => {
    const journal = new MemoryJournalStore();
    const runner = new FlakyRunner(new Set(['B'])); // lane B fails first time
    const isolation = await createIsolationProvider();
    const orch = new Orchestrator({ isolation, runner, repoRoot: repo, journal });

    const first = await orch.run(tasks(['A', 'B', 'C']), { concurrency: 2, runId: 'r1' });
    expect(first.lanes.find((l) => l.task.prompt === 'A')!.status).toBe('done');
    expect(first.lanes.find((l) => l.task.prompt === 'B')!.status).toBe('failed');
    expect(first.lanes.find((l) => l.task.prompt === 'C')!.status).toBe('done');

    // "Fix" B, then resume the same run.
    runner.failSet = new Set();
    const resumed = await orch.resume('r1');

    expect(resumed.lanes.every((l) => l.status === 'done')).toBe(true);
    // B now has its branch (produced work on the retry).
    const branches = await output('git', ['branch', '--list', 'swarm/lane-1'], { cwd: repo });
    expect(branches).toContain('swarm/lane-1');
    // Base tree still pristine.
    expect(await readFile(join(repo, 'app.txt'), 'utf8')).toBe('original\n');
  });

  it('recovers after a failed write: a transient error does not freeze all later saves', async () => {
    // Put a FILE where the journal dir should be so the first mkdir(recursive) fails; then
    // remove it so the next save can succeed. Pre-fix, the poisoned chain skipped it.
    const journalDir = join(repo, 'jdir');
    await writeFile(journalDir, 'blocker');
    const store = new FileJournalStore(join(journalDir, 'sub'));
    const state = {
      runId: 'r', repoRoot: repo, options: { concurrency: 1 },
      lanes: [], updatedAt: 1,
    } as unknown as Parameters<FileJournalStore['save']>[0];

    await expect(store.save(state)).rejects.toBeTruthy(); // first write fails (ENOTDIR)
    await rm(journalDir, { force: true }); // clear the blocker
    await store.save({ ...state, updatedAt: 2 }); // must now succeed, not be skipped

    const loaded = await store.load('r');
    expect(loaded?.updatedAt).toBe(2);
  });

  it('resume requires a journal store', async () => {
    const orch = new Orchestrator({
      isolation: await createIsolationProvider(),
      runner: new FlakyRunner(new Set()),
      repoRoot: repo,
    });
    await expect(orch.resume('nope')).rejects.toThrow(/requires a journal/);
  });
});
