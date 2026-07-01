import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run, output } from './exec.js';
import { GitWorktreeProvider } from './worktree.js';
import { mergeLane, discardLane, laneDiff } from './merge.js';

async function makeRepo(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'swarm-merge-'));
  await run('git', ['init', '-q', '-b', 'main'], { cwd: dir });
  await run('git', ['config', 'user.email', 't@s.dev'], { cwd: dir });
  await run('git', ['config', 'user.name', 'T'], { cwd: dir });
  await writeFile(join(dir, 'app.txt'), 'line1\nline2\n');
  await run('git', ['add', '.'], { cwd: dir });
  await run('git', ['commit', '-q', '-m', 'init'], { cwd: dir });
  return dir;
}

/** Make a lane that edits `file` to `content` and commits, then return its branch. */
async function laneWith(repo: string, id: string, file: string, content: string): Promise<string> {
  const wt = new GitWorktreeProvider();
  const { worktree, branch } = await wt.create({ laneId: id, repoRoot: repo });
  await writeFile(join(worktree, file), content);
  await run('git', ['add', '.'], { cwd: worktree });
  await run('git', ['commit', '-qm', `lane ${id}`], { cwd: worktree });
  await wt.remove(worktree, { keepBranch: true });
  return branch;
}

describe('merge-back', () => {
  let repo: string;
  beforeEach(async () => { repo = await makeRepo(); });
  afterEach(async () => { await rm(repo, { recursive: true, force: true }); });

  it('merges a non-conflicting lane and can delete the branch', async () => {
    const branch = await laneWith(repo, 'feat', 'new.txt', 'hello\n');
    const res = await mergeLane(repo, branch, { deleteBranch: true });

    expect(res.ok).toBe(true);
    expect(res.conflicted).toBe(false);
    expect(await readFile(join(repo, 'new.txt'), 'utf8')).toBe('hello\n');
    expect(await output('git', ['branch', '--list', branch], { cwd: repo })).toBe('');
    expect(await output('git', ['status', '--porcelain'], { cwd: repo })).toBe('');
  });

  it('surfaces conflicts and aborts, leaving the base branch clean', async () => {
    // Lane branches from the original commit...
    const branch = await laneWith(repo, 'clash', 'app.txt', 'line1\nLANE-EDIT\n');
    // ...then the base diverges on the same line → conflict at merge time.
    await writeFile(join(repo, 'app.txt'), 'line1\nBASE-EDIT\n');
    await run('git', ['commit', '-aqm', 'base edit'], { cwd: repo });

    const res = await mergeLane(repo, branch);

    expect(res.ok).toBe(false);
    expect(res.conflicted).toBe(true);
    expect(res.conflicts).toContain('app.txt');
    // Tree is clean (merge aborted), base content preserved, no conflict markers.
    expect(await output('git', ['status', '--porcelain'], { cwd: repo })).toBe('');
    expect(await readFile(join(repo, 'app.txt'), 'utf8')).toBe('line1\nBASE-EDIT\n');
  });

  it('a conflicting SQUASH merge is aborted cleanly, leaving no conflict markers', async () => {
    const branch = await laneWith(repo, 'sq', 'app.txt', 'line1\nLANE-EDIT\n');
    await writeFile(join(repo, 'app.txt'), 'line1\nBASE-EDIT\n');
    await run('git', ['commit', '-aqm', 'base edit'], { cwd: repo });

    const res = await mergeLane(repo, branch, { strategy: 'squash' });

    expect(res.ok).toBe(false);
    expect(res.conflicted).toBe(true);
    // The critical assertion: `git merge --abort` can't abort a squash, so this exercises
    // the reset-based recovery. Tree must be clean, no conflict markers.
    expect(await output('git', ['status', '--porcelain'], { cwd: repo })).toBe('');
    expect(await readFile(join(repo, 'app.txt'), 'utf8')).toBe('line1\nBASE-EDIT\n');
  });

  it('laneDiff shows what a lane changed; discardLane removes it', async () => {
    const branch = await laneWith(repo, 'd', 'new.txt', 'content\n');
    const diff = await laneDiff(repo, branch);
    expect(diff).toContain('new.txt');
    expect(diff).toContain('+content');

    await discardLane(repo, branch);
    expect(await output('git', ['branch', '--list', branch], { cwd: repo })).toBe('');
    // Discarding a branch must not touch the working tree.
    await expect(stat(join(repo, 'new.txt'))).rejects.toThrow();
  });
});
