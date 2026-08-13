# 09 · The game loop & timing 🛠️

> **You'll leave this chapter with:** the ECS driving the renderer. A real frame
> clock, an understanding of why every rate is multiplied by **delta time**, and the
> `Game::update` schedule — eight lines that *are* the game logic.
>
> **Files created:** `src/GameState.hpp`, `src/Game.{hpp,cpp}`,
> `src/systems/{Movement,Spin,Render}System.hpp`. `src/main.cpp` and
> `CMakeLists.txt` grow.

Chapter 08's ship is hand-placed by four lines in `main`. This chapter replaces
those with a world.

---

## The seam, and the three systems that cross it

`FrameData` (chapter 03) is the entire interface between simulation and rendering.
The system that fills it is the last one to run each frame:

**`src/systems/RenderSystem.hpp`** — new file:

```cpp
#pragma once

#include "Components.hpp"
#include "ecs/World.hpp"
#include "render/RenderTypes.hpp"

namespace RenderSystem {

} // namespace RenderSystem
```

**`RenderSystem.hpp`**, in `namespace RenderSystem` — the whole body:

```diff
 namespace RenderSystem {
+
+/// The last system of the frame: bucket every drawable entity by mesh so the
+/// renderer can issue one instanced draw per bucket.
+inline void collect(World& world, FrameData& out) {
+    auto& renderables = world.store<Renderable>();
+    auto& transforms = world.store<Transform>();
+    for (Entity e : renderables.entities()) {
+        Renderable* r = renderables.get(e);
+        Transform* t = transforms.get(e);
+        if (!t) continue;
+        out.byMesh[r->mesh].push_back(InstanceData{t->matrix(), r->color});
+    }
+}
 
 } // namespace RenderSystem
```

Every system in this project has that shape: a free function in a namespace, taking
the `World` and whatever else it needs, mutating components in place. No state, no
object, nothing to construct. They are header-only so that adding one costs a file
and not also a line in `CMakeLists.txt`.

The bucketing is what makes chapter 08's instancing possible: twenty enemies sharing
one octahedron become one entry in `byMesh` and therefore one draw call.
`if (!t) continue` is the guard every system needs — a `Renderable` without a
`Transform` has nowhere to be.

Two more, both one-liners in spirit:

**`src/systems/MovementSystem.hpp`** — new file:

```cpp
#pragma once

#include "Components.hpp"
#include "ecs/World.hpp"

namespace MovementSystem {

inline void update(World& world, float dt) {
    auto& velocities = world.store<Velocity>();
    auto& transforms = world.store<Transform>();
    for (Entity e : velocities.entities()) {
        Velocity* v = velocities.get(e);
        if (Transform* t = transforms.get(e)) t->position += v->linear * dt;
    }
}

} // namespace MovementSystem
```

That is the entire physics engine. Anything with a `Velocity` and a `Transform`
moves; nothing else does. Notice which store it iterates: `velocities`, the smaller
of the two, because a walk over the *bigger* store would test-and-skip every static
object in the world.

**`src/systems/SpinSystem.hpp`** — new file:

```cpp
#pragma once

#include "Components.hpp"
#include "ecs/World.hpp"

namespace SpinSystem {

inline void update(World& world, float dt) {
    auto& spinners = world.store<Spinner>();
    auto& transforms = world.store<Transform>();
    for (Entity e : spinners.entities()) {
        Spinner* s = spinners.get(e);
        if (Transform* t = transforms.get(e))
            t->rotation = glm::normalize(t->rotation * glm::angleAxis(s->rate * dt, s->axis));
    }
}

} // namespace SpinSystem
```

Chapter 03's local-frame rotation, applied on the right and renormalised — the same
two habits the flight model will use in chapter 10.

---

## Numbers that belong to the run

Score and hull are not per-entity data, so they are not components.

**`src/GameState.hpp`** — new file:

```cpp
#pragma once

/// Numbers that belong to the run rather than to any one entity. Systems read
/// and write these; keeping them out of Game.hpp is what stops the system
/// headers and Game.hpp including each other.
struct GameStats {
    int score = 0;
    int deaths = 0;
    float playerHealth = 100.0f;
    float playerMaxHealth = 100.0f;
    float hitFlash = 0.0f;
};
```

