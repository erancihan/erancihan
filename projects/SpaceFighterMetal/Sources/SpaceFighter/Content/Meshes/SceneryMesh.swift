import simd

/// Backdrop geometry: the starfield and the ground grid. Neither is entity art,
/// so they share a file rather than getting one each.
enum SceneryMesh {
    static func starfield(count: Int, span: Float) -> Mesh {
        var vertices: [Vertex] = []
        vertices.reserveCapacity(count)
        let half = span * 0.5
        for _ in 0..<count {
            let p = Vec3(
                Float.random(in: -half...half),
                Float.random(in: -half...half),
                Float.random(in: -half...half))
            vertices.append(
                Vertex(
                    position: p,
                    normal: Vec3(Float.random(in: 0.4...1.0), 0, 0)))
        }
        return Mesh(vertices: vertices, indices: [], primitive: .point)
    }

    static func grid(halfExtent: Float, spacing: Float) -> Mesh {
        var vertices: [Vertex] = []
        var i = -halfExtent
        while i <= halfExtent + 0.001 {
            vertices.append(Vertex(position: Vec3(i, 0, -halfExtent), normal: .zero))
            vertices.append(Vertex(position: Vec3(i, 0, halfExtent), normal: .zero))
            vertices.append(Vertex(position: Vec3(-halfExtent, 0, i), normal: .zero))
            vertices.append(Vertex(position: Vec3(halfExtent, 0, i), normal: .zero))
            i += spacing
        }
        return Mesh(vertices: vertices, indices: [], primitive: .line)
    }
}
