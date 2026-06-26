package sim

import (
	"math"

	"github.com/erancihan/negotiation-ecs/backend-go/engine"
	"github.com/erancihan/negotiation-ecs/backend-go/engine/ecs"
)

// tickOf reads the current tick from the engine clock.
func tickOf(w *ecs.World) uint64 { return ecs.MustResource[engine.Time](w).Tick }

// MovementSystem integrates velocity into position and bounces entities off the
// world boundaries.
func MovementSystem(w *ecs.World) {
	dt := ecs.MustResource[engine.Time](w).Delta
	cfg := config(w)

	q := ecs.Query2[Position, Velocity](w)
	for q.Next() {
		pos, vel := q.Get()

		pos.X += vel.DX * dt
		pos.Y += vel.DY * dt

		switch {
		case pos.X < 0:
			pos.X = -pos.X
			vel.DX = -vel.DX
		case pos.X > cfg.WorldWidth:
			pos.X = 2*cfg.WorldWidth - pos.X
			vel.DX = -vel.DX
		}
		switch {
		case pos.Y < 0:
			pos.Y = -pos.Y
			vel.DY = -vel.DY
		case pos.Y > cfg.WorldHeight:
			pos.Y = 2*cfg.WorldHeight - pos.Y
			vel.DY = -vel.DY
		}
	}
}

// TimeoutSystem expires negotiations that have run past their deadline.
func TimeoutSystem(w *ecs.World) {
	tick := tickOf(w)

	q := ecs.Query1[NegotiationState](w)
	for q.Next() {
		neg := q.Get()
		if isTerminal(neg.Status) || neg.Status == StatusIdle {
			continue
		}
		if tick >= neg.TickTimeout {
			engine.Emit(w, NegotiationEvent{
				Tick:      tick,
				Initiator: q.Entity(),
				Responder: neg.CounterParty,
				Action:    ActionTimeout,
				Summary:   "Negotiation timed out",
			})
			neg.Status = StatusTimeout
			neg.CounterParty = ecs.Entity{}
		}
	}
}

// NegotiationSystem advances the negotiation state machine each tick: it resets
// completed negotiations, pairs idle agents, then runs the referee — which asks
// each deciding agent's brain what to do and applies the protocol rules.
func NegotiationSystem(w *ecs.World) {
	tick := tickOf(w)
	resetCompletedNegotiations(w, tick)
	pairIdleAgents(w, tick)
	runReferee(w, tick)
}

func isTerminal(status string) bool {
	return status == StatusAccepted || status == StatusRejected || status == StatusTimeout
}

// resetCompletedNegotiations returns terminal negotiations to idle after a
// one-tick cooldown.
func resetCompletedNegotiations(w *ecs.World, tick uint64) {
	q := ecs.Query1[NegotiationState](w)
	for q.Next() {
		neg := q.Get()
		if isTerminal(neg.Status) && tick > neg.TickTimeout {
			neg.Status = StatusIdle
			neg.CounterParty = ecs.Entity{}
			neg.ProposalJSON = ""
			neg.RoundsCompleted = 0
		}
	}
}

// idleAgent captures an idle entity's position for proximity pairing.
type idleAgent struct {
	e    ecs.Entity
	x, y float64
}

// pairIdleAgents pairs nearby idle agents into new negotiations, throttled so
// only a fraction of idle agents pair each tick.
func pairIdleAgents(w *ecs.World, tick uint64) {
	r := rng(w)

	var idle []idleAgent
	q := ecs.Query2[Position, NegotiationState](w)
	for q.Next() {
		pos, neg := q.Get()
		if neg.Status == StatusIdle {
			idle = append(idle, idleAgent{e: q.Entity(), x: pos.X, y: pos.Y})
		}
	}

	r.Shuffle(len(idle), func(i, j int) { idle[i], idle[j] = idle[j], idle[i] })

	paired := make(map[ecs.Entity]bool)
	maxPairs := len(idle) / 4
	if maxPairs < 1 {
		maxPairs = 1
	}

	created := 0
	for i := 0; i < len(idle) && created < maxPairs; i++ {
		if paired[idle[i].e] {
			continue
		}

		best := -1
		bestDist := math.MaxFloat64
		for j := i + 1; j < len(idle); j++ {
			if paired[idle[j].e] {
				continue
			}
			dx := idle[i].x - idle[j].x
			dy := idle[i].y - idle[j].y
			if d := dx*dx + dy*dy; d < bestDist {
				bestDist = d
				best = j
			}
		}
		if best == -1 {
			break
		}

		initiator, responder := idle[i].e, idle[best].e
		paired[initiator] = true
		paired[responder] = true
		startNegotiation(w, tick, initiator, responder)
		created++
	}
}

