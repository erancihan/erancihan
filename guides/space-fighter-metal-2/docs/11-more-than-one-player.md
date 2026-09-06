# 11 · More than one player 🛠️

> **You'll leave this chapter with:** a game with no idea how many players it
> has. Ships belong to *seats*; every seat gets its own input, camera, HUD
> and rectangle of the screen; enemies pick the nearest of you; a seat whose
> ship is destroyed gets a new one beside a living teammate; the run ends
> when nobody is left. Two people at one keyboard is the proof, and
> chapter 13's remote players are just more seats.
>
> **Files created:** `Tests/SpaceFighterTests/Ch11PlayersTests.swift`
> **Files changed:** `Components/Gameplay.swift`, `Archetypes/Player.swift`,
> `Game.swift`, `Render/Renderer.swift`, `GameView.swift`, `main.swift`,
> `Input/KeyBindings.swift`, `App/Session.swift`, `App/MenuWorld.swift`,
> `App/Screens/*.swift`, `Tests/SpaceFighterTests/Ch10SessionTests.swift`,
> `Tests/SpaceFighterTests/Ch05CameraTests.swift`,
> `Tests/SpaceFighterTests/Ch06CollisionTests.swift`

Chapter 01 listed "the singular player" as a debt: a `player` field on
`Game`, passed by name to five systems, with the hull in a global and the
HUD drawing *the* bar. Chapters 06 through 10 quietly paid most of it —
health became a component, enemies find the nearest `Player` by iterating
the store, the flight and weapon systems take *an* entity — and what's left
is the field itself, one camera rig, one set of presentation flags, and a
renderer that draws one picture.

This chapter finishes the job and then proves it, because a refactor whose
correctness you can't observe isn't finished. The proof is a second person on
the same keyboard, on the same screen. Nothing about split-screen is
*needed* for the netcode chapters, and everything they need is exactly what
split-screen needs: a ship per seat, an input per seat, a camera per seat.
If two local seats work, a remote seat is a different source of
`InputFrame`s and nothing else.

---

## A seat, not a field

**`Sources/SpaceFighter/Components/Gameplay.swift`** — after `Player`:

```swift
/// Which seat this ship belongs to: the index into the inputs, the cameras,
/// the viewports. Slot 0 is the first local player; chapter 13 hands remote
/// players slots too.
struct PlayerSlot {
    var index: UInt8
}
```

A ship *is* a player (the `Player` tag) and *belongs to* a seat (the slot).
Two components rather than one field because a seat outlives a ship — when a
ship is destroyed and a new one spawns three seconds later, it's the same
seat, the same input, the same half of the screen, a different entity.

**`Sources/SpaceFighter/Archetypes/Player.swift`**, in `spawnPlayer`:

```diff
-func spawnPlayer(in world: World, ship: ShipDefinition) -> Entity {
+func spawnPlayer(in world: World, ship: ShipDefinition, slot: UInt8 = 0, at position: Vec3 = .zero) -> Entity {
     let e = world.createEntity()
-    world.add(Transform(), to: e)
+    var transform = Transform()
+    transform.position = position
+    world.add(transform, to: e)
+    world.add(PlayerSlot(index: slot), to: e)
     world.add(Velocity(), to: e)
```

Now `Game`. The single `player` field goes and three things replace it: a
seat count, a *lookup*, and a per-seat copy of the presentation flags.

**`Sources/SpaceFighter/Game.swift`** — replace the head of the class, from
`final class Game {` down to and including `private(set) var player`:

```swift
final class Game {
    static let respawnDelay: Float = 3
    /// Seconds the world keeps moving after the run is decided, so the last
    /// wreck is seen flying before everything stops.
    static let overDelay: Float = 1.5

    let world: World
    let run = RunStats()
    let director = WaveDirector()
    let ship: ShipDefinition
    let playerCount: Int
    /// Presentation flags, one set per seat.
    let stats: [GameStats]
    /// True once the run is over and the world has had its last moment. An
    /// ended run stops stepping.
    private(set) var isOver = false
    /// Seconds until `isOver`, counting down once the run is decided; nil before.
    private var overIn: Float?
    /// Seconds until a dead seat gets a new ship, per seat; nil while alive.
    private var respawnTimers: [Float?]

    /// The living player ships, in seat order.
    var players: [Entity] {
        world.store(Player.self).owners.sorted {
            (world.get(PlayerSlot.self, $0)?.index ?? 0) < (world.get(PlayerSlot.self, $1)?.index ?? 0)
        }
    }

    /// Seat 0's ship, for single-seat callers and the tests. A dead seat has
    /// no ship, so this may return a handle that is alive for nothing.
    var player: Entity { player(inSlot: 0) ?? Entity(id: .max, generation: .max) }

    /// The ship in seat `slot`, if it's alive.
    func player(inSlot slot: Int) -> Entity? {
        world.store(Player.self).owners.first { world.get(PlayerSlot.self, $0)?.index == UInt8(slot) }
    }
```

`players` is *derived* — a query over the store, sorted by seat — so there's
no list to keep in sync when a ship dies or spawns. `player` survives as a
computed property, because six test files use it, and it's honest about
what it now is: a lookup of seat 0 that may come back with a dead handle. The stale-handle machinery from chapter 06 is
what makes that safe to return.

`stats` becomes an array: a hit flash is *this seat's* screen turning red,
not everyone's.

**`Game.swift`**, in `Game` — the last-input record and the last camera
become per seat, and the initialiser spawns a ship per seat:

```diff
     var showFlightDebug = false
-    private var lastInput = InputFrame()
+    private var lastInputs: [InputFrame]
```

