# Plan: Live2D character GUI for the Claude Code CLI (interactive coding companion)

## Context

You want a customizable, interactive 2D avatar (Live2D-style animated character)
that is **also a coding companion** — but powered by the **Claude Code CLI you're
already logged into**, not the Anthropic API. You don't have (and don't want to
require) an Anthropic API key, and neither should anyone else using the tool. The
mental model you described: a window with a character you talk to, *and* the Claude
CLI chat is open right there so you can type into it directly too.

So this is **a GUI + character skin wrapped around the local `claude` CLI**. The app
embeds the real Claude Code session in a terminal pane; the avatar sits beside it and
reacts to what the agent is doing. Coding ability, tools, MCP, and permissions all
come for free because the brain *is* Claude Code.

Target repo: `erancihan/erancihan` (a GitHub profile + `playground/` of experiments)
— greenfield, proposed location `playground/ai-avatar/` or a dedicated repo.

### Why this shape (feasibility recap)

- **Not inside Claude Desktop.** Claude Desktop has no UI-plugin surface (MCP/`.mcpb`
  are backend-only; can't render an avatar inside it). You confirmed a separate popped
  window is fine — so we build a standalone app.
- **No API key.** The Anthropic API / Agent-SDK-with-key path is explicitly out. The
  app instead drives the user's locally-installed, locally-authenticated `claude`
  binary. It stores and transmits **no** Anthropic credentials — auth lives entirely
  in the user's existing Claude Code login. (This is the user's own CLI on their own
  machine, distinct from embedding claude.ai OAuth into a product.)
- **Prerequisite:** Claude Code must be installed and logged in. The app detects this
  on launch and, if missing, prompts the user to install / run `claude login` rather
  than asking for a key.

## Decisions (defaults — adjust on review)

- **Brain & auth:** the local **`claude` CLI** (Claude Code), run as a child process.
  Inherits the user's existing subscription login. No API key, ever.
- **Two surfaces, one session:**
  - An **embedded terminal** (`node-pty` + `xterm.js`) running interactive `claude` —
    the "CLI chat is open and I can type in there" experience.
  - An **avatar chat box** that writes to the same PTY's stdin, so talking to the
    character and typing in the terminal drive the same Claude Code session.
- **Avatar reactions via Claude Code hooks (not TUI scraping).** The app configures
  hooks (`UserPromptSubmit`, `PreToolUse`/`PostToolUse`, `Notification`, `Stop`) that
  emit small JSON cues to a local channel the app watches → `AvatarController` maps
  them to poses (listening / thinking / working / idle / alert).
- **Emotion agent = headless `claude -p`.** A `Stop` hook (or the app) runs a short
  `claude -p` classification ("one-word emotional tone of the last reply", structured)
  using the same CLI login → expression blend. No second authed channel, no API key.
- **Avatar tech:** **Live2D Cubism 5** via `pixi-live2d-display` + PixiJS in the
  renderer, behind an `AvatarController` interface so an open alternative
  (Inochi2D/VRM) can be swapped later.
- **Framework:** Electron + React + TypeScript (Node main process can spawn PTYs and
  manage hook config; mature Live2D web rendering).
- **MCP:** native to Claude Code — users configure MCP servers (filesystem already
  built in, plus GitHub/git/etc.) in Claude Code as usual; the app just surfaces which
  are active. No separate MCP client to build. (A later optional "avatar bridge" MCP
  server could let Claude Desktop drive the window too — not in scope.)
- **MVP scope:** Phase 1 = avatar window + embedded `claude` terminal + dual input.

## Requirements

