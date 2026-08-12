# 10 · Gameplay systems 🛠️

> **You'll leave this chapter with:** an actual game — guns that fire, enemies
> that warp in and chase you, collisions that resolve, a score, and a respawn.
>
> **Files created:** `Systems/WeaponSystem.swift`, `Systems/EnemySystem.swift`,
> `Systems/LifetimeSystem.swift`, `Systems/CollisionSystem.swift`
> **Files changed:** `Game.swift`

Four new systems, and every one is the same shape you already know: a function
over the `World` that reads some components and writes others. You've written
five of these. These are the ones that make it a game rather than a flight demo.

---

## Weapons: a cooldown and a spawner

**`Sources/SpaceFighter/Systems/WeaponSystem.swift`** — new file:

```swift
import simd

/// Counts the gun's cooldown down and, while fire is held, spawns twin bolts.
enum WeaponSystem {
    static func update(_ world: World, player: Entity, input: InputState, dt: Float) {
        let weapons = world.store(Weapon.self)
        guard var weapon = weapons.get(player),
              let ship = world.get(Transform.self, player) else { return }

        weapon.cooldown = max(0, weapon.cooldown - dt)
        if input.firing && weapon.cooldown <= 0 {
            weapon.cooldown = weapon.fireInterval
        }
        weapons.set(player, weapon)
    }
}
```

The cooldown counts down in **seconds** via `dt`, which is what makes fire rate
frame-rate independent. Hold the trigger on a 120 Hz display and you still get
`1 / fireInterval` shots per second rather than double. This is the case chapter
07 warned about: a rate that doesn't look like motion but is one anyway.

Note `guard var weapon` then `weapons.set(player, weapon)` at the end — we pull a
copy, modify it, and put it back. We could use `mutate` instead, but we need to
read `ship` and spawn entities in the middle, and doing that inside a `mutate`
closure means mutating the world while holding a reference into one of its
stores. Copy-modify-write is the safer shape here.

Now the actual firing:

**`WeaponSystem.swift`**, in `update` — inside the `if`, before the cooldown reset:

```diff
         if input.firing && weapon.cooldown <= 0 {
+            fireBolt(world, from: ship, offset: ship.right * 0.9, speed: weapon.muzzleSpeed)
+            fireBolt(world, from: ship, offset: -ship.right * 0.9, speed: weapon.muzzleSpeed)
             weapon.cooldown = weapon.fireInterval
         }
```

`ship.right` is chapter 07's computed property, so "wingtips" is just ±0.9 along
the ship's own right axis. Roll the ship and the muzzles roll with it, for free.

**`WeaponSystem.swift`**, in `WeaponSystem` — after `update`:

```diff
         weapons.set(player, weapon)
     }
+
+    private static func fireBolt(_ world: World, from ship: Transform, offset: Vec3, speed: Float) {
+        let muzzle = ship.position + ship.forward * 2.2 + offset - ship.up * 0.1
+
+        var transform = Transform()
+        transform.position = muzzle
+        transform.rotation = ship.rotation
+        transform.scale = Vec3(0.18, 0.18, 0.7)   // a short glowing bar
+    }
 }
```

The muzzle is 2.2 units ahead of the ship's origin so bolts appear in front of
the nose rather than inside the hull, and 0.1 below so they read as coming from
under the wings. All three offsets use the ship's axes, so this is correct at any
orientation.

That `scale` is chapter 05's cube being restyled: `(0.18, 0.18, 0.7)` stretches
it along its local Z into a short bar, and since the bolt inherits the ship's
rotation, the bar points where it's travelling.

**`WeaponSystem.swift`**, in `fireBolt` — after the transform setup:

