package boids

import (
	"context"
	"go/build"
	"strings"
	"testing"

	"github.com/erancihan/negotiation-ecs/engine"
	"github.com/erancihan/negotiation-ecs/engine/ecs"
)

func run(ticks uint64, seed int64) *engine.App {
	cfg := DefaultConfig()
	cfg.Seed = seed
	a := engine.New().WithMaxTicks(ticks).AddPlugin(NewPlugin(cfg))
	a.Run(context.Background())
	return a
}

func TestSpawn(t *testing.T) {
	a := run(1, 1)
	n := 0
	q := ecs.Query1[Position](a.World)
	for q.Next() {
		n++
	}
	if want := DefaultConfig().NumBoids; n != want {
		t.Fatalf("spawned %d boids, want %d", n, want)
	}
}

// TestFlockingAligns: from random headings the flock should self-organize, so
// the alignment order parameter rises substantially over the run.
func TestFlockingAligns(t *testing.T) {
	cfg := DefaultConfig()
	cfg.Seed = 7
	a := engine.New().WithMaxTicks(0).AddPlugin(NewPlugin(cfg))
	a.Start()

	a.Step()
	start := Alignment(a.World)

	for i := 0; i < 400; i++ {
		a.Step()
	}
	end := Alignment(a.World)

	if end <= start {
		t.Fatalf("flock did not align: start=%.3f end=%.3f", start, end)
	}
	if end < 0.5 {
		t.Fatalf("alignment too weak: end=%.3f, want >= 0.5", end)
	}
	t.Logf("alignment start=%.3f end=%.3f", start, end)
}

func TestBoidsDeterministic(t *testing.T) {
	mag := func(a *engine.App) (float64, int) {
		al := Alignment(a.World)
		n := 0
		q := ecs.Query1[Position](a.World)
		for q.Next() {
			n++
		}
		return al, n
	}
	a1, n1 := mag(run(300, 2024))
	a2, n2 := mag(run(300, 2024))
	if a1 != a2 || n1 != n2 {
		t.Fatalf("seeded boids diverged: (%.6f,%d) vs (%.6f,%d)", a1, n1, a2, n2)
	}
}

// TestBoidsReuseEngineOnly is the extraction proof: this demo must depend only
// on the engine core, never on the negotiation domain or transport.
func TestBoidsReuseEngineOnly(t *testing.T) {
	pkg, err := build.ImportDir(".", 0)
	if err != nil {
		t.Fatalf("import dir: %v", err)
	}

	forbidden := []string{
		"negotiation-ecs/backend-go/internal", // sim, economy, transport
		"negotiation-ecs/backend-go/gen/proto",
		"google.golang.org/grpc",
	}
	for _, imp := range pkg.Imports {
		for _, bad := range forbidden {
			if strings.Contains(imp, bad) {
				t.Errorf("boids imports %q — it must reuse only the engine core", imp)
			}
		}
	}
}
