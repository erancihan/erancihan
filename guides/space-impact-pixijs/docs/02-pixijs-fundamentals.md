# 02 · PixiJS fundamentals 🧠

> **You'll leave this chapter with:** a working mental model of PixiJS as a *pure
> renderer* — the `Application`, the `Container` scene graph, the three display
> objects we use (`Graphics`, `Sprite`, `Text`), the `Ticker`, and every v8
> change that would otherwise bite you. No ECS yet; just the tool.

---

## PixiJS is a renderer with a tree

Strip away the marketing and PixiJS is two things:

1. A **renderer** — an object that owns a WebGPU or WebGL context and can draw a
   batch of textured, transformed quads and paths to a canvas very fast.
2. A **scene graph** — a tree of `Container`s. Each node has a transform
   (position, rotation, scale, pivot) and a list of children. To render a frame,
   PixiJS walks the tree depth-first, multiplies transforms down the branches,
   and draws each leaf.

That's the entire contract. There is no update loop you must fill in, no
collision, no input, no notion of a "sprite that does something". You give it a
tree; it draws the tree. Our job for the rest of the guide is to *decide what the
tree looks like each frame*.

```
Application
├── renderer      ← WebGPU/WebGL; app.renderer
├── canvas        ← the <canvas> element; app.canvas   (v7 called this app.view)
├── stage         ← the root Container; app.stage
└── ticker        ← the frame clock; app.ticker
```

---

## The `Application`, and v8's async init

`Application` is a convenience bundle of renderer + canvas + stage + ticker. In
**v8 it initialises asynchronously** — because choosing and booting a WebGPU
context is async — so creation is always two steps:

```ts
import { Application } from "pixi.js";

const app = new Application();
await app.init({
  // --- sizing ---
  resizeTo: someElement,   // OR width/height for a fixed size
  resolution: window.devicePixelRatio || 1,
  autoDensity: true,       // keep CSS size right on HiDPI screens
  // --- look ---
  background: "#05060a",
  antialias: true,
  // --- renderer choice (optional) ---
  preference: "webgl",     // "webgpu" | "webgl"; omit to auto-pick
});
```

Two coordinate facts that matter later:

- **`app.screen`** is a `Rectangle` `(0, 0, width, height)` in **CSS pixels** —
  the logical size your game reasons in. Use this for gameplay (`app.screen.width`
  is "how wide is the play area").
- **`app.renderer.width/height`** are in **physical device pixels** (CSS ×
  resolution). You rarely touch these; `autoDensity` handles the mismatch.

`Application` also **auto-starts its ticker and renders for you**. You do not call
"render" — you register update callbacks and PixiJS draws after them. `app.stop()`
/ `app.start()` pause and resume that (handy for a pause screen, chapter 12).

---

## The scene graph: `Container`

Everything drawable is a `Container` or extends one. The API you'll actually use:

```ts
import { Container } from "pixi.js";

const group = new Container();
group.label = "enemies";          // v8 renamed `name` → `label`
group.addChild(childA, childB);   // append; children draw in array order
group.removeChild(childA);
group.x = 100; group.y = 50;      // position (also group.position.set(100, 50))
group.rotation = Math.PI / 4;     // radians  (group.angle is the same in degrees)
group.scale.set(2);               // uniform; or .set(sx, sy)
group.pivot.set(16, 16);          // the local point that x/y and rotation act on
group.alpha = 0.5;                // 0..1, multiplies down to children
group.visible = false;            // skip drawing this subtree entirely
```

**Transforms compose down the tree.** A child at local `(10, 0)` inside a parent
at `(100, 50)` rotated 90° ends up wherever that rotation puts it in world space.
We exploit this by grouping the game into a handful of **layer containers**
(background, entities, particles, UI) so we can move or hide a whole layer at
once — and so draw order is predictable (chapter 05).

**Draw order = child order**, unless you opt into sorting:

```ts
group.sortableChildren = true;    // now zIndex is respected
sprite.zIndex = 10;               // higher = drawn later = on top
```

