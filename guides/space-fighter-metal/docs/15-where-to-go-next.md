# 15 · Where to go next 🧠

> **You'll leave this chapter with:** a prioritised map from the game you just
> built to a real one — what to add, in what order, and which chapter's seam each
> change plugs into. Nothing here is required; it's the horizon.
>
> **Files created: none** — with one exception. Everything here is a sketch you
> could follow later, except *The ideal shader pipeline*, which is a working
> recipe with real anchors, because chapter 07 defers to it.

The prototype is deliberately small, but it's *honestly* small — every shortcut
was a labelled decision, not an accident. This chapter turns those labels into a
roadmap. Full links live in [`resources.md`](../resources.md).

---

## Start here: three changes that teach the seams

Before anything ambitious, make three small changes end to end. Each exercises a
different seam and takes minutes.

1. **A throttle.** `Player.throttle` and `InputState.throttle` are already wired
   and unused (chapter 10). Map `Shift`/`Ctrl` to ease `throttle`, and use it to
   lerp speed between a min and max. *Seam: input → flight.*
2. **A new enemy shape + behaviour.** Add a `MeshID` case, a `Content/Meshes/`
   generator (chapter 06), and a component + system for a new movement pattern
   (a strafer that circles you). *Seam: mesh + component + schedule.*
3. **An explosion.** On a kill in `CollisionSystem`, spawn a handful of
   short-lived entities with outward velocities and a `Lifetime` — instant
   particle burst with the tools you already have. *Seam: gameplay → ECS.*

If those three feel routine, the architecture has done its job and you're ready
for the bigger pieces below.

---

## Content: real models instead of code geometry

"Simple geometry for now" was the brief; here's the "later." Apple's **Model I/O**
framework loads real 3D files and hands you vertex/index buffers you can drop
straight into the `Renderer`:

- **USD / USDZ** — Apple's first-class format; the path of least resistance on
  Metal, and what Reality Composer exports.
- **glTF** — the open standard; use a community loader, or convert to USD.
- **`.obj`** — trivially simple, great for a first real asset.

The plan: replace a `Content/Meshes/` generator with a loader that fills the same
`Mesh` struct, add a `texCoord` to `Vertex` and a texture to the lit pipeline,
and you have textured models with *no other changes* — the ECS and draw loop
don't care where vertices came from. Free assets to start: Kenney's space kits,
Poly Pizza, Quaternius.

Chapter 06's registry is what makes that a local change. `MeshID.mesh` returns a
`Mesh`; where the vertices came from is that property's business and nobody
else's, so a loaded model swaps in one `switch` arm at a time. When you're
mixing sources, the honest shape is to say so in the type:

```swift
enum MeshSource {
    case procedural(() -> Mesh)
    case file(URL)
}
```

Resist reaching for that until you actually have both. Two `switch` arms that
call a loader are less machinery than an indirection layer, and the compiler is
already stopping you from forgetting one.

---

## The ideal shader pipeline, end to end

Chapter 07 compiles `.metal` files at launch and is explicit that this is a
zero-setup choice, not a technical necessity. Chapter 14 cached the half of the
work that repeats. This section is the version you'd actually ship, and unlike
the rest of this chapter it's a recipe you can sit down and follow.

What "ideal" means concretely — three properties the current setup lacks:

- **Shader errors fail the build**, not the launch. `swift build` catches a typo
  in `lit.metal` the same way it catches one in `Renderer.swift`.
- **No shader source ships.** Right now `lit.metal` sits in the app bundle as
  readable text. A `.metallib` is compiled AIR.
- **No compilation at launch at all**, once chapter 14's cache is warm.

Here's the end state, with the two chapters combined:

```
build time    .metal  ──xcrun metal──▶  .air  ──xcrun metallib──▶  default.metallib
first launch  default.metallib ──▶ MTLLibrary ──▶ compile 4 PSOs ──▶ pipelines.metallib
later runs    default.metallib ──▶ MTLLibrary ──▶ load archive ──▶ 4 cache hits
```

Nothing on that third line compiles anything.

### 1. Install the toolchain

