# 07 · Shaders 🛠️

> **You'll leave this chapter with:** all four shader pairs the game needs,
> written in Metal Shading Language — lit geometry, unlit glows, a starfield that
> tiles forever, and flat 2D for the HUD — in real `.metal` files, compiled and
> checked by the GPU before you write a line of the renderer.
>
> **Files created:** `Sources/SpaceFighter/Content/Shaders/ShaderTypes.metal`,
> `lit.metal`, `unlit.metal`, `star.metal`, `hud.metal`,
> `Sources/SpaceFighter/Content/ShaderLibrary.swift`

Chapter 03 gave you the vocabulary; chapter 06 gave you geometry. This chapter
writes the programs that run on the GPU, and a small loader that hands them to
Metal. Chapter 08 writes the renderer that drives them, and that's when you'll
see something on screen.

---

## Four ideas carry every shader we write

**The pull-vertex model.** Rather than describing a vertex layout with an
`MTLVertexDescriptor`, our vertex shaders **pull** vertices out of a buffer by
index. `[[vertex_id]]` is the running vertex index — with an indexed draw it's
the value read from the index buffer — and we use it to subscript the array
directly. Simple, and flexible enough that different shaders can read the same
buffer differently.

**`[[instance_id]]`.** Which *copy* we're drawing. One draw call renders the same
mesh N times; this attribute tells each run which of the N it is, so it can look
up its own transform and colour. That's instancing, and 08 leans on it hard.

**`[[buffer(N)]]`.** Binds a parameter to the slot the CPU filled with
`setVertexBuffer(_, index: N)`. The numbering is a **contract** both sides must
honour, and ours is fixed for the whole project:

```
buffer(0) = vertices        buffer(1) = per-instance data
buffer(2) = frame uniforms  buffer(3) = star params
```

**Separate binding tables per stage.** Vertex and fragment shaders have
*independent* buffer slots. That's why `FrameUniforms` will be bound at vertex
`index: 2` and fragment `index: 0` — same data, two different tables, and no
conflict.

---

## One file per pipeline

The shaders go in their own directory, one file per shading style:

```
Sources/SpaceFighter/Content/
├── ShaderLibrary.swift      loads, glues, compiles
└── Shaders/
    ├── ShaderTypes.metal    the CPU↔GPU contract
    ├── lit.metal            ship + enemies
    ├── unlit.metal          grid lines + bolts
    ├── star.metal           the starfield
    └── hud.metal            the 2D overlay
```

Shaders sit under `Content/`, not `Render/`, and that is a deliberate answer to a
question chapter 02 asked. A shader is authored material — the same category of
thing as a mesh, edited when the game should *look* different, not when the
engine should *work* differently. `Render/` holds the machinery that loads and
runs whatever is in here. In an Unreal project these files would be `.uasset`
materials sitting in `Content/`, for exactly the same reason.

`ShaderLibrary.swift` is the one file under `Content/` that touches Metal, since
compiling MSL needs an `MTLDevice`. Chapter 02's boundary test excludes it by
name for that reason — it is the doorway between content and the GPU, and a
doorway has to open on both sides.

The split isn't filing for its own sake — it draws a real line. **`ShaderTypes.metal`
holds what both languages must agree on. Each `.metal` file holds one pipeline's
private business.** A struct that only `star_vertex` and `star_fragment` pass
between themselves has no business being visible to the HUD shader, and once the
files are separate, it isn't.

The practical win is smaller and lands sooner: your editor knows what these files
are. Syntax highlighting, brace matching, and — in Xcode — real MSL completion
and diagnostics.

One naming choice worth explaining. The shared types file is `ShaderTypes.metal`,
not `ShaderTypes.h`, even though "a header of shared declarations" is exactly what
it is. Name it `.h` and your editor's C engine will try to parse it as C, where
`float3` and `float4x4` don't exist, and you'll get a screenful of
`Unknown type name 'float3'` — the precise problem this chapter set out to fix.

### The one constraint to know up front

Metal compiles these at **launch**, not at build time, from a single string that
`ShaderLibrary` assembles by concatenating the files. That matters here because
runtime compilation has **no include search path**: a `#include "ShaderTypes.metal"`
cannot be resolved when the source arrives as a string. So each file will carry
its `#include` lines — they're what make it stand alone in an editor — and the
loader will blank them out and paste the shared types in itself.

