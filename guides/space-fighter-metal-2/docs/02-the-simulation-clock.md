# 02 · The simulation clock 🛠️

> **You'll leave this chapter with:** a game that simulates in fixed
> sixtieth-of-a-second steps no matter what the display does, draws smoothly
> between those steps, makes every random choice from a seed you control, and
> can prove — with a test — that two runs of the same inputs produce the same
> world.
>
> **Files created:** `Sources/SpaceFighter/Core/SimulationClock.swift`,
> `Sources/SpaceFighter/Core/Rng.swift`,
> `Tests/SpaceFighterTests/Ch02ClockTests.swift`,
> `Tests/SpaceFighterTests/Ch02DeterminismTests.swift`
> **Files changed:** `Package.swift`, `Game.swift`, `GameView.swift`,
> `main.swift`, `Components/Spatial.swift`, `ECS/World.swift`,
> `Systems/SceneSystem.swift`, `Systems/CameraSystem.swift`,
> `Systems/EnemySystem.swift`, `Archetypes/Enemy.swift`

Right now the simulation's clock is the display's. `RenderCoordinator.draw`
measures how long the last frame took and hands that number to every system;
the ship moves by however much time the monitor happened to leave between two
refreshes. Chapter 01 found what that costs — a hit rate that depends on your
refresh rate — and the first guide's chapter 09 named the alternative and set
it aside. This chapter builds it, and then builds three things on top of it
that are only possible once the step is a constant: interpolation, a seeded
generator, and a determinism test.

Nothing changes about how the game *plays* in this chapter. That's the point.
If it looks any different at the end, something is wrong.

---

## Two clocks

A 60 Hz display asks for a frame every 16.7 ms; a 120 Hz ProMotion panel every
8.3 ms; a window being dragged, whenever it likes. The simulation wants none of
that. It wants to advance by exactly one sixtieth of a second, every time, so
that "one step" means the same thing in a test, in a replay, on your machine
and on a friend's.

The trick is an **accumulator**. Real time goes into a bank; the simulation
withdraws it in fixed-size steps; whatever's left over — less than one step —
stays in the bank until next frame.

**`Sources/SpaceFighter/Core/SimulationClock.swift`** — new file:

```swift
/// The simulation's clock. Real time goes in, a whole number of fixed steps
/// comes out, and whatever is left over is how far into the next step the
/// display is.
struct SimulationClock {
    static let step: Float = 1.0 / 60.0
    static let maxStepsPerFrame = 4
    static let maxFrameTime: Float = 0.25

    private(set) var accumulator: Float = 0
    private(set) var tick: UInt32 = 0
}
```

Three constants, each a decision.

**`step` is a sixtieth of a second** because that's the rate the flight model
and the enemies will be tuned at, and because chapter 13's netcode sends inputs
per tick — sixty small packets a second is a comfortable number. It is *not*
tied to the display: a 120 Hz Mac will draw two frames per step, and a 30 Hz
one will run two steps per frame. Neither notices.

**`maxStepsPerFrame` is four.** If a frame takes so long that more than four
steps are owed — you paused in the debugger, or the machine hitched for a
tenth of a second — the simulation runs four and *drops the rest*. Without a
cap there's a classic failure called the spiral of death: a slow frame owes
several steps, running them makes the next frame slower, which owes more steps,
and the game never catches up. With the cap, a hitch costs a moment of slow
motion and then it's over.

**`maxFrameTime` is a quarter second.** The same idea, one layer earlier: no
single frame is allowed to bank more than that, so a laptop waking from sleep
doesn't hand the clock a four-hour debt.

The name is `SimulationClock` rather than `Clock` because Swift's standard
library already has a `Clock` protocol, and a struct of the same name would
shadow it inside the module and collide with it from the test target.

**`SimulationClock.swift`**, in `SimulationClock` — after `tick`:

```diff
     private(set) var tick: UInt32 = 0
+
+    /// Banks `realDt` and returns how many fixed steps to run now.
+    mutating func advance(realDt: Float) -> Int {
+        accumulator += min(max(realDt, 0), Self.maxFrameTime)
+        var steps = 0
+        while accumulator >= Self.step && steps < Self.maxStepsPerFrame {
+            accumulator -= Self.step
+            steps += 1
+        }
+        if accumulator >= Self.step { accumulator = 0 }
+        tick &+= UInt32(steps)
+        return steps
+    }
+
+    /// How far the display is into the step that hasn't happened yet, 0…1.
+    var alpha: Float { accumulator / Self.step }
 }
```

