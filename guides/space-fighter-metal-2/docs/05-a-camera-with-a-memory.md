# 05 · A camera with a memory 🛠️

> **You'll leave this chapter with:** a chase camera that carries its own
> orientation and chases the ship's — so a bank rolls the horizon a beat late
> while the ship stays put on screen — that leads into turns, widens on boost
> and shakes when you're hit; a function that puts any world point on the
> screen; and a reticle that shows where the nose points beside a marker that
> shows where you're actually going.
>
> **Files created:** `Sources/SpaceFighter/Components/Presentation.swift`,
> `Tests/SpaceFighterTests/Ch05CameraTests.swift`
> **Files changed:** `Systems/CameraSystem.swift` (rewritten), `Game.swift`,
> `GameView.swift`, `Core/Math.swift`, `Systems/HUDSystem.swift`,
> `Systems/CollisionSystem.swift`, `Archetypes/Player.swift`

Fly a roll with chapter 04's ship and the first guide's camera. The eye is
placed three units along the ship's up vector, so as the ship rolls the eye
swings round it in a circle and the ship slides across the screen; the
camera's up is a blend of the ship's up and the world's, so the horizon
half-follows and looks broken either way. The first guide's chapter 11 called
its up-vector blend "one of maybe three numbers that change how the game
feels", and it was right — for a ship that didn't roll much. This one does.

The fix isn't a better blend. It's giving the camera *state*.

---

## Two frames, not one

The first guide's camera was a pure function: ship in, view matrix out, no
memory. Every frame it recomputed the eye from the ship's current axes, which
means the camera was welded to the ship. Weld a camera to a rolling body and
the world spins around the viewer, which is the setting that makes people put
the controller down.

Real chase cameras have their own orientation. It *chases* the ship's — always
heading toward it, never quite there — and the eye and look target hang off
the camera's axes, not the ship's. Two things follow. The ship, which is
always at the same offset from the camera, stays at the same place on screen.
And a bank, which the camera catches up with over a few tenths of a second,
shows up as the horizon rolling *late*: you see the ship tilt first and the
world follow, which is exactly how it reads from a cockpit.

**`Sources/SpaceFighter/Components/Presentation.swift`** — new file:

```swift
import simd

/// Presentation. The camera's own state for one player: where it thinks the
/// ship is pointing (a beat behind where it is), how wide it is looking, and
/// how hard it is shaking. Updated every display frame with real time; never
/// read by the simulation.
struct CameraRig {
    var rotation: Quat = Quat(angle: 0, axis: Vec3(0, 1, 0))
    var fov: Float = CameraRig.baseFov
    var shake: Float = 0
    var shakeOffset: Vec3 = .zero
}
```

It's a component, on the player entity, and the file it lives in is named for
what it is. Nothing in `step` will ever read a `CameraRig` — the boundary
chapter 02 drew — but it lives in the world because it's per-player, and
chapter 11 puts two players in the world.

**`Presentation.swift`**, in `CameraRig` — after `shakeOffset`:

```diff
     var shakeOffset: Vec3 = .zero
+
+    // Framing, world units.
+    static let distanceBack: Float = 9
+    static let heightAbove: Float = 3
+    static let lookAhead: Float = 14
+    /// Look-target offset per radian / second of turn: the camera leads the turn.
+    static let leadPerRate: Float = 5
+
+    // Response, per second.
+    static let followRate: Float = 6
+    static let fovRate: Float = 4
+    static let shakeDecay: Float = 6
+
+    // Field of view, degrees.
+    static let baseFov: Float = 65
+    static let boostFov: Float = 80
+
+    /// How much of world-up to blend into the camera's up. Zero rolls with the
+    /// ship; one keeps the horizon level however the ship banks.
+    static let horizonBias: Float = 0
+    /// Eye displacement at full shake, world units.
+    static let shakeAmplitude: Float = 0.6
 }
```

