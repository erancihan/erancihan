# 12 · Gameplay systems 🛠️

> **You'll leave this chapter with:** a game. Enemies warp in ahead of you — some
> homing, some tumbling past — your cannons fire on a cooldown, sphere collisions
> resolve hits, and score, hull and respawn close the loop. You will also spring
> the dangling-pointer trap chapter 04 set, with AddressSanitizer watching.
>
> **Files created:** `src/systems/{Weapon,Enemy,Collision,Lifetime}System.hpp`.
> `src/GameState.hpp`, `src/Game.{hpp,cpp}` grow.

Four systems, one struct of difficulty knobs, four lines in the schedule. Nothing
in this chapter knows Vulkan exists.

---

## Lifetimes: entities with a fuse

Start with the smallest, because two other systems depend on it existing. Every
bolt you ever fire would otherwise live forever — position advancing, collision
checked, instance uploaded, every frame, until the heat death of the frame rate.

**`src/systems/LifetimeSystem.hpp`** — new file:

```cpp
#pragma once

#include "Components.hpp"
#include "ecs/World.hpp"

namespace LifetimeSystem {

inline void update(World& world, float dt) {
    auto& lifetimes = world.store<Lifetime>();
    for (Entity e : lifetimes.entities()) {
        Lifetime* l = lifetimes.get(e);
        l->remaining -= dt;
        if (l->remaining <= 0.0f) world.destroy(e);
    }
}

} // namespace LifetimeSystem
```

`world.destroy` mid-iteration is safe **only** because chapter 04 made it a
deferred queue — this loop is exactly the situation `flushDestroyed` exists for.
Counting down in seconds, not frames, is chapter 09's `dt` habit again: a 2.4 s
fuse is 2.4 s at any refresh rate.

---

## Weapons: a cooldown and two spawns

Firing is a rate-limited spawner. First the helper that builds one bolt:

**`src/systems/WeaponSystem.hpp`** — new file:

```cpp
#pragma once

#include "Components.hpp"
#include "Input.hpp"
#include "Math.hpp"
#include "ecs/World.hpp"

#include <algorithm>

namespace WeaponSystem {

constexpr float kBoltHalfSpan = 0.9f;   // muzzle offset from the ship's centreline
constexpr float kBoltLifetime = 2.4f;

} // namespace WeaponSystem
```

**`WeaponSystem.hpp`**, in `namespace WeaponSystem` — after the constants:

```diff
 constexpr float kBoltHalfSpan = 0.9f;   // muzzle offset from the ship's centreline
 constexpr float kBoltLifetime = 2.4f;
+
+inline void fireBolt(World& world, const Transform& ship, const glm::vec3& offset, float speed) {
+    Transform t;
+    t.position = ship.position + ship.rotation * offset;
+    t.rotation = ship.rotation;
+    t.scale = glm::vec3(0.18f, 0.18f, 0.7f);
+
+    Entity bolt = world.create();
+    world.add(bolt, t);
+    world.add(bolt, Velocity{Math::forward(ship.rotation) * speed});
+    world.add(bolt, Renderable{MeshID::Bolt, glm::vec4(0.35f, 0.95f, 1.0f, 1.0f)});
+    world.add(bolt, Projectile{1});
+    world.add(bolt, Collider{0.6f, Layer::Projectile, Layer::Enemy});
+    world.add(bolt, Lifetime{kBoltLifetime});
+}
 
 } // namespace WeaponSystem
```

A bolt is the ECS thesis in miniature: **pure data, no class.** Six components,
each already meaningful to some system — `Velocity` to movement, `Lifetime` to
the fuse, `Collider` to the sweep below — and the bolt behaves without one line
of bolt-specific behaviour existing anywhere. `ship.rotation * offset` rotates
the muzzle offset into the ship's frame, so the twin cannons stay on the wingtips
through any manoeuvre; the `(0.18, 0.18, 0.7)` scale is chapter 08's cube
stretched into a glowing bar.

Now the system. Write it the obvious way:

**`WeaponSystem.hpp`**, in `namespace WeaponSystem` — after `fireBolt`:

