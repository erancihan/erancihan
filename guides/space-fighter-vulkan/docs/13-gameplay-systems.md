# 13 · Gameplay systems 🛠️

> **You'll leave this chapter with:** how the game creates challenge and resolves
> it — enemy spawning and AI, weapons and cooldowns, sphere collision with layers,
> and the score/health/respawn loop — across `WeaponSystem`, `EnemySystem` and
> `CollisionSystem`, with the two spawn recipes they use in `archetypes/`. Pure
> simulation, so it's the same design as the
> [Metal guide](../../space-fighter-metal/docs/12-gameplay-systems.md), in
> C++/GLM.

---

## Weapons: a cooldown and two spawns

Firing is a rate-limited spawner. The `Weapon` component holds the state; the
system counts it down and, while `Space` is held, emits twin bolts on a fixed
cadence:

```cpp
weapon->cooldown = std::max(0.0f, weapon->cooldown - dt);          // WeaponSystem
if (input.firing && weapon->cooldown <= 0) {
    glm::vec3 right = glm::normalize(t->rotation * glm::vec3(1, 0, 0));
    fireBolt(world, *t, right *  0.9f, weapon->muzzleSpeed);
    fireBolt(world, *t, right * -0.9f, weapon->muzzleSpeed);
    weapon->cooldown = weapon->fireInterval;                       // ~7 shots/sec
}
```

The cooldown in *seconds* (decremented by `dt`) is what makes fire rate frame-rate
independent — hold the trigger on a 144 Hz display and you still get
`1 / fireInterval` shots per second, not more.

`fireBolt` isn't in `WeaponSystem.cpp`. It's the archetype — the recipe for what a
bolt *is* — so it lives in `archetypes/Projectile.cpp`, and it's the ECS thesis in
miniature: **pure data, no class.**

```cpp
// archetypes/Projectile.cpp
Entity fireBolt(World& world, const Transform& from, glm::vec3 offset, float speed) {
    Entity bolt = world.create();
    world.add(bolt, transform);                                    // where + how big
    world.add(bolt, Velocity{forward * speed});                    // straight ahead
    world.add(bolt, Renderable{MeshID::Bolt, cyan});               // what to draw
    world.add(bolt, Projectile{/*damage*/1});                      // it's a bullet
    world.add(bolt, Collider{0.6f, Layer::Projectile, Layer::Enemy});
    world.add(bolt, Lifetime{2.4f});                               // self-destruct fuse
    return bolt;
}
```

Six components, no inheritance, and a `WeaponSystem` that never learns what a bolt
is made of — it calls `fireBolt` twice and moves on. Retune the bolt (tougher
collider, longer fuse, different mesh) and you edit this file only; change *when*
bolts are fired and you edit `WeaponSystem.cpp` only. That's the split
`archetypes/` buys.

The `Lifetime` is essential: without it, every shot you ever fire lives forever, and
the entity count (and the collision loop) grows without bound. `LifetimeSystem` ages
each one by `dt` and destroys it at zero:

```cpp
for (Entity e : world.store<Lifetime>().entities()) {              // LifetimeSystem
    Lifetime* l = world.store<Lifetime>().get(e);
    l->remaining -= dt;
    if (l->remaining <= 0) world.destroy(e);                       // deferred (ch 05)
}
```

---

## Enemies: a director, two archetypes, and homing

`EnemySystem` does three jobs each frame — **spawn**, **steer**, **cull** — and a
tiny `Director` struct owns the difficulty knobs.

### Spawning with a budget

A timer gates spawns, and a cap keeps the sky sane:

```cpp
director.spawnTimer -= dt;                                          // EnemySystem::spawn
if (director.spawnTimer > 0 ||
    world.store<Enemy>().size() >= director.maxEnemies) return;
director.spawnTimer = director.spawnInterval;
```

New enemies appear in a **cone ahead of the camera**, placed using the *player's own
axes* so they're always roughly where you're looking:

```cpp
glm::vec3 fwd   = glm::normalize(pt.rotation * glm::vec3(0, 0, -1));
glm::vec3 right = glm::normalize(pt.rotation * glm::vec3(1, 0, 0));
glm::vec3 up    = glm::normalize(pt.rotation * glm::vec3(0, 1, 0));
glm::vec3 position = pt.position
                   + fwd   * rand(120.0f, 190.0f)                   // out in front
                   + right * rand(-55.0f,  55.0f)                   // spread sideways
                   + up    * rand(-20.0f,  28.0f);                  // and vertically
```

To make it harder over time, ramp the director — shrink `spawnInterval` or raise
`maxEnemies` as score climbs. That one struct is your whole difficulty curve.

### Two variants, same mesh

`archetypes/Enemy.cpp` holds `spawnEnemy`, and a coin flip inside it gives each
enemy one of two behaviours — a clean demonstration of composition:

- **Chaser** (red): gets a `Homing` component. Turns to track you.
- **Drifter** (amber): gets a `Velocity` toward you plus a `Spinner`. Flies a
  straight line and tumbles.