```diff
         transform.scale = Vec3(0.18, 0.18, 0.7)   // a short glowing bar
+
+        let bolt = world.createEntity()
+        world.add(transform, to: bolt)
+        world.add(Velocity(linear: ship.forward * speed), to: bolt)
+        world.add(Renderable(mesh: .projectile, color: Vec4(0.5, 1.0, 0.85, 1)), to: bolt)
+        world.add(Projectile(damage: 1), to: bolt)
+        world.add(Collider(radius: 0.6, layer: .projectile, mask: .enemy), to: bolt)
+        world.add(Lifetime(remaining: 2.4), to: bolt)
     }
```

There is the ECS thesis in six lines. A bolt is not an object — it's an id with
six components, five of which it shares with the ship and the enemies. Nothing
was subclassed and no new type was declared.

The `Lifetime` is not optional. Without it, every shot you ever fire lives
forever: the entity count climbs without bound, and since collision is
`bolts × enemies`, the frame time climbs with it. A bullet that misses has to die
on its own.

**`Sources/SpaceFighter/Systems/LifetimeSystem.swift`** — new file:

```swift
/// Ages every Lifetime and destroys the expired. This is what stops bolts
/// accumulating forever.
enum LifetimeSystem {
    static func update(_ world: World, dt: Float) {
        let lifetimes = world.store(Lifetime.self)
        for entity in lifetimes.owners {
            lifetimes.mutate(entity) { $0.remaining -= dt }
            if let l = lifetimes.get(entity), l.remaining <= 0 {
                world.destroy(entity)
            }
        }
    }
}
```

That loop calls `world.destroy` **while iterating the very store it's walking**.
It's safe for exactly one reason: chapter 04's `destroy` only appends an id to a
queue. This is the payoff for that design, and it's why every system in this
chapter can delete things without thinking about it.

---

## Enemies: a director, two archetypes, and homing

`EnemySystem` does three jobs each frame — spawn, steer, cull — and a small
`Director` object owns the difficulty knobs.

**`Sources/SpaceFighter/Systems/EnemySystem.swift`** — new file:

```swift
import Foundation
import simd

/// Spawns enemies ahead of the player, steers the homing ones, and clears out
/// anything that has drifted far behind.
enum EnemySystem {
    static func update(_ world: World, player: Entity, director: Director, dt: Float) {
        guard let playerT = world.get(Transform.self, player) else { return }

        spawn(world, playerT: playerT, director: director, dt: dt)
        steerHomers(world, playerT: playerT, dt: dt)
        cull(world, playerT: playerT)
    }
}
```

**`EnemySystem.swift`**, in `EnemySystem` — after `update`:

```diff
         cull(world, playerT: playerT)
     }
+
+    private static func spawn(_ world: World, playerT: Transform, director: Director, dt: Float) {
+        director.spawnTimer -= dt
+        let liveEnemies = world.store(Enemy.self).count
+        guard director.spawnTimer <= 0, liveEnemies < director.maxEnemies else { return }
+        director.spawnTimer = director.spawnInterval
+
+        let ahead = Float.random(in: 120...190)
+        let lateral = playerT.right * Float.random(in: -55...55)
+        let vertical = playerT.up * Float.random(in: -20...28)
+        let position = playerT.position + playerT.forward * ahead + lateral + vertical
+    }
 }
```

Two gates, not one. The timer sets the *rate*; `maxEnemies` sets the *ceiling*.
You need both — a timer alone means falling behind on kills spirals into an
unplayable swarm, and a cap alone means the field fills instantly and then never
changes.

Placement uses the **player's own axes**, so enemies appear in a cone in front of
wherever you happen to be looking rather than at fixed world coordinates. Fly in
circles and they keep arriving ahead of you.

**`EnemySystem.swift`**, in `spawn` — after `position`:

```diff
         let position = playerT.position + playerT.forward * ahead + lateral + vertical
+
+        let enemy = world.createEntity()
+        var transform = Transform()
+        transform.position = position
+        transform.scale = Vec3(repeating: Float.random(in: 1.6...2.6))
+        world.add(transform, to: enemy)
+        world.add(Enemy(health: 1), to: enemy)
+        world.add(Collider(radius: transform.scale.x * 0.9, layer: .enemy, mask: .player), to: enemy)
+
+        let towardPlayer = simd_normalize(playerT.position - position)
     }
```

