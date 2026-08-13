#pragma once

#include "Components.hpp"
#include "GameState.hpp"
#include "ecs/World.hpp"

namespace CollisionSystem {

constexpr float kRamDamage = 20.0f;
constexpr float kFlashSeconds = 0.5f;

inline bool overlapping(const Transform& a, const Collider& ac,
                        const Transform& b, const Collider& bc) {
    glm::vec3 d = a.position - b.position;
    float reach = ac.radius + bc.radius;
    return glm::dot(d, d) <= reach * reach;   // compare squared; no sqrt
}

inline void update(World& world, Entity player, GameStats& stats) {
    auto& colliders = world.store<Collider>();
    auto& transforms = world.store<Transform>();
    auto& projectiles = world.store<Projectile>();
    auto& enemies = world.store<Enemy>();

    // bolt → enemy
    for (Entity b : projectiles.entities()) {
        Projectile* p = projectiles.get(b);
        Collider* bc = colliders.get(b);
        Transform* bt = transforms.get(b);
        if (!p || !bc || !bt) continue;

        for (Entity e : enemies.entities()) {
            Enemy* en = enemies.get(e);
            Collider* ec = colliders.get(e);
            Transform* et = transforms.get(e);
            if (!en || !ec || !et || en->health <= 0.0f) continue;
            if (!overlaps(bc->mask, ec->layer)) continue;
            if (!overlapping(*bt, *bc, *et, *ec)) continue;

            en->health -= float(p->damage);
            world.destroy(b);
            if (en->health <= 0.0f) {
                world.destroy(e);
                stats.score += en->scoreValue;
            }
            break;   // one bolt, one hit
        }
    }

    // ship → enemy
    Collider* pc = colliders.get(player);
    Transform* pt = transforms.get(player);
    if (!pc || !pt) return;

    for (Entity e : enemies.entities()) {
        Enemy* en = enemies.get(e);
        Collider* ec = colliders.get(e);
        Transform* et = transforms.get(e);
        if (!en || !ec || !et || en->health <= 0.0f) continue;
        if (!overlapping(*pt, *pc, *et, *ec)) continue;

        en->health = 0.0f;
        world.destroy(e);
        stats.playerHealth -= kRamDamage;
        stats.hitFlash = kFlashSeconds;
    }
}

} // namespace CollisionSystem
