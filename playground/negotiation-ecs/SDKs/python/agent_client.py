"""
Multi-Agent Negotiation Simulator — Python Agent SDK

Provides a base class for building external agents that connect to the
simulation engine via gRPC and participate in negotiations.

Usage:
    python agent_client.py [--server localhost:50051] [--agent-id my-agent]
"""

import argparse
import json
import sys
import time
import threading
from abc import ABC, abstractmethod

import grpc

# Import generated protobuf stubs
# Run: python -m grpc_tools.protoc -I../../proto --python_out=. --grpc_python_out=. ../../proto/simulation.proto
import simulation_pb2
import simulation_pb2_grpc


class NegotiationAgent(ABC):
    """Base class for external negotiation agents.

    Subclass this and implement `on_frame()` and `decide()` to create
    a custom agent that participates in the simulation.
    """

    def __init__(self, agent_id: str, server_addr: str = "localhost:50051"):
        self.agent_id = agent_id
        self.server_addr = server_addr
        self.channel = None
        self.stub = None
        self._running = False
        self._frame_count = 0

    def connect(self):
        """Establish gRPC connection to the simulation server."""
        self.channel = grpc.insecure_channel(self.server_addr)
        self.stub = simulation_pb2_grpc.SimulationServiceStub(self.channel)
        print(f"[{self.agent_id}] Connected to {self.server_addr}")

    def disconnect(self):
        """Close the gRPC connection."""
        if self.channel:
            self.channel.close()
            print(f"[{self.agent_id}] Disconnected")

    def submit_proposal(self, target_entity_id: int, offer: dict) -> simulation_pb2.ProposalAck:
        """Submit a negotiation proposal to the simulation.

        Args:
            target_entity_id: Entity to negotiate with (0 = let engine assign).
            offer: Dict with offer details (will be JSON-encoded).

        Returns:
            ProposalAck with acceptance status and reason.
        """
        proposal = simulation_pb2.Proposal(
            agent_id=self.agent_id,
            target_entity_id=target_entity_id,
            offer_json=json.dumps(offer),
        )
        return self.stub.SubmitProposal(proposal)

    def get_world_state(self) -> simulation_pb2.WorldState:
        """Get a snapshot of the current simulation state."""
        return self.stub.GetWorldState(simulation_pb2.WorldStateRequest())

    def run(self):
        """Start the agent loop: stream frames and make decisions."""
        self.connect()
        self._running = True

        try:
            print(f"[{self.agent_id}] Starting frame stream...")
            request = simulation_pb2.StreamRequest(max_fps=10)
            stream = self.stub.StreamSimulation(request)

            for frame in stream:
                if not self._running:
                    break

                self._frame_count += 1
                self.on_frame(frame)

                # Let the agent decide whether to submit proposals
                decision = self.decide(frame)
                if decision is not None:
                    target_id, offer = decision
                    try:
                        ack = self.submit_proposal(target_id, offer)
                        self.on_proposal_result(ack)
                    except grpc.RpcError as e:
                        print(f"[{self.agent_id}] Proposal error: {e}")

        except grpc.RpcError as e:
            print(f"[{self.agent_id}] Stream error: {e}")
        except KeyboardInterrupt:
            print(f"\n[{self.agent_id}] Interrupted")
        finally:
            self._running = False
            self.disconnect()

    def stop(self):
        """Signal the agent to stop."""
        self._running = False

    @abstractmethod
    def on_frame(self, frame: simulation_pb2.SimFrame):
        """Called for each simulation frame received.

        Override this to process world state updates.
        """
        pass

    @abstractmethod
    def decide(self, frame: simulation_pb2.SimFrame):
        """Called after each frame to decide whether to submit a proposal.

        Returns:
            None if no action, or (target_entity_id, offer_dict) to submit.
        """
        pass

    def on_proposal_result(self, ack: simulation_pb2.ProposalAck):
        """Called when a proposal submission receives a response."""
        status = "accepted" if ack.accepted else "rejected"
        print(f"[{self.agent_id}] Proposal {status}: {ack.reason}")


# =============================================================================
# Example Agent: RandomAgent
# =============================================================================

class RandomAgent(NegotiationAgent):
    """Example agent that makes random offers every N frames."""

    def __init__(self, agent_id: str, server_addr: str = "localhost:50051"):
        super().__init__(agent_id, server_addr)
        self.offer_interval = 50  # Make an offer every 50 frames
        import random
        self._rng = random

    def on_frame(self, frame):
        if frame.tick % 100 == 0:
            print(
                f"[{self.agent_id}] Tick {frame.tick} | "
                f"Entities: {len(frame.entities)} | "
                f"Events: {len(frame.events)}"
            )

    def decide(self, frame):
        if self._frame_count % self.offer_interval != 0:
            return None

        if not frame.entities:
            return None

        # Pick a random entity to negotiate with
        target = self._rng.choice(frame.entities)
        offer = {
            "offer_cash": self._rng.randint(10, 100),
            "request_asset": self._rng.choice(["gold", "silver", "oil"]),
            "request_amount": self._rng.randint(1, 10),
        }
        print(f"[{self.agent_id}] Submitting offer to entity {target.entity_id}: {offer}")
        return (target.entity_id, offer)


# =============================================================================
# CLI Entry Point
# =============================================================================

def main():
    parser = argparse.ArgumentParser(description="Negotiation Agent SDK - Python")
    parser.add_argument("--server", default="localhost:50051", help="gRPC server address")
    parser.add_argument("--agent-id", default="python-random-001", help="Agent identifier")
    args = parser.parse_args()

    agent = RandomAgent(agent_id=args.agent_id, server_addr=args.server)
    agent.run()


if __name__ == "__main__":
    main()
