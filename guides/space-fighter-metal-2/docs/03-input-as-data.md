# 03 · Input as data 🛠️

> **You'll leave this chapter with:** one struct that says what the player
> wants this tick — produced by a keyboard that behaves like a stick, and
> optionally by a mouse or a gamepad — plus the ability to record a whole run
> to a file and play it back, bit for bit.
>
> **Files created:** `Sources/SpaceFighter/Input/InputFrame.swift`,
> `Input/KeyBindings.swift`, `Input/Sources/KeyboardSource.swift`,
> `Input/Sources/MouseSource.swift`, `Input/Sources/GamepadSource.swift`,
> `Input/InputMixer.swift`, `Input/InputLog.swift`, `Core/ByteCoder.swift`,
> `Tests/SpaceFighterTests/Ch03InputTests.swift`
> **Files changed:** `Game.swift`, `GameView.swift`, `main.swift`,
> `Systems/FlightControlSystem.swift`, `Systems/WeaponSystems.swift`,
> `Tests/SpaceFighterTests/Ch02DeterminismTests.swift`
> **Files deleted:** `Input/InputState.swift`

The first guide's `InputState` did one thing well: it separated *what the
player wants* from *which key they pressed*, so no system ever saw a key
code. Keep that. What it didn't do is treat the answer as a value worth
keeping. Every axis was `0` or `±1`, it existed for one frame, and then it was
gone. Chapter 04 needs a stick, not a switch; chapter 13 needs to put the
player's intent in a packet; and this chapter needs to write ten seconds of it
to disk and play it back. All three want the same thing: **input as a value
type, one per tick, with no device in it.**

The chapter is longer than it is hard. Most of it is plumbing, and two
sections — the mouse and the gamepad — are optional.

---

## One struct per tick

**`Sources/SpaceFighter/Input/InputFrame.swift`** — new file:

```swift
/// Everything a player asked for during one tick. Simulation reads this and
/// nothing else about the player's hands: no key codes, no devices.
struct InputFrame: Equatable {
    var pitch: Float = 0     // -1…1, + = nose up
    var roll: Float = 0      // -1…1, + = roll left
    var yaw: Float = 0       // -1…1, + = nose left
    var throttle: Float = 0  // -1…1, + = faster
    var buttons: Buttons = []

    var firing: Bool { buttons.contains(.fire) }
    var boosting: Bool { buttons.contains(.boost) }
}
```

Four axes that are now genuinely analog — a keyboard will produce `0.4` on the
way to `1` — and one set of bits. `Equatable` is there so a test can say "the
frame I read back is the frame I wrote", and it's free.

`firing` and `boosting` exist so that the two systems which already read
`input.firing` and `input.boosting` don't have to change. That is the whole
reason; a chapter that touches sixteen files is entitled to skip a seventeenth.

**`InputFrame.swift`** — after `InputFrame`:

```swift
/// Every digital input the game knows about, as bits. Menus and the ship read
/// the same set; a screen decides which bits it cares about.
struct Buttons: OptionSet, Equatable {
    let rawValue: UInt16

    static let fire = Buttons(rawValue: 1 << 0)
    static let boost = Buttons(rawValue: 1 << 1)
    static let missile = Buttons(rawValue: 1 << 2)
    static let pause = Buttons(rawValue: 1 << 3)
    static let menuUp = Buttons(rawValue: 1 << 4)
    static let menuDown = Buttons(rawValue: 1 << 5)
    static let menuLeft = Buttons(rawValue: 1 << 6)
    static let menuRight = Buttons(rawValue: 1 << 7)
    static let confirm = Buttons(rawValue: 1 << 8)
    static let back = Buttons(rawValue: 1 << 9)
    static let scoreboard = Buttons(rawValue: 1 << 10)
    static let debug = Buttons(rawValue: 1 << 11)
}
```

An `OptionSet` over a `UInt16`: twelve buttons in two bytes, with room for
four more. Most of these have no consumer yet — `missile` is chapter 08,
`pause` and the `menu*` bits are chapter 10, `scoreboard` is chapter 14 — and
declaring them now costs nothing while declaring them later would mean
changing a file format and, eventually, a packet format. The number of bits is
the one thing here that's hard to change afterwards, so it's chosen once.

**`InputFrame.swift`** — after `Buttons`:

```swift
/// Anything that can produce an InputFrame: a keyboard, a mouse, a pad, a
/// recording. Polled once per display frame with the real elapsed time.
protocol InputSource: AnyObject {
    func poll(dt: Float) -> InputFrame
}
```

`poll` takes the *real* frame time, not the simulation step, because the
things that produce input — a key ramping toward full deflection, a mouse
stick springing back — are presentation. They happen at the display's rate,
and the simulation only sees the result. That's the chapter 02 rule applied
one layer up.

---

## The keyboard becomes a stick

The key codes and the bindings come first, because the keyboard source is
written in terms of them.

**`Sources/SpaceFighter/Input/KeyBindings.swift`** — new file:

```swift
/// macOS virtual key codes. Positional, not character-based, so WASD stays
/// where it is on a non-QWERTY layout.
enum Key {
    static let w: UInt16 = 13
    static let a: UInt16 = 0
    static let s: UInt16 = 1
    static let d: UInt16 = 2
    static let q: UInt16 = 12
    static let e: UInt16 = 14
    static let r: UInt16 = 15
    static let f: UInt16 = 3
    static let x: UInt16 = 7
    static let m: UInt16 = 46
    static let space: UInt16 = 49
    static let tab: UInt16 = 48
    static let backtick: UInt16 = 50
    static let enter: UInt16 = 36
    static let shift: UInt16 = 56
    static let arrowLeft: UInt16 = 123
    static let arrowRight: UInt16 = 124
    static let arrowDown: UInt16 = 125
    static let arrowUp: UInt16 = 126
    static let escape: UInt16 = 53
}
```

