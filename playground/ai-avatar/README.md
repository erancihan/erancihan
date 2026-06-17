# Companion — a Live2D desktop GUI for the Claude Code CLI

A frameless, transparent, always-on-top desktop companion: an animated character that
sits beside an **embedded, interactive `claude` session**. You type in the terminal
directly, _or_ talk to the character — both drive the **same** Claude Code session.

> **No Anthropic API key, ever.** The "brain" is your already-installed, already-logged-in
> local `claude` CLI, run as a child process. The app stores and transmits **no** Anthropic
> credentials — auth lives entirely in your existing Claude Code login. The PTY is even
> spawned with `ANTHROPIC_API_KEY` stripped, so the session always runs on your
> subscription login.

This implements **Phases 1–6** from [`PLAN.md`](./PLAN.md).

## What works now (Phase 6 — voice in/out)

- ✅ **Talk to the companion (offline ASR).** Click 🎤 to listen; a local energy VAD
  segments your speech, **sherpa-onnx** transcribes it fully offline (no API key, no
  cloud), and the transcript is typed into the **same** `claude` session as the chat box.
- ✅ **Barge-in.** Starting to speak stops the avatar mid-sentence.
- ✅ **Real amplitude lip-sync.** With an offline **sherpa-onnx TTS** voice installed,
  replies are synthesized locally and the avatar's mouth follows the actual audio waveform
  (Web Audio `AnalyserNode` → `setMouthOpen`). Falls back to the Web Speech API + flap when
  no voice is installed.
- The ASR/TTS models are **user-supplied** under `resources/asr/` and `resources/tts/`
  (size/license) — until present, those features fall back / disable and the UI says so. See
  [`resources/asr/README.md`](./resources/asr/README.md) and
  [`resources/tts/README.md`](./resources/tts/README.md).
- ✅ **Visual perception** — 📷 captures your screen (hiding the companion first) and hands
  the image path to the session, so multimodal `claude` can look at what's on your screen.

Real **Live2D models** load too: drop a model under `resources/models/<id>/` plus the
Cubism Core in `resources/runtime/`, then pick it in ⚙ Settings (uses `@pixi/unsafe-eval`
for CSP-safe rendering; emotion/pose mapping via `companion.json`).

## What works (Phase 5)

- ✅ **Settings panel** (⚙ in the title bar): one place for avatar model, personality,
  start directory, and the reactions/voice toggles.
- ✅ **Swap avatar models.** Any folder under `resources/models/<id>` with a
  `*.model3.json` is discovered and selectable; its files are served to the renderer over
  a port-free custom protocol (`companion-model://`). Selecting one switches the avatar
  live (and falls back to the placeholder if the Cubism runtime is missing).
- ✅ **Per-model license metadata.** An optional `companion.json`
  (`{ "name", "license", "author" }`) in a model folder surfaces its name + license in the
  panel — verify a model's license before distributing.
- ✅ **Personality presets.** Default / Cheerful / Terse / Mentor / Playful, or your own
  text — applied to Claude Code via `--append-system-prompt` (restarts the session).

## What works (Phase 4)

- ✅ **Voice + lip-sync (free, no key).** Toggle 🔈/🔊 in the title bar to speak assistant
  replies aloud via the browser's built-in **Web Speech API** (system voices — no Azure/
  ElevenLabs, no API key). The avatar's mouth lip-syncs while it talks (word-boundary
  pulses + a talking flap — the AudioWorklet-free fallback from the plan). Replies are
  cleaned for speech first (code blocks / links / markdown stripped, truncated).
  - Off by default; the setting is persisted. Reading the reply uses the same transcript
    the emotion pass already loads on `Stop`.
- ✅ **Refined idle** — occasional natural double-blink alongside breathing/sway/gaze.

Like emotion, voice needs reaction hooks installed (⚡), since it's triggered by `Stop`.

## What works (Phase 3)

- ✅ **Emotion → expression.** The session is instructed (via the system-prompt append) to
  emit inline `[emotion]` tags. These are the **primary** signal: parsed live from the
  terminal stream — so the expression can change **mid-reply** and even **without hooks**
  installed — and stripped from both the visible terminal and the spoken text. When a reply
  carries no tag, the app falls back to a short headless `claude -p` classification on
  `Stop` (same login, no API key, `--model haiku`; async, cancelled on a new turn).
  - The built-in placeholder companion renders real emotion faces (happy `^_^`, sad,
    surprised, angry brows, excited, thinking, neutral); a Live2D model uses its `.exp3`
    expressions, mapped per-model via `companion.json`'s `expressionMap` (best-effort
    otherwise).
