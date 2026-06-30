package sim

import (
	"math/rand"
	"time"

	"github.com/erancihan/negotiation-ecs/engine/ecs"
	"github.com/erancihan/negotiation-ecs/engine/spatial"
)

// Config holds simulation parameters. It is stored as an ECS resource so any
// system can read it.
type Config struct {
	NumAgents               int
	WorldWidth              float64
	WorldHeight             float64
	MaxSpeed                float64
	StartingCash            float64
	StartingAssets          map[string]float64
	NegotiationTimeoutTicks uint64
	Seed                    int64 // 0 = time-independent default seed

	// PairingRadius bounds how far apart two idle agents can be and still be
	// matched into a negotiation. It also sets the spatial grid's cell size.
	PairingRadius float64

	// DecisionTimeout bounds how long the referee waits for brains each tick.
	// Internal brains return instantly; this is the frame budget for slower
	// (e.g. networked) ones.
	DecisionTimeout time.Duration
}

// DefaultConfig returns a sensible default configuration.
func DefaultConfig() Config {
	return Config{
		NumAgents:    50,
		WorldWidth:   1000.0,
		WorldHeight:  1000.0,
		MaxSpeed:     5.0,
		StartingCash: 1000.0,
		StartingAssets: map[string]float64{
			"gold":   10.0,
			"silver": 50.0,
			"oil":    25.0,
		},
		NegotiationTimeoutTicks: 100,
		Seed:                    0,
		PairingRadius:           300.0,
		DecisionTimeout:         50 * time.Millisecond,
	}
}

// matchGrid holds the reused spatial grid for matchmaking (resource), rebuilt
// from the idle agents each tick.
type matchGrid struct{ g *spatial.Grid[int] }

// RNG is the shared random source, stored as a resource. Systems run on the loop
// goroutine only, so a single non-concurrent source is safe and keeps seeded
// runs deterministic.
type RNG struct{ R *rand.Rand }

// rng is a convenience accessor for the RNG resource.
func rng(w *ecs.World) *rand.Rand { return ecs.MustResource[RNG](w).R }

// config is a convenience accessor for the Config resource.
func config(w *ecs.World) *Config { return ecs.MustResource[Config](w) }
