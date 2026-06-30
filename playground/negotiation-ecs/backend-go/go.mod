module github.com/erancihan/negotiation-ecs/backend-go

go 1.24.0

require (
	github.com/erancihan/negotiation-ecs/engine v0.0.0
	google.golang.org/grpc v1.72.1
	google.golang.org/protobuf v1.36.6
)

// The engine core is a separate, standalone module developed in this repo.
replace github.com/erancihan/negotiation-ecs/engine => ../engine

require (
	golang.org/x/net v0.35.0 // indirect
	golang.org/x/sys v0.30.0 // indirect
	golang.org/x/text v0.22.0 // indirect
	google.golang.org/genproto/googleapis/rpc v0.0.0-20250218202821-56aae31c358a // indirect
)
