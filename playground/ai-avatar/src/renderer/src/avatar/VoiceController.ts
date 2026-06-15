import { cleanForSpeech } from '../../../shared/voice.js'
import { rms } from '../../../shared/vad.js'
import type { AvatarController } from './AvatarController.js'

interface SpeakHandlers {
  onStart?: () => void
  onEnd?: () => void
}

/**
 * Speaks assistant replies with lip-sync, no API key. Two engines:
 *
 *  - **Offline neural TTS** (sherpa-onnx, when a voice is installed): the reply is
 *    synthesized to audio in the main process; here we play it through Web Audio and drive
 *    the mouth from REAL signal amplitude via an AnalyserNode → true lip-sync.
 *  - **Web Speech API** fallback (no audio buffer exposed): a talking flap + word-boundary
 *    pulses approximate visemes.
 *
 * Either way nothing is keyed or paid; the neural path is also fully offline.
 */
export class VoiceController {
  private readonly synth = window.speechSynthesis
  private flapTimer = 0
  private raf = 0
  private active = false
  private audioCtx: AudioContext | null = null
  private source: AudioBufferSourceNode | null = null
  private ttsAvailable: boolean | null = null // cached after first probe

  speak(text: string, controller: AvatarController, handlers: SpeakHandlers = {}): void {
    const clean = cleanForSpeech(text)
    if (!clean) return
    this.cancel()
    void this.resolveTts().then((useNeural) => {
      if (useNeural) this.speakNeural(clean, controller, handlers)
      else this.speakWebSpeech(clean, controller, handlers)
    })
  }

  cancel(): void {
    this.active = false
    this.stopFlap()
    if (this.raf) {
      cancelAnimationFrame(this.raf)
      this.raf = 0
    }
    try {
      this.source?.stop()
    } catch {
      // already stopped
    }
    this.source = null
    void this.audioCtx?.close().catch(() => {})
    this.audioCtx = null
    try {
      this.synth?.cancel()
    } catch {
      // ignore
    }
  }

  private async resolveTts(): Promise<boolean> {
    if (this.ttsAvailable === null) {
      try {
        this.ttsAvailable = (await window.companion.ttsStatus()).available
      } catch {
        this.ttsAvailable = false
      }
    }
    return this.ttsAvailable
  }

  /** Offline neural TTS → Web Audio playback with amplitude-driven lip-sync. */
  private async speakNeural(
    text: string,
    controller: AvatarController,
    handlers: SpeakHandlers
  ): Promise<void> {
    const audio = await window.companion.synthesize(text).catch(() => null)
    if (!audio || audio.samples.length === 0) {
      this.speakWebSpeech(text, controller, handlers) // synth failed → fall back
      return
    }

    const ctx = new AudioContext()
    this.audioCtx = ctx
    const buffer = ctx.createBuffer(1, audio.samples.length, audio.sampleRate)
    buffer.getChannelData(0).set(audio.samples)

    const source = ctx.createBufferSource()
    source.buffer = buffer
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)
    analyser.connect(ctx.destination)
    this.source = source

    const frame = new Float32Array(analyser.fftSize)
    this.active = true
    controller.setSpeaking(true)
    handlers.onStart?.()

    const tick = (): void => {
      analyser.getFloatTimeDomainData(frame)
      controller.setMouthOpen(Math.min(1, rms(frame) * 9)) // scale RMS → mouth open
      this.raf = requestAnimationFrame(tick)
    }
    tick()

    source.onended = (): void => {
      if (!this.active) return
      this.active = false
      if (this.raf) cancelAnimationFrame(this.raf)
      this.raf = 0
      controller.setSpeaking(false)
      void ctx.close().catch(() => {})
      this.audioCtx = null
      handlers.onEnd?.()
    }
    source.start()
  }

  /** Web Speech API fallback: flap + boundary pulses (no real audio signal available). */
  private speakWebSpeech(
    text: string,
    controller: AvatarController,
    handlers: SpeakHandlers
  ): void {
    if (typeof this.synth === 'undefined') return
    const utter = new SpeechSynthesisUtterance(text)
    utter.rate = 1.05
    utter.pitch = 1.05

    utter.onstart = (): void => {
      this.active = true
      controller.setSpeaking(true)
      handlers.onStart?.()
      this.startFlap(controller)
    }
    utter.onboundary = (): void => controller.setMouthOpen(0.85)
    const finish = (): void => {
      if (!this.active) return
      this.active = false
      this.stopFlap()
      controller.setSpeaking(false)
      handlers.onEnd?.()
    }
    utter.onend = finish
    utter.onerror = finish

    this.synth.speak(utter)
  }

  private startFlap(controller: AvatarController): void {
    this.stopFlap()
    this.flapTimer = window.setInterval(() => {
      controller.setMouthOpen(0.2 + Math.random() * 0.6)
    }, 90)
  }

  private stopFlap(): void {
    if (this.flapTimer) {
      window.clearInterval(this.flapTimer)
      this.flapTimer = 0
    }
  }
}
