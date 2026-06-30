// Package ecs is a hand-rolled, sparse-set Entity Component System.
//
// It is the foundation of the engine core and depends on nothing outside the
// standard library — no third-party ECS. The design favours clarity and being
// learnable over maximum throughput; archetype storage is a possible future
// optimization, but a sparse set is the starting point.
//
// # Entities
//
// An [Entity] is a lightweight handle of {index, generation}. The generation is
// bumped whenever an index is freed, so a handle to a destroyed entity becomes
// stale and fails liveness checks instead of silently aliasing a recycled slot.
//
// # Components
//
// Component data lives in per-type sparse sets. Because Go has no generic
// methods (only generic functions), component access is via package-level
// generics: [Add], [Get], [Has], [Remove]. Iteration is via [Query1], [Query2],
// and [Query3].
//
// # Resources
//
// Global singletons (Time, RNG, config, domain services) are stored per type
// with [SetResource] / [GetResource] / [MustResource].
package ecs

// Entity is a handle to an entity: a slot index plus a generation counter.
//
// The generation distinguishes a live entity from a stale handle to a recycled
// slot. The zero value (Generation == 0) is never a valid live entity.
type Entity struct {
	Index      uint32
	Generation uint32
}

// IsZero reports whether e is the zero (never-valid) handle.
func (e Entity) IsZero() bool { return e.Generation == 0 }

// entityManager allocates, recycles, and tracks the liveness of entity slots.
//
// Slots are recycled via a free list. A separate live flag makes liveness exact:
// a freed slot is not alive even though its generation already points at the
// value the next allocation will hand out.
type entityManager struct {
	generations []uint32 // per-slot generation; index by Entity.Index
	live        []bool   // per-slot liveness
	free        []uint32 // recycled slot indices, ready for reuse
	aliveCount  int
}

// create returns a fresh live entity, recycling a freed slot when possible.
func (m *entityManager) create() Entity {
	m.aliveCount++

	if n := len(m.free); n > 0 {
		idx := m.free[n-1]
		m.free = m.free[:n-1]
		m.live[idx] = true
		return Entity{Index: idx, Generation: m.generations[idx]}
	}

	idx := uint32(len(m.generations))
	m.generations = append(m.generations, 1)
	m.live = append(m.live, true)
	return Entity{Index: idx, Generation: 1}
}

// alive reports whether e refers to a currently live entity.
func (m *entityManager) alive(e Entity) bool {
	return e.Generation != 0 &&
		int(e.Index) < len(m.generations) &&
		m.live[e.Index] &&
		m.generations[e.Index] == e.Generation
}

// destroy frees e's slot and bumps its generation so existing handles go stale.
// It reports whether e was alive (and thus actually destroyed).
func (m *entityManager) destroy(e Entity) bool {
	if !m.alive(e) {
		return false
	}

	m.generations[e.Index]++
	if m.generations[e.Index] == 0 {
		// Skip generation 0 on wraparound so the zero handle stays invalid.
		m.generations[e.Index] = 1
	}
	m.live[e.Index] = false
	m.free = append(m.free, e.Index)
	m.aliveCount--
	return true
}
