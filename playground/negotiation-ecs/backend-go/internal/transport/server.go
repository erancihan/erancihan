package transport

import (
	"context"
	"log"

	"github.com/erancihan/negotiation-ecs/backend-go/engine"
	"github.com/erancihan/negotiation-ecs/backend-go/engine/ecs"
	pb "github.com/erancihan/negotiation-ecs/backend-go/gen/proto/negotiationpb"
	"github.com/erancihan/negotiation-ecs/backend-go/internal/sim"
)

// Server implements the gRPC SimulationService against a running engine App.
type Server struct {
	pb.UnimplementedSimulationServiceServer

	app         *engine.App
	broadcaster *engine.Broadcaster[*pb.SimFrame]
}

// NewServer wires the gRPC service to an App and its frame broadcaster. The App
// must be Started before serving so world resources exist for read RPCs.
func NewServer(app *engine.App, b *engine.Broadcaster[*pb.SimFrame]) *Server {
	return &Server{app: app, broadcaster: b}
}

// StreamSimulation streams frames to a subscriber until it disconnects.
func (s *Server) StreamSimulation(
	req *pb.StreamRequest,
	stream pb.SimulationService_StreamSimulationServer,
) error {
	id, ch := s.broadcaster.Subscribe()
	defer s.broadcaster.Unsubscribe(id)

	log.Printf("[grpc] stream subscriber %d connected (max_fps=%d)", id, req.GetMaxFps())

	for {
		select {
		case frame, ok := <-ch:
			if !ok {
				return nil
			}
			if err := stream.Send(frame); err != nil {
				log.Printf("[grpc] stream %d send error: %v", id, err)
				return err
			}
		case <-stream.Context().Done():
			log.Printf("[grpc] stream subscriber %d disconnected", id)
			return stream.Context().Err()
		}
	}
}

// SubmitProposal enqueues an external agent's proposal as a command for the loop
// to drain. (Phase 2 only accepts and queues it; the Phase 3 referee acts on it.)
func (s *Server) SubmitProposal(_ context.Context, req *pb.Proposal) (*pb.ProposalAck, error) {
	if req.GetAgentId() == "" {
		return &pb.ProposalAck{Accepted: false, Reason: "agent_id is required"}, nil
	}

	engine.SubmitCommand(s.app.World, sim.ProposalCommand{
		AgentID:   req.GetAgentId(),
		TargetID:  req.GetTargetEntityId(),
		OfferJSON: req.GetOfferJson(),
	})
	log.Printf("[grpc] proposal from %q targeting entity %d", req.GetAgentId(), req.GetTargetEntityId())

	return &pb.ProposalAck{Accepted: true, Reason: "proposal enqueued for next tick"}, nil
}

// GetWorldState returns a snapshot of the current simulation state.
func (s *Server) GetWorldState(_ context.Context, _ *pb.WorldStateRequest) (*pb.WorldState, error) {
	w := s.app.World
	entities := collectEntities(w)

	var active uint32
	for _, e := range entities {
		switch e.GetNegotiationStatus() {
		case pb.NegotiationStatus_NEGOTIATION_STATUS_OFFERING,
			pb.NegotiationStatus_NEGOTIATION_STATUS_COUNTERING:
			active++
		}
	}

	tick, elapsed := clock(w)
	return &pb.WorldState{
		CurrentTick:        tick,
		CurrentTime:        elapsed,
		EntityCount:        uint32(len(entities)),
		ActiveNegotiations: active,
		Entities:           entities,
	}, nil
}

// ControlSimulation applies a pause/resume/step/reset request to the loop.
func (s *Server) ControlSimulation(_ context.Context, req *pb.SimControlRequest) (*pb.SimControlResponse, error) {
	var msg string
	switch req.GetCommand() {
	case pb.SimCommand_SIM_COMMAND_PAUSE:
		s.app.Control.Pause()
		msg = "simulation paused"
	case pb.SimCommand_SIM_COMMAND_RESUME:
		s.app.Control.Resume()
		msg = "simulation resumed"
	case pb.SimCommand_SIM_COMMAND_STEP:
		s.app.Control.Step()
		msg = "step scheduled"
	case pb.SimCommand_SIM_COMMAND_RESET:
		s.app.Control.Reset()
		msg = "reset scheduled"
	default:
		return &pb.SimControlResponse{Success: false, Message: "unknown command"}, nil
	}

	tick, _ := clock(s.app.World)
	return &pb.SimControlResponse{Success: true, Message: msg, CurrentTick: tick}, nil
}

// clock reads the current tick and elapsed time, or zeros if not yet started.
func clock(w *ecs.World) (uint64, float64) {
	if t, ok := ecs.GetResource[engine.Time](w); ok {
		return t.Tick, t.Elapsed
	}
	return 0, 0
}
