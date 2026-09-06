# 04 · Flight: bank and pull 🛠️

> **You'll leave this chapter with:** a ship that has angular momentum — a
> stick sets a *target* turn rate and the ship works its way there — that
> keeps whatever bank you give it, throttles between a floor and a ceiling,
> and slides a little through every hard turn. Plus an overlay that shows you
> the stick against the ship, and a procedure for tuning the numbers.
>
> **Files created:** `Sources/SpaceFighter/Components/Flight.swift`,
> `Tests/SpaceFighterTests/Ch04FlightTests.swift`
> **Files changed:** `Systems/FlightControlSystem.swift` (rewritten),
> `Components/Gameplay.swift`, `Archetypes/Player.swift`,
> `Input/KeyBindings.swift`, `Systems/HUDSystem.swift`, `Game.swift`

Chapter 01 said the ship has no mass. Press a key and it turns at full rate on
that frame; release and it stops on that frame; yaw and it banks and never
un-banks. This chapter replaces the flight model with one that has a body:
input asks for a turn rate, the ship *accelerates* toward it, and its velocity
follows its nose with a lag. The controls change with it — `A`/`D` become roll
— because the model they drive changes.

One warning before you start. The camera from the first guide is bolted to the
ship's up vector, and it was written for a ship that barely rolls. By the end
of this chapter the ship rolls a lot, and the camera will show you exactly how
wrong that assumption was. That's chapter 05's problem; this chapter is about
the ship.

---

## What bank-and-pull means

There are two ways to steer something that flies. In the first — the first
guide's model, Star Fox's model — the stick points the nose: left means turn
left, up means climb. It's direct, it's easy, and it doesn't feel like flying,
because nothing that flies works that way.

In the second, the stick moves *control surfaces*. Pitch is the strong axis —
pulling back turns the nose up, hard. Roll is fast but doesn't turn you; it
just decides which way "up" is. Yaw is weak, a rudder for lining up a shot. To
turn left, you roll left until your wings are vertical and *then pull*, and
the pitch axis does the turning. That's Battlefield's jets, Ace Combat on
expert controls, every flight sim, and — for the sixty seconds it takes to
stop fighting it — it's harder. Then it's the only way that feels right.

Three consequences shape the code:

- **The ship needs angular velocity as state.** In the first guide the turn
  rate was `input × constant`, computed and discarded every frame. Now it's a
  component the stick pushes on.
- **Roll must persist.** Rolling is how you aim your pitch axis. A ship that
  levelled itself would undo your setup before you could pull.
- **Velocity should lag the nose.** A body that turns its nose hard doesn't
  instantly go where the nose points; it slides for a moment. That slide is
  most of what "weight" feels like.

Here's the chain, which the rest of the chapter builds link by link:

```
stick ──▶ target rate ──▶ angular velocity ──▶ orientation ──▶ velocity ──▶ position
          (× maxRate)     (accel / damping)    (integrate)     (lags nose)  (MovementSystem)
```

---

## The state a ship needs

**`Sources/SpaceFighter/Components/Flight.swift`** — new file:

```swift
import simd

/// Simulation. How fast the ship is turning about its own axes, in radians per
/// second: x is pitch, y is yaw, z is roll. Input sets a target for this; the
/// flight model decides how quickly the ship gets there.
struct AngularVelocity {
    var body: Vec3 = .zero
}
```

*Body* space, not world space: `body.x` is always "about the ship's own wing
line", whatever way the ship is pointing. That's the same reason the first
guide right-multiplied its rotation deltas, and it's what makes a pitch input
mean the same thing at any bank angle.

**`Flight.swift`** — after `AngularVelocity`:

```swift
/// Simulation. Every number that makes one ship fly differently from another.
/// The archetype sets it; the flight system only reads it.
struct FlightModel {
    /// Fastest the ship will turn, radians / second, per axis (pitch, yaw, roll).
    var maxRate: Vec3
    /// How quickly the turn rate approaches what the stick asks for, radians / second².
    var angularAccel: Vec3
    /// How quickly it dies away once the stick is centred, radians / second².
    var angularDamping: Vec3

    /// Speed envelope, world units / second.
    var minSpeed: Float
    var maxSpeed: Float
    var boostSpeed: Float
    /// Throttle travel per second of held key: 1 means centre to full in one second.
    var throttleResponse: Float
    /// How quickly speed chases the throttle, units / second².
    var speedResponse: Float

    /// How quickly velocity swings round to follow the nose, per second.
    /// Lower slides further through a turn.
    var linearResponse: Float
    /// Roll rate toward the horizon when roll is centred, radians / second.
    /// Zero means the bank you set is the bank you keep.
    var autoLevel: Float
}
```

