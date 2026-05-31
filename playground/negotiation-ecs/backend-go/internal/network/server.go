package network

import (
	"context"
	"fmt"
	"log"
	"sync"

	pb "github.com/erancihan/negotiation-ecs/backend-go/gen/proto/negotiationpb"
	"github.com/erancihan/negotiation-ecs/backend-go/internal/ecs"
)

// SimulationServer implements the gRPC SimulationService.
type SimulationServer struct {
	pb.UnimplementedSimulationServiceServer

	// Broadcaster for streaming frames to connected observers.
	Broadcaster *Broadcaster

	// SimWorld reference for direct state queries.
	SimWorld *ecs.SimWorld

	// ProposalQueue is a thread-safe queue for external agent proposals.
	proposalMu    sync.Mutex
	proposalQueue []*pb.Proposal

	// Simulation control
	controlMu sync.Mutex
	paused    bool
	stepOnce  bool
	resetReq  bool
}

// NewSimulationServer creates a new gRPC server instance.
func NewSimulationServer(sw *ecs.SimWorld, broadcaster *Broadcaster) *SimulationServer {
	return &SimulationServer{
		SimWorld:    sw,
		Broadcaster: broadcaster,
	}
}

// StreamSimulation implements the server-streaming RPC.
// Each client gets an independent goroutine that reads from the broadcaster.
func (s *SimulationServer) StreamSimulation(
	req *pb.StreamRequest,
	stream pb.SimulationService_StreamSimulationServer,
) error {
	subID, ch := s.Broadcaster.Subscribe()
	defer s.Broadcaster.Unsubscribe(subID)

	log.Printf("[gRPC] New stream subscriber connected (ID: %d, max_fps: %d)", subID, req.GetMaxFps())

	for {
		select {
		case frame, ok := <-ch:
			if !ok {
				// Channel closed — subscriber was removed
				return nil
			}
			if err := stream.Send(frame); err != nil {
				log.Printf("[gRPC] Stream send error (subscriber %d): %v", subID, err)
				return err
			}

		case <-stream.Context().Done():
			log.Printf("[gRPC] Stream subscriber disconnected (ID: %d)", subID)
			return stream.Context().Err()
		}
	}
}

// SubmitProposal handles external agent proposal submissions.
func (s *SimulationServer) SubmitProposal(
	ctx context.Context,
	req *pb.Proposal,
) (*pb.ProposalAck, error) {
	if req.GetAgentId() == "" {
		return &pb.ProposalAck{
			Accepted: false,
			Reason:   "agent_id is required",
		}, nil
	}

	s.proposalMu.Lock()
	s.proposalQueue = append(s.proposalQueue, req)
	s.proposalMu.Unlock()

	log.Printf("[gRPC] Proposal received from agent '%s' targeting entity %d",
		req.GetAgentId(), req.GetTargetEntityId())

	return &pb.ProposalAck{
		Accepted: true,
		Reason:   "proposal enqueued for next tick",
	}, nil
}

// GetWorldState returns a snapshot of the current simulation state.
func (s *SimulationServer) GetWorldState(
	ctx context.Context,
	req *pb.WorldStateRequest,
) (*pb.WorldState, error) {
	entities := CollectEntityStates(s.SimWorld)

	activeNeg := uint32(0)
	for _, e := range entities {
		if e.GetNegotiationStatus() == pb.NegotiationStatus_NEGOTIATION_STATUS_OFFERING ||
			e.GetNegotiationStatus() == pb.NegotiationStatus_NEGOTIATION_STATUS_COUNTERING {
			activeNeg++
		}
	}

	return &pb.WorldState{
		CurrentTick:        s.SimWorld.CurrentTick,
		CurrentTime:        s.SimWorld.LogicalTime(),
		EntityCount:        uint32(len(entities)),
		ActiveNegotiations: activeNeg,
		Entities:           entities,
	}, nil
}

// ControlSimulation handles simulation control commands.
func (s *SimulationServer) ControlSimulation(
	ctx context.Context,
	req *pb.SimControlRequest,
) (*pb.SimControlResponse, error) {
	s.controlMu.Lock()
	defer s.controlMu.Unlock()

	switch req.GetCommand() {
	case pb.SimCommand_SIM_COMMAND_PAUSE:
		s.paused = true
		return &pb.SimControlResponse{
			Success:     true,
			Message:     "Simulation paused",
			CurrentTick: s.SimWorld.CurrentTick,
		}, nil

	case pb.SimCommand_SIM_COMMAND_RESUME:
		s.paused = false
		return &pb.SimControlResponse{
			Success:     true,
			Message:     "Simulation resumed",
			CurrentTick: s.SimWorld.CurrentTick,
		}, nil

	case pb.SimCommand_SIM_COMMAND_STEP:
		s.stepOnce = true
		return &pb.SimControlResponse{
			Success:     true,
			Message:     "Step scheduled",
			CurrentTick: s.SimWorld.CurrentTick,
		}, nil

	case pb.SimCommand_SIM_COMMAND_RESET:
		s.resetReq = true
		return &pb.SimControlResponse{
			Success:     true,
			Message:     "Reset scheduled",
			CurrentTick: 0,
		}, nil

	default:
		return &pb.SimControlResponse{
			Success: false,
			Message: fmt.Sprintf("Unknown command: %v", req.GetCommand()),
		}, nil
	}
}

