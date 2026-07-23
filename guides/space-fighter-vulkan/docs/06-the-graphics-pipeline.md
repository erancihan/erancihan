# 06 · The graphics pipeline & SPIR-V 🛠️

> **You'll leave this chapter with:** the ability to read and modify our shaders,
> an understanding of **SPIR-V** and how GLSL becomes it, a full accounting of
> *every fixed-function state* a `VkPipeline` freezes (this is where Vulkan is far
> more explicit than Metal), and a grip on **instancing** via `gl_InstanceIndex`.

---

## The seam, restated

`RenderSystem` (chapter 04's last system) hands the renderer a map: *for each
mesh, the list of instances to draw.*

```cpp
std::unordered_map<MeshID, std::vector<InstanceData>> byMesh;
// e.g. MeshID::Enemy → [ {model, color}, {model, color}, … ]
```

That's the entire interface. The renderer knows nothing about entities; gameplay
knows nothing about Vulkan. Everything below is how the right side of that seam
turns those arrays into pixels — starting with the pipeline that all drawing runs
through.

---

## SPIR-V: shaders as bytecode, not text

Metal compiled MSL from a string at launch. Vulkan does **not** consume GLSL text
at all — it consumes **SPIR-V**, a portable binary intermediate representation.
The upside is that shader compilation is decoupled from the driver (no more
vendor-specific GLSL quirks), errors surface at *build* time, and the driver's job
shrinks to translating well-formed bytecode. The cost is a build step, which
chapter 01's CMake already set up: `glslc lit.vert -o lit.vert.spv`.

At runtime we load the `.spv` bytes and wrap them in a `VkShaderModule` — a thin
handle the pipeline references:

```cpp
VkShaderModule loadShader(VkDevice device, const std::string& path) {
    std::vector<char> code = readFile(path);            // raw .spv bytes
    VkShaderModuleCreateInfo ci{VK_STRUCTURE_TYPE_SHADER_MODULE_CREATE_INFO};
    ci.codeSize = code.size();
    ci.pCode    = reinterpret_cast<const uint32_t*>(code.data());
    VkShaderModule module;
    vkCreateShaderModule(device, &ci, nullptr, &module);
    return module;
}
```

> **Compiling at runtime instead.** You *can* skip the build step and compile GLSL
> in-process with the **shaderc** library (`shaderc_compile_into_spv`), which puts
> the shader source next to the CPU structs it must match — closer to Metal's
> launch-time model. We compile ahead of time because it keeps the runtime lean
> and gives build-time errors, but the shaderc path is a drop-in swap if you
> prefer it.

---

## The pipeline: one immutable object, *every* decision frozen

A `VkPipeline` is the Metal `MTLRenderPipelineState`'s bigger, stricter cousin. It
bundles the two programmable stages (vertex + fragment shaders) **and every
fixed-function decision** the GPU makes around them — and unlike Metal, where a
few of these lived on the encoder or came with sensible defaults, Vulkan makes you
**name all of them, up front, in one struct.** That's a lot of ceremony for a
triangle, but it means the driver validates and compiles the whole configuration
once and does zero per-draw state checking.

Here's the full cast of state, and what each does:

| State struct | What it decides | Ours |
|---|---|---|
| `VertexInputState` | The layout of vertex buffers: bindings + attributes. | position + normal, one binding |
| `InputAssemblyState` | How vertices group into primitives (topology). | triangle / line / point per pipeline |
| `ViewportState` | The viewport + scissor rectangles. | **dynamic** (set each frame) |
| `RasterizationState` | Fill mode, cull mode, winding, line width, depth bias. | fill, **cull none**, CCW |
| `MultisampleState` | MSAA sample count. | 1 sample (off) |
| `DepthStencilState` | Depth test/write, compare op, stencil. | per pipeline (see below) |
| `ColorBlendState` | How fragments combine with the target. | opaque / additive / alpha |
| `DynamicState` | Which states are set at record time, not baked. | viewport + scissor |
| `PipelineLayout` | Descriptor set layouts + push-constant ranges. | shared (chapter 07) |

### Vertex input: the layout contract

The GPU needs to know how to pull `position` and `normal` out of a vertex buffer.
We describe one **binding** (the buffer, its stride) and two **attributes** (each
field's location, format and offset) — the Vulkan equivalent of an
`MTLVertexDescriptor`:

```cpp
VkVertexInputBindingDescription binding{};
binding.binding   = 0;
binding.stride    = sizeof(Vertex);                     // 24 bytes: vec3 + vec3
binding.inputRate = VK_VERTEX_INPUT_RATE_VERTEX;

VkVertexInputAttributeDescription attrs[2]{};
attrs[0] = {0, 0, VK_FORMAT_R32G32B32_SFLOAT, offsetof(Vertex, position)};  // location 0
attrs[1] = {1, 0, VK_FORMAT_R32G32B32_SFLOAT, offsetof(Vertex, normal)};    // location 1
```

`location` here matches `layout(location = N) in` in the vertex shader — a contract
both sides must honour, exactly like Metal's buffer-index numbering. Note we feed
*vertices* through the vertex-input machinery but *instances* through a storage
buffer the shader indexes itself (below) — a deliberate split we'll justify in a
moment.

### Depth and blend: the real per-pipeline choices

Two of these states carry actual rendering decisions, not boilerplate — and they
map one-to-one onto the Metal guide's depth-stencil states and blend modes:

```cpp
// SOLIDS (ship, enemies, grid): test against depth AND write it.
depth.depthTestEnable  = VK_TRUE;  depth.depthWriteEnable = VK_TRUE;
depth.depthCompareOp   = VK_COMPARE_OP_LESS;

// GLOWS (bolts, stars): test so solids occlude them, but DON'T write depth.
depth.depthTestEnable  = VK_TRUE;  depth.depthWriteEnable = VK_FALSE;

// HUD: ignore depth entirely, always draw on top.
depth.depthTestEnable  = VK_FALSE; depth.depthWriteEnable = VK_FALSE;
```

```cpp
// OPAQUE — replace.                     blendEnable = FALSE
// ADDITIVE — src + dst (glow).          srcColor = ONE, dstColor = ONE
// ALPHA — src·α + dst·(1−α) (HUD).      srcColor = SRC_ALPHA, dstColor = ONE_MINUS_SRC_ALPHA
```

Getting depth right is why the ship correctly hides the grid behind it while a
glowing bolt in front still lets you see the ship through its halo — and getting
blend right is why bolts and stars *add* light instead of overwriting. In Metal
these were `MTLDepthStencilState` objects and a `BlendMode` enum; in Vulkan they're
fields on the pipeline. Same decisions, frozen a little earlier.

### Four shader pairs, five pipelines

Here's a Vulkan wrinkle the Metal guide never hit. In Metal, one `unlit` pipeline
drew *both* the line grid and the triangle bolts — because primitive type and depth
state were set per-draw on the *encoder*, not baked into the pipeline. Vulkan bakes
topology, depth mode **and** blend mode into the pipeline object, so two things that
differ in *any* of those need **two pipelines**, even when they share a shader.

Our grid (lines, depth-write) and bolts (triangles, depth-test-only) share the
`unlit` shaders but differ in topology and depth — so they're two pipelines. That
gives us **four shader pairs but five pipelines**. A helper takes the knobs so each
call is one line:

```cpp
VkPipeline makePipeline(const char* vert, const char* frag,
                        VkPrimitiveTopology topology,
                        DepthMode depthMode, BlendMode blendMode);

lit      = makePipeline("lit.vert.spv",   "lit.frag.spv",   TRIANGLE, TestWrite, Opaque);
gridLine = makePipeline("unlit.vert.spv", "unlit.frag.spv", LINE,     TestWrite, Additive);
bolt     = makePipeline("unlit.vert.spv", "unlit.frag.spv", TRIANGLE, TestOnly,  Additive);
star     = makePipeline("star.vert.spv",  "star.frag.spv",  POINT,    TestOnly,  Additive);
hud      = makePipeline("hud.vert.spv",   "hud.frag.spv",   TRIANGLE, NoDepth,   Alpha);
```

Each is created once at startup with `vkCreateGraphicsPipelines` and switched
mid-frame with `vkCmdBindPipeline` — the direct analogue of
`encoder.setRenderPipelineState`, just with more state welded in.

> **This is the "pipeline explosion" in miniature.** Bake enough state into
> pipelines and a real engine ends up with hundreds of near-identical ones. Vulkan's
> answers are a **pipeline cache** (so recompiling a variant is nearly free) and
> **extended dynamic state** (move topology/depth/blend to record time, so one
> pipeline covers many combinations). We keep five explicit pipelines because they're
> readable; chapter 14 points at both escape hatches.

> **Dynamic state earns its keep here, too.** Because viewport and scissor are
> already dynamic, a window resize (chapter 05) doesn't invalidate a single
> pipeline — we just call `vkCmdSetViewport`/`vkCmdSetScissor` with the new extent
> each frame. Bake them in instead and every resize would mean rebuilding all five.

---

## The shaders, read in full

All four pairs live in `shaders/`. Let's read the lit pair — the ship and enemies
— because it shows every idea.

### `lit.vert`

```glsl
#version 450

layout(location = 0) in vec3 inPosition;      // matches the vertex-input attributes
layout(location = 1) in vec3 inNormal;

struct InstanceData { mat4 model; vec4 color; };

layout(set = 0, binding = 0) uniform FrameUniforms {
    mat4 viewProjection;
    vec4 cameraPosition;
    vec4 lightDirection;
} frame;

layout(set = 0, binding = 1) readonly buffer Instances {   // one entry per instance
    InstanceData instances[];
};

layout(location = 0) out vec3 vNormal;
layout(location = 1) out vec4 vColor;

void main() {
    InstanceData inst = instances[gl_InstanceIndex];       // ← which copy we're drawing
    vec4 world  = inst.model * vec4(inPosition, 1.0);
    gl_Position = frame.viewProjection * world;
    vNormal     = mat3(inst.model) * inNormal;             // rotate normal into world space
    vColor      = inst.color;
}
```

- `gl_InstanceIndex` is Vulkan's built-in "which instance" — the key to instancing,
  next section, and the exact counterpart of Metal's `[[instance_id]]`.
- The `frame` UBO and `instances` storage buffer are bound via **descriptor sets**
  (chapter 07). `set = 0, binding = N` is the contract the descriptor set layout
  must match.
- `mat3(inst.model) * inNormal` rotates the normal by the model's rotation (dropping
  translation) so lighting is computed in world space. (We use uniform scale, so we
  can skip the inverse-transpose a non-uniform scale would demand.)

### `lit.frag`

The fragment side is the single dot product from chapter 03:

```glsl
#version 450
layout(location = 0) in vec3 vNormal;
layout(location = 1) in vec4 vColor;

layout(set = 0, binding = 0) uniform FrameUniforms {
    mat4 viewProjection; vec4 cameraPosition; vec4 lightDirection;
} frame;

layout(location = 0) out vec4 outColor;

void main() {
    vec3 N = normalize(vNormal);
    vec3 L = normalize(-frame.lightDirection.xyz);     // direction toward the light
    float diffuse = max(dot(N, L), 0.0);
    outColor = vec4(vColor.rgb * (0.25 + diffuse * 0.85), vColor.a);
}
```

`0.25` is ambient so shadowed faces aren't pure black; `0.85` is how hard the sun
hits. That's the entire lighting model, and it's plenty for faceted low-poly
shapes — byte-for-byte the same math as the Metal guide's `lit_fragment`, in GLSL.

The other three pairs are variations on this skeleton:

- **`unlit.*`** — same vertex transform, but the fragment just returns
  `inst.color`. Used for the grid and the glowing bolts (no lighting wanted).
- **`star.*`** — wraps points around the camera (chapter 08's tiling trick) and
  writes `gl_PointSize`; the fragment rounds each square point into a soft dot using
  `gl_PointCoord`.
- **`hud.*`** — takes 2D positions already in clip space, applies the Vulkan Y-flip
  for the overlay, and passes color straight through (chapter 13).

---

## Instancing: one mesh, many entities, one draw call

Twenty enemies share one octahedron mesh. Naively that's twenty draw calls, each
re-binding the same vertices. **Instancing** collapses them: bind the mesh once,
give the shader an *array* of per-entity data, and issue **one** call that draws
the mesh N times. The shader reads its slot via `gl_InstanceIndex`.

In Metal we bound the instance array as a plain buffer read by `[[instance_id]]`.
In Vulkan we have two idiomatic choices, and it's worth knowing why we picked one:

- **Per-instance vertex attributes** (`VK_VERTEX_INPUT_RATE_INSTANCE`) — the
  instance data flows through the same vertex-input machinery, advancing once per
  instance instead of per vertex. Fine, but a `mat4` costs four attribute slots and
  the layout gets fiddly.
- **A storage buffer indexed by `gl_InstanceIndex`** — bind the instance array as
  an SSBO and let the shader index it directly (as `lit.vert` does above). This
  reads exactly like the Metal "pull" model, scales to huge instance counts, and
  keeps the vertex layout to just position + normal. **We use this.**

The draw call itself is then tiny:

```cpp
vkCmdBindPipeline(cmd, VK_PIPELINE_BIND_POINT_GRAPHICS, lit);
vkCmdBindVertexBuffers(cmd, 0, 1, &mesh.vertexBuffer, &zeroOffset);   // shared geometry
vkCmdBindIndexBuffer(cmd, mesh.indexBuffer, 0, VK_INDEX_TYPE_UINT16);
vkCmdBindDescriptorSets(cmd, …, &frameSet, …);   // frame UBO + this mesh's instance SSBO
vkCmdDrawIndexed(cmd, mesh.indexCount, instanceCount, 0, 0, 0);       // ← one call, N copies
```

The GPU runs the vertex shader `indexCount × instanceCount` times, and for each run
`gl_InstanceIndex` tells the shader which model matrix and color to use. This is how
a bullet-hell game draws thousands of objects at 120 fps — and the reason our
`RenderSystem` *buckets by mesh* is to make exactly these grouped calls possible.
Chapter 07 shows where the instance SSBO comes from each frame.

---

## The one-screen summary

- Vulkan runs **SPIR-V bytecode**, compiled from GLSL by `glslc` at build time (or
  shaderc at runtime); each shader stage is a `VkShaderModule`.
- A `VkPipeline` freezes the two shaders **and every fixed-function state** —
  vertex input, topology, viewport, rasterization, depth, blend — in one immutable
  object. Vulkan makes you name all of it; the payoff is zero per-draw validation.
- We build **five pipelines from four shader pairs** (lit; grid-lines and bolts
  both from `unlit`; star; HUD) — Vulkan bakes topology/depth/blend into the
  pipeline, so states that differ need their own object.
- **Instancing** uses `gl_InstanceIndex` to read a per-entity **storage buffer**,
  collapsing many entities into one `vkCmdDrawIndexed` — the pull-model port of
  Metal's `[[instance_id]]`.

---

**Next:** where the buffers behind all this come from — memory, VMA, and the
descriptors that point the shader at them. →
[Chapter 07: Buffers, memory (VMA) & descriptors](07-buffers-memory-descriptors.md)
