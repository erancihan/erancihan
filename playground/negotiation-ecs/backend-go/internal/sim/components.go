// Package sim is the negotiation simulation domain: components, systems, and the
// plugin that registers them onto the engine. It depends on the engine core
// (engine, engine/ecs) but never on transport (gRPC/proto) — the wire layer
// reads these components from the outside.
package sim

import "github.com/erancihan/negotiation-ecs/engine/ecs"

// =============================================================================
// Components — plain data attached to entities.
// =============================================================================

// Position is an entity's location in 2D world space.
type Position struct{ X, Y float64 }

// Velocity is an entity's movement vector (units per second).
type Velocity struct{ DX, DY float64 }

// Inventory holds an agent's cash and named assets.
type Inventory struct {
	Cash   float64
	Assets map[string]float64
}

// NegotiationState tracks an entity's place in the negotiation state machine.
type NegotiationState struct {
	// Status is the current phase (see the Status* constants).
	Status string

	// CounterParty is the entity being negotiated with; the zero Entity means
	// no active negotiation.
	CounterParty ecs.Entity

	// ProposalJSON holds the current proposal payload.
	ProposalJSON string

	// TickStarted is the tick the current negotiation began.
	TickStarted uint64

	// TickTimeout is the tick at which the negotiation expires (and, for
	// terminal states, the tick it completed — used for the one-tick cooldown).
	TickTimeout uint64

	// RoundsCompleted counts offer/counter rounds in the current negotiation.
	RoundsCompleted int
}

// AgentRole identifies an entity and how it behaves.
type AgentRole struct {
	Name     string // human-readable label, e.g. "Agent-042"
	Type     string // "internal" or "external"
	Strategy string // "random" | "greedy" | "cooperative" | "external"
}

// =============================================================================
// Constants
// =============================================================================

const (
	StatusIdle       = "idle"
	StatusOffering   = "offering"
	StatusCountering = "countering"
	StatusAccepted   = "accepted"
	StatusRejected   = "rejected"
	StatusTimeout    = "timeout"

	AgentTypeInternal = "internal"
	AgentTypeExternal = "external"

	StrategyRandom      = "random"
	StrategyGreedy      = "greedy"
	StrategyCooperative = "cooperative"
	StrategyExternal    = "external"
)
