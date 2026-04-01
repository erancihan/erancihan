package ignore

import (
	"os"
	"path/filepath"
	"testing"
)

func TestDefaultPatternsIgnoreNodeModules(t *testing.T) {
	c := NewCheckerWithDefaults()

	cases := []struct {
		path   string
		ignore bool
	}{
		{"node_modules", true},
		{"__pycache__", true},
		{".git", true},
		{".DS_Store", true},
		{"vendor", true},
		{"dist", true},
		{"build", true},
		{".idea", true},
		{".vscode", true},
		{"Thumbs.db", true},
		{"src", false},
		{"main.go", false},
		{"README.md", false},
	}

	for _, tc := range cases {
		got := c.ShouldIgnore(tc.path)
		if got != tc.ignore {
			t.Errorf("ShouldIgnore(%q) = %v, want %v", tc.path, got, tc.ignore)
		}
	}
}

func TestGlobPatterns(t *testing.T) {
	c := NewCheckerWithDefaults()

	cases := []struct {
		path   string
		ignore bool
	}{
		{"file.swp", true},
		{"file.swo", true},
		{"backup~", true},
		{"file.go", false},
		{"file.txt", false},
	}

	for _, tc := range cases {
		got := c.ShouldIgnore(tc.path)
		if got != tc.ignore {
			t.Errorf("ShouldIgnore(%q) = %v, want %v", tc.path, got, tc.ignore)
		}
	}
}

func TestNestedPathIgnore(t *testing.T) {
	c := NewCheckerWithDefaults()

	cases := []struct {
		path   string
		ignore bool
	}{
		{"src/node_modules/package.json", true},
		{"a/b/__pycache__/file.pyc", true},
		{"project/.git/config", true},
		{"src/main.go", false},
		{"a/b/c/d.txt", false},
	}

	for _, tc := range cases {
		got := c.ShouldIgnore(tc.path)
		if got != tc.ignore {
			t.Errorf("ShouldIgnore(%q) = %v, want %v", tc.path, got, tc.ignore)
		}
	}
}

func TestCustomPatterns(t *testing.T) {
	c := NewCheckerWithPatterns([]string{"*.log", "tmp", "cache"})

	cases := []struct {
		path   string
		ignore bool
	}{
		{"server.log", true},
		{"tmp", true},
		{"cache", true},
		{"node_modules", false}, // not in custom rules
		{"main.go", false},
	}

	for _, tc := range cases {
		got := c.ShouldIgnore(tc.path)
		if got != tc.ignore {
			t.Errorf("ShouldIgnore(%q) = %v, want %v", tc.path, got, tc.ignore)
		}
	}
}

func TestGrsyncignoreFileOverridesDefaults(t *testing.T) {
	tmpDir := t.TempDir()

	// Write a .grsyncignore file with custom rules
	ignoreContent := `# Only ignore logs and tmp
*.log
tmp
# This is a comment

cache
`
	err := os.WriteFile(filepath.Join(tmpDir, IgnoreFileName), []byte(ignoreContent), 0644)
	if err != nil {
		t.Fatal(err)
	}

	c, err := NewChecker(tmpDir)
	if err != nil {
		t.Fatal(err)
	}

	// Custom rules should apply
	if !c.ShouldIgnore("server.log") {
		t.Error("expected *.log to be ignored")
	}
	if !c.ShouldIgnore("tmp") {
		t.Error("expected tmp to be ignored")
	}
	if !c.ShouldIgnore("cache") {
		t.Error("expected cache to be ignored")
	}

	// Defaults should NOT apply (overridden)
	if c.ShouldIgnore("node_modules") {
		t.Error("node_modules should NOT be ignored when .grsyncignore overrides defaults")
	}
	if c.ShouldIgnore("__pycache__") {
		t.Error("__pycache__ should NOT be ignored when .grsyncignore overrides defaults")
	}
}

func TestNoGrsyncignoreUsesDefaults(t *testing.T) {
	tmpDir := t.TempDir() // No .grsyncignore file

	c, err := NewChecker(tmpDir)
	if err != nil {
		t.Fatal(err)
	}

	if !c.ShouldIgnore("node_modules") {
		t.Error("expected node_modules to be ignored by default")
	}
	if c.ShouldIgnore("src") {
		t.Error("expected src to NOT be ignored by default")
	}
}

func TestEmptyGrsyncignore(t *testing.T) {
	tmpDir := t.TempDir()

	// Write an empty .grsyncignore (all comments)
	err := os.WriteFile(filepath.Join(tmpDir, IgnoreFileName), []byte("# nothing\n\n"), 0644)
	if err != nil {
		t.Fatal(err)
	}

	c, err := NewChecker(tmpDir)
	if err != nil {
		t.Fatal(err)
	}

	// With empty rules, nothing should be ignored
	if c.ShouldIgnore("node_modules") {
		t.Error("expected nothing to be ignored with empty .grsyncignore")
	}
}

func TestPathPatternWithSlash(t *testing.T) {
	c := NewCheckerWithPatterns([]string{"logs/debug"})

	if !c.ShouldIgnore("logs/debug") {
		t.Error("expected logs/debug to be ignored")
	}
	if c.ShouldIgnore("logs/info") {
		t.Error("expected logs/info to NOT be ignored")
	}
}
