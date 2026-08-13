#pragma once

#include "ComponentStore.hpp"
#include "Entity.hpp"

#include <memory>
#include <typeindex>
#include <unordered_map>
#include <unordered_set>
#include <vector>

class World {
public:
    Entity create() {
        Entity e{nextId++};
        living.insert(e.id);
        return e;
    }

    bool isAlive(Entity e) const { return living.count(e.id) != 0; }

    /// Safe to call mid-iteration: this only queues the id.
    void destroy(Entity e) {
        if (living.count(e.id)) pendingDestroy.push_back(e);
    }

    /// Called once per frame, after every system has run.
    void flushDestroyed() {
        for (Entity e : pendingDestroy) {
            if (!living.count(e.id)) continue;
            for (auto& entry : stores) entry.second->removeIfPresent(e);
            living.erase(e.id);
        }
        pendingDestroy.clear();
    }

    template <typename T>
    ComponentStore<T>& store() {
        auto key = std::type_index(typeid(T));
        auto it = stores.find(key);
        if (it == stores.end())
            it = stores.emplace(key, std::make_unique<ComponentStore<T>>()).first;
        return *static_cast<ComponentStore<T>*>(it->second.get());
    }

    template <typename T>
    void add(Entity e, const T& c) { store<T>().set(e, c); }

    template <typename T>
    T* get(Entity e) { return store<T>().get(e); }

    template <typename T>
    bool has(Entity e) { return store<T>().has(e); }

private:
    std::unordered_map<std::type_index, std::unique_ptr<IComponentStore>> stores;
    uint32_t nextId = 0;
    std::unordered_set<uint32_t> living;
    std::vector<Entity> pendingDestroy;
};
