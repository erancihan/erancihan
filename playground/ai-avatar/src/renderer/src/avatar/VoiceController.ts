import { cleanForSpeech } from '../../../shared/voice.js'
import type { AvatarController } from './AvatarController.js'

interface SpeakHandlers {
  onStart?: () => void
  onEnd?: () => void
}

/**
 * Free, no-key TTS via the browser's Web Speech API, with mouth-driven lip-sync.
 *
 * The Web Speech API doesn't expose the audio signal, so we approximate visemes: while
 * speaking we oscillate the mouth open/closed (a talking flap), and snap it wide on each
 * word `boundary` event for emphasis. This is the AudioWorklet-free fallback from the plan
 * — no Azure/ElevenLabs key, no paid service.
 */
export class VoiceController {
  private readonly synth = window.speechSynthesis
  private flapTimer = 0
  private active = false

  get supported(): boolean {
    return typeof this.synth !== 'undefined'
  }

  speak(text: string, controller: AvatarController, handlers: SpeakHandlers = {}): void {
    if (!this.supported) return
    const clean = cleanForSpeech(text)
    if (!clean) return

    this.cancel()
    const utter = new SpeechSynthesisUtterance(clean)
    utter.rate = 1.05
    utter.pitch = 1.05

    utter.onstart = () => {
      this.active = true
      controller.setSpeaking(true)
      handlers.onStart?.()
      this.startFlap(controller)
    }
    // Snap the mouth wide on each spoken word for a bit of sync.
    utter.onboundary = () => controller.setMouthOpen(0.85)
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

  cancel(): void {
    this.stopFlap()
    if (this.active) this.active = false
    try {
      this.synth.cancel()
    } catch {
      // ignore
    }
  }

  private startFlap(controller: AvatarController): void {
    this.stopFlap()
    // Wiggle the mouth between roughly closed and open to read as talking.
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
