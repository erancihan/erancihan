import simd

/// A chase camera that sits behind and slightly above the ship and looks a bit
/// ahead of it. The "up" is mostly world-up with a touch of the ship's own up
/// mixed in, so hard banks read on screen without making the whole world spin
/// (and without turning anyone's stomach).
enum CameraSystem {
    static let distanceBack: Float = 9
    static let heightAbove: Float = 3
    static let lookAhead: Float = 14

    static func viewMatrix(_ world: World, player: Entity) -> (view: Mat4, eye: Vec3) {
        guard let t = world.get(Transform.self, player) else {
            return (Math.identity, .zero)
        }
        let eye = t.position - t.forward * distanceBack + t.up * heightAbove
        let center = t.position + t.forward * lookAhead
        let camUp = simd_normalize(Vec3(0, 1, 0) * 0.65 + t.up * 0.35)
        return (Math.lookAt(eye: eye, center: center, up: camUp), eye)
    }
}
