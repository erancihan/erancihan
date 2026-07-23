# 04 · Designing the ECS 🛠️

> **You'll leave this chapter with:** a real understanding of the three ECS
> storage strategies and why we chose the **sparse set**, plus a full reading of
> `Entity`,
> `ComponentStore` and
> `World`.

---

## The three words, precisely

- **Entity** — an identity with no data and no behaviour. Ours is literally a
  `UInt32` in a wrapper:

  ```swift
  struct Entity: Hashable { let id: UInt32 }
  ```

- **Component** — a plain-data struct, no methods. A `Transform`, a `Velocity`,
  an `Enemy`. It answers *"what does this entity have?"* All of ours live in
  `Components.swift`.

- **System** — a function over every entity that has a particular set of
  components. It answers *"what does having those make it do?"* Ours are the
  files in `Systems/`.

The player ship is nothing but an id with a `Transform`, `Velocity`, `Player`,
`Weapon`, `Renderable` and `Collider` attached (`Game.spawnPlayer`). A bullet is
an id with `Transform`, `Velocity`, `Renderable`, `Projectile`, `Collider`,
`Lifetime`. They share five component *types* and zero code.

---

## Where should components live?

This is the real design decision in any ECS, and it's all about **how a system
iterates**. Three common answers:

### 1. A dictionary per type — `[Entity: Component]`

Dead simple, and genuinely fine for a small game. The cost: the values are
scattered across the heap, so iterating every `Transform` chases pointers all
over memory and misses the CPU cache constantly. Lookups are hashed, not direct.

### 2. Sparse set — *what we use*

Keep each component type in **two dense, gapless arrays** — the values, and the
entity that owns each slot — plus a **sparse map** from entity to slot. You get
O(1) insert/lookup/remove *and* the dense array is contiguous, so a system that
walks every `Transform` streams straight through memory. It's the storage EnTT
and many production ECSs use, and it's not much code.

### 3. Archetypes — the heavyweight

