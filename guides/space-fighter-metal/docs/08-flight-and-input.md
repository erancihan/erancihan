# 08 · Flight & input 🛠️

> **You'll leave this chapter with:** hands on the controls — an arcade flight
> model that pitches, yaws, rolls and banks, driven by the keyboard through an
> abstraction that doesn't know what a keyboard is.
>
> **Files created:** `Sources/SpaceFighter/Input.swift`,
> `Systems/FlightControlSystem.swift`
> **Files changed:** `Game.swift`, `GameView.swift`, `main.swift`

---

## Input as intent, not keys

The systems that fly the ship should not know that `W` is key code 13. If they
did, adding gamepad support later would mean editing gameplay code. So we put a
translation layer in between: raw events go into an `InputController`, which
emits an `InputState` of **intent** — normalised axes in [−1, 1], not booleans
about keys.

A keyboard produces −1 / 0 / +1; a gamepad stick would produce the smooth values
in between, and *nothing downstream changes*.

### Create `Sources/SpaceFighter/Input.swift`

```swift
import Foundation

/// A snapshot of what the player is pressing this frame, decoupled from *how*
/// we read it. `InputController` fills this in from AppKit key events; systems
/// read the axes and never see a key code. Swapping in a gamepad later means
/// changing only the code that writes these fields.
struct InputState {
    // Held keys, resolved into signed axes in the range [-1, 1].
    var pitch: Float = 0      // + = nose up,   - = nose down
    var yaw: Float = 0        // + = nose left, - = nose right
    var roll: Float = 0       // + = roll left, - = roll right
    var throttle: Float = 0   // + = speed up,  - = slow down

    var firing: Bool = false
    var boosting: Bool = false
}

/// The physical keys we care about, as macOS virtual key codes. Using codes
/// rather than characters means the layout is positional (WASD stays where it
/// is on a non-QWERTY keyboard).
enum Key {
    static let w: UInt16 = 13
    static let a: UInt16 = 0
    static let s: UInt16 = 1
    static let d: UInt16 = 2
    static let q: UInt16 = 12
    static let e: UInt16 = 14
    static let space: UInt16 = 49
    static let arrowLeft: UInt16 = 123
    static let arrowRight: UInt16 = 124
    static let arrowDown: UInt16 = 125
    static let arrowUp: UInt16 = 126
    static let escape: UInt16 = 53
}

/// Collects raw key events into a tidy `InputState`. It knows about key codes;
/// nothing downstream does.
final class InputController {
    private(set) var state = InputState()
    private var pressed = Set<UInt16>()
    private var boost = false

    func keyDown(_ code: UInt16) { pressed.insert(code); rebuild() }
    func keyUp(_ code: UInt16) { pressed.remove(code); rebuild() }
    func setBoost(_ on: Bool) { boost = on; rebuild() }

    private func rebuild() {
        func held(_ codes: UInt16...) -> Bool { codes.contains { pressed.contains($0) } }

        var s = InputState()
        // Pitch: nose down when pushing forward (flight-sim / Star Fox feel).
        if held(Key.w, Key.arrowUp) { s.pitch -= 1 }
        if held(Key.s, Key.arrowDown) { s.pitch += 1 }
        // Yaw: + is nose-left (see FlightControlSystem).
        if held(Key.a, Key.arrowLeft) { s.yaw += 1 }
        if held(Key.d, Key.arrowRight) { s.yaw -= 1 }
        // Roll.
        if held(Key.q) { s.roll += 1 }
        if held(Key.e) { s.roll -= 1 }

        s.firing = held(Key.space)
        s.boosting = boost
        state = s
    }
}
```

Note pitch: **pushing forward (`W`/`↑`) dives.** That's the flight-sim
convention. Because input is one clean layer, offering an "invert pitch" option
later is a one-line sign flip in `rebuild()`, not a hunt through gameplay code.

---

## What "arcade flight model" means

