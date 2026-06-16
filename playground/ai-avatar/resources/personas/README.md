# Custom personas

Drop a JSON file here to add a personality to the ⚙ Settings → Personality dropdown,
alongside the built-ins (Default / Cheerful / Terse / Mentor / Playful). No code changes.

```
resources/personas/<id>.json
```

Each file:

```json
{
  "label": "Pirate",
  "prompt": "Speak like a friendly pirate — 'arr', 'matey' — while staying technically precise."
}
```

- `label` (required) — shown in the dropdown.
- `prompt` (required) — appended to the session via `--append-system-prompt` when selected.
- `id` (optional) — defaults to the file name; reuse a built-in id (e.g. `terse`) to
  override it.

Selecting a persona fills the editable textarea; **Apply & restart session** activates it.
Files missing `label`/`prompt` are ignored.
