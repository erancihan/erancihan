package transport_test

import (
	"context"
	"net"
	"testing"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/test/bufconn"

	"github.com/erancihan/negotiation-ecs/backend-go/engine"
	pb "github.com/erancihan/negotiation-ecs/backend-go/gen/proto/negotiationpb"
	"github.com/erancihan/negotiation-ecs/backend-go/internal/sim"
	"github.com/erancihan/negotiation-ecs/backend-go/internal/transport"
)

// dialTestServer stands up the gRPC service over an in-memory connection and
// returns a connected client.
func dialTestServer(t *testing.T) pb.SimulationServiceClient {
	t.Helper()

	cfg := sim.DefaultConfig()
	cfg.NumAgents = 5
	cfg.Seed = 1

	app := engine.New().AddPlugin(sim.NewPlugin(cfg))
	app.Start()

	lis := bufconn.Listen(1 << 20)
	srv := grpc.NewServer()
	pb.RegisterSimulationServiceServer(srv, transport.NewServer(app, engine.NewBroadcaster[*pb.SimFrame](16)))
	go func() { _ = srv.Serve(lis) }()
	t.Cleanup(srv.Stop)

	conn, err := grpc.NewClient(
		"passthrough:///bufnet",
		grpc.WithContextDialer(func(ctx context.Context, _ string) (net.Conn, error) {
			return lis.DialContext(ctx)
		}),
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		t.Fatalf("dial: %v", err)
	}
	t.Cleanup(func() { _ = conn.Close() })

	return pb.NewSimulationServiceClient(conn)
}

func TestSubmitProposalAssignsBody(t *testing.T) {
	client := dialTestServer(t)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	ack, err := client.SubmitProposal(ctx, &pb.Proposal{
		AgentId:   "agent-1",
		OfferJson: `{"action":"accept"}`,
	})
	if err != nil {
		t.Fatalf("SubmitProposal: %v", err)
	}
	if !ack.GetAccepted() {
		t.Fatalf("proposal rejected: %s", ack.GetReason())
	}
	if ack.GetAssignedEntityId() == 0 {
		t.Fatal("expected a non-zero assigned_entity_id")
	}

	// Same agent re-binds to the same body.
	ack2, err := client.SubmitProposal(ctx, &pb.Proposal{AgentId: "agent-1", OfferJson: `{}`})
	if err != nil {
		t.Fatalf("second SubmitProposal: %v", err)
	}
	if ack2.GetAssignedEntityId() != ack.GetAssignedEntityId() {
		t.Fatalf("re-bind assigned %d, want stable %d", ack2.GetAssignedEntityId(), ack.GetAssignedEntityId())
	}
}

func TestSubmitProposalRequiresAgentID(t *testing.T) {
	client := dialTestServer(t)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	ack, err := client.SubmitProposal(ctx, &pb.Proposal{OfferJson: `{}`})
	if err != nil {
		t.Fatalf("SubmitProposal: %v", err)
	}
	if ack.GetAccepted() {
		t.Fatal("proposal without agent_id should be rejected")
	}
}

func TestGetWorldStateAndControl(t *testing.T) {
	client := dialTestServer(t)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	ws, err := client.GetWorldState(ctx, &pb.WorldStateRequest{})
	if err != nil {
		t.Fatalf("GetWorldState: %v", err)
	}
	if ws.GetEntityCount() != 5 {
		t.Fatalf("entity count = %d, want 5", ws.GetEntityCount())
	}

	resp, err := client.ControlSimulation(ctx, &pb.SimControlRequest{Command: pb.SimCommand_SIM_COMMAND_PAUSE})
	if err != nil {
		t.Fatalf("ControlSimulation: %v", err)
	}
	if !resp.GetSuccess() {
		t.Fatalf("pause failed: %s", resp.GetMessage())
	}
}