The collider radius is derived from the scale rather than being a constant, so a
big enemy is a big target. `* 0.9` keeps the sphere slightly inside the visible
silhouette, which matters: a hitbox larger than the art feels unfair, while
slightly smaller feels generous and nobody notices.

Now the two archetypes — the same mesh, different components:

**`EnemySystem.swift`**, in `spawn` — after `towardPlayer`:

```diff
         let towardPlayer = simd_normalize(playerT.position - position)
+
+        if Bool.random() {
+            // Chaser: reddish, homes in.
+            world.add(Renderable(mesh: .enemy, color: Vec4(0.95, 0.35, 0.30, 1)), to: enemy)
+            world.add(Homing(turnRate: 0.9, speed: 46), to: enemy)
+            world.add(Velocity(linear: towardPlayer * 46), to: enemy)
+        } else {
+            // Drifter: amber, flies straight and tumbles.
+            world.add(Renderable(mesh: .enemy, color: Vec4(0.95, 0.7, 0.25, 1)), to: enemy)
+            let scatter = playerT.right * Float.random(in: -0.3...0.3)
+                        + playerT.up * Float.random(in: -0.2...0.2)
+            let heading = simd_normalize(towardPlayer + scatter)
+            world.add(Velocity(linear: heading * Float.random(in: 55...80)), to: enemy)
+            world.add(Spinner(axis: randomAxis(), speed: Float.random(in: 0.6...2.0)), to: enemy)
+        }
     }
```

This is composition doing real work. Two enemy *types* and there is no `Enemy`
subclass, no type enum, no switch anywhere else in the codebase. A chaser is an
entity that happens to hold a `Homing`; a drifter is one that happens to hold a
`Spinner`. `SpinSystem` from chapter 07 already tumbles the drifters without
knowing enemies exist, and the next function steers the chasers without knowing
about drifters.

The colour difference isn't decoration either — it's the only way the player can
tell which one is about to turn.

### Homing that steers rather than snaps

**`EnemySystem.swift`**, in `EnemySystem` — after `spawn`:

```diff
             world.add(Spinner(axis: randomAxis(), speed: Float.random(in: 0.6...2.0)), to: enemy)
         }
     }
+
+    private static func steerHomers(_ world: World, playerT: Transform, dt: Float) {
+        let homings = world.store(Homing.self)
+        let transforms = world.store(Transform.self)
+        let velocities = world.store(Velocity.self)
+
+        for entity in homings.owners {
+            guard let h = homings.get(entity), let t = transforms.get(entity) else { continue }
+            let toPlayer = playerT.position - t.position
+            let dist = simd_length(toPlayer)
+            guard dist > 0.001 else { continue }
+            let desired = toPlayer / dist
+        }
+    }
 }
```

Dividing by `dist` normalises without a second pass, and the `dist > 0.001` guard
avoids dividing by zero when an enemy is exactly on top of you — rare, but it
produces `NaN` that then propagates silently into the transform and makes the
entity vanish.

**`EnemySystem.swift`**, in `steerHomers` — after `desired`:

```diff
             let desired = toPlayer / dist
+
+            let current = t.forward
+            let axis = simd_cross(current, desired)
+            let axisLen = simd_length(axis)
+            var rotation = t.rotation
+            if axisLen > 0.0001 {
+                let maxStep = h.turnRate * dt
+                let cosTheta = max(-1, min(1, simd_dot(current, desired)))
+                let angle = min(maxStep, acos(cosTheta))
+                rotation = simd_normalize(Quat(angle: angle, axis: axis / axisLen) * t.rotation)
+            }
+            transforms.mutate(entity) { $0.rotation = rotation }
+            velocities.set(entity, Velocity(linear: rotation.act(Vec3(0, 0, -1)) * h.speed))
         }
```

A chaser that instantly points at you is unbeatable and boring. This turns
**toward** you at a limited rate, which is what makes juking work.

