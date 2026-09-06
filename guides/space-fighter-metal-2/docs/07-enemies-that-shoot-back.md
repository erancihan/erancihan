# 07 · Enemies that shoot back 🛠️

> **You'll leave this chapter with:** five kinds of enemy — drifters,
> chasers, gunners that lead their shots, strafers that circle you, and a
> boss every fifth wave — flown by the same flight code you fly, sent at you
> in waves that escalate, and blowing up when they die.
>
> **Files created:** `Sources/SpaceFighter/Components/AI.swift`,
> `Core/Aim.swift`, `Systems/EnemyAISystem.swift`,
> `Systems/EnemyWeaponSystem.swift`, `Systems/WaveDirector.swift`,
> `Systems/HomingSystem.swift`, `Systems/DebrisSystem.swift`,
> `Archetypes/Explosion.swift`, `Tests/SpaceFighterTests/Ch07EnemyTests.swift`
> **Files changed:** `Systems/FlightControlSystem.swift`,
> `Components/Gameplay.swift`, `Components/Flight.swift`,
> `Archetypes/Enemy.swift` (rewritten), `Archetypes/Player.swift`,
> `Archetypes/Projectile.swift`, `Systems/CameraSystem.swift`,
> `Systems/HUDSystem.swift`, `Core/Math.swift`, `Game.swift`,
> `Tests/SpaceFighterTests/Ch04FlightTests.swift`
> **Files deleted:** `Systems/EnemySystem.swift`

The first guide's enemies were octahedra that flew at you and died in one
hit, spawned on a timer that never stopped. It called them "something to
shoot at", and that was accurate. This chapter turns them into something to
*fight*: they steer with the same inertia you do, some of them hold their
distance and shoot, some of them circle, one of them is enormous — and they
arrive in waves with a beginning and an end, so that surviving one means
something.

Everything below leans on chapter 06. Enemies shoot because bolts have
teams; they die because health is a component; they explode because death
is an event.

---

## Enemies fly the way you do

Chapter 04 built a flight model and gave it to the player. The single most
useful decision in this chapter is not to build a second one for enemies.
An enemy with the same `FlightModel`, `AngularVelocity` and `Velocity`
components, flown by the same system, has the same inertia, the same slide,
the same tell when it starts a turn — and it's exactly as deterministic as
you are, which chapter 13 will care about.

Two things stand in the way. The flight system takes a `player:` and an
`InputFrame`, and the throttle state lives on the `Player` component. Both
are one-player assumptions, and both go.

**`Sources/SpaceFighter/Components/Gameplay.swift`** — replace `Player`:

```swift
/// Tags a player-controlled ship.
struct Player {}

/// Simulation. The throttle and what it has produced so far. Anything with a
/// FlightModel has one of these; the flight system moves speed toward what
/// the throttle asks for.
struct Engine {
    var throttle: Float = 0.5  // 0…1, where in the speed envelope the pilot wants to be
    var speed: Float = 0       // world units / second, where the ship actually is
    var boosting: Bool = false
}

/// A fragment of something that blew up. Purely visual, but simulated, so a
/// replay shows the same explosion.
struct Debris {}
```

`Player` is a tag again, which is what it was in the first guide before
chapter 04 put state on it. The state moves to `Engine`, which anything that
flies can have. `Debris` is for the end of the chapter.

**`Sources/SpaceFighter/Archetypes/Player.swift`**, in `spawnPlayer`:

```diff
     world.add(FlightModel.fighter, to: e)
+    world.add(Engine(), to: e)
     world.add(Player(), to: e)
```

**`Sources/SpaceFighter/Systems/FlightControlSystem.swift`** — replace the
head of `update` through the `guard`, and give the function a general twin:

```swift
    static func update(_ world: World, player: Entity, input: InputFrame, dt: Float) {
        apply(
            world, to: player, stick: Vec3(input.pitch, input.yaw, input.roll),
            throttleInput: input.throttle, boosting: input.boosting, dt: dt)
    }

    /// Fly one entity by one step. The player's stick comes from the input
    /// frame; an enemy's from its AI. Everything below this line is the same
    /// for both.
    static func apply(
        _ world: World, to entity: Entity, stick: Vec3, throttleInput: Float, boosting: Bool,
        dt: Float
    ) {
        let engines = world.store(Engine.self)
        let transforms = world.store(Transform.self)
        let velocities = world.store(Velocity.self)
        let angulars = world.store(AngularVelocity.self)

        guard var engine = engines.get(entity),
            var t = transforms.get(entity),
            var av = angulars.get(entity),
            var v = velocities.get(entity),
            let model = world.get(FlightModel.self, entity)
        else { return }
```

`update` becomes a two-line adapter: it turns an `InputFrame` into the three
things the flight model actually needs — a stick, a throttle axis, a boost
flag — and calls `apply`. An AI will call `apply` directly. The body that
follows is chapter 04's with three renames:

**`FlightControlSystem.swift`**, in `apply` — the rest of the body:

```diff
-        let stick = Vec3(input.pitch, input.yaw, input.roll)
         var target = stick * model.maxRate
-        if model.autoLevel > 0 && input.roll == 0 {
+        if model.autoLevel > 0 && stick.z == 0 {
             target.z = levellingRoll(t, model: model)
         }
```

```diff
-        pl.boosting = input.boosting
-        pl.throttle = min(max(pl.throttle + input.throttle * model.throttleResponse * dt, 0), 1)
-        let cruise = simd_mix(model.minSpeed, model.maxSpeed, pl.throttle)
-        let wanted = pl.boosting ? model.boostSpeed : cruise
-        pl.speed = Math.moveToward(pl.speed, wanted, model.speedResponse * dt)
+        engine.boosting = boosting
+        engine.throttle = min(max(engine.throttle + throttleInput * model.throttleResponse * dt, 0), 1)
+        let cruise = simd_mix(model.minSpeed, model.maxSpeed, engine.throttle)
+        let wanted = engine.boosting ? model.boostSpeed : cruise
+        engine.speed = Math.moveToward(engine.speed, wanted, model.speedResponse * dt)

-        let desired = t.forward * pl.speed
+        let desired = t.forward * engine.speed
         v.linear += (desired - v.linear) * (1 - exp(-model.linearResponse * dt))

-        players.set(player, pl)
-        transforms.set(player, t)
-        angulars.set(player, av)
-        velocities.set(player, v)
+        engines.set(entity, engine)
+        transforms.set(entity, t)
+        angulars.set(entity, av)
+        velocities.set(entity, v)
```

Two readers of the old `Player` fields follow it to `Engine`:

**`Sources/SpaceFighter/Systems/CameraSystem.swift`**, in `update`:

```diff
         guard let current = world.get(Transform.self, player),
-            let pl = world.get(Player.self, player),
+            let engine = world.get(Engine.self, player),
             let model = world.get(FlightModel.self, player)
         else { return }
```

