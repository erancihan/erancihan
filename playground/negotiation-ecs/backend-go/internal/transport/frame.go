// Package transport is the gRPC adapter: it implements the SimulationService,
// builds protobuf frames from simulation components, and translates external
// requests into engine commands and control calls. It is the only place that
// depends on both the domain (internal/sim) and the wire format (gen/proto),
// keeping proto/gRPC out of the engine core and the domain.
package transport

import (
	"github.com/erancihan/negotiation-ecs/engine"
	"github.com/erancihan/negotiation-ecs/engine/ecs"
	pb "github.com/erancihan/negotiation-ecs/backend-go/gen/proto/negotiationpb"
	"github.com/erancihan/negotiation-ecs/backend-go/internal/observability"
	"github.com/erancihan/negotiation-ecs/backend-go/internal/sim"
)

// entityID maps an entity handle to its wire id. The zero entity maps to 0
// ("none"); live entities map to index+1 so a real entity never collides with 0.
func entityID(e ecs.Entity) uint64 {
	if e.IsZero() {
		return 0
	}
	return uint64(e.Index) + 1
}

// BuildFrame snapshots the world into a SimFrame for streaming. Suitable as the
// build function for engine.SnapshotSystem in StageLast.
func BuildFrame(w *ecs.World) *pb.SimFrame {
	entities := collectEntities(w)
	events := convertEvents(w)

	var active, completed, timedOut uint32
	for _, ev := range events {
		switch ev.GetAction() {
		case pb.NegotiationAction_NEGOTIATION_ACTION_ACCEPTED:
			completed++
		case pb.NegotiationAction_NEGOTIATION_ACTION_TIMEOUT:
			timedOut++
		}
	}
	for _, e := range entities {
		switch e.GetNegotiationStatus() {
		case pb.NegotiationStatus_NEGOTIATION_STATUS_OFFERING,
			pb.NegotiationStatus_NEGOTIATION_STATUS_COUNTERING:
			active++
		}
	}

	var tick uint64
	var elapsed float64
	if t, ok := ecs.GetResource[engine.Time](w); ok {
		tick, elapsed = t.Tick, t.Elapsed
	}

	return &pb.SimFrame{
		Tick:      tick,
		Timestamp: elapsed,
		Entities:  entities,
		Events:    events,
		Stats: &pb.TickStats{
			TotalEntities:         uint32(len(entities)),
			ActiveNegotiations:    active,
			CompletedNegotiations: completed,
			TimedOutNegotiations:  timedOut,
			Metrics:               observability.TrySnapshot(w),
		},
	}
}

// collectEntities reads every agent's components into protobuf entity states.
func collectEntities(w *ecs.World) []*pb.EntityState {
	var out []*pb.EntityState

	q := ecs.Query1[sim.AgentRole](w)
	for q.Next() {
		e := q.Entity()
		role := q.Get()

		state := &pb.EntityState{
			EntityId:  entityID(e),
			Role:      role.Type,
			Label:     role.Name,
			Position:  &pb.Vec2{},
			Velocity:  &pb.Vec2{},
			Inventory: &pb.Inventory{},
		}
		if p, ok := ecs.Get[sim.Position](w, e); ok {
			state.Position = &pb.Vec2{X: p.X, Y: p.Y}
		}
		if v, ok := ecs.Get[sim.Velocity](w, e); ok {
			state.Velocity = &pb.Vec2{X: v.DX, Y: v.DY}
		}
		if inv, ok := ecs.Get[sim.Inventory](w, e); ok {
			state.Inventory = &pb.Inventory{Cash: inv.Cash, Assets: copyAssets(inv.Assets)}
		}
		if neg, ok := ecs.Get[sim.NegotiationState](w, e); ok {
			state.NegotiationStatus = statusToProto(neg.Status)
			state.CounterPartyId = entityID(neg.CounterParty)
		}
		out = append(out, state)
	}
	return out
}

// convertEvents reads this tick's negotiation events off the bus.
func convertEvents(w *ecs.World) []*pb.NegotiationEvent {
	evs := engine.Read[sim.NegotiationEvent](w)
	out := make([]*pb.NegotiationEvent, 0, len(evs))
	for _, e := range evs {
		out = append(out, &pb.NegotiationEvent{
			Tick:         e.Tick,
			InitiatorId:  entityID(e.Initiator),
			ResponderId:  entityID(e.Responder),
			Action:       actionToProto(e.Action),
			Summary:      e.Summary,
			ProposalJson: e.ProposalJSON,
		})
	}
	return out
}

func copyAssets(in map[string]float64) map[string]float64 {
	out := make(map[string]float64, len(in))
	for k, v := range in {
		out[k] = v
	}
	return out
}

func statusToProto(s string) pb.NegotiationStatus {
	switch s {
	case sim.StatusOffering:
		return pb.NegotiationStatus_NEGOTIATION_STATUS_OFFERING
	case sim.StatusCountering:
		return pb.NegotiationStatus_NEGOTIATION_STATUS_COUNTERING
	case sim.StatusAccepted:
		return pb.NegotiationStatus_NEGOTIATION_STATUS_ACCEPTED
	case sim.StatusRejected:
		return pb.NegotiationStatus_NEGOTIATION_STATUS_REJECTED
	case sim.StatusTimeout:
		return pb.NegotiationStatus_NEGOTIATION_STATUS_TIMEOUT
	default:
		return pb.NegotiationStatus_NEGOTIATION_STATUS_IDLE
	}
}

func actionToProto(a string) pb.NegotiationAction {
	switch a {
	case sim.ActionOfferMade:
		return pb.NegotiationAction_NEGOTIATION_ACTION_OFFER_MADE
	case sim.ActionCounterOffer:
		return pb.NegotiationAction_NEGOTIATION_ACTION_COUNTER_OFFER
	case sim.ActionAccepted:
		return pb.NegotiationAction_NEGOTIATION_ACTION_ACCEPTED
	case sim.ActionRejected:
		return pb.NegotiationAction_NEGOTIATION_ACTION_REJECTED
	case sim.ActionTimeout:
		return pb.NegotiationAction_NEGOTIATION_ACTION_TIMEOUT
	default:
		return pb.NegotiationAction_NEGOTIATION_ACTION_UNSPECIFIED
	}
}