Both of chapter 03's vector products appear here doing exactly what they were
introduced for. The **cross product** gives the axis that rotates `current`
toward `desired`. The **dot product** gives the cosine of the angle between them,
and `acos` recovers the angle. Then `min(maxStep, angle)` caps the turn so it
can't overshoot — without that clamp, a chaser directly behind you would snap
180° in a single frame.

The `max(-1, min(1, ...))` clamp before `acos` is not paranoia. Floating-point
error can push a dot product of two unit vectors to `1.0000001`, and `acos` of
that is `NaN`, which silently corrupts the rotation.

Like the player, the enemy's velocity simply follows its new nose.

**`EnemySystem.swift`**, in `EnemySystem` — after `steerHomers`:

```diff
             velocities.set(entity, Velocity(linear: rotation.act(Vec3(0, 0, -1)) * h.speed))
         }
     }
+
+    private static func cull(_ world: World, playerT: Transform) {
+        let transforms = world.store(Transform.self)
+        for entity in world.store(Enemy.self).owners {
+            guard let t = transforms.get(entity) else { continue }
+            if simd_length(t.position - playerT.position) > 280 {
+                world.destroy(entity)
+            }
+        }
+    }
+
+    private static func randomAxis() -> Vec3 {
+        let a = Vec3(Float.random(in: -1...1), Float.random(in: -1...1), Float.random(in: -1...1))
+        let len = simd_length(a)
+        return len > 0.0001 ? a / len : Vec3(0, 1, 0)
+    }
 }
```

Culling matters more than it looks. You fly at 55 units/second and drifters don't
turn, so without this every enemy you outrun stays alive forever behind you,
consuming a collision test and a draw call each. The cull radius of 280 is
comfortably beyond the 190 spawn distance, so nothing gets deleted while still
plausibly in play.

---

## Collision: spheres, and honesty about how it scales

**`Sources/SpaceFighter/Systems/CollisionSystem.swift`** — new file:

```swift
import simd

/// Sphere collision with no broad phase. Two interactions matter: bolt hits
/// enemy, and ship hits enemy.
enum CollisionSystem {
    private struct Sphere {
        let entity: Entity
        let center: Vec3
        let radius: Float
    }
}
```

**`CollisionSystem.swift`**, in `CollisionSystem` — after `Sphere`:

```diff
         let radius: Float
     }
+
+    static func update(_ world: World, player: Entity, stats: GameStats) {
+        let transforms = world.store(Transform.self)
+        let colliders = world.store(Collider.self)
+
+        func spheres<C>(_ tag: ComponentStore<C>) -> [Sphere] {
+            var out: [Sphere] = []
+            out.reserveCapacity(tag.count)
+            for e in tag.owners {
+                guard let t = transforms.get(e), let c = colliders.get(e) else { continue }
+                out.append(Sphere(entity: e, center: t.position, radius: c.radius))
+            }
+            return out
+        }
+
+        let enemies = spheres(world.store(Enemy.self))
+        let bolts = spheres(world.store(Projectile.self))
+        var dead = Set<Entity>()
+    }
 }
```

`spheres` is generic over the *tag* component, so one helper collects "everything
with an `Enemy` and a collider" and "everything with a `Projectile` and a
collider". Gathering into a flat array first also means we're not holding
references into two stores while mutating a third.

`dead` exists because `world.destroy` is deferred: an enemy killed by one bolt is
still present in the `enemies` array for the rest of this frame, and without this
set a second bolt in the same frame would "kill" it again and score twice.

**`CollisionSystem.swift`**, in `update` — after `var dead`:

```diff
         var dead = Set<Entity>()
+
+        for bolt in bolts {
+            for enemy in enemies where !dead.contains(enemy.entity) {
+                let reach = bolt.radius + enemy.radius
+                guard simd_length_squared(bolt.center - enemy.center) <= reach * reach else { continue }
+                world.destroy(bolt.entity)
+                var killed = false
+                world.store(Enemy.self).mutate(enemy.entity) { e in
+                    e.health -= 1
+                    killed = e.health <= 0
+                }
+                if killed {
+                    world.destroy(enemy.entity)
+                    dead.insert(enemy.entity)
+                    stats.score += 100
+                }
+                break   // this bolt is spent
+            }
+        }
     }
```

