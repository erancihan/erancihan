import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, extname, join } from 'node:path'
import { parsePersona, type PersonalityPreset } from '../shared/models.js'

/**
 * Load user-defined personas from resources/personas/*.json. Each file is
 * `{ "label": "...", "prompt": "..." }` (id defaults to the file name). These are merged
 * with the built-in presets in the Settings dropdown — declarative customization, no code.
 */
export function listCustomPersonas(dir: string): PersonalityPreset[] {
  if (!existsSync(dir)) return []
  const out: PersonalityPreset[] = []
  for (const file of readdirSync(dir)) {
    if (extname(file).toLowerCase() !== '.json') continue
    try {
      const raw = JSON.parse(readFileSync(join(dir, file), 'utf8'))
      const persona = parsePersona(raw, basename(file, extname(file)))
      if (persona) out.push(persona)
    } catch {
      // Skip malformed persona files.
    }
  }
  return out
}
