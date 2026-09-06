# 14 · Netcode over the network 🛠️

> **You'll leave this chapter with:** the chapter 13 server and client
> talking over real UDP sockets through Network.framework; hosts that
> advertise themselves on the LAN with Bonjour and a lobby that lists them;
> two game modes — co-op waves and a free-for-all deathmatch with a kill
> limit — on the same netcode; a scoreboard on `Tab`; and a kill feed.
>
> **Files created:** `Sources/SpaceFighter/Net/UDPTransport.swift`,
> `App/Screens/LobbyScreens.swift`, `Tests/SpaceFighterTests/Ch14ModeTests.swift`,
> `Tests/SpaceFighterTests/Ch14NetworkTests.swift`
> **Files changed:** `Game.swift`, `ECS/World.swift`, `Systems/HUDSystem.swift`,
> `Components/Loadout.swift`, `Net/Protocol.swift`, `Net/Transport.swift`,
> `Net/LoopbackNetwork.swift`, `Net/Server.swift`, `Net/Client.swift` (two
> fixes), `App/Session.swift`, `App/Screens/TitleScreen.swift` (rewritten),
> `main.swift`, `Tests/SpaceFighterTests/Ch13NetTests.swift`

Chapter 13 built a server and a client and tested them against a fake
network. This chapter changes almost nothing about either. It gives them a
real socket to talk through — a `Transport` implemented with
Network.framework instead of an array — and then, since two machines can
finally meet, it gives them something to meet *for*: a second game mode, a
lobby, a scoreboard.

The order of the two chapters is the point. Everything hard about netcode
was done and tested in one process. What's left is plumbing and rules.

---

## Two modes, a handful of rules

A game mode is not a different game. It's the same simulation with a few
switches thrown: whether the director runs, who's on whose team, where the
dead come back, and when it ends.

**`Sources/SpaceFighter/Game.swift`** — after `GameRole`:

```swift
/// What kind of game this is. The netcode doesn't care; a handful of rules do.
enum GameMode: UInt8, Equatable {
    /// Waves of enemies, one shared score, everyone on one team.
    case coop
    /// No enemies, every seat its own team, first to the kill limit wins.
    case deathmatch

    static let killLimit = 10
}

/// One seat's tally. Shown on the scoreboard in both modes.
struct SeatStats: Equatable {
    var kills = 0
    var deaths = 0
}
```

**`Game.swift`**, in `Game` — after `role`:

```diff
     let role: GameRole
+    let mode: GameMode
+    /// Kills and deaths per seat, both modes.
+    var seatStats: [SeatStats]
+    /// Recent kills as text, newest last, with seconds left to show each.
+    var killFeed: [(text: String, remaining: Float)] = []
+    /// In deathmatch, the seat that reached the limit; nil until then.
+    private(set) var winner: Int?
```

**`Game.swift`**, in `init`:

```diff
     init(
         seed: UInt64 = 1, ship: ShipDefinition = Ships.all[1], playerCount: Int = 1,
-        role: GameRole = .authority, spawnSeats: Bool = true
+        role: GameRole = .authority, spawnSeats: Bool = true, mode: GameMode = .coop
     ) {
         world = World(seed: seed)
         self.ship = ship
         self.playerCount = playerCount
         self.role = role
+        self.mode = mode
+        seatStats = Array(repeating: SeatStats(), count: playerCount)
+        if mode == .deathmatch { director.phase = .fighting }  // and it stays there: no waves
         stats = (0..<playerCount).map { _ in GameStats() }
```

Deathmatch parks the director in `fighting` and never calls it — the next
diff — so no wave ever starts. That's the entire "no enemies" rule.

**`Game.swift`** — replace `joinSeat`, and add `spawnPoint` and `mirrorSeat`
after it:

```swift
    /// Put someone in a seat: spawn their ship. Idempotent.
    @discardableResult
    func joinSeat(_ slot: Int, ship: ShipDefinition) -> Entity {
        seatJoined[slot] = true
        if let existing = player(inSlot: slot) { return existing }
        let e: Entity
        if mode == .deathmatch {
            let point = Self.spawnPoint(slot, of: playerCount)
            e = spawnPlayer(in: world, ship: ship, slot: UInt8(slot), at: point)
            world.store(Transform.self).mutate(e) { $0.rotation = Math.lookRotation(forward: -point) }
        } else {
            let anchor = players.first.flatMap { world.get(Transform.self, $0) }
            let position = anchor.map { $0.position + $0.right * 8 } ?? Vec3(Float(slot) * 8, 0, 0)
            e = spawnPlayer(in: world, ship: ship, slot: UInt8(slot), at: position)
        }
        if mode == .deathmatch {
            world.add(Team(id: 10 + UInt8(slot)), to: e)  // your own side
        }
        return e
    }

    /// Deathmatch spawn points: a ring around the origin, one per seat,
    /// evenly spaced, facing the middle.
    static func spawnPoint(_ slot: Int, of seats: Int) -> Vec3 {
        let angle = Float(slot) * (.pi * 2 / Float(max(seats, 1)))
        return Vec3(cos(angle), 0, sin(angle)) * 120
    }

    /// A mirror is told which seats are occupied; it never joins them itself.
    func mirrorSeat(_ slot: Int, joined: Bool) {
        seatJoined[slot] = joined
    }
```

Two rules in one function. In deathmatch a seat spawns at its own point on
a ring — evenly spaced by seat count, so four seats are ninety degrees
apart — facing the middle, and gets a `Team` of its own — chapter 06's
`Team` was a `UInt8` rather than an enum for exactly this moment. With
every player on a different team, chapter 06's damage system does the rest
unchanged: bolts hurt other teams, and now every other player is one.
In co-op nothing changes.

**`Game.swift`**, in `step` — the director runs in co-op only, and deaths
are tallied:

```diff
-        if let lead = players.first, let playerT = world.get(Transform.self, lead) {
+        if mode == .coop, let lead = players.first, let playerT = world.get(Transform.self, lead) {
             director.update(world, playerT: playerT, dt: dt)
         }
+        tally(world.events)
```

```diff
         if overIn == nil { run.seconds += dt }
         run.wave = director.wave
         respawnTheDead(dt: dt)
-        endRun(when: players.isEmpty && seatJoined.contains(true), dt: dt)
+        switch mode {
+        case .coop: endRun(when: players.isEmpty && seatJoined.contains(true), dt: dt)
+        case .deathmatch: endRun(when: winner != nil, dt: dt)
+        }
     }
```

**`Game.swift`**, in `Game` — after `step`:

```diff
+    /// Kills and deaths by seat, from this step's deaths. A kill credited to a
+    /// seat is a kill of another *player*; enemies don't count here.
+    private func tally(_ events: [GameEvent]) {
+        for case .died(let victim, let killer) in events {
+            guard let victimSlot = world.get(PlayerSlot.self, victim).map({ Int($0.index) }) else { continue }
+            seatStats[victimSlot].deaths += 1
+            if let killer, let killerSlot = world.get(PlayerSlot.self, killer).map({ Int($0.index) }),
+                killerSlot != victimSlot
+            {
+                seatStats[killerSlot].kills += 1
+                world.events.append(.kill(killerSlot: killerSlot, victimSlot: victimSlot))
+                if winner == nil && seatStats[killerSlot].kills >= GameMode.killLimit { winner = killerSlot }
+            }
+        }
+    }
```

Chapter 06's `died` event carries a killer, which chapter 06 stored on
`Health.lastHitBy` and nothing has read until now. A player's death is a
death for their seat; if the killer was a player, it's a kill for theirs,
and a new event says so. This is the second thing in the guide that
`Owner` and `lastHitBy` exist for.

**`Sources/SpaceFighter/ECS/World.swift`**, in `GameEvent`:

```diff
     case exploded(Entity, at: Vec3, color: Vec4, size: Float)
+    /// One player killed another, by seat.
+    case kill(killerSlot: Int, victimSlot: Int)
 }
```

**`Game.swift`** — replace `respawnTheDead`:

