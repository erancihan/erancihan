package sim

import (
	"github.com/erancihan/negotiation-ecs/backend-go/engine"
	"github.com/erancihan/negotiation-ecs/backend-go/engine/ecs"
)

// NegotiationView is what a brain observes when it is its turn to act. It is a
// read-only snapshot — a brain decides from this and nothing else, never
// touching the world.
type NegotiationView struct {
	Tick uint64

	Self         ecs.Entity
	SelfCash     float64
	CounterParty ecs.Entity
	CounterCash  float64

	// Round is the number of completed offer/counter rounds so far.
	Round int

	// CurrentOfferJSON is the standing offer the brain is responding to.
	CurrentOfferJSON string
}

// DecisionKind is a brain's choice when responding to an offer.
type DecisionKind int

const (
	// DecideAccept accepts the standing offer, completing the negotiation.
	DecideAccept DecisionKind = iota
	// DecideReject walks away, ending the negotiation with no deal.
	DecideReject
	// DecideCounter proposes new terms, passing the turn to the counter-party.
	DecideCounter
)

// Decision is a brain's response, applied by the referee. It is the command type
// produced by negotiation brains.
type Decision struct {
	Self      ecs.Entity
	Kind      DecisionKind
	OfferJSON string // terms for a counter-offer
}

// Brain is a negotiation controller: given a view, it returns its decision. Both
// internal strategies and (via the transport layer) external agents conform to
// this contract.
type Brain = engine.Controller[NegotiationView, Decision]

// Deal is emitted on acceptance: an agreement awaiting settlement. The economy
// system (Phase 4) consumes Deals; for now they are just recorded.
type Deal struct {
	Tick      uint64
	From      ecs.Entity
	To        ecs.Entity
	OfferJSON string
}
