#pragma once

#include "Math.hpp"

#include <cstdint>
#include <unordered_map>
#include <vector>

/// Vertex-buffer layout. Not a std140/std430 struct — the pipeline's binding
/// stride and attribute offsets describe it, so it packs tight at 24 bytes.
struct Vertex {
    glm::vec3 position;
    glm::vec3 normal;
};

/// One element of the instance SSBO (std430). 64 + 16 = 80 bytes, no padding.
struct InstanceData {
    glm::mat4 model;
    glm::vec4 color;
};

/// The per-frame UBO (std140). vec4 rather than vec3 so nothing slides.
struct FrameUniforms {
    glm::mat4 viewProjection;
    glm::vec4 cameraPosition;
    glm::vec4 lightDirection;
};

struct HUDVertex {
    glm::vec2 position;
    glm::vec4 color;
};

// The shaders read these bytes directly. If a size changes, the GPU reads
// garbage with no error, so pin them here where a mistake is a build failure.
static_assert(sizeof(Vertex) == 24, "Vertex must stay tightly packed");
static_assert(sizeof(InstanceData) == 80, "InstanceData must match std430");
static_assert(sizeof(FrameUniforms) == 96, "FrameUniforms must match std140");

/// Push-constant block for the star pipeline.
struct StarParams {
    float span;
};

enum class MeshID : uint32_t {
    Ship,
    Enemy,
    Bolt,
    Star,
    Grid,
};

/// World constants both sides of the seam need: the simulation snaps the grid
/// to them, the renderer generates geometry from them.
constexpr float kGridSpacing = 20.0f;
constexpr float kGridHalfExtent = 400.0f;
constexpr float kGroundY = -18.0f;
constexpr float kStarSpan = 220.0f;
constexpr int kStarCount = 3000;

/// Everything the simulation hands the renderer for one frame. No Vulkan type
/// appears here: this is the whole seam.
struct FrameData {
    std::unordered_map<MeshID, std::vector<InstanceData>> byMesh;
    FrameUniforms uniforms;
    glm::mat4 gridModel{1.0f};
    std::vector<HUDVertex> hud;
};
