# 04 · Designing the ECS 🛠️

> **You'll leave this chapter with:** a real understanding of the three ECS
> storage strategies and why we pick the **sparse set**, plus a working engine
> core you can create entities in.
>
> **Files created:** `Sources/SpaceFighter/ECS/Entity.swift`,
> `ECS/ComponentStore.swift`, `ECS/World.swift`

---

## The three words, precisely

- **Entity** — an identity with no data and no behaviour. Ours will literally be
  a `UInt32` in a wrapper.
- **Component** — a plain-data struct, no methods. A `Transform`, a `Velocity`,
  an `Enemy`. It answers *"what does this entity have?"* (You'll write ours in
  chapter 07.)
- **System** — a function over every entity that has a particular set of
  components. It answers *"what does having those make it do?"* (Chapters 07–11.)

By the end of the guide, the player ship will be nothing but an id with a
`Transform`, `Velocity`, `Player`, `Weapon`, `Renderable` and `Collider`
attached. A bullet will be an id with `Transform`, `Velocity`, `Renderable`,
`Projectile`, `Collider`, `Lifetime`. They share five component *types* and zero
code.

---

## Where should components live?

This is the real design decision in any ECS, and it's all about **how a system
iterates**. Three common answers:

### 1. A dictionary per type — `[Entity: Component]`

Dead simple, and genuinely fine for a small game. The cost: values are scattered
across the heap, so iterating every `Transform` chases pointers all over memory
and misses the CPU cache constantly.

### 2. Sparse set — *what we use*

Keep each component type in **two dense, gapless arrays** — the values, and the
entity that owns each slot — plus a **sparse map** from entity to slot. You get
O(1) insert/lookup/remove *and* a contiguous dense array, so a system that walks
every `Transform` streams straight through memory. It's the storage EnTT and many
production ECSs use, and it's about 60 lines.

### 3. Archetypes — the heavyweight

Group entities by their *exact* set of component types into tables, so a query
iterates fully-packed rows with zero checks. Fastest for big worlds; considerably
more machinery (moving entities between tables as components change). Bevy and
Unity DOTS live here. Overkill for a few hundred entities — but the direction
you'd grow toward (chapter 12).

---

## The sparse set, drawn

Three parallel structures. `items` and `owners` are the dense arrays (walk these
for speed); `indexOf` is the sparse map (use this for random lookup).

```
entities:  A(id0)   B(id1)   C(id2)      (A and C have a Transform; B doesn't)

indexOf:   A -> 0    C -> 1               (sparse: only present entities)

dense v     slot 0     slot 1
items:    [ Tf(A)   ,  Tf(C)   ]         <- contiguous component values
owners:   [ A       ,  C       ]         <- who owns each slot
```

