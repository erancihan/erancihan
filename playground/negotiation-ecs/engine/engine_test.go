package engine

import (
	"context"
	"math"
	"testing"
	"time"

	"github.com/erancihan/negotiation-ecs/engine/ecs"
)

// -----------------------------------------------------------------------------
// Schedule ordering
// -----------------------------------------------------------------------------

func TestStageExecutionOrder(t *testing.T) {
	a := New().WithMaxTicks(1)

	var order []string
	mark := func(label string) System {
		return func(*ecs.World) { order = append(order, label) }
	}

	// Register out of stage order to prove the schedule, not registration,
	// determines stage sequencing.
	a.AddSystem(StageLast, mark("last"))
	a.AddSystem(StageFirst, mark("first"))
	a.AddSystem(StagePostUpdate, mark("post"))
	a.AddSystem(StageUpdate, mark("update"))
	a.AddSystem(StagePreUpdate, mark("pre"))

	_ = a.Run(context.Background())

	want := []string{"first", "pre", "update", "post", "last"}
	if len(order) != len(want) {
		t.Fatalf("order = %v, want %v", order, want)
	}
	for i := range want {
		if order[i] != want[i] {
			t.Fatalf("order = %v, want %v", order, want)
		}
	}
}

func TestRegistrationOrderWithinStage(t *testing.T) {
	a := New().WithMaxTicks(1)

	var order []string
	a.AddSystem(StageUpdate, func(*ecs.World) { order = append(order, "a") })
	a.AddSystem(StageUpdate, func(*ecs.World) { order = append(order, "b") })
	a.AddSystem(StageUpdate, func(*ecs.World) { order = append(order, "c") })

	_ = a.Run(context.Background())

	if len(order) != 3 || order[0] != "a" || order[1] != "b" || order[2] != "c" {
		t.Fatalf("within-stage order = %v, want [a b c]", order)
	}
}

// -----------------------------------------------------------------------------
// Startup & time
// -----------------------------------------------------------------------------

func TestStartupRunsOnceBeforeTicks(t *testing.T) {
	a := New().WithMaxTicks(3)

	startups := 0
	a.AddStartupSystem(func(*ecs.World) { startups++ })

	firstTickSeen := uint64(0)
	a.AddSystem(StageUpdate, func(w *ecs.World) {
		if firstTickSeen == 0 {
			firstTickSeen = ecs.MustResource[Time](w).Tick
		}
	})

	_ = a.Run(context.Background())

	if startups != 1 {
		t.Fatalf("startup ran %d times, want 1", startups)
	}
	if firstTickSeen != 1 {
		t.Fatalf("first tick observed = %d, want 1", firstTickSeen)
	}
}

func TestTimeAdvances(t *testing.T) {
	a := New().WithTickRate(20).WithMaxTicks(5)
	_ = a.Run(context.Background())

	tm := ecs.MustResource[Time](a.World)
	if tm.Tick != 5 {
		t.Fatalf("Tick = %d, want 5", tm.Tick)
	}
	if math.Abs(tm.Delta-0.05) > 1e-9 {
		t.Fatalf("Delta = %v, want 0.05", tm.Delta)
	}
	if math.Abs(tm.Elapsed-0.25) > 1e-9 {
		t.Fatalf("Elapsed = %v, want 0.25", tm.Elapsed)
	}
}

func TestStepRunsSingleTick(t *testing.T) {
	a := New() // no max ticks, driven manually
	a.Step()
	a.Step()
	if got := ecs.MustResource[Time](a.World).Tick; got != 2 {
		t.Fatalf("Tick after 2 Steps = %d, want 2", got)
	}
}

// -----------------------------------------------------------------------------
// Loop control
// -----------------------------------------------------------------------------

func TestUnboundedStopsAtMaxTicks(t *testing.T) {
	a := New().WithMaxTicks(1000)
	_ = a.Run(context.Background())
	if got := ecs.MustResource[Time](a.World).Tick; got != 1000 {
		t.Fatalf("Tick = %d, want 1000", got)
	}
}

func TestContextCancelStopsLoop(t *testing.T) {
	a := New() // unbounded, no tick limit — only the context can stop it

	stop := 0
	a.AddSystem(StageUpdate, func(w *ecs.World) {
		if ecs.MustResource[Time](w).Tick >= 50 {
			stop++
		}
	})

	ctx, cancel := context.WithCancel(context.Background())
	a.AddSystem(StageLast, func(w *ecs.World) {
		if ecs.MustResource[Time](w).Tick >= 50 {
			cancel()
		}
	})

	done := make(chan struct{})
	go func() { _ = a.Run(ctx); close(done) }()

	select {
	case <-done:
	case <-time.After(2 * time.Second):
		t.Fatal("Run did not stop after context cancel")
	}
	if got := ecs.MustResource[Time](a.World).Tick; got < 50 {
		t.Fatalf("Tick = %d, want >= 50", got)
	}
}

func TestRealTimeTickRate(t *testing.T) {
	// High rate, few ticks — proves the paced loop runs without depending on
	// precise wall-clock timing.
	a := New().WithTickRate(1000).WithMaxTicks(3)

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	if err := a.Run(ctx); err != nil {
		t.Fatalf("Run error: %v", err)
	}
	if got := ecs.MustResource[Time](a.World).Tick; got != 3 {
		t.Fatalf("Tick = %d, want 3", got)
	}
}

// -----------------------------------------------------------------------------
// Porting demo: a movement system running on the engine
// -----------------------------------------------------------------------------

type position struct{ X, Y float64 }
type velocity struct{ DX, DY float64 }

// movementPlugin re-homes a movement system onto the engine: spawn an entity at
// startup, integrate velocity into position each tick.
type movementPlugin struct{}

func (movementPlugin) Build(a *App) {
	a.AddStartupSystem(func(w *ecs.World) {
		e := w.NewEntity()
		ecs.Add(w, e, position{X: 0, Y: 0})
		ecs.Add(w, e, velocity{DX: 2, DY: -1})
	})
	a.AddSystem(StageUpdate, func(w *ecs.World) {
		dt := ecs.MustResource[Time](w).Delta
		q := ecs.Query2[position, velocity](w)
		for q.Next() {
			p, v := q.Get()
			p.X += v.DX * dt
			p.Y += v.DY * dt
		}
	})
}

func TestMovementSystemPort(t *testing.T) {
	a := New().WithTickRate(10).WithMaxTicks(5).AddPlugin(movementPlugin{})
	_ = a.Run(context.Background())

	// 5 ticks at dt=0.1 => displacement = velocity * 0.5
	q := ecs.Query2[position, velocity](a.World)
	if !q.Next() {
		t.Fatal("expected one moving entity")
	}
	p, _ := q.Get()
	if math.Abs(p.X-1.0) > 1e-9 || math.Abs(p.Y-(-0.5)) > 1e-9 {
		t.Fatalf("position = %+v, want {1 -0.5}", *p)
	}
}

func TestPluginRegistration(t *testing.T) {
	built := false
	a := New().WithMaxTicks(1).AddPlugin(PluginFunc(func(a *App) {
		built = true
		a.AddSystem(StageUpdate, func(*ecs.World) {})
	}))
	if !built {
		t.Fatal("plugin Build was not called")
	}
	_ = a.Run(context.Background())
}
