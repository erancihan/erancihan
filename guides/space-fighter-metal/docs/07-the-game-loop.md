# 07 · The game loop & timing 🛠️

> **You'll leave this chapter with:** every component defined, the ECS wired to
> the renderer, and a real frame loop — your ship moving under its own power with
> the grid scrolling beneath it.
>
> **Files created:** `Sources/SpaceFighter/Components.swift`,
> `Systems/RenderSystem.swift`, `Systems/MovementSystem.swift`, `Game.swift`,
> `GameView.swift`; and `main.swift` loses its scaffolding

Chapter 06.B ended with a ship drawn from a hand-built dictionary. This chapter
replaces that hand with an ECS, and gives the whole thing a clock.

---

## Components: all the data, none of the behaviour

Every component in the game goes in one file. Several won't have behaviour until
chapter 10, and that's the point — components are *just data*, and the systems
that give them meaning arrive independently.

**`Sources/SpaceFighter/Components.swift`** — new file:

```swift
import simd

/// Where an entity is, how it's oriented, and how big it is.
struct Transform {
    var position: Vec3 = .zero
    var rotation: Quat = Quat(angle: 0, axis: Vec3(0, 1, 0))
    var scale: Vec3 = Vec3(repeating: 1)

    /// The model matrix that places this entity in the world.
    var matrix: Mat4 { Math.trs(translation: position, rotation: rotation, scale: scale) }
}
```

Position, orientation, size — and one computed property that hands chapter 03's
`trs` back as the matrix the renderer needs. Every default is the identity, so
`Transform()` means "at the origin, unrotated, full size".

Three more computed properties turn a `Transform` into a coordinate frame:

**`Components.swift`**, in `Transform` — after `matrix`:

```diff
     /// The model matrix that places this entity in the world.
     var matrix: Mat4 { Math.trs(translation: position, rotation: rotation, scale: scale) }
+
+    /// The direction the entity's nose points (local -Z), in world space.
+    var forward: Vec3 { rotation.act(Vec3(0, 0, -1)) }
+    /// The entity's local up (local +Y), in world space.
+    var up: Vec3 { rotation.act(Vec3(0, 1, 0)) }
+    /// The entity's local right (local +X), in world space.
+    var right: Vec3 { rotation.act(Vec3(1, 0, 0)) }
 }
```

These three are quietly load-bearing for the rest of the guide. `forward` is
chapter 05's nose-at-−Z convention cashed out: it takes the local axis and
rotates it into world space, so "which way is this thing pointing?" is one
property access. Chapter 08 flies the ship with it, chapter 09 places the camera
with it, and chapter 10 spawns bolts from the wingtips using `right`.

**`Components.swift`** — after `Transform`:

```diff
     /// The entity's local right (local +X), in world space.
     var right: Vec3 { rotation.act(Vec3(1, 0, 0)) }
 }
+
+/// Linear velocity in world units per second.
+struct Velocity {
+    var linear: Vec3 = .zero
+}
+
+/// Which mesh to draw and what colour to tint it. Referenced by id, so
+/// components never touch Metal.
+struct Renderable {
+    var mesh: MeshID
+    var color: Vec4
+}
```

*Per second*, not per frame. That unit is a promise the `MovementSystem` has to
keep, and it's the subject of the next section.

**`Components.swift`** — after `Renderable`:

```diff
 struct Renderable {
     var mesh: MeshID
     var color: Vec4
 }
+
+/// Tags the player-controlled ship and carries its flight state.
+struct Player {
+    var throttle: Float = 0.5
+    var boosting: Bool = false
+}
+
+/// A gun. Chapter 10 counts `cooldown` down and spawns bolts.
+struct Weapon {
+    var fireInterval: Float = 0.14 // seconds between shots
+    var cooldown: Float = 0        // time until the next shot is allowed
+    var muzzleSpeed: Float = 140   // world units / second
+}
```

`Player` is mostly a **tag** — a component whose presence is the information.
Systems find the ship by asking for entities that have one. `throttle` is wired
through but unused; chapter 08 explains the hook.

**`Components.swift`** — after `Weapon`:

```diff
     var muzzleSpeed: Float = 140   // world units / second
 }
+
+/// Marks a hostile entity and tracks its durability.
+struct Enemy {
+    var health: Int = 1
+}
+
+/// Marks a player bullet.
+struct Projectile {
+    var damage: Int = 1
+}
```

Now collision. A sphere and two bit masks:

