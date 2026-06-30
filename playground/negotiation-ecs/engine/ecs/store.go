package ecs

// absent marks a slot in a sparse set's index as having no component.
const absent = int32(-1)

// anyStore is the type-erased view of a component store, letting the World
// operate on every store (e.g. to strip components from a destroyed entity)
// without knowing the concrete component type.
type anyStore interface {
	remove(idx uint32)
	has(idx uint32) bool
	len() int
	entities() []uint32
}

// sparseSet stores components of type T for entities, keyed by entity index.
//
// It keeps three parallel structures:
//
//	sparse[entityIndex] -> position in dense/values, or absent
//	dense[position]     -> entityIndex
//	values[position]    -> component value
//
// dense and values are packed (no gaps), so iteration is cache-friendly.
// Add/Remove/Has are O(1); Remove uses swap-with-last to keep the arrays packed.
type sparseSet[T any] struct {
	sparse []int32
	dense  []uint32
	values []T
}

// ensure grows the sparse index so idx is addressable.
func (s *sparseSet[T]) ensure(idx uint32) {
	for int(idx) >= len(s.sparse) {
		s.sparse = append(s.sparse, absent)
	}
}

func (s *sparseSet[T]) has(idx uint32) bool {
	return int(idx) < len(s.sparse) && s.sparse[idx] != absent
}

// add inserts or overwrites the component for idx.
func (s *sparseSet[T]) add(idx uint32, v T) {
	s.ensure(idx)
	if p := s.sparse[idx]; p != absent {
		s.values[p] = v
		return
	}
	s.sparse[idx] = int32(len(s.dense))
	s.dense = append(s.dense, idx)
	s.values = append(s.values, v)
}

// get returns a pointer to idx's component, or (nil, false) if absent.
//
// The pointer is valid only until the next structural change to this store
// (add/remove), which may reallocate or reorder the backing array.
func (s *sparseSet[T]) get(idx uint32) (*T, bool) {
	if !s.has(idx) {
		return nil, false
	}
	return &s.values[s.sparse[idx]], true
}

// remove deletes idx's component, swapping the last packed element into its
// place to keep dense and values gap-free.
func (s *sparseSet[T]) remove(idx uint32) {
	if !s.has(idx) {
		return
	}

	p := s.sparse[idx]
	last := len(s.dense) - 1
	lastEntity := s.dense[last]

	// Move the last packed element into the hole left by idx.
	s.dense[p] = lastEntity
	s.values[p] = s.values[last]
	s.sparse[lastEntity] = p

	// Zero the now-unused tail slot so it can't retain references, then shrink.
	var zero T
	s.values[last] = zero
	s.dense = s.dense[:last]
	s.values = s.values[:last]
	s.sparse[idx] = absent
}

func (s *sparseSet[T]) len() int { return len(s.dense) }

// entities returns the packed slice of entity indices that have this component.
// Callers must not structurally modify the store while iterating the result.
func (s *sparseSet[T]) entities() []uint32 { return s.dense }
