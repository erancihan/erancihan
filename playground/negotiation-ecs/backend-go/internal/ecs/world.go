package ecs

import (
	"fmt"
	"math"
	"math/rand"

	"github.com/mlange-42/ark/ecs"
)

// WorldConfig holds configuration parameters for world initialization.
type WorldConfig struct {
	// NumAgents is the number of agent entities to spawn.
	NumAgents int

	// WorldWidth is the width of the 2D world space.
	WorldWidth float64

	// WorldHeight is the height of the 2D world space.
	WorldHeight float64

	// MaxSpeed is the maximum speed for agent velocity components.
	MaxSpeed float64

	// StartingCash is the initial cash each agent receives.
	StartingCash float64

	// StartingAssets maps asset names to initial quantities.
	StartingAssets map[string]float64

	// NegotiationTimeoutTicks is how many ticks before a negotiation expires.
	NegotiationTimeoutTicks uint64

	// Seed for the random number generator. 0 = use time-based seed.
	Seed int64
}

// DefaultWorldConfig returns a sensible default configuration.
func DefaultWorldConfig() WorldConfig {
	return WorldConfig{
		NumAgents:   50,
		WorldWidth:  1000.0,
		WorldHeight: 1000.0,
		MaxSpeed:    5.0,
		StartingCash: 1000.0,
		StartingAssets: map[string]float64{
			"gold":   10.0,
			"silver": 50.0,
			"oil":    25.0,
		},
		NegotiationTimeoutTicks: 100,
		Seed:                    0,
	}
}

// SimWorld wraps the Ark ECS world and provides high-level operations
// for the negotiation simulation.
type SimWorld struct {
	World  ecs.World
	Config WorldConfig

	// Mapper for creating agent entities with all required components.
	agentMapper *ecs.Map5[Position, Velocity, Inventory, NegotiationState, AgentRole]

	// Filters for system queries.
	FilterMovement    *ecs.Filter2[Position, Velocity]
	FilterNegotiation *ecs.Filter2[NegotiationState, Inventory]
	FilterAgents      *ecs.Filter1[AgentRole]
	FilterAll         *ecs.Filter5[Position, Velocity, Inventory, NegotiationState, AgentRole]

	// Simulation state
	CurrentTick uint64
	DeltaTime   float64 // seconds per tick

	rng *rand.Rand
}

// NewSimWorld creates and initializes a new simulation world.
func NewSimWorld(cfg WorldConfig) *SimWorld {
	world := ecs.NewWorld()

	var seed int64
	if cfg.Seed != 0 {
		seed = cfg.Seed
	} else {
		seed = rand.Int63()
	}

	sw := &SimWorld{
		World:     world,
		Config:    cfg,
		DeltaTime: 0.05, // 50ms per tick = 20Hz
		rng:       rand.New(rand.NewSource(seed)),
	}

	// Create component mappers and filters
	sw.agentMapper = ecs.NewMap5[Position, Velocity, Inventory, NegotiationState, AgentRole](&sw.World)
	sw.FilterMovement = ecs.NewFilter2[Position, Velocity](&sw.World)
	sw.FilterNegotiation = ecs.NewFilter2[NegotiationState, Inventory](&sw.World)
	sw.FilterAgents = ecs.NewFilter1[AgentRole](&sw.World)
	sw.FilterAll = ecs.NewFilter5[Position, Velocity, Inventory, NegotiationState, AgentRole](&sw.World)

	return sw
}

// SpawnAgents creates the initial set of agent entities.
func (sw *SimWorld) SpawnAgents() {
	strategies := []string{StrategyRandom, StrategyGreedy, StrategyCooperative}

	for i := 0; i < sw.Config.NumAgents; i++ {
		// Random position within world bounds
		pos := Position{
			X: sw.rng.Float64() * sw.Config.WorldWidth,
			Y: sw.rng.Float64() * sw.Config.WorldHeight,
		}

		// Random velocity with magnitude up to MaxSpeed
		angle := sw.rng.Float64() * 2 * math.Pi
		speed := sw.rng.Float64() * sw.Config.MaxSpeed
		vel := Velocity{
			DX: math.Cos(angle) * speed,
			DY: math.Sin(angle) * speed,
		}

		// Copy starting assets
		assets := make(map[string]float64)
		for k, v := range sw.Config.StartingAssets {
			assets[k] = v
		}

		inv := Inventory{
			Cash:   sw.Config.StartingCash,
			Assets: assets,
		}

		neg := NegotiationState{
			Status: StatusIdle,
		}

		role := AgentRole{
			Name:     fmt.Sprintf("Agent-%03d", i),
			Type:     AgentTypeInternal,
			Strategy: strategies[sw.rng.Intn(len(strategies))],
		}

		sw.agentMapper.NewEntity(&pos, &vel, &inv, &neg, &role)
	}
}

// Tick advances the simulation by one step.
func (sw *SimWorld) Tick() {
	sw.CurrentTick++
}

// LogicalTime returns the current simulation time in seconds.
func (sw *SimWorld) LogicalTime() float64 {
	return float64(sw.CurrentTick) * sw.DeltaTime
}
