# 09 · The game loop & timing 🛠️

> **You'll leave this chapter with:** an understanding of what drives a frame, why
> we multiply everything by *delta time*, the fixed-vs-variable timestep trade-off,
> and why the **order** of systems in `Game::update` *is* the game logic. The
> timing ideas are identical to the [Metal guide](../../space-fighter-metal/docs/07-the-game-loop.md);
> the loop itself is now *ours* to write, because Vulkan/GLFW has no `MTKView`
> calling us back.

---

## The heartbeat

Metal handed us a heartbeat: `MTKView` called `draw(in:)` when the display was
ready. GLFW gives us no callback — we write the loop ourselves, in `main.cpp`, and
it's refreshingly plain:

```cpp
double lastTime = glfwGetTime();
while (!glfwWindowShouldClose(window)) {
    glfwPollEvents();                                 // pump input + window events
    if (glfwGetKey(window, GLFW_KEY_ESCAPE) == GLFW_PRESS)
        glfwSetWindowShouldClose(window, GLFW_TRUE);  // Esc quits — ch 01's promise

    double now = glfwGetTime();
    float dt = float(now - lastTime);                 // real seconds since last frame
    lastTime = now;

    int w, h; glfwGetFramebufferSize(window, &w, &h);
    float aspect = float(w) / float(std::max(h, 1));

    FrameData data = game.update(dt, input.state(), aspect);   // simulate
    renderer.drawFrame(data);                                   // draw (chapter 05)
}
vkDeviceWaitIdle(device);                             // let the GPU finish before teardown
```

Simulate, then draw — chapter 01's picture, in code. Two Vulkan-flavoured details:

- **`glfwPollEvents`** is what makes the keyboard and the window's resize/close
  buttons work; forget it and the window hangs. It's the GLFW equivalent of the
  event pump AppKit ran for us.
- **`vkDeviceWaitIdle` after the loop** is mandatory: the GPU may still be working
  on the last frame when the user closes the window, and destroying buffers it's
  mid-read on is a crash. We block until it's idle, *then* tear down.

### What paces us

Nothing in that loop sleeps — so what stops it spinning at 5000 fps? The
**swapchain's present mode** (chapter 05). We chose `FIFO`, which is vsync: when
both frames-in-flight are in the queue, `vkAcquireNextImageKHR` blocks until the
display frees an image. So the display's refresh rate throttles the loop, exactly
as MetalKit's display link did — we just chose it explicitly. Switch to
`IMMEDIATE` and the loop runs unbounded (and tears); that's the knob.

---

## Delta time: the one habit that makes motion correct

Displays don't tick at a fixed rate. A 60 Hz panel gives ~16.7 ms per frame; a
144 Hz monitor gives ~6.9 ms; drag the window and a frame might take 50 ms. If a
system did `position += velocity` per *frame*, the ship would fly more than twice
as fast on the 144 Hz monitor and stutter when frames hitch. That's a broken game.

The fix is to measure **how much real time actually elapsed** (`dt`) and scale
every rate by it. Velocity is *units per second*, so we advance by `velocity · dt`;
turn rates are *radians per second*, so we rotate by `rate · dt`. Now motion covers
the same ground per second on any display:

```cpp
if (Transform* t = transforms.get(e)) t->position += v->linear * dt;   // MovementSystem
t.rotation = glm::normalize(t.rotation * deltaFrom(rates, dt));        // FlightControlSystem
```

Scan the systems and you'll see `dt` in every one that changes something over time.
Anything that *doesn't* multiply by `dt` (a cooldown counted down per frame, say)
is a latent frame-rate-dependent bug. Ours count down in seconds:
`weapon.cooldown -= dt`.

`glfwGetTime()` is the right clock here — a monotonic seconds counter that starts
at GLFW init and, unlike wall-clock time, never jumps backward when the system
clock is adjusted. (It's the GLFW analogue of Metal's `CACurrentMediaTime()`.)

---

## Clamping the step