`advance` doesn't run anything — it *counts*. Returning the number of steps and
letting the caller run them keeps this struct free of any knowledge of
`Game`, which is what makes it testable in a few lines a few sections from now.

The `max(realDt, 0)` clamp is the first guide's guard against a negative
`dt` from a clock adjustment, kept. The line after the loop is the cap doing
its job: if we hit `maxStepsPerFrame` and there's *still* a full step in the
bank, that time is thrown away. Note what is not thrown away — a partial step
always survives, because it's what `alpha` is made of.

`tick` counts every step ever run. Nothing reads it yet; chapter 13 stamps it
on every input packet.

`alpha` is the number that makes the next section possible. If the bank holds
a third of a step, the display is a third of the way between the world as it
was after the last step and the world as it will be after the next one.

---

## Drawing between steps

Here's a problem the accumulator creates. On a 120 Hz display, every other
frame runs zero steps — the bank is half full, nothing is withdrawn, the
simulation didn't move. If the renderer draws what the simulation has, every
other frame is a duplicate of the last one. It looks exactly like 60 Hz, only
now you've paid for 120.

The fix is to remember where everything *was* at the start of the current step
and draw a blend. With `alpha` at a half, draw halfway between "was" and "is".

**`Sources/SpaceFighter/Components/Spatial.swift`** — after the `Transform`
struct, before `Velocity`:

```swift
/// Where an entity was at the start of the current step. Written by the
/// clock, read by the renderer to draw between steps. Presentation, not
/// simulation: no system reads it to decide anything.
struct PreviousTransform {
    var position: Vec3
    var rotation: Quat
}
```

No scale. Nothing in this game changes an entity's scale after spawning it, so
interpolating it would be work that produces the same number.

**`Spatial.swift`** — after `PreviousTransform`:

```swift
extension Transform {
    /// This transform blended `alpha` of the way from `previous`. With no
    /// previous (spawned this step) it is just `self`.
    func interpolated(from previous: PreviousTransform?, alpha: Float) -> Transform {
        guard let p = previous else { return self }
        var t = self
        t.position = simd_mix(p.position, position, Vec3(repeating: alpha))
        t.rotation = simd_slerp(p.rotation, rotation, alpha)
        return t
    }
}
```

`simd_mix` is a straight-line blend, which is right for a position. It is
*wrong* for a rotation: blend two unit quaternions component-wise and the
result is shorter than unit length and turns at an uneven rate, which shows up
as a tumbling enemy that pulses in size. `simd_slerp` walks the arc between
them at constant angular speed — exactly what a rotating body does — and stays
on the unit sphere. It also takes the shorter of the two arcs, so an enemy
that spun 350° doesn't get drawn spinning −10° the other way.

The `guard` handles an entity spawned during the current step. It has a
`Transform` but no `PreviousTransform` yet, so it draws exactly where it is.
For one frame it isn't interpolated, and nobody can see that.

Now the copy. It has to happen once per step, *before* anything moves, so that
"previous" really means "the start of this step".

**`Sources/SpaceFighter/ECS/World.swift`**, in `World` — after `get`:

```diff
     func get<T>(_ type: T.Type, _ entity: Entity) -> T? {
         store(T.self).get(entity)
     }

+    /// Copy every Transform into its PreviousTransform. Called once at the top
+    /// of each fixed step, before any system moves anything.
+    func snapshotTransforms() {
+        let transforms = store(Transform.self)
+        let previous = store(PreviousTransform.self)
+        for (i, entity) in transforms.owners.enumerated() {
+            let t = transforms.items[i]
+            previous.set(entity, PreviousTransform(position: t.position, rotation: t.rotation))
+        }
+    }
+
 }
```

This walks the `Transform` store's arrays directly — `items[i]` beside
`owners[i]` — rather than calling `get` per entity, because the sparse set from
the first guide's chapter 05 stores them in lockstep and the index is free. On
an entity that already has a `PreviousTransform`, `set` overwrites in place; on
one that doesn't, it appends. Either way there's no allocation once the store
has grown to size.

Then the two readers. The scene builder draws every entity; the camera follows
one.