The framing numbers are the first guide's, unchanged. The new ones:

**`followRate` of 6.** `1 − exp(−6/60)` is 9.5 %: the rig closes just under
a tenth of the gap to the ship every frame at 60 Hz, which puts it 95 % of
the way there in half a second. Lower it to 3 and the camera swims; raise it to 12 and
you're back to the welded camera with a slight softness. 6 is where a bank
reads as *the horizon rolling* rather than *the camera lagging*.

**`leadPerRate` of 5.** At full pitch rate — 2.2 rad/s — the look target
shifts eleven units up from where it would otherwise be, so the camera looks
*into* the turn. Without it, a hard pull fills the screen with what's below
you; with it, you can see where you're going.

**`fovRate` of 4** and **`boostFov` of 80.** The field of view widens fifteen
degrees under boost, easing over about a second. Wider is the oldest speed
cue in games — it makes the edges of the world stream past faster — and it's
cheaper than any particle.

**`horizonBias` of 0.** The first guide's blend was 65 % world-up. It's a
tunable here, defaulting to *off*, and the paragraph on why is in the next
section. **`shakeDecay` of 6** and **`shakeAmplitude` of 0.6** are taste.

**`Sources/SpaceFighter/Archetypes/Player.swift`**, in `spawnPlayer` — the
rig rides on the ship:

```diff
     world.add(Collider(radius: 1.3, layer: .player, mask: .enemy), to: e)
+    world.add(CameraRig(), to: e)
     return e
```

---

## Chasing the ship

The whole camera file is replaced: the old `viewMatrix` and its three
constants go, and two functions come back — one that advances the rig, one
that reads it.

**`Sources/SpaceFighter/Systems/CameraSystem.swift`** — replace the whole file:

```swift
import simd

/// A chase camera with a memory. The rig's orientation chases the ship's, so a
/// bank shows up as the horizon rolling a beat late; the eye and the look
/// target hang off the rig, so the ship stays put on screen while the world
/// turns around it.
enum CameraSystem {
    /// Presentation. Bring the rig toward the ship by one display frame.
    static func update(
        _ world: World, player: Entity, alpha: Float, realDt: Float,
        stats: GameStats, rng: inout Rng
    ) {
        guard let current = world.get(Transform.self, player),
            let pl = world.get(Player.self, player),
            let model = world.get(FlightModel.self, player)
        else { return }
        let ship = current.interpolated(from: world.get(PreviousTransform.self, player), alpha: alpha)
    }
}
```

`realDt`, not `dt`. This runs once per *display* frame, at whatever rate the
display has, on however much time actually passed. It's the first system in
the guide that does, which is why the parameter has a different name — a
reader skimming `Game.swift` should be able to tell the two clocks apart.

`rng` is passed in rather than taken from the world, and it's *not* the
world's. The shake below draws random numbers, and if those came from
`world.rng` a purely visual effect would change what enemy spawns next.

**`CameraSystem.swift`**, in `update` — after `let ship`:

```diff
         let ship = current.interpolated(from: world.get(PreviousTransform.self, player), alpha: alpha)
+
+        world.store(CameraRig.self).mutate(player) { rig in
+            let follow = 1 - exp(-CameraRig.followRate * realDt)
+            rig.rotation = simd_slerp(rig.rotation, ship.rotation, follow)
+
+            let overBoost = (pl.speed - model.maxSpeed) / (model.boostSpeed - model.maxSpeed)
+            let wantedFov = simd_mix(CameraRig.baseFov, CameraRig.boostFov, min(max(overBoost, 0), 1))
+            rig.fov += (wantedFov - rig.fov) * (1 - exp(-CameraRig.fovRate * realDt))
+
+            rig.shake = max(rig.shake * exp(-CameraRig.shakeDecay * realDt), stats.pendingShake)
+            let jitter = Vec3(
+                Float.random(in: -1...1, using: &rng),
+                Float.random(in: -1...1, using: &rng),
+                Float.random(in: -1...1, using: &rng))
+            rig.shakeOffset = jitter * rig.shake * CameraRig.shakeAmplitude
+        }
+        stats.pendingShake = 0
     }
```

