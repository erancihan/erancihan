import simd

/// How a mesh's vertices are assembled by the GPU.
enum Primitive {
    case triangle   // solid surfaces (ship, enemies, bullets)
    case line       // the ground grid
    case point      // the starfield
}

/// A CPU-side mesh: raw geometry the `Renderer` uploads into GPU buffers once at
/// startup. If `indices` is empty the mesh is drawn non-indexed.
struct Mesh {
    var vertices: [Vertex]
    var indices: [UInt16]
    var primitive: Primitive
}

// MARK: - Procedural geometry
//
// Everything here is generated in code — no model files, no asset pipeline.
// That's deliberate: "simple geometry for now". Each solid shape is *flat
// shaded*: every triangle gets its own three vertices and a single face normal,
// which gives the crisp faceted look of classic low-poly space shooters and
// keeps the maths trivial. Chapter 06 walks through this.

enum MeshLibrary {

    // MARK: Triangle-soup helpers

    /// Build a flat-shaded mesh from a list of triangles. Each triangle becomes
    /// three fresh vertices sharing one normal. The normal is computed from the
    /// winding, then flipped if it points *toward* the shape's centre, so faces
    /// always light correctly regardless of the order we listed corners in.
    private static func flat(_ tris: [(Vec3, Vec3, Vec3)]) -> Mesh {
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

    /// Split a quad (given CCW) into two triangles.
    private static func quad(_ a: Vec3, _ b: Vec3, _ c: Vec3, _ d: Vec3) -> [(Vec3, Vec3, Vec3)] {
        [(a, b, c), (a, c, d)]
    }

    // MARK: Meshes

    /// The player's fighter: a sleek four-faced dart whose nose points down -Z
    /// (the forward convention used everywhere in this project).
    static func ship() -> Mesh {
        let nose  = Vec3( 0.0,  0.0, -2.0)
        let top   = Vec3( 0.0,  0.4,  1.0)
        let left  = Vec3(-1.3, -0.3,  1.0)
        let right = Vec3( 1.3, -0.3,  1.0)
        return flat([
            (nose, left, top),    // port hull
            (nose, top, right),   // starboard hull
            (nose, right, left),  // belly
            (top, left, right),   // engine deck (back)
        ])
    }

    /// A tumbling octahedron enemy — the simplest solid that still reads as a
    /// deliberate, hostile shape.
    static func enemy() -> Mesh {
        let r: Float = 0.9
        let px = Vec3(r, 0, 0), nx = Vec3(-r, 0, 0)
        let py = Vec3(0, r, 0), ny = Vec3(0, -r, 0)
        let pz = Vec3(0, 0, r), nz = Vec3(0, 0, -r)
        return flat([
            (py, px, pz), (py, pz, nx), (py, nx, nz), (py, nz, px),  // top cap
            (ny, pz, px), (ny, nx, pz), (ny, nz, nx), (ny, px, nz),  // bottom cap
        ])
    }

    /// A small cube used for the player's bolts (rendered unlit so it glows).
    static func projectile() -> Mesh {
        let h: Float = 0.5
        let v = [
            Vec3(-h, -h, -h), Vec3(h, -h, -h), Vec3(h, h, -h), Vec3(-h, h, -h),  // 0..3 back
            Vec3(-h, -h,  h), Vec3(h, -h,  h), Vec3(h, h,  h), Vec3(-h, h,  h),  // 4..7 front
        ]
        var tris: [(Vec3, Vec3, Vec3)] = []
        tris += quad(v[4], v[5], v[6], v[7])  // +Z
        tris += quad(v[1], v[0], v[3], v[2])  // -Z
        tris += quad(v[0], v[4], v[7], v[3])  // -X
        tris += quad(v[5], v[1], v[2], v[6])  // +X
        tris += quad(v[3], v[7], v[6], v[2])  // +Y
        tris += quad(v[0], v[1], v[5], v[4])  // -Y
        return flat(tris)
    }

    /// A cloud of point stars in a cube. The star vertex shader wraps these
    /// around the camera so the same few thousand points tile the whole sky
    /// (chapter 06 explains the modulo trick).
    static func starfield(count: Int, span: Float) -> Mesh {
        var vertices: [Vertex] = []
        vertices.reserveCapacity(count)
        let half = span * 0.5
        for _ in 0..<count {
            let p = Vec3(
                Float.random(in: -half...half),
                Float.random(in: -half...half),
                Float.random(in: -half...half)
            )
            // Vary brightness a touch via the normal.x channel, reused as a
            // scalar in the star shader.
            vertices.append(Vertex(position: p, normal: Vec3(Float.random(in: 0.4...1.0), 0, 0)))
        }
        return Mesh(vertices: vertices, indices: [], primitive: .point)
    }

    /// A flat reference grid on the XZ plane, drawn as lines. The renderer
    /// snaps it under the player so it reads as an endless floor/horizon.
    static func grid(halfExtent: Float, spacing: Float) -> Mesh {
        var vertices: [Vertex] = []
        var i = -halfExtent
        while i <= halfExtent + 0.001 {
            // Lines parallel to Z.
            vertices.append(Vertex(position: Vec3(i, 0, -halfExtent), normal: .zero))
            vertices.append(Vertex(position: Vec3(i, 0,  halfExtent), normal: .zero))
            // Lines parallel to X.
            vertices.append(Vertex(position: Vec3(-halfExtent, 0, i), normal: .zero))
            vertices.append(Vertex(position: Vec3( halfExtent, 0, i), normal: .zero))
            i += spacing
        }
        return Mesh(vertices: vertices, indices: [], primitive: .line)
    }
}
