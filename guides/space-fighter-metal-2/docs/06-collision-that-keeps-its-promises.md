# 06 · Collision that keeps its promises 🛠️

> **You'll leave this chapter with:** entity handles that know when they've
> gone stale; one `Health` component for everything that can die; a collision
> system that tests the path a bolt travelled instead of the point it ended
> up at, finds candidates through a spatial hash instead of testing every pair,
> honours the layers and masks the first guide declared, and reports what it
> found as events; and a damage system that decides what those events mean.
>
> **Files created:** `Sources/SpaceFighter/Core/SpatialHash.swift`,
> `Systems/DamageSystem.swift`, `Tests/SpaceFighterTests/Ch06CollisionTests.swift`
> **Files changed:** `ECS/Entity.swift`, `ECS/World.swift`,
> `Systems/CollisionSystem.swift` (rewritten), `Components/Physics.swift`,
> `Components/Gameplay.swift`, `Archetypes/Player.swift`,
> `Archetypes/Enemy.swift`, `Archetypes/Projectile.swift`,
> `Systems/WeaponSystems.swift`, `Systems/HUDSystem.swift`, `Game.swift`,
> `GameView.swift`

Chapter 01 did the arithmetic: at 60 Hz a bolt crosses 3.1 to 3.7 units per
step, most of an enemy's cross-section is a shorter chord than that, and a
shot that should land passes clean through. Chapter 02 made the step a
constant so that arithmetic *stays* true instead of changing with the
display. This chapter fixes it. And because the fix needs the collision
system rewritten, the rewrite pays three other debts at the same time: the
layers nobody read, the `player:` parameter that assumes one player, and the
`stats.playerHealth` float that assumes the player is special.

Chapter 07 adds enemies that shoot. Every one of those changes is a
precondition for that.

---

## Handles that can go stale

This chapter stores an `Entity` inside another entity's component for the
first time — a bolt remembers who fired it, a ship remembers who hit it last.
The moment that happens, the first guide's chapter 05 warning comes due: an
`Entity` is just a number, numbers get reused, and a handle you kept from
three seconds ago may now name a completely different thing.

**`Sources/SpaceFighter/ECS/Entity.swift`** — replace the whole file:

```swift
import Foundation

/// A handle to an entity: which slot, and which occupant of that slot. Destroy
/// an entity and its slot is reused with the next generation, so an old handle
/// you kept fails every lookup instead of pointing at a stranger.
struct Entity: Hashable {
    let id: UInt32
    let generation: UInt32
}
```

Two numbers instead of one. `id` is the slot; `generation` is how many times
the slot has been reused. A handle is only valid while its generation matches
the slot's current one, and every lookup checks. The cost is four bytes per
handle and a comparison per lookup; the benefit is that "use after destroy"
becomes a `nil` instead of a corruption.

`World` grows the bookkeeping. Its top changes from a set of live entities to
parallel arrays indexed by slot, plus a list of free slots:

**`Sources/SpaceFighter/ECS/World.swift`**, in `World` — replace the stored
properties:

```swift
    /// The simulation's only source of randomness.
    var rng: Rng
    /// What happened this step. Cleared at the top of every step.
    var events: [GameEvent] = []

    private var generations: [UInt32] = []
    private var alive: [Bool] = []
    private var doomed: [Bool] = []
    private var free: [UInt32] = []
    private(set) var aliveCount = 0
    private var stores: [ObjectIdentifier: AnyComponentStore] = [:]
    private var pendingDestroy: [Entity] = []
```

`entities: Set<Entity>` is gone — it was the thing chapter 02's determinism
rules warned about, and now nothing could iterate it even by accident.
`events` is for later in this chapter; `GameEvent` doesn't exist yet.

**`World.swift`** — replace `createEntity`, `destroy`, `isAlive` and
`flushDestroyed`:

```swift
    func createEntity() -> Entity {
        let id: UInt32
        if let reused = free.popLast() {
            id = reused
        } else {
            id = UInt32(generations.count)
            generations.append(0)
            alive.append(false)
            doomed.append(false)
        }
        alive[Int(id)] = true
        doomed[Int(id)] = false
        aliveCount += 1
        return Entity(id: id, generation: generations[Int(id)])
    }

    /// Safe to call mid-iteration: this only queues the id.
    func destroy(_ entity: Entity) {
        guard isAlive(entity) else { return }
        doomed[Int(entity.id)] = true
        pendingDestroy.append(entity)
    }

    /// False for anything destroyed, including anything queued for destruction
    /// this step and not yet flushed.
    func isAlive(_ entity: Entity) -> Bool {
        let i = Int(entity.id)
        return i < generations.count && generations[i] == entity.generation && alive[i] && !doomed[i]
    }

    func flushDestroyed() {
        guard !pendingDestroy.isEmpty else { return }
        for e in pendingDestroy where alive[Int(e.id)] && generations[Int(e.id)] == e.generation {
            for store in stores.values {
                store.removeIfPresent(e)
            }
            let i = Int(e.id)
            alive[i] = false
            doomed[i] = false
            generations[i] &+= 1
            free.append(e.id)
            aliveCount -= 1
        }
        pendingDestroy.removeAll(keepingCapacity: true)
    }
```

