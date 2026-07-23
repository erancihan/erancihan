# 04 · Designing the ECS 🛠️

> **You'll leave this chapter with:** a real understanding of the three ECS
> storage strategies and why we chose the **sparse set**, plus a full reading of
> `Entity`, `ComponentStore` and `World` in C++. This chapter is the one place the
> Vulkan guide and the [Metal guide](../../space-fighter-metal/) are the *same
> design* — an ECS doesn't know or care what draws it, so read this once and it
> serves both.

---

## The three words, precisely

- **Entity** — an identity with no data and no behaviour. Ours is literally a
  `uint32_t` in a wrapper:

  ```cpp
  struct Entity { uint32_t id; };
  inline bool operator==(Entity a, Entity b) { return a.id == b.id; }
  ```

- **Component** — a plain-data struct, no methods. A `Transform`, a `Velocity`,
  an `Enemy`. It answers *"what does this entity have?"* All of ours live in
  `Components.hpp`.

- **System** — a function over every entity that has a particular set of
  components. It answers *"what does having those make it do?"* Ours are the files
  in `systems/`.

The player ship is nothing but an id with a `Transform`, `Velocity`, `Player`,
`Weapon`, `Renderable` and `Collider` attached (`Game::spawnPlayer`). A bolt is an
id with `Transform`, `Velocity`, `Renderable`, `Projectile`, `Collider`,
`Lifetime`. They share five component *types* and zero code.

---

## Where should components live?

This is the real design decision in any ECS, and it's all about **how a system
iterates**. Three common answers:

### 1. A map per type — `unordered_map<Entity, Component>`

Dead simple, and genuinely fine for a small game. The cost: the values are
scattered across the heap, so iterating every `Transform` chases pointers all over
memory and misses the CPU cache constantly. Lookups are hashed, not direct.

### 2. Sparse set — *what we use*

Keep each component type in **two dense, gapless arrays** — the values, and the
entity that owns each slot — plus a **sparse map** from entity to slot. You get
O(1) insert/lookup/remove *and* the dense array is contiguous, so a system that
walks every `Transform` streams straight through memory. It's the storage EnTT and
many production ECSs use, and it's not much code.

### 3. Archetypes — the heavyweight

