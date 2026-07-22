import Foundation

/// A snapshot of what the player is pressing this frame, decoupled from *how*
/// we read it. `GameView` fills this in from AppKit key events; systems read the
/// derived axes below and never see a key code. Swapping in a gamepad later
/// means changing only the code that writes these fields.
struct InputState {
    // Held keys, resolved into signed axes in the range [-1, 1].
    var pitch: Float = 0      // + = nose up,   - = nose down
    var yaw: Float = 0        // + = nose left, - = nose right
    var roll: Float = 0       // + = roll left, - = roll right
    var throttle: Float = 0   // + = speed up,  - = slow down

    var firing: Bool = false
    var boosting: Bool = false

    /// Set for a single frame when Esc is pressed, so the app can quit.
    var quit: Bool = false
}

/// The physical keys we care about, as macOS virtual key codes. Using codes
/// rather than characters means the layout is positional (WASD stays where it
/// is on a non-QWERTY keyboard).
enum Key {
    static let w: UInt16 = 13
    static let a: UInt16 = 0
    static let s: UInt16 = 1
    static let d: UInt16 = 2
    static let q: UInt16 = 12
    static let e: UInt16 = 14
    static let space: UInt16 = 49
    static let shift: UInt16 = 56       // left shift (via flagsChanged)
    static let arrowLeft: UInt16 = 123
    static let arrowRight: UInt16 = 124
    static let arrowDown: UInt16 = 125
    static let arrowUp: UInt16 = 126
    static let escape: UInt16 = 53
}
