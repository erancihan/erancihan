import { describe, expect, it } from 'vitest'
import { EnergyVad, rms } from './vad.js'

// 16 kHz, 100 ms frames → 1600 samples/frame.
const SR = 16000
const FRAME = 1600
const loud = (): Float32Array => new Float32Array(FRAME).fill(0.3)
const quiet = (): Float32Array => new Float32Array(FRAME).fill(0)

describe('rms', () => {
  it('is zero for silence and positive for signal', () => {
    expect(rms(quiet())).toBe(0)
    expect(rms(loud())).toBeCloseTo(0.3, 5)
  })
})

describe('EnergyVad', () => {
  it('signals speech start on the first loud frame', () => {
    const vad = new EnergyVad({ sampleRate: SR })
    expect(vad.accept(quiet()).speechStart).toBeUndefined()
    expect(vad.accept(loud()).speechStart).toBe(true)
  })

  it('emits an utterance after enough trailing silence', () => {
    const vad = new EnergyVad({ sampleRate: SR, hangoverMs: 200, minSpeechMs: 150 })
    vad.accept(loud()) // 100ms speech
    vad.accept(loud()) // 200ms speech
    expect(vad.accept(quiet()).utterance).toBeUndefined() // 100ms silence < hangover
    const ev = vad.accept(quiet()) // 200ms silence >= hangover
    expect(ev.utterance).toBeInstanceOf(Float32Array)
    expect(ev.utterance!.length).toBeGreaterThan(FRAME * 2) // speech + trailing silence
  })

  it('drops utterances shorter than minSpeechMs', () => {
    const vad = new EnergyVad({ sampleRate: SR, hangoverMs: 100, minSpeechMs: 500 })
    vad.accept(loud()) // only 100ms of speech
    const ev = vad.accept(quiet()) // silence ends it
    expect(ev.utterance).toBeUndefined()
  })
})
