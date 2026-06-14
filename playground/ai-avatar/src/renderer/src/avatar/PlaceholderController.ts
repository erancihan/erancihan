import type { AvatarPose } from '../../../shared/ipc.js'
import type { AvatarController } from './AvatarController.js'

interface PoseStyle {
  body: string
  glow: string
  /** Breathing speed multiplier. */
  energy: number
}

// A small, deliberately characterful palette per pose — warm cozy "desk-pet".
const POSE_STYLES: Record<AvatarPose, PoseStyle> = {
  idle: { body: '#f0a868', glow: 'rgba(240,168,104,0.35)', energy: 1 },
  listening: { body: '#7fc8a9', glow: 'rgba(127,200,169,0.45)', energy: 1.6 },
  thinking: { body: '#9d8df0', glow: 'rgba(157,141,240,0.4)', energy: 1.2 },
  working: { body: '#5fb0e8', glow: 'rgba(95,176,232,0.5)', energy: 2.4 },
  speaking: { body: '#f08fb0', glow: 'rgba(240,143,176,0.45)', energy: 1.8 },
  alert: { body: '#f0c14b', glow: 'rgba(240,193,75,0.6)', energy: 2.8 }
}

/**
 * A self-contained Canvas2D companion. No external assets, no WebGL — so the app is
 * always alive even before anyone drops in a Live2D model. It honors the full
 * AvatarController contract (pose, gaze, poke) so swapping in Live2DController later
 * changes nothing upstream.
 */
export class PlaceholderController implements AvatarController {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private raf = 0
  private startMs = 0
  private t = 0

  private pose: AvatarPose = 'idle'
  private dpr = 1

  // Gaze + blink state.
  private gaze = { x: 0, y: 0 } // -1..1 target offset
  private gazeCurrent = { x: 0, y: 0 }
  private nextBlinkAt = 1.5
  private blink = 0 // 0 open .. 1 shut
  private blinking = false
  private pokeUntil = 0
  private expression = 'neutral'
  private speaking = false
  private mouthOpen = 0

  async mount(host: HTMLElement): Promise<void> {
    const canvas = document.createElement('canvas')
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.display = 'block'
    host.appendChild(canvas)
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')

    this.resize()
    this.resizeObserver.observe(host)
    this.startMs = performance.now()
    this.loop()
  }

  private resizeObserver = new ResizeObserver(() => this.resize())

  private resize(): void {
    if (!this.canvas) return
    const rect = this.canvas.getBoundingClientRect()
    this.dpr = window.devicePixelRatio || 1
    this.canvas.width = Math.max(1, Math.floor(rect.width * this.dpr))
    this.canvas.height = Math.max(1, Math.floor(rect.height * this.dpr))
  }

  setPose(pose: AvatarPose): void {
    this.pose = pose
  }

  setExpression(expression: string): void {
    this.expression = expression
  }

  setSpeaking(active: boolean): void {
    this.speaking = active
    if (!active) this.mouthOpen = 0
  }

  setMouthOpen(value: number): void {
    this.mouthOpen = clamp(value, 0, 1)
  }

  lookAt(clientX: number, clientY: number): void {
    if (!this.canvas) return
    const r = this.canvas.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height * 0.42
    this.gaze.x = clamp((clientX - cx) / (r.width / 2), -1, 1)
    this.gaze.y = clamp((clientY - cy) / (r.height / 2), -1, 1)
  }

  poke(): void {
    this.pokeUntil = this.t + 0.45
    // A poke also makes it blink, like a startle.
    this.blinking = true
    this.blink = 0
  }

  destroy(): void {
    cancelAnimationFrame(this.raf)
    this.resizeObserver.disconnect()
    this.canvas?.remove()
    this.canvas = null
    this.ctx = null
  }

