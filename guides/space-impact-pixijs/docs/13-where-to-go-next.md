# 13 · Where to go next 🧠

> **You'll leave this chapter with:** an honest map of what a shipping version
> needs — performance, a real ECS, art and audio, determinism for replay/netcode,
> more content — and exactly where each hooks into the scaffold you built.

You have a complete game and, more valuably, a small engine you understand
end-to-end. Everything below is a *branch* off it, not a rewrite. Each names the
file it touches so none of it is abstract.

---

## Performance: pool, cull, batch

At a few hundred entities the game is comfortably fast; here's what to reach for
before it isn't.

- **Object pooling.** Two allocation sources churn the GC: `world.query(...)`
  returns a fresh array every call, and every bolt/spark creates and destroys an
  entity. Pool both. Give `query` an overload that fills a reused array, and keep
  a free-list of "dead" bullet entities you re-arm instead of `create`/`destroy`.
  This is *Game Programming Patterns*' **Object Pool**, and it's the single
  biggest win for a bullet-heavy shmup. (Touches `world.ts`, `factory.ts`.)
- **Bake bullets/sparks into a `ParticleContainer`.** We already bake bolt
  textures (chapter 06); at hundreds of simultaneous projectiles, move their
  *views* into a `ParticleContainer` like the starfield, so they draw in one call.
  Keep them as entities for simulation; just change the render target. (Touches
  `render.ts`, `factory.ts`.)
- **`cacheAsTexture`.** A complex static `Graphics` (the boss, a detailed ship)
  can be flattened to a texture with `container.cacheAsTexture(true)` so it's a
  single quad each frame instead of re-tessellated geometry. Re-cache only when it
  visibly changes.
- **Don't re-rasterize `Text`.** The HUD already guards this (chapter 12);
  anywhere else text changes per frame, cache it or switch to `BitmapText`, which
  updates without re-rasterizing.
- **Cull off-screen work.** You cull entities spatially (chapter 07). PixiJS also
  skips drawing objects with `renderable = false`; toggle it for anything parked
  off-screen but not yet destroyed.

