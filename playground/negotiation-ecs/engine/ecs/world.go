package ecs

import "reflect"

// World owns entity allocation, all component stores, and resources.
//
// Stores and resources are keyed by reflect type because they hold
// heterogeneous concrete types behind a single map. The typed package-level
// functions ([Add], [Get], [Query2], [SetResource], ...) provide the
// statically-typed surface over that erased storage.
type World struct {
	em        entityManager
	stores    map[reflect.Type]any // reflect.Type -> *sparseSet[T]
	resources map[reflect.Type]any // reflect.Type -> *T
}

// NewWorld returns an empty world.
func NewWorld() *World {
	return &World{
		stores:    make(map[reflect.Type]any),
		resources: make(map[reflect.Type]any),
	}
}

// NewEntity creates and returns a fresh live entity.
func (w *World) NewEntity() Entity { return w.em.create() }

// Alive reports whether e refers to a currently live entity.
func (w *World) Alive(e Entity) bool { return w.em.alive(e) }

// Destroy removes all of e's components and frees its slot. It reports whether
// e was alive (and thus actually destroyed).
func (w *World) Destroy(e Entity) bool {
	if !w.em.alive(e) {
		return false
	}
	for _, s := range w.stores {
		s.(anyStore).remove(e.Index)
	}
	return w.em.destroy(e)
}

// Count returns the number of live entities.
func (w *World) Count() int { return w.em.aliveCount }

// entityAt reconstructs a live entity handle from a slot index. It is only
// called with indices drawn from component stores, which only ever hold live
// entities.
func (w *World) entityAt(idx uint32) Entity {
	return Entity{Index: idx, Generation: w.em.generations[idx]}
}

// =============================================================================
// Component access (typed, package-level — Go has no generic methods)
// =============================================================================

// storeFor returns the store for component type T, creating it if needed.
func storeFor[T any](w *World) *sparseSet[T] {
	t := reflect.TypeFor[T]()
	if s, ok := w.stores[t]; ok {
		return s.(*sparseSet[T])
	}
	s := &sparseSet[T]{}
	w.stores[t] = s
	return s
}

// getStore returns the existing store for T without creating one.
func getStore[T any](w *World) (*sparseSet[T], bool) {
	if s, ok := w.stores[reflect.TypeFor[T]()]; ok {
		return s.(*sparseSet[T]), true
	}
	return nil, false
}

// Add attaches component v to entity e (overwriting any existing T). It is a
// no-op if e is not alive.
func Add[T any](w *World, e Entity, v T) {
	if !w.em.alive(e) {
		return
	}
	storeFor[T](w).add(e.Index, v)
}

// Get returns a pointer to e's component of type T, or (nil, false) if e is dead
// or has no such component. The pointer is valid until the next add/remove of T.
func Get[T any](w *World, e Entity) (*T, bool) {
	if !w.em.alive(e) {
		return nil, false
	}
	s, ok := getStore[T](w)
	if !ok {
		return nil, false
	}
	return s.get(e.Index)
}

// Has reports whether e has a component of type T.
func Has[T any](w *World, e Entity) bool {
	if !w.em.alive(e) {
		return false
	}
	s, ok := getStore[T](w)
	return ok && s.has(e.Index)
}

// Remove detaches e's component of type T, if present.
func Remove[T any](w *World, e Entity) {
	if !w.em.alive(e) {
		return
	}
	if s, ok := getStore[T](w); ok {
		s.remove(e.Index)
	}
}

// =============================================================================
// Resources (typed global singletons)
// =============================================================================

// SetResource stores v as the singleton resource of type T, replacing any
// previous value.
func SetResource[T any](w *World, v T) {
	w.resources[reflect.TypeFor[T]()] = &v
}

// GetResource returns a pointer to the resource of type T, or (nil, false) if
// none is set. Mutating through the pointer mutates the stored resource.
func GetResource[T any](w *World) (*T, bool) {
	if r, ok := w.resources[reflect.TypeFor[T]()]; ok {
		return r.(*T), true
	}
	return nil, false
}

// MustResource returns the resource of type T, panicking if it is not set.
func MustResource[T any](w *World) *T {
	if r, ok := GetResource[T](w); ok {
		return r
	}
	panic("ecs: resource not set: " + reflect.TypeFor[T]().String())
}