// DrainProposals returns and clears all pending external proposals.
// Called by the game loop each tick.
func (s *SimulationServer) DrainProposals() []*pb.Proposal {
	s.proposalMu.Lock()
	defer s.proposalMu.Unlock()

	if len(s.proposalQueue) == 0 {
		return nil
	}

	proposals := s.proposalQueue
	s.proposalQueue = nil
	return proposals
}

// IsPaused returns whether the simulation is currently paused.
func (s *SimulationServer) IsPaused() bool {
	s.controlMu.Lock()
	defer s.controlMu.Unlock()
	return s.paused
}

// ShouldStep returns and clears the step-once flag.
func (s *SimulationServer) ShouldStep() bool {
	s.controlMu.Lock()
	defer s.controlMu.Unlock()
	if s.stepOnce {
		s.stepOnce = false
		return true
	}
	return false
}

// ShouldReset returns and clears the reset flag.
func (s *SimulationServer) ShouldReset() bool {
	s.controlMu.Lock()
	defer s.controlMu.Unlock()
	if s.resetReq {
		s.resetReq = false
		return true
	}
	return false
}

// CollectEntityStates gathers the current state of all entities into protobuf
// messages for streaming or snapshot responses.
func CollectEntityStates(sw *ecs.SimWorld) []*pb.EntityState {
	var entities []*pb.EntityState

	query := sw.FilterAll.Query()
	for query.Next() {
		pos, vel, inv, neg, role := query.Get()
		entity := query.Entity()

		// Map internal status string to protobuf enum
		var status pb.NegotiationStatus
		switch neg.Status {
		case ecs.StatusIdle:
			status = pb.NegotiationStatus_NEGOTIATION_STATUS_IDLE
		case ecs.StatusOffering:
			status = pb.NegotiationStatus_NEGOTIATION_STATUS_OFFERING
		case ecs.StatusCountering:
			status = pb.NegotiationStatus_NEGOTIATION_STATUS_COUNTERING
		case ecs.StatusAccepted:
			status = pb.NegotiationStatus_NEGOTIATION_STATUS_ACCEPTED
		case ecs.StatusRejected:
			status = pb.NegotiationStatus_NEGOTIATION_STATUS_REJECTED
		case ecs.StatusTimeout:
			status = pb.NegotiationStatus_NEGOTIATION_STATUS_TIMEOUT
		}

		// Copy assets map
		assets := make(map[string]float64)
		for k, v := range inv.Assets {
			assets[k] = v
		}

		entities = append(entities, &pb.EntityState{
			EntityId: uint64(entity.ID()),
			Role:     role.Type,
			Label:    role.Name,
			Position: &pb.Vec2{X: pos.X, Y: pos.Y},
			Velocity: &pb.Vec2{X: vel.DX, Y: vel.DY},
			Inventory: &pb.Inventory{
				Cash:   inv.Cash,
				Assets: assets,
			},
			NegotiationStatus: status,
			CounterPartyId:    neg.CounterPartyID,
		})
	}

	return entities
}

// ConvertEvents converts internal ECS events to protobuf events.
func ConvertEvents(events []ecs.NegotiationEvent) []*pb.NegotiationEvent {
	result := make([]*pb.NegotiationEvent, 0, len(events))
	for _, e := range events {
		var action pb.NegotiationAction
		switch e.Action {
		case "offer_made":
			action = pb.NegotiationAction_NEGOTIATION_ACTION_OFFER_MADE
		case "counter_offer":
			action = pb.NegotiationAction_NEGOTIATION_ACTION_COUNTER_OFFER
		case "accepted":
			action = pb.NegotiationAction_NEGOTIATION_ACTION_ACCEPTED
		case "rejected":
			action = pb.NegotiationAction_NEGOTIATION_ACTION_REJECTED
		case "timeout":
			action = pb.NegotiationAction_NEGOTIATION_ACTION_TIMEOUT
		}

		result = append(result, &pb.NegotiationEvent{
			Tick:         e.Tick,
			InitiatorId:  e.InitiatorID,
			ResponderId:  e.ResponderID,
			Action:       action,
			Summary:      e.Summary,
			ProposalJson: e.ProposalJSON,
		})
	}
	return result
}
