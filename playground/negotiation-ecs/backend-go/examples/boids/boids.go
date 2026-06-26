// Package boids is a second, unrelated simulation built on the same engine — a
// Reynolds flocking model. It exists to prove the engine core is reusable: it
// imports only engine and engine/ecs, with zero negotiation/economy/transport
// code. If flocking emerges from the same App/Schedule/ECS that runs the
// negotiation sim, the engine is genuinely domain-agnostic.
package boids

import (
	"math"
	"math/rand"

	"github.com/erancihan/negotiation-ecs/backend-go/engine"
	"github.com/erancihan/negotiation-ecs/backend-go/engine/ecs"
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

// FlockingSystem applies separation, alignment, and cohesion. New velocities are
// computed from the current snapshot and applied afterward, so the result is
// independent of iteration order (and therefore deterministic).
func FlockingSystem(w *ecs.World) {
	cfg := config(w)

	type boid struct {
		e              ecs.Entity
		px, py, vx, vy float64
	}
	var boids []boid
	q := ecs.Query2[Position, Velocity](w)
	for q.Next() {
		p, v := q.Get()
		boids = append(boids, boid{q.Entity(), p.X, p.Y, v.X, v.Y})
	}

	radius2 := cfg.NeighborRadius * cfg.NeighborRadius
	sep2 := cfg.SeparationDist * cfg.SeparationDist
	newVel := make([]Velocity, len(boids))

	for i := range boids {
		var aliX, aliY, cohX, cohY, sepX, sepY float64
		var n, sepN int

		for j := range boids {
			if i == j {
				continue
			}
			dx := boids[i].px - boids[j].px
			dy := boids[i].py - boids[j].py
			d2 := dx*dx + dy*dy
			if d2 == 0 || d2 > radius2 {
				continue
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
		}

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
		newVel[i] = clamp(vx, vy, cfg.MaxSpeed)
	}

	for i := range boids {
		if v, ok := ecs.Get[Velocity](w, boids[i].e); ok {
			*v = newVel[i]
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
