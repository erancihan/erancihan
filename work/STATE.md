# STATE — space-fighter-vulkan restructure

**Mission.** Rewrite `guides/space-fighter-vulkan/` so every line of code arrives as
small, anchored snippets with prose carrying the explanation. Quality bar: a reader
following the chapters literally, in order, ends up with a project byte-identical
(modulo comments/blank lines) to `work/inputs/canonical/`, verified mechanically.

**Branch:** `claude/space-fighter-vulkan-restructure-gcy9x9`

---

## Diagnosis (measured before any edit)

Ran `work/measure.py` over the current chapters:

| metric | vulkan (before) | metal (reference format) | brief's bar |
|---|---|---|---|
| code % overall | 30.2% | 43.1% | <55% ✓ both |
| avg added lines/block | 8.6 | 10.8 | ~20 cap ✓ both |
| blocks >20 added lines | 7 (7%) | 3 (2%) | — |
| largest block | 41 | 32 | ~20 |
| **blocks stating where they go** | **7/101 (7%)** | **138/145 (95%)** | **100%** |
| total code lines | 1185 | 2422 | — |

**The defect is anchoring, and — not predicted by the brief — completeness.**

The brief predicted "whole finished files to paste". That is not this guide. This
guide is a *conceptual tour* built from illustrative fragments that float free of
any file. 7% say where they go. And it is not buildable at all: there is no `src/`
tree, and files the chapter-01 map promises (`render/Swapchain.cpp`,
`render/Renderer.cpp`, `Game.cpp`, `Mesh.cpp`, `ecs/World.hpp`, every `systems/*`)
are named but never written. Code that *is* shown has holes marked with prose
comments — e.g. ch05: `// create a VkImage (usage = DEPTH_STENCIL_ATTACHMENT),
allocate with VMA, then a VkImageView` — which is exactly the "rest omitted" the
brief forbids. The low 30.2% code figure is a symptom of the missing code, not health.

So the brief's §2 ("every line of code is still given, nothing elided") requires
**authoring the complete project** and then delivering it as anchored snippets.
That is the job.

---

## Chapter reordering (brief §2g: must compile at every checkpoint)

The existing order cannot compile: ch05 needs VMA (ch07) for the depth image and
says so; ch06's pipeline layout needs ch07's descriptor set layout. Fixed by
swapping buffers before pipelines, and splitting the two heaviest chapters:

| new | chapter | files created |
|---|---|---|
| 01 | Project setup & toolchain | `CMakeLists.txt`, `src/main.cpp` |
| 02 | Vulkan fundamentals: instance, device, queues | `render/VulkanContext.{hpp,cpp}` |
| 03 | The math you need | `Math.hpp` |
| 04 | Designing the ECS | `ecs/{Entity,ComponentStore,World}.hpp`, `Components.hpp` |
| 05.A | Swapchain, depth & render pass | `render/Swapchain.{hpp,cpp}` |
| 05.B | Commands, synchronization & the frame | `render/Renderer.{hpp,cpp}` (begins) |
| 06 | Buffers, memory (VMA) & descriptors | `render/RenderTypes.hpp` |
| 07.A | Shaders & SPIR-V | `shaders/*.vert`, `shaders/*.frag` (8 files) |
| 07.B | The graphics pipeline | (Renderer grows) |
| 08 | Meshes & geometry | `Mesh.{hpp,cpp}` |
| 09 | The game loop & timing | `Game.{hpp,cpp}`, `systems/{Movement,Spin,Render}System.hpp` |
| 10 | Flight & input | `Input.hpp`, `systems/FlightControlSystem.hpp` |
| 11 | The camera | `systems/CameraSystem.hpp` |
| 12 | Gameplay systems | `systems/{Weapon,Enemy,Collision,Lifetime}System.hpp` |
| 13 | HUD & feedback | `HUD.{hpp,cpp}` |
| 14 | Where to go next | none |

`src/main.cpp` and `render/Renderer.cpp` are the two files that grow across
chapters — flagged to the reader in 01 per brief §2g.