```diff
     world.add(bolt, Lifetime{kBoltLifetime});
 }
+
+inline void update(World& world, Entity player, const InputState& input, float dt) {
+    Weapon* w = world.get<Weapon>(player);
+    Transform* t = world.get<Transform>(player);
+    if (!w || !t) return;
+
+    w->cooldown = std::max(0.0f, w->cooldown - dt);
+    if (!input.firing || w->cooldown > 0.0f) return;
+
+    glm::vec3 right = Math::right(t->rotation);
+    fireBolt(world, *t, right * kBoltHalfSpan, w->muzzleSpeed);
+    fireBolt(world, *t, right * -kBoltHalfSpan, w->muzzleSpeed);
+    w->cooldown = w->fireInterval;
+}
 
 } // namespace WeaponSystem
```

The cooldown in seconds is what makes fire rate frame-rate independent — hold
`Space` on a 144 Hz display and you still get `1 / fireInterval` ≈ 7 shots per
second, not more.

This compiles. Wire it up (the full wiring comes later in the chapter — for this
experiment just add the include and the schedule line from the "Wiring" section
below), build, run, hold `Space`: two bolts streak out, the cooldown ticks, more
bolts. **It works.**

It is also the bug chapter 04 promised. `t` points **into the Transform store's
dense array**. `fireBolt` calls `world.add(bolt, t)` — a `push_back` on that same
array. The player was the first Transform in; before the first shot the store
holds a handful of elements, and the moment `push_back` outgrows its capacity it
reallocates, and `t` points at freed memory. The *second* `fireBolt(world, *t, …)`
reads the ship's transform through that dangling pointer.

Nothing crashed when you tried it, because freed heap memory usually still holds
its old bytes for a while. That is the worst kind of luck. Ask a tool that
removes the luck — recompile with **AddressSanitizer**:

```console
$ g++ -std=c++17 -fsanitize=address -g -Isrc -Ithird_party -o /tmp/asan_test \
      scratch/weapon_check.cpp
$ /tmp/asan_test
==10035==ERROR: AddressSanitizer: heap-use-after-free on address 0x504000000024
READ of size 4 at 0x504000000024 thread T0
    #0 glm::operator*(glm::qua<float> const&, glm::vec<3, float> const&)
    #1 Math::forward(glm::qua<float> const&) src/Math.hpp:29
    #2 WeaponSystem::fireBolt(...) src/systems/WeaponSystem.hpp
    #3 WeaponSystem::update(...) src/systems/WeaponSystem.hpp
freed by thread T0 here:
    #0 operator delete(void*, unsigned long)
    #1 std::__new_allocator<Transform>::deallocate(...)
```

(`scratch/weapon_check.cpp` is any few-line harness that makes a world, gives one
entity a `Transform` and `Weapon`, and calls `update` once with `firing = true` —
worth actually doing once, because watching ASan name the exact line changes how
much you trust "it ran fine".)

Read the report from the bottom up: the Transform allocator **freed** the array,
and then `fireBolt`, via `Math::forward`, **read** from it. The fix is the one
chapter 04 prescribed — don't hold a pointer across a mutation of the same store.
Copy the value out first:

**`WeaponSystem.hpp`**, in `update` — replace the firing block:

```diff
     if (!input.firing || w->cooldown > 0.0f) return;
 
-    glm::vec3 right = Math::right(t->rotation);
-    fireBolt(world, *t, right * kBoltHalfSpan, w->muzzleSpeed);
-    fireBolt(world, *t, right * -kBoltHalfSpan, w->muzzleSpeed);
-    w->cooldown = w->fireInterval;
+    // Copy before spawning: creating entities pushes into the Transform store,
+    // which can reallocate the array `t` points into.
+    Transform ship = *t;
+    glm::vec3 right = Math::right(ship.rotation);
+    float speed = w->muzzleSpeed;
+
+    fireBolt(world, ship, right * kBoltHalfSpan, speed);
+    fireBolt(world, ship, right * -kBoltHalfSpan, speed);
+
+    Weapon* weapon = world.get<Weapon>(player);
+    weapon->cooldown = weapon->fireInterval;
 }
```

