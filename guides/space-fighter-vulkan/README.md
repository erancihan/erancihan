# Space Fighter — Build a Vulkan Game on an ECS, From Scratch

> A hands-on guide to writing a **space-combat game** — Star Fox / Ace Combat in
> spirit — directly on **Khronos' Vulkan** with a hand-rolled
> **Entity–Component–System**. No game engine, no asset store: just C++, the
> GPU, and geometry you generate in code. We start from *why* Vulkan asks you to
> spell out every last thing, build an ECS you can reason about, and end with a
> playable dogfight you fly with the keyboard.

<p align="center">
  <em>"An entity is a number. A component is data. A system is a verb. A frame is
  those verbs, in order, sixty times a second — and Vulkan makes you say every
  word out loud."</em>
</p>

---

## What this guide is (and isn't)

This is a **from-scratch, type-it-yourself implementation guide**. The
[`docs/`](docs/) chapters build the whole thing — the Vulkan renderer, the matrix
and quaternion math, the ECS storage, the flight model, the gameplay — and every
line of code is given. Code arrives **a handful of lines at a time**, each
snippet anchored to an exact file and position (new files as code blocks, changes
as diffs), with the explanation in the prose around it, not in comments. You end
with a small cross-platform C++ project you typed yourself and build with
`cmake`.

- Chapter [01](docs/01-project-setup.md) teaches the two reading conventions
  first, then scaffolds the project (a CMake executable, Vulkan SDK, GLFW, GLM,
  VMA); each later chapter says exactly which files to create or edit, and where.
- **The project compiles at every chapter's checkpoint**, and each checkpoint
  says what to run, what you should see, and what the likely cause is when you
  don't — there's no separate codebase to cross-reference; the guide *is* the
  source.

The skill this builds isn't "type what I typed"; it's **understanding a small,
honest game engine well enough to know where every piece lives and why** — so you
can build on it. And because Vulkan is explicit where higher-level APIs are
magic, you leave knowing what a *frame actually costs*.

> **This is the Vulkan sibling of the [Metal guide](../space-fighter-metal/).**
> Same game, same architecture, same ECS — expressed in C++/GLM/Vulkan instead of
> Swift/simd/Metal. You can hold the two side by side: where the *idea* is
> identical (the ECS, flight, camera, gameplay), the explanation matches; where
> **Vulkan genuinely differs** (device setup, the swapchain, synchronization,
> descriptors, memory), this guide goes deeper, because that difference is the
> whole point of learning Vulkan.

