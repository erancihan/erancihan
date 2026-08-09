# 11 · HUD & feedback 🛠️

> **You'll leave this chapter with:** a reticle, a hull bar and a damage flash
> drawn straight over the 3D scene — and the last file in the project.
>
> **Files created:** `Sources/SpaceFighter/HUD.swift`
> **Files changed:** `Game.swift` (one line)

---

## Screen space, not world space

The HUD doesn't live in the world — it's painted flat over the finished 3D image.
So it skips the whole model/view/projection chain and gives positions **directly
in clip space** (a.k.a. normalised device coordinates): X and Y each run −1 to
+1, origin at the centre, +Y up. Bottom-left is `(−1, −1)`.

You already wrote both halves of the machinery for this. `HUDVertex` went into
`RenderTypes.swift` in chapter 05 — a 2D position and a colour, no normal, no
matrix:

```swift
struct HUDVertex { var position: SIMD2<Float>; var color: Vec4 }
```

And the shader from chapter 06 just wraps that 2D point into a 4D clip position
and passes the colour through — no transform at all:

```metal
vertex HUDInOut hud_vertex(uint vid [[vertex_id]], constant HUDVertex* verts [[buffer(0)]]) {
    out.position = float4(verts[vid].position, 0.0, 1.0);   // already in clip space
    out.color    = verts[vid].color;
}
```

`Renderer.drawHUD` is likewise already written and currently doing nothing,
because `Game.update` hands it an empty array. All that's left is to produce the
vertices.

---

## Everything is a rectangle

We have no fonts and no textures, so every HUD element is built from coloured
rectangles, and each rectangle is two triangles.

### Create `Sources/SpaceFighter/HUD.swift`

```swift
import simd

/// Builds the heads-up display as a flat list of coloured triangles in
/// normalised device coordinates (-1…1, origin centre, +Y up). No fonts, no
/// textures — just a crosshair, a hull bar, and a red flash when you're hit.
/// Numeric readouts (score, hull %) go in the window title to keep this simple.
enum HUD {
    static func build(stats: GameStats, aspect: Float) -> [HUDVertex] {
        var v: [HUDVertex] = []

        // Full-screen damage flash, drawn first so everything sits on top of it.
        if stats.hitFlash > 0 {
            let a = 0.35 * min(stats.hitFlash / 0.5, 1)
            appendRect(&v, cx: 0, cy: 0, hw: 1, hh: 1, color: Vec4(1, 0.1, 0.1, a))
        }

        // Reticle: a cyan cross at screen centre. Divide X extents by the aspect
        // ratio so it stays square on a wide window.
        let cyan = Vec4(0.4, 1.0, 0.9, 0.9)
        appendRect(&v, cx: 0, cy: 0, hw: 0.035 / aspect, hh: 0.004, color: cyan) // horizontal
        appendRect(&v, cx: 0, cy: 0, hw: 0.004 / aspect, hh: 0.035, color: cyan) // vertical

        // Hull bar, bottom-left. Background then fill; the fill shifts green->red
        // as the hull drops.
        let frac = max(0, min(stats.playerHealth / stats.playerMaxHealth, 1))
        let barX: Float = -0.72, barY: Float = -0.9
        let barHW: Float = 0.22, barHH: Float = 0.02
        appendRect(&v, cx: barX, cy: barY, hw: barHW, hh: barHH, color: Vec4(0.1, 0.1, 0.12, 0.7))
        let fillHW = barHW * frac
        let fillColor = Vec4(1 - frac, 0.2 + 0.7 * frac, 0.25, 0.95)
        appendRect(&v, cx: barX - barHW + fillHW, cy: barY, hw: fillHW, hh: barHH, color: fillColor)

        return v
    }

    /// Append two triangles forming an axis-aligned rectangle.
    private static func appendRect(_ out: inout [HUDVertex],
                                   cx: Float, cy: Float,
                                   hw: Float, hh: Float,
                                   color: Vec4) {
        let a = SIMD2<Float>(cx - hw, cy - hh)
        let b = SIMD2<Float>(cx + hw, cy - hh)
        let c = SIMD2<Float>(cx + hw, cy + hh)
        let d = SIMD2<Float>(cx - hw, cy + hh)
        out.append(HUDVertex(position: a, color: color))
        out.append(HUDVertex(position: b, color: color))
        out.append(HUDVertex(position: c, color: color))
        out.append(HUDVertex(position: a, color: color))
        out.append(HUDVertex(position: c, color: color))
        out.append(HUDVertex(position: d, color: color))
    }
}
```

