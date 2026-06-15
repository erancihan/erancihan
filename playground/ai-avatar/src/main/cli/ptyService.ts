import { createRequire } from 'node:module'
import { homedir, platform } from 'node:os'
import { delimiter, join } from 'node:path'
import type { TerminalSize } from '../../shared/ipc.js'

export interface PtyCallbacks {
  onData: (data: string) => void
  onExit: (code: number) => void
}

export interface StartOptions {
  /** Resolved `claude` binary (path or bare command from detect.ts). */
  command: string
  /** Working directory for the session. */
  cwd: string
  /** Extra CLI args, e.g. ['--append-system-prompt', '<personality>'] (Phase 5). */
  args?: string[]
  size: TerminalSize
}

/** The slice of node-pty's IPty we depend on — kept minimal so it can be faked in tests. */
export interface PtyLike {
  onData(cb: (data: string) => void): void
  onExit(cb: (e: { exitCode: number }) => void): void
  write(data: string): void
  resize(cols: number, rows: number): void
  kill(): void
}

export interface PtySpawnOptions {
  name: string
  cols: number
  rows: number
  cwd: string
  env: NodeJS.ProcessEnv
}

export type PtySpawn = (file: string, args: string[], opts: PtySpawnOptions) => PtyLike

// Load node-pty lazily via require so importing this module (e.g. under Vitest's Node
// runtime) never triggers the native addon, which is built against Electron's ABI.
let cachedSpawn: PtySpawn | null = null
const nodePtySpawn: PtySpawn = (file, args, opts) => {
  if (!cachedSpawn) {
    const require = createRequire(import.meta.url)
    cachedSpawn = (require('node-pty') as { spawn: PtySpawn }).spawn
  }
  return cachedSpawn(file, args, opts)
}

/**
 * Owns a single interactive `claude` PTY. Both the embedded xterm terminal and the
 * avatar chat box write to the same instance's stdin, so they drive one shared
 * Claude Code session — exactly the "the CLI chat is open and I can type in it too"
 * model from the plan.
 */
export class PtyService {
  private pty: PtyLike | null = null

  /** `spawnFn` is injectable so tests can drive the lifecycle without a real PTY. */
  constructor(private readonly spawnFn: PtySpawn = nodePtySpawn) {}

  isRunning(): boolean {
    return this.pty !== null
  }

  start(opts: StartOptions, cb: PtyCallbacks): void {
    // Restart cleanly if a session already exists.
    this.dispose()

    const child = this.spawnFn(opts.command, opts.args ?? [], {
      name: 'xterm-color',
      cols: opts.size.cols,
      rows: opts.size.rows,
      cwd: opts.cwd,
      env: this.buildEnv()
    })
    this.pty = child

    child.onData((data) => cb.onData(data))
    child.onExit(({ exitCode }) => {
      // Guard on identity: a previously-killed PTY emits its exit asynchronously, which
      // can arrive AFTER we've spawned a replacement (React StrictMode double-mounts the
      // terminal, so start() runs twice). Without this check the stale exit would null
      // out the live PTY — breaking stdin so keystrokes silently vanish — and report a
      // spurious "session exited" to the UI. Only act if this child is still current.
      if (this.pty !== child) return
      this.pty = null
      cb.onExit(exitCode)
    })
  }

  write(data: string): void {
    this.pty?.write(data)
  }

  resize(size: TerminalSize): void {
    if (!this.pty) return
    // node-pty throws on non-positive dimensions during transient layout states.
    const cols = Math.max(1, Math.floor(size.cols))
    const rows = Math.max(1, Math.floor(size.rows))
    this.pty.resize(cols, rows)
  }

  dispose(): void {
    if (!this.pty) return
    // Detach first so the kill's delayed onExit is treated as superseded (the identity
    // guard in start() sees this.pty !== child and ignores it).
    const child = this.pty
    this.pty = null
    try {
      child.kill()
    } catch {
      // Process may already be gone; ignore.
    }
  }

  /**
   * Build the child environment. Two deliberate choices:
   *  - Strip ANTHROPIC_API_KEY so the session always runs on the user's Claude Code
   *    login, never a key — matching the plan's "no API key, ever" guarantee (and the
   *    verification step that unsets the key).
   *  - Augment PATH with common bin dirs, since a GUI app launched from Finder/Dock
   *    inherits a sparse PATH that often omits ~/.local/bin where `claude` lives.
   */
  private buildEnv(): NodeJS.ProcessEnv {
    const env: NodeJS.ProcessEnv = { ...process.env }
    delete env.ANTHROPIC_API_KEY

    const home = homedir()
    const extra =
      platform() === 'win32'
        ? []
        : [join(home, '.local', 'bin'), '/usr/local/bin', '/opt/homebrew/bin']
    env.PATH = [env.PATH ?? '', ...extra].filter(Boolean).join(delimiter)
    // Ensure a sane terminal type for the CLI's TUI rendering.
    env.TERM = env.TERM ?? 'xterm-256color'
    return env
  }
}
