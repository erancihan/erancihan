import simd

/// Broad-phase-free sphere collision. At these entity counts a simple O(bolts ×
/// enemies) sweep is more than fast enough, and it's easy to read. Two
/// interactions matter:
///
///   * **bolt → enemy**: the bolt is consumed and the enemy takes damage.
///   * **ship → enemy**: the enemy is destroyed and the hull takes a hit.
///
/// Chapter 10 discusses when you'd graduate to a spatial hash or uniform grid.
enum CollisionSystem {
    private struct Sphere {
        let entity: Entity
        let center: Vec3
        let radius: Float
    }

    static func update(_ world: World, player: Entity, stats: GameStats) {
        let transforms = world.store(Transform.self)
        let colliders = world.store(Collider.self)

        func spheres<C>(_ tag: ComponentStore<C>) -> [Sphere] {
            var out: [Sphere] = []
            out.reserveCapacity(tag.count)
            for e in tag.owners {
                guard let t = transforms.get(e), let c = colliders.get(e) else { continue }
                out.append(Sphere(entity: e, center: t.position, radius: c.radius))
            }
            return out
        }

        let enemies = spheres(world.store(Enemy.self))
        let bolts = spheres(world.store(Projectile.self))
        var dead = Set<Entity>()

        // Bolts vs. enemies.
        for bolt in bolts {
            for enemy in enemies where !dead.contains(enemy.entity) {
                let reach = bolt.radius + enemy.radius
                guard simd_length_squared(bolt.center - enemy.center) <= reach * reach else { continue }
                world.destroy(bolt.entity)
                var killed = false
                world.store(Enemy.self).mutate(enemy.entity) { e in
                    e.health -= 1
                    killed = e.health <= 0
                }
                if killed {
                    world.destroy(enemy.entity)
                    dead.insert(enemy.entity)
                    stats.score += 100
                }
                break   // this bolt is spent
            }
        }

        // Ship vs. enemies.
        guard let shipT = transforms.get(player), let shipC = colliders.get(player) else { return }
        for enemy in enemies where !dead.contains(enemy.entity) {
            let reach = shipC.radius + enemy.radius
            guard simd_length_squared(shipT.position - enemy.center) <= reach * reach else { continue }
            world.destroy(enemy.entity)
            dead.insert(enemy.entity)
            stats.playerHealth -= 20
            stats.hitFlash = 0.5
        }
    }
}
