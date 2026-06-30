// Package engine builds a small game-engine runtime on top of the hand-rolled
// ECS: a fixed-timestep loop, an ordered system schedule, plugins, and (in
// later slices) messaging, actors, and observers.
//
// The engine core is domain-agnostic — it knows nothing about negotiation,
// economy, or gRPC. Applications compose behaviour by registering systems and
// plugins onto an [App].
package engine

// Time is the per-tick clock, stored as an ECS resource and advanced once per
// tick by the loop. Systems read it via ecs.MustResource[Time].
type Time struct {
	// Tick is the monotonically increasing tick counter (first tick is 1).
	Tick uint64

	// Delta is the fixed seconds-per-tick for this run.
	Delta float64

	// Elapsed is the logical simulation time in seconds (Tick * Delta).
	Elapsed float64
}
