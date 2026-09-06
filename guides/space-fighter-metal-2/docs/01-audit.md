# 01 · Audit: what the prototype gets wrong 🧠

> **You'll leave this chapter with:** a precise list of what is wrong with the
> game the first guide left you — measured, with file and line — and the order
> in which the next thirteen chapters fix it. Nothing gets written yet; this is
> the chapter that decides what to write.
>
> **Files created: none.** Two commands at the end confirm you're starting from
> the right place.

The first guide was honest about its shortcuts. Every one was a labelled
decision: variable timestep "right for an arcade shooter", collision "with no
broad phase", one `player` field because there was one player. Those labels were
correct for a prototype. This chapter reads them again as a list of debts, and
finds a few the first guide didn't label at all.

Fly the game for a minute before reading on. You'll recognise every paragraph.

---

## Four things you can feel

**The bank never comes back.** Turn left with `A`, let go, and the ship stays
tilted. In the first guide's `FlightControlSystem.swift` the roll rate is

```
let roll = input.roll * rollRate + input.yaw * autoBank
```

(line 25 — the `autoBank` term the first guide called "the cheapest game-feel
lesson in the project"). Yawing adds roll, every frame, and nothing ever
subtracts it. In Star Fox the bank is a *visual* tilt that springs back the
moment you release; here it's real orientation, permanently changed. After three
turns you're flying at some arbitrary angle and the camera can't tell you which.

**Input is a switch.** Every axis in `InputState` is `0` or `±1`, and the flight
model multiplies it straight into a rate: pitch goes from nothing to 1.7 radians
per second — nearly a hundred degrees a second — in the frame you press `W`, and
back to nothing in the frame you release. There is no angular velocity anywhere
in the code; the ship has no mass. It reads as dragging a cursor, which is the
sensation the first guide's chapter 10 was explicitly trying to avoid.

**The camera is bolted to the ship's up.** `CameraSystem.swift` line 13:

```
let eye = t.position - t.forward * distanceBack + t.up * heightAbove
```

When the ship banks ninety degrees, `t.up` points sideways, so the camera slides
three units to the side and the ship drifts off centre. Then line 15 blends
thirty-five percent of that same `t.up` into the camera's up, so the horizon
tilts too. Both were reasonable for a ship that barely rolls; they fall apart the
moment roll is real, which after the fix in the first paragraph it will be.

**There's no analog input at all.** A keyboard is a fine way to fly this game
and stays the primary one throughout this guide. But a flight model with inertia
is *built* to take an analog stick, and there's no seam to plug one in — the
only type that produces an `InputState` is the one that knows about key codes.

Chapters 03, 04 and 05 are those four paragraphs, in order.

---

## A survey of `dt`

The first guide made a rule — "every rate is per second, multiply by `dt`" —
and kept it. Here is every place time enters the simulation, and whether
multiplying by `dt` is actually the right shape:

| Where | What it does | Correct form | What breaks otherwise |
| --- | --- | --- | --- |
| `MovementSystem` | `position += v * dt` | rate × dt | speed depends on refresh rate |
| `SpinSystem` | rotate by `speed * dt` | rate × dt | same |
| `FlightControlSystem` | rotate by `rate * dt` | rate × dt | same |
| `WeaponSystem` | `cooldown -= dt` | timer − dt | fire rate depends on refresh rate |
| `EnemySystem.spawn` | `spawnTimer -= dt` | timer − dt | same |
| `EnemySystem.steerHomers` | clamp turn to `turnRate * dt` | rate × dt | same |
| `LifetimeSystem` | `remaining -= dt` | timer − dt | same |
| `Game.update` | `hitFlash -= dt` | timer − dt | same |
| `Game.update` | `dt = min(max(rawDt, 0), 1/30)` | clamp | a hitch becomes a teleport |

Every row is right. The rule holds, and the game is frame-rate independent in
the sense the first guide meant: nothing moves *faster* on a 120 Hz display.

But look at the last row. Clamping `dt` to a thirtieth of a second means that
when the display drops below 30 fps, simulated time runs slower than real time —
the game goes into slow motion rather than lurching. That is the right choice,
and it's also a hint: **the simulation already has a speed limit that isn't the
display's.** There's a second, quieter problem in the table that `dt` scaling
can't fix at all. It's in the collision system, and it needs some arithmetic.

---

## The bolt that misses

`CollisionSystem` tests a point against a sphere: a bolt hits an enemy if the
bolt's centre is within `bolt.radius + enemy.radius` of the enemy's centre,
*this frame*. Between frames, nothing is tested. So a bolt that is outside the
sphere on one frame and outside it again on the next has passed straight
through, and no code anywhere will notice.

Whether that can happen is a question of distances:

| Quantity | Value | Where it comes from |
| --- | --- | --- |
| bolt speed | 140 u/s | `Weapon.muzzleSpeed` |
| chaser speed, toward you | 46 u/s | `Homing.speed` |
| drifter speed, roughly toward you | 55–80 u/s | `spawnEnemy` |
| closing speed | **186–220 u/s** | the two added |
| bolt travel per step at 60 Hz | **3.1–3.7 u** | closing ÷ 60 |
| enemy radius | 1.44–2.34 u | `scale × 0.9`, scale 1.6–2.6 |
| bolt radius | 0.6 u | `spawnProjectile` |
| combined reach | **2.04–2.94 u** | the two added |

A bolt aimed dead at an enemy's centre crosses the reach sphere along its full
diameter — 4.1 to 5.9 units — which is more than one step, so a perfect shot
always registers. Off centre, the chord is shorter. A chord of length `2·√(r² −
d²)` at offset `d` is jumped whenever it's shorter than the step, and solving
that for the smallest, fastest enemy (reach 2.04, step 3.67) gives `d > 0.89`.
Everything outside a 0.89-unit bullseye in a 2.04-unit target — **81 % of the
target's area** — can be tunnelled at 60 Hz. For the largest, slowest enemy the
number is 28 %. Some of the shots you're sure you landed, you didn't.

Now put the last row of the previous table beside this one. On a display that
dips to 30 fps, `dt` doubles, the step doubles to 6.2–7.3 units, and that is
longer than *any* chord through *any* enemy — every shot can miss. On a 120 Hz
display the step halves and the bullseye grows to most of the target. **Your
hit rate depends on your monitor.** That's a bug the `dt` rule cannot express,
because it's not about how *far* things move per frame; it's about what happens
*between* frames.

Two fixes are needed, and they arrive in different chapters. Chapter 02 makes
the step a constant — one number the collision code can reason about instead of
"whatever the display did this frame". Chapter 06 then tests the *segment* a
bolt travelled, not the point it arrived at, using a piece of state chapter 02
adds for an entirely different reason. Watch for that; it's the guide's first
example of one change paying for two.

---

## Things declared and never read

Three fields in the first guide exist so that a later chapter can use them. None
of them is used.

- **`Collider.layer` and `Collider.mask`** (`Components/Physics.swift`, lines
  5–6). Every collider carries what it *is* and what it *reacts to*, and
  `CollisionSystem` reads neither — it hard-codes the two pairs it cares about
  by iterating the `Enemy` and `Projectile` stores directly. The moment enemies
  shoot, there are five pairs and the hard-coding stops working. Chapter 06.
- **`Player.throttle`** (`Components/Gameplay.swift`, line 5) and
  **`InputState.throttle`** (`Input/InputState.swift`, line 8). The first
  guide's chapter 10 challenge. Chapter 04 implements it, as one axis of a
  larger change.

---

## The singular player

`Game` has a `player: Entity`, and it's passed by name to five systems:
`FlightControlSystem`, `WeaponSystem`, `EnemySystem`, `CollisionSystem` and
`CameraSystem` all take a `player:` argument. `GameStats` holds
`playerHealth` and `playerMaxHealth` as plain floats, while an enemy's health
lives in its `Enemy` component. `HUDSystem.build(stats:aspect:)` draws *the*
hull bar.

For one player that was the simplest thing, and the first guide said so. It is
also exactly the shape that makes a second player a rewrite: every one of those
`player:` parameters becomes a loop, every `stats.playerHealth` becomes a
component lookup, and the HUD needs to know *whose* hull it's drawing. Chapter
06 moves health onto a component that enemies and players share. Chapter 11
deletes the field, and proves the deletion with a second local player on the
same screen — before a single packet is sent.

---

## Randomness and order

`grep -n random` over the first guide's project finds ten lines: three in
`EnemySystem.spawn` (where an enemy appears), seven in `Archetypes/Enemy.swift`
(its size, its flavour, its scatter, its speed, its tumble). Every call uses
Swift's default generator, which is seeded by the operating system and cannot
be replayed.

That is fine for a game you only ever play forward. It rules out three things
this guide wants: **replaying** a recorded run to reproduce a bug or tune a
feel; **testing** that two runs of the same inputs produce the same world; and
**netcode** of any kind, where a client and a server must agree on what a seed
means. Chapter 02 replaces every one with a generator the `World` owns and a seed
you pass on the command line.

There's a quieter cousin. `World.entities` is a `Set<Entity>`
(`ECS/World.swift`, line 5). Nothing in the first guide iterates it — every
system walks a `ComponentStore.owners` array, whose order is deterministic — but
nothing *stops* a future system from iterating the set, and the order of a Swift
`Set` is not stable between runs. Chapter 02 writes the rule down and adds a
test that greps for violations, because a determinism bug that shows up once an
hour is the most expensive kind there is.

---

## What the first guide already told you

Chapter 15 of the first guide flagged four things as "the prerequisite for
later": a **fixed timestep** for physics and netcode, **entity generations** the
moment any system stores an `Entity` between frames, a **broad phase** when
collision stops being O(n²)-cheap, and **determinism** before any multiplayer.
It also said, of the last one, that retrofitting it is brutal.

This guide takes that advice literally. The fixed timestep and determinism are
chapter 02 — the first thing that changes, before any feature. Generations and
the broad phase are chapter 06, the first chapter that stores an entity across a
step. Nothing in chapters 07 through 11 is built on a footing that chapters 12
through 14 will have to dig up.

---

## The seams, in the order we open them

One line per chapter: what changes, and why it comes where it does.

| # | Changes | Comes here because |
| --- | --- | --- |
| 02 | `Game.update` becomes `advance`/`step`/`frame`; a `SimulationClock`; an `Rng`; `PreviousTransform` | everything after it is tuned against a constant step |
| 03 | `InputState` becomes `InputFrame`; sources and a mixer; a recorder | the flight model consumes the stick the keyboard now produces |
| 04 | `FlightControlSystem` rewritten around `AngularVelocity` and `FlightModel` | the reason you're here |
| 05 | `CameraSystem` gets a `CameraRig` with state; `Math.project` | the new flight model makes the old camera unusable |
| 06 | generations, `Health`/`Team`/`Owner`, swept spheres, a spatial hash, events | enemies that shoot need layers, health and kill credit first |
| 07 | AI, four archetypes, intercept aiming, waves, explosions | now there's something to fight |
| 08 | pickups, `Loadout`, missiles, shield, `ShipDefinition`, `RunStats` | now there's something to fight *for* |
| 09 | a glyph atlas and a textured HUD pipeline | menus need words |
| 10 | `Session`, screens, a menu world | a game needs a front door |
| 11 | `Game.player` deleted; `PlayerSlot`; viewports | netcode binds a client to a slot; prove slots work locally first |
| 12 | *(nothing — the design)* | read before writing the transport |
| 13 | `Net/`: transport, protocol, replication, server, client, loopback | prove it in one process with fake latency before touching sockets |
| 14 | UDP, discovery, lobby, modes, scoreboard | the last mile |

Each row is a chapter you can stop after and still have a better game than the
row before.

---

## If you skipped chapter 14

This guide assumes the first guide's `PipelineCache` is in place. Nothing here
edits `Render/RHI/Pipelines.swift` — chapter 09's text pipeline turns out to be
the same *kind* of pipeline and needs no change there — but chapter 09 does add
a few lines to `Renderer.init`, and it shows them under this context line:

```
cache.flush()
```

That line only exists with chapter 14 done. Without it, put chapter 09's
addition just before `self.rhi = rhi` instead; everything else in the guide is
the same either way. Or — simpler — do chapter 14 now. It's a single file and a
two-line wiring change, and it's the last thing this guide will ask of the
first.

---

## Checkpoint

From the first guide's project directory:

```console
$ swift build && swift test
Build complete!
✔ Test run with 2 tests in 0 suites passed
```

**Two tests pass** — the layer-boundary tests from the first guide's chapter
02. Then commit, so that every diff in this guide has a known base:

```console
$ git add -A && git commit -m "Guide one complete"
```

Check three things before moving on:

1. `Sources/SpaceFighter/Render/RHI/PipelineCache.swift` exists (chapter 14), or
   you've read the section above and know what to substitute.
2. `swift run` opens the game and enemies spawn. If the window opens and nothing
   ever appears, you stopped before the first guide's chapter 12.
3. There is no `.build/` in your commit — `swift package init` wrote a
   `.gitignore` for it in the first guide's chapter 01; if it's missing, add it
   now, because chapter 03 will write recordings you don't want committed
   either.

**If `swift test` finds no tests**, the `testTarget` in `Package.swift` is
missing its `path:` — the first guide's chapter 02 adds it. **If the build fails
in `Renderer.swift` on `cache`**, you applied chapter 14's `Pipelines` change
without its `Renderer` change; the chapter's "Wiring it in" section has both.

---

## Challenge

Measure the tunnelling before chapter 06 fixes it, so you'll know what "fixed"
looks like. Count shots and hits — a temporary `shots += 1` where
`WeaponSystem` spawns bolts, `hits += 1` where `CollisionSystem` destroys one,
both printed every few seconds — and fly a minute against the same seed of
enemies at 60 Hz. Then set `mtkView.preferredFramesPerSecond = 30` in
`main.swift` and fly the same minute. The two ratios should differ, and the
arithmetic above predicts by roughly how much. Two things make this
non-trivial: you have no seed yet (chapter 02), so "the same minute" is
approximate; and you have no way to replay your own flying (chapter 03), so the
comparison is only as good as your consistency. Note both — they are the first
two chapters' motivation, measured.

---

**Next:** a clock the display doesn't own. →
[Chapter 02: The simulation clock](02-the-simulation-clock.md)

---

*Back to the [guide map](../README.md) · references in [`resources.md`](../resources.md)*
