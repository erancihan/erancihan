import Metal
import MetalKit
import simd

/// Extra per-draw parameters for the star field (kept private to the renderer).
private struct StarParams {
    var span: Float
    var pointSize: Float
}

/// Owns the Metal device, the pipeline states, and the GPU copies of every mesh.
/// Everything GPU-facing lives here; the rest of the game speaks only in
/// entities, components and `InstanceData`.
final class Renderer {

    // MARK: Tunables
    static let starSpan: Float = 480      // side length of the star tiling cube
    static let gridSpacing: Float = 6     // world units between grid lines
    static let groundY: Float = -8        // altitude of the reference grid

    let device: MTLDevice
    private let queue: MTLCommandQueue

    // Pipelines, one per shading style.
    private let litPipeline: MTLRenderPipelineState
    private let unlitPipeline: MTLRenderPipelineState
    private let starPipeline: MTLRenderPipelineState
    private let hudPipeline: MTLRenderPipelineState

    // Depth/stencil states.
    private let solidDepth: MTLDepthStencilState   // test + write (opaque)
    private let readDepth: MTLDepthStencilState    // test, no write (glows)
    private let noDepth: MTLDepthStencilState      // no test/write (HUD)

    // GPU meshes.
    private struct GPUMesh {
        var vertexBuffer: MTLBuffer
        var indexBuffer: MTLBuffer?
        var indexCount: Int
        var vertexCount: Int
        var primitive: MTLPrimitiveType
    }
    private var meshes: [MeshID: GPUMesh] = [:]
    private let starMesh: GPUMesh
    private let gridMesh: GPUMesh

    init?(view: MTKView) {
        guard let device = view.device ?? MTLCreateSystemDefaultDevice(),
              let queue = device.makeCommandQueue() else {
            return nil
        }
        self.device = device
        self.queue = queue

        // Configure the view's render targets. Setting a depth format makes
        // MetalKit manage the depth texture for us, so `currentRenderPassDescriptor`
        // arrives with a depth attachment already wired up.
        view.device = device
        view.colorPixelFormat = .bgra8Unorm
        view.depthStencilPixelFormat = .depth32Float
        view.clearColor = MTLClearColorMake(0.02, 0.02, 0.06, 1.0)

        // Compile all shaders in one library.
        let library: MTLLibrary
        do {
            library = try device.makeLibrary(source: Shaders.source, options: nil)
        } catch {
            print("Shader compilation failed: \(error)")
            return nil
        }

        func pipeline(_ vfn: String, _ ffn: String, blend: BlendMode) -> MTLRenderPipelineState? {
            let d = MTLRenderPipelineDescriptor()
            d.vertexFunction = library.makeFunction(name: vfn)
            d.fragmentFunction = library.makeFunction(name: ffn)
            d.colorAttachments[0].pixelFormat = view.colorPixelFormat
            d.depthAttachmentPixelFormat = view.depthStencilPixelFormat
            blend.apply(to: d.colorAttachments[0])
            return try? device.makeRenderPipelineState(descriptor: d)
        }

        guard let lit = pipeline("lit_vertex", "lit_fragment", blend: .opaque),
              let unlit = pipeline("unlit_vertex", "unlit_fragment", blend: .additive),
              let star = pipeline("star_vertex", "star_fragment", blend: .additive),
              let hud = pipeline("hud_vertex", "hud_fragment", blend: .alpha) else {
            print("Pipeline creation failed")
            return nil
        }
        litPipeline = lit
        unlitPipeline = unlit
        starPipeline = star
        hudPipeline = hud

        func depth(test: Bool, write: Bool) -> MTLDepthStencilState {
            let d = MTLDepthStencilDescriptor()
            d.depthCompareFunction = test ? .less : .always
            d.isDepthWriteEnabled = write
            return device.makeDepthStencilState(descriptor: d)!
        }
        solidDepth = depth(test: true, write: true)
        readDepth = depth(test: true, write: false)
        noDepth = depth(test: false, write: false)

        // Upload every mesh once, up front.
        func upload(_ mesh: Mesh) -> GPUMesh {
            let vbuf = device.makeBuffer(bytes: mesh.vertices,
                                         length: mesh.vertices.count * MemoryLayout<Vertex>.stride,
                                         options: .storageModeShared)!
            var ibuf: MTLBuffer?
            if !mesh.indices.isEmpty {
                ibuf = device.makeBuffer(bytes: mesh.indices,
                                         length: mesh.indices.count * MemoryLayout<UInt16>.stride,
                                         options: .storageModeShared)
            }
            return GPUMesh(vertexBuffer: vbuf,
                           indexBuffer: ibuf,
                           indexCount: mesh.indices.count,
                           vertexCount: mesh.vertices.count,
                           primitive: Renderer.metalPrimitive(mesh.primitive))
        }

        meshes[.ship] = upload(MeshLibrary.ship())
        meshes[.enemy] = upload(MeshLibrary.enemy())
        meshes[.projectile] = upload(MeshLibrary.projectile())
        starMesh = upload(MeshLibrary.starfield(count: 2600, span: Renderer.starSpan))
        gridMesh = upload(MeshLibrary.grid(halfExtent: 240, spacing: Renderer.gridSpacing))
    }

