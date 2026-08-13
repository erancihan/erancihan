#pragma once

#include "Components.hpp"
#include "ecs/World.hpp"

namespace SpinSystem {

inline void update(World& world, float dt) {
    auto& spinners = world.store<Spinner>();
    auto& transforms = world.store<Transform>();
    for (Entity e : spinners.entities()) {
        Spinner* s = spinners.get(e);
        if (Transform* t = transforms.get(e))
            t->rotation = glm::normalize(t->rotation * glm::angleAxis(s->rate * dt, s->axis));
    }
}

} // namespace SpinSystem