Three copies, one re-fetch. `ship` is the load-bearing one. `speed` is copied for
the same reason in principle — `w` points into the Weapon store — though nothing
today adds a `Weapon` inside `fireBolt`. The re-fetch of `weapon` at the end is
the same caution made explicit: after any call that mutates the world, the cheap,
always-correct move is to look the pointer up again rather than argue about
whether this particular mutation could have touched this particular store. One
hash lookup per trigger pull is free; the argument, the day someone gives turret
entities their own `Weapon`, is not.

Re-run the ASan build: silent.

---

## The director, and enemies

Difficulty is a struct, so that "make it harder" is a data change:

**`GameState.hpp`** — after `GameStats`:

```diff
     float hitFlash = 0.0f;
 };
+
+/// Every difficulty knob in the game, in one place.
+struct Director {
+    float spawnTimer = 0.0f;
+    float spawnInterval = 1.6f;
+    int maxEnemies = 18;
+};
```

Shrink `spawnInterval` or raise `maxEnemies` as score climbs and that one struct
is your whole difficulty curve. It lives here rather than inside `EnemySystem`
because `Game` owns it across frames — systems are stateless functions, and the
timer has to persist somewhere.

**`src/systems/EnemySystem.hpp`** — new file:

```cpp
#pragma once

#include "Components.hpp"
#include "GameState.hpp"
#include "Math.hpp"
#include "ecs/World.hpp"

#include <algorithm>
#include <cmath>
#include <random>

namespace EnemySystem {

} // namespace EnemySystem
```

**`EnemySystem.hpp`**, in `namespace EnemySystem` — the tuning constants:

```diff
 namespace EnemySystem {
+
+constexpr float kSpawnMinAhead = 120.0f;
+constexpr float kSpawnMaxAhead = 190.0f;
+constexpr float kSpawnSpread = 55.0f;
+constexpr float kSpawnDrop = -20.0f;
+constexpr float kSpawnRise = 28.0f;
+constexpr float kCullRadius = 280.0f;
+constexpr float kDrifterSpeed = 30.0f;
+constexpr float kEnemyScale = 2.1f;
 
 } // namespace EnemySystem
```

The spawn band — 120 to 190 units ahead — is tuned against two other numbers.
Bolts fly at 140 units/s and live 2.4 s, so their reach is ~336 units plus your
own speed: everything that spawns is already in range. And the far edge stays
well inside the 1200-unit far plane, so nothing ever pops into view mid-screen.

**`EnemySystem.hpp`**, in `namespace EnemySystem` — after the constants:

```diff
 constexpr float kDrifterSpeed = 30.0f;
 constexpr float kEnemyScale = 2.1f;
+
+namespace detail {
+
+inline float rand01() {
+    static std::mt19937 rng{2024u};
+    static std::uniform_real_distribution<float> dist{0.0f, 1.0f};
+    return dist(rng);
+}
+
+inline float range(float lo, float hi) { return lo + (hi - lo) * rand01(); }
+
+} // namespace detail
 
 } // namespace EnemySystem
```

Seeded with a constant, like chapter 08's starfield and for the same reason: a
deterministic spawn sequence means a bug you saw is a bug you can see again.
(The `static`s make this system the one *stateful* "function" in the project — a
labelled exception, and the honest alternative, threading a generator through
every call, buys nothing at this scale.)

### Spawning: in front of you, on purpose

**`EnemySystem.hpp`**, in `namespace EnemySystem` — after `detail`:

```diff
 } // namespace detail
+
+/// New enemies appear in a cone ahead of the player, placed with the player's
+/// own axes so they are always roughly where you are looking.
+inline void spawn(World& world, const Transform& playerT) {
+    Transform t;
+    t.position = playerT.position
+               + Math::forward(playerT.rotation) * detail::range(kSpawnMinAhead, kSpawnMaxAhead)
+               + Math::right(playerT.rotation) * detail::range(-kSpawnSpread, kSpawnSpread)
+               + Math::up(playerT.rotation) * detail::range(kSpawnDrop, kSpawnRise);
+    t.rotation = playerT.rotation;
+    t.scale = glm::vec3(kEnemyScale);
+
+    Entity e = world.create();
+    world.add(e, t);
+    world.add(e, Enemy{});
+    world.add(e, Collider{2.4f, Layer::Enemy, Layer::Player});
+}
```