  private loop = (): void => {
    this.raf = requestAnimationFrame(this.loop)
    const ctx = this.ctx
    const canvas = this.canvas
    if (!ctx || !canvas) return

    const now = performance.now()
    this.t = (now - this.startMs) / 1000
    const style = POSE_STYLES[this.pose]

    // Smoothly ease gaze toward target.
    this.gazeCurrent.x += (this.gaze.x - this.gazeCurrent.x) * 0.12
    this.gazeCurrent.y += (this.gaze.y - this.gazeCurrent.y) * 0.12

    // Blink scheduler.
    if (!this.blinking && this.t >= this.nextBlinkAt) {
      this.blinking = true
      this.blink = 0
    }
    if (this.blinking) {
      this.blink += 0.18
      if (this.blink >= 2) {
        this.blinking = false
        this.blink = 0
        // ~20% of the time blink twice in quick succession; otherwise wait 2–5s.
        this.nextBlinkAt = this.t + (Math.random() < 0.2 ? 0.16 : 2 + Math.random() * 3)
      }
    }
    const eyeOpen = this.blinking ? Math.abs(1 - this.blink) : 1

    const w = canvas.width
    const h = canvas.height
    ctx.clearRect(0, 0, w, h)
    ctx.save()
    ctx.scale(this.dpr, this.dpr)
    const vw = w / this.dpr
    const vh = h / this.dpr

    const cx = vw / 2
    const groundY = vh * 0.82
    const breath = Math.sin(this.t * style.energy * 1.4)
    const sway = Math.sin(this.t * 0.7) * 4
    const pokeBoost = this.t < this.pokeUntil ? Math.sin((this.pokeUntil - this.t) * 20) * 8 : 0

    const baseR = Math.min(vw, vh) * 0.22
    const bodyR = baseR
    const squashY = 1 + breath * 0.04
    const squashX = 1 - breath * 0.03
    const cy = groundY - bodyR * squashY - 6 - pokeBoost

    this.drawShadow(ctx, cx + sway, groundY + bodyR * 0.15, bodyR * (1.1 + breath * 0.05))
    this.drawGlow(ctx, cx + sway, cy, bodyR * 1.7, style.glow)
    this.drawBody(ctx, cx + sway, cy, bodyR, squashX, squashY, style.body)
    this.drawFace(ctx, cx + sway, cy, bodyR, eyeOpen)

    ctx.restore()
  }

