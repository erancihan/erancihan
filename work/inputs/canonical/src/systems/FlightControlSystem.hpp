#pragma once

#include "Components.hpp"
#include "Input.hpp"
#include "Math.hpp"
#include "ecs/World.hpp"

namespace FlightControlSystem {

constexpr float kPitchRate = 1.7f;   // radians/second
constexpr float kYawRate = 1.3f;
constexpr float kRollRate = 2.6f;
constexpr float kAutoBank = 1.5f;    // roll added per unit of yaw input
constexpr float kCruiseSpeed = 42.0f;
constexpr float kBoostMultiplier = 1.9f;

inline void update(World& world, Entity player, const InputState& input, float dt) {
    Transform* t = world.get<Transform>(player);
    Player* p = world.get<Player>(player);
    if (!t || !p) return;

    p->boosting = input.boosting;
    p->throttle = input.throttle;

    float pitch = input.pitch * kPitchRate;
    float yaw = input.yaw * kYawRate;
    float roll = input.roll * kRollRate + input.yaw * kAutoBank;

    glm::quat delta = glm::angleAxis(pitch * dt, glm::vec3(1.0f, 0.0f, 0.0f))
                    * glm::angleAxis(yaw * dt, glm::vec3(0.0f, 1.0f, 0.0f))
                    * glm::angleAxis(roll * dt, glm::vec3(0.0f, 0.0f, 1.0f));
    t->rotation = glm::normalize(t->rotation * delta);

    float speed = kCruiseSpeed * (p->boosting ? kBoostMultiplier : 1.0f);
    world.store<Velocity>().set(player, Velocity{Math::forward(t->rotation) * speed});
}

} // namespace FlightControlSystem
