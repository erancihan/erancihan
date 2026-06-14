#!/usr/bin/env node
/*
 * Claude Code hook forwarder for the companion app.
 *
 * Invoked by Claude Code per hook event. It reads the event JSON from stdin, looks up
 * the running app's local bridge endpoint from a runtime file, and POSTs a small cue.
 *
 * Contract that MUST hold:
 *  - Print NOTHING to stdout. For UserPromptSubmit, stdout is injected into the prompt;
 *    any output here would pollute the conversation.
 *  - Always exit 0, fast. A hook must never block or fail the Claude Code session, even
 *    if the app is closed (no runtime file) or the bridge is unreachable.
 *
 * Usage: node cue.mjs --event <HookEvent> --bridge <runtimeFilePath>
 */
import { readFileSync } from 'node:fs'
import { request } from 'node:http'

function arg(name) {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

const event = arg('event') ?? 'Unknown'
const bridgeFile = arg('bridge')

// Hard ceiling so a stuck hook can never hang the session.
const failSafe = setTimeout(() => process.exit(0), 1500)
failSafe.unref?.()

function done() {
  clearTimeout(failSafe)
  process.exit(0)
}

function readStdin() {
  return new Promise((resolve) => {
    let buf = ''
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      resolve(buf)
    }
    if (process.stdin.isTTY) return finish()
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', (d) => {
      buf += d
      if (buf.length > 64 * 1024) finish()
    })
    process.stdin.on('end', finish)
    process.stdin.on('error', finish)
    setTimeout(finish, 400) // don't wait forever for stdin
  })
}

async function main() {
  if (!bridgeFile) return done()

  let endpoint
  try {
    endpoint = JSON.parse(readFileSync(bridgeFile, 'utf8'))
  } catch {
    return done() // app not running / no bridge — no-op
  }
  if (!endpoint?.port || !endpoint?.token) return done()

  let data
  try {
    const raw = await readStdin()
    data = raw ? JSON.parse(raw) : undefined
  } catch {
    data = undefined
  }

  const payload = JSON.stringify({ event, data })
  const req = request(
    {
      host: '127.0.0.1',
      port: endpoint.port,
      path: '/cue',
      method: 'POST',
      timeout: 800,
      headers: {
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(payload),
        'x-companion-token': endpoint.token
      }
    },
    (res) => {
      res.resume() // drain
      res.on('end', done)
    }
  )
  req.on('error', done)
  req.on('timeout', () => {
    req.destroy()
    done()
  })
  req.end(payload)
}

main().catch(done)
