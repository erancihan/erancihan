// AetherDownloader — Shared Preview Engine
// Hover preview + 1:1 right-click viewer for both Pixiv and Zerochan


const PREVIEW_ID = 'aether-preview-wrap';
const PREVIEW_DELAY = 400; // ms before preview appears
const ZOOM_LEVELS = [0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.6, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 5.0];

// Configurable preview size (defaults, overridden by settings)
let previewMaxHeight = 85; // vh
let previewMaxWidth = 50;  // vw

/** Load preview settings from storage */
async function loadPreviewSettings() {
  try {
    const data = await browser.storage.local.get('aetherSettings');
    const s = data.aetherSettings || {};
    if (s.previewMaxHeight) previewMaxHeight = s.previewMaxHeight;
    if (s.previewMaxWidth) previewMaxWidth = s.previewMaxWidth;
  } catch { /* use defaults */ }
}
loadPreviewSettings();

/**
 * @typedef {object} PreviewAdapter
 * @property {(el: HTMLElement) => string|null} getImageUrl - Extract preview image URL from thumbnail element
 * @property {(el: HTMLElement) => string[]} getAllImageUrls - Get all image URLs for multi-page works (quick/sync)
 * @property {(el: HTMLElement) => Promise<string[]>} [getOriginalImageUrls] - Async: fetch original image URLs via API
 * @property {(el: HTMLElement) => string|null} getWorkId - Extract work ID from thumbnail element
 * @property {(el: HTMLElement) => object|null} getWorkMeta - Optional metadata (title, user, etc.)
 */

/** @type {Map<string, number>} Index memory per work ID */
const indexRecord = new Map();

let currentPreview = null;
let previewTimeout = null;
let currentAdapter = null;

// ─── Hover Preview ──────────────────────────────────────────────

/**
 * Create the preview container element.
 * @returns {HTMLElement}
 */
function createPreviewElement() {
  const wrap = document.createElement('div');
  wrap.id = PREVIEW_ID;
  wrap.className = [
    'fixed z-[2147483645] pointer-events-none',
    'rounded-2xl overflow-hidden',
    'shadow-glass',
    'border border-white/10',
    'bg-surface-overlay',
    'animate-fade-in',
    'transition-opacity duration-150',
  ].join(' ');
  wrap.style.display = 'none';

  const img = document.createElement('img');
  img.style.cssText = `display:block;max-height:${previewMaxHeight}vh;max-width:${previewMaxWidth}vw;object-fit:contain;`;
  img.setAttribute('alt', '');
  wrap.appendChild(img);

  // Page indicator bar (for multi-image works)
  const indicator = document.createElement('div');
  indicator.className = [
    'absolute bottom-0 left-0 right-0',
    'bg-black/60 backdrop-blur-sm',
    'text-white text-xs text-center',
    'py-1 px-3',
    'opacity-0 transition-opacity duration-150',
  ].join(' ');
  indicator.dataset.role = 'indicator';
  wrap.appendChild(indicator);

  document.body.appendChild(wrap);
  return wrap;
}

/**
 * Position the preview beside the thumbnail.
 * @param {HTMLElement} wrap - Preview container
 * @param {DOMRect} thumbRect - Thumbnail bounding rect
 */
function positionPreview(wrap, thumbRect) {
  const viewportW = window.innerWidth;
  const previewW = wrap.offsetWidth || 400;
  const gap = 12;

  // Decide left or right based on available space
  const spaceRight = viewportW - thumbRect.right;
  const spaceLeft = thumbRect.left;

  let left;
  if (spaceRight >= previewW + gap) {
    left = thumbRect.right + gap;
  } else if (spaceLeft >= previewW + gap) {
    left = thumbRect.left - previewW - gap;
  } else {
    // Overlap: place on side with more space
    left = spaceRight > spaceLeft
      ? thumbRect.right + gap
      : Math.max(0, thumbRect.left - previewW - gap);
  }

  // Vertical: center on thumbnail, clamp to viewport
  const previewH = wrap.offsetHeight || 300;
  let top = thumbRect.top + (thumbRect.height / 2) - (previewH / 2);
  top = Math.max(8, Math.min(top, window.innerHeight - previewH - 8));

  wrap.style.left = left + 'px';
  wrap.style.top = top + 'px';
}

