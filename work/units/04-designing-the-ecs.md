# 04 · Designing the ECS 🛠️

> **You'll leave this chapter with:** the three ECS storage strategies and why we
> chose the **sparse set**, a working `Entity`, `ComponentStore` and `World`, and
> every component the game uses. You will also write the swap-remove bug that
> everyone writes, watch it corrupt a lookup, and fix it.
>
> **Files created:** `src/ecs/Entity.hpp`, `src/ecs/ComponentStore.hpp`,
> `src/ecs/World.hpp`, `src/Components.hpp`, `scratch/ecs_check.cpp`.

This chapter is the one place the Vulkan guide and the
[Metal guide](../../space-fighter-metal/) are the *same design* — an ECS doesn't
know or care what draws it.

---

## The three words, precisely

- **Entity** — an identity with no data and no behaviour.
- **Component** — a plain-data struct, no methods. A `Transform`, a `Velocity`, an
  `Enemy`. It answers *"what does this entity have?"*
- **System** — a function over every entity that has a particular set of
  components. It answers *"what does having those make it do?"*

The player ship is nothing but an id with a `Transform`, `Velocity`, `Player`,
`Weapon`, `Renderable` and `Collider` attached. A bolt is an id with `Transform`,
`Velocity`, `Renderable`, `Projectile`, `Collider`, `Lifetime`. They share five
component *types* and zero lines of code.

The entity itself is exactly as thin as that description suggests:

**`src/ecs/Entity.hpp`** — new file:

```cpp
#pragma once

#include <cstdint>

struct Entity {
    uint32_t id = 0;
};

inline bool operator==(Entity a, Entity b) { return a.id == b.id; }
inline bool operator!=(Entity a, Entity b) { return a.id != b.id; }
```

A `struct` wrapping one integer rather than a bare `uint32_t` typedef, because we
want the compiler to reject `world.get<Transform>(meshIndex)` when someone passes
the wrong number. It costs nothing at runtime.

---

## Where should components live?

This is the real design decision in any ECS, and it is all about **how a system
iterates**. Three common answers:

### 1. A map per type — `unordered_map<Entity, Component>`

Dead simple, and genuinely fine for a small game. The cost: values scatter across
the heap, so iterating every `Transform` chases pointers all over memory and misses
the cache constantly.

### 2. Sparse set — *what we use*

Keep each component type in **two dense, gapless arrays** — the values, and the
entity that owns each slot — plus a **sparse map** from entity to slot. O(1)
insert, lookup and remove, *and* the dense array is contiguous, so a system that
walks every `Transform` streams straight through memory. It's what EnTT and many
production ECSs use, and it's about sixty lines.

### 3. Archetypes — the heavyweight

Group entities by their *exact* set of component types into tables, so a query
iterates fully-packed rows with zero checks. Fastest for big worlds and complex
queries; considerably more machinery, since adding a component moves an entity
between tables. Bevy and Unity DOTS live here. Overkill for a few hundred entities,
but the direction you'd grow toward.

We pick the sparse set. Drawn out, it is three parallel structures — `items` and
`owners` are the dense arrays, `indexOf` is the sparse map:

```
entities:  A(id0)   B(id1)   C(id2)      (A and C have a Transform; B doesn't)

indexOf:   A → 0     C → 1                (sparse: only present entities)

dense ↓     slot 0     slot 1
items:    [ Tf(A)   ,  Tf(C)   ]         ← contiguous component values
owners:   [ A       ,  C       ]         ← who owns each slot
```

---

## Building the store

Every store needs to be reachable from `World` without `World` knowing the
component type, so they share a tiny base:

**`src/ecs/ComponentStore.hpp`** — new file:

```cpp
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
```

One virtual method is the entire interface. `World` needs exactly one thing it
can't do generically — "remove this entity from whatever you are" — and everything
else goes through the typed API below.

**`ComponentStore.hpp`** — after `IComponentStore`:

```diff
     virtual void removeIfPresent(Entity e) = 0;
 };
+
+template <typename T>
+class ComponentStore : public IComponentStore {
+public:
+
+private:
+    std::vector<T> items;
+    std::vector<Entity> owners;
+    std::unordered_map<uint32_t, size_t> indexOf;
+};
```