```diff
-            let overBoost = (pl.speed - model.maxSpeed) / (model.boostSpeed - model.maxSpeed)
+            let overBoost = (engine.speed - model.maxSpeed) / (model.boostSpeed - model.maxSpeed)
```

**`Sources/SpaceFighter/Game.swift`**, in `flightDebug`:

```diff
             let model = world.get(FlightModel.self, player),
-            let pl = world.get(Player.self, player)
+            let engine = world.get(Engine.self, player)
         else { return nil }
         return FlightDebug(
             stick: Vec3(lastInput.pitch, lastInput.yaw, lastInput.roll),
             rate: av.body / model.maxRate,
-            throttle: pl.throttle,
-            speed: pl.speed / model.boostSpeed)
+            throttle: engine.throttle,
+            speed: engine.speed / model.boostSpeed)
```

And chapter 04's tests, which pulled `Player` out of the world to read the
throttle:

**`Tests/SpaceFighterTests/Ch04FlightTests.swift`**, in `player`:

```diff
-private func player(_ game: Game) -> (Transform, AngularVelocity, Player, Velocity) {
+private func player(_ game: Game) -> (Transform, AngularVelocity, Engine, Velocity) {
     (
         game.world.get(Transform.self, game.player)!,
         game.world.get(AngularVelocity.self, game.player)!,
-        game.world.get(Player.self, game.player)!,
+        game.world.get(Engine.self, game.player)!,
         game.world.get(Velocity.self, game.player)!
     )
 }
```

**`Ch04FlightTests.swift`**, in `throttlePersistsWhenReleased`:

```diff
-    let (_, _, pl, _) = player(game)
-    #expect(pl.throttle == 1)
-    #expect(pl.speed == FlightModel.fighter.maxSpeed)
+    let (_, _, engine, _) = player(game)
+    #expect(engine.throttle == 1)
+    #expect(engine.speed == FlightModel.fighter.maxSpeed)
```

Now the flight models the enemies will use.

**`Sources/SpaceFighter/Components/Flight.swift`**, in `FlightModel` — after
`fighter`:

```diff
         autoLevel: 0)
+
+    /// Slower to turn than the player on every axis, so a chaser can be
+    /// out-turned; fast in a straight line, so it can't be outrun for long.
+    static let chaser = FlightModel(
+        maxRate: Vec3(1.3, 0.4, 2.5),
+        angularAccel: Vec3(4, 1.5, 8),
+        angularDamping: Vec3(6, 3, 10),
+        minSpeed: 30, maxSpeed: 60, boostSpeed: 60,
+        throttleResponse: 2, speedResponse: 30, linearResponse: 3, autoLevel: 0)
+
+    /// Nimble enough to hold range, not enough to win a turning fight.
+    static let gunner = FlightModel(
+        maxRate: Vec3(1.6, 0.5, 3.0),
+        angularAccel: Vec3(5, 2, 9),
+        angularDamping: Vec3(7, 3, 11),
+        minSpeed: 20, maxSpeed: 55, boostSpeed: 55,
+        throttleResponse: 2, speedResponse: 30, linearResponse: 3, autoLevel: 0)
+
+    /// The strafer lives on its roll and pitch: it circles, so it turns hard.
+    static let strafer = FlightModel(
+        maxRate: Vec3(2.4, 0.8, 4.0),
+        angularAccel: Vec3(7, 3, 12),
+        angularDamping: Vec3(9, 4, 14),
+        minSpeed: 40, maxSpeed: 65, boostSpeed: 65,
+        throttleResponse: 2, speedResponse: 30, linearResponse: 4, autoLevel: 0)
+
+    /// A boss turns like a building.
+    static let boss = FlightModel(
+        maxRate: Vec3(0.5, 0.3, 0.8),
+        angularAccel: Vec3(1, 0.6, 2),
+        angularDamping: Vec3(2, 1, 3),
+        minSpeed: 15, maxSpeed: 30, boostSpeed: 30,
+        throttleResponse: 1, speedResponse: 15, linearResponse: 2, autoLevel: 0)
 }
```

Read these against `fighter`. The chaser out-runs you (60 to your 47.5 at
half throttle) and you out-turn it (1.3 to your 2.2): that's a *fight*, where
the first guide's chaser was a homing missile. The gunner is a lesser you.
The strafer turns *harder* than you but is slower, so it wins a circling
fight and loses a chase. The boss can barely turn. None of these numbers is
sacred; they're a starting point for the tuning loop chapter 04 gave you,
which works on enemies exactly as it works on the player.

---

## Five kinds

**`Sources/SpaceFighter/Components/AI.swift`** — new file:

```swift
import simd

/// The five things that come at you. Same components, different numbers.
enum EnemyKind: UInt8, CaseIterable {
    case drifter   // flies straight, tumbles, no guns
    case chaser    // turns toward you and rams
    case gunner    // holds range and fires with lead
    case strafer   // circles you, fires on the pass
    case boss      // big, slow, a heavy gun, spawns chasers
}

enum AIState: UInt8 {
    case approach
    case attack
    case breakOff
}

/// Simulation. What an enemy is doing and for how long. The AI system reads
/// this and writes a stick; the flight system flies it.
struct AIController {
    var kind: EnemyKind
    var state: AIState = .approach
    var timer: Float = 0        // seconds in the current state
    var orbitSign: Float = 1    // strafers: which way round
    var spawnTimer: Float = 0   // boss: until the next chaser
}
```

An AI is a kind, a state and a timer. That's all the state machine any
enemy in this chapter needs, and keeping it this small is deliberate: the
behaviours live in one `switch` in the AI system, where you can read all
five side by side, rather than in five classes.

`UInt8` raw values on both enums because chapter 13 puts them in packets.

**`Sources/SpaceFighter/Archetypes/Enemy.swift`** — replace the whole file:

```swift
import simd

/// An enemy of one of five kinds. They share the tag, a health, a team and a
/// collider; everything else — mesh, colour, flight model, gun, AI — is per
/// kind. Health scales with the wave.
@discardableResult
func spawnEnemy(in world: World, kind: EnemyKind, at position: Vec3, rotation: Quat, wave: Int)
    -> Entity
{
    let enemy = world.createEntity()
    var transform = Transform()
    transform.position = position
    transform.rotation = rotation

    let toughness = 1 + Float(wave - 1) * 0.15

    switch kind {
    case .drifter:
        transform.scale = Vec3(repeating: Float.random(in: 1.6...2.6, using: &world.rng))
        world.add(Renderable(mesh: .enemy, color: Vec4(0.95, 0.7, 0.25, 1)), to: enemy)
        world.add(Health(1), to: enemy)
        let scatter = Vec3(
            Float.random(in: -0.3...0.3, using: &world.rng),
            Float.random(in: -0.2...0.2, using: &world.rng), 0)
        let heading = rotation.act(simd_normalize(Vec3(0, 0, -1) + scatter))
        world.add(Velocity(linear: heading * Float.random(in: 55...80, using: &world.rng)), to: enemy)
        world.add(
            Spinner(axis: randomAxis(using: &world.rng), speed: Float.random(in: 0.6...2.0, using: &world.rng)),
            to: enemy)
    }

    world.add(transform, to: enemy)
    world.add(Enemy(), to: enemy)
    world.add(Team.enemies, to: enemy)
    world.add(
        Collider(radius: transform.scale.x * 0.9, layer: .enemy, mask: [.player, .projectile]),
        to: enemy)
    return enemy
}

private func randomAxis(using rng: inout Rng) -> Vec3 {
    let a = Vec3(
        Float.random(in: -1...1, using: &rng),
        Float.random(in: -1...1, using: &rng),
        Float.random(in: -1...1, using: &rng))
    let len = simd_length(a)
    return len > 0.0001 ? a / len : Vec3(0, 1, 0)
}
```

The first guide's `spawnEnemy` took a position and a transform to face;
this one takes a *kind*, a rotation to start with, and the wave number. The
drifter case is the first guide's drifter with its heading expressed in the
spawn rotation's frame — it flies roughly the way it was pointed, and
`randomAxis` is chapter 02's, unchanged. The `switch` won't compile yet; four
cases are missing.

**`Enemy.swift`**, in the `switch` — after the `.drifter` case:

```diff
+    case .chaser:
+        transform.scale = Vec3(repeating: 1.8)
+        world.add(Renderable(mesh: .enemy, color: Vec4(0.95, 0.35, 0.30, 1)), to: enemy)
+        world.add(Health(1), to: enemy)
+        addFlight(world, enemy, model: .chaser, throttle: 1)
+        world.add(AIController(kind: .chaser), to: enemy)
+
+    case .gunner:
+        transform.scale = Vec3(repeating: 1.4)
+        world.add(Renderable(mesh: .ship, color: Vec4(0.75, 0.45, 0.95, 1)), to: enemy)
+        world.add(Health((2 * toughness).rounded()), to: enemy)
+        addFlight(world, enemy, model: .gunner, throttle: 0.7)
+        world.add(AIController(kind: .gunner), to: enemy)
+        world.add(Weapon(fireInterval: 0.7, muzzleSpeed: 110), to: enemy)
+
+    case .strafer:
+        transform.scale = Vec3(repeating: 1.4)
+        world.add(Renderable(mesh: .enemy, color: Vec4(0.35, 0.95, 0.45, 1)), to: enemy)
+        world.add(Health((2 * toughness).rounded()), to: enemy)
+        addFlight(world, enemy, model: .strafer, throttle: 1)
+        world.add(
+            AIController(kind: .strafer, orbitSign: Bool.random(using: &world.rng) ? 1 : -1),
+            to: enemy)
+        world.add(Weapon(fireInterval: 0.35, muzzleSpeed: 120), to: enemy)
+
+    case .boss:
+        transform.scale = Vec3(repeating: 6)
+        world.add(Renderable(mesh: .enemy, color: Vec4(0.9, 0.9, 0.95, 1)), to: enemy)
+        world.add(Health((40 * toughness).rounded()), to: enemy)
+        addFlight(world, enemy, model: .boss, throttle: 1)
+        world.add(AIController(kind: .boss), to: enemy)
+        world.add(Weapon(fireInterval: 0.25, muzzleSpeed: 100), to: enemy)
     }
```

Notice what a gunner *is*: the player's own ship mesh in violet, with a
`Weapon` — the same `Weapon` struct the player has, with a slower interval
and a slower bolt. No new mesh, no new component. The first guide's chapter
02 argued that archetypes are recipes over shared parts; this is that
argument with five recipes. `toughness` scales health by fifteen percent a
wave, so a wave-ten gunner takes five hits where a wave-one gunner takes two.

**`Enemy.swift`** — after `spawnEnemy`:

```swift
/// The three components that let the flight system fly something.
private func addFlight(_ world: World, _ enemy: Entity, model: FlightModel, throttle: Float) {
    world.add(model, to: enemy)
    world.add(Engine(throttle: throttle, speed: model.minSpeed), to: enemy)
    world.add(AngularVelocity(), to: enemy)
    world.add(Velocity(), to: enemy)
}
```

---

## Where an enemy wants to go

**`Sources/SpaceFighter/Systems/EnemyAISystem.swift`** — new file:

```swift
import simd

/// Decides, for every enemy with an AI, where it wants to go — then hands the
/// flight system a stick. Enemies fly the way you do; they just steer worse.
enum EnemyAISystem {
    static func update(_ world: World, dt: Float) {
        let ais = world.store(AIController.self)
        let transforms = world.store(Transform.self)

        for entity in ais.owners {
            guard var ai = ais.get(entity), let t = transforms.get(entity),
                let target = nearestPlayer(world, to: t.position),
                let targetT = transforms.get(target)
            else { continue }
            ai.timer += dt

            let toTarget = targetT.position - t.position
            let distance = simd_length(toTarget)
            let direction = distance > 0.001 ? toTarget / distance : t.forward
            var wanted = direction
            var throttle: Float = 1
        }
    }
}
```

Every AI starts the same way: find the nearest player, and measure. `wanted`
is the direction the enemy would like to be flying and `throttle` how fast;
the `switch` that follows overrides them per kind, and then the tail of the
loop turns them into a stick.

**`EnemyAISystem.swift`**, in the loop — after `var throttle`:

```diff
             var throttle: Float = 1
+
+            switch ai.kind {
+            case .drifter:
+                continue
+
+            case .chaser:
+                wanted = direction
+
+            case .gunner:
+                switch ai.state {
+                case .approach:
+                    if distance < 60 { ai.state = .attack; ai.timer = 0 }
+                case .attack:
+                    throttle = distance > 70 ? 1 : (distance < 40 ? 0 : 0.5)
+                    if ai.timer > 4 { ai.state = .breakOff; ai.timer = 0 }
+                case .breakOff:
+                    wanted = -direction + t.right * 0.5
+                    if ai.timer > 2 { ai.state = .approach; ai.timer = 0 }
+                }
+
+            case .strafer:
+                let around = simd_cross(direction, Vec3(0, 1, 0))
+                let tangent = simd_length(around) > 0.01 ? simd_normalize(around) * ai.orbitSign : t.right
+                let inward: Float = distance > 45 ? 0.8 : (distance < 25 ? -0.8 : 0)
+                wanted = simd_normalize(tangent + direction * inward)
+
+            case .boss:
+                throttle = distance > 90 ? 1 : 0
+                ai.spawnTimer -= dt
+                if ai.spawnTimer <= 0 {
+                    ai.spawnTimer = 6
+                    let offset = t.right * 8 + t.up * -4
+                    spawnEnemy(in: world, kind: .chaser, at: t.position + offset, rotation: t.rotation, wave: 1)
+                }
+            }
```