A free list. Creating an entity pops a slot off it if there is one, otherwise
grows the arrays. Destroying marks the slot *doomed* at once — so `isAlive` is
false from the moment `destroy` is called, not from the flush — and the flush
pushes the slot back on the list *and bumps its generation*, so the old handle
stays dead after the slot is reused. The `where` clause in the flush handles
the same entity being queued twice in one step; the first pass clears
`alive`, the second finds it clear.

`stores.values` is a dictionary iteration inside the simulation. It's allowed
here for the reason chapter 02 gave for the spatial hash later: the order
doesn't matter, because removing an entity from store A then B leaves the
same world as B then A. Iteration order is only a determinism hazard when the
body of the loop *depends on* it.

**`World.swift`**, in `stateHash` — count what's alive:

```diff
-        mix(UInt32(entities.count))
+        mix(UInt32(aliveCount))
```

**`Sources/SpaceFighter/Game.swift`**, in `Game` — the placeholder gets a
generation:

```diff
-    private(set) var player: Entity = Entity(id: 0)
+    private(set) var player: Entity = Entity(id: 0, generation: 0)
```

The first guide's chapter 15 said to add generations "the moment a system
stores an `Entity` between frames". That moment is the `Owner` component two
sections from now, and adding them first means nothing ever exists in the
codebase that could have been a stale-handle bug.

---

## One health for everything

**`Sources/SpaceFighter/Components/Gameplay.swift`** — replace `Enemy`:

```swift
/// Marks a hostile entity.
struct Enemy {}

/// Anything that can be hurt and can die. Ships, enemies, later a boss.
struct Health {
    var current: Float
    var max: Float
    /// Who hurt this entity most recently, for kill credit.
    var lastHitBy: Entity?

    init(_ max: Float) {
        self.current = max
        self.max = max
    }
}

/// Which side an entity is on. Nothing hurts its own side.
struct Team: Equatable {
    var id: UInt8
    static let players = Team(id: 0)
    static let enemies = Team(id: 1)
}

/// Who fired a projectile, so a kill can be credited.
struct Owner {
    var entity: Entity
}
```

`Enemy` becomes a pure tag. Its health moves to a component that the player
also has, that a boss will have, and that a second player will have — one
system reduces it, one HUD draws it, and none of them care what kind of thing
is behind it. `Team` is a number rather than an enum so that chapter 14 can
have as many as it likes. `Owner` and `lastHitBy` are the two stored handles
the previous section was for.

**`Sources/SpaceFighter/Components/Physics.swift`**, in `Collider`:

```diff
     var layer: CollisionLayer
     var mask: CollisionLayer
+    /// Test the path travelled this step, not just the end point. For anything
+    /// fast enough to cross a target between two steps.
+    var swept: Bool = false
 }
```

**`Physics.swift`**, in `CollisionLayer`:

```diff
     static let projectile = CollisionLayer(rawValue: 1 << 2)
+    static let pickup     = CollisionLayer(rawValue: 1 << 3)
 }
```

The `pickup` layer is chapter 08's; it's declared now so the bit is
allocated. Then the three archetypes.

**`Sources/SpaceFighter/Archetypes/Player.swift`**, in `spawnPlayer`:

```diff
     world.add(Player(), to: e)
+    world.add(Health(100), to: e)
+    world.add(Team.players, to: e)
     world.add(Weapon(), to: e)
     world.add(Renderable(mesh: .ship, color: Vec4(0.82, 0.9, 1.0, 1)), to: e)
-    world.add(Collider(radius: 1.3, layer: .player, mask: .enemy), to: e)
+    world.add(Collider(radius: 1.3, layer: .player, mask: [.enemy, .projectile]), to: e)
```

**`Sources/SpaceFighter/Archetypes/Enemy.swift`**, in `spawnEnemy`:

```diff
     world.add(transform, to: enemy)
-    world.add(Enemy(health: 1), to: enemy)
-    world.add(Collider(radius: transform.scale.x * 0.9, layer: .enemy, mask: .player), to: enemy)
+    world.add(Enemy(), to: enemy)
+    world.add(Health(1), to: enemy)
+    world.add(Team.enemies, to: enemy)
+    world.add(
+        Collider(radius: transform.scale.x * 0.9, layer: .enemy, mask: [.player, .projectile]),
+        to: enemy)
```

**`Sources/SpaceFighter/Archetypes/Projectile.swift`** — replace
`spawnProjectile`, doc comment and all:

```swift
/// A bolt: where it is, where it's going, whose it is.
@discardableResult
func spawnProjectile(in world: World, at transform: Transform, velocity: Vec3, owner: Entity) -> Entity {
    let bolt = world.createEntity()
    world.add(transform, to: bolt)
    // Fired mid-step, after the snapshot: give it a "previous" of its own, so
    // the collision system sweeps its first step from the muzzle.
    world.add(PreviousTransform(position: transform.position, rotation: transform.rotation), to: bolt)
    world.add(Velocity(linear: velocity), to: bolt)
    world.add(Renderable(mesh: .projectile, color: Vec4(0.5, 1.0, 0.85, 1)), to: bolt)
    world.add(Projectile(damage: 1), to: bolt)
    world.add(Owner(entity: owner), to: bolt)
    world.add(world.get(Team.self, owner) ?? .players, to: bolt)
    world.add(Collider(radius: 0.6, layer: .projectile, mask: .enemy, swept: true), to: bolt)
    world.add(Lifetime(remaining: 2.4), to: bolt)
    return bolt
}
```

