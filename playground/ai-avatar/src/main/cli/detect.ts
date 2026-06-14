import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir, platform } from 'node:os'
import { join, delimiter } from 'node:path'
import { promisify } from 'node:util'
import type { CliStatus } from '../../shared/ipc.js'

const execFileAsync = promisify(execFile)

/**
 * Extract a clean version string from `claude --version` output.
 * Pure + exported so it can be unit-tested without spawning a process.
 * e.g. "2.1.177 (Claude Code)\n" -> "2.1.177 (Claude Code)".
 */
export function parseVersion(raw: string): string | undefined {
  const line = raw.trim().split('\n')[0]?.trim()
  return line && /\d+\.\d+/.test(line) ? line : undefined
}

const INSTALL_GUIDANCE =
  'Claude Code CLI not found. Install it (https://docs.claude.com/claude-code), ' +
  'then run `claude` once and log in. This app uses your existing Claude Code login — ' +
  'it never needs an Anthropic API key.'

const LOGIN_GUIDANCE =
  'Claude Code is installed but may not be logged in. Run `claude` in a terminal and ' +
  'complete login. Auth lives entirely in your Claude Code session — no API key required.'

/**
 * Candidate locations to probe when `claude` is not on PATH. The CLI's official
 * installer drops a binary in ~/.local/bin, which a GUI app launched from Finder/
 * Dock won't have on its inherited PATH.
 */
function candidatePaths(): string[] {
  const home = homedir()
  const exe = platform() === 'win32' ? 'claude.exe' : 'claude'
  const dirs = [
    join(home, '.local', 'bin'),
    join(home, '.claude', 'local'),
    '/usr/local/bin',
    '/opt/homebrew/bin'
  ]
  return dirs.map((d) => join(d, exe))
}

/** Build a PATH that augments the (possibly sparse) inherited PATH with common bin dirs. */
function augmentedEnv(): NodeJS.ProcessEnv {
  const home = homedir()
  const extra = [join(home, '.local', 'bin'), '/usr/local/bin', '/opt/homebrew/bin']
  const current = process.env.PATH ?? ''
  return { ...process.env, PATH: [current, ...extra].filter(Boolean).join(delimiter) }
}

async function tryVersion(command: string): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync(command, ['--version'], {
      env: augmentedEnv(),
      timeout: 5000
    })
    return parseVersion(stdout)
  } catch {
    return undefined
  }
}

/**
 * Detect a usable `claude` CLI. Tries PATH first, then well-known install dirs.
 * Login state is reported `unknown` on success: confirming it cheaply is unreliable,
 * and the embedded interactive terminal is the real source of truth.
 */
export async function detectClaude(): Promise<CliStatus> {
  // 1) On PATH.
  const onPath = await tryVersion('claude')
  if (onPath) {
    return { found: true, path: 'claude', version: onPath, loggedIn: 'unknown' }
  }

  // 2) Known install locations.
  for (const candidate of candidatePaths()) {
    if (!existsSync(candidate)) continue
    const version = await tryVersion(candidate)
    if (version) {
      return { found: true, path: candidate, version, loggedIn: 'unknown' }
    }
  }

  return { found: false, loggedIn: 'no', guidance: INSTALL_GUIDANCE }
}

export { INSTALL_GUIDANCE, LOGIN_GUIDANCE }
