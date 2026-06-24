package sim

import (
	"fmt"
	"math"
	"math/rand"

	"github.com/erancihan/negotiation-ecs/backend-go/engine"
	"github.com/erancihan/negotiation-ecs/backend-go/engine/ecs"
)

// Plugin registers the negotiation simulation onto an engine App: it installs
// the Config and RNG resources, a startup system that spawns agents, and the
// per-tick systems (movement, timeout, negotiation) in StageUpdate.
type Plugin struct {
	Config Config
}

// NewPlugin returns a Plugin with the given configuration.
func NewPlugin(cfg Config) Plugin { return Plugin{Config: cfg} }

// Build implements engine.Plugin.
func (p Plugin) Build(a *engine.App) {
	cfg := p.Config

	seed := cfg.Seed
	if seed == 0 {
		seed = rand.Int63()
	}

	ecs.SetResource(a.World, cfg)
	ecs.SetResource(a.World, RNG{R: rand.New(rand.NewSource(seed))})

	a.AddStartupSystem(spawnSystem)
	a.AddSystem(engine.StageUpdate, MovementSystem)
	a.AddSystem(engine.StageUpdate, TimeoutSystem)
	a.AddSystem(engine.StageUpdate, NegotiationSystem)
}

// spawnSystem creates the initial set of agent entities.
func spawnSystem(w *ecs.World) {
	cfg := config(w)
	r := rng(w)
	strategies := []string{StrategyRandom, StrategyGreedy, StrategyCooperative}

	for i := 0; i < cfg.NumAgents; i++ {
		e := w.NewEntity()

		angle := r.Float64() * 2 * math.Pi
		speed := r.Float64() * cfg.MaxSpeed

		assets := make(map[string]float64, len(cfg.StartingAssets))
		for k, v := range cfg.StartingAssets {
			assets[k] = v
		}

		ecs.Add(w, e, Position{X: r.Float64() * cfg.WorldWidth, Y: r.Float64() * cfg.WorldHeight})
		ecs.Add(w, e, Velocity{DX: math.Cos(angle) * speed, DY: math.Sin(angle) * speed})
		ecs.Add(w, e, Inventory{Cash: cfg.StartingCash, Assets: assets})
		ecs.Add(w, e, NegotiationState{Status: StatusIdle})
		ecs.Add(w, e, AgentRole{
			Name:     fmt.Sprintf("Agent-%03d", i),
			Type:     AgentTypeInternal,
			Strategy: strategies[r.Intn(len(strategies))],
		})
	}
}
