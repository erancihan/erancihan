# 13 · Netcode over a loopback 🛠️

> **You'll leave this chapter with:** chapter 12 built. A `Transport`
> protocol and an in-memory network that can be made as slow and lossy as
> you like; a binary message set; a `Server` that owns the real game and a
> `Client` that predicts its own ship, reconciles against snapshots and
> interpolates everyone else; events that arrive exactly once; and a test
> that runs a host and two clients through ten seconds of bad network and
> checks they agree. Plus `--loopback 80 --loss 0.05 --bots 1`, so you can
> fly as a client of your own server and watch the corrections happen.
>
> **Files created:** `Sources/SpaceFighter/Net/Transport.swift`,
> `Net/LoopbackNetwork.swift`, `Net/Protocol.swift`, `Net/Replication.swift`,
> `Net/Server.swift`, `Net/Client.swift`, `App/Screens/NetPlayingScreen.swift`,
> `Tests/SpaceFighterTests/Ch13NetTests.swift`
> **Files changed:** `Game.swift`, `Core/SimulationClock.swift`,
> `ECS/World.swift`, `Systems/DebrisSystem.swift`, `Systems/WaveDirector.swift`,
> `App/Session.swift`, `main.swift`

Chapter 12 drew the design. This chapter types it in, and it does so
against a network that doesn't exist: a `LoopbackNetwork` object that holds
packets in an array until a fake clock says they've arrived, and drops some
on the way. Every line of server and client code in this chapter is written
and tested against that box, and chapter 14 swaps it for a UDP socket
without changing any of them.

That order — fake network first — isn't a convenience. A netcode bug that
only appears with 5 % loss and 20 ms of jitter is unreproducible on a real
LAN, where the loss is zero and the jitter is a millisecond. The loopback
is where you *make* those conditions, on demand, in a unit test.

---

## A network you can hold

**`Sources/SpaceFighter/Net/Transport.swift`** — new file:

```swift
/// Who a packet came from or goes to. Peer 0 is always the server.
typealias PeerID = UInt8

/// One packet: some bytes and where they came from.
struct Datagram {
    let from: PeerID
    let bytes: [UInt8]
}

/// The smallest thing a network has to be: send bytes to a peer, collect the
/// bytes that arrived. Unreliable, unordered, and honest about it. Chapter 13
/// implements it in memory; chapter 14 over UDP.
protocol Transport: AnyObject {
    var localID: PeerID { get }
    func send(_ bytes: [UInt8], to peer: PeerID)
    func receive() -> [Datagram]
}
```

Two methods. No connections, no streams, no guarantees — exactly what UDP
offers and nothing more, because anything the transport promised beyond
that would be something the loopback had to fake and the real socket had
to deliver. Reliability, where it's needed, is built *on top*, once, in the
server and client, where it can be tested.

**`Sources/SpaceFighter/Net/LoopbackNetwork.swift`** — new file:

```swift
/// A network in a box. Every endpoint is in the same process; packets sit in a
/// queue until a fake clock says they've arrived, and the box can be told to
/// be slow, jittery or lossy. The whole netcode is tested against this.
final class LoopbackNetwork {
    /// One-way delay, seconds.
    var latency: Float = 0
    /// Delay varies by ± this much, seconds. Enough jitter reorders packets.
    var jitter: Float = 0
    /// Fraction of packets that never arrive, 0…1.
    var loss: Float = 0

    private(set) var now: Float = 0
    private var rng = Rng(seed: 0xBAD_11E7)
    private var inFlight: [(deliverAt: Float, to: PeerID, datagram: Datagram)] = []
    private var endpoints: [PeerID: LoopbackTransport] = [:]
    private(set) var sent = 0
    private(set) var dropped = 0

    /// The transport for peer `id`, created on first ask.
    func endpoint(_ id: PeerID) -> LoopbackTransport {
        if let existing = endpoints[id] { return existing }
        let created = LoopbackTransport(id: id, network: self)
        endpoints[id] = created
        return created
    }
}
```

Three knobs and a clock. The network has its own `Rng` — chapter 02's, with
a fixed seed — so a test that loses packets loses the *same* packets every
run, which is the difference between a flaky test and a reproducible one.

**`LoopbackNetwork.swift`**, in `LoopbackNetwork` — after `endpoint`:

```diff
         return created
     }
+
+    fileprivate func post(_ bytes: [UInt8], from: PeerID, to: PeerID) {
+        sent += 1
+        if loss > 0 && Float.random(in: 0..<1, using: &rng) < loss {
+            dropped += 1
+            return
+        }
+        let wobble = jitter > 0 ? Float.random(in: -jitter...jitter, using: &rng) : 0
+        let deliverAt = now + max(0, latency + wobble)
+        inFlight.append((deliverAt, to, Datagram(from: from, bytes: bytes)))
+    }
+
+    /// Move the fake clock forward and deliver whatever has arrived by now.
+    func advance(_ dt: Float) {
+        now += dt
+        var still: [(deliverAt: Float, to: PeerID, datagram: Datagram)] = []
+        for packet in inFlight {
+            if packet.deliverAt <= now {
+                endpoints[packet.to]?.inbox.append(packet.datagram)
+            } else {
+                still.append(packet)
+            }
+        }
+        inFlight = still
+    }
 }
```

A packet is either dropped on posting or given a delivery time; `advance`
delivers everything whose time has come. Note what jitter does: two packets
posted a tick apart with delays of 100 ± 20 ms can arrive in the other
order. That's real, it happens on the internet constantly, and the client
below has to cope with it — the loopback is how you find out whether it
does.

**`LoopbackNetwork.swift`** — after `LoopbackNetwork`:

```swift
final class LoopbackTransport: Transport {
    let localID: PeerID
    fileprivate var inbox: [Datagram] = []
    private unowned let network: LoopbackNetwork

    fileprivate init(id: PeerID, network: LoopbackNetwork) {
        self.localID = id
        self.network = network
    }

    func send(_ bytes: [UInt8], to peer: PeerID) {
        network.post(bytes, from: localID, to: peer)
    }

    func receive() -> [Datagram] {
        let out = inbox
        inbox.removeAll(keepingCapacity: true)
        return out
    }
}
```

---

## The vocabulary

Everything the server and a client say to each other is one of seven
messages, and every message is bytes from chapter 03's `ByteWriter`.

**`Sources/SpaceFighter/Net/Protocol.swift`** — new file:

```swift
import simd

/// What kind of thing a snapshot record describes, so the client can build
/// the right local entity for it.
enum NetKind: UInt8 {
    case player
    case enemy
    case bolt
    case missile
    case pickup
}

/// One entity, as it crosses the wire. Everything a client needs to draw it
/// and nothing it would need to simulate it — except for players, who carry
/// the flight state the owning client reconciles against.
struct EntityRecord: Equatable {
    var netID: UInt32
    var kind: NetKind
    var slot: UInt8         // players only; 255 otherwise
    var team: UInt8
    var mesh: UInt8         // MeshID raw value
    var color: Vec4
    var scale: Float
    var position: Vec3
    var rotation: Quat
    var velocity: Vec3
    var angular: Vec3       // players only
    var throttle: Float     // players only
    var speed: Float        // players only
    var health: Float
    var maxHealth: Float
    var pickupKind: UInt8   // pickups only
}
```

This is chapter 12's replication table as a struct. Position, rotation,
velocity and health for everything; angular velocity, throttle and speed
for players, because the owning client resets its ship to *all* of the
server's flight state before replaying; mesh and colour so a client can
draw something it has never seen before. It's 77 bytes on the wire —
a snapshot of a hundred entities is nearly eight kilobytes, which is why
it's split across several datagrams below.

**`Protocol.swift`** — after `EntityRecord`:

```swift
/// Things that happened on the server that a snapshot can't say.
enum NetEvent: Equatable {
    case died(netID: UInt32, position: Vec3, color: Vec4, size: Float)
    case pickedUp(slot: UInt8, kind: UInt8)
    case wave(number: UInt16, breather: Bool)
    case score(Int32)
    case gameOver
}

/// The whole vocabulary between a client and the server.
enum Message: Equatable {
    case hello(version: UInt16)
    case welcome(slot: UInt8, seed: UInt64, tick: UInt32, ship: UInt8, seats: UInt8)
    case input(tick: UInt32, frame: InputFrame, ack: UInt32)
    case snapshot(tick: UInt32, records: [EntityRecord], last: Bool)
    case event(seq: UInt32, event: NetEvent)
    case ping(tick: UInt32)
    case pong(tick: UInt32)

    static let version: UInt16 = 1
    /// Stay under a typical path MTU so a snapshot part is one datagram.
    static let maxPayload = 1200
}

enum ProtocolError: Error {
    case badTag(UInt8)
    case truncated
}
```

`died` carries a position, a colour and a size — everything an explosion
needs — because by the time a client reads the event, the entity it names
may already be gone from the snapshot. An event has to be self-contained.
`Input` carries an `ack` — the highest event sequence the client has
received — so acks ride on packets that are being sent anyway, sixty times
a second, and never need one of their own.

**`Protocol.swift`** — after `ProtocolError`:

```swift
// MARK: - Encoding

extension Message {
    func encoded() -> [UInt8] {
        var w = ByteWriter()
        switch self {
        case .hello(let version):
            w.write(UInt8(1)); w.write(version)
        case .welcome(let slot, let seed, let tick, let ship, let seats):
            w.write(UInt8(2)); w.write(slot); w.write(seed); w.write(tick); w.write(ship); w.write(seats)
        case .input(let tick, let frame, let ack):
            w.write(UInt8(3)); w.write(tick); w.write(frame); w.write(ack)
        case .snapshot(let tick, let records, let last):
            w.write(UInt8(4)); w.write(tick); w.write(last ? UInt8(1) : 0)
            w.write(UInt16(records.count))
            for r in records { w.write(r) }
        case .event(let seq, let event):
            w.write(UInt8(5)); w.write(seq); w.write(event)
        case .ping(let tick):
            w.write(UInt8(6)); w.write(tick)
        case .pong(let tick):
            w.write(UInt8(7)); w.write(tick)
        }
        return w.bytes
    }
}
```

A tag byte, then the fields in order — the same discipline as chapter 03's
`InputLog`, one level up. The tag is what lets a receiver that gets
*anything* know what it is.

**`Protocol.swift`**, in `extension Message` — after `encoded`:

```diff
         return w.bytes
     }
+
+    init(decoding bytes: [UInt8]) throws {
+        var r = ByteReader(bytes)
+        do {
+            let tag = try r.readUInt8()
+            switch tag {
+            case 1: self = .hello(version: try r.readUInt16())
+            case 2:
+                self = .welcome(
+                    slot: try r.readUInt8(), seed: try r.readUInt64(), tick: try r.readUInt32(),
+                    ship: try r.readUInt8(), seats: try r.readUInt8())
+            case 3:
+                self = .input(tick: try r.readUInt32(), frame: try r.readInputFrame(), ack: try r.readUInt32())
+            case 4:
+                let tick = try r.readUInt32()
+                let last = try r.readUInt8() == 1
+                let count = Int(try r.readUInt16())
+                var records: [EntityRecord] = []
+                records.reserveCapacity(count)
+                for _ in 0..<count { records.append(try r.readRecord()) }
+                self = .snapshot(tick: tick, records: records, last: last)
+            case 5: self = .event(seq: try r.readUInt32(), event: try r.readEvent())
+            case 6: self = .ping(tick: try r.readUInt32())
+            case 7: self = .pong(tick: try r.readUInt32())
+            default: throw ProtocolError.badTag(tag)
+            }
+        } catch is ByteReaderError {
+            throw ProtocolError.truncated
+        }
+    }
 }
```

Decoding *throws*, and the server and client both `try?` it and drop
anything that fails. Bytes from the network are the least trusted input a
program has; a truncated or garbage packet must never crash the receiver,
and the `ByteReader`'s bounds checks from chapter 03 are what make that a
one-line policy here.

**`Protocol.swift`** — after `extension Message`:

```swift
// MARK: - Field encodings

extension ByteWriter {
    /// A stick axis as one signed byte: 127 steps each way is finer than a thumb.
    mutating func writeAxis(_ v: Float) {
        write(UInt8(bitPattern: Int8((min(max(v, -1), 1) * 127).rounded())))
    }

    mutating func write(_ f: InputFrame) {
        writeAxis(f.pitch); writeAxis(f.roll); writeAxis(f.yaw); writeAxis(f.throttle)
        write(f.buttons.rawValue)
    }

    mutating func write(_ v: Vec3) { write(v.x); write(v.y); write(v.z) }

    /// A unit quaternion as four Int16s: 15 bits of precision per component.
    mutating func write(_ q: Quat) {
        for c in [q.vector.x, q.vector.y, q.vector.z, q.vector.w] {
            write(UInt16(bitPattern: Int16((min(max(c, -1), 1) * 32767).rounded())))
        }
    }

    /// A colour as four bytes.
    mutating func writeColor(_ c: Vec4) {
        for v in [c.x, c.y, c.z, c.w] { write(UInt8((min(max(v, 0), 1) * 255).rounded())) }
    }

    mutating func write(_ r: EntityRecord) {
        write(r.netID); write(r.kind.rawValue); write(r.slot); write(r.team); write(r.mesh)
        writeColor(r.color); write(r.scale)
        write(r.position); write(r.rotation); write(r.velocity)
        write(r.angular); write(r.throttle); write(r.speed)
        write(r.health); write(r.maxHealth); write(r.pickupKind)
    }

    mutating func write(_ e: NetEvent) {
        switch e {
        case .died(let id, let position, let color, let size):
            write(UInt8(1)); write(id); write(position); writeColor(color); write(size)
        case .pickedUp(let slot, let kind):
            write(UInt8(2)); write(slot); write(kind)
        case .wave(let n, let breather):
            write(UInt8(3)); write(n); write(breather ? UInt8(1) : 0)
        case .score(let s):
            write(UInt8(4)); write(UInt32(bitPattern: s))
        case .gameOver:
            write(UInt8(5))
        }
    }
}
```

Three quantisations, promised in chapter 12. An axis becomes one signed
byte: `−1…1` in 127 steps, an `InputFrame` in six bytes instead of
eighteen. A quaternion's four components, each in `−1…1`, become four
`Int16`s. A colour becomes four bytes. Positions stay as floats, because
the world is hundreds of units wide and a quantised position would step
visibly.

**`Protocol.swift`** — after `extension ByteWriter`:

```swift
extension ByteReader {
    mutating func readAxis() throws -> Float {
        Float(Int8(bitPattern: try readUInt8())) / 127
    }

    mutating func readInputFrame() throws -> InputFrame {
        var f = InputFrame()
        f.pitch = try readAxis(); f.roll = try readAxis(); f.yaw = try readAxis(); f.throttle = try readAxis()
        f.buttons = Buttons(rawValue: try readUInt16())
        return f
    }

    mutating func readVec3() throws -> Vec3 {
        Vec3(try readFloat(), try readFloat(), try readFloat())
    }

    mutating func readQuat() throws -> Quat {
        var c: [Float] = []
        for _ in 0..<4 { c.append(Float(Int16(bitPattern: try readUInt16())) / 32767) }
        return simd_normalize(Quat(vector: Vec4(c[0], c[1], c[2], c[3])))
    }

    mutating func readColor() throws -> Vec4 {
        var c: [Float] = []
        for _ in 0..<4 { c.append(Float(try readUInt8()) / 255) }
        return Vec4(c[0], c[1], c[2], c[3])
    }

    mutating func readRecord() throws -> EntityRecord {
        let netID = try readUInt32()
        guard let kind = NetKind(rawValue: try readUInt8()) else { throw ByteReaderError.truncated }
        return EntityRecord(
            netID: netID, kind: kind, slot: try readUInt8(), team: try readUInt8(), mesh: try readUInt8(),
            color: try readColor(), scale: try readFloat(),
            position: try readVec3(), rotation: try readQuat(), velocity: try readVec3(),
            angular: try readVec3(), throttle: try readFloat(), speed: try readFloat(),
            health: try readFloat(), maxHealth: try readFloat(), pickupKind: try readUInt8())
    }

    mutating func readEvent() throws -> NetEvent {
        switch try readUInt8() {
        case 1: return .died(netID: try readUInt32(), position: try readVec3(), color: try readColor(), size: try readFloat())
        case 2: return .pickedUp(slot: try readUInt8(), kind: try readUInt8())
        case 3: return .wave(number: try readUInt16(), breather: try readUInt8() == 1)
        case 4: return .score(Int32(bitPattern: try readUInt32()))
        case 5: return .gameOver
        default: throw ByteReaderError.truncated
        }
    }
}
```

`readQuat` renormalises: four `Int16`s don't quite make a unit quaternion,
and the first guide's chapter 04 was clear about what a non-unit rotation
does to a mesh.

---

## Authority and mirror

`Game` has been the whole simulation since chapter 02. Now there are two
kinds of it, and the difference is one enum.

**`Sources/SpaceFighter/Game.swift`** — before `final class Game`:

```swift
/// Whose word is final. An authority runs the whole simulation; a mirror
/// only flies the ship in its own seat and is told about everything else.
enum GameRole: Equatable {
    case authority
    case mirror(localSlot: Int)
}
```

**`Game.swift`**, in `Game` — the role, and which seats are occupied:

```diff
     let playerCount: Int
+    let role: GameRole
     /// Presentation flags, one set per seat.
     let stats: [GameStats]
     /// True once the run is over and the world has had its last moment. An
     /// ended run stops stepping.
-    private(set) var isOver = false
+    var isOver = false
     /// Seconds until `isOver`, counting down once the run is decided; nil before.
     private var overIn: Float?
     /// Seconds until a dead seat gets a new ship, per seat; nil while alive.
     private var respawnTimers: [Float?]
+    /// Which seats have someone in them. Empty seats never get a ship.
+    private(set) var seatJoined: [Bool]
```

`isOver` loses `private(set)` because a mirror is *told* the run is over.

**`Game.swift`** — replace `init`, and add `joinSeat`, `leaveSeat` and
`drainEffects` after it:

```swift
    init(
        seed: UInt64 = 1, ship: ShipDefinition = Ships.all[1], playerCount: Int = 1,
        role: GameRole = .authority, spawnSeats: Bool = true
    ) {
        world = World(seed: seed)
        self.ship = ship
        self.playerCount = playerCount
        self.role = role
        stats = (0..<playerCount).map { _ in GameStats() }
        respawnTimers = Array(repeating: nil, count: playerCount)
        seatJoined = Array(repeating: false, count: playerCount)
        lastInputs = Array(repeating: InputFrame(), count: playerCount)
        lastCameras = Array(repeating: nil, count: playerCount)
        if spawnSeats {
            for slot in 0..<playerCount { joinSeat(slot, ship: ship) }
        }
    }

    /// Put someone in a seat: spawn their ship. Idempotent.
    @discardableResult
    func joinSeat(_ slot: Int, ship: ShipDefinition) -> Entity {
        seatJoined[slot] = true
        if let existing = player(inSlot: slot) { return existing }
        let anchor = players.first.flatMap { world.get(Transform.self, $0) }
        let position = anchor.map { $0.position + $0.right * 8 } ?? Vec3(Float(slot) * 8, 0, 0)
        return spawnPlayer(in: world, ship: ship, slot: UInt8(slot), at: position)
    }

    /// Empty a seat: the ship goes and nobody respawns into it.
    func leaveSeat(_ slot: Int) {
        seatJoined[slot] = false
        if let ship = player(inSlot: slot) { world.destroy(ship) }
    }

    /// Everything that happened since the last time anyone asked. The
    /// presentation drains this in `frame`; a headless server drains it itself.
    func drainEffects() -> [GameEvent] {
        let out = effects
        effects.removeAll(keepingCapacity: true)
        return out
    }
```

Chapter 11 spawned every seat's ship in `init`. A server doesn't know who
will connect, so seats are *joined*: a server game is created with
`spawnSeats: false` and a ship appears when a `Hello` arrives. The
single-player path is unchanged — `spawnSeats` defaults to true and calls
`joinSeat` for every seat.

`drainEffects` exists because a server has no `frame`. Its `Game` is never
drawn; someone else has to empty the event list, and it's the server, which
turns them into `NetEvent`s.

**`Game.swift`**, in `Game` — after `advance(realDt:inputs:)`:

```swift
    /// Bank real time and step, asking `inputsForTick` what every seat did on
    /// each tick. A server uses this to step with whatever has arrived.
    func advance(realDt: Float, inputsForTick: (UInt32) -> [InputFrame]) {
        guard !isOver else { return }
        let steps = clock.advance(realDt: realDt)
        for i in 0..<steps {
            let tick = clock.tick - UInt32(steps) + UInt32(i)
            step(inputs: inputsForTick(tick), dt: SimulationClock.step)
        }
    }

    /// One step of the local ship alone: the flight model and its movement,
    /// nothing else. A client replays its recent inputs through this after a
    /// correction from the server.
    func predictOwnShip(input: InputFrame, dt: Float) {
        guard case .mirror(let slot) = role, let ship = player(inSlot: slot) else { return }
        FlightControlSystem.update(world, player: ship, input: input, dt: dt)
        if let v = world.get(Velocity.self, ship) {
            world.store(Transform.self).mutate(ship) { $0.position += v.linear * dt }
        }
    }
```

The third `advance`. Chapter 03's takes one frame for the whole display
frame; chapter 11's takes one per seat; this one takes a *function* from
tick to frames, because a server's inputs come from different clients at
different times and the right one for tick 100 may not be the right one
for tick 101. `predictOwnShip` is chapter 12's reconciliation replay: the
flight system and movement for one entity, one step, no clock — it's what
gets called a handful of times in a row when a snapshot arrives.

**`Game.swift`**, in `step` — after `events.removeAll`:

```diff
         world.snapshotTransforms()
         world.events.removeAll(keepingCapacity: true)

+        if case .mirror(let local) = role {
+            mirrorStep(input: inputs[local], slot: local, dt: dt)
+            return
+        }
+
         for slot in 0..<playerCount {
```

**`Game.swift`**, in `step` — the tail, and the mirror's step after it:

```diff
         if overIn == nil { run.seconds += dt }
         run.wave = director.wave
         respawnTheDead(dt: dt)
-        endRun(when: players.isEmpty, dt: dt)
+        endRun(when: players.isEmpty && seatJoined.contains(true), dt: dt)
     }
+
+    /// A mirror's step: fly the one ship this machine owns, move what moves
+    /// locally (that ship, debris), and age the debris. Everything else in the
+    /// world is placed by snapshots.
+    private func mirrorStep(input: InputFrame, slot: Int, dt: Float) {
+        if let ship = player(inSlot: slot) {
+            FlightControlSystem.update(world, player: ship, input: input, dt: dt)
+        }
+        MovementSystem.update(world, dt: dt)
+        SpinSystem.update(world, dt: dt)
+        LifetimeSystem.update(world, dt: dt)
+        world.flushDestroyed()
+        effects.append(contentsOf: world.events)
+        run.seconds += dt
+    }
```

Here is the whole difference between the two roles. An authority runs the
schedule from chapter 08. A mirror runs *four systems*: the flight model
for its own ship, movement (for that ship and for debris — everything else
in a mirror has no `Velocity`, so movement leaves it alone), spinners and
lifetimes for debris. No AI, no weapons, no collision, no damage, no
director. It flies one ship and shows the rest.

`isOver` on the authority also learns about seats: a server whose clients
haven't connected yet has no players and mustn't declare the run over.

**`Game.swift`**, in `respawnTheDead` — only occupied seats come back:

```diff
         let living = players
-        for slot in 0..<playerCount {
+        for slot in 0..<playerCount where seatJoined[slot] {
             if player(inSlot: slot) != nil {
```

**`Game.swift`**, in `Game` — after `clock`:

```diff
     private(set) var clock = SimulationClock()
+
+    /// Move the tick counter. A client runs ahead of its server by a few ticks.
+    func setTick(_ tick: UInt32) {
+        clock.set(tick: tick)
+    }
```

**`Sources/SpaceFighter/Core/SimulationClock.swift`**, in `SimulationClock`
— after `alpha`:

```diff
     var alpha: Float { accumulator / Self.step }
+
+    /// Jump the tick counter. A client does this to run ahead of its server.
+    mutating func set(tick: UInt32) {
+        self.tick = tick
+    }
 }
```

Chapter 02 said `tick` would matter later. This is later: a client sets its
clock a few ticks ahead of the server's so its inputs arrive in time.

Two more small things the server needs. An explosion has to be describable
after the entity is gone, and a mirror's director has to be *told* the wave.

**`Sources/SpaceFighter/ECS/World.swift`**, in `GameEvent`:

```diff
     case pickedUp(Entity, UpgradeKind)
     case shielded(Entity)
+    /// Where and how big something blew up. Carries what the entity looked
+    /// like, because by the time anyone reads this the entity is gone.
+    case exploded(Entity, at: Vec3, color: Vec4, size: Float)
 }
```

**`Sources/SpaceFighter/Systems/DebrisSystem.swift`**, in `update`:

```diff
             let color = world.get(Renderable.self, entity)?.color ?? Vec4(1, 1, 1, 1)
             spawnExplosion(in: world, at: t.position, color: color, size: t.scale.x)
+            world.events.append(.exploded(entity, at: t.position, color: color, size: t.scale.x))
```

**`Sources/SpaceFighter/Systems/WaveDirector.swift`**, in `WaveDirector` —
before `composition`:

```diff
+    /// A mirror is told what wave it is; it never runs the director itself.
+    func mirror(wave: Int, breather: Bool) {
+        self.wave = wave
+        self.phase = breather ? .breather : .fighting
+    }
+
     /// What wave `n` is made of, in spawn order.
```

---

## What crosses the wire

**`Sources/SpaceFighter/Net/Replication.swift`** — new file:

```swift
import simd

/// Turns a world into records and records back into a world. The one place
/// that knows which components cross the wire.
enum Replication {
    /// A server entity's handle as one number: 24 bits of slot, 8 of generation.
    static func netID(_ e: Entity) -> UInt32 {
        (e.id & 0x00FF_FFFF) << 8 | (e.generation & 0xFF)
    }

    /// What a record should say an entity is, or nil if it never leaves the server.
    static func kind(of e: Entity, in world: World) -> NetKind? {
        if world.get(Debris.self, e) != nil { return nil }
        if world.get(Player.self, e) != nil { return .player }
        if world.get(Enemy.self, e) != nil { return .enemy }
        if world.get(Pickup.self, e) != nil { return .pickup }
        if world.get(Projectile.self, e) != nil {
            return world.get(Homing.self, e) != nil ? .missile : .bolt
        }
        return nil
    }
}
```

The net id is chapter 06's `Entity` squeezed into 32 bits: sixteen million
slots and 256 generations, which is enough for a slot to be reused 255
times before an id repeats. `kind` is the replication table's first column
— what *is* this thing — read off the components it has, and `Debris`
returns `nil`: fragments never cross the wire, because the `died` event
lets each client blow things up for itself.

**`Replication.swift`**, in `Replication` — after `kind`:

```diff
+    /// Every entity a client needs to see, as it stands right now.
+    static func snapshot(of world: World) -> [EntityRecord] {
+        let renderables = world.store(Renderable.self)
+        var out: [EntityRecord] = []
+        out.reserveCapacity(renderables.count)
+        for e in renderables.owners {
+            guard world.isAlive(e), let kind = kind(of: e, in: world),
+                let t = world.get(Transform.self, e), let r = renderables.get(e)
+            else { continue }
+            let health = world.get(Health.self, e)
+            let engine = world.get(Engine.self, e)
+            out.append(EntityRecord(
+                netID: netID(e), kind: kind,
+                slot: world.get(PlayerSlot.self, e)?.index ?? 255,
+                team: world.get(Team.self, e)?.id ?? 1,
+                mesh: UInt8(r.mesh.rawValue), color: r.color, scale: t.scale.x,
+                position: t.position, rotation: t.rotation,
+                velocity: world.get(Velocity.self, e)?.linear ?? .zero,
+                angular: world.get(AngularVelocity.self, e)?.body ?? .zero,
+                throttle: engine?.throttle ?? 0, speed: engine?.speed ?? 0,
+                health: health?.current ?? 0, maxHealth: health?.max ?? 0,
+                pickupKind: world.get(Pickup.self, e)?.kind.rawValue ?? 0))
+        }
+        return out
+    }
```