The first guide had six `static let`s on the flight system. There are ten
fields now — sixteen numbers, counting each axis — and they're a *component*
rather than constants, because chapter 08 gives you three ships to choose from
and the whole difference between them is this struct. A system that read `static let pitchRate` couldn't do that.

**`Flight.swift`**, in `FlightModel` — after `autoLevel`:

```diff
     var autoLevel: Float
+
+    static let fighter = FlightModel(
+        maxRate: Vec3(2.2, 0.6, 3.5),
+        angularAccel: Vec3(6, 2, 10),
+        angularDamping: Vec3(8, 4, 12),
+        minSpeed: 25, maxSpeed: 70, boostSpeed: 120,
+        throttleResponse: 1.0,
+        speedResponse: 40,
+        linearResponse: 3.5,
+        autoLevel: 0)
 }
```

Every number has a reason, and the reasons are what you'll be adjusting in the
tuning section, so here they are.

**`maxRate` is (2.2, 0.6, 3.5).** Pitch at 2.2 rad/s is 126° per second — a
full loop in under three seconds, which is *fast*, and it's the turn axis so
it should be. Roll at 3.5 is faster still: level to knife-edge in about half
a second including the spin-up, because if setting up a turn takes longer
than the turn, nobody sets up turns. Yaw at 0.6 is just over a quarter of
pitch. It's a rudder. If yaw were as strong as
pitch, nobody would bother rolling, and the model collapses back into the
first guide's.

**`angularAccel` is (6, 2, 10).** Dividing max rate by acceleration gives the
time to reach full rate from rest: 0.37 s for pitch, 0.35 s for roll, 0.3 s
for yaw. Long enough to feel the mass, short enough not to feel sluggish. If
you take one number from this chapter to play with, take this one.

**`angularDamping` is (8, 4, 12)** — higher than acceleration on every axis,
so the ship stops turning faster than it starts. The asymmetry is the same
one chapter 03's keyboard had, for the same reason: releasing should feel
crisp.

**Speeds of 25, 70 and 120.** The floor is there so you can't stop — a ship
that can hover is a turret — and the ceiling is a bit above the first guide's
55 cruise. Boost is a separate number rather than a multiplier because the
first guide's chapter 10 challenge pointed out that a multiplier makes the
throttle pointless: boost should be *faster than anything the throttle can
do*, not faster than whatever it happens to be doing.

**`speedResponse` of 40** means going from the floor to the ceiling takes just
over a second. **`throttleResponse` of 1** means a held `R` sweeps the whole
throttle range in one second.

**`linearResponse` of 3.5.** At 60 Hz, `1 − exp(−3.5/60)` is about 5.7 % —
the velocity closes six percent of the gap to the nose every step, and has
caught up within about a second of the turn ending. Lower it to 1.5 and the
ship feels like it's on ice; raise it to 10 and the slide is gone and so is
the weight.

**`autoLevel` of 0.** Off. It exists because turning it on is the one-line
difference between this model and the "novice" one, and the section after
the system explains what it does.

**`Sources/SpaceFighter/Components/Gameplay.swift`**, in `Player` — the
ship's actual speed becomes state beside the throttle:

```diff
 struct Player {
-    var throttle: Float = 0.5
+    var throttle: Float = 0.5  // 0…1, where in the speed envelope the pilot wants to be
+    var speed: Float = 0       // world units / second, where the ship actually is
     var boosting: Bool = false
 }
```

Throttle is what you asked for; speed is what you've got. They differ
whenever you've just moved the throttle or just pressed boost, and the gap
between them is the ship accelerating. Speed starts at zero, so the ship now
launches from rest and takes just over a second to reach cruise; if you'd
rather spawn at speed, set it in `spawnPlayer`.

**`Sources/SpaceFighter/Archetypes/Player.swift`**, in `spawnPlayer`:

```diff
     world.add(Transform(), to: e)
     world.add(Velocity(), to: e)
+    world.add(AngularVelocity(), to: e)
+    world.add(FlightModel.fighter, to: e)
     world.add(Player(), to: e)
```

