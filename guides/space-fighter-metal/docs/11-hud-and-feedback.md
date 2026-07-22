# 11 · HUD & feedback 🛠️

> **You'll leave this chapter with:** how to draw 2D directly on top of a 3D
> scene in normalised device coordinates, the aspect-ratio gotcha that squashes
> naive HUDs, and where you'd add real text — reading
> `HUD.swift` and `Renderer.drawHUD`.

---

## Screen space, not world space

The HUD doesn't live in the world — it's painted flat over the finished 3D image.
So it skips the whole model/view/projection chain and gives positions **directly
in clip space** (a.k.a. normalised device coordinates): X and Y each run −1 to
+1, origin at the centre, +Y up. The bottom-left corner is `(−1, −1)`, the centre
is `(0, 0)`.

The HUD vertex is dead simple — a 2D position and a colour, no normal, no matrix:

```swift
struct HUDVertex { var position: SIMD2<Float>; var color: Vec4 }
```

and the shader just wraps the 2D point into a 4D clip position and passes the
colour through:

```metal
vertex HUDInOut hud_vertex(uint vid [[vertex_id]], constant HUDVertex* verts [[buffer(0)]]) {
    out.position = float4(verts[vid].position, 0.0, 1.0);   // already in clip space
    out.color    = verts[vid].color;
}
```

No transform at all. You place things by choosing coordinates in [−1, 1].

---

## Everything is a rectangle

We have no fonts and no textures, so every HUD element is built from coloured
rectangles, and each rectangle is two triangles. One helper does it:

```swift
private static func appendRect(_ out: inout [HUDVertex],
                               cx: Float, cy: Float, hw: Float, hh: Float, color: Vec4) {
    // four corners around (cx, cy), emitted as two triangles (6 vertices)
}
```

`HUD.build` assembles the whole overlay into one flat `[HUDVertex]` array, which
`Renderer.drawHUD` uploads and draws in a single call. Three elements:

### The reticle

A cyan cross at the centre — a wide-thin rectangle over a tall-thin one:

```swift
appendRect(&v, cx: 0, cy: 0, hw: 0.035 / aspect, hh: 0.004, color: cyan)  // horizontal bar
appendRect(&v, cx: 0, cy: 0, hw: 0.004 / aspect, hh: 0.035, color: cyan)  // vertical bar
```

### The hull bar

Bottom-left, drawn as a dark background rectangle with a coloured fill on top. The
fill's width tracks health, and its colour slides green→red as hull drops:

```swift
let frac = max(0, min(stats.playerHealth / stats.playerMaxHealth, 1))
appendRect(&v, cx: barX, cy: barY, hw: barHW, hh: barHH, color: darkBackground)
let fillColor = Vec4(1 - frac, 0.2 + 0.7 * frac, 0.25, 0.95)   // red when low, green when full
appendRect(&v, cx: barX - barHW + fillHW, cy: barY, hw: barHW * frac, hh: barHH, color: fillColor)
```

Anchoring the fill at the bar's left edge (`barX - barHW + fillHW`) is why it
drains from the right instead of shrinking toward its centre.

### The damage flash

When you're rammed, `CollisionSystem` sets `stats.hitFlash = 0.5`. The HUD draws
a full-screen red rectangle whose alpha fades with the remaining time, and
`Game.update` ages it out with `dt`:

```swift
if stats.hitFlash > 0 {
    let a = 0.35 * min(stats.hitFlash / 0.5, 1)
    appendRect(&v, cx: 0, cy: 0, hw: 1, hh: 1, color: Vec4(1, 0.1, 0.1, a))   // whole screen
}
```

It's drawn **first** in the array so everything else layers on top of it.

---

## Two details that make it correct

**Aspect correction.** Clip space is square (−1…1 both axes) but your window is
wide, so a rectangle that's `0.035` in both X and Y renders *wider* than it is
tall — a squashed, non-square reticle. Dividing the X extents by the aspect ratio
(`0.035 / aspect`) cancels the window's stretch and keeps the cross square at any
size. The hull bar is a long horizontal thing, so we leave it un-corrected on
purpose.

**Painter's order + no depth.** The HUD pass uses the `noDepth` state
(`compare .always`, no write) so it ignores the depth buffer entirely and always
draws over the scene, and it uses **alpha blending** so the flash and bar are
translucent. Within the HUD, order in the array *is* the layering — flash, then
bar, then reticle on top. This is the classic 2D painter's model: back to front,
no depth test (chapter 05).

`Renderer.drawHUD` is the whole render side — upload the vertices, draw triangles,
done:

```swift
let buffer = device.makeBuffer(bytes: hud, length: ..., options: .storageModeShared)!
enc.setVertexBuffer(buffer, offset: 0, index: 0)
enc.drawPrimitives(type: .triangle, vertexStart: 0, vertexCount: hud.count)
```

---

## The elephant: text

You've noticed there are no *numbers* on screen. Score, hull % and deaths go in
the **window title** instead (`RenderCoordinator.draw`), because real text
rendering is a genuine detour we deliberately skipped. When you want it, here are
the honest options, cheapest first:

- **Overlay an AppKit view.** Put an `NSTextField` (or a `CATextLayer`) on top of
  the `MTKView`. Zero graphics code, perfect system text, and fine for a
  score/among static labels. The catch: it's a separate layer, not part of your
  Metal frame, so it can't interleave with 3D or use your shaders.
- **Bake glyphs to a texture atlas.** Render the font once with Core Text into a
  texture, then draw each character as a textured quad (UV into the atlas). This
  is how most engines do HUD text — fast, in-pipeline, and it composes with
  everything. More setup: an atlas, UVs, and a textured HUD pipeline.
- **Signed-distance-field (SDF) fonts.** Store glyphs as distance fields so they
  stay crisp at any scale and get cheap outlines/glow. The standard for scalable
  in-engine text; the most work to set up.

For a prototype, the window title is a completely reasonable answer — it keeps
the HUD chapter about *drawing*, not font engineering. Reach for the atlas
approach when "simple shapes" stops being enough.

---

## Why the HUD is data, too

`HUD.build` takes `GameStats` and an aspect ratio and returns an array of
vertices — a pure function, no state, no side effects. It doesn't poke the
renderer; it produces data the renderer consumes, exactly like `RenderSystem`
produces `InstanceData`. Same seam, same discipline: gameplay computes *what to
show*, the renderer decides *how to draw it*.

---

**Next:** from prototype to real game — the roadmap. →
[Chapter 12: Where to go next](12-where-to-go-next.md)
