import Metal
import MetalKit

/// Colour-attachment blend presets.
enum BlendMode {
    case opaque  // replace destination
    case additive  // src + dst — glows and light-on-dark line art
    case alpha  // standard transparency for the HUD

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

/// Every baked render and depth state the renderer switches between.
@MainActor
struct Pipelines {
    let lit: MTLRenderPipelineState
    let unlit: MTLRenderPipelineState
    let star: MTLRenderPipelineState
    let hud: MTLRenderPipelineState

    let solidDepth: MTLDepthStencilState  // test + write (opaque)
    let readDepth: MTLDepthStencilState  // test, no write (glows)
    let noDepth: MTLDepthStencilState  // no test/write (HUD)

    init?(device: MTLDevice, view: MTKView, library: MTLLibrary) {
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
            let hud = pipeline("hud_vertex", "hud_fragment", blend: .alpha)
        else {
            print("Pipeline creation failed")
            return nil
        }
        self.lit = lit
        self.unlit = unlit
        self.star = star
        self.hud = hud

        func depth(test: Bool, write: Bool) -> MTLDepthStencilState {
            let d = MTLDepthStencilDescriptor()
            d.depthCompareFunction = test ? .less : .always
            d.isDepthWriteEnabled = write
            return device.makeDepthStencilState(descriptor: d)!
        }
        solidDepth = depth(test: true, write: true)
        readDepth = depth(test: true, write: false)
        noDepth = depth(test: false, write: false)
    }
}
