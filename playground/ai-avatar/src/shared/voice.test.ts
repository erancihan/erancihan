import { describe, expect, it } from 'vitest'
import { cleanForSpeech } from './voice.js'

describe('cleanForSpeech', () => {
  it('strips fenced code blocks', () => {
    const out = cleanForSpeech('Here you go:\n```js\nconst x = 1\n```\nDone.')
    expect(out).not.toContain('const x')
    expect(out).toContain('Done.')
  })

  it('removes inline code, links, urls and markdown punctuation', () => {
    const out = cleanForSpeech('Use `npm` — see [docs](https://x.io) and **bold** at https://y.io')
    expect(out).not.toMatch(/`|\*|https?:\/\//)
    expect(out).toContain('docs') // link label kept
  })

  it('collapses whitespace', () => {
    expect(cleanForSpeech('a\n\n  b\t c')).toBe('a b c')
  })

  it('truncates long replies near a sentence boundary', () => {
    const long = 'One. ' + 'word '.repeat(300) + 'End.'
    const out = cleanForSpeech(long)
    expect(out.length).toBeLessThanOrEqual(600)
  })
})
