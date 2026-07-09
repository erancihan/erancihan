// AetherDownloader — Pixiv Content Script
// Parses preload metadata for artwork data, multi-page support, and hover preview

import '../../browser-polyfill.js';
import '../../styles/input.css';
import { createDownloadFAB } from '../common/download-button.js';
import { showToast } from '../common/toast.js';
import { initPreview } from '../common/preview.js';
import { debounceLeading, debounceTrailing } from '../common/debounce.js';
import { getSettings, sanitizeSubfolder } from '../common/settings.js';
import { renderPath } from '../common/template.js';

// ─── Pixiv Data Extraction ──────────────────────────────────────

/**
 * Parse the preload JSON data that Pixiv embeds in the page.
 * @returns {object|null} The preload data object
 */
function getPreloadData() {
  const meta = document.getElementById('meta-preload-data');
  if (!meta) return null;
  try {
    return JSON.parse(meta.getAttribute('content'));
  } catch {
    return null;
  }
}

/**
 * Extract artwork data from the preload data.
 * @param {string} artworkId
 * @returns {object|null} Artwork data with urls, user info, etc.
 */
function getArtworkFromPreload(artworkId) {
  const data = getPreloadData();
  if (!data || !data.illust) return null;
  return data.illust[artworkId] || null;
}

/**
 * Get the current artwork ID from the URL.
 * @returns {string|null}
 */
