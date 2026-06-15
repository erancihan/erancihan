// Pure helpers for avatar-model discovery and personality presets — no Node/DOM imports,
// so they unit-test cleanly and are shared across processes.

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
}

/** Optional metadata file shape: resources/models/<id>/companion.json */
export interface ModelMeta {
  name?: string
  license?: string
  author?: string
}

/** Normalize optional metadata into display fields. Pure. */
export function normalizeMeta(id: string, meta: ModelMeta | undefined): {
  name: string
  license?: string
  author?: string
} {
  return {
    name: meta?.name?.trim() || id,
    license: meta?.license?.trim() || undefined,
    author: meta?.author?.trim() || undefined
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
