import { describe, expect, it } from 'vitest'
import {
  buildEmotionPrompt,
  extractLastAssistantText,
  parseEmotion,
  splitForTagStream,
  stripEmotionTags
} from './emotion.js'

describe('parseEmotion', () => {
  it('reads a bare emotion word', () => {
    expect(parseEmotion('happy')).toBe('happy')
  })
  it('is case- and punctuation-tolerant', () => {
    expect(parseEmotion('  Excited!\n')).toBe('excited')
  })
  it('picks the first listed emotion from a sentence', () => {
    expect(parseEmotion('The tone is clearly sad overall.')).toBe('sad')
  })
  it('returns undefined when nothing matches', () => {
    expect(parseEmotion('uncertain')).toBeUndefined()
    expect(parseEmotion('')).toBeUndefined()
  })
})

describe('buildEmotionPrompt', () => {
  it('includes the message and the allowed labels', () => {
    const p = buildEmotionPrompt('all tests pass!')
    expect(p).toContain('all tests pass!')
    expect(p).toContain('happy')
  })
  it('truncates to the tail of long replies', () => {
    const long = 'x'.repeat(5000) + 'TAILMARKER'
    expect(buildEmotionPrompt(long)).toContain('TAILMARKER')
    expect(buildEmotionPrompt(long).length).toBeLessThan(2500)
  })
})

describe('extractLastAssistantText', () => {
  it('returns the last assistant text block', () => {
    const jsonl = [
      JSON.stringify({ type: 'user', message: { role: 'user', content: 'hi' } }),
      JSON.stringify({
        type: 'assistant',
        message: { role: 'assistant', content: [{ type: 'text', text: 'first' }] }
      }),
      JSON.stringify({
        type: 'assistant',
        message: { role: 'assistant', content: [{ type: 'text', text: 'second' }] }
      })
    ].join('\n')
    expect(extractLastAssistantText(jsonl)).toBe('second')
  })

  it('handles string content and skips malformed lines', () => {
    const jsonl = [
      'not json',
      JSON.stringify({ role: 'assistant', content: 'done' }),
      ''
    ].join('\n')
    expect(extractLastAssistantText(jsonl)).toBe('done')
  })

  it('returns undefined when there is no assistant message', () => {
    const jsonl = JSON.stringify({ type: 'user', message: { role: 'user', content: 'hi' } })
    expect(extractLastAssistantText(jsonl)).toBeUndefined()
  })
})

describe('stripEmotionTags', () => {
  it('strips tags and reports them, case-insensitively', () => {
    const { clean, emotions } = stripEmotionTags('Oh no [Sad] that failed [angry]')
    expect(clean).toBe('Oh no  that failed ')
    expect(emotions).toEqual(['sad', 'angry'])
  })
  it('leaves non-emotion brackets alone', () => {
    expect(stripEmotionTags('arr[0] and [whatever]').clean).toBe('arr[0] and [whatever]')
  })
})

describe('splitForTagStream', () => {
  it('extracts a complete tag from a chunk', () => {
    const r = splitForTagStream('', 'done [happy] ok')
    expect(r.text).toBe('done  ok')
    expect(r.emotions).toEqual(['happy'])
    expect(r.carry).toBe('')
  })

  it('reassembles a tag split across two chunks', () => {
    const a = splitForTagStream('', 'great [exc')
    expect(a.text).toBe('great ')
    expect(a.carry).toBe('[exc')
    const b = splitForTagStream(a.carry, 'ited] done')
    expect(b.emotions).toEqual(['excited'])
    expect(b.text).toBe(' done')
  })

  it('never buffers ANSI escape sequences', () => {
    const r = splitForTagStream('', '\x1b[0m\x1b[32mhi')
    expect(r.text).toBe('\x1b[0m\x1b[32mhi')
    expect(r.carry).toBe('')
  })
})