Three eases, all in the `1 − exp(−k·dt)` form, because `realDt` varies and
this is the form that doesn't care.

The first is the chapter. `simd_slerp` from where the rig *was* toward where
the ship *is*, by a fraction that depends on elapsed time: that's the lag,
and it's one line. `slerp` rather than a component-wise blend for the same
reason chapter 02 gave — a blend of two rotations that isn't spherical
shrinks and wobbles.

The field of view keys off *speed*, not off the boost button. Chapter 04's
speed takes a second or two to climb from cruise to boost, and a FOV that
snapped on the keypress would arrive before the ship did. `overBoost` is how far past
cruise you are, 0 to 1.

Shake is a value that decays, and `max` with the pending request means a hit
during a shake restarts it at full rather than adding to it. The offset is
recomputed from fresh random numbers every frame — that's what makes it a
shake rather than a lean — and the request is cleared after it's been read.
`pendingShake` doesn't exist yet; it's added below, with the explanation of
why it's shaped the way it is.

**`CameraSystem.swift`**, in `CameraSystem` — after `update`:

```diff
         stats.pendingShake = 0
     }
+
+    /// The view matrix from the rig, looking at the interpolated ship.
+    static func viewMatrix(_ world: World, player: Entity, alpha: Float) -> (view: Mat4, eye: Vec3) {
+        guard let current = world.get(Transform.self, player),
+            let rig = world.get(CameraRig.self, player)
+        else {
+            return (Math.identity, .zero)
+        }
+        let ship = current.interpolated(from: world.get(PreviousTransform.self, player), alpha: alpha)
+        let turning = world.get(AngularVelocity.self, player)?.body ?? .zero
+
+        let forward = rig.rotation.act(Vec3(0, 0, -1))
+        let up = rig.rotation.act(Vec3(0, 1, 0))
+        let right = rig.rotation.act(Vec3(1, 0, 0))
+
+        let eye = ship.position - forward * CameraRig.distanceBack + up * CameraRig.heightAbove
+            + rig.shakeOffset
+        let lead = (up * turning.x - right * turning.y) * CameraRig.leadPerRate
+        let center = ship.position + forward * CameraRig.lookAhead + lead
+        let camUp = simd_normalize(simd_mix(up, Vec3(0, 1, 0), Vec3(repeating: CameraRig.horizonBias)))
+        return (Math.lookAt(eye: eye, center: center, up: camUp), eye)
+    }
 }
```

Compare it with the first guide's version and every `t.forward`, `t.up` has
become the *rig's* forward and up. The eye is nine back and three up along the
rig's axes from the ship's *interpolated* position — position from the ship,
orientation from the rig. That's the split that keeps the ship on screen.

`lead` reads the ship's angular velocity — pitch rate along the rig's up, yaw
rate along its right, with the sign that makes "nose left" push the target
left — and moves the look target into the turn. It uses the rig's axes
rather than the ship's so that it doesn't fight the lag.

And `camUp`. With `horizonBias` at zero it's the rig's up, in full: the
camera rolls with the ship, a beat late. The first guide's 65 % world-up
blend was the right call for a model where roll was a side effect of yaw and
the horizon was a reference the player never chose to leave. In bank-and-pull
the player *chooses* their bank, and a camera that keeps the horizon level
while they do it hides the one piece of information they set up the turn
with. Set `horizonBias` to `0.65` and fly for a minute to feel what's lost.
Then set it back.

---

## What the simulation is allowed to ask for

Camera shake is caused by something that happens in the simulation — a
collision — and shown by something that happens in presentation. The two
sides can't call each other: `CollisionSystem` runs in `step` and knows
nothing about frames, and the camera runs in `frame` and mustn't reach into
the simulation.

