package engine

import (
	"reflect"
	"sync"

	"github.com/erancihan/negotiation-ecs/backend-go/engine/ecs"
)

// Commands is the inbound command buffer, stored as an ECS resource. It is the
// single channel by which input from outside the loop — external controllers,
// network handlers — enters the simulation.
//
// Unlike events, commands are submitted from other goroutines (e.g. a gRPC
// handler) while the loop runs, so access is mutex-guarded. Systems drain
// commands in StagePreUpdate and apply them; draining consumes them.
type Commands struct {
	mu     sync.Mutex
	queues map[reflect.Type]any // reflect.Type -> *[]T
}

// commandsOf returns the Commands resource, creating it if absent. The App
// pre-creates it during startup so that concurrent submitters never race to
// create it (only the guarded per-type queues mutate after that).
func commandsOf(w *ecs.World) *Commands {
	if c, ok := ecs.GetResource[Commands](w); ok {
		return c
	}
	ecs.SetResource(w, Commands{queues: make(map[reflect.Type]any)})
	c, _ := ecs.GetResource[Commands](w)
	return c
}

// SubmitCommand enqueues a command of type T. Safe to call from any goroutine.
func SubmitCommand[T any](w *ecs.World, cmd T) {
	c := commandsOf(w)
	c.mu.Lock()
	defer c.mu.Unlock()

	t := reflect.TypeFor[T]()
	q, ok := c.queues[t]
	if !ok {
		nq := &[]T{}
		c.queues[t] = nq
		q = nq
	}
	p := q.(*[]T)
	*p = append(*p, cmd)
}

// DrainCommands removes and returns all pending commands of type T. Safe to call
// from any goroutine, but intended for the loop's systems.
func DrainCommands[T any](w *ecs.World) []T {
	c := commandsOf(w)
	c.mu.Lock()
	defer c.mu.Unlock()

	if q, ok := c.queues[reflect.TypeFor[T]()]; ok {
		p := q.(*[]T)
		out := *p
		*p = nil
		return out
	}
	return nil
}