There are the three structures from the diagram. `items` and `owners` are the
dense arrays that stay the same length as each other; `indexOf` is the sparse map
from entity id to slot. Everything below is bookkeeping to keep those three
consistent.

**`ComponentStore.hpp`**, in `class ComponentStore` — after `public:`:

```diff
 class ComponentStore : public IComponentStore {
 public:
+    void set(Entity e, const T& value) {
+        auto it = indexOf.find(e.id);
+        if (it != indexOf.end()) {
+            items[it->second] = value;
+            return;
+        }
+        indexOf[e.id] = items.size();
+        items.push_back(value);
+        owners.push_back(e);
+    }
 
 private:
```

`set` is insert-or-overwrite. The early return matters: without it, calling
`set` twice on the same entity would append a second copy and leave `indexOf`
pointing at the first — one entity, two slots, and a remove that only removes half
of it.

**`ComponentStore.hpp`**, in `class ComponentStore` — after `set`:

```diff
         items.push_back(value);
         owners.push_back(e);
     }
+
+    T* get(Entity e) {
+        auto it = indexOf.find(e.id);
+        return it == indexOf.end() ? nullptr : &items[it->second];
+    }
+
+    const T* get(Entity e) const {
+        auto it = indexOf.find(e.id);
+        return it == indexOf.end() ? nullptr : &items[it->second];
+    }
+
+    bool has(Entity e) const { return indexOf.find(e.id) != indexOf.end(); }
 
 private:
```

`get` returns a **pointer into the dense array**, so systems edit components in
place rather than reading a copy, changing it and writing it back. That's the
whole ergonomic argument for this design in C++, and it comes with a hazard we'll
come back to at the end of the chapter.

---

## Swap-remove, and the line everybody forgets

Removing from the middle of a dense array without leaving a hole means moving the
*last* element into the gap. Write it:

**`ComponentStore.hpp`**, in `class ComponentStore` — after `has`:

```diff
     bool has(Entity e) const { return indexOf.find(e.id) != indexOf.end(); }
+
+    void removeIfPresent(Entity e) override {
+        auto it = indexOf.find(e.id);
+        if (it == indexOf.end()) return;
+        size_t i = it->second;
+        size_t last = items.size() - 1;
+        if (i != last) {
+            items[i] = std::move(items[last]);
+            owners[i] = owners[last];
+        }
+        items.pop_back();
+        owners.pop_back();
+        indexOf.erase(it);
+    }
 
 private:
```

Read it and it looks complete: find the slot, move the last element down, shrink
both arrays, drop the map entry. It compiles. It is wrong, and the way it is wrong
is worth seeing rather than being told.

Finish the store first so we have something to test:

**`ComponentStore.hpp`**, in `class ComponentStore` — after `removeIfPresent`:

```diff
         indexOf.erase(it);
     }
+
+    const std::vector<Entity>& entities() const { return owners; }
+    size_t size() const { return items.size(); }
 
 private:
```

`entities()` handing back `owners` is what a system walks. It's the dense array, so
walking it is a straight run through memory.

### The harness

**`scratch/ecs_check.cpp`** — new file (throwaway):

```cpp
#include "ecs/ComponentStore.hpp"

#include <cstdio>

struct Health { int hp; };

int main() {
    ComponentStore<Health> store;
    Entity a{0}, b{1}, c{2}, d{3};
    store.set(a, {10});
    store.set(b, {20});
    store.set(c, {30});

    store.removeIfPresent(a);   // c's value is moved down into slot 0
    store.set(d, {99});         // d claims the slot c used to occupy

    std::printf("size : %zu  (want 3)\n", store.size());
    std::printf("b    : %d  (want 20)\n", store.get(b) ? store.get(b)->hp : -1);
    std::printf("c    : %d  (want 30)\n", store.get(c) ? store.get(c)->hp : -1);
    std::printf("d    : %d  (want 99)\n", store.get(d) ? store.get(d)->hp : -1);
    return 0;
}
```

Note the shape of that test: it removes an entity, and then does something
*unrelated* afterwards. That second step is not padding.

