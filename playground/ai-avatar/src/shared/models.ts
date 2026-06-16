// Pure helpers for avatar-model discovery and personality presets — no Node/DOM imports,
// so they unit-test cleanly and are shared across processes.

/** Maps our emotion/pose labels to a model's own .exp3 / motion-group names or indices. */
export type AvatarMap = Record<string, string | number>

/** A discovered avatar model, surfaced to the Settings UI. */
export interface ModelInfo {
  /** Folder name under resources/models. */
  id: string
  /** Display name (from companion.json, else the folder name). */
  name: string
  /** License note shown in the UI before distribution. */
  license?: string
  author?: string
  /** URL the renderer loads the model3.json from (custom protocol). */
  modelUrl: string
  /** Our 7 emotion labels → this model's expression names/indices (optional). */
  expressionMap?: AvatarMap
  /** Our pose labels → this model's motion groups (optional). */
  motionMap?: AvatarMap
}

/** Optional metadata file shape: resources/models/<id>/companion.json */
export interface ModelMeta {
  name?: string
  license?: string
  author?: string
  expressionMap?: AvatarMap
  motionMap?: AvatarMap
}

/** Keep only string→(string|number) entries — defends against malformed companion.json. */
function sanitizeMap(map: unknown): AvatarMap | undefined {
  if (!map || typeof map !== 'object') return undefined
  const out: AvatarMap = {}
  for (const [k, v] of Object.entries(map as Record<string, unknown>)) {
    if (typeof v === 'string' || typeof v === 'number') out[k] = v
  }
  return Object.keys(out).length ? out : undefined
}

/** Normalize optional metadata into display + mapping fields. Pure. */
export function normalizeMeta(
  id: string,
  meta: ModelMeta | undefined
): { name: string; license?: string; author?: string; expressionMap?: AvatarMap; motionMap?: AvatarMap } {
  return {
    name: meta?.name?.trim() || id,
    license: meta?.license?.trim() || undefined,
    author: meta?.author?.trim() || undefined,
    expressionMap: sanitizeMap(meta?.expressionMap),
    motionMap: sanitizeMap(meta?.motionMap)
  }
}

/** Pick the model3.json entry file from a folder listing. Pure. */
export function pickModel3File(filenames: string[]): string | undefined {
  return filenames.find((f) => f.toLowerCase().endsWith('.model3.json'))
}

/** Personality preset for Claude Code's appended system prompt (Phase 5). */
export interface PersonalityPreset {
  id: string
  label: string
  /** Text appended via --append-system-prompt. Empty = no personality. */
  prompt: string
}

export const PERSONALITY_PRESETS: PersonalityPreset[] = [
  { id: 'default', label: 'Default', prompt: '' },
  {
    id: 'cheerful',
    label: 'Cheerful',
    prompt:
      'Adopt a warm, upbeat, encouraging tone. Celebrate small wins and keep morale high, ' +
      'while staying technically accurate and concise.'
  },
  {
    id: 'terse',
    label: 'Terse',
    prompt: 'Be extremely concise. Prefer short sentences and fragments. No filler, no preamble.'
  },
  {
    id: 'mentor',
    label: 'Mentor',
    prompt:
      'Explain your reasoning like a patient mentor: briefly say why before what, and point ' +
      'out one thing the user can learn from each change.'
  },
  {
    id: 'playful',
    label: 'Playful',
    prompt: 'Be witty and a little playful, with the occasional light joke — never at the cost of accuracy.'
  }
]

/** Build the claude CLI args for an appended personality prompt. Pure. */
export function buildPersonalityArgs(personality: string): string[] {
  const text = personality.trim()
  return text ? ['--append-system-prompt', text] : []
}

/**
 * Parse a user-supplied persona file (resources/personas/<id>.json) into a preset.
 * Requires a non-empty `label` and `prompt`; returns null otherwise. Pure.
 */
export function parsePersona(raw: unknown, id: string): PersonalityPreset | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const label = typeof o.label === 'string' ? o.label.trim() : ''
  const prompt = typeof o.prompt === 'string' ? o.prompt : ''
  if (!label || !prompt.trim()) return null
  return { id: typeof o.id === 'string' && o.id.trim() ? o.id.trim() : id, label, prompt }
}

/** Merge built-in presets with custom personas, custom winning on id collision. */
export function mergePersonas(custom: PersonalityPreset[]): PersonalityPreset[] {
  const byId = new Map(PERSONALITY_PRESETS.map((p) => [p.id, p]))
  for (const p of custom) byId.set(p.id, p)
  return [...byId.values()]
}
