// Package agent provides a Go SDK client for the Multi-Agent Negotiation
// Simulator. External agents can connect to the simulation engine via gRPC
// and participate in negotiations.
//
// Usage:
//
//	go run agent_client.go [--server localhost:50051] [--agent-id go-agent-001]
package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"math/rand"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	pb "github.com/erancihan/negotiation-ecs/backend-go/gen/proto/negotiationpb"
)

// Agent defines the interface for a negotiation agent.
type Agent interface {
	// OnFrame is called for each simulation frame received.
	OnFrame(frame *pb.SimFrame)

	// Decide is called after each frame to determine if a proposal
	// should be submitted. Returns nil if no action is needed.
	Decide(frame *pb.SimFrame) *pb.Proposal
}

// RandomAgent is an example agent that makes random offers.
type RandomAgent struct {
	AgentID      string
	rng          *rand.Rand
	frameCount   int
	offerEveryN  int
}

func NewRandomAgent(agentID string) *RandomAgent {
	return &RandomAgent{
		AgentID:     agentID,
		rng:         rand.New(rand.NewSource(time.Now().UnixNano())),
		offerEveryN: 50,
	}
}

func (a *RandomAgent) OnFrame(frame *pb.SimFrame) {
	a.frameCount++
	if frame.GetTick()%100 == 0 {
		log.Printf("[%s] Tick %d | Entities: %d | Events: %d",
			a.AgentID, frame.GetTick(), len(frame.GetEntities()), len(frame.GetEvents()))
	}
}

func (a *RandomAgent) Decide(frame *pb.SimFrame) *pb.Proposal {
	if a.frameCount%a.offerEveryN != 0 {
		return nil
	}

	entities := frame.GetEntities()
	if len(entities) == 0 {
		return nil
	}

	target := entities[a.rng.Intn(len(entities))]
	assets := []string{"gold", "silver", "oil"}

	offer := map[string]interface{}{
		"offer_cash":     a.rng.Intn(100) + 10,
		"request_asset":  assets[a.rng.Intn(len(assets))],
		"request_amount": a.rng.Intn(10) + 1,
	}

	offerJSON, _ := json.Marshal(offer)
	log.Printf("[%s] Submitting offer to entity %d: %s",
		a.AgentID, target.GetEntityId(), string(offerJSON))

	return &pb.Proposal{
		AgentId:        a.AgentID,
		TargetEntityId: target.GetEntityId(),
		OfferJson:      string(offerJSON),
	}
}

func main() {
	serverAddr := flag.String("server", "localhost:50051", "gRPC server address")
	agentID := flag.String("agent-id", "go-random-001", "Agent identifier")
	flag.Parse()

	// Connect to the simulation server
	conn, err := grpc.NewClient(*serverAddr,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		log.Fatalf("Failed to connect: %v", err)
	}
	defer conn.Close()

	client := pb.NewSimulationServiceClient(conn)
	log.Printf("[%s] Connected to %s", *agentID, *serverAddr)

	// Create agent
	agent := NewRandomAgent(*agentID)

	// Start streaming frames
	ctx := context.Background()
	stream, err := client.StreamSimulation(ctx, &pb.StreamRequest{MaxFps: 10})
	if err != nil {
		log.Fatalf("Failed to start stream: %v", err)
	}

	log.Printf("[%s] Streaming frames...", *agentID)

	for {
		frame, err := stream.Recv()
		if err == io.EOF {
			log.Printf("[%s] Stream ended", *agentID)
			break
		}
		if err != nil {
			log.Fatalf("[%s] Stream error: %v", *agentID, err)
		}

		agent.OnFrame(frame)

		if proposal := agent.Decide(frame); proposal != nil {
			ack, err := client.SubmitProposal(ctx, proposal)
			if err != nil {
				log.Printf("[%s] Proposal error: %v", *agentID, err)
				continue
			}
			status := "rejected"
			if ack.GetAccepted() {
				status = "accepted"
			}
			fmt.Printf("[%s] Proposal %s: %s\n", *agentID, status, ack.GetReason())
		}
	}
}
