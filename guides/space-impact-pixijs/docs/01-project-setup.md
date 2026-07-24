# 01 · Project setup 🛠️

> **You'll leave this chapter with:** a running Vite + TypeScript project with
> PixiJS v8 drawing to a canvas, a clear picture of the frame we're going to
> build, and a firm reason *not* to reach for the obvious `class Ship extends
> Container` design.

---

## What we're building, and the two tools

We're building **Space Impact**: a horizontal shoot-'em-up where a ship flies
through a scrolling starfield, dodging and blasting waves of enemies. By the end
you'll have a playable game with weapons, power-ups, lives, a HUD and a boss.

We use exactly two libraries, and it's worth being precise about the division of
labour:

- **PixiJS** is the **renderer**. It owns the canvas, talks to WebGPU/WebGL, and
  every frame it walks a tree of display objects and draws them *fast* —
  thousands of sprites without breaking a sweat. That is *all* it does. It has no
  concept of a "game object", a "level", an "enemy", or a "frame of gameplay".
- **Our ECS** is the **framework**. It owns entities, components, the system
  schedule, spawning, movement, collisions, weapons and score. It never draws a
  pixel; it just decides *what is where and what happens next*, then hands PixiJS
  a tree to rasterize.

That seam — game logic on one side, drawing on the other — is the whole design.
Chapter 05 builds the one system that bridges it.

> **Why Vite?** It gives us a hot-reloading dev server and a TypeScript build
> with zero config. We deliberately avoid a UI framework (React/Vue/Nuxt) in the
> core so the game code stays portable — it's plain TS that talks to a `<canvas>`.
> There's an aside at the end on dropping this into the Nuxt `PixiContainer.vue`
> scaffold that already lives in this repo's `playground/`.

---

## Scaffold the project

You need **Node 18+**. Create the project, then add PixiJS:

```bash
npm create vite@latest space-impact -- --template vanilla-ts
cd space-impact
npm install
npm install pixi.js
```

Vite's `vanilla-ts` template ships a little demo (a spinning logo and a counter).
Delete the parts we don't want:

```bash
rm src/counter.ts src/typescript.svg public/vite.svg
```

