# 13 · HUD & feedback 🛠️

> **You'll leave this chapter with:** a reticle, a hull bar that drains, and a
> red flash when you are hit — drawn flat over the 3D scene in clip space, using
> the pipeline and buffer that have been waiting since chapters 06 and 07.B.
>
> **Files created:** `src/HUD.{hpp,cpp}`. `src/Game.cpp`,
> `src/render/Renderer.cpp` and `CMakeLists.txt` grow.

Everything the game knows, it currently tells you through the window title. This
chapter puts the two numbers that matter mid-dogfight — where am I pointing, how
dead am I — onto the screen itself.

---

## Screen space, not world space

The HUD does not live in the world. It is painted flat over the finished 3D
image, so it skips the whole model/view/projection chain and gives positions
**directly in clip space**: X and Y from −1 to +1, origin at the centre.

Chapter 03's rule 4 says Vulkan's clip-space +Y points *down* — but chapter
07.A's `hud.vert` already negates Y precisely so this chapter never has to think
about it. We author with **+Y up**, like everyone expects: `(0, +0.9)` is near
the top of the screen, and the shader makes it so.

The interface is one pure function:

**`src/HUD.hpp`** — new file:

```cpp
#pragma once

#include "GameState.hpp"
#include "render/RenderTypes.hpp"

#include <vector>

namespace HUD {

/// A pure function: game numbers in, clip-space triangles out. Authored with
/// +Y up; hud.vert flips Y for Vulkan's downward NDC.
std::vector<HUDVertex> build(const GameStats& stats, float aspect);

} // namespace HUD
```

`GameStats` in, vertices out, no state, no side effects — the same seam
discipline as `RenderSystem::collect`. Gameplay computes *what to show*; the
renderer decides *how to draw it*. Neither knows the other exists.

---

## Everything is a rectangle

No fonts, no textures: every HUD element is coloured rectangles, and each
rectangle is two triangles. One helper builds them all:

**`src/HUD.cpp`** — new file:

```cpp
#include "HUD.hpp"

#include <algorithm>

namespace {

constexpr float kBarX = -0.72f;
constexpr float kBarY = -0.86f;
constexpr float kBarHalfWidth = 0.22f;
constexpr float kBarHalfHeight = 0.022f;
constexpr float kFlashSeconds = 0.5f;
constexpr float kReticleArm = 0.035f;
constexpr float kReticleThickness = 0.004f;

} // namespace
```

All clip-space fractions: the bar sits at `x = -0.72, y = -0.86` — bottom-left,
whatever the window's pixel size. `kFlashSeconds` duplicates the constant in
`CollisionSystem` deliberately: one is *how long the flash lasts* (gameplay),
this one is *what fraction of it remains* (presentation), and today they happen
to agree.

**`HUD.cpp`**, in the anonymous namespace — after the constants:

```diff
 constexpr float kReticleArm = 0.035f;
 constexpr float kReticleThickness = 0.004f;
+
+void appendRect(std::vector<HUDVertex>& out, float cx, float cy, float hw, float hh,
+                const glm::vec4& color) {
+    glm::vec2 tl{cx - hw, cy + hh};
+    glm::vec2 tr{cx + hw, cy + hh};
+    glm::vec2 bl{cx - hw, cy - hh};
+    glm::vec2 br{cx + hw, cy - hh};
+    for (const glm::vec2& p : {tl, bl, br, tl, br, tr}) out.push_back({p, color});
+}
 
 } // namespace
```

Centre plus half-extents, not corners — every caller below is positioning a
centred thing, so the interface matches the callers. The six vertices are two
counter-clockwise triangles; winding does not actually matter (the HUD pipeline
inherits `cullMode = NONE` like everything else), but consistency is free.

### The three elements, back to front

**`HUD.cpp`** — after the anonymous namespace:

```diff
 } // namespace
+
+namespace HUD {
+
+std::vector<HUDVertex> build(const GameStats& stats, float aspect) {
+    std::vector<HUDVertex> v;
+
+    // Appended first so everything else layers on top of it.
+    if (stats.hitFlash > 0.0f) {
+        float alpha = 0.35f * std::min(stats.hitFlash / kFlashSeconds, 1.0f);
+        appendRect(v, 0.0f, 0.0f, 1.0f, 1.0f, glm::vec4(1.0f, 0.1f, 0.1f, alpha));
+    }
+
+    return v;
+}
+
+} // namespace HUD
```

The damage flash: a full-screen rectangle whose alpha fades with the time
remaining — `CollisionSystem` set `hitFlash` to 0.5 on a ram, `Game::update` has
been ageing it toward zero since chapter 09, and the division turns that
countdown into a fade. The HUD pipeline blends with **alpha**, and within the
HUD, **order in the array is the layering** — this is the classic 2D painter's
model, no depth anywhere, so the flash goes in first to sit behind everything.

