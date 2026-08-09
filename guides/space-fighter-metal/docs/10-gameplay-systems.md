# 10 · Gameplay systems 🛠️

> **You'll leave this chapter with:** an actual game — guns that fire, enemies
> that warp in and chase you, collisions that resolve, a score, and a respawn.
> Plus the finished `Game.swift` with the full schedule.
>
> **Files created:** `Systems/WeaponSystem.swift`, `Systems/EnemySystem.swift`,
> `Systems/LifetimeSystem.swift`, `Systems/CollisionSystem.swift`
> **Files changed:** `Game.swift` (shown complete)

This is the biggest chapter by file count, but every file is the same shape: a
function over the `World` that reads some components and writes others. You've
written four already; here are four more.

---

## Weapons: a cooldown and two spawns

Firing is a rate-limited spawner. The `Weapon` component (chapter 07) holds the
state; the system counts it down and, while `Space` is held, emits twin bolts.

### Create `Sources/SpaceFighter/Systems/WeaponSystem.swift`

```swift
import simd

/// Handles the player's guns: counts down the cooldown, and while the fire
/// button is held spawns twin bolts from the wingtips at a fixed cadence.
enum WeaponSystem {
    static func update(_ world: World, player: Entity, input: InputState, dt: Float) {
        let weapons = world.store(Weapon.self)
        guard var weapon = weapons.get(player),
              let ship = world.get(Transform.self, player) else { return }

        weapon.cooldown = max(0, weapon.cooldown - dt)
        if input.firing && weapon.cooldown <= 0 {
            fireBolt(world, from: ship, offset: ship.right * 0.9, speed: weapon.muzzleSpeed)
            fireBolt(world, from: ship, offset: -ship.right * 0.9, speed: weapon.muzzleSpeed)
            weapon.cooldown = weapon.fireInterval
        }
        weapons.set(player, weapon)
    }

    /// Spawn one projectile entity. Note it is *pure data*: a transform, a
    /// velocity, something to draw, a hitbox, and a fuse. No projectile class.
    private static func fireBolt(_ world: World, from ship: Transform, offset: Vec3, speed: Float) {
        let muzzle = ship.position + ship.forward * 2.2 + offset - ship.up * 0.1

        var transform = Transform()
        transform.position = muzzle
        transform.rotation = ship.rotation
        transform.scale = Vec3(0.18, 0.18, 0.7)   // a short glowing bar

        let bolt = world.createEntity()
        world.add(transform, to: bolt)
        world.add(Velocity(linear: ship.forward * speed), to: bolt)
        world.add(Renderable(mesh: .projectile, color: Vec4(0.5, 1.0, 0.85, 1)), to: bolt)
        world.add(Projectile(damage: 1), to: bolt)
        world.add(Collider(radius: 0.6, layer: .projectile, mask: .enemy), to: bolt)
        world.add(Lifetime(remaining: 2.4), to: bolt)
    }
}
```

The cooldown in *seconds* (decremented by `dt`) is what makes fire rate
frame-rate independent — hold the trigger on a 120 Hz display and you still get
`1 / fireInterval` shots per second, not double.

`fireBolt` is the ECS thesis in miniature: a bolt is six components and no class.
It reuses the same `Transform`, `Velocity`, `Renderable` and `Collider` the ship
and enemies use, and its `scale` of `(0.18, 0.18, 0.7)` turns chapter 05's cube
mesh into a glowing bar.

The `Lifetime` is essential: without it, every shot you ever fire lives forever,
and the entity count (and the collision loop) grows without bound.

### Create `Sources/SpaceFighter/Systems/LifetimeSystem.swift`

