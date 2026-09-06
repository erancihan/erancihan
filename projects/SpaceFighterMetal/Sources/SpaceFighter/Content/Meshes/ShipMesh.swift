import simd

/// The player's fighter: a sleek four-faced dart whose nose points down -Z.
enum ShipMesh {
    static func make() -> Mesh {
        let nose  = Vec3( 0.0,  0.0, -2.0)
        let top   = Vec3( 0.0,  0.4,  1.0)
        let left  = Vec3(-1.3, -0.3,  1.0)
        let right = Vec3( 1.3, -0.3,  1.0)
        return MeshBuilder.flat([
            (nose, left, top),    // port hull
            (nose, top, right),   // starboard hull
            (nose, right, left),  // belly
            (top, left, right),   // engine deck
        ])
    }
}
