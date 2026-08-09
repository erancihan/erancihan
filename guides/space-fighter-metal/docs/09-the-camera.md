# 09 · The camera 🛠️

> **You'll leave this chapter with:** the placeholder camera replaced by a proper
> chase rig — one that lets you *feel* a bank without spinning the world — and an
> understanding of the tuning knobs that change the whole game feel.
>
> **Files created:** `Sources/SpaceFighter/Systems/CameraSystem.swift`
> **Files changed:** `Game.swift`

---

## A camera is just a view matrix

There's no camera object in the world. The "camera" is the **view matrix** we
feed the shaders (chapter 03), and producing it is one function that runs late in
the frame, after the ship has moved.

Right now that logic is three inline lines in `Game.update`. It works, but it
uses world-up for the camera's up vector, which means **your banks are
invisible** — roll hard into a turn and the horizon stays stubbornly level. Let's
extract it and fix that.

---

## Create `Sources/SpaceFighter/Systems/CameraSystem.swift`

```swift
import simd

/// A chase camera that sits behind and slightly above the ship and looks a bit
/// ahead of it. The "up" is mostly world-up with a touch of the ship's own up
/// mixed in, so hard banks read on screen without making the whole world spin
/// (and without turning anyone's stomach).
enum CameraSystem {
    static let distanceBack: Float = 9
    static let heightAbove: Float = 3
    static let lookAhead: Float = 14

    static func viewMatrix(_ world: World, player: Entity) -> (view: Mat4, eye: Vec3) {
        guard let t = world.get(Transform.self, player) else {
            return (Math.identity, .zero)
        }
        let eye = t.position - t.forward * distanceBack + t.up * heightAbove
        let center = t.position + t.forward * lookAhead
        let camUp = simd_normalize(Vec3(0, 1, 0) * 0.65 + t.up * 0.35)
        return (Math.lookAt(eye: eye, center: center, up: camUp), eye)
    }
}
```

Read each line as a placement:

- **`eye`** — start at the ship, back off along its `forward` (so we're *behind*
  it), and rise along its `up`. That's the over-the-shoulder seat. Note it uses
  the ship's own axes, so the camera follows through rolls and loops.
- **`center`** — look at a point *ahead* of the ship, not at the ship itself.
  Aiming past it puts the ship in the lower-middle of frame and shows you where
  you're going — you fly toward the reticle, not toward the tail you're chasing.
- **`camUp`** — the interesting one.

## The up-vector blend: banking without nausea

What should "up" be for the camera? Two tempting answers, both flawed:

- **World up `(0,1,0)`** — rock steady, but the camera ignores the ship's roll
  entirely. This is what you have right now: bank hard and the screen doesn't
  react, so the roll is invisible and the flight feels detached.
- **Ship up `t.up`** — fully glued to the cockpit, so every roll spins the whole
  world around you. Immersive for two seconds, then motion sickness.

We blend, weighted toward the world:

```swift
let camUp = simd_normalize(Vec3(0, 1, 0) * 0.65 + t.up * 0.35)
```

65% world-up keeps the horizon mostly level and legible; 35% ship-up lets a bank
*tilt* the view enough that you feel the turn. That single ratio is a real
game-feel dial — nudge it toward `t.up` for a wilder, cockpit-like ride, or
toward world-up for a calmer, more readable one.

## Update `Game.swift`

Replace the three inline camera lines in `update` — the ones computing `eye` and
`view` — with a call to the new system:

```swift
        // was: let eye = t.position - t.forward * 9 + t.up * 3
        //      let view = Math.lookAt(eye: eye, center: ..., up: Vec3(0, 1, 0))
        let (view, eye) = CameraSystem.viewMatrix(world, player: player)
```

Everything else in `update` stays as it is. The `let t = ...` line above it is
still needed for `playerPosition` in the returned `FrameRenderData`.

---

## Field of view and the projection

The other half of the camera is the projection, already in `Game.update`:

```swift
Math.perspective(fovyRadians: fieldOfView.radians, aspect: max(aspect, 0.01),
                 near: 0.1, far: 1200)
```

- **FOV 65°** is a comfortable middle. Widen it (85°+) and the sense of speed
  jumps as the periphery streaks past — a cheap, effective boost effect is to
  lerp FOV up while `Shift` is held. Narrow it and everything feels zoomed and
  slower.
- **`aspect`** comes live from the drawable each frame, so resizing the window
  never stretches the image (chapter 03).
- **near/far = 0.1 / 1200** is the depth range. Too wide a range wastes depth
  precision and makes distant surfaces flicker (z-fighting); 1200 comfortably
  contains the star cube and grid without stretching precision thin.

---

## Checkpoint

```console
$ swift run
```

Fly, and compare against the last chapter:

1. **Yaw left.** The horizon now **tilts** with your bank instead of staying
   rigidly level. That's the 65/35 blend.
2. **Roll a full 360°.** The world tips but never fully inverts — the world-up
   term keeps pulling the horizon back toward level.
3. **Pull into a loop.** The camera stays behind the ship all the way over the
   top, because `eye` is built from the ship's own `forward` and `up`.

Now go break it on purpose, because this is the fastest way to understand the
line: set the blend to `Vec3(0,1,0) * 1.0 + t.up * 0.0` and fly — banks become
invisible again. Then try `* 0.0 + t.up * 1.0` — the entire world spins with
every roll. Put it back to 0.65/0.35 and you'll never wonder what that line does.

---

## Where you'd add smoothing

Our camera is rigidly locked to the ship — `eye` is recomputed exactly each
frame. It's crisp and predictable, which suits fast arcade play. A cinematic
camera would **lag** slightly: store the previous eye position and ease it toward
the target each frame,

```
smoothedEye += (targetEye - smoothedEye) * (1 - exp(-k * dt))
```

giving a spring-like trail that softens sharp maneuvers. We leave it rigid on
purpose — lag trades responsiveness for smoothness, and this game wants
responsiveness — but the hook is obvious: smooth `eye` (and/or `center`) inside
`CameraSystem` before building the matrix. The `exp(-k·dt)` form keeps the
smoothing frame-rate independent, unlike a raw `lerp(a, b, 0.1)` per frame.

---

## Why the camera reads the world like everything else

`CameraSystem` is just another function over the `World` — it queries the
player's `Transform` and returns data. It holds no state, owns nothing, and could
be pointed at *any* entity by passing a different id. Want a "spectate the enemy"
mode or a kill-cam? Feed a different entity to the same function. That uniformity
— camera, flight, collision, all plain functions over components — is the ECS
paying off again.

---

**Next:** something to shoot at. → [Chapter 10: Gameplay systems](10-gameplay-systems.md)
