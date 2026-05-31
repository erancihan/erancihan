// AetherDownloader — Debounce Utility

/**
 * Leading-edge debounce: fires immediately on first call, then ignores
 * subsequent calls until `delay` ms have passed with no calls.
 *
 * @param {Function} fn - Function to debounce
 * @param {number} [delay=1000] - Cooldown in milliseconds
 * @returns {Function} Debounced function
 */
export function debounceLeading(fn, delay = 1000) {
  let timer = null;
  return function (...args) {
    if (timer === null) {
      fn.apply(this, args);
    }
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
    }, delay);
  };
}
