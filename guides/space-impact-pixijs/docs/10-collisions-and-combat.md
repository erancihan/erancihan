# 10 · Collisions & combat 🛠️

> **You'll leave this chapter with:** collision **layers & masks** so the right
> things hit the right things, a **uniform-grid broad phase** so we don't test
> every pair against every pair, and the combat payoff — damage, hit-flash,
> explosions, score, enemy death and a first pass at player death.

This is where the deferred-destroy design from chapter 04 earns its keep.

---

## Layers & masks: who can hit whom

Not every collider cares about every other. Player bolts hit enemies but not the
player; enemy bolts hit the player but not each other. We encode that with two bit
masks per collider:

- **`layer`** — *what I am* (one bit).
- **`mask`** — *what I collide with* (a set of bits).

Two colliders interact only if at least one wants the other:
`(a.mask & b.layer) || (b.mask & a.layer)`. Add the layer table and the combat
components to **`src/game/components.ts`**:

```ts
// src/game/components.ts (add)

/** Collision layer bits. A collider has one `layer` and a `mask` of layers it hits. */
export const CollisionLayer = {
  Player:       1 << 0,
  Enemy:        1 << 1,
  PlayerBullet: 1 << 2,
  EnemyBullet:  1 << 3,
  Pickup:       1 << 4,
} as const;

/** A circular hitbox on a layer, colliding with everything in `mask`. */
export class Collider {
  constructor(
    public radius: number,
    public layer: number,
    public mask: number,
  ) {}
}

/** Hit points, plus a short `flash` timer used for the on-hit blink. */
export class Health {
  constructor(public hp: number, public max = hp, public flash = 0) {}
}

/** Marks a projectile that deals `damage` and is consumed on impact. */
export class Bullet {
  constructor(public damage = 1) {}
}
```

The mask design makes the resolution code trivial later, because **only sensible
pairs ever reach it**:

| Entity | `layer` | `mask` (hits…) |
| --- | --- | --- |
| Player | `Player` | `Enemy \| EnemyBullet \| Pickup` |
| Enemy | `Enemy` | `Player \| PlayerBullet` |
| Player bolt | `PlayerBullet` | `Enemy` |
| Enemy bolt | `EnemyBullet` | `Player` |
| Pickup | `Pickup` | `Player` |

Work a couple through: a player bolt (`mask = Enemy`) and an enemy (`layer =
Enemy`) match. A player bolt and the *player* (`layer = Player`) share no bits —
no friendly fire. Two enemies never collide. The filter does the thinking.

---

## Give the factories colliders & health

Go back to the factories from chapters 08–09 and add the pieces. Update
**`src/game/factory.ts`**:

```ts
// in spawnPlayer(...), before returning:
world.add(e, new Collider(13, CollisionLayer.Player,
  CollisionLayer.Enemy | CollisionLayer.EnemyBullet | CollisionLayer.Pickup));
world.add(e, new Health(5));

// in spawnEnemy(...), before returning:
const radius = kind === "straight" ? 13 : 14;
const hp = kind === "shooter" ? 2 : kind === "homing" ? 2 : 1;
world.add(e, new Collider(radius, CollisionLayer.Enemy,
  CollisionLayer.Player | CollisionLayer.PlayerBullet));
world.add(e, new Health(hp));

// in spawnPlayerBolt(...), before returning:
world.add(e, new Bullet(1));
world.add(e, new Collider(5, CollisionLayer.PlayerBullet, CollisionLayer.Enemy));

// in spawnEnemyBolt(...), before returning:
world.add(e, new Bullet(1));
world.add(e, new Collider(5, CollisionLayer.EnemyBullet, CollisionLayer.Player));
```

Remember to import `Collider`, `Health`, `Bullet` and `CollisionLayer` at the top
of `factory.ts`. Bullets get a `Collider` but **no `Health`** — they're consumed
on impact by the resolver, not damaged.

---

## The broad phase: a uniform grid

The naive collision check is "every collider against every other" — O(n²). At a few
hundred entities that's survivable, but it's the wrong habit and it spikes when the
screen's busy. The standard fix is a **broad phase**: bin colliders into a grid of
cells, then only test colliders that share a cell or a neighbouring one. Two things
can only touch if they're within one cell of each other — provided the cell is at
least as big as the largest possible hit distance.