The last section of this chapter explains why launch-time compilation, rather
than a `.metallib` produced by the build, is not a shortcut here but the only
option a plain `swift run` has.

---

## Start with the shared types

**`Sources/SpaceFighter/Content/Shaders/ShaderTypes.metal`** — new file:

```metal
#include <metal_stdlib>

struct Vertex        { float3 position; float3 normal; };
struct InstanceData  { float4x4 model; float4 color; };
struct FrameUniforms { float4x4 viewProjection; float3 cameraPosition; float3 lightDirection; };
struct HUDVertex     { float2 position; float4 color; };
struct StarParams    { float span; float pointSize; };
```

Compare these against `GPUContract.swift` from chapter 06. The first four are the
*same declarations twice*, once per language, and they must stay byte-compatible
or the GPU reads noise. Splitting the shaders into files hasn't fixed that — it's
a consequence of Swift and MSL being different languages, not of how the source
is stored. What it has done is give the duplication one obvious home on each side:
`GPUContract.swift` and this file, and nothing else. A bigger project would
generate both from one source, or at least add a test comparing
`MemoryLayout<T>.stride` to the MSL sizes; chapter 15 sketches the real fix.

`StarParams` is the exception — it has no Swift twin in `GPUContract.swift`,
because it's private to the renderer. You'll see it declared as a private struct
in 08.

---

## Lit: the ship and enemies

**`Sources/SpaceFighter/Content/Shaders/lit.metal`** — new file:

```metal
#include <metal_stdlib>
#include "ShaderTypes.metal"
using namespace metal;

struct LitInOut { float4 position [[position]]; float3 worldNormal; float4 color; };

vertex LitInOut lit_vertex(uint vid                    [[vertex_id]],
                           uint iid                    [[instance_id]],
                           constant Vertex*        verts     [[buffer(0)]],
                           constant InstanceData*  instances [[buffer(1)]],
                           constant FrameUniforms& frame     [[buffer(2)]]) {
    Vertex v = verts[vid];
    InstanceData inst = instances[iid];
    float4 world = inst.model * float4(v.position, 1.0);
    float3x3 nm = float3x3(inst.model[0].xyz, inst.model[1].xyz, inst.model[2].xyz);
    LitInOut out;
    out.position    = frame.viewProjection * world;
    out.worldNormal = normalize(nm * v.normal);
    out.color       = inst.color;
    return out;
}
```

`LitInOut` is the vertex shader's *return* type and the fragment shader's *input*
type, which is why it lives here rather than in the shared file — nothing outside
this pipeline ever sees it. The `[[position]]` attribute is mandatory on exactly
one field: it tells the rasterizer which value is the clip-space position, so it
knows where the triangle actually is. Every other field is along for the ride —
the rasterizer **interpolates** them across the face of the triangle before
handing them to the fragment shader. That's how a normal defined at three corners
becomes a smoothly varying value at every pixel between them.

Read the shader body as chapter 04's MVP chain, executed per vertex. `inst.model`
takes the vertex from local space to world space; `frame.viewProjection` — the
pre-multiplied `P * V` — takes it the rest of the way to clip space. Two matrix
multiplies and the vertex is placed.

The `float3x3 nm` line is the one that isn't obvious. Normals are *directions*,
not positions, so they must not be translated — hence pulling out just the
upper-left 3×3, dropping the translation column. Strictly, a normal needs the
**inverse transpose** of that matrix, because non-uniform scaling skews normals
away from the surface. We get away with the plain 3×3 because every entity in
this game uses uniform scale, where the inverse transpose is the same matrix up
to a factor that `normalize` removes anyway. The moment you add a squashed
entity, this line is the bug.

Now the fragment shader — the entire lighting model:

**`lit.metal`** — after `lit_vertex`:

```diff
     out.color       = inst.color;
     return out;
 }
+
+fragment float4 lit_fragment(LitInOut in [[stage_in]],
+                             constant FrameUniforms& frame [[buffer(0)]]) {
+    float3 N = normalize(in.worldNormal);
+    float3 L = normalize(-frame.lightDirection);   // toward the light
+    float  diffuse = max(dot(N, L), 0.0);
+    float  ambient = 0.25;
+    float3 lit = in.color.rgb * (ambient + diffuse * 0.85);
+    return float4(lit, in.color.a);
+}
```

Four lines of actual shading, and the whole thing is chapter 04's dot product.
`dot(N, L)` is the cosine of the angle between the surface normal and the
direction to the light: 1 when a face points straight at the sun, 0 when it's
edge-on, negative when it faces away — which `max(…, 0.0)` clamps off, because
negative light is not a thing.

The two constants are pure taste. `ambient = 0.25` keeps unlit faces dark grey
rather than pure black, which reads as "in shadow" instead of "a hole in the
world". The `0.85` is how hard the sun hits. Together they're arranged to stay
under 1.0 so nothing blows out to white.

Note `normalize(-frame.lightDirection)`: we store the direction light *travels*,
and shading needs the direction *toward* the light, so it's negated here rather
than at the call site. That sign is a classic place to lose an hour.

`[[stage_in]]` marks the parameter that arrives interpolated from the rasterizer,
as opposed to the buffers, which are the same for every fragment.

---

## Unlit: the grid and the bolts

Some things shouldn't be shaded at all. A glowing plasma bolt doesn't have a lit
side and a dark side; neither does a neon grid line. For those, the fragment
shader just returns the colour it was given.

**`Sources/SpaceFighter/Content/Shaders/unlit.metal`** — new file:

```metal
#include <metal_stdlib>
#include "ShaderTypes.metal"
using namespace metal;

struct FlatInOut { float4 position [[position]]; float4 color; };

vertex FlatInOut unlit_vertex(uint vid                    [[vertex_id]],
                              uint iid                    [[instance_id]],
                              constant Vertex*        verts     [[buffer(0)]],
                              constant InstanceData*  instances [[buffer(1)]],
                              constant FrameUniforms& frame     [[buffer(2)]]) {
    Vertex v = verts[vid];
    InstanceData inst = instances[iid];
    FlatInOut out;
    out.position = frame.viewProjection * (inst.model * float4(v.position, 1.0));
    out.color    = inst.color;
    return out;
}

fragment float4 unlit_fragment(FlatInOut in [[stage_in]]) {
    return in.color;
}
```

Identical vertex transform, no normal, and a fragment shader that is one line.
The *glow* doesn't come from the shader at all — it comes from the additive blend
mode 08 attaches to this pipeline, which makes overlapping bolts brighten each
other instead of overwriting.

---

## The starfield that never ends

Chapter 06 left a problem: the stars live in a fixed cube, so flying far enough
takes you out of it and space goes black. Here's the fix, and it costs three
lines and zero CPU.

**`Sources/SpaceFighter/Content/Shaders/star.metal`** — new file:

```metal
#include <metal_stdlib>
#include "ShaderTypes.metal"
using namespace metal;

struct PointInOut { float4 position [[position]]; float4 color; float pointSize [[point_size]]; };

vertex PointInOut star_vertex(uint vid                    [[vertex_id]],
                              uint iid                    [[instance_id]],
                              constant Vertex*        verts     [[buffer(0)]],
                              constant InstanceData*  instances [[buffer(1)]],
                              constant FrameUniforms& frame     [[buffer(2)]],
                              constant StarParams&    params    [[buffer(3)]]) {
    Vertex v = verts[vid];
    float3 rel = v.position - frame.cameraPosition;
    rel = rel - round(rel / params.span) * params.span;
    float3 world = frame.cameraPosition + rel;

    PointInOut out;
    out.position  = frame.viewProjection * float4(world, 1.0);
    out.pointSize = params.pointSize;
    out.color     = float4(instances[iid].color.rgb * v.normal.x, 1.0);
    return out;
}
```

`[[point_size]]` is the point equivalent of `[[position]]`'s special treatment:
it's how a vertex shader tells the hardware how many pixels wide to draw a point.

The middle three lines are the whole trick. Take the star's offset from the
camera, then `rel - round(rel / span) * span` folds that offset into the range
`[-span/2, +span/2]`. In effect the cube of stars is tiled infinitely in every
direction and you always see the copy nearest you. Fly a million units and the
sky stays full, because there is no "outside" to reach.

