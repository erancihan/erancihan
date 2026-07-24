# 05 · The render seam 🛠️

> **You'll leave this chapter with:** the single system that connects our ECS to
> PixiJS. A `Renderable` component holds a PixiJS display object; the
> `RenderSystem` copies each entity's `Transform` onto it once per step; helpers
> mount views into layer containers on spawn and tear them down on destroy. After
> this, no game code ever touches PixiJS again.

---

## The problem, stated exactly

Our ECS knows an entity is at `Transform { x: 120, y: 300 }`. PixiJS knows how to
draw a `Container` at `view.x = 120, view.y = 300`. Nothing yet connects the two.
We need a rule — one place, one direction — that keeps the PixiJS object in step
with the simulation. That rule is the **render seam**, and keeping it a single,
one-way system is what stops the scene graph from leaking into the game logic.

The direction is deliberate and absolute:

> **Simulation is the source of truth. Every step, we copy `Transform` → PixiJS
> object. PixiJS never writes back.** The renderer is a dumb mirror of the world.

Get this backwards — let a system read `sprite.x` to decide something — and you've
re-coupled the two, and you're back to the `Actor extends Container` mess chapter
01 warned about.

---

## The `Renderable` component

The seam is one component: a handle to a PixiJS display object, plus which layer
it belongs in. It's called `Renderable`, not `Sprite`, because the view can be
*any* `Container` — a `Graphics` ship, a baked `Sprite` bullet, or a `Container`
holding several of each. (Naming it `Sprite` would also collide with PixiJS's own
`Sprite` class.)

Start **`src/game/components.ts`** — we'll add to this file every chapter:

```ts
// src/game/components.ts
import type { Container } from "pixi.js";
import { Layer } from "./resources";

/** Position, orientation and uniform scale in world (screen) space. */
export class Transform {
  constructor(
    public x = 0,
    public y = 0,
    public rotation = 0,   // radians
    public scale = 1,
  ) {}
}

/** The render seam: a PixiJS display object and the layer it's mounted in. */
export class Renderable {
  constructor(
    public view: Container,
    public layer: Layer = Layer.Entities,
  ) {}
}
```

---

## Layers: predictable draw order

Draw order in PixiJS is child order (chapter 02). Rather than juggle `zIndex` on
hundreds of entities, we carve the stage into a few **layer containers** and mount
each view into the right one. Everything in the `Background` layer draws before
(behind) everything in `Entities`, which draws behind `Particles`, which draws
behind `Ui`. Simple, cheap, and it means the HUD is *always* on top without
sorting.

Create **`src/game/resources.ts`**:

```ts
// src/game/resources.ts
import type { Container } from "pixi.js";

/** Render layers, back to front. The value is an index into Stage.layers. */
export const Layer = {
  Background: 0,
  Entities: 1,
  Particles: 2,
  Ui: 3,
} as const;
export type Layer = (typeof Layer)[keyof typeof Layer];

/** Resource: the PixiJS containers the render system mounts views into. */
export class Stage {
  constructor(public layers: Container[]) {}
}

/** Resource: the play-area size in CSS pixels; kept in sync with the canvas. */
export class Bounds {
  constructor(public width: number, public height: number) {}
}
```

`Stage` and `Bounds` are **resources** (chapter 04) — one of each, reachable from
any system via `world.resource(Stage)`.

---

## Mount and detach: the lifecycle helpers

Two operations bracket an entity's visible life: **mount** its view into a layer
when it spawns, **detach** and destroy it when the entity dies. Put these in
**`src/game/factory.ts`** (which grows spawn helpers in later chapters):

```ts
// src/game/factory.ts
import type { Container } from "pixi.js";
import type { Entity } from "../engine/entity";
import type { World } from "../engine/world";
import { Renderable } from "./components";
import { Layer, Stage } from "./resources";

/** Add `view` to its layer container and give `entity` a Renderable. */
export function mountView(
  world: World,
  entity: Entity,
  view: Container,
  layer: Layer = Layer.Entities,
): Renderable {
  world.resource(Stage).layers[layer].addChild(view);
  return world.add(entity, new Renderable(view, layer));
}

/** Remove and destroy an entity's view. Called from the world's flush hook. */
export function detachView(world: World, entity: Entity): void {
  const r = world.get(entity, Renderable);
  if (!r) return;
  r.view.parent?.removeChild(r.view);
  r.view.destroy();          // free the GPU/texture resources PixiJS held
}
```

`detachView` is why `World.flush` has an `onBeforeRemove` hook: it runs *before*
the component is stripped from its store, so the `Renderable` is still there to
read. Wire it up once, in the loop (chapter 07):