Two components on the archetype, and the flight system below finds the ship
by them. That's the whole reason enemies don't get a flight model *yet* —
chapter 07 adds these same two lines to `spawnEnemy` and the enemies start
flying the same way you do.

---

## The system

The whole file is replaced. The five constants go (they're in `FlightModel`
now), `autoBank` goes with them, and `update` is rewritten from the top.

**`Sources/SpaceFighter/Systems/FlightControlSystem.swift`** — replace the
whole file:

```swift
import simd

/// Turns a stick into a turn. Input asks for a rate; the ship's angular
/// velocity moves toward it at a finite pace and dies away at another; the
/// nose follows the angular velocity, and the velocity follows the nose, a
/// beat behind. No aerodynamics, but a body with mass.
enum FlightControlSystem {
    static func update(_ world: World, player: Entity, input: InputFrame, dt: Float) {
        let players = world.store(Player.self)
        let transforms = world.store(Transform.self)
        let velocities = world.store(Velocity.self)
        let angulars = world.store(AngularVelocity.self)

        guard var pl = players.get(player),
            var t = transforms.get(player),
            var av = angulars.get(player),
            var v = velocities.get(player),
            let model = world.get(FlightModel.self, player)
        else { return }
    }
}
```

Four `var`s and one `let`. The system copies every piece of the ship's state
out, works on the copies, and writes them all back at the end — that's the
shape the first guide's `WeaponSystem` used for its cooldown, and it reads
better than five `mutate` closures when the pieces depend on each other.

**`FlightControlSystem.swift`**, in `update` — after the `guard`:

```diff
         else { return }
+
+        let stick = Vec3(input.pitch, input.yaw, input.roll)
+        var target = stick * model.maxRate
+        if model.autoLevel > 0 && input.roll == 0 {
+            target.z = levellingRoll(t, model: model)
+        }
+        for axis in 0..<3 {
+            let pace = stick[axis] == 0 ? model.angularDamping[axis] : model.angularAccel[axis]
+            av.body[axis] = Math.moveToward(av.body[axis], target[axis], pace * dt)
+        }
     }
```

This is the first link and the one that matters most. The stick — chapter
03's analog values, in the same (pitch, yaw, roll) order as `AngularVelocity`
— is scaled to a target rate. Then, per axis, the *current* rate moves toward
the target at a fixed pace: acceleration when the stick is asking for
something, damping when it's centred.

`Math.moveToward` — linear, a fixed number of radians per second per second —
rather than the `1 − exp` form. Exponential easing never quite arrives, and
here that matters: the test at the end asserts the rate *equals* the max, and
a pilot holding full stick should get full rate, not 99 % of it. Linear
acceleration is also what a real control surface produces: a constant torque,
not a torque proportional to how far you are from where you want to be.

`levellingRoll` doesn't exist yet. It's the auto-level section's job, and it's
only called when `autoLevel` is on.

**`FlightControlSystem.swift`**, in `update` — after the `for axis` loop:

```diff
             av.body[axis] = Math.moveToward(av.body[axis], target[axis], pace * dt)
         }
+
+        let turn = av.body * dt
+        let angle = simd_length(turn)
+        if angle > 1e-6 {
+            t.rotation = simd_normalize(t.rotation * Quat(angle: angle, axis: turn / angle))
+        }
     }
```

The first guide integrated rotation as three separate quaternions, pitch then
yaw then roll, multiplied together. That works when only one of them is
non-zero at a time and it quietly depends on their order when it isn't:
pitching *then* rolling isn't the same as rolling *then* pitching, and which
one you get is whichever the code happened to write first.

This is one quaternion. `av.body × dt` is this step's rotation as a vector
whose direction is the axis and whose length is the angle — an *axis-angle*,
which is what a body actually does when it's spinning about three axes at
once: it rotates about one combined axis. `Quat(angle:axis:)` builds exactly
that. Right-multiplication keeps it in the ship's frame, as before, and the
`simd_normalize` is the first guide's drift guard, as before.

The `1e-6` guard is for the ship sitting still. `turn / angle` with `angle`
zero is a NaN, and a NaN in a rotation doesn't crash — it spreads into the
model matrix, fails every clip test, and the ship silently disappears. Better
to not divide.

