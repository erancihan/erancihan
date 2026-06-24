package sim

import (
	"context"
	"testing"

	"github.com/erancihan/negotiation-ecs/backend-go/engine"
	"github.com/erancihan/negotiation-ecs/backend-go/engine/ecs"
)

// testConfig returns a small, seeded configuration for deterministic tests.
func testConfig() Config {
	cfg := DefaultConfig()
	cfg.NumAgents = 40
	cfg.Seed = 42
	return cfg
}

// newApp builds a headless app running the sim plugin for n ticks.
func newApp(cfg Config, ticks uint64) *engine.App {
	return engine.New().WithMaxTicks(ticks).AddPlugin(NewPlugin(cfg))
}

func totalCash(w *ecs.World) float64 {
	var sum float64
	q := ecs.Query1[Inventory](w)
	for q.Next() {
		sum += q.Get().Cash
	}
	return sum
}

func countAgents(w *ecs.World) int {
	n := 0
	q := ecs.Query1[AgentRole](w)
	for q.Next() {
		n++
	}
	return n
}

func TestSpawnCreatesAgents(t *testing.T) {
	cfg := testConfig()
	a := newApp(cfg, 1)
	_ = a.Run(context.Background())

	if got := countAgents(a.World); got != cfg.NumAgents {
		t.Fatalf("spawned %d agents, want %d", got, cfg.NumAgents)
	}
}

func TestMovementStaysInBounds(t *testing.T) {
	cfg := testConfig()
	a := newApp(cfg, 200)
	_ = a.Run(context.Background())

	q := ecs.Query1[Position](a.World)
	for q.Next() {
		p := q.Get()
		if p.X < 0 || p.X > cfg.WorldWidth || p.Y < 0 || p.Y > cfg.WorldHeight {
			t.Fatalf("entity out of bounds: %+v", *p)
		}
	}
}

func TestMovementActuallyMoves(t *testing.T) {
	cfg := testConfig()

	before := newApp(cfg, 1)
	_ = before.Run(context.Background())
	var firstX float64
	if q := ecs.Query1[Position](before.World); q.Next() {
		firstX = q.Get().X
	}

	after := newApp(cfg, 50)
	_ = after.Run(context.Background())
	var laterX float64
	if q := ecs.Query1[Position](after.World); q.Next() {
		laterX = q.Get().X
	}

	if firstX == laterX {
		t.Fatal("expected positions to change over time")
	}
}

func TestNegotiationProducesEvents(t *testing.T) {
	cfg := testConfig()
	a := newApp(cfg, 300)

	total := 0
	a.AddSystem(engine.StageLast, func(w *ecs.World) {
		total += len(engine.Read[NegotiationEvent](w))
	})
	_ = a.Run(context.Background())

	if total == 0 {
		t.Fatal("expected negotiation events over 300 ticks")
	}
}

// TestCashIsConserved is the conservation invariant: the flat cash transfer on
// acceptance only moves cash between agents, so the world total never changes.
func TestCashIsConserved(t *testing.T) {
	cfg := testConfig()
	want := float64(cfg.NumAgents) * cfg.StartingCash

	a := newApp(cfg, 1)
	a.AddSystem(engine.StageLast, func(w *ecs.World) {
		if got := totalCash(w); got != want {
			t.Fatalf("tick %d: total cash = %v, want %v",
				ecs.MustResource[engine.Time](w).Tick, got, want)
		}
	})
	// Re-run for many ticks with the per-tick assertion attached.
	a = newApp(cfg, 500)
	a.AddSystem(engine.StageLast, func(w *ecs.World) {
		if got := totalCash(w); got != want {
			t.Fatalf("tick %d: total cash = %v, want %v",
				ecs.MustResource[engine.Time](w).Tick, got, want)
		}
	})
	_ = a.Run(context.Background())
}

// TestDeterministicWithSeed: identical seeds yield identical event counts.
func TestDeterministicWithSeed(t *testing.T) {
	run := func() int {
		cfg := testConfig()
		a := newApp(cfg, 200)
		total := 0
		a.AddSystem(engine.StageLast, func(w *ecs.World) {
			total += len(engine.Read[NegotiationEvent](w))
		})
		_ = a.Run(context.Background())
		return total
	}

	if a, b := run(), run(); a != b {
		t.Fatalf("seeded runs diverged: %d vs %d", a, b)
	}
}
