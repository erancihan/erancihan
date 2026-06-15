import { EnergyVad } from '../../../shared/vad.js'

export interface MicHandlers {
  /** Fired when speech begins — used for barge-in (stop the avatar talking). */
  onSpeechStart?: () => void
  /** A completed spoken utterance, ready for ASR. */
  onUtterance: (samples: Float32Array, sampleRate: number) => void
  onError?: (message: string) => void
}

/**
 * Captures the microphone at ~16 kHz and segments it into utterances with the energy VAD.
 * Audio never leaves the machine: utterances go to the main process's offline ASR. Emits
 * speech-start for barge-in. Renderer-only (Web Audio); the VAD itself is pure + tested.
 */
export class MicCapture {
  private stream: MediaStream | null = null
  private ctx: AudioContext | null = null
  private node: ScriptProcessorNode | null = null
  private vad: EnergyVad | null = null

  get active(): boolean {
    return this.stream !== null
  }

  async start(handlers: MicHandlers): Promise<void> {
    if (this.stream) return
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (err) {
      handlers.onError?.(err instanceof Error ? err.message : 'microphone unavailable')
      return
    }

    // Request 16 kHz so we hand the ASR the rate it wants without resampling.
    const ctx = new AudioContext({ sampleRate: 16000 })
    this.ctx = ctx
    const sampleRate = ctx.sampleRate
    this.vad = new EnergyVad({ sampleRate })

    const source = ctx.createMediaStreamSource(this.stream)
    const node = ctx.createScriptProcessor(2048, 1, 1)
    this.node = node

    node.onaudioprocess = (e): void => {
      // Copy: the input buffer is reused across callbacks.
      const frame = new Float32Array(e.inputBuffer.getChannelData(0))
      const ev = this.vad!.accept(frame)
      if (ev.speechStart) handlers.onSpeechStart?.()
      if (ev.utterance) handlers.onUtterance(ev.utterance, sampleRate)
    }

    source.connect(node)
    // ScriptProcessor only runs while connected to a destination; mute it so we don't echo.
    const sink = ctx.createGain()
    sink.gain.value = 0
    node.connect(sink)
    sink.connect(ctx.destination)
  }

  stop(): void {
    this.node?.disconnect()
    this.node = null
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null
    void this.ctx?.close()
    this.ctx = null
    this.vad?.reset()
    this.vad = null
  }
}
