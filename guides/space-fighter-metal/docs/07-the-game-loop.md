# 07 · The game loop & timing 🛠️

> **You'll leave this chapter with:** every component defined, the ECS wired to
> the renderer, and a real frame loop — your ship moving under its own power,
> with the grid scrolling beneath it.
>
> **Files created:** `Sources/SpaceFighter/Components.swift`,
> `Systems/RenderSystem.swift`, `Systems/MovementSystem.swift`, `Game.swift`,
> `GameView.swift`, and a slimmer `main.swift`

---

## Create `Sources/SpaceFighter/Components.swift`

Every component in the game, in one file. Some won't have behaviour until
chapter 10 — that's fine and it's the point: components are *just data*, and the
systems that give them meaning arrive independently.

```swift
import simd

// Components are plain data — value types with no methods and no behaviour.
// A component answers "what does this entity have?"; systems answer "what does
// having it make it do?". Keeping them dumb is what makes an ECS composable:
// any entity can mix any set of these.

/// Where an entity is, how it's oriented, and how big it is. Almost everything
/// visible has a `Transform`.
struct Transform {
    var position: Vec3 = .zero
    var rotation: Quat = Quat(angle: 0, axis: Vec3(0, 1, 0))
    var scale: Vec3 = Vec3(repeating: 1)

    /// The model matrix that places this entity in the world.
    var matrix: Mat4 { Math.trs(translation: position, rotation: rotation, scale: scale) }

    /// The direction the entity's nose points (local -Z), in world space.
    var forward: Vec3 { rotation.act(Vec3(0, 0, -1)) }
    /// The entity's local up (local +Y), in world space.
    var up: Vec3 { rotation.act(Vec3(0, 1, 0)) }
    /// The entity's local right (local +X), in world space.
    var right: Vec3 { rotation.act(Vec3(1, 0, 0)) }
}

/// Linear velocity in world units per second. The `MovementSystem` integrates
/// this into `Transform.position`.
struct Velocity {
    var linear: Vec3 = .zero
}

/// Which mesh to draw for this entity and what colour to tint it. The mesh is
/// referenced by id, not by GPU buffer — components stay pure data and never
/// touch Metal.
struct Renderable {
    var mesh: MeshID
    var color: Vec4
}

/// Tags the single player-controlled ship and carries its flight state. The
/// `FlightControlSystem` (chapter 08) turns input into changes here.
struct Player {
    var throttle: Float = 0.5      // 0…1, eased toward the input target
    var boosting: Bool = false
}

/// A gun. `WeaponSystem` (chapter 10) counts `cooldown` down each frame and,
/// when the fire button is held and it reaches zero, spawns a projectile.
struct Weapon {
    var fireInterval: Float = 0.14 // seconds between shots
    var cooldown: Float = 0        // time until the next shot is allowed
    var muzzleSpeed: Float = 140   // world units / second
}

/// Marks a hostile entity and tracks its durability.
struct Enemy {
    var health: Int = 1
}

/// Marks a player bullet. `damage` is subtracted from an enemy's health on hit.
struct Projectile {
    var damage: Int = 1
}

/// A sphere used for broad, cheap collision tests. `layer`/`mask` keep bullets
/// from hitting the ship that fired them and enemies from hitting each other.
struct Collider {
    var radius: Float
    var layer: CollisionLayer
    var mask: CollisionLayer   // which layers this collider reacts to
}

struct CollisionLayer: OptionSet {
    let rawValue: UInt8
    static let player     = CollisionLayer(rawValue: 1 << 0)
    static let enemy      = CollisionLayer(rawValue: 1 << 1)
    static let projectile = CollisionLayer(rawValue: 1 << 2)
}

/// Removes the entity after `remaining` seconds. Bullets get one so they don't
/// fly forever.
struct Lifetime {
    var remaining: Float
}

/// Spins an entity for a bit of visual life (enemies tumble slowly).
struct Spinner {
    var axis: Vec3
    var speed: Float   // radians / second
}

/// Steers an enemy toward the player at `turnRate`, giving a lazy homing drift.
struct Homing {
    var turnRate: Float   // radians / second
    var speed: Float
}
```

---

## Create `Sources/SpaceFighter/Systems/RenderSystem.swift`

Make the directory (`mkdir -p Sources/SpaceFighter/Systems`). This is the bridge
from the ECS to the renderer — the seam chapter 06 was built against:

