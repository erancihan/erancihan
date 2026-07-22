# 09 · The camera 🛠️

> **You'll leave this chapter with:** how a chase camera is built from the ship's
> transform, why we blend world-up with ship-up, and the small tuning knobs that
> change the whole game feel — reading
> `CameraSystem`.

---

## A camera is just a view matrix

There's no camera object in the world — the "camera" is the **view matrix** we
feed the shaders (chapter 03). Producing it is one system that runs late in the
frame, after the ship has moved, and returns the matrix plus the eye position:

```swift
static func viewMatrix(_ world: World, player: Entity) -> (view: Mat4, eye: Vec3)
```

`Game.update` multiplies that view by the projection into
`FrameUniforms.viewProjection`, and every vertex shader uses it. Move the camera
= change these inputs.

---

## The chase camera, built from the ship

We want the classic third-person rig: behind the ship, a little above it, looking
slightly ahead of it. All three come straight from the ship's own transform:

```swift
let eye    = t.position - t.forward * distanceBack + t.up * heightAbove
let center = t.position + t.forward * lookAhead
let camUp  = simd_normalize(Vec3(0, 1, 0) * 0.65 + t.up * 0.35)
return (Math.lookAt(eye: eye, center: center, up: camUp), eye)
```

Read each line as a placement:

- **`eye`** — start at the ship, back off along its `forward` (so we're *behind*
  it), and rise along its `up`. That's the "over the shoulder" seat.
- **`center`** — look at a point *ahead* of the ship, not at the ship itself.
  Aiming past it puts the ship in the lower-middle of frame and shows you where
  you're going — you fly toward the reticle, not toward the tail you're chasing.
- **`camUp`** — the interesting one, below.

`Math.lookAt` (chapter 03) turns eye/center/up into the view matrix.

---

## The up-vector blend: banking without nausea

What should "up" be for the camera? Two tempting answers, both flawed:

- **World up `(0,1,0)`** — rock steady, but the camera ignores the ship's roll
  entirely. Bank hard into a turn and the screen doesn't react; the roll is
  invisible and the flight feels detached.
- **Ship up `t.up`** — fully glued to the cockpit, so every roll spins the entire
  world around you. Immersive for two seconds, then motion-sickness.

We blend, weighted toward the world:

```swift
let camUp = simd_normalize(Vec3(0, 1, 0) * 0.65 + t.up * 0.35)
```

65% world-up keeps the horizon mostly level and legible; 35% ship-up lets a bank
*tilt* the view enough that you feel the turn. That single ratio is a real
game-feel dial — nudge it toward `t.up` for a wilder, more cockpit-like ride, or
toward world-up for a calmer, more readable one. Try `0.0`/`1.0` and `1.0`/`0.0`
to feel both failure modes.

---

## Field of view and the projection

The other half of the camera is the projection, built in `Game.update`:

```swift
Math.perspective(fovyRadians: 65.radians, aspect: aspect, near: 0.1, far: 1200)
```

- **FOV 65°** is a comfortable middle. Widen it (85°+) and the sense of speed
  jumps as the periphery streaks past — a cheap, effective boost effect would be
  to lerp FOV up while `Shift` is held. Narrow it and everything feels zoomed and
  slower.
- **`aspect`** comes live from the drawable each frame, so resizing the window
  never stretches the image (chapter 03).
- **near/far = 0.1 / 1200** is the depth range. Too wide a range wastes depth
  precision and causes distant surfaces to flicker (z-fighting); 1200 comfortably
  contains our star cube and grid without stretching precision thin.

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
paying off yet again.

---

**Next:** the systems that make it a *game* — enemies, guns, and collisions. →
[Chapter 10: Gameplay systems](10-gameplay-systems.md)