```console
$ xcodebuild -downloadComponent MetalToolchain
$ xcrun metal --version
```

On a stock install `xcrun metal` is a stub and `xcrun metallib` doesn't exist at
all — that's the first thing to check when a build rule silently does nothing.
This is on your machine only; see chapter 07's table on why a player never needs
it.

### 2. Teach SwiftPM to compile Metal

`PackageDescription` has no build-rule API, so you hand SwiftPM the commands
yourself, in a build-tool plugin.

**`Plugins/MetalBuild/MetalBuildPlugin.swift`** — new file:

```swift
import Foundation
import PackagePlugin

@main
struct MetalBuildPlugin: BuildToolPlugin {
    func createBuildCommands(context: PluginContext, target: Target) async throws -> [Command] {
        guard let module = target.sourceModule else { return [] }

        let sources = module.sourceFiles
            .map(\.url)
            .filter { $0.pathExtension == "metal" }
        guard !sources.isEmpty else { return [] }

        let work = context.pluginWorkDirectoryURL
        let xcrun = URL(fileURLWithPath: "/usr/bin/xcrun")
        var commands: [Command] = []
        var objects: [URL] = []

        // One .air per .metal — so editing one shader recompiles one shader.
        for source in sources {
            let air = work.appending(path: source.deletingPathExtension().lastPathComponent + ".air")
            objects.append(air)
            commands.append(.buildCommand(
                displayName: "Compiling \(source.lastPathComponent)",
                executable: xcrun,
                arguments: ["metal", "-c", source.path(percentEncoded: false),
                            "-o", air.path(percentEncoded: false)],
                inputFiles: [source],
                outputFiles: [air]))
        }

        // Link them into the one library Metal looks for by default.
        let library = work.appending(path: "default.metallib")
        commands.append(.buildCommand(
            displayName: "Linking default.metallib",
            executable: xcrun,
            arguments: ["metallib"]
                + objects.map { $0.path(percentEncoded: false) }
                + ["-o", library.path(percentEncoded: false)],
            inputFiles: objects,
            outputFiles: [library]))

        return commands
    }
}
```

The plugin doesn't compile anything itself — it *returns descriptions* of
commands and SwiftPM runs them, which is what gives you incremental rebuilds and
parallelism for free. Declaring `inputFiles` and `outputFiles` honestly is the
whole contract: get them wrong and you'll get either stale libraries or a full
rebuild every time.

One `.air` per `.metal` rather than one bulk compile is deliberate, and it's the
same reasoning as chapter 07's `#line` directives — keep the mapping from error
to file intact.

**`Package.swift`** — declare the plugin and attach it:

```diff
     targets: [
+        .plugin(name: "MetalBuild", capability: .buildTool()),
         .executableTarget(
             name: "SpaceFighter",
             path: "Sources/SpaceFighter",
-            resources: [
-                .copy("Content/Shaders")
-            ]
+            plugins: ["MetalBuild"]
         )
     ]
```

The `.copy` goes away — you no longer ship source. The plugin's declared output
lands in the target's resource bundle instead, which is exactly where
`makeDefaultLibrary(bundle:)` looks.

A plugin that claims the `.metal` files is enough for SwiftPM to stop treating
them as strays — you get no "unhandled file" warning and no `resources:` entry,
and `module.sourceFiles` finds them. If yours comes back empty, print it before
assuming the commands are wrong.

One honest note on how far this was checked: the plugin above compiles, SwiftPM
runs it, it finds the shader files and issues the compile command — verified. The
step after that needs the toolchain from part 1, so on a machine without it the
build stops exactly here:

```console
$ swift build
[1/1] Compiling plugin MetalBuild
[3/11] Compiling t.metal
error: cannot execute tool 'metal' due to missing Metal Toolchain;
       use: xcodebuild -downloadComponent MetalToolchain
```

Which is a good failure: it means everything except the download is wired up
correctly. If you see that message, do part 1 and run it again.

### 3. Load the library instead of building it

Two edits and a deletion.

`Renderer.init` currently compiles from source and handles the failure, because
compiling was something that could go wrong at runtime. Loading a file that the
build produced is a much smaller claim, so the `do`/`catch` collapses into a
`guard`.

