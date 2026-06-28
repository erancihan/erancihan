import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execPath } from 'node:process';
import { run, output } from '../core/exec.js';
import { runBatch } from './run.js';

async function makeRepo(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'swarm-cli-'));
  await run('git', ['init', '-q', '-b', 'main'], { cwd: dir });
  await run('git', ['config', 'user.email', 't@s.dev'], { cwd: dir });
  await run('git', ['config', 'user.name', 'T'], { cwd: dir });
  await writeFile(join(dir, 'seed.txt'), 'seed\n');
  await run('git', ['add', '.'], { cwd: dir });
  await run('git', ['commit', '-q', '-m', 'init'], { cwd: dir });
  return dir;
}

// Agent writes a per-prompt file so each lane produces distinct, mergeable work.
const AGENT = `const p=process.argv[1]; const fs=require('fs');
fs.writeFileSync('result-'+p.replace(/\\W+/g,'_')+'.txt', p+'\\n'); console.log('done '+p);`;

describe('swarm CLI runBatch (end-to-end)', () => {
  let repo: string;
  beforeEach(async () => { repo = await makeRepo(); });
  afterEach(async () => { await rm(repo, { recursive: true, force: true }); });

  it('fans out tasks into isolated lanes that each commit work, base tree untouched', async () => {
    const logs: string[] = [];
    const summary = await runBatch({
      repoRoot: repo,
      prompts: ['alpha', 'beta', 'gamma'],
      concurrency: 2,
      command: execPath,
      args: ['-e', AGENT, '${prompt}'],
      runId: 'cli-run',
      log: (l) => logs.push(l),
    });

    expect(summary.lanes).toHaveLength(3);
    expect(summary.lanes.every((l) => l.status === 'done')).toBe(true);
    expect(summary.lanes.every((l) => l.result?.patch)).toBeTruthy();

    // Each lane committed on its own branch.
    const branches = await output('git', ['branch', '--list', 'swarm/*'], { cwd: repo });
    for (const id of ['lane-1', 'lane-2', 'lane-3']) expect(branches).toContain(`swarm/${id}`);

    // Base working tree is pristine.
    expect(await output('git', ['status', '--porcelain'], { cwd: repo })).toBe('');
    expect(await readFile(join(repo, 'seed.txt'), 'utf8')).toBe('seed\n');

    // Progress + summary were emitted.
    expect(logs.some((l) => l.includes('starting 3 lane'))).toBe(true);
    expect(logs.some((l) => l.includes('Summary'))).toBe(true);
  });

  it('reports failures with a non-everything-done summary', async () => {
    const summary = await runBatch({
      repoRoot: repo,
      prompts: ['ok-task', 'BOOM'],
      concurrency: 2,
      command: execPath,
      args: ['-e', 'if(process.argv[1]==="BOOM")process.exit(2); console.log("ok")', '${prompt}'],
      log: () => {},
    });
    expect(summary.lanes.find((l) => l.task.prompt === 'ok-task')!.status).toBe('done');
    expect(summary.lanes.find((l) => l.task.prompt === 'BOOM')!.status).toBe('failed');
  });
});
