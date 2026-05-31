// Package network implements the gRPC server and frame broadcasting
// infrastructure for the negotiation simulation.
package network

import (
	"sync"

	pb "github.com/erancihan/negotiation-ecs/backend-go/gen/proto/negotiationpb"
)

// Broadcaster manages fan-out of SimFrame messages to multiple
// connected observers (visualizers, loggers, etc.).
//
// Thread-safe: multiple goroutines can subscribe/unsubscribe and
// broadcast concurrently.
type Broadcaster struct {
	mu          sync.RWMutex
	subscribers map[uint64]chan *pb.SimFrame
	nextID      uint64
	maxBacklog  int
}

// NewBroadcaster creates a broadcaster with the specified maximum
// backlog per subscriber channel. If a subscriber falls behind by
// more than maxBacklog frames, older frames are dropped.
func NewBroadcaster(maxBacklog int) *Broadcaster {
	return &Broadcaster{
		subscribers: make(map[uint64]chan *pb.SimFrame),
		maxBacklog:  maxBacklog,
	}
}

// Subscribe registers a new observer and returns a channel for receiving
// frames, plus an ID for unsubscribing.
func (b *Broadcaster) Subscribe() (uint64, <-chan *pb.SimFrame) {
	b.mu.Lock()
	defer b.mu.Unlock()

	id := b.nextID
	b.nextID++

	ch := make(chan *pb.SimFrame, b.maxBacklog)
	b.subscribers[id] = ch

	return id, ch
}

// Unsubscribe removes an observer and closes its channel.
func (b *Broadcaster) Unsubscribe(id uint64) {
	b.mu.Lock()
	defer b.mu.Unlock()

	if ch, ok := b.subscribers[id]; ok {
		close(ch)
		delete(b.subscribers, id)
	}
}

// Broadcast sends a frame to all subscribers. If a subscriber's channel
// is full, the oldest frame is dropped to make room (non-blocking).
func (b *Broadcaster) Broadcast(frame *pb.SimFrame) {
	b.mu.RLock()
	defer b.mu.RUnlock()

	for _, ch := range b.subscribers {
		select {
		case ch <- frame:
			// Sent successfully
		default:
			// Channel full — drop the oldest frame and send the new one.
			select {
			case <-ch:
			default:
			}
			select {
			case ch <- frame:
			default:
			}
		}
	}
}

// SubscriberCount returns the current number of active subscribers.
func (b *Broadcaster) SubscriberCount() int {
	b.mu.RLock()
	defer b.mu.RUnlock()
	return len(b.subscribers)
}