**`Render/Renderer.swift`**, in `init` — replace the whole library block:

```diff
     init?(view: MTKView) {
         guard let rhi = RHIDevice(view: view) else { return nil }
 
-        let library: MTLLibrary
-        do {
-            library = try ShaderLibrary.make(device: rhi.device)
-        } catch {
-            print("Shader compilation failed: \(error)")
-            return nil
-        }
+        guard let library = rhi.device.makeDefaultLibrary(bundle: .module) else {
+            print("default.metallib missing from the bundle")
+            return nil
+        }
 
         let cache = PipelineCache(device: rhi.device)
```

`makeDefaultLibrary(bundle:)` looks for a file called exactly `default.metallib`
in that bundle, which is why part 2's plugin names its output that and not
`shaders.metallib`.

Then delete the file that is now dead:

```console
$ rm Sources/SpaceFighter/Content/ShaderLibrary.swift
```

All of it goes: the `files` array, the concatenation, the `#include` blanking,
the `#line` directives, `ShaderLibraryError`. Every line existed to work around
handing the compiler one string with no include path, and there is no string any
more.

Three consequences worth registering, because each one closes something an
earlier chapter left open.

**`Bundle.module` still exists**, even though you deleted the `resources:` entry
in part 2. Chapter 07 tied that accessor to declaring resources, and it still
holds — a build-tool plugin's declared output files *are* resources of the
target, so SwiftPM still synthesises the accessor and still drops a bundle beside
the binary. What changed is what's in it: `default.metallib` instead of five
`.metal` files.

**`Content/` no longer touches Metal at all.** Chapter 07 called
`ShaderLibrary.swift` "the one file under `Content/` that touches Metal, since
compiling MSL needs an `MTLDevice`", and chapter 02's boundary test excludes it
by name for that reason. Delete it and the exception disappears — `Content/`
becomes pure data, the compiling moves into the build, and the rule chapter 02
wanted gets simpler rather than more complicated. Update that prose in 07 when
you get here; a stale exception is worse than none.

**Chapter 14's `PipelineCache` is untouched.** Not one line. It never cared where
its `MTLFunction`s came from — it takes a descriptor and returns a state — so an
archive built against a `.metallib` behaves identically to one built against a
runtime-compiled library. That is the seam doing its job, and it's the cheapest
possible confirmation that the split in chapter 08 was drawn in the right place.

### 4. Retire the duplicated struct declarations

Chapter 07 named a duplication and said it couldn't be fixed: `GPUContract.swift`
and `ShaderTypes.metal` declare the same four structs, in two languages, and they
must stay byte-compatible by hand. That was true while the shaders arrived as a
string with no include path. It isn't any more.

The fix is one file both languages read. Swift can only import C, so it lives in
a C target.

**`Sources/ShaderTypes/include/ShaderTypes.h`** — new file:

```c
#ifndef SHADERTYPES_H
#define SHADERTYPES_H

#ifdef __METAL_VERSION__
  #define SF_F2 float2
  #define SF_F3 float3
  #define SF_F4 float4
  #define SF_M4 float4x4
#else
  #include <simd/simd.h>
  #define SF_F2 simd_float2
  #define SF_F3 simd_float3
  #define SF_F4 simd_float4
  #define SF_M4 simd_float4x4
#endif

typedef struct { SF_F3 position; SF_F3 normal; } Vertex;
typedef struct { SF_M4 model; SF_F4 color; } InstanceData;
typedef struct { SF_M4 viewProjection; SF_F3 cameraPosition; SF_F3 lightDirection; } FrameUniforms;
typedef struct { SF_F2 position; SF_F4 color; } HUDVertex;

#endif
```

The `__METAL_VERSION__` guard is what lets one file serve both compilers — it's
defined only when `xcrun metal` is doing the reading. The macros exist so the
struct bodies below them are written once; spelling `float3` on one side and
`simd_float3` on the other in four separate structs is the duplication again,
just smaller.

**`Sources/ShaderTypes/shadertypes.c`** — new file, and it stays empty:

```c
// Intentionally empty. SwiftPM rejects a target with no source files; the
// content of this target is the header in include/.
```

That file is pure ceremony and will look like a mistake to the next person, which
is why it says so in itself.

**`Package.swift`** — add the target and depend on it:

```diff
     targets: [
         .plugin(name: "MetalBuild", capability: .buildTool()),
+        .target(name: "ShaderTypes"),
         .executableTarget(
             name: "SpaceFighter",
             path: "Sources/SpaceFighter",
+            dependencies: ["ShaderTypes"],
             plugins: ["MetalBuild"]
         )
     ]
```

Now the part that is easy to miss, because nothing warns you: **the Metal
compiler needs to be told where the header is.** `#include "ShaderTypes.h"` from
inside a `.metal` file resolves relative to the shader, and the header is in
another target. Give the plugin an include path:

**`Plugins/MetalBuild/MetalBuildPlugin.swift`**, in `createBuildCommands` — after
`let xcrun`:

```diff
         let xcrun = URL(fileURLWithPath: "/usr/bin/xcrun")
+        let headers = context.package.directoryURL
+            .appending(path: "Sources/ShaderTypes/include")
```

**`MetalBuildPlugin.swift`**, in the per-file loop — pass it to the compiler:

```diff
                 arguments: ["metal", "-c", source.path(percentEncoded: false),
+                            "-I", headers.path(percentEncoded: false),
                             "-o", air.path(percentEncoded: false)],
```

Then both sides drop their copies. In `ShaderTypes.metal`, the four `struct`
declarations are replaced by `#include "ShaderTypes.h"` — keep the file, since
`StarParams` is still MSL-only and still belongs there. In `GPUContract.swift`,
delete `Vertex`, `InstanceData` and `FrameUniforms`, and `import ShaderTypes` at
the top; C structs arrive in Swift with a memberwise initializer, so every call
site keeps working unchanged.

Confirm the swap is inert before trusting it — the whole point is that these are
the same bytes:

```swift
print(MemoryLayout<Vertex>.stride,        // 32
      MemoryLayout<InstanceData>.stride,  // 80
      MemoryLayout<FrameUniforms>.stride, // 96
      MemoryLayout<HUDVertex>.stride)     // 32
```

Those are the numbers chapter 06's hand-written Swift structs produce: two
`float3`s at 16 bytes each, a `float4x4` plus a `float4`, and so on. If any of
them changes when you switch to the header, the header is wrong — most likely a
`SF_F3` that should be `SF_F4`, or fields in a different order.

One declaration, two compilers, and the "must stay byte-compatible" warning above
the Swift structs has nothing left to warn about — the thing it warned about is
gone rather than documented. This is the pattern Apple's own Metal samples use.

Yes, that's a second target, and chapter 02 argued hard for having one. The
argument holds — it was against splitting *Swift* code into modules for tidiness,
where the cost is `public` ceremony and a `Bundle.module` you can't reach. This is
different: a C target is the only way Swift and the Metal compiler can read the
same header, so the module boundary is doing work no convention could. Take the
second target when it buys you something structural, not a nicer directory
listing.

### What you get, and what it costs

You trade a twelve-line loader and one `Package.swift` line for a plugin, a
toolchain download, and a C target. In exchange, a shader typo fails `swift
build`, no source ships, and combined with chapter 14 a warm launch does no
compilation at all.

Worth it on anything you'd hand to another person. Not worth it on chapter 07,
which is why chapter 07 doesn't.

---

## Looking better: lighting, shadows, post

Our lighting is one directional term (chapter 07). The upgrade path, in order of
bang-for-effort:

- **Multiple lights + specular** — add point lights and a Blinn-Phong highlight;
  a few more lines in `lit_fragment`.
- **Normal mapping** — fake surface detail from a texture; needs tangents on the
  vertex.
- **Shadow maps** — render the scene from the light into a depth texture, then
  test against it in the main pass. The classic "real shadows" technique; a whole
  extra pass.
