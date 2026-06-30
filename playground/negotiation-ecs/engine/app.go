package engine

import (
	"context"
	"time"

	"github.com/erancihan/negotiation-ecs/engine/ecs"
)

// defaultDelta is the seconds-per-tick used in unbounded mode, where there is
// no wall-clock tick rate to derive it from.
const defaultDelta = 0.05

// App wires together the world, the schedule, and the run loop. Build it with
// New, register systems and plugins, then call Run.
type App struct {
	// World is the ECS world all systems operate on. It is replaced on reset.
	World *ecs.World

	// Control accepts pause/resume/step/reset requests from outside the loop.
	Control *Control

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

// New returns an App with an empty world and schedule. The event-clear system
// is registered first in StageFirst so each tick begins with a clean event bus.
func New() *App {
	a := &App{
		World:    ecs.NewWorld(),
		Control:  newControl(),
		schedule: newSchedule(),
	}
	a.AddSystem(StageFirst, clearEventsSystem)
	return a
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
	// Pre-create the messaging resources so cross-goroutine submitters never
	// race to create them; only their internally-guarded queues mutate after.
	eventsOf(a.World)
	commandsOf(a.World)
	for _, sys := range a.startup {
		sys(a.World)
	}
	a.started = true
}

// Start performs one-time initialization (install resources, run startup
// systems) without advancing any ticks. Call it before serving requests that
// read world state, so resources exist before the first RPC arrives. It is
// idempotent and called automatically by Step/Run.
func (a *App) Start() { a.start() }

// reset rebuilds the world to its initial state: a fresh world, resources and
// startup systems re-run, clock back to zero. Startup systems must (re-)install
// any resources they depend on, since the previous world is discarded.
func (a *App) reset() {
	a.World = ecs.NewWorld()
	a.started = false
	a.start()
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
				if a.advance() && a.reachedMax() {
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
			if a.advance() {
				if a.reachedMax() {
					return nil
				}
			} else {
				// Paused in unbounded mode — yield instead of busy-spinning.
				time.Sleep(time.Millisecond)
			}
		}
	}
}

// advance applies pending control requests and runs at most one tick. It returns
// true if a tick actually ran (false when reset or paused without a step).
func (a *App) advance() bool {
	paused, step, reset := a.Control.take()
	switch {
	case reset:
		a.reset()
		return false
	case paused && !step:
		return false
	default:
		a.Step()
		return true
	}
}

// reachedMax reports whether the configured tick limit has been hit.
func (a *App) reachedMax() bool {
	if a.maxTicks == 0 {
		return false
	}
	return ecs.MustResource[Time](a.World).Tick >= a.maxTicks
}
