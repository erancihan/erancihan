// Energy-based voice activity detection — pure (Float32 frames in, utterances out), so it
// unit-tests without a mic. Segments mic audio into utterances for offline ASR and signals
// speech start for barge-in. Engine-agnostic: the ASR backend never sees this.

export interface VadOptions {
  /** Frame/sample rate, e.g. 16000. */
  sampleRate: number
  /** RMS above which a frame counts as speech (0..1). */
  energyThreshold?: number
  /** Trailing silence that ends an utterance. */
  hangoverMs?: number
  /** Minimum real speech to emit (filters coughs/clicks). */
  minSpeechMs?: number
  /** Audio kept before speech onset so words aren't clipped. */
  prerollMs?: number
  /** Hard cap so a continuous noise floor can't grow unbounded. */
  maxUtteranceMs?: number
}

export interface VadEvent {
  /** True on the frame where speech begins (drives barge-in). */
  speechStart?: boolean
  /** Emitted when an utterance completes (samples ready for ASR). */
  utterance?: Float32Array
}

const DEFAULTS = {
  energyThreshold: 0.015,
  hangoverMs: 700,
  minSpeechMs: 250,
  prerollMs: 200,
  maxUtteranceMs: 15000
}

export function rms(frame: Float32Array): number {
  if (frame.length === 0) return 0
  let sum = 0
  for (let i = 0; i < frame.length; i++) sum += frame[i] * frame[i]
  return Math.sqrt(sum / frame.length)
}

function concat(chunks: Float32Array[]): Float32Array {
  const total = chunks.reduce((n, c) => n + c.length, 0)
  const out = new Float32Array(total)
  let off = 0
  for (const c of chunks) {
    out.set(c, off)
    off += c.length
  }
  return out
}

export class EnergyVad {
  private readonly o: Required<VadOptions>
  private speaking = false
  private speechChunks: Float32Array[] = []
  private preroll: Float32Array[] = []
  private speechMs = 0
  private silenceMs = 0
  private prerollMs = 0

  constructor(options: VadOptions) {
    this.o = { ...DEFAULTS, ...options }
  }

  reset(): void {
    this.speaking = false
    this.speechChunks = []
    this.preroll = []
    this.speechMs = 0
    this.silenceMs = 0
    this.prerollMs = 0
  }

  /** Feed one audio frame; returns any speech-start / completed-utterance events. */
  accept(frame: Float32Array): VadEvent {
    const frameMs = (frame.length / this.o.sampleRate) * 1000
    const loud = rms(frame) >= this.o.energyThreshold
    const ev: VadEvent = {}

    if (loud) {
      if (!this.speaking) {
        this.speaking = true
        ev.speechStart = true
        this.speechChunks = [...this.preroll]
        this.speechMs = this.prerollMs
        this.preroll = []
      }
      this.speechChunks.push(frame)
      this.speechMs += frameMs
      this.silenceMs = 0
      if (this.speechMs >= this.o.maxUtteranceMs) {
        ev.utterance = this.endUtterance()
      }
      return ev
    }

    if (this.speaking) {
      this.speechChunks.push(frame) // keep trailing silence in the buffer
      this.speechMs += frameMs
      this.silenceMs += frameMs
      if (this.silenceMs >= this.o.hangoverMs) {
        const realSpeechMs = this.speechMs - this.silenceMs - this.prerollMs
        const utt = this.endUtterance()
        if (realSpeechMs >= this.o.minSpeechMs) ev.utterance = utt
      }
      return ev
    }

    // Idle: keep a rolling preroll buffer so onset isn't clipped.
    this.preroll.push(frame)
    this.prerollMs += frameMs
    while (this.prerollMs > this.o.prerollMs && this.preroll.length > 1) {
      const dropped = this.preroll.shift()
      if (dropped) this.prerollMs -= (dropped.length / this.o.sampleRate) * 1000
    }
    return ev
  }

  private endUtterance(): Float32Array {
    const out = concat(this.speechChunks)
    this.speaking = false
    this.speechChunks = []
    this.preroll = []
    this.speechMs = 0
    this.silenceMs = 0
    this.prerollMs = 0
    return out
  }
}
