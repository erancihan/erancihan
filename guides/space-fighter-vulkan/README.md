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

This is a **from-scratch implementation guide**. The [`docs/`](docs/) chapters
build the whole thing — the Vulkan renderer, the matrix and quaternion math, the
ECS storage, the flight model, the gameplay — and show every piece of code in
full, inline, as you go. You end with a small cross-platform C++ project you
wrote yourself and build with `cmake`.

- Chapter [01](docs/01-project-setup.md) scaffolds the project (a CMake
  executable, Vulkan SDK, GLFW, GLM, VMA); each later chapter says which files to
  create and fills them in.
- The code is presented and explained where it's introduced — there's no
  separate codebase to cross-reference; the guide *is* the source.

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
is the Vulkan frame Metal did for us, and chapter 05 is entirely about it.

| Idea | One-liner | Chapter |
| --- | --- | --- |
| **Entities & components** | Identity is a number; everything it *is* comes from data attached to it | [04](docs/04-designing-the-ecs.md) |
| **Systems & schedule** | Behaviour is functions over components, run in a fixed order per frame | [04](docs/04-designing-the-ecs.md), [09](docs/09-the-game-loop.md) |
| **The Vulkan object model** | Instance → device → queues → swapchain → pipeline; you build each by hand | [02](docs/02-vulkan-fundamentals.md), [05](docs/05-swapchain-and-sync.md) |
| **Synchronization** | Semaphores order GPU↔GPU, fences order GPU↔CPU, frames-in-flight keep both busy | [05](docs/05-swapchain-and-sync.md) |
| **The graphics pipeline** | Every fixed-function state frozen into one immutable object; SPIR-V shaders | [06](docs/06-the-graphics-pipeline.md) |
| **Descriptors & memory** | How the GPU is told where the buffers are; VMA does the allocating | [07](docs/07-buffers-memory-descriptors.md) |
| **Transforms** | Position + a *quaternion* orientation + scale, baked to a matrix | [03](docs/03-the-math-you-need.md), [10](docs/10-flight-and-input.md) |
| **Instancing** | One mesh, many entities, a single draw call | [06](docs/06-the-graphics-pipeline.md), [07](docs/07-buffers-memory-descriptors.md) |

---

## What you'll build

A third-person space fighter you fly with the keyboard:

- a low-poly ship with an **arcade flight model** — pitch, yaw, roll, boost;
- **twin cannons** firing glowing bolts on a cooldown;
- **enemies** that warp in ahead of you — some tumble past, some home in;
- **sphere collisions**, a hull bar, score, a hit-flash, and respawns;
- a **starfield** that tiles endlessly and a **ground grid** for a horizon —
  both procedural, no art assets;
- all of it drawn by a small **Vulkan** renderer with lit, unlit, point and HUD
  pipelines, a swapchain and depth buffer you built, VMA-backed buffers, and a
  two-deep **frames-in-flight** loop — running through a **sparse-set ECS**.

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
- **A C++17 compiler and CMake 3.16+.** GCC, Clang or MSVC.
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
    ├── 05-swapchain-and-sync.md
    ├── 06-the-graphics-pipeline.md
    ├── 07-buffers-memory-descriptors.md
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

Concept chapters (🧠) build understanding; build chapters (🛠️) walk the code that
uses it. Read 01–09 in order — they assemble the engine and the frame. 10–13 are
the game on top of it, and 14 is the horizon. The first nine are longer than the
Metal guide's because **Vulkan asks you to build what MetalKit provided.**

