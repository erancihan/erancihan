import simd

/// Which mesh to draw and what colour to tint it. Referenced by id, so
/// components never touch Metal.
struct Renderable {
    var mesh: MeshID
    var color: Vec4
}