The position is built from the **player's own axes**, not world axes — fly
straight up and enemies still spawn ahead of your nose, not off in the world's
horizontal distance. This is the same trick as the camera rig and the muzzle
offsets: express placements in the frame of the thing they belong to.

Then a coin flip decides what kind of enemy it is:

**`EnemySystem.hpp`**, in `spawn` — after the `Collider`:

```diff
     world.add(e, Collider{2.4f, Layer::Enemy, Layer::Player});
+
+    if (detail::rand01() < 0.5f) {
+        world.add(e, Renderable{MeshID::Enemy, glm::vec4(0.95f, 0.25f, 0.25f, 1.0f)});
+        world.add(e, Homing{});
+        world.add(e, Velocity{});
+    } else {
+        world.add(e, Renderable{MeshID::Enemy, glm::vec4(0.95f, 0.70f, 0.25f, 1.0f)});
+        world.add(e, Velocity{glm::normalize(playerT.position - t.position) * kDrifterSpeed});
+        world.add(e, Spinner{glm::normalize(glm::vec3(detail::range(-1.0f, 1.0f), 1.0f,
+                                                     detail::range(-1.0f, 1.0f))),
+                             detail::range(0.8f, 2.4f)});
+    }
 }
```

This is composition doing the work an inheritance tree would need two subclasses
for. A **chaser** (red) gets `Homing` and an empty `Velocity` the steering will
fill. A **drifter** (amber) gets a straight-line `Velocity` toward where you were
and a `Spinner` so it tumbles as it passes. Same mesh, same everything else —
different components, different creature. The colour difference is doing real
gameplay work too: red means "will follow you", and players learn it in seconds
without being told.

### Homing that steers instead of snapping

A chaser must not simply point at you — that is undodgeable and reads as cheap.
It *turns toward* you at a capped rate, so you can make it miss:

**`EnemySystem.hpp`**, in `namespace EnemySystem` — after `spawn`:

```diff
     }
 }
+
+/// Turn each chaser toward the player at a capped rate, then fly down its nose.
+inline void steer(World& world, const Transform& playerT, float dt) {
+    auto& homings = world.store<Homing>();
+    auto& transforms = world.store<Transform>();
+    auto& velocities = world.store<Velocity>();
+
+    for (Entity e : homings.entities()) {
+        Homing* h = homings.get(e);
+        Transform* t = transforms.get(e);
+        if (!t) continue;
+
+        glm::vec3 toTarget = playerT.position - t->position;
+        if (glm::length(toTarget) < 1e-4f) continue;
+    }
+}
```

**`EnemySystem.hpp`**, in `steer` — after the degenerate-distance guard:

```diff
         glm::vec3 toTarget = playerT.position - t->position;
         if (glm::length(toTarget) < 1e-4f) continue;
+
+        glm::vec3 desired = glm::normalize(toTarget);
+        glm::vec3 current = Math::forward(t->rotation);
+        glm::vec3 axis = glm::cross(current, desired);
+        if (glm::length(axis) > 1e-4f) {
+            float angle = std::min(h->turnRate * dt,
+                                   std::acos(glm::clamp(glm::dot(current, desired), -1.0f, 1.0f)));
+            t->rotation = glm::normalize(glm::angleAxis(angle, glm::normalize(axis)) * t->rotation);
+        }
+        velocities.set(e, Velocity{Math::forward(t->rotation) * h->speed});
     }
```

Chapter 03's two vector operations, both earning their keep in one place. The
**cross product** of current and desired headings is the axis to rotate about;
the **dot product**, clamped and `acos`ed, is the angle between them. Capping
that angle at `turnRate · dt` is what makes the missile dodgeable — and the
`min` also stops it overshooting on the frame it would arrive.