---

## Verification method

`work/verify.py`, two independent halves (brief §3):

**(a) Reconstruction.** Replay every chapter's snippets in order into an in-memory
filesystem, carried forward cumulatively. Language block under a "new file"/"replace"
location line writes the file; `diff` block patches by locating context+removed lines,
failing loudly on 0 or >1 matches. Then diff each reconstructed file against
`work/inputs/canonical/`, comparing code only (comments and blank lines stripped).

**(b) Format lint.** Per chapter: ≤20 added lines per teaching block (checkpoint
harnesses get a higher cap), code/prose %, every block anchored to a named file,
every diff block carrying ≥1 context line.

**Ground truth beyond the guide:** the canonical project is compiled for real —
`g++ -fsyntax-only` across every TU against the installed Vulkan/GLM/GLFW headers +
VMA, and `glslangValidator -V` on all 8 shaders. Toolchain confirmed present.
**Runtime IS verifiable after all.** Mesa lavapipe (software Vulkan) + Xvfb +
`VK_LAYER_KHRONOS_validation` are installed, so the game is actually built, run,
screenshotted and validated. `work/run-checks.sh` does all of it.
**Still cannot verify:** behaviour on real GPU hardware — frame pacing, MAILBOX,
vendor driver quirks. Correctness of API usage is covered by validation; performance
claims are not.

---

## How to resume (read this first)

Everything needed is on disk and committed. To continue:

1. `python3 work/verify.py 'work/units/*.md' --partial` — should report **LINT: clean**
   and **replay clean**. If not, fix that before writing anything new.
2. Pick the first `todo` row in the unit table below.
3. Write `work/units/<NN>-<slug>.md` following the format already established in the
   finished chapters (read chapter 01's "How to read the code in this guide" section
   and any adjacent finished chapter for tone and structure).
4. Verify:
   - `python3 work/verify.py 'work/units/*.md' --partial` (lint + replay)
   - compare the files that chapter finishes against canonical (snippet below)
   - `python3 work/verify.py 'work/units/*.md' --partial --emit=/tmp/rX` then
     `cmake -S /tmp/rX -B /tmp/rX/build && cmake --build /tmp/rX/build` — the
     project **must build at every chapter checkpoint**
   - where the chapter claims console output, RUN it (see "Running it" below)
5. Write `work/reviews/<NN>.md`, score /10, fix and re-review below 9 (max 3 rounds).
6. Update this file's unit table + run log, then `git commit`.

Comparing a chapter's finished files against canonical:

```python
import sys; sys.path.insert(0,'work')
import verify, glob
fs,p = verify.reconstruct(sorted(glob.glob('work/units/*.md')))
for x in p: print("PROBLEM", x)
canon = verify.canonical_files()
for n in ['Renderer.cpp']:                      # the files that chapter completes
    w = verify.strip_code(open(canon[n]).read(), n)
    g = verify.strip_code("\n".join(fs[n]), n)
    print(n, "MATCH" if w == g else "DIFFERS")
    if w != g: verify.show_diff(n, w, g, 8)
```

### Running it (this container can actually run the game)

Mesa lavapipe (software Vulkan) + Xvfb + validation layers are installed.

```bash
Xvfb :99 -screen 0 1280x720x24 &          # start in background, once
cd <tree>/build && DISPLAY=:99 \
  VK_ICD_FILENAMES=/usr/share/vulkan/icd.d/lvp_icd.json stdbuf -oL -eL ./SpaceFighter &
sleep 6; DISPLAY=:99 import -window root /tmp/shot.png; pkill -f SpaceFighter
```

`stdbuf` matters — without it stdout is lost when the process is killed. A run is
"clean" when the only output is the device and swapchain lines. `xdotool windowsize`
exercises swapchain recreation. `work/run-checks.sh` does the canonical build + the
behavioural tests + a headless run in one go.

**Never claim a console output you did not reproduce.** Three invented outputs have
already been caught this way (chapters 03, 04, 06); each time the real behaviour was
different *and* more interesting.

