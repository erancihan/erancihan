# 10 · Gameplay systems 🛠️

> **You'll leave this chapter with:** how the game creates challenge and
> resolves it — enemy spawning and AI, weapons and cooldowns, sphere collision
> with layers, and the score/health/respawn loop — across
> `WeaponSystem`,
> `EnemySystem` and
> `CollisionSystem`.

---

## Weapons: a cooldown and two spawns

Firing is a rate-limited spawner. The `Weapon` component holds the state; the
system counts it down and, while `Space` is held, emits twin bolts on a fixed
cadence:

```swift
weapon.cooldown = max(0, weapon.cooldown - dt)          // WeaponSystem
if input.firing && weapon.cooldown <= 0 {
    fireBolt(world, from: ship, offset:  ship.right * 0.9, speed: weapon.muzzleSpeed)
    fireBolt(world, from: ship, offset: -ship.right * 0.9, speed: weapon.muzzleSpeed)
    weapon.cooldown = weapon.fireInterval               // ~7 shots/sec
}
```

The cooldown in *seconds* (decremented by `dt`) is what makes fire rate
frame-rate independent — hold the trigger on a 120 Hz display and you still get
`1 / fireInterval` shots per second, not double.

A bolt is the ECS thesis in miniature — **pure data, no class:**

```swift
let bolt = world.createEntity()
world.add(transform, to: bolt)                                   // where + how big
world.add(Velocity(linear: ship.forward * speed), to: bolt)      // straight ahead
world.add(Renderable(mesh: .projectile, color: cyan), to: bolt)  // what to draw
world.add(Projectile(damage: 1), to: bolt)                       // it's a bullet
world.add(Collider(radius: 0.6, layer: .projectile, mask: .enemy), to: bolt)
world.add(Lifetime(remaining: 2.4), to: bolt)                    // self-destruct fuse
```

The `Lifetime` is essential: without it, every shot you ever fire lives forever,
and the entity count (and the collision loop) grows without bound.
`LifetimeSystem` ages each one by `dt` and destroys it at zero.

---

## Enemies: a director, two archetypes, and homing

`EnemySystem` does three jobs each frame — **spawn**, **steer**, **cull** — and a
tiny `Director` object owns the difficulty knobs.

### Spawning with a budget

A timer gates spawns, and a cap keeps the sky sane:

```swift
director.spawnTimer -= dt                                   // EnemySystem.spawn
guard director.spawnTimer <= 0,
      world.store(Enemy.self).count < director.maxEnemies else { return }
director.spawnTimer = director.spawnInterval
```

New enemies appear in a **cone ahead of the camera**, placed using the *player's
own axes* so they're always roughly where you're looking:

```swift
let position = playerT.position
             + playerT.forward * Float.random(in: 120...190)   // out in front
             + playerT.right   * Float.random(in: -55...55)     // spread sideways
             + playerT.up      * Float.random(in: -20...28)     // and vertically
```

To make it harder over time, ramp the director — shrink `spawnInterval` or raise
`maxEnemies` as score climbs. That one object is your whole difficulty curve.

### Two archetypes, same mesh

A coin flip at spawn gives each enemy one of two behaviours — a clean
demonstration of composition:

- **Chaser** (red): gets a `Homing` component. Turns to track you.
- **Drifter** (amber): gets a `Velocity` toward you plus a `Spinner`. Flies a
  straight line and tumbles.

Same octahedron mesh, different components → different behaviour and colour. No
subclasses.

### Homing that steers instead of snapping

A chaser shouldn't instantly point at you — it should *turn* toward you at a
limited rate, so you can juke it. That's a rotation toward the target, clamped to
`turnRate · dt`:

```swift
let desired = simd_normalize(playerT.position - t.position)   // EnemySystem.steerHomers
let current = t.forward
let axis    = simd_cross(current, desired)                    // axis to rotate about
if simd_length(axis) > 0.0001 {
    let angle = min(h.turnRate * dt, acos(clamp(dot(current, desired), -1, 1)))
    rotation  = simd_normalize(Quat(angle: angle, axis: normalize(axis)) * t.rotation)
}
velocities.set(entity, Velocity(linear: rotation.act(Vec3(0,0,-1)) * h.speed))
```

The cross product gives the axis that rotates `current` toward `desired`; the
`acos(dot(...))` is the angle between them; `min(turnRate·dt, …)` caps the turn so
it can't overshoot. Then, like the player, velocity just follows the new nose.
Raise `turnRate` and chasers become relentless; lower it and they arc lazily and
miss.

### Culling

Enemies you outrun would pile up invisibly behind you, so `cull` destroys any
that drift past a radius:

```swift
if simd_length(t.position - playerT.position) > 280 { world.destroy(entity) }
```

Deferred destruction (chapter 04) makes this safe to call mid-loop.

---

## Collision: spheres, layers, and honesty about scale

Collision is a **broad-phase-free** sphere sweep. Every collidable is a point
plus a radius; two overlap when the distance between centres is under the sum of
radii — compared **squared**, to skip the square root:

```swift
let reach = a.radius + b.radius                                 // CollisionSystem
if simd_length_squared(a.center - b.center) <= reach * reach { /* hit */ }
```

Two interactions matter, and we spell them out rather than run a generic matcher:

- **bolt → enemy:** the bolt is consumed, the enemy takes damage, and if its
  health hits zero it dies and you score.
- **ship → enemy:** the enemy dies and your hull drops by 20 with a red flash.

`Collider` carries `layer`/`mask` fields (a `player`/`enemy`/`projectile`
`OptionSet`) to express *who can hit whom*. We check the two cases directly here
for readability, but the tags are there for when you add more interactions
(enemy bullets, pickups) and want a general rule instead of hand-written pairs.

### The scaling honesty

This sweep is **O(bolts × enemies)**. With a couple dozen of each, that's a few
hundred cheap checks per frame — nothing. But it grows quadratically, so a
bullet-hell with thousands of entities would choke. The fix is a **broad phase**:
bucket entities into a spatial grid (or hash) so each one only tests neighbours
in nearby cells, turning the quadratic sweep near-linear. We don't need it yet,
and pretending we do would just add code you can't feel — but chapter 12 flags it
as the first thing to add when counts climb. Knowing *where* the cliff is beats
optimising before it.

---

## Score, health, and respawn

The shared numbers live in a small `GameStats` reference object that systems
read and write:

```swift
final class GameStats {
    var score = 0
    var deaths = 0
    var playerHealth: Float = 100
    var playerMaxHealth: Float = 100   // the hull bar's denominator (chapter 11)
    var hitFlash: Float = 0            // seconds of red flash left (chapter 11)
}
```

`CollisionSystem` bumps `score` on a kill and drops `playerHealth` on a ram (and
sets `hitFlash`). `Game.update` ages the flash by `dt` and, when hull hits zero,
respawns:

```swift
if stats.playerHealth <= 0 { respawn() }   // reset ship, clear the field, keep score
```

Respawn resets the ship's transform and clears every enemy, but *keeps* the
score, so you're always chasing a high score across lives — a deliberately
forgiving loop for a prototype. Making death cost a life, or end the run to a
score screen, is a change to this one method.

---

## The pattern under all three

Spawning, weapons, AI, collision — none of them are objects with methods. Each is
a function over the `World` that reads some components and writes others, slotted
into the frame schedule at a specific point (chapter 07). That sameness is what
lets you add a new mechanic by writing *one more function of the same shape* and
adding *one more line* to the schedule. You've now seen every shape it takes.

---

**Next:** telling the player what's happening — the HUD. →
[Chapter 11: HUD & feedback](11-hud-and-feedback.md)
