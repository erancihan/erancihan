import MetalKit
import QuartzCore

/// MetalKit calls `draw(in:)` once per displayed frame. That is the game loop.
final class RenderCoordinator: NSObject, MTKViewDelegate {
    private let game: Game
    private let renderer: Renderer
    private let input: InputController
    private var lastTime: CFTimeInterval

    init(game: Game, renderer: Renderer, input: InputController) {
        self.game = game
        self.renderer = renderer
        self.input = input
        self.lastTime = CACurrentMediaTime()
    }

    func mtkView(_ view: MTKView, drawableSizeWillChange size: CGSize) {}

    func draw(in view: MTKView) {
        let now = CACurrentMediaTime()
        let dt = Float(now - lastTime)
        lastTime = now

        let size = view.drawableSize
        let aspect = Float(size.width / max(size.height, 1))

        let data = game.update(dt: dt, input: input.state, aspect: aspect)
        renderer.render(
            in: view,
            frame: data.frame,
            instances: data.instances,
            focus: data.focus,
            hud: data.hud)

        view.window?.title = String(
            format: "Space Fighter — Score %d    Hull %.0f%%    Deaths %d",
            game.stats.score, max(0, game.stats.playerHealth), game.stats.deaths)
    }

}
