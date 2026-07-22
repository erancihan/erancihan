import simd

/// Mutable game-wide numbers that several systems read or write. Kept as a
/// reference type so systems can share one instance.
final class GameStats {
    var score = 0
    var deaths = 0
    var playerHealth: Float = 100
    var playerMaxHealth: Float = 100
    var hitFlash: Float = 0     // seconds of red flash remaining
}

/// Controls enemy spawning and difficulty. Bump `spawnInterval` down or
/// `maxEnemies` up to make the sky busier.
final class Director {
    var spawnTimer: Float = 1.0
    var spawnInterval: Float = 1.3
    var maxEnemies: Int = 22
}

/// Everything the renderer needs for one frame, handed back from `Game.update`.
struct FrameRenderData {
    var frame: FrameUniforms
    var instances: [MeshID: [InstanceData]]
    var playerPosition: Vec3
    var hud: [HUDVertex]
}

/// Owns the world and drives the fixed sequence of systems every frame. The
/// *order* of these calls is the game's logic: read input, act, integrate,
/// resolve, then present. Reordering them changes behaviour, so it lives in one
/// obvious place.
final class Game {
    let world = World()
    let stats = GameStats()
    let director = Director()
    private(set) var player: Entity = Entity(id: 0)

    // Camera tuning.
    private let fieldOfView: Float = 65
    private let lightDirection = simd_normalize(Vec3(-0.3, -1.0, -0.55))

    init() {
        spawnPlayer()
    }

    private func spawnPlayer() {
        player = world.createEntity()
        world.add(Transform(), to: player)
        world.add(Velocity(), to: player)
        world.add(Player(), to: player)
        world.add(Weapon(), to: player)
        world.add(Renderable(mesh: .ship, color: Vec4(0.82, 0.9, 1.0, 1)), to: player)
        world.add(Collider(radius: 1.3, layer: .player, mask: .enemy), to: player)
    }

    /// Advance the simulation by `dt` seconds and produce this frame's draw data.
    func update(dt rawDt: Float, input: InputState, aspect: Float) -> FrameRenderData {
        // Clamp the step so a hiccup (window drag, breakpoint) can't teleport
        // everything through walls.
        let dt = min(max(rawDt, 0), 1.0 / 30.0)

        // --- The system schedule --------------------------------------------
        FlightControlSystem.update(world, player: player, input: input, dt: dt)
        WeaponSystem.update(world, player: player, input: input, dt: dt)
        EnemySystem.update(world, player: player, director: director, dt: dt)
        MovementSystem.update(world, dt: dt)
        SpinSystem.update(world, dt: dt)
        LifetimeSystem.update(world, dt: dt)
        CollisionSystem.update(world, player: player, stats: stats)
        world.flushDestroyed()
        // --------------------------------------------------------------------

        stats.hitFlash = max(0, stats.hitFlash - dt)
        if stats.playerHealth <= 0 { respawn() }

        // Camera + projection → the frame uniforms every shader reads.
        let (view, eye) = CameraSystem.viewMatrix(world, player: player)
        let projection = Math.perspective(fovyRadians: fieldOfView.radians,
                                          aspect: max(aspect, 0.01),
                                          near: 0.1, far: 1200)
        let frame = FrameUniforms(viewProjection: projection * view,
                                  cameraPosition: eye,
                                  lightDirection: lightDirection)

        let instances = RenderSystem.buildInstances(world)
        let hud = HUD.build(stats: stats, aspect: max(aspect, 0.01))
        let position = world.get(Transform.self, player)?.position ?? .zero

        return FrameRenderData(frame: frame, instances: instances, playerPosition: position, hud: hud)
    }

    /// On destruction, reset the ship and clear the field. Score persists so you
    /// can still chase a high score across lives.
    private func respawn() {
        stats.playerHealth = stats.playerMaxHealth
        stats.deaths += 1
        world.store(Transform.self).mutate(player) {
            $0.position = .zero
            $0.rotation = Quat(angle: 0, axis: Vec3(0, 1, 0))
        }
        for enemy in world.store(Enemy.self).owners {
            world.destroy(enemy)
        }
        world.flushDestroyed()
    }
}
