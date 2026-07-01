/**
 * GitWorktreeProvider — file isolation for a lane.
 *
 * Each lane gets its own `git worktree` checked out on a fresh branch, so an agent's
 * edits live in a separate working directory and never touch the user's tree until an
 * explicit merge-back. See docs/PLAN.md §3.3.
 */

import { join, isAbsolute, resolve, dirname, relative } from 'node:path';
import { rm, mkdir, writeFile, access } from 'node:fs/promises';
import { run, output } from './exec.js';
import type { IsolationRequest, WorktreeProvider } from './isolation.js';

export interface GitWorktreeOptions {
  /** Where lane worktrees are created (default: `<repoRoot>/.swarm/lanes`). */
  root?: string;
  /** Branch name prefix (default: `swarm/`). */
  branchPrefix?: string;
}

export class GitWorktreeProvider implements WorktreeProvider {
  constructor(private readonly opts: GitWorktreeOptions = {}) {}

  async create(req: IsolationRequest): Promise<{ worktree: string; branch: string }> {
    const repoRoot = resolve(req.repoRoot);
    await assertGitRepo(repoRoot);

    const branchPrefix = this.opts.branchPrefix ?? 'swarm/';
    const branch = `${branchPrefix}${req.laneId}`;
    const lanesRoot = this.opts.root
      ? (isAbsolute(this.opts.root) ? this.opts.root : join(repoRoot, this.opts.root))
      : join(repoRoot, '.swarm', 'lanes');
    const worktree = join(lanesRoot, req.laneId);

    // Keep the lane worktrees out of the base repo's git status. When they live inside
    // the repo (the default `.swarm/lanes`), drop a self-ignoring `.gitignore` at the
    // `.swarm` root so worktree churn never shows up as untracked noise. Use a path-aware
    // containment check so a sibling dir like `<repo>2/…` isn't mistaken for inside.
    if (isInside(repoRoot, lanesRoot)) {
      await ensureIgnored(dirname(lanesRoot));
    }

    const baseRef = req.baseRef ?? (await output('git', ['rev-parse', 'HEAD'], { cwd: repoRoot }));

    // A crashed run can leave a stale worktree/branch for this laneId. Clear it so resume
    // can re-acquire the lane from a clean base (partial work is intentionally discarded).
    await this.clearStale(repoRoot, worktree, branch);

    // `git worktree add -b <branch> <path> <baseRef>` creates the branch + checkout.
    const r = await run(
      'git',
      ['worktree', 'add', '-b', branch, worktree, baseRef],
      { cwd: repoRoot },
    );
    if (r.code !== 0) {
      throw new Error(`git worktree add failed for lane ${req.laneId}: ${r.stderr.trim()}`);
    }
    return { worktree, branch };
  }

  /** Best-effort removal of a pre-existing worktree + branch for a lane (resume safety). */
  private async clearStale(repoRoot: string, worktree: string, branch: string): Promise<void> {
    await run('git', ['worktree', 'remove', '--force', worktree], { cwd: repoRoot }).catch(() => undefined);
    await rm(worktree, { recursive: true, force: true }).catch(() => undefined);
    // The branch may be checked out in a DIFFERENT worktree path (e.g. after a config
    // change or a crash); `git branch -D` would then fail and the subsequent
    // `worktree add -b` abort with "branch already exists". Force-remove whatever worktree
    // holds this branch before deleting it.
    const owner = await worktreeHoldingBranch(repoRoot, branch);
    if (owner && owner !== worktree) {
      await run('git', ['worktree', 'remove', '--force', owner], { cwd: repoRoot }).catch(() => undefined);
      await rm(owner, { recursive: true, force: true }).catch(() => undefined);
    }
    await run('git', ['worktree', 'prune'], { cwd: repoRoot }).catch(() => undefined);
    const hasBranch = await run('git', ['rev-parse', '--verify', '--quiet', branch], { cwd: repoRoot });
    if (hasBranch.code === 0) {
      await run('git', ['branch', '-D', branch], { cwd: repoRoot }).catch(() => undefined);
    }
  }

  async remove(worktree: string, opts: { keepBranch?: boolean } = {}): Promise<void> {
    // Resolve the main repo root + the lane's branch *before* the worktree disappears,
    // so we can run branch cleanup from a directory that still exists afterwards.
    const mainRoot = await mainWorktreeRoot(worktree);
    let branch: string | undefined;
    if (!opts.keepBranch) {
      const r = await run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: worktree });
      if (r.code === 0 && r.stdout.trim() !== 'HEAD') branch = r.stdout.trim();
    }

    // `--force` because an active lane will have a dirty/locked worktree.
    const cwd = mainRoot ?? worktree;
    const removed = await run('git', ['worktree', 'remove', '--force', worktree], { cwd });
    if (removed.code !== 0) {
      // Worktree dir may already be gone; clean up filesystem + prune metadata.
      await rm(worktree, { recursive: true, force: true });
      await run('git', ['worktree', 'prune'], { cwd }).catch(() => undefined);
    }

    if (branch && mainRoot) {
      // Best-effort: delete the lane branch (force, since the work may be unmerged).
      await run('git', ['branch', '-D', branch], { cwd: mainRoot }).catch(() => undefined);
    }
  }
}

/** Ensure `dir` exists and contains a `.gitignore` that ignores everything under it. */
async function ensureIgnored(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
  const gitignore = join(dir, '.gitignore');
  try {
    await access(gitignore);
  } catch {
    await writeFile(gitignore, '*\n');
  }
}

/** True when `child` is `parent` or nested under it (path-aware, not string-prefix). */
function isInside(parent: string, child: string): boolean {
  const rel = relative(parent, child);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

/**
 * Parse `git worktree list --porcelain` to find the worktree path currently checked out on
 * `branch` (matched as `refs/heads/<branch>`), or undefined if none.
 */
async function worktreeHoldingBranch(repoRoot: string, branch: string): Promise<string | undefined> {
  const r = await run('git', ['worktree', 'list', '--porcelain'], { cwd: repoRoot });
  if (r.code !== 0) return undefined;
  let current: string | undefined;
  for (const line of r.stdout.split('\n')) {
    if (line.startsWith('worktree ')) current = line.slice('worktree '.length).trim();
    else if (line === `branch refs/heads/${branch}`) return current;
  }
  return undefined;
}

async function assertGitRepo(repoRoot: string): Promise<void> {
  const r = await run('git', ['rev-parse', '--is-inside-work-tree'], { cwd: repoRoot });
  if (r.code !== 0 || r.stdout.trim() !== 'true') {
    throw new Error(`Not a git repository: ${repoRoot}`);
  }
}

/**
 * Resolve the *main* worktree's toplevel from any linked worktree. The common dir
 * (`.git` of the primary checkout) lives at `<mainRoot>/.git`, so its parent is the root.
 * Returns undefined if it can't be determined (e.g. the worktree is already gone).
 */
async function mainWorktreeRoot(worktree: string): Promise<string | undefined> {
  const r = await run(
    'git',
    ['rev-parse', '--path-format=absolute', '--git-common-dir'],
    { cwd: worktree },
  );
  if (r.code !== 0) return undefined;
  const commonDir = r.stdout.trim(); // e.g. /repo/.git
  return commonDir.endsWith('/.git') ? commonDir.slice(0, -'/.git'.length) : undefined;
}