**`FlightControlSystem.swift`**, in `update` — after the rotation:

```diff
             t.rotation = simd_normalize(t.rotation * Quat(angle: angle, axis: turn / angle))
         }
+
+        pl.boosting = input.boosting
+        pl.throttle = min(max(pl.throttle + input.throttle * model.throttleResponse * dt, 0), 1)
+        let cruise = simd_mix(model.minSpeed, model.maxSpeed, pl.throttle)
+        let wanted = pl.boosting ? model.boostSpeed : cruise
+        pl.speed = Math.moveToward(pl.speed, wanted, model.speedResponse * dt)
     }
```

The throttle is the first guide's chapter 10 challenge, answered. It *adds*
`input.throttle` scaled by time, so a held `R` sweeps it up and a released
`R` leaves it where it is — unlike the turn axes, which are what the stick
says *now*. That persistence is the difference between a throttle and a
fourth stick axis. `simd_mix` maps it onto the envelope; boost overrides the
whole envelope rather than scaling it; and `speed` chases whichever was
chosen at a fixed pace, so slamming the throttle from floor to ceiling takes
its second.

**`FlightControlSystem.swift`**, in `update` — after `pl.speed`:

```diff
         pl.speed = Math.moveToward(pl.speed, wanted, model.speedResponse * dt)
+
+        let desired = t.forward * pl.speed
+        v.linear += (desired - v.linear) * (1 - exp(-model.linearResponse * dt))
+
+        players.set(player, pl)
+        transforms.set(player, t)
+        angulars.set(player, av)
+        velocities.set(player, v)
     }
```

The last link, and the one that makes the ship heavy. `desired` is where the
first guide set velocity directly: nose times speed. Instead, velocity *moves
toward* it, exponentially, and the gap between the two is the slide. Pull a
hard turn and for a few tenths of a second you're travelling somewhere between
where you were going and where you're now pointing — which is what a body
does, and which the camera in chapter 05 will make visible as the reticle
leading the nose.

Yes, this is the `1 − exp(−k·dt)` form inside the simulation, where the
chapter 02 rule said exponential smoothing belongs to presentation. The rule
was about *varying* `dt`: the form is frame-rate independent when `dt` varies
and it's simply a constant multiplier when `dt` doesn't. Inside `step`, `dt`
never varies, `exp(−3.5/60)` is the same bits every time, and determinism
holds. The choice of exponential over `moveToward` here is deliberate:
velocity should approach the nose *asymptotically* — fast at first, then
gently — because that's the shape of drag, and because a linear catch-up has
an audible "click" when it arrives.

Then the four writes. Nothing above this line touched the stores.

---

## The bank you keep

`autoLevel` is zero and the system, as written, never levels the wings. Roll
ninety degrees, let go, and ninety degrees is where you stay — a turn later
you'll pull and go sideways, which is either the point or a problem depending
on the game you're making. Since one number switches between them, the
switch may as well work.

**`FlightControlSystem.swift`**, in `FlightControlSystem` — after `update`:

```diff
         velocities.set(player, v)
     }
+
+    /// The roll rate that brings the wings level, clamped to `autoLevel`.
+    /// Near vertical there is no horizon to level to, so none.
+    private static func levellingRoll(_ t: Transform, model: FlightModel) -> Float {
+        let worldUp = Vec3(0, 1, 0)
+        guard abs(simd_dot(t.forward, worldUp)) < 0.95 else { return 0 }
+        let bank = atan2(simd_dot(t.right, worldUp), simd_dot(t.up, worldUp))
+        return min(max(-bank * 2, -model.autoLevel), model.autoLevel)
+    }
 }
```

`bank` is the ship's roll angle relative to the horizon: how much of world-up
is along the ship's right wing versus along its own up. `atan2` of those two
gives an angle from −π to π, zero when level, positive when the right wing is
raised — which, checking against `InputFrame`'s convention that positive roll
is *left*, means the ship has rolled left and needs a *negative* roll rate to
recover. Hence `-bank * 2`: a rate proportional to the error, twice the angle
in radians per second, clamped to whatever `autoLevel` allows. The `2` is a
spring stiffness; anything from 1 to 4 works.

The `0.95` guard: pointing straight up, "level" has no meaning — every roll
angle looks the same to the horizon — and `atan2` of two tiny numbers is
noise. Above 72° of pitch the leveller lets go.

