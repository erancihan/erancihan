# 10 · Flight & input 🛠️

> **You'll leave this chapter with:** a ship you fly. A clean layer that turns
> keys into *intent*, and the arcade flight model — how pitch, yaw and roll become
> a quaternion, and why turns bank on their own.
>
> **Files created:** `src/Input.hpp`, `src/systems/FlightControlSystem.hpp`.
> `src/Game.{hpp,cpp}` and `src/main.cpp` grow.

Chapter 09's ship sits at the origin because nothing writes its `Velocity`. Two
files fix that, and the second one is the game feel.

---

## Input as intent, not keys

The system that flies the ship should not know that `W` is `GLFW_KEY_W`. If it
did, adding gamepad support later would mean editing gameplay code — and so would
remapping a single key. So a translation layer sits between: raw GLFW key state
goes in, a struct of *intent* comes out.

**`src/Input.hpp`** — new file:

```cpp
#pragma once

#include <GLFW/glfw3.h>

/// Intent, not keys. Axes are normalised to [-1, 1] so a gamepad stick can
/// replace the keyboard without any gameplay code changing.
struct InputState {
    float pitch = 0.0f;
    float yaw = 0.0f;
    float roll = 0.0f;
    float throttle = 0.0f;
    bool firing = false;
    bool boosting = false;
};
```

Those are **normalised axes**, not booleans about keys. A keyboard produces −1, 0
or +1; a gamepad stick would produce the smooth values in between, and nothing
downstream changes. `throttle` is wired through and deliberately unused — chapter
14 makes it your first extension, and it costs nothing to carry until then.

**`Input.hpp`** — after `InputState`:

```diff
     bool firing = false;
     bool boosting = false;
 };
+
+class Input {
+public:
+    explicit Input(GLFWwindow* w) : window(w) {}
+
+private:
+    GLFWwindow* window;
+};
```

**`Input.hpp`**, in `class Input` — after the constructor:

```diff
     explicit Input(GLFWwindow* w) : window(w) {}
+
+    InputState state() const {
+        InputState s;
+        auto held = [&](int key) { return glfwGetKey(window, key) == GLFW_PRESS; };
+
+        if (held(GLFW_KEY_A) || held(GLFW_KEY_LEFT)) s.yaw += 1.0f;
+        if (held(GLFW_KEY_D) || held(GLFW_KEY_RIGHT)) s.yaw -= 1.0f;
+        if (held(GLFW_KEY_W) || held(GLFW_KEY_UP)) s.pitch -= 1.0f;
+        if (held(GLFW_KEY_S) || held(GLFW_KEY_DOWN)) s.pitch += 1.0f;
+        if (held(GLFW_KEY_Q)) s.roll += 1.0f;
+        if (held(GLFW_KEY_E)) s.roll -= 1.0f;
+
+        s.firing = held(GLFW_KEY_SPACE);
+        s.boosting = held(GLFW_KEY_LEFT_SHIFT);
+        return s;
+    }
 
 private:
```

`+=` rather than `=` is what makes opposite keys cancel: hold `A` and `D` together
and yaw is zero, not whichever key the last `if` happened to check.

GLFW's `GLFW_KEY_*` tokens name a key's **physical position on a US layout**, not
the character it types — so WASD stays under your fingers on AZERTY or Dvorak.
And note the pitch signs: **pushing forward (`W`) dives.** That is the flight-sim
convention — stick forward, nose down. Some players expect the inverse, and
because input is one clean layer, offering an "invert pitch" option later is one
sign flip in this function, not a hunt through gameplay code.

> **Polling vs callbacks.** GLFW also offers a key *callback*
> (`glfwSetKeyCallback`) that fires on press and release edges. Polling with
> `glfwGetKey` each frame is the right fit for continuous controls — "is this key
> held *this frame*?" — while callbacks suit discrete one-shot actions like a
> pause toggle, where polling could miss a tap that fell between frames.
> `glfwPollEvents` in the main loop is what refreshes both.

---

## What "arcade flight model" means

We are not simulating aerodynamics. There is no lift, no stall, no angle of
attack. The rule is: **the ship always flies where its nose points, and your
input turns the nose.** That is the Star Fox / Ace Combat feel — responsive,
forgiving, and a handful of lines.

Each frame the system produces two things: an updated **orientation** (the
quaternion) and a **velocity** (down the nose).

**`src/systems/FlightControlSystem.hpp`** — new file:

```cpp
#pragma once

#include "Components.hpp"
#include "Input.hpp"
#include "Math.hpp"
#include "ecs/World.hpp"

namespace FlightControlSystem {

constexpr float kPitchRate = 1.7f;   // radians/second
constexpr float kYawRate = 1.3f;
constexpr float kRollRate = 2.6f;
constexpr float kAutoBank = 1.5f;    // roll added per unit of yaw input
constexpr float kCruiseSpeed = 42.0f;
constexpr float kBoostMultiplier = 1.9f;

} // namespace FlightControlSystem
```

