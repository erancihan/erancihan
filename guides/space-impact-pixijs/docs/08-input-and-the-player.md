# 08 · Input & the player 🛠️

> **You'll leave this chapter with:** a keyboard (and optional pointer) abstracted
> into an `Input` resource of *intents*, a `Player` entity that flies inside the
> playfield, and a `Weapon` that fires bolts on a cooldown — the first genuinely
> playable slice.

---

## Input as intent, not keys

Systems should never ask "is the `W` key down?" — they should ask "does the player
want to go up?". That indirection lets you rebind keys, add a gamepad, or drive
the ship from a replay without touching a single system. So the `Input` resource
exposes **intents** (`axisX`, `axisY`, `firing`), and the raw key tracking hides
behind them.

Add to **`src/game/resources.ts`**:

```ts
// src/game/resources.ts (add)

/** Resource: the current frame's input, exposed as game intents. */
export class Input {
  private keys = new Set<string>();      // KeyboardEvent.code values (layout-independent)

  press(code: string): void { this.keys.add(code); }
  release(code: string): void { this.keys.delete(code); }
  clear(): void { this.keys.clear(); }   // e.g. on window blur, so keys don't "stick"

  private any(...codes: string[]): boolean {
    return codes.some((c) => this.keys.has(c));
  }

  /** -1 (left) … +1 (right) */
  get axisX(): number {
    return (this.any("ArrowRight", "KeyD") ? 1 : 0) - (this.any("ArrowLeft", "KeyA") ? 1 : 0);
  }
  /** -1 (up) … +1 (down) — remember screen-y is down (chapter 03) */
  get axisY(): number {
    return (this.any("ArrowDown", "KeyS") ? 1 : 0) - (this.any("ArrowUp", "KeyW") ? 1 : 0);
  }
  get firing(): boolean {
    return this.any("Space", "KeyJ");
  }
}
```

We key on `KeyboardEvent.code` (physical key, so `KeyW` works on any layout), and
support both WASD and arrows out of the box.

### Wiring the listeners — `main.ts`

The DOM is the only place that knows about actual key events; it translates them
into the resource and nothing else touches `window`:

```ts
// src/main.ts (add)
import { Input } from "./game/resources";

const input = world.setResource(new Input());

window.addEventListener("keydown", (e) => {
  input.press(e.code);
  // stop Space/arrows from scrolling the page
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
    e.preventDefault();
  }
});
window.addEventListener("keyup", (e) => input.release(e.code));
window.addEventListener("blur", () => input.clear());   // alt-tab shouldn't leave keys held
```

The `blur` handler matters: without it, alt-tabbing while holding *right* leaves
the ship sliding into the wall forever, because the `keyup` fires on a window you
no longer have focus on.

---

## The `Player` and `Weapon` components

Add to **`src/game/components.ts`**:

```ts
// src/game/components.ts (add)

/** Tag + tunables for the player-controlled ship. */
export class Player {
  constructor(
    public speed = 300,     // px/sec
    public lives = 3,
    public invuln = 0,      // seconds of post-respawn invulnerability (chapters 10–11)
  ) {}
}

export type WeaponKind = "single" | "double" | "spread";

/** A cooldown-gated gun. `kind` decides the bullet pattern (chapter 11 extends it). */
export class Weapon {
  constructor(
    public kind: WeaponKind = "single",
    public cooldown = 0.16, // seconds between shots
    public timer = 0,       // counts down to 0, then a shot is allowed
  ) {}
}
```

---

## The player control system

The player is the one entity we move **directly** and **clamp immediately**, so it
can never leave the screen or tunnel through the wall on a fast frame. It doesn't
carry `Velocity` — it doesn't need `movementSystem`. Create
**`src/game/systems/player.ts`**:

```ts
// src/game/systems/player.ts
import type { World } from "../../engine/world";
import { Player, Transform } from "../components";
import { Input, Bounds } from "../resources";
import { clamp } from "../../engine/math";

export function playerControlSystem(world: World, dt: number): void {
  const input = world.resource(Input);
  const bounds = world.resource(Bounds);

  for (const e of world.query(Player, Transform)) {
    const p = world.get(e, Player)!;
    const t = world.get(e, Transform)!;

    // normalise the input vector so diagonals aren't √2 faster than straight
    let ax = input.axisX;
    let ay = input.axisY;
    const len = Math.hypot(ax, ay);
    if (len > 0) { ax /= len; ay /= len; }

    // integrate + clamp in one step: the ship stays inside a 16px inset margin
    t.x = clamp(t.x + ax * p.speed * dt, 16, bounds.width - 16);
    t.y = clamp(t.y + ay * p.speed * dt, 16, bounds.height - 16);

    if (p.invuln > 0) p.invuln -= dt;   // tick down respawn invulnerability
  }
}
```

---

## Firing: the weapon system + bolt factory

The weapon system counts the cooldown down every step and, when the player is
firing and the timer's ready, spawns a bolt and resets the timer. Only entities
with **both** `Player` and `Weapon` fire from input — enemy guns are a different
component (chapter 09). Create **`src/game/systems/weapon.ts`**:

