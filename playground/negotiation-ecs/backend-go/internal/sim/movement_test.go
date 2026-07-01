package sim

import (
	"context"
	"math"
	"math/rand"
	"testing"

	"github.com/erancihan/negotiation-ecs/engine"
	"github.com/erancihan/negotiation-ecs/engine/ecs"
)

func TestSeekBrainAimsAtTarget(t *testing.T) {
	b := SeekBrain{TargetX: 10, TargetY: 0}
	cmds := b.Decide(context.Background(), MoveView{Self: ecs.Entity{Index: 1}, X: 0, Y: 0, MaxSpeed: 5})
	if len(cmds) != 1 {
		t.Fatalf("got %d commands, want 1", len(cmds))
	}
	// Target is due east, so velocity should be +x at max speed.
	if math.Abs(cmds[0].VX-5) > 1e-9 || math.Abs(cmds[0].VY) > 1e-9 {
		t.Fatalf("velocity = (%v,%v), want (5,0)", cmds[0].VX, cmds[0].VY)
	}
}

func TestClampSpeed(t *testing.T) {
	vx, vy := clampSpeed(30, 40, 5) // magnitude 50 -> clamp to 5
	if math.Abs(math.Hypot(vx, vy)-5) > 1e-9 {
		t.Fatalf("clamped magnitude = %v, want 5", math.Hypot(vx, vy))
	}
	// Under the cap: unchanged.
	if x, y := clampSpeed(1, 0, 5); x != 1 || y != 0 {
		t.Fatalf("under-cap velocity changed: (%v,%v)", x, y)
	}
}

// TestSelfPropelledSkipsSteering: a self-propelled entity's velocity is not
// touched by the wander steering system.
func TestSelfPropelledSkipsSteering(t *testing.T) {
	w := ecs.NewWorld()
	ecs.SetResource(w, testConfig())
	ecs.SetResource(w, RNG{R: rand.New(rand.NewSource(1))})

	e := w.NewEntity()
	ecs.Add(w, e, Position{X: 100, Y: 100})
	ecs.Add(w, e, Velocity{DX: 1, DY: 2})
	ecs.Add(w, e, SelfPropelled{})

	for i := 0; i < 500; i++ {
		SteeringSystem(w)
	}
	vel, _ := ecs.Get[Velocity](w, e)
	if vel.DX != 1 || vel.DY != 2 {
		t.Fatalf("steering modified a self-propelled entity: %+v", *vel)
	}
}

// TestMoveBrainDrivesVelocityTowardTarget: a SeekBrain entity converges on its
// target over time through Move + Integration.
func TestMoveBrainDrivesVelocityTowardTarget(t *testing.T) {
	cfg := testConfig()
	cfg.NumAgents = 1
	a := engine.New().WithTickRate(10).WithMaxTicks(0).AddPlugin(NewPlugin(cfg))
	a.Start()
	w := a.World

	var e ecs.Entity
	q := ecs.Query1[AgentRole](w)
	q.Next()
	e = q.Entity()

	// Place it at a known spot and have it seek the world centre.
	pos, _ := ecs.Get[Position](w, e)
	pos.X, pos.Y = 0, 0
	target := struct{ x, y float64 }{cfg.WorldWidth / 2, cfg.WorldHeight / 2}
	SetMoveBrain(w, e, SeekBrain{TargetX: target.x, TargetY: target.y})

	dist := func() float64 {
		p, _ := ecs.Get[Position](w, e)
		return math.Hypot(target.x-p.X, target.y-p.Y)
	}
	start := dist()
	for i := 0; i < 50; i++ {
		a.Step()
	}
	if end := dist(); end >= start {
		t.Fatalf("seek brain did not approach target: start=%.2f end=%.2f", start, end)
	}
}

func TestIntegrationKeepsEntitiesInBounds(t *testing.T) {
	cfg := testConfig()
	a := engine.New().WithMaxTicks(300).AddPlugin(NewPlugin(cfg))
	a.AddSystem(engine.StageLast, func(w *ecs.World) {
		q := ecs.Query1[Position](w)
		for q.Next() {
			p := q.Get()
			if p.X < 0 || p.X > cfg.WorldWidth || p.Y < 0 || p.Y > cfg.WorldHeight {
				t.Fatalf("entity out of bounds: %+v", *p)
			}
		}
	})
	_ = a.Run(context.Background())
}