A pass over everything drawable, one record each. It walks the
`Renderable` store because "a client needs to see it" and "it has a
`Renderable`" are the same thing.

**`Replication.swift`**, in `Replication` — after `snapshot`:

```diff
+    /// A stand-in for a server entity: what it looks like and where it is, and
+    /// none of what it does. No Velocity, so MovementSystem leaves it alone;
+    /// snapshots move it.
+    @discardableResult
+    static func spawnGhost(_ r: EntityRecord, in world: World) -> Entity {
+        let e = world.createEntity()
+        var t = Transform()
+        t.position = r.position
+        t.rotation = r.rotation
+        t.scale = Vec3(repeating: r.scale)
+        world.add(t, to: e)
+        world.add(Renderable(mesh: MeshID(rawValue: Int(r.mesh)) ?? .enemy, color: r.color), to: e)
+        world.add(Team(id: r.team), to: e)
+        if r.maxHealth > 0 {
+            var h = Health(r.maxHealth)
+            h.current = r.health
+            world.add(h, to: e)
+        }
+        switch r.kind {
+        case .player:
+            world.add(Player(), to: e)
+            world.add(PlayerSlot(index: r.slot), to: e)
+        case .enemy: world.add(Enemy(), to: e)
+        case .bolt, .missile: world.add(Projectile(damage: 0), to: e)
+        case .pickup: world.add(Pickup(kind: UpgradeKind(rawValue: r.pickupKind) ?? .shield), to: e)
+        }
+        return e
+    }
+
+    /// Bring a ghost up to date with its record.
+    static func update(_ e: Entity, from r: EntityRecord, in world: World) {
+        world.store(Transform.self).mutate(e) {
+            $0.position = r.position
+            $0.rotation = r.rotation
+        }
+        world.store(Health.self).mutate(e) { $0.current = r.health }
+    }
```

A *ghost* is what a mirror holds for every server entity that isn't its
own ship: a transform, a renderable, a team, a health, and a tag saying
what kind of thing it is — so the HUD can count enemies or the hangar can
tell a player from a bolt. What a ghost pointedly doesn't have is a
`Velocity`, a `FlightModel`, an `AIController`, a `Collider`. Nothing in the
mirror's four-system step will touch it. Snapshots are the only thing that
move a ghost, which is exactly chapter 12's line between "simulated here"
and "shown here".

---

## The server

**`Sources/SpaceFighter/Net/Server.swift`** — new file:

```swift
import simd

/// The authority. Owns the real Game, takes every client's inputs, steps, and
/// tells everyone what happened: snapshots often and unreliably, events once
/// and reliably.
final class Server {
    static let snapshotEvery: UInt32 = 3   // ticks; 20 Hz
    static let resendEvery: UInt32 = 6     // ticks; unacked events go again

    let game: Game
    let transport: Transport
    let ship: ShipDefinition

    private struct Peer {
        var slot: Int
        var inputs: [UInt32: InputFrame] = [:]
        var lastInput = InputFrame()
        var pending: [(seq: UInt32, event: NetEvent)] = []
        var nextSeq: UInt32 = 1
        var acked: UInt32 = 0
        var lastResend: UInt32 = 0
    }

    private var peers: [PeerID: Peer] = [:]
    private var lastWave = -1
    private var lastBreather = false
    private var lastScore = 0
    private var announcedOver = false

    init(game: Game, transport: Transport, ship: ShipDefinition) {
        self.game = game
        self.transport = transport
        self.ship = ship
    }
}
```

Per peer, the server keeps a seat, a buffer of inputs by tick, the last
input it used, and the reliability state for events: what's pending, the
next sequence number, the highest one the peer has acked.

**`Server.swift`**, in `Server` — after `init`:

```diff
+    /// One display frame's worth of serving: read the wire, step, write the wire.
+    func update(realDt: Float) {
+        for datagram in transport.receive() {
+            guard let message = try? Message(decoding: datagram.bytes) else { continue }
+            handle(message, from: datagram.from)
+        }
+
+        game.advance(realDt: realDt) { tick in self.inputs(forTick: tick) }
+
+        queueEvents(game.drainEffects())
+        if game.clock.tick % Self.snapshotEvery == 0 { sendSnapshot() }
+        flushReliable()
+    }
```

Four lines that are the server: receive, step, events, snapshot. It's
called once per display frame like everything else, and the fixed-step
clock inside `advance` makes the simulation rate independent of how often.

**`Server.swift`**, in `Server` — after `update`:

```diff
+    private func handle(_ message: Message, from peer: PeerID) {
+        switch message {
+        case .hello(let version):
+            guard version == Message.version else { return }
+            if peers[peer] == nil {
+                guard let slot = (0..<game.playerCount).first(where: { s in !peers.values.contains { $0.slot == s } })
+                else { return }
+                var newcomer = Peer(slot: slot)
+                // A snapshot says where things are; only events say what wave
+                // it is and what the score is. A newcomer gets those now.
+                for e in [
+                    NetEvent.wave(number: UInt16(game.director.wave), breather: game.director.phase == .breather),
+                    NetEvent.score(Int32(game.run.score)),
+                ] {
+                    newcomer.pending.append((newcomer.nextSeq, e))
+                    newcomer.nextSeq += 1
+                }
+                peers[peer] = newcomer
+                game.joinSeat(slot, ship: ship)
+            }
+            let slot = peers[peer]!.slot
+            let shipIndex = UInt8(Ships.all.firstIndex { $0.name == ship.name } ?? 1)
+            transport.send(
+                Message.welcome(
+                    slot: UInt8(slot), seed: 0, tick: game.clock.tick, ship: shipIndex,
+                    seats: UInt8(game.playerCount)
+                ).encoded(), to: peer)
+        case .input(let tick, let frame, let ack):
+            guard var p = peers[peer] else { return }
+            p.inputs[tick] = frame
+            p.acked = max(p.acked, ack)
+            p.pending.removeAll { $0.seq <= p.acked }
+            peers[peer] = p
+        case .ping(let tick):
+            transport.send(Message.pong(tick: tick).encoded(), to: peer)
+        default:
+            break
+        }
+    }
```

A `Hello` from a new peer gets the first free seat, a ship in it, and a
`Welcome`; a `Hello` from a peer already seated — its first one was
answered but the answer was lost — gets the same `Welcome` again, which is
how the handshake survives a dropped packet without any special state. The
two events queued for a newcomer are the late-join fix: a snapshot can tell
a client where everything is but not what wave it is, and a client that
joined at wave six shouldn't see `WAVE 0`.

An `Input` goes into the buffer by tick, and its piggybacked `ack` lets the
server forget every event that peer has confirmed.

**`Server.swift`**, in `Server` — after `handle`:

```diff
+    /// What every seat did on `tick`: the input that arrived for it, or the
+    /// last one that did. Silence means "keep doing that".
+    private func inputs(forTick tick: UInt32) -> [InputFrame] {
+        var frames = Array(repeating: InputFrame(), count: game.playerCount)
+        for (id, var p) in peers {
+            if let f = p.inputs[tick] {
+                p.lastInput = f
+            }
+            frames[p.slot] = p.lastInput
+            p.inputs = p.inputs.filter { $0.key + 120 > tick }  // forget the distant past
+            peers[id] = p
+        }
+        return frames
+    }
```

Chapter 12's rule for a late input: use the last one. A ship whose pilot's
packet was lost keeps doing what it was doing for a tick, which is almost
always right and is corrected by the pilot's next packet. The filter keeps
the per-peer buffer from growing forever.

This iterates a dictionary inside the simulation's input path, and the
order *doesn't matter*: each peer writes its own seat's slot in `frames`.
The rule from chapter 02 is about order the result depends on.

**`Server.swift`**, in `Server` — after `inputs(forTick:)`:

```diff
+    private func queueEvents(_ effects: [GameEvent]) {
+        var events: [NetEvent] = []
+        for effect in effects {
+            switch effect {
+            case .exploded(let e, let at, let color, let size):
+                events.append(.died(netID: Replication.netID(e), position: at, color: color, size: size))
+            case .pickedUp(let e, let kind):
+                if let slot = game.world.get(PlayerSlot.self, e)?.index {
+                    events.append(.pickedUp(slot: slot, kind: kind.rawValue))
+                }
+            default:
+                break
+            }
+        }
+        let breather = game.director.phase == .breather
+        if game.director.wave != lastWave || breather != lastBreather {
+            lastWave = game.director.wave
+            lastBreather = breather
+            events.append(.wave(number: UInt16(game.director.wave), breather: breather))
+        }
+        if game.run.score != lastScore {
+            lastScore = game.run.score
+            events.append(.score(Int32(game.run.score)))
+        }
+        if game.isOver && !announcedOver {
+            announcedOver = true
+            events.append(.gameOver)
+        }
+        guard !events.isEmpty else { return }
+        for (id, var p) in peers {
+            for e in events {
+                p.pending.append((p.nextSeq, e))
+                p.nextSeq += 1
+            }
+            peers[id] = p
+        }
+    }
```

The game's events become network events — `exploded` becomes `died` with
its position and colour attached — and three pieces of state that a
snapshot doesn't carry become events when they *change*: the wave, the
score, the end. Every peer gets its own numbered copy, because peers ack
independently.