The test itself is one line, and it compares **squared** distances to avoid a
square root per pair. `sqrt` isn't expensive on modern hardware, but this is the
innermost loop of the whole game and the comparison is exactly equivalent.

The `break` is a rule, not an optimisation: one bolt hits one thing. Without it, a
single bolt passing through overlapping enemies would damage all of them.

**`CollisionSystem.swift`**, in `update` — after the bolt loop:

```diff
                 break   // this bolt is spent
             }
         }
+
+        guard let shipT = transforms.get(player), let shipC = colliders.get(player) else { return }
+        for enemy in enemies where !dead.contains(enemy.entity) {
+            let reach = shipC.radius + enemy.radius
+            guard simd_length_squared(shipT.position - enemy.center) <= reach * reach else { continue }
+            world.destroy(enemy.entity)
+            dead.insert(enemy.entity)
+            stats.playerHealth -= 20
+            stats.hitFlash = 0.5
+        }
     }
```

Ramming destroys the enemy and costs 20 hull, so five collisions kill you.
`hitFlash = 0.5` is a request the HUD will honour in chapter 11 — collision knows
nothing about drawing, it just records that something worth showing happened.

### Where this stops working

This sweep is **O(bolts × enemies)**. With ~20 of each that's a few hundred cheap
tests per frame, which is nothing. But it's quadratic: ten times the entities is a
*hundred* times the work, so a bullet-hell version of this game would stall.

The fix is a **broad phase** — bucket entities into a spatial grid or hash so each
one only tests against neighbours in nearby cells, turning the sweep near-linear.
We haven't built one because at this scale you could not measure the difference,
and code you can't feel is code you can't debug. Knowing exactly *where* the cliff
is beats optimising before you reach it. Chapter 12 flags this as the first thing
to add when counts climb.

---

## Finishing `Game.swift`

Five edits and the game is complete.

**`Game.swift`** — a difficulty object, after `GameStats`:

```diff
     var hitFlash: Float = 0     // seconds of red flash remaining
 }
+
+/// Difficulty knobs. Shrink spawnInterval or raise maxEnemies for a busier sky.
+final class Director {
+    var spawnTimer: Float = 1.0
+    var spawnInterval: Float = 1.3
+    var maxEnemies: Int = 22
+}
```

A `class` because `EnemySystem` mutates `spawnTimer` every frame and needs those
writes to persist — the same reasoning as `GameStats`.

**`Game.swift`**, in `Game` — hold one:

```diff
     let world = World()
     let stats = GameStats()
+    let director = Director()
     private(set) var player: Entity = Entity(id: 0)
```

**`Game.swift`**, in `update` — the schedule gains four systems:

```diff
         FlightControlSystem.update(world, player: player, input: input, dt: dt)
+        WeaponSystem.update(world, player: player, input: input, dt: dt)
+        EnemySystem.update(world, player: player, director: director, dt: dt)
         MovementSystem.update(world, dt: dt)
         SpinSystem.update(world, dt: dt)
+        LifetimeSystem.update(world, dt: dt)
+        CollisionSystem.update(world, player: player, stats: stats)
         world.flushDestroyed()
```

Read it as a sentence: *aim the ship, maybe fire, spawn and steer enemies, move
everything, tumble the drifters, age out old bolts, resolve hits, delete the
dead.* Eight lines that are the entire control flow of the game.

Every position in that list is load-bearing. Weapons fire **before** movement, so
a bolt spawns at the nose's current position and *then* travels; after movement it
would trail a frame behind. Collision runs **after** movement, so it tests where
things actually ended up. `flushDestroyed` runs **last**, so no system ever sees a
half-deleted world.

