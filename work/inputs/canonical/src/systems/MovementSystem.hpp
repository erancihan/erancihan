#pragma once

#include "Components.hpp"
#include "ecs/World.hpp"

namespace MovementSystem {

inline void update(World& world, float dt) {
    auto& velocities = world.store<Velocity>();
    auto& transforms = world.store<Transform>();
    for (Entity e : velocities.entities()) {
        Velocity* v = velocities.get(e);
        if (Transform* t = transforms.get(e)) t->position += v->linear * dt;
    }
}

} // namespace MovementSystem
