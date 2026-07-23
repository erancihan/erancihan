# 13 · HUD & feedback 🛠️

> **You'll leave this chapter with:** how to draw 2D directly on top of a 3D scene
> in normalised device coordinates, **the Vulkan Y-down twist** that the 3D
> projection hid but the HUD can't, the aspect-ratio gotcha that squashes naive
> HUDs, and where you'd add real text — reading `HUD.cpp` and `Renderer::drawHUD`.

---

## Screen space, not world space

The HUD doesn't live in the world — it's painted flat over the finished 3D image.
So it skips the whole model/view/projection chain and gives positions **directly in
clip space** (a.k.a. normalised device coordinates). We author it in the familiar
convention — X and Y each run −1 to +1, origin at the centre, **+Y up** — and fix
Vulkan's flip in one place, the shader.

The HUD vertex is dead simple — a 2D position and a color, no normal, no matrix:

```cpp
struct HUDVertex { glm::vec2 position; glm::vec4 color; };
```

### The Vulkan Y-down twist

Here's the one place Vulkan's downward NDC (chapter 03) leaks into gameplay code.
For the **3D** scene we hid it inside `Math::perspective` with `p[1][1] *= -1`, so
world geometry comes out right-side-up. But the HUD writes clip space *directly*,
with no projection matrix to carry that flip. So the HUD shader applies the flip
itself, letting us author in the same +Y-up coordinates the Metal guide used:

```glsl
// hud.vert
layout(location = 0) in vec2 inPos;      // authored with +Y up, like everyone expects
layout(location = 1) in vec4 inColor;
layout(location = 0) out vec4 vColor;

void main() {
    gl_Position = vec4(inPos.x, -inPos.y, 0.0, 1.0);   // ← negate Y for Vulkan's NDC
    vColor      = inColor;
}
```

That single `-inPos.y` is the whole story: author `(0, +0.9)` as "near the top,"
and the flip lands it at the top on screen. Forget it and your HUD is mirrored
top-to-bottom while the 3D world looks fine — a confusing bug precisely because the
two use *different* paths to clip space. Keep the flip in the HUD shader and every
coordinate below reads exactly like the Metal guide.

---

## Everything is a rectangle

We have no fonts and no textures, so every HUD element is built from colored
rectangles, and each rectangle is two triangles. One helper does it:

```cpp
static void appendRect(std::vector<HUDVertex>& out,
                       float cx, float cy, float hw, float hh, glm::vec4 color) {
    glm::vec2 tl{cx-hw, cy+hh}, tr{cx+hw, cy+hh}, bl{cx-hw, cy-hh}, br{cx+hw, cy-hh};
    for (auto p : {tl, bl, br,  tl, br, tr})           // two triangles, 6 vertices
        out.push_back({p, color});
}
```

`HUD::build` assembles the whole overlay into one flat `std::vector<HUDVertex>`,
which `Renderer::drawHUD` uploads and draws in a single call. Three elements:

### The reticle

A cyan cross at the centre — a wide-thin rectangle over a tall-thin one:

```cpp
appendRect(v, 0, 0, 0.035f / aspect, 0.004f, cyan);   // horizontal bar
appendRect(v, 0, 0, 0.004f / aspect, 0.035f, cyan);   // vertical bar
```

### The hull bar

Bottom-left, drawn as a dark background rectangle with a colored fill on top. The
fill's width tracks health, and its color slides green→red as hull drops:

```cpp
float frac = glm::clamp(stats.playerHealth / stats.playerMaxHealth, 0.0f, 1.0f);
appendRect(v, barX, barY, barHW, barHH, darkBackground);
glm::vec4 fill{1 - frac, 0.2f + 0.7f * frac, 0.25f, 0.95f};   // red when low, green when full
appendRect(v, barX - barHW + barHW * frac, barY, barHW * frac, barHH, fill);
```

Anchoring the fill at the bar's left edge is why it drains from the right instead of
shrinking toward its centre.

### The damage flash