This is the first guide's `Key` enum, moved out of the file that's about to be
deleted and grown by eight codes. `shift` is the one that isn't a real key
event on macOS — modifiers arrive as a state change, not a press — and the
keyboard source handles it specially below.

**`KeyBindings.swift`** — after `Key`:

```swift
/// Which keys drive which axis or button. One table, so a screen can show it
/// and a settings file could one day replace it.
struct KeyBindings {
    var pitchUp: [UInt16] = [Key.s, Key.arrowDown]
    var pitchDown: [UInt16] = [Key.w, Key.arrowUp]
    var yawLeft: [UInt16] = [Key.a, Key.arrowLeft]
    var yawRight: [UInt16] = [Key.d, Key.arrowRight]
    var rollLeft: [UInt16] = [Key.q]
    var rollRight: [UInt16] = [Key.e]
    var throttleUp: [UInt16] = [Key.r]
    var throttleDown: [UInt16] = [Key.f]
}
```

The map is deliberately the first guide's: `W` still pushes the nose *down*
(push forward to dive, like a stick), `A`/`D` still yaw, `Q`/`E` still roll.
This chapter changes how input is *represented*, not what it does, so that at
the checkpoint the game plays the same and any difference is a bug. Chapter 04
changes the flight model and remaps `A`/`D` to roll in the same breath, where
the change is the point.

`R`/`F` on the throttle axis are new and unread; chapter 04 reads them.

**`KeyBindings.swift`**, in `KeyBindings` — after `throttleDown`:

```diff
     var throttleDown: [UInt16] = [Key.f]
+
+    var buttons: [(Buttons, [UInt16])] = [
+        (.fire, [Key.space]),
+        (.boost, [Key.shift]),
+        (.missile, [Key.x]),
+        (.pause, [Key.escape]),
+        (.menuUp, [Key.w, Key.arrowUp]),
+        (.menuDown, [Key.s, Key.arrowDown]),
+        (.menuLeft, [Key.a, Key.arrowLeft]),
+        (.menuRight, [Key.d, Key.arrowRight]),
+        (.confirm, [Key.enter, Key.space]),
+        (.back, [Key.escape]),
+        (.scoreboard, [Key.tab]),
+        (.debug, [Key.backtick]),
+    ]
+
+    static let standard = KeyBindings()
 }
```

The same key appears on an axis and on a menu button — `W` is both "nose down"
and "menu up". That's fine and intended: a screen reads the bits it cares
about and ignores the rest, and a flying ship doesn't have a menu cursor. It's
an array of pairs rather than a dictionary because the *order* is the order a
settings screen would list them in, and because `Buttons` isn't `Hashable` and
doesn't need to be.

Now the source itself.

**`Sources/SpaceFighter/Input/Sources/KeyboardSource.swift`** — new file:

```swift
/// Turns held keys into a stick. A key is a switch, but the axis it drives
/// ramps: a tap is a nudge, a hold is full deflection. This is where key codes
/// stop being key codes and become intent.
final class KeyboardSource: InputSource {
    /// Seconds for an axis to travel from centre to full deflection.
    static let attack: Float = 0.12
    /// Seconds for it to return to centre once the key is released.
    static let release: Float = 0.06

    var bindings = KeyBindings.standard

    private var pressed = Set<UInt16>()
    private var pitch: Float = 0
    private var roll: Float = 0
    private var yaw: Float = 0
    private var throttle: Float = 0
}
```

Two numbers, and they are the feel of the keyboard.

**`attack` is 0.12 seconds** — about seven frames at 60 Hz. Tap `W` for one
frame and the nose dips by a seventh of full rate; hold it and you're at full
deflection before you've noticed the ramp. Short enough not to feel laggy,
long enough that a tap is a *nudge*. Ace Combat on a d-pad does exactly this.

**`release` is 0.06 seconds**, half the attack. Letting go should feel crisp —
you stop asking, the stick stops asking — while pressing should feel like
pushing something with a little give. Asymmetric on purpose; make them equal
and the keyboard feels mushy in both directions.

The `pressed` set is the one place a `Set` is fine: this is the input layer,
it's never iterated, and nothing in the simulation can see it.

**`KeyboardSource.swift`**, in `KeyboardSource` — after the stick state:

```diff
     private var throttle: Float = 0
+
+    func keyDown(_ code: UInt16) { pressed.insert(code) }
+    func keyUp(_ code: UInt16) { pressed.remove(code) }
+
+    /// Modifier keys arrive as a state, not as down/up events.
+    func setShift(_ held: Bool) {
+        if held { pressed.insert(Key.shift) } else { pressed.remove(Key.shift) }
+    }
 }
```

`setShift` folds the modifier into the same set as everything else, so the
bindings table can list `Key.shift` under `.boost` like any other key and the
rest of the class never knows it was special.

**`KeyboardSource.swift`**, in `KeyboardSource` — after `setShift`:

```diff
         if held { pressed.insert(Key.shift) } else { pressed.remove(Key.shift) }
     }
+
+    func poll(dt: Float) -> InputFrame {
+        pitch = ramp(pitch, toward: axis(bindings.pitchUp, bindings.pitchDown), dt: dt)
+        roll = ramp(roll, toward: axis(bindings.rollLeft, bindings.rollRight), dt: dt)
+        yaw = ramp(yaw, toward: axis(bindings.yawLeft, bindings.yawRight), dt: dt)
+        throttle = ramp(throttle, toward: axis(bindings.throttleUp, bindings.throttleDown), dt: dt)
+
+        var frame = InputFrame()
+        frame.pitch = pitch
+        frame.roll = roll
+        frame.yaw = yaw
+        frame.throttle = throttle
+        for (button, keys) in bindings.buttons where held(keys) {
+            frame.buttons.insert(button)
+        }
+        return frame
+    }
 }
```

