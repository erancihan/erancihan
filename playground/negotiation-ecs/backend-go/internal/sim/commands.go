package sim

// ProposalCommand is an external agent's proposal, submitted through the engine
// command buffer by the transport layer. Phase 2 only enqueues these (preserving
// the original "accepted but not yet applied" behaviour); the Phase 3 referee
// drains and acts on them.
type ProposalCommand struct {
	AgentID   string
	TargetID  uint64 // target entity index; 0 = let the engine assign
	OfferJSON string
}
