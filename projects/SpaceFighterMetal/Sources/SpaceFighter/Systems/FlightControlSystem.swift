import simd

/// Turns input into orientation and velocity. Responsive and forgiving; no
/// stalls, no real aerodynamics.
enum FlightControlSystem {
    // Maximum turn rates, radians / second.
    static let pitchRate: Float = 1.7
    static let yawRate: Float = 1.2
    static let rollRate: Float = 2.6
    static let autoBank: Float = 0.9  // extra roll folded in when yawing

    // Speed envelope, world units / second.
    static let cruiseSpeed: Float = 55
    static let boostMultiplier: Float = 1.9

    static func update(_ world: World, player: Entity, input: InputState, dt: Float) {
        let players = world.store(Player.self)
        let transforms = world.store(Transform.self)
        let velocities = world.store(Velocity.self)

        players.mutate(player) { $0.boosting = input.boosting }

        let pitch = input.pitch * pitchRate
        let yaw = input.yaw * yawRate
        let roll = input.roll * rollRate + input.yaw * autoBank
        transforms.mutate(player) { t in
            let delta =
                Quat(angle: pitch * dt, axis: Vec3(1, 0, 0)) *
                Quat(angle: yaw * dt,   axis: Vec3(0, 1, 0)) *
                Quat(angle: roll * dt,  axis: Vec3(0, 0, 1))
            t.rotation = simd_normalize(t.rotation * delta)
        }

        guard let t = transforms.get(player), let pl = players.get(player) else { return }
        let speed = cruiseSpeed * (pl.boosting ? boostMultiplier : 1)
        velocities.set(player, Velocity(linear: t.forward * speed))

    }
}