**`Sources/SpaceFighter/Systems/SceneSystem.swift`** — replace `buildInstances`
(the signature changes too):

```swift
    static func buildInstances(_ world: World, alpha: Float) -> [MeshID: [InstanceData]] {
        let transforms = world.store(Transform.self)
        let previous = world.store(PreviousTransform.self)
        let renderables = world.store(Renderable.self)

        var byMesh: [MeshID: [InstanceData]] = [:]
        for entity in renderables.owners {
            guard let r = renderables.get(entity), let t = transforms.get(entity) else { continue }
            let drawn = t.interpolated(from: previous.get(entity), alpha: alpha)
            byMesh[r.mesh, default: []].append(InstanceData(model: drawn.matrix, color: r.color))
        }
        return byMesh
    }
```

**`Sources/SpaceFighter/Systems/CameraSystem.swift`**, in `viewMatrix` — take
`alpha`, and follow the interpolated ship:

```diff
-    static func viewMatrix(_ world: World, player: Entity) -> (view: Mat4, eye: Vec3) {
-        guard let t = world.get(Transform.self, player) else {
+    static func viewMatrix(_ world: World, player: Entity, alpha: Float) -> (view: Mat4, eye: Vec3) {
+        guard let current = world.get(Transform.self, player) else {
             return (Math.identity, .zero)
         }
+        let t = current.interpolated(from: world.get(PreviousTransform.self, player), alpha: alpha)
         let eye = t.position - t.forward * distanceBack + t.up * heightAbove
```

The camera change is the one people forget. If the scene interpolates and the
camera doesn't, the ship is drawn at a blended position while the camera sits
at the un-blended one, and the ship judders in the frame at exactly the
frequency you were trying to smooth out. Both readers, or neither.

---

## Presentation versus simulation

`PreviousTransform`'s doc comment says *presentation, not simulation*, and
this is the moment to make that a rule, because the rest of the guide lives by
it.

**Simulation** is everything that happens inside a fixed step: positions,
velocities, health, timers, spawns, the random draws that decide them. It is
deterministic, it runs at exactly 60 Hz of simulated time, and — from chapter
12 on — it is what a server is the authority over and a client is corrected
toward.

**Presentation** is everything that decides how the simulation *looks* this
frame: the interpolated transform you just built, and, in the chapters ahead,
a camera that lags, a field of view that kicks, a screen that shakes. It runs
at the display's rate with real elapsed time, it may smooth and randomise
however it likes, and nothing in the simulation ever reads it.

The practical consequences, which you'll see applied chapter by chapter:

- A component's doc comment says which side it's on. `Transform` is
  simulation; `PreviousTransform` is presentation.
- Simulation code takes `dt` and knows it's a constant. Presentation code takes
  the real frame time, and when it smooths it uses the first guide's
  `1 - exp(-k·dt)` form, because that's the one that's correct for a `dt` that
  varies.
- Simulation randomness comes from one seeded generator on the `World` (next
  section). Presentation randomness — the jitter of a camera shake — comes from
  a *different* one, so that a purely visual effect never changes what the
  simulation draws next.

Now `Game` gets split along that line.

**`Sources/SpaceFighter/Game.swift`**, in `Game` — the world is now built from
a seed, and the clock is state:

```diff
 final class Game {
-    let world = World()
+    let world: World
     let stats = GameStats()
     let director = Director()

     private(set) var player: Entity = Entity(id: 0)
+    private(set) var clock = SimulationClock()
```

**`Game.swift`**, in `Game` — replace `init` and the head of `update`:

```diff
-    init() {
+    init(seed: UInt64 = 1) {
+        world = World(seed: seed)
         player = spawnPlayer(in: world)
     }

-    func update(dt rawDt: Float, input: InputState, aspect: Float) -> FrameRenderData {
-        let dt = min(max(rawDt, 0), 1.0 / 30.0)
+    /// Bank real time and run however many fixed steps it pays for.
+    func advance(realDt: Float, input: InputState) {
+        let steps = clock.advance(realDt: realDt)
+        for _ in 0..<steps {
+            step(input: input, dt: SimulationClock.step)
+        }
+    }
+
+    /// One fixed step. Everything in here is simulation: deterministic, and
+    /// blind to the display.
+    func step(input: InputState, dt: Float) {
+        world.snapshotTransforms()

         FlightControlSystem.update(world, player: player, input: input, dt: dt)
```