That comment is the whole reason this file exists. `CollisionSystem` (chapter 12)
writes `score`; `HUD::build` (chapter 13) reads `playerHealth`; `Game` owns the
instance. If `GameStats` lived in `Game.hpp`, every system that touches it would
include `Game.hpp`, and `Game.hpp` includes every system — a cycle. One small header
below both of them breaks it.

---

## The Game

**`src/Game.hpp`** — new file:

```cpp
#pragma once

#include "GameState.hpp"
#include "ecs/World.hpp"
#include "render/RenderTypes.hpp"

class Game {
public:
    Game();

    /// Advance the world by dt, then package what the renderer needs.
    FrameData update(float dt, float aspect);

    const GameStats& stats() const { return gameStats; }
};
```

**`Game.hpp`**, in `class Game` — after `stats`:

```diff
     const GameStats& stats() const { return gameStats; }
+
+private:
+    void spawnPlayer();
+    void respawn();
+
+    World world;
+    Entity player;
+    GameStats gameStats;
 };
```

`update` returns `FrameData` **by value** rather than filling a member. That is a
deliberate shape: it makes the function's entire output visible in its signature,
and it means nothing in the renderer can reach back into the simulation's state. The
copy is a few hundred bytes of vectors once a frame, which is nothing.

**`src/Game.cpp`** — new file:

```cpp
#include "Game.hpp"

#include "Components.hpp"
#include "Math.hpp"
#include "systems/MovementSystem.hpp"
#include "systems/RenderSystem.hpp"
#include "systems/SpinSystem.hpp"

#include <algorithm>
#include <cmath>

namespace {
constexpr float kMaxStep = 1.0f / 30.0f;
constexpr float kFieldOfView = 65.0f;
constexpr float kNearPlane = 0.1f;
constexpr float kFarPlane = 1200.0f;
constexpr float kShipScale = 1.0f;
} // namespace
```

Three of those five constants are chapter 11's camera and will be explained there.
`kMaxStep` is this chapter's, below.

**`Game.cpp`** — after the anonymous namespace:

```diff
 constexpr float kShipScale = 1.0f;
 } // namespace
+
+Game::Game() { spawnPlayer(); }
+
+void Game::spawnPlayer() {
+    player = world.create();
+
+    Transform t;
+    t.scale = glm::vec3(kShipScale);
+    world.add(player, t);
+    world.add(player, Velocity{});
+    world.add(player, Player{});
+    world.add(player, Weapon{});
+    world.add(player, Renderable{MeshID::Ship, glm::vec4(0.62f, 0.78f, 0.95f, 1.0f)});
+    world.add(player, Collider{1.8f, Layer::Player, Layer::Enemy});
+}
```

There is chapter 04's thesis in nine lines. The player is an id with six components
attached, and **not one of them is player-specific**. `Weapon` and `Collider` do
nothing yet — chapter 12 writes the systems that read them — and attaching them now
costs nothing, because a component with no system is inert by construction.

**`Game.cpp`** — after `spawnPlayer`:

```diff
     world.add(player, Collider{1.8f, Layer::Player, Layer::Enemy});
 }
+
+void Game::respawn() {
+    for (Entity e : world.store<Enemy>().entities()) world.destroy(e);
+    for (Entity e : world.store<Projectile>().entities()) world.destroy(e);
+    world.flushDestroyed();
+
+    Transform t;
+    t.scale = glm::vec3(kShipScale);
+    world.store<Transform>().set(player, t);
+    world.store<Velocity>().set(player, Velocity{});
+
+    gameStats.playerHealth = gameStats.playerMaxHealth;
+    gameStats.hitFlash = 0.0f;
+    gameStats.deaths++;
+}
```

The player entity is **reset, not recreated** — same id, fresh transform. Anything
holding onto that id keeps working, which is chapter 04's "we never recycle ids"
decision paying a small dividend. `flushDestroyed` is called explicitly here because
`respawn` runs *after* the frame's normal flush and we want the field genuinely
empty before the next frame starts.

---

## Delta time: the habit that makes motion correct

Displays don't tick at a fixed rate. A 60 Hz panel gives ~16.7 ms per frame; a
144 Hz monitor gives ~6.9 ms; drag the window and a frame might take 50 ms. If a
system did `position += velocity` per *frame*, the ship would fly more than twice as
fast on the 144 Hz monitor. That is a broken game.

