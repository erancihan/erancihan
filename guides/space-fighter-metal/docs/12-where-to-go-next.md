# 12 · Where to go next 🧠

> **You'll leave this chapter with:** a prioritised map from this prototype to a
> real game — what to add, in what order, and which chapter's seam each change
> plugs into. Nothing here is required; it's the horizon.

The prototype is deliberately small, but it's *honestly* small — every shortcut
was a labelled decision, not an accident. This chapter turns those labels into a
roadmap. Full links live in [`resources.md`](../resources.md).

---

## Start here: three changes that teach the seams

Before anything ambitious, make three small changes end to end. Each exercises a
different seam and takes minutes.

1. **A throttle.** `Player.throttle` and `InputState.throttle` are already wired
   and unused (chapter 08). Map `Shift`/`Ctrl` to ease `throttle`, and use it to
   lerp speed between a min and max. *Seam: input → flight.*
2. **A new enemy shape + behaviour.** Add a `MeshID` case, a `MeshLibrary`
   generator (chapter 06), and a component + system for a new movement pattern
   (a strafer that circles you). *Seam: mesh + component + schedule.*
3. **An explosion.** On a kill in `CollisionSystem`, spawn a handful of
   short-lived entities with outward velocities and a `Lifetime` — instant
   particle burst with the tools you already have. *Seam: gameplay → ECS.*

If those three feel routine, the architecture has done its job and you're ready
for the bigger pieces below.

---

## Content: real models instead of code geometry

"Simple geometry for now" was the brief; here's the "later." Apple's **Model I/O**
framework loads real 3D files and hands you vertex/index buffers you can drop
straight into the `Renderer`:

- **USD / USDZ** — Apple's first-class format; the path of least resistance on
  Metal, and what Reality Composer exports.
- **glTF** — the open standard; use a community loader, or convert to USD.
- **`.obj`** — trivially simple, great for a first real asset.

The plan: replace a `MeshLibrary` generator with a loader that fills the same
`Mesh` struct, add a `texCoord` to `Vertex` and a texture to the lit pipeline,
and you have textured models with *no other changes* — the ECS and draw loop
don't care where vertices came from. Free assets to start: Kenney's space kits,
Poly Pizza, Quaternius.

---

## Looking better: lighting, shadows, post

Our lighting is one directional term (chapter 05). The upgrade path, in order of
bang-for-effort:

- **Multiple lights + specular** — add point lights and a Blinn-Phong highlight;
  a few more lines in `lit_fragment`.
- **Normal mapping** — fake surface detail from a texture; needs tangents on the
  vertex.
- **Shadow maps** — render the scene from the light into a depth texture, then
  test against it in the main pass. The classic "real shadows" technique; a whole
  extra pass.
- **Bloom** — the cheapest win for a space game: threshold bright pixels, blur,
  add back. Makes bolts and stars genuinely glow. This is your first
  *post-process* pass — render the scene to an offscreen texture, then run
  full-screen shader passes over it.

---

## Feeling better: particles and audio

- **Particles.** The explosion above is CPU particles. For thousands (engine
  trails, debris, nebulae) move them to the GPU: a compute shader updates a
  particle buffer, and you draw it as points/quads. `MTLComputeCommandEncoder` is
  the new tool.
- **Audio.** `AVAudioEngine` gives you mixing and, crucially, **3D spatial
  audio** — position a sound at an enemy's world coordinates and it pans and
  attenuates as you fly past. Engine hum, laser fire, explosions, lock-on tones.
  Sound is the single biggest perceived-quality jump per hour of work.

---

## Simulating better: physics and a fixed timestep

The moment you want bodies that bounce, tumble on impact, or stack, add a real
physics step — and with it, the **fixed timestep** from chapter 07. Options:

- **Roll your own** — sphere/AABB collision response and simple integration is
  very doable and keeps the ECS pure.
- **Adopt a library** — or Apple's higher-level frameworks if you don't need
  determinism.

Either way, split simulation from rendering: accumulate real time, step physics
in constant chunks, interpolate the render between steps. Our variable-step loop
becomes the *renderer's* clock; the *simulation* gets its own steady one.

---

## Scaling the engine

Our ECS and collision are sized for hundreds of entities. Past a few thousand:

- **Broad-phase collision** (chapter 10) — a uniform grid or spatial hash so
  collision stops being O(n²). This is the first thing that will bite; add it
  when frame time climbs.
- **Archetype storage** (chapter 04) — group entities by exact component set for
  cache-perfect queries. A bigger rewrite of `World`, worth it at DOTS-like
  scale.
- **Entity generations** (chapter 04) — fold a generation into the id so
  long-lived handles (a lock-on target you remember across frames) can detect a
  recycled slot. Add this the moment a system stores an `Entity` between frames.
- **Triple-buffered instance data** (chapter 05) — stop allocating instance
  buffers per draw; cycle through 2–3 pre-sized buffers with a semaphore so the
  CPU can build frame *N+1* while the GPU still reads frame *N*. The standard
  Metal throughput pattern.

---

## Going multiplayer

Co-op or versus dogfighting is the big one, and it reaches back into chapter 07's
timestep decision. Lockstep netcode needs a **deterministic fixed-step**
simulation (same inputs ⇒ same result on every machine); client-server with
prediction needs a **rewindable** simulation (re-simulate from a server snapshot
when a correction arrives). Either way, the groundwork is: make the simulation
deterministic and separable from rendering *first*. Retrofitting determinism into
a shipped game is brutal; knowing the requirement now is the gift.

---

## Working like a graphics programmer

Two tools will teach you more than any tutorial:

- **The Metal frame debugger / GPU capture** (Xcode). Capture a frame and step
  through every draw call, inspect buffers, and see exactly what each shader
  received. When something renders wrong, this shows you *why* in seconds.
- **The GPU performance HUD & Instruments.** Find where frame time actually goes
  before optimising. Our per-draw buffer allocation, for instance, will show up
  here the moment it matters — and *only* then is it worth fixing.

Optimise against measurements, not hunches. The prototype is full of "simple now,
fast later" choices precisely so you can *feel* which ones matter before touching
them.

---

## The through-line

Every item above plugs into a seam this guide already built: content swaps behind
`Mesh`, behaviour is a new component + system + schedule line, rendering upgrades
live behind the `[MeshID: [InstanceData]]` handoff, and the timestep decision
gates physics and netcode. That's the real deliverable — not a finished game, but
a small, honest codebase whose every extension point you can now name. Go add
something, and watch how little else you have to touch.

---

*Back to the [guide map](../README.md) · references in [`resources.md`](../resources.md)*
