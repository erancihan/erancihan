# 07 · The game loop & scheduling 🛠️

> **You'll leave this chapter with:** the beating heart of the game — a
> fixed-timestep loop wired to the `Ticker`, a `Schedule` assembled from real
> systems, the kinematic systems (`Velocity`, `Spin`, `Lifetime`, off-screen
> cull) every entity relies on, and a world that spawns, moves and cleans up on a
> steady clock.

Chapter 03 explained the fixed timestep in the abstract; here we connect it to the
`World`, the `Schedule` and PixiJS's `Ticker`.

---

## Three kinematic components

Add to **`src/game/components.ts`**:

```ts
// src/game/components.ts (add)

/** Linear velocity in pixels per second. Movement integrates this. */
export class Velocity {
  constructor(public x = 0, public y = 0) {}
}

/** Angular velocity in radians per second — purely visual spin (debris, pickups). */
export class Spin {
  constructor(public rate = 0) {}
}

/** Seconds remaining before the entity self-destructs (bolts, sparks). */
export class Lifetime {
  constructor(public remaining: number) {}
}
```

Three tiny data bags. What they *do* is entirely in the systems that read them.

---

## The kinematic systems

### Movement & spin — `src/game/systems/movement.ts`

```ts
// src/game/systems/movement.ts
import type { World } from "../../engine/world";
import { Transform, Velocity, Spin } from "../components";

/** Integrate velocity into position. Every moving thing has these two. */
export function movementSystem(world: World, dt: number): void {
  for (const e of world.query(Transform, Velocity)) {
    const t = world.get(e, Transform)!;
    const v = world.get(e, Velocity)!;
    t.x += v.x * dt;
    t.y += v.y * dt;
  }
}

/** Advance rotation for anything that spins. */
export function spinSystem(world: World, dt: number): void {
  for (const e of world.query(Transform, Spin)) {
    world.get(e, Transform)!.rotation += world.get(e, Spin)!.rate * dt;
  }
}
```

`movementSystem` is the single most-used system in the game — the player, every
enemy, every bolt, every spark passes through it, because they all carry
`Velocity`. That's the ECS dividend: one seven-line system moves *everything*.

### Lifetime & culling — `src/game/systems/lifetime.ts`

Two ways entities die on their own: a **timer** runs out (bolts, sparks), or they
**drift off-screen** (a bolt that missed, a pickup that scrolled past). Both just
call `world.destroy` — deferred, safe (chapter 04):

```ts
// src/game/systems/lifetime.ts
import type { World } from "../../engine/world";
import { Transform, Lifetime } from "../components";
import { Bounds } from "../resources";

/** Count down Lifetime; destroy at zero. */
export function lifetimeSystem(world: World, dt: number): void {
  for (const e of world.query(Lifetime)) {
    const life = world.get(e, Lifetime)!;
    life.remaining -= dt;
    if (life.remaining <= 0) world.destroy(e);
  }
}

/**
 * Destroy anything that has left the playfield by a wide margin. The margin is
 * generous on the right so enemies can spawn just off-screen and fly in; the
 * player never triggers this because chapter 08 clamps it inside the bounds.
 */
export function cullOffscreenSystem(world: World): void {
  const b = world.resource(Bounds);
  for (const e of world.query(Transform)) {
    const t = world.get(e, Transform)!;
    if (t.x < -80 || t.x > b.width + 500 || t.y < -80 || t.y > b.height + 80) {
      world.destroy(e);
    }
  }
}
```

> **Why the asymmetric margin?** Enemies spawn at `x = width + 40` and fly left,
> so the right edge of the cull box has to sit *beyond* the spawn line
> (`width + 500`) or they'd be culled the instant they appear. The player is
> clamped on-screen next chapter, so iterating every `Transform` here never
> removes it.

---

## Assembling the schedule and the loop

Now the payoff — `src/main.ts` grows a real loop. The schedule lists the systems
in order; later chapters slot gameplay systems into the marked gap, but the
skeleton is complete now:

