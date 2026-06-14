import type { AvatarPose } from '../../../shared/ipc.js'
import type { AvatarController } from './AvatarController.js'

// Cubism Core is a global injected by resources/runtime/live2dcubismcore.min.js.
// It is NOT bundled here (proprietary redistribution rules), so we feature-detect it.
declare global {
  interface Window {
    Live2DCubismCore?: unknown
  }
}

// Pose -> Live2D motion group name. Real models name groups freely; these are common
// conventions, and unknown groups are simply ignored (best-effort).
const POSE_MOTION: Record<AvatarPose, string> = {
  idle: 'Idle',
  listening: 'Idle',
  thinking: 'Idle',
  working: 'TapBody',
  speaking: 'Idle',
  alert: 'TapBody'
}

/**
 * pixi-live2d-display backend. Constructed with a model3.json URL. `mount()` throws
 * if the Cubism runtime is missing, WebGL is unavailable, or the model fails to load
 * — the caller (createAvatarController) catches and falls back to the placeholder,
 * so a missing binary asset never breaks the app.
 */
export class Live2DController implements AvatarController {
  private app: { destroy: (a?: boolean, b?: unknown) => void; stage: { addChild: (c: unknown) => void }; renderer: { resize: (w: number, h: number) => void } } | null = null
  private model: any = null
  private host: HTMLElement | null = null
  private resizeObserver: ResizeObserver | null = null

  constructor(private readonly modelUrl: string) {}

  async mount(host: HTMLElement): Promise<void> {
    if (!window.Live2DCubismCore) {
      throw new Error('Live2D Cubism Core runtime not loaded (resources/runtime missing)')
    }

    // Dynamic imports keep PixiJS out of the critical path when we fall back.
    const PIXI: any = await import('pixi.js')
    const mod: any = await import('pixi-live2d-display')
    const Live2DModel = mod.Live2DModel

    // pixi-live2d-display needs PIXI on window to auto-update models via the ticker.
    ;(window as unknown as { PIXI: unknown }).PIXI = PIXI
    Live2DModel.registerTicker?.(PIXI.Ticker)

    const canvas = document.createElement('canvas')
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    host.appendChild(canvas)
    this.host = host

    const app = new PIXI.Application({
      view: canvas,
      resizeTo: host,
      backgroundAlpha: 0, // transparent — character floats on the desktop
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1
    })
    this.app = app

    const model = await Live2DModel.from(this.modelUrl)
    this.model = model
    app.stage.addChild(model)
    this.fit()

    this.resizeObserver = new ResizeObserver(() => this.fit())
    this.resizeObserver.observe(host)
  }

  private fit(): void {
    if (!this.model || !this.host) return
    const { clientWidth: w, clientHeight: h } = this.host
    const scale = Math.min(w / this.model.width, h / this.model.height) * 0.9
    this.model.scale.set(scale)
    this.model.x = w / 2
    this.model.y = h / 2
    this.model.anchor?.set?.(0.5, 0.5)
  }

  setPose(pose: AvatarPose): void {
    const group = POSE_MOTION[pose]
    try {
      this.model?.motion?.(group)
    } catch {
      // Unknown motion group — ignore.
    }
  }

  setExpression(expression: string): void {
    try {
      this.model?.expression?.(expression)
    } catch {
      // Unknown expression — ignore.
    }
  }

  lookAt(clientX: number, clientY: number): void {
    this.model?.focus?.(clientX, clientY)
  }

  poke(): void {
    try {
      this.model?.motion?.('TapBody')
    } catch {
      // ignore
    }
  }

  destroy(): void {
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
    try {
      this.app?.destroy(true, { children: true })
    } catch {
      // ignore
    }
    this.app = null
    this.model = null
  }
}
