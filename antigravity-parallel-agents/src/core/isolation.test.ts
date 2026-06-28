import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run, output } from './exec.js';
import { createIsolationProvider } from './factory.js';
import { detectSandbox, NoopSandboxProvider, NsjailSandboxProvider } from './sandbox.js';
import { GitWorktreeProvider } from './worktree.js';

async function exists(p: string): Promise<boolean> {
  try { await stat(p); return true; } catch { return false; }
}

/** Create a throwaway git repo with one committed file on `main`. */
async function makeRepo(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'swarm-repo-'));
  await run('git', ['init', '-q', '-b', 'main'], { cwd: dir });
  await run('git', ['config', 'user.email', 'test@swarm.dev'], { cwd: dir });
  await run('git', ['config', 'user.name', 'Swarm Test'], { cwd: dir });
  await writeFile(join(dir, 'app.txt'), 'original\n');
  await run('git', ['add', '.'], { cwd: dir });
  await run('git', ['commit', '-q', '-m', 'init'], { cwd: dir });
  return dir;
}

describe('isolation core', () => {
  let repo: string;
  beforeEach(async () => { repo = await makeRepo(); });
  afterEach(async () => { await rm(repo, { recursive: true, force: true }); });

  it('acquires a lane in its own worktree + branch, leaving the base tree untouched', async () => {
    const iso = await createIsolationProvider();
    const lane = await iso.acquire({ laneId: 'lane-1', repoRoot: repo });

    expect(lane.branch).toBe('swarm/lane-1');
    expect(await exists(lane.worktree)).toBe(true);
    // The worktree starts from the base commit's content...
    expect(await readFile(join(lane.worktree, 'app.txt'), 'utf8')).toBe('original\n');

    // ...and an edit in the lane does NOT touch the base working tree.
    await writeFile(join(lane.worktree, 'app.txt'), 'changed by agent\n');
    expect(await readFile(join(repo, 'app.txt'), 'utf8')).toBe('original\n');

    // Base repo is still on `main` and clean.
    expect(await output('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: repo })).toBe('main');
    expect(await output('git', ['status', '--porcelain'], { cwd: repo })).toBe('');

    await iso.release(lane);
    expect(await exists(lane.worktree)).toBe(false);
    // Lane branch is cleaned up.
    const branches = await output('git', ['branch', '--list', 'swarm/lane-1'], { cwd: repo });
    expect(branches).toBe('');
  });

  it('keeps the branch for merge-back when requested', async () => {
    const iso = await createIsolationProvider();
    const lane = await iso.acquire({ laneId: 'lane-keep', repoRoot: repo });
    await writeFile(join(lane.worktree, 'app.txt'), 'lane work\n');
    await run('git', ['commit', '-aqm', 'lane work'], { cwd: lane.worktree });

    await iso.release(lane, { keepBranch: true });
    expect(await exists(lane.worktree)).toBe(false);
    const branches = await output('git', ['branch', '--list', 'swarm/lane-keep'], { cwd: repo });
    expect(branches).toContain('swarm/lane-keep');
  });

  it('isolates many lanes concurrently with distinct worktrees/branches', async () => {
    const iso = await createIsolationProvider();
    const ids = ['a', 'b', 'c', 'd'];
    const lanes = await Promise.all(
      ids.map((id) => iso.acquire({ laneId: `lane-${id}`, repoRoot: repo })),
    );

    const worktrees = new Set(lanes.map((l) => l.worktree));
    const branches = new Set(lanes.map((l) => l.branch));
    expect(worktrees.size).toBe(ids.length);
    expect(branches.size).toBe(ids.length);

    // Each lane writes a different value; none leaks into another or the base.
    await Promise.all(lanes.map((l, i) => writeFile(join(l.worktree, 'app.txt'), `lane-${i}\n`)));
    for (let i = 0; i < lanes.length; i++) {
      expect(await readFile(join(lanes[i].worktree, 'app.txt'), 'utf8')).toBe(`lane-${i}\n`);
    }
    expect(await readFile(join(repo, 'app.txt'), 'utf8')).toBe('original\n');

    await Promise.all(lanes.map((l) => iso.release(l)));
    expect(await output('git', ['worktree', 'list'], { cwd: repo })).not.toContain('.swarm');
  });

  it('rejects a non-git directory', async () => {
    const notRepo = await mkdtemp(join(tmpdir(), 'swarm-plain-'));
    const wt = new GitWorktreeProvider();
    await expect(wt.create({ laneId: 'x', repoRoot: notRepo })).rejects.toThrow(/Not a git repository/);
    await rm(notRepo, { recursive: true, force: true });
  });
});

describe('sandbox detection', () => {
  it('returns a provider; on a host without nsjail it degrades to no-op identity wrap', async () => {
    const sb = await detectSandbox();
    const wrapped = sb.wrap('echo', ['hi'], '/tmp');
    if (sb instanceof NoopSandboxProvider) {
      expect(wrapped).toEqual({ cmd: 'echo', args: ['hi'] });
      expect(sb.kind).toBe('none');
    } else if (sb instanceof NsjailSandboxProvider) {
      expect(wrapped.cmd).toBe('nsjail');
      expect(wrapped.args).toContain('echo');
    }
  });

  it('nsjail wrap confines to the worktree cwd', () => {
    const sb = new NsjailSandboxProvider();
    const { cmd, args } = sb.wrap('node', ['x.js'], '/work/lane-1');
    expect(cmd).toBe('nsjail');
    expect(args).toContain('--cwd');
    expect(args).toContain('/work/lane-1');
    expect(args.slice(args.indexOf('--') + 1)).toEqual(['node', 'x.js']);
  });
});
