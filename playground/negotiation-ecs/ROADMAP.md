# Roadmap — ECS Multi-Agent Negotiation Simulator

This document captures the architectural model and the phased plan to take the
project from "impressive scaffold" to "the thing the README describes."

## Where we are

The scaffold is complete and well-structured. The **outbound** data path
(sim → observers) fully works: ECS world, movement, the internal negotiation
state machine, gRPC frame fan-out, and the Rust visualizer all run. What's
missing is the **inbound** path and real simulation rules:

- External agents are non-functional — `SubmitProposal` enqueues into a queue
  that the game loop never drains (`DrainProposals()` is defined but unused).
- `offer_json` is never parsed; "trades" are a hardcoded flat cash move.
- `AgentRole.Strategy` (random/greedy/cooperative) is assigned but never read.
- `assigned_entity_id` is never set; `max_fps` is logged but not enforced.
- No tests; the visualizer is read-only (no control buttons).

## Architectural model — a game engine, not baked-in logic

The **world** owns an ordered system pipeline and *all* the rules. **Agents**
are controllers bound to entities at well-defined hooks — like an Unreal
`AIController` or a Unity `MonoBehaviour`. An agent answers "what do I want to
do?"; it never mutates the world directly. Economy, movement integration,
matchmaking, timeouts, and broadcasting are engine systems, not agent concerns.

### System pipeline (engine-owned, runs every tick)

1. **Intent collection** — gather decisions for this tick (see execution model)
2. **Steering** — sets velocity for default-controlled entities (wander)
3. **Physics integration** — velocity → position + boundary bounce, for *every*
   entity; never overridable
4. **Matchmaking / pairing** — proximity-based negotiation eligibility
5. **Negotiation referee** — advances the state machine using agent decisions
   as inputs; emits a `Deal` on acceptance
6. **Economy / settlement** — settles `Deal`s via the Economy resource
7. **Timeout** + **Broadcast**

### Agent extension points (the only things an agent implements)

One contract serves both internal and external agents:

- `Negotiate(ctx) -> Decision` — **required**. Offer / accept / counter /
  reject. This is the brain. `random` / `greedy` / `cooperative` become brain
  implementations, not engine branches.
- `Move(ctx) -> velocity intent` — **optional override**. Absent → the default
  steering system drives the entity.

Internal agent = in-process Go implementation. External agent = the same
contract relayed over gRPC via an SDK.

### Brain execution model — hybrid with a per-tick deadline

- **Internal brains** run in-process, synchronously, during intent collection.
  Deterministic and fast.
- **External brains** decide asynchronously over gRPC. Their decisions are
  accepted only if they arrive within a per-tick **deadline (frame budget)**;
  otherwise the entity holds / falls back to its default. This mirrors how a
  real game engine treats a frame budget and keeps seeded runs reproducible.

## Phases

### Phase 1 — Agent control plane (the core refactor)
- Define the brain contract (`Negotiate` required, `Move` optional).
- Collect decisions each tick: internal brains called directly; external
  decisions drained from the queue within the per-tick deadline. Bind
  `agent_id` → entity and set `assigned_entity_id` in the ack.
- **Turn the negotiation system into a referee**: it consults brains and
  applies protocol rules — rip out the hardcoded random rolls in
  `advanceNegotiations`. Accepted negotiations emit a `Deal` (no settlement
  yet — recorded as an event).

### Phase 2 — Economy as a world system + singleton resource
- Add an `Economy` / `Ledger` as an Ark resource (global singleton); a
  settlement system consumes `Deal`s.
- Settlement validates conservation (can't spend what you don't hold),
  transfers atomically, and appends to a transaction ledger.
- Fully engine-owned — agents never call it; they only *agree* to deals via
  negotiation logic.
- Surface balances / ledger via stats or a read RPC.

### Phase 3 — Movement: default system + optional override
- Split movement into **steering** (sets default velocity) and **physics
  integration** (always runs for all entities).
- A marker component lets steering skip entities whose agent supplies a `Move`
  hook; those entities take velocity from their brain. Integration is uniform.

### Phase 4 — Tests & determinism
- Per-system and Economy unit tests, including a **conservation invariant**
  (total cash/assets constant across ticks unless explicitly minted/burned).
- Seeded integration run asserting on outputs.

### Phase 5 — Visualizer interactivity & polish
- Control buttons wired to `ControlSimulation` (pause / step / reset).
- Honor `max_fps` (per-subscriber rate limiting in the broadcaster).
- Entity inspector and a ledger / balance view.

### Phase 6 — SDK completeness
- Java build file (Maven/Gradle) and committed stub-generation instructions.
- Example brains per language implementing `Negotiate` (and optional `Move`),
  not just `RandomAgent`.
