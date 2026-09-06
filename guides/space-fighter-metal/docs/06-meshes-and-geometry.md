# 06 · Meshes & simple geometry 🛠️

> **You'll leave this chapter with:** the structs that cross the CPU/GPU boundary,
> every shape in the game generated in code — ship, enemy, bolt, endless
> starfield, ground grid — and each one wired to an id in a way the compiler
> won't let you forget. Zero art assets.
>
> **Files created:** `Sources/SpaceFighter/Render/Types/GPUContract.swift`,
> `Sources/SpaceFighter/Render/Types/Mesh.swift`,
> `Sources/SpaceFighter/Content/Meshes/MeshBuilder.swift`,
> `Sources/SpaceFighter/Content/Meshes/ShipMesh.swift`,
> `Sources/SpaceFighter/Content/Meshes/EnemyMesh.swift`,
> `Sources/SpaceFighter/Content/Meshes/ProjectileMesh.swift`,
> `Sources/SpaceFighter/Content/Meshes/SceneryMesh.swift`,
> `Sources/SpaceFighter/Content/MeshID.swift`

Geometry comes before the renderer because the renderer needs something to draw.
By the end of this chapter you'll have real vertex data you can print and inspect;
chapter 08 puts it on screen.

This is the chapter where chapter 02's `Render/` and `Content/` split stops being
a diagram. `Render/Types/` gets the *vocabulary* — what a vertex is, what a mesh
is — and `Content/` gets the *art*, the actual shapes. The rule to hold on to:
`Render/Types/Mesh.swift` would be identical in a racing game; nothing in
`Content/` would survive the change.

---

## The structs the GPU will read

Before meshes, the types that cross the boundary. Their memory layout must match
the shader structs you'll write in chapter 07 *exactly*, or the GPU reads garbage.

We get that for free by using `simd` types throughout: `SIMD3<Float>` matches
Metal Shading Language's `float3`, `SIMD4<Float>` matches `float4`, and
`simd_float4x4` matches `float4x4` — same size, same alignment.

**`Sources/SpaceFighter/Render/Types/GPUContract.swift`** — new file:

```swift
import simd

/// One vertex of a mesh. The vertex shader reads these via `[[vertex_id]]`.
struct Vertex {
    var position: Vec3
    var normal: Vec3
}

/// Per-entity draw data, indexed in the shader by `[[instance_id]]`.
struct InstanceData {
    var model: Mat4
    var color: Vec4
}

/// Constants shared by every draw in a frame.
struct FrameUniforms {
    var viewProjection: Mat4
    var cameraPosition: Vec3
    var lightDirection: Vec3
}
```

Now the trap, because it will cost you an afternoon if you meet it unprepared.
**`float3` is 16-byte aligned, not 12.** Put a lone `Float` right after a
`float3` in a struct and the compiler inserts padding — possibly different
padding on each side of the boundary — and every field after it reads as noise.

`FrameUniforms` sidesteps it by putting two `SIMD3`s back to back, each already
occupying a full 16 bytes. The general rule: keep everything in `SIMD*` types, as
we do here, and never mix a bare scalar in after a vector. If you later change one
of these structs and the screen fills with garbage, this is the first thing to
check.

That's the whole file. Three structs, no HUD vertex yet — chapter 13 adds
`Render/Types/HUDVertex.swift` when there's a HUD to need it, rather than parking
an unused type here for seven chapters.

---

## What a mesh actually is

Three things: **vertices** (corners, each with a position and a normal — the
lighting input from chapter 04), **indices** (triangles as triples of vertex
indices, so triangles can share corners), and a **primitive** telling the GPU how
to connect them — filled triangles, line segments, or lone points.

**`Sources/SpaceFighter/Render/Types/Mesh.swift`** — new file:

```swift
import simd

enum Primitive {
    case triangle   // ship, enemies, bullets
    case line       // the ground grid
    case point      // the starfield
}

/// CPU-side geometry. The renderer uploads this into GPU buffers once at
/// startup. An empty `indices` array means "draw non-indexed".
struct Mesh {
    var vertices: [Vertex]
    var indices: [UInt16]
    var primitive: Primitive
}
```

