/**
 * Convenience wiring: build an IsolationProvider from the real worktree provider and the
 * best OS sandbox available on this host. Kept separate from isolation.ts so that module
 * stays free of concrete imports (and free of import cycles).
 */

import { IsolationProvider } from './isolation.js';
import { GitWorktreeProvider, type GitWorktreeOptions } from './worktree.js';
import { detectSandbox, NoopSandboxProvider } from './sandbox.js';

export interface CreateIsolationOptions {
  worktree?: GitWorktreeOptions;
  /** Force worktree-only isolation (skip OS sandbox detection). */
  noSandbox?: boolean;
}

export async function createIsolationProvider(
  opts: CreateIsolationOptions = {},
): Promise<IsolationProvider> {
  const worktrees = new GitWorktreeProvider(opts.worktree);
  const sandbox = opts.noSandbox
    ? new NoopSandboxProvider('disabled by config')
    : await detectSandbox();
  return new IsolationProvider(worktrees, sandbox);
}
