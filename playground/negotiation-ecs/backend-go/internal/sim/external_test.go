package sim

import (
	"context"
	"testing"

	"github.com/erancihan/negotiation-ecs/backend-go/engine/ecs"
)

func TestExternalAgentsBindIsStableAndPooled(t *testing.T) {
	var reg ExternalAgents = newExternalAgents()
	reg.SeedAvailable([]ecs.Entity{{Index: 1, Generation: 1}, {Index: 2, Generation: 1}})

	a1, ok := reg.Bind("a")
	if !ok {
		t.Fatal("first bind should succeed")
	}
	a2, ok := reg.Bind("a")
	if !ok || a2 != a1 {
		t.Fatalf("re-bind of same agent = %+v, want stable %+v", a2, a1)
	}

	b, ok := reg.Bind("b")
	if !ok || b == a1 {
		t.Fatalf("second agent got %+v, want a distinct body", b)
	}

	if _, ok := reg.Bind("c"); ok {
		t.Fatal("pool exhausted — third agent should not bind")
	}
}

func TestProposalToDecision(t *testing.T) {
	self := ecs.Entity{Index: 3, Generation: 1}
	cases := map[string]DecisionKind{
		`{"action":"accept"}`:        DecideAccept,
		`{"action":"reject"}`:        DecideReject,
		`{"action":"counter","x":1}`: DecideCounter,
		`{"offer_cash":50}`:          DecideCounter, // no action -> counter
		`not json`:                   DecideCounter, // malformed -> counter
	}
	for payload, want := range cases {
		got := proposalToDecision(self, ProposalCommand{OfferJSON: payload})
		if got.Kind != want {
			t.Errorf("payload %q -> %v, want %v", payload, got.Kind, want)
		}
		if got.Self != self {
			t.Errorf("payload %q -> self %+v, want %+v", payload, got.Self, self)
		}
	}
}

func TestExternalBrainConsumesPendingOnce(t *testing.T) {
	reg := newExternalAgents()
	body := ecs.Entity{Index: 5, Generation: 1}
	brain := &externalBrain{reg: &reg, body: body}

	// No proposal yet -> hold (no decision).
	if got := brain.Decide(context.Background(), NegotiationView{Self: body}); got != nil {
		t.Fatalf("with no pending proposal, decide = %+v, want nil (hold)", got)
	}

	reg.SubmitPending(body, ProposalCommand{OfferJSON: `{"action":"accept"}`})
	got := brain.Decide(context.Background(), NegotiationView{Self: body})
	if len(got) != 1 || got[0].Kind != DecideAccept {
		t.Fatalf("decide = %+v, want one Accept", got)
	}
	// Consumed — next decide holds again.
	if again := brain.Decide(context.Background(), NegotiationView{Self: body}); again != nil {
		t.Fatalf("pending should be consumed once, got %+v", again)
	}
}

// TestExternalProposalDrivesNegotiation: a bound external agent's "accept"
// proposal concludes its negotiation end-to-end through the referee.
func TestExternalProposalDrivesNegotiation(t *testing.T) {
	cfg := testConfig()
	cfg.NumAgents = 4
	a := newApp(cfg, 0) // manual driving
	a.Start()
	w := a.World

	reg := ecs.MustResource[ExternalAgents](w)
	body, ok := reg.Bind("ext-1")
	if !ok {
		t.Fatal("bind failed")
	}
	externalBindingSystem(w) // swap in the external brain

	if role, _ := ecs.Get[AgentRole](w, body); role.Type != AgentTypeExternal {
		t.Fatalf("body role type = %q, want external", role.Type)
	}

	// Pick a counter-party and stage a negotiation with the external body
	// responding (COUNTERING).
	var cp ecs.Entity
	q := ecs.Query1[AgentRole](w)
	for q.Next() {
		if q.Entity() != body {
			cp = q.Entity()
			break
		}
	}
	en, _ := ecs.Get[NegotiationState](w, body)
	en.Status, en.CounterParty = StatusCountering, cp
	cn, _ := ecs.Get[NegotiationState](w, cp)
	cn.Status, cn.CounterParty = StatusOffering, body

	// The agent submits an accept, then the referee runs.
	reg.SubmitPending(body, ProposalCommand{AgentID: "ext-1", OfferJSON: `{"action":"accept"}`})
	runReferee(w, 10)

	if s, _ := ecs.Get[NegotiationState](w, body); s.Status != StatusAccepted {
		t.Fatalf("external body status = %q, want accepted", s.Status)
	}
	if s, _ := ecs.Get[NegotiationState](w, cp); s.Status != StatusAccepted {
		t.Fatalf("counter-party status = %q, want accepted", s.Status)
	}
}

// TestExternalBodyHoldsWithoutProposal: with no proposal in time, the external
// body stays in COUNTERING (holds) rather than progressing.
func TestExternalBodyHoldsWithoutProposal(t *testing.T) {
	cfg := testConfig()
	cfg.NumAgents = 4
	a := newApp(cfg, 0)
	a.Start()
	w := a.World

	reg := ecs.MustResource[ExternalAgents](w)
	body, _ := reg.Bind("ext-1")
	externalBindingSystem(w)

	var cp ecs.Entity
	q := ecs.Query1[AgentRole](w)
	for q.Next() {
		if q.Entity() != body {
			cp = q.Entity()
			break
		}
	}
	en, _ := ecs.Get[NegotiationState](w, body)
	en.Status, en.CounterParty = StatusCountering, cp
	cn, _ := ecs.Get[NegotiationState](w, cp)
	cn.Status, cn.CounterParty = StatusOffering, body

	runReferee(w, 10) // no proposal submitted

	if s, _ := ecs.Get[NegotiationState](w, body); s.Status != StatusCountering {
		t.Fatalf("external body status = %q, want it to hold in countering", s.Status)
	}
}