```console
$ g++ -std=c++17 -Isrc -o /tmp/ecs_check scratch/ecs_check.cpp && /tmp/ecs_check
size : 3  (want 3)
b    : 20  (want 20)
c    : 99  (want 30)
d    : 99  (want 99)
```

**`c` reads as 99 — `d`'s value.** Two entities now share one slot. Nothing
crashed and nothing warned.

Here is what happened. `c` lived in slot 2. Removing `a` moved the last element —
`c`'s — down into slot 0 and shrank the arrays to length 2. But `indexOf` still
says `c → 2`. **Moving the value is only half of a swap-remove**; the map has to
be told where the value went.

The really unpleasant part is the timing. Immediately after the remove, reading
`c` still gives you 30 — the stale index points one past the end, and the old copy
is still sitting in the vector's spare capacity, so it looks fine. The corruption
only becomes *visible* when something else claims slot 2, which in a real game is
the next entity anyone spawns. The remove and the symptom are separated by
arbitrary time and unrelated code, which is why this bug is so hard to trace
backwards and so worth having seen once.

The fix is one line:

**`ComponentStore.hpp`**, in `removeIfPresent` — inside the `if (i != last)` block:

```diff
         if (i != last) {
             items[i] = std::move(items[last]);
             owners[i] = owners[last];
+            indexOf[owners[i].id] = i;
         }
```

Note it reads `owners[i]`, not `owners[last]` — by this point the move has already
happened, so `owners[i]` *is* the entity we relocated. Writing `owners[last]` would
work today and break the moment someone reorders the two lines above it.

```console
$ g++ -std=c++17 -Isrc -o /tmp/ecs_check scratch/ecs_check.cpp && /tmp/ecs_check
size : 3  (want 3)
b    : 20  (want 20)
c    : 30  (want 30)
d    : 99  (want 99)
```

Add the comment that now has something to explain:

**`ComponentStore.hpp`** — above `removeIfPresent`:

```diff
     bool has(Entity e) const { return indexOf.find(e.id) != indexOf.end(); }
 
+    /// Swap-remove: move the last element into the hole so the dense arrays
+    /// stay gapless without shifting.
     void removeIfPresent(Entity e) override {
```

The one thing you give up is **stable iteration order** — after a remove, order
scrambles. Systems must never rely on "the order entities were created", and ours
don't.

---

## The `World`

`World` holds the entities and one `ComponentStore` per component type. The
interesting bit is keeping stores of *different template types* in a single
container.

**`src/ecs/World.hpp`** — new file:

```cpp
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
};
```

`<typeindex>` is the header that makes the whole thing possible, and
`<unordered_set>` tracks which ids are currently alive. Now the two operations
every other method is built on:

**`World.hpp`**, in `class World` — after `public:`:

```diff
 class World {
 public:
+    Entity create() {
+        Entity e{nextId++};
+        living.insert(e.id);
+        return e;
+    }
+
+    bool isAlive(Entity e) const { return living.count(e.id) != 0; }
 };
```

Ids come from a counter that only ever goes up, and `living` is the record of which
ones still exist. Nothing recycles, which is a decision we'll justify shortly.

**`World.hpp`**, in `class World` — after `isAlive`, before the closing brace:

```diff
     bool isAlive(Entity e) const { return living.count(e.id) != 0; }
+
+private:
+    std::unordered_map<std::type_index, std::unique_ptr<IComponentStore>> stores;
+    uint32_t nextId = 0;
+    std::unordered_set<uint32_t> living;
+    std::vector<Entity> pendingDestroy;
 };
```

`std::type_index(typeid(T))` is a unique, hashable key per C++ type — that's what
lets one map hold a `ComponentStore<Transform>` next to a `ComponentStore<Enemy>`.
`IComponentStore` is the erasure boundary from the top of the chapter, and
`unique_ptr` is what makes the base's virtual destructor load-bearing.

The accessor that creates a store on first use:

**`World.hpp`**, in `class World` — after `isAlive`:

```diff
     bool isAlive(Entity e) const { return living.count(e.id) != 0; }
+
+    template <typename T>
+    ComponentStore<T>& store() {
+        auto key = std::type_index(typeid(T));
+        auto it = stores.find(key);
+        if (it == stores.end())
+            it = stores.emplace(key, std::make_unique<ComponentStore<T>>()).first;
+        return *static_cast<ComponentStore<T>*>(it->second.get());
+    }
 
 private:
```

Lazily creating on first use means there is no registration step anywhere — adding
a new component type to the game is *just* writing the struct. The
`static_cast` is safe because the key is derived from `T` itself: the only thing
that can be at `typeid(T)` is a `ComponentStore<T>`.

Three one-line conveniences so gameplay code never sees the erasure:

**`World.hpp`**, in `class World` — after `store`:

```diff
         return *static_cast<ComponentStore<T>*>(it->second.get());
     }
+
+    template <typename T>
+    void add(Entity e, const T& c) { store<T>().set(e, c); }
+
+    template <typename T>
+    T* get(Entity e) { return store<T>().get(e); }
+
+    template <typename T>
+    bool has(Entity e) { return store<T>().has(e); }
 
 private:
```

---

## Destroying entities safely

A subtle bug lurks in any ECS: a system iterating a store while something destroys
an entity *in that same store* corrupts the loop — and in C++, can invalidate the
very vector being walked. Collisions are exactly this: a bolt hits an enemy and we
want to remove both, mid-sweep.

The fix is **deferred destruction**. `destroy` doesn't delete anything; it queues:

**`World.hpp`**, in `class World` — after `isAlive`:

```diff
     bool isAlive(Entity e) const { return living.count(e.id) != 0; }
+
+    /// Safe to call mid-iteration: this only queues the id.
+    void destroy(Entity e) {
+        if (living.count(e.id)) pendingDestroy.push_back(e);
+    }
 
     template <typename T>
```

And a single point where the deletion actually happens, called once per frame after
every system has run:

**`World.hpp`**, in `class World` — after `destroy`:

```diff
         if (living.count(e.id)) pendingDestroy.push_back(e);
     }
+
+    /// Called once per frame, after every system has run.
+    void flushDestroyed() {
+        for (Entity e : pendingDestroy) {
+            if (!living.count(e.id)) continue;
+            for (auto& entry : stores) entry.second->removeIfPresent(e);
+            living.erase(e.id);
+        }
+        pendingDestroy.clear();
+    }
 
     template <typename T>
```

Two guards, both load-bearing. `destroy` checks `living` so destroying an
already-dead entity never queues anything. `flushDestroyed` checks it *again*,
because the queue can legitimately contain the same id twice — a bolt kills an
enemy that the cull system also flagged this frame — and the second pass must be a
harmless no-op rather than a double-remove. Systems get to be naive about deletion,
which is exactly what you want.

### What we left out: generations

Real engines fold a **generation counter** into the entity id. When slot 42 is
freed and later reused, its generation bumps, so a stale `Entity` captured before
the reuse can be detected as dead. We skip it two ways: our ids are a monotonic
counter (`nextId++`) that we **never recycle**, and no system holds an entity
reference across frames. For a session-length arcade game that is completely safe.
The moment you keep long-lived handles — a targeting system that remembers "the
enemy I locked onto" — add generations.

---

## Every component in the game

Components are pure data. Here they all are; you have met most of them already in
the descriptions above.

**`src/Components.hpp`** — new file:

```cpp
#pragma once

#include "Math.hpp"
#include "render/RenderTypes.hpp"

#include <cstdint>

struct Transform {
    glm::vec3 position{0.0f};
    glm::quat rotation{1.0f, 0.0f, 0.0f, 0.0f};
    glm::vec3 scale{1.0f};

    glm::mat4 matrix() const { return Math::trs(position, rotation, scale); }
};
```

`Transform` is the one component with a method, and `matrix()` is a pure function
of its own fields — it computes, it doesn't decide anything. `glm::quat{1,0,0,0}`
is the identity rotation, and GLM's constructor takes `w` **first** while its
storage is `x,y,z,w`; get that backwards and every entity starts life rotated 180°.

**`Components.hpp`** — after `Transform`:

```diff
     glm::mat4 matrix() const { return Math::trs(position, rotation, scale); }
 };
+
+struct Velocity {
+    glm::vec3 linear{0.0f};
+};
+
+struct Renderable {
+    MeshID mesh;
+    glm::vec4 color;
+};
```

`Renderable` is the only component that knows anything about rendering, and even
then only a `MeshID` and a colour — no Vulkan type reaches this header. That is the
seam from chapter 03 doing its job.

**`Components.hpp`** — after `Renderable`:

```diff
 struct Renderable {
     MeshID mesh;
     glm::vec4 color;
 };
+
+struct Player {
+    float throttle = 0.0f;
+    bool boosting = false;
+};
+
+struct Weapon {
+    float cooldown = 0.0f;
+    float fireInterval = 0.14f;
+    float muzzleSpeed = 140.0f;
+};
```

`Player` is nearly a tag — its presence is what makes `FlightControlSystem` fly
something. `throttle` is deliberately wired through and unused; chapter 14 makes it
your first extension.

**`Components.hpp`** — after `Weapon`:

```diff
 struct Weapon {
     float cooldown = 0.0f;
     float fireInterval = 0.14f;
     float muzzleSpeed = 140.0f;
 };
+
+struct Projectile {
+    int damage = 1;
+};
+
+struct Enemy {
+    float health = 1.0f;
+    int scoreValue = 100;
+};
+
+struct Homing {
+    float turnRate = 1.1f;
+    float speed = 34.0f;
+};
```

**`Components.hpp`** — after `Homing`:

```diff
 struct Homing {
     float turnRate = 1.1f;
     float speed = 34.0f;
 };
+
+struct Spinner {
+    glm::vec3 axis{0.0f, 1.0f, 0.0f};
+    float rate = 1.5f;
+};
+
+struct Lifetime {
+    float remaining = 0.0f;
+};
```

`Homing` and `Spinner` are where composition pays off: an enemy gets one or the
other at spawn and behaves completely differently, from the same mesh, with no
subclass anywhere.

Finally, collision. Who can hit whom is expressed as bits:

**`Components.hpp`** — after `Lifetime`:

```diff
 struct Lifetime {
     float remaining = 0.0f;
 };
+
+enum class Layer : uint32_t {
+    None = 0,
+    Player = 1,
+    Enemy = 2,
+    Projectile = 4,
+};
+
+inline Layer operator|(Layer a, Layer b) {
+    return static_cast<Layer>(static_cast<uint32_t>(a) | static_cast<uint32_t>(b));
+}
+inline bool overlaps(Layer mask, Layer layer) {
+    return (static_cast<uint32_t>(mask) & static_cast<uint32_t>(layer)) != 0;
+}
```

`enum class` gives type safety but costs you the built-in bitwise operators, so
they come back explicitly. `overlaps` reads as a question at the call site —
`overlaps(bolt->mask, enemy->layer)` — which is better than a bare `&` that a
reader has to decode.

**`Components.hpp`** — after `overlaps`:

```diff
 inline bool overlaps(Layer mask, Layer layer) {
     return (static_cast<uint32_t>(mask) & static_cast<uint32_t>(layer)) != 0;
 }
+
+struct Collider {
+    float radius = 1.0f;
+    Layer layer = Layer::None;
+    Layer mask = Layer::None;
+};
```

`layer` is what this thing *is*; `mask` is what it *can hit*. A bolt is
`{Layer::Projectile, Layer::Enemy}` — it is a projectile, and it hits enemies.

---

## One C++ hazard the sparse set adds