- ✅ **Gaze tracking** (avatar follows the cursor) and **click reactions** (poke) — present
  since Phase 1, now alongside emotion.

(The `claude -p` fallback and TTS still need reaction hooks (⚡) for the `Stop` trigger;
the live `[emotion]` tags work regardless.)

## What works (Phase 2)

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

The only later item left is the optional MCP avatar bridge (let Claude Desktop drive the
window too) — see [`PLAN.md`](./PLAN.md).

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

### Start directory

The claude session spawns in a **start directory** (default: your home folder). Two ways
to set it:

- **In the app:** click the 📁 button in the title bar and pick a folder. It's persisted
  and the session restarts there.
- **At launch:** set `COMPANION_PROJECT_DIR` — this wins for the session (and is not
  persisted):

  ```bash
  COMPANION_PROJECT_DIR=/path/to/your/project npm run dev
  # current shell directory:
  COMPANION_PROJECT_DIR="$PWD" npm run dev
  ```

  Relative paths resolve against where you ran the command. Precedence:
  `COMPANION_PROJECT_DIR` > 📁 picker (persisted) > home.

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
    cli/emotion.ts       headless `claude -p` tone classification on Stop (async)
    models.ts            discover models + serve them over companion-model://
    asr.ts               offline sherpa-onnx speech-to-text (user-supplied model)
    tts.ts               offline sherpa-onnx text-to-speech (user-supplied voice)
    settings.ts          app prefs only — never any Anthropic credential
    hooks/bridge.ts      localhost cue server (ephemeral port + token) → renderer
    hooks/install.ts     write/remove scoped, reversible Claude Code hook config
  preload/index.ts       contextBridge: terminal IO, detect, settings, hooks, avatar cues
  renderer/
    App.tsx              layout + pose state machine
    components/Terminal.tsx   xterm.js view of the live session (typeable)
    components/ChatBox.tsx    avatar input -> same PTY stdin
    components/Settings.tsx   model / personality / dir / toggles panel
    avatar/
      AvatarController.ts        the load-bearing interface (every phase builds on it)
      PlaceholderController.ts   Canvas2D companion (no assets, always available)
      Live2DController.ts        pixi-live2d-display backend (used when a model exists)
      createAvatarController.ts  picks Live2D, falls back to placeholder
      VoiceController.ts         Web Speech API TTS + lip-sync mouth driver
      MicCapture.ts              mic → 16kHz frames → energy VAD → utterances
      AvatarStage.tsx            React host + gaze/click/cue/voice/barge-in wiring
  shared/ipc.ts          typed IPC contract shared across processes
  shared/hookEvents.ts   pure event→cue mapping + managed-hook list
  shared/emotion.ts      pure prompt builder, emotion parser, transcript extractor
  shared/voice.ts        pure reply→speech text cleaner
  shared/models.ts       model metadata, personality presets/args (pure)
  shared/vad.ts          energy voice-activity detection (pure)
  shared/asr.ts          ASR config path resolution (pure)
resources/
  hooks/cue.mjs          installed hook forwarder → posts cues to the bridge
  models/                drop Live2D models here (not committed; see README)
  runtime/               drop live2dcubismcore.min.js here (not committed; see README)
```

**Data flow:** typing in `Terminal` _or_ `ChatBox` → `companion.sendInput` → `PtyService`
stdin → the real `claude` session (native tools/MCP/permissions) → output streams back to
`Terminal`. In parallel, Claude Code **hooks** → `cue.mjs` → `hooks/bridge` → renderer →
`AvatarController` switches pose; on `Stop`, the reply text drives `cli/emotion.ts`
(`claude -p` → expression) and, when 🔊 is on, `VoiceController` (Web Speech TTS + lip-sync).
No Anthropic key anywhere in the flow.

## License

MIT for this app's source. Live2D Cubism SDK and any avatar models carry their own
licenses — see the resource READMEs.