**`Components.swift`** — after `Projectile`:

```diff
 struct Projectile {
     var damage: Int = 1
 }
+
+/// A sphere for cheap collision tests. `layer` is what this *is*; `mask` is
+/// what it reacts to.
+struct Collider {
+    var radius: Float
+    var layer: CollisionLayer
+    var mask: CollisionLayer
+}
+
+struct CollisionLayer: OptionSet {
+    let rawValue: UInt8
+    static let player     = CollisionLayer(rawValue: 1 << 0)
+    static let enemy      = CollisionLayer(rawValue: 1 << 1)
+    static let projectile = CollisionLayer(rawValue: 1 << 2)
+}
```

The layer/mask pair is the standard way to express *who can hit whom* without
writing a rule for every pairing. A bolt is `layer: .projectile, mask: .enemy` —
it *is* a projectile and it only cares about enemies, so bolt-versus-bolt and
bolt-versus-your-own-hull never even get tested. `OptionSet` gives us bitwise
combination for free, so a mask of `[.enemy, .player]` is one value.

Three small ones and the file is done:

**`Components.swift`** — after `CollisionLayer`:

```diff
     static let projectile = CollisionLayer(rawValue: 1 << 2)
 }
+
+/// Removes the entity after `remaining` seconds.
+struct Lifetime {
+    var remaining: Float
+}
+
+/// Spins an entity, purely for visual life.
+struct Spinner {
+    var axis: Vec3
+    var speed: Float   // radians / second
+}
+
+/// Steers an enemy toward the player at a limited turn rate.
+struct Homing {
+    var turnRate: Float
+    var speed: Float
+}
```

Twelve components, no methods that *do* anything, no inheritance. An entity is
whichever subset of these it happens to hold.

---

## The bridge to the renderer

Chapter 06.B was built against a dictionary of instances. Here's the system that
produces it:

**`Sources/SpaceFighter/Systems/RenderSystem.swift`** — new file
(`mkdir -p Sources/SpaceFighter/Systems` first):

```swift
/// Walks every entity with both a Transform and a Renderable, bakes its model
/// matrix, and buckets the results by mesh so the renderer can draw each mesh in
/// a single instanced call.
enum RenderSystem {
    static func buildInstances(_ world: World) -> [MeshID: [InstanceData]] {
        let transforms = world.store(Transform.self)
        let renderables = world.store(Renderable.self)

        var byMesh: [MeshID: [InstanceData]] = [:]
        for entity in renderables.owners {
            guard let r = renderables.get(entity), let t = transforms.get(entity) else { continue }
            byMesh[r.mesh, default: []].append(InstanceData(model: t.matrix, color: r.color))
        }
        return byMesh
    }
}
```

Twelve lines, and they're the entire coupling between gameplay and rendering.
Note the shape of the loop, because every system follows it: get the stores you
need, walk `owners` of the *most restrictive* one, and `guard let` the rest. An
entity with a `Renderable` but no `Transform` is silently skipped rather than
crashing — components are independent, so any combination is legal and systems
have to tolerate that.

The grouping by mesh is not cosmetic. Those buckets become 06.B's
`instanceCount:` draw calls, so twenty enemies cost one call rather than twenty.

---

## Delta time, and why every rate is per-second

**`Sources/SpaceFighter/Systems/MovementSystem.swift`** — new file:

```swift
import simd

/// Advance every entity that has both a Transform and a Velocity by one step.
enum MovementSystem {
    static func update(_ world: World, dt: Float) {
        let velocities = world.store(Velocity.self)
        let transforms = world.store(Transform.self)
        for entity in velocities.owners {
            guard let v = velocities.get(entity) else { continue }
            transforms.mutate(entity) { $0.position += v.linear * dt }
        }
    }
}
```

The whole physics engine, and the important character in it is `dt`.

Displays don't tick at a fixed rate. A 60 Hz panel gives ~16.7 ms per frame, a
120 Hz ProMotion display ~8.3 ms, and dragging the window can produce a 50 ms
hitch. If this said `position += v.linear`, the ship would fly at double speed on
the 120 Hz Mac and lurch on every stutter. Multiplying by elapsed seconds means
`Velocity` genuinely denotes units-per-second on every machine.

Scan every system you write from here for that multiply. Anything that changes
over time and *doesn't* scale by `dt` is a latent frame-rate bug — including
things that don't look like motion, such as chapter 10's weapon cooldown.

One more system, for visual life:

**`MovementSystem.swift`** — after `MovementSystem`:

```diff
             transforms.mutate(entity) { $0.position += v.linear * dt }
         }
     }
 }
+
+/// Rotates anything with a Spinner. Used by tumbling enemies in chapter 10.
+enum SpinSystem {
+    static func update(_ world: World, dt: Float) {
+        let spinners = world.store(Spinner.self)
+        let transforms = world.store(Transform.self)
+        for entity in spinners.owners {
+            guard let s = spinners.get(entity) else { continue }
+            transforms.mutate(entity) { t in
+                t.rotation = simd_normalize(t.rotation * Quat(angle: s.speed * dt, axis: s.axis))
+            }
+        }
+    }
+}
```

Same shape, and the same `dt`. The `simd_normalize` is chapter 03's warning about
accumulated quaternion drift: multiply thousands of times without renormalising
and the rotation slowly turns into a skew.

### Variable versus fixed timestep

We step the simulation by however much real time just elapsed. That's a
**variable timestep** — simple, always in sync with rendering, and right for an
arcade shooter.

The alternative, a **fixed timestep**, banks elapsed time and steps in constant
chunks:

```
accumulator += dt
while accumulator >= STEP { simulate(STEP); accumulator -= STEP }
render(interpolated by accumulator / STEP)
```

You need that when the simulation must be *reproducible*: real physics (springs
and stacked bodies go unstable when the step size wobbles), lockstep multiplayer
(every client must compute bit-identical results), and replays. None of those
apply yet, but chapter 12 flags this as the prerequisite for both physics and
netcode — retrofitting determinism later is genuinely painful.

---

## The Game object

This is the spine. It owns the world and decides what happens in what order.

**`Sources/SpaceFighter/Game.swift`** — new file:

```swift
import simd

/// Numbers several systems share. A reference type so they all see one copy.
final class GameStats {
    var score = 0
    var deaths = 0
    var playerHealth: Float = 100
    var playerMaxHealth: Float = 100
    var hitFlash: Float = 0     // seconds of red flash remaining
}

/// Everything the renderer needs for one frame.
struct FrameRenderData {
    var frame: FrameUniforms
    var instances: [MeshID: [InstanceData]]
    var playerPosition: Vec3
    var hud: [HUDVertex]
}
```

`GameStats` is a `class` on purpose, and it's the one place in the project where
that's true. Components are structs because they're copied into and out of dense
arrays; these numbers are read and written by several systems in one frame and
must be shared, not copied.

**`Game.swift`** — after `FrameRenderData`:

```diff
     var playerPosition: Vec3
     var hud: [HUDVertex]
 }
+
+final class Game {
+    let world = World()
+    let stats = GameStats()
+    private(set) var player: Entity = Entity(id: 0)
+
+    private let fieldOfView: Float = 65
+    private let lightDirection = simd_normalize(Vec3(-0.3, -1.0, -0.55))
+
+    init() {
+        spawnPlayer()
+    }
+}
```

**`Game.swift`**, in `Game` — after `init`:

```diff
     init() {
         spawnPlayer()
     }
+
+    private func spawnPlayer() {
+        player = world.createEntity()
+        world.add(Transform(), to: player)
+        world.add(Velocity(linear: Vec3(0, 0, -20)), to: player)
+        world.add(Player(), to: player)
+        world.add(Weapon(), to: player)
+        world.add(Renderable(mesh: .ship, color: Vec4(0.82, 0.9, 1.0, 1)), to: player)
+        world.add(Collider(radius: 1.3, layer: .player, mask: .enemy), to: player)
+    }
 }
```

There is the ship, and there is no `Ship` class anywhere. It's an id with six
components — exactly the promise chapter 04 made. The `Velocity` is a temporary
forward drift so this chapter has visible motion; chapter 08 deletes it, because
flight control will set velocity every frame.

Now the frame:

**`Game.swift`**, in `Game` — after `spawnPlayer`:

```diff
         world.add(Collider(radius: 1.3, layer: .player, mask: .enemy), to: player)
     }
+
+    func update(dt rawDt: Float, aspect: Float) -> FrameRenderData {
+        let dt = min(max(rawDt, 0), 1.0 / 30.0)
+
+        MovementSystem.update(world, dt: dt)
+        SpinSystem.update(world, dt: dt)
+        world.flushDestroyed()
+    }
 }
```

