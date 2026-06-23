package ecs

import (
	"sort"
	"testing"
)

// Test component types.
type Position struct{ X, Y float64 }
type Velocity struct{ DX, DY float64 }
type Tag struct{ Name string }

// -----------------------------------------------------------------------------
// Entities
// -----------------------------------------------------------------------------

func TestEntityCreateAndAlive(t *testing.T) {
	w := NewWorld()

	e := w.NewEntity()
	if e.IsZero() {
		t.Fatal("new entity should not be the zero handle")
	}
	if !w.Alive(e) {
		t.Fatal("new entity should be alive")
	}
	if w.Count() != 1 {
		t.Fatalf("Count = %d, want 1", w.Count())
	}
}

func TestZeroHandleNotAlive(t *testing.T) {
	w := NewWorld()
	w.NewEntity() // occupy slot 0
	if w.Alive(Entity{}) {
		t.Fatal("zero handle must never be alive")
	}
}

func TestDestroyInvalidatesHandle(t *testing.T) {
	w := NewWorld()
	e := w.NewEntity()

	if !w.Destroy(e) {
		t.Fatal("Destroy of a live entity should report true")
	}
	if w.Alive(e) {
		t.Fatal("entity should be dead after Destroy")
	}
	if w.Destroy(e) {
		t.Fatal("double Destroy should report false")
	}
	if w.Count() != 0 {
		t.Fatalf("Count = %d, want 0", w.Count())
	}
}

func TestSlotRecyclingBumpsGeneration(t *testing.T) {
	w := NewWorld()

	e1 := w.NewEntity()
	w.Destroy(e1)
	e2 := w.NewEntity() // should reuse e1's slot

	if e2.Index != e1.Index {
		t.Fatalf("expected slot reuse: e1.Index=%d e2.Index=%d", e1.Index, e2.Index)
	}
	if e2.Generation == e1.Generation {
		t.Fatal("recycled slot must get a new generation")
	}
	if w.Alive(e1) {
		t.Fatal("stale handle to recycled slot must not be alive")
	}
	if !w.Alive(e2) {
		t.Fatal("recycled entity should be alive")
	}
}

// -----------------------------------------------------------------------------
// Components
// -----------------------------------------------------------------------------

func TestAddGetHasRemove(t *testing.T) {
	w := NewWorld()
	e := w.NewEntity()

	if Has[Position](w, e) {
		t.Fatal("entity should not have Position yet")
	}

	Add(w, e, Position{X: 1, Y: 2})
	if !Has[Position](w, e) {
		t.Fatal("entity should have Position after Add")
	}

	p, ok := Get[Position](w, e)
	if !ok || p.X != 1 || p.Y != 2 {
		t.Fatalf("Get Position = %+v ok=%v, want {1 2} true", p, ok)
	}

	Remove[Position](w, e)
	if Has[Position](w, e) {
		t.Fatal("entity should not have Position after Remove")
	}
}

func TestAddOverwrites(t *testing.T) {
	w := NewWorld()
	e := w.NewEntity()

	Add(w, e, Position{X: 1})
	Add(w, e, Position{X: 9})

	p, _ := Get[Position](w, e)
	if p.X != 9 {
		t.Fatalf("X = %v, want 9 (re-Add should overwrite)", p.X)
	}
}

func TestMutateThroughPointer(t *testing.T) {
	w := NewWorld()
	e := w.NewEntity()
	Add(w, e, Position{X: 1})

	p, _ := Get[Position](w, e)
	p.X = 42

	again, _ := Get[Position](w, e)
	if again.X != 42 {
		t.Fatalf("X = %v, want 42 (mutation through pointer should persist)", again.X)
	}
}

func TestDeadEntityAccessIsSafe(t *testing.T) {
	w := NewWorld()
	e := w.NewEntity()
	Add(w, e, Position{X: 1})
	w.Destroy(e)

	if _, ok := Get[Position](w, e); ok {
		t.Fatal("Get on a dead entity should fail")
	}
	if Has[Position](w, e) {
		t.Fatal("Has on a dead entity should be false")
	}
	// These should be silent no-ops, not panics.
	Add(w, e, Position{X: 2})
	Remove[Position](w, e)
}

func TestDestroyStripsComponents(t *testing.T) {
	w := NewWorld()
	e1 := w.NewEntity()
	Add(w, e1, Position{X: 7})
	Add(w, e1, Velocity{DX: 3})

	w.Destroy(e1)
	e2 := w.NewEntity() // reuses e1's slot

	if Has[Position](w, e2) {
		t.Fatal("recycled entity must not inherit Position from destroyed entity")
	}
	if Has[Velocity](w, e2) {
		t.Fatal("recycled entity must not inherit Velocity from destroyed entity")
	}
}

// TestSwapRemoveKeepsOthersIntact exercises the swap-with-last removal path:
// removing a middle element must not corrupt the remaining components.
func TestSwapRemoveKeepsOthersIntact(t *testing.T) {
	w := NewWorld()
	var es []Entity
	for i := 0; i < 5; i++ {
		e := w.NewEntity()
		Add(w, e, Position{X: float64(i)})
		es = append(es, e)
	}

	Remove[Position](w, es[2]) // remove a middle element

	for i, e := range es {
		if i == 2 {
			if Has[Position](w, e) {
				t.Fatalf("entity %d should have been removed", i)
			}
			continue
		}
		p, ok := Get[Position](w, e)
		if !ok || p.X != float64(i) {
			t.Fatalf("entity %d: Position=%+v ok=%v, want X=%d", i, p, ok, i)
		}
	}
}