```ts
world.flush((e) => detachView(world, e));   // every dead entity loses its view, no leaks
```

Forget this and destroyed enemies keep drawing forever — an invisible leak that
tanks the frame rate after a minute of play. The single hook makes it impossible
to forget per-entity.

---

## The `RenderSystem`

Now the seam itself — and it's almost anticlimactically small. Create
**`src/game/systems/render.ts`**:

```ts
// src/game/systems/render.ts
import type { System } from "../../engine/schedule";
import { Transform, Renderable } from "../components";

/**
 * Copy every entity's Transform onto its PixiJS view. This is the ONLY code that
 * writes to a display object's position. Runs last in the schedule so it mirrors
 * the final simulated state; PixiJS then draws (chapter 07's priority trick).
 */
export const renderSystem: System = {
  update(world) {
    for (const e of world.query(Transform, Renderable)) {
      const t = world.get(e, Transform)!;
      const { view } = world.get(e, Renderable)!;
      view.x = t.x;
      view.y = t.y;
      view.rotation = t.rotation;
      view.scale.set(t.scale);
    }
  },
};
```

That's the whole bridge. Every other system in the game reads and writes
`Transform` (plain numbers, no PixiJS); this one, once per step, reflects the
result into the scene graph. Swap PixiJS for another 2D renderer and this ~10-line
file is the *only* thing you'd rewrite.

> **Why not just store the PixiJS object and skip `Transform`?** Because then
> movement, collision and AI would all read and write `view.x` — coupling every
> system to PixiJS and to the same mutable object the renderer walks. The
> `Transform` indirection is what keeps the simulation renderer-agnostic and
> keeps writes to the scene graph in exactly one place.

---

## Wiring the stage in `main.ts`

Back in `src/main.ts`, after `app.init`, create the layer containers, register the
resources, and keep `Bounds` synced to the canvas:

```ts
import { Application, Container } from "pixi.js";
import { World } from "./engine/world";
import { Stage, Bounds, Layer } from "./game/resources";

const app = new Application();
await app.init({ resizeTo: host, background: "#05060a", antialias: true,
                 resolution: window.devicePixelRatio || 1, autoDensity: true });
host.appendChild(app.canvas);

const world = new World();

// one Container per Layer, added to the stage in back-to-front order
const layers = [new Container(), new Container(), new Container(), new Container()];
for (const layer of layers) app.stage.addChild(layer);
world.setResource(new Stage(layers));
world.setResource(new Bounds(app.screen.width, app.screen.height));

// keep the play-area size current when the window resizes
app.renderer.on("resize", (w, h) => {
  const bounds = world.resource(Bounds);
  bounds.width = w;
  bounds.height = h;
});
```

The array order **is** the layer order: `layers[Layer.Background]` was added
first, so it draws behind `layers[Layer.Ui]`, added last. `Layer.Background` `=
0`, `Layer.Ui = 3` — the numbers line up with the array indices on purpose.

---

## A 20-line proof it works

Before moving on, spawn one entity by hand and let the `RenderSystem` drive it —
no player, no game, just the seam. Temporarily, in `main.ts`:

```ts
import { Graphics } from "pixi.js";
import { Transform, Velocity } from "./game/components";   // add Velocity next chapter; or inline
import { mountView } from "./game/factory";
import { renderSystem } from "./game/systems/render";

// a test box
const e = world.create();
world.add(e, new Transform(120, 200));
const box = new Graphics().rect(-15, -15, 30, 30).fill(0x66ccff);
mountView(world, e, box);

app.ticker.add((ticker) => {
  const dt = ticker.deltaMS / 1000;
  // pretend-simulate: drift the transform
  world.get(e, Transform)!.x += 60 * dt;
  // reflect it to PixiJS
  renderSystem.update(world, dt);
});
```

Run it: a cyan box slides right. You changed a *number in a component*, and a
PixiJS object followed. That indirection — trivial here — is the load-bearing
idea of the whole architecture. Delete this test block once you've seen it move;
chapter 06 replaces the box with real art and chapter 07 replaces the ad-hoc
ticker with the fixed-timestep loop.

---

## Checkpoint

- [x] `components.ts` has `Transform` and `Renderable`; `resources.ts` has
      `Layer`, `Stage`, `Bounds`.
- [x] `factory.ts` has `mountView` / `detachView`; `systems/render.ts` has
      `renderSystem`.
- [x] A hand-spawned entity moves on screen, driven only through its `Transform`.

The seam is built and one-directional. Next we give entities something worth
looking at — procedural ships, bolts and a parallax starfield — with zero art
assets.

*Next → [Chapter 06: Sprites & procedural art](06-sprites-and-procedural-art.md)*
