# 06 · Sprites & procedural art 🛠️

> **You'll leave this chapter with:** every visual in the game drawn in code — the
> player ship, three enemy shapes, a boss, bolts and pickups — plus the two-tier
> strategy (a `Graphics` per unique thing, a **baked texture** stamped for the
> many), and a **parallax starfield** built on a `ParticleContainer`.

No `.png` files. Everything is `Graphics`, and where we need hundreds of copies we
bake a `Graphics` into a GPU `Texture` once and stamp cheap sprites from it.

---

## Two tiers: draw-each vs bake-once

There's a performance fork hiding in "how do I draw this":

- **Few on screen, each unique** (the player, a handful of enemies, the boss): a
  fresh `Graphics` per entity is fine. A dozen retained `Graphics` cost nothing.
- **Many on screen, all identical** (bolts, stars, explosion sparks): a `Graphics`
  each is wasteful — every one is its own geometry upload. Instead **bake the
  shape into a `Texture` once** with `renderer.generateTexture(...)`, then create a
  lightweight `Sprite` per instance. Two hundred bolts become two hundred quads
  sharing one texture — exactly what GPUs are built for.

This is the practical reason chapter 05's `Renderable` holds a generic
`Container`: a ship's view is a `Graphics`, a bolt's view is a `Sprite`, and the
render system doesn't care which.

---

## The shapes — `src/game/art.ts`

Create **`src/game/art.ts`**. First the unique shapes, each a function returning a
fresh `Graphics` **centered on `(0, 0)`** so the entity's `Transform` positions and
rotates it around its middle:

```ts
// src/game/art.ts
import { Graphics, Texture } from "pixi.js";
import type { Renderer } from "pixi.js";

// The three enemy archetypes (chapter 09 re-exports this as EnemyKind on the
// Enemy component; art only needs the string literals to pick a colour).
type EnemyKind = "straight" | "homing" | "shooter";

/** Player ship: nose points +x (right, the direction of travel). */
export function makePlayerShip(): Graphics {
  const g = new Graphics();
  g.poly([18, 0, -12, -11, -5, 0, -12, 11]).fill(0x66ccff);  // hull
  g.poly([-6, -5, -20, -9, -8, 0]).fill(0x2f6f99);           // upper fin
  g.poly([-6, 5, -20, 9, -8, 0]).fill(0x2f6f99);             // lower fin
  g.circle(4, 0, 3).fill(0xffffff);                          // cockpit
  return g;
}

/** Enemy ships: nose points -x (left, toward the player). Colour by kind. */
export function makeEnemyShip(kind: EnemyKind): Graphics {
  const colour =
    kind === "shooter" ? 0xff5566 :
    kind === "homing"  ? 0xffaa33 :
    /* straight */       0xcc66ff;
  const g = new Graphics();
  g.poly([-16, 0, 12, -11, 5, 0, 12, 11]).fill(colour);
  g.poly([12, -6, 20, 0, 12, 6]).fill(colour, 0.6);          // tail
  g.circle(-4, 0, 3).fill(0x1a0a14);                         // eye
  return g;
}

/** Boss: a bigger, meaner hull with a glowing core (chapter 12). */
export function makeBoss(): Graphics {
  const g = new Graphics();
  g.roundRect(-40, -48, 70, 96, 10).fill(0x8844aa);
  g.poly([-40, -30, -64, 0, -40, 30]).fill(0x552277);        // prow
  g.rect(30, -14, 16, 28).fill(0x552277);                    // rear block
  g.circle(-12, 0, 12).fill(0xff5566);                       // core
  return g;
}
```

Then the baked textures. `renderer.generateTexture(graphics)` rasterizes a
`Graphics` to a `Texture` you can reuse; destroy the throwaway `Graphics`
afterward:

```ts
// src/game/art.ts (continued)

/** A capsule bolt, baked once. Stamp Sprites from the returned texture. */
export function makeBoltTexture(renderer: Renderer, colour: number): Texture {
  const g = new Graphics().roundRect(-7, -2.5, 14, 5, 2.5).fill(colour);
  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

/** A tiny round star, baked once for the starfield and explosion sparks. */
export function makeDotTexture(renderer: Renderer, radius = 2, colour = 0xffffff): Texture {
  const g = new Graphics().circle(0, 0, radius).fill(colour);
  const texture = renderer.generateTexture(g);
  g.destroy();
  return texture;
}

/** A pickup capsule with a letter-ish glyph drawn as a shape (chapter 11). */
export function makePickup(colour: number): Graphics {
  const g = new Graphics();
  g.roundRect(-11, -11, 22, 22, 5).fill({ color: colour, alpha: 0.25 });
  g.roundRect(-11, -11, 22, 22, 5).stroke({ width: 2, color: colour });
  g.circle(0, 0, 5).fill(colour);
  return g;
}
```

> **Origin discipline.** `Graphics` has no `anchor`; its origin is wherever `(0,0)`
> falls in the geometry — so we draw everything centered on the origin. Baked
> `Sprite`s *do* have an anchor; the factories in later chapters call
> `sprite.anchor.set(0.5)` so bolts rotate and position by their middle too.

---

## An `Art` resource

Bake the shared textures once at startup and stash them in a resource so any
factory can grab them without re-baking. Add to **`src/game/resources.ts`**:

```ts
// src/game/resources.ts (add)
import type { Texture } from "pixi.js";

/** Resource: textures baked once at boot, stamped many times at runtime. */
export class Art {
  constructor(
    public playerBolt: Texture,
    public enemyBolt: Texture,
    public spark: Texture,
  ) {}
}
```

