// Pure emotion-classification helpers — no Node/Electron imports, so they unit-test
// cleanly and are shared by the main-process EmotionService and the renderer's avatar.

/** The emotion labels we classify into. These double as avatar expression names. */
export const EMOTIONS = [
  'neutral',
  'happy',
  'sad',
  'surprised',
  'angry',
  'excited',
  'thinking'
] as const

export type Emotion = (typeof EMOTIONS)[number]

const MAX_CLASSIFY_CHARS = 2000

/** Build the classification prompt for `claude -p`. Pure. */
export function buildEmotionPrompt(replyText: string): string {
  const snippet = replyText.slice(-MAX_CLASSIFY_CHARS)
  return (
    'Classify the emotional tone of the following assistant message in ONE word, ' +
    `chosen strictly from this list: ${EMOTIONS.join(', ')}. ` +
    'Answer with only that one word, lowercase, no punctuation.\n\n' +
    `Message:\n${snippet}`
  )
}

/**
 * Extract an emotion from the model's reply. Tolerant: lowercases, strips punctuation,
 * and returns the first listed emotion it finds. Returns undefined if none match (so the
 * caller can leave the current expression unchanged rather than forcing 'neutral').
 */
export function parseEmotion(raw: string): Emotion | undefined {
  const words = raw.toLowerCase().match(/[a-z]+/g)
  if (!words) return undefined
  const set = new Set<string>(EMOTIONS)
  return words.find((w): w is Emotion => set.has(w))
}

interface TranscriptEntry {
  type?: string
  role?: string
  message?: { role?: string; content?: unknown }
  content?: unknown
}

/** Pull readable text out of a message `content` field (string or content-block array). */
function textFromContent(content: unknown): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content
    .map((block) => {
      if (typeof block === 'string') return block
      if (block && typeof block === 'object' && 'text' in block) {
        const t = (block as { text?: unknown }).text
        return typeof t === 'string' ? t : ''
      }
      return ''
    })
    .join('')
    .trim()
}

function isAssistant(entry: TranscriptEntry): boolean {
  return entry.type === 'assistant' || entry.role === 'assistant' || entry.message?.role === 'assistant'
}

/**
 * Extract the last assistant text message from a Claude Code transcript (JSONL). Pure —
 * takes the file contents as a string. Returns undefined if nothing usable is found.
 * Robust to format drift: malformed lines and non-assistant entries are skipped.
 */
export function extractLastAssistantText(jsonl: string): string | undefined {
  const lines = jsonl.split('\n')
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim()
    if (!line) continue
    let entry: TranscriptEntry
    try {
      entry = JSON.parse(line) as TranscriptEntry
    } catch {
      continue
    }
    if (!isAssistant(entry)) continue
    const text = textFromContent(entry.message?.content ?? entry.content)
    if (text) return text
  }
  return undefined
}