```diff
-    /// Presentation. The last camera the ship had, kept after it's gone so the
-    /// wreck is watched from where the pilot was.
-    private var lastCamera: (view: Mat4, eye: Vec3, fov: Float, focus: Vec3) = (
-        Math.identity, .zero, CameraRig.baseFov, .zero)
+    /// Presentation. Each seat's last camera, kept after its ship is gone so
+    /// the wreck is watched from where the pilot was.
+    private var lastCameras: [(view: Mat4, eye: Vec3, fov: Float, focus: Vec3)?]
```

```diff
-    init(seed: UInt64 = 1, ship: ShipDefinition = Ships.all[1]) {
+    init(seed: UInt64 = 1, ship: ShipDefinition = Ships.all[1], playerCount: Int = 1) {
         world = World(seed: seed)
         self.ship = ship
-        player = spawnPlayer(in: world, ship: ship)
+        self.playerCount = playerCount
+        stats = (0..<playerCount).map { _ in GameStats() }
+        respawnTimers = Array(repeating: nil, count: playerCount)
+        lastInputs = Array(repeating: InputFrame(), count: playerCount)
+        lastCameras = Array(repeating: nil, count: playerCount)
+        for slot in 0..<playerCount {
+            spawnPlayer(in: world, ship: ship, slot: UInt8(slot), at: Vec3(Float(slot) * 8, 0, 0))
+        }
     }
```

Eight units apart, side by side, so two ships don't spawn inside each other's
colliders and ram on the first step. Both fly the same `ship` for now; the
challenge is about that.

---

## One frame per seat

Input arrives as an array now, one `InputFrame` per seat. The single-frame
signatures stay as one-line conveniences — the tests call them, and so does
anything that only has one seat — and the real work moves to the plural.

**`Game.swift`** — replace `advance`:

```swift
    /// Single-seat convenience.
    func advance(realDt: Float, input: InputFrame) {
        advance(realDt: realDt, inputs: [input])
    }

    /// Bank real time and run however many fixed steps it pays for. One
    /// InputFrame per seat serves every step this frame runs; a replay
    /// overrides seat 0's.
    func advance(realDt: Float, inputs live: [InputFrame]) {
        let live = padded(live)
        if live[0].buttons.contains(.debug) && !lastInputs[0].buttons.contains(.debug) {
            showFlightDebug.toggle()
        }
        lastInputs = live

        guard !isOver else { return }
        let steps = clock.advance(realDt: realDt)
        for i in 0..<steps {
            let tick = Int(clock.tick) - steps + i
            var inputs = live
            if let replayed = replayFrame(at: tick) { inputs[0] = replayed }
            recording?.frames.append(inputs[0])
            step(inputs: inputs, dt: SimulationClock.step)
        }
    }

    /// Fewer frames than seats means the missing seats did nothing.
    private func padded(_ inputs: [InputFrame]) -> [InputFrame] {
        var out = inputs
        while out.count < playerCount { out.append(InputFrame()) }
        return Array(out.prefix(playerCount))
    }
```

Chapter 03's recording and replay stay single-seat: they record and replay
seat 0. A two-seat recording is a format change — chapter 03's version
number again — and chapter 13 gets there by a different route, so this
chapter leaves it. `padded` is defensive: a caller with one frame and a
two-seat game gets a second seat that sits still, not a crash.

**`Game.swift`** — replace the head of `step` through `HomingSystem.update`
(the single-seat convenience above it is new):

```swift
    /// Single-seat convenience.
    func step(input: InputFrame, dt: Float) {
        step(inputs: [input], dt: dt)
    }

    /// One fixed step. Everything in here is simulation: deterministic, and
    /// blind to the display.
    func step(inputs: [InputFrame], dt: Float) {
        let inputs = padded(inputs)
        world.snapshotTransforms()
        world.events.removeAll(keepingCapacity: true)

        for slot in 0..<playerCount {
            guard let player = player(inSlot: slot) else { continue }
            FlightControlSystem.update(world, player: player, input: inputs[slot], dt: dt)
            WeaponSystem.update(world, player: player, input: inputs[slot], run: run, dt: dt)
        }
        EnemyAISystem.update(world, dt: dt)
        EnemyWeaponSystem.update(world, dt: dt)
        HomingSystem.update(world, dt: dt)
```

The two systems that took `player:` still take `player:` — they were always
per-entity — and now they're called once per seat. `WeaponSystem` moves up
beside `FlightControlSystem` so the loop is one loop; the rest of the
schedule is unchanged and follows as before.

**`Game.swift`**, in `step` — the director follows whoever's alive, and the
tail decides who comes back:

```diff
-        if let playerT = world.get(Transform.self, player) {
+        if let lead = players.first, let playerT = world.get(Transform.self, lead) {
             director.update(world, playerT: playerT, dt: dt)
         }
```

```diff
         if overIn == nil { run.seconds += dt }
         run.wave = director.wave
-        endRun(when: !world.isAlive(player), dt: dt)
+        respawnTheDead(dt: dt)
+        endRun(when: players.isEmpty, dt: dt)
     }
```

**`Game.swift`**, in `Game` — after `step`:

```diff
+    /// Co-op rule: a seat whose ship is gone gets a new one beside a living
+    /// teammate after a delay. With nobody left alive, nobody comes back.
+    private func respawnTheDead(dt: Float) {
+        let living = players
+        for slot in 0..<playerCount {
+            if player(inSlot: slot) != nil {
+                respawnTimers[slot] = nil
+                continue
+            }
+            guard let anchor = living.first, let anchorT = world.get(Transform.self, anchor) else { continue }
+            if respawnTimers[slot] == nil { respawnTimers[slot] = Self.respawnDelay }
+            respawnTimers[slot]! -= dt
+            if respawnTimers[slot]! <= 0 {
+                let position = anchorT.position + anchorT.right * 8 - anchorT.forward * 6
+                let fresh = spawnPlayer(in: world, ship: ship, slot: UInt8(slot), at: position)
+                world.store(Transform.self).mutate(fresh) { $0.rotation = anchorT.rotation }
+                respawnTimers[slot] = nil
+            }
+        }
+    }
```

This is the co-op rule, and it's the first rule in the guide that only means
something with two players: die, and three seconds later you're back beside
your teammate, facing the way they're facing, with your ship's *starting*
loadout — a death costs you everything you'd picked up, which is the
roguelike keeping its word. With one seat there's never a teammate to anchor
to, so `players.isEmpty` ends the run exactly as chapter 08 did. Chapter 14
adds the PvP version, where the anchor is a spawn point instead.

The respawned ship comes with a fresh `CameraRig` because `spawnPlayer` adds
one — the camera snaps to the new ship rather than swinging across from
where the old one died. That's the right call for a respawn.

---

## One view per seat

The renderer has always taken one camera, one HUD, one grid focus. Now it
takes a list, and every entry is a rectangle of the screen with its own.

**`Game.swift`** — replace `FrameRenderData`:

```swift
/// A rectangle of the drawable, in pixels from the top-left.
struct ViewportRect {
    var origin: SIMD2<Float>
    var size: SIMD2<Float>
}

/// One player's view of the frame: where on the screen, through which camera,
/// with which HUD.
struct ViewportFrame {
    var rect: ViewportRect
    var frame: FrameUniforms
    var focus: Vec3
    var hud: [HUDVertex]
}

/// Everything the renderer needs for one frame: the instances once, and a
/// view per player.
struct FrameRenderData {
    var instances: [MeshID: [InstanceData]]
    var views: [ViewportFrame]
}
```

The instances — every entity's model matrix and colour — are the same from
every seat, so they're built once and shared. What differs per seat is the
camera and the HUD, and that's what a `ViewportFrame` is.

**`Game.swift`** — replace `frame`, and add `view(forSlot:)`,
`splitScreen` and `slot(of:)` after it:

```swift
    /// Everything the renderer needs, blended `clock.alpha` of the way into
    /// the step that hasn't happened yet. Presentation state advances here, by
    /// real time — once per seat.
    func frame(viewport: SIMD2<Float>, realDt: Float) -> FrameRenderData {
        let alpha = clock.alpha
        for slot in 0..<playerCount {
            let stats = stats[slot]
            stats.hitFlash = max(0, stats.hitFlash - realDt)
            stats.toastTime = max(0, stats.toastTime - realDt)
        }
        for event in effects {
            switch event {
            case .damaged(let e, _, _):
                if let slot = slot(of: e) {
                    stats[slot].hitFlash = 0.5
                    stats[slot].pendingShake = 1
                }
            case .pickedUp(let e, let kind):
                if let slot = slot(of: e) {
                    stats[slot].toast = Toast(text: Toast.name(of: kind), kind: kind)
                    stats[slot].toastTime = 1.5
                }
            default:
                break
            }
        }
        effects.removeAll(keepingCapacity: true)

        let instances = SceneSystem.buildInstances(world, alpha: alpha)
        let rects = Self.splitScreen(viewport, into: playerCount)
        var views: [ViewportFrame] = []
        for slot in 0..<playerCount {
            views.append(view(forSlot: slot, rect: rects[slot], alpha: alpha, realDt: realDt))
        }
        return FrameRenderData(instances: instances, views: views)
    }
```

The event loop no longer asks "was it *the* player" but "whose seat was
it", and routes the flash or the toast to that seat's flags. Then one view
per seat.

**`Game.swift`**, in `Game` — after `frame`:

```swift
    /// One seat's picture: its own camera if its ship is alive, a teammate's
    /// if not, and its own HUD either way.
    private func view(forSlot slot: Int, rect: ViewportRect, alpha: Float, realDt: Float) -> ViewportFrame {
        let viewport = rect.size
        let aspect = viewport.x / max(viewport.y, 1)
        let own = player(inSlot: slot)
        // A dead seat watches a teammate who has a camera to lend — a local
        // ship does, a chapter 13 ghost doesn't — and failing that keeps its
        // last view, so the wreck is seen from where the pilot was.
        let eyeOwner = own ?? players.first { world.get(CameraRig.self, $0) != nil }

        var view = Math.identity
        var eye = Vec3.zero
        var fov = CameraRig.baseFov
        var focus = Vec3.zero
        if let eyeOwner {
            if eyeOwner == own {
                CameraSystem.update(
                    world, player: eyeOwner, alpha: alpha, realDt: realDt, stats: stats[slot],
                    rng: &presentationRng)
            }
            (view, eye) = CameraSystem.viewMatrix(world, player: eyeOwner, alpha: alpha)
            fov = world.get(CameraRig.self, eyeOwner)?.fov ?? fov
            focus = world.get(Transform.self, eyeOwner)?.position ?? .zero
            lastCameras[slot] = (view, eye, fov, focus)
        } else if let last = lastCameras[slot] {
            (view, eye, fov, focus) = last
        }
        let projection = Math.perspective(
            fovyRadians: fov.radians, aspect: max(aspect, 0.01), near: 0.1, far: 1200)
        let viewProjection = projection * view
        let frame = FrameUniforms(
            viewProjection: viewProjection, cameraPosition: eye, lightDirection: lightDirection)

        let health = own.flatMap { world.get(Health.self, $0) }
        var hud = HUDSystem.build(HUDInput(
            stats: stats[slot], run: run,
            hull: health.map { max(0, min($0.current / $0.max, 1)) } ?? 0,
            hullPoints: max(0, health?.current ?? 0),
            wave: director.wave, breather: director.phase == .breather,
            loadout: own.flatMap { world.get(Loadout.self, $0) } ?? Loadout(),
            viewport: viewport,
            reticle: own.map { reticle(for: $0, viewProjection: viewProjection, alpha: alpha) } ?? Reticle(),
            flight: own.flatMap { flightDebug(for: $0, slot: slot) }))
        if own == nil && !isOver {
            HUDSystem.text("DESTROYED - RESPAWNING", at: SIMD2(viewport.x / 2, viewport.y * 0.5), size: 30,
                           color: Vec4(1, 0.5, 0.4, 0.9), align: .center, into: &hud, viewport)
        }
        return ViewportFrame(rect: rect, frame: frame, focus: focus, hud: hud)
    }
```

