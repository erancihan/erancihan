import simd

// These structs are the contract between Swift and the Metal shaders. Their
// memory layout MUST match the corresponding `struct`s in `Shaders.swift`, or
// the GPU will read garbage. We rely on `simd` types having the same size and
// alignment as MSL's `float3`/`float4`/`float4x4`:
//
//   SIMD3<Float>  -> float3     (16 bytes, 16-aligned — note the padding!)
//   SIMD4<Float>  -> float4     (16 bytes)
//   simd_float4x4 -> float4x4   (64 bytes)
//
// The one trap is `float3`: it is 16-byte aligned, so a lone `Float` after one
// silently gains padding. Keeping everything in `SIMD*` types sidesteps that.

/// One vertex of a mesh. Read by the vertex shader via `[[vertex_id]]`.
struct Vertex {
    var position: Vec3
    var normal: Vec3
}

/// Per-entity draw data. One of these per visible entity, uploaded as an array
/// and indexed in the shader by `[[instance_id]]`.
struct InstanceData {
    var model: Mat4
    var color: Vec4
}

/// Constants shared by every draw in a frame: the combined camera matrix, where
/// the camera is, and the direction sunlight travels.
struct FrameUniforms {
    var viewProjection: Mat4
    var cameraPosition: Vec3
    var lightDirection: Vec3
}

/// A 2D vertex for the heads-up display, positioned directly in normalised
/// device coordinates (-1…1, origin at screen centre).
struct HUDVertex {
    var position: SIMD2<Float>
    var color: Vec4
}

/// Names the handful of meshes the game draws. Gameplay code refers to art by
/// id only (`Renderable(mesh: .enemy, …)`); the renderer owns the GPU buffers.
enum MeshID: Int, CaseIterable {
    case ship
    case enemy
    case projectile
}