When you're rammed, `CollisionSystem` sets `stats.hitFlash = 0.5`. The HUD draws a
full-screen red rectangle whose alpha fades with the remaining time, and
`Game::update` ages it out with `dt`:

```cpp
if (stats.hitFlash > 0) {
    float a = 0.35f * std::min(stats.hitFlash / 0.5f, 1.0f);
    appendRect(v, 0, 0, 1, 1, glm::vec4(1, 0.1f, 0.1f, a));   // whole screen
}
```

It's appended **first** so everything else layers on top of it.

---

## Two details that make it correct

**Aspect correction.** Clip space is square (−1…1 both axes) but your window is
wide, so a rectangle that's `0.035` in both X and Y renders *wider* than it is tall
— a squashed, non-square reticle. Dividing the X extents by the aspect ratio
(`0.035f / aspect`) cancels the window's stretch and keeps the cross square at any
size. The hull bar is a long horizontal thing, so we leave it un-corrected on
purpose.

**Painter's order + no depth.** The HUD uses the `hud` pipeline (chapter 06), which
bakes in **no depth test** (`depthTestEnable = FALSE`, so it ignores the depth
buffer and always draws over the scene) and **alpha blending** (so the flash and bar
are translucent). Within the HUD, order in the array *is* the layering — flash,
then bar, then reticle on top. This is the classic 2D painter's model: back to
front, no depth test. (Note that in Vulkan these two facts are frozen into the
pipeline, not toggled per draw — the depth-and-blend decision we made once in
chapter 06.)

`Renderer::drawHUD` is the whole render side — copy the vertices into the frame's
mapped HUD buffer, bind the pipeline, draw:

```cpp
memcpy(hudBuffers[currentFrame].mapped, v.data(), v.size() * sizeof(HUDVertex));
vkCmdBindPipeline(cmd, VK_PIPELINE_BIND_POINT_GRAPHICS, hudPipeline);
vkCmdBindVertexBuffers(cmd, 0, 1, &hudBuffers[currentFrame].buffer, &zeroOffset);
vkCmdDraw(cmd, (uint32_t)v.size(), 1, 0, 0);          // non-indexed, one instance
```

Like the instance buffer (chapter 07), the HUD buffer is **per frame-in-flight** and
host-visible — the CPU writes this frame's overlay while the GPU may still be
reading last frame's.

---

## The elephant: text

You've noticed there are no *numbers* on screen. Score, hull % and deaths go in the
**window title** instead (`glfwSetWindowTitle` in the game loop), because real text
rendering is a genuine detour we deliberately skipped. When you want it, here are
the honest options, cheapest first:

- **A separate UI library.** [Dear ImGui](https://github.com/ocornut/imgui) has a
  first-class Vulkan backend and gives you text, panels and debug widgets in an
  afternoon. Ideal for a score readout and live tuning sliders; it renders in its
  own pass after yours.
- **Bake glyphs to a texture atlas.** Render a font once into a texture, then draw
  each character as a textured quad (UV into the atlas). This is how most engines do
  HUD text — fast, in-pipeline, and it composes with everything. More setup: an
  atlas, a texture descriptor, and a textured HUD pipeline (your first *sampler*
  descriptor, which chapter 14's roadmap touches).
- **Signed-distance-field (SDF) fonts.** Store glyphs as distance fields so they
  stay crisp at any scale and get cheap outlines/glow. The standard for scalable
  in-engine text; the most work to set up.

For a prototype, the window title is a completely reasonable answer — it keeps the
HUD chapter about *drawing*, not font engineering. Reach for ImGui the moment you
want a real readout, and the atlas approach when text must live inside your own
pipeline.

---

## Why the HUD is data, too

`HUD::build` takes `GameStats` and an aspect ratio and returns a vector of vertices
— a pure function, no state, no side effects. It doesn't poke the renderer; it
produces data the renderer consumes, exactly like `RenderSystem` produces
`InstanceData`. Same seam, same discipline: gameplay computes *what to show*, the
renderer decides *how to draw it*.

---

**Next:** from prototype to real game — the Vulkan-flavoured roadmap. →
[Chapter 14: Where to go next](14-where-to-go-next.md)
