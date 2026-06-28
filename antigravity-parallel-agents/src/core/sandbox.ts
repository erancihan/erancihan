/**
 * SandboxProvider implementations — process/network/host isolation for a lane.
 *
 * Mirrors Antigravity's own model: nsjail on Linux, AppContainer on Windows. Where no OS
 * sandbox is available (e.g. macOS, or nsjail not installed) we fall back to a no-op that
 * loudly warns, so isolation degrades to worktree-only rather than silently lying.
 * See docs/PLAN.md §3.3 / §6 Q4.
 */

import { platform } from 'node:os';
import { commandExists } from './exec.js';
import type { LaneIsolation } from './types.js';
import type { SandboxProvider } from './isolation.js';

/** No OS sandbox — lane still has worktree (file) isolation only. */
export class NoopSandboxProvider implements SandboxProvider {
  readonly kind = 'none' as const;
  constructor(private readonly reason = 'no OS sandbox available') {}
  wrap(cmd: string, args: string[]): { cmd: string; args: string[] } {
    return { cmd, args };
  }
  get warning(): string {
    return `⚠️  Sandboxing disabled (${this.reason}); lanes are isolated by git worktree only.`;
  }
}

/** Linux nsjail: confine the process to its worktree with namespace isolation. */
export class NsjailSandboxProvider implements SandboxProvider {
  readonly kind = 'nsjail' as const;
  constructor(private readonly nsjailPath = 'nsjail') {}
  wrap(cmd: string, args: string[], cwd: string): { cmd: string; args: string[] } {
    // Bind-mount the worktree rw, keep the rest of the fs read-only, isolate net by
    // default. Flags are conservative defaults; tune per docs/PLAN.md Phase 1.
    const nsjailArgs = [
      '--quiet',
      '--cwd', cwd,
      '--bindmount', `${cwd}:${cwd}`,
      '--bindmount_ro', '/usr',
      '--bindmount_ro', '/bin',
      '--bindmount_ro', '/lib',
      '--disable_clone_newnet', // allow net for now; flip to isolate (see Q4)
      '--', cmd, ...args,
    ];
    return { cmd: this.nsjailPath, args: nsjailArgs };
  }
}

/** Windows AppContainer — placeholder (Phase 7); falls back to no-op until implemented. */
export class AppContainerSandboxProvider implements SandboxProvider {
  readonly kind = 'appcontainer' as const;
  wrap(cmd: string, args: string[]): { cmd: string; args: string[] } {
    return { cmd, args };
  }
}

/**
 * Pick the best available sandbox for the current host. Detection is async because we
 * probe for the nsjail binary; result is a ready-to-use provider.
 */
export async function detectSandbox(): Promise<SandboxProvider> {
  const os = platform();
  if (os === 'linux') {
    return (await commandExists('nsjail'))
      ? new NsjailSandboxProvider()
      : new NoopSandboxProvider('nsjail not installed');
  }
  if (os === 'win32') return new AppContainerSandboxProvider();
  return new NoopSandboxProvider(`${os} has no supported OS sandbox`);
}

export type { LaneIsolation };
