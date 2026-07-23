# 10 · Flight & input 🛠️

> **You'll leave this chapter with:** a clean way to decouple input from hardware
> using GLFW, and a full understanding of the arcade flight model in
> `FlightControlSystem` — how pitch/yaw/roll become a quaternion, and why turns
> bank on their own. The flight model is a character-for-character port of the
> [Metal guide](../../space-fighter-metal/docs/08-flight-and-input.md); only the
> input source (GLFW instead of AppKit) changes.

---

## Input as intent, not keys

The systems that fly the ship should not know that `W` is `GLFW_KEY_W`. If they
did, adding gamepad support later would mean editing gameplay code. So we put a
translation layer in between. Raw GLFW key state goes into an `Input` object; it
emits an `InputState` of *intent*:

```cpp
struct InputState {
    float pitch = 0;      // + nose up,   - nose down
    float yaw   = 0;      // + nose left, - nose right
    float roll  = 0;      // + roll left, - roll right
    float throttle = 0;   // wired through, unused — chapter 14's first exercise
    bool  firing   = false;
    bool  boosting = false;
};
```

Those are **normalised axes** in [−1, 1], not booleans about keys. A keyboard
produces −1 / 0 / +1; a gamepad stick would produce the smooth values in between,
and *nothing downstream changes*. We read the physical keyboard by polling GLFW
each frame and folding held keys into axes:

```cpp
InputState Input::state() {
    InputState s;
    auto held = [&](int key){ return glfwGetKey(window, key) == GLFW_PRESS; };

    if (held(GLFW_KEY_A) || held(GLFW_KEY_LEFT))  s.yaw += 1;    // yaw left
    if (held(GLFW_KEY_D) || held(GLFW_KEY_RIGHT)) s.yaw -= 1;    // yaw right
    if (held(GLFW_KEY_W) || held(GLFW_KEY_UP))    s.pitch -= 1;  // dive (see below)
    if (held(GLFW_KEY_S) || held(GLFW_KEY_DOWN))  s.pitch += 1;  // climb
    if (held(GLFW_KEY_Q)) s.roll += 1;
    if (held(GLFW_KEY_E)) s.roll -= 1;
    s.firing   = held(GLFW_KEY_SPACE);
    s.boosting = held(GLFW_KEY_LEFT_SHIFT);
    return s;
}
```

GLFW's `GLFW_KEY_*` tokens map to a key's **physical position on a US layout**, not
the character it produces — so WASD stays put under your fingers on AZERTY or
Dvorak, the same positional guarantee Metal's key codes gave us. Swapping in GLFW's
gamepad API (`glfwGetGamepadState`) means writing a different producer for the same
`InputState` — the seam is the struct.

> **Polling vs callbacks.** GLFW also offers a key *callback* (`glfwSetKeyCallback`)
> that fires on press/release edges. Polling with `glfwGetKey` each frame is the
> right fit for continuous flight controls ("is the key *held* this frame?");
> callbacks are better for discrete one-shot actions (a menu, a pause toggle).
> `glfwPollEvents` in the game loop (chapter 09) is what refreshes both.

---

## What "arcade flight model" means

We are not simulating aerodynamics. There's no lift, no stall, no angle of attack.
The rule is simply: **the ship always flies where its nose points, and your input
turns the nose.** This is the Star Fox / Ace Combat *arcade* feel — responsive and
forgiving — and it's a handful of lines.

Two outputs each frame: an updated **orientation** (a quaternion) and a **velocity**
(down the nose).

---

## Turning input into orientation

This is chapter 03's local-space rotation, made concrete. Each frame we build a
small **delta** rotation from the input axes and the turn rates, and apply it in
the ship's own frame:

```cpp
float pitch = input.pitch * pitchRate;                         // rates are radians/second
float yaw   = input.yaw   * yawRate;
float roll  = input.roll  * rollRate + input.yaw * autoBank;   // ← note the auto-bank

Transform* t = transforms.get(player);
glm::quat delta =
    glm::angleAxis(pitch * dt, glm::vec3(1, 0, 0)) *   // pitch about local X (wings)
    glm::angleAxis(yaw   * dt, glm::vec3(0, 1, 0)) *   // yaw   about local Y (up)
    glm::angleAxis(roll  * dt, glm::vec3(0, 0, 1));    // roll  about local Z (nose)
t->rotation = glm::normalize(t->rotation * delta);     // apply on the RIGHT = local
```

Three things to notice:

- **Rates × dt.** `pitchRate` is ~1.7 rad/s; multiplying by `dt` makes the turn
  frame-rate independent (chapter 09).
- **Right-multiply.** `t->rotation * delta` composes the new tumble *in the ship's
  current frame*, so after you roll, "pitch" curls you through the roll — the thing
  that makes it feel like flying. (GLM's quaternion multiplication uses the same
  operand order as Metal's `simd_quatf`, so this is the same line in a different
  language.)
- **Renormalise.** Many multiplications drift the quaternion off unit length;
  `glm::normalize` pulls it back so the ship never skews.

### The auto-bank that sells it

Look again at `roll = input.roll * rollRate + input.yaw * autoBank`. Even if you
never press a roll key, **yawing adds roll.** Turn left and the ship banks into the
turn, like a real aircraft leaning through a curve. It's a single term, and it's
most of why the flight reads as "a plane" rather than "a cursor." Set `autoBank` to
0 to feel the difference — the turns go flat and lifeless immediately.

---

## Turning orientation into velocity

Once the nose points somewhere, flying is trivial — go that way:

```cpp
Transform* t  = transforms.get(player);
Player*    pl = players.get(player);
float speed = cruiseSpeed * (pl->boosting ? boostMultiplier : 1.0f);
glm::vec3 forward = glm::normalize(t->rotation * glm::vec3(0, 0, -1));   // local −Z → world
velocities.set(player, Velocity{forward * speed});
```

`t->rotation * glm::vec3(0,0,-1)` is the ship's local −Z (our forward) rotated into
world space (chapter 03). Multiply by speed and that's the velocity the
`MovementSystem` will integrate one step later in the schedule. Boost is just a
bigger multiplier while `Left Shift` is held.

We keep a constant cruise speed and a boost, which suits the "always pressing
forward" arcade feel. `Player.throttle` and `InputState.throttle` are wired through
but unused — a deliberate hook. Making Shift/Ctrl ease `throttle` between a min and
max speed, and using it in place of the constant, is a five-minute extension and a
good first change to make.

---

## The control mapping, and a deliberate choice

The full map lives in `Input::state()`:

| Intent | Keys | Sign |
|---|---|---|
| Pitch down (dive) | `W` / `↑` | `pitch -= 1` |
| Pitch up (climb) | `S` / `↓` | `pitch += 1` |
| Yaw left | `A` / `←` | `yaw += 1` |
| Yaw right | `D` / `→` | `yaw -= 1` |
| Roll | `Q` / `E` | `roll ±= 1` |
| Fire | `Space` | `firing` |
| Boost | `Left Shift` | `boosting` |

Note pitch: **pushing forward (`W`/`↑`) dives.** That's the flight-sim / Star Fox
convention — stick forward, nose down. Some players expect the inverse ("up means
up"). Because input is one clean layer, offering an "invert pitch" option is a
one-line flip of a sign in `Input::state()`, not a hunt through gameplay code. That
flexibility is the whole reason the input abstraction earns its keep.

---

## Why this lives in a system, not the ship

There is no `Ship` class with a `fly()` method. Flight is a *system* that reads
input plus the player's components and writes back orientation and velocity. The
upshot: give *any* entity a `Player` component and this system flies it; take it
away and the entity coasts on whatever velocity it has. Behaviour is attached, not
inherited — chapter 04's promise, cashed out.

---

**Next:** now that the ship moves, we need a camera that follows it well. →
[Chapter 11: The camera](11-the-camera.md)
