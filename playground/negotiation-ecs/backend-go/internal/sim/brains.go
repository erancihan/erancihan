package sim

import (
	"context"
	"fmt"
	"math/rand"

	"github.com/erancihan/negotiation-ecs/backend-go/engine/ecs"
)

// Brains maps entities to their negotiation brains. Stored as a resource and
// populated at spawn. External agents (Phase 3B) register their brain here too,
// so internal and external decision-makers are looked up uniformly.
type Brains struct {
	m map[ecs.Entity]Brain
}

func newBrains() Brains { return Brains{m: make(map[ecs.Entity]Brain)} }

// Set binds a brain to an entity.
func (b *Brains) Set(e ecs.Entity, brain Brain) { b.m[e] = brain }

// For returns the brain bound to an entity, if any.
func (b *Brains) For(e ecs.Entity) (Brain, bool) {
	brain, ok := b.m[e]
	return brain, ok
}

// makeBrain builds the brain for a strategy. Each brain owns its own RNG so
// brains can run concurrently (DispatchActors) without sharing state, and stay
// deterministic given a per-brain seed.
func makeBrain(strategy string, seed int64) Brain {
	switch strategy {
	case StrategyGreedy:
		return greedyBrain{}
	case StrategyCooperative:
		return cooperativeBrain{}
	default:
		return &randomBrain{r: rand.New(rand.NewSource(seed))}
	}
}

// counterOffer is a small helper producing a counter-offer payload for a round.
func counterOffer(round int) string {
	return fmt.Sprintf(`{"type":"counter_offer","round":%d}`, round)
}

// randomBrain accepts, rejects, or counters probabilistically.
type randomBrain struct{ r *rand.Rand }

func (b *randomBrain) Decide(_ context.Context, v NegotiationView) []Decision {
	switch roll := b.r.Float64(); {
	case roll < 0.25:
		return []Decision{{Self: v.Self, Kind: DecideAccept}}
	case roll < 0.45:
		return []Decision{{Self: v.Self, Kind: DecideReject}}
	default:
		return []Decision{{Self: v.Self, Kind: DecideCounter, OfferJSON: counterOffer(v.Round + 1)}}
	}
}

// cooperativeBrain settles quickly: it counters once, then accepts.
type cooperativeBrain struct{}

func (cooperativeBrain) Decide(_ context.Context, v NegotiationView) []Decision {
	if v.Round >= 1 {
		return []Decision{{Self: v.Self, Kind: DecideAccept}}
	}
	return []Decision{{Self: v.Self, Kind: DecideCounter, OfferJSON: counterOffer(v.Round + 1)}}
}

// greedyBrain holds out: it counters many rounds and only accepts late, which
// often runs the clock down to a timeout.
type greedyBrain struct{}

func (greedyBrain) Decide(_ context.Context, v NegotiationView) []Decision {
	if v.Round >= 5 {
		return []Decision{{Self: v.Self, Kind: DecideAccept}}
	}
	return []Decision{{Self: v.Self, Kind: DecideCounter, OfferJSON: counterOffer(v.Round + 1)}}
}
