# 05 · Meshes & simple geometry 🛠️

> **You'll leave this chapter with:** the CPU-side data structures the GPU will
> read, and every shape in the game — ship, enemy, bolt, endless starfield,
> ground grid — generated in code. Zero art assets.
>
> **Files created:** `Sources/SpaceFighter/Render/RenderTypes.swift`,
> `Sources/SpaceFighter/Mesh.swift`

We do geometry *before* the renderer because the renderer needs something to
draw. By the end of this chapter you'll have real vertex data you can print and
inspect; chapter 06 puts it on screen.

---

## The types the GPU will read

Before meshes, we need the structs that cross the CPU/GPU boundary. Their memory
layout must match the shader structs you'll write in chapter 06 *exactly*, or the
GPU reads garbage.

We get that for free by using `simd` types throughout: `SIMD3<Float>` matches
Metal Shading Language's `float3`, `SIMD4<Float>` matches `float4`, and
`simd_float4x4` matches `float4x4` — same size, same alignment.

> **The one trap:** `float3` is **16-byte aligned**, not 12. Put a lone `Float`
> right after a `float3` in a struct and it silently gains padding on one side
> but maybe not the other — instant garbage. The rule that saves you: keep
> everything in `SIMD*` types, as we do below.

### Create `Sources/SpaceFighter/Render/RenderTypes.swift`

Make the directory first (`mkdir -p Sources/SpaceFighter/Render`), then:

```swift
import simd

// These structs are the contract between Swift and the Metal shaders. Their
// memory layout MUST match the corresponding `struct`s in `Shaders.swift`
// (chapter 06), or the GPU will read garbage. We rely on `simd` types having
// the same size and alignment as MSL's types:
//
//   SIMD3<Float>  -> float3     (16 bytes, 16-aligned — note the padding!)
//   SIMD4<Float>  -> float4     (16 bytes)
//   simd_float4x4 -> float4x4   (64 bytes)

/// One vertex of a mesh. Read by the vertex shader via `[[vertex_id]]`.
struct Vertex {
    var position: Vec3
    var normal: Vec3
}

/// Per-entity draw data. One of these per visible entity, uploaded as an array
/// and indexed in the shader by `[[instance_id]]`.
struct InstanceData {
    var model: Mat4
    var color: Vec4
}

/// Constants shared by every draw in a frame: the combined camera matrix, where
/// the camera is, and the direction sunlight travels.
struct FrameUniforms {
    var viewProjection: Mat4
    var cameraPosition: Vec3
    var lightDirection: Vec3
}

/// A 2D vertex for the heads-up display, positioned directly in normalised
/// device coordinates (-1…1, origin at screen centre). Used in chapter 11.
struct HUDVertex {
    var position: SIMD2<Float>
    var color: Vec4
}

/// Names the handful of meshes the game draws. Gameplay code refers to art by
/// id only (`Renderable(mesh: .enemy, …)`); the renderer owns the GPU buffers.
enum MeshID: Int, CaseIterable {
    case ship
    case enemy
    case projectile
}
```

`FrameUniforms` sidesteps the padding trap by using two `SIMD3`s back to back,
each already occupying 16 bytes. If you ever change one of these structs and the
screen goes to noise, this is the first thing to check.

---

## What a mesh actually is

A mesh is three things:

- **Vertices** — corners, each a `position` and a `normal` (the direction the
  surface faces there — the lighting input from chapter 03).
- **Indices** — triangles as triples of vertex indices, so triangles can share
  corners. When the index list is empty we draw non-indexed (stars, grid).
- **Primitive** — how the GPU connects the vertices: filled triangles, line
  segments, or lone points.

## Flat shading and the outward-normal trick

We want the crisp, faceted look of classic low-poly space shooters — each face a
single flat shade. That's **flat shading**, and it dictates how we build normals.

A **smooth** mesh shares a vertex between the faces that meet at it and averages
their normals, giving rounded gradients. A **flat** mesh does the opposite: every
triangle gets its *own three vertices* and *one shared normal* — the face's
normal — so each face reads as a distinct plane. More vertices, simpler math, and
exactly the aesthetic we want.

The normal of a triangle is the cross product of two of its edges — but which way
does it point? That depends on the winding order of the corners, which is easy to
get wrong when you're typing coordinates. So instead of being careful, we make it
**self-correcting**: compute the normal, and if it points toward the shape's
centre, flip it. Faces then light correctly no matter how we listed their
corners, and we can skip back-face culling entirely.

## The starfield trick, previewed

Stars are points scattered in a cube. Fly far enough and you'd leave the cube and
space would go black. The fix happens on the GPU in chapter 06's star shader:
each star is **wrapped into the cube centred on the camera**, so the same few
thousand points tile infinitely around you at zero CPU cost. All this file does
is generate the points; the wrap is three lines of shader.