That first line is a guard rail worth understanding. If a frame takes a long time
— you dragged the window, hit a breakpoint, the app was backgrounded — a huge
`dt` would teleport everything: bullets tunnel straight through enemies, the ship
lurches across the map. Clamping to 1/30 s means a hitch produces a moment of
slow motion instead of a broken world. `max(rawDt, 0)` guards the other end,
because a clock that ever goes backwards would run the game in reverse.

`flushDestroyed` runs **last and exactly once**, which is chapter 04's deferred
deletion paying off: every system this frame saw a consistent world, and the
actual removal happens at one safe point.

The rest of `update` produces the frame data:

**`Game.swift`**, in `update` — after `flushDestroyed`:

```diff
         SpinSystem.update(world, dt: dt)
         world.flushDestroyed()
+
+        // Chapter 09 replaces this block with a proper CameraSystem.
+        let t = world.get(Transform.self, player) ?? Transform()
+        let eye = t.position - t.forward * 9 + t.up * 3
+        let view = Math.lookAt(eye: eye, center: t.position + t.forward * 14, up: Vec3(0, 1, 0))
+        let projection = Math.perspective(fovyRadians: fieldOfView.radians,
+                                          aspect: max(aspect, 0.01),
+                                          near: 0.1, far: 1200)
+        let frame = FrameUniforms(viewProjection: projection * view,
+                                  cameraPosition: eye,
+                                  lightDirection: lightDirection)
+
+        return FrameRenderData(frame: frame,
+                               instances: RenderSystem.buildInstances(world),
+                               playerPosition: t.position,
+                               hud: [])
     }
```

A deliberately crude chase camera: sit nine units behind the ship, three above,
and look fourteen units ahead of it. It uses world-up, which means banking will
be invisible — chapter 09 is entirely about why that feels wrong and what to do.

`hud: []` is the empty array 06.B's `drawHUD` early-returns on. Chapter 11 fills
it with one line.

---

## The heartbeat

We never write a `while true` loop. MetalKit runs one for us and calls a delegate
each time the display is ready.

**`Sources/SpaceFighter/GameView.swift`** — new file:

```swift
import MetalKit
import QuartzCore

/// MetalKit calls `draw(in:)` once per displayed frame. That is the game loop.
final class RenderCoordinator: NSObject, MTKViewDelegate {
    private let game: Game
    private let renderer: Renderer
    private var lastTime: CFTimeInterval

    init(game: Game, renderer: Renderer) {
        self.game = game
        self.renderer = renderer
        self.lastTime = CACurrentMediaTime()
    }

    func mtkView(_ view: MTKView, drawableSizeWillChange size: CGSize) {}
}
```

`CACurrentMediaTime()` is the right clock: a monotonic seconds counter that,
unlike wall-clock time, never jumps backwards when the system clock is adjusted
or the machine crosses a daylight-saving boundary.

**`GameView.swift`**, in `RenderCoordinator` — after `mtkView(_:drawableSizeWillChange:)`:

```diff
     func mtkView(_ view: MTKView, drawableSizeWillChange size: CGSize) {}
+
+    func draw(in view: MTKView) {
+        let now = CACurrentMediaTime()
+        let dt = Float(now - lastTime)
+        lastTime = now
+
+        let size = view.drawableSize
+        let aspect = Float(size.width / max(size.height, 1))
+
+        let data = game.update(dt: dt, aspect: aspect)
+        renderer.render(in: view,
+                        frame: data.frame,
+                        instances: data.instances,
+                        playerPosition: data.playerPosition,
+                        hud: data.hud)
+
+        view.window?.title = String(
+            format: "Space Fighter — Score %d    Hull %.0f%%    Deaths %d",
+            game.stats.score, max(0, game.stats.playerHealth), game.stats.deaths)
+    }
 }
```

Measure, simulate, draw. That's chapter 01's diagram in fourteen lines, and it's
the only place in the project that knows about real time at all.

The title bar is our text renderer. Chapter 11 explains why that's a defensible
choice rather than a cop-out.

---

## Retire the scaffolding

**`main.swift`** — delete the `StaticPreview` class and the lines that use it,
replacing them with the real objects:

```diff
 guard let renderer = Renderer(view: mtkView) else {
     fatalError("Failed to initialise the Metal renderer (see console for shader/pipeline errors).")
 }
-
-final class StaticPreview: NSObject, MTKViewDelegate {
-    private let renderer: Renderer
-    init(renderer: Renderer) { self.renderer = renderer }
-
-    func mtkView(_ view: MTKView, drawableSizeWillChange size: CGSize) {}
-
-    func draw(in view: MTKView) {
-        let aspect = Float(view.drawableSize.width / max(view.drawableSize.height, 1))
-        let eye = Vec3(0, 3, 12)
-        let view4 = Math.lookAt(eye: eye, center: Vec3(0, 0, 0), up: Vec3(0, 1, 0))
-        let projection = Math.perspective(fovyRadians: 65.radians, aspect: aspect,
-                                          near: 0.1, far: 1200)
-        let frame = FrameUniforms(viewProjection: projection * view4,
-                                  cameraPosition: eye,
-                                  lightDirection: simd_normalize(Vec3(-0.3, -1.0, -0.55)))
-        let instances: [MeshID: [InstanceData]] = [
-            .ship: [InstanceData(model: Math.identity, color: Vec4(0.82, 0.9, 1.0, 1))]
-        ]
-        renderer.render(in: view, frame: frame, instances: instances,
-                        playerPosition: .zero, hud: [])
-    }
-}
-
-let preview = StaticPreview(renderer: renderer)
-mtkView.delegate = preview
+
+let game = Game()
+let coordinator = RenderCoordinator(game: game, renderer: renderer)
+mtkView.delegate = coordinator   // MTKView holds this weakly
 
 window.makeKeyAndOrderFront(nil)
 app.activate(ignoringOtherApps: true)
```

**`main.swift`** — the strong reference at the bottom now names the coordinator:

```diff
 window.makeKeyAndOrderFront(nil)
 app.activate(ignoringOtherApps: true)
 
-_ = preview
+_ = coordinator
 app.run()
```

Twenty-five lines of scaffolding out, three lines of real wiring in. The
`Renderer` did not change at all — the dictionary it receives now comes from a
component query instead of a literal, and it cannot tell the difference. That's
the seam from 06.B doing exactly what it was built for.

---

## The schedule is the game

`Game.update` currently runs two systems. By chapter 10 it reads as a sentence:

```
FlightControlSystem   1 aim the ship
WeaponSystem          2 maybe fire
EnemySystem           3 spawn and steer
MovementSystem        4 integrate every velocity
SpinSystem            5 tumble the drifters
LifetimeSystem        6 expire old bolts
CollisionSystem       7 resolve hits
flushDestroyed        8 delete the dead
```

The order is not arbitrary, and reordering it changes behaviour:

- Movement runs **after** weapon fire, so a bolt spawns at the ship's current
  position and *then* travels. Spawn it after movement and every shot lags a
  frame behind the nose.
- Collision runs **after** movement, so it tests where things actually ended up
  this frame rather than where they were last frame.
- `flushDestroyed` runs **last**, so no system ever observes a half-deleted world.

Eight lines that are the entire control flow of the game, in one place you can
read at a glance. That's the payoff for keeping behaviour in systems instead of
scattered across object methods.

---

## Checkpoint

```console
$ swift run
```

The ship is **flying** — drifting forward at 20 units per second, with the grid
sliding beneath it and the camera riding behind. The title bar reads
`Space Fighter — Score 0    Hull 100%    Deaths 0`.

Three things just proved themselves:

1. **The ECS drives the renderer.** That ship comes from
   `RenderSystem.buildInstances`, not a literal.
2. **`dt` is real.** The drift is 20 units/second whatever your refresh rate. Test
   it: drag the window around and the ship keeps a steady pace rather than
   jumping.
3. **The grid snapping from 06.B works.** Lines slide past without crawling.

**If the ship doesn't move**, check `MovementSystem.update` is actually called in
`Game.update`. **If it moves impossibly fast**, you dropped a `* dt`. **If the
window is black**, `mtkView.delegate` isn't set or `_ = coordinator` is missing
and the delegate was deallocated immediately.

---

## Challenge

Give the ship a second `Renderable`… except you can't — a store holds one
component of each type per entity, and `set` overwrites. So instead: spawn three
*more* entities in `spawnPlayer`, each with a `Transform` at a different offset
and a `Renderable(mesh: .enemy, …)`, and watch them appear as a formation. Then
answer two questions. How many draw calls does the renderer now issue, and why is
it not four? And what happens if you give one of them a `Spinner` but no
`Velocity` — which systems touch it, and which ignore it entirely?

---

**Next:** take the controls. → [Chapter 08: Flight & input](08-flight-and-input.md)
