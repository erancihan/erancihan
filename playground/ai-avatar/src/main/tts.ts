import { createRequire } from 'node:module'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { resolveConfigPaths } from '../shared/asr.js'
import type { EngineStatus } from '../shared/ipc.js'

type SherpaTtsModule = { OfflineTts: new (config: unknown) => OfflineTts }
interface OfflineTts {
  sampleRate: number
  generate(obj: { text: string; sid?: number; speed?: number }): {
    samples: Float32Array
    sampleRate: number
  }
}

export interface TtsResult {
  samples: Float32Array
  sampleRate: number
}

/**
 * Offline neural TTS via sherpa-onnx (e.g. a Piper/VITS voice). The voice model is
 * user-supplied under `resources/tts/` (config.json + files) — not committed (size/license),
 * like the ASR and Live2D assets. When present, replies are synthesized to audio so the
 * renderer can drive REAL amplitude lip-sync; when absent the renderer falls back to the
 * browser Web Speech API. No API key, fully offline either way.
 */
export class TtsService {
  private tts: OfflineTts | null = null
  private loadError: string | null = null
  private loaded = false

  constructor(private readonly modelDir: string) {}

  status(): EngineStatus {
    this.ensureLoaded()
    return {
      available: this.tts !== null,
      reason: this.tts ? undefined : this.loadError ?? 'No TTS voice installed',
      modelDir: this.modelDir
    }
  }

  /** Synthesize text to mono PCM. Returns null on any failure (renderer then uses Web Speech). */
  synthesize(text: string): TtsResult | null {
    this.ensureLoaded()
    if (!this.tts || !text.trim()) return null
    try {
      const out = this.tts.generate({ text, sid: 0, speed: 1.0 })
      return { samples: out.samples, sampleRate: out.sampleRate }
    } catch (err) {
      this.loadError = err instanceof Error ? err.message : String(err)
      return null
    }
  }

  private ensureLoaded(): void {
    if (this.loaded) return
    this.loaded = true
    const configPath = join(this.modelDir, 'config.json')
    if (!existsSync(configPath)) {
      this.loadError = `Drop a sherpa-onnx TTS voice + config.json into ${this.modelDir}`
      return
    }
    try {
      const raw = JSON.parse(readFileSync(configPath, 'utf8'))
      const config = resolveConfigPaths(raw, (rel) => {
        const abs = join(this.modelDir, rel)
        return existsSync(abs) ? abs : null
      })
      const require = createRequire(import.meta.url)
      const sherpa = require('sherpa-onnx-node') as SherpaTtsModule
      this.tts = new sherpa.OfflineTts(config)
    } catch (err) {
      this.loadError = err instanceof Error ? err.message : String(err)
      this.tts = null
    }
  }
}
