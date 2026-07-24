# 09 · Enemies, waves & AI 🛠️

> **You'll leave this chapter with:** the three Space Impact enemy archetypes —
> **straight**, **homing**, **shooter** — each as components + a system, a
> **data-driven spawner** that flies formations in from the right on a timeline,
> and enemy bolts. The screen finally fills with things to dodge and destroy.

---

## Three behaviours, three components

The archetypes differ only in *which components they carry*. All three move
(they have `Velocity`, so `movementSystem` already handles them); the extras add
steering and shooting. Add to **`src/game/components.ts`**:

```ts
// src/game/components.ts (add)

export type EnemyKind = "straight" | "homing" | "shooter";

/** Tag marking an enemy, and which archetype it is. */
export class Enemy {
  constructor(public kind: EnemyKind) {}
}

/** Steers the entity's velocity toward the player, up to `turnRate` rad/sec. */
export class Homing {
  constructor(public turnRate = 2.2) {}
}

/** Fires an enemy bolt every `cooldown` seconds. */
export class Shooter {
  constructor(public cooldown = 1.6, public timer = 1.2) {}
}
```

- **straight** = `Enemy` + `Velocity` only → flies left in a line.
- **homing** = the above + `Homing` → curves toward you.
- **shooter** = `Enemy` + `Velocity` + `Shooter` → advances and shoots.

Composition again: a "homing shooter" that both chases *and* fires would just be
`Enemy + Velocity + Homing + Shooter`, no new type. Try it after the chapter.

---

## Finding the player

Two systems need the player's position. Since there's exactly one, add a helper to
**`src/game/factory.ts`**:

```ts
// src/game/factory.ts (add)
import { Player, Enemy, Homing, Shooter, type EnemyKind } from "./components";
import { makeEnemyShip } from "./art";

/** The player entity, or 0 if there isn't one right now (dead/respawning). */
export function findPlayer(world: World): Entity {
  const players = world.query(Player);
  return players.length > 0 ? players[0] : 0;
}
```

Returning `0` (our reserved "no entity") when the player is mid-respawn lets the
AI systems degrade gracefully — homing enemies coast, shooters fire straight —
instead of crashing on a missing target.

---

## The homing system

Homing turns the velocity vector toward the player by at most `turnRate · dt`
radians per step — so it *curves*, it doesn't teleport its aim. It must run
**before** `movementSystem` so the new heading is integrated the same step. Create
**`src/game/systems/enemy.ts`**:

```ts
// src/game/systems/enemy.ts
import type { World } from "../../engine/world";
import { Enemy, Homing, Shooter, Transform, Velocity } from "../components";
import { findPlayer, spawnEnemyBolt } from "../factory";
import { angleDelta, clamp } from "../../engine/math";

export function homingSystem(world: World, dt: number): void {
  const player = findPlayer(world);
  if (player === 0) return;                       // no target: coast straight
  const target = world.get(player, Transform)!;

  for (const e of world.query(Enemy, Homing, Transform, Velocity)) {
    const h = world.get(e, Homing)!;
    const t = world.get(e, Transform)!;
    const v = world.get(e, Velocity)!;

    const speed = Math.hypot(v.x, v.y) || 1;
    const desired = Math.atan2(target.y - t.y, target.x - t.x);
    const current = Math.atan2(v.y, v.x);

    // rotate `current` toward `desired`, but no more than turnRate·dt this step
    const step = clamp(angleDelta(current, desired), -h.turnRate * dt, h.turnRate * dt);
    const heading = current + step;

    v.x = Math.cos(heading) * speed;
    v.y = Math.sin(heading) * speed;

    // the enemy art's nose points -x (local angle π), so offset by π to face travel
    t.rotation = heading - Math.PI;
  }
}
```

That `- Math.PI` is the local-vs-world orientation lesson in one line: the ship's
*forward* is `(-1, 0)` in its own space (angle π), so to point that forward along
world heading `h`, the container's rotation must be `h - π`. Straight and shooter
enemies keep rotation `0` — their forward already is left.

---

## The shooter system

