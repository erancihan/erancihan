#include "HUD.hpp"

#include <algorithm>

namespace {

constexpr float kBarX = -0.72f;
constexpr float kBarY = -0.86f;
constexpr float kBarHalfWidth = 0.22f;
constexpr float kBarHalfHeight = 0.022f;
constexpr float kFlashSeconds = 0.5f;
constexpr float kReticleArm = 0.035f;
constexpr float kReticleThickness = 0.004f;

void appendRect(std::vector<HUDVertex>& out, float cx, float cy, float hw, float hh,
                const glm::vec4& color) {
    glm::vec2 tl{cx - hw, cy + hh};
    glm::vec2 tr{cx + hw, cy + hh};
    glm::vec2 bl{cx - hw, cy - hh};
    glm::vec2 br{cx + hw, cy - hh};
    for (const glm::vec2& p : {tl, bl, br, tl, br, tr}) out.push_back({p, color});
}

} // namespace

namespace HUD {

std::vector<HUDVertex> build(const GameStats& stats, float aspect) {
    std::vector<HUDVertex> v;

    // Appended first so everything else layers on top of it.
    if (stats.hitFlash > 0.0f) {
        float alpha = 0.35f * std::min(stats.hitFlash / kFlashSeconds, 1.0f);
        appendRect(v, 0.0f, 0.0f, 1.0f, 1.0f, glm::vec4(1.0f, 0.1f, 0.1f, alpha));
    }

    float frac = glm::clamp(stats.playerHealth / stats.playerMaxHealth, 0.0f, 1.0f);
    appendRect(v, kBarX, kBarY, kBarHalfWidth, kBarHalfHeight,
               glm::vec4(0.05f, 0.06f, 0.09f, 0.80f));
    glm::vec4 fill{1.0f - frac, 0.2f + 0.7f * frac, 0.25f, 0.95f};
    appendRect(v, kBarX - kBarHalfWidth + kBarHalfWidth * frac, kBarY,
               kBarHalfWidth * frac, kBarHalfHeight, fill);

    glm::vec4 cyan{0.35f, 0.95f, 1.0f, 0.90f};
    appendRect(v, 0.0f, 0.0f, kReticleArm / aspect, kReticleThickness, cyan);
    appendRect(v, 0.0f, 0.0f, kReticleThickness / aspect, kReticleArm, cyan);

    return v;
}

} // namespace HUD