Six constants, and every one is game feel. Roll is the fastest axis because
rolling is how you aim your next turn; yaw is the slowest because a fast yaw
makes the ship feel like it is skidding. These are the numbers to change when the
ship feels wrong — not the code below them.

**`FlightControlSystem.hpp`**, in `namespace FlightControlSystem` — after the
constants:

```diff
 constexpr float kCruiseSpeed = 42.0f;
 constexpr float kBoostMultiplier = 1.9f;
+
+inline void update(World& world, Entity player, const InputState& input, float dt) {
+    Transform* t = world.get<Transform>(player);
+    Player* p = world.get<Player>(player);
+    if (!t || !p) return;
+
+    p->boosting = input.boosting;
+    p->throttle = input.throttle;
+}
 
 } // namespace FlightControlSystem
```

The guard returns quietly if the player is missing either component — the same
defensive shape every system uses. Copying `boosting` onto the `Player` component
matters for a reason that is easy to miss: the *collision* system (chapter 12)
never sees an `InputState`, but a later feature might want to know "was the
player boosting when this happened?" — and components are where systems share
facts.

### Turning input into orientation

This is chapter 03's local-space rotation made concrete. Build a small **delta**
rotation from this frame's input, and apply it in the ship's own frame:

**`FlightControlSystem.hpp`**, in `update` — after the throttle copy:

```diff
     p->boosting = input.boosting;
     p->throttle = input.throttle;
+
+    float pitch = input.pitch * kPitchRate;
+    float yaw = input.yaw * kYawRate;
+    float roll = input.roll * kRollRate + input.yaw * kAutoBank;
+
+    glm::quat delta = glm::angleAxis(pitch * dt, glm::vec3(1.0f, 0.0f, 0.0f))
+                    * glm::angleAxis(yaw * dt, glm::vec3(0.0f, 1.0f, 0.0f))
+                    * glm::angleAxis(roll * dt, glm::vec3(0.0f, 0.0f, 1.0f));
+    t->rotation = glm::normalize(t->rotation * delta);
 }
```

Three things carry the whole flight model:

- **Rates × `dt`.** `kPitchRate` is radians per *second*; multiplying by `dt`
  makes the turn identical at 60 Hz and 144 Hz — chapter 09's habit, applied.
- **Right-multiply.** `t->rotation * delta` composes the new tumble *in the
  ship's current frame*. This is the line the whole feel hangs on, and the one
  worth breaking on purpose — see the checkpoint.
- **Renormalise.** Hundreds of quaternion multiplies per second accumulate
  floating-point drift; `glm::normalize` pulls the result back to unit length so
  the ship never slowly skews.

### The auto-bank that sells it

Look again at `roll = input.roll * kRollRate + input.yaw * kAutoBank`. Even if
you never touch a roll key, **yawing adds roll** — turn left and the ship banks
into the turn, like an aircraft leaning through a curve. It is a single term, and
it is most of why the flight reads as "a plane" rather than "a cursor". Set
`kAutoBank` to `0.0f` after the checkpoint and feel the turns go flat and
lifeless; put it back and they come alive again.

### Turning orientation into velocity

**`FlightControlSystem.hpp`**, in `update` — after the rotation:

```diff
     t->rotation = glm::normalize(t->rotation * delta);
+
+    float speed = kCruiseSpeed * (p->boosting ? kBoostMultiplier : 1.0f);
+    world.store<Velocity>().set(player, Velocity{Math::forward(t->rotation) * speed});
 }
```

Once the nose points somewhere, flying is trivial: go that way.
`Math::forward(t->rotation)` is chapter 03's helper — the ship's local −Z rotated
into world space — and `MovementSystem` integrates the result one step later in
the schedule. Boost is just a bigger multiplier while `Left Shift` is held.

One subtlety worth pausing on, because chapter 04 promised it would come up: we
are holding `t`, a pointer into the **Transform** store, across a `set` on the
**Velocity** store. That is safe — `set` can only reallocate the store it is
called on — and the argument is evaluated before the call anyway. The dangerous
version is holding a pointer across a mutation of the *same* store, and chapter
12 meets it for real.

---

## Wiring it in

`Game::update` needs the input. Its signature grows a parameter:

**`Game.hpp`** — after the `GameState.hpp` include:

```diff
 #include "GameState.hpp"
+#include "Input.hpp"
 #include "ecs/World.hpp"
```

**`Game.hpp`**, in `class Game` — change the `update` declaration:

```diff
     /// Advance the world by dt, then package what the renderer needs.
-    FrameData update(float dt, float aspect);
+    FrameData update(float dt, const InputState& input, float aspect);
```