We are not simulating aerodynamics. There's no lift, no stall, no angle of
attack. The rule is simply: **the ship always flies where its nose points, and
your input turns the nose.** This is the Star Fox / Ace Combat *arcade* feel, and
it's a handful of lines producing two outputs per frame — an updated
**orientation** (a quaternion) and a **velocity** down the nose.

### Create `Sources/SpaceFighter/Systems/FlightControlSystem.swift`

```swift
import simd

/// Turns the player's input into orientation and velocity. This is the "flight
/// model": an arcade one, in the spirit of Star Fox — responsive, forgiving, no
/// stalls or real aerodynamics. The ship always flies where its nose points.
enum FlightControlSystem {
    // Maximum turn rates, radians / second.
    static let pitchRate: Float = 1.7
    static let yawRate: Float = 1.2
    static let rollRate: Float = 2.6
    static let autoBank: Float = 0.9    // extra roll folded in when yawing

    // Speed envelope, world units / second.
    static let cruiseSpeed: Float = 55
    static let boostMultiplier: Float = 1.9

    static func update(_ world: World, player: Entity, input: InputState, dt: Float) {
        let players = world.store(Player.self)
        let transforms = world.store(Transform.self)
        let velocities = world.store(Velocity.self)

        players.mutate(player) { $0.boosting = input.boosting }

        // Compose a body-space rotation from this frame's pitch/yaw/roll and
        // apply it on the right, so turns are always relative to where the ship
        // currently points (roll left, then pitch, and "up" tilts with you).
        let pitch = input.pitch * pitchRate
        let yaw = input.yaw * yawRate
        let roll = input.roll * rollRate + input.yaw * autoBank
        transforms.mutate(player) { t in
            let delta =
                Quat(angle: pitch * dt, axis: Vec3(1, 0, 0)) *
                Quat(angle: yaw * dt,   axis: Vec3(0, 1, 0)) *
                Quat(angle: roll * dt,  axis: Vec3(0, 0, 1))
            t.rotation = simd_normalize(t.rotation * delta)
        }

        // Drive velocity straight down the nose.
        guard let t = transforms.get(player), let pl = players.get(player) else { return }
        let speed = cruiseSpeed * (pl.boosting ? boostMultiplier : 1)
        velocities.set(player, Velocity(linear: t.forward * speed))
    }
}
```

### Three things to notice

**Rates × dt.** `pitchRate` is 1.7 rad/s; multiplying by `dt` makes the turn
frame-rate independent (chapter 07).

**Right-multiply.** `t.rotation * delta` composes the new tumble *in the ship's
current frame*, so after you roll, "pitch" curls you through the roll — the thing
that makes it feel like flying rather than steering a cursor. (`delta * t.rotation`
would rotate about world axes and feel wrong immediately.)

**The auto-bank that sells it.** Look again at
`roll = input.roll * rollRate + input.yaw * autoBank`. Even if you never press a
roll key, **yawing adds roll** — turn left and the ship banks into the turn like
a real aircraft. It's a single term, and it's most of why the flight reads as "a
plane." Set `autoBank` to 0 and the turns go flat and lifeless immediately; it's
the first knob to play with.

Once the nose points somewhere, flying is trivial: `t.forward` is the ship's
local −Z rotated into world space, so velocity is just that times speed, and the
`MovementSystem` you already wrote integrates it one step later in the schedule.

---

## Wire it up

Three small changes.

**1. `Game.swift` — take input and run the system.** Replace the `update` method
with this version (the signature gains `input:`, and the drift velocity in
`spawnPlayer` is no longer needed — flight control sets velocity every frame):

```swift
    func update(dt rawDt: Float, input: InputState, aspect: Float) -> FrameRenderData {
        let dt = min(max(rawDt, 0), 1.0 / 30.0)

        // --- The system schedule --------------------------------------------
        FlightControlSystem.update(world, player: player, input: input, dt: dt)
        MovementSystem.update(world, dt: dt)
        SpinSystem.update(world, dt: dt)
        world.flushDestroyed()
        // --------------------------------------------------------------------

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
```

Also in `spawnPlayer`, simplify the velocity line back to a plain `Velocity()`:

```swift
        world.add(Velocity(), to: player)
```

**2. `GameView.swift` — pass input through.** Add an `input` property, take it in
the initializer, and feed it to `game.update`:

```swift
final class RenderCoordinator: NSObject, MTKViewDelegate {
    private let game: Game
    private let renderer: Renderer
    private let input: InputController          // <- new
    private var lastTime: CFTimeInterval

    init(game: Game, renderer: Renderer, input: InputController) {   // <- new param
        self.game = game
        self.renderer = renderer
        self.input = input
        self.lastTime = CACurrentMediaTime()
    }
```

and inside `draw(in:)`, change the update call to:

```swift
        let data = game.update(dt: dt, input: input.state, aspect: aspect)
```

**3. `main.swift` — read the keyboard.** Replace the block that creates the game
and coordinator with this:

```swift
let game = Game()
let input = InputController()
let coordinator = RenderCoordinator(game: game, renderer: renderer, input: input)
mtkView.delegate = coordinator   // MTKView holds this weakly

// Route keyboard events into the InputController. A local monitor is the
// simplest reliable way to read the keyboard without wrestling the responder
// chain. We consume the events we use (return nil) so macOS doesn't beep, but
// let anything with Command through so system shortcuts keep working.
let keyMonitor = NSEvent.addLocalMonitorForEvents(matching: [.keyDown, .keyUp, .flagsChanged]) { event in
    switch event.type {
    case .keyDown:
        if event.keyCode == Key.escape { NSApp.terminate(nil) }
        if event.modifierFlags.contains(.command) { return event }
        input.keyDown(event.keyCode)
        return nil
    case .keyUp:
        if event.modifierFlags.contains(.command) { return event }
        input.keyUp(event.keyCode)
        return nil
    case .flagsChanged:
        input.setBoost(event.modifierFlags.contains(.shift))
        return event
    default:
        return event
    }
}

window.makeKeyAndOrderFront(nil)
app.activate(ignoringOtherApps: true)

// Keep strong references alive for the life of the process.
_ = coordinator
_ = keyMonitor

app.run()
```

Boost rides on `flagsChanged` because Shift is a modifier, not a regular key —
macOS reports it as a flag change rather than a key-down.

---

## Checkpoint

```console
$ swift run
```

**You can fly.** Click the window to focus it, then:

| Key | Action |
|---|---|
| `W` `S` / `↑` `↓` | Pitch down / up |
| `A` `D` / `←` `→` | Yaw left / right |
| `Q` `E` | Roll |
| `Shift` | Boost |
| `Esc` | Quit |

Things to check, in order:

1. **Yaw left and the ship banks** into the turn without you touching `Q`/`E` —
   that's `autoBank`.
2. **Roll 90°, then pitch.** You should curl sideways through the roll, not pitch
   about the world's horizontal. If you pitch "up" relative to the screen no
   matter how you're rolled, you've got `delta * t.rotation` instead of
   `t.rotation * delta`.
3. **Hold Shift** and the grid rushes past noticeably faster.
4. **Fly straight up past vertical** and keep going. Nothing snaps or locks —
   that's the quaternion earning its place (chapter 03).

**If nothing responds**, click the window first; the local event monitor only
sees events for the active app.

---

## Why this lives in a system, not the ship

There is no `Ship` class with a `fly()` method. Flight is a *system* that reads
input plus the player's components and writes back orientation and velocity. The
upshot: give *any* entity a `Player` component and this system flies it; take it
away and the entity coasts on whatever velocity it has. Behaviour is attached,
not inherited — chapter 04's promise, cashed out.

`Player.throttle` and `InputState.throttle` are wired through but unused — a
deliberate hook. Making Shift/Ctrl ease `throttle` between a min and max speed,
and using it in place of the constant `cruiseSpeed`, is a five-minute extension
and a good first change to make on your own.

---

**Next:** the camera is currently a placeholder. Let's fix that. →
[Chapter 09: The camera](09-the-camera.md)