Group entities by their *exact* set of component types ("all entities that have
Transform+Velocity+Enemy") into tables, so a query iterates fully-packed rows
with zero checks. Fastest for big worlds and complex queries; considerably more
machinery (moving entities between tables as components are added/removed). Bevy
and Unity DOTS live here. Overkill for a few hundred entities — but the direction
you'd grow toward. Chapter 12 revisits this.

We pick the sparse set: it teaches the data-oriented idea honestly, iterates
fast, and fits in ~60 lines.

---

## The sparse set, drawn

Three parallel structures. `items` and `owners` are the dense arrays (walk these
for speed); `indexOf` is the sparse map (use this for random lookup).

```
entities:  A(id0)   B(id1)   C(id2)      (A and C have a Transform; B doesn't)

indexOf:   A → 0     C → 1                (sparse: only present entities)

dense ↓     slot 0     slot 1
items:    [ Tf(A)   ,  Tf(C)   ]         ← contiguous component values
owners:   [ A       ,  C       ]         ← who owns each slot
```

The magic is **swap-remove**. Deleting A's component moves the *last* element
(C's) into slot 0 and fixes C's entry in `indexOf`, keeping the arrays gapless
with no shifting:

```swift
func removeIfPresent(_ entity: Entity) {
    guard let i = indexOf[entity] else { return }
    let last = items.count - 1
    if i != last {
        items[i]  = items[last]          // move last value into the hole
        owners[i] = owners[last]
        indexOf[owners[i]] = i           // repoint the moved entity
    }
    items.removeLast(); owners.removeLast()
    indexOf[entity] = nil
}
```

The only thing you give up is **stable iteration order** — after a remove, order
scrambles. Systems must never rely on "the order entities were created," and ours
don't.

### Reading and mutating

Two access patterns, both O(1):

```swift
store.get(entity)                     // -> T?    random lookup via the sparse map
store.mutate(entity) { $0.health -= 1 }   // in-place edit, no copy out-and-back
```

`mutate` is the workhorse — systems edit components in place rather than reading
a copy, changing it, and writing it back. And for a whole-type sweep, a system
just walks `owners`:

```swift
for entity in velocities.owners {                 // MovementSystem
    guard let v = velocities.get(entity) else { continue }
    transforms.mutate(entity) { $0.position += v.linear * dt }
}
```

---

## The `World`: one place that owns everything

`World` holds the entities and one
`ComponentStore` per component type. The interesting bit is storing stores of
*different generic types* in a single dictionary. We key them by the component's
metatype and erase to a protocol:

```swift
private var stores: [ObjectIdentifier: AnyComponentStore] = [:]
private(set) var entities = Set<Entity>()
private var nextId: UInt32 = 0

func createEntity() -> Entity {                // ids are monotonic, never recycled
    let e = Entity(id: nextId); nextId += 1
    entities.insert(e)
    return e
}

func store<T>(_ type: T.Type = T.self) -> ComponentStore<T> {
    let key = ObjectIdentifier(T.self)
    if let existing = stores[key] as? ComponentStore<T> { return existing }
    let created = ComponentStore<T>()          // first use of this type
    stores[key] = created
    return created
}
```

`ObjectIdentifier(T.self)` is a unique key per Swift type, and `AnyComponentStore`
is a tiny protocol (`removeIfPresent`) that lets `World` clean an entity out of
*every* store without knowing their concrete types. Gameplay code never sees the
erasure — it just calls `world.store(Enemy.self)` or the sugar
`world.add(Enemy(), to: e)`.

---

## Destroying entities safely

A subtle bug lurks in any ECS: a system iterating a store while something
destroys an entity *in that same store* corrupts the loop. Collisions are exactly
this — a bolt hits an enemy, and we want to remove both mid-sweep.

The fix is **deferred destruction**. `world.destroy(e)` doesn't delete anything;
it queues the id. After *all* systems have run for the frame,
`Game.update` calls `world.flushDestroyed()` once, which does the actual removal:

```swift
func destroy(_ entity: Entity) {           // safe to call mid-iteration
    guard entities.contains(entity) else { return }
    pendingDestroy.append(entity)
}

func flushDestroyed() {                     // called once, at a safe point
    for e in pendingDestroy where entities.contains(e) {
        for store in stores.values { store.removeIfPresent(e) }
        entities.remove(e)
    }
    pendingDestroy.removeAll(keepingCapacity: true)
}
```

Because the queue can contain the same id twice (a bolt kills an enemy the cull
system also flagged), the flush guards on `entities.contains(e)` — the second
attempt is a harmless no-op. Systems get to be naive about deletion, which is
exactly what you want.

---

## What we left out: generations

Real engines fold a **generation counter** into the entity id. When slot 42 is
freed and later reused, its generation bumps, so a stale `Entity` captured before
the reuse can be detected as dead (`id matches, generation doesn't`). We skip it
two ways: our ids are a monotonic counter that we **never recycle**, and no
system holds an entity reference across frames — they re-query each frame. For a
session-length arcade game that's completely safe. The moment you keep long-lived
entity handles (a targeting system that remembers "the enemy I locked onto"), add
generations. Chapter 12 shows the shape.

---

## Adding a component + system, end to end

This is the payoff — the full recipe for new behaviour, which you'll use in the
later chapters:

1. **Add a component** (pure data) in `Components.swift`:
   ```swift
   struct Shield { var strength: Float }
   ```
2. **Attach it** to whichever entities should have it:
   `world.add(Shield(strength: 3), to: enemy)`.
3. **Write a system** that runs over `world.store(Shield.self).owners`.
4. **Schedule it** — one line in `Game.update`, in the right spot in the order.

No base classes touched, no existing system edited. That decoupling — data in
components, behaviour in systems, wired in one schedule — is the entire reason to
build this way.

---

**Next:** the other half of the seam — turning surviving entities into pixels. →
[Chapter 05: The render pipeline](05-the-render-pipeline.md)