**`Game.cpp`** — in the include block, after `Math.hpp`:

```diff
 #include "Components.hpp"
 #include "Math.hpp"
+#include "systems/FlightControlSystem.hpp"
 #include "systems/MovementSystem.hpp"
```

**`Game.cpp`**, in `Game::update` — change the signature and add the schedule
line:

```diff
-FrameData Game::update(float dt, float aspect) {
+FrameData Game::update(float dt, const InputState& input, float aspect) {
     dt = std::min(std::max(dt, 0.0f), kMaxStep);
 
+    FlightControlSystem::update(world, player, input, dt);
     MovementSystem::update(world, dt);
```

Flight control runs **first**, before movement — so the frame's input turns the
nose, and then the ship moves along the *new* heading. Swap those two lines and
every input arrives one frame late; you would never consciously notice, and the
controls would feel subtly gluey forever.

Finally, `main.cpp` owns the `Input` object, because it owns the window:

**`main.cpp`** — after the `Game.hpp` include:

```diff
 #include "Game.hpp"
+#include "Input.hpp"
 #include "render/Renderer.hpp"
```

**`main.cpp`**, in `main` — after `Game game;`:

```diff
     Game game;
+    Input input(window);
 
     double lastTime = glfwGetTime();
```

**`main.cpp`**, in the `while` loop — pass the input through:

```diff
-        FrameData frame = game.update(dt, aspect);
+        FrameData frame = game.update(dt, input.state(), aspect);
         renderer.drawFrame(frame);
```

---

## Checkpoint

```console
$ cmake --build build && cd build && ./SpaceFighter
[vulkan] using NVIDIA GeForce RTX 4070 (Vulkan 1.3)
[swapchain] 1280x720  format 50  3 images
```

**Fly.** The ship immediately pulls away from the fixed camera — it now always
moves at cruise speed, nose-first. `W`/`S` pitch, `A`/`D` yaw (watch the ship
bank into the turn with no roll input), `Q`/`E` roll, `Left Shift` visibly
lengthens its stride. The grid slides underneath and never crawls; the starfield
never runs out. The camera does not follow yet — that is chapter 11 — so the
ship will leave the frame. Fly it back.

| Symptom | Likely cause |
|---|---|
| Ship doesn't move at all | The schedule line is missing, or `spawnPlayer` never attached `Player` — the guard in `update` returns silently. |
| Keys do nothing | The window isn't focused (click it), or `glfwPollEvents` vanished from the loop. |
| Pitch works until you roll, then pitches the wrong way | You wrote `delta * t->rotation` — see below. |
| Turns feel flat | `kAutoBank` is 0, or the auto-bank term fell off the roll line. |
| Ship accelerates forever | You added velocity instead of setting it: `+=` where the `set` should be. |
| Controls twice as sensitive on a 144 Hz monitor | A missing `* dt` on one of the three axes. |

**Try breaking it on purpose.** Change the rotation line to
`t->rotation = glm::normalize(delta * t->rotation);` — the only other order it
could go — and rebuild. Flying level, it feels identical. Now roll 90° with `Q`
and pull `S`: the ship **yaws** instead of climbing. Left-multiplying applies the
delta in the *world's* frame, so "pitch" always rotates about the world X axis no
matter which way the ship is tipped. It is the difference between an aircraft and
a security camera, it is invisible until you roll, and it is one operand swap.
Put it back, roll, and pull `S` again — the ship climbs through its own roll,
which is what flying means.

---

## Why this lives in a system, not the ship

There is no `Ship` class with a `fly()` method. Flight is a function that reads
input plus the player's components and writes back orientation and velocity. Give
*any* entity a `Player` component and this system flies it; take it away and the
entity coasts on whatever velocity it last had. Behaviour is attached, not
inherited — chapter 04's promise, cashed out in the first system you can feel.

---

## Challenge

Add gamepad support: `glfwGetGamepadState` fills a `GLFWgamepadstate` with axes
already in [−1, 1], and merging it into `Input::state()` should touch nothing
outside that one function.

Three things to get right. Sticks drift, so anything below a small deadzone
(±0.1 or so) must clamp to zero, or the ship slowly wanders on its own with the
pad untouched. GLFW's Y axes are positive-*down*, so the stick will map to pitch
with the opposite sign you expect — decide which convention wins before you test,
not after. And decide how keyboard and pad combine when both are active: summing
then clamping to [−1, 1] lets either device interrupt the other mid-manoeuvre,
while "pad overrides keyboard" makes the keyboard dead the moment a pad is
plugged in, and one of those is much more annoying in practice.

---

**Next:** a camera that chases the ship instead of watching it leave. →
[Chapter 11: The camera](11-the-camera.md)
