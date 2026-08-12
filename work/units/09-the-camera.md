# 09 · The camera 🛠️

> **You'll leave this chapter with:** the placeholder camera replaced by a proper
> chase rig — one that lets you *feel* a bank without spinning the world — and an
> understanding of the two numbers that change the whole game feel.
>
> **Files created:** `Sources/SpaceFighter/Systems/CameraSystem.swift`
> **Files changed:** `Game.swift`

---

## There is no camera

Nothing in the world is a camera. The "camera" is a **view matrix** we hand the
shaders once per frame, and producing it is one function that runs late in the
frame, after the ship has moved.

Chapter 07 left three inline lines doing that job in `Game.update`. They work,
and they're wrong in one specific way that's worth naming before we fix it: they
use world-up, so **your banking is invisible**. Roll hard into a turn and the
horizon stays stubbornly level, which makes the ship feel like a cursor being
dragged rather than an aircraft carving.

**`Sources/SpaceFighter/Systems/CameraSystem.swift`** — new file:

```swift
import simd

/// A chase camera: behind the ship, slightly above, looking a little ahead of it.
enum CameraSystem {
    static let distanceBack: Float = 9
    static let heightAbove: Float = 3
    static let lookAhead: Float = 14
}
```

Three numbers, and they're the rig. Nine units back is close enough that the ship
fills a useful part of the frame but far enough that you can see what's about to
hit you; three units up puts the hull below the centre line so it doesn't cover
the thing you're aiming at.

**`CameraSystem.swift`**, in `CameraSystem` — after the tunables:

```diff
     static let lookAhead: Float = 14
+
+    static func viewMatrix(_ world: World, player: Entity) -> (view: Mat4, eye: Vec3) {
+        guard let t = world.get(Transform.self, player) else {
+            return (Math.identity, .zero)
+        }
+        let eye = t.position - t.forward * distanceBack + t.up * heightAbove
+        let center = t.position + t.forward * lookAhead
+        let camUp = simd_normalize(Vec3(0, 1, 0) * 0.65 + t.up * 0.35)
+        return (Math.lookAt(eye: eye, center: center, up: camUp), eye)
+    }
 }
```

Read the three interesting lines as placements.

**`eye`** starts at the ship, backs off along its own `forward`, and rises along
its own `up`. Using the ship's axes rather than the world's is what keeps the
camera behind you through a loop — at the top of a loop, "behind the ship" and
"below the world" are the same place, and only the ship's frame knows that.

**`center`** looks at a point *ahead* of the ship rather than at the ship. Aiming
past it pushes the hull into the lower-middle of the frame and fills the screen
with where you're going. You fly toward the reticle, not toward the tail you're
chasing.

**`camUp`** is the fix for the invisible bank, and it deserves its own section.

---

## Banking without nausea

What should "up" be for the camera? There are two obvious answers and both are
wrong.

**World up, `(0,1,0)`** — rock steady, and what chapter 07 used. The camera
completely ignores the ship's roll, so a hard bank produces no visual change at
all. The roll is real, the flight model is doing it, and the player cannot see
it.

**Ship up, `t.up`** — glued to the cockpit. Now every roll spins the entire world
around the viewer. Immersive for about two seconds and then genuinely
unpleasant; this is the setting that makes people put the controller down.

So we blend, weighted toward the world:

```
camUp = normalize( worldUp * 0.65  +  shipUp * 0.35 )
```

Sixty-five percent world-up keeps the horizon broadly level and readable.
Thirty-five percent ship-up tilts the frame enough that a bank is unmistakable.
The ratio is the dial, and it's one of maybe three numbers in this project that
change how the game *feels* rather than what it does.

`Math.lookAt` then re-orthogonalises whatever we hand it — that's the property
chapter 03 built in, and it's why we can pass a blended, non-perpendicular vector
here without doing any correction ourselves.

## Update `Game.swift`

**`Game.swift`**, in `update` — replace chapter 07's inline camera with the
system:

```diff
-        // Chapter 09 replaces this block with a proper CameraSystem.
         let t = world.get(Transform.self, player) ?? Transform()
-        let eye = t.position - t.forward * 9 + t.up * 3
-        let view = Math.lookAt(eye: eye, center: t.position + t.forward * 14, up: Vec3(0, 1, 0))
+        let (view, eye) = CameraSystem.viewMatrix(world, player: player)
         let projection = Math.perspective(fovyRadians: fieldOfView.radians,
```

