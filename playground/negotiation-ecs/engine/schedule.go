package engine

import "github.com/erancihan/negotiation-ecs/engine/ecs"

// System is a unit of per-tick logic. It reads and mutates the world; any other
// services it needs (time, events, commands) are fetched as ECS resources.
type System func(*ecs.World)

// Stage names a slot in the per-tick pipeline. Stages run in the fixed order
// defined by stageOrder; systems within a stage run in registration order.
type Stage int

const (
	// StageFirst runs before everything else — e.g. swapping event buffers.
	StageFirst Stage = iota
	// StagePreUpdate gathers input — e.g. collecting controller intents.
	StagePreUpdate
	// StageUpdate is the main simulation work — movement, game logic.
	StageUpdate
	// StagePostUpdate runs after the main work — e.g. settlement, cleanup.
	StagePostUpdate
	// StageLast runs at the very end — e.g. snapshot and broadcast.
	StageLast
)

// stageOrder fixes the execution order of stages each tick.
var stageOrder = []Stage{
	StageFirst,
	StagePreUpdate,
	StageUpdate,
	StagePostUpdate,
	StageLast,
}

// Schedule holds the systems registered for each stage.
type Schedule struct {
	systems map[Stage][]System
}

func newSchedule() *Schedule {
	return &Schedule{systems: make(map[Stage][]System)}
}

// Add appends a system to a stage. Order of registration is preserved.
func (s *Schedule) Add(stage Stage, sys System) {
	s.systems[stage] = append(s.systems[stage], sys)
}

// Run executes every stage in order, and every system within a stage in
// registration order.
func (s *Schedule) Run(w *ecs.World) {
	for _, stage := range stageOrder {
		for _, sys := range s.systems[stage] {
			sys(w)
		}
	}
}
