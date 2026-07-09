// AetherDownloader — Shared settings cache for content scripts
// Reads aetherSettings from storage once, keeps a live copy in sync via
// storage.onChanged, and exposes it synchronously to callers.

const DEFAULTS = {
  pixivSubfolder: 'pixiv',
  zerochanSubfolder: 'zerochan',
  previewEnabled: true,
  previewDelay: 400,
  previewMaxHeight: 85,
  previewMaxWidth: 50,
  // Batch crawl: how many listing pages the Zerochan "download all" FAB walks,
  // starting from the current page (1 = current page only).
  zerochanMaxPages: 1,
  // Pixiv batch: how many API pages to walk for paginated sources (bookmarks,
  // search). User "all works" always fetches the complete list.
  pixivMaxPages: 1,
  // Folder-name templates (relative to the site subfolder). Tokens are
  // substituted per download; see template.js. Defaults reproduce the built-in
  // structure. Pixiv tokens: {userName} {userId} {workId} {title} {type} {date}.
  // Zerochan tokens: {character} {id} {tag}.
  pixivFolderTemplate: '{userName}-{userId}/{workId}-{title}',
  zerochanFolderTemplate: '{character}',
};

let cache = { ...DEFAULTS };
const listeners = new Set();

/** Reload settings from storage into the cache and notify subscribers. */
async function refresh() {
  try {
    const data = await browser.storage.local.get('aetherSettings');
    cache = { ...DEFAULTS, ...(data.aetherSettings || {}) };
  } catch {
    cache = { ...DEFAULTS };
  }
  for (const cb of listeners) {
    try {
      cb(cache);
    } catch {
      /* ignore listener errors */
    }
  }
}

// Keep the cache fresh when the popup saves new settings (so already-open
// tabs pick up changes without a reload).
try {
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.aetherSettings) refresh();
  });
} catch {
  /* storage.onChanged unavailable — fall back to load-once */
}

// Kick off the initial load immediately.
const ready = refresh();

/** Synchronous access to the current settings (defaults until first load). */
export function getSettings() {
  return cache;
}

/** Await the first settings load. */
export function settingsReady() {
  return ready;
}

/**
 * Subscribe to settings changes.
 * @param {(settings: object) => void} cb
 * @returns {() => void} Unsubscribe function
 */
export function onSettingsChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/**
 * Sanitize a user-provided subfolder value into a safe relative path.
 * Strips characters illegal in filenames, collapses '..', and trims
 * leading/trailing slashes. Falls back to `fallback` when empty.
 * @param {string} value
 * @param {string} fallback
 * @returns {string}
 */
export function sanitizeSubfolder(value, fallback) {
  const cleaned = String(value == null ? '' : value)
    .replace(/[:*?"<>|\\]/g, '_')
    .replace(/\.\.+/g, '_')
    .replace(/^[/\s]+|[/\s]+$/g, '')
    .trim();
  return cleaned || fallback;
}