```ts
// src/main.ts (the loop)
import { Schedule } from "./engine/schedule";
import { movementSystem, spinSystem } from "./game/systems/movement";
import { lifetimeSystem, cullOffscreenSystem } from "./game/systems/lifetime";
import { starfieldSystem } from "./game/systems/starfield";
import { renderSystem } from "./game/systems/render";
import { detachView } from "./game/factory";

const schedule = new Schedule()
  // ── gameplay systems land here in chapters 08–12 ──────────────
  //   .add(playerControlSystem)
  //   .add(weaponSystem)
  //   .add(spawnerSystem)
  //   .add(enemyAiSystem)
  //   .add(homingSystem)
  //   .add(collisionSystem)
  //   .add(damageSystem)
  //   .add(powerupSystem)
  // ── framework systems ─────────────────────────────────────────
  .add(movementSystem)
  .add(spinSystem)
  .add(lifetimeSystem)
  .add(cullOffscreenSystem)
  .add(starfieldSystem)
  .add(renderSystem);        // ALWAYS last: reflect final state into PixiJS

const STEP = 1 / 60;         // simulate 60 times a second, always
let accumulator = 0;

app.ticker.add((ticker) => {
  // bank the real elapsed time...
  accumulator += ticker.deltaMS / 1000;
  if (accumulator > 0.25) accumulator = 0.25;     // ...but cap the catch-up debt

  // ...and spend it in fixed slices. The simulation only ever sees dt = STEP.
  while (accumulator >= STEP) {
    schedule.run(world, STEP);                     // run every system, in order
    world.flush((e) => detachView(world, e));      // remove dead entities + their PixiJS views
    accumulator -= STEP;
  }
  // PixiJS renders automatically after this callback (see priority note below).
});
```

That's the entire clockwork. Read it once more as prose: *each frame, add the real
elapsed time to a bank; while there's at least one fixed step banked, run the
whole schedule with a constant `dt` and remove anything that died; repeat.* Every
number in the game is per-second, every step is `1/60` s, and nothing depends on
how long a frame actually took.

### Why `flush` is inside the `while`

`world.flush` runs **per fixed step**, not once per frame, so an entity destroyed
in step *N* is gone before step *N+1* runs — collisions never see a corpse. The
`detachView` hook removes the dead entity's PixiJS object from the scene graph at
the same instant (chapter 05), so there are no orphaned sprites.

### The ticker-priority guarantee

We add our callback at the default priority (`NORMAL`); `Application` added its own
render at `LOW`; higher runs first (chapter 02). So the order every frame is:

```
our ticker callback  → simulate N steps, sync transforms via renderSystem
PixiJS render        → draws the scene graph we just updated
```

The `renderSystem` being *last in the schedule* and the schedule running *before*
PixiJS's render is what guarantees the screen shows the state we just simulated.
(On a catch-up frame the schedule runs twice, so `renderSystem` runs twice too;
it's a cheap transform copy, and only the last run's values reach the draw. If you
ever profile it as hot, hoist `renderSystem` out of the `while` and call it once
after — but leave it in the schedule until you've measured a reason not to.)

---

## Prove the loop: a swarm of drifting debris

Before adding a player, spawn a few dozen spinning entities and watch the loop
carry them. Temporarily, after the schedule is built:

```ts
import { Graphics } from "pixi.js";
import { Transform, Velocity, Spin, Lifetime } from "./game/components";
import { mountView } from "./game/factory";

for (let i = 0; i < 40; i++) {
  const e = world.create();
  world.add(e, new Transform(Math.random() * app.screen.width, Math.random() * app.screen.height));
  world.add(e, new Velocity(-40 - Math.random() * 60, (Math.random() - 0.5) * 20));
  world.add(e, new Spin((Math.random() - 0.5) * 6));
  world.add(e, new Lifetime(2 + Math.random() * 4));
  const g = new Graphics().rect(-6, -6, 12, 12).fill(0x88aa66);
  mountView(world, e, g);
}
```

Run it: green squares drift left, spinning, and wink out as their lifetimes
expire or they exit the left edge — spawned, moved, culled, unmounted, all by
systems you can now name. Delete the block; chapter 08 puts a real ship at the
controls.

---

## Pausing (a forward glance)

To pause, you simply stop stepping the simulation while still letting PixiJS draw
the frozen frame. The cleanest version keys off game state (chapter 12), but the
mechanism is trivial — guard the `while`:

```ts
if (!paused) {
  while (accumulator >= STEP) { schedule.run(world, STEP); world.flush(...); accumulator -= STEP; }
} else {
  accumulator = 0;             // don't bank time while paused, or it lurches on resume
}
```

Resetting the accumulator on pause avoids a "time debt" that would fast-forward the
instant you unpause.

---

## Aside — the Nuxt playground seam

Everything above lives in `main()`. To run this engine inside the repo's
`PixiContainer.vue` instead, the `World`, `Schedule`, resources and the
`app.ticker.add(...)` call move into the component's `onMounted`, and you call
`app.ticker.stop()` / clean up the `World` in `onUnmounted`. Nothing in `engine/`
or `game/` changes — the loop is the only code that cares who owns the lifecycle.

---

## Checkpoint

- [x] `Velocity`, `Spin`, `Lifetime` exist; `movement`, `lifetime`/`cull`,
      `starfield`, `render` systems are in the schedule.
- [x] `main.ts` runs a fixed-timestep loop that steps the schedule and flushes
      the dead each step.
- [x] A swarm of debris spawns, drifts, spins and is culled — no per-object code.

The world has a pulse. Now we hand a player the controls.

*Next → [Chapter 08: Input & the player](08-input-and-the-player.md)*
