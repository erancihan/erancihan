package economy

import (
	"context"
	"math"
	"testing"

	"github.com/erancihan/negotiation-ecs/engine"
	"github.com/erancihan/negotiation-ecs/engine/ecs"
	"github.com/erancihan/negotiation-ecs/backend-go/internal/sim"
)

func totals(w *ecs.World) (cash float64, assets map[string]float64) {
	assets = make(map[string]float64)
	q := ecs.Query1[sim.Inventory](w)
	for q.Next() {
		inv := q.Get()
		cash += inv.Cash
		for k, v := range inv.Assets {
			assets[k] += v
		}
	}
	return
}

// TestSettlementConservesCashAndAssets runs the full sim + economy and asserts
// that every tick the world totals are unchanged — settlement only moves value
// between agents, never creating or destroying it.
func TestSettlementConservesCashAndAssets(t *testing.T) {
	cfg := sim.DefaultConfig()
	cfg.NumAgents = 30
	cfg.Seed = 7

	wantCash := float64(cfg.NumAgents) * cfg.StartingCash
	wantAssets := make(map[string]float64)
	for k, v := range cfg.StartingAssets {
		wantAssets[k] = float64(cfg.NumAgents) * v
	}

	const eps = 1e-6
	a := engine.New().WithMaxTicks(500).
		AddPlugin(sim.NewPlugin(cfg)).
		AddPlugin(NewPlugin())

	a.AddSystem(engine.StageLast, func(w *ecs.World) {
		cash, assets := totals(w)
		if math.Abs(cash-wantCash) > eps {
			t.Fatalf("tick %d: total cash = %v, want %v",
				ecs.MustResource[engine.Time](w).Tick, cash, wantCash)
		}
		for k, want := range wantAssets {
			if math.Abs(assets[k]-want) > eps {
				t.Fatalf("tick %d: total %s = %v, want %v",
					ecs.MustResource[engine.Time](w).Tick, k, assets[k], want)
			}
		}
	})
	_ = a.Run(context.Background())

	eco := ecs.MustResource[Economy](a.World)
	settled, failed := eco.Counts()
	if settled == 0 {
		t.Fatal("expected some deals to settle")
	}
	t.Logf("settled=%d failed=%d", settled, failed)
}

func TestSettleValidSwap(t *testing.T) {
	w := ecs.NewWorld()
	eco := &Economy{}

	from := w.NewEntity()
	ecs.Add(w, from, sim.Inventory{Cash: 100, Assets: map[string]float64{"gold": 0}})
	to := w.NewEntity()
	ecs.Add(w, to, sim.Inventory{Cash: 0, Assets: map[string]float64{"gold": 10}})

	d := sim.Deal{From: from, To: to, OfferJSON: sim.Offer{
		OfferCash: 30, RequestAsset: "gold", RequestAmount: 5,
	}.JSON()}
	settle(w, eco, 1, d)

	if settled, _ := eco.Counts(); settled != 1 {
		t.Fatalf("settled count = %d, want 1", settled)
	}
	fi, _ := ecs.Get[sim.Inventory](w, from)
	ti, _ := ecs.Get[sim.Inventory](w, to)
	if fi.Cash != 70 || fi.Assets["gold"] != 5 {
		t.Fatalf("from = %+v, want cash 70 gold 5", *fi)
	}
	if ti.Cash != 30 || ti.Assets["gold"] != 5 {
		t.Fatalf("to = %+v, want cash 30 gold 5", *ti)
	}
}

func TestSettleRejectsOverdraft(t *testing.T) {
	w := ecs.NewWorld()
	eco := &Economy{}

	from := w.NewEntity()
	ecs.Add(w, from, sim.Inventory{Cash: 5, Assets: map[string]float64{}})
	to := w.NewEntity()
	ecs.Add(w, to, sim.Inventory{Cash: 0, Assets: map[string]float64{"gold": 10}})

	d := sim.Deal{From: from, To: to, OfferJSON: sim.Offer{
		OfferCash: 100, RequestAsset: "gold", RequestAmount: 5,
	}.JSON()}
	settle(w, eco, 1, d)

	if _, failed := eco.Counts(); failed != 1 {
		t.Fatalf("failed count = %d, want 1", failed)
	}
	// Balances untouched.
	fi, _ := ecs.Get[sim.Inventory](w, from)
	ti, _ := ecs.Get[sim.Inventory](w, to)
	if fi.Cash != 5 {
		t.Fatalf("from cash = %v, want unchanged 5", fi.Cash)
	}
	if ti.Assets["gold"] != 10 {
		t.Fatalf("to gold = %v, want unchanged 10", ti.Assets["gold"])
	}
}

func TestSettleRejectsInsufficientAsset(t *testing.T) {
	w := ecs.NewWorld()
	eco := &Economy{}

	from := w.NewEntity()
	ecs.Add(w, from, sim.Inventory{Cash: 100, Assets: map[string]float64{}})
	to := w.NewEntity()
	ecs.Add(w, to, sim.Inventory{Cash: 0, Assets: map[string]float64{"gold": 2}})

	d := sim.Deal{From: from, To: to, OfferJSON: sim.Offer{
		OfferCash: 10, RequestAsset: "gold", RequestAmount: 5,
	}.JSON()}
	settle(w, eco, 1, d)

	if _, failed := eco.Counts(); failed != 1 {
		t.Fatalf("failed count = %d, want 1", failed)
	}
	fi, _ := ecs.Get[sim.Inventory](w, from)
	if fi.Cash != 100 {
		t.Fatalf("from cash = %v, want unchanged 100 (no partial settlement)", fi.Cash)
	}
}