// startNegotiation puts an initiator into OFFERING and a responder into
// COUNTERING, and announces the new negotiation.
func startNegotiation(w *ecs.World, tick uint64, initiator, responder ecs.Entity) {
	cfg := config(w)
	deadline := tick + cfg.NegotiationTimeoutTicks

	if ini, ok := ecs.Get[NegotiationState](w, initiator); ok {
		ini.Status = StatusOffering
		ini.CounterParty = responder
		ini.TickStarted = tick
		ini.TickTimeout = deadline
		ini.RoundsCompleted = 0
		ini.ProposalJSON = `{"type":"initial_offer"}`
	}
	if res, ok := ecs.Get[NegotiationState](w, responder); ok {
		res.Status = StatusCountering
		res.CounterParty = initiator
		res.TickStarted = tick
		res.TickTimeout = deadline
		res.RoundsCompleted = 0
	}

	engine.Emit(w, NegotiationEvent{
		Tick:         tick,
		Initiator:    initiator,
		Responder:    responder,
		Action:       ActionOfferMade,
		Summary:      "New negotiation started",
		ProposalJSON: `{"type":"initial_offer"}`,
	})
}

// runReferee gathers the agents whose turn it is (those in COUNTERING), asks
// their brains to decide — concurrently, bounded by the decision deadline — and
// applies each decision under the protocol rules.
//
// Exactly one party in each active negotiation is in COUNTERING at a time, so
// every decision touches an independent negotiation. Decisions are therefore
// conflict-free and their application order does not affect the outcome, which
// keeps the simulation deterministic despite concurrent brains.
func runReferee(w *ecs.World, tick uint64) {
	brains := ecs.MustResource[Brains](w)
	cfg := config(w)

	var actors []engine.Actor[NegotiationView, Decision]
	q := ecs.Query1[NegotiationState](w)
	for q.Next() {
		neg := q.Get()
		if neg.Status != StatusCountering {
			continue
		}
		e := q.Entity()
		if brain, ok := brains.For(e); ok {
			actors = append(actors, engine.Actor[NegotiationView, Decision]{Entity: e, Controller: brain})
		}
	}
	if len(actors) == 0 {
		return
	}

	decisions := engine.DispatchActors(cfg.DecisionTimeout, actors,
		func(e ecs.Entity) NegotiationView { return buildView(w, e, tick) })

	for _, d := range decisions {
		applyDecision(w, tick, d)
	}
}

// buildView snapshots an entity's negotiation context for its brain.
func buildView(w *ecs.World, e ecs.Entity, tick uint64) NegotiationView {
	v := NegotiationView{Self: e, Tick: tick}
	if neg, ok := ecs.Get[NegotiationState](w, e); ok {
		v.CounterParty = neg.CounterParty
		v.Round = neg.RoundsCompleted
		v.CurrentOfferJSON = neg.ProposalJSON
	}
	if inv, ok := ecs.Get[Inventory](w, e); ok {
		v.SelfCash = inv.Cash
	}
	if inv, ok := ecs.Get[Inventory](w, v.CounterParty); ok {
		v.CounterCash = inv.Cash
	}
	return v
}

// applyDecision enacts a brain's decision. The deciding agent must still be in
// COUNTERING (guarding against stale/duplicate decisions).
func applyDecision(w *ecs.World, tick uint64, d Decision) {
	neg, ok := ecs.Get[NegotiationState](w, d.Self)
	if !ok || neg.Status != StatusCountering {
		return
	}
	cp := neg.CounterParty

	switch d.Kind {
	case DecideAccept:
		conclude(w, d.Self, StatusAccepted, tick)
		conclude(w, cp, StatusAccepted, tick)
		engine.Emit(w, NegotiationEvent{
			Tick: tick, Initiator: cp, Responder: d.Self,
			Action: ActionAccepted, Summary: "Offer accepted",
		})
		// Record the agreement for settlement (Phase 4). No cash moves here.
		engine.Emit(w, Deal{Tick: tick, From: cp, To: d.Self, OfferJSON: neg.ProposalJSON})

	case DecideReject:
		conclude(w, d.Self, StatusRejected, tick)
		conclude(w, cp, StatusRejected, tick)
		engine.Emit(w, NegotiationEvent{
			Tick: tick, Initiator: cp, Responder: d.Self,
			Action: ActionRejected, Summary: "Offer rejected",
		})

	case DecideCounter:
		// Swap turns: the decider makes the new offer, the counter-party responds.
		neg.RoundsCompleted++
		neg.Status = StatusOffering
		neg.ProposalJSON = d.OfferJSON
		if cpNeg, ok := ecs.Get[NegotiationState](w, cp); ok {
			cpNeg.Status = StatusCountering
			cpNeg.RoundsCompleted = neg.RoundsCompleted
			cpNeg.ProposalJSON = d.OfferJSON
		}
		engine.Emit(w, NegotiationEvent{
			Tick: tick, Initiator: d.Self, Responder: cp,
			Action: ActionCounterOffer, Summary: "Counter-offer made",
			ProposalJSON: d.OfferJSON,
		})
	}
}

// conclude moves an entity into a terminal state, stamping the completion tick
// (which the reset cooldown keys off).
func conclude(w *ecs.World, e ecs.Entity, status string, tick uint64) {
	if neg, ok := ecs.Get[NegotiationState](w, e); ok {
		neg.Status = status
		neg.TickTimeout = tick
	}
}
