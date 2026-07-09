// AetherDownloader — Zerochan Content Script
// Adds download buttons + hover preview on Zerochan listings and detail pages.
//
// Image-URL handling follows how established tools (gallery-dl, imgbrd-grabber)
// resolve Zerochan originals:
//   - Thumbnails come from s1..s4.zerochan.net in the 240 (small) / 600 (sample)
//     buckets, extension .jpg/.png/.webp.
//   - Full images come from static.zerochan.net in the `full` bucket, either
//     name-embedded (static.zerochan.net/<Name>.full.<id>.<ext>) or hash-path
//     (static.zerochan.net/full/<xx>/<yy>/<id>.<ext>).
//   - A thumbnail URL can be rewritten to its full URL by swapping the host and
//     the size bucket (imgbrd-grabber's approach).

import '../../browser-polyfill.js';
import '../../styles/input.css';
import { createDownloadFAB } from '../common/download-button.js';
import { showToast } from '../common/toast.js';
import { initPreview } from '../common/preview.js';
import { debounceLeading, debounceTrailing } from '../common/debounce.js';
import { getSettings, sanitizeSubfolder } from '../common/settings.js';

// ─── URL Helpers ────────────────────────────────────────────────

/** Strip characters illegal in filenames/folders. */
function sanitizeName(str) {
  return String(str || '').trim().replace(/[/\\:*?"<>|]/g, '_');
}

/**
 * Rewrite a Zerochan thumbnail URL to its full-resolution original, matching
 * imgbrd-grabber's transform: s{n}.zerochan → static.zerochan, and the
 * 240/600 size bucket → full (both the name-embedded `.240.` and the
 * hash-path `/240/` layouts).
 * @param {string} thumbUrl
 * @returns {string|null}
 */
function thumbToFullUrl(thumbUrl) {
  if (!thumbUrl) return null;
  return thumbUrl
    .replace(/\/s\d+\.zerochan\.net/, '/static.zerochan.net')
    .replace('.240.', '.full.')
    .replace('.600.', '.full.')
    .replace('/240/', '/full/')
    .replace('/600/', '/full/');
}

/**
 * Rewrite a Zerochan thumbnail URL to the 600px "sample" bucket, used for a
 * fast hover preview that upgrades to the full image asynchronously.
 * @param {string} thumbUrl
 * @returns {string|null}
 */
function thumbToSampleUrl(thumbUrl) {
  if (!thumbUrl) return null;
  return thumbUrl.replace('.240.', '.600.').replace('/240/', '/600/');
}

/** Read the thumbnail image URL from a listing element (handles lazy-load).
 * Reads raw attributes first so it also works on documents parsed from fetched
 * HTML (where the .src property would resolve against the wrong base URI). */
function getThumbnailSrc(el) {
  const img = el.querySelector('img');
  if (!img) return null;
  return img.getAttribute('data-src') || img.getAttribute('src') || img.src || null;
}

/**
 * Resolve the full-resolution image URL for a listing thumbnail element.
 * Prefers an explicit static.zerochan.net anchor when the markup exposes one,
 * otherwise reconstructs it from the thumbnail image (the reliable path — a
 * static anchor is not always present in listing markup).
 * @param {HTMLElement} el
 * @returns {string|null}
 */
function getListingImageUrl(el) {
  const staticLink = el.querySelector('a[href*="static.zerochan.net"]');
  if (
    staticLink &&
    staticLink.href &&
    !/[/.](240|600)[/.]/.test(staticLink.href)
  ) {
    return staticLink.href;
  }
  return thumbToFullUrl(getThumbnailSrc(el));
}

// ─── Page Metadata ──────────────────────────────────────────────

/**
 * Extract the primary tag/character name for folder organization.
 * The last breadcrumb crumb is the most specific tag; the container is
 * <nav class="breadcrumbs">. Reading all crumbs and taking the last avoids the
 * `:last-of-type` pitfall when crumbs are wrapped per-item.
 * @returns {string}
 */
function extractCharacterName() {
  const crumbs = document.querySelectorAll(
    'nav.breadcrumbs a, .breadcrumbs a, #breadcrumbs a'
  );
  if (crumbs.length) {
    const last = crumbs[crumbs.length - 1];
    if (last && last.textContent && last.textContent.trim()) {
      return sanitizeName(last.textContent);
    }
  }

  const title = document.querySelector('#content h1, h1, .tag-name');
  if (title && title.textContent && title.textContent.trim()) {
    return sanitizeName(title.textContent);
  }

  return 'Unknown';
}

/**
 * Extract a filesystem-safe filename from an image URL. Zerochan full URLs
 * percent-encode special characters (e.g. Perth.%28Kantai.Collection%29...),
 * so decode before use.
 * @param {string} url
 * @returns {string}
 */
function extractFilename(url) {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const last = pathParts[pathParts.length - 1] || 'image.jpg';
    return sanitizeName(decodeURIComponent(last)) || 'image.jpg';
  } catch {
    return 'image.jpg';
  }
}

/**
 * Get the full-resolution image URL from a Zerochan detail page.
 * The full URL lives in the anchor inside <div id="large"> (also exposed as
 * a.download-button and as JSON-LD contentUrl).
 * @returns {string|null}
 */
function getFullImageUrl() {
  // 1) Anchor inside <div id="large"> / the download button → full static URL.
  const largeLink = document.querySelector('#large a[href], a.download-button[href]');
  if (largeLink && largeLink.href) return largeLink.href;

  // 2) JSON-LD contentUrl (the path maintained tools prefer).
  const ld = document.querySelector('script[type="application/ld+json"]');
  if (ld && ld.textContent) {
    try {
      const data = JSON.parse(ld.textContent);
      let contentUrl = data && data.contentUrl;
      if (!contentUrl && data && Array.isArray(data['@graph'])) {
        const node = data['@graph'].find((g) => g && g.contentUrl);
        if (node) contentUrl = node.contentUrl;
      }
      if (contentUrl) return contentUrl;
    } catch {
      /* malformed JSON-LD — fall through */
    }
  }

  // 3) Any explicit static.zerochan.net link.
  const staticLink = document.querySelector('a[href*="static.zerochan.net"], a[download]');
  if (staticLink && staticLink.href) return staticLink.href;

  // 4) Last resort: the large <img> src (may be a scaled version).
  const largeImg = document.querySelector('#large img, .preview img');
  if (largeImg && largeImg.src) return largeImg.src;

  return null;
}

// ─── Download ───────────────────────────────────────────────────

/**
 * Download a Zerochan image into the configured subfolder, organized by
 * character/tag name.
 * @param {string} url - Full-resolution image URL
 */
function downloadZerochanImage(url) {
  const character = extractCharacterName();
  const originalFilename = extractFilename(url);
  const subfolder = sanitizeSubfolder(getSettings().zerochanSubfolder, 'zerochan');
  const filename = `${subfolder}/${character}/${originalFilename}`;

  showToast('Downloading...', 'info');

  browser.runtime.sendMessage({
    action: 'download',
    url: url,
    filename: filename,
  });
}

// ─── Download Button Injection ──────────────────────────────────

const THUMB_INJECTED_ATTR = 'data-aether-injected';

/**
 * Collect the thumbnail list items on the current page. Prefers the precise
 * `#thumbs > li` container (Zerochan's listing grid) and falls back to
 * `li[data-id]` so we don't arm previews/buttons on unrelated list items.
 * @returns {HTMLElement[]}
 */
function getThumbnailItems() {
  const scoped = document.querySelectorAll('#thumbs > li');
  if (scoped.length) return Array.from(scoped);
  return Array.from(document.querySelectorAll('li[data-id]'));
}

/** Does this listing item link to a numeric detail page and hold a thumbnail? */
function isThumbnailItem(li) {
  const img = li.querySelector('img');
  if (!img) return false;
  const link = li.querySelector('a[href]');
  if (!link) return false;
  try {
    return /^\/\d+/.test(new URL(link.href, window.location.href).pathname);
  } catch {
    return false;
  }
}

/**
 * Inject a download button on each thumbnail. Derives the full-resolution URL
 * from the thumbnail image, so it works even when the listing markup has no
 * explicit static.zerochan.net anchor.
 */
function injectDownloadButtons() {
  for (const li of getThumbnailItems()) {
    if (li.getAttribute(THUMB_INJECTED_ATTR)) continue;
    if (!isThumbnailItem(li)) continue;

    const url = getListingImageUrl(li);
    if (!url) continue;

    li.setAttribute(THUMB_INJECTED_ATTR, 'true');

    // Position the button over the thumbnail's link (or the item itself).
    const container = li.querySelector('a[href]') || li;
    const cs = window.getComputedStyle(container);
    if (cs.position === 'static') container.style.position = 'relative';

    const btn = document.createElement('button');
    btn.setAttribute('type', 'button');
    btn.setAttribute('title', 'Download with Aether');
    btn.textContent = '⬇';
    btn.style.cssText = [
      'position:absolute',
      'top:4px',
      'left:4px',
      'z-index:10',
      'width:28px',
      'height:28px',
      'border:none',
      'border-radius:6px',
      'cursor:pointer',
      'font-size:14px',
      'line-height:28px',
      'text-align:center',
      'padding:0',
      'color:#e0d4ff',
      'background:linear-gradient(135deg,#6d28d9,#4f46e5)',
      'box-shadow:0 2px 8px rgba(0,0,0,0.4)',
      'opacity:0',
      'transition:opacity 0.15s ease',
    ].join(';');

    li.addEventListener('mouseenter', () => {
      btn.style.opacity = '1';
    });
    li.addEventListener('mouseleave', () => {
      btn.style.opacity = '0';
    });

    const handleDownload = debounceLeading(() => downloadZerochanImage(url));
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleDownload();
    });

    container.appendChild(btn);
  }
}

