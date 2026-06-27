#!/usr/bin/env node
/*
 * MCP avatar bridge — lets any MCP client (e.g. the official Claude Desktop) drive the
 * companion window: change its pose/expression, speak, or pop a notification.
 *
 * It's a thin stdio MCP server. Each tool call reads the running app's local bridge
 * endpoint ({port, token} from the runtime file the app publishes) and POSTs a command to
 * its /avatar route — the SAME localhost bridge the Claude Code hooks already use, so no
 * new app surface is needed. No API key; everything stays on 127.0.0.1.
 *
 * Add to an MCP client config (e.g. Claude Desktop), then talk to the avatar:
 *   "mcpServers": {
 *     "companion-avatar": { "command": "node", "args": ["<abs>/resources/mcp/avatar-mcp.mjs"] }
 *   }
 * The bridge file is auto-located per-OS; override with COMPANION_BRIDGE_FILE.
 */
import { readFileSync } from 'node:fs'
import { request } from 'node:http'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const APP = 'ai-avatar-companion'
const POSES = ['idle', 'listening', 'thinking', 'working', 'speaking', 'alert']
const EMOTIONS = ['neutral', 'happy', 'sad', 'surprised', 'angry', 'excited', 'thinking']

function defaultBridgeFile() {
  if (process.platform === 'darwin') {
    return join(homedir(), 'Library', 'Application Support', APP, 'companion-bridge.json')
  }
  if (process.platform === 'win32') {
    const base = process.env.APPDATA || join(homedir(), 'AppData', 'Roaming')
    return join(base, APP, 'companion-bridge.json')
  }
  const base = process.env.XDG_CONFIG_HOME || join(homedir(), '.config')
  return join(base, APP, 'companion-bridge.json')
}

/** POST a command to the running app's bridge. Returns a human-readable result string. */
function sendToAvatar(command) {
  return new Promise((resolve) => {
    let endpoint
    try {
      const file = process.env.COMPANION_BRIDGE_FILE || defaultBridgeFile()
      endpoint = JSON.parse(readFileSync(file, 'utf8'))
    } catch {
      resolve('Companion app is not running (no bridge endpoint found).')
      return
    }
    if (!endpoint?.port || !endpoint?.token) {
      resolve('Companion app is not running.')
      return
    }
    const payload = JSON.stringify(command)
    const req = request(
      {
        host: '127.0.0.1',
        port: endpoint.port,
        path: '/avatar',
        method: 'POST',
        timeout: 1500,
        headers: {
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(payload),
          'x-companion-token': endpoint.token
        }
      },
      (res) => {
        res.resume()
        res.on('end', () => resolve(res.statusCode === 204 ? 'ok' : `bridge returned ${res.statusCode}`))
      }
    )
    req.on('error', () => resolve('Could not reach the companion app.'))
    req.on('timeout', () => {
      req.destroy()
      resolve('Companion app did not respond.')
    })
    req.end(payload)
  })
}

const text = (t) => ({ content: [{ type: 'text', text: t }] })

const server = new McpServer({ name: 'companion-avatar', version: '0.1.0' })

server.registerTool(
  'set_avatar_pose',
  {
    description: 'Set the companion avatar pose.',
    inputSchema: { pose: z.enum(POSES) }
  },
  async ({ pose }) => text(await sendToAvatar({ pose }))
)

server.registerTool(
  'set_avatar_expression',
  {
    description: 'Set the companion avatar facial expression / emotion.',
    inputSchema: { emotion: z.enum(EMOTIONS) }
  },
  async ({ emotion }) => text(await sendToAvatar({ expression: emotion }))
)

server.registerTool(
  'say',
  {
    description: 'Make the companion speak text aloud (text-to-speech + caption).',
    inputSchema: { text: z.string().min(1).max(2000) }
  },
  async ({ text: t }) => text(await sendToAvatar({ speak: t }))
)

server.registerTool(
  'avatar_notify',
  {
    description: 'Show a short notification toast on the companion window.',
    inputSchema: { message: z.string().min(1).max(500) }
  },
  async ({ message }) => text(await sendToAvatar({ message, pose: 'alert' }))
)

await server.connect(new StdioServerTransport())