Replace **`index.html`** with something minimal — one full-window canvas host and
no default margins:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Space Impact</title>
    <style>
      html, body { margin: 0; height: 100%; background: #05060a; overflow: hidden; }
      #app { width: 100vw; height: 100vh; }
      canvas { display: block; }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

Empty out **`src/style.css`** (or delete it and remove its import) — we style in
the canvas, not in CSS.

---

## Hello, canvas

Replace **`src/main.ts`** with the smallest possible PixiJS v8 app. Notice two
things v8 changed from v7: **`init` is async**, and the canvas lives at
**`app.canvas`** (it was `app.view`).

```ts
import { Application, Graphics } from "pixi.js";

async function main() {
  const host = document.querySelector<HTMLDivElement>("#app")!;

  // 1. Create, then asynchronously initialise. This is the v8 two-step.
  const app = new Application();
  await app.init({
    background: "#05060a",
    resizeTo: host,       // track the host element's size
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,    // scale the canvas CSS size for crisp HiDPI
  });

  // 2. Attach the canvas PixiJS created for us.
  host.appendChild(app.canvas);

  // 3. Draw something so we know it's alive — a placeholder ship.
  const ship = new Graphics()
    .poly([0, -12, 22, 0, 0, 12, 6, 0])   // a little arrowhead
    .fill(0x66ccff);
  ship.x = 120;
  ship.y = app.screen.height / 2;
  app.stage.addChild(ship);

  // 4. The heartbeat. `ticker` is the frame clock; nudge the ship each frame.
  app.ticker.add((ticker) => {
    ship.x += 0.5 * ticker.deltaTime;
    if (ship.x > app.screen.width + 20) ship.x = -20;
  });
}

main();
```

Run it:

```bash
npm run dev
```

Open the URL Vite prints. You should see a cyan arrowhead drifting rightward
across a near-black field, wrapping around. **That's PixiJS's entire job in one
screen**: you built a tree (`stage → ship`), you mutate transforms each tick, it
draws. Everything else in this guide is *deciding what to mutate*.

If the canvas is blank: check the browser console. The usual culprits are a
missing `await` on `app.init` (you'll get "renderer is undefined") or forgetting
`host.appendChild(app.canvas)`.

---

## The shape of a frame

Hold onto this picture; it's the spine of the whole guide. Every frame, in order:

1. **Read input** — which keys are down.
2. **Run the simulation** — player control, weapons, spawning, enemy AI,
   movement, collisions, damage — as a fixed list of **systems**.
3. **Sync to PixiJS** — copy each entity's position onto its display object.
4. **PixiJS renders** — it walks the tree and draws.

Steps 1–3 are *ours*. Step 4 is PixiJS's, and it happens automatically after our
ticker callback (chapter 07 explains the priority trick that guarantees the
order). The list in step 2 — the **schedule** — is the game. Add a behaviour by
adding a system to the list; that's the promise the ECS is going to keep.

---

## Why not `class Ship extends Container`?

It is *so* tempting. PixiJS hands you a `Container` with an `x`, a `y`, and a
tree; adding an `update(dt)` method and subclassing looks like free architecture.
The `playground/javascript/pixijs` project in this repo does exactly that —
`Actor extends Container`, `Circle extends Actor` — and it's a fine way to draw a
diagram of connected circles. It is a **trap** for a game, for one reason:

**Games compose behaviour along axes that don't nest.** Consider four things you
want in Space Impact:

| Thing | Wants |
| --- | --- |
| Player bolt | moves right, damages enemies, dies off-screen |
| Enemy bolt | moves left, damages *player*, dies off-screen |
| Homing missile | moves, **turns toward a target**, damages enemies, dies |
| Rocket power-up | moves left, **bobs**, is **collectible**, dies off-screen |

"Moves", "damages", "dies off-screen", "turns toward a target", "bobs", "is
collectible" are six independent capabilities. In an inheritance tree you must
pick *one* spine to hang them on — and the moment `HomingMissile` wants the
missile's turning *and* the bolt's damage, you're copy-pasting or bolting on
mixins. Six capabilities across four entities is 2⁶ possible combinations; a
class hierarchy can only cleanly express a path, not a set.

The ECS answer is to make each capability a **component** (`Velocity`, `Bullet`,
`Lifetime`, `Homing`, `Bob`, `Pickup`) and each behaviour a **system** that runs
over whoever has the right components. The homing missile is just
`Velocity + Bullet + Lifetime + Homing`. No new class. That's chapter 04 — but
the decision to *not* subclass `Container` is made now, and it's why the next
three chapters build an engine before we build the game.

> PixiJS objects will still appear — as the *value* of a `Renderable`
> **component**, owned by an entity, mounted into the scene graph by one render
> system. We use
> the scene graph; we just don't inherit from it.

---

## The directory we'll grow into

You don't need to create these yet — each chapter adds its files — but here's the
map so the later "create `src/engine/world.ts`" instructions have a home:

```
space-impact/
├── index.html
├── src/
│   ├── main.ts                 ← wires everything together, owns the loop
│   ├── engine/                 ← the ECS framework (game-agnostic)
│   │   ├── entity.ts
│   │   ├── component-store.ts
│   │   ├── world.ts
│   │   ├── schedule.ts
│   │   └── math.ts
│   └── game/                   ← Space Impact specifically
│       ├── components.ts
│       ├── resources.ts
│       ├── art.ts
│       ├── factory.ts
│       └── systems/
│           ├── render.ts
│           ├── movement.ts
│           ├── player.ts
│           ├── weapon.ts
│           ├── spawner.ts
│           ├── enemy.ts
│           ├── collision.ts
│           ├── powerup.ts
│           └── hud.ts
└── ...
```

The split matters: everything in `engine/` is a generic ECS you could lift into
another game unchanged; everything in `game/` knows it's Space Impact. Chapter 13
revisits that line when we talk about swapping the engine for `bitECS`.

---

## Aside — dropping this into the repo's Nuxt playground

If you'd rather build inside the existing
`playground/javascript/pixijs/project`, the only real difference is *who owns the
canvas*. There, a Vue component (`PixiContainer.vue`) mounts a `div` and hands it
to a `Program` class that calls `app.init`. To use our engine, replace
`Program`'s `Scene`/`Actor` internals with a `World` + `Schedule` (chapters
04–07), and call `world`/`schedule` from the component's `onMounted`/`onUnmounted`
instead of from `main()`. The game code — `engine/` and `game/` — is identical;
only the ~20 lines that create the `Application` and start the ticker move into
the Vue lifecycle. We'll flag the seam again in chapter 07.

---

## Checkpoint

- [x] `npm run dev` serves a page with a drifting cyan arrowhead.
- [x] You can articulate the PixiJS-vs-ECS division of labour.
- [x] You know why we're not subclassing `Container`.

Next, we slow down and actually *learn PixiJS* — the scene graph, `Graphics`,
`Sprite`, `Text`, the `Ticker`, and every v8 gotcha — so that when the engine
starts calling it, none of it is magic.

*Next → [Chapter 02: PixiJS fundamentals](02-pixijs-fundamentals.md)*
