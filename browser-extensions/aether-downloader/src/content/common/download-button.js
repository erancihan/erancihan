// AetherDownloader — Shared Download FAB (Floating Action Button)
// Injects a premium download button on supported pages


const FAB_ID = 'aether-download-fab';

/**
 * Create the download FAB SVG icon using DOMParser (no innerHTML).
 * @returns {SVGElement}
 */
function createDownloadIcon() {
  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
  const doc = new DOMParser().parseFromString(svgString, 'image/svg+xml');
  return doc.documentElement;
}

/**
 * Inject a download FAB onto the page.
 * @param {object} options
 * @param {Function} options.onClick - Callback when FAB is clicked
 * @param {string} [options.tooltip='Download'] - Tooltip text
 * @returns {HTMLElement} The FAB element
 */
export function createDownloadFAB({ onClick, tooltip = 'Download' }) {
  // Remove existing FAB if present
  const existing = document.getElementById(FAB_ID);
  if (existing) {
    existing.remove();
  }

  const fab = document.createElement('button');
  fab.id = FAB_ID;
  fab.setAttribute('type', 'button');
  fab.setAttribute('title', tooltip);
  fab.className = [
    'fixed bottom-6 right-6 z-[2147483646]',
    'w-14 h-14 rounded-full',
    'bg-aether-600 hover:bg-aether-500',
    'text-white',
    'shadow-fab hover:shadow-xl',
    'flex items-center justify-center',
    'transition-all duration-200 ease-out',
    'hover:scale-110 active:scale-95',
    'animate-scale-in',
    'cursor-pointer',
    'border border-white/10',
  ].join(' ');

  const icon = createDownloadIcon();
  icon.classList.add('w-6', 'h-6');
  fab.appendChild(icon);

  fab.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClick(e);
  });

  document.body.appendChild(fab);
  return fab;
}

/**
 * Create a mini download button for injection into thumbnails.
 * @param {object} options
 * @param {Function} options.onClick - Click handler receiving the event
 * @returns {HTMLElement}
 */
export function createMiniDownloadButton({ onClick }) {
  const btn = document.createElement('button');
  btn.setAttribute('type', 'button');
  btn.setAttribute('title', 'Download');
  btn.className = [
    'absolute top-1 right-1 z-10',
    'w-8 h-8 rounded-lg',
    'bg-surface-glass hover:bg-surface-glass-hover',
    'backdrop-blur-md',
    'text-white',
    'flex items-center justify-center',
    'transition-all duration-150',
    'hover:scale-110 active:scale-90',
    'opacity-0 group-hover:opacity-100',
    'cursor-pointer',
    'border border-white/10',
  ].join(' ');

  const icon = createDownloadIcon();
  icon.setAttribute('width', '16');
  icon.setAttribute('height', '16');
  btn.appendChild(icon);

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClick(e);
  });

  return btn;
}