/**
 * Show the preview for a given thumbnail element.
 * @param {HTMLElement} thumbEl - The thumbnail element
 * @param {PreviewAdapter} adapter - Site-specific adapter
 */
function showPreview(thumbEl, adapter) {
  const urls = adapter.getAllImageUrls(thumbEl);
  if (!urls || urls.length === 0) return;

  const workId = adapter.getWorkId(thumbEl);
  const startIndex = workId ? (indexRecord.get(workId) || 0) : 0;
  const currentIndex = Math.min(startIndex, urls.length - 1);

  let wrap = document.getElementById(PREVIEW_ID);
  if (!wrap) {
    wrap = createPreviewElement();
  }

  const img = wrap.querySelector('img');
  const indicator = wrap.querySelector('[data-role="indicator"]');

  // Get metadata (dimensions, file size, format) if available
  const meta = adapter.getWorkMeta ? adapter.getWorkMeta(thumbEl) : null;

  // Update max size from settings (may have changed)
  img.style.maxHeight = `${previewMaxHeight}vh`;
  img.style.maxWidth = `${previewMaxWidth}vw`;

  // If we have metadata dimensions, show them immediately (before image loads)
  if (meta && meta.width && meta.height) {
    const parts = [];
    if (urls.length > 1) parts.push(`${currentIndex + 1} / ${urls.length}`);
    parts.push(`${meta.width} × ${meta.height}`);
    if (meta.fileSize) parts.push(meta.fileSize);
    if (meta.format) parts.push(meta.format.toUpperCase());
    indicator.textContent = parts.join('  ·  ');
    indicator.style.opacity = '1';
  }

  // Load quick preview (thumbnail-derived URL)
  img.src = urls[currentIndex];
  img.onload = () => {
    const thumbRect = thumbEl.getBoundingClientRect();
    wrap.style.display = 'block';
    positionPreview(wrap, thumbRect);

    // Update with actual loaded image dimensions
    const parts = [];
    if (urls.length > 1) parts.push(`${currentIndex + 1} / ${urls.length}`);
    parts.push(`${img.naturalWidth} × ${img.naturalHeight}`);
    if (meta && meta.fileSize) parts.push(meta.fileSize);
    if (meta && meta.format) parts.push(meta.format.toUpperCase());
    indicator.textContent = parts.join('  ·  ');
    indicator.style.opacity = '1';
  };

  // Store state
  currentPreview = {
    wrap,
    img,
    indicator,
    urls,
    currentIndex,
    workId,
    thumbEl,
    adapter,
  };

  // Preload next image
  if (currentIndex + 1 < urls.length) {
    const preload = new Image();
    preload.src = urls[currentIndex + 1];
  }

  // Async upgrade: fetch original image URLs from API and replace
  if (adapter.getOriginalImageUrls) {
    adapter.getOriginalImageUrls(thumbEl).then((originalUrls) => {
      // Check that we're still previewing the same work
      if (!currentPreview || currentPreview.workId !== workId) return;
      if (!originalUrls || originalUrls.length === 0) return;

      // Update the stored URLs
      currentPreview.urls = originalUrls;
      const idx = Math.min(currentIndex, originalUrls.length - 1);
      const originalUrl = originalUrls[idx];

      // Don't reload if the URL is the same
      if (originalUrl === img.src) return;

      // Upgrade the image
      img.onload = () => {
        if (!currentPreview || currentPreview.workId !== workId) return;
        const thumbRect = thumbEl.getBoundingClientRect();
        positionPreview(wrap, thumbRect);

        // Show original dimensions
        const parts = [];
        if (originalUrls.length > 1) parts.push(`${idx + 1} / ${originalUrls.length}`);
        parts.push(`${img.naturalWidth} × ${img.naturalHeight}`);
        indicator.textContent = parts.join('  ·  ');
        indicator.style.opacity = '1';
      };
      img.src = originalUrl;
    });
  }
}

