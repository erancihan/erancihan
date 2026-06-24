package engine

import (
	"context"
	"testing"
	"time"

	"github.com/erancihan/negotiation-ecs/backend-go/engine/ecs"
)

type observation struct {
	tick uint64
	x    float64
}
type moveCommand struct {
	entity ecs.Entity
	dx     float64
}

// -----------------------------------------------------------------------------
// Controllers / actors
// -----------------------------------------------------------------------------

func TestDispatchActorsCollectsCommands(t *testing.T) {
	w := ecs.NewWorld()

	var actors []Actor[observation, moveCommand]
	for i := 0; i < 3; i++ {
		e := w.NewEntity()
		ecs.Add(w, e, struct{ X float64 }{X: float64(i)})
		actors = append(actors, Actor[observation, moveCommand]{
			Entity: e,
			Controller: ControllerFunc[observation, moveCommand](
				func(_ context.Context, o observation) []moveCommand {
					return []moveCommand{{dx: o.x + 1}}
				}),
		})
	}

	cmds := DispatchActors(50*time.Millisecond, actors, func(e ecs.Entity) observation {
		p, _ := ecs.Get[struct{ X float64 }](w, e)
		return observation{x: p.X}
	})

	if len(cmds) != 3 {
		t.Fatalf("got %d commands, want 3", len(cmds))
	}
	sum := 0.0
	for _, c := range cmds {
		sum += c.dx
	}
	if sum != (1 + 2 + 3) { // x in {0,1,2}, +1 each
		t.Fatalf("command sum = %v, want 6", sum)
	}
}

func TestDispatchActorsHonoursDeadline(t *testing.T) {
	fast := Actor[observation, moveCommand]{
		Controller: ControllerFunc[observation, moveCommand](
			func(_ context.Context, _ observation) []moveCommand {
				return []moveCommand{{dx: 1}}
			}),
	}
	// A slow brain that ignores the deadline — its result must be dropped.
	slow := Actor[observation, moveCommand]{
		Controller: ControllerFunc[observation, moveCommand](
			func(_ context.Context, _ observation) []moveCommand {
				time.Sleep(300 * time.Millisecond)
				return []moveCommand{{dx: 99}}
			}),
	}

	start := time.Now()
	cmds := DispatchActors(40*time.Millisecond,
		[]Actor[observation, moveCommand]{fast, slow},
		func(ecs.Entity) observation { return observation{} })
	elapsed := time.Since(start)

	if elapsed > 200*time.Millisecond {
		t.Fatalf("dispatch waited %v — did not honour the deadline", elapsed)
	}
	if len(cmds) != 1 || cmds[0].dx != 1 {
		t.Fatalf("commands = %+v, want only the fast actor's {1}", cmds)
	}
}

func TestDispatchActorsEmpty(t *testing.T) {
	cmds := DispatchActors[observation, moveCommand](
		time.Millisecond, nil, func(ecs.Entity) observation { return observation{} })
	if cmds != nil {
		t.Fatalf("empty dispatch = %+v, want nil", cmds)
	}
}

// -----------------------------------------------------------------------------
// Observers / broadcaster
// -----------------------------------------------------------------------------

func TestBroadcasterDelivers(t *testing.T) {
	b := NewBroadcaster[int](4)
	_, ch := b.Subscribe()

	b.Broadcast(7)
	select {
	case v := <-ch:
		if v != 7 {
			t.Fatalf("received %d, want 7", v)
		}
	case <-time.After(time.Second):
		t.Fatal("no snapshot received")
	}
}

func TestBroadcasterDropsOldestWhenFull(t *testing.T) {
	b := NewBroadcaster[int](2)
	_, ch := b.Subscribe()

	// Send more than the backlog without draining.
	for i := 1; i <= 5; i++ {
		b.Broadcast(i)
	}

	// Buffer holds 2; the oldest were dropped, so we keep the newest two.
	var got []int
	for len(ch) > 0 {
		got = append(got, <-ch)
	}
	if len(got) != 2 || got[len(got)-1] != 5 {
		t.Fatalf("buffered = %v, want last two ending in 5", got)
	}
}

func TestBroadcasterUnsubscribeClosesChannel(t *testing.T) {
	b := NewBroadcaster[int](1)
	id, ch := b.Subscribe()
	if b.Count() != 1 {
		t.Fatalf("Count = %d, want 1", b.Count())
	}

	b.Unsubscribe(id)
	if _, open := <-ch; open {
		t.Fatal("channel should be closed after Unsubscribe")
	}
	if b.Count() != 0 {
		t.Fatalf("Count = %d, want 0", b.Count())
	}
}

func TestSnapshotSystemBroadcastsOnlyWithSubscribers(t *testing.T) {
	b := NewBroadcaster[uint64](4)

	a := New().WithMaxTicks(3)
	a.AddSystem(StageLast, SnapshotSystem(b, func(w *ecs.World) uint64 {
		return ecs.MustResource[Time](w).Tick
	}))

	// No subscribers yet: ticks 1..3 produce nothing.
	_ = a.Run(context.Background())

	// Now subscribe and single-step: we should receive exactly one snapshot.
	_, ch := b.Subscribe()
	a.Step()
	select {
	case v := <-ch:
		if v != 4 {
			t.Fatalf("snapshot tick = %d, want 4", v)
		}
	case <-time.After(time.Second):
		t.Fatal("expected a snapshot after subscribing")
	}
	if len(ch) != 0 {
		t.Fatalf("unexpected extra snapshots queued: %d", len(ch))
	}
}
