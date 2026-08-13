#pragma once

#include "Entity.hpp"

#include <cstddef>
#include <unordered_map>
#include <utility>
#include <vector>

/// The erasure boundary: World holds these, so it can clean an entity out of
/// every store without knowing any concrete component type.
struct IComponentStore {
    virtual ~IComponentStore() = default;
    virtual void removeIfPresent(Entity e) = 0;
};

template <typename T>
class ComponentStore : public IComponentStore {
public:
    void set(Entity e, const T& value) {
        auto it = indexOf.find(e.id);
        if (it != indexOf.end()) {
            items[it->second] = value;
            return;
        }
        indexOf[e.id] = items.size();
        items.push_back(value);
        owners.push_back(e);
    }

    T* get(Entity e) {
        auto it = indexOf.find(e.id);
        return it == indexOf.end() ? nullptr : &items[it->second];
    }

    const T* get(Entity e) const {
        auto it = indexOf.find(e.id);
        return it == indexOf.end() ? nullptr : &items[it->second];
    }

    bool has(Entity e) const { return indexOf.find(e.id) != indexOf.end(); }

    /// Swap-remove: move the last element into the hole so the dense arrays
    /// stay gapless without shifting.
    void removeIfPresent(Entity e) override {
        auto it = indexOf.find(e.id);
        if (it == indexOf.end()) return;
        size_t i = it->second;
        size_t last = items.size() - 1;
        if (i != last) {
            items[i] = std::move(items[last]);
            owners[i] = owners[last];
            indexOf[owners[i].id] = i;
        }
        items.pop_back();
        owners.pop_back();
        indexOf.erase(it);
    }

    const std::vector<Entity>& entities() const { return owners; }
    size_t size() const { return items.size(); }

private:
    std::vector<T> items;
    std::vector<Entity> owners;
    std::unordered_map<uint32_t, size_t> indexOf;
};
