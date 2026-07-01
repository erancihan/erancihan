// Package observability records simulation metrics each tick into an engine
// metrics registry: negotiation rates, settlement success, total wealth, and the
// Gini coefficient of the cash distribution. It observes the sim and economy but
// neither depends on it — the App composes it as just another plugin.
package observability

import (
	"log"
	"sort"

	"github.com/erancihan/negotiation-ecs/engine"
	"github.com/erancihan/negotiation-ecs/engine/ecs"
	"github.com/erancihan/negotiation-ecs/engine/metrics"
	"github.com/erancihan/negotiation-ecs/backend-go/internal/economy"
	"github.com/erancihan/negotiation-ecs/backend-go/internal/sim"
)

// metricsRes holds the registry as a resource (a pointer wrapper so the registry
// — which carries a mutex — is never copied).
type metricsRes struct{ r *metrics.Registry }

// Registry returns the metrics registry for the world.
func Registry(w *ecs.World) *metrics.Registry { return ecs.MustResource[metricsRes](w).r }

// Snapshot returns a copy of all current metrics.
func Snapshot(w *ecs.World) map[string]float64 { return Registry(w).Snapshot() }

// TrySnapshot returns a copy of all current metrics, or nil if the observability
// plugin is not installed — so callers (e.g. the transport layer) can include
// metrics opportunistically without depending on the plugin being present.
func TrySnapshot(w *ecs.World) map[string]float64 {
	if res, ok := ecs.GetResource[metricsRes](w); ok {
		return res.r.Snapshot()
	}
	return nil
}

// Plugin records metrics each tick. With LogEvery > 0 it also logs a summary
// line every LogEvery ticks.
type Plugin struct {
	LogEvery uint64
}

// NewPlugin returns a silent observability plugin (no periodic logging).
func NewPlugin() Plugin { return Plugin{} }

// Build implements engine.Plugin.
func (p Plugin) Build(a *engine.App) {
	every := p.LogEvery

	a.AddStartupSystem(func(w *ecs.World) {
		ecs.SetResource(w, metricsRes{r: metrics.New()})
	})

	// StageLast, registered before the snapshot system in main, so a surfaced
	// frame sees fresh metrics. Settlement (StagePostUpdate) has already run.
	a.AddSystem(engine.StageLast, func(w *ecs.World) {
		observe(w)
		if every > 0 {
			if tick := ecs.MustResource[engine.Time](w).Tick; tick%every == 0 {
				logMetrics(w, tick)
			}
		}
	})
}

func observe(w *ecs.World) {
	reg := Registry(w)

	// Cumulative negotiation counters from this tick's events.
	for _, ev := range engine.Read[sim.NegotiationEvent](w) {
		switch ev.Action {
		case sim.ActionOfferMade:
			reg.Inc("negotiations.started", 1)
		case sim.ActionCounterOffer:
			reg.Inc("negotiations.counters", 1)
		case sim.ActionAccepted:
			reg.Inc("negotiations.accepted", 1)
		case sim.ActionRejected:
			reg.Inc("negotiations.rejected", 1)
		case sim.ActionTimeout:
			reg.Inc("negotiations.timeout", 1)
		}
	}

	// Wealth distribution gauges.
	var cash []float64
	var total float64
	qi := ecs.Query1[sim.Inventory](w)
	for qi.Next() {
		c := qi.Get().Cash
		cash = append(cash, c)
		total += c
	}
	reg.Set("entities.total", float64(len(cash)))
	reg.Set("wealth.total", total)
	reg.Set("wealth.gini", gini(cash))

	// Active negotiations gauge.
	active := 0
	qn := ecs.Query1[sim.NegotiationState](w)
	for qn.Next() {
		switch qn.Get().Status {
		case sim.StatusOffering, sim.StatusCountering:
			active++
		}
	}
	reg.Set("negotiations.active", float64(active))

	// Economy settlement gauges, when the economy plugin is present.
	if eco, ok := ecs.GetResource[economy.Economy](w); ok {
		settled, failed := eco.Counts()
		reg.Set("economy.settled", float64(settled))
		reg.Set("economy.failed", float64(failed))
		if settled+failed > 0 {
			reg.Set("economy.settlement_rate", float64(settled)/float64(settled+failed))
		}
	}
}

func logMetrics(w *ecs.World, tick uint64) {
	reg := Registry(w)
	log.Printf("[metrics] tick %d | started=%.0f accepted=%.0f rejected=%.0f timeout=%.0f | active=%.0f | settle_rate=%.2f | wealth=%.0f gini=%.3f",
		tick,
		reg.Counter("negotiations.started"),
		reg.Counter("negotiations.accepted"),
		reg.Counter("negotiations.rejected"),
		reg.Counter("negotiations.timeout"),
		reg.Gauge("negotiations.active"),
		reg.Gauge("economy.settlement_rate"),
		reg.Gauge("wealth.total"),
		reg.Gauge("wealth.gini"),
	)
}

// gini computes the Gini coefficient of a set of values in [0,1]: 0 is perfect
// equality, approaching 1 is maximal concentration. Negative values are floored
// to 0; an empty or all-zero set is treated as perfectly equal (0).
func gini(values []float64) float64 {
	n := len(values)
	if n == 0 {
		return 0
	}
	xs := make([]float64, n)
	copy(xs, values)
	sort.Float64s(xs)

	var sum, weighted float64
	for i, x := range xs {
		if x < 0 {
			x = 0
		}
		sum += x
		weighted += float64(i+1) * x // 1-based rank
	}
	if sum == 0 {
		return 0
	}
	return (2*weighted)/(float64(n)*sum) - float64(n+1)/float64(n)
}
