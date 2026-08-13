#pragma once

#include "Components.hpp"
#include "ecs/World.hpp"

namespace LifetimeSystem {

inline void update(World& world, float dt) {
    auto& lifetimes = world.store<Lifetime>();
    for (Entity e : lifetimes.entities()) {
        Lifetime* l = lifetimes.get(e);
        l->remaining -= dt;
        if (l->remaining <= 0.0f) world.destroy(e);
    }
}

} // namespace LifetimeSystem
