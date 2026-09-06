import simd

/// Numbers several systems share. A reference type so they all see one copy.
final class GameStats {
    var score = 0
    var deaths = 0
    var playerHealth: Float = 100
    var playerMaxHealth: Float = 100
    var hitFlash: Float = 0  // seconds of red flash remaining
}

/// Difficulty knobs. Shrink spawnInterval or raise maxEnemies for a busier sky.
final class Director {
    var spawnTimer: Float = 1.0
    var spawnInterval: Float = 1.3
    var maxEnemies: Int = 22
}

/// Everything the renderer needs for one frame.
struct FrameRenderData {
    var frame: FrameUniforms
    var instances: [MeshID: [InstanceData]]
    var focus: Vec3
    var hud: [HUDVertex]
}

final class Game {
    let world = World()
    let stats = GameStats()
    let director = Director()

    private(set) var player: Entity = Entity(id: 0)

    private let fieldOfView: Float = 65
    private let lightDirection = simd_normalize(Vec3(-0.3, -1.0, -0.55))

    init() {
        player = spawnPlayer(in: world)
    }

    func update(dt rawDt: Float, input: InputState, aspect: Float) -> FrameRenderData {
        let dt = min(max(rawDt, 0), 1.0 / 30.0)

        FlightControlSystem.update(world, player: player, input: input, dt: dt)
        WeaponSystem.update(world, player: player, input: input, dt: dt)
        EnemySystem.update(world, player: player, director: director, dt: dt)
        MovementSystem.update(world, dt: dt)
        SpinSystem.update(world, dt: dt)
        LifetimeSystem.update(world, dt: dt)
        CollisionSystem.update(world, player: player, stats: stats)

        world.flushDestroyed()

        stats.hitFlash = max(0, stats.hitFlash - dt)
        if stats.playerHealth <= 0 {
            respawn()
        }

        let (view, eye) = CameraSystem.viewMatrix(world, player: player)
        let projection = Math.perspective(
            fovyRadians: fieldOfView.radians, aspect: max(aspect, 0.01), near: 0.1, far: 1200)
        let frame = FrameUniforms(
            viewProjection: projection * view, cameraPosition: eye, lightDirection: lightDirection)

        let instances = SceneSystem.buildInstances(world)
        let position = world.get(Transform.self, player)?.position ?? .zero

        return FrameRenderData(
            frame: frame,
            instances: instances,
            focus: position,
            hud: HUDSystem.build(stats: stats, aspect: max(aspect, 0.01))
        )
    }

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