This is worth internalising as a habit rather than a trick. The alternative — a
CPU loop repositioning thousands of stars every frame — is more code, costs real
time, and produces exactly the same image. When you're about to iterate over a
lot of things to feed the GPU, ask whether the *rule* can move into the shader
and be evaluated per-vertex for free.

The last line collects on chapter 06's other decision: `v.normal.x` is the
per-star brightness we smuggled into an otherwise-unused channel.

Points come out of the rasterizer as squares, which looks wrong for stars:

**`star.metal`** — after `star_vertex`:

```diff
     out.color     = float4(instances[iid].color.rgb * v.normal.x, 1.0);
     return out;
 }
+
+fragment float4 star_fragment(PointInOut in [[stage_in]],
+                              float2 pc [[point_coord]]) {
+    float d = distance(pc, float2(0.5));
+    if (d > 0.5) discard_fragment();
+    float glow = 1.0 - smoothstep(0.0, 0.5, d);
+    return float4(in.color.rgb, glow);
+}
```

`[[point_coord]]` gives each fragment its position *within* the point, from
`(0,0)` to `(1,1)`. Measuring the distance from the centre and calling
`discard_fragment()` beyond 0.5 carves a circle out of the square. The
`smoothstep` then fades alpha toward the rim, so the star has a soft halo rather
than a hard aliased edge.

`discard_fragment()` is worth knowing about and worth using sparingly: it can
disable early depth-test optimisations on some hardware, because the GPU no
longer knows whether a fragment will survive until it has run the shader. For a
few thousand tiny points, irrelevant. For a full-screen effect, measure.

---

## The HUD: no transform at all

The last pair is the simplest in the project, because the HUD doesn't live in the
world. Chapter 13 will hand us positions already in clip space.

**`Sources/SpaceFighter/Content/Shaders/hud.metal`** — new file:

```metal
#include <metal_stdlib>
#include "ShaderTypes.metal"
using namespace metal;

struct HUDInOut { float4 position [[position]]; float4 color; };

vertex HUDInOut hud_vertex(uint vid [[vertex_id]],
                           constant HUDVertex* verts [[buffer(0)]]) {
    HUDInOut out;
    out.position = float4(verts[vid].position, 0.0, 1.0);
    out.color    = verts[vid].color;
    return out;
}

fragment float4 hud_fragment(HUDInOut in [[stage_in]]) {
    return in.color;
}
```

No matrices, no uniforms, no instancing — a 2D point widened to 4D with `z = 0`
and `w = 1`, and a colour passed straight through. Everything interesting about
the HUD happens on the CPU side in chapter 13.

---

## Shipping the files with the binary

`.metal` files aren't Swift, so SwiftPM won't compile them — but it will *carry*
them, if you say so. Declare the directory as a resource:

**`Package.swift`** — in the target:

```diff
         .executableTarget(
             name: "SpaceFighter",
-            path: "Sources/SpaceFighter"
+            path: "Sources/SpaceFighter",
+            resources: [
+                .copy("Content/Shaders")
+            ]
         )
```

`.copy` and not `.process` — `.process` asks SwiftPM to interpret the contents
(compiling asset catalogs, optimising images), and `.metal` is on its list of
recognised resource kinds, which is a conversation we don't want to have. `.copy`
moves the directory verbatim, which is exactly what a file we intend to read as
text needs.

This is a *resource*, not a dependency. Chapter 01's promise stands: the package
still has no external dependencies.

Declaring resources also makes SwiftPM generate a `Bundle.module` accessor for
the target — yes, for executables too — pointing at a bundle it drops next to the
binary. That's how the loader finds the files at runtime.

Two details about that accessor, because both bite. First, `.copy` preserves the
directory *name* and nothing above it, so inside the bundle the shaders sit at
`Shaders/`, not `Content/Shaders/` — the loader below asks for `subdirectory:
"Shaders"` and would keep asking for that if you moved the source directory
somewhere else entirely. The path in `Package.swift` and the path in
`Bundle.module` are not the same path, and only the first one moves.

