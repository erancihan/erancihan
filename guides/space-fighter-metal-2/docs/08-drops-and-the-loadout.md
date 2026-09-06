# 08 · Drops and the loadout 🛠️

> **You'll leave this chapter with:** enemies that sometimes leave a glowing
> cube behind; a loadout that grows as you fly through them — faster fire, a
> wider spread, heavier bolts, homing missiles, a shield that eats hits —
> three ships to start a run in; and a run that ends when your hull does and
> hands you the numbers.
>
> **Files created:** `Sources/SpaceFighter/Components/Loadout.swift`,
> `Content/Ships.swift`, `Archetypes/Pickup.swift`, `Archetypes/Missile.swift`,
> `Systems/PickupSystem.swift`, `Systems/DropSystem.swift`,
> `Tests/SpaceFighterTests/Ch08LoadoutTests.swift`
> **Files changed:** `Systems/WeaponSystems.swift` (rewritten),
> `Systems/HomingSystem.swift` (rewritten), `Systems/DamageSystem.swift`,
> `Systems/EnemyWeaponSystem.swift`, `Systems/HUDSystem.swift`,
> `Components/Gameplay.swift`, `Components/AI.swift`, `ECS/World.swift`,
> `Archetypes/Player.swift`, `Archetypes/Enemy.swift`,
> `Archetypes/Projectile.swift`, `Input/InputLog.swift`, `Game.swift`,
> `GameView.swift`, `main.swift`,
> `Tests/SpaceFighterTests/Ch06CollisionTests.swift`,
> `Tests/SpaceFighterTests/Ch07EnemyTests.swift`

Chapter 07 gave you something to fight. This chapter gives you something to
fight *for*: a ship that gets better as the run goes on, and a run that can
be lost. The two are the same feature. Without the loss, the upgrades are
just a difficulty curve going the other way; without the upgrades, the loss
is just a restart.

This is a **roguelike**, not a roguelite, and the distinction is a file. A
roguelite carries something between runs — currency, unlocks, a hangar full
of ships you've earned — and needs somewhere to keep it. This game carries
nothing. Every run starts with the ship you picked and the loadout it comes
with, and everything you find is gone when you die. No save file, no
persistence, no account. Chapter 15 says where you'd add one; this chapter
is built so that you don't have to.

---

## What a run owns

**`Sources/SpaceFighter/Components/Loadout.swift`** — new file:

```swift
import simd

/// What a pickup gives you.
enum UpgradeKind: UInt8, CaseIterable {
    case rapidFire
    case spread
    case damage
    case missiles
    case shield

    var color: Vec4 {
        switch self {
        case .rapidFire: return Vec4(0.4, 1.0, 0.9, 1)
        case .spread: return Vec4(1.0, 0.9, 0.3, 1)
        case .damage: return Vec4(1.0, 0.4, 0.3, 1)
        case .missiles: return Vec4(1.0, 0.6, 0.2, 1)
        case .shield: return Vec4(0.5, 0.7, 1.0, 1)
        }
    }
}
```

Five upgrades. The colour lives on the kind because a pickup, a HUD pip and
a missile all want to agree on what "shield" looks like, and the only thing
worse than a magic colour is five copies of it.

**`Loadout.swift`** — after `UpgradeKind`:

```swift
/// Simulation. Everything a run has bolted onto the ship so far. Reset when
/// the run ends; there is no save file, on purpose.
struct Loadout {
    var fireInterval: Float = 0.14
    var boltCount: Int = 2
    var damage: Int = 1
    var missiles: Int = 0
    var shield: Int = 0

    static let minFireInterval: Float = 0.06
    static let maxBolts = 5
    static let maxDamage = 3
    static let maxMissiles = 6
    static let maxShield = 3

    mutating func apply(_ upgrade: UpgradeKind) {
        switch upgrade {
        case .rapidFire: fireInterval = max(Self.minFireInterval, fireInterval * 0.8)
        case .spread: boltCount = min(Self.maxBolts, boltCount + 1)
        case .damage: damage = min(Self.maxDamage, damage + 1)
        case .missiles: missiles = min(Self.maxMissiles, missiles + 2)
        case .shield: shield = min(Self.maxShield, shield + 1)
        }
    }
}

/// Simulation. An upgrade waiting to be flown through.
struct Pickup {
    var kind: UpgradeKind
}
```

The defaults are the first guide's twin cannons: two bolts every 0.14 s,
one damage each. `apply` is the whole progression system — five lines, each
with a cap, because a loadout that can grow without bound is a run that
stops being interesting at the point where nothing can hurt you. Rapid fire
multiplies rather than subtracts so that each pickup is worth the same
*fraction* and the cap is reached in a few steps rather than dozens.

The weapon's cooldown stays on `Weapon` from the first guide; `Loadout`
carries what the cooldown *resets to*. Chapter 07's enemies have a `Weapon`
and no `Loadout`, and that stays true.

---

## Three ships

**`Sources/SpaceFighter/Content/Ships.swift`** — new file:

```swift
import simd

/// A ship the player can choose: how it looks, how it flies, what it starts
/// with. Content, not code — three rows in a table.
struct ShipDefinition {
    var name: String
    var blurb: String
    var mesh: MeshID
    var color: Vec4
    var flight: FlightModel
    var loadout: Loadout
    var hull: Float
}
```

This is what chapter 04 turned the flight constants into a component *for*.
A ship is a name, a look, a `FlightModel`, a starting `Loadout` and a hull.
The file lives in `Content/` beside the meshes because that's what it is:
data the game reads, with no behaviour of its own.

**`Ships.swift`** — after `ShipDefinition`:

