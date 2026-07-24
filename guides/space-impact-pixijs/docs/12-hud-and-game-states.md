# 12 · HUD & game states 🛠️

> **You'll leave this chapter with:** a **HUD** (score, ships, hull bar) living in a
> UI layer *outside* world space, a **state machine** (title → playing → game-over
> / level-clear) that gates the loop, and a **multi-phase boss** that ends level 1.
> This is the chapter that makes it feel finished.

---

## The HUD belongs outside the ECS

Score and lives aren't entities — there's no `Transform` that means "SCORE 1200",
and the HUD must *not* scroll with the world or sort against sprites. So the HUD is
a plain object that owns a `Container` in the `Ui` layer (which draws on top of
everything, chapter 05) and exposes setters. Create **`src/game/hud.ts`**:

```ts
// src/game/hud.ts
import { Container, Graphics, Text } from "pixi.js";

const BAR_W = 150;

export class Hud {
  readonly container = new Container();
  private score = new Text({ text: "SCORE 0",
    style: { fontFamily: "monospace", fontSize: 20, fill: 0xffffff, letterSpacing: 2 } });
  private ships = new Text({ text: "SHIPS 3",
    style: { fontFamily: "monospace", fontSize: 16, fill: 0xff6688, letterSpacing: 2 } });
  private hullBg = new Graphics();
  private hullFg = new Graphics();
  private message = new Text({ text: "",
    style: { fontFamily: "monospace", fontSize: 34, fill: 0xffffff, align: "center", lineHeight: 42 } });

  private width = 0;
  private lastScore = NaN;
  private lastShips = NaN;
  private lastHull = NaN;

  constructor(width: number, height: number) {
    this.score.position.set(16, 12);
    this.ships.position.set(16, 40);
    this.message.anchor.set(0.5);
    this.container.addChild(this.hullBg, this.hullFg, this.score, this.ships, this.message);
    this.resize(width, height);
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.message.position.set(width / 2, height / 2);
    this.hullBg.clear().roundRect(width - BAR_W - 16, 16, BAR_W, 12, 6).fill(0x1b2230);
    this.lastHull = NaN;                       // force the fg bar to redraw at the new x
  }

  // Each setter no-ops if the value hasn't changed — Text re-rasterizes on assign,
  // so we only pay for it when the number actually moves.
  setScore(v: number): void {
    if (v === this.lastScore) return;
    this.lastScore = v;
    this.score.text = `SCORE ${v}`;
  }
  setShips(n: number): void {
    if (n === this.lastShips) return;
    this.lastShips = n;
    this.ships.text = `SHIPS ${Math.max(0, n)}`;
  }
  setHull(frac: number): void {
    const clamped = Math.max(0, Math.min(1, frac));
    if (clamped === this.lastHull) return;
    this.lastHull = clamped;
    const colour = clamped > 0.5 ? 0x66dd88 : clamped > 0.25 ? 0xffcc44 : 0xff5566;
    this.hullFg.clear();
    if (clamped > 0) this.hullFg.roundRect(this.width - BAR_W - 16, 16, BAR_W * clamped, 12, 6).fill(colour);
  }

  showMessage(text: string): void { this.message.text = text; this.message.visible = true; }
  hideMessage(): void { this.message.visible = false; }
}
```

The "only redraw on change" guards matter: a `Text` re-rasterizes to a texture
whenever you assign `.text`, so a score you set every frame — even to the same
value — is wasted GPU work. Compare-then-set keeps the HUD nearly free.

The system that feeds it reads the `Score` resource and the player's `Health`.
Create **`src/game/systems/hud.ts`**:

```ts
// src/game/systems/hud.ts
import type { World } from "../../engine/world";
import { Player, Health } from "../components";
import { Score, GameState } from "../resources";
import { Hud } from "../hud";
import { findPlayer } from "../factory";

export function hudSystem(world: World): void {
  const hud = world.resource(Hud);
  hud.setScore(world.resource(Score).value);

  const player = findPlayer(world);
  if (player !== 0) {
    hud.setShips(world.get(player, Player)!.lives);
    const h = world.get(player, Health)!;
    hud.setHull(h.hp / h.max);
  }

  switch (world.resource(GameState).phase) {
    case "title":    hud.showMessage("SPACE  IMPACT\n\npress ENTER"); break;
    case "gameover": hud.showMessage("GAME  OVER\n\npress ENTER"); break;
    case "clear":    hud.showMessage("LEVEL  CLEAR\n\npress ENTER"); break;
    default:         hud.hideMessage();
  }
}
```

---

## The game state machine

A game is a tiny state machine, and we only need four states. Add to
**`src/game/resources.ts`**:

```ts
// src/game/resources.ts (add)
export type Phase = "title" | "playing" | "gameover" | "clear";

export class GameState {
  constructor(public phase: Phase = "title", public bossSpawned = false) {}
}
```

The **loop gates on `phase`**: it only steps the simulation while `playing`, and
freezes (still drawing the last frame + the overlay) otherwise. Transitions are
just assignments to `phase` — the death code sets `gameover`, the boss-death code
sets `clear`, and pressing **Enter** on any non-playing screen starts a fresh run.