So the simulation *writes a request* and presentation *consumes it*. The
first guide already did this with `hitFlash`, without calling it that. Here's
the shape made explicit, and `hitFlash` moved to the side of the line it was
always on.

**`Sources/SpaceFighter/Game.swift`**, in `GameStats`:

```diff
-    var hitFlash: Float = 0  // seconds of red flash remaining
+    var hitFlash: Float = 0      // seconds of red flash remaining
+    var pendingShake: Float = 0  // 0…1, set by the simulation, consumed by the camera
```

**`Sources/SpaceFighter/Systems/CollisionSystem.swift`**, in `update` — where
the ship takes a hit:

```diff
             stats.playerHealth -= 20
             stats.hitFlash = 0.5
+            stats.pendingShake = 1
```

**`Game.swift`**, in `step` — the flash no longer counts down here:

```diff
         world.flushDestroyed()

-        stats.hitFlash = max(0, stats.hitFlash - dt)
         if stats.playerHealth <= 0 {
             respawn()
         }
```

It's honest to say this is a stopgap. A float that means "someone hit me
this step" is a poor event: it can't say *who*, two hits in one step collapse
to one, and every new effect needs another field. Chapter 06 replaces both
`hitFlash` and `pendingShake` with a real event queue. What's worth taking
from this version is the *direction*: simulation produces, presentation
consumes, and nothing flows the other way.

---

## `frame` gets real time

**`Game.swift`**, in `Game` — presentation randomness beside the other
presentation state, and `fieldOfView` retired:

```diff
     var showFlightDebug = false
     private var lastInput = InputFrame()
+    /// Presentation randomness: camera shake and the like. Never the world's.
+    private var presentationRng = Rng(seed: 0xCAFE)

-    private let fieldOfView: Float = 65
     private let lightDirection = simd_normalize(Vec3(-0.3, -1.0, -0.55))
```

A second `Rng`, seeded with a constant, owned by `Game` rather than `World`.
It doesn't need to be reproducible — nobody replays a shake — but there's no
reason for it not to be, and a constant seed is one fewer thing that differs
between two runs when you're comparing them.

**`Game.swift`** — replace `frame` and add `reticle` after it:

```swift
    /// Everything the renderer needs, blended `clock.alpha` of the way into
    /// the step that hasn't happened yet. Presentation state advances here, by
    /// real time.
    func frame(aspect: Float, realDt: Float) -> FrameRenderData {
        let alpha = clock.alpha
        stats.hitFlash = max(0, stats.hitFlash - realDt)
        CameraSystem.update(
            world, player: player, alpha: alpha, realDt: realDt, stats: stats, rng: &presentationRng)

        let (view, eye) = CameraSystem.viewMatrix(world, player: player, alpha: alpha)
        let fov = world.get(CameraRig.self, player)?.fov ?? CameraRig.baseFov
        let projection = Math.perspective(
            fovyRadians: fov.radians, aspect: max(aspect, 0.01), near: 0.1, far: 1200)
        let viewProjection = projection * view
        let frame = FrameUniforms(
            viewProjection: viewProjection, cameraPosition: eye, lightDirection: lightDirection)

        let instances = SceneSystem.buildInstances(world, alpha: alpha)
        let position = world.get(Transform.self, player)?.position ?? .zero

        return FrameRenderData(
            frame: frame,
            instances: instances,
            focus: position,
            hud: HUDSystem.build(
                stats: stats, aspect: max(aspect, 0.01),
                reticle: reticle(viewProjection: viewProjection, alpha: alpha),
                flight: flightDebug())
        )
    }

    /// Where the nose points and where the ship is actually going, on screen.
    private func reticle(viewProjection: Mat4, alpha: Float) -> Reticle {
        guard let current = world.get(Transform.self, player),
            let v = world.get(Velocity.self, player)
        else { return Reticle() }
        let ship = current.interpolated(from: world.get(PreviousTransform.self, player), alpha: alpha)
        let range: Float = 80
        let nose = Math.project(ship.position + ship.forward * range, viewProjection)
        let speed = simd_length(v.linear)
        let path = speed > 1
            ? Math.project(ship.position + v.linear / speed * range, viewProjection) : nil
        return Reticle(nose: nose, path: path)
    }
```

