"""
Multi-Agent Negotiation Simulator — Python Agent SDK

An external agent controls one body. Its first proposal claims a body (the engine
returns the assigned entity id in the ack); subsequent proposals are decisions for
that body when it is the agent's turn to respond. A decision is expressed by the
offer payload's "action" field — "accept", "reject", or (default) a counter-offer.

Setup (one-time): generate the gRPC stubs from the project root:
    make sdk-python
    # or: cd SDKs/python && python -m grpc_tools.protoc \
    #       -I../../proto --python_out=. --grpc_python_out=. ../../proto/simulation.proto

Usage:
    python agent_client.py [--server localhost:50051] [--agent-id py-coop-001]
"""

import argparse
import json
from abc import ABC, abstractmethod

import grpc

import simulation_pb2
import simulation_pb2_grpc


class NegotiationAgent(ABC):
    """Base class for external negotiation agents.

    Subclass and implement ``on_frame`` and ``decide``. The agent loop streams
    frames, submits the decisions ``decide`` returns, and routes acks back via
    ``on_proposal_result`` (where the assigned body id arrives on first contact).
    """

    def __init__(self, agent_id: str, server_addr: str = "localhost:50051"):
        self.agent_id = agent_id
        self.server_addr = server_addr
        self.assigned_entity_id = 0
        self._channel = None
        self._stub = None

    def run(self):
        self._channel = grpc.insecure_channel(self.server_addr)
        self._stub = simulation_pb2_grpc.SimulationServiceStub(self._channel)
        print(f"[{self.agent_id}] connected to {self.server_addr}")
        try:
            stream = self._stub.StreamSimulation(simulation_pb2.StreamRequest(max_fps=10))
            for frame in stream:
                self.on_frame(frame)
                offer = self.decide(frame)
                if offer is not None:
                    ack = self._stub.SubmitProposal(simulation_pb2.Proposal(
                        agent_id=self.agent_id,
                        offer_json=json.dumps(offer),
                    ))
                    self.on_proposal_result(ack)
        except grpc.RpcError as e:
            print(f"[{self.agent_id}] stream error: {e}")
        except KeyboardInterrupt:
            print(f"\n[{self.agent_id}] interrupted")
        finally:
            if self._channel:
                self._channel.close()

    def on_proposal_result(self, ack):
        if self.assigned_entity_id == 0 and ack.accepted:
            self.assigned_entity_id = ack.assigned_entity_id
            print(f"[{self.agent_id}] assigned body {self.assigned_entity_id}")

    @abstractmethod
    def on_frame(self, frame):
        """Observe the world each tick."""

    @abstractmethod
    def decide(self, frame):
        """Return an offer dict to submit, or None to do nothing this frame."""


class CooperativeTrader(NegotiationAgent):
    """Claims a body, then accepts whenever it is its turn to respond."""

    def __init__(self, agent_id: str, server_addr: str = "localhost:50051"):
        super().__init__(agent_id, server_addr)
        self._claimed = False

    def on_frame(self, frame):
        if frame.tick % 100 == 0:
            print(f"[{self.agent_id}] tick {frame.tick} | body={self.assigned_entity_id} "
                  f"| entities={len(frame.entities)}")

    def decide(self, frame):
        # Claim a body on first contact.
        if not self._claimed:
            self._claimed = True
            return {"action": "counter", "hello": True}
        if self.assigned_entity_id == 0:
            return None  # waiting for the assignment ack
        # If our body is responding (COUNTERING), accept the standing offer.
        for e in frame.entities:
            if (e.entity_id == self.assigned_entity_id
                    and e.negotiation_status == simulation_pb2.NEGOTIATION_STATUS_COUNTERING):
                return {"action": "accept"}
        return None


def main():
    parser = argparse.ArgumentParser(description="Negotiation Agent SDK - Python")
    parser.add_argument("--server", default="localhost:50051", help="gRPC server address")
    parser.add_argument("--agent-id", default="py-coop-001", help="agent identifier")
    args = parser.parse_args()

    CooperativeTrader(agent_id=args.agent_id, server_addr=args.server).run()


if __name__ == "__main__":
    main()