One guard rail. If a frame takes a *long* time — you dragged the window, hit a
breakpoint, the app was backgrounded — a huge `dt` would teleport everything:
bolts tunnel through enemies, the ship lurches across the map. So we cap it inside
`Game::update`:

```cpp
dt = std::min(std::max(dt, 0.0f), 1.0f / 30.0f);   // never step more than 1/30 s
```

The game briefly runs in slow motion during a hitch instead of exploding. That's
almost always the right trade for an arcade game — and it matters a touch more in
Vulkan, where a `recreateSwapchain` on resize (chapter 05) can produce exactly the
kind of long frame this clamp absorbs.

---

## Variable vs fixed timestep

We use a **variable timestep**: step the simulation by whatever real `dt` just
elapsed. It's simple, it's in sync with rendering, and for an arcade shooter it's
perfect.

The alternative, a **fixed timestep**, runs the simulation in constant-size chunks
(say exactly 1/60 s), accumulating real time and stepping however many whole chunks
have banked, with rendering interpolating between them:

```
accumulator += dt
while (accumulator >= STEP) { simulate(STEP); accumulator -= STEP; }
render(interpolated by accumulator / STEP)
```

You reach for fixed steps when the simulation *must* be deterministic and stable:

- **Physics.** Springs, stacked rigid bodies and joints can go unstable if the step
  size wobbles; a constant step keeps them well-behaved.
- **Lockstep multiplayer.** Every client must compute bit-identical results from
  identical inputs, which demands identical step sizes.
- **Replays.** Same inputs + same steps ⇒ same game, every time.

None of those apply to us yet, so we keep the simpler model. Chapter 14 flags the
switch as a prerequisite the moment you add real physics or netcode.

---

## The schedule *is* the game

Here's the part worth slowing down for. `Game::update` runs the systems in a fixed
order, and that order encodes the rules:

```cpp
FlightControlSystem::update(world, player, input, dt);   // 1 aim the ship
WeaponSystem::update(world, player, input, dt);          // 2 maybe fire
EnemySystem::update(world, player, director, dt);        // 3 spawn + steer
MovementSystem::update(world, dt);                       // 4 integrate all velocities
SpinSystem::update(world, dt);                           // 5 tumble enemies
LifetimeSystem::update(world, dt);                       // 6 expire bolts
CollisionSystem::update(world, player, stats);           // 7 resolve hits
world.flushDestroyed();                                  // 8 delete the dead
```

Read it as a sentence: *point the ship, fire if asked, spawn and steer enemies,
move everything, spin the tumblers, age out old bolts, resolve collisions, then
delete whatever died.* Reorder those lines and behaviour changes:

- Movement runs **after** flight control and weapon fire, so a bolt spawns at the
  ship's current position and *then* moves — spawn it after movement and it'd lag a
  frame behind the nose.
- Collision runs **after** movement, so it tests the positions things actually
  reached this frame, not last frame's.
- `flushDestroyed` runs **last and once**, so every system saw a consistent world
  all frame and deletion happens at a single safe point (chapter 04) — which in
  C++, remember, also keeps our sparse-set vectors from being mutated mid-iteration.

This is a big reason the ECS pays off: the entire control flow of the game is eight
lines you can read in one glance, each an isolated, testable function. There's no
behaviour hidden inside an object graph — it's all right here, in order. And it's
identical to the Metal guide's schedule, because the simulation doesn't know Vulkan
exists; `Game::update` returns plain `FrameData`, and the renderer takes it from
there.

### A note on "one update, one draw"

Because simulation and rendering share one loop iteration, our simulation rate
equals our frame rate. That's fine here. If you later need the simulation to run at
a rate independent of rendering (fixed-step physics under a variable-step
renderer), you'd split them using the accumulator pattern above — the schedule
becomes "the thing the fixed step runs," and `drawFrame` interpolates between two
recent states.

---

**Next:** the first and most important system in that schedule — flying the ship. →
[Chapter 10: Flight & input](10-flight-and-input.md)