`frame` now takes `realDt` and does three presentation things before it
renders: the flash counts down, the camera rig advances, and the field of
view comes from the rig. `Math.project` and `Reticle` are the next two
sections; `frame` won't compile until they exist.

**`Sources/SpaceFighter/GameView.swift`**, in `draw`:

```diff
-        let data = game.frame(aspect: aspect)
+        let data = game.frame(aspect: aspect, realDt: dt)
```

---

## Projecting to the screen

The renderer has been turning world points into screen points since the first
guide's chapter 04 — that's what the view-projection matrix *is* — but only on
the GPU. The HUD needs to do it on the CPU, for one point at a time.

**`Sources/SpaceFighter/Core/Math.swift`**, in `Math` — before `moveToward`:

```diff
+    /// Where a world point lands on screen, in normalised device coordinates
+    /// (-1…1 on both axes), or nil if it's behind the camera.
+    static func project(_ point: Vec3, _ viewProjection: Mat4) -> SIMD2<Float>? {
+        let clip = viewProjection * Vec4(point.x, point.y, point.z, 1)
+        guard clip.w > 0 else { return nil }
+        return SIMD2<Float>(clip.x, clip.y) / clip.w
+    }
+
     static func moveToward(_ current: Float, _ target: Float, _ maxDelta: Float) -> Float {
```

Multiply by the matrix, divide by `w`. That's the perspective divide the
vertex shader's `[[position]]` output gets for free, done by hand. The result
is normalised device coordinates — the same −1…1 space the HUD already draws
in — so a projected point can go straight into `appendRect`.

The `w > 0` guard is the part that's easy to leave out and impossible to
ignore once you have. A point behind the camera has negative `w`; divide by it
and the point projects to a perfectly plausible screen position, mirrored,
and your reticle appears in the middle of the screen when the target is
behind you. `nil` is the correct answer to "where is this on screen" for
something that isn't.

---

## The nose and the path

The first guide drew a cross in the centre of the screen and called it a
reticle. It wasn't one — it was the centre of the screen. With the camera now
lagging and leading, the centre of the screen and the direction the nose
points are different places, and with chapter 04's velocity lag, the
direction the nose points and the direction the ship is *going* are different
again. A real aircraft HUD shows both: a boresight for the nose and a *flight
path marker* for the velocity vector. So will this one.

**`Sources/SpaceFighter/Systems/HUDSystem.swift`** — before `HUDSystem`:

```swift
/// Presentation. Screen positions (NDC) of where the nose points and where
/// the ship is actually travelling; nil when off screen or behind.
struct Reticle {
    var nose: SIMD2<Float>?
    var path: SIMD2<Float>?
}
```

**`HUDSystem.swift`**, in `build` — take a reticle, and replace the fixed
cross:

```diff
-    static func build(stats: GameStats, aspect: Float, flight: FlightDebug? = nil) -> [HUDVertex] {
+    static func build(
+        stats: GameStats, aspect: Float, reticle: Reticle = Reticle(), flight: FlightDebug? = nil
+    ) -> [HUDVertex] {
         var v: [HUDVertex] = []
```

