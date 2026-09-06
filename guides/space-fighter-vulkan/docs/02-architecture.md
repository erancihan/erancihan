# 02 · Architecture 🧠🛠️

> **You'll leave this chapter with:** the reasoning behind every directory in
> chapter 01's tree, a working vocabulary borrowed from Unreal, and one test that
> keeps the layers from leaking into each other for the rest of the guide. It's
> the same argument the [Metal guide](../../space-fighter-metal/docs/02-architecture.md)
> makes, but the enforcement is C++'s, which turns out to be both stronger and
> leakier than Swift's in ways worth knowing.

Chapter 01 gave you a tree and asked you to trust it. This chapter earns it.

Three questions are worth answering before you write a line of Vulkan: where does
a ship's geometry live, who owns it, and what stops the renderer from reaching
into the game? Every engine answers those three, and the answers are more alike
than the marketing suggests. Borrowing the vocabulary costs nothing and buys you
a map you can carry to Unreal, Unity or Godot afterwards.

---

## Two families of engine

**Actor–component.** Unreal's `AActor` and Unity's `GameObject` are containers.
An actor holds a transform and a list of components, and behaviour hangs off
both: `AActor::Tick()` runs every frame, and components like
`UCharacterMovementComponent` bring their own. Inheritance is real and used —
`ACharacter` inherits from `APawn` inherits from `AActor`. It is comfortable, it
is what most tutorials teach, and it is genuinely good at *a few hundred
elaborate things*.

**ECS.** An entity is an id. Components are plain structs with no methods.
Systems are functions that sweep every entity holding a given set of components.
Nothing inherits from anything. It is worse at "one elaborate hero object" and
much better at *thousands of simple things*.

This project fires a bolt every 0.14 seconds and spawns enemies in waves. Ten
seconds in, most of what exists is a small struct that moves in a straight line
and expires. That's the workload ECS is for, so that's what we build.

It's worth knowing that Unreal agrees. Per-actor `Tick()` stops scaling somewhere
in the low thousands, so Epic shipped a second framework — **Mass Entity** —
alongside the actor system, for crowds and projectiles. Its `FMassFragment` is a
component, its `UMassProcessor` is a system, and its folders are flat:
`Fragments/`, `Processors/`. No per-actor directories. When Unreal needs what we
need, it builds what we're building.

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
actor, and the reasons are the reasons for our tree:

**Cardinality.** Twenty enemies share one octahedron. Per entity you store a
matrix and a colour — the 80 bytes of `InstanceData` from chapter 08 — not a copy
of the geometry.

**Lifetime.** Meshes are uploaded to device-local memory once, at startup,
through a staging buffer (chapter 08). Entities spawn and die inside a frame. If
an entity owned its mesh, spawning a bolt would mean a `vmaCreateBuffer` and a
queue submit in the hot path.

**Ownership.** The vertices are the renderer's business. Gameplay should be able
to say "draw the ship one" without holding anything a `Vk` prefix can touch.

Our version of that chain, which you'll build over chapters 08 to 13:

| Unreal | This project | Lives in |
|---|---|---|
| `AActor` | `Entity` + the stores in `World` | `ecs/` |
| `UActorComponent` | a component struct | `components/` |
| `USceneComponent`'s transform | `Transform` | `components/Spatial.hpp` |
| `UStaticMeshComponent` | `Renderable` | `components/Rendering.hpp` |
| `UStaticMesh*` | `MeshID` | `content/MeshID.hpp` |
| the `.uasset` payload | `MeshData` | `render/types/Mesh.hpp` |
| `FStaticMeshSceneProxy` | `InstanceData` | `render/types/GPUContract.hpp` |
| the render-thread buffers | `GPUMesh` (a `VkBuffer` pair) | `render/MeshRegistry.hpp` |
| `BP_PlayerShip` | `spawnPlayer` | `archetypes/Player.cpp` |
| `UMovementComponent`'s tick | `MovementSystem` | `systems/` |
| the `.Build.cs` dependency rules | `BoundaryTest.cpp` | `tests/` |

`struct Renderable { MeshID mesh; glm::vec4 color; };` **is**
`UStaticMeshComponent`, minus the refcounting. When you write that struct in
chapter 10 it will look too small to matter. It's the same seam a commercial
engine draws, in two lines.

---

## Source and content are different trees

Look at how an Unreal project is laid out on disk:

```
MyGame/Source/MyGame/Ships/PlayerShip.h  .cpp     ← code: behaviour
MyGame/Content/Meshes/SM_PlayerShip.uasset        ← art: geometry
```