```swift
    /// Co-op rule: a seat whose ship is gone gets a new one beside a living
    /// teammate after a delay; with nobody left alive, nobody comes back.
    /// Deathmatch rule: back at your spawn point after the delay, always.
    private func respawnTheDead(dt: Float) {
        let living = players
        for slot in 0..<playerCount where seatJoined[slot] {
            if player(inSlot: slot) != nil {
                respawnTimers[slot] = nil
                continue
            }
            if respawnTimers[slot] == nil { respawnTimers[slot] = Self.respawnDelay }
            respawnTimers[slot]! -= dt
            guard respawnTimers[slot]! <= 0 else { continue }
            switch mode {
            case .coop:
                guard let anchor = living.first, let anchorT = world.get(Transform.self, anchor) else { continue }
                let position = anchorT.position + anchorT.right * 8 - anchorT.forward * 6
                let fresh = spawnPlayer(in: world, ship: ship, slot: UInt8(slot), at: position)
                world.store(Transform.self).mutate(fresh) { $0.rotation = anchorT.rotation }
            case .deathmatch:
                seatJoined[slot] = false  // so joinSeat spawns fresh
                joinSeat(slot, ship: ship)
            }
            respawnTimers[slot] = nil
        }
    }
```

Chapter 11's rule, plus deathmatch's: three seconds, then back at your spawn
point, teammates or no teammates. It reuses `joinSeat` for the spawn so
there's one place a deathmatch ship is built.

**`Game.swift`**, in `frame` — the kill feed is presentation, aged by real
time and fed by the event:

```diff
             stats.toastTime = max(0, stats.toastTime - realDt)
         }
+        for i in killFeed.indices { killFeed[i].remaining -= realDt }
+        killFeed.removeAll { $0.remaining <= 0 }
         for event in effects {
             switch event {
+            case .kill(let killer, let victim):
+                addKill(killer: killer, victim: victim)
             case .damaged(let e, _, _):
```

**`Game.swift`**, in `view(forSlot:)` — the HUD gets the feed and the board:

```diff
             reticle: own.map { reticle(for: $0, viewProjection: viewProjection, alpha: alpha) } ?? Reticle(),
-            flight: own.flatMap { flightDebug(for: $0, slot: slot) }))
+            flight: own.flatMap { flightDebug(for: $0, slot: slot) },
+            killFeed: killFeed.map(\.text),
+            scoreboard: scoreboard(you: slot),
+            showScoreboard: lastInputs[slot].buttons.contains(.scoreboard) || isOver))
```

**`Game.swift`**, in `Game` — before `splitScreen`:

```diff
+    /// One row per occupied seat.
+    func scoreboard(you: Int) -> [ScoreRow] {
+        (0..<playerCount).filter { seatJoined[$0] }.map { slot in
+            ScoreRow(
+                name: "P\(slot + 1)", kills: seatStats[slot].kills, deaths: seatStats[slot].deaths,
+                alive: player(inSlot: slot) != nil, isYou: slot == you)
+        }
+    }
+
+    /// A line for the feed: "P1 DESTROYED P2".
+    func addKill(killer: Int, victim: Int) {
+        killFeed.append(("P\(killer + 1) DESTROYED P\(victim + 1)", 4))
+        if killFeed.count > 4 { killFeed.removeFirst() }
+    }
+
     /// One player gets the whole drawable; two stack top and bottom; more tile.
```

`Tab` is chapter 03's `.scoreboard` bit, unused until now: *held*, not
edge-detected, so the board shows while the key is down. It also shows
when the game is over, which is the end-of-match screen chapter 12
promised — the same table the reference MOBA shows after a match, with the
columns this game has.

**`Sources/SpaceFighter/Systems/HUDSystem.swift`**, in `HUDInput` — after
`flight`, and a row type after the struct:

```diff
     var flight: FlightDebug?
+    var killFeed: [String] = []
+    /// Per-seat rows for the scoreboard, shown while `showScoreboard`.
+    var scoreboard: [ScoreRow] = []
+    var showScoreboard = false
+}
+
+/// One line of the scoreboard.
+struct ScoreRow {
+    var name: String
+    var kills: Int
+    var deaths: Int
+    var alive: Bool
+    var isYou: Bool
 }
```

**`HUDSystem.swift`**, in `build` — before the flight debug line, and a new
function after `build`:

```diff
+        // Top right, under the score: who destroyed whom, newest at the bottom.
+        for (i, line) in hud.killFeed.enumerated() {
+            text(line, at: SIMD2(vp.x - 24, 80 + Float(i) * 24), size: 18, color: Vec4(1, 0.6, 0.5, 0.9),
+                 align: .right, into: &v, vp)
+        }
+
+        if hud.showScoreboard { appendScoreboard(&v, hud.scoreboard, vp) }
         if let flight = hud.flight { appendFlightDebug(&v, flight, aspect: aspect, vp) }
         return v
     }
+
+    /// A dark panel in the middle with one row per seat.
+    private static func appendScoreboard(_ v: inout [HUDVertex], _ rows: [ScoreRow], _ vp: SIMD2<Float>) {
+        appendRect(&v, cx: 0, cy: 0.1, hw: 0.36, hh: 0.06 + 0.05 * Float(rows.count), color: Vec4(0, 0, 0.02, 0.7))
+        let top = vp.y * 0.36
+        let white = Vec4(0.92, 0.95, 1.0, 1)
+        let dim = Vec4(0.6, 0.6, 0.7, 0.9)
+        text("SEAT", at: SIMD2(vp.x * 0.34, top), size: 20, color: dim, into: &v, vp)
+        text("KILLS", at: SIMD2(vp.x * 0.56, top), size: 20, color: dim, align: .right, into: &v, vp)
+        text("DEATHS", at: SIMD2(vp.x * 0.66, top), size: 20, color: dim, align: .right, into: &v, vp)
+        for (i, row) in rows.enumerated() {
+            let y = top + 34 + Float(i) * 30
+            let color = row.isYou ? Vec4(0.9, 0.85, 0.5, 1) : (row.alive ? white : dim)
+            text(row.name, at: SIMD2(vp.x * 0.34, y), size: 22, color: color, into: &v, vp)
+            text("\(row.kills)", at: SIMD2(vp.x * 0.56, y), size: 22, color: color, align: .right, into: &v, vp)
+            text("\(row.deaths)", at: SIMD2(vp.x * 0.66, y), size: 22, color: color, align: .right, into: &v, vp)
+        }
+    }
```

Chapter 09's text and chapter 10's two-column trick, one more time. Your
own row is gold; dead seats are dim.

---

## The wire, for real

Network.framework is Apple's modern socket API, and its shape fits
`Transport` almost exactly: an `NWListener` on the host accepts
"connections" — for UDP, that means it creates an `NWConnection` for each
remote address it hears from — and a client is one `NWConnection` to the
host. Everything arrives on a background queue via callbacks, and the game
reads on the main thread once a frame, so a lock sits between them.

**`Sources/SpaceFighter/Net/UDPTransport.swift`** — new file:

```swift
import Foundation
import Network

/// The host's end of a real network: a UDP listener that hands each remote
/// address a peer id, and a mailbox the game drains once a frame. Network
/// callbacks arrive on their own queue; the lock is the seam.
final class UDPHostTransport: Transport, @unchecked Sendable {
    static let serviceType = "_spacefighter._udp"

    let localID: PeerID = 0
    private let listener: NWListener
    private let queue = DispatchQueue(label: "spacefighter.net.host")
    private let lock = NSLock()
    private var connections: [PeerID: NWConnection] = [:]
    private var nextPeer: PeerID = 1
    private var inbox: [Datagram] = []
    private(set) var port: UInt16?
    /// True once the system refused the port: someone else holds it.
    private(set) var failed = false

    /// Listen on `port` (0 for any) and, if `advertise` is set, tell the LAN.
    init(port: UInt16, advertise name: String?) throws {
        let nwPort = port == 0 ? NWEndpoint.Port.any : NWEndpoint.Port(rawValue: port)!
        listener = try NWListener(using: .udp, on: nwPort)
        if let name {
            listener.service = NWListener.Service(name: name, type: Self.serviceType)
        }
        listener.newConnectionHandler = { [weak self] connection in self?.accept(connection) }
        listener.stateUpdateHandler = { [weak self] state in
            guard let self else { return }
            self.lock.lock()
            defer { self.lock.unlock() }
            switch state {
            case .ready: self.port = self.listener.port?.rawValue
            case .failed: self.failed = true
            default: break
            }
        }
        listener.start(queue: queue)
    }
}
```