```diff
         let cyan = Vec4(0.4, 1.0, 0.9, 0.9)
-        appendRect(&v, cx: 0, cy: 0, hw: 0.035 / aspect, hh: 0.004, color: cyan)
-        appendRect(&v, cx: 0, cy: 0, hw: 0.004 / aspect, hh: 0.035, color: cyan)
+        if let nose = reticle.nose {
+            appendRect(&v, cx: nose.x, cy: nose.y, hw: 0.035 / aspect, hh: 0.004, color: cyan)
+            appendRect(&v, cx: nose.x, cy: nose.y, hw: 0.004 / aspect, hh: 0.035, color: cyan)
+        }
+        if let path = reticle.path {
+            let amber = Vec4(1.0, 0.8, 0.3, 0.9)
+            appendRect(&v, cx: path.x, cy: path.y - 0.018, hw: 0.018 / aspect, hh: 0.003, color: amber)
+            appendRect(&v, cx: path.x, cy: path.y + 0.018, hw: 0.018 / aspect, hh: 0.003, color: amber)
+            appendRect(&v, cx: path.x - 0.018 / aspect, cy: path.y, hw: 0.003 / aspect, hh: 0.018, color: amber)
+            appendRect(&v, cx: path.x + 0.018 / aspect, cy: path.y, hw: 0.003 / aspect, hh: 0.018, color: amber)
+        }
+        appendRect(&v, cx: 0, cy: 0, hw: 0.006 / aspect, hh: 0.006, color: Vec4(1, 1, 1, 0.5))
```

The cyan cross now sits at the projection of a point eighty units ahead of
the nose — that's `reticle(viewProjection:alpha:)` in `Game`, above. The
amber square sits eighty units along the *velocity*. And a small white dot
marks the centre of the screen, so you can see both of them move relative to
something that doesn't.

Fly and watch. Straight and level, the cross and the square coincide. Pull
hard: the cross leaps up toward where the nose is going, the square lags
behind it — that gap is `linearResponse`, made visible — and both drift up
from the centre dot as the camera leads the turn. Ease off and the square
catches the cross. This is the overlay from chapter 04 for people who don't
want bars: everything about the flight model's feel is in the distance
between two markers.

Eighty units of range is the first guide's bolt speed times a bit over half a
second. It's where a shot will be when it matters, which is what a gunsight
should show.

---

## The tests

**`Tests/SpaceFighterTests/Ch05CameraTests.swift`** — new file:

```swift
import Testing
import simd

@testable import SpaceFighter

private let frameDt: Float = 1.0 / 60.0

@Test func rigCatchesUpWithTheShip() {
    let game = Game(seed: 1)
    let rolled = Quat(angle: .pi / 2, axis: Vec3(0, 0, 1))
    game.world.store(Transform.self).mutate(game.player) { $0.rotation = rolled }
    for _ in 0..<30 { _ = game.frame(aspect: 1.6, realDt: frameDt) }  // half a second
    let rig = game.world.get(CameraRig.self, game.player)!
    let error = simd_angle(simd_normalize(rig.rotation.inverse * rolled))
    #expect(error < 0.1, "5 % of a quarter turn is 0.08 rad")
    #expect(error > 0.01, "but it has not snapped there")
}
```

Roll the ship a quarter turn instantly, run half a second of frames, and the
rig should be *nearly* there and *not entirely* there — both halves of the
word "lag". `simd_angle` of the rotation between them is the size of the
remaining error.

**`Ch05CameraTests.swift`** — after `rigCatchesUpWithTheShip`:

```swift
@Test func projectMapsTheAxisToTheCentreAndBehindToNil() {
    let view = Math.lookAt(eye: .zero, center: Vec3(0, 0, -1), up: Vec3(0, 1, 0))
    let projection = Math.perspective(fovyRadians: Float(65).radians, aspect: 1.6, near: 0.1, far: 100)
    let vp = projection * view
    let ahead = Math.project(Vec3(0, 0, -10), vp)
    #expect(ahead != nil)
    #expect(abs(ahead!.x) < 1e-5 && abs(ahead!.y) < 1e-5)
    #expect(Math.project(Vec3(0, 0, 10), vp) == nil)
    let up = Math.project(Vec3(0, 2, -10), vp)!
    #expect(up.y > 0 && abs(up.x) < 1e-5)
}

@Test func shakeDiesAway() {
    let game = Game(seed: 1)
    game.stats.pendingShake = 1
    _ = game.frame(aspect: 1.6, realDt: frameDt)
    #expect(game.world.get(CameraRig.self, game.player)!.shake > 0.9)
    for _ in 0..<60 { _ = game.frame(aspect: 1.6, realDt: frameDt) }
    #expect(game.world.get(CameraRig.self, game.player)!.shake < 0.01)
    #expect(game.stats.pendingShake == 0, "consumed, not left for next frame")
}
```