// -----------------------------------------------------------------------------
// Queries
// -----------------------------------------------------------------------------

func TestQuery1(t *testing.T) {
	w := NewWorld()
	want := map[Entity]bool{}
	for i := 0; i < 4; i++ {
		e := w.NewEntity()
		Add(w, e, Position{X: float64(i)})
		want[e] = true
	}
	// An entity without Position must not appear.
	noPos := w.NewEntity()
	Add(w, noPos, Velocity{})

	seen := map[Entity]bool{}
	q := Query1[Position](w)
	for q.Next() {
		seen[q.Entity()] = true
	}
	if len(seen) != len(want) {
		t.Fatalf("Query1 saw %d entities, want %d", len(seen), len(want))
	}
	for e := range want {
		if !seen[e] {
			t.Fatalf("Query1 missed entity %+v", e)
		}
	}
}

func TestQuery2Intersection(t *testing.T) {
	w := NewWorld()

	both := w.NewEntity()
	Add(w, both, Position{X: 1})
	Add(w, both, Velocity{DX: 1})

	onlyPos := w.NewEntity()
	Add(w, onlyPos, Position{X: 2})

	onlyVel := w.NewEntity()
	Add(w, onlyVel, Velocity{DX: 2})

	count := 0
	q := Query2[Position, Velocity](w)
	for q.Next() {
		count++
		if q.Entity() != both {
			t.Fatalf("Query2 yielded unexpected entity %+v", q.Entity())
		}
		p, v := q.Get()
		if p.X != 1 || v.DX != 1 {
			t.Fatalf("Query2 components = %+v %+v", p, v)
		}
	}
	if count != 1 {
		t.Fatalf("Query2 matched %d entities, want 1", count)
	}
}

func TestQuery2DriverPicksSmallest(t *testing.T) {
	w := NewWorld()
	// Many Positions, few Velocities — the result is the intersection either way.
	var withBoth []Entity
	for i := 0; i < 100; i++ {
		e := w.NewEntity()
		Add(w, e, Position{X: float64(i)})
		if i%25 == 0 {
			Add(w, e, Velocity{DX: 1})
			withBoth = append(withBoth, e)
		}
	}

	var got []Entity
	q := Query2[Position, Velocity](w)
	for q.Next() {
		got = append(got, q.Entity())
	}
	if len(got) != len(withBoth) {
		t.Fatalf("Query2 matched %d, want %d", len(got), len(withBoth))
	}
}

func TestQuery3(t *testing.T) {
	w := NewWorld()

	full := w.NewEntity()
	Add(w, full, Position{})
	Add(w, full, Velocity{})
	Add(w, full, Tag{Name: "full"})

	partial := w.NewEntity()
	Add(w, partial, Position{})
	Add(w, partial, Velocity{})

	count := 0
	q := Query3[Position, Velocity, Tag](w)
	for q.Next() {
		count++
		_, _, tag := q.Get()
		if tag.Name != "full" {
			t.Fatalf("unexpected tag %q", tag.Name)
		}
	}
	if count != 1 {
		t.Fatalf("Query3 matched %d entities, want 1", count)
	}
}

func TestQueryEmptyWhenStoreMissing(t *testing.T) {
	w := NewWorld()
	e := w.NewEntity()
	Add(w, e, Position{})

	// Velocity store was never created.
	q := Query2[Position, Velocity](w)
	if q.Next() {
		t.Fatal("query over a missing component store should yield nothing")
	}
}

func TestQueryMutationPersists(t *testing.T) {
	w := NewWorld()
	for i := 0; i < 3; i++ {
		e := w.NewEntity()
		Add(w, e, Position{X: float64(i)})
		Add(w, e, Velocity{DX: 10})
	}

	q := Query2[Position, Velocity](w)
	for q.Next() {
		p, v := q.Get()
		p.X += v.DX
	}

	var xs []float64
	q2 := Query1[Position](w)
	for q2.Next() {
		xs = append(xs, q2.Get().X)
	}
	sort.Float64s(xs)
	want := []float64{10, 11, 12}
	for i := range want {
		if xs[i] != want[i] {
			t.Fatalf("after query mutation xs=%v, want %v", xs, want)
		}
	}
}

// -----------------------------------------------------------------------------
// Resources
// -----------------------------------------------------------------------------

type Clock struct{ Tick uint64 }

func TestResources(t *testing.T) {
	w := NewWorld()

	if _, ok := GetResource[Clock](w); ok {
		t.Fatal("resource should not exist before being set")
	}

	SetResource(w, Clock{Tick: 5})
	c, ok := GetResource[Clock](w)
	if !ok || c.Tick != 5 {
		t.Fatalf("GetResource = %+v ok=%v, want {5} true", c, ok)
	}

	// Mutating through the pointer mutates the stored resource.
	c.Tick = 99
	again := MustResource[Clock](w)
	if again.Tick != 99 {
		t.Fatalf("resource Tick = %d, want 99", again.Tick)
	}
}

func TestMustResourcePanics(t *testing.T) {
	w := NewWorld()
	defer func() {
		if recover() == nil {
			t.Fatal("MustResource should panic when the resource is missing")
		}
	}()
	_ = MustResource[Clock](w)
}
