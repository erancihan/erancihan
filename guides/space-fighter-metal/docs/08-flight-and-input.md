# 08 · Flight & input 🛠️

> **You'll leave this chapter with:** a clean way to decouple input from
> hardware, and a full understanding of the arcade flight model in
> `FlightControlSystem`
> — how pitch/yaw/roll become a quaternion, and why turns bank on their own.

---

## Input as intent, not keys

The systems that fly the ship should not know that `W` is key code 13. If they
did, adding gamepad support later would mean editing gameplay code. So we put a
translation layer in between. Raw events go into an
`InputController`; it emits an
`InputState` of *intent*:

```swift
struct InputState {
    var pitch: Float = 0      // + nose up,   - nose down
    var yaw: Float = 0        // + nose left, - nose right
    var roll: Float = 0       // + roll left, - roll right
    var throttle: Float = 0   // wired through, unused — chapter 12's first exercise
    var firing = false
    var boosting = false
}
```

Those are **normalised axes** in [−1, 1], not booleans about keys. A keyboard
produces −1 / 0 / +1; a gamepad stick would produce the smooth values in between,
and *nothing downstream changes*. The `InputController` just folds held keys into
axes:

```swift
if held(Key.a, Key.arrowLeft) { s.yaw += 1 }     // rebuild()
if held(Key.d, Key.arrowRight) { s.yaw -= 1 }
```

We read the physical keyboard with a single `NSEvent.addLocalMonitorForEvents`
in `main.swift`, using **key codes** (positional) rather than characters, so WASD
stays put on non-QWERTY layouts. Swapping in Apple's `GameController` framework
means writing a different producer for the same `InputState` — the seam is the
struct.

---

## What "arcade flight model" means

We are not simulating aerodynamics. There's no lift, no stall, no angle of
attack. The rule is simply: **the ship always flies where its nose points, and
your input turns the nose.** This is the Star Fox / Ace Combat *arcade* feel —
responsive and forgiving — and it's a handful of lines.

Two outputs each frame: an updated **orientation** (a quaternion) and a
**velocity** (down the nose).

---

## Turning input into orientation

This is chapter 03's local-space rotation, made concrete. Each frame we build a
small **delta** rotation from the input axes and the turn rates, and apply it in
the ship's own frame:

```swift
let pitch = input.pitch * pitchRate            // rates are radians/second
let yaw   = input.yaw   * yawRate
let roll  = input.roll  * rollRate + input.yaw * autoBank   // ← note the auto-bank

transforms.mutate(player) { t in
    let delta =
        Quat(angle: pitch * dt, axis: Vec3(1, 0, 0)) *   // pitch about local X (wings)
        Quat(angle: yaw   * dt, axis: Vec3(0, 1, 0)) *   // yaw   about local Y (up)
        Quat(angle: roll  * dt, axis: Vec3(0, 0, 1))     // roll  about local Z (nose)
    t.rotation = simd_normalize(t.rotation * delta)      // apply on the RIGHT = local
}
```

Three things to notice:

- **Rates × dt.** `pitchRate` is 1.7 rad/s; multiplying by `dt` makes the turn
  frame-rate independent (chapter 07).
- **Right-multiply.** `t.rotation * delta` composes the new tumble *in the ship's
  current frame*, so after you roll, "pitch" curls you through the roll — the
  thing that makes it feel like flying.
- **Renormalise.** Many multiplications drift the quaternion off unit length;
  `simd_normalize` pulls it back so the ship never skews.

### The auto-bank that sells it

Look again at `roll = input.roll * rollRate + input.yaw * autoBank`. Even if you
never press a roll key, **yawing adds roll**. Turn left and the ship banks into
the turn, like a real aircraft leaning through a curve. It's a single term, and
it's most of why the flight reads as "a plane" rather than "a cursor." Set
`autoBank` to 0 to feel the difference — the turns go flat and lifeless
immediately.

---

## Turning orientation into velocity

Once the nose points somewhere, flying is trivial — go that way:

```swift
guard let t = transforms.get(player), let pl = players.get(player) else { return }
let speed = cruiseSpeed * (pl.boosting ? boostMultiplier : 1)
velocities.set(player, Velocity(linear: t.forward * speed))
```

`t.forward` is `rotation.act(Vec3(0,0,-1))` — the ship's local −Z (our forward)
rotated into world space (chapter 03). Multiply by speed and that's the velocity
the `MovementSystem` will integrate one step later in the schedule. Boost is just
a bigger multiplier while `Shift` is held.

We keep a constant cruise speed and a boost, which suits the "always pressing
forward" arcade feel. `Player.throttle` and `InputState.throttle` are wired
through but unused — a deliberate hook. Making Shift/Ctrl ease `throttle` between
a min and max speed, and using it in place of the constant, is a five-minute
extension and a good first change to make.

---

## The control mapping, and a deliberate choice

The full map lives in `InputController.rebuild()`:

| Intent | Keys | Sign |
|---|---|---|
| Pitch down (dive) | `W` / `↑` | `pitch -= 1` |
| Pitch up (climb) | `S` / `↓` | `pitch += 1` |
| Yaw left | `A` / `←` | `yaw += 1` |
| Yaw right | `D` / `→` | `yaw -= 1` |
| Roll | `Q` / `E` | `roll ±= 1` |
| Fire | `Space` | `firing` |
| Boost | `Shift` | `boosting` |

Note pitch: **pushing forward (`W`/`↑`) dives.** That's the flight-sim / Star Fox
convention — stick forward, nose down. Some players expect the inverse ("up means
up"). Because input is one clean layer, offering an "invert pitch" option is a
one-line flip of a sign in `rebuild()`, not a hunt through gameplay code. That
flexibility is the whole reason the input abstraction earns its keep.

---

## Why this lives in a system, not the ship

There is no `Ship` class with a `fly()` method. Flight is a *system* that reads
input plus the player's components and writes back orientation and velocity. The
upshot: give *any* entity a `Player` component and this system flies it; take it
away and the entity coasts on whatever velocity it has. Behaviour is attached,
not inherited — chapter 04's promise, cashed out.

---

**Next:** now that the ship moves, we need a camera that follows it well. →
[Chapter 09: The camera](09-the-camera.md)
