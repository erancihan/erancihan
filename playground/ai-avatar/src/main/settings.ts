import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { isAbsolute, join, resolve } from 'node:path'
import type { AppSettings } from '../shared/ipc.js'

// IMPORTANT: this store holds ONLY app preferences. It never holds Anthropic
// credentials — auth lives entirely in the user's Claude Code login.

function defaults(): AppSettings {
  return {
    projectDir: homedir(),
    avatarModel: 'sample',
    personality: ''
  }
}

function settingsPath(): string {
  return join(app.getPath('userData'), 'settings.json')
}

/**
 * Launch-time override for the start directory, e.g. `COMPANION_PROJECT_DIR=/path npm run dev`.
 * Wins for the session over the persisted setting (but is not written back, so it doesn't
 * stick). Relative paths resolve against the directory `npm run dev` was launched from.
 */
function envProjectDir(): string | undefined {
  const raw = process.env.COMPANION_PROJECT_DIR
  if (!raw) return undefined
  const dir = isAbsolute(raw) ? raw : resolve(process.cwd(), raw)
  try {
    if (statSync(dir).isDirectory()) return dir
  } catch {
    // Not a real directory — ignore the override rather than crashing the session.
  }
  return undefined
}

export function loadSettings(): AppSettings {
  let stored: AppSettings
  try {
    stored = { ...defaults(), ...(JSON.parse(readFileSync(settingsPath(), 'utf8')) as Partial<AppSettings>) }
  } catch {
    stored = defaults()
  }
  const override = envProjectDir()
  return override ? { ...stored, projectDir: override } : stored
}

export function saveSettings(partial: Partial<AppSettings>): AppSettings {
  const next = { ...loadSettings(), ...partial }
  const dir = app.getPath('userData')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(settingsPath(), JSON.stringify(next, null, 2), 'utf8')
  return next
}
