# Appendix — Resources & Further Reading

Everything referenced across the guide, plus the best of what's out there for
Vulkan, the toolchain, ECS design, game-loop timing and the math — organized by
topic. ⭐ = start here for that topic.

> Links occasionally drift (Khronos reorganises `docs.vulkan.org`, repos move,
> blogs get bot-walls). If one 404s or blocks you, the resource almost certainly
> still exists — search its title.

---

## Vulkan — primary sources

| Resource | What it's for |
|---|---|
| ⭐ Khronos — **Vulkan Registry & Specification** — https://registry.khronos.org/vulkan/ | The canonical reference for every object in Chapters 02–07: instance, device, swapchain, pipeline, descriptors, sync. The [1.3 HTML spec](https://registry.khronos.org/vulkan/specs/1.3-extensions/html/) is searchable. |
| ⭐ Khronos — **Vulkan Documentation / Guide** — https://docs.vulkan.org | The official, readable companion to the spec — concept explainers for queues, memory, synchronization and more (Chapters 02, 05, 07). |
| **Khronos — Vulkan-Samples** — https://github.com/KhronosGroup/Vulkan-Samples | The official one-stop sample collection: dynamic rendering, descriptor indexing, and every performance topic Chapter 14 points at. |
| **LunarG — Vulkan SDK** — https://vulkan.lunarg.com | The loader, validation layers, `glslc`/shaderc and `vkconfig` (Chapters 01, 06, 14). Install this first. |
| **Vulkan Synchronization Examples** (Khronos wiki) — https://github.com/KhronosGroup/Vulkan-Docs/wiki/Synchronization-Examples | Copy-paste-correct barrier and semaphore/fence recipes — the reference for Chapter 05's sync. |

## Vulkan — tutorials & books

| Resource | What it's for |
|---|---|
| ⭐ **Vulkan Tutorial** (Alexander Overvoorde) — https://vulkan-tutorial.com | The friendliest first pass through instance→triangle; our Chapters 02, 05, 06 cover the same ground more briefly. |
| ⭐ **vkguide.dev** (Victor Blanco) — https://vkguide.dev | A modern-Vulkan guide built around **dynamic rendering**, VMA and descriptor abstractions — the direction Chapter 14 points toward. |
| **Sascha Willems — Vulkan examples** — https://github.com/SaschaWillems/Vulkan | The definitive grab-bag of runnable Vulkan techniques (shadows, compute particles, PBR) — a technique index for Chapter 14. |
| **Arseny Kapoulkine (zeux) — "Writing an efficient Vulkan renderer"** — https://zeux.io/2020/02/27/writing-an-efficient-vulkan-renderer/ | The best single article on the performance decisions behind Chapter 07 (buffers, descriptors) and Chapter 14 (bindless, GPU-driven). |

## The toolchain

| Resource | What it's for |
|---|---|
| **GLFW documentation** — https://www.glfw.org/docs/latest/ | Window, surface and input — the Vulkan surface (Chapter 05) and the `Input` producer (Chapter 10). |
| ⭐ **GLM** — https://github.com/g-truc/glm | The header-only math library: `vec`, `mat`, `quat`, and the `GLM_FORCE_DEPTH_ZERO_TO_ONE` flag central to Chapter 03. |
| ⭐ **Vulkan Memory Allocator (VMA)** — https://github.com/GPUOpen-LibrariesAndSDKs/VulkanMemoryAllocator | AMD's allocator — the whole of Chapter 07's memory management in one header. Read its docs for the budget and defrag APIs (Chapter 14). |
| **shaderc** (Google) — https://github.com/google/shaderc | `glslc`, the GLSL→SPIR-V compiler CMake runs in Chapter 01, and `libshaderc` for the runtime-compile alternative (Chapter 06). |
| **CMake documentation** — https://cmake.org/cmake/help/latest/ | The build system and the custom `glslc` step from Chapter 01. |

## Debugging & profiling

| Resource | What it's for |
|---|---|
| ⭐ **RenderDoc** — https://renderdoc.org | Capture a Vulkan frame and inspect every draw, buffer, descriptor and pipeline — the single best tool for "why does this render wrong?" (Chapter 14). |
| **Vulkan Configurator (`vkconfig`)** — https://vulkan.lunarg.com/doc/sdk/latest/windows/vkconfig.html | Turn on GPU-assisted and synchronization validation without touching code (Chapter 14). |
| **Tracy Profiler** — https://github.com/wolfpld/tracy | A frame profiler that instruments CPU and GPU together — find where frame time actually goes before optimising (Chapter 14). |

## Rust alternative — `ash`

| Resource | What it's for |
|---|---|
| **ash — Vulkan bindings for Rust** — https://github.com/ash-rs/ash | The near-1:1 Vulkan API in Rust; every object and ordering rule in this guide maps across unchanged. Pair with **gpu-allocator** or **vk-mem** for VMA. |

## Entity–Component–System

