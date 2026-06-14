import type { CompanionApi } from './index.js'

// Makes `window.companion` strongly typed throughout the renderer.
declare global {
  interface Window {
    companion: CompanionApi
  }
}

export {}
