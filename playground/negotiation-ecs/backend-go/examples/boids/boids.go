// Package boids is a second, unrelated simulation built on the same engine — a
// Reynolds flocking model. It exists to prove the engine core is reusable: it
// imports only engine, engine/ecs, and the engine/spatial utility, with zero
// negotiation/economy/transport code. If flocking emerges from the same
// App/Schedule/ECS that runs the negotiation sim, the engine is genuinely
// domain-agnostic.
package boids

import (
	"math"
	"math/rand"

	"github.com/erancihan/negotiation-ecs/engine"
	"github.com/erancihan/negotiation-ecs/engine/ecs"
	"github.com/erancihan/negotiation-ecs/engine/spatial"
)

// Position is a boid's location.
type Position struct{ X, Y float64 }

// Velocity is a boid's movement vector.
type Velocity struct{ X, Y float64 }

// Config parameters for the flock.
type Config struct {
	NumBoids       int
	Width, Height  float64
	MaxSpeed       float64
	NeighborRadius float64
	SeparationDist float64

	AlignmentWeight  float64
	CohesionWeight   float64
	SeparationWeight float64

	Seed int64
}

// DefaultConfig returns a flock that visibly aligns and clusters.
func DefaultConfig() Config {
	return Config{
		NumBoids:         80,
		Width:            400,
		Height:           400,
		MaxSpeed:         40,
		NeighborRadius:   60,
		SeparationDist:   15,
		AlignmentWeight:  0.15,
		CohesionWeight:   0.01,
		SeparationWeight: 0.08,
		Seed:             0,
	}
}

// rngRes holds the shared random source.
type rngRes struct{ r *rand.Rand }

func config(w *ecs.World) *Config { return ecs.MustResource[Config](w) }
func rng(w *ecs.World) *rand.Rand { return ecs.MustResource[rngRes](w).r }

// Plugin registers the flocking simulation onto an engine App.
type Plugin struct{ Config Config }

// NewPlugin returns a boids plugin.
func NewPlugin(cfg Config) Plugin { return Plugin{Config: cfg} }

// Build implements engine.Plugin.
func (p Plugin) Build(a *engine.App) {
	cfg := p.Config
	seed := cfg.Seed
	if seed == 0 {
		seed = rand.Int63()
	}
	a.AddStartupSystem(func(w *ecs.World) {
		ecs.SetResource(w, cfg)
		ecs.SetResource(w, rngRes{r: rand.New(rand.NewSource(seed))})
		// Cell size ~ the neighbor radius so each query touches a few cells.
		ecs.SetResource(w, flockGrid{g: spatial.NewGrid[int](cfg.NeighborRadius)})
	})
	a.AddStartupSystem(spawnSystem)
	a.AddSystem(engine.StageUpdate, FlockingSystem)
	a.AddSystem(engine.StageUpdate, IntegrationSystem)
}

func spawnSystem(w *ecs.World) {
	cfg := config(w)
	r := rng(w)
	for i := 0; i < cfg.NumBoids; i++ {
		e := w.NewEntity()
		angle := r.Float64() * 2 * math.Pi
		speed := cfg.MaxSpeed * (0.5 + 0.5*r.Float64())
		ecs.Add(w, e, Position{X: r.Float64() * cfg.Width, Y: r.Float64() * cfg.Height})
		ecs.Add(w, e, Velocity{X: math.Cos(angle) * speed, Y: math.Sin(angle) * speed})
	}
}

// boidState is a per-tick snapshot of a boid, decoupling the flocking
// computation from the ECS so it can be tested and benchmarked directly.
type boidState struct {
	e              ecs.Entity
	px, py, vx, vy float64
}

// flockGrid holds the reused spatial grid (resource), rebuilt each tick.
type flockGrid struct{ g *spatial.Grid[int] }

// FlockingSystem applies separation, alignment, and cohesion. It rebuilds a
// spatial grid each tick and queries only nearby cells, making neighbor finding
// ~O(n) instead of O(n^2). New velocities are computed from the snapshot and
// applied afterward, so the result is independent of write order; and because
// the grid is visited in a deterministic order, the run stays reproducible.
func FlockingSystem(w *ecs.World) {
	cfg := config(w)
	grid := ecs.MustResource[flockGrid](w).g

	boids := snapshotBoids(w)

	grid.Clear()
	for i := range boids {
		grid.Insert(boids[i].px, boids[i].py, i)
	}

	newVel := computeVelocities(boids, cfg, func(i int, visit func(j int)) {
		grid.Query(boids[i].px, boids[i].py, cfg.NeighborRadius, visit)
	})

	for i := range boids {
		if v, ok := ecs.Get[Velocity](w, boids[i].e); ok {
			*v = newVel[i]
		}
	}
}