**`Ch05CameraTests.swift`** — after `shakeDiesAway`:

```swift
@Test func fieldOfViewWidensWithBoost() {
    let game = Game(seed: 1)
    var input = InputFrame()
    input.buttons = [.boost]
    for _ in 0..<240 {  // speed needs 3 s to reach boost from a standing start
        game.advance(realDt: frameDt, input: input)
        _ = game.frame(aspect: 1.6, realDt: frameDt)
    }
    let rig = game.world.get(CameraRig.self, game.player)!
    #expect(rig.fov > CameraRig.baseFov + 10)
}

@Test func hitFlashIsPresentationNow() {
    let game = Game(seed: 1)
    game.stats.hitFlash = 0.5
    for _ in 0..<10 { game.step(input: InputFrame(), dt: SimulationClock.step) }
    #expect(game.stats.hitFlash == 0.5, "stepping the simulation does not touch it")
    for _ in 0..<60 { _ = game.frame(aspect: 1.6, realDt: frameDt) }
    #expect(game.stats.hitFlash == 0)
}
```

The FOV test is the first that runs `advance` and `frame` together, the way
`RenderCoordinator` does, because the field of view depends on both: the
simulation has to get the ship up to speed and the presentation has to notice.
The last test pins the flash to the presentation side, so a future refactor
that moves it back fails loudly.

---

## Checkpoint

```console
$ swift test
✔ Test run with 29 tests in 0 suites passed
```

**Twenty-nine tests.** Then fly:

1. **Roll.** Hold `A`. The ship banks *on the spot* — it doesn't slide across
   the screen — and the grid horizon rolls after it, settling half a second
   later. Let go at ninety degrees and both stay there.
2. **Pull.** Hold `S`. The cyan cross jumps up, the amber square follows it,
   and the whole view tilts to look into the climb. Release, and the square
   catches the cross.
3. **Boost.** Hold `Shift`. Over a second the view widens and the stars at
   the edges stream faster. Release; it eases back.
4. **Get hit.** Fly into an enemy. Red flash, and the view judders for a
   third of a second.

**If the ship slides across the screen when rolling**, `eye` is still using
the ship's axes — check that `forward`, `up` and `right` come from
`rig.rotation`. **If the horizon doesn't roll at all**, `horizonBias` is 1
or `follow` is 0. **If the reticle appears in the middle of the screen when
you're pointing away from the camera**, the `w > 0` guard in `project` is
missing. **If the build fails on `frame(aspect:)`**, `GameView` hasn't been
given `realDt`.

---

## Challenge

Add a look-behind: while `Tab` is held (borrow `.scoreboard` — chapter 14
will want it back), the rig's target rotation is the ship's rotated 180°
about its up axis, and the eye ends up ahead of the ship looking back at it.
Everything else — the slerp, the lead, the shake — should keep working
without special cases. Three things make it interesting: which way round the
half-turn goes when you release (the shortest arc is not always the one you
expect, and `simd_slerp` picks it for you); what the reticle should do when
the nose points at the camera; and whether the lead should invert, stay, or
switch off while you're looking back.

---

**Next:** collision that tests what a bolt *did*, not where it ended up. →
[Chapter 06: Collision that keeps its promises](06-collision-that-keeps-its-promises.md)

---

*Back to the [guide map](../README.md) · references in [`resources.md`](../resources.md)*
