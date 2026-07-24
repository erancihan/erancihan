# 03 · The math & the frame 🧠

> **You'll leave this chapter with:** the 2D coordinate system straight in your
> head, a tiny `Vec2` toolkit (`src/engine/math.ts`), a real understanding of
> **fixed vs variable timestep** and why our collisions depend on it, and the two
> overlap tests the whole game runs on.

This is the last chapter before we build the ECS. It's short, and it's all reused.

---

## The screen is y-down

Web canvases — and therefore PixiJS — put the origin `(0, 0)` at the **top-left**,
with **x growing right and y growing *down***. This is the opposite of the math
class you remember, and it has one consequence worth internalising:

- "Up" is **negative y**. A ship moving up has `velocity.y < 0`.
- Positive rotation (`Math.PI / 2`) turns **clockwise**, not counter-clockwise,
  because the y-axis is flipped.

For Space Impact this is mostly comfortable — the player flies left-to-right,
enemies come from the right (higher x) heading toward lower x, gravity (if we had
it) would be positive y. Angles still work with `Math.atan2(dy, dx)`; just
remember `dy` is screen-down. Everywhere we compute "aim at the player", the
y-down system takes care of itself as long as we're consistent.

```
(0,0) ──────────────► +x
  │      ┌─────┐
  │      │ ship│   "up" = -y
  │      └─────┘
  ▼
 +y
```

---

## A tiny vector — `src/engine/math.ts`

We don't need a matrix library for a 2D shmup — just 2D vectors and a couple of
helpers. Create **`src/engine/math.ts`**:

```ts
// src/engine/math.ts
// Minimal 2D math. Vec2 is a plain { x, y } so it's cheap to store in components
// and trivial to log. The functions are pure — they return new vectors — except
// where a comment says otherwise.

export interface Vec2 {
  x: number;
  y: number;
}

export const vec2 = (x = 0, y = 0): Vec2 => ({ x, y });

export function add(a: Vec2, b: Vec2): Vec2 { return { x: a.x + b.x, y: a.y + b.y }; }
export function sub(a: Vec2, b: Vec2): Vec2 { return { x: a.x - b.x, y: a.y - b.y }; }
export function scale(a: Vec2, s: number): Vec2 { return { x: a.x * s, y: a.y * s }; }
export function dot(a: Vec2, b: Vec2): number { return a.x * b.x + a.y * b.y; }

export function length(a: Vec2): number { return Math.hypot(a.x, a.y); }
export function distance(a: Vec2, b: Vec2): number { return Math.hypot(a.x - b.x, a.y - b.y); }

/** Unit vector in the same direction. Returns (0,0) for the zero vector. */
export function normalize(a: Vec2): Vec2 {
  const len = Math.hypot(a.x, a.y);
  return len === 0 ? { x: 0, y: 0 } : { x: a.x / len, y: a.y / len };
}

/** A vector of `magnitude` pointing at `radians` (0 = +x / right). */
export function fromAngle(radians: number, magnitude = 1): Vec2 {
  return { x: Math.cos(radians) * magnitude, y: Math.sin(radians) * magnitude };
}

/** The angle (radians) a vector points at, via atan2 — handles all quadrants. */
export function angleOf(a: Vec2): number { return Math.atan2(a.y, a.x); }

export function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }

export function clamp(n: number, lo: number, hi: number): number {
  return n < lo ? lo : n > hi ? hi : n;
}

/**
 * Smallest signed rotation (radians) to turn heading `from` toward `to`,
 * wrapped into (-π, π]. Used by the homing missile so it turns the short way.
 */
export function angleDelta(from: number, to: number): number {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
```

That's the whole toolkit. `Vec2` is a plain object, not a class, on purpose:
components store thousands of these and a plain `{x, y}` is the cheapest thing to
allocate and the easiest to read in a debugger.

---

## Delta time, once more, precisely

Movement must scale with elapsed time or the game runs at the monitor's refresh
rate. The unit we commit to is **seconds**:

```ts
const dt = ticker.deltaMS / 1000;   // seconds since last frame (~0.0167 at 60fps)
transform.x += velocity.x * dt;     // velocity is in pixels-per-second
```

Now `velocity.x = 260` means "260 pixels per second" on every machine. Every
speed, cooldown and lifetime in this guide is in **seconds / per-second** for
exactly this reason.

---

## Fixed vs variable timestep (this matters)

