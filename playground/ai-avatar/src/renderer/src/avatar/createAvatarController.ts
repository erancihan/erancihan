import type { AvatarController } from './AvatarController.js'
import { Live2DController, type Live2DMaps } from './Live2DController.js'
import { PlaceholderController } from './PlaceholderController.js'

export interface AvatarChoice {
  controller: AvatarController
  /** Which backend actually mounted — surfaced in the UI for clarity. */
  backend: 'live2d' | 'placeholder'
  /** Why we fell back, if we did. */
  reason?: string
}

/**
 * Try the real Live2D backend; if the runtime/model/WebGL isn't available, transparently
 * fall back to the Canvas2D placeholder. The caller mounts whatever it gets — both honor
 * the same AvatarController contract, so nothing downstream branches on the backend.
 */
export async function createAvatarController(
  host: HTMLElement,
  modelUrl: string | null,
  maps: Live2DMaps = {}
): Promise<AvatarChoice> {
  if (modelUrl) {
    const live2d = new Live2DController(modelUrl, maps)
    try {
      await live2d.mount(host)
      return { controller: live2d, backend: 'live2d' }
    } catch (err) {
      live2d.destroy()
      const placeholder = new PlaceholderController()
      await placeholder.mount(host)
      return {
        controller: placeholder,
        backend: 'placeholder',
        reason: err instanceof Error ? err.message : 'Live2D unavailable'
      }
    }
  }

  const placeholder = new PlaceholderController()
  await placeholder.mount(host)
  return {
    controller: placeholder,
    backend: 'placeholder',
    reason: 'No Live2D model configured'
  }
}
