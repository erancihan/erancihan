# 09 · Meshes & simple geometry 🛠️

> **You'll leave this chapter with:** an understanding of flat shading and face
> normals, and the ability to generate every shape in the game — ship, enemy,
> bolt, endless starfield, ground grid — in code, reading `content/meshes/` top to
> bottom, and uploading it through `render/MeshRegistry`. Zero art assets, exactly
> the brief. The shapes are identical to the
> [Metal guide](../../space-fighter-metal/docs/06-meshes-and-geometry.md); the
> code is C++/GLM and the GPU tricks are GLSL.

---

## What a mesh actually is

We keep meshes in two forms: **CPU data** we generate, and the **GPU buffers** we
upload it into (chapter 08). They live in different directories, and the line
between them is the layering rule from chapter 02:

```cpp
// render/types/Mesh.hpp — plain data. Included by content/ and by systems/.
struct Vertex {
    glm::vec3 position;
    glm::vec3 normal;
};

struct MeshData {
    std::vector<Vertex>   vertices;   // positions (+ normals) in local space
    std::vector<uint16_t> indices;    // triangles as index triples; empty = non-indexed
};
```

```cpp
// render/MeshRegistry.hpp — the uploaded, GPU-side handle. render/ only.
struct GPUMesh {
    Buffer   vertexBuffer;
    Buffer   indexBuffer;             // null when indices was empty
    uint32_t vertexCount, indexCount;
};
```

`MeshData` has no `Vk` anywhere in it, which is what lets a mesh generator in
`content/` and a system in `systems/` both hold one. `GPUMesh` is nothing *but*
Vulkan handles, so it stays behind the registry. Same mesh, two lives, and the
type system marks the boundary between them.

- **Vertices** are corners, each a `position` and a `normal` (the direction the
  surface faces at that corner — the lighting input from chapter 04).
- **Indices** let triangles share corners: a cube has 8 corners but 12 triangles,
  so instead of 36 vertices you store 8 and 36 indices. When `indices` is empty we
  draw non-indexed with `vkCmdDraw` (stars and the grid).
- **Topology** — filled triangles, line segments, or lone points — is *not* on the
  mesh here. In Vulkan it lives in the pipeline (chapter 07), so a mesh's topology
  is really "which pipeline draws it", and that is decided by the mesh's
  **material** rather than by its name (chapter 07): triangles → `lit` or `glow`,
  lines → `gridLine`, points → `star`.

The **mesh registry** (`render/MeshRegistry.cpp`) runs each generated `MeshData`
through a small wrapper over chapter 08's `uploadStatic` — one call per buffer —
and holds the result for the rest of the program:

```cpp
GPUMesh MeshRegistry::upload(const MeshData& d) {
    GPUMesh m;
    m.vertexBuffer = uploadStatic(d.vertices.data(),
                                  d.vertices.size() * sizeof(Vertex),
                                  VK_BUFFER_USAGE_VERTEX_BUFFER_BIT);
    if (!d.indices.empty())
        m.indexBuffer = uploadStatic(d.indices.data(),
                                     d.indices.size() * sizeof(uint16_t),
                                     VK_BUFFER_USAGE_INDEX_BUFFER_BIT);
    m.vertexCount = (uint32_t)d.vertices.size();
    m.indexCount  = (uint32_t)d.indices.size();
    return m;
}
```

---

## Flat shading and the outward-normal trick

We want the crisp, faceted look of classic low-poly space shooters — each face a
single flat shade. That's **flat shading**, and it dictates how we build normals.

A **smooth** mesh shares a vertex between the faces that meet at it and averages
their normals, giving rounded gradients. A **flat** mesh does the opposite: every
triangle gets its *own three vertices* and *one shared normal* — the face's normal
— so each face reads as a distinct plane. More vertices, simpler math, and exactly
the aesthetic we're after.

The normal of a triangle is the cross product of two of its edges — but which way
does it point? That depends on the winding order of the corners, which is easy to
get wrong when you're typing coordinates. So instead of being careful, we *make it
self-correcting*: compute the normal, and if it points toward the shape's centre,
flip it. Faces then light correctly no matter how we listed their corners.

