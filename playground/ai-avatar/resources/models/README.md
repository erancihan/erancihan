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
```

Then point the renderer at it: set `MODEL_URL` in `src/renderer/src/App.tsx` to the
model's `model3.json` URL (and serve this folder; see the project README). When a model
is present and loads, the app uses the Live2D backend; otherwise it transparently falls
back to the built-in Canvas2D placeholder companion — so the app always runs.

## Licensing

Model binaries are intentionally **not committed** (`.gitignore`d): many free Live2D
models are personal-use-only, and licenses vary per model. Verify each model's license
before distributing. Ship only a model you are licensed to redistribute.
