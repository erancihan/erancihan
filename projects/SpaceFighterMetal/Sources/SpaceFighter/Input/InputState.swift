import Foundation

/// What the player is asking for this frame, independent of how we read it.
struct InputState {
    var pitch: Float = 0      // + = nose up,   - = nose down
    var yaw: Float = 0        // + = nose left, - = nose right
    var roll: Float = 0       // + = roll left, - = roll right
    var throttle: Float = 0   // + = speed up,  - = slow down

    var firing: Bool = false
    var boosting: Bool = false
}

/// macOS virtual key codes. Positional, not character-based, so WASD stays
/// where it is on a non-QWERTY layout.
enum Key {
    static let w: UInt16 = 13
    static let a: UInt16 = 0
    static let s: UInt16 = 1
    static let d: UInt16 = 2
    static let q: UInt16 = 12
    static let e: UInt16 = 14
    static let space: UInt16 = 49
    static let arrowLeft: UInt16 = 123
    static let arrowRight: UInt16 = 124
    static let arrowDown: UInt16 = 125
    static let arrowUp: UInt16 = 126
    static let escape: UInt16 = 53
}

/// Collects raw key events into an InputState. This is the only type in the
/// project that knows what a key code is.
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
        if held(Key.w, Key.arrowUp) { s.pitch -= 1 }
        if held(Key.s, Key.arrowDown) { s.pitch += 1 }
        if held(Key.a, Key.arrowLeft) { s.yaw += 1 }
        if held(Key.d, Key.arrowRight) { s.yaw -= 1 }
        if held(Key.q) { s.roll += 1 }
        if held(Key.e) { s.roll -= 1 }

        s.firing = held(Key.space)
        s.boosting = boost
        state = s
    }
}
