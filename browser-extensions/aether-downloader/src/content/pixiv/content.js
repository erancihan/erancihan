// AetherDownloader — Pixiv Content Script
// Parses preload metadata for artwork data, multi-page support, and hover preview

import '../../styles/input.css';
import { createDownloadFAB } from '../common/download-button.js';
import { showToast } from '../common/toast.js';
import { initPreview } from '../common/preview.js';
import { debounceLeading } from '../common/debounce.js';

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
 * Download all pages of an artwork by ID.
 * @param {string} artworkId
 */
async function downloadArtworkById(artworkId) {
  if (!artworkId) {
    showToast('Could not find artwork ID', 'error');
    return;
  }

  const artwork = await getArtworkData(artworkId);
  if (!artwork) {
    showToast('Could not load artwork data', 'error');
    return;
  }

  const pageCount = artwork.pageCount || 1;
  const userName = sanitizeForFilename(artwork.userName || 'Unknown');
  const userId = artwork.userId || '0';
  const title = sanitizeForFilename(artwork.title || artworkId);
  const folder = `pixiv/${userName}-${userId}/${artworkId}-${title}`;

  // For multi-page works, fetch all page URLs from the pages API
  let pageUrls;
  if (pageCount > 1) {
    pageUrls = await fetchPageUrls(artworkId);
  }

  // Fallback to single original URL
  if (!pageUrls || pageUrls.length === 0) {
    const originalUrl = artwork.urls && artwork.urls.original;
    if (!originalUrl) {
      showToast('Could not find original image URL', 'error');
      return;
    }
    pageUrls = Array.from({ length: pageCount }, (_, i) => getPageUrl(originalUrl, i));
  }

  showToast(`Downloading ${pageUrls.length} image${pageUrls.length > 1 ? 's' : ''}...`, 'info');

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

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    debounceLeading(() => downloadCurrentArtwork())();
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

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      debounceLeading(() => downloadArtworkById(artworkId))();
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
    // Remove download buttons when leaving artwork pages
    const fab = document.getElementById('aether-download-fab');
    if (fab) fab.remove();
    const overlay = document.getElementById(OVERLAY_ID);
    if (overlay) overlay.remove();
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

  // Watch for SPA navigation and new thumbnails via MutationObserver
  const observer = new MutationObserver(() => {
    handleNavigation();
    injectThumbnailDownloadButtons();
  });
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