The `clamp` before `acos` is not decoration: two normalized vectors' dot product
can land at `1.0000001` in floating point, and `acos` of that is NaN — one NaN
rotation and the enemy's transform is poisoned forever, taking its matrix, its
instance data and one corner of your screen with it.

And note this rotation is **pre**-multiplied — `angleAxis(...) * t->rotation` —
where chapter 10's flight was post-multiplied. The mirror is exact: the player
turns *in their own frame* ("pitch about my wings"), the missile turns *in world
space* ("rotate my heading toward that point over there"). Which side of the
quaternion the delta goes on is which frame you mean it in.

### Culling, and the frame

Enemies you outfly would pile up invisibly behind you, each still steering,
moving and colliding:

**`EnemySystem.hpp`**, in `namespace EnemySystem` — after `steer`:

```diff
         velocities.set(e, Velocity{Math::forward(t->rotation) * h->speed});
     }
 }
+
+inline void cull(World& world, const Transform& playerT) {
+    auto& enemies = world.store<Enemy>();
+    auto& transforms = world.store<Transform>();
+    for (Entity e : enemies.entities())
+        if (Transform* t = transforms.get(e))
+            if (glm::length(t->position - playerT.position) > kCullRadius) world.destroy(e);
+}
```

Deferred destruction is what makes `destroy` inside that double-`if` legal — the
loop is walking the very store the destroy will eventually edit.

Finally the entry point that sequences the three jobs and owns the spawn budget:

**`EnemySystem.hpp`**, in `namespace EnemySystem` — after `cull`:

```diff
             if (glm::length(t->position - playerT.position) > kCullRadius) world.destroy(e);
 }
+
+inline void update(World& world, Entity player, Director& director, float dt) {
+    Transform* pt = world.get<Transform>(player);
+    if (!pt) return;
+    Transform playerT = *pt;   // copy: spawn() creates entities and can move the store
+
+    steer(world, playerT, dt);
+    cull(world, playerT);
+
+    director.spawnTimer -= dt;
+    if (director.spawnTimer > 0.0f) return;
+    if (int(world.store<Enemy>().size()) >= director.maxEnemies) return;
+
+    director.spawnTimer = director.spawnInterval;
+    spawn(world, playerT);
+}
```

There is the WeaponSystem lesson, already applied: `playerT` is a **copy**, taken
before `spawn` can touch the Transform store. Once you have made this mistake
under ASan you make the copy reflexively, which is the entire point of having
made it. The two early returns are the spawn *budget* — a timer gates the rate,
a cap keeps the sky readable — and both knobs live on the `Director`, not here.

---

## Collision: spheres, honestly

Every collidable is a point plus a radius; two overlap when the distance between
centres is under the sum of radii. Compared **squared**, so no square root:

**`src/systems/CollisionSystem.hpp`** — new file:

```cpp
#pragma once

#include "Components.hpp"
#include "GameState.hpp"
#include "ecs/World.hpp"

namespace CollisionSystem {

constexpr float kRamDamage = 20.0f;
constexpr float kFlashSeconds = 0.5f;

inline bool overlapping(const Transform& a, const Collider& ac,
                        const Transform& b, const Collider& bc) {
    glm::vec3 d = a.position - b.position;
    float reach = ac.radius + bc.radius;
    return glm::dot(d, d) <= reach * reach;   // compare squared; no sqrt
}

} // namespace CollisionSystem
```

Two interactions matter, and we spell them out rather than run a generic matcher.
First, bolts against enemies:

**`CollisionSystem.hpp`**, in `namespace CollisionSystem` — after `overlapping`:

```diff
     return glm::dot(d, d) <= reach * reach;   // compare squared; no sqrt
 }
+
+inline void update(World& world, Entity player, GameStats& stats) {
+    auto& colliders = world.store<Collider>();
+    auto& transforms = world.store<Transform>();
+    auto& projectiles = world.store<Projectile>();
+    auto& enemies = world.store<Enemy>();
+
+    for (Entity b : projectiles.entities()) {
+        Projectile* p = projectiles.get(b);
+        Collider* bc = colliders.get(b);
+        Transform* bt = transforms.get(b);
+        if (!p || !bc || !bt) continue;
+    }
+}
 
 } // namespace CollisionSystem
```

