#include "Mesh.hpp"

#include <array>
#include <random>

namespace {

using Tri = std::array<glm::vec3, 3>;

/// Flat-shade a triangle soup: every triangle gets its own three vertices and
/// one shared face normal, flipped outward if it points back at the centroid.
MeshData flat(const std::vector<Tri>& tris) {
    glm::vec3 centroid{0.0f};
    for (const Tri& t : tris) centroid += t[0] + t[1] + t[2];
    centroid /= float(tris.size() * 3);

    MeshData m;
    for (const Tri& t : tris) {
        glm::vec3 faceCenter = (t[0] + t[1] + t[2]) / 3.0f;
        glm::vec3 normal = glm::normalize(glm::cross(t[1] - t[0], t[2] - t[0]));
        if (glm::dot(normal, faceCenter - centroid) < 0.0f) normal = -normal;

        uint16_t base = uint16_t(m.vertices.size());
        for (const glm::vec3& p : t) m.vertices.push_back({p, normal});
        m.indices.insert(m.indices.end(), {base, uint16_t(base + 1), uint16_t(base + 2)});
    }
    return m;
}

void quad(std::vector<Tri>& out, glm::vec3 a, glm::vec3 b, glm::vec3 c, glm::vec3 d) {
    out.push_back({a, b, c});
    out.push_back({a, c, d});
}

} // namespace

namespace MeshLibrary {

MeshData ship() {
    glm::vec3 nose{0.0f, 0.0f, -2.0f};
    glm::vec3 top{0.0f, 0.4f, 1.0f};
    glm::vec3 left{-1.3f, -0.3f, 1.0f};
    glm::vec3 right{1.3f, -0.3f, 1.0f};
    return flat({
        {nose, left, top},
        {nose, top, right},
        {nose, right, left},
        {top, left, right},
    });
}

MeshData enemy() {
    glm::vec3 px{1.0f, 0.0f, 0.0f}, nx{-1.0f, 0.0f, 0.0f};
    glm::vec3 py{0.0f, 1.0f, 0.0f}, ny{0.0f, -1.0f, 0.0f};
    glm::vec3 pz{0.0f, 0.0f, 1.0f}, nz{0.0f, 0.0f, -1.0f};
    return flat({
        {py, px, pz}, {py, pz, nx}, {py, nx, nz}, {py, nz, px},
        {ny, pz, px}, {ny, nx, pz}, {ny, nz, nx}, {ny, px, nz},
    });
}

MeshData bolt() {
    glm::vec3 a{-1, -1, -1}, b{1, -1, -1}, c{1, 1, -1}, d{-1, 1, -1};
    glm::vec3 e{-1, -1, 1}, f{1, -1, 1}, g{1, 1, 1}, h{-1, 1, 1};
    std::vector<Tri> tris;
    quad(tris, a, b, c, d);
    quad(tris, f, e, h, g);
    quad(tris, e, a, d, h);
    quad(tris, b, f, g, c);
    quad(tris, d, c, g, h);
    quad(tris, e, f, b, a);
    return flat(tris);
}

MeshData starfield(int count, float span) {
    MeshData m;
    std::mt19937 rng{1337u};
    std::uniform_real_distribution<float> pos{-span * 0.5f, span * 0.5f};
    std::uniform_real_distribution<float> unit{0.0f, 1.0f};
    for (int i = 0; i < count; i++) {
        glm::vec3 p{pos(rng), pos(rng), pos(rng)};
        float brightness = 0.4f + 0.6f * unit(rng);
        m.vertices.push_back({p, glm::vec3(brightness, 0.0f, 0.0f)});
    }
    return m;
}

MeshData grid(float halfExtent, float spacing) {
    MeshData m;
    // One short segment per cell rather than one full-length line per row.
    // A single line running from far ahead of the camera to far behind it has
    // to be clipped against the near plane, and such lines can vanish
    // entirely; a one-cell segment never spans the camera.
    for (float i = -halfExtent; i <= halfExtent; i += spacing) {
        for (float j = -halfExtent; j < halfExtent; j += spacing) {
            m.vertices.push_back({{i, 0.0f, j}, {}});
            m.vertices.push_back({{i, 0.0f, j + spacing}, {}});
            m.vertices.push_back({{j, 0.0f, i}, {}});
            m.vertices.push_back({{j + spacing, 0.0f, i}, {}});
        }
    }
    return m;
}

} // namespace MeshLibrary
