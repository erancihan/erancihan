import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
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

export function loadSettings(): AppSettings {
  try {
    const raw = readFileSync(settingsPath(), 'utf8')
    return { ...defaults(), ...(JSON.parse(raw) as Partial<AppSettings>) }
  } catch {
    return defaults()
  }
}

export function saveSettings(partial: Partial<AppSettings>): AppSettings {
  const next = { ...loadSettings(), ...partial }
  const dir = app.getPath('userData')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(settingsPath(), JSON.stringify(next, null, 2), 'utf8')
  return next
}
