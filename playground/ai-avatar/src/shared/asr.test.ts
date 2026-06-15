import { describe, expect, it } from 'vitest'
import { resolveConfigPaths } from './asr.js'

// Fake resolver: known model files resolve to /asr/<name>, everything else stays put.
const known = new Set(['encoder.onnx', 'decoder.onnx', 'tokens.txt'])
const resolve = (rel: string): string | null => (known.has(rel) ? `/asr/${rel}` : null)

describe('resolveConfigPaths', () => {
  it('resolves nested relative model paths and leaves other values alone', () => {
    const config = {
      modelConfig: {
        whisper: { encoder: 'encoder.onnx', decoder: 'decoder.onnx' },
        tokens: 'tokens.txt',
        numThreads: 2,
        provider: 'cpu'
      },
      featConfig: { sampleRate: 16000 }
    }
    expect(resolveConfigPaths(config, resolve)).toEqual({
      modelConfig: {
        whisper: { encoder: '/asr/encoder.onnx', decoder: '/asr/decoder.onnx' },
        tokens: '/asr/tokens.txt',
        numThreads: 2,
        provider: 'cpu'
      },
      featConfig: { sampleRate: 16000 }
    })
  })

  it('handles arrays and unknown strings', () => {
    expect(resolveConfigPaths(['encoder.onnx', 'nope'], resolve)).toEqual([
      '/asr/encoder.onnx',
      'nope'
    ])
  })
})
