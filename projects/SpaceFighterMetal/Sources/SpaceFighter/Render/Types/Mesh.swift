import simd

enum Primitive {
    case triangle  // ship, enemies, bullets
    case line  // the ground grid
    case point  // the starfield
}

/// CPU-side geometry. The renderer uploads this into GPU buffers once at
/// startup. An empty `indices` array means "draw non-indexed".
struct Mesh {
    var vertices: [Vertex]
    var indices: [UInt16]
    var primitive: Primitive
}