### Chapter-by-chapter additions to the two growing files

`src/main.cpp`: ch01 stub → ch02 window + context → ch05.A swapchain + print →
ch05.B renderer, resize callback, draw call, minimise guard → ch08 hand-built
FrameData → ch09 Game + Input + dt + window title (final shape).

`src/render/Renderer.{hpp,cpp}`: ch05.B commands + sync + clear-only frame →
ch06 buffers + descriptors → ch07.B pipelines → ch08 meshes, instance upload,
draw calls, and `drawFrame`/`recordFrame` gaining their `FrameData` parameter.

Canonical `Renderer.cpp` has already been reordered so each chapter *appends* its
group of definitions; keep to that order or the final comparison will fail on
ordering alone.

## Units

| # | unit | status | review |
|---|---|---|---|
| C1 | canonical: core (math, ECS, components, meshes, systems, game, HUD, input) | done | 9.5 |
| C2 | canonical: render layer, shaders, main, CMake | done | 9.5 |
| V | `work/verify.py` (reconstruction + lint) | done | 9 |
| 01 | ch01 project setup + reading conventions + file map | done | 9.5 |
| 02 | ch02 vulkan fundamentals | done | 9.5 |
| 03 | ch03 math | done | 9.5 |
| 04 | ch04 ECS | done | 9.5 |
| 05A | ch05.A swapchain, depth & render pass | done | 9 |
| 05B | ch05.B commands, sync & the frame | done | 9.5 |
| 06 | ch06 buffers, memory & descriptors | done | 9.5 |
| 07A | ch07.A shaders & SPIR-V | done | 9.5 |
| 07B | ch07.B the graphics pipeline | done | 9.5 |
| 08 | ch08 meshes & geometry | done | 9.5 |
| 09 | ch09 game loop & timing | done | 9 |
| 10 | ch10 flight & input | done | 9.5 |
| 11 | ch11 the camera | done | 9.5 |
| 12 | ch12 gameplay systems | done | 9.5 |
| 13 | ch13 HUD & feedback | done | 9.5 |
| 14 | ch14 where to go next | done | 9 |
| F | final assembly: promote, cross-refs, READMEs, full re-verify, drop scaffolding | done* | — |

### What each remaining unit must produce

Each of these creates the listed files, adds its `#include`s to `Game.cpp`
alphabetically, and adds **one line each** to the `Game::update` schedule — the
schedule is deliberately incomplete so that chapters 10–13 each contribute to it.

| unit | files created | schedule line(s) added | other edits |
|---|---|---|---|
| 10 | `Input.hpp`, `systems/FlightControlSystem.hpp` | `FlightControlSystem::update` (first) | `Game::update` gains an `InputState` parameter; `main.cpp` constructs `Input` and passes `input.state()` |
| 11 | `systems/CameraSystem.hpp` | none (runs after the schedule) | replaces the two placeholder camera lines in `Game::update` with `CameraResult cam = CameraSystem::compute(...)`, and `focus = eye` becomes `focus = cam.eye` |
| 12 | `systems/{Weapon,Enemy,Collision,Lifetime}System.hpp` | `WeaponSystem`, `EnemySystem`, `LifetimeSystem`, `CollisionSystem` | `GameState.hpp` gains `struct Director`; `Game.hpp` gains the `director` member |
| 13 | `HUD.{hpp,cpp}` | none | `frame.hud = HUD::build(...)` in `Game::update`; the six-line HUD pass in `Renderer::recordFrame`; `src/HUD.cpp` in `CMakeLists.txt` |
| 14 | none — **"Files created: none."** | — | roadmap chapter; the existing `14-where-to-go-next.md` is already 0% code and mostly reusable, but must be re-pointed at the new chapter numbers |

After unit 13 the full (non-`--partial`) verify must report **40 of 40 files
reconstruct exactly**.

### Final assembly (unit F)