---

## Create `Sources/SpaceFighter/Mesh.swift`

```swift
import simd

/// How a mesh's vertices are assembled by the GPU.
enum Primitive {
    case triangle   // solid surfaces (ship, enemies, bullets)
    case line       // the ground grid
    case point      // the starfield
}

/// A CPU-side mesh: raw geometry the `Renderer` uploads into GPU buffers once at
/// startup. If `indices` is empty the mesh is drawn non-indexed.
struct Mesh {
    var vertices: [Vertex]
    var indices: [UInt16]
    var primitive: Primitive
}

// MARK: - Procedural geometry
//
// Everything here is generated in code — no model files, no asset pipeline.
// Each solid shape is *flat shaded*: every triangle gets its own three vertices
// and a single face normal.

enum MeshLibrary {

    // MARK: Triangle-soup helpers

    /// Build a flat-shaded mesh from a list of triangles. Each triangle becomes
    /// three fresh vertices sharing one normal. The normal is computed from the
    /// winding, then flipped if it points *toward* the shape's centre, so faces
    /// always light correctly regardless of the order we listed corners in.
    private static func flat(_ tris: [(Vec3, Vec3, Vec3)]) -> Mesh {
        var sum = Vec3.zero
        for t in tris { sum += t.0 + t.1 + t.2 }
        let centroid = sum / Float(tris.count * 3)

        var vertices: [Vertex] = []
        var indices: [UInt16] = []
        vertices.reserveCapacity(tris.count * 3)
        indices.reserveCapacity(tris.count * 3)

        for t in tris {
            let faceCenter = (t.0 + t.1 + t.2) / 3
            var normal = simd_normalize(simd_cross(t.1 - t.0, t.2 - t.0))
            if simd_dot(normal, faceCenter - centroid) < 0 { normal = -normal }
            let base = UInt16(vertices.count)
            vertices.append(Vertex(position: t.0, normal: normal))
            vertices.append(Vertex(position: t.1, normal: normal))
            vertices.append(Vertex(position: t.2, normal: normal))
            indices.append(base)
            indices.append(base + 1)
            indices.append(base + 2)
        }
        return Mesh(vertices: vertices, indices: indices, primitive: .triangle)
    }

    /// Split a quad (given counter-clockwise) into two triangles.
    private static func quad(_ a: Vec3, _ b: Vec3, _ c: Vec3, _ d: Vec3) -> [(Vec3, Vec3, Vec3)] {
        [(a, b, c), (a, c, d)]
    }

    // MARK: Meshes

    /// The player's fighter: a sleek four-faced dart whose nose points down -Z
    /// (the forward convention used everywhere in this project).
    static func ship() -> Mesh {
        let nose  = Vec3( 0.0,  0.0, -2.0)
        let top   = Vec3( 0.0,  0.4,  1.0)
        let left  = Vec3(-1.3, -0.3,  1.0)
        let right = Vec3( 1.3, -0.3,  1.0)
        return flat([
            (nose, left, top),    // port hull
            (nose, top, right),   // starboard hull
            (nose, right, left),  // belly
            (top, left, right),   // engine deck (back)
        ])
    }

    /// A tumbling octahedron enemy — the simplest solid that still reads as a
    /// deliberate, hostile shape.
    static func enemy() -> Mesh {
        let r: Float = 0.9
        let px = Vec3(r, 0, 0), nx = Vec3(-r, 0, 0)
        let py = Vec3(0, r, 0), ny = Vec3(0, -r, 0)
        let pz = Vec3(0, 0, r), nz = Vec3(0, 0, -r)
        return flat([
            (py, px, pz), (py, pz, nx), (py, nx, nz), (py, nz, px),  // top cap
            (ny, pz, px), (ny, nx, pz), (ny, nz, nx), (ny, px, nz),  // bottom cap
        ])
    }

    /// A small cube used for the player's bolts (rendered unlit so it glows).
    static func projectile() -> Mesh {
        let h: Float = 0.5
        let v = [
            Vec3(-h, -h, -h), Vec3(h, -h, -h), Vec3(h, h, -h), Vec3(-h, h, -h),  // 0..3 back
            Vec3(-h, -h,  h), Vec3(h, -h,  h), Vec3(h, h,  h), Vec3(-h, h,  h),  // 4..7 front
        ]
        var tris: [(Vec3, Vec3, Vec3)] = []
        tris += quad(v[4], v[5], v[6], v[7])  // +Z
        tris += quad(v[1], v[0], v[3], v[2])  // -Z
        tris += quad(v[0], v[4], v[7], v[3])  // -X
        tris += quad(v[5], v[1], v[2], v[6])  // +X
        tris += quad(v[3], v[7], v[6], v[2])  // +Y
        tris += quad(v[0], v[1], v[5], v[4])  // -Y
        return flat(tris)
    }

    /// A cloud of point stars in a cube. The star vertex shader (chapter 06)
    /// wraps these around the camera so the same few thousand points tile the
    /// whole sky.
    static func starfield(count: Int, span: Float) -> Mesh {
        var vertices: [Vertex] = []
        vertices.reserveCapacity(count)
        let half = span * 0.5
        for _ in 0..<count {
            let p = Vec3(
                Float.random(in: -half...half),
                Float.random(in: -half...half),
                Float.random(in: -half...half)
            )
            // Vary brightness a touch via the normal.x channel, reused as a
            // scalar in the star shader (points don't need a lighting normal).
            vertices.append(Vertex(position: p, normal: Vec3(Float.random(in: 0.4...1.0), 0, 0)))
        }
        return Mesh(vertices: vertices, indices: [], primitive: .point)
    }

    /// A flat reference grid on the XZ plane, drawn as lines. The renderer
    /// snaps it under the player so it reads as an endless floor/horizon.
    static func grid(halfExtent: Float, spacing: Float) -> Mesh {
        var vertices: [Vertex] = []
        var i = -halfExtent
        while i <= halfExtent + 0.001 {
            // Lines parallel to Z.
            vertices.append(Vertex(position: Vec3(i, 0, -halfExtent), normal: .zero))
            vertices.append(Vertex(position: Vec3(i, 0,  halfExtent), normal: .zero))
            // Lines parallel to X.
            vertices.append(Vertex(position: Vec3(-halfExtent, 0, i), normal: .zero))
            vertices.append(Vertex(position: Vec3( halfExtent, 0, i), normal: .zero))
            i += spacing
        }
        return Mesh(vertices: vertices, indices: [], primitive: .line)
    }
}
```

