package com.erancihan.negotiation.agent;

import com.erancihan.negotiation.proto.SimulationProto.*;
import com.erancihan.negotiation.proto.SimulationServiceGrpc;
import com.google.protobuf.util.JsonFormat;
import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import io.grpc.stub.StreamObserver;

import java.util.Iterator;
import java.util.List;
import java.util.Random;
import java.util.concurrent.TimeUnit;

/**
 * Java SDK for the Multi-Agent Negotiation Simulator.
 *
 * <p>Provides a base class for building external agents that connect to the
 * simulation engine via gRPC and participate in negotiations.</p>
 *
 * <h3>Usage:</h3>
 * <pre>
 *   java -cp agent.jar com.erancihan.negotiation.agent.AgentClient \
 *       --server localhost:50051 --agent-id java-agent-001
 * </pre>
 */
public class AgentClient {

    /**
     * Base interface for negotiation agents.
     */
    public interface NegotiationAgent {
        /** Called for each simulation frame received. */
        void onFrame(SimFrame frame);

        /**
         * Called after each frame to decide whether to submit a proposal.
         * @return a Proposal to submit, or null if no action is needed.
         */
        Proposal decide(SimFrame frame);

        /** Called when a proposal submission receives a response. */
        default void onProposalResult(ProposalAck ack) {
            String status = ack.getAccepted() ? "accepted" : "rejected";
            System.out.printf("[Agent] Proposal %s: %s%n", status, ack.getReason());
        }
    }

    // =========================================================================
    // Example: RandomAgent
    // =========================================================================

    /**
     * Example agent that makes random offers every N frames.
     */
    public static class RandomAgent implements NegotiationAgent {
        private final String agentId;
        private final Random rng = new Random();
        private int frameCount = 0;
        private final int offerInterval;
        private static final String[] ASSETS = {"gold", "silver", "oil"};

        public RandomAgent(String agentId, int offerInterval) {
            this.agentId = agentId;
            this.offerInterval = offerInterval;
        }

        @Override
        public void onFrame(SimFrame frame) {
            frameCount++;
            if (frame.getTick() % 100 == 0) {
                System.out.printf("[%s] Tick %d | Entities: %d | Events: %d%n",
                        agentId, frame.getTick(),
                        frame.getEntitiesCount(),
                        frame.getEventsCount());
            }
        }

        @Override
        public Proposal decide(SimFrame frame) {
            if (frameCount % offerInterval != 0) {
                return null;
            }

            List<EntityState> entities = frame.getEntitiesList();
            if (entities.isEmpty()) {
                return null;
            }

            EntityState target = entities.get(rng.nextInt(entities.size()));

            String offerJson = String.format(
                    "{\"offer_cash\": %d, \"request_asset\": \"%s\", \"request_amount\": %d}",
                    rng.nextInt(100) + 10,
                    ASSETS[rng.nextInt(ASSETS.length)],
                    rng.nextInt(10) + 1
            );

            System.out.printf("[%s] Submitting offer to entity %d: %s%n",
                    agentId, target.getEntityId(), offerJson);

            return Proposal.newBuilder()
                    .setAgentId(agentId)
                    .setTargetEntityId(target.getEntityId())
                    .setOfferJson(offerJson)
                    .build();
        }
    }

    // =========================================================================
    // Client Runner
    // =========================================================================

    private final ManagedChannel channel;
    private final SimulationServiceGrpc.SimulationServiceBlockingStub blockingStub;
    private final NegotiationAgent agent;

    public AgentClient(String serverAddr, NegotiationAgent agent) {
        this.channel = ManagedChannelBuilder.forTarget(serverAddr)
                .usePlaintext()
                .build();
        this.blockingStub = SimulationServiceGrpc.newBlockingStub(channel);
        this.agent = agent;
    }

    /**
     * Start the agent loop: stream frames and make decisions.
     */
    public void run() {
        StreamRequest request = StreamRequest.newBuilder()
                .setMaxFps(10)
                .build();

        Iterator<SimFrame> stream = blockingStub.streamSimulation(request);

        System.out.println("Streaming frames...");

        while (stream.hasNext()) {
            SimFrame frame = stream.next();
            agent.onFrame(frame);

            Proposal proposal = agent.decide(frame);
            if (proposal != null) {
                try {
                    ProposalAck ack = blockingStub.submitProposal(proposal);
                    agent.onProposalResult(ack);
                } catch (Exception e) {
                    System.err.printf("Proposal error: %s%n", e.getMessage());
                }
            }
        }
    }

    /**
     * Shutdown the gRPC channel.
     */
    public void shutdown() throws InterruptedException {
        channel.shutdown().awaitTermination(5, TimeUnit.SECONDS);
    }

    // =========================================================================
    // CLI Entry Point
    // =========================================================================

    public static void main(String[] args) {
        String server = "localhost:50051";
        String agentId = "java-random-001";
        int offerInterval = 50;

        for (int i = 0; i < args.length; i++) {
            switch (args[i]) {
                case "--server":
                    server = args[++i];
                    break;
                case "--agent-id":
                    agentId = args[++i];
                    break;
                case "--offer-interval":
                    offerInterval = Integer.parseInt(args[++i]);
                    break;
            }
        }

        System.out.printf("Connecting to %s as %s...%n", server, agentId);

        NegotiationAgent agent = new RandomAgent(agentId, offerInterval);
        AgentClient client = new AgentClient(server, agent);

        // Add shutdown hook
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            System.out.println("Shutting down...");
            try {
                client.shutdown();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }));

        client.run();
    }
}