Axes ramp; buttons don't. A trigger that fires a seventh of a bolt on the
first frame is not a thing, so buttons are read straight from the set.

**`KeyboardSource.swift`**, in `KeyboardSource` — after `poll`:

```diff
         return frame
     }
+
+    private func held(_ codes: [UInt16]) -> Bool {
+        codes.contains { pressed.contains($0) }
+    }
+
+    /// +1 if the positive keys are held, -1 for the negative ones, 0 for
+    /// neither or both.
+    private func axis(_ positive: [UInt16], _ negative: [UInt16]) -> Float {
+        (held(positive) ? 1 : 0) - (held(negative) ? 1 : 0)
+    }
+
+    private func ramp(_ current: Float, toward target: Float, dt: Float) -> Float {
+        let seconds = target == 0 ? Self.release : Self.attack
+        return Math.moveToward(current, target, dt / seconds)
+    }
 }
```

`ramp` is the first guide's `Math.moveToward` with a rate: `dt / seconds` is
the fraction of the full journey this frame covers, so the journey takes
`seconds` regardless of frame rate. Pick the attack rate when there's a
target to move toward and the release rate when the target is centre. Holding
both keys of an axis gives a target of zero, which reads as "let go", which is
right.

One thing to notice about where this smoothing lives. It is *presentation* —
it runs on the real `dt`, on the display's clock — and yet its output goes
into the simulation. That's fine because of what the recorder does two
sections from now: it records the frame *after* the ramp, so a replay contains
the analog values and never needs to re-run the keyboard. Move the ramp into
the flight model instead and you'd have two smoothing stages fighting each
other in chapter 04; leave it here and the flight model gets a clean stick
whether it came from keys, a mouse or a pad.

---

## Adding up sources

**`Sources/SpaceFighter/Input/InputMixer.swift`** — new file:

```swift
/// Adds up every source into the one frame the simulation sees. Axes sum and
/// clamp; buttons union. A keyboard and a pad can both be live and neither
/// needs to know.
final class InputMixer: InputSource {
    private let sources: [InputSource]

    init(sources: [InputSource]) {
        self.sources = sources
    }

    func poll(dt: Float) -> InputFrame {
        var mixed = InputFrame()
        for source in sources {
            let f = source.poll(dt: dt)
            mixed.pitch += f.pitch
            mixed.roll += f.roll
            mixed.yaw += f.yaw
            mixed.throttle += f.throttle
            mixed.buttons.formUnion(f.buttons)
        }
        mixed.pitch = clamp(mixed.pitch)
        mixed.roll = clamp(mixed.roll)
        mixed.yaw = clamp(mixed.yaw)
        mixed.throttle = clamp(mixed.throttle)
        return mixed
    }

    private func clamp(_ v: Float) -> Float { min(max(v, -1), 1) }
}
```

Sum rather than "first source that's non-zero wins" because summing needs no
policy: hold `W` and push a stick forward and you get more nose-down, up to
the clamp, which is what both hands were asking for. The mixer is itself an
`InputSource`, so the coordinator holds one `InputSource` and doesn't know how
many devices are behind it.

---

## Optional: a mouse

Skip this section and the next if you only want the keyboard; no later
chapter depends on them. They're here because a flight model with inertia is
*built* for an analog input, and both take about forty lines. If you skip
them, the `main.swift` section below tells you which of its lines to leave
out — there are a few, because the mouse needs the window's cooperation.

A mouse isn't a stick. It reports *movement*, not *position*, and if you feed
movement straight into an axis the stick is deflected for exactly one frame
per pixel — a twitch, not a pull. The usual answer, and the one Battlefield
uses, is a virtual stick that mouse movement *pushes* and that springs back to
centre on its own.

**`Sources/SpaceFighter/Input/Sources/MouseSource.swift`** — new file:

```swift
import Foundation

/// A mouse as a self-centring stick. Movement pushes the stick, and the stick
/// springs back toward centre when the mouse stops. Optional: only wired in
/// when the cursor is captured.
final class MouseSource: InputSource {
    /// Stick deflection per pixel of mouse travel.
    var sensitivity: Float = 1.0 / 60.0
    /// How fast the stick returns to centre, per second.
    var returnRate: Float = 8

    var captured = false

    private var dx: Float = 0
    private var dy: Float = 0
    private var stickX: Float = 0
    private var stickY: Float = 0

    /// Called for every mouse-moved event. Deltas accumulate until polled.
    func accumulate(dx: Float, dy: Float) {
        guard captured else { return }
        self.dx += dx
        self.dy += dy
    }
}
```

Sixty pixels for full deflection and a return rate of eight per second: at 60
Hz, `exp(-8/60)` is about 0.875, so the stick loses an eighth of its deflection
every frame and settles in a third of a second. Both are tunables and both are
taste.

**`MouseSource.swift`**, in `MouseSource` — after `accumulate`:

```diff
         self.dy += dy
     }
+
+    func poll(dt: Float) -> InputFrame {
+        stickX = clamp(stickX + dx * sensitivity)
+        stickY = clamp(stickY + dy * sensitivity)
+        dx = 0
+        dy = 0
+        let decay = exp(-returnRate * dt)
+        stickX *= decay
+        stickY *= decay
+
+        var frame = InputFrame()
+        guard captured else { return frame }
+        frame.roll = -stickX   // mouse right = roll right = negative roll
+        frame.pitch = stickY   // mouse back (down on screen) = nose up
+        return frame
+    }
+
+    private func clamp(_ v: Float) -> Float { min(max(v, -1), 1) }
 }
```