We mostly rely on layer containers for ordering and reserve `zIndex` for within-a-layer tweaks — sorting every child every frame isn't free.

---

## `Graphics`: procedural shapes (our art department)

We ship **no image assets** in this guide — the ship, enemies, bolts and pickups
are all drawn with `Graphics`. v8's `Graphics` API is **geometry first, style
second, and chainable** — a hard break from v7's `beginFill()/drawRect()/endFill()`
(all removed):

```ts
import { Graphics } from "pixi.js";

const g = new Graphics();

// geometry method(s) describe a shape, THEN fill()/stroke() paints what you described:
g.rect(0, 0, 40, 24).fill(0x66ccff);
g.circle(60, 12, 12).fill({ color: 0xff5566, alpha: 0.9 });
g.roundRect(0, 40, 40, 10, 4).fill("#22aa88");

// a polygon (flat list of x,y pairs) — this is how we draw the ship:
g.poly([0, -12, 22, 0, 0, 12, 6, 0]).fill(0x66ccff);

// strokes: describe geometry, then stroke() with a width/color:
g.moveTo(0, 0).lineTo(100, 0).stroke({ width: 2, color: 0x334455 });

g.clear();   // wipe all recorded geometry to redraw from scratch
```

Key idea: a `Graphics` is **retained** — it records the shapes you describe and
redraws them every frame for free. You only call the geometry methods again when
the shape *changes*. For the starfield and HUD bar we'll redraw; for a static
ship we draw once.

> **Fill color forms:** a hex number `0x66ccff`, a CSS string `"#66ccff"`, or an
> object `{ color, alpha }`. Numbers are fastest to type in code; we use them.

---

## `Sprite` and textures

A `Sprite` draws a **texture** (an image on the GPU) as a quad. Even though we
draw procedurally, we'll still use sprites — because you can **bake a `Graphics`
into a reusable `Texture` once** and then stamp hundreds of cheap sprites from it
(chapter 06). That's how you get 200 identical bullets without 200 `Graphics`.

```ts
import { Sprite, Assets } from "pixi.js";

// From a loaded image file:
const texture = await Assets.load("/ship.png");
const s = new Sprite(texture);
s.anchor.set(0.5);        // 0.5,0.5 = the sprite's origin is its CENTER (crucial!)
s.x = 100; s.y = 100;
s.tint = 0xff8888;        // multiply the texture by a color — free recoloring
s.scale.set(1.5);

// From a Graphics we baked earlier (chapter 06):
const bulletTex = app.renderer.generateTexture(bulletGraphics);
const bullet = new Sprite(bulletTex);
bullet.anchor.set(0.5);
```

**`anchor` is the gotcha.** By default a sprite's origin is its top-left corner,
so `sprite.rotation` spins it around that corner. Set `anchor.set(0.5)` and the
origin becomes the center — which is what you want for ships, bolts and anything
that rotates or that you position by its middle. `Graphics` has no `anchor`; you
control its origin by where you place the geometry (draw the ship centered on
`0,0`).

---

## `Text`: the HUD

Score, lives and messages are `Text`. v8's constructor takes a **single options
object** (v7 took positional `text, style` args):

```ts
import { Text } from "pixi.js";

const score = new Text({
  text: "SCORE 0",
  style: {
    fontFamily: "monospace",
    fontSize: 20,
    fill: 0xffffff,
    letterSpacing: 2,
  },
});
score.x = 16; score.y = 12;

// update it by assigning the string:
score.text = "SCORE 1200";
```

`Text` renders the string to a texture under the hood, so **changing `.text`
every frame is comparatively expensive** — fine for a score that ticks
occasionally, wasteful for a per-frame timer. Chapter 12 keeps HUD updates to when
values actually change.

---

## The `Ticker`: the frame clock

`app.ticker` fires a callback once per rendered frame (driven by
`requestAnimationFrame`). This is the heartbeat we hang the whole simulation off.

