import simd

/// Tags the player-controlled ship and carries its flight state.
struct Player {
    var throttle: Float = 0.5
    var boosting: Bool = false
}

/// A gun. Chapter 12 counts `cooldown` down and spawns bolts.
struct Weapon {
    var fireInterval: Float = 0.14 // seconds between shots
    var cooldown: Float = 0        // time until the next shot is allowed
    var muzzleSpeed: Float = 140   // world units / second
}

/// Marks a hostile entity and tracks its durability.
struct Enemy {
    var health: Int = 1
}

/// Marks a player bullet.
struct Projectile {
    var damage: Int = 1
}

/// Removes the entity after `remaining` seconds.
struct Lifetime {
    var remaining: Float
}

/// Spins an entity, purely for visual life.
struct Spinner {
    var axis: Vec3
    var speed: Float   // radians / second
}

/// Steers an enemy toward the player at a limited turn rate.
struct Homing {
    var turnRate: Float
    var speed: Float
}
