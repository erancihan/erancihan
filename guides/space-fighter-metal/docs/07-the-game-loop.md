# 07 · The game loop & timing 🛠️

> **You'll leave this chapter with:** an understanding of what drives a frame,
> why we multiply everything by *delta time*, the fixed-vs-variable timestep
> trade-off, and why the **order** of systems in
> [`Game.update`](../src/Sources/SpaceFighter/Game.swift) *is* the game logic.

---

## The heartbeat

We don't write a `while true` loop. MetalKit runs one for us: an `MTKView`, told
its `preferredFramesPerSecond`, calls its delegate's `draw(in:)` each time the
display is ready for a new frame. That callback is our entire per-frame tick:

```swift
// RenderCoordinator.draw(in:) — GameView.swift
func draw(in view: MTKView) {
    let now = CACurrentMediaTime()
    let dt = Float(now - lastTime)       // real seconds since the last frame
    lastTime = now

    let aspect = Float(view.drawableSize.width / max(view.drawableSize.height, 1))
    let data = game.update(dt: dt, input: input.state, aspect: aspect)   // simulate
    renderer.render(in: view, frame: data.frame, instances: data.instances,
                    playerPosition: data.playerPosition, hud: data.hud)  // draw
}
```

Simulate, then draw — chapter 01's picture, in code. Letting MetalKit pace us
means the loop is synced to the display's refresh (vsync), so we never render
frames no one will see, and the OS can throttle us cleanly when the window's in
the background.

---

## Delta time: the one habit that makes motion correct

Displays don't tick at a fixed rate. A 60 Hz panel gives ~16.7 ms per frame; a
120 Hz ProMotion display gives ~8.3 ms; drag the window and a frame might take
50 ms. If a system did `position += velocity` per *frame*, the ship would fly
twice as fast on the 120 Hz Mac and stutter when frames hitch. That's a broken
game.

The fix is to measure **how much real time actually elapsed** (`dt`) and scale
every rate by it. Velocity is *units per second*, so we advance by `velocity ·
dt`; turn rates are *radians per second*, so we rotate by `rate · dt`. Now motion
covers the same ground per second on any display:

```swift
transforms.mutate(entity) { $0.position += v.linear * dt }   // MovementSystem
t.rotation = simd_normalize(t.rotation * deltaFrom(rates, dt)) // FlightControlSystem
```

Scan the systems and you'll see `dt` in every one that changes something over
time. Anything that *doesn't* multiply by `dt` (a cooldown counted down per
frame, say) is a latent frame-rate-dependent bug. Ours count down in seconds:
`weapon.cooldown -= dt`.

`CACurrentMediaTime()` (from QuartzCore) is the right clock here — a monotonic
seconds counter that, unlike wall-clock time, never jumps backward when the
system clock is adjusted.

---

## Clamping the step

One guard rail. If a frame takes a *long* time — you dragged the window, hit a
breakpoint, the app was backgrounded — a huge `dt` would teleport everything:
bullets tunnel through enemies, the ship lurches across the map. So we cap it:

```swift
let dt = min(max(rawDt, 0), 1.0 / 30.0)   // Game.update — never step more than 1/30 s
```

The game briefly runs in slow motion during a hitch instead of exploding. That's
almost always the right trade for an arcade game.

---

## Variable vs fixed timestep

We use a **variable timestep**: step the simulation by whatever real `dt` just
elapsed. It's simple, it's in sync with rendering, and for an arcade shooter it's
perfect.

The alternative, a **fixed timestep**, runs the simulation in constant-size
chunks (say exactly 1/60 s), accumulating real time and stepping however many
whole chunks have banked, with rendering interpolating between them:

```
accumulator += dt
while accumulator >= STEP { simulate(STEP); accumulator -= STEP }
render(interpolated by accumulator / STEP)
```

You reach for fixed steps when the simulation *must* be deterministic and stable:

- **Physics.** Springs, stacked rigid bodies and joints can go unstable if the
  step size wobbles; a constant step keeps them well-behaved.
- **Lockstep multiplayer.** Every client must compute bit-identical results from
  identical inputs, which demands identical step sizes.
- **Replays.** Same inputs + same steps ⇒ same game, every time.

None of those apply to us yet, so we keep the simpler model. Chapter 12 flags the
switch as a prerequisite the moment you add real physics or netcode.

---

## The schedule *is* the game

Here's the part worth slowing down for. `Game.update` runs the systems in a fixed
order, and that order encodes the rules:

```swift
FlightControlSystem.update(world, player: player, input: input, dt: dt)  // 1 aim the ship
WeaponSystem.update(world, player: player, input: input, dt: dt)         // 2 maybe fire
EnemySystem.update(world, player: player, director: director, dt: dt)    // 3 spawn + steer
MovementSystem.update(world, dt: dt)                                     // 4 integrate all velocities
SpinSystem.update(world, dt: dt)                                         // 5 tumble enemies
LifetimeSystem.update(world, dt: dt)                                     // 6 expire bolts
CollisionSystem.update(world, player: player, stats: stats)             // 7 resolve hits
world.flushDestroyed()                                                    // 8 delete the dead
```

Read it as a sentence: *point the ship, fire if asked, spawn and steer enemies,
move everything, spin the tumblers, age out old bolts, resolve collisions, then
delete whatever died.* Reorder those lines and behaviour changes:

- Movement runs **after** flight control and weapon fire, so a bolt spawns at the
  ship's current position and *then* moves — spawn it after movement and it'd lag
  a frame behind the nose.
- Collision runs **after** movement, so it tests the positions things actually
  reached this frame, not last frame's.
- `flushDestroyed` runs **last and once**, so every system saw a consistent world
  all frame and deletion happens at a single safe point (chapter 04).

This is a big reason the ECS pays off: the entire control flow of the game is
eight lines you can read in one glance, each one an isolated, testable function.
There's no behaviour hidden inside an object graph — it's all right here, in
order.

### A note on "one update, one draw"

Because simulation and rendering share the `draw(in:)` tick, our simulation rate
equals our frame rate. That's fine here. If you later need the simulation to run
at a rate independent of rendering (fixed-step physics under a variable-step
renderer), you'd split them using the accumulator pattern above — the schedule
becomes "the thing the fixed step runs," and rendering interpolates between two
recent states.

---

**Next:** the first and most important system in that schedule — flying the ship.
→ [Chapter 08: Flight & input](08-flight-and-input.md)
