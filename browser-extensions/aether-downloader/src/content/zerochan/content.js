// AetherDownloader — Zerochan Content Script
// Overrides download buttons and adds hover preview

import '../../styles/input.css';
import { createDownloadFAB } from '../common/download-button.js';
import { showToast } from '../common/toast.js';
import { initPreview } from '../common/preview.js';
import { debounceLeading, debounceTrailing } from '../common/debounce.js';
import { getSettings, sanitizeSubfolder } from '../common/settings.js';

// ─── Utilities ──────────────────────────────────────────────────

/**
 * Extract the character name from the page DOM.
 * Zerochan pages typically have breadcrumbs or header with the character name.
 * @returns {string}
 */
function extractCharacterName() {
  // Try the breadcrumb navigation first
  const breadcrumb = document.querySelector('#breadcrumbs a:last-of-type');
  if (breadcrumb && breadcrumb.textContent) {
    return breadcrumb.textContent.trim().replace(/[/\\:*?"<>|]/g, '_');
  }

  // Try the main tag/title
  const title = document.querySelector('h1, #header h1, .tag-name');
  if (title && title.textContent) {
    return title.textContent.trim().replace(/[/\\:*?"<>|]/g, '_');
  }

  return 'Unknown';
}

/**
 * Extract the original filename from a URL.
 * @param {string} url
 * @returns {string}
 */
function extractFilename(url) {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    return pathParts[pathParts.length - 1] || 'image.jpg';
  } catch {
    return 'image.jpg';
  }
}

/**
 * Get the full-resolution image URL from a Zerochan detail page.
 * @returns {string|null}
 */
function getFullImageUrl() {
  // Prefer an explicit full-resolution link
  // (static.zerochan.net/<Name>.full.<id>.<ext>) over the on-page <img>,
  // which may be a scaled version.
  const downloadLink = document.querySelector('a[href*="static.zerochan.net"], a[download]');
  if (downloadLink && downloadLink.href) {
    return downloadLink.href;
  }

  // Fall back to the large detail image.
  const largeImg = document.querySelector('#large img, .preview img');
  if (largeImg && largeImg.src) {
    return largeImg.src;
  }

  return null;
}

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

/**
 * Inject download buttons on the top-left corner of each thumbnail.
 * Does NOT modify Zerochan's native download links.
 */
function injectDownloadButtons() {
  // Each thumbnail is an <li> with data-id, containing a <div style="position: relative">
  const items = document.querySelectorAll('li[data-id]');

  for (const li of items) {
    // Skip if already injected
    if (li.dataset.aetherInjected) continue;
    li.dataset.aetherInjected = 'true';

    const container = li.querySelector('div[style*="position"]') || li.querySelector('div');
    if (!container) continue;

    // Find the download URL from the existing download link
    const downloadLink = li.querySelector('a[href*="static.zerochan.net"], a[href*="s1.zerochan.net"], a[href*="s2.zerochan.net"], a[href*="s3.zerochan.net"], a[href*="s4.zerochan.net"]');
    if (!downloadLink) continue;

    const url = downloadLink.href;

    // Create overlay button
    const btn = document.createElement('button');
    btn.setAttribute('type', 'button');
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

    // Show on hover
    container.addEventListener('mouseenter', () => {
      btn.style.opacity = '1';
    });
    container.addEventListener('mouseleave', () => {
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
 * Check if we're on a detail page (has a large image).
 * Zerochan detail pages live at /<numericId>; listing/tag/search pages do not,
 * so gate on the URL to avoid matching the first thumbnail in a grid.
 */
function isDetailPage() {
  if (!/^\/\d+$/.test(window.location.pathname)) return false;
  return !!document.querySelector('#large img, .preview img');
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

// ─── Preview Adapter ────────────────────────────────────────────

/** @type {import('../common/preview.js').PreviewAdapter} */
const zerochanAdapter = {
  getImageUrl(el) {
    // The full-size URL lives in the download link inside the same <li>
    // e.g. <a href="https://static.zerochan.net/Burnice.White.full.4692746.jpg">
    const downloadLink = el.querySelector(
      'a[href*="static.zerochan.net"], a[href*="s1.zerochan.net"], a[href*="s2.zerochan.net"], a[href*="s3.zerochan.net"], a[href*="s4.zerochan.net"]'
    );
    if (downloadLink && downloadLink.href && !downloadLink.href.includes('/240/')) {
      return downloadLink.href;
    }

    // Fallback: try to construct from the thumbnail img
    const img = el.querySelector('img');
    if (img) {
      const src = img.src || img.dataset.src;
      if (src) {
        // Thumbnail: s3.zerochan.net/240/{xx}/{xx}/{id}.avif
        // Try to build full URL (won't have the name, but worth trying)
        return src.replace(/\.avif$/, '.jpg');
      }
    }
    return null;
  },

  getAllImageUrls(el) {
    // Zerochan is single-image, so return array with one URL
    const url = this.getImageUrl(el);
    return url ? [url] : [];
  },

  getWorkId(el) {
    // <li data-id="4692746"> or link href
    if (el.dataset && el.dataset.id) return el.dataset.id;
    const link = el.querySelector('a[href*="zerochan.net/"]') || el.closest('a[href*="zerochan.net/"]');
    if (link) {
      const match = link.href.match(/zerochan\.net\/(\d+)/);
      return match ? match[1] : null;
    }
    return null;
  },

  download(el) {
    const url = this.getImageUrl(el);
    if (url) downloadZerochanImage(url);
  },

  getWorkMeta(el) {
    // The img title contains dimensions, e.g. "2649✕3808 3301kb jpg\nOuichi\nUploaded by ..."
    const img = el.querySelector('img');
    if (img) {
      const title = img.getAttribute('title') || '';
      const match = title.match(/(\d+)\s*[×✕x]\s*(\d+)\s+(\d+)kb\s+(\w+)/i);
      if (match) {
        return {
          width: parseInt(match[1], 10),
          height: parseInt(match[2], 10),
          fileSize: match[3] + 'kb',
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

  // Set up FAB on detail pages
  setupDetailPageFAB();

  // Initialize preview on thumbnail listings
  // Common thumbnail selectors on Zerochan
  initPreview(zerochanAdapter, 'li, .thumbnail, [data-id]');

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
