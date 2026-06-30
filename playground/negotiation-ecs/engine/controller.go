package engine

import (
	"context"
	"time"

	"github.com/erancihan/negotiation-ecs/engine/ecs"
)

// Controller is a brain: given an observation of type O it returns commands of
// type C. A controller never touches the world directly — it only reads what it
// is given and emits intents. This is the body/brain split: the entity is the
// body, the Controller is the brain.
//
// The context carries the per-tick deadline. In-process controllers can ignore
// it (they return immediately); controllers that do I/O should honour it.
type Controller[O, C any] interface {
	Decide(ctx context.Context, obs O) []C
}

// ControllerFunc adapts a plain function into a Controller.
type ControllerFunc[O, C any] func(ctx context.Context, obs O) []C

// Decide implements Controller.
func (f ControllerFunc[O, C]) Decide(ctx context.Context, obs O) []C { return f(ctx, obs) }

// Actor binds an entity (the body) to a Controller (the brain).
type Actor[O, C any] struct {
	Entity     ecs.Entity
	Controller Controller[O, C]
}

// DispatchActors runs each actor's controller concurrently, bounded by a single
// per-tick deadline, and returns every command produced in time.
//
// Observations are built first via observe, on the calling goroutine, so world
// access stays single-threaded; only the controllers (which must not touch the
// world) run concurrently. A controller that does not answer before the deadline
// contributes no commands this tick — its actor simply holds. This is the hybrid
// execution model: in-process brains return instantly and are always collected;
// slower (e.g. networked) brains are bounded by the frame budget.
//
// The returned commands are not submitted anywhere — the caller decides whether
// to apply them directly or route them through SubmitCommand so that internal
// and external input share one buffer.
func DispatchActors[O, C any](
	deadline time.Duration,
	actors []Actor[O, C],
	observe func(ecs.Entity) O,
) []C {
	if len(actors) == 0 {
		return nil
	}

	// Build observations up front, on the caller's goroutine — safe world reads.
	obs := make([]O, len(actors))
	for i, a := range actors {
		obs[i] = observe(a.Entity)
	}

	ctx, cancel := context.WithTimeout(context.Background(), deadline)
	defer cancel()

	// Buffered so a controller that finishes after the deadline can still send
	// without leaking its goroutine; its result is simply never collected.
	ch := make(chan []C, len(actors))
	for i, a := range actors {
		go func(c Controller[O, C], o O) { ch <- c.Decide(ctx, o) }(a.Controller, obs[i])
	}

	var all []C
	for range actors {
		select {
		case cmds := <-ch:
			all = append(all, cmds...)
		case <-ctx.Done():
			return all
		}
	}
	return all
}