function getArtworkIdFromUrl() {
  const match = window.location.pathname.match(/\/artworks\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Build the original URL for a specific page of a multi-page work.
 * @param {string} baseOriginalUrl - The original URL for page 0
 * @param {number} pageIndex - Zero-based page index
 * @returns {string}
 */
function getPageUrl(baseOriginalUrl, pageIndex) {
  return baseOriginalUrl.replace('_p0', `_p${pageIndex}`);
}

/**
 * Sanitize a string for use as a filename/folder name.
 * @param {string} str
 * @returns {string}
 */
function sanitizeForFilename(str) {
  return str
    .replace(/[/\\:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 100); // Limit length
}

// ─── Download Logic ─────────────────────────────────────────────

/**
 * Get artwork data: try preload meta first, then AJAX API.
 * @param {string} artworkId
 * @returns {Promise<object|null>}
 */
async function getArtworkData(artworkId) {
  // Try preload meta first (fastest, available on initial page load)
  const preload = getArtworkFromPreload(artworkId);
  if (preload && preload.urls && preload.urls.original) return preload;

  // Fallback: AJAX API (works on SPA navigation)
  return fetchArtworkData(artworkId);
}

/**
 * Fetch page URLs for multi-page works.
 * @param {string} artworkId
 * @returns {Promise<string[]>} Array of original image URLs
 */
async function fetchPageUrls(artworkId) {
  try {
    const response = await fetch(`https://www.pixiv.net/ajax/illust/${artworkId}/pages`, {
      credentials: 'include',
    });
    if (!response.ok) return [];
    const json = await response.json();
    if (json.error || !json.body) return [];
    return json.body.map((p) => p.urls.original);
  } catch {
    return [];
  }
}

/**
 * Fetch ugoira (animated work) metadata: the frames zip URL + per-frame delays.
 * @param {string} artworkId
 * @returns {Promise<object|null>} { src, originalSrc, mime_type, frames:[{file,delay}] }
 */
async function fetchUgoiraMeta(artworkId) {
  try {
    const response = await fetch(`https://www.pixiv.net/ajax/illust/${artworkId}/ugoira_meta`, {
      credentials: 'include',
    });
    if (!response.ok) return null;
    const json = await response.json();
    if (json.error || !json.body) return null;
    return json.body;
  } catch {
    return null;
  }
}

/**
 * Download an ugoira (animated work). Ugoira are served as a ZIP of frame
 * images plus per-frame delays — not a normal image — so we download the
 * full-resolution frames ZIP and save the frame timings alongside it, from
 * which the animation (GIF/APNG/WebM) can later be reconstructed.
 * @param {string} artworkId
 * @param {object} artwork - Artwork data (for metadata sidecar)
 * @param {string} folder - Download folder path
 * @param {boolean} [quiet] - suppress toasts (batch)
 */
async function downloadUgoira(artworkId, artwork, folder, quiet = false) {
  const meta = await fetchUgoiraMeta(artworkId);
  const zipUrl = meta && (meta.originalSrc || meta.src);
  if (!zipUrl) {
    if (!quiet) showToast('Could not load ugoira data', 'error');
    return;
  }

  const ext = zipUrl.split('.').pop() || 'zip';
  if (!quiet) showToast('Downloading ugoira (animation frames)...', 'info');

  browser.runtime.sendMessage({
    action: 'download',
    url: zipUrl,
    filename: `${folder}/${artworkId}_ugoira.${ext}`,
  });

  // Persist the frame timings so the animation can be reconstructed.
  browser.runtime.sendMessage({
    action: 'saveText',
    content: JSON.stringify({ mime_type: meta.mime_type, frames: meta.frames }, null, 2),
    filename: `${folder}/${artworkId}_ugoira_frames.json`,
  });

  saveArtworkMeta(artwork, folder);
}

/**
 * Download all pages of an artwork by ID.
 * @param {string} artworkId
 * @param {{ quiet?: boolean }} [opts] - quiet suppresses per-work toasts (batch)
 * @returns {Promise<boolean>} whether the work was successfully queued
 */
async function downloadArtworkById(artworkId, opts = {}) {
  const quiet = !!opts.quiet;
  if (!artworkId) {
    if (!quiet) showToast('Could not find artwork ID', 'error');
    return false;
  }

  const artwork = await getArtworkData(artworkId);
  if (!artwork) {
    if (!quiet) showToast('Could not load artwork data', 'error');
    return false;
  }

  const pageCount = artwork.pageCount || 1;
  const userName = sanitizeForFilename(artwork.userName || 'Unknown');
  const userId = artwork.userId || '0';
  const title = sanitizeForFilename(artwork.title || artworkId);
  const subfolder = sanitizeSubfolder(getSettings().pixivSubfolder, 'pixiv');
  const rel = renderPath(getSettings().pixivFolderTemplate || '{userName}-{userId}/{workId}-{title}', {
    userName,
    userId,
    workId: artworkId,
    title,
    type: illustTypeLabel(artwork.illustType),
    date: (artwork.createDate || '').slice(0, 10),
  });
  const folder = rel ? `${subfolder}/${rel}` : subfolder;

  // Ugoira (animated works) are a ZIP of frames + per-frame delays, not a
  // normal image — handle them separately so we don't silently download a
  // single still frame.
  if (artwork.illustType === 2) {
    await downloadUgoira(artworkId, artwork, folder, quiet);
    return true;
  }

  // For multi-page works, fetch all page URLs from the pages API
  let pageUrls;
  if (pageCount > 1) {
    pageUrls = await fetchPageUrls(artworkId);
  }

  // Fallback to single original URL
  if (!pageUrls || pageUrls.length === 0) {
    const originalUrl = artwork.urls && artwork.urls.original;
    if (!originalUrl) {
      if (!quiet) showToast('Could not find original image URL', 'error');
      return false;
    }
    pageUrls = Array.from({ length: pageCount }, (_, i) => getPageUrl(originalUrl, i));
  }

  if (!quiet) {
    showToast(`Downloading ${pageUrls.length} image${pageUrls.length > 1 ? 's' : ''}...`, 'info');
  }

  for (let i = 0; i < pageUrls.length; i++) {
    const pageUrl = pageUrls[i];
    const ext = pageUrl.split('.').pop() || 'jpg';
    const pageName = pageUrls.length > 1
      ? `${artworkId}_p${i}.${ext}`
      : `${artworkId}.${ext}`;

    const filename = `${folder}/${pageName}`;

    browser.runtime.sendMessage({
      action: 'download',
      url: pageUrl,
      filename: filename,
    });
  }

  // Save metadata alongside the images
  saveArtworkMeta(artwork, folder);
  return true;
}

/**
 * Download all pages of the current artwork (from URL).
 */
async function downloadCurrentArtwork() {
  const artworkId = getArtworkIdFromUrl();
  await downloadArtworkById(artworkId);
}

// ─── TOML Metadata ──────────────────────────────────────────────

/**
 * Escape a string for TOML (double-quoted string).
 * @param {string} str
 * @returns {string}
 */
function tomlEscapeString(str) {
  if (str == null) return '""';
  return '"' + String(str)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t') + '"';
}

/**
 * Serialize a TOML array of strings.
 * @param {string[]} arr
 * @returns {string}
 */
function tomlArray(arr) {
  if (!arr || arr.length === 0) return '[]';
  return '[' + arr.map(tomlEscapeString).join(', ') + ']';
}

/**
 * Get the illustType as a human-readable string.
 */
function illustTypeLabel(type) {
  switch (type) {
    case 0: return 'illustration';
    case 1: return 'manga';
    case 2: return 'ugoira';
    default: return 'unknown';
  }
}

/**
 * Strip HTML tags from a string.
 */
function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();
}

/**
 * Save artwork metadata as a .meta.toml file.
 * @param {object} artwork - Pixiv API artwork data (body)
 * @param {string} folder - Download folder path
 */
function saveArtworkMeta(artwork, folder) {
  const tags = artwork.tags && artwork.tags.tags
    ? artwork.tags.tags.map((t) => t.tag)
    : [];
  const tagsTranslated = artwork.tags && artwork.tags.tags
    ? artwork.tags.tags.map((t) => (t.translation && t.translation.en) || t.tag)
    : [];

  const lines = [
    `id = ${tomlEscapeString(artwork.id || artwork.illustId)}`,
    `url = ${tomlEscapeString('https://www.pixiv.net/artworks/' + (artwork.id || artwork.illustId))}`,
    `title = ${tomlEscapeString(artwork.title || artwork.illustTitle)}`,
    `type = ${tomlEscapeString(illustTypeLabel(artwork.illustType))}`,
    `ai_generated = ${artwork.aiType === 2 ? 'true' : 'false'}`,
    '',
    '[creator]',
    `name = ${tomlEscapeString(artwork.userName)}`,
    `id = ${tomlEscapeString(artwork.userId)}`,
    '',
    '[dimensions]',
    `width = ${artwork.width || 0}`,
    `height = ${artwork.height || 0}`,
    `page_count = ${artwork.pageCount || 1}`,
    '',
    '[stats]',
    `bookmarks = ${artwork.bookmarkCount || 0}`,
    `likes = ${artwork.likeCount || 0}`,
    `views = ${artwork.viewCount || 0}`,
    '',
    '[dates]',
    `created = ${tomlEscapeString(artwork.createDate || '')}`,
    `uploaded = ${tomlEscapeString(artwork.uploadDate || '')}`,
    '',
    `tags = ${tomlArray(tags)}`,
    `tags_translated = ${tomlArray(tagsTranslated)}`,
    '',
    `description = ${tomlEscapeString(stripHtml(artwork.description || artwork.illustComment || ''))}`,
    '',
  ];

  const tomlContent = lines.join('\n');
  const artworkId = artwork.id || artwork.illustId;

  browser.runtime.sendMessage({
    action: 'saveText',
    content: tomlContent,
    filename: `${folder}/${artworkId}-meta.toml`,
  });
}

let fabRetryCount = 0;
const FAB_MAX_RETRIES = 5;
const FAB_RETRY_DELAY = 1500;
const OVERLAY_ID = 'aether-pixiv-dl-overlay';

/**
 * Find the main artwork image container on the page.
 * Pixiv renders images via React — we look for the primary artwork <img>
 * by checking src patterns and skipping nav/header elements.
 */
function findArtworkImageContainer() {
  // Strategy 1: Find <a> tags linking to full-size images on pximg
  // Pixiv wraps artwork images in <a href="...i.pximg.net/img-original/...">
  const artworkLinks = document.querySelectorAll('a[href*="i.pximg.net/img-original"], a[href*="i.pximg.net/img-master"]');
  for (const link of artworkLinks) {
    if (link.closest('header') || link.closest('nav')) continue;
    return link;
  }

  // Strategy 2: Find <img> with pximg.net src (master or original)
  const imgs = document.querySelectorAll('img[src*="i.pximg.net"]');
  for (const img of imgs) {
    // Skip header/nav images
    if (img.closest('header') || img.closest('nav')) continue;
    // Use getBoundingClientRect — works even if image hasn't loaded
    const rect = img.getBoundingClientRect();
    // Also check HTML attributes as fallback
    const w = rect.width || parseInt(img.getAttribute('width') || '0', 10);
    const h = rect.height || parseInt(img.getAttribute('height') || '0', 10);
    // Skip small images (avatars, icons < 100px)
    if (w < 100 && h < 100) continue;
    // Return the <a> wrapper or parent div
    const container = img.closest('a') || img.parentElement;
    if (container) return container;
  }

  // Strategy 3: Find <figure> elements (Pixiv sometimes uses these)
  const figures = document.querySelectorAll('figure');
  for (const fig of figures) {
    const rect = fig.getBoundingClientRect();
    if (rect.width > 200 && rect.height > 200) {
      if (!fig.closest('header') && !fig.closest('nav')) return fig;
    }
  }

  // Strategy 4: Canvas-based rendering (ugoira/animated works)
  const canvases = document.querySelectorAll('canvas');
  for (const canvas of canvases) {
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 200 && rect.height > 200) {
      return canvas.parentElement;
    }
  }

  return null;
}

function injectOverlayButton(container) {
  // Remove existing overlay
  const existing = document.getElementById(OVERLAY_ID);
  if (existing) existing.remove();

  // Ensure container is positioned
  const cs = window.getComputedStyle(container);
  if (cs.position === 'static') {
    container.style.position = 'relative';
  }

  const btn = document.createElement('button');
  btn.id = OVERLAY_ID;
  btn.setAttribute('type', 'button');
  btn.setAttribute('title', 'Download with Aether');
  btn.textContent = '⬇';
  btn.style.cssText = [
    'position:absolute',
    'top:8px',
    'left:8px',
    'z-index:100',
    'width:36px',
    'height:36px',
    'border:none',
    'border-radius:8px',
    'cursor:pointer',
    'font-size:18px',
    'line-height:36px',
    'text-align:center',
    'padding:0',
    'color:#e0d4ff',
    'background:linear-gradient(135deg,#6d28d9,#4f46e5)',
    'box-shadow:0 2px 10px rgba(0,0,0,0.5)',
    'opacity:0.7',
    'transition:opacity 0.15s ease, transform 0.15s ease',
  ].join(';');

  btn.addEventListener('mouseenter', () => {
    btn.style.opacity = '1';
    btn.style.transform = 'scale(1.1)';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.opacity = '0.7';
    btn.style.transform = 'scale(1)';
  });

  // Create the debounced handler ONCE and reuse it, so its cooldown state
  // persists across clicks (building a fresh one per click never debounces).
  const debouncedDownload = debounceLeading(() => downloadCurrentArtwork());
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    debouncedDownload();
  });

  container.appendChild(btn);
}

