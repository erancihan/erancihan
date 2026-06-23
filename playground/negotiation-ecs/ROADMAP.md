# Roadmap — ECS Engine + Multi-Agent Negotiation Simulator

This project is structured like a game engine. The long-term intent is that the
**engine core is extractable** — a domain-agnostic, reusable foundation — and
the negotiation simulator is just the first *application* built on top of it.

## Two layers

### 1. Engine core (domain-agnostic, extractable)

Knows nothing about cash, gold, or negotiation. It is the reusable skeleton:

- **App / builder** — assemble the world, register plugins, configure the
  schedule, run the loop.
- **World** — ECS registry (wraps Ark): entities, components, resources.
- **Resources** — typed global singletons (Time, RNG, Config; and domain ones
  like Economy register here).
- **Schedule** — ordered stages run each tick:
  `Startup` (once) then `First → PreUpdate → Update → PostUpdate → Last`.
  Systems register into a stage; order within the schedule is deterministic.
- **Time / loop** — fixed-timestep driver with accumulator, tick counter, and
  delta; real-time and unbounded (headless) modes. Generalizes today's
  hand-rolled loop in `main.go`.
- **Events** — typed, double-buffered bus (write this tick, read next) so
  systems communicate without direct coupling.
- **Commands / Intents** — the *only* channel by which outside input enters the
  world. Controllers submit typed commands; systems drain and apply them in a
  deterministic order. No actor ever mutates the world directly.
- **Actor model** — `Actor = entity (body) + Controller (brain)`. Generic
  controller interface: `Decide(Observation, deadline) -> []Command`.
- **Observation / Snapshot + Observer fan-out** — a stage that produces a
  serializable world snapshot and broadcasts it to observers (visualizers,
  remote actors, loggers). `SimFrame` is one *schema*; the mechanism is generic.
- **Transport adapter** — turns a network connection into a remote Controller
  and Observer. gRPC is one implementation, living in an adapter package; the
  core stays transport-agnostic.
- **Plugin** — a unit that registers components, resources, systems, and events
  into the App. Movement, Economy, and Negotiation are each plugins.

### 2. Negotiation app (domain)

Domain components (Inventory, NegotiationState), the negotiation referee, the
Economy resource, the Proposal/Decision commands, and the negotiation brains —
all expressed as plugins that depend only on the engine core.

## The actor model

Bodies vs brains — the Unreal `Pawn`/`Controller` split, and the actor model:

- A **brain never mutates the world**. It receives an **Observation** (its
  inbound mailbox) and emits **Commands** (its outbound mailbox). Systems are
  **reducers** that validate and apply commands deterministically (command
  pattern / reducer / CQRS — one idea, three names).
- **Location transparency**: a brain is the same interface whether it is an
  in-process Go function or a separate process across the network.
- **Hybrid execution with a per-tick deadline**: internal brains run in-process
  synchronously during intent collection; remote brains decide asynchronously
  and are accepted only if they answer within the tick's deadline (frame
  budget), else the actor holds / falls back to its default. This keeps seeded
  runs reproducible and is exactly how a game engine treats a frame budget.

This actor layer is the piece intended for reuse in other projects later.

## Agent extension points

One contract serves internal and external agents. An agent implements only:

- `Negotiate(ctx) -> Decision` — **required**. Offer / accept / counter /
  reject. `random` / `greedy` / `cooperative` are brain implementations, not
  engine branches.
- `Move(ctx) -> velocity intent` — **optional override**. Absent → the default
  steering system drives the entity.

Everything else — matchmaking, physics integration, settlement, timeouts,
broadcasting — is engine/domain systems, never an agent concern.

## Boundary discipline (so extraction is `git mv`, not a rewrite)

- `engine/...` imports nothing domain-specific; the domain depends on the engine
  only.
- Enforce with an **architecture test** that walks imports and fails if any
  `engine/` package imports the app. Keep a single Go module for now; extracting
  later becomes a `git mv` + a new `go.mod`.
- Keep proto / gRPC in an adapter package, out of the core.

## Per-tick system pipeline (how the negotiation app slots into the schedule)

1. **PreUpdate — intent collection**: call internal brains; drain remote
   commands within the deadline. Bind `agent_id` → entity; set
   `assigned_entity_id`.
2. **Update — steering**: set velocity for default-controlled entities (wander).
3. **Update — physics integration**: velocity → position + boundary bounce, for
   every entity; never overridable.
4. **Update — matchmaking**: proximity-based negotiation eligibility.
5. **Update — negotiation referee**: advance the state machine from agent
   decisions; emit a `Deal` on acceptance.
6. **PostUpdate — economy / settlement**: settle `Deal`s via the Economy
   resource (validate conservation, transfer atomically, append to ledger).
7. **PostUpdate — timeout**, then **Last — snapshot + broadcast**.

## Phases

### Phase 1 — Engine core skeleton, validated by porting known-good
Stand up `engine/`: App builder, World, Schedule (stages), Resources, Event bus,
Time/fixed-timestep loop, Plugin, Command buffer, Controller/Actor abstraction,
Snapshot + Observer stage. Prove the abstractions by **re-homing the already
working pieces** — the loop, movement, broadcast, and control RPC — onto the
engine with unchanged behavior. Add the import-boundary architecture test.

### Phase 2 — Actor control plane + negotiation referee
Implement the actor model end to end: Observations out, Commands in, deadline
enforced; internal in-process and external gRPC controllers behind one
interface. Turn the negotiation system into a **referee** that consults brains
and applies protocol rules — remove the hardcoded random rolls in
`advanceNegotiations`. Finally drain the proposal queue. Accepted negotiations
emit a `Deal` (recorded as an event; settlement comes next).

### Phase 3 — Economy plugin (world system + singleton resource)
`Economy` / `Ledger` as a resource; a settlement system consumes `Deal`s,
validates conservation (can't spend what you don't hold), transfers atomically,
and appends to a transaction ledger. Fully engine-owned — agents only *agree* to
deals via negotiation logic. Surface balances / ledger via stats or a read RPC.

### Phase 4 — Movement plugin: steering + optional override
Enrich the ported movement plugin: split **steering** (default velocity) from
**physics integration** (always runs). A marker component lets steering skip
entities whose agent supplies a `Move` hook; those take velocity from their
brain. Integration stays uniform.

### Phase 5 — Tests & determinism
Engine-core tests (schedule order, fixed timestep, command buffer, deadline
handling) separate from domain tests. Domain **conservation invariant** (total
cash/assets constant unless explicitly minted/burned). Seeded integration run
asserting on outputs.

### Phase 6 — Visualizer interactivity & polish
Control buttons wired to `ControlSimulation` (pause / step / reset). Honor
`max_fps` (per-subscriber rate limiting). Entity inspector and ledger view.

### Phase 7 — SDK completeness + extraction validation (future / stretch)
Java build file and richer example brains per language. Then prove the core is
truly extractable: split `engine/` into its own Go module and stand up a tiny
second demo domain (e.g. boids/flocking or predator-prey) that reuses the engine
with zero negotiation code — the real test of the reusable design.
