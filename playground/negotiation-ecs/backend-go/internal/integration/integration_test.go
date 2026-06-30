// Package integration exercises the full composed stack (engine + sim + economy)
// end to end. Per-component behaviour is tested in each package; these tests
// assert the whole system is reproducible and conserves value.
package integration

import (
	"context"
	"crypto/sha256"
	"encoding/binary"
	"fmt"
	"math"
	"sort"
	"testing"

	"github.com/erancihan/negotiation-ecs/engine"
	"github.com/erancihan/negotiation-ecs/engine/ecs"
	"github.com/erancihan/negotiation-ecs/backend-go/internal/economy"
	"github.com/erancihan/negotiation-ecs/backend-go/internal/sim"
)

// summary is a deterministic fingerprint of a completed run.
type summary struct {
	acceptedEvents int
	settled        int
	failed         int
	cashDigest     string
}

func runFullStack(ticks uint64, seed int64) summary {
	cfg := sim.DefaultConfig()
	cfg.NumAgents = 30
	cfg.Seed = seed

	a := engine.New().WithMaxTicks(ticks).
		AddPlugin(sim.NewPlugin(cfg)).
		AddPlugin(economy.NewPlugin())

	accepted := 0
	a.AddSystem(engine.StageLast, func(w *ecs.World) {
		for _, ev := range engine.Read[sim.NegotiationEvent](w) {
			if ev.Action == sim.ActionAccepted {
				accepted++
			}
		}
	})
	_ = a.Run(context.Background())

	settled, failed := ecs.MustResource[economy.Economy](a.World).Counts()
	return summary{
		acceptedEvents: accepted,
		settled:        settled,
		failed:         failed,
		cashDigest:     cashDigest(a.World),
	}
}

// cashDigest hashes the sorted final cash balances, so it is invariant to entity
// ordering but sensitive to the actual distribution of value.
func cashDigest(w *ecs.World) string {
	var cash []float64
	q := ecs.Query1[sim.Inventory](w)
	for q.Next() {
		cash = append(cash, q.Get().Cash)
	}
	sort.Float64s(cash)

	h := sha256.New()
	var buf [8]byte
	for _, c := range cash {
		binary.LittleEndian.PutUint64(buf[:], math.Float64bits(c))
		_, _ = h.Write(buf[:])
	}
	return fmt.Sprintf("%x", h.Sum(nil))
}

// TestFullStackDeterministic: the whole composed system reproduces exactly for a
// fixed seed — same outcomes and same final value distribution.
func TestFullStackDeterministic(t *testing.T) {
	a := runFullStack(400, 2024)
	b := runFullStack(400, 2024)

	if a != b {
		t.Fatalf("full-stack runs diverged:\n  %+v\n  %+v", a, b)
	}
	if a.settled == 0 {
		t.Fatal("expected settled deals over the run")
	}
	t.Logf("accepted=%d settled=%d failed=%d", a.acceptedEvents, a.settled, a.failed)
}

// TestFullStackConservesValueEveryTick: with settlement active, total cash and
// every asset total stay constant across the entire run.
func TestFullStackConservesValueEveryTick(t *testing.T) {
	cfg := sim.DefaultConfig()
	cfg.NumAgents = 30
	cfg.Seed = 99

	wantCash := float64(cfg.NumAgents) * cfg.StartingCash
	wantAssets := make(map[string]float64)
	for k, v := range cfg.StartingAssets {
		wantAssets[k] = float64(cfg.NumAgents) * v
	}

	const eps = 1e-6
	a := engine.New().WithMaxTicks(400).
		AddPlugin(sim.NewPlugin(cfg)).
		AddPlugin(economy.NewPlugin())

	a.AddSystem(engine.StageLast, func(w *ecs.World) {
		var cash float64
		assets := make(map[string]float64)
		q := ecs.Query1[sim.Inventory](w)
		for q.Next() {
			inv := q.Get()
			cash += inv.Cash
			for k, v := range inv.Assets {
				assets[k] += v
			}
		}
		tick := ecs.MustResource[engine.Time](w).Tick
		if math.Abs(cash-wantCash) > eps {
			t.Fatalf("tick %d: total cash = %v, want %v", tick, cash, wantCash)
		}
		for k, want := range wantAssets {
			if math.Abs(assets[k]-want) > eps {
				t.Fatalf("tick %d: total %s = %v, want %v", tick, k, assets[k], want)
			}
		}
	})
	_ = a.Run(context.Background())
}