// ─── Thumbnail Download Buttons ─────────────────────────────────

const THUMB_BTN_ATTR = 'data-aether-dl';

/**
 * Inject mini download buttons on all visible artwork thumbnails.
 * Works on: related works, recommendations, search results, user pages, etc.
 */
function injectThumbnailDownloadButtons() {
  // Pixiv thumbnails are links to /artworks/{id}
  const thumbLinks = document.querySelectorAll('a[href*="/artworks/"]');

  for (const link of thumbLinks) {
    // Skip if already injected
    if (link.getAttribute(THUMB_BTN_ATTR)) continue;

    // Must contain an image (skip text-only links)
    const img = link.querySelector('img');
    if (!img) continue;

    // Skip tiny images (icons, avatars)
    const rect = link.getBoundingClientRect();
    if (rect.width < 80 || rect.height < 80) continue;

    // Extract artwork ID
    const match = link.href.match(/\/artworks\/(\d+)/);
    if (!match) continue;
    const artworkId = match[1];

    link.setAttribute(THUMB_BTN_ATTR, artworkId);

    // Ensure container is positioned for absolute overlay
    const cs = window.getComputedStyle(link);
    if (cs.position === 'static') {
      link.style.position = 'relative';
    }

    const btn = document.createElement('button');
    btn.setAttribute('type', 'button');
    btn.setAttribute('title', 'Download with Aether');
    btn.textContent = '⬇';
    btn.style.cssText = [
      'position:absolute',
      'top:4px',
      'left:4px',
      'z-index:10',
      'width:26px',
      'height:26px',
      'border:none',
      'border-radius:6px',
      'cursor:pointer',
      'font-size:13px',
      'line-height:26px',
      'text-align:center',
      'padding:0',
      'color:#e0d4ff',
      'background:linear-gradient(135deg,#6d28d9,#4f46e5)',
      'box-shadow:0 2px 8px rgba(0,0,0,0.4)',
      'opacity:0',
      'transition:opacity 0.15s ease, transform 0.15s ease',
    ].join(';');

    // Show on hover of the parent link
    link.addEventListener('mouseenter', () => {
      btn.style.opacity = '1';
    });
    link.addEventListener('mouseleave', () => {
      btn.style.opacity = '0';
    });

    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'scale(1.15)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'scale(1)';
    });

    const debouncedDownload = debounceLeading(() => downloadArtworkById(artworkId));
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      debouncedDownload();
    });

    link.appendChild(btn);
  }
}

