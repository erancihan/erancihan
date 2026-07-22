import MetalKit
import QuartzCore

/// Collects raw key events into a tidy `InputState`. It knows about key codes;
/// nothing downstream does. Swap this out for a `GameController` reader and the
/// systems never notice.
final class InputController {
    private(set) var state = InputState()
    private var pressed = Set<UInt16>()
    private var boost = false

    func keyDown(_ code: UInt16) { pressed.insert(code); rebuild() }
    func keyUp(_ code: UInt16) { pressed.remove(code); rebuild() }
    func setBoost(_ on: Bool) { boost = on; rebuild() }

    private func rebuild() {
        func held(_ codes: UInt16...) -> Bool { codes.contains { pressed.contains($0) } }

        var s = InputState()
        // Pitch: nose down when pushing forward (flight-sim / Star Fox feel).
        if held(Key.w, Key.arrowUp) { s.pitch -= 1 }
        if held(Key.s, Key.arrowDown) { s.pitch += 1 }
        // Yaw: + is nose-left (see FlightControlSystem).
        if held(Key.a, Key.arrowLeft) { s.yaw += 1 }
        if held(Key.d, Key.arrowRight) { s.yaw -= 1 }
        // Roll.
        if held(Key.q) { s.roll += 1 }
        if held(Key.e) { s.roll -= 1 }

        s.firing = held(Key.space)
        s.boosting = boost
        state = s
    }
}

/// The `MTKViewDelegate`. MetalKit calls `draw(in:)` once per displayed frame;
/// that is our game loop's heartbeat. We measure real elapsed time, step the
/// game, hand the result to the renderer, and mirror the score into the title.
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
        renderer.render(in: view,
                        frame: data.frame,
                        instances: data.instances,
                        playerPosition: data.playerPosition,
                        hud: data.hud)

        view.window?.title = String(
            format: "Space Fighter — Score %d    Hull %.0f%%    Deaths %d",
            game.stats.score, max(0, game.stats.playerHealth), game.stats.deaths)
    }
}
