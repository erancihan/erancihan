import Foundation

/// The `World` owns every entity and every component store. It is the single
/// source of truth that systems read from and write to.
///
/// Component stores are kept in a dictionary keyed by the component's Swift
/// metatype (`ObjectIdentifier(T.self)`). `store(_:)` hands back a strongly
/// typed `ComponentStore<T>`, creating it on first use, so gameplay code never
/// touches the type erasure directly.
final class World {
    /// Monotonic id source. We never recycle ids (see `Entity`).
    private var nextID: UInt32 = 0

    /// All live entities. Handy for debugging and for "does this still exist?"
    /// checks after a frame's worth of destruction.
    private(set) var entities: Set<Entity> = []

    /// One store per component type, type-erased for storage.
    private var stores: [ObjectIdentifier: AnyComponentStore] = [:]

    /// Entities queued for destruction. Systems call `destroy(_:)` freely while
    /// iterating; the actual removal happens in `flushDestroyed()` at a safe
    /// point in the frame, so no system ever mutates a store it is looping over.
    private var pendingDestroy: [Entity] = []

    // MARK: - Entities

    func createEntity() -> Entity {
        let e = Entity(id: nextID)
        nextID += 1
        entities.insert(e)
        return e
    }

    /// Mark an entity for removal. Safe to call mid-iteration.
    func destroy(_ entity: Entity) {
        guard entities.contains(entity) else { return }
        pendingDestroy.append(entity)
    }

    func isAlive(_ entity: Entity) -> Bool {
        entities.contains(entity) && !pendingDestroy.contains(entity)
    }

    /// Actually delete everything queued this frame. Call once, after all
    /// systems have run.
    func flushDestroyed() {
        guard !pendingDestroy.isEmpty else { return }
        for e in pendingDestroy where entities.contains(e) {
            for store in stores.values {
                store.removeIfPresent(e)
            }
            entities.remove(e)
        }
        pendingDestroy.removeAll(keepingCapacity: true)
    }

    // MARK: - Components

    /// Fetch (or lazily create) the store for component type `T`.
    func store<T>(_ type: T.Type = T.self) -> ComponentStore<T> {
        let key = ObjectIdentifier(T.self)
        if let existing = stores[key] as? ComponentStore<T> {
            return existing
        }
        let created = ComponentStore<T>()
        stores[key] = created
        return created
    }

    /// Convenience: attach a component to an entity.
    @discardableResult
    func add<T>(_ component: T, to entity: Entity) -> Entity {
        store(T.self).set(entity, component)
        return entity
    }

    func get<T>(_ type: T.Type, _ entity: Entity) -> T? {
        store(T.self).get(entity)
    }
}
