import Foundation
import simd

/// Spawns enemies ahead of the player, steers the homing ones, and clears out
/// anything that has drifted far behind. Two archetypes keep it interesting and
/// exercise component composition:
///
///   * **Drifters** fly a straight line past the player and tumble (`Spinner`).
///   * **Chasers** slowly turn to track the player (`Homing`).
enum EnemySystem {
    static func update(_ world: World, player: Entity, director: Director, dt: Float) {
        guard let playerT = world.get(Transform.self, player) else { return }

        spawn(world, playerT: playerT, director: director, dt: dt)
        steerHomers(world, playerT: playerT, dt: dt)
        cull(world, playerT: playerT)
    }

    // MARK: Spawning

    private static func spawn(_ world: World, playerT: Transform, director: Director, dt: Float) {
        director.spawnTimer -= dt
        let liveEnemies = world.store(Enemy.self).count
        guard director.spawnTimer <= 0, liveEnemies < director.maxEnemies else { return }
        director.spawnTimer = director.spawnInterval

        // Place it in a cone in front of the camera using the player's own axes.
        let ahead = Float.random(in: 120...190)
        let lateral = playerT.right * Float.random(in: -55...55)
        let vertical = playerT.up * Float.random(in: -20...28)
        let position = playerT.position + playerT.forward * ahead + lateral + vertical

        let enemy = world.createEntity()
        var transform = Transform()
        transform.position = position
        transform.scale = Vec3(repeating: Float.random(in: 1.6...2.6))
        world.add(transform, to: enemy)
        world.add(Enemy(health: 1), to: enemy)
        world.add(Collider(radius: transform.scale.x * 0.9, layer: .enemy, mask: .player), to: enemy)

        let towardPlayer = simd_normalize(playerT.position - position)

        if Bool.random() {
            // Chaser: reddish, homes in.
            world.add(Renderable(mesh: .enemy, color: Vec4(0.95, 0.35, 0.30, 1)), to: enemy)
            world.add(Homing(turnRate: 0.9, speed: 46), to: enemy)
            world.add(Velocity(linear: towardPlayer * 46), to: enemy)
        } else {
            // Drifter: amber, flies straight and tumbles.
            world.add(Renderable(mesh: .enemy, color: Vec4(0.95, 0.7, 0.25, 1)), to: enemy)
            let scatter = playerT.right * Float.random(in: -0.3...0.3) + playerT.up * Float.random(in: -0.2...0.2)
            let heading = simd_normalize(towardPlayer + scatter)
            world.add(Velocity(linear: heading * Float.random(in: 55...80)), to: enemy)
            world.add(Spinner(axis: randomAxis(), speed: Float.random(in: 0.6...2.0)), to: enemy)
        }
    }

    // MARK: Homing

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

            // Rotate the current heading toward the player by at most turnRate·dt.
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

    // MARK: Housekeeping

    private static func cull(_ world: World, playerT: Transform) {
        let transforms = world.store(Transform.self)
        for entity in world.store(Enemy.self).owners {
            guard let t = transforms.get(entity) else { continue }
            if simd_length(t.position - playerT.position) > 280 {
                world.destroy(entity)
            }
        }
    }

    private static func randomAxis() -> Vec3 {
        let a = Vec3(Float.random(in: -1...1), Float.random(in: -1...1), Float.random(in: -1...1))
        let len = simd_length(a)
        return len > 0.0001 ? a / len : Vec3(0, 1, 0)
    }
}