// snapshotBoids reads all boids' kinematic state into a slice.
func snapshotBoids(w *ecs.World) []boidState {
	var boids []boidState
	q := ecs.Query2[Position, Velocity](w)
	for q.Next() {
		p, v := q.Get()
		boids = append(boids, boidState{q.Entity(), p.X, p.Y, v.X, v.Y})
	}
	return boids
}

// computeVelocities is the shared flocking math. Neighbor enumeration is
// injected (grid-backed in production, brute-force in tests/benchmarks), so the
// rules live in one place regardless of how neighbors are found.
func computeVelocities(boids []boidState, cfg *Config, neighbors func(i int, visit func(j int))) []Velocity {
	radius2 := cfg.NeighborRadius * cfg.NeighborRadius
	sep2 := cfg.SeparationDist * cfg.SeparationDist
	out := make([]Velocity, len(boids))

	for i := range boids {
		var aliX, aliY, cohX, cohY, sepX, sepY float64
		var n, sepN int

		neighbors(i, func(j int) {
			if i == j {
				return
			}
			dx := boids[i].px - boids[j].px
			dy := boids[i].py - boids[j].py
			d2 := dx*dx + dy*dy
			if d2 == 0 || d2 > radius2 {
				return
			}
			n++
			aliX += boids[j].vx
			aliY += boids[j].vy
			cohX += boids[j].px
			cohY += boids[j].py
			if d2 < sep2 {
				sepX += dx
				sepY += dy
				sepN++
			}
		})

		vx, vy := boids[i].vx, boids[i].vy
		if n > 0 {
			inv := 1.0 / float64(n)
			vx += (aliX*inv - boids[i].vx) * cfg.AlignmentWeight
			vy += (aliY*inv - boids[i].vy) * cfg.AlignmentWeight
			vx += (cohX*inv - boids[i].px) * cfg.CohesionWeight
			vy += (cohY*inv - boids[i].py) * cfg.CohesionWeight
		}
		if sepN > 0 {
			vx += sepX * cfg.SeparationWeight
			vy += sepY * cfg.SeparationWeight
		}
		out[i] = clamp(vx, vy, cfg.MaxSpeed)
	}
	return out
}

// bruteForceNeighbors enumerates every other boid — the O(n^2) reference used by
// tests and benchmarks to validate and contrast the grid path.
func bruteForceNeighbors(boids []boidState) func(i int, visit func(j int)) {
	return func(_ int, visit func(j int)) {
		for j := range boids {
			visit(j)
		}
	}
}

// IntegrationSystem advances positions, wrapping toroidally at the bounds.
func IntegrationSystem(w *ecs.World) {
	dt := ecs.MustResource[engine.Time](w).Delta
	cfg := config(w)

	q := ecs.Query2[Position, Velocity](w)
	for q.Next() {
		p, v := q.Get()
		p.X = wrap(p.X+v.X*dt, cfg.Width)
		p.Y = wrap(p.Y+v.Y*dt, cfg.Height)
	}
}

func clamp(vx, vy, max float64) Velocity {
	if mag := math.Hypot(vx, vy); mag > max && mag > 0 {
		return Velocity{X: vx / mag * max, Y: vy / mag * max}
	}
	return Velocity{X: vx, Y: vy}
}

func wrap(x, max float64) float64 {
	x = math.Mod(x, max)
	if x < 0 {
		x += max
	}
	return x
}

// Alignment returns the flock order parameter: the magnitude of the mean unit
// velocity, in [0,1]. Near 0 is disordered; near 1 is a coherent flock.
func Alignment(w *ecs.World) float64 {
	var sx, sy float64
	var n int
	q := ecs.Query1[Velocity](w)
	for q.Next() {
		v := q.Get()
		if m := math.Hypot(v.X, v.Y); m > 0 {
			sx += v.X / m
			sy += v.Y / m
			n++
		}
	}
	if n == 0 {
		return 0
	}
	return math.Hypot(sx, sy) / float64(n)
}
