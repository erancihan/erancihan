# 10 · Flight & input 🛠️

> **You'll leave this chapter with:** hands on the controls — an arcade flight
> model that pitches, yaws, rolls and banks, driven by a keyboard the gameplay
> code knows nothing about.
>
> **Files created:** `Sources/SpaceFighter/Input/InputState.swift`,
> `Systems/FlightControlSystem.swift`
> **Files changed:** `Game.swift`, `GameView.swift`, `main.swift`

---

## Input as intent, not keys

The system that flies the ship must not know that `W` is key code 13. If it did,
adding gamepad support later would mean editing gameplay code. So we put a
translation layer in between, and the thing it produces describes **intent**.

**`Sources/SpaceFighter/Input/InputState.swift`** — new file:

```swift
import Foundation

/// What the player is asking for this frame, independent of how we read it.
struct InputState {
    var pitch: Float = 0      // + = nose up,   - = nose down
    var yaw: Float = 0        // + = nose left, - = nose right
    var roll: Float = 0       // + = roll left, - = roll right
    var throttle: Float = 0   // + = speed up,  - = slow down

    var firing: Bool = false
    var boosting: Bool = false
}
```

Those are **normalised axes** in [−1, 1], not booleans about keys. That choice is
the whole point of the layer. A keyboard can only produce −1, 0 or +1, but a
gamepad stick produces every value in between — and when you swap one for the
other, *nothing downstream changes*, because `FlightControlSystem` was never
reading keys in the first place. It multiplies an axis by a turn rate.

**`InputState.swift`** — after `InputState`:

```diff
     var firing: Bool = false
     var boosting: Bool = false
 }
+
+/// macOS virtual key codes. Positional, not character-based, so WASD stays
+/// where it is on a non-QWERTY layout.
+enum Key {
+    static let w: UInt16 = 13
+    static let a: UInt16 = 0
+    static let s: UInt16 = 1
+    static let d: UInt16 = 2
+    static let q: UInt16 = 12
+    static let e: UInt16 = 14
+    static let space: UInt16 = 49
+    static let arrowLeft: UInt16 = 123
+    static let arrowRight: UInt16 = 124
+    static let arrowDown: UInt16 = 125
+    static let arrowUp: UInt16 = 126
+    static let escape: UInt16 = 53
+}
```

Key **codes**, not characters, and that matters more than it looks. A code
identifies a physical position on the keyboard, so `Key.w` is the key above `S`
whether the user is on QWERTY, AZERTY or Dvorak. Match on characters instead and
your French players get their controls scattered across the keyboard.

Now the translator. It holds the set of keys currently down and collapses them
into axes:

**`InputState.swift`** — after `Key`:

```diff
     static let escape: UInt16 = 53
 }
+
+/// Collects raw key events into an InputState. This is the only type in the
+/// project that knows what a key code is.
+final class InputController {
+    private(set) var state = InputState()
+    private var pressed = Set<UInt16>()
+    private var boost = false
+
+    func keyDown(_ code: UInt16) { pressed.insert(code); rebuild() }
+    func keyUp(_ code: UInt16) { pressed.remove(code); rebuild() }
+    func setBoost(_ on: Bool) { boost = on; rebuild() }
+}
```

Tracking a *set of held keys* rather than reacting to individual events is what
makes diagonal input work. Hold `A` and `W` together and both axes are non-zero,
because we rebuild the whole state from everything currently down rather than
letting the last event win.

**`InputState.swift`**, in `InputController` — after `setBoost`:

```diff
     func setBoost(_ on: Bool) { boost = on; rebuild() }
+
+    private func rebuild() {
+        func held(_ codes: UInt16...) -> Bool { codes.contains { pressed.contains($0) } }
+
+        var s = InputState()
+        if held(Key.w, Key.arrowUp) { s.pitch -= 1 }
+        if held(Key.s, Key.arrowDown) { s.pitch += 1 }
+        if held(Key.a, Key.arrowLeft) { s.yaw += 1 }
+        if held(Key.d, Key.arrowRight) { s.yaw -= 1 }
+        if held(Key.q) { s.roll += 1 }
+        if held(Key.e) { s.roll -= 1 }
+
+        s.firing = held(Key.space)
+        s.boosting = boost
+        state = s
+    }
 }
```