> **Note:** this guide is for learning. It is not official Khronos documentation.
> Cross-check the [Vulkan specification](https://registry.khronos.org/vulkan/)
> and the other links in [`resources.md`](resources.md) before relying on a
> detail; GPU APIs and their extensions drift.

---

## Mental model (read this first)

Three ideas carry the whole project. Hold all three and everything else is
detail.

**1. The ECS separates *data* from *behaviour*.** Nothing is a "Spaceship
object" with a `fly()` method. Instead an entity (a number) *has* a `Transform`,
a `Velocity`, a `Player` tag and a `Weapon` — and separate systems read those
and act. Want a homing missile? It's the same `Transform` + `Velocity` an enemy
uses, plus a `Homing` component. Composition, not inheritance. (This part is
identical to the Metal guide — the ECS doesn't care what draws it.)

**2. A frame is a fixed pipeline: simulate on the CPU, then draw on the GPU.**
Every displayed frame, the systems run in a set order to advance the world, and
then the renderer packages the survivors and hands the GPU a few instanced draw
calls. The seam between them is deliberately thin — a map of instance data — so
neither side knows the other's internals.

**3. Vulkan makes the GPU's contract explicit.** Where Metal (and MetalKit) hid
the swapchain, the depth texture and the frame pacing, Vulkan hands them all to
you: you choose the device, build the swapchain, author the pipeline's every
fixed-function knob, allocate the memory, and — the big one — **synchronize the
CPU and GPU yourself** with semaphores and fences. It's more code, but nothing is
hidden, which is exactly why it's worth doing once by hand.

```mermaid
flowchart LR
  I[Input] --> F[FlightControl]
  F --> W[Weapon]
  W --> E[Enemy spawn / AI]
  E --> M[Movement]
  M --> S[Spin]
  S --> L[Lifetime]
  L --> C[Collision]
  C --> R[RenderSystem]
  R -->|instances by mesh| G[[Vulkan Renderer]]
  G -->|acquire · record · submit · present| D[(Swapchain image)]
```

Each box is one system you'll build; the arrows are the order they run in
`Game::update` (chapter 09). The last hop — *acquire, record, submit, present* —
is the Vulkan frame Metal did for us, and chapters 05.A–05.B are entirely about it.

| Idea | One-liner | Chapter |
| --- | --- | --- |
| **Entities & components** | Identity is a number; everything it *is* comes from data attached to it | [04](docs/04-designing-the-ecs.md) |
| **Systems & schedule** | Behaviour is functions over components, run in a fixed order per frame | [04](docs/04-designing-the-ecs.md), [09](docs/09-the-game-loop.md) |
| **The Vulkan object model** | Instance → device → queues → swapchain → pipeline; you build each by hand | [02](docs/02-vulkan-fundamentals.md), [05.A](docs/05.A-swapchain-and-render-pass.md) |
| **Synchronization** | Semaphores order GPU↔GPU, fences order GPU↔CPU, frames-in-flight keep both busy | [05.B](docs/05.B-commands-and-sync.md) |
| **The graphics pipeline** | Every fixed-function state frozen into one immutable object; SPIR-V shaders | [07.A](docs/07.A-shaders-and-spirv.md), [07.B](docs/07.B-the-graphics-pipeline.md) |
| **Descriptors & memory** | How the GPU is told where the buffers are; VMA does the allocating | [06](docs/06-buffers-memory-descriptors.md) |
| **Transforms** | Position + a *quaternion* orientation + scale, baked to a matrix | [03](docs/03-the-math-you-need.md), [10](docs/10-flight-and-input.md) |
| **Instancing** | One mesh, many entities, a single draw call | [07.B](docs/07.B-the-graphics-pipeline.md), [08](docs/08-meshes-and-geometry.md) |

---

## What you'll build

A third-person space fighter you fly with the keyboard:

- a low-poly ship with an **arcade flight model** — pitch, yaw, roll, boost;
- **twin cannons** firing glowing bolts on a cooldown;
- **enemies** that warp in ahead of you — some tumble past, some home in;
- **sphere collisions**, a hull bar, score, a hit-flash, and respawns;
- a **starfield** that tiles endlessly and a **ground grid** for a horizon —
  both procedural, no art assets;
- all of it drawn by a small **Vulkan** renderer with five pipelines built from
  four shader pairs (lit, unlit, star, HUD), a swapchain and depth buffer you
  built, VMA-backed buffers, and a two-deep **frames-in-flight** loop — running
  through a **sparse-set ECS**.

Everything is simple geometry generated in code — exactly the "no fancy shapes
for now" brief — and chapter [14](docs/14-where-to-go-next.md) maps the road from
here to real models, lighting, audio and netcode.

---

## Prerequisites

- **A desktop with a Vulkan 1.2+ GPU** — any reasonably modern GPU on **Linux or
  Windows** (this guide targets both). Works on macOS too, through
  [MoltenVK](https://github.com/KhronosGroup/MoltenVK), with the portability
  notes in chapter 14.
- **The [Vulkan SDK](https://vulkan.lunarg.com)** (LunarG) — the loader,
  validation layers, and `glslc`/shaderc. Chapter 01 installs it.
- **A C++17 compiler and CMake 3.19+.** GCC, Clang or MSVC.
- **Some C++** (or another systems language — the ideas port). No prior graphics
  or game-engine experience assumed; that's what the guide is for.
- **A little comfort with vectors and matrices.** Chapter 03 re-derives what you
  need, but if "dot product" and "matrix times vector" ring a bell you're set.

You do **not** need any prior Vulkan, Metal, OpenGL, or ECS knowledge. If you
*have* read the [Metal guide](../space-fighter-metal/), even better — you'll
recognise the whole simulation side and can spend your attention on what Vulkan
does differently.

---

## Repository layout

```
space-fighter-vulkan/
├── README.md                 ← you are here (the map)
├── resources.md              ← primary sources & further reading
└── docs/                     ← the guide, one chapter per file
    ├── 01-project-setup.md
    ├── 02-vulkan-fundamentals.md
    ├── 03-the-math-you-need.md
    ├── 04-designing-the-ecs.md
    ├── 05.A-swapchain-and-render-pass.md
    ├── 05.B-commands-and-sync.md
    ├── 06-buffers-memory-descriptors.md
    ├── 07.A-shaders-and-spirv.md
    ├── 07.B-the-graphics-pipeline.md
    ├── 08-meshes-and-geometry.md
    ├── 09-the-game-loop.md
    ├── 10-flight-and-input.md
    ├── 11-the-camera.md
    ├── 12-gameplay-systems.md
    ├── 13-hud-and-feedback.md
    └── 14-where-to-go-next.md
```

The C++ project you build lives wherever you scaffold it in chapter 01 — the
guide walks you through creating it file by file.

---

## The learning path

Every chapter but the last builds something you compile and run — the project
works at every checkpoint, and several chapters have you write the *wrong*
version first and watch it fail before fixing it. Read 01–09 in order — they
assemble the engine and the frame (a window by 02, deep-space blue by 05.B, a
ship on screen by 08). 10–13 are the game on top of it, and 14 (🧠) is the
horizon. The first half is longer than the Metal guide's because **Vulkan asks
you to build what MetalKit provided.**

| # | Chapter | What you'll learn |
| --- | --- | --- |
| 01 | 🛠️ [Project setup & toolchain](docs/01-project-setup.md) | **How to read this guide** — the location-line and diff conventions every snippet uses; the SDK, GLFW, GLM, VMA; the CMake build with its GLSL→SPIR-V step; a map of every file you'll create; validation layers announced from the start. |
| 02 | 🛠️ [Vulkan fundamentals](docs/02-vulkan-fundamentals.md) | A window, and a configured GPU that prints its name: instance, validation + the `pNext`-chained debug messenger (derived from the version that can't report its own creation), physical-device scoring, queue families, logical device, VMA — and *why* Vulkan is so verbose. |
| 03 | 🛠️ [The math you need](docs/03-the-math-you-need.md) | `Math.hpp` and the shared CPU/GPU structs, each Vulkan gotcha reproduced before it's fixed: OpenGL's depth range, the **Y-flip**, and the std140 padding trap caught by a `static_assert` you watch fail. |
| 04 | 🛠️ [Designing the ECS](docs/04-designing-the-ecs.md) | Entities, components, systems; sparse set vs map vs archetypes; `World` + `ComponentStore` in C++ — including writing the swap-remove bug everyone writes and watching two entities share a slot. (Same design as the Metal guide.) |
| 05.A | 🛠️ [Swapchain, depth & render pass](docs/05.A-swapchain-and-render-pass.md) | Surface → **swapchain** → image views → framebuffers, the depth image via VMA, and the render pass with its load/store ops and layout transitions (plus the dynamic-rendering note). Why `minImageCount + 1`. |
| 05.B | 🛠️ [Commands, synchronization & the frame](docs/05.B-commands-and-sync.md) | The thing MetalKit hid: command buffers, **semaphores, fences, frames-in-flight** — you deadlock the program on purpose, serialise it on purpose, then get it right. Resize/recreation handled; first pixels on screen. |
| 06 | 🛠️ [Buffers, memory (VMA) & descriptors](docs/06-buffers-memory-descriptors.md) | **VMA**; staging vs host-visible, per-frame-in-flight buffers; **descriptor set layouts, pools and sets** (with a reproduced validation failure), **push constants**; why the instance array must be a storage buffer — the driver tells you the number. |
| 07.A | 🛠️ [Shaders & SPIR-V](docs/07.A-shaders-and-spirv.md) | All four GLSL shader pairs and the three numbering contracts that bind them to your C++ — including the one *nothing* checks; the star-tiling trick; why Vulkan consumes bytecode. |
| 07.B | 🛠️ [The graphics pipeline](docs/07.B-the-graphics-pipeline.md) | The immutable `VkPipeline` and *every* fixed-function state you must name; five pipelines from four shader pairs; dynamic viewport; instancing via `gl_InstanceIndex`; the two performance warnings you fix by declaring less. |
| 08 | 🛠️ [Meshes & geometry](docs/08-meshes-and-geometry.md) | Flat shading and the self-correcting normal; ship, enemy, bolt, starfield and grid generated in code — zero art assets — and a **ship on your screen**, once you fix the grid lines that vanish by crossing the near plane. |
| 09 | 🛠️ [The game loop & timing](docs/09-the-game-loop.md) | The ECS takes over the frame: `Game`, the first systems, delta time, clamping hitches, fixed vs variable timestep; why system *order* is the logic. |
| 10 | 🛠️ [Flight & input](docs/10-flight-and-input.md) | Keys become intent; the arcade flight model — body-space quaternion rotation (and what happens when you multiply on the wrong side), auto-banking into turns. **You fly.** |
| 11 | 🛠️ [The camera](docs/11-the-camera.md) | The chase camera; `lookAt`; blending world-up with ship-up so banks read without nausea; field of view and smoothing. |
| 12 | 🛠️ [Gameplay systems](docs/12-gameplay-systems.md) | Spawning and difficulty; weapons and cooldowns — with the dangling-pointer bug sprung under AddressSanitizer; homing AI; sphere collision, layers and the broad-phase question; health, score, respawn. |
| 13 | 🛠️ [HUD & feedback](docs/13-hud-and-feedback.md) | Drawing in normalised device coordinates (and the Vulkan Y-down twist); the reticle, hull bar and hit-flash; aspect correction; and how you'd add real text. |
| 14 | 🧠 [Where to go next](docs/14-where-to-go-next.md) | VMA tuning, pipeline caches, dynamic rendering, bindless/descriptor indexing, RenderDoc, cross-platform (MoltenVK), lighting, physics & a fixed timestep, and netcode. |

---

## How to use this guide

- **Type it in, and run every checkpoint.** Every chapter ends with an exact
  command, the exact result to expect, and a symptom→cause table for when it
  doesn't. Vulkan's first pixel is more work than Metal's, so chapters 01–07.B
  are a climb; 08–09 coast downhill, and the game (10–13) is the fun payoff.
- **Keep validation layers on, and treat silence as the pass condition.** They
  are the single best Vulkan learning tool — most mistakes print an exact,
  actionable message instead of a black screen. Chapter 02 turns them on, and
  every checkpoint after it expects a *silent* run.
- **Do the breakage experiments.** Most chapters end by asking you to break one
  thing on purpose and watch what happens. A failure mode you have seen is one
  you can diagnose forever; several of them are planted early precisely so a
  later chapter's symptom table can name them.
- **Follow the schedule.** The heart of the game is `Game::update` (chapter 09):
  the list of systems, in order, is the entire game logic. Keep that chapter
  close.
- **Change one number.** Halve `spawnInterval`, double a turn rate, tint the ship
  red, drop `MAX_FRAMES_IN_FLIGHT` to 1 and watch the GPU stall. Fast feedback is
  the whole reason to build on something small.
- **Add one behaviour end-to-end.** A new component, a new system, one line in
  the schedule. Doing that once makes the ECS click for good — chapter 14 has
  starter ideas.

---

## A note on the language choice

This guide is written in **C++17** — the lingua franca of Vulkan, and what the
spec, the SDK samples and VMA are written against. If you'd rather work in
**Rust**, the [`ash`](https://github.com/ash-rs/ash) crate exposes the same
Vulkan API almost one-to-one (with `gpu-allocator` or `vk-mem` standing in for
VMA), and every concept, object and ordering rule in this guide maps across
unchanged — only the syntax differs.

---

## Credits & lineage

This guide stands on the standard references: the Khronos
[Vulkan specification](https://registry.khronos.org/vulkan/) and
[Vulkan-Samples](https://github.com/KhronosGroup/Vulkan-Samples); Alexander
Overvoorde's [Vulkan Tutorial](https://vulkan-tutorial.com) and the
[vkguide.dev](https://vkguide.dev) modern-Vulkan guide; AMD's
[Vulkan Memory Allocator](https://github.com/GPUOpen-LibrariesAndSDKs/VulkanMemoryAllocator);
the data-oriented ECS lineage popularised by Mike Acton's talks and libraries
like EnTT and Bevy; and the arcade flight feel of Star Fox and Ace Combat that
we're chasing, not cloning. Full references live in [`resources.md`](resources.md).

---

*Start here → [Chapter 01: Project setup & toolchain](docs/01-project-setup.md)*
