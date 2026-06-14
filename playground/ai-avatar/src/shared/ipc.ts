// Single source of truth for the contract crossing the main <-> renderer boundary.
// Imported by main (handlers), preload (bridge), and renderer (typed window API).

/** Result of probing the local `claude` CLI on launch. */
export interface CliStatus {
  /** True when a `claude` binary was found and reports a version. */
  found: boolean
  /** Absolute path to the resolved binary, if found. */
  path?: string
  /** Raw version string, e.g. "2.1.177 (Claude Code)". */
  version?: string
  /**
   * Best-effort login check. `unknown` means we could not determine it cheaply
   * without launching an interactive session — the embedded terminal is the
   * real source of truth for auth.
   */
  loggedIn: 'yes' | 'no' | 'unknown'
  /** Human-readable guidance shown when `found` is false or login looks absent. */
  guidance?: string
}

/** High-level avatar poses driven by Claude Code session state (Phase 2+). */
export type AvatarPose = 'idle' | 'listening' | 'thinking' | 'working' | 'speaking' | 'alert'

/** A cue emitted toward the avatar (from hooks in Phase 2, or app logic). */
export interface AvatarCue {
  pose?: AvatarPose
  /** Optional named expression (maps to a Live2D .exp3 in Phase 3). */
  expression?: string
  /** Free-form source tag for debugging, e.g. "PreToolUse:Edit". */
  source?: string
}

/** App settings persisted to userData (NO Anthropic credentials are ever stored). */
export interface AppSettings {
  /** Working directory the embedded `claude` session is spawned in. */
  projectDir: string
  /** Avatar model id/folder under resources/models. */
  avatarModel: string
  /** Personality text appended to Claude Code context (Phase 5). */
  personality: string
}

/** IPC channel names. Centralized to avoid stringly-typed drift across processes. */
export const Channels = {
  // main -> renderer (events)
  TerminalData: 'terminal:data',
  TerminalExit: 'terminal:exit',
  AvatarCue: 'avatar:cue',
  // renderer -> main (invocations)
  CliDetect: 'cli:detect',
  TerminalStart: 'terminal:start',
  TerminalInput: 'terminal:input',
  TerminalResize: 'terminal:resize',
  SettingsGet: 'settings:get',
  SettingsSet: 'settings:set',
  AppQuit: 'app:quit'
} as const

export interface TerminalSize {
  cols: number
  rows: number
}