`@unchecked Sendable` is a promise to Swift 6's concurrency checker: this
class is passed between threads and *we* guarantee that's safe. The
guarantee is the `NSLock` around every shared field. Without the annotation
the compiler refuses the callbacks; with it and without the lock you'd have
a data race the compiler can't see, so the two go together.

`listener.service` is the Bonjour advertisement: one line, and every Mac
on the LAN browsing for `_spacefighter._udp` will see this host by name.
`port` becomes known asynchronously — when the listener reports `.ready` —
which the test below waits for. `failed` is the other thing the listener can
say. `NWListener` doesn't refuse a busy port when it's created; it reports
`.failed` a moment later, from its queue. So a port another copy of the game
already holds shows up as a flag, and the lobby reads it instead of saying
`STARTING…` forever.

**`UDPTransport.swift`**, in `UDPHostTransport` — after `init`:

```diff
+    private func accept(_ connection: NWConnection) {
+        lock.lock()
+        let id = nextPeer
+        nextPeer += 1
+        connections[id] = connection
+        lock.unlock()
+        connection.start(queue: queue)
+        receiveLoop(connection, from: id)
+    }
+
+    private func receiveLoop(_ connection: NWConnection, from id: PeerID) {
+        connection.receiveMessage { [weak self] data, _, _, error in
+            guard let self else { return }
+            if let data, !data.isEmpty {
+                self.lock.lock()
+                self.inbox.append(Datagram(from: id, bytes: [UInt8](data)))
+                self.lock.unlock()
+            }
+            if error == nil { self.receiveLoop(connection, from: id) }
+        }
+    }
+
+    func send(_ bytes: [UInt8], to peer: PeerID) {
+        lock.lock()
+        let connection = connections[peer]
+        lock.unlock()
+        connection?.send(content: Data(bytes), completion: .contentProcessed { _ in })
+    }
+
+    func receive() -> [Datagram] {
+        lock.lock()
+        defer { lock.unlock() }
+        let out = inbox
+        inbox.removeAll(keepingCapacity: true)
+        return out
+    }
+
+    var peerCount: Int {
+        lock.lock()
+        defer { lock.unlock() }
+        return connections.count
+    }
+
+    func stop() {
+        listener.cancel()
+        lock.lock()
+        for c in connections.values { c.cancel() }
+        connections.removeAll()
+        lock.unlock()
+    }
 }
```

A new remote address becomes the next peer id — the same numbering the
loopback used — and a receive loop that re-arms itself after every datagram.
`receiveMessage` is the UDP-flavoured receive: one whole datagram per
callback, which is what the protocol's "one message per datagram" assumes.

**`UDPTransport.swift`** — after `UDPHostTransport`:

```swift
/// A client's end: one UDP connection to the host, who is peer 0 by definition.
final class UDPClientTransport: Transport, @unchecked Sendable {
    let localID: PeerID = 1
    private let connection: NWConnection
    private let queue = DispatchQueue(label: "spacefighter.net.client")
    private let lock = NSLock()
    private var inbox: [Datagram] = []

    init(endpoint: NWEndpoint) {
        connection = NWConnection(to: endpoint, using: .udp)
        connection.start(queue: queue)
        receiveLoop()
    }

    convenience init(host: String, port: UInt16) {
        self.init(endpoint: .hostPort(host: NWEndpoint.Host(host), port: NWEndpoint.Port(rawValue: port)!))
    }

    private func receiveLoop() {
        connection.receiveMessage { [weak self] data, _, _, error in
            guard let self else { return }
            if let data, !data.isEmpty {
                self.lock.lock()
                self.inbox.append(Datagram(from: 0, bytes: [UInt8](data)))
                self.lock.unlock()
            }
            if error == nil { self.receiveLoop() }
        }
    }

    func send(_ bytes: [UInt8], to peer: PeerID) {
        connection.send(content: Data(bytes), completion: .contentProcessed { _ in })
    }

    func receive() -> [Datagram] {
        lock.lock()
        defer { lock.unlock() }
        let out = inbox
        inbox.removeAll(keepingCapacity: true)
        return out
    }

    func stop() {
        connection.cancel()
    }
}
```

The client is simpler: one connection, everything that arrives is from peer
0, everything sent goes there. An `NWEndpoint` can be a host and port typed
on the command line, or a Bonjour service the browser found — the same
initialiser handles both, and Network.framework resolves the name.

**`UDPTransport.swift`** — after `UDPClientTransport`:

```swift
/// Finds hosts on the local network by the service they advertise.
final class LANBrowser: @unchecked Sendable {
    private let browser: NWBrowser
    private let lock = NSLock()
    private var found: [NWBrowser.Result] = []

    init() {
        browser = NWBrowser(for: .bonjour(type: UDPHostTransport.serviceType, domain: nil), using: .udp)
        browser.browseResultsChangedHandler = { [weak self] results, _ in
            guard let self else { return }
            self.lock.lock()
            self.found = Array(results).sorted { self.name(of: $0) < self.name(of: $1) }
            self.lock.unlock()
        }
        browser.start(queue: DispatchQueue(label: "spacefighter.net.browse"))
    }

    /// Hosts seen so far, as (name, endpoint).
    var hosts: [(name: String, endpoint: NWEndpoint)] {
        lock.lock()
        defer { lock.unlock() }
        return found.map { (name(of: $0), $0.endpoint) }
    }

    private func name(of result: NWBrowser.Result) -> String {
        if case .service(let name, _, _, _) = result.endpoint { return name }
        return "\(result.endpoint)"
    }

    func stop() {
        browser.cancel()
    }
}
```

The other half of Bonjour: an `NWBrowser` for the same service type, whose
results are the hosts, with their names and endpoints. Connecting to one is
`UDPClientTransport(endpoint:)`.

A note about permissions. Since macOS 15, an app's first attempt to talk
to the local network — browse, advertise, or connect to a LAN address —
prompts the user with a system dialog. A `swift run` binary is an unsigned
command-line tool and the dialog still appears, once. If nothing is ever
found in the lobby, check System Settings → Privacy & Security → Local
Network.

---

## What the protocol learns

Four additions to chapter 13's vocabulary: the mode rides on the
`Welcome`, two events carry kills and seat tallies, and a third carries
what's bolted onto a seat's ship.

**`Sources/SpaceFighter/Net/Protocol.swift`**, in `NetEvent`:

```diff
     case score(Int32)
     case gameOver
+    case kill(killerSlot: UInt8, victimSlot: UInt8)
+    case seatStats(slot: UInt8, kills: UInt16, deaths: UInt16, joined: Bool)
+    case loadout(slot: UInt8, fireInterval: Float, bolts: UInt8, damage: UInt8, missiles: UInt8, shield: UInt8)
 }
```

**`Protocol.swift`**, in `Message`:

```diff
-    case welcome(slot: UInt8, seed: UInt64, tick: UInt32, ship: UInt8, seats: UInt8)
+    case welcome(slot: UInt8, seed: UInt64, tick: UInt32, ship: UInt8, seats: UInt8, mode: UInt8)
```

**`Protocol.swift`**, in `encoded` and `init(decoding:)`:

```diff
-        case .welcome(let slot, let seed, let tick, let ship, let seats):
-            w.write(UInt8(2)); w.write(slot); w.write(seed); w.write(tick); w.write(ship); w.write(seats)
+        case .welcome(let slot, let seed, let tick, let ship, let seats, let mode):
+            w.write(UInt8(2)); w.write(slot); w.write(seed); w.write(tick); w.write(ship); w.write(seats); w.write(mode)
```