Here's the subtle problem. If you feed the *raw* frame delta straight into the
simulation, `dt` varies frame to frame — 16ms, then a 40ms hitch when the GC
runs, then 16ms. For movement that's harmless (you move a bit further that
frame). For **collisions it's a bug generator**:

- A bullet moving 900 px/s advances **15 px** in a 16ms frame but **36 px** in a
  40ms hitch. If an enemy is only 20 px wide, the bullet can **skip clean through
  it** on the long frame — the classic "tunnelling" miss.
- Anything you'd want to be **reproducible** (a replay, a deterministic wave
  pattern, netcode later) can't be, because the simulation depends on exactly how
  long each frame happened to take.

The fix is the **fixed-timestep accumulator** (Glenn Fiedler's "Fix Your
Timestep!"): render as fast as the browser wants, but advance the *simulation* in
constant slices of, say, `1/60` second. You bank real elapsed time and spend it
one fixed step at a time:

```ts
const STEP = 1 / 60;          // simulate in 60 discrete steps per second
let accumulator = 0;

app.ticker.add((ticker) => {
  // 1. bank the real time that elapsed
  accumulator += ticker.deltaMS / 1000;

  // 2. guard the "spiral of death": if the tab was backgrounded for 5s we do NOT
  //    want to run 300 steps to catch up. Cap the debt and move on.
  if (accumulator > 0.25) accumulator = 0.25;

  // 3. spend it in fixed slices — the simulation only ever sees dt = STEP
  while (accumulator >= STEP) {
    simulate(STEP);           // every system runs with the SAME dt, always
    accumulator -= STEP;
  }

  // 4. (PixiJS renders automatically after this callback)
});
```

Now the bullet always advances the same 15 px per step regardless of frame rate,
collisions are consistent, and the world is deterministic given the same inputs.
The cost is one concept and a `while` loop — cheap insurance. Chapter 07 wires
this to the real `World` and `Schedule`.

> **Interpolation (we skip it):** purists render at a blend between the last two
> fixed states so motion is perfectly smooth even when the fixed rate and refresh
> rate disagree. At 60Hz fixed / 60Hz display — the common case — the difference
> is invisible, so we render entities at their current simulation position and
> move on. Chapter 13 notes where you'd add interpolation if you push the fixed
> rate below the refresh rate.

---

## The only two overlap tests we need

Space Impact collisions are forgiving arcade collisions — nobody needs
pixel-perfect hitboxes. Two cheap tests cover everything.

### Circle vs circle (what we actually use)

Two circles overlap when the distance between their centers is at most the sum of
their radii. Compare **squared** distances so there's no `sqrt`:

```ts
// add to src/engine/math.ts
export function circlesOverlap(
  ax: number, ay: number, ar: number,
  bx: number, by: number, br: number,
): boolean {
  const dx = ax - bx;
  const dy = ay - by;
  const r = ar + br;
  return dx * dx + dy * dy <= r * r;
}
```

Circles are the right primitive for a shmup: ships and bolts are roughly round,
the test is one comparison, and a slightly generous radius makes the game *feel*
fair (near-misses that graze read as hits, which players forgive more than
pixel-perfect clips that don't). Every collider in this game is a circle.

### AABB (in the toolbox, for UI and culling)

Axis-aligned boxes are handy for "is this off-screen?" culling and for
rectangular UI hit areas. Given centers and half-extents:

```ts
// add to src/engine/math.ts
export function boxesOverlap(
  ax: number, ay: number, ahw: number, ahh: number,
  bx: number, by: number, bhw: number, bhh: number,
): boolean {
  return Math.abs(ax - bx) <= ahw + bhw && Math.abs(ay - by) <= ahh + bhh;
}
```

We use `circlesOverlap` for gameplay in chapter 10 and `boxesOverlap` for the
off-screen cull in the lifetime system.

---

## Checkpoint

- [x] `src/engine/math.ts` exists with `Vec2`, the vector helpers, `clamp`,
      `angleDelta`, `circlesOverlap` and `boxesOverlap`.
- [x] You can explain why the simulation runs on a fixed `STEP`, not the raw
      frame delta.
- [x] "Up is negative y" is now reflexive.

That's every prerequisite. Now we build the thing this whole guide is named for:
the **Entity–Component–System**.

*Next → [Chapter 04: Designing the ECS](04-designing-the-ecs.md)*
