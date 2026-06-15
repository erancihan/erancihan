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

/**
 * Instruction appended to the session's system prompt so Claude emits inline emotion tags.
 * Parsed live from the terminal stream (mid-reply) and on Stop (primary, replacing the
 * extra `claude -p` round-trip). Adopted from Open-LLM-VTuber's `[emotion]` convention.
 */
export const EMOTION_TAG_INSTRUCTION =
  'Avatar emotion cues: when your emotional tone shifts, include a single tag from this ' +
  'exact set inline, in square brackets: [neutral] [happy] [sad] [surprised] [angry] ' +
  '[excited] [thinking]. Use only those, sparingly, placed where the tone applies. They ' +
  'drive a companion avatar expression and are stripped from display.'

const TAG_BODY = EMOTIONS.join('|')

/** Remove inline emotion tags from text, returning the cleaned text and any tags found. */
export function stripEmotionTags(text: string): { clean: string; emotions: Emotion[] } {
  const emotions: Emotion[] = []
  const re = new RegExp(`\\[(${TAG_BODY})\\]`, 'gi')
  const clean = text.replace(re, (_m, e: string) => {
    emotions.push(e.toLowerCase() as Emotion)
    return ''
  })
  return { clean, emotions }
}

const MAX_TAG_LEN = 12

/**
 * Stream-safe emotion-tag splitter for the live terminal feed. Strips complete tags and
 * holds back ONLY a trailing partial emotion tag (`[` + letters) so a tag split across
 * chunks is still caught. Crucially it never buffers ANSI escapes (`ESC[0m` etc.) — those
 * contain digits/terminators, so the `[letters` test rejects them and they pass through
 * untouched. Pure: caller threads `carry` between calls.
 */
export function splitForTagStream(
  carry: string,
  chunk: string
): { text: string; emotions: Emotion[]; carry: string } {
  const buf = carry + chunk
  let scan = buf
  let nextCarry = ''
  const lastOpen = buf.lastIndexOf('[')
  if (lastOpen !== -1) {
    const tail = buf.slice(lastOpen)
    // Only a pure "[letters" tail could be the start of a real emotion tag.
    if (tail.length <= MAX_TAG_LEN && /^\[[a-z]*$/i.test(tail)) {
      scan = buf.slice(0, lastOpen)
      nextCarry = tail
    }
  }
  const { clean, emotions } = stripEmotionTags(scan)
  return { text: clean, emotions, carry: nextCarry }
}

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
