import simd

/// An enemy, in one of two flavours. Same mesh, different components.
@discardableResult
func spawnEnemy(in world: World, at position: Vec3, facing playerT: Transform) -> Entity {
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
        let scatter =
            playerT.right * Float.random(in: -0.3...0.3)
            + playerT.up * Float.random(in: -0.2...0.2)
        let heading = simd_normalize(towardPlayer + scatter)
        world.add(Velocity(linear: heading * Float.random(in: 55...80)), to: enemy)
        world.add(Spinner(axis: randomAxis(), speed: Float.random(in: 0.6...2.0)), to: enemy)
    }

    return enemy
}

private func randomAxis() -> Vec3 {
    let a = Vec3(Float.random(in: -1...1), Float.random(in: -1...1), Float.random(in: -1...1))
    let len = simd_length(a)
    return len > 0.0001 ? a / len : Vec3(0, 1, 0)
}