**`Server.swift`**, in `Server` — after `queueEvents`:

```diff
+    /// Send every event a peer hasn't acked, but not more often than every
+    /// few ticks: a lost event is resent, a slow ack doesn't cause a flood.
+    private func flushReliable() {
+        for (id, var p) in peers where !p.pending.isEmpty {
+            let fresh = p.pending.filter { $0.seq >= p.nextSeq - UInt32(p.pending.count) && $0.seq > p.acked }
+            let due = game.clock.tick - p.lastResend >= Self.resendEvery
+            for (seq, event) in fresh where due || seq == p.nextSeq - 1 {
+                transport.send(Message.event(seq: seq, event: event).encoded(), to: id)
+            }
+            if due { p.lastResend = game.clock.tick }
+            peers[id] = p
+        }
+    }
```

This is the reliability layer, entire. A newly queued event goes out at
once (`seq == p.nextSeq - 1`); everything still pending goes out again
every six ticks until the peer's ack covers it. Over a link that loses
5 % of packets, the chance an event is still missing after two resends is
about one in eight thousand — and it keeps trying.

**`Server.swift`**, in `Server` — after `flushReliable`:

```diff
+    /// The whole world, in datagram-sized pieces, to everyone.
+    private func sendSnapshot() {
+        let records = Replication.snapshot(of: game.world)
+        let tick = game.clock.tick
+        var parts: [[EntityRecord]] = [[]]
+        let header = 1 + 4 + 1 + 2  // tag, tick, last flag, count
+        var size = header
+        for r in records {
+            let recordSize = 4 + 1 + 1 + 1 + 1 + 4 + 4 + 12 + 8 + 12 + 12 + 4 + 4 + 4 + 4 + 1  // 77
+            if size + recordSize > Message.maxPayload {
+                parts.append([])
+                size = header
+            }
+            parts[parts.count - 1].append(r)
+            size += recordSize
+        }
+        for (i, part) in parts.enumerated() {
+            let bytes = Message.snapshot(tick: tick, records: part, last: i == parts.count - 1).encoded()
+            for id in peers.keys { transport.send(bytes, to: id) }
+        }
+    }
```

Records are packed into parts of at most 1200 bytes, and the last part
says it's last, so a client knows when it has the whole picture. Fifteen
records fit in a part; a busy wave is four or five datagrams every third
tick.

---

## The client

**`Sources/SpaceFighter/Net/Client.swift`** — new file:

```swift
import simd

/// A player's view of someone else's game. Flies its own ship ahead of the
/// server and corrects when told; draws everything else a little in the past,
/// between two snapshots.
final class Client {
    static let interpolationDelay: UInt32 = 6  // ticks behind the newest snapshot
    static let helloInterval: Float = 0.5

    let transport: Transport
    private(set) var game: Game?
    private(set) var slot: Int?
    private(set) var rtt: Float = 0
    private(set) var corrections = 0  // how many reconciliations moved the ship
    var leadTicks: UInt32 = 3

    private var history: [(tick: UInt32, frame: InputFrame)] = []
    private var ghosts: [UInt32: Entity] = [:]
    /// How many server entities this client currently mirrors (its own ship aside).
    var ghostCount: Int { ghosts.count }
    private var snapshots: [(tick: UInt32, records: [EntityRecord])] = []
    private var partial: (tick: UInt32, records: [EntityRecord])?
    private var nextEventSeq: UInt32 = 1
    private var heldEvents: [UInt32: NetEvent] = [:]
    private var sinceHello: Float = 1
    private var sincePing: Float = 0
    private var lastPingTick: UInt32 = 0
    private var lastPingSent: Float = 0
    private var clockTime: Float = 0

    init(transport: Transport) {
        self.transport = transport
    }
}
```

The client's state is chapter 12's diagrams as fields: an input history for
reconciliation, a net-id-to-entity map for ghosts, a buffer of recent
snapshots for interpolation, and the sequence bookkeeping for events.
`corrections` counts the reconciliations that actually moved the ship —
the number the title bar shows, so you can watch packet loss happen.

**`Client.swift`**, in `Client` — after `init`:

```diff
+    /// One display frame: read the wire, fly, write the wire, draw.
+    /// Returns nil until the server has said hello back.
+    func update(realDt: Float, input: InputFrame, viewport: SIMD2<Float>) -> FrameRenderData? {
+        clockTime += realDt
+        for datagram in transport.receive() {
+            guard let message = try? Message(decoding: datagram.bytes) else { continue }
+            handle(message)
+        }
+        guard let game else {
+            sinceHello += realDt
+            if sinceHello >= Self.helloInterval {
+                sinceHello = 0
+                transport.send(Message.hello(version: Message.version).encoded(), to: 0)
+            }
+            return nil
+        }
+
+        game.advance(realDt: realDt) { tick in
+            self.history.append((tick, input))
+            var frames = Array(repeating: InputFrame(), count: game.playerCount)
+            frames[self.slot ?? 0] = input
+            self.transport.send(
+                Message.input(tick: tick, frame: input, ack: self.nextEventSeq - 1).encoded(), to: 0)
+            return frames
+        }
+
+        sincePing += realDt
+        if sincePing > 1 {
+            sincePing = 0
+            lastPingTick = game.clock.tick
+            lastPingSent = clockTime
+            transport.send(Message.ping(tick: lastPingTick).encoded(), to: 0)
+        }
+
+        interpolateGhosts(alpha: game.clock.alpha)
+        return game.frame(viewport: viewport, realDt: realDt)
+    }
```

Until it's welcomed, a client says hello twice a second. Once it has a
mirror, the display frame is: step the mirror with the tick-provider
`advance` — recording every input in the history and sending it, stamped
with its tick, as a side effect — ping once a second, place the ghosts, and
draw. `game.frame` is chapter 11's, untouched: the HUD, camera and views
all run against the mirror as if it were a local game.

**`Client.swift`**, in `Client` — after `update`:

```diff
+    // MARK: - Incoming
+
+    private func handle(_ message: Message) {
+        switch message {
+        case .welcome(let slot, _, let tick, let ship, let seats):
+            guard game == nil else { return }
+            let definition = Ships.all[Int(ship) % Ships.all.count]
+            let mirror = Game(
+                seed: 0, ship: definition, playerCount: Int(seats), role: .mirror(localSlot: Int(slot)),
+                spawnSeats: false)
+            mirror.joinSeat(Int(slot), ship: definition)
+            mirror.setTick(tick + leadTicks)
+            self.slot = Int(slot)
+            self.game = mirror
+        case .snapshot(let tick, let records, let last):
+            if partial?.tick != tick { partial = (tick, []) }
+            partial!.records += records
+            if last {
+                apply(snapshot: partial!.records, tick: tick)
+                partial = nil
+            }
+        case .event(let seq, let event):
+            guard seq >= nextEventSeq else { return }  // already had it
+            heldEvents[seq] = event
+            while let next = heldEvents.removeValue(forKey: nextEventSeq) {
+                apply(event: next)
+                nextEventSeq += 1
+            }
+        case .pong(let tick):
+            if tick == lastPingTick {
+                rtt = clockTime - lastPingSent
+                retune()
+            }
+        default:
+            break
+        }
+    }
+
+    /// Keep the local clock the right distance ahead of the server: half the
+    /// round trip, plus a couple of ticks of slack.
+    private func retune() {
+        let wanted = UInt32((rtt / 2 / SimulationClock.step).rounded(.up)) + 2
+        leadTicks = min(max(wanted, 2), 30)
+    }
```

Four messages matter. A `Welcome` builds the mirror: a `Game` in the
`.mirror` role with no seats spawned, then its *own* seat joined so it has
a real ship with a real flight model, and its clock set ahead of the
server's. Snapshot parts are collected until the last one; an event is
applied only when it's the *next* one expected, and held otherwise, which
is how three events that arrive out of order are applied in order and a
duplicate resend is ignored. A `Pong` measures the round trip and retunes
how far ahead to run.

**`Client.swift`**, in `Client` — after `retune`:

```diff
+    private func apply(snapshot records: [EntityRecord], tick: UInt32) {
+        guard let game, let slot else { return }
+        if let newest = snapshots.last, tick <= newest.tick { return }  // out of order: stale
+        snapshots.append((tick, records))
+        if snapshots.count > 12 { snapshots.removeFirst() }
+
+        // The server's tick tells us whether we're running far enough ahead.
+        let wantedTick = tick + leadTicks
+        if game.clock.tick + 8 < wantedTick || game.clock.tick > wantedTick + 8 {
+            game.setTick(wantedTick)
+        }
+
+        var seen = Set<UInt32>()
+        var ownSeen = false
+        for r in records {
+            seen.insert(r.netID)
+            if r.kind == .player && Int(r.slot) == slot {
+                ownSeen = true
+                reconcile(to: r, at: tick)
+                continue
+            }
+            if let ghost = ghosts[r.netID], game.world.isAlive(ghost) {
+                Replication.update(ghost, from: r, in: game.world)
+            } else {
+                ghosts[r.netID] = Replication.spawnGhost(r, in: game.world)
+            }
+        }
+        for (id, ghost) in ghosts where !seen.contains(id) {
+            game.world.destroy(ghost)
+            ghosts[id] = nil
+        }
+        // No record for our seat means the server destroyed our ship. So do we;
+        // the next record for the seat is a fresh ship, and reconcile builds one.
+        if !ownSeen, let ship = game.player(inSlot: slot) { game.world.destroy(ship) }
+        game.world.flushDestroyed()
+        history.removeAll { $0.tick <= tick }
+    }
```