```cpp
// content/meshes/MeshBuilder.cpp
using Tri = std::array<glm::vec3, 3>;

MeshData MeshBuilder::flat(const std::vector<Tri>& tris) {
    glm::vec3 centroid{0};                                  // average of every corner
    for (auto& t : tris) centroid += t[0] + t[1] + t[2];
    centroid /= float(tris.size() * 3);

    MeshData m;
    for (auto& t : tris) {
        glm::vec3 faceCenter = (t[0] + t[1] + t[2]) / 3.0f;
        glm::vec3 normal = glm::normalize(glm::cross(t[1] - t[0], t[2] - t[0]));
        if (glm::dot(normal, faceCenter - centroid) < 0) normal = -normal;  // face outward
        uint16_t base = (uint16_t)m.vertices.size();
        for (auto& p : t) m.vertices.push_back({p, normal});    // three fresh verts, shared normal
        m.indices.insert(m.indices.end(), {base, uint16_t(base+1), uint16_t(base+2)});
    }
    return m;
}
```

`glm::dot(normal, faceCenter - centroid) < 0` asks "does this normal point back
toward the middle of the shape?" — if so, we're inside-out, so negate. Because of
this, we can also disable back-face culling entirely (`cullMode = VK_CULL_MODE_NONE`
in the rasterization state, chapter 07) and never see a black face. Give the mesh
builder a list of triangles; get a correctly lit mesh back.

---

## The shapes

Every solid is just a list of triangles fed to `flat`.

### The ship — a four-faced dart

`content/meshes/ShipMesh.cpp`: four points, four triangular faces, nose down −Z
(our forward convention):

```cpp
glm::vec3 nose { 0.0f,  0.0f, -2.0f};   // the pointy end, forward
glm::vec3 top  { 0.0f,  0.4f,  1.0f};
glm::vec3 left {-1.3f, -0.3f,  1.0f};
glm::vec3 right{ 1.3f, -0.3f,  1.0f};
return flat({
    {nose, left, top},    // port hull
    {nose, top, right},   // starboard hull
    {nose, right, left},  // belly
    {top, left, right},   // engine deck
});
```

It's a tetrahedron stretched forward — unmistakably a fighter from behind, and four
triangles cheap.

### The enemy — an octahedron

The simplest solid that still reads as a deliberate, hostile object: six points
(±X, ±Y, ±Z) and eight triangular faces, built the same way. We tint chasers red
and drifters amber at spawn (chapter 13) — same mesh, different `Renderable` color.

### The bolt — a cube

Six quads, each split into two triangles by a small `quad(a,b,c,d)` helper.
Classified `Material::Glow` so the `glow` pipeline draws it, and scaled
long-and-thin at spawn
(`Transform.scale = (0.18, 0.18, 0.7)`), so it reads as a glowing bar, not a box.
One mesh, restyled per instance — the instancing payoff again.

---

## The starfield — a few thousand points that tile forever

Stars are just points scattered in a cube:

```cpp
// content/meshes/SceneryMesh.cpp
MeshData starfield(int count, float span) {
    MeshData m;                                            // no indices; drawn as points
    for (int i = 0; i < count; i++) {
        glm::vec3 p = randomInCube(span);                  // deterministic PRNG, seeded once
        float brightness = 0.4f + 0.6f * randomUnit();
        m.vertices.push_back({p, glm::vec3(brightness, 0, 0)}); // brightness tucked into normal.x
    }
    return m;
}
```

The problem: fly far enough and you'd leave the cube, and space would go black. The
fix is a lovely trick done entirely on the GPU, in `star.vert`: **wrap each star
into the box centred on the camera.** The `span` arrives as a push constant
(chapter 08):

```glsl
// star.vert
layout(push_constant) uniform StarParams { float span; } params;

vec3 rel = inPosition - frame.cameraPosition.xyz;              // star relative to camera
rel = rel - round(rel / params.span) * params.span;           // fold into [-span/2, span/2]
vec3 world = frame.cameraPosition.xyz + rel;
gl_Position = frame.viewProjection * vec4(world, 1.0);
gl_PointSize = 2.0;
```

`round(rel / span) * span` snaps to the nearest whole cube, and subtracting it
tiles the same few thousand points infinitely around you — you can fly forever and
the sky is always full, at zero CPU cost. The fragment shader then rounds each
square point into a soft dot using `gl_PointCoord`:

```glsl
// star.frag
float d = distance(gl_PointCoord, vec2(0.5));
if (d > 0.5) discard;
```

