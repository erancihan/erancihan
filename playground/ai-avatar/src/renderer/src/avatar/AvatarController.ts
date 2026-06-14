import type { AvatarPose } from '../../../shared/ipc.js'

/**
 * The stable contract every avatar backend implements. This is the load-bearing
 * abstraction from the plan: Phases 2-5 (reactions, emotion, gaze, voice) all talk
 * to THIS interface, never to a specific renderer. Today there are two backends:
 *  - Live2DController (pixi-live2d-display) for a real .moc3 model
 *  - PlaceholderController (Canvas2D) when no model / runtime / WebGL is available
 * so the app is always animated and never hard-depends on a binary asset.
 */
export interface AvatarController {
  /** Attach to a host element and begin the idle loop. */
  mount(host: HTMLElement): Promise<void>

  /** Switch the high-level pose (idle/listening/thinking/working/speaking/alert). */
  setPose(pose: AvatarPose): void

  /** Named expression blend (real .exp3 in Phase 3; tint shift in the placeholder). */
  setExpression(expression: string): void

  /** Toggle the talking state — drives lip-sync mouth animation (Phase 4). */
  setSpeaking(active: boolean): void

  /** Open the mouth 0..1 (lip-sync amplitude). */
  setMouthOpen(value: number): void

  /** Look toward a point in viewport coordinates (gaze tracking, Phase 3). */
  lookAt(clientX: number, clientY: number): void

  /** A short attention bounce, e.g. on click. */
  poke(): void

  /** Tear down render loop + GL/canvas resources. */
  destroy(): void
}

/** Human-friendly label for a pose, used by the placeholder + debug UI. */
export const POSE_LABEL: Record<AvatarPose, string> = {
  idle: 'idle',
  listening: 'listening',
  thinking: 'thinking',
  working: 'working',
  speaking: 'speaking',
  alert: 'heads up'
}