**`Game.swift`**, in `update` — age the flash and handle death:

```diff
         world.flushDestroyed()
 
-        let t = world.get(Transform.self, player) ?? Transform()
+        stats.hitFlash = max(0, stats.hitFlash - dt)
+        if stats.playerHealth <= 0 { respawn() }
+
         let (view, eye) = CameraSystem.viewMatrix(world, player: player)
```

**`Game.swift`**, in `update` — the return, now that `t` is gone:

```diff
                                   lightDirection: lightDirection)
 
+        let instances = RenderSystem.buildInstances(world)
+        let position = world.get(Transform.self, player)?.position ?? .zero
+
         return FrameRenderData(frame: frame,
-                               instances: RenderSystem.buildInstances(world),
-                               playerPosition: t.position,
+                               instances: instances,
+                               playerPosition: position,
                                hud: [])
```

We re-query the transform *after* the systems have run, so `playerPosition` is
this frame's position and the grid snaps to where the ship actually is.

**`Game.swift`**, in `Game` — respawn:

```diff
                                hud: [])
     }
+
+    private func respawn() {
+        stats.playerHealth = stats.playerMaxHealth
+        stats.deaths += 1
+        world.store(Transform.self).mutate(player) {
+            $0.position = .zero
+            $0.rotation = Quat(angle: 0, axis: Vec3(0, 1, 0))
+        }
+        for enemy in world.store(Enemy.self).owners {
+            world.destroy(enemy)
+        }
+        world.flushDestroyed()
+    }
 }
```

Note what respawn *doesn't* do: it never destroys and recreates the player. It
resets the transform on the existing entity, so every id, component and reference
stays valid — which is exactly why chapter 04 could get away with never
implementing entity generations.

Score persists across deaths, which makes this a deliberately forgiving loop.
Turning it into lives-and-game-over is a change to this one method.

---

## Checkpoint

```console
$ swift run
```

**It's a game.** Within a second or two, octahedra warp in ahead of you: amber
ones tumble past on a straight line, red ones bend toward you. Hold `Space` and
twin cyan bolts streak from your wingtips. Hit an enemy and it vanishes and the
title-bar score jumps by 100. Ram one and your hull drops 20; at zero you respawn
at the origin with the field cleared and your score intact.

Verify four things specifically:

1. **Bolts expire.** Fire into empty space; they disappear after 2.4 seconds
   rather than flying forever.
2. **Chasers actually chase** — fly past a red one and it swings around behind
   you, slowly enough to outmanoeuvre.
3. **The count stays bounded.** The sky gets busy but never unbounded, and enemies
   you leave behind get culled.
4. **Score doesn't double-count.** Fly into a dense cluster and fire; each kill
   scores exactly 100. If you see 200s, the `dead` set isn't doing its job.

**If nothing spawns**, check `EnemySystem.update` is in the schedule. **If bolts
pass through enemies**, `CollisionSystem` is running before `MovementSystem`.
**If the frame rate collapses after a minute**, your bolts have no `Lifetime`.

### Knobs worth turning right now

- `Director.spawnInterval` 1.3 → 0.4 — a much busier sky.
- `Homing.turnRate` at the spawn site 0.9 → 2.0 — genuinely frightening chasers.
- `Weapon.fireInterval` in `Components.swift` 0.14 → 0.05 — a minigun.

---

## Challenge

Add a third enemy archetype: a **splitter** that breaks into two smaller,
faster drifters when killed. You'll need a new component holding the number of
splits remaining, and the split has to happen where the kill is detected — inside
`CollisionSystem`, at the point `killed` becomes true.

Two traps are waiting. Spawning entities while iterating `enemies` means the new
ones are not in that array, so they cannot be hit this frame — decide whether
that's a bug or a feature. And a splitter whose children are also splitters is an
entity bomb; the counter is what stops it, so make sure it decrements on the
children and not just the parent.

---

**Next:** tell the player what's happening. →
[Chapter 11: HUD & feedback](11-hud-and-feedback.md)
