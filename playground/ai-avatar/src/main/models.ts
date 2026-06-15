import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { extname, join, sep } from 'node:path'
import {
  normalizeMeta,
  pickModel3File,
  type ModelInfo,
  type ModelMeta
} from '../shared/models.js'

export const MODEL_SCHEME = 'companion-model'

/** Build a custom-protocol URL the renderer can load a model file from. */
export function modelUrlFor(id: string, file: string): string {
  return `${MODEL_SCHEME}://m/${encodeURIComponent(id)}/${encodeURIComponent(file)}`
}

/**
 * Discover avatar models: each subfolder of resources/models that contains a `*.model3.json`
 * is a model. Optional `companion.json` supplies display name + license metadata. Returns []
 * when nothing is installed (the app then uses the built-in placeholder companion).
 */
export function listModels(modelsDir: string): ModelInfo[] {
  if (!existsSync(modelsDir)) return []
  const out: ModelInfo[] = []
  for (const id of readdirSync(modelsDir)) {
    const dir = join(modelsDir, id)
    let entries: string[]
    try {
      if (!statSync(dir).isDirectory()) continue
      entries = readdirSync(dir)
    } catch {
      continue
    }
    const model3 = pickModel3File(entries)
    if (!model3) continue

    let meta: ModelMeta | undefined
    if (entries.includes('companion.json')) {
      try {
        meta = JSON.parse(readFileSync(join(dir, 'companion.json'), 'utf8')) as ModelMeta
      } catch {
        meta = undefined // malformed metadata — fall back to defaults
      }
    }
    out.push({ id, ...normalizeMeta(id, meta), modelUrl: modelUrlFor(id, model3) })
  }
  return out
}

const MIME: Record<string, string> = {
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.moc3': 'application/octet-stream',
  '.exp3': 'application/json',
  '.motion3': 'application/json',
  '.physics3': 'application/json'
}

function contentTypeFor(path: string): string {
  return MIME[extname(path).toLowerCase()] ?? 'application/octet-stream'
}

/**
 * Serve a single file from the models root for the custom protocol. Resolves the request
 * pathname under `modelsDir` and refuses anything that escapes it (path-traversal guard).
 */
export async function serveModelRequest(modelsDir: string, requestUrl: string): Promise<Response> {
  try {
    const rel = decodeURIComponent(new URL(requestUrl).pathname).replace(/^\/+/, '')
    const full = join(modelsDir, rel)
    const root = modelsDir.endsWith(sep) ? modelsDir : modelsDir + sep
    if (full !== modelsDir && !full.startsWith(root)) {
      return new Response('forbidden', { status: 403 })
    }
    const data = await readFile(full)
    return new Response(new Uint8Array(data), {
      headers: { 'content-type': contentTypeFor(full) }
    })
  } catch {
    return new Response('not found', { status: 404 })
  }
}
