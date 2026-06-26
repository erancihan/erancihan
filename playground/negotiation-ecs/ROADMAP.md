# Roadmap — ECS Engine + Multi-Agent Negotiation Simulator

This project is structured like a game engine, **built from scratch**. There is
no third-party ECS — we own the entire stack so it can be understood, learned
from, and extracted. The long-term intent is that the **engine core is
reusable** (a domain-agnostic foundation), and the negotiation simulator is just
the first *application* built on top of it.

> Note: the original scaffold leaned on the `mlange-42/ark` ECS library. As of
> Phase 2 that dependency is removed — building our own ECS is the point, not a
> detour.

## Status

- ✅ **Phase 1 — Hand-rolled sparse-set ECS** (done)
- ✅ **Phase 2 — Engine services + port off Ark** (done)
- ✅ **Phase 3 — Actor control plane + negotiation referee** (done)
- ✅ **Phase 4 — Economy plugin** (done)
- ⏳ **Phase 5 — Movement: steering + optional override** (next)
- ⬜ Phases 6–8 — pending

## Two layers

### 1. Engine core (domain-agnostic, extractable, zero third-party ECS)

Knows nothing about cash, gold, or negotiation. It is the reusable skeleton:

- **ECS storage (sparse-set)** — the foundation. Built by hand:
  - **Entity** = `{index, generation}` so recycled IDs can't alias stale
    references (a dangling handle fails a generation check instead of pointing
    at the wrong entity).
  - **Component store** per type = a sparse set: a dense packed array of values
    plus a sparse index mapping entity → dense slot. O(1) add / remove / has,
    cache-friendly dense iteration.
  - **Queries** = intersect the relevant sparse sets, iterate the smallest one
    densely. (Archetype storage stays a possible future optimization; sparse-set
    is the starting point with a clean upgrade path.)
  - Go has no generic *methods*, only generic *functions* — so component access
    is package-level generics (`Get[T]`, `Add[T]`, `Query2[A,B]`). This is the
    same constraint that shaped Ark's API; we make our own call on it.
- **World** — owns entity allocation, the component stores, and resources.
- **Resources** — typed global singletons (Time, RNG, Config; domain ones like
  Economy register here). Also hand-rolled.
- **Schedule** — ordered stages run each tick:
  `Startup` (once) then `First → PreUpdate → Update → PostUpdate → Last`.
  Systems register into a stage; order within the schedule is deterministic.
- **Time / loop** — fixed-timestep driver with accumulator, tick counter, and
  delta; real-time and unbounded (headless) modes. Generalizes today's
  hand-rolled loop in `main.go`.
- **Events** — typed per-tick bus so systems communicate without direct
  coupling. (Implemented with same-tick semantics: events emitted in a tick are
  readable by any later stage that tick and cleared at the next `StageFirst` —
  chosen over write-this/read-next so the `StageLast` snapshot can broadcast
  events the referee emits in `StageUpdate` of the same tick.)
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
- **App / builder** — assemble the world, register plugins, configure the
  schedule, run the loop.

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

- `engine/...` imports nothing domain-specific **and no third-party ECS**; the
  domain depends on the engine only.
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

### Phase 1 — Hand-rolled sparse-set ECS ✅ done
Built the foundation in `engine/ecs`: `Entity{index, generation}` with a
free-list allocator and exact liveness; generic sparse-set component stores
(`Add[T]` / `Remove[T]` / `Get[T]` / `Has[T]`); multi-component queries via set
intersection (`Query1`–`Query3`); a typed resource registry. Unit-tested in
isolation. (`Query4/5` deferred until a consumer needs them.)

### Phase 2 — Engine services, validated by porting known-good ✅ done
On top of the ECS: App builder, Schedule (stages), per-tick event bus,
Time/fixed-timestep loop, Plugin, thread-safe command buffer, Controller/Actor
abstraction with deadline dispatch, generic Broadcaster + Snapshot system, and
pause/resume/step/reset control. Re-homed the loop, movement, timeout,
negotiation, broadcast, and control onto the engine as the `internal/sim` plugin
and `internal/transport` gRPC adapter; deleted the Ark-based packages and dropped
`mlange-42/ark` from `go.mod`. Added the import-boundary architecture test.

### Phase 3 — Actor control plane + negotiation referee ✅ done
The actor model end to end. The negotiation system is now a **referee** that
collects the deciding agents, asks their brains via `DispatchActors` (concurrent,
deadline-bounded), and applies accept/reject/counter — the hardcoded random rolls
are gone. Internal strategies (random/greedy/cooperative) and external agents are
both `Brain`s in one registry behind the referee (location transparency).
External agents are remote brains for assigned bodies: `SubmitProposal` binds an
agent to a body, returns `assigned_entity_id`, and records a proposal the
`externalBrain` delivers as its decision (or holds if none arrived in time).
Acceptance emits a `Deal` (no cash moves yet — settlement is Phase 4). Covered by
unit, integration, and gRPC round-trip (bufconn) tests, all green under `-race`.

### Phase 4 — Economy plugin (world system + singleton resource) ✅ done
The `internal/economy` package: an `Economy`/ledger resource and a
`SettlementSystem` (StagePostUpdate) that consumes the `Deal` events the referee
emits, applying each atomically (From pays cash, To hands over the asset),
validating conservation and refusing overdrafts/insufficient assets. Offers now
carry structured terms (`offer_cash` + `request_asset`/`amount`) that brains
haggle over. The package depends on `sim` but `sim` does not depend on it — the
App composes both plugins, so the decoupling is a real package boundary, no
cycle. Tested for per-tick cash/asset conservation, valid swaps, and rejection
of illegal deals. (Surfacing balances via a dedicated read RPC is deferred —
balances already ride in entity inventories on every frame.)

### Phase 5 — Movement plugin: steering + optional override
Enrich the ported movement plugin: split **steering** (default velocity) from
**physics integration** (always runs). A marker component lets steering skip
entities whose agent supplies a `Move` hook; those take velocity from their
brain. Integration stays uniform.

### Phase 6 — Tests & determinism
ECS-core tests (entity recycling/generations, store correctness, query
intersection) and engine tests (schedule order, fixed timestep, command buffer,
deadline handling), separate from domain tests. Domain **conservation
invariant** (total cash/assets constant unless explicitly minted/burned). Seeded
integration run asserting on outputs.

### Phase 7 — Visualizer interactivity & polish
Control buttons wired to `ControlSimulation` (pause / step / reset). Honor
`max_fps` (per-subscriber rate limiting). Entity inspector and ledger view.

### Phase 8 — SDK completeness + extraction validation (future / stretch)
Java build file and richer example brains per language. Then prove the core is
truly extractable: split `engine/` into its own Go module and stand up a tiny
second demo domain (e.g. boids/flocking or predator-prey) that reuses the engine
with zero negotiation code — the real test of the reusable design.
