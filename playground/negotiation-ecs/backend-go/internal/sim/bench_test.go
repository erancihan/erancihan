package sim

import (
	"testing"

	"github.com/erancihan/negotiation-ecs/engine"
)

// benchmarkSimStep times one full simulation tick (steering, movement, timeout,
// matchmaking, referee) at a given agent count. With grid-backed matchmaking the
// per-tick cost grows roughly linearly; an O(n^2) matcher would blow up
// quadratically. Run: go test ./internal/sim -bench=SimStep
func benchmarkSimStep(b *testing.B, agents int) {
	cfg := DefaultConfig()
	cfg.NumAgents = agents
	cfg.Seed = 1
	// Scale the world with the agent count to keep density (and so the average
	// neighbours per query) roughly constant.
	side := 1000.0
	for cfg.NumAgents > 50 && side*side < float64(agents)*20000 {
		side += 100
	}
	cfg.WorldWidth, cfg.WorldHeight = side, side

	a := engine.New().AddPlugin(NewPlugin(cfg))
	a.Start()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		a.Step()
	}
}

func BenchmarkSimStep500(b *testing.B)  { benchmarkSimStep(b, 500) }
func BenchmarkSimStep2000(b *testing.B) { benchmarkSimStep(b, 2000) }
func BenchmarkSimStep8000(b *testing.B) { benchmarkSimStep(b, 8000) }