Second, `Bundle.module` is synthesised **per target**, privately. That is the
concrete reason chapter 02 rejected splitting this project into engine and content
modules: the shaders would be a resource of one target while the code calling
`makeLibrary` lived in another, and there is no `Bundle.module` that spans both.
You'd be passing a `Bundle` across a module boundary before drawing anything.

---

## Loading them at launch

**`Sources/SpaceFighter/Content/ShaderLibrary.swift`** — new file:

```swift
import Foundation
import Metal

enum ShaderLibraryError: Error {
    case missing(String)
}

/// Reads every shader file out of the resource bundle, glues them into one
/// translation unit, and hands it to the GPU's compiler.
enum ShaderLibrary {
    /// Concatenation order. The shared types must come first; after that the
    /// files are independent of each other.
    private static let files = [
        "ShaderTypes.metal", "lit.metal", "unlit.metal", "star.metal", "hud.metal",
    ]

    static func source() throws -> String {
        var source = "#include <metal_stdlib>\nusing namespace metal;\n"
        for name in files {
            guard let url = Bundle.module.url(
                forResource: name, withExtension: nil, subdirectory: "Shaders")
            else { throw ShaderLibraryError.missing(name) }

            source += "#line 1 \"\(name)\"\n"
            source += try String(contentsOf: url, encoding: .utf8)
                .split(separator: "\n", omittingEmptySubsequences: false)
                .map { $0.hasPrefix("#include") ? "" : String($0) }
                .joined(separator: "\n")
        }
        return source
    }

    static func make(device: MTLDevice) throws -> MTLLibrary {
        try device.makeLibrary(source: try source(), options: nil)
    }
}
```

Three lines in that loop deserve their reasons.

**Why the `#include` lines are blanked.** Runtime compilation takes one string and
has no include search path, so `#include "ShaderTypes.metal"` would fail to
resolve. The prelude at the top pastes the same content in ahead of everything
else, making the directive redundant — so it's removed. It stays in the *files*
because that's what lets you open `star.metal` on its own and have an editor
understand it.

**Why blanked and not deleted.** `map` to `""` rather than `filter` out. Deleting
a line would shift every line after it, and the compiler's error messages would
point one or two lines off — the kind of small lie that costs twenty minutes.

**Why `#line`.** Without it, a mistake in `lit.metal` is reported against the
concatenated blob:

```
program_source:33:41: error: expected ';' at end of declaration
```

`#line 1 "lit.metal"` tells the compiler what the *next* line really is, so the
same mistake reports:

```
lit.metal:27:41: error: expected ';' at end of declaration
```

File and line, both real. That's two lines of Swift for a diagnostic that points
at the file you'd actually open.

---

## Checkpoint

The renderer doesn't exist until 08 — but you don't have to wait for it to know
these shaders are correct. `MTLCreateSystemDefaultDevice()` gives you a GPU
without a window, and compiling is the real test.

**`main.swift`** — replace the whole file (throwaway):

```swift
import Foundation
import Metal

let entryPoints = ["lit_vertex", "lit_fragment", "unlit_vertex", "unlit_fragment",
                   "star_vertex", "star_fragment", "hud_vertex", "hud_fragment"]

guard let device = MTLCreateSystemDefaultDevice() else {
    fatalError("no Metal device")
}

do {
    let library = try ShaderLibrary.make(device: device)
    print("compiled on: \(device.name)")
    for name in entryPoints {
        print("  \(library.makeFunction(name: name) != nil ? "found" : "MISSING") \(name)")
    }
} catch {
    print("shader compilation failed:\n\(error)")
}
```

```console
$ swift run
compiled on: Apple M1 Max
  found lit_vertex
  found lit_fragment
  found unlit_vertex
  found unlit_fragment
  found star_vertex
  found star_fragment
  found hud_vertex
  found hud_fragment
```

**When it doesn't work:**

- **`warning: Invalid Resource 'Content/Shaders': File not found.`** — the directory
  name or its position doesn't match the `.copy` path. It's relative to the
  target's `path`, so the full location is `Sources/SpaceFighter/Content/Shaders`.