```swift
enum Ships {
    static let all: [ShipDefinition] = [
        ShipDefinition(
            name: "Dart", blurb: "Turns on a coin. Bring bandages.",
            mesh: .ship, color: Vec4(0.95, 0.85, 0.5, 1),
            flight: FlightModel(
                maxRate: Vec3(2.8, 0.8, 4.2), angularAccel: Vec3(8, 3, 14), angularDamping: Vec3(10, 5, 16),
                minSpeed: 28, maxSpeed: 78, boostSpeed: 130,
                throttleResponse: 1.2, speedResponse: 50, linearResponse: 4.5, autoLevel: 0),
            loadout: Loadout(fireInterval: 0.1, boltCount: 2, damage: 1, missiles: 0, shield: 0),
            hull: 70),
        ShipDefinition(
            name: "Kestrel", blurb: "The one the guide was tuned on.",
            mesh: .ship, color: Vec4(0.82, 0.9, 1.0, 1),
            flight: .fighter,
            loadout: Loadout(),
            hull: 100),
        ShipDefinition(
            name: "Bulwark", blurb: "Slow, armoured, hits like a truck.",
            mesh: .ship, color: Vec4(0.7, 0.8, 0.75, 1),
            flight: FlightModel(
                maxRate: Vec3(1.5, 0.5, 2.4), angularAccel: Vec3(4, 1.5, 7), angularDamping: Vec3(6, 3, 9),
                minSpeed: 22, maxSpeed: 60, boostSpeed: 100,
                throttleResponse: 0.8, speedResponse: 30, linearResponse: 2.5, autoLevel: 0),
            loadout: Loadout(fireInterval: 0.18, boltCount: 2, damage: 2, missiles: 2, shield: 1),
            hull: 150),
    ]

    /// Case-insensitive lookup, for the command line.
    static func named(_ name: String) -> ShipDefinition? {
        all.first { $0.name.lowercased() == name.lowercased() }
    }
}
```

The Kestrel is chapter 04's `fighter` with the default loadout — the ship
you've been flying. The Dart turns harder than anything the enemies can do
and dies to nine gunner bolts where the Kestrel takes thirteen. The Bulwark
turns like a chaser, starts with a shield and two missiles, and takes half
again as many hits to kill. The
same mesh in three colours, because meshes are the first guide's problem;
what makes them different ships is the two structs in the middle.

**`Sources/SpaceFighter/Archetypes/Player.swift`** — replace the head of
`spawnPlayer` through the `Renderable` line:

```swift
/// The player's fighter, built from a ship definition: which components it
/// has, and what they start as.
@discardableResult
func spawnPlayer(in world: World, ship: ShipDefinition) -> Entity {
    let e = world.createEntity()
    world.add(Transform(), to: e)
    world.add(Velocity(), to: e)
    world.add(AngularVelocity(), to: e)
    world.add(ship.flight, to: e)
    world.add(Engine(), to: e)
    world.add(Player(), to: e)
    world.add(Health(ship.hull), to: e)
    world.add(Team.players, to: e)
    world.add(Weapon(), to: e)
    world.add(ship.loadout, to: e)
    world.add(Renderable(mesh: ship.mesh, color: ship.color), to: e)
```

The `Collider` and `CameraRig` lines and the `return` below are unchanged.
Every hard-coded value in the archetype — `FlightModel.fighter`, `Health(100)`,
the ship colour — is now read from the definition, and the archetype is what
the first guide's chapter 02 said an archetype should be: a recipe that takes
ingredients.

---

## Bolts that know how hard they hit

Enemy bolts have been doing one point of damage to a hull of a hundred, which
made chapter 07's gunners a nuisance rather than a threat. Bolts get a damage
parameter, enemies get a gun rating, and the player's damage comes from the
loadout.

**`Sources/SpaceFighter/Archetypes/Projectile.swift`**, in `spawnProjectile`:

```diff
 func spawnProjectile(
     in world: World, at transform: Transform, velocity: Vec3, owner: Entity,
-    color: Vec4 = Vec4(0.5, 1.0, 0.85, 1)
+    color: Vec4 = Vec4(0.5, 1.0, 0.85, 1), damage: Int = 1
 ) -> Entity {
```

```diff
-    world.add(Projectile(damage: 1), to: bolt)
+    world.add(Projectile(damage: damage), to: bolt)
```

**`Sources/SpaceFighter/Components/AI.swift`** — before `AIController`'s doc
comment:

```swift
/// Simulation. How hard an enemy's bolts hit.
struct Gun {
    var damage: Int
}
```

**`Sources/SpaceFighter/Archetypes/Enemy.swift`**, in `spawnEnemy` — after
each of the three `Weapon` lines:

```diff
         world.add(Weapon(fireInterval: 0.7, muzzleSpeed: 110), to: enemy)
+        world.add(Gun(damage: 8), to: enemy)
```

```diff
         world.add(Weapon(fireInterval: 0.35, muzzleSpeed: 120), to: enemy)
+        world.add(Gun(damage: 5), to: enemy)
```

```diff
         world.add(Weapon(fireInterval: 0.25, muzzleSpeed: 100), to: enemy)
+        world.add(Gun(damage: 10), to: enemy)
```

**`Sources/SpaceFighter/Systems/EnemyWeaponSystem.swift`**, in `update`:

```diff
             spawnProjectile(
                 in: world, at: bolt, velocity: aim * weapon.muzzleSpeed, owner: entity,
-                color: Vec4(1.0, 0.45, 0.35, 1))
+                color: Vec4(1.0, 0.45, 0.35, 1), damage: world.get(Gun.self, entity)?.damage ?? 1)
```

A gunner now takes eight percent of a Kestrel's hull per hit, a boss a
tenth. Thirteen gunner bolts is a dead ship, which is about the right number
for something that fires every 0.7 s and misses most of the time.

---

## The player's guns, from the loadout

**`Sources/SpaceFighter/Components/Gameplay.swift`** — replace `Weapon`:

```swift
/// A gun. The weapon systems count `cooldown` down and spawn bolts.
struct Weapon {
    var fireInterval: Float = 0.14 // seconds between shots (enemies; players use their Loadout)
    var cooldown: Float = 0        // time until the next shot is allowed
    var muzzleSpeed: Float = 140   // world units / second
    var missileCooldown: Float = 0
    var missileHeld: Bool = false  // was the missile button down last step (for the edge)
}
```

`missileHeld` is chapter 04's edge detection, in the simulation this time.
A missile should fire once per press, not sixty times a second while the key
is down, and "was it down last step" has to be simulation state — a replay
has to fire the same missiles.

**`Sources/SpaceFighter/Systems/WeaponSystems.swift`** — replace the whole
file:

