# 04 · Designing the ECS 🛠️

> **You'll leave this chapter with:** the three ECS storage strategies and why we
> pick the **sparse set**, plus a full reading of `Entity`, `ComponentStore`,
> `World` (with queries, resources and deferred destroy) and the `Schedule`. This
> is the framework the rest of the game is built on.

---

## The three words, precisely

- **Entity** — an identity with no data and no behaviour. Ours is literally a
  number:

  ```ts
  export type Entity = number;
  ```

- **Component** — a plain-data object, no methods. A `Transform`, a `Velocity`,
  an `Enemy`. It answers *"what does this entity have?"* Ours are small classes
  (chapter 05 onward); the class doubles as the storage key.

- **System** — a function over every entity that has a particular set of
  components. It answers *"what does having those make it do?"*

The player ship is nothing but a number with a `Transform`, `Velocity`, `Player`,
`Weapon`, `Renderable` and `Collider` attached. A bullet is a number with
`Transform`, `Velocity`, `Renderable`, `Bullet`, `Collider`, `Lifetime`. They
share five component
*types* and zero code — the difference between them is purely which data they
carry and therefore which systems touch them.

---

## Where should components live?

This is the one real design decision in any ECS, and it's entirely about **how a
system iterates**. Three common answers:

### 1. A map per type — `Map<Entity, Component>`

Dead simple, and genuinely fine for a small game. Each component type gets a
`Map`; lookups and inserts are O(1)-ish. The cost is iteration: a `Map`'s values
are scattered across the heap and its iteration order and overhead aren't built
for streaming through thousands of items per frame. Perfectly serviceable at our
scale — but we can do better for the same amount of code, and learn the real
data-oriented idea while we're at it.

### 2. Sparse set — *what we use*

Keep each component type in **two dense, gapless arrays** — the values, and the
entity that owns each slot — plus a **sparse map** from entity to slot. You get
O(1) insert / lookup / remove *and* the dense arrays are contiguous, so a system
that walks every `Transform` streams straight through memory instead of chasing
pointers. It's the storage `EnTT` and many production ECSs use, and in JS it's
barely more code than the map.

### 3. Archetypes — the heavyweight

