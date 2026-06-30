package engine

import (
	"sync"

	"github.com/erancihan/negotiation-ecs/engine/ecs"
)

// Observer receives a snapshot of type S each tick. Implementations are sinks —
// a local visualizer, a logger, a network stream — and the engine does not care
// which. This keeps the snapshot mechanism transport-agnostic.
type Observer[S any] interface {
	Observe(snapshot S)
}

// ObserverFunc adapts a plain function into an Observer.
type ObserverFunc[S any] func(snapshot S)

// Observe implements Observer.
func (f ObserverFunc[S]) Observe(s S) { f(s) }

// Broadcaster fans out snapshots to any number of subscribers over buffered
// channels. A subscriber that falls behind has its oldest queued snapshot
// dropped to make room, so a slow consumer never blocks the simulation.
//
// It is the generic form of a frame broadcaster; the network layer subscribes a
// channel per connected stream and forwards snapshots over the wire.
type Broadcaster[S any] struct {
	mu      sync.RWMutex
	subs    map[uint64]chan S
	next    uint64
	backlog int
}

// NewBroadcaster creates a broadcaster whose per-subscriber channel buffers up
// to backlog snapshots before old ones are dropped.
func NewBroadcaster[S any](backlog int) *Broadcaster[S] {
	if backlog < 1 {
		backlog = 1
	}
	return &Broadcaster[S]{
		subs:    make(map[uint64]chan S),
		backlog: backlog,
	}
}

// Subscribe registers a new sink and returns its id and receive channel.
func (b *Broadcaster[S]) Subscribe() (uint64, <-chan S) {
	b.mu.Lock()
	defer b.mu.Unlock()

	id := b.next
	b.next++
	ch := make(chan S, b.backlog)
	b.subs[id] = ch
	return id, ch
}

// Unsubscribe removes a sink and closes its channel.
func (b *Broadcaster[S]) Unsubscribe(id uint64) {
	b.mu.Lock()
	defer b.mu.Unlock()

	if ch, ok := b.subs[id]; ok {
		close(ch)
		delete(b.subs, id)
	}
}

// Broadcast delivers s to every subscriber, dropping a subscriber's oldest
// queued snapshot if its buffer is full (non-blocking).
func (b *Broadcaster[S]) Broadcast(s S) {
	b.mu.RLock()
	defer b.mu.RUnlock()

	for _, ch := range b.subs {
		select {
		case ch <- s:
		default:
			// Full — drop the oldest, then enqueue the newest.
			select {
			case <-ch:
			default:
			}
			select {
			case ch <- s:
			default:
			}
		}
	}
}

// Count returns the number of active subscribers.
func (b *Broadcaster[S]) Count() int {
	b.mu.RLock()
	defer b.mu.RUnlock()
	return len(b.subs)
}

// SnapshotSystem returns a System (intended for StageLast) that builds a snapshot
// from the world and broadcasts it — but only when at least one subscriber is
// listening, so an unobserved simulation pays nothing for snapshotting.
func SnapshotSystem[S any](b *Broadcaster[S], build func(*ecs.World) S) System {
	return func(w *ecs.World) {
		if b.Count() == 0 {
			return
		}
		b.Broadcast(build(w))
	}
}