  private drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(1, 0.28)
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r)
    g.addColorStop(0, 'rgba(0,0,0,0.32)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  private drawGlow(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    color: string
  ): void {
    const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r)
    g.addColorStop(0, color)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  private drawBody(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    sx: number,
    sy: number,
    color: string
  ): void {
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(sx, sy)
    const g = ctx.createLinearGradient(0, -r, 0, r)
    g.addColorStop(0, lighten(color, 0.18))
    g.addColorStop(1, color)
    ctx.fillStyle = g
    // Rounded "slime" silhouette: circle top, soft flat-ish bottom.
    ctx.beginPath()
    ctx.moveTo(-r, 0)
    ctx.bezierCurveTo(-r, -r * 1.25, r, -r * 1.25, r, 0)
    ctx.bezierCurveTo(r, r * 0.95, -r, r * 0.95, -r, 0)
    ctx.closePath()
    ctx.fill()
    // Subtle top sheen.
    ctx.fillStyle = 'rgba(255,255,255,0.22)'
    ctx.beginPath()
    ctx.ellipse(-r * 0.28, -r * 0.5, r * 0.32, r * 0.18, -0.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  private drawFace(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    eyeOpen: number
  ): void {
    const f = FACES[this.expression] ?? FACES.neutral
    const ink = '#2a2433'
    const gx = this.gazeCurrent.x * r * 0.12
    const gy = this.gazeCurrent.y * r * 0.1
    const eyeDX = r * 0.34
    const eyeY = y - r * 0.1
    const eyeR = r * 0.12 * f.eyeScale
    const lw = Math.max(1.5, r * 0.045)

    // Eyebrows convey anger / sadness (inner corner up = sad, down = angry).
    if (f.brow !== 0) {
      ctx.strokeStyle = ink
      ctx.lineWidth = lw
      ctx.lineCap = 'round'
      for (const dir of [-1, 1]) {
        const bx = x + dir * eyeDX + gx
        const by = eyeY - r * 0.26 + gy
        ctx.beginPath()
        ctx.moveTo(bx - dir * r * 0.1, by + dir * f.brow * r * 0.07)
        ctx.lineTo(bx + dir * r * 0.1, by - dir * f.brow * r * 0.07)
        ctx.stroke()
      }
    }

    ctx.fillStyle = ink
    for (const dir of [-1, 1]) {
      const ex = x + dir * eyeDX + gx
      const ey = eyeY + gy
      if (f.happyEyes && eyeOpen > 0.5) {
        // Upward arc "^_^" eyes for joy.
        ctx.strokeStyle = ink
        ctx.lineWidth = lw
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.arc(ex, ey + eyeR * 0.4, eyeR * 1.1, 1.15 * Math.PI, 1.85 * Math.PI)
        ctx.stroke()
        continue
      }
      ctx.save()
      ctx.translate(ex, ey)
      ctx.scale(1, Math.max(0.08, eyeOpen))
      ctx.beginPath()
      ctx.arc(0, 0, eyeR, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      ctx.beginPath()
      ctx.arc(eyeR * 0.35, -eyeR * 0.35, eyeR * 0.3, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = ink
      ctx.restore()
    }

    // Blush.
    ctx.fillStyle = 'rgba(240,120,150,0.35)'
    for (const dir of [-1, 1]) {
      ctx.beginPath()
      ctx.ellipse(x + dir * r * 0.5, y + r * 0.12, r * 0.12, r * 0.07, 0, 0, Math.PI * 2)
      ctx.fill()
    }

    // Mouth: talking (lip-sync) overrides everything; else open (O) when agape, else a
    // curve whose sign is smile (+) vs frown (−).
    const mx = x + gx
    const my = y + r * 0.1 + gy
    if (this.speaking) {
      const open = 0.12 + this.mouthOpen * 0.9
      ctx.fillStyle = ink
      ctx.beginPath()
      ctx.ellipse(mx, my, r * 0.11, r * 0.14 * open, 0, 0, Math.PI * 2)
      ctx.fill()
    } else if (f.mouthOpen > 0.3) {
      ctx.fillStyle = ink
      ctx.beginPath()
      ctx.ellipse(mx, my, r * 0.1, r * 0.13 * f.mouthOpen, 0, 0, Math.PI * 2)
      ctx.fill()
    } else {
      ctx.strokeStyle = ink
      ctx.lineWidth = lw
      ctx.lineCap = 'round'
      const w = r * 0.13
      const c = f.mouthCurve * r * 0.12 // + down-belly (smile), − up-belly (frown)
      ctx.beginPath()
      ctx.moveTo(mx - w, my)
      ctx.quadraticCurveTo(mx, my + c, mx + w, my)
      ctx.stroke()
    }
  }
}

interface FaceStyle {
  eyeScale: number
  happyEyes: boolean
  mouthCurve: number // + smile, − frown
  mouthOpen: number // 0..1
  brow: number // 0 none, + sad (inner up), − angry (inner down)
}

// Per-emotion face parameters for the placeholder companion.
const FACES: Record<string, FaceStyle> = {
  neutral: { eyeScale: 1, happyEyes: false, mouthCurve: 0.5, mouthOpen: 0, brow: 0 },
  happy: { eyeScale: 1, happyEyes: true, mouthCurve: 1, mouthOpen: 0, brow: 0 },
  excited: { eyeScale: 1.3, happyEyes: false, mouthCurve: 1, mouthOpen: 0.7, brow: 0 },
  sad: { eyeScale: 0.9, happyEyes: false, mouthCurve: -0.8, mouthOpen: 0, brow: 1 },
  surprised: { eyeScale: 1.45, happyEyes: false, mouthCurve: 0, mouthOpen: 0.9, brow: 0 },
  angry: { eyeScale: 0.9, happyEyes: false, mouthCurve: -0.5, mouthOpen: 0, brow: -1 },
  thinking: { eyeScale: 1, happyEyes: false, mouthCurve: 0.15, mouthOpen: 0, brow: 0 }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

/** Lighten a #rrggbb hex toward white by amount 0..1. */
function lighten(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  const mix = (c: number): number => Math.round(c + (255 - c) * amount)
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`
}