| # | Chapter | What you'll learn |
| --- | --- | --- |
| 01 | 🛠️ [Project setup & toolchain](docs/01-project-setup.md) | What we're building and why Vulkan + ECS; the SDK, GLFW, GLM, VMA and shaderc; the CMake build; the shape of a frame; validation layers on from the start. |
| 02 | 🧠 [Vulkan fundamentals](docs/02-vulkan-fundamentals.md) | The GPU as a service you configure by hand: instance, physical-device selection, queue families, logical device and queues — and *why* Vulkan is so verbose (and when that pays off). |
| 03 | 🧠 [The math you need](docs/03-the-math-you-need.md) | Coordinate spaces; model/view/projection; quaternions vs Euler angles; **GLM**, and the three Vulkan clip-space gotchas — Y points **down** in NDC, depth is **0..1**, and where the Y-flip goes. |
| 04 | 🛠️ [Designing the ECS](docs/04-designing-the-ecs.md) | Entities, components, systems; array-of-structs vs **sparse set** vs archetypes; our `World` + `ComponentStore` in C++; type-erased stores, and safe deferred destruction. (Same design as the Metal guide.) |
| 05 | 🛠️ [Swapchain, commands & sync](docs/05-swapchain-and-sync.md) | Surface, **swapchain**, image views; render passes + framebuffers (and a note on dynamic rendering); command pools/buffers; and the thing MetalKit hid — **semaphores, fences and frames-in-flight**. Plus swapchain recreation on resize. |
| 06 | 🛠️ [The graphics pipeline & SPIR-V](docs/06-the-graphics-pipeline.md) | GLSL → **SPIR-V** with shaderc; the immutable `VkPipeline` and *every* fixed-function state you must name; pipeline layouts; reading all four shader pairs in full; instancing via `gl_InstanceIndex`. |
| 07 | 🛠️ [Buffers, memory (VMA) & descriptors](docs/07-buffers-memory-descriptors.md) | **VMA**; staging vs host-visible; vertex/index/uniform/storage buffers; **descriptor set layouts, pools and sets**; **push constants** (vs Metal's `setBytes`); and how uniforms and instancing actually reach the shader. |
| 08 | 🛠️ [Meshes & simple geometry](docs/08-meshes-and-geometry.md) | Flat shading and face normals; generating the ship, enemy, bolt, endless starfield and grid in code — zero art assets. (Same shapes as the Metal guide; C++/GLM.) |
| 09 | 🛠️ [The game loop & timing](docs/09-the-game-loop.md) | The GLFW loop; delta time; fixed vs variable timestep; clamping hitches; why system *order* is the logic. |
| 10 | 🛠️ [Flight & input (GLFW)](docs/10-flight-and-input.md) | Abstracting input from keys with GLFW; the arcade flight model; integrating body-space rotation with quaternions; auto-banking into turns. |
| 11 | 🛠️ [The camera](docs/11-the-camera.md) | The chase camera; `lookAt`; blending world-up with ship-up so banks read without nausea; field of view and smoothing. |
| 12 | 🛠️ [Gameplay systems](docs/12-gameplay-systems.md) | Spawning and difficulty; weapons and cooldowns; homing AI; sphere collision, layers and the broad-phase question; health, score, respawn. |
| 13 | 🛠️ [HUD & feedback](docs/13-hud-and-feedback.md) | Drawing in normalised device coordinates (and the Vulkan Y-down twist); the reticle, hull bar and hit-flash; aspect correction; and how you'd add real text. |
| 14 | 🧠 [Where to go next](docs/14-where-to-go-next.md) | VMA tuning, pipeline caches, dynamic rendering, bindless/descriptor indexing, RenderDoc, cross-platform (MoltenVK), lighting, physics & a fixed timestep, and netcode. |

---

## How to use this guide

- **Build as you read, and run early.** Scaffold the project in chapter 01 and
  build often — every chapter lands harder once you've seen the thing it explains
  move. Vulkan's first triangle is more work than Metal's, so chapters 01–07 are
  a climb; the game (10–13) is the fun payoff.
- **Keep validation layers on.** They are the single best Vulkan learning tool —
  most mistakes print an exact, actionable message instead of a black screen.
  Chapter 01 turns them on and chapter 02 explains what they check.
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
