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

/**
 * Trailing-edge debounce: coalesces bursts of calls and fires once, `delay`
 * ms after the last call. Ideal for MutationObserver callbacks that would
 * otherwise re-scan the DOM on every mutation batch.
 *
 * @param {Function} fn - Function to debounce
 * @param {number} [delay=200] - Quiet period in milliseconds
 * @returns {Function} Debounced function
 */
export function debounceTrailing(fn, delay = 200) {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn.apply(this, args);
    }, delay);
  };
}
