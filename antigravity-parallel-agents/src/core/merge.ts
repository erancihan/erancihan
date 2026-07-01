/**
 * Merge-back — bring a finished lane's branch into the working branch, review its diff, or
 * discard it. Lanes are isolated *while running*, but two lanes touching the same files
 * still conflict *at merge time*; per docs/PLAN.md §6 Q7 we surface conflicts and abort
 * rather than auto-resolve, leaving the user's tree clean to resolve in the IDE.
 */

import { run } from './exec.js';

export type MergeStrategy = 'merge' | 'ff-only' | 'squash';

export interface MergeOptions {
  /** Branch to merge into (default: the repo's current branch). */
  into?: string;
  strategy?: MergeStrategy;
  /** Delete the lane branch after a successful merge. */
  deleteBranch?: boolean;
}

export interface MergeResult {
  ok: boolean;
  conflicted: boolean;
  /** Paths with merge conflicts (only when conflicted). */
  conflicts: string[];
  message: string;
}

/** Merge a lane branch back; on conflict, abort cleanly and report the conflicting paths. */
export async function mergeLane(
  repoRoot: string,
  branch: string,
  opts: MergeOptions = {},
): Promise<MergeResult> {
  const strategy = opts.strategy ?? 'merge';

  if (opts.into) {
    const co = await run('git', ['checkout', opts.into], { cwd: repoRoot });
    if (co.code !== 0) {
      return { ok: false, conflicted: false, conflicts: [], message: `checkout ${opts.into} failed: ${co.stderr.trim()}` };
    }
  }

  const args =
    strategy === 'squash' ? ['merge', '--squash', branch]
    : strategy === 'ff-only' ? ['merge', '--ff-only', branch]
    : ['merge', '--no-ff', '--no-edit', branch];

  const m = await run('git', args, { cwd: repoRoot });
  if (m.code === 0) {
    if (strategy === 'squash') {
      // `--squash` stages but doesn't commit; finish the commit.
      await run('git', ['commit', '--no-edit', '-m', `merge lane ${branch} (squash)`], { cwd: repoRoot });
    }
    if (opts.deleteBranch) {
      await run('git', ['branch', '-D', branch], { cwd: repoRoot }).catch(() => undefined);
    }
    return { ok: true, conflicted: false, conflicts: [], message: `Merged ${branch}.` };
  }

  // Did it fail because of conflicts? List them, then abort to keep the tree clean.
  const conflicts = await conflictedPaths(repoRoot);
  if (conflicts.length > 0) {
    await abortMerge(repoRoot, strategy);
    return {
      ok: false,
      conflicted: true,
      conflicts,
      message: `Merge of ${branch} conflicts in ${conflicts.length} file(s); aborted.`,
    };
  }
  return { ok: false, conflicted: false, conflicts: [], message: m.stderr.trim() || 'merge failed' };
}

/**
 * Recover a clean working tree after a conflicted merge. `--squash` never records a
 * MERGE_HEAD, so `git merge --abort` fails for it — reset --hard instead. (The pre-merge
 * tree is required to be clean, so reset --hard only discards our own half-applied merge.)
 */
async function abortMerge(repoRoot: string, strategy: MergeStrategy): Promise<void> {
  if (strategy === 'squash') {
    await run('git', ['reset', '--hard'], { cwd: repoRoot }).catch(() => undefined);
  } else {
    await run('git', ['merge', '--abort'], { cwd: repoRoot }).catch(() => undefined);
  }
}

/** The diff a lane introduced relative to its merge-base with `baseRef` (default HEAD). */
export async function laneDiff(repoRoot: string, branch: string, baseRef = 'HEAD'): Promise<string> {
  const r = await run('git', ['diff', `${baseRef}...${branch}`], { cwd: repoRoot });
  return r.stdout;
}

/** Throw away a lane's branch. */
export async function discardLane(repoRoot: string, branch: string): Promise<void> {
  await run('git', ['branch', '-D', branch], { cwd: repoRoot }).catch(() => undefined);
}

async function conflictedPaths(repoRoot: string): Promise<string[]> {
  const r = await run('git', ['diff', '--name-only', '--diff-filter=U'], { cwd: repoRoot });
  return r.stdout.split('\n').map((s) => s.trim()).filter(Boolean);
}