```swift
import simd

/// Fires the player's guns from their loadout: a fan of bolts on a cooldown,
/// and a missile on the button's edge if there are any left.
enum WeaponSystem {
    static let missileInterval: Float = 0.5
    static let fanStep: Float = 4  // degrees between bolts in a spread

    static func update(_ world: World, player: Entity, input: InputFrame, run: RunStats, dt: Float) {
        let weapons = world.store(Weapon.self)
        guard var weapon = weapons.get(player),
            let ship = world.get(Transform.self, player),
            var loadout = world.get(Loadout.self, player)
        else { return }
        defer { weapons.set(player, weapon) }

        weapon.cooldown = max(0, weapon.cooldown - dt)
        if input.firing && weapon.cooldown <= 0 {
            fireFan(world, from: ship, count: loadout.boltCount, damage: loadout.damage,
                    speed: weapon.muzzleSpeed, owner: player)
            run.shots += loadout.boltCount
            weapon.cooldown = loadout.fireInterval
        }
    }
}
```

`RunStats` is a few sections away. The cooldown is the first guide's; what
it resets to and how many bolts it fires come from the loadout, and every
bolt counts as a shot for the accuracy figure at the end of the run.

**`WeaponSystems.swift`**, in `update` — after the cannon block:

```diff
             weapon.cooldown = loadout.fireInterval
         }
+
+        weapon.missileCooldown = max(0, weapon.missileCooldown - dt)
+        let wantsMissile = input.buttons.contains(.missile)
+        if wantsMissile && !weapon.missileHeld && weapon.missileCooldown <= 0 && loadout.missiles > 0 {
+            let target = nearestEnemy(world, ahead: ship)
+            spawnMissile(in: world, from: ship, owner: player, target: target)
+            loadout.missiles -= 1
+            world.store(Loadout.self).set(player, loadout)
+            weapon.missileCooldown = missileInterval
+        }
+        weapon.missileHeld = wantsMissile
     }
```

Four conditions: the button is down, it wasn't last step, the half-second
between missiles has passed, and there's one to fire. The target is picked
at launch and baked into the missile; a missile doesn't retarget.

**`WeaponSystems.swift`**, in `WeaponSystem` — after `update`:

```diff
+    /// `count` bolts in a fan about the ship's up axis, alternating muzzles.
+    private static func fireFan(
+        _ world: World, from ship: Transform, count: Int, damage: Int, speed: Float, owner: Entity
+    ) {
+        for i in 0..<count {
+            let side: Float = i % 2 == 0 ? 1 : -1
+            let index = Float(i) - Float(count - 1) / 2
+            let yaw = Quat(angle: -index * fanStep.radians, axis: ship.up)
+            let direction = yaw.act(ship.forward)
+            let muzzle = ship.position + ship.forward * 2.2 + ship.right * 0.9 * side - ship.up * 0.1
+
+            var transform = Transform()
+            transform.position = muzzle
+            transform.rotation = Math.lookRotation(forward: direction, up: ship.up)
+            transform.scale = Vec3(0.18, 0.18, 0.7)
+            spawnProjectile(in: world, at: transform, velocity: direction * speed, owner: owner, damage: damage)
+        }
+    }
+
+    /// The closest enemy inside a wide cone ahead of the ship.
+    private static func nearestEnemy(_ world: World, ahead ship: Transform) -> Entity? {
+        var best: Entity?
+        var bestDistance = Float.infinity
+        for enemy in world.store(Enemy.self).owners {
+            guard world.isAlive(enemy), let t = world.get(Transform.self, enemy) else { continue }
+            let to = t.position - ship.position
+            let d = simd_length(to)
+            guard d > 0.001, simd_dot(to / d, ship.forward) > 0.5, d < bestDistance else { continue }
+            bestDistance = d
+            best = enemy
+        }
+        return best
+    }
```

`fireFan` with a count of two is the first guide's twin cannons with a
two-degree toe-in — indices −½ and +½, two degrees either side of dead ahead,
from alternating wingtips; the first guide fired them parallel. With five it's a fan sixteen degrees wide, outer bolts eight
degrees off the nose. Each bolt is rotated
about the ship's up axis, so the spread is horizontal in the ship's frame,
which is what a spread should be when you're banked.

`nearestEnemy` is the missile's lock: the closest enemy within sixty degrees
of the nose. It walks the `Enemy` store the same way `nearestPlayer` walks
the `Player` store.

**`Sources/SpaceFighter/Archetypes/Missile.swift`** — new file:

```swift
import simd

/// A player missile: a slow, fat, homing bolt that hits hard. Reuses the
/// projectile parts and adds a Homing toward whatever it was launched at.
@discardableResult
func spawnMissile(in world: World, from ship: Transform, owner: Entity, target: Entity?) -> Entity {
    var t = Transform()
    t.position = ship.position + ship.forward * 2 - ship.up * 0.6
    t.rotation = ship.rotation
    t.scale = Vec3(0.35, 0.35, 1.4)
    let missile = spawnProjectile(
        in: world, at: t, velocity: ship.forward * 70, owner: owner,
        color: Vec4(1.0, 0.6, 0.2, 1), damage: 5)
    world.add(Homing(turnRate: 3.5, speed: 90, target: target), to: missile)
    world.add(Lifetime(remaining: 5), to: missile)
    return missile
}
```

A missile *is* a projectile — team, owner, swept collider, all from
`spawnProjectile` — with two components changed: a `Homing` toward its
target, and a longer life. Five damage kills anything short of a boss in
one hit until about wave thirteen, when gunners and strafers outgrow it. `Homing` needs to learn about targets:

**`Sources/SpaceFighter/Components/Gameplay.swift`** — replace `Homing`:

```swift
/// Steers a projectile toward a target at a limited turn rate.
struct Homing {
    var turnRate: Float
    var speed: Float
    var target: Entity?
}
```

**`Sources/SpaceFighter/Systems/HomingSystem.swift`** — replace the whole
file:

```swift
import simd

/// Steers anything with a Homing component toward its target at a limited
/// turn rate. A missile whose target has died flies on straight.
enum HomingSystem {
    static func update(_ world: World, dt: Float) {
        let homings = world.store(Homing.self)
        let transforms = world.store(Transform.self)
        let velocities = world.store(Velocity.self)

        for entity in homings.owners {
            guard let h = homings.get(entity), let t = transforms.get(entity) else { continue }
            var rotation = t.rotation
            if let target = h.target, world.isAlive(target), let targetT = transforms.get(target) {
                let toTarget = targetT.position - t.position
                let dist = simd_length(toTarget)
                if dist > 0.001 {
                    let desired = toTarget / dist
                    let current = t.forward
                    let axis = simd_cross(current, desired)
                    let axisLen = simd_length(axis)
                    if axisLen > 0.0001 {
                        let maxStep = h.turnRate * dt
                        let cosTheta = max(-1, min(1, simd_dot(current, desired)))
                        let angle = min(maxStep, acos(cosTheta))
                        rotation = simd_normalize(Quat(angle: angle, axis: axis / axisLen) * t.rotation)
                    }
                }
            }
            transforms.mutate(entity) { $0.rotation = rotation }
            velocities.set(entity, Velocity(linear: rotation.act(Vec3(0, 0, -1)) * h.speed))
        }
    }
}
```

