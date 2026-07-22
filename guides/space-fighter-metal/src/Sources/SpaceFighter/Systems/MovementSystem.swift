import simd

/// The simplest possible integrator: advance every entity that has both a
/// `Transform` and a `Velocity` by one time step. Explicit (semi-implicit) Euler
/// is plenty for an arcade game.
enum MovementSystem {
    static func update(_ world: World, dt: Float) {
        let velocities = world.store(Velocity.self)
        let transforms = world.store(Transform.self)
        for entity in velocities.owners {
            guard let v = velocities.get(entity) else { continue }
            transforms.mutate(entity) { $0.position += v.linear * dt }
        }
    }
}

/// Rotates anything with a `Spinner`, purely for visual life (tumbling enemies).
enum SpinSystem {
    static func update(_ world: World, dt: Float) {
        let spinners = world.store(Spinner.self)
        let transforms = world.store(Transform.self)
        for entity in spinners.owners {
            guard let s = spinners.get(entity) else { continue }
            transforms.mutate(entity) { t in
                t.rotation = simd_normalize(t.rotation * Quat(angle: s.speed * dt, axis: s.axis))
            }
        }
    }
}