The magic is **swap-remove**. Deleting A's component moves the *last* element
(C's) into slot 0 and fixes C's entry in `indexOf`, keeping the arrays gapless
with no shifting. The only thing you give up is **stable iteration order** —
after a remove, order scrambles. Systems must never rely on "the order entities
were created," and ours won't.

---

## Create `Sources/SpaceFighter/ECS/Entity.swift`

Make the directory first (`mkdir -p Sources/SpaceFighter/ECS`), then:

```swift
import Foundation

/// An entity is just an identity — a number. It owns no data and has no
/// behaviour. Everything an entity *is* (a ship, a bullet, an enemy) comes from
/// the components attached to it in the `World`, and everything it *does* comes
/// from the systems that run over those components.
///
/// We use a plain incrementing `UInt32`. Real engines fold a *generation* count
/// into the id so that a recycled slot can be told apart from the entity that
/// used to live there; we skip that here for clarity and simply never reuse an
/// id. See the end of this chapter for how generations work.
struct Entity: Hashable {
    let id: UInt32
}
```

---

## Create `Sources/SpaceFighter/ECS/ComponentStore.swift`

This is the sparse set from the diagram above:

```swift
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
```

Two access patterns, both O(1): `get(_:)` for a random lookup, and `mutate(_:_:)`
to edit in place without copying out and back. For a whole-type sweep a system
walks `owners`, which is what every system in this guide does.

---

## Create `Sources/SpaceFighter/ECS/World.swift`

The `World` owns the entities and one store per component type. The interesting
bit is storing stores of *different generic types* in a single dictionary:

```swift
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
```

`ObjectIdentifier(T.self)` is a unique key per Swift type, and
`AnyComponentStore` is the tiny protocol that lets `World` clean an entity out of
*every* store without knowing their concrete types. Gameplay code never sees the
erasure — it calls `world.store(Enemy.self)` or the sugar
`world.add(Enemy(), to: e)`.

### Destroying entities safely

A subtle bug lurks in any ECS: a system iterating a store while something
destroys an entity *in that same store* corrupts the loop. Collisions are exactly
this — a bolt hits an enemy and we want to remove both mid-sweep.

That's why `destroy(_:)` only queues an id and `flushDestroyed()` does the real
work at one safe point per frame. Because the queue can contain the same id twice
(a bolt kills an enemy the cull system also flagged), the flush guards on
`entities.contains(e)` — the second attempt is a harmless no-op. Systems get to
be naive about deletion, which is exactly what you want.

---

## Checkpoint

Temporarily **replace `main.swift`** to exercise the world. We use throwaway
local structs here — the real components arrive in chapter 07:

```swift
import Foundation

// Two throwaway component types, just to prove the storage works.
struct Position { var x: Float; var y: Float }
struct Label { var name: String }

let world = World()

let a = world.createEntity()
let b = world.createEntity()
let c = world.createEntity()

world.add(Position(x: 1, y: 1), to: a)
world.add(Position(x: 2, y: 2), to: b)
world.add(Position(x: 3, y: 3), to: c)
world.add(Label(name: "only B has a label"), to: b)

let positions = world.store(Position.self)
print("positions: \(positions.count)")
print("labels:    \(world.store(Label.self).count)")

// In-place mutation.
positions.mutate(a) { $0.x = 99 }
print("a.x = \(world.get(Position.self, a)!.x)")

// Deferred destruction: queue it, nothing happens yet...
world.destroy(b)
print("after destroy, before flush: \(positions.count)")
world.flushDestroyed()
print("after flush: \(positions.count)")
print("b's label gone: \(world.get(Label.self, b) == nil)")

// Swap-remove means order is not stable, but every survivor is still findable.
for e in positions.owners {
    let p = positions.get(e)!
    print("  entity \(e.id) at (\(p.x), \(p.y))")
}
```

```console
$ swift run
positions: 3
labels:    1
a.x = 99.0
after destroy, before flush: 3
after flush: 2
b's label gone: true
  entity 0 at (99.0, 1.0)
  entity 2 at (3.0, 3.0)
```

The two lines that matter are **`after destroy, before flush: 3`** followed by
**`after flush: 2`** — that's deferred destruction working, and it's what will
let collision code delete things mid-loop without corrupting anything. Note also
that `b`'s `Label` vanished even though we only called `destroy` on the entity:
`flushDestroyed` swept it out of *every* store.

---

## What we left out: generations

Real engines fold a **generation counter** into the entity id. When slot 42 is
freed and later reused, its generation bumps, so a stale `Entity` captured before
the reuse is detectable as dead (id matches, generation doesn't). We skip it two
ways: our ids are a monotonic counter we **never recycle**, and no system holds
an entity reference across frames — they re-query each frame. For a
session-length arcade game that's completely safe. The moment you keep long-lived
entity handles (a targeting system that remembers "the enemy I locked onto"), add
generations.

---

## Adding a component + system, end to end

This is the recipe you'll use for the rest of the guide:

1. **Add a component** (pure data) in `Components.swift`.
2. **Attach it** to whichever entities should have it: `world.add(Shield(...), to: e)`.
3. **Write a system** that runs over `world.store(Shield.self).owners`.
4. **Schedule it** — one line in `Game.update`, in the right spot in the order.

No base classes touched, no existing system edited. That decoupling is the entire
reason to build this way.

---

**Next:** geometry — the vertices the GPU will actually draw. →
[Chapter 05: Meshes & simple geometry](05-meshes-and-geometry.md)
