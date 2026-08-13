#pragma once

#include "Components.hpp"
#include "GameState.hpp"
#include "Math.hpp"
#include "ecs/World.hpp"

#include <algorithm>
#include <cmath>
#include <random>

namespace EnemySystem {

constexpr float kSpawnMinAhead = 120.0f;
constexpr float kSpawnMaxAhead = 190.0f;
constexpr float kSpawnSpread = 55.0f;
constexpr float kSpawnDrop = -20.0f;
constexpr float kSpawnRise = 28.0f;
constexpr float kCullRadius = 280.0f;
constexpr float kDrifterSpeed = 30.0f;
constexpr float kEnemyScale = 2.1f;

namespace detail {

inline float rand01() {
    static std::mt19937 rng{2024u};
    static std::uniform_real_distribution<float> dist{0.0f, 1.0f};
    return dist(rng);
}

inline float range(float lo, float hi) { return lo + (hi - lo) * rand01(); }

} // namespace detail

/// New enemies appear in a cone ahead of the player, placed with the player's
/// own axes so they are always roughly where you are looking.
inline void spawn(World& world, const Transform& playerT) {
    Transform t;
    t.position = playerT.position
               + Math::forward(playerT.rotation) * detail::range(kSpawnMinAhead, kSpawnMaxAhead)
               + Math::right(playerT.rotation) * detail::range(-kSpawnSpread, kSpawnSpread)
               + Math::up(playerT.rotation) * detail::range(kSpawnDrop, kSpawnRise);
    t.rotation = playerT.rotation;
    t.scale = glm::vec3(kEnemyScale);

    Entity e = world.create();
    world.add(e, t);
    world.add(e, Enemy{});
    world.add(e, Collider{2.4f, Layer::Enemy, Layer::Player});

    if (detail::rand01() < 0.5f) {
        world.add(e, Renderable{MeshID::Enemy, glm::vec4(0.95f, 0.25f, 0.25f, 1.0f)});
        world.add(e, Homing{});
        world.add(e, Velocity{});
    } else {
        world.add(e, Renderable{MeshID::Enemy, glm::vec4(0.95f, 0.70f, 0.25f, 1.0f)});
        world.add(e, Velocity{glm::normalize(playerT.position - t.position) * kDrifterSpeed});
        world.add(e, Spinner{glm::normalize(glm::vec3(detail::range(-1.0f, 1.0f), 1.0f,
                                                     detail::range(-1.0f, 1.0f))),
                             detail::range(0.8f, 2.4f)});
    }
}

/// Turn each chaser toward the player at a capped rate, then fly down its nose.
inline void steer(World& world, const Transform& playerT, float dt) {
    auto& homings = world.store<Homing>();
    auto& transforms = world.store<Transform>();
    auto& velocities = world.store<Velocity>();

    for (Entity e : homings.entities()) {
        Homing* h = homings.get(e);
        Transform* t = transforms.get(e);
        if (!t) continue;

        glm::vec3 toTarget = playerT.position - t->position;
        if (glm::length(toTarget) < 1e-4f) continue;

        glm::vec3 desired = glm::normalize(toTarget);
        glm::vec3 current = Math::forward(t->rotation);
        glm::vec3 axis = glm::cross(current, desired);
        if (glm::length(axis) > 1e-4f) {
            float angle = std::min(h->turnRate * dt,
                                   std::acos(glm::clamp(glm::dot(current, desired), -1.0f, 1.0f)));
            t->rotation = glm::normalize(glm::angleAxis(angle, glm::normalize(axis)) * t->rotation);
        }
        velocities.set(e, Velocity{Math::forward(t->rotation) * h->speed});
    }
}

inline void cull(World& world, const Transform& playerT) {
    auto& enemies = world.store<Enemy>();
    auto& transforms = world.store<Transform>();
    for (Entity e : enemies.entities())
        if (Transform* t = transforms.get(e))
            if (glm::length(t->position - playerT.position) > kCullRadius) world.destroy(e);
}

inline void update(World& world, Entity player, Director& director, float dt) {
    Transform* pt = world.get<Transform>(player);
    if (!pt) return;
    Transform playerT = *pt;   // copy: spawn() creates entities and can move the store

    steer(world, playerT, dt);
    cull(world, playerT);

    director.spawnTimer -= dt;
    if (director.spawnTimer > 0.0f) return;
    if (int(world.store<Enemy>().size()) >= director.maxEnemies) return;

    director.spawnTimer = director.spawnInterval;
    spawn(world, playerT);
}

} // namespace EnemySystem
