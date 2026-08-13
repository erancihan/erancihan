#pragma once

/// Numbers that belong to the run rather than to any one entity. Systems read
/// and write these; keeping them out of Game.hpp is what stops the system
/// headers and Game.hpp including each other.
struct GameStats {
    int score = 0;
    int deaths = 0;
    float playerHealth = 100.0f;
    float playerMaxHealth = 100.0f;
    float hitFlash = 0.0f;
};

/// Every difficulty knob in the game, in one place.
struct Director {
    float spawnTimer = 0.0f;
    float spawnInterval = 1.6f;
    int maxEnemies = 18;
};
