import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run, output } from './exec.js';
import { GitWorktreeProvider } from './worktree.js';
import { ProcessLaneRunner } from './runner.js';
import type { RunnerInput, RunnerUpdate } from './runner.js';
import type { LaneIsolation } from './types.js';

async function makeRepo(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'swarm-runner-'));
  await run('git', ['init', '-q', '-b', 'main'], { cwd: dir });
  await run('git', ['config', 'user.email', 't@s.dev'], { cwd: dir });
  await run('git', ['config', 'user.name', 'T'], { cwd: dir });
  await writeFile(join(dir, 'seed.txt'), 'seed\n');
  await run('git', ['add', '.'], { cwd: dir });
  await run('git', ['commit', '-q', '-m', 'init'], { cwd: dir });
  return dir;
}

async function lane(repo: string, id: string): Promise<LaneIsolation> {
  const { worktree, branch } = await new GitWorktreeProvider().create({ laneId: id, repoRoot: repo });
  return { worktree, branch, sandbox: 'none' };
}

async function drain(input: RunnerInput, runner: ProcessLaneRunner): Promise<RunnerUpdate[]> {
  const updates: RunnerUpdate[] = [];
  for await (const u of runner.run(input)) updates.push(u);
  return updates;
}

// A "real" agent: writes a file with the prompt, then prints to stdout.
const AGENT = `const p=process.argv[1]; require('fs').writeFileSync('out.txt','built: '+p+'\\n'); console.log('agent did: '+p);`;

describe('ProcessLaneRunner (real subprocess)', () => {
  let repo: string;
  beforeEach(async () => { repo = await makeRepo(); });
  afterEach(async () => { await rm(repo, { recursive: true, force: true }); });

  it('runs a command in the worktree, streams output, commits the work, returns a patch', async () => {
    const iso = await lane(repo, 'r1');
    const runner = new ProcessLaneRunner({ command: process.execPath, args: ['-e', AGENT, '${prompt}'] });

    const updates = await drain({ prompt: 'task one', isolation: iso }, runner);

    // Streamed the agent's stdout.
    const streamed = updates.map((u) => u.chunk ?? '').join('');
    expect(streamed).toContain('agent did: task one');

    // Final result has the patch + work was committed in the lane worktree.
    const final = updates.at(-1)!;
    expect(final.done).toBe(true);
    expect(final.result?.patch).toContain('out.txt');
    expect(await readFile(join(iso.worktree, 'out.txt'), 'utf8')).toBe('built: task one\n');
    const log = await output('git', ['log', '--oneline'], { cwd: iso.worktree });
    expect(log).toContain('swarm: task one');
  });

  it('mounts AGENTS.md into the worktree', async () => {
    const iso = await lane(repo, 'r2');
    const runner = new ProcessLaneRunner({ command: process.execPath, args: ['-e', AGENT, '${prompt}'] });
    const updates = await drain({ prompt: 'x', isolation: iso, agentsMd: '# Playbook\nbe careful\n' }, runner);

    expect(await readFile(join(iso.worktree, 'AGENTS.md'), 'utf8')).toContain('be careful');
    expect(updates.at(-1)!.result?.patch).toContain('AGENTS.md');
  });

  it('throws when the agent command fails', async () => {
    const iso = await lane(repo, 'r3');
    const runner = new ProcessLaneRunner({ command: process.execPath, args: ['-e', 'process.exit(3)'] });
    await expect(drain({ prompt: 'boom', isolation: iso }, runner)).rejects.toThrow(/exited with code 3/);
  });

  it('produces no patch when the agent changes nothing', async () => {
    const iso = await lane(repo, 'r4');
    const runner = new ProcessLaneRunner({ command: process.execPath, args: ['-e', 'console.log("noop")'] });
    const updates = await drain({ prompt: 'nothing', isolation: iso }, runner);
    expect(updates.at(-1)!.result?.patch).toBeUndefined();
    // No empty commit created.
    await expect(stat(join(iso.worktree, 'out.txt'))).rejects.toThrow();
  });
});