Set `autoLevel` to `2` in `FlightModel.fighter`, fly for a minute, and set it
back. That's the hybrid model — Ace Combat's *novice* controls — and it's a
perfectly good game. It's not this one,
because with the wings coming back on their own you never build the habit of
putting them where you want them, and that habit is the skill the multiplayer
chapters are for.

---

## Remap the keys

**`Sources/SpaceFighter/Input/KeyBindings.swift`**, in `KeyBindings`:

```diff
     var pitchUp: [UInt16] = [Key.s, Key.arrowDown]
     var pitchDown: [UInt16] = [Key.w, Key.arrowUp]
-    var yawLeft: [UInt16] = [Key.a, Key.arrowLeft]
-    var yawRight: [UInt16] = [Key.d, Key.arrowRight]
-    var rollLeft: [UInt16] = [Key.q]
-    var rollRight: [UInt16] = [Key.e]
+    var rollLeft: [UInt16] = [Key.a, Key.arrowLeft]
+    var rollRight: [UInt16] = [Key.d, Key.arrowRight]
+    var yawLeft: [UInt16] = [Key.q]
+    var yawRight: [UInt16] = [Key.e]
     var throttleUp: [UInt16] = [Key.r]
     var throttleDown: [UInt16] = [Key.f]
```

`A`/`D` roll, `Q`/`E` yaw. The strong axes go on the keys your fingers rest
on; the rudder goes to the keys beside them. This is the one place the chapter
touches input, and it's a four-line swap because chapter 03 put the map in a
table.

---

## See what the ship is doing

You can't tune what you can't see, and a rate that ramps over a third of a
second is hard to see. So: an overlay. Stick against rate, per axis, as bars.
Chapter 09 will give it numbers; for now, rectangles.

**`Sources/SpaceFighter/Systems/HUDSystem.swift`** — before `HUDSystem`:

```swift
/// Presentation. What the flight debug overlay shows: every value is -1…1 or
/// 0…1 so the bars need no scale of their own.
struct FlightDebug {
    var stick: Vec3     // pitch, yaw, roll as asked
    var rate: Vec3      // angular velocity as a fraction of the max rate
    var throttle: Float
    var speed: Float    // as a fraction of boost speed
}
```

**`HUDSystem.swift`**, in `build` — take it as an optional:

```diff
-    static func build(stats: GameStats, aspect: Float) -> [HUDVertex] {
+    static func build(stats: GameStats, aspect: Float, flight: FlightDebug? = nil) -> [HUDVertex] {
         var v: [HUDVertex] = []
```

**`HUDSystem.swift`**, in `build` — before `return v`:

```diff
         appendRect(&v, cx: barX - barHW + fillHW, cy: barY, hw: fillHW, hh: barHH, color: fillColor)

+        if let flight { appendFlightDebug(&v, flight, aspect: aspect) }
+
         return v
     }
```

**`HUDSystem.swift`**, in `HUDSystem` — after `build`:

```diff
         return v
     }
+
+    /// Bottom right: three pairs of bars (stick over rate) for pitch, yaw and
+    /// roll, then throttle and speed. A stick bar that leads its rate bar is
+    /// the angular inertia you're feeling.
+    private static func appendFlightDebug(_ v: inout [HUDVertex], _ f: FlightDebug, aspect: Float) {
+        let x: Float = 0.72
+        let hw: Float = 0.2
+        let hh: Float = 0.012
+        let rows: [(Float, Vec4)] = [
+            (f.stick.x, Vec4(0.9, 0.9, 0.9, 0.9)), (f.rate.x, Vec4(0.4, 0.8, 1.0, 0.9)),
+            (f.stick.y, Vec4(0.9, 0.9, 0.9, 0.9)), (f.rate.y, Vec4(0.4, 0.8, 1.0, 0.9)),
+            (f.stick.z, Vec4(0.9, 0.9, 0.9, 0.9)), (f.rate.z, Vec4(0.4, 0.8, 1.0, 0.9)),
+            (f.throttle * 2 - 1, Vec4(1.0, 0.8, 0.3, 0.9)), (f.speed * 2 - 1, Vec4(1.0, 0.5, 0.3, 0.9)),
+        ]
+        for (i, (value, color)) in rows.enumerated() {
+            let y: Float = -0.62 - Float(i) * 0.04
+            appendRect(&v, cx: x, cy: y, hw: hw, hh: hh, color: Vec4(0.1, 0.1, 0.12, 0.7))
+            let signed = max(-1, min(value, 1))
+            appendRect(&v, cx: x + hw * signed * 0.5, cy: y, hw: hw * abs(signed) * 0.5, hh: hh, color: color)
+            appendRect(&v, cx: x, cy: y, hw: 0.002 / aspect, hh: hh, color: Vec4(1, 1, 1, 0.5))
+        }
+    }
```