Same octahedron mesh, different components → different behaviour and color. No
subclasses, and — worth noticing — no new file either. A third variant is a third
branch in one recipe; a genuinely different *kind* of thing (a turret, a mine)
would earn its own archetype file next to this one.

### Homing that steers instead of snapping

A chaser shouldn't instantly point at you — it should *turn* toward you at a limited
rate, so you can juke it. That's a rotation toward the target, clamped to
`turnRate · dt`:

```cpp
glm::vec3 desired = glm::normalize(pt.position - t->position);     // EnemySystem::steer
glm::vec3 current = glm::normalize(t->rotation * glm::vec3(0,0,-1));
glm::vec3 axis    = glm::cross(current, desired);                  // axis to rotate about
if (glm::length(axis) > 1e-4f) {
    float angle = std::min(h->turnRate * dt,
                           std::acos(glm::clamp(glm::dot(current, desired), -1.0f, 1.0f)));
    t->rotation = glm::normalize(glm::angleAxis(angle, glm::normalize(axis)) * t->rotation);
}
glm::vec3 nose = glm::normalize(t->rotation * glm::vec3(0,0,-1));
velocities.set(e, Velocity{nose * h->speed});
```

The cross product gives the axis that rotates `current` toward `desired`; the
`acos(dot(...))` is the angle between them; `min(turnRate·dt, …)` caps the turn so
it can't overshoot. Note this rotation is **pre**-multiplied (`angleAxis * rotation`)
because we steer in *world* space toward the player, not in the enemy's local frame
— the mirror image of the player's local-frame right-multiply (chapter 11). Then,
like the player, velocity just follows the new nose. Raise `turnRate` and chasers
become relentless; lower it and they arc lazily and miss.

### Culling

Enemies you outrun would pile up invisibly behind you, so `cull` destroys any that
drift past a radius:

```cpp
if (glm::length(t->position - pt.position) > 280.0f) world.destroy(e);
```

Deferred destruction (chapter 05) makes this safe to call mid-loop.

---

## Collision: spheres, layers, and honesty about scale

Collision is a **broad-phase-free** sphere sweep. Every collidable is a point plus a
radius; two overlap when the distance between centres is under the sum of radii —
compared **squared**, to skip the square root:

```cpp
float reach = a.radius + b.radius;                                 // CollisionSystem
glm::vec3 d = aPos - bPos;
if (glm::dot(d, d) <= reach * reach) { /* hit */ }                 // length² ≤ reach²
```

Two interactions matter, and we spell them out rather than run a generic matcher:

- **bolt → enemy:** the bolt is consumed, the enemy takes damage, and if its health
  hits zero it dies and you score.
- **ship → enemy:** the enemy dies and your hull drops by 20 with a red flash.

`Collider` carries `layer`/`mask` fields (a `Player`/`Enemy`/`Projectile` bit enum)
to express *who can hit whom*. We check the two cases directly here for readability,
but the tags are there for when you add more interactions (enemy bullets, pickups)
and want a general rule instead of hand-written pairs.

### The scaling honesty

This sweep is **O(bolts × enemies)**. With a couple dozen of each, that's a few
hundred cheap checks per frame — nothing. But it grows quadratically, so a
bullet-hell with thousands of entities would choke. The fix is a **broad phase**:
bucket entities into a spatial grid (or hash) so each one only tests neighbours in
nearby cells, turning the quadratic sweep near-linear. We don't need it yet, and
pretending we do would just add code you can't feel — but chapter 15 flags it as the
first thing to add when counts climb. Knowing *where* the cliff is beats optimising
before it.

---

## Score, health, and respawn

The shared numbers live in a small `GameStats` struct that systems read and write:

```cpp
struct GameStats {
    int   score = 0;
    int   deaths = 0;
    float playerHealth    = 100.0f;
    float playerMaxHealth = 100.0f;   // the hull bar's denominator (chapter 14)
    float hitFlash = 0.0f;            // seconds of red flash left (chapter 14)
};
```

`CollisionSystem` bumps `score` on a kill and drops `playerHealth` on a ram (and
sets `hitFlash`). `Game::update` ages the flash by `dt` and, when hull hits zero,
respawns:

```cpp
if (stats.playerHealth <= 0) respawn();   // reset ship, clear the field, keep score
```

Respawn resets the ship's transform and clears every enemy, but *keeps* the score,
so you're always chasing a high score across lives — a deliberately forgiving loop
for a prototype. Making death cost a life, or end the run to a score screen, is a
change to this one method.

---

## The pattern under all three

Weapons, AI, collision — none of them are objects with methods. Each is a function
over the `World` that reads some components and writes others, slotted into the
frame schedule at a specific point (chapter 10); the spawn recipes they call are
plain functions in `archetypes/` that build an entity and hand it back. That sameness is what lets you
add a new mechanic by writing *one more function of the same shape* and adding *one
more line* to the schedule. You've now seen every shape it takes — and none of it
knows Vulkan exists.

---

**Next:** telling the player what's happening — the HUD, with a Vulkan Y-down
twist. → [Chapter 14: HUD & feedback](14-hud-and-feedback.md)