Unreal **does** put code in per-feature folders — `Ships/`, `Weapons/`,
`Enemies/`. That instinct is sound and we borrow it for `archetypes/`. What
Unreal never does is put `SM_PlayerShip` inside `Source/MyGame/Ships/`. Art lives
in its own tree, addressed by asset path, and code refers to it by reference.

`content/` is that tree. It happens to be written in C++ and GLSL, because this
project generates its geometry in code instead of loading `.obj` files — but it
is content, not engine and not gameplay. `content/meshes/ShipMesh.cpp` occupies
exactly the slot `Content/Meshes/SM_Ship.uasset` occupies in an Unreal project,
and chapter 15 shows how to swap one for the other without touching anything
else.

`content/shaders/` is in that tree for the same reason, and it's the placement
people question first, since shaders feel like renderer code. They aren't: a
`.frag` is authored art direction compiled by an external tool into an artefact
the renderer loads by path, which is precisely what a `.uasset` is. The renderer
doesn't know what `lit.frag` says — it knows there is a file called
`shaders/lit.frag.spv` and that it pairs with a vertex stage. Swap the lighting
model inside it and not one line of C++ changes. That's a content edit.

This is also why there's no `ships/ShipMesh.cpp` sitting next to a
`ships/Ship.cpp`. A file like that reads as "the ship owns its geometry," and it
doesn't — the mesh outlives every ship, is shared by all of them, and belongs to
the renderer once uploaded. Grouping by actor would make the tree tell a lie.

One consequence looks like a layering violation and isn't:
`components/Rendering.hpp` includes `content/MeshID.hpp`. Gameplay depends on
content. That's correct, and it's what Unreal does too — a component holding a
`UStaticMesh*` is a gameplay object holding a content reference. What must not
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
list, default values and asset references. That's a **prefab**, and it's a
first-class file.

Our equivalent is a function that assembles an entity:

```cpp
// archetypes/Player.cpp — you'll write this in chapter 10
Entity spawnPlayer(World& world) {
    Entity e = world.create();
    world.add(e, Transform{});
    world.add(e, Velocity{});
    world.add(e, Player{});
    world.add(e, Weapon{});
    world.add(e, Renderable{MeshID::Ship, glm::vec4(0.82f, 0.9f, 1.0f, 1.0f)});
    world.add(e, Collider{1.3f, Layer::Player, Layer::Enemy});
    return e;
}
```

Component list, defaults, asset reference. It's a Blueprint written in C++.

The reason it gets its own file rather than living in `Game.cpp` is that
`Game.cpp` has a different job — it owns the world and the order the systems run
in, and that order *is* the game's logic (chapter 10). By chapter 13 there are
three archetypes and eight systems. Mixing "what a bolt is made of" into "what
happens each frame" makes both harder to read, and only one of them changes when
you add an enemy type.

`archetypes/` is the one folder in this project organised by actor, and it's
organised by actor because a recipe genuinely belongs to one.

---

## One build target, not ten

Unreal's real power here isn't the folder names. It's `.Build.cs`: modules
declare their dependencies, and the build system refuses to compile code that
reaches outside them. Folders suggest; modules enforce.

CMake has that tool, and it's worth being precise about it, because the usual
claim — "C++ can't express module boundaries" — is false. Split the tree into
libraries and the Unreal-shaped version of this project is completely buildable:

```cmake
add_library(Core       INTERFACE)                                  # core/, header-only
add_library(ECS        INTERFACE)                                  # ecs/, templates
add_library(RenderCore INTERFACE)                                  # render/types/
add_library(VulkanRHI  STATIC ...)  target_link_libraries(VulkanRHI  PUBLIC RenderCore Vulkan::Vulkan)
add_library(Renderer   STATIC ...)  target_link_libraries(Renderer   PRIVATE VulkanRHI)
add_library(Content    STATIC ...)  target_link_libraries(Content    PUBLIC RenderCore)
add_library(Game       STATIC ...)  target_link_libraries(Game       PUBLIC ECS Core RenderCore Content)
add_executable(SpaceFighter src/main.cpp)
target_link_libraries(SpaceFighter PRIVATE Game Renderer)
```

`Renderer` links `VulkanRHI` *privately* and never links `ECS`, so
`#include "ecs/World.hpp"` inside `render/Renderer.cpp` is a hard compile error —
the header simply isn't on that target's include path. That is real enforcement,
identical in kind to a Swift module boundary, and if you want it, it's fifteen
lines of CMake.

We're not going to use it, for three reasons.

