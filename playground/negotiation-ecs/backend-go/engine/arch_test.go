package engine_test

import (
	"go/build"
	"strings"
	"testing"
)

// TestEngineCoreHasNoForbiddenImports enforces the boundary discipline: the
// engine core must stay domain-agnostic and dependency-free. If this fails, the
// engine has reached into the application (or a third-party ECS), and is no
// longer cleanly extractable.
//
// It inspects production imports only (not test files), so tests are free to
// import whatever they need.
func TestEngineCoreHasNoForbiddenImports(t *testing.T) {
	forbidden := []string{
		"negotiation-ecs/backend-go/internal", // domain: sim, transport
		"negotiation-ecs/backend-go/gen/proto", // wire format
		"negotiation-ecs/backend-go/cmd",       // entry point
		"mlange-42/ark",                        // third-party ECS
		"google.golang.org/grpc",               // transport
	}

	// Relative to this test file: the engine package and the ecs subpackage.
	for _, dir := range []string{".", "./ecs"} {
		pkg, err := build.ImportDir(dir, 0)
		if err != nil {
			t.Fatalf("import %s: %v", dir, err)
		}
		for _, imp := range pkg.Imports {
			for _, bad := range forbidden {
				if strings.Contains(imp, bad) {
					t.Errorf("engine package %q imports forbidden dependency %q", pkg.ImportPath, imp)
				}
			}
		}
	}
}
