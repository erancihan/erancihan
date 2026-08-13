#pragma once

#include "Components.hpp"
#include "ecs/World.hpp"
#include "render/RenderTypes.hpp"

namespace RenderSystem {

/// The last system of the frame: bucket every drawable entity by mesh so the
/// renderer can issue one instanced draw per bucket.
inline void collect(World& world, FrameData& out) {
    auto& renderables = world.store<Renderable>();
    auto& transforms = world.store<Transform>();
    for (Entity e : renderables.entities()) {
        Renderable* r = renderables.get(e);
        Transform* t = transforms.get(e);
        if (!t) continue;
        out.byMesh[r->mesh].push_back(InstanceData{t->matrix(), r->color});
    }
}

} // namespace RenderSystem