Notice what this file does *not* contain: any actual shape. `Mesh` is a container
the renderer knows how to upload, and it would be byte-for-byte the same in a
racing game or a city builder. That's why it lives in `Render/Types/` and not in
`Content/`. Everything from here on is content.

Two decisions are baked into that `Mesh` struct. The first is that indices are
*optional*. Indexed drawing lets triangles share corners — a cube has 8 distinct
corners but 12 triangles, so you store 8 vertices and 36 indices instead of 36
vertices. That is a real saving on big models. It buys us nothing for points and
lines, which have no shared corners to exploit, so those meshes leave `indices`
empty and the renderer draws them non-indexed.

The second is that this is all **CPU-side**. A `Mesh` is a plain Swift value with
no GPU resources in it. The renderer will copy each one into a GPU buffer exactly
once, at startup, and then never touch these arrays again — the per-frame cost of
drawing a ship is a matrix, not a mesh. Keeping generation and upload separate is
also what makes this file testable without a GPU, which is precisely what the
checkpoint at the end of the chapter does.

---

## Flat shading, and a normal that can't point the wrong way

We want the crisp faceted look of classic low-poly space shooters: each face a
single flat shade. That dictates how we build normals.

A **smooth** mesh shares a vertex between the faces meeting at it and averages
their normals, giving rounded gradients. A **flat** mesh does the opposite —
every triangle gets its *own three vertices* and one shared normal, the face's
normal — so each face reads as a distinct plane. More vertices, simpler maths,
exactly the aesthetic we want.

A triangle's normal is the cross product of two of its edges. But which way does
it point? That depends on the winding order of the corners, which is easy to get
wrong when you're typing coordinates by hand and impossible to eyeball. Rather
than be careful, we'll make it **self-correcting**.

The insight: for a convex shape, an outward normal points *away* from the shape's
centre. So compute the centroid first, and any normal that disagrees gets flipped.

**`Sources/SpaceFighter/Content/Meshes/MeshBuilder.swift`** — new file:

```swift
import simd

/// Shared geometry helpers. Every shape in `Content/Meshes/` is built from
/// these, so they are `internal` rather than `private` — the shapes live in
/// their own files now.
enum MeshBuilder {

    static func flat(_ tris: [(Vec3, Vec3, Vec3)]) -> Mesh {
        var sum = Vec3.zero
        for t in tris { sum += t.0 + t.1 + t.2 }
        let centroid = sum / Float(tris.count * 3)

        var vertices: [Vertex] = []
        var indices: [UInt16] = []
        vertices.reserveCapacity(tris.count * 3)
        indices.reserveCapacity(tris.count * 3)

        return Mesh(vertices: vertices, indices: indices, primitive: .triangle)
    }
}
```

That returns an empty mesh so far. The body goes in the gap — for each triangle,
emit three fresh vertices sharing one corrected normal:

**`MeshBuilder.swift`**, in `flat` — between the `reserveCapacity` calls and the
`return`:

```diff
         indices.reserveCapacity(tris.count * 3)
 
+        for t in tris {
+            let faceCenter = (t.0 + t.1 + t.2) / 3
+            var normal = simd_normalize(simd_cross(t.1 - t.0, t.2 - t.0))
+            if simd_dot(normal, faceCenter - centroid) < 0 { normal = -normal }
+            let base = UInt16(vertices.count)
+            vertices.append(Vertex(position: t.0, normal: normal))
+            vertices.append(Vertex(position: t.1, normal: normal))
+            vertices.append(Vertex(position: t.2, normal: normal))
+            indices.append(base)
+            indices.append(base + 1)
+            indices.append(base + 2)
+        }
         return Mesh(vertices: vertices, indices: indices, primitive: .triangle)
```

The correction is one line: `simd_dot(normal, faceCenter - centroid) < 0` asks
"does this normal point back toward the middle of the shape?" If so, we're
inside-out, so negate it. Chapter 04's dot product, earning its keep — the sign
of a dot product is a direction test.

Because of that line we can hand `flat` a list of triangles in *any* winding and
get correct lighting, and we can switch off back-face culling entirely in chapter
08 without ever seeing a black face.

One more helper, since most shapes are easier to describe as quads:

**`MeshBuilder.swift`**, in `MeshBuilder` — after `flat`:

```diff
         return Mesh(vertices: vertices, indices: indices, primitive: .triangle)
     }
+
+    /// Split a quad (given counter-clockwise) into two triangles.
+    static func quad(_ a: Vec3, _ b: Vec3, _ c: Vec3, _ d: Vec3) -> [(Vec3, Vec3, Vec3)] {
+        [(a, b, c), (a, c, d)]
+    }
 }
```

Both helpers are `internal`, not `private`. That is the one thing splitting a
library across files costs you: `private` means "this file", so the moment the
shapes moved out of `MeshBuilder.swift` the helpers had to widen. It is a real
trade — a slightly larger surface in exchange for a file per shape — and worth
noticing rather than absorbing silently.

---

## The three solids

Every solid is now just a list of triangles handed to `MeshBuilder.flat`, and
each gets its own file. One shape, one file, the way an engine gives one mesh one
asset.

**`Sources/SpaceFighter/Content/Meshes/ShipMesh.swift`** — new file:

```swift
import simd

/// The player's fighter: a sleek four-faced dart whose nose points down -Z.
enum ShipMesh {
    static func make() -> Mesh {
        let nose  = Vec3( 0.0,  0.0, -2.0)
        let top   = Vec3( 0.0,  0.4,  1.0)
        let left  = Vec3(-1.3, -0.3,  1.0)
        let right = Vec3( 1.3, -0.3,  1.0)
        return MeshBuilder.flat([
            (nose, left, top),    // port hull
            (nose, top, right),   // starboard hull
            (nose, right, left),  // belly
            (top, left, right),   // engine deck
        ])
    }
}
```

Four points, four faces — a tetrahedron stretched forward. The nose sits at
**−Z**, matching chapter 04's forward convention, which is what will make
"fly where the nose points" a one-liner in chapter 10. From behind it reads
unmistakably as a fighter, for twelve vertices.

**`Sources/SpaceFighter/Content/Meshes/EnemyMesh.swift`** — new file:

```swift
import simd

/// A tumbling octahedron — the simplest solid that still reads as hostile.
enum EnemyMesh {
    static func make() -> Mesh {
        let r: Float = 0.9
        let px = Vec3(r, 0, 0), nx = Vec3(-r, 0, 0)
        let py = Vec3(0, r, 0), ny = Vec3(0, -r, 0)
        let pz = Vec3(0, 0, r), nz = Vec3(0, 0, -r)
        return MeshBuilder.flat([
            (py, px, pz), (py, pz, nx), (py, nx, nz), (py, nz, px),  // top cap
            (ny, pz, px), (ny, nx, pz), (ny, nz, nx), (ny, px, nz),  // bottom cap
        ])
    }
}
```

An octahedron: six points on the axes, eight faces, two caps of four. The
simplest solid that still reads as a deliberate, hostile object rather than a
mistake. Chapter 12 tints chasers red and drifters amber — same mesh, different
`Renderable` colour.

**`Sources/SpaceFighter/Content/Meshes/ProjectileMesh.swift`** — new file:

```swift
import simd

/// A small cube. Bolts scale it into a bar and draw it unlit, so it glows.
enum ProjectileMesh {
    static func make() -> Mesh {
        let h: Float = 0.5
        let v = [
            Vec3(-h, -h, -h), Vec3(h, -h, -h), Vec3(h, h, -h), Vec3(-h, h, -h),
            Vec3(-h, -h,  h), Vec3(h, -h,  h), Vec3(h, h,  h), Vec3(-h, h,  h),
        ]
        var tris: [(Vec3, Vec3, Vec3)] = []
        tris += MeshBuilder.quad(v[4], v[5], v[6], v[7])  // +Z
        tris += MeshBuilder.quad(v[1], v[0], v[3], v[2])  // -Z
        tris += MeshBuilder.quad(v[0], v[4], v[7], v[3])  // -X
        tris += MeshBuilder.quad(v[5], v[1], v[2], v[6])  // +X
        tris += MeshBuilder.quad(v[3], v[7], v[6], v[2])  // +Y
        tris += MeshBuilder.quad(v[0], v[1], v[5], v[4])  // -Y
        return MeshBuilder.flat(tris)
    }
}
```