function setupArtworkPageFAB() {
  const artworkId = getArtworkIdFromUrl();
  if (!artworkId) {
    console.log('[Aether] Not an artwork page, skipping overlay');
    return;
  }

  console.log('[Aether] Setting up overlay for artwork:', artworkId);

  // Try to find the image container immediately
  const container = findArtworkImageContainer();
  if (container) {
    console.log('[Aether] Found artwork container, injecting overlay');
    injectOverlayButton(container);
  } else if (fabRetryCount < FAB_MAX_RETRIES) {
    // Image not rendered yet (React hasn't loaded), retry
    fabRetryCount++;
    console.log(`[Aether] Image container not found, retrying (${fabRetryCount}/${FAB_MAX_RETRIES})...`);
    setTimeout(() => setupArtworkPageFAB(), FAB_RETRY_DELAY);
  } else {
    // Final fallback: use fixed FAB
    console.log('[Aether] Falling back to fixed FAB');
    getArtworkData(artworkId).then((artwork) => {
      if (!artwork) return;
      const pageCount = artwork.pageCount || 1;
      createDownloadFAB({
        tooltip: pageCount > 1
          ? `Download All ${pageCount} Pages`
          : 'Download Original',
        onClick: debounceLeading(downloadCurrentArtwork),
      });
    });
  }
}

