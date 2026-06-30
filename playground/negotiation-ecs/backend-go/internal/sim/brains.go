package sim

import (
	"context"
	"math/rand"

	"github.com/erancihan/negotiation-ecs/engine/ecs"
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

// randomBrain accepts, rejects, or counters probabilistically. A counter
// re-prices the standing offer by a random factor.
type randomBrain struct{ r *rand.Rand }

func (b *randomBrain) Decide(_ context.Context, v NegotiationView) []Decision {
	switch roll := b.r.Float64(); {
	case roll < 0.25:
		return []Decision{{Self: v.Self, Kind: DecideAccept}}
	case roll < 0.45:
		return []Decision{{Self: v.Self, Kind: DecideReject}}
	default:
		o := ParseOffer(v.CurrentOfferJSON)
		o.OfferCash *= 0.8 + 0.4*b.r.Float64() // re-price ±20%
		return []Decision{{Self: v.Self, Kind: DecideCounter, OfferJSON: o.JSON()}}
	}
}

// cooperativeBrain settles quickly: it counters once (accepting the standing
// terms as-is), then accepts.
type cooperativeBrain struct{}

func (cooperativeBrain) Decide(_ context.Context, v NegotiationView) []Decision {
	if v.Round >= 1 {
		return []Decision{{Self: v.Self, Kind: DecideAccept}}
	}
	return []Decision{{Self: v.Self, Kind: DecideCounter, OfferJSON: v.CurrentOfferJSON}}
}

// greedyBrain holds out: it counters many rounds, each time lowballing the cash
// it would pay, and only accepts late (often running down to a timeout).
type greedyBrain struct{}

func (greedyBrain) Decide(_ context.Context, v NegotiationView) []Decision {
	if v.Round >= 5 {
		return []Decision{{Self: v.Self, Kind: DecideAccept}}
	}
	o := ParseOffer(v.CurrentOfferJSON)
	o.OfferCash *= 0.85 // lowball
	return []Decision{{Self: v.Self, Kind: DecideCounter, OfferJSON: o.JSON()}}
}