`World(seed:)` doesn't exist yet; it's two sections away. The `dt` clamp from
the first guide is gone — the clock owns that decision now, and it makes it
once, in one place.

`step` still takes a `dt` parameter even though it will only ever be handed
`SimulationClock.step`. That's deliberate: the systems it calls already take
`dt`, none of them should learn what the constant is, and a test that wants to
step the game by hand — the determinism test below does — shouldn't need a
clock to do it.

`snapshotTransforms` is the first line of the step and nothing may go above it.

**`Game.swift`**, in `Game` — the tail of the old `update` becomes `frame`. The
new `}` closes `step` immediately after `respawn()`'s `if`, so watch the braces:

```diff
         stats.hitFlash = max(0, stats.hitFlash - dt)
         if stats.playerHealth <= 0 {
             respawn()
         }
+    }

-        let (view, eye) = CameraSystem.viewMatrix(world, player: player)
+    /// Everything the renderer needs, blended `clock.alpha` of the way into
+    /// the step that hasn't happened yet.
+    func frame(aspect: Float) -> FrameRenderData {
+        let alpha = clock.alpha
+        let (view, eye) = CameraSystem.viewMatrix(world, player: player, alpha: alpha)
         let projection = Math.perspective(
             fovyRadians: fieldOfView.radians, aspect: max(aspect, 0.01), near: 0.1, far: 1200)
         let frame = FrameUniforms(
             viewProjection: projection * view, cameraPosition: eye, lightDirection: lightDirection)

-        let instances = SceneSystem.buildInstances(world)
+        let instances = SceneSystem.buildInstances(world, alpha: alpha)
         let position = world.get(Transform.self, player)?.position ?? .zero
```

The rest of the old `update` — building `FrameRenderData` — is unchanged and
is now the end of `frame`. So one method became three: `advance` is the bank,
`step` is the simulation, `frame` is the presentation. Only the first and last
are called from outside, and only the middle one has to be deterministic.

Notice that `hitFlash` still counts down inside `step`. By the rule above it's
presentation — nothing in the simulation depends on it — and chapter 05 moves
it. It stays for now because moving it means giving presentation its own
`update` with a real `dt`, and that's chapter 05's job.

**`Sources/SpaceFighter/GameView.swift`**, in `draw` — two calls where there
was one:

```diff
         let size = view.drawableSize
         let aspect = Float(size.width / max(size.height, 1))

-        let data = game.update(dt: dt, input: input.state, aspect: aspect)
+        game.advance(realDt: dt, input: input.state)
+        let data = game.frame(aspect: aspect)
         renderer.render(
```

That's the whole heartbeat change. The coordinator still measures real time;
it just hands it to a bank instead of a step.

---

## Randomness you can replay

Ten lines in the simulation — `Systems/` and `Archetypes/` — call
`Float.random` or `Bool.random` with no generator argument, which means Swift's
`SystemRandomNumberGenerator`: seeded by the OS, different every run,
impossible to reproduce. (Four more in `Content/Meshes/SceneryMesh.swift`
scatter the stars. Those are content, built once before the first step, and
they stay as they are.) Everything this guide
wants — replays, a determinism test, a server and client that agree — needs
the opposite: a generator that starts from a number you chose and produces the
same sequence every time.

**`Sources/SpaceFighter/Core/Rng.swift`** — new file:

```swift
/// A small, fast, seedable generator (xoshiro128**). Every random choice the
/// simulation makes goes through one of these, so a seed replays a run exactly.
struct Rng: RandomNumberGenerator {
    private var s0: UInt32
    private var s1: UInt32
    private var s2: UInt32
    private var s3: UInt32
}
```

xoshiro128\*\* is four 32-bit words of state and about ten operations per
number. It's from the family .NET adopted for its default `Random`, it passes
statistical batteries a game will never stress, and — the property that
matters here — it's a value type with no hidden state. Copy an `Rng` and
you've copied the future.

Conforming to `RandomNumberGenerator` is what lets every existing call keep
its shape: `Float.random(in:)` has a twin, `Float.random(in:using:)`, that
takes any conformer.

**`Rng.swift`**, in `Rng` — after the state:

```diff
     private var s3: UInt32
+
+    init(seed: UInt64) {
+        var x = seed
+        func splitmix() -> UInt32 {
+            x &+= 0x9E37_79B9_7F4A_7C15
+            var z = x
+            z = (z ^ (z >> 30)) &* 0xBF58_476D_1CE4_E5B9
+            z = (z ^ (z >> 27)) &* 0x94D0_49BB_1331_11EB
+            return UInt32(truncatingIfNeeded: z ^ (z >> 31))
+        }
+        s0 = splitmix()
+        s1 = splitmix()
+        s2 = splitmix()
+        s3 = splitmix()
+        if s0 | s1 | s2 | s3 == 0 { s0 = 1 }
+    }
 }
```

You can't just write the seed into the state. xoshiro's one weakness is that a
state that's all zeros, or mostly zeros, produces a long run of poor numbers
before it warms up — and `--seed 1` is mostly zeros. So the seed goes through
`splitmix64` first, a different generator whose only job is to turn *any*
64-bit input into four well-mixed words. The final `if` guards the one state
xoshiro can never leave.

The `&+=` and `&*` are wrapping arithmetic. These constants are *supposed* to
overflow; Swift's ordinary operators would trap.

**`Rng.swift`**, in `Rng` — after `init`:

```diff
         if s0 | s1 | s2 | s3 == 0 { s0 = 1 }
     }
+
+    mutating func next32() -> UInt32 {
+        let result = Self.rotl(s1 &* 5, 7) &* 9
+        let t = s1 << 9
+        s2 ^= s0
+        s3 ^= s1
+        s1 ^= s2
+        s0 ^= s3
+        s2 ^= t
+        s3 = Self.rotl(s3, 11)
+        return result
+    }
+
+    mutating func next() -> UInt64 {
+        UInt64(next32()) << 32 | UInt64(next32())
+    }
+
+    private static func rotl(_ x: UInt32, _ k: UInt32) -> UInt32 {
+        (x << k) | (x >> (32 - k))
+    }
 }
```

`next32` is the algorithm, transcribed from the reference implementation
line for line — the order of those xors is the generator, and it's not a place
to be creative. `next()` is what the protocol requires: a 64-bit value, made
from two 32-bit ones.

The `World` owns it, because the world is what the simulation *is*:

**`ECS/World.swift`**, in `World` — a generator, and a seed to start it:

```diff
 final class World {
+    /// The simulation's only source of randomness.
+    var rng: Rng
+
     private var nextID: UInt32 = 0
     private(set) var entities: Set<Entity> = []
     private var stores: [ObjectIdentifier: AnyComponentStore] = [:]
     private var pendingDestroy: [Entity] = []

+    init(seed: UInt64 = 1) {
+        rng = Rng(seed: seed)
+    }
+
     func createEntity() -> Entity {
```

And then every call site. There are two files.

**`Sources/SpaceFighter/Systems/EnemySystem.swift`**, in `spawn`:

```diff
-        let ahead = Float.random(in: 120...190)
-        let lateral = playerT.right * Float.random(in: -55...55)
-        let vertical = playerT.up * Float.random(in: -20...28)
+        let ahead = Float.random(in: 120...190, using: &world.rng)
+        let lateral = playerT.right * Float.random(in: -55...55, using: &world.rng)
+        let vertical = playerT.up * Float.random(in: -20...28, using: &world.rng)
```

**`Sources/SpaceFighter/Archetypes/Enemy.swift`**, in `spawnEnemy`:

```diff
-    transform.scale = Vec3(repeating: Float.random(in: 1.6...2.6))
+    transform.scale = Vec3(repeating: Float.random(in: 1.6...2.6, using: &world.rng))
```

```diff
-    if Bool.random() {
+    if Bool.random(using: &world.rng) {
```

```diff
         let scatter =
-            playerT.right * Float.random(in: -0.3...0.3)
-            + playerT.up * Float.random(in: -0.2...0.2)
+            playerT.right * Float.random(in: -0.3...0.3, using: &world.rng)
+            + playerT.up * Float.random(in: -0.2...0.2, using: &world.rng)
         let heading = simd_normalize(towardPlayer + scatter)
-        world.add(Velocity(linear: heading * Float.random(in: 55...80)), to: enemy)
-        world.add(Spinner(axis: randomAxis(), speed: Float.random(in: 0.6...2.0)), to: enemy)
+        world.add(Velocity(linear: heading * Float.random(in: 55...80, using: &world.rng)), to: enemy)
+        world.add(
+            Spinner(axis: randomAxis(using: &world.rng), speed: Float.random(in: 0.6...2.0, using: &world.rng)),
+            to: enemy)
```

