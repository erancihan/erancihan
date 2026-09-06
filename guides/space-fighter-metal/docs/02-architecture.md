# 02 · Architecture 🧠🛠️

> **You'll leave this chapter with:** the reasoning behind every directory in
> chapter 01's tree, a working vocabulary borrowed from Unreal, and one test that
> stops the layers leaking into each other for the rest of the guide.
>
> **Files created:** `Tests/SpaceFighterTests/BoundaryTests.swift`
> **Files changed:** `Package.swift`

Chapter 01 gave you a tree and asked you to trust it. This chapter earns it.

The questions worth answering before you write a line of Metal: where does a
ship's geometry live, who owns it, and what stops the renderer from reaching into
the game? Every engine answers those three, and the answers are more alike than
the marketing suggests. Borrowing the vocabulary costs nothing and buys you a
map you can carry to Unreal, Unity or Godot afterwards.

---

## Two families of engine

**Actor–component.** Unreal's `AActor` and Unity's `GameObject` are containers.
An actor holds a transform and a list of components, and behaviour hangs off
both: `AActor::Tick()` runs every frame, and components like
`UCharacterMovementComponent` bring their own. Inheritance is real and used —
`ACharacter` inherits from `APawn` inherits from `AActor`. It is comfortable,
it is what most tutorials teach, and it is genuinely good at *a few hundred
elaborate things*.

**ECS.** An entity is an id. Components are plain data with no methods. Systems
are functions that sweep every entity holding a given set of components. Nothing
inherits from anything. It is worse at "one elaborate hero object" and much
better at *thousands of simple things*.

This project fires a bolt every 0.14 seconds and spawns enemies in waves. Ten
seconds in, most of what exists is a small struct that moves in a straight line
and expires. That is the workload ECS is for, so that is what we build.

It is worth knowing that Unreal agrees. Per-actor `Tick()` stops scaling somewhere
in the low thousands, so Epic shipped a second framework — **Mass Entity** —
alongside the actor system, for crowds and projectiles. Its `FMassFragment` is a
component, its `UMassProcessor` is a system, and its folders are flat:
`Fragments/`, `Processors/`. No per-actor directories. When Unreal needs what we
need, it builds what we are building.

---

## Where the geometry lives

Here is the chain Unreal actually uses to put a mesh on screen:

```
APlayerShip (Actor)
  └─ UStaticMeshComponent      component — holds a pointer
       └─ UStaticMesh*         asset — shared, refcounted, loaded from disk
            └─ FStaticMeshRenderData → GPU vertex buffers
```

The actor holds **zero vertices**. It holds a component, and the component holds
a *pointer* to an asset that any number of other components also point at. Unity
is the same shape (`GameObject` → `MeshFilter` → `Mesh` asset); so is Godot
(`MeshInstance3D` → `Mesh` resource). No mainstream engine puts geometry on the
actor, and the reasons are worth spelling out because they are the reasons for
our tree:

**Cardinality.** Two hundred enemies share one mesh. Per-entity you store a
matrix and a colour — 80 bytes — not a copy of the geometry.

**Lifetime.** Meshes upload to the GPU once, at startup. Entities spawn and die
inside a frame. If an entity owned its mesh, spawning a bolt would allocate a GPU
buffer in the hot path.

**Ownership.** The vertices are the renderer's business. Gameplay should be able
to say "draw the ship one" without holding anything Metal can touch.

Our version of that chain, which you'll build over chapters 06 to 09:

| Unreal | This project | Lives in |
|---|---|---|
| `AActor` | `Entity` + the component stores in `World` | `ECS/` |
| `UActorComponent` | a component struct | `Components/` |
| `USceneComponent`'s transform | `Transform` | `Components/Spatial.swift` |
| `UStaticMeshComponent` | `Renderable` | `Components/Rendering.swift` |
| `UStaticMesh*` | `MeshID` | `Content/MeshID.swift` |
| the `.uasset` payload | `Mesh` | `Render/Types/Mesh.swift` |
| `FStaticMeshSceneProxy` | `InstanceData` | `Render/Types/GPUContract.swift` |
| the render-thread buffers | `GPUMesh` | `Render/MeshRegistry.swift` |
| `BP_PlayerShip` | `Archetypes/Player.swift` | `Archetypes/` |
| `UMovementComponent`'s tick | `MovementSystem` | `Systems/` |