Create **`src/game/systems/collision.ts`**:

```ts
// src/game/systems/collision.ts
import type { World } from "../../engine/world";
import type { Entity } from "../../engine/entity";
import { Transform, Collider, Health, Bullet, Player, Enemy } from "../components";
import { Score } from "../resources";
import { circlesOverlap } from "../../engine/math";
import { spawnExplosion } from "../factory";

const CELL = 72;   // must exceed the largest center-to-center hit distance (boss vs player ≈ 54)

export function collisionSystem(world: World): void {
  const colliders = world.query(Collider, Transform);
  const cellKey = (x: number, y: number) => `${Math.floor(x / CELL)},${Math.floor(y / CELL)}`;

  // 1. bin every collider into its cell
  const cells = new Map<string, Entity[]>();
  for (const e of colliders) {
    const t = world.get(e, Transform)!;
    const key = cellKey(t.x, t.y);
    let bucket = cells.get(key);
    if (!bucket) cells.set(key, (bucket = []));
    bucket.push(e);
  }

  // 2. test each collider against its cell + 8 neighbours
  for (const e of colliders) {
    const t = world.get(e, Transform)!;
    const c = world.get(e, Collider)!;
    const cx = Math.floor(t.x / CELL);
    const cy = Math.floor(t.y / CELL);

    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        const bucket = cells.get(`${cx + ox},${cy + oy}`);
        if (!bucket) continue;
        for (const other of bucket) {
          if (other <= e) continue;               // each unordered pair once; skips self
          const oc = world.get(other, Collider)!;
          const canHit = (c.mask & oc.layer) !== 0 || (oc.mask & c.layer) !== 0;
          if (!canHit) continue;
          const ot = world.get(other, Transform)!;
          if (circlesOverlap(t.x, t.y, c.radius, ot.x, ot.y, oc.radius)) {
            resolveCollision(world, e, other);
          }
        }
      }
    }
  }
}
```