A bolt now knows who fired it, is on their team, and is *swept*. The masks
read the way the first guide intended them to: a player reacts to enemies and
projectiles, an enemy reacts to players and projectiles, a bolt reacts to
enemies. The collision system below tests a pair if *either* side's mask
contains the other's layer, so a bolt-versus-enemy pair is found from the
bolt's side and an enemy-versus-player pair from both.

It also carries a `PreviousTransform` of its own from the moment it exists. The
gun fires *inside* a step, after `snapshotTransforms` has already run, so a
fresh bolt would otherwise have no start point for its first step; the swept
test below would quietly fall back to a point test at the end of that step,
and a shot fired point-blank could pass straight through — the very miss this
chapter exists to remove. One line in the archetype, and the first step is
swept from the muzzle like every step after it.

**`Sources/SpaceFighter/Systems/WeaponSystems.swift`**, in `update` and
`fireBolt` — the gun says whose bolts they are:

```diff
-            fireBolt(world, from: ship, offset: ship.right * 0.9, speed: weapon.muzzleSpeed)
-            fireBolt(world, from: ship, offset: -ship.right * 0.9, speed: weapon.muzzleSpeed)
+            fireBolt(world, from: ship, offset: ship.right * 0.9, speed: weapon.muzzleSpeed, owner: player)
+            fireBolt(world, from: ship, offset: -ship.right * 0.9, speed: weapon.muzzleSpeed, owner: player)
```

```diff
-    private static func fireBolt(_ world: World, from ship: Transform, offset: Vec3, speed: Float) {
+    private static func fireBolt(
+        _ world: World, from ship: Transform, offset: Vec3, speed: Float, owner: Entity
+    ) {
```

```diff
-        spawnProjectile(in: world, at: transform, velocity: ship.forward * speed)
+        spawnProjectile(in: world, at: transform, velocity: ship.forward * speed, owner: owner)
```

---

## Events

The first guide's collision system did everything in one loop: found the
pair, subtracted health, destroyed the bolt, bumped the score, set the flash.
That's four decisions inside a function whose job is geometry, and every new
kind of collision — enemy bolt hits player, player picks something up, two
ships ram — would add another branch to it.

The alternative is for collision to *report* and for something else to
*decide*. The report is an event.

**`Sources/SpaceFighter/ECS/World.swift`** — before `World`:

```swift
/// Something that happened during a step, for other systems and for the
/// presentation to react to. Simulation appends; nobody else does.
enum GameEvent {
    case collision(Entity, Entity)
    case damaged(Entity, amount: Float, by: Entity?)
    case died(Entity, killer: Entity?)
}
```

Three kinds. `collision` is what the collision system produces and the
damage system consumes. `damaged` and `died` are what the damage system
produces and — this chapter — the presentation consumes; chapter 07 adds
explosions and chapter 08 adds drops as further consumers of `died`, and
neither touches the damage system to do it.

`world.events` was declared with the other properties above. It's an array,
appended in system order, cleared at the top of each step, so within a step
a later system sees everything an earlier one reported. Across the
step-to-frame boundary it needs a second home, because a display frame may
run two steps or none:

**`Sources/SpaceFighter/Game.swift`**, in `Game` — after `player`:

```diff
     private(set) var player: Entity = Entity(id: 0, generation: 0)
+    /// Events from every step since the last frame, for the presentation.
+    private(set) var effects: [GameEvent] = []
     private(set) var clock = SimulationClock()
```

**`Game.swift`** — replace the body of `step`:

```swift
    func step(input: InputFrame, dt: Float) {
        world.snapshotTransforms()
        world.events.removeAll(keepingCapacity: true)

        FlightControlSystem.update(world, player: player, input: input, dt: dt)
        WeaponSystem.update(world, player: player, input: input, dt: dt)
        EnemySystem.update(world, player: player, director: director, dt: dt)
        MovementSystem.update(world, dt: dt)
        SpinSystem.update(world, dt: dt)
        LifetimeSystem.update(world, dt: dt)
        CollisionSystem.update(world)
        DamageSystem.update(world, stats: stats)

        world.flushDestroyed()
        effects.append(contentsOf: world.events)

        if let h = world.get(Health.self, player), h.current <= 0 {
            respawn()
        }
    }
```

Two things changed in the schedule. `CollisionSystem` lost its `player:` and
`stats:` — it no longer knows either exists — and `DamageSystem` follows it.
And after the flush, this step's events are copied onto `effects`, which
accumulates until the next frame reads it.

**`Game.swift`**, in `frame` — the presentation reads and clears them:

```diff
         let alpha = clock.alpha
         stats.hitFlash = max(0, stats.hitFlash - realDt)
+        for case .damaged(let e, _, _) in effects where e == player {
+            stats.hitFlash = 0.5
+            stats.pendingShake = 1
+        }
+        effects.removeAll(keepingCapacity: true)
         CameraSystem.update(
```

That's chapter 05's stopgap, retired. `CollisionSystem` used to write
`hitFlash` and `pendingShake` directly; now nothing in the simulation knows
those fields exist. The simulation says *the player was damaged* and the
presentation decides that means a flash and a shake. Add a sound in chapter
15 and it's one more line here, not one more field in `GameStats`.

**`Game.swift`**, in `GameStats` — the player's health is a component now:

```diff
 final class GameStats {
     var score = 0
     var deaths = 0
-    var playerHealth: Float = 100
-    var playerMaxHealth: Float = 100
+    // Presentation: set from this frame's events, read by the HUD and camera.
     var hitFlash: Float = 0      // seconds of red flash remaining
-    var pendingShake: Float = 0  // 0…1, set by the simulation, consumed by the camera
+    var pendingShake: Float = 0  // 0…1
 }
```

**`Game.swift`**, in `frame` — the HUD is told the hull fraction:

```diff
             hud: HUDSystem.build(
-                stats: stats, aspect: max(aspect, 0.01),
+                stats: stats, hull: hullFraction(), aspect: max(aspect, 0.01),
                 reticle: reticle(viewProjection: viewProjection, alpha: alpha),
```

**`Game.swift`**, in `Game` — before `reticle`:

```diff
+    private func hullFraction() -> Float {
+        guard let h = world.get(Health.self, player) else { return 0 }
+        return max(0, min(h.current / h.max, 1))
+    }
+
     /// Where the nose points and where the ship is actually going, on screen.
```

**`Game.swift`**, in `respawn`:

```diff
     private func respawn() {
-        stats.playerHealth = stats.playerMaxHealth
+        world.add(Health(100), to: player)
         stats.deaths += 1
```

**`Sources/SpaceFighter/Systems/HUDSystem.swift`**, in `build`:

```diff
     static func build(
-        stats: GameStats, aspect: Float, reticle: Reticle = Reticle(), flight: FlightDebug? = nil
+        stats: GameStats, hull: Float, aspect: Float, reticle: Reticle = Reticle(),
+        flight: FlightDebug? = nil
     ) -> [HUDVertex] {
```

```diff
-        let frac = max(0, min(stats.playerHealth / stats.playerMaxHealth, 1))
+        let frac = hull
```

**`Sources/SpaceFighter/GameView.swift`**, in `draw` — the window title loses
the field that no longer exists:

```diff
         view.window?.title = String(
-            format: "Space Fighter — Score %d    Hull %.0f%%    Deaths %d",
-            game.stats.score, max(0, game.stats.playerHealth), game.stats.deaths)
+            format: "Space Fighter — Score %d    Deaths %d",
+            game.stats.score, game.stats.deaths)
```

The hull bar still shows it; chapter 09 puts the number back, on screen.

---

## The path, not the point

Now the geometry. A sphere test asks "is the bolt inside the target *now*?"
A swept test asks "was the bolt inside the target *at any moment since the
last step*?" — and since the bolt moved in a straight line, that's the
question of whether a line segment passes within a radius of a point.

**`Sources/SpaceFighter/Systems/CollisionSystem.swift`** — replace the whole
file:

```swift
import simd

/// Finds every pair of colliders that touch this step and reports each one as
/// an event. It decides nothing about what a touch means; that is the damage
/// system's job.
enum CollisionSystem {
    static let cellSize: Float = 8

    private struct Body {
        let entity: Entity
        let collider: Collider
        let center: Vec3
        let previous: Vec3
        var lo: Vec3
        var hi: Vec3
    }
}
```

A `Body` is everything the tests need about one collider, gathered once:
where it is, where it was, and the box that contains both. `previous` is
chapter 02's `PreviousTransform` — the state added so the renderer could
interpolate, and it turns out to be exactly "where was this at the start of
the step", which is the other end of the segment. One change paying for two,
as chapter 01 promised.

**`CollisionSystem.swift`**, in `CollisionSystem` — after `Body`:

```diff
         var hi: Vec3
     }
+
+    /// Does the segment from `p0` to `p1` pass within `radius` of `center`?
+    /// The closest point on the segment to the centre is the whole question.
+    private static func segmentHitsSphere(_ p0: Vec3, _ p1: Vec3, _ center: Vec3, _ radius: Float) -> Bool {
+        let d = p1 - p0
+        let lengthSquared = simd_length_squared(d)
+        var t: Float = 0
+        if lengthSquared > 0 {
+            t = min(max(simd_dot(center - p0, d) / lengthSquared, 0), 1)
+        }
+        let closest = p0 + d * t
+        return simd_length_squared(center - closest) <= radius * radius
+    }
 }
```

Project the sphere's centre onto the segment's line — `dot / lengthSquared`
gives how far along, as a fraction — clamp that to the segment's ends, and
the point you get is the closest the bolt ever came. If *that* point is within
reach, the bolt hit, no matter how fast it was going. The `lengthSquared > 0`
guard is for a bolt that didn't move, which makes the segment a point and the
test a plain sphere test.