Five behaviours in thirty lines, and each is a sentence. A chaser wants the
player. A gunner closes to sixty, then manages its throttle to hold between
forty and seventy while it shoots, and after four seconds breaks off for
two — the break-off is what stops it parking on your tail forever. A strafer
wants to fly *sideways* to you, around the vertical, pulling in when it's
far and pushing out when it's close, so it orbits. A boss wants to be ninety
units away and, every six seconds, makes a chaser.

The state machine is only used by the gunner. It's the only one whose
behaviour changes over time; the others are stateless functions of where
you are.

`spawnEnemy` inside a loop over `ais.owners` is safe: Swift's `for-in`
iterates the array value the loop started with, so an entity appended
mid-loop isn't visited until the next step.

**`EnemyAISystem.swift`**, in the loop — after the `switch`:

```diff
             }
+
+            ais.set(entity, ai)
+            let stick = steer(t, toward: wanted)
+            FlightControlSystem.apply(
+                world, to: entity, stick: stick, throttleInput: throttleNudge(world, entity, toward: throttle),
+                boosting: false, dt: dt)
         }
     }
```

And that's the payoff of the first section: the enemy is flown by
`FlightControlSystem.apply`, with a stick and a throttle, exactly as the
player is. It has the same ramp-up, the same damping, the same slide.

**`EnemyAISystem.swift`**, in `EnemyAISystem` — after `update`:

```diff
         }
     }
+
+    /// The closest living player to a point, or nil if there is none.
+    static func nearestPlayer(_ world: World, to position: Vec3) -> Entity? {
+        var best: Entity?
+        var bestDistance = Float.infinity
+        for player in world.store(Player.self).owners {
+            guard let t = world.get(Transform.self, player) else { continue }
+            let d = simd_length_squared(t.position - position)
+            if d < bestDistance {
+                bestDistance = d
+                best = player
+            }
+        }
+        return best
+    }
 }
```

A loop over the `Player` store rather than a `player:` parameter. There's
one player today; chapter 11 puts two in and this function doesn't change.

**`EnemyAISystem.swift`**, in `EnemyAISystem` — after `nearestPlayer`:

```diff
         return best
     }
+
+    /// Bank and pull, as an AI does it. Far off the nose: roll until the
+    /// target is above it, then pull. Near the nose: pitch and yaw straight at
+    /// it, with the roll fading out so a small error doesn't become a
+    /// corkscrew. Behind: pull hard and let the roll sort out which way.
+    static func steer(_ t: Transform, toward direction: Vec3) -> Vec3 {
+        let local = t.rotation.inverse.act(direction)  // x right, y up, -z forward
+        let off = simd_length(SIMD2<Float>(local.x, local.y))
+        let bank = atan2(local.x, local.y)               // 0 when the target is straight up
+        let roll = min(max(-bank * 2, -1), 1) * min(off * 3, 1)
+        var pitch = min(max(local.y * 3, -1), 1)
+        if local.z > 0 { pitch = max(pitch, 0.6) }
+        let yaw = min(max(-local.x * 2, -1), 1)
+        return Vec3(pitch, yaw, roll)
+    }
+
+    /// The throttle axis is a rate, not a position; ask for + or - until the
+    /// engine's throttle is where the AI wants it.
+    private static func throttleNudge(_ world: World, _ entity: Entity, toward wanted: Float) -> Float {
+        guard let engine = world.get(Engine.self, entity) else { return 0 }
+        let gap = wanted - engine.throttle
+        return abs(gap) < 0.02 ? 0 : (gap > 0 ? 1 : -1)
+    }
 }
```

`steer` is the AI's version of the skill chapter 04 asked you to learn.
Rotate the wanted direction into the ship's own frame; then `bank` is how far
the target is from "straight up over the nose" and `off` is how far it is
from the nose at all. Far off the nose, the roll command brings the target
overhead and the pitch command pulls toward it — bank and pull. Close to the
nose, the roll fades out (`min(off * 3, 1)`) and pitch and yaw simply point
at the target.

That fade is there because the first version of this function didn't have
it, and a chaser would close to ten units and then swing away, every time,
forever. With the target almost dead ahead, `bank` was computed from a
lateral error of a few centimetres and swung between −π and π from one step
to the next; the chaser rolled violently, the pull went in the wrong
direction for a step, and it overshot. The fix is one multiplication, and
the lesson is that an angle computed from two tiny numbers is noise. A
minute-long headless run at the end of this chapter is the test that caught
it, and it stays in the suite.

`throttleNudge` bridges a mismatch: the flight model's throttle input is a
*rate* (hold `R` to raise it), because that's what a key is, but an AI thinks
in *positions* ("be at 0.5"). Sign of the gap, with a dead band.

---

## Leading the target

A gunner that shoots at where you *are* misses a moving target every time.
It has to shoot at where you'll *be* when the bolt gets there, which means
solving for the time a bolt at speed *s* takes to reach a target at *r*
moving at *v*: the moment when `|r + v·t| = s·t`.

**`Sources/SpaceFighter/Core/Aim.swift`** — new file:

```swift
import simd

enum Aim {
    /// The direction to fire so that a bolt at `boltSpeed` meets a target
    /// moving at `targetVelocity`, or nil if the target is too fast to catch.
    /// Solves |r + v·t| = s·t for the earliest positive t.
    static func intercept(from shooter: Vec3, target: Vec3, targetVelocity v: Vec3, boltSpeed s: Float) -> Vec3? {
        let r = target - shooter
        let a = simd_dot(v, v) - s * s
        let b = 2 * simd_dot(r, v)
        let c = simd_dot(r, r)

        let t: Float
        if abs(a) < 1e-4 {
            guard b != 0 else { return nil }
            t = -c / b
        } else {
            let disc = b * b - 4 * a * c
            guard disc >= 0 else { return nil }
            let root = disc.squareRoot()
            let t1 = (-b - root) / (2 * a)
            let t2 = (-b + root) / (2 * a)
            let candidates = [t1, t2].filter { $0 > 0 }
            guard let earliest = candidates.min() else { return nil }
            t = earliest
        }
        guard t > 0 else { return nil }
        let aimPoint = r + v * t
        let length = simd_length(aimPoint)
        return length > 1e-4 ? aimPoint / length : nil
    }
}
```

Square both sides of `|r + v·t| = s·t` and it's a quadratic in `t` with the
coefficients on lines two to four. Two roots, and you want the earliest one
that's positive; no positive root means the target is outrunning the bolt
and there's no direction that works, which is `nil`. The `abs(a) < 1e-4`
branch is for a target moving at exactly bolt speed, where the quadratic
degenerates to a line.