The first guide's homing code homed on *the player*, which was the only
thing worth homing on. Now it homes on whatever `target` says, and the
`world.isAlive(target)` is chapter 06's generations doing what they were
added for: a missile whose target died — or whose target's slot has since
been reused by a pickup — flies straight rather than swerving at a stranger.

---

## Pickups

**`Sources/SpaceFighter/Archetypes/Pickup.swift`** — new file:

```swift
import simd

/// A glowing cube you fly through. Drifts, spins, and gives up after a while.
@discardableResult
func spawnPickup(in world: World, kind: UpgradeKind, at position: Vec3) -> Entity {
    let pickup = world.createEntity()
    var t = Transform()
    t.position = position
    t.scale = Vec3(repeating: 1.2)
    world.add(t, to: pickup)
    world.add(Pickup(kind: kind), to: pickup)
    world.add(Renderable(mesh: .projectile, color: kind.color), to: pickup)
    world.add(Velocity(), to: pickup)
    world.add(Spinner(axis: simd_normalize(Vec3(1, 1, 0.3)), speed: 1.5), to: pickup)
    world.add(Collider(radius: 1.6, layer: .pickup, mask: .player), to: pickup)
    world.add(Lifetime(remaining: 20), to: pickup)
    return pickup
}
```

The `.projectile` mesh is a cube drawn with the glow material, which is what
you want a pickup to look like, so it's a pickup now too. The collider is on
the `pickup` layer chapter 06 reserved, and reacts only to players — a
bolt through a pickup does nothing.

**`Sources/SpaceFighter/Systems/DropSystem.swift`** — new file:

```swift
/// Turns some deaths into pickups. Chance by enemy kind; the upgrade at random.
enum DropSystem {
    static func dropChance(for kind: EnemyKind) -> Float {
        switch kind {
        case .drifter: return 0.15
        case .chaser: return 0.25
        case .gunner: return 0.5
        case .strafer: return 0.5
        case .boss: return 1
        }
    }

    static func update(_ world: World) {
        let deaths = world.events
        for case .died(let entity, _) in deaths {
            guard let ai = world.get(AIController.self, entity).map({ $0.kind })
                    ?? (world.get(Enemy.self, entity) != nil ? EnemyKind.drifter : nil),
                let t = world.get(Transform.self, entity)
            else { continue }
            let drops = ai == .boss ? 3 : 1
            for i in 0..<drops {
                guard Float.random(in: 0..<1, using: &world.rng) < dropChance(for: ai) else { continue }
                let kind = UpgradeKind.allCases[Int.random(in: 0..<UpgradeKind.allCases.count, using: &world.rng)]
                let offset = Vec3(Float(i) * 3 - Float(drops - 1) * 1.5, 0, 0)
                spawnPickup(in: world, kind: kind, at: t.position + offset)
            }
        }
    }
}
```

The second consumer of the `died` event, and it looks exactly like the
first: read the events, spawn things. The `guard` works out what *kind* died
— drifters have no `AIController`, so an `Enemy` without one is a drifter.
The harder the enemy, the likelier the drop; a boss always drops three. A
single drop lands on the corpse; a boss's three fan out three units either
side of it.

Both random draws go through `world.rng`, which is why a replay shows the
same drops. Chapter 02's grep test would have caught it if they didn't.

**`Sources/SpaceFighter/Systems/PickupSystem.swift`** — new file:

```swift
import simd

/// Pulls nearby pickups toward the player and applies the ones they touch.
enum PickupSystem {
    static let magnetRange: Float = 14
    static let magnetSpeed: Float = 30

    static func update(_ world: World, dt: Float) {
        let pickups = world.store(Pickup.self)
        let transforms = world.store(Transform.self)
        let velocities = world.store(Velocity.self)

        for entity in pickups.owners {
            guard let t = transforms.get(entity),
                let player = EnemyAISystem.nearestPlayer(world, to: t.position),
                let playerT = transforms.get(player)
            else { continue }
            let toPlayer = playerT.position - t.position
            let distance = simd_length(toPlayer)
            if distance < magnetRange && distance > 0.001 {
                velocities.set(entity, Velocity(linear: toPlayer / distance * magnetSpeed))
            } else {
                velocities.mutate(entity) { $0.linear *= 0.9 }
            }
        }
    }
}
```

The magnet. Inside fourteen units a pickup flies at you at thirty units a
second; outside, it coasts to a stop. Fourteen is about the width of the
ship's shadow on the grid — close enough that you have to *aim* at a pickup,
far enough that you don't have to hit it. The `* 0.9` outside the range is
a per-step decay, which is fine here because `dt` is constant and the effect
is cosmetic.

**`PickupSystem.swift`**, in `update` — after the magnet loop:

```diff
             }
         }
+
+        let collisions = world.events
+        for case .collision(let a, let b) in collisions {
+            collect(a, b, world: world)
+            collect(b, a, world: world)
+        }
     }
+
+    private static func collect(_ pickup: Entity, _ player: Entity, world: World) {
+        guard world.isAlive(pickup), let p = world.get(Pickup.self, pickup),
+            world.get(Loadout.self, player) != nil
+        else { return }
+        world.store(Loadout.self).mutate(player) { $0.apply(p.kind) }
+        world.destroy(pickup)
+        world.events.append(.pickedUp(player, p.kind))
+    }
 }
```

Collection is chapter 06's pattern a third time: the collision system
reports a pickup touching a player, this system decides what it means. The
damage system never sees a pickup, because nothing about a pickup involves
health. And there's a new event:

**`Sources/SpaceFighter/ECS/World.swift`**, in `GameEvent`:

```diff
     case died(Entity, killer: Entity?)
+    case pickedUp(Entity, UpgradeKind)
+    case shielded(Entity)
 }
```

Chapter 09's HUD flashes the pickup's colour on `pickedUp`; chapter 15's
audio wants both.

---

## The shield

**`Sources/SpaceFighter/Systems/DamageSystem.swift`**, in `resolve` — a
bolt checks for a shield before it hurts:

```diff
         if let bolt = world.get(Projectile.self, a) {
             guard !sameTeam, world.get(Health.self, b) != nil else { return }
-            hurt(b, by: world.get(Owner.self, a)?.entity, amount: Float(bolt.damage), world: world)
             world.destroy(a)
+            if let loadout = world.get(Loadout.self, b), loadout.shield > 0 {
+                world.store(Loadout.self).mutate(b) { $0.shield -= 1 }
+                world.events.append(.shielded(b))
+                return
+            }
+            hurt(b, by: world.get(Owner.self, a)?.entity, amount: Float(bolt.damage), world: world)
+            if world.get(Player.self, world.get(Owner.self, a)?.entity ?? a) != nil { run.hits += 1 }
         }
```

A shield is a counter of hits that don't happen. The bolt is spent either
way; if the target has a shield, the shield takes it and a `shielded` event
goes out instead of a `damaged` one, so the screen doesn't flash red for a
hit you didn't take. Ramming isn't shielded — a shield stops bolts, not
mass. The `run.hits` line is the other half of accuracy, counted only for
bolts a player fired.

`run` is a new parameter, and `RunStats` is the next section:

**`DamageSystem.swift`** — the signatures:

```diff
-    static func update(_ world: World, stats: GameStats) {
+    static func update(_ world: World, run: RunStats) {
         let collisions = world.events
         for case .collision(let a, let b) in collisions {
-            resolve(a, b, world: world)
-            resolve(b, a, world: world)
+            resolve(a, b, world: world, run: run)
+            resolve(b, a, world: world, run: run)
         }
```

```diff
-    private static func resolve(_ a: Entity, _ b: Entity, world: World) {
+    private static func resolve(_ a: Entity, _ b: Entity, world: World, run: RunStats) {
```

**`DamageSystem.swift`**, in `update` — the death pass scores and kills
count, and the player dies like anything else:

```diff
             world.events.append(.died(entity, killer: killer))
-            if world.get(Enemy.self, entity) != nil { stats.score += killScore }
-            if world.get(Player.self, entity) == nil { world.destroy(entity) }
+            if world.get(Enemy.self, entity) != nil {
+                run.score += killScore
+                run.kills += 1
+            }
+            world.destroy(entity)
```

Chapter 06 left one line where the damage system knew players were special
— it didn't destroy them, because `Game` respawned them. Now the player
entity is destroyed like an enemy, and what happens next is the run's
business.

---

## A run is a value

**`Sources/SpaceFighter/Game.swift`** — replace `GameStats`:

```swift
/// Presentation flags set from this frame's events, read by the HUD and
/// camera. A reference type so the systems that read it see one copy.
final class GameStats {
    var hitFlash: Float = 0      // seconds of red flash remaining
    var pendingShake: Float = 0  // 0…1
}

/// Simulation. What one run has amounted to so far. Starts at zero every run
/// and is never written to disk: this is a roguelike.
final class RunStats {
    var score = 0
    var kills = 0
    var shots = 0
    var hits = 0
    var seconds: Float = 0
    var wave = 0
    var accuracy: Float { shots > 0 ? Float(hits) / Float(shots) : 0 }
}
```

`GameStats` loses `score` and `deaths` and becomes what it's been since
chapter 06: two presentation flags. `RunStats` takes the score and adds
everything a summary screen wants. `deaths` is gone — a run has one.

**`Game.swift`**, in `Game` — the run, the ship, and whether it's over:

```diff
 final class Game {
     let world: World
     let stats = GameStats()
+    let run = RunStats()
     let director = WaveDirector()
+    let ship: ShipDefinition
+    /// True once the run is over and the world has had its last moment. An
+    /// ended run stops stepping.
+    private(set) var isOver = false
+    /// Seconds the world keeps moving after the run is decided, so the last
+    /// wreck is seen flying before everything stops.
+    static let overDelay: Float = 1.5
+    /// Seconds until `isOver`, counting down once the run is decided; nil before.
+    private var overIn: Float?
```

```diff
-    init(seed: UInt64 = 1) {
+    init(seed: UInt64 = 1, ship: ShipDefinition = Ships.all[1]) {
         world = World(seed: seed)
-        player = spawnPlayer(in: world)
+        self.ship = ship
+        player = spawnPlayer(in: world, ship: ship)
     }
```

**`Game.swift`**, in `advance` — an ended run doesn't step:

```diff
         lastInput = live

+        guard !isOver else { return }
         let steps = clock.advance(realDt: realDt)
```

Before the clock, so a run that's over doesn't bank time it will never
spend. `frame` still runs — the world is still drawn — but nothing moves.
When `isOver` becomes true is the next section's business, and it isn't the
moment the hull goes.

**`Game.swift`** — replace the systems in `step`, and its tail (the first two
lines of `step`, `snapshotTransforms` and `events.removeAll`, stay):

```swift
        FlightControlSystem.update(world, player: player, input: input, dt: dt)
        EnemyAISystem.update(world, dt: dt)
        EnemyWeaponSystem.update(world, dt: dt)
        WeaponSystem.update(world, player: player, input: input, run: run, dt: dt)
        HomingSystem.update(world, dt: dt)
        MovementSystem.update(world, dt: dt)
        SpinSystem.update(world, dt: dt)
        LifetimeSystem.update(world, dt: dt)
        CollisionSystem.update(world)
        DamageSystem.update(world, run: run)
        PickupSystem.update(world, dt: dt)
        DebrisSystem.update(world)
        DropSystem.update(world)
        if let playerT = world.get(Transform.self, player) {
            director.update(world, playerT: playerT, dt: dt)
        }

        world.flushDestroyed()
        effects.append(contentsOf: world.events)

        if overIn == nil { run.seconds += dt }
        run.wave = director.wave
        endRun(when: !world.isAlive(player), dt: dt)
    }
```

