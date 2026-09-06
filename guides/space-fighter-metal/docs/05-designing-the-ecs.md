# 05 · Designing the ECS 🛠️

> **You'll leave this chapter with:** the engine core — entities, a cache-friendly
> component store, and a world that can safely delete things mid-frame. Plus a
> real understanding of why the storage looks the way it does.
>
> **Files created:** `Sources/SpaceFighter/ECS/Entity.swift`,
> `ECS/ComponentStore.swift`, `ECS/World.swift`

---

## The three words, precisely

- **Entity** — an identity with no data and no behaviour. Ours is a `UInt32`.
- **Component** — a plain-data struct, no methods. A `Transform`, a `Velocity`,
  an `Enemy`. It answers *"what does this entity have?"* (Chapter 09.)
- **System** — a function over every entity that has a particular set of
  components. It answers *"what does having those make it do?"* (Chapters 09–13.)

By chapter 13 the player ship will be an id holding a `Transform`, `Velocity`,
`Player`, `Weapon`, `Renderable` and `Collider`. A bullet will be an id holding
`Transform`, `Velocity`, `Renderable`, `Projectile`, `Collider`, `Lifetime`. They
share five component *types* and zero code.

Start with the easy one.

**`Sources/SpaceFighter/ECS/Entity.swift`** — new file:

```swift
import Foundation

/// An identity, nothing more. What an entity *is* comes from its components.
struct Entity: Hashable {
    let id: UInt32
}
```

That's genuinely the whole type. `Hashable` because we're about to use entities
as dictionary keys. We never recycle ids — see the note at the end of the chapter
for what real engines do instead.

---

## Where should components live?

This is the real design decision in any ECS, and it's all about **how a system
iterates**. Three common answers:

**A dictionary per type — `[Entity: Component]`.** Dead simple, genuinely fine
for a small game. The cost: values are scattered across the heap, so iterating
every `Transform` chases pointers all over memory and misses the CPU cache
constantly.

**Archetypes.** Group entities by their *exact* set of component types into
tables, so a query iterates fully-packed rows with zero checks. Fastest for big
worlds; considerably more machinery, since adding a component moves an entity
between tables. Bevy and Unity DOTS live here. Overkill for a few hundred
entities — but the direction you'd grow toward (chapter 15).

**Sparse set** — what we'll build. Two dense, gapless arrays hold the live data
back to back, plus a sparse map from entity to slot:

```
entities:  A(id0)   B(id1)   C(id2)      (A and C have a Transform; B doesn't)

indexOf:   A -> 0    C -> 1               (sparse: only present entities)

dense v     slot 0     slot 1
items:    [ Tf(A)   ,  Tf(C)   ]         <- contiguous component values
owners:   [ A       ,  C       ]         <- who owns each slot
```

O(1) insert, lookup and remove, *and* the dense array is contiguous so a system
walking every `Transform` streams straight through memory. It's the storage EnTT
and many production ECSs use, and it's about sixty lines.

### The storage

**`Sources/SpaceFighter/ECS/ComponentStore.swift`** — new file:

```swift
import Foundation

/// Lets `World` hold stores of many component types in one dictionary and still
/// clean a dead entity out of all of them.
protocol AnyComponentStore: AnyObject {
    func removeIfPresent(_ entity: Entity)
}

final class ComponentStore<T>: AnyComponentStore {
    private(set) var items: [T] = []
    private(set) var owners: [Entity] = []
    private var indexOf: [Entity: Int] = [:]

    var count: Int { items.count }
}
```

Three fields matching the diagram: `items` and `owners` are the dense pair, and
`indexOf` is the sparse map. `owners[i]` always owns `items[i]` — every operation
below has to preserve that.

`owners` is the field people ask about, since `indexOf` already relates entities
to slots. It exists because the two directions are needed in different places and
at very different frequencies. Systems iterate: "give me every entity that has a
`Velocity`," which is a walk down `owners` — cheap, contiguous, and in the same
order as the values themselves. Lookups go the other way: "does *this* entity
have one," which is `indexOf`. Keeping both means neither operation has to search,
and the cost is one extra array write per insert. That trade is the whole reason
the pattern is called a sparse *set*.

This file will not compile yet. `AnyComponentStore` demands a `removeIfPresent`
we haven't written; it's the last method in the file and the interesting one, so
we build up to it.

Insertion first. It doubles as an overwrite, which is what makes
`world.add(...)` idempotent:

**`ComponentStore.swift`**, in `ComponentStore` — after `count`:

```diff
     var count: Int { items.count }
+
+    func set(_ entity: Entity, _ value: T) {
+        if let i = indexOf[entity] {
+            items[i] = value
+        } else {
+            indexOf[entity] = items.count
+            items.append(value)
+            owners.append(entity)
+        }
+    }
 }
```

Note `indexOf[entity] = items.count` runs *before* the append — the new element's
index is the old count. Off-by-one here corrupts every later lookup silently.

Reading is a hop through the sparse map:

**`ComponentStore.swift`**, in `ComponentStore` — after `set`:

```diff
             owners.append(entity)
         }
     }
+
+    func get(_ entity: Entity) -> T? {
+        guard let i = indexOf[entity] else { return nil }
+        return items[i]
+    }
+
+    func has(_ entity: Entity) -> Bool {
+        indexOf[entity] != nil
+    }
 }
```

`get` returns a *copy* — components are structs. That's fine for reading, but a
system that wants to nudge a position shouldn't have to copy the whole
`Transform` out, change it, and write it back. So we give it in-place access:

**`ComponentStore.swift`**, in `ComponentStore` — after `has`:

```diff
     func has(_ entity: Entity) -> Bool {
         indexOf[entity] != nil
     }
+
+    func mutate(_ entity: Entity, _ body: (inout T) -> Void) {
+        guard let i = indexOf[entity] else { return }
+        body(&items[i])
+    }
 }
```

This is the workhorse. Nearly every system you write will call it:
`transforms.mutate(e) { $0.position += v * dt }`.

---

## Removing without leaving a hole

The obvious implementation is to delete in place. Write it, because it's
instructive to see it fail:

**`ComponentStore.swift`**, in `ComponentStore` — after `mutate`:

```diff
     func mutate(_ entity: Entity, _ body: (inout T) -> Void) {
         guard let i = indexOf[entity] else { return }
         body(&items[i])
     }
+
+    func removeIfPresent(_ entity: Entity) {
+        guard let i = indexOf[entity] else { return }
+        items.remove(at: i)
+        owners.remove(at: i)
+        indexOf[entity] = nil
+    }
 }
```

The file compiles now, and the counts it reports are correct. It's still broken,
in two ways. `remove(at:)` shifts every later element down one slot — O(n), which
we said we wouldn't pay. Worse, every entity whose element moved now has a
**stale index** in `indexOf`. Remove slot 0 of a hundred-element store and
ninety-nine entities silently start returning the wrong component.

The fix comes from noticing what we *don't* need. Systems never rely on iteration
order — nothing in this game cares which enemy is examined first. So we don't
have to preserve order at all. Instead of shifting everything down, move the
**last** element into the hole and shrink by one:

**`ComponentStore.swift`**, in `removeIfPresent` — replace the two `remove(at:)`
lines:

```diff
     func removeIfPresent(_ entity: Entity) {
         guard let i = indexOf[entity] else { return }
-        items.remove(at: i)
-        owners.remove(at: i)
+        let last = items.count - 1
+        if i != last {
+            items[i] = items[last]
+            owners[i] = owners[last]
+        }
+        items.removeLast()
+        owners.removeLast()
         indexOf[entity] = nil
     }
```

O(1), and the dense arrays stay gapless. Run this chapter's checkpoint and the
counts are still right — but look up the entity that got *moved* and you'll get
garbage, because `indexOf` still points it at the slot it used to occupy.

One line fixes it. See if you can place it before reading on: we moved
`owners[last]` into slot `i`, so something needs to be told about it.

**`ComponentStore.swift`**, in `removeIfPresent` — inside the `if`, after the
`owners` assignment:

```diff
         if i != last {
             items[i] = items[last]
             owners[i] = owners[last]
+            indexOf[owners[i]] = i
         }
```

`owners[i]` is the entity we just relocated, so this repoints it at its new slot.
That is the entire sparse-set trick, and the one line everyone forgets.

The `if i != last` guard matters too, and the challenge at the end of the chapter
makes you work out why.

---

## The World

`World` owns the entities and one store per component type. The interesting part
is holding stores of *different generic types* in one dictionary.

**`Sources/SpaceFighter/ECS/World.swift`** — new file:

```swift
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
}
```

`stores` is keyed by `ObjectIdentifier` — a unique, hashable token for a Swift
type — and typed as the protocol, because `[ObjectIdentifier: ComponentStore<T>]`
can't exist for varying `T`. `pendingDestroy` is the subject of the next section.

### Deleting safely

Here's a bug that lurks in every ECS. Collision detection walks the store of
enemies; when a bolt hits one, it wants to delete that enemy — *while the loop is
running*. Mutating a collection you're iterating is undefined at best.

The fix is to make deletion a two-phase operation. `destroy` merely writes the id
down:

**`World.swift`**, in `World` — after `createEntity`:

```diff
         entities.insert(e)
         return e
     }
+
+    /// Safe to call mid-iteration: this only queues the id.
+    func destroy(_ entity: Entity) {
+        guard entities.contains(entity) else { return }
+        pendingDestroy.append(entity)
+    }
+
+    func isAlive(_ entity: Entity) -> Bool {
+        entities.contains(entity) && !pendingDestroy.contains(entity)
+    }
 }
```

and the real work happens once, at a point in the frame we choose — after every
system has run:

**`World.swift`**, in `World` — after `isAlive`:

```diff
     func isAlive(_ entity: Entity) -> Bool {
         entities.contains(entity) && !pendingDestroy.contains(entity)
     }
+
+    func flushDestroyed() {
+        guard !pendingDestroy.isEmpty else { return }
+        for e in pendingDestroy where entities.contains(e) {
+            for store in stores.values {
+                store.removeIfPresent(e)
+            }
+            entities.remove(e)
+        }
+        pendingDestroy.removeAll(keepingCapacity: true)
+    }
 }
```

Two details earn their keep. The inner loop is why `AnyComponentStore` exists —
it lets us call `removeIfPresent` on every store without knowing any of their
concrete types, so one `destroy` cleans an entity out of all of them. And the
`where entities.contains(e)` guard makes double-destroy harmless: a bolt can kill
an enemy that the culling pass also flagged, the id lands in the queue twice, and
the second pass is a no-op instead of a crash.

Systems get to be naive about deletion. That's the whole point.

### Typed access through an untyped dictionary

**`World.swift`**, in `World` — after `flushDestroyed`:

```diff
         pendingDestroy.removeAll(keepingCapacity: true)
     }
+
+    func store<T>(_ type: T.Type = T.self) -> ComponentStore<T> {
+        let key = ObjectIdentifier(T.self)
+        if let existing = stores[key] as? ComponentStore<T> {
+            return existing
+        }
+        let created = ComponentStore<T>()
+        stores[key] = created
+        return created
+    }
 }
```

This is the load-bearing generic in the project. Storage is type-erased, but the
*interface* isn't: `world.store(Enemy.self)` hands back a real
`ComponentStore<Enemy>`, and gameplay code never sees a cast. Stores are created
lazily on first use, so there's no registration step to forget when you add a
component type.

Two conveniences on top, and the core is done:

**`World.swift`**, in `World` — after `store`:

```diff
         let created = ComponentStore<T>()
         stores[key] = created
         return created
     }
+
+    @discardableResult
+    func add<T>(_ component: T, to entity: Entity) -> Entity {
+        store(T.self).set(entity, component)
+        return entity
+    }
+
+    func get<T>(_ type: T.Type, _ entity: Entity) -> T? {
+        store(T.self).get(entity)
+    }
 }
```

---

## Checkpoint

**`main.swift`** — replace the whole file (throwaway; chapter 08 writes the real
one):

```swift
import Foundation

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
print("positions: \(positions.count), labels: \(world.store(Label.self).count)")

positions.mutate(a) { $0.x = 99 }
print("a.x = \(world.get(Position.self, a)!.x)")

world.destroy(b)
print("after destroy, before flush: \(positions.count)")
world.flushDestroyed()
print("after flush: \(positions.count)")
print("b's label gone: \(world.get(Label.self, b) == nil)")

for e in positions.owners {
    let p = positions.get(e)!
    print("  entity \(e.id) at (\(p.x), \(p.y))")
}
```

```console
$ swift run
positions: 3, labels: 1
a.x = 99.0
after destroy, before flush: 3
after flush: 2
b's label gone: true
  entity 0 at (99.0, 1.0)
  entity 2 at (3.0, 3.0)
```

Four things just proved themselves. `a.x = 99.0` is in-place mutation. The
**`3` then `2`** pair is deferred destruction — the queue really does hold the
delete until you flush. `b's label gone: true` shows one `destroy` swept the
entity out of *every* store, not just the one you were looking at. And the last
two lines are swap-remove working: entity 2's component was relocated into
entity 1's old slot and is still findable at the right position.

**If the last line prints garbage coordinates**, you're missing
`indexOf[owners[i]] = i`. **If `after destroy, before flush` prints 2**, your
`destroy` is deleting immediately instead of queueing.

---

## Challenge

Delete the `if i != last` guard from `removeIfPresent` so the swap always runs,
then re-run the checkpoint. It still passes. Now work out the input that breaks
it — there is one, and it involves removing the element that is *already* last.
Reason it through on paper first, then write a case that demonstrates it.

---

## What we left out: generations

Real engines fold a **generation counter** into the entity id. When slot 42 is
freed and later reused, its generation bumps, so a stale `Entity` captured before
the reuse is detectable as dead — id matches, generation doesn't. We skip it two
ways: our ids are a monotonic counter we never recycle, and no system holds an
entity reference across frames; they re-query each frame. For a session-length
arcade game that is completely safe. Add generations the moment you keep a
long-lived handle, like a targeting system that remembers the enemy it locked on
to.

---

## Adding a component + system, end to end

The recipe you'll use for the rest of the guide:

1. **Add a component** (pure data) in `Components/`.
2. **Attach it**: `world.add(Shield(strength: 3), to: enemy)`.
3. **Write a system** that runs over `world.store(Shield.self).owners`.
4. **Schedule it** — one line in `Game.update`, in the right spot in the order.

No base classes touched, no existing system edited.

---

**Next:** geometry — the vertices the GPU will actually draw. →
[Chapter 06: Meshes & simple geometry](06-meshes-and-geometry.md)