**`CollisionSystem.hpp`**, in the projectile loop — after the guards:

```diff
         if (!p || !bc || !bt) continue;
+
+        for (Entity e : enemies.entities()) {
+            Enemy* en = enemies.get(e);
+            Collider* ec = colliders.get(e);
+            Transform* et = transforms.get(e);
+            if (!en || !ec || !et || en->health <= 0.0f) continue;
+            if (!overlaps(bc->mask, ec->layer)) continue;
+            if (!overlapping(*bt, *bc, *et, *ec)) continue;
+
+            en->health -= float(p->damage);
+            world.destroy(b);
+            if (en->health <= 0.0f) {
+                world.destroy(e);
+                stats.score += en->scoreValue;
+            }
+            break;   // one bolt, one hit
+        }
     }
```

Walk the guards in order, because each is a decision. `en->health <= 0.0f` skips
enemies already killed *this frame* — remember `destroy` only queues, so a dead
enemy is still in the store until the flush, and without this guard one enemy
could eat two bolts and pay out score twice. `overlaps(bc->mask, ec->layer)` is
chapter 04's layer bits asked their one question: *can* this hit that? And the
`break` means a bolt is consumed by its first hit — it is a bullet, not a beam.

Then the ship against enemies:

**`CollisionSystem.hpp`**, in `update` — after the projectile loop:

```diff
             break;   // one bolt, one hit
         }
     }
+
+    Collider* pc = colliders.get(player);
+    Transform* pt = transforms.get(player);
+    if (!pc || !pt) return;
+
+    for (Entity e : enemies.entities()) {
+        Enemy* en = enemies.get(e);
+        Collider* ec = colliders.get(e);
+        Transform* et = transforms.get(e);
+        if (!en || !ec || !et || en->health <= 0.0f) continue;
+        if (!overlapping(*pt, *pc, *et, *ec)) continue;
+
+        en->health = 0.0f;
+        world.destroy(e);
+        stats.playerHealth -= kRamDamage;
+        stats.hitFlash = kFlashSeconds;
+    }
 }
```

This pair is checked directly — no mask test — because there is exactly one
player and the relationship is unambiguous. The layer machinery is there for when
you add enemy bullets and pickups and want a general rule instead of hand-written
pairs; using it for *this* pair would be ceremony. `hitFlash` is set here and
consumed by chapter 13's HUD; until then it ages out invisibly in `Game::update`.

### The scaling honesty

This sweep is **O(bolts × enemies)**. With a couple dozen of each that is a few
hundred cheap checks per frame — nothing. But it grows quadratically, and a
bullet-hell with thousands of entities would choke on it. The fix is a **broad
phase**: bucket entities into a spatial grid so each tests only its neighbours.
We do not need it, and pretending we do would add code you cannot feel — but
knowing *where* the cliff is beats optimising before it. Chapter 14 points the
way.

---

## Wiring, and the finished schedule

**`Game.hpp`**, in `class Game` — after `gameStats`:

```diff
     World world;
     Entity player;
     GameStats gameStats;
+    Director director;
 };
```

**`Game.cpp`** — in the include block, four lines, alphabetically:

```diff
 #include "systems/CameraSystem.hpp"
+#include "systems/CollisionSystem.hpp"
+#include "systems/EnemySystem.hpp"
 #include "systems/FlightControlSystem.hpp"
+#include "systems/LifetimeSystem.hpp"
 #include "systems/MovementSystem.hpp"
 #include "systems/RenderSystem.hpp"
 #include "systems/SpinSystem.hpp"
+#include "systems/WeaponSystem.hpp"
```

**`Game.cpp`**, in `Game::update` — the schedule reaches its final shape:

```diff
     FlightControlSystem::update(world, player, input, dt);
+    WeaponSystem::update(world, player, input, dt);
+    EnemySystem::update(world, player, director, dt);
     MovementSystem::update(world, dt);
     SpinSystem::update(world, dt);
+    LifetimeSystem::update(world, dt);
+    CollisionSystem::update(world, player, gameStats);
     world.flushDestroyed();
```

Read it as the sentence chapter 09 promised: *point the ship, fire if asked,
spawn and steer enemies, move everything, spin the tumblers, age out old bolts,
resolve collisions, then delete whatever died.* Weapons fire before movement so a
bolt spawns at the nose and *then* flies; collision runs after movement so it
tests where things actually are; the flush stays last so every system saw a
consistent world. Eight lines, and they are the entire game logic.

`respawn` — written back in chapter 09, waiting — now has something to do: hull
hits zero, the field clears, the score survives. A deliberately forgiving loop:
you are always chasing a high score across lives, and making death end the run
instead is a one-method change.

---

## Checkpoint

```console
$ cmake --build build && cd build && ./SpaceFighter
[vulkan] using NVIDIA GeForce RTX 4070 (Vulkan 1.3)
[swapchain] 1280x720  format 50  3 images
```

**Play it.** Within a couple of seconds the first enemies warp in ahead — red
ones curving toward you, amber ones tumbling past on straight lines. Hold `Space`
and cyan bolts stream from both wingtips; hit a red one and it vanishes as the
title bar ticks `score 100`. Let one ram you and the title's hull drops by 20.
Reach zero and the field clears, `deaths` increments, hull refills, score stays.
Validation, through all of it: silent.

| Symptom | Likely cause |
|---|---|
| No enemies ever | `EnemySystem::update` missing from the schedule, or `director` was declared but the member initialiser lost — `spawnTimer` full of garbage can be years. |
| Enemies pop into existence mid-screen | Spawn band pushed past the far plane, or the spawn uses world axes — fly upward and check. |
| Bolts fire from the tail | `Math::forward` negated somewhere, or the muzzle offset uses world `right`. |
| One enemy eats both bolts of a volley and scores twice | The `en->health <= 0.0f` guard or the `break` is missing. |
| An enemy freezes mid-turn and its triangle smears across the screen | The `clamp` before `acos` is missing — that is a NaN quaternion. |
| Crash (or ASan report) on the first shot | The `Transform ship = *t;` copy is missing — the chapter's whole lesson. |
| Chasers orbit you forever without hitting | `turnRate` outruns their speed at close range; they circle inside their own turning radius. Raise `Homing::speed` or lower `turnRate` and watch the orbit open into an intercept. |

**Try breaking it on purpose.** Set `director.maxEnemies = 200` and
`spawnInterval = 0.05f` in `GameState.hpp` and fly into the swarm. Two things are
worth feeling: the frame rate holds — a few hundred entities through this whole
pipeline is genuinely nothing — and the game becomes unreadable long before it
becomes slow, which is why the cap is a design knob and not a performance knob.
Put both back.

---

## Challenge

Make drifters shoot back: a `Weapon` on each amber enemy, firing a slow red bolt
at your predicted position every few seconds.

Three things to get right. Enemy bolts must carry
`Collider{…, Layer::Projectile, Layer::Player}` — mask **Player**, not Enemy — or
they will shoot down their own chasers, and nothing but the layer bits prevents
it; this is the moment the generic `overlaps` test starts paying for itself in
the bolt loop. Prediction means aiming at `playerPos + playerVel * timeToImpact`,
and `timeToImpact` depends on the distance you are firing across — a fixed guess
makes long shots trail behind you and close shots lead too far. And
`WeaponSystem::update` is hard-wired to the player entity and the `InputState`;
the honest refactor is a free function over every entity with a `Weapon` and a
new `AutoFire` component, with the player's trigger becoming one more way of
setting the same "wants to fire" bit.

---

**Next:** the reticle, the hull bar, and the red flash — drawing flat on top of a
3D world. → [Chapter 13: HUD & feedback](13-hud-and-feedback.md)