- **Bloom** — the cheapest win for a space game: threshold bright pixels, blur,
  add back. Makes bolts and stars genuinely glow. This is your first
  *post-process* pass — render the scene to an offscreen texture, then run
  full-screen shader passes over it.

---

## Feeling better: particles and audio

- **Particles.** The explosion above is CPU particles. For thousands (engine
  trails, debris, nebulae) move them to the GPU: a compute shader updates a
  particle buffer, and you draw it as points/quads. `MTLComputeCommandEncoder` is
  the new tool.
- **Audio.** `AVAudioEngine` gives you mixing and, crucially, **3D spatial
  audio** — position a sound at an enemy's world coordinates and it pans and
  attenuates as you fly past. Engine hum, laser fire, explosions, lock-on tones.
  Sound is the single biggest perceived-quality jump per hour of work.

---

## Simulating better: physics and a fixed timestep

The moment you want bodies that bounce, tumble on impact, or stack, add a real
physics step — and with it, the **fixed timestep** from chapter 09. Options:

- **Roll your own** — sphere/AABB collision response and simple integration is
  very doable and keeps the ECS pure.
- **Adopt a library** — or Apple's higher-level frameworks if you don't need
  determinism.

Either way, split simulation from rendering: accumulate real time, step physics
in constant chunks, interpolate the render between steps. Our variable-step loop
becomes the *renderer's* clock; the *simulation* gets its own steady one.

---

## Scaling the engine

Our ECS and collision are sized for hundreds of entities. Past a few thousand:

- **Broad-phase collision** (chapter 12) — a uniform grid or spatial hash so
  collision stops being O(n²). This is the first thing that will bite; add it
  when frame time climbs.
- **Archetype storage** (chapter 05) — group entities by exact component set for
  cache-perfect queries. A bigger rewrite of `World`, worth it at DOTS-like
  scale.
- **Entity generations** (chapter 05) — fold a generation into the id so
  long-lived handles (a lock-on target you remember across frames) can detect a
  recycled slot. Add this the moment a system stores an `Entity` between frames.
- **Triple-buffered instance data** (chapter 08) — stop allocating instance
  buffers per draw; cycle through 2–3 pre-sized buffers with a semaphore so the
  CPU can build frame *N+1* while the GPU still reads frame *N*. The standard
  Metal throughput pattern.

---

## Going multiplayer

Co-op or versus dogfighting is the big one, and it reaches back into chapter 09's
timestep decision. Lockstep netcode needs a **deterministic fixed-step**
simulation (same inputs ⇒ same result on every machine); client-server with
prediction needs a **rewindable** simulation (re-simulate from a server snapshot
when a correction arrives). Either way, the groundwork is: make the simulation
deterministic and separable from rendering *first*. Retrofitting determinism into
a shipped game is brutal; knowing the requirement now is the gift.

---

## Working like a graphics programmer

Two tools will teach you more than any tutorial:

- **The Metal frame debugger / GPU capture** (Xcode). Capture a frame and step
  through every draw call, inspect buffers, and see exactly what each shader
  received. When something renders wrong, this shows you *why* in seconds.
- **The GPU performance HUD & Instruments.** Find where frame time actually goes
  before optimising. Our per-draw buffer allocation, for instance, will show up
  here the moment it matters — and *only* then is it worth fixing.

Optimise against measurements, not hunches. The prototype is full of "simple now,
fast later" choices precisely so you can *feel* which ones matter before touching
them.

---

## The through-line

> **There is a second guide.** [Space Fighter II](../../space-fighter-metal-2/README.md)
> picks up exactly here — fixed timestep, a bank-and-pull flight model, waves,
> loadouts, menus and multiplayer — and treats this chapter's list as its
> table of contents.

Every item above plugs into a seam this guide already built: content swaps behind
`Mesh`, behaviour is a new component + system + schedule line, rendering upgrades
live behind the `[MeshID: [InstanceData]]` handoff, and the timestep decision
gates physics and netcode. That's the real deliverable — not a finished game, but
a small, honest codebase whose every extension point you can now name. Go add
something, and watch how little else you have to touch.

---

*Back to the [guide map](../README.md) · references in [`resources.md`](../resources.md)*
