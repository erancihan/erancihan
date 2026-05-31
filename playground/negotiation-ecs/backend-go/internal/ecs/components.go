// Package ecs implements the Entity Component System for the multi-agent
// negotiation simulator using the Ark ECS library.
package ecs

// =============================================================================
// Components — Pure data structs with no logic.
// Each component type is registered with the Ark ECS world and attached
// to entities via archetype mappers.
// =============================================================================

// Position represents an entity's location in 2D world space.
type Position struct {
	X float64
	Y float64
}

// Velocity represents an entity's movement vector (units per second).
type Velocity struct {
	DX float64
	DY float64
}

// Inventory holds an agent's current financial and asset state.
type Inventory struct {
	Cash   float64
	Assets map[string]float64
}

// NegotiationState tracks the current negotiation status for an entity.
type NegotiationState struct {
	// Status is the current phase: "idle", "offering", "countering",
	// "accepted", "rejected", "timeout".
	Status string

	// CounterPartyID is the entity ID of the negotiation partner.
	// Zero means no active negotiation.
	CounterPartyID uint64

	// ProposalJSON holds the current proposal data as a JSON string.
	ProposalJSON string

	// TickStarted is the tick at which this negotiation began.
	TickStarted uint64

	// TickTimeout is the tick at which this negotiation will expire
	// if no resolution is reached.
	TickTimeout uint64

	// RoundsCompleted tracks how many offer/counter-offer rounds
	// have occurred in the current negotiation.
	RoundsCompleted int
}

// AgentRole identifies what kind of entity this is and how it behaves.
type AgentRole struct {
	// Name is a human-readable label (e.g., "Trader-042").
	Name string

	// Type distinguishes internal (AI-driven) from external (SDK-connected)
	// agents. Values: "internal", "external".
	Type string

	// Strategy is an identifier for the agent's decision-making approach.
	// Internal agents use this to select behavior (e.g., "random", "greedy",
	// "cooperative"). External agents set this to "external".
	Strategy string
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
)