```swift
/// The bridge from the ECS to the renderer. It walks every entity that has both
/// a `Transform` and a `Renderable`, bakes its model matrix, and buckets the
/// result by mesh so the renderer can draw each mesh in a single instanced call.
///
/// Notice the renderer never sees an entity, a component, or a system — only
/// arrays of `InstanceData`. That clean seam is what lets you swap the whole
/// rendering backend without touching gameplay.
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

## Create `Sources/SpaceFighter/Systems/MovementSystem.swift`

Two tiny systems — the integrator, and a spinner for visual life:

```swift
import simd

/// The simplest possible integrator: advance every entity that has both a
/// `Transform` and a `Velocity` by one time step. Explicit (semi-implicit) Euler
/// is plenty for an arcade game.
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

/// Rotates anything with a `Spinner`, purely for visual life (tumbling enemies).
enum SpinSystem {
    static func update(_ world: World, dt: Float) {
        let spinners = world.store(Spinner.self)
        let transforms = world.store(Transform.self)
        for entity in spinners.owners {
            guard let s = spinners.get(entity) else { continue }
            transforms.mutate(entity) { t in
                t.rotation = simd_normalize(t.rotation * Quat(angle: s.speed * dt, axis: s.axis))
            }
        }
    }
}
```

---

## Delta time: the one habit that makes motion correct

Look at `MovementSystem`: it advances by `v.linear * dt`, not by `v.linear`.
That's not decoration, it's the difference between a working game and a broken
one.

Displays don't tick at a fixed rate. A 60 Hz panel gives ~16.7 ms per frame; a
120 Hz ProMotion display gives ~8.3 ms; drag the window and a frame might take
50 ms. If a system did `position += velocity` per *frame*, the ship would fly
twice as fast on the 120 Hz Mac and stutter on every hitch.

So we measure **how much real time actually elapsed** (`dt`) and scale every rate
by it. Velocity is *units per second*; turn rates are *radians per second*;
cooldowns count down in *seconds*. Scan the systems as you write them — anything
that changes over time and *doesn't* multiply by `dt` is a latent
frame-rate-dependent bug.

### Clamping the step

One guard rail. If a frame takes a *long* time — window drag, breakpoint,
backgrounded app — a huge `dt` would teleport everything: bullets tunnel through
enemies, the ship lurches across the map. So we cap it at 1/30 s. The game
briefly runs in slow motion during a hitch instead of exploding.

### Variable vs fixed timestep

We use a **variable timestep**: step the simulation by whatever real `dt` just
elapsed. Simple, in sync with rendering, perfect for an arcade shooter.

A **fixed timestep** runs the simulation in constant-size chunks, accumulating
real time and stepping however many whole chunks have banked:

```
accumulator += dt
while accumulator >= STEP { simulate(STEP); accumulator -= STEP }
render(interpolated by accumulator / STEP)
```

Reach for that when the simulation *must* be deterministic and stable: **physics**
(springs and stacked bodies go unstable if the step wobbles), **lockstep
multiplayer** (every client must compute bit-identical results), and **replays**.
None apply yet — but chapter 12 flags this as the prerequisite for both physics
and netcode.

---

## Create `Sources/SpaceFighter/Game.swift`

The spine of the project. This is **version 1** — it creates the world and runs
two systems. Chapters 08–11 add to `update`, and chapter 10 shows the finished
file.

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

/// Everything the renderer needs for one frame, handed back from `Game.update`.
struct FrameRenderData {
    var frame: FrameUniforms
    var instances: [MeshID: [InstanceData]]
    var playerPosition: Vec3
    var hud: [HUDVertex]
}

/// Owns the world and drives the fixed sequence of systems every frame. The
/// *order* of these calls is the game's logic, so it lives in one obvious place.
final class Game {
    let world = World()
    let stats = GameStats()
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
        // A gentle forward drift so this chapter has visible motion. Chapter 08
        // replaces this with real flight control.
        world.add(Velocity(linear: Vec3(0, 0, -20)), to: player)
        world.add(Player(), to: player)
        world.add(Weapon(), to: player)
        world.add(Renderable(mesh: .ship, color: Vec4(0.82, 0.9, 1.0, 1)), to: player)
        world.add(Collider(radius: 1.3, layer: .player, mask: .enemy), to: player)
    }

    /// Advance the simulation by `dt` seconds and produce this frame's draw data.
    func update(dt rawDt: Float, aspect: Float) -> FrameRenderData {
        // Clamp the step so a hiccup (window drag, breakpoint) can't teleport
        // everything through walls.
        let dt = min(max(rawDt, 0), 1.0 / 30.0)

        // --- The system schedule --------------------------------------------
        MovementSystem.update(world, dt: dt)
        SpinSystem.update(world, dt: dt)
        world.flushDestroyed()
        // --------------------------------------------------------------------

        // Camera + projection -> the frame uniforms every shader reads.
        // Chapter 09 replaces this block with a proper CameraSystem.
        let t = world.get(Transform.self, player) ?? Transform()
        let eye = t.position - t.forward * 9 + t.up * 3
        let view = Math.lookAt(eye: eye, center: t.position + t.forward * 14, up: Vec3(0, 1, 0))
        let projection = Math.perspective(fovyRadians: fieldOfView.radians,
                                          aspect: max(aspect, 0.01),
                                          near: 0.1, far: 1200)
        let frame = FrameUniforms(viewProjection: projection * view,
                                  cameraPosition: eye,
                                  lightDirection: lightDirection)

        return FrameRenderData(frame: frame,
                               instances: RenderSystem.buildInstances(world),
                               playerPosition: t.position,
                               hud: [])
    }
}
```

