// Package economy settles agreed deals. It is decoupled from negotiation: it
// knows only how to move cash and assets between entities, conserving totals and
// refusing anything that would overdraw. It depends on the domain types
// (sim.Deal, sim.Offer, sim.Inventory) but the domain does not depend on it —
// the App composes both plugins, so the dependency arrow points one way and the
// boundary is a real package boundary.
package economy

import (
	"github.com/erancihan/negotiation-ecs/engine"
	"github.com/erancihan/negotiation-ecs/engine/ecs"
	"github.com/erancihan/negotiation-ecs/backend-go/internal/sim"
)

// maxLedger caps the retained transaction history so a long run does not grow
// memory without bound. Lifetime counts are kept separately.
const maxLedger = 10000

// Transaction is one settlement attempt recorded in the ledger.
type Transaction struct {
	Tick    uint64
	From    ecs.Entity
	To      ecs.Entity
	Cash    float64
	Asset   string
	Amount  float64
	Settled bool
	Reason  string
}

// Economy is the settlement authority and ledger, stored as a resource. It is
// the single place value changes hands.
type Economy struct {
	ledger  []Transaction
	settled int
	failed  int
}

// Ledger returns the retained (most recent) transactions.
func (e *Economy) Ledger() []Transaction { return e.ledger }

// Counts returns the lifetime settled and failed transaction totals.
func (e *Economy) Counts() (settled, failed int) { return e.settled, e.failed }

func (e *Economy) record(txn Transaction) {
	if txn.Settled {
		e.settled++
	} else {
		e.failed++
	}
	if len(e.ledger) >= maxLedger {
		// Drop the oldest to stay bounded.
		copy(e.ledger, e.ledger[1:])
		e.ledger = e.ledger[:len(e.ledger)-1]
	}
	e.ledger = append(e.ledger, txn)
}

// Plugin registers the economy resource and settlement system.
type Plugin struct{}

// NewPlugin returns the economy plugin.
func NewPlugin() Plugin { return Plugin{} }

// Build implements engine.Plugin.
func (Plugin) Build(a *engine.App) {
	a.AddStartupSystem(func(w *ecs.World) { ecs.SetResource(w, Economy{}) })
	a.AddSystem(engine.StagePostUpdate, SettlementSystem)
}

// SettlementSystem settles every Deal emitted this tick. Deals are produced by
// the referee in StageUpdate and read here in StagePostUpdate (same tick).
func SettlementSystem(w *ecs.World) {
	eco := ecs.MustResource[Economy](w)
	tick := ecs.MustResource[engine.Time](w).Tick
	for _, d := range engine.Read[sim.Deal](w) {
		settle(w, eco, tick, d)
	}
}

// settle validates and applies a single deal atomically: From pays cash to To,
// and To hands the requested asset to From. Either both legs apply or neither.
func settle(w *ecs.World, eco *Economy, tick uint64, d sim.Deal) {
	o := sim.ParseOffer(d.OfferJSON)
	txn := Transaction{
		Tick: tick, From: d.From, To: d.To,
		Cash: o.OfferCash, Asset: o.RequestAsset, Amount: o.RequestAmount,
	}

	from, okFrom := ecs.Get[sim.Inventory](w, d.From)
	to, okTo := ecs.Get[sim.Inventory](w, d.To)
	if !okFrom || !okTo {
		txn.Reason = "missing inventory"
		eco.record(txn)
		return
	}
	if o.OfferCash < 0 || o.RequestAmount < 0 {
		txn.Reason = "negative terms"
		eco.record(txn)
		return
	}

	wantsAsset := o.RequestAsset != "" && o.RequestAmount > 0

	if from.Cash < o.OfferCash {
		txn.Reason = "insufficient cash"
		eco.record(txn)
		return
	}
	if wantsAsset && to.Assets[o.RequestAsset] < o.RequestAmount {
		txn.Reason = "insufficient asset"
		eco.record(txn)
		return
	}

	// Apply both legs.
	from.Cash -= o.OfferCash
	to.Cash += o.OfferCash
	if wantsAsset {
		to.Assets[o.RequestAsset] -= o.RequestAmount
		if from.Assets == nil {
			from.Assets = make(map[string]float64)
		}
		from.Assets[o.RequestAsset] += o.RequestAmount
	}

	txn.Settled = true
	txn.Reason = "settled"
	eco.record(txn)
}
