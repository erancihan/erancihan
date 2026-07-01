// Command boids runs the flocking demo headlessly. It exists to show the engine
// core driving a completely different simulation from the negotiation server,
// with no shared domain code.
//
// Usage:
//
//	go run ./cmd/boids [flags]
package main

import (
	"context"
	"flag"
	"log"
	"os/signal"
	"syscall"

	"github.com/erancihan/negotiation-ecs/engine"
	"github.com/erancihan/negotiation-ecs/engine/ecs"
	"github.com/erancihan/negotiation-ecs/backend-go/examples/boids"
)

func main() {
	n := flag.Int("boids", 80, "number of boids")
	ticks := flag.Uint64("max-ticks", 1000, "stop after N ticks (0 = unlimited)")
	tickRate := flag.Int("tick-rate", 0, "tick rate in Hz (0 = unbounded)")
	seed := flag.Int64("seed", 0, "RNG seed (0 = random)")
	flag.Parse()

	cfg := boids.DefaultConfig()
	cfg.NumBoids = *n
	cfg.Seed = *seed

	app := engine.New().
		WithTickRate(*tickRate).
		WithMaxTicks(*ticks).
		AddPlugin(boids.NewPlugin(cfg))

	app.AddSystem(engine.StageLast, func(w *ecs.World) {
		t := ecs.MustResource[engine.Time](w)
		if t.Tick%100 == 0 {
			log.Printf("tick %d | flock alignment %.3f", t.Tick, boids.Alignment(w))
		}
	})

	log.Printf("=== Boids (engine reuse demo) === %d boids, seed %d", cfg.NumBoids, cfg.Seed)
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	_ = app.Run(ctx)
	log.Printf("final alignment %.3f", boids.Alignment(app.World))
}
