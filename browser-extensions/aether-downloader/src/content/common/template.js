// AetherDownloader — folder-naming template engine
//
// Renders a path template such as "{userName}-{userId}/{workId}-{title}" against
// a context object. Literal "/" in the template are path separators; each
// {token} value is sanitized into a single safe path segment (slashes inside a
// value become "_"). Missing/empty tokens and empty segments collapse away.

/**
 * Sanitize a value into a single safe path segment.
 * @param {string|number} value
 * @returns {string}
 */
export function sanitizeSegment(value) {
  return String(value == null ? '' : value)
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+$/, '_') // never a bare "." or ".." segment
    .slice(0, 120);
}

/**
 * Render a folder template against a context.
 * @param {string} template - e.g. "{userName}-{userId}/{workId}-{title}"
 * @param {Record<string, string|number>} context
 * @returns {string} relative path with no leading/trailing slash and no empty segments
 */
export function renderPath(template, context) {
  const replaced = String(template || '').replace(/\{(\w+)\}/g, (_, key) => {
    const v = context[key];
    return v === undefined || v === null ? '' : sanitizeSegment(v);
  });
  return replaced
    .split('/')
    .map((seg) => seg.trim())
    .filter(Boolean)
    .join('/');
}