**`Enemy.swift`** — replace `randomAxis` (the signature changes too):

```swift
private func randomAxis(using rng: inout Rng) -> Vec3 {
    let a = Vec3(
        Float.random(in: -1...1, using: &rng),
        Float.random(in: -1...1, using: &rng),
        Float.random(in: -1...1, using: &rng))
    let len = simd_length(a)
    return len > 0.0001 ? a / len : Vec3(0, 1, 0)
}
```

One subtlety hides in that last function. Swift evaluates the three arguments
to `Vec3(...)` left to right, and each one advances the generator, so the
*order* of those three draws is part of the simulation. Reorder them for
style and a replay recorded before the change diverges after it. That's not a
reason to be afraid of the code; it's a reason to know that in a deterministic
simulation, the code *is* the specification.

Finally, a way to choose the seed:

**`Sources/SpaceFighter/main.swift`** — replace `let game = Game()`:

```swift
/// `--seed N` replays the same enemies every launch; without it, the clock picks.
let seed: UInt64 = {
    let args = CommandLine.arguments
    if let i = args.firstIndex(of: "--seed"), i + 1 < args.count, let n = UInt64(args[i + 1]) {
        return n
    }
    return UInt64(Date().timeIntervalSince1970)
}()
print("seed \(seed)")

let game = Game(seed: seed)
```

Printing the seed every launch is the cheapest bug-report tool you'll ever
add. "It happened on seed 1725404123" is reproducible; "it happened" isn't.
Note that reading `Date()` here is fine — this is `main.swift`, outside the
simulation, choosing what the simulation's seed will be. Reading it *inside*
`step` would be the bug.

---

## A hash of the world

A determinism test needs to compare two worlds. Comparing every component of
every entity is possible but slow to write and slower to read when it fails;
what you want is one number that changes if *anything* does.

**`ECS/World.swift`**, in `World` — after `snapshotTransforms`:

```diff
+    /// A hash of every position and rotation, in entity order. Two worlds that
+    /// took the same steps from the same seed produce the same number.
+    func stateHash() -> UInt64 {
+        var h: UInt64 = 0xcbf2_9ce4_8422_2325
+        func mix(_ v: UInt32) {
+            h ^= UInt64(v)
+            h = h &* 0x100_0000_01b3
+        }
+        let transforms = store(Transform.self)
+        let order = transforms.owners.indices.sorted {
+            transforms.owners[$0].id < transforms.owners[$1].id
+        }
+        for i in order {
+            let t = transforms.items[i]
+            mix(transforms.owners[i].id)
+            for c in [
+                t.position.x, t.position.y, t.position.z,
+                t.rotation.vector.x, t.rotation.vector.y, t.rotation.vector.z, t.rotation.vector.w,
+            ] {
+                mix(c.bitPattern)
+            }
+        }
+        mix(UInt32(entities.count))
+        return h
+    }
+
 }
```

Two choices make this a *determinism* hash rather than just a hash.

**It hashes bit patterns, not values.** `c.bitPattern` is the raw 32 bits of
the float. Two worlds whose positions differ by one unit in the last place —
the kind of difference a reordered addition produces — hash differently, which
is what you want: that difference *will* grow into a visible one a few hundred
steps later, and the test should catch it while it's small.

**It sorts by entity id.** A `ComponentStore`'s array order depends on the
history of insertions and swap-removals, and two worlds with identical state
could in principle have arrived at it through different removal orders. Sorting
makes the hash a function of *what* the world contains, not of *how* the store
happens to be laid out. The sort is the expensive part of this function, and
this function only ever runs in tests.

The `0xcbf2…` and `0x100…01b3` constants are FNV-1a's offset and prime — the
simplest hash with a good reputation, and enough for a test. Don't ship it as
a checksum for anything adversarial.

---

## The determinism rules

Everything above adds up to four rules. They're stated here once; every later
chapter assumes them.

