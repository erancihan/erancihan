import { describe, expect, it } from 'vitest'
import { buildPersonalityArgs, normalizeMeta, pickModel3File } from './models.js'

describe('pickModel3File', () => {
  it('finds the model3.json entry', () => {
    expect(pickModel3File(['hiyori.moc3', 'hiyori.model3.json', 'texture.png'])).toBe(
      'hiyori.model3.json'
    )
  })
  it('is case-insensitive and returns undefined when missing', () => {
    expect(pickModel3File(['A.MODEL3.JSON'])).toBe('A.MODEL3.JSON')
    expect(pickModel3File(['a.moc3'])).toBeUndefined()
  })
})

describe('normalizeMeta', () => {
  it('falls back to the folder id when name is absent', () => {
    expect(normalizeMeta('hiyori', undefined).name).toBe('hiyori')
    expect(normalizeMeta('hiyori', { name: '  ' }).name).toBe('hiyori')
  })
  it('keeps provided fields', () => {
    const m = normalizeMeta('x', { name: 'Hiyori', license: 'personal use', author: 'Live2D' })
    expect(m.name).toBe('Hiyori')
    expect(m.license).toBe('personal use')
    expect(m.author).toBe('Live2D')
  })

  it('passes through expression/motion maps, dropping invalid entries', () => {
    const m = normalizeMeta('x', {
      expressionMap: { happy: 'f03', anger: 2, bad: { x: 1 } as never },
      motionMap: { working: 'TapBody' }
    })
    expect(m.expressionMap).toEqual({ happy: 'f03', anger: 2 })
    expect(m.motionMap).toEqual({ working: 'TapBody' })
  })

  it('omits maps entirely when absent or empty', () => {
    expect(normalizeMeta('x', undefined).expressionMap).toBeUndefined()
    expect(normalizeMeta('x', { expressionMap: {} }).expressionMap).toBeUndefined()
  })
})

describe('buildPersonalityArgs', () => {
  it('returns the append flag for non-empty text', () => {
    expect(buildPersonalityArgs('be terse')).toEqual(['--append-system-prompt', 'be terse'])
  })
  it('returns nothing for empty/blank text', () => {
    expect(buildPersonalityArgs('   ')).toEqual([])
    expect(buildPersonalityArgs('')).toEqual([])
  })
})
