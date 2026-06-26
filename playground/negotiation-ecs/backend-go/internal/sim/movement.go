package sim

import (
	"context"
	"math"

	"github.com/erancihan/negotiation-ecs/backend-go/engine"
	"github.com/erancihan/negotiation-ecs/backend-go/engine/ecs"
)

// Movement is split into three systems run in order each tick:
//
//	SteeringSystem    — sets velocity for default (wandering) entities
//	MoveSystem        — sets velocity for self-propelled entities from their brain
//	IntegrationSystem — applies velocity to position (+bounce) for ALL entities
//
// Integration is uniform and never overridable; only how velocity is *chosen*
// differs. An entity opts into agent control by carrying the SelfPropelled marker
// and registering a MoveBrain (see SetMoveBrain).

// SelfPropelled marks an entity whose velocity is chosen by a MoveBrain rather
// than by default steering.
type SelfPropelled struct{}

// MoveView is what a MoveBrain observes: the entity's kinematic state and the
// world bounds. Read-only, like NegotiationView.
type MoveView struct {
	Tick                    uint64
	Self                    ecs.Entity
	X, Y                    float64
	VX, VY                  float64
	WorldWidth, WorldHeight float64
	MaxSpeed                float64
}

// MoveCommand is a MoveBrain's desired velocity for its entity.
type MoveCommand struct {
	Self   ecs.Entity
	VX, VY float64
}

// MoveBrain is the optional movement controller (the agent's Move hook). It maps
// a MoveView to a desired velocity, reusing the same actor machinery as
// negotiation brains.
type MoveBrain = engine.Controller[MoveView, MoveCommand]

// MoveBrains maps self-propelled entities to their movement brains.
type MoveBrains struct {
	m map[ecs.Entity]MoveBrain
}

func newMoveBrains() MoveBrains { return MoveBrains{m: make(map[ecs.Entity]MoveBrain)} }

// Set binds a movement brain to an entity.
func (b *MoveBrains) Set(e ecs.Entity, brain MoveBrain) { b.m[e] = brain }

// For returns the movement brain bound to an entity, if any.
func (b *MoveBrains) For(e ecs.Entity) (MoveBrain, bool) {
	brain, ok := b.m[e]
	return brain, ok
}

// SetMoveBrain makes an entity self-propelled and binds its movement brain.
func SetMoveBrain(w *ecs.World, e ecs.Entity, brain MoveBrain) {
	ecs.Add(w, e, SelfPropelled{})
	ecs.MustResource[MoveBrains](w).Set(e, brain)
}

// SteeringSystem gives default (non-self-propelled) entities a wandering
// velocity: occasionally it re-aims them in a new random direction.
func SteeringSystem(w *ecs.World) {
	r := rng(w)
	cfg := config(w)

	q := ecs.Query2[Position, Velocity](w)
	for q.Next() {
		if ecs.Has[SelfPropelled](w, q.Entity()) {
			continue
		}
		if r.Float64() >= 0.05 {
			continue // keep heading most ticks
		}
		_, vel := q.Get()
		angle := r.Float64() * 2 * math.Pi
		speed := r.Float64() * cfg.MaxSpeed
		vel.DX = math.Cos(angle) * speed
		vel.DY = math.Sin(angle) * speed
	}
}

// MoveSystem sets velocity for self-propelled entities by asking their movement
// brain, bounded by the same per-tick deadline as negotiation.
func MoveSystem(w *ecs.World) {
	mb := ecs.MustResource[MoveBrains](w)
	cfg := config(w)
	tick := tickOf(w)

	var actors []engine.Actor[MoveView, MoveCommand]
	q := ecs.Query1[SelfPropelled](w)
	for q.Next() {
		e := q.Entity()
		if brain, ok := mb.For(e); ok {
			actors = append(actors, engine.Actor[MoveView, MoveCommand]{Entity: e, Controller: brain})
		}
	}
	if len(actors) == 0 {
		return
	}

	cmds := engine.DispatchActors(cfg.DecisionTimeout, actors,
		func(e ecs.Entity) MoveView { return buildMoveView(w, e, tick, cfg) })

	for _, c := range cmds {
		if vel, ok := ecs.Get[Velocity](w, c.Self); ok {
			vx, vy := clampSpeed(c.VX, c.VY, cfg.MaxSpeed)
			vel.DX, vel.DY = vx, vy
		}
	}
}

// IntegrationSystem applies velocity to position and bounces every entity off
// the world boundaries. It always runs, regardless of how velocity was chosen.
func IntegrationSystem(w *ecs.World) {
	dt := ecs.MustResource[engine.Time](w).Delta
	cfg := config(w)

	q := ecs.Query2[Position, Velocity](w)
	for q.Next() {
		pos, vel := q.Get()

		pos.X += vel.DX * dt
		pos.Y += vel.DY * dt

		switch {
		case pos.X < 0:
			pos.X = -pos.X
			vel.DX = -vel.DX
		case pos.X > cfg.WorldWidth:
			pos.X = 2*cfg.WorldWidth - pos.X
			vel.DX = -vel.DX
		}
		switch {
		case pos.Y < 0:
			pos.Y = -pos.Y
			vel.DY = -vel.DY
		case pos.Y > cfg.WorldHeight:
			pos.Y = 2*cfg.WorldHeight - pos.Y
			vel.DY = -vel.DY
		}
	}
}

func buildMoveView(w *ecs.World, e ecs.Entity, tick uint64, cfg *Config) MoveView {
	v := MoveView{
		Tick: tick, Self: e,
		WorldWidth: cfg.WorldWidth, WorldHeight: cfg.WorldHeight,
		MaxSpeed: cfg.MaxSpeed,
	}
	if p, ok := ecs.Get[Position](w, e); ok {
		v.X, v.Y = p.X, p.Y
	}
	if vel, ok := ecs.Get[Velocity](w, e); ok {
		v.VX, v.VY = vel.DX, vel.DY
	}
	return v
}

// clampSpeed scales a velocity down to at most max, preserving its direction.
func clampSpeed(vx, vy, max float64) (float64, float64) {
	if max <= 0 {
		return vx, vy
	}
	if mag := math.Hypot(vx, vy); mag > max && mag > 0 {
		return vx / mag * max, vy / mag * max
	}
	return vx, vy
}

// SeekBrain is an example MoveBrain: it steers straight toward a fixed target at
// the entity's max speed.
type SeekBrain struct {
	TargetX, TargetY float64
}

// Decide implements MoveBrain.
func (b SeekBrain) Decide(_ context.Context, v MoveView) []MoveCommand {
	dx, dy := b.TargetX-v.X, b.TargetY-v.Y
	mag := math.Hypot(dx, dy)
	if mag == 0 {
		return []MoveCommand{{Self: v.Self, VX: 0, VY: 0}}
	}
	return []MoveCommand{{Self: v.Self, VX: dx / mag * v.MaxSpeed, VY: dy / mag * v.MaxSpeed}}
}