> 1. **Simulation iterates `ComponentStore.owners`**, never a `Set` or a
>    `Dictionary`. Array order is reproducible; hash order is not.
> 2. **Simulation randomness comes from `world.rng`**, and nothing else.
> 3. **Simulation never reads a clock.** Not `Date()`, not
>    `CACurrentMediaTime()`, not `DispatchTime`. Time arrives as `dt`.
> 4. **The order of floating-point operations is part of the code.** Refactor
>    for clarity, and expect the hash to change when you do.

The first three can be enforced by reading the source, the same way the first
guide's chapter 02 enforced its layers. The test that does that is below.

---

## The tests

Chapter 01 promised that `swift test` becomes half of every checkpoint. Here's
where it starts, and it starts with a one-line change that isn't obvious.

**`Package.swift`**, in the `testTarget` — depend on the executable:

```diff
         .testTarget(
             name: "SpaceFighterTests",
+            dependencies: ["SpaceFighter"],
             path: "Tests/SpaceFighterTests"
         )
```

The first guide's boundary tests never imported the game module — they read
files off disk — so they never needed this. A test that calls
`SimulationClock()` does, and without the dependency SwiftPM compiles the test
against the module but never links the module's code into the test bundle. The
failure is a wall of `Undefined symbols for architecture arm64`, which is not
the error message you'd expect for "missing dependency". Now you know.

**`Tests/SpaceFighterTests/Ch02ClockTests.swift`** — new file:

```swift
import Testing

@testable import SpaceFighter

@Test func oneFullStepRunsOnce() {
    var clock = SimulationClock()
    #expect(clock.advance(realDt: SimulationClock.step) == 1)
    #expect(clock.alpha == 0)
}

@Test func halfStepsAccumulate() {
    var clock = SimulationClock()
    #expect(clock.advance(realDt: SimulationClock.step / 2) == 0)
    #expect(abs(clock.alpha - 0.5) < 1e-5)
    #expect(clock.advance(realDt: SimulationClock.step / 2) == 1)
}
```

**`Ch02ClockTests.swift`** — after `halfStepsAccumulate`:

```swift
@Test func longFrameIsCappedAndLeftoverDropped() {
    var clock = SimulationClock()
    #expect(clock.advance(realDt: 1.0) == SimulationClock.maxStepsPerFrame)
    #expect(clock.accumulator == 0)
}

@Test func negativeTimeIsIgnored() {
    var clock = SimulationClock()
    #expect(clock.advance(realDt: -1) == 0)
    #expect(clock.tick == 0)
}
```

Four tests, one per decision in `advance`. `@testable import` is what lets a
test see the module's internal types without making anything `public`; it
works because SwiftPM builds debug targets with testing enabled.

Now the test this whole chapter exists for.

**`Tests/SpaceFighterTests/Ch02DeterminismTests.swift`** — new file:

```swift
import Foundation
import Testing

@testable import SpaceFighter

/// Ten seconds of scripted flying: pitch on and off every second, yaw every
/// second and a half, trigger held throughout.
private func play(seed: UInt64, steps: Int) -> UInt64 {
    let game = Game(seed: seed)
    var input = InputState()
    input.firing = true
    for i in 0..<steps {
        input.pitch = (i / 60) % 2 == 0 ? 1 : 0
        input.yaw = (i / 90) % 2 == 0 ? 0 : -1
        game.step(input: input, dt: SimulationClock.step)
    }
    return game.world.stateHash()
}

@Test func sameSeedSameInputsSameWorld() {
    #expect(play(seed: 7, steps: 600) == play(seed: 7, steps: 600))
}

@Test func differentSeedsDiverge() {
    #expect(play(seed: 7, steps: 600) != play(seed: 8, steps: 600))
}
```

`play` is a whole game, headless: no window, no Metal, no clock. It calls
`step` directly with a scripted `InputState` — this is why `step` takes `dt` as
a parameter and why `Game` never touches the renderer. Six hundred steps is ten
simulated seconds: seven enemies spawn on the director's 1.3 s interval, two
of them are gone again by the end, and every one of those spawns is a handful of random draws
that must come out the same twice. (The script rarely lands a shot; the hash
covers positions, and a moving enemy is enough.)

The second test is the one that keeps the first honest. If `stateHash` had a
bug that made it return a constant, the first test would pass forever. Two
different seeds *must* produce different worlds, and if they don't, the hash is
lying.

**`Ch02DeterminismTests.swift`** — after `differentSeedsDiverge`:

