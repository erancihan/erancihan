import { describe, expect, it } from 'vitest'
import { buildEmotionPrompt, extractLastAssistantText, parseEmotion } from './emotion.js'

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
