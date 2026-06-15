# Avatar models

Drop a Live2D Cubism model here, one folder per model:

```
resources/models/<model-id>/
  <model>.model3.json
  <model>.moc3
  <model>.physics3.json
  textures/...
  motions/...        # Idle, TapBody, etc.
  expressions/...    # *.exp3.json (used in Phase 3)
  companion.json     # optional: { "name", "license", "author" } (shown in Settings)
```

The app **auto-discovers** any folder here that contains a `*.model3.json`. Open ⚙
Settings → Avatar model to select it; its files are served to the renderer over the
`companion-model://` protocol. When a model loads, the app uses the Live2D backend;
otherwise it transparently falls back to the built-in Canvas2D placeholder companion — so
the app always runs. (Live2D rendering also needs the Cubism runtime — see
`resources/runtime/README.md`.)

`companion.json` is optional metadata; its `license`/`author` show in the Settings panel
so you can verify a model's license before distributing. It can also map the companion's
emotions/poses to this model's own expressions and motion groups:

```json
{
  "name": "Hiyori",
  "license": "Live2D Free Material License",
  "author": "Live2D Inc.",
  "expressionMap": { "happy": "f01", "sad": "f02", "angry": 3, "surprised": "f04" },
  "motionMap": { "working": "TapBody", "idle": "Idle" }
}
```

`expressionMap` keys are the 7 emotion labels (`neutral, happy, sad, surprised, angry,
excited, thinking`); values are the model's `.exp3` names or indices. `motionMap` keys are
poses (`idle, listening, thinking, working, speaking, alert`). Both are optional — when a
key is absent the app falls back to best-effort name guessing.

## Licensing

Model binaries are intentionally **not committed** (`.gitignore`d): many free Live2D
models are personal-use-only, and licenses vary per model. Verify each model's license
before distributing. Ship only a model you are licensed to redistribute.
