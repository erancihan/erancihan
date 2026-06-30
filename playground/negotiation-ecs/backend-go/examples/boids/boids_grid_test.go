package boids

import (
	"math"
	"math/rand"
	"testing"

	"github.com/erancihan/negotiation-ecs/engine/spatial"
)

// makeBoids builds n deterministic boids spread over a world of the given size.
func makeBoids(n int, width, height, maxSpeed float64, seed int64) []boidState {
	r := rand.New(rand.NewSource(seed))
	boids := make([]boidState, n)
	for i := range boids {
		x, y := r.Float64()*width, r.Float64()*height
		ang := r.Float64() * 2 * math.Pi
		sp := maxSpeed * (0.5 + 0.5*r.Float64())
		boids[i] = boidState{px: x, py: y, vx: math.Cos(ang) * sp, vy: math.Sin(ang) * sp}
	}
	return boids
}

func gridNeighbors(boids []boidState, cfg *Config) (*spatial.Grid[int], func(i int, visit func(j int))) {
	g := spatial.NewGrid[int](cfg.NeighborRadius)
	for i := range boids {
		g.Insert(boids[i].px, boids[i].py, i)
	}
	return g, func(i int, visit func(j int)) {
		g.Query(boids[i].px, boids[i].py, cfg.NeighborRadius, visit)
	}
}

// TestGridFlockingMatchesBruteForce: the grid path produces the same velocities
// as the O(n^2) reference (to floating tolerance — identical neighbor sets, only
// summation order differs).
func TestGridFlockingMatchesBruteForce(t *testing.T) {
	cfg := DefaultConfig()
	boids := makeBoids(400, cfg.Width, cfg.Height, cfg.MaxSpeed, 3)

	naive := computeVelocities(boids, &cfg, bruteForceNeighbors(boids))
	_, gn := gridNeighbors(boids, &cfg)
	grid := computeVelocities(boids, &cfg, gn)

	for i := range boids {
		if math.Abs(naive[i].X-grid[i].X) > 1e-9 || math.Abs(naive[i].Y-grid[i].Y) > 1e-9 {
			t.Fatalf("boid %d: grid=%+v, brute-force=%+v", i, grid[i], naive[i])
		}
	}
}

// Flocking benchmarks at scale (large world keeps density moderate so the grid's
// locality shows). Run: go test ./examples/boids -bench=Flock -benchmem
func benchmarkFlock(b *testing.B, n int, useGrid bool) {
	cfg := DefaultConfig()
	cfg.Width, cfg.Height = 2000, 2000
	boids := makeBoids(n, cfg.Width, cfg.Height, cfg.MaxSpeed, 1)
	grid := spatial.NewGrid[int](cfg.NeighborRadius)

	b.ResetTimer()
	for it := 0; it < b.N; it++ {
		if useGrid {
			grid.Clear()
			for i := range boids {
				grid.Insert(boids[i].px, boids[i].py, i)
			}
			_ = computeVelocities(boids, &cfg, func(i int, visit func(j int)) {
				grid.Query(boids[i].px, boids[i].py, cfg.NeighborRadius, visit)
			})
		} else {
			_ = computeVelocities(boids, &cfg, bruteForceNeighbors(boids))
		}
	}
}

func BenchmarkFlockBruteForce2k(b *testing.B) { benchmarkFlock(b, 2000, false) }
func BenchmarkFlockGrid2k(b *testing.B)       { benchmarkFlock(b, 2000, true) }
func BenchmarkFlockBruteForce5k(b *testing.B) { benchmarkFlock(b, 5000, false) }
func BenchmarkFlockGrid5k(b *testing.B)       { benchmarkFlock(b, 5000, true) }