// ─── Batch Download (user / bookmarks / search pages) ───────────

const PIXIV_BATCH_DELAY_MS = 500; // between works (each may be multi-page)
const PIXIV_MAX_PAGES_CAP = 20;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Classify the current Pixiv page as a batch source, or null if it isn't one.
 * @returns {{type:'user',userId:string,tab:string}|{type:'bookmarks',userId:string}|{type:'search',word:string,mode:string}|null}
 */
function getBatchSource() {
  const path = window.location.pathname;

  let m = path.match(/^\/users\/(\d+)(?:\/(\w+))?/);
  if (m) {
    const userId = m[1];
    const tab = m[2] || 'artworks';
    if (tab === 'bookmarks') return { type: 'bookmarks', userId };
    if (tab === 'illustrations' || tab === 'manga' || tab === 'artworks') {
      return { type: 'user', userId, tab };
    }
    return { type: 'user', userId, tab: 'artworks' };
  }

  m = path.match(/^\/tags\/([^/]+)\/(artworks|illustrations|manga)/);
  if (m) return { type: 'search', word: decodeURIComponent(m[1]), mode: m[2] };

  return null;
}

/** Collect artwork ids currently rendered in the DOM (fallback for listings). */
function collectVisibleArtworkIds() {
  const ids = new Set();
  for (const a of document.querySelectorAll('a[href*="/artworks/"]')) {
    const mm = (a.getAttribute('href') || '').match(/\/artworks\/(\d+)/);
    if (mm) ids.add(mm[1]);
  }
  return [...ids];
}

