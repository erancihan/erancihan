// Behavioural check of the non-Vulkan half of the canonical project.
#include "Game.hpp"
#include "Components.hpp"
#include "Mesh.hpp"
#include "HUD.hpp"
#include "ecs/World.hpp"
#include <cassert>
#include <cstdio>
#include <set>

static int failures = 0;
#define CHECK(c, msg) do { if(!(c)) { std::printf("  FAIL: %s\n", msg); failures++; } } while(0)

struct A { int v; };
struct B { float v; };

static void testSparseSet() {
    std::printf("sparse set\n");
    World w;
    Entity e0 = w.create(), e1 = w.create(), e2 = w.create();
    w.add(e0, A{10}); w.add(e1, A{11}); w.add(e2, A{12});
    CHECK(w.store<A>().size() == 3, "3 inserted");
    CHECK(w.get<A>(e1)->v == 11, "lookup e1");

    // swap-remove must keep the remaining entities findable and correct
    w.store<A>().removeIfPresent(e0);
    CHECK(w.store<A>().size() == 2, "2 after remove");
    CHECK(w.get<A>(e0) == nullptr, "e0 gone");
    CHECK(w.get<A>(e1) && w.get<A>(e1)->v == 11, "e1 survives remove");
    CHECK(w.get<A>(e2) && w.get<A>(e2)->v == 12, "e2 survives swap into slot 0");

    // dense array stays gapless
    std::set<int> seen;
    for (Entity e : w.store<A>().entities()) seen.insert(w.get<A>(e)->v);
    CHECK(seen == std::set<int>({11,12}), "dense walk yields exactly the survivors");

    // set() on an existing entity overwrites, does not duplicate
    w.add(e1, A{99});
    CHECK(w.store<A>().size() == 2 && w.get<A>(e1)->v == 99, "set overwrites in place");
}

static void testDeferredDestroy() {
    std::printf("deferred destroy\n");
    World w;
    Entity a = w.create(), b = w.create();
    w.add(a, A{1}); w.add(a, B{1.0f}); w.add(b, A{2});

    // destroying mid-iteration must not disturb the store being walked
    for (Entity e : w.store<A>().entities()) w.destroy(e);
    CHECK(w.store<A>().size() == 2, "nothing removed before flush");
    CHECK(w.isAlive(a) && w.isAlive(b), "still alive before flush");

    w.destroy(a);                       // queue the same id twice on purpose
    w.flushDestroyed();
    CHECK(w.store<A>().size() == 0, "A store emptied by flush");
    CHECK(w.store<B>().size() == 0, "B store emptied too (type erasure works)");
    CHECK(!w.isAlive(a) && !w.isAlive(b), "both dead");
    w.flushDestroyed();                 // double flush is a harmless no-op
    CHECK(true, "double flush survived");
}

static void testMeshes() {
    std::printf("meshes\n");
    MeshData ship = MeshLibrary::ship();
    CHECK(ship.vertices.size() == 12, "ship: 4 faces x 3 flat verts");
    CHECK(ship.indices.size() == 12, "ship: 12 indices");
    MeshData enemy = MeshLibrary::enemy();
    CHECK(enemy.vertices.size() == 24, "enemy: octahedron, 8 faces");
    MeshData bolt = MeshLibrary::bolt();
    CHECK(bolt.vertices.size() == 36, "bolt: cube, 12 tris");
    MeshData stars = MeshLibrary::starfield(kStarCount, kStarSpan);
    CHECK(stars.vertices.size() == size_t(kStarCount), "starfield count");
    CHECK(stars.indices.empty(), "starfield is non-indexed");
    MeshData grid = MeshLibrary::grid(kGridHalfExtent, kGridSpacing);
    CHECK(grid.indices.empty(), "grid is non-indexed");
    CHECK(grid.vertices.size() % 2 == 0, "grid is whole line segments");
    {   // every grid segment must be axis-aligned and exactly one cell long,
        // so no single line ever spans from in front of the camera to behind it
        int bad = 0;
        for (size_t i = 0; i + 1 < grid.vertices.size(); i += 2) {
            glm::vec3 a = grid.vertices[i].position, b = grid.vertices[i+1].position;
            float len = glm::length(b - a);
            bool axis = (a.x == b.x) != (a.z == b.z);
            if (!axis || std::abs(len - kGridSpacing) > 1e-3f) bad++;
        }
        CHECK(bad == 0, "grid segments are one cell long and axis-aligned");
    }

    // every flat normal must point away from the centroid
    int inward = 0;
    for (const MeshData* m : {&ship, &enemy, &bolt}) {
        glm::vec3 c{0}; for (auto& v : m->vertices) c += v.position; c /= float(m->vertices.size());
        for (auto& v : m->vertices) if (glm::dot(v.normal, v.position - c) < 0.0f) inward++;
    }
    CHECK(inward == 0, "all face normals point outward");
}