1. `git mv`/copy `work/units/*.md` into `guides/space-fighter-vulkan/docs/`, deleting
   the old `05-…`, `06-…`, `07-…` files that the splits replace.
2. Fix every cross-reference: chapter 06 and 07 **swapped** (buffers now precede
   pipelines) and 05/07 are split into `.A`/`.B`. Grep for `docs/0` and `chapter 0`.
3. Update `guides/space-fighter-vulkan/README.md` — the learning-path table, the
   repository-layout tree, and the mental-model table all list chapter numbers.
4. Update `guides/README.md` if it summarises this guide.
5. Delete `work/` and `scratch` references to it.
6. Re-run the **full** verification from scratch against the promoted files:
   `python3 work/verify.py 'guides/space-fighter-vulkan/docs/*.md'` (before deleting
   `work/`), then emit + `cmake --build` + headless run one last time.

---

## Baseline (before) — `python3 work/verify.py`

    0 of 40 files reconstruct   ·   108 lint problems   ·   0% of blocks anchored
    101 code blocks, avg 8.6 added lines, largest 41, 7 over the 20-line cap

## Current (after chapters 01–09)

    25 of 40 files reconstruct exactly   ·   0 lint problems   ·   100% anchored
    255 code blocks, avg 9.2 added lines, largest 28, 2 over the 20-line cap
    6 files partially built (finished by units 10–13), 9 not yet started

Every chapter checkpoint from 01 to 09 has been reconstructed from the chapters
alone, compiled, and — from 05.B on — run headlessly under validation layers with a
screenshot inspected.

## Run log

- 2026-08-13 · session 2 · ch14 + FINAL ASSEMBLY done. Promoted all 16 chapters into
  guides/space-fighter-vulkan/docs/ (old 05/06/07 deleted); renumbered every ref in
  both READMEs and resources.md; rewrote the guide README's intro/learning-path/usage
  for the new format. FULL verify against the PROMOTED files: 40/40 exact, lint
  clean, 306 blocks, avg 9.2 added lines, largest teaching block 20, 100% anchored.
  Tree emitted from promoted docs builds warning-free, passes all 31 behavioural
  checks, runs validation-silent through resizes.
  *Scaffolding (work/) NOT deleted: git commit is denied by this machine's
  permission config, and deleting uncommitted evidence would destroy it. Delete
  work/ in a follow-up commit once commits are possible.

- 2026-08-13 · session 2 · ch13 done: 32.0% code, 100% anchored. **FULL VERIFY NOW
  REPORTS 40 OF 40 FILES RECONSTRUCT EXACTLY, lint clean.** Rebuilt game played
  unattended to score 200 / hull 80%; HUD elements all confirmed on screenshot.
  Canonical CMakeLists source order reconciled to build order.
- 2026-08-13 · session 2 · ch12 done: 50.1% code, 100% anchored; all 4 systems +
  GameState + Game.hpp reconstruct EXACTLY. ASan derivation is real captured
  output (naive WeaponSystem: plain build "works", ASan reports heap-use-after-free
  in the Transform store). Playable game confirmed by screenshot with synthetic
  fire input. Verifier caught two stray closing braces.
- 2026-08-13 · session 2 · ch11 done: 23.3% code, 100% anchored; CameraSystem.hpp
  reconstructs EXACTLY; chase-camera composition confirmed by screenshot.
  COMMITS BLOCKED on this machine (permission config denies git commit) — all work
  staged; commit per-unit messages recorded here per unit.
- 2026-08-13 · session 2 · ch10 done: 34.1% code, 100% anchored; Input.hpp +
  FlightControlSystem.hpp + main.cpp reconstruct EXACTLY. Flight confirmed by
  screenshots. Verifier caught duplicated includes from a ch09 diff (fixed there).
  MACHINE NOTE: no root here — toolchain lives in /tmp/prefix via apt-get download
  + dpkg -x (source /tmp/prefix/env.sh); WSLg DISPLAY=:0 replaces Xvfb; screenshot
  via import -window on the id from xdotool search.