`Renderable { mesh: MeshID }` **is** `UStaticMeshComponent`, minus the
refcounting. When you write that struct in chapter 09 it will look too small to
matter. It is the same seam a commercial engine draws, in one line.

---

## Source and Content are different trees

Look at how an Unreal project is laid out on disk:

```
MyGame/Source/MyGame/Ships/PlayerShip.h  .cpp     ← code: behaviour
MyGame/Content/Meshes/SM_PlayerShip.uasset        ← art: geometry
```

Unreal **does** put code in per-feature folders — `Ships/`, `Weapons/`,
`Enemies/`. That instinct is sound and we borrow it for `Archetypes/`. What
Unreal never does is put `SM_PlayerShip` inside `Source/MyGame/Ships/`. Art lives
in its own tree, addressed by asset path, and code refers to it by reference.

`Content/` is that tree. It happens to be written in Swift, because this project
generates its geometry in code instead of loading `.obj` files — but it is
content, not engine and not gameplay. `Content/Meshes/ShipMesh.swift` occupies
exactly the slot `Content/Meshes/SM_Ship.uasset` occupies in an Unreal project,
and chapter 15 shows how to swap one for the other without touching anything
else.

This is also why there is no `Ships/ShipMesh.swift` sitting next to a
`Ships/Ship.swift`. A file like that reads as "the ship owns its geometry," and
it doesn't — the mesh outlives every ship, is shared by all of them, and belongs
to the renderer once uploaded. Grouping by actor would make the tree tell a lie.

One consequence to notice, because it looks like a layering violation and isn't:
`Components/Rendering.swift` refers to `Content/MeshID.swift`. Gameplay depends
on content. That is correct and it is what Unreal does too — a component holding
a `UStaticMesh*` is a gameplay object holding a content reference. What must not
happen is the reverse.

---

## The archetype

In Unreal, `APlayerShip`'s C++ constructor says only that a mesh component
exists:

```cpp
APlayerShip::APlayerShip() {
    MeshComp = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Mesh"));
    RootComponent = MeshComp;
}
```

*Which* mesh, what collision radius, how fast it flies — none of that is in the
code. It lives in `BP_PlayerShip`, a Blueprint class asset holding a component
list, default values and asset references. That is a **prefab**, and it is a
first-class file.

Our equivalent is a function that assembles an entity:

```swift
// Archetypes/Player.swift — you'll write this in chapter 09
@discardableResult
func spawnPlayer(in world: World) -> Entity {
    let e = world.createEntity()
    world.add(Transform(), to: e)
    world.add(Velocity(), to: e)
    world.add(Player(), to: e)
    world.add(Weapon(), to: e)
    world.add(Renderable(mesh: .ship, color: Vec4(0.82, 0.9, 1.0, 1)), to: e)
    world.add(Collider(radius: 1.3, layer: .player, mask: .enemy), to: e)
    return e
}
```

Component list, defaults, asset reference. It is a Blueprint written in Swift.

The reason it gets its own file rather than living in `Game.swift` is that
`Game.swift` has a different job — it owns the world and the order the systems
run in, and that order *is* the game's logic. By chapter 12 there are three
archetypes and eight systems. Mixing "what a bolt is made of" into "what happens
each frame" makes both harder to read, and only one of them changes when you add
an enemy type.

`Archetypes/` is the one folder in this project organised by actor, and it is
organised by actor because a recipe genuinely belongs to one.

---

## Modules, and why we have exactly one

Unreal's real power here isn't the folder names. It's `.Build.cs`: modules
declare their dependencies, and the build system refuses to compile code that
reaches outside them. Folders suggest; modules enforce.

Swift has the same tool. SwiftPM targets are modules, and the Unreal-shaped
version of this project would look like:

```swift
targets: [
    .target(name: "Core"),
    .target(name: "CoreObject",   dependencies: ["Core"]),
    .target(name: "RenderCore",   dependencies: ["Core"]),
    .target(name: "MetalRHI",     dependencies: ["RenderCore"]),
    .target(name: "Renderer",     dependencies: ["RenderCore", "MetalRHI"]),
    .target(name: "InputCore",    dependencies: ["Core"]),
    .target(name: "Engine",       dependencies: ["CoreObject", "Renderer", "InputCore"]),
    .target(name: "Content",      dependencies: ["RenderCore"]),
    .target(name: "Game",         dependencies: ["Engine", "Content"]),
    .executableTarget(name: "Launch", dependencies: ["Game"]),
]
```

Ten targets, dependencies pointing one way, and a compiler error the moment the
renderer imports the ECS. It is genuinely the better design at scale, and we are
not going to use it. Two concrete reasons:

**`public` everywhere.** Cross-module types need `public` on the type, `public`
on every stored property, and an explicit `public init` — Swift doesn't
synthesise a public memberwise initialiser. `struct Vertex { var position: Vec3;
var normal: Vec3 }` becomes three times the size and says nothing new.

**`Bundle.module` is per-target.** Chapter 07 ships the shaders as package
resources and reads them back through `Bundle.module`, an accessor SwiftPM
synthesises *privately for the target that declares the resource*. Put the
shaders in `Content` and build the pipelines in `Renderer`, and the bundle you
need is not the one you can name. You'd start chapter 08 by plumbing a `Bundle`
across a module boundary instead of drawing a triangle.

Unreal pays the module tax because it has thousands of contributors and a plugin
ABI to keep stable. This project has one contributor and one binary. **One
target.**

Two triggers would change that answer, and neither is here yet: wanting to reuse
the engine in a second project, or build times that hurt. Fourteen chapters of
files is not close to either.

---

## Keeping the seam without the compiler

Dropping to one target drops the enforcement, and enforcement was the point. Two
things get it back, cheaply.

**The first is the shape of the interface.** The renderer's entry point, which
you'll write in chapter 08, takes nothing but plain data:

```swift
func render(in view: MTKView,
            frame: FrameUniforms,
            instances: [MeshID: [InstanceData]],
            focus: Vec3,
            hud: [HUDVertex]) { … }
```

A camera matrix, a dictionary of meshes to copies, a point the scenery arranges
itself around, and a list of 2D vertices. No entities, no components, no `World`.
This is the same trick Unreal plays with `FPrimitiveSceneProxy`: the game
extracts a flat description of what to draw, and the renderer never sees the
objects it came from.

Note the third parameter is `focus` and not `playerPosition`, even though the
player's position is exactly what the caller passes. The renderer has no player.
Naming a parameter after what the callee does with it, rather than where the
caller got it, is a surprisingly large part of keeping a seam a seam.

With an interface shaped like that, leaking gameplay into the renderer requires
*adding a parameter*, which shows up in a diff.

**The second is a test.** Access control can't help — `internal` is
module-wide, so inside one target every file can see every other file. So we
check the rule directly, by reading the source.

**`Package.swift`** — add a test target:

```diff
         .executableTarget(
             name: "SpaceFighter",
             path: "Sources/SpaceFighter"
-        )
+        ),
+        .testTarget(
+            name: "SpaceFighterTests",
+            path: "Tests/SpaceFighterTests"
+        )
     ]
 )
```

**`Tests/SpaceFighterTests/BoundaryTests.swift`** — new file:

```swift
import Foundation
import Testing

/// The layer rules from chapter 02, enforced by reading the source.
///
/// Inside a single module Swift has no way to say "this directory may not see
/// that one", so we say it here instead. These two tests are the whole
/// enforcement mechanism for the architecture, and they cost about a
/// millisecond.

/// Package root, derived from this file's own location.
private let packageRoot = URL(fileURLWithPath: #filePath)
    .deletingLastPathComponent()   // SpaceFighterTests
    .deletingLastPathComponent()   // Tests
    .deletingLastPathComponent()   // SpaceFighter

private func swiftFiles(under relativePath: String) -> [URL] {
    let root = packageRoot.appending(path: relativePath)
    guard let walker = FileManager.default.enumerator(at: root, includingPropertiesForKeys: nil)
    else { return [] }
    return walker.compactMap { $0 as? URL }.filter { $0.pathExtension == "swift" }
}
```

