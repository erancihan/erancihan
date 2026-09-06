import simd

/// Where an entity is, how it's oriented, and how big it is.
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

/// Linear velocity in world units per second.
struct Velocity {
    var linear: Vec3 = .zero
}
