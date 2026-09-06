import simd

/// Shared geometry helpers. Every shape in `Content/Meshes/` is built from
/// these, so they are `internal` rather than `private` — the shapes live in
/// their own files now.
enum MeshBuilder {

    static func flat(_ tris: [(Vec3, Vec3, Vec3)]) -> Mesh {
        var sum = Vec3.zero
        for t in tris { sum += t.0 + t.1 + t.2 }
        let centroid = sum / Float(tris.count * 3)

        var vertices: [Vertex] = []
        var indices: [UInt16] = []
        vertices.reserveCapacity(tris.count * 3)
        indices.reserveCapacity(tris.count * 3)

        for t in tris {
            let faceCenter = (t.0 + t.1 + t.2) / 3
            var normal = simd_normalize(simd_cross(t.1 - t.0, t.2 - t.0))
            if simd_dot(normal, faceCenter - centroid) < 0 { normal = -normal }
            let base = UInt16(vertices.count)
            vertices.append(Vertex(position: t.0, normal: normal))
            vertices.append(Vertex(position: t.1, normal: normal))
            vertices.append(Vertex(position: t.2, normal: normal))
            indices.append(base)
            indices.append(base + 1)
            indices.append(base + 2)
        }

        return Mesh(vertices: vertices, indices: indices, primitive: .triangle)
    }

    /// Split a quad (given counter-clockwise) into two triangles.
    static func quad(_ a: Vec3, _ b: Vec3, _ c: Vec3, _ d: Vec3) -> [(Vec3, Vec3, Vec3)] {
        [(a, b, c), (a, c, d)]
    }
}