`exp(-returnRate * dt)` is the first guide's frame-rate-independent decay,
again: the stick settles in the same third of a second on a 120 Hz display. A
`stickX *= 0.875` per frame would settle twice as fast there.

The signs are the only thing to think about. `InputFrame` says positive roll
is *left*; pulling the mouse right should roll right, so it's negated. Mouse
`deltaY` grows as the mouse moves *toward you*, which in a flight game means
"pull back on the stick", which is nose up, which is positive pitch — no
negation.

The mouse maps to roll and pitch, not yaw, because chapter 04's flight model
is bank-and-pull: you roll to set up the turn and pull to make it. Yaw stays
on the keyboard as a rudder. If you're here from the first guide's model, this
mapping will feel wrong for one chapter.

Capturing the cursor is AppKit's business and lives in `main.swift` below.

---

## Optional: a gamepad

**`Sources/SpaceFighter/Input/Sources/GamepadSource.swift`** — new file:

```swift
import GameController

/// The first connected controller with an extended-gamepad profile, read
/// once per frame. Optional: with no pad connected it produces nothing.
final class GamepadSource: InputSource {
    var deadzone: Float = 0.15

    func poll(dt: Float) -> InputFrame {
        var frame = InputFrame()
        guard let pad = GCController.controllers().first?.extendedGamepad else { return frame }

        frame.roll = -shaped(pad.leftThumbstick.xAxis.value)
        frame.pitch = -shaped(pad.leftThumbstick.yAxis.value)
        frame.yaw = shaped(pad.leftShoulder.value - pad.rightShoulder.value)
        frame.throttle = shaped(pad.rightTrigger.value - pad.leftTrigger.value)
        return frame
    }
}
```

`GameController` handles pairing, hot-plugging and the difference between an
Xbox pad, a DualSense and a Switch Pro controller; `extendedGamepad` is the
profile they all share. Reading `GCController.controllers()` every frame is a
cheap array lookup and means plugging a pad in mid-game just works.

The stick's `yAxis` is positive *up* on the pad, and pushing a stick up means
nose down, hence the negation. Shoulders as rudder and triggers as throttle
follow the same bank-and-pull logic as the mouse.

**`GamepadSource.swift`**, in `poll` — before `return frame`:

```diff
         frame.throttle = shaped(pad.rightTrigger.value - pad.leftTrigger.value)
+
+        if pad.buttonA.isPressed { frame.buttons.insert(.fire) }
+        if pad.buttonB.isPressed { frame.buttons.insert(.missile) }
+        if pad.rightThumbstickButton?.isPressed == true { frame.buttons.insert(.boost) }
+        if pad.buttonMenu.isPressed { frame.buttons.insert(.pause) }
+        if pad.dpad.up.isPressed { frame.buttons.insert(.menuUp) }
+        if pad.dpad.down.isPressed { frame.buttons.insert(.menuDown) }
+        if pad.dpad.left.isPressed { frame.buttons.insert(.menuLeft) }
+        if pad.dpad.right.isPressed { frame.buttons.insert(.menuRight) }
+        if pad.buttonA.isPressed { frame.buttons.insert(.confirm) }
+        if pad.buttonB.isPressed { frame.buttons.insert(.back) }
+        if pad.buttonY.isPressed { frame.buttons.insert(.scoreboard) }
         return frame
```

**`GamepadSource.swift`**, in `GamepadSource` — after `poll`:

```diff
         return frame
     }
+
+    /// Ignore the stick's resting wobble, then rescale so full deflection is
+    /// still 1.
+    private func shaped(_ v: Float) -> Float {
+        let magnitude = abs(v)
+        guard magnitude > deadzone else { return 0 }
+        let scaled = (magnitude - deadzone) / (1 - deadzone)
+        return v < 0 ? -scaled : scaled
+    }
 }
```

A stick at rest reports a few percent of deflection, and without a deadzone
the ship drifts. The rescale after the deadzone is the part people forget:
clip at 0.15 without rescaling and the stick jumps from 0 to 0.15 the moment
it leaves the deadzone, which feels like a notch. Subtract and divide, and it
leaves the deadzone at 0 and reaches 1 at the edge.

---

## Writing a run down

A recording is the seed plus one `InputFrame` per tick. Encoding it means
choosing a byte layout, and the choice is to write one — not to reach for
`Codable`.

`Codable` would work. It would also produce JSON or a plist: keys as strings,
floats as decimal text, several times the bytes, and a format you don't
control. Chapter 13 puts the same struct in a UDP packet sixty times a second,
and there the layout has to be exact. Doing it by hand now means doing it
once.

**`Sources/SpaceFighter/Core/ByteCoder.swift`** — new file:

```swift
/// Little-endian, fixed-layout encoding. No Codable: a recording and, later,
/// a network packet want a byte for every field and nothing else.
struct ByteWriter {
    private(set) var bytes: [UInt8] = []

    mutating func write(_ v: UInt8) { bytes.append(v) }

    mutating func write(_ v: UInt16) {
        write(UInt8(truncatingIfNeeded: v))
        write(UInt8(truncatingIfNeeded: v >> 8))
    }

    mutating func write(_ v: UInt32) {
        write(UInt16(truncatingIfNeeded: v))
        write(UInt16(truncatingIfNeeded: v >> 16))
    }

    mutating func write(_ v: UInt64) {
        write(UInt32(truncatingIfNeeded: v))
        write(UInt32(truncatingIfNeeded: v >> 32))
    }

    mutating func write(_ v: Float) { write(v.bitPattern) }
}
```

