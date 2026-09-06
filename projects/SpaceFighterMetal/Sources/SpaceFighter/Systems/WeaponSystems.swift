import simd

/// Counts the gun's cooldown down and, while fire is held, spawns twin bolts.
enum WeaponSystem {
    static func update(_ world: World, player: Entity, input: InputState, dt: Float) {
        let weapons = world.store(Weapon.self)
        guard var weapon = weapons.get(player),
            let ship = world.get(Transform.self, player)
        else { return }

        weapon.cooldown = max(0, weapon.cooldown - dt)
        if input.firing && weapon.cooldown <= 0 {
            fireBolt(world, from: ship, offset: ship.right * 0.9, speed: weapon.muzzleSpeed)
            fireBolt(world, from: ship, offset: -ship.right * 0.9, speed: weapon.muzzleSpeed)

            weapon.cooldown = weapon.fireInterval
        }
        weapons.set(player, weapon)
    }

    private static func fireBolt(_ world: World, from ship: Transform, offset: Vec3, speed: Float) {
        let muzzle = ship.position + ship.forward * 2.2 + offset - ship.up * 0.1

        var transform = Transform()
        transform.position = muzzle
        transform.rotation = ship.rotation
        transform.scale = Vec3(0.18, 0.18, 0.7)  // a short glowing bar

        spawnProjectile(in: world, at: transform, velocity: ship.forward * speed)
    }
}
