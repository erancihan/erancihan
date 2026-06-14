import { describe, expect, it } from 'vitest'
import { parseVersion } from './detect.js'

describe('parseVersion', () => {
  it('extracts a normal version line', () => {
    expect(parseVersion('2.1.177 (Claude Code)\n')).toBe('2.1.177 (Claude Code)')
  })

  it('takes only the first line', () => {
    expect(parseVersion('1.2.3\nextra noise')).toBe('1.2.3')
  })

  it('trims surrounding whitespace', () => {
    expect(parseVersion('   0.9.0   ')).toBe('0.9.0')
  })

  it('returns undefined when no version-like token is present', () => {
    expect(parseVersion('command not found')).toBeUndefined()
    expect(parseVersion('')).toBeUndefined()
  })
})
