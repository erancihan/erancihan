import simd

/// Handles the player's guns: counts down the cooldown, and while the fire
/// button is held spawns twin bolts from the wingtips at a fixed cadence.
enum WeaponSystem {
    static func update(_ world: World, player: Entity, input: InputState, dt: Float) {
        let weapons = world.store(Weapon.self)
        guard var weapon = weapons.get(player),
              let ship = world.get(Transform.self, player) else { return }

        weapon.cooldown = max(0, weapon.cooldown - dt)
        if input.firing && weapon.cooldown <= 0 {
            fireBolt(world, from: ship, offset: ship.right * 0.9, speed: weapon.muzzleSpeed)
            fireBolt(world, from: ship, offset: -ship.right * 0.9, speed: weapon.muzzleSpeed)
            weapon.cooldown = weapon.fireInterval
        }
        weapons.set(player, weapon)
    }

    /// Spawn one projectile entity. Note it is *pure data*: a transform, a
    /// velocity, something to draw, a hitbox, and a fuse. No projectile class.
    private static func fireBolt(_ world: World, from ship: Transform, offset: Vec3, speed: Float) {
        let muzzle = ship.position + ship.forward * 2.2 + offset - ship.up * 0.1

        var transform = Transform()
        transform.position = muzzle
        transform.rotation = ship.rotation
        transform.scale = Vec3(0.18, 0.18, 0.7)   // a short glowing bar

        let bolt = world.createEntity()
        world.add(transform, to: bolt)
        world.add(Velocity(linear: ship.forward * speed), to: bolt)
        world.add(Renderable(mesh: .projectile, color: Vec4(0.5, 1.0, 0.85, 1)), to: bolt)
        world.add(Projectile(damage: 1), to: bolt)
        world.add(Collider(radius: 0.6, layer: .projectile, mask: .enemy), to: bolt)
        world.add(Lifetime(remaining: 2.4), to: bolt)
    }
}