### Reading what you just wrote

- **The ship** is a tetrahedron stretched forward — four triangles, unmistakably
  a fighter from behind, with its nose at −Z so "forward" matches chapter 03.
- **The enemy** is an octahedron: six points, eight faces. We'll tint chasers red
  and drifters amber at spawn (chapter 10) — same mesh, different colour.
- **The bolt** is a cube, but we scale it long and thin per instance
  (`0.18, 0.18, 0.7`) so it reads as a glowing bar. One mesh, restyled per
  entity.
- **The grid** is a finite patch; chapter 06 slides and snaps it under the player
  so it looks infinite.

---

## Checkpoint

Temporarily **replace `main.swift`** to inspect the geometry you just generated:

```swift
import Foundation
import simd

func report(_ name: String, _ mesh: Mesh) {
    print(String(format: "%-12@ %5d verts  %5d indices  %@",
                 name as NSString, mesh.vertices.count, mesh.indices.count,
                 "\(mesh.primitive)" as NSString))
}

report("ship", MeshLibrary.ship())
report("enemy", MeshLibrary.enemy())
report("projectile", MeshLibrary.projectile())
report("starfield", MeshLibrary.starfield(count: 2600, span: 480))
report("grid", MeshLibrary.grid(halfExtent: 240, spacing: 6))

// Every flat-shaded normal should be unit length and point away from the origin.
let enemy = MeshLibrary.enemy()
let allUnit = enemy.vertices.allSatisfy { abs(simd_length($0.normal) - 1) < 1e-4 }
let allOutward = enemy.vertices.allSatisfy { simd_dot($0.normal, $0.position) > 0 }
print("enemy normals unit: \(allUnit), outward: \(allOutward)")
```

```console
$ swift run
ship            12 verts     12 indices  triangle
enemy           24 verts     24 indices  triangle
projectile      36 verts     36 indices  triangle
starfield     2600 verts        0 indices  point
grid            324 verts        0 indices  line
enemy normals unit: true, outward: true
```

The counts are the arithmetic of flat shading: the ship's 4 triangles × 3 fresh
vertices = 12, the enemy's 8 × 3 = 24, the cube's 6 quads → 12 triangles × 3 = 36.
The `unit: true, outward: true` line is the self-correcting normal trick working
— if `outward` is `false`, your `flat()` helper isn't flipping normals against
the centroid.

---

## Making your own shape

The recipe, once chapter 06 exists:

1. Add a case to `MeshID` in `RenderTypes.swift` (e.g. `.asteroid`).
2. Write a generator in `MeshLibrary` returning `flat([...])`.
3. Upload it in `Renderer.init`.
4. Give some entity `Renderable(mesh: .asteroid, color: …)`.

That's the whole art pipeline for now. Chapter 12 covers graduating to real
models when "simple geometry" stops being enough.

---

**Next:** shaders, pipelines, and the first thing you actually see. →
[Chapter 06: The render pipeline](06-the-render-pipeline.md)
