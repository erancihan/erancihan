import Metal
import MetalKit
import simd

/// Extra per-draw parameters for the star field. Private to the renderer, which
/// is why it has no twin in GPUContract.swift.
private struct StarParams {
    var span: Float
    var pointSize: Float
}

@MainActor
final class Renderer {

    // MARK: Tunables
    static let groundY: Float = -8  // altitude of the reference grid

    private let rhi: RHIDevice
    private let pipelines: Pipelines
    private let meshes: MeshRegistry

    var device: MTLDevice { rhi.device }

    init?(view: MTKView) {
        guard let rhi = RHIDevice(view: view) else { return nil }

        let library: MTLLibrary
        do {
            library = try ShaderLibrary.make(device: rhi.device)
        } catch {
            print("Shader compilation failed: \(error)")
            return nil
        }

        guard let pipelines = Pipelines(device: rhi.device, view: view, library: library)
        else { return nil }

        self.rhi = rhi
        self.pipelines = pipelines
        self.meshes = MeshRegistry(device: rhi.device)
    }

    func render(
        in view: MTKView,
        frame: FrameUniforms,
        instances: [MeshID: [InstanceData]],
        focus: Vec3,
        hud: [HUDVertex]
    ) {
        guard let rpd = view.currentRenderPassDescriptor,
            let drawable = view.currentDrawable,
            let command = rhi.queue.makeCommandBuffer(),
            let encoder = command.makeRenderCommandEncoder(descriptor: rpd)
        else {
            return
        }

        var frame = frame
        encoder.setCullMode(.none)

        drawGrid(encoder, frame: &frame, focus: focus)
        drawStars(encoder, frame: &frame)
        drawLit(encoder, frame: &frame, instances: instances)
        drawGlow(encoder, frame: &frame, instances: instances)
        drawHUD(encoder, hud)

        encoder.endEncoding()
        command.present(drawable)
        command.commit()
    }

    private func drawGrid(_ enc: MTLRenderCommandEncoder, frame: inout FrameUniforms, focus: Vec3) {
        guard let mesh = meshes[SceneryID.grid] else { return }
        let s = SceneryID.gridSpacing
        let gx = (focus.x / s).rounded() * s
        let gz = (focus.z / s).rounded() * s
        let model = Math.translation(Vec3(gx, Renderer.groundY, gz))
        let instance = [InstanceData(model: model, color: Vec4(0.10, 0.35, 0.45, 1))]

        enc.setRenderPipelineState(pipelines.unlit)
        enc.setDepthStencilState(pipelines.solidDepth)
        enc.setVertexBytes(&frame, length: MemoryLayout<FrameUniforms>.stride, index: 2)
        drawMesh(enc, mesh, instances: instance)
    }

    private func drawStars(_ enc: MTLRenderCommandEncoder, frame: inout FrameUniforms) {
        guard let mesh = meshes[SceneryID.starfield] else { return }
        enc.setRenderPipelineState(pipelines.star)
        enc.setDepthStencilState(pipelines.readDepth)
        enc.setVertexBytes(&frame, length: MemoryLayout<FrameUniforms>.stride, index: 2)
        var params = StarParams(span: SceneryID.starSpan, pointSize: 2.0)
        enc.setVertexBytes(&params, length: MemoryLayout<StarParams>.stride, index: 3)
        let instance = [InstanceData(model: Math.identity, color: Vec4(1, 1, 1, 1))]
        drawMesh(enc, mesh, instances: instance)
    }

    private func drawLit(
        _ enc: MTLRenderCommandEncoder, frame: inout FrameUniforms,
        instances: [MeshID: [InstanceData]]
    ) {
        enc.setRenderPipelineState(pipelines.lit)
        enc.setDepthStencilState(pipelines.solidDepth)
        enc.setVertexBytes(&frame, length: MemoryLayout<FrameUniforms>.stride, index: 2)
        enc.setFragmentBytes(&frame, length: MemoryLayout<FrameUniforms>.stride, index: 0)
        for id in MeshID.allCases where id.material == .lit {
            guard let list = instances[id], !list.isEmpty, let mesh = meshes[id] else { continue }
            drawMesh(enc, mesh, instances: list)
        }
    }

    private func drawGlow(
        _ enc: MTLRenderCommandEncoder, frame: inout FrameUniforms,
        instances: [MeshID: [InstanceData]]
    ) {
        enc.setRenderPipelineState(pipelines.unlit)
        enc.setDepthStencilState(pipelines.readDepth)  // glows don't occlude
        enc.setVertexBytes(&frame, length: MemoryLayout<FrameUniforms>.stride, index: 2)
        for id in MeshID.allCases where id.material == .glow {
            guard let list = instances[id], !list.isEmpty, let mesh = meshes[id] else { continue }
            drawMesh(enc, mesh, instances: list)
        }
    }

    private func drawHUD(_ enc: MTLRenderCommandEncoder, _ hud: [HUDVertex]) {
        guard !hud.isEmpty else { return }
        enc.setRenderPipelineState(pipelines.hud)
        enc.setDepthStencilState(pipelines.noDepth)
        let buffer = device.makeBuffer(
            bytes: hud,
            length: hud.count * MemoryLayout<HUDVertex>.stride,
            options: .storageModeShared)!
        enc.setVertexBuffer(buffer, offset: 0, index: 0)
        enc.drawPrimitives(type: .triangle, vertexStart: 0, vertexCount: hud.count)
    }

    private func drawMesh(
        _ enc: MTLRenderCommandEncoder, _ mesh: GPUMesh, instances: [InstanceData]
    ) {
        let instanceBuffer = device.makeBuffer(
            bytes: instances,
            length: instances.count * MemoryLayout<InstanceData>.stride,
            options: .storageModeShared)!
        enc.setVertexBuffer(mesh.vertexBuffer, offset: 0, index: 0)
        enc.setVertexBuffer(instanceBuffer, offset: 0, index: 1)

        if let indexBuffer = mesh.indexBuffer {
            enc.drawIndexedPrimitives(
                type: mesh.primitive,
                indexCount: mesh.indexCount,
                indexType: .uint16,
                indexBuffer: indexBuffer,
                indexBufferOffset: 0,
                instanceCount: instances.count)
        } else {
            enc.drawPrimitives(
                type: mesh.primitive,
                vertexStart: 0,
                vertexCount: mesh.vertexCount,
                instanceCount: instances.count)
        }
    }
}