Group entities by their *exact* set of component types ("everything that has
Transform+Velocity+Enemy") into tables, so a query iterates fully-packed rows
with zero per-entity checks. Fastest for big worlds and complex queries;
considerably more machinery (entities move between tables as components are
added/removed). `bitECS`, Bevy and Unity DOTS live here. Overkill for a few
hundred entities — but the direction you'd grow toward, and where chapter 13
points.

We pick the **sparse set**: it teaches the data-oriented idea honestly, iterates
well, and fits in ~40 lines.

---

## The sparse set, drawn

Three parallel structures. `dense` and `owners` are the packed arrays (walk these
for speed); `sparse` is the entity→slot map (use this for random lookup).

```
entities:  1        2        3          (1 and 3 have a Transform; 2 doesn't)

sparse:    1 → 0    3 → 1                (only present entities appear)

dense ↓     slot 0       slot 1
dense:    [ Tf(e1)   ,  Tf(e3)   ]       ← contiguous component values
owners:   [ 1        ,  3        ]       ← who owns each slot
```

The trick that keeps the arrays gapless is **swap-remove**: to delete e1's
component, move the *last* element (e3's) into e1's slot and repoint e3's entry —
no shifting, no holes:

```
remove(e1):  dense[0] = dense[last];  owners[0] = owners[last];  sparse[e3] = 0
             dense.pop();             owners.pop();               sparse.delete(e1)
```

The only thing you give up is **stable iteration order** — after a remove the
order scrambles. Systems must never rely on "the order entities were created",
and ours don't.

### `src/engine/entity.ts`

```ts
// src/engine/entity.ts
export type Entity = number;
```

### `src/engine/component-store.ts`

```ts
// src/engine/component-store.ts
import type { Entity } from "./entity";

/**
 * Sparse-set storage for one component type.
 *   dense[i], owners[i]  — packed, cache-friendly; iterate these
 *   sparse: entity → i   — random access
 * All operations are O(1); removal uses swap-remove to stay gapless.
 */
export class ComponentStore<T> {
  private dense: T[] = [];
  private owners: Entity[] = [];
  private sparse = new Map<Entity, number>();

  /** Insert or overwrite the component for `entity`. */
  set(entity: Entity, value: T): void {
    const i = this.sparse.get(entity);
    if (i !== undefined) {
      this.dense[i] = value;          // overwrite in place
      return;
    }
    this.sparse.set(entity, this.dense.length);
    this.owners.push(entity);
    this.dense.push(value);
  }

  get(entity: Entity): T | undefined {
    const i = this.sparse.get(entity);
    return i === undefined ? undefined : this.dense[i];
  }

  has(entity: Entity): boolean {
    return this.sparse.has(entity);
  }

  /** Swap-remove: move the last element into the hole, keep arrays gapless. */
  remove(entity: Entity): void {
    const i = this.sparse.get(entity);
    if (i === undefined) return;

    const last = this.dense.length - 1;
    if (i !== last) {
      this.dense[i] = this.dense[last];
      this.owners[i] = this.owners[last];
      this.sparse.set(this.owners[i], i);   // repoint the moved entity
    }
    this.dense.pop();
    this.owners.pop();
    this.sparse.delete(entity);
  }

  /** The entities that have this component — walk this for a whole-type sweep. */
  get entities(): readonly Entity[] { return this.owners; }
  get values(): readonly T[] { return this.dense; }
  get size(): number { return this.dense.length; }
}
```

Notice what's **missing** compared to a language like Swift: no `mutate` closure.
In JS a component is an **object reference**, so `store.get(e)` hands you the
real object and a system just edits it in place — `transform.x += ...` — no
read-copy-write dance. That's a genuine simplification the language gives us for
free.

---

## The `World`: one place that owns everything

`World` holds the living entities, one `ComponentStore` per component type, a bag
of **resources** (singletons like input and score), and the deferred-destroy
queue. The neat part is storing stores of *different* generic types in one map:
we key them by the **component's constructor**.

### `src/engine/world.ts`

```ts
// src/engine/world.ts
import type { Entity } from "./entity";
import { ComponentStore } from "./component-store";

/** Any class usable as a component/resource key. `abstract` so tag classes fit. */
export type Ctor<T> = abstract new (...args: any[]) => T;

export class World {
  private nextId: Entity = 1;                 // 0 is reserved as "no entity"
  private living = new Set<Entity>();
  private stores = new Map<Ctor<unknown>, ComponentStore<unknown>>();
  private resources = new Map<Ctor<unknown>, unknown>();
  private pendingDestroy: Entity[] = [];

  // --- entities ---

  create(): Entity {
    const e = this.nextId++;                  // monotonic; never recycled (see below)
    this.living.add(e);
    return e;
  }

  isAlive(entity: Entity): boolean { return this.living.has(entity); }

  get entityCount(): number { return this.living.size; }

  // --- components ---

  /** The store for a component type, created on first use. */
  store<T>(ctor: Ctor<T>): ComponentStore<T> {
    let s = this.stores.get(ctor) as ComponentStore<T> | undefined;
    if (!s) {
      s = new ComponentStore<T>();
      this.stores.set(ctor, s as ComponentStore<unknown>);
    }
    return s;
  }

  /** Attach a component instance; its class is the storage key. */
  add<T extends object>(entity: Entity, component: T): T {
    this.store(component.constructor as Ctor<T>).set(entity, component);
    return component;
  }

  get<T>(entity: Entity, ctor: Ctor<T>): T | undefined { return this.store(ctor).get(entity); }
  has<T>(entity: Entity, ctor: Ctor<T>): boolean { return this.store(ctor).has(entity); }
  remove<T>(entity: Entity, ctor: Ctor<T>): void { this.store(ctor).remove(entity); }

  /**
   * Every entity that has ALL of the given component types.
   * We iterate the *smallest* store and check membership in the rest — so a
   * query for (Transform, Homing) walks the few homing entities, not every
   * transform. Returns a fresh array; fine at our scale (chapter 13 pools it).
   */
  query(...ctors: Ctor<unknown>[]): Entity[] {
    if (ctors.length === 0) return [];
    let smallest = this.store(ctors[0]);
    for (let i = 1; i < ctors.length; i++) {
      const s = this.store(ctors[i]);
      if (s.size < smallest.size) smallest = s;
    }
    const out: Entity[] = [];
    outer: for (const e of smallest.entities) {
      for (const c of ctors) {
        if (!this.store(c).has(e)) continue outer;
      }
      out.push(e);
    }
    return out;
  }

  // --- resources (singletons: input, time, score, the stage...) ---

  setResource<T extends object>(resource: T): T {
    this.resources.set(resource.constructor as Ctor<T>, resource);
    return resource;
  }

  resource<T>(ctor: Ctor<T>): T {
    const r = this.resources.get(ctor);
    if (r === undefined) throw new Error(`Resource not set: ${ctor.name}`);
    return r as T;
  }

  // --- deferred destruction ---

  /** Safe to call mid-iteration; nothing is removed until flush(). */
  destroy(entity: Entity): void {
    if (this.living.has(entity)) this.pendingDestroy.push(entity);
  }

  /** Remove all queued entities from every store. Call once, at a safe point. */
  flush(onBeforeRemove?: (entity: Entity) => void): void {
    for (const e of this.pendingDestroy) {
      if (!this.living.has(e)) continue;      // guard double-queues
      onBeforeRemove?.(e);                    // e.g. detach its PixiJS view (ch. 05)
      for (const store of this.stores.values()) store.remove(e);
      this.living.delete(e);
    }
    this.pendingDestroy.length = 0;
  }
}
```

Three things worth pausing on:

**Constructor-as-key.** `component.constructor` is the class the object was made
from, and a class is a unique object, so it's a perfect map key. `world.add(e,
new Velocity(3, 0))` finds the `Velocity` store; `world.get(e, Velocity)` finds
the same one. No string names, no enum, no registration step.

**Queries iterate the smallest store.** A naive query walks one component type and
filters; picking the *smallest* of the requested stores as the driver means
`query(Transform, Homing)` costs "number of homing entities", not "number of
transforms". It's a one-line optimisation that matters once `Transform` is on
everything.

**Resources are just singletons.** Input state, the score, the elapsed clock, the
PixiJS layer containers — things there's exactly one of — don't belong on an
entity. `setResource`/`resource` keep them on the `World` so any system can reach
them without a global.

---

## Destroying entities safely

A subtle bug lurks in every ECS: a system iterating a store while something
destroys an entity *in that same store* corrupts the loop (swap-remove moves an
element you haven't visited yet into a slot you already passed). Collisions are
exactly this — a bolt hits an enemy and we want both gone mid-sweep.

The fix, baked into `World` above, is **deferred destruction**. `world.destroy(e)`
doesn't delete anything; it queues the id. After *all* systems have run for the
step, the loop calls `world.flush()` once, which does the actual removal at a
point where nothing is iterating. Systems get to be naive about deletion — call
`destroy` whenever, as often as you like, even on the same entity twice — and the
`isAlive` guard makes the second removal a harmless no-op.

The optional `onBeforeRemove` callback is how chapter 05 unmounts an entity's
PixiJS display object from the scene graph at the exact moment the entity dies —
one hook, no leaks.

---

## What we left out: generations

Real engines fold a **generation counter** into the entity id so a stale handle to
a since-reused slot can be detected as dead. We skip it two ways: our ids are a
monotonic counter we **never recycle** (a `number` is 64-bit; you will not run
out in an arcade session), and no system holds an entity across frames — they
re-query every step. The moment you keep a long-lived handle ("the enemy I locked
onto"), add generations or check `isAlive` before use. Chapter 13 shows the shape.

---

## The `Schedule`: behaviour, in order

A **system** is just something with an `update(world, dt)`. The **schedule** is an
ordered list of them, run top to bottom every step. That list *is* the game logic
— reordering it changes behaviour (weapons must fire before collisions resolve;
render must sync last).

### `src/engine/schedule.ts`

```ts
// src/engine/schedule.ts
import type { World } from "./world";

/** A system as an object (when it needs setup state) ... */
export interface System {
  update(world: World, dt: number): void;
}

/** ... or as a bare function (when it doesn't). */
export type SystemFn = (world: World, dt: number) => void;

export class Schedule {
  private systems: System[] = [];

  add(system: System | SystemFn): this {
    this.systems.push(typeof system === "function" ? { update: system } : system);
    return this;
  }

  run(world: World, dt: number): void {
    for (const system of this.systems) system.update(world, dt);
  }
}
```

Systems that need construction-time state — the renderer needs the stage, the
spawner needs its wave table — are **classes** implementing `System`. Stateless
ones — movement, lifetime — are **functions**. The schedule takes either. Chapter
07 assembles the real list; here's its shape:

```ts
const schedule = new Schedule()
  .add(playerControlSystem)
  .add(weaponSystem)
  .add(spawnerSystem)
  .add(enemyAiSystem)
  .add(movementSystem)
  .add(homingSystem)
  .add(lifetimeSystem)
  .add(collisionSystem)
  .add(damageSystem)
  .add(renderSystem);          // always last: sync transforms, then PixiJS draws
```

---

## Adding a component + system, end to end

This is the payoff — the full recipe you'll use in every later chapter:

1. **Define a component** (pure data) in `src/game/components.ts`:
   ```ts
   export class Shield { constructor(public strength = 3) {} }
   ```
2. **Attach it** to whichever entities should have it:
   ```ts
   world.add(player, new Shield(3));
   ```
3. **Write a system** that runs over whoever has it:
   ```ts
   export function shieldDecaySystem(world: World, dt: number): void {
     for (const e of world.query(Shield)) {
       const shield = world.get(e, Shield)!;
       shield.strength -= dt * 0.5;
       if (shield.strength <= 0) world.remove(e, Shield);
     }
   }
   ```
4. **Schedule it** — one line, in the right spot:
   ```ts
   schedule.add(shieldDecaySystem);
   ```

Four steps, no new subclass of anything, no touching the entities that *don't*
have a shield. That decoupling — new behaviour as pure addition — is the entire
reason we built this instead of subclassing `Container`.

---

## Checkpoint

- [x] `entity.ts`, `component-store.ts`, `world.ts`, `schedule.ts` exist.
- [x] You can trace a `query(A, B)` call through the smallest-store optimisation.
- [x] You know why `destroy` defers and `flush` is called once per step.

The engine is done — and it doesn't know PixiJS exists. Next we build the **one
seam** that connects it to the renderer.

*Next → [Chapter 05: The render seam](05-the-render-seam.md)*
