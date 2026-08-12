# 11 · HUD & feedback 🛠️

> **You'll leave this chapter with:** a reticle, a hull bar and a damage flash
> drawn over the 3D scene — and the last file in the project.
>
> **Files created:** `Sources/SpaceFighter/HUD.swift`
> **Files changed:** `Game.swift` (one line)

---

## Screen space, not world space

The HUD doesn't live in the world. It's painted flat over the finished 3D image,
so it skips the entire model/view/projection chain and gives positions **directly
in clip space**: X and Y each run −1 to +1, origin at the centre, +Y up.
Bottom-left is `(−1, −1)`.

You've already written both halves of the machinery. `HUDVertex` went into
`RenderTypes.swift` back in chapter 05 — a 2D position and a colour, no normal,
no matrix. The shader in 06.A widens the 2D point to 4D and passes the colour
through with no transform at all. And `Renderer.drawHUD` exists and is already
being called every frame; it just early-returns because `Game.update` hands it an
empty array.

So all that's left is producing the vertices. One file, one function.

---

## Everything is a rectangle

No fonts, no textures. Every element is coloured rectangles, and each rectangle
is two triangles.

**`Sources/SpaceFighter/HUD.swift`** — new file:

```swift
import simd

/// Builds the HUD as coloured triangles in normalised device coordinates.
/// A pure function: stats in, vertices out.
enum HUD {
    /// Append two triangles forming an axis-aligned rectangle.
    private static func appendRect(_ out: inout [HUDVertex],
                                   cx: Float, cy: Float,
                                   hw: Float, hh: Float,
                                   color: Vec4) {
        let a = SIMD2<Float>(cx - hw, cy - hh)
        let b = SIMD2<Float>(cx + hw, cy - hh)
        let c = SIMD2<Float>(cx + hw, cy + hh)
        let d = SIMD2<Float>(cx - hw, cy + hh)
    }
}
```

Centre plus half-extents rather than corners, because every element we want is
naturally described that way — "a bar 0.22 wide at this spot" beats computing two
corners. Those are the four corners, counter-clockwise from bottom-left.

Emitting them is two triangles sharing the diagonal `a`–`c`:

**`HUD.swift`**, in `appendRect` — after the four corners:

```diff
         let d = SIMD2<Float>(cx - hw, cy + hh)
+        out.append(HUDVertex(position: a, color: color))
+        out.append(HUDVertex(position: b, color: color))
+        out.append(HUDVertex(position: c, color: color))
+        out.append(HUDVertex(position: a, color: color))
+        out.append(HUDVertex(position: c, color: color))
+        out.append(HUDVertex(position: d, color: color))
     }
```

`a` and `c` each appear twice because they're the shared diagonal: six vertices,
no index buffer, because at this scale indices would cost more code than they
save.

Now the builder, outermost layer first:

**`HUD.swift`**, in `HUD` — before `appendRect`:

```diff
 enum HUD {
+    static func build(stats: GameStats, aspect: Float) -> [HUDVertex] {
+        var v: [HUDVertex] = []
+
+        if stats.hitFlash > 0 {
+            let a = 0.35 * min(stats.hitFlash / 0.5, 1)
+            appendRect(&v, cx: 0, cy: 0, hw: 1, hh: 1, color: Vec4(1, 0.1, 0.1, a))
+        }
+
+        return v
+    }
+
     /// Append two triangles forming an axis-aligned rectangle.
```

The damage flash: a full-screen red rectangle whose alpha fades with the time
remaining. `CollisionSystem` set `hitFlash = 0.5` when you were rammed, and
`Game.update` has been ageing it by `dt` ever since — this is the other end of
that wire.

Dividing by `0.5` normalises the remaining time to 0…1 so the fade is smooth
regardless of the starting value, and `0.35` caps peak opacity: a full-strength
red flash blinds you at exactly the moment you most need to see. The `min(…, 1)`
guards against a flash being re-triggered before the last one finished, which
would otherwise push alpha above the cap.

It's appended **first**, so everything else layers on top of it.

**`HUD.swift`**, in `build` — after the flash block:

```diff
             appendRect(&v, cx: 0, cy: 0, hw: 1, hh: 1, color: Vec4(1, 0.1, 0.1, a))
         }
+
+        let cyan = Vec4(0.4, 1.0, 0.9, 0.9)
+        appendRect(&v, cx: 0, cy: 0, hw: 0.035 / aspect, hh: 0.004, color: cyan)
+        appendRect(&v, cx: 0, cy: 0, hw: 0.004 / aspect, hh: 0.035, color: cyan)
 
         return v
```

A cross at screen centre: one wide-and-thin rectangle, one tall-and-thin.

Those `/ aspect` divisions are the detail that separates a HUD that looks
deliberate from one that looks broken. Clip space is square — −1…1 on both axes —
but your window is wider than it is tall, so a rectangle that's 0.035 in both
directions renders *wider* than it is tall. Dividing the X extents by the aspect
ratio cancels the window's stretch exactly, and the cross stays square at any
size.

**`HUD.swift`**, in `build` — after the reticle:

```diff
         appendRect(&v, cx: 0, cy: 0, hw: 0.004 / aspect, hh: 0.035, color: cyan)
+
+        let frac = max(0, min(stats.playerHealth / stats.playerMaxHealth, 1))
+        let barX: Float = -0.72, barY: Float = -0.9
+        let barHW: Float = 0.22, barHH: Float = 0.02
+        appendRect(&v, cx: barX, cy: barY, hw: barHW, hh: barHH, color: Vec4(0.1, 0.1, 0.12, 0.7))
+        let fillHW = barHW * frac
+        let fillColor = Vec4(1 - frac, 0.2 + 0.7 * frac, 0.25, 0.95)
+        appendRect(&v, cx: barX - barHW + fillHW, cy: barY, hw: fillHW, hh: barHH, color: fillColor)
 
         return v
```

