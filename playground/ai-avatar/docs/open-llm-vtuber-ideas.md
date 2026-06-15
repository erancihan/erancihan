# Ideas from Open-LLM-VTuber

Inspection of **[Open-LLM-VTuber](https://github.com/Open-LLM-VTuber/open-llm-vtuber)**
(docs at <http://docs.llmvtuber.com>) and what our companion app can adopt. Captured
2026-06; verify upstream specifics before implementing.

## What Open-LLM-VTuber is

A cross-platform, **offline-capable** AI VTuber: real-time *spoken* conversation with a
Live2D character, plus visual perception (camera / screen / screenshots). Python backend
(~96%) with a separate web frontend submodule (`Open-LLM-VTuber-Web`). Pluggable backends
for ASR, TTS, and LLM, all selected via YAML. Live2D rendering uses
`pixi-live2d-display` (a lip-sync patched fork — see below), the same library family we
use. MIT licensed; bundled Live2D sample models carry Live2D's own license.

### Their stack, by concern

| Concern | Open-LLM-VTuber | Ours today |
|---|---|---|
| Brain / auth | many LLM backends (Ollama, OpenAI-compat, Claude, Gemini, vLLM, GGUF…) | the local **`claude` CLI** only — no API key, by design |
| Speech **in** (ASR) | sherpa-onnx, Faster/Whisper.cpp, FunASR, Azure, Groq | **none** |
| VAD / barge-in | yes (interrupt the avatar by talking) | none |
| Speech **out** (TTS) | sherpa-onnx, Edge TTS, MeloTTS, GPTSoVITS, Coqui, Azure… | browser Web Speech API (free, no key) |
| Lip-sync | `pixi-live2d-display-lipsyncpatch`, audio-amplitude driven | boundary pulses + random flap (no real audio) |
| Emotion → expression | inline `[emotion]` tags in LLM text → `emotionMap` | second headless `claude -p` classification |
| Visual perception | camera, screen, screenshots → multimodal LLM | none |
| Pet mode | transparent, always-on-top | **yes** (already) |
| Chat persistence | yes | none (the `claude` session persists, not our UI) |
| Config | declarative YAML per character | `settings.json` + `companion.json` per model |

We deliberately diverge on the **brain**: our whole point is driving the user's
already-logged-in Claude Code, so their multi-backend LLM layer is *not* something to
adopt. Everything below is about the avatar/voice/UX layer, which is genuinely better
developed there.

## Concrete mechanisms worth copying

### 1. Inline `[emotion]` tags instead of a second `claude -p` call  ★ highest value
Their LLM emits emotion markers inline, e.g. `Oh, damn! [anger]`. The frontend scans the
reply for `[keyword]`, maps it via `emotionMap`, and switches expression — **instant, free,
no extra model round-trip**. Emotion persists until the next tag or end of turn.

For us this replaces (or front-runs) `cli/emotion.ts`:
- Append an instruction to the session's system prompt (we already have
  `--append-system-prompt` plumbing from Phase 5) telling Claude to emit one of our 7
  emotion tags inline when tone shifts.
- Parse tags from the reply text in `shared/emotion.ts` (cheap regex) and **strip them
  before TTS** so they aren't spoken.
- Keep `claude -p` only as a fallback when no tag is present.
- Net: lower latency, zero extra tokens/cost, and mid-reply emotion changes (not just one
  classification at `Stop`).

### 2. `emotionMap` per model  ★ aligns with our Phase 5
Their `model_dict.json` maps emotion → expression, by index **or** name:
```json
"emotionMap": { "neutral": 0, "anger": 2, "joy": 3 }
// or
"emotionMap": { "neutral": "f01", "anger": "f03", "joy": "f04" }
```
We should grow our `resources/models/<id>/companion.json` with an optional `expressionMap`
(our 7 emotions → that model's `.exp3` names/indices) and a `motionMap`. `Live2DController`
would consult it instead of guessing expression names. Backward compatible (best-effort
default when absent).

### 3. Real amplitude lip-sync via `pixi-live2d-display-lipsyncpatch`
They swap in a patched fork that drives `ParamMouthOpenY` from the **audio amplitude** of a
played sound (you hand it an audio URL). Smoother than our boundary/flap approximation.

Blocker: the Web Speech API gives no audio buffer, so we can't analyze it. To match them we
must move to a TTS engine that returns audio (e.g. **Edge TTS** — free, no key, or a local
sherpa-onnx/Piper), then either use the lipsync patch or a Web Audio `AnalyserNode` →
`controller.setMouthOpen(rms)`. Our `setMouthOpen(0..1)` interface already supports this
with **zero downstream change** — only `VoiceController` and the TTS source change.

### 4. Voice input: ASR + VAD + barge-in  ★ biggest missing capability
Their headline feature, and our largest gap (we're TTS-out only). Path for us:
- Mic capture + **VAD** in the renderer (`@ricky0123/vad-web` / silero) to detect speech.
- **ASR**: browser `SpeechRecognition` (free, zero-dep) for v1; whisper.cpp/sherpa-onnx for
  offline quality later.
- Feed the transcript straight to the **same PTY stdin** the chat box already writes to —
  no new session path needed.
- Barge-in: on detected speech, call `VoiceController.cancel()` to stop the avatar talking.

### 5. Smaller adoptable touches
- **Subtitle/transcript panel** — show the spoken reply as captions (voice-first UX).
- **"Inner thoughts" display** — surface the agent's non-spoken reasoning; maps neatly onto
  Claude Code's tool/thinking stream we already see via hooks.
- **Visual perception** — a screenshot/region-capture hook that pastes an image into the
  `claude` session (Claude Code is already multimodal). Lower priority.
- **Declarative character config** — externalize our personality presets + persona to a
  per-character file, closer to their YAML model.

## What we already match or do better
- Same Live2D rendering family (`pixi-live2d-display`).
- **Pet mode** (frameless / transparent / always-on-top) — done.
- **Graceful zero-asset fallback**: our Canvas2D placeholder runs with no model/runtime at
  all; theirs assumes a Live2D model is present. Keep this.
- **No-API-key, drive-the-real-CLI** brain — a deliberate, distinguishing choice; do not
  trade it away for their multi-backend LLM layer.

## Suggested roadmap impact
- **Phase 6 — Voice input + real lip-sync**: ASR+VAD → PTY stdin (#4); switch TTS to an
  audio-returning engine and drive `setMouthOpen` from amplitude (#3); barge-in.
- **Fold into Phase 3/5**: inline `[emotion]` tags (#1) and per-model `expressionMap` (#2)
  — both small, high-leverage, and compatible with what we built.

## Licensing notes (verify before shipping)
- Open-LLM-VTuber: MIT. Bundled Live2D sample models: **Live2D Free Material License** —
  not MIT; commercial use needs Live2D Inc. permission (same caveat already in our model
  README).
- `pixi-live2d-display-lipsyncpatch`: confirm its license + Cubism Core requirement (we
  already don't ship Cubism Core for license reasons).
- Edge TTS / sherpa-onnx / silero-VAD / whisper.cpp: mostly MIT/Apache/MPL — verify each per
  dependency before bundling.