```diff
                 self = .welcome(
                     slot: try r.readUInt8(), seed: try r.readUInt64(), tick: try r.readUInt32(),
-                    ship: try r.readUInt8(), seats: try r.readUInt8())
+                    ship: try r.readUInt8(), seats: try r.readUInt8(), mode: try r.readUInt8())
```

**`Protocol.swift`**, in `ByteWriter.write(_ e: NetEvent)` and
`ByteReader.readEvent`:

```diff
         case .gameOver:
             write(UInt8(5))
+        case .kill(let killer, let victim):
+            write(UInt8(6)); write(killer); write(victim)
+        case .seatStats(let slot, let kills, let deaths, let joined):
+            write(UInt8(7)); write(slot); write(kills); write(deaths); write(joined ? UInt8(1) : 0)
+        case .loadout(let slot, let fireInterval, let bolts, let damage, let missiles, let shield):
+            write(UInt8(8)); write(slot); write(fireInterval); write(bolts); write(damage); write(missiles); write(shield)
         }
```

```diff
         case 5: return .gameOver
+        case 6: return .kill(killerSlot: try readUInt8(), victimSlot: try readUInt8())
+        case 7:
+            return .seatStats(
+                slot: try readUInt8(), kills: try readUInt16(), deaths: try readUInt16(),
+                joined: try readUInt8() == 1)
+        case 8:
+            return .loadout(
+                slot: try readUInt8(), fireInterval: try readFloat(), bolts: try readUInt8(),
+                damage: try readUInt8(), missiles: try readUInt8(), shield: try readUInt8())
         default: throw ByteReaderError.truncated
```

**`Sources/SpaceFighter/Components/Loadout.swift`** — the server has to be
able to tell that a loadout changed:

```diff
-struct Loadout {
+struct Loadout: Equatable {
```

**`Tests/SpaceFighterTests/Ch13NetTests.swift`**, in
`everyMessageSurvivesTheWire`:

```diff
-        .welcome(slot: 2, seed: 99, tick: 4000, ship: 1, seats: 4),
+        .welcome(slot: 2, seed: 99, tick: 4000, ship: 1, seats: 4, mode: 1),
```

```diff
         .event(seq: 22, event: .gameOver),
+        .event(seq: 23, event: .kill(killerSlot: 0, victimSlot: 1)),
+        .event(seq: 24, event: .seatStats(slot: 1, kills: 3, deaths: 4, joined: true)),
+        .event(seq: 25, event: .loadout(slot: 0, fireInterval: 0.1, bolts: 3, damage: 2, missiles: 4, shield: 1)),
         .ping(tick: 1), .pong(tick: 1),
```

**`Sources/SpaceFighter/Net/Server.swift`**, in `Server` — the lobby state
and the change detection for tallies:

```diff
     private var lastScore = 0
+    private var lastSeatStats: [SeatStats] = []
+    private var lastJoined: [Bool] = []
+    private var lastLoadouts: [Loadout?]
     private var announcedOver = false
+    /// While true the world is served but not stepped: the lobby.
+    var paused = false
+    /// Who is connected, by seat.
+    var seatsTaken: [Int] { peers.values.map(\.slot).sorted() }
```

**`Server.swift`**, in `init`:

```diff
         self.ship = ship
+        lastLoadouts = Array(repeating: nil, count: game.playerCount)
     }
```

**`Server.swift`**, in `update`:

```diff
-        game.advance(realDt: realDt) { tick in self.inputs(forTick: tick) }
+        if !paused {
+            game.advance(realDt: realDt) { tick in self.inputs(forTick: tick) }
+        }
```

A paused server still receives, still welcomes, still snapshots — the
lobby *is* the game world, unmoving, with players arriving in it — but
doesn't step. Late joiners after the host presses Enter arrive into a
moving world, which chapter 13 already handles.

**`Server.swift`**, in `handle` — the mode goes in the welcome:

```diff
                     slot: UInt8(slot), seed: 0, tick: game.clock.tick, ship: shipIndex,
-                    seats: UInt8(game.playerCount)
+                    seats: UInt8(game.playerCount), mode: game.mode.rawValue
                 ).encoded(), to: peer)
```

**`Server.swift`**, in `queueEvents` — kills pass through, tallies go when
they change:

```diff
             case .pickedUp(let e, let kind):
                 if let slot = game.world.get(PlayerSlot.self, e)?.index {
                     events.append(.pickedUp(slot: slot, kind: kind.rawValue))
                 }
+            case .kill(let killer, let victim):
+                events.append(.kill(killerSlot: UInt8(killer), victimSlot: UInt8(victim)))
             default:
                 break
             }
         }
+        if game.seatStats != lastSeatStats || game.seatJoined != lastJoined {
+            lastSeatStats = game.seatStats
+            lastJoined = game.seatJoined
+            for slot in 0..<game.playerCount {
+                events.append(.seatStats(
+                    slot: UInt8(slot), kills: UInt16(game.seatStats[slot].kills),
+                    deaths: UInt16(game.seatStats[slot].deaths), joined: game.seatJoined[slot]))
+            }
+        }
+        for slot in 0..<game.playerCount {
+            guard let ship = game.player(inSlot: slot), let loadout = game.world.get(Loadout.self, ship),
+                loadout != lastLoadouts[slot]
+            else { continue }
+            lastLoadouts[slot] = loadout
+            events.append(.loadout(
+                slot: UInt8(slot), fireInterval: loadout.fireInterval, bolts: UInt8(loadout.boltCount),
+                damage: UInt8(loadout.damage), missiles: UInt8(loadout.missiles), shield: UInt8(loadout.shield)))
+        }
```

Whenever anyone's tally or presence changes, every seat's row goes out —
four small events, reliably — so every client's scoreboard is the server's.
And whenever a seat's loadout changes — a pickup, a death that resets it —
that seat gets its five numbers, so the pips on a client's HUD are the
server's too. The loadout is compared as a whole, which is what `Equatable`
was for; the first comparison, against `nil`, sends the starting loadout to
a newcomer.

**`Sources/SpaceFighter/Net/Client.swift`**, in `handle` — the mirror is
built in the right mode:

```diff
-        case .welcome(let slot, _, let tick, let ship, let seats):
+        case .welcome(let slot, _, let tick, let ship, let seats, let mode):
             guard game == nil else { return }
             let definition = Ships.all[Int(ship) % Ships.all.count]
             let mirror = Game(
                 seed: 0, ship: definition, playerCount: Int(seats), role: .mirror(localSlot: Int(slot)),
-                spawnSeats: false)
+                spawnSeats: false, mode: GameMode(rawValue: mode) ?? .coop)
```

**`Client.swift`**, in `apply(event:)`:

```diff
         case .gameOver:
             game.isOver = true
+        case .kill(let killer, let victim):
+            game.addKill(killer: Int(killer), victim: Int(victim))
+        case .seatStats(let slot, let kills, let deaths, let joined):
+            let s = Int(slot)
+            guard s < game.playerCount else { return }
+            game.seatStats[s] = SeatStats(kills: Int(kills), deaths: Int(deaths))
+            game.mirrorSeat(s, joined: joined)
+        case .loadout(let s, let fireInterval, let bolts, let damage, let missiles, let shield):
+            guard Int(s) == slot, let ship = game.player(inSlot: Int(s)) else { return }
+            game.world.store(Loadout.self).set(ship, Loadout(
+                fireInterval: fireInterval, boltCount: Int(bolts), damage: Int(damage),
+                missiles: Int(missiles), shield: Int(shield)))
         }
```

A mirror's kill feed and scoreboard are driven entirely by events; its own
`tally` never runs, because a mirror's `step` is the four-system one from
chapter 13. So are its pips: the loadout event overwrites the seat's
`Loadout` component, which is all the HUD reads. A loadout for a seat whose
ship is between death and respawn is dropped — the fresh ship starts with the
ship's own loadout on both sides, so nothing is lost.