Measure first with the [PixiJS DevTools](https://pixijs.com/8.x/guides/devtools)
and the browser profiler — pool the thing that's actually hot, not the thing you
guessed.

---

## A bigger ECS

Our sparse-set `World` is honest and fast enough for this game. Two directions
scale it:

- **Archetypes.** Group entities by their exact component set so a query iterates
  packed rows with no per-entity `has` checks (chapter 04's third option). This is
  what you'd build toward for thousands of entities and many-component queries.
- **Swap in a library.** [`bitECS`](https://github.com/NateTheGreatt/bitECS)
  stores components in typed `ArrayBuffer`s (SoA) for raw speed;
  [`miniplex`](https://github.com/hmans/miniplex) keeps the object-friendly feel of
  ours but adds **reactive archetype queries** (iterate "everything that just
  gained a `Shield`"). Because our game logic only touches components through
  `world`, the port is mechanical — the systems barely change, which is the whole
  point of having kept the seam clean.
- **Generations.** The moment you keep an entity handle across frames (a boss that
  remembers its escort, a homing missile that locks one target), add a generation
  counter to detect a reused id (chapter 04). Until then, re-querying each step is
  safe and simpler.

---

## Determinism, replay & netcode (you're closer than you think)

The fixed timestep (chapter 07) already makes the simulation deterministic *given
the same inputs* — except for one leak: we call **`Math.random()`** in the
spawner, explosions and drop table. Replace it with a **seeded PRNG** (a small
`mulberry32` is ~5 lines) stored as a resource, and the entire game becomes
reproducible from `(seed, input log)`.

That one change unlocks a lot:

- **Replays / ghosts.** Record the per-step `Input` intents; play them back through
  the same seed to reproduce a run exactly. (This is also the best regression test
  a game can have.)
- **Netcode.** Deterministic lockstep or rollback both require exactly this: a
  fixed step, a seeded RNG, and inputs as the only nondeterminism. Our loop is
  already shaped for it.

Input is already an abstraction (chapter 08), so "inputs come from the network/a
recording" is a resource swap, not a rewrite.

---

## Real art & animation

Procedural `Graphics` got us to a playable game with zero assets; swapping in real
sprites is a texture change, not a code change, because the render seam only cares
about a `Container`.

- **Spritesheets.** Pack frames with TexturePacker (or `Assets`' JSON atlas
  support) and `await Assets.load('ships.json')`; replace a `makeEnemyShip()` call
  with `new Sprite(sheet.textures['enemy_a'])`.
- **Animation.** PixiJS's `AnimatedSprite` plays a frame array — perfect for
  thruster flames, explosions, and idle-bob. Drive it from a component if you want
  animation state in the ECS.
- **Free assets.** [Kenney](https://kenney.nl/assets) has CC0 space-shooter kits
  that drop straight in; [OpenGameArt](https://opengameart.org) has more.

---

## Audio

There's no sound yet — add it as a system that reacts to events. The simplest path
is the [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
or a thin wrapper like `howler.js`: preload a few `AudioBuffer`s as a resource,
and have `killEntity`, the weapon system, and pickups fire one-shots. Music is one
looping track with a duck on the boss. Grab effects from
[freesound.org](https://freesound.org). Keep audio *event-driven* off the same
signals the gameplay already produces — don't poll.

---

## Juice

Small feedback multipliers, roughly in value-per-hour order:

- **Screen shake** on hits/explosions — offset the entities layer's container by a
  decaying random vector for a few frames (a `Shake` resource + system).
- **Hit-stop** — freeze the simulation for ~50 ms on a big kill by skipping a step;
  it reads as impact.
- **A real hit-flash** — the white flash the alpha dip approximates (chapter 10),
  via a brief `ColorMatrixFilter` or a white overlay child.
- **Tweens** for pickups popping in and UI sliding — a tiny lerp system, or a
  library like GSAP.
- **More parallax** — a second, slower star layer, or nebula sprites, behind the
  field you built.

---

## More game

- **Levels.** The spawner is already data (chapter 09). Make `buildLevel1`,
  `buildLevel2`, … an array indexed by a `level` counter; on `clear`, increment and
  `startGame` the next timeline instead of the same one. Ramp a `difficulty`
  resource into spawn rate and enemy hp.
- **Scrolling backgrounds.** A `TilingSprite` (or two, at different speeds) behind
  the starfield gives ground/structures without per-tile entities.
- **High scores.** Persist `Score` to `localStorage` on game-over; show the best on
  the title screen — a few lines, no new systems.
- **More enemies & weapons.** Each is the chapter-04 recipe: a component, a system,
  a line in the schedule, a `case` in the factory. A laser (a persistent beam
  collider), a shield-drone escort, a mine that drifts — all compositions of what's
  here.

---

## Testing (a quiet superpower of ECS)

Because systems are **pure functions of `(world, dt)`** and the engine has no
PixiJS dependency, you can unit-test gameplay with no renderer at all:

```ts
// movement.test.ts (Vitest)
const world = new World();
const e = world.create();
world.add(e, new Transform(0, 0));
world.add(e, new Velocity(100, 0));
movementSystem(world, 0.5);
expect(world.get(e, Transform)!.x).toBe(50);
```

Collision, homing, weapon cooldowns, the spawner timeline — all testable headless.
The `engine/` vs `game/` split (chapter 01) is what makes this clean: nothing in
`engine/` imports `pixi.js`, so it runs anywhere Node does.

---

## Packaging & deploy

Vite builds a static bundle: `npm run build` emits `dist/`, deployable to any
static host (GitHub Pages, Netlify, Cloudflare Pages). No server, no backend —
it's a `<canvas>` and some JavaScript. If you built inside the repo's Nuxt
playground instead, `nuxt generate` does the same for a static export; the engine
and game code are identical either way (chapters 01, 07).

---

## The one idea to keep

If you remember one thing from this guide, make it the seam:

> **Simulation is data and functions; rendering is a mirror of it. Keep them
> apart, and both stay simple.**

That's why the ECS never imports PixiJS, why one 10-line `RenderSystem` is the only
bridge, and why every new feature was "a component, a system, a line in the
schedule." It's the same discipline whether the renderer is PixiJS, canvas 2D, or
something you write next — and whether the ECS is these 150 lines or `bitECS`.

Now go change one number, add one behaviour, and make it yours.

---

*Back to the [guide map](../README.md) · [Resources](../resources.md)*
