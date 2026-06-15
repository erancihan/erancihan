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
so you can verify a model's license before distributing.

## Licensing

Model binaries are intentionally **not committed** (`.gitignore`d): many free Live2D
models are personal-use-only, and licenses vary per model. Verify each model's license
before distributing. Ship only a model you are licensed to redistribute.