A dark background rectangle with a coloured fill drawn over it. Three things are
doing work here.

The **clamp** on `frac` matters because hull can go negative — `CollisionSystem`
subtracts 20 without checking, and respawn only triggers on the next frame. Without
the clamp you'd briefly draw a rectangle with negative width.

The **colour ramp** `(1 - frac, 0.2 + 0.7 * frac, 0.25, …)` slides red up as green
slides down, so the bar goes green → yellow → red continuously. No thresholds, no
states — just two linear interpolations that cross.

The **anchor** is the subtle one. `barX - barHW + fillHW` puts the fill's *centre*
such that its left edge always sits at the bar's left edge, so it drains
rightward. Pass `barX` instead and the fill shrinks toward its own centre from
both sides, which reads as obviously wrong the instant you take damage.

The bar is deliberately *not* aspect-corrected: it's a long horizontal element,
and stretching with the window is what you want from it.

---

## Turn it on

**`Game.swift`**, in `update` — the last line of the project:

```diff
         return FrameRenderData(frame: frame,
                                instances: instances,
                                playerPosition: position,
-                               hud: [])
+                               hud: HUD.build(stats: stats, aspect: max(aspect, 0.01)))
     }
```

That's it. `Renderer.drawHUD` has been waiting since 06.B.

---

## Why the HUD draws correctly over everything

Two decisions from 06.B are what make this work, and they're worth collecting now
that you can see the result.

The HUD pass uses the **`noDepth`** state — compare `.always`, writes off — so it
ignores the depth buffer entirely and can never be occluded by geometry, no
matter how close a ship gets to the camera.

It uses **alpha blending**, which is the one blend mode where draw order matters
(averaging isn't commutative the way addition is). Within the HUD, order in the
array *is* the layering: flash, then bar background, then bar fill, then reticle
on top. That's the classic 2D painter's model — back to front, no depth test —
and it's why `build` appends in exactly that sequence.

---

## Checkpoint

```console
$ swift run
```

A cyan cross sits at screen centre and a hull bar bottom-left. Fly into an enemy:
the screen flashes red and fades over half a second, and the bar shortens and
shifts toward red. Take five hits and you respawn with a full green bar.

Check three things:

1. **Resize the window very wide.** The reticle stays a square cross. Then delete
   the `/ aspect` on those two lines and resize again to see the squash it's
   preventing.
2. **The bar drains rightward**, staying anchored at its left edge.
3. **The flash never fully blocks the view** even at its peak.

**If the HUD doesn't appear at all**, you missed the `hud:` line in
`Game.update` — `drawHUD` early-returns on an empty array. **If it appears but
the scene vanishes behind it**, the flash alpha cap is wrong or the rectangle is
opaque. **If the HUD is hidden behind geometry**, the HUD pass is using the wrong
depth state.

---

## The elephant: text

There are no *numbers* on screen. Score, hull and deaths go in the **window
title**, set in `RenderCoordinator.draw`.

That's a real limitation and worth being honest about rather than dressing up:
real text rendering is a genuine detour, and doing it properly would have made
this chapter about font engineering instead of drawing. The options, cheapest
first:

- **Overlay an AppKit view.** An `NSTextField` or `CATextLayer` on top of the
  `MTKView`. Zero graphics code, perfect system text, fine for static labels. The
  catch: it's a separate layer, not part of your Metal frame, so it can't
  interleave with 3D or use your shaders.
- **Bake glyphs into a texture atlas.** Render the font once with Core Text into a
  texture, then draw each character as a textured quad with UVs into the atlas.
  This is how most engines do HUD text — fast, in-pipeline, composes with
  everything. You need an atlas, UVs, and a textured HUD pipeline.
- **Signed-distance-field fonts.** Store glyphs as distance fields so they stay
  crisp at any scale and get cheap outlines and glow. The standard for scalable
  in-engine text, and the most setup.

For a prototype the title bar is a perfectly defensible answer. Reach for the
atlas when you want numbers that move with the thing they describe.

---

## Why the HUD is data, too

`HUD.build` takes stats and an aspect ratio and returns an array. No state, no
side effects, and it never touches the renderer — it produces data the renderer
consumes, exactly like `RenderSystem` produces `InstanceData`.

That's the same seam, for the fifth time: **gameplay computes what to show, the
renderer decides how to draw it.** `CollisionSystem` didn't set a flag on a HUD
object when you got hit; it recorded a number in `GameStats`, and something else
decided that number means a red rectangle.

**And that's the whole game.** Every file in chapter 01's table now exists. Go fly
it for a few minutes before the last chapter — you've earned it.

---

## Challenge

Add a **lock-on reticle**: when an enemy is near your line of fire, draw a small
box around it. The hard part isn't drawing — it's the projection. You have the
enemy's world position and `frame.viewProjection`; multiply, divide by `w`, and
you have its clip-space position, which is exactly the coordinate space this file
already works in.

Three things to work out. `HUD.build` currently receives only `GameStats`, so it
needs more input — decide whether to pass the world in (and what that does to
"pure function") or to have a system precompute screen positions. Anything behind
the camera has negative `w` and will project to a mirrored ghost in front of you
unless you reject it. And an enemy far off-axis projects outside −1…1, so you must
either clip it or clamp it to the screen edge as a directional indicator.

---

**Next:** from prototype to real game — the roadmap. →
[Chapter 12: Where to go next](12-where-to-go-next.md)