/**
 * Navigate multi-image preview by delta.
 * @param {number} delta - +1 for next, -1 for previous
 */
function navigatePreview(delta) {
  if (!currentPreview || currentPreview.urls.length <= 1) return;

  const newIndex = currentPreview.currentIndex + delta;
  if (newIndex < 0 || newIndex >= currentPreview.urls.length) return;

  currentPreview.currentIndex = newIndex;
  currentPreview.img.src = currentPreview.urls[newIndex];
  // Update indicator on load (to get correct dimensions)
  currentPreview.img.onload = () => {
    const dimText = `${currentPreview.img.naturalWidth} × ${currentPreview.img.naturalHeight}`;
    currentPreview.indicator.textContent = `${newIndex + 1} / ${currentPreview.urls.length}  ·  ${dimText}`;
  };

  // Save index
  if (currentPreview.workId) {
    indexRecord.set(currentPreview.workId, newIndex);
  }

  // Preload next
  if (newIndex + 1 < currentPreview.urls.length) {
    const preload = new Image();
    preload.src = currentPreview.urls[newIndex + 1];
  }
}

/**
 * Hide and clean up the preview.
 */
function hidePreview() {
  if (previewTimeout) {
    clearTimeout(previewTimeout);
    previewTimeout = null;
  }
  const wrap = document.getElementById(PREVIEW_ID);
  if (wrap) {
    wrap.style.display = 'none';
  }
  currentPreview = null;
}


// ─── Public API ─────────────────────────────────────────────────

/**
 * Initialize the preview system on a page.
 * @param {PreviewAdapter} adapter - Site-specific adapter for image URL extraction
 * @param {string} thumbSelector - CSS selector for thumbnail containers
 */
export function initPreview(adapter, thumbSelector) {
  currentAdapter = adapter;

  // Delegate events on document.body
  document.body.addEventListener('mouseenter', (e) => {
    const thumb = e.target.closest(thumbSelector);
    if (!thumb) return;

    previewTimeout = setTimeout(() => {
      showPreview(thumb, adapter);
    }, PREVIEW_DELAY);
  }, true);

  document.body.addEventListener('mouseleave', (e) => {
    const thumb = e.target.closest(thumbSelector);
    if (!thumb) return;
    hidePreview();
  }, true);

  // Multi-image navigation via scroll wheel on preview
  document.addEventListener('wheel', (e) => {
    if (!currentPreview) return;
    const wrap = document.getElementById(PREVIEW_ID);
    if (!wrap || wrap.style.display === 'none') return;

    // Check if mouse is near the thumbnail or preview
    const thumbRect = currentPreview.thumbEl.getBoundingClientRect();
    const previewRect = wrap.getBoundingClientRect();
    const mouseX = e.clientX;
    const mouseY = e.clientY;

    const isOverThumb = mouseX >= thumbRect.left && mouseX <= thumbRect.right &&
                        mouseY >= thumbRect.top && mouseY <= thumbRect.bottom;
    const isOverPreview = mouseX >= previewRect.left && mouseX <= previewRect.right &&
                          mouseY >= previewRect.top && mouseY <= previewRect.bottom;

    if (isOverThumb || isOverPreview) {
      e.preventDefault();
      navigatePreview(e.deltaY > 0 ? 1 : -1);
    }
  }, { passive: false });

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (!currentPreview) return;

    if (e.key === 'ArrowRight' || e.key === ' ') {
      e.preventDefault();
      navigatePreview(1);
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      navigatePreview(-1);
    }
    if (e.key === 'Escape') {
      hidePreview();
    }
    if (e.key === 'd' || e.key === 'D') {
      // Download the currently visible image
      if (currentPreview) {
        const url = currentPreview.urls[currentPreview.currentIndex];
        browser.runtime.sendMessage({
          action: 'download',
          url: url,
          filename: url.split('/').pop() || 'image.jpg',
        });
      }
    }
  });


  // Listen for download responses
  browser.runtime.onMessage.addListener((message) => {
    if (message.action === 'downloadStarted') {
      // Handled by toast in the content scripts
    }
  });
}

export { hidePreview, navigatePreview };
