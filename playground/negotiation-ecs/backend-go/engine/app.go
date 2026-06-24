package engine

import (
	"context"
	"time"

	"github.com/erancihan/negotiation-ecs/backend-go/engine/ecs"
)

// defaultDelta is the seconds-per-tick used in unbounded mode, where there is
// no wall-clock tick rate to derive it from.
const defaultDelta = 0.05

// App wires together the world, the schedule, and the run loop. Build it with
// New, register systems and plugins, then call Run.
type App struct {
	// World is the ECS world all systems operate on.
	World *ecs.World

	schedule *Schedule
	startup  []System

	// tickRate is the target ticks per second; 0 means run unbounded (as fast
	// as possible), which is used for headless benchmarking and deterministic
	// tests.
	tickRate int

	// maxTicks stops the loop after this many ticks; 0 means run until the
	// context is cancelled.
	maxTicks uint64

	started bool
}

// New returns an App with an empty world and schedule.
func New() *App {
	return &App{
		World:    ecs.NewWorld(),
		schedule: newSchedule(),
	}
}

// WithTickRate sets the target ticks per second. 0 = unbounded.
func (a *App) WithTickRate(hz int) *App { a.tickRate = hz; return a }

// WithMaxTicks stops the loop after n ticks. 0 = unlimited.
func (a *App) WithMaxTicks(n uint64) *App { a.maxTicks = n; return a }

// AddSystem registers a system to run each tick in the given stage.
func (a *App) AddSystem(stage Stage, sys System) *App {
	a.schedule.Add(stage, sys)
	return a
}

// AddStartupSystem registers a system to run exactly once, before the first
// tick. Use it for world initialization (spawning entities, seeding resources).
func (a *App) AddStartupSystem(sys System) *App {
	a.startup = append(a.startup, sys)
	return a
}

// AddPlugin lets a plugin register its components, resources, and systems.
func (a *App) AddPlugin(p Plugin) *App {
	p.Build(a)
	return a
}

// delta returns the fixed seconds-per-tick for this run.
func (a *App) delta() float64 {
	if a.tickRate > 0 {
		return 1.0 / float64(a.tickRate)
	}
	return defaultDelta
}

// start performs one-time setup: install the Time resource and run startup
// systems. It is idempotent.
func (a *App) start() {
	if a.started {
		return
	}
	ecs.SetResource(a.World, Time{Delta: a.delta()})
	for _, sys := range a.startup {
		sys(a.World)
	}
	a.started = true
}

// Step runs exactly one tick: advance the clock, then run the schedule. It runs
// startup first if it has not yet happened, so Step is usable on its own (tests,
// single-stepping a paused simulation).
func (a *App) Step() {
	a.start()
	t := ecs.MustResource[Time](a.World)
	t.Tick++
	t.Elapsed = float64(t.Tick) * t.Delta
	a.schedule.Run(a.World)
}

// Run executes the simulation loop until the context is cancelled or maxTicks is
// reached, whichever comes first. It returns nil on a clean stop (both of those
// count as clean); a non-nil error is reserved for future fatal conditions.
//
// With a tick rate, the loop is paced by a ticker; unbounded, it runs as fast as
// possible.
func (a *App) Run(ctx context.Context) error {
	a.start()

	if a.tickRate > 0 {
		interval := time.Duration(float64(time.Second) / float64(a.tickRate))
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return nil
			case <-ticker.C:
				a.Step()
				if a.reachedMax() {
					return nil
				}
			}
		}
	}

	for {
		select {
		case <-ctx.Done():
			return nil
		default:
			a.Step()
			if a.reachedMax() {
				return nil
			}
		}
	}
}

// reachedMax reports whether the configured tick limit has been hit.
func (a *App) reachedMax() bool {
	if a.maxTicks == 0 {
		return false
	}
	return ecs.MustResource[Time](a.World).Tick >= a.maxTicks
}