Eight rows, each a dark track with a bar growing from the centre line: white
for what the stick asked, blue for what the ship is doing, and a thin centre
mark. Throttle and speed are mapped from 0…1 to −1…1 so they share the
drawing code. It's a debug view; it doesn't need to be pretty, it needs to be
honest.

Now `Game` builds it, and toggles it.

**`Sources/SpaceFighter/Game.swift`**, in `Game` — after `replayFinished`:

```diff
         return Int(clock.tick) >= replay.frames.count
     }

+    /// Presentation. The stick-and-rate bars, toggled with the debug button.
+    var showFlightDebug = false
+    private var lastInput = InputFrame()
+
     private let fieldOfView: Float = 65
```

**`Game.swift`**, in `advance` — before the clock:

```diff
     func advance(realDt: Float, input live: InputFrame) {
+        if live.buttons.contains(.debug) && !lastInput.buttons.contains(.debug) {
+            showFlightDebug.toggle()
+        }
+        lastInput = live
+
         let steps = clock.advance(realDt: realDt)
```

A toggle needs an *edge* — pressed this frame, not pressed last frame —
otherwise holding the key flickers it sixty times a second. Comparing against
the previous frame's buttons is the whole trick, and chapter 10 generalises it
for menus. This lives in `advance` rather than `step` because it's
presentation: a replay shouldn't turn your overlay on.

**`Game.swift`**, in `frame` — pass it to the HUD:

```diff
-            hud: HUDSystem.build(stats: stats, aspect: max(aspect, 0.01))
+            hud: HUDSystem.build(stats: stats, aspect: max(aspect, 0.01), flight: flightDebug())
         )
     }
```

**`Game.swift`**, in `Game` — after `frame`:

```diff
+    /// What the stick asked for against what the ship is doing, for the overlay.
+    private func flightDebug() -> FlightDebug? {
+        guard showFlightDebug,
+            let av = world.get(AngularVelocity.self, player),
+            let model = world.get(FlightModel.self, player),
+            let pl = world.get(Player.self, player)
+        else { return nil }
+        return FlightDebug(
+            stick: Vec3(lastInput.pitch, lastInput.yaw, lastInput.roll),
+            rate: av.body / model.maxRate,
+            throttle: pl.throttle,
+            speed: pl.speed / model.boostSpeed)
+    }
+
     private func respawn() {
```

---

## Tuning

Now you have a model with sixteen numbers, an overlay that shows what they do,
and — from chapter 03 — a way to fly the same manoeuvre twice. That's a tuning
loop:

1. Record a reference. `swift run SpaceFighter --record ~/turn.sfil`, press
   `` ` `` for the overlay, do one thing — a hard left turn, a snap roll, a
   boost from cruise — and quit.
2. Change *one* number in `FlightModel.fighter`.
3. `swift run SpaceFighter --replay ~/turn.sfil`, and watch the same input
   produce a different ship.
4. Keep it or put it back. Repeat.

The replay is what makes step 3 honest. Without it you're comparing a
manoeuvre you flew with the old numbers to one you flew with the new numbers
and your hands adjusted in between.

What each number does, in the terms you'll see on the overlay:

| Number | Raise it and… | Lower it and… | Watch |
| --- | --- | --- | --- |
| `maxRate.x` (pitch) | turns tighten; loops shrink | the ship feels like a bus | how far the blue pitch bar reaches |
| `maxRate.z` (roll) | setting up a turn is instant | you're waiting on the wings | roll bar length |
| `maxRate.y` (yaw) | rudder becomes a turn; you stop rolling | rudder is decorative | try 1.5 and notice you never roll |
| `angularAccel` | the ship snaps to rate; lighter | the ship winds up; heavier | the gap between white and blue |
| `angularDamping` | stops on a dime | overshoots the release; tanky | how long blue outlives white |
| `linearResponse` | goes where it points; arcade | slides through turns; icy | the reticle in chapter 05 |
| `speedResponse` | boost hits like a kick | boost swells | the speed bar's rise |
| `autoLevel` | wings come back; novice | 0: the bank you set is the bank you keep | the horizon after a roll |

A few things are worth knowing before you touch them.

**Acceleration and max rate trade against each other.** A ship with a high
max rate and low acceleration feels *powerful but heavy*; the same max rate
with high acceleration feels *twitchy*. The pair is the feel more than either
number alone.

**Damping above acceleration is nearly always right.** A ship that keeps
turning after you let go is a ship you can't aim.

**The keyboard has its own ramp** (chapter 03's 0.12 s attack) *before* this
model's acceleration. If a tap feels like too little, the fix might be there,
not here. The overlay's white bar is *after* the keyboard ramp, so you can
tell them apart: if the white bar itself is slow, that's the keyboard; if the
blue lags the white, that's the flight model.

**Enemies don't use any of this yet**, so tuning against them is premature.
Tune against the horizon and the grid, then revisit in chapter 07 when there's
something to chase.

---

## The tests

**`Tests/SpaceFighterTests/Ch04FlightTests.swift`** — new file:

```swift
import Testing
import simd

@testable import SpaceFighter

private let dt = SimulationClock.step
private let worldUp = Vec3(0, 1, 0)

/// Step a fresh game with one fixed input for `steps` ticks.
private func fly(_ game: Game, _ input: InputFrame, steps: Int) {
    for _ in 0..<steps { game.step(input: input, dt: dt) }
}

private func player(_ game: Game) -> (Transform, AngularVelocity, Player, Velocity) {
    (
        game.world.get(Transform.self, game.player)!,
        game.world.get(AngularVelocity.self, game.player)!,
        game.world.get(Player.self, game.player)!,
        game.world.get(Velocity.self, game.player)!
    )
}
```

Two helpers. `fly` holds one input for a number of ticks; `player` pulls the
four pieces of the ship's state out as a tuple so each test reads as one line
of setup and one line of assertion.

**`Ch04FlightTests.swift`** — after `player`:

```swift
@Test func fullStickSaturatesAtMaxRate() {
    let game = Game(seed: 1)
    var input = InputFrame()
    input.pitch = 1
    fly(game, input, steps: 60)
    let (_, av, _, _) = player(game)
    #expect(av.body.x == FlightModel.fighter.maxRate.x)
}

@Test func centredStickDampsToNothing() {
    let game = Game(seed: 1)
    var input = InputFrame()
    input.pitch = 1
    fly(game, input, steps: 60)
    fly(game, InputFrame(), steps: 30)  // 0.5 s; damping needs 2.2 / 8 ≈ 0.28 s
    let (_, av, _, _) = player(game)
    #expect(av.body == .zero)
}

@Test func rateBuildsUpRatherThanSnapping() {
    let game = Game(seed: 1)
    var input = InputFrame()
    input.roll = 1
    fly(game, input, steps: 3)
    let (_, av, _, _) = player(game)
    #expect(av.body.z > 0 && av.body.z < FlightModel.fighter.maxRate.z * 0.5)
}
```

The first two are `==`, exact, and that's `moveToward` snapping to its target
— the reason it was chosen over `exp`. The third is the inertia itself: three
frames in, the roll rate is somewhere, and it isn't at max.

**`Ch04FlightTests.swift`** — after `rateBuildsUpRatherThanSnapping`:

```swift
@Test func theBankYouSetIsTheBankYouKeep() {
    let game = Game(seed: 1)
    var input = InputFrame()
    input.roll = 1
    fly(game, input, steps: 20)
    fly(game, InputFrame(), steps: 180)
    let (t, _, _, _) = player(game)
    #expect(simd_dot(t.up, worldUp) < 0.7, "no auto-level by default")
}

