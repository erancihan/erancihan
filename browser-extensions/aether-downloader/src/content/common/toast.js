// AetherDownloader — Toast Notification System
// Creates non-blocking toast notifications in the page corner


const TOAST_CONTAINER_ID = 'aether-toast-container';
const TOAST_DURATION = 3000;

/**
 * Ensure the toast container exists in the DOM.
 * @returns {HTMLElement}
 */
function getContainer() {
  let container = document.getElementById(TOAST_CONTAINER_ID);
  if (!container) {
    container = document.createElement('div');
    container.id = TOAST_CONTAINER_ID;
    container.className = 'fixed bottom-5 right-5 z-[2147483647] flex flex-col gap-2 pointer-events-none';
    document.body.appendChild(container);
  }
  return container;
}

/**
 * Show a toast notification.
 * @param {string} text - Message text
 * @param {'success'|'error'|'info'} [type='info'] - Toast type
 * @param {number} [duration=TOAST_DURATION] - Duration in ms
 */
export function showToast(text, type = 'info', duration = TOAST_DURATION) {
  const container = getContainer();

  const toast = document.createElement('div');
  toast.className = [
    'pointer-events-auto',
    'px-4 py-3 rounded-xl',
    'text-sm font-medium text-white',
    'shadow-glass backdrop-blur-xl',
    'animate-toast-in',
    'max-w-xs',
    'flex items-center gap-2',
    type === 'success' ? 'bg-accent-green/90' : '',
    type === 'error' ? 'bg-accent-red/90' : '',
    type === 'info' ? 'bg-surface-glass' : '',
  ].filter(Boolean).join(' ');

  // Icon
  const icon = document.createElement('span');
  icon.className = 'text-base shrink-0';
  if (type === 'success') {
    icon.textContent = '✓';
  } else if (type === 'error') {
    icon.textContent = '✕';
  } else {
    icon.textContent = 'ℹ';
  }
  toast.appendChild(icon);

  // Text
  const span = document.createElement('span');
  span.textContent = text;
  toast.appendChild(span);

  container.appendChild(toast);

  // Auto-dismiss
  setTimeout(() => {
    toast.className = toast.className.replace('animate-toast-in', 'animate-toast-out');
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }, duration);
}