**`Sources/SpaceFighter/Systems/EnemyWeaponSystem.swift`** — new file:

```swift
import simd

/// Fires enemy guns. An enemy shoots when its target is inside a cone ahead of
/// it, and it aims where the target will be, not where it is.
enum EnemyWeaponSystem {
    static let coneCosine: Float = 0.96  // about 16 degrees

    static func update(_ world: World, dt: Float) {
        let weapons = world.store(Weapon.self)
        let ais = world.store(AIController.self)
        let transforms = world.store(Transform.self)
        let velocities = world.store(Velocity.self)

        for entity in ais.owners {
            guard var weapon = weapons.get(entity), let t = transforms.get(entity),
                let target = EnemyAISystem.nearestPlayer(world, to: t.position),
                let targetT = transforms.get(target)
            else { continue }
            weapon.cooldown = max(0, weapon.cooldown - dt)
            defer { weapons.set(entity, weapon) }
            guard weapon.cooldown <= 0 else { continue }
        }
    }
}
```

The cooldown logic is the first guide's `WeaponSystem`, per enemy. The
`defer` writes the weapon back whatever happens below it — a `continue`
included — which is the one place in this guide `defer` earns its keep.

**`EnemyWeaponSystem.swift`**, in the loop — after the cooldown `guard`:

```diff
             guard weapon.cooldown <= 0 else { continue }
+
+            let targetV = velocities.get(target)?.linear ?? .zero
+            let muzzle = t.position + t.forward * (t.scale.x + 1)
+            let aim = Aim.intercept(
+                from: muzzle, target: targetT.position, targetVelocity: targetV,
+                boltSpeed: weapon.muzzleSpeed) ?? simd_normalize(targetT.position - muzzle)
+            guard simd_dot(aim, t.forward) > coneCosine else { continue }
+
+            var bolt = Transform()
+            bolt.position = muzzle
+            bolt.rotation = Math.lookRotation(forward: aim)
+            bolt.scale = Vec3(0.22, 0.22, 0.8)
+            spawnProjectile(
+                in: world, at: bolt, velocity: aim * weapon.muzzleSpeed, owner: entity,
+                color: Vec4(1.0, 0.45, 0.35, 1))
+            weapon.cooldown = weapon.fireInterval
         }
```

The muzzle is just outside the enemy's own collider, so its bolt doesn't
spawn inside it. The aim is the intercept direction, or straight at the
target if there isn't one. Then the cone: an enemy fires only when the
*intercept* direction is within sixteen degrees of its nose, which means it
has to fly at where you're going before it can shoot — you'll see gunners
swing their noses ahead of you. A cone of one (fire only when exactly
aligned) would never fire; a cone of zero would fire backwards.

Bolts are red so you can tell them from your own, and `spawnProjectile`
needs to learn two things: a colour, and that a bolt's target layer depends
on whose it is.

**`Sources/SpaceFighter/Archetypes/Projectile.swift`** — replace the file's
doc comment and `spawnProjectile`:

```swift
/// A bolt: where it is, where it's going, whose it is. Its team decides what
/// it can hit.
@discardableResult
func spawnProjectile(
    in world: World, at transform: Transform, velocity: Vec3, owner: Entity,
    color: Vec4 = Vec4(0.5, 1.0, 0.85, 1)
) -> Entity {
    let bolt = world.createEntity()
    world.add(transform, to: bolt)
    // Fired mid-step, after the snapshot: give it a "previous" of its own, so
    // the collision system sweeps its first step from the muzzle.
    world.add(PreviousTransform(position: transform.position, rotation: transform.rotation), to: bolt)
    world.add(Velocity(linear: velocity), to: bolt)
    world.add(Renderable(mesh: .projectile, color: color), to: bolt)
    world.add(Projectile(damage: 1), to: bolt)
    world.add(Owner(entity: owner), to: bolt)
    let team = world.get(Team.self, owner) ?? .players
    world.add(team, to: bolt)
    let targets: CollisionLayer = team == .players ? .enemy : .player
    world.add(Collider(radius: 0.6, layer: .projectile, mask: targets, swept: true), to: bolt)
    world.add(Lifetime(remaining: 2.4), to: bolt)
    return bolt
}
```

`Math.lookRotation` is new too. The obvious way to build a rotation that
points along a direction is `simd_quatf(from:to:)`, and it has a hole: for a
direction exactly opposite the start there are infinitely many answers and
it picks none of them well. A look rotation built from a forward and an up
doesn't have that hole.

**`Sources/SpaceFighter/Core/Math.swift`**, in `Math` — before `project`:

```diff
+    /// The rotation that points local -Z along `forward` with local +Y as
+    /// close to `up` as it can be. Works for every direction, including
+    /// straight down the axis, unlike a from-to quaternion.
+    static func lookRotation(forward: Vec3, up: Vec3 = Vec3(0, 1, 0)) -> Quat {
+        let z = -simd_normalize(forward)
+        var x = simd_cross(up, z)
+        if simd_length_squared(x) < 1e-6 { x = simd_cross(Vec3(1, 0, 0), z) }
+        x = simd_normalize(x)
+        let y = simd_cross(z, x)
+        return simd_quatf(simd_float3x3(columns: (x, y, z)))
+    }
+
     /// Where a world point lands on screen, in normalised device coordinates
```

It's the first guide's `lookAt` with the translation left off and the
result handed back as a quaternion. The three axes it builds *are* the
rotation matrix's columns, and `simd_quatf` knows how to read one.

---

## A director that sends waves

The first guide's `Director` was a timer and a cap. This one has a shape:
a wave is a list of kinds, spawned one at a time; a wave ends when the list
is empty and everything in it is dead; then a breather; then the next.

**`Sources/SpaceFighter/Systems/WaveDirector.swift`** — new file:

```swift
import simd

/// Sends enemies in waves. Each wave is a list of kinds; the director spawns
/// them one at a time around the player, waits for the sky to clear, gives you
/// a breather, and sends the next — bigger, tougher, and every fifth with a
/// boss.
final class WaveDirector {
    enum Phase: Equatable {
        case breather
        case spawning
        case fighting
    }

    static let breather: Float = 4
    static let spawnInterval: Float = 0.6

    private(set) var wave = 0
    var phase = Phase.breather
    private(set) var timer: Float = 2  // the opening breather is short
    private var queue: [EnemyKind] = []
}
```

**`WaveDirector.swift`**, in `WaveDirector` — after `queue`:

```diff
     private var queue: [EnemyKind] = []
+
+    /// What wave `n` is made of, in spawn order.
+    static func composition(wave n: Int) -> [EnemyKind] {
+        var kinds: [EnemyKind] = []
+        kinds += Array(repeating: .drifter, count: 3 + n)
+        kinds += Array(repeating: .chaser, count: 1 + n / 2)
+        if n >= 3 { kinds += Array(repeating: .gunner, count: (n - 1) / 2) }
+        if n >= 4 { kinds += Array(repeating: .strafer, count: (n - 2) / 2) }
+        if n % 5 == 0 { kinds.append(.boss) }
+        return kinds
+    }
```

This is the difficulty curve, and it's a pure function of the wave number,
which is why it's `static` and why the test for it needs no `Game`. Wave one
is four drifters and a chaser. Gunners appear at three, strafers at four,
the first boss at five with eight drifters, three chasers, two gunners and a
strafer for company. Every count is a line you can change.

**`WaveDirector.swift`**, in `WaveDirector` — after `composition`:

```diff
         return kinds
     }
+
+    func update(_ world: World, playerT: Transform, dt: Float) {
+        switch phase {
+        case .breather:
+            timer -= dt
+            if timer <= 0 {
+                wave += 1
+                queue = Self.composition(wave: wave)
+                timer = 0
+                phase = .spawning
+            }
+
+        case .spawning:
+            timer -= dt
+            if timer <= 0, let kind = queue.first {
+                queue.removeFirst()
+                spawn(kind, in: world, around: playerT)
+                timer = Self.spawnInterval
+            }
+            if queue.isEmpty { phase = .fighting }
+
+        case .fighting:
+            if world.store(Enemy.self).owners.allSatisfy({ !world.isAlive($0) }) {
+                phase = .breather
+                timer = Self.breather
+            }
+        }
+
+        cull(world, playerT: playerT)
+    }
 }
```

Three phases and one timer. `fighting` ends when no enemy is alive — with
`isAlive`, not `count == 0`, because an enemy killed this step is still in
the store until the flush, and the director runs before the flush. That's
chapter 06's `doomed` flag being useful for the second time in two chapters.

**`WaveDirector.swift`**, in `WaveDirector` — after `update`:

```diff
+    /// Ahead of the player, spread wide, facing them.
+    private func spawn(_ kind: EnemyKind, in world: World, around playerT: Transform) {
+        let ahead = Float.random(in: 120...190, using: &world.rng)
+        let lateral = playerT.right * Float.random(in: -55...55, using: &world.rng)
+        let vertical = playerT.up * Float.random(in: -20...28, using: &world.rng)
+        let position = playerT.position + playerT.forward * ahead + lateral + vertical
+        let facing = Math.lookRotation(forward: playerT.position - position)
+        spawnEnemy(in: world, kind: kind, at: position, rotation: facing, wave: wave)
+    }
+
+    /// Anything that has fallen far behind is gone. Drifters do this by
+    /// design; it keeps a wave from waiting on a straggler.
+    private func cull(_ world: World, playerT: Transform) {
+        let transforms = world.store(Transform.self)
+        for entity in world.store(Enemy.self).owners {
+            guard let t = transforms.get(entity) else { continue }
+            if simd_length(t.position - playerT.position) > 280 {
+                world.destroy(entity)
+            }
+        }
+    }
 }
```

The spawn placement is the first guide's, and so is the cull. The cull
matters more now than it did: a drifter that flies past you and keeps going
would otherwise hold a wave open forever. Culled enemies don't score, and
that's a design choice you might revisit — see the challenge.

Now retire the old director.

**`Sources/SpaceFighter/Game.swift`** — delete the `Director` class
entirely (the doc comment and the three properties), and in `Game`:

```diff
-    let director = Director()
+    let director = WaveDirector()
```

**`Game.swift`**, in `frame` — the HUD gets the wave:

```diff
             hud: HUDSystem.build(
-                stats: stats, hull: hullFraction(), aspect: max(aspect, 0.01),
+                stats: stats, hull: hullFraction(), wave: director.wave,
+                breather: director.phase == .breather, aspect: max(aspect, 0.01),
                 reticle: reticle(viewProjection: viewProjection, alpha: alpha),
```

**`Sources/SpaceFighter/Systems/HUDSystem.swift`**, in `build` — take it,
and draw it:

```diff
     static func build(
-        stats: GameStats, hull: Float, aspect: Float, reticle: Reticle = Reticle(),
-        flight: FlightDebug? = nil
+        stats: GameStats, hull: Float, wave: Int, breather: Bool, aspect: Float,
+        reticle: Reticle = Reticle(), flight: FlightDebug? = nil
     ) -> [HUDVertex] {
         var v: [HUDVertex] = []

+        // Top left: one tick per wave, and a banner while the next one loads.
+        for i in 0..<wave {
+            let x = -0.94 + Float(i) * 0.03 / aspect
+            appendRect(&v, cx: x, cy: 0.92, hw: 0.01 / aspect, hh: 0.016, color: Vec4(0.9, 0.85, 0.5, 0.9))
+        }
+        if breather {
+            appendRect(&v, cx: 0, cy: 0.8, hw: 0.3, hh: 0.02, color: Vec4(0.9, 0.85, 0.5, 0.35))
+        }
+
         if stats.hitFlash > 0 {
```

Tally marks for the wave and a bar across the top during the breather. It's
the last time the HUD has to say something with rectangles; chapter 09 gives
it words.

---

## Explosions

**`Sources/SpaceFighter/Archetypes/Explosion.swift`** — new file:

```swift
import simd

/// A burst of tumbling fragments and a flash. Every fragment is an ordinary
/// entity — a mesh, a velocity, a spin and a lifetime — so nothing new has to
/// know how to draw or move it.
func spawnExplosion(in world: World, at position: Vec3, color: Vec4, size: Float) {
    for _ in 0..<12 {
        let fragment = world.createEntity()
        var t = Transform()
        t.position = position
        t.scale = Vec3(repeating: size * Float.random(in: 0.12...0.3, using: &world.rng))
        world.add(t, to: fragment)
        let direction = simd_normalize(Vec3(
            Float.random(in: -1...1, using: &world.rng),
            Float.random(in: -1...1, using: &world.rng),
            Float.random(in: -1...1, using: &world.rng)) + Vec3(0.001, 0, 0))
        world.add(Velocity(linear: direction * Float.random(in: 15...40, using: &world.rng)), to: fragment)
        world.add(Spinner(axis: direction, speed: Float.random(in: 4...12, using: &world.rng)), to: fragment)
        world.add(Lifetime(remaining: Float.random(in: 0.5...1.1, using: &world.rng)), to: fragment)
        world.add(Renderable(mesh: .enemy, color: color), to: fragment)
        world.add(Debris(), to: fragment)
    }

    let flash = world.createEntity()
    var t = Transform()
    t.position = position
    t.scale = Vec3(repeating: size * 2.5)
    world.add(t, to: flash)
    world.add(Renderable(mesh: .projectile, color: Vec4(1, 0.9, 0.7, 1)), to: flash)
    world.add(Lifetime(remaining: 0.1), to: flash)
    world.add(Debris(), to: flash)
}
```