A plain cube — but chapter 12 spawns bolts with a `scale` of
`(0.18, 0.18, 0.7)`, stretching it into a glowing bar. One mesh, restyled per
instance, which is the instancing payoff chapter 08 sets up.

---

## A starfield that never runs out

Stars are just points scattered in a cube.

**`Sources/SpaceFighter/Content/Meshes/SceneryMesh.swift`** — new file:

```swift
import simd

/// Backdrop geometry: the starfield and the ground grid. Neither is entity art,
/// so they share a file rather than getting one each.
enum SceneryMesh {
    static func starfield(count: Int, span: Float) -> Mesh {
        var vertices: [Vertex] = []
        vertices.reserveCapacity(count)
        let half = span * 0.5
        for _ in 0..<count {
            let p = Vec3(Float.random(in: -half...half),
                         Float.random(in: -half...half),
                         Float.random(in: -half...half))
            vertices.append(Vertex(position: p,
                                   normal: Vec3(Float.random(in: 0.4...1.0), 0, 0)))
        }
        return Mesh(vertices: vertices, indices: [], primitive: .point)
    }
}
```

Two oddities. `indices` is empty, because points don't need them — the renderer
will draw this non-indexed. And we're smuggling a **brightness** value into
`normal.x`: a point has no surface, so its normal channel is dead weight, and
reusing it saves adding a field to `Vertex` for one mesh. The star shader will
read it back in chapter 07.

The obvious problem: fly far enough and you leave the cube, and space goes black.
The fix is three lines of shader in chapter 07 that **wrap each star into the cube
centred on the camera**, tiling the same few thousand points infinitely in every
direction, forever, at zero CPU cost.

That's worth flagging as a habit, not a trick. When you catch yourself about to
loop over thousands of things on the CPU to feed the GPU, ask whether the *rule*
can move into the shader instead and be applied per-vertex for free.

## A horizon from lines

**`SceneryMesh.swift`**, in `SceneryMesh` — after `starfield`:

```diff
         return Mesh(vertices: vertices, indices: [], primitive: .point)
     }
+
+    static func grid(halfExtent: Float, spacing: Float) -> Mesh {
+        var vertices: [Vertex] = []
+        var i = -halfExtent
+        while i <= halfExtent + 0.001 {
+            vertices.append(Vertex(position: Vec3(i, 0, -halfExtent), normal: .zero))
+            vertices.append(Vertex(position: Vec3(i, 0,  halfExtent), normal: .zero))
+            vertices.append(Vertex(position: Vec3(-halfExtent, 0, i), normal: .zero))
+            vertices.append(Vertex(position: Vec3( halfExtent, 0, i), normal: .zero))
+            i += spacing
+        }
+        return Mesh(vertices: vertices, indices: [], primitive: .line)
+    }
 }
```

A lattice on the XZ plane, four vertices per step: one line along Z, one along X.
It gives orientation the way Star Fox's ground does — you read your pitch and roll
against it instantly.

The `+ 0.001` in the loop condition is float defensiveness. Accumulating `i +=
spacing` drifts, and without the epsilon the final line sometimes vanishes
depending on the numbers you pass.

This patch is *finite*, unlike the starfield. Chapter 08 slides it under the
player and snaps it to whole grid cells, so a modest patch reads as an endless
floor with no crawling.

### Two numbers to keep an eye on

The counts you pass these last two generators are the only real budget decisions
in the file, and both have a wrong answer in each direction. Too few stars and
space looks empty; too many and you are paying for points smaller than a pixel.
Too small a grid extent and you can see its edge, which instantly destroys the
illusion of a floor; too large and you are drawing thousands of line segments
that are a single pixel wide at the horizon. The values we'll settle on in a
moment — 2600 stars over a 480-unit cube, a 240-unit grid at 6-unit spacing — are
tuned against chapter 08's camera and draw distance, so if you change the far
plane later, revisit them together.

There is also a hard ceiling hiding in `Mesh`: `indices` is `[UInt16]`, so a
single indexed mesh cannot address more than 65,536 vertices. Nothing here comes
close, and 16-bit indices halve the bandwidth of the index buffer. But it is the
first limit you will hit if you load a real model in chapter 15, and the symptom
is baffling if you do not know to expect it — geometry that folds in on itself as
indices wrap around to zero.

