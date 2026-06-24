package engine

import "sync"

// Control carries simulation control requests from outside the loop (e.g. a gRPC
// handler) into it. All methods are safe for concurrent use; the loop consumes
// the requests once per iteration via take.
type Control struct {
	mu     sync.Mutex
	paused bool
	step   bool
	reset  bool
}

func newControl() *Control { return &Control{} }

// Pause stops the loop from advancing ticks (it keeps running, idle).
func (c *Control) Pause() { c.set(func() { c.paused = true }) }

// Resume lets the loop advance again.
func (c *Control) Resume() { c.set(func() { c.paused = false }) }

// Step requests exactly one tick while paused.
func (c *Control) Step() { c.set(func() { c.step = true }) }

// Reset requests a world rebuild back to its initial state.
func (c *Control) Reset() { c.set(func() { c.reset = true }) }

// Paused reports whether the simulation is currently paused.
func (c *Control) Paused() bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.paused
}

func (c *Control) set(f func()) {
	c.mu.Lock()
	defer c.mu.Unlock()
	f()
}

// take reads and clears the one-shot requests (step, reset) and reads the
// current paused state. Called once per loop iteration.
func (c *Control) take() (paused, step, reset bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	paused, step, reset = c.paused, c.step, c.reset
	c.step = false
	c.reset = false
	return
}