Delete the "chapter 09 replaces this" comment along with it — it has now come
true, and a stale forward-reference is worse than no comment.

The `let t` line stays — `update` still needs the transform for
`playerPosition` in the returned frame data.

---

## Field of view, and the depth range

The other half of the camera is the projection, already in `Game.update` since
chapter 07:

```swift
Math.perspective(fovyRadians: fieldOfView.radians, aspect: max(aspect, 0.01),
                 near: 0.1, far: 1200)
```

**FOV 65°** is a comfortable middle. Widen it toward 85° and the sense of speed
jumps as the periphery streaks past — which is why a cheap and very effective
boost effect is to lerp the FOV up while `Shift` is held, rather than actually
changing speed much. Narrow it and everything feels zoomed and sluggish.

**`aspect`** comes live from the drawable every frame, so resizing the window
never stretches the image.

**near/far = 0.1 / 1200** is the depth range, and the ratio between them matters
more than either value. Depth precision is distributed non-linearly and is
dominated by the *near* plane: pushing `near` down to 0.001 to avoid clipping
something close will wreck precision across the entire rest of the scene and
produce z-fighting on distant surfaces. If you need to see closer, move the
camera, don't move the near plane. 1200 comfortably contains chapter 05's star
cube and grid without stretching precision thin.

---

## Checkpoint

```console
$ swift run
```

Fly, and compare against the last chapter:

1. **Yaw left.** The horizon now **tilts** with your bank instead of staying
   rigidly level.
2. **Roll a full 360°.** The world tips but never fully inverts — the world-up
   term keeps pulling the horizon back toward level.
3. **Pull into a loop.** The camera stays behind the ship all the way over the
   top, because `eye` is built from the ship's own axes.

Then break it deliberately, because this is the fastest way to understand the
line. Set the blend to `Vec3(0,1,0) * 1.0 + t.up * 0.0` and fly: banks go
invisible, exactly like chapter 07. Now try `* 0.0 + t.up * 1.0`: the entire
world spins with every roll and you'll want to stop within seconds. Restore
0.65/0.35. You will never again wonder what that line is for.

---

## Where you'd add smoothing

Our camera is rigidly locked — `eye` is recomputed exactly each frame with no
history. That's crisp and predictable, which suits fast arcade play.

A cinematic camera would **lag** slightly, easing toward the target:

```
smoothedEye += (targetEye - smoothedEye) * (1 - exp(-k * dt))
```

giving a spring-like trail that softens sharp manoeuvres. We leave it rigid on
purpose — lag trades responsiveness for smoothness and this game wants
responsiveness — but the hook is obvious: hold state in `CameraSystem` and smooth
`eye` before building the matrix.

Note the form. The naive version, `lerp(current, target, 0.1)` per frame, is
frame-rate *dependent*: it smooths twice as fast at 120 Hz as at 60. The
`1 - exp(-k·dt)` form is the frame-rate-independent equivalent, and it's the
right habit for any exponential easing — camera, audio fades, difficulty ramps.

---

## Why the camera is a plain function

`CameraSystem.viewMatrix` takes a world and an entity and returns data. It holds
no state, owns nothing, and could be pointed at *any* entity by passing a
different id. Want a spectate-the-enemy mode, or a kill-cam that watches the
thing that just destroyed you? Same function, different argument.

That uniformity — camera, flight, collision, rendering, all plain functions over
components — is the ECS paying off for the fourth time.

---

## Challenge

Add a boost FOV kick. While `Player.boosting` is true, ease the field of view
from 65° toward about 80°, and ease it back when boost releases. Three things to
work out: `fieldOfView` is currently a `let` on `Game`, so it needs to become
state that persists across frames; the easing must be frame-rate independent (see
the `exp` form above, or `Math.moveToward` from chapter 03); and decide where
this belongs — is it the camera's business or the player's? Both defensible, and
the argument is the interesting part.

---

**Next:** something to shoot at. →
[Chapter 10: Gameplay systems](10-gameplay-systems.md)