### Two edits to chapter 10's `collision.ts`

**1. Game over when the last life is spent** — in `onPlayerDeath`, replace the
bare `destroy` with a state flip:

```ts
  if (player.lives <= 0) {
    world.resource(GameState).phase = "gameover";   // hudSystem shows the screen this step
    world.destroy(e);
    return;
  }
```

**2. Special-case the boss in `killEntity`** — a boss is worth more and *ends the
level*. Add this branch **before** the generic enemy branch:

```ts
  if (world.has(e, Boss)) {
    spawnExplosion(world, t.x, t.y, 40);
    world.resource(Score).value += 2000;
    world.resource(GameState).phase = "clear";
    world.destroy(e);
    return;
  }
```

Add `Boss` and `GameState` to `collision.ts`'s imports. Both transitions happen
*inside* a simulation step, so `hudSystem` (later in the same schedule) paints the
overlay before the loop notices `phase` left `playing`.

---

## The boss

The boss reuses almost everything: it's an `Enemy` (so bolts hurt it and it scores),
with a lot of `Health`, a big `Collider`, and a `Boss` component carrying its
pattern state. Add the component to **`src/game/components.ts`**:

```ts
// src/game/components.ts (add)
export class Boss {
  constructor(public clock = 0, public timer = 1.5, public phase = 0) {}
}
```

Its factory goes in **`src/game/factory.ts`**:

```ts
// src/game/factory.ts (add)
import { Boss } from "./components";
import { makeBoss } from "./art";

export function spawnBoss(world: World, x: number, y: number): Entity {
  const e = world.create();
  world.add(e, new Transform(x, y));
  world.add(e, new Enemy("shooter"));         // reuse enemy collision + scoring paths
  world.add(e, new Boss());
  world.add(e, new Velocity(-80, 0));          // slides in from the right, then hovers
  world.add(e, new Health(40));
  world.add(e, new Collider(40, CollisionLayer.Enemy, CollisionLayer.Player | CollisionLayer.PlayerBullet));
  mountView(world, e, makeBoss(), Layer.Entities);
  return e;
}
```

The boss system handles entrance, vertical patrol, and phase-based fire. It runs
**before** `movementSystem` so its velocity is integrated the same step. Create
**`src/game/systems/boss.ts`**:

```ts
// src/game/systems/boss.ts
import type { World } from "../../engine/world";
import { Boss, Health, Transform, Velocity, Enemy } from "../components";
import { Bounds, GameState, Spawner } from "../resources";
import { spawnEnemyBolt, spawnBoss } from "../factory";

export function bossSystem(world: World, dt: number): void {
  const bosses = world.query(Boss, Transform, Velocity, Health);
  if (bosses.length === 0) return;

  const e = bosses[0];
  const boss = world.get(e, Boss)!;
  const t = world.get(e, Transform)!;
  const v = world.get(e, Velocity)!;
  const health = world.get(e, Health)!;
  const hoverX = world.resource(Bounds).width - 120;

  if (t.x > hoverX) { v.x = -80; v.y = 0; return; }   // still entering

  // arrived: stop, patrol up/down, and flip to a denser pattern under half health
  v.x = 0;
  boss.clock += dt;
  v.y = Math.cos(boss.clock * 1.1) * 70;
  boss.phase = health.hp > health.max * 0.5 ? 0 : 1;

  boss.timer -= dt;
  if (boss.timer <= 0) {
    boss.timer = boss.phase === 0 ? 1.1 : 0.8;
    firePattern(world, t.x - 44, t.y, boss.phase);
  }
}

function firePattern(world: World, x: number, y: number, phase: number): void {
  if (phase === 0) {
    for (const s of [-0.22, 0, 0.22]) {                 // 3-way, slightly fanned
      spawnEnemyBolt(world, x, y, Math.cos(Math.PI + s) * 380, Math.sin(Math.PI + s) * 380);
    }
  } else {
    for (let i = 0; i < 7; i++) {                       // 7-way spray
      const a = Math.PI + (i - 3) * 0.24;
      spawnEnemyBolt(world, x, y, Math.cos(a) * 360, Math.sin(a) * 360);
    }
  }
}

/** Spawn the boss once the scripted waves are done and cleared. */
export function levelSystem(world: World): void {
  const state = world.resource(GameState);
  if (state.bossSpawned) return;
  if (!world.resource(Spawner).finished) return;
  if (world.query(Enemy).length > 0) return;            // wait for stragglers
  const bounds = world.resource(Bounds);
  spawnBoss(world, bounds.width + 60, bounds.height / 2);
  state.bossSpawned = true;
}
```

Note the boss is an `Enemy`, so `query(Enemy).length > 0` becomes true the instant
it spawns — which is *after* the `bossSpawned` guard, so it can't re-trigger.
Damage, hit-flash and death all flow through the collision code you already have;
`killEntity`'s new boss branch is the only special case.

---

## Assembling `main.ts`

The final wiring: build the HUD, register `GameState`, define `startGame`, gate the
loop, and slot the two new systems in. Here are the pieces that change:

```ts
// src/main.ts — HUD + state
import { Hud } from "./game/hud";
import { GameState, Score, Spawner, Bounds, Stage, Layer, type WaveEntry } from "./game/resources";
import { bossSystem, levelSystem } from "./game/systems/boss";
import { hudSystem } from "./game/systems/hud";
import { spawnPlayer } from "./game/factory";
import type { EnemyKind } from "./game/components";

const hud = new Hud(app.screen.width, app.screen.height);
world.resource(Stage).layers[Layer.Ui].addChild(hud.container);
world.setResource(hud);

const state = world.setResource(new GameState("title"));
hud.showMessage("SPACE  IMPACT\n\npress ENTER");   // title screen (schedule isn't running yet)

// the level as data (chapter 09), wrapped so we can rebuild it on restart
const column = (at: number, kind: EnemyKind, n: number): WaveEntry[] =>
  Array.from({ length: n }, (_, i) => ({ at, kind, y: 0.2 + (0.6 * i) / (n - 1 || 1) }));

function buildLevel1(): WaveEntry[] {
  return [
    { at: 1.0, kind: "straight", y: 0.4 },
    { at: 1.6, kind: "straight", y: 0.6 },
    ...column(3.0, "straight", 4),
    { at: 5.0, kind: "homing", y: 0.5 },
    ...column(7.0, "shooter", 2),
    { at: 9.0, kind: "homing", y: 0.3 },
    { at: 9.4, kind: "homing", y: 0.7 },
    ...column(11.0, "straight", 5),
  ];
}

function startGame(): void {
  // wipe the previous run's entities (and their views) ...
  for (const e of world.query(Transform)) world.destroy(e);
  world.flush((e) => detachView(world, e));
  // ... reset the resources that are per-run ...
  world.resource(Score).value = 0;
  world.setResource(new Spawner(buildLevel1()));
  state.phase = "playing";
  state.bossSpawned = false;
  // ... and hand control to a fresh ship.
  spawnPlayer(world, 120, world.resource(Bounds).height / 2);
  hud.hideMessage();
}
```

Update the keyboard handler to start/restart on **Enter**, and the resize handler
to relayout the HUD and starfield:

```ts
window.addEventListener("keydown", (e) => {
  input.press(e.code);
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
  if (e.code === "Enter" && state.phase !== "playing") startGame();
});

app.renderer.on("resize", (w, h) => {
  const bounds = world.resource(Bounds);
  bounds.width = w; bounds.height = h;
  hud.resize(w, h);
  world.resource(Starfield).resize(w, h);
});
```

The schedule gains `levelSystem` and `bossSystem` (near the enemy AI) and
`hudSystem` (late), and the loop gates on `phase`:

```ts
const schedule = new Schedule()
  .add(playerControlSystem)
  .add(weaponSystem)
  .add(spawnerSystem)
  .add(levelSystem)          // ← spawn the boss when waves are cleared
  .add(shooterSystem)
  .add(homingSystem)
  .add(bossSystem)           // ← boss movement + fire (before movement)
  .add(movementSystem)
  .add(spinSystem)
  .add(bobSystem)
  .add(collisionSystem)
  .add(flashSystem)
  .add(invulnBlinkSystem)
  .add(hudSystem)            // ← read Score/Health into the HUD, drive the overlay
  .add(lifetimeSystem)
  .add(cullOffscreenSystem)
  .add(starfieldSystem)
  .add(renderSystem);

const STEP = 1 / 60;
let accumulator = 0;

app.ticker.add((ticker) => {
  accumulator += ticker.deltaMS / 1000;
  if (accumulator > 0.25) accumulator = 0.25;
  // step only while playing; the `phase` check inside stops the instant we win/lose
  while (accumulator >= STEP && state.phase === "playing") {
    schedule.run(world, STEP);
    world.flush((e) => detachView(world, e));
    accumulator -= STEP;
  }
  if (state.phase !== "playing") accumulator = 0;   // don't bank time on menus
});
```

> Remove the temporary `spawnPlayer(...)` call and any leftover debug spawns from
> earlier chapters — `startGame()` owns spawning the player now.

Run it. You get a **SPACE IMPACT** title; **Enter** drops you into level 1; you
clear the scripted waves, the screen calms, and a purple dreadnought slides in,
patrols, and sprays bolts — faster once you've chewed through half its hull. Kill
it for **LEVEL CLEAR** and 2000 points; die out for **GAME OVER**. Either way,
**Enter** runs it back. That's a complete game.

---

## Checkpoint

- [x] A `Hud` in the UI layer shows score, ships and a colour-coded hull bar,
      redrawing only on change.
- [x] A `GameState` machine gates the loop; title / game-over / level-clear
      overlays appear and **Enter** (re)starts.
- [x] A multi-phase `bossSystem` + `levelSystem` end the level, reusing all the
      combat code.

You've built a game *and* the engine under it. The last chapter is the map of
where this scaffold goes next.

*Next → [Chapter 13: Where to go next](13-where-to-go-next.md)*