Back to that pointer from `get`. It points **into the dense array**, so it is only
valid until the next `set` or `removeIfPresent` on *that same store* —
`push_back` can reallocate, and swap-remove moves elements. Concretely (illustration
only — don't type this):

```cpp
Transform* t = world.get<Transform>(player);
spawnBolt(world);                              // adds a Transform → may reallocate
t->position += v;                              // t is now a dangling pointer
```

That compiles, and it will appear to work right up until the vector happens to
grow. Chapters 10 and 12 both hit this for real; the fix each time is to copy the
value out before spawning anything. Grab the pointer, use it, don't hold it across
a mutation of the same store.

---

## Checkpoint

Extend the harness to exercise `World` end to end:

**`scratch/ecs_check.cpp`** — replace the whole file (throwaway):

```cpp
#include "Components.hpp"
#include "ecs/World.hpp"

#include <cstdio>

int main() {
    World world;
    Entity ship = world.create();
    world.add(ship, Transform{});
    world.add(ship, Velocity{glm::vec3(0, 0, -5)});

    Entity rock = world.create();
    world.add(rock, Transform{});

    std::printf("transforms    : %zu  (want 2)\n", world.store<Transform>().size());
    std::printf("velocities    : %zu  (want 1)\n", world.store<Velocity>().size());

    // Destroying mid-iteration must not disturb the store being walked.
    for (Entity e : world.store<Transform>().entities()) world.destroy(e);
    world.destroy(ship);        // queue one id twice, on purpose
    std::printf("alive before  : %s  (want yes)\n", world.isAlive(ship) ? "yes" : "no");

    world.flushDestroyed();
    std::printf("transforms    : %zu  (want 0)\n", world.store<Transform>().size());
    std::printf("velocities    : %zu  (want 0)\n", world.store<Velocity>().size());
    std::printf("alive after   : %s  (want no)\n", world.isAlive(ship) ? "yes" : "no");
    return 0;
}
```

```console
$ g++ -std=c++17 -Isrc -o /tmp/ecs_check scratch/ecs_check.cpp && /tmp/ecs_check
transforms    : 2  (want 2)
velocities    : 1  (want 1)
alive before  : yes  (want yes)
transforms    : 0  (want 0)
velocities    : 0  (want 0)
alive after   : no  (want no)
```

The `velocities` line going to 0 is the type erasure working: `flushDestroyed`
cleared a store whose type it has never heard of.

| Symptom | Likely cause |
|---|---|
| `c : 99` in the first harness | The `indexOf[owners[i].id] = i;` line is missing. |
| `alive before : no` | `destroy` is deleting immediately instead of queueing. |
| `velocities : 1` after the flush | The loop in `flushDestroyed` isn't visiting every store — check it iterates `stores`, not one store. |
| Crash inside `flushDestroyed` | Queueing an id twice with the `living.count` guard removed: the second pass removes an entity that is already gone. |
| `undefined reference to typeinfo` | A component type declared but never defined. `typeid(T)` needs a complete type. |

**Try breaking it on purpose.** Delete the `if (it != indexOf.end())` early return
in `set` and re-run. Both counts still read 2 and 1 — nothing looks wrong — because
the harness never calls `set` twice on one entity. Now add
`world.add(ship, Transform{});` a second time before the counts. `transforms`
reports 3 for two entities. That is why the early return exists, and why a passing
harness is evidence rather than proof. Put it back.

---

## Adding a component and a system, end to end

The full recipe, which you will use in every remaining chapter:

1. **Add a component** — a struct in `Components.hpp`. Nothing else.
2. **Attach it** — `world.add(enemy, Shield{3.0f});`
3. **Write a system** — a free function over `world.store<Shield>().entities()`.
4. **Schedule it** — one line in `Game::update`, in the right place in the order.

No base classes touched, no existing system edited. That decoupling is the entire
reason to build this way.

---

## Challenge

Add generation counters, so a stale `Entity` can be detected after its id is
reused. Pack a 24-bit index and an 8-bit generation into the existing `uint32_t`.

Three things to get right. `ComponentStore::indexOf` is keyed on `e.id` — if that
now carries a generation, a lookup with a stale handle must *miss* rather than
match, so the generation has to be part of the key, not stripped from it.
`create()` currently never reuses ids, so you need a free-list before generations
mean anything at all — without one the counter never increments and you have added
a field that does nothing. And decide what `isAlive` returns for a stale handle
whose slot has been reused: `false` is the only useful answer, but getting it
requires storing the current generation per slot, not per live entity.

---

**Next:** the ring of images we present, the depth buffer, and the render pass that
addresses them. → [Chapter 05.A: Swapchain, depth & render pass](05.A-swapchain-and-render-pass.md)
