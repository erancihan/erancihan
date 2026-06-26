// Command agent_client is a Go SDK example for the Multi-Agent Negotiation
// Simulator. It connects over gRPC, streams simulation frames, and participates
// in negotiations as an external agent.
//
// Protocol: an external agent controls one body. Its first proposal claims a
// body (the engine returns the assigned entity id); subsequent proposals are
// decisions for that body when it is the agent's turn to respond. A decision is
// expressed as the offer payload's "action" field — "accept", "reject", or
// (default) a counter-offer.
//
// Usage:
//
//	go run . [--server localhost:50051] [--agent-id go-coop-001]
package main

import (
	"context"
	"encoding/json"
	"flag"
	"io"
	"log"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	pb "github.com/erancihan/negotiation-ecs/backend-go/gen/proto/negotiationpb"
)

// Agent is the interface an external agent implements.
type Agent interface {
	// OnFrame observes the world each tick.
	OnFrame(frame *pb.SimFrame)
	// Decide returns a proposal to submit, or nil to do nothing this frame.
	Decide(frame *pb.SimFrame) *pb.Proposal
	// OnAck receives the result of a submitted proposal (carries the assigned
	// body id on first contact).
	OnAck(ack *pb.ProposalAck)
}

// CooperativeTrader claims a body, then accepts whenever it is its turn to
// respond. A complete, protocol-correct example.
type CooperativeTrader struct {
	AgentID  string
	assigned uint64 // wire id of the body we control (0 until assigned)
	claimed  bool
}

func (a *CooperativeTrader) OnFrame(frame *pb.SimFrame) {
	if frame.GetTick()%100 == 0 {
		log.Printf("[%s] tick %d | body=%d | entities=%d",
			a.AgentID, frame.GetTick(), a.assigned, len(frame.GetEntities()))
	}
}

func (a *CooperativeTrader) Decide(frame *pb.SimFrame) *pb.Proposal {
	// Claim a body on first contact.
	if !a.claimed {
		a.claimed = true
		return a.proposal(map[string]any{"action": "counter", "hello": true})
	}
	if a.assigned == 0 {
		return nil // waiting for the assignment ack
	}
	// If our body is responding (COUNTERING), accept the standing offer.
	for _, e := range frame.GetEntities() {
		if e.GetEntityId() == a.assigned &&
			e.GetNegotiationStatus() == pb.NegotiationStatus_NEGOTIATION_STATUS_COUNTERING {
			return a.proposal(map[string]any{"action": "accept"})
		}
	}
	return nil
}

func (a *CooperativeTrader) OnAck(ack *pb.ProposalAck) {
	if a.assigned == 0 && ack.GetAccepted() {
		a.assigned = ack.GetAssignedEntityId()
		log.Printf("[%s] assigned body %d", a.AgentID, a.assigned)
	}
}

func (a *CooperativeTrader) proposal(offer map[string]any) *pb.Proposal {
	js, _ := json.Marshal(offer)
	return &pb.Proposal{AgentId: a.AgentID, OfferJson: string(js)}
}

func main() {
	serverAddr := flag.String("server", "localhost:50051", "gRPC server address")
	agentID := flag.String("agent-id", "go-coop-001", "agent identifier")
	flag.Parse()

	conn, err := grpc.NewClient(*serverAddr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatalf("connect: %v", err)
	}
	defer conn.Close()

	client := pb.NewSimulationServiceClient(conn)
	agent := &CooperativeTrader{AgentID: *agentID}
	log.Printf("[%s] connected to %s", *agentID, *serverAddr)

	stream, err := client.StreamSimulation(context.Background(), &pb.StreamRequest{MaxFps: 10})
	if err != nil {
		log.Fatalf("stream: %v", err)
	}

	for {
		frame, err := stream.Recv()
		if err == io.EOF {
			log.Printf("[%s] stream ended", *agentID)
			return
		}
		if err != nil {
			log.Fatalf("[%s] stream error: %v", *agentID, err)
		}

		agent.OnFrame(frame)
		if proposal := agent.Decide(frame); proposal != nil {
			ack, err := client.SubmitProposal(context.Background(), proposal)
			if err != nil {
				log.Printf("[%s] proposal error: %v", *agentID, err)
				continue
			}
			agent.OnAck(ack)
		}
	}
}
