import Metal

/// A `Mesh` after upload: the same geometry, now in GPU memory.
struct GPUMesh {
    var vertexBuffer: MTLBuffer
    var indexBuffer: MTLBuffer?
    var indexCount: Int
    var vertexCount: Int
    var primitive: MTLPrimitiveType
}

/// The only place that knows our `Primitive` and Metal's are related — which is
/// what keeps `Render/Types/Mesh.swift` free of any Metal import.
private func metalPrimitive(_ p: Primitive) -> MTLPrimitiveType {
    switch p {
    case .triangle: return .triangle
    case .line: return .line
    case .point: return .point
    }
}

extension MTLDevice {
    /// Copy a CPU mesh into GPU buffers. Called once per mesh, at startup.
    func upload(_ mesh: Mesh) -> GPUMesh {
        let vbuf = makeBuffer(
            bytes: mesh.vertices,
            length: mesh.vertices.count * MemoryLayout<Vertex>.stride,
            options: .storageModeShared)!
        var ibuf: MTLBuffer?
        if !mesh.indices.isEmpty {
            ibuf = makeBuffer(
                bytes: mesh.indices,
                length: mesh.indices.count * MemoryLayout<UInt16>.stride,
                options: .storageModeShared)
        }
        return GPUMesh(
            vertexBuffer: vbuf,
            indexBuffer: ibuf,
            indexCount: mesh.indices.count,
            vertexCount: mesh.vertices.count,
            primitive: metalPrimitive(mesh.primitive))
    }
}
