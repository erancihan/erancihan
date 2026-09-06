import simd

/// One vertex of a mesh. The vertex shader reads these via `[[vertex_id]]`.
struct Vertex {
    var position: Vec3
    var normal: Vec3
}

/// Per-entity draw data, indexed in the shader by `[[instance_id]]`.
struct InstanceData {
    var model: Mat4
    var color: Vec4
}

/// Constants shared by every draw in a frame.
struct FrameUniforms {
    var viewProjection: Mat4
    var cameraPosition: Vec3
    var lightDirection: Vec3
}
