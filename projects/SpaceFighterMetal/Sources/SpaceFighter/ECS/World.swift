import Foundation

final class World {
    private var nextID: UInt32 = 0
    private(set) var entities: Set<Entity> = []
    private var stores: [ObjectIdentifier: AnyComponentStore] = [:]
    private var pendingDestroy: [Entity] = []

    func createEntity() -> Entity {
        let e = Entity(id: nextID)
        nextID += 1
        entities.insert(e)
        return e
    }

    /// Safe to call mid-iteration: this only queues the id.
    func destroy(_ entity: Entity) {
        guard entities.contains(entity) else { return }
        pendingDestroy.append(entity)
    }

    func isAlive(_ entity: Entity) -> Bool {
        entities.contains(entity) && !pendingDestroy.contains(entity)
    }

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

    func store<T>(_ type: T.Type = T.self) -> ComponentStore<T> {
        let key = ObjectIdentifier(T.self)
        if let existing = stores[key] as? ComponentStore<T> {
            return existing
        }
        let created = ComponentStore<T>()
        stores[key] = created
        return created
    }

    @discardableResult
    func add<T>(_ component: T, to entity: Entity) -> Entity {
        store(T.self).set(entity, component)
        return entity
    }

    func get<T>(_ type: T.Type, _ entity: Entity) -> T? {
        store(T.self).get(entity)
    }

}