So we measure how much real time actually elapsed and scale every rate by it.
Velocity is *units per second*, so we advance by `velocity · dt`; turn rates are
*radians per second*, so we rotate by `rate · dt`. Scan the systems above and `dt`
appears in every one that changes something over time. Anything that *doesn't*
multiply by `dt` — a cooldown counted down per frame, say — is a latent
frame-rate-dependent bug.

One guard rail on top of that:

**`Game.cpp`** — after `respawn`:

```diff
     gameStats.deaths++;
 }
+
+FrameData Game::update(float dt, float aspect) {
+    dt = std::min(std::max(dt, 0.0f), kMaxStep);
+}
```

If a frame takes a *long* time — you dragged the window, hit a breakpoint, the app
was backgrounded, or chapter 05.A's swapchain recreation ran — an unclamped `dt`
teleports everything: bolts tunnel straight through enemies, the ship lurches across
the map. Capping at 1/30 s means the game briefly runs in slow motion during a hitch
instead of exploding. The `max(dt, 0.0f)` half guards the other direction, because a
monotonic clock can still hand you a zero or a tiny negative across a wrap.

---

## The schedule *is* the game

**`Game.cpp`**, in `Game::update` — after the clamp:

```diff
     dt = std::min(std::max(dt, 0.0f), kMaxStep);
+
+    MovementSystem::update(world, dt);
+    SpinSystem::update(world, dt);
+    world.flushDestroyed();
 }
```

Two systems so far, and by chapter 12 there will be seven. Read the finished version
as a sentence: *point the ship, fire if asked, spawn and steer enemies, move
everything, spin the tumblers, age out old bolts, resolve collisions, then delete
whatever died.*

The order is not incidental — it **is** the rules:

- Movement runs **after** flight control and weapon fire, so a bolt spawns at the
  ship's current position and *then* moves. Spawn it after movement and every shot
  lags a frame behind the nose.
- Collision runs **after** movement, so it tests the positions things actually
  reached this frame rather than last frame's.
- `flushDestroyed` runs **last and once**, so every system saw a consistent world all
  frame and deletion happens at the single safe point chapter 04 built.

This is a large part of why the ECS pays off: the entire control flow of the game is
a handful of lines you can read at a glance, each an isolated, testable function.
There is no behaviour hidden inside an object graph.

**`Game.cpp`**, in `Game::update` — after the flush:

```diff
     world.flushDestroyed();
+
+    gameStats.hitFlash = std::max(0.0f, gameStats.hitFlash - dt);
+    if (gameStats.playerHealth <= 0.0f) respawn();
+
+    FrameData frame;
+    RenderSystem::collect(world, frame);
 }
```

`hitFlash` ages out here rather than in a system of its own — it is one float on a
struct that already exists, and a `FlashSystem` would be ceremony. Neither line does
anything until chapter 12 writes the collisions that set them.

**`Game.cpp`**, in `Game::update` — after `RenderSystem::collect`:

```diff
     FrameData frame;
     RenderSystem::collect(world, frame);
+
+    glm::vec3 eye{0.0f, 6.0f, 22.0f};
+    glm::mat4 view = Math::lookAt(eye, glm::vec3(0.0f), glm::vec3(0.0f, 1.0f, 0.0f));
+    glm::mat4 proj = Math::perspective(glm::radians(kFieldOfView), aspect, kNearPlane, kFarPlane);
+    frame.uniforms.viewProjection = proj * view;
+    frame.uniforms.cameraPosition = glm::vec4(eye, 1.0f);
+    frame.uniforms.lightDirection =
+        glm::vec4(glm::normalize(glm::vec3(-0.35f, -0.80f, -0.45f)), 0.0f);
 }
```

A fixed camera looking at the origin, for now — chapter 11 replaces those first two
lines with one that follows the ship.

`lightDirection.w == 0.0f` is the homogeneous coordinate doing its documented job:
`w = 1` is a position, `w = 0` is a direction. Nothing reads that `w` here, but it
means the struct is honest about what it holds, and `cameraPosition` right above it
uses `1.0f` for the same reason.

**`Game.cpp`**, in `Game::update` — after the light direction:

```diff
     frame.uniforms.lightDirection =
         glm::vec4(glm::normalize(glm::vec3(-0.35f, -0.80f, -0.45f)), 0.0f);
+
+    // Slide the finite grid under the player, snapped to a whole cell so the
+    // lines never appear to crawl.
+    glm::vec3 focus = eye;
+    if (Transform* t = world.get<Transform>(player)) focus = t->position;
+    float gx = std::round(focus.x / kGridSpacing) * kGridSpacing;
+    float gz = std::round(focus.z / kGridSpacing) * kGridSpacing;
+    frame.gridModel = glm::translate(glm::mat4(1.0f), glm::vec3(gx, kGroundY, gz));
+
+    return frame;
 }
```

The fallback to `eye` only matters before there is a player entity to find; chapter
11 changes that one word when the camera gains a position of its own.

Chapter 08's grid is a *finite* 800-unit patch. Snapping it to a whole cell is what
makes it read as endless: the pattern shifts by exactly one cell as you move, which
is invisible, so the patch appears to stay still while you fly over it. Drop the
`round` and the whole floor slides with you like a treadmill — a genuinely
disorienting effect, and a two-character experiment.

---

## The heartbeat

GLFW gives us no callback, so the loop is ours. Replace chapter 08's scaffolding.

**`CMakeLists.txt`**, in `add_executable` — after `src/Mesh.cpp`:

```diff
     src/Mesh.cpp
+    src/Game.cpp
     src/render/VmaImplementation.cpp
```

**`main.cpp`** — replace the includes (tidying the order while we are here —
project headers alphabetical, then the system ones):

```diff
-#include "render/VulkanContext.hpp"
-#include "render/Swapchain.hpp"
+#include "Game.hpp"
 #include "render/Renderer.hpp"
+#include "render/Swapchain.hpp"
+#include "render/VulkanContext.hpp"
 
-#include "Math.hpp"
-
+#include <algorithm>
 #include <cstdio>
 #include <exception>
+#include <string>
```

**`main.cpp`**, in `main` — before the `while` loop:

```diff
     glfwSetWindowUserPointer(window, &renderer);
     glfwSetFramebufferSizeCallback(window, framebufferResizeCallback);
+
+    Game game;
+
+    double lastTime = glfwGetTime();
+    double titleTimer = 0.0;
 
     while (!glfwWindowShouldClose(window)) {
```

`glfwGetTime()` is the right clock here: a monotonic seconds counter that starts at
GLFW init and, unlike wall-clock time, never jumps backwards when the system clock
is adjusted or a leap second lands.

**`main.cpp`**, in the `while` loop — replace the scaffolding with the real frame:

```diff
             glfwSetWindowShouldClose(window, GLFW_TRUE);
+
+        double now = glfwGetTime();
+        float dt = float(now - lastTime);
+        lastTime = now;
 
         int w = 0, h = 0;
         glfwGetFramebufferSize(window, &w, &h);
         if (w == 0 || h == 0) continue;   // minimised: nothing to draw into
+        float aspect = float(w) / float(std::max(h, 1));
 
-        FrameData frame;
-        glm::vec3 eye{0.0f, 6.0f, 22.0f};
-        glm::mat4 proj = Math::perspective(glm::radians(65.0f),
-                                           float(w) / float(h), 0.1f, 1200.0f);
-        frame.uniforms.viewProjection = proj * Math::lookAt(eye, glm::vec3(0.0f),
-                                                            glm::vec3(0.0f, 1.0f, 0.0f));
-        frame.uniforms.cameraPosition = glm::vec4(eye, 1.0f);
-        frame.uniforms.lightDirection =
-            glm::vec4(glm::normalize(glm::vec3(-0.35f, -0.80f, -0.45f)), 0.0f);
-        frame.byMesh[MeshID::Ship].push_back(
-            InstanceData{glm::mat4(1.0f), glm::vec4(0.62f, 0.78f, 0.95f, 1.0f)});
-        frame.gridModel = glm::translate(glm::mat4(1.0f), glm::vec3(0.0f, kGroundY, 0.0f));
-
+        FrameData frame = game.update(dt, aspect);
         renderer.drawFrame(frame);
```

Simulate, then draw — chapter 01's picture, in two lines.

Note the `continue` when minimised sits **after** the clock read. If it sat before,
`lastTime` would go stale while the window was minimised and the first frame back
would carry a `dt` of however many seconds you spent elsewhere — which the clamp
would absorb, but only just.

**`main.cpp`**, in the `while` loop — after `renderer.drawFrame`:

```diff
         renderer.drawFrame(frame);
+
+        titleTimer += dt;
+        if (titleTimer >= kTitleInterval) {
+            titleTimer = 0.0;
+            const GameStats& s = game.stats();
+            std::string title = "Space Fighter    score " + std::to_string(s.score) +
+                                "    hull " + std::to_string(int(s.playerHealth)) + "%" +
+                                "    deaths " + std::to_string(s.deaths);
+            glfwSetWindowTitle(window, title.c_str());
+        }
     }
```

**`main.cpp`** — in the anonymous namespace, after `kInitialHeight`:

```diff
 constexpr int kInitialHeight = 720;
+constexpr double kTitleInterval = 0.25;
```

Four updates a second, not sixty. `glfwSetWindowTitle` goes through the window
system, and hammering it every frame is a measurable cost for text nobody can read
at that rate. Chapter 13 explains why the score lives in the title bar at all.

### What paces us

Nothing in that loop sleeps, so what stops it spinning at 5,000 fps? The
**swapchain's present mode**. Chapter 05.A chose `FIFO`, which is vsync: once both
frames-in-flight are queued, `vkAcquireNextImageKHR` blocks until the display frees
an image. The refresh rate throttles the loop — we just chose that explicitly rather
than inheriting it.

---

## Variable vs fixed timestep

We use a **variable timestep**: step the simulation by whatever real `dt` just
elapsed. It is simple, it is in sync with rendering, and for an arcade shooter it is
right.

The alternative, a **fixed timestep**, runs the simulation in constant-size chunks,
accumulating real time and stepping however many whole chunks have banked
(illustration only — don't type this):

```
accumulator += dt
while (accumulator >= STEP) { simulate(STEP); accumulator -= STEP; }
render(interpolated by accumulator / STEP)
```

You reach for that when the simulation *must* be deterministic: **physics**, where
springs and stacked bodies go unstable if the step wobbles; **lockstep multiplayer**,
where every client must compute bit-identical results; and **replays**, where the
same inputs must produce the same game. None of those apply to us yet, and chapter
14 flags the switch as a prerequisite the moment they do.

---

## Checkpoint

```console
$ cmake -S . -B build && cmake --build build && cd build && ./SpaceFighter
[vulkan] using NVIDIA GeForce RTX 4070 (Vulkan 1.3)
[swapchain] 1280x720  format 50  3 images
```

The same ship, grid and starfield as chapter 08 — but now the ship is an **entity**,
found by `RenderSystem` walking a component store, and the window title reads
`Space Fighter    score 0    hull 100%    deaths 0`. Validation stays silent.

It doesn't move yet. Nothing gives the ship a velocity until chapter 10.

| Symptom | Likely cause |
|---|---|
| Nothing on screen but the grid | `spawnPlayer` never ran, or `Renderable` wasn't attached. Check the constructor body. |
| Title never updates | `titleTimer` accumulating `now` instead of `dt`, so it never reaches 0.25. |
| Ship drifts off immediately | Something has a non-zero `Velocity`. At this chapter the player's should be `{}`. |
| The grid slides with you like a treadmill | The `std::round` in the snap is missing. |
| Slow-motion after a window drag | Working as intended — that's `kMaxStep` absorbing the hitch. |

**Try breaking it on purpose.** Give the player a velocity in `spawnPlayer` —
`world.add(player, Velocity{glm::vec3(0, 0, -20)});` — and rebuild. The ship flies
away from the fixed camera and the grid slides under it, both driven entirely by
`MovementSystem` and the snap, with no code written for either. Then set `kMaxStep`
to `10.0f`, run, and drag the window hard: on release the ship jumps a visible
distance. Put both back.

---

## Challenge

Add a fixed-timestep mode behind a flag, and prove it changes something.

Three things to get right. `Game::update` currently both simulates and produces
`FrameData`; a fixed step needs those separated, because the simulation may run zero
or three times in one frame while rendering happens exactly once. The clamp
interacts badly with accumulation — if you cap `dt` *and* accumulate, a long hitch
silently drops time, so decide whether you want the "spiral of death" guard instead
(cap the number of steps per frame, not the step size). And to see any difference at
all you need something the variable step gets visibly wrong, which an arcade flight
model does not: add a bouncing object with restitution first, or you will build the
machinery and observe nothing.

---

**Next:** the first system in that schedule, and the one that makes it a game you
play. → [Chapter 10: Flight & input](10-flight-and-input.md)
