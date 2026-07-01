package engine_test

import (
	"go/build"
	"strings"
	"testing"
)

// TestEngineCoreHasNoForbiddenImports enforces the boundary discipline: the
// engine is its own module and must stay domain-agnostic and dependency-free.
// Now that it is extracted, importing the application (github.com/.../backend-go)
// would require adding it to go.mod and would create a module cycle — so this is
// belt-and-suspenders, catching such a mistake at test time rather than at the
// eventual build failure.
//
// It inspects production imports only (not test files), so tests are free to
// import whatever they need.
func TestEngineCoreHasNoForbiddenImports(t *testing.T) {
	forbidden := []string{
		"negotiation-ecs/backend-go", // the entire application module
		"mlange-42/ark",              // third-party ECS
		"google.golang.org/grpc",     // transport
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