// ─── Detail Page FAB ────────────────────────────────────────────

/**
 * Check if we're on a detail page. Zerochan detail pages live at /<numericId>
 * and render the image inside <div id="large">; gating on the URL avoids
 * matching the first thumbnail on a listing grid.
 */
function isDetailPage() {
  if (!/^\/\d+$/.test(window.location.pathname)) return false;
  return !!document.querySelector('#large');
}

function setupDetailPageFAB() {
  if (!isDetailPage()) return;

  const imageUrl = getFullImageUrl();
  if (!imageUrl) return;

  createDownloadFAB({
    tooltip: 'Download Full Image',
    onClick: debounceLeading(() => downloadZerochanImage(imageUrl)),
  });
}

// ─── Batch Download (listing pages) ─────────────────────────────

const BATCH_DELAY_MS = 250; // throttle between queued downloads
const BATCH_MAX_PAGES = 20; // hard cap regardless of setting

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Is the current page a Zerochan listing/tag/search grid (not a detail page)? */
function isListingPage() {
  return !!document.querySelector('#thumbs') && !/^\/\d+$/.test(window.location.pathname);
}

/** Numeric work id for a listing <li>, from its /{id} detail link. */
function getItemId(li) {
  const link = li.querySelector('a[href]');
  if (!link) return null;
  try {
    const m = new URL(link.href, window.location.href).pathname.match(/^\/(\d+)/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

/** Collect {id, url} for every thumbnail in a (live or fetched) document. */
function collectThumbnails(doc) {
  const out = [];
  for (const li of doc.querySelectorAll('#thumbs > li')) {
    const id = getItemId(li);
    const url = getListingImageUrl(li);
    if (id && url) out.push({ id, url });
  }
  return out;
}

/** Build the URL for page `p` of the current listing, preserving query params. */
function buildPageUrl(p) {
  const params = new URLSearchParams(window.location.search);
  params.set('p', String(p));
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
}

/** Current listing page number (1-based). */
function getCurrentPage() {
  const p = parseInt(new URLSearchParams(window.location.search).get('p') || '1', 10);
  return Number.isFinite(p) && p > 0 ? p : 1;
}

/**
 * Crawl from the current listing page across up to `maxPages` pages, queueing
 * every thumbnail full-resolution into the tag folder. Later pages are fetched
 * same-origin (with cookies, so no special API User-Agent is needed) and parsed;
 * downloads are throttled and de-duplicated by work id.
 * @param {number} maxPages
 */
async function crawlAndDownload(maxPages) {
  const character = extractCharacterName();
  const subfolder = sanitizeSubfolder(getSettings().zerochanSubfolder, 'zerochan');
  const seen = new Set();
  const startPage = getCurrentPage();
  let total = 0;

  for (let i = 0; i < maxPages; i++) {
    let doc = document;
    if (i > 0) {
      try {
        const res = await fetch(buildPageUrl(startPage + i), { credentials: 'include' });
        if (!res.ok) break;
        doc = new DOMParser().parseFromString(await res.text(), 'text/html');
      } catch {
        break;
      }
    }

    const items = collectThumbnails(doc);
    if (items.length === 0) break;

    for (const it of items) {
      if (seen.has(it.id)) continue;
      seen.add(it.id);
      browser.runtime.sendMessage({
        action: 'download',
        url: it.url,
        filename: `${subfolder}/${character}/${extractFilename(it.url)}`,
      });
      total++;
      await sleep(BATCH_DELAY_MS);
    }
    showToast(`Queued ${total} image${total === 1 ? '' : 's'} (page ${i + 1}/${maxPages})...`, 'info');
  }

  showToast(
    total ? `Batch done: ${total} image${total === 1 ? '' : 's'} queued` : 'No images found on this page',
    total ? 'success' : 'error'
  );
}

/** On listing pages, add a FAB that batch-downloads the tag's images. */
function setupBatchFAB() {
  if (!isListingPage()) return;

  const setting = parseInt(getSettings().zerochanMaxPages, 10) || 1;
  const maxPages = Math.min(BATCH_MAX_PAGES, Math.max(1, setting));

  createDownloadFAB({
    tooltip: maxPages > 1 ? `Download all (up to ${maxPages} pages)` : 'Download all on this page',
    onClick: debounceLeading(() => crawlAndDownload(maxPages), 3000),
  });
}

// ─── Preview Adapter ────────────────────────────────────────────

/** @type {import('../common/preview.js').PreviewAdapter} */
const zerochanAdapter = {
  getImageUrl(el) {
    // Medium (600px) sample for a fast hover preview.
    return thumbToSampleUrl(getThumbnailSrc(el));
  },

  getAllImageUrls(el) {
    // Zerochan is single-image, so return an array with one URL.
    const url = this.getImageUrl(el);
    return url ? [url] : [];
  },

  async getOriginalImageUrls(el) {
    // Upgrade the preview to the full-resolution original.
    const full = getListingImageUrl(el);
    return full ? [full] : [];
  },

  getWorkId(el) {
    // Prefer the numeric id from the detail-page link; fall back to data-id.
    const link = el.querySelector('a[href]');
    if (link) {
      try {
        const m = new URL(link.href, window.location.href).pathname.match(/^\/(\d+)/);
        if (m) return m[1];
      } catch {
        /* ignore */
      }
    }
    if (el.dataset && el.dataset.id) return el.dataset.id;
    return null;
  },

  download(el) {
    const url = getListingImageUrl(el);
    if (url) downloadZerochanImage(url);
  },

  getWorkMeta(el) {
    // The img title holds dimensions + size + type, e.g. "2649x3808 3301 KB jpg".
    const img = el.querySelector('img');
    if (img) {
      const title = img.getAttribute('title') || '';
      const match = title.match(/(\d+)\s*[×✕x]\s*(\d+)\s+([\d.]+\s*[kmg]?b)\s+(\w+)/i);
      if (match) {
        return {
          width: parseInt(match[1], 10),
          height: parseInt(match[2], 10),
          fileSize: match[3].replace(/\s+/g, ''),
          format: match[4],
        };
      }
    }
    return null;
  },
};

// ─── Initialization ─────────────────────────────────────────────

function init() {
  // Inject download buttons on thumbnails
  injectDownloadButtons();

  // Set up FAB: single-image download on detail pages, batch on listing pages.
  setupDetailPageFAB();
  setupBatchFAB();

  // Initialize preview on thumbnail listings (scoped to the grid items).
  initPreview(zerochanAdapter, '#thumbs > li, li[data-id]');

  // Re-inject after dynamic content loads. Debounced so infinite-scroll
  // listings don't re-scan the whole document on every mutation batch.
  const observer = new MutationObserver(debounceTrailing(() => {
    injectDownloadButtons();
  }, 200));
  observer.observe(document.body, { childList: true, subtree: true });
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
