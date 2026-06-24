package sim

import "github.com/erancihan/negotiation-ecs/backend-go/engine/ecs"

// NegotiationEvent records a discrete negotiation transition during a tick.
// Systems publish these on the engine event bus; the transport layer reads them
// each tick to build the outgoing frame.
type NegotiationEvent struct {
	Tick         uint64
	Initiator    ecs.Entity
	Responder    ecs.Entity
	Action       string // see the Action* constants
	Summary      string
	ProposalJSON string
}

const (
	ActionOfferMade    = "offer_made"
	ActionCounterOffer = "counter_offer"
	ActionAccepted     = "accepted"
	ActionRejected     = "rejected"
	ActionTimeout      = "timeout"
)
