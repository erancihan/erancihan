#pragma once

#include "render/RenderTypes.hpp"

#include <cstdint>
#include <vector>

/// CPU-side geometry. An empty `indices` means "draw this non-indexed".
struct MeshData {
    std::vector<Vertex> vertices;
    std::vector<uint16_t> indices;
};

namespace MeshLibrary {

MeshData ship();
MeshData enemy();
MeshData bolt();
MeshData starfield(int count, float span);
MeshData grid(float halfExtent, float spacing);

} // namespace MeshLibrary
