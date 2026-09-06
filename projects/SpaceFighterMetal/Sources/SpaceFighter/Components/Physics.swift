/// A sphere for cheap collision tests. `layer` is what this *is*; `mask` is
/// what it reacts to.
struct Collider {
    var radius: Float
    var layer: CollisionLayer
    var mask: CollisionLayer
}

struct CollisionLayer: OptionSet {
    let rawValue: UInt8
    static let player     = CollisionLayer(rawValue: 1 << 0)
    static let enemy      = CollisionLayer(rawValue: 1 << 1)
    static let projectile = CollisionLayer(rawValue: 1 << 2)
}