Brightness rides along in `normal.x` (we had a spare channel — points don't need a
lighting normal), giving the field some variety instead of a wall of identical
dots.

> **One Vulkan requirement:** with point-list topology the vertex shader **must**
> write `gl_PointSize` — Vulkan has no default, and leaving it unwritten is
> undefined. And any size other than `1.0` (ours is `2.0`) additionally needs the
> device-level **`largePoints`** feature, which we enabled in `pEnabledFeatures`
> back in chapter 03. If validation complains about point size, or your stars
> render as single pixels, that feature is the thing to check.

### Why this matters

That wrap is a tiny lesson in GPU thinking: instead of updating thousands of
positions on the CPU each frame, we express the *rule* once in the shader and let
the hardware apply it per vertex, per frame, for free. Whenever you catch yourself
about to loop over lots of things on the CPU to feed the GPU, ask whether the rule
can move into the shader instead.

---

## The ground grid — a horizon from lines

A flat lattice of line segments on the XZ plane gives orientation the way Star
Fox's ground does — you instantly read pitch and roll against it.

```cpp
// content/meshes/SceneryMesh.cpp
MeshData grid(float halfExtent, float spacing) {
    MeshData m;                                            // lines, no indices
    for (float i = -halfExtent; i <= halfExtent; i += spacing) {
        m.vertices.push_back({{i, 0, -halfExtent}, {}});   // one line along Z
        m.vertices.push_back({{i, 0,  halfExtent}, {}});
        m.vertices.push_back({{-halfExtent, 0, i}, {}});   // one line along X
        m.vertices.push_back({{ halfExtent, 0, i}, {}});
    }
    return m;
}
```

It's a *finite* patch, but the renderer slides it under the action and **snaps it
to the grid spacing** so the lines never appear to crawl. This one we do on the CPU
(there's only one grid) by writing its model matrix each frame:

```cpp
void Renderer::drawGrid(VkCommandBuffer cmd, glm::vec3 focus) {
    const float gx = std::round(focus.x / spacing) * spacing;
    const float gz = std::round(focus.z / spacing) * spacing;
    const glm::mat4 model = glm::translate(glm::mat4(1.0f), glm::vec3(gx, groundY, gz));
    …
}
```

Snapping to a whole cell means the pattern shifts by exactly one cell as you move —
invisible — so a modest patch reads as an endless floor. Same idea as the star
wrap, done on the CPU because there's only one grid.

> **Why the parameter is `focus`.** What the caller passes is the player's
> position, every single frame, and `playerPosition` is what you'd naturally type.
> Chapter 02's boundary test rejects it — `Player` is a gameplay name — and the
> rejection is doing real work here rather than being pedantic. `drawGrid` does not
> want a player. It wants *the point the scenery should arrange itself around*, and
> naming it that keeps the function honest the day you add a spectator camera, a
> replay, or a kill-cam that focuses on the enemy that got you. A name that
> describes the caller's situation instead of the callee's job is how a clean seam
> quietly acquires a dependency.

---

## Making your own shape

The recipe, start to finish:

1. Add a value to the `MeshID` enum in `content/MeshID.hpp` (e.g.
   `MeshID::Asteroid`) **and classify it in `materialOf`** — the `switch` there is
   exhaustive, so if you forget, the compiler tells you which line to fix
   (chapter 07).
2. Write a generator in `content/meshes/AsteroidMesh.cpp` returning `flat({...})`
   for a solid, or raw points/lines for a point/line mesh.
3. Register it in `MeshRegistry::init`:
   `meshes[MeshID::Asteroid] = upload(asteroidMesh());`.
4. Give some entity `Renderable{MeshID::Asteroid, color}` — from an archetype, if
   it's a new kind of thing (chapter 13).
5. Add the new `.cpp` to `CMakeLists.txt`.

Note what isn't on that list: `render/Renderer.cpp`. The passes iterate mesh groups
and ask `materialOf` which of them to draw, so new art reaches the screen without
the renderer learning it exists. That's the payoff of the whole layout — content
grows, the engine doesn't.

That's the whole art pipeline for now. Chapter 15 covers graduating to real models
(glTF via a loader) when "simple geometry" stops being enough — the ECS and draw
loop don't care where vertices come from.

---

**Next:** the clock that drives all of this — the game loop and timing. →
[Chapter 10: The game loop & timing](10-the-game-loop.md)