Group entities by their *exact* set of component types ("all entities that have
Transform+Velocity+Enemy") into tables, so a query iterates fully-packed rows with
zero checks. Fastest for big worlds and complex queries; considerably more
machinery (moving entities between tables as components are added/removed). Bevy
and Unity DOTS live here. Overkill for a few hundred entities — but the direction
you'd grow toward. Chapter 14 revisits this.

We pick the sparse set: it teaches the data-oriented idea honestly, iterates fast,
and fits in ~60 lines of C++.

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

```cpp
void removeIfPresent(Entity e) override {
    auto it = indexOf.find(e.id);
    if (it == indexOf.end()) return;
    size_t i = it->second, last = items.size() - 1;
    if (i != last) {
        items[i]  = std::move(items[last]);      // move last value into the hole
        owners[i] = owners[last];
        indexOf[owners[i].id] = i;               // repoint the moved entity
    }
    items.pop_back(); owners.pop_back();
    indexOf.erase(it);
}
```

The only thing you give up is **stable iteration order** — after a remove, order
scrambles. Systems must never rely on "the order entities were created," and ours
don't.

### Reading and mutating

In Swift the store had a `mutate` closure; in C++ we lean on **references**, which
are even more direct — `get` hands back a pointer straight into the dense array,
and you write through it:

```cpp
template <typename T>
class ComponentStore : public IComponentStore {
    std::vector<T>       items;
    std::vector<Entity>  owners;
    std::unordered_map<uint32_t, size_t> indexOf;
public:
    void set(Entity e, const T& value) {
        auto it = indexOf.find(e.id);
        if (it != indexOf.end()) { items[it->second] = value; return; }
        indexOf[e.id] = items.size();
        items.push_back(value);
        owners.push_back(e);
    }
    T* get(Entity e) {                                   // nullptr if absent
        auto it = indexOf.find(e.id);
        return it == indexOf.end() ? nullptr : &items[it->second];
    }
    const std::vector<Entity>& entities() const { return owners; }  // walk this
    size_t size() const { return items.size(); }
};
```

`get` returning a pointer *into the array* is the C++ equivalent of Swift's
`mutate` — systems edit components in place rather than reading a copy, changing
it, and writing it back. And for a whole-type sweep, a system just walks
`entities()`:

```cpp
for (Entity e : velocities.entities()) {                 // MovementSystem
    Velocity* v = velocities.get(e);
    if (Transform* t = transforms.get(e)) t->position += v->linear * dt;
}
```

> **One C++ hazard the sparse set adds:** a pointer from `get` is only valid until
> the next `set`/`removeIfPresent` on *that same store*, because `push_back` and
> swap-remove can reallocate or move the dense array. So: grab the pointer, use it,
> don't hold it across a mutation of the same store. Our systems follow this
> naturally — read, write, move on.

---

## The `World`: one place that owns everything

`World` holds the entities and one `ComponentStore` per component type. The
interesting bit is storing stores of *different template types* in a single
container. We key them by the component's `std::type_index` and erase to a base
interface:

```cpp
struct IComponentStore {                                 // the erasure boundary
    virtual ~IComponentStore() = default;
    virtual void removeIfPresent(Entity e) = 0;
};

class World {
    std::unordered_map<std::type_index, std::unique_ptr<IComponentStore>> stores;
    uint32_t nextId = 0;
    std::unordered_set<uint32_t> living;
    std::vector<Entity> pendingDestroy;
public:
    Entity create() {                                    // ids are monotonic, never recycled
        Entity e{nextId++};
        living.insert(e.id);
        return e;
    }
    template <typename T>
    ComponentStore<T>& store() {
        auto key = std::type_index(typeid(T));
        auto it = stores.find(key);
        if (it == stores.end())                          // first use of this type
            it = stores.emplace(key, std::make_unique<ComponentStore<T>>()).first;
        return *static_cast<ComponentStore<T>*>(it->second.get());
    }
    template <typename T> void add(Entity e, const T& c) { store<T>().set(e, c); }
};
```

`std::type_index(typeid(T))` is a unique, hashable key per C++ type — the direct
analogue of Swift's `ObjectIdentifier(T.self)`. `IComponentStore` is a tiny
interface (`removeIfPresent`) that lets `World` clean an entity out of *every*
store without knowing their concrete types. Gameplay code never sees the erasure —
it just calls `world.store<Enemy>()` or the sugar `world.add(e, Enemy{})`.

---

## Destroying entities safely

A subtle bug lurks in any ECS: a system iterating a store while something destroys
an entity *in that same store* corrupts the loop (and in C++, can invalidate the
very vector you're walking). Collisions are exactly this — a bolt hits an enemy,
and we want to remove both mid-sweep.

The fix is **deferred destruction**. `world.destroy(e)` doesn't delete anything;
it queues the id. After *all* systems have run for the frame, `Game::update` calls
`world.flushDestroyed()` once, which does the actual removal:

```cpp
void destroy(Entity e) {                       // safe to call mid-iteration
    if (living.count(e.id)) pendingDestroy.push_back(e);
}

void flushDestroyed() {                          // called once, at a safe point
    for (Entity e : pendingDestroy) {
        if (!living.count(e.id)) continue;       // already gone? harmless no-op
        for (auto& [key, s] : stores) s->removeIfPresent(e);
        living.erase(e.id);
    }
    pendingDestroy.clear();
}
```

Because the queue can contain the same id twice (a bolt kills an enemy the cull
system also flagged), the flush guards on `living.count(e.id)` — the second
attempt is a harmless no-op. Systems get to be naive about deletion, which is
exactly what you want.

---

## What we left out: generations

Real engines fold a **generation counter** into the entity id. When slot 42 is
freed and later reused, its generation bumps, so a stale `Entity` captured before
the reuse can be detected as dead (`id matches, generation doesn't`). We skip it
two ways: our ids are a monotonic counter (`nextId++`) that we **never recycle**,
and no system holds an entity reference across frames — they re-query each frame.
For a session-length arcade game that's completely safe. The moment you keep
long-lived entity handles (a targeting system that remembers "the enemy I locked
onto"), add generations. Chapter 14 shows the shape.

---

## Adding a component + system, end to end

This is the payoff — the full recipe for new behaviour, which you'll use in the
later chapters:

1. **Add a component** (pure data) in `Components.hpp`:
   ```cpp
   struct Shield { float strength; };
   ```
2. **Attach it** to whichever entities should have it:
   `world.add(enemy, Shield{3.0f});`.
3. **Write a system** that runs over `world.store<Shield>().entities()`.
4. **Schedule it** — one line in `Game::update`, in the right spot in the order.

No base classes touched, no existing system edited. That decoupling — data in
components, behaviour in systems, wired in one schedule — is the entire reason to
build this way, and it's identical whether the pixels come out of Metal or Vulkan.

---

**Next:** the other half of the seam — and the part Vulkan makes you build by
hand. The swapchain, command buffers, and synchronization. →
[Chapter 05: Swapchain, commands & sync](05-swapchain-and-sync.md)
