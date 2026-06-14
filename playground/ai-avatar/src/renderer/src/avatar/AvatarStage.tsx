import { useEffect, useRef, useState } from 'react'
import type { AvatarCue, AvatarPose } from '../../../shared/ipc.js'
import type { AvatarController } from './AvatarController.js'
import { createAvatarController } from './createAvatarController.js'

interface AvatarStageProps {
  /** model3.json URL, or null to use the placeholder backend. */
  modelUrl: string | null
  /** Current pose driven by App (from cues / chat activity). */
  pose: AvatarPose
}

/**
 * React host for whichever AvatarController mounts. Owns the controller lifecycle and
 * bridges React props (pose) + DOM events (gaze, click) into imperative controller calls.
 * Subscribes to avatar cues here too, so Phase 2 hooks light up the character with no
 * further wiring.
 */
export function AvatarStage({ modelUrl, pose }: AvatarStageProps): JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null)
  const controllerRef = useRef<AvatarController | null>(null)
  const [backend, setBackend] = useState<'live2d' | 'placeholder' | 'loading'>('loading')

  // Mount once; rebuild only when the model source changes.
  useEffect(() => {
    let disposed = false
    const host = hostRef.current
    if (!host) return

    createAvatarController(host, modelUrl).then((choice) => {
      if (disposed) {
        choice.controller.destroy()
        return
      }
      controllerRef.current = choice.controller
      setBackend(choice.backend)
    })

    return () => {
      disposed = true
      controllerRef.current?.destroy()
      controllerRef.current = null
    }
  }, [modelUrl])

  // Push pose changes into the controller.
  useEffect(() => {
    controllerRef.current?.setPose(pose)
  }, [pose, backend])

  // Gaze tracking: follow the cursor across the whole window.
  useEffect(() => {
    const onMove = (e: MouseEvent): void =>
      controllerRef.current?.lookAt(e.clientX, e.clientY)
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  // React to avatar cues from main (hooks land here in Phase 2).
  useEffect(() => {
    const off = window.companion.onAvatarCue((cue: AvatarCue) => {
      if (cue.pose) controllerRef.current?.setPose(cue.pose)
      if (cue.expression) controllerRef.current?.setExpression(cue.expression)
    })
    return off
  }, [])

  return (
    <div
      className="avatar-stage"
      ref={hostRef}
      onClick={() => controllerRef.current?.poke()}
      title="poke me"
    >
      {backend === 'placeholder' && <span className="avatar-badge">placeholder avatar</span>}
    </div>
  )
}