**Every shared type becomes a plumbing decision.** `InstanceData` is produced by
`systems/RenderSystem.cpp` and consumed by `render/Renderer.cpp`, so it needs an
`INTERFACE` target that both link. So does `MeshID`. So does `HUDVertex`. Each
one is a small, correct, tedious decision, and there is one of them every time
the guide introduces a struct two layers share. That's a tax paid per chapter, in
a guide whose subject is Vulkan.

**The enforcement has a hole you'd have to close anyway.**
`target_include_directories(PRIVATE)` governs how the compiler resolves
`#include "ecs/World.hpp"` — a *path-based* include. It has nothing to say about
`#include "../../ecs/World.hpp"`, which resolves relative to the including file
and ignores the target's include paths entirely. So even the ten-library version
needs a rule that says "no relative includes across layers," and that rule is not
something the build system checks. Once you're writing that rule down, you may as
well check it directly — which is what the rest of this chapter does.

**C++17 has no language-level module boundary.** `private:` is per-class.
Namespaces restrict *nothing* — `namespace render` doesn't stop `Game.cpp` from
writing `render::internalThing()`. `static` and anonymous namespaces give
internal linkage per translation unit, which is narrower than a layer, not wider.
C++20 `import` is the real answer and the toolchain support has arrived, but this
guide targets C++17 to keep the compiler floor low, so it isn't on the table.

Unreal pays the module tax because it has thousands of contributors and a plugin
ABI to keep stable. This project has one contributor and one binary. **One
target.**

Two triggers would change that answer, and neither is here yet: wanting to reuse
the engine in a second project, or build times that hurt. Fifteen chapters of
files is not close to either.

---

## Keeping the seam without the build system

Dropping to one target drops the enforcement, and enforcement was the point. Two
things get it back, cheaply.

**The first is the shape of the interface.** The renderer's entry point, which
you'll write across chapters 06 to 09, takes nothing but plain data:

```cpp
void Renderer::drawFrame(const FrameUniforms& frame,
                         const std::unordered_map<MeshID, std::vector<InstanceData>>& instances,
                         glm::vec3 focus,
                         const std::vector<HUDVertex>& hud);
```

A camera matrix, a map of meshes to copies, a point the scenery arranges itself
around, and a list of 2D vertices. No entities, no components, no `World`. This
is the same trick Unreal plays with `FPrimitiveSceneProxy`: the game extracts a
flat description of what to draw, and the renderer never sees the objects it came
from.

Note the third parameter is `focus`, not `playerPosition`, even though the
player's position is exactly what the caller passes. The renderer has no player.
It uses that point to snap the ground grid to a whole cell and to centre the
starfield's wrap (chapter 09) — both of which would work identically for a
spectator camera or a cutscene. Naming a parameter after what the callee does
with it, rather than where the caller got it, is a surprisingly large part of
keeping a seam a seam.

With an interface shaped like that, leaking gameplay into the renderer requires
*adding a parameter*, which shows up in a diff.

**The second is a test.** And here C++ hands us something Swift didn't: in C++
the dependency edge is a line of text at the top of the file. `#include` is the
whole story — if `render/Renderer.cpp` doesn't include a gameplay header, it
cannot see a gameplay type. So instead of grepping whole files for names and
hoping, we can read the include lines and check the actual graph.

**`tests/BoundaryTest.cpp`.** Start with the file walking, using `<filesystem>`
so there's no dependency to add:

```cpp
#include <filesystem>
#include <fstream>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>

namespace fs = std::filesystem;

static int failures = 0;

static void expect(bool ok, const std::string& message) {
    if (!ok) { std::cerr << "  FAIL  " << message << '\n'; ++failures; }
}

static std::vector<fs::path> sourcesUnder(const std::string& relative) {
    std::vector<fs::path> out;
    const fs::path root = fs::path(SOURCE_ROOT) / relative;
    if (!fs::exists(root)) return out;                 // empty early in the guide
    for (const auto& entry : fs::recursive_directory_iterator(root)) {
        const auto ext = entry.path().extension();
        if (ext == ".hpp" || ext == ".cpp") out.push_back(entry.path());
    }
    return out;
}

static std::string readFile(const fs::path& file) {
    std::ifstream in(file);
    return std::string(std::istreambuf_iterator<char>(in),
                       std::istreambuf_iterator<char>());
}

static std::vector<std::string> includeLines(const std::string& source) {
    std::vector<std::string> out;
    std::istringstream in(source);
    for (std::string line; std::getline(in, line); )
        if (line.rfind("#include", 0) == 0) out.push_back(line);
    return out;
}
```

