// Package metrics is a small, domain-agnostic metrics registry for the engine:
// named monotonic counters and point-in-time gauges that systems update each
// tick and observers read. Like engine/spatial, it knows nothing about any
// particular simulation — a domain decides what to record.
package metrics

import (
	"sort"
	"sync"
)

// Registry holds named counters (monotonically accumulated) and gauges (set to
// the latest value). It is safe for concurrent use so a reader (e.g. a network
// handler) can snapshot while a system updates.
type Registry struct {
	mu       sync.RWMutex
	counters map[string]float64
	gauges   map[string]float64
}

// New returns an empty registry.
func New() *Registry {
	return &Registry{
		counters: make(map[string]float64),
		gauges:   make(map[string]float64),
	}
}

// Inc adds delta to a counter.
func (r *Registry) Inc(name string, delta float64) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.counters[name] += delta
}

// Set assigns a gauge's current value.
func (r *Registry) Set(name string, value float64) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.gauges[name] = value
}

// Counter returns a counter's value (0 if unseen).
func (r *Registry) Counter(name string) float64 {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.counters[name]
}

// Gauge returns a gauge's value (0 if unseen).
func (r *Registry) Gauge(name string) float64 {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.gauges[name]
}

// Snapshot returns a copy of every metric (counters and gauges merged) — a
// stable view safe to read after the call returns.
func (r *Registry) Snapshot() map[string]float64 {
	r.mu.RLock()
	defer r.mu.RUnlock()

	out := make(map[string]float64, len(r.counters)+len(r.gauges))
	for k, v := range r.counters {
		out[k] = v
	}
	for k, v := range r.gauges {
		out[k] = v
	}
	return out
}

// Names returns all metric names in sorted order — handy for stable logging.
func (r *Registry) Names() []string {
	snap := r.Snapshot()
	names := make([]string, 0, len(snap))
	for k := range snap {
		names = append(names, k)
	}
	sort.Strings(names)
	return names
}
