# Appendix — Resources & Further Reading

Everything referenced across the guide, plus the best of what's out there for
Metal, ECS design, game-loop timing and the math — organized by topic.
⭐ = start here for that topic.

> Links occasionally drift (Apple reorganises `developer.apple.com`, blogs move).
> If one 404s, the resource almost certainly still exists — search its title.

---

## Metal & MetalKit — primary sources

| Resource | What it's for |
|---|---|
| ⭐ Apple — **Metal** documentation — https://developer.apple.com/documentation/metal | The API reference for every object in Chapter 02: device, command queue, pipeline state, encoders. |
| Apple — **MetalKit** / `MTKView` — https://developer.apple.com/documentation/metalkit | The view + delegate that drive our game loop (Chapters 02, 07). |
| ⭐ Apple — **Metal Shading Language Specification** (PDF) — https://developer.apple.com/metal/Metal-Shading-Language-Specification.pdf | The definitive MSL reference — attributes like `[[vertex_id]]`, `[[instance_id]]`, `[[point_coord]]` used in Chapter 05. |
| Apple — **Metal** hub — https://developer.apple.com/metal/ | Feature-set tables, tools, and links to sample code and WWDC sessions. |
| Apple — *Using Metal to Draw a View's Contents* (sample) — https://developer.apple.com/documentation/metal/using-a-render-pipeline-to-render-primitives | The minimal "triangle on screen" pipeline our `Renderer` grows from. |
| Apple — **Model I/O** — https://developer.apple.com/documentation/modelio | Loading real 3D assets (USD/OBJ) when code geometry stops being enough (Chapter 12). |
| Apple — **simd** — https://developer.apple.com/documentation/accelerate/simd | The vector/matrix/quaternion types (Chapter 03) that also match Metal's memory layout. |

## Metal — tutorials & books

| Resource | What it's for |
|---|---|
| ⭐ **Metal by Example** (Warren Moore) — https://metalbyexample.com | The friendliest deep-dive into Metal from first principles; excellent on the pipeline and buffers. |
| **Metal by Tutorials** (Kodeco / raywenderlich) — https://www.kodeco.com/books/metal-by-tutorials | Book-length, project-based Metal in Swift — the natural next step after this guide. |
| **2020 WWDC — "Bring your game to Mac" & Metal sessions** — https://developer.apple.com/videos/all-videos/?q=metal | Apple's own talks on modern Metal rendering, GPU-driven pipelines and debugging. |
| **Metal Debugger / GPU Capture** (Xcode docs) — https://developer.apple.com/documentation/xcode/metal-debugger | Capture a frame and inspect every draw call and buffer — the tool from Chapter 12. |

## Entity–Component–System

| Resource | What it's for |
|---|---|
| ⭐ **Austin Morlan — A Simple Entity Component System (C++)** — https://austinmorlan.com/posts/entity_component_system/ | The clearest from-scratch ECS walkthrough; our `World`/`ComponentStore` are a Swift cousin. |
| ⭐ **skypjack — "ECS back and forth"** (EnTT author) — https://skypjack.github.io/2019-02-14-ecs-baf-part-1/ | The definitive series on ECS storage — sparse sets vs archetypes, exactly Chapter 04's trade-off. |
| **EnTT** — https://github.com/skypjack/entt | The production sparse-set ECS our storage mirrors; worth reading for how far the idea scales. |
| **Bevy ECS** — https://bevyengine.org / https://bevy-cheatbook.github.io | An archetype ECS in Rust; the direction Chapter 12 points toward for large worlds. |
| **Sander Mertens (Flecs) — ECS FAQ & articles** — https://github.com/SanderMertens/ecs-faq | A curated map of every ECS concept, pattern and library. |
| **Mike Acton — Data-Oriented Design and C++** (CppCon 2014) — https://www.youtube.com/watch?v=rX0ItVEVjHc | The talk that reframes "objects" as "data laid out for the cache" — the *why* under ECS. |

## Game loop & timing

| Resource | What it's for |
|---|---|
| ⭐ **Robert Nystrom — *Game Programming Patterns*: Game Loop** — https://gameprogrammingpatterns.com/game-loop.html | The canonical explanation of the loop, delta time, and decoupling update from render (Chapter 07). Free online. |
| ⭐ **Glenn Fiedler — "Fix Your Timestep!"** — https://gafferongames.com/post/fix_your_timestep/ | *The* article on fixed vs variable timestep and the accumulator pattern — read before adding physics. |
| **Game Programming Patterns — Component** — https://gameprogrammingpatterns.com/component.html | The OO-to-composition stepping stone that leads to a full ECS. |

## The math

| Resource | What it's for |
|---|---|
| ⭐ **Ben Eater & Grant Sanderson — Visualizing quaternions** (interactive) — https://eater.net/quaternions | The best intuition for *why* quaternions rotate without gimbal lock (Chapter 03, 08). |
| **3Blue1Brown — Essence of Linear Algebra** — https://www.youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab | Vectors, matrices and transforms as geometry, not bookkeeping. |
| **Song Ho Ahn — OpenGL projection & transformation matrices** — https://www.songho.ca/opengl/gl_projectionmatrix.html | Derivations of the perspective and lookAt matrices in `Math.swift` (mind the [0,1] vs [-1,1] depth note). |
| **Real-Time Rendering** (Akenine-Möller et al.) — https://www.realtimerendering.com | The reference textbook for everything in Chapter 12's rendering roadmap. |
| **Wikipedia — Gimbal lock** — https://en.wikipedia.org/wiki/Gimbal_lock | Why we don't store orientation as Euler angles (Chapter 03). |

## Swift & tooling

| Resource | What it's for |
|---|---|
| **Swift Package Manager** — https://www.swift.org/documentation/package-manager/ | The `Package.swift` manifest and `swift run` (Chapter 01). |
| **Swift `simd` in practice** (Apple sample: *Working with Matrices*) — https://developer.apple.com/documentation/accelerate/working_with_matrices | Practical `simd` matrix/quaternion recipes. |

## Free 3D assets (for when "simple geometry" ends)

| Resource | What it's for |
|---|---|
| ⭐ **Kenney** — https://kenney.nl/assets | CC0 space kits (ships, asteroids, stations) — drop-in replacements for our code meshes. |
| **Quaternius** — https://quaternius.com | Free low-poly model packs in the same faceted style as our shapes. |
| **Poly Pizza** — https://poly.pizza | A searchable library of free low-poly models (glTF/OBJ). |
| **OpenGameArt** — https://opengameart.org | Broad free-asset library — models, textures, sound effects, music. |

## The games we're chasing (not cloning)

| Resource | What it's for |
|---|---|
| **Star Fox** (SNES, 1993) — https://en.wikipedia.org/wiki/Star_Fox_(1993_video_game) | The on-rails / all-range arcade flight feel and low-poly aesthetic our prototype nods to. |
| **Ace Combat** series — https://en.wikipedia.org/wiki/Ace_Combat | Arcade dogfighting with a flight model that's forgiving by design — the target for Chapter 08. |

---

*Back to the [guide map](README.md).*