---

## The asset registry

You have five shapes in five files and nothing that names them. This is where
chapter 02's `UStaticMesh*` arrives: gameplay needs a way to say "draw the ship
one" that carries no geometry and no GPU handle — an **id**.

The obvious place to turn an id into a mesh is the renderer: read an id, call the
matching generator, upload the result. That works, and it has a failure mode
worth designing out. Nothing makes the renderer's list *stay* complete. Add a
sixth shape, forget the upload line, and the compiler is perfectly happy right up
until something asks to be drawn and isn't there.

Swift has a better answer. Put the generator on the id and switch over `self`.

**`Sources/SpaceFighter/Content/MeshID.swift`** — new file:

```swift
/// Names the art gameplay can ask for. A component says `Renderable(mesh:
/// .enemy, …)` and never touches a buffer — this is the whole reason Metal
/// stays out of `Components/` and `Systems/`.
enum MeshID: Int, CaseIterable {
    case ship
    case enemy
    case projectile
}

extension MeshID {
    /// The shape behind this id. Add a case above and this switch stops
    /// compiling until you say what it looks like — which is the point.
    var mesh: Mesh {
        switch self {
        case .ship:       return ShipMesh.make()
        case .enemy:      return EnemyMesh.make()
        case .projectile: return ProjectileMesh.make()
        }
    }
}
```

A Swift `switch` over an enum must be exhaustive. There's no `default` here, so
adding `case asteroid` above turns this into a **build error** naming this exact
line. The registry cannot silently fall behind the list of ids, because the
compiler won't let the project build while it has.

That is the whole scalability story for art in this project, and note what it
isn't: no loader, no file format, no registration call to remember. A generator
is just a function, and the enum is the index. Chapter 15 replaces one of those
`switch` arms with a file load and nothing else in the project changes.

### Which pipeline draws it

An id names a shape. It also has to answer a second question, and the answer
belongs here for the same reason: the ship and the enemy are lit surfaces, and a
bolt is a glow that shouldn't be shaded at all.

**`MeshID.swift`** — after the `mesh` extension:

```diff
         }
     }
 }
+
+/// How a mesh should be drawn. The renderer owns the pipelines; the content
+/// says which one it belongs in.
+enum Material {
+    case lit     // shaded by the sun direction
+    case glow    // emissive, no lighting, doesn't occlude
+}
+
+extension MeshID {
+    var material: Material {
+        switch self {
+        case .ship, .enemy: return .lit
+        case .projectile:   return .glow
+        }
+    }
+}
```

This looks like a small convenience and isn't. Without it, chapter 08's renderer
has to contain a line like `for id in [MeshID.ship, .enemy]` — a hand-maintained
list of which meshes are lit, sitting in the renderer, with no compiler check and
no reason to stay correct. With it, the renderer asks the id and the exhaustive
switch keeps the answer honest. It also keeps the words *ship* and *enemy* out of
`Render/` entirely, which is exactly what chapter 02's boundary test insists on.

### The scenery is not entity art

The grid and the starfield need the same treatment but not the same type.
Gameplay never asks for a grid — no entity has a `Renderable(mesh: .grid)` — so a
grid has no business in a list gameplay indexes into.

**`MeshID.swift`** — after the `material` extension:

```diff
         }
     }
 }
