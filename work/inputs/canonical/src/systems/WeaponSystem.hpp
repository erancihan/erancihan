#pragma once

#include "Components.hpp"
#include "Input.hpp"
#include "Math.hpp"
#include "ecs/World.hpp"

#include <algorithm>

namespace WeaponSystem {

constexpr float kBoltHalfSpan = 0.9f;   // muzzle offset from the ship's centreline
constexpr float kBoltLifetime = 2.4f;

inline void fireBolt(World& world, const Transform& ship, const glm::vec3& offset, float speed) {
    Transform t;
    t.position = ship.position + ship.rotation * offset;
    t.rotation = ship.rotation;
    t.scale = glm::vec3(0.18f, 0.18f, 0.7f);

    Entity bolt = world.create();
    world.add(bolt, t);
    world.add(bolt, Velocity{Math::forward(ship.rotation) * speed});
    world.add(bolt, Renderable{MeshID::Bolt, glm::vec4(0.35f, 0.95f, 1.0f, 1.0f)});
    world.add(bolt, Projectile{1});
    world.add(bolt, Collider{0.6f, Layer::Projectile, Layer::Enemy});
    world.add(bolt, Lifetime{kBoltLifetime});
}

inline void update(World& world, Entity player, const InputState& input, float dt) {
    Weapon* w = world.get<Weapon>(player);
    Transform* t = world.get<Transform>(player);
    if (!w || !t) return;

    w->cooldown = std::max(0.0f, w->cooldown - dt);
    if (!input.firing || w->cooldown > 0.0f) return;

    // Copy before spawning: creating entities pushes into the Transform store,
    // which can reallocate the array `t` points into.
    Transform ship = *t;
    glm::vec3 right = Math::right(ship.rotation);
    float speed = w->muzzleSpeed;

    fireBolt(world, ship, right * kBoltHalfSpan, speed);
    fireBolt(world, ship, right * -kBoltHalfSpan, speed);

    Weapon* weapon = world.get<Weapon>(player);
    weapon->cooldown = weapon->fireInterval;
}

} // namespace WeaponSystem