Rebuilding from scratch each time means opposite keys cancel for free: hold `A`
and `D` together and yaw is `+1 − 1 = 0`, with no special case.

Note the pitch signs: **pushing forward (`W`/`↑`) dives.** That's the flight-sim
convention — stick forward, nose down — and plenty of players expect the
opposite. Because intent is isolated here, offering an "invert pitch" option is a
sign flip on two lines, not a hunt through the flight model. That is the
abstraction earning its keep.

---

## What "arcade flight model" means

We are not simulating aerodynamics. There's no lift, no stall, no angle of
attack, no energy. The rule is simply: **the ship flies where its nose points,
and your input turns the nose.** That's the Star Fox lineage rather than the
DCS one, and it produces two outputs per frame — an orientation and a velocity.

**`Sources/SpaceFighter/Systems/FlightControlSystem.swift`** — new file:

```swift
import simd

/// Turns input into orientation and velocity. Responsive and forgiving; no
/// stalls, no real aerodynamics.
enum FlightControlSystem {
    // Maximum turn rates, radians / second.
    static let pitchRate: Float = 1.7
    static let yawRate: Float = 1.2
    static let rollRate: Float = 2.6
    static let autoBank: Float = 0.9    // extra roll folded in when yawing

    // Speed envelope, world units / second.
    static let cruiseSpeed: Float = 55
    static let boostMultiplier: Float = 1.9
}
```

Every one of those is *per second*, which is what lets `dt` make them
frame-rate independent. The relative sizes are the feel: roll is the fastest axis
because rolling is how you *set up* a turn, and yaw is the slowest because a ship
that can spin on the spot doesn't read as flying.

**`FlightControlSystem.swift`**, in `FlightControlSystem` — after the tunables:

```diff
     static let cruiseSpeed: Float = 55
     static let boostMultiplier: Float = 1.9
+
+    static func update(_ world: World, player: Entity, input: InputState, dt: Float) {
+        let players = world.store(Player.self)
+        let transforms = world.store(Transform.self)
+        let velocities = world.store(Velocity.self)
+
+        players.mutate(player) { $0.boosting = input.boosting }
+    }
 }
```

Now the rotation, which is chapter 04's local-space quaternion argument made
concrete:

**`FlightControlSystem.swift`**, in `update` — after the `players.mutate` line:

```diff
         players.mutate(player) { $0.boosting = input.boosting }
+
+        let pitch = input.pitch * pitchRate
+        let yaw = input.yaw * yawRate
+        let roll = input.roll * rollRate + input.yaw * autoBank
+        transforms.mutate(player) { t in
+            let delta =
+                Quat(angle: pitch * dt, axis: Vec3(1, 0, 0)) *
+                Quat(angle: yaw * dt,   axis: Vec3(0, 1, 0)) *
+                Quat(angle: roll * dt,  axis: Vec3(0, 0, 1))
+            t.rotation = simd_normalize(t.rotation * delta)
+        }
     }
```

Three things are happening in those eight lines, and each is worth naming.

**Rates times `dt`.** `pitchRate` is 1.7 radians per second; multiplying by
elapsed seconds gives this frame's share. Same discipline as chapter 09.

**Right-multiplication.** `t.rotation * delta` composes the new tumble in the
ship's **current** frame. Swap it to `delta * t.rotation` and the axes become
world axes: roll ninety degrees and "pitch up" would still tilt you toward world
up, which feels like dragging a cursor rather than flying. This one operand order
is most of the difference between the two sensations, and chapter 04's checkpoint
was building toward exactly this line.

**The renormalise.** Thousands of quaternion multiplies accumulate floating-point
error until the rotation stops being unit-length and starts skewing the mesh.
`simd_normalize` costs almost nothing and prevents a bug that takes hours to
diagnose because it appears gradually.

