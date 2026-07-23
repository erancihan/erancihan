# 14 · Where to go next 🧠

> **You'll leave this chapter with:** a prioritised map from this prototype to a
> real game — what to add, in what order, and which chapter's seam each change
> plugs into. The gameplay half of this roadmap matches the
> [Metal guide](../../space-fighter-metal/docs/12-where-to-go-next.md); the
> rendering half is Vulkan-specific, because Vulkan's "later" items (pipeline
> caches, dynamic rendering, bindless, MoltenVK) are different from Metal's.
> Nothing here is required; it's the horizon.

The prototype is deliberately small, but it's *honestly* small — every shortcut was
a labelled decision, not an accident. This chapter turns those labels into a
roadmap. Full links live in [`resources.md`](../resources.md).

---

## Start here: three changes that teach the seams

Before anything ambitious, make three small changes end to end. Each exercises a
different seam and takes minutes.

1. **A throttle.** `Player.throttle` and `InputState.throttle` are already wired and
   unused (chapter 10). Map `Left Shift`/`Left Ctrl` to ease `throttle`, and use it
   to lerp speed between a min and max. *Seam: input → flight.*
2. **A new enemy shape + behaviour.** Add a `MeshID` value, a mesh generator
   (chapter 08), and a component + system for a new movement pattern (a strafer that
   circles you). *Seam: mesh + component + schedule.*
3. **An explosion.** On a kill in `CollisionSystem`, spawn a handful of short-lived
   entities with outward velocities and a `Lifetime` — instant particle burst with
   the tools you already have. *Seam: gameplay → ECS.*

If those three feel routine, the architecture has done its job and you're ready for
the bigger pieces below.

---

## The Vulkan work first: from "it renders" to "it renders well"

These are the items that make our explicit-but-naive renderer production-shaped.
They're the reason to have learned Vulkan the hard way — each one is a knob you now
know exists.

### Dynamic rendering — delete the render pass

Chapter 05 built classic `VkRenderPass` + `VkFramebuffer` objects to make the
attachment model explicit. **`VK_KHR_dynamic_rendering`** (core in Vulkan 1.3) lets
you skip both: declare your color and depth attachments inline with
`vkCmdBeginRendering` at draw time and delete the render-pass and framebuffer
plumbing entirely. It's the modern default for new engines and a satisfying first
refactor — the pipelines change only in how they reference attachment formats
(`VkPipelineRenderingCreateInfo` instead of a render pass). Do this one first; it
simplifies everything downstream.

### Pipeline cache — pay for compilation once

We create five pipelines cold at startup (chapter 06). A **`VkPipelineCache`** lets
the driver serialise compiled pipeline blobs to disk and reload them next launch,
cutting startup stalls — essential once you have dozens of pipelines. Pass one cache
to every `vkCreateGraphicsPipelines` call and save its data on exit. Pair it with
**extended dynamic state** (move topology/blend/depth to record time) to fight the
"pipeline explosion" chapter 06 flagged: fewer objects, each covering more cases.

### VMA tuning — stop re-uploading everything

Our per-frame instance and HUD buffers are sized to a generous max and fully
re-`memcpy`'d each frame (chapter 07). Real usage: grow buffers on demand, only
upload what changed, and lean on VMA's features you haven't touched —
**`vmaSetAllocationName`** for debugging, the **budget API** to stay under memory
limits, and **defragmentation** if long sessions fragment the heap. VMA also has a
`VMA_MEMORY_USAGE_AUTO_PREFER_DEVICE` path worth knowing when you move per-frame data
device-local behind a staging ring.

### Descriptor indexing / bindless — one set, all resources

We rebind a descriptor set per frame and pack instances into one SSBO. The modern
scalable pattern is **bindless**: a single large descriptor array (via
`VK_EXT_descriptor_indexing`, core in 1.2) holding *all* textures/buffers, indexed in
the shader by an integer you pass per draw or per instance. It collapses descriptor
management and is the foundation of GPU-driven rendering. Overkill now; the
direction once you have real materials and textures.

