// Command server runs the multi-agent negotiation simulation on the engine.
//
// Usage:
//
//	go run ./cmd/server [flags]
//
// Flags:
//
//	--headless      Disable the gRPC server (benchmark mode)
//	--port          gRPC server port (default: 50051)
//	--agents        Number of agent entities (default: 50)
//	--tick-rate     Simulation tick rate in Hz (0 = unbounded)
//	--seed          RNG seed for deterministic runs (0 = random)
//	--max-ticks     Stop after N ticks (0 = unlimited)
//	--world-width   World width
//	--world-height  World height
package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"net"
	"os/signal"
	"syscall"
	"time"

	"google.golang.org/grpc"

	"github.com/erancihan/negotiation-ecs/backend-go/engine"
	"github.com/erancihan/negotiation-ecs/backend-go/engine/ecs"
	pb "github.com/erancihan/negotiation-ecs/backend-go/gen/proto/negotiationpb"
	"github.com/erancihan/negotiation-ecs/backend-go/internal/sim"
	"github.com/erancihan/negotiation-ecs/backend-go/internal/transport"
)

func main() {
	headless := flag.Bool("headless", false, "Run without gRPC server (benchmark mode)")
	port := flag.Int("port", 50051, "gRPC server port")
	agents := flag.Int("agents", 50, "Number of agent entities to spawn")
	tickRate := flag.Int("tick-rate", 20, "Simulation tick rate in Hz (0 = unbounded)")
	seed := flag.Int64("seed", 0, "RNG seed (0 = random)")
	maxTicks := flag.Uint64("max-ticks", 0, "Stop after N ticks (0 = unlimited)")
	worldWidth := flag.Float64("world-width", 1000.0, "World width")
	worldHeight := flag.Float64("world-height", 1000.0, "World height")
	flag.Parse()

	cfg := sim.DefaultConfig()
	cfg.NumAgents = *agents
	cfg.WorldWidth = *worldWidth
	cfg.WorldHeight = *worldHeight
	cfg.Seed = *seed

	log.Printf("=== ECS Multi-Agent Negotiation Simulator ===")
	log.Printf("Agents: %d | Tick Rate: %d Hz | Headless: %v | Seed: %d",
		cfg.NumAgents, *tickRate, *headless, cfg.Seed)

	app := engine.New().
		WithTickRate(*tickRate).
		WithMaxTicks(*maxTicks).
		AddPlugin(sim.NewPlugin(cfg))

	// Initialize the world (spawn agents, install resources) before serving, so
	// read RPCs never race ahead of world setup.
	app.Start()
	log.Printf("World initialized: %.0fx%.0f | %d agents spawned",
		cfg.WorldWidth, cfg.WorldHeight, countAgents(app.World))

	var grpcServer *grpc.Server
	if !*headless {
		broadcaster := engine.NewBroadcaster[*pb.SimFrame](100)
		app.AddSystem(engine.StageLast, engine.SnapshotSystem(broadcaster, transport.BuildFrame))

		grpcServer = grpc.NewServer()
		pb.RegisterSimulationServiceServer(grpcServer, transport.NewServer(app, broadcaster))

		lis, err := net.Listen("tcp", fmt.Sprintf(":%d", *port))
		if err != nil {
			log.Fatalf("failed to listen on port %d: %v", *port, err)
		}
		go func() {
			log.Printf("gRPC server listening on :%d", *port)
			if err := grpcServer.Serve(lis); err != nil {
				log.Fatalf("gRPC server error: %v", err)
			}
		}()
	}

	// Progress logging.
	start := time.Now()
	logEvery := uint64(100)
	if *tickRate > 0 {
		logEvery = uint64(*tickRate * 5)
	}
	app.AddSystem(engine.StageLast, func(w *ecs.World) {
		t := ecs.MustResource[engine.Time](w)
		if logEvery > 0 && t.Tick%logEvery == 0 {
			elapsed := time.Since(start)
			log.Printf("Tick %d (%.1fs sim time) | %.1f ticks/sec",
				t.Tick, t.Elapsed, float64(t.Tick)/elapsed.Seconds())
		}
	})

	// Run until interrupted or max ticks reached.
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	log.Printf("Simulation started")
	if err := app.Run(ctx); err != nil {
		log.Printf("loop error: %v", err)
	}

	if grpcServer != nil {
		grpcServer.GracefulStop()
	}

	elapsed := time.Since(start)
	tick, _ := finalClock(app.World)
	log.Printf("Simulation stopped after %d ticks in %v (%.1f ticks/sec)",
		tick, elapsed.Round(time.Millisecond), float64(tick)/elapsed.Seconds())
}

func countAgents(w *ecs.World) int {
	n := 0
	q := ecs.Query1[sim.AgentRole](w)
	for q.Next() {
		n++
	}
	return n
}

func finalClock(w *ecs.World) (uint64, float64) {
	if t, ok := ecs.GetResource[engine.Time](w); ok {
		return t.Tick, t.Elapsed
	}
	return 0, 0
}
