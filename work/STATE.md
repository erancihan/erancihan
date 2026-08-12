# Job: rewrite space-fighter-metal into anchored incremental format

**Mission.** Rewrite all 12 chapters of `guides/space-fighter-metal/docs/` so every
line of code is still given, but delivered in small anchored snippets with prose
carrying the explanation — instead of whole finished files pasted in.

**Quality bar (agreed with the user, 2026-08-12):**
- Code blocks ≤ 20 lines. Target ≤ 55% code per chapter (currently 62% overall, 92% in ch06).
- Every snippet preceded by a **location line** naming file + function + position.
- New file / new function → ` ```swift ` fence. Modifying existing code → ` ```diff `
  fence with 2–3 real context lines, so "add this / delete that" is unambiguous.
- Explanation lives in **prose**, not in code comments. Files ship lightly commented.
- **Derive, don't present**: naive attempt → run → see it break → fix, for the ideas
  that deserve it (swap-remove, deferred destroy, auto-bank, depth write/no-write).
- One **Challenge** per build chapter.
- Every line still given. **No faded/exercise-only functions** — user chose full disclosure.

## Verification (`python3 work/verify.py [chapter]`)

1. **Reconstruction** — replay each chapter's snippets into a virtual filesystem
   (swift blocks create, diff blocks patch) and diff the result against
   `work/inputs/canonical/`. Proves a reader following the chapter literally ends
   up with the correct file. This is the real ground truth and it catches
   anchoring bugs mechanically.
2. **Format** — block-size cap, code %, location line present, diff hunks carry context.

**Not verifiable here:** Swift/Metal does not compile in this environment. Canonical
files are the reference; per-chapter checkpoints remain the reader's real test.

## Units

| # | Unit | Code lines (old) | Status | Score |
|---|---|---|---|---|
| 1 | 01-project-setup | 68 | todo | |
| 2 | 02-metal-fundamentals | 32 | todo | |
| 3 | 03-the-math-you-need | 140 | todo | |
| 4 | 04-designing-the-ecs | 223 | todo | |
| 5 | 05-meshes-and-geometry | 218 | todo | |
| 6 | 06a-shaders (part of ch06) | 120 | todo | |
| 7 | 06b-renderer-and-main (part of ch06) | 376 | todo | |
| 8 | 07-the-game-loop | 282 | todo | |
| 9 | 08-flight-and-input | 184 | todo | |
| 10 | 09-the-camera | 29 | todo | |
| 11 | 10-gameplay-systems | 329 | todo | |
| 12 | 11-hud-and-feedback | 62 | todo | |
| 13 | 12-where-to-go-next | 0 | todo | |
| 14 | Assemble + README/index + full smoke test | — | todo | |

Units write to `work/units/`; `verify.py` prefers `work/units/` over `docs/` once
populated. Unit 14 copies into `docs/` and re-runs everything from scratch.

## Layout

```
work/
  STATE.md              this file
  verify.py             reconstruction + format checker
  inputs/canonical/     ground-truth Swift files (22) — the reader's target
  units/                rewritten chapters, one per unit
  reviews/              review verdict per unit
  final/                (unit 14 assembles into docs/ directly)
```

## Run log

- **2026-08-12, session 1.** Fresh start. Scaffolded `work/`. Extracted 21 canonical
  Swift files from the merged chapters; hand-assembled 3 more that are built across
  chapters (`Game.swift` final = ch10 complete + ch11 hud line; `main.swift` final =
  ch06 minus StaticPreview + ch08 input wiring; `GameView.swift` final = ch07 + ch08
  input param). Wrote `verify.py` and baselined the current guide: **62% code overall,
  largest block 283 lines, 0 chapters passing the format check.**
  - **Bug found while extracting:** ch06 printed `print("Shader compilation failed: \\(error)")`
    with a note claiming the escape was needed "because the shader source lives in a
    Swift multi-line string." That is false — this `print` is in `Renderer.swift`, not in
    the MSL string, so a reader typing it verbatim gets a literal backslash. Canonical
    corrected to `\(error)`; the bogus note must be dropped in the ch06 rewrite.
  - No subagents used (standing user instruction); loop runs inline.
