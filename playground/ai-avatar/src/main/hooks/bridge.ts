import { randomBytes } from 'node:crypto'
import { createServer, type Server } from 'node:http'
import { existsSync, rmSync, writeFileSync } from 'node:fs'
import { mapEventToCue, type HookSignal } from '../../shared/hookEvents.js'
import type { AvatarCue } from '../../shared/ipc.js'

const MAX_BODY = 64 * 1024 // hook payloads are tiny; cap to avoid abuse

/**
 * Local channel the installed Claude Code hooks post cues to. Binds to 127.0.0.1 on an
 * ephemeral port and writes {port, token} to a runtime file that the hook forwarder reads
 * — so hook config can stay stable across launches while the live endpoint rotates each
 * run. A per-run token gate keeps other local processes from injecting avatar cues.
 */
export class HookBridge {
  private server: Server | null = null
  private token = ''
  private port = 0

  constructor(
    /** Runtime file the forwarder reads, e.g. userData/companion-bridge.json. */
    private readonly runtimeFile: string,
    /** Called with a mapped cue for each valid incoming hook signal. */
    private readonly onCue: (cue: AvatarCue) => void
  ) {}

  async start(): Promise<void> {
    if (this.server) return
    this.token = randomBytes(24).toString('hex')

    const server = createServer((req, res) => {
      if (req.method !== 'POST' || req.url !== '/cue') {
        res.writeHead(404).end()
        return
      }
      if (req.headers['x-companion-token'] !== this.token) {
        res.writeHead(403).end()
        return
      }
      let body = ''
      let tooBig = false
      req.on('data', (chunk: Buffer) => {
        body += chunk
        if (body.length > MAX_BODY) {
          tooBig = true
          res.writeHead(413).end()
          req.destroy()
        }
      })
      req.on('end', () => {
        if (tooBig) return
        try {
          const signal = JSON.parse(body) as HookSignal
          const cue = mapEventToCue(signal)
          if (cue) this.onCue(cue)
        } catch {
          // Malformed payload — ignore; never let a hook break the app.
        }
        res.writeHead(204).end()
      })
    })

    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address()
        this.port = typeof addr === 'object' && addr ? addr.port : 0
        resolve()
      })
    })

    this.server = server
    writeFileSync(
      this.runtimeFile,
      JSON.stringify({ port: this.port, token: this.token }),
      'utf8'
    )
  }

  stop(): void {
    this.server?.close()
    this.server = null
    if (existsSync(this.runtimeFile)) {
      try {
        rmSync(this.runtimeFile)
      } catch {
        // best-effort cleanup
      }
    }
  }
}