- **`shader compilation failed: … missing("lit.metal")`** — the files were copied
  but one isn't where `Bundle.module` looked. Run `ls .build/debug/*.bundle/Shaders`;
  all five should be there.
- **A real MSL error, naming a file and a line.** Good — that's the system working.
  Open that file at that line.
- **`MISSING` next to an entry point that exists in your file.** Almost always a
  spelling difference between the file and the `entryPoints` list above, since the
  library compiled cleanly.

That the shaders compile does *not* mean they're right — a shader whose struct
layout disagrees with Swift's compiles perfectly and draws garbage. It means the
MSL is well-formed and every entry point 08 asks for by name exists.

---

## Why compile at launch and not at build?

Worth naming, because it looks like a shortcut and isn't.

First, whose machine we're talking about — because two different things get
called Metal, and confusing them makes this section sound like it's about your
players. It isn't.

| | Ships where | Who has it |
|---|---|---|
| **Metal.framework** — the runtime, including the compiler `makeLibrary(source:)` calls | inside macOS | every Mac, always |
| **Metal toolchain** — `xcrun metal`, `xcrun metallib` | with Xcode, as a downloadable component | developers who ask for it |

Somebody who plays your game needs **neither design to install anything**. Under
this chapter's approach, their Metal.framework compiles the source you shipped.
Under the build-time approach, their Metal.framework loads the `.metallib` you
compiled on your machine. The toolchain question is only ever about *your*
machine, at *build* time. Nothing below changes what a player has to do, which is
double-click the app.

The cost of compiling at launch is real: **shader errors surface at launch, not
at build time.** `swift build` will happily produce a binary whose shaders don't
compile, and you find out when you run it.

Two facts make build-time compilation more than a flag on a plain SwiftPM
package:

- **SwiftPM's default build system has no Metal rule.** The compile and link
  specifications for `.metal` (`MetalCompiler.xcspec`, `MetalLinker.xcspec`) ship
  inside Xcode's build framework, not inside SwiftPM. `swift build` never consults
  them.
- **`PackageDescription` has no build-rule API** to add one with. Its entire
  file-handling surface is `Resource.process`, `.copy` and `.embedInCode` — you can
  ship a file, not teach the build to compile it.

Which is why the fix is a build-tool *plugin* rather than a setting — you have to
hand SwiftPM the commands yourself.

There's a third reason, softer and worth being honest about. The Metal compilers
are a separate download: on a stock install `xcrun metal --version` reports
`missing Metal Toolchain; use: xcodebuild -downloadComponent MetalToolchain`, and
`xcrun -f metallib` fails outright. That's one command, not a wall. But it *is*
setup, and asking you to download a toolchain before you can see a triangle is
friction this chapter would rather spend on shaders.

So the honest framing is not "runtime compilation is required" and not "strings
are simpler than files" — we used files, and they cost one `Package.swift` line
and a twelve-line loader. It's that **a zero-setup package can only compile at
runtime**, and this guide values zero setup while you're learning. Chapter 15
builds the other version end to end, for when you'd rather have the errors at
build time.

One thing that is *not* fixed by the packaging, and is worth knowing before you
assume launch-time compilation is the expensive part: this is only half of the
work a launch does. Turning source into Apple's IR is what happens here, and
macOS caches it for you. Turning that IR into machine code for the specific GPU
in front of you happens later, in chapter 08's `Pipelines`, and nothing caches
that until you do. Chapter 14 measures both and fixes the half that needs it.

---

## Challenge

The lit shader has no specular highlight, so surfaces look chalky. Add one:
compute the direction from the fragment to the camera (you have
`frame.cameraPosition`, but you'll need the fragment's world position too, which
means adding a field to `LitInOut` and filling it in `lit_vertex`), then add
`pow(max(dot(N, H), 0.0), shininess)` where `H` is the normalized half-vector
between the light and view directions. Two questions worth answering as you go:
why is a *half-vector* used instead of the reflected ray, and what does the
`worldNormal` interpolation do to your highlight on a flat-shaded mesh?

Note that `LitInOut` lives in `lit.metal` now, so this whole change is one file.
That's the split earning its keep.

---

**Next:** the Swift side — pipelines, buffers, and a ship on your screen. →
[Chapter 08: The renderer](08-the-renderer.md)