```ts
app.ticker.add((ticker) => {
  const frames = ticker.deltaTime;   // elapsed time in *60fps frames* (≈1.0 at 60fps, ≈2.0 at 30fps)
  const ms     = ticker.deltaMS;     // elapsed time in milliseconds (≈16.7 at 60fps)
  // ...advance the game...
});
```

Two deltas, and the distinction matters:

- **`deltaMS`** — real milliseconds since the last frame. Divide by 1000 for
  seconds. **This is what we feed the simulation**, because "seconds" is a unit
  that means the same thing on every machine.
- **`deltaTime`** — the same interval expressed in *how many 60fps-frames it
  was worth*. Convenient for quick "move N pixels per frame" tweaks (like chapter
  01's demo), but frame-relative. We'll build the loop on `deltaMS`/seconds.

Either way, **multiply movement by delta** so speed is independent of frame rate.
Never write `x += 2` in a ticker — a 144Hz monitor would move you 2.4× faster than
a 60Hz one.

### Update priority (the render-order trick)

`ticker.add` takes an optional priority. `Application` registers its own **render**
at `UPDATE_PRIORITY.LOW`, and **higher priority runs first**, so any callback you
add at the default `NORMAL` priority runs *before* PixiJS draws:

```
your update (NORMAL = 0)   → runs first
PixiJS render  (LOW = -25) → runs after, drawing whatever your update left behind
```

That ordering is exactly what we need: simulate, sync transforms, *then* let
PixiJS draw. We lean on it in chapter 07; for now just know the render happens
automatically, after your callbacks, every frame.

---

## Handling resize

Because we passed `resizeTo`, PixiJS keeps the canvas matched to the element and
updates `app.screen`. Our gameplay reads `app.screen.width/height` (via a
`Bounds` resource, chapter 05) so the play area follows the window. If you need to
react to a resize — reposition the HUD, re-clamp the player — listen on the
renderer:

```ts
app.renderer.on("resize", (width, height) => {
  // width/height are CSS pixels; reposition UI here
});
```

For a fixed-size retro game you'd instead pass `width`/`height` to `init` and
letterbox with CSS. We go responsive; chapter 12's HUD anchors to the corners.

---

## The v7 → v8 cheat sheet

If you find an old tutorial (most are v7), these are the changes that will trip
you up. We use the v8 forms throughout:

| Concept | v7 | v8 (what we use) |
| --- | --- | --- |
| Create app | `new Application({...})` (sync) | `new Application(); await app.init({...})` |
| Canvas element | `app.view` | **`app.canvas`** |
| Fill a shape | `g.beginFill(c); g.drawRect(...); g.endFill()` | **`g.rect(...).fill(c)`** |
| Circle / poly | `g.drawCircle(...)`, `g.drawPolygon(...)` | **`g.circle(...)`, `g.poly(...)`** |
| Stroke | `g.lineStyle(w, c)` | **`g.stroke({ width, color })`** |
| Node name | `container.name` | **`container.label`** |
| Text | `new Text(str, style)` | **`new Text({ text, style })`** |
| Load assets | `Loader`/`resources` | **`await Assets.load(url)`** |
| Base/normal texture split | `BaseTexture` + `Texture` | unified **`TextureSource`** + `Texture` |
| Particles | `ParticleContainer` of sprites | **`ParticleContainer` of `Particle`** (ch. 06) |

---

## What we did *not* cover (on purpose)

Filters (blur/glow), spritesheets, `BitmapText`, masks, render textures for
post-processing, tilemaps, and the interaction/event system beyond a couple of
uses. They're all in the [PixiJS guides](https://pixijs.com/8.x/guides); none is
needed to ship Space Impact, and chapter 13 points at the ones worth adding.

You now know the renderer. Next we get the **math and the frame** straight — the
2D coordinate system, a tiny vector, and the fixed-timestep loop that makes
collisions trustworthy — before we build the ECS that drives all of it.

*Next → [Chapter 03: The math & the frame](03-the-math-and-the-frame.md)*