### Frames-in-flight, the correct version

Chapter 05 keyed the `renderFinished` semaphore by frame-in-flight for clarity and
noted the subtlety. The fully-correct form keys it **per swapchain image** (since an
image may be presented while a later frame reuses the same in-flight slot). It's a
small change to the sync arrays and silences a validation nudge you'll eventually
hit — a good exercise in *why* the distinction exists.

---

## Content: real models instead of code geometry

"Simple geometry for now" was the brief; here's the "later." Load real 3D files and
fill the same `MeshData` struct:

- **glTF 2.0** — the open standard, and the right first target. Use
  [cgltf](https://github.com/jkuhlmann/cgltf) (a single-header loader) or
  [tinygltf](https://github.com/syoyo/tinygltf), read positions/normals/UVs, and
  upload with the same `uploadStatic` (chapter 07).
- **`.obj`** — trivially simple via [tinyobjloader](https://github.com/tinyobjloader/tinyobjloader),
  great for a first real asset.

The plan: replace a mesh generator with a loader that fills `MeshData`, add a
`texCoord` to `Vertex` and a **combined image sampler** descriptor (your first
texture) to the lit pipeline, and you have textured models with *no other changes* —
the ECS and draw loop don't care where vertices came from. Free assets to start:
Kenney's space kits, Poly Pizza, Quaternius.

---

## Looking better: lighting, shadows, post

Our lighting is one directional term (chapter 06). The upgrade path, in order of
bang-for-effort:

- **Multiple lights + specular** — add point lights and a Blinn-Phong highlight; a
  few more lines in `lit.frag`, with the light list in a UBO/SSBO.
- **Normal mapping** — fake surface detail from a texture; needs tangents on the
  vertex and a second sampler.
- **Shadow maps** — render the scene from the light into a depth texture, then test
  against it in the main pass. The classic "real shadows" technique; a whole extra
  render pass (or dynamic-rendering block) and a sampler-compare descriptor.
- **Bloom** — the cheapest win for a space game: threshold bright pixels, blur, add
  back. Makes bolts and stars genuinely glow. This is your first *post-process* pass
  — render the scene to an offscreen image, then run full-screen shader passes over
  it. Vulkan makes the offscreen target explicit, which you now know how to build.

---

## Feeling better: particles and audio

- **Particles.** The explosion above is CPU particles. For thousands (engine trails,
  debris, nebulae) move them to the GPU: a **compute shader**
  (`VkPipelineBindPoint::COMPUTE`, a `VkComputePipeline`) updates a particle SSBO,
  and you draw it as points/quads. This is your first taste of Vulkan compute — a
  compute queue submission with its own sync.
- **Audio.** Vulkan is graphics-only, so audio is a separate library:
  [OpenAL Soft](https://github.com/kcat/openal-soft) or
  [miniaudio](https://github.com/mackron/miniaudio) (single-header) give you mixing
  and 3D spatialisation — position a sound at an enemy's world coordinates and it
  pans and attenuates as you fly past. Sound is the single biggest perceived-quality
  jump per hour of work.

---

## Simulating better: physics and a fixed timestep

The moment you want bodies that bounce, tumble on impact, or stack, add a real
physics step — and with it, the **fixed timestep** from chapter 09. Options:

- **Roll your own** — sphere/AABB collision response and simple integration is very
  doable and keeps the ECS pure.
- **Adopt a library** — [Jolt](https://github.com/jrouwe/JoltPhysics) is the modern
  C++ choice; it's what several shipping games use.

Either way, split simulation from rendering: accumulate real time, step physics in
constant chunks, interpolate the render between steps. Our variable-step loop becomes
the *renderer's* clock; the *simulation* gets its own steady one.

---

## Scaling the engine

Our ECS and collision are sized for hundreds of entities. Past a few thousand:

- **Broad-phase collision** (chapter 12) — a uniform grid or spatial hash so
  collision stops being O(n²). This is the first thing that will bite; add it when
  frame time climbs.
- **Archetype storage** (chapter 04) — group entities by exact component set for
  cache-perfect queries. A bigger rewrite of `World`; [EnTT](https://github.com/skypjack/entt)
  is the reference sparse-set-plus-groups library if you'd rather adopt than build.
- **Entity generations** (chapter 04) — fold a generation into the id so long-lived
  handles (a lock-on target you remember across frames) can detect a recycled slot.
  Add this the moment a system stores an `Entity` between frames.
- **GPU-driven rendering** — combine the instance SSBO with `vkCmdDrawIndexedIndirect`
  and a compute cull pass so the GPU decides what to draw. The endgame of the
  instancing path chapter 06 started, and where bindless pays off.

---

## Cross-platform: Windows, Linux, macOS, mobile

Vulkan's portability is a real dividend of the work you did. The same code already
targets **Windows and Linux**. To reach more:

- **macOS / iOS via [MoltenVK](https://github.com/KhronosGroup/MoltenVK)** — a
  Vulkan-to-Metal translation layer. Enable `VK_KHR_portability_subset` (and the
  matching instance flag) and most of this guide runs on Apple hardware — closing
  the loop with the sibling Metal guide, which is what MoltenVK is doing under the
  hood.
- **Android** — Vulkan is a first-class Android API; the renderer ports with a
  different surface-creation call and a touch-based `Input` producer (the seam from
  chapter 10 earns its keep).

---

## Going multiplayer

Co-op or versus dogfighting is the big one, and it reaches back into chapter 09's
timestep decision. Lockstep netcode needs a **deterministic fixed-step** simulation
(same inputs ⇒ same result on every machine); client-server with prediction needs a
**rewindable** simulation (re-simulate from a server snapshot when a correction
arrives). Either way, the groundwork is: make the simulation deterministic and
separable from rendering *first*. Because our simulation already knows nothing about
Vulkan, that separation is half-done — the schedule (chapter 09) is the thing you'd
run deterministically. Retrofitting determinism into a shipped game is brutal;
knowing the requirement now is the gift.

---

## Working like a graphics programmer

Three tools will teach you more than any tutorial:

- **[RenderDoc](https://renderdoc.org).** The essential Vulkan frame debugger.
  Capture a frame and step through every `vkCmd`, inspect buffers and descriptors,
  see exactly what each shader received and every pipeline's state. When something
  renders wrong, this shows you *why* in seconds — it's the Vulkan counterpart of
  Metal's GPU capture, and better in several ways.
- **Validation layers, harder.** You've had the basics on all guide (chapter 01).
  Turn on **GPU-assisted validation** and **synchronization validation** in Vulkan
  Configurator (`vkconfig`) to catch out-of-bounds descriptor access and subtle
  sync hazards the base layers miss — exactly the bugs that appear as you add the
  features above.
- **A CPU/GPU profiler.** [Tracy](https://github.com/wolfpld/tracy) instruments both
  sides and shows where frame time actually goes. Our per-frame buffer re-uploads,
  for instance, will show up here the moment they matter — and *only* then is it
  worth fixing.

Optimise against measurements, not hunches. The prototype is full of "simple now,
fast later" choices precisely so you can *feel* which ones matter before touching
them.

---

## The through-line

Every item above plugs into a seam this guide already built: content swaps behind
`MeshData`, behaviour is a new component + system + schedule line, rendering upgrades
live behind the instance-SSBO handoff, sync and memory sit behind `VulkanContext` and
VMA, and the timestep decision gates physics and netcode. That's the real deliverable
— not a finished game, but a small, honest Vulkan codebase whose every extension
point you can now name, and whose every verbose line you now know the reason for. Go
add something, and watch how little else you have to touch.

---

*Back to the [guide map](../README.md) · references in [`resources.md`](../resources.md)*
