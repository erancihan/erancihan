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

  it('rejects a skill name that tries to traverse out of the worktree', async () => {
    const iso = await lane(repo, 'r5');
    const runner = new ProcessLaneRunner({ command: process.execPath, args: ['-e', 'console.log(1)'] });
    await expect(
      drain({ prompt: 'x', isolation: iso, skills: [{ name: '../../evil', body: 'PWNED' }] }, runner),
    ).rejects.toThrow(/unsafe skill name/);
    // Nothing was written outside the skills dir.
    await expect(stat(join(iso.worktree, '..', 'evil'))).rejects.toThrow();
  });

  it('does not re-substitute placeholder tokens that appear literally in the prompt', async () => {
    const iso = await lane(repo, 'r6');
    // Echo the received arg verbatim; if token-bleed occurred, ${worktree} would be a path.
    const runner = new ProcessLaneRunner({
      command: process.execPath,
      args: ['-e', 'console.log(process.argv[1])', '${prompt}'],
    });
    const updates = await drain({ prompt: 'edit the ${worktree} file', isolation: iso }, runner);
    const streamed = updates.map((u) => u.chunk ?? '').join('');
    expect(streamed).toContain('edit the ${worktree} file');
    expect(streamed).not.toContain(iso.worktree);
  });

  it('keeps the TAIL of output (the concluding answer) when it exceeds the cap', async () => {
    const iso = await lane(repo, 'r7');
    // Emit ~300 chars of noise then the final answer; cap at 50 so only the tail survives.
    const script = 'process.stdout.write("N".repeat(300)); console.log("FINAL-ANSWER");';
    const runner = new ProcessLaneRunner({ command: process.execPath, args: ['-e', script], maxOutputChars: 50 });
    const updates = await drain({ prompt: 'x', isolation: iso }, runner);
    const text = updates.at(-1)!.result?.text ?? '';
    expect(text).toContain('FINAL-ANSWER');
    expect(text.length).toBeLessThanOrEqual(50);
  });

  it('populates usage.costUsd when an estimate is configured (so budgets can enforce)', async () => {
    const iso = await lane(repo, 'r8');
    const runner = new ProcessLaneRunner({
      command: process.execPath,
      args: ['-e', 'require("fs").writeFileSync("a.txt","1")'],
      estimatedCostUsd: 0.25,
    });
    const updates = await drain({ prompt: 'x', isolation: iso }, runner);
    expect(updates.at(-1)!.result?.usage?.costUsd).toBe(0.25);
  });
});