And in `main.ts`, after `app.init`:

```ts
import { Art } from "./game/resources";
import { makeBoltTexture, makeDotTexture } from "./game/art";

world.setResource(new Art(
  makeBoltTexture(app.renderer, 0x9be7ff),   // player bolts: pale cyan
  makeBoltTexture(app.renderer, 0xff8080),   // enemy bolts: red
  makeDotTexture(app.renderer, 2, 0xffdd88), // explosion sparks
));
```

---

## The parallax starfield — `ParticleContainer`

The scrolling starfield is the one place we reach for PixiJS's
`ParticleContainer`: hundreds of identical dots where **only position changes**
each frame. Telling PixiJS that up front (via `dynamicProperties`) lets it skip
re-uploading everything else — it's built for exactly this.

The starfield is pure decoration — it never collides, never takes damage — so it
does *not* need to be entities. We manage it in a small class and drive it with
one system. Create **`src/game/starfield.ts`**:

```ts
// src/game/starfield.ts
import { ParticleContainer, Particle, type Texture } from "pixi.js";

interface Star {
  particle: Particle;
  speed: number;      // px/sec; nearer stars move faster (parallax)
}

export class Starfield {
  readonly container: ParticleContainer;
  private stars: Star[] = [];

  constructor(
    texture: Texture,
    count: number,
    private width: number,
    private height: number,
  ) {
    // Only position is dynamic; scale is set once at creation and never changes.
    this.container = new ParticleContainer({
      dynamicProperties: { position: true, scale: false, rotation: false, color: false },
    });

    for (let i = 0; i < count; i++) {
      const depth = Math.random();                 // 0 = far, 1 = near
      const size = 0.35 + depth * 1.1;
      const particle = new Particle({
        texture,
        x: Math.random() * width,
        y: Math.random() * height,
        scaleX: size,
        scaleY: size,
      });
      this.container.addParticle(particle);
      this.stars.push({ particle, speed: 15 + depth * 90 });
    }
  }

  update(dt: number): void {
    for (const star of this.stars) {
      star.particle.x -= star.speed * dt;
      if (star.particle.x < -2) {                  // wrapped off the left edge
        star.particle.x = this.width + 2;
        star.particle.y = Math.random() * this.height;
      }
    }
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }
}
```

Make it a resource and drive it with a one-line system. In `main.ts`:

```ts
import { Starfield } from "./game/starfield";
import { Layer, Stage } from "./game/resources";

const starfield = new Starfield(
  world.resource(Art).spark, 140, app.screen.width, app.screen.height,
);
world.resource(Stage).layers[Layer.Background].addChild(starfield.container);
world.setResource(starfield);
```

Create **`src/game/systems/starfield.ts`**:

```ts
// src/game/systems/starfield.ts
import type { World } from "../../engine/world";
import { Starfield } from "../starfield";

export function starfieldSystem(world: World, dt: number): void {
  world.resource(Starfield).update(dt);
}
```

It's a system so it lives in the schedule with everything else (chapter 07),
advancing on the same fixed `dt`. Parallax falls out for free: near stars have a
bigger `size` *and* a higher `speed`, so the field reads as depth as it scrolls.

> **`ParticleContainer` limits.** Particles are lightweight on purpose — no
> children, no filters, no interaction. That's fine for stars and sparks; anything
> that needs to be hit or nested stays a normal entity with a `Graphics`/`Sprite`
> view.

---

## Explosion sparks (a preview)

When an enemy dies (chapter 10) we scatter a few sparks. Those *are* entities —
they reuse `Velocity` and `Lifetime` and the movement system, so "particles" cost
us no new machinery. Here's the factory we'll call; drop it in `factory.ts` now:

```ts
// src/game/factory.ts (add)
import { Sprite } from "pixi.js";
import { Transform, Velocity, Lifetime } from "./components";
import { Art } from "./resources";
import { fromAngle } from "../engine/math";

/** Scatter `count` short-lived sparks outward from (x, y). */
export function spawnExplosion(world: World, x: number, y: number, count = 10): void {
  const art = world.resource(Art);
  for (let i = 0; i < count; i++) {
    const e = world.create();
    const angle = (Math.PI * 2 * i) / count + Math.random();
    const speed = 60 + Math.random() * 140;
    const v = fromAngle(angle, speed);
    world.add(e, new Transform(x, y));
    world.add(e, new Velocity(v.x, v.y));
    world.add(e, new Lifetime(0.4 + Math.random() * 0.3));
    const spark = new Sprite(art.spark);
    spark.anchor.set(0.5);
    mountView(world, e, spark, Layer.Particles);
  }
}
```

`Velocity` and `Lifetime` are defined next chapter; this compiles once they exist.
The point stands now: an explosion is just ten entities that drift and expire. No
particle engine, no special case — the ECS already does it.

---

## Checkpoint

- [x] `art.ts` builds the ship, enemies, boss, and baked bolt/dot textures.
- [x] `Art` is a resource; the starfield scrolls with parallax via a
      `ParticleContainer` and its own system.
- [x] You understand draw-each (unique) vs bake-once (many), and why sparks are
      just entities.

We have an engine, a render seam, and art. Time to make it *move on a clock* —
the fixed-timestep game loop, the schedule, and the movement/lifetime systems that
bring the world to life.

*Next → [Chapter 07: The game loop & scheduling](07-the-game-loop.md)*