A snapshot older than one already applied is dropped — that's jitter
reordering packets, and the older picture is worthless. Otherwise every
record is one of three things: the client's own ship, which is reconciled;
a ghost it knows, which is updated; or a ghost it doesn't, which is
spawned. Anything the client has that the snapshot doesn't is gone. And
inputs up to the snapshot's tick are forgotten — the server has seen them.

"Anything" includes the client's own ship. If the server destroyed it — a
ram, a last bolt — there is no record for the seat, and the mirror destroys
its copy: the HUD says `DESTROYED - RESPAWNING`, chapter 11's camera holds
where the pilot was, and the explosion arrives as an event, below. When the
server respawns the seat, a record with the seat's number comes back, and
`reconcile` builds a ship to receive it.

**`Client.swift`**, in `Client` — after `apply(snapshot:tick:)`:

```diff
+    /// The server's word on our own ship at `tick`: take it, then re-fly every
+    /// input the server hasn't seen yet so we end up where we'll be told we
+    /// were — unless a packet was lost or something hit us, in which case we
+    /// end up somewhere slightly different, and that's the correction.
+    private func reconcile(to r: EntityRecord, at tick: UInt32) {
+        guard let game, let slot else { return }
+        let ship = game.player(inSlot: slot) ?? game.joinSeat(slot, ship: game.ship)
+        let before = game.world.get(Transform.self, ship)?.position ?? .zero
+        let hullBefore = game.world.get(Health.self, ship)?.current ?? r.health
+
+        game.world.store(Transform.self).mutate(ship) {
+            $0.position = r.position
+            $0.rotation = r.rotation
+        }
+        game.world.store(Velocity.self).set(ship, Velocity(linear: r.velocity))
+        game.world.store(AngularVelocity.self).set(ship, AngularVelocity(body: r.angular))
+        game.world.store(Engine.self).mutate(ship) {
+            $0.throttle = r.throttle
+            $0.speed = r.speed
+        }
+        game.world.store(Health.self).mutate(ship) { $0.current = r.health }
+        // The snapshot is also how a hit reaches us: a hull that dropped is a
+        // flash and a shake, the reaction the authority gets from its own event.
+        if r.health < hullBefore {
+            game.stats[slot].hitFlash = 0.5
+            game.stats[slot].pendingShake = 1
+        }
+
+        for (t, frame) in history where t > tick {
+            game.predictOwnShip(input: frame, dt: SimulationClock.step)
+        }
+
+        let after = game.world.get(Transform.self, ship)?.position ?? .zero
+        if simd_length(after - before) > 0.05 { corrections += 1 }
+    }
```

Chapter 12's flowchart, verbatim. Every piece of flight state the server
sent is written over the local ship — position, rotation, velocity,
angular velocity, throttle, speed — and then every input the client has
sent since that tick is replayed through `predictOwnShip`. If the client's
prediction was right, `after` equals `before` to the bit, because the same
code ran on the same numbers. When it wasn't, the ship moves, and
`corrections` ticks up.

Two small things ride on the reconcile. The ship is looked up *or built*:
after a death, the seat's next record is a fresh ship the server spawned, and
`joinSeat` gives the mirror one to receive it. And the hull is compared
before it's overwritten — a hull that dropped is a hit, and the flash and
shake chapter 06's `damaged` event gives the authority are set here, from the
only place a mirror can learn about one. Chapter 12's table said `damaged`
needn't cross the wire because the snapshot carries health; this is where
that promise is kept.

There is no smoothing of that move. It snaps. On a good connection the
snaps are invisible; with `--loss 0.3` they aren't, and the challenge is
about making them so.

**`Client.swift`**, in `Client` — after `reconcile`:

```diff
+    private func apply(event: NetEvent) {
+        guard let game else { return }
+        switch event {
+        case .died(_, let position, let color, let size):
+            spawnExplosion(in: game.world, at: position, color: color, size: size)
+        case .pickedUp(let slot, let kind):
+            if Int(slot) == self.slot, let k = UpgradeKind(rawValue: kind) {
+                game.stats[Int(slot)].toast = Toast(text: Toast.name(of: k), kind: k)
+                game.stats[Int(slot)].toastTime = 1.5
+            }
+        case .wave(let number, let breather):
+            game.director.mirror(wave: Int(number), breather: breather)
+            game.run.wave = Int(number)
+        case .score(let score):
+            game.run.score = Int(score)
+        case .gameOver:
+            game.isOver = true
+        }
+    }
```

Events do on the mirror what the systems did on the authority: `died`
spawns chapter 07's explosion, in the mirror's world, where the mirror's
four systems will move and expire it; the others set state the HUD reads.

**`Client.swift`**, in `Client` — after `apply(event:)`:

```diff
+    // MARK: - Interpolation
+
+    /// Draw every ghost where it was `interpolationDelay` ticks before the
+    /// newest snapshot, between the two snapshots that bracket that moment.
+    private func interpolateGhosts(alpha: Float) {
+        guard let game, let newest = snapshots.last, snapshots.count >= 2 else { return }
+        let renderTick = Float(newest.tick) - Float(Self.interpolationDelay) + alpha
+        guard let afterIndex = snapshots.firstIndex(where: { Float($0.tick) >= renderTick }) else {
+            place(snapshots.last!.records, in: game)
+            return
+        }
+        if afterIndex == 0 {
+            place(snapshots[0].records, in: game)
+            return
+        }
+        let a = snapshots[afterIndex - 1]
+        let b = snapshots[afterIndex]
+        let span = Float(b.tick - a.tick)
+        let t = span > 0 ? (renderTick - Float(a.tick)) / span : 1
+        let byID = Dictionary(uniqueKeysWithValues: b.records.map { ($0.netID, $0) })
+        let transforms = game.world.store(Transform.self)
+        let previous = game.world.store(PreviousTransform.self)
+        for ra in a.records {
+            guard let ghost = ghosts[ra.netID], game.world.isAlive(ghost) else { continue }
+            let rb = byID[ra.netID] ?? ra
+            let position = simd_mix(ra.position, rb.position, Vec3(repeating: t))
+            let rotation = simd_slerp(ra.rotation, rb.rotation, t)
+            transforms.mutate(ghost) {
+                $0.position = position
+                $0.rotation = rotation
+            }
+            previous.set(ghost, PreviousTransform(position: position, rotation: rotation))
+        }
+    }
+
+    private func place(_ records: [EntityRecord], in game: Game) {
+        let transforms = game.world.store(Transform.self)
+        let previous = game.world.store(PreviousTransform.self)
+        for r in records {
+            guard let ghost = ghosts[r.netID], game.world.isAlive(ghost) else { continue }
+            transforms.mutate(ghost) {
+                $0.position = r.position
+                $0.rotation = r.rotation
+            }
+            previous.set(ghost, PreviousTransform(position: r.position, rotation: r.rotation))
+        }
+    }
```

The render time is six ticks behind the newest snapshot, plus this frame's
`alpha` from the clock. Find the two snapshots either side of it, blend
each ghost between its two records — `simd_mix` for position, `simd_slerp`
for rotation, chapter 02's pair — and write the result into *both* the
ghost's `Transform` and its `PreviousTransform`, so that `SceneSystem`'s
own blend draws exactly that pose. With fewer than two snapshots, or a
render time outside the buffer, the ghost is simply placed at the nearest
one.

---

## In the app

**`Sources/SpaceFighter/App/Screens/NetPlayingScreen.swift`** — new file:

```swift
import simd

/// The game, seen through a Client. If this machine is also the host, the
/// Server lives here too and is stepped after the clients, the way a real
/// network would deliver their packets after they sent them.
final class NetPlayingScreen: Screen {
    let client: Client
    let server: Server?
    let bots: [BotClient]
    private let pump: (Float) -> Void
    private let menu: MenuWorld

    /// `pump` moves the transport forward: the loopback's fake clock, or
    /// nothing at all for a real socket.
    init(client: Client, server: Server?, bots: [BotClient], menu: MenuWorld, pump: @escaping (Float) -> Void) {
        self.client = client
        self.server = server
        self.bots = bots
        self.menu = menu
        self.pump = pump
    }

    var title: String {
        guard let game = client.game else { return "Space Fighter — Connecting…" }
        let role = server == nil ? "client" : "host"
        return "Space Fighter — \(role)    Score \(game.run.score)    Wave \(game.run.wave)    "
            + "RTT \(Int(client.rtt * 1000)) ms    Corrections \(client.corrections)"
    }

    private var pendingFrame: FrameRenderData?

    func update(inputs: [InputFrame], pressed: Buttons, realDt: Float) -> Transition? {
        if pressed.contains(.pause) || pressed.contains(.back) { return .toTitle }
        pendingFrame = client.update(realDt: realDt, input: inputs.first ?? InputFrame(), viewport: lastViewport)
        for bot in bots { bot.update(realDt: realDt) }
        pump(realDt)
        server?.update(realDt: realDt)
        if let game = client.game, game.isOver { return .toSummary }
        return nil
    }

    private var lastViewport = SIMD2<Float>(1280, 720)

    func render(viewport: SIMD2<Float>, realDt: Float) -> FrameRenderData {
        lastViewport = viewport
        if let frame = pendingFrame { return frame }
        var hud: [HUDVertex] = []
        HUDSystem.text("CONNECTING", at: SIMD2(viewport.x / 2, viewport.y * 0.5), size: 40,
                       color: Vec4(0.9, 0.85, 0.5, 0.9), align: .center, into: &hud, viewport)
        return menu.render(viewport: viewport, realDt: realDt, hud: hud)
    }
}
```

