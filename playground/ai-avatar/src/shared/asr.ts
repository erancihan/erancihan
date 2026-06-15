// Pure helpers for the offline ASR config. No Node imports so it unit-tests cleanly.

/**
 * Recursively resolve relative file paths in a sherpa-onnx config against the ASR model
 * folder. `resolve(rel)` returns the absolute path if `rel` names a real file in that
 * folder, else null. This lets a dropped-in model's `config.json` reference its files by
 * bare name (e.g. "encoder.onnx") instead of absolute paths. Pure.
 */
export function resolveConfigPaths(
  value: unknown,
  resolve: (rel: string) => string | null
): unknown {
  if (typeof value === 'string') {
    return resolve(value) ?? value
  }
  if (Array.isArray(value)) {
    return value.map((v) => resolveConfigPaths(v, resolve))
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = resolveConfigPaths(v, resolve)
    }
    return out
  }
  return value
}