Each width is written as two of the next width down, low half first: that's
little-endian, the byte order of every machine this will run on, spelled out
so it doesn't depend on the machine. A `Float` is its 32 bits, the same
`bitPattern` chapter 02's hash used — no rounding through text.

**`ByteCoder.swift`** — after `ByteWriter`:

```swift
struct ByteReader {
    private let bytes: [UInt8]
    private(set) var offset = 0

    init(_ bytes: [UInt8]) { self.bytes = bytes }

    var remaining: Int { bytes.count - offset }

    mutating func readUInt8() throws -> UInt8 {
        guard offset < bytes.count else { throw ByteReaderError.truncated }
        defer { offset += 1 }
        return bytes[offset]
    }

    mutating func readUInt16() throws -> UInt16 {
        let lo = try readUInt8()
        let hi = try readUInt8()
        return UInt16(lo) | UInt16(hi) << 8
    }

    mutating func readUInt32() throws -> UInt32 {
        let lo = try readUInt16()
        let hi = try readUInt16()
        return UInt32(lo) | UInt32(hi) << 16
    }

    mutating func readUInt64() throws -> UInt64 {
        let lo = try readUInt32()
        let hi = try readUInt32()
        return UInt64(lo) | UInt64(hi) << 32
    }

    mutating func readFloat() throws -> Float { Float(bitPattern: try readUInt32()) }
}

enum ByteReaderError: Error {
    case truncated
}
```

The reader is the writer backwards, and it `throws` because the bytes came
from outside — a truncated file, and in chapter 13 a truncated packet. The
only check that's needed is "is there a byte left"; every wider read is built
from that one.

**`Sources/SpaceFighter/Input/InputLog.swift`** — new file:

```swift
import Foundation

/// A whole run as data: the seed it started from and one InputFrame per tick.
/// Replaying it through the same code produces the same game.
struct InputLog: Equatable {
    static let magic: UInt32 = 0x4C49_4653  // "SFIL"
    static let version: UInt16 = 1

    var seed: UInt64
    var frames: [InputFrame] = []

    init(seed: UInt64) {
        self.seed = seed
    }
}
```

A magic number and a version at the front of every file. The magic means a
reader handed the wrong file says so instead of decoding a JPEG as input; the
version means that when chapter 08 adds a ship id to the header — it will —
old recordings are refused rather than misread.

**`InputLog.swift`**, in `InputLog` — after `init(seed:)`:

```diff
     init(seed: UInt64) {
         self.seed = seed
     }
+
+    func encoded() -> [UInt8] {
+        var w = ByteWriter()
+        w.write(Self.magic)
+        w.write(Self.version)
+        w.write(seed)
+        w.write(UInt32(frames.count))
+        for f in frames {
+            w.write(f.pitch)
+            w.write(f.roll)
+            w.write(f.yaw)
+            w.write(f.throttle)
+            w.write(f.buttons.rawValue)
+        }
+        return w.bytes
+    }
 }
```

Eighteen bytes per tick — four floats and the button bits. A minute of play
is 65 KB.

**`InputLog.swift`**, in `InputLog` — after `encoded`:

```diff
         return w.bytes
     }
+
+    init(decoding bytes: [UInt8]) throws {
+        var r = ByteReader(bytes)
+        do {
+            guard try r.readUInt32() == Self.magic else { throw InputLogError.notARecording }
+            guard try r.readUInt16() == Self.version else { throw InputLogError.unsupportedVersion }
+            seed = try r.readUInt64()
+            let count = Int(try r.readUInt32())
+            frames.reserveCapacity(count)
+            for _ in 0..<count {
+                var f = InputFrame()
+                f.pitch = try r.readFloat()
+                f.roll = try r.readFloat()
+                f.yaw = try r.readFloat()
+                f.throttle = try r.readFloat()
+                f.buttons = Buttons(rawValue: try r.readUInt16())
+                frames.append(f)
+            }
+        } catch is ByteReaderError {
+            throw InputLogError.truncated
+        }
+    }
+
+    func write(to url: URL) throws {
+        try Data(encoded()).write(to: url, options: .atomic)
+    }
+
+    static func read(from url: URL) throws -> InputLog {
+        try InputLog(decoding: [UInt8](try Data(contentsOf: url)))
+    }
 }
```

**`InputLog.swift`** — after `InputLog`:

```swift
enum InputLogError: Error {
    case notARecording
    case unsupportedVersion
    case truncated
}
```

Decoding reads fields in exactly the order they were written, which is the
entire contract. The `do`/`catch` turns the reader's one error into the log's
vocabulary so a caller sees "truncated recording" rather than "byte reader ran
out", and `.atomic` on the write is the first guide's chapter 14 lesson — a
file is either the old one or the new one, never half of each.

---

## Recording and replaying

Both hang off `Game`, because `Game.advance` is the one place that knows
which frame went into which tick.

**`Sources/SpaceFighter/Game.swift`**, in `Game` — after `clock`:

```diff
     private(set) var clock = SimulationClock()

+    /// Set to an empty log to record: every stepped frame is appended.
+    var recording: InputLog?
+    /// Set to a log to replay: its frames are stepped instead of live input.
+    var replay: InputLog?
+    var replayFinished: Bool {
+        guard let replay else { return false }
+        return Int(clock.tick) >= replay.frames.count
+    }
+
     private let fieldOfView: Float = 65
```

**`Game.swift`** — replace `advance` (doc comment and signature included) and
add `replayFrame` after it:

```swift
    /// Bank real time and run however many fixed steps it pays for. One
    /// InputFrame serves every step this frame runs; a replay overrides it.
    func advance(realDt: Float, input live: InputFrame) {
        let steps = clock.advance(realDt: realDt)
        for i in 0..<steps {
            let tick = Int(clock.tick) - steps + i
            let input = replayFrame(at: tick) ?? live
            recording?.frames.append(input)
            step(input: input, dt: SimulationClock.step)
        }
    }

    /// The recorded frame for `tick`, an empty frame once the recording has
    /// run out, or nil when there is no replay at all.
    private func replayFrame(at tick: Int) -> InputFrame? {
        guard let replay else { return nil }
        return replay.frames.indices.contains(tick) ? replay.frames[tick] : InputFrame()
    }
```

The tick arithmetic is the subtle line. `clock.advance` has *already* added
`steps` to `clock.tick` by the time the loop runs, so the tick being stepped
on iteration `i` is `clock.tick - steps + i`, counting from zero. Get that
wrong by one and a replay is offset from its recording by a frame — which
diverges, but slowly enough that you'd blame something else.

Recording appends whatever was actually stepped, replay or live, so recording
a replay produces an identical file. That's a property worth having and it
came for free.

`step` changes only its signature:

```diff
-    func step(input: InputState, dt: Float) {
+    func step(input: InputFrame, dt: Float) {
         world.snapshotTransforms()
```

**`Sources/SpaceFighter/GameView.swift`**, in `RenderCoordinator` — hold a
source, not a controller:

```diff
     private let game: Game
     private let renderer: Renderer
-    private let input: InputController
+    private let input: InputSource
     private var lastTime: CFTimeInterval
+    private var announcedReplayEnd = false

-    init(game: Game, renderer: Renderer, input: InputController) {
+    init(game: Game, renderer: Renderer, input: InputSource) {
```

**`GameView.swift`**, in `draw` — poll, then advance:

```diff
-        game.advance(realDt: dt, input: input.state)
+        let frame = input.poll(dt: dt)
+        game.advance(realDt: dt, input: frame)
+        if game.replayFinished && !announcedReplayEnd {
+            announcedReplayEnd = true
+            print("replay finished at tick \(game.clock.tick)")
+        }
         let data = game.frame(aspect: aspect)
```

When a replay runs out the game keeps going with empty input — the ship flies
straight, the enemies keep coming — and says so once. Quitting would be
reasonable too; the choice here is that a replay's end is worth looking at.

Now `main.swift`, which grows the most. It parses three flags, builds the
sources, and wires the events.

**`Sources/SpaceFighter/main.swift`** — replace everything from the `seed`
closure's doc comment down to `let input = InputController()`:

```swift
/// What the command line asked for. `--seed N`, `--record path`, `--replay path`.
struct LaunchOptions {
    var seed: UInt64 = UInt64(Date().timeIntervalSince1970)
    var record: URL?
    var replay: URL?

    init(arguments: [String]) {
        var i = 1
        while i < arguments.count {
            let next = i + 1 < arguments.count ? arguments[i + 1] : nil
            switch (arguments[i], next) {
            case ("--seed", let n?): seed = UInt64(n) ?? seed; i += 2
            case ("--record", let path?): record = URL(fileURLWithPath: path); i += 2
            case ("--replay", let path?): replay = URL(fileURLWithPath: path); i += 2
            default: i += 1
            }
        }
    }
}

let options = LaunchOptions(arguments: CommandLine.arguments)
```

A struct in `main.swift` is unusual but legal, and three flags don't justify
an argument-parsing dependency.

**`main.swift`** — after `let options`:

```swift
/// A replay carries its own seed; nothing else may override it.
let replayLog: InputLog? = options.replay.flatMap { url in
    do {
        return try InputLog.read(from: url)
    } catch {
        print("could not read replay \(url.path): \(error)")
        return nil
    }
}
let seed = replayLog?.seed ?? options.seed
print("seed \(seed)")

let game = Game(seed: seed)
game.replay = replayLog
if options.record != nil { game.recording = InputLog(seed: seed) }
```

The seed *in the file* wins over `--seed` on the command line, because a
replay with a different seed is a different game and there's no sense in
which it could work. A missing or corrupt replay file is reported and the game
starts normally.

**`main.swift`** — after `game.recording`:

```swift
let keyboard = KeyboardSource()
let mouse = MouseSource()
let gamepad = GamepadSource()
let input = InputMixer(sources: [keyboard, mouse, gamepad])
```

If you skipped the optional sections: leave `mouse` and `gamepad` out of the
array, don't create them, skip the `setMouseCaptured` function below, and in
the key monitor drop the `Key.m` line and the `.mouseMoved, .leftMouseDragged`
case (and those two event types from `matching:`). The termination observer
and everything else is the same.

**`main.swift`**, before the key monitor — the cursor capture:

```swift
/// Capturing the mouse hides the cursor and stops it moving; releasing undoes both.
@MainActor func setMouseCaptured(_ captured: Bool) {
    mouse.captured = captured
    CGAssociateMouseAndMouseCursorPosition(captured ? 0 : 1)
    if captured { NSCursor.hide() } else { NSCursor.unhide() }
}
```

`CGAssociateMouseAndMouseCursorPosition(0)` is the Core Graphics call that
says "keep sending me movement, but stop moving the pointer" — relative mode.
Without it the pointer hits the edge of the screen and the deltas stop. The
`@MainActor` is required: `main.swift`'s top-level variables are main-actor
isolated under Swift 6's concurrency checking, and a plain nested function
isn't allowed to touch them.

**`main.swift`** — replace the whole `let keyMonitor = …` statement, and add
the `acceptsMouseMovedEvents` line after it:

```swift
let keyMonitor = NSEvent.addLocalMonitorForEvents(
    matching: [.keyDown, .keyUp, .flagsChanged, .mouseMoved, .leftMouseDragged]
) { event in
    switch event.type {
    case .keyDown:
        if event.keyCode == Key.escape { NSApp.terminate(nil) }
        if event.modifierFlags.contains(.command) { return event }
        if event.keyCode == Key.m && !event.isARepeat { setMouseCaptured(!mouse.captured) }
        keyboard.keyDown(event.keyCode)
        return nil
    case .keyUp:
        if event.modifierFlags.contains(.command) { return event }
        keyboard.keyUp(event.keyCode)
        return nil
    case .flagsChanged:
        keyboard.setShift(event.modifierFlags.contains(.shift))
        return event
    case .mouseMoved, .leftMouseDragged:
        mouse.accumulate(dx: Float(event.deltaX), dy: Float(event.deltaY))
        return event
    default:
        return event
    }
}
window.acceptsMouseMovedEvents = true
```

Two additions to the first guide's monitor: mouse-moved events go to the mouse
source, and `M` toggles capture. `acceptsMouseMovedEvents` is off by default
on an `NSWindow` because most apps don't want a stream of events for a pointer
that's just passing through; a game does. `Escape` still quits, as it did in
the first guide — the `.pause` and `.back` bits are bound to it in the table
but the monitor terminates before `keyDown` sees it. Chapter 10 removes that
line and Escape becomes pause.

**`main.swift`** — after the key monitor, before `window.makeKeyAndOrderFront`:

```swift
/// Recordings are written once, on the way out.
let terminationObserver = NotificationCenter.default.addObserver(
    forName: NSApplication.willTerminateNotification, object: nil, queue: .main
) { _ in
    MainActor.assumeIsolated {
        guard let url = options.record, let log = game.recording else { return }
        do {
            try log.write(to: url)
            print("recorded \(log.frames.count) ticks to \(url.path)")
        } catch {
            print("could not write recording: \(error)")
        }
    }
}
```

The file is written when the app quits — `Escape` or `⌘Q` — not on every
tick. A recording that grows by eighteen bytes per tick in memory is nothing;
a file write sixty times a second is not.

`MainActor.assumeIsolated` is the same concurrency requirement as before from
the other side: the notification closure isn't known to run on the main actor
even though `queue: .main` guarantees that it does, so you say so.

**`main.swift`** — keep the observer alive, next to the other two:

```diff
 _ = coordinator
 _ = keyMonitor
+_ = terminationObserver
 app.run()
```

---

## Retire `InputState`

Delete the file:

```console
$ rm Sources/SpaceFighter/Input/InputState.swift
```

Everything in it has a new home: `Key` moved to `KeyBindings.swift`,
`InputController` became `KeyboardSource`, and `InputState` is `InputFrame`.
Two systems name the old type in a signature:

**`Sources/SpaceFighter/Systems/FlightControlSystem.swift`**, in
`FlightControlSystem`:

```diff
-    static func update(_ world: World, player: Entity, input: InputState, dt: Float) {
+    static func update(_ world: World, player: Entity, input: InputFrame, dt: Float) {
```

**`Sources/SpaceFighter/Systems/WeaponSystems.swift`**, in `WeaponSystem`:

```diff
-    static func update(_ world: World, player: Entity, input: InputState, dt: Float) {
+    static func update(_ world: World, player: Entity, input: InputFrame, dt: Float) {
```

Their bodies are untouched — `input.pitch`, `input.firing`, `input.boosting`
all still exist. And one test:

**`Tests/SpaceFighterTests/Ch02DeterminismTests.swift`**, in `play`:

```diff
-    var input = InputState()
-    input.firing = true
+    var input = InputFrame()
+    input.buttons = [.fire]
```

---

## The tests

**`Tests/SpaceFighterTests/Ch03InputTests.swift`** — new file:

```swift
import Testing

@testable import SpaceFighter

private let dt = SimulationClock.step

@Test func heldKeyRampsToFullDeflectionAndBack() {
    let keyboard = KeyboardSource()
    keyboard.keyDown(Key.s)  // nose up
    var frame = InputFrame()
    for _ in 0..<3 { frame = keyboard.poll(dt: dt) }
    #expect(frame.pitch > 0.3 && frame.pitch < 0.9, "a tap is a nudge, not a slam")
    for _ in 0..<12 { frame = keyboard.poll(dt: dt) }
    #expect(frame.pitch == 1)
    keyboard.keyUp(Key.s)
    for _ in 0..<6 { frame = keyboard.poll(dt: dt) }
    #expect(frame.pitch == 0)
}

@Test func opposingKeysCancel() {
    let keyboard = KeyboardSource()
    keyboard.keyDown(Key.w)
    keyboard.keyDown(Key.s)
    var frame = InputFrame()
    for _ in 0..<20 { frame = keyboard.poll(dt: dt) }
    #expect(frame.pitch == 0)
}

@Test func buttonsAreImmediate() {
    let keyboard = KeyboardSource()
    keyboard.keyDown(Key.space)
    #expect(keyboard.poll(dt: dt).buttons.contains(.fire))
    keyboard.keyUp(Key.space)
    #expect(!keyboard.poll(dt: dt).buttons.contains(.fire))
}
```

Three frames in is 0.05 s of a 0.12 s attack, so the first assertion is
"somewhere in the middle" — the exact value depends on `moveToward`'s
arithmetic and the test shouldn't care. Fifteen frames is 0.25 s, comfortably
past full, and the `== 1` is exact because `moveToward` snaps to the target
when it's within reach.