**`HUD.cpp`**, in `build` — after the flash, before the `return`:

```diff
         appendRect(v, 0.0f, 0.0f, 1.0f, 1.0f, glm::vec4(1.0f, 0.1f, 0.1f, alpha));
     }
+
+    float frac = glm::clamp(stats.playerHealth / stats.playerMaxHealth, 0.0f, 1.0f);
+    appendRect(v, kBarX, kBarY, kBarHalfWidth, kBarHalfHeight,
+               glm::vec4(0.05f, 0.06f, 0.09f, 0.80f));
+    glm::vec4 fill{1.0f - frac, 0.2f + 0.7f * frac, 0.25f, 0.95f};
+    appendRect(v, kBarX - kBarHalfWidth + kBarHalfWidth * frac, kBarY,
+               kBarHalfWidth * frac, kBarHalfHeight, fill);
 
     return v;
 }
```

The hull bar is a dark background with a coloured fill on top. Two details are
doing quiet work. The fill's colour is *computed*, not picked: `1 - frac` red
against `0.2 + 0.7·frac` green slides continuously from green at full hull to
red at empty, with amber in the middle — a three-stop gradient for the price of
two multiplies. And the fill's **centre moves as it shrinks**:
`kBarX - kBarHalfWidth + kBarHalfWidth * frac` keeps its left edge pinned to the
background's left edge, so the bar drains from the right like a gauge. Centre it
at `kBarX` instead and it shrinks toward its own middle, which reads as "both
ends leaking" — try it once at the checkpoint.

**`HUD.cpp`**, in `build` — after the hull bar:

```diff
     appendRect(v, kBarX - kBarHalfWidth + kBarHalfWidth * frac, kBarY,
                kBarHalfWidth * frac, kBarHalfHeight, fill);
+
+    glm::vec4 cyan{0.35f, 0.95f, 1.0f, 0.90f};
+    appendRect(v, 0.0f, 0.0f, kReticleArm / aspect, kReticleThickness, cyan);
+    appendRect(v, 0.0f, 0.0f, kReticleThickness / aspect, kReticleArm, cyan);
 
     return v;
 }
```

The reticle: a wide-thin rectangle crossed with a tall-thin one, dead centre —
which is exactly where chapter 11's camera aims, so the cross sits on the point
your nose is headed toward.

That **`/ aspect`** on the X extents is the correction naive HUDs skip. Clip
space is square — −1 to +1 both axes — but the window is wide, so one clip-space
unit covers more pixels horizontally than vertically, and an "0.035 by 0.035"
cross renders as a squashed plus sign. Dividing the X extents by the aspect
ratio cancels the stretch and keeps the cross square at any window size. The
hull *bar* is left uncorrected on purpose: it is a long horizontal thing, and
stretching with the window is what you want from it.

---

## Wiring: the last pass, the last lines

Three files each take a small edit. The renderer first — pass 5 of the draw
order chapter 08 left a comment-shaped hole for:

**`Renderer.cpp`**, in `recordFrame` — after the bolt loop, before
`vkCmdEndRenderPass`:

```diff
     vkCmdBindPipeline(cmd, VK_PIPELINE_BIND_POINT_GRAPHICS, boltPipeline);
     for (const DrawGroup& g : groups)
         if (g.mesh == MeshID::Bolt) drawMeshGroup(cmd, g);
+
+    // 5. HUD — no depth, alpha blended, always on top
+    if (hudVertexCount > 0) {
+        vkCmdBindPipeline(cmd, VK_PIPELINE_BIND_POINT_GRAPHICS, hudPipeline);
+        VkDeviceSize zero = 0;
+        vkCmdBindVertexBuffers(cmd, 0, 1, &hudBuffers[currentFrame].buffer, &zero);
+        vkCmdDraw(cmd, hudVertexCount, 1, 0, 0);
+    }
 
     vkCmdEndRenderPass(cmd);
```

Note what this pass does *not* do: no descriptor set, no index buffer, no
instancing — a plain `vkCmdDraw` of `hudVertexCount` vertices from the
per-frame-slot buffer that `uploadFrameData` has been filling (and clamping to
`kMaxHudVertices`) since chapter 08. The `hudPipeline` bakes in `DepthMode::Off`
and `BlendMode::Alpha` from chapter 07.B, so "always on top" and "translucent"
are not decisions made here — they were made once, at pipeline creation, and
this pass just binds the object that carries them.

Everything upstream has been waiting: the buffer since chapter 06, the pipeline
since 07.B, the upload and clamp since 08. This chapter's whole render-side
contribution is six lines, which is what it looks like when the seams were cut
in the right places.

**`Game.cpp`** — in the include block, after `Components.hpp`:

```diff
 #include "Components.hpp"
+#include "HUD.hpp"
 #include "Math.hpp"
```

**`Game.cpp`**, in `Game::update` — after the grid model, before the `return`:

```diff
     frame.gridModel = glm::translate(glm::mat4(1.0f), glm::vec3(gx, kGroundY, gz));
+
+    frame.hud = HUD::build(gameStats, aspect);
 
     return frame;
 }
```

**`CMakeLists.txt`**, in `add_executable` — after `src/Game.cpp`:

```diff
     src/Game.cpp
+    src/HUD.cpp
     src/render/VmaImplementation.cpp
```

---

## The elephant: text

You have noticed there are no *numbers* on screen — score, hull percent and
deaths live in the window title (`glfwSetWindowTitle`, chapter 09), and that was
a decision, not an oversight. Real text rendering is a genuine detour. When you
want it, the honest options, cheapest first:

- **Dear ImGui.** First-class Vulkan backend; text, panels and live tuning
  sliders in an afternoon. It renders in its own pass after yours and touches
  nothing you built.
- **A glyph atlas.** Render a font once into a texture, draw each character as a
  textured quad. This is how most engines do HUD text — but it is your first
  *texture*, which means your first sampler, your first image descriptor, and a
  textured variant of the HUD pipeline. A good project; not a paragraph.
- **Signed-distance-field fonts.** Crisp at any scale, cheap outlines and glow.
  The standard for in-engine text, and the most setup of the three.

For a prototype, the title bar is a perfectly good scoreboard — it keeps this
chapter about *drawing*, and it updates four times a second whether you look or
not.

---

## Checkpoint

```console
$ cmake -S . -B build && cmake --build build && cd build && ./SpaceFighter
[vulkan] using NVIDIA GeForce RTX 4070 (Vulkan 1.3)
[swapchain] 1280x720  format 50  3 images
```

A cyan **cross dead centre** — square arms, however you resize the window — and
a **green bar bottom-left**. Fly into an enemy on purpose: the screen blooms
red and fades over half a second, and the bar steps down a fifth of its length,
its colour sliding toward amber. Two more rams and it is short and red. One more
and it snaps back to full green as the field clears — that is `respawn`, and the
title's `deaths` ticks up. Validation: silent throughout.

| Symptom | Likely cause |
|---|---|
| No HUD at all | `frame.hud = HUD::build(...)` missing in `Game::update`, or the renderer's pass 5 edit skipped — `hudVertexCount` stays 0 either way. |
| HUD at the top of the screen instead of the bottom | The `-inPosition.y` flip fell out of `hud.vert` — chapter 07.A's one character, and the 3D world looks fine without it, which is the confusing part. |
| Reticle is a squashed plus sign | A `/ aspect` missing from the X extents. |
| Bar shrinks from both ends | The fill is centred at `kBarX` — the moving-centre expression got simplified away. |
| Flash never fades | `hitFlash` isn't aged — chapter 09's `gameStats.hitFlash = max(0, hitFlash - dt)` line lost. |
| Flash draws over the reticle | Element order in `build` changed; within the HUD, array order is the only layering there is. |
| HUD flickers or shows stale shapes | The upload writes a different frame-slot's buffer than the draw binds — both must index `currentFrame`. |

**Try breaking it on purpose.** In `build`, move the flash block to the *end* of
the function and ram an enemy: reticle and hull bar vanish behind the red wash
for half a second — during exactly the moment the player most wants to see their
hull. Painter's order is a real interface decision, not bookkeeping. Move it
back.

---

## Why the HUD is data, too

`HUD::build` takes game state and returns vertices. It does not poke the
renderer; it produces data the renderer consumes — the same seam as
`RenderSystem` producing `InstanceData`. The whole simulation-to-screen story is
now three pure handoffs: systems write components, `collect` and `build` package
them as `FrameData`, the renderer draws `FrameData`. Nothing reaches backward.

---

## Challenge

Add off-screen enemy indicators: a small triangle at the screen edge pointing
toward each enemy the camera cannot see.

Three things to get right. Project the enemy through the same `viewProjection`
the frame uses and check `w` **before** dividing — a point behind the camera has
negative `w`, and dividing by it reflects the position through the screen's
centre, so your indicator points exactly the wrong way for exactly the enemies
you most need warning about. Clamp the projected direction to the screen
rectangle in *aspect-corrected* space or the indicators will hug the top and
bottom edges more tightly than the sides. And build the triangle's rotation in
2D, from `atan2` of the clamped direction, *before* the aspect correction is
applied to its vertices — rotate after correcting and the triangle shears as it
turns.

---

**Next:** what this prototype taught, and the road from here — dynamic
rendering, pipeline caches, real assets, and everything else worth doing next. →
[Chapter 14: Where to go next](14-where-to-go-next.md)