    private static func metalPrimitive(_ p: Primitive) -> MTLPrimitiveType {
        switch p {
        case .triangle: return .triangle
        case .line:     return .line
        case .point:    return .point
        }
    }

    // MARK: - Frame

    /// Draw one frame. `instances` groups every visible actor by its mesh; the
    /// renderer issues one instanced draw call per group.
    func render(in view: MTKView,
                frame: FrameUniforms,
                instances: [MeshID: [InstanceData]],
                playerPosition: Vec3,
                hud: [HUDVertex]) {
        guard let rpd = view.currentRenderPassDescriptor,
              let drawable = view.currentDrawable,
              let command = queue.makeCommandBuffer(),
              let encoder = command.makeRenderCommandEncoder(descriptor: rpd) else {
            return
        }

        var frame = frame
        // Our flat-shaded meshes carry outward normals and we draw both grids and
        // thin bolts, so it's simplest to skip back-face culling entirely.
        encoder.setCullMode(.none)

        drawGrid(encoder, frame: &frame, playerPosition: playerPosition)
        drawStars(encoder, frame: &frame)
        drawLitActors(encoder, frame: &frame, instances: instances)
        drawProjectiles(encoder, frame: &frame, instances: instances)
        drawHUD(encoder, hud)

        encoder.endEncoding()
        command.present(drawable)
        command.commit()
    }

    // MARK: - Passes

    private func drawGrid(_ enc: MTLRenderCommandEncoder, frame: inout FrameUniforms, playerPosition: Vec3) {
        // Snap the grid under the player so it reads as an infinite floor
        // without the lines crawling as we move.
        let s = Renderer.gridSpacing
        let gx = (playerPosition.x / s).rounded() * s
        let gz = (playerPosition.z / s).rounded() * s
        let model = Math.translation(Vec3(gx, Renderer.groundY, gz))
        let instance = [InstanceData(model: model, color: Vec4(0.10, 0.35, 0.45, 1))]

        enc.setRenderPipelineState(unlitPipeline)
        enc.setDepthStencilState(solidDepth)
        enc.setVertexBytes(&frame, length: MemoryLayout<FrameUniforms>.stride, index: 2)
        drawMesh(enc, gridMesh, instances: instance)
    }

    private func drawStars(_ enc: MTLRenderCommandEncoder, frame: inout FrameUniforms) {
        enc.setRenderPipelineState(starPipeline)
        enc.setDepthStencilState(readDepth)
        enc.setVertexBytes(&frame, length: MemoryLayout<FrameUniforms>.stride, index: 2)
        var params = StarParams(span: Renderer.starSpan, pointSize: 2.0)
        enc.setVertexBytes(&params, length: MemoryLayout<StarParams>.stride, index: 3)
        let instance = [InstanceData(model: Math.identity, color: Vec4(1, 1, 1, 1))]
        drawMesh(enc, starMesh, instances: instance)
    }

