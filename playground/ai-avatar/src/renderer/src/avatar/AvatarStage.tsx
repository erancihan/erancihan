import { useEffect, useRef, useState } from 'react'
import type { AvatarPose } from '../../../shared/ipc.js'
import type { AvatarMap } from '../../../shared/models.js'
import type { AvatarController } from './AvatarController.js'
import { createAvatarController } from './createAvatarController.js'
import { VoiceController } from './VoiceController.js'

interface AvatarStageProps {
  /** model3.json URL, or null to use the placeholder backend. */
  modelUrl: string | null
  /** Current pose driven by App (single source of truth: hook cues / chat activity). */
  pose: AvatarPose
  /** Optional named expression (Phase 3). */
  expression?: string
  /** Speak assistant replies aloud with lip-sync (Phase 4). */
  voiceEnabled?: boolean
  /** Selected model's emotion→.exp3 and pose→motion maps (Phase 5 / adopted). */
  expressionMap?: AvatarMap
  motionMap?: AvatarMap
}

/**
 * React host for whichever AvatarController mounts. Owns the controller lifecycle and
 * bridges React props (pose) + DOM events (gaze, click) into imperative controller calls.
 * Subscribes to avatar cues here too, so Phase 2 hooks light up the character with no
 * further wiring.
 */
export function AvatarStage({
  modelUrl,
  pose,
  expression,
  voiceEnabled,
  expressionMap,
  motionMap
}: AvatarStageProps): JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null)
  const controllerRef = useRef<AvatarController | null>(null)
  const voiceRef = useRef<VoiceController | null>(null)
  const poseRef = useRef<AvatarPose>(pose)
  const mapsRef = useRef<{ expressionMap?: AvatarMap; motionMap?: AvatarMap }>({})
  const [backend, setBackend] = useState<'live2d' | 'placeholder' | 'loading'>('loading')

  // Keep a live ref to the current pose so speech can restore it when it ends.
  poseRef.current = pose
  // Maps come with the model (modelUrl changes when they do); a ref keeps them fresh at
  // mount without making them effect deps (they're new objects each render).
  mapsRef.current = { expressionMap, motionMap }

  // Mount once; rebuild only when the model source changes.
  useEffect(() => {
    let disposed = false
    const host = hostRef.current
    if (!host) return

    createAvatarController(host, modelUrl, mapsRef.current).then((choice) => {
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

  // Push expression changes into the controller.
  useEffect(() => {
    if (expression) controllerRef.current?.setExpression(expression)
  }, [expression, backend])

  // Gaze tracking: follow the cursor across the whole window.
  useEffect(() => {
    const onMove = (e: MouseEvent): void =>
      controllerRef.current?.lookAt(e.clientX, e.clientY)
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  // Voice + lip-sync: speak assistant replies (Stop → main → here) when enabled.
  useEffect(() => {
    if (!voiceRef.current) voiceRef.current = new VoiceController()
    const voice = voiceRef.current

    const off = window.companion.onAvatarSpeak((text: string) => {
      const controller = controllerRef.current
      if (!voiceEnabled || !controller) return
      voice.speak(text, controller, {
        onStart: () => controller.setPose('speaking'),
        onEnd: () => controller.setPose(poseRef.current)
      })
    })
    return () => {
      off()
      voice.cancel()
    }
  }, [voiceEnabled])

  // Barge-in: when the user starts speaking (mic), stop the avatar talking immediately.
  useEffect(() => {
    const onBarge = (): void => voiceRef.current?.cancel()
    window.addEventListener('companion:bargein', onBarge)
    return () => window.removeEventListener('companion:bargein', onBarge)
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