```swift
/// Counts down every `Lifetime` and destroys entities whose fuse runs out. This
/// is what keeps bolts from flying forever. Destruction is deferred by the
/// `World`, so it's safe to call `destroy` while iterating here.
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

That loop calls `world.destroy` *while iterating the very store it's walking* —
which is safe precisely because chapter 04's `destroy` only queues an id. This is
the payoff for that design decision.

---

## Enemies: a director, two archetypes, and homing

`EnemySystem` does three jobs each frame — **spawn**, **steer**, **cull** — and a
tiny `Director` object (added to `Game.swift` below) owns the difficulty knobs.

A coin flip at spawn gives each enemy one of two behaviours, which is a clean
demonstration of composition:

- **Chaser** (red): gets a `Homing` component. Turns to track you.
- **Drifter** (amber): gets a `Velocity` toward you plus a `Spinner`. Flies a
  straight line and tumbles.

Same octahedron mesh, different components → different behaviour and colour. No
subclasses.

### Create `Sources/SpaceFighter/Systems/EnemySystem.swift`

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

    // MARK: Spawning

    private static func spawn(_ world: World, playerT: Transform, director: Director, dt: Float) {
        director.spawnTimer -= dt
        let liveEnemies = world.store(Enemy.self).count
        guard director.spawnTimer <= 0, liveEnemies < director.maxEnemies else { return }
        director.spawnTimer = director.spawnInterval

        // Place it in a cone in front of the camera using the player's own axes.
        let ahead = Float.random(in: 120...190)
        let lateral = playerT.right * Float.random(in: -55...55)
        let vertical = playerT.up * Float.random(in: -20...28)
        let position = playerT.position + playerT.forward * ahead + lateral + vertical

        let enemy = world.createEntity()
        var transform = Transform()
        transform.position = position
        transform.scale = Vec3(repeating: Float.random(in: 1.6...2.6))
        world.add(transform, to: enemy)
        world.add(Enemy(health: 1), to: enemy)
        world.add(Collider(radius: transform.scale.x * 0.9, layer: .enemy, mask: .player), to: enemy)

        let towardPlayer = simd_normalize(playerT.position - position)

        if Bool.random() {
            // Chaser: reddish, homes in.
            world.add(Renderable(mesh: .enemy, color: Vec4(0.95, 0.35, 0.30, 1)), to: enemy)
            world.add(Homing(turnRate: 0.9, speed: 46), to: enemy)
            world.add(Velocity(linear: towardPlayer * 46), to: enemy)
        } else {
            // Drifter: amber, flies straight and tumbles.
            world.add(Renderable(mesh: .enemy, color: Vec4(0.95, 0.7, 0.25, 1)), to: enemy)
            let scatter = playerT.right * Float.random(in: -0.3...0.3)
                        + playerT.up * Float.random(in: -0.2...0.2)
            let heading = simd_normalize(towardPlayer + scatter)
            world.add(Velocity(linear: heading * Float.random(in: 55...80)), to: enemy)
            world.add(Spinner(axis: randomAxis(), speed: Float.random(in: 0.6...2.0)), to: enemy)
        }
    }

    // MARK: Homing

    private static func steerHomers(_ world: World, playerT: Transform, dt: Float) {
        let homings = world.store(Homing.self)
        let transforms = world.store(Transform.self)
        let velocities = world.store(Velocity.self)

        for entity in homings.owners {
            guard let h = homings.get(entity), let t = transforms.get(entity) else { continue }
            let toPlayer = playerT.position - t.position
            let dist = simd_length(toPlayer)
            guard dist > 0.001 else { continue }
            let desired = toPlayer / dist

            // Rotate the current heading toward the player by at most turnRate·dt.
            let current = t.forward
            let axis = simd_cross(current, desired)
            let axisLen = simd_length(axis)
            var rotation = t.rotation
            if axisLen > 0.0001 {
                let maxStep = h.turnRate * dt
                let cosTheta = max(-1, min(1, simd_dot(current, desired)))
                let angle = min(maxStep, acos(cosTheta))
                rotation = simd_normalize(Quat(angle: angle, axis: axis / axisLen) * t.rotation)
            }
            transforms.mutate(entity) { $0.rotation = rotation }
            velocities.set(entity, Velocity(linear: rotation.act(Vec3(0, 0, -1)) * h.speed))
        }
    }

    // MARK: Housekeeping

    private static func cull(_ world: World, playerT: Transform) {
        let transforms = world.store(Transform.self)
        for entity in world.store(Enemy.self).owners {
            guard let t = transforms.get(entity) else { continue }
            if simd_length(t.position - playerT.position) > 280 {
                world.destroy(entity)
            }
        }
    }

    private static func randomAxis() -> Vec3 {
        let a = Vec3(Float.random(in: -1...1), Float.random(in: -1...1), Float.random(in: -1...1))
        let len = simd_length(a)
        return len > 0.0001 ? a / len : Vec3(0, 1, 0)
    }
}
```

### Homing that steers instead of snapping

A chaser shouldn't instantly point at you — it should *turn* toward you at a
limited rate, so you can juke it. That's the block in `steerHomers`: the cross
product gives the axis that rotates `current` toward `desired`, `acos(dot(...))`
is the angle between them, and `min(turnRate * dt, …)` caps the turn so it can't
overshoot. Then, exactly like the player, velocity just follows the new nose.

Raise `turnRate` and chasers become relentless; lower it and they arc lazily and
miss. The `cull` pass matters too — enemies you outrun would otherwise pile up
invisibly behind you forever.

---

## Collision: spheres, layers, and honesty about scale

Every collidable is a point plus a radius; two overlap when the distance between
centres is under the sum of radii — compared **squared**, to skip the square
root.