## Create `Sources/SpaceFighter/GameView.swift`

The `MTKViewDelegate` — the heartbeat. MetalKit calls `draw(in:)` once per
displayed frame, and that callback *is* our game loop:

```swift
import MetalKit
import QuartzCore

/// The `MTKViewDelegate`. MetalKit calls `draw(in:)` once per displayed frame;
/// that is our game loop's heartbeat. We measure real elapsed time, step the
/// game, hand the result to the renderer, and mirror the score into the title.
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

    func draw(in view: MTKView) {
        let now = CACurrentMediaTime()
        let dt = Float(now - lastTime)
        lastTime = now

        let size = view.drawableSize
        let aspect = Float(size.width / max(size.height, 1))

        let data = game.update(dt: dt, aspect: aspect)
        renderer.render(in: view,
                        frame: data.frame,
                        instances: data.instances,
                        playerPosition: data.playerPosition,
                        hud: data.hud)

        view.window?.title = String(
            format: "Space Fighter — Score %d    Hull %.0f%%    Deaths %d",
            game.stats.score, max(0, game.stats.playerHealth), game.stats.deaths)
    }
}
```

`CACurrentMediaTime()` is the right clock here — a monotonic seconds counter
that, unlike wall-clock time, never jumps backward when the system clock is
adjusted.

## Update `main.swift`

**Delete the entire `StaticPreview` class** and the lines that create it, and
replace them with the real game objects. The bottom of `main.swift` becomes:

```swift
let game = Game()
let coordinator = RenderCoordinator(game: game, renderer: renderer)
mtkView.delegate = coordinator   // MTKView holds this weakly

window.makeKeyAndOrderFront(nil)
app.activate(ignoringOtherApps: true)

_ = coordinator                  // keep it alive for the life of the process
app.run()
```

Everything above that (the device check, menu, window, `MTKView`, `Renderer`)
stays exactly as chapter 06 left it.

---

## The schedule *is* the game

Here's the part worth slowing down for. `Game.update` runs systems in a fixed
order, and by chapter 10 that order will read as a sentence:

```swift
FlightControlSystem.update(...)   // 1 aim the ship
WeaponSystem.update(...)          // 2 maybe fire
EnemySystem.update(...)           // 3 spawn + steer
MovementSystem.update(world, dt:) // 4 integrate all velocities
SpinSystem.update(world, dt:)     // 5 tumble the drifters
LifetimeSystem.update(...)        // 6 expire bolts
CollisionSystem.update(...)       // 7 resolve hits
world.flushDestroyed()            // 8 delete the dead
```

Reorder those lines and behaviour changes:

- Movement runs **after** flight control and weapon fire, so a bolt spawns at the
  ship's current position and *then* moves — spawn it after movement and it'd lag
  a frame behind the nose.
- Collision runs **after** movement, so it tests the positions things actually
  reached this frame.
- `flushDestroyed` runs **last and once**, so every system saw a consistent world
  all frame and deletion happens at a single safe point (chapter 04).

This is a big reason the ECS pays off: the entire control flow is eight lines you
can read at a glance, each an isolated function. Right now you have two of them.

---

## Checkpoint

```console
$ swift run
```

The window opens and this time the ship is **flying** — drifting forward at 20
units/second with the grid scrolling beneath it and the camera riding behind.
The title bar reads `Space Fighter — Score 0    Hull 100%    Deaths 0`.

Three things just proved themselves: the ECS is driving the renderer (that ship
is `RenderSystem.buildInstances` output, not a hand-built instance), `dt` is
real (the drift is 20 units/second regardless of your refresh rate), and the
grid-snapping from chapter 06 works (lines slide past without crawling).

**If the ship doesn't move**, check that `MovementSystem.update` is actually in
`Game.update`. **If it moves impossibly fast**, you're missing a `* dt`.

---

**Next:** take the controls. → [Chapter 08: Flight & input](08-flight-and-input.md)
