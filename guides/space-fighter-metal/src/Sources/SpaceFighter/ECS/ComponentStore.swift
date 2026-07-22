import Foundation

/// Type-erased view of a component store so the `World` can hold stores of many
/// different component types in one dictionary and still, for example, remove a
/// dead entity from every store without knowing their concrete types.
protocol AnyComponentStore: AnyObject {
    func removeIfPresent(_ entity: Entity)
}

/// A **sparse set**: the storage pattern most data-oriented ECS libraries use.
///
/// Two parallel *dense* arrays hold the live data back-to-back with no gaps:
///   - `items[i]`  — the component value
///   - `owners[i]` — which entity owns `items[i]`
///
/// A *sparse* map (`indexOf`) points from an entity to its slot in the dense
/// arrays. That gives us the best of both worlds:
///   - **O(1)** insert, lookup and remove (remove swaps the last element into
///     the hole, so the dense arrays stay tightly packed), and
///   - **cache-friendly iteration** — a system that wants every `Transform`
///     just walks `items`, which is contiguous memory.
///
/// The trade-off of swap-remove is that iteration order is not stable, which is
/// fine: systems shouldn't depend on the order entities were created in.
final class ComponentStore<T>: AnyComponentStore {
    /// Dense component values. Walk this for fast iteration.
    private(set) var items: [T] = []
    /// Dense parallel array: `owners[i]` owns `items[i]`.
    private(set) var owners: [Entity] = []
    /// Sparse map from entity to its index in the dense arrays.
    private var indexOf: [Entity: Int] = [:]

    var count: Int { items.count }

    /// Attach `value` to `entity`, or overwrite it if already present.
    func set(_ entity: Entity, _ value: T) {
        if let i = indexOf[entity] {
            items[i] = value
        } else {
            indexOf[entity] = items.count
            items.append(value)
            owners.append(entity)
        }
    }

    func get(_ entity: Entity) -> T? {
        guard let i = indexOf[entity] else { return nil }
        return items[i]
    }

    func has(_ entity: Entity) -> Bool {
        indexOf[entity] != nil
    }

    /// Mutate a component in place without copying it out and back in. This is
    /// the workhorse systems use, e.g. `store.mutate(e) { $0.position += v }`.
    func mutate(_ entity: Entity, _ body: (inout T) -> Void) {
        guard let i = indexOf[entity] else { return }
        body(&items[i])
    }

    func removeIfPresent(_ entity: Entity) {
        guard let i = indexOf[entity] else { return }
        let last = items.count - 1
        if i != last {
            // Swap the last element into the hole so the dense arrays stay gap-free.
            items[i] = items[last]
            owners[i] = owners[last]
            indexOf[owners[i]] = i
        }
        items.removeLast()
        owners.removeLast()
        indexOf[entity] = nil
    }
}
