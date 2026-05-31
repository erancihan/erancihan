// Command server runs the headless multi-agent negotiation simulation.
//
// Usage:
//
//	go run ./cmd/server [flags]
//
// Flags:
//
//	--headless      Disable gRPC broadcasting (benchmark mode)
//	--port          gRPC server port (default: 50051)
//	--agents        Number of agent entities (default: 50)
//	--tick-rate     Simulation tick rate in Hz (default: 20)
//	--seed          RNG seed for deterministic runs (default: 0 = random)
//	--max-ticks     Stop after N ticks (0 = unlimited)
package main

import (
	"flag"
	"fmt"
	"log"
	"net"
	"os"
	"os/signal"
	"syscall"
	"time"

	"google.golang.org/grpc"

	pb "github.com/erancihan/negotiation-ecs/backend-go/gen/proto/negotiationpb"
	"github.com/erancihan/negotiation-ecs/backend-go/internal/ecs"
	"github.com/erancihan/negotiation-ecs/backend-go/internal/network"
)

func main() {
	// -------------------------------------------------------------------------
	// CLI Flags
	// -------------------------------------------------------------------------
	headless := flag.Bool("headless", false, "Run without gRPC server (benchmark mode)")
	port := flag.Int("port", 50051, "gRPC server port")
	agents := flag.Int("agents", 50, "Number of agent entities to spawn")
	tickRate := flag.Int("tick-rate", 20, "Simulation tick rate in Hz")
	seed := flag.Int64("seed", 0, "RNG seed (0 = random)")
	maxTicks := flag.Uint64("max-ticks", 0, "Stop after N ticks (0 = unlimited)")
	worldWidth := flag.Float64("world-width", 1000.0, "World width")
	worldHeight := flag.Float64("world-height", 1000.0, "World height")
	flag.Parse()

	// -------------------------------------------------------------------------
	// World Configuration
	// -------------------------------------------------------------------------
	cfg := ecs.DefaultWorldConfig()
	cfg.NumAgents = *agents
	cfg.WorldWidth = *worldWidth
	cfg.WorldHeight = *worldHeight
	cfg.Seed = *seed

	log.Printf("=== ECS Multi-Agent Negotiation Simulator ===")
	log.Printf("Agents: %d | Tick Rate: %d Hz | Headless: %v | Seed: %d",
		cfg.NumAgents, *tickRate, *headless, cfg.Seed)

	// -------------------------------------------------------------------------
	// Initialize ECS World
	// -------------------------------------------------------------------------
	simWorld := ecs.NewSimWorld(cfg)
	if *tickRate > 0 {
		simWorld.DeltaTime = 1.0 / float64(*tickRate)
	} else {
		simWorld.DeltaTime = 0.05 // default 50ms for deterministic unbounded mode
	}
	simWorld.SpawnAgents()
	log.Printf("World initialized: %dx%d | %d agents spawned",
		int(cfg.WorldWidth), int(cfg.WorldHeight), cfg.NumAgents)

	// -------------------------------------------------------------------------
	// Network Layer (unless headless)
	// -------------------------------------------------------------------------
	var broadcaster *network.Broadcaster
	var grpcServer *grpc.Server
	var simServer *network.SimulationServer

	if !*headless {
		broadcaster = network.NewBroadcaster(100)
		simServer = network.NewSimulationServer(simWorld, broadcaster)

		grpcServer = grpc.NewServer()
		pb.RegisterSimulationServiceServer(grpcServer, simServer)

		lis, err := net.Listen("tcp", fmt.Sprintf(":%d", *port))
		if err != nil {
			log.Fatalf("Failed to listen on port %d: %v", *port, err)
		}

		go func() {
			log.Printf("gRPC server listening on :%d", *port)
			if err := grpcServer.Serve(lis); err != nil {
				log.Fatalf("gRPC server error: %v", err)
			}
		}()
	}

	// -------------------------------------------------------------------------
	// Graceful Shutdown
	// -------------------------------------------------------------------------
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	// -------------------------------------------------------------------------
	// Game Loop
	// -------------------------------------------------------------------------
	startTime := time.Now()
	var tickCount uint64

	// runTick executes one simulation step.
	runTick := func() bool {
		// Check for shutdown signal (non-blocking)
		select {
		case <-sigCh:
			log.Printf("Shutdown signal received. Ticks completed: %d", tickCount)
			if grpcServer != nil {
				grpcServer.GracefulStop()
			}
			elapsed := time.Since(startTime)
			log.Printf("Simulation ran for %v (%d ticks, %.1f ticks/sec)",
				elapsed, tickCount, float64(tickCount)/elapsed.Seconds())
			return false
		default:
		}

		// Check control commands (only if networked)
		if simServer != nil {
			if simServer.ShouldReset() {
				simWorld = ecs.NewSimWorld(cfg)
				if *tickRate > 0 {
					simWorld.DeltaTime = 1.0 / float64(*tickRate)
				}
				simWorld.SpawnAgents()
				simServer.SimWorld = simWorld
				tickCount = 0
				log.Printf("Simulation reset")
				return true
			}

			if simServer.IsPaused() && !simServer.ShouldStep() {
				return true
			}
		}

		// --- Run Systems ---
		var events []ecs.NegotiationEvent

		ecs.RunMovementSystem(simWorld)
		ecs.RunTimeoutSystem(simWorld, &events)
		ecs.RunNegotiationSystem(simWorld, &events)

		simWorld.Tick()
		tickCount++

		// --- Broadcast Frame ---
		if broadcaster != nil && broadcaster.SubscriberCount() > 0 {
			entities := network.CollectEntityStates(simWorld)
			protoEvents := network.ConvertEvents(events)

			activeNeg := uint32(0)
			completedNeg := uint32(0)
			timedOut := uint32(0)
			for _, e := range protoEvents {
				switch e.GetAction() {
				case pb.NegotiationAction_NEGOTIATION_ACTION_ACCEPTED:
					completedNeg++
				case pb.NegotiationAction_NEGOTIATION_ACTION_TIMEOUT:
					timedOut++
				}
			}
			for _, ent := range entities {
				if ent.GetNegotiationStatus() == pb.NegotiationStatus_NEGOTIATION_STATUS_OFFERING ||
					ent.GetNegotiationStatus() == pb.NegotiationStatus_NEGOTIATION_STATUS_COUNTERING {
					activeNeg++
				}
			}

			frame := &pb.SimFrame{
				Tick:      simWorld.CurrentTick,
				Timestamp: simWorld.LogicalTime(),
				Entities:  entities,
				Events:    protoEvents,
				Stats: &pb.TickStats{
					TotalEntities:         uint32(len(entities)),
					ActiveNegotiations:    activeNeg,
					CompletedNegotiations: completedNeg,
					TimedOutNegotiations:  timedOut,
				},
			}
			broadcaster.Broadcast(frame)
		}

		// --- Progress Logging ---
		logInterval := uint64(100)
		if *tickRate > 0 {
			logInterval = uint64(*tickRate * 5)
		}
		if logInterval > 0 && tickCount%logInterval == 0 {
			elapsed := time.Since(startTime)
			log.Printf("Tick %d (%.1fs sim time) | %.1f ticks/sec | %d events this tick",
				tickCount, simWorld.LogicalTime(),
				float64(tickCount)/elapsed.Seconds(),
				len(events))
		}

		// --- Max Ticks Limit ---
		if *maxTicks > 0 && tickCount >= *maxTicks {
			elapsed := time.Since(startTime)
			log.Printf("Max ticks reached (%d). Shutting down.", *maxTicks)
			log.Printf("Simulation ran for %v (%.1f ticks/sec)",
				elapsed, float64(tickCount)/elapsed.Seconds())
			if grpcServer != nil {
				grpcServer.GracefulStop()
			}
			return false
		}

		return true
	}

	// Select loop mode based on tick rate
	if *tickRate > 0 {
		// Real-time mode: use a ticker
		tickDuration := time.Duration(float64(time.Second) / float64(*tickRate))
		ticker := time.NewTicker(tickDuration)
		defer ticker.Stop()

		log.Printf("Simulation started (tick interval: %v)", tickDuration)

		for {
			<-ticker.C
			if !runTick() {
				return
			}
		}
	} else {
		// Unbounded mode: tight loop (headless benchmarking)
		log.Printf("Simulation started (unbounded speed)")

		for runTick() {
			// tight loop — no sleep
		}
	}
}