Pickups after damage (a pickup you touch and a bolt that hits you in the
same step both resolve), drops after debris (both read `died`; the order
between them doesn't matter and this one reads well). Then the run's own
bookkeeping, and the line that ends it: after the flush, the player's ship is
either alive or gone.

**`Game.swift`**, in `Game` — after `step`:

```swift
    /// The run is over once `decided` — but not at once. The world keeps
    /// stepping for `overDelay` so the last wreck is seen flying; then it stops.
    private func endRun(when decided: Bool, dt: Float) {
        if decided && overIn == nil { overIn = Self.overDelay }
        guard var remaining = overIn else { return }
        remaining -= dt
        overIn = remaining
        if remaining <= 0 { isOver = true }
    }
```

The hull going is the *decision*; `isOver` is the *end*, a second and a half
later. In between, the world keeps stepping: chapter 07's debris system has
just blown your ship into twelve tumbling pieces and a flash, and this is the
time in which they fly. Freeze the world on the frame you died and you'd
never see them. The run's own clock stops at the decision — `run.seconds` no
longer counts once `overIn` is set — so the summary's time is the time you
were alive, not the time you were watched.

Delete `respawn()` — the whole function, at the bottom of `Game`. Nothing
calls it now.

There's one more thing a dead ship takes with it: the camera. Chapter 05 put
the `CameraRig` on the player entity, and `CameraSystem.viewMatrix` returns
the identity when that entity is gone — which, for the second and a half
above, would cut the view to the origin. So `frame` keeps the last camera it
had.

**`Game.swift`**, in `Game` — after `presentationRng`:

```diff
     /// Presentation randomness: camera shake and the like. Never the world's.
     private var presentationRng = Rng(seed: 0xCAFE)
+    /// Presentation. The last camera the ship had, kept after it's gone so the
+    /// wreck is watched from where the pilot was.
+    private var lastCamera: (view: Mat4, eye: Vec3, fov: Float, focus: Vec3) = (
+        Math.identity, .zero, CameraRig.baseFov, .zero)
```

**`Game.swift`**, in `frame` — compute the camera only while there's a ship
to compute it from:

```diff
-        let (view, eye) = CameraSystem.viewMatrix(world, player: player, alpha: alpha)
-        let fov = world.get(CameraRig.self, player)?.fov ?? CameraRig.baseFov
+        // A destroyed ship has no camera. Keep the last one it had, so the
+        // wreck is watched from where the pilot was, not from the origin.
+        if world.isAlive(player) {
+            let (view, eye) = CameraSystem.viewMatrix(world, player: player, alpha: alpha)
+            lastCamera = (
+                view, eye, world.get(CameraRig.self, player)?.fov ?? CameraRig.baseFov,
+                world.get(Transform.self, player)?.position ?? .zero)
+        }
+        let (view, eye, fov, focus) = lastCamera
         let projection = Math.perspective(
```

```diff
         let instances = SceneSystem.buildInstances(world, alpha: alpha)
-        let position = world.get(Transform.self, player)?.position ?? .zero

         return FrameRenderData(
             frame: frame,
             instances: instances,
-            focus: position,
+            focus: focus,
```

Four numbers, written every frame the ship is alive and read every frame it
isn't. The grid's `focus` rides along, so the ground doesn't slide out from
under the wreck either. Everything else in `frame` already copes on its own:
`CameraSystem.update` finds no `Engine` on a dead handle and does nothing,
and the reticle, the hull fraction and the debug overlay come back empty for
the same reason.

**`Game.swift`**, in `frame` — the HUD gets the loadout:

```diff
             hud: HUDSystem.build(
                 stats: stats, hull: hullFraction(), wave: director.wave,
-                breather: director.phase == .breather, aspect: max(aspect, 0.01),
+                breather: director.phase == .breather,
+                loadout: world.get(Loadout.self, player) ?? Loadout(), aspect: max(aspect, 0.01),
                 reticle: reticle(viewProjection: viewProjection, alpha: alpha),
```

**`Sources/SpaceFighter/Systems/HUDSystem.swift`**, in `build`:

```diff
     static func build(
-        stats: GameStats, hull: Float, wave: Int, breather: Bool, aspect: Float,
+        stats: GameStats, hull: Float, wave: Int, breather: Bool, loadout: Loadout, aspect: Float,
         reticle: Reticle = Reticle(), flight: FlightDebug? = nil
     ) -> [HUDVertex] {
         var v: [HUDVertex] = []

+        // Bottom left, above the hull bar: shield pips in blue, missiles in orange.
+        for i in 0..<loadout.shield {
+            let x = -0.94 + Float(i) * 0.04 / aspect
+            appendRect(&v, cx: x, cy: -0.82, hw: 0.014 / aspect, hh: 0.014, color: UpgradeKind.shield.color)
+        }
+        for i in 0..<loadout.missiles {
+            let x = -0.94 + Float(i) * 0.03 / aspect
+            appendRect(&v, cx: x, cy: -0.77, hw: 0.008 / aspect, hh: 0.02, color: UpgradeKind.missiles.color)
+        }
+
         // Top left: one tick per wave, and a banner while the next one loads.
```

Pips for the two counters. Fire rate, spread and damage don't get a display
until chapter 09 gives the HUD numbers; you can see them in what your guns
do.

---

## Ending the run, for now

Chapter 10 gives a finished run a screen. Until then, the coordinator prints
the numbers and starts again.

**`Sources/SpaceFighter/GameView.swift`**, in `RenderCoordinator` — the
game can be replaced:

```diff
-    private let game: Game
+    private var game: Game
     private let renderer: Renderer
     private let input: InputSource
     private var lastTime: CFTimeInterval
     private var announcedReplayEnd = false
+    private var overFor: Float = 0
```

**`GameView.swift`**, in `RenderCoordinator` — after `init`:

```diff
+    /// Until chapter 10 gives the run an ending screen: print the summary and
+    /// start again with the same ship, a second after the run ends.
+    private func restartIfOver(dt: Float) {
+        guard game.isOver else { return }
+        if overFor == 0 {
+            let r = game.run
+            print(String(
+                format: "run over — score %d  wave %d  kills %d  accuracy %.0f%%  %.0f s",
+                r.score, r.wave, r.kills, r.accuracy * 100, r.seconds))
+        }
+        overFor += dt
+        if overFor > 1 {
+            game = Game(seed: UInt64(Date().timeIntervalSince1970), ship: game.ship)
+            overFor = 0
+        }
+    }
```

**`GameView.swift`**, in `draw`:

```diff
         let frame = input.poll(dt: dt)
         game.advance(realDt: dt, input: frame)
+        restartIfOver(dt: dt)
```

```diff
         view.window?.title = String(
-            format: "Space Fighter — Score %d    Deaths %d",
-            game.stats.score, game.stats.deaths)
+            format: "Space Fighter — %@    Score %d    Wave %d",
+            game.ship.name, game.run.score, game.run.wave)
```

A second and a half of your own wreckage flying, a second of it hanging
still, a line in the console, and a fresh `Game`. The fresh `Game` is the entire "reset": a new world, a new run, the
ship's starting loadout. There's nothing to clear because nothing was kept.

---

## Choosing a ship, and remembering it

**`Sources/SpaceFighter/main.swift`**, in `LaunchOptions`:

```diff
     var record: URL?
     var replay: URL?
+    var ship: ShipDefinition = Ships.all[1]
```

```diff
             case ("--replay", let path?): replay = URL(fileURLWithPath: path); i += 2
+            case ("--ship", let name?):
+                if let found = Ships.named(name) { ship = found } else { print("no ship named \(name)") }
+                i += 2
```

**`main.swift`** — replace from `let seed = replayLog?.seed …` through the
`recording` line:

```swift
let seed = replayLog?.seed ?? options.seed
let ship = replayLog.map { Ships.all[Int($0.ship) % Ships.all.count] } ?? options.ship
print("seed \(seed)  ship \(ship.name)")

let game = Game(seed: seed, ship: ship)
game.replay = replayLog
if options.record != nil {
    game.recording = InputLog(seed: seed, ship: UInt8(Ships.all.firstIndex { $0.name == ship.name } ?? 1))
}
```

A replay of a Bulwark run flown in a Dart is a different game, so the
recording has to say which ship — which means the file format changes.

**`Sources/SpaceFighter/Input/InputLog.swift`**, in `InputLog`:

```diff
     static let magic: UInt32 = 0x4C49_4653  // "SFIL"
-    static let version: UInt16 = 1
+    static let version: UInt16 = 2  // 2: added the ship index

     var seed: UInt64
+    var ship: UInt8
     var frames: [InputFrame] = []

-    init(seed: UInt64) {
+    init(seed: UInt64, ship: UInt8 = 1) {
         self.seed = seed
+        self.ship = ship
     }
```

```diff
         w.write(seed)
+        w.write(ship)
         w.write(UInt32(frames.count))
```

```diff
             seed = try r.readUInt64()
+            ship = try r.readUInt8()
             let count = Int(try r.readUInt32())
```

This is the version number chapter 03 put in the header earning its place.
A recording from chapter 03 has version 1 and is refused with
`unsupportedVersion` rather than read with its frame count interpreted as a
ship index. One byte, written and read in the same place in the sequence,
and the version bumped: that's the whole discipline of a binary format.

---

## The tests

Two earlier tests read the score from `stats`; it moved.

**`Tests/SpaceFighterTests/Ch06CollisionTests.swift`**, in
`aFastOffCentreBoltStillHits`, and **`Ch07EnemyTests.swift`**, in
`aMinuteOfWavesStaysBounded`:

```diff
-    #expect(game.stats.score == 100)
+    #expect(game.run.score == 100)
```

```diff
-    #expect(game.stats.score > 0)
+    #expect(game.run.score > 0)
```

**`Tests/SpaceFighterTests/Ch08LoadoutTests.swift`** — new file:

```swift
import Testing
import simd

@testable import SpaceFighter

private let dt = SimulationClock.step

private func quietGame(seed: UInt64 = 1, ship: ShipDefinition = Ships.all[1]) -> Game {
    let game = Game(seed: seed, ship: ship)
    game.director.phase = .fighting  // no waves; the test spawns what it needs
    return game
}

@Test func upgradesApplyAndCap() {
    var loadout = Ships.all[1].loadout
    for _ in 0..<20 { loadout.apply(.rapidFire) }
    #expect(loadout.fireInterval == Loadout.minFireInterval)
    for _ in 0..<20 { loadout.apply(.spread) }
    #expect(loadout.boltCount == Loadout.maxBolts)
    for _ in 0..<20 { loadout.apply(.damage) }
    #expect(loadout.damage == Loadout.maxDamage)
    for _ in 0..<20 { loadout.apply(.missiles) }
    #expect(loadout.missiles == Loadout.maxMissiles)
    for _ in 0..<20 { loadout.apply(.shield) }
    #expect(loadout.shield == Loadout.maxShield)
}

@Test func dropChancesAreProbabilities() {
    for kind in EnemyKind.allCases {
        let chance = DropSystem.dropChance(for: kind)
        #expect(chance >= 0 && chance <= 1)
    }
    #expect(DropSystem.dropChance(for: .boss) == 1)
}
```

**`Ch08LoadoutTests.swift`** — after `dropChancesAreProbabilities`:

```swift
@Test func aSingleDropLandsWhereTheEnemyDied() {
    var drops = 0
    for seed in 1...12 {
        let game = quietGame(seed: UInt64(seed))
        let world = game.world
        let where_ = Vec3(30, 0, -80)
        let gunner = spawnEnemy(
            in: world, kind: .gunner, at: where_, rotation: Math.lookRotation(forward: Vec3(0, 0, 1)), wave: 1)
        world.store(Health.self).mutate(gunner) { $0.current = 0 }
        game.step(input: InputFrame(), dt: dt)
        for pickup in world.store(Pickup.self).owners {
            drops += 1
            let p = world.get(Transform.self, pickup)!.position
            // The gunner flies on the step it dies, so "where it died" is a step away from where it spawned.
            #expect(simd_length(p - where_) < 0.1, "dropped \(simd_length(p - where_)) units from the corpse")
        }
    }
    #expect(drops > 0, "a gunner drops half the time; twelve tries produced nothing")
}
```

A gunner drops half the time, so twelve seeds all but guarantee at least one
pickup to look at, and every one has to sit on the corpse — give or take the
step the gunner was still flying on when it died.

**`Ch08LoadoutTests.swift`** — after `aSingleDropLandsWhereTheEnemyDied`:

```swift
@Test func aPickupIsDrawnInAndCollected() {
    let game = quietGame()
    let world = game.world
    let before = world.get(Loadout.self, game.player)!.boltCount
    let pickup = spawnPickup(in: world, kind: .spread, at: Vec3(6, 0, -10))  // off to the side, in magnet range
    for _ in 0..<120 { game.step(input: InputFrame(), dt: dt) }
    #expect(!world.isAlive(pickup))
    #expect(world.get(Loadout.self, game.player)!.boltCount == before + 1)
    #expect(game.effects.contains { if case .pickedUp = $0 { return true } else { return false } })
}

@Test func aMissileHuntsTheNearestEnemy() {
    let game = quietGame()
    let world = game.world
    world.store(Loadout.self).mutate(game.player) { $0.missiles = 1 }
    let enemy = spawnEnemy(
        in: world, kind: .drifter, at: Vec3(25, 5, -70),
        rotation: Math.lookRotation(forward: Vec3(0, 0, 1)), wave: 1)
    world.store(Velocity.self).mutate(enemy) { $0.linear = .zero }  // hold still
    var input = InputFrame()
    input.buttons = [.missile]
    game.step(input: input, dt: dt)
    #expect(world.get(Loadout.self, game.player)!.missiles == 0, "spent")
    #expect(world.store(Homing.self).count == 1, "one missile in the air")
    for _ in 0..<240 { game.step(input: InputFrame(), dt: dt) }
    #expect(!world.isAlive(enemy))
}
```

The pickup sits six units to the side, where the ship would never fly
through it; the magnet is what makes the test pass. The missile's target is
twenty-five units off the nose — well outside the guns, well inside the
sixty-degree lock.

**`Ch08LoadoutTests.swift`** — after `aMissileHuntsTheNearestEnemy`:

```swift
@Test func aShieldAbsorbsAHit() {
    let game = quietGame()
    let world = game.world
    world.store(Loadout.self).mutate(game.player) { $0.shield = 1 }
    var bt = Transform()
    bt.position = Vec3(0, 0, -6)
    let bolt = spawnProjectile(
        in: world, at: bt, velocity: Vec3(0, 0, 100), owner: game.player, damage: 8)
    world.store(Team.self).set(bolt, .enemies)
    world.store(Collider.self).mutate(bolt) { $0.mask = .player }
    for _ in 0..<10 { game.step(input: InputFrame(), dt: dt) }
    #expect(!world.isAlive(bolt), "the bolt was spent")
    #expect(world.get(Health.self, game.player)!.current == 100, "on the shield")
    #expect(world.get(Loadout.self, game.player)!.shield == 0)
}

@Test func theRunEndsWhenTheHullDoes() {
    let game = quietGame()
    game.world.store(Health.self).mutate(game.player) { $0.current = 0 }
    game.step(input: InputFrame(), dt: dt)
    #expect(!game.world.isAlive(game.player), "the ship is gone")
    #expect(game.world.store(Debris.self).count >= 12, "and it blew up")
    #expect(!game.isOver, "but the world gets a moment before it stops")
    let secondsAtDeath = game.run.seconds
    for _ in 0..<Int(Game.overDelay / dt) + 2 { game.step(input: InputFrame(), dt: dt) }
    #expect(game.isOver)
    #expect(game.run.seconds == secondsAtDeath, "the run's clock stopped when the hull did")
    let tick = game.clock.tick
    game.advance(realDt: 1, input: InputFrame())
    #expect(game.clock.tick == tick, "an ended run does not step")
}

@Test func shipsDifferAndAreChosen() {
    #expect(Set(Ships.all.map(\.name)).count == Ships.all.count)
    let heavy = Ships.all.first { $0.name == "Bulwark" }!
    let game = Game(seed: 1, ship: heavy)
    #expect(game.world.get(Health.self, game.player)!.max == heavy.hull)
    #expect(game.world.get(FlightModel.self, game.player)!.maxRate == heavy.flight.maxRate)
    #expect(Ships.named("bulwark")?.name == "Bulwark")
}

@Test func theRecordingRemembersTheShip() throws {
    var log = InputLog(seed: 4, ship: 2)
    log.frames.append(InputFrame())
    let decoded = try InputLog(decoding: log.encoded())
    #expect(decoded.ship == 2)
}
```

`theRunEndsWhenTheHullDoes` is the death sequence in order: the ship is gone
and its debris exists on the very step, `isOver` is still false, the run's
clock has stopped, and a second and a half later the run is over and an
`advance` banks nothing.

---

## Checkpoint

```console
$ swift test
✔ Test run with 52 tests in 0 suites passed
```

**Fifty-two tests.** Then:

```console
$ swift run SpaceFighter --ship Bulwark
seed 1725404123  ship Bulwark
```

1. **The Bulwark is a different ship.** It rolls like it's underwater and
   its bolts do double damage — a wave-three gunner in two hits where the
   Kestrel needs three. A blue pip
   and two orange pips sit above the hull bar. Press `X`: a fat orange bolt curves after the
   nearest enemy ahead of you. Press it again.
2. **Things drop.** Kill a chaser and, one time in four, a glowing cube
   tumbles where it was. Fly near it and it comes to you. Yellow widens your
   spread — count the bolts — cyan speeds it up, red makes them hit harder.
3. **The shield takes a bolt.** Let a gunner hit you once: no red flash, no
   shake, the blue pip is gone. The second one hurts.
4. **You can lose.** Let the wave have you. Your ship blows apart, the view
   holds where you were while the pieces fly, then the world stops; the
   console prints your run — score, wave, kills, accuracy, seconds — and a
   second later you're back at the start with the same ship and nothing
   else.

**If pickups don't come to you**, `PickupSystem` isn't in the schedule.
**If a pickup does nothing when you touch it**, its collider mask isn't
`.player`, or `collect` is looking up `Loadout` on the wrong entity. **If
the missile fires every frame while `X` is held**, `missileHeld` isn't being
written back — check the `defer`. **If the game never restarts**, `isOver`
never comes: `endRun` needs `world.isAlive(player)` to be false after the
flush, so confirm `DamageSystem` destroys players now. **If the view cuts to
the origin when you die**, `frame` is still asking the dead ship for a camera
instead of reading `lastCamera`. **If `swift test` reports a link error**, you added a
new file under `Tests/` — that's fine — but check it's in the right folder.

---

## Challenge

Give the shield a recharge. After eight seconds without taking a hit, one
pip comes back, up to whatever the loadout's cap allows — so that a pilot
who flies well is rewarded with the same thing a pilot who finds shield
pickups is. Three things to get right: where the timer lives (it's
simulation state, per player, and it belongs on the `Loadout`); what resets
it (a hit on the shield, a hit on the hull, or both?); and the HUD, which
should show a pip *filling* rather than appearing — which with rectangles
is a bar and with chapter 09's text could be a number.

---

**Next:** words on screen. →
[Chapter 09: Text](09-text.md)

---

*Back to the [guide map](../README.md) · references in [`resources.md`](../resources.md)*
