import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { MANAGED_HOOKS, type HookEvent } from '../../shared/hookEvents.js'
import type { HooksStatus } from '../../shared/ipc.js'

interface HookCommand {
  type: 'command'
  command: string
}
interface HookEntry {
  matcher?: string
  hooks: HookCommand[]
}
type HooksMap = Record<string, HookEntry[]>
interface SettingsLike {
  hooks?: HooksMap
  [key: string]: unknown
}

/** Build the hook command for an event. Kept as a callback so the caller owns paths. */
export type CommandBuilder = (event: HookEvent) => string

function clone(settings: SettingsLike): SettingsLike {
  // Settings are plain JSON; structuredClone keeps it simple and safe.
  return JSON.parse(JSON.stringify(settings)) as SettingsLike
}

/** True if an entry belongs to us — identified by our script path inside the command. */
function isOurs(entry: HookEntry, scriptPath: string): boolean {
  return entry.hooks.some((h) => h.command.includes(scriptPath))
}

/** Count our managed entries currently present (pure). */
export function countManagedHooks(settings: SettingsLike, scriptPath: string): number {
  const hooks = settings.hooks ?? {}
  let n = 0
  for (const { event } of MANAGED_HOOKS) {
    for (const entry of hooks[event] ?? []) {
      if (isOurs(entry, scriptPath)) n++
    }
  }
  return n
}

/**
 * Add our managed hooks, preserving any pre-existing hooks (ours or the user's).
 * Idempotent: re-running won't create duplicates. Pure — returns a new settings object.
 */
export function addManagedHooks(
  settings: SettingsLike,
  scriptPath: string,
  build: CommandBuilder
): SettingsLike {
  const next = clone(settings)
  const hooks: HooksMap = next.hooks ?? {}
  for (const { event, matcher } of MANAGED_HOOKS) {
    const list = hooks[event] ?? []
    if (list.some((entry) => isOurs(entry, scriptPath))) continue // already installed
    const entry: HookEntry = { hooks: [{ type: 'command', command: build(event) }] }
    if (matcher) entry.matcher = matcher
    hooks[event] = [...list, entry]
  }
  next.hooks = hooks
  return next
}

/**
 * Remove only our managed hooks (matched by script path); leave everything else intact.
 * Empties and prunes keys we fully own. Pure — returns a new settings object.
 */
export function removeManagedHooks(settings: SettingsLike, scriptPath: string): SettingsLike {
  const next = clone(settings)
  const hooks = next.hooks
  if (!hooks) return next
  for (const event of Object.keys(hooks)) {
    const kept = hooks[event].filter((entry) => !isOurs(entry, scriptPath))
    if (kept.length === 0) delete hooks[event]
    else hooks[event] = kept
  }
  if (Object.keys(hooks).length === 0) delete next.hooks
  return next
}

// ---- fs layer ----

function readSettings(settingsPath: string): SettingsLike {
  try {
    return JSON.parse(readFileSync(settingsPath, 'utf8')) as SettingsLike
  } catch {
    return {}
  }
}

function writeSettings(settingsPath: string, settings: SettingsLike): void {
  const dir = dirname(settingsPath)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf8')
}

export interface InstallContext {
  settingsPath: string
  scriptPath: string
  build: CommandBuilder
}

export function hooksStatus(ctx: InstallContext): HooksStatus {
  try {
    const settings = readSettings(ctx.settingsPath)
    return {
      installed: countManagedHooks(settings, ctx.scriptPath) === MANAGED_HOOKS.length,
      settingsPath: ctx.settingsPath
    }
  } catch (err) {
    return {
      installed: false,
      settingsPath: ctx.settingsPath,
      error: err instanceof Error ? err.message : String(err)
    }
  }
}

export function installHooks(ctx: InstallContext): HooksStatus {
  try {
    const next = addManagedHooks(readSettings(ctx.settingsPath), ctx.scriptPath, ctx.build)
    writeSettings(ctx.settingsPath, next)
    return { installed: true, settingsPath: ctx.settingsPath }
  } catch (err) {
    return {
      installed: false,
      settingsPath: ctx.settingsPath,
      error: err instanceof Error ? err.message : String(err)
    }
  }
}

export function uninstallHooks(ctx: InstallContext): HooksStatus {
  try {
    const next = removeManagedHooks(readSettings(ctx.settingsPath), ctx.scriptPath)
    writeSettings(ctx.settingsPath, next)
    return { installed: false, settingsPath: ctx.settingsPath }
  } catch (err) {
    return {
      installed: false,
      settingsPath: ctx.settingsPath,
      error: err instanceof Error ? err.message : String(err)
    }
  }
}
