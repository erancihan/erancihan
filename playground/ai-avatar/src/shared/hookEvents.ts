import type { AvatarCue } from './ipc.js'

/** Claude Code hook events the companion installs and reacts to. */
export type HookEvent =
  | 'UserPromptSubmit'
  | 'PreToolUse'
  | 'PostToolUse'
  | 'Notification'
  | 'Stop'
  | 'SubagentStop'

/**
 * Events we register, and whether they take a tool `matcher`. Tool-scoped events use
 * `'*'` to fire for every tool; the others fire unconditionally. This list is the single
 * source of truth for both the installer (what to write) and uninstall (what to remove).
 */
export const MANAGED_HOOKS: { event: HookEvent; matcher?: string }[] = [
  { event: 'UserPromptSubmit' },
  { event: 'PreToolUse', matcher: '*' },
  { event: 'PostToolUse', matcher: '*' },
  { event: 'Notification' },
  { event: 'Stop' },
  { event: 'SubagentStop', matcher: '*' }
]

/** Shape forwarded from the hook script to the bridge. `data` is the raw hook stdin JSON. */
export interface HookSignal {
  event: string
  data?: Record<string, unknown>
}

/**
 * Map a hook event into an avatar cue. Pure + exported so it is unit-tested without a
 * running bridge. Returns null for events we don't translate.
 */
export function mapEventToCue(signal: HookSignal): AvatarCue | null {
  const { event, data } = signal
  switch (event) {
    case 'UserPromptSubmit':
      return { pose: 'thinking', source: event }
    case 'PreToolUse':
    case 'PostToolUse':
      return { pose: 'working', source: toolSource(event, data) }
    case 'Notification':
      return { pose: 'alert', source: event, message: messageOf(data) }
    case 'Stop':
      return { pose: 'idle', source: event }
    case 'SubagentStop':
      return { pose: 'working', source: event }
    default:
      return null
  }
}

function toolSource(event: string, data?: Record<string, unknown>): string {
  const tool = typeof data?.tool_name === 'string' ? data.tool_name : undefined
  return tool ? `${event}:${tool}` : event
}

function messageOf(data?: Record<string, unknown>): string | undefined {
  return typeof data?.message === 'string' ? data.message : undefined
}

// Friendly "inner thoughts" labels for tool activity, keyed by Claude Code tool name.
const TOOL_ACTIVITY: Record<string, string> = {
  Edit: 'editing files',
  MultiEdit: 'editing files',
  Write: 'writing a file',
  NotebookEdit: 'editing a notebook',
  Read: 'reading files',
  NotebookRead: 'reading a notebook',
  Bash: 'running a command',
  Grep: 'searching the code',
  Glob: 'searching the code',
  LS: 'looking around',
  WebFetch: 'browsing the web',
  WebSearch: 'searching the web',
  Task: 'spawning a subagent',
  TodoWrite: 'planning'
}

/**
 * Turn a cue `source` like "PreToolUse:Edit" into a human "inner thought" ("editing
 * files"), or null when there's no tool to describe. Pure + tested.
 */
export function describeActivity(source?: string): string | null {
  if (!source) return null
  const tool = source.split(':')[1]
  if (!tool) return null
  return TOOL_ACTIVITY[tool] ?? `using ${tool}`
}
