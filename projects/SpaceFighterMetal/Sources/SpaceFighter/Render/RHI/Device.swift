import Metal
import MetalKit

/// The GPU, the command queue, and the view settings everything else assumes.
@MainActor
struct RHIDevice {
    let device: MTLDevice
    let queue: MTLCommandQueue

    init?(view: MTKView) {
        guard let device = view.device ?? MTLCreateSystemDefaultDevice(),
              let queue = device.makeCommandQueue() else {
            return nil
        }
        self.device = device
        self.queue = queue

        view.device = device
        view.colorPixelFormat = .bgra8Unorm
        view.depthStencilPixelFormat = .depth32Float
        view.clearColor = MTLClearColorMake(0.02, 0.02, 0.06, 1.0)
    }
}
