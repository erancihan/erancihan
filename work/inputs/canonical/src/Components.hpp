#pragma once

#include "Math.hpp"
#include "render/RenderTypes.hpp"

#include <cstdint>

struct Transform {
    glm::vec3 position{0.0f};
    glm::quat rotation{1.0f, 0.0f, 0.0f, 0.0f};
    glm::vec3 scale{1.0f};

    glm::mat4 matrix() const { return Math::trs(position, rotation, scale); }
};

struct Velocity {
    glm::vec3 linear{0.0f};
};

struct Renderable {
    MeshID mesh;
    glm::vec4 color;
};

struct Player {
    float throttle = 0.0f;
    bool boosting = false;
};

struct Weapon {
    float cooldown = 0.0f;
    float fireInterval = 0.14f;
    float muzzleSpeed = 140.0f;
};

struct Projectile {
    int damage = 1;
};

struct Enemy {
    float health = 1.0f;
    int scoreValue = 100;
};

struct Homing {
    float turnRate = 1.1f;
    float speed = 34.0f;
};

struct Spinner {
    glm::vec3 axis{0.0f, 1.0f, 0.0f};
    float rate = 1.5f;
};

struct Lifetime {
    float remaining = 0.0f;
};

enum class Layer : uint32_t {
    None = 0,
    Player = 1,
    Enemy = 2,
    Projectile = 4,
};

inline Layer operator|(Layer a, Layer b) {
    return static_cast<Layer>(static_cast<uint32_t>(a) | static_cast<uint32_t>(b));
}
inline bool overlaps(Layer mask, Layer layer) {
    return (static_cast<uint32_t>(mask) & static_cast<uint32_t>(layer)) != 0;
}

struct Collider {
    float radius = 1.0f;
    Layer layer = Layer::None;
    Layer mask = Layer::None;
};