```swift
@Test func rngIsReproducible() {
    var a = Rng(seed: 42)
    var b = Rng(seed: 42)
    for _ in 0..<1000 { #expect(a.next() == b.next()) }
}
```

And the rules, enforced:

**`Ch02DeterminismTests.swift`** — after `rngIsReproducible`:

```swift
/// The rule from chapter 02, enforced the same way chapter 02 of the first
/// guide enforces its layers: by reading the source.
@Test func simulationNeverUsesTheSystemGenerator() throws {
    let root = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
    let forbidden = [
        "random()", "SystemRandomNumberGenerator", "Date()", "CACurrentMediaTime",
        "DispatchTime.now", "for _ in world.entities", "in world.entities {",
    ]
    for directory in ["Sources/SpaceFighter/Systems", "Sources/SpaceFighter/Archetypes"] {
        let dir = root.appending(path: directory)
        guard let walker = FileManager.default.enumerator(at: dir, includingPropertiesForKeys: nil)
        else { continue }
        for case let file as URL in walker where file.pathExtension == "swift" {
            let source = try String(contentsOf: file, encoding: .utf8)
            for pattern in forbidden {
                #expect(
                    !source.contains(pattern),
                    "\(file.lastPathComponent) uses \(pattern) — not reproducible")
            }
            // `random(in:` is fine only when it takes a generator.
            for line in source.split(separator: "\n") where line.contains("random(in:") {
                #expect(
                    line.contains("using:"),
                    "\(file.lastPathComponent): \(line.trimmingCharacters(in: .whitespaces))")
            }
        }
    }
}
```

It's a grep with a test runner around it, and that's fine. A rule that's only
in a document gets broken by the third person to touch the code; a rule that
fails the build doesn't. When chapter 07 adds four new archetypes with a dozen
random draws between them, this test is what notices the one that forgot
`using:`.

---

## Checkpoint

```console
$ swift test
✔ Test run with 10 tests in 0 suites passed
```

**Ten tests pass**: the two boundary tests, four for the clock, four for
determinism. Then run the game, twice:

```console
$ swift run SpaceFighter --seed 1
seed 1
```

Watch the first few enemies both times: **the same shapes warp in at the same
places**, in the same order, tumbling the same way. Launch without `--seed` and
they don't.

Check three things:

1. **It plays exactly as before.** Same speeds, same turn rates, same spawn
   pace. If the ship feels slower or faster, a system is being stepped with
   the wrong `dt` — search for any `dt` that isn't the parameter.
2. **It's smooth on a high-refresh display.** On a 120 Hz Mac, motion should be
   visibly smoother than on 60 Hz, not identical. If it's identical, `alpha`
   isn't reaching `buildInstances`.
3. **Nothing judders.** Fly a tight turn. If the ship shakes in the frame
   while the world moves smoothly, the camera isn't interpolating — check the
   `alpha` argument reached `viewMatrix`.

**If `swift test` fails to link** with `Undefined symbols`, the `dependencies:`
line in `Package.swift` is missing. **If `sameSeedSameInputsSameWorld` fails**,
something in `step` reads state that isn't in the world — the usual suspect is
a `static var` somewhere. **If `differentSeedsDiverge` fails**, `stateHash` is
returning a constant; check that the `for i in order` loop runs. **If enemies
spawn in different places on the same seed**, one `random` call is still using
the system generator — the last test should have caught it; if it didn't, that
call is in a file outside `Systems/` and `Archetypes/`.

---

## Challenge

Write `stateHash()` to a file every sixty ticks — one line per second of
simulated time — and `diff` the files from two runs of the same seed. They
match. Now break determinism deliberately: add one `Float.random(in: 0...1)`
with no generator anywhere in `step`'s call graph and run again. The `diff`
tells you the *exact second* the runs diverged, which is the tool you'll want
the first time a real determinism bug appears in chapter 13.

Two things make this harder than it sounds: the hash only covers transforms,
so a bug in a value that doesn't move anything (a cooldown, a score) is
invisible until it *does* move something; and writing a file is exactly the
kind of side effect the simulation isn't supposed to have, so decide where the
write goes — and it isn't inside `step`.

---

**Next:** a keyboard that produces a stick, and a stick that can be written
down. →
[Chapter 03: Input as data](03-input-as-data.md)

---

*Back to the [guide map](../README.md) · references in [`resources.md`](../resources.md)*