The `other <= e` guard is the trick that checks each pair exactly once: since an
entity lives in only one cell, the pair `(e, other)` is discovered once (when the
higher id scans the lower id's neighbourhood), and the id comparison skips the
mirror.

> **Why `CELL = 72`?** A hit needs the centers within `r₁ + r₂`. Our biggest sum
> is the boss (~40) versus the player (~13) ≈ 54, comfortably under 72. If you add
> a bigger collider, bump `CELL` to stay above the largest sum, or the 3×3
> neighbourhood could miss a real overlap.

---

## Resolving a collision

Because the mask filter guarantees only meaningful pairs arrive, resolution is a
short dispatch. Same file:

```ts
// src/game/systems/collision.ts (continued)

function resolveCollision(world: World, a: Entity, b: Entity): void {
  // bullet + something with health (mask already ensured it's a valid target)
  const aBullet = world.get(a, Bullet);
  const bBullet = world.get(b, Bullet);
  if (aBullet && world.has(b, Health)) { damage(world, b, aBullet.damage); world.destroy(a); return; }
  if (bBullet && world.has(a, Health)) { damage(world, a, bBullet.damage); world.destroy(b); return; }

  // body contact: player ↔ enemy (neither is a bullet)
  const player = world.has(a, Player) ? a : world.has(b, Player) ? b : 0;
  const enemy  = world.has(a, Enemy)  ? a : world.has(b, Enemy)  ? b : 0;
  if (player && enemy) {
    damage(world, player, 1);                      // contact chips the player...
    damage(world, enemy, 2);                        // ...and rams the enemy (kills the weak, dents a boss)
  }
}

/** Apply damage, honouring player invulnerability, and trigger death at 0 hp. */
function damage(world: World, e: Entity, amount: number): void {
  const health = world.get(e, Health);
  if (!health) return;

  const player = world.get(e, Player);
  if (player && player.invuln > 0) return;         // i-frames: no damage

  health.hp -= amount;
  health.flash = 0.08;                             // blink (see flashSystem)
  if (health.hp <= 0) killEntity(world, e);
}

function killEntity(world: World, e: Entity): void {
  const t = world.get(e, Transform)!;

  const enemy = world.get(e, Enemy);
  if (enemy) {
    spawnExplosion(world, t.x, t.y, 12);
    world.resource(Score).value += scoreFor(enemy.kind);
    world.destroy(e);
    return;
  }

  if (world.has(e, Player)) {
    onPlayerDeath(world, e);
    return;
  }

  world.destroy(e);
}

function scoreFor(kind: string): number {
  return kind === "shooter" ? 150 : kind === "homing" ? 120 : 80;
}
```

Notice how much the mask pre-filter bought us: no "is this my own bullet?" checks,
no enemy-on-enemy guards. The data model made the resolver honest.

---

## Player death & respawn (first pass)

When the player's hp hits zero, spend a life and respawn with a couple of seconds
of invulnerability; when lives run out, the player is gone. Same file:

```ts
// src/game/systems/collision.ts (continued)
import { Bounds } from "../resources";

function onPlayerDeath(world: World, e: Entity): void {
  const player = world.get(e, Player)!;
  const health = world.get(e, Health)!;
  const t = world.get(e, Transform)!;

  spawnExplosion(world, t.x, t.y, 20);
  player.lives -= 1;

  if (player.lives <= 0) {
    world.destroy(e);              // chapter 12 turns this into a Game Over screen
    return;
  }

  // respawn: recenter, refill, i-frames
  t.x = 120;
  t.y = world.resource(Bounds).height / 2;
  health.hp = health.max;
  player.invuln = 2;
}
```

This is deliberately a *first pass* — chapter 11 adds the invulnerability **blink**
so respawn reads clearly, and chapter 12 replaces the silent `destroy` with a real
Game Over state. It's enough to make the loop playable right now.

---

## The hit-flash system

A hit needs to *read*. The cheapest honest feedback is a one-frame alpha blink
driven by the `Health.flash` timer we set in `damage`. Create
**`src/game/systems/flash.ts`**:

```ts
// src/game/systems/flash.ts
import type { World } from "../../engine/world";
import { Health, Renderable } from "../components";

export function flashSystem(world: World, dt: number): void {
  for (const e of world.query(Health, Renderable)) {
    const health = world.get(e, Health)!;
    const { view } = world.get(e, Renderable)!;
    if (health.flash > 0) {
      health.flash -= dt;
      view.alpha = 0.4;      // dip while flashing
    } else {
      view.alpha = 1;
    }
  }
}
```

> **Want a *white* flash?** Alpha can only dip, not brighten. For a bright hit
> flash, overlay a white-tinted copy for a few frames or use a short-lived
> `ColorMatrixFilter`; both cost more than the blink. Chapter 13 lists the
> upgrade. The alpha dip is the 90%-good, 1%-cost version.

---

## Wire it up

Add the systems to the schedule — collision *after* everything has moved this
step, flash last before render — and register the `Score` resource in `main.ts`:

```ts
import { Score } from "./game/resources";
import { collisionSystem } from "./game/systems/collision";
import { flashSystem } from "./game/systems/flash";

world.setResource(new Score());

const schedule = new Schedule()
  .add(playerControlSystem)
  .add(weaponSystem)
  .add(spawnerSystem)
  .add(shooterSystem)
  .add(homingSystem)
  .add(movementSystem)      // everything reaches its new position...
  .add(spinSystem)
  .add(collisionSystem)     // ...then we test overlaps and resolve them
  .add(flashSystem)
  .add(lifetimeSystem)
  .add(cullOffscreenSystem)
  .add(starfieldSystem)
  .add(renderSystem);
```

Run it. Bolts now punch through enemies in bursts of sparks, ramming a ship costs
you a life and warps you back to the left with a blink of invulnerability, and a
score is quietly accumulating in a resource. You can't *see* the score yet —
that's the HUD, next chapter, along with power-ups that make the fight winnable and
a boss to end on.

---

## Checkpoint

- [x] `Collider`, `Health`, `Bullet`, `CollisionLayer`; factories updated.
- [x] A uniform-grid `collisionSystem` tests only near pairs and resolves via the
      mask-filtered dispatcher.
- [x] Enemies explode and score; the player loses lives, respawns with i-frames,
      and flashes on hit.

*Next → [Chapter 11: Power-ups, weapons & lives](11-powerups-weapons-and-lives.md)*