`SOURCE_ROOT` is a string the build hands us, so the test finds the tree no
matter where it's run from — the CMake edit is below. `fs::exists` matters more
than it looks: these directories are empty until the chapters fill them, and a
`recursive_directory_iterator` over a missing path throws.

> **Why `readFile` returns rather than declares.** The idiomatic
> two-iterator string construction is a live minefield in C++. Written as a
> statement, `std::string s(std::istreambuf_iterator<char>(in),
> std::istreambuf_iterator<char>());` is the **most vexing parse** — the compiler
> reads it as a *function declaration* and the errors are baffling. Written with
> braces, `std::string s{std::istreambuf_iterator<char>(in), {}};` doesn't compile
> either, because `InputIt` can't be deduced from `{}`. Inside a `return`, it's
> unambiguously an expression and both problems evaporate. Hence the helper.

Now the rule in one direction — the renderer may know about geometry and ids, but
not about the game:

```cpp
static const char* kGameplayIncludes[] = {
    "ecs/", "components/", "systems/", "archetypes/", "Game.hpp",
};

// Reached without an include: a forward declaration, a template parameter, a
// type named in a comment that's about to become a real dependency.
static const char* kGameplayNames[] = {
    "World", "Entity", "ComponentStore",
    "Transform", "Velocity", "Renderable", "Collider",
    "Player", "Enemy", "Weapon", "Projectile",
};

static void renderLayerKnowsNothingAboutTheGame() {
    for (const fs::path& file : sourcesUnder("src/render")) {
        const std::string name   = file.filename().string();
        const std::string source = readFile(file);

        for (const std::string& line : includeLines(source))
            for (const char* banned : kGameplayIncludes)
                expect(line.find(banned) == std::string::npos,
                       name + " includes " + banned + " — gameplay leaked into render/");

        for (const char* banned : kGameplayNames)
            expect(source.find(banned) == std::string::npos,
                   name + " mentions " + banned + " — gameplay leaked into render/");
    }
}
```

Note the name list is capitalised type names, so the prose in a comment —
"collect the visible entities" — passes, while `Entity` doesn't. That's
deliberate: the renderer is allowed to *talk about* the game, just not to name
its types.

And the other direction — gameplay and content describe what to draw, but never
speak Vulkan:

```cpp
static void gameplayNeverTouchesVulkan() {
    const char* directories[] = {
        "src/components", "src/systems", "src/archetypes", "src/content",
    };
    for (const char* directory : directories) {
        for (const fs::path& file : sourcesUnder(directory)) {
            const std::string name   = file.filename().string();
            const std::string source = readFile(file);

            for (const std::string& line : includeLines(source)) {
                expect(line.find("vulkan") == std::string::npos &&
                       line.find("vk_mem_alloc") == std::string::npos,
                       name + " includes a Vulkan header — that belongs in render/rhi/");
                expect(line.find("render/rhi/") == std::string::npos,
                       name + " includes render/rhi/ — gameplay gets render/types/, not the RHI");
            }
            expect(source.find("Vk") == std::string::npos &&
                   source.find("vma") == std::string::npos,
                   name + " names a Vulkan type — that belongs in render/rhi/");
        }
    }
}
```

Three things to notice. The directory list ends at `src/content` rather than
`src/content/meshes`, so `content/MeshID.hpp` is covered too — unlike the Metal
guide, which had to carve out an exemption because compiling MSL at launch needs
an `MTLDevice`. Ours compiles GLSL with `glslc` at build time (chapter 01), so
*nothing* under `content/` ever needs the graphics API, and the rule has no hole
in it. `sourcesUnder` only collects `.hpp` and `.cpp`, so the `.vert` and `.frag`
files sitting in `content/shaders/` are simply skipped.

The `render/rhi/` check is the sharper half: gameplay is *allowed* to include
`render/types/`, because `InstanceData` and `HUDVertex` are the flat structs it
produces. Banning only the Vulkan headers would let a system
include `render/rhi/Buffers.hpp` and start filling a `Buffer` directly, which is
the leak that actually tempts you at two in the morning. And `"Vk"` as a bare
substring is a blunt instrument that works precisely because Vulkan's naming is
so consistent — every type is `VkSomething`, every enum `VK_SOMETHING`.

One more, cheap and load-bearing:

```cpp
static void gpuContractStaysPlainData() {
    for (const fs::path& file : sourcesUnder("src/render/types")) {
        for (const std::string& line : includeLines(readFile(file)))
            expect(line.find("vulkan") == std::string::npos &&
                   line.find("vk_mem_alloc") == std::string::npos,
                   file.filename().string() + " includes Vulkan — render/types/ must stay plain data");
    }
}

int main() {
    renderLayerKnowsNothingAboutTheGame();
    gameplayNeverTouchesVulkan();
    gpuContractStaysPlainData();
    if (failures == 0) std::cout << "boundary: 3 checks passed\n";
    return failures == 0 ? 0 : 1;
}
```

That third one holds up the other two. `render/types/` is the one directory both
sides include — gameplay builds `InstanceData`, the renderer memcpys it into an
SSBO. The moment a `#include <vulkan/vulkan.h>` appears in `GPUContract.hpp`, the
whole gameplay layer is transitively including Vulkan and
`gameplayNeverTouchesVulkan` starts passing for the wrong reason. Guard the
shared header and the rest of the rule means something.

**`CMakeLists.txt`** — the one growth chapter 01 promised. Add at the bottom:

```cmake
enable_testing()
add_executable(BoundaryTest tests/BoundaryTest.cpp)
target_compile_definitions(BoundaryTest PRIVATE SOURCE_ROOT="${CMAKE_SOURCE_DIR}")
add_test(NAME boundary COMMAND BoundaryTest)
```

`target_compile_definitions` is how `SOURCE_ROOT` becomes a string literal in the
test's translation unit — the C++ equivalent of Swift's `#filePath`, and the
reason the test can be run from `build/`, from CI, or from anywhere else.

---

## Running it

```console
$ cmake -S . -B build
$ cmake --build build
$ ctest --test-dir build --output-on-failure
Test project /.../SpaceFighter/build
    Start 1: boundary
1/1 Test #1: boundary .........................   Passed    0.00 sec

100% tests passed, 0 tests failed out of 1
```

Worth proving to yourself that it isn't vacuous. Drop a file into `src/render/`
containing the word `World`, run `ctest` again, and read what comes back:

```console
  FAIL  Leak.cpp mentions World — gameplay leaked into render/
1/1 Test #1: boundary .........................***Failed    0.00 sec
```

Then delete it.

All three pass trivially right now — those directories are empty. That's fine and
it's the point: the rule is in place *before* there's anything to break it, so the
first violation fails the run it appears in rather than being discovered three
chapters later.

This is cruder than a dependency graph. It reads source as text, it can be fooled
by a string literal, and it knows nothing about scope. It also catches the mistake
you will actually make, in the millisecond it takes to run, which is the entire
requirement. Two chapters change a name because of it — chapter 07 stops naming
its pipelines after ships and bolts, and chapter 09's grid takes a `focus` instead
of a player position — and both changes turn out to be improvements, which is a
good sign about the rule.

> **If `<filesystem>` won't link.** On GCC 8 and Clang 8 the C++17 filesystem
> library lives in a separate archive; add
> `target_link_libraries(BoundaryTest PRIVATE stdc++fs)`. Anything newer has it
> in the standard library proper and needs nothing.

---

## The one-screen summary

- **Actor–component** engines are good at a few hundred elaborate objects; **ECS**
  is good at thousands of simple ones. Our workload is bolts and enemies, so: ECS.
- No engine puts vertices on the actor. `Renderable { MeshID }` is
  `UStaticMeshComponent`; `MeshID` is the `UStaticMesh*`; the buffers live in the
  renderer's `MeshRegistry`.
- **`content/` is a sibling of the code**, not a subfolder of it — geometry and
  shaders are assets addressed by reference, the way `Content/` is in Unreal.
- **`archetypes/` are Blueprints**: a component list, defaults, and an asset
  reference, in a function.
- CMake *can* enforce layering with per-target include paths, and we deliberately
  don't — the plumbing cost is per-chapter, and relative includes punch through it
  regardless. **One target, one binary.**
- The seam is held by the **shape of the renderer's interface** (plain data,
  `focus` not `playerPosition`) and by **`tests/BoundaryTest.cpp`**, which reads
  `#include` lines because in C++ that's where the dependency graph literally is.

### Challenge

The `kGameplayNames` list is hand-written, which means it rots — add a component
in chapter 13 and nobody updates the array. Replace it with something that needs
no list: parse the `struct` and `class` declarations out of `src/components/` at
test time and ban *those* names in `src/render/`. Thirty lines, and the rule
maintains itself.

---

**Next:** the object model — instance, device, queues — and *why* Vulkan makes you
name every one. → [Chapter 03: Vulkan fundamentals](03-vulkan-fundamentals.md)
