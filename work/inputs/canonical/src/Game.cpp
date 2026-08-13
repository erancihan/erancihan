#include "Game.hpp"

#include "Components.hpp"
#include "HUD.hpp"
#include "Math.hpp"
#include "systems/CameraSystem.hpp"
#include "systems/CollisionSystem.hpp"
#include "systems/EnemySystem.hpp"
#include "systems/FlightControlSystem.hpp"
#include "systems/LifetimeSystem.hpp"
#include "systems/MovementSystem.hpp"
#include "systems/RenderSystem.hpp"
#include "systems/SpinSystem.hpp"
#include "systems/WeaponSystem.hpp"

#include <algorithm>
#include <cmath>

namespace {
constexpr float kMaxStep = 1.0f / 30.0f;
constexpr float kFieldOfView = 65.0f;
constexpr float kNearPlane = 0.1f;
constexpr float kFarPlane = 1200.0f;
constexpr float kShipScale = 1.0f;
} // namespace

Game::Game() { spawnPlayer(); }

void Game::spawnPlayer() {
    player = world.create();

    Transform t;
    t.scale = glm::vec3(kShipScale);
    world.add(player, t);
    world.add(player, Velocity{});
    world.add(player, Player{});
    world.add(player, Weapon{});
    world.add(player, Renderable{MeshID::Ship, glm::vec4(0.62f, 0.78f, 0.95f, 1.0f)});
    world.add(player, Collider{1.8f, Layer::Player, Layer::Enemy});
}

void Game::respawn() {
    for (Entity e : world.store<Enemy>().entities()) world.destroy(e);
    for (Entity e : world.store<Projectile>().entities()) world.destroy(e);
    world.flushDestroyed();

    Transform t;
    t.scale = glm::vec3(kShipScale);
    world.store<Transform>().set(player, t);
    world.store<Velocity>().set(player, Velocity{});

    gameStats.playerHealth = gameStats.playerMaxHealth;
    gameStats.hitFlash = 0.0f;
    gameStats.deaths++;
}

FrameData Game::update(float dt, const InputState& input, float aspect) {
    dt = std::min(std::max(dt, 0.0f), kMaxStep);

    FlightControlSystem::update(world, player, input, dt);
    WeaponSystem::update(world, player, input, dt);
    EnemySystem::update(world, player, director, dt);
    MovementSystem::update(world, dt);
    SpinSystem::update(world, dt);
    LifetimeSystem::update(world, dt);
    CollisionSystem::update(world, player, gameStats);
    world.flushDestroyed();

    gameStats.hitFlash = std::max(0.0f, gameStats.hitFlash - dt);
    if (gameStats.playerHealth <= 0.0f) respawn();

    FrameData frame;
    RenderSystem::collect(world, frame);

    CameraResult cam = CameraSystem::compute(world, player);
    glm::mat4 proj = Math::perspective(glm::radians(kFieldOfView), aspect, kNearPlane, kFarPlane);
    frame.uniforms.viewProjection = proj * cam.view;
    frame.uniforms.cameraPosition = glm::vec4(cam.eye, 1.0f);
    frame.uniforms.lightDirection =
        glm::vec4(glm::normalize(glm::vec3(-0.35f, -0.80f, -0.45f)), 0.0f);

    // Slide the finite grid under the player, snapped to a whole cell so the
    // lines never appear to crawl.
    glm::vec3 focus = cam.eye;
    if (Transform* t = world.get<Transform>(player)) focus = t->position;
    float gx = std::round(focus.x / kGridSpacing) * kGridSpacing;
    float gz = std::round(focus.z / kGridSpacing) * kGridSpacing;
    frame.gridModel = glm::translate(glm::mat4(1.0f), glm::vec3(gx, kGroundY, gz));

    frame.hud = HUD::build(gameStats, aspect);
    return frame;
}
