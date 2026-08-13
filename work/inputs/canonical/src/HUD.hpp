#pragma once

#include "GameState.hpp"
#include "render/RenderTypes.hpp"

#include <vector>

namespace HUD {

/// A pure function: game numbers in, clip-space triangles out. Authored with
/// +Y up; hud.vert flips Y for Vulkan's downward NDC.
std::vector<HUDVertex> build(const GameStats& stats, float aspect);

} // namespace HUD