    private func drawLitActors(_ enc: MTLRenderCommandEncoder, frame: inout FrameUniforms, instances: [MeshID: [InstanceData]]) {
        enc.setRenderPipelineState(litPipeline)
        enc.setDepthStencilState(solidDepth)
        enc.setVertexBytes(&frame, length: MemoryLayout<FrameUniforms>.stride, index: 2)
        enc.setFragmentBytes(&frame, length: MemoryLayout<FrameUniforms>.stride, index: 0)
        for id in [MeshID.ship, .enemy] {
            guard let list = instances[id], !list.isEmpty, let mesh = meshes[id] else { continue }
            drawMesh(enc, mesh, instances: list)
        }
    }

    private func drawProjectiles(_ enc: MTLRenderCommandEncoder, frame: inout FrameUniforms, instances: [MeshID: [InstanceData]]) {
        guard let list = instances[.projectile], !list.isEmpty, let mesh = meshes[.projectile] else { return }
        enc.setRenderPipelineState(unlitPipeline)
        enc.setDepthStencilState(readDepth)          // glows don't occlude
        enc.setVertexBytes(&frame, length: MemoryLayout<FrameUniforms>.stride, index: 2)
        drawMesh(enc, mesh, instances: list)
    }

    private func drawHUD(_ enc: MTLRenderCommandEncoder, _ hud: [HUDVertex]) {
        guard !hud.isEmpty else { return }
        enc.setRenderPipelineState(hudPipeline)
        enc.setDepthStencilState(noDepth)
        let buffer = device.makeBuffer(bytes: hud,
                                       length: hud.count * MemoryLayout<HUDVertex>.stride,
                                       options: .storageModeShared)!
        enc.setVertexBuffer(buffer, offset: 0, index: 0)
        enc.drawPrimitives(type: .triangle, vertexStart: 0, vertexCount: hud.count)
    }

    /// Bind a mesh + an instance array and issue one instanced draw call.
    ///
    /// For a teaching prototype we allocate the instance buffer per call, which
    /// is simple and fine at these counts. A shipping game would reuse a small
    /// ring of buffers instead (see chapter 12).
    private func drawMesh(_ enc: MTLRenderCommandEncoder, _ mesh: GPUMesh, instances: [InstanceData]) {
        let instanceBuffer = device.makeBuffer(bytes: instances,
                                               length: instances.count * MemoryLayout<InstanceData>.stride,
                                               options: .storageModeShared)!
        enc.setVertexBuffer(mesh.vertexBuffer, offset: 0, index: 0)
        enc.setVertexBuffer(instanceBuffer, offset: 0, index: 1)

        if let indexBuffer = mesh.indexBuffer {
            enc.drawIndexedPrimitives(type: mesh.primitive,
                                      indexCount: mesh.indexCount,
                                      indexType: .uint16,
                                      indexBuffer: indexBuffer,
                                      indexBufferOffset: 0,
                                      instanceCount: instances.count)
        } else {
            enc.drawPrimitives(type: mesh.primitive,
                               vertexStart: 0,
                               vertexCount: mesh.vertexCount,
                               instanceCount: instances.count)
        }
    }
}

/// Colour-attachment blend presets.
private enum BlendMode {
    case opaque    // replace destination
    case additive  // src + dst — glows and light-on-dark line art
    case alpha     // standard transparency for the HUD

    func apply(to attachment: MTLRenderPipelineColorAttachmentDescriptor?) {
        guard let a = attachment else { return }
        switch self {
        case .opaque:
            a.isBlendingEnabled = false
        case .additive:
            a.isBlendingEnabled = true
            a.rgbBlendOperation = .add
            a.alphaBlendOperation = .add
            a.sourceRGBBlendFactor = .sourceAlpha
            a.sourceAlphaBlendFactor = .one
            a.destinationRGBBlendFactor = .one
            a.destinationAlphaBlendFactor = .one
        case .alpha:
            a.isBlendingEnabled = true
            a.rgbBlendOperation = .add
            a.alphaBlendOperation = .add
            a.sourceRGBBlendFactor = .sourceAlpha
            a.sourceAlphaBlendFactor = .sourceAlpha
            a.destinationRGBBlendFactor = .oneMinusSourceAlpha
            a.destinationAlphaBlendFactor = .oneMinusSourceAlpha
        }
    }
}