@Test func autoLevelBringsTheWingsBack() {
    let game = Game(seed: 1)
    var model = FlightModel.fighter
    model.autoLevel = 2
    game.world.add(model, to: game.player)
    var input = InputFrame()
    input.roll = 1
    fly(game, input, steps: 20)
    fly(game, InputFrame(), steps: 300)
    let (t, _, _, _) = player(game)
    #expect(simd_dot(t.up, worldUp) > 0.95)
}
```

Roll persistence is a *tested property*, not an accident of the code — the
first test fails the moment someone "fixes" the ship by levelling it. The
second test swaps the flight model on the live entity with `world.add`, which
overwrites, and checks that the switch does what the section above says.

**`Ch04FlightTests.swift`** — after `autoLevelBringsTheWingsBack`:

```swift
@Test func throttlePersistsWhenReleased() {
    let game = Game(seed: 1)
    var input = InputFrame()
    input.throttle = 1
    fly(game, input, steps: 60)   // 1 s of R at a response of 1: 0.5 → 1, clamped
    fly(game, InputFrame(), steps: 120)  // 2 s hands off; speed needs 70 / 40 = 1.75 s
    let (_, _, pl, _) = player(game)
    #expect(pl.throttle == 1)
    #expect(pl.speed == FlightModel.fighter.maxSpeed)
}

@Test func velocityLagsTheNoseThroughATurn() {
    let game = Game(seed: 1)
    fly(game, InputFrame(), steps: 120)  // settle at cruise, flying straight
    var input = InputFrame()
    input.pitch = 1
    fly(game, input, steps: 30)
    let (t, _, _, v) = player(game)
    let heading = simd_normalize(v.linear)
    #expect(simd_dot(heading, t.forward) < 0.999, "the ship slides through the turn")
    fly(game, InputFrame(), steps: 120)
    let (t2, _, _, v2) = player(game)
    #expect(simd_dot(simd_normalize(v2.linear), t2.forward) > 0.999, "and catches up after it")
}
```

The comments on the throttle test are the arithmetic of the tunables: hold
the throttle for exactly the second it takes to sweep to full, then wait
longer than speed needs to catch up, and both numbers land exactly because
both are clamped by `moveToward`. The last test is the slide, measured: mid
turn the velocity and the nose disagree; a while after, they don't.

---

## Checkpoint

```console
$ swift test
✔ Test run with 24 tests in 0 suites passed
```

**Twenty-four tests.** Then fly:

```console
$ swift run SpaceFighter
```

Press `` ` `` to bring up the bars, then:

1. **Tap `W` once.** The white pitch bar flicks; the blue one follows,
   smaller and later; the nose dips and stops. Now hold `W`: white hits the
   end, blue arrives a third of a second after it. That gap is the chapter.
2. **Hold `A` for a second and let go.** The ship rolls and *stays rolled*.
   The grid is now at an angle. That's correct. The camera trying to cope with
   it is not, and chapter 05 fixes the camera.
3. **Roll to knife-edge and pull `S`.** The ship turns — a proper banked turn,
   the grid sweeping past sideways — and the ship lags the direction it's
   travelling for a moment before catching up. That's `linearResponse`.
4. **Hold `R`.** The throttle bar climbs and the speed bar follows a beat
   behind. Release; both stay. Hold `Shift`: the speed bar jumps past the
   throttle bar to the end.

**If the ship spins without stopping**, `angularDamping` isn't being selected
— check the `stick[axis] == 0` test. **If it turns instantly**, `av.body` is
being set rather than moved toward; look for a stray `=`. **If it won't roll
with `A`**, the key map still has `A` on yaw. **If the ship vanishes the
moment you start**, that's the NaN from dividing by a zero `angle` — the
`1e-6` guard is missing.

---

## Challenge

Real fighters bleed energy in a hard turn. Add it: while the pitch rate is
above half of max, subtract from `pl.speed` at a rate proportional to the
pitch rate — a hard pull at cruise should cost you twenty or thirty units of
speed over two seconds — and let `speedResponse` win it back once you ease
off. It's one line in the speed section, and it changes the game: a pilot who
turns all the time is slow, and a slow pilot is dead. Three things to get
right: the floor (`minSpeed` is a floor for the *throttle*, not for bleed —
decide whether bleed can go below it); where the number lives (it's a
`FlightModel` tunable, and the heavy ship in chapter 08 should bleed less);
and the overlay, which should show it, because a mechanic the player can't see
is a mechanic they'll call a bug.

---

**Next:** a camera that remembers where it was, and a reticle that shows where
you're going. →
[Chapter 05: A camera with a memory](05-a-camera-with-a-memory.md)

---

*Back to the [guide map](../README.md) · references in [`resources.md`](../resources.md)*
