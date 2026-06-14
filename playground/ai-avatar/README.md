# Companion — a Live2D desktop GUI for the Claude Code CLI

A frameless, transparent, always-on-top desktop companion: an animated character that
sits beside an **embedded, interactive `claude` session**. You type in the terminal
directly, _or_ talk to the character — both drive the **same** Claude Code session.

> **No Anthropic API key, ever.** The "brain" is your already-installed, already-logged-in
> local `claude` CLI, run as a child process. The app stores and transmits **no** Anthropic
> credentials — auth lives entirely in your existing Claude Code login. The PTY is even
> spawned with `ANTHROPIC_API_KEY` stripped, so the session always runs on your
> subscription login.

This implements **Phases 1–2** from [`PLAN.md`](./PLAN.md).

## What works now (Phase 2)

- ✅ **Avatar reactions via Claude Code hooks.** Click ⚡ in the title bar to install
  scoped, reversible hooks into `<projectDir>/.claude/settings.json`. The avatar then
  moves through **listen → think → work → idle** as the session fires
  `UserPromptSubmit` / `PreToolUse` / `PostToolUse` / `Stop`.
- ✅ **Permission / notification prompts surfaced in-UI** as a toast (the prompt itself is
  still answered in the embedded terminal).
- ✅ **Local hook bridge:** an ephemeral `127.0.0.1` HTTP server with a per-launch token,
  published to a runtime file the forwarder reads — stable hook config, rotating endpoint,
  safe no-op when the app is closed. See [`resources/hooks/README.md`](./resources/hooks/README.md).

Removing the hooks (⚡ again) restores the prior settings precisely, leaving any of your
own hooks untouched. Restart the claude session after toggling so Claude Code reloads
its config.

## What works (Phase 1)

- ✅ Frameless / transparent / always-on-top Electron window.
- ✅ Detects the local `claude` CLI on launch (PATH + common install dirs); shows
  install/login guidance instead of crashing if it's absent.
- ✅ Embedded interactive `claude` session via `node-pty` + `xterm.js` — type directly.
- ✅ Avatar chat box that forwards to the **same** PTY stdin.
- ✅ Animated avatar with idle breathing, blinking, gaze tracking, and click "poke",
  behind an `AvatarController` interface.
  - Uses a self-contained **Canvas2D placeholder** companion out of the box (no binary
    assets needed), and transparently upgrades to a real **Live2D** model when one is
    provided. See [`resources/models/README.md`](./resources/models/README.md).
- ✅ Activity-driven pose changes as a fallback when reaction hooks aren't installed.

Later phases (`claude -p` emotion classification → expression blends, voice/lip-sync,
model & personality customization) are described in [`PLAN.md`](./PLAN.md).

## Prerequisites

- **Node.js 18+** and npm.
- **Claude Code** installed and logged in: run `claude` once and complete login.
  (https://docs.claude.com/claude-code)
- Build toolchain for the `node-pty` native module (Xcode Command Line Tools on macOS;
  Build Tools on Windows).

## Setup & run

```bash
cd playground/ai-avatar
npm install
npm run rebuild   # rebuild node-pty against Electron's ABI
npm run dev       # launches the companion window
```

If `npm run dev` shows the install/login guidance, your `claude` CLI wasn't found — fix
that first (`claude --version` should print a version), then relaunch.

### Other scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Run in development (hot reload). |
| `npm run build` | Production build into `out/`. |
| `npm run typecheck` | Type-check main + renderer. |
| `npm test` | Run unit tests (Vitest). |
| `npm run rebuild` | Rebuild `node-pty` for the current Electron. |

## Architecture

```
src/
  main/                  Electron main (Node)
    index.ts             frameless/transparent/always-on-top window + IPC
    cli/detect.ts        find `claude`, parse version, guide install/login
    cli/ptyService.ts    spawn ONE interactive `claude` PTY (no API key in env)
    settings.ts          app prefs only — never any Anthropic credential
    hooks/bridge.ts      localhost cue server (ephemeral port + token) → renderer
    hooks/install.ts     write/remove scoped, reversible Claude Code hook config
  preload/index.ts       contextBridge: terminal IO, detect, settings, hooks, avatar cues
  renderer/
    App.tsx              layout + pose state machine
    components/Terminal.tsx   xterm.js view of the live session (typeable)
    components/ChatBox.tsx    avatar input -> same PTY stdin
    avatar/
      AvatarController.ts        the load-bearing interface (every phase builds on it)
      PlaceholderController.ts   Canvas2D companion (no assets, always available)
      Live2DController.ts        pixi-live2d-display backend (used when a model exists)
      createAvatarController.ts  picks Live2D, falls back to placeholder
      AvatarStage.tsx            React host + gaze/click/cue wiring
  shared/ipc.ts          typed IPC contract shared across processes
  shared/hookEvents.ts   pure event→cue mapping + managed-hook list
resources/
  hooks/cue.mjs          installed hook forwarder → posts cues to the bridge
  models/                drop Live2D models here (not committed; see README)
  runtime/               drop live2dcubismcore.min.js here (not committed; see README)
```

**Data flow:** typing in `Terminal` _or_ `ChatBox` → `companion.sendInput` → `PtyService`
stdin → the real `claude` session (native tools/MCP/permissions) → output streams back to
`Terminal`. In parallel, Claude Code **hooks** → `cue.mjs` → `hooks/bridge` → renderer →
`AvatarController` switches pose. No Anthropic key anywhere in the flow.

## License

MIT for this app's source. Live2D Cubism SDK and any avatar models carry their own
licenses — see the resource READMEs.
