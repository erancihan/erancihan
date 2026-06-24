package engine

import (
	"context"
	"sync"
	"testing"

	"github.com/erancihan/negotiation-ecs/backend-go/engine/ecs"
)

type pingEvent struct{ N int }
type spawnCommand struct{ ID string }

// -----------------------------------------------------------------------------
// Events
// -----------------------------------------------------------------------------

func TestEmitAndReadSameTick(t *testing.T) {
	a := New().WithMaxTicks(1)

	a.AddSystem(StageUpdate, func(w *ecs.World) {
		Emit(w, pingEvent{N: 1})
		Emit(w, pingEvent{N: 2})
	})

	var got []pingEvent
	a.AddSystem(StageLast, func(w *ecs.World) {
		got = append(got, Read[pingEvent](w)...)
	})

	_ = a.Run(context.Background())

	if len(got) != 2 || got[0].N != 1 || got[1].N != 2 {
		t.Fatalf("read events = %+v, want [{1} {2}]", got)
	}
}

func TestEventsClearedNextTick(t *testing.T) {
	a := New().WithMaxTicks(3)

	// Emit only on tick 1.
	a.AddSystem(StageUpdate, func(w *ecs.World) {
		if ecs.MustResource[Time](w).Tick == 1 {
			Emit(w, pingEvent{N: 42})
		}
	})

	readsPerTick := map[uint64]int{}
	a.AddSystem(StageLast, func(w *ecs.World) {
		tick := ecs.MustResource[Time](w).Tick
		readsPerTick[tick] = len(Read[pingEvent](w))
	})

	_ = a.Run(context.Background())

	if readsPerTick[1] != 1 {
		t.Fatalf("tick 1 reads = %d, want 1", readsPerTick[1])
	}
	if readsPerTick[2] != 0 || readsPerTick[3] != 0 {
		t.Fatalf("events leaked across ticks: %v", readsPerTick)
	}
}

func TestReadMissingEventType(t *testing.T) {
	a := New()
	a.Step()
	if got := Read[pingEvent](a.World); got != nil {
		t.Fatalf("Read of never-emitted type = %v, want nil", got)
	}
}

// -----------------------------------------------------------------------------
// Commands
// -----------------------------------------------------------------------------

func TestSubmitAndDrainCommands(t *testing.T) {
	a := New()
	a.start()

	SubmitCommand(a.World, spawnCommand{ID: "a"})
	SubmitCommand(a.World, spawnCommand{ID: "b"})

	got := DrainCommands[spawnCommand](a.World)
	if len(got) != 2 || got[0].ID != "a" || got[1].ID != "b" {
		t.Fatalf("drained = %+v, want [{a} {b}]", got)
	}

	// Draining consumes — a second drain is empty.
	if again := DrainCommands[spawnCommand](a.World); len(again) != 0 {
		t.Fatalf("second drain = %+v, want empty", again)
	}
}

func TestCommandsDrainedBySystem(t *testing.T) {
	a := New().WithMaxTicks(1)
	a.start() // so we can submit before Run

	SubmitCommand(a.World, spawnCommand{ID: "x"})

	var spawned []string
	a.AddSystem(StagePreUpdate, func(w *ecs.World) {
		for _, c := range DrainCommands[spawnCommand](w) {
			spawned = append(spawned, c.ID)
		}
	})

	_ = a.Run(context.Background())

	if len(spawned) != 1 || spawned[0] != "x" {
		t.Fatalf("spawned = %v, want [x]", spawned)
	}
}

// TestConcurrentCommandSubmission mirrors the real use: network goroutines
// submit commands while the loop drains them. Run with -race.
func TestConcurrentCommandSubmission(t *testing.T) {
	a := New()
	a.start()

	const writers = 8
	const each = 100

	drained := 0
	stop := make(chan struct{})
	var drainWG sync.WaitGroup
	drainWG.Add(1)
	go func() {
		defer drainWG.Done()
		for {
			drained += len(DrainCommands[spawnCommand](a.World))
			select {
			case <-stop:
				// Final drain to catch stragglers.
				drained += len(DrainCommands[spawnCommand](a.World))
				return
			default:
			}
		}
	}()

	var wg sync.WaitGroup
	for i := 0; i < writers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := 0; j < each; j++ {
				SubmitCommand(a.World, spawnCommand{ID: "c"})
			}
		}()
	}
	wg.Wait()
	close(stop)
	drainWG.Wait()

	if drained != writers*each {
		t.Fatalf("drained %d commands, want %d", drained, writers*each)
	}
}
