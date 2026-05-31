# ECS Multi-Agent Negotiation Simulator

A headless **Go ECS simulation engine** connected to a real-time **Rust `egui` native visualizer** via gRPC streaming. Designed for massive parallel multi-agent negotiation simulations with cross-language agent development support.

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│                    GO BACKEND (Headless)                   │
│  ┌──────────────────┐  Protobuf   ┌─────────────────────┐  │
│  │   Ark (mlange-42)│  ───────►   │ gRPC Stream Server  │  │
│  │   ECS Engine     │             │ :50051              │  │
│  └──────────────────┘             └─────────────────────┘  │
│  Systems: Movement, Negotiation,   Services: Stream,       │
│           Timeout, Broadcast       SubmitProposal, Control │
└──────────────────────────────────────────┬─────────────────┘
                                           │
                    Protobuf / HTTP/2      │ (SimFrame stream)
                                           ▼
┌────────────────────────────────────────────────────────────┐
│                    RUST VISUALIZER (UI)                    │
│  ┌──────────────────┐  Channel    ┌─────────────────────┐  │
│  │ Tokio gRPC       │  ───────►   │   egui / eframe     │  │
│  │ Background Task  │  SimFrame   │   Immediate Mode    │  │
│  └──────────────────┘             └─────────────────────┘  │
│  Panels: 2D Agent Canvas │ Negotiation Logs │ World Stats  │
└────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- **Go** 1.22+
- **Rust** (via [rustup](https://rustup.rs/))
- **Protocol Buffers** compiler (`protoc`)
- Go protobuf plugins: `protoc-gen-go`, `protoc-gen-go-grpc`

### Build & Run

```bash
# 1. Generate protobuf code
make proto

# 2. Build both backend and visualizer
make backend
make visualizer

# 3. Run the backend server (in one terminal)
make run-backend

# 4. Run the visualizer (in another terminal)
make run-visualizer
```

### Headless Benchmark Mode

```bash
# Run 100 agents for 10,000 ticks without any network overhead
make run-headless
```

## Project Structure

```
negotiation-ecs/
├── proto/
│   └── simulation.proto       # Shared protobuf contract
├── backend-go/
│   ├── cmd/server/main.go     # Server entry point
│   ├── internal/ecs/          # Ark ECS components & systems
│   └── internal/network/      # gRPC server & broadcaster
├── visualizer-rust/
│   ├── src/main.rs            # eframe/egui entry point
│   ├── src/network.rs         # Async gRPC receiver
│   ├── src/state.rs           # Shared simulation state
│   └── src/ui/                # Canvas, logs, stats panels
├── SDKs/
│   ├── python/                # Python agent SDK
│   ├── go/                    # Go agent SDK
│   └── java/                  # Java agent SDK
└── Makefile                   # Build orchestration
```

## Server CLI Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--headless` | `false` | Disable gRPC (benchmark mode) |
| `--port` | `50051` | gRPC server port |
| `--agents` | `50` | Number of agent entities |
| `--tick-rate` | `20` | Simulation tick rate (Hz) |
| `--seed` | `0` | RNG seed (0 = random) |
| `--max-ticks` | `0` | Stop after N ticks (0 = unlimited) |
| `--world-width` | `1000` | World width |
| `--world-height` | `1000` | World height |

## Visualizer

The Rust visualizer features:

- **2D Agent Canvas**: Color-coded agents with negotiation pairing lines
- **Negotiation Log**: Scrollable event table with filtering
- **Live Statistics**: Entity count, active negotiations, FPS, and history chart
- **Agent Tooltips**: Hover to see inventory, status, and position

```bash
# Connect to a specific server
cargo run --release -- --server 192.168.1.100:50051
```

## Agents

The simulator supports two categories of agents:

| Type | Where it runs | Controlled by | Language |
|------|--------------|---------------|----------|
| **Internal** | Inside the Go backend | ECS `NegotiationSystem` | Go (built-in) |
| **External** | Separate process | Your code via gRPC SDK | Python, Go, Java, or any gRPC language |

Internal agents are spawned by the engine and make decisions via the built-in state machine (random/greedy/cooperative strategies). External agents connect over the network, observe the world via frame streaming, and submit proposals through the `SubmitProposal` RPC.

### Agent Lifecycle

```
  ┌──────────────────────────────────────────────────────────┐
  │                    YOUR AGENT PROCESS                    │
  │                                                          │
  │  1. Connect to backend via gRPC (localhost:50051)        │
  │  2. Call StreamSimulation() to receive SimFrame stream   │
  │  3. For each frame:                                      │
  │     a. on_frame(frame) — observe world state             │
  │     b. decide(frame)  — return a Proposal or None        │
  │  4. If decide() returns a Proposal:                      │
  │     → Call SubmitProposal(proposal)                      │
  │     → Receive ProposalAck (accepted/rejected + reason)   │
  │  5. Repeat until stream ends or agent stops              │
  └──────────────────────────────────────────────────────────┘
```

### The SimFrame — What Your Agent Sees

Every tick, the backend streams a `SimFrame` to all connected agents. It contains:

| Field | Type | Description |
|-------|------|-------------|
| `tick` | `uint64` | Monotonically increasing tick counter |
| `timestamp` | `double` | Logical simulation time (seconds) |
| `entities` | `EntityState[]` | Full state of every entity (position, inventory, negotiation status) |
| `events` | `NegotiationEvent[]` | What happened this tick (offers made, accepted, rejected, timeouts) |
| `stats` | `TickStats` | Summary: total entities, active/completed/timed-out negotiations |

Each `EntityState` includes:

| Field | Description |
|-------|-------------| 
| `entity_id` | Unique ID within the simulation |
| `label` | Human-readable name (e.g. `"Agent-042"`) |
| `position` | `{x, y}` in world coordinates |
| `velocity` | `{x, y}` movement vector |
| `inventory` | `{cash, assets: {name: amount}}` |
| `negotiation_status` | One of: `IDLE`, `OFFERING`, `COUNTERING`, `ACCEPTED`, `REJECTED`, `TIMEOUT` |
| `counter_party_id` | Entity ID of current negotiation partner (0 if idle) |

### The Proposal — How Your Agent Acts

To participate in a negotiation, submit a `Proposal` via `SubmitProposal()`:

```protobuf
message Proposal {
  string agent_id = 1;         // Your unique agent identifier
  uint64 target_entity_id = 2; // Entity to negotiate with (0 = engine assigns)
  string offer_json = 3;       // JSON-encoded offer payload
}
```

The `offer_json` is flexible — structure it however your negotiation strategy requires. Example:

```json
{
  "offer_cash": 100,
  "request_asset": "gold",
  "request_amount": 5
}
```

The engine responds with a `ProposalAck`:

```protobuf
message ProposalAck {
  bool accepted = 1;             // Whether the proposal was enqueued
  string reason = 2;             // "proposal enqueued for next tick" or error
  uint64 assigned_entity_id = 3; // Entity assigned if target_entity_id was 0
}
```

> **Note**: `accepted: true` means the proposal was **enqueued**, not that the negotiation was accepted. The actual negotiation outcome (accept/reject/timeout) plays out over subsequent ticks and appears in the `SimFrame.events` stream.

---

### Creating a Custom Agent

#### Python

1. **Generate protobuf stubs** (one-time setup):
   ```bash
   cd SDKs/python
   pip install -r requirements.txt
   # From the project root:
   make sdk-python
   ```

2. **Subclass `NegotiationAgent`** and implement two methods:

   ```python
   from agent_client import NegotiationAgent

   class GreedyAgent(NegotiationAgent):
       """Agent that targets the richest entity with lowball offers."""

       def on_frame(self, frame):
           # Track world state, build internal models, etc.
           if frame.tick % 100 == 0:
               print(f"[{self.agent_id}] Tick {frame.tick}")

       def decide(self, frame):
           # Find the entity with the most cash
           if not frame.entities:
               return None

           richest = max(frame.entities, key=lambda e: e.inventory.cash)

           # Only target idle entities
           if richest.negotiation_status != 0:  # 0 = IDLE
               return None

           offer = {
               "offer_cash": 10,            # lowball offer
               "request_asset": "gold",
               "request_amount": 5,
           }
           return (richest.entity_id, offer)
   ```
 
3. **Run it**:
   ```bash
   # In agent_client.py or a new file:
   agent = GreedyAgent(agent_id="greedy-001", server_addr="localhost:50051")
   agent.run()
   ```

   Or from the CLI:
   ```bash
   python agent_client.py --server localhost:50051 --agent-id my-agent
   ```

#### Go

1. **Implement the `Agent` interface** with two methods:

   ```go
   import pb "github.com/erancihan/negotiation-ecs/backend-go/gen/proto/negotiationpb"

   type Agent interface {
       OnFrame(frame *pb.SimFrame)
       Decide(frame *pb.SimFrame) *pb.Proposal
   }
   ```

2. **Create your agent**:

   ```go
   type CooperativeAgent struct {
       AgentID string
   }

   func (a *CooperativeAgent) OnFrame(frame *pb.SimFrame) {
       // Observe and track state
   }

   func (a *CooperativeAgent) Decide(frame *pb.SimFrame) *pb.Proposal {
       // Find an idle entity and make a fair offer
       for _, e := range frame.GetEntities() {
           if e.GetNegotiationStatus() == pb.NegotiationStatus_NEGOTIATION_STATUS_IDLE {
               offer := `{"offer_cash": 50, "request_asset": "silver", "request_amount": 10}`
               return &pb.Proposal{
                   AgentId:        a.AgentID,
                   TargetEntityId: e.GetEntityId(),
                   OfferJson:      offer,
               }
           }
       }
       return nil
   }
   ```

3. **Run it** (see `SDKs/go/agent_client.go` for the full gRPC connection boilerplate):
   ```bash
   cd SDKs/go
   go run agent_client.go --server localhost:50051 --agent-id coop-001
   ```

#### Java

1. **Implement `NegotiationAgent`**:

   ```java
   public class SmartAgent implements AgentClient.NegotiationAgent {
       private final String agentId;

       public SmartAgent(String agentId) {
           this.agentId = agentId;
       }

       @Override
       public void onFrame(SimFrame frame) {
           // Process simulation state
       }

       @Override
       public Proposal decide(SimFrame frame) {
           // Return a Proposal, or null to skip this tick
           return null;
       }
   }
   ```

2. **Generate stubs and run**:
   ```bash
   cd SDKs/java
   make sdk-java  # Generate protobuf stubs
   # Compile and run (with gRPC dependencies on classpath)
   ```

---

### Running Multiple Agents

You can connect any number of external agents simultaneously. Each gets its own independent frame stream.

```bash
# Terminal 1: Start the simulation backend
make run-backend

# Terminal 2: Start the visualizer
make run-visualizer

# Terminal 3: Connect a Python agent
cd SDKs/python && python agent_client.py --agent-id py-001

# Terminal 4: Connect another Python agent with different strategy
cd SDKs/python && python agent_client.py --agent-id py-002

# Terminal 5: Connect a Go agent
cd SDKs/go && go run agent_client.go --agent-id go-001
```

### gRPC API Reference

The backend exposes a single gRPC service on port `50051` (configurable via `--port`):

| RPC | Type | Description |
|-----|------|-------------|
| `StreamSimulation(StreamRequest)` | Server-streaming | Receive `SimFrame` every tick |
| `SubmitProposal(Proposal)` | Unary | Submit a negotiation proposal |
| `GetWorldState(WorldStateRequest)` | Unary | Snapshot of current world state |
| `ControlSimulation(SimControlRequest)` | Unary | Pause, resume, step, or reset the simulation |

**SimControlRequest commands**:

| Command | Effect |
|---------|--------|
| `SIM_COMMAND_PAUSE` | Freeze the simulation (no ticks processed) |
| `SIM_COMMAND_RESUME` | Resume from pause |
| `SIM_COMMAND_STEP` | Advance exactly one tick (while paused) |
| `SIM_COMMAND_RESET` | Reset world to initial state |

### Building Agents in Other Languages

Any language with a gRPC client library can connect. Generate stubs from `proto/simulation.proto`:

```bash
# Generic protoc command for any language
protoc -I proto \
  --<lang>_out=./output \
  --grpc-<lang>_out=./output \
  proto/simulation.proto
```

The agent pattern is always the same:
1. Create a gRPC channel to the server
2. Call `StreamSimulation()` to get a frame iterator
3. For each frame, decide whether to call `SubmitProposal()`

## ECS Components

| Component | Fields | Purpose |
|-----------|--------|---------|
| `Position` | `X, Y` | 2D world coordinates |
| `Velocity` | `DX, DY` | Movement vector (units/sec) |
| `Inventory` | `Cash, Assets` | Financial holdings |
| `NegotiationState` | `Status, CounterPartyID, ...` | Negotiation state machine |
| `AgentRole` | `Name, Type, Strategy` | Agent identity & behavior |

## Negotiation State Machine

```
       ┌──────────┐
       │   IDLE   │◄──────────────────────┐
       └────┬─────┘                       │
            │ paired                      │ reset
            ▼                             │
       ┌──────────┐     ┌──────────┐      │
       │ OFFERING │◄───►│COUNTERING│──────┤
       └────┬─────┘     └────┬─────┘      │
            │                │            │
            ▼                ▼            │
       ┌──────────┐   ┌──────────┐   ┌────┴─────┐
       │ ACCEPTED │   │ REJECTED │   │ TIMEOUT  │
       └──────────┘   └──────────┘   └──────────┘
```

## License

MIT
