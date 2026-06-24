package sim

import (
	"fmt"
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

// NegotiationSystem advances the negotiation state machine: it resets completed
// negotiations, pairs idle agents, and progresses active ones.
//
// The decision rolls here are the original built-in behaviour; Phase 3 replaces
// them with an agent-driven referee.
func NegotiationSystem(w *ecs.World) {
	tick := tickOf(w)
	resetCompletedNegotiations(w, tick)
	pairIdleAgents(w, tick)
	advanceNegotiations(w, tick)
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

// transferAmount is the flat cash moved on an accepted offer (placeholder
// economics, replaced by the Economy plugin in Phase 4).
const transferAmount = 10.0

// advanceNegotiations progresses active negotiations through offer/counter
// rounds toward acceptance, rejection, or continuation.
func advanceNegotiations(w *ecs.World, tick uint64) {
	r := rng(w)

	q := ecs.Query2[NegotiationState, Inventory](w)
	for q.Next() {
		neg, inv := q.Get()
		e := q.Entity()

		switch neg.Status {
		case StatusOffering:
			// Wait one round before the counter-party responds.
			if neg.RoundsCompleted == 0 {
				continue
			}
			switch roll := r.Float64(); {
			case roll < 0.3:
				neg.Status = StatusAccepted
				neg.TickTimeout = tick
				if inv.Cash >= transferAmount {
					inv.Cash -= transferAmount
					if cp, ok := ecs.Get[Inventory](w, neg.CounterParty); ok {
						cp.Cash += transferAmount
					}
				}
				engine.Emit(w, NegotiationEvent{
					Tick: tick, Initiator: e, Responder: neg.CounterParty,
					Action: ActionAccepted, Summary: "Offer accepted",
				})
			case roll < 0.5:
				neg.Status = StatusRejected
				neg.TickTimeout = tick
				engine.Emit(w, NegotiationEvent{
					Tick: tick, Initiator: e, Responder: neg.CounterParty,
					Action: ActionRejected, Summary: "Offer rejected",
				})
			}

		case StatusCountering:
			neg.RoundsCompleted++
			switch roll := r.Float64(); {
			case roll < 0.2:
				neg.Status = StatusAccepted
				neg.TickTimeout = tick
				engine.Emit(w, NegotiationEvent{
					Tick: tick, Initiator: neg.CounterParty, Responder: e,
					Action: ActionAccepted, Summary: "Counter-party accepted",
				})
			case roll < 0.4:
				neg.Status = StatusRejected
				neg.TickTimeout = tick
				engine.Emit(w, NegotiationEvent{
					Tick: tick, Initiator: neg.CounterParty, Responder: e,
					Action: ActionRejected, Summary: "Counter-party rejected",
				})
			default:
				neg.Status = StatusOffering
				engine.Emit(w, NegotiationEvent{
					Tick: tick, Initiator: e, Responder: neg.CounterParty,
					Action:       ActionCounterOffer,
					Summary:      "Counter-offer made",
					ProposalJSON: fmt.Sprintf(`{"type":"counter_offer","round":%d}`, neg.RoundsCompleted),
				})
			}
		}
	}
}
