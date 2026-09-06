import simd

/// A small cube. Bolts scale it into a bar and draw it unlit, so it glows.
enum ProjectileMesh {
    static func make() -> Mesh {
        let h: Float = 0.5
        let v = [
            Vec3(-h, -h, -h), Vec3(h, -h, -h), Vec3(h, h, -h), Vec3(-h, h, -h),
            Vec3(-h, -h,  h), Vec3(h, -h,  h), Vec3(h, h,  h), Vec3(-h, h,  h),
        ]
        var tris: [(Vec3, Vec3, Vec3)] = []
        tris += MeshBuilder.quad(v[4], v[5], v[6], v[7])  // +Z
        tris += MeshBuilder.quad(v[1], v[0], v[3], v[2])  // -Z
        tris += MeshBuilder.quad(v[0], v[4], v[7], v[3])  // -X
        tris += MeshBuilder.quad(v[5], v[1], v[2], v[6])  // +X
        tris += MeshBuilder.quad(v[3], v[7], v[6], v[2])  // +Y
        tris += MeshBuilder.quad(v[0], v[1], v[5], v[4])  // -Y
        return MeshBuilder.flat(tris)
    }
}