This is the first guide's chapter 15 "explosion in five minutes", done.
Twelve small copies of the enemy's own mesh in its own colour, thrown
outward, spinning, gone in a second; plus one big glowing cube for six
frames. `MovementSystem`, `SpinSystem` and `LifetimeSystem` do the rest,
unchanged. The `+ Vec3(0.001, 0, 0)` is the NaN guard for the one-in-a-
billion case of three zeros from the generator.

It's simulated, not presentation, and that's a real choice. The alternative
— spawn the fragments in `frame` from the `died` events — would keep
determinism trivially and save the netcode from replicating debris. It's
here because keeping *everything* that moves in one place is worth more
right now than the packet bytes, and chapter 12 lists `Debris` as a
component that is never replicated.

**`Sources/SpaceFighter/Systems/DebrisSystem.swift`** — new file:

```swift
/// Turns deaths into explosions — anything's, the player's included. Reads this
/// step's death events and spawns the fragments where the dead thing still is
/// (it is destroyed at the flush).
enum DebrisSystem {
    static func update(_ world: World) {
        let deaths = world.events
        for case .died(let entity, _) in deaths {
            guard let t = world.get(Transform.self, entity) else { continue }
            let color = world.get(Renderable.self, entity)?.color ?? Vec4(1, 1, 1, 1)
            spawnExplosion(in: world, at: t.position, color: color, size: t.scale.x)
        }
    }
}
```

A consumer of chapter 06's `died` event that the damage system knows
nothing about, and it doesn't ask *what* died: anything whose health ran out
goes up in its own colour, the player included. Right now that's a bang around
your own ship followed by chapter 06's respawn in place — you fly out of your
own explosion — and chapter 08 makes it the end of the run. Chapter 08 adds
another consumer (drops) the same way.

---

## Homing keeps its job

The first guide's `EnemySystem` had three parts: spawning, steering the
homing chasers, and culling. Spawning and culling are the director's now.
Chasers steer with the AI. That leaves the homing code with nothing to
steer — and chapter 08 needs it for missiles, so it moves rather than dies.

**`Sources/SpaceFighter/Systems/HomingSystem.swift`** — new file:

```swift
import simd

/// Steers anything with a Homing component toward the player at a limited
/// turn rate. Chapter 08's missiles use it; nothing does until then.
enum HomingSystem {
    static func update(_ world: World, player: Entity, dt: Float) {
        guard let playerT = world.get(Transform.self, player) else { return }
        let homings = world.store(Homing.self)
        let transforms = world.store(Transform.self)
        let velocities = world.store(Velocity.self)

        for entity in homings.owners {
            guard let h = homings.get(entity), let t = transforms.get(entity) else { continue }
            let toPlayer = playerT.position - t.position
            let dist = simd_length(toPlayer)
            guard dist > 0.001 else { continue }
            let desired = toPlayer / dist

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
}
```

That's the first guide's `steerHomers`, character for character, in its own
file. Then delete the file it came from:

```console
$ rm Sources/SpaceFighter/Systems/EnemySystem.swift
```

And the schedule, which is the shape of this chapter in nine lines:

**`Game.swift`** — replace the systems in `step`:

```swift
        FlightControlSystem.update(world, player: player, input: input, dt: dt)
        EnemyAISystem.update(world, dt: dt)
        EnemyWeaponSystem.update(world, dt: dt)
        WeaponSystem.update(world, player: player, input: input, dt: dt)
        HomingSystem.update(world, player: player, dt: dt)
        MovementSystem.update(world, dt: dt)
        SpinSystem.update(world, dt: dt)
        LifetimeSystem.update(world, dt: dt)
        CollisionSystem.update(world)
        DamageSystem.update(world, stats: stats)
        DebrisSystem.update(world)
        if let playerT = world.get(Transform.self, player) {
            director.update(world, playerT: playerT, dt: dt)
        }
```

AI before weapons, so a gunner shoots from where it turned to this step.
Debris after damage, so it reads this step's deaths. The director last, so
"everything is dead" means everything that died this step.

---

## The tests

**`Tests/SpaceFighterTests/Ch07EnemyTests.swift`** — new file:

```swift
import Testing
import simd

@testable import SpaceFighter

private let dt = SimulationClock.step

@Test func interceptLeadsAMovingTarget() {
    let shooter = Vec3.zero
    let target = Vec3(0, 0, -100)
    let velocity = Vec3(30, 0, 0)
    let speed: Float = 140
    let direction = Aim.intercept(from: shooter, target: target, targetVelocity: velocity, boltSpeed: speed)!
    #expect(direction.x > 0, "it aims ahead of the target")
    // Fly both forward until the bolt has covered the distance and check they meet.
    var best: Float = .infinity
    var time: Float = 0
    while time < 2 {
        let bolt = shooter + direction * speed * time
        let tgt = target + velocity * time
        best = min(best, simd_length(bolt - tgt))
        time += 0.001
    }
    #expect(best < 0.2)
}

@Test func interceptGivesUpOnTheUncatchable() {
    let dir = Aim.intercept(from: .zero, target: Vec3(0, 0, -100), targetVelocity: Vec3(0, 0, -300), boltSpeed: 140)
    #expect(dir == nil)
}

@Test func wavesEscalateAndEveryFifthHasABoss() {
    let one = WaveDirector.composition(wave: 1)
    let four = WaveDirector.composition(wave: 4)
    let five = WaveDirector.composition(wave: 5)
    #expect(!one.contains(.boss) && !four.contains(.boss) && five.contains(.boss))
    #expect(four.count > one.count)
    #expect(!one.contains(.gunner) && four.contains(.gunner))
}
```

The intercept test doesn't trust the algebra; it flies the bolt and the
target forward a millisecond at a time and checks that they meet. If the
quadratic is wrong, `best` is metres, not centimetres.

**`Ch07EnemyTests.swift`** — after `wavesEscalateAndEveryFifthHasABoss`:

