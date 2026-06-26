package com.erancihan.negotiation.agent;

import com.erancihan.negotiation.proto.SimulationProto.EntityState;
import com.erancihan.negotiation.proto.SimulationProto.NegotiationStatus;
import com.erancihan.negotiation.proto.SimulationProto.Proposal;
import com.erancihan.negotiation.proto.SimulationProto.ProposalAck;
import com.erancihan.negotiation.proto.SimulationProto.SimFrame;
import com.erancihan.negotiation.proto.SimulationProto.StreamRequest;
import com.erancihan.negotiation.proto.SimulationServiceGrpc;
import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;

import java.util.Iterator;
import java.util.concurrent.TimeUnit;

/**
 * Java SDK for the Multi-Agent Negotiation Simulator.
 *
 * <p>An external agent controls one body. Its first proposal claims a body (the
 * engine returns the assigned entity id in the ack); subsequent proposals are
 * decisions for that body when it is the agent's turn to respond. A decision is
 * expressed by the offer payload's {@code "action"} field — {@code "accept"},
 * {@code "reject"}, or (default) a counter-offer.</p>
 *
 * <h3>Build &amp; run</h3>
 * <pre>
 *   cd SDKs/java
 *   mvn -q compile exec:java -Dexec.mainClass=com.erancihan.negotiation.agent.AgentClient \
 *       -Dexec.args="--server localhost:50051 --agent-id java-coop-001"
 * </pre>
 */
public class AgentClient {

    /** Base interface for negotiation agents. */
    public interface NegotiationAgent {
        void onFrame(SimFrame frame);

        /** Returns a Proposal to submit, or null to do nothing this frame. */
        Proposal decide(SimFrame frame);

        void onProposalResult(ProposalAck ack);
    }

    /** Claims a body, then accepts whenever it is its turn to respond. */
    public static class CooperativeTrader implements NegotiationAgent {
        private final String agentId;
        private long assignedEntityId = 0;
        private boolean claimed = false;

        public CooperativeTrader(String agentId) {
            this.agentId = agentId;
        }

        @Override
        public void onFrame(SimFrame frame) {
            if (frame.getTick() % 100 == 0) {
                System.out.printf("[%s] tick %d | body=%d | entities=%d%n",
                        agentId, frame.getTick(), assignedEntityId, frame.getEntitiesCount());
            }
        }

        @Override
        public Proposal decide(SimFrame frame) {
            if (!claimed) {
                claimed = true;
                return proposal("{\"action\":\"counter\",\"hello\":true}");
            }
            if (assignedEntityId == 0) {
                return null; // waiting for the assignment ack
            }
            for (EntityState e : frame.getEntitiesList()) {
                if (e.getEntityId() == assignedEntityId
                        && e.getNegotiationStatus() == NegotiationStatus.NEGOTIATION_STATUS_COUNTERING) {
                    return proposal("{\"action\":\"accept\"}");
                }
            }
            return null;
        }

        @Override
        public void onProposalResult(ProposalAck ack) {
            if (assignedEntityId == 0 && ack.getAccepted()) {
                assignedEntityId = ack.getAssignedEntityId();
                System.out.printf("[%s] assigned body %d%n", agentId, assignedEntityId);
            }
        }

        private Proposal proposal(String offerJson) {
            return Proposal.newBuilder().setAgentId(agentId).setOfferJson(offerJson).build();
        }
    }

    private final ManagedChannel channel;
    private final SimulationServiceGrpc.SimulationServiceBlockingStub stub;
    private final NegotiationAgent agent;

    public AgentClient(String serverAddr, NegotiationAgent agent) {
        this.channel = ManagedChannelBuilder.forTarget(serverAddr).usePlaintext().build();
        this.stub = SimulationServiceGrpc.newBlockingStub(channel);
        this.agent = agent;
    }

    public void run() {
        StreamRequest request = StreamRequest.newBuilder().setMaxFps(10).build();
        Iterator<SimFrame> stream = stub.streamSimulation(request);
        System.out.println("streaming frames...");
        while (stream.hasNext()) {
            SimFrame frame = stream.next();
            agent.onFrame(frame);
            Proposal proposal = agent.decide(frame);
            if (proposal != null) {
                try {
                    agent.onProposalResult(stub.submitProposal(proposal));
                } catch (Exception e) {
                    System.err.printf("proposal error: %s%n", e.getMessage());
                }
            }
        }
    }

    public void shutdown() throws InterruptedException {
        channel.shutdown().awaitTermination(5, TimeUnit.SECONDS);
    }

    public static void main(String[] args) {
        String server = "localhost:50051";
        String agentId = "java-coop-001";
        for (int i = 0; i < args.length - 1; i++) {
            switch (args[i]) {
                case "--server" -> server = args[++i];
                case "--agent-id" -> agentId = args[++i];
                default -> { }
            }
        }

        System.out.printf("connecting to %s as %s...%n", server, agentId);
        AgentClient client = new AgentClient(server, new CooperativeTrader(agentId));
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            try {
                client.shutdown();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }));
        client.run();
    }
}
