package sim

import (
	"encoding/json"
	"math/rand"
	"sort"
)

// Offer is the structured terms of a negotiation proposal: the proposer offers
// cash and requests an asset in return. It is the agreed payload the economy
// settles. Brains and matchmaking marshal it into NegotiationState.ProposalJSON;
// the economy parses it back out.
type Offer struct {
	OfferCash     float64 `json:"offer_cash"`
	RequestAsset  string  `json:"request_asset"`
	RequestAmount float64 `json:"request_amount"`
}

// ParseOffer reads an Offer from a JSON payload, returning the zero Offer for
// empty or malformed input.
func ParseOffer(s string) Offer {
	var o Offer
	_ = json.Unmarshal([]byte(s), &o)
	return o
}

// JSON renders the offer as its wire payload.
func (o Offer) JSON() string {
	b, _ := json.Marshal(o)
	return string(b)
}

// randomOffer builds a modest random opening offer over the given assets.
func randomOffer(r *rand.Rand, assets []string) Offer {
	o := Offer{OfferCash: float64(r.Intn(91) + 10)} // 10..100 cash
	if len(assets) > 0 {
		o.RequestAsset = assets[r.Intn(len(assets))]
		o.RequestAmount = float64(r.Intn(5) + 1) // 1..5 units
	}
	return o
}

// assetNames returns the configured asset names in a stable (sorted) order so
// offer generation stays deterministic regardless of map iteration order.
func assetNames(cfg *Config) []string {
	names := make([]string, 0, len(cfg.StartingAssets))
	for k := range cfg.StartingAssets {
		names = append(names, k)
	}
	sort.Strings(names)
	return names
}
