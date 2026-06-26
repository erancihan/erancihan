package sim

import (
	"context"
	"testing"

	"github.com/erancihan/negotiation-ecs/backend-go/engine"
	"github.com/erancihan/negotiation-ecs/backend-go/engine/ecs"
)

// -----------------------------------------------------------------------------
// Brain behaviour (unit)
// -----------------------------------------------------------------------------

func TestCooperativeBrainAcceptsAfterOneRound(t *testing.T) {
	b := cooperativeBrain{}
	if got := b.Decide(context.Background(), NegotiationView{Round: 0}); got[0].Kind != DecideCounter {
		t.Fatalf("round 0: kind = %v, want Counter", got[0].Kind)
	}
	if got := b.Decide(context.Background(), NegotiationView{Round: 1}); got[0].Kind != DecideAccept {
		t.Fatalf("round 1: kind = %v, want Accept", got[0].Kind)
	}
}

func TestGreedyBrainHoldsOut(t *testing.T) {
	b := greedyBrain{}
	for round := 0; round < 5; round++ {
		if got := b.Decide(context.Background(), NegotiationView{Round: round}); got[0].Kind != DecideCounter {
			t.Fatalf("round %d: kind = %v, want Counter", round, got[0].Kind)
		}
	}
	if got := b.Decide(context.Background(), NegotiationView{Round: 5}); got[0].Kind != DecideAccept {
		t.Fatalf("round 5: kind = %v, want Accept", got[0].Kind)
	}
}

func TestRandomBrainAlwaysDecidesForSelf(t *testing.T) {
	b := makeBrain(StrategyRandom, 99)
	self := ecs.Entity{Index: 7, Generation: 1}
	for i := 0; i < 50; i++ {
		got := b.Decide(context.Background(), NegotiationView{Self: self, Round: i})
		if len(got) != 1 || got[0].Self != self {
			t.Fatalf("decision = %+v, want exactly one for self %+v", got, self)
		}
	}
}

// -----------------------------------------------------------------------------
// Referee (integration)
// -----------------------------------------------------------------------------

func TestRefereeProducesOutcomes(t *testing.T) {
	cfg := testConfig()
	a := newApp(cfg, 400)

	var accepted, rejected, counters int
	a.AddSystem(engine.StageLast, func(w *ecs.World) {
		for _, ev := range engine.Read[NegotiationEvent](w) {
			switch ev.Action {
			case ActionAccepted:
				accepted++
			case ActionRejected:
				rejected++
			case ActionCounterOffer:
				counters++
			}
		}
	})
	_ = a.Run(context.Background())

	if counters == 0 {
		t.Fatal("expected counter-offers from brains")
	}
	if accepted == 0 {
		t.Fatal("expected some negotiations to be accepted")
	}
	t.Logf("accepted=%d rejected=%d counters=%d", accepted, rejected, counters)
}

// TestDealEmittedPerAcceptance: every acceptance records exactly one Deal.
func TestDealEmittedPerAcceptance(t *testing.T) {
	cfg := testConfig()
	a := newApp(cfg, 400)

	var accepted, deals int
	a.AddSystem(engine.StageLast, func(w *ecs.World) {
		for _, ev := range engine.Read[NegotiationEvent](w) {
			if ev.Action == ActionAccepted {
				accepted++
			}
		}
		deals += len(engine.Read[Deal](w))
	})
	_ = a.Run(context.Background())

	if accepted == 0 {
		t.Fatal("expected acceptances")
	}
	if deals != accepted {
		t.Fatalf("deals = %d, want one per acceptance (%d)", deals, accepted)
	}
}

// TestRefereeDeterministicUnderConcurrentBrains: brains run concurrently, but
// per-brain RNG + conflict-free decisions must keep runs reproducible.
func TestRefereeDeterministicUnderConcurrentBrains(t *testing.T) {
	run := func() (int, int) {
		cfg := testConfig()
		a := newApp(cfg, 300)
		var accepted, deals int
		a.AddSystem(engine.StageLast, func(w *ecs.World) {
			for _, ev := range engine.Read[NegotiationEvent](w) {
				if ev.Action == ActionAccepted {
					accepted++
				}
			}
			deals += len(engine.Read[Deal](w))
		})
		_ = a.Run(context.Background())
		return accepted, deals
	}

	a1, d1 := run()
	a2, d2 := run()
	if a1 != a2 || d1 != d2 {
		t.Fatalf("seeded runs diverged: (%d,%d) vs (%d,%d)", a1, d1, a2, d2)
	}
}