| Resource | What it's for |
|---|---|
| ⭐ **Austin Morlan — A Simple Entity Component System (C++)** — https://austinmorlan.com/posts/entity_component_system/ | The clearest from-scratch ECS walkthrough, in C++; our `World`/`ComponentStore` (Chapter 04) are a close cousin. |
| ⭐ **skypjack — "ECS back and forth"** (EnTT author) — https://skypjack.github.io/2019-02-14-ecs-baf-part-1/ | The definitive series on ECS storage — sparse sets vs archetypes, exactly Chapter 04's trade-off. |
| **EnTT** — https://github.com/skypjack/entt | The production sparse-set ECS our storage mirrors, in C++; the natural "adopt instead of build" upgrade (Chapter 14). |
| **Bevy ECS** — https://bevyengine.org · https://bevy-cheatbook.github.io | An archetype ECS in Rust; the direction Chapter 14 points toward for large worlds. |
| **Sander Mertens (Flecs) — ECS FAQ & articles** — https://github.com/SanderMertens/ecs-faq | A curated map of every ECS concept, pattern and library. |
| **Mike Acton — Data-Oriented Design and C++** (CppCon 2014) — https://www.youtube.com/watch?v=rX0ItVEVjHc | The talk that reframes "objects" as "data laid out for the cache" — the *why* under ECS. |

## Game loop & timing

| Resource | What it's for |
|---|---|
| ⭐ **Robert Nystrom — *Game Programming Patterns*: Game Loop** — https://gameprogrammingpatterns.com/game-loop.html | The canonical explanation of the loop, delta time, and decoupling update from render (Chapter 09). Free online. |
| ⭐ **Glenn Fiedler — "Fix Your Timestep!"** — https://gafferongames.com/post/fix_your_timestep/ | *The* article on fixed vs variable timestep and the accumulator pattern — read before adding physics (Chapters 09, 14). |
| **Game Programming Patterns — Component** — https://gameprogrammingpatterns.com/component.html | The OO-to-composition stepping stone that leads to a full ECS. |

## The math

| Resource | What it's for |
|---|---|
| ⭐ **Ben Eater & Grant Sanderson — Visualizing quaternions** (interactive) — https://eater.net/quaternions | The best intuition for *why* quaternions rotate without gimbal lock (Chapters 03, 10). |
| **3Blue1Brown — Essence of Linear Algebra** — https://www.youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab | Vectors, matrices and transforms as geometry, not bookkeeping. |
| ⭐ **Song Ho Ahn — OpenGL projection & transformation matrices** — https://www.songho.ca/opengl/gl_projectionmatrix.html | Derivations of the perspective and lookAt matrices in `Math.hpp` — mind the [0,1] vs [-1,1] depth note that Chapter 03 turns into `GLM_FORCE_DEPTH_ZERO_TO_ONE`. |
| **Sascha Willems — "Setting up a proper Vulkan projection matrix"** — https://www.saschawillems.de/blog/2019/03/29/flipping-the-vulkan-viewport/ | The definitive write-up of the Y-flip and depth-range gotchas from Chapter 03 — both fixes, compared. |
| **Real-Time Rendering** (Akenine-Möller et al.) — https://www.realtimerendering.com | The reference textbook for everything in Chapter 14's rendering roadmap. |
| **Wikipedia — Gimbal lock** — https://en.wikipedia.org/wiki/Gimbal_lock | Why we don't store orientation as Euler angles (Chapter 03). |

## Cross-platform & portability

| Resource | What it's for |
|---|---|
| **MoltenVK** — https://github.com/KhronosGroup/MoltenVK | Vulkan-on-Metal for macOS/iOS — how this guide's code runs on Apple hardware (Chapter 14), closing the loop with the Metal sibling guide. |
| **`VK_KHR_dynamic_rendering`** (spec) — https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VK_KHR_dynamic_rendering.html | The extension that deletes render-pass/framebuffer boilerplate — Chapter 05's note and Chapter 14's first refactor. |

## Free 3D assets (for when "simple geometry" ends)

| Resource | What it's for |
|---|---|
| ⭐ **Kenney** — https://kenney.nl/assets | CC0 space kits (ships, asteroids, stations) — drop-in replacements for our code meshes (Chapter 14). |
| **Quaternius** — https://quaternius.com | Free low-poly model packs in the same faceted style as our shapes. |
| **Poly Pizza** — https://poly.pizza | A searchable library of free low-poly models (glTF/OBJ). |
| **OpenGameArt** — https://opengameart.org | Broad free-asset library — models, textures, sound effects, music. |
| **glTF loaders — cgltf / tinygltf** — https://github.com/jkuhlmann/cgltf · https://github.com/syoyo/tinygltf | Single-header loaders to fill our `MeshData` from real files (Chapter 14). |

## The games we're chasing (not cloning)

| Resource | What it's for |
|---|---|
| **Star Fox** (SNES, 1993) — https://en.wikipedia.org/wiki/Star_Fox_(1993_video_game) | The on-rails / all-range arcade flight feel and low-poly aesthetic our prototype nods to. |
| **Ace Combat** series — https://en.wikipedia.org/wiki/Ace_Combat | Arcade dogfighting with a flight model that's forgiving by design — the target for Chapter 10. |

---

*Back to the [guide map](README.md).*