Two things the network shook out of chapter 13's client. First: an event
can arrive *before* the `Welcome` — the server queues a newcomer's wave and
score the moment it seats them, and with jitter the event datagram can beat
the welcome. Chapter 13's `apply(event:)` silently dropped events with no
mirror to apply them to, and advanced the sequence past them, so a late
joiner could be told the wave number exactly once and miss it.

**`Sources/SpaceFighter/Net/Client.swift`**, in `handle` — hold events
until there's somewhere to put them:

```diff
         case .event(let seq, let event):
             guard seq >= nextEventSeq else { return }  // already had it
             heldEvents[seq] = event
-            while let next = heldEvents.removeValue(forKey: nextEventSeq) {
-                apply(event: next)
-                nextEventSeq += 1
-            }
+            drainEvents()
```

```diff
             mirror.setTick(tick + leadTicks)
             self.slot = Int(slot)
             self.game = mirror
+            drainEvents()
```

**`Client.swift`**, in `Client` — before `retune`:

```diff
+    /// Apply held events in sequence order — but only once there is a mirror
+    /// to apply them to. An event that beat the Welcome waits, and is not acked.
+    private func drainEvents() {
+        guard game != nil else { return }
+        while let next = heldEvents.removeValue(forKey: nextEventSeq) {
+            apply(event: next)
+            nextEventSeq += 1
+        }
+    }
```

Not acking is the important half: an unacked event is resent, so even an
event that arrived and was held is safe if the client restarts.

Second: `Tab`. The scoreboard reads `lastInputs`, which chapter 11's
per-seat `advance` records — but a client drives its mirror through the
tick-provider `advance`, which never sees the live frame. So a client tells
its game what the seat is asking for, and `Game` learns to be told:

**`Sources/SpaceFighter/Game.swift`**, in `Game` — before
`advance(realDt:inputsForTick:)`:

```diff
+    /// Remember what a seat is asking for right now, for the presentation
+    /// (the debug toggle, the held scoreboard key). The per-seat `advance`
+    /// does this itself; the tick-provider `advance` can't, so a client says.
+    func noteLiveInput(_ input: InputFrame, slot: Int) {
+        guard slot < playerCount else { return }
+        if slot == 0 && input.buttons.contains(.debug) && !lastInputs[0].buttons.contains(.debug) {
+            showFlightDebug.toggle()
+        }
+        lastInputs[slot] = input
+    }
```

**`Client.swift`**, in `update` — before `game.advance`:

```diff
+        game.noteLiveInput(input, slot: slot ?? 0)
         game.advance(realDt: realDt) { tick in
```

Which also gives a client the chapter 04 debug overlay back.

---

## Screens

The title screen becomes a menu, and two screens join it: the host's lobby
and the joiner's browser.

**`Sources/SpaceFighter/App/Screens/TitleScreen.swift`** — replace the whole
file:

```swift
import simd

/// The front door: a short menu over the turning ship. Up and down choose,
/// Enter confirms, Escape quits. Hosting also lets left and right pick the mode.
final class TitleScreen: Screen {
    enum Item: Int, CaseIterable {
        case solo
        case host
        case join
        case quit

        var label: String {
            switch self {
            case .solo: return "FLY SOLO"
            case .host: return "HOST A GAME"
            case .join: return "JOIN A GAME"
            case .quit: return "QUIT"
            }
        }
    }

    private let menu: MenuWorld
    private var time: Float = 0
    private var selected = Item.solo
    private var mode = GameMode.coop

    init(menu: MenuWorld) {
        self.menu = menu
    }

    var title: String { "Space Fighter" }

    func update(inputs: [InputFrame], pressed: Buttons, realDt: Float) -> Transition? {
        time += realDt
        if pressed.contains(.menuDown) {
            selected = Item(rawValue: min(selected.rawValue + 1, Item.allCases.count - 1))!
        }
        if pressed.contains(.menuUp) {
            selected = Item(rawValue: max(selected.rawValue - 1, 0))!
        }
        if selected == .host && (pressed.contains(.menuLeft) || pressed.contains(.menuRight)) {
            mode = mode == .coop ? .deathmatch : .coop
        }
        if pressed.contains(.confirm) {
            switch selected {
            case .solo: return .toShipSelect
            case .host: return .host(mode)
            case .join: return .toJoin
            case .quit: return .quit
            }
        }
        if pressed.contains(.pause) || pressed.contains(.back) { return .quit }
        return nil
    }

    func render(viewport: SIMD2<Float>, realDt: Float) -> FrameRenderData {
        var hud: [HUDVertex] = []
        let vp = viewport
        let white = Vec4(0.92, 0.95, 1.0, 1)
        let gold = Vec4(0.9, 0.85, 0.5, 1)
        let dim = Vec4(0.6, 0.6, 0.7, 0.9)
        HUDSystem.text("SPACE FIGHTER", at: SIMD2(vp.x / 2, vp.y * 0.22), size: 64, color: white,
                       align: .center, into: &hud, vp)
        for item in Item.allCases {
            var label = item.label
            if item == .host { label += mode == .coop ? "   < CO-OP >" : "   < DEATHMATCH >" }
            let y = vp.y * 0.66 + Float(item.rawValue) * 34
            let isSelected = item == selected
            HUDSystem.text((isSelected ? "> " : "  ") + label, at: SIMD2(vp.x / 2, y), size: 26,
                           color: isSelected ? gold : white, align: .center, into: &hud, vp)
        }
        HUDSystem.text("W/S CHOOSE   ENTER CONFIRMS   ESC QUITS", at: SIMD2(vp.x / 2, vp.y * 0.93), size: 16,
                       color: dim, align: .center, into: &hud, vp)
        _ = time
        return menu.render(viewport: viewport, realDt: realDt, hud: hud)
    }
}
```

Four items, chosen with the `menuUp`/`menuDown` bits chapter 03 reserved;
on the hosting row, left and right flip the mode. It's chapter 10's screen
with a list.

**`Sources/SpaceFighter/App/Screens/LobbyScreens.swift`** — new file:

```swift
import Foundation
import Network
import simd

/// Hosting: the server exists and is advertised, the world is served but not
/// stepped, and the screen lists who has arrived. Enter starts the game for
/// everyone; late arrivals can still join after that.
final class HostLobbyScreen: Screen {
    private let server: Server
    private let transport: UDPHostTransport
    private let localClient: Client
    private let menu: MenuWorld
    private let modeName: String
    private var time: Float = 0

    init(server: Server, transport: UDPHostTransport, localClient: Client, menu: MenuWorld) {
        self.server = server
        self.transport = transport
        self.localClient = localClient
        self.menu = menu
        self.modeName = server.game.mode == .coop ? "CO-OP" : "DEATHMATCH"
        server.paused = true
    }

    var title: String { "Space Fighter — Hosting" }

    func update(inputs: [InputFrame], pressed: Buttons, realDt: Float) -> Transition? {
        time += realDt
        _ = localClient.update(realDt: realDt, input: InputFrame(), viewport: SIMD2(1280, 720))
        server.update(realDt: realDt)
        if pressed.contains(.confirm) {
            server.paused = false
            return .toNetGame
        }
        if pressed.contains(.pause) || pressed.contains(.back) { return .toTitle }
        return nil
    }
}
```

The host is a client of its own server, over the real socket to
`127.0.0.1` — the same code path as everyone else, as chapter 12 insisted.
The lobby steps both, with the server paused, so that the local client is
welcomed and seated before anyone presses Enter. Escape hands the teardown
to the session — the *Leaving* section below — rather than doing it here,
because the game screen needs the same teardown and a socket should be closed
in one place.

**`LobbyScreens.swift`**, in `HostLobbyScreen` — after `update`:

```diff
+    func render(viewport: SIMD2<Float>, realDt: Float) -> FrameRenderData {
+        var hud: [HUDVertex] = []
+        let vp = viewport
+        let white = Vec4(0.92, 0.95, 1.0, 1)
+        let dim = Vec4(0.6, 0.6, 0.7, 0.9)
+        HUDSystem.text("HOSTING  \(modeName)", at: SIMD2(vp.x / 2, vp.y * 0.18), size: 40, color: white,
+                       align: .center, into: &hud, vp)
+        let port = transport.failed ? "PORT IN USE" : transport.port.map { "PORT \($0)" } ?? "STARTING…"
+        HUDSystem.text(port, at: SIMD2(vp.x / 2, vp.y * 0.25), size: 22, color: dim, align: .center, into: &hud, vp)
+        let seats = server.seatsTaken
+        for (i, slot) in seats.enumerated() {
+            let you = slot == localClient.slot ? "   (YOU)" : ""
+            HUDSystem.text("P\(slot + 1) READY\(you)", at: SIMD2(vp.x / 2, vp.y * 0.62 + Float(i) * 30), size: 24,
+                           color: white, align: .center, into: &hud, vp)
+        }
+        let blink = (sin(time * 3) + 1) / 2
+        HUDSystem.text("ENTER STARTS   ESC CANCELS", at: SIMD2(vp.x / 2, vp.y * 0.9), size: 18,
+                       color: Vec4(0.9, 0.85, 0.5, 0.4 + 0.6 * blink), align: .center, into: &hud, vp)
+        return menu.render(viewport: viewport, realDt: realDt, hud: hud)
+    }
 }
```

**`LobbyScreens.swift`** — after `HostLobbyScreen`:

```swift
/// Joining: browse the LAN for hosts, pick one, connect.
final class JoinScreen: Screen {
    private let browser = LANBrowser()
    private let menu: MenuWorld
    private var selected = 0

    init(menu: MenuWorld) {
        self.menu = menu
    }

    var title: String { "Space Fighter — Join" }

    func update(inputs: [InputFrame], pressed: Buttons, realDt: Float) -> Transition? {
        let hosts = browser.hosts
        if pressed.contains(.menuDown) { selected = min(selected + 1, max(hosts.count - 1, 0)) }
        if pressed.contains(.menuUp) { selected = max(selected - 1, 0) }
        if pressed.contains(.confirm), selected < hosts.count {
            browser.stop()
            return .join(hosts[selected].endpoint)
        }
        if pressed.contains(.pause) || pressed.contains(.back) {
            browser.stop()
            return .toTitle
        }
        return nil
    }

    func render(viewport: SIMD2<Float>, realDt: Float) -> FrameRenderData {
        var hud: [HUDVertex] = []
        let vp = viewport
        let white = Vec4(0.92, 0.95, 1.0, 1)
        let dim = Vec4(0.6, 0.6, 0.7, 0.9)
        HUDSystem.text("GAMES ON THIS NETWORK", at: SIMD2(vp.x / 2, vp.y * 0.18), size: 36, color: white,
                       align: .center, into: &hud, vp)
        let hosts = browser.hosts
        if hosts.isEmpty {
            HUDSystem.text("LOOKING…", at: SIMD2(vp.x / 2, vp.y * 0.5), size: 24, color: dim, align: .center,
                           into: &hud, vp)
        }
        for (i, host) in hosts.enumerated() {
            let marker = i == selected ? "> " : "  "
            HUDSystem.text(marker + host.name.uppercased(), at: SIMD2(vp.x / 2, vp.y * 0.4 + Float(i) * 30), size: 24,
                           color: i == selected ? Vec4(0.9, 0.85, 0.5, 1) : white, align: .center, into: &hud, vp)
        }
        HUDSystem.text("ENTER JOINS   ESC BACK", at: SIMD2(vp.x / 2, vp.y * 0.9), size: 18, color: dim,
                       align: .center, into: &hud, vp)
        return menu.render(viewport: viewport, realDt: realDt, hud: hud)
    }
}
```

The browser runs while the screen is up and stops when it leaves. Hosts
appear by the name the host machine advertised — its computer name.

**`Sources/SpaceFighter/App/Session.swift`** — the transitions and the two
ways in:

```diff
 import Foundation
+import Network
 import simd
```

```diff
     case toSummary
     case quit
+    case host(GameMode)
+    case toJoin
+    case join(NWEndpoint)
+    case toNetGame
 }
```

```diff
     private var lastButtons: Buttons = []
+    /// The host's server and its transport, kept while hosting.
+    private(set) var hosting: (server: Server, transport: UDPHostTransport, client: Client)?
+    static let maxNetSeats = 4
+    static let defaultPort: UInt16 = 27900
```

**`Session.swift`**, in `apply` — after `case .quit`:

```diff
         case .quit:
             onQuit()
+        case .host(let mode):
+            if !startHosting(mode: mode, port: Self.defaultPort, advertise: true) {
+                print("could not create a UDP listener")
+            }
+        case .toJoin:
+            screen = JoinScreen(menu: menu)
+        case .join(let endpoint):
+            let client = Client(transport: UDPClientTransport(endpoint: endpoint))
+            game = nil
+            screen = NetPlayingScreen(client: client, server: nil, bots: [], menu: menu) { _ in }
+        case .toNetGame:
+            guard let hosting else { return }
+            game = nil
+            screen = NetPlayingScreen(client: hosting.client, server: hosting.server, bots: [], menu: menu) { _ in }
         }
     }
```

Chapter 13's `NetPlayingScreen`, with a `pump` that does nothing: a real
socket needs no fake clock advanced. A joiner has no server; the host
passes its own.

**`Session.swift`**, in `Session` — after `apply`:

```diff
+    /// Start a server on a UDP port, connect a local client to it over the
+    /// same socket, and sit in the lobby. Returns false only if no listener
+    /// could be made at all; a port someone else holds shows up in the lobby.
+    @discardableResult
+    func startHosting(mode: GameMode, port: UInt16, advertise: Bool) -> Bool {
+        guard let transport = try? UDPHostTransport(port: port, advertise: advertise ? Host.current().localizedName ?? "Space Fighter" : nil)
+        else { return false }
+        let ship = Ships.all[selectedShip]
+        let authority = Game(seed: nextSeed, ship: ship, playerCount: Self.maxNetSeats, spawnSeats: false, mode: mode)
+        nextSeed &+= 1
+        let server = Server(game: authority, transport: transport, ship: ship)
+        let local = Client(transport: UDPClientTransport(host: "127.0.0.1", port: port))
+        hosting = (server, transport, local)
+        game = nil
+        screen = HostLobbyScreen(server: server, transport: transport, localClient: local, menu: menu)
+        return true
+    }
+
+    /// Join a host by address, skipping the browser. For the command line.
+    func joinDirect(host: String, port: UInt16) {
+        apply(.join(.hostPort(host: NWEndpoint.Host(host), port: NWEndpoint.Port(rawValue: port)!)))
+    }
 }
```

Four seats on a network game, a fixed port so a friend across the internet
can be told one number, and the host's own client connecting to itself
over loopback — the real one this time, `127.0.0.1`.

**`Sources/SpaceFighter/main.swift`**, in `LaunchOptions`:

```diff
     var loss: Float = 0
     var bots = 0
+    var host: GameMode?    // start hosting straight away, in this mode
+    var join: (String, UInt16)?
```

```diff
             case ("--bots", let n?): bots = min(max(Int(n) ?? 0, 0), 3); i += 2
+            case ("--host", let mode?):
+                host = mode.lowercased().hasPrefix("death") ? .deathmatch : .coop; i += 2
+            case ("--join", let address?):
+                let parts = address.split(separator: ":")
+                let port = parts.count > 1 ? UInt16(parts[1]) ?? Session.defaultPort : Session.defaultPort
+                join = (String(parts[0]), port); i += 2
```

**`main.swift`** — after the loopback block:

```diff
+if let mode = options.host {
+    if !session.startHosting(mode: mode, port: Session.defaultPort, advertise: true) {
+        print("could not create a UDP listener")
+    }
+}
+if let (host, port) = options.join { session.joinDirect(host: host, port: port) }
```

The flags exist for two reasons: to play across the internet, where Bonjour
can't see the host and you type an address; and to run two copies on one
machine for a smoke test, which is how the checkpoint below starts.

---

## Leaving

Escape out of a networked game and two things must happen that a solo game
never needed: the socket has to close, and the host's server has to go with
it — or the port stays taken until the app quits, and `HOST A GAME` silently
does nothing the second time. Closing is one more thing a transport has to
be able to do.

