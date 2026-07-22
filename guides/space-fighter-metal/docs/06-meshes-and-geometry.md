# 06 · Meshes & simple geometry 🛠️

> **You'll leave this chapter with:** an understanding of flat shading and face
> normals, and the ability to generate every shape in the game — ship, enemy,
> bolt, endless starfield, ground grid — in code, reading
> `Mesh.swift` top to bottom. Zero art
> assets, exactly the brief.

---

## What a mesh actually is

A `Mesh` is three things:

```swift
struct Mesh {
    var vertices: [Vertex]      // positions (+ normals) in local space
    var indices:  [UInt16]      // triangles as triples of vertex indices; empty = non-indexed
    var primitive: Primitive    // .triangle, .line, or .point
}
```

- **Vertices** are corners, each a `position` and a `normal` (the direction the
  surface faces at that corner — the lighting input from chapter 03).
- **Indices** let triangles share corners: a cube has 8 corners but 12 triangles,
  so instead of 36 vertices you store 8 and 36 indices. When `indices` is empty we
  draw non-indexed (stars and the grid).
- **Primitive** tells the GPU how to connect the vertices — filled triangles,
  line segments, or lone points.

The `Renderer` uploads each mesh into GPU buffers once at startup
(`Renderer.init` → `upload`) and never touches them again.

---

## Flat shading and the outward-normal trick

We want the crisp, faceted look of classic low-poly space shooters — each face a
single flat shade. That's **flat shading**, and it dictates how we build normals.

A **smooth** mesh shares a vertex between the faces that meet at it and averages
their normals, giving rounded gradients. A **flat** mesh does the opposite: every
triangle gets its *own three vertices* and *one shared normal* — the face's
normal — so each face reads as a distinct plane. More vertices, simpler math,
and exactly the aesthetic we're after.

The normal of a triangle is the cross product of two of its edges — but which way
does it point? That depends on the winding order of the corners, which is easy to
get wrong when you're typing coordinates. So instead of being careful, we *make
it self-correcting*: compute the normal, and if it points toward the shape's
centre, flip it. Faces then light correctly no matter how we listed their
corners.

```swift
private static func flat(_ tris: [(Vec3, Vec3, Vec3)]) -> Mesh {
    let centroid = /* average of every corner */
    for t in tris {
        let faceCenter = (t.0 + t.1 + t.2) / 3
        var normal = simd_normalize(simd_cross(t.1 - t.0, t.2 - t.0))
        if simd_dot(normal, faceCenter - centroid) < 0 { normal = -normal }  // face outward
        // emit three fresh vertices sharing `normal`, plus their indices
    }
}
```

`simd_dot(normal, faceCenter - centroid) < 0` asks "does this normal point back
toward the middle of the shape?" — if so, we're inside-out, so negate. Because of
this, we can also skip back-face culling entirely (`encoder.setCullMode(.none)`
in the renderer) and never see a black face. Give the renderer a list of
triangles; get a correctly lit mesh back.

---

## The shapes

Every solid is just a list of triangles fed to `flat`.

### The ship — a four-faced dart

Four points, four triangular faces, nose down −Z (our forward convention):

```swift
let nose  = Vec3( 0.0,  0.0, -2.0)   // the pointy end, forward
let top   = Vec3( 0.0,  0.4,  1.0)
let left  = Vec3(-1.3, -0.3,  1.0)
let right = Vec3( 1.3, -0.3,  1.0)
return flat([
    (nose, left, top),    // port hull
    (nose, top, right),   // starboard hull
    (nose, right, left),  // belly
    (top, left, right),   // engine deck
])
```

It's a tetrahedron stretched forward — unmistakably a fighter from behind, and
four triangles cheap.

### The enemy — an octahedron

The simplest solid that still reads as a deliberate, hostile object: six points
(±X, ±Y, ±Z) and eight triangular faces, built the same way. We tint chasers red
and drifters amber at spawn (chapter 10) — same mesh, different `Renderable`
colour.

### The bolt — a cube

Six quads, each split into two triangles by a small `quad(a,b,c,d)` helper.
Rendered unlit and scaled long-and-thin at spawn (`Transform.scale =
(0.18, 0.18, 0.7)`), so it reads as a glowing bar, not a box. One mesh, restyled
per instance — the instancing payoff again.

---

## The starfield — a few thousand points that tile forever

Stars are just points scattered in a cube:

```swift
static func starfield(count: Int, span: Float) -> Mesh {
    // `count` random positions in a `span`-wide cube; brightness tucked into normal.x
    // primitive = .point, no indices
}
```

The problem: fly far enough and you'd leave the cube, and space would go black.
The fix is a lovely trick done entirely on the GPU, in `star_vertex`: **wrap each
star into the box centred on the camera.**

```metal
float3 rel = v.position - frame.cameraPosition;   // star relative to camera
rel = rel - round(rel / params.span) * params.span; // fold into [-span/2, span/2]
float3 world = frame.cameraPosition + rel;
```

`round(rel / span) * span` snaps to the nearest whole cube, and subtracting it
tiles the same few thousand points infinitely around you — you can fly forever
and the sky is always full, at zero CPU cost. The fragment shader then rounds
each square point into a soft dot:

```metal
float d = distance(pointCoord, float2(0.5));
if (d > 0.5) discard_fragment();
```

Brightness rides along in `normal.x` (we had a spare channel — points don't need
a lighting normal), giving the field some variety instead of a wall of identical
dots.

### Why this matters

That wrap is a tiny lesson in GPU thinking: instead of updating thousands of
positions on the CPU each frame, we express the *rule* once in the shader and let
the hardware apply it per vertex, per frame, for free. Whenever you catch
yourself about to loop over lots of things on the CPU to feed the GPU, ask
whether the rule can move into the shader instead.

---

## The ground grid — a horizon from lines

A flat lattice of line segments on the XZ plane gives orientation the way Star
Fox's ground does — you instantly read pitch and roll against it.

```swift
static func grid(halfExtent: Float, spacing: Float) -> Mesh {
    // for each i from -halfExtent to +halfExtent: one line along Z and one along X
    // primitive = .line, no indices
}
```

It's a *finite* patch, but the renderer slides it under the player and **snaps it
to the grid spacing** so the lines never appear to crawl:

```swift
let gx = (playerPosition.x / spacing).rounded() * spacing   // Renderer.drawGrid
let gz = (playerPosition.z / spacing).rounded() * spacing
let model = Math.translation(Vec3(gx, groundY, gz))
```

Snapping to a whole cell means the pattern shifts by exactly one cell as you
move — invisible — so a modest patch reads as an endless floor. Same idea as the
star wrap, done on the CPU because there's only one grid.

---

## Making your own shape

The recipe, start to finish:

1. Add a case to `MeshID` (e.g. `.asteroid`).
2. Write a generator in `MeshLibrary` returning `flat([...])` for a solid, or
   raw points/lines for a `.point`/`.line` mesh.
3. Upload it in `Renderer.init`: `meshes[.asteroid] = upload(MeshLibrary.asteroid())`.
4. Give some entity `Renderable(mesh: .asteroid, color: …)`.

That's the whole art pipeline for now. Chapter 12 covers graduating to real
models (Model I/O, glTF/USD) when "simple geometry" stops being enough.

---

**Next:** the clock that drives all of this — the game loop and timing. →
[Chapter 07: The game loop & timing](07-the-game-loop.md)
