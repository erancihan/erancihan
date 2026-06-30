package transport_test

import (
	"testing"

	"github.com/erancihan/negotiation-ecs/engine"
	"github.com/erancihan/negotiation-ecs/backend-go/internal/economy"
	"github.com/erancihan/negotiation-ecs/backend-go/internal/observability"
	"github.com/erancihan/negotiation-ecs/backend-go/internal/sim"
	"github.com/erancihan/negotiation-ecs/backend-go/internal/transport"
)

// TestBuildFrameIncludesMetrics: when the observability plugin is composed in,
// the snapshot frame carries the metrics map.
func TestBuildFrameIncludesMetrics(t *testing.T) {
	cfg := sim.DefaultConfig()
	cfg.NumAgents = 20
	cfg.Seed = 1

	a := engine.New().
		AddPlugin(sim.NewPlugin(cfg)).
		AddPlugin(economy.NewPlugin()).
		AddPlugin(observability.NewPlugin())
	a.Start()
	for i := 0; i < 60; i++ {
		a.Step()
	}

	frame := transport.BuildFrame(a.World)
	m := frame.GetStats().GetMetrics()
	if len(m) == 0 {
		t.Fatal("expected metrics in the frame stats")
	}
	if _, ok := m["wealth.total"]; !ok {
		t.Fatalf("frame metrics missing wealth.total: %v", m)
	}
	if _, ok := m["wealth.gini"]; !ok {
		t.Fatalf("frame metrics missing wealth.gini: %v", m)
	}
}

// TestBuildFrameWithoutObservability: without the plugin, the frame still builds
// (metrics simply absent).
func TestBuildFrameWithoutObservability(t *testing.T) {
	cfg := sim.DefaultConfig()
	cfg.NumAgents = 10
	cfg.Seed = 1

	a := engine.New().AddPlugin(sim.NewPlugin(cfg))
	a.Start()
	a.Step()

	frame := transport.BuildFrame(a.World)
	if len(frame.GetStats().GetMetrics()) != 0 {
		t.Fatal("expected no metrics without the observability plugin")
	}
}
