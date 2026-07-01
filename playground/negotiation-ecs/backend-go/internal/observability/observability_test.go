package observability

import (
	"context"
	"math"
	"testing"

	"github.com/erancihan/negotiation-ecs/engine"
	"github.com/erancihan/negotiation-ecs/backend-go/internal/economy"
	"github.com/erancihan/negotiation-ecs/backend-go/internal/sim"
)

func TestGini(t *testing.T) {
	const eps = 1e-9
	cases := []struct {
		name   string
		values []float64
		want   float64
	}{
		{"empty", nil, 0},
		{"all equal", []float64{5, 5, 5, 5}, 0},
		{"two split", []float64{0, 100}, 0.5},                 // (n-1)/n
		{"one has all", []float64{0, 0, 0, 100}, 0.75},        // (n-1)/n
		{"order independent", []float64{100, 0, 0, 0}, 0.75},  // sorted internally
	}
	for _, c := range cases {
		if got := gini(c.values); math.Abs(got-c.want) > eps {
			t.Errorf("gini(%s)=%v, want %v", c.name, got, c.want)
		}
	}
}

// TestObservabilityCapturesMetrics runs the full stack and checks the recorded
// metrics are sensible.
func TestObservabilityCapturesMetrics(t *testing.T) {
	cfg := sim.DefaultConfig()
	cfg.NumAgents = 40
	cfg.Seed = 5

	a := engine.New().WithMaxTicks(400).
		AddPlugin(sim.NewPlugin(cfg)).
		AddPlugin(economy.NewPlugin()).
		AddPlugin(NewPlugin())
	_ = a.Run(context.Background())

	m := Snapshot(a.World)

	if m["negotiations.started"] == 0 {
		t.Fatal("expected negotiations to have started")
	}
	if m["negotiations.accepted"] == 0 {
		t.Fatal("expected some acceptances")
	}
	if m["economy.settled"] == 0 {
		t.Fatal("expected settled deals")
	}
	// Settlement rate is a fraction.
	if r := m["economy.settlement_rate"]; r < 0 || r > 1 {
		t.Fatalf("settlement_rate = %v, want in [0,1]", r)
	}
	// Gini of a non-trivial distribution should be a fraction in (0,1).
	if g := m["wealth.gini"]; g <= 0 || g >= 1 {
		t.Fatalf("wealth.gini = %v, want in (0,1)", g)
	}
	// Wealth is conserved.
	if want := float64(cfg.NumAgents) * cfg.StartingCash; math.Abs(m["wealth.total"]-want) > 1e-6 {
		t.Fatalf("wealth.total = %v, want %v", m["wealth.total"], want)
	}
	if m["entities.total"] != float64(cfg.NumAgents) {
		t.Fatalf("entities.total = %v, want %d", m["entities.total"], cfg.NumAgents)
	}
	t.Logf("gini=%.3f settle_rate=%.2f accepted=%.0f",
		m["wealth.gini"], m["economy.settlement_rate"], m["negotiations.accepted"])
}

// TestObservabilityWithoutEconomy: settlement gauges simply stay absent when the
// economy plugin is not composed in.
func TestObservabilityWithoutEconomy(t *testing.T) {
	cfg := sim.DefaultConfig()
	cfg.NumAgents = 20
	cfg.Seed = 1

	a := engine.New().WithMaxTicks(50).
		AddPlugin(sim.NewPlugin(cfg)).
		AddPlugin(NewPlugin())
	_ = a.Run(context.Background())

	m := Snapshot(a.World)
	if _, ok := m["economy.settled"]; ok {
		t.Fatal("economy metrics should be absent without the economy plugin")
	}
	if _, ok := m["wealth.gini"]; !ok {
		t.Fatal("wealth metrics should be present regardless")
	}
}