```swift
@Test func aClearedWaveEarnsABreatherThenTheNextWave() {
    let game = Game(seed: 3)
    let director = game.director
    // Let the opening breather end and the first wave spawn in full.
    for _ in 0..<600 { game.step(input: InputFrame(), dt: dt) }
    #expect(director.wave == 1)
    #expect(director.phase != .breather)
    // Kill everything.
    for e in game.world.store(Enemy.self).owners { game.world.destroy(e) }
    game.step(input: InputFrame(), dt: dt)
    #expect(director.phase == .breather)
    for _ in 0..<Int(WaveDirector.breather / dt) + 2 { game.step(input: InputFrame(), dt: dt) }
    #expect(director.wave == 2)
}

@Test func aChaserTurnsToFaceThePlayer() {
    let game = Game(seed: 1)
    let world = game.world
    var t = Transform()
    t.position = Vec3(0, 0, 60)  // behind the player, who flies toward -z
    t.rotation = Quat(angle: .pi, axis: Vec3(0, 1, 0))  // facing away from them
    let chaser = spawnEnemy(in: world, kind: .chaser, at: t.position, rotation: t.rotation, wave: 1)
    game.director.phase = .fighting  // keep the director out of it
    for _ in 0..<240 { game.step(input: InputFrame(), dt: dt) }
    guard world.isAlive(chaser), let ct = world.get(Transform.self, chaser),
        let pt = world.get(Transform.self, game.player)
    else {
        Issue.record("the chaser did not survive the test")
        return
    }
    let toPlayer = simd_normalize(pt.position - ct.position)
    #expect(simd_dot(ct.forward, toPlayer) > 0.9)
}
```

Setting `director.phase = .fighting` by hand keeps the director from
spawning a wave into a test that wants exactly one enemy. It's the reason
`phase` is a `var` and not `private(set)`.

The chaser starts *behind* the player and facing away, so it has a whole turn
to make while the player flies off ahead of it. Put it in front and facing
them, and the two ram inside a second — the chaser dies, the `guard` bails
out, and the test passes without asserting anything. That's what the
`Issue.record` in the `else` is for: a test that can't reach its assertion
should say so, not go green.

**`Ch07EnemyTests.swift`** — after `aChaserTurnsToFaceThePlayer`:

```swift
@Test func aGunnerShootsThePlayer() {
    let game = Game(seed: 1)
    let world = game.world
    game.director.phase = .fighting
    _ = spawnEnemy(
        in: world, kind: .gunner, at: Vec3(0, 0, -50),
        rotation: Math.lookRotation(forward: Vec3(0, 0, 1)), wave: 1)  // facing the player
    var boltsSeen = 0
    for _ in 0..<120 {
        game.step(input: InputFrame(), dt: dt)
        boltsSeen = max(
            boltsSeen,
            world.store(Projectile.self).owners.filter { world.get(Team.self, $0) == .enemies }.count)
    }
    #expect(boltsSeen > 0, "it fires")
    #expect(world.get(Health.self, game.player)!.current < 100, "and it hits")
}

@Test func aDeathLeavesDebris() {
    let game = Game(seed: 1)
    let world = game.world
    game.director.phase = .fighting
    let enemy = spawnEnemy(in: world, kind: .drifter, at: Vec3(0, 0, -80), rotation: Quat(angle: 0, axis: Vec3(0, 1, 0)), wave: 1)
    world.store(Health.self).mutate(enemy) { $0.current = 0 }
    game.step(input: InputFrame(), dt: dt)
    let debris = world.store(Debris.self).count
    #expect(debris >= 10)
    for _ in 0..<120 { game.step(input: InputFrame(), dt: dt) }
    #expect(world.store(Debris.self).count == 0, "and it burns out")
}
```

The gunner test tracks the *peak* number of enemy bolts over the run rather
than the number at the end, because a bolt that hits the player is gone —
and the second assertion is that one did.

**`Ch07EnemyTests.swift`** — after `aDeathLeavesDebris`:

```swift
/// A minute of play, headless: a pilot who flies straight and holds the
/// trigger. Waves come, things die, nothing runs away.
@Test func aMinuteOfWavesStaysBounded() {
    let game = Game(seed: 11)
    var input = InputFrame()
    input.buttons = [.fire]
    var peak = 0
    for i in 0..<3600 {
        input.pitch = (i / 90) % 2 == 0 ? 0.08 : -0.08  // a gentle weave
        game.step(input: input, dt: dt)
        peak = max(peak, game.world.aliveCount)
    }
    #expect(game.director.wave >= 2)
    #expect(peak < 600, "entities are bounded: \(peak)")
    #expect(game.stats.score > 0)
}
```

This is the soak test that found the corkscrew. A scripted pilot, a minute
of simulated time in half a second of real time, and three claims that are
each easy to break: the waves advance, the entity count doesn't run away,
and something died. When you tune the enemies — and you will — this is the
test that tells you whether the game still *works*, as opposed to whether
each piece does.

---

## Checkpoint

```console
$ swift test
✔ Test run with 43 tests in 0 suites passed
```

**Forty-three tests.** Then play, and this time it's a game:

1. **Wave one arrives after two seconds** — four amber drifters and a red
   chaser, spawning one every 0.6 s, with a tally mark at the top left.
   Kill or outlast them, and a bar across the top marks a four-second
   breather before wave two.
2. **The chaser flies.** It banks to turn, it overshoots if you jink, and
   when you cut across its nose it rolls to follow. Fly straight and it rams
   you.
3. **Wave three brings violet ships that shoot.** Watch one: it closes,
   swings its nose ahead of you, and fires red bolts at where you're going.
   Fly a steady line and they hit; turn as it fires and they miss behind
   you. Every four seconds it breaks off.
4. **Wave four brings green strafers** circling you, firing on each pass.
   **Wave five brings a boss** — a white octahedron the size of a house,
   spitting bolts and dropping chasers every six seconds — with a crowd.
5. **Everything that dies explodes** in its own colour — you included, for
   now followed by a respawn on the spot. Chapter 08 makes it count.

**If enemies sit still after spawning**, `EnemyAISystem` isn't in the
schedule, or `addFlight` isn't giving them an `Engine`. **If gunners never
fire**, check the cone — a `coneCosine` above 0.99 is a gun that only works
by accident. **If red bolts hit enemies**, `spawnProjectile` isn't setting
the mask from the team. **If the wave never ends** with the sky empty, the
`fighting` check is counting the store instead of asking `isAlive`. **If
`aMinuteOfWavesStaysBounded` fails on the wave count** after you've tuned
something, the scripted pilot can no longer clear wave one — probably a
chaser that can't ram — and that's the test doing its job.

---

## Challenge

Culled enemies don't score, and neither does a drifter you dodge. Add a
third way for a wave to end: a *timer* — ninety seconds and the director
moves on regardless, with whatever's left flying off — and show it on the
HUD as a shrinking bar. Then decide what the timer means for the score.
Three things to get right: the boss wave shouldn't time out (or should it
have a longer timer?); a wave that times out with a gunner still alive has
to deal with that gunner — cull it, or let it carry over; and the breather
after a timed-out wave is the natural place to tell the player they let
something go, which is a HUD message, which is chapter 09.

---

**Next:** things worth picking up. →
[Chapter 08: Drops and the loadout](08-drops-and-the-loadout.md)

---

*Back to the [guide map](../README.md) · references in [`resources.md`](../resources.md)*