The rule in one direction — the renderer may know about geometry and ids, but not
about the game:

**`BoundaryTests.swift`** — after `swiftFiles`:

```diff
 private func swiftFiles(under relativePath: String) -> [URL] {
     …
 }
+
+/// Gameplay vocabulary. `Render/` is allowed `Mesh`, `MeshID`, `Vertex`,
+/// `InstanceData` and friends — geometry and ids are not gameplay.
+private let gameplayNames = [
+    "World", "Entity", "ComponentStore",
+    "Transform", "Velocity", "Renderable", "Collider",
+    "Player", "Enemy", "Weapon", "Projectile", "Archetype",
+]
+
+@Test func renderLayerKnowsNothingAboutTheGame() throws {
+    for file in swiftFiles(under: "Sources/SpaceFighter/Render") {
+        let source = try String(contentsOf: file, encoding: .utf8)
+        for name in gameplayNames {
+            #expect(
+                !source.contains(name),
+                "\(file.lastPathComponent) mentions \(name) — gameplay leaked into Render/"
+            )
+        }
+    }
+}
```

And the other direction — gameplay and content describe what to draw, but never
talk to the GPU:

**`BoundaryTests.swift`** — after `renderLayerKnowsNothingAboutTheGame`:

```diff
     }
 }
+
+@Test func gameplayNeverTouchesMetal() throws {
+    let directories = [
+        "Sources/SpaceFighter/Components",
+        "Sources/SpaceFighter/Systems",
+        "Sources/SpaceFighter/Archetypes",
+        "Sources/SpaceFighter/Content/Meshes",
+    ]
+    for directory in directories {
+        for file in swiftFiles(under: directory) {
+            let source = try String(contentsOf: file, encoding: .utf8)
+            #expect(
+                !source.contains("import Metal") && !source.contains("MTL"),
+                "\(file.lastPathComponent) reaches for Metal — that belongs in Render/"
+            )
+        }
+    }
+}
```

`Content/ShaderLibrary.swift` is deliberately absent from that list: compiling
MSL needs an `MTLDevice`, and that file is where content meets the GPU. Every
other file under `Content/` is plain geometry.

This is cruder than a module graph. It reads source as text, it can be fooled by
a string literal, and it knows nothing about scope. It also catches the mistake
you will actually make, in the second it takes to run, which is the entire
requirement. Chapter 08 changes a name or two because of it — and those changes
turn out to be improvements, which is a good sign about the rule.

---

### Checkpoint

```console
$ swift test
Build complete!
◇ Test run started.
◇ Test renderLayerKnowsNothingAboutTheGame() started.
◇ Test gameplayNeverTouchesMetal() started.
✔ Test renderLayerKnowsNothingAboutTheGame() passed after 0.001 seconds.
✔ Test gameplayNeverTouchesMetal() passed after 0.001 seconds.
✔ Test run with 2 tests in 0 suites passed after 0.001 seconds.
```

Worth proving to yourself that it isn't vacuous. Drop a file into
`Sources/SpaceFighter/Render/` containing the word `World`, run `swift test`
again, and read what comes back:

```console
↳ Leak.swift mentions World — gameplay leaked into Render/
✘ Test run with 2 tests in 0 suites failed after 0.001 seconds with 1 issue.
```

Then delete it.

Both pass trivially right now — those directories are empty. That is fine and
it is the point: the rule is in place *before* there is anything to break it, so
the first violation fails the run it appears in rather than being discovered
three chapters later.

If instead you see `error: no test target found` or a complaint about missing
sources, the `Package.swift` edit and the new file are out of sync — SwiftPM
rejects a target with no source files.

### Challenge

The two tests use a hand-written list of names. Add a third that needs no list:
assert that no file under `Sources/SpaceFighter/Render/Types/` imports anything
except `simd` — the GPU contract structs must stay plain data, and an `import
MetalKit` sneaking in there is how a "small convenience" becomes a dependency
nobody meant to add.

---

**Next:** the GPU stops being a black box. →
[Chapter 03: Metal fundamentals](03-metal-fundamentals.md)
