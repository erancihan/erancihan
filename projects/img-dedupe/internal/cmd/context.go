package cmd

import (
	"context"
	"fmt"

	"github.com/erancihan/img-dedupe/internal/service"
)

// ctxKey is an unexported type so our context key can never collide with keys
// defined in other packages.
type ctxKey struct{}

var serviceKey = ctxKey{}

func withService(ctx context.Context, svc *service.Service) context.Context {
	return context.WithValue(ctx, serviceKey, svc)
}

func serviceFrom(ctx context.Context) (*service.Service, error) {
	svc, ok := ctx.Value(serviceKey).(*service.Service)
	if !ok || svc == nil {
		return nil, fmt.Errorf("service is not initialized")
	}
	return svc, nil
}
