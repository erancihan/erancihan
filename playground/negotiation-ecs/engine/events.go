package engine

import (
	"reflect"

	"github.com/erancihan/negotiation-ecs/engine/ecs"
)

// Events is the per-tick event bus, stored as an ECS resource. Systems publish
// typed events with [Emit] and consume them with [Read].
//
// Semantics: events emitted during a tick are readable by any system that runs
// later in the same tick (stage order makes this deterministic — a reader in
// StageLast sees what a writer emitted in StageUpdate). All events are cleared
// at the start of the next tick by the built-in clear system registered at
// StageFirst. Events therefore live for exactly the tick in which they are
// emitted; there is no cross-tick carryover.
type Events struct {
	queues map[reflect.Type]clearable
}

// clearable is the type-erased view of an event queue, so the clear system can
// reset every queue without knowing concrete event types.
type clearable interface{ clear() }

type eventQueue[T any] struct{ items []T }

func (q *eventQueue[T]) clear() { q.items = q.items[:0] }

// eventsOf returns the Events resource, creating it if absent.
func eventsOf(w *ecs.World) *Events {
	if e, ok := ecs.GetResource[Events](w); ok {
		return e
	}
	ecs.SetResource(w, Events{queues: make(map[reflect.Type]clearable)})
	e, _ := ecs.GetResource[Events](w)
	return e
}

// Emit publishes an event of type T for this tick.
func Emit[T any](w *ecs.World, ev T) {
	e := eventsOf(w)
	t := reflect.TypeFor[T]()
	q, ok := e.queues[t]
	if !ok {
		nq := &eventQueue[T]{}
		e.queues[t] = nq
		q = nq
	}
	tq := q.(*eventQueue[T])
	tq.items = append(tq.items, ev)
}

// Read returns the events of type T emitted so far this tick. The slice is owned
// by the bus — copy it if it must outlive the tick.
func Read[T any](w *ecs.World) []T {
	e := eventsOf(w)
	if q, ok := e.queues[reflect.TypeFor[T]()]; ok {
		return q.(*eventQueue[T]).items
	}
	return nil
}

// clearEventsSystem empties every event queue. It is registered at StageFirst so
// each tick starts with a clean bus.
func clearEventsSystem(w *ecs.World) {
	e := eventsOf(w)
	for _, q := range e.queues {
		q.clear()
	}
}
