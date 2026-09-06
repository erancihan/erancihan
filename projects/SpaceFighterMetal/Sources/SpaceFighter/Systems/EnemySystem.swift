import Foundation
import simd

/// Spawns enemies ahead of the player, steers the homing ones, and clears out
/// anything that has drifted far behind.
enum EnemySystem {
    static func update(_ world: World, player: Entity, director: Director, dt: Float) {
        guard let playerT = world.get(Transform.self, player) else { return }

        spawn(world, playerT: playerT, director: director, dt: dt)
        steerHomers(world, playerT: playerT, dt: dt)
        cull(world, playerT: playerT)
    }

    private static func spawn(_ world: World, playerT: Transform, director: Director, dt: Float) {
        director.spawnTimer -= dt
        let liveEnemies = world.store(Enemy.self).count
        guard director.spawnTimer <= 0, liveEnemies < director.maxEnemies else { return }
        director.spawnTimer = director.spawnInterval

        let ahead = Float.random(in: 120...190)
        let lateral = playerT.right * Float.random(in: -55...55)
        let vertical = playerT.up * Float.random(in: -20...28)
        let position = playerT.position + playerT.forward * ahead + lateral + vertical

        spawnEnemy(in: world, at: position, facing: playerT)
    }

    private static func steerHomers(_ world: World, playerT: Transform, dt: Float) {
        let homings = world.store(Homing.self)
        let transforms = world.store(Transform.self)
        let velocities = world.store(Velocity.self)

        for entity in homings.owners {
            guard let h = homings.get(entity), let t = transforms.get(entity) else { continue }
            let toPlayer = playerT.position - t.position
            let dist = simd_length(toPlayer)
            guard dist > 0.001 else { continue }
            let desired = toPlayer / dist

            let current = t.forward
            let axis = simd_cross(current, desired)
            let axisLen = simd_length(axis)
            var rotation = t.rotation
            if axisLen > 0.0001 {
                let maxStep = h.turnRate * dt
                let cosTheta = max(-1, min(1, simd_dot(current, desired)))
                let angle = min(maxStep, acos(cosTheta))
                rotation = simd_normalize(Quat(angle: angle, axis: axis / axisLen) * t.rotation)
            }
            transforms.mutate(entity) { $0.rotation = rotation }
            velocities.set(entity, Velocity(linear: rotation.act(Vec3(0, 0, -1)) * h.speed))

        }
    }

    private static func cull(_ world: World, playerT: Transform) {
        let transforms = world.store(Transform.self)
        for entity in world.store(Enemy.self).owners {
            guard let t = transforms.get(entity) else { continue }
            if simd_length(t.position - playerT.position) > 280 {
                world.destroy(entity)
            }
        }
    }
}