**Functional**
- Detect a working `claude` CLI + login on launch; guide install/login if absent.
- Frameless, transparent, always-on-top window: Live2D avatar + a terminal pane.
- Embedded interactive `claude` session via PTY; user can type directly in it.
- Avatar chat box that forwards input to the same session.
- Avatar reacts to session state (listening/thinking/working/idle) via hooks.
- Async emotion classification (`claude -p`) → avatar expression.
- Idle animation (breathing/blink) + click/drag interaction.
- Settings: working/project folder, avatar model, personality (appended to Claude
  Code's context, e.g. a `CLAUDE.md` or `--append-system-prompt`), hook toggles.
- (Later) TTS + lip-sync; gaze/mouse tracking; model/outfit & personality swapping.

**Non-functional**
- Stores **no** Anthropic credentials; relies solely on the user's `claude` login.
- First avatar reaction visible < ~1s after a hook fires.
- Avatar render ~60 FPS; graceful fallback if WebGL unavailable.
- Cross-platform (macOS/Windows; Linux best-effort). `node-pty` builds per platform.
- Hook config is written scoped (project/user settings) and is reversible/removable.

## Tech stack

| Concern | Choice |
|---|---|
| Shell | Electron + electron-vite |
| UI | React + TypeScript |
| Terminal | `node-pty` (spawn `claude`) + `xterm.js` (render) |
| Brain/auth | local `claude` CLI (Claude Code), user's existing login — no API key |
| Avatar render | `pixi-live2d-display` + PixiJS v6, Cubism Core runtime (`live2dcubismcore.min.js`) |
| Reactions | Claude Code hooks → local IPC (file/socket) → AvatarController |
| Emotion | headless `claude -p` classification (structured one-word/enum output) |
| Tools/MCP | native Claude Code (filesystem/bash built in; user-configured MCP servers) |
| TTS (later) | Azure AI Speech (viseme) or ElevenLabs; browser AudioWorklet fallback |

## Architecture & critical files (greenfield — to be created)

```
playground/ai-avatar/
  package.json
  electron.vite.config.ts
  src/
    main/                  # Electron main process (Node)
      index.ts             # window: frameless, transparent, alwaysOnTop
      cli/
        detect.ts          # find `claude`, check login; guide install/login
        ptyService.ts      # spawn interactive `claude`; pipe stdin/stdout over IPC
        emotion.ts         # headless `claude -p` emotion classification
      hooks/
        install.ts         # write/remove Claude Code hook config (scoped, reversible)
        bridge.ts          # local channel hooks write to; forward cues to renderer
      secrets.ts           # NONE for Anthropic; app settings only (no API key)
    preload/index.ts       # contextBridge: terminal IO, avatar cues, settings
    renderer/
      App.tsx
      Terminal.tsx         # xterm.js view of the live `claude` session (typeable)
      avatar/
        AvatarController.ts    # interface: load/idle/listen/work/speak/setExpression/lookAt
        Live2DController.ts    # pixi-live2d-display implementation
      components/
        ChatBox.tsx        # avatar input -> forwards to PTY stdin
        Settings.tsx       # project folder, avatar model, personality, hook toggles
  resources/
    hooks/                 # tiny hook scripts that emit JSON cues to the bridge
    models/<sample-model>/ # .model3.json, .moc3, textures, physics, expressions, motions
    runtime/live2dcubismcore.min.js
```

Data flow: user types in `Terminal` **or** `ChatBox` → both go to `ptyService` stdin →
the real `claude` session runs (native tools/MCP/permissions) → output streams back to
`Terminal`. In parallel, Claude Code **hooks** fire → `hooks/bridge` → renderer →
`AvatarController` switches pose; on `Stop`, `emotion.ts` runs `claude -p` →
expression. No Anthropic key anywhere in the flow.

Reuse note: nothing avatar/LLM-related exists in the repo to reuse; built fresh. The
load-bearing abstraction is `AvatarController`, which every later phase builds on.

## Licensing / cost notes (surface to user)

- **No Claude API cost** for the user — it runs on their existing Claude Code
  subscription/login. (Their normal Claude Code usage limits apply.)
- **Live2D Cubism SDK:** free to develop with; a paid Publication License only applies
  to *distribution* above ¥10M (~$67k) annual sales — individuals/small projects are
  exempt. Free for this project.
- **Live2D models:** many free models are personal-use-only; verify per-model license
  before public distribution. Ship one clearly-licensed sample model.
- **TTS (later phase):** Azure/ElevenLabs are paid APIs; browser AudioWorklet lip-sync
  is a free (more latency-sensitive) fallback.

## Phased implementation

Status as of 2026-06-15 — Phases 1–5 shipped and committed; both adopted fold-ins shipped.

1. ✅ **Phase 1 — Core (MVP):** Electron shell + transparent always-on-top window;
   `claude` detect/login guidance; embedded interactive `claude` via PTY + xterm.js;
   avatar chat box forwarding to the same session; idle-animated avatar (Canvas2D
   placeholder, Live2D when a model is present). Coding works immediately.
2. ✅ **Phase 2 — Reactions:** Claude Code hooks → localhost cue bridge → avatar
   listen/think/work/idle poses; permission/notification prompts surfaced in-UI.
3. ✅ **Phase 3 — Emotion & interactivity:** inline `[emotion]` tags (primary) with a
   `claude -p` fallback → expression blends; gaze/mouse tracking; click reactions.
4. ✅ **Phase 4 — Voice & lip-sync:** free Web Speech API TTS of replies; boundary/flap
   lip-sync (AudioWorklet-free fallback); refined idle/double-blink.
5. ✅ **Phase 5 — Customization:** swap avatar models (`companion-model://`); personality
   presets via `--append-system-prompt`; per-model license metadata in UI.
6. ✅ **Phase 6 — Voice input + real lip-sync:**
   - ✅ Voice input: mic + energy VAD → offline sherpa-onnx ASR (user-supplied model in
     `resources/asr/`) → same PTY stdin; barge-in cancels the avatar's speech.
   - ✅ Real lip-sync: offline sherpa-onnx TTS (user-supplied voice in `resources/tts/`)
     synthesizes the reply; the renderer plays it through Web Audio and drives
     `setMouthOpen` from real signal amplitude (AnalyserNode). Web Speech API stays as the
     no-model fallback. No API key, fully offline.
7. **(Optional, later) MCP avatar bridge:** ship an MCP server (`set_avatar_state` /
   `say`) so the official Claude Desktop can also animate the companion window.

## Adopted enhancements (from Open-LLM-VTuber)

See [`docs/open-llm-vtuber-ideas.md`](./docs/open-llm-vtuber-ideas.md) for the full
inspection. We keep our distinguishing **no-API-key, drive-the-real-`claude`-CLI** brain
(their multi-backend LLM layer is explicitly *not* adopted) and our zero-asset placeholder
fallback.

- ✅ **Inline `[emotion]` tags (Phase 3) — shipped.** The session is instructed via
  `--append-system-prompt` to emit one of our 7 emotion tags inline (e.g. `[happy]`).
  Parsed live from the terminal stream (mid-reply, ANSI-safe) and on `Stop`; stripped from
  the visible terminal and from TTS. `claude -p` now runs only as a fallback when no tag is
  present.
- ✅ **Per-model `expressionMap`/`motionMap` (Phase 5) — shipped.**
  `resources/models/<id>/companion.json` may map our emotion/pose labels to a model's
  `.exp3` names/indices and motion groups; `Live2DController` consults it (best-effort
  default when absent).
- ✅ **Real amplitude lip-sync (Phase 6) — shipped.** Offline sherpa-onnx TTS feeds Web
  Audio; an `AnalyserNode` drives `setMouthOpen` from the waveform. Web Speech fallback.
- ✅ **Subtitle/caption panel** — the spoken reply shows as captions while TTS plays.
- ✅ **"Inner thoughts" display** — current tool activity (from the hook stream) shown as
  a title-bar chip, e.g. "editing files", "running a command".
- ✅ **Declarative persona config** — drop `resources/personas/<id>.json` to add a
  personality to the Settings dropdown (no code); merges with built-ins.
- ⏳ **Visual perception** — screenshot/region capture → paste into the `claude` session
  (Claude Code is multimodal). Medium effort; not yet built.

## Verification

- **Prereq:** on a machine with `claude` installed + logged in, app launches and finds
  it; on a machine without, it shows the install/login guidance instead of crashing.
- **Phase 1 e2e:** `npm run dev` opens the transparent always-on-top window; the
  embedded terminal shows a live `claude` session; typing in the terminal works; typing
  in the avatar chat box reaches the same session; ask it to make a small edit in a
  throwaway repo and confirm the file changes on disk — **all without any API key set**
  (verify by unsetting `ANTHROPIC_API_KEY`).
- **Phase 2:** trigger a tool-using prompt; confirm the avatar moves through
  listen → work → idle as the hooks fire, and that removing hook config cleanly
  restores prior settings.
- **Phase 3:** canned happy/sad/frustrated exchanges flip the avatar expression;
  confirm the `claude -p` emotion call is async (doesn't delay the main reply).
- **Per phase:** smoke test the new capability (TTS audio + visemes fire; model swap
  reloads cleanly). Run on macOS and Windows before calling a phase done.
