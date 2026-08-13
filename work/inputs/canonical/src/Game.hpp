#pragma once

#include "GameState.hpp"
#include "Input.hpp"
#include "ecs/World.hpp"
#include "render/RenderTypes.hpp"

class Game {
public:
    Game();

    /// Advance the world by dt, then package what the renderer needs.
    FrameData update(float dt, const InputState& input, float aspect);

    const GameStats& stats() const { return gameStats; }

private:
    void spawnPlayer();
    void respawn();

    World world;
    Entity player;
    GameStats gameStats;
    Director director;
};