### Create `Sources/SpaceFighter/Systems/CollisionSystem.swift`

```swift
import simd

/// Broad-phase-free sphere collision. At these entity counts a simple O(bolts ×
/// enemies) sweep is more than fast enough, and it's easy to read. Two
/// interactions matter:
///
///   * **bolt → enemy**: the bolt is consumed and the enemy takes damage.
///   * **ship → enemy**: the enemy is destroyed and the hull takes a hit.
enum CollisionSystem {
    private struct Sphere {
        let entity: Entity
        let center: Vec3
        let radius: Float
    }

    static func update(_ world: World, player: Entity, stats: GameStats) {
        let transforms = world.store(Transform.self)
        let colliders = world.store(Collider.self)

        func spheres<C>(_ tag: ComponentStore<C>) -> [Sphere] {
            var out: [Sphere] = []
            out.reserveCapacity(tag.count)
            for e in tag.owners {
                guard let t = transforms.get(e), let c = colliders.get(e) else { continue }
                out.append(Sphere(entity: e, center: t.position, radius: c.radius))
            }
            return out
        }

        let enemies = spheres(world.store(Enemy.self))
        let bolts = spheres(world.store(Projectile.self))
        var dead = Set<Entity>()

        // Bolts vs. enemies.
        for bolt in bolts {
            for enemy in enemies where !dead.contains(enemy.entity) {
                let reach = bolt.radius + enemy.radius
                guard simd_length_squared(bolt.center - enemy.center) <= reach * reach else { continue }
                world.destroy(bolt.entity)
                var killed = false
                world.store(Enemy.self).mutate(enemy.entity) { e in
                    e.health -= 1
                    killed = e.health <= 0
                }
                if killed {
                    world.destroy(enemy.entity)
                    dead.insert(enemy.entity)
                    stats.score += 100
                }
                break   // this bolt is spent
            }
        }

        // Ship vs. enemies.
        guard let shipT = transforms.get(player), let shipC = colliders.get(player) else { return }
        for enemy in enemies where !dead.contains(enemy.entity) {
            let reach = shipC.radius + enemy.radius
            guard simd_length_squared(shipT.position - enemy.center) <= reach * reach else { continue }
            world.destroy(enemy.entity)
            dead.insert(enemy.entity)
            stats.playerHealth -= 20
            stats.hitFlash = 0.5
        }
    }
}
```

`Collider` carries `layer`/`mask` fields to express *who can hit whom*. We check
the two cases directly here for readability, but the tags are there for when you
add more interactions (enemy bullets, pickups) and want a general rule instead of
hand-written pairs.

### The scaling honesty

This sweep is **O(bolts × enemies)**. With a couple dozen of each that's a few
hundred cheap checks per frame — nothing. But it grows quadratically, so a
bullet-hell with thousands of entities would choke. The fix is a **broad phase**:
bucket entities into a spatial grid or hash so each one only tests neighbours in
nearby cells, turning the quadratic sweep near-linear. We don't need it yet, and
adding it now would be code you can't feel — but knowing *where* the cliff is
beats optimising before it. Chapter 12 flags it as the first thing to add when
counts climb.

---

## Update `Game.swift` — the complete file

This is the finished spine. It adds the `Director`, the full system schedule, and
respawn. Replace the whole file:

```swift
import simd

/// Mutable game-wide numbers that several systems read or write. Kept as a
/// reference type so systems can share one instance.
final class GameStats {
    var score = 0
    var deaths = 0
    var playerHealth: Float = 100
    var playerMaxHealth: Float = 100
    var hitFlash: Float = 0     // seconds of red flash remaining
}

/// Controls enemy spawning and difficulty. Bump `spawnInterval` down or
/// `maxEnemies` up to make the sky busier.
final class Director {
    var spawnTimer: Float = 1.0
    var spawnInterval: Float = 1.3
    var maxEnemies: Int = 22
}

/// Everything the renderer needs for one frame, handed back from `Game.update`.
struct FrameRenderData {
    var frame: FrameUniforms
    var instances: [MeshID: [InstanceData]]
    var playerPosition: Vec3
    var hud: [HUDVertex]
}

/// Owns the world and drives the fixed sequence of systems every frame. The
/// *order* of these calls is the game's logic: read input, act, integrate,
/// resolve, then present. Reordering them changes behaviour, so it lives in one
/// obvious place.
final class Game {
    let world = World()
    let stats = GameStats()
    let director = Director()
    private(set) var player: Entity = Entity(id: 0)

    // Camera tuning.
    private let fieldOfView: Float = 65
    private let lightDirection = simd_normalize(Vec3(-0.3, -1.0, -0.55))

    init() {
        spawnPlayer()
    }

    private func spawnPlayer() {
        player = world.createEntity()
        world.add(Transform(), to: player)
        world.add(Velocity(), to: player)
        world.add(Player(), to: player)
        world.add(Weapon(), to: player)
        world.add(Renderable(mesh: .ship, color: Vec4(0.82, 0.9, 1.0, 1)), to: player)
        world.add(Collider(radius: 1.3, layer: .player, mask: .enemy), to: player)
    }

    /// Advance the simulation by `dt` seconds and produce this frame's draw data.
    func update(dt rawDt: Float, input: InputState, aspect: Float) -> FrameRenderData {
        // Clamp the step so a hiccup (window drag, breakpoint) can't teleport
        // everything through walls.
        let dt = min(max(rawDt, 0), 1.0 / 30.0)

        // --- The system schedule --------------------------------------------
        FlightControlSystem.update(world, player: player, input: input, dt: dt)
        WeaponSystem.update(world, player: player, input: input, dt: dt)
        EnemySystem.update(world, player: player, director: director, dt: dt)
        MovementSystem.update(world, dt: dt)
        SpinSystem.update(world, dt: dt)
        LifetimeSystem.update(world, dt: dt)
        CollisionSystem.update(world, player: player, stats: stats)
        world.flushDestroyed()
        // --------------------------------------------------------------------

        stats.hitFlash = max(0, stats.hitFlash - dt)
        if stats.playerHealth <= 0 { respawn() }

        // Camera + projection -> the frame uniforms every shader reads.
        let (view, eye) = CameraSystem.viewMatrix(world, player: player)
        let projection = Math.perspective(fovyRadians: fieldOfView.radians,
                                          aspect: max(aspect, 0.01),
                                          near: 0.1, far: 1200)
        let frame = FrameUniforms(viewProjection: projection * view,
                                  cameraPosition: eye,
                                  lightDirection: lightDirection)

        let instances = RenderSystem.buildInstances(world)
        let position = world.get(Transform.self, player)?.position ?? .zero

        return FrameRenderData(frame: frame,
                               instances: instances,
                               playerPosition: position,
                               hud: [])          // chapter 11 fills this in
    }

    /// On destruction, reset the ship and clear the field. Score persists so you
    /// can still chase a high score across lives.
    private func respawn() {
        stats.playerHealth = stats.playerMaxHealth
        stats.deaths += 1
        world.store(Transform.self).mutate(player) {
            $0.position = .zero
            $0.rotation = Quat(angle: 0, axis: Vec3(0, 1, 0))
        }
        for enemy in world.store(Enemy.self).owners {
            world.destroy(enemy)
        }
        world.flushDestroyed()
    }
}
```

Read the schedule as a sentence: *point the ship, fire if asked, spawn and steer
enemies, move everything, spin the tumblers, age out old bolts, resolve
collisions, then delete whatever died.* Eight lines that are the entire control
flow of the game.

---

## Checkpoint

```console
$ swift run
```

**It's a game.** Within a second or two, octahedra start warping in ahead of you:
amber ones tumble past on a straight line, red ones bend toward you. Hold `Space`
and twin cyan bolts streak from your wingtips. Hit an enemy and it vanishes,
and the title bar's score jumps by 100. Ram one and your hull drops by 20; at
zero you respawn at the origin with the field cleared and your score intact.

Things worth verifying:

1. **Bolts expire.** Fire into empty space and watch — they disappear after 2.4
   seconds rather than flying forever.
2. **Chasers actually chase.** Fly past a red one and it swings around behind
   you, but slowly enough that you can outmanoeuvre it.
3. **The enemy count stays bounded.** `maxEnemies` is 22; the sky gets busy but
   never unbounded, and `cull` clears the ones you've left behind.

**If nothing spawns**, check that `EnemySystem.update` is in the schedule and
that `director.spawnInterval` isn't enormous. **If bolts pass through enemies**,
check that `CollisionSystem.update` runs *after* `MovementSystem.update`.

### Knobs worth turning right now

- `Director.spawnInterval` (1.3 → 0.4) — a much busier sky.
- `Homing.turnRate` at the spawn site (0.9 → 2.0) — genuinely scary chasers.
- `Weapon.fireInterval` in `Components.swift` (0.14 → 0.05) — a minigun.

---

## The pattern under all four

Spawning, weapons, AI, collision — none are objects with methods. Each is a
function over the `World` that reads some components and writes others, slotted
into the frame schedule at a specific point. That sameness is what lets you add a
new mechanic by writing *one more function of the same shape* and adding *one
more line* to the schedule. You've now seen every shape it takes.

---

**Next:** tell the player what's happening. →
[Chapter 11: HUD & feedback](11-hud-and-feedback.md)