**`Sources/SpaceFighter/Net/Transport.swift`**, in `Transport`:

```diff
     func send(_ bytes: [UInt8], to peer: PeerID)
     func receive() -> [Datagram]
+    /// Close whatever the transport holds open. A loopback holds nothing.
+    func stop()
 }
```

**`Sources/SpaceFighter/Net/LoopbackNetwork.swift`**, in `LoopbackTransport`
— after `receive`:

```diff
         inbox.removeAll(keepingCapacity: true)
         return out
     }
+
+    func stop() {}
 }
```

The two UDP transports already had a `stop`; now it's part of the contract,
so the session can close a connection without knowing which kind it holds.

**`Sources/SpaceFighter/App/Session.swift`**, in `apply` — the two ways out
of a net game tear it down first:

```diff
         case .toTitle:
+            leaveNetwork()
             game = nil
             screen = TitleScreen(menu: menu)
```

```diff
         case .startRun(let ship):
+            leaveNetwork()
             let game = Game(seed: nextSeed, ship: ship, playerCount: playerCount)
```

**`Session.swift`**, in `Session` — after `startHosting`:

```swift
    /// Tear down whatever network the current screen holds open: the host's
    /// server, its listener and its local client, or a joiner's connection.
    /// Escape out of a net game, and the port is free to host on again.
    private func leaveNetwork() {
        if let hosting {
            hosting.transport.stop()
            hosting.client.transport.stop()
            self.hosting = nil
        } else if let net = screen as? NetPlayingScreen {
            net.client.transport.stop()
        }
    }
```

A host holds three things — the listener, the server that owns the game, and
its own client's connection; a joiner holds one. Both are closed here, and
the objects go when the screen that also held them is replaced on the next
line. The summary's Enter goes through `.startRun`, so flying again after a
network match is a solo run with the match's sockets closed behind you.
`.toSummary` tears nothing down on purpose: the scoreboard over the summary
still needs the mirror, and the other players are looking at their own.

Nothing here says goodbye to the *server*. A host that leaves just stops
answering; a client that leaves just stops sending, and the seat it held
stays taken until the server is told otherwise — which is the challenge.

---

## The tests

**`Tests/SpaceFighterTests/Ch14ModeTests.swift`** — new file:

```swift
import Testing
import simd

@testable import SpaceFighter

private let dt = SimulationClock.step

private func deathmatch() -> Game {
    Game(seed: 9, ship: Ships.all[1], playerCount: 2, mode: .deathmatch)
}

@Test func deathmatchHasNoWavesAndEverySeatIsItsOwnTeam() {
    let game = deathmatch()
    for _ in 0..<600 { game.step(inputs: [InputFrame(), InputFrame()], dt: dt) }
    #expect(game.world.store(Enemy.self).count == 0)
    #expect(game.director.wave == 0)
    let teams = game.players.map { game.world.get(Team.self, $0)!.id }
    #expect(teams.count == 2 && teams[0] != teams[1])
}

@Test func playersCanHurtEachOtherInDeathmatchButNotInCoop() {
    for (mode, hurts) in [(GameMode.deathmatch, true), (GameMode.coop, false)] {
        let game = Game(seed: 9, ship: Ships.all[1], playerCount: 2, mode: mode)
        game.director.phase = .fighting
        let world = game.world
        let victim = game.players[1]
        // Park the victim ahead of the shooter's nose and fire.
        let shooterT = world.get(Transform.self, game.players[0])!
        world.store(Transform.self).mutate(victim) { $0.position = shooterT.position + shooterT.forward * 30 }
        world.store(Velocity.self).mutate(victim) { $0.linear = .zero }
        world.store(Engine.self).mutate(victim) { $0.speed = 0; $0.throttle = 0 }
        var fire = InputFrame()
        fire.buttons = [.fire]
        var hold = InputFrame()
        hold.throttle = -1
        for _ in 0..<40 { game.step(inputs: [fire, hold], dt: dt) }
        let hull = world.get(Health.self, victim)!.current
        #expect((hull < 100) == hurts, "\(mode): hull \(hull)")
    }
}
```

The same shot, two modes, opposite outcomes — and nothing in the damage
system changed between them. Only the `Team`.

**`Ch14ModeTests.swift`** — after `playersCanHurtEachOtherInDeathmatchButNotInCoop`:

```swift
@Test func killsAreTalliedAndTheLimitEndsTheMatch() {
    let game = deathmatch()
    let world = game.world
    let killer = game.players[0]
    for kill in 1...GameMode.killLimit {
        guard let victim = game.player(inSlot: 1) else {
            Issue.record("seat 1 had no ship at kill \(kill)")
            break
        }
        world.store(Health.self).mutate(victim) {
            $0.current = 0
            $0.lastHitBy = killer
        }
        game.step(inputs: [InputFrame(), InputFrame()], dt: dt)
        #expect(game.seatStats[0].kills == kill)
        #expect(game.seatStats[1].deaths == kill)
        if kill < GameMode.killLimit {
            #expect(!game.isOver)
            // Respawn at the seat's spawn point, teammates or not.
            for _ in 0..<Int(Game.respawnDelay / dt) + 2 { game.step(inputs: [InputFrame(), InputFrame()], dt: dt) }
            let back = game.player(inSlot: 1)
            #expect(back != nil)
            if let back {
                let p = world.get(Transform.self, back)!.position
                #expect(simd_length(p - Game.spawnPoint(1, of: 2)) < 60, "near their spawn point")
            }
        }
    }
    #expect(game.winner == 0)
    #expect(!game.isOver, "the last kill starts the countdown")
    for _ in 0..<Int(Game.overDelay / dt) + 2 { game.step(inputs: [InputFrame(), InputFrame()], dt: dt) }
    #expect(game.isOver)
    _ = game.frame(viewport: SIMD2(1600, 1000), realDt: dt)
    #expect(!game.killFeed.isEmpty)
}
```

The tenth kill *decides* the match; `isOver` comes a second and a half later,
chapter 08's rule holding for deathmatch too, so the winner's last victim gets
its explosion before the board comes up.

**`Tests/SpaceFighterTests/Ch14NetworkTests.swift`** — new file:

```swift
import Foundation
import Testing

@testable import SpaceFighter

/// Poll until `condition` holds or `seconds` pass.
private func waitUntil(_ seconds: Double, _ condition: () -> Bool) async -> Bool {
    let deadline = Date().addingTimeInterval(seconds)
    while Date() < deadline {
        if condition() { return true }
        try? await Task.sleep(for: .milliseconds(20))
    }
    return condition()
}

@Test func aDatagramCrossesARealSocket() async throws {
    let host = try UDPHostTransport(port: 0, advertise: nil)
    #expect(await waitUntil(3) { host.port != nil }, "the listener came up")
    let port = host.port!
    let client = UDPClientTransport(host: "127.0.0.1", port: port)

    client.send(Message.hello(version: Message.version).encoded(), to: 0)
    var arrived: [Datagram] = []
    #expect(await waitUntil(3) {
        arrived += host.receive()
        return !arrived.isEmpty
    }, "the host heard the client")
    #expect(arrived.first?.from == 1)
    #expect((try? Message(decoding: arrived.first!.bytes)) == .hello(version: Message.version))

    host.send(Message.pong(tick: 7).encoded(), to: 1)
    var reply: [Datagram] = []
    #expect(await waitUntil(3) {
        reply += client.receive()
        return !reply.isEmpty
    }, "and the client heard back")
    #expect((try? Message(decoding: reply.first!.bytes)) == .pong(tick: 7))
    client.stop()
    host.stop()
}
```

The first test in the guide that touches the operating system's network
stack, and the first that's `async`: a real socket takes real time to come
up and deliver, so the test polls with a deadline instead of asserting
immediately. Port 0 asks the system for any free port, so two test runs
can't collide.

**`Ch14NetworkTests.swift`** — after `aDatagramCrossesARealSocket`:

```swift
@Test func aClientJoinsAServerOverUDP() async throws {
    let hostTransport = try UDPHostTransport(port: 0, advertise: nil)
    #expect(await waitUntil(3) { hostTransport.port != nil })
    let game = Game(seed: 3, ship: Ships.all[1], playerCount: 2, spawnSeats: false, mode: .deathmatch)
    let server = Server(game: game, transport: hostTransport, ship: Ships.all[1])
    let client = Client(transport: UDPClientTransport(host: "127.0.0.1", port: hostTransport.port!))

    let dt: Float = 1.0 / 60.0
    var frames = 0
    let welcomed = await waitUntil(5) {
        _ = client.update(realDt: dt, input: InputFrame(), viewport: SIMD2(1280, 720))
        server.update(realDt: dt)
        frames += 1
        return client.game != nil && client.ghostCount >= 0 && game.players.count == 1
    }
    #expect(welcomed, "welcomed after \(frames) frames")
    #expect(client.slot == 0)
    #expect(client.game?.mode == .deathmatch)
    hostTransport.stop()
}

@Test func aBusyPortIsReportedNotHidden() async throws {
    let first = try UDPHostTransport(port: 27902, advertise: nil)
    #expect(await waitUntil(3) { first.port != nil })
    let second = try UDPHostTransport(port: 27902, advertise: nil)
    #expect(await waitUntil(3) { second.failed }, "the second listener says so")
    #expect(second.port == nil)
    second.stop()
    first.stop()
}

@Test func leavingAHostedGameReleasesThePort() async throws {
    let session = Session(seed: 1, ship: Ships.all[1], record: false)
    let port: UInt16 = 27901
    let frameDt: Float = 1.0 / 60.0
    let vp = SIMD2<Float>(1280, 720)
    #expect(session.startHosting(mode: .coop, port: port, advertise: false))
    #expect(await waitUntil(3) { session.hosting?.transport.port != nil }, "the first listener came up")

    var enter = InputFrame()
    enter.buttons = .confirm
    _ = session.update(input: enter, realDt: frameDt, viewport: vp)  // lobby: Enter starts the game
    _ = session.update(input: InputFrame(), realDt: frameDt, viewport: vp)
    #expect(session.screen is NetPlayingScreen)
    var escape = InputFrame()
    escape.buttons = .pause
    _ = session.update(input: escape, realDt: frameDt, viewport: vp)  // in game: Escape leaves
    #expect(session.screen is TitleScreen)
    #expect(session.hosting == nil, "the server and its socket went with it")

    #expect(session.startHosting(mode: .coop, port: port, advertise: false), "so the port is free again")
    #expect(await waitUntil(3) { session.hosting?.transport.port != nil }, "and a new listener comes up on it")
    session.hosting?.transport.stop()
}

@Test func snapshotPartsStayUnderTheMTU() {
    let record = EntityRecord(
        netID: 1, kind: .enemy, slot: 255, team: 1, mesh: 1, color: Vec4(1, 1, 1, 1), scale: 1,
        position: .zero, rotation: Quat(angle: 0, axis: Vec3(0, 1, 0)), velocity: .zero, angular: .zero,
        throttle: 0, speed: 0, health: 1, maxHealth: 1, pickupKind: 0)
    let fifteen = Message.snapshot(tick: 1, records: Array(repeating: record, count: 15), last: true).encoded()
    let sixteen = Message.snapshot(tick: 1, records: Array(repeating: record, count: 16), last: true).encoded()
    #expect(fifteen.count <= Message.maxPayload)
    #expect(sixteen.count > Message.maxPayload, "so the server has to split at fifteen")
}
```

Chapter 13's whole server and client, over a real socket, exchanging a
`Hello` and a `Welcome` and the first snapshots — the same code, a
different `Transport`. The MTU test pins the number chapter 13 stated. The
other two are the *Leaving* section, checked: a busy port is reported as
`failed` rather than swallowed, and a session that hosts, plays and leaves
can host on the same port again without a restart. Both use fixed ports
rather than port 0, because "the same port" is the point.

**`Ch13NetTests.swift`** — after `aClientSeesItsOwnShipDestroyedAndReplaced`:

```swift
@Test func aPickupOnTheServerReachesTheClientsHUD() {
    let rig = Rig(latency: 0.05, jitter: 0, loss: 0.1, seats: 2, waves: false)
    let client = rig.join()
    rig.run(90)
    guard let mirror = client.game, let ship = rig.server.game.player(inSlot: 0) else {
        Issue.record("no ship to upgrade")
        return
    }
    rig.server.game.world.store(Loadout.self).mutate(ship) {
        $0.apply(.shield)
        $0.apply(.missiles)
    }
    rig.run(60)
    let seen = mirror.player(inSlot: 0).flatMap { mirror.world.get(Loadout.self, $0) }
    #expect(seen?.shield == 1 && seen?.missiles == 2, "the pips follow the server: \(String(describing: seen))")
}
```

Ten percent loss, and the two pips still arrive — as an event, reliably, in
order — and land on the mirror's `Loadout`, which is what its HUD draws from.

---

## Checkpoint

```console
$ swift test
✔ Test run with 85 tests in 0 suites passed
```

**Eighty-five tests**, four of them over real sockets. Then, in two
terminals on one machine:

```console
$ swift run SpaceFighter --host deathmatch
```

```console
$ swift run SpaceFighter --join 127.0.0.1
```

1. **The host sees a lobby**: `HOSTING  DEATHMATCH`, `PORT 27900`, and
   `P1 READY (YOU)`. When the second window connects, `P2 READY` appears
   under it. Enter starts.
2. **The joiner sees `CONNECTING`**, then the game — its ship at one spawn
   point, the host's ship across the ring at another, no enemies.
3. **Shoot each other.** A hit flashes the victim's screen; a kill puts
   `P1 DESTROYED P2` top right on both screens, the victim's view says
   `DESTROYED - RESPAWNING` for three seconds, and they're back at their
   spawn point.
4. **Hold `Tab`**: the scoreboard, with your row in gold. Ten kills ends
   it, and the board stays up over the summary. Escape out of it and
   `HOST A GAME` again: the same port, no restart.
5. **Now with two machines.** Quit both. On one, `swift run SpaceFighter`,
   choose `HOST A GAME` — it reads `< CO-OP >` already; `D` would flip it to
   deathmatch — and press Enter. On the other,
   `JOIN A GAME`: the first machine's name appears under `GAMES ON THIS
   NETWORK`. Enter. Waves, shared, for two — and the joiner's `RTT` in the
   title bar is the real one.

**If the joiner never leaves `CONNECTING`**, the host's firewall or the
local-network permission is blocking the port; the macOS dialog appears on
the *host* the first time it advertises, and on the *joiner* the first time
it browses. **If the lobby says `PORT IN USE`**, another copy holds port 27900 — quit
it, or Escape and try again once it's gone. **If the LAN list stays at `LOOKING…`** but
`--join <ip>` works, Bonjour is blocked on your network and the address is
the way. **If the two ships can't hurt each other**, the mode didn't reach
the server: check the `mode:` argument in `startHosting`.

---

## Challenge

Nobody ever leaves, as far as the server can tell. The host tears its
socket down on the way out, but a client that quits, or loses its
connection, keeps its seat forever: its ship sits there, its row stays on
the board, and its seat can't be reused. Add a timeout: a peer the server hasn't heard from
in five seconds is dropped — `leaveSeat`, remove the peer, and let the
next `Hello` have the seat. Three things make it real work: UDP has no
"disconnect", so silence is the only signal, and five seconds of silence
is also what a bad connection looks like; the *host* leaving is different
— every client's server just stops answering, and the clients should
notice and go back to the title rather than fly in a frozen world; and a
player who rejoins after a drop should get their seat and their score
back, which means seats need to remember who was in them, and "who" is
the thing this guide never gave players — a name.

---

**Next:** what this guide didn't build, and where each piece would go. →
[Chapter 15: Where to go next](15-where-to-go-next.md)

---

*Back to the [guide map](../README.md) · references in [`resources.md`](../resources.md)*
