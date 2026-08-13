# 11 · The camera 🛠️

> **You'll leave this chapter with:** a chase camera that follows the ship, an
> understanding of why we blend world-up with ship-up, and the small numbers that
> change the whole game feel.
>
> **Files created:** `src/systems/CameraSystem.hpp`. `src/Game.cpp` grows.

Chapter 10 ends with the ship flying out of a fixed frame. One system fixes that,
and it is the shortest one in the project — which is the point: a camera is not an
object in the world, it is *two vectors and a matrix*, recomputed each frame.

---

## A camera is just a view matrix

There is no camera entity. The "camera" is the **view matrix** we feed the
shaders (chapter 03), plus the eye position the starfield shader needs. Producing
both is one function that runs after the ship has moved:

**`src/systems/CameraSystem.hpp`** — new file:

```cpp
#pragma once

#include "Components.hpp"
#include "Math.hpp"
#include "ecs/World.hpp"

struct CameraResult {
    glm::mat4 view{1.0f};
    glm::vec3 eye{0.0f};
};

namespace CameraSystem {

constexpr float kDistanceBack = 13.0f;
constexpr float kHeightAbove = 4.2f;
constexpr float kLookAhead = 26.0f;
constexpr float kWorldUpWeight = 0.65f;
constexpr float kShipUpWeight = 0.35f;

} // namespace CameraSystem
```

Five constants, five decisions. The first three are the rig — where the camera
sits relative to the ship. The last two are the interesting ones, and they get
their own section below.

**`CameraSystem.hpp`**, in `namespace CameraSystem` — after the constants:

```diff
 constexpr float kWorldUpWeight = 0.65f;
 constexpr float kShipUpWeight = 0.35f;
+
+inline CameraResult compute(World& world, Entity player) {
+    Transform* t = world.get<Transform>(player);
+    if (!t) return {};
+
+    glm::vec3 fwd = Math::forward(t->rotation);
+    glm::vec3 shipUp = Math::up(t->rotation);
+
+    glm::vec3 eye = t->position - fwd * kDistanceBack + shipUp * kHeightAbove;
+    glm::vec3 center = t->position + fwd * kLookAhead;
+    glm::vec3 camUp = glm::normalize(glm::vec3(0.0f, 1.0f, 0.0f) * kWorldUpWeight
+                                   + shipUp * kShipUpWeight);
+
+    return {Math::lookAt(eye, center, camUp), eye};
+}
 
 } // namespace CameraSystem
```

Read the three placements:

- **`eye`** — start at the ship, back off along its own `forward` (so we are
  *behind* it however it is oriented), rise along its own `up`. That is the
  over-the-shoulder seat, and because both offsets use the ship's axes, the seat
  rolls and pitches with the ship instead of staying bolted to the world.
- **`center`** — look at a point **ahead of** the ship, not at the ship. Aiming
  26 units past it puts the ship in the lower-middle of frame and points the
  screen where you are *going*. Look at the ship itself and you fly staring at
  your own tail — try `kLookAhead = 0.0f` once, it is instantly worse.
- **`camUp`** — the blend, below.