**`Ch03InputTests.swift`** — after `buttonsAreImmediate`:

```swift
private final class FixedSource: InputSource {
    let frame: InputFrame
    init(_ frame: InputFrame) { self.frame = frame }
    func poll(dt: Float) -> InputFrame { frame }
}

@Test func mixerSumsAndClamps() {
    var a = InputFrame()
    a.pitch = 0.8
    a.buttons = [.fire]
    var b = InputFrame()
    b.pitch = 0.8
    b.roll = -0.5
    b.buttons = [.boost]
    let mixer = InputMixer(sources: [FixedSource(a), FixedSource(b)])
    let mixed = mixer.poll(dt: dt)
    #expect(mixed.pitch == 1)
    #expect(mixed.roll == -0.5)
    #expect(mixed.buttons == [.fire, .boost])
}
```

A fake source is four lines because `InputSource` is one method. That's the
protocol earning its keep.

**`Ch03InputTests.swift`** — after `mixerSumsAndClamps`:

```swift
@Test func inputLogRoundTrips() throws {
    var log = InputLog(seed: 99)
    for i in 0..<50 {
        var f = InputFrame()
        f.pitch = Float(i) / 50
        f.yaw = -0.25
        f.buttons = i % 2 == 0 ? [.fire] : []
        log.frames.append(f)
    }
    let bytes = log.encoded()
    let decoded = try InputLog(decoding: bytes)
    #expect(decoded.seed == 99)
    #expect(decoded.frames == log.frames)
}

@Test func corruptLogIsRejected() {
    #expect(throws: InputLogError.self) { try InputLog(decoding: [1, 2, 3]) }
}
```

**`Ch03InputTests.swift`** — after `corruptLogIsRejected`:

```swift
@Test func replayReproducesTheRecording() {
    // Record: fly a scripted pattern through `advance`, one frame per step.
    let recorder = Game(seed: 5)
    recorder.recording = InputLog(seed: 5)
    for i in 0..<300 {
        var f = InputFrame()
        f.pitch = (i / 30) % 2 == 0 ? 1 : -1
        f.yaw = (i / 45) % 3 == 0 ? 1 : 0
        f.buttons = [.fire]
        recorder.advance(realDt: dt, input: f)
    }
    let log = recorder.recording!
    #expect(log.frames.count == 300)

    // Replay: same seed, garbage live input, the log wins.
    let player = Game(seed: 5)
    player.replay = log
    var garbage = InputFrame()
    garbage.roll = 1
    for _ in 0..<300 { player.advance(realDt: dt, input: garbage) }

    #expect(player.world.stateHash() == recorder.world.stateHash())
    #expect(player.replayFinished)
}
```

This is chapter 02's determinism test with the input coming from a file
instead of a script, and it's the test that proves the tick arithmetic in
`advance`. The "garbage" live input is the important detail: if replay didn't
override it, the roll would send the hashes apart within a few steps.

---

## Checkpoint

```console
$ swift test
✔ Test run with 17 tests in 0 suites passed
```

**Seventeen tests** — ten from before, seven new. Then record a run:

```console
$ swift run SpaceFighter --record ~/first.sfil
seed 1725404123
```

Fly for twenty seconds — turn, shoot, get hit — and quit with `Escape`. The
console prints `recorded 1200 ticks to /Users/you/first.sfil` (or thereabouts).
Then:

```console
$ swift run SpaceFighter --replay ~/first.sfil
seed 1725404123
replay finished at tick 1200
```

**The same flight plays back**, keystroke for keystroke, and the same enemies
die in the same order. Hands off the keyboard while it runs — live input is
ignored, but it's confusing to watch your own hands do nothing.

Check four things:

1. **A tap is a nudge.** Tap `W` as briefly as you can; the nose dips a little
   and settles. Hold it; full rate. If a tap slams to full rate, `poll` isn't
   being given the real `dt`.
2. **It plays like chapter 02.** Same keys, same turn rates, same feel apart
   from the ramp. `A`/`D` still yaw.
3. **The replay matches.** If it diverges — the ship drifts off the recorded
   path after a few seconds — the tick index in `advance` is off by one.
4. **`M` captures the mouse** (if you built the mouse source): the cursor
   vanishes, mouse movement rolls and pitches, `M` again releases it. If the
   pointer reappears at the screen edge and input stops, the
   `CGAssociateMouseAndMouseCursorPosition` call isn't being reached.

**If the build fails with "main actor-isolated"**, the `@MainActor` on
`setMouseCaptured` or the `assumeIsolated` in the observer is missing. **If
`replayReproducesTheRecording` fails**, compare `frames.count` first: 300
means the tick index is wrong, anything else means `recording` isn't being
appended once per step. **If the recording is never written**, the app is
being killed rather than quit — `willTerminate` only fires for a clean exit.

---

## Challenge

Add a `--delay N` flag that holds every `InputFrame` in a ring buffer for `N`
ticks before `advance` steps it. Fly with `N` at 0, 3 and 8 — that's 0, 50 and
133 milliseconds. Note how each feels, and keep the note: 3 is the input delay
a lockstep netcode adds on a good connection, 8 on a bad one, and chapter 12
is going to ask you to weigh that against the alternative. Two things make it
non-trivial: the buffer must be primed with empty frames so the first `N`
ticks step *something*, and a recording made with `--delay 3` must replay
correctly *without* the flag — decide which side of the recorder the delay
goes on, and why.

---

**Next:** the flight model. Roll to set up the turn, pull to make it. →
[Chapter 04: Flight: bank and pull](04-flight-bank-and-pull.md)

---

*Back to the [guide map](../README.md) · references in [`resources.md`](../resources.md)*
