import simd

// Components are plain data — value types with no methods and no behaviour.
// A component answers "what does this entity have?"; systems answer "what does
// having it make it do?". Keeping them dumb is what makes an ECS composable:
// any entity can mix any set of these.

/// Where an entity is, how it's oriented, and how big it is. Almost everything
/// visible has a `Transform`.
struct Transform {
    var position: Vec3 = .zero
    var rotation: Quat = Quat(angle: 0, axis: Vec3(0, 1, 0))
    var scale: Vec3 = Vec3(repeating: 1)

    /// The model matrix that places this entity in the world.
    var matrix: Mat4 { Math.trs(translation: position, rotation: rotation, scale: scale) }

    /// The direction the entity's nose points (local -Z), in world space.
    var forward: Vec3 { rotation.act(Vec3(0, 0, -1)) }
    /// The entity's local up (local +Y), in world space.
    var up: Vec3 { rotation.act(Vec3(0, 1, 0)) }
    /// The entity's local right (local +X), in world space.
    var right: Vec3 { rotation.act(Vec3(1, 0, 0)) }
}

/// Linear velocity in world units per second. The `MovementSystem` integrates
/// this into `Transform.position`.
struct Velocity {
    var linear: Vec3 = .zero
}

/// Which mesh to draw for this entity and what colour to tint it. The mesh is
/// referenced by id, not by GPU buffer — components stay pure data and never
/// touch Metal.
struct Renderable {
    var mesh: MeshID
    var color: Vec4
}

/// Tags the single player-controlled ship and carries its flight state. The
/// `FlightControlSystem` turns input into changes here.
struct Player {
    var throttle: Float = 0.5      // 0…1, eased toward the input target
    var boosting: Bool = false
}

/// A gun. `WeaponSystem` counts `cooldown` down each frame and, when the fire
/// button is held and it reaches zero, spawns a projectile and resets it.
struct Weapon {
    var fireInterval: Float = 0.14 // seconds between shots
    var cooldown: Float = 0        // time until the next shot is allowed
    var muzzleSpeed: Float = 140   // world units / second
}

/// Marks a hostile entity and tracks its durability.
struct Enemy {
    var health: Int = 1
}

/// Marks a player bullet. `damage` is subtracted from an enemy's health on hit.
struct Projectile {
    var damage: Int = 1
}

/// A sphere used for broad, cheap collision tests. `layer`/`mask` keep bullets
/// from hitting the ship that fired them and enemies from hitting each other.
struct Collider {
    var radius: Float
    var layer: CollisionLayer
    var mask: CollisionLayer   // which layers this collider reacts to
}

struct CollisionLayer: OptionSet {
    let rawValue: UInt8
    static let player     = CollisionLayer(rawValue: 1 << 0)
    static let enemy      = CollisionLayer(rawValue: 1 << 1)
    static let projectile = CollisionLayer(rawValue: 1 << 2)
}

/// Removes the entity after `remaining` seconds. Bullets get one so they don't
/// fly forever.
struct Lifetime {
    var remaining: Float
}

/// Spins an entity for a bit of visual life (enemies tumble slowly).
struct Spinner {
    var axis: Vec3
    var speed: Float   // radians / second
}

/// Steers an enemy toward the player at `turnRate`, giving a lazy homing drift.
struct Homing {
    var turnRate: Float   // radians / second
    var speed: Float
}
