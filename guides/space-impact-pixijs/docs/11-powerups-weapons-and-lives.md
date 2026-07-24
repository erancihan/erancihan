# 11 · Power-ups, weapons & lives 🛠️

> **You'll leave this chapter with:** pickups that drift in and change your ship —
> a **spread gun**, a one-hit **shield**, an **extra life** — dropped by dying
> enemies, plus the polish that makes respawn read: an invulnerability **blink**.
> This is the chapter that turns a survivable loop into a *game*.

Everything here is pure addition — new components, new factories, three small edits
to chapter 10's collision file. No rewrites.

---

## New components

Add to **`src/game/components.ts`**:

```ts
// src/game/components.ts (add)

export type PickupKind = "spread" | "shield" | "life";

/** A collectible that changes the player on contact. */
export class Pickup {
  constructor(public kind: PickupKind) {}
}

/** Sine-drift on the y-axis around a baseline — makes pickups float. */
export class Bob {
  constructor(
    public amplitude = 10,
    public speed = 3,
    public baseY = 0,
    public phase = 0,
  ) {}
}

/** Absorbs `hits` incoming hits before the player takes damage. */
export class Shield {
  constructor(public hits = 1) {}
}
```

---

## Spawning & collecting pickups

Pickups are ordinary entities: they drift left (`Velocity`), bob (`Bob`), spin
(`Spin`) for flair, and carry a `Pickup` marker plus a `Collider` on the `Pickup`
layer. Add to **`src/game/factory.ts`**:

```ts
// src/game/factory.ts (add)
import { Graphics } from "pixi.js";
import {
  Transform, Velocity, Spin, Bob, Pickup, Shield, Weapon, Player, Renderable,
  Collider, CollisionLayer, type PickupKind,
} from "./components";
import { makePickup } from "./art";

const PICKUP_COLOUR: Record<PickupKind, number> = {
  spread: 0x66ff99,
  shield: 0x66ccff,
  life:   0xffcc44,
};

export function spawnPickup(world: World, kind: PickupKind, x: number, y: number): Entity {
  const e = world.create();
  world.add(e, new Transform(x, y));
  world.add(e, new Velocity(-120, 0));       // drift left, slower than the scroll
  world.add(e, new Bob(10, 3, y, Math.random() * Math.PI * 2));
  world.add(e, new Spin(1.5));
  world.add(e, new Pickup(kind));
  world.add(e, new Collider(14, CollisionLayer.Pickup, CollisionLayer.Player));
  mountView(world, e, makePickup(PICKUP_COLOUR[kind]), Layer.Entities);
  return e;
}

/** Enemies drop a pickup on death, sometimes. `life` is deliberately rare. */
const DROP_TABLE: PickupKind[] = ["spread", "spread", "shield", "shield", "life"];
export function maybeDropPickup(world: World, x: number, y: number): void {
  if (Math.random() > 0.14) return;          // ~14% of kills drop something
  const kind = DROP_TABLE[Math.floor(Math.random() * DROP_TABLE.length)];
  spawnPickup(world, kind, x, y);
}
```

The bob is one tiny system. Create **`src/game/systems/pickup.ts`**:

```ts
// src/game/systems/pickup.ts
import type { World } from "../../engine/world";
import { Bob, Transform, Player, Renderable } from "../components";
import { findPlayer } from "../factory";

/** Float bobbing entities around their baseline y. */
export function bobSystem(world: World, dt: number): void {
  for (const e of world.query(Bob, Transform)) {
    const b = world.get(e, Bob)!;
    const t = world.get(e, Transform)!;
    b.phase += b.speed * dt;
    t.y = b.baseY + Math.sin(b.phase) * b.amplitude;
  }
}

/** Strobe the player's alpha while post-respawn invulnerability is active. */
export function invulnBlinkSystem(world: World): void {
  const player = findPlayer(world);
  if (player === 0) return;
  const p = world.get(player, Player)!;
  const r = world.get(player, Renderable)!;
  if (p.invuln > 0) {
    r.view.alpha = Math.floor(p.invuln * 12) % 2 === 0 ? 0.3 : 0.9;
  }
}
```

`invulnBlinkSystem` runs *after* `flashSystem` (which otherwise pins the player's
alpha to 1), so its strobe wins while i-frames last and cleanly hands control back
the moment `invuln` hits zero.

---

## Applying a pickup

Now the effect. `spread` upgrades the `Weapon` (whose `spread` case chapter 08
already wrote); `shield` grants or stacks a `Shield` and draws a ring on the ship;
`life` bumps the counter. Add to **`src/game/factory.ts`**:

```ts
// src/game/factory.ts (add)

export function applyPickup(world: World, player: Entity, pickup: Entity): void {
  const kind = world.get(pickup, Pickup)!.kind;
  switch (kind) {
    case "spread": {
      const weapon = world.get(player, Weapon);
      if (weapon) { weapon.kind = "spread"; weapon.cooldown = 0.2; }
      break;
    }
    case "shield": {
      const existing = world.get(player, Shield);
      if (existing) {
        existing.hits += 1;
      } else {
        world.add(player, new Shield(1));
        attachShieldVisual(world, player);
      }
      break;
    }
    case "life": {
      const p = world.get(player, Player);
      if (p) p.lives += 1;
      break;
    }
  }
  world.destroy(pickup);
}

/** A translucent ring parented to the ship's view; removed when the shield breaks. */
function attachShieldVisual(world: World, player: Entity): void {
  const r = world.get(player, Renderable);
  if (!r) return;
  const ring = new Graphics().circle(0, 0, 22).stroke({ width: 2, color: 0x66ccff, alpha: 0.85 });
  ring.label = "shield";
  r.view.addChild(ring);
}

export function detachShieldVisual(world: World, player: Entity): void {
  const view = world.get(player, Renderable)?.view;
  const ring = view?.getChildByLabel?.("shield");
  if (ring) { view!.removeChild(ring); ring.destroy(); }
}
```

The shield ring is a **child of the player's view** — so it inherits the ship's
`Transform` for free through PixiJS's transform tree (chapter 02). No extra entity,
no sync code; the scene graph does the parenting we actually *want* here.

---

## Three edits to chapter 10's collision file

Pickups and shields plug into the resolver you already wrote. Open
**`src/game/systems/collision.ts`** and make three small changes.

**1. Re-add the pickup import and `applyPickup`/`detachShieldVisual`:**

```ts
import { Transform, Collider, Health, Bullet, Player, Enemy, Pickup, Shield } from "../components";
import { spawnExplosion, applyPickup, detachShieldVisual } from "../factory";
```

**2. Add a pickup branch at the top of `resolveCollision`:**

```ts
function resolveCollision(world: World, a: Entity, b: Entity): void {
  // pickup + player (mask guarantees the other side is the player)
  if (world.has(a, Pickup) || world.has(b, Pickup)) {
    const pickup = world.has(a, Pickup) ? a : b;
    const player = pickup === a ? b : a;
    applyPickup(world, player, pickup);
    return;
  }
  // ...bullet and body-contact branches from chapter 10 follow unchanged...
```

**3. Let a `Shield` eat a hit before `Health` does, inside `damage`:**

```ts
function damage(world: World, e: Entity, amount: number): void {
  const health = world.get(e, Health);
  if (!health) return;

  const player = world.get(e, Player);
  if (player && player.invuln > 0) return;          // i-frames

  const shield = world.get(e, Shield);              // ← new: shield absorbs one hit
  if (shield) {
    shield.hits -= 1;
    health.flash = 0.08;
    if (shield.hits <= 0) {
      world.remove(e, Shield);
      detachShieldVisual(world, e);
    }
    return;
  }

  health.hp -= amount;
  health.flash = 0.08;
  if (health.hp <= 0) killEntity(world, e);
}
```

**4. Drop a pickup when an enemy dies** — one line in `killEntity`'s enemy branch:

```ts
  if (enemy) {
    spawnExplosion(world, t.x, t.y, 12);
    world.resource(Score).value += scoreFor(enemy.kind);
    maybeDropPickup(world, t.x, t.y);               // ← new
    world.destroy(e);
    return;
  }
```

(Add `maybeDropPickup` to the `factory` import.) That's every touch-point — the
combat core didn't need reshaping, only extending.

---

## Optional: reset the weapon on death

Arcade convention is that dying costs your upgrades. If you want that, add one line
to `onPlayerDeath` (chapter 10), in the respawn branch:

```ts
  const weapon = world.get(e, Weapon);
  if (weapon) { weapon.kind = "single"; weapon.cooldown = 0.16; }
```

Leave it out and upgrades persist across lives — gentler, and fine for a learning
build. Your call; it's one line either way.

---

## Wire the new systems

In `main.ts`, add `bobSystem` after movement and `invulnBlinkSystem` after
`flashSystem`:

```ts
const schedule = new Schedule()
  .add(playerControlSystem)
  .add(weaponSystem)
  .add(spawnerSystem)
  .add(shooterSystem)
  .add(homingSystem)
  .add(movementSystem)
  .add(spinSystem)
  .add(bobSystem)            // ← float the pickups
  .add(collisionSystem)
  .add(flashSystem)
  .add(invulnBlinkSystem)    // ← strobe the player during i-frames (after flash)
  .add(lifetimeSystem)
  .add(cullOffscreenSystem)
  .add(starfieldSystem)
  .add(renderSystem);
```

Run it. Kill enough enemies and a glowing capsule floats out; grab the green one
and your single shot fans into a three-way spread; grab the blue one and a ring
snaps around your hull that soaks the next hit; the gold one quietly adds a life.
Respawn now blinks so you can see your i-frames tick down. It plays like a game —
the only things missing are a scoreboard to see it and a climax to reach.

---

## Checkpoint

- [x] `Pickup`, `Bob`, `Shield` components; `spawnPickup`/`maybeDropPickup`/
      `applyPickup` factories; `bobSystem`/`invulnBlinkSystem`.
- [x] Enemies drop pickups; spread/shield/life all work; the shield ring parents to
      the ship and breaks after one hit.
- [x] Respawn i-frames strobe the player.

Last stop: make it all *legible* — a HUD, a title/game-over/level-clear state
machine, and a boss to end level 1 on.

*Next → [Chapter 12: HUD & game states](12-hud-and-game-states.md)*