This is chapter 09's `frame` body with one question added at the top: *is
this seat's ship alive?* If it is, everything is as before — its rig is
advanced, its camera is used, its HUD drawn, and the camera is remembered.
If it isn't, the seat borrows the first living teammate's camera (without
advancing that rig a second time — the teammate's own view does that) and
draws an empty HUD with a message. Three seconds of watching your friend fly
is the respawn timer. With no teammate to borrow from — you're alone, or
everyone's dead — the seat keeps the last camera it had, which is chapter
08's `lastCamera` grown into an array: one wreck watched from where each
pilot was. The `CameraRig` check on the candidate is a forward reference:
chapter 13's remote players are drawn without a rig, and a camera hung off
an entity that has none is the identity matrix, at the origin. The HUD
string uses a plain hyphen because chapter 09's atlas is ASCII only; an em
dash there is silently skipped.

The aspect ratio comes from the *rect*, not the window. A half-height view
is twice as wide as it is tall, and a camera that didn't know would draw
everything squashed.

**`Game.swift`**, in `Game` — after `view(forSlot:)`:

```swift
    /// One player gets the whole drawable; two stack top and bottom; more tile.
    static func splitScreen(_ viewport: SIMD2<Float>, into count: Int) -> [ViewportRect] {
        switch count {
        case 1:
            return [ViewportRect(origin: .zero, size: viewport)]
        case 2:
            let half = SIMD2<Float>(viewport.x, viewport.y / 2)
            return [ViewportRect(origin: .zero, size: half), ViewportRect(origin: SIMD2(0, half.y), size: half)]
        default:
            let columns = 2
            let rows = (count + 1) / 2
            let cell = SIMD2<Float>(viewport.x / Float(columns), viewport.y / Float(rows))
            return (0..<count).map { i in
                ViewportRect(origin: SIMD2(Float(i % columns) * cell.x, Float(i / columns) * cell.y), size: cell)
            }
        }
    }

    private func slot(of entity: Entity) -> Int? {
        world.get(PlayerSlot.self, entity).map { Int($0.index) }
    }
```

Top and bottom for two, because a wide window cut in half horizontally
gives each seat the aspect of a cinema screen, which suits a flight game
better than two tall slivers. Three or four tile in a grid.

**`Game.swift`**, in `Game` — the two HUD helpers take the player they're
about:

```diff
-    private func reticle(viewProjection: Mat4, alpha: Float) -> Reticle {
+    private func reticle(for player: Entity, viewProjection: Mat4, alpha: Float) -> Reticle {
         guard let current = world.get(Transform.self, player),
```

```diff
-    private func flightDebug() -> FlightDebug? {
+    private func flightDebug(for player: Entity, slot: Int) -> FlightDebug? {
         guard showFlightDebug,
             let av = world.get(AngularVelocity.self, player),
             let model = world.get(FlightModel.self, player),
             let engine = world.get(Engine.self, player)
         else { return nil }
+        let lastInput = lastInputs[slot]
         return FlightDebug(
```

---

## The renderer draws it twice

This is the second and last chapter that edits `Render/`, and the edit is
one loop.

**`Sources/SpaceFighter/Render/Renderer.swift`** — replace `render`:

```swift
    /// Draw the same instances once per view, each clipped to its rectangle
    /// of the drawable and seen through its own camera.
    func render(in view: MTKView, instances: [MeshID: [InstanceData]], views: [ViewportFrame]) {
        guard let rpd = view.currentRenderPassDescriptor,
            let drawable = view.currentDrawable,
            let command = rhi.queue.makeCommandBuffer(),
            let encoder = command.makeRenderCommandEncoder(descriptor: rpd)
        else {
            return
        }

        encoder.setCullMode(.none)
        for v in views {
            let rect = v.rect
            encoder.setViewport(MTLViewport(
                originX: Double(rect.origin.x), originY: Double(rect.origin.y),
                width: Double(rect.size.x), height: Double(rect.size.y), znear: 0, zfar: 1))
            encoder.setScissorRect(MTLScissorRect(
                x: Int(rect.origin.x), y: Int(rect.origin.y),
                width: Int(rect.size.x), height: Int(rect.size.y)))

            var frame = v.frame
            drawGrid(encoder, frame: &frame, focus: v.focus)
            drawStars(encoder, frame: &frame)
            drawLit(encoder, frame: &frame, instances: instances)
            drawGlow(encoder, frame: &frame, instances: instances)
            drawHUD(encoder, v.hud)
        }

        encoder.endEncoding()
        command.present(drawable)
        command.commit()
    }
```

Two Metal calls the first guide never needed. `setViewport` says where in
the drawable normalised device coordinates −1…1 land — so the same NDC the
HUD has always drawn in now means "this seat's rectangle", and every HUD
element lands in the right half without knowing there are halves.
`setScissorRect` says which pixels may be *written*, which stops one seat's
starfield, drawn as points that can fall anywhere, from spilling into the
other's. Both are encoder state and are simply set again for the next view;
the same command buffer, the same render pass, the same depth buffer. The
depth buffer is shared too, and that's fine, because the scissor keeps the
views from ever touching the same pixel.

The instanced draws run once per view, so two seats cost two draws of the
world. For this game's few hundred instances that's nothing; a game with a
real scene would render both views into one wide pass with a vertex shader
that knows about layers, and Metal has a feature for exactly that (vertex
amplification). Chapter 15 mentions it.

---

## The session passes them through

`Screen.update` takes a frame per seat now. The edge detection stays on
seat 0 — menus are driven by one person — and the game screen hands the
whole array to `advance`.

**`Sources/SpaceFighter/App/Session.swift`**, in `Screen`:

```diff
-    /// `pressed` holds the buttons that went down this frame and weren't down
-    /// last frame — the edges — so a menu moves one row per press.
-    func update(input: InputFrame, pressed: Buttons, realDt: Float) -> Transition?
+    /// `inputs` is one frame per seat. `pressed` holds the buttons of seat 0
+    /// that went down this frame and weren't down last frame — the edges —
+    /// so a menu moves one row per press.
+    func update(inputs: [InputFrame], pressed: Buttons, realDt: Float) -> Transition?
```

**`Session.swift`**, in `Session` — a seat count, threaded to the game:

```diff
     private var nextSeed: UInt64
     private let recordRuns: Bool
+    private let playerCount: Int
     private var lastButtons: Buttons = []

-    init(seed: UInt64, ship: ShipDefinition, record: Bool) {
+    init(seed: UInt64, ship: ShipDefinition, record: Bool, playerCount: Int = 1) {
         nextSeed = seed
         recordRuns = record
+        self.playerCount = playerCount
```

```diff
-            let game = Game(seed: nextSeed, ship: ship)
+            let game = Game(seed: nextSeed, ship: ship, playerCount: playerCount)
             nextSeed &+= 1
```

**`Session.swift`** — replace `update`:

```swift
    /// Single-seat convenience.
    func update(input: InputFrame, realDt: Float, viewport: SIMD2<Float>) -> FrameRenderData {
        update(inputs: [input], realDt: realDt, viewport: viewport)
    }

    func update(inputs: [InputFrame], realDt: Float, viewport: SIMD2<Float>) -> FrameRenderData {
        let first = inputs.first ?? InputFrame()
        let pressed = first.buttons.subtracting(lastButtons)
        lastButtons = first.buttons
        if let transition = screen.update(inputs: inputs, pressed: pressed, realDt: realDt) {
            apply(transition)
        }
        return screen.render(viewport: viewport, realDt: realDt)
    }
```

Then the five screens. Four of them change one line:

**`App/Screens/TitleScreen.swift`, `ShipSelectScreen.swift`,
`PausedScreen.swift`, `SummaryScreen.swift`** — in each `update`:

```diff
-    func update(input: InputFrame, pressed: Buttons, realDt: Float) -> Transition? {
+    func update(inputs: [InputFrame], pressed: Buttons, realDt: Float) -> Transition? {
```

**`App/Screens/PlayingScreen.swift`**, in `update`:

```diff
-    func update(input: InputFrame, pressed: Buttons, realDt: Float) -> Transition? {
+    func update(inputs: [InputFrame], pressed: Buttons, realDt: Float) -> Transition? {
         if pressed.contains(.pause) && !game.isOver { return .pause }
-        game.advance(realDt: realDt, input: input)
+        game.advance(realDt: realDt, inputs: inputs)
```

The two screens that draw *over* the game draw over every view, so a paused
split-screen says `PAUSED` in both halves:

**`App/Screens/PausedScreen.swift`** — replace `render`:

```swift
    func render(viewport: SIMD2<Float>, realDt: Float) -> FrameRenderData {
        var data = game.frame(viewport: viewport, realDt: 0)
        for i in data.views.indices {
        let vp = data.views[i].rect.size
        var hud = data.views[i].hud
        HUDSystem.appendRect(&hud, cx: 0, cy: 0, hw: 1, hh: 1, color: Vec4(0, 0, 0.02, 0.55))
        HUDSystem.text("PAUSED", at: SIMD2(vp.x / 2, vp.y * 0.42), size: 56,
                       color: Vec4(0.92, 0.95, 1.0, 1), align: .center, into: &hud, vp)
        HUDSystem.text("ESC RESUMES   BACKSPACE ABANDONS THE RUN", at: SIMD2(vp.x / 2, vp.y * 0.52), size: 20,
                       color: Vec4(0.6, 0.6, 0.7, 0.9), align: .center, into: &hud, vp)
        data.views[i].hud = hud
        }
        return data
    }
```

**`App/Screens/SummaryScreen.swift`** — replace `render`:

```swift
    func render(viewport: SIMD2<Float>, realDt: Float) -> FrameRenderData {
        var data = game.frame(viewport: viewport, realDt: realDt)
        for i in data.views.indices {
        let vp = data.views[i].rect.size
        var hud = data.views[i].hud
        let r = game.run
        let white = Vec4(0.92, 0.95, 1.0, 1)
        let dim = Vec4(0.6, 0.6, 0.7, 0.9)
        HUDSystem.appendRect(&hud, cx: 0, cy: 0, hw: 1, hh: 1, color: Vec4(0, 0, 0.02, 0.6))
        HUDSystem.text("RUN OVER", at: SIMD2(vp.x / 2, vp.y * 0.24), size: 56, color: white,
                       align: .center, into: &hud, vp)

        let rows: [(String, String)] = [
            ("SHIP", game.ship.name.uppercased()),
            ("SCORE", "\(r.score)"),
            ("WAVE", "\(r.wave)"),
            ("KILLS", "\(r.kills)"),
            ("ACCURACY", "\(Int((r.accuracy * 100).rounded()))%"),
            ("TIME", String(format: "%d:%02d", Int(r.seconds) / 60, Int(r.seconds) % 60)),
        ]
        for (row, (label, value)) in rows.enumerated() {
            let y = vp.y * 0.36 + Float(row) * 40
            HUDSystem.text(label, at: SIMD2(vp.x * 0.42, y), size: 24, color: dim, align: .right, into: &hud, vp)
            HUDSystem.text(value, at: SIMD2(vp.x * 0.46, y), size: 24, color: white, into: &hud, vp)
        }
        HUDSystem.text("ENTER FLIES AGAIN   ESC TO TITLE", at: SIMD2(vp.x / 2, vp.y * 0.9), size: 20,
                       color: dim, align: .center, into: &hud, vp)
        data.views[i].hud = hud
        }
        return data
    }
```

Both bodies are chapter 10's, wrapped in a loop over the views with the
overlay positioned by each view's own size. The indentation is deliberately
left flat inside the loop so the diff against chapter 10 is small: the two
wrapper lines, `vp` and `hud` taken from the view instead of the argument,
the write-back, and the `&hud`s.

**`App/MenuWorld.swift`**, in `render` — the menu world is one view:

```diff
         return FrameRenderData(
-            frame: frame,
             instances: SceneSystem.buildInstances(world, alpha: 1),
-            focus: Vec3(0, 6, 0),
-            hud: hud)
+            views: [ViewportFrame(
+                rect: ViewportRect(origin: .zero, size: viewport), frame: frame, focus: Vec3(0, 6, 0), hud: hud)])
```

**`Sources/SpaceFighter/GameView.swift`**, in `RenderCoordinator` — a
source per seat:

```diff
     private let session: Session
     private let renderer: Renderer
-    private let input: InputSource
+    private let inputs: [InputSource]  // one per seat
     private var lastTime: CFTimeInterval
     private var announcedReplayEnd = false

-    init(session: Session, renderer: Renderer, input: InputSource) {
+    init(session: Session, renderer: Renderer, inputs: [InputSource]) {
         self.session = session
         self.renderer = renderer
-        self.input = input
+        self.inputs = inputs
```

```diff
-        let frame = input.poll(dt: dt)
-        let data = session.update(input: frame, realDt: dt, viewport: viewport)
+        let frames = inputs.map { $0.poll(dt: dt) }
+        let data = session.update(inputs: frames, realDt: dt, viewport: viewport)
```

```diff
-        renderer.render(
-            in: view,
-            frame: data.frame,
-            instances: data.instances,
-            focus: data.focus,
-            hud: data.hud)
+        renderer.render(in: view, instances: data.instances, views: data.views)
```

---

## A second seat at the keyboard

**`Sources/SpaceFighter/Input/KeyBindings.swift`**, in `Key` — after `enter`:

```diff
     static let enter: UInt16 = 36
+    static let i: UInt16 = 34
+    static let j: UInt16 = 38
+    static let k: UInt16 = 40
+    static let l: UInt16 = 37
+    static let u: UInt16 = 32
+    static let o: UInt16 = 31
+    static let y: UInt16 = 16
+    static let h: UInt16 = 4
+    static let n: UInt16 = 45
+    static let b: UInt16 = 11
+    static let semicolon: UInt16 = 41
```

**`KeyBindings.swift`**, in `KeyBindings` — after `standard`:

```diff
     static let standard = KeyBindings()
+
+    /// A second seat on the same keyboard: the right hand's home row.
+    static let secondary = KeyBindings(
+        pitchUp: [Key.k], pitchDown: [Key.i],
+        rollLeft: [Key.j], rollRight: [Key.l],
+        yawLeft: [Key.u], yawRight: [Key.o],
+        throttleUp: [Key.y], throttleDown: [Key.h],
+        buttons: [
+            (.fire, [Key.n]),
+            (.boost, [Key.semicolon]),
+            (.missile, [Key.b]),
+        ])
 }
```

`IJKL` where the first seat has `WASD`, `U`/`O` for the rudder, `N` to
fire. No menu buttons — seat 1 doesn't drive menus — and no `Shift` boost,
because a modifier key can't tell which hand pressed it. Chapter 03's
bindings table earns its keep here: a second seat is a second *table*, and
the `KeyboardSource` doesn't change at all.

**`Sources/SpaceFighter/main.swift`**, in `LaunchOptions`:

```diff
     var ship: ShipDefinition = Ships.all[1]
+    var players = 1
```

```diff
+            case ("--players", let n?): players = min(max(Int(n) ?? 1, 1), 4); i += 2
             case ("--ship", let name?):
```

**`main.swift`** — the session learns the seat count:

```diff
-let session = Session(seed: options.seed, ship: options.ship, record: options.record != nil)
+let session = Session(
+    seed: options.seed, ship: options.ship, record: options.record != nil, playerCount: options.players)
```

**`main.swift`** — replace the four input lines through `let input = …`:

```swift
let keyboard = KeyboardSource()
let mouse = MouseSource()
let gamepad = GamepadSource()
let secondKeyboard = KeyboardSource()
secondKeyboard.bindings = .secondary
/// Seat 0 gets everything; seat 1 gets the right hand of the keyboard.
let inputs: [InputSource] = [InputMixer(sources: [keyboard, mouse, gamepad]), secondKeyboard]
```

```diff
-let coordinator = RenderCoordinator(session: session, renderer: renderer, input: input)
+let coordinator = RenderCoordinator(
+    session: session, renderer: renderer, inputs: Array(inputs.prefix(options.players)))
```

**`main.swift`**, in the key monitor — both keyboards see every key:

```diff
         keyboard.keyDown(event.keyCode)
+        secondKeyboard.keyDown(event.keyCode)
         return nil
     case .keyUp:
         if event.modifierFlags.contains(.command) { return event }
         keyboard.keyUp(event.keyCode)
+        secondKeyboard.keyUp(event.keyCode)
         return nil
```

Two `KeyboardSource`s fed the same events, each reading only the keys its
table names. The seats *don't* overlap — `WASD` isn't in the secondary table,
`IJKL` isn't in the standard one — so there's no filtering to do. With
`--players 1`, the second keyboard is built and never polled, which costs
nothing.

---

## The tests

Chapter 10's pause test read `data.hud`; there's a `views` array now.

**`Tests/SpaceFighterTests/Ch10SessionTests.swift`**, in
`pauseFreezesTheClockButNotThePicture`:

```diff
-        #expect(!data.hud.isEmpty)
+        #expect(!data.views[0].hud.isEmpty)
```

Chapters 05 and 06 read `game.stats.hitFlash` and `game.stats.pendingShake`;
`stats` is an array now, and those tests mean seat 0:

**`Tests/SpaceFighterTests/Ch05CameraTests.swift`** and
**`Ch06CollisionTests.swift`** — everywhere:

```diff
-game.stats.hitFlash
+game.stats[0].hitFlash
```

```diff
-game.stats.pendingShake
+game.stats[0].pendingShake
```

(Three `hitFlash` sites and two `pendingShake` sites in the camera tests,
one `hitFlash` in the collision tests.)

**`Tests/SpaceFighterTests/Ch11PlayersTests.swift`** — new file:

```swift
import Testing
import simd

@testable import SpaceFighter

private let dt = SimulationClock.step
private let viewport = SIMD2<Float>(1600, 1000)

private func twoPlayerGame() -> Game {
    let game = Game(seed: 2, ship: Ships.all[1], playerCount: 2)
    game.director.phase = .fighting
    return game
}

@Test func twoPlayersGetTwoSlotsAndTwoCameras() {
    let game = twoPlayerGame()
    #expect(game.players.count == 2)
    let slots = game.players.compactMap { game.world.get(PlayerSlot.self, $0)?.index }
    #expect(slots == [0, 1])
    #expect(game.players.allSatisfy { game.world.get(CameraRig.self, $0) != nil })
    let a = game.world.get(Transform.self, game.players[0])!.position
    let b = game.world.get(Transform.self, game.players[1])!.position
    #expect(simd_length(a - b) > 5, "they don't spawn inside each other")
}

@Test func eachPlayerFliesOnTheirOwnInput() {
    let game = twoPlayerGame()
    var second = InputFrame()
    second.roll = 1
    for _ in 0..<60 { game.step(inputs: [InputFrame(), second], dt: dt) }
    let up0 = game.world.get(Transform.self, game.players[0])!.up
    let up1 = game.world.get(Transform.self, game.players[1])!.up
    #expect(simd_dot(up0, Vec3(0, 1, 0)) > 0.99, "player one flew level")
    #expect(simd_dot(up1, Vec3(0, 1, 0)) < 0.5, "player two rolled")
}

@Test func theFrameSplitsTheScreen() {
    let game = twoPlayerGame()
    let data = game.frame(viewport: viewport, realDt: dt)
    #expect(data.views.count == 2)
    #expect(data.views[0].rect.size.y == viewport.y / 2 && data.views[1].rect.size.y == viewport.y / 2)
    #expect(data.views[0].rect.origin.y == 0 && data.views[1].rect.origin.y == viewport.y / 2)
    #expect(!data.views[0].hud.isEmpty && !data.views[1].hud.isEmpty)
    let single = Game(seed: 2, ship: Ships.all[1]).frame(viewport: viewport, realDt: dt)
    #expect(single.views.count == 1 && single.views[0].rect.size == viewport)
}
```

**`Ch11PlayersTests.swift`** — after `theFrameSplitsTheScreen`:

```swift
@Test func enemiesGoForTheNearestPlayer() {
    let game = twoPlayerGame()
    let world = game.world
    // Player two off to the side and flying away; a chaser nearer to them than
    // to player one, side-on to both, inside the director's 280-unit cull.
    world.store(Transform.self).mutate(game.players[1]) {
        $0.position = Vec3(200, 0, 0)
        $0.rotation = Quat(angle: .pi, axis: Vec3(0, 1, 0))
    }
    let chaser = spawnEnemy(in: world, kind: .chaser, at: Vec3(150, 0, -100),
                            rotation: Math.lookRotation(forward: Vec3(1, 0, 0)), wave: 1)
    for _ in 0..<120 { game.step(inputs: [InputFrame(), InputFrame()], dt: dt) }
    guard world.isAlive(chaser), let ct = world.get(Transform.self, chaser) else {
        Issue.record("the chaser did not survive the test")
        return
    }
    let p1 = world.get(Transform.self, game.players[1])!.position
    let p0 = world.get(Transform.self, game.players[0])!.position
    #expect(simd_dot(ct.forward, simd_normalize(p1 - ct.position)) > 0.5, "it turned toward player two")
    #expect(simd_dot(ct.forward, simd_normalize(p0 - ct.position)) < 0.5, "and not toward player one")
}

@Test func aDeadPlayerRespawnsBesideALivingOne() {
    let game = twoPlayerGame()
    let first = game.players[0]
    game.world.store(Health.self).mutate(first) { $0.current = 0 }
    game.step(inputs: [InputFrame(), InputFrame()], dt: dt)
    #expect(game.players.count == 1)
    #expect(!game.isOver, "one of you is still flying")
    for _ in 0..<Int(Game.respawnDelay / dt) + 2 { game.step(inputs: [InputFrame(), InputFrame()], dt: dt) }
    #expect(game.players.count == 2)
    let slots = game.players.compactMap { game.world.get(PlayerSlot.self, $0)?.index }
    #expect(slots == [0, 1])
    #expect(game.players[0] != first, "a new entity in the old slot")
}

@Test func theRunEndsOnlyWhenEveryoneIsGone() {
    let game = twoPlayerGame()
    for p in game.players { game.world.store(Health.self).mutate(p) { $0.current = 0 } }
    game.step(inputs: [InputFrame(), InputFrame()], dt: dt)
    #expect(game.players.isEmpty)
    #expect(!game.isOver, "not yet: the wreckage gets its moment")
    for _ in 0..<Int(Game.overDelay / dt) + 2 { game.step(inputs: [InputFrame(), InputFrame()], dt: dt) }
    #expect(game.isOver)
    #expect(game.players.isEmpty, "and nobody came back")
}

@Test func aDeadSeatWithNobodyToWatchKeepsItsLastCamera() {
    let game = Game(seed: 2, ship: Ships.all[1])
    game.director.phase = .fighting
    for _ in 0..<60 { game.step(input: InputFrame(), dt: dt) }
    let before = game.frame(viewport: viewport, realDt: dt).views[0].frame.cameraPosition
    game.world.store(Health.self).mutate(game.player) { $0.current = 0 }
    game.step(input: InputFrame(), dt: dt)
    let after = game.frame(viewport: viewport, realDt: dt).views[0].frame.cameraPosition
    #expect(simd_length(after - before) < 1, "the camera stays where the pilot was: \(after)")
    #expect(simd_length(after) > 1, "not at the origin")
}
```

Seven tests: separate input, separate viewports, enemies that don't care
which of you they chase, the co-op rule, the end of the run, and the camera
a dead seat keeps. `enemiesGoForTheNearestPlayer` didn't need a line of new
code to pass — chapter 07's `nearestPlayer` was already a loop — which is
the kind of test worth writing anyway, because it pins the behaviour down
before chapter 14 gives PvP a reason to change it. Its geometry is fussier
than it looks: the chaser has to start inside the director's 280-unit cull
of the lead player, and the player it goes for has to fly *away*, or the two
ram before the assertion runs. The first version of this test did exactly
that, and passed by bailing out of its `guard` — hence the `Issue.record`.

---

## Checkpoint

```console
$ swift test
✔ Test run with 69 tests in 0 suites passed
```

**Sixty-nine tests.** Then bring a friend, or use both hands:

```console
$ swift run SpaceFighter --players 2
```

1. **The hangar is unchanged** — one person picks, both fly the pick. Enter.
2. **Two views**, top and bottom, each with its own reticle, hull bar and
   flash. `WASD` flies the top one; `IJKL` flies the bottom one. Fire with
   `Space` and `N`.
3. **Enemies split their attention.** Fly apart and the chasers go for
   whoever's closer. Wave text and score are the same in both views: one
   run, two pilots.
4. **Die.** Your half says `DESTROYED - RESPAWNING` over your teammate's
   view for three seconds, then you're back beside them with a fresh ship.
   Both of you die and each half holds its own last view while the wreckage
   flies; then it's the summary, in both halves.
5. **Pause** with Escape and both halves say so.

**If both ships fly on `WASD`**, the second `KeyboardSource` isn't using
`.secondary`. **If the bottom view is squashed**, the aspect is being taken
from the window rather than the rect. **If one seat's stars streak across
the other's view**, `setScissorRect` is missing. **If a dead seat's view
goes black**, `eyeOwner` is falling back to `nil` — check `players.first`.
**If `swift test` fails on `data.hud`**, the chapter 10 test wasn't updated.

---

## Challenge

Let each seat choose its own ship. `Session.selectedShip` becomes an array,
the hangar takes both seats' `menuLeft`/`menuRight` (the second seat's table
needs those bits), `Game.init` takes `[ShipDefinition]`, and a respawn gives
a seat *its* ship back. Three things to get right: the hangar has to show
two ships, or one at a time with a "seat 2" marker; a seat that hasn't
picked yet needs a default; and `InputLog`'s ship field is a single byte,
which is your third format change — decide whether a recording stays
seat-0-only or grows a per-seat header.

---

**Next:** what a packet has to say. →
[Chapter 12: Netcode: the shape of the problem](12-netcode-the-shape-of-the-problem.md)

---

*Back to the [guide map](../README.md) · references in [`resources.md`](../resources.md)*