### The auto-bank that sells it

Look again at the roll line:

```
let roll = input.roll * rollRate + input.yaw * autoBank
```

Even with no roll key pressed, **yawing adds roll**. Turn left and the ship banks
into the turn like a real aircraft leaning through a curve. It's one term, and
it's most of the reason the flight reads as "a plane" rather than "a cursor".

Set `autoBank` to `0` and fly for ten seconds. The turns go flat and lifeless
immediately — the ship swivels like a turret. Put it back. This is the cheapest
game-feel lesson in the project.

Finally, velocity, which is trivial once the nose is pointed:

**`FlightControlSystem.swift`**, in `update` — after the `transforms.mutate` block:

```diff
             t.rotation = simd_normalize(t.rotation * delta)
         }
+
+        guard let t = transforms.get(player), let pl = players.get(player) else { return }
+        let speed = cruiseSpeed * (pl.boosting ? boostMultiplier : 1)
+        velocities.set(player, Velocity(linear: t.forward * speed))
     }
```

`t.forward` is chapter 09's computed property — local −Z rotated into world
space. Multiply by a speed and you have the velocity that `MovementSystem` will
integrate one step later in the schedule. That ordering is deliberate: flight
control writes velocity, movement reads it, and neither knows about the other.

---

## Wire it up

Three files change, none by much.

**`Archetypes/Player.swift`**, in `spawnPlayer` — the temporary drift from
chapter 09 goes, because flight control now sets velocity every frame:

```diff
     world.add(Transform(), to: e)
-    world.add(Velocity(linear: Vec3(0, 0, -20)), to: e)
+    world.add(Velocity(), to: e)
     world.add(Player(), to: e)
```

One line, in the file that describes what a player ship *is*. Nothing in
`Game.swift` moves — the schedule didn't change, the recipe did. That separation
is the whole reason the archetype has its own file.

**`Game.swift`** — `update` takes input and runs the new system first:

```diff
-    func update(dt rawDt: Float, aspect: Float) -> FrameRenderData {
+    func update(dt rawDt: Float, input: InputState, aspect: Float) -> FrameRenderData {
         let dt = min(max(rawDt, 0), 1.0 / 30.0)
 
+        FlightControlSystem.update(world, player: player, input: input, dt: dt)
         MovementSystem.update(world, dt: dt)
```

Flight control goes **before** movement. It has to: it writes the velocity that
movement integrates, so reversing them would fly the ship on last frame's
heading — a one-frame lag that is subtle enough to ship and infuriating to debug.

**`GameView.swift`**, in `RenderCoordinator` — hold the controller:

```diff
     private let game: Game
     private let renderer: Renderer
+    private let input: InputController
     private var lastTime: CFTimeInterval
 
-    init(game: Game, renderer: Renderer) {
+    init(game: Game, renderer: Renderer, input: InputController) {
         self.game = game
         self.renderer = renderer
+        self.input = input
         self.lastTime = CACurrentMediaTime()
     }
```

**`GameView.swift`**, in `draw(in:)` — pass this frame's intent through:

```diff
-        let data = game.update(dt: dt, aspect: aspect)
+        let data = game.update(dt: dt, input: input.state, aspect: aspect)
         renderer.render(in: view,
```

---

## Reading the keyboard

**`main.swift`** — create the controller and hand it to the coordinator:

```diff
 let game = Game()
+let input = InputController()
-let coordinator = RenderCoordinator(game: game, renderer: renderer)
+let coordinator = RenderCoordinator(game: game, renderer: renderer, input: input)
 mtkView.delegate = coordinator   // MTKView holds this weakly
```

Now the events themselves. A local event monitor is the simplest reliable way to
read the keyboard without fighting the responder chain:

**`main.swift`** — after the `mtkView.delegate` line:

```diff
 mtkView.delegate = coordinator   // MTKView holds this weakly
+
+let keyMonitor = NSEvent.addLocalMonitorForEvents(matching: [.keyDown, .keyUp, .flagsChanged]) { event in
+    switch event.type {
+    case .keyDown:
+        if event.keyCode == Key.escape { NSApp.terminate(nil) }
+        if event.modifierFlags.contains(.command) { return event }
+        input.keyDown(event.keyCode)
+        return nil
+    case .keyUp:
+        if event.modifierFlags.contains(.command) { return event }
+        input.keyUp(event.keyCode)
+        return nil
+    case .flagsChanged:
+        input.setBoost(event.modifierFlags.contains(.shift))
+        return event
+    default:
+        return event
+    }
+}
 
 window.makeKeyAndOrderFront(nil)
```

The return value is the part worth understanding. Returning `nil` **consumes**
the event, which is what stops macOS playing the "unhandled key" beep every time
you pitch. Returning the event passes it on — which we do for anything with
Command held, so `⌘Q` and the rest of the system shortcuts keep working, and for
`flagsChanged`, because swallowing modifier events would break the OS's own
tracking of them.

Boost rides on `flagsChanged` rather than `keyDown` because Shift is a modifier:
macOS never sends a key-down for it, only a notification that the flags changed.
Reading `modifierFlags.contains(.shift)` gives us press *and* release from the
same event, which is why `setBoost` takes a `Bool` rather than being two methods.

**`main.swift`** — keep the monitor alive:

```diff
 _ = coordinator
+_ = keyMonitor
 app.run()
```

`addLocalMonitorForEvents` returns an opaque token, and dropping it removes the
monitor. Without this line your controls work for exactly as long as it takes ARC
to notice, which in a release build can be immediately.

---

## Checkpoint

```console
$ swift run
```

**You can fly.** Click the window to focus it first — a local monitor only sees
events for the active app.

| Key | Action |
|---|---|
| `W` `S` / `↑` `↓` | Pitch down / up |
| `A` `D` / `←` `→` | Yaw left / right |
| `Q` `E` | Roll |
| `Shift` | Boost |
| `Esc` | Quit |

Check these four in order, because each isolates a different thing you just
wrote:

1. **Yaw left and the ship banks** into the turn without touching `Q`. That's
   `autoBank`.
2. **Roll 90°, then pitch.** You should curl sideways through the roll. If you
   still pitch relative to the screen, you have `delta * t.rotation` instead of
   `t.rotation * delta`.
3. **Hold Shift** — the grid visibly rushes past faster.
4. **Fly straight up and keep going past vertical.** Nothing snaps, sticks or
   flips. That's the quaternion earning its place; Euler angles would gimbal-lock
   right there.

**If nothing responds**, click the window. **If the ship drifts with no input**,
you left chapter 09's `Velocity(linear:)` in `spawnPlayer`. **If every keypress
beeps**, your monitor is returning the event instead of `nil`.

---

## Why this is a system, not a method on a ship

There is no `Ship` class with a `fly()` method. Flight is a function that reads
input plus components and writes back orientation and velocity. Two consequences
follow, and both are useful: give *any* entity a `Player` component and this
system will fly it, and take it away and the entity simply coasts on whatever
velocity it has.

`Player.throttle` and `InputState.throttle` are wired through and unused. That's
a deliberate hook — see the challenge.

---

## Challenge

Implement the throttle. Map two keys to ease `Player.throttle` between 0 and 1
(`Math.moveToward` from chapter 04 is exactly the tool), then use it to
interpolate speed between a minimum and `cruiseSpeed` instead of using
`cruiseSpeed` flat. Three things to get right: the easing must be `dt`-scaled or
it'll be twice as fast on a 120 Hz display; throttle should persist when no key
is held, unlike the turn axes which reset every frame; and decide whether boost
multiplies the throttled speed or overrides it — they feel different, and one of
them makes the throttle pointless.

---

**Next:** the camera is still the crude placeholder from chapter 09. →
[Chapter 11: The camera](11-the-camera.md)
