import Foundation

protocol AnyComponentStore: AnyObject {
    func removeIfPresent(_ entity: Entity)
}

final class ComponentStore<T>: AnyComponentStore {
    private(set) var items: [T] = []
    private(set) var owners: [Entity] = []
    private var indexOf: [Entity: Int] = [:]

    var count: Int { items.count }

    func set(_ entity: Entity, _ value: T) {
        if let i = indexOf[entity] {
            items[i] = value
        } else {
            indexOf[entity] = items.count
            items.append(value)
            owners.append(entity)
        }
    }

    // TODO: retrun without copy ?
    func get(_ entity: Entity) -> T? {
        guard let i = indexOf[entity] else { return nil }
        return items[i]
    }

    func has(_ entity: Entity) -> Bool {
        indexOf[entity] != nil
    }

    func mutate(_ entity: Entity, _ body: (inout T) -> Void) {
        guard let i = indexOf[entity] else { return }
        body(&items[i])
    }

    func removeIfPresent(_ entity: Entity) {
        guard let i = indexOf[entity] else { return }

        let last = items.count - 1
        if i != last {
            items[i] = items[last]
            owners[i] = owners[last]
            indexOf[owners[i]] = i
        }
        items.removeLast()
        owners.removeLast()

        indexOf[entity] = nil
    }
}
