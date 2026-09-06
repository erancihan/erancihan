import simd

/// A tumbling octahedron — the simplest solid that still reads as hostile.
enum EnemyMesh {
    static func make() -> Mesh {
        let r: Float = 0.9
        let px = Vec3(r, 0, 0), nx = Vec3(-r, 0, 0)
        let py = Vec3(0, r, 0), ny = Vec3(0, -r, 0)
        let pz = Vec3(0, 0, r), nz = Vec3(0, 0, -r)
        return MeshBuilder.flat([
            (py, px, pz), (py, pz, nx), (py, nx, nz), (py, nz, px),  // top cap
            (ny, pz, px), (ny, nx, pz), (ny, nz, nx), (ny, px, nz),  // bottom cap
        ])
    }
}
