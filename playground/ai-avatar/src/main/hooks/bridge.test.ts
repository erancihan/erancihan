import { describe, expect, it } from 'vitest'
import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { request } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { HookBridge } from './bridge.js'
import type { AvatarCue } from '../../shared/ipc.js'

function postAvatar(
  endpoint: { port: number; token: string },
  body: unknown
): Promise<number> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body)
    const req = request(
      {
        host: '127.0.0.1',
        port: endpoint.port,
        path: '/avatar',
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(payload),
          'x-companion-token': endpoint.token
        }
      },
      (res) => {
        res.resume()
        res.on('end', () => resolve(res.statusCode ?? 0))
      }
    )
    req.on('error', reject)
    req.end(payload)
  })
}

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

  it('routes /avatar commands (MCP bridge) to onCue and onSpeak', async () => {
    const runtimeFile = join(mkdtempSync(join(tmpdir(), 'bridge-')), 'bridge.json')
    const cues: AvatarCue[] = []
    const spoken: string[] = []
    const bridge = new HookBridge(
      runtimeFile,
      (c) => cues.push(c),
      undefined,
      (t) => spoken.push(t)
    )
    await bridge.start()
    try {
      const ep = JSON.parse(readFileSync(runtimeFile, 'utf8'))
      const status = await postAvatar(ep, {
        pose: 'working',
        expression: 'happy',
        speak: 'hi there'
      })
      expect(status).toBe(204)
      await new Promise((r) => setTimeout(r, 50))
      expect(cues).toEqual([{ pose: 'working', expression: 'happy', source: 'mcp' }])
      expect(spoken).toEqual(['hi there'])
    } finally {
      bridge.stop()
    }
  })

  it('rejects /avatar without the token', async () => {
    const runtimeFile = join(mkdtempSync(join(tmpdir(), 'bridge-')), 'bridge.json')
    const bridge = new HookBridge(runtimeFile, () => {})
    await bridge.start()
    try {
      const ep = JSON.parse(readFileSync(runtimeFile, 'utf8'))
      const status = await postAvatar({ port: ep.port, token: 'wrong' }, { pose: 'idle' })
      expect(status).toBe(403)
    } finally {
      bridge.stop()
    }
  })
})