### Reading the three elements

**The reticle** is a wide-thin rectangle crossed with a tall-thin one, both at
the origin.

**The hull bar** is a dark background rectangle with a coloured fill on top. The
fill's width tracks health and its colour slides green→red as hull drops.
Anchoring the fill at the bar's left edge (`barX - barHW + fillHW`) is why it
drains from the right instead of shrinking toward its own centre — a small detail
that looks obviously wrong if you get it backwards.

**The damage flash** is a full-screen red rectangle whose alpha fades with
`stats.hitFlash` — set to 0.5 by `CollisionSystem` when you're rammed, and aged
out by `Game.update` with `dt`. It's appended **first** so everything else layers
on top.

---

## Two details that make it correct

**Aspect correction.** Clip space is square (−1…1 on both axes) but your window
is wide, so a rectangle that's `0.035` in both X and Y renders *wider* than it is
tall — a squashed, non-square reticle. Dividing the X extents by the aspect ratio
cancels the window's stretch. The hull bar is a long horizontal thing, so we
leave it un-corrected on purpose.

**Painter's order + no depth.** The HUD pass uses the `noDepth` state
(`compare .always`, no write) so it ignores the depth buffer entirely and always
draws over the scene, and **alpha blending** so the flash and bar are
translucent. Within the HUD, order in the array *is* the layering — flash, then
bar, then reticle on top. Classic 2D painter's model: back to front, no depth
test.

---

## Update `Game.swift`

One line. In `update`, change the returned `hud` from an empty array to the built
one:

```swift
        return FrameRenderData(frame: frame,
                               instances: instances,
                               playerPosition: position,
                               hud: HUD.build(stats: stats, aspect: max(aspect, 0.01)))
```

---

## Checkpoint

```console
$ swift run
```

A cyan cross sits at screen centre and a hull bar sits bottom-left. Fly into an
enemy: the screen flashes red and fades over half a second, and the bar shortens
and shifts toward red. Take five hits and you respawn with a full green bar.

Two things to check specifically:

1. **Resize the window wide.** The reticle stays a square cross. Delete the
   `/ aspect` on the two reticle lines and resize again to see the squash it
   prevents.
2. **The bar drains rightward**, staying anchored at its left edge.

**If the HUD doesn't appear at all**, confirm you changed that `hud:` line in
`Game.update` — `Renderer.drawHUD` early-returns on an empty array.

---

## The elephant: text

You've noticed there are no *numbers* on screen. Score, hull % and deaths go in
the **window title** (`RenderCoordinator.draw`), because real text rendering is a
genuine detour. When you want it in-scene, the honest options, cheapest first:

- **Overlay an AppKit view.** Put an `NSTextField` or `CATextLayer` on top of the
  `MTKView`. Zero graphics code, perfect system text, fine for static labels. The
  catch: it's a separate layer, not part of your Metal frame, so it can't
  interleave with 3D or use your shaders.
- **Bake glyphs to a texture atlas.** Render the font once with Core Text into a
  texture, then draw each character as a textured quad (UV into the atlas). This
  is how most engines do HUD text — fast, in-pipeline, composes with everything.
  More setup: an atlas, UVs, and a textured HUD pipeline.
- **Signed-distance-field (SDF) fonts.** Store glyphs as distance fields so they
  stay crisp at any scale and get cheap outlines and glow. The standard for
  scalable in-engine text; the most work to set up.

For a prototype the window title is a perfectly reasonable answer — it keeps this
chapter about *drawing*, not font engineering.

---

## Why the HUD is data, too

`HUD.build` takes `GameStats` and an aspect ratio and returns an array of
vertices — a pure function, no state, no side effects. It doesn't poke the
renderer; it produces data the renderer consumes, exactly like `RenderSystem`
produces `InstanceData`. Same seam, same discipline: gameplay computes *what to
show*, the renderer decides *how to draw it*.

**And that's the whole game.** Every file from chapter 01's table now exists. Go
fly it for a few minutes before reading the last chapter — you earned it.

---

**Next:** from prototype to real game — the roadmap. →
[Chapter 12: Where to go next](12-where-to-go-next.md)
