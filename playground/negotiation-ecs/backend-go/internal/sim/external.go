package sim

import (
	"context"
	"encoding/json"
	"sync"

	"github.com/erancihan/negotiation-ecs/backend-go/engine/ecs"
)

// ExternalAgents is the registry connecting remote agents to bodies they control.
// It is stored as a resource and accessed concurrently: gRPC handlers bind
// agents and submit proposals from their own goroutines, while the loop (and
// external brains running under DispatchActors) read them — so every method is
// mutex-guarded.
//
// On first contact an agent is assigned a free body from the pool; that internal
// agent's brain is then swapped for an externalBrain by externalBindingSystem.
// The target_entity_id field of a proposal is advisory in this build — an agent
// always controls the single body it was assigned.
type ExternalAgents struct {
	mu         sync.Mutex
	available  []ecs.Entity                 // bodies free to assign
	byAgent    map[string]ecs.Entity        // agent id -> assigned body
	pending    map[ecs.Entity]ProposalCommand // latest undelivered proposal per body
	newlyBound []ecs.Entity                 // bodies awaiting brain swap by the loop
}

func newExternalAgents() ExternalAgents {
	return ExternalAgents{
		byAgent: make(map[string]ecs.Entity),
		pending: make(map[ecs.Entity]ProposalCommand),
	}
}

// SeedAvailable sets the pool of assignable bodies. Called at startup (and on
// reset) before any concurrent access.
func (r *ExternalAgents) SeedAvailable(bodies []ecs.Entity) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.available = append([]ecs.Entity(nil), bodies...)
}

// Bind returns the body assigned to agentID, assigning a free one on first
// contact. It reports false only when the pool is exhausted.
func (r *ExternalAgents) Bind(agentID string) (ecs.Entity, bool) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if e, ok := r.byAgent[agentID]; ok {
		return e, true
	}
	if len(r.available) == 0 {
		return ecs.Entity{}, false
	}
	e := r.available[len(r.available)-1]
	r.available = r.available[:len(r.available)-1]
	r.byAgent[agentID] = e
	r.newlyBound = append(r.newlyBound, e)
	return e, true
}

// SubmitPending records an agent's latest proposal for its body, replacing any
// undelivered one.
func (r *ExternalAgents) SubmitPending(body ecs.Entity, p ProposalCommand) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.pending[body] = p
}

// takePending removes and returns the pending proposal for a body, if any.
func (r *ExternalAgents) takePending(body ecs.Entity) (ProposalCommand, bool) {
	r.mu.Lock()
	defer r.mu.Unlock()
	p, ok := r.pending[body]
	if ok {
		delete(r.pending, body)
	}
	return p, ok
}

// takeNewlyBound returns and clears the bodies that need their brain swapped.
func (r *ExternalAgents) takeNewlyBound() []ecs.Entity {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := r.newlyBound
	r.newlyBound = nil
	return out
}

// externalBrain is the remote-agent brain: instead of computing a decision, it
// delivers whatever proposal the agent submitted before the deadline. With no
// pending proposal it returns nothing, so the body holds this tick.
type externalBrain struct {
	reg  *ExternalAgents
	body ecs.Entity
}

func (b *externalBrain) Decide(_ context.Context, v NegotiationView) []Decision {
	if p, ok := b.reg.takePending(b.body); ok {
		return []Decision{proposalToDecision(v.Self, p)}
	}
	return nil
}

// proposalToDecision interprets a proposal's offer payload. An optional
// "action" field selects accept/reject; anything else (or malformed JSON) is a
// counter-offer carrying the payload as terms.
func proposalToDecision(self ecs.Entity, p ProposalCommand) Decision {
	action := "counter"
	var m map[string]any
	if json.Unmarshal([]byte(p.OfferJSON), &m) == nil {
		if a, ok := m["action"].(string); ok {
			action = a
		}
	}
	switch action {
	case "accept":
		return Decision{Self: self, Kind: DecideAccept}
	case "reject":
		return Decision{Self: self, Kind: DecideReject}
	default:
		return Decision{Self: self, Kind: DecideCounter, OfferJSON: p.OfferJSON}
	}
}

// externalBindingSystem swaps a freshly-bound body's brain for an externalBrain
// and marks it external. Runs in StagePreUpdate, before the referee.
func externalBindingSystem(w *ecs.World) {
	reg := ecs.MustResource[ExternalAgents](w)
	bound := reg.takeNewlyBound()
	if len(bound) == 0 {
		return
	}
	brains := ecs.MustResource[Brains](w)
	for _, e := range bound {
		brains.Set(e, &externalBrain{reg: reg, body: e})
		if role, ok := ecs.Get[AgentRole](w, e); ok {
			role.Type = AgentTypeExternal
			role.Strategy = StrategyExternal
		}
	}
}

// seedExternalPool fills the assignable-body pool with all spawned agents. Runs
// as a startup system after spawn (and re-runs on reset).
func seedExternalPool(w *ecs.World) {
	reg := ecs.MustResource[ExternalAgents](w)
	var bodies []ecs.Entity
	q := ecs.Query1[AgentRole](w)
	for q.Next() {
		bodies = append(bodies, q.Entity())
	}
	reg.SeedAvailable(bodies)
}