**`CollisionSystem.swift`**, in `CollisionSystem` — before `segmentHitsSphere`:

```diff
+    /// Sphere against sphere, or — if one of them is swept — the segment it
+    /// travelled this step against the other's sphere.
+    private static func touches(_ a: Body, _ b: Body) -> Bool {
+        let reach = a.collider.radius + b.collider.radius
+        if a.collider.swept {
+            return segmentHitsSphere(a.previous, a.center, b.center, reach)
+        }
+        if b.collider.swept {
+            return segmentHitsSphere(b.previous, b.center, a.center, reach)
+        }
+        return simd_length_squared(a.center - b.center) <= reach * reach
+    }
+
     /// Does the segment from `p0` to `p1` pass within `radius` of `center`?
```

If both are swept, the first one is treated as moving and the second as
still. That's an approximation — two bolts passing each other at speed could
in principle miss — and it's deliberately left there, because the alternative
is segment-against-segment and nothing in this game needs it. The challenge
at the end is about exactly this.

---

## Neighbours, not everyone

The first guide tested every bolt against every enemy: forty bolts times
twenty-two enemies is nearly nine hundred tests a step, which is nothing. Chapter 07
adds enemy bolts, chapter 14 adds ten ships each with their own; the pair
count grows with the square. The standard fix is to stop asking "does A touch
B" for every B and start asking "what's *near* A".

**`Sources/SpaceFighter/Core/SpatialHash.swift`** — new file:

```swift
import simd

/// A uniform grid over the world, rebuilt every step: each item is filed under
/// every cell its bounds touch, and a query visits the cells a box touches.
/// Cheap to build, cheap to ask, and it turns "test everything against
/// everything" into "test everything against its neighbours".
struct SpatialHash {
    private struct Cell: Hashable {
        let x: Int32
        let y: Int32
        let z: Int32
    }

    let cellSize: Float
    private var cells: [Cell: [Int]] = [:]

    init(cellSize: Float) {
        self.cellSize = cellSize
    }

    mutating func removeAll() {
        cells.removeAll(keepingCapacity: true)
    }
}
```

The world is cut into cubes of `cellSize`, each cube maps to a list of the
items whose bounds overlap it, and the map is a dictionary keyed by cube
coordinate. Items are plain `Int`s — indices into whatever array the caller
keeps — so the hash knows nothing about entities.

This is a `Dictionary` in the simulation, and chapter 02's rule says
simulation doesn't iterate dictionaries. It doesn't: the hash is only ever
*queried* by cell, and a query visits the cells a box covers in a fixed
order. The dictionary's own order is never observed. That's the distinction
the rule is really about.

**`SpatialHash.swift`**, in `SpatialHash` — after `removeAll`:

```diff
         cells.removeAll(keepingCapacity: true)
     }
+
+    mutating func insert(_ item: Int, min lo: Vec3, max hi: Vec3) {
+        forEachCell(min: lo, max: hi) { cells[$0, default: []].append(item) }
+    }
+
+    /// Every item filed in a cell the box touches. Items spanning several
+    /// cells are reported once per cell; callers dedupe.
+    func query(min lo: Vec3, max hi: Vec3, _ body: (Int) -> Void) {
+        forEachCell(min: lo, max: hi) { cell in
+            for item in cells[cell] ?? [] { body(item) }
+        }
+    }
+
+    private func forEachCell(min lo: Vec3, max hi: Vec3, _ body: (Cell) -> Void) {
+        let a = (lo / cellSize).rounded(.down)
+        let b = (hi / cellSize).rounded(.down)
+        var z = Int32(a.z)
+        while z <= Int32(b.z) {
+            var y = Int32(a.y)
+            while y <= Int32(b.y) {
+                var x = Int32(a.x)
+                while x <= Int32(b.x) {
+                    body(Cell(x: x, y: y, z: z))
+                    x += 1
+                }
+                y += 1
+            }
+            z += 1
+        }
+    }
 }
```

`forEachCell` walks the integer cube coordinates a box spans, z outermost,
which is what makes a query's visiting order fixed. `rounded(.down)` is
floor, and it matters that it's floor rather than truncation: a box at
−0.5 is in cell −1, not cell 0.

The cell size is eight units. Enemies are up to five across and a bolt sweeps
under four per step, so almost every item lands in one or two cells, and a
query for a bolt touches two or four. Make the cells much smaller and every
item spans many cells and the dedupe work grows; much larger and each cell
holds too many items and you're back to testing everyone. Eight is a guess
that the shapes in this game make reasonable. It's a `static let` on the
collision system, and the first time the frame time budget says otherwise,
it's one number.

---

## Collision reports, damage decides

**`CollisionSystem.swift`**, in `CollisionSystem` — before `touches`:

```diff
+    static func update(_ world: World) {
+        let transforms = world.store(Transform.self)
+        let previous = world.store(PreviousTransform.self)
+        let colliders = world.store(Collider.self)
+
+        var bodies: [Body] = []
+        bodies.reserveCapacity(colliders.count)
+        for (i, entity) in colliders.owners.enumerated() {
+            guard let t = transforms.get(entity) else { continue }
+            let c = colliders.items[i]
+            let from = c.swept ? (previous.get(entity)?.position ?? t.position) : t.position
+            let r = Vec3(repeating: c.radius)
+            bodies.append(Body(
+                entity: entity, collider: c, center: t.position, previous: from,
+                lo: simd_min(from, t.position) - r, hi: simd_max(from, t.position) + r))
+        }
+
+        var hash = SpatialHash(cellSize: cellSize)
+        for (i, b) in bodies.enumerated() { hash.insert(i, min: b.lo, max: b.hi) }
+    }
+
     /// Sphere against sphere, or — if one of them is swept — the segment it
```

One pass over the `Collider` store builds the bodies — every collider, of
every kind, with no mention of `Enemy` or `Projectile` — and a second files
them in the hash. A swept body's box covers the whole segment plus its
radius, so a fast bolt is found by everything along its path.

**`CollisionSystem.swift`**, in `update` — after the hash is built:

```diff
         for (i, b) in bodies.enumerated() { hash.insert(i, min: b.lo, max: b.hi) }
+
+        var seen = Set<UInt64>()
+        for (i, a) in bodies.enumerated() {
+            hash.query(min: a.lo, max: a.hi) { j in
+                guard j > i else { return }
+                let key = UInt64(i) << 32 | UInt64(j)
+                guard !seen.contains(key) else { return }
+                seen.insert(key)
+                let b = bodies[j]
+                guard a.collider.mask.contains(b.collider.layer)
+                    || b.collider.mask.contains(a.collider.layer)
+                else { return }
+                if touches(a, b) {
+                    world.events.append(.collision(a.entity, b.entity))
+                }
+            }
+        }
     }
```

For each body, ask the hash what's nearby, and test each candidate once.
`j > i` halves the work — the pair (3, 7) is tested from 3's side and skipped
from 7's — and `seen` handles the pair that shows up in two cells at once. The
set is a `Set` in the simulation and it's fine: it's a membership test, never
iterated. Then the masks, then the geometry, then an event. Nothing else.

**`Sources/SpaceFighter/Systems/DamageSystem.swift`** — new file:

```swift
import simd

/// Decides what a collision means. Reads this step's collision events and
/// writes damage and death events; the only system that changes Health.
enum DamageSystem {
    static let ramDamage: Float = 20
    static let killScore = 100

    static func update(_ world: World, stats: GameStats) {
        let collisions = world.events
        for case .collision(let a, let b) in collisions {
            resolve(a, b, world: world)
            resolve(b, a, world: world)
        }
    }
}
```

`collisions` is a copy of the event array before the loop starts, because
the loop appends to `world.events` and Swift won't let you iterate an array
you're mutating. Each collision is resolved both ways round, so `resolve` only
has to think about "`a` hits `b`".

**`DamageSystem.swift`**, in `DamageSystem` — after `update`:

```diff
     }
+
+    /// `a` hits `b`. Called both ways round for every collision.
+    private static func resolve(_ a: Entity, _ b: Entity, world: World) {
+        guard world.isAlive(a), world.isAlive(b) else { return }
+        let sameTeam = world.get(Team.self, a)?.id == world.get(Team.self, b)?.id
+
+        if let bolt = world.get(Projectile.self, a) {
+            guard !sameTeam, world.get(Health.self, b) != nil else { return }
+            hurt(b, by: world.get(Owner.self, a)?.entity, amount: Float(bolt.damage), world: world)
+            world.destroy(a)
+        } else if world.get(Projectile.self, b) == nil, world.get(Health.self, a) != nil,
+            world.get(Health.self, b) != nil, !sameTeam
+        {
+            hurt(b, by: a, amount: ramDamage, world: world)
+        }
+    }
+
+    private static func hurt(_ target: Entity, by source: Entity?, amount: Float, world: World) {
+        world.store(Health.self).mutate(target) { h in
+            h.current -= amount
+            h.lastHitBy = source
+        }
+        world.events.append(.damaged(target, amount: amount, by: source))
+    }
 }
```

Two rules, and they're the whole combat model. A projectile hitting something
with health on another team does its damage and is spent — credited to its
owner, not to itself. Two things with health on different teams, neither a
projectile, are ramming, and each takes twenty from the other (this is the
second `resolve` call doing the "each"). Same team, nothing happens — which
is why a player's own bolts, which leave the muzzle inside the player's
collider, don't shoot the player.

`world.isAlive` at the top is the `doomed` flag paying off already: a bolt
that hit two enemies in one step is destroyed by the first resolve and skipped
by the second, because `destroy` makes `isAlive` false immediately rather
than at the flush.

**`DamageSystem.swift`**, in `update` — after the collision loop:

```diff
             resolve(b, a, world: world)
         }
+
+        // Anything that ran out of health this step dies, once.
+        let healths = world.store(Health.self)
+        for (i, entity) in healths.owners.enumerated() where healths.items[i].current <= 0 {
+            guard world.isAlive(entity) else { continue }
+            let killer = healths.items[i].lastHitBy
+            world.events.append(.died(entity, killer: killer))
+            if world.get(Enemy.self, entity) != nil { stats.score += killScore }
+            if world.get(Player.self, entity) == nil { world.destroy(entity) }
+        }
     }
```

Death is a separate pass over the health store rather than a check inside
`hurt`, so an entity hit twice in one step dies once. Enemies score; players
aren't destroyed, because `Game.step` respawns them — the one place the damage
system still knows players are special, and chapter 10 takes it away when a
run can end.

---

## The tests

**`Tests/SpaceFighterTests/Ch06CollisionTests.swift`** — new file:

```swift
import Testing
import simd

@testable import SpaceFighter

private let dt = SimulationClock.step

@Test func aRecycledIdIsANewEntity() {
    let world = World(seed: 1)
    let first = world.createEntity()
    world.add(Transform(), to: first)
    world.destroy(first)
    world.flushDestroyed()
    let second = world.createEntity()
    #expect(second.id == first.id, "the slot is reused")
    #expect(second != first, "but the handle is not")
    #expect(!world.isAlive(first))
    #expect(world.isAlive(second))
    #expect(world.get(Transform.self, first) == nil, "a stale handle finds nothing")
}
```

The last expectation is the one that matters: `get` with the old handle
returns `nil` even though the slot is live again, because the `ComponentStore`
dictionary is keyed by the whole `Entity`, generation included.

**`Ch06CollisionTests.swift`** — after `aRecycledIdIsANewEntity`:

```swift
/// An enemy dead ahead, a bolt 1.8 units off its centre closing at 220 u/s:
/// 3.7 units per step through a 1.9-unit chord. Chapter 01's arithmetic said
/// this shot passes straight through. Now it doesn't.
@Test func aFastOffCentreBoltStillHits() {
    let game = Game(seed: 1)
    let world = game.world
    let enemy = world.createEntity()
    var et = Transform()
    et.position = Vec3(0, 0, -20)
    world.add(et, to: enemy)
    world.add(Enemy(), to: enemy)
    world.add(Health(1), to: enemy)
    world.add(Team.enemies, to: enemy)
    world.add(Collider(radius: 1.44, layer: .enemy, mask: [.player, .projectile]), to: enemy)

    var bt = Transform()
    bt.position = Vec3(1.8, 0, 0)
    let bolt = spawnProjectile(in: world, at: bt, velocity: Vec3(0, 0, -220), owner: game.player)
    // Prove the geometry is what the comment says.
    let reach: Float = 1.44 + 0.6
    #expect(reach * reach - 1.8 * 1.8 < (220 * dt / 2) * (220 * dt / 2), "the chord is shorter than the step")

    for _ in 0..<12 { game.step(input: InputFrame(), dt: dt) }
    #expect(!world.isAlive(enemy))
    #expect(!world.isAlive(bolt))
    #expect(game.stats.score == 100)
}
```

This is chapter 01's arithmetic as a test. The `#expect` in the middle isn't
testing the code; it's testing the *test* — proving that the shot it sets up
is one the old code would have missed, so that the assertions after it mean
something.

**`Ch06CollisionTests.swift`** — after `aFastOffCentreBoltStillHits`:

```swift
/// The gun fires *inside* a step, after the transforms were snapshotted, so a
/// fresh bolt has no "previous" of its own unless the archetype gives it one.
/// A small target on the first step of the bolt's path, too far from either
/// end of that step for a point test to find it, catches the difference.
@Test func aBoltHitsOnTheStepItIsFired() {
    var fire = InputFrame()
    fire.buttons = [.fire]
    // Where does a fresh game's first bolt go on its first step? Ask one game...
    let probe = Game(seed: 1)
    probe.step(input: fire, dt: dt)
    let bolt = probe.world.store(Projectile.self).owners.first!
    let end = probe.world.get(Transform.self, bolt)!.position
    let flight = probe.world.get(Velocity.self, bolt)!.linear * dt
    let muzzle = end - flight

    // ...and put a target halfway along that step in another.
    let game = Game(seed: 1)
    let world = game.world
    let target = world.createEntity()
    var tt = Transform()
    tt.position = muzzle + flight / 2
    world.add(tt, to: target)
    world.add(Enemy(), to: target)
    world.add(Health(1), to: target)
    world.add(Team.enemies, to: target)
    world.add(Collider(radius: 0.3, layer: .enemy, mask: [.player, .projectile]), to: target)
    #expect(simd_length(flight) / 2 > 0.3 + 0.6, "neither end of the step is within reach")

    game.step(input: fire, dt: dt)
    #expect(!world.isAlive(target), "the bolt's first step counts")
}
```

The first game is a probe: fire once, and read back where the bolt's first
step went — its end position and the distance it covered. The second game puts
a target halfway along that step, with a reach smaller than half the step, so
that neither end of the step is inside it. Only the segment finds it. Without
the `PreviousTransform` the archetype now adds, this test fails; with it, a
point-blank shot lands.

**`Ch06CollisionTests.swift`** — after `aBoltHitsOnTheStepItIsFired`:

```swift
@Test func layersKeepEnemyBoltsOffEnemies() {
    let game = Game(seed: 1)
    let world = game.world
    let enemy = world.createEntity()
    var et = Transform()
    et.position = Vec3(0, 0, -20)
    world.add(et, to: enemy)
    world.add(Enemy(), to: enemy)
    world.add(Health(1), to: enemy)
    world.add(Team.enemies, to: enemy)
    world.add(Collider(radius: 2, layer: .enemy, mask: [.player, .projectile]), to: enemy)

    var bt = Transform()
    bt.position = Vec3(0, 0, -10)
    let bolt = spawnProjectile(in: world, at: bt, velocity: Vec3(0, 0, -100), owner: enemy)
    world.store(Collider.self).mutate(bolt) { $0.mask = .player }  // an enemy's bolt

    for _ in 0..<20 { game.step(input: InputFrame(), dt: dt) }
    #expect(world.isAlive(enemy))
}
```

A bolt fired *by* the enemy, straight at another point on the enemy. The
enemy's mask contains `.projectile`, so the pair is found — and then the
damage system sees the same team and does nothing. This is the test chapter
07 will lean on the moment enemies fire.

**`Ch06CollisionTests.swift`** — after `layersKeepEnemyBoltsOffEnemies`:

```swift
@Test func aHitProducesEventsThePresentationCanRead() {
    let game = Game(seed: 1)
    let world = game.world
    let enemy = world.createEntity()
    var et = Transform()
    et.position = Vec3(0, 0, -3)  // inside the player's collider next step
    world.add(et, to: enemy)
    world.add(Enemy(), to: enemy)
    world.add(Health(1), to: enemy)
    world.add(Team.enemies, to: enemy)
    world.add(Collider(radius: 2, layer: .enemy, mask: [.player, .projectile]), to: enemy)

    game.step(input: InputFrame(), dt: dt)
    var sawDamage = false
    var sawDeath = false
    for event in game.effects {
        if case .damaged(let e, _, _) = event, e == game.player { sawDamage = true }
        if case .died(let e, _) = event, e == enemy { sawDeath = true }
    }
    #expect(sawDamage && sawDeath)
    #expect(world.get(Health.self, game.player)!.current == 80)

    _ = game.frame(aspect: 1.6, realDt: 1.0 / 60.0)
    #expect(game.stats.hitFlash > 0)
    #expect(game.effects.isEmpty, "consumed by the frame")
}

@Test func spatialHashOnlyPairsNeighbours() {
    var hash = SpatialHash(cellSize: 8)
    hash.insert(0, min: Vec3(0, 0, 0), max: Vec3(1, 1, 1))
    hash.insert(1, min: Vec3(3, 0, 0), max: Vec3(4, 1, 1))
    hash.insert(2, min: Vec3(100, 0, 0), max: Vec3(101, 1, 1))
    var near: [Int] = []
    hash.query(min: Vec3(0, 0, 0), max: Vec3(1, 1, 1)) { near.append($0) }
    #expect(near.contains(1))
    #expect(!near.contains(2))
}
```

---

## Checkpoint

```console
$ swift test
✔ Test run with 35 tests in 0 suites passed
```

**Thirty-five tests.** Then play, and this time keep a rough count:

1. **Shots land.** Fire at the small fast ones from range. The first guide's
   version missed a good share of these; this one doesn't. If you did chapter
   01's challenge, run the same minute now.
2. **Ramming still costs twenty.** Fly into an enemy: it dies, the bar drops
   a fifth, the screen flashes and shakes — via events now, and it looks
   identical, which is the point.
3. **Score still counts once per kill.** A cluster shot with a spread of
   bolts doesn't double-count.
4. **The title bar has lost the hull percentage.** Expected; it comes back on
   screen in chapter 09.

**If nothing collides at all**, `DamageSystem` isn't in the schedule after
`CollisionSystem`, or the masks in an archetype are missing `.projectile`.
**If bolts hit the player**, the bolt isn't being given the owner's `Team` —
check `spawnProjectile`. **If one bolt kills two overlapping enemies** (score
jumps 200 from a single shot), `destroy` isn't setting `doomed`, so the second
`resolve` still sees a live bolt. **If `stateHash` tests fail**,
`aliveCount` isn't being maintained in both `createEntity` and
`flushDestroyed`.

---

## Challenge

Make the swept test symmetric. When both bodies are swept, find the closest
approach of two moving points over the step — both travel in straight lines,
so the distance between them is a quadratic in time, and its minimum is one
formula — and test *that* against the combined radius. Two things to get
right: the minimum may fall outside the step, so clamp the time to 0…1 before
you use it; and it needs a test that the current code fails — two bolts on
converging paths that are apart at the start of the step, apart at the end,
and touching in the middle. Chapter 07's enemy bolts are swept too, so from
then on this case is real.

---

**Next:** enemies with guns, and a director that sends them in waves. →
[Chapter 07: Enemies that shoot back](07-enemies-that-shoot-back.md)

---

*Back to the [guide map](../README.md) · references in [`resources.md`](../resources.md)*
