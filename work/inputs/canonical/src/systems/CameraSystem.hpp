#pragma once

#include "Components.hpp"
#include "Math.hpp"
#include "ecs/World.hpp"

struct CameraResult {
    glm::mat4 view{1.0f};
    glm::vec3 eye{0.0f};
};

namespace CameraSystem {

constexpr float kDistanceBack = 13.0f;
constexpr float kHeightAbove = 4.2f;
constexpr float kLookAhead = 26.0f;
constexpr float kWorldUpWeight = 0.65f;
constexpr float kShipUpWeight = 0.35f;

inline CameraResult compute(World& world, Entity player) {
    Transform* t = world.get<Transform>(player);
    if (!t) return {};

    glm::vec3 fwd = Math::forward(t->rotation);
    glm::vec3 shipUp = Math::up(t->rotation);

    glm::vec3 eye = t->position - fwd * kDistanceBack + shipUp * kHeightAbove;
    glm::vec3 center = t->position + fwd * kLookAhead;
    glm::vec3 camUp = glm::normalize(glm::vec3(0.0f, 1.0f, 0.0f) * kWorldUpWeight
                                   + shipUp * kShipUpWeight);

    return {Math::lookAt(eye, center, camUp), eye};
}

} // namespace CameraSystem
