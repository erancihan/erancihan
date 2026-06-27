# MCP avatar bridge

`avatar-mcp.mjs` is a small [MCP](https://modelcontextprotocol.io) server that lets **any
MCP client** — e.g. the official **Claude Desktop** — drive the running companion window:
change its pose/expression, make it speak, or pop a notification. It's the optional "let
Claude Desktop animate the companion" piece from the plan.

It forwards each tool call to the companion app over the **same local bridge** the Claude
Code hooks use (reads the app's published `{port, token}` runtime file and POSTs to its
`/avatar` route). No API key; everything stays on `127.0.0.1`. If the app isn't running,
tools return a friendly "not running" message instead of failing.

## Tools

| Tool | Args | Effect |
|---|---|---|
| `set_avatar_pose` | `pose` (idle/listening/thinking/working/speaking/alert) | change pose |
| `set_avatar_expression` | `emotion` (neutral/happy/sad/surprised/angry/excited/thinking) | change expression |
| `say` | `text` | speak aloud (TTS) + caption |
| `avatar_notify` | `message` | show a toast (alert pose) |

## Use it from Claude Desktop

Add to your MCP client config (Claude Desktop: *Settings → Developer → Edit Config*),
using the **absolute** path to this file:

```json
{
  "mcpServers": {
    "companion-avatar": {
      "command": "node",
      "args": ["/absolute/path/to/playground/ai-avatar/resources/mcp/avatar-mcp.mjs"]
    }
  }
}
```

Start the companion app, restart the MCP client, then ask it to e.g. *"set the avatar to
thinking and say hello."* The bridge file is auto-located per-OS; override with the
`COMPANION_BRIDGE_FILE` env var if needed. (`node` must resolve this repo's
`node_modules` — run from a clone where `npm install` has been done.)
