import { describe, expect, it } from 'vitest'
import { spawn } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { HookBridge } from './bridge.js'
import type { AvatarCue } from '../../shared/ipc.js'

// The actual forwarder script shipped in resources/.
const scriptPath = fileURLToPath(new URL('../../../resources/hooks/cue.mjs', import.meta.url))

function runForwarder(event: string, runtimeFile: string, stdin: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [
      scriptPath,
      '--event',
      event,
      '--bridge',
      runtimeFile
    ])
    child.on('error', reject)
    child.on('exit', () => resolve())
    child.stdin.end(stdin)
  })
}

describe('HookBridge + forwarder (integration)', () => {
  it('delivers a mapped cue end-to-end through the real script', async () => {
    const runtimeFile = join(mkdtempSync(join(tmpdir(), 'bridge-')), 'bridge.json')
    const cues: AvatarCue[] = []
    const bridge = new HookBridge(runtimeFile, (c) => cues.push(c))
    await bridge.start()
    try {
      await runForwarder('PreToolUse', runtimeFile, JSON.stringify({ tool_name: 'Edit' }))
      await new Promise((r) => setTimeout(r, 100)) // let the server flush
      expect(cues).toEqual([{ pose: 'working', source: 'PreToolUse:Edit' }])
    } finally {
      bridge.stop()
    }
  })

  it('no-ops without throwing when the bridge file is absent (app closed)', async () => {
    // Forwarder must exit 0 and never block when there's no runtime file.
    await expect(
      runForwarder('Stop', join(tmpdir(), 'does-not-exist-bridge.json'), '{}')
    ).resolves.toBeUndefined()
  })
})
