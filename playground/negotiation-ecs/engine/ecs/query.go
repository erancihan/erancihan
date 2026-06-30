package ecs

// Queries iterate the entities that have all of the requested component types.
//
// A query is driven by the smallest of the requested stores: it walks that
// store's packed entity list and, for each entity, checks the other stores.
// This makes the cost proportional to the rarest component rather than to the
// total entity count.
//
// Iteration model (mirrors the familiar cursor style):
//
//	q := ecs.Query2[Position, Velocity](w)
//	for q.Next() {
//	    pos, vel := q.Get()
//	    pos.X += vel.DX
//	}
//
// Do not add or remove components of the queried types while iterating — that
// can reorder or reallocate the backing arrays and invalidate the cursor.

// pickDriver returns the shortest of the given packed entity slices, or nil if
// any input store is missing (which makes the query empty).
func pickDriver(slices ...[]uint32) []uint32 {
	driver := slices[0]
	for _, s := range slices[1:] {
		if len(s) < len(driver) {
			driver = s
		}
	}
	return driver
}

// -----------------------------------------------------------------------------
// Query1
// -----------------------------------------------------------------------------

// Query1Iter iterates entities that have component A.
type Query1Iter[A any] struct {
	w      *World
	sa     *sparseSet[A]
	driver []uint32
	pos    int
	cur    Entity
	a      *A
}

// Query1 begins iterating all entities that have component A.
func Query1[A any](w *World) *Query1Iter[A] {
	sa, ok := getStore[A](w)
	if !ok {
		return &Query1Iter[A]{w: w}
	}
	return &Query1Iter[A]{w: w, sa: sa, driver: sa.entities()}
}

// Next advances to the next matching entity, returning false when exhausted.
func (it *Query1Iter[A]) Next() bool {
	for it.pos < len(it.driver) {
		idx := it.driver[it.pos]
		it.pos++
		it.a, _ = it.sa.get(idx)
		it.cur = it.w.entityAt(idx)
		return true
	}
	return false
}

// Get returns a pointer to the current entity's component A.
func (it *Query1Iter[A]) Get() *A { return it.a }

// Entity returns the current entity handle.
func (it *Query1Iter[A]) Entity() Entity { return it.cur }

// -----------------------------------------------------------------------------
// Query2
// -----------------------------------------------------------------------------

// Query2Iter iterates entities that have both components A and B.
type Query2Iter[A, B any] struct {
	w      *World
	sa     *sparseSet[A]
	sb     *sparseSet[B]
	driver []uint32
	pos    int
	cur    Entity
	a      *A
	b      *B
}

// Query2 begins iterating all entities that have both A and B.
func Query2[A, B any](w *World) *Query2Iter[A, B] {
	sa, oka := getStore[A](w)
	sb, okb := getStore[B](w)
	it := &Query2Iter[A, B]{w: w, sa: sa, sb: sb}
	if oka && okb {
		it.driver = pickDriver(sa.entities(), sb.entities())
	}
	return it
}

// Next advances to the next entity that has all queried components.
func (it *Query2Iter[A, B]) Next() bool {
	for it.pos < len(it.driver) {
		idx := it.driver[it.pos]
		it.pos++

		a, ok := it.sa.get(idx)
		if !ok {
			continue
		}
		b, ok := it.sb.get(idx)
		if !ok {
			continue
		}
		it.a, it.b = a, b
		it.cur = it.w.entityAt(idx)
		return true
	}
	return false
}

// Get returns pointers to the current entity's components A and B.
func (it *Query2Iter[A, B]) Get() (*A, *B) { return it.a, it.b }

// Entity returns the current entity handle.
func (it *Query2Iter[A, B]) Entity() Entity { return it.cur }

// -----------------------------------------------------------------------------
// Query3
// -----------------------------------------------------------------------------

// Query3Iter iterates entities that have components A, B, and C.
type Query3Iter[A, B, C any] struct {
	w      *World
	sa     *sparseSet[A]
	sb     *sparseSet[B]
	sc     *sparseSet[C]
	driver []uint32
	pos    int
	cur    Entity
	a      *A
	b      *B
	c      *C
}

// Query3 begins iterating all entities that have A, B, and C.
func Query3[A, B, C any](w *World) *Query3Iter[A, B, C] {
	sa, oka := getStore[A](w)
	sb, okb := getStore[B](w)
	sc, okc := getStore[C](w)
	it := &Query3Iter[A, B, C]{w: w, sa: sa, sb: sb, sc: sc}
	if oka && okb && okc {
		it.driver = pickDriver(sa.entities(), sb.entities(), sc.entities())
	}
	return it
}

// Next advances to the next entity that has all queried components.
func (it *Query3Iter[A, B, C]) Next() bool {
	for it.pos < len(it.driver) {
		idx := it.driver[it.pos]
		it.pos++

		a, ok := it.sa.get(idx)
		if !ok {
			continue
		}
		b, ok := it.sb.get(idx)
		if !ok {
			continue
		}
		c, ok := it.sc.get(idx)
		if !ok {
			continue
		}
		it.a, it.b, it.c = a, b, c
		it.cur = it.w.entityAt(idx)
		return true
	}
	return false
}

// Get returns pointers to the current entity's components A, B, and C.
func (it *Query3Iter[A, B, C]) Get() (*A, *B, *C) { return it.a, it.b, it.c }

// Entity returns the current entity handle.
func (it *Query3Iter[A, B, C]) Entity() Entity { return it.cur }
