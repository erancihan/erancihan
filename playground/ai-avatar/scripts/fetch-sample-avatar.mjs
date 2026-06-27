#!/usr/bin/env node
/*
 * Fetch a free sample Live2D avatar (Haru) + the Live2D Cubism Core runtime into
 * resources/. These are gitignored (size + Live2D license), so they must be (re)fetched
 * after a fresh clone or if a `git clean -x` wipes them.
 *
 * Idempotent: only downloads files that are missing (pass --force to refetch all). Wired
 * into `postinstall`, so `npm install` restores them automatically. Cross-platform (uses
 * Node's global fetch); no API key, public assets.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const force = process.argv.includes('--force')

const CORE_URL = 'https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js'
const BASE = 'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display@master/test/assets/haru'
const MODEL = 'resources/models/haru'

// dest (relative to package root) -> source URL
const targets = [['resources/runtime/live2dcubismcore.min.js', CORE_URL]]
for (const f of [
  'haru_greeter_t03.model3.json',
  'haru_greeter_t03.moc3',
  'haru_greeter_t03.2048/texture_00.png',
  'haru_greeter_t03.2048/texture_01.png',
  'haru_greeter_t03.physics3.json',
  'haru_greeter_t03.pose3.json',
  'haru_greeter_t03.cdi3.json',
  ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `expressions/F0${n}.exp3.json`),
  'motion/haru_g_idle.motion3.json',
  'motion/haru_g_m07.motion3.json',
  'motion/haru_g_m15.motion3.json',
  'motion/haru_g_m14.motion3.json',
  'motion/haru_g_m05.motion3.json'
]) {
  targets.push([`${MODEL}/${f}`, `${BASE}/${f}`])
}

// companion.json (our metadata: license + emotion/pose maps) — recreated if missing.
const companion = {
  name: 'Haru (greeter)',
  license: 'Live2D Free Material License — sample model, verify terms before distribution',
  author: 'Live2D Inc.',
  expressionMap: {
    neutral: 'f00',
    happy: 'f01',
    sad: 'f02',
    surprised: 'f03',
    angry: 'f04',
    excited: 'f05',
    thinking: 'f06'
  },
  motionMap: { idle: 'Idle', listening: 'Idle', thinking: 'Idle', working: 'Tap', speaking: 'Idle', alert: 'Tap' }
}

async function download(dest, url) {
  const abs = join(root, dest)
  if (!force && existsSync(abs)) return 'skip'
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  const buf = Buffer.from(await res.arrayBuffer())
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, buf)
  return 'fetched'
}

async function main() {
  let fetched = 0
  let skipped = 0
  let failed = 0
  for (const [dest, url] of targets) {
    try {
      const r = await download(dest, url)
      r === 'fetched' ? fetched++ : skipped++
    } catch (err) {
      failed++
      console.warn(`  ! ${dest}: ${err instanceof Error ? err.message : err}`)
    }
  }

  const compPath = join(root, MODEL, 'companion.json')
  if (force || !existsSync(compPath)) {
    if (existsSync(join(root, MODEL))) {
      writeFileSync(compPath, JSON.stringify(companion, null, 2) + '\n')
    }
  }

  console.log(`[avatar assets] fetched=${fetched} skipped=${skipped} failed=${failed}`)
}

main().catch((err) => {
  // Never fail the install over optional sample assets (offline/CI is fine).
  console.warn('[avatar assets] fetch skipped:', err instanceof Error ? err.message : err)
})
