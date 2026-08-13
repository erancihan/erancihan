#pragma once

#include <cstdint>

struct Entity {
    uint32_t id = 0;
};

inline bool operator==(Entity a, Entity b) { return a.id == b.id; }
inline bool operator!=(Entity a, Entity b) { return a.id != b.id; }