/** All illust/manga ids for a user, from the stable profile/all endpoint. */
async function fetchUserAllIds(userId, tab) {
  const res = await fetch(`https://www.pixiv.net/ajax/user/${userId}/profile/all`, {
    credentials: 'include',
  });
  if (!res.ok) return [];
  const json = await res.json();
  if (json.error || !json.body) return [];

  const ids = [];
  const wantIllust = tab === 'illustrations' || tab === 'artworks';
  const wantManga = tab === 'manga' || tab === 'artworks';
  if (wantIllust && json.body.illusts && typeof json.body.illusts === 'object') {
    ids.push(...Object.keys(json.body.illusts));
  }
  if (wantManga && json.body.manga && typeof json.body.manga === 'object') {
    ids.push(...Object.keys(json.body.manga));
  }
  // Newest first (ids are numeric strings).
  return ids.sort((a, b) => Number(b) - Number(a));
}

/** A user's bookmarked work ids, paginated up to `maxPages` (48/page). */
async function fetchBookmarkIds(userId, maxPages) {
  const ids = [];
  const limit = 48;
  for (let p = 0; p < maxPages; p++) {
    const offset = p * limit;
    const url = `https://www.pixiv.net/ajax/user/${userId}/illusts/bookmarks?tag=&offset=${offset}&limit=${limit}&rest=show`;
    let json;
    try {
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) break;
      json = await res.json();
    } catch {
      break;
    }
    if (json.error || !json.body || !Array.isArray(json.body.works)) break;
    const works = json.body.works;
    if (works.length === 0) break;
    for (const w of works) if (w && w.id) ids.push(String(w.id));
    if (offset + limit >= (json.body.total || 0)) break;
    await sleep(PIXIV_BATCH_DELAY_MS);
  }
  return ids;
}

/** Search-result work ids, paginated up to `maxPages`. */
async function fetchSearchIds(word, mode, maxPages) {
  const apiMode = mode === 'illustrations' ? 'illustrations' : mode === 'manga' ? 'manga' : 'artworks';
  const ids = [];
  for (let p = 1; p <= maxPages; p++) {
    const url = `https://www.pixiv.net/ajax/search/${apiMode}/${encodeURIComponent(word)}?word=${encodeURIComponent(word)}&order=date_d&mode=all&p=${p}&s_mode=s_tag_full`;
    let json;
    try {
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) break;
      json = await res.json();
    } catch {
      break;
    }
    if (json.error || !json.body) break;
    const container = json.body.illustManga || json.body.illust || json.body.manga;
    const data = container && Array.isArray(container.data) ? container.data : [];
    if (data.length === 0) break;
    for (const w of data) if (w && w.id) ids.push(String(w.id));
    await sleep(PIXIV_BATCH_DELAY_MS);
  }
  return ids;
}

/** Resolve the list of artwork ids to download for a given batch source. */
async function collectIdsForSource(source, maxPages) {
  try {
    if (source.type === 'user') return await fetchUserAllIds(source.userId, source.tab);
    if (source.type === 'bookmarks') return await fetchBookmarkIds(source.userId, maxPages);
    if (source.type === 'search') {
      const apiIds = await fetchSearchIds(source.word, source.mode, maxPages);
      if (apiIds.length) return apiIds;
      return collectVisibleArtworkIds(); // fall back to what's rendered
    }
  } catch {
    /* fall through to DOM */
  }
  return collectVisibleArtworkIds();
}

/** Crawl and download every work for the current batch source. */
async function batchDownloadPixiv(source) {
  const maxPages = Math.min(PIXIV_MAX_PAGES_CAP, Math.max(1, parseInt(getSettings().pixivMaxPages, 10) || 1));

  showToast('Collecting works…', 'info');
  const ids = [...new Set(await collectIdsForSource(source, maxPages))];

  if (ids.length === 0) {
    showToast('No works found to download', 'error');
    return;
  }

  // Bulk downloads are hard to undo — confirm the count first.
  if (!window.confirm(`Download ${ids.length} work${ids.length === 1 ? '' : 's'}? Each may contain multiple images.`)) {
    return;
  }

  showToast(`Downloading ${ids.length} works…`, 'info');
  let done = 0;
  for (const id of ids) {
    await downloadArtworkById(id, { quiet: true });
    done++;
    if (done % 10 === 0 && done < ids.length) {
      showToast(`Queued ${done}/${ids.length} works…`, 'info');
    }
    await sleep(PIXIV_BATCH_DELAY_MS);
  }
  showToast(`Batch done: ${ids.length} works queued`, 'success');
}