static void testMath() {
    std::printf("math\n");
    glm::mat4 p = Math::perspective(glm::radians(65.0f), 16.0f/9.0f, 0.1f, 1200.0f);
    CHECK(p[1][1] < 0.0f, "projection Y is flipped for Vulkan NDC");
    // a point on the near plane must map to depth 0, far plane to depth 1
    glm::vec4 nearPt = p * glm::vec4(0,0,-0.1f,1), farPt = p * glm::vec4(0,0,-1200.0f,1);
    float nz = nearPt.z/nearPt.w, fz = farPt.z/farPt.w;
    CHECK(std::abs(nz - 0.0f) < 1e-3f, "near plane -> depth 0 (not -1)");
    CHECK(std::abs(fz - 1.0f) < 1e-3f, "far plane -> depth 1");
    // forward is local -Z
    CHECK(glm::length(Math::forward(glm::quat(1,0,0,0)) - glm::vec3(0,0,-1)) < 1e-5f, "identity forward = -Z");
}

static void testGameLoop() {
    std::printf("game loop\n");
    Game game;
    InputState idle;
    // 12 simulated seconds of holding fire, at 60 Hz
    InputState firing; firing.firing = true; firing.yaw = 1.0f;
    for (int i = 0; i < 720; i++) game.update(1.0f/60.0f, firing, 16.0f/9.0f);
    FrameData f = game.update(1.0f/60.0f, firing, 16.0f/9.0f);

    CHECK(f.byMesh.count(MeshID::Ship) == 1, "ship is drawn");
    CHECK(f.byMesh[MeshID::Ship].size() == 1, "exactly one ship");
    CHECK(f.byMesh.count(MeshID::Bolt) && !f.byMesh[MeshID::Bolt].empty(), "bolts exist while firing");
    CHECK(f.byMesh.count(MeshID::Enemy) && !f.byMesh[MeshID::Enemy].empty(), "enemies spawned");
    CHECK(f.byMesh[MeshID::Enemy].size() <= 18, "enemy cap respected");
    CHECK(!f.hud.empty() && f.hud.size() % 3 == 0, "HUD is whole triangles");
    CHECK(f.uniforms.lightDirection.w == 0.0f, "light direction is a direction");

    // bolts must expire: stop firing and let the 2.4s fuse run out
    for (int i = 0; i < 300; i++) game.update(1.0f/60.0f, idle, 16.0f/9.0f);
    FrameData g = game.update(1.0f/60.0f, idle, 16.0f/9.0f);
    CHECK(g.byMesh[MeshID::Bolt].empty(), "bolts expire via Lifetime");

    // dt clamp: a 5-second hitch must not teleport the ship
    Game g2;
    glm::vec3 before = g2.update(0.0f, idle, 1.0f).byMesh[MeshID::Ship][0].model[3];
    glm::vec3 after  = g2.update(5.0f, idle, 1.0f).byMesh[MeshID::Ship][0].model[3];
    CHECK(glm::length(after - before) <= 42.0f/30.0f + 0.01f, "dt clamped to 1/30 s");

    // score climbs across a long run of firing
    Game g3; int frames = 0;
    while (g3.stats().score == 0 && frames++ < 6000) g3.update(1.0f/60.0f, firing, 1.0f);
    CHECK(g3.stats().score > 0, "bolts eventually kill enemies and score");
}

int main() {
    testSparseSet(); testDeferredDestroy(); testMeshes(); testMath(); testGameLoop();
    std::printf(failures ? "\n%d CHECK(s) FAILED\n" : "\nall checks passed\n", failures);
    return failures ? 1 : 0;
}
