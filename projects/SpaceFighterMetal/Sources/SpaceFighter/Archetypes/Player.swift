import simd

/// The player's fighter: which components it has, and what they start as.
@discardableResult
func spawnPlayer(in world: World) -> Entity {
    let e = world.createEntity()
    world.add(Transform(), to: e)
    world.add(Velocity(), to: e)
    world.add(Player(), to: e)
    world.add(Weapon(), to: e)
    world.add(Renderable(mesh: .ship, color: Vec4(0.82, 0.9, 1.0, 1)), to: e)
    world.add(Collider(radius: 1.3, layer: .player, mask: .enemy), to: e)
    return e
}
