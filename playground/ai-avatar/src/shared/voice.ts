// Pure helper to turn a raw assistant reply into something pleasant for TTS.
// No Node/DOM imports, so it unit-tests cleanly.

const MAX_SPEAK_CHARS = 600

/**
 * Clean an assistant reply for speech: drop code blocks, inline code, URLs, and markdown
 * decoration (TTS reading backticks/asterisks/links is grating), collapse whitespace, and
 * truncate to a sentence boundary near the limit so replies don't drone on. Pure.
 */
export function cleanForSpeech(text: string): string {
  let s = text

  s = s.replace(/```[\s\S]*?```/g, ' ') // fenced code blocks
  s = s.replace(/`[^`]*`/g, ' ') // inline code
  s = s.replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1') // images/links -> label
  s = s.replace(/https?:\/\/\S+/g, ' ') // bare URLs
  s = s.replace(/[*_#>~|]/g, ' ') // markdown punctuation
  s = s.replace(/\s+/g, ' ').trim() // collapse whitespace

  if (s.length <= MAX_SPEAK_CHARS) return s

  // Prefer to cut at the last sentence end before the limit; fall back to a hard cut.
  const window = s.slice(0, MAX_SPEAK_CHARS)
  const lastStop = Math.max(
    window.lastIndexOf('. '),
    window.lastIndexOf('! '),
    window.lastIndexOf('? ')
  )
  return (lastStop > 200 ? window.slice(0, lastStop + 1) : window).trim()
}