A screen like chapter 10's others, holding a `Client` instead of a `Game`
— and, on the host, the `Server` too. The order in `update` is the order a
real network would impose: clients send, the wire carries (`pump`), the
server receives. There's no pause in a networked game — Escape leaves.
`client.update` returns the frame, so `render` hands it over; until the
welcome arrives, the menu world says `CONNECTING`. And when the mirror is
told the run is over — `gameOver`, below — it asks for the summary, exactly
as `PlayingScreen` does.

**`NetPlayingScreen.swift`** — after `NetPlayingScreen`:

```swift
/// A client with no human: it flies a scripted weave and holds the trigger,
/// so a host has a remote ship to look at.
final class BotClient {
    let client: Client
    private var time: Float = 0

    init(transport: Transport) {
        client = Client(transport: transport)
    }

    func update(realDt: Float) {
        time += realDt
        var input = InputFrame()
        input.roll = sin(time * 0.7) * 0.6
        input.pitch = sin(time * 0.4) * 0.3 + 0.1
        input.buttons = Int(time) % 3 == 0 ? [.fire] : []
        _ = client.update(realDt: realDt, input: input, viewport: SIMD2(1280, 720))
    }
}
```

A bot is a `Client` whose input is a sine wave. It exists so that the
checkpoint has a remote ship to watch being interpolated, without needing
a second machine.

**`Sources/SpaceFighter/App/Session.swift`**, in `Session` — before
`startReplay`:

```swift
    /// Host and play in one process over a fake network. `latency` is one way,
    /// in seconds; `bots` adds scripted remote players.
    func startLoopback(latency: Float, jitter: Float, loss: Float, bots: Int, ship: ShipDefinition) {
        let net = LoopbackNetwork()
        net.latency = latency
        net.jitter = jitter
        net.loss = loss
        let seats = max(2, 1 + bots)
        let authority = Game(seed: nextSeed, ship: ship, playerCount: seats, spawnSeats: false)
        nextSeed &+= 1
        let server = Server(game: authority, transport: net.endpoint(0), ship: ship)
        let local = Client(transport: net.endpoint(1))
        let bots = (0..<bots).map { BotClient(transport: net.endpoint(PeerID(2 + $0))) }
        game = nil
        screen = NetPlayingScreen(client: local, server: server, bots: bots, menu: menu) { dt in net.advance(dt) }
    }
```

**`Session.swift`**, in `apply` — the summary works for a mirror too:

```diff
         case .toSummary:
             if let game { screen = SummaryScreen(game: game) }
+            else if let net = screen as? NetPlayingScreen, let mirror = net.client.game {
+                screen = SummaryScreen(game: mirror)
+            }
```

**`Sources/SpaceFighter/main.swift`**, in `LaunchOptions`:

```diff
     var ship: ShipDefinition = Ships.all[1]
     var players = 1
+    var loopback: Float?   // one-way latency in seconds; nil means no fake network
+    var loss: Float = 0
+    var bots = 0
```

```diff
             case ("--players", let n?): players = min(max(Int(n) ?? 1, 1), 4); i += 2
+            case ("--loopback", let ms?): loopback = (Float(ms) ?? 0) / 1000; i += 2
+            case ("--loss", let f?): loss = Float(f) ?? 0; i += 2
+            case ("--bots", let n?): bots = min(max(Int(n) ?? 0, 0), 3); i += 2
```

**`main.swift`** — after the `startReplay` line:

```diff
 if let replayLog { session.startReplay(replayLog) }
+if let latency = options.loopback {
+    session.startLoopback(latency: latency, jitter: latency / 4, loss: options.loss, bots: options.bots, ship: options.ship)
+}
```

---

## The tests

**`Tests/SpaceFighterTests/Ch13NetTests.swift`** — new file:

```swift
import Testing
import simd

@testable import SpaceFighter

private let dt = SimulationClock.step
private let vp = SIMD2<Float>(1600, 1000)

/// A server and some clients in one process, joined by a loopback that can be
/// made as bad as a test needs.
private final class Rig {
    let net = LoopbackNetwork()
    let server: Server
    var clients: [Client] = []

    init(latency: Float, jitter: Float, loss: Float, seats: Int = 3, waves: Bool = true) {
        net.latency = latency
        net.jitter = jitter
        net.loss = loss
        let game = Game(seed: 5, ship: Ships.all[1], playerCount: seats, spawnSeats: false)
        if !waves { game.director.phase = .fighting }
        server = Server(game: game, transport: net.endpoint(0), ship: Ships.all[1])
    }

    @discardableResult
    func join() -> Client {
        let client = Client(transport: net.endpoint(PeerID(clients.count + 1)))
        clients.append(client)
        return client
    }

    /// One display frame for everyone: clients first, then the wire, then the server.
    func frame(_ inputs: [InputFrame] = []) {
        for (i, c) in clients.enumerated() {
            _ = c.update(realDt: dt, input: i < inputs.count ? inputs[i] : InputFrame(), viewport: vp)
        }
        net.advance(dt)
        server.update(realDt: dt)
    }

    func run(_ frames: Int, _ inputs: [InputFrame] = []) {
        for _ in 0..<frames { frame(inputs) }
    }
}
```

The rig is a LAN in forty lines: a server on peer 0, clients on 1, 2, 3,
and a `frame` that does what `NetPlayingScreen` does. Every netcode test
below is a rig with different knobs.

**`Ch13NetTests.swift`** — after `Rig`:

```swift
@Test func everyMessageSurvivesTheWire() throws {
    var frame = InputFrame()
    frame.pitch = 0.5
    frame.roll = -1
    frame.buttons = [.fire, .boost]
    let record = EntityRecord(
        netID: 0x1234_5601, kind: .enemy, slot: 255, team: 1, mesh: 1, color: Vec4(1, 0.5, 0.25, 1), scale: 1.8,
        position: Vec3(1, -2, 300), rotation: simd_normalize(Quat(angle: 0.7, axis: Vec3(0, 1, 0))),
        velocity: Vec3(0, 0, -46), angular: .zero, throttle: 0, speed: 0, health: 3, maxHealth: 4, pickupKind: 0)
    let messages: [Message] = [
        .hello(version: 1),
        .welcome(slot: 2, seed: 99, tick: 4000, ship: 1, seats: 4),
        .input(tick: 4003, frame: frame, ack: 17),
        .snapshot(tick: 3999, records: [record, record], last: true),
        .event(seq: 18, event: .died(netID: 7, position: Vec3(1, 2, 3), color: Vec4(1, 1, 1, 1), size: 2)),
        .event(seq: 19, event: .pickedUp(slot: 1, kind: 2)),
        .event(seq: 20, event: .wave(number: 5, breather: true)),
        .event(seq: 21, event: .score(-3)),
        .event(seq: 22, event: .gameOver),
        .ping(tick: 1), .pong(tick: 1),
    ]
    for m in messages {
        let back = try Message(decoding: m.encoded())
        switch (m, back) {
        case (.input(let t1, let f1, let a1), .input(let t2, let f2, let a2)):
            #expect(t1 == t2 && a1 == a2 && f1.buttons == f2.buttons)
            #expect(abs(f1.pitch - f2.pitch) < 0.01 && f1.roll == f2.roll)
        case (.snapshot(let t1, let r1, _), .snapshot(let t2, let r2, _)):
            #expect(t1 == t2 && r1.count == r2.count)
            #expect(simd_length(r1[0].position - r2[0].position) < 1e-4)
            #expect(simd_angle(simd_normalize(r1[0].rotation.inverse * r2[0].rotation)) < 1e-3)
            #expect(r1[0].netID == r2[0].netID && r1[0].kind == r2[0].kind)
        default:
            #expect(m == back)
        }
    }
    #expect(throws: ProtocolError.self) { try Message(decoding: [42, 0]) }
}

@Test func theLoopbackIsLateAndLossy() {
    let net = LoopbackNetwork()
    net.latency = 0.1
    net.loss = 0.5
    let a = net.endpoint(0)
    let b = net.endpoint(1)
    for i in 0..<200 { a.send([UInt8(i % 256)], to: 1) }
    net.advance(0.05)
    #expect(b.receive().isEmpty, "nothing arrives before the latency")
    net.advance(0.06)
    let arrived = b.receive().count
    #expect(arrived > 50 && arrived < 150, "about half: \(arrived)")
}
```

Quantised fields can't be compared exactly, so the input and snapshot
cases compare within the quantisation step; everything else round-trips
bit for bit.

**`Ch13NetTests.swift`** — after `theLoopbackIsLateAndLossy`:

```swift
@Test func hostAndTwoClientsAgreeOnTheWorld() {
    let rig = Rig(latency: 0.08, jitter: 0.02, loss: 0.05)
    rig.join()
    rig.join()
    var steer = InputFrame()
    steer.roll = 0.3
    rig.run(600, [InputFrame(), steer])  // ten seconds: wave one comes and goes

    let server = rig.server.game
    for (i, client) in rig.clients.enumerated() {
        guard let mirror = client.game, let slot = client.slot else {
            Issue.record("client \(i) never got a welcome")
            continue
        }
        // Own ship: predicted a few ticks ahead of the server, along its velocity.
        let own = mirror.player(inSlot: slot)!
        let truth = server.player(inSlot: slot)!
        let ahead = Float(Int(mirror.clock.tick) - Int(server.clock.tick)) * dt
        let expected = server.world.get(Transform.self, truth)!.position
            + server.world.get(Velocity.self, truth)!.linear * ahead
        let error = simd_length(mirror.world.get(Transform.self, own)!.position - expected)
        #expect(error < 2, "client \(i) own ship off by \(error)")

        // Everyone else: known, and drawn a little behind.
        let truthCount = Replication.snapshot(of: server.world).count
        #expect(abs(truthCount - 1 - client.ghostCount) <= 4, "client \(i) knows \(client.ghostCount) of \(truthCount - 1)")
        let otherSlot = slot == 0 ? 1 : 0
        if let otherTruth = server.player(inSlot: otherSlot), let otherGhost = mirror.player(inSlot: otherSlot) {
            let gap = simd_length(
                server.world.get(Transform.self, otherTruth)!.position
                    - mirror.world.get(Transform.self, otherGhost)!.position)
            #expect(gap < 20, "client \(i) sees the other ship \(gap) behind")
        } else {
            Issue.record("client \(i) has no ghost for seat \(otherSlot)")
        }
    }
    #expect(rig.net.dropped > 0, "the test meant to lose packets")
}
```

This is chapter 12's promise, tested. Eighty milliseconds each way, twenty
of jitter, one packet in twenty lost, ten seconds, two clients: each
client's own ship is where the server will say it is (allowing for running
a few ticks ahead), each knows about everything the server has give or
take a few spawns in flight, and each sees the other a little behind.

**`Ch13NetTests.swift`** — after `hostAndTwoClientsAgreeOnTheWorld`:

```swift
@Test func eventsArriveOnceEvenWhenPacketsDont() {
    let rig = Rig(latency: 0.05, jitter: 0, loss: 0.3, waves: false)
    let client = rig.join()
    rig.run(90)
    let world = rig.server.game.world
    let enemy = spawnEnemy(in: world, kind: .drifter, at: Vec3(0, 0, -80),
                           rotation: Math.lookRotation(forward: Vec3(0, 0, 1)), wave: 1)
    world.store(Velocity.self).mutate(enemy) { $0.linear = .zero }
    rig.server.game.director.phase = .fighting  // this one enemy is the whole wave
    rig.run(60)
    world.store(Health.self).mutate(enemy) { $0.current = 0 }

    var peakDebris = 0
    var bursts = 0
    var wasClear = true
    for _ in 0..<180 {
        rig.frame()
        let debris = client.game!.world.store(Debris.self).count
        peakDebris = max(peakDebris, debris)
        if debris > 0 && wasClear { bursts += 1 }
        wasClear = debris == 0
    }
    #expect(peakDebris == 13, "twelve fragments and a flash, all at once: \(peakDebris)")
    #expect(bursts == 1, "the resent event exploded the enemy once, not \(bursts) times")
    #expect(client.game!.world.store(Enemy.self).count == 0, "and the ghost is gone")
}

@Test func aLateJoinerGetsTheWholeWorld() {
    let rig = Rig(latency: 0.04, jitter: 0.01, loss: 0.02)
    rig.join()
    rig.run(300)
    let late = rig.join()
    rig.run(90)
    guard let mirror = late.game else {
        Issue.record("late joiner never welcomed")
        return
    }
    let truth = Replication.snapshot(of: rig.server.game.world).count
    let seen = Replication.snapshot(of: mirror.world).count
    #expect(abs(truth - seen) <= 4, "server has \(truth), late joiner sees \(seen)")
    #expect(mirror.run.wave == rig.server.game.run.wave)
}
```

Thirty percent loss and the explosion still happens, and happens *once* —
the reliability layer resends until acked, and the client's sequence check
ignores the copies. The late-join test is the reason the server queues the
wave and score for a newcomer: without those two lines, `mirror.run.wave`
is zero.

**`Ch13NetTests.swift`** — after `aLateJoinerGetsTheWholeWorld`:

```swift
@Test func aHitOnTheServerFlashesTheClient() {
    let rig = Rig(latency: 0.05, jitter: 0, loss: 0, seats: 2, waves: false)
    let client = rig.join()
    rig.run(90)
    let world = rig.server.game.world
    guard let mirror = client.game, let ship = rig.server.game.player(inSlot: 0),
        let t = world.get(Transform.self, ship)
    else {
        Issue.record("the client never got a ship on the server")
        return
    }
    // An enemy bolt dead ahead, flying at the ship.
    var bt = Transform()
    bt.position = t.position + t.forward * 8
    let bolt = spawnProjectile(in: world, at: bt, velocity: -t.forward * 100, owner: ship, damage: 8)
    world.store(Team.self).set(bolt, .enemies)
    world.store(Collider.self).mutate(bolt) { $0.mask = .player }

    var sawFlash = false
    for _ in 0..<90 {
        rig.frame()
        if mirror.stats[0].hitFlash > 0 { sawFlash = true }
    }
    #expect(world.get(Health.self, ship)!.current < 100, "the server registered the hit")
    #expect(sawFlash, "and the client's screen flashed")
    #expect(mirror.world.get(Health.self, mirror.player(inSlot: 0)!)!.current < 100, "and its hull agrees")
}

@Test func aClientSeesItsOwnShipDestroyedAndReplaced() {
    let rig = Rig(latency: 0.05, jitter: 0, loss: 0, seats: 2, waves: false)
    rig.join()  // seat 0 stays alive: the teammate to respawn beside
    let client = rig.join()
    rig.run(90)
    guard let mirror = client.game, let slot = client.slot, let victim = rig.server.game.player(inSlot: slot)
    else {
        Issue.record("the second client never got a ship")
        return
    }
    rig.server.game.world.store(Health.self).mutate(victim) { $0.current = 0 }
    var wasGone = false
    var sawDebris = false
    for _ in 0..<Int(Game.respawnDelay / dt) + 60 {
        rig.frame()
        if mirror.player(inSlot: slot) == nil { wasGone = true }
        if mirror.world.store(Debris.self).count > 0 { sawDebris = true }
    }
    #expect(wasGone, "the mirror lost its ship when the server did")
    #expect(sawDebris, "and blew it up where it was")
    #expect(mirror.player(inSlot: slot) != nil, "and has the fresh one")
}
```

Two more, for the two things a client is *told* rather than shown. A bolt
spawned on the server and aimed at the client's own ship: the hull drops
there, and a snapshot later the mirror's hull agrees and its screen has
flashed. And the whole death sequence from the seat that dies: the ship
vanishes from the mirror, its debris appears where it was, and three seconds
later there is a fresh ship in the seat — every part of it from a snapshot or
an event, none of it simulated locally.

---

## Checkpoint

```console
$ swift test
✔ Test run with 76 tests in 0 suites passed
```

**Seventy-six tests.** Then be your own server:

```console
$ swift run SpaceFighter --loopback 80 --loss 0.05 --bots 1
```

1. **`CONNECTING`** for one round trip, then the game — but the title bar
   says `host`, an `RTT` around 160 ms, and a `Corrections` count.
2. **A second ship**, weaving and firing on its own: the bot, drawn through
   the interpolation buffer. It's smooth, and it's a hundred milliseconds
   behind where the server has it, which you can't tell.
3. **Your own ship feels local.** It is — predicted. Watch `Corrections`:
   it climbs slowly, one every few seconds, each time a lost packet made
   the server's word differ from your guess. You won't see them.
4. **Now `--loss 0.3`.** Corrections climb fast and you *can* see them: a
   twitch when a ram happened on the server before you knew about it, a
   snap when three inputs in a row were lost. That's what the challenge is
   about.
5. **`--loopback 250`.** A quarter-second each way. Your ship is still
   responsive; the bot's fire lands a half-second after you see it fire;
   your own bolts appear a half-second after you press. That's the
   projectile-prediction gap chapter 12 named.
6. **Fly into the bot.** Your ship blows apart on the server's word — a
   snapshot later on yours — the camera holds where you were, and
   `DESTROYED - RESPAWNING` sits over the wreck for three seconds until a
   fresh ship appears beside the bot. Every part of that came down the wire.

**If it stays on `CONNECTING`**, the server isn't being stepped — check
`server?.update` in `NetPlayingScreen.update`. **If your ship stutters
every third frame**, the reconciliation is being applied but the replay
isn't: `history` is empty because inputs are recorded *after* being
sent — check the closure order in `Client.update`. **If ghosts teleport
every 50 ms instead of gliding**, `interpolateGhosts` isn't being called,
or `snapshots.count` never reaches two. **If `eventsArriveOnceEvenWhenPacketsDont`
reports two bursts**, the `seq >= nextEventSeq` guard is missing.

---

## Challenge

Smooth the corrections. When `reconcile` moves the ship by more than a few
centimetres, don't show the jump: record the offset (`before − after`) as a
*presentation* value, add it to the ship's position when the camera and
scene read it, and decay it toward zero over 100 ms with chapter 02's
`1 − exp(−k·dt)`. The ship's *simulated* position is corrected instantly
— it has to be, or the next replay is wrong — and only the picture eases.
Three things to get right: where the offset lives (it's presentation, so
not on the `Transform` — the `CameraRig` is a candidate, or a new
component); making `SceneSystem` and `CameraSystem` apply it without
teaching them about netcode; and the ceiling — a correction of fifty units
should snap, not glide, because gliding across the map is worse than a
teleport.

---

**Next:** the same client and server, with a real socket between them. →
[Chapter 14: Netcode over the network](14-netcode-over-the-network.md)

---

*Back to the [guide map](../README.md) · references in [`resources.md`](../resources.md)*
