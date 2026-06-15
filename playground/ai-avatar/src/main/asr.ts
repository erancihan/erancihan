import { createRequire } from 'node:module'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { resolveConfigPaths } from '../shared/asr.js'
import type { AsrStatus } from '../shared/ipc.js'

// Lazily required so importing this module (or running tests) never loads the native addon.
// sherpa-onnx-node is an N-API addon → ABI-stable, no electron-rebuild needed.
type SherpaModule = {
  OfflineRecognizer: new (config: unknown) => OfflineRecognizer
}
interface OfflineStream {
  acceptWaveform(obj: { sampleRate: number; samples: Float32Array }): void
}
interface OfflineRecognizer {
  createStream(): OfflineStream
  decode(stream: OfflineStream): void
  getResult(stream: OfflineStream): { text?: string }
}

/**
 * Offline speech-to-text via sherpa-onnx. The recognizer model is user-supplied under
 * `resources/asr/` (a `config.json` plus the model files it references) — not committed
 * (size/license), exactly like the Live2D runtime. When absent, ASR reports unavailable
 * and voice input is simply disabled; nothing else breaks. No API key, fully offline.
 */
export class AsrService {
  private recognizer: OfflineRecognizer | null = null
  private loadError: string | null = null
  private loaded = false

  constructor(private readonly modelDir: string) {}

  status(): AsrStatus {
    this.ensureLoaded()
    return {
      available: this.recognizer !== null,
      reason: this.recognizer ? undefined : this.loadError ?? 'No ASR model installed',
      modelDir: this.modelDir
    }
  }

  /** Transcribe a mono PCM utterance. Returns '' on any failure (never throws upstream). */
  async transcribe(samples: Float32Array, sampleRate: number): Promise<string> {
    this.ensureLoaded()
    if (!this.recognizer) return ''
    try {
      const stream = this.recognizer.createStream()
      stream.acceptWaveform({ sampleRate, samples })
      this.recognizer.decode(stream)
      return (this.recognizer.getResult(stream).text ?? '').trim()
    } catch (err) {
      this.loadError = err instanceof Error ? err.message : String(err)
      return ''
    }
  }

  private ensureLoaded(): void {
    if (this.loaded) return
    this.loaded = true
    const configPath = join(this.modelDir, 'config.json')
    if (!existsSync(configPath)) {
      this.loadError = `Drop a sherpa-onnx model + config.json into ${this.modelDir}`
      return
    }
    try {
      const raw = JSON.parse(readFileSync(configPath, 'utf8'))
      const config = resolveConfigPaths(raw, (rel) => {
        const abs = join(this.modelDir, rel)
        return existsSync(abs) ? abs : null
      })
      const require = createRequire(import.meta.url)
      const sherpa = require('sherpa-onnx-node') as SherpaModule
      this.recognizer = new sherpa.OfflineRecognizer(config)
    } catch (err) {
      this.loadError = err instanceof Error ? err.message : String(err)
      this.recognizer = null
    }
  }
}