- 2026-08-12 · session 1 · ch09 done: 45.6% code, 100% anchored; reconstructed tree builds, runs, window title verified. Build check caught an unanchored diff that the lint could not see.
- 2026-08-12 · session 1 · ch08 done: 48.4% code, 100% anchored. Reconstructed tree RENDERS the promised ship+grid+starfield (screenshot verified). Verifier caught an ambiguous anchor and a dropped main.cpp; tightened throwaway detection to key on the scratch/ path.
- 2026-08-12 · session 1 · ch07.B done: 46.6% code, 100% anchored; reconstructed tree builds and creates 5 pipelines validation-silent.
- 2026-08-12 · session 1 · ch07.A done: 38.6% code, 100% anchored; all 8 shaders reconstruct EXACTLY and compile to SPIR-V from the reconstructed tree. Passed clean first time.
- 2026-08-12 · session 1 · ch06 done: 43.4% code, 100% anchored; reconstructed tree builds and runs validation-silent. Replaced an unreliable derivation (undersized descriptor pool is legal since VK 1.1) with a descriptor-type mismatch whose three validation messages were captured from a real run.
- 2026-08-12 · session 1 · ch05.B done: 44.5% code, 100% anchored. Added --emit to verify.py: the tree reconstructed FROM THE CHAPTERS ALONE builds, runs on lavapipe, survives a resize, validation silent, and the centre pixel measures the exact clear colour.
- 2026-08-12 · session 1 · ch05.A done: 100% anchored, lint clean; Swapchain.hpp/.cpp reconstruct EXACTLY. Verifier caught a contextless diff that cascaded into 15 anchor failures.
- 2026-08-12 · session 1 · ch04 done: 47.4% code, 100% anchored; all 4 files reconstruct EXACTLY. Rewrote the swap-remove derivation after running it showed the original harness could not detect the bug.
- 2026-08-12 · session 1 · ch03 done: 37.6% code, 100% anchored; Math.hpp + RenderTypes.hpp reconstruct EXACTLY. Ran the naive versions to confirm every claimed failure output; corrected two invented numbers.
- 2026-08-12 · session 1 · ch02 done: 48.5% code, 100% anchored, largest 19; VulkanContext.hpp/.cpp + VmaImplementation.cpp reconstruct EXACTLY.
- 2026-08-12 · session 1 · ch01 done: 23.1% code, 100% anchored, largest block 19, lint clean.
- 2026-08-12 · session 1 · V done. verify.py written. Positive control: replays the
  metal guide (same format, different author) into 23 files with ZERO anchor
  failures across 145 blocks. Negative control: current vulkan guide = 0/40 files,
  108 lint problems. Baseline recorded. Starting chapter 01.
- 2026-08-12 · session 1 · C2 done. Whole project configures, builds, links; all 8
  shaders compile to SPIR-V. RAN it headless on lavapipe under validation layers:
  renders grid/stars/ship/enemies/reticle/hull-bar, validation completely silent,
  survived 4 window resizes (swapchain recreation). Running it caught two real bugs
  inspection would have missed: grid lines spanning the near plane never rendered
  (fixed: per-cell segments), and two vertex-attribute perf warnings (fixed:
  MeshPositionOnly layout). Added VmaImplementation.cpp; CMake now accepts
  glslangValidator as well as glslc.
- 2026-08-12 · session 1 · C1 done. 17 files, compiles warning-free under -Wall -Wextra;
  work/tests/core_test.cpp built and RAN — 31 behavioural checks all pass (sparse set,
  deferred destroy, mesh invariants, projection depth range + Y-flip, 720-frame game loop,
  bolt expiry, dt clamp, scoring). Added GameState.hpp (breaks a Game/systems include cycle).
- 2026-08-12 · session 1 · Measured the target, found the real defect (7% anchoring
  + wholesale incompleteness), planned reordering, wrote STATE.md. Installed
  vulkan/glm/glfw dev headers + glslang; fetched VMA. Starting unit C1.