/** On user/bookmarks/search pages, add a "download all" FAB. */
function setupBatchFAB() {
  const source = getBatchSource();
  if (!source) return;

  const tooltip =
    source.type === 'bookmarks' ? 'Download bookmarks'
      : source.type === 'search' ? 'Download search results'
        : 'Download all works';

  createDownloadFAB({
    tooltip,
    onClick: debounceLeading(() => batchDownloadPixiv(source), 3000),
  });
}

// ─── Preview Adapter ────────────────────────────────────────────

/**
 * Extract artwork ID from a thumbnail element.
 * @param {HTMLElement} el
 * @returns {string|null}
 */
function findArtworkIdFromElement(el) {
  // Check for links containing /artworks/
  const link = el.querySelector('a[href*="/artworks/"]') || el.closest('a[href*="/artworks/"]');
  if (link) {
    const match = link.href.match(/\/artworks\/(\d+)/);
    return match ? match[1] : null;
  }
  // Check data attributes
  if (el.dataset && el.dataset.id) return el.dataset.id;
  return null;
}

/** Cache for artwork API data to avoid redundant requests */
const artworkCache = new Map();

/**
 * Fetch artwork data from Pixiv's API.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
async function fetchArtworkData(id) {
  if (artworkCache.has(id)) return artworkCache.get(id);

  try {
    const response = await fetch(`https://www.pixiv.net/ajax/illust/${id}`, {
      credentials: 'include',
    });
    if (!response.ok) return null;
    const json = await response.json();
    if (json.error) return null;

    artworkCache.set(id, json.body);
    return json.body;
  } catch {
    return null;
  }
}

/**
 * Convert an original Pixiv image URL to a "regular" (1200px) URL.
 * @param {string} originalUrl
 * @returns {string}
 */
function toRegularUrl(originalUrl) {
  // Original: https://i.pximg.net/img-original/img/2024/.../12345_p0.png
  // Regular:  https://i.pximg.net/img-master/img/2024/.../12345_p0_master1200.jpg
  return originalUrl
    .replace('/img-original/', '/img-master/')
    .replace(/\.(png|jpg|jpeg|gif)$/, '_master1200.jpg');
}

