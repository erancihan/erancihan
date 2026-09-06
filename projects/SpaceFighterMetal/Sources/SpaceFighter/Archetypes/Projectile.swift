import simd

/// A player bolt: where it is, where it's going, and what it's made of.
@discardableResult
func spawnProjectile(in world: World, at transform: Transform, velocity: Vec3) -> Entity {
    let bolt = world.createEntity()
    world.add(transform, to: bolt)
    world.add(Velocity(linear: velocity), to: bolt)
    world.add(Renderable(mesh: .projectile, color: Vec4(0.5, 1.0, 0.85, 1)), to: bolt)
    world.add(Projectile(damage: 1), to: bolt)
    world.add(Collider(radius: 0.6, layer: .projectile, mask: .enemy), to: bolt)
    world.add(Lifetime(remaining: 2.4), to: bolt)
    return bolt
}
