# Appendix — Resources & Further Reading

Everything referenced across the guide, plus the best of what's out there for
PixiJS, ECS design, the game loop, and the 2D math — organized by topic.
⭐ = start here for that topic.

> Links occasionally drift (PixiJS reorganises `pixijs.com` between majors, blogs
> move). If one 404s, the resource almost certainly still exists — search its
> title, and prefer the `8.x` path on the PixiJS site.

---

## PixiJS — primary sources

| Resource | What it's for |
|---|---|
| ⭐ PixiJS — **v8 Guides** — https://pixijs.com/8.x/guides | The conceptual docs for every object in Chapter 02: `Application`, the scene graph, `Graphics`, `Sprite`, `Ticker`, `Assets`. |
| ⭐ PixiJS — **API reference (v8)** — https://pixijs.download/release/docs/index.html | The exhaustive per-class reference — signatures for `app.init`, `Graphics.fill`, `Ticker`, `Text`, `ParticleContainer`. |
| PixiJS — **v7 → v8 Migration Guide** — https://pixijs.com/8.x/guides/migrations/v8 | Every breaking change we rely on: async `init`, `app.canvas`, the new `Graphics` fill API, `ParticleContainer`. |
| PixiJS — **v8 Launch post** — https://pixijs.com/blog/pixi-v8-launches | The "why v8" overview: WebGPU, the renderer rewrite, and the API modernisation. |
| PixiJS — **GitHub** — https://github.com/pixijs/pixijs | Source, releases and issues; read the release notes when a minor changes behaviour. |
| PixiJS — **Graphics fill/stroke API** — https://pixijs.com/8.x/guides/components/scene-objects/graphics | The geometry-then-style model (`rect().fill()`, `circle().fill()`, `poly().stroke()`) used all over Chapter 06. |
| PixiJS — **Ticker** — https://pixijs.com/8.x/guides/components/application/ticker | `deltaTime` vs `deltaMS`, update priorities, and how `Application` schedules its own render (Chapter 07). |
| PixiJS — **ParticleContainer / Particle** — https://pixijs.com/8.x/guides/components/scene-objects/particle-container | The rewritten v8 particle API (`dynamicProperties`, `addParticle`) for explosions and thrusters (Chapter 06). |
| PixiJS — **Assets** — https://pixijs.com/8.x/guides/components/assets | Loading real textures with `Assets.load` when procedural `Graphics` stops being enough (Chapter 13). |

## PixiJS — tutorials & tooling

| Resource | What it's for |
|---|---|
| ⭐ **Vite** — https://vite.dev/guide/ | The zero-config dev server + bundler the guide scaffolds in Chapter 01 (`npm create vite -- --template vanilla-ts`). |
| **PixiJS — "Getting Started" tutorial** — https://pixijs.com/8.x/tutorials/getting-started | The canonical init → load → add → animate walkthrough that Chapter 01 compresses. |
| **PixiJS DevTools (browser extension)** — https://pixijs.com/8.x/guides/devtools | Inspect the live scene graph — invaluable when a sprite is "gone" but really just off-screen or at alpha 0. |
| **TypeScript Handbook** — https://www.typescriptlang.org/docs/handbook/intro.html | Generics and classes, the two features the `World`/`ComponentStore` typing leans on (Chapter 04). |

## Entity–Component–System

| Resource | What it's for |
|---|---|
| ⭐ **Austin Morlan — A Simple Entity Component System (C++)** — https://austinmorlan.com/posts/entity_component_system/ | The clearest from-scratch ECS walkthrough; our `World`/`ComponentStore` are a TypeScript cousin. |
| ⭐ **skypjack — "ECS back and forth"** (EnTT author) — https://skypjack.github.io/2019-02-14-ecs-baf-part-1/ | The definitive series on ECS storage — sparse sets vs archetypes, exactly Chapter 04's trade-off. |
| ⭐ **Web Game Dev — ECS** — https://www.webgamedev.com/code-architecture/ecs | ECS framed specifically for the browser/JS ecosystem, with library comparisons. |
| **bitECS** — https://github.com/NateTheGreatt/bitECS | A minimal, SoA/`ArrayBuffer`, ultra-fast TS ECS — the direction Chapter 13 points for performance. |
| **miniplex** — https://github.com/hmans/miniplex | An AoS, DX-first TS ECS with reactive archetype queries; the gentlest "real library" upgrade from ours. |
| **Sander Mertens (Flecs) — ECS FAQ** — https://github.com/SanderMertens/ecs-faq | A curated map of every ECS concept, pattern and library. |
| **Mike Acton — Data-Oriented Design and C++** (CppCon 2014) — https://www.youtube.com/watch?v=rX0ItVEVjHc | The talk that reframes "objects" as "data laid out for the cache" — the *why* under ECS. |

## Game loop, timing & patterns

| Resource | What it's for |
|---|---|
| ⭐ **Robert Nystrom — *Game Programming Patterns*** — https://gameprogrammingpatterns.com/ | Free online. The **Game Loop**, **Component**, **Update Method** and **Object Pool** chapters underpin Chapters 05, 07 and 13. |
| ⭐ **Glenn Fiedler — "Fix Your Timestep!"** — https://gafferongames.com/post/fix_your_timestep/ | *The* article on fixed vs variable timestep and the accumulator — read before trusting your collisions (Chapter 03, 07). |
| **MDN — `requestAnimationFrame`** — https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame | What PixiJS's `Ticker` sits on; the source of your variable frame delta. |
| **Game Programming Patterns — Spatial Partition** — https://gameprogrammingpatterns.com/spatial-partition.html | The uniform-grid broad phase behind Chapter 10's collision system. |

## The 2D math

| Resource | What it's for |
|---|---|
| ⭐ **MDN — 2D collision detection** — https://developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection | AABB and circle overlap tests, exactly the two we use in Chapter 03/10. |
| **Red Blob Games** (Amit Patel) — https://www.redblobgames.com/ | The best interactive explanations of grids, vectors and game math on the web. |
| **MDN — Game development** — https://developer.mozilla.org/en-US/docs/Games | Broad reference for input, audio, and the browser game platform generally. |

## The game we're chasing (not cloning)

| Resource | What it's for |
|---|---|
| **Space Impact** — Wikipedia — https://en.wikipedia.org/wiki/Space_Impact | Provenance and the feature list (waves, enemy types, power-ups, bosses) Chapters 09–12 draw from. |
| **Space Impact** — Nokia Wiki — https://nokia.fandom.com/wiki/Space_Impact | Per-game specifics: movement, special weapons (homing, laser gun, laser wall), extra lives. |

## Free 2D assets (for when "procedural" ends)

| Resource | What it's for |
|---|---|
| ⭐ **Kenney** — https://kenney.nl/assets | CC0 space-shooter kits (ships, bullets, explosions) — drop-in replacements for our `Graphics` (Chapter 13). |
| **OpenGameArt** — https://opengameart.org | Broad free-asset library — sprites, sound effects, music. |
| **freesound.org** — https://freesound.org | CC-licensed sound effects for the audio pass in Chapter 13. |

---

*Back to the [guide map](README.md).*