/** @type {import('../common/preview.js').PreviewAdapter} */
const pixivAdapter = {
  getImageUrl(el) {
    // For thumbnails, get the <img> src directly
    const img = el.querySelector('img');
    if (img && img.src && img.src.includes('pximg.net')) {
      return img.src;
    }
    return null;
  },

  getAllImageUrls(el) {
    // Quick sync preview: reconstruct a proper 540px preview URL from the thumbnail
    // Thumbnail URLs have various formats:
    //   /c/250x250_80_a2/custom-thumb/img/{datetime}/{id}_p0_custom1200.jpg
    //   /c/250x250_80_a2/img-master/img/{datetime}/{id}_p0_square1200.jpg
    //   /c/240x480/img-master/img/{datetime}/{id}_p0_master1200.jpg
    // We extract the datetime + id and build a clean 540px URL
    const img = el.querySelector('img');
    if (img && img.src && img.src.includes('pximg.net')) {
      const match = img.src.match(/img\/(.*)_.*1200/);
      if (match && match[1]) {
        const parts = match[1].split('/');
        const idIndex = parts.pop(); // e.g. "12345_p0"
        const datetime = parts.join('/'); // e.g. "2026/05/10/23/03/44"
        const previewUrl = `https://i.pximg.net/c/540x540_70/img-master/img/${datetime}/${idIndex}_master1200.jpg`;
        return [previewUrl];
      }
      // Fallback: use the thumbnail as-is
      return [img.src];
    }
    return [];
  },

  async getOriginalImageUrls(el) {
    // Fetch artwork data from API to get the actual original URL
    const artworkId = findArtworkIdFromElement(el);
    if (!artworkId) return [];

    const artwork = await fetchArtworkData(artworkId);
    if (!artwork || !artwork.urls) return [];

    // Use 'regular' (1200px) for fast loading — the original can be very large
    // For multi-page works, fetch all page URLs
    const pageCount = artwork.pageCount || 1;
    if (pageCount > 1) {
      const pageUrls = await fetchPageUrls(artworkId);
      if (pageUrls && pageUrls.length > 0) {
        // Convert original URLs to regular (1200px) for preview
        return pageUrls.map((url) => toRegularUrl(url));
      }
    }

    // Single page: use the regular URL
    const regularUrl = artwork.urls.regular || artwork.urls.original;
    return regularUrl ? [regularUrl] : [];
  },

  getWorkId(el) {
    return findArtworkIdFromElement(el);
  },

  download(el) {
    const artworkId = findArtworkIdFromElement(el);
    if (artworkId) downloadArtworkById(artworkId);
  },

  async getWorkMeta(el) {
    // Try to get metadata from cached API data
    const artworkId = findArtworkIdFromElement(el);
    if (!artworkId) return null;

    // Only return from cache (don't trigger a new fetch just for meta)
    const cached = artworkCache.get(artworkId);
    if (cached) {
      return {
        width: cached.width,
        height: cached.height,
      };
    }
    return null;
  },
};

// ─── SPA Navigation Handling ────────────────────────────────────

let lastUrl = '';

function handleNavigation() {
  const currentUrl = window.location.href;
  if (currentUrl === lastUrl) return;
  lastUrl = currentUrl;

  fabRetryCount = 0; // Reset retry counter on navigation

  // Set up on artwork pages
  if (currentUrl.includes('/artworks/')) {
    setupArtworkPageFAB();
  } else {
    // Remove the artwork FAB/overlay when leaving artwork pages, then add the
    // batch "download all" FAB on user/bookmarks/search pages.
    const fab = document.getElementById('aether-download-fab');
    if (fab) fab.remove();
    const overlay = document.getElementById(OVERLAY_ID);
    if (overlay) overlay.remove();
    setupBatchFAB();
  }

  // Inject thumbnail download buttons on all pages
  injectThumbnailDownloadButtons();
}

// ─── Initialization ─────────────────────────────────────────────

function init() {
  console.log('[Aether] Pixiv content script initialized');

  // Handle initial page
  handleNavigation();

  // Initialize preview system
  // Pixiv uses various thumbnail container selectors
  const thumbSelectors = [
    'div[width="184"]',
    'div[width="288"]',
    'div[size="184"]',
    'div[width="136"]',
    'div[width="131"]',
    'li[size="1"]',
    'div[type="illust"]',
  ].join(', ');

  initPreview(pixivAdapter, thumbSelectors);

  // Watch for SPA navigation and new thumbnails via MutationObserver.
  // Debounced so infinite-scroll feeds don't trigger a full-document rescan
  // on every mutation batch.
  const onMutations = debounceTrailing(() => {
    handleNavigation();
    injectThumbnailDownloadButtons();
  }, 200);
  const observer = new MutationObserver(onMutations);
  observer.observe(document.body, { childList: true, subtree: true });

  // Listen to popstate for back/forward navigation
  window.addEventListener('popstate', handleNavigation);

  // Intercept pushState/replaceState for SPA navigation
  const origPushState = history.pushState;
  history.pushState = function (...args) {
    origPushState.apply(this, args);
    handleNavigation();
  };
  const origReplaceState = history.replaceState;
  history.replaceState = function (...args) {
    origReplaceState.apply(this, args);
    handleNavigation();
  };
}

// Listen for download status messages from background
browser.runtime.onMessage.addListener((message) => {
  if (message.action === 'downloadStarted') {
    showToast('Download started!', 'success');
  }
  if (message.action === 'downloadFailed') {
    showToast('Download failed: ' + (message.error || 'Unknown error'), 'error');
  }
});

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