`Math::lookAt` (chapter 03's `glm::lookAtRH`) turns eye/center/up into the view
matrix. Note there is **no Vulkan-specific correction anywhere in this file**.
The clip-space fixes — 0..1 depth, the Y-flip — live entirely in
`Math::perspective`, applied once when the projection is built. Sprinkle a flip
into the camera too and the two cancel: you would be upside down again, with
twice as much code to search for the reason. One flip, one place.

---

## The up-vector blend: banking without nausea

What should "up" be for the camera? Two tempting answers, both wrong at the
extremes:

- **World up `(0,1,0)`** — rock steady, but the camera ignores the ship's roll
  entirely. Bank hard into a turn and the screen does not react; chapter 10's
  auto-bank becomes invisible and the flight feels detached.
- **Ship up** — glued to the cockpit, so every roll spins the entire world around
  you. Immersive for about two seconds, then genuinely nauseating.

We blend, weighted toward the world: 65% keeps the horizon mostly level and
legible, 35% lets a bank *tilt* the view enough that you feel the turn. That
ratio is a real game-feel dial. After the checkpoint, try `1.0`/`0.0` and
`0.0`/`1.0` and feel both failure modes — thirty seconds each is enough — then
put the split back. Nudge toward ship-up for a wilder cockpit ride, toward
world-up for a calmer, more readable one.

One subtlety: the blend of two unit vectors is not unit length, which is why the
`glm::normalize` wraps it. `lookAt` orthogonalises its up-hint anyway, but
handing it a short vector near-parallel to `forward` degrades precision — free
insurance, one call.

---

## Wiring it in

**`Game.cpp`** — in the include block, before `systems/FlightControlSystem.hpp`:

```diff
 #include "Components.hpp"
 #include "Math.hpp"
+#include "systems/CameraSystem.hpp"
 #include "systems/FlightControlSystem.hpp"
```

**`Game.cpp`**, in `Game::update` — replace the fixed camera:

```diff
     FrameData frame;
     RenderSystem::collect(world, frame);
 
-    glm::vec3 eye{0.0f, 6.0f, 22.0f};
-    glm::mat4 view = Math::lookAt(eye, glm::vec3(0.0f), glm::vec3(0.0f, 1.0f, 0.0f));
+    CameraResult cam = CameraSystem::compute(world, player);
     glm::mat4 proj = Math::perspective(glm::radians(kFieldOfView), aspect, kNearPlane, kFarPlane);
-    frame.uniforms.viewProjection = proj * view;
-    frame.uniforms.cameraPosition = glm::vec4(eye, 1.0f);
+    frame.uniforms.viewProjection = proj * cam.view;
+    frame.uniforms.cameraPosition = glm::vec4(cam.eye, 1.0f);
```

**`Game.cpp`**, in `Game::update` — the grid focus, one word:

```diff
-    glm::vec3 focus = eye;
+    glm::vec3 focus = cam.eye;
     if (Transform* t = world.get<Transform>(player)) focus = t->position;
```

That second edit is chapter 09's promised one-word change. The camera runs
**after** the whole schedule — it reads the transform the systems finished
writing, so it can never lag the ship by a frame. It is not *in* the schedule
because it writes no components; it only reads.

`cameraPosition` mattering is worth noticing: the starfield shader (chapter
07.A) folds every star into the tile centred on that position. With the fixed
camera the sky never needed to re-tile. Now it does, every frame, and the same
uniform that was sitting there since chapter 06 starts earning its slot.

---

## Field of view, near and far

The other half of the camera is the projection, and its three constants have been
sitting unexplained in `Game.cpp` since chapter 09:

- **`kFieldOfView = 65`** is a comfortable middle. Widen it (85°+) and the sense
  of speed jumps as the periphery streaks past — a cheap boost effect would be to
  lerp FOV up while `Left Shift` is held. Narrow it and everything feels zoomed
  and slow.
- **`kNearPlane / kFarPlane = 0.1 / 1200`** is the depth range, and it is a
  budget, not a preference. Depth precision is spent mostly near the near plane;
  too wide a range and distant surfaces start z-fighting — flickering as two
  faces argue over which is in front. 1200 comfortably contains the star cube
  (span 220) and the grid (half-extent 400) without stretching precision thin.
  The classic mistake is `nearZ = 0.001` "to be safe", which burns almost the
  entire depth budget on the first metre in front of the camera.

---

## Checkpoint

```console
$ cmake --build build && cd build && ./SpaceFighter
[vulkan] using NVIDIA GeForce RTX 4070 (Vulkan 1.3)
[swapchain] 1280x720  format 50  3 images
```

**Now it is a game you sit inside.** The camera rides behind and above the ship;
yaw with `A` and the world tilts slightly into the turn as the auto-bank rolls
the ship and the up-blend passes 35% of that roll to the camera. Dive, and the
grid rushes up. The reticle is not there yet (chapter 13), but the ship sits
exactly where a reticle would want it — lower-middle, nose pointing at screen
centre.

Fly straight down into the grid. Nothing stops you — there is no collision with
the floor, and you fly through it and out the other side into a mirrored world
lit from below. That is not a bug to fix; it is a reminder that the grid is
scenery, not geometry.

| Symptom | Likely cause |
|---|---|
| Camera still fixed | The `CameraSystem::compute` edit didn't replace both uniform lines — `viewProjection` still built from the old `view`. |
| World spins wildly on roll | Up-weights swapped: ship-up at 0.65 world-up at 0.35 reads as "wild", full ship-up reads as "washing machine". |
| Horizon never tilts at all | `kShipUpWeight` is 0, or `camUp` passes world-up unblended. |
| Ship fills the screen / is a dot | `kDistanceBack` changed scale — it is in world units, and the ship is ~3 units long. |
| Stars pop or swim when turning | `cameraPosition` still carries the old fixed `eye` — the star tiling is re-centred on a point that no longer matches the view. |
| Grid vanishes when flying away from origin | The `focus = cam.eye` edit is missing and `eye` no longer exists — this fails to compile — or the player-transform override line was deleted. |

**Try breaking it on purpose.** Set `kLookAhead = 0.0f` and fly a slalom. The
ship is now dead-centre, the screen points *at* it rather than where it is going,
and every turn feels like information arriving late. Put it back and fly the same
slalom — the difference is the entire argument for aiming past the ship.

---

## Why the camera reads the world like everything else

`CameraSystem::compute` is a function over the `World`: it queries one entity's
`Transform` and returns data. It holds no state, owns nothing, and could be
pointed at *any* entity by passing a different id. A "spectate the enemy" mode or
a kill-cam is this same function fed a different entity. That uniformity —
camera, flight, collision, all plain functions over components — is the ECS
paying off again.

---

## Challenge

Add camera smoothing: keep the previous frame's eye position and ease it toward
the target each frame, giving a spring-like trail that softens sharp manoeuvres.

Three things to get right. The lerp factor must be time-based —
`1.0f - std::exp(-k * dt)` — not a raw `0.1f` per frame, or the smoothing is
twice as stiff at 144 Hz as at 60 Hz, which is chapter 09's lesson wearing a
disguise. The smoothed state has to live *somewhere* across frames, and
`CameraSystem` is deliberately stateless — so either it grows a struct the
caller owns (honest) or a function-local `static` (works, and quietly breaks the
"could be pointed at any entity" property, since two cameras would fight over
it). And smooth the **eye only**, not the look-target: smoothing `center` makes
your aim lag your input, and in a game about pointing your nose at things, that
is the one latency players feel instantly.

---

**Next:** enemies, guns, and the collisions that make them matter. →
[Chapter 12: Gameplay systems](12-gameplay-systems.md)