```ts
// src/game/systems/weapon.ts
import type { World } from "../../engine/world";
import { Player, Weapon, Transform } from "../components";
import { Input } from "../resources";
import { fireWeapon } from "../factory";

export function weaponSystem(world: World, dt: number): void {
  const input = world.resource(Input);
  for (const e of world.query(Player, Weapon, Transform)) {
    const weapon = world.get(e, Weapon)!;
    weapon.timer -= dt;
    if (input.firing && weapon.timer <= 0) {
      const t = world.get(e, Transform)!;
      fireWeapon(world, weapon, t.x, t.y);
      weapon.timer = weapon.cooldown;
    }
  }
}
```

The bolt and pattern factories go in **`src/game/factory.ts`**:

```ts
// src/game/factory.ts (add)
import { Sprite } from "pixi.js";
import type { Entity } from "../engine/entity";
import { Transform, Velocity, Lifetime, Player, Weapon, type WeaponKind } from "./components";
import { Art, Layer } from "./resources";
import { makePlayerShip } from "./art";

/** One player bolt travelling at (vx, vy). Chapter 10 adds Bullet + Collider. */
export function spawnPlayerBolt(world: World, x: number, y: number, vx = 900, vy = 0): Entity {
  const e = world.create();
  world.add(e, new Transform(x, y, Math.atan2(vy, vx)));
  world.add(e, new Velocity(vx, vy));
  world.add(e, new Lifetime(2));
  const sprite = new Sprite(world.resource(Art).playerBolt);
  sprite.anchor.set(0.5);
  mountView(world, e, sprite, Layer.Entities);
  return e;
}

/** Translate a Weapon's kind into a bullet pattern, fired from the ship's nose. */
export function fireWeapon(world: World, weapon: Weapon, x: number, y: number): void {
  const nose = x + 18;   // spawn just ahead of the ship
  switch (weapon.kind) {
    case "double":
      spawnPlayerBolt(world, nose, y - 7);
      spawnPlayerBolt(world, nose, y + 7);
      break;
    case "spread":       // chapter 11 fills in the angled bolts
      spawnPlayerBolt(world, nose, y, 880, -220);
      spawnPlayerBolt(world, nose, y, 900, 0);
      spawnPlayerBolt(world, nose, y, 880, 220);
      break;
    case "single":
    default:
      spawnPlayerBolt(world, nose, y);
  }
}

/** The player entity. Chapter 10 adds its Collider + Health. */
export function spawnPlayer(world: World, x: number, y: number): Entity {
  const e = world.create();
  world.add(e, new Transform(x, y));
  world.add(e, new Player(300, 3));
  world.add(e, new Weapon("single", 0.16));
  mountView(world, e, makePlayerShip(), Layer.Entities);
  return e;
}
```

> **Why parameterise the bolt velocity?** So the *same* factory serves the
> straight single shot and the angled spread — the `spread` case just passes
> `(vx, vy)` pairs. Adding a weapon later is one more `case`, not one more factory.

---

## Slot it into the loop

In `main.ts`, spawn the player and add the two systems at the **front** of the
schedule — control before firing (so bolts leave the ship's current position), and
both before movement:

```ts
// src/main.ts
import { playerControlSystem } from "./game/systems/player";
import { weaponSystem } from "./game/systems/weapon";
import { spawnPlayer } from "./game/factory";

spawnPlayer(world, 120, app.screen.height / 2);

const schedule = new Schedule()
  .add(playerControlSystem)      // ← read intent, move + clamp the ship
  .add(weaponSystem)             // ← fire bolts on cooldown
  // ...spawner / enemyAi land here in chapter 09...
  .add(movementSystem)
  .add(spinSystem)
  .add(lifetimeSystem)
  .add(cullOffscreenSystem)
  .add(starfieldSystem)
  .add(renderSystem);
```

Run it. You fly with WASD/arrows, held inside the window, and **Space** streams
cyan bolts to the right that fade out after two seconds or when they exit the
screen. It's not a game yet — nothing to shoot — but the control loop is real, and
every piece of it is a system reading a component.

---

## Optional: pointer & touch

To support mouse/touch, track the pointer in canvas space and add a "seek" intent.
PixiJS gives you canvas-space coordinates through the stage's event system:

```ts
// main.ts — optional
app.stage.eventMode = "static";
app.stage.hitArea = app.screen;         // receive events anywhere on the canvas
app.stage.on("pointermove", (e) => {
  input.pointer = { x: e.global.x, y: e.global.y };   // add `pointer` to Input
});
app.stage.on("pointerdown", () => (input.pointerFiring = true));
app.stage.on("pointerup", () => (input.pointerFiring = false));
```

Then in `playerControlSystem`, if `input.pointer` is set, steer toward it instead
of reading the axes (move by `clamp(target - pos, -speed·dt, speed·dt)` on each
axis). Keyboard stays the primary scheme for this guide; the pointer path is a
handful of lines you can bolt on because input is already an abstraction.

---

## Checkpoint

- [x] `Input` exposes `axisX`/`axisY`/`firing`; `main.ts` feeds it from the DOM
      and clears on blur.
- [x] `spawnPlayer` creates a ship you fly, clamped to the playfield.
- [x] Holding fire streams bolts on a cooldown; they expire and cull correctly.

Now we give you something to shoot: waves of enemies with three distinct
behaviours.

*Next → [Chapter 09: Enemies, waves & AI](09-enemies-waves-and-ai.md)*