+
+/// Backdrop geometry the renderer owns outright. Unlike `MeshID`, nothing in
+/// gameplay ever names one of these — the renderer draws them on its own
+/// initiative, so they never appear on a `Renderable`.
+enum SceneryID: CaseIterable {
+    case starfield
+    case grid
+
+    static let starSpan: Float = 480     // side length of the star tiling cube
+    static let gridSpacing: Float = 6    // world units between grid lines
+
+    var mesh: Mesh {
+        switch self {
+        case .starfield: return SceneryMesh.starfield(count: 2600, span: Self.starSpan)
+        case .grid:      return SceneryMesh.grid(halfExtent: 240, spacing: Self.gridSpacing)
+        }
+    }
+}
```

The two constants live here rather than on the renderer because **the generator
and the code that has to agree with it are now looking at the same number.**
Chapter 08 needs `starSpan` again when it tells the star shader how big a cube to
tile, and `gridSpacing` again when it snaps the grid under the camera's focus
point. Both are correctness requirements, not preferences: a shader tiling at a
different span than the mesh was built with produces visible seams. One `static
let`, no drift.

`SceneryID` has no raw `Int` value, because unlike `MeshID` it's never stored in a
component or serialised — it exists to make a list and a switch, and nothing more.

Everything in this section went into `Content/`, not `Render/`. That placement is
the claim that ids are *art vocabulary*, not renderer plumbing — a `.usda` path in
an Unreal project is content too, even though only the renderer ever dereferences
it. The GPU side of the story, `[MeshID: GPUMesh]`, lands in
`Render/MeshRegistry.swift` in chapter 08. Two registries, one naming art and one
holding buffers, and the split is deliberate.

---

## Checkpoint

**`main.swift`** — replace the whole file (throwaway):

```swift
import Foundation
import simd

func report(_ name: String, _ m: Mesh) {
    print("\(name.padding(toLength: 12, withPad: " ", startingAt: 0))"
          + "\(m.vertices.count) verts, \(m.indices.count) indices, \(m.primitive)")
}

for id in MeshID.allCases { report("\(id)", id.mesh) }
for id in SceneryID.allCases { report("\(id)", id.mesh) }

let e = MeshID.enemy.mesh
let unit = e.vertices.allSatisfy { abs(simd_length($0.normal) - 1) < 1e-4 }
let outward = e.vertices.allSatisfy { simd_dot($0.normal, $0.position) > 0 }
print("enemy normals unit: \(unit), outward: \(outward)")
```

```console
$ swift run
ship        12 verts, 12 indices, triangle
enemy       24 verts, 24 indices, triangle
projectile  36 verts, 36 indices, triangle
starfield   2600 verts, 0 indices, point
grid        324 verts, 0 indices, line
enemy normals unit: true, outward: true
```

Nothing in that checkpoint names a shape. It walks the two `allCases` lists, which
means it will keep reporting the truth after you add something — and so will the
renderer, for the same reason.

The counts are flat shading's arithmetic: the ship's 4 triangles × 3 fresh
vertices = 12, the enemy's 8 × 3 = 24, the cube's 6 quads → 12 triangles × 3 = 36.
If you see 4, 6 or 8 vertices instead, your `flat` is sharing corners somewhere.

The last line is the self-correcting normal working. **If `outward` is `false`**,
the centroid comparison in `flat` is inverted — check the `< 0`. For the enemy
specifically, `simd_dot(normal, position) > 0` is a valid outwardness test only
because the octahedron is centred on the origin; don't reuse that check for the
ship, whose centroid isn't at its origin.

---

## Challenge

Add an asteroid. Take the octahedron from `EnemyMesh.make()` and jitter each of
its six points by a small random amount before handing them to
`MeshBuilder.flat`, so every asteroid is a slightly different lumpy rock. Two
questions to answer while you do it: does the self-correcting normal still work
once the shape is no longer symmetric, and what happens if you jitter a point so
far that the shape stops being convex?

---

## Making your own shape

The full recipe is four steps, and the compiler drives three of them:

1. Add a case to `MeshID` in `Content/MeshID.swift`. **The build now fails**,
   twice — in `MeshID.mesh` and in `MeshID.material` — because neither switch is
   exhaustive any more.
2. Write `Content/Meshes/YourShapeMesh.swift` returning `MeshBuilder.flat([...])`.
3. Add the two `switch` arms: what it looks like, and how it's drawn. The build
   passes again.
4. Give some entity `Renderable(mesh: .yourShape, color: …)`.

That's the whole art pipeline, and nothing in `Render/` changes — chapter 08
uploads whatever `MeshID.allCases` contains and draws it with whatever pipeline
`material` names. Chapter 15 covers graduating to real models, where step 2
becomes a file load instead of a generator and the rest stays exactly as it is.

---

**Next:** shaders, pipelines, and the first thing you actually see. →
[Chapter 07: Shaders](07-shaders.md)