Shooters count a cooldown down and fire a bolt aimed at the player (or straight
left if the player's gone). Same file:

```ts
// src/game/systems/enemy.ts (continued)

export function shooterSystem(world: World, dt: number): void {
  const player = findPlayer(world);

  for (const e of world.query(Enemy, Shooter, Transform)) {
    const s = world.get(e, Shooter)!;
    s.timer -= dt;
    if (s.timer > 0) continue;
    s.timer = s.cooldown;

    const t = world.get(e, Transform)!;
    let vx = -440;
    let vy = 0;
    if (player !== 0) {
      const target = world.get(player, Transform)!;
      const a = Math.atan2(target.y - t.y, target.x - t.x);
      vx = Math.cos(a) * 440;
      vy = Math.sin(a) * 440;
    }
    spawnEnemyBolt(world, t.x - 16, t.y, vx, vy);
  }
}
```

---

## The enemy & bolt factories

Add to **`src/game/factory.ts`**. `spawnEnemy` picks a speed and attaches the
extra components by kind; `spawnEnemyBolt` mirrors the player bolt but travels
left/at you and lives on the enemy collision layer (chapter 10):

```ts
// src/game/factory.ts (add)

export function spawnEnemy(world: World, kind: EnemyKind, x: number, y: number): Entity {
  const e = world.create();
  world.add(e, new Transform(x, y));
  world.add(e, new Enemy(kind));

  const speed = kind === "homing" ? 150 : kind === "shooter" ? 95 : 200;
  world.add(e, new Velocity(-speed, 0));

  if (kind === "homing") world.add(e, new Homing(2.2));
  if (kind === "shooter") world.add(e, new Shooter(1.6, 1.0));

  mountView(world, e, makeEnemyShip(kind), Layer.Entities);
  // Collider + Health arrive in chapter 10
  return e;
}

export function spawnEnemyBolt(world: World, x: number, y: number, vx: number, vy: number): Entity {
  const e = world.create();
  world.add(e, new Transform(x, y, Math.atan2(vy, vx)));
  world.add(e, new Velocity(vx, vy));
  world.add(e, new Lifetime(3));
  const sprite = new Sprite(world.resource(Art).enemyBolt);
  sprite.anchor.set(0.5);
  mountView(world, e, sprite, Layer.Entities);
  return e;
}
```

---

## The spawner: waves as data

The spawner is where "level design" lives, and it should be **data**, not code
buried in a system. A wave is a timeline of entries — *at this many seconds,
spawn this kind at this height*. Add to **`src/game/resources.ts`**:

```ts
// src/game/resources.ts (add)
import type { EnemyKind } from "./components";

export interface WaveEntry {
  at: number;      // seconds from level start
  kind: EnemyKind;
  y: number;       // 0..1 fraction of playfield height (resolution-independent)
}

/** Resource: a sorted timeline that emits entries as its clock passes them. */
export class Spawner {
  clock = 0;
  private index = 0;
  constructor(public timeline: WaveEntry[]) {}

  /** Entries whose time has arrived since the last call. */
  due(dt: number): WaveEntry[] {
    this.clock += dt;
    const out: WaveEntry[] = [];
    while (this.index < this.timeline.length && this.timeline[this.index].at <= this.clock) {
      out.push(this.timeline[this.index++]);
    }
    return out;
  }

  get finished(): boolean { return this.index >= this.timeline.length; }
}
```

The system just turns due entries into enemies at the right edge. Create
**`src/game/systems/spawner.ts`**:

```ts
// src/game/systems/spawner.ts
import type { World } from "../../engine/world";
import { Spawner, Bounds } from "../resources";
import { spawnEnemy } from "../factory";

export function spawnerSystem(world: World, dt: number): void {
  const spawner = world.resource(Spawner);
  const bounds = world.resource(Bounds);
  for (const entry of spawner.due(dt)) {
    spawnEnemy(world, entry.kind, bounds.width + 40, entry.y * bounds.height);
  }
}
```

Spawning at `x = bounds.width + 40` (just past the right edge) is why the cull box
in chapter 07 extends to `width + 500` — enemies need room to exist before they
fly on-screen.

### A first level — `main.ts`

Author a timeline. Formations are just entries that share an `at` with staggered
`y`s. A tiny helper keeps it readable:

```ts
// src/main.ts (add)
import { Spawner, type WaveEntry } from "./game/resources";
import type { EnemyKind } from "./game/components";

// a vertical column of `n` enemies of one kind at time `at`
const column = (at: number, kind: EnemyKind, n: number): WaveEntry[] =>
  Array.from({ length: n }, (_, i) => ({ at, kind, y: 0.2 + (0.6 * i) / (n - 1 || 1) }));

const level1: WaveEntry[] = [
  { at: 1.0, kind: "straight", y: 0.4 },
  { at: 1.6, kind: "straight", y: 0.6 },
  ...column(3.0, "straight", 4),
  { at: 5.0, kind: "homing", y: 0.5 },
  ...column(7.0, "shooter", 2),
  { at: 9.0, kind: "homing", y: 0.3 },
  { at: 9.4, kind: "homing", y: 0.7 },
  ...column(11.0, "straight", 5),
];

world.setResource(new Spawner(level1));
```

And slot the three systems into the schedule — spawner first, then AI, all
**before** movement (so shooters fire from their current spot and homers steer
before they're moved):

```ts
const schedule = new Schedule()
  .add(playerControlSystem)
  .add(weaponSystem)
  .add(spawnerSystem)        // ← emit due waves
  .add(shooterSystem)        // ← enemy guns
  .add(homingSystem)         // ← enemy steering (before movement!)
  .add(movementSystem)
  .add(spinSystem)
  .add(lifetimeSystem)
  .add(cullOffscreenSystem)
  .add(starfieldSystem)
  .add(renderSystem);
```

Run it: purple ships stream straight in, orange ones bend toward you, red ones
edge forward spitting bolts at your position. You can fly and shoot *through* them
— nothing collides yet. That's the next chapter.

> **Endless mode.** When `spawner.finished`, you can loop back to procedural
> spawns — pick a random `kind` and `y` every `0.8 s`, tightening the interval as
> a difficulty resource climbs. Chapter 12 gates that behind level state and caps
> it with a boss.

---

## Checkpoint

- [x] `Enemy`, `Homing`, `Shooter` components; `spawnEnemy`/`spawnEnemyBolt`
      factories.
- [x] `homingSystem` (curves toward the player) and `shooterSystem` (aimed bolts)
      run before movement.
- [x] A data-driven `Spawner` flies a scripted level 1 in from the right.

Everything's on screen and moving with intent. Time to make contact *matter*.

*Next → [Chapter 10: Collisions & combat](10-collisions-and-combat.md)*
