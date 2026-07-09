// AetherDownloader — minimal cross-browser namespace shim
//
// Firefox exposes the promise-based `browser.*` WebExtension API. Chrome
// exposes `chrome.*`, which in Manifest V3 is also promise-based for the APIs
// this extension uses (storage, downloads, runtime, tabs). Aliasing `chrome`
// to `browser` lets the rest of the codebase use a single namespace.
//
// Import this FIRST in every entry point (background, content scripts, popup)
// so `browser` is defined before any other module's top-level code runs.
if (typeof globalThis.browser === 'undefined' && typeof globalThis.chrome !== 'undefined') {
  globalThis.browser = globalThis.chrome;
}
