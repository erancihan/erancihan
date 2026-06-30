.PHONY: proto backend visualizer run run-headless test test-go test-engine clean sdk-python sdk-java sdk-go help

PROTO_DIR = proto
GO_DIR = backend-go
ENGINE_DIR = engine
RUST_DIR = visualizer-rust
GO_GEN_DIR = $(GO_DIR)/gen/proto/negotiationpb
GOPATH_BIN = $(shell go env GOPATH)/bin

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# =============================================================================
# Proto Generation
# =============================================================================

proto: ## Generate protobuf code for Go and Rust
	@echo "==> Generating Go protobuf stubs..."
	@mkdir -p $(GO_GEN_DIR)
	PATH="$$PATH:$(GOPATH_BIN)" protoc \
		--go_out=$(GO_GEN_DIR) --go_opt=paths=source_relative \
		--go-grpc_out=$(GO_GEN_DIR) --go-grpc_opt=paths=source_relative \
		-I$(PROTO_DIR) $(PROTO_DIR)/simulation.proto
	@echo "==> Go stubs generated in $(GO_GEN_DIR)"
	@echo "==> Rust stubs will be generated during 'cargo build' via build.rs"

# =============================================================================
# Build Targets
# =============================================================================

backend: ## Build the Go backend server
	@echo "==> Building Go backend..."
	cd $(GO_DIR) && go build -o ../bin/server ./cmd/server
	@echo "==> Binary: bin/server"

visualizer: ## Build the Rust visualizer (release mode)
	@echo "==> Building Rust visualizer..."
	cd $(RUST_DIR) && cargo build --release
	@echo "==> Binary: $(RUST_DIR)/target/release/negotiation-visualizer"

# =============================================================================
# Run Targets
# =============================================================================

run: backend ## Run backend + visualizer (start backend first, then visualizer)
	@echo "==> Starting backend server..."
	./bin/server --agents 100 --tick-rate 20 &
	@sleep 2
	@echo "==> Starting visualizer..."
	cd $(RUST_DIR) && cargo run --release -- --server localhost:50051

run-headless: backend ## Run backend in headless mode (no visualizer, benchmark)
	@echo "==> Running headless simulation..."
	./bin/server --headless --agents 100 --tick-rate 0 --max-ticks 10000

run-backend: backend ## Run just the backend server
	@echo "==> Starting backend server..."
	./bin/server --agents 100 --tick-rate 20

run-visualizer: ## Run just the visualizer (backend must already be running)
	@echo "==> Starting visualizer..."
	cd $(RUST_DIR) && cargo run --release -- --server localhost:50051

# =============================================================================
# SDK Protobuf Generation
# =============================================================================

sdk-python: ## Generate Python protobuf stubs
	@echo "==> Generating Python protobuf stubs..."
	cd SDKs/python && python -m grpc_tools.protoc \
		-I../../$(PROTO_DIR) \
		--python_out=. \
		--grpc_python_out=. \
		../../$(PROTO_DIR)/simulation.proto
	@echo "==> Python stubs generated in SDKs/python/"

sdk-java: ## Build the Java SDK (generates stubs via Maven)
	@echo "==> Building Java SDK..."
	cd SDKs/java && mvn -q compile
	@echo "==> Java SDK compiled (stubs generated under target/generated-sources)"

sdk-go: ## Build the Go SDK
	@echo "==> Building Go SDK..."
	cd SDKs/go && go build ./...
	@echo "==> Go SDK built"

# =============================================================================
# Testing
# =============================================================================

test: backend ## Run integration test: 100 agents, 1000 ticks
	@echo "==> Running integration test (100 agents, 1000 ticks)..."
	./bin/server --headless --agents 100 --tick-rate 0 --max-ticks 1000 --seed 42
	@echo "==> Integration test complete"

test-engine: ## Run the standalone engine module's tests
	@echo "==> Running engine module tests..."
	cd $(ENGINE_DIR) && go test ./...

test-go: test-engine ## Run Go unit tests (engine module + backend module)
	@echo "==> Running backend tests..."
	cd $(GO_DIR) && go test ./...

# =============================================================================
# Clean
# =============================================================================

clean: ## Remove build artifacts
	rm -rf bin/
	rm -rf $(GO_GEN_DIR)/*.go
	cd $(RUST_DIR) && cargo clean 2>/dev/null || true
	@echo "==> Clean complete"
